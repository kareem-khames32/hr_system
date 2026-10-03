'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round28-support.cjs')
let f,manager
const reason='مراجعة مستقلة لتزامن نقل الفرع وقرار مالي قبل تثبيت المعاملة'
before(async()=>{f=await setup('r28_related');manager=await f.actor('branch-money-manager',['bonuses.manage','deductions.manage'])},{timeout:180000})
after(async()=>{if(f)await f.close()})
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
for(const kind of ['bonus','deduction'])test(`CR28 ${kind} cancellation cannot commit on stale branch scope after an actual employee transfer`,{timeout:90000},async t=>{
 const e=await f.employee(9000),prefix=kind==='bonus'?'bonuses':'deductions',entity=kind==='bonus'?'BonusRequest':'DeductionRequest'
 const type=await f.ok('POST',`/${prefix}/types`,{code:'R28_'+kind.toUpperCase(),nameAr:'نوع اختبار '+kind,calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],...(kind==='deduction'?{category:'PERFORMANCE'}:{})})
 const today=new Date().toLocaleDateString('en-CA'),period=today.slice(0,7)
 const row=await f.ok('POST',`/${prefix}`,{employeeId:e.id,[kind==='bonus'?'bonusTypeId':'deductionTypeId']:type.id,inputValue:'300',reason,targetPeriod:period,confirmNotDuplicate:true,...(kind==='deduction'?{incidentDate:today}:{})})
 assert.equal(row.status,'APPROVED')
 const obligations=()=>f.repo('EmployeeObligation').findBy({[kind==='bonus'?'bonusRequestId':'deductionRequestId']:row.id})
 const before=await obligations();assert.equal(before.length,1);assert.equal(before[0].status,'PENDING');assert.equal(Number(before[0].amount),300)
 const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 const calendarChange={effectiveFrom:today,reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}
 const boundary=require('../src/payroll/payroll-settlement-boundary'),old=boundary.lockPayrollEmployees,entered=deferred(),gate=deferred()
 let armed=true,cancelling,transferring,transfer,result,transferCommittedBeforeRelease=false
 boundary.lockPayrollEmployees=async function(em,ids){
  // Pause at the existing await AFTER cancellation has checked the current branch, BEFORE it acquires the employee finance lock.
  if(armed&&ids.includes(e.id)){armed=false;entered.resolve();await gate.promise}
  return old(em,ids)
 }
 try{
  cancelling=f.request('POST',`/${prefix}/${row.id}/cancel`,{expectedRevision:row.revision,reason},manager)
  assert.equal((await within(entered.promise,5000)).done,true,'Cancellation reached the real finance-lock boundary')
  transferring=f.request('PATCH',`/employees/${e.id}`,{branchId:f.B.id,calendarChange})
  const completed=await within(transferring,5000)
  if(completed.done){transfer=completed.value;assert.equal(transfer.status,200,JSON.stringify(transfer.body));transferCommittedBeforeRelease=true;assert.equal((await f.repo('Employee').findOneByOrFail({id:e.id})).branchId,f.B.id)}
  gate.resolve();[result,transfer]=await Promise.all([cancelling,transferring]);assert.equal(transfer.status,200,JSON.stringify(transfer.body))
 }finally{gate.resolve();await Promise.allSettled([cancelling,transferring].filter(Boolean));boundary.lockPayrollEmployees=old}
 const stored=await f.repo(entity).findOneByOrFail({id:row.id}),ledger=await obligations()
 const afterRead=await f.request('GET',`/${prefix}/${row.id}`,null,manager)
 t.diagnostic(JSON.stringify({case:'related-cancellation-race',kind,transferCommittedBeforeRelease,transferStatus:transfer.status,cancelStatus:result.status,cancelCode:result.body.code,readAfterTransfer:afterRead.status,requestStatus:stored.status,ledgerStatus:ledger[0].status,amount:Number(ledger[0].amount)}))
 if(transferCommittedBeforeRelease){
  assert.equal(stored.status,'APPROVED','A branch cancellation must recheck scope after a concurrent transfer commits')
  assert.equal(ledger[0].status,'PENDING','A rejected foreign-branch cancellation must not cancel the financial obligation')
 }else{assert.equal(result.status,201,'A future fix may serialize cancellation first');assert.equal(stored.status,'CANCELLED')}
})

for(const kind of ['bonus','deduction'])test(`CR28 ${kind} ordinary cancellation works and an already-transferred employee is denied without writes`,{timeout:90000},async t=>{
 const prefix=kind==='bonus'?'bonuses':'deductions',entity=kind==='bonus'?'BonusRequest':'DeductionRequest'
 const type=await f.ok('POST',`/${prefix}/types`,{code:'R28_CONTROL_'+kind.toUpperCase(),nameAr:'نوع ضبط '+kind,calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],...(kind==='deduction'?{category:'PERFORMANCE'}:{})})
 const today=new Date().toLocaleDateString('en-CA'),period=today.slice(0,7),statuses=[]
 for(const transferFirst of [false,true]){
  const e=await f.employee(9000)
  const row=await f.ok('POST',`/${prefix}`,{employeeId:e.id,[kind==='bonus'?'bonusTypeId':'deductionTypeId']:type.id,inputValue:'300',reason,targetPeriod:period,confirmNotDuplicate:true,...(kind==='deduction'?{incidentDate:today}:{})})
  if(transferFirst){
   const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
   await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.B.id,calendarChange:{effectiveFrom:today,reason,expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
  }
  const response=await f.request('POST',`/${prefix}/${row.id}/cancel`,{expectedRevision:row.revision,reason},manager)
  const stored=await f.repo(entity).findOneByOrFail({id:row.id}),[ledger]=await f.repo('EmployeeObligation').findBy({[kind==='bonus'?'bonusRequestId':'deductionRequestId']:row.id})
  assert.equal(response.status,transferFirst?404:201,JSON.stringify(response.body));assert.equal(stored.status,transferFirst?'APPROVED':'CANCELLED');assert.equal(ledger.status,transferFirst?'PENDING':'CANCELLED')
  statuses.push(response.status)
 }
 t.diagnostic(JSON.stringify({case:'related-cancellation-controls',kind,ordinaryStatus:statuses[0],afterTransferStatus:statuses[1],refusalKeptRequestAndLedger:true}))
})
