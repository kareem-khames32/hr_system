'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
let f
before(async()=>{f=await require('./codex-review-p2s-comments-fixture.cjs')('p2s_independent')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2S internal rows cannot alter public truncation, reply references or author identity after transfer',async()=>{
 const req=await f.submit(),author=await f.employee(f.B),u=await f.account(author,['requests.view_all'],f.A)
 const publicRow=await f.say(f.managerU,req.id,'Synthetic public text');assert.equal(publicRow.status,201)
 const before=await f.thread(f.workerU,req.id)
 for(let i=0;i<3;i++)assert.equal((await f.say(u,req.id,{body:'Synthetic secret '+i,internal:true})).status,201)
 await f.ds.query("INSERT INTO comments(entityType,entityId,authorUserId,authorEmployeeId,body,internal,mentions,createdAt) SELECT TOP(201) N'request',@0,@1,@2,N'Synthetic hidden filler',1,NULL,SYSUTCDATETIME() FROM sys.all_objects",[req.id,u.id,author.id])
 assert.deepEqual((await f.thread(f.workerU,req.id)).body,before.body)
 const hidden=(await f.thread(f.hrU,req.id)).body.comments.at(-1)
 assert.equal((await f.say(f.workerU,req.id,{body:'Synthetic probe',replyTo:[hidden.ref]})).status,400)
 assert.equal((await f.say(f.workerU,req.id,{body:'Synthetic probe',replyTo:['f'.repeat(20)]})).status,400)
 assert.equal((await f.say(f.workerU,req.id,{body:'Synthetic reply',replyTo:[publicRow.body.ref]})).status,201)
 assert.equal(hidden.author.name,null,'Nonparty reader cannot see author from branch B')
 await f.repo('Employee').update(author.id,{branchId:f.A.id})
 const visible=(await f.thread(f.hrU,req.id)).body.comments.find(row=>row.ref===hidden.ref)
 assert.equal(visible.author.name,author.fullName)
 assert.equal(JSON.stringify(visible).includes('authorEmployeeId'),false)
 assert.equal(JSON.stringify(visible).includes('authorUserId'),false)
})
test('P2S comment rollback and deadlock retry leave exactly one comment, attachment binding and outbox event',async()=>{
 const req=await f.submit(),file=await f.upload(f.workerU),{EntityManager}=require('../node_modules/typeorm'),original=EntityManager.prototype.query
 let intercept=true
 EntityManager.prototype.query=async function(sql,...args){
  const result=await original.call(this,sql,...args)
  if(intercept&&this.connection.options.database===f.database&&/INSERT INTO \[outbox_events\]/i.test(sql)){
   intercept=false;const error=Error('Synthetic transaction deadlock after outbox insert');error.number=1205;throw error
  }
  return result
 }
 let response
 try{response=await f.say(f.workerU,req.id,{body:'Synthetic retried exactly once',targets:['CURRENT_APPROVERS'],fileIds:[file.id]})}finally{EntityManager.prototype.query=original}
 assert.equal(intercept,false);assert.equal(response.status,201)
 const rows=await f.repo('Comment').findBy({entityType:'request',entityId:req.id})
 assert.equal(rows.length,1)
 assert.equal((await f.repo('StoredFile').findOneByOrFail({id:file.id})).entityId,rows[0].id)
 assert.equal(Number((await f.ds.query("SELECT COUNT(*) n FROM outbox_events WHERE eventType=N'COMMENT_MENTION' AND entityId=@0",[String(rows[0].id)]))[0].n),1)
 const failedFile=await f.upload(f.workerU)
 let failing=true
 EntityManager.prototype.query=async function(sql,...args){const result=await original.call(this,sql,...args);if(failing&&this.connection.options.database===f.database&&/INSERT INTO \[outbox_events\]/i.test(sql)){failing=false;throw Error('Synthetic nonretryable outbox failure')}return result}
 try{assert.equal((await f.say(f.workerU,req.id,{body:'Synthetic rolled back',targets:['CURRENT_APPROVERS'],fileIds:[failedFile.id]})).status,500)}finally{EntityManager.prototype.query=original}
 assert.equal(await f.repo('Comment').countBy({entityType:'request',entityId:req.id}),1)
 assert.equal((await f.repo('StoredFile').findOneByOrFail({id:failedFile.id})).entityId,null)
})
test('P2S immediate and digest email recheck current requester identity, with active-recipient controls',async t=>{
 await f.setting('notifications.email.enabled','true');await f.setting('notifications.quiet_hours','')
 const cases=[]
 for(const mode of ['ON','DIGEST'])for(const revoked of [false,true]){
  const owner=await f.employee(f.A,{managerEmployeeId:f.manager.id}),u=await f.account(owner)
  await f.ok('PATCH','/notifications/preferences',{category:'comment',channel:'EMAIL',mode},u)
  const req=await f.submit(f.proxyU,{onBehalfEmployeeId:owner.id})
  const text='Synthetic never-in-email '+crypto.randomUUID(),written=await f.say(f.managerU,req.id,{body:text,targets:['REQUESTER']})
  assert.equal(written.status,201)
  const comment=await f.dispatch(written.body.ref)
  const [delivery]=await f.ds.query("SELECT d.id,d.status FROM notification_deliveries d JOIN notifications n ON n.id=d.notificationId WHERE n.entityType=N'comment' AND n.entityId=@0 AND n.recipientUserId=@1 AND d.channel=N'EMAIL'",[String(comment.id),u.id])
  assert.ok(delivery);assert.equal(delivery.status,mode==='ON'?'PENDING':'DIGEST')
  if(revoked)await f.ok('PATCH',`/users/${u.id}`,{employeeId:null})
  const count=f.mailbox.sent.length
  if(mode==='ON')await f.notificationService.sendEmail(String(delivery.id),{attempt:1,maxAttempts:10});else await f.notificationService.sendDigests()
  const [saved]=await f.ds.query('SELECT status FROM notification_deliveries WHERE id=@0',[delivery.id])
  assert.equal(saved.status,revoked?'SKIPPED':'SENT');assert.equal(f.mailbox.sent.length-count,revoked?0:1)
  assert.equal(JSON.stringify(f.mailbox.sent).includes(text),false)
  cases.push({mode,revoked,status:saved.status})
 }
 await f.setting('notifications.email.enabled','false')
 t.diagnostic(JSON.stringify({emailIdentityChecks:cases,realMail:false}))
})
test('P2S all four comment endpoints and upload remain behind the policy acknowledgement gate',async()=>{
 const req=await f.submit(),task=await f.ok('POST','/tasks',{title:'Synthetic gate control',assigneeEmployeeId:f.worker.id},f.hrU)
 const policy=await f.ok('POST','/policies',{title:'Synthetic mandatory gate',isMandatory:true,graceDays:0})
 const now=new Date(),today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
 const version=await f.ok('POST',`/policies/${policy.id}/versions`,{bodyText:'Synthetic gate policy',effectiveDate:today})
 // Age only this fixture's published version, as in the existing policy gate integration fixture.
 await f.ds.query('UPDATE policy_versions SET effectiveDate=DATEADD(day,-3,CAST(GETDATE() AS date)) WHERE id=@0',[version.id])
 await f.app.get(require('../src/policies/policy-gate').PolicyGate).changed()
 for(const kind of ['requests','tasks'])for(const method of ['GET','POST']){
  const id=kind==='requests'?req.id:task.id,response=await f.request(method,`/${kind}/${id}/comments`,method==='POST'?{body:'Synthetic blocked'}:undefined,f.workerU)
  assert.equal(response.status,403);assert.equal(response.body.code,'POLICY_ACK_REQUIRED')
 }
 assert.equal(await f.repo('Comment').countBy({entityType:'task',entityId:task.id}),0)
 const form=new FormData();form.append('file',new Blob([f.png],{type:'image/png'}),'synthetic-blocked.png')
 const upload=await fetch('http://127.0.0.1:1/api/files/upload?entityType=comment',{method:'POST',headers:f.headers(f.workerU),body:form})
 assert.equal(upload.status,403);assert.equal((await upload.json()).code,'POLICY_ACK_REQUIRED')
 await f.ok('POST',`/policies/${policy.id}/withdraw`,{})
 assert.equal((await f.thread(f.workerU,req.id)).status,200)
})
