'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round26-support.cjs')
let f,grantA,grantB,readerA,readerB,company
const reason='تصحيح مستقل موثق لاختبار نطاق الإعفاء المنقول'
const json=value=>JSON.parse(JSON.stringify(value))
before(async()=>{
 f=await setup('r26_independent')
 await f.setting('financial_exemptions.max_pct_per_grantor',0)
 await f.setting('financial_exemptions.max_per_employee_year',0)
 await f.setting('attendance.absence_penalty_days',1)
 grantA=await f.actor('grant-A',['financial_exemption.grant','financial_exemption.view','financial_exemption.approve'])
 grantB=await f.actor('grant-B',['financial_exemption.grant','financial_exemption.view','financial_exemption.approve'],f.B)
 readerA=await f.actor('reader-A',['payroll.view']);readerB=await f.actor('reader-B',['payroll.view'],f.B)
 company=await f.actor('reader-company',['payroll.view'],null)
},{timeout:180000})
after(async()=>{if(f)await f.close()})

async function exemptedRoot(name,employees){
 for(const e of employees)await f.attendance(e,'2026-07',['2026-07-07'])
 let root=await f.calculate(await f.draft(name,employees.map(e=>e.id)))
 const grants=[]
 for(const e of employees){
  const dto={runId:root.id,employeeId:e.id,scopeKind:'DEDUCTION_TYPE',targetKind:'ABSENCE',reason,attachmentRef:'review-attachment'}
  const preview=await f.ok('POST','/payroll/exemptions/preview',dto,grantA)
  grants.push(await f.ok('POST','/payroll/exemptions',{...dto,previewHash:preview.previewHash},grantA))
 }
 root=await f.ok('POST',`/payroll/runs/${root.id}/recalculate`,{reason})
 await f.pay(root);await f.reverse(root,employees.map(e=>e.id))
 return {root,grants}
}
const supplementary=(root,employees,name)=>f.ok('POST',`/payroll/runs/${root.id}/supplementary`,{employeeIds:employees.map(e=>e.id),name,reason})

test('CR26 full-scope correction views preserve the old serialized contract and employee self links',{timeout:90000},async t=>{
 const e=await f.employee(7319.17)
 const root=await f.calculate(await f.draft('روابط كاملة لقارئ الفرع',[e.id]));await f.pay(root);await f.reverse(root,[e.id])
 const child=await f.calculate(await supplementary(root,[e],'تكميلي كامل داخل ألف'));await f.pay(child)
 const raw=require('../src/payroll/payroll-reversal-ledger')
 const stored=await f.repo('PayrollRun').findOneByOrFail({id:root.id})
 const oldCorrection=json(await raw.describePayrollRunCorrection(f.ds.manager,stored))
 const oldItem=json(await raw.describePayrollItemReversal(f.ds.manager,root.items[0]))
 for(const actor of [readerA,company,f.admin]){
  for(const route of [`/payroll/runs/${root.id}`,`/payroll/runs/${root.id}/corrections`])assert.deepEqual((await f.ok('GET',route,null,actor)).correction,oldCorrection)
  assert.deepEqual((await f.ok('GET',`/payroll/items/${root.items[0].id}`,null,actor)).reversal,oldItem)
 }
 const self=await f.actor('own-slip',[],f.A,{employeeId:e.id})
 assert.deepEqual((await f.ok('GET',`/payroll/items/${root.items[0].id}`,null,self)).reversal,oldItem)
 const ownList=await f.ok('GET','/payroll/my-payslips',null,self)
 assert.ok(JSON.stringify(ownList).includes('7319.17'))
 t.diagnostic(JSON.stringify({case:'full-contract',fullCorrectionDeepEqual:true,fullItemDeepEqual:true,readers:['branch','company','admin','employee-own'],net:7319.17}))
})

test('CR26 a transfer between supplementary creation and calculation must not leave the old branch able to read or revoke its exemption',{timeout:90000},async t=>{
 const e=await f.employee(9000),{root}=await exemptedRoot('إعفاء قبل نقل لاحق',[e])
 const draft=await supplementary(root,[e],'تكميلي يتغير فرعه قبل الحساب')
 const copy=await f.repo('PayrollFinancialExemption').findOneByOrFail({runId:draft.id,employeeId:e.id})
 assert.equal(JSON.parse(copy.evaluation).org.branchId,f.A.id)
 // Transfer the current employee file while the supplementary payroll is still a draft.
 await f.repo('Employee').update(e.id,{branchId:f.B.id})
 const child=await f.calculate(draft)
 assert.equal(child.members.find(m=>m.employeeId===e.id).snapshot.branchId,f.B.id)
 assert.equal(Number(child.items[0].netPay),9000)
 const blockedRun=await f.request('GET',`/payroll/runs/${child.id}`,null,readerA);assert.equal(blockedRun.status,403)
 const foreignDetail=await f.request('GET',`/payroll/exemptions/${copy.id}`,null,grantA)
 const rightfulDetail=await f.request('GET',`/payroll/exemptions/${copy.id}`,null,grantB)
 const revoke=await f.request('POST',`/payroll/exemptions/${copy.id}/revoke`,{reason,expectedRevision:copy.revision},grantA)
 const saved=await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id})
 let netAfter=9000
 if(revoke.status<300)netAfter=Number((await f.ok('POST',`/payroll/runs/${child.id}/recalculate`,{reason})).items[0].netPay)
 t.diagnostic(JSON.stringify({case:'carry-before-transfer',savedExemptionBranch:JSON.parse(saved.evaluation).org.branchId,memberBranch:f.B.id,oldBranchRunStatus:blockedRun.status,
  oldBranchExemptionStatus:foreignDetail.status,newBranchExemptionStatus:rightfulDetail.status,oldBranchCanRevoke:foreignDetail.body.canRevoke,revokeStatus:revoke.status,storedExemptionStatus:saved.status,netBefore:9000,netAfter}))
 assert.equal(foreignDetail.status,403,'The original grantor must not read a carried copy in a foreign payroll')
 assert.equal(rightfulDetail.status,200);assert.equal(revoke.status,403);assert.equal(saved.status,'ACTIVE');assert.equal(netAfter,9000)
})

test('CR26 dated organisation must govern the carried exemption just as it governs supplementary membership',{timeout:90000},async t=>{
 const e=await f.employee(9600),{root}=await exemptedRoot('إعفاء بفرع مؤرخ',[e])
 const {appendEmployeeOrgCalendar}=require('../src/attendance/attendance-calendar-history')
 // Reproduce a dated transfer, effective AFTER the July payroll, using the product history writer.
 await f.ds.transaction(async em=>{
  await em.getRepository('Employee').update(e.id,{branchId:f.B.id})
  await appendEmployeeOrgCalendar(em,{employeeId:e.id,beforeBranchId:f.A.id,branchId:f.B.id,effectiveFrom:'2026-09-01',reason,actorUserId:f.admin.id})
 })
 const draft=await supplementary(root,[e],'تكميلي يوليو بعد نقل سبتمبر'),child=await f.calculate(draft)
 assert.equal(child.members.find(m=>m.employeeId===e.id).snapshot.branchId,f.A.id,'July membership remains in A despite the later current branch')
 const copy=await f.repo('PayrollFinancialExemption').findOneByOrFail({runId:child.id,employeeId:e.id})
 assert.equal((await f.request('GET',`/payroll/runs/${child.id}`,null,readerB)).status,403)
 const inScope=await f.request('GET',`/payroll/exemptions/${copy.id}`,null,grantA)
 const outOfScope=await f.request('GET',`/payroll/exemptions/${copy.id}`,null,grantB)
 t.diagnostic(JSON.stringify({case:'dated-carry-organisation',effectiveTransfer:'2026-09-01',payrollPeriod:child.period,currentBranch:f.B.id,memberBranch:f.A.id,
  exemptionBranch:JSON.parse(copy.evaluation).org.branchId,rightfulStatus:inScope.status,foreignStatus:outOfScope.status,foreignAmount:outOfScope.body.estimatedAmount}))
 assert.equal(outOfScope.status,403,'Current profile placement must not disclose an exemption belonging to historical branch A');assert.equal(inScope.status,200)
})

test('CR26 mixed supplementary header must not expose a foreign carried exemption reference in the parent event',{timeout:90000},async t=>{
 const stay=await f.employee(9000),move=await f.employee(12000),{root,grants}=await exemptedRoot('مصدر إعفاءين لتكميلي مختلط',[stay,move])
 await f.repo('Employee').update(move.id,{branchId:f.B.id})
 const child=await f.calculate(await supplementary(root,[stay,move],'تكميلي مختلط برأس فقط'))
 const copies=await f.repo('PayrollFinancialExemption').findBy({runId:child.id}),near=copies.find(r=>r.employeeId===stay.id),far=copies.find(r=>r.employeeId===move.id)
 assert.equal((await f.request('GET',`/payroll/exemptions/${far.id}`,null,grantA)).status,403)
 const header=(await f.ok('GET',`/payroll/runs/${root.id}`,null,readerA)).correction.children.find(r=>r.id===child.id)
 assert.equal(header.totalNet,null);assert.equal(header.correctionReason,null)
 const scoped=(await f.ok('GET',`/payroll/runs/${root.id}/events`,null,readerA)).find(r=>r.eventType==='SUPPLEMENTARY_CREATED'&&r.payload?.supplementaryRunId===child.id)
 const full=(await f.ok('GET',`/payroll/runs/${root.id}/events`,null,company)).find(r=>r.eventType==='SUPPLEMENTARY_CREATED'&&r.payload?.supplementaryRunId===child.id)
 assert.equal(full.payload.carriedExemptions.length,2)
 const originalFar=(await f.ok('GET',`/payroll/exemptions/${grants[1].id}`,null,grantA)).events.find(r=>r.eventType==='CARRIED_TO_SUPPLEMENTARY')
 assert.equal(originalFar.payload.carriedExemptionId,null,'Individual exemption event correctly hides the foreign copy')
 t.diagnostic(JSON.stringify({case:'mixed-supplementary-event',headerVisible:true,headerNet:null,foreignExemptionDirectStatus:403,individualEventForeignId:null,
  nearCopyId:near.id,foreignCopyId:far.id,scopedCarriedExemptions:scoped.payload.carriedExemptions,companyCopies:full.payload.carriedExemptions.length}))
 assert.ok(!scoped.payload.carriedExemptions.some(row=>row.exemptionId===far.id),'The parent payroll event must apply the same reference redaction as the exemption event')
})
