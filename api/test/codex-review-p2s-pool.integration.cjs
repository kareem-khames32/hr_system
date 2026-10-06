'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
const tick=()=>new Promise(r=>setTimeout(r,10))
async function until(fn,label){const end=Date.now()+12000;while(!fn()&&Date.now()<end)await tick();assert.ok(fn(),label)}
before(async()=>{f=await require('./codex-review-p2s-comments-fixture.cjs')('p2s_pool')},{timeout:180000})
after(async()=>{if(f)await f.close()})

test('P2S ten actual PATCH handlers complete with half the pool reserved for work, including a failed handler',async t=>{
 const {accountEditGateState:state,accountEditLockLimit}=require('../src/auth/account-edit-lock'),pool=f.ds.driver.master.pool
 assert.equal(pool.max,10);assert.equal(accountEditLockLimit(f.ds),5)
 const users=[];for(let i=0;i<10;i++)users.push(await f.account())
 await f.ok('GET','/users')
 const ids=new Set(users.map(u=>u.id)),repo=f.app.get(require('../src/auth/users.controller').UsersController).users,find=repo.findOne
 let release,pending;const held=new Promise(r=>{release=r}),entered=[]
 repo.findOne=async function(options){if(!options?.select&&ids.has(options?.where?.id)){entered.push(options.where.id);await held}return find.call(this,options)}
 try{
  pending=Promise.all(users.map((u,i)=>f.request('PATCH',`/users/${u.id}`,i===3?{employeeId:2000000000}:{permissions:['reports.view']})))
  await until(()=>entered.length===5&&state().waiting===5,'Five handlers entered; five remain outside database transactions')
  assert.equal(state().open,5);assert.ok(pool.numUsed()<pool.max)
  // An independent SQL read succeeds while all five allowed handlers are stopped.
  assert.equal((await f.ds.query('SELECT 17 AS [available]'))[0].available,17)
  t.diagnostic(JSON.stringify({case:'bounded-lock-connections',state:state(),used:pool.numUsed(),max:pool.max}))
  release();const results=await pending
  assert.deepEqual(results.map(r=>r.status),users.map((_,i)=>i===3?400:200))
  assert.equal(entered.length,10);assert.deepEqual(state(),{open:0,waiting:0})
  for(let i=0;i<users.length;i++)assert.deepEqual(JSON.parse((await f.repo('User').findOneByOrFail({id:users[i].id})).permissions||'[]'),i===3?[]:['reports.view'])
  await f.ok('PATCH',`/users/${users[3].id}`,{permissions:['reports.view']})
 }finally{release();if(pending)await pending.catch(()=>{});repo.findOne=find}
},{timeout:60000})

test('P2S same-account SQL waiters consume only the limit and rejected waits release places for other accounts',async()=>{
 const {accountEditLocked:lock,accountEditGateState:state}=require('../src/auth/account-edit-lock')
 const qr=f.ds.createQueryRunner();await qr.connect();await qr.startTransaction()
 const key=870001;await qr.query("EXEC sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=0",[`hr:user-account:${key}`])
 let pending;const executed=[]
 try{
  pending=Promise.allSettled(Array.from({length:5},()=>lock(f.ds,key,async()=>{executed.push('blocked')},700)))
  await until(()=>state().open===5,'all admitted database waiters entered')
  const unrelated=lock(f.ds,key+1,async()=>{executed.push('other');return 23},5000)
  assert.equal(state().waiting,1)
  const results=await pending;assert.ok(results.every(x=>x.status==='rejected'&&x.reason.getStatus?.()===409))
  assert.equal(await unrelated,23);assert.deepEqual(executed,['other']);assert.deepEqual(state(),{open:0,waiting:0})
 }finally{await qr.rollbackTransaction();await qr.release();if(pending)await pending}
},{timeout:20000})
