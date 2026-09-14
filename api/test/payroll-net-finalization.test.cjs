// قبول مالي لنهاية المسير على لقطات صريحة؛ لا SQL أو خدمة أو قيد دفتر.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { finalizePayrollNet: finalize, PayrollNetFinalizationError } = require('../src/payroll/payroll-net-finalization')
const { executePayrollComponents: execute } = require('../src/payroll/payroll-component-execution')
const { allocatePayrollInstallments } = require('../src/payroll/payroll-installment-allocation')
const { PayrollDecimal: Decimal } = require('../src/payroll/payroll-decimal')
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const clone = value => JSON.parse(JSON.stringify(value))
const fraction = (n, d = 1) => ({ numerator: String(n), denominator: String(d) })
const readFraction = part => new Decimal(BigInt(part.numerator), BigInt(part.denominator))
const zero = () => Decimal.from('0')
function component(code, amount, type = 'EARNING', extra = {}) {
  return { code, nameAr: code, componentType: type, stage: type === 'DEDUCTION' ? 3 : 1, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount, fieldPath: null, missingFieldBehavior: null,
    varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null,
    ledgerDirection: null, ledgerPartialPayment: null, minAmount: null, maxAmount: null, capPctOfBase: null, capBaseCode: null,
    roundingMode: null, roundingScale: null, deductionPriority: type === 'DEDUCTION' ? 1 : null, carryOverEligible: false,
    rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra }
}
const net = () => component('NET', null, 'INFO', { stage: 6, valueSource: 'SYS_NET', exemptible: false })
const sourceInput = () => ({ variables: {}, employeeFields: Object.fromEntries(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'].map(key => [key, null])), externalValues: {}, sourceMetadata: { variables: {}, employeeFields: {}, externalValues: {} }, proration: { calendar30: { value: '1', sourceRef: 'coverage:full' }, working: { value: '1', sourceRef: 'schedule:full' } }, exemptions: [] })
function run(earnings = '100', deductions = [['D', '80']], policy = settings, extraComponents = []) {
  const components = [component('PAY', earnings), ...extraComponents,
    ...deductions.map(([code, amount, extra], index) => component(code, amount, 'DEDUCTION', { sequence: index + 1, ...extra })), net()]
  return execute({ components, parameters: [], tierSets: [] }, policy, sourceInput())
}
function netInput(execution, kinds = {}, extra = {}) {
  const classifications = execution.components.filter(row => row.componentType === 'DEDUCTION').map(row => ({ componentCode: row.code, kind: kinds[row.code] ?? 'OTHER', sourceRef: `classification:${row.code}`, carryOverEligible: kinds[row.code] === 'LOAN' }))
  return { earnedFixedGross: '100', sourceRef: 'earned-fixed:explicit', classifications,
    collectionOrder: classifications.filter(row => !['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'].includes(row.kind)).map(row => row.componentCode),
    collectionOrderSourceRef: 'owner-order:v1', ...extra }
}
const row = (result, code) => result.allocations.find(value => value.componentCode === code)
const rejected = (fn, code) => assert.throws(fn, error => { assert.ok(error instanceof PayrollNetFinalizationError, String(error)); if (code) assert.equal(error.code, code, error.message); return true })
function partial(request) {
  const due = Decimal.from(request.dueAmount), budget = Decimal.from(request.availableBudget).round(2, 'FLOOR')
  const collected = due.compare(budget) <= 0 ? due : budget
  return { collectedAmount: collected.format(2, 'HALF_UP'), carriedAmount: due.subtract(collected).format(2, 'HALF_UP'), details: { sourceRefs: request.sourceRefs, behavior: 'PARTIAL_THEN_CARRY' } }
}
function checkConservation(result) {
  const totals = result.totals
  assert.equal(readFraction(totals.collectedDeductions.amountExact).add(readFraction(totals.carriedDeductions.amountExact)).add(readFraction(totals.droppedDeductions.amountExact)).add(readFraction(totals.unallocatedDeductions.amountExact)).compare(readFraction(totals.requestedDeductions.amountExact)), 0)
  assert.equal(readFraction(totals.earnings.amountExact).subtract(readFraction(totals.collectedDeductions.amountExact)).compare(readFraction(result.netPay.amountExact)), 0)
  for (const line of result.allocations) {
    const sum = ['collectedAmount', 'carriedAmount', 'droppedAmount', 'unallocatedAmount'].reduce((sum, key) => sum.add(Decimal.from(line[key])), zero())
    assert.equal(sum.compare(Decimal.from(line.requestedAmount)), 0)
  }
}

test('DD-11 example protects statutory and allocates the final 2555 to loans, carrying 445', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 50 }
  const execution = run('11750', [['GOSI', '1057.50'], ['ATTENDANCE', '750'], ['RECOVERY', '500'], ['QUALITY', '562.50'], ['ADMIN', '450'], ['LOAN', '3000']], policy)
  const input = netInput(execution, { GOSI: 'STATUTORY', ATTENDANCE: 'ATTENDANCE', RECOVERY: 'RECOVERY', QUALITY: 'TYPED', ADMIN: 'ADMINISTRATIVE', LOAN: 'LOAN' }, { earnedFixedGross: '11750' })
  const result = finalize(execution, policy, input, { resolveLoan: partial })
  assert.equal(row(result, 'LOAN').collectedAmount, '2555.00'); assert.equal(row(result, 'LOAN').carriedAmount, '445.00')
  assert.equal(result.netPay.amount, '5875.00'); assert.equal(result.limits.statutoryCapConsumed.amount, '1057.50')
  assert.equal(result.approvalEligible, true); checkConservation(result)
})

test('owner explicit order changes attendance versus loan collection with no default priority', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 50 }, execution = run('100', [['ATT', '40'], ['LOAN', '40']], policy)
  const input = netInput(execution, { ATT: 'ATTENDANCE', LOAN: 'LOAN' })
  const attendanceFirst = finalize(execution, policy, input, { resolveLoan: partial })
  const loanFirst = finalize(execution, policy, { ...input, collectionOrder: ['LOAN', 'ATT'], collectionOrderSourceRef: 'owner-order:v2' }, { resolveLoan: partial })
  assert.equal(row(attendanceFirst, 'LOAN').carriedAmount, '30.00'); assert.equal(row(attendanceFirst, 'ATT').droppedAmount, '0.00')
  assert.equal(row(loanFirst, 'LOAN').carriedAmount, '0.00'); assert.equal(row(loanFirst, 'ATT').droppedAmount, '30.00')
  assert.equal(loanFirst.netPay.amount, '50.00'); assert.ok(loanFirst.sourceRefs.includes('owner-order:v2'))
  checkConservation(attendanceFirst); checkConservation(loanFirst)
})

test('skip-and-extend leaves available money for later recoveries without writing off principal', () => {
  const execution = run('100', [['LOAN', '120'], ['RECOVERY', '30']]), input = netInput(execution, { LOAN: 'LOAN', RECOVERY: 'RECOVERY' })
  const result = finalize(execution, settings, input, { resolveLoan: request => ({ collectedAmount: '0.00', carriedAmount: request.dueAmount, details: { outcome: 'SKIP_AND_EXTEND' } }) })
  assert.equal(row(result, 'LOAN').carriedAmount, '120.00'); assert.equal(row(result, 'RECOVERY').collectedAmount, '30.00')
  assert.equal(result.netPay.amount, '70.00'); checkConservation(result)
})

test('statutory and court amounts remain full and consume cap even when exceeding it', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 20 }, execution = run('100', [['TAX', '25'], ['COURT', '10'], ['OTHER', '20']], policy)
  const result = finalize(execution, policy, netInput(execution, { TAX: 'STATUTORY', COURT: 'COURT_ORDER' }))
  assert.equal(row(result, 'TAX').collectedAmount, '25.00'); assert.equal(row(result, 'COURT').collectedAmount, '10.00'); assert.equal(row(result, 'OTHER').collectedAmount, '0.00')
  assert.equal(result.netPay.amount, '65.00'); assert.ok(result.warnings.some(warning => warning.code === 'PROTECTED_EXCEEDS_CAP')); checkConservation(result)
})

test('unpaid non-entitlement reduces cash but never consumes the statutory deduction cap', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 50 }, execution = run('100', [['UNPAID', '30'], ['TAX', '10'], ['OTHER', '60']], policy)
  const result = finalize(execution, policy, netInput(execution, { UNPAID: 'UNPAID_NON_ENTITLEMENT', TAX: 'STATUTORY' }))
  assert.equal(row(result, 'OTHER').collectedAmount, '40.00'); assert.equal(result.netPay.amount, '20.00')
  assert.equal(result.limits.unpaidExcludedFromCap.amount, '30.00'); assert.equal(result.limits.statutoryCapConsumed.amount, '10.00'); checkConservation(result)
})

test('floor uses the larger absolute or earned-fixed percentage guarantee, independently of cap', () => {
  const policy = { ...settings, minNetGuarantee: 30, netFloorPct: 60, maxDeductionPctOfGross: 70 }, execution = run('100', [['D', '100']], policy)
  const result = finalize(execution, policy, netInput(execution))
  assert.equal(result.netPay.amount, '60.00'); assert.equal(row(result, 'D').collectedAmount, '40.00'); assert.equal(result.limits.floor.rawValue6, '60.000000')
  checkConservation(result)
})

test('protected insolvency returns exact negative NET, blocks approval, and invokes no loan allocation', () => {
  const execution = run('100', [['TAX', '105'], ['LOAN', '20'], ['OTHER', '10']]), input = netInput(execution, { TAX: 'STATUTORY', LOAN: 'LOAN' })
  let invoked = 0
  const result = finalize(execution, settings, input, { resolveLoan: () => { invoked++; throw Error('must not resolve') } })
  assert.equal(result.netPay.amount, '-5.00'); assert.equal(result.approvalEligible, false); assert.equal(result.blocked, true); assert.equal(invoked, 0)
  assert.equal(row(result, 'LOAN').unallocatedAmount, '20.00'); assert.equal(result.totals.unallocatedDeductions.amount, '30.00'); assert.equal(result.totals.carriedDeductions.amount, '0.00')
  checkConservation(result)
})

test('unattainable floor does not invent pay or convert a nonnegative balance to insolvency', () => {
  const policy = { ...settings, minNetGuarantee: 120 }, execution = run('100', [['D', '20']], policy)
  const result = finalize(execution, policy, netInput(execution))
  assert.equal(result.netPay.amount, '100.00'); assert.equal(result.approvalEligible, true); assert.equal(row(result, 'D').droppedAmount, '20.00')
  assert.ok(result.warnings.some(warning => warning.code === 'FLOOR_UNATTAINABLE'))
})

test('only explicitly eligible non-debt carries under the global carry switch; attendance always drops', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 0, carryOverExcess: true }, execution = run('100', [['ATT', '10'], ['RECOVERY', '20'], ['OTHER', '30']], policy)
  const input = netInput(execution, { ATT: 'ATTENDANCE', RECOVERY: 'RECOVERY' }); input.classifications.find(row => row.componentCode === 'RECOVERY').carryOverEligible = true
  const result = finalize(execution, policy, input)
  assert.equal(row(result, 'ATT').droppedAmount, '10.00'); assert.equal(row(result, 'RECOVERY').carriedAmount, '20.00'); assert.equal(row(result, 'OTHER').droppedAmount, '30.00')
  const disabled = finalize(execution, { ...policy, carryOverExcess: false }, input)
  assert.equal(disabled.totals.carriedDeductions.amount, '0.00'); assert.equal(disabled.totals.droppedDeductions.amount, '60.00')
  checkConservation(result); checkConservation(disabled)
})

test('INFO values never enter net sums, and financial six-place component precision is preserved', () => {
  const policy = { ...settings, roundingScale: 0 }, execution = run('100', [['D', null, { valueSource: 'FORMULA', formula: '0.123456', roundingMode: 'HALF_UP', roundingScale: 6 }]], policy, [component('INFO', '9999', 'INFO', { unit: 'COUNT', sequence: 2 })])
  const result = finalize(execution, policy, netInput(execution))
  assert.equal(result.scale, 6); assert.equal(result.netPay.amount, '99.876544'); assert.equal(result.totals.earnings.amount, '100.000000')
  assert.equal(result.allocations.length, 1); checkConservation(result)
})

test('exact fractional cap is conservatively floored at the maximum financial scale, with no hidden adjustment', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 100 }, execution = run('1', [['D', null, { valueSource: 'FORMULA', formula: '0.999999', roundingMode: 'HALF_UP', roundingScale: 6 }]], policy)
  const result = finalize(execution, policy, netInput(execution, {}, { earnedFixedGross: fraction(1, 3) }))
  assert.equal(row(result, 'D').collectedAmount, '0.333333'); assert.equal(result.netPay.amount, '0.666667')
  assert.deepEqual(result.limits.unusedFraction.exact, fraction(1, 3000000)); assert.equal(readFraction(result.limits.cap.exact).compare(Decimal.from(row(result, 'D').collectedAmount)), 1)
  checkConservation(result)
})

test('currency precision never falls below two even when all component rounding scales are zero', () => {
  const policy = { ...settings, roundingScale: 0 }, execution = run('100', [['D', '1']], policy)
  const result = finalize(execution, policy, netInput(execution))
  assert.equal(result.scale, 2); assert.equal(result.netPay.amount, '99.00'); checkConservation(result)
})

test('zero and skipped deductions are classified and ordered, and optional zero-loan details survive', () => {
  const execution = run('100', [['LOAN', '40', { conditionFormula: '1=0', minAmount: '10' }], ['D', '10', { isActive: false }]])
  let invoked = 0
  const result = finalize(execution, settings, netInput(execution, { LOAN: 'LOAN' }), { resolveLoan: request => { invoked++; assert.equal(request.dueAmount, '0.00'); return { collectedAmount: '0.00', carriedAmount: '0.00', details: { sourceUntouched: true } } } })
  assert.equal(invoked, 1); assert.equal(row(result, 'LOAN').loanDetails.sourceUntouched, true); assert.equal(result.netPay.amount, '100.00')
  assert.equal(row(result, 'D').outcome, 'SKIPPED'); checkConservation(result)
})

test('exempted ordinary deduction remains zero and does not consume cap or revive its prior minimum', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 20 }, components = [component('PAY', '100'), component('EXEMPT', '40', 'DEDUCTION', { minAmount: '50' }), component('D', '30', 'DEDUCTION', { sequence: 2 }), net()]
  const inputs = sourceInput(); inputs.exemptions = [{ code: 'EXEMPT', sourceRef: 'exemption:approved-snapshot' }]
  const execution = execute({ components, parameters: [], tierSets: [] }, policy, inputs)
  const result = finalize(execution, policy, netInput(execution))
  assert.equal(row(result, 'EXEMPT').collectedAmount, '0.00'); assert.equal(row(result, 'D').collectedAmount, '20.00'); assert.ok(result.sourceRefs.includes('exemption:approved-snapshot'))
  rejected(() => finalize(execution, policy, netInput(execution, { EXEMPT: 'STATUTORY' })), 'NET_PROTECTED_EXEMPTION')
})

test('loan callback receives frozen exact budget and integrates the real installment allocator without double collection', () => {
  const execution = run('100', [['LOAN', '120']]), input = netInput(execution, { LOAN: 'LOAN' })
  const result = finalize(execution, settings, input, { resolveLoan: request => {
    assert.ok(Object.isFrozen(request)); assert.ok(Object.isFrozen(request.sourceRefs)); assert.equal(request.availableBudget, '100.00')
    const allocated = allocatePayrollInstallments({ period: '2026-09', nextPeriod: '2026-10', availableBudget: request.availableBudget, currencyScale: 2,
      installments: [{ installmentRef: 'i:1', loanRef: 'loan:1', sourceRef: 'schedule:1', sourceRevision: 1, sequence: 1, originalDuePeriod: '2026-09', duePeriod: '2026-09', remainingAmount: '120.00', priority: 0, insufficientMode: 'PARTIAL_THEN_CARRY', extensionPeriod: null }], manualDeferrals: [] })
    return { collectedAmount: allocated.totals.deductedAmount, carriedAmount: allocated.totals.remainingAmount, details: allocated }
  } })
  assert.equal(row(result, 'LOAN').collectedAmount, '100.00'); assert.equal(row(result, 'LOAN').carriedAmount, '20.00'); assert.equal(result.netPay.amount, '0.00'); checkConservation(result)
})

test('loan cents are not rounded up to a finer available cap and the remainder remains available', () => {
  const policy = { ...settings, maxDeductionPctOfGross: 100 }, execution = run('1', [['LOAN', '1'], ['D', null, { valueSource: 'FORMULA', formula: '.000009', roundingMode: 'HALF_UP', roundingScale: 6 }]], policy)
  const result = finalize(execution, policy, netInput(execution, { LOAN: 'LOAN' }, { earnedFixedGross: '0.333333' }), { resolveLoan: partial })
  assert.equal(row(result, 'LOAN').collectedAmount, '0.330000'); assert.equal(row(result, 'D').collectedAmount, '0.000009'); checkConservation(result)
})

test('large exact source values above Number safe integer retain cents', () => {
  const input = sourceInput(); input.externalValues.PAY = '9007199254740991.91'; input.sourceMetadata.externalValues.PAY = { sourceRef: 'salary:huge', alreadyProrated: false }
  const execution = execute({ components: [component('PAY', null, 'EARNING', { valueSource: 'EXTERNAL' }), component('D', '0.09', 'DEDUCTION'), net()], parameters: [], tierSets: [] }, settings, input)
  const result = finalize(execution, settings, netInput(execution, {}, { earnedFixedGross: '9007199254740991.91' }))
  assert.equal(result.netPay.amount, '9007199254740991.82'); assert.ok(result.sourceRefs.includes('salary:huge')); checkConservation(result)
})

test('60-digit integer with formatted zeros remains accepted without reducing its numeric domain', () => {
  const input = sourceInput(), huge = '9'.repeat(60); input.externalValues.PAY = huge; input.sourceMetadata.externalValues.PAY = { sourceRef: 'huge:explicit', alreadyProrated: false }
  const execution = execute({ components: [component('PAY', null, 'EARNING', { valueSource: 'EXTERNAL' }), component('D', '1', 'DEDUCTION'), net()], parameters: [], tierSets: [] }, settings, input)
  const result = finalize(execution, settings, netInput(execution, {}, { earnedFixedGross: `${huge}.00` }))
  assert.equal(result.netPay.amount, `${BigInt(huge) - 1n}.00`); checkConservation(result)
})

test('strict classification and order require all and only known deduction rows and evidence', () => {
  const execution = run(), valid = netInput(execution)
  for (const change of [input => { input.classifications = [] }, input => { input.classifications.push(clone(input.classifications[0])) }, input => { input.classifications[0].componentCode = 'PAY' }, input => { input.classifications[0].kind = 'FREEFORM' }, input => { input.classifications[0].carryOverEligible = 'true' }]) { const input = clone(valid); change(input); rejected(() => finalize(execution, settings, input)) }
  for (const order of [[], ['D', 'D'], ['PAY'], ['UNKNOWN']]) rejected(() => finalize(execution, settings, { ...valid, collectionOrder: order }), 'NET_ORDER_INVALID')
  for (const key of ['sourceRef', 'collectionOrderSourceRef']) { const input = clone(valid); delete input[key]; rejected(() => finalize(execution, settings, input), 'NET_FIELD_REQUIRED') }
  rejected(() => finalize(execution, settings, { ...valid, collectionOrderSourceRef: ' ' }), 'NET_SOURCE_REQUIRED')
  rejected(() => finalize(execution, settings, { ...valid, unsupported: true }), 'NET_FIELD_UNKNOWN')
})

test('protected classes cannot appear in collection order and loan classification cannot allow principal drop', () => {
  const execution = run(), input = netInput(execution, { D: 'STATUTORY' })
  rejected(() => finalize(execution, settings, { ...input, collectionOrder: ['D'] }), 'NET_ORDER_INVALID')
  const loan = netInput(execution, { D: 'LOAN' }); loan.classifications[0].carryOverEligible = false
  rejected(() => finalize(execution, settings, loan), 'NET_CLASSIFICATION_INVALID')
})

test('financial numbers, malformed fractions, invalid settings, and non-cent loan debt are rejected', () => {
  const execution = run(), input = netInput(execution)
  for (const value of [100, '-1', 'NaN', '1e2', fraction(1, 0), fraction(1, -1), { numerator: '1', denominator: '2', extra: true }, fraction('1'.repeat(1235))]) rejected(() => finalize(execution, settings, { ...input, earnedFixedGross: value }))
  rejected(() => finalize(execution, { ...settings, monthlyDays: 31 }, input), 'NET_SETTINGS_INVALID')
  const fine = run('100', [['LOAN', null, { valueSource: 'FORMULA', formula: '1.001', roundingMode: 'HALF_UP', roundingScale: 3 }]])
  rejected(() => finalize(fine, settings, netInput(fine, { LOAN: 'LOAN' }), { resolveLoan: partial }), 'NET_LOAN_PRECISION_INVALID')
})

test('tampered execution version, sums, exact values, status, extra fields, or missing NET cannot be finalized', () => {
  const original = run(), input = netInput(original)
  for (const mutate of [snapshot => { snapshot.engineVersion = 'LEGACY' }, snapshot => { snapshot.preCapsOnly = false }, snapshot => { snapshot.components[0].amountExact = fraction(101) }, snapshot => { snapshot.totalsPreCaps.deductions.amount = '79.00' }, snapshot => { snapshot.components[1].status = 'SKIPPED' }, snapshot => { snapshot.components.pop() }, snapshot => { snapshot.components[0].surprise = true }, snapshot => { snapshot.deferred = ['NET'] }, snapshot => { snapshot.components[1].resultUnit = 'HOURS' }]) { const snapshot = clone(original); mutate(snapshot); rejected(() => finalize(snapshot, settings, input)) }
})

test('accessors and custom prototypes are rejected without invoking getters throughout all public inputs', () => {
  const execution = run(), input = netInput(execution); let reads = 0
  const accessor = clone(input); Object.defineProperty(accessor, 'earnedFixedGross', { enumerable: true, get() { reads++; return '100' } })
  rejected(() => finalize(execution, settings, accessor), 'NET_SHAPE_INVALID'); assert.equal(reads, 0)
  const custom = Object.assign(Object.create({ marker: true }), input)
  rejected(() => finalize(execution, settings, custom), 'NET_SHAPE_INVALID')
  const snapshot = clone(execution); Object.defineProperty(snapshot.components[0], 'amount', { enumerable: true, get() { reads++; return '100' } })
  rejected(() => finalize(snapshot, settings, input), 'NET_SHAPE_INVALID'); assert.equal(reads, 0)
  const option = {}; Object.defineProperty(option, 'resolveLoan', { enumerable: true, get() { reads++; return partial } })
  rejected(() => finalize(execution, settings, input, option), 'NET_OPTIONS_INVALID'); assert.equal(reads, 0)
})

test('non-JSON properties, sparse arrays, oversized inputs, and symbols fail closed', () => {
  const execution = run(), original = netInput(execution)
  for (const mutate of [input => { input.collectionOrder = Array(1) }, input => { input[Symbol('extra')] = 1 }, input => { Object.defineProperty(input, 'hidden', { value: 1 }) }, input => { input.sourceRef = 'x'.repeat(201) }, input => { input.classifications = Array.from({ length: 201 }, () => original.classifications[0]) }]) { const input = clone(original); mutate(input); rejected(() => finalize(execution, settings, input)) }
  const proto = JSON.parse(JSON.stringify(original)); Object.defineProperty(proto, '__proto__', { value: {}, enumerable: true })
  rejected(() => finalize(execution, settings, proto), 'NET_SHAPE_INVALID')
})

test('malformed, asynchronous, unsafe, or non-conserving loan resolver output fails closed', () => {
  const execution = run('100', [['LOAN', '120']]), input = netInput(execution, { LOAN: 'LOAN' })
  rejected(() => finalize(execution, settings, input), 'NET_LOAN_RESOLVER_REQUIRED')
  for (const resolution of [Promise.resolve({ collectedAmount: '0', carriedAmount: '120', details: null }), { collectedAmount: '100', carriedAmount: '19.99', details: null }, { collectedAmount: '101', carriedAmount: '19', details: null }, { collectedAmount: '-1', carriedAmount: '121', details: null }, { collectedAmount: '99.999', carriedAmount: '20.001', details: null }, { collectedAmount: 100, carriedAmount: '20', details: null }, { collectedAmount: '100', carriedAmount: '20' }, { collectedAmount: '100', carriedAmount: '20', details: null, paid: true }]) rejected(() => finalize(execution, settings, input, { resolveLoan: () => resolution }))
  rejected(() => finalize(execution, settings, input, { resolveLoan: () => { throw Error('resolver') } }), 'NET_LOAN_RESOLUTION_FAILED')
  let reads = 0; const output = { collectedAmount: '100', carriedAmount: '20' }; Object.defineProperty(output, 'details', { enumerable: true, get() { reads++; return {} } })
  rejected(() => finalize(execution, settings, input, { resolveLoan: () => output }), 'NET_SHAPE_INVALID'); assert.equal(reads, 0)
})

test('pure result is deeply frozen, retains all evidence, serializes safely, and never mutates supplied objects', () => {
  const execution = run('100', [['LOAN', '120']]), input = netInput(execution, { LOAN: 'LOAN' }), before = JSON.stringify({ execution, input, settings })
  const details = { schedule: [{ ref: 'i:1', remaining: '20.00' }] }
  const result = finalize(execution, settings, input, { resolveLoan: () => ({ collectedAmount: '100', carriedAmount: '20', details }) })
  assert.equal(JSON.stringify({ execution, input, settings }), before); assert.equal(Object.isFrozen(details), false)
  assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.allocations)); assert.ok(Object.isFrozen(row(result, 'LOAN').loanDetails.schedule[0]))
  assert.ok(result.sourceRefs.includes('classification:LOAN')); assert.ok(result.sourceRefs.includes(input.sourceRef)); assert.ok(result.sourceRefs.includes(input.collectionOrderSourceRef))
  assert.doesNotThrow(() => JSON.stringify(result)); assert.equal(result.trace.claimsCreated, false); checkConservation(result)
})
