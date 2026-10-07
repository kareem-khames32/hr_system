'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict');let f
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
before(async()=>{f=await require('./codex-review-p2y-comments-fixture.cjs')('p2y_controls')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2Y creator loses new read and decision routes when assign_any is revoked',async()=>{
 const creator=await f.account(null,['tasks.assign_any'])
 const task=await f.ok('POST','/tasks',{title:'Synthetic current assignment authority',assigneeEmployeeId:f.worker.id,dueDate:day(2)},creator)
 await f.ok('POST',`/tasks/${task.id}/extension`,{dueDate:day(4),reason:'Synthetic extension'},f.workerU)
 await f.ok('PATCH',`/users/${creator.id}`,{permissions:[]})
 const current=await f.repo('User').findOneByOrFail({id:creator.id})
 for(const [method,path,body] of [['GET',`/tasks/${task.id}`,null],['GET',`/tasks/${task.id}/log`,null],['POST',`/tasks/${task.id}/extension/decision`,{approve:true}],['PATCH',`/tasks/${task.id}`,{title:'Should not change'}]]){
  assert.equal((await f.request(method,path,body,current)).status,404,path)
 }
 const report=await f.ok('GET','/tasks/report',null,current);assert.deepEqual(report.rows,[])
 assert.equal((await f.repo('Task').findOneByOrFail({id:task.id})).dueDate,day(2))
})
test('P2Y a personal task follows its current direct manager across detail, log and comments',async()=>{
 const employee=await f.employee(f.A,{managerEmployeeId:f.manager.id}),owner=await f.account(employee)
 const task=await f.ok('POST','/tasks',{title:'Synthetic personal manager transition',assigneeEmployeeId:employee.id},owner)
 const next=await f.employee(f.B),nextU=await f.account(next,[],f.B)
 await f.repo('Employee').update({id:employee.id},{managerEmployeeId:next.id})
 for(const suffix of ['', '/log','/comments']){
  assert.equal((await f.request('GET',`/tasks/${task.id}${suffix}`,null,f.managerU)).status,404)
  assert.equal((await f.request('GET',`/tasks/${task.id}${suffix}`,null,nextU)).status,200)
  assert.equal((await f.request('GET',`/tasks/${task.id}${suffix}`,null,f.admin)).status,404)
 }
 assert.equal((await f.request('PATCH',`/tasks/${task.id}`,{title:'Manager cannot change'},nextU)).status,403)
})
test('P2Y two ratings serialize and feature-off reopening clears the old rating atomically',async()=>{
 await f.ok('PUT','/modules/features/tasks.rating',{enabled:true})
 const task=await f.ok('POST','/tasks',{title:'Synthetic rating concurrency',assigneeEmployeeId:f.worker.id,needsRating:true},f.hrU)
 await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE'},f.workerU)
 const both=await Promise.all([2,4].map(rating=>f.request('POST',`/tasks/${task.id}/rating`,{rating,note:'Synthetic note'},f.hrU)))
 assert.deepEqual(both.map(r=>r.status).sort(),[201,409])
 const logs=await f.ok('GET',`/tasks/${task.id}/log`,null,f.hrU)
 assert.equal(logs.lines.filter(row=>row.event==='RATED').length,1)
 const comments=await f.thread(f.workerU,task.id,'tasks');assert.equal(comments.body.comments.filter(row=>row.body==='قيّم المهمة').length,1)
 await f.ok('PUT','/modules/features/tasks.rating',{enabled:false})
 const hidden=await f.ok('GET',`/tasks/${task.id}`,null,f.workerU);assert.equal(hidden.rating,null);assert.equal(hidden.ratingNote,null)
 const reopened=await f.ok('POST',`/tasks/${task.id}/status`,{status:'OPEN',note:'Synthetic revision required'},f.hrU)
 assert.equal(reopened.status,'IN_PROGRESS');assert.equal(reopened.returnCount,1)
 const [extra]=await f.ds.query('SELECT rating,ratingNote FROM task_extras WHERE taskId=@0',[task.id]);assert.deepEqual(extra,{rating:null,ratingNote:null})
})
test('P2Y system comments use live access when distributing an extension mention',async()=>{
 const manager=await f.employee(),creator=await f.account(manager),employee=await f.employee(f.A,{managerEmployeeId:manager.id}),owner=await f.account(employee)
 const task=await f.ok('POST','/tasks',{title:'Synthetic extension notification',assigneeEmployeeId:employee.id,dueDate:day(1)},creator)
 await f.ok('POST',`/tasks/${task.id}/extension`,{dueDate:day(4),reason:'Synthetic reason'},owner)
 const thread=await f.thread(owner,task.id,'tasks');assert.equal(thread.body.comments.length,1)
 await f.repo('Employee').update({id:employee.id},{managerEmployeeId:null})
 const comment=await f.dispatch(thread.body.comments[0].ref)
 const notifications=await f.ds.query("SELECT id FROM notifications WHERE entityType=N'comment' AND entityId=@0 AND recipientUserId=@1",[String(comment.id),creator.id])
 assert.equal(notifications.length,0)
 assert.equal((await f.request('GET',`/tasks/${task.id}`,null,creator)).status,404)
})
