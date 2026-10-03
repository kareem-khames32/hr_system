'use strict'
const {test,before,after}=require('node:test'),assert=require('node:assert/strict'),setup=require('./codex-review-round34-support.cjs')
let f,hrA,hrB,deskB,deptA,teamA,seq=0
const period='2026-07',today=()=>new Date().toLocaleDateString('en-CA'),reason='قرار مراجعة مستقل لحجب مراجع المسير مع بقاء الأثر المالي'
const config=kind=>kind==='bonus'?{prefix:'bonuses',typeKey:'bonusTypeId',key:'bonusRequestId',entity:'BonusRequest',event:'BonusRequestEvent',value:'123.45',net:9123.45}:{prefix:'deductions',typeKey:'deductionTypeId',key:'deductionRequestId',entity:'DeductionRequest',event:'DeductionRequestEvent',value:'67.89',net:8932.11}
before(async()=>{
 f=await setup('r34_independent')
 const perms=['bonuses.manage','bonuses.view','bonuses.approve','deductions.manage','deductions.view','deductions.approve','approve.hr','payroll.view','reports.view']
 hrA=await f.actor('r34-hr-a',perms);hrB=await f.actor('r34-hr-b',perms,f.B);deskB=await f.actor('r34-desk-b',['bonuses.manage','deductions.manage'],f.B)
 deptA=await f.repo('Department').save({name:'CR34 department A',branchId:f.A.id});teamA=await f.repo('Team').save({name:'CR34 team A',departmentId:deptA.id})
},{timeout:180000})
after(async()=>{if(f)await f.close()})
async function transfer(e){const c=await f.ok('GET',`/attendance/calendar-context?scope=EMPLOYEE&sourceId=${e.id}`);await f.ok('PATCH',`/employees/${e.id}`,{branchId:f.A.id,departmentId:deptA.id,teamId:teamA.id,calendarChange:{effectiveFrom:today(),reason,expectedRevision:c.revision,expectedCurrentSourceHash:c.currentSourceHash}})}
async function state(c,id){return {row:await f.repo(c.entity).findOneByOrFail({id}),ledger:await f.repo('EmployeeObligation').find({where:{[c.key]:id},order:{id:'ASC'}}),events:await f.repo(c.event).find({where:{requestId:id},order:{id:'ASC'}})}}
for(const kind of ['bonus','deduction'])test(`CR34 ${kind}: private run references, deferred events, paid fields and employee self visibility preserve money`,{timeout:180000},async t=>{
 const c=config(kind),e=await f.employee(9000,f.B,{bankName:'CR34 fixture bank'})
 await f.repo('AttendanceExemption').save({employeeId:e.id,effectiveFrom:'2020-01-01',effectiveTo:'2031-12-31',reasonCode:'field_role',reason,status:'APPROVED',createdByUserId:f.admin.id,approvedByUserId:f.admin.id,approvedAt:new Date('2020-01-01T08:00:00Z'),requiresCheckinForPresence:false})
 const type=await f.ok('POST',`/${c.prefix}/types`,{code:'CR34_'+kind.toUpperCase()+'_'+(++seq),nameAr:'نوع مراجعة '+seq,calcMethod:'FIXED_AMOUNT',creatorScopes:['HR'],approvalSteps:['HR'],...(kind==='deduction'?{category:'PERFORMANCE'}:{})})
 const input={employeeId:e.id,[c.typeKey]:type.id,inputValue:c.value,reason,targetPeriod:period,confirmNotDuplicate:true,...(kind==='deduction'?{incidentDate:today()}:{})}
 const row=await f.ok('POST',`/${c.prefix}`,input,hrB),pending=await f.ok('POST',`/${c.prefix}`,{...input,reason:reason+' مؤجل'},deskB)
 assert.equal(row.status,'APPROVED');assert.equal(pending.status,'IN_APPROVAL')
 const run=await f.draft('CR34 PRIVATE B '+kind,[e.id],period);await f.calculate(run);await f.approve(run.id)
 assert.equal((await f.repo('PayrollRunMember').findOneByOrFail({runId:run.id,employeeId:e.id})).snapshot.branchId,f.B.id)
 assert.equal(Number((await f.repo('PayrollItem').findOneByOrFail({runId:run.id,employeeId:e.id})).netPay),c.net)
 await transfer(e)
 const owner=await f.actor('r34-owner-'+seq,[],f.A,{employeeId:e.id})
 assert.equal((await f.request('GET',`/payroll/runs/${run.id}`,null,hrA)).status,403)
 const before=await state(c,row.id)
 for(const [actor,shown] of [[hrA,false],[hrB,true],[f.admin,true]]){
  const detail=await f.ok('GET',`/${c.prefix}/${row.id}`,null,actor)
  assert.equal(detail.obligations[0].reservedPayrollRunId,shown?run.id:null)
  if(kind==='bonus')assert.equal(detail.payout.runId,shown?run.id:null)
 }
 for(const [actor,shown] of [[hrA,false],[f.admin,true]]){
  const result=await f.request('POST',`/${c.prefix}/${row.id}/cancel`,{expectedRevision:row.revision,reason},actor)
  assert.equal(result.status,409);assert.equal(result.body.code,kind==='bonus'?'BONUS_RESERVED':'DEDUCTION_RESERVED')
  assert.equal(String(result.body.message).includes('#'+run.id),shown)
  const closed=await f.request('POST',`/${c.prefix}`,input,actor)
  assert.equal(closed.status,400);assert.equal(closed.body.code,kind==='bonus'?'BONUS_PERIOD_CLOSED':'DEDUCTION_PERIOD_CLOSED')
  assert.equal(closed.body.runId,shown?run.id:undefined);assert.equal(String(closed.body.message).includes('#'+run.id),shown)
 }
 assert.deepEqual(await state(c,row.id),before,'Reading/redaction and refused actions must not mutate stored evidence')
 // Approval after payroll closure produces the event naturally; do not seed its payload.
 const late=await f.ok('POST',`/${c.prefix}/${pending.id}/approve`,{expectedRevision:pending.revision,reason},f.admin)
 assert.equal(late.status,'APPROVED')
 const lateStored=await state(c,pending.id)
 assert.equal(lateStored.ledger.length,1);assert.equal(Number(lateStored.ledger[0].amount),Number(c.value))
 assert.ok(lateStored.events.some(event=>JSON.parse(event.payload||'{}').deferredPastClosedRunId===run.id))
 for(const [actor,shown] of [[hrA,false],[f.admin,true]]){
  const detail=await f.ok('GET',`/${c.prefix}/${pending.id}`,null,actor)
  const event=detail.events.find(event=>event.payload&&Object.hasOwn(event.payload,'deferredPastClosedRunId'))
  assert.ok(event);assert.equal(event.payload.deferredPastClosedRunId,shown?run.id:null)
 }
 assert.deepEqual(await state(c,pending.id),lateStored)
 await f.ok('POST',`/payroll/runs/${run.id}/pay`,{channel:'CASH',reference:'CR34 PAID '+run.id},f.approver)
 for(const [actor,shown] of [[hrA,false],[f.admin,true]]){
  const detail=await f.ok('GET',`/${c.prefix}/${row.id}`,null,actor)
  assert.equal(detail.obligations[0].appliedPayrollRunId,shown?run.id:null)
  assert.equal(Number(detail.obligations[0].appliedAmount),Number(c.value))
  if(kind==='bonus'){assert.equal(detail.payout.runId,shown?run.id:null);assert.equal(Number(detail.paidAmount),123.45)}else assert.equal(Number(detail.collectedAmount),67.89)
 }
 const own=(await f.ok('GET',`/${c.prefix}/mine`,null,owner)).find(item=>item.id===row.id)
 assert.ok(own)
 if(kind==='bonus')assert.equal(own.payout.runId,run.id);else assert.ok(own.obligations.some(item=>item.appliedPayrollRunId===run.id))
 if(kind==='deduction'){
  for(const [actor,shown] of [[hrA,false],[hrB,true],[f.admin,true]]){
   const result=await f.ok('GET',`/deductions/reports?fromPeriod=${period}&toPeriod=${period}`,null,actor)
   const reconciliation=result.reconciliation.find(item=>item.runId===run.id)
   assert.equal(!!reconciliation,shown)
   if(shown){assert.equal(Number(reconciliation.breakdownTyped),67.89);assert.equal(Number(reconciliation.ledgerTyped),67.89);assert.equal(Number(reconciliation.difference),0)}
  }
 }
 const saved=await state(c,row.id);assert.equal(saved.ledger.length,1);assert.equal(saved.ledger[0].status,'APPLIED');assert.equal(Number(saved.ledger[0].appliedAmount),Number(c.value))
 t.diagnostic(JSON.stringify({case:'request-payroll-reference-lifecycle',kind,foreignHidden:true,companyVisible:true,selfVisible:true,reservedRefusal:409,closedPeriod:400,deferredEventRedacted:true,storedEventsUnchanged:true,amount:Number(c.value),net:c.net,reconciliation:kind==='deduction'?'snapshot branch B only; difference 0':null}))
})
