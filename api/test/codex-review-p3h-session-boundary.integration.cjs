'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
const rules=require('../src/auth/totp'),{TWO_FACTOR_CONFIG_KEY}=require('../src/auth/two-factor.service')
let f,B,n=0,totp,sessions
before(async()=>{f=await require('./codex-review-p3h-fixture.cjs')('p3h_session_boundary');B=await f.repo('Branch').save({code:'P3HSB',name:'Synthetic branch',country:'EG'});totp=f.app.get(require('../src/auth/totp.service').TotpService);sessions=f.app.get(require('../src/auth/user-sessions.service').UserSessionsService)})
after(async()=>{if(f)await f.close()})
async function account(){const password='Review-'+crypto.randomBytes(18).toString('base64url'),user=await f.repo('User').save({email:`boundary-${++n}@review.invalid`,displayName:'Synthetic boundary account',passwordHash:await bcrypt.hash(password,10),role:'employee',permissions:'[]',branchId:B.id,isActive:true});return{user,password}}
async function http(method,route,body,headers={}){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}}
const auth=token=>({Authorization:'Bearer '+token}),expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials omitted');return r.body}
const login=a=>http('POST','/auth/login',{email:a.user.email,password:a.password})
const code=secret=>rules.totpCode(rules.base32Decode(secret),rules.totpStepAt(Date.now()))
async function setup(a){const token=expect(await login(a),201).accessToken;assert.ok(token);const begun=expect(await http('POST','/auth/totp/setup',{},auth(token)),200);return{token,secret:begun.secret}}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

for(const stage of ['before-state','after-state'])test(`P3H-S-${stage}: email activation on each side of the post-open factor read`,async()=>{
 const target=await account(),prepared=await setup(target);await f.setting(TWO_FACTOR_CONFIG_KEY,'true')
 const originalState=totp.loginState,originalOpen=sessions.open,b=barrier();let pending,once=false,openedSid,activation=false,rowExistedBeforeActivation=false
 try{
  f.mailbox.sent.length=0;const challenge=expect(await login(target),201);assert.equal(challenge.twoFactor,true);const mailCode=f.mailbox.sent.at(-1).text.match(/\b\d{6}\b/)[0]
  sessions.open=async function(user,...rest){const sid=await originalOpen.call(this,user,...rest);if(user.id===target.user.id&&!activation)openedSid=sid;return sid}
  totp.loginState=async function(user){if(user.id===target.user.id&&!once){once=true;const state=stage==='after-state'?await originalState.call(this,user):null;if(state)assert.equal(state.enrolled,false);b.enter();await b.resume;return state||originalState.call(this,user)}return originalState.call(this,user)}
  pending=http('POST','/auth/login/verify',{challengeToken:challenge.challengeToken,code:mailCode});await arrived(b,pending)
  assert.ok(openedSid);const row=await f.repo('UserSession').findOneByOrFail({sid:openedSid});assert.equal(row.revokedAt,null);rowExistedBeforeActivation=true
  activation=true;expect(await http('POST','/auth/totp/confirm',{code:code(prepared.secret)},auth(prepared.token)),200)
  b.release();const result=await pending,rowAfter=await f.repo('UserSession').findOneByOrFail({sid:openedSid})
  const fullSession=result.body.accessToken?(await http('GET','/auth/sessions',undefined,auth(result.body.accessToken))).status:null
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'post-open-boundary',stage,rowExistedBeforeActivation,activation:200,verification:result.status,fullSession,rowRevoked:!!rowAfter.revokedAt}))
  if(stage==='before-state'){assert.equal(result.status,401);assert.equal(result.body.accessToken,undefined);assert.ok(rowAfter.revokedAt)}
  else {assert.equal(result.status,200);assert.equal(fullSession,200);assert.equal(rowAfter.revokedAt,null)}
 }finally{b.release();totp.loginState=originalState;sessions.open=originalOpen;if(pending)await pending;await f.setting(TWO_FACTOR_CONFIG_KEY,'false')}
})

test('P3H-S-password: password-only login cannot open a new full session after TOTP activation committed',async()=>{
 const target=await account(),prepared=await setup(target);await f.setting(TWO_FACTOR_CONFIG_KEY,'false')
 const original=totp.enrolled,originalState=totp.loginState,originalOpen=sessions.open,b=barrier();let pending,once=false,activation=false,lateSid,issuerSawEnrolled=false
 try{
  totp.enrolled=async function(id){const state=await original.call(this,id);if(id===target.user.id&&!once){once=true;assert.equal(state,false);b.enter();await b.resume}return state}
  sessions.open=async function(user,...rest){const sid=await originalOpen.call(this,user,...rest);if(user.id===target.user.id&&activation)lateSid=sid;return sid}
  totp.loginState=async function(user){const state=await originalState.call(this,user);if(user.id===target.user.id&&activation)issuerSawEnrolled=state.enrolled;return state}
  pending=login(target);await arrived(b,pending)
  expect(await http('POST','/auth/totp/confirm',{code:code(prepared.secret)},auth(prepared.token)),200)
  assert.equal(await original.call(totp,target.user.id),true);activation=true;b.release();const result=await pending
  const fullSession=result.body.accessToken?(await http('GET','/auth/sessions',undefined,auth(result.body.accessToken))).status:null
  const row=lateSid?await f.repo('UserSession').findOneByOrFail({sid:lateSid}):null
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'password-activation-race',activation:200,login:result.status,newRowAfterActivation:!!row,rowRevoked:row?!!row.revokedAt:null,issuerSawEnrolled,fullSession}))
  assert.equal(fullSession,null,'a password-only login must not issue a usable session whose row opened after activation')
 }finally{b.release();totp.enrolled=original;totp.loginState=originalState;sessions.open=originalOpen;if(pending)await pending}
})
