// B4 / ترحيل 20260914_028: تحويل شرائح التأخير القديمة إلى مجموعة مؤرخة — منطق التحويل والتحقق والبصمة على مدير قاعدة وهمي (بلا SQL حقيقي).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const migration = require('../../docs/migrations/payroll/20260914_028_b4_legacy_lateness_tier_conversion.cjs')
const tiers = require('../src/payroll/payroll-lateness-tiers')
const requireApi = file => require(path.join(__dirname, '..', file))

/** مدير وهمي: يسجل الاستعلامات ويعيد صفوف الجدول القديم، ويحاكي قراءة المجموعة المكتوبة للتحقق من البصمة. */
function fakeManager(legacyRows, { existing = 0 } = {}) {
  const queries = [], sets = [], written = []
  const qb = () => {
    const state = {}
    const chain = { select: () => chain, addSelect: () => chain, where: (_sql, params) => { Object.assign(state, params); return chain }, orderBy: () => chain, addOrderBy: () => chain, limit: () => chain,
      getRawMany: async () => written.filter(row => row.setId === state.setId).map(row => ({ ...row })), getRawOne: async () => null }
    return chain
  }
  const manager = {
    connection: { options: { type: 'mssql' } },
    query: async (sql, params = []) => {
      queries.push({ sql, params })
      if (/COUNT\(\*\) AS n FROM dbo\.payroll_lateness_tier_sets/.test(sql)) return [{ n: existing }]
      if (/FROM dbo\.lateness_tiers/.test(sql)) return legacyRows
      if (/^INSERT INTO dbo\.payroll_lateness_tier_sets/.test(sql)) { sets.push({ id: 41, effectivePeriod: params[0], contentHash: params[1], source: 'LEGACY_CONVERSION', reason: params[2] }); return [] }
      if (/SELECT TOP \(1\) \[id\] FROM dbo\.payroll_lateness_tier_sets/.test(sql)) return [{ id: 41 }]
      if (/^INSERT INTO dbo\.payroll_lateness_tier_set_tiers/.test(sql)) { written.push({ setId: params[0], sequence: params[1], fromMinutes: params[2], toMinutes: params[3], mode: params[4], value: params[5], label: params[6] }); return [] }
      throw new Error(`unexpected query: ${sql}`)
    },
    getRepository: () => ({ findOneBy: async ({ id }) => sets.find(set => set.id === id) ?? null, createQueryBuilder: qb }),
  }
  return { manager, queries, sets, written }
}

test('028 converts the active legacy tiers (inclusive bounds, day fractions) into one dated set with a verified content hash; inactive rows are not converted', async () => {
  const legacy = [{ id: 6, fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250', label: null }, { id: 8, fromMinutes: 61, toMinutes: 120, mode: 'FRACTION', value: '0.500', label: null }]
  const fake = fakeManager(legacy)
  const result = await migration.up({ manager: fake.manager, requireApi, log: () => {} })
  const expected = [{ sequence: 1, fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250', label: null }, { sequence: 2, fromMinutes: 61, toMinutes: 120, mode: 'FRACTION', value: '0.500', label: null }]
  assert.deepEqual(fake.written.map(({ setId: _setId, ...row }) => row), expected)
  assert.equal(result.contentHash, tiers.payrollLatenessTierSetHash('2000-01', expected))
  assert.deepEqual([result.setId, result.tiers, result.legacyActiveRows, result.gaps, result.effectivePeriod], [41, 2, 2, 1, '2000-01'])
  assert.ok(fake.queries.every(query => !/\b(DELETE|UPDATE|DROP|TRUNCATE)\b/i.test(query.sql)), 'the conversion only reads the legacy table and inserts new rows')
  assert.match(fake.sets[0].reason, /#6، #8/)
})

test('028 is re-runnable, maps MINUTES and zero fractions faithfully, and stops (instead of silently trimming) when active legacy tiers overlap', async () => {
  const skipped = fakeManager([], { existing: 1 })
  assert.deepEqual(await migration.up({ manager: skipped.manager, requireApi }), { skipped: 'مجموعة التحويل موجودة بالفعل' })
  assert.deepEqual(migration.legacyRowsToTiers([{ fromMinutes: 0, toMinutes: 5, mode: 'FRACTION', value: '0.000', label: 'سماح' }, { fromMinutes: 6, toMinutes: null, mode: 'MINUTES', value: '0.000', label: null }])
    .map(row => [row.mode, row.value]), [['NONE', '0'], ['MINUTES', '0']])
  const overlapping = fakeManager([{ id: 1, fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250', label: null }, { id: 2, fromMinutes: 30, toMinutes: null, mode: 'MINUTES', value: '0', label: null }])
  await assert.rejects(migration.up({ manager: overlapping.manager, requireApi }), error => error.getResponse().code === 'LATE-TIERS-OVERLAP')
  assert.equal(overlapping.written.length, 0)
})
