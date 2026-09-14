'use strict'
// Real exact balance reader + fixture-only EntityManager; no database or service process.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/reflect-metadata')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { readPayrollLiveLedger: read, PayrollLiveLedgerProviderError } = require('../src/payroll/payroll-live-ledger-provider')
const { PAYROLL_INSTALLMENT_PLAN_VERSION } = require('../src/payroll/payroll-installment-ledger')
const { PAYROLL_INSTALLMENT_ALLOCATION_VERSION } = require('../src/payroll/payroll-installment-allocation')
const employeeId = 101, start = '2026-06-01', end = '2026-06-30'
const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30', monthlyDays: 30,
  dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null,
  minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
const loan = (patch = {}) => ({ id: 1, employeeId, requestId: 10, status: 'DISBURSED', amount: '100.00', disbursedAt: '2026-05-01T00:00:00', ...patch })
const position = (patch = {}) => ({ id: 1, loanId: 1, employeeId, dueDate: '2026-06-01', originalDueDate: null, amount: '100.00', paidAmount: null,
  paid: false, financialStatus: null, financialRevision: null, parentInstallmentId: null, paidAt: null, ...patch })
const obligation = (patch = {}) => ({ id: 11, employeeId, type: 'CREDIT', category: 'bonus', label: 'مستحق مثبت', status: 'PENDING', amount: '100.00', effectiveDate: null,
  sourceRequestId: null, sourceRef: 'approval:bonus:1', appliedPayrollRunId: null, appliedAt: null, ...patch })
const payroll = (patch = {}) => ({ id: 21, runId: 31, status: 'APPROVED', snapshotVersion: 1, loanInstallments: '0.00', otherAdditions: '0.00', otherDeductions: '0.00', breakdown: '{}', ...patch })
const allocation = (patch = {}) => ({ id: 41, installmentId: 1, employeeId, payrollRunId: 31, payrollSnapshotVersion: 1, sourceRevision: 1, deductedAmount: '40.00', carriedAmount: '60.00',
  continuationDueDate: '2026-07-01', outcome: 'PARTIAL', status: 'HELD', sourceSnapshot: JSON.stringify({ id: 1, loanId: 1, financialRevision: 1, remainingAmount: '100.00' }),
  claimedAt: '2026-06-30T12:00:00', postedAt: null, ...patch })
const settlement = (patch = {}) => ({ id: 51, status: 'SETTLED', autoLineCount: 1, settlementFinancialSnapshot: JSON.stringify({ version: 1, installments: [{ id: 1, loanId: 1, amount: 100 }], overtime: [] }), ...patch })
function manager(patch = {}) {
  const data = { loans: [], positions: [], allocations: [], payroll: [], settlements: [], obligations: [], ...patch }, calls = []
  return { queryRunner: { isTransactionActive: true }, calls, async query(text, params) {
    calls.push({ text, params })
    assert.match(text, /^SELECT TOP \(5001\)/)
    assert.doesNotMatch(text, /READUNCOMMITTED|NOLOCK|\b(?:INSERT|UPDATE|DELETE|MERGE|ALTER|CREATE|DROP|EXEC)\b/i)
    assert.equal(params[0], employeeId)
    let key
    if (/FROM \[loan_installments\] i/.test(text)) key = 'positions'
    else if (/FROM \[loans\]/.test(text)) key = 'loans'
    else if (/FROM \[loan_installment_allocations\]/.test(text)) key = 'allocations'
    else if (/FROM \[payroll_items\]/.test(text)) key = 'payroll'
    else if (/FROM \[offboarding_cases\]/.test(text)) key = 'settlements'
    else if (/FROM \[employee_obligations\]/.test(text)) key = 'obligations'
    assert.ok(key, text)
    if (data[key] instanceof Error) throw data[key]
    return structuredClone(data[key])
  }, getRepository() { throw new Error('Entity/simple-json reads forbidden') } }
}
const run = (patch = {}) => read(manager(patch), employeeId, start, end)
const hasIssue = (section, code) => assert.ok(section.issues.some(issue => issue.code === code), JSON.stringify(section.issues))
const claimed = (section, reason) => assert.ok(section.data.excluded.find(row => row.id === 1).exclusionReasons.includes(reason))

test('empty verified source groups are AVAILABLE with exact zero and no invented approval or installment', async () => {
  const em = manager(), result = await read(em, employeeId, start, end)
  assert.equal(em.calls.length, 6)
  for (const section of Object.values(result)) { assert.equal(section.state, 'AVAILABLE'); assert.deepEqual(section.issues, []); assert.deepEqual(section.sourceRefs, []) }
  assert.deepEqual(result.installments.data.positions, [])
  assert.equal(result.installments.data.totals.remainingAmount, '0.00'); assert.equal(result.credits.data.totalEligible, '0.00')
  assert.equal('approved' in result.installments.data, false)
  for (const call of em.calls) assert.match(call.text, /employeeId\]=@0/)
  assert.match(em.calls.find(call => /employee_obligations/.test(call.text)).text, /CAST\(\[amount\] AS nvarchar\(40\)\)/)
})

test('real exact position reader preserves maximum DEC18,2 cents without conversion through Number', async () => {
  const amount = '9999999999999999.99'
  const result = await run({ loans: [loan({ amount })], positions: [position({ amount })], obligations: [obligation({ amount })] })
  assert.equal(result.installments.state, 'AVAILABLE'); assert.equal(result.installments.data.eligible[0].amount, amount)
  assert.equal(result.installments.data.totals.remainingAmount, amount); assert.equal(result.credits.data.totalEligible, amount)
  assert.equal(result.credits.data.entries[0].upstreamSourceRef, 'approval:bonus:1')
  assert.equal(result.credits.data.entries[0].sourceRef, 'employee_obligations:11')
})

test('partial original preserves original amount and paid amount while only its child carries the remaining debt and future tail', async () => {
  const result = await run({ loans: [loan({ amount: '1000.00' })], positions: [position({ amount: '1000.00', paidAmount: '400.00', financialStatus: 'PARTIAL', financialRevision: 2 }),
    position({ id: 2, amount: '600.00', paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1, parentInstallmentId: 1, originalDueDate: '2026-06-01', dueDate: '2026-07-01' })] })
  assert.equal(result.installments.state, 'AVAILABLE')
  assert.equal(result.installments.data.positions[0].amount, '1000.00'); assert.equal(result.installments.data.positions[0].remainingAmount, '0.00')
  assert.deepEqual(result.installments.data.totals, { remainingAmount: '600.00', paidAmount: '400.00', eligibleAmount: '0.00', excludedOpenAmount: '600.00' })
  assert.equal(result.installments.data.scheduleTails[0].lastOpenDueDate, '2026-07-01')
  assert.deepEqual(result.installments.data.eligible, [])
  assert.ok(result.installments.data.excluded[1].exclusionReasons.includes('FUTURE_DUE'))
})

test('deferred original does not count as repayment and legacy paid row remains explicitly paid', async () => {
  const deferred = await run({ loans: [loan()], positions: [position({ financialStatus: 'DEFERRED', paidAmount: '0.00', financialRevision: 2 }),
    position({ id: 2, parentInstallmentId: 1, originalDueDate: '2026-06-01', dueDate: '2026-07-01' })] })
  assert.equal(deferred.installments.state, 'AVAILABLE'); assert.equal(deferred.installments.data.totals.remainingAmount, '100.00'); assert.equal(deferred.installments.data.totals.paidAmount, '0.00')
  const paid = await run({ loans: [loan({ status: 'SETTLED' })], positions: [position({ paid: true })] })
  assert.equal(paid.installments.data.positions[0].financialStatus, 'PAID'); assert.equal(paid.installments.data.positions[0].financialRevision, 1)
  assert.equal(paid.installments.data.totals.paidAmount, '100.00'); assert.equal(paid.installments.data.totals.remainingAmount, '0.00')
})

test('HELD claims include zero collection decisions and expose full balance without making it collectible', async () => {
  const result = await run({ loans: [loan()], positions: [position()], allocations: [allocation({ deductedAmount: '0.00', carriedAmount: '100.00', outcome: 'SKIP_AND_EXTEND' })] })
  assert.equal(result.installments.state, 'AVAILABLE'); claimed(result.installments, 'CLAIM_ALLOCATION_HELD')
  assert.equal(result.installments.data.totals.remainingAmount, '100.00'); assert.equal(result.installments.data.totals.eligibleAmount, '0.00')
  assert.deepEqual(result.installments.data.excluded[0].claimRefs, ['loan_installment_allocations:41'])
})

test('POSTED unreleased allocations remain an explicit claim and are never silently released during a read', async () => {
  const result = await run({ loans: [loan()], positions: [position()], allocations: [allocation({ status: 'POSTED', postedAt: '2026-06-30T13:00:00' })] })
  claimed(result.installments, 'CLAIM_ALLOCATION_POSTED'); assert.equal(result.installments.data.allocations[0].status, 'POSTED')
})

test('approved and paid legacy runs exclude documented installment and CREDIT references across all old periods', async () => {
  const result = await run({ loans: [loan()], positions: [position()], obligations: [obligation()], payroll: [payroll({ status: 'PAID', loanInstallments: '100.00', otherAdditions: '100.00', breakdown: '{"installmentIds":[1],"obligationIds":[11]}' })] })
  assert.equal(result.installments.state, 'AVAILABLE'); claimed(result.installments, 'CLAIM_PAYROLL_PAID')
  assert.equal(result.credits.state, 'AVAILABLE'); assert.equal(result.credits.data.totalPending, '100.00'); assert.equal(result.credits.data.totalEligible, '0.00')
  assert.equal(result.credits.data.excluded[0].id, 11)
})

test('modern approved installmentPlan claims only its eligible lines and reconciles exact collection with SQL money', async () => {
  const plan = { version: PAYROLL_INSTALLMENT_PLAN_VERSION, policy: { mode: 'PARTIAL_THEN_CARRY', settings }, context: { endDate: end },
    sources: [{ id: 1, financialRevision: 1, financialStatus: 'DUE', remainingAmount: '100.00' }], excludedClaimedIds: [], budget: { availableBudget: '40.00' },
    allocation: { engineVersion: PAYROLL_INSTALLMENT_ALLOCATION_VERSION, lines: [{ installmentRef: '1', dueAmount: '100.00', deductedAmount: '40.00', eligible: true }], totals: { deductedAmount: '40.00' } } }
  const fixture = { loans: [loan()], positions: [position()], payroll: [payroll({ loanInstallments: '40.00', breakdown: JSON.stringify({ installmentPlan: plan }) })] }
  const result = await run(fixture)
  assert.equal(result.installments.state, 'AVAILABLE'); claimed(result.installments, 'CLAIM_PAYROLL_APPROVED')
  const invalid = await run({ ...fixture, payroll: [payroll({ loanInstallments: '39.99', breakdown: JSON.stringify({ installmentPlan: plan }) })] })
  assert.equal(invalid.installments.state, 'INVALID'); hasIssue(invalid.installments, 'LIVE_PAYROLL_INSTALLMENT_PLAN_INVALID')
})

test('settlement sources are read as raw text, retain history and exclude their documented installment', async () => {
  const result = await run({ loans: [loan()], positions: [position()], settlements: [settlement()] })
  assert.equal(result.installments.state, 'AVAILABLE'); claimed(result.installments, 'CLAIM_SETTLEMENT_SETTLED')
  assert.equal(typeof result.installments.data.claims[0].rawSnapshot, 'string')
  assert.ok(result.installments.sourceRefs.includes('offboarding_cases:51'))
})

test('missing financial source metadata on a past automatic settlement blocks availability without assuming zero', async () => {
  const result = await run({ loans: [loan()], positions: [position()], settlements: [settlement({ settlementFinancialSnapshot: null })] })
  assert.equal(result.installments.state, 'INVALID'); hasIssue(result.installments, 'LIVE_SETTLEMENT_SOURCES_MISSING')
  assert.equal(result.installments.data.totals, null); assert.deepEqual(result.installments.data.eligible, [])
  assert.equal(result.installments.data.positions[0].amount, '100.00')
})

test('malformed or JSON-null previous payroll claims are INVALID even if old totals were zero', async () => {
  for (const breakdown of ['{broken', 'null', '[]', '0']) {
    const result = await run({ loans: [loan()], positions: [position()], payroll: [payroll({ breakdown })], obligations: [obligation()] })
    for (const section of Object.values(result)) { assert.equal(section.state, 'INVALID'); hasIssue(section, 'LIVE_LEDGER_SNAPSHOT_INVALID') }
    assert.equal(result.credits.data.totalEligible, null)
  }
})

test('positive old installment or CREDIT totals without source IDs are not treated as unclaimed zero', async () => {
  const result = await run({ loans: [loan()], positions: [position()], payroll: [payroll({ loanInstallments: '100.00', otherAdditions: '20.00' })] })
  assert.equal(result.installments.state, 'INVALID'); hasIssue(result.installments, 'LIVE_PAYROLL_INSTALLMENT_SOURCES_MISSING')
  assert.equal(result.credits.state, 'INVALID'); hasIssue(result.credits, 'LIVE_PAYROLL_OBLIGATION_SOURCES_MISSING')
  assert.equal(result.otherDebits.state, 'AVAILABLE')
})

test('invalid allocation conservation and corrupted settlement references expose INVALID while retaining raw evidence', async () => {
  const allocationResult = await run({ loans: [loan()], positions: [position()], allocations: [allocation({ deductedAmount: '40.01' })] })
  assert.equal(allocationResult.installments.state, 'INVALID'); hasIssue(allocationResult.installments, 'LIVE_LOAN_ALLOCATION_INVALID')
  assert.equal(allocationResult.installments.data.allocations[0].deductedAmount, '40.01')
  const settlementResult = await run({ loans: [loan()], positions: [position()], settlements: [settlement({ settlementFinancialSnapshot: '{"version":1,"installments":[{"id":1,"loanId":999,"amount":100}],"overtime":[]}' })] })
  assert.equal(settlementResult.installments.state, 'INVALID'); hasIssue(settlementResult.installments, 'LIVE_SETTLEMENT_SNAPSHOT_INVALID')
})

test('credits include immediate and overdue entries, while future entries remain visible in excluded', async () => {
  const result = await run({ obligations: [obligation(), obligation({ id: 12, effectiveDate: '2026-05-01', amount: '20.25' }), obligation({ id: 13, effectiveDate: end, amount: '1.01' }),
    obligation({ id: 14, effectiveDate: '2026-07-01', amount: '999.99' })] })
  assert.equal(result.credits.state, 'AVAILABLE'); assert.equal(result.credits.data.entries.length, 4)
  assert.equal(result.credits.data.totalPending, '1121.25'); assert.equal(result.credits.data.totalDueInPeriod, '121.26'); assert.equal(result.credits.data.totalEligible, '121.26')
  assert.deepEqual(result.credits.data.excluded.map(row => [row.id, row.exclusionReasons]), [[14, ['FUTURE_EFFECTIVE_DATE']]])
})

test('ordinary due DEBIT remains UNSUPPORTED and never appears as a loan or collectible CREDIT', async () => {
  const result = await run({ obligations: [obligation({ type: 'DEBIT', category: 'fine', amount: '250.55' })] })
  assert.equal(result.otherDebits.state, 'UNSUPPORTED'); hasIssue(result.otherDebits, 'LIVE_NON_INSTALLMENT_DEBIT_UNSUPPORTED')
  assert.equal(result.otherDebits.data.entries[0].amount, '250.55'); assert.equal(result.otherDebits.data.totalEligible, null)
  assert.deepEqual(result.installments.data.positions, []); assert.deepEqual(result.credits.data.entries, [])
})

test('future DEBIT stays excluded without pretending it is due in the current period', async () => {
  const result = await run({ obligations: [obligation({ type: 'DEBIT', effectiveDate: '2026-07-01' })] })
  assert.equal(result.otherDebits.state, 'AVAILABLE'); assert.equal(result.otherDebits.data.totalDueInPeriod, '0.00'); assert.equal(result.otherDebits.data.totalEligible, '0.00')
  assert.ok(result.otherDebits.data.excluded[0].exclusionReasons.includes('FUTURE_EFFECTIVE_DATE'))
})

test('corrupted partial chain and missing schedule never produce an apparently complete zero balance', async () => {
  const partial = await run({ loans: [loan()], positions: [position({ financialStatus: 'PARTIAL', paidAmount: '40.00' })] })
  assert.equal(partial.installments.state, 'INVALID'); hasIssue(partial.installments, 'LOAN_BALANCE_INVALID')
  assert.equal(partial.installments.data.rawPositions[0].amount, '100.00'); assert.equal(partial.installments.data.totals, null)
  const missing = await run({ loans: [loan()] })
  assert.equal(missing.installments.state, 'INVALID'); hasIssue(missing.installments, 'LIVE_LOAN_SCHEDULE_MISSING'); assert.equal(missing.installments.data.totals, null)
  assert.equal(missing.installments.data.scheduleTails[0].remainingAmount, null)
  const truncated = await run({ loans: [loan({ amount: '200.00' })], positions: [position()] })
  assert.equal(truncated.installments.state, 'INVALID'); hasIssue(truncated.installments, 'LIVE_LOAN_SCHEDULE_TOTAL_MISMATCH')
})

test('money returned as Number and inconsistent pending applied markers are rejected per source group', async () => {
  const result = await run({ loans: [loan()], positions: [position({ amount: 100 })], obligations: [obligation({ amount: 100 }), obligation({ id: 12, type: 'DEBIT', appliedPayrollRunId: 40 })] })
  assert.equal(result.installments.state, 'INVALID'); assert.equal(result.credits.state, 'INVALID'); assert.equal(result.otherDebits.state, 'INVALID')
  assert.equal(result.credits.data.totalPending, null); hasIssue(result.credits, 'LIVE_LEDGER_AMOUNT_INVALID')
  hasIssue(result.otherDebits, 'LIVE_OBLIGATION_INVALID')
})

test('stale HELD revision quarantines the source and an unknown obligation direction retains its raw row for review', async () => {
  const result = await run({ loans: [loan()], positions: [position({ financialRevision: 2 })], allocations: [allocation()], obligations: [obligation({ type: 'UNKNOWN' })] })
  assert.equal(result.installments.state, 'INVALID'); hasIssue(result.installments, 'LIVE_LOAN_ALLOCATION_STALE')
  assert.deepEqual(result.installments.data.eligible, [])
  for (const section of [result.credits, result.otherDebits]) {
    assert.equal(section.state, 'INVALID'); assert.equal(section.data.unclassifiedEntries[0].id, 11); assert.ok(section.sourceRefs.includes('employee_obligations:11'))
  }
})

test('schema absence is MISSING but unexpected connection errors propagate instead of becoming empty sources', async () => {
  const missing = await run({ allocations: Object.assign(new Error('missing fixture column'), { number: 207 }) })
  assert.equal(missing.installments.state, 'MISSING'); hasIssue(missing.installments, 'LIVE_LEDGER_SCHEMA_MISSING'); assert.equal(missing.installments.data.totals, null)
  assert.equal(missing.credits.state, 'AVAILABLE')
  const disconnected = new Error('fixture connection failed')
  await assert.rejects(run({ obligations: disconnected }), error => error === disconnected)
})

test('5001 rows fail with an explicit limit issue rather than silently truncating positions or credits', async () => {
  const result = await run({ loans: [loan()], positions: Array.from({ length: 5001 }, (_, i) => position({ id: i + 1 })), obligations: Array.from({ length: 5001 }, (_, i) => obligation({ id: i + 1 })) })
  assert.equal(result.installments.state, 'INVALID'); hasIssue(result.installments, 'LIVE_LEDGER_ROW_LIMIT')
  assert.equal(result.credits.state, 'INVALID'); hasIssue(result.credits, 'LIVE_LEDGER_ROW_LIMIT')
  assert.equal(result.credits.data.totalPending, null); assert.equal(result.installments.data.totals, null)
})

test('transaction, employee and real calendar period are checked before a query; input does not interpolate SQL', async () => {
  const em = manager(); em.queryRunner.isTransactionActive = false
  await assert.rejects(read(em, employeeId, start, end), error => error instanceof PayrollLiveLedgerProviderError && error.code === 'LIVE_LEDGER_TRANSACTION_REQUIRED')
  assert.equal(em.calls.length, 0)
  for (const invalid of [0, -1, 1.5, '101 OR 1=1', 2147483648]) {
    const em = manager(); await assert.rejects(read(em, invalid, start, end), error => error.code === 'LIVE_LEDGER_EMPLOYEE_INVALID'); assert.equal(em.calls.length, 0)
  }
  for (const [from, to] of [['2026-02-30', '2026-03-01'], [end, start], ['2026-01-01', end]]) {
    const em = manager(); await assert.rejects(read(em, employeeId, from, to)); assert.equal(em.calls.length, 0)
  }
})

test('identical reads are deterministic and leave source fixture arrays and snapshots unchanged', async () => {
  const fixture = { loans: [loan()], positions: [position()], allocations: [allocation()], obligations: [obligation()] }
  const before = structuredClone(fixture), first = await run(fixture), second = await run(fixture)
  assert.deepEqual(first, second); assert.deepEqual(fixture, before)
  assert.equal(JSON.stringify(first).includes('loan_installments:1'), true)
})
