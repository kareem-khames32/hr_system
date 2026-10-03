'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round25-support.cjs')
let f,reader,calculator
before(async()=>{f=await setup('r25_boundaries');reader=await f.actor('reader',['payroll.view','payroll.calculate']);calculator=await f.actor('calculator',['payroll.calculate'])},{timeout:180000})
after(async()=>{if(f)await f.close()})

test('CR25 preview hides amounts and hash, retains identical allowed rows, and preserves full internal event',{timeout:90000},async t=>{
 const own=await f.employee(7319.17),booked=await f.employee(6428.39),foreign=await f.employee(18743.63,f.B)
 const mixed=await f.calculate(await f.draft('مسير مشترك محجوب في المعاينة',[booked.id,foreign.id]))
 await f.ready(mixed);await f.ok('POST',`/payroll/runs/${mixed.id}/approve`,{},f.approver)
 const dto={name:'معاينة صلاحية الحساب',period:'2026-07',policyVersionId:f.version,filters:{branchIds:[f.A.id],employeeIds:[own.id,booked.id]}}
 const full=await f.ok('POST','/payroll/runs/membership-preview',dto,reader),blind=await f.ok('POST','/payroll/runs/membership-preview',dto,calculator)
 assert.equal(full.totals.monthlyGross,7319.17)
 assert.deepEqual(blind,{...full,previewHash:null,totals:{...full.totals,monthlyGross:null,earnedGross:null},included:full.included.map(r=>({...r,monthlyGross:null,earnedGross:null}))})
 const excluded=blind.excluded.find(r=>r.employeeId===booked.id)
 assert.equal(excluded.code,'EXC_ALREADY_IN_RUN');assert.equal(excluded.otherRun.otherRunId,null)
 assert.ok(!excluded.message.includes(mixed.name));assert.ok(!excluded.message.includes('#'+mixed.id))
 const draft=await f.ok('POST','/payroll/runs',dto,calculator)
 const stored=await f.ok('GET',`/payroll/runs/${draft.id}/membership-preview`,null,calculator)
 assert.equal(stored.previewHash,null);assert.equal(stored.included[0].earnedGross,null)
 const event=await f.repo('PayrollRunEvent').findOneByOrFail({runId:draft.id,eventType:'DRAFT_CREATED'})
 assert.equal(event.payload.previewTotals.monthlyGross,7319.17);assert.match(event.payload.previewHash,/^[a-f0-9]{64}$/)
 await f.calculate(draft,reader);await f.ready(draft)
 const ack=await f.ok('GET',`/payroll/runs/${draft.id}/unassigned`,null,reader)
 assert.equal(ack.acknowledgement.latest.rowCount,null);assert.equal(ack.acknowledgement.latest.reportHash,null)
 const events=await f.ok('GET',`/payroll/runs/${draft.id}/events`,null,reader)
 const hidden=events.find(r=>r.eventType==='UNASSIGNED_ACKNOWLEDGED').payload
 assert.deepEqual(['rowCount','byReason','reportHash'].filter(k=>k in hidden),[])
 const company=await f.ok('GET',`/payroll/runs/${draft.id}/events`)
 assert.ok(company.find(r=>r.eventType==='UNASSIGNED_ACKNOWLEDGED').payload.reportHash)
 t.diagnostic(JSON.stringify({case:'preview-and-ack',monthlyGross:7319.17,blindGross:null,previewEqualExceptMoney:true,eventRetainedMoney:true,foreignRunNameHidden:true,companyAcknowledgementRedacted:true}))
})

test('CR25 forward membership skips foreign definitions, updates own empty drafts, and bulk exclusions hide origins',{timeout:120000},async t=>{
 const own=await f.employee(),addition=await f.employee(7123.45),foreign=await f.employee(18432.17,f.B),blocked=await f.employee(6891.34)
 const series='سلسلة دائمة لاختبار النطاق'
 const anchor=await f.calculate(await f.draft(series,[own.id]))
 const future=await f.draft(series,[foreign.id],'2026-08')
 const ownFuture=await f.draft(series,[own.id],'2026-09',f.admin,{filters:{branchIds:[f.A.id],employeeIds:[own.id]}})
 const blockedSource=await f.calculate(await f.draft('مصدر مختلط محجوب',[blocked.id,foreign.id]))
 const before=await f.repo('PayrollRun').findOneByOrFail({id:future.id})
 const result=await f.ok('POST',`/payroll/runs/${anchor.id}/members/bulk`,{employeeIds:[addition.id,foreign.id,987654321,blocked.id],reason:'ضم مع فروع ومسيرات محجوبة'},calculator)
 const rows=result.results,unknown=rows.find(r=>r.employeeId===987654321),far=rows.find(r=>r.employeeId===foreign.id)
 const omitId=({employeeId,...rest})=>rest
 assert.deepEqual(omitId(far),omitId(unknown));assert.equal(far.fullName,null)
 const from=rows.find(r=>r.employeeId===blocked.id)
 assert.equal(from.skipCode,'SOURCE_OUT_OF_SCOPE');assert.equal(from.fromRunId,null);assert.equal(from.fromRunName,null)
 assert.ok(!JSON.stringify(result).includes(blockedSource.name));assert.deepEqual(result.added,[addition.id])
 assert.deepEqual(await f.repo('PayrollRun').findOneByOrFail({id:future.id}),before)
 const ownAfter=await f.repo('PayrollRun').findOneByOrFail({id:ownFuture.id})
 assert.ok(JSON.stringify(ownAfter.definition).includes(String(addition.id)))
 assert.equal(await f.repo('PayrollRunEvent').countBy({runId:future.id,eventType:'MEMBERSHIP_CHANGED'}),0)
 assert.ok(!result.recalculateRuns.some(r=>r.id===future.id));assert.ok(!result.lockedRuns.some(r=>r.id===future.id))
 assert.equal((await f.request('GET',`/payroll/runs/${future.id}`,null,reader)).status,403)
 t.diagnostic(JSON.stringify({case:'forward-and-bulk',foreignFutureUnchanged:true,ownDraftUpdated:true,unknownEqualsForeign:true,hiddenSourceId:null,added:result.added.length}))
})

test('CR25 monthly overview metadata and waiver references follow recorded branches, including after transfer',{timeout:90000},async t=>{
 const near=await f.employee(6123.45),far=await f.employee(19231.17,f.B)
 const visible=await f.calculate(await f.draft('مسير ألف ظاهر',[near.id],'2026-06'))
 const hidden=await f.calculate(await f.draft('مسير باء مخفي',[far.id],'2026-06'))
 // Current profile changes must not replace the recorded branch used in the month.
 await f.repo('Employee').update(near.id,{branchId:f.B.id});await f.repo('Employee').update(far.id,{branchId:f.A.id})
 const included=await f.ok('GET','/payroll/overview/included?period=2026-06',null,reader)
 assert.equal(included.runs,1);assert.deepEqual(included.rows.map(r=>r.employeeId),[near.id])
 for(const route of ['deductions','lines']){
  const response=await f.ok('GET',`/payroll/overview/${route}?period=2026-06`,null,reader)
  assert.deepEqual(response.runs.map(r=>r.id),[visible.id]);assert.ok(!JSON.stringify(response).includes(hidden.name))
 }
 const waiver=await f.ok('POST','/payroll/overview/waivers',{period:'2026-06',kind:'LATENESS',targetLevel:'branch',branchId:f.A.id,reason:'اختبار بيانات رد الإعفاء الشهري'},calculator)
 assert.deepEqual(waiver.recalculateRuns.map(r=>r.id),[visible.id]);assert.deepEqual(waiver.lockedRuns,[])
 t.diagnostic(JSON.stringify({case:'overview-recorded-branches',visibleRuns:1,foreignRunHidden:true,currentProfilesSwapped:true}))
})

test('CR25 obligation cancellation hides amounts on first and repeated cancel while payroll reader retains them',async t=>{
 const e=await f.employee(),far=await f.employee(9217.61,f.B)
 const make=(employee,amount)=>f.repo('EmployeeObligation').save({employeeId:employee.id,type:'DEBIT',category:'test',label:'سبب مالي محجوب',amount,status:'PENDING'})
 const a=await make(e,421.39),b=await make(e,871.26),c=await make(far,991.77)
 assert.equal((await f.request('GET',`/obligations/employee/${e.id}`,null,calculator)).status,403)
 for(let n=0;n<2;n++)assert.deepEqual(await f.ok('POST',`/obligations/${a.id}/cancel`,{},calculator),{id:a.id,status:'CANCELLED'})
 const full=await f.ok('POST',`/obligations/${b.id}/cancel`,{},reader);assert.equal(Number(full.amount),871.26);assert.equal(full.label,'سبب مالي محجوب')
 const denied=await f.request('POST',`/obligations/${c.id}/cancel`,{},calculator);assert.equal(denied.status,403);assert.ok(!JSON.stringify(denied).includes('991.77'))
 assert.equal((await f.repo('EmployeeObligation').findOneByOrFail({id:c.id})).status,'PENDING')
 t.diagnostic(JSON.stringify({case:'cancel-obligation',repeatedLimitedResponse:true,readerAmount:871.26,foreignStatus:403}))
})
