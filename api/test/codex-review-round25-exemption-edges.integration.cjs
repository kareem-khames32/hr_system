'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round25-support.cjs')
let f,unlinked,hr,near,far,outsider,shared
const reason='إعفاء مستقل موثق بمحضر اختبار عزل الفروع'
const input=(runId,employeeId)=>({runId,employeeId,scopeKind:'DEDUCTION_TYPE',targetKind:'ABSENCE',reason})
before(async()=>{
 f=await setup('r25_exemption_edges')
 await f.setting('financial_exemptions.max_pct_per_grantor',0)
 await f.setting('financial_exemptions.attachment_threshold_days',1)
 await f.setting('attendance.absence_penalty_days',1)
 unlinked=await f.actor('unlinked',[]);hr=await f.actor('grantor',['financial_exemption.grant'])
 near=await f.employee(9000);far=await f.employee(18541.79,f.B);outsider=await f.employee(17653.21,f.B)
 shared=await f.calculate(await f.draft('مسير اختبار الحجب المبكر',[near.id,far.id]))
},{timeout:180000})
after(async()=>{if(f)await f.close()})

test('CR25 account without a grant basis is denied identically before payroll reads and application locks',{timeout:60000},async t=>{
 const statements=[],logger=f.ds.logger,original=logger.logQuery
 logger.logQuery=function(query,...rest){statements.push(String(query));return original.call(this,query,...rest)}
 let probes=0
 try{
  for(const suffix of ['', '/candidates']){
   const existing=await f.request('GET',`/payroll/exemptions/runs/${shared.id}${suffix}`,null,unlinked)
   const absent=await f.request('GET',`/payroll/exemptions/runs/987654321${suffix}`,null,unlinked)
   assert.equal(existing.status,403);assert.deepEqual(existing,absent);probes+=2
  }
  for(const route of ['/payroll/exemptions/preview','/payroll/exemptions']){
   const existing=await f.request('POST',route,input(shared.id,near.id),unlinked)
   const absent=await f.request('POST',route,input(987654321,987654321),unlinked)
   assert.equal(existing.status,403);assert.equal(existing.body.code,'EXEMPTION_OUT_OF_SCOPE');assert.deepEqual(existing,absent);probes+=2
  }
 }finally{logger.logQuery=original}
 // Inspect query text in memory only: no SQL parameters or authentication data in evidence.
 assert.ok(!statements.some(q=>/sp_getapplock|\bpayroll_runs\b|\bpayroll_run_members\b|\bpayroll_items\b/i.test(q)))
 assert.equal(await f.repo('PayrollFinancialExemption').count(),0)
 t.diagnostic(JSON.stringify({case:'early-exemption-refusal',probes,payrollRead:false,applicationLock:false,noEmployeeId:true,all403:true}))
})

test('CR25 a foreign member, foreign non-member and missing employee give identical exemption denials',{timeout:60000},async t=>{
 for(const kind of ['candidates','preview','create']){
  const replies=[]
  for(const id of [far.id,outsider.id,987654321]){
   const r=kind==='candidates'?await f.request('GET',`/payroll/exemptions/runs/${shared.id}/candidates?employeeId=${id}`,null,hr):
    await f.request('POST',kind==='preview'?'/payroll/exemptions/preview':'/payroll/exemptions',input(shared.id,id),hr)
   assert.equal(r.status,403);assert.equal(r.body.code,'EXEMPTION_OUT_OF_SCOPE');replies.push(r)
  }
  assert.deepEqual(replies[0],replies[1]);assert.deepEqual(replies[1],replies[2])
 }
 t.diagnostic(JSON.stringify({case:'foreign-exemption-membership',routes:3,eachCompared:3,all403:true,identicalBodies:true}))
})

test('CR25 payroll approval keeps attachment rejection but discloses its amount only to payroll readers',{timeout:90000},async t=>{
 const e=await f.employee(9000)
 await f.attendance(e,'2026-07',['2026-07-05','2026-07-06'])
 const run=await f.calculate(await f.draft('اعتماد إعفاء بمرفق قديم',[e.id]))
 const dto={...input(run.id,e.id),attachmentRef:'review-only-attachment'}
 const preview=await f.ok('POST','/payroll/exemptions/preview',dto)
 assert.equal(preview.estimatedAmount,'600.00');assert.equal(preview.attachmentThreshold,'300.00')
 const grant=await f.ok('POST','/payroll/exemptions',{...dto,previewHash:preview.previewHash})
 const calculated=await f.ok('POST',`/payroll/runs/${run.id}/recalculate`,{reason:'إعادة حساب الإعفاء المثبت'})
 assert.equal(Number(calculated.items[0].netPay),9000)
 await f.ready(run)
 // Model a legacy stored exemption whose attachment reference is missing; keep the applied revision intact.
 await f.repo('PayrollFinancialExemption').update(grant.id,{attachmentRef:null})
 const approver=await f.actor('approve-only',['payroll.approve'])
 const limited=await f.request('POST',`/payroll/runs/${run.id}/approve`,{},approver)
 const full=await f.request('POST',`/payroll/runs/${run.id}/approve`,{},f.approver)
 for(const r of [limited,full]){assert.equal(r.status,409);assert.equal(r.body.code,'EXEMPTION_ATTACHMENT_REQUIRED')}
 assert.equal(full.body.amount,'600.00');assert.equal(full.body.threshold,'300.00')
 assert.ok(!('amount' in limited.body));assert.ok(!('threshold' in limited.body))
 assert.ok(!JSON.stringify(limited.body).includes('600'));assert.ok(!JSON.stringify(limited.body).includes('300'))
 assert.equal((await f.repo('PayrollRun').findOneByOrFail({id:run.id})).status,'CALCULATED')
 await f.repo('PayrollFinancialExemption').update(grant.id,{attachmentRef:dto.attachmentRef})
 t.diagnostic(JSON.stringify({case:'attachment-approval-refusal',readerAmount:full.body.amount,readerThreshold:full.body.threshold,limited409:true,limitedHasAmounts:false,netAfterExemption:9000}))
})

test('CR25 an own historical grant remains readable after scope change without granting new candidates',{timeout:90000},async t=>{
 const e=await f.employee(9000);await f.attendance(e,'2026-07',['2026-07-07'])
 const run=await f.calculate(await f.draft('مسير منحة سابقة',[e.id]))
 const dto=input(run.id,e.id),p=await f.ok('POST','/payroll/exemptions/preview',dto,hr)
 const grant=await f.ok('POST','/payroll/exemptions',{...dto,previewHash:p.previewHash},hr)
 await f.repo('User').update(hr.id,{branchId:f.B.id});hr.branchId=f.B.id
 try{
  const detail=await f.ok('GET',`/payroll/exemptions/${grant.id}`,null,hr)
  const view=await f.ok('GET',`/payroll/exemptions/runs/${run.id}`,null,hr)
  const candidates=await f.ok('GET',`/payroll/exemptions/runs/${run.id}/candidates`,null,hr)
  assert.equal(detail.estimatedAmount,'300.00');assert.equal(view.run.id,run.id)
  assert.deepEqual(view.exemptions.map(row=>row.id),[grant.id]);assert.deepEqual(candidates.employees,[])
  assert.equal((await f.request('POST','/payroll/exemptions/preview',dto,hr)).status,403)
  t.diagnostic(JSON.stringify({case:'historical-own-grant',retainedOwnAmount:detail.estimatedAmount,retainedRunHeader:true,newCandidates:0,newGrant403:true}))
 }finally{await f.repo('User').update(hr.id,{branchId:f.A.id});hr.branchId=f.A.id}
})
