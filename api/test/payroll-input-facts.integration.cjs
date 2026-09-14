// اختبارات معاينة حقائق الأجر والتغطية والجدول الصريحة بقاعدة SQL عشوائية دون احتساب أو كتابة مالية.
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
const database = `hr_payroll_input_facts_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-input-facts-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter
const definitionTables = ['payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers']
const definitionEntities = ['PayrollPolicyComponent', 'PayrollPolicyParameter', 'PayrollTierSet', 'PayrollPolicyTier']
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, canonical(child)]))
  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) return value.replace(/0+$/, '').replace(/\.$/, '')
  return value
}

function assertDisposable() {
  assert.match(database, /^hr_payroll_input_facts_test_[a-f0-9]{16}$/)
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
  for (const table of definitionTables) result[table] = await rawRows(table)
  return result
}
async function rawRows(table, versionId) {
  assertDisposable()
  assert.match(table, /^payroll_[a-z_]+$/)
  // JSON يكوّنه SQL ويظل نصًا: لا نمرر DECIMAL كبيرًا عبر Number أثناء مقارنة التاريخ.
  const filter = versionId == null ? '' : table === 'payroll_policy_tiers'
    ? 'WHERE [tierSetId] IN (SELECT [id] FROM [payroll_tier_sets] WHERE [versionId]=@0)' : 'WHERE [versionId] = @0'
  const result = await ds.query(`SELECT (SELECT * FROM [${table}] ${filter}
    ORDER BY [id] FOR JSON PATH, INCLUDE_NULL_VALUES) AS [snapshot]`, versionId == null ? [] : [versionId])
  return result[0].snapshot
}
function salary(basicSalary = '9000.00', extra = {}) {
  return { basicSalary, housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00',
    workNatureAllowance: '0.00', otherAllowance: '0.00', ...extra }
}
function facts(extra = {}) {
  return { periodStart: '2026-06-01', periodEnd: '2026-06-30', hireDate: '2020-01-01',
    coverageStart: '2026-06-01', coverageEnd: '2026-06-30', coverageSourceRef: 'explicit:employment-coverage',
    salarySegments: [{ from: '2026-06-01', to: '2026-06-30', sourceRef: 'explicit:monthly-salary', salary: salary() }],
    scheduledWorkDates: ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'],
    scheduleSourceRef: 'explicit:working-dates', ...extra }
}
async function factsFixture(settings = {}, actor = admin, extra = {}) {
  const initial = await create({ settings: { dailyHours: 9, monthlyDays: 30, roundingMode: 'HALF_UP', roundingScale: 2,
    cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    rateBase: 'GROSS', lateDeductionEnabled: true, skipAttendance: false, ...settings }, ...extra }, actor)
  return { policyId: initial.policy.id, versionId: initial.versions[0].id, revision: initial.versions[0].revision }
}
async function preview(fixture, factValues = facts(), extra = {}, actor = admin) {
  const before = await policySnapshot()
  const response = await request(actor, 'POST', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/inputs/preview`,
    { expectedRevision: fixture.revision, facts: factValues, ...extra })
  assert.deepEqual(await policySnapshot(), before, 'Explicit input preview wrote policies, versions, definitions or events')
  return response
}
async function previewResult(fixture, factValues = facts(), extra = {}, actor = admin) {
  const response = expectStatus(await preview(fixture, factValues, extra, actor), 200)
  assert.equal(response.policyId, fixture.policyId)
  assert.equal(response.versionId, fixture.versionId)
  assert.equal(response.revision, fixture.revision)
  assert.equal(response.contractVersion, 'SRS_V1')
  assert.equal(response.previewOnly, true)
  assert.equal(response.source, 'EXPLICIT_INPUTS')
  assert.match(response.snapshotHash, /^[a-f0-9]{64}$/)
  assert.ok(response.inputFactsVersion)
  assert.equal(response.result.contractVersion, 'SRS_INPUT_FACTS_V2_20260914')
  assert.equal(response.result.periodEntitlement, 'FULL_MONTHLY_CYCLE')
  assert.equal(response.result.salaryBasis, 'SINGLE_PAYROLL_PERIOD_SALARY')
  assert.equal(response.result.referencePeriod, factValues.periodEnd.slice(0, 7))
  assert.equal(response.result.sourceValidation, 'CALLER_SUPPLIED_UNVERIFIED')
  assert.equal(response.result.earnedWorking, undefined)
  assert.equal(response.result.variables, undefined)
  return response.result
}
function expectExact(value, numerator, denominator = '1') {
  assert.match(value.rawValue6, /^-?\d+\.\d{6}$/)
  assert.equal(typeof value.exact.numerator, 'string')
  assert.equal(typeof value.exact.denominator, 'string')
  assert.ok(BigInt(value.exact.denominator) > 0n)
  assert.equal(BigInt(value.exact.numerator) * BigInt(denominator), BigInt(numerator) * BigInt(value.exact.denominator))
}
function expectDecimal(value, text) {
  const [integer, fraction = ''] = text.split('.')
  expectExact(value, integer + fraction, '1' + '0'.repeat(fraction.length))
}
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment', 'LatenessTier',
    'AttendanceDay', 'AttendancePunch', 'AttendanceExemption', 'AttendanceExemptionEvent', 'PayrollPeriodClaim',
    'Request', 'RequestApproval', 'AttendanceCorrection', 'LeaveBalance', 'EmployeeStatusHistory']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  result.RequestsConfig = plain(await repo('RequestsConfig').find({ order: { key: 'ASC' } }))
  return result
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
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  // نمنع مهام الاستدراك المؤجلة من تعديل تجهيزات الاختبار أثناء المعاينات.
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
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
  const permissions = ['payroll.view', 'payroll.calculate']
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
  employeeA = await employee('POLICY_CANARY_A', branchA.id, departmentA.id, teamA.id)
  employeeB = await employee('POLICY_CANARY_B', branchB.id, departmentB.id, teamB.id)
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
  await repo('LatenessTier').save({ fromMinutes: 1, toMinutes: null, mode: 'MINUTES', value: 0, isActive: true, label: 'شريحة قديمة لا يغيرها تخزين التعريف الجديد' })
  // لحاق الإقلاع الحقيقي مؤجل 30 ثانية؛ ننتظر إتمامه قبل تثبيت canary كي لا يُنسب أثره لمعاينة قراءة فقط.
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
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
    assert.match(path.basename(uploads), /^hr-payroll-input-facts-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('Input facts API: real JWT and branch permissions permit global and archived read-only previews but cannot broaden wildcard scope', async () => {
  const own = await factsFixture({}, managerA), global = await factsFixture()
  expectStatus(await preview(own, facts(), {}, null), 401)
  expectStatus(await preview(own, facts(), {}, viewerA), 403)
  expectStatus(await preview(own, facts(), {}, noPermission), 403)
  expectStatus(await preview(own, facts(), {}, managerA), 200)
  expectStatus(await preview(own, facts(), {}, starA), 200)
  expectStatus(await preview(global, facts(), {}, managerA), 200)
  expectStatus(await preview(global, facts(), {}, starA), 200)
  for (const actor of [managerB, unassigned]) {
    const denied = expectStatus(await preview(own, facts(), {}, actor), 403)
    assert.equal(denied.result, undefined)
    assert.equal(denied.normalizedInput, undefined)
  }
  expectStatus(await request(admin, 'POST', `${endpoint}/${global.policyId}/archive`, { expectedRevision: 1, reason: 'اختبار معاينة مدخلات التاريخ' }), 201)
  expectStatus(await preview(global, facts(), {}, managerA), 200)
  expectStatus(await preview({ ...own, versionId: global.versionId }), 404)
})

test('Input facts API: complete settings allow an empty definition and null catalog markers without creating definitions or stamps', async () => {
  const fixture = await factsFixture()
  const before = await policySnapshot()
  const version = await repo('PayrollPolicyVersion').findOneByOrFail({ id: fixture.versionId })
  assert.equal(version.catalogVersion, null)
  assert.equal(version.engineVersion, null)
  await previewResult(fixture)
  assert.deepEqual(await policySnapshot(), before)
  for (const entity of definitionEntities) assert.equal(await repo(entity).count(), 0, 'Facts preview must not create any definition children')
})

test('Input facts API: missing or corrupt settings, unsupported contracts and unknown markers fail without inferring historical values', async () => {
  for (const mutation of [
    { monthlyDays: null }, { monthlyDays: 29 }, { dailyHours: null }, { rateBase: null },
    { contractVersion: 'LEGACY_V1' }, { catalogVersion: 'UNRECOGNIZED' }, { engineVersion: 'UNRECOGNIZED' },
  ]) {
    const fixture = await factsFixture()
    await repo('PayrollPolicyVersion').update(fixture.versionId, mutation)
    expectStatus(await preview(fixture), 409)
  }
  const semi = await factsFixture({ defaultPeriodType: 'SEMI_MONTHLY', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null })
  expectStatus(await preview(semi), 409)
})

test('Input facts API: all required fields and six salary values remain explicit; forged server, employee and calculation fields reject', async () => {
  const fixture = await factsFixture(), original = facts()
  expectStatus(await preview(fixture, original, { expectedRevision: undefined }), 400)
  expectStatus(await preview(fixture, original, { expectedRevision: '1' }), 400)
  expectStatus(await preview(fixture, original, { facts: undefined }), 400)
  for (const field of Object.keys(original)) {
    const changed = plain(original); delete changed[field]
    expectStatus(await preview(fixture, changed), 400)
  }
  for (const field of Object.keys(original.salarySegments[0])) {
    const changed = plain(original); delete changed.salarySegments[0][field]
    expectStatus(await preview(fixture, changed), 400)
  }
  for (const field of Object.keys(salary())) {
    const changed = plain(original); delete changed.salarySegments[0].salary[field]
    expectStatus(await preview(fixture, changed), 400)
  }
  for (const extra of [{ settings: { monthlyDays: 20 } }, { employeeId: employeeA.id }, { payrollRunId: 1 },
    { sourceValidation: 'SERVER_VERIFIED' }, { catalogVersion: 'CUSTOM' }, { result: {} }, { inputs: {} }]) {
    expectStatus(await preview(fixture, original, extra), 400)
  }
  for (const changed of [
    facts({ employeeId: employeeA.id }), facts({ serverVerified: true }), facts({ earnedCalendar30: '1' }),
    facts({ salarySegments: [{ ...original.salarySegments[0], approvedBy: admin.id }] }),
    facts({ salarySegments: [{ ...original.salarySegments[0], salary: { ...salary(), salaryCycle: 'monthly' } }] }),
    JSON.parse(JSON.stringify(original).replace('"hireDate":', '"__proto__":{},"hireDate":')),
    JSON.parse(JSON.stringify(original).replace('"hireDate":', '"constructor":{},"hireDate":')),
  ]) expectStatus(await preview(fixture, changed), 400)
})

test('Input facts API: money accepts exact nonnegative DEC18,2 strings and rejects coercion, overprecision and overflow', async () => {
  const fixture = await factsFixture()
  for (const value of [9000, null, '-0.01', 'NaN', 'Infinity', '', ' ', '9e3', '10000000000000000', '1.001', [], {}, true]) {
    const changed = facts(); changed.salarySegments[0].salary.basicSalary = value
    expectStatus(await preview(fixture, changed), 400)
  }
  for (const field of Object.keys(salary())) {
    const changed = facts(); changed.salarySegments[0].salary[field] = '-1'
    expectStatus(await preview(fixture, changed), 400)
  }
  const zero = facts(); zero.salarySegments[0].salary = salary('0.00')
  const result = await previewResult(fixture, zero)
  expectExact(result.monthlyEquivalent.grossSalary, '0')
  expectExact(result.rates.minuteRate, '0')
})

test('Input facts API: invalid calendar dates, nonmonthly ranges and coverage outside period or before hire reject', async () => {
  const fixture = await factsFixture()
  for (const extra of [
    { periodStart: '2026-02-30' }, { periodEnd: '2026-02-30' }, { hireDate: '2026-02-30' },
    { coverageStart: '2026-02-30' }, { coverageEnd: '2026-02-30' },
    { periodStart: '2026-6-01' }, { periodStart: '2026-06-01T00:00:00Z' },
    { periodStart: '2026-07-01', periodEnd: '2026-06-30' },
    { coverageStart: '2026-05-31' }, { coverageEnd: '2026-07-01' },
    { coverageStart: '2026-06-20', coverageEnd: '2026-06-10' },
    { hireDate: '2026-06-02' }, { hireDate: '2026-07-01' },
    { coverageStart: null }, { coverageEnd: null },
  ]) expectStatus(await preview(fixture, facts(extra)), 400)
  expectStatus(await preview(fixture, facts({ periodEnd: '2026-07-03' })), 409)
})

test('Input facts API: dated salary segments require exact gapless nonoverlapping coverage with no out-of-range or duplicate rows', async () => {
  const fixture = await factsFixture(), baseSegment = facts().salarySegments[0]
  for (const salarySegments of [[], [baseSegment, baseSegment],
    [{ ...baseSegment, from: '2026-06-02' }], [{ ...baseSegment, to: '2026-06-29' }],
    [{ ...baseSegment, from: '2026-05-31' }], [{ ...baseSegment, to: '2026-07-01' }],
    [{ ...baseSegment, from: '2026-06-15', to: '2026-06-14' }],
    [{ ...baseSegment, from: '2026-02-30' }],
    [{ ...baseSegment, to: '2026-06-14' }, { ...baseSegment, from: '2026-06-16' }],
    [{ ...baseSegment, to: '2026-06-16' }, { ...baseSegment, from: '2026-06-16' }],
  ]) expectStatus(await preview(fixture, facts({ salarySegments })), 400)
})

test('Input facts API: source references are mandatory nonempty bounded strings and schedule dates are explicit unique dates within the period', async () => {
  const fixture = await factsFixture()
  for (const value of ['', '   ', null, 123, 'x'.repeat(201)]) {
    expectStatus(await preview(fixture, facts({ coverageSourceRef: value })), 400)
    expectStatus(await preview(fixture, facts({ scheduleSourceRef: value })), 400)
    const changed = facts(); changed.salarySegments[0].sourceRef = value
    expectStatus(await preview(fixture, changed), 400)
  }
  for (const scheduledWorkDates of [null, {}, ['2026-06-01', '2026-06-01'],
    ['2026-05-31'], ['2026-07-01'], ['2026-02-30'], ['2026-6-01'], ['2026-06-01T00:00:00Z']]) {
    expectStatus(await preview(fixture, facts({ scheduledWorkDates })), 400)
  }
})

test('Input facts API: full monthly cycle exposes exact six salary components, rates and separate coverage factors', async () => {
  const fixture = await factsFixture()
  const result = await previewResult(fixture)
  assert.equal(result.coverage.periodDays, 30)
  assert.equal(result.coverage.coveredDays, 30)
  assert.equal(result.coverage.fullCoverage, true)
  assert.equal(result.coverage.periodScheduledDays, 5)
  assert.equal(result.coverage.coveredScheduledDays, 5)
  expectExact(result.coverage.calendarCoverageFactor, '1')
  expectExact(result.coverage.workingCoverageFactor, '1')
  expectExact(result.coverage.earnedCalendar30Factor, '1')
  expectExact(result.monthlyEquivalent.components.basicSalary, '9000')
  expectExact(result.monthlyEquivalent.allowancesTotal, '0')
  expectExact(result.monthlyEquivalent.grossSalary, '9000')
  expectExact(result.earnedCalendar30.grossSalary, '9000')
  expectExact(result.rates.monthlyRateBase, '9000')
  expectExact(result.rates.dayRate, '300')
  expectExact(result.rates.hourRate, '100', '3')
  expectExact(result.rates.minuteRate, '5', '9')
  assert.equal(result.rates.minuteRate.rawValue6, '0.555556')
  assert.deepEqual(result.settingsUsed, { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    monthlyDays: 30, dailyHours: '9', rateBase: 'GROSS' })
})

test('راتب سبتمبر10000 يطبق عبرHTTP على23أغسطس إلى22سبتمبر كله وترفض قيمتان داخل الدورة', async () => {
  const fixture = await factsFixture({ cycleStartDay: 23 })
  const input = completeCycleFacts('2026-08-23', '2026-09-22')
  input.salarySegments[0] = { ...input.salarySegments[0], sourceRef: 'salary:2026-09', salary: salary('10000') }
  const result = await previewResult(fixture, input)
  expectExact(result.monthlyEquivalent.components.basicSalary, '10000'); expectExact(result.earnedCalendar30.grossSalary, '10000')
  expectExact(result.rates.dayRate, '1000', '3'); expectExact(result.segments[0].calendarWeight, '1')
  assert.equal(result.referencePeriod, '2026-09'); assert.equal(result.coverage.periodDays, 31)
  for (const secondSalary of [salary('10000'), salary('9000')]) {
    const error = expectStatus(await preview(fixture, { ...input, salarySegments: [
      { from: '2026-08-23', to: '2026-08-31', sourceRef: 'salary:old', salary: salary('9000') },
      { from: '2026-09-01', to: '2026-09-22', sourceRef: 'salary:new', salary: secondSalary },
    ] }), 400)
    assert.equal(error.code, 'INPUT_FACTS_MONTHLY_SALARY_REQUIRED')
    assert.equal(error.path, 'salarySegments'); assert.match(error.message, /راتب واحدة|لا يقسم/)
  }
})

test('Input facts API: partial coverage keeps monthly wage rates intact and distinguishes calendar30 earning from scheduled coverage', async () => {
  const fixture = await factsFixture()
  const result = await previewResult(fixture, facts({ hireDate: '2026-06-10', coverageStart: '2026-06-16',
    salarySegments: [{ from: '2026-06-16', to: '2026-06-30', sourceRef: 'salary:covered-half', salary: salary() }],
    scheduledWorkDates: ['2026-06-01', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-30'],
  }))
  assert.equal(result.coverage.coveredDays, 15)
  assert.equal(result.coverage.fullCoverage, false)
  assert.equal(result.coverage.periodScheduledDays, 5)
  assert.equal(result.coverage.coveredScheduledDays, 3)
  expectExact(result.coverage.calendarCoverageFactor, '1', '2')
  expectExact(result.coverage.workingCoverageFactor, '3', '5')
  expectExact(result.coverage.earnedCalendar30Factor, '1', '2')
  expectExact(result.monthlyEquivalent.grossSalary, '9000')
  expectExact(result.earnedCalendar30.grossSalary, '4500')
  expectExact(result.rates.dayRate, '300')
  expectExact(result.rates.minuteRate, '5', '9')
})

test('Input facts API: full February and 31-day cycles earn one monthly equivalent while partial periods stay on fixed thirty', async () => {
  const fixture = await factsFixture()
  for (const [from, to, days] of [['2026-02-01', '2026-02-28', 28], ['2026-07-01', '2026-07-31', 31], ['2028-02-01', '2028-02-29', 29]]) {
    const result = await previewResult(fixture, facts({ periodStart: from, periodEnd: to, coverageStart: from, coverageEnd: to,
      salarySegments: [{ from, to, sourceRef: 'salary:full-cycle', salary: salary() }], scheduledWorkDates: [from, to] }))
    assert.equal(result.coverage.periodDays, days)
    expectExact(result.coverage.earnedCalendar30Factor, '1')
    expectExact(result.earnedCalendar30.grossSalary, '9000')
    expectExact(result.rates.dayRate, '300')
  }
  const partial = await previewResult(fixture, facts({ periodStart: '2026-02-01', periodEnd: '2026-02-28',
    coverageStart: '2026-02-02', coverageEnd: '2026-02-28',
    salarySegments: [{ from: '2026-02-02', to: '2026-02-28', sourceRef: 'salary:partial-february', salary: salary() }],
    scheduledWorkDates: ['2026-02-01', '2026-02-02', '2026-02-28'] }))
  expectExact(partial.coverage.calendarCoverageFactor, '27', '28')
  expectExact(partial.coverage.earnedCalendar30Factor, '9', '10')
  expectExact(partial.earnedCalendar30.grossSalary, '8100')
})

test('Input facts API: no scheduled dates gives null working factor with a warning and never invents earned-working pay', async () => {
  const fixture = await factsFixture()
  const result = await previewResult(fixture, facts({ scheduledWorkDates: [] }))
  assert.equal(result.coverage.periodScheduledDays, 0)
  assert.equal(result.coverage.coveredScheduledDays, 0)
  assert.equal(result.coverage.workingCoverageFactor, null)
  assert.ok(result.warnings.some(warning => warning.code === 'NO_SCHEDULED_WORK_DAYS'))
  expectExact(result.earnedCalendar30.grossSalary, '9000')
})

test('Input facts API: exact monthly salary preserves large decimal strings and fractional service earnings without daily salary weights', async () => {
  const fixture = await factsFixture()
  const amount = '9007199254740991.91', allSix = Object.fromEntries(Object.keys(salary()).map(field => [field, amount]))
  const huge = await previewResult(fixture, facts({ salarySegments: [{ from: '2026-06-01', to: '2026-06-30', sourceRef: 'salary:exact-large', salary: allSix }] }))
  for (const value of Object.values(huge.monthlyEquivalent.components)) expectDecimal(value, amount)
  expectDecimal(huge.monthlyEquivalent.allowancesTotal, '45035996273704959.55')
  expectDecimal(huge.monthlyEquivalent.grossSalary, '54043195528445951.46')
  const fraction = await previewResult(fixture, facts({ periodStart: '2026-07-01', periodEnd: '2026-07-31', coverageStart: '2026-07-31', coverageEnd: '2026-07-31',
    salarySegments: [{ from: '2026-07-31', to: '2026-07-31', sourceRef: 'salary:2026-07', salary: salary('0.01') }], scheduledWorkDates: ['2026-07-01', '2026-07-31'] }))
  expectExact(fraction.monthlyEquivalent.components.basicSalary, '1', '100')
  expectExact(fraction.earnedCalendar30.components.basicSalary, '1', '3000')
  expectExact(fraction.rates.minuteRate, '1', String(100 * 30 * 9 * 60))
})

test('Input facts API: persisted basic or gross basis and daily hours are independent of live config and repeated previews are deterministic', async () => {
  const basic = await factsFixture({ rateBase: 'BASIC', dailyHours: 6 })
  const gross = await factsFixture({ rateBase: 'GROSS', dailyHours: 9 })
  const input = facts({ salarySegments: [{ from: '2026-06-01', to: '2026-06-30', sourceRef: 'salary:basic-plus-housing',
    salary: salary('9000', { housingAllowance: '7200' }) }] })
  const basicResult = await previewResult(basic, input)
  expectExact(basicResult.rates.monthlyRateBase, '9000')
  expectExact(basicResult.rates.hourRate, '50')
  const first = expectStatus(await preview(gross, input), 200)
  expectExact(first.result.rates.monthlyRateBase, '16200')
  expectExact(first.result.rates.minuteRate, '1')
  assert.deepEqual(expectStatus(await preview(gross, input), 200), first)
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.daily_hours' })
  try {
    await repo('RequestsConfig').update({ key: config.key }, { value: 'BROKEN_LIVE_CONFIG' })
    assert.deepEqual(expectStatus(await preview(gross, input), 200), first)
  } finally { await repo('RequestsConfig').update({ key: config.key }, { value: config.value }) }
})

test('Input facts API: opaque source references preserve trace without claiming authenticated salary provenance or reading live employee pay', async () => {
  const fixture = await factsFixture()
  const sourceRef = `employees/${employeeB.id}/not-a-verified-salary-source`
  const input = facts({ coverageSourceRef: `employee:${employeeB.id}`, scheduleSourceRef: 'not-a-real-work-schedule',
    salarySegments: [{ from: '2026-06-01', to: '2026-06-30', sourceRef, salary: salary('16200') }] })
  const result = await previewResult(fixture, input, {}, managerA)
  expectExact(result.monthlyEquivalent.grossSalary, '16200')
  assert.equal(result.sourceValidation, 'CALLER_SUPPLIED_UNVERIFIED')
  assert.equal(result.normalizedInput.salarySegments[0].sourceRef, sourceRef)
  assert.equal(result.normalizedInput.coverageSourceRef, `employee:${employeeB.id}`)
  assert.equal(result.normalizedInput.scheduleSourceRef, 'not-a-real-work-schedule')
  assert.equal(result.serverVerified, undefined)
  assert.equal(result.employeeId, undefined)
  assert.equal((await repo('Employee').findOneByOrFail({ id: employeeB.id })).basicSalary, 9000)
})

test('Input facts API: stale revisions reject after settings changes and only a new snapshot uses the new rate', async () => {
  const fixture = await factsFixture()
  expectStatus(await preview(fixture, facts(), { expectedRevision: 2 }), 409)
  const changed = expectStatus(await request(admin, 'PATCH', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}`,
    { expectedRevision: 1, reason: 'تغيير ساعات نسخة حقائق الاختبار', settings: { dailyHours: 18 } }), 200)
  assert.equal(changed.version.revision, 2)
  expectStatus(await preview(fixture), 409)
  const result = await previewResult({ ...fixture, revision: 2 })
  expectExact(result.rates.minuteRate, '5', '18')
})

test('Input facts API: normalized monthly salary decimals and reordered work dates produce identical trace hashes and results', async () => {
  const fixture = await factsFixture()
  const input = facts({ salarySegments: [
    { from: '2026-06-01', to: '2026-06-30', sourceRef: 'salary:2026-06', salary: salary('12000.00') },
  ] })
  const first = expectStatus(await preview(fixture, input), 200)
  const reordered = plain(input)
  reordered.scheduledWorkDates.reverse()
  for (const segment of reordered.salarySegments) for (const key of Object.keys(segment.salary)) segment.salary[key] = segment.salary[key].replace(/\.00$/, '')
  assert.deepEqual(expectStatus(await preview(fixture, reordered), 200), first)
})

test('Input facts API: shared SQL locking waits for a real concurrent version write and never mixes old revision with new settings', async () => {
  const fixture = await factsFixture(), eventBefore = await events(fixture.policyId)
  const runner = ds.createQueryRunner()
  let pending, committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const lock = await runner.query(`DECLARE @result int;
      EXEC @result=sys.sp_getapplock @Resource=@0, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${fixture.policyId}`])
    assert.ok(lock[0].lockResult >= 0)
    await runner.query('UPDATE payroll_policy_versions SET dailyHours=18, revision=revision+1 WHERE id=@0', [fixture.versionId])
    pending = request(admin, 'POST', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/inputs/preview`,
      { expectedRevision: 1, facts: facts() })
    const deadline = Date.now() + 6000
    let waiters = []
    while (Date.now() < deadline) {
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
        WHERE database_id=DB_ID(@testDatabase) AND blocking_session_id=@blocker AND wait_type LIKE 'LCK%'`)
      waiters = result.recordset
      if (waiters.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiters.length, 'Expected a real SQL shared-lock waiter behind the version mutation')
    process.stdout.write(`# Input facts SQL shared lock waiters: ${JSON.stringify(waiters)}\n`)
    await runner.commitTransaction(); committed = true
    expectStatus(await pending, 409)
    const result = await previewResult({ ...fixture, revision: 2 })
    expectExact(result.rates.minuteRate, '5', '18')
    assert.deepEqual(await events(fixture.policyId), eventBefore)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    if (pending) await Promise.allSettled([pending])
    await runner.release()
  }
})

function completeCycleFacts(from, to) {
  return facts({ periodStart: from, periodEnd: to, coverageStart: from, coverageEnd: to,
    salarySegments: [{ from, to, sourceRef: 'salary:complete-configured-cycle', salary: salary() }],
    scheduledWorkDates: from === to ? [from] : [from, to] })
}

test('Input facts API: arbitrary single-day or shifted ranges cannot become full salary cycles under calendar or first-day derived settings', async () => {
  for (const settings of [{}, { defaultPeriodType: 'CALENDAR_MONTH' }]) {
    const fixture = await factsFixture(settings)
    for (const [from, to] of [['2026-06-10', '2026-06-10'], ['2026-06-01', '2026-06-29'],
      ['2026-06-02', '2026-06-30'], ['2026-06-10', '2026-07-09']]) {
      const error = expectStatus(await preview(fixture, completeCycleFacts(from, to)), 400)
      assert.equal(error.code, 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
    }
    expectExact((await previewResult(fixture, completeCycleFacts('2026-06-01', '2026-06-30'))).earnedCalendar30.grossSalary, '9000')
  }
})

test('Input facts API: configured twenty-three-to-twenty-two cycle is a full monthly entitlement with explicit derived boundaries', async () => {
  const fixture = await factsFixture({ cycleStartDay: 23 })
  const result = await previewResult(fixture, completeCycleFacts('2026-07-23', '2026-08-22'))
  assert.equal(result.coverage.periodDays, 31)
  assert.equal(result.coverage.fullCoverage, true)
  expectExact(result.earnedCalendar30.grossSalary, '9000')
  expectExact(result.coverage.earnedCalendar30Factor, '1')
  assert.equal(result.settingsUsed.cycleStartDay, 23)
  assert.equal(result.settingsUsed.cycleEndMode, 'DERIVED')
  const error = expectStatus(await preview(fixture, completeCycleFacts('2026-07-23', '2026-08-21')), 400)
  assert.equal(error.code, 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('Input facts API: a short fifth-to-twentieth cycle earns a full month only when that entire short cycle is configured', async () => {
  const fixture = await factsFixture({ cycleStartDay: 5, cycleEndMode: 'FIXED_DAY', cycleEndDay: 20 })
  const result = await previewResult(fixture, completeCycleFacts('2026-06-05', '2026-06-20'))
  assert.equal(result.coverage.periodDays, 16)
  assert.equal(result.coverage.fullCoverage, true)
  expectExact(result.earnedCalendar30.grossSalary, '9000')
  expectExact(result.coverage.earnedCalendar30Factor, '1')
  const error = expectStatus(await preview(fixture, completeCycleFacts('2026-06-05', '2026-06-19')), 400)
  assert.equal(error.code, 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})

test('Input facts API: inclusive32day cycle accepts32scheduled dates with one monthly salary only', async () => {
  const fixture = await factsFixture({ cycleStartDay: 5, cycleEndMode: 'FIXED_DAY', cycleEndDay: 5 })
  const dates = Array.from({ length: 32 }, (_, index) => new Date(Date.UTC(2026, 6, index + 5)).toISOString().slice(0, 10))
  const input = completeCycleFacts('2026-07-05', '2026-08-05')
  input.scheduledWorkDates = dates
  const result = await previewResult(fixture, input)
  assert.equal(result.coverage.periodDays, 32)
  assert.equal(result.coverage.coveredDays, 32)
  assert.equal(result.coverage.periodScheduledDays, 32)
  assert.equal(result.segments.length, 1)
  expectExact(result.earnedCalendar30.grossSalary, '9000')
  expectExact(result.coverage.earnedCalendar30Factor, '1')
  expectExact(result.segments[0].calendarWeight, '1')
  const error = expectStatus(await preview(fixture, completeCycleFacts('2026-07-05', '2026-07-05')), 400)
  assert.equal(error.code, 'INPUT_FACTS_PERIOD_CYCLE_MISMATCH')
})
