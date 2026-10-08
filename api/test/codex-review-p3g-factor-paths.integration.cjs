'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs'),rules=require('../src/auth/totp')
let f,target,secret,token,totp
before(async()=>{
 f=await require('./codex-review-p3g-fixture.cjs')('p3g_factor_paths');const password=crypto.randomBytes(24).toString('base64url')+'aA9!'
 const user=await f.repo('User').save({email:'factor@review.invalid',displayName:'Synthetic factor account',passwordHash:await bcrypt.hash(password,10),role:'employee',permissions:'[]',isActive:true});target={user,password};totp=f.app.get(require('../src/auth/totp.service').TotpService)
 token=expect(await http('POST','/auth/login',{email:user.email,password}),201).accessToken;secret=expect(await http('POST','/auth/totp/setup',{},token),200).secret
})
after(async()=>{if(f)await f.close()})
async function http(method,route,body,bearer){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...(bearer?{Authorization:'Bearer '+bearer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}}
const expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials omitted');return r.body}

test('P3G-F-domain: domain login rechecks enrollment after opening the new session',async()=>{
 const directory=f.app.get(require('../src/auth/directory.service').DirectoryService),domain=f.app.get(require('../src/auth/domain-login.service').DomainLoginService)
 const originalDirectory=directory.authenticate,originalResolve=domain.resolveUser,originalEnrolled=totp.enrolled
 // Substitute the external domain boundary on the same service instances; never contact a real directory.
 directory.authenticate=async()=>({mail:target.user.email,objectGuid:'synthetic-only'})
 domain.resolveUser=async()=>f.repo('User').findOneByOrFail({id:target.user.id})
 let enter,release,pending,once=false;const reached=new Promise(r=>enter=r),resume=new Promise(r=>release=r)
 totp.enrolled=async function(id){const result=await originalEnrolled.call(this,id);if(id===target.user.id&&!once){once=true;assert.equal(result,false);enter();await resume}return result}
 try{
  pending=http('POST','/auth/login/domain',{username:'synthetic-only',password:target.password,factorProven:true})
  let timer;try{await Promise.race([reached,pending.then(()=>{throw Error('Domain operation completed before barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}
  expect(await http('POST','/auth/totp/confirm',{code:rules.totpCode(rules.base32Decode(secret),rules.totpStepAt(Date.now()))},token),200)
  release();const result=await pending
  const rows=await f.repo('UserSession').find({where:{userId:target.user.id}}),active=rows.filter(r=>!r.revokedAt).length
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'domain-activation-and-client-factor-proven',activation:200,login:result.status,tokenIssued:!!result.body.accessToken,activeSessions:active}))
  assert.equal(result.status,401);assert.equal(result.body.accessToken,undefined);assert.equal(active,1)
 }finally{release();totp.enrolled=originalEnrolled;directory.authenticate=originalDirectory;domain.resolveUser=originalResolve;if(pending)await pending}
})

test('P3G-F-client: a client cannot claim factorProven in a password login',async()=>{
 const result=expect(await http('POST','/auth/login',{email:target.user.email,password:target.password,factorProven:true}),201)
 assert.equal(result.kind,'TOTP');assert.equal(result.accessToken,undefined)
})
