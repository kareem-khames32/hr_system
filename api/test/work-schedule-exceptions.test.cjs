// قرار المالك (26 سبتمبر): «آخر سبت في الشهر دوام» جوه جدول العمل نفسه، على الشهر المالي (23 → 22) أو الميلادي،
// وفترة خدمة الموظف (من المباشرة لآخر يوم عمل) للحضور والورديات. اختبارات وحدة بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const {
  scheduleExceptionMatches, normalizeWorkScheduleExceptions, parseWorkScheduleExceptions, assertWorkScheduleExceptionsFit,
} = require('../src/attendance/work-schedule-exceptions')
const { evaluateCalendarDay } = require('../src/attendance/attendance-calendar-resolver')
const { employmentWindowOf, inEmploymentWindow, employmentOverlaps } = require('../src/attendance/attendance-employment')

const fail = (message) => { throw new Error(message) }
const lastSatPayroll = { weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL', cycleStartDay: 23 }
const lastSatCalendar = { weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', basis: 'CALENDAR' }

test('WSE-01: last Saturday of the payroll month (cycle 23) is the last Saturday on or before the 22nd', () => {
  // شهر أكتوبر المالي: 23 سبتمبر → 22 أكتوبر — سبوته 26/9 و3 و10 و17/10، آخرها 17 أكتوبر
  assert.equal(scheduleExceptionMatches('2026-10-17', 'SAT', lastSatPayroll), true)
  for (const date of ['2026-09-26', '2026-10-03', '2026-10-10']) assert.equal(scheduleExceptionMatches(date, 'SAT', lastSatPayroll), false, date)
  // شهر سبتمبر المالي: 23 أغسطس → 22 سبتمبر — آخر سبت 19 سبتمبر
  assert.equal(scheduleExceptionMatches('2026-09-19', 'SAT', lastSatPayroll), true)
  assert.equal(scheduleExceptionMatches('2026-09-12', 'SAT', lastSatPayroll), false)
  // نفس اليوم مش سبت → مايطابقش
  assert.equal(scheduleExceptionMatches('2026-10-16', 'FRI', lastSatPayroll), false)
})

test('WSE-02: calendar-month basis keeps the old meaning (26 September is the last Saturday of September)', () => {
  assert.equal(scheduleExceptionMatches('2026-09-26', 'SAT', lastSatCalendar), true)
  assert.equal(scheduleExceptionMatches('2026-09-19', 'SAT', lastSatCalendar), false)
  assert.equal(scheduleExceptionMatches('2026-10-31', 'SAT', lastSatCalendar), true)
})

test('WSE-03: nth occurrences count from the start of the payroll month', () => {
  const firstSat = { weekday: 'SAT', occurrence: '1ST', effect: 'WORK', basis: 'PAYROLL', cycleStartDay: 23 }
  const secondSat = { ...firstSat, occurrence: '2ND' }
  assert.equal(scheduleExceptionMatches('2026-09-26', 'SAT', firstSat), true) // أول سبت بعد 23 سبتمبر
  assert.equal(scheduleExceptionMatches('2026-10-03', 'SAT', secondSat), true)
  assert.equal(scheduleExceptionMatches('2026-10-03', 'SAT', firstSat), false)
  const every = { weekday: 'SAT', occurrence: 'ALL', effect: 'WORK', basis: 'PAYROLL' }
  assert.equal(scheduleExceptionMatches('2026-10-10', 'SAT', every), true)
})

test('WSE-04: the calendar evaluation applies schedule exceptions after company/branch rules; a public holiday still wins', () => {
  const weekend = ['FRI', 'SAT']
  assert.equal(evaluateCalendarDay('2026-10-17', 'EG', weekend, [], [], [], [lastSatPayroll]), 'WORKING')
  assert.equal(evaluateCalendarDay('2026-10-10', 'EG', weekend, [], [], [], [lastSatPayroll]), 'WEEKEND')
  // موظف الجدول التاني (الجمعة بس راحة): السبت شغل عادي من غير استثناء
  assert.equal(evaluateCalendarDay('2026-10-10', 'EG', ['FRI'], [], [], []), 'WORKING')
  // قاعدة فرع «آخر سبت راحة» واستثناء الجدول «دوام»: الأخص (الجدول) يكسب
  const branchOff = [{ id: 1, name: 'x', weekday: 'SAT', occurrence: 'ALL', effect: 'OFF', isActive: true }]
  assert.equal(evaluateCalendarDay('2026-10-17', 'EG', weekend, [], [], branchOff, [lastSatPayroll]), 'WORKING')
  const holiday = [{ id: 1, name: 'عطلة', date: '2026-10-17', endDate: null, country: 'EG' }]
  assert.equal(evaluateCalendarDay('2026-10-17', 'EG', weekend, holiday, [], [], [lastSatPayroll]), 'HOLIDAY')
  // من غير استثناءات: السلوك القديم بالحرف
  assert.equal(evaluateCalendarDay('2026-10-17', 'EG', weekend, [], [], []), 'WEEKEND')
})

test('WSE-05: input normalization pins the company cycle start and rejects meaningless or duplicate exceptions', () => {
  const saved = normalizeWorkScheduleExceptions([{ weekday: 'sat', occurrence: 'last', effect: 'work', basis: 'payroll' }], 'FRI,SAT', 23)
  assert.deepEqual(JSON.parse(saved), [{ weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL', cycleStartDay: 23 }])
  assert.equal(normalizeWorkScheduleExceptions([], 'FRI,SAT', 23), null)
  assert.equal(normalizeWorkScheduleExceptions(null, 'FRI,SAT', 23), null)
  // «دوام» على يوم شغل أصلًا مالوش معنى
  assert.throws(() => normalizeWorkScheduleExceptions([{ weekday: 'SUN', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL' }], 'FRI,SAT', 23), /يوم شغل أصلًا/)
  // «راحة» على يوم راحة أصلًا مالوش معنى
  assert.throws(() => normalizeWorkScheduleExceptions([{ weekday: 'FRI', occurrence: '1ST', effect: 'OFF', basis: 'CALENDAR' }], 'FRI,SAT', 23), /يوم راحة أصلًا/)
  assert.throws(() => normalizeWorkScheduleExceptions([lastSatPayroll, lastSatPayroll], 'FRI,SAT', 23), /نفس اليوم ونفس التكرار/)
  assert.throws(() => normalizeWorkScheduleExceptions([{ weekday: 'XXX', occurrence: 'LAST', effect: 'WORK' }], 'FRI,SAT', 23), /يوم الاستثناء/)
  // تعديل أيام الراحة بعد كده: السبت بقى شغل → «دوام آخر سبت» يترفض برسالة واضحة
  assert.throws(() => assertWorkScheduleExceptionsFit([lastSatPayroll], 'FRI'), /السبت يوم شغل أصلًا/)
})

test('WSE-06: stored values are parsed strictly — a corrupt value is never read as "no exceptions"', () => {
  assert.deepEqual(parseWorkScheduleExceptions(null, fail), [])
  assert.deepEqual(parseWorkScheduleExceptions('', fail), [])
  assert.equal(parseWorkScheduleExceptions(JSON.stringify([lastSatPayroll]), fail)[0].cycleStartDay, 23)
  assert.throws(() => parseWorkScheduleExceptions('{bad', fail), /تالفة/)
  assert.throws(() => parseWorkScheduleExceptions('{"a":1}', fail), /تالفة/)
})

test('EMP-01: the service window ends at the last working day from offboarding, else the archive date', () => {
  const emp = { joinDate: '2024-01-10', actualStartDate: null, archivedAt: null }
  assert.deepEqual(employmentWindowOf(emp, ['2026-09-24']), { from: '2024-01-10', to: '2026-09-24', toSource: 'OFFBOARDING' })
  // ملف قديم قبل إعادة التعيين مايقفلش الخدمة الحالية، وأبكر آخر يوم بعد التعيين هو اللي بيسري
  assert.equal(employmentWindowOf({ ...emp, joinDate: '2026-01-01' }, ['2025-06-30', '2026-09-24', '2026-10-30']).to, '2026-09-24')
  assert.deepEqual(employmentWindowOf({ ...emp, joinDate: '2026-01-01' }, ['2025-06-30']), { from: '2026-01-01', to: null, toSource: null })
  const archived = employmentWindowOf({ ...emp, archivedAt: new Date(2026, 8, 20, 18, 0) }, [])
  assert.deepEqual(archived, { from: '2024-01-10', to: '2026-09-20', toSource: 'ARCHIVE' })
  assert.equal(employmentWindowOf({ ...emp, actualStartDate: '2024-02-01' }).from, '2024-02-01')
  const w = employmentWindowOf(emp, ['2026-09-24'])
  assert.equal(inEmploymentWindow(w, '2026-09-24'), true)
  assert.equal(inEmploymentWindow(w, '2026-09-25'), false)
  assert.equal(inEmploymentWindow(w, '2024-01-09'), false)
  assert.equal(employmentOverlaps(w, '2026-09-20', '2026-09-26'), true)
  assert.equal(employmentOverlaps(w, '2026-09-27', '2026-10-03'), false)
})

test('EMP-02: an ended employee with no documented last day is outside service for assignment only', () => {
  const { schedulableOn } = require('../src/attendance/attendance-employment')
  // مرحّل من النظام القديم: «منتهية خدمته» من غير ملف إنهاء ولا أرشفة — مايتسندلوش وردية ولا يلمس أي مدة
  const gone = employmentWindowOf({ joinDate: '2020-01-01', actualStartDate: null, archivedAt: null, status: 'terminated' }, [])
  assert.equal(gone.endedUnknown, true)
  assert.equal(employmentOverlaps(gone, '2026-09-01', '2026-09-30'), false)
  assert.equal(schedulableOn(gone, '2026-09-10'), false)
  // حساب الحضور بتاعه زي ما كان — مابنخترعش تاريخ نهاية
  assert.equal(inEmploymentWindow(gone, '2026-09-10'), true)
  // لو ليه تاريخ موثّق يبقى هو الحد، مش «مجهول»
  const documented = employmentWindowOf({ joinDate: '2020-01-01', actualStartDate: null, archivedAt: null, status: 'terminated' }, ['2026-09-24'])
  assert.equal(documented.endedUnknown, undefined)
  assert.equal(schedulableOn(documented, '2026-09-24'), true)
  assert.equal(schedulableOn(documented, '2026-09-25'), false)
  // الشغال عادي
  assert.equal(employmentWindowOf({ joinDate: '2020-01-01', actualStartDate: null, archivedAt: null, status: 'active' }).endedUnknown, undefined)
})
