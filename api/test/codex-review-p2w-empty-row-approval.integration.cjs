'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const latch=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
const bounded=async(p,label)=>{let timer;try{return await Promise.race([p,new Promise((_,r)=>timer=setTimeout(()=>r(new Error(label)),20000))])}finally{clearTimeout(timer)}}
before(async()=>{f=await require('./codex-review-p2w-employment-fixture.cjs')('p2w_empty_row_approval')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2W approval crossing rehire must not spend extra days from an empty stale-anniversary row',async t=>{
 await f.repo('LeaveType').update(f.annual.id,{renewalBasis:'HIRE_ANNIVERSARY'});await f.setting('leave.accrual_mode','daily')
 const {emp}=await f.ended(f.last+'-06-30','CLOSED',{joinDate:'2020-09-01'})
 const reference=await f.employee(f.A,{joinDate:f.year+'-02-01',basicSalary:6000});await f.balance(reference,f.year)
 const owner=await f.account(emp)
 const type=await f.repo('RequestType').save({code:'P2W_ANNUAL',nameAr:'Synthetic annual request',category:'leaves',destinationHandler:'leave_calendar_balance',affectsBalance:true,isActive:true})
 // A pending request from before termination: this is persisted state, not a bypass of the approval endpoint.
 const req=await f.repo('Request').save({typeCode:'LEAVE',definitionCode:type.code,requesterId:emp.id,createdByUserId:owner.id,branchId:f.A.id,status:'UNDER_REVIEW',currentStep:1,
  resolvedSteps:JSON.stringify([{stepOrder:1,role:'hr',approverEmployeeId:null,dueAt:null}]),payload:JSON.stringify({leaveTypeCode:'ANNUAL',fromDate:f.next+'-01-29',toDate:f.next+'-01-31',days:3,reason:'Pending leave from before service closure'})})
 const repo=f.leaves.balances,original=repo.save,entered=latch(),release=latch();let job,paused=false
 repo.save=async function(row,...rest){if(!paused&&row.employeeId===emp.id&&row.period===f.year+'-09-01'){paused=true;entered.resolve();await release.promise}return original.call(this,row,...rest)}
 try{
  job=f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin);job.catch(()=>{})
  await bounded(Promise.race([entered.promise,job.then(r=>{throw Error('Approval finished before barrier: '+JSON.stringify(r))})]),'approval did not reach empty-row insert')
  assert.equal((await f.rehire(emp)).status,201)
  release.resolve();const result=await bounded(job,'approval did not finish')
  await f.leaves.assertSufficient(reference.id,'annual',1,f.next+'-01-29')
  const control=await f.leaves.balanceOf(reference.id,'annual',f.next+'-01-29')
  const retry=await f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'},f.admin),approved=await f.repo('Leave').findOneBy({requestId:req.id})
  t.diagnostic(JSON.stringify({case:'empty-row-approval',initialStatus:result.status,initialResponse:result.body,retryStatus:retry.status,retryResponse:retry.body,referenceRemaining:control.remaining,approvedDays:approved?Number(approved.days):null,rows:(await f.rows(emp)).map(r=>({period:r.period,taken:Number(r.taken)}))}))
  assert.ok(Number(control.remaining)<3)
  assert.equal(approved,null,'An approval must not spend three days when the new-service reference has fewer than two')
 }finally{release.resolve();if(job)await job.catch(()=>{});repo.save=original}
})
