'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,B,n=0
before(async()=>{f=await require('./codex-review-p3g-fixture.cjs')('p3g_account_role');B=await f.repo('Branch').save({code:'P3GAR',name:'Synthetic branch',country:'EG'})})
after(async()=>{if(f)await f.close()})
async function account(extra={}){return f.repo('User').save({email:`overlap-${++n}@review.invalid`,displayName:'Synthetic overlap',passwordHash:'not-a-password',role:'employee',permissions:'[]',branchId:B.id,isActive:true,...extra})}
function barrier(){let enter,release;return{arrived:new Promise(r=>enter=r),resume:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()}}
async function arrived(b,p){let timer;try{await Promise.race([b.arrived,p.then(()=>{throw Error('Operation completed before expected barrier')}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Barrier timeout')),15000)})])}finally{clearTimeout(timer)}}
async function waiting(){let last=0;for(let i=0;i<100;i++){const rows=await f.master.request().input('dbname',f.database).query("SELECT COUNT(*) n FROM sys.dm_exec_requests WHERE database_id = DB_ID(@dbname) AND wait_type LIKE 'LCK_M_%' AND blocking_session_id > 0");last=Number(rows.recordset[0].n);if(last>0)return last;await new Promise(r=>setTimeout(r,30))}throw Error('No real database lock wait was observed')}

for(const first of ['account','role'])test(`P3G-C-${first}: overlapping account and role transactions finish without a lock cycle`,async()=>{
 const role=await f.ok('POST','/roles',{code:'p3g_overlap_'+n,nameAr:'Synthetic overlap role',permissions:[]}),target=await account({role:role.code}),proto=require('typeorm').Repository.prototype
 const originalFind=proto.findOne,originalIncrement=proto.increment,b=barrier();let one,two,once=false
 if(first==='account')proto.findOne=async function(options){const row=await originalFind.call(this,options);if(this.metadata.name==='User'&&options?.lock?.mode==='pessimistic_write'&&row?.id===target.id&&!once){once=true;b.enter();await b.resume}return row}
 else proto.increment=async function(criteria,...args){const result=await originalIncrement.call(this,criteria,...args);if(this.metadata.name==='User'&&criteria.role===role.code&&!once){once=true;b.enter();await b.resume}return result}
 try{
  const edit=()=>f.request('PATCH',`/users/${target.id}`,{isActive:false})
  const grant=()=>f.request('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']})
  one=first==='account'?edit():grant();await arrived(b,one);two=first==='account'?grant():edit()
  const observedWait=await waiting();b.release();const results=await Promise.all([one,two]),stored=await f.repo('User').findOneByOrFail({id:target.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'account-role-lock-order',first,realSqlWait:observedWait>0,statuses:results.map(r=>r.status),version:stored.tokenVersion}))
  assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(stored.tokenVersion,2);assert.equal(stored.isActive,false)
  assert.ok((await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(stored)).includes('settings.manage'))
 }finally{b.release();proto.findOne=originalFind;proto.increment=originalIncrement;if(one)await one;if(two)await two}
})

test('P3G-C-next-role: assigning a different role cannot use a judgement made before its bundle was elevated',async()=>{
 const role=await f.ok('POST','/roles',{code:'p3g_future_'+n,nameAr:'Synthetic proposed role',permissions:[]}),target=await account(),manager=await account({permissions:JSON.stringify(['users.manage'])})
 const proto=require('typeorm').Repository.prototype,original=proto.findOne,b=barrier();let pending,once=false
 proto.findOne=async function(options){if(this.metadata.name==='User'&&options?.lock?.mode==='pessimistic_write'&&options.where?.id===target.id&&!once){once=true;b.enter();await b.resume}return original.call(this,options)}
 try{
  pending=f.request('PATCH',`/users/${target.id}`,{role:role.code},manager);await arrived(b,pending)
  await f.ok('PATCH',`/roles/${role.id}`,{permissions:['settings.manage']})
  const before=await f.repo('User').findOneByOrFail({id:target.id});assert.equal(before.role,'employee');assert.equal(before.tokenVersion,0)
  // Same request with the now-elevated role must be forbidden; the account lock serializes PATCH /users,
  // so compare against an independent same-scope account rather than waiting behind the paused edit.
  const control=await account(),fresh=await f.request('PATCH',`/users/${control.id}`,{role:role.code},manager);assert.equal(fresh.status,403)
  b.release();const result=await pending,stored=await f.repo('User').findOneByOrFail({id:target.id}),perms=await f.app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(stored)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'proposed-role-upgrade',freshDecision:fresh.status,pendingDecision:result.status,versionBeforeAssignment:before.tokenVersion,versionAfterAssignment:stored.tokenVersion,administrativePermissionGranted:perms.includes('settings.manage')}))
  assert.ok([403,409].includes(result.status),'a manager must not assign a role that acquired admin-only permissions after the original judgement');assert.equal(perms.includes('settings.manage'),false)
 }finally{b.release();proto.findOne=original;if(pending)await pending}
})
