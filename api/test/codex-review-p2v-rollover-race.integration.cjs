'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2v-employment-fixture.cjs')('p2v_rollover_race')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2V B a year rollover already reading old balances must not import their carry into new service',async t=>{
 const {emp}=await f.ended(f.last+'-12-31');await f.balance(emp,f.last,{taken:0})
 // Year rollover is a production background path. Pause its first new-year save, after it has computed old carry.
 const repo=f.leaves.balances,save=repo.save,entered=deferred(),release=deferred();let paused=false,job
 repo.save=async function(row,...args){if(!paused&&row.employeeId===emp.id&&row.period===f.year&&Number(row.openingDays)>0){paused=true;entered.resolve();await release.promise}return save.call(this,row,...args)}
 try{
  job=f.leaves.rollover(f.last,[f.A.id]);job.catch(()=>{})
  await bounded(entered.promise,'rollover did not reach the save barrier')
  const r=await f.rehire(emp);assert.equal(r.status,201,JSON.stringify(r.body))
  const before=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,balanceType:'annual',period:f.year});assert.equal(Number(before.openingDays),0)
  release.resolve();await bounded(job,'rollover did not finish')
  const current=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,balanceType:'annual',period:f.year})
  const frozen=(await f.rows(emp)).filter(r=>r.period.startsWith('P'))
  t.diagnostic(JSON.stringify({case:'rollover-crosses-rehire',oldPeriod:f.last,newPeriod:f.year,beforeOpening:Number(before.openingDays),afterOpening:Number(current.openingDays),frozen:frozen.map(r=>({period:r.period,taken:r.taken,openingDays:r.openingDays}))}))
  assert.equal(Number(current.openingDays),0,'Old-service carry must not reach the current service balance')
 }finally{release.resolve();if(job)await job.catch(()=>{});repo.save=save}
})
