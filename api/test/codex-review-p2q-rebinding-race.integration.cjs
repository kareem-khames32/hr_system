'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f
before(async()=>{f=await require('./codex-review-p2q-comments-fixture.cjs')('p2q_rebinding_race')},{timeout:180000})
after(async()=>{if(f)await f.close()})
function latch(){let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}}
async function wait(p){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Review barrier not reached')),30000)})])}finally{clearTimeout(timer)}}
test('P2Q concurrent account rebindings must retain the intermediate employee identity and keep its internal content hidden',async t=>{
 const first=await f.employee(),middle=await f.employee(f.A,{managerEmployeeId:f.manager.id}),last=await f.employee()
 const user=await f.account(first,['requests.view_all'])
 const req=await f.submit(f.proxyU,{onBehalfEmployeeId:middle.id})
 const controller=f.app.get(require('../src/auth/users.controller').UsersController),repo=controller.users
 const original=repo.save,entered=latch(),release=latch();let held=false,pending
 repo.save=async function(entity,...args){
  if(!held && entity?.id===user.id && entity.employeeId===last.id){held=true;entered.resolve();await release.promise}
  return original.call(this,entity,...args)
 }
 try{
  // Request C reads the original account and persists history for A, then pauses immediately before its ordinary save.
  pending=f.request('PATCH',`/users/${user.id}`,{employeeId:last.id})
  await wait(entered.promise)
  // A second, real PATCH commits B while C is in flight; B owns the request during this interval.
  await f.ok('PATCH',`/users/${user.id}`,{employeeId:middle.id})
  const during=await f.repo('User').findOneByOrFail({id:user.id});assert.equal(during.employeeId,middle.id)
  const file=await f.upload(f.managerU)
  const said=await f.say(f.managerU,req.id,{body:'Synthetic internal evaluation created while B owns this account',internal:true,fileIds:[file.id]})
  assert.equal(said.status,201)
  const before=await f.thread(during,req.id);assert.equal(before.status,200);assert.equal(before.body.canInternal,false);assert.deepEqual(before.body.comments,[])
  assert.equal((await f.download(during,file.id)).status,404)
  release.resolve();const changed=await pending;assert.equal(changed.status,200)
  const current=await f.repo('User').findOneByOrFail({id:user.id});assert.equal(current.employeeId,last.id)
  const history=await f.repo('EmployeeStatusHistory').find({where:{fieldName:'loginAccount'}})
  const recorded=history.filter(h=>Number(h.oldValue)===user.id).map(h=>h.employeeId)
  const shown=await f.thread(current,req.id),download=await f.download(current,file.id)
  assert.equal(shown.status,200)
  t.diagnostic(JSON.stringify({case:'concurrent-rebinding',recordedOldEmployees:recorded,intermediateEmployeeRecorded:recorded.includes(middle.id),canInternal:shown.body.canInternal,internalContentVisible:shown.body.comments.some(c=>c.body===said.body.body),fileStatus:download.status,fileBytesMatch:download.bytes.equals(f.png)}))
  assert.equal(shown.body.comments.some(c=>c.body===said.body.body),false,'Every committed account identity must remain on the employee side, including an intermediate concurrent binding')
  assert.equal(download.status,404)
 }finally{release.resolve();if(pending)await pending;repo.save=original}
})
test('P2Q a concurrent permissions-only PATCH must not silently restore an old employee binding without recording the displaced identity',async t=>{
 const first=await f.employee(),middle=await f.employee(f.A,{managerEmployeeId:f.manager.id}),user=await f.account(first,['requests.view_all'])
 const req=await f.submit(f.proxyU,{onBehalfEmployeeId:middle.id}),controller=f.app.get(require('../src/auth/users.controller').UsersController),repo=controller.users
 const original=repo.save,entered=latch(),release=latch();let held=false,pending
 repo.save=async function(entity,...args){
  if(!held&&entity?.id===user.id&&String(entity.permissions).includes('tasks.view_all')){held=true;entered.resolve();await release.promise}
  return original.call(this,entity,...args)
 }
 try{
  pending=f.request('PATCH',`/users/${user.id}`,{permissions:['requests.view_all','tasks.view_all']})
  await wait(entered.promise)
  await f.ok('PATCH',`/users/${user.id}`,{employeeId:middle.id})
  const during=await f.repo('User').findOneByOrFail({id:user.id});assert.equal(during.employeeId,middle.id)
  const said=await f.say(f.managerU,req.id,{body:'Synthetic internal content while intermediate owner is current',internal:true});assert.equal(said.status,201)
  assert.deepEqual((await f.thread(during,req.id)).body.comments,[])
  release.resolve();assert.equal((await pending).status,200)
  const current=await f.repo('User').findOneByOrFail({id:user.id}),shown=await f.thread(current,req.id)
  assert.equal(shown.status,200)
  const recorded=await require('../src/employees/employee-change-log').wasLoginAccountOf(f.ds.manager,user.id,middle.id)
  t.diagnostic(JSON.stringify({case:'nonlinking-PATCH-overwrites-link',restoredOriginalBinding:current.employeeId===first.id,intermediateRecorded:recorded,internalVisible:shown.body.comments.some(c=>c.body===said.body.body)}))
  assert.equal(shown.body.comments.some(c=>c.body===said.body.body),false,'All account saves must preserve the binding history, including PATCH calls that did not request a binding change')
 }finally{release.resolve();if(pending)await pending;repo.save=original}
})
