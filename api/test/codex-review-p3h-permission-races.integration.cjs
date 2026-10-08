'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,B,n=0,auth
before(async()=>{f=await require('./codex-review-p3h-fixture.cjs')('p3h_permission_races');B=await f.repo('Branch').save({code:'P3HPR',name:'Synthetic branch',country:'EG'});auth=f.app.get(require('../src/auth/auth.service').AuthService)})
after(async()=>{if(f)await f.close()})
async function account(extra={}){return f.repo('User').save({email:`permissions-${++n}@review.invalid`,displayName:'Synthetic permission account',passwordHash:'not-a-password',role:'employee',permissions:'[]',branchId:B.id,isActive:true,...extra})}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

for(const mode of ['bundle','overrides','scope'])test(`P3H-O-${mode}: permission replacement must retain the identity and effective-rights judgement through the write`,async()=>{
 const role=await f.ok('POST','/roles',{code:'p3h_override_'+n,nameAr:'Synthetic override role',permissions:mode==='overrides'?['settings.manage']:[]})
 const target=await account({role:role.code}),manager=await account({permissions:JSON.stringify(['users.manage'])})
 if(mode==='bundle')await f.ok('PUT',`/users/${target.id}/permissions`,{grants:[],revokes:['settings.manage']})
 const body=mode==='scope'?{grants:['employees.view'],revokes:[]}:{grants:[],revokes:[]},b=barrier(),original=auth.resolvePermissions;let pending,once=false
 // The second resolve is the before-state side of adminGrantViolation. Pause after its actual read,
 // before transaction start; the first resolve with proposed overrides has already returned.
 auth.resolvePermissions=async function(user,proposed){const result=await original.call(this,user,proposed);if(user.id===target.id&&proposed===undefined&&!once){once=true;b.enter();await b.resume}return result}
 try{
  pending=f.request('PUT',`/users/${target.id}/permissions`,body,manager);await arrived(b,pending)
  if(mode==='bundle')await f.ok('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']})
  else if(mode==='overrides')await f.ok('PUT',`/users/${target.id}/permissions`,{grants:[],revokes:['settings.manage']})
  else await f.ok('PATCH',`/users/${target.id}`,{scopeAllBranches:true})
  const changed=await f.repo('User').findOneByOrFail({id:target.id}),before=await original.call(auth,changed)
  assert.equal(before.includes('settings.manage'),false)
  const fresh=await f.request('PUT',`/users/${target.id}/permissions`,body,manager);assert.equal(fresh.status,403)
  b.release();const result=await pending,stored=await f.repo('User').findOneByOrFail({id:target.id}),effective=await original.call(auth,stored)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'permission-write-after-judgement',mode,newJudgement:fresh.status,oldRequest:result.status,versionAtJudgement:mode==='bundle'?1:0,versionAfterInterveningChange:changed.tokenVersion,finalVersion:stored.tokenVersion,adminPermissionGranted:effective.includes('settings.manage'),companyScope:stored.scopeAllBranches===true,employeeViewGranted:effective.includes('employees.view')}))
  assert.ok([403,409].includes(result.status),'a permission writer must reject an obsolete authority/scope judgement')
  assert.equal(effective.includes(mode==='scope'?'employees.view':'settings.manage'),false)
 }finally{b.release();auth.resolvePermissions=original;if(pending)await pending}
})
