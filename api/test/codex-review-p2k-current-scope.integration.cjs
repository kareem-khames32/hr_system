'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,sequence=0
before(async()=>{f=await require('./codex-review-p2k-fixture.cjs')('p2k_current_scope');await f.setting('notifications.email.enabled','false')},{timeout:120000})
after(async()=>{if(f)await f.close()})
async function move(employeeId,branchId){
 const context=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${employeeId}`)
 return f.ok('PATCH',`/employees/${employeeId}`,{branchId,calendarChange:{effectiveFrom:require('../src/requests/approval-delegations').delegationLocalDate(new Date()),reason:'نقل مصطنع لمراجعة نطاق التفويض',expectedRevision:context.revision,expectedCurrentSourceHash:context.currentSourceHash}})
}
async function scenario(foreign=false){
 const n=++sequence
 const a=await f.repo('Branch').save({code:'JA'+n,name:'فرع المراجعة أ '+n}),b=await f.repo('Branch').save({code:'JB'+n,name:'فرع المراجعة ب '+n})
 const employee=(name,branchId)=>f.repo('Employee').save({employeeCode:'J'+n+name,fullName:'هوية مصطنعة '+name+' '+n,nationalId:'REVIEW-'+n+'-'+name,branchId,joinDate:'2020-01-01',basicSalary:6000,isActive:true,status:'active'})
 const principal=await employee('principal',a.id),delegate=await employee('delegate',foreign?b.id:a.id)
 const account=(name,employeeId,branchId,permissions=[],extra={})=>f.repo('User').save({email:`j-${n}-${name}@review.invalid`,displayName:'قارئ مصطنع '+name,passwordHash:'synthetic',role:'employee',employeeId,branchId,permissions:JSON.stringify(permissions),isActive:true,...extra})
 const p=await account('principal',principal.id,a.id),d=await account('delegate',delegate.id,delegate.branchId)
 const manager=await account('manager',null,a.id,['approval_chains.manage','audit.view'])
 const company=await account('company',null,a.id,['approval_chains.manage','audit.view'],{scopeAllBranches:true})
 const today=require('../src/requests/approval-delegations').delegationLocalDate(new Date())
 const delegation=await f.ok('POST','/requests/delegations',{delegatorEmployeeId:principal.id,delegateEmployeeId:delegate.id,startDate:today,endDate:today})
 const route=`/audit?entityType=approval_delegation&entityId=${delegation.id}`
 const audit=actor=>f.ok('GET',route,undefined,actor)
 const saved=()=>f.ds.query('SELECT * FROM audit_log WHERE entityType=@0 AND entityId=@1 ORDER BY id',['approval_delegation',String(delegation.id)])
 return{n,a,b,principal,delegate,p,d,manager,company,delegation,route,audit,saved}
}

test('P2K current-branch rule must also conceal the transferred delegate in the audit summary and search',async t=>{
 const s=await scenario(),stored=await s.saved(),companyBefore=await s.audit(s.company)
 assert.ok((await s.audit(s.manager)).rows[0].summary.includes(s.delegate.fullName))
 await move(s.delegate.id,s.b.id)
 const list=(await f.ok('GET','/requests/delegations',undefined,s.manager)).others.find(x=>x.id===s.delegation.id)
 assert.equal(list.delegateEmployeeId,null);assert.equal(list.delegateName,null)
 const principal=(await f.ok('GET','/requests/delegations',undefined,s.p)).mine.find(x=>x.id===s.delegation.id)
 assert.equal(principal.delegateEmployeeId,s.delegate.id);assert.equal(principal.delegateName,s.delegate.fullName)
 const limited=await s.audit(s.manager)
 assert.equal(limited.rows[0].after.delegateEmployeeId,null)
 assert.equal(limited.rows[0].after.delegatorEmployeeId,s.principal.id)
 assert.deepEqual(await s.audit(s.company),companyBefore);assert.deepEqual(await s.saved(),stored)
 const matching=await f.ok('GET',s.route+'&q='+encodeURIComponent(s.delegate.fullName),undefined,s.manager)
 const absent=await f.ok('GET',s.route+'&q='+encodeURIComponent('اسم مصطنع غير موجود'),undefined,s.manager)
 const nameShown=limited.rows.some(x=>x.summary.includes(s.delegate.fullName))
 t.diagnostic(JSON.stringify({case:'transferred-delegate-audit-text',employeeId:s.delegate.id,currentBranchId:s.b.id,readerBranchId:s.a.id,returnedEmployeeId:limited.rows[0].after.delegateEmployeeId,nameShown,matchingCount:matching.total,absentCount:absent.total,listHidden:true,partyPreserved:true,companyAndStorageUnchanged:true}))
 assert.equal(nameShown,false,'Foreign identity remains in summary after the numeric identity is correctly hidden')
 assert.equal(matching.total,absent.total,'Search must not expose an otherwise hidden identity')
})

test('P2K both creation and revocation summaries must respect the transferred delegator current branch',async t=>{
 const s=await scenario()
 await f.ok('POST',`/requests/delegations/${s.delegation.id}/revoke`,{},s.manager)
 const stored=await s.saved(),companyBefore=await s.audit(s.company)
 await move(s.principal.id,s.b.id)
 const list=await f.ok('GET','/requests/delegations',undefined,s.manager)
 assert.ok(!list.others.some(x=>x.id===s.delegation.id))
 const limited=await s.audit(s.manager);assert.equal(limited.rows.length,2)
 assert.ok(limited.rows.every(x=>(x.before||x.after).delegatorEmployeeId===null))
 assert.ok(limited.rows.every(x=>(x.before||x.after).delegateEmployeeId===s.delegate.id))
 assert.deepEqual(await s.audit(s.company),companyBefore);assert.deepEqual(await s.saved(),stored)
 const exposed=limited.rows.filter(x=>x.summary.includes(s.principal.fullName)).map(x=>x.action)
 t.diagnostic(JSON.stringify({case:'transferred-delegator-audit-text',employeeId:s.principal.id,currentBranchId:s.b.id,readerBranchId:s.a.id,exposedActions:exposed,idsHidden:true,companyAndStorageUnchanged:true}))
 assert.deepEqual(exposed,[],'Creation and revocation still expose the now-foreign delegator by name')
})

test('P2K identities become readable after moving into scope, all-branch and party views remain stable, and revoke still works',async t=>{
 const s=await scenario(true),stored=await s.saved(),companyBefore=await s.audit(s.company)
 assert.equal((await s.audit(s.manager)).rows[0].after.delegateEmployeeId,null)
 const otherParty=(await f.ok('GET','/requests/delegations',undefined,s.d)).toMe.find(x=>x.id===s.delegation.id)
 assert.equal(otherParty.delegatorEmployeeId,s.principal.id);assert.equal(otherParty.delegatorName,s.principal.fullName)
 await move(s.delegate.id,s.a.id)
 const list=(await f.ok('GET','/requests/delegations',undefined,s.manager)).others.find(x=>x.id===s.delegation.id)
 assert.equal(list.delegateEmployeeId,s.delegate.id);assert.equal(list.delegateName,s.delegate.fullName)
 assert.equal((await s.audit(s.manager)).rows[0].after.delegateEmployeeId,s.delegate.id)
 assert.deepEqual(await s.audit(s.company),companyBefore);assert.deepEqual(await s.saved(),stored)
 assert.deepEqual(await f.ok('POST',`/requests/delegations/${s.delegation.id}/revoke`,{},s.manager),{id:s.delegation.id})
 const after=await s.audit(s.manager);assert.equal(after.rows.length,2);assert.ok(after.rows.every(x=>(x.before||x.after).delegateEmployeeId===s.delegate.id))
 t.diagnostic(JSON.stringify({case:'allowed-identities-and-revoke',bothParties:true,currentScope:true,allBranchesWithoutAdmin:true,storedPreserved:true,revokeWorks:true}))
})

test('P2K unrelated audit event response remains exactly the same for branch and all-branch readers',async t=>{
 const s=await scenario()
 const input={screen:'p2j-independent-export',filename:'synthetic-export.csv',rows:23}
 await f.ok('POST','/audit/exports',input,s.manager)
 const route='/audit?entityType=screen&entityId=p2j-independent-export'
 const before=await f.ok('GET',route,undefined,s.manager),stored=await f.ds.query('SELECT * FROM audit_log WHERE entityType=@0 AND entityId=@1',['screen',input.screen])
 assert.deepEqual(before,await f.ok('GET',route,undefined,s.company));assert.deepEqual(before.rows[0].after,input)
 await move(s.delegate.id,s.b.id)
 await s.audit(s.manager)
 assert.deepEqual(await f.ok('GET',route,undefined,s.manager),before)
 assert.deepEqual(await f.ds.query('SELECT * FROM audit_log WHERE entityType=@0 AND entityId=@1',['screen',input.screen]),stored)
 t.diagnostic(JSON.stringify({case:'unrelated-audit-event',responseExactlyUnchanged:true,storageExactlyUnchanged:true}))
})
