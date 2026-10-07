'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
before(async()=>{f=await require('./codex-review-p2z-comments-fixture.cjs')('p2z_personal_proof')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2Z personal proof follows current employee identity after actual account relinking',async t=>{
 const task=await f.ok('POST','/tasks',{title:'Private synthetic personal task',assigneeEmployeeId:f.worker.id,requiresProof:true},f.workerU)
 assert.equal(task.personal,true)
 const form=new FormData();form.append('file',new Blob([f.png],{type:'image/png'}),'private-proof.png')
 const upload=await fetch('http://127.0.0.1:1/api/files/upload?entityType=task',{method:'POST',headers:f.headers(f.workerU),body:form})
 const file=await upload.json();assert.equal(upload.status,201,JSON.stringify(file))
 await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE',proofFileId:file.id},f.workerU)
 assert.equal((await f.download(f.workerU,file.id)).status,200,'owner transport control')
 assert.equal((await f.download(f.managerU,file.id)).status,200,'direct manager control')
 assert.equal((await f.download(f.admin,file.id)).status,404,'administrator privacy control')
 const other=await f.employee(f.B)
 await f.ok('PATCH',`/users/${f.workerU.id}`,{employeeId:other.id})
 const relinked=await f.repo('User').findOneByOrFail({id:f.workerU.id})
 const results={detail:(await f.request('GET',`/tasks/${task.id}`,null,relinked)).status,
  log:(await f.request('GET',`/tasks/${task.id}/log`,null,relinked)).status,
  comments:(await f.thread(relinked,task.id,'tasks')).status,
  file:(await f.download(relinked,file.id)).status}
 t.diagnostic(JSON.stringify({case:'personal-proof-relinked-account',results}))
 assert.deepEqual(results,{detail:404,log:404,comments:404,file:404})
})
