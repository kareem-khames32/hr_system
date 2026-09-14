// محاكاة نتائج SELECT لاختبار تفسير المصدر فقط؛ لا SQL حي أو تشغيل خدمات أو كتابة مالية.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { readPayrollLiveOvertime: read } = require('../src/payroll/payroll-live-overtime-provider')
const { payrollLiveSourceContent } = require('../src/payroll/payroll-live-source-contract')
const copy = value => JSON.parse(JSON.stringify(value))
const start = '2026-09-01', end = '2026-09-30'
function overtime(id = 1, amount = '75.00', extra = {}) {
  const date = extra.date ?? '2026-09-05', price = Number(amount)
  const evidence = { fingerprint: 'a'.repeat(64), employeeId: 9, workDate: date, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', policy: { multiplier: 1 } }
  const approval = { schemaVersion: 1, employeeId: 9, workDate: date, approvedAt: '2026-09-06T10:00:00Z', approverId: 4,
    approvedMinutes: 60, hours: 1, multiplier: 1, hourlyRate: price, amount: price, wageBase: price * 240,
    wageComponents: [{ code: 'BASIC', amount: price * 240 }], monthlyDays: 30, dailyHours: 8, dayKind: 'WEEKDAY',
    evidenceMode: 'PUNCH', evidenceFingerprint: evidence.fingerprint, evidence, originalPeriod: date.slice(0, 7), deferredFromRunId: null }
  return { id, employeeId: 9, requestId: id + 100, date, source: 'PRE_REQUESTED', status: 'APPROVED', payrollRunId: null,
    hoursRequested: '1.00', hoursActual: '1.00', payableHours: '1.00', rate: '1.00', approvedMinutes: 60,
    hourlyRateSnapshot: price.toFixed(6), amountSnapshot: amount, originalPeriod: date.slice(0, 7), deferredFromRunId: null,
    calculationSnapshot: JSON.stringify({ schemaVersion: 1, approval }), activeDateCount: 1, ...extra }
}
const legacy = (id = 1, extra = {}) => overtime(id, '75.00', { calculationSnapshot: null, approvedMinutes: null, hourlyRateSnapshot: null, amountSnapshot: null, originalPeriod: null, deferredFromRunId: null, ...extra })
const payroll = (runId = 21, ids = [], extra = {}) => ({ id: runId + 1000, runId, breakdown: JSON.stringify({ overtimeEntryIds: ids }), overtimeAmount: ids.length ? '75.00' : '0.00', status: 'APPROVED', period: '2026-09', startDate: start, endDate: end, ...extra })
const settlement = (id = 31, ids = [], extra = {}) => ({ id, status: 'SETTLED', settlementFinancialSnapshot: JSON.stringify({ version: 1, overtime: ids.map(id => ({ id, amount: 75 })), installments: [] }), hasAutoLines: 1, hasApprovedOvertime: 1, ...extra })
async function run(data = {}, employeeId = 9, from = start, to = end) {
  const buckets = { overtime: [], payroll: [], periods: [], settlement: [], ...copy(data) }, before = copy(buckets), calls = []
  const em = { query: async (sql, params) => {
    assert.match(sql.trim(), /^SELECT\s/i)
    assert.doesNotMatch(sql, /READUNCOMMITTED|NOLOCK|\b(?:UPDATE|INSERT|DELETE|MERGE|EXEC)\b/i)
    calls.push({ sql, params })
    if (sql.includes('FROM dbo.payroll_items')) return buckets.payroll
    if (sql.includes('FROM dbo.payroll_period_claims')) return buckets.periods
    if (sql.includes('FROM dbo.offboarding_cases')) return buckets.settlement
    if (sql.includes('FROM dbo.overtime_entries o WHERE')) return buckets.overtime
    throw new Error('Unexpected query')
  } }
  const output = await read(em, employeeId, from, to)
  assert.deepEqual(buckets, before, 'source SELECT results remain unchanged')
  return { ...output, calls }
}
const hasIssue = (result, code) => result.issues.some(issue => issue.code === code)

test('approved SQL money remains exact, cents sum without floating drift and no live price lookup', async () => {
  const result = await run({ overtime: [overtime(1, '0.10'), overtime(2, '0.20', { date: '2026-09-06' })] })
  assert.equal(result.state, 'AVAILABLE')
  assert.deepEqual(result.data.totals, { eligibleAmount: '0.30', eligibleApprovedMinutes: 120 })
  assert.deepEqual(result.data.rows.map(row => row.approvedAmount), ['0.10', '0.20'])
  assert.ok(result.data.rows.every(row => row.eligible && row.pricingState === 'APPROVAL_SNAPSHOT'))
  assert.ok(result.calls.every(call => !/requests_config|employees\b/.test(call.sql)))
  assert.equal(result.calls.length, 4)
  assert.match(result.calls[0].sql, /CONVERT\(varchar\(40\),o.amountSnapshot\)/)
  assert.deepEqual(result.calls[0].params, [9, start, end])
})

test('approval price is never rescaled to a newly selected wage setting', async () => {
  const result = await run({ overtime: [overtime()] })
  assert.equal(result.data.rows[0].approvedAmount, '75.00')
  assert.equal(result.data.rows[0].approvalSnapshot.approval.wageComponents.length, 1, 'historical approved component subset remains valid')
  assert.equal(result.data.totals.eligibleAmount, '75.00')
})

test('payment link on an approved row is contradictory even when no old breakdown claims the source', async () => {
  for (const payrollRunId of [21, 0, -1]) {
    const result = await run({ overtime: [overtime(1, '75.00', { payrollRunId })] })
    assert.equal(result.state, 'INVALID'); assert.equal(result.data.totals, null)
    assert.equal(result.data.rows[0].payrollRunId, payrollRunId)
    assert.equal(result.data.rows[0].eligible, false); assert.ok(hasIssue(result, 'OT_PAYMENT_LINK_INVALID'))
  }
})

test('large but safe approved prices are summed as decimal strings', async () => {
  const result = await run({ overtime: [overtime(1, '100000000000.25'), overtime(2, '100000000000.25', { date: '2026-09-06' })] })
  assert.equal(result.state, 'AVAILABLE', JSON.stringify(result.issues))
  assert.equal(result.data.totals.eligibleAmount, '200000000000.50')
})

test('legacy approved entries with or without payable hours are unsupported and block partial totals', async () => {
  for (const payableHours of [null, '1.00', '0.00']) {
    const result = await run({ overtime: [legacy(1, { payableHours }), overtime(2, '75.00', { date: '2026-09-06' })] })
    assert.equal(result.state, 'UNSUPPORTED'); assert.equal(result.data.totals, null)
    assert.ok(hasIssue(result, 'OT_LEGACY_UNPRICED'))
    assert.equal(result.data.rows[0].approvedAmount, null)
    assert.ok(result.data.rows.every(row => row.eligible === false))
  }
})

test('corrupt raw snapshots and new approval fields without snapshot return INVALID, never JSON exceptions', async () => {
  for (const calculationSnapshot of ['{broken', '[]', 'null', '{"schemaVersion":1,"approval":{"amount":1e999}}', null]) {
    const result = await run({ overtime: [overtime(1, '75.00', { calculationSnapshot })] })
    assert.equal(result.state, 'INVALID'); assert.equal(result.data.totals, null)
    assert.equal(result.data.rows[0].pricingState, 'INVALID')
    assert.equal(result.data.rows[0].approvalSnapshot, null)
    assert.doesNotThrow(() => payrollLiveSourceContent(result.data), 'invalid evidence must remain representable in parent response')
  }
})

test('SQL amount versus approval mismatch cannot pass a Number round trip', async () => {
  const source = overtime(1, '75.00'); source.amountSnapshot = '75.01'
  const result = await run({ overtime: [source] })
  assert.equal(result.state, 'INVALID'); assert.ok(hasIssue(result, 'OT_APPROVAL_AMOUNT_UNSAFE'))
  assert.equal(result.data.totals, null)
})

test('unsafe cents or extra precision in numeric approval rejects AVAILABLE', async () => {
  for (const amount of ['90071992547409.92', '9999999999999999.99']) {
    const result = await run({ overtime: [overtime(1, amount)] })
    assert.equal(result.state, 'INVALID'); assert.equal(result.data.totals, null)
    assert.doesNotThrow(() => payrollLiveSourceContent(result.data))
  }
  const source = overtime(1, '0.29'), snapshot = JSON.parse(source.calculationSnapshot)
  snapshot.approval.amount = 0.29000000000000004; source.calculationSnapshot = JSON.stringify(snapshot)
  assert.equal((await run({ overtime: [source] })).state, 'INVALID')
  assert.equal((await run({ overtime: [overtime(1, '0.29')] })).state, 'AVAILABLE')
})

test('pending, rejected and cancelled workflow rows are visible but never priced or eligible', async () => {
  const result = await run({ overtime: ['DETECTED', 'SUBMITTED', 'REJECTED', 'CANCELLED'].map((status, i) => legacy(i + 1, { status, date: `2026-09-0${i + 1}`, calculationSnapshot: JSON.stringify({ schemaVersion: 1, submission: { evidence: 'pending' } }), activeDateCount: status === 'REJECTED' || status === 'CANCELLED' ? 0 : 1 })) })
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.totals.eligibleAmount, '0.00')
  assert.ok(result.data.rows.every(row => !row.eligible && row.approvedAmount === null && row.pricingState === 'NOT_APPROVED'))
  assert.deepEqual(result.data.rows.map(row => row.reasons[0]), ['PENDING_APPROVAL', 'PENDING_APPROVAL', 'REJECTED', 'CANCELLED'])
})

test('paid sources remain visible with original amount and are excluded from eligible totals', async () => {
  const result = await run({ overtime: [overtime(1, '75.00', { status: 'PAID', payrollRunId: 21 })], payroll: [payroll(21, [1], { status: 'PAID' })] })
  assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.totals.eligibleAmount, '0.00')
  assert.equal(result.data.rows[0].approvedAmount, '75.00'); assert.equal(result.data.rows[0].eligible, false)
  assert.deepEqual(result.data.rows[0].reasons, ['ALREADY_PAID', 'CLAIMED_BY_PAYROLL'])
})

test('approved and paid payroll claims exclude sources; draft runs cannot be included by query', async () => {
  for (const status of ['APPROVED', 'PAID']) {
    const result = await run({ overtime: [overtime()], payroll: [payroll(21, [1], { status })] })
    assert.equal(result.data.totals.eligibleAmount, '0.00'); assert.equal(result.data.rows[0].claims[0].status, status)
    assert.match(result.calls[1].sql, /r.status IN \('APPROVED','PAID'\)/)
    assert.ok(result.sourceRefs.includes('payroll-item:1021'))
  }
})

test('SETTLED and CLOSED settlements exclude their exact overtime source ids', async () => {
  for (const status of ['SETTLED', 'CLOSED']) {
    const result = await run({ overtime: [overtime()], settlement: [settlement(31, [1], { status })] })
    assert.equal(result.state, 'AVAILABLE'); assert.equal(result.data.totals.eligibleAmount, '0.00')
    assert.deepEqual(result.data.rows[0].claims, [{ kind: 'SETTLEMENT', id: 31, status, sourceRef: 'settlement:31' }])
    assert.match(result.calls[3].sql, /c.status IN \('SETTLED','CLOSED'\)/)
  }
})

test('old automatic settlement lacking source snapshot blocks unresolved approved overtime', async () => {
  const result = await run({ overtime: [overtime()], settlement: [settlement(31, [], { settlementFinancialSnapshot: null })] })
  assert.equal(result.state, 'UNSUPPORTED'); assert.equal(result.data.totals, null)
  assert.ok(hasIssue(result, 'OT_SETTLEMENT_CLAIMS_UNRESOLVED'))
  for (const extra of [{ hasAutoLines: 0 }, { hasApprovedOvertime: 0 }]) {
    assert.equal((await run({ settlement: [settlement(31, [], { settlementFinancialSnapshot: null, ...extra })] })).state, 'AVAILABLE')
  }
})

test('invalid or ambiguous payroll and settlement claim JSON produces INVALID', async () => {
  for (const row of [payroll(21, [], { breakdown: '{broken' }), payroll(21, [], { breakdown: '{}', overtimeAmount: '1.00' }), payroll(21, [1, 1]), payroll(21, [], { breakdown: '[]' })]) {
    const result = await run({ overtime: [overtime()], payroll: [row] })
    assert.equal(result.state, 'INVALID'); assert.ok(hasIssue(result, 'OT_PAYROLL_CLAIMS_INVALID')); assert.equal(result.data.totals, null)
  }
  for (const snapshot of ['{broken', JSON.stringify({ version: 2, overtime: [], installments: [] }), JSON.stringify({ version: 1, overtime: [{ id: 1, amount: 75 }, { id: 1, amount: 75 }], installments: [] })]) {
    const result = await run({ overtime: [overtime()], settlement: [settlement(31, [], { settlementFinancialSnapshot: snapshot })] })
    assert.equal(result.state, 'INVALID'); assert.ok(hasIssue(result, 'OT_SETTLEMENT_CLAIMS_INVALID'))
  }
})

test('a source claimed by two runs or payroll plus settlement is not silently merged', async () => {
  for (const data of [{ payroll: [payroll(21, [1]), payroll(22, [1])] }, { payroll: [payroll(21, [1])], settlement: [settlement(31, [1])] }]) {
    const result = await run({ overtime: [overtime()], ...data })
    assert.equal(result.state, 'INVALID'); assert.ok(hasIssue(result, 'OT_DUPLICATE_CLAIM')); assert.equal(result.data.totals, null)
  }
})

test('approved backlog requires a closed covered period and keeps its original approval price', async () => {
  const source = overtime(1, '75.00', { date: '2026-08-10' })
  const unclosed = await run({ overtime: [source] })
  assert.equal(unclosed.state, 'AVAILABLE'); assert.equal(unclosed.data.totals.eligibleAmount, '0.00')
  assert.ok(unclosed.data.rows[0].reasons.includes('BACKLOG_WITHOUT_CLOSED_PERIOD'))
  const data = { overtime: [source], payroll: [payroll(21, [], { period: '2026-08', startDate: '2026-08-01', endDate: '2026-08-31' })] }
  const closed = await run(data)
  assert.equal(closed.data.totals.eligibleAmount, '75.00'); assert.equal(closed.data.rows[0].retroactive, true)
  assert.equal(closed.data.rows[0].closedPeriod.runId, 21); assert.equal(closed.data.rows[0].eligible, true)
  assert.ok(closed.data.rows[0].reasons.includes('ELIGIBLE_RETROACTIVE'))
})

test('active period claim is read without dirty hints and before historical run fallback', async () => {
  const result = await run({ overtime: [overtime(1, '75.00', { date: '2026-08-10' })],
    periods: [{ id: 8, runId: 22, period: '2026-08', startDate: '2026-08-01', endDate: '2026-08-31' }],
    payroll: [payroll(21, [], { period: '2026-08', startDate: '2026-08-01', endDate: '2026-08-31' })] })
  assert.equal(result.data.rows[0].closedPeriod.runId, 22)
  assert.ok(result.sourceRefs.includes('payroll-period-claim:8'))
  assert.match(result.calls[2].sql, /c.releasedAt IS NULL/)
})

test('duplicate active day or duplicate source id is INVALID even if one source is pending or already claimed', async () => {
  for (const sources of [[overtime(1, '75.00', { activeDateCount: 2 })], [overtime(), overtime()]]) {
    const result = await run({ overtime: sources, payroll: [payroll(21, [1])] })
    assert.equal(result.state, 'INVALID'); assert.equal(result.data.totals, null)
  }
  const result = await run({ overtime: [overtime(1, '75.00', { status: 'SUBMITTED', activeDateCount: 2 })] })
  assert.ok(hasIssue(result, 'OT_DUPLICATE_DAY'))
})

test('empty explicit read returns known zero; invalid identifiers/dates perform no SELECT', async () => {
  const empty = await run()
  assert.equal(empty.state, 'AVAILABLE'); assert.deepEqual(empty.data.rows, []); assert.equal(empty.data.totals.eligibleAmount, '0.00')
  for (const args of [[0, start, end], [9, '2026-02-30', end], [9, end, start], [9, '0000-01-01', end]]) {
    const result = await run({}, ...args)
    assert.equal(result.state, 'INVALID'); assert.equal(result.calls.length, 0)
  }
})

test('combined source row limit prevents pretending truncated reads are complete', async () => {
  const result = await run({ overtime: Array(5001).fill(overtime()) })
  assert.equal(result.state, 'UNSUPPORTED'); assert.ok(hasIssue(result, 'OT_SOURCE_LIMIT'))
  assert.equal(result.data.totals, null); assert.deepEqual(result.data.rows, [])
  assert.ok(result.calls.every(call => /TOP \(5001\)/.test(call.sql)))
})

test('same source data produces stable content hash and preserves raw approval evidence', async () => {
  const source = overtime(), first = await run({ overtime: [source] }), second = await run({ overtime: [source] })
  assert.equal(first.data.rows[0].rawCalculationSnapshot, source.calculationSnapshot)
  assert.equal(payrollLiveSourceContent(first.data).contentHash, payrollLiveSourceContent(second.data).contentHash)
})
