// تمييز المراجع التي تدخل القيمة عن مراجع شروط الاختيار دون تغيير نتيجة اللغة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { compilePayrollFormula: compile, evaluatePayrollFormulaExact: exact, evaluatePayrollFormula: formatted } = require('../src/payroll/payroll-formula-engine')
const defaults = { divisionByZeroMode: 'ZERO_WITH_WARNING', roundingMode: 'HALF_UP' }
function run(expression, input, extra = {}) {
  const catalog = { variables: Object.keys(input.variables ?? {}), components: Object.keys(input.components ?? {}),
    parameters: Object.keys(input.parameters ?? {}), typedDeductions: Object.keys(input.typedDeductions ?? {}), ...extra }
  return exact(compile(expression, catalog), input, defaults)
}

test('a period allowance used only as IF eligibility does not become a value source of the monthly salary branch', () => {
  const result = run('IF(ALLOWANCES_TOTAL > 0, BASE_SALARY, BONUS_TOTAL)', { variables: { ALLOWANCES_TOTAL: '100', BASE_SALARY: '9000', BONUS_TOTAL: '500' } })
  assert.equal(result.exactValue.canonical(), '9000')
  assert.deepEqual(result.valueReferences, ['BASE_SALARY'])
  assert.deepEqual(result.inputs, { ALLOWANCES_TOTAL: '100', BASE_SALARY: '9000' })
})

test('only the selected false branch contributes value while the condition stays in the trace', () => {
  const result = run('IF(ALLOWANCES_TOTAL > 0, BASE_SALARY, BONUS_TOTAL)', { variables: { ALLOWANCES_TOTAL: '0', BASE_SALARY: '9000', BONUS_TOTAL: '500' } })
  assert.equal(result.exactValue.canonical(), '500')
  assert.deepEqual(result.valueReferences, ['BONUS_TOTAL'])
  assert.deepEqual(result.inputs, { ALLOWANCES_TOTAL: '0', BONUS_TOTAL: '500' })
})

test('a cached reference first read as a condition is still tracked when later used numerically', () => {
  const result = run('IF(ALLOWANCES_TOTAL > 0, ALLOWANCES_TOTAL + BASE_SALARY, 0)', { variables: { ALLOWANCES_TOTAL: '100', BASE_SALARY: '9000' } })
  assert.equal(result.exactValue.canonical(), '9100')
  assert.deepEqual(result.valueReferences, ['ALLOWANCES_TOTAL', 'BASE_SALARY'])
})

test('nested boolean short circuits and nested IF choices retain all consumed evidence but no unused values', () => {
  const result = run('IF(X > 0 OR Y > 0, IF(NOT (Z > 0), BASE_SALARY, BONUS_TOTAL), 0)',
    { variables: { X: '1', Y: null, Z: '0', BASE_SALARY: '9000', BONUS_TOTAL: null } })
  assert.equal(result.exactValue.canonical(), '9000')
  assert.deepEqual(result.valueReferences, ['BASE_SALARY'])
  assert.deepEqual(result.inputs, { X: '1', Z: '0', BASE_SALARY: '9000' })
  assert.deepEqual(result.warnings, [])
})

test('a full boolean condition contributes no numeric result references including prior components', () => {
  const result = run('COMP[EARNED] > 0 AND BASE_SALARY > 0', { variables: { BASE_SALARY: '9000' }, components: { EARNED: '500' } }, { kind: 'CONDITION' })
  assert.equal(result.exactValue, true)
  assert.deepEqual(result.valueReferences, [])
  assert.deepEqual(result.inputs, { 'COMP[EARNED]': '500', BASE_SALARY: '9000' })
})

test('ROUND scale controls precision while an actual multiplier parameter contributes to the value', () => {
  const result = run('ROUND(BASE_SALARY * PARAM[FACTOR], PARAM[SCALE])',
    { variables: { BASE_SALARY: '10.15' }, parameters: { FACTOR: '0.5', SCALE: '2' } })
  assert.equal(result.exactValue.canonical(), '5.08')
  assert.deepEqual(result.valueReferences, ['BASE_SALARY', 'PARAM[FACTOR]'])
  assert.equal(result.inputs['PARAM[SCALE]'], '2')
})

test('arithmetic and numerical limits track evaluated numeric operands without algebraic simplification', () => {
  const result = run('CLAMP(COMP[PAY] - TYPED_DEDUCTION[FEE], LOW, HIGH)',
    { variables: { LOW: '0', HIGH: '100' }, components: { PAY: '90' }, typedDeductions: { FEE: '10' } })
  assert.equal(result.exactValue.canonical(), '80')
  assert.deepEqual(result.valueReferences, ['COMP[PAY]', 'HIGH', 'LOW', 'TYPED_DEDUCTION[FEE]'])
})

test('an unselected branch is neither tracked nor read even when it contains an accessor', () => {
  let reads = 0
  const variables = { X: '1', BASE_SALARY: '9000' }
  Object.defineProperty(variables, 'DEAD', { enumerable: true, get() { reads++; throw new Error('unselected getter') } })
  const result = run('IF(X > 0, BASE_SALARY, DEAD)', { variables })
  assert.equal(reads, 0)
  assert.deepEqual(result.valueReferences, ['BASE_SALARY'])
  assert.deepEqual(result.inputs, { X: '1', BASE_SALARY: '9000' })
})

test('public formula output keeps its previous shape and numerical result', () => {
  const compiled = compile('IF(X > 0, X / 3, 0)', { variables: ['X'] })
  const result = formatted(compiled, { variables: { X: '1' } }, { ...defaults, roundingScale: 2 })
  assert.deepEqual(Object.keys(result).sort(), ['inputs', 'rawValue', 'substitutedExpression', 'value', 'warnings'])
  assert.equal(result.value, '0.33')
  assert.equal(result.rawValue, '0.333333')
})
