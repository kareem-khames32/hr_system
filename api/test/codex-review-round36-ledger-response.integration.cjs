'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round36-support.cjs')
let f,hrA,department
const reason='اختبار مستقل لمرجع المسير في رد إلغاء القيد'
before(async()=>{
 f=await setup('r36_ledger_response');hrA=await f.actor('r36-response-a',['payroll.view','payroll.calculate'])
 department=await f.repo('Department').save({name:'CR36 response A',branchId:f.A.id})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const foreign of [false,true])test(`CR36 cancellation response: ${foreign?'foreign payroll reference is hidden':'authorized payroll reference and amounts are preserved'}`,{timeout:180000},async t=>{
 const e=await f.employee(9000,foreign?f.B:f.A,{bankName:'CR36 response fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const credit=await f.ok('POST','/obligations',{employeeId:e.id,type:'CREDIT',amount:123.45,label:reason,category:'manual',effectiveDate:'2026-07-01'})
 const run=await f.draft('CR36 response '+(foreign?'B':'A'),[e.id]);await f.calculate(run);await f.approve(run.id)
 if(foreign){
  const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:department.id,calendarChange:{effectiveFrom:new Date().toLocaleDateString('en-CA'),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 }
 const runRead=await f.request('GET',`/payroll/runs/${run.id}`,null,hrA);assert.equal(runRead.status,foreign?403:200)
 const before=await f.repo('EmployeeObligation').findOneByOrFail({id:credit.id})
 const companyBefore=(await f.ok('GET',`/obligations/employee/${e.id}`)).find(x=>x.id===credit.id)
 assert.equal(companyBefore.reservedPayrollRunId,run.id)
 const response=await f.request('POST',`/obligations/${credit.id}/cancel`,{},hrA)
 assert.equal(response.status,201);assert.equal(response.body.status,'CANCELLED')
 const after=await f.repo('EmployeeObligation').findOneByOrFail({id:credit.id})
 assert.equal(after.status,'CANCELLED');assert.equal(Number(after.amount),123.45);assert.equal(after.reservedPayrollRunId,run.id)
 assert.equal(Number(response.body.amount),123.45)
 for(const key of ['employeeId','type','category','effectiveDate','reservedPayrollRunId','appliedPayrollRunId','payrollReversalRunId'])assert.deepEqual(after[key],before[key],key)
 assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'APPROVED')
 assert.equal(Number((await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})).netPay),9123.45)
 const companyAfter=(await f.ok('GET',`/obligations/employee/${e.id}`)).find(x=>x.id===credit.id)
 assert.equal(companyAfter.reservedPayrollRunId,run.id)
 t.diagnostic(JSON.stringify({case:'obligation-cancellation-response',foreign,runReadStatus:runRead.status,cancellationStatus:response.status,storedStatus:after.status,responseReservedRunId:response.body.reservedPayrollRunId,companyReservedRunId:companyAfter.reservedPayrollRunId,amount:123.45,approvedNet:9123.45,financialFieldsOtherThanCancellationUnchanged:true}))
 assert.equal(response.body.reservedPayrollRunId??null,foreign?null:run.id,'Cancellation response must use the same run-reference scope as list and payroll access')
})
