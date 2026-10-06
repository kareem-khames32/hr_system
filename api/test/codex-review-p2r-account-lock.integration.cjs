'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
const rcsi=process.env.REVIEW_RCSI==='true';let f
before(async()=>{f=await require('./codex-review-p2r-comments-fixture.cjs')('p2r_account_lock',{rcsi})},{timeout:180000})
after(async()=>{if(f)await f.close()})
function latch(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
async function waitBlocked(n){for(let i=0;i<500;i++){const [r]=await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0');if(Number(r.n)>=n)return;await new Promise(r=>setTimeout(r,20))}throw Error('Expected SQL waiters not observed')}
async function wait(p){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Review barrier not reached')),30000)})])}finally{clearTimeout(timer)}}
test('P2R real SQL serialization retains intermediate employee history and hides internal text/files; RCSI='+rcsi,async t=>{
 const a=await f.employee(),b=await f.employee(f.A,{managerEmployeeId:f.manager.id}),c=await f.employee(),u=await f.account(a,['requests.view_all'])
 const req=await f.submit(f.proxyU,{onBehalfEmployeeId:b.id}),file=await f.upload(f.managerU)
 assert.equal((await f.say(f.managerU,req.id,{body:'Synthetic intermediate identity secret',internal:true,fileIds:[file.id]})).status,201)
 const holder=f.ds.createQueryRunner();await holder.connect();await holder.startTransaction();let first,second
 try{
  await holder.query('SELECT TOP (1) 1 FROM employee_status_history WITH(TABLOCKX,HOLDLOCK)')
  first=f.request('PATCH',`/users/${u.id}`,{employeeId:b.id});await waitBlocked(1)
  second=f.request('PATCH',`/users/${u.id}`,{employeeId:c.id});await waitBlocked(2)
  await holder.commitTransaction()
  const results=await Promise.all([first,second]);assert.deepEqual(results.map(r=>r.status),[200,200])
  const current=await f.repo('User').findOneByOrFail({id:u.id});assert.equal(current.employeeId,c.id);assert.equal(current.tokenVersion,2)
  const history=await f.repo('EmployeeStatusHistory').findBy({fieldName:'loginAccount'})
  assert.deepEqual(history.filter(r=>Number(r.oldValue)===u.id).map(r=>r.employeeId),[a.id,b.id])
  const thread=await f.thread(current,req.id);assert.equal(thread.status,200);assert.equal(thread.body.canInternal,false);assert.deepEqual(thread.body.comments,[])
  assert.equal((await f.download(current,file.id)).status,404)
  t.diagnostic(JSON.stringify({rcsi,patchStatuses:results.map(r=>r.status),bothIdentitiesRecorded:true,tokenVersion:current.tokenVersion,internalHidden:true}))
 }finally{if(holder.isTransactionActive)await holder.rollbackTransaction();await holder.release();if(first)await first.catch(()=>{});if(second)await second.catch(()=>{})}
})
test('P2R permissions-only edit cannot overwrite a concurrent binding under the account lock; RCSI='+rcsi,async()=>{
 const a=await f.employee(),b=await f.employee(),u=await f.account(a,['requests.view_all'])
 const repo=f.app.get(require('../src/auth/users.controller').UsersController).users,save=repo.save,entered=latch(),release=latch();let first,second,held=false
 repo.save=async function(entity,...args){if(!held&&entity?.id===u.id){held=true;entered.resolve();await release.promise}return save.call(this,entity,...args)}
 try{
  first=f.request('PATCH',`/users/${u.id}`,{permissions:['requests.view_all','tasks.view_all']});await wait(entered.promise)
  second=f.request('PATCH',`/users/${u.id}`,{employeeId:b.id});await waitBlocked(1)
  release.resolve();assert.deepEqual((await Promise.all([first,second])).map(r=>r.status),[200,200])
  const current=await f.repo('User').findOneByOrFail({id:u.id});assert.equal(current.employeeId,b.id);assert.equal(current.tokenVersion,2);assert.ok(JSON.parse(current.permissions).includes('tasks.view_all'))
  assert.equal(await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,u.id,a.id),true)
 }finally{release.resolve();if(first)await first.catch(()=>{});if(second)await second.catch(()=>{});repo.save=save}
})
if(!rcsi)test('P2R lock timeout returns 409 without executing the waiter, keeps the active handler protected and permits a later retry',async t=>{
 const a=await f.employee(),b=await f.employee(),c=await f.employee(),u=await f.account(a)
 const repo=f.app.get(require('../src/auth/users.controller').UsersController).users,save=repo.save,entered=latch(),release=latch();let first,held=false
 repo.save=async function(entity,...args){if(!held&&entity?.id===u.id){held=true;entered.resolve();await release.promise}return save.call(this,entity,...args)}
 try{
  first=f.request('PATCH',`/users/${u.id}`,{employeeId:b.id});await wait(entered.promise)
  const second=await f.request('PATCH',`/users/${u.id}`,{employeeId:c.id})
  t.diagnostic(JSON.stringify({case:'real-lock-timeout',status:second.status,code:second.body?.statusCode}))
  assert.equal(second.status,409,JSON.stringify(second.body))
  assert.equal((await f.repo('User').findOneByOrFail({id:u.id})).employeeId,a.id)
  assert.equal(await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,u.id,b.id),false)
  release.resolve();assert.equal((await first).status,200)
  await f.ok('PATCH',`/users/${u.id}`,{employeeId:c.id})
  assert.equal(await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,u.id,b.id),true)
 }finally{release.resolve();if(first)await first.catch(()=>{});repo.save=save}
})
test('P2R a rejected edit releases its application lock; an unrelated account remains editable; RCSI='+rcsi,async()=>{
 const a=await f.employee(),b=await f.employee(),u=await f.account(a),other=await f.account()
 const holder=f.ds.createQueryRunner();await holder.connect();await holder.startTransaction()
 try{
  await holder.query("DECLARE @r int; EXEC @r=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=0; SELECT @r r",[`hr:user-account:${u.id}`])
  await f.ok('PATCH',`/users/${other.id}`,{isActive:false})
 }finally{await holder.rollbackTransaction();await holder.release()}
 assert.equal((await f.request('PATCH',`/users/${u.id}`,{employeeId:2147483000})).status,400)
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:b.id})
})
