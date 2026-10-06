'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,gate,service,sequence=0
before(async()=>{f=await require('./codex-review-p2m-fixture.cjs')('p2m_closure');gate=f.app.get(require('../src/policies/policy-gate').PolicyGate);service=f.app.get(require('../src/policies/policies.service').PoliciesService)},{timeout:180000})
after(async()=>{if(f)await f.close()})
const today=()=>require('../src/policies/policy-rules').policyLocalDate(new Date())
async function scenario(){
 const n=++sequence,a=await f.repo('Branch').save({code:'PLA'+n,name:'فرع مصطنع أ '+n}),b=await f.repo('Branch').save({code:'PLB'+n,name:'فرع مصطنع ب '+n})
 const employee=(label,branchId)=>f.repo('Employee').save({employeeCode:'PL'+n+label,fullName:'موظف مصطنع '+label+' '+n,branchId,joinDate:'2020-01-01',basicSalary:6000,isActive:true,status:'active'})
 const e=await employee('target',a.id),other=await employee('other',b.id)
 const account=(label,employeeId,branchId,permissions=[],extra={})=>f.repo('User').save({email:`pl-${n}-${label}@review.invalid`,displayName:'قارئ مصطنع '+label,passwordHash:'synthetic',role:'employee',employeeId,branchId,permissions:JSON.stringify(permissions),isActive:true,...extra})
 const user=await account('self',e.id,a.id),foreign=await account('foreign',other.id,b.id),reader=await account('reader',null,a.id,['policies.report','audit.view'])
 const company=await account('company',null,a.id,['policies.manage','policies.report','audit.view'],{scopeAllBranches:true})
 const policy=await f.ok('POST','/policies',{title:'سياسة مصطنعة '+n,isMandatory:true,graceDays:0,audience:{mode:'employees',ids:[e.id]}})
 const version=await f.ok('POST',`/policies/${policy.id}/versions`,{bodyText:'نص مصطنع '+n,effectiveDate:today()})
 return{n,a,b,e,other,user,foreign,reader,company,policy,version}
}
const pending=u=>f.ok('GET','/policies/pending',undefined,u)
const self=u=>f.request('GET','/policies/mine',undefined,u)
const protectedRead=u=>f.request('GET','/requests/mine',undefined,u)

test('P2L bootstrap read failure must not open an overdue account after SQL recovers',async t=>{
 const s=await scenario();assert.equal((await protectedRead(s.user)).body.code,'POLICY_ACK_REQUIRED')
 const original=f.ds.query
 gate.reset();let faulted=0
 f.ds.query=function(sql,...args){if(String(sql).includes('SELECT TOP (1) p.[id] FROM [policies]')&&faulted++===0)return Promise.reject(new Error('Synthetic one-time startup database fault'));return original.call(this,sql,...args)}
 try{
  await gate.onApplicationBootstrap();f.ds.query=original
  const obligation=await pending(s.user),actual=await protectedRead(s.user)
  t.diagnostic(JSON.stringify({case:'bootstrap-fail-open',faultInjected:faulted===1,pendingBlocked:obligation.blocked,protectedStatus:actual.status,code:actual.body.code??null}))
  assert.equal(obligation.blocked,true);assert.equal(actual.body.code,'POLICY_ACK_REQUIRED','A failed bootstrap probe cannot mean no mandatory policies')
 }finally{f.ds.query=original;await gate.changed()}
})

test('P2L clear cache must not cross account relinking and a new token version',async t=>{
 const s=await scenario()
 assert.equal((await protectedRead(s.foreign)).status,200)
 // Rebind through the supported account endpoint; first release the target employee.
 await f.ok('PATCH',`/users/${s.user.id}`,{employeeId:null})
 await f.ok('PATCH',`/users/${s.foreign.id}`,{employeeId:s.e.id})
 const rebound=await f.repo('User').findOneByOrFail({id:s.foreign.id})
 assert.equal(rebound.employeeId,s.e.id);assert.ok(rebound.tokenVersion>s.foreign.tokenVersion)
 const obligation=await pending(rebound),actual=await protectedRead(rebound)
 t.diagnostic(JSON.stringify({case:'identity-cache',previousEmployeeId:s.other.id,currentEmployeeId:rebound.employeeId,tokenVersionChanged:true,pendingBlocked:obligation.blocked,protectedStatus:actual.status,code:actual.body.code??null}))
 try{assert.equal(obligation.blocked,true);assert.equal(actual.body.code,'POLICY_ACK_REQUIRED','The clear result belonged to another employee and session')}finally{await gate.changed()}
})

test('P2L branch views follow current audience; foreign identities and policy events stay hidden',async t=>{
 const s=await scenario()
 const before=await f.ok('GET',`/policies/${s.policy.id}/report`,undefined,s.reader)
 assert.deepEqual(before.rows.map(x=>x.employeeId),[s.e.id]);assert.equal(before.summary.overdue,1)
 assert.equal((await self(s.foreign)).body.policies.some(x=>x.policyId===s.policy.id),false)
 await f.repo('Employee').update({id:s.e.id},{branchId:s.b.id})
 const missing=await f.request('GET','/policies/999999/report',undefined,s.reader)
 for(const route of [`/policies/${s.policy.id}`,`/policies/${s.policy.id}/report`,`/policies/versions/${s.version.id}`]){
  const hidden=await f.request('GET',route,undefined,s.reader);assert.deepEqual([hidden.status,hidden.body.message],[missing.status,missing.body.message])
 }
 assert.equal((await f.ok('GET','/policies',undefined,s.reader)).policies.some(x=>x.id===s.policy.id),false)
 const audit=await f.ok('GET',`/audit?entityType=policy&entityId=${s.policy.id}`,undefined,s.reader);assert.equal(audit.total,0)
 assert.equal((await f.ok('GET',`/policies/${s.policy.id}/report`,undefined,s.company)).rows[0].employeeId,s.e.id)
 t.diagnostic(JSON.stringify({case:'branch-views',listHidden:true,detailReportContentUniform404:true,auditHidden:true,companyPreserved:true}))
})

test('P2L acknowledgement is self only, unique, preserves evidence and opens gate; material publication re-closes it',async t=>{
 const s=await scenario(),content=await f.ok('GET',`/policies/versions/${s.version.id}`,undefined,s.user)
 assert.equal(content.contentHash,require('../src/policies/policy-rules').policyContentHash(content.bodyText))
 const ack=(user,hash=content.contentHash)=>f.request('POST',`/policies/versions/${s.version.id}/acknowledge`,{contentHash:hash,employeeId:s.other.id},user)
 assert.equal((await ack(s.foreign)).status,404);assert.equal((await ack(s.user,'0'.repeat(64))).status,409)
 const pair=await Promise.all([ack(s.user),ack(s.user)]);assert.deepEqual(pair.map(x=>x.status),[201,201]);assert.equal(pair[0].body.id,pair[1].body.id)
 const rows=await f.repo('PolicyAcknowledgement').findBy({policyId:s.policy.id});assert.equal(rows.length,1);assert.equal(rows[0].employeeId,s.e.id);assert.equal(rows[0].userId,s.user.id);assert.equal(rows[0].contentHash,content.contentHash);assert.ok(rows[0].ip);assert.ok(rows[0].userAgent)
 assert.equal((await protectedRead(s.user)).status,200)
 await f.ok('POST',`/policies/${s.policy.id}/versions`,{bodyText:'نص بديل جوهري',effectiveDate:today(),isMaterial:true})
 assert.equal((await protectedRead(s.user)).body.code,'POLICY_ACK_REQUIRED');assert.equal((await ack(s.user)).status,404)
 assert.deepEqual(await f.repo('PolicyAcknowledgement').findBy({policyId:s.policy.id}),rows)
 t.diagnostic(JSON.stringify({case:'proof-control',duplicates:1,selfOnly:true,hash:true,device:true,newMaterialReblocks:true,oldEvidenceUnchanged:true}))
})

test('P2L policy manager can populate the existing role audience selector without account-administration rights',async t=>{
 const s=await scenario()
 assert.equal((await f.ok('GET','/policies',undefined,s.company)).canManage,true)
 assert.equal((await f.request('GET','/branches',undefined,s.company)).status,200)
 const roles=await f.request('GET','/roles',undefined,s.company)
 const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'../../src/app/policies/page.tsx'),'utf8')
 assert.ok(ui.includes('fetchRolesFull()'));assert.ok(ui.includes('.catch(() => setRoles([]))'))
 t.diagnostic(JSON.stringify({case:'policy-role-editor',canManage:true,branchesStatus:200,roleSourceStatus:roles.status,uiSilentlyUsesEmptyRoles:true}))
 assert.equal(roles.status,200,'The role picker used by the policy editor must be available to its authorized manager')
})
