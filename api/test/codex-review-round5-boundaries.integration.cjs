'use strict'
const { test, before, after } = require('node:test'), assert = require('node:assert/strict')
let f, a, b, c, ab, aOnly, noView, seq = 0
const perms = ['settings.manage', 'requests.view_all', 'employees.view', 'attendance_exemption.manage', 'attendance_exemption.view', 'reports.view']
const orgFields = ['jobTitle', 'departmentName', 'branchName', 'teamName', 'directManagerName']
const change = { effectiveFrom: '2026-01-01', changeReason: 'Independent round five boundary' }
const person = extra => f.repo('Employee').save({ employeeCode: 'R5BOUND' + (++seq), fullName: 'Review person ' + seq, branchId: a.id, joinDate: '2020-01-01', isActive: true, status: 'active', ...extra })
const user = extra => f.repo('User').save({ email: `r5boundary${++seq}@review.invalid`, displayName: 'Review user ' + seq, passwordHash: 'fixture-only', role: 'employee', permissions: JSON.stringify(perms), ...extra })
before(async () => {
  f = await require('./codex-review-round5-fixture.cjs')('r5boundaries')
  ;[a,b,c] = await f.repo('Branch').save(['A','B','C'].map(code => ({code:'R5B'+code, name:'Review '+code})))
  ab = await user({branchId:a.id, scopeBranchIds:JSON.stringify([a.id,b.id])})
  aOnly = await user({branchId:a.id}); aOnly.legacyToken = true
  noView = await user({branchId:a.id,permissions:'[]'})
}, {timeout:120000})
after(async () => { if(f) await f.close() })

test('CR5 B01 canonicalization covers mixed case, trailing spaces and every later validator branch', async t => {
  const { PAYROLL_SELF_APPROVAL_KEY:key } = require('../src/payroll/payroll-run-approval')
  const configOnly = await user({scopeAllBranches:true,permissions:JSON.stringify(['settings.manage'])})
  await f.setting(key,'false')
  const aliases = s => [s,s.toUpperCase(),s+' ',s.toUpperCase()+'  ',s.replace(/[a-z]/g,(x,i)=>i%2?x.toUpperCase():x)]
  for(const spelling of aliases(key)) {
    const r=await f.request('PATCH','/settings/config',{key:spelling,value:'true'},configOnly)
    assert.equal(r.status,403); assert.equal(r.body.code,'PAYRUN-SOD-LICENCE-PERMISSION')
    assert.equal((await f.repo('RequestsConfig').findOneByOrFail({key})).value,'false')
  }
  const chain=await f.repo('ApprovalChain').save({code:'R5CATEGORYBOUND',nameAr:'Review chain',isActive:true})
  await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
  await f.ok('PUT','/settings/request-categories/training/chain',{chainId:chain.id})
  for(const spelling of aliases('requests.category_chain.training')) {
    assert.equal((await f.request('PATCH','/settings/config',{key:spelling,value:'2147483000'},configOnly)).status,400)
    assert.equal((await f.repo('RequestsConfig').findOneByOrFail({key:'requests.category_chain.training'})).value,String(chain.id))
  }
  const invalids=[['payroll.monthly_days','29'],['auth.two_factor_enabled','UNKNOWN'],['attendance.weekend_days','Fri Sat'],['attendance.grace_minutes','-1'],['attendance.flex.max_session_minutes','1441'],['attendance.device_key','short'],['overtime.multiplier_weekday','100'],['company.email','bad-email']]
  let validators=0
  for(const [canonical,value] of invalids){
    const row=await f.repo('RequestsConfig').findOneBy({key:canonical});assert.ok(row,canonical)
    for(const spelling of [canonical,canonical.toUpperCase()+' ']) {
      const r=await f.request('PATCH','/settings/config',{key:spelling,value},configOnly)
      assert.equal(r.status,400,canonical);validators++
      assert.equal((await f.repo('RequestsConfig').findOneByOrFail({key:canonical})).value,row.value)
    }
  }
  const authorised=await user({scopeAllBranches:true,permissions:JSON.stringify(['settings.manage','payroll.self_approval_licence'])})
  await f.ok('PATCH','/settings/config',{key:key.toUpperCase()+' ',value:'true'},authorised)
  assert.equal((await f.repo('RequestsConfig').findOneByOrFail({key})).value,'true')
  await f.ok('PATCH','/settings/config',{key,value:'false'},authorised)
  const ordinary=await f.ok('PATCH','/settings/config',{key:'SYSTEM.COUNTRY ',value:'eg'},configOnly)
  assert.equal(ordinary.key,'system.country');assert.equal(ordinary.value,'EG')
  for(const actor of [ab,aOnly,noView]) assert.equal((await f.request('PATCH','/settings/config',{key:'SYSTEM.COUNTRY ',value:'SA'},actor)).status,403)
  const count=await f.repo('RequestsConfig').count()
  assert.equal((await f.request('PATCH','/settings/config',{key:'r5.does.not.exist',value:'true'},configOnly)).status,404)
  assert.equal(await f.repo('RequestsConfig').count(),count)
  t.diagnostic(JSON.stringify({licenceAliases:5,categoryAliases:5,validatorRejections:validators,authorisedLicenceWorks:true,ordinaryCanonicalWrite:true,scopeWriteDenied:3}))
})

test('CR5 B02 and N02 transferred request detail preserves parties and masks all current organization fields',async t=>{
  const manager=await person({branchId:c.id,fullName:'FOREIGN MANAGER R5'})
  const dept=await f.repo('Department').save({name:'FOREIGN DEPARTMENT R5',branchId:c.id})
  const team=await f.repo('Team').save({name:'FOREIGN TEAM R5',departmentId:dept.id})
  const e=await person({jobTitle:'Original review job'})
  const self=await user({employeeId:e.id,branchId:a.id,permissions:'[]'})
  const proxy=await user({branchId:a.id,permissions:'[]'})
  const acted=await user({branchId:a.id,permissions:'[]'})
  const namedEmployee=await person({branchId:a.id})
  const named=await user({branchId:a.id,employeeId:namedEmployee.id,permissions:'[]'})
  const ac=await user({branchId:a.id,scopeBranchIds:JSON.stringify([a.id,c.id])})
  const type=await f.repo('RequestType').save({code:'R5_DETAIL',nameAr:'Review detail',category:'training',destinationHandler:'none',isActive:true})
  const req=await f.repo('Request').save({typeCode:type.code,definitionCode:type.code,requesterId:e.id,branchId:a.id,status:'UNDER_REVIEW',currentStep:1,payload:'{}',createdByUserId:proxy.id,resolvedSteps:JSON.stringify([{stepOrder:1,role:'specific_employee',approverEmployeeId:namedEmployee.id}])})
  await f.repo('RequestApproval').save({requestId:req.id,step:1,approverId:acted.id,action:'RETURNED_FOR_INFO'})
  await f.repo('Employee').update({id:e.id},{branchId:c.id,jobTitle:'FOREIGN JOB R5',departmentId:dept.id,teamId:team.id,managerEmployeeId:manager.id})
  for(const actor of [ab,aOnly,proxy,acted,named]){
    const r=await f.ok('GET',`/requests/${req.id}`,null,actor)
    assert.equal(r.requester.orgHidden,true)
    for(const field of orgFields) assert.equal(r.requester[field],null,field)
    assert.equal(r.requester.fullName,e.fullName); assert.equal(r.requester.employeeCode,e.employeeCode)
    assert.ok(!JSON.stringify(r).includes('FOREIGN '),'Current organization leaked in another detail field')
  }
  for(const actor of [self,ac,f.admin]){
    const r=await f.ok('GET',`/requests/${req.id}`,null,actor)
    assert.ok(!r.requester.orgHidden);assert.equal(r.requester.jobTitle,'FOREIGN JOB R5')
    assert.equal(r.requester.departmentName,dept.name);assert.equal(r.requester.teamName,team.name);assert.equal(r.requester.directManagerName,manager.fullName)
  }
  assert.equal((await f.request('GET',`/requests/${req.id}`,null,noView)).status,403)
  // Move the request's recorded branch solely to exercise the existing party exception outside scope.
  await f.repo('Request').update({id:req.id},{branchId:c.id})
  const missing=await f.request('GET','/requests/2147483000',null,ab)
  assert.equal(missing.status,404)
  assert.deepEqual(await f.request('GET',`/requests/${req.id}`,null,ab),missing)
  for(const actor of [self,proxy,acted,named]) assert.equal((await f.request('GET',`/requests/${req.id}`,null,actor)).status,200)
  await f.repo('Request').update({id:req.id},{branchId:a.id})
  await f.repo('RequestType').update({id:type.id},{isConfidential:true})
  const masked=await f.ok('GET',`/requests/${req.id}`,null,ab)
  assert.equal(masked.requester,null);assert.equal(masked.submittedBy,null)
  assert.ok(!JSON.stringify(masked).includes(e.fullName))
  assert.equal((await f.ok('GET',`/requests/${req.id}`,null,self)).requester.jobTitle,'FOREIGN JOB R5')
  t.diagnostic(JSON.stringify({hiddenActors:5,visibleActors:3,insideUnprivileged:403,foreignEqualsMissing:true,foreignPartyAccess:4,confidentialMasked:true}))
})

test('CR5 N01 history matrix covers global, multi-branch, legacy, deleted and forbidden definitions',async t=>{
  const matrix=[]
  for(const [kind,route,entity] of [['SHIFT','shifts','Shift'],['WORK_SCHEDULE','work-schedules','WorkSchedule']]){
    const ids=[]
    for(const branchId of [null,a.id,b.id,c.id]){
      const row=await f.ok('POST','/catalogs/'+route,{name:'R5 '+kind+' '+(++seq),startTime:'08:00',endTime:'16:00',branchId,...change})
      ids.push(row.id)
    }
    for(const [actor,expected] of [[ab,[200,200,200,404]],[aOnly,[200,200,404,404]],[f.admin,[200,200,200,200]],[noView,[403,403,403,403]]]){
      const actual=[]
      for(const id of ids)actual.push((await f.request('GET',`/attendance-rules/${kind}/${id}/history`,null,actor)).status)
      assert.deepEqual(actual,expected);matrix.push({kind,expected,actual})
    }
    await f.repo(entity).delete({id:ids[3]})
    const orphan=await f.ok('GET',`/attendance-rules/${kind}/${ids[3]}/history`)
    assert.ok(orphan.length>0)
    const deleted=await f.request('GET',`/attendance-rules/${kind}/${ids[3]}/history`,null,ab)
    const unknown=await f.request('GET',`/attendance-rules/${kind}/2147483000/history`,null,ab)
    assert.equal(deleted.status,404);assert.deepEqual(deleted,unknown)
  }
  t.diagnostic(JSON.stringify({historyMatrix:matrix,deletedCompanyOnly:true}))
})

test('CR5 N03 report uses inclusive start and end, ignores cancelled/pre-rehire cases and preserves real presence',async t=>{
  const scenarios=[
    {label:'actual-start',extra:{joinDate:'2026-09-02',actualStartDate:'2026-09-04'},ends:[],from:'2026-09-04',to:'2026-09-12',expected:9},
    {label:'open-case',extra:{joinDate:'2026-09-02'},ends:[['2026-09-07','DRAFT']],from:'2026-09-02',to:'2026-09-07',expected:6},
    {label:'cancel-prehire-archive',extra:{joinDate:'2026-09-04',archivedAt:new Date('2026-09-09T12:00:00Z'),status:'archived'},ends:[['2026-09-02','CLOSED'],['2026-09-06','CANCELLED']],from:'2026-09-04',to:'2026-09-09',expected:6},
    {label:'case-wins-over-archive',extra:{joinDate:'2026-09-02',archivedAt:new Date('2026-09-06T12:00:00Z'),status:'archived'},ends:[['2026-09-10','DRAFT']],from:'2026-09-02',to:'2026-09-10',expected:9},
    {label:'earliest-case',extra:{joinDate:'2026-09-02'},ends:[['2026-09-10','DRAFT'],['2026-09-07','CLOSED']],from:'2026-09-02',to:'2026-09-07',expected:6},
    {label:'ended-unknown',extra:{joinDate:'2026-09-02',status:'terminated',isActive:false},ends:[],from:'2026-09-02',to:'2026-09-12',expected:11}
  ]
  const evidence=[]
  for(const scenario of scenarios){
    const e=await person(scenario.extra)
    for(const [lastWorkingDay,status] of scenario.ends)await f.repo('OffboardingCase').save({employeeId:e.id,lastWorkingDay,status,terminationReason:'termination'})
    await f.repo('AttendanceDay').save(Array.from({length:12},(_,i)=>({employeeId:e.id,branchId:a.id,date:`2026-09-${String(i+1).padStart(2,'0')}`,status:'absent',shiftName:'Review shift',shiftStart:'08:00',shiftEnd:'16:00',workMinutes:0})))
    await f.repo('AttendanceDay').save({employeeId:e.id,branchId:a.id,date:'2026-09-13',status:'present',shiftName:'Review shift',shiftStart:'08:00',shiftEnd:'16:00',workMinutes:480})
    const report=await f.ok('GET','/reports/attendance?from=2026-09-01&to=2026-09-13')
    const row=report.find(x=>x.employeeId===e.id)
    assert.equal(Number(row.absentDays),scenario.expected,scenario.label);assert.equal(Number(row.presentDays),1);assert.equal(Number(row.totalWorkMinutes),480)
    const monthly=(await f.ok('GET','/reports/attendance?month=2026-09')).find(x=>x.employeeId===e.id)
    assert.deepEqual(monthly,row)
    evidence.push({label:scenario.label,expectedAbsent:scenario.expected,actualAbsent:Number(row.absentDays),presencePreserved:1})
  }
  t.diagnostic(JSON.stringify({employmentReportCases:evidence}))
})

test('CR5 N03 archive near local midnight must retain the same final day as employmentWindowOf',async t=>{
  const archivedAt=new Date('2026-09-10T22:30:00Z')
  const e=await person({archivedAt,status:'archived',isActive:false})
  const persisted=await f.repo('Employee').findOneByOrFail({id:e.id})
  const window=require('../src/attendance/attendance-employment').employmentWindowOf(persisted,[])
  await f.repo('AttendanceDay').save({employeeId:e.id,branchId:a.id,date:window.to,status:'absent',shiftName:'Review shift',shiftStart:'08:00',shiftEnd:'16:00',workMinutes:0})
  const [stored]=await f.ds.query('SELECT CONVERT(varchar(10),archivedAt,23) archivedSqlDate FROM employees WHERE id=@0',[e.id])
  const report=(await f.ok('GET',`/reports/attendance?from=${window.to}&to=${window.to}`)).find(x=>x.employeeId===e.id)
  const windowApi=(await f.ok('GET','/attendance/employment-windows')).find(x=>x.employeeId===e.id)
  t.diagnostic(JSON.stringify({probe:'archive-midnight',zone:Intl.DateTimeFormat().resolvedOptions().timeZone,instant:archivedAt.toISOString(),employmentLastDay:window.to,windowApi:windowApi.to,sqlDate:stored.archivedSqlDate,expectedAbsent:1,actualAbsent:Number(report?.absentDays||0)}))
  assert.equal(Number(report?.absentDays||0),1,'Report discarded the inclusive local archive day')
})

test('CR5 transferred employee current title must not leak through the approval inbox',async t=>{
  const e=await person({jobTitle:'OLD JOB R5'})
  const approver=await user({branchId:a.id,permissions:JSON.stringify(['approve.hr','employees.view'])})
  const self=await user({branchId:a.id,employeeId:e.id,permissions:'[]'})
  const chain=await f.repo('ApprovalChain').save({code:'R5_INBOX_CHAIN',nameAr:'Review inbox chain',isActive:true})
  await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
  const type=await f.repo('RequestType').save({code:'R5_INBOX_TYPE',nameAr:'Review inbox type',category:'training',destinationHandler:'none',approvalChainId:chain.id,isActive:true,visibleTo:JSON.stringify({mode:'all',ids:[]})})
  const req=await f.ok('POST','/requests',{typeCode:type.code,submit:true,payload:{}},self)
  assert.equal(req.status,'UNDER_REVIEW')
  assert.ok((await f.ok('GET','/requests/inbox',null,approver)).some(x=>x.id===req.id))
  const calendar=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  const moved=await f.ok('PATCH',`/employees/${e.id}`,{branchId:c.id,jobTitle:'NEW FOREIGN JOB R5',calendarChange:{effectiveFrom:'2026-09-26',reason:'Independent review branch transfer',expectedRevision:calendar.revision,expectedCurrentSourceHash:calendar.currentSourceHash}})
  assert.equal(moved.branchId,c.id)
  const direct=await f.request('GET',`/employees/${e.id}`,null,approver)
  const detail=await f.ok('GET',`/requests/${req.id}`,null,approver)
  const inbox=(await f.ok('GET','/requests/inbox',null,approver)).find(x=>x.id===req.id)
  assert.equal(direct.status,404)
  if(process.env.REVIEW_BASELINE!=='true'){assert.equal(detail.requester.orgHidden,true);assert.equal(detail.requester.jobTitle,null)}
  t.diagnostic(JSON.stringify({probe:'inbox-after-transfer',baseline:process.env.REVIEW_BASELINE==='true',employeeStatus:direct.status,detailHidden:detail.requester.orgHidden??false,detailTitle:detail.requester.jobTitle,inboxTitle:inbox?.requesterJobTitle,oldTitle:'OLD JOB R5',newTitle:'NEW FOREIGN JOB R5',transferViaApi:true}))
  assert.ok(!inbox?.requesterJobTitle||inbox.requesterJobTitle==='OLD JOB R5','Inbox disclosed current foreign title')
})
