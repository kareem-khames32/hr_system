'use strict'
// B-ADD.14: «خصم نسيان البصمة» في المسير، على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_missing_punch_test_<16 hex>)، عبر HTTP بتوكنات
// موقّعة محليًا ومن غير كلمات مرور.
//  MPD-01) المعامل مقفول (الافتراضي): تصحيحات البصمة مابتخصمش حاجة — لا في اللقطة ولا في البند ولا في القسيمة.
//  MPD-02) المعامل مفعّل: كل تصحيح بعد «المسموح» بأجر اليوم × المعامل، على يومه جوه عمود التأخير، وسطر «نسيان بصمة» في القسيمة؛
//          والإعدادين بيتفحصوا؛ وموظف مستثنى من الحضور مابيتخصمش منه.
// Run (من api/): node --test test/missing-punch-deduction.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { disposableApp } = require('./helpers/disposable-app.cjs')
const t = disposableApp('missing_punch')
const lines = require('../src/payroll/payroll-item-lines')
const E = {}
let admin, branch, number = 0
const PERIOD = '2026-09', DAYS = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`)

async function employee(name, exempt = false) {
  const emp = await t.repo('Employee').save({ employeeCode: `MD${String(++number).padStart(3, '0')}`, fullName: name, nationality: 'سعودي', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', isGosiRegistered: false })
  // كل أيام الفترة حضور كامل: مفيش غياب ولا تأخير ولا نقص — أي خصم في عمود التأخير هو نسيان البصمة بس
  for (let index = 0; index < DAYS.length; index += 15) {
    await t.repo('AttendanceDay').save(DAYS.slice(index, index + 15).map(date => ({ employeeId: emp.id, branchId: branch.id, date, shiftName: 'صباحي', shiftStart: '08:00', shiftEnd: '17:00',
      checkIn: '08:00', checkOut: '17:00', status: 'present', lateMinutes: 0 })))
  }
  if (exempt) await t.repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'اختبار خصم نسيان البصمة',
    status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null,
    unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  return emp
}
const correction = (emp, date) => t.repo('AttendanceCorrection').save({ employeeId: emp.id, date, reason: 'نسيت أبصم', correctedPunch: JSON.stringify({ in: '08:00', out: null }) })
const runFor = async emps => t.expectStatus(await t.request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
  name: `نسيان البصمة ${crypto.randomUUID().slice(0, 8)}` }), 201)
const itemOf = (run, emp) => run.items.find(row => row.employeeId === emp.id)
const config = (key, value) => t.request(admin, 'PATCH', '/settings/config', { key, value })
const deductionKeys = item => lines.projectPayrollItemLines(item).deductions.map(line => [line.key, Number(line.amount)]).filter(([, amount]) => amount !== 0)

before(async () => {
  await t.start()
  branch = await t.repo('Branch').save({ code: 'MD_SA', name: 'فرع الرياض', insuranceSystem: 'SAUDI' })
  admin = await t.user({ scopeAllBranches: true })
  await t.repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  E.off = await employee('موظف قبل التفعيل'); E.on = await employee('موظف بعد التفعيل'); E.exempt = await employee('موظف مستثنى', true); E.clean = await employee('موظف من غير تصحيحات'); E.spare = await employee('موظف المسموح')
  for (const emp of [E.off, E.on, E.exempt, E.spare]) { await correction(emp, '2026-09-03'); await correction(emp, '2026-09-10'); await correction(emp, '2026-09-10') }
  // تصحيح برّه الفترة مابيتعدّش
  await correction(E.on, '2026-08-31'); await correction(E.on, '2026-10-01')
}, { timeout: 120000 })
after(context => t.stop(context))

test('MPD-01: المعامل مقفول (الافتراضي) — تصحيحات البصمة مابتخصمش: لا في اللقطة ولا في البند ولا في القسيمة', async () => {
  const run = await runFor([E.off])
  const item = itemOf(run, E.off), breakdown = JSON.parse(item.breakdown), snapshot = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: run.id })).policySnapshot)
  assert.equal(Number(item.latenessDeduction), 0)
  assert.equal('missingPunch' in breakdown.attendanceDeductions, false)
  assert.equal('missingPunchDeduction' in breakdown.attendanceDeductions.totals, false)
  assert.deepEqual(['missingPunchPenaltyDays' in snapshot.values, 'missingPunchFreeCount' in snapshot.values, 'missingPunchPenaltyDays' in snapshot.sources], [false, false, false])
  assert.ok(!deductionKeys(item).some(([key]) => key === 'MISSING_PUNCH' || key === 'LATENESS'))
  // صفر مكتوب صراحة = برضه مقفول ومن غير أثر في اللقطة
  t.expectStatus(await config('payroll.missing_punch.penalty_days', '0'), 200)
  const zero = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: (await runFor([E.clean])).id })).policySnapshot)
  assert.equal('missingPunchPenaltyDays' in zero.values, false)
})

test('MPD-02: المعامل مفعّل — كل تصحيح بعد المسموح بأجر اليوم × المعامل على يومه في عمود التأخير، وسطر «نسيان بصمة»، والمستثنى برّه', async () => {
  for (const [key, value] of [['payroll.missing_punch.penalty_days', '6'], ['payroll.missing_punch.penalty_days', '0.123'], ['payroll.missing_punch.penalty_days', '-1'],
    ['payroll.missing_punch.free_count', '1.5'], ['payroll.missing_punch.free_count', '32']]) assert.equal((await config(key, value)).status, 400, `${key}=${value}`)
  t.expectStatus(await config('payroll.missing_punch.penalty_days', '0.5'), 200)
  t.expectStatus(await config('payroll.missing_punch.free_count', '1'), 200)
  const run = await runFor([E.on, E.exempt])
  const snapshot = JSON.parse((await t.repo('PayrollRun').findOneBy({ id: run.id })).policySnapshot)
  assert.deepEqual([snapshot.values.missingPunchPenaltyDays, snapshot.values.missingPunchFreeCount, snapshot.sources.missingPunchPenaltyDays], [0.5, 1, { kind: 'CONFIG', key: 'payroll.missing_punch.penalty_days' }])
  const item = itemOf(run, E.on), breakdown = JSON.parse(item.breakdown), dayRate = breakdown.attendanceDeductions.policy.dayRate
  assert.ok(dayRate > 0)
  // 3 تصحيحات في الفترة (3 سبتمبر، و10 سبتمبر مرتين): الأول مسموح، والاتنين بتوع 10 سبتمبر بنص يوم لكل واحد = يوم كامل
  const expected = Math.round(dayRate * 0.5 * 2 * 100) / 100
  assert.deepEqual(breakdown.attendanceDeductions.missingPunch, { penaltyDays: 0.5, free: 1, count: 3, charged: 2, days: [{ date: '2026-09-10', times: 2, amount: dayRate * 0.5 * 2 }] })
  assert.deepEqual([Number(item.latenessDeduction), breakdown.attendanceDeductions.totals.missingPunchDeduction, breakdown.attendanceDeductions.totals.latenessOnlyDeduction,
    breakdown.attendanceDeductions.totals.permissionDeduction], [expected, expected, 0, 0])
  assert.deepEqual(deductionKeys(item).filter(([key]) => ['LATENESS', 'DEDUCT_PERMISSION', 'MISSING_PUNCH'].includes(key)), [['MISSING_PUNCH', expected]])
  const line = lines.projectPayrollItemLines(item).deductions.find(row => row.key === 'MISSING_PUNCH')
  assert.equal(line.name, 'نسيان بصمة')
  // الصافي = الإجمالي المستحق ناقص الخصم (مفيش خصومات تانية ولا تأمينات)
  assert.equal(Number(item.netPay), Math.round((breakdown.grossEarned - expected) * 100) / 100)
  // المستثنى من الحضور: أيامه برّه خصم الحضور، فمفيش خصم نسيان بصمة
  const exempt = itemOf(run, E.exempt), exemptBreakdown = JSON.parse(exempt.breakdown)
  assert.deepEqual([Number(exempt.latenessDeduction), exemptBreakdown.attendanceDeductions.missingPunch.charged, exemptBreakdown.attendanceDeductions.missingPunch.count], [0, 0, 0])
  // المسموح أكبر من التصحيحات = من غير خصم
  t.expectStatus(await config('payroll.missing_punch.free_count', '5'), 200)
  const free = itemOf(await runFor([E.spare]), E.spare)
  assert.deepEqual([Number(free.latenessDeduction), JSON.parse(free.breakdown).attendanceDeductions.missingPunch.charged], [0, 0])
})
