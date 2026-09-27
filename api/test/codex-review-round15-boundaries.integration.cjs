'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,n=0
const note=value=>console.log('CR15_EVIDENCE '+JSON.stringify(value))
const employee=(branchId,extra={})=>f.repo('Employee').save({employeeCode:`R15E${++n}`,fullName:`CR15 employee ${n}`,branchId,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:12000,payMethod:'cash',currency:'EGP',...extra})
const actor=extra=>f.repo('User').save({email:`r15-${++n}@codex.invalid`,displayName:`CR15 actor ${n}`,passwordHash:'not-a-password',role:'employee',branchId:a.id,permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all','approval_chains.manage']),...extra})
async function type(branchId,steps=[],extra={}){const code=`R15_${++n}`,chain=await f.ok('POST','/settings/approval-chains',{code,nameAr:`CR15_CHAIN_${n}`,branchId,steps});const t=await f.ok('POST','/settings/request-types',{code,nameAr:`CR15_TYPE_${n}`,branchId,category:'employee_relations',destinationHandler:'none',customFields:[],visibleTo:{mode:'all',ids:[]},approvalChainId:chain.id,...extra});return {...t,chain}}
async function scope(user,fields){await f.ok('PATCH',`/users/${user.id}`,fields);return f.repo('User').findOneByOrFail({id:user.id})}
const foreign=user=>scope(user,{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false})
const draft=(u,e,t,payload={})=>f.ok('POST','/requests',{typeCode:t.code,onBehalfEmployeeId:e.id,payload},u)
async function rejected(req,user,route='submit',body={}){const before=await f.repo('Request').findOneByOrFail({id:req.id}),r=await f.request('POST',`/requests/${req.id}/${route}`,body,user);assert.equal(r.status,400,JSON.stringify(r.body));const after=await f.repo('Request').findOneByOrFail({id:req.id});assert.deepEqual(after,before,'Rejected request must not change state, payload, steps or timestamps');return r.body.message}
before(async()=>{f=await require('./codex-review-round15-fixture.cjs')('r15boundaries');a=await f.repo('Branch').save({name:'CR15 A',code:'R15A'});b=await f.repo('Branch').save({name:'CR15 B',code:'R15B'})})
after(async()=>{if(f)await f.close()})

test('CR15 inactive empty and missing chains honor viewer scope and preserve general names',async()=>{
  const matrix=[]
  for(const state of ['inactive','empty','missing'])for(const publicDefinition of [false,true]){
    const e=await employee(a.id),u=await actor(),t=await type(publicDefinition?null:a.id),req=await draft(u,e,t)
    if(state==='inactive')await f.ok('PATCH',`/settings/approval-chains/${t.chain.id}`,{isActive:false})
    // Historical unlinked definition: current settings API correctly requires a chain.
    if(state==='missing')await f.repo('RequestType').update(t.id,{approvalChainId:null})
    for(const [label,fields,scoped] of [
      ['outside',{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false},false],
      ['empty',{branchId:null,scopeBranchIds:[],scopeAllBranches:false},false],
      ['local',{branchId:a.id,scopeBranchIds:[],scopeAllBranches:false},true],
      ['multi',{branchId:b.id,scopeBranchIds:[a.id,b.id],scopeAllBranches:false},true],
      ['company',{scopeAllBranches:true},true]
    ]){
      const viewer=await scope(u,fields),message=await rejected(req,viewer),visible=publicDefinition||scoped
      assert.equal(message.includes(t.nameAr),visible,message)
      if(state!=='missing')assert.equal(message.includes(t.chain.nameAr),visible,message)
      if(!visible){assert.match(message,/نوع الطلب ده/);if(state!=='missing')assert.match(message,/سلسلة الفرع بتاعته/)}
      matrix.push({state,publicDefinition,scope:label,namesVisible:visible,message})
    }
  }
  note({case:'chain-scope-matrix',checks:matrix.length,matrix})
})

test('CR15 undeclared fields redact branch type on submit and resubmit without saving the rejected payload',async()=>{
  const e=await employee(a.id),u=await actor(),t=await type(a.id,[{approverRole:'hr'}],{customFields:[{key:'obsolete',label:'Old optional field',type:'text',required:false}]})
  const req=await draft(u,e,t,{obsolete:'old value'}),returned=await draft(u,e,t)
  await f.ok('POST',`/requests/${returned.id}/submit`,{},u)
  const decision=await f.ok('POST',`/requests/${returned.id}/act`,{action:'RETURN',comment:'Independent review asks for information'})
  assert.equal(decision.status,'RETURNED_FOR_INFO')
  const viewer=await foreign(u),name='CR15_PRIVATE_RENAMED_REQUEST_TYPE_A'
  await f.ok('PATCH',`/settings/request-types/${t.id}`,{nameAr:name,customFields:[]})
  const catalog=await f.ok('GET','/requests/types',null,viewer);assert.ok(!JSON.stringify(catalog).includes(name))
  const submission=await rejected(req,viewer),resubmission=await rejected(returned,viewer,'resubmit',{payload:{intruder:'must not persist'}})
  for(const message of [submission,resubmission]){assert.match(message,/حقول غير معرّفة لنوع الطلب ده/);assert.ok(!message.includes(name))}
  const restored=await scope(u,{branchId:a.id}),local=await rejected(req,restored)
  assert.ok(local.includes(name));assert.match(local,/obsolete/)
  const count=await f.repo('Request').countBy({createdByUserId:u.id})
  const creation=await f.request('POST','/requests',{typeCode:t.code,onBehalfEmployeeId:e.id,payload:{intruder:'must not persist'}},restored)
  assert.equal(creation.status,400);assert.ok(creation.body.message.includes(name));assert.equal(await f.repo('Request').countBy({createdByUserId:u.id}),count)
  const fixed=await f.ok('POST',`/requests/${returned.id}/resubmit`,{payload:{reason:'Information completed'}},restored)
  assert.equal(fixed.status,'UNDER_REVIEW')
  const done=await f.ok('POST',`/requests/${returned.id}/act`,{action:'APPROVE'})
  assert.equal(done.status,'COMPLETED')
  note({case:'payload-rejection-and-recovery',submission,resubmission,creation:creation.body.message,rejectedStatesPreserved:true,validResubmission:fixed.status,final:done.status})
})

test('CR15 leave date and duration rules cannot disclose a newly renamed foreign type through an old proxy draft',async()=>{
  const code=`R15_LEAVE_${++n}`,lt=await f.ok('POST','/settings/leave-types',{code,nameAr:'CR15 old local leave',branchId:a.id,balanceType:'none',isPaid:false,halfDayAllowed:false,minDaysPerRequest:2})
  assert.equal(lt.halfDayAllowed,false);assert.equal(Number(lt.minDaysPerRequest),2)
  const fields=[{key:'fromDate',label:'From',type:'date',required:true},{key:'toDate',label:'To',type:'date',required:true},{key:'days',label:'Days',type:'number',required:true},{key:'period',label:'Period',type:'text',required:false}]
  const t=await type(null,[{approverRole:'hr'}],{category:'leaves',destinationHandler:'leave_calendar_balance',customFields:fields}),e=await employee(a.id),u=await actor()
  const payload={leaveTypeCode:code,fromDate:'2026-10-01',toDate:'2026-10-01',days:1,reason:'Review old proxy draft'}
  const half=await draft(u,e,t,{...payload,period:'MORNING'}),full=await draft(u,e,t,payload),viewer=await foreign(u)
  const name='CR15_PRIVATE_RENAMED_LEAVE_A'
  await f.ok('PATCH',`/settings/leave-types/${lt.id}`,{nameAr:name})
  const catalog=await f.ok('GET','/requests/leave-types',null,viewer);assert.ok(!JSON.stringify(catalog).includes(name))
  const halfMessage=await rejected(half,viewer),fullMessage=await rejected(full,viewer)
  assert.match(halfMessage,/نص يوم/);assert.match(fullMessage,/أقل مدة/)
  assert.equal(await f.repo('Leave').countBy({employeeId:e.id}),0)
  note({case:'leave-rules-foreign-name',catalogHidesName:true,scopeChangedViaApi:true,renamedAfterScopeChange:true,half:{status:400,message:halfMessage},duration:{status:400,message:fullMessage},requestsUnchanged:true,leavesCreated:0})
  assert.ok(!halfMessage.includes(name)&&!fullMessage.includes(name),'Leave rule errors must not disclose a current hidden branch definition name')
})

test('CR15 unsupported historical definition must not reveal its private name before branch authorization',async()=>{
  const t=await type(a.id),u=await actor({branchId:b.id,permissions:'[]'}),name='CR15_PRIVATE_LEGACY_UNSUPPORTED_A'
  const refusedEdit=await f.request('PATCH',`/settings/request-types/${t.id}`,{destinationHandler:'cr15_unbuilt_handler'})
  assert.equal(refusedEdit.status,400)
  // Only the disposable database is seeded with a historical active unsupported definition.
  await f.repo('RequestType').update(t.id,{nameAr:name,destinationHandler:'cr15_unbuilt_handler'})
  const activate=await f.request('PATCH',`/settings/request-types/${t.id}`,{isActive:true});assert.equal(activate.status,400)
  const catalog=await f.ok('GET','/requests/types',null,u);assert.ok(!JSON.stringify(catalog).includes(name))
  const count=await f.repo('Request').count()
  const result=await f.request('POST','/requests',{typeCode:t.code,payload:{},submit:true},u)
  assert.equal(result.status,400);assert.equal(await f.repo('Request').count(),count)
  note({case:'legacy-unsupported-definition',requiresSeededLegacyDefinition:true,normalChangeBlocked:refusedEdit.status,activationBlocked:activate.status,catalogHidesName:true,status:result.status,error:result.body,requestsCreated:0})
  assert.ok(!JSON.stringify(result.body).includes(name),'The unsupported-destination error precedes branch checks and must not reveal the type name')
})
