const { test } = require('node:test')
const assert = require('node:assert/strict'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { normalizeMonthlySalaryPeriods: normalize, selectPayrollPeriodSalary: select, salaryPayrollPeriodBounds: bounds,
  salaryPayrollPeriod: period, PAYROLL_MONTHLY_SALARY_HISTORY_VERSION: version, PayrollPeriodSalaryError } = require('../src/payroll/payroll-period-salary')
const { readSalaryHistory: read, salaryHistoryContentHash: legacyHash, monthlySalaryHistoryContentHash: monthlyHash,
  appendSalaryHistoryRevision: appendLegacy } = require('../src/payroll/payroll-salary-history')
const money = { basicSalary: '10000.00', housingAllowance: '1000.00', transportAllowance: '200.00', phoneAllowance: '30.00', workNatureAllowance: '40.00', otherAllowance: '50.00' }
const row = (patch = {}) => ({ ...money, currency: 'EGP', effectivePayrollPeriod: '2026-09', effectiveToPayrollPeriod: null, ...patch })
const invalid = error => error instanceof PayrollPeriodSalaryError && error.state === 'INVALID'
const missing = code => error => error instanceof PayrollPeriodSalaryError && error.state === 'MISSING' && error.code === code
function history(periods = [row()], cycleStartDay = 23) {
  const segments = normalize(periods, cycleStartDay), header = { id: 7, employeeId: 3, revision: 1, reason: 'قرار شهر الاستحقاق', evidenceReference: 'مستند 33',
    currentSourceHash: 'a'.repeat(64), createdBy: 4, createdAt: new Date('2026-09-14T12:00:00Z'), contractVersion: version, cycleStartDay }
  header.contentHash = monthlyHash({ employeeId: 3, revision: 1, reason: header.reason, evidenceReference: header.evidenceReference,
    currentSourceHash: header.currentSourceHash, cycleStartDay, segments, createdBy: header.createdBy, createdAt: header.createdAt.toISOString() })
  return { header, revision: 1, version: { ...header, createdAt: header.createdAt.toISOString() }, segments }
}
function em(fixture) {
  return { queryRunner: { isTransactionActive: true }, query: async sql => {
    if (sql.includes('sp_getapplock')) return [{ lockResult: 0 }]
    assert.match(sql, /^SELECT /)
    return sql.includes('employee_salary_history_versions') ? [{ ...fixture.header, createdAtUtc: fixture.header.createdAtUtc ?? fixture.header.createdAt.toISOString().slice(0, -1) }] : fixture.segments.map((row, index) => ({ sequence: index + 1, ...row }))
  } }
}

test('سبتمبر يعني دورة23أغسطس إلى22سبتمبر براتب شهري كامل واحد', () => {
  assert.deepEqual(bounds('2026-09', 23), { startDate: '2026-08-23', endDate: '2026-09-22' })
  const result = select(history(), '2026-09')
  assert.equal(result.segment.basicSalary, '10000.00'); assert.equal(result.referencePeriod, '2026-09')
  assert.equal(result.segment.effectiveFrom, '2026-08-23'); assert.equal(result.sourceRefs.length, 2)
})
test('نهاية الشهر شاملة واختيار أكتوبر لا يتسرب إلى سبتمبر أو أغسطس', () => {
  const h = history([row({ effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: '2026-08', basicSalary: '8000' }),
    row({ effectiveToPayrollPeriod: '2026-09' }), row({ effectivePayrollPeriod: '2026-10', basicSalary: '15000' })])
  assert.equal(select(h, '2026-08').segment.basicSalary, '8000.00')
  assert.equal(select(h, '2026-09').segment.basicSalary, '10000.00')
  assert.equal(select(h, '2026-10').segment.basicSalary, '15000.00')
})
test('الاختيار مستقل عن يوم الدورة المحفوظ ولا يزن أجزاء الراتب', () => {
  for (const cycle of [1, 23, 31]) assert.equal(select(history([row()], cycle), '2026-09').segment.basicSalary, '10000.00')
})
test('الفجوات وقبل أول شهر وبعد آخر شهر تظل نقص إثبات', () => {
  const h = history([row({ effectiveToPayrollPeriod: '2026-09' }), row({ effectivePayrollPeriod: '2026-11', effectiveToPayrollPeriod: '2026-12' })])
  for (const value of ['2026-08', '2026-10', '2027-01']) assert.throws(() => select(h, value), missing('SALARY_PAYROLL_PERIOD_GAP'))
})
test('البيانات اليومية القديمة لا تتحول إلى دليل شهري حتى مع تغطية الدورة كلها', () => {
  assert.throws(() => select({ revision: 0, version: null, segments: [] }, '2026-09'), missing('SALARY_PAYROLL_PERIOD_EVIDENCE_REQUIRED'))
  const h = history(); h.version.contractVersion = null; h.version.cycleStartDay = null
  assert.throws(() => select(h, '2026-09'), missing('SALARY_PAYROLL_PERIOD_EVIDENCE_REQUIRED'))
})
test('الشهور تقبل حدود السنة وترفض الصيغ الوهمية والناقصة', () => {
  for (const value of ['0001-01', '9999-12', '2026-09']) assert.equal(period(value), value)
  for (const value of ['0000-01', '10000-01', '2026-13', '2026-00', '2026-9', '2026-09-01', null, 202609]) assert.throws(() => period(value), invalid)
})
test('قص فبراير والسنة الكبيسة وانتقال السنة يحفظ تعريف الدورة', () => {
  assert.deepEqual(bounds('2026-01', 23), { startDate: '2025-12-23', endDate: '2026-01-22' })
  // الخطوة 14: بداية مارس = نهاية فبراير + يوم؛ لا يوم مشترك بين الشهرين.
  assert.deepEqual(bounds('2026-02', 31), { startDate: '2026-01-31', endDate: '2026-02-28' })
  assert.deepEqual(bounds('2026-03', 31), { startDate: '2026-03-01', endDate: '2026-03-30' })
  assert.deepEqual(bounds('2028-03', 31), { startDate: '2028-03-01', endDate: '2028-03-30' })
  // فبراير 2028 كبيس (29 يومًا) ودورة 29 تنتهي في 28 فبراير، فيبدأ مارس في 29 فبراير.
  assert.deepEqual(bounds('2028-03', 29), { startDate: '2028-02-29', endDate: '2028-03-28' })
  assert.deepEqual(bounds('0001-01', 1), { startDate: '0001-01-01', endDate: '0001-01-31' })
  assert.throws(() => bounds('0001-01', 23), invalid)
  for (const cycle of [null, 0, 32, 1.5, '23']) assert.throws(() => bounds('2026-09', cycle), invalid)
})
test('التداخل يحسب بالشهر والتجاور مقبول، وتواريخ فبراير ومارس المشتقة متجاورة بلا يوم مشترك', () => {
  const periods = [row({ effectivePayrollPeriod: '2026-02', effectiveToPayrollPeriod: '2026-02' }), row({ effectivePayrollPeriod: '2026-03' })]
  const rows = normalize(periods, 31)
  // الخطوة 14: كان الاختبار يؤكد أن نهاية فبراير = بداية مارس (يوم مشترك)؛ الصحيح أن البداية = النهاية + يوم.
  assert.equal(rows[0].effectiveTo, '2026-02-28')
  assert.equal(rows[1].effectiveFrom, '2026-03-01')
  assert.equal(select(history(periods, 31), '2026-03').segment.effectivePayrollPeriod, '2026-03')
  for (const periods of [[row(), row({ effectivePayrollPeriod: '2026-10' })], [row(), row()],
    [row({ effectiveToPayrollPeriod: '2026-10' }), row({ effectivePayrollPeriod: '2026-10' })]]) assert.throws(() => normalize(periods, 23), invalid)
})
test('المبالغ الستة دقيقة وتقبل الصفر ولا تقبل الأرقام أو التقريب', () => {
  const result = normalize([row({ basicSalary: '9999999999999999.99', phoneAllowance: '9007199254740991.23', housingAllowance: '000.1', otherAllowance: '0' })], 23)[0]
  assert.equal(result.basicSalary, '9999999999999999.99'); assert.equal(result.phoneAllowance, '9007199254740991.23')
  assert.equal(result.housingAllowance, '0.10'); assert.equal(result.otherAllowance, '0.00')
  for (const value of [null, 10, '-1', '1e2', '1.001', '10000000000000000.00', '', ' ']) assert.throws(() => normalize([row({ basicSalary: value })], 23), invalid)
})
test('المدخل لا يقبل تواريخ العميل أو دورته أو نقص أحد المكونات', () => {
  for (const extra of [{ effectiveFrom: '2026-09-01' }, { cycleStartDay: 1 }, { currency: 'USD' }]) assert.throws(() => normalize([row(extra)], 23), invalid)
  for (const key of [...Object.keys(money), 'effectiveToPayrollPeriod', 'currency']) { const candidate = row(); delete candidate[key]; assert.throws(() => normalize([candidate], 23), invalid) }
  for (const input of [[], null, Array.from({ length: 121 }, () => row())]) assert.throws(() => normalize(input, 23), invalid)
})
test('التطبيع يرتب الشهور دون تغيير بيانات المدخل الأصلية', () => {
  const periods = [row({ effectivePayrollPeriod: '2026-11' }), row({ effectiveToPayrollPeriod: '2026-09' })], before = JSON.stringify(periods)
  const rows = normalize(periods, 23)
  assert.equal(rows[0].effectivePayrollPeriod, '2026-09'); assert.equal(JSON.stringify(periods), before)
})
test('قارئSQL يتحقق من الشهر والدورة والحدود المشتقة والبصمة معًا', async () => {
  const h = history(), result = await read(em(h), 3)
  assert.equal(result.version.contractVersion, version); assert.equal(result.version.cycleStartDay, 23)
  assert.equal(select(result, '2026-09').segment.basicSalary, '10000.00')
  for (const mutate of [x => { x.header.cycleStartDay = 1 }, x => { x.header.contractVersion = 'unknown' },
    x => { x.segments[0].effectivePayrollPeriod = '2026-10' }, x => { x.segments[0].effectiveFrom = '2026-09-01' },
    x => { x.segments[0].basicSalary = '9000.00' }, x => { x.segments[0].effectiveToPayrollPeriod = undefined },
    x => { x.header.createdBy = 5 }, x => { x.header.createdAt = new Date('2026-09-14T12:00:01Z') }, x => { x.header.createdAtUtc = '2026-09-14T12:00:00.0000001' }]) {
    const bad = history(); mutate(bad)
    await assert.rejects(read(em(bad), 3), error => error.getStatus() === 409 && error.getResponse().code === 'SALARY_HISTORY_INVALID')
  }
})
test('بصمةV1 القديمة لا تتغير بإضافة أعمدة شهريةnull', async () => {
  const segment = { ...money, currency: 'EGP', effectiveFrom: '2026-09-01', effectiveTo: null }
  const input = { employeeId: 3, revision: 1, reason: 'دليل قديم', evidenceReference: 'old:document', currentSourceHash: 'a'.repeat(64), segments: [segment] }
  const first = legacyHash(input), withNull = legacyHash({ ...input, segments: [{ ...segment, effectivePayrollPeriod: null, effectiveToPayrollPeriod: null }] })
  assert.equal(withNull, first)
  assert.equal(legacyHash({ ...input, contractVersion: null, cycleStartDay: null }), first)
  const h = history(); h.header = { ...h.header, ...input, contractVersion: null, cycleStartDay: null, contentHash: first }; delete h.header.segments
  h.segments = [{ ...segment, effectivePayrollPeriod: null, effectiveToPayrollPeriod: null }]
  const readBack = await read(em(h), 3)
  // صف قديم من غير بدل ضغط العمل (ترحيل 071) بيتقري بصفره والبصمة القديمة زي ما هي بالحرف (البدل الصفري برّه البصمة)
  assert.equal(readBack.version.contentHash, first); assert.deepEqual(readBack.segments, [{ ...segment, workPressureAllowance: '0.00' }])
})
test('إلحاق سجل يومي فوق دليل شهري مرفوض قبل أيINSERT', async () => {
  const h = history()
  await assert.rejects(appendLegacy(em(h), { employeeId: 3, createdBy: 4, reason: 'تصحيح', evidenceReference: 'document:1', currentSourceHash: 'a'.repeat(64),
    segments: [{ ...money, currency: 'EGP', effectiveFrom: '2026-09-01', effectiveTo: null }] }), error => error.getStatus() === 409 && error.getResponse().code === 'SALARY_HISTORY_MONTHLY_REQUIRED')
})
test('اختيار صف مشوه أو مراجعة مختلفة يرفض بدل اختيار راتب', () => {
  for (const mutate of [h => { h.version.contractVersion = 'unknown' }, h => { h.version.revision++ }, h => { h.version.contentHash = 'bad' },
    h => { h.segments[0].effectiveFrom = '2026-09-01' }, h => { h.segments[0].basicSalary = '10000' }]) {
    const h = history(); mutate(h); assert.throws(() => select(h, '2026-09'), invalid)
  }
  for (const h of [null, { ...history(), segments: null }, { ...history(), revision: -1 }]) assert.throws(() => select(h, '2026-09'), invalid)
})
