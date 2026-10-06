'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
const rcsi=process.env.REVIEW_RCSI==='true'
let f
before(async()=>{f=await require('./codex-review-p2r-comments-fixture.cjs')('p2r_concurrency',{rcsi})},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function blocked(sql,args,start,during,count=1){
 const holder=f.ds.createQueryRunner();await holder.connect();await holder.startTransaction();let pending
 try{
  await holder.query(sql,args);pending=start();let blocked=0
  for(let i=0;i<500&&blocked<count;i++){await new Promise(r=>setTimeout(r,20));blocked=Number((await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)}
  assert.equal(blocked,count,'Real SQL waiters reached the held row');if(during)await during(holder)
  await holder.commitTransaction();return await pending
 }finally{if(holder.isTransactionActive)await holder.rollbackTransaction();await holder.release();if(pending)await pending.catch(()=>{})}
}
test('P2R two comments race for one attachment with RCSI='+rcsi,async t=>{
 const [a,b]=[await f.submit(),await f.submit()],file=await f.upload(f.workerU)
 const results=await blocked('SELECT id FROM stored_files WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[file.id],()=>Promise.all([a,b].map(req=>f.say(f.workerU,req.id,{body:'Synthetic shared attachment',fileIds:[file.id],targets:['CURRENT_APPROVERS']}))),null,2)
 assert.deepEqual(results.map(r=>r.status).sort(),[201,400])
 const rows=await f.ds.query("SELECT id FROM comments WHERE entityType=N'request' AND entityId IN(@0,@1)",[a.id,b.id]);assert.equal(rows.length,1)
 assert.equal((await f.repo('StoredFile').findOneByOrFail({id:file.id})).entityId,rows[0].id)
 assert.equal(Number((await f.ds.query("SELECT COUNT(*) n FROM outbox_events WHERE eventType=N'COMMENT_MENTION'"))[0].n),1)
 t.diagnostic(JSON.stringify({rcsi,sharedFileStatuses:results.map(r=>r.status),comments:1,mentionEvents:1}))
})
test('P2R task transfer while comment waits rechecks the new assignee with RCSI='+rcsi,async()=>{
 const task=await f.ok('POST','/tasks',{title:'Synthetic moved task',assigneeEmployeeId:f.worker.id},f.hrU)
 const result=await blocked('SELECT id FROM tasks WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[task.id],()=>f.say(f.workerU,task.id,'Synthetic stale assignee','tasks'),holder=>holder.query('UPDATE tasks SET assigneeEmployeeId=@1 WHERE id=@0',[task.id,f.far.id]))
 assert.equal(result.status,404)
 assert.equal(await f.repo('Comment').countBy({entityType:'task',entityId:task.id}),0)
})
test('P2R late document/execution task mapping rejects comments with RCSI='+rcsi,async t=>{
 const results=[]
 for(const kind of ['document','execution']){
  const task=await f.ok('POST','/tasks',{title:'Synthetic late linked task',assigneeEmployeeId:f.worker.id},f.hrU)
  let link
  if(kind==='execution'){
   const req=await f.submit();link=()=>f.ds.query('UPDATE requests SET executionTaskId=@1 WHERE id=@0',[req.id,task.id])
  }else{
   const doc=await f.repo('HrIssuedDocument').save({reference:'PP-'+crypto.randomUUID(),templateId:1,revisionId:1,fileId:900001,templateName:'Synthetic',category:'ACKNOWLEDGEMENT',isFinancial:false,issuedByUserId:f.admin.id,idempotencyKey:crypto.randomUUID(),inputHash:'b'.repeat(64),snapshot:'{}'})
   link=()=>f.ds.query('UPDATE hr_issued_documents SET ackTaskId=@1 WHERE id=@0',[doc.id,task.id])
  }
  const result=await blocked('SELECT id FROM tasks WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[task.id],()=>f.say(f.workerU,task.id,'Synthetic late-link comment','tasks'),link)
  assert.equal(result.status,409)
  assert.equal((await f.say(f.workerU,task.id,'Synthetic retry','tasks')).status,400)
  assert.equal(await f.repo('Comment').countBy({entityType:'task',entityId:task.id}),0)
  results.push({kind,initial:409,retry:400,comments:0})
 }
 t.diagnostic(JSON.stringify({rcsi,lateLinks:results}))
})
