'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path')
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
test('P2O migration during a blocked task mutation: fresh link checks under RC and RCSI',async t=>{
 const rcsi=process.env.REVIEW_RCSI==='true',f=await require('./codex-review-p2o-document-fixture.cjs')('p2o_migrate_race',{rcsi})
 const evidence=[]
 try{
  f.assertDisposable()
  assert.equal(Number((await f.ds.query('SELECT is_read_committed_snapshot_on n FROM sys.databases WHERE name=DB_NAME()'))[0].n),Number(rcsi))
  for(const kind of ['document','execution'])for(const method of ['POST','PATCH']){
   const ordinary=await f.ok('POST','/tasks',{title:'Synthetic migration waiter',assigneeEmployeeId:f.employeeA.id},f.taskManager)
   let parent,migration,rules,reset,check,link
   if(kind==='document'){
    parent=await f.issue(f.employeeA,{requireAck:false})
    rules=require('../src/hr-documents/document-acknowledgements');reset='resetDocumentAckSchemaCache';check='documentAckSchemaReady'
    await f.ds.query('DROP TABLE hr_document_acknowledgements')
    await f.ds.query('DROP INDEX UX_hr_issued_documents_ack_task ON hr_issued_documents')
    await f.ds.query('ALTER TABLE hr_issued_documents DROP COLUMN ackRequestedAt,ackDueDate,ackTaskId,ackContentHash')
    migration='20261006_092_document_acknowledgements.sql'
    link=()=>f.ds.query('UPDATE hr_issued_documents SET ackTaskId=@1 WHERE id=@0',[parent.id,ordinary.id])
   }else{
    parent=await f.repo('Request').save({typeCode:'SYNTHETIC',requesterId:f.other.id,createdByUserId:f.admin.id,branchId:f.A.id,status:'IN_EXECUTION'})
    rules=require('../src/requests/execution-tasks');reset='resetExecutionSchemaCache';check='executionSchemaReady'
    await f.ds.query('DROP INDEX UX_requests_execution_task ON requests')
    await f.ds.query('ALTER TABLE requests DROP COLUMN executionTaskId')
    migration='20261005_089_request_execution_tasks.sql'
    link=()=>f.ds.query('UPDATE requests SET executionTaskId=@1 WHERE id=@0',[parent.id,ordinary.id])
   }
   rules[reset]();assert.equal(await rules[check](f.ds.manager),false)
   // Real ordinary tasks must remain writable while the schema is absent.
   const control=await f.ok('POST','/tasks',{title:'Synthetic ordinary control',assigneeEmployeeId:f.employeeA.id},f.taskManager)
   assert.equal((await f.request('PATCH',`/tasks/${control.id}`,{title:'Synthetic saved control'},f.taskManager)).status,200)
   assert.equal((await f.request('POST',`/tasks/${control.id}/status`,{status:'DONE'},f.self)).status,201)
   const q=f.ds.createQueryRunner();await q.connect();await q.startTransaction();let pending,result
   try{
    await q.query('SELECT id FROM tasks WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[ordinary.id])
    pending=f.request(method,`/tasks/${ordinary.id}`+(method==='POST'?'/status':''),method==='POST'?{status:'DONE'}:{assigneeEmployeeId:f.other.id},method==='POST'?f.self:f.taskManager)
    let waiting=false
    for(let i=0;i<400&&!waiting;i++){await pause(20);waiting=Number((await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)>0}
    assert.ok(waiting,'HTTP mutation must actually be waiting on the held SQL task row')
    // DDL and the one-time mapping commit on another connection while the request is blocked.
    const sql=fs.readFileSync(path.resolve(__dirname,'../../docs/migrations/payroll',migration),'utf8')
    for(const batch of sql.split(/^GO\s*$/im).filter(s=>s.trim()))await f.ds.query(batch)
    await link()
    await q.commitTransaction();result=await pending
   }finally{if(q.isTransactionActive)await q.rollbackTransaction();await q.release();if(pending)await pending.catch(()=>{})}
   assert.equal(result.status,409,kind+' '+method+': '+JSON.stringify(result.body))
   const row=await f.repo('Task').findOneByOrFail({id:ordinary.id})
   assert.deepEqual([row.status,row.assigneeEmployeeId,row.title],['OPEN',f.employeeA.id,'Synthetic migration waiter'])
   assert.equal(await rules[check](f.ds.manager),true)
   assert.equal((await f.request('PATCH',`/tasks/${ordinary.id}`,{title:'Synthetic forbidden'},f.taskManager)).status,400)
   assert.equal((await f.request('POST',`/tasks/${control.id}/status`,{status:'OPEN',note:'Synthetic ordinary reopen'},f.taskManager)).status,201)
   assert.equal((await f.request('PATCH',`/tasks/${control.id}`,{title:'Synthetic after migration'},f.taskManager)).status,200)
   evidence.push({kind,method,status:result.status,ordinaryBeforeAndAfter:true})
  }
  t.diagnostic(JSON.stringify({rcsi,migrationWhileBlocked:evidence}))
 }finally{await f.close()}
},{timeout:180000})
