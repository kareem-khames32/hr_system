// تحقق نقي للكتالوج والاعتماديات: لا تطبيق أو قاعدة بيانات أو إعدادات بيئة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
const catalog = require('../src/payroll/payroll-formula-catalog.ts')
const { validatePayrollComponentOrder: validate } = require('../src/payroll/payroll-component-order.ts')
const component = (code, stage = 1, sequence = 1, dependencies = [], isActive = true) => ({ code, stage, sequence, isActive, dependencies })
const net = (dependencies = [], sequence = 1) => component('NET', 6, sequence, dependencies)
const hasError = (result, code) => result.errors.some(error => error.code === code)

test('PL-04 catalog includes every SRS scalar plus immutable approved OT amount, with versioned descriptions', () => {
  const expected = ['BASE_SALARY', 'ALLOWANCES_TOTAL', 'GROSS_SALARY', 'BASE_DAYS_BASIS', 'PERIOD_DAYS', 'COVERED_DAYS',
    'DAY_RATE', 'STANDARD_DAY_HOURS', 'HOUR_RATE', 'MINUTE_RATE', 'LATE_MINUTES', 'LATE_INCIDENTS', 'SHORT_MINUTES',
    'ABSENCE_DAYS', 'EXCUSED_ABSENCE_DAYS', 'UNPAID_LEAVE_DAYS', 'PAID_LEAVE_DAYS', 'PRESENT_DAYS', 'WORKED_MINUTES',
    'REQUIRED_MINUTES', 'OT_HOURS_REGULAR', 'OT_HOURS_RESTDAY', 'OT_HOURS_HOLIDAY', 'OT_HOURS_NIGHT', 'OT_HOURS_TOTAL',
    'OT_AMOUNT', 'BONUS_TOTAL', 'TYPED_DEDUCTIONS_TOTAL', 'ADVANCE_BALANCE', 'ADVANCE_DUE_THIS_PERIOD',
    'DEBT_DUE_THIS_PERIOD', 'IS_ATTENDANCE_EXEMPT', 'SENIORITY_MONTHS']
  assert.equal(catalog.PAYROLL_SRS_CATALOG_VERSION, 'SRS_V1_20260913')
  assert.deepEqual([...catalog.PAYROLL_SRS_VARIABLE_CODES].sort(), expected.sort())
  assert.equal(new Set(catalog.PAYROLL_SRS_VARIABLE_CODES).size, 33)
  for (const variable of catalog.PAYROLL_SRS_VARIABLES) {
    assert.ok(variable.nameAr.length && variable.unit.length && variable.description.length)
    assert.equal(variable.sourceAvailability, 'INPUT_SNAPSHOT_REQUIRED'); assert.equal(Object.isFrozen(variable), true)
  }
  assert.equal(Object.isFrozen(catalog.PAYROLL_SRS_VARIABLES), true)
  assert.match(catalog.PAYROLL_SRS_VARIABLES.find(variable => variable.code === 'OT_AMOUNT').description, /لا تعيد السياسة تسعيره/)
  assert.match(catalog.PAYROLL_SRS_VARIABLES.find(variable => variable.code === 'BASE_SALARY').description, /تاريخ رواتب مؤرخًا/)
  assert.match(catalog.PAYROLL_SRS_VARIABLES.find(variable => variable.code === 'BASE_DAYS_BASIS').description, /30/)
})

test('PL-04 reference namespaces and legacy aliases are excluded from scalar symbols', () => {
  assert.deepEqual(catalog.PAYROLL_SRS_REFERENCE_NAMESPACES.map(namespace => namespace.code), ['COMP', 'PARAM', 'TYPED_DEDUCTION'])
  for (const name of ['COMP', 'PARAM', 'TYPED_DEDUCTION', 'BASIC', 'GROSS', 'OT_HOURS', 'LATE_DAYS', 'ABSENT_DAYS']) {
    assert.equal(catalog.PAYROLL_SRS_VARIABLE_CODES.includes(name), false, name)
  }
})

test('PL-04 symbols reject reserved names, malformed codes, duplicates and component-parameter collisions', () => {
  for (const code of [...catalog.PAYROLL_SRS_VARIABLE_CODES, ...catalog.PAYROLL_SRS_FUNCTION_CODES,
    ...catalog.PAYROLL_SRS_LOGICAL_KEYWORDS, 'COMP', 'PARAM', 'TYPED_DEDUCTION']) {
    for (const group of ['components', 'parameters', 'typedDeductions']) assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: [code] }), /محجوز/, code)
  }
  for (const code of ['lower', '_FIRST', '1FIRST', 'A B', 'A-B', 'A.B', 'A[0]', 'A'.repeat(41), '', null, 3, '__proto__', 'toString']) {
    assert.throws(() => catalog.validatePayrollFormulaSymbols({ components: [code] }), /غير صالح/, String(code))
  }
  for (const group of ['components', 'parameters', 'typedDeductions']) {
    assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: ['CUSTOM', 'CUSTOM'] }), /مكرر/)
    assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: null }), /غير صالحة/)
    assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: 'CUSTOM' }), /غير صالحة/)
  }
  assert.throws(() => catalog.validatePayrollFormulaSymbols({ components: ['CUSTOM'], parameters: ['CUSTOM'] }), /كبند ومعامل/)
  assert.throws(() => catalog.validatePayrollFormulaSymbols(null), /كائن/)
  assert.throws(() => catalog.validatePayrollFormulaSymbols([]), /كائن/)
})

test('PL-04 accepts independent typed references, valid boundary codes and system NET only as a component', () => {
  assert.doesNotThrow(() => catalog.validatePayrollFormulaSymbols({ components: ['QUALITY', 'NET', 'A'.repeat(40)], parameters: ['QUALITY_FACTOR'], typedDeductions: ['QUALITY'] }))
  for (const group of ['parameters', 'typedDeductions']) assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: ['NET'] }), /محجوز/)
})

test('PL-04 symbol groups form a closed own-property contract with a 200-symbol technical bound', () => {
  for (const group of ['components', 'parameters', 'typedDeductions']) {
    const codes = Array.from({ length: 200 }, (_, index) => `CUSTOM_${index}`)
    assert.doesNotThrow(() => catalog.validatePayrollFormulaSymbols({ [group]: codes }))
    assert.throws(() => catalog.validatePayrollFormulaSymbols({ [group]: [...codes, 'EXTRA'] }), /200/)
  }
  for (const input of [{ unknown: [] }, { constructor: [] }, { toString: [] }, { [Symbol('parameters')]: [] }]) {
    assert.throws(() => catalog.validatePayrollFormulaSymbols(input), /غير معرّفة/)
  }
  assert.throws(() => catalog.validatePayrollFormulaSymbols(Object.create({ parameters: ['BASE_SALARY'] })), /موروثة/)
  const noPrototype = Object.create(null); noPrototype.components = ['NET']
  assert.doesNotThrow(() => catalog.validatePayrollFormulaSymbols(noPrototype))
})

test('PL-06 explicit stages and previous references give an executable active order without input mutation', () => {
  const items = [net(['LOAN'], 4), component('BONUS', 2, 5, ['SALARY']), component('SALARY'),
    component('LATE_DED', 3, 3, ['SALARY']), component('QUALITY', 4, 3), component('LOAN', 5, 9, ['QUALITY']),
    component('ARCHIVED_INFO', 2, 8, [], false)]
  const before = JSON.stringify(items), result = validate(items)
  assert.equal(result.ok, true); assert.deepEqual(result.errors, []); assert.deepEqual(result.warnings, [])
  assert.deepEqual(result.order, ['SALARY', 'BONUS', 'LATE_DED', 'QUALITY', 'LOAN', 'NET'])
  assert.ok(result.suggestedSequences.some(item => item.code === 'ARCHIVED_INFO'))
  assert.equal(JSON.stringify(items), before)
})

test('PL-06 two-node and indirect cycles report the complete deterministic repeated-endpoint path', () => {
  for (const items of [[component('A', 1, 1, ['B']), component('B', 1, 2, ['A']), net()],
    [component('C', 1, 3, ['A']), component('A', 1, 1, ['B']), component('B', 1, 2, ['C']), net()]]) {
    const result = validate(items, { autoOrder: true }), cycle = result.errors.find(error => error.code === 'DEPENDENCY_CYCLE')
    assert.equal(result.ok, false); assert.ok(cycle); assert.equal(cycle.path[0], cycle.path[cycle.path.length - 1])
    assert.equal(cycle.path.length, items.length); assert.match(cycle.message, /A → B/)
    assert.deepEqual(result.order, []); assert.deepEqual(result.suggestedSequences, [])
    assert.deepEqual(validate([...items].reverse(), { autoOrder: true }), result)
  }
})

test('PL-06 self dependency reports A → A and cannot be auto-corrected', () => {
  const result = validate([component('A', 1, 1, ['A']), net()], { autoOrder: true })
  assert.equal(result.ok, false)
  assert.deepEqual(result.errors.find(error => error.code === 'DEPENDENCY_CYCLE').path, ['A', 'A'])
})

test('PL-06 manual forward reference names both components and offers a within-stage correction', () => {
  const result = validate([component('A', 1, 3, ['B']), component('B', 1, 7), net()])
  assert.equal(result.ok, false); assert.ok(hasError(result, 'FORWARD_REFERENCE')); assert.deepEqual(result.order, [])
  assert.match(result.errors.find(error => error.code === 'FORWARD_REFERENCE').message, /A.*B/)
  assert.deepEqual(result.suggestedSequences.slice(0, 2), [{ code: 'B', stage: 1, sequence: 1 }, { code: 'A', stage: 1, sequence: 2 }])
})

test('PL-06 auto-order fixes within-stage sequence only and warns without activating or removing anything', () => {
  const items = [component('A', 2, 1, ['B']), component('B', 2, 5), component('DISABLED', 2, 3, [], false), net(['A'])]
  const before = JSON.stringify(items), result = validate(items, { autoOrder: true })
  assert.equal(result.ok, true); assert.ok(result.warnings.some(warning => warning.code === 'AUTO_ORDER_APPLIED'))
  assert.deepEqual(result.order, ['B', 'A', 'NET']); assert.equal(result.suggestedSequences.length, items.length)
  for (const proposal of result.suggestedSequences) assert.equal(proposal.stage, items.find(item => item.code === proposal.code).stage)
  assert.equal(JSON.stringify(items), before)
  const applied = items.map(item => ({ ...item, sequence: result.suggestedSequences.find(proposal => proposal.code === item.code).sequence }))
  assert.equal(validate(applied).ok, true)
})

test('PL-06 forward references across stages are rejected even with auto-order', () => {
  for (const autoOrder of [false, true]) {
    const result = validate([component('EARNING', 2, 1, ['LATE_DED']), component('LATE_DED', 3), net()], { autoOrder })
    assert.equal(result.ok, false); assert.ok(hasError(result, 'CROSS_STAGE_FORWARD_REFERENCE'))
    assert.match(result.errors.find(error => error.code === 'CROSS_STAGE_FORWARD_REFERENCE').message, /EARNING.*LATE_DED/)
    assert.deepEqual(result.suggestedSequences, [])
  }
})

test('PL-06 missing and disabled dependencies are explicit failures for active and disabled dependents', () => {
  for (const isActive of [false, true]) for (const autoOrder of [false, true]) {
    const result = validate([component('A', 1, 3, ['MISSING', 'OFF'], isActive), component('OFF', 1, 1, [], false), net()], { autoOrder })
    assert.equal(result.ok, false); assert.ok(hasError(result, 'MISSING_DEPENDENCY')); assert.ok(hasError(result, 'DISABLED_DEPENDENCY'))
    assert.match(result.errors.find(error => error.code === 'DISABLED_DEPENDENCY').message, /A.*OFF/)
    assert.deepEqual(result.order, []); assert.deepEqual(result.suggestedSequences, [])
  }
})

test('PL-06 sequence duplicates are rejected manually and deterministically renumbered in auto mode', () => {
  const items = [component('B', 1, 1), component('A', 1, 1), component('SECOND_STAGE', 2, 1), net()]
  const manual = validate(items); assert.equal(manual.ok, false); assert.ok(hasError(manual, 'DUPLICATE_SEQUENCE'))
  const automatic = validate(items, { autoOrder: true })
  assert.equal(automatic.ok, true); assert.deepEqual(automatic.order, ['A', 'B', 'SECOND_STAGE', 'NET'])
  assert.deepEqual(validate([...items].reverse(), { autoOrder: true }), automatic)
})

test('PL-06 duplicate component and dependency codes are never silently removed', () => {
  for (const autoOrder of [false, true]) {
    assert.ok(hasError(validate([component('A'), component('A', 2), net()], { autoOrder }), 'DUPLICATE_COMPONENT_CODE'))
    assert.ok(hasError(validate([component('A'), component('B', 1, 2, ['A', 'A']), net()], { autoOrder }), 'DUPLICATE_DEPENDENCY'))
  }
})

test('PL-06 NET is mandatory, active, in stage six and last; complete empty graphs fail', () => {
  assert.ok(hasError(validate([]), 'NET_REQUIRED'))
  assert.ok(hasError(validate([component('A')]), 'NET_REQUIRED'))
  assert.ok(hasError(validate([{ ...net(), isActive: false }]), 'NET_DISABLED'))
  assert.ok(hasError(validate([{ ...net(), stage: 5 }]), 'NET_STAGE_INVALID'))
  const items = [net([], 1), component('CAP_INFO', 6, 2)]
  assert.ok(hasError(validate(items), 'NET_NOT_LAST'))
  const automatic = validate(items, { autoOrder: true })
  assert.equal(automatic.ok, true); assert.deepEqual(automatic.order, ['CAP_INFO', 'NET'])
  assert.equal(automatic.suggestedSequences.find(item => item.code === 'NET').sequence, 2)
})

test('PL-06 no component can depend on final NET even if its manual sequence suggests otherwise', () => {
  for (const autoOrder of [false, true]) {
    const result = validate([net([], 1), component('AFTER_NET', 6, 2, ['NET'])], { autoOrder })
    assert.equal(result.ok, false); assert.ok(hasError(result, 'NET_FORWARD_REFERENCE')); assert.deepEqual(result.order, [])
  }
})

test('PL-06 hostile shapes, names, stage/sequence numbers and options return structured errors', () => {
  for (const input of [null, {}, 'A']) assert.ok(hasError(validate(input), 'INVALID_COMPONENTS'))
  for (const item of [null, [], 'A']) assert.ok(hasError(validate([item, net()]), 'INVALID_COMPONENT'))
  for (const code of ['DAY_RATE', 'COMP', 'ROUND', 'lower', 'A'.repeat(41)]) assert.ok(hasError(validate([component(code), net()]), 'INVALID_COMPONENT_CODE'))
  for (const stage of [0, 7, 1.2, NaN, Infinity, '1']) assert.ok(hasError(validate([component('A', stage), net()]), 'INVALID_STAGE'))
  for (const sequence of [0, -1, 1.2, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1']) assert.ok(hasError(validate([component('A', 1, sequence), net()]), 'INVALID_SEQUENCE'))
  for (const isActive of [null, 0, 'true']) assert.ok(hasError(validate([{ ...component('A'), isActive }, net()]), 'INVALID_ACTIVE_FLAG'))
  for (const options of [null, [], 'yes', { autoOrder: 'true' }, { autoOrder: null }]) assert.ok(hasError(validate([net()], options), 'INVALID_OPTIONS'))
  assert.ok(hasError(validate([{ ...component('A'), dependencies: null }, net()]), 'INVALID_DEPENDENCIES'))
  assert.ok(hasError(validate([component('A', 1, 1, ['lower']), net()]), 'INVALID_DEPENDENCY_CODE'))
})

test('PL-06 limit boundaries permit a 200-node chain and reject oversized component or dependency lists', () => {
  const items = Array.from({ length: 199 }, (_, index) => component(`C${index}`, 1, index + 1, index ? [`C${index - 1}`] : []))
  items.push(net(['C198']))
  const result = validate(items); assert.equal(result.ok, true); assert.equal(result.order.length, 200)
  assert.ok(hasError(validate([...items, component('EXTRA', 2)]), 'COMPONENT_LIMIT'))
  assert.ok(hasError(validate([component('A', 1, 1, Array.from({ length: 201 }, (_, index) => `C${index}`)), net()]), 'INVALID_DEPENDENCIES'))
})

test('PL-06 deterministic branching DAG proposals remain identical across input and dependency permutations', () => {
  const items = [component('A', 1, 8, ['B', 'C']), component('B', 1, 7, ['D']), component('C', 1, 2, ['D']), component('D', 1, 9),
    component('LATE_DED', 3, 4, ['A']), component('LOAN', 5, 8, ['LATE_DED']), net(['A', 'LOAN'])]
  const result = validate(items, { autoOrder: true }); assert.equal(result.ok, true)
  for (let offset = 0; offset < items.length; offset++) {
    const rotated = [...items.slice(offset), ...items.slice(0, offset)].map(item => ({ ...item, dependencies: [...item.dependencies].reverse() }))
    assert.deepEqual(validate(rotated, { autoOrder: true }), result)
  }
  const positions = new Map(result.order.map((code, index) => [code, index]))
  for (const item of items) for (const dependency of item.dependencies) assert.ok(positions.get(dependency) < positions.get(item.code))
  const reapplied = items.map(item => ({ ...item, sequence: result.suggestedSequences.find(proposal => proposal.code === item.code).sequence }))
  assert.deepEqual(validate(reapplied, { autoOrder: true }).warnings, [])
})
