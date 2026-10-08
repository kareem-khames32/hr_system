'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
let f,A,B,n=0,notifications,today,expiryRules,addDays
before(async()=>{
 f=await require('./codex-review-p3h-fixture.cjs')('p3h_docs')
 A=await f.repo('Branch').save({code:'P3HDA',name:'Synthetic document branch A',country:'EG'})
 B=await f.repo('Branch').save({code:'P3HDB',name:'Synthetic document branch B',country:'EG'})
 today=require('../src/attendance/attendance.service').localDateOf(new Date());addDays=require('../src/employees/employee-suspension-rules').addDays
 expiryRules=require('../src/assets/document-expiry');notifications=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 await f.setting(require('../src/notifications/notifications.service').NOTIFICATIONS_EMAIL_ENABLED_KEY,'true')
 const type=(await f.ok('GET','/documents/expiry-settings')).types.find(t=>t.code==='iqama')
 await f.ok('PATCH','/documents/expiry-settings/'+type.id,{hasExpiry:true,alertDays:[30],ownerRole:'hr'})
})
after(async()=>{if(f)await f.close()})
async function employee(branch=A){return f.repo('Employee').save({employeeCode:'P3HD'+(++n),fullName:'Synthetic document employee '+n,branchId:branch.id,status:'active',isActive:true,joinDate:'2020-01-01'})}
async function user(e){return f.repo('User').save({email:crypto.randomUUID()+'@review.invalid',displayName:'Synthetic document account',passwordHash:'unusable',role:'employee',permissions:'[]',employeeId:e.id,branchId:A.id,isActive:true})}
async function eventOf(doc){return f.repo('OutboxEvent').findOneByOrFail({eventKey:`document-expiring:${doc.id}:${addDays(today,20)}:30`})}
async function delivery(doc,account){const event=await eventOf(doc);await notifications.dispatch({id:String(event.id),type:'DOCUMENT_EXPIRING',payload:JSON.parse(event.payload)});const [row]=await f.ds.query(`SELECT d.id FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'employee_document' AND n.entityId=@0 AND n.recipientUserId=@1 AND d.channel=N'EMAIL'`,[String(doc.id),account.id]);assert.ok(row);return String(row.id)}
test('P3H-E01: simultaneous expiry scans create one event and one renewal task',async()=>{
 const e=await employee(),doc=await f.ok('POST','/documents',{employeeId:e.id,docType:'iqama',expiryDate:addDays(today,20)})
 const runs=await Promise.all([expiryRules.raiseDocumentAlerts(f.ds,today),expiryRules.raiseDocumentAlerts(f.ds,today)])
 assert.equal(runs.reduce((s,r)=>s+r.events,0),1);assert.equal(runs.reduce((s,r)=>s+r.tasks,0),1)
 const event=await eventOf(doc);assert.ok(event)
 const [row]=await f.ds.query('SELECT renewalTaskId FROM employee_documents WHERE id=@0',[doc.id]);assert.ok(row.renewalTaskId)
 assert.equal(await f.repo('Task').count(),1)
})
test('P3H-E02: queued document email is suppressed after recipient account is rebound',async()=>{
 const e=await employee(),next=await employee(B),account=await user(e),doc=await f.ok('POST','/documents',{employeeId:e.id,docType:'iqama',expiryDate:addDays(today,20)})
 await expiryRules.raiseDocumentAlerts(f.ds,today);const id=await delivery(doc,account)
 await f.ok('PATCH','/users/'+account.id,{employeeId:next.id});f.mailbox.sent.length=0
 await notifications.sendEmail(id,{attempt:1,maxAttempts:3});assert.equal(f.mailbox.sent.length,0)
 const [row]=await f.ds.query('SELECT status FROM notification_deliveries WHERE id=@0',[id]);assert.equal(row.status,'SKIPPED')
})
test('P3H-E03: a queued alert must be suppressed when a replacement document already supersedes it',async()=>{
 const e=await employee(),account=await user(e),doc=await f.ok('POST','/documents',{employeeId:e.id,docType:'iqama',expiryDate:addDays(today,20)})
 await expiryRules.raiseDocumentAlerts(f.ds,today);const id=await delivery(doc,account)
 await f.ok('POST','/documents',{employeeId:e.id,docType:'iqama',expiryDate:addDays(today,300)})
 const report=await f.ok('GET','/documents/expiry?days=30');assert.equal(report.rows.some(r=>r.id===doc.id),false)
 f.mailbox.sent.length=0;await notifications.sendEmail(id,{attempt:1,maxAttempts:3})
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'superseded-document-email',reportHidesOldDocument:true,mails:f.mailbox.sent.length}))
 assert.equal(f.mailbox.sent.length,0,'a replaced document must not send its old expiry alert')
})
