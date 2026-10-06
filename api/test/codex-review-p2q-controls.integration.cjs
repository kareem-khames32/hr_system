'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p2q-comments-fixture.cjs')('p2q_controls')},{timeout:180000})
after(async()=>{if(f)await f.close()})
const reload=id=>f.repo('User').findOneByOrFail({id})
test('P2Q history insertion failure refuses relinking; an account save failure after history remains conservative',async()=>{
 const a=await f.employee(),b=await f.employee(),u=await f.account(a,['requests.view_all'])
 const log=require('../src/employees/employee-change-log'),record=log.recordLoginAccountUnlinked
 log.recordLoginAccountUnlinked=async()=>{throw Error('Synthetic review history failure')}
 try{assert.equal((await f.request('PATCH',`/users/${u.id}`,{employeeId:b.id})).status,500)}finally{log.recordLoginAccountUnlinked=record}
 assert.equal((await reload(u.id)).employeeId,a.id)
 const controller=f.app.get(require('../src/auth/users.controller').UsersController),save=controller.users.save
 controller.users.save=async function(entity,...args){if(entity?.id===u.id)throw Error('Synthetic review save failure');return save.call(this,entity,...args)}
 try{assert.equal((await f.request('PATCH',`/users/${u.id}`,{employeeId:b.id})).status,500)}finally{controller.users.save=save}
 assert.equal((await reload(u.id)).employeeId,a.id)
 assert.equal(await log.wasLoginAccountOf(f.ds.manager,u.id,a.id),true)
})
test('P2Q historical owner stays restricted after detach/relink, deactivate/reactivate, and replacement account; history is absent from projected responses',async()=>{
 const owner=await f.employee(f.A,{managerEmployeeId:f.manager.id}),other=await f.employee(f.B),u=await f.account(owner,['requests.view_all'])
 const req=await f.submit(f.proxyU,{onBehalfEmployeeId:owner.id}),file=await f.upload(f.managerU)
 const internal=await f.say(f.managerU,req.id,{body:'Synthetic owner-only exclusion',internal:true,fileIds:[file.id]});assert.equal(internal.status,201)
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:null})
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:other.id})
 let current=await reload(u.id)
 assert.equal((await f.thread(u,req.id)).status,401)
 const assertHidden=async actor=>{const r=await f.thread(actor,req.id);assert.equal(r.status,200);assert.equal(r.body.canInternal,false);assert.deepEqual(r.body.comments,[]);assert.equal((await f.download(actor,file.id)).status,404);assert.equal((await f.say(actor,req.id,{body:'Refused internal',internal:true})).status,400)}
 await assertHidden(current)
 await f.ok('PATCH',`/users/${u.id}`,{isActive:false});assert.equal((await f.thread(current,req.id)).status,401)
 await f.ok('PATCH',`/users/${u.id}`,{isActive:true});current=await reload(u.id);await assertHidden(current)
 const replacement=await f.account(owner,['requests.view_all']);await assertHidden(replacement)
 const history=await f.repo('EmployeeStatusHistory').find({where:{employeeId:owner.id,fieldName:'loginAccount'}});assert.ok(history.some(h=>Number(h.oldValue)===u.id))
 for(const actor of [f.admin,replacement])for(const route of [`/employees/${owner.id}/history`,`/employees/${owner.id}/profile`]){
  const body=await f.ok('GET',route,null,actor);assert.equal(JSON.stringify(body).includes('loginAccount'),false)
 }
 const audit=await f.ok('GET','/audit',null,f.admin);assert.equal(JSON.stringify(audit).includes('loginAccount'),false)
 const {projectEmployeeHistory}=require('../src/employees/employee-projection')
 for(const permissions of [[],['employees.view'],['employees.edit'],['*']])assert.deepEqual(projectEmployeeHistory(history,{sub:f.admin.id,role:'employee',permissions,employeeId:owner.id},owner.id),[])
 assert.equal((await f.repo('EmployeeStatusHistory').find({where:{employeeId:owner.id,fieldName:'loginAccount'}})).length,history.length,'Projection never edits persisted history')
})
test('P2Q in-app mentions hide without a reader callback and after identity loss, do not mark hidden rows read, and return unchanged when visibility returns',async()=>{
 const owner=await f.employee(f.A,{managerEmployeeId:f.manager.id}),other=await f.employee(f.B),u=await f.account(owner)
 const req=await f.submit(f.proxyU,{onBehalfEmployeeId:owner.id}),comment=await f.say(f.managerU,req.id,{body:'Synthetic visible mention',targets:['REQUESTER']});assert.equal(comment.status,201)
 const row=await f.dispatch(comment.body.ref)
 const {storedInAppNotifications}=require('../src/notifications/notification-store')
 assert.deepEqual(await storedInAppNotifications(f.ds.manager,u.id),[])
 const before=await f.ok('GET','/notifications',null,u),entry=before.find(n=>n.link===`/requests?request=${req.id}`);assert.ok(entry)
 const [storedBefore]=await f.ds.query('SELECT * FROM notifications WHERE recipientUserId=@0 AND entityId=@1',[u.id,String(row.id)])
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:other.id,branchId:f.B.id});const hidden=await reload(u.id)
 assert.equal((await f.ok('GET','/notifications',null,hidden)).some(n=>n.id===entry.id),false)
 assert.deepEqual(await f.ok('PATCH','/notifications/read',{ids:[entry.id]},hidden),{ok:true,updated:0})
 assert.equal((await f.request('DELETE',`/notifications/${entry.id}`,null,hidden)).status,404)
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:owner.id,branchId:f.A.id});const restored=await reload(u.id)
 assert.deepEqual((await f.ok('GET','/notifications',null,restored)).find(n=>n.id===entry.id),entry)
 const [storedAfter]=await f.ds.query('SELECT * FROM notifications WHERE id=@0',[storedBefore.id]);assert.deepEqual(storedAfter,storedBefore)
})
test('P2Q hidden notifications must not crowd a still-readable notification out of the returned list',async t=>{
 const owner=await f.employee(f.A,{managerEmployeeId:f.manager.id}),other=await f.employee(f.B),u=await f.account(owner)
 const retained=await f.submit(u),lost=await f.submit(f.proxyU,{onBehalfEmployeeId:owner.id})
 const old=await f.say(f.managerU,retained.id,{body:'Synthetic retained creator mention',targets:['REQUESTER']});assert.equal(old.status,201);await f.dispatch(old.body.ref)
 const link=`/requests?request=${retained.id}`;assert.ok((await f.ok('GET','/notifications',null,u)).some(n=>n.link===link))
 for(let i=0;i<60;i++){const c=await f.say(f.managerU,lost.id,{body:'Synthetic later mention '+i,targets:['REQUESTER']});assert.equal(c.status,201);await f.dispatch(c.body.ref)}
 await f.ok('PATCH',`/users/${u.id}`,{employeeId:other.id,branchId:f.B.id});const current=await reload(u.id)
 assert.equal((await f.thread(current,retained.id)).status,200,'Creator still reads the retained request')
 assert.equal((await f.thread(current,lost.id)).status,404,'All sixty newer notifications now refer to a hidden request')
 const list=await f.ok('GET','/notifications',null,current)
 assert.equal(list.some(n=>n.link===`/requests?request=${lost.id}`),false)
 t.diagnostic(JSON.stringify({case:'notification-filter-after-limit',hiddenNewer:60,stillReadableMentionReturned:list.some(n=>n.link===link),returnedCount:list.length}))
 assert.equal(list.some(n=>n.link===link),true,'Filter hidden mentions before applying the visible-notification limit, or continue paging')
})
