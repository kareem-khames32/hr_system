'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const rcsi=process.env.REVIEW_RCSI==='true';let f
before(async()=>{f=await require('./codex-review-p2q-comments-fixture.cjs')('p2q_rebinding_sql',{rcsi})},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2Q real SQL row lock: both committed employee bindings remain recorded with RCSI='+rcsi,async t=>{
 const original=await f.employee(),left=await f.employee(f.A,{managerEmployeeId:f.manager.id}),right=await f.employee(f.A,{managerEmployeeId:f.manager.id})
 const user=await f.account(original,['requests.view_all']),requests=new Map()
 for(const e of [left,right]){
  const req=await f.submit(f.proxyU,{onBehalfEmployeeId:e.id}),said=await f.say(f.managerU,req.id,{body:'Synthetic protected history for '+e.id,internal:true})
  assert.equal(said.status,201);requests.set(e.id,{req,said})
 }
 const holder=f.ds.createQueryRunner();await holder.connect();await holder.startTransaction();let pending
 try{
  await holder.query('SELECT id FROM users WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[user.id])
  pending=Promise.all([left,right].map(e=>f.request('PATCH',`/users/${user.id}`,{employeeId:e.id})))
  let blocked=0
  for(let i=0;i<500&&blocked<2;i++){
   await new Promise(r=>setTimeout(r,20))
   blocked=Number((await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)
  }
  assert.equal(blocked,2,'Both actual PATCH requests reached SQL lock contention; no service methods replaced')
  const histories=await f.repo('EmployeeStatusHistory').find({where:{employeeId:original.id,fieldName:'loginAccount'}})
  assert.equal(histories.filter(h=>Number(h.oldValue)===user.id).length,2,'Both paths recorded the same original employee before their user-row writes')
  await holder.commitTransaction()
  const results=await pending;assert.deepEqual(results.map(r=>r.status),[200,200])
  assert.deepEqual(results.map(r=>r.body.employeeId).sort((a,b)=>a-b),[left.id,right.id].sort((a,b)=>a-b))
  const current=await f.repo('User').findOneByOrFail({id:user.id}),intermediate=current.employeeId===left.id?right:left
  const recorded=await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,user.id,intermediate.id)
  const {req,said}=requests.get(intermediate.id),shown=await f.thread(current,req.id)
  assert.equal(shown.status,200)
  t.diagnostic(JSON.stringify({case:'real-SQL-rebinding',rcsi,patchStatuses:results.map(r=>r.status),intermediateRecorded:recorded,internalVisible:shown.body.comments.some(c=>c.body===said.body.body)}))
  assert.equal(shown.body.comments.some(c=>c.body===said.body.body),false,'The preceding committed identity must not disappear when concurrent PATCH saves overwrite the account')
 }finally{if(holder.isTransactionActive)await holder.rollbackTransaction();await holder.release();if(pending)await pending.catch(()=>{})}
})
