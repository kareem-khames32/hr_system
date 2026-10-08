'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto')
let f,B,directory,domain
before(async()=>{f=await require('./codex-review-p3h-fixture.cjs')('p3h_domain_rebinding');B=await f.repo('Branch').save({code:'P3HDR',name:'Synthetic branch',country:'EG'});directory=f.app.get(require('../src/auth/directory.service').DirectoryService);domain=f.app.get(require('../src/auth/domain-login.service').DomainLoginService)})
after(async()=>{if(f)await f.close()})
test('P3H-D-link: a sync link must not attach a directory identity to an account rebound to a different employee',async()=>{
 const make=code=>f.repo('Employee').save({employeeCode:code,fullName:'Synthetic '+code,branchId:B.id,status:'active',isActive:true,joinDate:'2024-01-01'})
 const first=await make('P3H-A'),second=await make('P3H-B')
 const user=await f.repo('User').save({email:'local@domain-review.invalid',displayName:'Synthetic local account',passwordHash:'not-a-password',role:'employee',permissions:'[]',branchId:B.id,employeeId:first.id,isActive:true})
 const external={objectGuid:crypto.randomUUID(),sAMAccountName:'synthetic.person',userPrincipalName:'synthetic.person@review.invalid',mail:'synthetic.person@review.invalid',displayName:'Synthetic directory person',employeeId:first.employeeCode,disabled:false,objectClasses:['person','user']},password=crypto.randomBytes(24).toString('base64url')
 const old={list:directory.listUsers,auth:directory.authenticate,configured:directory.isConfigured,client:directory.client,link:domain.linkExistingUser}
 directory.client=()=>{throw Error('No real LDAP permitted')};directory.isConfigured=()=>true;directory.listUsers=async()=>[{...external}];directory.authenticate=async(name,supplied)=>{assert.equal(name,external.sAMAccountName);assert.equal(supplied,password,'synthetic password must match');return{...external}}
 let enter,release,pending,once=false;const arrived=new Promise(r=>enter=r),resume=new Promise(r=>release=r)
 domain.linkExistingUser=async function(account,...rest){if(account.id===user.id&&!once){once=true;assert.equal(account.employeeId,first.id);enter();await resume}return old.link.call(this,account,...rest)}
 try{
  pending=f.request('POST','/users/domain-sync',{apply:true})
  let timer;try{await Promise.race([arrived,pending.then(()=>{throw Error('Sync completed before barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}
  await f.ok('PATCH',`/users/${user.id}`,{employeeId:second.id})
  const preview=await f.ok('POST','/users/domain-sync',{apply:false}),entry=preview.entries.find(e=>e.objectGuid===external.objectGuid);assert.equal(entry.action,'create');assert.equal(entry.employeeId,first.id)
  release();const sync=await pending,stored=await f.repo('User').findOneByOrFail({id:user.id})
  const response=await fetch('http://127.0.0.1:1/api/auth/login/domain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:external.sAMAccountName,password})}),session=await response.json()
  let guarded=null
  if(session.accessToken){const me=await fetch('http://127.0.0.1:1/api/auth/me',{headers:{Authorization:'Bearer '+session.accessToken}});const payload=await me.json();guarded={status:me.status,otherEmployee:payload.employeeId===second.id}}
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'domain-link-after-rebinding',sync:sync.status,currentPreviewCreatesSeparateAccount:entry.action==='create',staleGuidAttached:stored.domainObjectGuid===external.objectGuid,login:response.status,loggedInAsOtherEmployee:session.user?.employeeId===second.id,guardedAccess:guarded?.status,guardedAsOtherEmployee:guarded?.otherEmployee}))
  assert.notEqual(guarded?.status===200&&guarded.otherEmployee,true,'directory identity matched to employee A must not enter as employee B through the obsolete sync plan')
 }finally{release();domain.linkExistingUser=old.link;directory.listUsers=old.list;directory.authenticate=old.auth;directory.isConfigured=old.configured;directory.client=old.client;if(pending)await pending}
})
