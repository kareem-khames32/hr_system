'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,c,employee,self,proxy,legacy,ab,ac,all,foreign,empty,viewer,requests={},seq=0
const privateValues=['R6 PRIVATE JOB','R6 PRIVATE DEPARTMENT','R6 PRIVATE TEAM','R6 PRIVATE MANAGER']
const actor=extra=>f.repo('User').save({email:`r6-${++seq}@review.invalid`,displayName:'Review account '+seq,role:'employee',passwordHash:'fixture-only',permissions:JSON.stringify(['approve.hr','requests.view_all','employees.view','reports.view']),...extra})
const noCurrentOrganization=value=>{const text=JSON.stringify(value);for(const secret of privateValues)assert.ok(!text.includes(secret),'Current organization leaked: '+secret)}
before(async()=>{
  f=await require('./codex-review-round6-fixture.cjs')('r6requests')
  ;[a,b,c]=await f.repo('Branch').save(['A','B','C'].map(code=>({code:'R6'+code,name:'Review '+code})))
  employee=await f.repo('Employee').save({employeeCode:'R6EMP',fullName:'Review transferred person',jobTitle:'Original review title',branchId:a.id,joinDate:'2020-01-01',status:'active',isActive:true})
  self=await actor({branchId:a.id,employeeId:employee.id,permissions:'[]'})
  proxy=await actor({branchId:a.id,permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all'])})
  legacy=await actor({branchId:a.id});legacy.legacyToken=true
  ab=await actor({branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id])})
  ac=await actor({branchId:a.id,scopeBranchIds:JSON.stringify([a.id,c.id])})
  all=await actor({scopeAllBranches:true})
  foreign=await actor({branchId:c.id})
  empty=await actor({})
  viewer=await actor({branchId:a.id,permissions:JSON.stringify(['requests.view_all','employees.view','reports.view'])})
  const chain=await f.repo('ApprovalChain').save({code:'R6_REVIEW_CHAIN',nameAr:'Review approval chain',isActive:true})
  await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
  const common={category:'training',destinationHandler:'none',approvalChainId:chain.id,isActive:true,visibleTo:JSON.stringify({mode:'all',ids:[]})}
  const normal=await f.repo('RequestType').save({...common,code:'R6_NOTE',nameAr:'Review note'})
  const confidential=await f.repo('RequestType').save({...common,code:'R6_SECRET',nameAr:'Review confidential note',isConfidential:true})
  const credit=await f.repo('RequestType').save({...common,code:'R6_CREDIT',nameAr:'Review credit',category:'financial',destinationHandler:'payroll_allowance',requiredFields:JSON.stringify(['amount','description'])})
  for(const label of ['approve','reject','return'])requests[label]=await f.ok('POST','/requests',{typeCode:normal.code,submit:true,payload:{reason:'Review '+label}},self)
  requests.secret=await f.ok('POST','/requests',{typeCode:confidential.code,submit:true,payload:{reason:'Review confidential payload'}},self)
  requests.proxy=await f.ok('POST','/requests',{typeCode:normal.code,onBehalfEmployeeId:employee.id,submit:true,payload:{reason:'Review proxy'}},proxy)
  requests.credit=await f.ok('POST','/requests',{typeCode:credit.code,submit:true,payload:{amount:'123.45',description:'Review exactly once after transfer'}},self)
  for(const req of Object.values(requests))assert.equal(req.status,'UNDER_REVIEW')
  const department=await f.repo('Department').save({name:privateValues[1],branchId:c.id})
  const team=await f.repo('Team').save({name:privateValues[2],departmentId:department.id})
  const manager=await f.repo('Employee').save({employeeCode:'R6MANAGER',fullName:privateValues[3],branchId:c.id,joinDate:'2020-01-01',isActive:true,status:'active'})
  const ctx=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employee.id}`)
  const moved=await f.ok('PATCH',`/employees/${employee.id}`,{branchId:c.id,jobTitle:privateValues[0],departmentId:department.id,teamId:team.id,managerEmployeeId:manager.id,
    calendarChange:{effectiveFrom:'2026-09-26',reason:'Independent sixth review transfer',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}})
  assert.equal(moved.branchId,c.id)
  self=await f.repo('User').findOneByOrFail({id:self.id})
},{timeout:120000})
after(async()=>{if(f)await f.close()})

test('CR6 inbox scope matrix hides only current foreign organization and retains all pending requests',async t=>{
  const evidence=[]
  for(const [label,user,visible,canSeeRequests] of [['legacy A',legacy,false,true],['A+B',ab,false,true],['A+C',ac,true,true],['all branches',all,true,true],['super admin',f.admin,true,true],['C only',foreign,false,false],['empty scope',empty,false,false],['viewer without approval',viewer,false,false]]){
    const rows=await f.ok('GET','/requests/inbox',null,user)
    if(!canSeeRequests){assert.equal(rows.length,0);evidence.push({label,rows:0});continue}
    assert.deepEqual(rows.map(x=>x.id).sort((x,y)=>x-y),Object.values(requests).map(x=>x.id).sort((x,y)=>x-y))
    for(const row of rows){
      assert.equal(row.requesterName,employee.fullName);assert.equal(row.requesterCode,employee.employeeCode)
      if(visible)assert.equal(row.requesterJobTitle,privateValues[0])
      else{assert.equal(Object.hasOwn(row,'requesterJobTitle'),false);noCurrentOrganization(row)}
    }
    evidence.push({label,rows:rows.length,currentTitleVisible:visible})
  }
  t.diagnostic(JSON.stringify({inboxScopeMatrix:evidence,transferViaApi:true}))
})

test('CR6 all request reading routes keep transferred organization hidden from historical parties',async t=>{
  const checks=[]
  for(const user of [legacy,ab,proxy]){
    for(const route of ['/requests/all','/requests/inbox','/requests/mine?includeOnBehalf=1','/requests/my-decisions']){
      const rows=await f.ok('GET',route,null,user);noCurrentOrganization(rows);checks.push(route)
    }
    const detail=await f.ok('GET',`/requests/${requests.proxy.id}`,null,user)
    assert.equal(detail.requester.orgHidden,true)
    for(const field of ['jobTitle','departmentName','branchName','teamName','directManagerName'])assert.equal(detail.requester[field],null)
    noCurrentOrganization(detail)
  }
  const onBehalf=await f.ok('GET','/requests/mine?includeOnBehalf=1',null,proxy)
  const own=onBehalf.find(x=>x.id===requests.proxy.id);assert.ok(own);assert.equal(own.onBehalfOfName,employee.fullName)
  const historical=await f.ok('GET','/requests/all',null,legacy);assert.equal(historical.length,6)
  const currentDirectory=await f.ok('GET','/employees',null,legacy)
  assert.ok(!currentDirectory.some(x=>x.id===employee.id));noCurrentOrganization(currentDirectory)
  assert.equal((await f.request('GET',`/employees/${employee.id}`,null,legacy)).status,404)
  const report=await f.ok('GET','/reports/requests',null,legacy);noCurrentOrganization(report)
  assert.equal(report.byType.reduce((n,x)=>n+Number(x.total),0),6)
  const masked=await f.ok('GET',`/requests/${requests.secret.id}`,null,viewer)
  assert.equal(masked.requester,null);assert.equal(masked.submittedBy,null)
  const allowed=await f.ok('GET',`/requests/${requests.secret.id}`,null,legacy)
  assert.equal(allowed.requester.orgHidden,true);noCurrentOrganization(allowed)
  const selfView=await f.ok('GET',`/requests/${requests.secret.id}`,null,self)
  assert.equal(selfView.requester.jobTitle,privateValues[0]);assert.equal(selfView.requester.departmentName,privateValues[1]);assert.equal(selfView.requester.teamName,privateValues[2]);assert.equal(selfView.requester.directManagerName,privateValues[3])
  assert.equal((await f.ok('GET','/requests/mine',null,self)).length,6)
  t.diagnostic(JSON.stringify({requestListChecks:checks.length,historicalRequests:historical.length,reportTotal:6,foreignDirectoryHidden:true,confidentialNonPartyMasked:true,ownOrganizationVisible:true}))
})

test('CR6 concealment preserves approve reject return and exactly one financial effect after transfer',async t=>{
  const results=[]
  for(const [key,action,expected] of [['approve','APPROVE','COMPLETED'],['reject','REJECT','REJECTED'],['return','RETURN','RETURNED_FOR_INFO']]){
    const r=await f.ok('POST',`/requests/${requests[key].id}/act`,{action,comment:'Independent sixth review decision'},legacy)
    assert.equal(r.status,expected)
    assert.equal((await f.repo('Request').findOneByOrFail({id:requests[key].id})).status,expected)
    const trail=await f.repo('RequestApproval').findBy({requestId:requests[key].id})
    assert.equal(trail.length,1);assert.equal(trail[0].approverId,legacy.id)
    noCurrentOrganization(await f.ok('GET',`/requests/${requests[key].id}`,null,legacy))
    results.push({action,status:r.status,decisionRows:trail.length})
  }
  assert.equal(await f.repo('EmployeeObligation').countBy({employeeId:employee.id}),0)
  const r=await f.ok('POST',`/requests/${requests.credit.id}/act`,{action:'APPROVE',comment:'Independent credit approval'},legacy)
  assert.equal(r.status,'COMPLETED')
  const obligations=await f.repo('EmployeeObligation').findBy({employeeId:employee.id})
  assert.equal(obligations.length,1);assert.equal(obligations[0].type,'CREDIT');assert.equal(Number(obligations[0].amount),123.45)
  const retries=await Promise.all([1,2].map(()=>f.request('POST',`/requests/${requests.credit.id}/act`,{action:'APPROVE'},legacy)))
  assert.ok(retries.every(x=>x.status===400));assert.equal(await f.repo('EmployeeObligation').countBy({employeeId:employee.id}),1)
  const inbox=await f.ok('GET','/requests/inbox',null,legacy)
  assert.deepEqual(inbox.map(x=>x.id).sort((a,b)=>a-b),[requests.secret.id,requests.proxy.id].sort((a,b)=>a-b));noCurrentOrganization(inbox)
  const decisions=await f.ok('GET','/requests/my-decisions',null,legacy)
  assert.equal(decisions.items.length,4);noCurrentOrganization(decisions)
  t.diagnostic(JSON.stringify({decisions:results,financialExpected:123.45,financialActual:Number(obligations[0].amount),financialRows:1,retryStatuses:retries.map(x=>x.status),pendingRemaining:2,decisionHistory:4}))
})
