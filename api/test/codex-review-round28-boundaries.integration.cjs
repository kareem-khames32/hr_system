'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round28-support.cjs')
let f,a,b,company
const reason='دليل مستقل لفصل الفروع في النسخة المنقولة ومراجعة صلاحياتها'
before(async()=>{
 f=await setup('r28_boundaries')
 await f.setting('financial_exemptions.max_pct_per_grantor',0);await f.setting('financial_exemptions.max_per_employee_year',0);await f.setting('attendance.absence_penalty_days',1)
 const perms=['payroll.view','financial_exemption.view','financial_exemption.grant','financial_exemption.approve']
 a=await f.actor('branch-a',perms);b=await f.actor('branch-b',perms,f.B);company=await f.actor('company',perms,null)
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function cycle(name){
 const e=await f.employee(9000);await f.attendance(e,'2026-07',['2026-07-07'])
 let root=await f.calculate(await f.draft(name,[e.id]))
 const dto={runId:root.id,employeeId:e.id,scopeKind:'DEDUCTION_TYPE',targetKind:'ABSENCE',reason,attachmentRef:'initial-reference'}
 const p=await f.ok('POST','/payroll/exemptions/preview',dto,a),grant=await f.ok('POST','/payroll/exemptions',{...dto,previewHash:p.previewHash},a)
 root=await f.ok('POST',`/payroll/runs/${root.id}/recalculate`,{reason});await f.pay(root);await f.reverse(root,[e.id])
 const child=await f.ok('POST',`/payroll/runs/${root.id}/supplementary`,{employeeIds:[e.id],name:name+' تكميلي',reason})
 const copy=await f.repo('PayrollFinancialExemption').findOneByOrFail({runId:child.id,employeeId:e.id})
 return {e,root,grant,child,copy}
}
const report=actor=>f.ok('GET','/payroll/exemptions/report?fromPeriod=2026-07&toPeriod=2026-07',null,actor)

test('CR28 unresolved carried placement is closed on every branch read and mutation surface',{timeout:90000},async t=>{
 const {e,root,grant,child,copy}=await cycle('نسخة بلا لقطة عضوية')
 assert.equal(await f.repo('PayrollRunMember').countBy({runId:child.id}),0)
 assert.equal(await f.repo('PayrollItem').countBy({runId:child.id}),0)
 const baselineReports=await Promise.all([report(a),report(b),report(company)])
 for(const actor of [a,b]){
  assert.equal((await f.request('GET',`/payroll/exemptions/${copy.id}`,null,actor)).status,403)
  for(const tail of ['',`/candidates?employeeId=${e.id}`])assert.equal((await f.request('GET',`/payroll/exemptions/runs/${child.id}${tail}`,null,actor)).status,403)
  assert.deepEqual(await f.ok('GET',`/payroll/exemptions?runId=${child.id}`,null,actor),[])
  for(const action of ['approve','reject','revoke','attachment']){
   const body=action==='attachment'?{attachmentRef:'branch-must-not-write'}:{reason,expectedRevision:copy.revision}
   const r=await f.request('POST',`/payroll/exemptions/${copy.id}/${action}`,body,actor)
   assert.equal(r.status,403,JSON.stringify({action,body:r.body}));assert.equal(r.body.code,'EXEMPTION_FORBIDDEN')
  }
 }
 assert.equal((await f.ok('GET',`/payroll/exemptions/${copy.id}`,null,company)).estimatedAmount,'300.00')
 assert.equal((await f.ok('GET',`/payroll/exemptions?runId=${child.id}`,null,company)).length,1)
 assert.equal(baselineReports[0].totals.active,0);assert.equal(baselineReports[1].totals.active,0);assert.equal(baselineReports[2].totals.active,1)
 const ownOriginal=await f.ok('GET',`/payroll/exemptions/${grant.id}`,null,a)
 assert.equal(ownOriginal.events.find(r=>r.eventType==='CARRIED_TO_SUPPLEMENTARY').payload.carriedExemptionId,null)
 const event=(await f.ok('GET',`/payroll/runs/${root.id}/events`,null,a)).find(r=>r.eventType==='SUPPLEMENTARY_CREATED')
 assert.deepEqual([event.payload.supplementaryRunId,event.payload.carriedExemptions],[null,[]])
 const saved=await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id});assert.equal(saved.attachmentRef,copy.attachmentRef);assert.equal(saved.status,'ACTIVE')
 await f.ok('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'company-reference'},company)
 t.diagnostic(JSON.stringify({case:'unknown-carried-placement',branchMutationChecks:8,branchesClosed:true,companyVisible:true,companyAttachmentAllowed:true,activeReports:[0,0,1]}))
})

test('CR28 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history',{timeout:90000},async t=>{
 const {e,root,grant,child,copy}=await cycle('نسخة تتغير عضويتها')
 const initialEvaluation=copy.evaluation
 let calculated=await f.calculate(child)
 assert.equal(calculated.members[0].snapshot.branchId,f.A.id)
 assert.equal((await f.ok('GET',`/payroll/exemptions/${copy.id}`,null,a)).canAttach,true)
 for(const [branch,allowed,denied] of [[f.B,b,a],[f.A,a,b],[f.B,b,a]]){
  await f.repo('Employee').update(e.id,{branchId:branch.id})
  calculated=await f.ok('POST',`/payroll/runs/${child.id}/recalculate`,{reason})
  assert.equal(calculated.members[0].snapshot.branchId,branch.id);assert.equal(Number(calculated.items[0].netPay),9000)
  const replies=await Promise.all([f.request('GET',`/payroll/exemptions/${copy.id}`,null,allowed),f.request('GET',`/payroll/exemptions/${copy.id}`,null,denied)])
  assert.deepEqual(replies.map(r=>r.status),[200,403]);assert.equal(replies[0].body.canRevoke,true);assert.equal(replies[0].body.canAttach,true)
  assert.deepEqual((await f.ok('GET',`/payroll/exemptions?runId=${child.id}`,null,allowed)).map(r=>r.id),[copy.id])
  assert.deepEqual(await f.ok('GET',`/payroll/exemptions?runId=${child.id}`,null,denied),[])
  const candidates=await f.ok('GET',`/payroll/exemptions/runs/${child.id}/candidates?employeeId=${e.id}`,null,allowed)
  assert.deepEqual(candidates.exemptions.map(r=>r.id),[copy.id])
  assert.equal((await f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'outside-write'},denied)).status,403)
  await f.ok('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'inside-'+branch.id},allowed)
  assert.equal((await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id})).evaluation,initialEvaluation)
 }
 await f.pay(calculated)
 const [ra,rb,rc]=await Promise.all([report(a),report(b),report(company)])
 assert.ok(!ra.byRun.some(r=>r.runId===child.id))
 assert.equal(rb.byRun.find(r=>r.runId===child.id).exempted,'300.00')
 assert.equal(rc.byRun.find(r=>r.runId===child.id).exempted,'300.00')
 assert.equal(rc.byRun.find(r=>r.runId===child.id).totalNet,'9000.00')
 assert.deepEqual(rb.reconciliation,{snapshots:'300.00',payrollItems:'300.00',difference:'0.00'})
 const source=await f.ok('GET',`/payroll/exemptions/${grant.id}`,null,a)
 assert.equal(source.events.find(r=>r.eventType==='CARRIED_TO_SUPPLEMENTARY').payload.carriedExemptionId,null)
 assert.equal((await f.ok('GET',`/payroll/exemptions/${copy.id}`,null,b)).status,'APPLIED')
 t.diagnostic(JSON.stringify({case:'recalculated-carried-placement',sequence:['A','B','A','B'],sameEvaluationSnapshot:true,parallelReadsIsolated:true,branchReportExempted:'300.00',companyNet:'9000.00',reportDifference:'0.00'}))
})

const services=()=>({ex:f.app.get(require('../src/payroll/financial-exemptions.service').FinancialExemptionsService),pay:f.app.get(require('../src/payroll/payroll.service').PayrollService)})
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve}}
async function within(p,ms){let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
const lockMode=async(em,runId)=>(await em.query("SELECT APPLOCK_MODE('public', @0, 'Transaction') held",[`hr:payroll:run:${runId}`]))[0].held
const attachmentEvents=id=>f.repo('PayrollFinancialExemptionEvent').countBy({exemptionId:id,eventType:'ATTACHMENT_ADDED'})

test('CR28 attachment first holds the real run lock through its response and recalculation follows',{timeout:90000},async t=>{
 const {e,child,copy}=await cycle('المرفق يسبق تغيير العضوية');await f.calculate(child)
 const {ex,pay}=services(),oldLoad=ex.loadCarriedPlaces,oldLock=pay.lockRun,reached=deferred(),gate=deferred(),attempt=deferred()
 let armed=true,attaching,recalculating,acquired=false,mode
 ex.loadCarriedPlaces=async function(em,rows){await oldLoad.call(this,em,rows);if(armed&&rows.length===1&&rows[0].id===copy.id){armed=false;mode=await lockMode(em,child.id);reached.resolve();await gate.promise}}
 pay.lockRun=async function(em,id){if(id===child.id)attempt.resolve();const r=await oldLock.call(this,em,id);if(id===child.id)acquired=true;return r}
 let attached,calculated
 try{
  attaching=f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'before-scope-change'},a)
  assert.equal((await within(reached.promise,5000)).done,true);assert.equal(mode,'Exclusive')
  await f.repo('Employee').update(e.id,{branchId:f.B.id})
  recalculating=f.request('POST',`/payroll/runs/${child.id}/recalculate`,{reason})
  assert.equal((await within(attempt.promise,5000)).done,true)
  assert.equal((await within(recalculating,500)).done,false);assert.equal(acquired,false)
  gate.resolve();[attached,calculated]=await Promise.all([attaching,recalculating])
 }finally{gate.resolve();await Promise.allSettled([attaching,recalculating].filter(Boolean));ex.loadCarriedPlaces=oldLoad;pay.lockRun=oldLock}
 assert.equal(attached.status,201,JSON.stringify(attached.body));assert.equal(attached.body.attachmentRef,'before-scope-change');assert.equal(calculated.status,201,JSON.stringify(calculated.body))
 assert.equal((await f.repo('PayrollRunMember').findOneByOrFail({runId:child.id,employeeId:e.id})).snapshot.branchId,f.B.id)
 const count=await attachmentEvents(copy.id),blocked=await f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'after-scope-change'},a)
 assert.equal(blocked.status,403);assert.equal((await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id})).attachmentRef,'before-scope-change');assert.equal(await attachmentEvents(copy.id),count)
 assert.equal((await f.request('GET',`/payroll/exemptions/${copy.id}`,null,b)).status,200)
 t.diagnostic(JSON.stringify({case:'attachment-first',runLock:mode,recalculationWaited:true,attachmentStatus:attached.status,recalculationStatus:calculated.status,afterTransferStatus:blocked.status,newEventsAfterRefusal:0}))
})

test('CR28 recalculation first denies a waiting old-branch attachment without a row or event change',{timeout:90000},async t=>{
 const {e,child,copy}=await cycle('الحساب يسبق المرفق');await f.calculate(child);await f.repo('Employee').update(e.id,{branchId:f.B.id})
 const {ex,pay}=services(),oldLock=pay.lockRun,oldExLock=ex.lockRun,reached=deferred(),gate=deferred(),attempt=deferred()
 let armed=true,attaching,recalculating,mode,acquired=false,attached,calculated
 pay.lockRun=async function(em,id){const r=await oldLock.call(this,em,id);if(armed&&id===child.id){armed=false;mode=await lockMode(em,id);reached.resolve();await gate.promise}return r}
 ex.lockRun=async function(em,id){if(id===child.id)attempt.resolve();const r=await oldExLock.call(this,em,id);if(id===child.id)acquired=true;return r}
 const count=await attachmentEvents(copy.id)
 try{
  recalculating=f.request('POST',`/payroll/runs/${child.id}/recalculate`,{reason})
  assert.equal((await within(reached.promise,5000)).done,true);assert.equal(mode,'Exclusive')
  attaching=f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'old-branch-must-not-write'},a)
  assert.equal((await within(attempt.promise,5000)).done,true)
  assert.equal((await within(attaching,500)).done,false);assert.equal(acquired,false)
  gate.resolve();[attached,calculated]=await Promise.all([attaching,recalculating])
 }finally{gate.resolve();await Promise.allSettled([attaching,recalculating].filter(Boolean));pay.lockRun=oldLock;ex.lockRun=oldExLock}
 assert.equal(calculated.status,201,JSON.stringify(calculated.body));assert.equal(attached.status,403,JSON.stringify(attached.body));assert.equal(attached.body.code,'EXEMPTION_FORBIDDEN')
 assert.equal((await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id})).attachmentRef,copy.attachmentRef);assert.equal(await attachmentEvents(copy.id),count)
 assert.equal((await f.request('GET',`/payroll/exemptions/${copy.id}`,null,b)).status,200)
 t.diagnostic(JSON.stringify({case:'recalculation-first',runLock:mode,attachmentWaited:true,recalculationStatus:calculated.status,attachmentStatus:attached.status,referenceUnchanged:true,eventCountUnchanged:true}))
})

test('CR28 long contention returns busy without mutation and a retry works after release',{timeout:90000},async t=>{
 const {e,child,copy}=await cycle('قفل طويل ثم إعادة المحاولة');await f.calculate(child)
 const {ex}=services(),oldLoad=ex.loadCarriedPlaces,reached=deferred(),gate=deferred()
 let armed=true,attaching,recalculating,attached,busy
 ex.loadCarriedPlaces=async function(em,rows){await oldLoad.call(this,em,rows);if(armed&&rows.length===1&&rows[0].id===copy.id){armed=false;assert.equal(await lockMode(em,child.id),'Exclusive');reached.resolve();await gate.promise}}
 try{
  attaching=f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'before-busy-retry'},a)
  assert.equal((await within(reached.promise,5000)).done,true)
  await f.repo('Employee').update(e.id,{branchId:f.B.id})
  recalculating=f.request('POST',`/payroll/runs/${child.id}/recalculate`,{reason})
  const result=await within(recalculating,16000);assert.equal(result.done,true);busy=result.value
  assert.equal(busy.status,409,JSON.stringify(busy.body));assert.match(busy.body.message,/المسير قيد التحديث/)
  assert.equal((await f.repo('PayrollRunMember').findOneByOrFail({runId:child.id,employeeId:e.id})).snapshot.branchId,f.A.id)
  gate.resolve();attached=await attaching
 }finally{gate.resolve();await Promise.allSettled([attaching,recalculating].filter(Boolean));ex.loadCarriedPlaces=oldLoad}
 assert.equal(attached.status,201,JSON.stringify(attached.body))
 const retry=await f.request('POST',`/payroll/runs/${child.id}/recalculate`,{reason});assert.equal(retry.status,201,JSON.stringify(retry.body))
 assert.equal(retry.body.members[0].snapshot.branchId,f.B.id)
 t.diagnostic(JSON.stringify({case:'busy-and-retry',busyStatus:busy.status,failedRecalculationKeptOldMembership:true,attachmentStatus:attached.status,retryStatus:retry.status}))
})

let plainSequence=0
async function plain(name,pending=false){
 let actor=a,department
 if(pending){
  await f.setting('financial_exemptions.department_manager_enabled','true')
  const manager=await f.employee(6000),n=++plainSequence
  department=await f.repo('Department').save({branchId:f.A.id,code:'R28-D-'+n,name:'قسم اختبار '+n,managerEmployeeId:manager.id})
  actor=await f.actor('structural-'+n,[],f.A,{employeeId:manager.id})
 }
 const e=await f.employee(9000,f.A,department?{departmentId:department.id}:{})
 await f.attendance(e,'2026-07',['2026-07-07'])
 const run=await f.calculate(await f.draft(name,[e.id]))
 const dto={runId:run.id,employeeId:e.id,scopeKind:'DEDUCTION_TYPE',targetKind:'ABSENCE',reason,attachmentRef:'original-reference'}
 const preview=await f.ok('POST','/payroll/exemptions/preview',dto,actor)
 return {e,run,actor,dto:{...dto,previewHash:preview.previewHash}}
}

for(const action of ['create','approve','reject','revoke','attachment'])test(`CR28 ${action} rolls back all effects when response construction refuses and keeps the old successful view`,{timeout:90000},async t=>{
 const fixture=await plain('تراجع العملية عند رفض الرد '+action,['approve','reject'].includes(action)),{ex}=services()
 let row
 if(action!=='create')row=await f.ok('POST','/payroll/exemptions',fixture.dto,fixture.actor)
 if(['approve','reject'].includes(action))assert.equal(row.status,'PENDING_APPROVAL')
 const acting=action==='create'?fixture.actor:company
 const route=action==='create'?'/payroll/exemptions':`/payroll/exemptions/${row.id}/${action}`
 const dto=action==='create'?fixture.dto:action==='attachment'?{attachmentRef:'new-reference'}:{reason,expectedRevision:row.revision}
 const beforeRows=await f.repo('PayrollFinancialExemption').findBy({runId:fixture.run.id}),beforeEvents=await f.repo('PayrollFinancialExemptionEvent').find({order:{id:'ASC'}})
 const old=ex.detailIn;let reached=false,insideState,held
 ex.detailIn=async function(em,user,id){
  const result=await old.call(this,em,user,id)
  if(result.runId===fixture.run.id){
   reached=true;held=await lockMode(em,fixture.run.id);assert.equal(held,'Exclusive');assert.equal(em.queryRunner.isTransactionActive,true)
   insideState=result.status
   // Explicit fault injection in the response phase, after real guarded reads and mutation.
   throw new (require('../node_modules/@nestjs/common').ForbiddenException)({code:'REVIEW_RESPONSE_REFUSED',message:'رفض عرض اختباري داخل المعاملة'})
  }
  return result
 }
 let failed
 try{failed=await f.request('POST',route,dto,acting)}finally{ex.detailIn=old}
 assert.equal(reached,true);assert.equal(failed.status,403,JSON.stringify(failed.body));assert.equal(failed.body.code,'REVIEW_RESPONSE_REFUSED')
 assert.deepEqual(await f.repo('PayrollFinancialExemption').findBy({runId:fixture.run.id}),beforeRows)
 assert.deepEqual(await f.repo('PayrollFinancialExemptionEvent').find({order:{id:'ASC'}}),beforeEvents)
 const success=await f.ok('POST',route,dto,acting)
 const sameActor=await f.ok('GET',`/payroll/exemptions/${success.id}`,null,acting)
 assert.deepEqual(success,sameActor)
 for(const reader of [a,company]){
  const view=await f.ok('GET',`/payroll/exemptions/${success.id}`,null,reader)
  for(const key of ['id','runId','employeeId','status','estimatedAmount','attachmentRef','events'])assert.deepEqual(view[key],success[key])
 }
 const expected={create:'ACTIVE',approve:'ACTIVE',reject:'REJECTED',revoke:'REVOKED',attachment:'ACTIVE'}[action]
 assert.equal(success.status,expected);assert.equal(insideState,expected)
 t.diagnostic(JSON.stringify({case:'response-atomicity',action,runLock:held,refusalStatus:failed.status,rowAndEventsRolledBack:true,retryStatus:201,responseEqualsGet:true,companyAndBranchDataEqual:true,estimatedAmount:success.estimatedAmount,status:success.status}))
})
