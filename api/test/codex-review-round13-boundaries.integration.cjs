'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,seq=0
const note=v=>console.log('CR13_EVIDENCE '+JSON.stringify(v))
const employee=(branchId,extra={})=>f.repo('Employee').save({employeeCode:`R13E${++seq}`,fullName:`CR13 employee ${seq}`,branchId,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:12000,payMethod:'cash',currency:'EGP',...extra})
const actor=extra=>f.repo('User').save({email:`r13-${++seq}@codex.invalid`,displayName:`CR13 actor ${seq}`,passwordHash:'not-a-password',role:'employee',permissions:'[]',...extra})
const customInputs=v=>v.reasons.filter(x=>!x.builtin).map(({code,label,eosFactor,active})=>({code,label,eosFactor,active}))
async function type(){const code=`R13_${++seq}`,chain=await f.ok('POST','/settings/approval-chains',{code,nameAr:code,steps:[{approverRole:'administration_manager_of_requester'}]});await f.ok('POST','/settings/request-types',{code,nameAr:code,category:'employee_relations',destinationHandler:'none',customFields:[],visibleTo:{mode:'all',ids:[]},approvalChainId:chain.id});return code}
before(async()=>{f=await require('./codex-review-round13-fixture.cjs')('r13boundaries');a=await f.repo('Branch').save({name:'CR13 A',code:'R13A'});b=await f.repo('Branch').save({name:'CR13 B',code:'R13B'})})
after(async()=>{if(f)await f.close()})

test('CR13 an old proxy draft cannot reveal the new administration after the requester transfers out of scope',async()=>{
  const old=await f.ok('POST','/departments',{name:'CR13 old local administration A',branchId:a.id,unitType:'ADMINISTRATION'})
  const foreign=await f.ok('POST','/departments',{name:'CR13_PRIVATE_ADMINISTRATION_B',branchId:b.id,unitType:'ADMINISTRATION'})
  const e=await employee(a.id,{departmentId:old.id}),proxy=await actor({branchId:a.id,permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all'])})
  const code=await type(),d=await f.ok('POST','/requests',{typeCode:code,onBehalfEmployeeId:e.id,payload:{}},proxy)
  assert.equal(d.status,'DRAFT')
  const before=await f.request('POST',`/requests/${d.id}/submit`,{},proxy)
  assert.equal(before.status,400);assert.ok(JSON.stringify(before.body).includes(old.name),'Same-branch diagnostics should remain useful')
  const ctx=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`)
  const moved=await f.ok('PATCH',`/employees/${e.id}`,{branchId:b.id,departmentId:foreign.id,calendarChange:{effectiveFrom:'2026-09-27',reason:'Independent round 13 transfer',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}})
  assert.equal(moved.branchId,b.id)
  const detail=await f.ok('GET',`/requests/${d.id}`,null,proxy)
  assert.equal(detail.requester.orgHidden,true);assert.equal(detail.requester.administrationName,null)
  assert.ok(!JSON.stringify(detail).includes(foreign.name))
  const res=await f.request('POST',`/requests/${d.id}/submit`,{},proxy)
  const stored=await f.repo('Request').findOneByOrFail({id:d.id})
  assert.ok(res.status>=400);assert.equal(stored.status,'DRAFT');assert.equal(stored.resolvedSteps,null)
  note({case:'proxy-draft-after-transfer',createdInBranch:a.id,currentEmployeeBranch:b.id,proxyBranch:proxy.branchId,transferViaApi:true,detailOrgHidden:detail.requester.orgHidden,status:res.status,error:res.body,containsForeignName:JSON.stringify(res.body).includes(foreign.name)})
  assert.ok(!JSON.stringify(res.body).includes(foreign.name),'Submission errors must honor the current viewer scope, not just the requester branch')
})

test('CR13 usage counts are absent unless both company-wide scope and settings permission are present',async()=>{
  const route='/offboarding/termination-reasons',initial=await f.ok('GET',route)
  const saved=await f.ok('PUT',route,{revision:initial.revision,reasons:[...customInputs(initial),{label:'CR13 usage matrix reason',eosFactor:'1/2'}]})
  const code=saved.reasons.find(x=>x.label==='CR13 usage matrix reason').code
  for(const branch of [a,b]){const e=await employee(branch.id);await f.ok('POST','/offboarding',{employeeId:e.id,reason:code,lastWorkingDay:'2025-12-31'})}
  const matrix=[]
  for(const [label,fields,visible] of [
    ['branch settings',{branchId:a.id,permissions:JSON.stringify(['settings.manage'])},false],
    ['all enumerated branches settings',{branchId:a.id,scopeBranchIds:JSON.stringify([a.id,b.id]),permissions:JSON.stringify(['settings.manage'])},false],
    ['company offboarding reader',{scopeAllBranches:true,permissions:JSON.stringify(['offboarding.manage'])},false],
    ['empty scope settings',{permissions:JSON.stringify(['settings.manage'])},false],
    ['company settings editor',{scopeAllBranches:true,permissions:JSON.stringify(['settings.manage'])},true]
  ]){
    const user=await actor(fields),view=await f.ok('GET',route,null,user),custom=view.reasons.find(x=>x.code===code)
    assert.equal(view.canEdit,visible);assert.equal(Object.hasOwn(custom,'usedByCases'),visible)
    if(visible){assert.equal(custom.usedByCases,2);const rejected=await f.request('PUT',route,{revision:view.revision,reasons:customInputs(view).filter(x=>x.code!==code)},user);assert.equal(rejected.status,409);assert.match(rejected.body.message,/2/)}
    else assert.ok(view.reasons.every(r=>!Object.hasOwn(r,'usedByCases')))
    matrix.push({label,canEdit:view.canEdit,usagePresent:Object.hasOwn(custom,'usedByCases'),...(visible?{usage:custom.usedByCases,deleteUsedReason:409}:{})})
  }
  note({case:'usage-permission-matrix',matrix})
})
