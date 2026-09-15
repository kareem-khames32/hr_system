// Run: node --test api/test/eos-policy.test.cjs
// Synthetic arithmetic expectations for the configured rules in eos.ts.
// No network, database, system clock mutation, or new legal policy interpretation.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { buildEosPolicy, computeEos, serviceYears, parseResignationFactors, parseReasonFactors,
  eosConfigError, caseReason, eosLineLabel, EOS_DEFAULTS } = require('../src/offboarding/eos')
const { OffboardingService } = require('../src/offboarding/offboarding.service')
const defaultPolicy = buildEosPolicy(EOS_DEFAULTS)

// Literal expected payouts keep the assertions independent of computeEos itself.
test('default resignation factors change exactly at configured 2, 5 and 10 year thresholds', () => {
  const cases = [
    [1.99, 0, 0], [2, 1 / 3, 4000], [2.01, 1 / 3, 4020],
    [4.99, 1 / 3, 9980], [5, 2 / 3, 20000], [5.01, 2 / 3, 20080],
    [9.99, 2 / 3, 59920], [10, 1, 90000], [10.01, 1, 90120],
  ]
  for (const [years, factor, expected] of cases) {
    const result = computeEos(12000, years, 'resignation', defaultPolicy)
    assert.equal(result.factor, factor, `factor at ${years} years`)
    assert.equal(result.amount, expected, `payout at ${years} years`)
  }
})

test('termination uses the configured wage tiers without resignation threshold jumps', () => {
  for (const [years, expected] of [[1.99, 11940], [2, 12000], [2.01, 12060],
    [4.99, 29940], [5, 30000], [5.01, 30120], [9.99, 89880], [10, 90000], [10.01, 90120]]) {
    const result = computeEos(12000, years, 'termination', defaultPolicy)
    assert.equal(result.amount, expected, `termination payout at ${years} years`)
    assert.equal(result.factor, 1)
  }
  const atTier = computeEos(12000, 5, 'termination', defaultPolicy)
  assert.equal(atTier.firstYears, 5)
  assert.equal(atTier.laterYears, 0)
  const aboveTier = computeEos(12000, 6, 'termination', defaultPolicy)
  assert.equal(aboveTier.firstYears, 5)
  assert.equal(aboveTier.laterYears, 1)
  assert.equal(aboveTier.fullMonths, 3.5)
  assert.equal(aboveTier.amount, 42000)
})

test('default reason factors apply zero dismissal and full configured non-resignation payouts', () => {
  for (const reason of ['termination', 'contract_end', 'retirement', 'death', 'disability', 'force_majeure']) {
    assert.equal(computeEos(12000, 8, reason, defaultPolicy).amount, 66000, reason)
  }
  const dismissal = computeEos(12000, 8, 'dismissal', defaultPolicy)
  assert.equal(dismissal.full, 66000)
  assert.equal(dismissal.amount, 0)
  assert.match(eosLineLabel(dismissal, defaultPolicy), /لا تستحق/)
})

const customRaw = { firstTierMonths: '1', firstTierYears: '3', laterMonths: '2',
  resignationFactors: '0:1/4,3:1/2,7:1', reasonFactors: 'termination:0.75,retirement:0.5,dismissal:1/10' }
test('custom thresholds, wage tiers and reason factors override defaults without changing unspecified reasons', () => {
  const policy = buildEosPolicy(customRaw)
  assert.equal(computeEos(8000, 2, 'resignation', policy).amount, 4000)
  assert.equal(computeEos(8000, 3, 'resignation', policy).amount, 12000)
  assert.equal(computeEos(8000, 5, 'resignation', policy).amount, 28000)
  assert.equal(computeEos(8000, 7, 'resignation', policy).amount, 88000)
  assert.equal(computeEos(8000, 5, 'termination', policy).amount, 42000)
  assert.equal(computeEos(8000, 5, 'retirement', policy).amount, 28000)
  assert.equal(computeEos(8000, 5, 'dismissal', policy).amount, 5600)
  assert.equal(computeEos(8000, 5, 'contract_end', policy).amount, 56000)
})

test('payout rounding follows the existing two-stage money rule and zero service or wage yields zero', () => {
  const result = computeEos(1000.01, 5, 'resignation', defaultPolicy)
  assert.equal(result.full, 2500.03)
  assert.equal(result.amount, 1666.69)
  assert.equal(computeEos(0, 10, 'termination', defaultPolicy).amount, 0)
  assert.equal(computeEos(12000, 0, 'termination', defaultPolicy).amount, 0)
})

test('inclusive final working dates reach exactly 2, 5 and 10 years without fractional-year boundary loss', () => {
  for (const [years, before, boundary, after, expected] of [
    [2, '2021-12-30', '2021-12-31', '2022-01-01', 4000],
    [5, '2024-12-30', '2024-12-31', '2025-01-01', 20000],
    [10, '2029-12-30', '2029-12-31', '2030-01-01', 90000],
  ]) {
    assert.ok(serviceYears('2020-01-01', before) < years)
    assert.equal(serviceYears('2020-01-01', boundary), years)
    assert.ok(serviceYears('2020-01-01', after) > years)
    assert.equal(computeEos(12000, serviceYears('2020-01-01', boundary), 'resignation', defaultPolicy).amount, expected)
  }
})

test('calendar service length handles the existing leap-day anniversary convention and impossible/reversed dates', () => {
  assert.equal(serviceYears('2020-02-29', '2021-02-28'), 1)
  assert.equal(serviceYears('2020-02-29', '2022-02-28'), 2)
  assert.ok(serviceYears('2020-02-29', '2022-02-27') < 2)
  assert.equal(serviceYears('2026-02-30', '2026-12-31'), 0)
  assert.equal(serviceYears('2026-01-01', '2026-02-30'), 0)
  assert.equal(serviceYears('2026-05-01', '2026-04-30'), 0)
})

test('policy table parsers reject bad factors, missing fields, duplicate or reversed thresholds and unknown reasons', () => {
  for (const input of ['', '2:1/0', '2:-1', '2:1.01', '2:', '2:1/3,2:1', '5:1,2:1/3', '2:1:extra']) {
    assert.ok(parseResignationFactors(input).error, input)
    assert.ok(eosConfigError('eos.resignation_factors', input), input)
  }
  for (const input of ['unknown:1', 'resignation:1', 'termination:2', 'termination:1/0', 'termination:1,termination:0']) {
    assert.ok(parseReasonFactors(input).error, input)
    assert.ok(eosConfigError('eos.reason_factors', input), input)
  }
  assert.deepEqual(parseResignationFactors('2: 1 / 3، 5: 2/3، 10: 1').rows,
    parseResignationFactors(EOS_DEFAULTS.resignationFactors).rows)
})

test('legacy missing reason and malformed historical policy use their existing documented fallback rules', () => {
  assert.equal(caseReason({}), 'resignation')
  assert.equal(caseReason({ terminationReason: null }), 'resignation')
  assert.equal(caseReason({ terminationReason: 'retirement' }), 'retirement')
  const fallback = buildEosPolicy({ firstTierMonths: '-1', firstTierYears: 'invalid', laterMonths: '',
    resignationFactors: 'invalid', reasonFactors: 'unknown:1' })
  assert.deepEqual(fallback, defaultPolicy)
})

// Repository boundary doubles exercise the real service's preview and persisted
// line construction without a database. The SQL recovery integration suite
// separately covers actual repository transactions and persistence.
function serviceFixture(raw = EOS_DEFAULTS) {
  const persisted = []
  const keys = { 'eos.months_per_year': raw.firstTierMonths, 'eos.tier1_years': raw.firstTierYears,
    'eos.months_per_year_after': raw.laterMonths, 'eos.resignation_factors': raw.resignationFactors,
    'eos.reason_factors': raw.reasonFactors }
  const empty = { find: async () => [], findOne: async () => null }
  // حارس الأقساط المحجوزة في مسير معتمد (assertNoHeldLoanInstallments) يقرأ عبر manager مستودع البنود قبل بناء التسوية؛
  // البديل يسجل الاستعلام ولا يعيد صفوفًا محجوزة، فيبقى الحساب نفسه هو المختبر هنا
  const guardQueries = []
  const lines = { count: async () => persisted.length,
    create: rows => rows.map(row => ({ ...row })),
    save: async rows => { persisted.push(...rows.map(row => ({ ...row }))); return rows },
    manager: { query: async (text, params) => { guardQueries.push({ text, params }); return [] } } }
  const employee = { id: 1, employeeCode: 'EOS_TEST', fullName: 'Synthetic EOS employee',
    branchId: 1, status: 'active', isActive: true, joinDate: '2020-01-01', basicSalary: 12000 }
  const employees = { findOne: async () => employee }
  const config = { findOne: async ({ where }) => keys[where.key] === undefined ? null : { key: where.key, value: keys[where.key] } }
  const service = new OffboardingService(empty, empty, lines, employees, empty, empty, empty, empty,
    empty, empty, empty, empty, empty, config, {}, { balanceOf: async () => null })
  return { service, persisted, guardQueries }
}
const actor = { sub: 99, role: 'super_admin', branchId: null, permissions: ['*'] }

test('service preview and persisted EOS lines match independent expected amounts at every resignation/termination boundary', async () => {
  for (const [lastWorkingDay, resignation, termination] of [
    ['2021-12-31', 4000, 12000], ['2024-12-31', 20000, 30000], ['2029-12-31', 90000, 90000],
  ]) {
    for (const [reason, expected] of [['resignation', resignation], ['termination', termination]]) {
      const { service, persisted, guardQueries } = serviceFixture()
      const preview = await service.preview(actor, { employeeId: 1, reason, lastWorkingDay })
      assert.equal(preview.blockReason, null)
      assert.equal(persisted.length, 0, 'preview has no line writes')
      assert.equal(preview.lines.length, 1)
      assert.equal(preview.lines[0].amount, expected, `${reason} at ${lastWorkingDay}`)
      guardQueries.length = 0
      await service.buildSettlement({ id: 71, employeeId: 1, terminationReason: reason, lastWorkingDay }, true)
      assert.ok(guardQueries.some(({ text, params }) => /\[loan_installment_allocations\]/.test(text) && /'HELD'/.test(text) && params[0] === 1),
        'settlement checks held payroll installments of this employee before building lines')
      assert.equal(persisted.length, 1)
      assert.equal(persisted[0].caseId, 71)
      assert.equal(persisted[0].isAuto, true)
      assert.deepEqual(persisted.map(({ label, type, amount }) => ({ label, type, amount })), preview.lines)
      assert.equal(preview.net, expected)
    }
  }
})

test('service preview respects custom policy and zero payouts do not create a fictitious EOS line', async () => {
  const custom = serviceFixture(customRaw)
  const preview = await custom.service.preview(actor, { employeeId: 1, reason: 'termination', lastWorkingDay: '2024-12-31' })
  assert.equal(preview.lines[0].amount, 63000)
  await custom.service.buildSettlement({ id: 72, employeeId: 1, terminationReason: 'termination', lastWorkingDay: '2024-12-31' }, true)
  assert.equal(custom.persisted[0].amount, 63000)
  const beforeTwoYears = serviceFixture()
  const zero = await beforeTwoYears.service.preview(actor, { employeeId: 1, reason: 'resignation', lastWorkingDay: '2021-12-30' })
  assert.deepEqual(zero.lines, [])
  assert.equal(zero.net, 0)
  await beforeTwoYears.service.buildSettlement({ id: 73, employeeId: 1, terminationReason: 'resignation', lastWorkingDay: '2021-12-30' }, true)
  assert.equal(beforeTwoYears.persisted.length, 0)
})
