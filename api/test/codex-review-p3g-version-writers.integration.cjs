'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
const rules=require('../src/auth/totp')
let f,B,n=0,totp,usersController
before(async()=>{f=await require('./codex-review-p3g-fixture.cjs')('p3g_version_writers');B=await f.repo('Branch').save({code:'P3GVW',name:'Synthetic branch',country:'EG'});totp=f.app.get(require('../src/auth/totp.service').TotpService);usersController=f.app.get(require('../src/auth/users.controller').UsersController)})
after(async()=>{if(f)await f.close()})
async function account(permissions=[],extra={}){const password='Review-'+crypto.randomBytes(18).toString('base64url'),user=await f.repo('User').save({email:`version-${++n}@review.invalid`,displayName:'Synthetic version account',passwordHash:await bcrypt.hash(password,10),role:'employee',permissions:JSON.stringify(permissions),branchId:B.id,isActive:true,...extra});return{user,password}}
async function http(method,route,body,token){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}}
const expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials omitted');return r.body}
async function enroll(a){const token=expect(await http('POST','/auth/login',{email:a.user.email,password:a.password}),201).accessToken;const begun=expect(await http('POST','/auth/totp/setup',{},token),200);expect(await http('POST','/auth/totp/confirm',{code:rules.totpCode(rules.base32Decode(begun.secret),rules.totpStepAt(Date.now()))},token),200)}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

for(const mode of ['role','override'])test(`P3G-V-${mode}: a concurrent ordinary account edit cannot erase the permission version and revive a stale reset`,async()=>{
 const manager=await account(['users.manage']),role=mode==='role'?await f.ok('POST','/roles',{code:'p3g_version_'+n,nameAr:'Synthetic role',permissions:[]}):null,target=await account([],role?{role:role.code}:{})
 await enroll(target)
 const resetOriginal=totp.adminReset,saveOriginal=usersController.users.findOne,resetBarrier=barrier(),saveBarrier=barrier();let pendingReset,pendingEdit,resetOnce=false,saveOnce=false
 totp.adminReset=async function(actor,row){if(row.id===target.user.id&&!resetOnce){resetOnce=true;resetBarrier.enter();await resetBarrier.resume}return resetOriginal.call(this,actor,row)}
 // Pause after the initial unlocked read; the subsequent save now runs under a row lock.
 usersController.users.findOne=async function(...args){const row=await saveOriginal.apply(this,args);if(row?.id===target.user.id&&resetOnce&&!saveOnce){saveOnce=true;saveBarrier.enter();await saveBarrier.resume}return row}
 try{
  pendingReset=f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user);await arrived(resetBarrier,pendingReset)
  pendingEdit=f.request('PATCH',`/users/${target.user.id}`,{displayName:'Synthetic renamed account'});await arrived(saveBarrier,pendingEdit)
  if(mode==='role')await f.ok('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']})
  else await f.ok('PUT',`/users/${target.user.id}/permissions`,{grants:['settings.manage'],revokes:[]})
  const promoted=await f.repo('User').findOneByOrFail({id:target.user.id});assert.equal(promoted.tokenVersion,(target.user.tokenVersion||0)+1)
  saveBarrier.release();expect(await pendingEdit,409)
  const afterEdit=await f.repo('User').findOneByOrFail({id:target.user.id}),effective=await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(afterEdit)
  assert.ok(effective.includes('settings.manage'));const current=await f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user);assert.equal(current.status,403)
  resetBarrier.release();const reset=await pendingReset,enabled=await totp.enrolled(target.user.id)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'version-overwritten-'+mode,initialVersion:target.user.tokenVersion||0,promotedVersion:promoted.tokenVersion,afterOrdinaryEdit:afterEdit.tokenVersion,currentReset:current.status,racingReset:reset.status,enabledAfter:enabled}))
  assert.equal(afterEdit.tokenVersion,promoted.tokenVersion);assert.ok([403,409].includes(reset.status),'a stale reset cannot pass after promotion and ordinary account editing');assert.equal(enabled,true)
 }finally{resetBarrier.release();saveBarrier.release();totp.adminReset=resetOriginal;usersController.users.findOne=saveOriginal;if(pendingEdit)await pendingEdit;if(pendingReset)await pendingReset}
})

test('P3G-V-role-name: renaming a stale role cannot restore elevated permissions without moving the account version',async()=>{
 const manager=await account(['users.manage']),role=await f.ok('POST','/roles',{code:'p3g_stale_role_'+n,nameAr:'Synthetic original role',permissions:['settings.manage']}),target=await account([],{role:role.code})
 await enroll(target)
 const repo=f.app.get(require('../src/auth/roles.controller').RolesController).roles,saveOriginal=repo.findOne,resetOriginal=totp.adminReset,saveBarrier=barrier(),resetBarrier=barrier();let pendingRename,pendingReset,saveOnce=false,resetOnce=false
 repo.findOne=async function(...args){const row=await saveOriginal.apply(this,args);if(row?.id===role.id&&!saveOnce){saveOnce=true;saveBarrier.enter();await saveBarrier.resume}return row}
 totp.adminReset=async function(actor,row){if(row.id===target.user.id&&!resetOnce){resetOnce=true;resetBarrier.enter();await resetBarrier.resume}return resetOriginal.call(this,actor,row)}
 try{
  pendingRename=f.request('PATCH',`/roles/${role.id}`,{nameAr:'Synthetic renamed role'});await arrived(saveBarrier,pendingRename)
  await f.ok('PATCH',`/roles/${role.id}`,{permissions:[]})
  const downgraded=await f.repo('User').findOneByOrFail({id:target.user.id})
  pendingReset=f.request('POST',`/users/${target.user.id}/totp-reset`,{},manager.user);await arrived(resetBarrier,pendingReset)
  saveBarrier.release();expect(await pendingRename,409)
  const restored=await f.repo('User').findOneByOrFail({id:target.user.id}),effective=await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(restored)
  assert.equal(effective.includes('settings.manage'),false)
  const storedRole=await f.repo('Role').findOneByOrFail({id:role.id});assert.equal(storedRole.nameAr,'Synthetic original role');assert.deepEqual(JSON.parse(storedRole.permissions),[])
  resetBarrier.release();const reset=await pendingReset,enabled=await totp.enrolled(target.user.id)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'stale-role-rename',rename:409,versionBeforeRestore:downgraded.tokenVersion,versionAfterRestore:restored.tokenVersion,administrativePermissionRestored:false,racingReset:reset.status,enabledAfter:enabled}))
  assert.equal(restored.tokenVersion,downgraded.tokenVersion);assert.equal(reset.status,200,'reset is valid for the still-downgraded account');assert.equal(enabled,false)
 }finally{saveBarrier.release();resetBarrier.release();repo.findOne=saveOriginal;totp.adminReset=resetOriginal;if(pendingRename)await pendingRename;if(pendingReset)await pendingReset}
})
