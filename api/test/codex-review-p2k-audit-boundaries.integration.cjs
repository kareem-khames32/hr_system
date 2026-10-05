'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict')
let f,sequence=0
before(async()=>{f=await require('./codex-review-p2k-fixture.cjs')('p2k_audit');await f.setting('notifications.email.enabled','false')},{timeout:120000})
after(async()=>{if(f)await f.close()})
const hidden='موظف برّه نطاقك'
const today=()=>require('../src/requests/approval-delegations').delegationLocalDate(new Date())
async function move(id,branchId){
 const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${id}`)
 return f.ok('PATCH',`/employees/${id}`,{branchId,calendarChange:{effectiveFrom:today(),reason:'نقل مصطنع لمراجعة التدقيق',expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})
}
async function scenario(){
 const n=++sequence,a=await f.repo('Branch').save({code:'KA'+n,name:'فرع مراجعة أ '+n}),b=await f.repo('Branch').save({code:'KB'+n,name:'فرع مراجعة ب '+n})
 const employee=(label,branchId=a.id)=>f.repo('Employee').save({employeeCode:'K'+n+label,fullName:`K${n} ${label} synthetic`,nationalId:`REVIEW-K${n}-${label}`,branchId,joinDate:'2020-01-01',basicSalary:6000,isActive:true,status:'active'})
 const p=await employee('principal'),d=await employee('delegate'),other=await employee('other'),officer=await employee('officer',b.id)
 const account=(label,employeeId,permissions=[],extra={})=>f.repo('User').save({email:`k${n}-${label}@review.invalid`,displayName:`K${n} ${label} account`,passwordHash:'synthetic',role:'employee',employeeId,branchId:a.id,permissions:JSON.stringify(permissions),isActive:true,...extra})
 const pu=await account('principal',p.id),du=await account('delegate',d.id),reader=await account('reader',null,['audit.view'])
 const company=await account('company',officer.id,['audit.view','approval_chains.manage'],{scopeAllBranches:true})
 const create=actor=>f.ok('POST','/requests/delegations',{delegatorEmployeeId:p.id,delegateEmployeeId:d.id,startDate:today(),endDate:today()},actor)
 return{n,a,b,p,d,other,officer,pu,du,reader,company,create}
}
const route=(id,extra='')=>`/audit?entityType=approval_delegation&entityId=${id}${extra}`
const saved=id=>f.ds.query('SELECT * FROM audit_log WHERE entityType=@0 AND entityId=@1 ORDER BY id',['approval_delegation',String(id)])
const get=(user,id,extra='')=>f.ok('GET',route(id,extra),undefined,user)
function hiddenActor(rows){for(const r of rows){assert.equal(r.actorUserId,null);assert.equal(r.actorName,hidden);assert.equal(r.ip,null);assert.equal(r.userAgent,null);assert.equal((r.after||r.before).actorEmployeeId,null)}}

test('P2K recorded party actor remains concealed after real unlink, relink and disable; mixed actor filters preserve unrelated events',async t=>{
 const s=await scenario(),row=await s.create(s.pu)
 await f.ok('POST',`/requests/delegations/${row.id}/revoke`,{},s.pu)
 const stored=await saved(row.id),companyBefore=await get(s.company,row.id)
 assert.ok(stored.every(x=>JSON.parse(x.after||x.before).actorEmployeeId===s.p.id))
 assert.ok(stored.every(x=>!x.summary.includes(s.p.fullName)&&!x.summary.includes(s.d.fullName)))
 assert.equal((await get(s.reader,row.id,`&actorUserId=${s.pu.id}`)).total,2)
 await f.ok('POST','/audit/exports',{screen:'p2k-export-'+s.n,filename:'synthetic.csv',rows:3},s.pu)
 const exportRoute=`/audit?entityType=screen&entityId=p2k-export-${s.n}&actorUserId=${s.pu.id}`
 const exportBefore=await f.ok('GET',exportRoute,undefined,s.reader)
 await move(s.p.id,s.b.id)
 const baseline=await get(s.reader,row.id);hiddenActor(baseline.rows)
 assert.ok(!JSON.stringify(baseline).includes(s.p.fullName));assert.ok(!JSON.stringify(baseline).includes(s.pu.displayName))
 for(const update of [{employeeId:null},{employeeId:s.other.id},{isActive:false}]){
  await f.ok('PATCH',`/users/${s.pu.id}`,update)
  assert.deepEqual(await get(s.reader,row.id),baseline)
  for(const page of [1,2]){
   const absent=await get(s.reader,row.id,`&actorUserId=987654321&page=${page}&pageSize=1`)
   const match=await get(s.reader,row.id,`&actorUserId=${s.pu.id}&q=${encodeURIComponent(s.d.fullName)}&page=${page}&pageSize=1`)
   assert.equal(match.total,0);assert.deepEqual(match.rows,absent.rows)
  }
  assert.deepEqual(await get(s.company,row.id),companyBefore)
  assert.deepEqual(await saved(row.id),stored)
 }
 assert.deepEqual(await f.ok('GET',exportRoute,undefined,s.reader),exportBefore)
 const mixed=await f.ok('GET',`/audit?actorUserId=${s.pu.id}`,undefined,s.reader)
 assert.equal(mixed.total,1);assert.deepEqual(mixed.rows,exportBefore.rows)
 t.diagnostic(JSON.stringify({case:'recorded-actor-transition-matrix',realUnlink:true,realRelink:true,disabled:true,hiddenActorRows:2,filteredCount:0,unrelatedActorRows:1,storageUnchanged:true,allBranchesUnchanged:true}))
})

test('P2K current names drive exact counts and pages and literal wildcard searches cannot reveal renamed foreign parties',async t=>{
 const s=await scenario(),row=await s.create(s.company)
 await f.ok('POST',`/requests/delegations/${row.id}/revoke`,{},s.company)
 const stored=await saved(row.id),newName='بديل مصطنع جديد'
 await f.ok('PATCH',`/employees/${s.d.id}`,{fullName:newName})
 const old=await get(s.reader,row.id,'&q='+encodeURIComponent(s.d.fullName));assert.equal(old.total,0)
 const filter='&q='+encodeURIComponent(newName)
 const all=await get(s.reader,row.id,filter);assert.equal(all.total,2)
 const pages=[]
 for(const page of [1,2,3]){const r=await get(s.reader,row.id,filter+`&pageSize=1&page=${page}`);assert.equal(r.total,2);pages.push(...r.rows);assert.equal(r.rows.length,page===3?0:1)}
 assert.deepEqual(pages,all.rows);assert.ok(all.rows.find(x=>x.action==='APPROVAL_DELEGATION_CREATED').summary.includes(newName))
 await move(s.p.id,s.b.id)
 const baseline=await get(s.reader,row.id,filter)
 const foreignRename='مفوض مصطنع مخفي'
 await f.ok('PATCH',`/employees/${s.p.id}`,{fullName:foreignRename})
 assert.deepEqual(await get(s.reader,row.id,filter),baseline)
 for(const text of [s.p.fullName,foreignRename,'اسم غير موجود','%','_','[',']']){
  const r=await get(s.reader,row.id,'&q='+encodeURIComponent(text)+'&pageSize=1&page=2');assert.equal(r.total,0);assert.deepEqual(r.rows,[])
 }
 const company=await get(s.company,row.id,'&q='+encodeURIComponent(foreignRename));assert.equal(company.total,2)
 assert.ok(company.rows.every(x=>x.summary.includes(foreignRename)))
 assert.deepEqual(await saved(row.id),stored)
 t.diagnostic(JSON.stringify({case:'name-query-and-pagination',literalWildcards:true,matchedRows:2,pages:[1,1,0],foreignRenameInvisible:true,currentNameForCompany:true,storageUnchanged:true}))
})

test('P2K actor linked to a hidden party only after the event is concealed while an unrelated officer and prototype-named entity remain readable',async t=>{
 const s=await scenario(),row=await s.create(s.company),stored=await saved(row.id)
 const allowed=await get(s.reader,row.id,`&actorUserId=${s.company.id}`)
 assert.equal(allowed.total,1);assert.equal(allowed.rows[0].actorUserId,s.company.id)
 assert.equal(JSON.parse(stored[0].after).actorEmployeeId,undefined)
 await move(s.p.id,s.b.id)
 assert.equal((await get(s.reader,row.id,`&actorUserId=${s.company.id}`)).total,1)
 await f.ok('PATCH',`/users/${s.pu.id}`,{employeeId:null})
 await f.ok('PATCH',`/users/${s.company.id}`,{employeeId:s.p.id})
 const limited=await get(s.reader,row.id)
 assert.equal(limited.rows[0].actorUserId,null);assert.equal(limited.rows[0].actorName,hidden)
 assert.equal((await get(s.reader,row.id,`&actorUserId=${s.company.id}`)).total,0)
 await f.ok('PATCH',`/users/${s.company.id}`,{employeeId:null})
 assert.equal((await get(s.reader,row.id,`&actorUserId=${s.company.id}`)).rows[0].actorUserId,s.company.id)
 assert.deepEqual(await saved(row.id),stored)
 await require('../src/audit/audit').recordAudit(f.ds.manager,{category:'EXPORT',action:'REVIEW_ENTITY',entityType:'constructor',entityId:'p2k-constructor',actorUserId:s.company.id,branchId:s.a.id,summary:'Unchanged synthetic event',after:{value:5}})
 const r=await f.ok('GET',`/audit?entityType=constructor&entityId=p2k-constructor&actorUserId=${s.company.id}&q=synthetic`,undefined,s.reader)
 assert.equal(r.total,1);assert.equal(r.rows[0].summary,'Unchanged synthetic event');assert.deepEqual(r.rows[0].after,{value:5})
 t.diagnostic(JSON.stringify({case:'current-link-and-other-actor',currentPartyHidden:true,unrelatedOfficerPreserved:true,prototypeEntityUnchanged:true,storageUnchanged:true}))
})
