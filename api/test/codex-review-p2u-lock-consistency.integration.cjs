'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const {Repository}=require('../node_modules/typeorm')
const rcsi=process.env.REVIEW_RCSI==='true';let f,viewer,editor,editorB
before(async()=>{f=await require('./codex-review-p2u-comments-fixture.cjs')('p2u_lock_consistency',{rcsi});viewer=await f.account(null,['employees.view']);editor=await f.account(null,['employees.view','employees.edit']);editorB=await f.account(null,['employees.view','employees.edit'],f.B)},{timeout:180000})
after(async()=>{if(f)await f.close()})
const put=(e,values,actor=editor)=>f.request('PUT',`/employees/${e.id}/custom-fields`,{values},actor)
const get=(e,actor=viewer)=>f.request('GET',`/employees/${e.id}/custom-fields`,null,actor)
const field=key=>f.ok('POST','/settings/employee-fields',{fieldKey:key,label:'Synthetic '+key,type:'TEXT'})
const value=(r,key)=>r.body.fields?.find(x=>x.fieldKey===key)?.value
const deadline=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),8000)})])}finally{clearTimeout(timer)}}
async function blocked(application=true){for(let i=0;i<250;i++){const [r]=await f.ds.query(`SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id>0 ${application?"AND wait_resource LIKE N'APPLICATION:%'":''}`);if(Number(r.n))return;await new Promise(r=>setTimeout(r,20))}throw Error('SQL wait not observed')}
function barrier(method,predicate){const original=Repository.prototype[method];let entered,release,hit=false;const ready=new Promise(r=>entered=r),held=new Promise(r=>release=r)
 Repository.prototype[method]=async function(...args){const result=await original.apply(this,args);if(!hit&&predicate(this,args,result)){hit=true;entered();await held}return result}
 return{ready,release,restore:()=>{release();Repository.prototype[method]=original}}
}
test('P2U reader cannot return a value written after restriction; writer waits on real application lock',async t=>{
 const def=await field('lock_private'),e=await f.employee();assert.equal((await put(e,{lock_private:'old-public'})).status,200)
 const gate=barrier('find',(repo)=>repo.metadata.tableName==='employee_custom_fields'&&repo.manager.queryRunner?.isTransactionActive);let reader,writer
 try{reader=get(e);await deadline(gate.ready,'Reader did not reach definitions');await f.ok('PATCH',`/settings/employee-fields/${def.id}`,{restricted:true});writer=put(e,{lock_private:'new-private'});await blocked();gate.release()
 const [read,write]=await Promise.all([reader,writer]);assert.equal(read.status,200);assert.equal(value(read,'lock_private'),'old-public');assert.equal(JSON.stringify(read.body).includes('new-private'),false);assert.equal(write.status,200);assert.equal(value(write,'lock_private'),'new-private');assert.equal(value(await get(e),'lock_private'),undefined)
 t.diagnostic(JSON.stringify({rcsi,case:'restriction-read-write',reader:'old-public',writer:200,subsequentRead:'hidden'}))
 }finally{gate.restore();await Promise.allSettled([reader,writer].filter(Boolean))}
})
test('P2U reader before branch transfer gets only pre-transfer value; new branch writer waits',async t=>{
 await field('lock_branch');const e=await f.employee();assert.equal((await put(e,{lock_branch:'old-A'})).status,200)
 const gate=barrier('findOne',(repo,args,result)=>repo.metadata.tableName==='employees'&&result?.id===e.id&&repo.manager.queryRunner?.isTransactionActive);let reader,writer
 try{reader=get(e);await deadline(gate.ready,'Reader did not reach employee');await f.repo('Employee').update(e.id,{branchId:f.B.id});writer=put(e,{lock_branch:'new-B'},editorB);await blocked();gate.release()
 const [read,write]=await Promise.all([reader,writer]);assert.equal(read.status,200);assert.equal(value(read,'lock_branch'),'old-A');assert.equal(JSON.stringify(read.body).includes('new-B'),false);assert.equal(write.status,200);assert.equal((await get(e)).status,404);assert.equal(value(await get(e,editorB),'lock_branch'),'new-B')
 t.diagnostic(JSON.stringify({rcsi,case:'branch-read-write',reader:'old-A',writer:200,subsequentOldBranch:404}))
 }finally{gate.restore();await Promise.allSettled([reader,writer].filter(Boolean))}
})
test('P2U saved response remains inside transaction; transfer blocks until response is built',async t=>{
 await field('lock_response');const e=await f.employee();let calls=0
 const gate=barrier('find',(repo)=>repo.metadata.tableName==='employee_custom_fields'&&repo.manager.queryRunner?.isTransactionActive&&++calls===2);let writer,moving
 try{writer=put(e,{lock_response:'committed-A'});await deadline(gate.ready,'Save response was not built under transaction');moving=f.repo('Employee').update(e.id,{branchId:f.B.id});await blocked(false);gate.release()
 const write=await writer;await moving;assert.equal(write.status,200);assert.equal(value(write,'lock_response'),'committed-A');assert.equal((await put(e,{lock_response:'new-B'},editorB)).status,200);assert.equal(JSON.stringify(write.body).includes('new-B'),false);assert.equal((await get(e)).status,404)
 t.diagnostic(JSON.stringify({rcsi,case:'save-response-transfer',saved:200,response:'committed-A',subsequentOldBranch:404}))
 }finally{gate.restore();await Promise.allSettled([writer,moving].filter(Boolean))}
})
test('P2U concurrent definition update with value save completes without losing either result',async()=>{
 const def=await field('definition_lock'),e=await f.employee(),qr=f.ds.createQueryRunner();let write,edit
 await qr.connect();await qr.startTransaction()
 try{await qr.query('SELECT id FROM employee_custom_fields WITH (UPDLOCK,HOLDLOCK) WHERE id=@0',[def.id]);edit=f.request('PATCH',`/settings/employee-fields/${def.id}`,{restricted:true});write=put(e,{definition_lock:'private-afterwards'});await blocked(false);await qr.commitTransaction();const responses=await Promise.all([edit,write]);assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal((await f.repo('EmployeeCustomField').findOneByOrFail({id:def.id})).restricted,true);assert.equal(value(await get(e),'definition_lock'),undefined)
 }finally{if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release();await Promise.allSettled([write,edit].filter(Boolean))}
})
