'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
let f
before(async()=>{f=await require('./codex-review-p2n-document-fixture.cjs')('p2n_independent')},{timeout:180000})
after(async()=>{if(f)await f.close()})
const tasks=()=>f.app.get(require('../src/tasks/tasks.service').TasksService)
async function locked(sql,params,start,count=1,whileWaiting){
 const q=f.ds.createQueryRunner();await q.connect();await q.startTransaction();let pending
 try{
  await q.query(sql,params);pending=start();let blocked=0
  for(let i=0;i<400&&blocked<count;i++){await new Promise(r=>setTimeout(r,20));blocked=Number((await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)}
  assert.equal(blocked,count,'Requests reached the SQL lock');if(whileWaiting)await whileWaiting();await q.commitTransaction();return await pending
 }finally{if(q.isTransactionActive)await q.rollbackTransaction();await q.release();if(pending)await pending.catch(()=>{})}
}

test('P2N identity: supported rebind and deactivation reject old sessions; current branch readers and owner remain correctly separated',async()=>{
 const e=await f.employee(),e2=await f.employee(),u=await f.account(e),doc=await f.issue(e),doc2=await f.issue(e2),c=await f.columns(doc.id)
 assert.equal((await f.request('GET',`/hr-documents/issued/${doc.id}/acknowledgement`,undefined,u)).status,200)
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:e2.id})
 const current=await f.repo('User').findOneByOrFail({id:u.id})
 assert.equal((await f.ack(u,doc.id,c.ackContentHash)).status,401)
 for(const id of [doc.id,2147483647])assert.equal((await f.request('GET',`/hr-documents/issued/${id}/acknowledgement`,undefined,current)).status,404)
 assert.equal((await f.ack(current,doc.id,c.ackContentHash)).status,404)
 const mine=await f.ok('GET','/hr-documents/mine/acknowledgements',undefined,current);assert.deepEqual(mine.documents.map(x=>x.id),[doc2.id]);assert.ok(!JSON.stringify(mine).includes('contentHash'))
 await f.ok('PATCH',`/users/${current.id}`,{isActive:false});assert.equal((await f.ack(current,doc2.id,(await f.columns(doc2.id)).ackContentHash)).status,401)
 const moved=await f.issue(),m=await f.columns(moved.id)
 await f.repo('Employee').update({id:f.employeeA.id},{branchId:f.B.id,status:'terminated',isActive:false})
 assert.equal((await f.cancel(f.hrA,moved.id)).status,404)
 assert.ok(!(await f.ok('GET','/hr-documents/issued?ack=pending',undefined,f.hrA)).some(d=>d.id===moved.id))
 assert.ok((await f.ok('GET','/hr-documents/issued?ack=pending',undefined,f.hrB)).some(d=>d.id===moved.id))
 // Existing self documents remain readable after transfer/termination while the account is active.
 assert.equal((await f.request('GET',`/hr-documents/issued/${moved.id}/acknowledgement`,undefined,f.self)).status,200)
 assert.equal((await f.cancel(f.hrB,moved.id)).status,201);assert.equal((await f.ack(f.self,moved.id,m.ackContentHash)).status,404)
 await f.repo('Employee').update({id:f.employeeA.id},{branchId:f.A.id,status:'active',isActive:true})
})

test('P2N concurrency: acknowledgement versus cancellation and two cancellations leave one consistent document/task outcome',async t=>{
 const doc=await f.issue(),c=await f.columns(doc.id)
 const pair=await locked('SELECT id FROM hr_issued_documents WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[doc.id],()=>Promise.all([f.ack(f.self,doc.id,c.ackContentHash),f.cancel(f.hrA,doc.id)]),2)
 const proof=await f.repo('HrDocumentAcknowledgement').findBy({documentId:doc.id}),task=await f.repo('Task').findOneByOrFail({id:c.ackTaskId}),current=await f.columns(doc.id)
 if(proof.length){assert.equal(proof.length,1);assert.deepEqual(pair.map(r=>r.status),[201,400]);assert.equal(task.status,'DONE');assert.ok(current.ackRequestedAt)}
 else{assert.deepEqual(pair.map(r=>r.status),[404,201]);assert.equal(task.status,'CANCELLED');assert.equal(current.ackRequestedAt,null)}
 const d=await f.issue(),cols=await f.columns(d.id)
 const cancelled=await locked('SELECT id FROM hr_issued_documents WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[d.id],()=>Promise.all([f.cancel(f.hrA,d.id),f.cancel(f.hrA,d.id)]),2)
 assert.deepEqual(cancelled.map(x=>x.status).sort(),[201,400]);assert.equal((await f.repo('Task').findOneByOrFail({id:cols.ackTaskId})).status,'CANCELLED');assert.equal(await f.repo('HrDocumentAcknowledgement').countBy({documentId:d.id}),0)
 t.diagnostic(JSON.stringify({case:'ack-cancel-consistency',responses:pair.map(x=>x.status),twoCancels:cancelled.map(x=>x.status)}))
})

test('P2N rollback: a task-link failure rolls back issuing, stored-file rows and actual bytes; task-close failure rolls back evidence',async()=>{
 const {EntityManager}=require('../node_modules/typeorm'),query=EntityManager.prototype.query
 const counts=async()=>Promise.all(['HrIssuedDocument','StoredFile','Task','HrDocumentAcknowledgement'].map(n=>f.repo(n).count()))
 const disk=()=>{const root=process.env.UPLOADS_ROOT,out=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else out.push(p)}}walk(root);return out.sort()}
 const before=await counts(),files=disk();let hit=false
 EntityManager.prototype.query=function(sql,...args){if(!hit&&String(sql).includes('UPDATE [hr_issued_documents] SET [ackRequestedAt]')){hit=true;throw Error('Synthetic task-link failure')}return query.call(this,sql,...args)}
 let answer;try{answer=await f.request('POST','/hr-documents/issue',f.input(),f.hrA)}finally{EntityManager.prototype.query=query}
 assert.ok(hit);assert.equal(answer.status,500);assert.deepEqual(await counts(),before);assert.deepEqual(disk(),files)
 const d=await f.issue(),c=await f.columns(d.id),update=EntityManager.prototype.update;hit=false
 EntityManager.prototype.update=function(target,criteria,partial){if(!hit&&target?.name==='Task'&&partial.status==='DONE'){hit=true;throw Error('Synthetic task-close failure')}return update.call(this,target,criteria,partial)}
 try{answer=await f.ack(f.self,d.id,c.ackContentHash)}finally{EntityManager.prototype.update=update}
 assert.ok(hit);assert.equal(answer.status,500);assert.equal(await f.repo('HrDocumentAcknowledgement').countBy({documentId:d.id}),0);assert.equal((await f.repo('Task').findOneByOrFail({id:c.ackTaskId})).status,'OPEN')
 assert.equal((await f.ack(f.self,d.id,c.ackContentHash)).status,201)
})

test('P2N issuance: transfer committed while issuing waits must reject the old branch without a document or task',async()=>{
 const e=await f.employee(),input=f.input(e),before=await f.repo('HrIssuedDocument').count()
 const r=await locked('SELECT id FROM hr_document_templates WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[f.template.id],()=>f.request('POST','/hr-documents/issue',input,f.hrA),1,()=>f.repo('Employee').update({id:e.id},{branchId:f.B.id}))
 assert.equal(r.status,403);assert.equal(await f.repo('HrIssuedDocument').count(),before)
 assert.equal(await f.repo('Task').countBy({assigneeEmployeeId:e.id}),0)
})

test('P2N mail: immediate and digest delivery revalidate acknowledgement/cancellation; active control sends only through the instance mock',async()=>{
 const n=f.app.get(require('../src/notifications/notifications.service').NotificationsService)
 const event=async taskId=>{const [e]=await f.ds.query("SELECT TOP(1) id,eventType,payload FROM outbox_events WHERE entityType=N'task' AND entityId=@0 AND eventType=N'TASK_ASSIGNED' ORDER BY id DESC",[String(taskId)]);assert.ok(e);return{id:e.id,type:e.eventType,payload:JSON.parse(e.payload)}}
 const deliveries=async id=>f.ds.query("SELECT d.id,d.status FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'task' AND n.entityId=@0 AND d.channel=N'EMAIL'",[String(id)])
 assert.notEqual(f.app.get(require('../src/auth/mail.service').MailService).send,require('../src/auth/mail.service').MailService.prototype.send)
 await f.setting('notifications.email.enabled','true');await f.setting('notifications.quiet_hours','')
 try{
  for(const mode of ['ON','DIGEST']){
   await f.ok('PATCH','/notifications/preferences',{category:'task',channel:'EMAIL',mode},f.self)
   const d=await f.issue(),c=await f.columns(d.id),ev=await event(c.ackTaskId);assert.equal(await n.dispatch(ev),1)
   const rows=await deliveries(c.ackTaskId);assert.equal(rows.length,1)
   if(mode==='ON')assert.equal((await f.ack(f.self,d.id,c.ackContentHash)).status,201);else assert.equal((await f.cancel(f.hrA,d.id)).status,201)
   const before=f.mailbox.sent.length
   if(mode==='ON')await n.sendEmail(String(rows[0].id),{attempt:1,maxAttempts:10});else assert.equal(await n.sendDigests(),0)
   assert.equal(f.mailbox.sent.length,before);assert.equal((await deliveries(c.ackTaskId))[0].status,'SKIPPED');assert.equal(await n.dispatch(ev),0)
  }
  await f.ok('PATCH','/notifications/preferences',{category:'task',channel:'EMAIL',mode:'ON'},f.self)
  const d=await f.issue(),c=await f.columns(d.id);assert.equal(await n.dispatch(await event(c.ackTaskId)),1)
  const before=f.mailbox.sent.length;await n.sendEmail(String((await deliveries(c.ackTaskId))[0].id),{attempt:1,maxAttempts:10});assert.equal(f.mailbox.sent.length,before+1)
  assert.ok(!JSON.stringify(f.mailbox.sent.at(-1)).includes(f.template.name))
 }finally{await f.setting('notifications.email.enabled','false')}
})
