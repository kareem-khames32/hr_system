'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round27-support.cjs')
let f,a,b,company
const reason='دليل مستقل لفصل الفروع في النسخة المنقولة ومراجعة صلاحياتها'
before(async()=>{
 f=await setup('r27_boundaries')
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

test('CR27 unresolved carried placement is closed on every branch read and mutation surface',{timeout:90000},async t=>{
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

test('CR27 carried visibility follows each recalculated snapshot and agrees with lists, reports, flags and history',{timeout:90000},async t=>{
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

test('CR27 attachment authorization must remain valid until commit when membership recalculation changes scope',{timeout:90000},async t=>{
 const {e,child,copy}=await cycle('تزامن المرفق والعضوية');await f.calculate(child)
 const service=f.app.get(require('../src/payroll/financial-exemptions.service').FinancialExemptionsService)
 const original=service.loadCarriedPlaces
 let entered,release,armed=true
 const reached=new Promise(resolve=>{entered=resolve}),gate=new Promise(resolve=>{release=resolve})
 service.loadCarriedPlaces=async function(em,rows){
  await original.call(this,em,rows)
  if(armed&&rows.length===1&&rows[0].id===copy.id){armed=false;entered();await gate}
 }
 const within=async(p,ms)=>{let timer;try{return await Promise.race([p.then(value=>({done:true,value})),new Promise(resolve=>{timer=setTimeout(()=>resolve({done:false}),ms)})])}finally{clearTimeout(timer)}}
 let attaching,recalculating,recalculatedBeforeRelease=false,writeResult,recalcResult
 try{
  attaching=f.request('POST',`/payroll/exemptions/${copy.id}/attachment`,{attachmentRef:'racing-old-branch-reference'},a)
  assert.equal((await within(reached,10000)).done,true,'Controlled attachment reached the real placement read')
  await f.repo('Employee').update(e.id,{branchId:f.B.id})
  recalculating=f.request('POST',`/payroll/runs/${child.id}/recalculate`,{reason})
  const interim=await within(recalculating,10000)
  recalculatedBeforeRelease=interim.done&&interim.value.status<300
  release();[writeResult,recalcResult]=await Promise.all([attaching,recalculating])
 }finally{
  release();service.loadCarriedPlaces=original
  await Promise.allSettled([attaching,recalculating].filter(Boolean))
 }
 assert.equal(recalcResult.status,201,JSON.stringify(recalcResult.body))
 const saved=await f.repo('PayrollFinancialExemption').findOneByOrFail({id:copy.id})
 const member=await f.repo('PayrollRunMember').findOneByOrFail({runId:child.id,employeeId:e.id})
 assert.equal(member.snapshot.branchId,f.B.id)
 const newEvents=await f.repo('PayrollFinancialExemptionEvent').findBy({exemptionId:copy.id,eventType:'ATTACHMENT_ADDED'})
 t.diagnostic(JSON.stringify({case:'attachment-scope-race',recalculatedBeforeRelease,attachmentResponse:writeResult.status,memberBranch:member.snapshot.branchId,storedAttachment:saved.attachmentRef,attachmentEvents:newEvents.length}))
 if(recalculatedBeforeRelease){assert.equal(saved.attachmentRef,copy.attachmentRef,'A membership change that commits first must invalidate an old branch attachment write');assert.equal(newEvents.length,0)}
 else assert.ok([200,201,403].includes(writeResult.status),'Serialized writes may complete before the branch change')
})
