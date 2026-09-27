'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,executive,dep,worker,owner,reader,ceo,ceoUser,typeCode,seq=0
const note=v=>console.log('CR12_EVIDENCE '+JSON.stringify(v))
const employee=(name,branchId,extra={})=>f.repo('Employee').save({employeeCode:`R12B${++seq}`,fullName:name,branchId,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:12000,payMethod:'cash',currency:'EGP',...extra})
const user=(e,extra={})=>f.repo('User').save({email:`r12b-${e.id}@codex.invalid`,displayName:e.fullName,passwordHash:'not-a-password',role:'employee',branchId:e.branchId,employeeId:e.id,permissions:'[]',...extra})
const draft=()=>f.ok('POST','/requests',{typeCode,payload:{}},owner)
before(async()=>{
  f=await require('./codex-review-round12-fixture.cjs')('r12boundaries')
  a=await f.repo('Branch').save({name:'CR12 A',code:'R12A'});b=await f.repo('Branch').save({name:'CR12 B',code:'R12B'})
  executive=await f.ok('POST','/departments',{name:'CR12_PRIVATE_EXECUTIVE_A',branchId:a.id,isExecutive:true})
  dep=await f.ok('POST','/departments',{name:'CR12 public department B',branchId:b.id,parentId:executive.id})
  worker=await employee('CR12 requester B',b.id,{departmentId:dep.id});owner=await user(worker)
  reader=await user(await employee('CR12 branch B reader',b.id),{permissions:JSON.stringify(['offboarding.manage','requests.view_all','org.manage'])})
  ceo=await employee('CR12 CEO A',a.id);ceoUser=await user(ceo)
  const c=await f.ok('POST','/settings/approval-chains',{code:'R12_ADM',nameAr:'CR12 administration approval',steps:[{approverRole:'administration_manager_of_requester'}]})
  typeCode='R12_ADM';await f.ok('POST','/settings/request-types',{code:typeCode,nameAr:'CR12 administration request',category:'employee_relations',destinationHandler:'none',approvalChainId:c.id,customFields:[],visibleTo:{mode:'all',ids:[]}})
})
after(async()=>{if(f)await f.close()})

test('CR12 missing foreign executive manager must not disclose its stored name in a submission error',async()=>{
  const visible=await f.ok('GET','/departments',null,reader)
  assert.ok(!JSON.stringify(visible).includes(executive.name))
  const d=await draft(),r=await f.request('POST',`/requests/${d.id}/submit`,{},owner)
  assert.equal(r.status,400);assert.equal((await f.repo('Request').findOneByOrFail({id:d.id})).status,'DRAFT')
  note({case:'foreign-administration-error',listHidesName:true,status:r.status,error:r.body,containsForeignName:JSON.stringify(r.body).includes(executive.name)})
  assert.ok(!JSON.stringify(r.body).includes(executive.name),'A branch B requester must not learn the stored name of a hidden administration in A through validation')
})

test('CR12 reason catalog must not reveal usage by offboarding cases outside the readers branch',async()=>{
  const route='/offboarding/termination-reasons',initial=await f.ok('GET',route)
  const saved=await f.ok('PUT',route,{revision:initial.revision,reasons:[...initial.reasons.filter(x=>!x.builtin),{label:'CR12 scoped usage',eosFactor:'1/3'}]})
  const code=saved.reasons.find(x=>x.label==='CR12 scoped usage').code
  const before=(await f.ok('GET',route,null,reader)).reasons.find(x=>x.code===code)
  const foreign=await employee('CR12 offboarding employee A',a.id)
  const kase=await f.ok('POST','/offboarding',{employeeId:foreign.id,reason:code,lastWorkingDay:'2025-12-31'})
  const direct=await f.request('GET',`/offboarding/${kase.id}`,null,reader)
  const listed=await f.ok('GET','/offboarding',null,reader),afterView=(await f.ok('GET',route,null,reader)).reasons.find(x=>x.code===code)
  assert.equal(direct.status,404);assert.equal(listed.length,0)
  note({case:'foreign-case-usage',before:before.usedByCases,after:afterView.usedByCases,visibleCases:listed.length,foreignDetail:direct.status,canEdit:(await f.ok('GET',route,null,reader)).canEdit})
  assert.equal(afterView.usedByCases,before.usedByCases,'A hidden branch A case must not change the branch B catalog usage count')
})

test('CR12 cross-branch administration approver needs the request branch in scope; authorization remains intact',async()=>{
  await f.ok('PATCH',`/departments/${executive.id}`,{managerEmployeeId:ceo.id})
  const d=await draft(),submitted=await f.ok('POST',`/requests/${d.id}/submit`,{},owner)
  assert.deepEqual(JSON.parse((await f.repo('Request').findOneByOrFail({id:d.id})).resolvedSteps).map(x=>x.approverEmployeeId),[ceo.id])
  const inbox=await f.ok('GET','/requests/inbox',null,ceoUser)
  assert.ok(!inbox.some(x=>x.id===d.id))
  assert.equal((await f.request('POST',`/requests/${d.id}/act`,{action:'APPROVE'},ceoUser)).status,403)
  const card=await f.ok('GET',`/requests/${d.id}`,null,reader)
  assert.equal(card.requester.administrationName,'الإدارة التنفيذية');assert.ok(!JSON.stringify(card).includes(executive.name))
  await f.repo('User').update({id:ceoUser.id},{scopeAllBranches:true});ceoUser.scopeAllBranches=true
  const end=await f.ok('POST',`/requests/${d.id}/act`,{action:'APPROVE'},ceoUser);assert.equal(end.status,'COMPLETED')
  assert.equal(await f.repo('RequestApproval').countBy({requestId:d.id,action:'APPROVED'}),1)
  note({case:'cross-branch-approver',submissionStatus:submitted.status,limitedApproverBlocked:true,cardUsesGenericName:true,companyScopeFinalStatus:end.status})
})

test('CR12 moving a requester out of scope hides administrationName as well as the other current organization fields',async()=>{
  const d=await draft();await f.ok('POST',`/requests/${d.id}/submit`,{},owner)
  await f.repo('Employee').update({id:worker.id},{branchId:a.id,departmentId:executive.id})
  try {
    const detail=await f.ok('GET',`/requests/${d.id}`,null,reader)
    assert.equal(detail.requester.orgHidden,true)
    for(const key of ['administrationName','departmentName','branchName','teamName','jobTitle','directManagerName'])assert.equal(detail.requester[key],null,key)
    assert.ok(!JSON.stringify(detail).includes(executive.name));note({case:'transferred-requester-card',orgHidden:true,allOrganizationFieldsNull:true})
  }finally{await f.repo('Employee').update({id:worker.id},{branchId:b.id,departmentId:dep.id})}
})
