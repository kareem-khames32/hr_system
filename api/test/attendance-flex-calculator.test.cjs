const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true })
const { calculateAttendanceFlex: calculate, attendanceIntervalMinutes } = require('../src/attendance/attendance-flex-calculator')
const defaults = { startMinute: 540, endMinute: 1080, flexEnabled: true, flexWindowMinutes: 60,
  requiredWorkMinutes: 540, graceMinutes: 10, checkInMinute: 570, checkOutMinute: 1110 }
const calc = input => calculate({ ...defaults, ...input })
const permission = (from, to, deductible = false, deductRatio = 1, coverage = 'both') => ({ from, to, deductible, deductRatio, coverage })

for (const [name, checkInMinute, checkOutMinute, late, short] of [
  ['09:30–18:30 completes the floating day', 570, 1110, 0, 0],
  ['09:30–18:00 is short, not late', 570, 1080, 0, 30],
  ['10:00 is inside the inclusive window', 600, 1140, 0, 0],
  ['10:01 owes lateness even after nine hours', 601, 1141, 61, 0],
  ['10:01–20:00 keeps lateness', 601, 1200, 61, 0],
  ['late plus real shortfall remain separate', 615, 1080, 75, 75],
]) test(name, () => { const r = calc({ checkInMinute, checkOutMinute }); assert.equal(r.rawLateMinutes, late); assert.equal(r.lateMinutes, late); assert.equal(r.shortfallMinutes, short) })

test('10:00:59 is outside even though lateness is floored to 60', () => {
  const r = calc({ checkInMinute: 600 + 59 / 60, checkOutMinute: 1141 })
  assert.equal(r.flexOutcome, 'AFTER_WINDOW'); assert.equal(r.rawLateMinutes, 60)
})
test('early work is informational by default and can be enabled', () => {
  const r = calc({ checkInMinute: 480, checkOutMinute: 1020 })
  assert.equal(r.rawWorkMinutes, 540); assert.equal(r.countedWorkMinutes, 480)
  assert.equal(r.earlyArrivalMinutes, 60); assert.equal(r.shortfallMinutes, 60)
  assert.equal(calc({ checkInMinute: 480, checkOutMinute: 1020, countEarlyWorkTowardRequired: true }).shortfallMinutes, 0)
})
test('disabled flexibility still measures shortfall and applies ordinary grace', () => {
  const r = calc({ flexEnabled: false, checkInMinute: 545, checkOutMinute: 1080 })
  assert.equal(r.rawLateMinutes, 5); assert.equal(r.unexcusedLateMinutes, 5)
  assert.equal(r.lateMinutes, 0); assert.equal(r.shortfallMinutes, 5)
})
test('flex window supersedes a larger ordinary grace unless explicitly configured otherwise', () => {
  assert.equal(calc({ checkInMinute: 601, graceMinutes: 90 }).lateMinutes, 61)
  assert.equal(calc({ checkInMinute: 601, graceMinutes: 90, windowSupersedesGrace: false }).lateMinutes, 0)
})
test('shortfall tolerance stays out of the quantity calculation', () => {
  assert.equal(calc({ checkInMinute: 570, checkOutMinute: 1105, shortfallToleranceMinutes: 10 }).shortfallMinutes, 5)
})
test('missing checkout keeps known lateness, unknown work and shortfall, and a review flag', () => {
  const r = calc({ checkInMinute: 601, checkOutMinute: null })
  assert.equal(r.rawLateMinutes, 61); assert.equal(r.shortfallMinutes, null)
  assert.equal(r.countedWorkMinutes, null); assert.equal(r.attendanceReviewRequired, true)
})
test('missing checkin does not invent a lateness or duration', () => {
  const r = calc({ checkInMinute: null })
  assert.equal(r.rawLateMinutes, 0); assert.equal(r.shortfallMinutes, null); assert.equal(r.attendanceReviewRequired, true)
})
test('no punches remains absence, without an invented missing-punch review', () => {
  const r = calc({ checkInMinute: null, checkOutMinute: null })
  assert.equal(r.flexOutcome, 'NO_PUNCH'); assert.equal(r.shortfallMinutes, null); assert.equal(r.attendanceReviewRequired, false)
})
test('free permission leaves genuine shortfall after unexcused lateness overlap', () => {
  const r = calc({ checkInMinute: 630, checkOutMinute: 1020, permissions: [permission(540, 600)] })
  assert.equal(r.rawLateMinutes, 90); assert.equal(r.unexcusedLateMinutes, 30)
  assert.equal(r.effectiveRequiredWorkMinutes, 480); assert.equal(r.shortfallMinutes, 90)
  assert.equal(r.shortfallMinutes - r.unexcusedLateMinutes, 60)
})
test('paid permission keeps one direct charge and a disjoint overlap quantity', () => {
  const r = calc({ checkInMinute: 630, checkOutMinute: 1020, permissions: [permission(540, 600, true, .5)] })
  assert.equal(r.rawLateMinutes, 90); assert.equal(r.unexcusedLateMinutes, 30)
  assert.equal(r.shortfallMinutes, 150); assert.equal(r.paidPermissionCoveredMinutes, 60)
  assert.equal(r.paidPermissionDeductibleMinutes, 30)
  assert.equal(r.shortfallMinutes - r.unexcusedLateMinutes - r.paidPermissionShortfallCoveredMinutes, 60)
})
test('overlapping free and paid permissions never credit or charge the same minute twice', () => {
  const r = calc({ checkInMinute: 630, checkOutMinute: 1020,
    permissions: [permission(540, 600), permission(570, 630, true), permission(600, 630, true, .5)] })
  assert.equal(r.excusedMinutes, 60); assert.equal(r.paidPermissionCoveredMinutes, 30)
  assert.equal(r.paidPermissionDeductibleMinutes, 30); assert.equal(r.unexcusedLateMinutes, 0)
})
test('an approved permission inside already counted work cannot erase another shortfall', () => {
  const r = calc({ checkInMinute: 570, checkOutMinute: 1080, permissions: [permission(720, 780)] })
  assert.equal(r.excusedMinutes, 0); assert.equal(r.shortfallMinutes, 30)
})
test('morning half-leave shifts the full inclusive window to 13:30–14:30', () => {
  const halfLeaveWindows = [{ from: 540, to: 810 }]
  const r = calc({ halfLeaveWindows, checkInMinute: 870, checkOutMinute: 1140 })
  assert.equal(r.effectiveStartMinute, 810); assert.equal(r.windowEndMinute, 870)
  assert.equal(r.effectiveRequiredWorkMinutes, 270); assert.equal(r.rawLateMinutes, 0)
  assert.equal(calc({ halfLeaveWindows, checkInMinute: 871, checkOutMinute: 1141 }).rawLateMinutes, 61)
})
test('partial-leave proportional window requires the explicit policy switch', () => {
  const r = calc({ halfLeaveWindows: [{ from: 540, to: 810 }], prorateFlexWindowOnPartialLeave: true,
    checkInMinute: 841, checkOutMinute: 1111 })
  assert.equal(r.windowEndMinute, 840); assert.equal(r.rawLateMinutes, 31)
})
test('night shift keeps its window and floating end on the extended business-day line', () => {
  const r = calc({ startMinute: 1320, endMinute: 1860, checkInMinute: 1350, checkOutMinute: 1890 })
  assert.equal(r.windowEndMinute, 1380); assert.equal(r.expectedEndMinute, 1890)
  assert.equal(r.countedWorkMinutes, 540); assert.equal(r.shortfallMinutes, 0)
})
test('actual elapsed duration is retained at a DST boundary and requests review', () => {
  const r = calc({ actualWorkMinutes: 480, actualCountedWorkMinutes: 480, irregularTime: true })
  assert.equal(r.rawWorkMinutes, 480); assert.equal(r.shortfallMinutes, 60); assert.equal(r.attendanceReviewRequired, true)
})
for (const value of [null, 0, -1, 60.5, 540]) test(`invalid enabled window ${value} is never silently defaulted`, () => {
  const r = calc({ flexWindowMinutes: value }); assert.equal(r.flexOutcome, 'INVALID_CONFIGURATION'); assert.equal(r.attendanceReviewRequired, true)
})
test('interval union does not sum overlapping approval windows', () => {
  assert.equal(attendanceIntervalMinutes(0, 60, [{ from: 0, to: 40 }, { from: 20, to: 50 }]), 50)
})

// السماحية لا تُطبَّق في الوردية المرنة إلا إذا أُطفئ window_supersedes_grace —
// فالشاشة تُخفيها بنفس شرط المحرك تماماً، لا بالمرونة وحدها
test('«سماحية N د» تظهر في شاشات الحضور حيث تُطبَّق فعلاً (بنفس شرط المحرك)', () => {
  const fs = require('node:fs')
  const engine = fs.readFileSync(path.join(__dirname, '..', 'src', 'attendance', 'attendance-flex-calculator.ts'), 'utf8')
  assert.match(engine, /input\.flexEnabled && \(input\.windowSupersedesGrace \?\? true\) \? 0 : input\.graceMinutes/)
  for (const page of ['attendance/page.tsx', 'attendance/monthly-sheet/page.tsx', 'my/attendance/page.tsx']) {
    const text = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', page), 'utf8')
    const conditions = text.match(/graceUsed != null[^\n]*/g) ?? []
    assert.ok(conditions.length > 0, page)
    for (const condition of conditions) {
      assert.match(condition, /attendanceRuleSnapshot\?\.flexEnabled/, `${page}: ${condition}`)
      assert.match(condition, /windowSupersedesGrace \?\? true/, `${page}: ${condition}`)
    }
  }
  // عمود «السماحية المطبَّقة» في تصدير الكشف الشهري بنفس الشرط
  const sheet = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', 'attendance', 'monthly-sheet', 'page.tsx'), 'utf8')
  assert.match(sheet, /flexEnabled && \(row\.attendanceRuleSnapshot\.windowSupersedesGrace \?\? true\) \? '' : row\.graceUsed/)
  // الحقل يصل الشاشة من اللقطة المخزنة
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'lib', 'api.ts'), 'utf8'), /windowSupersedesGrace\?: boolean/)
})

// زر إعادة حساب واحد في النظام (اليومي بنطاق المستخدم)، وعرض الكشف لا يكتب صفوفاً
// إلا لمن يملك إدارة الحضور، وللفجوات وحدها (اليوم المحفوظ لا يُعاد حسابه من قراءة)
test('لا مسار ولا زر إعادة حساب ثانٍ، وتجسيد غياب الكشف بصلاحية الإدارة وللفجوات وحدها', () => {
  const fs = require('node:fs')
  const root = path.join(__dirname, '..', '..')
  const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
  const controller = read('api/src/attendance/attendance.controller.ts')
  const service = read('api/src/attendance/attendance.service.ts')
  assert.doesNotMatch(controller, /monthly\/recompute/)
  assert.doesNotMatch(service, /recomputeEmployeeMonth/)
  assert.doesNotMatch(read('src/lib/api.ts'), /recomputeEmployeeMonth/)
  const sheet = read('src/app/attendance/monthly-sheet/page.tsx')
  assert.doesNotMatch(sheet, /إعادة حساب/)
  // التجسيد من العرض: بصلاحية الإدارة وحدها، وبفجوات الأيام بلا صف
  assert.match(service, /if \(userHasPerm\(user, 'attendance\.manage'\)\) \{\s*\n\s*await this\.catchUpEmployeeAbsences/)
  assert.match(service, /if \(!stored\.has\(date\)\)/)
  // زر إعادة الحساب الوحيد الباقي: يوم الحضور اليومي بنطاق المستخدم
  assert.match(read('src/app/attendance/page.tsx'), /recomputeAttendanceDay\(selectedDate\)/)
  assert.match(controller, /@Post\('recompute'\)/)
})
