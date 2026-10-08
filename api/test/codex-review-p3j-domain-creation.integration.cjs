'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
let f,B,directory,domain,n=0
const password=()=>crypto.randomBytes(24).toString('base64url')+'Aa9!'
before(async()=>{f=await require('./codex-review-p3j-fixture.cjs')('p3j_domain_creation');B=await f.repo('Branch').save({code:'P3JDC',name:'Synthetic branch',country:'EG'});directory=f.app.get(require('../src/auth/directory.service').DirectoryService);domain=f.app.get(require('../src/auth/domain-login.service').DomainLoginService)})
after(async()=>{if(f)await f.close()})
async function employee(){return f.repo('Employee').save({employeeCode:'P3JDC'+(++n),fullName:'Synthetic directory employee',branchId:B.id,status:'active',isActive:true,joinDate:'2024-01-01'})}
const identity=(emp,label)=>({objectGuid:crypto.randomUUID(),sAMAccountName:label,userPrincipalName:label+'@creation.invalid',mail:label+'@creation.invalid',displayName:'Synthetic directory account',employeeId:emp.employeeCode,disabled:false,objectClasses:['person','user']})
function fake(identities){const credentials=new Map(identities.map(i=>[i.sAMAccountName,password()])),old={configured:directory.isConfigured,auth:directory.authenticate,client:directory.client};directory.isConfigured=()=>true;directory.client=()=>{throw Error('Real LDAP prohibited')};directory.authenticate=async(name,pw)=>{assert.equal(pw,credentials.get(name));return{...identities.find(i=>i.sAMAccountName===name)}};return{restore:()=>{directory.isConfigured=old.configured;directory.authenticate=old.auth;directory.client=old.client},login:async i=>{const r=await fetch('http://127.0.0.1:1/api/auth/login/domain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:i.sAMAccountName,password:credentials.get(i.sAMAccountName)})});return{status:r.status,body:await r.json()}}}}
async function guarded(session){if(!session.body.accessToken)return null;const r=await fetch('http://127.0.0.1:1/api/auth/me',{headers:{Authorization:'Bearer '+session.body.accessToken}}),body=await r.json();return{status:r.status,employeeId:body.employeeId}}
function barrier(count){let enter,release,seen=0;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>{if(++seen===count)enter()},release:()=>release()}}
async function arrived(b,requests){let timer;try{await Promise.race([b.arrived,Promise.all(requests).then(()=>{throw Error('Login completed before creation barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Creation barrier timeout')),12000)})])}finally{clearTimeout(timer)}}

test('P3J-D-sequential: the established GUID prevents a second directory identity from claiming the same employee',async()=>{
 const emp=await employee(),one=identity(emp,'sequential'+n),two=identity(emp,'other'+n),fakeDirectory=fake([one,two])
 try{const first=await fakeDirectory.login(one),second=await fakeDirectory.login(two);assert.equal(first.status,201);assert.equal(second.status,401);assert.equal(await f.repo('User').countBy({employeeId:emp.id}),1);console.log('REVIEW_MEASURE '+JSON.stringify({case:'sequential-domain-control',statuses:[first.status,second.status],accounts:1}))}finally{fakeDirectory.restore()}
})

for(const same of [true,false])test(`P3J-D-create-${same?'same-guid':'two-guids'}: two simultaneous first domain logins do not create duplicate employee accounts`,async()=>{
 const emp=await employee(),one=identity(emp,'first'+n),two=same?one:identity(emp,'second'+n),fakeDirectory=fake(same?[one]:[one,two]),old=domain.createDomainOnlyUser,b=barrier(2);let requests=[]
 domain.createDomainOnlyUser=async function(d,e,email){if(e.id===emp.id){b.enter();await b.resume}return old.call(this,d,e,email)}
 try{
  requests=[fakeDirectory.login(one),fakeDirectory.login(two)];await arrived(b,requests);b.release();const responses=await Promise.all(requests),access=await Promise.all(responses.map(guarded)),rows=await f.repo('User').findBy({employeeId:emp.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'concurrent-domain-creation',sameGuid:same,statuses:responses.map(r=>r.status),accounts:rows.length,protectedSessions:access.filter(r=>r?.status===200&&r.employeeId===emp.id).length}))
  assert.equal(rows.length,1,'only one directory account may claim an employee; another GUID is rejected by the sequential path')
  assert.deepEqual(responses.map(r=>r.status).sort((a,b)=>a-b),same?[201,201]:[201,401]);assert.equal(access.filter(r=>r?.status===200&&r.employeeId===emp.id).length,same?2:1)
 }finally{b.release();domain.createDomainOnlyUser=old;await Promise.allSettled(requests);fakeDirectory.restore()}
})

test('P3J-D-created-account: an existing disabled account appearing after matching is not bypassed by a stale first-login creation',async()=>{
 const emp=await employee(),external=identity(emp,'pending'+n),fakeDirectory=fake([external]),old=domain.createDomainOnlyUser,b=barrier(1);let pending,once=false
 domain.createDomainOnlyUser=async function(d,e,email){if(e.id===emp.id&&!once){once=true;b.enter();await b.resume}return old.call(this,d,e,email)}
 try{
  pending=fakeDirectory.login(external);await arrived(b,[pending])
  const created=await f.request('POST','/users',{email:'local'+n+'@creation.invalid',displayName:'Synthetic local account',password:password(),role:'employee',branchId:B.id,employeeId:emp.id});assert.equal(created.status,201)
  await f.ok('PATCH',`/users/${created.body.id}`,{isActive:false})
  const fresh=await fakeDirectory.login(external);assert.equal(fresh.status,401,'current first-login judgement must reject the disabled employee account')
  b.release();const result=await pending,access=await guarded(result),rows=await f.repo('User').findBy({employeeId:emp.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'domain-creation-after-disabled-account',freshLogin:fresh.status,pendingLogin:result.status,accounts:rows.length,protectedAccess:access?.status,employeeMatches:access?.employeeId===emp.id}))
  assert.ok([401,409].includes(result.status),'stale creation must not create a second active identity that bypasses the current disabled-account refusal');assert.notEqual(access?.status,200)
 }finally{b.release();domain.createDomainOnlyUser=old;if(pending)await pending;fakeDirectory.restore()}
})
