// محول نقي لمصادر صريحة غير موثقة؛ لا AppModule أو SQL أو خدمات حية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { preparePayrollLedgerSources: prepare, resolvePayrollLedgerComponent: resolve, allocatePreparedPayrollLedgerComponent: allocate,
  PayrollComponentLedgerSourceError: LedgerError, PAYROLL_COMPONENT_LEDGER_SOURCE_VERSION: version } = require('../src/payroll/payroll-component-ledger-source')
const policy = { defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: 500, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const copy = value => JSON.parse(JSON.stringify(value))
function component(code = 'LOAN', extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'DEDUCTION', stage: 5, sequence: 1, valueSource: 'LEDGER',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: null, fieldPath: null, missingFieldBehavior: null,
    varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: 'loan',
    ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', minAmount: null, maxAmount: null, capPctOfBase: null,
    capBaseCode: null, roundingMode: null, roundingScale: null, deductionPriority: 1, carryOverEligible: true,
    rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
const credit = (extra = {}) => component('CREDIT_ENTRY', { componentType: 'EARNING', stage: 2, ledgerCategory: '*', ledgerDirection: 'CREDIT', deductionPriority: null, carryOverEligible: false, ...extra })
const net = () => component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', ledgerCategory: null, ledgerDirection: null,
  ledgerPartialPayment: null, deductionPriority: null, carryOverEligible: false, exemptible: false })
const definition = (...components) => ({ components: [...components, net()], parameters: [], tierSets: [] })
function installment(extra = {}) {
  return { componentCode: 'LOAN', category: 'loan', installmentRef: 'i1', loanRef: 'l1', sourceRef: 'explicit:loan-request',
    sourceRevision: 1, sequence: 1, originalDuePeriod: '2026-09', duePeriod: '2026-09', remainingAmount: '1666.00', priority: 1, extensionPeriod: null, ...extra }
}
function obligation(extra = {}) {
  return { componentCode: 'CREDIT_ENTRY', entryRef: 'o1', category: 'bonus', direction: 'CREDIT', sourceRef: 'explicit:credit-request',
    sourceRevision: 1, duePeriod: '2026-09', remainingAmount: '300.00', priority: 1, sequence: 1, ...extra }
}
const input = (extra = {}) => ({ period: '2026-09', nextPeriod: '2026-10', installments: [installment()], obligations: [], manualDeferrals: [], ...extra })
const build = (values = input(), components = [component()], settings = policy) => prepare(definition(...components), settings, values)
const code = suffix => `COMPONENT_LEDGER_${suffix}`
function rejected(operation, expected) {
  assert.throws(operation, error => { assert.ok(error instanceof LedgerError, String(error)); if (expected) assert.equal(error.code, expected, error.message); return true })
}

test('due preCaps sources are exact and contain no budget, collection or financial posting claims', () => {
  const prepared = build(), result = resolve(prepared, 'LOAN')
  assert.equal(prepared.version, version); assert.equal(prepared.sourceValidation, 'CALLER_UNVERIFIED')
  assert.equal(result.amount, '1666.00'); assert.deepEqual(result.value, { numerator: '1666', denominator: '1' })
  assert.equal(result.trace.sourceValidation, 'CALLER_UNVERIFIED'); assert.equal(result.trace.insufficientMode, 'PARTIAL_THEN_CARRY')
  for (const key of ['budget', 'allocation', 'paid', 'claimed', 'netPay']) assert.equal(key in prepared || key in result, false)
  assert.deepEqual(result.sourceRefs, ['explicit:loan-request']); assert.equal(result.rows[0].identity, 'INSTALLMENT:i1')
  assert.equal(result.rows[0].eligible, true); assert.equal(result.warnings[0].code, code('CALLER_UNVERIFIED'))
})

test('allocation is separate and preserves 1666 as paid400 plus proposed1266 with supplied budget only', () => {
  const prepared = build(), raw = resolve(prepared, 'LOAN'), allocation = allocate(prepared, 'LOAN', '400.00')
  assert.equal(allocation.totals.deductedAmount, '400.00'); assert.equal(allocation.totals.remainingAmount, '1266.00')
  assert.equal(allocation.lines[0].continuation.amount, '1266.00'); assert.equal(allocation.lines[0].continuation.duePeriod, '2026-10')
  assert.deepEqual(resolve(prepared, 'LOAN'), raw, 'Allocation changed the source snapshot')
  assert.equal(allocate(prepared, 'LOAN', '1666').totals.remainingAmount, '0.00')
})

test('zero budget retains full principal and fractional cents never enlarge the usable budget', () => {
  const prepared = build()
  const zero = allocate(prepared, 'LOAN', '0'), fractional = allocate(prepared, 'LOAN', '0.009999')
  assert.equal(zero.lines[0].outcome, 'CARRIED_NO_CAPACITY'); assert.equal(zero.lines[0].continuation.amount, '1666.00')
  assert.equal(fractional.totals.deductedAmount, '0.00'); assert.equal(fractional.unusedFraction, '0.009999')
  rejected(() => allocate(prepared, 'LOAN', '-1'), 'INSTALLMENT_AMOUNT_INVALID')
})

test('BLOCK uses frozen policy mode and extends after complete future tails without reducing salary', () => {
  const values = input({ installments: [installment({ extensionPeriod: '2026-12' }), installment({ installmentRef: 'i2', duePeriod: '2026-11', originalDuePeriod: '2026-11', sequence: 2, extensionPeriod: '2026-12' })] })
  const prepared = build(values, [component('LOAN', { ledgerPartialPayment: 'BLOCK' })]), result = allocate(prepared, 'LOAN', '400')
  assert.equal(resolve(prepared, 'LOAN').amount, '1666.00'); assert.equal(result.lines.length, 2)
  assert.equal(result.totals.deductedAmount, '0.00'); assert.equal(result.lines[0].outcome, 'SKIPPED_AND_EXTENDED')
  assert.equal(result.lines[0].continuation.duePeriod, '2026-12'); assert.equal(result.lines[1].outcome, 'NOT_DUE')
})

test('manual deferral preserves raw due amount while allocation defers even with sufficient budget', () => {
  const prepared = build(input({ manualDeferrals: [{ installmentRef: 'i1', toPeriod: '2026-11', sourceRef: 'explicit:decision', reason: 'قرار تأجيل تجريبي' }] }))
  const raw = resolve(prepared, 'LOAN'), result = allocate(prepared, 'LOAN', '5000')
  assert.equal(raw.amount, '1666.00'); assert.equal(raw.rows[0].manualDeferral.toPeriod, '2026-11')
  assert.deepEqual(raw.sourceRefs, ['explicit:decision', 'explicit:loan-request'])
  assert.equal(result.totals.deductedAmount, '0.00'); assert.equal(result.lines[0].outcome, 'DEFERRED_MANUAL')
  assert.equal(result.lines[0].continuation.amount, '1666.00')
})

test('manual tails and successive skipped installments retain the existing kernel schedule rules', () => {
  const rows = [1, 2, 3].map(i => installment({ installmentRef: `i${i}`, sequence: i, extensionPeriod: '2026-10' }))
  const prepared = build(input({ installments: rows, manualDeferrals: [{ installmentRef: 'i1', toPeriod: '2026-12', sourceRef: 'explicit:defer', reason: 'ترحيل صريح معتمد بالتجربة' }] }), [component('LOAN', { ledgerPartialPayment: 'BLOCK' })])
  const allocation = allocate(prepared, 'LOAN', '0')
  assert.deepEqual(allocation.lines.map(row => row.continuation.duePeriod), ['2026-12', '2027-01', '2027-02'])
  assert.equal(allocation.totals.remainingAmount, '4998.00')
})

test('CREDIT obligations return due additions in full and cannot enter installment collection', () => {
  const prepared = build(input({ installments: [], obligations: [obligation(), obligation({ entryRef: 'future', duePeriod: '2026-10', remainingAmount: '900' }), obligation({ entryRef: 'closed', remainingAmount: '0' })] }), [credit()])
  const result = resolve(prepared, 'CREDIT_ENTRY')
  assert.equal(result.amount, '300.00'); assert.equal(result.direction, 'CREDIT'); assert.equal(result.trace.insufficientMode, null)
  assert.equal(result.rows.filter(row => row.eligible).length, 1)
  assert.equal(result.trace.sourceKind, 'OBLIGATION'); rejected(() => allocate(prepared, 'CREDIT_ENTRY', '0'), code('ALLOCATION_UNSUPPORTED'))
})

test('DEBIT obligations fail explicitly rather than silently becoming synthetic loan installments', () => {
  rejected(() => build(input({ installments: [], obligations: [obligation({ direction: 'DEBIT', componentCode: 'LOAN', category: 'loan' })] })), code('OBLIGATION_DEBIT_UNSUPPORTED'))
})

test('kind plus identity rejects duplicate mappings while raw IDs and source request refs can be shared across legitimate rows', () => {
  rejected(() => build(input({ installments: [installment(), installment({ loanRef: 'another' })] })), code('SOURCE_DUPLICATE'))
  rejected(() => build(input({ installments: [], obligations: [obligation(), obligation()] }), [credit()]), code('SOURCE_DUPLICATE'))
  const prepared = build(input({ installments: [installment({ installmentRef: 'same' }), installment({ installmentRef: 'i2', sequence: 2 })],
    obligations: [obligation({ entryRef: 'same', sourceRef: 'explicit:loan-request' })] }), [component(), credit()])
  assert.equal(resolve(prepared, 'LOAN').amount, '3332.00'); assert.equal(resolve(prepared, 'CREDIT_ENTRY').amount, '300.00')
  assert.deepEqual(resolve(prepared, 'LOAN').sourceRefs, ['explicit:loan-request'])
})

test('one loan cannot be split between policy components with conflicting choices', () => {
  const second = component('SECOND', { sequence: 2 })
  rejected(() => build(input({ installments: [installment(), installment({ componentCode: 'SECOND', installmentRef: 'i2' })] }), [component(), second]), code('LOAN_COMPONENT_CONFLICT'))
})

test('explicit category mapping is case sensitive and wildcard belongs only to the policy component', () => {
  rejected(() => build(input({ installments: [installment({ category: 'LOAN' })] })), code('CATEGORY_MISMATCH'))
  rejected(() => build(input({ installments: [installment({ category: '*' })] })), code('CATEGORY_INVALID'))
  assert.equal(resolve(build(input({ installments: [installment({ category: 'special_loan' })] }), [component('LOAN', { ledgerCategory: '*' })]), 'LOAN').amount, '1666.00')
})

test('principal rejects proration min max percentage cap rounding below cents and disabled carry', () => {
  for (const changed of [{ prorationMode: 'BY_COVERED_DAYS' }, { minAmount: '1' }, { maxAmount: '100' },
    { capPctOfBase: '50', capBaseCode: 'BASE_SALARY' }, { roundingMode: 'HALF_UP', roundingScale: 1 }]) {
    rejected(() => build(input(), [component('LOAN', changed)]), code('PRINCIPAL_PROTECTED'))
  }
  rejected(() => build(input(), [component('LOAN', { carryOverEligible: false })]), code('COMPONENT_UNSUPPORTED'))
  rejected(() => build(input(), [component('LOAN', { stage: 4 })]), code('COMPONENT_UNSUPPORTED'))
  rejected(() => build(input(), [component()], { ...policy, roundingScale: 1 }), code('PRINCIPAL_PROTECTED'))
})

test('credit also preserves its exact source principal through policy rounding and rejects amount-changing limits', () => {
  const values = input({ installments: [], obligations: [obligation({ remainingAmount: '0.29' })] })
  const prepared = build(values, [credit({ roundingMode: 'HALF_EVEN', roundingScale: 6 })])
  assert.deepEqual(resolve(prepared, 'CREDIT_ENTRY').value, { numerator: '29', denominator: '100' })
  rejected(() => build(values, [credit({ minAmount: '500' })]), code('PRINCIPAL_PROTECTED'))
})

test('inactive and conditional ledger components need no source row and valid inactive mappings remain available for core skip', () => {
  const conditional = component('LOAN', { isActive: false, conditionFormula: 'BASE_SALARY > 1' })
  assert.equal(resolve(build(input({ installments: [] }), [conditional]), 'LOAN').amount, '0.00')
  assert.equal(build(input(), [conditional]).installments.length, 1)
  const noRows = build(input({ installments: [] }), [component()])
  assert.equal(resolve(noRows, 'LOAN').amount, '0.00'); assert.equal(resolve(noRows, 'LOAN').rows.length, 0)
  assert.ok(resolve(noRows, 'LOAN').warnings.length)
})

test('source priority is separate from component reduction priority and ties follow original due sequence and ref', () => {
  const rows = [installment({ installmentRef: 'z', priority: 2 }), installment({ installmentRef: 'b', priority: 1, originalDuePeriod: '2026-08', sequence: 2 }),
    installment({ installmentRef: 'a', priority: 1, originalDuePeriod: '2026-08', sequence: 2 }), installment({ installmentRef: 'c', priority: 1, originalDuePeriod: '2026-08', sequence: 1 })]
  const prepared = build(input({ installments: rows }), [component('LOAN', { deductionPriority: 99 })])
  assert.deepEqual(allocate(prepared, 'LOAN', '1666').lines.map(row => row.installmentRef), ['c', 'a', 'b', 'z'])
  assert.equal(allocate(prepared, 'LOAN', '1666').lines[0].deductedAmount, '1666.00')
  assert.equal(prepared.components[0].deductionPriority, 99)
})

test('separate component allocation keeps source assignments and manual decisions scoped to their own component', () => {
  const rows = [installment(), installment({ installmentRef: 'i2', loanRef: 'l2', componentCode: 'SECOND' })]
  const prepared = build(input({ installments: rows, manualDeferrals: [{ installmentRef: 'i2', toPeriod: '2026-11', sourceRef: 'decision:second', reason: 'تأجيل خاص بالقسط الثاني' }] }), [component(), component('SECOND', { sequence: 2 })])
  assert.equal(allocate(prepared, 'LOAN', '5000').lines.length, 1)
  assert.equal(allocate(prepared, 'LOAN', '5000').totals.deductedAmount, '1666.00')
  assert.equal(allocate(prepared, 'SECOND', '5000').lines[0].outcome, 'DEFERRED_MANUAL')
})

test('maximum SQL decimal values keep exact cents and aggregate beyond safe Number without binary conversion', () => {
  const prepared = build(input({ installments: [installment({ remainingAmount: '9999999999999999.99' }), installment({ installmentRef: 'i2', remainingAmount: '0.01' })] }))
  const result = resolve(prepared, 'LOAN')
  assert.equal(result.amount, '10000000000000000.00'); assert.deepEqual(result.value, { numerator: '10000000000000000', denominator: '1' })
  assert.equal(allocate(prepared, 'LOAN', '10000000000000000.00').totals.deductedAmount, '10000000000000000.00')
})

test('numeric strings are mandatory and overprecision signs exponent notation and SQL overflow fail', () => {
  for (const amount of [1666, null, '-1', '+1', '1e2', '0.001', 'NaN', 'Infinity', '10000000000000000.00', '0'.repeat(61)]) {
    rejected(() => build(input({ installments: [installment({ remainingAmount: amount })] })), code('AMOUNT_INVALID'))
    rejected(() => build(input({ installments: [], obligations: [obligation({ remainingAmount: amount })] }), [credit()]), code('AMOUNT_INVALID'))
  }
  assert.equal(resolve(build(input({ installments: [installment({ remainingAmount: '0001.2' })] })), 'LOAN').amount, '1.20')
})

test('unknown fields spoofed modes missing required fields invalid refs and unsafe integers are rejected before resolution', () => {
  for (const values of [input({ budget: '999' }), input({ installments: [installment({ insufficientMode: 'SKIP_AND_EXTEND' })] }),
    input({ installments: [installment({ sourceRevision: 0 })] }), input({ installments: [installment({ priority: Number.MAX_SAFE_INTEGER + 1 })] }),
    input({ installments: [installment({ sourceRef: ' ' })] }), input({ installments: [installment({ componentCode: 'UNKNOWN' })] }),
    input({ installments: [installment({ loanRef: 'x'.repeat(101) })] })]) rejected(() => build(values))
  const missing = input(); delete missing.obligations; rejected(() => build(missing), code('INPUT_REQUIRED'))
  const missingField = input(); delete missingField.installments[0].extensionPeriod; rejected(() => build(missingField), code('INPUT_REQUIRED'))
  rejected(() => resolve(build(), 'UNKNOWN'), code('COMPONENT_UNAVAILABLE'))
})

test('monthly periods and future tails validate explicitly with no current clock or implicit extension', () => {
  rejected(() => build(input({ period: '2026-9' })), code('PERIOD_INVALID'))
  rejected(() => build(input({ nextPeriod: '2026-11' })), code('PERIOD_INVALID'))
  rejected(() => build(input({ period: '9999-12', nextPeriod: '9999-12' })), code('PERIOD_INVALID'))
  rejected(() => build(input(), [component()], { ...policy, defaultPeriodType: 'SEMI_MONTHLY' }), code('PERIOD_UNSUPPORTED'))
  rejected(() => build(input({ installments: [installment({ originalDuePeriod: '2026-10' })] })), code('DUE_ORDER'))
  rejected(() => build(input({ installments: [installment({ extensionPeriod: '2026-10' })] })), code('EXTENSION_INVALID'))
  rejected(() => build(input(), [component('LOAN', { ledgerPartialPayment: 'BLOCK' })]), code('EXTENSION_INVALID'))
  rejected(() => build(input({ installments: [installment({ extensionPeriod: '2026-10' }), installment({ installmentRef: 'future', originalDuePeriod: '2026-10', duePeriod: '2026-10', extensionPeriod: '2026-10' })] }), [component('LOAN', { ledgerPartialPayment: 'BLOCK' })]), code('EXTENSION_INVALID'))
})

test('manual decisions cannot target future closed unknown or duplicate installments nor an earlier period', () => {
  const decision = { installmentRef: 'i1', toPeriod: '2026-10', sourceRef: 'decision:one', reason: 'قرار تأجيل تجريبي' }
  for (const values of [input({ manualDeferrals: [decision, decision] }), input({ manualDeferrals: [{ ...decision, installmentRef: 'unknown' }] }),
    input({ installments: [installment({ remainingAmount: '0' })], manualDeferrals: [decision] }),
    input({ installments: [installment({ duePeriod: '2026-10' })], manualDeferrals: [decision] }),
    input({ manualDeferrals: [{ ...decision, toPeriod: '2026-09' }] }), input({ manualDeferrals: [{ ...decision, reason: 'x' }] })]) {
    rejected(() => build(values), code('DEFERRAL_INVALID'))
  }
})

test('plain JSON guards reject prototype pollution getters hidden fields sparse arrays and oversized inputs', () => {
  for (const bad of ['__proto__', 'constructor', 'prototype']) {
    const values = input(); values.installments[0] = JSON.parse(JSON.stringify(values.installments[0]).replace(/}$/, `,"${bad}":1}`))
    rejected(() => build(values), code('INPUT_SHAPE'))
  }
  let invoked = false
  const getter = input(); Object.defineProperty(getter.installments[0], 'remainingAmount', { enumerable: true, get() { invoked = true; return '0' } })
  rejected(() => build(getter), code('INPUT_SHAPE')); assert.equal(invoked, false)
  const hidden = input(); Object.defineProperty(hidden, 'hidden', { value: 1, enumerable: false }); rejected(() => build(hidden), code('INPUT_SHAPE'))
  const inherited = input(); Object.setPrototypeOf(inherited, { bad: true }); rejected(() => build(inherited), code('INPUT_SHAPE'))
  rejected(() => build(input({ installments: new Array(1) })), code('INPUT_SHAPE'))
  const rows = Array.from({ length: 1001 }, (_, i) => installment({ installmentRef: `i${i}` }))
  rejected(() => build(input({ installments: rows })), code('INPUT_LIMIT'))
})

test('invalid settings and definitions are not backfilled or silently stripped', () => {
  const missing = copy(policy); delete missing.roundingMode
  rejected(() => build(input(), [component()], missing), code('INPUT_REQUIRED'))
  rejected(() => build(input(), [component()], { ...policy, monthlyDays: 31 }), code('SETTINGS_INVALID'))
  rejected(() => build(input(), [component('LOAN', { unexpected: 1 })]))
})

test('preparation and allocation are deterministic deeply frozen and independent of caller mutation', () => {
  const values = input({ installments: [installment({ installmentRef: 'second', priority: 2 }), installment({ installmentRef: 'first', priority: 1 })] })
  const definitions = definition(component()), settings = copy(policy), before = copy({ values, definitions, settings })
  const prepared = prepare(definitions, settings, values), result = resolve(prepared, 'LOAN'), collected = allocate(prepared, 'LOAN', '500')
  assert.deepEqual({ values, definitions, settings }, before)
  assert.equal(Object.isFrozen(values), false); assert.equal(Object.isFrozen(settings), false)
  for (const object of [prepared, prepared.installments, prepared.installments[0], prepared.settings, result, result.rows, collected.lines[0]]) assert.ok(Object.isFrozen(object))
  values.installments[0].remainingAmount = '0'; settings.minNetGuarantee = 9999; definitions.components[0].ledgerPartialPayment = 'BLOCK'
  assert.deepEqual(resolve(prepared, 'LOAN'), result); assert.deepEqual(allocate(prepared, 'LOAN', '500'), collected)
  const reordered = copy(before.values); reordered.installments.reverse()
  assert.deepEqual(prepare(before.definitions, before.settings, reordered), prepared)
  assert.doesNotThrow(() => JSON.stringify({ prepared, result, collected }))
})
