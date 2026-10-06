'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process')
test('P2N schema transition: an older application cache must not permit status or assignee edits on newly linked document tasks',async t=>{
 const rcsi=process.env.REVIEW_RCSI==='true',f=await require('./codex-review-p2n-document-fixture.cjs')('p2n_cache',{rcsi}),rules=require('../src/hr-documents/document-acknowledgements')
 try{
  f.assertDisposable()
  // Simulate application A before migration. B is a separate process with its own cache.
  await f.ds.query('DROP TABLE hr_document_acknowledgements')
  await f.ds.query('DROP INDEX UX_hr_issued_documents_ack_task ON hr_issued_documents')
  await f.ds.query('ALTER TABLE hr_issued_documents DROP COLUMN ackRequestedAt,ackDueDate,ackTaskId,ackContentHash')
  rules.resetDocumentAckSchemaCache();assert.equal(await rules.documentAckSchemaReady(f.ds.manager),false)
  const text=fs.readFileSync(path.resolve(__dirname,'../../docs/migrations/payroll/20261006_092_document_acknowledgements.sql'),'utf8')
  for(const batch of text.split(/^GO\s*$/im).filter(v=>v.trim()))await f.ds.query(batch)
  const args=['--require',path.join(__dirname,'codex-review-p2n-renderer-preload.cjs'),'--require',path.join(__dirname,'codex-review-round5-harness.cjs'),path.join(__dirname,'codex-review-p2n-second-process.cjs'),JSON.stringify({actor:{sub:f.admin.id,role:'super_admin',permissions:['*']},inputs:[f.input(),f.input()]})]
  const issued=await new Promise((resolve,reject)=>{const child=cp.spawn(process.execPath,args,{cwd:path.resolve(__dirname,'..'),env:{...process.env,DB_SYNCHRONIZE:'false'},windowsHide:true});let out='',err='';child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);child.on('error',reject);child.on('exit',code=>{if(code!==0)return reject(Error('second process failed: '+err.slice(0,600)));const line=out.split(/\r?\n/).find(s=>s.startsWith('P2N_SECOND_PROCESS '));assert.ok(line);resolve(JSON.parse(line.slice(19)))})})
  assert.equal(await rules.documentAckSchemaReady(f.ds.manager),false,'Application A still has its legitimate pre-migration negative cache')
  const columns=await Promise.all(issued.map(d=>f.columns(d.id))),ids=columns.map(c=>c.ackTaskId)
  const status=await f.request('POST',`/tasks/${ids[0]}/status`,{status:'DONE'},f.self)
  const edit=await f.request('PATCH',`/tasks/${ids[1]}`,{assigneeEmployeeId:f.other.id},f.taskManager)
  const state=await f.repo('Task').findBy({id:require('../node_modules/typeorm').In(ids)})
  const evidence={case:'negative-schema-cache-across-processes',rcsi,statusCode:status.status,editCode:edit.status,states:state.map(r=>({id:r.id,status:r.status,assigneeEmployeeId:r.assigneeEmployeeId})),acknowledgements:await f.repo('HrDocumentAcknowledgement').count(),expectedEmployeeId:f.employeeA.id,otherEmployeeId:f.other.id}
  t.diagnostic(JSON.stringify(evidence))
  rules.resetDocumentAckSchemaCache()
  const protectedNow=await f.request('POST',`/tasks/${ids[0]}/status`,{status:'OPEN',note:'Synthetic retry'},f.taskManager)
  assert.equal(protectedNow.status,400,'Fresh schema knowledge restores the expected prohibition')
  assert.deepEqual([status.status,edit.status,state[0].status,state[1].assigneeEmployeeId],[400,400,'OPEN',f.employeeA.id],JSON.stringify(evidence))
 }finally{await f.close()}
},{timeout:120000})
