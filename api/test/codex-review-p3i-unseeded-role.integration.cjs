'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,B
before(async()=>{f=await require('./codex-review-p3i-fixture.cjs')('p3i_unseeded_role');B=await f.repo('Branch').save({code:'P3IUR',name:'Synthetic branch',country:'EG'})})
after(async()=>{if(f)await f.close()})
test('P3I-U-preset: a missing role row must stay pinned after the final roleStamp read',async()=>{
 assert.equal(await f.repo('Role').countBy({code:'employee'}),0,'supported PRESET fallback; no existing role is deleted')
 const source=await f.ok('POST','/roles',{code:'p3i_source',nameAr:'Synthetic source role',permissions:[]})
 const make=email=>f.repo('User').save({email,displayName:'Synthetic account',passwordHash:'not-a-password',role:source.code,permissions:'[]',branchId:B.id,isActive:true})
 const target=await make('target@preset.invalid'),manager=await make('manager@preset.invalid');manager.permissions=JSON.stringify(['users.manage']);await f.repo('User').save(manager)
 const proto=f.app.get(require('../src/auth/users.controller').UsersController),original=proto.roleStamp;let enter,release,once=false,pending,created
 const arrived=new Promise(r=>enter=r),resume=new Promise(r=>release=r)
 proto.roleStamp=async function(code,em){const stamp=await original.call(this,code,em);if(code==='employee'&&em&&!once){once=true;assert.equal(stamp,'PRESET');enter();await resume}return stamp}
 try{
  pending=f.request('PATCH',`/users/${target.id}`,{role:'employee'},manager)
  let timer;try{await Promise.race([arrived,pending.then(()=>{throw Error('Edit completed before barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}
  created=f.request('POST','/roles',{code:'employee',nameAr:'Synthetic newly inserted preset',permissions:['settings.manage']})
  let completed=false,result;created.then(r=>{completed=true;result=r})
  for(let i=0;i<60&&!completed;i++)await new Promise(r=>setTimeout(r,25))
  // A range lock would safely make insertion wait until assignment commits. Do not hold a test barrier against it.
  if(!completed){release();const edit=await pending,insert=await created;console.log('REVIEW_MEASURE '+JSON.stringify({case:'unseeded-role-stamp',insertWaited:true,edit:edit.status,insert:insert.status}));assert.equal(edit.status,200);assert.equal(insert.status,201);assert.equal((await f.repo('User').findOneByOrFail({id:target.id})).tokenVersion,2);return}
  assert.equal(result.status,201)
  const control=await make('control@preset.invalid'),fresh=await f.request('PATCH',`/users/${control.id}`,{role:'employee'},manager);assert.equal(fresh.status,403)
  release();const assigned=await pending,stored=await f.repo('User').findOneByOrFail({id:target.id}),perms=await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(stored)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'unseeded-role-stamp',insertWaited:false,insert:201,newJudgement:fresh.status,assignment:assigned.status,administrativePermissionGranted:perms.includes('settings.manage')}))
  assert.ok([403,409].includes(assigned.status),'role creation after the final absent-row read must not bypass the assignment judgement');assert.equal(perms.includes('settings.manage'),false)
 }finally{release();proto.roleStamp=original;if(pending)await pending;if(created)await created}
})
