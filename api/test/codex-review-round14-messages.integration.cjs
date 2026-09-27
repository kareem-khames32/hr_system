'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,n=0
const note=value=>console.log('CR14_EVIDENCE '+JSON.stringify(value))
const employee=(branchId,extra={})=>f.repo('Employee').save({employeeCode:`R14E${++n}`,fullName:`CR14 employee ${n}`,branchId,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:12000,payMethod:'cash',currency:'EGP',...extra})
const actor=extra=>f.repo('User').save({email:`r14-${++n}@codex.invalid`,displayName:`CR14 actor ${n}`,passwordHash:'not-a-password',role:'employee',branchId:a.id,permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all','approval_chains.manage']),...extra})
async function requestType(role){const code=`R14_${++n}`,chain=await f.ok('POST','/settings/approval-chains',{code,nameAr:code,steps:role?[{approverRole:role}]:[]});await f.ok('POST','/settings/request-types',{code,nameAr:code,category:'employee_relations',destinationHandler:'none',customFields:[],visibleTo:{mode:'all',ids:[]},approvalChainId:chain.id});return {code,chain}}
async function move(e,extra){const ctx=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`);return f.ok('PATCH',`/employees/${e.id}`,{branchId:b.id,...extra,calendarChange:{effectiveFrom:'2026-09-27',reason:'Independent review round 14',expectedRevision:ctx.revision,expectedCurrentSourceHash:ctx.currentSourceHash}})}
async function scope(user,fields){await f.ok('PATCH',`/users/${user.id}`,fields);return f.repo('User').findOneByOrFail({id:user.id})}
async function error(req,user){const r=await f.request('POST',`/requests/${req.id}/submit`,{},user);assert.equal(r.status,400,JSON.stringify(r.body));const row=await f.repo('Request').findOneByOrFail({id:req.id});assert.equal(row.status,'DRAFT');assert.equal(row.resolvedSteps,null);return r.body.message}
before(async()=>{f=await require('./codex-review-round14-fixture.cjs')('r14messages');a=await f.repo('Branch').save({name:'CR14 A',code:'R14A'});b=await f.repo('Branch').save({name:'CR14 B',code:'R14B'})})
after(async()=>{if(f)await f.close()})

test('CR14 all three administration failures obey the submitter scope after an API transfer',async()=>{
  const matrix=[]
  for(const kind of ['missing-manager','missing-administration','self-manager']){
    const unit=await f.ok('POST','/departments',{name:`CR14_PRIVATE_${kind}`,branchId:b.id,unitType:kind==='missing-administration'?'DEPARTMENT':'ADMINISTRATION'})
    const e=await employee(a.id),u=await actor(),type=await requestType('administration_manager_of_requester')
    const req=await f.ok('POST','/requests',{typeCode:type.code,onBehalfEmployeeId:e.id,payload:{}},u)
    await move(e,{departmentId:unit.id})
    if(kind==='self-manager')await f.ok('PATCH',`/departments/${unit.id}`,{managerEmployeeId:e.id})
    for(const [label,fields,visible] of [
      ['old branch',{branchId:a.id,scopeBranchIds:[],scopeAllBranches:false},false],
      ['empty scope',{branchId:null,scopeBranchIds:[],scopeAllBranches:false},false],
      ['both branches',{branchId:a.id,scopeBranchIds:[a.id,b.id],scopeAllBranches:false},true],
      ['company scope',{scopeAllBranches:true},true]
    ]){
      const viewer=await scope(u,fields),message=await error(req,viewer)
      assert.equal(message.includes(unit.name),visible,`${kind}/${label}: ${message}`)
      if(!visible)assert.ok(message.includes(kind==='missing-administration'?'قسم في فرع تاني':'إدارة في فرع تاني'))
      matrix.push({kind,scope:label,nameVisible:visible,message})
    }
  }
  note({case:'administration-message-matrix',matrix})
})

test('CR14 missing skip-level manager redacts a foreign manager and preserves local and company diagnostics',async()=>{
  const manager=await employee(b.id,{fullName:'CR14_PRIVATE_DIRECT_MANAGER_B'}),e=await employee(a.id),u=await actor(),type=await requestType('manager_of_direct_manager')
  const req=await f.ok('POST','/requests',{typeCode:type.code,onBehalfEmployeeId:e.id,payload:{}},u)
  await move(e,{managerEmployeeId:manager.id})
  const matrix=[]
  for(const [label,fields,visible] of [
    ['old branch',{branchId:a.id,scopeBranchIds:[],scopeAllBranches:false},false],
    ['empty scope',{branchId:null,scopeBranchIds:[],scopeAllBranches:false},false],
    ['manager branch',{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false},true],
    ['both branches',{branchId:a.id,scopeBranchIds:[a.id,b.id],scopeAllBranches:false},true],
    ['company scope',{scopeAllBranches:true},true]
  ]){const viewer=await scope(u,fields),message=await error(req,viewer);assert.equal(message.includes(manager.fullName),visible,message);if(!visible)assert.ok(message.includes('«المدير المباشر»'));matrix.push({scope:label,nameVisible:visible,message})}
  note({case:'skip-level-message-matrix',matrix})
})

test('CR14 a foreign leave type must not disclose its private name in a submission rejection',async()=>{
  const secret='CR14_PRIVATE_LEAVE_TYPE_B',code=`R14_FOREIGN_LEAVE_${++n}`
  const lt=await f.ok('POST','/settings/leave-types',{code,nameAr:secret,branchId:b.id,balanceType:'none'})
  assert.equal(lt.branchId,b.id)
  const profile=`R14_LEAVE_PROFILE_${++n}`
  await f.ok('POST','/settings/request-types',{code:profile,nameAr:'CR14 public leave request',category:'leaves',destinationHandler:'leave_calendar_balance',customFields:[{key:'fromDate',label:'From',type:'date',required:true},{key:'toDate',label:'To',type:'date',required:true},{key:'days',label:'Days',type:'number',required:true}],visibleTo:{mode:'all',ids:[]}})
  const e=await employee(a.id),u=await actor({employeeId:e.id,permissions:'[]'})
  const catalog=await f.ok('GET','/requests/leave-types',null,u)
  assert.ok(!JSON.stringify(catalog).includes(secret))
  const r=await f.request('POST','/requests',{typeCode:profile,payload:{leaveTypeCode:code,fromDate:'2026-10-01',toDate:'2026-10-01',days:1,reason:'Independent review'},submit:true},u)
  note({case:'foreign-leave-type-message',catalogHidesName:true,status:r.status,error:r.body,containsForeignName:JSON.stringify(r.body).includes(secret)})
  assert.equal(r.status,400);assert.match(r.body.message,/خاص بفرع تاني/);assert.ok(!JSON.stringify(r.body).includes(secret),'Foreign leave type names must remain hidden in submission errors')
})

test('CR14 an old draft cannot reveal a newly named branch approval chain after viewer scope revocation',async()=>{
  const e=await employee(a.id),u=await actor(),type=await requestType('hr')
  const req=await f.ok('POST','/requests',{typeCode:type.code,onBehalfEmployeeId:e.id,payload:{}},u)
  const viewer=await scope(u,{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false})
  const secret='CR14_PRIVATE_NEW_CHAIN_A'
  await f.ok('POST','/settings/approval-chains',{code:type.chain.code,nameAr:secret,branchId:a.id,steps:[]})
  const listed=await f.ok('GET','/settings/approval-chains',null,viewer)
  assert.ok(!JSON.stringify(listed).includes(secret))
  const message=await error(req,viewer)
  note({case:'foreign-chain-message',viewerBranch:b.id,requestBranch:a.id,listHidesName:true,status:400,message,containsForeignName:message.includes(secret)})
  assert.ok(!message.includes(secret),'A current branch-only chain name cannot leak through an old owned draft')
})
