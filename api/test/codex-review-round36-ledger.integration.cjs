'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round36-support.cjs')
let f,hrA,department,team
const reason='مراجعة مستقلة لمرجع المسير في دفتر المستحقات',today=()=>new Date().toLocaleDateString('en-CA')
before(async()=>{
 f=await setup('r36_ledger');hrA=await f.actor('r36-ledger-a',['payroll.view','payroll.calculate'])
 department=await f.repo('Department').save({name:'CR36 ledger A',branchId:f.A.id});team=await f.repo('Team').save({name:'CR36 ledger team',departmentId:department.id})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const stage of ['APPROVED','PAID','REVERSED'])test(`CR36 raw obligations ${stage}: foreign run references must be hidden after employee transfer`,{timeout:180000},async t=>{
 const e=await f.employee(9000,f.B,{bankName:'CR36 ledger fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const credit=await f.ok('POST','/obligations',{employeeId:e.id,type:'CREDIT',amount:123.45,label:reason,category:'manual',effectiveDate:'2026-07-01'})
 const run=await f.draft('CR36 private B obligation '+stage,[e.id]);await f.calculate(run);await f.approve(run.id)
 assert.equal(Number((await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})).netPay),9123.45)
 if(stage!=='APPROVED')await f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'CR36 ledger paid '+run.id},f.approver)
 let reversal;if(stage==='REVERSED')reversal=await f.reverse(run,[e.id])
 const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:department.id,teamId:team.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,hrA)).status,403)
 if(reversal)assert.equal((await f.request('GET',`/payroll/runs/${reversal.id}`,null,hrA)).status,403)
 const before=await f.repo('EmployeeObligation').find({where:{employeeId:e.id},order:{id:'ASC'}})
 const view=await f.ok('GET',`/obligations/employee/${e.id}`,null,hrA),company=await f.ok('GET',`/obligations/employee/${e.id}`)
 const branchRow=view.find(x=>x.id===credit.id),companyRow=company.find(x=>x.id===credit.id)
 assert.ok(branchRow&&companyRow);assert.equal(Number(branchRow.amount),123.45);assert.equal(companyRow.reservedPayrollRunId,run.id)
 if(stage!=='APPROVED')assert.equal(companyRow.appliedPayrollRunId,run.id)
 if(reversal)assert.equal(companyRow.payrollReversalRunId,reversal.id)
 assert.deepEqual(await f.repo('EmployeeObligation').find({where:{employeeId:e.id},order:{id:'ASC'}}),before)
 const refs=row=>({reserved:row.reservedPayrollRunId??null,applied:row.appliedPayrollRunId??null,reversal:row.payrollReversalRunId??null})
 let cancelled
 if(stage==='APPROVED'){
  // Exercise the existing cancellation response; this test does not prescribe a new cancellation policy.
  cancelled=await f.ok('POST',`/obligations/${credit.id}/cancel`,{},hrA);assert.equal(cancelled.status,'CANCELLED')
  assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'APPROVED')
 }
 t.diagnostic(JSON.stringify({case:'raw-obligation-run-reference',stage,runReadStatus:403,listStatus:200,branchRefs:refs(branchRow),companyRefs:refs(companyRow),cancelRefs:cancelled?refs(cancelled):null,cancelStatus:cancelled?.status??null,amount:123.45,net:9123.45,readsLeaveLedgerUnchanged:true}))
 assert.deepEqual(refs(branchRow),{reserved:null,applied:null,reversal:null},'Generic obligation list must not disclose payroll references hidden by payroll access')
 if(cancelled)assert.deepEqual(refs(cancelled),{reserved:null,applied:null,reversal:null},'Cancellation response must also hide foreign payroll references')
})
