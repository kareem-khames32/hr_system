'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,profile,n=0
const note=x=>console.log('CR16_EVIDENCE '+JSON.stringify(x))
function date(offset){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const employee=()=>f.repo('Employee').save({employeeCode:`R16E${++n}`,fullName:`CR16 employee ${n}`,branchId:a.id,joinDate:'2020-01-01',status:'active',isActive:true,basicSalary:12000,payMethod:'cash',currency:'EGP'})
const actor=()=>f.repo('User').save({email:`r16-${++n}@codex.invalid`,displayName:`CR16 actor ${n}`,passwordHash:'not-a-password',role:'employee',branchId:a.id,permissions:JSON.stringify(['requests.create_on_behalf','requests.view_all'])})
async function scope(u,fields){await f.ok('PATCH',`/users/${u.id}`,fields);return f.repo('User').findOneByOrFail({id:u.id})}
const outside=u=>scope(u,{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false,permissions:[]})
async function type(branchId,extra={}){const code=`R16_${++n}`,chain=await f.ok('POST','/settings/approval-chains',{code,nameAr:code,branchId,steps:[{approverRole:'hr'}]});return f.ok('POST','/settings/request-types',{code,nameAr:code,branchId,category:'employee_relations',destinationHandler:'none',approvalChainId:chain.id,customFields:[],visibleTo:{mode:'all',ids:[]},...extra})}
const leaveType=(extra={})=>f.ok('POST','/settings/leave-types',{code:`R16_LT_${++n}`,nameAr:`CR16_ORIGINAL_LT_${n}`,branchId:a.id,balanceType:'none',isPaid:false,countingMode:'ALL_DAYS',...extra})
const draft=(u,e,t,payload)=>f.ok('POST','/requests',{typeCode:t.code,onBehalfEmployeeId:e.id,payload},u)
const payload=(lt,from=30,to=from,extra={})=>({leaveTypeCode:lt.code,fromDate:date(from),toDate:date(to),days:to-from+1,reason:'Round 16 independent review',...extra})
async function reject(req,u,route='submit',body={}){const original=await f.repo('Request').findOneByOrFail({id:req.id}),r=await f.request('POST',`/requests/${req.id}/${route}`,body,u);assert.equal(r.status,400,JSON.stringify(r.body));assert.deepEqual(await f.repo('Request').findOneByOrFail({id:req.id}),original);return r.body.message}
before(async()=>{f=await require('./codex-review-round16-fixture.cjs')('r16boundaries');a=await f.repo('Branch').save({name:'CR16 A',code:'R16A'});b=await f.repo('Branch').save({name:'CR16 B',code:'R16B'});profile=await type(null,{category:'leaves',destinationHandler:'leave_calendar_balance',customFields:[{key:'fromDate',label:'From',type:'date',required:true},{key:'toDate',label:'To',type:'date',required:true},{key:'days',label:'Days',type:'number',required:true},{key:'period',label:'Period',type:'text',required:false}]})})
after(async()=>{if(f)await f.close()})

test('CR16 leave guards preserve each rule while hiding branch names and retaining permitted names',async()=>{
  const cases=[
    ['half',{halfDayAllowed:false},30,30,{period:'MORNING'},/نص يوم/],
    ['minimum',{minDaysPerRequest:2},30,30,{},/أقل مدة.*2/],
    ['maximum',{maxDays:2},30,32,{},/أقصى مدة.*2/],
    ['fixed',{category:'OCCASION',fixedDays:2},30,32,{},/أيامها 2/],
    ['attachment',{attachmentRule:'REQUIRED',attachmentTiming:'WITH_REQUEST',requiredAttachment:'مستند داعم'},30,30,{},/لازم ترفع/],
    ['backdate-denied',{backdateAllowed:false},-3,-3,{},/أثر رجعي/],
    ['backdate-limit',{backdateAllowed:true,backdateMaxDays:5},-10,-10,{},/لحد 5 يوم/],
    ['notice',{noticeDays:40},1,1,{},/قبلها بـ40/]
  ],evidence=[]
  for(const [key,config,from,to,extra,expected] of cases){
    const lt=await leaveType(config),e=await employee(),u=await actor(),req=await draft(u,e,profile,payload(lt,from,to,extra))
    let viewer=await outside(u);const name=`CR16_PRIVATE_${key}`
    await f.ok('PATCH',`/settings/leave-types/${lt.id}`,{nameAr:name})
    const original=await f.repo('LeaveType').findOneByOrFail({id:lt.id})
    const states=[]
    for(const [label,fields,visible] of [
      ['outside',{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false},false],
      ['empty',{branchId:null,scopeBranchIds:[],scopeAllBranches:false},false],
      ['local',{branchId:a.id,scopeBranchIds:[],scopeAllBranches:false},true],
      ['multi',{branchId:b.id,scopeBranchIds:[a.id,b.id],scopeAllBranches:false},true],
      ['company',{scopeAllBranches:true},true]
    ]){viewer=await scope(u,fields);const message=await reject(req,viewer);assert.match(message,expected);assert.equal(message.includes(name),visible,message);if(!visible)assert.ok(message.includes('نوع الإجازة ده'));states.push({scope:label,nameVisible:visible,message})}
    assert.deepEqual(await f.repo('LeaveType').findOneByOrFail({id:lt.id}),original,'Display redaction cannot mutate the stored definition')
    assert.equal(await f.repo('Leave').countBy({employeeId:e.id}),0)
    evidence.push({rule:key,states,definitionUnchanged:true})
  }
  // A company-wide leave type must keep its name even for an empty viewer scope.
  const global=await leaveType({branchId:null,halfDayAllowed:false}),e=await employee(),u=await actor(),req=await draft(u,e,profile,payload(global,30,30,{period:'MORNING'}))
  const viewer=await scope(u,{branchId:null,scopeBranchIds:[],permissions:[]}),message=await reject(req,viewer)
  assert.ok(message.includes(global.nameAr));assert.match(message,/نص يوم/)
  note({case:'leave-guard-scope-matrix',branchComparisons:40,globalNameVisible:true,evidence})
})

test('CR16 once-per-service and occasion quota redact names while retaining previously granted leave',async()=>{
  const evidence=[]
  for(const [key,config,pattern] of [['once',{oncePerService:true},/مرة واحدة طوال الخدمة/],['quota',{category:'OCCASION',maxTimesPerYear:1},/مسموحة 1 مرة/]]){
    const lt=await leaveType(config),e=await employee(),u=await actor()
    const first=await draft(u,e,profile,payload(lt,30)),second=await draft(u,e,profile,payload(lt,34))
    assert.equal((await f.ok('POST',`/requests/${first.id}/submit`,{},u)).status,'UNDER_REVIEW')
    assert.equal((await f.ok('POST',`/requests/${first.id}/act`,{action:'APPROVE'})).status,'COMPLETED')
    const prior=await f.repo('Leave').findOneByOrFail({requestId:first.id}),viewer=await outside(u),name=`CR16_PRIVATE_${key}`
    await f.ok('PATCH',`/settings/leave-types/${lt.id}`,{nameAr:name})
    const message=await reject(second,viewer);assert.match(message,pattern);assert.ok(message.includes('نوع الإجازة ده'));assert.ok(!message.includes(name))
    assert.equal(await f.repo('Leave').countBy({employeeId:e.id}),1);assert.deepEqual(await f.repo('Leave').findOneByOrFail({id:prior.id}),prior)
    evidence.push({rule:key,message,leaves:1,originalLeaveUnchanged:true})
  }
  note({case:'single-use-and-quota',evidence})
})

test('CR16 valid three-day unpaid leave still completes once after the proxy loses branch scope',async()=>{
  const lt=await leaveType({minDaysPerRequest:2,maxDays:3}),e=await employee(),u=await actor(),req=await draft(u,e,profile,payload(lt,40,42)),viewer=await outside(u)
  const name='CR16_PRIVATE_SUCCESS_LT';await f.ok('PATCH',`/settings/leave-types/${lt.id}`,{nameAr:name})
  const submitted=await f.ok('POST',`/requests/${req.id}/submit`,{},viewer);assert.equal(submitted.status,'UNDER_REVIEW');assert.equal(JSON.parse(submitted.payload).days,3)
  const done=await f.ok('POST',`/requests/${req.id}/act`,{action:'APPROVE'});assert.equal(done.status,'COMPLETED')
  const leave=await f.repo('Leave').findOneByOrFail({requestId:req.id});assert.equal(Number(leave.days),3);assert.equal(leave.isUnpaid,true);assert.equal(leave.leaveTypeCode,lt.code)
  assert.equal((await f.request('POST',`/requests/${req.id}/act`,{action:'APPROVE'})).status,400)
  assert.equal(await f.repo('Leave').countBy({requestId:req.id}),1);assert.equal((await f.repo('LeaveType').findOneByOrFail({id:lt.id})).nameAr,name)
  note({case:'valid-leave-completion',expectedCalendarDays:3,actualDays:Number(leave.days),isUnpaid:leave.isUnpaid,status:done.status,leaves:1,repeatedApproval:400,storedDefinitionNameUnchanged:true})
})

test('CR16 historical unsupported definitions are redacted on create submit and resubmit for each viewer scope',async()=>{
  const evidence=[]
  for(const general of [false,true]){
    const t=await type(general?null:a.id),e=await employee(),u=await actor(),d=await draft(u,e,t,{}),returned=await draft(u,e,t,{})
    await f.ok('POST',`/requests/${returned.id}/submit`,{},u)
    assert.equal((await f.ok('POST',`/requests/${returned.id}/act`,{action:'RETURN',comment:'Review return'})).status,'RETURNED_FOR_INFO')
    const refused=await f.request('PATCH',`/settings/request-types/${t.id}`,{destinationHandler:'cr16_unbuilt'});assert.equal(refused.status,400)
    const name=`CR16_PRIVATE_UNSUPPORTED_${general}`
    // Reproduce a historical unsupported definition solely in the disposable database.
    await f.repo('RequestType').update(t.id,{nameAr:name,destinationHandler:'cr16_unbuilt'})
    for(const [label,fields,visible] of [
      ['outside',{branchId:b.id,scopeBranchIds:[],scopeAllBranches:false},general],
      ['empty',{branchId:null,scopeBranchIds:[],scopeAllBranches:false},general],
      ['local',{branchId:a.id,scopeBranchIds:[],scopeAllBranches:false},true],
      ['company',{scopeAllBranches:true},true]
    ]){
      const viewer=await scope(u,fields),count=await f.repo('Request').count(),creation=await f.request('POST','/requests',{typeCode:t.code,payload:{}},viewer)
      assert.equal(creation.status,400);assert.equal(await f.repo('Request').count(),count)
      const messages=[creation.body.message,await reject(d,viewer),await reject(returned,viewer,'resubmit',{payload:{reason:'Unchanged'}})]
      for(const message of messages){assert.match(message,/ليس له تنفيذ بعد الاعتماد/);assert.equal(message.includes(name),visible,message)}
      evidence.push({general,scope:label,namesVisible:visible,create:creation.status,submit:400,resubmit:400,rowsUnchanged:true})
    }
  }
  note({case:'unsupported-all-entrypoints',comparisons:24,evidence})
})
