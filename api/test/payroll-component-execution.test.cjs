// حدود مالية على مدخلات صريحة فقط؛ لا قاعدة بيانات أو مسير أو خدمة حية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { executePayrollComponents: execute, PayrollComponentExecutionError } = require('../src/payroll/payroll-component-execution')
const { buildPayrollInputFacts } = require('../src/payroll/payroll-input-facts')
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const salaryKeys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
const copy = value => JSON.parse(JSON.stringify(value))
const frac = (numerator, denominator) => ({ numerator: String(numerator), denominator: String(denominator) })
function component(code = 'PAY', extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: '100.00', fieldPath: null,
    missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
    formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
    maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
    deductionPriority: null, carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true,
    isActive: true, ...extra }
}
const net = () => component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })
const formula = (code, formula, extra = {}) => component(code, { amount: null, valueSource: 'FORMULA', formula, ...extra })
const system = (code, varCode, extra = {}) => component(code, { amount: null, valueSource: 'SYSTEM_VAR', varCode, ...extra })
const deduction = (extra = {}) => ({ componentType: 'DEDUCTION', stage: 3, deductionPriority: 1, ...extra })
const definition = (...components) => ({ components: [...components, net()], parameters: [], tierSets: [] })
function input(variables = {}, extra = {}) {
  const result = { variables: {}, employeeFields: Object.fromEntries(salaryKeys.map(key => [key, null])), externalValues: {},
    sourceMetadata: { variables: {}, employeeFields: {}, externalValues: {} },
    proration: { calendar30: { value: '0.5', sourceRef: 'coverage:explicit' }, working: { value: '0.6', sourceRef: 'schedule:explicit' } }, exemptions: [], ...extra }
  for (const [key, value] of Object.entries(variables)) setValue(result, 'variables', key, value)
  return result
}
function setValue(input, group, key, value, alreadyProrated = false, sourceRef = `${group}:${key}`) {
  input[group][key] = value
  if (value !== null) input.sourceMetadata[group][key] = { sourceRef, alreadyProrated }
  return input
}
const run = (components, values = input(), policy = settings) => execute(definition(...components), policy, values)
const line = (result, code = 'PAY') => result.components.find(item => item.code === code)
function rejected(fn, code) {
  assert.throws(fn, error => { assert.ok(error instanceof PayrollComponentExecutionError, String(error)); if (code) assert.equal(error.code, code, error.message); return true })
}
const rates = { DAY_RATE: '540', HOUR_RATE: '60', MINUTE_RATE: '1' }

test('six implemented sources use ordered rounded COMP and totals exclude INFO and deferred NET', () => {
  const values = input({ BASE_SALARY: '1000' })
  setValue(values, 'employeeFields', 'housingAllowance', '200')
  setValue(values, 'externalValues', 'OUTSIDE', '40')
  const result = run([
    component('FIXED'), component('FIELD', { sequence: 2, valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO' }),
    system('SYSTEM', 'BASE_SALARY', { sequence: 3, multiplier: '0.100' }),
    component('PCT', { sequence: 4, valueSource: 'PERCENT_OF', amount: null, percent: '10', baseCode: 'COMP[FIELD]' }),
    formula('CALC', 'COMP[PCT] + 0.1 + 0.2', { sequence: 5 }),
    component('OUTSIDE', { sequence: 6, valueSource: 'EXTERNAL', amount: null }),
    component('INFO_VALUE', { sequence: 7, componentType: 'INFO', amount: '9999', unit: 'COUNT' }),
  ], values)
  assert.deepEqual(result.components.map(row => row.amount), ['100.00', '200.00', '100.00', '20.00', '20.30', '40.00', '9999.00', null])
  assert.equal(result.totalsPreCaps.earnings.amount, '480.30')
  assert.equal(line(result, 'NET').status, 'DEFERRED')
  assert.equal(result.preCapsOnly, true); assert.equal(result.source, 'EXPLICIT_UNVERIFIED'); assert.equal('netPay' in result, false)
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.components[0].steps)); assert.doesNotThrow(() => JSON.stringify(result))
})

test('all time units convert with exact supplied rates; INFO retains hours without conversion', () => {
  const result = run([component('DAY', { unit: 'DAYS', amount: '0.5' }), component('HOUR', { unit: 'HOURS', amount: '1.5', sequence: 2 }),
    component('MINUTE', { unit: 'MINUTES', amount: '1.5', sequence: 3 }), component('HOURS_INFO', { componentType: 'INFO', unit: 'HOURS', amount: '1.5', sequence: 4 })], input(rates))
  assert.deepEqual(result.components.slice(0, 4).map(row => [row.amount, row.resultUnit]), [['270.00', 'CURRENCY'], ['90.00', 'CURRENCY'], ['1.50', 'CURRENCY'], ['1.50', 'HOURS']])
  assert.equal(result.totalsPreCaps.earnings.amount, '361.50')
  rejected(() => run([component('PAY', { unit: 'DAYS' })]), 'COMPONENT_RATE_REQUIRED')
})

test('facts exact fractions flow into components without using displayed six-place amounts', () => {
  const salary = Object.fromEntries(salaryKeys.map(key => [key, key === 'basicSalary' ? '10000' : '0']))
  const facts = buildPayrollInputFacts({ periodStart: '2026-06-01', periodEnd: '2026-06-30', hireDate: '2020-01-01', coverageStart: '2026-06-21', coverageEnd: '2026-06-30',
    coverageSourceRef: 'coverage:real-builder', salarySegments: [{ from: '2026-06-21', to: '2026-06-30', sourceRef: 'contract:dated', salary }],
    scheduledWorkDates: ['2026-06-01', '2026-06-21', '2026-06-30'], scheduleSourceRef: 'schedule:real-builder' }, settings)
  const values = input({ DAY_RATE: facts.rates.dayRate.exact, HOUR_RATE: facts.rates.hourRate.exact, MINUTE_RATE: facts.rates.minuteRate.exact })
  values.proration.calendar30.value = facts.coverage.earnedCalendar30Factor.exact
  const result = run([component('PAY', { unit: 'DAYS', amount: '3' }), component('MONTH', { sequence: 2, amount: '10000', prorationMode: 'BY_COVERED_DAYS' })], values)
  assert.equal(line(result).amount, '1000.00')
  assert.deepEqual(line(result).steps.find(step => step.stage === 'CONVERT_TO_CURRENCY').value.exact, frac(1000, 1))
  assert.equal(line(result, 'MONTH').amount, '3333.33')
  assert.deepEqual(line(result, 'MONTH').steps.find(step => step.stage === 'PRORATE').value.exact, frac(10000, 3))
})

test('pipeline prorates then min/max then percent cap, preserving every exact intermediate', () => {
  const result = run([component('PAY', { prorationMode: 'BY_COVERED_DAYS', minAmount: '60', maxAmount: '90', capPctOfBase: '0.5', capBaseCode: 'GROSS_SALARY' })], input({ GROSS_SALARY: '9600' }))
  assert.equal(line(result).amount, '48.00')
  assert.deepEqual(line(result).steps.map(step => [step.stage, step.value.rawValue6]), [['RAW', '100.000000'], ['PRORATE', '50.000000'], ['MINIMUM', '60.000000'], ['MAXIMUM', '60.000000'], ['PERCENT_CAP', '48.000000'], ['ROUND', '48.000000']])
})

test('rounded monetary COMP, not raw source, feeds later formulas and mixed-scale totals', () => {
  const result = run([component('FIRST', { amount: '1.25', roundingMode: 'HALF_EVEN', roundingScale: 1 }), formula('SECOND', 'COMP[FIRST] * 10', { sequence: 2 }),
    component('FINE', { sequence: 3, amount: '0.01', roundingMode: 'HALF_UP', roundingScale: 6 })])
  assert.equal(line(result, 'FIRST').amount, '1.2'); assert.equal(line(result, 'SECOND').amount, '12.00')
  assert.equal(result.totalsPreCaps.earnings.amount, '13.210000'); assert.deepEqual(result.totalsPreCaps.earnings.amountExact, frac(1321, 100))
})

test('INFO rounding stays in its unit and negative INFO does not affect financial totals', () => {
  const result = run([component('COUNT_INFO', { componentType: 'INFO', unit: 'COUNT', amount: '-1.25', roundingMode: 'HALF_EVEN', roundingScale: 1 }),
    formula('BONUS', 'ABS(COMP[COUNT_INFO]) * 10', { sequence: 2 })])
  assert.equal(line(result, 'COUNT_INFO').amount, '-1.2'); assert.equal(line(result, 'COUNT_INFO').resultUnit, 'COUNT')
  assert.equal(result.totalsPreCaps.earnings.amount, '12.00')
  rejected(() => run([component('PAY', { componentType: 'INFO', unit: 'MINUTES', minAmount: '5' })]), 'COMPONENT_INFO_LIMIT_UNSUPPORTED')
})

test('negative earning and negative deduction clamp terminally without min resurrection', () => {
  const result = run([formula('NEG_EARN', '-1', { minAmount: '20' }), formula('NEG_DED', '-2', deduction({ minAmount: '30' }))])
  for (const code of ['NEG_EARN', 'NEG_DED']) {
    assert.equal(line(result, code).amount, '0.00'); assert.ok(line(result, code).warnings.some(w => w.code === 'NEGATIVE_FINANCIAL_CLAMPED'))
    assert.equal(line(result, code).steps.some(step => step.stage === 'MINIMUM'), false)
  }
  assert.equal(result.totalsPreCaps.balanceBeforeCaps.amount, '0.00')
})

test('zero factor and zero conversion rate cannot conceal negative raw money before min', () => {
  const values = input({ DAY_RATE: '0' }); values.proration.working.value = '0'
  for (const item of [formula('PAY', '-40', { minAmount: '10', prorationMode: 'BY_COVERED_WORKING_DAYS' }), formula('PAY', '-40', { minAmount: '10', unit: 'DAYS' })]) {
    const result = run([item], values)
    assert.equal(line(result).amount, '0.00'); assert.equal(line(result).steps.some(step => step.stage === 'MINIMUM'), false)
    assert.deepEqual(line(result).steps.find(step => step.stage === 'NEGATIVE_CLAMP').details.original, frac(-40, 1))
  }
})

test('missing employee SKIP bypasses min; ZERO follows normal pipeline and warns', () => {
  const common = { valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', minAmount: '25', prorationMode: 'BY_COVERED_DAYS' }
  const result = run([component('SKIP_VALUE', { ...common, missingFieldBehavior: 'SKIP' }), component('ZERO_VALUE', { ...common, sequence: 2, missingFieldBehavior: 'ZERO' })])
  assert.equal(line(result, 'SKIP_VALUE').amount, '0.00'); assert.equal(line(result, 'SKIP_VALUE').skippedReason, 'MISSING_FIELD_SKIP')
  assert.equal(line(result, 'SKIP_VALUE').steps.some(step => step.stage === 'MINIMUM'), false)
  assert.equal(line(result, 'ZERO_VALUE').amount, '25.00'); assert.ok(line(result, 'ZERO_VALUE').warnings.some(w => w.code === 'MISSING_INPUT'))
})

test('inactive and false conditions skip source reads and min without claiming unsupported ledger output', () => {
  const ledger = component('LEDGER_SKIP', { valueSource: 'LEDGER', amount: null, ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', conditionFormula: 'BASE_SALARY < 0', minAmount: '99', ...deduction() })
  const result = run([component('INACTIVE', { isActive: false, unit: 'DAYS', minAmount: '50' }), ledger], input({ BASE_SALARY: '10' }))
  assert.equal(line(result, 'INACTIVE').skippedReason, 'INACTIVE'); assert.equal(line(result, 'LEDGER_SKIP').skippedReason, 'CONDITION_FALSE')
  rejected(() => run([{ ...ledger, conditionFormula: null }]), 'COMPONENT_SOURCE_UNSUPPORTED')
})

test('missing catalog variable is zero with warning but lazy unread refs have no warning or source provenance', () => {
  const result = run([formula('MISSING', 'BONUS_TOTAL + 5'), formula('LAZY', 'IF(1 = 1, 7, BONUS_TOTAL / BASE_SALARY)', { sequence: 2, prorationMode: 'BY_COVERED_DAYS' })])
  assert.equal(line(result, 'MISSING').amount, '5.00'); assert.ok(line(result, 'MISSING').warnings.some(w => w.code === 'MISSING_INPUT'))
  assert.equal(line(result, 'LAZY').amount, '3.50'); assert.equal(line(result, 'LAZY').warnings.length, 0)
})

test('division by zero follows frozen mode and lazy unselected denominator does not fail', () => {
  const values = input({ BASE_SALARY: '0' })
  const result = run([formula('PAY', '10 / BASE_SALARY', { minAmount: '2' })], values)
  assert.equal(line(result).amount, '2.00'); assert.ok(line(result).warnings.some(w => w.code === 'DIVISION_BY_ZERO'))
  rejected(() => run([formula('PAY', '10 / BASE_SALARY')], values, { ...settings, divisionByZeroMode: 'FAIL_ROW' }), 'DIVISION_BY_ZERO')
  assert.equal(line(run([formula('PAY', 'IF(1 = 1, 5, 10 / BASE_SALARY)')], values, { ...settings, divisionByZeroMode: 'FAIL_ROW' })).amount, '5.00')
})

test('FULL exemption preserves calculated amount and source decision but rejects non-deduction or unexemptible targets', () => {
  const values = input(); values.exemptions = [{ code: 'DEDUCTION', sourceRef: 'approved-exemption:opaque' }]
  const result = run([component('DEDUCTION', deduction({ minAmount: '120' }))], values)
  assert.equal(line(result, 'DEDUCTION').amount, '0.00')
  assert.deepEqual(line(result, 'DEDUCTION').steps.find(step => step.stage === 'FULL_EXEMPTION').details.original, frac(120, 1))
  assert.ok(line(result, 'DEDUCTION').sourceRefs.includes('approved-exemption:opaque'))
  rejected(() => run([component('DEDUCTION')], values), 'COMPONENT_EXEMPTION_INVALID')
  rejected(() => run([component('DEDUCTION', deduction({ exemptible: false }))], values), 'COMPONENT_EXEMPTION_INVALID')
  values.exemptions[0].code = 'UNKNOWN'; rejected(() => run([component('PAY')], values), 'COMPONENT_EXEMPTION_INVALID')
})

test('ordinary balance may be negative before net caps; no policy net limit is executed here', () => {
  const result = run([component('EARN', { amount: '10' }), component('DED', deduction({ amount: '100' }))], input(), { ...settings, minNetGuarantee: 1000, maxDeductionPctOfGross: 10 })
  assert.equal(result.totalsPreCaps.balanceBeforeCaps.amount, '-90.00'); assert.equal(line(result, 'NET').amount, null)
})

test('intrinsic earned money and explicit metadata prevent direct and formula proration twice', () => {
  const values = input({ BONUS_TOTAL: '100', BASE_SALARY: '9000' })
  rejected(() => run([system('PAY', 'BONUS_TOTAL', { prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
  rejected(() => run([formula('PAY', 'BONUS_TOTAL * 2', { prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
  values.sourceMetadata.variables.BASE_SALARY.alreadyProrated = true
  rejected(() => run([formula('PAY', 'BASE_SALARY', { prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
  assert.equal(line(run([formula('PAY', 'IF(1 = 1, 100, BONUS_TOTAL)', { prorationMode: 'BY_COVERED_DAYS' })], values)).amount, '50.00')
})

test('direct period quantities cannot prorate again but their condition or performance ratio does not mark monthly money earned', () => {
  const values = input({ LATE_MINUTES: '0', BASE_SALARY: '9000', WORKED_MINUTES: '180', REQUIRED_MINUTES: '360', ...rates })
  rejected(() => run([system('PAY', 'LATE_MINUTES', { unit: 'MINUTES', prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
  assert.equal(line(run([formula('PAY', 'IF(LATE_MINUTES = 0, BASE_SALARY, 0)', { prorationMode: 'BY_COVERED_DAYS' })], values)).amount, '4500.00')
  assert.equal(line(run([formula('PAY', 'BASE_SALARY * WORKED_MINUTES / REQUIRED_MINUTES', { prorationMode: 'BY_COVERED_DAYS' })], values)).amount, '2250.00')
})

test('already-prorated provenance survives rounded COMP and PERCENT_OF; conditional reference alone does not taint amount', () => {
  const first = component('FIRST', { prorationMode: 'BY_COVERED_DAYS' })
  rejected(() => run([first, formula('SECOND', 'COMP[FIRST]', { sequence: 2, prorationMode: 'BY_COVERED_DAYS' })]), 'COMPONENT_ALREADY_PRORATED')
  rejected(() => run([first, component('SECOND', { sequence: 2, valueSource: 'PERCENT_OF', amount: null, percent: '10', baseCode: 'COMP[FIRST]', prorationMode: 'BY_COVERED_DAYS' })]), 'COMPONENT_ALREADY_PRORATED')
  const result = run([first, component('SECOND', { sequence: 2, conditionFormula: 'COMP[FIRST] > 0', prorationMode: 'BY_COVERED_DAYS' })])
  assert.equal(line(result, 'SECOND').amount, '50.00')
})

test('IF condition-only earned references remain auditable without marking the selected monthly amount as prorated', () => {
  const values = input({ ALLOWANCES_TOTAL: '100', BASE_SALARY: '9000' })
  const result = run([formula('PAY', 'IF(ALLOWANCES_TOTAL > 0, BASE_SALARY, 0)', { prorationMode: 'BY_COVERED_DAYS' })], values)
  assert.equal(line(result).amount, '4500.00'); assert.ok(line(result).sourceRefs.includes('variables:ALLOWANCES_TOTAL'))
  const first = component('FIRST', { prorationMode: 'BY_COVERED_DAYS' })
  assert.equal(line(run([first, formula('SECOND', 'IF(COMP[FIRST] > 0, BASE_SALARY, 0)', { sequence: 2, prorationMode: 'BY_COVERED_DAYS' })], values), 'SECOND').amount, '4500.00')
  rejected(() => run([formula('PAY', 'IF(ALLOWANCES_TOTAL > 0, ALLOWANCES_TOTAL, 0)', { prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
  rejected(() => run([first, formula('SECOND', 'IF(COMP[FIRST] > 0, COMP[FIRST], 0)', { sequence: 2, prorationMode: 'BY_COVERED_DAYS' })], values), 'COMPONENT_ALREADY_PRORATED')
})

test('INFO period count passed through COMP remains a quantity, explicit metadata and applied factors still propagate', () => {
  const count = system('WORK_INFO', 'WORKED_MINUTES', { componentType: 'INFO', unit: 'MINUTES' })
  const calc = formula('PAY', 'BASE_SALARY * COMP[WORK_INFO] / REQUIRED_MINUTES', { sequence: 2, prorationMode: 'BY_COVERED_DAYS' })
  const values = input({ WORKED_MINUTES: '180', REQUIRED_MINUTES: '360', BASE_SALARY: '9000' })
  assert.equal(line(run([count, calc], values)).amount, '2250.00')
  values.sourceMetadata.variables.WORKED_MINUTES.alreadyProrated = true
  rejected(() => run([count, calc], values), 'COMPONENT_ALREADY_PRORATED')
})

test('working factor unavailable is harmless when unused and an explicit error when applied', () => {
  const values = input(); values.proration.working.value = null
  assert.equal(line(run([component()], values)).amount, '100.00')
  rejected(() => run([component('PAY', { prorationMode: 'BY_COVERED_WORKING_DAYS' })], values), 'COMPONENT_PRORATION_UNAVAILABLE')
})

test('approved OT amount is consumed once, informational formula may inspect it and COMP without claiming again', () => {
  const values = input({ OT_AMOUNT: '75' }); values.sourceMetadata.variables.OT_AMOUNT.sourceRef = 'ot:explicit-frozen:75'
  const result = run([system('OT_PAY', 'OT_AMOUNT', { rollupTo: 'overtimeAmount' }), formula('OT_INFO', 'OT_AMOUNT + COMP[OT_PAY]', { componentType: 'INFO', sequence: 2 })], values)
  assert.equal(line(result, 'OT_PAY').amount, '75.00'); assert.equal(line(result, 'OT_INFO').amount, '150.00')
  assert.deepEqual(result.approvedOtConsumedRefs, ['ot:explicit-frozen:75']); assert.equal(result.totalsPreCaps.earnings.amount, '75.00')
  rejected(() => run([system('ONE', 'OT_AMOUNT'), system('TWO', 'OT_AMOUNT', { sequence: 2 })], values), 'COMPONENT_APPROVED_OT_DUPLICATE')
})

test('OT safeguards reject repricing, non-cent values, lossy rounding and a false overtime rollup', () => {
  const values = input({ OT_AMOUNT: '75.25', ...rates, OT_HOURS_TOTAL: '2' })
  for (const extra of [{ multiplier: '2' }, { prorationMode: 'BY_COVERED_DAYS' }, { minAmount: '1' }, { maxAmount: '100' }, { capPctOfBase: '100', capBaseCode: 'GROSS_SALARY' }, { roundingMode: 'HALF_UP', roundingScale: 0 }, deduction()]) {
    rejected(() => run([system('PAY', 'OT_AMOUNT', extra)], values), 'COMPONENT_APPROVED_OT_PROTECTED')
  }
  rejected(() => run([system('PAY', 'OT_HOURS_TOTAL', { unit: 'HOURS' })], values), 'COMPONENT_APPROVED_OT_PROTECTED')
  rejected(() => run([formula('PAY', 'OT_HOURS_TOTAL * HOUR_RATE', { rollupTo: 'overtimeAmount' })], values), 'COMPONENT_APPROVED_OT_PROTECTED')
  rejected(() => run([system('PAY', 'OT_AMOUNT')], input({ OT_AMOUNT: '75.001' })), 'COMPONENT_APPROVED_OT_PROTECTED')
  rejected(() => run([system('PAY', 'OT_AMOUNT')]), 'COMPONENT_APPROVED_OT_SOURCE_REQUIRED')
  assert.equal(line(run([system('PAY', 'OT_AMOUNT', { roundingMode: 'HALF_UP', roundingScale: 0 })], input({ OT_AMOUNT: '75' }))).amount, '75')
})

test('INFO OT hours and amount are unclaimed; false direct OT source does not reserve consumption', () => {
  const result = run([system('OT_SKIP', 'OT_AMOUNT', { conditionFormula: '1 = 0' }), system('OT_INFO', 'OT_AMOUNT', { componentType: 'INFO', sequence: 2 }),
    system('HOURS_INFO', 'OT_HOURS_TOTAL', { componentType: 'INFO', unit: 'HOURS', sequence: 3 })], input({ OT_AMOUNT: '75', OT_HOURS_TOTAL: '2' }))
  assert.deepEqual(result.approvedOtConsumedRefs, []); assert.equal(result.totalsPreCaps.earnings.amount, '0.00')
  assert.equal(line(result, 'HOURS_INFO').amount, '2.00')
})

test('attendance exemptions skip direct deduction before min and preserve unpaid leave', () => {
  const values = input({ IS_ATTENDANCE_EXEMPT: '1', LATE_MINUTES: '60', SHORT_MINUTES: '30', ABSENCE_DAYS: '1', UNPAID_LEAVE_DAYS: '1', ...rates })
  const result = run([system('LATE', 'LATE_MINUTES', { ...deduction(), unit: 'MINUTES', minAmount: '500' }),
    component('ABSENCE', deduction({ sequence: 2, rollupTo: 'absenceDeduction', minAmount: '500' })),
    system('UNPAID', 'UNPAID_LEAVE_DAYS', { ...deduction(), sequence: 3, unit: 'DAYS' }),
    formula('MIXED', 'LATE_MINUTES + SHORT_MINUTES + ABSENCE_DAYS + 10', { sequence: 2 })], values)
  assert.equal(line(result, 'LATE').skippedReason, 'ATTENDANCE_DISABLED'); assert.equal(line(result, 'ABSENCE').amount, '0.00')
  assert.equal(line(result, 'UNPAID').amount, '540.00'); assert.equal(line(result, 'MIXED').amount, '10.00')
})

test('policy skipAttendance and lateDeductionEnabled use the precise separate masks', () => {
  const values = input({ LATE_MINUTES: '60', LATE_INCIDENTS: '1', SHORT_MINUTES: '30', ABSENCE_DAYS: '1', ...rates })
  const items = [component('LATE', deduction({ minAmount: '500', rollupTo: 'latenessDeduction' })),
    system('SHORT', 'SHORT_MINUTES', { ...deduction(), sequence: 2, unit: 'MINUTES', minAmount: '500' }),
    formula('SUM', 'LATE_MINUTES + LATE_INCIDENTS + SHORT_MINUTES + ABSENCE_DAYS')]
  const lateOnly = run(items, values, { ...settings, lateDeductionEnabled: false })
  assert.equal(line(lateOnly, 'LATE').amount, '0.00'); assert.equal(line(lateOnly, 'SHORT').amount, '500.00'); assert.equal(line(lateOnly, 'SUM').amount, '31.00')
  const all = run(items, values, { ...settings, skipAttendance: true })
  assert.equal(line(all, 'SHORT').skippedReason, 'ATTENDANCE_DISABLED'); assert.equal(line(all, 'SUM').amount, '0.00')
})

test('constant and available-rate pairs must agree exactly without inventing absent rates', () => {
  for (const values of [{ BASE_DAYS_BASIS: '31' }, { STANDARD_DAY_HOURS: '8' }]) rejected(() => run([component()], input(values)), 'COMPONENT_CONSTANT_CONFLICT')
  for (const values of [{ DAY_RATE: '300', HOUR_RATE: '100' }, { HOUR_RATE: '10', MINUTE_RATE: '1' }, { DAY_RATE: '300', MINUTE_RATE: '1' }]) {
    rejected(() => run([component()], input(values)), 'COMPONENT_RATE_CONFLICT')
  }
  assert.equal(line(run([component('PAY', { unit: 'DAYS', amount: '1' })], input({ DAY_RATE: frac(1000, 3) }))).amount, '333.33')
  rejected(() => run([component()], input({ DAY_RATE: '-1' })), 'COMPONENT_RATE_INVALID')
})

test('large exact salaries and fractions survive without Number or fixed six-place truncation', () => {
  const result = run([system('PAY', 'BASE_SALARY')], input({ BASE_SALARY: '9007199254740991.91' }))
  assert.equal(line(result).amount, '9007199254740991.91'); assert.deepEqual(line(result).amountExact, frac('900719925474099191', 100))
  const recurring = run([formula('PAY', 'BASE_SALARY * 3')], input({ BASE_SALARY: frac(1, 3) }))
  assert.equal(line(recurring).amount, '1.00')
})

test('strict snapshot rejects unknown keys, numeric JSON money, missing metadata and invalid fractions even unused', () => {
  const samples = [() => input({ FAKE_SALARY: '1' }), () => input({ BASE_SALARY: 0.1 }), () => input({ BASE_SALARY: frac(1, 0) }),
    () => input({ BASE_SALARY: { numerator: '1', denominator: '3', rawValue6: '0.333333' } }), () => input({ BASE_SALARY: 'Infinity' })]
  for (const sample of samples) rejected(() => run([component()], sample()))
  const noMetadata = input({ BASE_SALARY: '10' }); delete noMetadata.sourceMetadata.variables.BASE_SALARY
  rejected(() => run([component()], noMetadata), 'COMPONENT_SOURCE_METADATA_REQUIRED')
  const missingSalary = input(); delete missingSalary.employeeFields.basicSalary
  rejected(() => run([component()], missingSalary), 'COMPONENT_INPUT_REQUIRED')
  const unknownExternal = input(); setValue(unknownExternal, 'externalValues', 'UNKNOWN', '1')
  rejected(() => run([component()], unknownExternal), 'COMPONENT_INPUT_UNKNOWN')
})

test('plain-own contract rejects getters and custom prototypes before invocation', () => {
  let invoked = 0
  const values = input(); Object.defineProperty(values.variables, 'BASE_SALARY', { enumerable: true, get() { invoked++; return '10' } })
  rejected(() => run([component()], values), 'COMPONENT_INPUT_SHAPE'); assert.equal(invoked, 0)
  const custom = input(); Object.setPrototypeOf(custom.variables, { inherited: 'value' })
  rejected(() => run([component()], custom), 'COMPONENT_INPUT_SHAPE')
  const poisoned = input(); Object.defineProperty(poisoned.variables, '__proto__', { value: '1', enumerable: true })
  rejected(() => run([component()], poisoned), 'COMPONENT_INPUT_SHAPE')
})

test('closed shape guards source metadata, factor bounds, source refs, sparse arrays and technical fraction bounds', () => {
  const samples = [input(), input(), input(), input(), input(), input()]
  samples[0].proration.calendar30.value = '1.01'
  samples[1].proration.working.sourceRef = ' '
  samples[2].exemptions = Array(1)
  samples[3].sourceMetadata.variables.BASE_SALARY = { sourceRef: 'ref', alreadyProrated: 'false' }
  samples[4].proration.calendar30.value = frac('1'.repeat(1236), 1)
  samples[5].proration.extra = '0'
  for (const sample of samples) rejected(() => run([component()], sample))
})

test('definition is revalidated, future COMP references never become missing zero, and inputs stay unchanged', () => {
  const values = input({ BASE_SALARY: '100' }), before = copy(values)
  rejected(() => run([formula('FIRST', 'COMP[SECOND]'), component('SECOND', { sequence: 2 })], values))
  const def = definition(component()), prior = copy(def)
  execute(def, settings, values)
  assert.deepEqual(values, before); assert.deepEqual(def, prior)
})

test('shared execution budget stops repeated exact arithmetic across many individually valid components', () => {
  // كسور فيبوناتشي تحتاج خطوات إقليدية كثيرة، وكل قيمة دون4096بت؛ لا حد مبلغ تجاري ولا mocks.
  let previous = 0n, current = 1n
  for (let index = 0; index < 5100; index++) [previous, current] = [current, previous + current]
  const values = input({ BASE_SALARY: frac(previous, current) }); values.proration.calendar30.value = '1'
  const items = Array.from({ length: 199 }, (_, index) => system(`PAY_${index}`, 'BASE_SALARY', { sequence: index + 1, prorationMode: 'BY_COVERED_DAYS' }))
  rejected(() => run(items, values), 'COMPONENT_EVALUATION_LIMIT')
})
