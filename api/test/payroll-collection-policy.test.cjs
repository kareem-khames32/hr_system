// سياسة تحصيل صريحة محفوظة؛ اختبارات نقية لا تنشئ مسيرًا أو قيدًا أو خدمة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { PAYROLL_COLLECTION_POLICY_VERSION: VERSION, validatePayrollCollectionPolicy: validate, inspectPayrollCollectionPolicy: inspect,
  buildPayrollCollectionNetInput: build, PayrollCollectionPolicyError } = require('../src/payroll/payroll-collection-policy')
const { PayrollCollectionPolicyDto } = require('../src/payroll/payroll-collection-policy.dto')
const { finalizePayrollNet } = require('../src/payroll/payroll-net-finalization')
const { executePayrollComponents } = require('../src/payroll/payroll-component-execution')
const { plainToInstance } = require('../node_modules/class-transformer')
const { validateSync } = require('../node_modules/class-validator')
const clone = value => JSON.parse(JSON.stringify(value))
function component(code, extra = {}) {
  return { code, nameAr: code, componentType: 'DEDUCTION', stage: 3, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: '10.00', fieldPath: null, missingFieldBehavior: null,
    varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null,
    ledgerDirection: null, ledgerPartialPayment: null, minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null,
    roundingMode: null, roundingScale: null, deductionPriority: 1, carryOverEligible: false, rollupTo: null, exemptible: false,
    showOnPayslip: true, isActive: true, ...extra }
}
const earning = () => component('PAY', { componentType: 'EARNING', stage: 1, amount: '100.00', deductionPriority: null })
const net = () => component('NET', { componentType: 'INFO', valueSource: 'SYS_NET', stage: 6, amount: null, deductionPriority: null })
const loan = (code = 'LOAN', extra = {}) => component(code, { valueSource: 'LEDGER', ledgerCategory: 'LOAN', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', amount: null, stage: 5, carryOverEligible: true, ...extra })
const definition = (...rows) => ({ components: [earning(), ...rows, net()], parameters: [], tierSets: [] })
const policy = (classes = [['D', 'OTHER']], order = classes.filter(([, kind]) => !['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'].includes(kind)).map(([code]) => code)) => ({ schemaVersion: VERSION, classifications: classes.map(([componentCode, kind]) => ({ componentCode, kind })), collectionOrder: order })
const evidence = extra => ({ earnedFixedGross: '100.00', sourceRef: 'facts:employee:42:v7', policySourceRef: 'policy:12:version:3:revision:7', ...extra })
function rejected(fn, expected) { assert.throws(fn, error => { assert.ok(error instanceof PayrollCollectionPolicyError, String(error)); if (expected) assert.equal(error.code, expected, error.message); return true }) }

test('classifications normalize by complete definition order while owner collection ranks remain unchanged', () => {
  const def = definition(component('TAX'), component('ATTENDANCE'), loan(), component('RECOVERY', { isActive: false }))
  const raw = policy([['LOAN', 'LOAN'], ['RECOVERY', 'RECOVERY'], ['TAX', 'STATUTORY'], ['ATTENDANCE', 'ATTENDANCE']], ['RECOVERY', 'LOAN', 'ATTENDANCE'])
  const result = validate(def, raw)
  assert.deepEqual(result.classifications.map(row => row.componentCode), ['TAX', 'ATTENDANCE', 'LOAN', 'RECOVERY'])
  assert.deepEqual(result.collectionOrder, ['RECOVERY', 'LOAN', 'ATTENDANCE']); assert.equal(result.schemaVersion, VERSION)
})

test('all nine source classes are accepted with protected classes outside owner ordering', () => {
  const kinds = ['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT', 'ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN', 'OTHER']
  const def = definition(...kinds.map(kind => kind === 'LOAN' ? loan() : component(kind)))
  const result = validate(def, policy(kinds.map(kind => [kind, kind])))
  assert.equal(result.classifications.length, 9); assert.deepEqual(result.collectionOrder, kinds.slice(3))
})

test('inactive deductions remain mandatory and inactive loan definitions retain debt protection', () => {
  const def = definition(component('ACTIVE'), component('INACTIVE', { isActive: false }), loan('DEBT', { isActive: false }))
  const complete = policy([['ACTIVE', 'OTHER'], ['INACTIVE', 'TYPED'], ['DEBT', 'LOAN']])
  assert.equal(validate(def, complete).classifications.length, 3)
  rejected(() => validate(def, policy([['ACTIVE', 'OTHER'], ['DEBT', 'LOAN']])), 'COLLECTION_CLASSIFICATION_INCOMPLETE')
  rejected(() => validate(def, { ...complete, collectionOrder: ['ACTIVE', 'DEBT'] }), 'COLLECTION_ORDER_INVALID')
  rejected(() => validate(def, policy([['ACTIVE', 'OTHER'], ['INACTIVE', 'TYPED'], ['DEBT', 'OTHER']])), 'COLLECTION_LOAN_SOURCE_MISMATCH')
})

test('empty or protected-only collections are valid without inventing reducible priorities', () => {
  const noDeductions = validate(definition(), policy([], []))
  assert.deepEqual(noDeductions.collectionOrder, []); assert.deepEqual(noDeductions.classifications, [])
  const protectedOnly = validate(definition(component('TAX'), component('UNPAID')), policy([['TAX', 'STATUTORY'], ['UNPAID', 'UNPAID_NON_ENTITLEMENT']]))
  assert.deepEqual(protectedOnly.collectionOrder, [])
})

test('each deduction is classified exactly once; unknown, earning, INFO, and duplicate targets are rejected', () => {
  const def = definition(component('D'))
  for (const classes of [[], [['D', 'OTHER'], ['D', 'OTHER']], [['UNKNOWN', 'OTHER']], [['PAY', 'OTHER']], [['NET', 'OTHER']]]) rejected(() => validate(def, policy(classes)))
  rejected(() => validate(def, policy([['D', 'CUSTOM_KIND']])), 'COLLECTION_CLASSIFICATION_INVALID')
})

test('collection order requires every reducible once, excludes protected, and never sorts owner choices', () => {
  const def = definition(component('TAX'), component('A'), component('B')), base = policy([['TAX', 'STATUTORY'], ['A', 'OTHER'], ['B', 'RECOVERY']])
  for (const collectionOrder of [[], ['A'], ['A', 'A'], ['A', 'B', 'TAX'], ['TAX', 'A'], ['A', 'UNKNOWN']]) rejected(() => validate(def, { ...base, collectionOrder }), 'COLLECTION_ORDER_INVALID')
  assert.deepEqual(validate(def, { ...base, collectionOrder: ['B', 'A'] }).collectionOrder, ['B', 'A'])
})

test('LOAN if and only if LEDGER DEBIT; credits remain earnings and cannot be disguised as loans', () => {
  const debit = definition(loan()), ordinary = definition(component('D'))
  rejected(() => validate(debit, policy([['LOAN', 'RECOVERY']])), 'COLLECTION_LOAN_SOURCE_MISMATCH')
  rejected(() => validate(ordinary, policy([['D', 'LOAN']])), 'COLLECTION_LOAN_SOURCE_MISMATCH')
  const credit = definition(component('CREDIT', { componentType: 'EARNING', valueSource: 'LEDGER', ledgerDirection: 'CREDIT' }))
  assert.equal(validate(credit, policy([], [])).classifications.length, 0)
  rejected(() => validate(credit, policy([['CREDIT', 'LOAN']])), 'COLLECTION_CLASSIFICATION_INVALID')
})

test('carry eligibility comes from the definition and matches the NET guard for attendance/protected/debt', () => {
  for (const kind of ['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT', 'ATTENDANCE']) rejected(() => validate(definition(component('D', { carryOverEligible: true })), policy([['D', kind]])), 'COLLECTION_CARRY_INVALID')
  rejected(() => validate(definition(loan('LOAN', { carryOverEligible: false })), policy([['LOAN', 'LOAN']])), 'COLLECTION_CARRY_INVALID')
  for (const kind of ['RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'OTHER']) for (const carryOverEligible of [true, false]) assert.equal(validate(definition(component('D', { carryOverEligible })), policy([['D', kind]])).classifications[0].kind, kind)
})

test('historical missing differs from invalid; malformed stored values never fall back to a policy', () => {
  const def = definition(component('D'))
  for (const value of [undefined, null]) assert.deepEqual(inspect(def, value), { state: 'MISSING', collection: null, issues: [] })
  for (const raw of [{}, '', 'null', false, 0, [], { ...policy(), schemaVersion: 'UNKNOWN' }]) {
    const result = inspect(def, raw); assert.equal(result.state, 'INVALID'); assert.equal(result.collection, null); assert.equal(result.issues.length, 1); assert.ok(result.issues[0].code.startsWith('COLLECTION_'))
  }
  assert.equal(inspect(def, policy()).state, 'COMPLETE')
})

test('definition edits invalidate stale classifications, order, source mapping, or carry policy', () => {
  const original = definition(component('D')), stored = policy()
  assert.equal(inspect(original, stored).state, 'COMPLETE')
  for (const def of [definition(component('D'), component('NEW')), definition(), definition(component('D', { componentType: 'INFO' })), definition(loan('D'))]) assert.equal(inspect(def, stored).state, 'INVALID')
  const attendance = policy([['D', 'ATTENDANCE']]); assert.equal(inspect(definition(component('D', { carryOverEligible: true })), attendance).state, 'INVALID')
})

test('definition-only ordering edits canonicalize classifications but never overwrite collection ranks', () => {
  const stored = policy([['A', 'OTHER'], ['B', 'RECOVERY']], ['B', 'A'])
  const before = validate(definition(component('A'), component('B')), stored), after = validate(definition(component('B'), component('A')), stored)
  assert.deepEqual(before.classifications.map(row => row.componentCode), ['A', 'B']); assert.deepEqual(after.classifications.map(row => row.componentCode), ['B', 'A'])
  assert.deepEqual(before.collectionOrder, after.collectionOrder)
})

test('builder derives evidence and carry flags from stored definition and preserves exact fractions', () => {
  const def = definition(component('D', { carryOverEligible: true }), loan()), collection = policy([['LOAN', 'LOAN'], ['D', 'RECOVERY']], ['LOAN', 'D'])
  const result = build(def, collection, evidence({ earnedFixedGross: { numerator: '2', denominator: '6' } }))
  assert.deepEqual(result.earnedFixedGross, { numerator: '1', denominator: '3' }); assert.deepEqual(result.collectionOrder, ['LOAN', 'D'])
  assert.equal(result.classifications[0].componentCode, 'D'); assert.equal(result.classifications[0].carryOverEligible, true)
  for (const item of result.classifications) assert.equal(item.sourceRef, evidence().policySourceRef)
  assert.equal(result.collectionOrderSourceRef, evidence().policySourceRef); assert.equal(result.sourceRef, evidence().sourceRef)
})

test('builder exact huge decimal cents and formatted 60-digit bases never pass through Number', () => {
  const def = definition(component('D')), collection = policy()
  assert.deepEqual(build(def, collection, evidence({ earnedFixedGross: '9007199254740991.91' })).earnedFixedGross, { numerator: '900719925474099191', denominator: '100' })
  const huge = '9'.repeat(60)
  assert.deepEqual(build(def, collection, evidence({ earnedFixedGross: `${huge}.00` })).earnedFixedGross, { numerator: huge, denominator: '1' })
})

test('builder rejects supplied classification evidence, flags, financial Numbers, and malformed evidence', () => {
  const def = definition(component('D')), stored = policy()
  for (const field of ['sourceRef', 'carryOverEligible', 'priority']) { const collection = clone(stored); collection.classifications[0][field] = true; rejected(() => build(def, collection, evidence()), 'COLLECTION_FIELD_UNKNOWN') }
  for (const amount of [100, null, '-1', '.5', 'NaN', '1e5', { numerator: '1', denominator: '0' }, { numerator: '-1', denominator: '2' }, { numerator: '1', denominator: '2', rawValue6: '0.5' }]) rejected(() => build(def, stored, evidence({ earnedFixedGross: amount })))
  for (const key of ['earnedFixedGross', 'sourceRef', 'policySourceRef']) { const input = evidence(); delete input[key]; rejected(() => build(def, stored, input), 'COLLECTION_FIELD_REQUIRED') }
  rejected(() => build(def, stored, { ...evidence(), collectionOrderSourceRef: 'forged' }), 'COLLECTION_FIELD_UNKNOWN')
  rejected(() => build(def, stored, evidence({ policySourceRef: ' ' })), 'COLLECTION_SOURCE_REQUIRED')
  rejected(() => build(def, stored, evidence({ sourceRef: 'x'.repeat(201) })), 'COLLECTION_SOURCE_REQUIRED')
})

test('strict version, keys, code lengths, and collection scalar types are enforced', () => {
  const def = definition(component('D')), original = policy()
  for (const mutate of [raw => { raw.schemaVersion = 'LEGACY' }, raw => { delete raw.schemaVersion }, raw => { raw.classifications = null }, raw => { raw.collectionOrder = 'D' }, raw => { raw.order = [] }, raw => { raw.classifications[0].componentCode = 'd' }, raw => { raw.classifications[0].componentCode = 'A'.repeat(41) }, raw => { raw.classifications[0].kind = null }]) { const raw = clone(original); mutate(raw); rejected(() => validate(def, raw)) }
})

test('definition shape, duplicates, metadata enums and ledger direction are validated before use', () => {
  for (const mutate of [def => { delete def.components[1].carryOverEligible }, def => { def.components[1].carryOverEligible = 'false' }, def => { def.components[1].isActive = 1 }, def => { def.components[1].componentType = 'CUSTOM' }, def => { def.components[1].valueSource = 'CUSTOM' }, def => { def.components[1].ledgerDirection = 'DEBIT' }, def => { def.components[1].unknown = 1 }, def => { def.components.push(clone(def.components[1])) }, def => { def.other = [] }]) { const def = definition(component('D')); mutate(def); rejected(() => validate(def, policy())) }
  const invalidLoan = definition(loan()); invalidLoan.components[1].ledgerDirection = null
  rejected(() => validate(invalidLoan, policy([['LOAN', 'LOAN']])), 'COLLECTION_DEFINITION_INVALID')
})

test('accessors anywhere in raw policy, definition, or evidence are rejected without invocation', () => {
  const def = definition(component('D')), stored = policy(); let reads = 0
  const raw = clone(stored); Object.defineProperty(raw.classifications[0], 'kind', { enumerable: true, get() { reads++; return 'OTHER' } })
  rejected(() => validate(def, raw), 'COLLECTION_SHAPE_INVALID'); assert.equal(reads, 0)
  const definitionAccessor = clone(def); Object.defineProperty(definitionAccessor.components[1], 'carryOverEligible', { enumerable: true, get() { reads++; return false } })
  rejected(() => validate(definitionAccessor, stored), 'COLLECTION_SHAPE_INVALID'); assert.equal(reads, 0)
  const facts = evidence(); Object.defineProperty(facts, 'earnedFixedGross', { enumerable: true, get() { reads++; return '100' } })
  rejected(() => build(def, stored, facts), 'COLLECTION_SHAPE_INVALID'); assert.equal(reads, 0)
  assert.equal(inspect(def, raw).state, 'INVALID'); assert.equal(reads, 0)
})

test('custom prototypes, sparse arrays, symbols and hidden keys are closed on every public path', () => {
  const def = definition(component('D')), stored = policy()
  rejected(() => validate(def, Object.assign(Object.create({ polluted: true }), stored)), 'COLLECTION_SHAPE_INVALID')
  const sparse = clone(stored); sparse.collectionOrder = Array(1); rejected(() => validate(def, sparse), 'COLLECTION_SHAPE_INVALID')
  for (const key of [Symbol('hidden'), '__proto__', 'constructor', 'prototype']) { const raw = clone(stored); Object.defineProperty(raw, key, { value: {}, enumerable: true }); rejected(() => validate(def, raw), 'COLLECTION_SHAPE_INVALID') }
  const hidden = clone(stored); Object.defineProperty(hidden, 'hidden', { value: true }); rejected(() => validate(def, hidden), 'COLLECTION_SHAPE_INVALID')
  rejected(() => build(def, stored, Object.assign(Object.create({ sourceRef: 'fake' }), evidence())), 'COLLECTION_SHAPE_INVALID')
})

test('explicit technical limits reject excessive components, keys, text and cyclic nesting', () => {
  const def = definition(component('D')), stored = policy()
  rejected(() => validate({ ...def, components: Array.from({ length: 201 }, (_, i) => component(`D${i}`)) }, stored), 'COLLECTION_LIST_INVALID')
  rejected(() => validate(def, { ...stored, collectionOrder: Array(201).fill('D') }), 'COLLECTION_LIST_INVALID')
  rejected(() => validate(def, Object.fromEntries(Array.from({ length: 65 }, (_, i) => [`key${i}`, null]))), 'COLLECTION_INPUT_LIMIT')
  rejected(() => validate(def, { ...stored, schemaVersion: 'x'.repeat(20001) }), 'COLLECTION_INPUT_LIMIT')
  const cyclic = clone(stored); cyclic.classifications[0].cycle = cyclic
  rejected(() => validate(def, cyclic), 'COLLECTION_INPUT_LIMIT')
})

test('DTO requires full shape and exact enums, with raw unknown-field rejection delegated to strict helper', () => {
  assert.equal(validateSync(plainToInstance(PayrollCollectionPolicyDto, policy())).length, 0)
  for (const raw of [{}, { ...policy(), schemaVersion: 'other' }, { ...policy(), classifications: [{ componentCode: 'd', kind: 'OTHER' }] }, { ...policy(), collectionOrder: ['D', 'D'] }, { ...policy(), classifications: null }]) assert.ok(validateSync(plainToInstance(PayrollCollectionPolicyDto, raw)).length > 0)
  const unknown = { ...policy(), versionNo: 900 }; rejected(() => validate(definition(component('D')), unknown), 'COLLECTION_FIELD_UNKNOWN')
})

test('stored collection builds the actual NET input and user rank controls a full pure financial finalization', () => {
  const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
    divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: 50, minNetGuarantee: null, netFloorPct: null,
    carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
  const def = definition(component('ATT', { amount: '40.00' }), component('RECOVERY', { amount: '30.00', sequence: 2 }))
  const collection = validate(def, policy([['ATT', 'ATTENDANCE'], ['RECOVERY', 'RECOVERY']], ['RECOVERY', 'ATT']))
  const inputs = { variables: {}, employeeFields: Object.fromEntries(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'].map(key => [key, null])), externalValues: {}, sourceMetadata: { variables: {}, employeeFields: {}, externalValues: {} }, proration: { calendar30: { value: '1', sourceRef: 'coverage' }, working: { value: '1', sourceRef: 'schedule' } }, exemptions: [] }
  const execution = executePayrollComponents(def, settings, inputs), net = finalizePayrollNet(execution, settings, build(def, collection, evidence()))
  assert.equal(net.netPay.amount, '50.00'); assert.equal(net.allocations[0].componentCode, 'RECOVERY'); assert.equal(net.allocations[0].collectedAmount, '30.00')
  assert.equal(net.allocations[1].droppedAmount, '20.00'); assert.equal(net.normalizedInput.collectionOrderSourceRef, evidence().policySourceRef)
})

test('normalized, inspected and built outputs are deeply frozen, JSON-safe and leave caller objects untouched', () => {
  const def = definition(component('D')), collection = policy(), facts = evidence(), before = JSON.stringify({ def, collection, facts })
  const normalized = validate(def, collection), inspected = inspect(def, collection), built = build(def, collection, facts)
  assert.equal(JSON.stringify({ def, collection, facts }), before)
  for (const result of [normalized, inspected, built]) { assert.ok(Object.isFrozen(result)); assert.doesNotThrow(() => JSON.stringify(result)) }
  assert.ok(Object.isFrozen(normalized.classifications[0])); assert.ok(Object.isFrozen(inspected.issues)); assert.ok(Object.isFrozen(built.earnedFixedGross)); assert.ok(Object.isFrozen(built.collectionOrder))
  assert.equal(Object.isFrozen(collection), false); assert.equal(Object.isFrozen(facts), false)
})
