// B4 — الخطوات 19 و20 و21 على مسير حقيقي: لقطة السياسة (إعادة الحساب تقرأ منها والتحديث صريح بالفروق)،
// ومحرك السياسة خلف engine_mode (SHADOW افتراضيًا بتقرير تكافؤ لكل موظف، وPOLICY فقط بفروق صفر أو مفسرة)،
// والشرائح المؤرخة (61 دقيقة × 1.5 في القسيمة، ورفض التداخل). HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_policy_engine_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-policy-engine-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const { readCalendarSource, confirmCalendarSource } = require('../src/attendance/attendance-calendar-history')
let app, ds, master, base, created = false, sequence = 0, admin, branch, shift

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body).slice(0, 4000)); return response.body }
const number = value => Number(value)
async function request(method, route, body, user = admin) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function confirm(scope, sourceId, effectiveFrom = '2026-01-01') {
  await ds.transaction(async em => {
    const read = await readCalendarSource(em, scope, sourceId)
    await confirmCalendarSource(em, claims(admin), scope, sourceId, { expectedRevision: read.revision, expectedCurrentSourceHash: read.currentSourceHash,
      effectiveFrom, reason: 'تأكيد تقويم اختبار لقطة السياسة ومحرك الحساب' })
  })
}
// موظف يلتحق في آخر يوم من فترة أغسطس (22) بوردية نهارية مؤرخة؛ يوم واحد مغطى يعزل كل حالة دون اختلاق شهر حضور.
async function employee(salary = {}) {
  const n = ++sequence
  const saved = expect(await request('POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), employeeCode: `PSE${n}`, fullName: `موظف لقطة السياسة ${n}`, branchId: branch.id, joinDate: '2026-08-22',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, ...salary,
    status: 'active', isActive: true, payMethod: 'cash', attendanceEffectiveFrom: '2026-07-01', attendanceChangeReason: 'إسناد دوام موظف اختبار لقطة السياسة' }), 201)
  await confirm('EMPLOYEE', saved.id, '2026-07-01')
  expect(await request('POST', '/attendance/schedule/day', { employeeId: saved.id, date: '2026-08-22', shiftId: shift.id }), 201)
  // راتب شهر المسير من سجل الأجر الشهري (الخطوة 13): نفس مكونات الملف من راتب أغسطس
  const amounts = { basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, ...salary }
  const history = expect(await request('GET', `/payroll/employees/${saved.id}/salary-history`), 200)
  expect(await request('POST', `/payroll/employees/${saved.id}/salary-history/monthly`, { expectedRevision: history.revision,
    expectedCurrentSourceHash: history.currentSourceHash, reason: 'راتب شهري موثق لاختبار لقطة السياسة', evidenceReference: `fixture:policy-engine:${saved.id}`,
    periods: [{ ...Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, Number(value).toFixed(2)])), currency: 'SAR',
      effectivePayrollPeriod: '2026-08', effectiveToPayrollPeriod: null }] }), 201)
  return repo('Employee').findOneByOrFail({ id: saved.id })
}
async function punch(emp, stamps) {
  expect(await request('POST', '/attendance/punches/manual', { punches: stamps.map(stamp => ({ employeeCode: emp.fingerprintCode, timestamp: new Date(stamp).toISOString() })),
    reason: 'بصمات اختبار لقطة السياسة' }), 201)
}
const itemOf = (run, emp) => {
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, `item for ${emp.employeeCode}: ${JSON.stringify((run.members ?? []).map(member => [member.employeeId, member.membershipStatus, member.exclusionReason, member.snapshot?.salaryIssue]))}`)
  return item
}
const detailsOf = item => JSON.parse(item.breakdown)
async function acknowledge(runId) {
  const report = expect(await request('GET', `/payroll/runs/${runId}/unassigned`), 200)
  expect(await request('POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}
async function tierSet(effectivePeriod, tiers, reason = 'لائحة جزاءات اختبار') {
  return expect(await request('POST', '/payroll/rules/lateness-tier-sets', { effectivePeriod, tiers, reason }), 201)
}
// أ1 (16 سبتمبر): شرائح التأخير تعيش داخل معادلة الرواتب وحدها، فكل مسير هنا يُنشأ بمعادلة منشورة تحمل مجموعتها.
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
async function publishedPolicy(name, latenessTierSetId = null) {
  const created = expect(await request('POST', '/payroll/policies', { name, effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  const [version] = created.versions
  const published = expect(await request('POST', `/payroll/policies/${created.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: `نشر ${name} لاختبار لقطة السياسة` }), 200)
  if (latenessTierSetId !== null) {
    expect(await request('PATCH', `/payroll/policies/${created.policy.id}`,
      { expectedRevision: created.policy.revision ?? 1, reason: 'ربط شرائح التأخير بالمعادلة', latenessTierSetId }), 200)
  }
  return { policyId: created.policy.id, versionId: published.version.id }
}
async function runWith(policy, name, employeeIds) {
  const draft = expect(await request('POST', '/payroll/runs', { name, policyVersionId: policy.versionId, period: '2026-08', filters: { employeeIds } }), 201)
  return expect(await request('POST', `/payroll/runs/${draft.id}/calculate`, {}), 201)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_policy_engine_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  admin = await repo('User').save({ email: 'admin@policy-engine.invalid', displayName: 'Policy engine fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  // الخطوة 22 (B5): المستخدم نفسه يحتسب ويعتمد في هذه المجموعة — رخصة الشركة الصغيرة الموثقة (فصل المهام مختبر في payroll-run-screen)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI' },
    { key: 'attendance.grace_minutes', value: '0' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'attendance.flex.count_early_work_toward_required', value: 'false' },
    { key: 'attendance.flex.prorate_window_on_partial_leave', value: 'false' },
    { key: 'attendance.flex.shortfall_grace_minutes', value: '0' },
    { key: 'attendance.flex.unpaid_break_minutes', value: '0' },
    { key: 'attendance.flex.max_session_minutes', value: '900' },
    { key: 'attendance.flex.window_supersedes_grace', value: 'true' },
    { key: 'attendance.flex.missing_checkout_policy', value: 'MANUAL_ONLY' },
    { key: 'payroll.shortfall_enabled', value: 'true' }, { key: 'payroll.shortfall_mode', value: 'MINUTES' },
    { key: 'payroll.shortfall_value', value: '1' }, { key: 'payroll.attendance_overlap_policy', value: 'NET_OF_LATENESS' },
    { key: 'payroll.attendance_daily_cap_days', value: '1' },
  ])
  branch = await repo('Branch').save({ code: 'PSNAP', name: 'فرع اختبار لقطة السياسة', country: 'EG', weekendDays: 'FRI' })
  await confirm('GLOBAL', 0); await confirm('BRANCH', branch.id)
  shift = expect(await request('POST', '/catalogs/shifts', { name: 'نهارية 09:00-17:00', startTime: '09:00', endTime: '17:00', shiftMode: 'fixed',
    graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 480,
    effectiveFrom: '2026-07-01', changeReason: 'وردية نهارية مؤرخة لاختبار لقطة السياسة' }), 201)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_policy_engine_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-policy-engine-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار لقطة السياسة')
})

test('step 21: overlapping tiers are refused on save (nothing written), the legacy table is read-only, and a dated set is validated and hashed', async () => {
  const before = await repo('PayrollLatenessTierSet').count()
  const overlap = expect(await request('POST', '/payroll/rules/lateness-tier-sets', { effectivePeriod: '2026-08', reason: 'تداخل مقصود',
    tiers: [{ fromMinutes: 1, toMinutes: 61, mode: 'FRACTION', value: '0.25' }, { fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.5' }] }), 400)
  assert.equal(overlap.code, 'LATE-TIERS-OVERLAP'); assert.match(overlap.message, /الدقيقة 61/)
  assert.equal(await repo('PayrollLatenessTierSet').count(), before, 'a refused overlapping set writes nothing')
  assert.equal(expect(await request('POST', '/payroll/rules/lateness-tiers', { fromMinutes: 1, mode: 'FRACTION', value: '0.25' }), 410).code, 'LATE-TIERS-LEGACY-READONLY')
  const preview = expect(await request('POST', '/payroll/rules/lateness-tier-sets/preview', { effectivePeriod: '2026-08',
    tiers: [{ fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.5' }, { fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.25' }] }), 201)
  assert.deepEqual(preview.tiers.map(tier => [tier.sequence, tier.fromMinutes, tier.mode, tier.value]), [[1, 1, 'FRACTION', '0.250'], [2, 61, 'MULTIPLIER', '1.500']])
  assert.deepEqual(preview.gaps.map(gap => [gap.fromMinutes, gap.toMinutes]), [[121, null]])
})

// أ1 (إصلاح المراجعة): المجموعة ملك المعادلة التي تشير إليها — حفظ شرائح معادلة لا يوقف مجموعة معادلة أخرى،
// ومجموعة مطابقة مفعّلة تُعاد بعينها بدل نسخة زائدة، والمعادلة الجديدة تبدأ بالشرائح المعمول بها لا بلا شرائح.
test('step 21 (أ1): saving one set never deactivates another set, an identical active set is reused, and a new policy inherits the current set', async () => {
  const rows = [{ fromMinutes: 1, toMinutes: 30, mode: 'FRACTION', value: '0.5' }]
  const first = await tierSet('2026-10', rows, 'شرائح معادلة أ')
  const again = await tierSet('2026-10', rows, 'نفس المحتوى من معادلة ب')
  assert.equal(again.savedId, first.savedId, 'مجموعة مطابقة مفعّلة تُعاد بعينها بلا نسخة زائدة')
  assert.equal(again.sets.filter(row => row.effectivePeriod === '2026-10').length, 1)
  const other = await tierSet('2026-10', [{ fromMinutes: 1, toMinutes: null, mode: 'MINUTES', value: '0' }], 'شرائح معادلة ج لنفس الشهر')
  assert.notEqual(other.savedId, first.savedId)
  const setOf = (response, id) => response.sets.find(row => row.id === id)
  assert.equal(setOf(other, first.savedId).isActive, true, 'مجموعة المعادلة الأخرى لنفس الشهر تبقى مفعّلة')
  assert.equal(setOf(other, first.savedId).deactivationReason, null)
  assert.equal(setOf(other, other.savedId).supersedesSetId, null)
  const created = expect(await request('POST', '/payroll/policies', { name: 'معادلة ترث شرائح الشركة', effectiveFrom: '2026-07-23', settings: cycle23 }), 201)
  assert.equal(created.policy.latenessTierSetId, other.savedId, 'المعادلة الجديدة ترث أحدث مجموعة مفعّلة')
})

test('steps 19–21 on a real run: 61 minutes × 1.5 on the payslip, SHADOW parity per employee, snapshot keeps absence_penalty_days until an explicit refresh with the shown fingerprint', async () => {
  const saved = await tierSet('2026-08', [{ fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.25' }, { fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.5', label: 'ساعة ونصف' }])
  const set = saved.sets.find(row => row.id === saved.savedId)
  assert.equal(set.integrity, 'VERIFIED'); assert.match(set.contentHash, /^[a-f0-9]{64}$/)
  const late = await employee(), absent = await employee()
  // يوم واحد مغطى = 300 مستحق؛ إضافة دفتر 500 تترك متسعًا لخصم غياب 600 بعد التحديث دون أن تُسقطه حماية الصافي
  await repo('EmployeeObligation').save({ employeeId: absent.id, type: 'CREDIT', category: 'bonus', amount: 500, label: 'إضافة اختبار تفسح الصافي', status: 'PENDING' })
  await punch(late, ['2026-08-22T10:01:00', '2026-08-22T17:00:00'])
  expect(await request('POST', '/attendance/recompute?date=2026-08-22'), 201)
  assert.equal((await repo('AttendanceDay').findOneByOrFail({ employeeId: late.id, date: '2026-08-22' })).lateMinutes, 61)
  assert.equal((await repo('AttendanceDay').findOneByOrFail({ employeeId: absent.id, date: '2026-08-22' })).status, 'absent')

  const policy = await publishedPolicy('معادلات لقطة السياسة والشرائح', saved.savedId)
  const run = await runWith(policy, 'مسير B4 — لقطة ومحرك وشرائح', [late.id, absent.id])
  assert.equal(run.engineMode, 'SHADOW', 'a new run is SHADOW by default (D13)')
  assert.match(run.policySnapshotHash, /^[a-f0-9]{64}$/)
  assert.equal(run.policySnapshot, undefined, 'the raw snapshot text is not returned twice')
  // الخطوة 21: 61 × 1.5 × (9000 / 30 / 8 / 60 = 0.625) = 57.1875 → 57.18 (قص لخانتين)
  const lateItem = itemOf(run, late), lateDay = detailsOf(lateItem).attendanceDeductions.days.find(day => day.date === '2026-08-22')
  assert.equal(number(lateItem.latenessDeduction), 57.18)
  assert.deepEqual([lateDay.latenessTier.minutes, lateDay.latenessTier.mode, lateDay.latenessTier.value, lateDay.latenessTier.fromMinutes, lateDay.latenessTier.toMinutes, lateDay.latenessTier.label],
    [61, 'MULTIPLIER', '1.500', 61, 120, 'ساعة ونصف'])
  assert.equal(lateDay.latenessTier.formula, '61 دقيقة × 1.5 × سعر الدقيقة 0.625000')
  assert.equal(detailsOf(lateItem).attendanceDeductions.latenessTierSet.setId, saved.savedId)
  const payslip = expect(await request('GET', `/payroll/items/${lateItem.id}`), 200)
  const slipDay = JSON.parse(payslip.item.breakdown).attendanceDeductions.days.find(day => day.date === '2026-08-22')
  assert.deepEqual([slipDay.latenessTier.minutes, slipDay.latenessTier.value, slipDay.latenessAmount], [61, '1.500', 57.1875], 'the tier effect is on the payslip')
  assert.equal(payslip.run.parityReport, undefined)

  // الخطوة 20: تقرير تكافؤ لكل موظف مرفق بالمسير، على نفس المدخلات المجمدة، والمصروف القديم
  const report = run.engine.report
  assert.deepEqual([report.engineMode, report.paidResult, report.snapshotVersion, report.policySnapshotHash], ['SHADOW', 'LEGACY', run.snapshotVersion, run.policySnapshotHash])
  assert.deepEqual(report.rows.map(row => [row.employeeId, row.status]).sort((a, b) => a[0] - b[0]), [[late.id, 'MATCHED'], [absent.id, 'MATCHED']].sort((a, b) => a[0] - b[0]),
    JSON.stringify(report.rows.map(row => ({ id: row.employeeId, status: row.status, unavailable: row.unavailable, error: row.error, diff: row.components.filter(item => item.differenceKey) }))))
  const lateRow = report.rows.find(row => row.employeeId === late.id)
  assert.deepEqual(lateRow.components.find(item => item.code === 'LATENESS'), { code: 'LATENESS', label: 'خصم التأخير', legacy: '57.18', policy: '57.18', difference: null, differenceKey: null, reasonCode: null, reason: null })
  assert.equal(detailsOf(lateItem).policyEngine.paidResult, 'LEGACY')
  assert.deepEqual(run.engine.switchIssues, [], 'zero differences: switching to POLICY is allowed')

  // الخطوة 19: تغيير absence_penalty_days بعد الحساب لا يغير إعادة الحساب
  const absentBefore = number(itemOf(run, absent).absenceDeduction)
  assert.equal(absentBefore, 300)
  await repo('RequestsConfig').update({ key: 'attendance.absence_penalty_days' }, { value: '2' })
  const kept = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد تعديل معامل الغياب' }), 201)
  assert.equal(number(itemOf(kept, absent).absenceDeduction), 300, 'the recalculation reads the stored snapshot, not the live setting')
  assert.equal(kept.policySnapshotHash, run.policySnapshotHash)
  // أ1: مجموعة شرائح أحدث «لنفس الشهر» لم تعد تمس أي مسير — الشرائح تتبع المعادلة وحدها، لا شهر المسير
  await tierSet('2026-08', [{ fromMinutes: 1, toMinutes: null, mode: 'FRACTION', value: '1' }], 'مجموعة صارمة لا تتبعها أي معادلة')
  const keptTiers = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد مجموعة شرائح أحدث' }), 201)
  assert.equal(number(itemOf(keptTiers, late).latenessDeduction), 57.18)
  const view = expect(await request('GET', `/payroll/runs/${run.id}/policy-snapshot`), 200)
  assert.equal(view.storedHash, run.policySnapshotHash); assert.equal(view.refreshRequired, true); assert.equal(view.canRefresh, true)
  const penalty = view.differences.find(row => row.key === 'values.absencePenaltyDays')
  assert.ok(penalty, JSON.stringify(view.differences)); assert.match(penalty.stored, /^1/); assert.match(penalty.current, /^2/)
  assert.deepEqual(view.differences.map(row => row.key), ['values.absencePenaltyDays'],
    'الفرق الوحيد هو معامل الغياب: شرائح المعادلة لم تتغير رغم مجموعة الشهر الأحدث')
  // التحديث صريح وببصمة الإعدادات المعروضة؛ بدونها أو ببصمة قديمة يرفض ولا يكتب
  expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'تحديث بلا بصمة', refreshPolicySnapshot: true }), 409)
  const stale = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'تحديث ببصمة قديمة', refreshPolicySnapshot: true, expectedPolicySnapshotHash: run.policySnapshotHash }), 409)
  // الرفض لا يسلّم بصمة الإعدادات الحالية: مصدرها الوحيد GET policy-snapshot الذي يعرض الفروق
  assert.equal(stale.code, 'PAYRUN-POLICY-SNAPSHOT-STALE'); assert.equal(stale.currentHash, undefined)
  const refreshed = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'تحديث لقطة السياسة بعد مراجعة الفرق', refreshPolicySnapshot: true, expectedPolicySnapshotHash: view.currentHash }), 201)
  assert.equal(number(itemOf(refreshed, absent).absenceDeduction), 600, 'after an explicit refresh the new penalty applies')
  assert.equal(refreshed.policySnapshotHash, view.currentHash)
  const events = expect(await request('GET', `/payroll/runs/${run.id}/events`), 200)
  const last = events[events.length - 1]
  assert.equal(last.eventType, 'RECALCULATED'); assert.equal(last.payload.policySnapshot.mode, 'REFRESHED')
  assert.deepEqual(last.payload.policySnapshot.differences.map(row => row.key), ['values.absencePenaltyDays'])
  assert.equal(last.payload.policySnapshot.previousHash, run.policySnapshotHash)
  assert.equal(refreshed.engine.report.rows.find(row => row.employeeId === absent.id).status, 'MATCHED', 'the policy engine uses the same refreshed snapshot')

  // الخطوة 20: التحويل إلى POLICY (فروق صفر) يلزم إعادة الحساب قبل الاعتماد، ثم الاعتماد يرفق بصمة التقرير
  const switched = expect(await request('POST', `/payroll/runs/${run.id}/engine-mode`, { mode: 'POLICY', reason: 'تكافؤ صفري لكل الموظفين' }), 201)
  assert.equal(switched.mode, 'POLICY'); assert.equal(switched.recalcRequired, true)
  await acknowledge(run.id)
  assert.equal(expect(await request('POST', `/payroll/runs/${run.id}/approve`), 409).code, 'PAYRUN-ENGINE-RECALC-REQUIRED')
  const policyRun = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة الحساب بوضع POLICY' }), 201)
  assert.deepEqual([policyRun.engineMode, policyRun.engine.report.engineMode, policyRun.engine.report.paidResult], ['POLICY', 'POLICY', 'POLICY'])
  assert.equal(detailsOf(itemOf(policyRun, late)).policyEngine.paidResult, 'POLICY')
  assert.deepEqual([number(itemOf(policyRun, late).latenessDeduction), number(itemOf(policyRun, absent).absenceDeduction)], [57.18, 600])
  await acknowledge(run.id)
  const approved = expect(await request('POST', `/payroll/runs/${run.id}/approve`), 201)
  assert.equal(approved.status, 'APPROVED')
  const approval = expect(await request('GET', `/payroll/runs/${run.id}/events`), 200).find(row => row.eventType === 'APPROVED')
  assert.deepEqual([approval.payload.engineMode, approval.payload.parityReportHash, approval.payload.policySnapshotHash], ['POLICY', policyRun.engine.report.reportHash, policyRun.policySnapshotHash])
  await repo('RequestsConfig').update({ key: 'attendance.absence_penalty_days' }, { value: '1' })
})

test('step 20: a run with differences cannot switch to POLICY until every difference has a written reason; POLICY then pays the engine result', async () => {
  // مكونات متساوية 1000 × 3 ويوم مغطى واحد، والراتب على 30 يوم مع قص لخانتين: القديم يقص الإجمالي 3000 ÷ 30 = 100.00
  // وكل مكوّن 33.33 ثم يضع القرش الباقي على أكبر مكوّن (الأساسي 33.34)، والمحرك يقص كل مكوّن على حدة (33.33 × 3 = 99.99)
  // — فرق قرش مقصود يختبر منع التحويل إلى POLICY بلا سبب مكتوب.
  const odd = await employee({ basicSalary: 1000, housingAllowance: 1000, transportAllowance: 1000 })
  await punch(odd, ['2026-08-22T09:00:00', '2026-08-22T17:00:00'])
  expect(await request('POST', '/attendance/recompute?date=2026-08-22'), 201)
  const run = await runWith(await publishedPolicy('معادلات فروق التكافؤ'), 'مسير B4 — فروق التكافؤ', [odd.id])
  const row = run.engine.report.rows[0]
  assert.equal(row.status, 'DIFFERENT', JSON.stringify(row))
  const basic = row.components.find(item => item.code === 'BASIC'), net = row.components.find(item => item.code === 'NET')
  // الراتب على 30 يوم وقص لخانتين: الأساسي القديم 33.34 والمحرك 33.33، والصافي 100.00 مقابل 99.99
  assert.deepEqual([basic.legacy, basic.policy, basic.reasonCode], ['33.34', '33.33', 'SALARY_ROUNDING_DISTRIBUTION'])
  assert.deepEqual([net.legacy, net.policy, net.reasonCode], ['100.00', '99.99', 'FOLLOWS_UPSTREAM_DIFFERENCE'])
  assert.equal(number(itemOf(run, odd).netPay), 100, 'SHADOW pays the legacy result')

  const refused = expect(await request('POST', `/payroll/runs/${run.id}/engine-mode`, { mode: 'POLICY', reason: 'محاولة بلا أسباب' }), 409)
  assert.equal(refused.code, 'PAYRUN-ENGINE-PARITY-REQUIRED')
  assert.deepEqual(refused.issues.map(issue => [issue.component, issue.issue]), [['BASIC', 'UNEXPLAINED'], ['NET', 'UNEXPLAINED']])
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).engineMode, 'SHADOW')
  expect(await request('POST', `/payroll/runs/${run.id}/parity-explanations`, { explanations: [{ employeeId: odd.id, component: 'BASIC', reason: 'x' }] }), 400)
  expect(await request('POST', `/payroll/runs/${run.id}/parity-explanations`, { explanations: [{ employeeId: odd.id, component: 'OVERTIME', reason: 'لا يوجد فرق هنا' }] }), 400)
  const explained = expect(await request('POST', `/payroll/runs/${run.id}/parity-explanations`, { explanations: [{ employeeId: odd.id, component: 'BASIC', reason: 'قرش توزيع التناسب؛ قاعدة المحرك مقبولة' }] }), 201)
  assert.deepEqual(explained.switchIssues.map(issue => issue.component), ['NET'])
  const switched = expect(await request('POST', `/payroll/runs/${run.id}/engine-mode`, { mode: 'POLICY', reason: 'كل فرق له سبب مكتوب',
    explanations: [{ employeeId: odd.id, component: 'NET', reason: 'الصافي يتبع قرش الأساسي' }] }), 201)
  assert.deepEqual([switched.mode, switched.switchIssues.length, switched.explanations.length], ['POLICY', 0, 2])
  const policyRun = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة الحساب بوضع POLICY بعد تفسير الفروق' }), 201)
  const item = itemOf(policyRun, odd)
  // المحرك: كل مكوّن 1000 ÷ 30 = 33.333 ← 33.33 بالقص، البدلات 66.66، والصافي 99.99
  assert.deepEqual([number(item.basicSalary), number(item.allowances), number(item.netPay)], [33.33, 66.66, 99.99], 'POLICY pays the engine result')
  assert.equal(detailsOf(item).policyEngine.paidResult, 'POLICY')
  assert.deepEqual(detailsOf(item).salaryComponents.map(component => component.earnedAmount).slice(0, 3), [33.33, 33.33, 33.33])
  const events = expect(await request('GET', `/payroll/runs/${run.id}/events`), 200).map(row => row.eventType)
  assert.ok(events.includes('PARITY_EXPLAINED') && events.includes('ENGINE_MODE_CHANGED'), JSON.stringify(events))
  // تغيّر الفرق (مبلغ مختلف) يحتاج سببًا جديدًا: POLICY يرفض الحساب بدل صرف فرق غير مفسر
  // إضافة دفتر 5.00 بعد التحويل: الصافي القديم 105.00 والمحرك 104.99 (الراتب على 30 يوم) — فرق بمبلغ جديد لم يُكتب له سبب
  await repo('EmployeeObligation').save({ employeeId: odd.id, type: 'CREDIT', category: 'bonus', amount: 5, label: 'مكافأة اختبار بعد التحويل', status: 'PENDING' })
  const blocked = expect(await request('POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إضافة دفتر بعد التحويل' }), 409)
  assert.equal(blocked.code, 'PAYRUN-POLICY-PARITY-UNEXPLAINED')
  // يبقى صافي المحرك المصروف قبل الإضافة: 99.99
  assert.equal(number((await repo('PayrollItem').findOneByOrFail({ runId: run.id, employeeId: odd.id })).netPay), 99.99, 'the refused recalculation writes nothing')
  expect(await request('POST', `/payroll/runs/${run.id}/engine-mode`, { mode: 'SHADOW', reason: 'العودة للظل حتى تُفسر الفروق الجديدة' }), 201)
  expect(await request('POST', `/payroll/runs/${run.id}/cancel`, { reason: 'تنظيف مسير اختبار الفروق' }), 201)
})

test('steps 19–20 at approval (payroll simplification): a tampered or missing snapshot is still refused before any write; for SHADOW and LEGACY runs the parity report and its written reasons are information only (POLICY still needs them), so approval attaches null parity fields', async () => {
  const proven = await employee(), legacySource = await employee()
  await punch(proven, ['2026-08-22T09:00:00', '2026-08-22T17:00:00'])
  // بصمتان قديمتان بلا مصدر ولا مُدخِل (مثل بصمات hr_system قبل حقل المصدر): الحساب القديم يقرؤهما، وظل الحضور يرفضهما دليلًا فتغيب قيمه
  await repo('AttendancePunch').save(['2026-08-22T09:00:00', '2026-08-22T17:00:00'].map(stamp => ({ employeeCode: legacySource.employeeCode, employeeId: legacySource.id,
    punchTime: new Date(stamp), deviceSn: null, source: null, createdByUserId: null, reason: null })))
  expect(await request('POST', '/attendance/recompute?date=2026-08-22'), 201)
  const created = await runWith(await publishedPolicy('معادلات شروط الاعتماد'), 'مسير B4 — شروط الاعتماد', [proven.id, legacySource.id])
  const report = created.engine.report
  const rowOf = emp => report.rows.find(row => row.employeeId === emp.id)
  assert.equal(rowOf(proven).status, 'MATCHED', JSON.stringify(rowOf(proven)))
  assert.equal(rowOf(legacySource).status, 'UNAVAILABLE', JSON.stringify(rowOf(legacySource)))
  assert.ok(rowOf(legacySource).sourceIssueCodes.includes('ATTENDANCE_PUNCH_EVIDENCE_INVALID'), JSON.stringify(rowOf(legacySource).sourceIssueCodes))
  const readiness = report.sourceReadiness.find(row => row.code === 'ATTENDANCE_PUNCH_EVIDENCE_INVALID')
  assert.deepEqual([readiness.employees, readiness.employeeIds], [1, [legacySource.id]]); assert.match(readiness.remedy, /البصمة اليدوية/)
  const unavailable = rowOf(legacySource).components.filter(item => item.differenceKey)
  assert.ok(unavailable.length > 0 && unavailable.every(item => item.policy === null), JSON.stringify(unavailable))
  assert.equal(created.engine.approvalIssueCount, unavailable.length)
  const runRow = () => repo('PayrollRun').findOneByOrFail({ id: created.id })
  const events = async () => expect(await request('GET', `/payroll/runs/${created.id}/events`), 200)
  const eventsBefore = (await events()).length

  // 1) قيم غائبة بلا سبب مكتوب: معلومة ظاهرة في تفاصيل المسير (عددها ومجموعتها) بلا أي كتابة؛ لا توقف اعتماد مسير SHADOW (الخطوة 5)
  const detail = expect(await request('GET', `/payroll/runs/${created.id}`), 200)
  assert.equal(detail.engine.approvalIssueCount, unavailable.length)
  assert.deepEqual(detail.engine.approvalPendingGroups.map(group => [group.reasonCode, group.count, group.employees]), [[unavailable[0].reasonCode, unavailable.length, 1]])
  assert.deepEqual([(await runRow()).status, (await events()).length], ['CALCULATED', eventsBefore])

  // 2) سبب فردي لقيمة غائبة يُسجل، ولا يرفع منع POLICY؛ الهدف المختلط أو الرمز غير الموجود 400
  const one = expect(await request('POST', `/payroll/runs/${created.id}/parity-explanations`, { explanations: [{ employeeId: legacySource.id, component: 'LATENESS',
    reason: 'بصمات قديمة بلا مصدر؛ المصروف هو الحساب القديم' }] }), 201)
  assert.equal(one.approvalIssueCount, unavailable.length - 1)
  const policyRefused = expect(await request('POST', `/payroll/runs/${created.id}/engine-mode`, { mode: 'POLICY', reason: 'محاولة مع قيم غائبة' }), 409)
  assert.equal(policyRefused.code, 'PAYRUN-ENGINE-PARITY-REQUIRED')
  assert.ok(policyRefused.issues.some(issue => issue.issue === 'UNAVAILABLE' && issue.component === 'LATENESS'), 'an explained unavailable value still blocks POLICY')
  const reasonCode = unavailable[0].reasonCode
  assert.equal(expect(await request('POST', `/payroll/runs/${created.id}/parity-explanations`, { explanations: [{ reasonCode, employeeId: legacySource.id, reason: 'هدف مختلط' }] }), 400).code, 'PAYRUN-PARITY-TARGET')
  assert.equal(expect(await request('POST', `/payroll/runs/${created.id}/parity-explanations`, { explanations: [{ reasonCode: 'NO_SUCH_REASON', reason: 'رمز غير موجود' }] }), 400).code, 'PAYRUN-PARITY-DIFFERENCE-NOT-FOUND')
  // 3) سبب واحد لرمز سبب النظام يغطي الباقي
  const grouped = expect(await request('POST', `/payroll/runs/${created.id}/parity-explanations`, { explanations: [{ reasonCode, reason: 'مصادر حضور الموظف غير مثبتة (بصمات بلا مصدر)؛ المصروف هو القديم' }] }), 201)
  assert.deepEqual([grouped.approvalIssueCount, grouped.explanations.length, grouped.approvalPendingGroups.length], [0, unavailable.length, 0])
  assert.equal(grouped.explanations.filter(row => row.policyAmount === null).length, unavailable.length)

  // 4) لقطة معدلة خارج الشاشة، أو غائبة: الاعتماد يُرفض؛ ورفض إعادة الحساب لا يسلّم بصمة الإعدادات الحالية
  const original = await runRow()
  const tampered = original.policySnapshot.replace('"absencePenaltyDays":1', '"absencePenaltyDays":5')
  assert.notEqual(tampered, original.policySnapshot)
  await repo('PayrollRun').update({ id: created.id }, { policySnapshot: tampered })
  assert.equal(expect(await request('POST', `/payroll/runs/${created.id}/approve`), 409).code, 'PAYRUN-POLICY-SNAPSHOT-INVALID')
  await repo('PayrollRun').update({ id: created.id }, { policySnapshot: null, policySnapshotHash: null })
  assert.equal(expect(await request('POST', `/payroll/runs/${created.id}/approve`), 409).code, 'PAYRUN-POLICY-SNAPSHOT-MISSING')
  const missing = expect(await request('POST', `/payroll/runs/${created.id}/recalculate`, { reason: 'إعادة حساب بلا لقطة' }), 409)
  assert.deepEqual([missing.code, missing.currentHash], ['PAYRUN-POLICY-SNAPSHOT-MISSING', undefined], 'the refusal never hands out the current fingerprint')
  assert.ok(Array.isArray(missing.differences) && missing.differences.length > 0)
  await repo('PayrollRun').update({ id: created.id }, { policySnapshot: original.policySnapshot, policySnapshotHash: original.policySnapshotHash })
  const stale = expect(await request('POST', `/payroll/runs/${created.id}/recalculate`, { reason: 'تحديث بلا بصمة', refreshPolicySnapshot: true }), 409)
  assert.deepEqual([stale.code, stale.currentHash], ['PAYRUN-POLICY-SNAPSHOT-STALE', undefined])

  // 5) تقرير التكافؤ المحفوظ لا يُقرأ عند اعتماد مسير SHADOW (المصروف هو الحساب القائم): حتى المعدل منه لا يوقف الاعتماد، وبلا إقرار «بلا مسير».
  // الاعتماد يرفق بصمة اللقطة ووضع المحرك، وحقول التكافؤ والإقرار null.
  const storedReport = JSON.parse(original.parityReport)
  await repo('PayrollRun').update({ id: created.id }, { parityReport: JSON.stringify({ ...storedReport, rows: storedReport.rows.map(row => ({ ...row, status: 'MATCHED' })) }) })
  assert.equal((await runRow()).status, 'CALCULATED')
  assert.equal(expect(await request('POST', `/payroll/runs/${created.id}/approve`), 201).status, 'APPROVED')
  const approval = (await events()).find(row => row.eventType === 'APPROVED')
  assert.deepEqual([approval.payload.engineMode, approval.payload.policySnapshotHash], ['SHADOW', created.policySnapshotHash])
  assert.deepEqual([approval.payload.parityReportHash, approval.payload.parityTotals, approval.payload.parityExplanationIds, approval.payload.parityExplained,
    approval.payload.unassignedAckId, approval.payload.unassignedReportHash], [null, null, null, null, null, null])

  // 6) مصدر قيمة تغيّر بلا تغير القيمة (افتراضي ← إعداد مكتوب بنفس القيمة): «التحديث مطلوب» مع فرق مسمى؛ ثم LEGACY بلا ظل يُعتمد بلا تقرير تكافؤ
  const other = await employee()
  await punch(other, ['2026-08-22T09:00:00', '2026-08-22T17:00:00'])
  expect(await request('POST', '/attendance/recompute?date=2026-08-22'), 201)
  const legacyRun = await runWith(await publishedPolicy('معادلات LEGACY بلا ظل'), 'مسير B4 — LEGACY بلا ظل', [other.id])
  // الإعداد مكتوب من بذر الإعدادات بقيمة تساوي القيمة الافتراضية في الكود؛ حذفه (في قاعدة الاختبار) يغيّر المصدر وحده: إعداد ← قيمة افتراضية
  const seeded = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.exempt_overtime_eligible' })
  assert.equal(seeded.value, 'false')
  await repo('RequestsConfig').delete({ key: 'payroll.exempt_overtime_eligible' })
  const view = expect(await request('GET', `/payroll/runs/${legacyRun.id}/policy-snapshot`), 200)
  assert.equal(view.refreshRequired, true)
  assert.deepEqual(view.differences.map(row => row.key), ['sources.exemptOvertimeEligible'], JSON.stringify(view.differences))
  expect(await request('POST', `/payroll/runs/${legacyRun.id}/engine-mode`, { mode: 'LEGACY', reason: 'تشخيص بلا ظل' }), 201)
  const legacyCalc = expect(await request('POST', `/payroll/runs/${legacyRun.id}/recalculate`, { reason: 'إعادة حساب LEGACY بعد عرض الفرق', refreshPolicySnapshot: true,
    expectedPolicySnapshotHash: view.currentHash }), 201)
  assert.equal(legacyCalc.engine.report.engineMode, 'LEGACY')
  assert.equal(expect(await request('POST', `/payroll/runs/${legacyRun.id}/approve`), 201).status, 'APPROVED')
  const legacyApproval = expect(await request('GET', `/payroll/runs/${legacyRun.id}/events`), 200).find(row => row.eventType === 'APPROVED')
  assert.deepEqual([legacyApproval.payload.engineMode, legacyApproval.payload.parityReportHash], ['LEGACY', null])
})
