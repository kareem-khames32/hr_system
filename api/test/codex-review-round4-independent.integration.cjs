'use strict'
// Independent adversarial probes. Real Nest guards/controllers and disposable SQL only.
const {test,before,after}=require('node:test'), assert=require('node:assert/strict')
let f, a,b,c, employee, actor, chain1,chain2,type
before(async()=>{
  f=await require('./codex-review-round4-fixture.cjs')('r4independent')
  ;[a,b,c]=await f.repo('Branch').save(['A','B','C'].map(code=>({code:'R4'+code,name:'Review '+code})))
  employee=await f.repo('Employee').save({employeeCode:'R4C',fullName:'FOREIGN REVIEW PERSON',branchId:c.id,joinDate:'2020-01-01',isActive:true,status:'active'})
  actor=await f.repo('User').save({email:'r4scope@review.invalid',displayName:'Scope A B',passwordHash:'fixture-only',role:'employee',branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id]),permissions:JSON.stringify(['requests.view_all','requests.create_on_behalf','attendance_exemption.manage','attendance_exemption.view','attendance.view_all','employees.view'])})
  ;[chain1,chain2]=await f.repo('ApprovalChain').save([1,2].map(n=>({code:'R4CHAIN'+n,nameAr:'Review chain '+n,isActive:true,autoApprove:false})))
  await f.repo('ApprovalStep').save([chain1,chain2].map(ch=>({chainId:ch.id,stepOrder:1,approverRole:'hr'})))
  type=await f.repo('RequestType').save({code:'R4_TRAIN',nameAr:'Review training',category:'training',destinationHandler:'none',approvalChainId:chain1.id,isActive:true})
},{timeout:120000})
after(async()=>{if(f)await f.close()})

test('CR4 category config PATCH cannot evade its guard with SQL case folding',async t=>{
  await f.ok('PUT','/settings/request-categories/training/chain',{chainId:chain1.id,repointTypeIds:[type.id]})
  const configOnly=await f.repo('User').save({email:'r4config@review.invalid',displayName:'Configuration only',passwordHash:'fixture-only',role:'employee',scopeAllBranches:true,permissions:JSON.stringify(['settings.manage'])})
  const canonical=await f.request('PATCH','/settings/config',{key:'requests.category_chain.training',value:String(chain2.id)},configOnly)
  assert.equal(canonical.status,400)
  const direct=await f.request('PUT','/settings/request-categories/training/chain',{chainId:chain2.id},configOnly)
  assert.equal(direct.status,403)
  const upper=await f.request('PATCH','/settings/config',{key:'REQUESTS.CATEGORY_CHAIN.TRAINING',value:String(chain2.id)},configOnly)
  const saved=await f.repo('RequestsConfig').findOneByOrFail({key:'requests.category_chain.training'})
  const linked=await f.repo('RequestType').findOneByOrFail({id:type.id})
  t.diagnostic(JSON.stringify({probe:'category-case-folding',canonicalStatus:canonical.status,directStatus:direct.status,uppercaseStatus:upper.status,storedCategoryChain:Number(saved.value),typeChain:linked.approvalChainId,expectedChain:chain1.id}))
  await f.setting('requests.category_chain.training',chain1.id)
  assert.ok(upper.status>=400,'Uppercase key bypassed category-chain endpoint and permissions')
})

test('CR4 outside request and nonexistent request must not reveal existence',async t=>{
  const req=await f.repo('Request').save({typeCode:type.code,definitionCode:type.code,requesterId:employee.id,branchId:c.id,status:'DRAFT',payload:'{}',createdByUserId:f.admin.id})
  const foreign=await f.request('GET','/requests/'+req.id,null,actor)
  const missing=await f.request('GET','/requests/2147483640',null,actor)
  t.diagnostic(JSON.stringify({probe:'request-existence',foreign:foreign.status,missing:missing.status,foreignBody:foreign.body,missingBody:missing.body}))
  assert.ok(!String(foreign.body?.message).includes('Cannot POST'))
  assert.deepEqual(foreign,missing)
})

test('CR4 outside exemption target and missing target must not reveal existence',async t=>{
  const body={employeeId:employee.id,effectiveFrom:'2027-01-01',effectiveTo:'2027-01-02',reasonCode:'other',reason:'Independent scope rejection',requiresCheckinForPresence:false}
  const foreign=await f.request('POST','/attendance-exemptions',body,actor)
  const missing=await f.request('POST','/attendance-exemptions',{...body,employeeId:2147483640},actor)
  t.diagnostic(JSON.stringify({probe:'exemption-existence',foreign:foreign.status,missing:missing.status,foreignBody:foreign.body,missingBody:missing.body}))
  assert.deepEqual(foreign,missing)
})

test('CR4 payroll separation licence cannot evade its specific permission by SQL case folding',async t=>{
  const {PAYROLL_SELF_APPROVAL_KEY}=require('../src/payroll/payroll-run-approval')
  await f.setting(PAYROLL_SELF_APPROVAL_KEY,'false')
  const configOnly=await f.repo('User').findOneByOrFail({email:'r4config@review.invalid'})
  const normal=await f.request('PATCH','/settings/config',{key:PAYROLL_SELF_APPROVAL_KEY,value:'true'},configOnly)
  assert.equal(normal.status,403)
  const upper=await f.request('PATCH','/settings/config',{key:PAYROLL_SELF_APPROVAL_KEY.toUpperCase(),value:'true'},configOnly)
  const stored=await f.repo('RequestsConfig').findOneByOrFail({key:PAYROLL_SELF_APPROVAL_KEY})
  t.diagnostic(JSON.stringify({probe:'payroll-licence-case-folding',normalStatus:normal.status,uppercaseStatus:upper.status,storedValue:stored.value,actorHasLicence:false}))
  await f.setting(PAYROLL_SELF_APPROVAL_KEY,'false')
  assert.equal(upper.status,403)
})

test('CR4 archived employee without an offboarding case is not absent in either attendance view',async t=>{
  const e=await f.repo('Employee').save({employeeCode:'R4_ARCH',fullName:'Review archived',branchId:a.id,joinDate:'2020-01-01',archivedAt:new Date('2026-09-10T12:00:00'),isActive:false,status:'archived'})
  await f.repo('AttendanceDay').save({employeeId:e.id,branchId:a.id,date:'2026-09-15',status:'absent',shiftName:'Review shift',shiftStart:'08:00',shiftEnd:'16:00',workMinutes:0,lateMinutes:0,earlyLeaveMinutes:0})
  const daily=await f.ok('GET','/attendance/daily?date=2026-09-15')
  const report=await f.ok('GET','/reports/attendance?from=2026-09-15&to=2026-09-15')
  const dailyRow=daily.find(r=>r.employeeId===e.id),reportRow=report.find(r=>r.employeeId===e.id)
  t.diagnostic(JSON.stringify({probe:'archive-fallback-report',dailyAbsent:dailyRow?.status==='absent',reportAbsentDays:Number(reportRow?.absentDays||0),expected:0}))
  assert.equal(dailyRow,undefined)
  assert.equal(Number(reportRow?.absentDays||0),0)
})

test('CR4 HR permission grants one financial effect for another employee, never own request or outside scope',async t=>{
  const people=await f.repo('Employee').save([a,b].map((branch,n)=>({employeeCode:'R4HR'+n,fullName:'Review HR '+n,branchId:branch.id,joinDate:'2020-01-01',isActive:true,status:'active'})))
  const hr=await f.repo('User').save({email:'r4hr@review.invalid',displayName:'HR permission holder',passwordHash:'fixture-only',role:'employee',branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id]),employeeId:people[0].id,permissions:JSON.stringify(['approve.hr','requests.create_on_behalf','requests.view_all'])})
  const desk=await f.repo('User').save({email:'r4desk@review.invalid',displayName:'Request clerk',passwordHash:'fixture-only',role:'employee',branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id]),permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all'])})
  const financial=await f.repo('RequestType').save({code:'R4_CREDIT',nameAr:'Review financial credit',category:'financial',destinationHandler:'payroll_allowance',approvalChainId:chain1.id,isActive:true,requiredFields:JSON.stringify(['amount','description']),visibleTo:JSON.stringify({mode:'all',ids:[]})})
  const body={typeCode:financial.code,onBehalfEmployeeId:people[1].id,submit:true,payload:{amount:'123.45',description:'Review exactly once'}}
  const made=await f.ok('POST','/requests',body,hr)
  assert.equal(made.status,'COMPLETED')
  const ledger=await f.repo('EmployeeObligation').findBy({employeeId:people[1].id})
  assert.equal(ledger.length,1);assert.equal(Number(ledger[0].amount),123.45);assert.equal(ledger[0].type,'CREDIT')
  const retries=await Promise.all([1,2].map(()=>f.request('POST',`/requests/${made.id}/submit`,{},hr)))
  assert.ok(retries.every(r=>r.status>=400));assert.equal(await f.repo('EmployeeObligation').countBy({employeeId:people[1].id}),1)
  const own=await f.ok('POST','/requests',{...body,onBehalfEmployeeId:people[0].id},hr)
  assert.equal(own.status,'UNDER_REVIEW')
  const normal=await f.ok('POST','/requests',body,desk);assert.equal(normal.status,'UNDER_REVIEW')
  const outside=await f.request('POST','/requests',{...body,onBehalfEmployeeId:employee.id},hr);assert.equal(outside.status,403)
  const decisions=await f.repo('RequestApproval').findBy({requestId:made.id})
  assert.equal(decisions.length,1);assert.equal(decisions[0].approverId,hr.id)
  t.diagnostic(JSON.stringify({probe:'HR-financial-once',manualAmount:123.45,actualAmount:Number(ledger[0].amount),obligations:1,retryStatuses:retries.map(r=>r.status),ownStatus:own.status,clerkStatus:normal.status,outsideStatus:outside.status}))
})

test('CR4 exemption subject cannot approve or reject an exemption created by someone else',async t=>{
  const person=await f.repo('Employee').save({employeeCode:'R4SOD',fullName:'Review exemption subject',branchId:a.id,joinDate:'2020-01-01',isActive:true,status:'active'})
  const subject=await f.repo('User').save({email:'r4sod@review.invalid',displayName:'Exemption subject',passwordHash:'fixture-only',role:'hr_manager',branchId:a.id,employeeId:person.id,permissions:JSON.stringify(['attendance_exemption.approve','attendance_exemption.approve_executive','attendance_exemption.view'])})
  const row=await f.repo('AttendanceExemption').save({employeeId:person.id,effectiveFrom:'2027-01-01',effectiveTo:'2027-01-05',reasonCode:'other',reason:'Review separation',status:'PENDING',createdByUserId:actor.id})
  for(const action of ['approve','reject']){
    const result=await f.request('POST',`/attendance-exemptions/${row.id}/${action}`,{reason:'Review self decision prohibited'},subject)
    assert.equal(result.status,403);assert.equal(result.body.code,'EXEMPT-SOD-SELF')
  }
  assert.equal((await f.repo('AttendanceExemption').findOneByOrFail({id:row.id})).status,'PENDING')
  t.diagnostic(JSON.stringify({probe:'exemption-subject-SOD',approve:403,reject:403,state:'PENDING'}))
})
