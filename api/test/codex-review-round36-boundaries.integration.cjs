'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round36-support.cjs')
let f,hrA
const reason='مراجعة مستقلة لتبعية قسط مرحل في فرع آخر'
before(async()=>{f=await setup('r36_downstream');hrA=await f.actor('r36-reverse-a',['payroll.view','payroll.reverse','payroll.approve','payroll.pay']);await f.setting('loan.insufficient_net_behavior','PARTIAL_THEN_CARRY')},{timeout:180000})
after(async()=>{if(f)await f.close()})
for(const stage of ['preview-create','approve','pay'])test(`CR36 ${stage}: reversal blocker must not expose a foreign payroll holding the carried loan installment`,{timeout:180000},async t=>{
 const e=await f.employee(1000,f.A,{bankName:'CR36 downstream bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const loan=await f.repo('Loan').save({employeeId:e.id,amount:1500,status:'APPROVED'})
 await f.repo('LoanInstallment').save({loanId:loan.id,dueDate:'2026-07-01',originalDueDate:'2026-07-01',amount:1500,paidAmount:'0.00',financialStatus:'DUE',financialRevision:1,paid:false})
 const original=await f.draft('CR36 visible original A '+stage,[e.id],'2026-07');await f.calculate(original);await f.pay(original)
 const item=await f.repo('PayrollItem').findOneByOrFail({runId:original.id,employeeId:e.id});assert.equal(Number(item.netPay),0);assert.equal(Number(item.loanInstallments),1000)
 const children=await f.repo('LoanInstallment').find({where:{loanId:loan.id},order:{id:'ASC'}})
 assert.deepEqual(children.map(x=>[Number(x.amount),Number(x.paidAmount),x.financialStatus]),[[1500,1000,'PARTIAL'],[500,0,'DUE']])
 let reversal
 if(stage!=='preview-create'){
  const p=await f.ok('POST',`/payroll/runs/${original.id}/reversal-preview`,{employeeIds:[e.id]});assert.equal(p.blocked,false)
  reversal=await f.ok('POST',`/payroll/runs/${original.id}/reversals`,{employeeIds:[e.id],reason,previewHash:p.previewHash})
  if(stage==='pay')await f.ok('POST',`/payroll/runs/${reversal.id}/approve`,{},f.approver)
 }
 const department=await f.repo('Department').save({name:'CR36 downstream B '+stage,branchId:f.B.id}),team=await f.repo('Team').save({name:'CR36 downstream team '+stage,departmentId:department.id})
 const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
 await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.B.id,departmentId:department.id,teamId:team.id,calendarChange:{effectiveFrom:'2026-07-23',reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
 const hidden=await f.draft('CR36 PRIVATE downstream B '+stage,[e.id],'2026-08');await f.calculate(hidden);await f.approve(hidden.id)
 assert.equal((await f.repo('PayrollRunMember').findOneByOrFail({runId:hidden.id,employeeId:e.id})).snapshot.branchId,f.B.id)
 const held=await f.repo('PayrollItem').findOneByOrFail({runId:hidden.id,employeeId:e.id});assert.equal(Number(held.loanInstallments),500);assert.equal(Number(held.netPay),500)
 assert.equal((await f.request('GET',`/payroll/runs/${original.id}`,null,hrA)).status,200)
 assert.equal((await f.request('GET',`/payroll/runs/${hidden.id}`,null,hrA)).status,403)
 const snapshot=async()=>({installments:await f.ds.query('SELECT * FROM loan_installments WHERE loanId=@0 ORDER BY id',[loan.id]),allocations:await f.ds.query('SELECT * FROM loan_installment_allocations WHERE employeeId=@0 ORDER BY id',[e.id]),events:await f.ds.query('SELECT * FROM loan_installment_events WHERE employeeId=@0 ORDER BY id',[e.id]),runs:await f.repo('PayrollRun').find({order:{id:'ASC'}}),runEvents:await f.repo('PayrollRunEvent').find({order:{id:'ASC'}}),items:await f.repo('PayrollItem').find({order:{id:'ASC'}}),reversals:await f.repo('PayrollRunReversalLine').find({order:{id:'ASC'}})})
 const before=await snapshot(),preview=await f.ok('POST',`/payroll/runs/${original.id}/reversal-preview`,{employeeIds:[e.id]},hrA),company=await f.ok('POST',`/payroll/runs/${original.id}/reversal-preview`,{employeeIds:[e.id]})
 assert.equal(preview.blocked,true);assert.ok(company.blockers.some(x=>x.details?.runId===hidden.id),JSON.stringify(company.blockers))
 assert.equal(preview.previewHash,company.previewHash,'Hidden and full views must use the same server fingerprint')
 assert.deepEqual(preview.lines.flatMap(x=>x.blockers),preview.blockers)
 const check=(body,full)=>{
  assert.ok(!JSON.stringify(body).includes('redactedMessage'),'Internal fallback text is never a response field')
  const relevant=body.blockers.filter(x=>x.code==='PAYRUN-REVERSAL-DOWNSTREAM'&&Object.hasOwn(x.details??{},'runId'))
  assert.equal(relevant.length,1)
  for(const b of relevant){
   assert.equal(b.details.runId,full?hidden.id:null)
   if(full)assert.ok(b.message.includes(`المسير #${hidden.id} (معتمد)`));else{
    assert.match(b.message,/برّه نطاق صلاحيتك/)
    assert.doesNotMatch(b.message,/معتمد|مصروف|APPROVED|PAID/)
    assert.ok(!b.message.includes(`المسير #${hidden.id}`))
   }
  }
  if(reversal&&body.blockers.some(x=>x.code==='PAYRUN-REVERSAL-EXISTS')){
   const own=body.blockers.find(x=>x.code==='PAYRUN-REVERSAL-EXISTS');assert.equal(own.details.reversalRunId,reversal.id)
   assert.ok(own.message.includes(`مسير العكس #${reversal.id}`))
  }
 }
 check(preview,false);check(company,true)
 const refused=stage==='preview-create'
  ?await f.request('POST',`/payroll/runs/${original.id}/reversals`,{employeeIds:[e.id],reason,previewHash:preview.previewHash},hrA)
  :await f.request('POST',`/payroll/runs/${reversal.id}/${stage}`,stage==='pay'?{channel:'CASH',reference:'CR36 should refuse'}:{},hrA)
 assert.equal(refused.status,409);assert.equal(refused.body.code,'PAYRUN-REVERSAL-BLOCKED');assert.deepEqual(await snapshot(),before)
 check(refused.body,false)
 const companyRefusal=stage==='preview-create'
  ?await f.request('POST',`/payroll/runs/${original.id}/reversals`,{employeeIds:[e.id],reason,previewHash:company.previewHash})
  :await f.request('POST',`/payroll/runs/${reversal.id}/${stage}`,stage==='pay'?{channel:'CASH',reference:'CR36 company refusal'}:{},f.approver)
 assert.equal(companyRefusal.status,409);assert.equal(companyRefusal.body.code,'PAYRUN-REVERSAL-BLOCKED');check(companyRefusal.body,true)
 assert.deepEqual(await snapshot(),before,'Both viewers receive the same financial refusal and cause no persisted changes')
 t.diagnostic(JSON.stringify({case:'scoped-reversal-blockers',stage,hashIdentical:true,lineBlockersEqual:true,foreignIdAndStatusHidden:true,ownReversalVisible:!!reversal,internalFieldAbsent:true,branchAndCompanyStatus:409,fullFinancialAndAuditStateUnchanged:true}))
 t.diagnostic(JSON.stringify({case:'foreign-downstream-run-reference',stage,ownRun:original.id,foreignRun:hidden.id,ownRead:200,foreignRead:403,previewBlocked:preview.blocked,branchBlockers:preview.blockers,companyBlockers:company.blockers,refusal:refused.body,sourceNet:0,sourcePaid:1000,heldInstallment:500,heldNet:500,ledgerAndRunsUnchanged:true}))
 assert.ok(!JSON.stringify(preview).includes('"runId":'+hidden.id),'Preview must not include the foreign downstream payroll identifier')
 assert.ok(!JSON.stringify(refused.body).includes('"runId":'+hidden.id),'Refusal must preserve the block without the foreign payroll identifier')
 assert.ok(!JSON.stringify(preview).includes('المسير #'+hidden.id));assert.ok(!JSON.stringify(refused.body).includes('المسير #'+hidden.id))
})
