'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,sequence=0
before(async()=>{f=await require('./codex-review-p2k-fixture.cjs')('p2k_execution');await f.setting('notifications.email.enabled','false')},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function setup(confidential=true){
 const k=++sequence,branch=await f.repo('Branch').save({name:'فرع تنفيذ مصطنع '+k,code:'PH'+k}),foreign=await f.repo('Branch').save({name:'فرع خارجي مصطنع '+k,code:'PHX'+k})
 const emp=async(label)=>f.repo('Employee').save({employeeCode:'PH'+label+k,fullName:'اسم مصطنع '+label+k,branchId:branch.id,joinDate:'2020-01-01',basicSalary:6000,status:'active',isActive:true})
 const manager=await emp('manager'),worker=await emp('worker')
 const account=(label,employeeId,permissions,branchId=branch.id)=>f.repo('User').save({email:label+k+'@review.invalid',displayName:'حساب مصطنع '+label+k,passwordHash:'synthetic',role:'employee',employeeId,branchId,permissions:JSON.stringify(permissions),isActive:true})
 const owner=await account('owner',worker.id,[]),approver=await account('approver',manager.id,[]),executor=await account('executor',null,['approve.it','settings.manage','requests.view_all']),viewer=await account('viewer',null,['tasks.manage','tasks.view_all','requests.view_all','settings.manage']),outsider=await account('outsider',null,['approve.it','tasks.manage','requests.view_all','settings.manage'],foreign.id)
 const chain=await f.repo('ApprovalChain').save({code:'PHCHAIN'+k,nameAr:'سلسلة مصطنعة '+k,isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'specific_employee',specificEmployeeId:manager.id})
 const type=await f.repo('RequestType').save({code:'PHTYPE'+k,nameAr:'نوع خاص مصطنع '+k,category:'personal_data',destinationHandler:'none',approvalChainId:chain.id,isActive:true,isConfidential:confidential})
 await f.ok('PATCH',`/settings/request-types/${type.id}`,{executionRole:'it',executionDays:3,executionProof:true})
 const req=await f.ok('POST','/requests',{typeCode:type.code,payload:{reason:'محتوى مصطنع لا يظهر للمتفرج'},submit:true},owner)
 await f.ok('POST',`/requests/${req.id}/act`,{action:'APPROVE'},approver)
 const [row]=await f.ds.query('SELECT id,status,executionTaskId FROM requests WHERE id=@0',[req.id]);assert.equal(row.status,'IN_EXECUTION')
 return{k,branch,foreign,worker,owner,approver,executor,viewer,outsider,type,req,taskId:row.executionTaskId}
}
const status=(s,actor,body)=>f.request('POST',`/tasks/${s.taskId}/status`,body,actor)

test('P2K confidential execution access, hidden task proof and post-completion party rights remain bounded',async t=>{
 const s=await setup()
 const hidden=await f.request('GET',`/tasks/${s.taskId}`,undefined,s.outsider),missing=await f.request('GET','/tasks/987654321',undefined,s.outsider)
 assert.equal(hidden.status,404);assert.deepEqual(hidden.body,missing.body)
 const detail=await f.ok('GET',`/requests/${s.req.id}`,undefined,s.executor);assert.equal(detail.requesterId,s.worker.id);assert.ok(!detail.confidentialMasked)
 const masked=await f.ok('GET',`/requests/${s.req.id}`,undefined,s.viewer);assert.equal(masked.confidentialMasked,true);assert.equal(masked.requesterId,null)
 const before=await f.ok('GET',`/tasks/${s.taskId}`,undefined,s.viewer);assert.equal(before.title,'تنفيذ طلب سري');assert.equal(before.requestId,null)
 assert.equal((await status(s,s.viewer,{status:'DONE',proofNote:'غير مسموح'})).status,403)
 assert.equal((await f.request('POST',`/requests/${s.req.id}/reject-execution`,{comment:'غير مسموح'},s.viewer)).status,403)
 await f.ok('POST',`/tasks/${s.taskId}/status`,{status:'DONE',proofNote:'إثبات مصطنع مسموح لصاحب الطلب'},s.executor)
 const owner=await f.ok('GET',`/requests/${s.req.id}`,undefined,s.owner)
 assert.equal(owner.status,'COMPLETED');assert.equal(owner.approvals.filter(x=>x.action==='EXECUTED').length,1)
 assert.ok(owner.approvals.some(x=>(x.comment||'').includes('إثبات مصطنع')))
 const after=await f.ok('GET',`/tasks/${s.taskId}`,undefined,s.viewer)
 assert.equal(after.requestId,null);assert.equal(after.proofNote,null);assert.equal(after.closedByName,null)
 t.diagnostic(JSON.stringify({case:'execution-party-bounds',hidden:404,viewerClose:403,viewerReject:403,ownerStatus:owner.status,storedExecutions:1}))
})

test('P2K failed completion event rolls task and request and approval history back together',async t=>{
 const s=await setup(),beforeTask=await f.repo('Task').findOneByOrFail({id:s.taskId}),beforeReq=await f.repo('Request').findOneByOrFail({id:s.req.id}),beforeHistory=await f.repo('RequestApproval').find({where:{requestId:s.req.id},order:{id:'ASC'}})
 await f.ds.query("CREATE TRIGGER codex_p2k_refuse_execution_event ON outbox_events AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE eventType=N'REQUEST_EXECUTED') THROW 59003, 'Synthetic execution event failure',1; END")
 let refused
 try{refused=await status(s,s.executor,{status:'DONE',proofNote:'لا يتسجل'})}finally{await f.ds.query('DROP TRIGGER codex_p2k_refuse_execution_event')}
 assert.equal(refused.status,500)
 assert.deepEqual(await f.repo('Task').findOneByOrFail({id:s.taskId}),beforeTask)
 assert.deepEqual(await f.repo('Request').findOneByOrFail({id:s.req.id}),beforeReq)
 assert.deepEqual(await f.repo('RequestApproval').find({where:{requestId:s.req.id},order:{id:'ASC'}}),beforeHistory)
 await f.ok('POST',`/tasks/${s.taskId}/status`,{status:'DONE',proofNote:'تجربة ناجحة بعد رفع العطل'},s.executor)
 assert.equal(await f.repo('RequestApproval').count({where:{requestId:s.req.id,action:'EXECUTED'}}),1)
 t.diagnostic(JSON.stringify({case:'execution-event-atomicity',failedStatus:500,allRowsUnchanged:true,retryExecutions:1}))
})

test('P2K a current confidential execution party should remain a party in the pending report and reject-execution action',async t=>{
 const s=await setup()
 const detail=await f.ok('GET',`/requests/${s.req.id}`,undefined,s.executor)
 const report=(await f.ok('GET','/requests/all?execution=pending',undefined,s.executor)).find(x=>x.id===s.req.id)
 const rejected=await f.request('POST',`/requests/${s.req.id}/reject-execution`,{comment:'تعذر التنفيذ من المسؤول الحالي'},s.executor)
 const diagnostic={case:'execution-party-consistency',detailMasked:detail.confidentialMasked===true,reportMasked:report.confidentialMasked===true,rejectStatus:rejected.status,message:rejected.body.message??null,requestStatus:(await f.repo('Request').findOneByOrFail({id:s.req.id})).status}
 t.diagnostic(JSON.stringify(diagnostic))
 assert.ok(!detail.confidentialMasked)
 assert.equal(report.confidentialMasked===true,false,'The same current execution party is masked in the console report')
 assert.equal(rejected.status,201,'An execution party with settings.manage should be able to reject execution')
})
