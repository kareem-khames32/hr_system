'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-round2-fixture.cjs')('recordonly')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('CR2 every seeded record-only request with a chain: approval, duplicate denial, reasoned rejection, zero automatic financial effect',async t=>{
  await require('../src/seed/seed-requests').seedRequests(f.ds)
  const branch=await f.repo('Branch').save({code:'RECORD',name:'Independent record-only'})
  const staff=await f.repo('Employee').save({employeeCode:'RECORD1',fullName:'Synthetic requester',branchId:branch.id,joinDate:'2020-01-01',basicSalary:7800})
  const named=await f.repo('Employee').save({employeeCode:'RECORD2',fullName:'Synthetic named approver',branchId:branch.id,joinDate:'2020-01-01'})
  const actor=await f.repo('User').save({email:'recordonly@codex.invalid',displayName:'Requester',passwordHash:'test-only',role:'employee',employeeId:staff.id,branchId:branch.id,permissions:'[]'})
  await f.repo('User').update(f.approver.id,{employeeId:named.id});f.approver.employeeId=named.id
  const beforeEmployee=await f.repo('Employee').findOneByOrFail({id:staff.id})
  const definitions=(await f.repo('RequestType').findBy({destinationHandler:'none',isActive:true})).filter(r=>r.approvalChainId)
  assert.equal(definitions.length,16)
  const outcomes=[]
  for(const type of definitions){
    await f.ok('PATCH',`/settings/approval-chains/${type.approvalChainId}/steps`,{steps:[{approverRole:'specific_employee',specificEmployeeId:named.id,slaDays:3}]})
    const fields=JSON.parse(type.requiredFields||'[]'),payload=Object.fromEntries(fields.map(k=>[k,k==='amount'?123.45:'Independent '+k]))
    const create=()=>f.ok('POST','/requests',{typeCode:type.code,submit:true,payload},actor)
    const approved=await create()
    await f.ok('POST',`/requests/${approved.id}/act`,{action:'APPROVE',comment:'Independent named approval'},f.approver)
    assert.equal((await f.repo('Request').findOneByOrFail({id:approved.id})).status,'COMPLETED',type.code)
    const count=await f.repo('RequestApproval').countBy({requestId:approved.id})
    const repeat=await f.request('POST',`/requests/${approved.id}/act`,{action:'APPROVE',comment:'Duplicate attempt'},f.approver)
    assert.ok(repeat.status>=400);assert.equal(await f.repo('RequestApproval').countBy({requestId:approved.id}),count)
    const rejected=await create()
    await f.ok('POST',`/requests/${rejected.id}/act`,{action:'REJECT',comment:'Independent reasoned rejection'},f.approver)
    assert.equal((await f.repo('Request').findOneByOrFail({id:rejected.id})).status,'REJECTED',type.code)
    outcomes.push({code:type.code,approved:'COMPLETED',rejected:'REJECTED',duplicate:repeat.status})
  }
  assert.deepEqual(await f.repo('Employee').findOneByOrFail({id:staff.id}),beforeEmployee)
  for(const entity of ['EmployeeObligation','Loan','CustodyAssignment'])assert.equal(await f.repo(entity).count(),0)
  t.diagnostic(JSON.stringify({recordOnly:outcomes,automaticEffects:0}))
},{timeout:300000})
