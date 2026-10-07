'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
const rules=require('../src/auth/totp'),{TWO_FACTOR_CONFIG_KEY}=require('../src/auth/two-factor.service')
let f,B,n=0
before(async()=>{f=await require('./codex-review-p3d-fixture.cjs')('p3d_auth');B=await f.repo('Branch').save({code:'P3DA',name:'Synthetic auth branch',country:'EG'})})
after(async()=>{if(f)await f.close()})
async function account(permissions=[]){const password='Review-'+crypto.randomBytes(18).toString('base64url'),user=await f.repo('User').save({email:`account-${++n}@review.invalid`,displayName:'Synthetic account',passwordHash:await bcrypt.hash(password,10),role:'employee',permissions:JSON.stringify(permissions),branchId:B.id,isActive:true});return{user,password}}
async function http(method,route,body,headers={}){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json(),cookies:r.headers.getSetCookie()}}
const auth=token=>({Authorization:'Bearer '+token})
const expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials deliberately omitted');return r.body}
const login=a=>http('POST','/auth/login',{email:a.user.email,password:a.password})
const code=secret=>rules.totpCode(rules.base32Decode(secret),rules.totpStepAt(Date.now()))
async function enroll(token){const setup=expect(await http('POST','/auth/totp/setup',{},auth(token)),200);const result=expect(await http('POST','/auth/totp/confirm',{code:code(setup.secret)},auth(token)),200);return{secret:setup.secret,token:result.accessToken}}
test('P3D-A01: a delegated users manager cannot reset MFA on a stronger administrative account',async()=>{
 const manager=await account(['users.manage']),target=await account(['settings.manage'])
 const token=expect(await login(target),201).accessToken;await enroll(token)
 const change=await f.request('PATCH',`/users/${target.user.id}`,{password:'Review-'+crypto.randomBytes(18).toString('base64url')},manager.user)
 assert.equal(change.status,403,'existing takeover protection must reject password reset')
 const reset=await f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user)
 const enabled=await f.app.get(require('../src/auth/totp.service').TotpService).enrolled(target.user.id)
 console.log('REVIEW_MEASURE '+JSON.stringify({case:'mfa-reset-stronger-account',passwordReset:change.status,totpReset:reset.status,enabledAfter:enabled}))
 assert.equal(reset.status,403,'MFA reset must apply the existing stronger-account boundary')
 assert.equal(enabled,true)
})
test('P3D-A02: an email challenge opened before enrollment cannot mint a new unrestricted session after TOTP activation',async()=>{
 const target=await account(),token=expect(await login(target),201).accessToken
 await f.setting(TWO_FACTOR_CONFIG_KEY,'true')
 try{
  f.mailbox.sent.length=0;const challenge=expect(await login(target),201)
  assert.equal(challenge.twoFactor,true);assert.notEqual(challenge.kind,'TOTP')
  const emailCode=f.mailbox.sent.at(-1).text.match(/\b\d{6}\b/)[0]
  await enroll(token)
  const verified=await http('POST','/auth/login/verify',{challengeToken:challenge.challengeToken,code:emailCode})
  const usable=verified.body?.accessToken?(await http('GET','/auth/sessions',undefined,auth(verified.body.accessToken))).status:null
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'email-challenge-after-totp-enrollment',verifyStatus:verified.status,unrestrictedAccess:usable}))
  assert.equal(verified.status,401,'the obsolete email factor must not open a fresh full session')
 }finally{await f.setting(TWO_FACTOR_CONFIG_KEY,'false')}
})
test('P3D-A03: required setup gate and current cookie CSRF isolate sessions and mutation routes',async()=>{
 const target=await account();await f.setting('auth.totp.roles','employee')
 try{
  const session=expect(await login(target),201);assert.equal(session.user.totpSetupRequired,true)
  for(const route of ['/auth/sessions','/auth/security-status','/users'])assert.equal((await http('GET',route,undefined,auth(session.accessToken))).status,403)
  expect(await http('GET','/auth/session',undefined,auth(session.accessToken)),200)
 }finally{await f.setting('auth.totp.roles','')}
 const logged=await http('POST','/auth/login',{email:target.user.email,password:target.password,cookieSession:true})
 expect(logged,201);assert.equal(logged.body.accessToken,undefined);assert.match(logged.cookies[0],/HttpOnly/)
 const cookie=logged.cookies[0].split(';')[0],headers={Cookie:cookie}
 assert.equal((await http('POST','/auth/sessions/end-others',{},headers)).status,403)
 expect(await http('POST','/auth/sessions/end-others',{}, {...headers,'X-CSRF-Token':logged.body.csrfToken}),200)
 expect(await http('POST','/auth/logout',{},headers),200)
 assert.equal((await http('GET','/auth/session',undefined,headers)).status,401)
})
