// تخصيص أقساط نقي: إثبات حفظ القروش والتأجيل دون قاعدة بيانات أو حركة مالية فعلية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { allocatePayrollInstallments: allocate, PayrollInstallmentAllocationError, PAYROLL_INSTALLMENT_ALLOCATION_VERSION } = require('../src/payroll/payroll-installment-allocation')
const copy = value => JSON.parse(JSON.stringify(value))
const item = (installmentRef = 'I1', extra = {}) => ({ installmentRef, loanRef: 'L1', sourceRef: 'loan:snapshot:1', sourceRevision: 1, sequence: 1,
  originalDuePeriod: '2026-09', duePeriod: '2026-09', remainingAmount: '1666', priority: 0, insufficientMode: 'PARTIAL_THEN_CARRY', extensionPeriod: null, ...extra })
const input = (availableBudget = '400', installments = [item()], extra = {}) => ({ period: '2026-09', nextPeriod: '2026-10', availableBudget, currencyScale: 2, installments, manualDeferrals: [], ...extra })
const manual = (installmentRef = 'I1', toPeriod = '2026-12') => ({ installmentRef, toPeriod, sourceRef: 'decision:caller-provided', reason: 'تأجيل القسط بطلب صريح' })
const skip = (installmentRef, extra = {}) => item(installmentRef, { insufficientMode: 'SKIP_AND_EXTEND', extensionPeriod: '2026-12', ...extra })
const cents = value => BigInt(value.replace('.', ''))
const micros = value => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole + fraction.padEnd(6, '0')) }
function conservation(result) {
  assert.equal(cents(result.totals.eligibleDueAmount), cents(result.totals.deductedAmount) + cents(result.totals.remainingAmount))
  assert.equal(cents(result.budgetUsable), cents(result.totals.deductedAmount) + cents(result.budgetRemaining))
  assert.equal(micros(result.budgetInput), cents(result.totals.deductedAmount) * 10000n + cents(result.budgetRemaining) * 10000n + micros(result.unusedFraction))
  for (const line of result.lines) {
    assert.equal(cents(line.dueAmount), cents(line.deductedAmount) + cents(line.remainingAmount))
    assert.equal(cents(line.budgetBefore), cents(line.deductedAmount) + cents(line.budgetAfter))
    assert.ok(cents(line.budgetAfter) >= 0n)
    if (line.continuation) assert.equal(line.continuation.amount, line.remainingAmount)
  }
}
function rejected(action, code) {
  assert.throws(action, error => { assert.ok(error instanceof PayrollInstallmentAllocationError, String(error)); if (code) assert.equal(error.code, code, error.message); assert.equal(typeof error.path, 'string'); return true })
}

test('AD12 partial allocation preserves 400 paid and1266 carried without changing next installment', () => {
  const result = allocate(input('400', [item(), item('FUTURE', { sequence: 2, originalDuePeriod: '2026-10', duePeriod: '2026-10' })]))
  assert.equal(result.engineVersion, PAYROLL_INSTALLMENT_ALLOCATION_VERSION); assert.equal(result.sourceValidation, 'CALLER_UNVERIFIED')
  assert.deepEqual(result.totals, { eligibleDueAmount: '1666.00', deductedAmount: '400.00', remainingAmount: '1266.00' })
  assert.equal(result.lines[0].outcome, 'PARTIAL'); assert.deepEqual(result.lines[0].continuation, { amount: '1266.00', duePeriod: '2026-10', reason: 'PARTIAL_REMAINDER', parentInstallmentRef: 'I1' })
  assert.equal(result.lines[1].outcome, 'NOT_DUE'); assert.equal(result.lines[1].dueAmount, '1666.00'); assert.equal(result.lines[1].continuation, null)
  conservation(result)
})

test('AD12 skip-and-extend leaves capacity available and defers the entire installment past the supplied schedule', () => {
  const result = allocate(input('400', [skip('I1'), item('FUTURE', { originalDuePeriod: '2026-11', duePeriod: '2026-11' })]))
  assert.equal(result.lines[0].outcome, 'SKIPPED_AND_EXTENDED'); assert.equal(result.lines[0].deductedAmount, '0.00')
  assert.equal(result.lines[0].continuation.amount, '1666.00'); assert.equal(result.lines[0].continuation.duePeriod, '2026-12')
  assert.equal(result.budgetRemaining, '400.00'); conservation(result)
})

test('manual deferral precedes capacity checks and preserves source decision without claiming its approval', () => {
  const result = allocate(input('5000', [item()], { manualDeferrals: [manual()] }))
  assert.equal(result.lines[0].outcome, 'DEFERRED_MANUAL'); assert.equal(result.lines[0].deductedAmount, '0.00')
  assert.deepEqual(result.lines[0].manualDeferral, manual()); assert.equal(result.lines[0].continuation.duePeriod, '2026-12')
  assert.equal(result.budgetRemaining, '5000.00'); assert.ok(result.warnings.some(w => w.code === 'INSTALLMENT_DEFERRED_MANUAL'))
  conservation(result)
})

test('exact full coverage, one-cent shortage and zero capacity produce distinct outcomes', () => {
  const full = allocate(input('1666')), partial = allocate(input('1665.99')), zero = allocate(input('0'))
  assert.equal(full.lines[0].outcome, 'DEDUCTED'); assert.equal(full.lines[0].continuation, null)
  assert.equal(partial.lines[0].outcome, 'PARTIAL'); assert.equal(partial.lines[0].continuation.amount, '0.01')
  assert.equal(zero.lines[0].outcome, 'CARRIED_NO_CAPACITY'); assert.equal(zero.lines[0].continuation.amount, '1666.00')
  for (const result of [full, partial, zero]) conservation(result)
})

test('budget floor cents retains the exact unused six-place fraction rather than rounding debt capacity up', () => {
  const result = allocate(input('400.009999'))
  assert.equal(result.budgetInput, '400.009999'); assert.equal(result.budgetUsable, '400.00'); assert.equal(result.unusedFraction, '0.009999')
  assert.equal(result.totals.deductedAmount, '400.00'); conservation(result)
  const tiny = allocate(input('0.009999', [item('I1', { remainingAmount: '0.01' })]))
  assert.equal(tiny.lines[0].deductedAmount, '0.00'); assert.equal(tiny.lines[0].remainingAmount, '0.01'); conservation(tiny)
})

test('future and zero-balance closed rows remain traceable without entering eligible totals', () => {
  const result = allocate(input('100', [item('FUTURE', { duePeriod: '2026-10' }), item('CLOSED', { remainingAmount: '0' })]))
  assert.deepEqual(result.lines.map(line => [line.installmentRef, line.outcome, line.eligible]), [['CLOSED', 'CLOSED', false], ['FUTURE', 'NOT_DUE', false]])
  assert.equal(result.totals.eligibleDueAmount, '0.00'); assert.equal(result.budgetRemaining, '100.00'); conservation(result)
})

test('overdue installments are eligible, oldest original due takes precedence after explicit priority', () => {
  const items = [item('CURRENT', { remainingAmount: '100' }), item('OVERDUE', { originalDuePeriod: '2026-06', duePeriod: '2026-07', remainingAmount: '100' }),
    item('URGENT', { priority: 0, originalDuePeriod: '2026-09', remainingAmount: '100' })]
  items[0].priority = 1; items[1].priority = 1
  const result = allocate(input('150', items))
  assert.deepEqual(result.lines.map(line => line.installmentRef), ['URGENT', 'OVERDUE', 'CURRENT'])
  assert.deepEqual(result.lines.map(line => line.deductedAmount), ['100.00', '50.00', '0.00']); conservation(result)
})

test('canonical priority/date/sequence/ordinal ordering ignores input order and permits shared source refs', () => {
  const items = [item('Z', { sequence: 2 }), item('B', { sequence: 1 }), item('A', { sequence: 1 }), item('Y', { sourceRevision: 2, priority: 1 })]
  const forward = allocate(input('2000', items)), reversed = allocate(input('2000', [...items].reverse()))
  assert.deepEqual(forward, reversed); assert.deepEqual(forward.lines.map(line => line.installmentRef), ['A', 'B', 'Z', 'Y'])
  conservation(forward)
})

test('skipping an oversized installment does not prevent a later affordable installment from using the capacity', () => {
  const result = allocate(input('400', [skip('BIG'), item('SMALL', { sequence: 2, remainingAmount: '300' })]))
  assert.equal(result.lines[0].deductedAmount, '0.00'); assert.equal(result.lines[1].deductedAmount, '300.00'); assert.equal(result.budgetRemaining, '100.00')
  conservation(result)
})

test('multiple skipped installments extend once per month with explicit later targets respected', () => {
  const result = allocate(input('0', [skip('A', { sequence: 1 }), skip('B', { sequence: 2 }), skip('C', { sequence: 3, extensionPeriod: '2027-03' }), skip('D', { sequence: 4, extensionPeriod: '2027-01' })]))
  assert.deepEqual(result.lines.map(line => line.continuation.duePeriod), ['2026-12', '2027-01', '2027-03', '2027-04'])
  conservation(result)
})

test('different loans extend independently while the automatic extension follows the latest manual deferral of the same loan', () => {
  const result = allocate(input('0', [skip('A'), skip('B', { sequence: 2 }), skip('C', { sequence: 3, loanRef: 'L2' })], { manualDeferrals: [manual('A', '2027-06')] }))
  assert.deepEqual(result.lines.map(line => line.continuation.duePeriod), ['2027-06', '2027-07', '2026-12'])
  conservation(result)
})

test('manual tail applies even when its row sorts later, with earlier explicit extension and multiple skipped rows', () => {
  const result = allocate(input('0', [skip('A'), skip('B', { sequence: 2 }), skip('C', { sequence: 3 })], { manualDeferrals: [manual('C', '2027-01')] }))
  assert.deepEqual(result.lines.map(line => line.continuation.duePeriod), ['2027-02', '2027-03', '2027-01'])
  conservation(result)
})

test('repeated partial carries conserve the original obligation across explicit later snapshots', () => {
  const first = allocate(input('400')), carry = first.lines[0].continuation
  const second = allocate(input('500', [item('I1_CHILD', { remainingAmount: carry.amount, originalDuePeriod: '2026-09', duePeriod: '2026-10' })], { period: '2026-10', nextPeriod: '2026-11' }))
  const third = allocate(input('1000', [item('I1_GRANDCHILD', { remainingAmount: second.lines[0].remainingAmount, originalDuePeriod: '2026-09', duePeriod: '2026-11' })], { period: '2026-11', nextPeriod: '2026-12' }))
  assert.equal(third.lines[0].remainingAmount, '0.00')
  assert.equal([first, second, third].reduce((sum, result) => sum + cents(result.totals.deductedAmount), 0n), 166600n)
  for (const result of [first, second, third]) conservation(result)
})

test('large DEC18,2 amounts are preserved beyond binary safe cents', () => {
  const result = allocate(input('9007199254740991.91', [item('I1', { remainingAmount: '9999999999999999.99' })]))
  assert.equal(result.lines[0].deductedAmount, '9007199254740991.91'); assert.equal(result.lines[0].remainingAmount, '992800745259008.08'); conservation(result)
})

test('60-digit budget remains exact and canonical while decimals beyond declared precision reject', () => {
  const budget = '9'.repeat(54) + '.123456', result = allocate(input(budget, []))
  assert.equal(result.budgetUsable, '9'.repeat(54) + '.12'); assert.equal(result.unusedFraction, '0.003456'); conservation(result)
  for (const invalid of ['9'.repeat(61), '0.0000001', '-1', '1e5', 'NaN', '.5', '+1', '1.']) rejected(() => allocate(input(invalid)))
  for (const invalid of ['10000000000000000', '1.001', '-0.01']) rejected(() => allocate(input('100', [item('I1', { remainingAmount: invalid })])))
})

test('formatted .00 from budget helper does not invalidate an otherwise valid60-digit integer capacity', () => {
  const budget = '9'.repeat(60), result = allocate(input(budget + '.00', [item('I1', { remainingAmount: '1' })]))
  assert.equal(result.budgetInput, budget); assert.equal(result.budgetRemaining, '9'.repeat(59) + '8.00')
  assert.equal(result.lines[0].deductedAmount, '1.00'); conservation(result)
})

test('empty schedule and all-zero closed schedule preserve budget without artificial deductions', () => {
  for (const items of [[], [item('I1', { remainingAmount: '0' })]]) {
    const result = allocate(input('100.1200', items)); assert.equal(result.budgetInput, '100.12'); assert.equal(result.budgetRemaining, '100.12'); conservation(result)
  }
})

test('duplicate installment identity rejects even if amount or source revision differ; shared sourceRef is valid', () => {
  rejected(() => allocate(input('100', [item(), item('I1', { sourceRevision: 2, remainingAmount: '1' })])), 'INSTALLMENT_DUPLICATE')
  rejected(() => allocate(input('100', [item(), item(' I1 ')])), 'INSTALLMENT_DUPLICATE')
  assert.equal(allocate(input('100', [item('A'), item('B')])).lines.length, 2)
})

test('manual deferral targets must be due open known and unique, with a strictly future period', () => {
  rejected(() => allocate(input('100', [item()], { manualDeferrals: [manual('UNKNOWN')] })), 'INSTALLMENT_DEFERRAL_TARGET')
  rejected(() => allocate(input('100', [item()], { manualDeferrals: [manual(), manual()] })), 'INSTALLMENT_DEFERRAL_TARGET')
  rejected(() => allocate(input('100', [item('I1', { remainingAmount: '0' })], { manualDeferrals: [manual()] })), 'INSTALLMENT_DEFERRAL_TARGET')
  rejected(() => allocate(input('100', [item('I1', { duePeriod: '2026-10' })], { manualDeferrals: [manual()] })), 'INSTALLMENT_DEFERRAL_TARGET')
  for (const to of ['2026-09', '2026-08']) rejected(() => allocate(input('100', [item()], { manualDeferrals: [manual('I1', to)] })), 'INSTALLMENT_DEFERRAL_PERIOD')
})

test('extension period must exceed current and every supplied due period of its loan', () => {
  rejected(() => allocate(input('0', [skip('I1', { extensionPeriod: '2026-09' })])), 'INSTALLMENT_EXTENSION_INVALID')
  rejected(() => allocate(input('0', [skip('I1'), item('FUTURE', { duePeriod: '2026-12' })])), 'INSTALLMENT_EXTENSION_INVALID')
  rejected(() => allocate(input('0', [skip('I1', { extensionPeriod: null })])), 'INSTALLMENT_PERIOD_INVALID')
  rejected(() => allocate(input('0', [item('I1', { extensionPeriod: '2026-12' })])), 'INSTALLMENT_EXTENSION_CONTRADICTION')
  const omitted = item(); delete omitted.extensionPeriod; assert.equal(allocate(input('0', [omitted])).lines[0].continuation.duePeriod, '2026-10')
})

test('period validation handles year transitions and years0001 without Date year-offset behavior', () => {
  const result = allocate(input('0', [item('I1', { originalDuePeriod: '0001-01', duePeriod: '0001-12' })], { period: '0001-12', nextPeriod: '0002-01' }))
  assert.equal(result.lines[0].continuation.duePeriod, '0002-01'); conservation(result)
  for (const invalid of ['0000-12', '2026-00', '2026-13', '2026-9', '2026-09-01']) rejected(() => allocate(input('0', [], { period: invalid })), 'INSTALLMENT_PERIOD_INVALID')
  rejected(() => allocate(input('0', [], { nextPeriod: '2026-11' })), 'INSTALLMENT_PERIOD_NEXT_INVALID')
  rejected(() => allocate(input('0', [], { period: '9999-12', nextPeriod: '9999-12' })), 'INSTALLMENT_PERIOD_RANGE')
})

test('automatic extension overflow is explicit instead of producing year10000 or losing a remainder', () => {
  rejected(() => allocate(input('0', [skip('A', { extensionPeriod: '9999-12' }), skip('B', { sequence: 2, extensionPeriod: '9999-12' })])), 'INSTALLMENT_PERIOD_RANGE')
  const last = allocate(input('0', [skip('A', { extensionPeriod: '9999-12' })])); assert.equal(last.lines[0].continuation.duePeriod, '9999-12')
})

test('manual tail at9999-12 blocks only a needed automatic extension, without moving the manual decision', () => {
  const source = input('0', [skip('A'), skip('B', { sequence: 2 })], { manualDeferrals: [manual('A', '9999-12')] })
  rejected(() => allocate(source), 'INSTALLMENT_PERIOD_RANGE')
  source.availableBudget = '2000'
  const funded = allocate(source); assert.equal(funded.lines[0].continuation.duePeriod, '9999-12'); assert.equal(funded.lines[1].outcome, 'DEDUCTED')
  conservation(funded)
})

test('invalid source ordering, numeric identity fields, modes and scales reject explicitly', () => {
  rejected(() => allocate(input('0', [item('I1', { originalDuePeriod: '2026-10' })])), 'INSTALLMENT_DUE_ORDER')
  for (const extra of [{ sourceRevision: 0 }, { sourceRevision: Number.MAX_SAFE_INTEGER + 1 }, { sequence: -1 }, { priority: 0.5 }, { priority: -1 }]) rejected(() => allocate(input('0', [item('I1', extra)])), 'INSTALLMENT_INPUT_VALUE')
  rejected(() => allocate(input('0', [item('I1', { insufficientMode: 'DROP' })])), 'INSTALLMENT_MODE_INVALID')
  rejected(() => allocate(input('0', [], { currencyScale: 6 })), 'INSTALLMENT_CURRENCY_SCALE')
  rejected(() => allocate(input(100)), 'INSTALLMENT_AMOUNT_INVALID')
  rejected(() => allocate(input('100', [item('I1', { remainingAmount: 100 })])), 'INSTALLMENT_AMOUNT_INVALID')
})

test('unknown keys reject at top, installment and manual decision levels', () => {
  rejected(() => allocate(input('0', [], { claims: [] })), 'INSTALLMENT_INPUT_UNKNOWN')
  rejected(() => allocate(input('0', [item('I1', { paid: true })])), 'INSTALLMENT_INPUT_UNKNOWN')
  rejected(() => allocate(input('0', [item()], { manualDeferrals: [{ ...manual(), approved: true }] })), 'INSTALLMENT_INPUT_UNKNOWN')
})

test('accessors, custom prototypes, symbols and dangerous own names are never evaluated', () => {
  let invoked = 0; const getterInput = input()
  Object.defineProperty(getterInput.installments[0], 'remainingAmount', { get() { invoked++; return '1' }, enumerable: true })
  rejected(() => allocate(getterInput), 'INSTALLMENT_INPUT_SHAPE'); assert.equal(invoked, 0)
  const custom = input(); Object.setPrototypeOf(custom.installments[0], { extra: 'value' }); rejected(() => allocate(custom), 'INSTALLMENT_INPUT_SHAPE')
  const symbol = input(); symbol[Symbol('key')] = 1; rejected(() => allocate(symbol), 'INSTALLMENT_INPUT_SHAPE')
  const poison = input(); Object.defineProperty(poison.installments[0], '__proto__', { value: 'poison', enumerable: true }); rejected(() => allocate(poison), 'INSTALLMENT_INPUT_SHAPE')
})

test('bounded lists and text reject excess, sparse rows and arrays with extra properties', () => {
  rejected(() => allocate(input('0', Array.from({ length: 1001 }, (_, index) => item(`I${index}`)))), 'INSTALLMENT_INPUT_LIMIT')
  rejected(() => allocate(input('0', [item()], { manualDeferrals: Array.from({ length: 1001 }, () => manual()) })), 'INSTALLMENT_INPUT_LIMIT')
  rejected(() => allocate(input('0', new Array(1))), 'INSTALLMENT_INPUT_SHAPE')
  const extra = input(); extra.installments.debug = 'x'; rejected(() => allocate(extra), 'INSTALLMENT_INPUT_SHAPE')
  for (const value of [item('X'.repeat(101)), item('I1', { sourceRef: 'X'.repeat(201) }), item('I1', { sourceRef: ' ' })]) rejected(() => allocate(input('0', [value])))
  for (const reason of ['ab', 'X'.repeat(501)]) rejected(() => allocate(input('0', [item()], { manualDeferrals: [{ ...manual(), reason }] })))
})

test('pure input is unchanged, output is deeply frozen and contains JSON values only', () => {
  const source = input('5000', [item()], { manualDeferrals: [manual()] }), before = copy(source), result = allocate(source)
  assert.deepEqual(source, before); assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.lines[0])); assert.ok(Object.isFrozen(result.lines[0].manualDeferral)); assert.ok(Object.isFrozen(result.lines[0].continuation))
  assert.deepEqual(copy(result), result)
})

test('deterministic varied schedules preserve every cent for all allocation modes and mixed priorities', () => {
  for (let sample = 0; sample < 40; sample++) {
    const items = Array.from({ length: 25 }, (_, index) => item(`I${index}`, { remainingAmount: `${(sample * 17 + index * 31) % 1000}.${String((sample + index * 7) % 100).padStart(2, '0')}`,
      loanRef: `L${index % 4}`, priority: index % 3, sequence: index + 1, originalDuePeriod: index % 2 ? '2026-08' : '2026-09',
      insufficientMode: index % 2 ? 'SKIP_AND_EXTEND' : 'PARTIAL_THEN_CARRY', extensionPeriod: index % 2 ? '2026-12' : null }))
    const result = allocate(input(`${sample * 129}.123456`, items)); conservation(result)
    assert.deepEqual(result, allocate(input(`${sample * 129}.123456`, [...items].reverse())))
  }
})

test('maximum supported schedule of1000 rows allocates without degrading precision or losing zero-balance trace', () => {
  const items = Array.from({ length: 1000 }, (_, index) => item(`I${String(index).padStart(4, '0')}`, { remainingAmount: index % 2 ? '0' : '0.01', sequence: index + 1 }))
  const result = allocate(input('2.50', items)); assert.equal(result.lines.length, 1000); assert.equal(result.totals.eligibleDueAmount, '5.00')
  assert.equal(result.totals.deductedAmount, '2.50'); assert.equal(result.totals.remainingAmount, '2.50'); conservation(result)
})
