'use strict'
const {test,before,after,afterEach}=require('node:test'),assert=require('node:assert/strict')
let f,taskService,notices,queue,onboarding,seq=0
before(async()=>{
 f=await require('./codex-review-p2g-fixture.cjs')('p2g_independent')
 taskService=f.app.get(require('../src/tasks/tasks.service').TasksService)
 notices=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 queue=f.app.get(require('../src/queue/queue.service').QueueService)
 onboarding=f.app.get(require('../src/onboarding/onboarding.service').OnboardingService)
 await f.setting('notifications.email.enabled','false')
},{timeout:120000})
after(async()=>{if(f)await f.close()})
afterEach(async()=>{
 if(!f)return
 await f.setting('notifications.email.enabled','false');await f.setting('notifications.quiet_hours','')
 f.mailbox.sent.length=0;f.mailbox.attempts.length=0
 await f.ds.query("UPDATE notification_deliveries SET status=N'SKIPPED' WHERE status IN (N'PENDING',N'DIGEST')")
 await f.ds.query("UPDATE jobs_queue SET status=N'DONE' WHERE status IN (N'PENDING',N'RUNNING')")
 await f.ds.query('UPDATE outbox_events SET dispatchedAt=SYSUTCDATETIME() WHERE dispatchedAt IS NULL')
})
const day=n=>require('../src/tasks/task-rules').taskAddDays(require('../src/tasks/task-rules').taskLocalDate(new Date()),n)
async function setup(){
 const k=++seq
 const a=await f.repo('Branch').save({name:'فرع مراجعة أ '+k,code:'PG'+k})
 const b=await f.repo('Branch').save({name:'فرع مراجعة ب '+k,code:'PGX'+k})
 const emp=async(code,branchId,managerEmployeeId=null)=>f.repo('Employee').save({employeeCode:code+k,fullName:'موظف مصطنع '+code+k,branchId,managerEmployeeId,joinDate:day(0),basicSalary:6000,status:'active',isActive:true})
 const manager=await emp('GM',a.id),worker=await emp('GW',a.id,manager.id),foreign=await emp('GX',b.id),replacement=await emp('GR',b.id)
 const user=async(label,employeeId,branchId,permissions)=>f.repo('User').save({email:label+k+'@review.invalid',displayName:'حساب '+label+k,passwordHash:'synthetic',role:'employee',employeeId,branchId,permissions:JSON.stringify(permissions),isActive:true})
 const boss=await user('boss',manager.id,a.id,[]),owner=await user('owner',worker.id,a.id,[]),stranger=await user('stranger',foreign.id,b.id,[])
 const hr=await user('hr',null,a.id,['tasks.manage','tasks.view_all','approve.hr'])
 return{k,a,b,manager,worker,foreign,replacement,boss,owner,stranger,hr}
}
const create=(s,actor=s.boss,extra={})=>f.ok('POST','/tasks',{title:'مهمة مصطنعة '+s.k,assigneeEmployeeId:s.worker.id,...extra},actor)

test('P2G task scope, role scope and current manager identity are enforced without an existence signal',async t=>{
 const s=await setup(),row=await create(s)
 const hidden=await f.request('GET',`/tasks/${row.id}`,undefined,s.stranger),missing=await f.request('GET','/tasks/987654321',undefined,s.stranger)
 assert.equal(hidden.status,404);assert.deepEqual(hidden.body,missing.body)
 const foreign=await f.request('POST','/tasks',{title:'ممنوع',assigneeEmployeeId:s.foreign.id},s.hr)
 const absent=await f.request('POST','/tasks',{title:'ممنوع',assigneeEmployeeId:987654321},s.hr)
 assert.equal(foreign.status,404);assert.deepEqual(foreign.body,absent.body)
 assert.deepEqual((await f.ok('GET','/tasks/assignees',undefined,s.stranger)).employees,[])
 const role=await f.ok('POST','/tasks',{title:'مهمة الموارد',assigneeRole:'hr',branchId:s.a.id},s.hr)
 assert.ok((await f.ok('GET','/tasks/mine',undefined,s.hr)).tasks.some(x=>x.id===role.id))
 assert.ok(!(await f.ok('GET','/tasks/mine',undefined,f.admin)).tasks.some(x=>x.id===role.id))
 await f.ok('PATCH',`/users/${s.boss.id}`,{employeeId:s.replacement.id,branchId:s.b.id},f.admin)
 const fresh=await f.repo('User').findOneByOrFail({id:s.boss.id})
 for(const [method,path,body] of [['GET',`/tasks/${row.id}`,undefined],['PATCH',`/tasks/${row.id}`,{title:'لا يتغير'}],['POST',`/tasks/${row.id}/status`,{status:'CANCELLED',note:'لا يتغير'}]])assert.equal((await f.request(method,path,body,fresh)).status,404)
 const stored=await f.repo('Task').findOneByOrFail({id:row.id});assert.equal(stored.title,row.title);assert.equal(stored.status,'OPEN')
 t.diagnostic(JSON.stringify({case:'scope-and-relinked-manager',hidden:404,unknown:404,removedCreatorActions:404,unchanged:true}))
})

test('P2G employee assignment survives a branch move and same-assignee edit; forwarding outside authority is rejected',async t=>{
 const s=await setup(),row=await create(s)
 await f.repo('Employee').update({id:s.worker.id},{branchId:s.b.id})
 const saved=await f.ok('PATCH',`/tasks/${row.id}`,{assigneeEmployeeId:s.worker.id,title:'بعد النقل'},s.boss)
 assert.equal(saved.branchId,s.a.id)
 assert.equal((await f.ok('GET','/tasks/assignees',undefined,s.boss)).employees.some(x=>x.id===s.worker.id),true)
 const refused=await f.request('PATCH',`/tasks/${row.id}`,{assigneeEmployeeId:s.foreign.id},s.boss);assert.equal(refused.status,403)
 assert.equal((await f.repo('Task').findOneByOrFail({id:row.id})).assigneeEmployeeId,s.worker.id)
 const done=await f.ok('POST',`/tasks/${row.id}/status`,{status:'DONE',proofNote:'تم'},s.owner)
 assert.equal(done.status,'DONE')
 t.diagnostic(JSON.stringify({case:'stamped-branch-and-direct-manager',keptBranch:true,unrelatedTransfer:403,ownerClose:201}))
})

test('P2G task creation, reassignment and reminder stamps roll back if the outbox write fails',async t=>{
 const s=await setup(),row=await create(s,s.hr,{dueDate:day(0)}),before=await f.repo('Task').findOneByOrFail({id:row.id}),count=await f.repo('Task').count()
 await f.ds.query("CREATE TRIGGER codex_p2g_reject_task_events ON outbox_events AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE eventType IN (N'TASK_ASSIGNED',N'TASK_DUE_SOON')) THROW 59002, 'Synthetic task event failure', 1; END")
 let made,moved,reminders
 try{
  made=await f.request('POST','/tasks',{title:'فشل كامل',assigneeEmployeeId:s.worker.id},s.hr)
  moved=await f.request('PATCH',`/tasks/${row.id}`,{assigneeEmployeeId:s.foreign.id},f.admin)
  reminders=await taskService.runReminders(day(0))
 }finally{await f.ds.query('DROP TRIGGER codex_p2g_reject_task_events')}
 assert.equal(made.status,500);assert.equal(moved.status,500);assert.equal(reminders.reminded,0)
 assert.equal(await f.repo('Task').count(),count);assert.deepEqual(await f.repo('Task').findOneByOrFail({id:row.id}),before)
 t.diagnostic(JSON.stringify({case:'task-outbox-atomicity',create:500,reassign:500,reminded:0,rowAndCountUnchanged:true}))
})

test('P2G hiring-document work must reappear in My Tasks when its required catalogue flag changes',async t=>{
 const s=await setup()
 const doc=await f.ok('POST','/catalogs/doc-types',{code:'P2G_DOC'+s.k,nameAr:'مستند مصطنع '+s.k,isActive:true,requiredForHiring:true})
 await onboarding.materializeHired(s.worker.id)
 const system=await f.repo('OnboardingTask').findOneByOrFail({employeeId:s.worker.id,systemKey:'HIRING_DOCS'})
 await f.ok('PATCH',`/catalogs/doc-types/${doc.id}`,{requiredForHiring:false})
 await f.ok('GET','/onboarding',undefined,s.hr)
 assert.equal((await f.repo('OnboardingTask').findOneByOrFail({id:system.id})).status,'DONE')
 await f.ok('PATCH',`/catalogs/doc-types/${doc.id}`,{requiredForHiring:true})
 const before=await f.ok('GET','/tasks/mine',undefined,s.hr)
 const screen=await f.ok('GET','/onboarding',undefined,s.hr)
 const onScreen=screen.employees.find(x=>x.id===s.worker.id).tasks.find(x=>x.id===system.id)
 const after=await f.ok('GET','/tasks/mine',undefined,s.hr)
 await f.ok('PATCH',`/catalogs/doc-types/${doc.id}`,{requiredForHiring:false})
 t.diagnostic(JSON.stringify({case:'hiring-docs-current-state',beforeSourceRead:before.onboarding.some(x=>x.taskId===system.id),sourceStatus:onScreen.status,sourceCanAct:onScreen.canAct,afterSourceRead:after.onboarding.some(x=>x.taskId===system.id)}))
 assert.equal(onScreen.status,'PENDING');assert.equal(onScreen.canAct,true)
 assert.ok(before.onboarding.some(x=>x.taskId===system.id),'Current required documents must not depend on opening the source screen first')
})

test('P2G an old reminder cannot become valid again merely because the new due date got a fresh reminder stamp',async t=>{
 const results=[]
 for(const mode of ['ON','DIGEST']){
  const s=await setup(),row=await create(s,s.boss,{dueDate:day(0)})
  await queue.runOnce({limit:200}) // assigned event while mail remains off
  await f.setting('notifications.email.enabled','true')
  await f.ok('PATCH','/notifications/preferences',{category:'task',channel:'EMAIL',mode},s.owner)
  await taskService.runReminders(day(0));await queue.runOnce({limit:200})
  const [delivery]=await f.ds.query("SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'task' AND n.entityId=@0 AND n.eventCode=N'task.due_soon' AND n.recipientUserId=@1 AND d.channel=N'EMAIL' ORDER BY d.id DESC",[String(row.id),s.owner.id]);assert.ok(delivery)
  await f.ok('PATCH',`/tasks/${row.id}`,{dueDate:day(1)},s.boss)
  await taskService.runReminders(day(0)) // fresh event not yet distributed; old queued delivery runs first
  const mailBefore=f.mailbox.sent.length
  if(mode==='ON')await notices.sendEmail(String(delivery.id),{attempt:1,maxAttempts:10});else await notices.sendDigests()
  const texts=f.mailbox.sent.slice(mailBefore).map(x=>x.text)
  const state=await f.repo('NotificationDelivery').findOneByOrFail({id:String(delivery.id)})
  results.push({mode,currentDue:day(1),oldDue:day(0),sent:texts.length,oldDateInBody:texts.some(text=>text.includes(day(0))),status:state.status})
  await f.setting('notifications.email.enabled','false')
 }
 t.diagnostic(JSON.stringify({case:'reminder-rearmed-stamp',results}))
 assert.ok(results.every(x=>!x.oldDateInBody),'A new stamp must not authorize the old deadline text')
})
