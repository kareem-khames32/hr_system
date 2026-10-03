'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round34-support.cjs')
let f,hrA,hrB,deptA,teamA
const today=()=>new Date().toLocaleDateString('en-CA'),reason='مراجعة مستقلة لترحيل القسط وحدود مرجع المسير'
before(async()=>{
 f=await setup('r34_boundaries')
 const perms=['deductions.manage','deductions.view','deductions.approve','approve.hr','payroll.view','reports.view']
 hrA=await f.actor('r34-carry-a',perms);hrB=await f.actor('r34-carry-b',perms,f.B)
 deptA=await f.repo('Department').save({name:'CR34 carry department A',branchId:f.A.id});teamA=await f.repo('Team').save({name:'CR34 carry team A',departmentId:deptA.id})
 for(const key of ['min_net_guarantee','net_floor_pct','max_deduction_pct_of_gross'])await f.setting('payroll.policy.'+key,'null')
 await f.setting('deductions.max_carry_forward_count','1')
},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR34 carried and suspended deduction events must not expose a foreign payroll reference',{timeout:180000},async t=>{
 const firstPeriod='2026-07',secondPeriod='2026-08',resumePeriod=`${new Date().getFullYear()+1}-03`
 const e=await f.employee(1000,f.B,{bankName:'CR34 carry bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const type=await f.ok('POST','/deductions/types',{code:'CR34_CARRY',nameAr:'خصم الترحيل المستقل',category:'ADMINISTRATIVE',calcMethod:'FIXED_AMOUNT',maxPctOfGross:null,creatorScopes:['HR'],approvalSteps:['HR']})
 const row=await f.ok('POST','/deductions',{employeeId:e.id,deductionTypeId:type.id,inputValue:'2500',targetPeriod:firstPeriod,incidentDate:today(),reason,confirmNotDuplicate:true},hrB)
 assert.equal(row.status,'APPROVED')
 const runs=[]
 for(const period of [firstPeriod,secondPeriod]){
  const run=await f.draft('CR34 hidden carry '+period,[e.id],period);await f.calculate(run)
  const item=await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})
  assert.equal(Number(item.netPay),0);assert.equal(Number(item.otherDeductions),1000)
  await f.pay(run);runs.push(run)
 }
 const ledger=await f.repo('EmployeeObligation').find({where:{deductionRequestId:row.id},order:{id:'ASC'}})
 assert.deepEqual(ledger.map(x=>[Number(x.amount),x.status,Number(x.appliedAmount||0)]),[[2500,'APPLIED',1000],[1500,'APPLIED',1000],[500,'SUSPENDED',0]])
 const cal=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:deptA.id,teamId:teamA.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:cal.revision,expectedCurrentSourceHash:cal.currentSourceHash}})
 for(const run of runs)assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,hrA)).status,403)
 const stored=await f.repo('DeductionRequestEvent').find({where:{requestId:row.id},order:{id:'ASC'}})
 const view=await f.ok('GET',`/deductions/${row.id}`,null,hrA),company=await f.ok('GET',`/deductions/${row.id}`)
 assert.equal(view.collectedAmount,'2000.00');assert.equal(company.collectedAmount,'2000.00')
 assert.ok(view.obligations.every(x=>x.appliedPayrollRunId===null&&x.reservedPayrollRunId===null))
 const pick=x=>x.events.filter(e=>['CARRY_FORWARD','CARRY_SUSPENDED'].includes(e.eventType)).map(e=>({type:e.eventType,runId:e.payload.runId}))
 assert.deepEqual(pick(company),[{type:'CARRY_FORWARD',runId:runs[0].id},{type:'CARRY_SUSPENDED',runId:runs[1].id}])
 // Past periods reject before the closed-period guard, without changing the installment.
 for(const actor of [hrA,f.admin]){
  const r=await f.request('POST',`/deductions/obligations/${ledger[2].id}/decision`,{action:'RESUME',targetPeriod:secondPeriod,reason},actor)
  assert.equal(r.status,400);assert.equal(r.body.code,'DEDUCTION_PERIOD_PAST')
  assert.equal(r.body.runId,undefined);assert.equal(String(r.body.message).includes('#'+runs[1].id),false)
 }
 assert.deepEqual(await f.repo('EmployeeObligation').find({where:{deductionRequestId:row.id},order:{id:'ASC'}}),ledger)
 assert.deepEqual(await f.repo('DeductionRequestEvent').find({where:{requestId:row.id},order:{id:'ASC'}}),stored)
 const resumed=await f.ok('POST',`/deductions/obligations/${ledger[2].id}/decision`,{action:'RESUME',targetPeriod:resumePeriod,reason},hrA)
 assert.deepEqual(resumed.obligations.filter(x=>x.id===ledger[2].id).map(x=>[x.status,x.amount]),[['PENDING','500.00']])
 t.diagnostic(JSON.stringify({case:'carry-event-run-reference',directRunStatus:403,requestDetailStatus:200,branchEvents:pick(view),companyEvents:pick(company),actionResponseEvents:pick(resumed),ledgerReferencesHidden:true,pastPeriodRejectedWithoutWrite:true,paid:2000,remaining:500,storedEvidenceUnchangedByReads:true}))
 assert.deepEqual(pick(view),[{type:'CARRY_FORWARD',runId:null},{type:'CARRY_SUSPENDED',runId:null}],'Foreign run IDs must be hidden in events as well as obligation fields')
 assert.deepEqual(pick(resumed),pick(view))
})
test('CR34 both obligation reservation guards reject without foreign run numbers or writes',{timeout:180000},async t=>{
 const {reservePayrollObligations}=require('../src/payroll/payroll-obligation-ledger')
 const {reserveExemptedObligations}=require('../src/payroll/payroll-financial-exemption-ledger')
 const {FINANCIAL_EXEMPTION_VERSION}=require('../src/payroll/financial-exemptions')
 const e=await f.employee(1000,f.B),foreign=await f.draft('CR34 foreign reservation',[e.id],'2026-10'),local=await f.draft('CR34 second reservation',[e.id],'2026-11')
 const row=await f.repo('EmployeeObligation').save({employeeId:e.id,type:'DEBIT',category:'fixture',label:'CR34 reserve',amount:12.34,status:'PENDING',effectiveDate:'2026-07-01',createdByUserId:f.admin.id,reservedPayrollRunId:foreign.id})
 const before=await f.repo('EmployeeObligation').findOneByOrFail({id:row.id})
 const inputs=[{fn:reservePayrollObligations,breakdown:{obligationIds:[row.id]}},{fn:reserveExemptedObligations,breakdown:{financialExemptions:{version:FINANCIAL_EXEMPTION_VERSION,applied:[],lines:[],exemptedObligations:[{obligationId:row.id,amount:'12.34'}],deferredInstallments:[],totals:{byExemption:[]}}}}]
 for(const {fn,breakdown} of inputs){
  let error;try{await f.ds.transaction(em=>fn(em,e.id,local.id,breakdown))}catch(e){error=e}
  assert.ok(error);assert.equal(error.getStatus(),409);const response=error.getResponse();assert.equal(response.code,'PAYRUN-OBLIGATION-RESERVED')
  assert.ok(!response.message.includes('مسير #'+foreign.id));assert.match(response.message,/مسير آخر معتمد/)
  assert.deepEqual(await f.repo('EmployeeObligation').findOneByOrFail({id:row.id}),before)
 }
 t.diagnostic(JSON.stringify({case:'reservation-guards',guardCount:2,status:409,code:'PAYRUN-OBLIGATION-RESERVED',foreignRunReferenceAbsent:true,ledgerUnchanged:true}))
})
