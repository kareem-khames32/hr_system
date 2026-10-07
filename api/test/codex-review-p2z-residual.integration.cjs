'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),{AsyncLocalStorage}=require('node:async_hooks');let f
const day=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
before(async()=>{f=await require('./codex-review-p2z-comments-fixture.cjs')('p2z_residual')},{timeout:180000})
after(async()=>{if(f)await f.close()})
test('P2Z task changes and not-mine comments use the current transaction connection throughout',async t=>{
 const {SqlServerQueryRunner}=require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner'),storage=new AsyncLocalStorage()
 const transaction=f.ds.transaction,query=SqlServerQueryRunner.prototype.query,foreign=[];let ownQueries=0
 await f.ok('PUT','/modules/features/tasks.rating',{enabled:true})
 f.ds.transaction=function(...args){const work=args.pop();return transaction.call(this,...args,em=>storage.run(em.queryRunner,()=>work(em)))}
 SqlServerQueryRunner.prototype.query=function(...args){const owner=storage.getStore();if(owner&&this.connection===f.ds){if(this===owner)ownQueries++;else foreign.push(String(args[0]).replace(/\s+/g,' ').slice(0,180))}return query.apply(this,args)}
 try{
  const task=await f.ok('POST','/tasks',{title:'Synthetic transaction connection audit',assigneeEmployeeId:f.worker.id,dueDate:day(2),needsRating:true},f.managerU)
  await f.ok('PATCH',`/tasks/${task.id}`,{needsRating:false},f.managerU)
  await f.ok('PATCH',`/tasks/${task.id}`,{needsRating:true},f.managerU)
  await f.ok('POST',`/tasks/${task.id}/comments`,{notMine:true,body:'Synthetic responsibility question'},f.workerU)
  await f.ok('POST',`/tasks/${task.id}/extension`,{dueDate:day(4),reason:'Synthetic extension'},f.workerU)
  await f.ok('POST',`/tasks/${task.id}/extension/decision`,{approve:true},f.managerU)
  await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE'},f.workerU)
  await f.ok('POST',`/tasks/${task.id}/status`,{status:'OPEN',note:'Synthetic revision'},f.managerU)
  await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE'},f.workerU)
  await f.ok('POST',`/tasks/${task.id}/rating`,{rating:4},f.managerU)
  assert.equal((await f.request('POST',`/tasks/${task.id}/status`,{status:'OPEN',note:'Rated task control'},f.managerU)).status,400)
  t.diagnostic(JSON.stringify({case:'all-query-runners-inside-task-transactions',ownQueries,foreign}))
  assert.ok(ownQueries>30);assert.deepEqual(foreign,[])
 }finally{f.ds.transaction=transaction;SqlServerQueryRunner.prototype.query=query}
})
test('P2Z detached proof contains only original uploaded bytes and has no path into replacement proof',async t=>{
 const upload=async(actor,name)=>{const form=new FormData();form.append('file',new Blob([f.png],{type:'image/png'}),name);const r=await fetch('http://127.0.0.1:1/api/files/upload?entityType=task',{method:'POST',headers:f.headers(actor),body:form});const b=await r.json();assert.equal(r.status,201);return b}
 const owner=await f.employee(f.A,{managerEmployeeId:f.manager.id}),account=await f.account(owner),successor=await f.account(owner)
 const task=await f.ok('POST','/tasks',{title:'Synthetic detached personal proof',assigneeEmployeeId:owner.id,requiresProof:true},account)
 const file=await upload(account,'original-private.png');await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE',proofFileId:file.id},account)
 const other=await f.employee(f.B);await f.ok('PATCH',`/users/${account.id}`,{employeeId:other.id})
 const relinked=await f.repo('User').findOneByOrFail({id:account.id})
 assert.equal((await f.download(relinked,file.id)).status,404)
 await f.ok('POST',`/tasks/${task.id}/status`,{status:'OPEN',note:'Synthetic replacement required'},successor)
 const detached=await f.download(relinked,file.id);assert.equal(detached.status,200);assert.deepEqual(detached.bytes,f.png)
 const replacement=await upload(successor,'replacement-private.png')
 await f.ok('POST',`/tasks/${task.id}/status`,{status:'DONE',proofFileId:replacement.id},successor)
 for(const suffix of ['','/log','/comments'])assert.equal((await f.request('GET',`/tasks/${task.id}${suffix}`,null,relinked)).status,404)
 assert.equal((await f.download(relinked,replacement.id)).status,404)
 assert.equal((await f.download(f.admin,replacement.id)).status,404)
 assert.equal((await f.download(f.managerU,replacement.id)).status,200)
 t.diagnostic(JSON.stringify({case:'detached-proof-policy-boundary',oldUnlinkedOwnBytes:200,replacement:404,task:404}))
})
test('P2Z renewal retries re-evaluate employee scope after the failed transaction rolls back',async t=>{
 const {EntityManager}=require('../node_modules/typeorm'),{Request}=require('../src/requests/entities/request.entity')
 const employee=await f.employee(),actor=await f.account(null,['employees.edit'])
 const oldFind=EntityManager.prototype.findOne,manager=f.ds.manager,oldTx=manager.transaction;let failures=0,attempts=0,rolledBack=false
 EntityManager.prototype.findOne=async function(target,options){
  if(target===Request&&options?.where?.requesterId===employee.id&&failures===0){failures++;const e=Error('Synthetic SQL deadlock retry');e.number=1205;throw e}
  return oldFind.call(this,target,options)
 }
 manager.transaction=async function(...args){attempts++;try{return await oldTx.apply(this,args)}catch(e){if(e.number===1205&&!rolledBack){rolledBack=true;await f.repo('Employee').update({id:employee.id},{branchId:f.B.id})}throw e}}
 try{
  const result=await f.request('POST',`/employees/${employee.id}/contract/renew`,{contractStart:day(30),contractEnd:day(365),reason:'Synthetic contract renewal'},actor)
  t.diagnostic(JSON.stringify({case:'renewal-rechecks-scope',status:result.status,attempts,failures,rolledBack}))
  assert.equal(result.status,404);assert.equal(attempts,2);assert.equal(failures,1)
  const current=await f.repo('Employee').findOneByOrFail({id:employee.id});assert.equal(current.contractStart,null)
  assert.equal(await f.repo('EmployeeStatusHistory').countBy({employeeId:employee.id,fieldName:'contract'}),0)
 }finally{manager.transaction=oldTx;EntityManager.prototype.findOne=oldFind}
})
