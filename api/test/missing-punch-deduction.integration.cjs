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

test('MPD-01: المعامل مقفول (الافتراضي) — يوم البصمة الناقصة من غير خصم ولا أثر في اللقطة والقسيمة، وبيوقّف اعتماد المسير زي الأول', async () => {
  const run = await runFor([E.off])
  const item = itemOf(run, E.off), breakdown = JSON.parse(item.breakdown), snapshot = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: run.id })).policySnapshot)
  assert.equal(Number(item.latenessDeduction), 0)
  assert.equal('missingPunch' in breakdown.attendanceDeductions, false)
  assert.equal('missingPunchDeduction' in breakdown.attendanceDeductions.totals, false)
  assert.deepEqual(['missingPunchPenaltyDays' in snapshot.values, 'missingPunchFreeCount' in snapshot.values, 'missingPunchPenaltyDays' in snapshot.sources], [false, false, false])
  assert.ok(!deductionKeys(item).some(([key]) => key === 'MISSING_PUNCH' || key === 'LATENESS'))
  const blocked = await approve(run)
  assert.deepEqual([blocked.status, blocked.body.code], [409, 'PAYRUN-ATTENDANCE-REVIEW'])
  // صفر مكتوب صراحة = برضه مقفول ومن غير أثر في اللقطة
  t.expectStatus(await config('payroll.missing_punch.penalty_days', '0'), 200)
  const zero = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: (await runFor([E.clean])).id })).policySnapshot)
  assert.equal('missingPunchPenaltyDays' in zero.values, false)
})

test('MPD-02: المعامل مفعّل — يوم ببصمة واحدة ومن غير طلب بيتخصم بعد المسموح، واللي قدّم طلب لأ، والمستثنى برّه، والمسير بيتعتمد', async () => {
  for (const [key, value] of [['payroll.missing_punch.penalty_days', '6'], ['payroll.missing_punch.penalty_days', '0.123'], ['payroll.missing_punch.penalty_days', '-1'],
    ['payroll.missing_punch.free_count', '1.5'], ['payroll.missing_punch.free_count', '32']]) assert.equal((await config(key, value)).status, 400, `${key}=${value}`)
  t.expectStatus(await config('payroll.missing_punch.penalty_days', '0.25'), 200)
  t.expectStatus(await config('payroll.missing_punch.free_count', '1'), 200)
  const run = await runFor([E.on, E.exempt])
  const snapshot = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: run.id })).policySnapshot)
  assert.deepEqual([snapshot.values.missingPunchPenaltyDays, snapshot.values.missingPunchFreeCount, snapshot.sources.missingPunchPenaltyDays], [0.25, 1, { kind: 'CONFIG', key: 'payroll.missing_punch.penalty_days' }])
  const item = itemOf(run, E.on), breakdown = JSON.parse(item.breakdown), dayRate = breakdown.attendanceDeductions.policy.dayRate
  assert.ok(dayRate > 0)
  // 5 أيام ناقصة: 8 و10 عليهم طلب ← 3 من غير طلب (3، 15، 22): الأول مسموح، و15 و22 بربع يوم لكل واحد
  const quarter = dayRate * 0.25, expected = Math.round(quarter * 2 * 100) / 100
  assert.deepEqual(breakdown.attendanceDeductions.missingPunch, { penaltyDays: 0.25, free: 1, missingDays: 5, withRequest: 2, count: 3, charged: 2,
    days: [{ date: '2026-09-15', amount: quarter }, { date: '2026-09-22', amount: quarter }] })
  assert.deepEqual([Number(item.latenessDeduction), breakdown.attendanceDeductions.totals.missingPunchDeduction, breakdown.attendanceDeductions.totals.latenessOnlyDeduction,
    breakdown.attendanceDeductions.totals.permissionDeduction], [expected, expected, 0, 0])
  assert.deepEqual(deductionKeys(item).filter(([key]) => ['LATENESS', 'DEDUCT_PERMISSION', 'MISSING_PUNCH'].includes(key)), [['MISSING_PUNCH', expected]])
  assert.equal(lines.projectPayrollItemLines(item).deductions.find(row => row.key === 'MISSING_PUNCH').name, 'نسيان بصمة')
  assert.equal(Number(item.absenceDeduction), 0, 'مش غياب')
  // المستثنى من الحضور: أيامه برّه خصم الحضور
  const exempt = itemOf(run, E.exempt), exemptBreakdown = JSON.parse(exempt.breakdown)
  assert.deepEqual([Number(exempt.latenessDeduction), exemptBreakdown.attendanceDeductions.missingPunch.charged, exemptBreakdown.attendanceDeductions.missingPunch.missingDays], [0, 0, 0])
  // والخصم مفعّل، أيام البصمة الناقصة اتحاسبت فالمسير بيتعتمد
  t.expectStatus(await approve(run), 201)
  // المسموح أكبر من أيام النسيان = من غير خصم
  t.expectStatus(await config('payroll.missing_punch.free_count', '5'), 200)
  const free = itemOf(await runFor([E.spare]), E.spare), freeBreakdown = JSON.parse(free.breakdown).attendanceDeductions.missingPunch
  assert.deepEqual([Number(free.latenessDeduction), freeBreakdown.count, freeBreakdown.charged], [0, 2, 0])
})
