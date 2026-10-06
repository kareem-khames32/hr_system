'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2w-employment-fixture.cjs')('p2w_residual_writers')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2W profile opening-balance write begun in old service must not land in the new service',async t=>{
 const {emp}=await f.ended(),service=f.app.get(require('../src/employees/employees.service').EmployeesService)
 await f.balance(emp,f.year)
 const original=service.applyOpeningBalance,entered=latch(),release=latch();let job
 service.applyOpeningBalance=async function(id,...rest){if(id===emp.id){entered.resolve();await release.promise}return original.call(this,id,...rest)}
 try{
  job=f.request('PATCH',`/employees/${emp.id}`,{openingBalanceDays:10,openingBalanceExpiry:f.next+'-12-31',contractNumber:'OLD-SERVICE-CONTRACT'},f.admin);job.catch(()=>{})
  const hit=await bounded(Promise.race([entered.promise.then(()=>true),job.then(r=>{throw Error('Update finished before barrier: '+JSON.stringify(r))})]),'opening balance write barrier not reached');assert.equal(hit,true)
  assert.equal((await f.rehire(emp)).status,201)
  release.resolve();const updated=await bounded(job,'profile update did not finish');assert.equal(updated.status,200,JSON.stringify(updated.body))
  const row=await f.repo('LeaveBalance').findOneByOrFail({employeeId:emp.id,period:f.year,balanceType:'annual'})
  const saved=await f.repo('Employee').findOneByOrFail({id:emp.id})
  t.diagnostic(JSON.stringify({case:'profile-opening-crosses-rehire',status:updated.status,joinDate:saved.joinDate,contractNumber:saved.contractNumber,currentOpening:Number(row.openingDays),frozen:(await f.rows(emp)).filter(r=>r.period.startsWith('P')).map(r=>({period:r.period,openingDays:Number(r.openingDays)}))}))
  assert.equal(Number(row.openingDays),0,'An old-service profile operation must finish before freezing or reject its delayed balance update')
 }finally{release.resolve();if(job)await job.catch(()=>{});service.applyOpeningBalance=original}
})
test('P2W an empty balance inserted after rehire must not preserve the old hire-anniversary window',async t=>{
 await f.repo('LeaveType').update(f.annual.id,{renewalBasis:'HIRE_ANNIVERSARY'});await f.setting('leave.accrual_mode','daily')
 const {emp}=await f.ended(f.last+'-06-30','CLOSED',{joinDate:'2020-09-01'})
 const reference=await f.employee(f.A,{joinDate:f.year+'-02-01',basicSalary:6000});await f.balance(reference,f.year)
 const repo=f.leaves.balances,original=repo.save,entered=latch(),release=latch();let job,paused=false
 repo.save=async function(row,...rest){if(!paused&&row.employeeId===emp.id&&row.period===f.year+'-09-01'){paused=true;entered.resolve();await release.promise}return original.call(this,row,...rest)}
 try{
  job=f.leaves.assertSufficient(emp.id,'annual',1,f.next+'-01-31');job.catch(()=>{})
  await bounded(Promise.race([entered.promise,job.then(()=>{throw Error('Balance check finished before barrier')})]),'empty balance save barrier not reached')
  assert.equal((await f.rehire(emp)).status,201)
  release.resolve();await bounded(job,'balance check did not finish')
  await f.leaves.assertSufficient(reference.id,'annual',1,f.next+'-01-31')
  const view=await f.leaves.balanceOf(emp.id,'annual',f.next+'-01-31',true),control=await f.leaves.balanceOf(reference.id,'annual',f.next+'-01-31',true)
  t.diagnostic(JSON.stringify({case:'empty-anniversary-crosses-rehire',actual:view,reference:control,rows:(await f.rows(emp)).map(r=>({period:r.period,entitled:r.entitled,taken:r.taken}))}))
  assert.equal(view.remaining,control.remaining,'A supposedly empty stale row must not change new-service accrual')
 }finally{release.resolve();if(job)await job.catch(()=>{});repo.save=original}
})
