// حساب صرف متاح من قيم صريحة فقط؛ لا قاعدة بيانات أو دفتر حي.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { computePayrollInstallmentBudget: compute, PayrollInstallmentBudgetError, PAYROLL_INSTALLMENT_BUDGET_VERSION } = require('../src/payroll/payroll-installment-budget')

const settings = {
  defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR',
}
function input(netBeforeLoans = '900', earnedFixedGross = '1000', capConsumed = '0') {
  return { netBeforeLoans, earnedFixedGross, capConsumed, sourceRefs: { netBeforeLoans: 'net:explicit:1', earnedFixedGross: 'earned:fixed:1', capConsumed: 'deductions:upstream:1' } }
}
const run = (values = input(), patch = {}) => compute({ ...settings, ...patch }, values)
const fraction = (numerator, denominator = '1') => ({ numerator, denominator })
function exact(actual, numerator, denominator = '1') { assert.deepEqual(actual.exact, fraction(numerator, denominator)) }
function rejected(fn, suffix, errorPath) {
  assert.throws(fn, error => {
    assert.ok(error instanceof PayrollInstallmentBudgetError, String(error))
    if (suffix) assert.equal(error.code, `INSTALLMENT_BUDGET_${suffix}`, error.message)
    if (errorPath) assert.equal(error.path, errorPath)
    return true
  })
}
const centString = cents => { const text = cents.toString().padStart(3, '0'); return `${text.slice(0, -2)}.${text.slice(-2)}` }

test('AD-12 net 900 and floor 500 leaves 400 without allocating an installment', () => {
  const result = run(input(), { minNetGuarantee: 500 })
  exact(result.floorExact, '500'); exact(result.cashCapacityExact, '400'); exact(result.availableExact, '400')
  assert.equal(result.availableBudget, '400.00'); exact(result.unusedFraction, '0')
  assert.equal(result.capLimitExact, null); assert.equal(result.capCapacityExact, null)
  assert.deepEqual(result.warnings, [])
  assert.equal('paidAmount' in result, false); assert.equal('netPay' in result, false)
})

test('DD-11 earned 11750 at 50 percent less consumed 3320 leaves 2555', () => {
  const result = run(input('8430', '11750', '3320'), { maxDeductionPctOfGross: 50 })
  exact(result.capLimitExact, '5875'); exact(result.capCapacityExact, '2555'); exact(result.cashCapacityExact, '8430')
  assert.equal(result.availableBudget, '2555.00')
  assert.equal(result.trace.capConsumedStage, 'CALLER_DECLARED_AFTER_EXEMPTIONS_ATTENDANCE_AND_STATUTORY')
  assert.equal(result.trace.capConsumedSourceRef, 'deductions:upstream:1')
})

test('null floors and cap stay disabled rather than assuming 50 percent', () => {
  const result = run(input('1000', '1000', '999999'))
  exact(result.floorExact, '0'); assert.equal(result.capLimitExact, null); assert.equal(result.capCapacityExact, null)
  assert.equal(result.availableBudget, '1000.00'); assert.deepEqual(result.warnings, [])
  assert.deepEqual(result.trace.settingsUsed, { minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null })
})

test('zero percent cap is enabled and leaves no capacity while zero floor is valid', () => {
  const result = run(input(), { minNetGuarantee: 0, netFloorPct: 0, maxDeductionPctOfGross: 0 })
  exact(result.floorExact, '0'); exact(result.capLimitExact, '0'); exact(result.capCapacityExact, '0')
  assert.equal(result.availableBudget, '0.00'); assert.deepEqual(result.warnings, [])
})

test('percentage floor and cap use earned fixed gross independent of cash including extras', () => {
  const result = run(input('5000', '1000'), { netFloorPct: 100, maxDeductionPctOfGross: 100, rateBase: 'BASIC' })
  exact(result.floorExact, '1000'); exact(result.cashCapacityExact, '4000'); exact(result.capLimitExact, '1000')
  assert.equal(result.availableBudget, '1000.00')
  assert.equal(result.trace.floorBasis, 'EARNED_FIXED_GROSS'); assert.equal(result.trace.capBasis, 'EARNED_FIXED_GROSS')
  assert.equal(result.trace.basisSourceRef, 'earned:fixed:1')
})

test('absolute and percentage floors combine by maximum before capacity calculation', () => {
  const absolute = run(input(), { minNetGuarantee: 500, netFloorPct: 40 })
  const percent = run(input(), { minNetGuarantee: 300, netFloorPct: 50 })
  exact(absolute.floorExact, '500'); exact(percent.floorExact, '500')
  assert.equal(absolute.availableBudget, '400.00'); assert.equal(percent.availableBudget, '400.00')
})

test('cash and cap capacities intersect instead of taking their maximum', () => {
  const cashLimited = run(input('900', '1000'), { minNetGuarantee: 500, maxDeductionPctOfGross: 90 })
  const capLimited = run(input('900', '1000'), { minNetGuarantee: 100, maxDeductionPctOfGross: 30 })
  exact(cashLimited.cashCapacityExact, '400'); exact(cashLimited.capCapacityExact, '900')
  exact(capLimited.cashCapacityExact, '800'); exact(capLimited.capCapacityExact, '300')
  assert.equal(cashLimited.availableBudget, '400.00'); assert.equal(capLimited.availableBudget, '300.00')
})

test('available cash always floors to cents regardless of policy currency rounding mode and scale', () => {
  for (const roundingMode of ['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL']) {
    for (const roundingScale of [0, 2, 6]) {
      const result = run(input('1.999999'), { roundingMode, roundingScale })
      assert.equal(result.availableBudget, '1.99'); exact(result.availableExact, '1999999', '1000000')
      exact(result.unusedFraction, '9999', '1000000')
      assert.deepEqual(result.trace.budgetRounding, { mode: 'FLOOR', scale: 2 })
    }
  }
})

test('cash already below floor stays unchanged in input and produces zero capacity with warning', () => {
  const result = run(input('400'), { minNetGuarantee: 500 })
  assert.equal(result.normalizedInput.netBeforeLoans, '400'); assert.equal(result.availableBudget, '0.00')
  exact(result.cashCapacityExact, '0')
  assert.deepEqual(result.warnings.map(row => [row.code, row.path]), [['NET_ALREADY_BELOW_FLOOR', 'netBeforeLoans']])
})

test('negative cash creates neither negative capacity nor a fictional floor payment', () => {
  const result = run(input('-12.123456'), { minNetGuarantee: 500 })
  assert.equal(result.normalizedInput.netBeforeLoans, '-12.123456')
  assert.equal(result.availableBudget, '0.00'); exact(result.availableExact, '0'); exact(result.unusedFraction, '0')
  assert.deepEqual(result.warnings.map(row => row.code), ['NET_ALREADY_BELOW_FLOOR'])
})

test('already excessive cap consumption warns but does not refund prior deductions', () => {
  const result = run(input('900', '1000', '501'), { maxDeductionPctOfGross: 50 })
  exact(result.capLimitExact, '500'); exact(result.capCapacityExact, '0')
  assert.equal(result.availableBudget, '0.00'); assert.equal(result.normalizedInput.capConsumed, '501')
  assert.deepEqual(result.warnings.map(row => [row.code, row.path]), [['CAP_ALREADY_EXCEEDED', 'capConsumed']])
})

test('simultaneous floor and cap violations emit deterministic warnings in both currencies', () => {
  for (const currency of ['SAR', 'EGP']) {
    const result = run(input('-1', '0', '1'), { minNetGuarantee: 1, maxDeductionPctOfGross: 0, currency })
    assert.equal(result.availableBudget, '0.00')
    assert.deepEqual(result.warnings.map(row => row.code), ['NET_ALREADY_BELOW_FLOOR', 'CAP_ALREADY_EXCEEDED'])
  }
})

test('exactly exhausted floor and cap boundaries are not reported as prior violations', () => {
  const result = run(input('500', '1000', '500'), { minNetGuarantee: 500, maxDeductionPctOfGross: 50 })
  assert.equal(result.availableBudget, '0.00'); assert.deepEqual(result.warnings, [])
  const zero = run(input('0', '0', '0'), { netFloorPct: 100, maxDeductionPctOfGross: 100 })
  assert.equal(zero.availableBudget, '0.00'); assert.deepEqual(zero.warnings, [])
})

test('fractional floor remains exact and only final available money floors to cents', () => {
  const result = run(input('1', '1'), { netFloorPct: 33.3333 })
  exact(result.floorExact, '333333', '1000000'); exact(result.availableExact, '666667', '1000000')
  assert.equal(result.availableBudget, '0.66'); exact(result.unusedFraction, '6667', '1000000')
  const tiny = run(input('1', '0.01'), { maxDeductionPctOfGross: 0.0001 })
  assert.equal(tiny.capLimitExact.rawValue6, '0.000000')
  exact(tiny.capLimitExact, '1', '100000000'); exact(tiny.unusedFraction, '1', '100000000')
  assert.equal(tiny.availableBudget, '0.00')
})

test('unsafe integer money and all sixty input digits remain exact without Number conversion', () => {
  const result = run(input('9007199254740993.123456', '9007199254740993.123456'), { maxDeductionPctOfGross: 50 })
  assert.equal(result.capLimitExact.rawValue6, '4503599627370496.561728')
  assert.equal(result.availableBudget, '4503599627370496.56'); exact(result.unusedFraction, '27', '15625')
  const large = `${'9'.repeat(54)}.999999`, numerator = '9'.repeat(60)
  const largest = run(input(large, large), { maxDeductionPctOfGross: 0.0001 })
  exact(largest.capLimitExact, numerator, '1000000000000')
  assert.equal(largest.availableBudget, centString(BigInt(numerator) / 10000000000n))
})

test('normalized results are detached, deeply frozen, JSON safe and deterministic', () => {
  const values = input('000900.000000', '001000.000000', '-0.000000')
  values.sourceRefs.netBeforeLoans = ' net:trimmed '
  const result = run(values), repeat = run(values)
  assert.equal(result.engineVersion, PAYROLL_INSTALLMENT_BUDGET_VERSION); assert.equal(result.sourceValidation, 'CALLER_UNVERIFIED')
  assert.equal(result.normalizedInput.netBeforeLoans, '900'); assert.equal(result.normalizedInput.earnedFixedGross, '1000')
  assert.equal(result.normalizedInput.capConsumed, '0'); assert.equal(result.normalizedInput.sourceRefs.netBeforeLoans, 'net:trimmed')
  assert.deepEqual(result, repeat); assert.doesNotThrow(() => JSON.stringify(result))
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.normalizedInput.sourceRefs)); assert.ok(Object.isFrozen(result.availableExact.exact))
  assert.equal(Object.isFrozen(values), false)
  values.sourceRefs.netBeforeLoans = 'changed'; values.netBeforeLoans = '0'
  assert.equal(result.normalizedInput.sourceRefs.netBeforeLoans, 'net:trimmed'); assert.equal(result.normalizedInput.netBeforeLoans, '900')
  const nullPrototype = Object.assign(Object.create(null), input())
  nullPrototype.sourceRefs = Object.assign(Object.create(null), nullPrototype.sourceRefs)
  assert.equal(run(nullPrototype).availableBudget, '900.00')
})

test('numeric JSON, nondecimal text, overprecision, oversized and negative unsigned money fail closed', () => {
  for (const key of ['netBeforeLoans', 'earnedFixedGross', 'capConsumed']) {
    for (const value of [1, 0.1, NaN, Infinity, null, undefined, true, {}, [], '', ' ', '1e3', 'NaN', 'Infinity', '0x10', '+1', '.1', '1.', ' 1', '1 ', '1.0000000', '0.0000001', '9'.repeat(61)]) {
      const values = input(); values[key] = value
      rejected(() => run(values), 'INPUT_INVALID', key)
    }
  }
  for (const key of ['earnedFixedGross', 'capConsumed']) {
    const values = input(); values[key] = '-0.000001'
    rejected(() => run(values), 'INPUT_INVALID', key)
  }
})

test('plain shape rejects unknown and inherited fields, accessors, arrays and hidden properties without invoking getters', () => {
  for (const value of [null, [], 'input', new Date(), Object.assign(Object.create({ inherited: true }), input())]) rejected(() => run(value), 'SHAPE_INVALID')
  for (const key of ['__proto__', 'constructor', 'toString', 'extra']) {
    const values = input(); Object.defineProperty(values, key, { value: 'unsafe', enumerable: true })
    rejected(() => run(values), 'FIELD_UNKNOWN')
  }
  const symbol = input(); symbol[Symbol('secret')] = 'x'; rejected(() => run(symbol), 'FIELD_UNKNOWN')
  const absent = input(); delete absent.netBeforeLoans; rejected(() => run(absent), 'FIELD_REQUIRED', 'budget.netBeforeLoans')
  let invoked = 0
  const getter = input(); Object.defineProperty(getter, 'netBeforeLoans', { get() { invoked++; throw Error('must not execute') }, enumerable: true })
  rejected(() => run(getter), 'SHAPE_INVALID', 'budget.netBeforeLoans')
  const nested = input(); Object.defineProperty(nested.sourceRefs, 'capConsumed', { get() { invoked++; throw Error('must not execute') }, enumerable: true })
  rejected(() => run(nested), 'SHAPE_INVALID', 'sourceRefs.capConsumed')
  const hidden = input(); Object.defineProperty(hidden, 'netBeforeLoans', { value: '1', enumerable: false })
  rejected(() => run(hidden), 'SHAPE_INVALID', 'budget.netBeforeLoans')
  assert.equal(invoked, 0)
})

test('all three caller references are mandatory bounded nonempty strings and accept no metadata injection', () => {
  for (const key of ['netBeforeLoans', 'earnedFixedGross', 'capConsumed']) {
    for (const value of ['', '  ', null, 1, {}, 'x'.repeat(201)]) {
      const values = input(); values.sourceRefs[key] = value
      rejected(() => run(values), 'SOURCE_REQUIRED', `sourceRefs.${key}`)
    }
    const missing = input(); delete missing.sourceRefs[key]
    rejected(() => run(missing), 'FIELD_REQUIRED', `sourceRefs.${key}`)
    const maximum = input(); maximum.sourceRefs[key] = 'x'.repeat(200)
    assert.equal(run(maximum).normalizedInput.sourceRefs[key], 'x'.repeat(200))
  }
  const extra = input(); extra.sourceRefs.verified = true; rejected(() => run(extra), 'FIELD_UNKNOWN')
  const inherited = input(); inherited.sourceRefs = Object.create(inherited.sourceRefs); rejected(() => run(inherited), 'SHAPE_INVALID')
})

test('full policy settings are validated without defaults, silent rounding or getter evaluation', () => {
  for (const patch of [{ monthlyDays: 31 }, { minNetGuarantee: -1 }, { minNetGuarantee: 0.001 }, { minNetGuarantee: Infinity },
    { maxDeductionPctOfGross: 101 }, { maxDeductionPctOfGross: -1 }, { maxDeductionPctOfGross: 0.00001 },
    { netFloorPct: '50' }, { netFloorPct: 101 }, { carryOverExcess: 'false' }, { currency: 'USD' }]) rejected(() => run(input(), patch), 'SETTINGS_INVALID', 'settings')
  const incomplete = { ...settings }; delete incomplete.minNetGuarantee
  rejected(() => compute(incomplete, input()), 'FIELD_REQUIRED', 'settings.minNetGuarantee')
  rejected(() => compute({ ...settings, unexpected: 1 }, input()), 'FIELD_UNKNOWN', 'settings')
  let invoked = 0
  const getter = { ...settings }; Object.defineProperty(getter, 'minNetGuarantee', { get() { invoked++; return 500 }, enumerable: true })
  rejected(() => compute(getter, input()), 'SHAPE_INVALID', 'settings.minNetGuarantee'); assert.equal(invoked, 0)
  const inherited = Object.assign(Object.create({ settings: true }), settings)
  rejected(() => compute(inherited, input()), 'SHAPE_INVALID', 'settings')
  assert.equal(run(input('1000'), { minNetGuarantee: 500.01 }).availableBudget, '499.99')
})
