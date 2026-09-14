// مرحلة صفر على أدلة صريحة فقط؛ لا موظفين حقيقيين أو قاعدة بيانات أو إعدادات حية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { buildPayrollInputFacts: build, PayrollInputFactsError, PAYROLL_INPUT_FACTS_VERSION, PAYROLL_INPUT_FACTS_LIMITS } = require('../src/payroll/payroll-input-facts')
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const { PayrollInputFactsDto } = require('../src/payroll/payroll-input-facts.dto')
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const keys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
function salary(basicSalary = '9000', extra = {}) {
  return { basicSalary, housingAllowance: '0', transportAllowance: '0', phoneAllowance: '0', workNatureAllowance: '0', otherAllowance: '0', ...extra }
}
function segment(from = '2026-09-01', to = '2026-09-30', pay = salary(), sourceRef = 'contract:explicit:1') { return { from, to, salary: pay, sourceRef } }
function input(extra = {}) {
  return { periodStart: '2026-09-01', periodEnd: '2026-09-30', hireDate: '2020-01-01', coverageStart: '2026-09-01', coverageEnd: '2026-09-30',
    coverageSourceRef: 'coverage:explicit:1', salarySegments: [segment()], scheduledWorkDates: ['2026-09-01', '2026-09-15', '2026-09-30'], scheduleSourceRef: 'schedule:explicit:1', ...extra }
}
const copy = value => JSON.parse(JSON.stringify(value))
function cycleInput(from, to, extra = {}) {
  return input({ periodStart: from, periodEnd: to, coverageStart: from, coverageEnd: to,
    salarySegments: [segment(from, to)], scheduledWorkDates: from === to ? [from] : [from, to], ...extra })
}
function exact(value) { return new PayrollDecimal(BigInt(value.exact.numerator), BigInt(value.exact.denominator)) }
function text(value) { return exact(value).canonical() }
function equals(value, expected) { assert.equal(exact(value).compare(PayrollDecimal.from(expected)), 0) }
function rejected(action, code) {
  assert.throws(action, error => {
    assert.ok(error instanceof PayrollInputFactsError, `${error?.constructor?.name}: ${error?.message}`)
    if (code) assert.equal(error.code, code)
    assert.ok(error.path.length && error.message.length)
    return true
  })
}

test('explicit six salary facts retain separate monthly equivalents, earned amounts, and full monthly rates', () => {
  const pay = salary('9000', { housingAllowance: '1000', transportAllowance: '500', phoneAllowance: '100', workNatureAllowance: '200', otherAllowance: '300' })
  const result = build(input({ salarySegments: [segment(undefined, undefined, pay)] }), settings)
  assert.equal(result.contractVersion, PAYROLL_INPUT_FACTS_VERSION)
  assert.equal(result.periodEntitlement, 'FULL_MONTHLY_CYCLE')
  assert.equal(result.salaryBasis, 'SINGLE_PAYROLL_PERIOD_SALARY')
  assert.equal(result.referencePeriod, '2026-09')
  assert.equal(result.sourceValidation, 'CALLER_SUPPLIED_UNVERIFIED')
  for (const key of keys) { equals(result.monthlyEquivalent.components[key], pay[key]); equals(result.earnedCalendar30.components[key], pay[key]) }
  equals(result.monthlyEquivalent.allowancesTotal, '2100'); equals(result.monthlyEquivalent.grossSalary, '11100')
  equals(result.rates.monthlyRateBase, '11100'); equals(result.rates.dayRate, '370')
  assert.equal(result.coverage.fullCoverage, true); equals(result.coverage.earnedCalendar30Factor, '1')
  assert.equal(result.settingsUsed.dailyHours, '9'); assert.equal(result.settingsUsed.monthlyDays, 30)
  assert.equal('BASE_SALARY' in result, false); assert.equal('variables' in result, false)
})

test('owner 30-day basis: full cycles of 28, 29, 30, and 31 days all earn one full monthly salary', () => {
  for (const [start, end, count] of [['2026-02-01', '2026-02-28', 28], ['2024-02-01', '2024-02-29', 29], ['2026-09-01', '2026-09-30', 30], ['2026-07-01', '2026-07-31', 31]]) {
    const result = build(input({ periodStart: start, periodEnd: end, coverageStart: start, coverageEnd: end,
      salarySegments: [segment(start, end)], scheduledWorkDates: [start, end] }), settings)
    assert.equal(result.coverage.coveredDays, count); assert.equal(result.coverage.periodDays, count)
    equals(result.earnedCalendar30.grossSalary, '9000'); equals(result.rates.dayRate, '300')
    equals(result.coverage.earnedCalendar30Factor, '1'); equals(result.coverage.calendarCoverageFactor, '1')
  }
})

test('partial coverage divides earned salary by 30 without prorating the day rate or mixing calendar ratio', () => {
  const result = build(input({ periodStart: '2026-07-01', periodEnd: '2026-07-31', hireDate: '2026-07-17', coverageStart: '2026-07-17', coverageEnd: '2026-07-31',
    salarySegments: [segment('2026-07-17', '2026-07-31')], scheduledWorkDates: ['2026-07-01', '2026-07-17', '2026-07-31'] }), settings)
  assert.equal(result.coverage.coveredDays, 15); assert.equal(result.coverage.fullCoverage, false)
  equals(result.monthlyEquivalent.components.basicSalary, '9000'); equals(result.earnedCalendar30.grossSalary, '4500')
  equals(result.rates.dayRate, '300'); equals(result.coverage.earnedCalendar30Factor, '.5')
  assert.deepEqual(result.coverage.calendarCoverageFactor.exact, { numerator: '15', denominator: '31' })
  assert.deepEqual(result.coverage.workingCoverageFactor.exact, { numerator: '2', denominator: '3' })
})

test('partial coverage of 30 days in a 31-day period caps calendar-30 factor at one', () => {
  const result = build(input({ periodStart: '2026-07-01', periodEnd: '2026-07-31', coverageStart: '2026-07-02', coverageEnd: '2026-07-31',
    salarySegments: [segment('2026-07-02', '2026-07-31')], scheduledWorkDates: ['2026-07-01', '2026-07-31'] }), settings)
  assert.equal(result.coverage.fullCoverage, false); equals(result.coverage.earnedCalendar30Factor, '1')
  equals(result.earnedCalendar30.grossSalary, '9000')
  assert.deepEqual(result.coverage.calendarCoverageFactor.exact, { numerator: '30', denominator: '31' })
})

test('راتب سبتمبر10000 يسري على دورة23أغسطس إلى22سبتمبر كاملة دون وزن يومي', () => {
  const result = build(cycleInput('2026-08-23', '2026-09-22', {
    salarySegments: [segment('2026-08-23', '2026-09-22', salary('10000'), 'salary:2026-09')],
  }), { ...settings, cycleStartDay: 23 })
  assert.equal(result.referencePeriod, '2026-09'); assert.equal(result.salaryBasis, 'SINGLE_PAYROLL_PERIOD_SALARY')
  equals(result.monthlyEquivalent.components.basicSalary, '10000'); equals(result.earnedCalendar30.grossSalary, '10000')
  assert.deepEqual(result.rates.dayRate.exact, { numerator: '1000', denominator: '3' })
  assert.equal(result.segments.length, 1); assert.equal(result.segments[0].segmentCalendarDays, 31)
  equals(result.segments[0].calendarWeight, '1'); equals(result.segments[0].monthlyContribution.basicSalary, '10000')
})

test('تغير مكوّن راتب داخل الدورة لا يسمح بإعادة المتوسط حتى مع تغطية متصلة وصحيحة', () => {
  for (const key of keys) {
    const second = salary(); second[key] = '12000'
    rejected(() => build(cycleInput('2026-08-23', '2026-09-22', { salarySegments: [
      segment('2026-08-23', '2026-08-31', salary(), 'salary:old'),
      segment('2026-09-01', '2026-09-22', second, 'salary:new'),
    ] }), { ...settings, cycleStartDay: 23 }), 'INPUT_FACTS_MONTHLY_SALARY_REQUIRED')
  }
  rejected(() => build(input({ hireDate: '2026-09-16', coverageStart: '2026-09-16',
    salarySegments: [segment('2026-09-16', '2026-09-20'), segment('2026-09-21', '2026-09-30')] }), settings), 'INPUT_FACTS_MONTHLY_SALARY_REQUIRED')
})

test('rates use BASIC or GROSS monthly equivalent independent of earned calendar amount', () => {
  const facts = input({ coverageStart: '2026-09-16', salarySegments: [segment('2026-09-16', '2026-09-30', salary('9000', { phoneAllowance: '900', workNatureAllowance: '900' }))] })
  const basic = build(facts, { ...settings, rateBase: 'BASIC' }), gross = build(facts, settings)
  equals(basic.rates.dayRate, '300'); equals(gross.rates.dayRate, '360')
  equals(basic.earnedCalendar30.grossSalary, '5400'); equals(gross.earnedCalendar30.grossSalary, '5400')
})

test('راتب الشهر الدقيق يحتفظ بكسور سعر اليوم وتناسب الخدمة دون الاعتماد على تقريب العرض', () => {
  const facts = input({ coverageStart: '2026-09-30', salarySegments: [segment('2026-09-30', '2026-09-30', salary('0.01'), 'one-cent')] })
  const result = build(facts, settings)
  assert.deepEqual(result.monthlyEquivalent.components.basicSalary.exact, { numerator: '1', denominator: '100' })
  assert.equal(result.monthlyEquivalent.components.basicSalary.rawValue6, '0.010000')
  assert.deepEqual(result.earnedCalendar30.components.basicSalary.exact, { numerator: '1', denominator: '3000' })
  assert.deepEqual(result.rates.dayRate.exact, { numerator: '1', denominator: '3000' })
  assert.deepEqual(result.rates.minuteRate.exact, { numerator: '1', denominator: '1620000' })
})

test('large SQL-decimal salaries beyond Number precision retain exact cents and sums', () => {
  const huge = '9007199254740991.91', result = build(input({ salarySegments: [segment(undefined, undefined, salary(huge, { phoneAllowance: '0.09' }))] }), settings)
  equals(result.monthlyEquivalent.components.basicSalary, huge)
  equals(result.monthlyEquivalent.grossSalary, '9007199254740992')
  equals(result.earnedCalendar30.grossSalary, '9007199254740992')
  assert.equal(exact(result.rates.dayRate).multiply(PayrollDecimal.from('30')).canonical(), '9007199254740992')
})

test('working ratios use the full supplied period schedule while the monthly source records calendar and work counts', () => {
  const result = build(input({ coverageStart: '2026-09-16', scheduledWorkDates: ['2026-09-01', '2026-09-10', '2026-09-16', '2026-09-21'],
    salarySegments: [segment('2026-09-16', '2026-09-30')] }), settings)
  assert.equal(result.coverage.periodScheduledDays, 4); assert.equal(result.coverage.coveredScheduledDays, 2)
  equals(result.coverage.workingCoverageFactor, '.5')
  assert.deepEqual(result.segments.map(s => [s.segmentCalendarDays, s.segmentScheduledDays]), [[15, 2]])
  assert.equal('earnedWorking' in result, false)
})

test('empty schedule yields explicit unavailable working ratio and warning without inventing calendar workdays', () => {
  for (const coverageStart of ['2026-09-01', '2026-09-16']) {
    const result = build(input({ coverageStart, salarySegments: [segment(coverageStart, '2026-09-30')], scheduledWorkDates: [] }), settings)
    assert.equal(result.coverage.workingCoverageFactor, null)
    assert.equal(result.coverage.periodScheduledDays, 0); assert.equal(result.coverage.coveredScheduledDays, 0)
    assert.equal(result.warnings[0].code, 'NO_SCHEDULED_WORK_DAYS')
    equals(result.rates.dayRate, '300')
  }
})

test('a real zero working ratio is distinct from unavailable denominator', () => {
  const result = build(input({ coverageStart: '2026-09-16', salarySegments: [segment('2026-09-16', '2026-09-30')], scheduledWorkDates: ['2026-09-01'] }), settings)
  equals(result.coverage.workingCoverageFactor, '0'); assert.deepEqual(result.warnings, [])
  equals(result.earnedCalendar30.grossSalary, '4500')
})

test('zero salary is explicit and valid; none of the six components is implicitly filled', () => {
  const result = build(input({ salarySegments: [segment(undefined, undefined, salary('0'))] }), settings)
  for (const key of keys) equals(result.monthlyEquivalent.components[key], '0')
  equals(result.rates.minuteRate, '0')
  for (const key of keys) {
    const request = input(); delete request.salarySegments[0].salary[key]
    rejected(() => build(request, settings), 'INPUT_FACTS_FIELD_REQUIRED')
  }
})

test('nonempty explicit source references are mandatory and remain opaque caller claims', () => {
  for (const key of ['coverageSourceRef', 'scheduleSourceRef']) for (const value of [null, '', '  ', 'x'.repeat(201)]) rejected(() => build(input({ [key]: value }), settings), 'INPUT_FACTS_SOURCE_REQUIRED')
  for (const value of [null, '', ' ', 'x'.repeat(201)]) rejected(() => build(input({ salarySegments: [segment(undefined, undefined, salary(), value)] }), settings), 'INPUT_FACTS_SOURCE_REQUIRED')
  const result = build(input({ coverageSourceRef: '  external:unverified  ', scheduleSourceRef: 'https://example.invalid/no-read' }), settings)
  assert.equal(result.normalizedInput.coverageSourceRef, 'external:unverified')
  assert.equal(result.normalizedInput.scheduleSourceRef, 'https://example.invalid/no-read')
  assert.equal(result.sourceValidation, 'CALLER_SUPPLIED_UNVERIFIED')
})

test('invalid and nonexistent dates, time suffixes, missing hire date, and reverse periods are rejected', () => {
  for (const bad of ['2026-02-29', '2026-09-31', '2026-2-01', '2026-09-01T00:00:00Z', '0000-01-01', '']) rejected(() => build(input({ hireDate: bad }), settings), 'INPUT_FACTS_DATE_INVALID')
  const missing = input(); delete missing.hireDate
  rejected(() => build(missing, settings), 'INPUT_FACTS_FIELD_REQUIRED')
  rejected(() => build(input({ periodStart: '2026-10-01' }), settings), 'INPUT_FACTS_PERIOD_INVALID')
})

test('coverage must be nonempty, within period, and on or after the actual hire date', () => {
  for (const changes of [{ coverageStart: '2026-08-31' }, { coverageEnd: '2026-10-01' }, { coverageStart: '2026-09-20', coverageEnd: '2026-09-19' }, { hireDate: '2026-09-02' }]) rejected(() => build(input(changes), settings), 'INPUT_FACTS_COVERAGE_INVALID')
})

test('segments cannot invent salaries outside service coverage or reverse date ranges', () => {
  for (const s of [segment('2026-08-31', '2026-09-30'), segment('2026-09-01', '2026-10-01'), segment('2026-09-10', '2026-09-09')]) rejected(() => build(input({ salarySegments: [s] }), settings), 'INPUT_FACTS_SEGMENT_RANGE')
  rejected(() => build(input({ hireDate: '2026-09-16', coverageStart: '2026-09-16' }), settings), 'INPUT_FACTS_SEGMENT_RANGE')
})

test('مصدر راتب الشهر الواحد يغطي الخدمة كاملة ويرفض غياب القيمة أو تعددها ولو كانت القيم متساوية', () => {
  for (const segments of [[segment('2026-09-02', '2026-09-30')], [segment('2026-09-01', '2026-09-29')]]) rejected(() => build(input({ salarySegments: segments }), settings), 'INPUT_FACTS_SEGMENT_COVERAGE')
  for (const segments of [[], [segment('2026-09-01', '2026-09-10'), segment('2026-09-12', '2026-09-30')], [segment('2026-09-01', '2026-09-20'), segment('2026-09-20', '2026-09-30')], [segment(), segment()]]) rejected(() => build(input({ salarySegments: segments }), settings), 'INPUT_FACTS_MONTHLY_SALARY_REQUIRED')
})

test('schedule duplicates, days outside period, malformed dates, and omitted complete schedule are rejected', () => {
  for (const scheduledWorkDates of [['2026-09-01', '2026-09-01'], ['2026-08-31'], ['2026-10-01']]) rejected(() => build(input({ scheduledWorkDates }), settings), 'INPUT_FACTS_SCHEDULE_INVALID')
  rejected(() => build(input({ scheduledWorkDates: ['2026-09-31'] }), settings), 'INPUT_FACTS_DATE_INVALID')
  const missing = input(); delete missing.scheduledWorkDates
  rejected(() => build(missing, settings), 'INPUT_FACTS_FIELD_REQUIRED')
})

test('salary values reject null, binary numbers, signs, exponents, nonfinite and precision loss', () => {
  for (const value of [null, 9000, NaN, Infinity, '-1', '+1', '1e2', '', ' 1', '1.001', '10000000000000000', '9'.repeat(61)]) rejected(() => build(input({ salarySegments: [segment(undefined, undefined, salary(value))] }), settings))
  const result = build(input({ salarySegments: [segment(undefined, undefined, salary('0009000.0000'))] }), settings)
  assert.equal(result.normalizedInput.salarySegments[0].salary.basicSalary, '9000')
})

test('frozen settings require complete valid values and stage zero rejects unsupported half-month and long periods', () => {
  for (const patch of [{ dailyHours: 0 }, { dailyHours: .001 }, { monthlyDays: 31 }, { currency: 'USD' }, { rateBase: 'FORMULA' }]) rejected(() => build(input(), { ...settings, ...patch }), 'INPUT_FACTS_SETTINGS_INVALID')
  const missing = { ...settings }; delete missing.dailyHours
  rejected(() => build(input(), missing), 'INPUT_FACTS_FIELD_REQUIRED')
  rejected(() => build(input(), { ...settings, defaultPeriodType: 'SEMI_MONTHLY', cycleStartDay: 1 }), 'INPUT_FACTS_PERIOD_UNSUPPORTED')
  rejected(() => build(input({ periodEnd: '2026-10-03' }), settings), 'INPUT_FACTS_PERIOD_UNSUPPORTED')
})

test('an explicitly configured short 5-to-20 monthly cycle qualifies while arbitrary short periods are rejected', () => {
  const short = input({ periodStart: '2026-09-05', periodEnd: '2026-09-20', coverageStart: '2026-09-05', coverageEnd: '2026-09-20', salarySegments: [segment('2026-09-05', '2026-09-20')], scheduledWorkDates: ['2026-09-05'] })
  const cycle = { ...settings, cycleStartDay: 5, cycleEndMode: 'FIXED_DAY', cycleEndDay: 20 }
  const result = build(short, cycle)
  assert.equal(result.coverage.periodDays, 16); equals(result.earnedCalendar30.grossSalary, '9000')
  assert.equal(result.periodEntitlement, 'FULL_MONTHLY_CYCLE')
  rejected(() => build(short, settings), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
  const single = input({ periodStart: '2026-09-10', periodEnd: '2026-09-10', coverageStart: '2026-09-10', coverageEnd: '2026-09-10', salarySegments: [segment('2026-09-10', '2026-09-10')], scheduledWorkDates: ['2026-09-10'] })
  rejected(() => build(single, settings), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
  rejected(() => build(single, cycle), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('PR-08 calendar month requires the first and last actual calendar dates', () => {
  const calendar = { ...settings, defaultPeriodType: 'CALENDAR_MONTH' }
  for (const [from, to] of [['2026-02-01', '2026-02-28'], ['2024-02-01', '2024-02-29'], ['2026-06-01', '2026-06-30'], ['2026-07-01', '2026-07-31']]) {
    assert.equal(build(cycleInput(from, to), calendar).normalizedInput.periodEnd, to)
  }
  for (const [from, to] of [['2026-06-02', '2026-06-30'], ['2026-06-01', '2026-06-29'], ['2026-05-23', '2026-06-22']]) rejected(() => build(cycleInput(from, to), calendar), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('PR-08 derived and fixed 23-to-22 use end month as reference and reject matching-length shifted periods', () => {
  for (const cycle of [{ ...settings, cycleStartDay: 23 }, { ...settings, cycleStartDay: 23, cycleEndMode: 'FIXED_DAY', cycleEndDay: 22 }]) {
    const result = build(cycleInput('2026-07-23', '2026-08-22'), cycle)
    assert.equal(result.coverage.periodDays, 31)
    assert.deepEqual(result.settingsUsed, { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23,
      cycleEndMode: cycle.cycleEndMode, cycleEndDay: cycle.cycleEndDay, monthlyDays: 30, dailyHours: '9', rateBase: 'GROSS' })
    rejected(() => build(cycleInput('2026-07-22', '2026-08-21'), cycle), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
    rejected(() => build(cycleInput('2026-08-01', '2026-08-31'), cycle), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
  }
})

test('PR-08 start/end clamping is independent for leap February and 30-day source months', () => {
  for (const mode of ['DERIVED', 'FIXED_DAY']) {
    const cycle = { ...settings, cycleStartDay: 31, cycleEndMode: mode, cycleEndDay: mode === 'DERIVED' ? null : 30 }
    for (const [from, to] of [['2026-01-31', '2026-02-28'], ['2024-01-31', '2024-02-29'], ['2026-02-28', '2026-03-30'], ['2024-02-29', '2024-03-30'], ['2026-04-30', '2026-05-30']]) {
      const result = build(cycleInput(from, to), cycle)
      assert.equal(result.normalizedInput.periodStart, from); assert.equal(result.normalizedInput.periodEnd, to)
      equals(result.earnedCalendar30.grossSalary, '9000')
    }
    rejected(() => build(cycleInput('2026-02-28', '2026-03-28'), cycle), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
  }
})

test('PR-08 crossing decision uses configured numbers before clamping, including a collapsed in-month February cycle', () => {
  const inMonth = { ...settings, cycleStartDay: 30, cycleEndMode: 'FIXED_DAY', cycleEndDay: 31 }
  const result = build(cycleInput('2026-02-28', '2026-02-28'), inMonth)
  assert.equal(result.coverage.periodDays, 1)
  assert.equal(result.settingsUsed.cycleStartDay, 30); assert.equal(result.settingsUsed.cycleEndDay, 31)
  const crossing = { ...settings, cycleStartDay: 31, cycleEndMode: 'FIXED_DAY', cycleEndDay: 30 }
  rejected(() => build(cycleInput('2026-02-28', '2026-02-28'), crossing), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
  assert.equal(build(cycleInput('2026-01-31', '2026-02-28'), crossing).coverage.periodDays, 29)
})

test('PR-08 year crossing follows the end-month reference without changing the calendar entitlement basis', () => {
  const result = build(cycleInput('2025-12-23', '2026-01-22'), { ...settings, cycleStartDay: 23 })
  assert.equal(result.coverage.periodDays, 31)
  equals(result.rates.dayRate, '300'); equals(result.earnedCalendar30.grossSalary, '9000')
  rejected(() => build(cycleInput('2026-01-23', '2026-02-21'), { ...settings, cycleStartDay: 23 }), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('PR-08 date generation preserves years 0001 through 0099 and refuses a previous-year underflow', () => {
  for (const [from, to] of [['0001-01-01', '0001-01-31'], ['0099-02-01', '0099-02-28'], ['9999-12-01', '9999-12-31']]) {
    const result = build(cycleInput(from, to, { hireDate: '0001-01-01' }), settings)
    assert.equal(result.normalizedInput.periodStart, from); assert.equal(result.normalizedInput.periodEnd, to)
  }
  assert.equal(build(cycleInput('0099-12-23', '0100-01-22', { hireDate: '0001-01-01' }), { ...settings, cycleStartDay: 23 }).coverage.periodDays, 31)
  rejected(() => build(cycleInput('0001-01-01', '0001-01-22', { hireDate: '0001-01-01' }), { ...settings, cycleStartDay: 23 }), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('Gregorian century leap rules generate 2000 February 29 and 2100 February 28 without Date.UTC shortcuts', () => {
  for (const [from, to] of [['2000-02-01', '2000-02-29'], ['2100-02-01', '2100-02-28']]) assert.equal(build(cycleInput(from, to, { hireDate: '1990-01-01' }), settings).normalizedInput.periodEnd, to)
  rejected(() => build(cycleInput('2000-02-01', '2000-02-28', { hireDate: '1990-01-01' }), settings), 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('الدورة الشاملة تسمح32تاريخًا مع راتب واحد وترفض اليوم33وتعدد قيم الراتب', () => {
  const date = index => new Date(Date.parse('2026-07-05T00:00:00.000Z') + index * 86400000).toISOString().slice(0, 10)
  const scheduledWorkDates = Array.from({ length: 32 }, (_, index) => date(index))
  const salarySegments = [segment('2026-07-05', '2026-08-05', salary('9999999999999999.99'), 'salary:2026-08')]
  const facts = input({ periodStart: '2026-07-05', periodEnd: '2026-08-05', coverageStart: '2026-07-05', coverageEnd: '2026-08-05', salarySegments, scheduledWorkDates })
  const cycle = { ...settings, cycleStartDay: 5, cycleEndMode: 'FIXED_DAY', cycleEndDay: 5, dailyHours: .01 }
  const result = build(facts, cycle)
  assert.equal(result.coverage.periodDays, 32); assert.equal(result.segments.length, 1); assert.equal(result.coverage.coveredScheduledDays, 32)
  equals(result.coverage.earnedCalendar30Factor, '1')
  assert.equal(result.rates.minuteRate.exact.denominator.length > 0, true)
  assert.equal(PAYROLL_INPUT_FACTS_LIMITS.salarySegments, 1)
  assert.deepEqual(validateSync(plainToInstance(PayrollInputFactsDto, facts), { whitelist: true, forbidNonWhitelisted: true }), [])
  rejected(() => build({ ...facts, salarySegments: Array(33).fill(salarySegments[0]) }, cycle), 'INPUT_FACTS_MONTHLY_SALARY_REQUIRED')
  rejected(() => build({ ...facts, scheduledWorkDates: [...scheduledWorkDates, scheduledWorkDates[0]] }, cycle), 'INPUT_FACTS_COLLECTION_LIMIT')
})

test('canonical normalization sorts data and equivalent decimals without mutating or borrowing input references', () => {
  const facts = input({ scheduledWorkDates: ['2026-09-30', '2026-09-01', '2026-09-15'], salarySegments: [segment(undefined, undefined, salary('09000.00'), 'salary:2026-09')] })
  const before = JSON.stringify(facts), result = build(facts, settings)
  assert.equal(JSON.stringify(facts), before)
  assert.deepEqual(result.normalizedInput.scheduledWorkDates, ['2026-09-01', '2026-09-15', '2026-09-30'])
  assert.equal(result.normalizedInput.salarySegments[0].salary.basicSalary, '9000')
  const canonical = copy(facts); canonical.scheduledWorkDates.sort()
  canonical.salarySegments[0].salary.basicSalary = '9000'
  assert.equal(JSON.stringify(build(canonical, settings)), JSON.stringify(result))
  assert.ok(Object.isFrozen(result.normalizedInput.salarySegments[0].salary))
  facts.salarySegments[0].salary.basicSalary = '1'
  equals(result.monthlyEquivalent.components.basicSalary, '9000')
})

test('own-property guards reject unknown fields, accessors, inherited required values, and sparse arrays without invoking code', () => {
  let called = false
  const accessor = input(); Object.defineProperty(accessor.salarySegments[0].salary, 'basicSalary', { get() { called = true; return '999' } })
  rejected(() => build(accessor, settings), 'INPUT_FACTS_SHAPE_INVALID'); assert.equal(called, false)
  const root = input(); Object.defineProperty(root, 'hireDate', { get() { called = true; return '2020-01-01' } })
  rejected(() => build(root, settings), 'INPUT_FACTS_SHAPE_INVALID'); assert.equal(called, false)
  const badSettings = { ...settings }; Object.defineProperty(badSettings, 'dailyHours', { get() { called = true; return 9 } })
  rejected(() => build(input(), badSettings), 'INPUT_FACTS_SHAPE_INVALID'); assert.equal(called, false)
  rejected(() => build({ ...input(), employeeId: 1 }, settings), 'INPUT_FACTS_FIELD_UNKNOWN')
  const inherited = Object.assign(Object.create({ hireDate: '2020-01-01' }), input()); delete inherited.hireDate
  rejected(() => build(inherited, settings), 'INPUT_FACTS_SHAPE_INVALID')
  const customPrototype = Object.create(null)
  Object.defineProperty(customPrototype, 'unused', { get() { called = true; return 'bad' } })
  rejected(() => build(Object.assign(Object.create(customPrototype), input()), settings), 'INPUT_FACTS_SHAPE_INVALID')
  const inheritedArray = ['2026-09-01']; Object.setPrototypeOf(inheritedArray, customPrototype)
  rejected(() => build(input({ scheduledWorkDates: inheritedArray }), settings), 'INPUT_FACTS_SHAPE_INVALID')
  assert.equal(called, false)
  rejected(() => build(input({ scheduledWorkDates: Array(1) }), settings), 'INPUT_FACTS_SHAPE_INVALID')
  const extra = ['2026-09-01']; extra.other = 1
  rejected(() => build(input({ scheduledWorkDates: extra }), settings), 'INPUT_FACTS_SHAPE_INVALID')
})

test('strict nested DTO accepts the agreed input and rejects null salaries, strings-as-arrays, and non-string salary numbers', () => {
  assert.deepEqual(validateSync(plainToInstance(PayrollInputFactsDto, input()), { whitelist: true, forbidNonWhitelisted: true }), [])
  for (const facts of [input({ salarySegments: null }), input({ scheduledWorkDates: '2026-09-01' }), input({ salarySegments: [segment(undefined, undefined, salary(9000))] })]) {
    assert.ok(validateSync(plainToInstance(PayrollInputFactsDto, facts), { whitelist: true, forbidNonWhitelisted: true }).length)
  }
  const instance = plainToInstance(PayrollInputFactsDto, input())
  rejected(() => build(instance, settings), 'INPUT_FACTS_SHAPE_INVALID')
  assert.equal(build(copy(instance), settings).coverage.coveredDays, 30)
})

test('JSON-safe exact fractions make repeated output deterministic without BigInt, rates or employee history mutation', () => {
  const facts = input(), before = JSON.stringify(settings), serialized = JSON.stringify(build(facts, settings))
  assert.equal(JSON.parse(serialized).rates.minuteRate.exact.numerator, '5')
  assert.equal(JSON.parse(serialized).rates.minuteRate.exact.denominator, '9')
  for (let index = 0; index < 40; index++) assert.equal(JSON.stringify(build(copy(facts), { ...settings })), serialized)
  assert.equal(JSON.stringify(settings), before)
})
