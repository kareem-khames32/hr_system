'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,gate,n=0
before(async()=>{f=await require('./codex-review-p2m-fixture.cjs')('p2m_boundaries');gate=f.app.get(require('../src/policies/policy-gate').PolicyGate)},{timeout:180000})
after(async()=>{if(f)await f.close()})
const today=()=>require('../src/policies/policy-rules').policyLocalDate(new Date())
const FLAG='SELECT TOP (1) p.[id] FROM [policies]'
async function setup(){
 const suffix=++n,branch=await f.repo('Branch').save({code:'PM'+suffix,name:'فرع مصطنع '+suffix})
 const employee=await f.repo('Employee').save({employeeCode:'PM'+suffix,fullName:'موظف مصطنع '+suffix,branchId:branch.id,joinDate:'2020-01-01',basicSalary:6000,isActive:true,status:'active'})
 const account=async(label,permissions=[],extra={})=>f.repo('User').save({email:`pm-${suffix}-${label}@review.invalid`,displayName:'حساب مصطنع '+label,passwordHash:'synthetic',role:'employee',branchId:branch.id,permissions:JSON.stringify(permissions),isActive:true,...extra})
 const user=await account('self',[],{employeeId:employee.id})
 const draft=await f.ok('POST','/policies',{title:'سياسة مصطنعة '+suffix,isMandatory:true,graceDays:0,audience:{mode:'employees',ids:[employee.id]}})
 const publish=()=>f.request('POST',`/policies/${draft.id}/versions`,{bodyText:'محتوى مصطنع '+suffix,effectiveDate:today()})
 return{branch,employee,user,account,draft,publish}
}
const protectedRead=user=>f.request('GET','/requests/mine',undefined,user)
async function waitFor(predicate,message){for(let i=0;i<400;i++){if(await predicate())return;await new Promise(r=>setTimeout(r,10))}assert.fail(message)}

test('P2M SQL: two locked publications keep the gate safe until the last commit and do not cache a pre-commit clear result',async t=>{
 const first=await setup(),second=await setup(),holders=[],pending=[]
 try{
  for(const s of [first,second]){
   const q=f.ds.createQueryRunner();await q.connect();await q.startTransaction();holders.push(q)
   await q.query('SELECT id FROM policies WITH (UPDLOCK,HOLDLOCK,ROWLOCK) WHERE id=@0',[s.draft.id])
  }
  pending.push(first.publish(),second.publish())
  await waitFor(()=>gate.writes===2,'Both real requests entered the guarded write before their SQL row locks')
  assert.equal(gate.active(),true)
  await holders[0].commitTransaction();assert.equal((await pending[0]).status,201)
  assert.equal(gate.active(),true);assert.equal(gate.writes,1)
  assert.equal((await protectedRead(first.user)).body.code,'POLICY_ACK_REQUIRED')
  assert.equal((await protectedRead(second.user)).status,200)
  assert.equal(gate.clear.has(second.user.id),false,'No clear entry while the other publication is pending')
  await holders[1].commitTransaction();assert.equal((await pending[1]).status,201)
  assert.equal((await protectedRead(second.user)).body.code,'POLICY_ACK_REQUIRED');assert.equal(gate.writes,0)
  assert.equal(await f.repo('PolicyVersion').countBy({policyId:first.draft.id}),1);assert.equal(await f.repo('PolicyVersion').countBy({policyId:second.draft.id}),1)
  t.diagnostic(JSON.stringify({case:'real-concurrent-publications',firstBlockedWhileSecondPending:true,secondClearNotCached:true,bothBlockedAfterCommit:true}))
 }finally{
  for(const q of holders){if(q.isTransactionActive)await q.rollbackTransaction();await q.release()}
  await Promise.allSettled(pending)
 }
},{timeout:60000})

test('P2M SQL: committed publish plus failed flag refresh succeeds once; rollback, withdrawal and no-op release the gate state',async t=>{
 const s=await setup(),original=f.ds.query
 let injected=0
 f.ds.query=function(sql,...args){if(String(sql).includes(FLAG)&&injected++===0)return Promise.reject(Error('synthetic post-commit flag failure'));return original.call(this,sql,...args)}
 let published
 try{published=await s.publish()}finally{f.ds.query=original}
 assert.equal(published.status,201);assert.equal(gate.writes,0);assert.equal(gate.active(),true)
 assert.equal((await protectedRead(s.user)).body.code,'POLICY_ACK_REQUIRED');assert.equal(await f.repo('PolicyVersion').countBy({policyId:s.draft.id}),1)
 await f.ok('PATCH',`/policies/${s.draft.id}`,{graceDays:0});assert.equal(gate.writes,0)
 const rejected=await f.request('PATCH',`/policies/${s.draft.id}`,{title:'عنوان مخالف بعد النشر'})
 assert.equal(rejected.status,400);assert.equal(gate.writes,0);assert.equal((await protectedRead(s.user)).body.code,'POLICY_ACK_REQUIRED')
 await f.ok('POST',`/policies/${s.draft.id}/withdraw`,{});assert.equal(gate.writes,0);assert.equal((await protectedRead(s.user)).status,200)
 t.diagnostic(JSON.stringify({case:'write-outcomes',oneVersion:true,postCommitFailurePreserves201:true,rejectionPreserved:true,withdrawOpens:true}))
})

test('P2M SQL: role change and deactivate/reactivate invalidate old sessions and do not inherit clear cache',async()=>{
 const s=await setup()
 await f.ok('PATCH',`/policies/${s.draft.id}`,{audience:{mode:'roles',ids:['hr_manager']}})
 assert.equal((await s.publish()).status,201);assert.equal((await protectedRead(s.user)).status,200)
 await f.ok('PATCH',`/users/${s.user.id}`,{role:'hr_manager'})
 let current=await f.repo('User').findOneByOrFail({id:s.user.id})
 assert.ok(current.tokenVersion>s.user.tokenVersion)
 assert.equal((await protectedRead(s.user)).status,401);assert.equal((await protectedRead(current)).body.code,'POLICY_ACK_REQUIRED')
 await f.ok('PATCH',`/users/${s.user.id}`,{isActive:false});assert.equal((await protectedRead(current)).status,401)
 await f.ok('PATCH',`/users/${s.user.id}`,{isActive:true});assert.equal((await protectedRead(current)).status,401)
 current=await f.repo('User').findOneByOrFail({id:s.user.id});assert.equal((await protectedRead(current)).body.code,'POLICY_ACK_REQUIRED')
})

test('P2M SQL: unknown state gates ordinary employee requests but preserves explicit exemptions, unlinked accounts and public routes',async()=>{
 const s=await setup();assert.equal((await s.publish()).status,201)
 const original=gate.overdueFor;gate.reset();let invoked=0
 gate.overdueFor=async()=>{invoked++;throw Error('synthetic account-check outage')}
 try{
  assert.equal((await protectedRead(s.user)).status,500)
  assert.equal((await f.request('GET','/auth/me',undefined,s.user)).status,200)
  assert.equal((await f.request('GET','/modules/enabled',undefined,s.user)).status,200)
  assert.equal((await f.request('GET','/policies/pending',undefined,s.user)).status,200)
  assert.equal((await protectedRead(f.admin)).status,200)
  assert.equal((await f.request('GET','/auth/login/options',undefined,null)).status,200)
  assert.equal(invoked,1)
 }finally{gate.overdueFor=original;await gate.changed()}
})

test('P2M SQL: policy-only role catalog is exactly four fields; every other role-management endpoint stays forbidden',async t=>{
 const s=await setup()
 await f.repo('Role').save([{code:'pm_catalog',nameAr:'دور مصطنع',permissions:JSON.stringify(['payroll.view']),isSystem:false,isActive:true},{code:'pm_disabled',nameAr:'دور موقوف',permissions:'[]',isSystem:false,isActive:false}])
 const manager=await s.account('manager',['policies.manage'],{scopeAllBranches:true}),branch=await s.account('branch-manager',['policies.manage']),reporter=await s.account('reporter',['policies.report'],{scopeAllBranches:true})
 const rolesAdmin=await s.account('roles-admin',['roles.manage'],{scopeAllBranches:true}),usersAdmin=await s.account('users-admin',['users.manage'],{scopeAllBranches:true})
 const full=await f.ok('GET','/roles'),small=await f.ok('GET','/roles',undefined,manager)
 assert.deepEqual(small,full.map(({id,code,nameAr,isActive})=>({id,code,nameAr,isActive})))
 assert.deepEqual(await f.ok('GET','/roles',undefined,rolesAdmin),full);assert.deepEqual(await f.ok('GET','/roles',undefined,usersAdmin),full)
 for(const actor of [branch,reporter,s.user])assert.equal((await f.request('GET','/roles',undefined,actor)).status,403)
 const row=full.find(r=>r.code==='pm_catalog'),before=await f.repo('Role').findBy({id:row.id}),accountBefore=await f.repo('User').findOneByOrFail({id:s.user.id})
 const routes=[['POST','/roles',{code:'pm_denied',nameAr:'غير مسموح',permissions:[]}],['PATCH',`/roles/${row.id}`,{nameAr:'تغيير ممنوع'}],['GET','/permissions-registry'],['GET',`/users/${s.user.id}/permissions`],['PUT',`/users/${s.user.id}/permissions`,{grants:['payroll.view'],revokes:[]}]]
 for(const [method,route,body]of routes)assert.equal((await f.request(method,route,body,manager)).status,403,route)
 assert.deepEqual(await f.repo('Role').findBy({id:row.id}),before);assert.deepEqual(await f.repo('User').findOneByOrFail({id:s.user.id}),accountBefore)
 t.diagnostic(JSON.stringify({case:'role-catalog',minimalFields:true,fullReadersUnchanged:true,branchDenied:true,otherEndpointsDenied:routes.length,storageUnchanged:true}))
})
