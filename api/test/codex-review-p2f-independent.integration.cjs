'use strict'
const {test,before,after,afterEach}=require('node:test'),assert=require('node:assert/strict')
let f,n,q,sequence=0
before(async()=>{
 f=await require('./codex-review-p2f-fixture.cjs')('p2f_independent')
 n=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 q=f.app.get(require('../src/queue/queue.service').QueueService)
 await f.setting('notifications.email.enabled','true')
},{timeout:120000})
after(async()=>{if(f)await f.close()})
afterEach(async()=>{
 if(!f)return
 f.mailbox.hold=null;f.mailbox.failure=null;f.mailbox.sent.length=0;f.mailbox.attempts.length=0
 await f.setting('notifications.quiet_hours','')
 await f.ds.query("UPDATE notification_deliveries SET status=N'SKIPPED' WHERE status IN (N'PENDING',N'DIGEST')")
 await f.ds.query("UPDATE jobs_queue SET status=N'DONE' WHERE status IN (N'PENDING',N'RUNNING')")
})
async function setup(mode='ON'){
 const k=++sequence
 const branch=await f.repo('Branch').save({name:'فرع مصطنع '+k,code:'P2F'+k})
 const otherBranch=await f.repo('Branch').save({name:'فرع آخر '+k,code:'P2FX'+k})
 const employee=await f.repo('Employee').save({employeeCode:'P2F'+k,fullName:'موظف مصطنع '+k,branchId:branch.id,joinDate:'2020-01-01',isActive:true,status:'active',basicSalary:6000})
 const stranger=await f.repo('Employee').save({employeeCode:'P2FX'+k,fullName:'موظف آخر '+k,branchId:otherBranch.id,joinDate:'2020-01-01',isActive:true,status:'active',basicSalary:9000})
 const owner=await f.repo('User').save({email:'owner'+k+'@review.invalid',displayName:'صاحب '+k,passwordHash:'synthetic',role:'employee',branchId:branch.id,employeeId:employee.id,permissions:'[]',isActive:true})
 const manager=await f.repo('User').save({email:'manager'+k+'@review.invalid',displayName:'معتمد '+k,passwordHash:'synthetic',role:'employee',branchId:branch.id,permissions:'["approve.hr"]',isActive:true})
 const chain=await f.repo('ApprovalChain').save({code:'P2FCH'+k,nameAr:'سلسلة مصطنعة',isActive:true,autoApprove:false})
 await f.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr'})
 const type=await f.repo('RequestType').save({code:'P2FT'+k,nameAr:'نوع طلب مصطنع '+k,category:'personal_data',destinationHandler:'none',approvalChainId:chain.id,isActive:true,isConfidential:false})
 await f.ok('PATCH','/notifications/preferences',{category:'approval',channel:'EMAIL',mode},manager)
 const request=await f.ok('POST','/requests',{typeCode:type.code,payload:{reason:'محتوى لا يدخل البريد'},submit:true},owner)
 await q.runOnce({limit:200})
 const [delivery]=await f.ds.query("SELECT d.* FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'request' AND n.entityId=@0 AND n.recipientUserId=@1 AND n.category=N'approval' AND d.channel=N'EMAIL'",[String(request.id),manager.id])
 assert.ok(delivery)
 return {branch,otherBranch,employee,stranger,owner,manager,request,type,delivery}
}
const state=id=>f.repo('NotificationDelivery').findOneByOrFail({id:String(id)})
const clock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
const secondInstance=()=>new (require('../src/notifications/notifications.service').NotificationsService)(f.ds,q,f.app.get(require('../src/auth/mail.service').MailService),f.app.get(require('../src/auth/auth.service').AuthService),f.app.get(require('../src/requests/requests.service').RequestsService),f.app.get(require('../src/modules-registry/modules.service').ModulesService),f.app.get(require('../node_modules/@nestjs/config').ConfigService))

test('P2F delivery lock spans SMTP across service instances and releases after failure without changing the request',async t=>{
 const s=await setup(),other=secondInstance(),before=await f.repo('Request').findOneByOrFail({id:s.request.id})
 let release,first
 f.mailbox.hold=new Promise(r=>release=r)
 f.mailbox.failure=new Error('synthetic temporary SMTP rejection')
 try{
  first=n.sendEmail(String(s.delivery.id),{attempt:1,maxAttempts:10}).then(()=>null,e=>e)
  for(let i=0;i<400&&f.mailbox.attempts.length===0;i++)await new Promise(r=>setTimeout(r,10))
  assert.equal(f.mailbox.attempts.length,1)
  const resource=`hr:notification-delivery:${s.delivery.id}`
  const [locked]=await f.ds.query("SELECT APPLOCK_TEST('public', @0, 'Exclusive', 'Session') AS available",[resource])
  assert.equal(locked.available,0)
  await other.sendEmail(String(s.delivery.id),{attempt:1,maxAttempts:10})
  assert.equal(f.mailbox.attempts.length,1)
  release();assert.ok(await first instanceof Error)
  assert.equal((await state(s.delivery.id)).status,'PENDING')
  const [free]=await f.ds.query("SELECT APPLOCK_TEST('public', @0, 'Exclusive', 'Session') AS available",[resource]);assert.equal(free.available,1)
  f.mailbox.failure=null;f.mailbox.hold=null
  await other.sendEmail(String(s.delivery.id),{attempt:2,maxAttempts:10})
  const saved=await state(s.delivery.id)
  assert.equal(f.mailbox.sent.length,1);assert.equal(saved.status,'SENT');assert.equal(saved.attempts,2)
  assert.deepEqual(await f.repo('Request').findOneByOrFail({id:s.request.id}),before)
  t.diagnostic(JSON.stringify({case:'lock-release-and-independent-instances',whileSending:locked.available,afterFailure:free.available,smtpCalls:2,sent:1,requestUnchanged:true}))
 }finally{release();if(first)await first;f.mailbox.hold=null;f.mailbox.failure=null}
})

test('P2F deferred digest is deduplicated, requeues when quiet hours extend, then is delivered once by the queue',async t=>{
 const s=await setup('DIGEST'),now=new Date(),minute=now.getHours()*60+now.getMinutes()
 const window=offset=>`${clock((minute+1430)%1440)}-${clock((minute+offset)%1440)}`
 await f.setting('notifications.quiet_hours',window(60));await f.setting('notifications.digest_hour',now.getHours())
 assert.equal(await n.digestHourlyWork(now),0);assert.equal(await n.digestHourlyWork(now),0)
 // runAfter is a UTC datetime2. Read SQL text to avoid the driver's useUTC=false
 // Date decoding, which interprets that unzoned value as local time.
 const jobRows=()=>f.ds.query("SELECT *,CONVERT(varchar(23),runAfter,126) AS runAfterUtc FROM jobs_queue WHERE jobType=N'notifications.digest-send' ORDER BY id")
 let jobs=await jobRows();assert.equal(jobs.length,1);assert.equal(jobs[0].status,'PENDING')
 const end=require('../src/notifications/notification-events').quietHoursEnd(now,require('../src/notifications/notification-events').parseQuietHours(window(60)))
 assert.equal(new Date(jobs[0].runAfterUtc+'Z').getTime(),end.getTime()+1000)
 await f.setting('notifications.quiet_hours',window(120))
 await f.ds.query("UPDATE jobs_queue SET runAfter=DATEADD(second,-1,SYSUTCDATETIME()) WHERE jobType=N'notifications.digest-send' AND status=N'PENDING'")
 await q.runOnce({limit:200})
 jobs=await jobRows();assert.equal(jobs.length,2);assert.deepEqual(jobs.map(x=>x.status),['DONE','PENDING']);assert.equal(f.mailbox.sent.length,0)
 await f.setting('notifications.quiet_hours','')
 await f.ds.query("UPDATE jobs_queue SET runAfter=DATEADD(second,-1,SYSUTCDATETIME()) WHERE jobType=N'notifications.digest-send' AND status=N'PENDING'")
 await q.runOnce({limit:200});await q.runOnce({limit:200})
 assert.equal(f.mailbox.sent.length,1);assert.equal((await state(s.delivery.id)).status,'SENT')
 t.diagnostic(JSON.stringify({case:'digest-queue-requeue',initialJobs:1,afterExtension:2,sentInQuiet:0,sentAfter:1,utcRunAfterCorrect:true}))
})

test('P2F self creator retains request read access after account relink but no longer receives the owners decision',async t=>{
 const outcomes=[]
 for(const mode of ['ON','DIGEST']){
  const s=await setup()
  await f.ok('PATCH','/notifications/preferences',{category:'request',channel:'EMAIL',mode},s.owner)
  await f.ok('POST',`/requests/${s.request.id}/act`,{action:'APPROVE',comment:'موافقة مصطنعة'},s.manager)
  await q.runOnce({limit:200})
  const [d]=await f.ds.query("SELECT d.* FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'request' AND n.entityId=@0 AND n.recipientUserId=@1 AND n.category=N'request' AND d.channel=N'EMAIL'",[String(s.request.id),s.owner.id]);assert.ok(d)
  await f.ok('PATCH',`/users/${s.owner.id}`,{employeeId:s.stranger.id,branchId:s.otherBranch.id},f.admin)
  const fresh=await f.repo('User').findOneByOrFail({id:s.owner.id})
  const read=await f.request('GET',`/requests/${s.request.id}`,undefined,fresh);assert.equal(read.status,200)
  const count=f.mailbox.sent.length
  if(mode==='ON')await n.sendEmail(String(d.id),{attempt:1,maxAttempts:10});else await n.sendDigests()
  assert.equal(f.mailbox.sent.length,count);assert.equal((await state(d.id)).status,'SKIPPED')
  outcomes.push({mode,read:read.status,delivery:'SKIPPED'})
 }
 t.diagnostic(JSON.stringify({case:'creator-is-not-current-owner',outcomes}))
})

test('P2F making a request type confidential after distribution suppresses its prepared approver mail in both channels',async t=>{
 const outcomes=[]
 for(const mode of ['ON','DIGEST']){
  const s=await setup(mode),before=f.mailbox.sent.length
  await f.repo('RequestType').update({id:s.type.id},{isConfidential:true})
  if(mode==='ON')await n.sendEmail(String(s.delivery.id),{attempt:1,maxAttempts:10});else await n.sendDigests()
  assert.equal(f.mailbox.sent.length,before);assert.equal((await state(s.delivery.id)).status,'SKIPPED')
  outcomes.push({mode,sent:0,status:'SKIPPED'})
 }
 t.diagnostic(JSON.stringify({case:'new-confidentiality',outcomes}))
})
