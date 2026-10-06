'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,editor
const rcsi=process.env.REVIEW_RCSI==='true'
before(async()=>{f=await require('./codex-review-p2u-comments-fixture.cjs')('p2u_concurrency',{rcsi});editor=await f.account(null,['employees.view','employees.edit'])},{timeout:180000})
after(async()=>{if(f)await f.close()})
const define=(key,extra={})=>f.ok('POST','/settings/employee-fields',{fieldKey:key,label:'Synthetic '+key,type:'TEXT',...extra})
const put=(id,values,actor=editor)=>f.request('PUT',`/employees/${id}/custom-fields`,{values},actor)
async function blocked(spid,n=1){
 // A second UPDLOCK waiter may be blocked by the first waiter rather than directly by our root holder.
 for(let i=0;i<300;i++){const [r]=await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id>0 AND session_id<>@0',[spid]);if(Number(r.n)>=n)return;await new Promise(r=>setTimeout(r,20))}
 throw Error('Expected SQL blocker not reached')
}
test('P2U two value saves serialize on employee and retain both distinct keys',async t=>{
 await define('parallel_a');await define('parallel_b');const e=await f.employee(),qr=f.ds.createQueryRunner();let pending
 await qr.connect();await qr.startTransaction();const [s]=await qr.query('SELECT @@SPID AS id')
 try{
  await qr.query('SELECT id FROM employees WITH (UPDLOCK,HOLDLOCK) WHERE id=@0',[e.id])
  pending=Promise.all([put(e.id,{parallel_a:'first'}),put(e.id,{parallel_b:'second'})]);await blocked(s.id,2)
  await qr.commitTransaction();const results=await pending;assert.deepEqual(results.map(x=>x.status),[200,200])
  const response=await f.ok('GET',`/employees/${e.id}/custom-fields`,null,editor)
  const mapped=Object.fromEntries(response.fields.map(x=>[x.fieldKey,x.value]));assert.equal(mapped.parallel_a,'first');assert.equal(mapped.parallel_b,'second')
  t.diagnostic(JSON.stringify({rcsi,parallelSaves:[200,200],bothKeysPreserved:true}))
 }finally{if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release();if(pending)await pending.catch(()=>{})}
})
test('P2U a transfer holding the employee row forces the waiting writer to recheck branch after lock',async t=>{
 await define('move_guard');const e=await f.employee(),qr=f.ds.createQueryRunner();let pending
 await qr.connect();await qr.startTransaction();const [s]=await qr.query('SELECT @@SPID AS id')
 try{
  await qr.query('UPDATE employees SET branchId=@0 WHERE id=@1',[f.B.id,e.id])
  pending=put(e.id,{move_guard:'forbidden-after-move'});await blocked(s.id)
  await qr.commitTransaction();const response=await pending;assert.equal(response.status,404)
  assert.equal(await f.repo('EmployeeCustomValue').count({where:{employeeId:e.id}}),0)
  t.diagnostic(JSON.stringify({rcsi,writeAfterMove:response.status,noWrite:true}))
 }finally{if(qr.isTransactionActive)await qr.rollbackTransaction();await qr.release();if(pending)await pending.catch(()=>{})}
})
test('P2U malformed bundle rolls back deletion and update; field definition audit failure rolls back its change',async()=>{
 const must=await define('must_keep',{required:true}),choice=await define('limited',{type:'CHOICE',options:['one','two']});const e=await f.employee()
 assert.equal((await put(e.id,{must_keep:'preserve',limited:'one'})).status,200)
 const snapshot=()=>f.repo('EmployeeCustomValue').find({where:{employeeId:e.id},order:{id:'ASC'}}),before=await snapshot()
 assert.equal((await put(e.id,{must_keep:null,limited:'two'})).status,400);assert.deepEqual(await snapshot(),before)
 assert.equal((await put(e.id,{must_keep:'changed',limited:'bad'})).status,400);assert.deepEqual(await snapshot(),before)
 const audit=require('../src/audit/audit'),record=audit.recordAudit
 audit.recordAudit=async function(em,event){if(event.entityType==='employee_custom_field'&&Number(event.entityId)===choice.id)throw Error('P2U synthetic audit failure');return record(em,event)}
 try{assert.equal((await f.request('PATCH',`/settings/employee-fields/${choice.id}`,{restricted:true})).status,500)}finally{audit.recordAudit=record}
 assert.equal((await f.repo('EmployeeCustomField').findOneByOrFail({id:choice.id})).restricted,false)
 assert.ok(must.id)
})
