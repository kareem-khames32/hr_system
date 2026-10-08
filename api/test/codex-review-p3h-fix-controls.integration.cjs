'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs')
let f,B,n=0
before(async()=>{f=await require('./codex-review-p3h-fixture.cjs')('p3h_fix_controls');B=await f.repo('Branch').save({code:'P3HFC',name:'Synthetic branch',country:'EG'})})
after(async()=>{if(f)await f.close()})
const password=()=>crypto.randomBytes(24).toString('base64url')+'aA9!'
async function account(extra={}){return f.repo('User').save({email:`control-${++n}@review.invalid`,displayName:'Synthetic control',passwordHash:await bcrypt.hash(password(),10),role:'employee',permissions:'[]',branchId:B.id,isActive:true,...extra})}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}

test('P3H-F-create: existing proposed role changed before the lock rejects creation with no account row',async()=>{
 const role=await f.ok('POST','/roles',{code:'p3h_create_control',nameAr:'Synthetic creation role',permissions:[]}),manager=await account({permissions:JSON.stringify(['users.manage'])}),email='created@p3h.invalid'
 const proto=require('typeorm').Repository.prototype,original=proto.findOne,b=barrier();let pending,once=false
 proto.findOne=async function(options){if(this.metadata.name==='Role'&&options?.lock?.mode==='pessimistic_write'&&options.where?.code===role.code&&!once){once=true;b.enter();await b.resume}return original.call(this,options)}
 try{
  pending=f.request('POST','/users',{email,displayName:'Synthetic new account',password:password(),role:role.code,branchId:B.id},manager);await arrived(b,pending)
  await f.ok('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']});b.release();const result=await pending
  assert.equal(result.status,409);assert.equal(await f.repo('User').countBy({email}),0)
 }finally{b.release();proto.findOne=original;if(pending)await pending}
})

test('P3H-F-temporary: a stale second member rolls back the entire temporary-password batch',async()=>{
 const first=await account(),second=await account(),manager=await account({permissions:JSON.stringify(['users.manage'])})
 const proto=require('typeorm').UpdateQueryBuilder.prototype,original=proto.execute,b=barrier();let pending,once=false
 proto.execute=async function(...args){const params=this.getParameters();if(this.expressionMap.mainAlias?.metadata?.name==='User'&&this.expressionMap.valuesSet?.passwordHash&&params.id===second.id&&!once){once=true;b.enter();await b.resume}return original.apply(this,args)}
 try{
  pending=f.request('POST','/users/temporary-password',{userIds:[first.id,second.id],password:password()},manager);await arrived(b,pending)
  await f.ok('PUT',`/users/${second.id}/permissions`,{grants:['settings.manage'],revokes:[]});b.release();const result=await pending
  const a=await f.repo('User').findOneByOrFail({id:first.id}),z=await f.repo('User').findOneByOrFail({id:second.id})
  const [audit]=await f.ds.query("SELECT COUNT(*) n FROM audit_log WHERE action = N'TEMP_PASSWORD_SET' AND entityId IN (@0,@1)",[String(first.id),String(second.id)])
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'temporary-password-batch-rollback',status:result.status,firstVersion:a.tokenVersion,secondVersion:z.tokenVersion,passwordsUnchanged:a.passwordHash===first.passwordHash&&z.passwordHash===second.passwordHash,temporaryPasswordAudits:Number(audit.n)}))
  assert.equal(result.status,409);assert.equal(a.passwordHash,first.passwordHash);assert.equal(z.passwordHash,second.passwordHash);assert.equal(a.tokenVersion,0);assert.equal(z.tokenVersion,1);assert.equal(Number(audit.n),0)
 }finally{b.release();proto.execute=original;if(pending)await pending}
})

test('P3H-F-reactivate: promotion after the takeover check rejects reactivation and leaves the account inactive',async()=>{
 const target=await account({isActive:false}),manager=await account({permissions:JSON.stringify(['users.manage'])}),controller=f.app.get(require('../src/auth/users.controller').UsersController),original=controller.takeoverBeyond,b=barrier();let pending,once=false
 controller.takeoverBeyond=async function(actor,row){const result=await original.call(this,actor,row);if(row.id===target.id&&!once){once=true;assert.equal(result,null);b.enter();await b.resume}return result}
 try{
  pending=f.request('PATCH',`/users/${target.id}`,{isActive:true},manager);await arrived(b,pending)
  await f.ok('PUT',`/users/${target.id}/permissions`,{grants:['settings.manage'],revokes:[]});b.release();const result=await pending,stored=await f.repo('User').findOneByOrFail({id:target.id})
  assert.equal(result.status,409);assert.equal(stored.isActive,false);assert.equal(stored.tokenVersion,1)
 }finally{b.release();controller.takeoverBeyond=original;if(pending)await pending}
})
