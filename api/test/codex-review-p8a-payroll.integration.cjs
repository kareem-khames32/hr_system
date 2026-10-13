'use strict'
// B-ADD.14: «خصم نسيان البصمة» في المسير، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_missing_punch_test_<16 hex>)، عبر HTTP بتوكنات
// موقّعة محليًا ومن غير كلمات مرور.
//  MPD-01) المعامل مقفول (الافتراضي): يوم البصمة الناقصة مابيتخصمش عليه — لا في اللقطة ولا في البند ولا في القسيمة — وبيوقّف اعتماد المسير زي الأول.
//  MPD-02) المعامل مفعّل: اليوم اللي فيه بصمة واحدة ومن غير طلب بيتخصم بعد «المسموح» بأجر اليوم × المعامل، على يومه جوه عمود التأخير وبسطر
//          «نسيان بصمة»؛ اللي قدّم طلب (مستني أو اتسجّل تصحيحه) مابيتخصمش، والمرفوض والمسودة مش طلب؛ والمستثنى برّه؛ والمسير بيتعتمد.
// Run (من api/): node --test test/missing-punch-deduction.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const t = disposableApp('missing_punch')
const lines = require('../src/payroll/payroll-item-lines')
const { MISSING_PUNCH_REVIEW_REASON } = require('../src/payroll/missing-punch-charge')
const E = {}
let admin, approver, branch, number = 0
const PERIOD = '2026-09', DAYS = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`)

// كل أيام الفترة حضور كامل، ماعدا أيام «missing»: بصمة حضور بس (بصمة ناقصة) — فأي خصم في عمود التأخير هو نسيان البصمة بس
async function employee(name, missing = [], exempt = false) {
  const emp = await t.repo('Employee').save({ employeeCode: `MD${String(++number).padStart(3, '0')}`, fullName: name, nationality: 'سعودي', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', isGosiRegistered: false })
  for (let index = 0; index < DAYS.length; index += 15) {
    await t.repo('AttendanceDay').save(DAYS.slice(index, index + 15).map(date => ({ employeeId: emp.id, branchId: branch.id, date, shiftName: 'صباحي', shiftStart: '08:00', shiftEnd: '17:00', checkIn: '08:00', lateMinutes: 0,
      ...(missing.includes(date) ? { checkOut: null, status: 'missing_punch', attendanceReviewRequired: true, attendanceReviewReason: MISSING_PUNCH_REVIEW_REASON } : { checkOut: '17:00', status: 'present' }) })))
  }
  if (exempt) await t.repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'اختبار خصم نسيان البصمة',
    status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null,
    unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const correctionRequest = (emp, date, status) => t.repo('Request').save({ typeCode: 'PUNCH_CORRECTION', requesterId: emp.id, branchId: branch.id, status,
  payload: JSON.stringify({ date, punchType: 'OUT', time: '17:00', reason: 'نسيت أبصم' }), createdAt: new Date() })
const recordedCorrection = (emp, date) => t.repo('AttendanceCorrection').save({ employeeId: emp.id, date, reason: 'نسيت أبصم', correctedPunch: JSON.stringify({ in: null, out: '17:00' }) })
const calculate = emps => t.request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id), name: `نسيان البصمة ${crypto.randomUUID().slice(0, 8)}` })
const runFor = async emps => t.expectStatus(await calculate(emps), 201)
const itemOf = (run, emp) => run.items.find(row => row.employeeId === emp.id)
const config = (key, value) => t.request(admin, 'PATCH', '/settings/config', { key, value })
const deductionKeys = item => lines.projectPayrollItemLines(item).deductions.map(line => [line.key, Number(line.amount)]).filter(([, amount]) => amount !== 0)
async function approve(run) {
  const unassigned = t.expectStatus(await t.request(approver, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  t.expectStatus(await t.request(approver, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: unassigned.reportHash }), 201)
  return t.request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
}

before(async () => {
  await t.start()
  branch = await t.repo('Branch').save({ code: 'MD_SA', name: 'فرع الرياض', insuranceSystem: 'SAUDI' })
  admin = await t.user({ scopeAllBranches: true }); approver = await t.user({ scopeAllBranches: true })
  await t.repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  await t.repo('RequestType').save({ code: 'PUNCH_CORRECTION', nameAr: 'تصحيح/طلب بصمة', category: 'time_attendance', requiredFields: '[]', destinationHandler: 'attendance_corrections' })
  await t.repo('RequestType').save({ code: 'LEAVE_ANNUAL', nameAr: 'إجازة سنوية', category: 'leave', requiredFields: '[]', destinationHandler: 'leaves' })
  E.off = await employee('موظف قبل التفعيل', ['2026-09-03'])
  // خمس أيام ناقصة: 3 (من غير طلب)، 8 (تصحيح اتسجّل)، 10 (طلب مستني)، 15 (طلب مرفوض = مش طلب)، 22 (طلب نوع تاني بنفس التاريخ = مش طلب تصحيح)
  E.on = await employee('موظف بعد التفعيل', ['2026-09-03', '2026-09-08', '2026-09-10', '2026-09-15', '2026-09-22'])
  E.exempt = await employee('موظف مستثنى', ['2026-09-03', '2026-09-08'], true)
  E.spare = await employee('موظف المسموح', ['2026-09-03', '2026-09-08'])
  E.clean = await employee('موظف من غير نسيان')
  await recordedCorrection(E.on, '2026-09-08')
  await correctionRequest(E.on, '2026-09-10', 'UNDER_REVIEW')
  await correctionRequest(E.on, '2026-09-15', 'REJECTED'); await correctionRequest(E.on, '2026-09-15', 'DRAFT')
  await t.repo('Request').save({ typeCode: 'LEAVE_ANNUAL', requesterId: E.on.id, branchId: branch.id, status: 'SUBMITTED', payload: JSON.stringify({ date: '2026-09-22' }), createdAt: new Date() })
}, { timeout: 120000 })
after(context => t.stop(context))


test('P8A-F00: off payroll calculation, policy fingerprint and slip match approved baseline',async()=>{
  const {baseline}=require('./codex-review-p8a-baseline-loader.cjs')
  const old=baseline('payroll/payroll.service.ts').PayrollService
  const current=t.app.get(require('../src/payroll/payroll.service').PayrollService)
  for(const raw of [undefined,'0','bad']) {
    if(raw!==undefined) await t.repo('RequestsConfig').save({key:'payroll.missing_punch.penalty_days',value:raw})
    const a=await require('../src/payroll/payroll-policy-snapshot').capturePayrollRunPolicySnapshot(t.ds.manager,{period:PERIOD,policyVersionId:null},admin.id)
    const b=await baseline('payroll/payroll-policy-snapshot.ts').capturePayrollRunPolicySnapshot(t.ds.manager,{period:PERIOD,policyVersionId:null},admin.id)
    delete a.capturedAt; delete b.capturedAt; assert.deepEqual(a,b)
  }
  const run=await runFor([E.off,E.clean]), beforeItems=run.items
  const original=Object.getPrototypeOf(current)
  let recalculated
  try {
    Object.setPrototypeOf(current,old.prototype)
    recalculated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A baseline comparison'}),201)
  } finally {Object.setPrototypeOf(current,original)}
  const money=['basicSalary','allowances','overtimeAmount','otherAdditions','latenessDeduction','shortfallDeduction','absenceDeduction','unpaidLeaveDeduction','loanInstallments','otherDeductions','socialInsuranceDeduction','netPay']
  for(const item of beforeItems) {
    const prev=recalculated.items.find(x=>x.employeeId===item.employeeId)
    for(const key of money) {assert.notEqual(item[key],undefined,key); assert.deepEqual(item[key],prev[key],key)}
    assert.deepEqual(JSON.parse(item.breakdown),JSON.parse(prev.breakdown))
    assert.deepEqual(lines.projectPayrollItemLines(item),baseline('payroll/payroll-item-lines.ts').projectPayrollItemLines(prev))
  }
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F00',baseline:'cfd56bd4',items:beforeItems.length,snapshotAndHashEqual:true,breakdownAndSlipEqual:true}))
})
test('P8A-F01: late pending correction versus final payroll approval', async () => {
  t.expectStatus(await config('payroll.missing_punch.penalty_days','0.25'),200)
  t.expectStatus(await config('payroll.missing_punch.free_count','0'),200)
  const emp = await employee('P8A late correction',['2026-09-03'])
  const run = await runFor([emp])
  assert.equal(Number(itemOf(run,emp).latenessDeduction),75)
  const chain=await t.repo('ApprovalChain').save({code:'P8A_CORRECTION',nameAr:'P8A approval'})
  await t.repo('ApprovalStep').save({chainId:chain.id,stepOrder:1,approverRole:'hr',slaDays:3})
  await t.repo('RequestType').update({code:'PUNCH_CORRECTION'},{approvalChainId:chain.id,requiredFields:JSON.stringify(['date','punchType','time','reason'])})
  const owner=await t.user({role:'employee',permissions:'[]',employeeId:emp.id,branchId:branch.id})
  const req=t.expectStatus(await t.request(owner,'POST','/requests',{typeCode:'PUNCH_CORRECTION',submit:true,payload:{date:'2026-09-03',punchType:'OUT',time:'17:00',reason:'P8A late correction'}}),201)
  assert.equal(req.status,'UNDER_REVIEW')
  assert.ok(req.id)
  const result = await approve(run)
  const saved = await t.repo('PayrollItem').findOneBy({runId:run.id,employeeId:emp.id})
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F01',approval:result.status,code:result.body.code,pendingCorrection:req.id,deduction:Number(saved.latenessDeduction)}))
  assert.equal(result.status,201,'bug witness: approval must currently pass')
  assert.equal(Number(saved.latenessDeduction),75)
})
test('P8A-F02: exemption preview omits missing-punch amount that execution later drops',async()=>{
  t.expectStatus(await config('payroll.late_deduction_enabled','true'),200)
  const emp=await employee('P8A exemption estimate',['2026-09-03'])
  await t.repo('AttendanceDay').update({employeeId:emp.id,date:'2026-09-03'},{lateMinutes:30})
  const run=await runFor([emp]), before=Number(itemOf(run,emp).latenessDeduction)
  assert.ok(before>75)
  const input={runId:run.id,employeeId:emp.id,scopeKind:'DEDUCTION_TYPE',targetKind:'LATENESS',reason:'P8A documented employee attendance correction after independent management review'}
  const preview=await t.request(admin,'POST','/payroll/exemptions/preview',input)
  assert.ok([200,201].includes(preview.status),JSON.stringify(preview.body))
  const grant=t.expectStatus(await t.request(admin,'POST','/payroll/exemptions',{...input,previewHash:preview.body.previewHash}),201)
  const updated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A after approved exemption'}),201)
  const after=Number(itemOf(updated,emp).latenessDeduction)
  console.log('REVIEW_MEASURE '+JSON.stringify({case:'P8A-F02',before,estimated:grant.estimatedAmount,after,actualDropped:before-after}))
  assert.equal(after,0)
  assert.equal(before-Number(grant.estimatedAmount),75,'bug witness: 75 was dropped without appearing in approved estimate')
})
test('P8A-F03: global lateness waiver also removes missing punch with exact slip sum',async()=>{
  const emp=await employee('P8A waived missing',['2026-09-03'])
  const run=await runFor([emp]);assert.equal(Number(itemOf(run,emp).latenessDeduction),75)
  t.expectStatus(await t.request(admin,'POST','/payroll/overview/waivers',{period:PERIOD,kind:'LATENESS',targetLevel:'employees',branchId:branch.id,employeeIds:[emp.id],reason:'P8A approved waiver'}),201)
  const updated=t.expectStatus(await t.request(admin,'POST','/payroll/runs/'+run.id+'/recalculate',{reason:'P8A after lateness waiver'}),201)
  const item=itemOf(updated,emp);assert.equal(Number(item.latenessDeduction),0)
  assert.ok(!deductionKeys(item).some(([key])=>key==='MISSING_PUNCH'))
  const slip=lines.projectPayrollItemLines(item)
  assert.equal(Math.round((slip.totals.earnings-slip.totals.deductions)*100),Math.round(Number(item.netPay)*100))
})
test('P8A-F04: missing punch respects the net floor and exact payslip cents',async()=>{
  t.expectStatus(await config('payroll.policy.min_net_guarantee','8980'),200)
  const emp=await employee('P8A net floor',['2026-09-03'])
  const run=await runFor([emp]), item=itemOf(run,emp), slip=lines.projectPayrollItemLines(item)
  assert.equal(Number(item.netPay),8980)
  assert.equal(Number(item.latenessDeduction),20)
  assert.deepEqual(deductionKeys(item),[['MISSING_PUNCH',20]])
  assert.equal(Math.round(slip.deductions.reduce((n,x)=>n+x.amount,0)*100),2000)
  assert.equal(slip.totals.net,8980)
  t.expectStatus(await config('payroll.policy.min_net_guarantee','null'),200)
})
test('P8A-F05: enabled penalty does not waive an unrelated attendance review reason',async()=>{
  const emp=await employee('P8A unrelated review',['2026-09-03'])
  await t.repo('AttendanceDay').update({employeeId:emp.id,date:'2026-09-03'},{attendanceReviewReason:'P8A unrelated schedule conflict'})
  const run=await runFor([emp]), result=await approve(run)
  assert.equal(result.status,409,JSON.stringify(result.body))
  assert.equal(result.body.code,'PAYRUN-ATTENDANCE-REVIEW')
})
