'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-p3m-helpers.cjs')
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
test('P3M-K02: ten article transactions read policy references without an extra connection',{timeout:120000},async()=>{
 const f=await setup('policy_pool');let pending,timer,original,policies,pool,timeout;const all=latch(),release=latch()
 try{
  await f.enable('helpdesk')
  const policy=await f.repo('Policy').save({title:'Allowed administrative policy',audience:null,isMandatory:false,graceDays:0,status:'DRAFT',createdByUserId:f.admin.id,createdAt:new Date()})
  const articles=[];pool=f.ds.driver.master.pool;assert.equal(pool.max,10)
  for(let i=0;i<pool.max;i++)articles.push(await f.ok('POST','/helpdesk/articles',{title:'Article '+i,body:'Synthetic article content',isPublished:false,audience:null}))
  policies=f.app.get(require('../src/policies/policies.service').PoliciesService);original=policies.referenceFor
  let entered=0
  policies.referenceFor=async function(...args){if(entered<pool.max){assert.equal(args[2]?.queryRunner?.isTransactionActive,true);entered++;if(entered===pool.max)all.resolve();await release.promise}return original.apply(this,args)}
  timeout=pool.acquireTimeoutMillis;pool.acquireTimeoutMillis=1500
  pending=Promise.all(articles.map(a=>f.request('PATCH','/helpdesk/articles/'+a.id,{policyId:policy.id})))
  await Promise.race([all.promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Article barriers missed: '+entered)),12000))]);clearTimeout(timer)
  const occupied={used:pool.numUsed(),free:pool.numFree(),max:pool.max,referenceCalls:entered};assert.equal(occupied.used,pool.max)
  release.resolve();await new Promise(r=>setTimeout(r,200));const pendingReads=pool.numPendingAcquires();assert.equal(pendingReads,0)
  const replies=await pending;assert.ok(replies.every(r=>r.status===200));assert.equal(pool.numUsed(),0)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'K02',occupied,pendingReads,statuses:replies.map(r=>r.status),acquireTimeoutMs:1500}))
 }finally{clearTimeout(timer);release.resolve();if(pending)await pending;if(policies&&original)policies.referenceFor=original;if(pool&&timeout)pool.acquireTimeoutMillis=timeout;await f.close()}
})
