// تحقق نقي من تعريفات النسخة؛ لا DB ولا حساب رواتب أو خدمات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { validatePayrollPolicyDefinition: validate, PayrollPolicyDefinitionError } = require('../src/payroll/payroll-policy-definition')
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
function component(code, extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED', conditionFormula: null,
    unit: 'CURRENCY', prorationMode: 'NONE', amount: '100.00', fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
    percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null,
    minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null, deductionPriority: null,
    carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
function net(extra = {}) { return component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false, ...extra }) }
function parameter(extra = {}) { return { code: 'FACTOR', nameAr: 'معامل صريح', value: '1.250000', unit: 'SCALAR', isActive: true, ...extra } }
function tier(sequence, fromValue, toValue, extra = {}) {
  return { sequence, fromValue, toValue, method: 'RATE_1_1', multiplier: null, dayFraction: null, fixedAmount: null, formula: null, label: null, isActive: true, ...extra }
}
function tierSet(extra = {}) {
  return { code: 'LATE_SET', nameAr: 'طقم تأخير', description: null, inputVar: 'LATE_MINUTES', inputFormula: null, inputUnit: 'MINUTES',
    applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0, graceMaxUsesPerPeriod: null,
    allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false, noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: null,
    maxPeriodDeductionDayFraction: null, secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1,
    roundingMode: null, roundingScale: null, isActive: true,
    tiers: [tier(10, '0', '60'), tier(20, '60', null, { method: 'MULTIPLIER', multiplier: '1.500' })], ...extra }
}
function definition(extra = {}) { return { parameters: [], tierSets: [], components: [component('BASE_PAY'), net()], ...extra } }
function withSet(set = tierSet(), extra = {}) {
  return definition({ tierSets: [set], components: [component('BASE_PAY'), component('LATE_DED', { componentType: 'DEDUCTION', stage: 3,
    valueSource: 'TIERED', amount: null, tierSetCode: set.code, deductionPriority: 1 }), net()], ...extra })
}
const copy = value => JSON.parse(JSON.stringify(value))
function reject(value, code, options = {}, policySettings = settings) {
  assert.throws(() => validate(value, policySettings, options), error => {
    assert.ok(error instanceof PayrollPolicyDefinitionError, String(error))
    if (code) assert.equal(error.code, code)
    assert.ok(error.path.length); return true
  })
}

test('complete normalized definition is independent, canonical, recursively frozen, and contains no implicit values', () => {
  const input = definition({ parameters: [parameter({ value: '+01.250000' })] }), before = copy(input)
  const result = validate(input, settings)
  assert.equal(result.definition.parameters[0].value, '1.25')
  assert.equal(result.definition.components[0].amount, '100')
  assert.deepEqual(input, before)
  for (const value of [result.definition, result.definition.parameters, result.definition.parameters[0], result.definition.components, result.warnings]) assert.ok(Object.isFrozen(value))
  assert.deepEqual(result.warnings, [])
  assert.deepEqual(JSON.parse(JSON.stringify(result)).definition, result.definition)
})

test('missing/unknown fields, numeric decimals, forged IDs, accessor values and string booleans reject', () => {
  const variants = [value => delete value.parameters, value => delete value.components[0].minAmount, value => value.components[0].id = 1,
    value => value.components[0].versionId = 1, value => value.components[0].amount = 100, value => value.components[0].isActive = 'true']
  for (const change of variants) { const input = definition(); change(input); reject(input) }
  let invoked = false
  const input = definition(); Object.defineProperty(input.components[0], 'amount', { get() { invoked = true; return '2' } })
  reject(input, 'DEFINITION_SHAPE_INVALID'); assert.equal(invoked, false)
  reject(JSON.parse('{"parameters":[],"tierSets":[],"components":[],"__proto__":{}}'), 'DEFINITION_FIELD_UNKNOWN')
})

test('version settings must be complete and valid and caller-selected options are typed', () => {
  reject(definition(), 'DEFINITION_SETTINGS_REQUIRED', {}, { ...settings, dailyHours: null })
  reject(definition(), 'DEFINITION_SETTINGS_REQUIRED', {}, { ...settings, monthlyDays: 29 })
  reject(definition(), 'DEFINITION_OPTIONS_INVALID', { autoOrder: 'true' })
})

test('all eight user sources and SYS_NET retain their full fields and legal semantic relationships', () => {
  const input = definition({ parameters: [parameter()], tierSets: [tierSet()], components: [
    component('BASE_PAY', { rollupTo: 'basicSalary' }),
    component('ALLOW_PAY', { sequence: 2, valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO' }),
    component('PCT_PAY', { sequence: 3, valueSource: 'PERCENT_OF', amount: null, percent: '12.3456', baseCode: 'COMP[BASE_PAY]' }),
    component('OT_PAY', { stage: 2, sequence: 1, valueSource: 'SYSTEM_VAR', amount: null, varCode: 'OT_AMOUNT', multiplier: null }),
    component('FORM_PAY', { stage: 2, sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[PCT_PAY]*PARAM[FACTOR]', conditionFormula: 'BASE_SALARY>0' }),
    component('EXT_PAY', { stage: 2, sequence: 3, valueSource: 'EXTERNAL', amount: null }),
    component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, valueSource: 'TIERED', amount: null, tierSetCode: 'LATE_SET', deductionPriority: 1 }),
    component('DEBT_DED', { componentType: 'DEDUCTION', stage: 5, valueSource: 'LEDGER', amount: null, ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', deductionPriority: 2 }), net(),
  ] })
  const result = validate(input, settings)
  assert.equal(result.definition.components.length, 9)
  assert.deepEqual(result.warnings, [])
})

test('source-discriminated fields cannot be omitted, injected from another source or moved outside the salary whitelist', () => {
  for (const change of [item => item.amount = null, item => item.formula = '1', item => item.baseCode = 'BASE_SALARY']) {
    const input = definition(); change(input.components[0]); reject(input, 'COMPONENT_SOURCE_FIELDS')
  }
  for (const fieldPath of ['nationalId', 'iban', 'constructor', 'salary.secret']) {
    reject(definition({ components: [component('X', { valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath, missingFieldBehavior: 'SKIP' }), net()] }), 'COMPONENT_FIELD_NOT_ALLOWED')
  }
  for (const fieldPath of ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']) {
    assert.equal(validate(definition({ components: [component('X', { valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath, missingFieldBehavior: 'SKIP' }), net()] }), settings).definition.components[0].fieldPath, fieldPath)
  }
})

test('decimals preserve SQL boundaries exactly and refuse silent rounding or overflow', () => {
  const input = definition({ parameters: [parameter({ value: '999999999999.999999' })], components: [component('BIG', { amount: '9999999999999999.99' }), net()] })
  const result = validate(input, settings)
  assert.equal(result.definition.components[0].amount, '9999999999999999.99')
  assert.equal(result.definition.parameters[0].value, '999999999999.999999')
  for (const amount of ['10000000000000000', '0.001', '1e3', 'NaN']) reject(definition({ components: [component('X', { amount }), net()] }))
  reject(definition({ parameters: [parameter({ value: '0.0000001' })] }), 'DEFINITION_DECIMAL_PRECISION')
  reject(definition({ parameters: [parameter({ value: '1000000000000' })] }), 'DEFINITION_DECIMAL_PRECISION')
})

test('negative fixed values are info-only and counting units are limited to information and coherent inputs', () => {
  reject(definition({ components: [component('X', { amount: '-1' }), net()] }), 'COMPONENT_NEGATIVE_FIXED')
  assert.equal(validate(definition({ components: [component('X', { componentType: 'INFO', amount: '-1' }), net()] }), settings).definition.components[0].amount, '-1')
  reject(definition({ components: [component('X', { unit: 'COUNT' }), net()] }), 'COMPONENT_FINANCIAL_UNIT')
  for (const [unit, varCode] of [['COUNT', 'LATE_INCIDENTS'], ['FLAG', 'IS_ATTENDANCE_EXEMPT'], ['MONTHS', 'SENIORITY_MONTHS']]) {
    validate(definition({ components: [component('X', { componentType: 'INFO', valueSource: 'SYSTEM_VAR', unit, amount: null, varCode }), net()] }), settings)
  }
  reject(definition({ components: [component('X', { valueSource: 'SYSTEM_VAR', amount: null, varCode: 'LATE_MINUTES' }), net()] }), 'COMPONENT_VARIABLE_UNIT')
})

test('NET is mandatory, active, last, info and stage6, with no alternate formula or caps', () => {
  reject(definition({ components: [component('X')] }), 'DEFINITION_COMPONENT_ORDER')
  for (const change of [{ isActive: false }, { componentType: 'EARNING' }, { stage: 5 }, { conditionFormula: '1=1' }, { minAmount: '0' }, { roundingMode: 'FLOOR', roundingScale: 2 }, { exemptible: true }, { prorationMode: 'BY_COVERED_DAYS' }]) {
    reject(definition({ components: [component('X'), net(change)] }))
  }
  reject(definition({ components: [component('FAKE', { valueSource: 'SYS_NET', amount: null }), net()] }), 'COMPONENT_SYSTEM_NET')
  reject(definition({ components: [net(), component('AFTER', { componentType: 'INFO', stage: 6, sequence: 2 })] }), 'DEFINITION_COMPONENT_ORDER')
})

test('base/cap references, stages, ledger direction, caps, rounding and rollups enforce their declared contracts', () => {
  for (const extra of [{ stage: 3 }, { carryOverEligible: true }, { capPctOfBase: '20' }, { minAmount: '3', maxAmount: '2' },
    { roundingMode: 'FLOOR' }, { rollupTo: 'netPay' }, { rollupTo: 'absenceDays' }]) reject(definition({ components: [component('X', extra), net()] }))
  for (const baseCode of ['BASIC', 'COMP[UNKNOWN]', 'COMP[X].amount']) reject(definition({ components: [component('X', { valueSource: 'PERCENT_OF', amount: null, percent: '2', baseCode }), net()] }), 'DEFINITION_BASE_INVALID')
  reject(definition({ components: [component('X', { valueSource: 'LEDGER', amount: null, ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'BLOCK' }), net()] }), 'COMPONENT_LEDGER_DIRECTION')
  validate(definition({ components: [component('SHORT_INFO', { componentType: 'INFO', unit: 'MINUTES', rollupTo: 'shortfallMinutes' }),
    component('SHORT_DED', { componentType: 'DEDUCTION', stage: 3, deductionPriority: 1, rollupTo: 'shortfallDeduction' }), net()] }), settings)
})

test('disabled or unknown parameters and ambiguous symbol catalogs cannot be saved as references', () => {
  reject(definition({ parameters: [parameter({ isActive: false })], components: [component('X', { valueSource: 'FORMULA', amount: null, formula: 'PARAM[FACTOR]' }), net()] }), 'DEFINITION_PARAMETER_DISABLED')
  reject(definition({ parameters: [parameter({ code: 'BASE_PAY' })] }), 'DEFINITION_SYMBOLS_INVALID')
  reject(definition({ parameters: [parameter({ code: 'BASE_SALARY' })] }), 'DEFINITION_SYMBOLS_INVALID')
  reject(definition({ parameters: [parameter({ unit: 'FLAG', value: '2' })] }), 'DEFINITION_FLAG_INVALID')
  const input = definition({ components: [component('X', { valueSource: 'FORMULA', amount: null, formula: 'TYPED_DEDUCTION[QUALITY]' }), net()] })
  reject(input, 'REFERENCE_UNKNOWN')
  assert.equal(validate(input, settings, { typedDeductionCodes: ['QUALITY'] }).definition.components[0].formula, 'TYPED_DEDUCTION[QUALITY]')
})

test('dependencies from amounts, conditions, percentage bases and cap bases all reject forward/disabled references', () => {
  for (const extra of [{ valueSource: 'FORMULA', amount: null, formula: 'COMP[LATER]' }, { conditionFormula: 'COMP[LATER]>0' },
    { valueSource: 'PERCENT_OF', amount: null, percent: '5', baseCode: 'COMP[LATER]' }, { capPctOfBase: '5', capBaseCode: 'COMP[LATER]' }]) {
    reject(definition({ components: [component('FIRST', extra), component('LATER', { sequence: 2 }), net()] }), 'DEFINITION_COMPONENT_ORDER')
  }
  reject(definition({ components: [component('A', { isActive: false }), component('B', { sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[A]' }), net()] }), 'DEFINITION_COMPONENT_ORDER')
})

test('cycles include full paths and autoOrder returns real normalized sequences without changing stages or input', () => {
  const cycle = definition({ components: [component('A', { valueSource: 'FORMULA', amount: null, formula: 'COMP[B]' }), component('B', { sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[A]' }), net()] })
  assert.throws(() => validate(cycle, settings), error => error.message.includes('A → B → A'))
  const input = definition({ components: [component('DEPENDENT', { valueSource: 'FORMULA', amount: null, formula: 'COMP[BASE]' }), component('BASE', { sequence: 2 }), net()] }), original = copy(input)
  const result = validate(input, settings, { autoOrder: true })
  assert.deepEqual(result.definition.components.map(item => [item.code, item.sequence]), [['BASE', 1], ['DEPENDENT', 2], ['NET', 1]])
  assert.equal(result.warnings[0].code, 'AUTO_ORDER_APPLIED'); assert.deepEqual(input, original)
  assert.deepEqual(validate(result.definition, settings).warnings, [])
})

test('each tier method requires only its own parameter and no non-applicable field survives', () => {
  for (const extra of [{ method: 'NONE' }, { method: 'RATE_1_1' }, { method: 'MULTIPLIER', multiplier: '1.5' }, { method: 'DAY_FRACTION', dayFraction: '0.25' },
    { method: 'FIXED_AMOUNT', fixedAmount: '20.29' }, { method: 'FORMULA', formula: 'DAY_RATE*0.5' }]) {
    const result = validate(withSet(tierSet({ tiers: [tier(1, '0', null, extra)] })), settings)
    assert.equal(result.definition.tierSets[0].tiers[0].method, extra.method)
  }
  for (const extra of [{ method: 'MULTIPLIER' }, { method: 'MULTIPLIER', multiplier: '0' }, { method: 'DAY_FRACTION', dayFraction: '1.0001' },
    { method: 'RATE_1_1', fixedAmount: '1' }, { method: 'FORMULA', formula: '' }]) reject(withSet(tierSet({ tiers: [tier(1, '0', null, extra)] })))
})

test('gaps, overlap, unclosed ranges and disable/re-enable actions validate the final active collection', () => {
  for (const [tiers, code] of [[ [tier(1, '60', '120'), tier(2, '100', null)], 'TIER_OVERLAP'], [[tier(1, '60', '120'), tier(2, '150', null)], 'TIER_GAP'],
    [[tier(1, '60', '120')], 'TIER_OPEN_END_REQUIRED'], [[tier(1, '0', null), tier(2, '60', null)], 'TIER_OPEN_END_REQUIRED'],
    [[tier(1, '0', '60'), tier(2, '60', null, { isActive: false })], 'TIER_OPEN_END_REQUIRED']]) reject(withSet(tierSet({ tiers })), code)
  const disabled = tierSet({ isActive: false, tiers: [] })
  validate(definition({ tierSets: [disabled] }), settings)
  reject(definition({ tierSets: [{ ...disabled, isActive: true }] }), 'TIER_OPEN_END_REQUIRED')
  reject(withSet(disabled), 'COMPONENT_TIER_SET_INVALID')
  const result = validate(withSet(tierSet({ tiers: [tier(1, '60', null)] })), settings)
  assert.equal(result.warnings[0].code, 'TIER_BEFORE_FIRST_RANGE')
})

test('minutes/count have integer bounds while hours/days/currency retain six decimal places', () => {
  reject(withSet(tierSet({ tiers: [tier(1, '0.5', null)] })), 'TIER_INTEGER_INPUT')
  for (const [inputUnit, inputVar] of [['HOURS', 'OT_HOURS_TOTAL'], ['DAYS', 'ABSENCE_DAYS'], ['CURRENCY', 'BASE_SALARY']]) {
    const set = tierSet({ inputUnit, inputVar, tiers: [tier(1, '0.000001', null, { method: 'FIXED_AMOUNT', fixedAmount: '100.29' })] })
    assert.equal(validate(withSet(set), settings).definition.tierSets[0].tiers[0].fromValue, '0.000001')
  }
  const count = tierSet({ inputUnit: 'COUNT', inputVar: 'LATE_INCIDENTS', applicationBasis: 'OCCURRENCE_COUNT', tiers: [tier(1, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '20' })] })
  validate(withSet(count), settings)
  for (const extra of [{ tiers: [tier(1, '0', null)] }, { noMatchBehavior: 'FALLBACK_1_1' }, { tiers: [tier(1, '0.5', null, { method: 'NONE' })] }]) reject(withSet({ ...count, ...extra }))
})

test('grace/caps/unit settings reject contradictions without inventing business defaults', () => {
  for (const extra of [{ graceMinutes: 15 }, { graceMaxUsesPerPeriod: 3 }, { allowGraceOnFlexibleShift: true },
    { graceMode: 'SUBTRACT', graceMinutes: 0 }, { applicationBasis: 'PERIOD_ACCUMULATED', maxDailyDeductionDayFraction: '1' },
    { inputVar: 'BASE_SALARY' }, { inputFormula: 'LATE_MINUTES' }, { inputVar: null }, { roundingScale: 2 }]) reject(withSet(tierSet(extra)))
  const allowed = tierSet({ graceMode: 'WAIVE_ALL_OR_NOTHING', graceMinutes: 15, graceMaxUsesPerPeriod: 3, allowGraceOnFlexibleShift: true })
  validate(withSet(allowed), settings)
})

test('tier input and method formulas add AST dependencies to each consuming component', () => {
  for (const set of [tierSet({ inputVar: null, inputFormula: 'COMP[LATER]' }), tierSet({ tiers: [tier(1, '0', null, { method: 'FORMULA', formula: 'COMP[LATER]' })] })]) {
    const input = withSet(set); input.components.splice(2, 0, component('LATER', { componentType: 'DEDUCTION', stage: 3, sequence: 2, deductionPriority: 2 }))
    reject(input, 'DEFINITION_COMPONENT_ORDER')
  }
  reject(withSet(tierSet({ inputVar: null, inputFormula: 'COMP[LATE_DED]' })), 'DEFINITION_COMPONENT_ORDER')
})

test('monotonicity detects the LT17 multiplier-to-quarter-day decrease using the frozen daily hours', () => {
  const set = tierSet({ tiers: [tier(10, '60', '120', { method: 'MULTIPLIER', multiplier: '1.5' }), tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '.25' })] })
  const result = validate(withSet(set), settings), warning = result.warnings.find(item => item.code === 'TIER_MONOTONIC_DECREASE')
  assert.ok(warning); assert.equal(warning.key, 'TIER_MONOTONIC_DECREASE:LATE_SET:10:20')
  assert.equal(warning.details.before, '0.330556'); assert.equal(warning.details.after, '0.250000'); assert.equal(warning.details.dailyHours, '9')
  const noDecline = validate(withSet(set), { ...settings, dailyHours: 12 })
  assert.ok(!noDecline.warnings.some(item => item.code === 'TIER_MONOTONIC_DECREASE'))
})

test('mixed fixed/formula tiers declare unproven monotonicity and mandatory marginal/period warnings', () => {
  const mixed = tierSet({ tiers: [tier(1, '0', '60'), tier(2, '60', null, { method: 'FIXED_AMOUNT', fixedAmount: '20' })] })
  assert.ok(validate(withSet(mixed), settings).warnings.some(item => item.code === 'TIER_MONOTONIC_UNPROVEN'))
  const special = tierSet({ applicationBasis: 'PERIOD_ACCUMULATED', tierApplicationMode: 'MARGINAL', tiers: [tier(1, '0', null, { method: 'DAY_FRACTION', dayFraction: '.25' })] })
  const codes = validate(withSet(special), settings).warnings.map(item => item.code)
  for (const code of ['TIER_MARGINAL_FIXED_METHOD', 'TIER_PERIOD_DAY_FRACTION', 'TIER_MONOTONIC_UNPROVEN']) assert.ok(codes.includes(code))
  const formulaInput = tierSet({ inputVar: null, inputFormula: '120-LATE_MINUTES' })
  assert.ok(validate(withSet(formulaInput), settings).warnings.some(item => item.code === 'TIER_MONOTONIC_UNPROVEN'))
})

test('monotonicity also covers FALLBACK_1_1 before the first tier without treating the initial range as a gap', () => {
  const set = tierSet({ noMatchBehavior: 'FALLBACK_1_1', tiers: [tier(10, '60', null, { method: 'NONE' })] })
  const warnings = validate(withSet(set), settings).warnings
  assert.ok(warnings.some(warning => warning.code === 'TIER_BEFORE_FIRST_RANGE'))
  const decrease = warnings.find(warning => warning.code === 'TIER_MONOTONIC_DECREASE')
  assert.equal(decrease.key, 'TIER_MONOTONIC_DECREASE:LATE_SET:0:10')
  assert.equal(decrease.details.previousInput, '59'); assert.equal(decrease.details.currentInput, '60')
  assert.equal(decrease.details.after, '0.000000')
})

test('warning details are canonical and change with the business reason so old acknowledgements cannot match', () => {
  const set = tierSet({ tiers: [tier(10, '60', '120', { method: 'MULTIPLIER', multiplier: '1.500' }), tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.2500' })] })
  const input = withSet(set), warning = validate(input, settings).warnings
  const equivalent = copy(input); equivalent.tierSets[0].tiers[0].multiplier = '1.5'; equivalent.tierSets[0].tiers[1].dayFraction = '.25'
  equivalent.tierSets[0].tiers[0].label = 'تسمية وصفية لا تغير قاعدة الخصم'
  assert.deepEqual(validate(equivalent, settings).warnings, warning)
  const changed = copy(input); changed.tierSets[0].tiers[0].multiplier = '1.6'
  const next = validate(changed, settings).warnings
  assert.deepEqual(next.map(item => item.key), warning.map(item => item.key)); assert.notDeepEqual(next, warning)
})

test('ROUND is validated under actual component/tier override and graph normalization is idempotent', () => {
  const input = definition({ components: [component('X', { valueSource: 'FORMULA', amount: null, formula: '1/ROUND(.5,0)', roundingMode: 'FLOOR', roundingScale: 2 }), net()] })
  reject(input, 'CONSTANT_DIVISION_BY_ZERO')
  input.components[0].roundingMode = 'HALF_UP'
  const result = validate(input, settings)
  assert.deepEqual(validate(result.definition, settings), result)
})

test('technical collection limits reject before a large collection can be processed', () => {
  reject(definition({ parameters: Array.from({ length: 201 }, (_, index) => parameter({ code: `P${index}` })) }), 'DEFINITION_COLLECTION_LIMIT')
  reject(definition({ tierSets: Array.from({ length: 51 }, (_, index) => tierSet({ code: `T${index}` })) }), 'DEFINITION_COLLECTION_LIMIT')
  reject(definition({ components: Array.from({ length: 201 }, (_, index) => component(`X${index}`, { sequence: index + 1 })) }), 'DEFINITION_COLLECTION_LIMIT')
  reject(definition({ tierSets: [tierSet({ tiers: Array.from({ length: 1001 }, (_, index) => tier(index + 1, String(index), String(index + 1))) })] }), 'DEFINITION_COLLECTION_LIMIT')
  reject(definition({ tierSets: Array.from({ length: 2 }, (_, set) => tierSet({ code: `T${set}`, tiers: Array.from({ length: 501 }, (_, index) => tier(index + 1, String(index), index === 500 ? null : String(index + 1))) })) }), 'DEFINITION_COLLECTION_LIMIT')
})
