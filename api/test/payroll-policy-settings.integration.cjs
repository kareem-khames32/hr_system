// اختبارات إعدادات نسخ السياسات بقاعدة SQL عشوائية معزولة؛ لا تستدعي حساب الرواتب أو الصرف.
const { test, before, after, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_policy_settings_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-policy-settings-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
const settingFields = ['defaultPeriodType', 'cycleStartDay', 'cycleEndMode', 'cycleEndDay', 'baseDaysBasis',
  'monthlyDays', 'dailyHours', 'rateBase', 'roundingMode', 'roundingScale', 'divisionByZeroMode',
  'maxDeductionPctOfGross', 'minNetGuarantee', 'netFloorPct', 'carryOverExcess', 'skipAttendance', 'lateDeductionEnabled', 'currency']
const seededPolicyConfig = {
  default_period_type: 'CUSTOM_DAY_RANGE', cycle_end_mode: 'DERIVED', cycle_end_day: 'null', base_days_basis: 'FIXED_30',
  rate_base: 'GROSS', rounding_mode: 'HALF_UP', rounding_scale: '2', division_by_zero_mode: 'ZERO_WITH_WARNING',
  max_deduction_pct_of_gross: 'null', min_net_guarantee: 'null', net_floor_pct: 'null', carry_over_excess: 'false', skip_attendance: 'false',
}
let app, ds, master, base, created = false, sequence = 0, canary
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter

function assertDisposable() {
  assert.match(database, /^hr_payroll_policy_settings_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function plain(value) { return JSON.parse(JSON.stringify(value)) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
function definition(overrides = {}) {
  return { code: `PL01_${++sequence}`, name: `سياسة اختبار ${sequence}`, effectiveFrom: '2026-07-01',
    metadata: { title: 'مسودة الموارد البشرية', notes: 'بيانات وصفية بلا محرك مالي' }, ...overrides }
}
async function create(overrides = {}, user = admin) {
  return expectStatus(await request(user, 'POST', endpoint, definition(overrides)), 201)
}
async function detail(id, user = admin) { return expectStatus(await request(user, 'GET', `${endpoint}/${id}`), 200) }
async function events(id, user = admin) {
  const result = expectStatus(await request(user, 'GET', `${endpoint}/${id}/events`), 200)
  assert.ok(Array.isArray(result), JSON.stringify(result))
  return result
}
async function policySnapshot() {
  const result = {}
  for (const name of ['PayrollPolicy', 'PayrollPolicyVersion', 'PayrollPolicyEvent']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  return result
}
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  return result
}
function settingsOf(version) {
  const result = {}
  for (const field of settingFields) {
    assert.ok(Object.hasOwn(version, field), `Missing persisted setting ${field}`)
    result[field] = version[field]
  }
  return result
}
function assertSettingsView(version, status) {
  assert.equal(version.settingsStatus, status)
  assert.deepEqual(version.settings, settingsOf(version))
  assert.ok(Array.isArray(version.settingsIssues))
  if (status === 'COMPLETE') assert.equal(version.settingsIssues.length, 0)
}
function completeSettings(overrides = {}) {
  return { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'FIXED_DAY', cycleEndDay: 22,
    baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 7.25, rateBase: 'BASIC', roundingMode: 'CEIL', roundingScale: 4,
    divisionByZeroMode: 'FAIL_ROW', maxDeductionPctOfGross: 37.1234, minNetGuarantee: 1234.56, netFloorPct: 12.3456,
    carryOverExcess: true, skipAttendance: true, lateDeductionEnabled: false, currency: 'EGP', ...overrides }
}
async function legacyVersion(overrides = {}) {
  const created = await create()
  const versionId = created.versions[0].id
  await repo('PayrollPolicyVersion').update(versionId, { ...Object.fromEntries(settingFields.map(field => [field, null])), ...overrides })
  return { policyId: created.policy.id, versionId }
}
async function fullRead(policyId, versionId) {
  return expectStatus(await request(admin, 'GET', `${endpoint}/${policyId}/versions/${versionId}`), 200).version
}
async function patchVersion(policyId, versionId, body, actor = admin) {
  return request(actor, 'PATCH', `${endpoint}/${policyId}/versions/${versionId}`, { expectedRevision: 1, reason: 'تعديل إعدادات اختبار النسخة', ...body })
}
async function configSnapshot() { return plain(await repo('RequestsConfig').find({ order: { key: 'ASC' } })) }
async function patchConfig(key, value) { return request(admin, 'PATCH', '/settings/config', { key, value }) }
async function withConfigRestored(action) {
  const before = await configSnapshot()
  try { return await action() } finally { await repo('RequestsConfig').save(before) }
}
async function concurrentBehindPolicyLock(resource, actions) {
  // نثبت وصول الطلبين إلى انتظار SQL فعلي قبل تحرير القفل، فلا يعتمد الاختبار على سرعة HTTP.
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const result = await runner.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${resource}`])
    assert.ok(Number(result[0].lockResult) >= 0)
    pending = actions.map(action => action())
    const deadline = Date.now() + 6000
    let waiting = []
    while (Date.now() < deadline) {
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL
          SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiting = result.recordset
      if (waiting.length >= actions.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiting.length >= actions.length, `Expected ${actions.length} SQL waiters, observed ${JSON.stringify(waiting)}`)
    process.stdout.write(`# Policy SQL barrier ${actions.length} operations: ${JSON.stringify(waiting)}\n`)
    await runner.commitTransaction(); committed = true
    return await Promise.all(pending)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  // قبل bootstrap الفعلي: قيمة قائمة يجب ألا يكتب محمل الافتراضيات فوقها.
  await repo('RequestsConfig').save({ key: 'payroll.policy.rounding_mode', value: 'HALF_EVEN' })
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'POLICY_A', name: 'فرع السياسات الأول' })
  branchB = await repo('Branch').save({ code: 'POLICY_B', name: 'فرع السياسات الثاني' })
  departmentA = await repo('Department').save({ branchId: branchA.id, name: 'قسم الفرع الأول', code: 'POLICY_DA' })
  departmentB = await repo('Department').save({ branchId: branchB.id, name: 'قسم الفرع الثاني', code: 'POLICY_DB' })
  teamA = await repo('Team').save({ departmentId: departmentA.id, name: 'فريق الفرع الأول', code: 'POLICY_TA' })
  teamB = await repo('Team').save({ departmentId: departmentB.id, name: 'فريق الفرع الثاني', code: 'POLICY_TB' })
  costCenter = await repo('CostCenter').save({ code: 'POLICY_CC', name: 'مركز تكلفة عام', isActive: true })
  inactiveCostCenter = await repo('CostCenter').save({ code: 'POLICY_CC_OFF', name: 'مركز تكلفة متوقف', isActive: false })
  const user = (label, role, branchId = null, permissions = []) => repo('User').save({ email: `${label}@policy-test.invalid`,
    displayName: label, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin')
  const permissions = ['payroll.view', 'payroll.calculate', 'payroll.policy.manage']
  managerA = await user('manager-a', 'hr_manager', branchA.id, permissions)
  managerB = await user('manager-b', 'hr_manager', branchB.id, permissions)
  starA = await user('star-a', 'hr_manager', branchA.id, ['*'])
  unassigned = await user('unassigned', 'hr_manager', null, ['*'])
  viewerA = await user('viewer-a', 'hr_manager', branchA.id, ['payroll.view'])
  noPermission = await user('no-permission', 'hr_manager', branchA.id, [])
  const employee = (code, branchId, departmentId, teamId) => repo('Employee').save({ employeeCode: code, fullName: code,
    branchId, departmentId, teamId, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash' })
  employeeA = await employee('PLSET_CANARY_A', branchA.id, departmentA.id, teamA.id)
  employeeB = await employee('PLSET_CANARY_B', branchB.id, departmentB.id, teamB.id)
  const run = await repo('PayrollRun').save({ name: 'مسير مصروف يجب ألا يتغير', branchId: branchA.id,
    scopeType: 'BRANCH', scopeIds: JSON.stringify([branchA.id]), employeeIds: JSON.stringify([employeeA.id]),
    policyId: null, period: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'PAID',
    totalNet: 9084.38, approvedBy: admin.id, approvedAt: new Date('2026-08-01T08:00:00Z'),
    paidAt: new Date('2026-08-01T09:00:00Z'), snapshotVersion: 0 })
  const overtime = await repo('OvertimeEntry').save({ employeeId: employeeA.id, date: '2026-07-08',
    source: 'PRE_REQUESTED', status: 'PAID', hoursRequested: 1.5, hoursActual: 1.5, payableHours: 1.5,
    rate: 1.5, payrollRunId: run.id })
  await repo('PayrollItem').save({ runId: run.id, employeeId: employeeA.id, basicSalary: 9000, allowances: 0,
    overtimeHours: 1.5, overtimeAmount: 84.38, netPay: 9084.38, payMethod: 'cash',
    breakdown: JSON.stringify({ canary: 'يجب حفظ هذا النص كما هو', overtimeEntryIds: [overtime.id], monthlyDays: 30 }) })
  canary = await financialSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await financialSnapshot(), canary, 'Policy operation mutated financial source rows') })
after(async t => {
  const errors = []
  try { if (canary) assert.deepEqual(await financialSnapshot(), canary) } catch (error) { errors.push(error) }
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-policy-settings-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('PL-01 settings: bootstrap inserts thirteen new defaults while preserving a value present before startup', async () => {
  const rows = expectStatus(await request(admin, 'GET', '/settings/config'), 200)
  for (const [suffix, expected] of Object.entries(seededPolicyConfig)) {
    const matching = rows.filter(row => row.key === `payroll.policy.${suffix}`)
    assert.equal(matching.length, 1, suffix)
    assert.equal(matching[0].value, suffix === 'rounding_mode' ? 'HALF_EVEN' : expected, suffix)
  }
  assert.equal(rows.find(row => row.key === 'payroll.monthly_days').value, '30')
})

test('PL-01 settings: config PATCH accepts every new enum, precise numeric limit, nullable sentinel and boolean', async () => {
  await withConfigRestored(async () => {
    const valid = {
      default_period_type: ['CALENDAR_MONTH', 'CUSTOM_DAY_RANGE', 'SEMI_MONTHLY'], cycle_end_mode: ['DERIVED', 'FIXED_DAY'],
      cycle_end_day: ['1', '31', 'null'], base_days_basis: ['FIXED_30'], rate_base: ['GROSS', 'BASIC'],
      rounding_mode: ['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL'], rounding_scale: ['0', '6'],
      division_by_zero_mode: ['ZERO_WITH_WARNING', 'FAIL_ROW'], max_deduction_pct_of_gross: ['0', '100', '37.1234', 'null'],
      min_net_guarantee: ['0', '1234.56', 'null'], net_floor_pct: ['0', '100', '12.3456', 'null'],
      carry_over_excess: ['true', 'false'], skip_attendance: ['true', 'false'],
    }
    for (const [suffix, values] of Object.entries(valid)) {
      for (const value of values) {
        const key = `payroll.policy.${suffix}`
        const saved = expectStatus(await patchConfig(key, value), 200)
        assert.equal(saved.value, value, key)
        assert.equal((await repo('RequestsConfig').findOneByOrFail({ key })).value, value, key)
      }
    }
  })
})

test('PL-01 settings: config PATCH rejects invalid enums, fractions, precision loss, null misuse and nonliteral booleans atomically', async () => {
  const initial = await configSnapshot()
  const invalid = {
    default_period_type: ['monthly', 'custom_day_range', 'null'], cycle_end_mode: ['AUTO', 'null'],
    cycle_end_day: ['0', '32', '1.5', ''], base_days_basis: ['ACTUAL_PERIOD_DAYS', 'WORKING_DAYS', 'null'],
    rate_base: ['FORMULA', 'NET', 'null'], rounding_mode: ['DOWN', 'half_up', 'null'], rounding_scale: ['-1', '7', '2.5', 'null'],
    division_by_zero_mode: ['IGNORE', 'null'], max_deduction_pct_of_gross: ['-0.0001', '100.0001', '12.34567'],
    min_net_guarantee: ['-0.01', '123.456', '9007199254740991', '90071992547409.92'],
    net_floor_pct: ['-1', '101', '12.34567'], carry_over_excess: ['True', '1', '0', 'null'],
    skip_attendance: ['False', '1', 'yes', 'null'],
  }
  for (const suffix of ['cycle_end_day', 'rounding_scale', 'max_deduction_pct_of_gross', 'min_net_guarantee', 'net_floor_pct']) {
    invalid[suffix].push('NaN', 'Infinity', ' ')
  }
  for (const [suffix, values] of Object.entries(invalid)) {
    for (const value of values) expectStatus(await patchConfig(`payroll.policy.${suffix}`, value), 400)
  }
  expectStatus(await patchConfig('payroll.policy.unknown_setting', '1'), 404)
  expectStatus(await request(managerA, 'PATCH', '/settings/config', { key: 'payroll.policy.rounding_mode', value: 'FLOOR' }), 403)
  assert.deepEqual(await configSnapshot(), initial)
})

test('PL-01 settings: all eighteen defaults are captured once and future config changes cannot rewrite or reinterpret a version', async () => {
  await withConfigRestored(async () => {
    const initial = await create(), policyId = initial.policy.id, version = initial.versions[0]
    const expected = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null,
      baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 8, rateBase: 'GROSS', roundingMode: 'HALF_EVEN', roundingScale: 2,
      divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
      carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
    assert.equal(settingFields.length, 18)
    assert.deepEqual(settingsOf(version), expected)
    assertSettingsView(version, 'COMPLETE')
    assert.deepEqual(settingsOf(await fullRead(policyId, version.id)), expected)
    const partial = await create({ settings: { dailyHours: 7.75, roundingScale: 3 } })
    assert.deepEqual(settingsOf(partial.versions[0]), { ...expected, dailyHours: 7.75, roundingScale: 3 })
    for (const [key, value] of Object.entries({ 'payroll.policy.rounding_mode': 'FLOOR', 'payroll.policy.rounding_scale': '5',
      'payroll.policy.rate_base': 'BASIC', 'payroll.policy.max_deduction_pct_of_gross': '21.2345',
      'payroll.daily_hours': '9.5', 'payroll.cycle_start_day': '17', 'system.currency': 'EGP' })) {
      expectStatus(await patchConfig(key, value), 200)
    }
    const next = await create()
    assert.equal(next.versions[0].roundingMode, 'FLOOR')
    assert.equal(next.versions[0].roundingScale, 5)
    assert.equal(next.versions[0].dailyHours, 9.5)
    assert.equal(next.versions[0].cycleStartDay, 17)
    assert.equal(next.versions[0].maxDeductionPctOfGross, 21.2345)
    assert.equal(next.versions[0].currency, 'EGP')
    assert.deepEqual(settingsOf(await fullRead(policyId, version.id)), expected)
    const cloned = expectStatus(await request(admin, 'POST', `${endpoint}/${policyId}/versions`, {
      sourceVersionId: version.id, expectedRevision: 1, reason: 'نسخ مع تجاهل الإعدادات الحالية' }), 201)
    assert.deepEqual(settingsOf(cloned.version), expected)
    const patched = expectStatus(await patchVersion(policyId, version.id, { metadata: { title: 'عنوان لا يعيد الافتراضيات' } }), 200)
    assert.deepEqual(settingsOf(patched.version), expected)
  })
})

test('PL-01 settings: explicit full settings retain cycle, percentages, currency and all rounding precision through full reads and audit', async () => {
  const desired = completeSettings()
  const initial = await create({ settings: desired }), policyId = initial.policy.id, versionId = initial.versions[0].id
  assert.deepEqual(settingsOf(initial.versions[0]), desired)
  assertSettingsView(initial.versions[0], 'COMPLETE')
  assert.deepEqual(settingsOf(await fullRead(policyId, versionId)), desired)
  const fromDb = await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })
  assert.deepEqual(settingsOf(fromDb), desired)
  const creationEvent = (await events(policyId)).find(event => event.eventType === 'CREATED')
  assert.deepEqual(settingsOf(creationEvent.payload.version), desired)
  const changed = expectStatus(await patchVersion(policyId, versionId, { settings: { roundingMode: 'HALF_UP', roundingScale: 6,
    maxDeductionPctOfGross: 99.9999, netFloorPct: 0.0001, minNetGuarantee: 0.29 } }), 200)
  const expected = { ...desired, roundingMode: 'HALF_UP', roundingScale: 6, maxDeductionPctOfGross: 99.9999, netFloorPct: 0.0001, minNetGuarantee: 0.29 }
  assert.deepEqual(settingsOf(changed.version), expected)
  assert.deepEqual(settingsOf(await fullRead(policyId, versionId)), expected)
  const event = (await events(policyId)).find(row => row.eventType === 'VERSION_UPDATED')
  assert.deepEqual(settingsOf(event.payload.before), desired)
  assert.deepEqual(settingsOf(event.payload.after), expected)
})

test('PL-01 settings: partial patches merge against persisted settings and preserve all omitted fields including nullable floors', async () => {
  const original = completeSettings(), initial = await create({ settings: original }), policyId = initial.policy.id, versionId = initial.versions[0].id
  const changed = expectStatus(await patchVersion(policyId, versionId, { settings: { dailyHours: 8.5 } }), 200)
  assert.deepEqual(settingsOf(changed.version), { ...original, dailyHours: 8.5 })
  const clear = expectStatus(await patchVersion(policyId, versionId, { expectedRevision: 2, settings: {
    maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null } }), 200)
  assert.deepEqual(settingsOf(clear.version), { ...original, dailyHours: 8.5, maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null })
  assert.equal(clear.version.revision, 3)
  assert.equal((await detail(policyId)).policy.revision, 1)
})

test('PL-01 settings: contradictory period and cycle states reject atomically while coherent transitions persist', async () => {
  const initial = await create({ settings: completeSettings() }), policyId = initial.policy.id, versionId = initial.versions[0].id
  const before = await policySnapshot()
  for (const settings of [
    { defaultPeriodType: 'CALENDAR_MONTH' }, { defaultPeriodType: 'SEMI_MONTHLY' },
    { cycleEndMode: 'DERIVED' }, { cycleEndMode: 'FIXED_DAY', cycleEndDay: null },
    { defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1, cycleEndMode: 'FIXED_DAY', cycleEndDay: 31 },
    { defaultPeriodType: 'SEMI_MONTHLY', cycleStartDay: 2, cycleEndMode: 'DERIVED', cycleEndDay: null },
    // الخطوة 15: يوم نهاية ثابت لا يصنع فترات متصلة (تداخل 23→23، فجوة 23→25 و1→15، و30 مع 31).
    { cycleEndDay: 23 }, { cycleEndDay: 25 }, { cycleStartDay: 1, cycleEndDay: 15 }, { cycleStartDay: 30, cycleEndDay: 31 },
  ]) expectStatus(await patchVersion(policyId, versionId, { settings }), 400)
  assert.deepEqual(await policySnapshot(), before)
  for (const defaultPeriodType of ['CALENDAR_MONTH', 'SEMI_MONTHLY']) {
    const desired = completeSettings({ defaultPeriodType, cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null })
    const created = await create({ settings: desired })
    assert.deepEqual(settingsOf(created.versions[0]), desired)
    assertSettingsView(created.versions[0], 'COMPLETE')
  }
  const desired = { defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null }
  const changed = expectStatus(await patchVersion(policyId, versionId, { settings: desired }), 200)
  assert.deepEqual(settingsOf(changed.version), completeSettings(desired))
})

test('PL-01 settings: invalid numbers, forbidden formulas, null cores and forged settings reject without truncation or mutation', async () => {
  const initial = await create({ settings: completeSettings() }), policyId = initial.policy.id, versionId = initial.versions[0].id
  const snapshot = await policySnapshot()
  const invalid = [null, { monthlyDays: 29 }, { monthlyDays: 31 }, { monthlyDays: null }, { dailyHours: null },
    { dailyHours: 0 }, { dailyHours: 24.01 }, { dailyHours: 0.001 }, { cycleStartDay: 1.5 }, { cycleStartDay: 32 },
    { cycleEndDay: 0 }, { roundingScale: 1.5 }, { roundingScale: 7 }, { roundingMode: 'DOWN' },
    { maxDeductionPctOfGross: 0.00001 }, { maxDeductionPctOfGross: 100.0001 }, { netFloorPct: -0.0001 },
    { netFloorPct: 0.00001 }, { minNetGuarantee: 0.001 }, { minNetGuarantee: 9007199254740991 },
    { minNetGuarantee: 90071992547409.92 }, { rateBase: 'FORMULA' }, { rateBaseFormula: 'basic_salary*2' },
    { formula: 'gross*0.5' }, { components: [] }, { status: 'ACTIVE' }, { createdBy: managerB.id }, { monthlyDays: '30' },
    { carryOverExcess: 'true' }, { skipAttendance: 1 }, { lateDeductionEnabled: null }, { currency: '' }, { currency: 'USD' }, { dailyHours: '8' }]
  for (const settings of invalid) {
    expectStatus(await request(admin, 'POST', endpoint, definition({ settings })), 400)
    expectStatus(await patchVersion(policyId, versionId, { settings }), 400)
  }
  expectStatus(await patchVersion(policyId, versionId, { rateBase: 'BASIC' }), 400)
  expectStatus(await request(admin, 'PATCH', `${endpoint}/${policyId}`, {
    expectedRevision: 1, reason: 'الإعدادات تخص النسخة', settings: completeSettings() }), 400)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01 settings: legacy all-null metadata, dates and clone stay missing even when live defaults become corrupt', async () => {
  const { policyId, versionId } = await legacyVersion()
  await withConfigRestored(async () => {
    await repo('RequestsConfig').save({ key: 'payroll.policy.rounding_mode', value: 'CORRUPT_LIVE_DEFAULT' })
    await repo('RequestsConfig').save({ key: 'payroll.daily_hours', value: 'NOT_A_NUMBER' })
    const missing = Object.fromEntries(settingFields.map(field => [field, null]))
    const read = await fullRead(policyId, versionId)
    assert.deepEqual(settingsOf(read), missing)
    assertSettingsView(read, 'MISSING')
    const metadata = expectStatus(await patchVersion(policyId, versionId, { metadata: { title: 'قديم بلا إعدادات' } }), 200)
    assert.deepEqual(settingsOf(metadata.version), missing)
    assertSettingsView(metadata.version, 'MISSING')
    const date = expectStatus(await patchVersion(policyId, versionId, { expectedRevision: 2, effectiveFrom: '2026-08-01' }), 200)
    assert.deepEqual(settingsOf(date.version), missing)
    assertSettingsView(date.version, 'MISSING')
    const original = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId }))
    const clone = expectStatus(await request(admin, 'POST', `${endpoint}/${policyId}/versions`, {
      sourceVersionId: versionId, expectedRevision: 3, reason: 'نسخ قديم دون اختراع إعدادات' }), 201)
    assert.deepEqual(settingsOf(clone.version), missing)
    assertSettingsView(clone.version, 'MISSING')
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), original)
  })
})

test('PL-01 settings: missing and partially corrupt historical settings require explicit full initialization without erasing source values', async () => {
  for (const fixture of [{}, { dailyHours: 6.75, roundingMode: 'HALF_UP', monthlyDays: 29 }]) {
    const { policyId, versionId } = await legacyVersion(fixture)
    assertSettingsView(await fullRead(policyId, versionId), Object.keys(fixture).length ? 'INVALID' : 'MISSING')
    const snapshot = await policySnapshot()
    for (const settings of [{}, { dailyHours: 8 }, { ...completeSettings(), currency: undefined }]) {
      const result = await patchVersion(policyId, versionId, { settings })
      assert.ok([400, 409].includes(result.status), JSON.stringify(result))
      assert.deepEqual(await policySnapshot(), snapshot)
    }
    await withConfigRestored(async () => {
      await repo('RequestsConfig').save({ key: 'payroll.policy.rounding_mode', value: 'CORRUPT_LIVE_DEFAULT' })
      const initialized = expectStatus(await patchVersion(policyId, versionId, { settings: completeSettings({ minNetGuarantee: 0.29 }) }), 200)
      assert.deepEqual(settingsOf(initialized.version), completeSettings({ minNetGuarantee: 0.29 }))
      assertSettingsView(initialized.version, 'COMPLETE')
      assert.equal(initialized.version.revision, 2)
    })
  }
})

test('PL-01 settings: INVALID partial historical settings remain exact through metadata, date and clone with corrupt live defaults', async () => {
  const { policyId, versionId } = await legacyVersion({ dailyHours: 6.75, monthlyDays: 29, roundingMode: 'HALF_UP', currency: 'EGP' })
  const originalSettings = settingsOf(await fullRead(policyId, versionId))
  await withConfigRestored(async () => {
    await repo('RequestsConfig').save({ key: 'payroll.policy.rounding_mode', value: 'CORRUPT_LIVE_DEFAULT' })
    await repo('RequestsConfig').save({ key: 'payroll.daily_hours', value: 'NOT_A_NUMBER' })
    const metadata = expectStatus(await patchVersion(policyId, versionId, { metadata: { notes: 'حفظ القيم القديمة غير المكتملة' } }), 200)
    assert.deepEqual(settingsOf(metadata.version), originalSettings)
    assertSettingsView(metadata.version, 'INVALID')
    const date = expectStatus(await patchVersion(policyId, versionId, { expectedRevision: 2, effectiveFrom: '2026-08-01' }), 200)
    assert.deepEqual(settingsOf(date.version), originalSettings)
    assertSettingsView(date.version, 'INVALID')
    const beforeClone = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId }))
    const cloned = expectStatus(await request(admin, 'POST', `${endpoint}/${policyId}/versions`, {
      sourceVersionId: versionId, expectedRevision: 3, reason: 'استنساخ مع بقاء القيم الجزئية غير الصالحة' }), 201)
    assert.deepEqual(settingsOf(cloned.version), originalSettings)
    assertSettingsView(cloned.version, 'INVALID')
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), beforeClone)
  })
})

test('PL-01 settings: ACTIVE, frozen and ARCHIVED copy on write preserves every original field and copies all eighteen settings', async () => {
  for (const kind of ['ACTIVE', 'FROZEN_DRAFT', 'ARCHIVED']) {
    const desired = completeSettings(), initial = await create({ settings: desired }), policyId = initial.policy.id, versionId = initial.versions[0].id
    await repo('PayrollPolicyVersion').update(versionId, { status: kind === 'FROZEN_DRAFT' ? 'DRAFT' : kind,
      frozenAt: kind === 'FROZEN_DRAFT' ? new Date('2026-07-01T08:00:00Z') : null })
    const original = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId }))
    const changed = expectStatus(await patchVersion(policyId, versionId, { settings: { roundingMode: 'FLOOR' } }), 200)
    assert.equal(changed.editKind, 'CLONED')
    assert.equal(changed.version.status, 'DRAFT')
    assert.equal(changed.version.sourceVersionId, versionId)
    assert.deepEqual(settingsOf(changed.version), { ...desired, roundingMode: 'FLOOR' })
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), original)
    const cloned = expectStatus(await request(admin, 'POST', `${endpoint}/${policyId}/versions`, {
      sourceVersionId: versionId, expectedRevision: 1, reason: 'نسخ كل حقول المصدر التاريخي' }), 201)
    assert.equal(cloned.version.versionNo, 3)
    assert.deepEqual(settingsOf(cloned.version), desired)
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), original)
  }
})

test('PL-01 settings: explicit initialization of a frozen legacy version creates a complete draft and preserves the missing original', async () => {
  const { policyId, versionId } = await legacyVersion({ frozenAt: new Date('2026-07-01T08:00:00Z') })
  const original = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId }))
  await withConfigRestored(async () => {
    await repo('RequestsConfig').save({ key: 'payroll.policy.rounding_mode', value: 'CORRUPT_LIVE_DEFAULT' })
    const desired = completeSettings({ minNetGuarantee: 0.29 })
    const initialized = expectStatus(await patchVersion(policyId, versionId, { settings: desired }), 200)
    assert.equal(initialized.editKind, 'CLONED')
    assert.equal(initialized.version.status, 'DRAFT')
    assert.equal(initialized.version.sourceVersionId, versionId)
    assert.equal(initialized.version.frozenAt, null)
    assert.deepEqual(settingsOf(initialized.version), desired)
    assertSettingsView(initialized.version, 'COMPLETE')
    assertSettingsView(await fullRead(policyId, versionId), 'MISSING')
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })), original)
  })
})

test('PL-01 settings: branch and wildcard access cannot modify global or foreign version settings', async () => {
  const global = await create(), own = await create({}, managerA), foreign = await create({}, managerB)
  const before = await policySnapshot()
  for (const actor of [managerA, starA]) {
    for (const target of [global, foreign]) {
      expectStatus(await patchVersion(target.policy.id, target.versions[0].id, { settings: { dailyHours: 7 } }, actor), 403)
    }
  }
  expectStatus(await patchVersion(own.policy.id, own.versions[0].id, { settings: { dailyHours: 7 } }, viewerA), 403)
  expectStatus(await patchVersion(global.policy.id, global.versions[0].id, { settings: { dailyHours: 7 } }, unassigned), 403)
  assert.deepEqual(await policySnapshot(), before)
  const updated = expectStatus(await patchVersion(own.policy.id, own.versions[0].id, { settings: { dailyHours: 7 } }, starA), 200)
  assert.equal(updated.version.dailyHours, 7)
})

test('PL-01 settings: concurrent partial settings revisions commit one coherent snapshot and one audit event', async () => {
  const desired = completeSettings(), initial = await create({ settings: desired }), policyId = initial.policy.id, versionId = initial.versions[0].id
  const responses = await concurrentBehindPolicyLock(policyId, ['FLOOR', 'HALF_EVEN'].map(roundingMode =>
    () => patchVersion(policyId, versionId, { reason: `تزامن إعدادات ${roundingMode}`, settings: { roundingMode, dailyHours: roundingMode === 'FLOOR' ? 7 : 9 } })))
  assert.deepEqual(responses.map(row => row.status).sort(), [200, 409], JSON.stringify(responses))
  const winner = responses.find(row => row.status === 200).body.version
  assert.deepEqual(settingsOf(await fullRead(policyId, versionId)), settingsOf(winner))
  assert.equal(winner.revision, 2)
  assert.equal(winner.dailyHours, winner.roundingMode === 'FLOOR' ? 7 : 9)
  assert.equal(winner.maxDeductionPctOfGross, desired.maxDeductionPctOfGross)
  assert.equal((await events(policyId)).filter(event => event.reason?.startsWith('تزامن إعدادات')).length, 1)
})

test('PL-01 settings: audit insert failure atomically rolls back settings creation, update, initialization and copy on write', async () => {
  const initial = await create({ settings: completeSettings() }), historical = await legacyVersion(), active = await create({ settings: completeSettings() })
  await repo('PayrollPolicyVersion').update(active.versions[0].id, { status: 'ACTIVE' })
  const snapshot = await policySnapshot()
  await ds.query(`CREATE TRIGGER [TR_policy_settings_test_reject_event] ON [payroll_policy_events] AFTER INSERT AS
    BEGIN SET NOCOUNT ON; THROW 51000, 'POLICY_SETTINGS_TEST_EVENT_FAILURE', 1; END`)
  app.useLogger(false)
  try {
    const actions = [
      () => request(admin, 'POST', endpoint, definition({ settings: completeSettings() })),
      () => patchVersion(initial.policy.id, initial.versions[0].id, { settings: { dailyHours: 9.75 } }),
      () => patchVersion(historical.policyId, historical.versionId, { settings: completeSettings() }),
      () => patchVersion(active.policy.id, active.versions[0].id, { settings: { dailyHours: 9.75 } }),
    ]
    for (const action of actions) {
      const result = await action()
      assert.ok(result.status >= 500, JSON.stringify(result))
      assert.deepEqual(await policySnapshot(), snapshot)
    }
  } finally { await ds.query('DROP TRIGGER IF EXISTS [TR_policy_settings_test_reject_event]'); app.useLogger(['error']) }
})
