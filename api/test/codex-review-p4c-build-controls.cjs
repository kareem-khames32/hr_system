'use strict'
const fs=require('node:fs'),path=require('node:path')
const source=fs.readFileSync(path.join(__dirname,'employee-privacy.integration.cjs'),'utf8').split('\ntest(')[0]
fs.writeFileSync(path.join(__dirname,'codex-review-p4c-export-controls.integration.cjs'),source+String.raw`
const auditCount=()=>repo('AuditLog').countBy({action:'EMPLOYEE_DATA_EXPORT'})
test('P4C-P01: current parent request confidentiality hides both offboarding and closed employment period',async t=>{
 const type=await repo('RequestType').findOneByOrFail({code:'RESIGNATION'})
 const req=await repo('Request').save({typeCode:'RESIGNATION',requesterId:E.target.id,branchId:B.one.id,status:'COMPLETED',payload:'{"reason":"P4C_PARENT_REASON"}'})
 const parent=await repo('OffboardingCase').save({employeeId:E.target.id,resignationRequestId:req.id,lastWorkingDay:'2025-12-31',status:'CLOSED',notes:'P4C_PARENT_REASON'})
 const period=await repo('EmploymentPeriod').save({employeeId:E.target.id,periodNo:1,startDate:'2020-01-01',endDate:'2025-12-31',exitReason:'resignation',offboardingCaseId:parent.id,rehireReason:'Synthetic closed period',createdAt:new Date()})
 const flags=data=>['offboarding','employmentPeriods'].map((key,i)=>data.sections.find(s=>s.key===key).rows.some(r=>r.id===(i?period.id:parent.id)))
 await repo('RequestType').update({id:type.id},{isConfidential:false})
 assert.deepEqual(flags(ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)),[true,true])
 await repo('RequestType').update({id:type.id},{isConfidential:true})
 const secret=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.deepEqual(flags(secret),[false,false]);assert.equal(JSON.stringify(secret).includes('P4C_PARENT_REASON'),false)
 t.diagnostic(JSON.stringify({publicParentAndPeriod:[true,true],confidentialParentAndPeriod:[false,false]}))
})
test('P4C-R01: rollback after the audit insert leaves exactly one audit; retries bounded to three',async t=>{
 const original=ds.transaction;let calls=0,rejects=2
 ds.transaction=function(...args){const work=args.at(-1);if(typeof work!=='function'||!String(work).includes('EMPLOYEE_DATA_SECTIONS'))return original.apply(this,args)
  calls++;return original.call(this,async em=>{const result=await work(em);if(calls<=rejects)throw Object.assign(new Error('P4C synthetic deadlock after audit'),{driverError:{number:1205}});return result})}
 try{
  const before=await auditCount();ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
  assert.equal(calls,3);assert.equal(await auditCount()-before,1)
  calls=0;rejects=99;const beforeFail=await auditCount();assert.equal((await request(U.editor,'GET','/employees/'+E.target.id+'/data-export')).status,500)
  assert.equal(calls,3);assert.equal(await auditCount(),beforeFail)
  t.diagnostic(JSON.stringify({successAttempts:3,committedAudits:1,exhaustedAttempts:3,exhaustedAudits:0}))
 }finally{ds.transaction=original}
})
test('P4C-P02: installment section is skipped even for a public loan because it lacks employeeId',async t=>{
 const loan=await repo('Loan').save({employeeId:E.target.id,amount:1000,status:'ACTIVE'})
 const installment=await repo('LoanInstallment').save({loanId:loan.id,dueDate:'2026-12-01',amount:1000,paid:false})
 const data=ok(await request(U.editor,'GET','/employees/'+E.target.id+'/data-export'),200)
 assert.ok(data.sections.find(s=>s.key==='loans').rows.some(r=>r.id===loan.id))
 assert.equal(data.sections.some(s=>s.key==='loanInstallments'),false)
 assert.equal((await repo('LoanInstallment').countBy({id:installment.id})),1)
 t.diagnostic(JSON.stringify({publicLoanExported:true,installmentExists:true,installmentSectionPresent:false}))
})
test('P4C-R02: a branch transfer between rolled-back attempt and retry causes a fresh 404 scope decision',async t=>{
 const original=ds.transaction;let calls=0,moved=false
 const before=await auditCount()
 ds.transaction=async function(...args){const work=args.at(-1);if(typeof work!=='function'||!String(work).includes('EMPLOYEE_DATA_SECTIONS'))return original.apply(this,args)
  calls++
  try{return await original.call(this,async em=>{const result=await work(em);if(calls===1)throw Object.assign(new Error('P4C scope retry'),{number:1205});return result})}
  catch(error){if(calls===1&&!moved){moved=true;const ctx=ok(await request(admin,'GET','/attendance/calendar-context?scope=EMPLOYEE&sourceId='+E.target.id),200)
   ok(await request(admin,'PATCH','/employees/'+E.target.id,{branchId:B.two.id,calendarChange:{effectiveFrom:'2026-10-01',reason:'P4C move between attempts',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}}),200)}throw error}
 }
 try{const result=await request(U.editor,'GET','/employees/'+E.target.id+'/data-export');assert.equal(result.status,404);assert.equal(calls,2);assert.equal(await auditCount(),before)
  t.diagnostic(JSON.stringify({attempts:calls,status:result.status,audits:0,scopeReevaluated:true}))
 }finally{ds.transaction=original}
})
`)
