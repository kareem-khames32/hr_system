'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,a,b,ceo,staff,leader,head,team,exec,child,foreignChild,localWorker,foreignWorker,branchUser,users={},seq=0,empSeq=0
const note=v=>console.log('CR10_EVIDENCE '+JSON.stringify(v))
const employee=(name,branchId,extra={})=>f.repo('Employee').save({employeeCode:`R10E${++empSeq}`,fullName:name,branchId,joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,currency:'EGP',payMethod:'cash',...extra})
const user=(emp,extra={})=>f.repo('User').save({email:`r10-${emp.id}@codex.invalid`,displayName:emp.fullName,passwordHash:'not-a-password',role:'employee',branchId:emp.branchId,employeeId:emp.id,permissions:'[]',...extra})
async function type(steps,confidential=false){
  const code=`R10_${++seq}`
  const c=await f.ok('POST','/settings/approval-chains',{code,nameAr:code,steps})
  await f.ok('POST','/settings/request-types',{code,nameAr:code,category:'employee_relations',destinationHandler:'none',customFields:[],approvalChainId:c.id,visibleTo:{mode:'all',ids:[]}})
  if(confidential)await f.repo('RequestType').update({code},{isConfidential:true})
  return code
}
async function submit(actor,code){const draft=await f.ok('POST','/requests',{typeCode:code,payload:{}},actor);return f.request('POST',`/requests/${draft.id}/submit`,{},actor)}
const resolved=async id=>JSON.parse((await f.repo('Request').findOneByOrFail({id})).resolvedSteps)
before(async()=>{
  f=await require('./codex-review-round10-fixture.cjs')('r10independent')
  await f.setting('attendance.weekend_days','FRI,SAT');await f.setting('system.country','EG')
  a=await f.repo('Branch').save({name:'CR10 A',code:'R10A',country:'EG',weekendDays:'FRI,SAT'})
  b=await f.repo('Branch').save({name:'CR10 B',code:'R10B',country:'EG',weekendDays:'FRI,SAT'})
  ceo=await employee('CR10 CEO',a.id)
  exec=await f.ok('POST','/departments',{name:'CR10_PRIVATE_EXECUTIVE_A',branchId:a.id,isExecutive:true,managerEmployeeId:ceo.id})
  child=await f.ok('POST','/departments',{name:'CR10 local child',branchId:a.id,parentId:exec.id})
  foreignChild=await f.ok('POST','/departments',{name:'CR10 B child',branchId:b.id,parentId:exec.id})
  localWorker=await employee('CR10 local payroll',a.id,{departmentId:child.id})
  foreignWorker=await employee('CR10 foreign payroll',b.id,{departmentId:foreignChild.id,basicSalary:9000})
  head=await employee('CR10 B department head',b.id)
  const dep=await f.ok('POST','/departments',{name:'CR10 approval department',branchId:b.id,managerEmployeeId:head.id})
  leader=await employee('CR10 team leader',b.id,{departmentId:dep.id})
  team=await f.ok('POST','/teams',{name:'CR10 team',departmentId:dep.id,leaderEmployeeId:leader.id})
  staff=await employee('CR10 requester',b.id,{departmentId:dep.id,teamId:team.id})
  for(const [key,emp]of Object.entries({ceo,head,leader,staff}))users[key]=await user(emp,key==='ceo'?{scopeAllBranches:true}:{})
  branchUser=await user(foreignWorker,{role:'hr_manager',permissions:JSON.stringify(['org.manage','payroll.view','payroll.calculate','attendance.manage','settings.view'])})
})
after(async()=>{if(f)await f.close()})
test('CR10 skip-level uses the same team then department fallback and routes confidential requests only to the resolved second manager',async()=>{
  const code=await type([{approverRole:'direct_manager_of_requester'},{approverRole:'manager_of_direct_manager'}],true)
  const r=await submit(users.staff,code);assert.equal(r.status,201,JSON.stringify(r.body))
  assert.deepEqual((await resolved(r.body.id)).map(s=>s.approverEmployeeId),[head.id])
  const leaderInbox=await f.ok('GET','/requests/inbox',null,users.leader)
  assert.ok(!leaderInbox.some(x=>x.id===r.body.id))
  assert.equal((await f.request('GET',`/requests/${r.body.id}`,null,users.leader)).status,403)
  assert.equal((await f.request('POST',`/requests/${r.body.id}/act`,{action:'APPROVE'},users.leader)).status,403)
  const approved=await f.ok('POST',`/requests/${r.body.id}/act`,{action:'APPROVE'},users.head)
  assert.ok(['APPROVED','COMPLETED'].includes(approved.status))
  note({case:'team-department-fallback-confidential',expected:head.id,resolved:head.id,directManagerBlocked:true,finalStatus:approved.status})
})
test('CR10 top-step deduplication works when the removed step is first and the surviving named step is second',async()=>{
  const e=await employee('CR10 reports to CEO',b.id,{managerEmployeeId:ceo.id}),actor=await user(e)
  const code=await type([{approverRole:'manager_of_direct_manager'},{approverRole:'specific_employee',specificEmployeeId:ceo.id}])
  const r=await submit(actor,code);assert.equal(r.status,201,JSON.stringify(r.body))
  const steps=await resolved(r.body.id);assert.deepEqual(steps.map(s=>[s.stepOrder,s.role,s.approverEmployeeId]),[[2,'specific_employee',ceo.id]])
  const end=await f.ok('POST',`/requests/${r.body.id}/act`,{action:'APPROVE'},users.ceo)
  assert.ok(['APPROVED','COMPLETED'].includes(end.status))
  assert.ok((await f.request('POST',`/requests/${r.body.id}/act`,{action:'APPROVE'},users.ceo)).status>=400)
  note({case:'dedup-first-step',remainingStepOrder:2,finalStatus:end.status,repeatRejected:true})
})
test('CR10 three-person manager cycle created through employee API must stop skip-level submission',async()=>{
  const x=await employee('CR10 cycle X',b.id),y=await employee('CR10 cycle Y',b.id),z=await employee('CR10 cycle Z',b.id)
  const patches=[]
  for(const [e,m]of [[x,y],[y,z],[z,x]])patches.push(await f.request('PATCH',`/employees/${e.id}`,{managerEmployeeId:m.id}))
  if(patches.some(r=>r.status>=400)){note({case:'three-person-cycle',patchStatuses:patches.map(r=>r.status),cycleRejectedAtWrite:true});return}
  const actor=await user(x),code=await type([{approverRole:'manager_of_direct_manager'}])
  const r=await submit(actor,code),steps=r.status<300?await resolved(r.body.id):[]
  note({case:'three-person-cycle',patchStatuses:patches.map(r=>r.status),submission:r.status,resolved:steps.map(s=>s.approverEmployeeId),expected:'reject circular manager structure'})
  assert.equal(r.status,400,'Submission must reject a documented three-person manager cycle')
})
test('CR10 executive parent does not expose its fields to branch B or extend its holiday and payroll scope',async()=>{
  const deps=await f.ok('GET','/departments',null,branchUser)
  assert.ok(!JSON.stringify(deps).includes(exec.name));assert.ok(!deps.some(d=>d.id===exec.id))
  const own=deps.find(d=>d.id===foreignChild.id);assert.equal(own.parentId,exec.id)
  await f.ok('PATCH',`/departments/${foreignChild.id}`,{name:'CR10 updated own child',parentId:exec.id},branchUser)
  const blocked=await f.request('POST','/departments',{name:'CR10 forbidden link',branchId:b.id,parentId:exec.id},branchUser);assert.equal(blocked.status,403)
  const c=await f.ok('GET','/attendance/calendar-context?scope=GLOBAL&sourceId=0')
  await f.ok('POST','/catalogs/holidays',{name:'CR10 executive local holiday',date:'2026-10-15',country:'EG',audience:{level:'departments',branchId:a.id,departmentIds:[exec.id]},
    calendarChange:{effectiveFrom:'2026-08-01',reason:'Independent cross-branch calculation',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
  const attendance=f.app.get(require('../src/attendance/attendance.service').AttendanceService)
  assert.equal((await attendance.calendarDay(localWorker.id,'2026-10-15')).dayKind,'HOLIDAY');assert.equal((await attendance.calendarDay(foreignWorker.id,'2026-10-15')).working,true)
  const badOrder=await f.request('POST','/attendance/holiday-work',{name:'CR10 foreign holiday rejected',targetLevel:'employees',branchId:b.id,employeeIds:[foreignWorker.id],dates:['2026-10-15'],multiplier:1.5},branchUser)
  assert.equal(badOrder.status,400)
  await f.setting('payroll.salary_evidence_mode','MONTHLY_HISTORY_OR_CURRENT_FILE');await f.setting('payroll.cycle_start_day','1')
  const p=await f.ok('POST','/payroll/policies',{name:'CR10 independent payroll',effectiveFrom:'2026-01-01',settings:{defaultPeriodType:'CALENDAR_MONTH',cycleStartDay:1,cycleEndMode:'DERIVED',cycleEndDay:null,dailyHours:8}})
  const v=await f.ok('POST',`/payroll/policies/${p.policy.id}/versions/${p.versions[0].id}/publish`,{expectedRevision:p.versions[0].revision,reason:'Independent real calculation'})
  const draft=await f.ok('POST','/payroll/runs',{name:'CR10 executive scope only',period:'2026-10',policyVersionId:v.version.id,filters:{departmentIds:[exec.id]}})
  const run=await f.ok('POST',`/payroll/runs/${draft.id}/calculate`,{})
  assert.deepEqual(run.items.map(x=>x.employeeId),[localWorker.id]);assert.equal(Number(run.totalNet),6000)
  note({case:'tree-boundary-real-calculation',foreignParentFieldsHidden:true,foreignLink:blocked.status,foreignHolidayOrder:badOrder.status,payrollEmployees:run.items.map(x=>x.employeeId),net:6000,foreignSalaryExcluded:9000})
})
test('CR10 simultaneous linking and executive reassignment cannot leave a foreign child under an ordinary parent',async()=>{
  await f.ok('PATCH',`/departments/${foreignChild.id}`,{parentId:null})
  const alternate=await f.ok('POST','/departments',{name:'CR10 competing executive',branchId:a.id})
  const responses=await Promise.all([
    f.request('PATCH',`/departments/${foreignChild.id}`,{parentId:exec.id}),
    f.request('PATCH',`/departments/${alternate.id}`,{isExecutive:true}),
  ])
  assert.equal(responses.filter(r=>r.status===200).length,1,JSON.stringify(responses))
  assert.equal(responses.filter(r=>r.status===400||r.status===409).length,1)
  const rows=await f.repo('Department').find(),map=new Map(rows.map(r=>[r.id,r]))
  for(const row of rows){const parent=map.get(row.parentId);if(parent&&parent.branchId!==row.branchId)assert.equal(parent.isExecutive,true)}
  assert.equal(rows.filter(r=>r.isExecutive).length,1)
  note({case:'department-tree-race',statuses:responses.map(r=>r.status),foreignParentInvariant:true,executiveCount:1})
})
