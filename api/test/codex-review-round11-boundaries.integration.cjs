'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,branch,seq=0,typeSeq=0
const note=v=>console.log('CR11_EVIDENCE '+JSON.stringify(v))
const employee=(name,branchId=branch.id,extra={})=>f.repo('Employee').save({employeeCode:`R11E${++seq}`,fullName:name,branchId,joinDate:'2024-01-01',status:'active',isActive:true,basicSalary:6000,currency:'EGP',payMethod:'cash',...extra})
const user=e=>f.repo('User').save({email:`r11-${e.id}@codex.invalid`,displayName:e.fullName,passwordHash:'not-a-password',role:'employee',branchId:e.branchId,employeeId:e.id,permissions:'[]'})
async function requestType(both=false){
  const code=`R11_${++typeSeq}`,steps=[...(both?[{approverRole:'direct_manager_of_requester'}]:[]),{approverRole:'manager_of_direct_manager'}]
  const chain=await f.ok('POST','/settings/approval-chains',{code,nameAr:code,steps})
  await f.ok('POST','/settings/request-types',{code,nameAr:code,category:'employee_relations',destinationHandler:'none',customFields:[],approvalChainId:chain.id,visibleTo:{mode:'all',ids:[]}})
  return code
}
const draft=(actor,code)=>f.ok('POST','/requests',{typeCode:code,payload:{}},actor)
const submit=(id,actor)=>f.request('POST',`/requests/${id}/submit`,{},actor)
const row=id=>f.repo('Request').findOneByOrFail({id})
const act=(id,actor)=>f.ok('POST',`/requests/${id}/act`,{action:'APPROVE'},actor)
before(async()=>{f=await require('./codex-review-round11-fixture.cjs')('r11boundaries');branch=await f.repo('Branch').save({name:'CR11 explicit managers',code:'R11A',country:'EG'})})
after(async()=>{if(f)await f.close()})

test('CR11 six recorded managers in a cycle: reject without state change; repair and resubmit the same draft',async()=>{
  const employees=[]
  for(let i=0;i<6;i++)employees.push(await employee(`CR11 cycle ${i}`))
  for(let i=0;i<6;i++)await f.ok('PATCH',`/employees/${employees[i].id}`,{managerEmployeeId:employees[(i+1)%6].id})
  const owner=await user(employees[0]),approver=await user(employees[2]),d=await draft(owner,await requestType())
  const rejected=await submit(d.id,owner)
  assert.equal(rejected.status,400);assert.match(rejected.body.message,/الهيكل فيه دايرة/)
  const stopped=await row(d.id)
  assert.equal(stopped.status,'DRAFT');assert.equal(stopped.resolvedSteps,null);assert.equal(stopped.submittedAt,null);assert.equal(stopped.destinationRef,null)
  assert.equal(await f.repo('RequestApproval').countBy({requestId:d.id}),0)
  assert.ok(!(await f.ok('GET','/requests/inbox',null,approver)).some(x=>x.id===d.id))
  await f.ok('PATCH',`/employees/${employees[5].id}`,{managerEmployeeId:null})
  const accepted=await submit(d.id,owner);assert.equal(accepted.status,201,JSON.stringify(accepted.body))
  assert.deepEqual(JSON.parse((await row(d.id)).resolvedSteps).map(s=>s.approverEmployeeId),[employees[2].id])
  assert.equal((await act(d.id,approver)).status,'COMPLETED')
  assert.ok((await f.request('POST',`/requests/${d.id}/act`,{action:'APPROVE'},approver)).status>=400)
  assert.equal(await f.repo('RequestApproval').countBy({requestId:d.id,action:'APPROVED'}),1)
  note({case:'six-person-cycle-and-repair',rejected:400,stateAfterRejection:stopped.status,resubmitted:201,finalStatus:'COMPLETED',approvalCount:1})
})

test('CR11 natural department and branch fallback loop: submit and complete both named approvals',async()=>{
  const b=await f.repo('Branch').save({name:'CR11 fallback branch',code:'R11B',country:'EG'})
  const branchManager=await employee('CR11 branch manager',b.id),departmentManager=await employee('CR11 department manager',b.id)
  const department=await f.ok('POST','/departments',{name:'CR11 branch manager department',branchId:b.id,managerEmployeeId:departmentManager.id})
  await f.repo('Branch').update({id:b.id},{managerEmployeeId:branchManager.id})
  for(const e of [branchManager,departmentManager])await f.ok('PATCH',`/employees/${e.id}`,{departmentId:department.id})
  const worker=await employee('CR11 fallback requester',b.id,{departmentId:department.id,managerEmployeeId:departmentManager.id})
  const owner=await user(worker),first=await user(departmentManager),second=await user(branchManager)
  const d=await draft(owner,await requestType(true)),r=await submit(d.id,owner)
  assert.equal(r.status,201,JSON.stringify(r.body))
  assert.deepEqual(JSON.parse((await row(d.id)).resolvedSteps).map(s=>s.approverEmployeeId),[departmentManager.id,branchManager.id])
  assert.equal((await act(d.id,first)).status,'UNDER_REVIEW');assert.equal((await act(d.id,second)).status,'COMPLETED')
  const approvals=await f.repo('RequestApproval').find({where:{requestId:d.id,action:'APPROVED'},order:{step:'ASC'}})
  assert.deepEqual(approvals.map(x=>x.approverId),[first.id,second.id])
  note({case:'natural-fallback-loop',submission:201,resolved:[departmentManager.id,branchManager.id],finalStatus:'COMPLETED',approvalCount:2})
})

test('CR11 fallback first two hops cannot hide a recorded return from the selected approver to the requester',async()=>{
  const head=await employee('CR11 mixed department head'),leader=await employee('CR11 mixed team leader')
  const dep=await f.ok('POST','/departments',{name:'CR11 mixed department',branchId:branch.id,managerEmployeeId:head.id})
  await f.ok('PATCH',`/employees/${leader.id}`,{departmentId:dep.id})
  const team=await f.ok('POST','/teams',{name:'CR11 mixed team',departmentId:dep.id,leaderEmployeeId:leader.id})
  const worker=await employee('CR11 mixed requester',branch.id,{departmentId:dep.id,teamId:team.id})
  await f.ok('PATCH',`/employees/${head.id}`,{managerEmployeeId:worker.id})
  const owner=await user(worker),d=await draft(owner,await requestType()),r=await submit(d.id,owner)
  assert.equal(r.status,400);assert.match(r.body.message,/الهيكل فيه دايرة/);assert.equal((await row(d.id)).status,'DRAFT')
  assert.equal(await f.repo('RequestApproval').countBy({requestId:d.id}),0)
  note({case:'fallback-then-recorded-return',submission:400,state:'DRAFT',approvalCount:0})
})

test('CR11 recorded traversal stops at its actual end instead of following a department fallback back to the requester',async()=>{
  const people=[]
  for(let i=0;i<5;i++)people.push(await employee(`CR11 ordinary chain ${i}`))
  for(let i=0;i<4;i++)await f.ok('PATCH',`/employees/${people[i].id}`,{managerEmployeeId:people[i+1].id})
  const dep=await f.ok('POST','/departments',{name:'CR11 higher manager administrative department',branchId:branch.id,managerEmployeeId:people[0].id})
  await f.ok('PATCH',`/employees/${people[4].id}`,{departmentId:dep.id})
  const owner=await user(people[0]),approver=await user(people[2]),d=await draft(owner,await requestType())
  const r=await submit(d.id,owner);assert.equal(r.status,201,JSON.stringify(r.body))
  assert.deepEqual(JSON.parse((await row(d.id)).resolvedSteps).map(s=>s.approverEmployeeId),[people[2].id])
  assert.equal((await act(d.id,approver)).status,'COMPLETED')
  note({case:'explicit-chain-with-unrelated-organizational-return',submission:201,finalStatus:'COMPLETED',expectedApprover:people[2].id})
})
