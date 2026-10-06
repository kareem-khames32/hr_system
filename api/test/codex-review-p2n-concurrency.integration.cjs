'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
async function blocked(f,sql,args,start,during,count=1){
 const q=f.ds.createQueryRunner();await q.connect();await q.startTransaction();let pending
 try{
  await q.query(sql,args);pending=start();let n=0
  for(let i=0;i<400&&n<count;i++){await new Promise(r=>setTimeout(r,20));n=Number((await f.ds.query('SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id=DB_ID() AND blocking_session_id<>0'))[0].n)}
  assert.equal(n,count,'Expected real SQL waiters');if(during)await during();await q.commitTransaction();return await pending
 }finally{if(q.isTransactionActive)await q.rollbackTransaction();await q.release();if(pending)await pending.catch(()=>{})}
}
// A separate process per database: Nest ConfigModule keeps its process-level config.
for(const rcsi of [process.env.REVIEW_RCSI==='true'])test('P2N concurrent issue, ack/cancel and late task links with RCSI='+rcsi,async t=>{
 const f=await require('./codex-review-p2n-document-fixture.cjs')(rcsi?'p2n_rcsi':'p2n_rc',{rcsi})
 try{
  assert.equal(Number((await f.ds.query('SELECT is_read_committed_snapshot_on n FROM sys.databases WHERE name=DB_NAME()'))[0].n),Number(rcsi))
  const body=f.input()
  const issued=await blocked(f,'SELECT id FROM hr_document_templates WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[f.template.id],()=>Promise.all([1,2,3].map(()=>f.request('POST','/hr-documents/issue',body,f.hrA))),undefined,3)
  assert.deepEqual(issued.map(r=>r.status),[201,201,201]);assert.equal(new Set(issued.map(r=>r.body.id)).size,1)
  assert.equal(await f.repo('HrIssuedDocument').count(),1);assert.equal(await f.repo('Task').count(),1);assert.equal(await f.repo('StoredFile').count(),1)
  const id=issued[0].body.id,c=await f.columns(id)
  const raced=await blocked(f,'SELECT id FROM hr_issued_documents WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[id],()=>Promise.all([f.ack(f.self,id,c.ackContentHash),f.cancel(f.hrA,id)]),undefined,2)
  const count=await f.repo('HrDocumentAcknowledgement').countBy({documentId:id}),task=await f.repo('Task').findOneByOrFail({id:c.ackTaskId})
  assert.equal(task.status,count?'DONE':'CANCELLED');assert.deepEqual(raced.map(r=>r.status),count?[201,400]:[404,201])
  // The mapping appears after the initial read while the real task row is locked.
  let cases=0
  for(const kind of ['document','execution'])for(const method of ['POST','PATCH']){
   const ordinary=await f.ok('POST','/tasks',{title:'Synthetic late link',assigneeEmployeeId:f.employeeA.id},f.taskManager)
   let link
   if(kind==='document'){const d=await f.issue(f.employeeA,{requireAck:false});link=()=>f.ds.query('UPDATE hr_issued_documents SET ackTaskId=@1 WHERE id=@0',[d.id,ordinary.id])}
   else{const request=await f.repo('Request').save({typeCode:'SYNTHETIC',requesterId:f.other.id,createdByUserId:f.admin.id,branchId:f.A.id,status:'IN_EXECUTION'});link=()=>f.ds.query('UPDATE requests SET executionTaskId=@1 WHERE id=@0',[request.id,ordinary.id])}
   const route=`/tasks/${ordinary.id}`+(method==='POST'?'/status':'')
   const result=await blocked(f,'SELECT id FROM tasks WITH(UPDLOCK,ROWLOCK) WHERE id=@0',[ordinary.id],()=>f.request(method,route,method==='POST'?{status:'DONE'}:{assigneeEmployeeId:f.other.id},method==='POST'?f.self:f.taskManager),link)
   assert.equal(result.status,409,kind+' '+method+': '+JSON.stringify(result.body))
   const kept=await f.repo('Task').findOneByOrFail({id:ordinary.id});assert.deepEqual([kept.status,kept.assigneeEmployeeId,kept.title],['OPEN',f.employeeA.id,'Synthetic late link']);cases++
  }
  t.diagnostic(JSON.stringify({case:'isolation-and-late-links',rcsi,concurrentIssuers:3,documents:1,ackCancel:raced.map(r=>r.status),lateLinkCases:cases}))
 }finally{await f.close()}
},{timeout:120000})
