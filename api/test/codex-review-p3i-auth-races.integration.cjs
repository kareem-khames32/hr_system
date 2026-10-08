'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
const rules=require('../src/auth/totp'),{TWO_FACTOR_CONFIG_KEY}=require('../src/auth/two-factor.service')
let f,B,n=0,totp
before(async()=>{f=await require('./codex-review-p3i-fixture.cjs')('p3i_auth_races');B=await f.repo('Branch').save({code:'P3IRA',name:'Synthetic auth race branch',country:'EG'});totp=f.app.get(require('../src/auth/totp.service').TotpService)})
after(async()=>{if(f)await f.close()})
async function account(permissions=[],extra={}){const password='Review-'+crypto.randomBytes(18).toString('base64url'),user=await f.repo('User').save({email:`race-${++n}@review.invalid`,displayName:'Synthetic race account',passwordHash:await bcrypt.hash(password,10),role:'employee',permissions:JSON.stringify(permissions),branchId:B.id,isActive:true,...extra});return{user,password}}
async function http(method,route,body,headers={}){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}}
const auth=token=>({Authorization:'Bearer '+token})
const expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials omitted');return r.body}
const login=a=>http('POST','/auth/login',{email:a.user.email,password:a.password})
const code=(secret,offset=0)=>rules.totpCode(rules.base32Decode(secret),rules.totpStepAt(Date.now())+offset)
async function setup(a){const token=expect(await login(a),201).accessToken;assert.ok(token);const begun=expect(await http('POST','/auth/totp/setup',{},auth(token)),200);return{token,secret:begun.secret}}
async function enroll(a){const prepared=await setup(a);const finished=expect(await http('POST','/auth/totp/confirm',{code:code(prepared.secret)},auth(prepared.token)),200);return{...prepared,token:finished.accessToken}}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

for(const mode of ['role','override','direct'])test(`P3I-R-${mode}: reset cannot pass a concurrent privilege promotion through ${mode}`,async()=>{
 const manager=await account(['users.manage']),role=mode==='role'?await f.ok('POST','/roles',{code:'p3i_role_'+n,nameAr:'Synthetic review role',permissions:[]}):null
 const target=await account([],role?{role:role.code}:{})
 await enroll(target)
 const original=totp.adminReset,b=barrier();let pending,once=false
 totp.adminReset=async function(actor,row){if(row.id===target.user.id&&!once){once=true;b.enter();await b.resume}return original.call(this,actor,row)}
 try{
  pending=f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user);await arrived(b,pending)
  if(mode==='role')await f.ok('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']})
  else if(mode==='override')await f.ok('PUT',`/users/${target.user.id}/permissions`,{grants:['settings.manage'],revokes:[]})
  else await f.ok('PATCH',`/users/${target.user.id}`,{permissions:['settings.manage']})
  const fresh=await f.repo('User').findOneByOrFail({id:target.user.id})
  assert.ok((await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(fresh)).includes('settings.manage'))
  const currentDecision=await f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user);assert.equal(currentDecision.status,403)
  b.release();const result=await pending,enabled=await totp.enrolled(target.user.id)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'reset-promotion-'+mode,currentDecision:403,racingReset:result.status,enabledAfter:enabled,versionChanged:fresh.tokenVersion!==(target.user.tokenVersion||0)}))
  assert.ok([403,409].includes(result.status),'promotion must invalidate the earlier reset judgement');assert.equal(enabled,true)
 }finally{b.release();totp.adminReset=original;if(pending)await pending}
})

for(const stopAt of [1,2])test(`P3I-R-mail-${stopAt}: activation while email verification is at factor check ${stopAt}`,async()=>{
 const target=await account(),prepared=await setup(target)
 await f.setting(TWO_FACTOR_CONFIG_KEY,'true')
 const original=totp.enrolled,originalState=totp.loginState,sessions=f.app.get(require('../src/auth/user-sessions.service').UserSessionsService),originalOpen=sessions.open,b=barrier();let pending,calls=0,activationDone=false,newSessionAfterActivation=false,issuerSawEnabled=false
 try{
  f.mailbox.sent.length=0;const challenge=expect(await login(target),201);assert.equal(challenge.twoFactor,true)
  const mailCode=f.mailbox.sent.at(-1).text.match(/\b\d{6}\b/)[0]
  totp.enrolled=async function(id){const result=await original.call(this,id);if(id===target.user.id&&++calls===stopAt){assert.equal(result,false);b.enter();await b.resume}return result}
  sessions.open=async function(user,...args){if(user.id===target.user.id&&activationDone)newSessionAfterActivation=true;return originalOpen.call(this,user,...args)}
  totp.loginState=async function(user){const state=await originalState.call(this,user);if(user.id===target.user.id&&activationDone&&state.enrolled)issuerSawEnabled=true;return state}
  pending=http('POST','/auth/login/verify',{challengeToken:challenge.challengeToken,code:mailCode});await arrived(b,pending)
  const activation=await http('POST','/auth/totp/confirm',{code:code(prepared.secret)},auth(prepared.token));expect(activation,200)
  assert.equal(await original.call(totp,target.user.id),true)
  activationDone=true
  b.release();const result=await pending
  const access=result.body.accessToken?(await http('GET','/auth/sessions',undefined,auth(result.body.accessToken))).status:null
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'email-activation-race',factorCheck:stopAt,activation:activation.status,verification:result.status,fullSession:access,newSessionAfterActivation,issuerSawEnabled}))
  assert.equal(result.status,401,'activation completed before the old email verification issued its session')
 }finally{b.release();totp.enrolled=original;totp.loginState=originalState;sessions.open=originalOpen;if(pending)await pending;await f.setting(TWO_FACTOR_CONFIG_KEY,'false')}
})

test('P3I-R-disabled: a pending TOTP challenge is rejected after disable',async()=>{
 const target=await account(),prepared=await enroll(target),challenge=expect(await login(target),201)
 assert.equal(challenge.kind,'TOTP')
 // Use the next accepted time step so the enrollment code is never reused.
 const nextCode=code(prepared.secret,1)
 expect(await http('POST','/auth/totp/disable',{code:nextCode},auth(prepared.token)),200)
 const verified=await http('POST','/auth/login/verify',{challengeToken:challenge.challengeToken,code:nextCode})
 assert.equal(verified.status,401);assert.equal(verified.body.accessToken,undefined)
})
