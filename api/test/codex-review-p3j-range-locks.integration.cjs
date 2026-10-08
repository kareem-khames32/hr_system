'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,B,n=0
before(async()=>{f=await require('./codex-review-p3j-fixture.cjs')('p3j_range_locks');B=await f.repo('Branch').save({code:'P3JRL',name:'Synthetic branch',country:'EG'})})
after(async()=>{if(f)await f.close()})
const account=()=>f.repo('User').save({email:`range-${++n}@review.invalid`,displayName:'Synthetic range account',passwordHash:'not-a-password',role:'zz_range_sentinel',permissions:'[]',branchId:B.id,isActive:true})
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Completed before barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),10000)})])}finally{clearTimeout(timer)}}
async function waiting(){for(let i=0;i<120;i++){const rows=await f.master.request().input('dbname',f.database).query("SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID(@dbname) AND wait_type LIKE 'LCK_M_%' AND blocking_session_id>0");if(Number(rows.recordset[0].n)>0)return true;await new Promise(r=>setTimeout(r,25))}throw Error('No SQL lock wait observed')}

test('P3J-R-gaps: two absent preset codes sharing a unique-index range serialize without a cycle',async()=>{
 // A single right-hand sentinel makes employee and hr_manager occupy the same empty index gap.
 await f.ok('POST','/roles',{code:'zz_range_sentinel',nameAr:'Synthetic sentinel',permissions:[]})
 assert.equal(await f.repo('Role').countBy({code:'employee'}),0);assert.equal(await f.repo('Role').countBy({code:'hr_manager'}),0)
 const a=await account(),z=await account(),controller=f.app.get(require('../src/auth/users.controller').UsersController),old=controller.roleStamp,b=barrier();let first,second,once=false
 controller.roleStamp=async function(code,em){const stamp=await old.call(this,code,em);if(code==='employee'&&em&&!once){once=true;assert.equal(stamp,'PRESET');b.enter();await b.resume}return stamp}
 try{
  first=f.request('PATCH',`/users/${a.id}`,{role:'employee'});await arrived(b,first)
  second=f.request('PATCH',`/users/${z.id}`,{role:'hr_manager'});const realSqlWait=await waiting();b.release();const responses=await Promise.all([first,second])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'adjacent-absent-role-ranges',realSqlWait,statuses:responses.map(r=>r.status)}))
  assert.deepEqual(responses.map(r=>r.status),[200,200]);assert.equal((await f.repo('User').findOneByOrFail({id:z.id})).role,'hr_manager')
 }finally{b.release();controller.roleStamp=old;await Promise.allSettled([first,second].filter(Boolean))}
})

test('P3J-R-create-first: assignment waits for a new role transaction and sees its committed bundle',async()=>{
 const target=await account(),proto=require('typeorm').Repository.prototype,old=proto.increment,b=barrier();let create,assign,once=false
 proto.increment=async function(criteria,...args){if(this.metadata.name==='User'&&criteria.role==='employee'&&!once){once=true;b.enter();await b.resume}return old.call(this,criteria,...args)}
 try{
  create=f.request('POST','/roles',{code:'employee',nameAr:'Synthetic created role',permissions:['employees.view']});await arrived(b,create)
  assign=f.request('PATCH',`/users/${target.id}`,{role:'employee'});const realSqlWait=await waiting();b.release();const responses=await Promise.all([create,assign])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'role-create-before-assignment',realSqlWait,statuses:responses.map(r=>r.status)}))
  assert.deepEqual(responses.map(r=>r.status),[201,200]);const row=await f.repo('User').findOneByOrFail({id:target.id});assert.equal(row.tokenVersion,1)
  assert.ok((await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(row)).includes('employees.view'))
 }finally{b.release();proto.increment=old;await Promise.allSettled([create,assign].filter(Boolean))}
})
