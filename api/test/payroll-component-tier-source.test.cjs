// المصدر النقي يربط تنفيذ البنود بمنسق الشرائح دون بيانات حية أو قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
const { resolvePayrollComponentTierSource: resolve, PayrollComponentTierSourceError } = require('../src/payroll/payroll-component-tier-source')
const { evaluatePayrollTierPreview, evaluatePayrollTierPreviewExact, PayrollTierPreviewError } = require('../src/payroll/payroll-tier-preview')
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const d = value => PayrollDecimal.from(value)
const copy = value => JSON.parse(JSON.stringify(value))
function component(code, extra = {}) {
  return { code, nameAr: code, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED', conditionFormula: null,
    unit: 'CURRENCY', prorationMode: 'NONE', amount: '100', fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
    percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null,
    minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null, deductionPriority: null,
    carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
function tier(sequence, fromValue, toValue, extra = {}) {
  return { sequence, fromValue, toValue, method: 'RATE_1_1', multiplier: null, dayFraction: null, fixedAmount: null,
    formula: null, label: null, isActive: true, ...extra }
}
function set(extra = {}) {
  return { code: 'LATE_SET', nameAr: 'طقم التأخير', description: null, inputVar: 'LATE_MINUTES', inputFormula: null, inputUnit: 'MINUTES',
    applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0, graceMaxUsesPerPeriod: null,
    allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false, noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null,
    maxPeriodDeductionDayFraction: null, secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1,
    roundingMode: null, roundingScale: null, isActive: true, tiers: [tier(1, '0', null)], ...extra }
}
function definition(tierSet = set(), componentPatch = {}) {
  return { parameters: [], tierSets: [tierSet], components: [component('BASE_PAY'),
    component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, valueSource: 'TIERED', amount: null, tierSetCode: tierSet.code,
      deductionPriority: 1, ...componentPatch }),
    component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })] }
}
function day(date, minutes, extra = {}) {
  return { date, sourceRef: `attendance:${date}`, rawLateSeconds: String(BigInt(minutes) * 60n), excusedLateSeconds: '0',
    flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null, ...extra }
}
function input(days = [day('2026-09-01', '90')], extra = {}) {
  return { expectedRevision: 7, periodStart: '2026-09-01', periodEnd: '2026-09-30', basicSalary: '8100', grossSalary: '16200',
    days, sourceRef: 'snapshot:monthly-salary-and-attendance:7', ...extra }
}
const context = (extra = {}) => ({ variables: {}, components: {}, sourceRefs: { variables: {}, components: {} }, ...extra })
function result(tierPatch = {}, request = input(), policy = settings, ctx = context(), componentPatch = {}) {
  return resolve(definition(set(tierPatch), componentPatch), policy, 'LATE_DED', request, ctx)
}
function rejects(callback, code) {
  assert.throws(callback, error => {
    assert.ok(error instanceof PayrollComponentTierSourceError, `${error?.constructor?.name}: ${error?.message}`)
    if (code) assert.equal(error.code, code)
    assert.equal(typeof error.path, 'string'); assert.ok(error.message)
    return true
  })
}
const previewDto = request => { const { sourceRef, ...dto } = request; return { ...dto, tierSetCode: 'LATE_SET', inputs: { variables: {}, components: {} } } }

test('TIERED value is exactly the sum of daily rounded lines, never rounded aggregate raw amount', () => {
  const output = result({}, input([day('2026-09-01', '1'), day('2026-09-02', '1')], { basicSalary: '108', grossSalary: '108' }))
  assert.equal(output.value.canonical(), '0.02')
  assert.deepEqual(output.trace.preview.lines.map(row => row.amount), ['0.01', '0.01'])
  const raw = output.trace.preview.lines.reduce((sum, row) => sum.add(new PayrollDecimal(BigInt(row.rawAmountExact.numerator), BigInt(row.rawAmountExact.denominator))), d('0'))
  assert.equal(raw.format(2, 'HALF_UP'), '0.01')
  assert.equal(output.alreadyProrated, true)
  assert.equal(output.trace.sourceValidation, 'EXPLICIT_UNVERIFIED')
})

test('repeating intermediate rates remain exact through LT reference example', () => {
  const output = result({ tiers: [tier(1, '60', null, { method: 'MULTIPLIER', multiplier: '1.5' })] },
    input(undefined, { basicSalary: '9000', grossSalary: '9000' }))
  assert.equal(output.value.canonical(), '75')
  assert.deepEqual(output.trace.preview.rates.minuteRateExact, { numerator: '5', denominator: '9' })
})

test('daily and period caps preserve oldest-first line allocation and every reduction', () => {
  const output = result({ tiers: [tier(1, '0', null, { method: 'MULTIPLIER', multiplier: '2' })],
    maxDailyDeductionDayFraction: '1', maxPeriodDeductionDayFraction: '1.5' },
  input([day('2026-09-02', '400'), day('2026-09-01', '400')]))
  assert.equal(output.value.canonical(), '810')
  assert.deepEqual(output.trace.preview.lines.map(row => row.amount), ['540.00', '270.00'])
  assert.deepEqual(output.trace.preview.lines.map(row => row.dailyCapReduction), ['260.000000', '260.000000'])
  assert.equal(output.trace.preview.lines[1].periodCapReduction, '270.00')
  assert.equal(output.trace.preview.periodCapReduction, '270.00')
})

test('PER_DAY and PERIOD_ACCUMULATED retain different LT06 semantics', () => {
  const tiers = [tier(1, '60', '120', { method: 'MULTIPLIER', multiplier: '1.5' }), tier(2, '120', null, { method: 'MULTIPLIER', multiplier: '2' })]
  const days = input([day('2026-09-01', '90'), day('2026-09-02', '90')])
  assert.equal(result({ tiers }, days).value.canonical(), '270')
  const accumulated = result({ tiers, applicationBasis: 'PERIOD_ACCUMULATED' }, days)
  assert.equal(accumulated.value.canonical(), '360'); assert.equal(accumulated.trace.preview.lines.length, 1)
  assert.equal(accumulated.trace.preview.lines[0].date, null)
})

test('OCCURRENCE_COUNT counts only effective nonexempt days and preserves daily evidence', () => {
  const output = result({ inputVar: 'LATE_INCIDENTS', inputUnit: 'COUNT', applicationBasis: 'OCCURRENCE_COUNT',
    tiers: [tier(1, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '35' })] },
  input([day('2026-09-01', '90'), day('2026-09-02', '90', { attendanceExempt: true }), day('2026-09-03', '0')]))
  assert.equal(output.value.canonical(), '35'); assert.equal(output.trace.preview.lines[0].inputValue, '1')
  assert.equal(output.trace.preview.days[1].skippedReason, 'ATTENDANCE_EXEMPT')
  assert.ok(output.sourceRefs.includes('attendance:2026-09-02'))
})

test('MARGINAL fixed and day-fraction enter fully at inclusive lower bound; zero never creates a charge', () => {
  const patch = { tierApplicationMode: 'MARGINAL', tiers: [tier(1, '60', '120', { method: 'DAY_FRACTION', dayFraction: '0.25' }),
    tier(2, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.5' })] }
  assert.equal(result(patch, input([day('2026-09-01', '120')])).value.canonical(), '405')
  const zero = result({ tierApplicationMode: 'MARGINAL', tiers: [tier(1, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '100' })] }, input([day('2026-09-01', '0')]))
  assert.equal(zero.value.canonical(), '0'); assert.deepEqual(zero.trace.preview.lines[0].portions, [])
})

test('permissions, seconds, shift grace, minute rounding and grace-use limits keep their order', () => {
  const output = result({ graceMode: 'SUBTRACT', graceMinutes: 10, graceMaxUsesPerPeriod: 1, allowShiftGraceOverride: true,
    minutesRoundingMode: 'CEIL', roundingUnitMinutes: 15 }, input([
    day('2026-09-01', '90', { flexibleStartEnabled: true, excusedLateSeconds: '60' }),
    day('2026-09-02', '90', { shiftGraceMinutes: 15, rawLateSeconds: '5400.5', excusedLateSeconds: '3600.5' }),
    day('2026-09-03', '20'),
  ]))
  const days = output.trace.preview.days
  assert.deepEqual(days.map(row => row.roundedMinutes), ['90', '15', '30'])
  assert.deepEqual(days.map(row => row.grace.consumed), [false, true, false]); assert.equal(output.trace.preview.graceUses, 1)
  assert.equal(days[1].grace.source, 'SHIFT'); assert.equal(days[2].grace.reason, 'GRACE_LIMIT_EXHAUSTED')
})

test('disabled attendance and exempt days do not evaluate unavailable formula operands or consume grace', () => {
  const patch = { graceMode: 'SUBTRACT', graceMinutes: 15, tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'COMP[BASE_PAY] / BONUS_TOTAL' })] }
  for (const policy of [{ ...settings, skipAttendance: true }, { ...settings, lateDeductionEnabled: false }]) {
    const output = result(patch, input(), policy)
    assert.equal(output.value.canonical(), '0'); assert.deepEqual(output.trace.references, []); assert.equal(output.trace.preview.graceUses, 0)
  }
  const output = result(patch, input([day('2026-09-01', '90', { attendanceExempt: true })]))
  assert.equal(output.value.canonical(), '0'); assert.equal(output.trace.preview.graceUses, 0)
})

test('empty daily sample has zero value without requesting unused COMP', () => {
  const output = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'COMP[BASE_PAY]' })] }, input([]))
  assert.equal(output.value.canonical(), '0'); assert.deepEqual(output.trace.preview.lines, [])
})

test('exact context transports a recurring fraction without canonical truncation and keeps used references', () => {
  const ctx = context({ variables: { BONUS_TOTAL: new PayrollDecimal(1n, 3n) }, components: { BASE_PAY: d('2') },
    sourceRefs: { variables: { BONUS_TOTAL: ['bonus:exact'] }, components: { BASE_PAY: ['component:base'] } } })
  const output = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'BONUS_TOTAL * 3 + COMP[BASE_PAY]' })] }, input(), settings, ctx)
  assert.equal(output.value.canonical(), '3')
  assert.ok(output.sourceRefs.includes('bonus:exact')); assert.ok(output.sourceRefs.includes('component:base'))
  assert.deepEqual(output.trace.references, ['BONUS_TOTAL', 'COMP[BASE_PAY]'])
  assert.deepEqual(output.trace.normalizedInput.context.variables.BONUS_TOTAL, { numerator: '1', denominator: '3' })
})

test('missing executed COMP rejects instead of preview missing-input zero, but lazy unused branch needs no value', () => {
  rejects(() => result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'COMP[BASE_PAY] + 1' })] }), 'COMPONENT_TIER_RESULT_UNAVAILABLE')
  const output = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'IF(LATE_MINUTES > 0, 7, COMP[BASE_PAY])' })] })
  assert.equal(output.value.canonical(), '7'); assert.ok(!output.trace.references.includes('COMP[BASE_PAY]'))
})

test('COMP in an IF condition stays in audit references without becoming an amount contributor', () => {
  const ctx = context({ components: { BASE_PAY: d('100') }, sourceRefs: { variables: {}, components: { BASE_PAY: ['base:source'] } } })
  const output = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'IF(COMP[BASE_PAY] > 0, 12, 0)' })] }, input(), settings, ctx)
  assert.equal(output.value.canonical(), '12')
  assert.deepEqual(output.trace.references, ['COMP[BASE_PAY]']); assert.deepEqual(output.trace.valueReferences, [])
  assert.ok(output.sourceRefs.includes('base:source'))
})

test('COMP in the selected amount branch remains a value contributor even when also read by the IF condition', () => {
  const ctx = context({ components: { BASE_PAY: d('100') } })
  const output = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'IF(COMP[BASE_PAY] > 0, COMP[BASE_PAY] / 2, 0)' })] }, input(), settings, ctx)
  assert.equal(output.value.canonical(), '50'); assert.deepEqual(output.trace.valueReferences, ['COMP[BASE_PAY]'])
})

test('stored active parameters feed formulas; caller parameters and future components cannot be forged', () => {
  const source = definition(set({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'PARAM[FACTOR] * 10' })] }))
  source.parameters.push({ code: 'FACTOR', nameAr: 'عامل', unit: 'SCALAR', value: '1.5', isActive: true })
  const output = resolve(source, settings, 'LATE_DED', input(), context())
  assert.equal(output.value.canonical(), '15')
  rejects(() => resolve(source, settings, 'LATE_DED', { ...input(), parameters: { FACTOR: '100' } }, context()), 'COMPONENT_TIER_INPUT_UNKNOWN')
  rejects(() => resolve(source, settings, 'LATE_DED', input(), context({ components: { NET: d('1') } })), 'COMPONENT_TIER_INPUT_UNKNOWN')
})

test('monthly rates and policy constants must agree exactly with the existing execution context', () => {
  const good = { DAY_RATE: d('540'), HOUR_RATE: d('60'), MINUTE_RATE: d('1'), BASE_DAYS_BASIS: d('30'), STANDARD_DAY_HOURS: d('9'), PERIOD_DAYS: d('30') }
  assert.equal(result({}, input(), settings, context({ variables: good })).value.canonical(), '90')
  for (const code of Object.keys(good)) rejects(() => result({}, input(), settings, context({ variables: { ...good, [code]: good[code].add(d('1')) } })), 'COMPONENT_TIER_CONTEXT_CONFLICT')
})

test('BASE/GROSS keep their general context meaning unless a tier formula actually consumes them', () => {
  const ctx = context({ variables: { BASE_SALARY: d('100'), GROSS_SALARY: d('200') } })
  assert.equal(result({}, input(), settings, ctx).value.canonical(), '90')
  rejects(() => result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'GROSS_SALARY / 30' })] }, input(), settings, ctx), 'COMPONENT_TIER_CONTEXT_CONFLICT')
  const lazy = result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'IF(LATE_MINUTES > 0, 12, GROSS_SALARY)' })] }, input(), settings, ctx)
  assert.equal(lazy.value.canonical(), '12')
  assert.equal(ctx.variables.GROSS_SALARY.canonical(), '200')
})

test('source min and proration cannot revive or double-charge tiers; later reducing caps remain permitted', () => {
  rejects(() => result({}, input(), settings, context(), { minAmount: '1' }), 'COMPONENT_TIER_MINIMUM_UNSUPPORTED')
  for (const prorationMode of ['BY_COVERED_DAYS', 'BY_COVERED_WORKING_DAYS']) rejects(() => result({}, input(), settings, context(), { prorationMode }), 'COMPONENT_TIER_TRANSFORM_UNSUPPORTED')
  const output = result({}, input(), settings, context(), { minAmount: '0', maxAmount: '10', capPctOfBase: '0.01', capBaseCode: 'GROSS_SALARY' })
  assert.equal(output.value.canonical(), '90') // source trace is retained; component pipeline owns the later reductions.
})

test('inactive, unknown, wrong-source and unit or multiplier mutations fail without silent source invention', () => {
  rejects(() => result({}, input(), settings, context(), { isActive: false }), 'COMPONENT_TIER_UNAVAILABLE')
  rejects(() => resolve(definition(), settings, 'UNKNOWN', input(), context()), 'COMPONENT_TIER_UNAVAILABLE')
  rejects(() => resolve(definition(), settings, 'BASE_PAY', input(), context()), 'COMPONENT_TIER_UNAVAILABLE')
  rejects(() => result({}, input(), settings, context(), { unit: 'MINUTES' }))
  rejects(() => result({}, input(), settings, context(), { multiplier: '2' }))
})

test('generic stored tier input formula and non-lateness variables reject until a source provider exists', () => {
  rejects(() => result({ inputVar: null, inputFormula: 'LATE_MINUTES' }), 'COMPONENT_TIER_SOURCE_UNSUPPORTED')
  rejects(() => result({ inputVar: 'SHORT_MINUTES' }), 'COMPONENT_TIER_SOURCE_UNSUPPORTED')
})

test('policy tier rounding is preserved as the source precision rather than applying component rounding to the sum', () => {
  const output = result({ roundingMode: 'HALF_UP', roundingScale: 3 }, input([day('2026-09-01', '1'), day('2026-09-02', '1')],
    { basicSalary: '108', grossSalary: '108' }), settings, context(), { roundingMode: 'HALF_UP', roundingScale: 2 })
  assert.equal(output.value.canonical(), '0.014'); assert.equal(output.trace.preview.total, '0.014')
  assert.deepEqual(output.trace.preview.rounding, { mode: 'HALF_UP', scale: 3 })
})

test('large salary cents remain exact and caller snapshots are detached, normalized and immutable', () => {
  const request = input([day('2026-09-02', '1'), day('2026-09-01', '1')], { basicSalary: '9999999999999999.99', grossSalary: '9999999999999999.99' })
  const before = copy(request), source = definition(set({ tiers: [tier(1, '0', null, { method: 'DAY_FRACTION', dayFraction: '1' })] })), sourceBefore = copy(source)
  const output = resolve(source, settings, 'LATE_DED', request, context())
  assert.equal(output.value.canonical(), '666666666666666.66')
  assert.deepEqual(request, before); assert.deepEqual(source, sourceBefore)
  assert.deepEqual(output.trace.normalizedInput.days.map(row => row.date), ['2026-09-01', '2026-09-02'])
  assert.ok(Object.isFrozen(output.trace.preview.days[0]))
  request.days[0].rawLateSeconds = '0'; assert.equal(output.trace.normalizedInput.days[1].rawLateSeconds, '60')
})

test('replay with reordered input days and map insertion order produces identical trace and exact total', () => {
  const request = input([day('2026-09-02', '90'), day('2026-09-01', '90')]), reversed = { ...request, days: [...request.days].reverse() }
  const first = result({}, request, settings, context({ variables: { BONUS_TOTAL: d('1'), BASE_DAYS_BASIS: d('30') },
    sourceRefs: { variables: { BONUS_TOTAL: ['bonus:1'], BASE_DAYS_BASIS: ['policy:30'] }, components: {} } }))
  const second = result({}, reversed, settings, context({ variables: { BASE_DAYS_BASIS: d('30'), BONUS_TOTAL: d('1') },
    sourceRefs: { variables: { BASE_DAYS_BASIS: ['policy:30'], BONUS_TOTAL: ['bonus:1'] }, components: {} } }))
  assert.deepEqual(first.trace, second.trace); assert.equal(first.value.compare(second.value), 0)
  assert.equal(JSON.stringify(first.trace), JSON.stringify(second.trace))
})

test('closed day input rejects forged totals, foreign maps, bad dates, unsafe money and missing reference', () => {
  for (const patch of [{ total: '0' }, { tierSetCode: 'OTHER' }, { inputs: { variables: {} } }, { expectedRevision: 0 },
    { basicSalary: 8100 }, { grossSalary: '16200.001' }, { periodStart: '2026-09-31' }, { periodEnd: '2026-08-01' }, { sourceRef: ' ' }]) {
    rejects(() => result({}, { ...input(), ...patch }))
  }
  rejects(() => result({}, input([day('2026-09-01', '1'), day('2026-09-01', '2')])))
  rejects(() => result({}, input([day('2026-08-31', '1')])) )
  rejects(() => result({}, input([day('2026-09-01', '1', { rawLateSeconds: 60 })])))
  rejects(() => result({}, input(Array.from({ length: 367 }, () => day('2026-09-01', '1')))))
})

test('strict plain snapshots reject getters, hidden fields, symbols, cycles and custom prototypes without invoking getters', () => {
  let calls = 0
  const getter = input(); Object.defineProperty(getter, 'days', { enumerable: true, get() { calls++; return [] } })
  const hidden = input(); Object.defineProperty(hidden, 'hidden', { enumerable: false, value: 'x' })
  const symbol = input(); symbol[Symbol('x')] = 'x'
  const custom = Object.assign(Object.create({ inherited: true }), input())
  const customArray = input(); Object.setPrototypeOf(customArray.days, Object.create(Array.prototype))
  const sparse = input(); sparse.days = new Array(1)
  const cycle = input(); cycle.days[0].loop = cycle
  for (const request of [getter, hidden, symbol, custom, customArray, sparse, cycle]) rejects(() => result({}, request))
  const badSettings = { ...settings }; Object.defineProperty(badSettings, 'dailyHours', { enumerable: true, get() { calls++; return 9 } })
  rejects(() => result({}, input(), badSettings)); assert.equal(calls, 0)
})

test('exact contexts reject numeric approximations, unknown names, prototype attacks and computed Decimal fields', () => {
  let calls = 0
  const fake = Object.create(PayrollDecimal.prototype)
  Object.defineProperties(fake, { numerator: { get() { calls++; return 1n } }, denominator: { value: 1n } })
  for (const variables of [{ BONUS_TOTAL: '0.3' }, { BONUS_TOTAL: 0.3 }, { UNKNOWN: d('1') }, { BONUS_TOTAL: fake }, Object.assign(Object.create({ inherited: 1 }), { BONUS_TOTAL: d('1') })]) {
    rejects(() => result({}, input(), settings, context({ variables })))
  }
  const ctx = context(); Object.defineProperty(ctx, 'variables', { enumerable: true, get() { calls++; return {} } })
  rejects(() => result({}, input(), settings, ctx)); assert.equal(calls, 0)
})

test('shared caller budget is propagated through preview and its exact tier kernel', () => {
  const marker = new Error('shared-budget-stop'); let calls = 0
  const ctx = context({ spend() { if (++calls > 450) throw marker } })
  assert.throws(() => result({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'LATE_MINUTES * 2 + DAY_RATE / 3' })] },
    input(Array.from({ length: 20 }, (_, index) => day(`2026-09-${String(index + 1).padStart(2, '0')}`, '90'))), settings, ctx), error => error === marker)
  assert.equal(calls, 451)
})

test('public preview keeps its existing JSON contract while internal exact preview is separate and fail-closed', () => {
  const source = definition(), dto = previewDto(input())
  const publicResult = evaluatePayrollTierPreview(source, settings, dto)
  const internalResult = evaluatePayrollTierPreviewExact(source, settings, dto, { variables: {}, components: {} })
  assert.deepEqual(internalResult, publicResult)
  assert.throws(() => evaluatePayrollTierPreview(source, settings, { ...dto, inputs: { variables: { BONUS_TOTAL: new PayrollDecimal(1n, 3n) }, components: {} } }), PayrollTierPreviewError)
  assert.throws(() => evaluatePayrollTierPreviewExact(source, settings, { ...dto, inputs: { variables: { BONUS_TOTAL: '1' }, components: {} } }, { variables: {}, components: {} }), PayrollTierPreviewError)
  assert.throws(() => evaluatePayrollTierPreviewExact(source, settings, dto, { variables: { DAY_RATE: d('1') }, components: {} }), PayrollTierPreviewError)
})
