// الخطوة 14 / PR-08: اشتقاق فترة المسير — بداية كل فترة = نهاية السابقة + يوم، وكشف الفجوة والتداخل.
// اختبار صرف بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { payrollPeriodBounds: bounds, payrollPeriodOfDate: periodOf, payrollPeriodSequenceIssues: issues, shiftPayrollPeriod: shift,
  addPayrollDays: addDays, PayrollPeriodError } = require('../src/payroll/payroll-period')
const { salaryPayrollPeriodBounds } = require('../src/payroll/payroll-period-salary')

const dayCount = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1
function months(first, count) {
  const result = [first]
  while (result.length < count) result.push(shift(result[result.length - 1], 1))
  return result
}

test('دورات 23 و29 و30 و31 (و1) على 24 شهرًا متتاليًا: لا تداخل ولا فجوة، وكل يوم ينتمي لشهر واحد', t => {
  // سلسلتان: 2025-01..2026-12 (فبراير عادي) و2027-11..2029-10 (فبراير 2028 الكبيس).
  for (const first of ['2025-01', '2027-11']) {
    for (const cycle of [1, 23, 29, 30, 31]) {
      const ranges = months(first, 24).map(period => ({ period, ...bounds(period, cycle) }))
      assert.deepEqual(issues(ranges), [], `cycle ${cycle} from ${first}`)
      let covered = 0
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i]
        assert.ok(range.startDate <= range.endDate, JSON.stringify(range))
        assert.equal(range.endDate.slice(0, 7), range.period, `نهاية الفترة داخل شهرها: ${JSON.stringify(range)}`)
        if (i > 0) assert.equal(range.startDate, addDays(ranges[i - 1].endDate, 1), `cycle ${cycle}: ${ranges[i - 1].period} → ${range.period}`)
        for (let date = range.startDate; date <= range.endDate; date = addDays(date, 1)) {
          assert.equal(periodOf(date, cycle), range.period, `cycle ${cycle} date ${date}`)
          covered++
        }
        assert.deepEqual(salaryPayrollPeriodBounds(range.period, cycle), { startDate: range.startDate, endDate: range.endDate })
      }
      assert.equal(covered, dayCount(ranges[0].startDate, ranges[23].endDate), `cycle ${cycle}: كل يوم في السلسلة مغطى مرة واحدة`)
    }
  }
  t.diagnostic('5 دورات × سلسلتان × 24 شهرًا: تجاور تام وتطابق مع حدود سجل الأجر الشهري')
})

test('أمثلة صريحة مكتوبة يدويًا (ليست ناتج الدالة)', () => {
  const cases = [
    [23, '2026-09', '2026-08-23', '2026-09-22'], [23, '2026-01', '2025-12-23', '2026-01-22'],
    [1, '2026-02', '2026-02-01', '2026-02-28'], [1, '2024-02', '2024-02-01', '2024-02-29'],
    [29, '2026-02', '2026-01-29', '2026-02-28'], [29, '2026-03', '2026-03-01', '2026-03-28'],
    [30, '2026-02', '2026-01-30', '2026-02-28'], [30, '2026-03', '2026-03-01', '2026-03-29'],
    [31, '2026-02', '2026-01-31', '2026-02-28'], [31, '2026-03', '2026-03-01', '2026-03-30'],
    [31, '2026-04', '2026-03-31', '2026-04-30'], [31, '2026-05', '2026-05-01', '2026-05-30'],
    [29, '2024-03', '2024-02-29', '2024-03-28'], [30, '2024-03', '2024-03-01', '2024-03-29'],
    [31, '2024-03', '2024-03-01', '2024-03-30'], [31, '2026-01', '2025-12-31', '2026-01-30'],
  ]
  for (const [cycle, period, startDate, endDate] of cases) assert.deepEqual(bounds(period, cycle), { startDate, endDate }, `${cycle} ${period}`)
})

test('شهر يوم العمل حسب الدورة (أساس تسعير الإضافي)', () => {
  assert.equal(periodOf('2026-08-22', 23), '2026-08')
  assert.equal(periodOf('2026-08-23', 23), '2026-09')
  assert.equal(periodOf('2026-12-23', 23), '2027-01')
  assert.equal(periodOf('2026-02-28', 31), '2026-02')
  assert.equal(periodOf('2026-03-01', 31), '2026-03')
  assert.equal(periodOf('2026-03-31', 31), '2026-04')
  assert.equal(periodOf('2026-02-28', 1), '2026-02')
})

test('التداخل القديم (قص 29/30/31) والفجوة بعد تغيير الدورة يُكشفان بتواريخهما', () => {
  // الاشتقاق القديم: فبراير 31/1 → 28/2 ومارس 28/2 → 30/3 — يوم مشترك كان يوقف مارس بـPAYRUN-DUP-002.
  assert.deepEqual(issues([{ period: '2026-02', startDate: '2026-01-31', endDate: '2026-02-28' },
    { period: '2026-03', startDate: '2026-02-28', endDate: '2026-03-30' }]), [{ kind: 'OVERLAP', previousPeriod: '2026-02', nextPeriod: '2026-03',
    previousEndDate: '2026-02-28', nextStartDate: '2026-02-28', from: '2026-02-28', to: '2026-02-28', days: 1 }])
  // دورة 23 ثم تغيير الإعداد إلى 25: فجوة 23 و24 سبتمبر.
  assert.deepEqual(issues([{ period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22' },
    { period: '2026-10', startDate: '2026-09-25', endDate: '2026-10-24' }]), [{ kind: 'GAP', previousPeriod: '2026-09', nextPeriod: '2026-10',
    previousEndDate: '2026-09-22', nextStartDate: '2026-09-25', from: '2026-09-23', to: '2026-09-24', days: 2 }])
  // نفس الشهر بحدود مختلفة متداخلة.
  const same = issues([{ period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22' }, { period: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }])
  assert.equal(same.length, 1); assert.equal(same[0].kind, 'OVERLAP'); assert.equal(same[0].days, 22)
  // شهر غائب كليًا ليس فجوة اشتقاق (يغطيه تقرير «بلا مسير»).
  assert.deepEqual(issues([{ period: '2026-08', startDate: '2026-07-23', endDate: '2026-08-22' }, { period: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22' }]), [])
})

test('المدخلات غير الصالحة ترفض بخطأ الفترة', () => {
  for (const [period, cycle] of [['2026-13', 23], ['2026-9', 23], ['0000-01', 1], ['2026-09', 0], ['2026-09', 32], ['2026-09', 1.5], ['0001-01', 23]]) {
    assert.throws(() => bounds(period, cycle), PayrollPeriodError, `${period} ${cycle}`)
  }
  assert.throws(() => periodOf('2026-02-30', 23), PayrollPeriodError)
  assert.throws(() => issues([{ period: '2026-09', startDate: '2026-09-22', endDate: '2026-08-23' }]), PayrollPeriodError)
})
