'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p2r-comments-fixture.cjs')('p2r_pool')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2R independent account edits must not exhaust the SQL pool with lock-only transactions while their handlers wait for another connection',async t=>{
 const pool=f.ds.driver.master.pool,max=pool.max
 assert.equal(max,10,'Exercise the unmodified SQL driver default pool capacity')
 const users=[];for(let i=0;i<max;i++)users.push(await f.account())
 await f.ok('GET','/users')
 const ids=new Set(users.map(u=>u.id)),repo=f.app.get(require('../src/auth/users.controller').UsersController).users,find=repo.findOne
 let enterAll,release,entered=0;const all=new Promise(r=>{enterAll=r}),held=new Promise(r=>{release=r});let pending,timer
 repo.findOne=async function(options){
  // Guard reads have an explicit select. This barrier is after each interceptor acquired its own account lock, before the handler's first SQL read.
  if(!options?.select&&ids.has(options?.where?.id)){if(++entered===max)enterAll();await held}
  return find.call(this,options)
 }
 try{
  pending=Promise.all(users.map(u=>f.request('PATCH',`/users/${u.id}`,{permissions:['reports.view']})))
  await Promise.race([all,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('All handler barriers were not reached')),20000)})]);clearTimeout(timer)
  t.diagnostic(JSON.stringify({case:'pool-before-release',max,heldAccountLocks:entered,connectionsUsed:pool.numUsed(),connectionsFree:pool.numFree()}))
  release()
  const results=await pending
  t.diagnostic(JSON.stringify({case:'pool-results',statuses:results.map(r=>r.status),connectionsUsed:pool.numUsed(),connectionsFree:pool.numFree()}))
  // Subsequent requests must still work after failed/finished lock transactions release their connections.
  await f.ok('PATCH',`/users/${users[0].id}`,{permissions:['reports.view']})
  assert.ok(results.every(r=>r.status===200),'Distinct account resources must not hold the whole pool and fail their own handlers acquiring a second connection: '+results.map(r=>r.status).join(','))
 }finally{clearTimeout(timer);release();if(pending)await pending.catch(()=>{});repo.findOne=find}
},{timeout:100000})
test('P2R diagnostic baseline: the same ten paused HTTP handlers succeed without the new lock-only transaction',async t=>{
 const {AccountEditLock}=require('../src/auth/account-edit-lock'),intercept=AccountEditLock.prototype.intercept
 const pool=f.ds.driver.master.pool,users=[];for(let i=0;i<pool.max;i++)users.push(await f.account())
 const ids=new Set(users.map(u=>u.id)),repo=f.app.get(require('../src/auth/users.controller').UsersController).users,find=repo.findOne
 let enterAll,release,entered=0,timer,pending;const all=new Promise(r=>{enterAll=r}),held=new Promise(r=>{release=r})
 AccountEditLock.prototype.intercept=function(_context,next){return next.handle()}
 repo.findOne=async function(options){if(!options?.select&&ids.has(options?.where?.id)){if(++entered===users.length)enterAll();await held}return find.call(this,options)}
 try{
  pending=Promise.all(users.map(u=>f.request('PATCH',`/users/${u.id}`,{permissions:['reports.view']})))
  await Promise.race([all,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Baseline barriers not reached')),20000)})]);clearTimeout(timer)
  t.diagnostic(JSON.stringify({case:'pool-baseline-before-release',connectionsUsed:pool.numUsed(),connectionsFree:pool.numFree()}))
  release();const results=await pending
  assert.deepEqual(results.map(r=>r.status),users.map(()=>200))
 }finally{clearTimeout(timer);release();if(pending)await pending.catch(()=>{});repo.findOne=find;AccountEditLock.prototype.intercept=intercept}
})
