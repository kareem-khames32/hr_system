// اختبارات نقية للشرائح على لقطات صريحة؛ لا حضور حي أو قاعدة بيانات أو مسير.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
const { evaluatePayrollTierValue: evaluate, PayrollTierKernelError, PAYROLL_TIER_KERNEL_LIMITS } = require('../src/payroll/payroll-tier-kernel')
const { compilePayrollFormula: compile, evaluatePayrollFormula: publicFormula, evaluatePayrollFormulaExact: exactFormula, PayrollFormulaError } = require('../src/payroll/payroll-formula-engine')
const d = value => PayrollDecimal.from(String(value))
function rule(from, to, method = 'MULTIPLIER', parameter = '1.5', sequence = 1) {
  return { sequence, fromValue: String(from), toValue: to === null ? null : String(to), method,
    multiplier: method === 'MULTIPLIER' ? parameter : null,
    dayFraction: method === 'DAY_FRACTION' ? parameter : null,
    fixedAmount: method === 'FIXED_AMOUNT' ? parameter : null,
    formula: method === 'FORMULA' ? parameter : null, label: null, isActive: true }
}
function tierSet(overrides = {}) {
  return { code: 'LATE', nameAr: 'شرائح اختبار', description: null, inputVar: 'LATE_MINUTES', inputFormula: null,
    inputUnit: 'MINUTES', applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0,
    graceMaxUsesPerPeriod: null, allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false,
    noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null, maxPeriodDeductionDayFraction: null,
    secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1, roundingMode: null,
    roundingScale: null, isActive: true, tiers: [rule(60, 120), rule(120, null, 'MULTIPLIER', '2', 2)], ...overrides }
}
function context(overrides = {}) {
  return { dayRate: d(540), hourRate: d(60), minuteRate: d(1), variables: {}, components: {}, parameters: {},
    roundingMode: 'HALF_UP', divisionByZeroMode: 'ZERO_WITH_WARNING', ...overrides }
}
function run(input, set = tierSet(), ctx = context()) { return evaluate(set, input instanceof PayrollDecimal ? input : d(input), ctx) }
function money(result, scale = 2, mode = 'HALF_UP') { return result.amount.format(scale, mode) }
function rejected(action, code) {
  assert.throws(action, error => {
    assert.ok(error instanceof PayrollTierKernelError, String(error))
    if (code) assert.equal(error.code, code)
    assert.ok(error.path.length && error.message.length)
    return true
  })
}
const table = [59, 60, 61, 90, 119, 120, 150, 240]

test('LT-03: every WHOLE multiplier reference cell, including inclusive 60 and exclusive 120', () => {
  const expected = ['0.00', '90.00', '91.50', '135.00', '178.50', '240.00', '300.00', '480.00']
  table.forEach((input, index) => assert.equal(money(run(input)), expected[index]))
  assert.equal(run(119).portions[0].tierSequence, 1)
  assert.equal(run(120).portions[0].tierSequence, 2)
})

test('LT-03: every WHOLE day fraction reference cell', () => {
  const set = tierSet({ tiers: [rule(60, 120, 'DAY_FRACTION', '.25'), rule(120, null, 'DAY_FRACTION', '.5', 2)] })
  const expected = ['0.00', '135.00', '135.00', '135.00', '135.00', '270.00', '270.00', '270.00']
  table.forEach((input, index) => assert.equal(money(run(input, set)), expected[index]))
})

test('LT-03: every WHOLE one-for-one reference cell', () => {
  const set = tierSet({ tiers: [rule(60, 120, 'RATE_1_1'), rule(120, null, 'RATE_1_1', null, 2)] })
  const expected = ['0.00', '60.00', '61.00', '90.00', '119.00', '120.00', '150.00', '240.00']
  table.forEach((input, index) => assert.equal(money(run(input, set)), expected[index]))
})

test('LT-08: MARGINAL portions match all four published examples without whole-input leakage', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL' })
  for (const [input, expected] of [[90, '45.00'], [119, '88.50'], [120, '90.00'], [150, '150.00']]) assert.equal(money(run(input, set)), expected)
  assert.deepEqual(run(120, set).portions.filter(p => p.source === 'TIER').map(p => [p.portionValue, p.amountRaw6]), [['60', '90.000000'], ['0', '0.000000']])
  assert.equal(money(run(60, set)), '0.00')
})

test('owner decision: MARGINAL fixed amounts apply fully from 60 and 120, retaining earlier reached tier', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL', tiers: [rule(60, 120, 'FIXED_AMOUNT', '100'), rule(120, null, 'FIXED_AMOUNT', '200', 2)] })
  for (const [input, expected] of [[59, '0.00'], [60, '100.00'], [119, '100.00'], [120, '300.00']]) assert.equal(money(run(input, set)), expected)
  const boundary = run(120, set).portions.at(-1)
  assert.equal(boundary.portionValue, '0'); assert.equal(boundary.amountRaw6, '200.000000')
  assert.equal(money(run(120, { ...set, tierApplicationMode: 'WHOLE' })), '200.00')
})

test('owner decision: MARGINAL day fractions apply fully from each boundary', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL', tiers: [rule(60, 120, 'DAY_FRACTION', '.25'), rule(120, null, 'DAY_FRACTION', '.5', 2)] })
  for (const [input, expected] of [[59, '0.00'], [60, '135.00'], [119, '135.00'], [120, '405.00']]) assert.equal(money(run(input, set)), expected)
})

test('MARGINAL mixed methods retain the rate-based previous portion and charge fixed boundary fully', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL', tiers: [rule(60, 120), rule(120, null, 'FIXED_AMOUNT', '200', 2)] })
  assert.equal(money(run(119, set)), '88.50')
  assert.equal(money(run(120, set)), '290.00')
})

test('zero effective input never charges fixed, fraction, or constant formula at zero under either mode', () => {
  for (const mode of ['WHOLE', 'MARGINAL']) for (const [method, parameter] of [['FIXED_AMOUNT', '100'], ['DAY_FRACTION', '.5'], ['FORMULA', '100']]) {
    const result = run(0, tierSet({ tierApplicationMode: mode, noMatchBehavior: 'BLOCK', tiers: [rule(0, null, method, parameter)] }))
    assert.equal(money(result), '0.00'); assert.deepEqual(result.portions, []); assert.deepEqual(result.warnings, [])
  }
})

test('WHOLE noMatch explicitly distinguishes zero, fallback one-for-one, and block', () => {
  const free = run(45)
  assert.equal(money(free), '0.00'); assert.equal(free.warnings[0].code, 'NO_TIER_MATCH')
  assert.equal(free.portions[0].source, 'NO_MATCH')
  assert.equal(money(run(45, tierSet({ noMatchBehavior: 'FALLBACK_1_1' }))), '45.00')
  rejected(() => run(45, tierSet({ noMatchBehavior: 'BLOCK' })), 'TIER_NO_MATCH')
  assert.equal(money(run(90, tierSet({ noMatchBehavior: 'BLOCK' }))), '135.00')
})

test('MARGINAL unmatched prefix remains a used region after reaching later tiers', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL', noMatchBehavior: 'FALLBACK_1_1' })
  assert.equal(money(run(45, set)), '45.00')
  assert.equal(money(run(90, set)), '105.00')
  assert.deepEqual(run(90, set).portions.map(p => [p.source, p.portionValue]), [['NO_MATCH', '60'], ['TIER', '30']])
  const fixed = { ...set, tiers: [rule(60, null, 'FIXED_AMOUNT', '100')] }
  assert.equal(money(run(60, fixed)), '160.00')
  rejected(() => run(90, { ...set, noMatchBehavior: 'BLOCK' }), 'TIER_NO_MATCH')
})

test('NONE is a matching explicit zero tier, and disabled rows do not override active geometry', () => {
  const set = tierSet({ tiers: [rule(0, 60, 'NONE'), rule(60, null, 'RATE_1_1', null, 2), { ...rule(0, null, 'FIXED_AMOUNT', '999', 3), isActive: false }] })
  const result = run(45, set)
  assert.equal(money(result), '0.00'); assert.deepEqual(result.warnings, [])
  assert.equal(result.portions[0].method, 'NONE'); assert.equal(result.portions[0].source, 'TIER')
  assert.equal(money(run(60, set)), '60.00')
})

test('LT-09 exact repeating rate produces 75.00 and never prices from raw six-decimal display', () => {
  const ctx = context({ dayRate: d(300), hourRate: d(100).divide(d(3)), minuteRate: d(5).divide(d(9)) })
  const result = run(90, tierSet(), ctx)
  assert.equal(money(result), '75.00'); assert.equal(result.amount.numerator, 75n); assert.equal(result.amount.denominator, 1n)
  assert.equal(result.portions[0].inputs.UNIT_RATE, '5/9')
})

test('all rate units use the exact matching rate; currency remains currency and count forbids temporal pricing', () => {
  for (const [inputUnit, inputVar, input, expected] of [['HOURS', 'STANDARD_DAY_HOURS', '1.5', '90.00'], ['DAYS', 'COVERED_DAYS', '.25', '135.00'], ['CURRENCY', 'BASE_SALARY', '.29', '0.29']]) {
    assert.equal(money(run(input, tierSet({ inputUnit, inputVar, tiers: [rule(0, null, 'RATE_1_1')] }))), expected)
  }
  const count = tierSet({ inputUnit: 'COUNT', inputVar: 'LATE_INCIDENTS', applicationBasis: 'OCCURRENCE_COUNT', tiers: [rule(1, null, 'FIXED_AMOUNT', '25')] })
  assert.equal(money(run(2, count)), '25.00')
  rejected(() => run(2, { ...count, tiers: [rule(0, null, 'RATE_1_1')] }), 'TIER_RATE_UNIT')
  rejected(() => run(2, { ...count, noMatchBehavior: 'FALLBACK_1_1' }), 'TIER_RATE_UNIT')
})

test('FORMULA WHOLE and MARGINAL bind only the explicit input variable to amount or portion', () => {
  const ctx = context({ variables: { LATE_MINUTES: d(999), BASE_SALARY: d(10) } })
  const set = tierSet({ tiers: [rule(60, null, 'FORMULA', 'LATE_MINUTES * MINUTE_RATE + BASE_SALARY')] })
  assert.equal(money(run(90, set, ctx)), '100.00')
  const result = run(90, { ...set, tierApplicationMode: 'MARGINAL' }, ctx)
  assert.equal(money(result), '40.00')
  assert.equal(result.portions.at(-1).inputs.LATE_MINUTES, '30')
  assert.equal(ctx.variables.LATE_MINUTES.canonical(), '999')
})

test('inputFormula does not silently redefine a variable and formula on zero marginal portion is skipped', () => {
  const set = tierSet({ inputVar: null, inputFormula: 'LATE_MINUTES', tiers: [rule(60, null, 'FORMULA', 'LATE_MINUTES')] })
  assert.equal(money(run(90, set, context({ variables: { LATE_MINUTES: d(7) } }))), '7.00')
  const marginal = tierSet({ tierApplicationMode: 'MARGINAL', tiers: [rule(60, 120, 'FORMULA', 'LATE_MINUTES'), rule(120, null, 'FORMULA', '999', 2)] })
  const result = run(120, marginal)
  assert.equal(money(result), '60.00')
  assert.equal(result.portions.at(-1).skippedReason, 'ZERO_PORTION')
  assert.equal(result.portions.at(-1).amountRaw6, '0.000000')
})

test('formula rates cannot be spoofed by a competing approximate variables map', () => {
  const result = run(90, tierSet({ tiers: [rule(60, null, 'FORMULA', 'LATE_MINUTES * 1.5 * MINUTE_RATE')] }), context({ minuteRate: d(5).divide(d(9)), variables: { MINUTE_RATE: '0.56' } }))
  assert.equal(money(result), '75.00')
  assert.equal(result.portions[0].inputs.MINUTE_RATE, '5/9')
})

test('multiple rational formula portions sum exactly before any display or final rounding', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL', tiers: [rule(0, 1, 'FORMULA', 'MINUTE_RATE'), rule(1, 2, 'FORMULA', 'MINUTE_RATE', 2), rule(2, null, 'FORMULA', 'MINUTE_RATE', 3)] })
  const result = run(3, set, context({ minuteRate: d(5).divide(d(9)) }))
  assert.equal(result.amount.numerator, 5n); assert.equal(result.amount.denominator, 3n)
  assert.equal(money(result), '1.67')
  assert.deepEqual(result.portions.map(p => p.amountRaw6), ['0.555556', '0.555556', '0.555556'])
})

test('kernel raw display does not cause final double rounding; no caps or automatic money rounding are applied', () => {
  const set = tierSet({ maxDailyDeductionDayFraction: '0', maxPeriodDeductionDayFraction: '0', roundingMode: 'CEIL', roundingScale: 0, tiers: [rule(0, null, 'FORMULA', '1.2349999')] })
  const result = run(1, set)
  assert.equal(result.portions[0].amountRaw6, '1.235000')
  assert.equal(money(result), '1.23')
  assert.equal(result.amount.canonical(), '1.2349999')
})

test('explicit ROUND uses the supplied effective rounding mode while remaining kernel arithmetic stays exact', () => {
  const set = tierSet({ tiers: [rule(0, null, 'FORMULA', 'LATE_MINUTES / ROUND(.5, 0)')] })
  assert.equal(money(run(90, set)), '90.00')
  rejected(() => run(90, set, context({ roundingMode: 'FLOOR' })), 'CONSTANT_DIVISION_BY_ZERO')
  const halfEven = run(1, tierSet({ tiers: [rule(0, null, 'FORMULA', 'ROUND(2.345, 2)')] }), context({ roundingMode: 'HALF_EVEN' }))
  assert.equal(money(halfEven), '2.34')
})

test('negative formula deduction becomes zero with exact original amount retained in trace', () => {
  const result = run(90, tierSet({ tiers: [rule(0, null, 'FORMULA', '-40.1234567')] }))
  assert.equal(money(result), '0.00')
  assert.equal(result.warnings[0].code, 'NEGATIVE_DEDUCTION_CLAMPED')
  assert.deepEqual(result.portions[0].clampedFromExact, { numerator: '-401234567', denominator: '10000000' })
  assert.equal(result.portions[0].clampedFromRaw6, '-40.123457')
})

test('formula lazy branches, missing-input warnings, and both runtime zero-divisor modes survive composition', () => {
  const set = text => tierSet({ tiers: [rule(0, null, 'FORMULA', text)] })
  const lazy = run(1, set('IF(1=1, 12, BASE_SALARY / MINUTE_RATE)'), context({ minuteRate: d(0) }))
  assert.equal(money(lazy), '12.00'); assert.deepEqual(lazy.warnings, [])
  const missing = run(1, set('BASE_SALARY + 1'))
  assert.equal(money(missing), '1.00'); assert.equal(missing.warnings[0].code, 'MISSING_INPUT')
  const warning = run(1, set('1 / MINUTE_RATE'), context({ minuteRate: d(0) }))
  assert.equal(money(warning), '0.00'); assert.equal(warning.warnings[0].code, 'DIVISION_BY_ZERO')
  rejected(() => run(1, set('1 / MINUTE_RATE'), context({ minuteRate: d(0), divisionByZeroMode: 'FAIL_ROW' })), 'DIVISION_BY_ZERO')
  rejected(() => run(1, set('IF(1=1, 12, 1/(2-2))')), 'CONSTANT_DIVISION_BY_ZERO')
})

test('component, parameter, and typed namespaces remain explicit and exact', () => {
  const result = run(1, tierSet({ tiers: [rule(0, null, 'FORMULA', 'COMP[QUALITY] + PARAM[FACTOR] + TYPED_DEDUCTION[QUALITY]')] }), context({ components: { QUALITY: d(1).divide(d(3)) }, parameters: { FACTOR: d(2).divide(d(3)) }, typedDeductions: { QUALITY: d('.01') } }))
  assert.equal(money(result), '1.01')
  assert.equal(result.portions[0].inputs['COMP[QUALITY]'], '1/3')
  rejected(() => run(1, tierSet({ tiers: [rule(0, null, 'FORMULA', 'UNKNOWN')] })), 'REFERENCE_UNKNOWN')
  rejected(() => run(1, tierSet(), context({ parameters: { BASE_SALARY: '1' } })), 'TIER_SYMBOLS_INVALID')
  rejected(() => run(1, tierSet(), context({ components: { SAME: '1' }, parameters: { SAME: '1' } })), 'TIER_SYMBOLS_INVALID')
})

test('integers are required for effective minute/count values but exact fractional other units are retained', () => {
  rejected(() => run(d(1).divide(d(3))), 'TIER_INPUT_UNIT')
  rejected(() => run('-1'), 'TIER_INPUT_INVALID')
  rejected(() => run(1, tierSet({ tiers: [rule('.1', null, 'FIXED_AMOUNT', '10')] })), 'TIER_INPUT_UNIT')
  const result = run(d(1).divide(d(3)), tierSet({ inputUnit: 'HOURS', inputVar: 'STANDARD_DAY_HOURS', tiers: [rule(0, null, 'RATE_1_1')] }))
  assert.equal(money(result), '20.00'); assert.equal(result.portions[0].portionValue, '1/3')
})

test('defensive geometry guards reject corrupt gaps, overlaps, missing final, inactive sets, and duplicate sequence', () => {
  for (const tiers of [[rule(60, 120), rule(121, null, 'MULTIPLIER', '2', 2)], [rule(60, 120), rule(119, null, 'MULTIPLIER', '2', 2)], [rule(60, 120)], []]) rejected(() => run(90, tierSet({ tiers })), 'TIER_BOUNDS_INVALID')
  rejected(() => run(90, tierSet({ isActive: false })), 'TIER_INACTIVE')
  rejected(() => run(90, tierSet({ tiers: [rule(60, 120), rule(120, null, 'MULTIPLIER', '2', 1)] })), 'TIER_DEFINITION_INVALID')
})

test('defensive method guards prevent missing, extraneous, zero, negative and oversized fraction parameters', () => {
  for (const first of [{ ...rule(60, null), multiplier: null }, { ...rule(60, null), fixedAmount: '1' }, rule(60, null, 'MULTIPLIER', '0'), rule(60, null, 'FIXED_AMOUNT', '-1'), rule(60, null, 'DAY_FRACTION', '1.01')]) rejected(() => run(90, tierSet({ tiers: [first] })))
  rejected(() => run(90, tierSet(), context({ minuteRate: d(-1) })), 'TIER_RATE_INVALID')
})

test('own-property guards reject getters without calling them, ignore inherited variable values, and reject unknown names', () => {
  let called = false
  const map = Object.defineProperty({}, 'BASE_SALARY', { get() { called = true; return 999 } })
  rejected(() => run(1, tierSet(), context({ variables: map })), 'TIER_INPUT_INVALID'); assert.equal(called, false)
  const inherited = Object.create({ BASE_SALARY: '999' })
  const result = run(1, tierSet({ tiers: [rule(0, null, 'FORMULA', 'BASE_SALARY')] }), context({ variables: inherited }))
  assert.equal(money(result), '0.00'); assert.equal(result.warnings[0].code, 'MISSING_INPUT')
  rejected(() => run(1, tierSet(), context({ variables: { UNKNOWN: '1' } })), 'TIER_INPUT_INVALID')
})

test('exact decimal instances are reconstructed without trusting methods, prototype-only fractions, or oversized BigInts', () => {
  const fake = Object.create(PayrollDecimal.prototype)
  rejected(() => evaluate(tierSet(), fake, context()), 'TIER_INPUT_INVALID')
  Object.defineProperties(fake, { numerator: { value: 1n }, denominator: { value: 0n } })
  rejected(() => evaluate(tierSet(), fake, context()), 'DIVISION_BY_ZERO')
  const oversized = Object.create(PayrollDecimal.prototype)
  Object.defineProperties(oversized, { numerator: { value: 1n << 5000n }, denominator: { value: 1n } })
  rejected(() => evaluate(tierSet(), oversized, context()), 'NUMERIC_LIMIT')
  const rate = d(1); rate.multiply = () => { throw new Error('untrusted method called') }
  assert.equal(money(run(90, tierSet(), context({ minuteRate: rate }))), '135.00')
})

test('trace is JSON-safe, deterministic, and keeps normalized exact fractions independently of display', () => {
  const set = tierSet({ tierApplicationMode: 'MARGINAL' }), before = JSON.stringify(set)
  const result = run(150, set)
  const serialized = JSON.stringify({ portions: result.portions, warnings: result.warnings })
  assert.ok(serialized.includes('amountExact'))
  assert.equal(JSON.stringify(set), before)
  assert.deepEqual(JSON.parse(serialized).portions.at(-1).amountExact, { numerator: '60', denominator: '1' })
  for (let index = 0; index < 30; index++) {
    const repeated = run(150, set)
    assert.equal(JSON.stringify({ portions: repeated.portions, warnings: repeated.warnings }), serialized)
  }
})

test('shared kernel budget prevents 1000 individually valid formulas from creating an unbounded request', () => {
  assert.equal(PAYROLL_TIER_KERNEL_LIMITS.tiers, 1000)
  const formula = Array(40).fill('MINUTE_RATE').join('+')
  const tiers = Array.from({ length: 1000 }, (_, index) => rule(index, index === 999 ? null : index + 1, 'FORMULA', formula, index + 1))
  rejected(() => run(1000, tierSet({ tierApplicationMode: 'MARGINAL', tiers }), context({ minuteRate: d(1).divide(d(3)) })), 'TIER_EVALUATION_LIMIT')
  rejected(() => run(1, tierSet({ tiers: [...tiers, rule(1000, null, 'NONE', null, 1001)] })), 'TIER_COLLECTION_LIMIT')
})

test('parent coordinator budget is cumulative across calls and remains attached to returned exact arithmetic', () => {
  let spent = 0
  const ctx = context({ spend: () => { spent++ } })
  const first = run(90, tierSet(), ctx), before = spent
  first.amount.add(d(1)); assert.ok(spent > before)
  const after = spent; run(90, tierSet(), ctx); assert.ok(spent > after)
  const marker = new Error('parent budget exhausted')
  assert.throws(() => run(90, tierSet(), context({ spend: () => { throw marker } })), error => error === marker)
  rejected(() => run(90, tierSet(), context({ spend: 1 })), 'TIER_OPTIONS_INVALID')
})

test('internal exact evaluator preserves rational inputs and boolean results while public JSON shape stays unchanged', () => {
  const compiled = compile('MINUTE_RATE * 3', { variables: ['MINUTE_RATE'] })
  const options = { roundingMode: 'HALF_UP', divisionByZeroMode: 'ZERO_WITH_WARNING' }
  const result = exactFormula(compiled, { variables: { MINUTE_RATE: d(1).divide(d(3)) } }, options)
  assert.equal(result.exactValue.canonical(), '1'); assert.equal(result.inputs.MINUTE_RATE, '1/3')
  assert.deepEqual(Object.keys(result).sort(), ['exactValue', 'inputs', 'substitutedExpression', 'valueReferences', 'warnings'])
  assert.equal(exactFormula(compile('1=1', { variables: [], kind: 'CONDITION' }), {}, options).exactValue, true)
  const publicResult = publicFormula(compiled, { variables: { MINUTE_RATE: '0.25' } }, { ...options, roundingScale: 2 })
  assert.deepEqual(publicResult, { value: '0.75', rawValue: '0.750000', warnings: [], inputs: { MINUTE_RATE: '0.25' }, substitutedExpression: '(0.25) * 3' })
  assert.throws(() => publicFormula(compiled, { variables: { MINUTE_RATE: d(1) } }, { ...options, roundingScale: 2 }), error => error instanceof PayrollFormulaError && error.code === 'INPUT_INVALID')
})
