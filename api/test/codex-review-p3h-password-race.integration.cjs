'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
let f,B,n=0,authService
before(async()=>{f=await require('./codex-review-p3h-fixture.cjs')('p3h_password_race');B=await f.repo('Branch').save({code:'P3HPW',name:'Synthetic branch',country:'EG'});authService=f.app.get(require('../src/auth/auth.service').AuthService)})
after(async()=>{if(f)await f.close()})
const password=()=>crypto.randomBytes(24).toString('base64url')+'aA9!'
async function account(extra={}){const secret=password(),user=await f.repo('User').save({email:`password-${++n}@review.invalid`,displayName:'Synthetic account',passwordHash:await bcrypt.hash(secret,10),role:'employee',permissions:'[]',branchId:B.id,isActive:true,...extra});return{user,password:secret}}
async function http(method,route,body,token){const r=await fetch('http://127.0.0.1:1/api'+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,body:await r.json()}}
const expect=(r,status)=>{assert.equal(r.status,status,'HTTP status only; credentials omitted');return r.body}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

for(const mode of ['role','legacy-grant','role-bundle'])test(`P3H-P-${mode}: changing a password must not reissue revoked authority with the current version`,async()=>{
 const role=mode==='role-bundle'?await f.ok('POST','/roles',{code:'p3h_password_role_'+n,nameAr:'Synthetic password role',permissions:['users.manage']}):null
 const target=await account(mode==='role'?{role:'super_admin'}:role?{role:role.code}:{permissions:JSON.stringify(['users.manage'])})
 const token=expect(await http('POST','/auth/login',{email:target.user.email,password:target.password}),201).accessToken
 expect(await http('GET','/users',undefined,token),200)
 const original=authService.users.update,b=barrier();let pending,once=false
 authService.users.update=async function(criteria,patch){if(criteria.id===target.user.id&&patch.passwordHash&&!once){once=true;b.enter();await b.resume}return original.call(this,criteria,patch)}
 try{
  pending=http('POST','/auth/change-password',{currentPassword:target.password,newPassword:password()},token);await arrived(b,pending)
  if(mode==='role')await f.ok('PATCH',`/users/${target.user.id}`,{role:'employee'})
  else if(mode==='legacy-grant')await f.ok('PATCH',`/users/${target.user.id}`,{permissions:[]})
  else await f.ok('PATCH',`/roles/${role.id}`,{permissions:[]})
  const downgraded=await f.repo('User').findOneByOrFail({id:target.user.id})
  const actualPermissions=await authService.resolvePermissions(downgraded);assert.equal(actualPermissions.includes('users.manage')||actualPermissions.includes('*'),false)
  expect(await http('GET','/users',undefined,token),401)
  b.release();const changed=await pending,fresh=await f.repo('User').findOneByOrFail({id:target.user.id})
  const privileged=changed.body.accessToken?await http('GET','/users',undefined,changed.body.accessToken):null
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'password-current-version-stale-authority',mode,changePassword:changed.status,dbRole:fresh.role,responseRole:changed.body.user?.role,currentVersion:fresh.tokenVersion,versionAfterRevocation:downgraded.tokenVersion,privilegedAccess:privileged?.status??null}))
  assert.equal(fresh.tokenVersion,downgraded.tokenVersion+1,'atomic increment preserves the revocation increment')
  assert.notEqual(privileged?.status,200,'new password session must not restore authority revoked before its row was opened')
 }finally{b.release();authService.users.update=original;if(pending)await pending}
})
