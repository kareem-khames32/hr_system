'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
before(async()=>{f=await require('./codex-review-p2z-comments-fixture.cjs')('p2z_feature_pool')},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function scenario(t,changeSetting){
 const modules=f.app.get(require('../src/modules-registry/modules.service').ModulesService),pool=f.ds.driver.master.pool
 assert.equal(pool.max,10)
 await f.ok('PUT','/modules/features/tasks.rating',{enabled:true})
 const tasks=[];for(let i=0;i<pool.max;i++)tasks.push(await f.ok('POST','/tasks',{title:'Synthetic rating edit '+i,assigneeEmployeeId:f.worker.id},f.hrU))
 const feature=modules.isFeatureEnabled,write=modules.write,invalidate=modules.invalidate,all=latch(),release=latch(),committed=latch(),releaseSetting=latch(),invalidated=latch()
 let entered=0,pending,setting,timer
 const acquireTimeout=pool.acquireTimeoutMillis;pool.acquireTimeoutMillis=2000
 modules.isFeatureEnabled=async function(key){if(key==='tasks.rating'&&entered<pool.max){if(++entered===pool.max)all.resolve();await release.promise}return feature.call(this,key)}
 modules.write=async function(work){await write.call(this,work);committed.resolve();await releaseSetting.promise}
 modules.invalidate=function(){invalidate.call(this);invalidated.resolve()}
 try{
  if(changeSetting){
   // Pause the real settings endpoint after its SQL commit and before its existing invalidate().
   setting=f.request('PUT','/modules/features/tasks.rating',{enabled:true})
   await Promise.race([committed.promise,setting.then(r=>{throw Error('Settings write missed barrier '+JSON.stringify(r))})])
  }
  pending=Promise.all(tasks.map(task=>f.request('PATCH',`/tasks/${task.id}`,{needsRating:true},f.hrU)))
  await Promise.race([all.promise,new Promise((_,r)=>timer=setTimeout(()=>r(Error('Feature barriers not all reached')),15000))]);clearTimeout(timer)
  const occupied={max:pool.max,used:pool.numUsed(),free:pool.numFree(),featureReads:entered}
  if(changeSetting){releaseSetting.resolve();await invalidated.promise}
  release.resolve();const replies=await pending,settingReply=await setting
  t.diagnostic(JSON.stringify({case:changeSetting?'task-feature-pool-real-settings-write':'task-feature-pool-warm-control',occupied,statuses:replies.map(r=>r.status),settingStatus:settingReply?.status,testAcquireTimeoutMs:2000}))
  assert.ok(replies.every(r=>r.status===200),'Task edits stalled acquiring a second connection: '+replies.map(r=>r.status))
 }finally{clearTimeout(timer);release.resolve();releaseSetting.resolve();await Promise.allSettled([pending,setting].filter(Boolean));modules.isFeatureEnabled=feature;modules.write=write;modules.invalidate=invalidate;pool.acquireTimeoutMillis=acquireTimeout}
}
test('P2Z ten task edits work with the already loaded feature state',t=>scenario(t,false))
test('P2Z ten task edits also work across an actual feature-setting write',t=>scenario(t,true))
