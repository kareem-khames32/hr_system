const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { payrollLiveSourcePeriod: period, payrollLiveSourceContent: content } = require('../src/payroll/payroll-live-source-contract')

test('source period validates actual leap dates and end-month attribution without imposing a salary denominator', () => {
  assert.deepEqual(period('2028-02-29', '2028-03-31'), { startDate: '2028-02-29', endDate: '2028-03-31', periodDays: 32, periodKey: '2028-03' })
  assert.equal(period('2026-06-01', '2026-06-01').periodDays, 1)
})
test('invalid dates reversed intervals and more than one bounded cycle reject before source loading', () => {
  for (const pair of [['2026-02-29','2026-03-01'],['2026-06-31','2026-07-01'],['0000-01-01','0000-01-02'],['2026-07-01','2026-06-30'],['2026-06-01','2026-07-03'],['2026-6-1','2026-06-30'],[null,'2026-06-30']]) assert.throws(() => period(...pair), error => error.getStatus() === 400)
})
test('content fingerprint ignores object key order and retains list order and exact decimal text', () => {
  const a = content({ b: ['90071992547409.93', '0.01'], a: { amount: '1.00', id: 1 } })
  const b = content({ a: { id: 1, amount: '1.00' }, b: ['90071992547409.93', '0.01'] })
  assert.equal(a.contentHash, b.contentHash)
  assert.notEqual(a.contentHash, content({ ...a.snapshot, b: [...a.snapshot.b].reverse() }).contentHash)
  assert.equal(a.snapshot.b[0], '90071992547409.93')
})
test('snapshot retains historical dates and decouples nested input references', () => {
  const input = { capturedSourceAt: new Date('2026-01-01T00:00:00Z'), rows: [{ amount: '17.25' }] }
  const result = content(input)
  input.rows[0].amount = '0'; input.capturedSourceAt.setUTCFullYear(2025)
  assert.equal(result.snapshot.capturedSourceAt, '2026-01-01T00:00:00.000Z'); assert.equal(result.snapshot.rows[0].amount, '17.25')
})
test('nonfinite unsafe or unrepresentable evidence fails instead of becoming null or disappearing', () => {
  for (const value of [NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, undefined, 1n, () => 1, new Date('bad')]) {
    assert.throws(() => content({ nested: value }), error => error.getStatus() === 409 && error.getResponse().code === 'LIVE_SOURCE_CONTENT_INVALID')
  }
})
test('cycle and excessive nesting are bounded with a source-specific failure', () => {
  const cycle = {}; cycle.child = cycle
  assert.throws(() => content(cycle), error => error.getResponse().code === 'LIVE_SOURCE_CONTENT_LIMIT')
})
