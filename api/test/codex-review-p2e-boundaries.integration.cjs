'use strict'
const {test,before,after,afterEach}=require('node:test'),assert=require('node:assert/strict')
let f,n,q,auth,modules,sequence=0
before(async()=>{
 f=await require('./codex-review-p2e-fixture.cjs')('p2e_boundaries')
 n=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 q=f.app.get(require('../src/queue/queue.service').QueueService)
 auth=f.app.get(require('../src/auth/auth.service').AuthService)
 modules=f.app.get(require('../src/modules-registry/modules.service').ModulesService)
 await f.setting('notifications.email.enabled','true')
},{timeout:120000})
after(async()=>{if(f)await f.close()})
afterEach(async()=>{
 if(!f)return
 f.mailbox.hold=null;f.mailbox.failure=null;f.mailbox.sent.length=0;f.mailbox.attempts.length=0
 await f.setting('notifications.quiet_hours','')
 await f.ds.query("UPDATE notification_deliveries SET status=N'SKIPPED' WHERE status IN (N'PENDING',N'DIGEST')")
 await f.ds.query("UPDATE jobs_queue SET status=N'DONE' WHERE status IN (N'PENDING',N'RUNNING')")
 await f.repo('SystemModule').delete({key:'payroll'});modules.invalidate()
})
async function setup(confidential=false,onBehalf=false){
 const k=++sequence
 const branch=await f.repo('Branch').save({name:'فرع اختبار '+k,code:'P2E'+k})
 const otherBranch=await f.repo('Branch').save({name:'فرع أجنبي '+k,code:'P2EX'+k})
 const employee=await f.repo('Employee').save({employeeCode:'P2E'+k,fullName:'صاحب طلب مصطنع '+k,branchId:branch.id,joinDate:'2020-01-01',isActive:true,status:'active',basicSalary:6000})
 const stranger=await f.repo('Employee').save({employeeCode:'P2EX'+k,fullName:'موظف آخر مصطنع '+k,branchId:otherBranch.id,joinDate:'2020-01-01',isActive:true,status:'active',basicSalary:9000})
 const owner=await f.repo('User').save({email:'owner'+k+'@review.invalid',displayName:'صاحب '+k,passwordHash:'synthetic',role:'employee',branchId:branch.id,employeeId:employee.id,permissions:'[]',isActive:true})
 const manager=await f.repo('User').save({email:'manager'+k+'@review.invalid',displayName:'معتمد '+k,passwordHash:'synthetic',role:'employee',branchId:branch.id,permissions:'["approve.hr"]',isActive:true})
 const chain=await f.repo('ApprovalChain').save({code:'P2ECH'+k,nameAr:'سلسلة مصطنعة',isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
 const type=await f.repo('RequestType').save({code:'P2ET'+k,nameAr:'نوع طلب مصطنع '+k,category:'personal_data',destinationHandler:'none',approvalChainId:chain.id,isActive:true,isConfidential:confidential})
 const request=await f.ok('POST','/requests',{typeCode:type.code,payload:{reason:'محتوى لا يدخل البريد'},submit:true,...(onBehalf?{onBehalfEmployeeId:employee.id}:{})},onBehalf?f.admin:owner)
 return{branch,otherBranch,employee,stranger,owner,manager,request,type}
}
async function prepare(s,category='approval',mode='ON'){
 const user=category==='approval'?s.manager:s.owner
 await f.ok('PATCH','/notifications/preferences',{category,channel:'EMAIL',mode},user)
 await q.runOnce({limit:200})
 const rows=await f.ds.query("SELECT d.*,n.recipientUserId,n.category,n.eventCode FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'request' AND n.entityId=@0 AND n.recipientUserId=@1 AND n.category=@2 AND d.channel=N'EMAIL' ORDER BY d.id DESC",[String(s.request.id),user.id,category])
 assert.ok(rows.length,'Actual outbox must produce a delivery');return rows[0]
}
const state=id=>f.repo('NotificationDelivery').findOneByOrFail({id:String(id)})
const send=id=>n.sendEmail(String(id),{attempt:1,maxAttempts:10})
const clock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`

test('P2E control: current approver receives only metadata, branch change before send suppresses it',async t=>{
 const s=await setup(),d=await prepare(s)
 const inbox=await f.ok('GET','/requests/inbox',undefined,s.manager);assert.ok(inbox.some(x=>x.id===s.request.id))
 await send(d.id);assert.equal(f.mailbox.sent.length,1);assert.ok(f.mailbox.sent[0].text.includes(s.type.nameAr));assert.ok(!f.mailbox.sent[0].text.includes('محتوى لا يدخل البريد'))
 const s2=await setup(),d2=await prepare(s2)
 await f.repo('User').update({id:s2.manager.id},{branchId:s2.otherBranch.id})
 const count=f.mailbox.sent.length;await send(d2.id);assert.equal(f.mailbox.sent.length,count);assert.equal((await state(d2.id)).status,'SKIPPED')
 t.diagnostic(JSON.stringify({case:'current-account-scope-control',sent:1,afterBranchChange:'SKIPPED'}))
})

test('P2E closed destination module must suppress previously queued immediate mail and digest',async t=>{
 const outcomes=[]
 for(const mode of ['ON','DIGEST']){
  const s=await setup()
  await f.ok('PATCH','/notifications/preferences',{category:'payroll',channel:'EMAIL',mode},s.owner)
  const run=await f.repo('PayrollRun').save({name:'مسير مصطنع لفحص الإشعار '+s.branch.id,period:'2026-09',startDate:'2026-08-23',endDate:'2026-09-22',branchId:s.branch.id,scopeType:'CUSTOM',employeeIds:JSON.stringify([s.employee.id]),runType:'REGULAR',status:'APPROVED',totalNet:6000,approvedAt:new Date()})
  await f.repo('PayrollItem').save({runId:run.id,employeeId:s.employee.id,basicSalary:6000,netPay:6000,absenceDays:0,unpaidLeaveDays:0,payMethod:'cash'})
  await f.ds.transaction(em=>require('../src/queue/outbox').recordOutboxEvent(em,{type:'PAYROLL_RUN_APPROVED',entityType:'payroll_run',entityId:run.id,payload:{runId:run.id}}))
  await q.runOnce({limit:200})
  const [d]=await f.ds.query("SELECT d.* FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'payroll_run' AND n.entityId=@0 AND n.recipientUserId=@1 AND d.channel=N'EMAIL'",[String(run.id),s.owner.id]);assert.ok(d)
  await f.repo('SystemModule').save({key:'payroll',enabled:false,enabledAt:new Date(),enabledBy:f.admin.id,audience:null});modules.invalidate()
  const blocked=await f.request('GET','/payroll/my-payslips',undefined,s.owner);assert.equal(blocked.status,404)
  const before=f.mailbox.sent.length;if(mode==='ON')await send(d.id);else await n.sendDigests()
  outcomes.push({mode,screenStatus:blocked.status,sent:f.mailbox.sent.length-before,delivery:(await state(d.id)).status})
  await f.repo('SystemModule').delete({key:'payroll'});modules.invalidate()
 }
 t.diagnostic(JSON.stringify({case:'module-closed-after-dispatch',outcomes}))
 assert.ok(outcomes.every(x=>x.sent===0),'A destination closed to the recipient must not remain accessible by queued mail')
})

test('P2E account relink: a previous owners decision must not be mailed to the new employee',async t=>{
 const outcomes=[]
 for(const mode of ['ON','DIGEST']){
  // Real on-behalf submission/final HR decision. One account per employee,
  // followed by the supported account-edit endpoint (no forged request row).
  const s=await setup(false,true)
  assert.equal((await f.repo('Request').findOneByOrFail({id:s.request.id})).createdByUserId,f.admin.id)
  const d=await prepare(s,'request',mode)
  assert.equal((await f.request('GET',`/requests/${s.request.id}`,undefined,s.owner)).status,200)
  const changed=await f.ok('PATCH',`/users/${s.owner.id}`,{employeeId:s.stranger.id,branchId:s.otherBranch.id},f.admin)
  const fresh=await f.repo('User').findOneByOrFail({id:s.owner.id})
  const denied=await f.request('GET',`/requests/${s.request.id}`,undefined,fresh);assert.equal(denied.status,404)
  const before=f.mailbox.sent.length;if(mode==='ON')await send(d.id);else await n.sendDigests()
  const leaked=f.mailbox.sent.slice(before).some(x=>x.text.includes(s.type.nameAr))
  outcomes.push({mode,userEditStatus:200,requestStatus:denied.status,sent:f.mailbox.sent.length-before,containsOldType:leaked,delivery:(await state(d.id)).status})
 }
 t.diagnostic(JSON.stringify({case:'relinked-owner-via-public-apis',outcomes}))
 assert.ok(outcomes.every(x=>!x.containsOldType),'Relinked account may not receive an inaccessible previous employees request')
})

test('P2E digest observes quiet hours and resumes after they end',async t=>{
 const s=await setup(),d=await prepare(s,'approval','DIGEST')
 const now=new Date(),minute=now.getHours()*60+now.getMinutes(),from=(minute+1430)%1440,to=(minute+60)%1440
 await f.setting('notifications.quiet_hours',`${clock(from)}-${clock(to)}`)
 await f.setting('notifications.digest_hour',String(now.getHours()))
 const before=f.mailbox.sent.length;const sent=await n.digestHourlyWork(now);const quietState=await state(d.id)
 await f.setting('notifications.quiet_hours','');const resumed=await n.digestHourlyWork(now)
 t.diagnostic(JSON.stringify({case:'quiet-digest',sentInQuiet:sent,quietStatus:quietState.status,resumed,sentTotal:f.mailbox.sent.length-before}))
 assert.equal(sent,0,'Digest must respect quiet hours like immediate email');assert.equal(quietState.status,'DIGEST');assert.equal(resumed,1)
})

test('P2E delivery claim must protect a staggered second worker while first SMTP attempt is active',async t=>{
 const s=await setup(),d=await prepare(s)
 let release,first,second
 f.mailbox.hold=new Promise(r=>release=r)
 try{
  first=send(d.id)
  for(let i=0;i<100&&f.mailbox.attempts.length===0;i++)await new Promise(r=>setTimeout(r,10))
  assert.equal(f.mailbox.attempts.length,1,'First sender has reached fake SMTP')
  second=send(d.id)
  await new Promise(r=>setTimeout(r,250))
  const overlapping=f.mailbox.attempts.length
  release();await Promise.all([first,second]);const row=await state(d.id)
  t.diagnostic(JSON.stringify({case:'staggered-delivery-claim',overlapping,sent:f.mailbox.sent.length,attempts:row.attempts,status:row.status}))
  assert.equal(overlapping,1,'The attempts counter is not an exclusive in-flight reservation')
 }finally{release();if(first)await first.catch(()=>{});if(second)await second.catch(()=>{});f.mailbox.hold=null}
})

test('P2E confidential return becomes stale after resubmission, just like a non-confidential return',async t=>{
 const results=[]
 for(const secret of [false,true]){
  const s=await setup(secret)
  await f.ok('POST',`/requests/${s.request.id}/act`,{action:'RETURN',comment:'استكمال مصطنع'},s.manager)
  const d=await prepare(s,'request')
  await f.ok('POST',`/requests/${s.request.id}/resubmit`,{payload:{reason:'بعد الاستكمال'}},s.owner)
  const before=f.mailbox.sent.length;await send(d.id)
  results.push({secret,event:d.eventCode,sent:f.mailbox.sent.length-before,status:(await state(d.id)).status})
 }
 t.diagnostic(JSON.stringify({case:'confidential-return-staleness',results}))
 assert.ok(results.every(x=>x.sent===0),'Confidentiality must not remove stale-return checks')
})

test('P2E added request events are atomic: outbox failure rolls back submission and return',async t=>{
 const s=await setup(),before=await f.repo('Request').count()
 const stored=await f.repo('Request').findOneByOrFail({id:s.request.id})
 const actionsBefore=await f.repo('RequestApproval').find({where:{requestId:s.request.id},order:{id:'ASC'}})
 await f.ds.query("CREATE TRIGGER codex_p2e_reject_new_events ON outbox_events AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE eventType IN (N'REQUEST_STEP_PENDING',N'REQUEST_RETURNED')) THROW 59001, 'Synthetic event persistence failure', 1; END")
 let submitted,returned
 try{
  submitted=await f.request('POST','/requests',{typeCode:s.type.code,payload:{reason:'يفشل بالكامل'},submit:true},s.owner)
  returned=await f.request('POST',`/requests/${s.request.id}/act`,{action:'RETURN',comment:'يفشل بالكامل'},s.manager)
 }finally{await f.ds.query('DROP TRIGGER codex_p2e_reject_new_events')}
 assert.equal(submitted.status,500);assert.equal(returned.status,500)
 assert.equal(await f.repo('Request').count(),before)
 assert.deepEqual(await f.repo('Request').findOneByOrFail({id:s.request.id}),stored)
 assert.deepEqual(await f.repo('RequestApproval').find({where:{requestId:s.request.id},order:{id:'ASC'}}),actionsBefore)
 t.diagnostic(JSON.stringify({case:'added-event-atomicity',submit:submitted.status,return:returned.status,requestsUnchanged:true,actionsUnchanged:true}))
})
