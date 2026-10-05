'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,seq=0
before(async()=>{f=await require('./codex-review-p2k-fixture.cjs')('p2k_delegation');await f.setting('notifications.email.enabled','false')},{timeout:120000})
after(async()=>{if(f)await f.close()})
const day=()=>require('../src/requests/approval-delegations').delegationLocalDate(new Date())
async function setup(){
 const k=++seq,a=await f.repo('Branch').save({code:'DI'+k,name:'فرع مراجعة أ '+k}),b=await f.repo('Branch').save({code:'DIX'+k,name:'فرع مراجعة ب '+k})
 const employee=(name,branchId=a.id)=>f.repo('Employee').save({employeeCode:'DI'+name+k,fullName:'موظف مصطنع '+name+k,branchId,joinDate:'2020-01-01',basicSalary:6000,isActive:true,status:'active'})
 const principal=await employee('principal'),substitute=await employee('substitute'),worker=await employee('worker'),foreign=await employee('foreign',b.id)
 const user=(name,employeeId,perms=[],branchId=a.id)=>f.repo('User').save({email:name+k+'@review.invalid',displayName:'حساب مصطنع '+name+k,passwordHash:'synthetic',role:'employee',employeeId,branchId,permissions:JSON.stringify(perms),isActive:true})
 const p=await user('principal',principal.id),d=await user('substitute',substitute.id),w=await user('worker',worker.id),manager=await user('manager',null,['approval_chains.manage']),foreignUser=await user('foreign',foreign.id,[],b.id)
 const chain=await f.repo('ApprovalChain').save({code:'DICH'+k,nameAr:'سلسلة مصطنعة '+k,isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'specific_employee',specificEmployeeId:principal.id,canDelegate:true})
 const type=await f.repo('RequestType').save({code:'DITYPE'+k,nameAr:'نوع مصطنع '+k,category:'personal_data',destinationHandler:'none',approvalChainId:chain.id,isConfidential:true,isActive:true})
 return{k,a,b,principal,substitute,worker,foreign,p,d,w,manager,foreignUser,chain,type}
}
const grant=(s,actor=s.p,extra={})=>f.ok('POST','/requests/delegations',{delegateEmployeeId:s.substitute.id,startDate:day(),endDate:day(),...extra},actor)
const submit=s=>f.ok('POST','/requests',{typeCode:s.type.code,payload:{reason:'محتوى مصطنع سري'},submit:true},s.w)
const act=(s,id)=>f.request('POST',`/requests/${id}/act`,{action:'APPROVE',comment:'قرار مصطنع'},s.d)

test('P2K delegation audit responses must scope foreign employee identities while preserving stored evidence',async t=>{
 const s=await setup()
 await f.ok('PATCH',`/users/${s.manager.id}`,{permissions:['approval_chains.manage','audit.view']})
 const reader=await f.repo('User').findOneByOrFail({id:s.manager.id})
 const row=await grant(s,f.admin,{delegatorEmployeeId:s.principal.id,delegateEmployeeId:s.foreign.id})
 await f.ok('POST',`/requests/delegations/${row.id}/revoke`,{})
 const route=`/audit?entityType=approval_delegation&entityId=${row.id}`
 const limited=await f.ok('GET',route,undefined,reader),company=await f.ok('GET',route)
 assert.equal(limited.rows.length,2);assert.equal(company.rows.length,2)
 const identities=limited.rows.map(x=>(x.after||x.before).delegateEmployeeId)
 const stored=await f.ds.query('SELECT [before],[after] FROM audit_log WHERE entityType=@0 AND entityId=@1',['approval_delegation',String(row.id)])
 assert.ok(stored.every(x=>JSON.parse(x.after||x.before).delegateEmployeeId===s.foreign.id))
 assert.ok(company.rows.every(x=>(x.after||x.before).delegateEmployeeId===s.foreign.id))
 assert.ok(limited.rows.every(x=>!x.summary.includes(s.foreign.fullName)))
 t.diagnostic(JSON.stringify({case:'delegation-audit-foreign-id',foreignEmployee:s.foreign.id,returnedEmployeeIds:identities,actions:limited.rows.map(x=>x.action),nameHidden:true,companyPreserved:true,storedPreserved:true}))
 assert.ok(identities.every(x=>x==null),'Creation and revocation audit JSON must not disclose the foreign employee identity')
})

test('P2K branch-only delegation administrator must not receive the identity of an unrelated foreign delegate',async t=>{
 const s=await setup()
 const row=await grant(s,f.admin,{delegatorEmployeeId:s.principal.id,delegateEmployeeId:s.foreign.id})
 const own=(await f.ok('GET','/requests/delegations',undefined,s.p)).mine.find(x=>x.id===row.id)
 const company=(await f.ok('GET','/requests/delegations')).others.find(x=>x.id===row.id)
 const branch=(await f.ok('GET','/requests/delegations',undefined,s.manager)).others.find(x=>x.id===row.id)
 assert.ok(branch);assert.equal(branch.delegateName,null);assert.equal(own.delegateEmployeeId,s.foreign.id);assert.equal(company.delegateEmployeeId,s.foreign.id)
 t.diagnostic(JSON.stringify({case:'delegation-foreign-id',branchId:s.a.id,foreignBranch:s.b.id,foreignEmployee:s.foreign.id,returnedEmployee:branch.delegateEmployeeId,nameHidden:branch.delegateName===null,partyHasIdentity:true,companyHasIdentity:true}))
 assert.equal(branch.delegateEmployeeId,null,'Hiding the name alone still discloses the foreign employee identity to a non-party')
})

test('P2K delegated decision and on-behalf audit attribution roll back atomically and retain party access after successful action',async t=>{
 const s=await setup(),delegation=await grant(s),req=await submit(s),before=await f.repo('Request').findOneByOrFail({id:req.id})
 await f.ds.query("CREATE TRIGGER codex_p2k_attribution_failure ON request_approvals AFTER UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE onBehalfOfEmployeeId IS NOT NULL) THROW 59004, 'Synthetic attribution failure',1; END")
 let refused
 try{refused=await act(s,req.id)}finally{await f.ds.query('DROP TRIGGER codex_p2k_attribution_failure')}
 assert.equal(refused.status,500);assert.deepEqual(await f.repo('Request').findOneByOrFail({id:req.id}),before);assert.equal(await f.repo('RequestApproval').count({where:{requestId:req.id}}),0)
 assert.equal((await act(s,req.id)).status,201)
 const rows=await f.ds.query('SELECT action,onBehalfOfEmployeeId FROM request_approvals WHERE requestId=@0',[req.id]);assert.deepEqual(rows,[{action:'APPROVED',onBehalfOfEmployeeId:s.principal.id}])
 await f.ok('POST',`/requests/delegations/${delegation.id}/revoke`,{},s.p)
 const detail=await f.ok('GET',`/requests/${req.id}`,undefined,s.d);assert.ok(!detail.confidentialMasked);assert.equal(detail.status,'COMPLETED')
 t.diagnostic(JSON.stringify({case:'delegated-attribution-atomicity',failed:500,requestUnchanged:true,approvalCountAfterFailure:0,retryApproved:1,afterRevokeActorStillParty:true}))
})

test('P2K revocation committed before the blocked decision obtains its request lock prevents the delegated decision',async t=>{
 const s=await setup(),delegation=await grant(s),req=await submit(s),runner=f.ds.createQueryRunner()
 await runner.connect();await runner.startTransaction()
 let pending,refused
 try{
  await runner.query('UPDATE requests SET status=status WHERE id=@0',[req.id])
  pending=act(s,req.id)
  let blocked=0
  for(let i=0;i<100&&!blocked;i++){await new Promise(r=>setTimeout(r,40));blocked=Number((await f.ds.query('SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)}
  assert.ok(blocked,'The decision must be waiting on the real database lock')
  await f.ok('POST',`/requests/delegations/${delegation.id}/revoke`,{},s.p)
  await runner.commitTransaction();refused=await pending
 }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();if(pending)await pending.catch(()=>{})}
 assert.equal(refused.status,403);assert.equal((await f.repo('Request').findOneByOrFail({id:req.id})).status,'UNDER_REVIEW');assert.equal(await f.repo('RequestApproval').count({where:{requestId:req.id}}),0)
 t.diagnostic(JSON.stringify({case:'revocation-before-decision',decision:403,requestUnchanged:true,auditRows:0}))
})

test('P2K the delegate cannot act on an undelegable step or leak the request after a real branch-scope change',async t=>{
 const s=await setup();await grant(s)
 await f.repo('ApprovalStep').update({chainId:s.chain.id},{canDelegate:false})
 const locked=await submit(s);assert.equal((await act(s,locked.id)).status,403)
 assert.equal((await f.request('GET',`/requests/${locked.id}`,undefined,s.d)).status,403)
 await f.repo('ApprovalStep').update({chainId:s.chain.id},{canDelegate:true})
 const open=await submit(s);assert.equal((await f.request('GET',`/requests/${open.id}`,undefined,s.d)).status,200)
 await f.ok('PATCH',`/users/${s.d.id}`,{branchId:s.b.id})
 const moved=await f.repo('User').findOneByOrFail({id:s.d.id})
 const outside=await f.request('GET',`/requests/${open.id}`,undefined,moved),absent=await f.request('GET','/requests/987654321',undefined,moved)
 assert.equal(outside.status,404);assert.deepEqual(outside.body,absent.body)
 assert.equal((await f.request('POST',`/requests/${open.id}/act`,{action:'APPROVE'},moved)).status,403)
 t.diagnostic(JSON.stringify({case:'delegation-lock-and-scope',undelegable:403,beforeMove:200,afterMove:404,decisionAfterMove:403}))
})
