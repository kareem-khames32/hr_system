// اختبارات معاينة شرائح التأخير بقاعدة SQL عشوائية وAppModule وJWT حقيقيين دون كتابة أي نتائج مالية.
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
const database = `hr_payroll_tier_preview_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-tier-preview-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter
const definitionTables = ['payroll_policy_components', 'payroll_policy_parameters', 'payroll_tier_sets', 'payroll_policy_tiers']
const definitionEntities = ['PayrollPolicyComponent', 'PayrollPolicyParameter', 'PayrollTierSet', 'PayrollPolicyTier']
function component(code, extra = {}) {
  return { code, nameAr: `بند ${code}`, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FIXED',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: '100.00', fieldPath: null,
    missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
    formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
    maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
    deductionPriority: null, carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true,
    isActive: true, ...extra }
}
function netComponent() {
  return component('NET', { componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', amount: null, exemptible: false })
}
function tier(sequence, fromValue, toValue, extra = {}) {
  return { sequence, fromValue, toValue, method: 'RATE_1_1', multiplier: null, dayFraction: null,
    fixedAmount: null, formula: null, label: `شريحة ${sequence}`, isActive: true, ...extra }
}
function tierSet(code = 'LATE_SET', extra = {}) {
  return { code, nameAr: 'طقم تأخير الاختبار', description: 'شرائح صريحة بدون أثر مالي', inputVar: 'LATE_MINUTES', inputFormula: null,
    inputUnit: 'MINUTES', applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: 'NONE', graceMinutes: 0,
    graceMaxUsesPerPeriod: null, allowGraceOnFlexibleShift: false, allowShiftGraceOverride: false,
    noMatchBehavior: 'NO_DEDUCTION', maxDailyDeductionDayFraction: '1.0000', maxPeriodDeductionDayFraction: null,
    secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1, roundingMode: null, roundingScale: null,
    isActive: true, tiers: [tier(10, '0', '60'), tier(20, '60', null, { method: 'MULTIPLIER', multiplier: '1.500' })], ...extra }
}
function wholeDefinition() {
  return { parameters: [{ code: 'FACTOR', nameAr: 'معامل صريح', value: '1.250000', unit: 'SCALAR', isActive: true }],
    tierSets: [tierSet()], components: [
      component('FIXED_PAY', { sequence: 1 }),
      component('HOUSING_PAY', { sequence: 2, valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO' }),
      component('PERCENT_PAY', { sequence: 3, valueSource: 'PERCENT_OF', amount: null, percent: '12.3456', baseCode: 'COMP[FIXED_PAY]' }),
      component('OT_PAY', { stage: 2, sequence: 1, valueSource: 'SYSTEM_VAR', amount: null, varCode: 'OT_AMOUNT' }),
      component('FORMULA_PAY', { stage: 2, sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[PERCENT_PAY] * PARAM[FACTOR]',
        conditionFormula: 'BASE_SALARY >= 0', minAmount: '0.29', maxAmount: '1234.56', capPctOfBase: '20.1234', capBaseCode: 'GROSS_SALARY',
        roundingMode: 'HALF_EVEN', roundingScale: 4 }),
      component('EXTERNAL_PAY', { stage: 2, sequence: 3, valueSource: 'EXTERNAL', amount: null }),
      component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, sequence: 1, valueSource: 'TIERED', amount: null, tierSetCode: 'LATE_SET', deductionPriority: 1, carryOverEligible: true }),
      component('LEDGER_DED', { componentType: 'DEDUCTION', stage: 5, sequence: 1, valueSource: 'LEDGER', amount: null,
        ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', deductionPriority: 2 }),
      netComponent(),
    ] }
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, canonical(child)]))
  if (typeof value === 'string' && /^-?\d+\.\d+$/.test(value)) return value.replace(/0+$/, '').replace(/\.$/, '')
  return value
}

function assertDisposable() {
  assert.match(database, /^hr_payroll_tier_preview_test_[a-f0-9]{16}$/)
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
function definitionRoute(policyId, versionId) { return `${endpoint}/${policyId}/versions/${versionId}/definition` }
async function readDefinition(policyId, versionId, actor = admin) {
  return request(actor, 'GET', definitionRoute(policyId, versionId))
}
async function validateDefinition(policyId, versionId, definition, extra = {}, actor = admin) {
  return request(actor, 'POST', `${definitionRoute(policyId, versionId)}/validate`, { definition, ...extra })
}
async function saveDefinition(policyId, versionId, definition, extra = {}, actor = admin) {
  return request(actor, 'PATCH', definitionRoute(policyId, versionId), { expectedRevision: 1,
    reason: 'حفظ تعريف سياسة اختبار كامل', definition, ...extra })
}
async function saveValid(policyId, versionId, definition, extra = {}, actor = admin) {
  const before = await policySnapshot()
  const preview = expectStatus(await validateDefinition(policyId, versionId, definition, { autoOrder: extra.autoOrder ?? false }, actor), 200)
  assert.equal(preview.valid, true)
  assert.ok(Array.isArray(preview.requiredAcknowledgements))
  assert.deepEqual(await policySnapshot(), before, 'Validation wrote definition rows')
  return expectStatus(await saveDefinition(policyId, versionId, definition, { ...extra,
    acknowledgedWarnings: preview.requiredAcknowledgements }, actor), 200)
}
async function populated(definition = wholeDefinition(), actor = admin) {
  const initial = await create({}, actor)
  return saveValid(initial.policy.id, initial.versions[0].id, definition, {}, actor)
}
async function sourceSnapshot(versionId) {
  const result = { version: plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })) }
  for (const table of definitionTables) result[table] = await rawRows(table, versionId)
  return result
}
function referenceSet(extra = {}) {
  return tierSet('LATE_SET', { maxDailyDeductionDayFraction: extra.applicationBasis && extra.applicationBasis !== 'PER_DAY' ? null : '1.0000', tiers: [
    tier(10, '60', '120', { method: 'MULTIPLIER', multiplier: '1.500' }),
    tier(20, '120', null, { method: 'MULTIPLIER', multiplier: '2.000' }),
  ], ...extra })
}
function referenceDefinition(set = referenceSet()) {
  return { parameters: [{ code: 'FACTOR', nameAr: 'معامل محفوظ', value: '1.250000', unit: 'SCALAR', isActive: true }],
    tierSets: [set], components: [
      component('FIXED_PAY'),
      component('LATE_DED', { componentType: 'DEDUCTION', stage: 3, valueSource: 'TIERED', amount: null,
        tierSetCode: set.code, deductionPriority: 1 }),
      netComponent(),
    ] }
}
async function previewFixture(set = referenceSet(), settings = {}, actor = admin, policyExtra = {}) {
  const initial = await create({ settings: { dailyHours: 9, roundingMode: 'HALF_UP', roundingScale: 2,
    rateBase: 'GROSS', lateDeductionEnabled: true, skipAttendance: false, ...settings }, ...policyExtra }, actor)
  return saveValid(initial.policy.id, initial.versions[0].id, referenceDefinition(set), {}, actor)
}
function day(minutes = 90, date = '2026-07-01', extra = {}) {
  return { date, sourceRef: null, rawLateSeconds: String(minutes * 60), excusedLateSeconds: '0',
    flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null, ...extra }
}
function previewBody(fixture, extra = {}) {
  return { expectedRevision: fixture.revision, tierSetCode: 'LATE_SET', periodStart: '2026-07-01', periodEnd: '2026-07-31',
    basicSalary: '16200', grossSalary: '16200', days: [day()], inputs: { variables: {}, components: {} }, ...extra }
}
async function preview(fixture, extra = {}, actor = admin) {
  const before = await policySnapshot()
  const result = await request(actor, 'POST', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/tiers/preview`, previewBody(fixture, extra))
  assert.deepEqual(await policySnapshot(), before, 'Tier preview changed a policy, definition, version or audit event')
  return result
}
async function previewResult(fixture, extra = {}, actor = admin) {
  const response = expectStatus(await preview(fixture, extra, actor), 200)
  assert.equal(response.policyId, fixture.policyId)
  assert.equal(response.versionId, fixture.versionId)
  assert.equal(response.revision, fixture.revision)
  assert.equal(response.contractVersion, 'SRS_V1')
  assert.equal(response.catalogVersion, 'SRS_V1_20260913')
  assert.equal(response.previewOnly, true)
  assert.equal(response.source, 'EXPLICIT_INPUTS')
  assert.match(response.snapshotHash, /^[a-f0-9]{64}$/)
  assert.ok(response.engineVersion)
  assert.ok(response.tierEngineVersion)
  const result = response.result
  assert.ok(Array.isArray(result.lines))
  assert.ok(Array.isArray(result.days))
  assert.ok(Array.isArray(result.warnings))
  const units = value => BigInt(value.replace('.', ''))
  assert.equal(result.lines.reduce((sum, line) => sum + units(line.amount), 0n), units(result.total), 'Displayed lines must add exactly to total')
  return result
}
function rateSet(extra = {}) { return referenceSet({ tiers: [tier(10, '0', null)], ...extra }) }
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment', 'LatenessTier',
    'AttendanceDay', 'AttendancePunch', 'AttendanceExemption', 'AttendanceExemptionEvent', 'PayrollPeriodClaim',
    'Request', 'RequestApproval', 'AttendanceCorrection', 'LeaveBalance']) {
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
    assert.match(path.basename(uploads), /^hr-payroll-tier-preview-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('LT preview API: genuine JWT and branch guards permit read-only global and archived previews without broadening wildcard scope', async () => {
  const own = await previewFixture(referenceSet(), {}, managerA)
  const global = await previewFixture()
  expectStatus(await preview(own, {}, null), 401)
  expectStatus(await preview(own, {}, viewerA), 403)
  expectStatus(await preview(own, {}, noPermission), 403)
  expectStatus(await preview(own, {}, managerA), 200)
  expectStatus(await preview(own, {}, starA), 200)
  expectStatus(await preview(global, {}, managerA), 200)
  expectStatus(await preview(global, {}, starA), 200)
  for (const actor of [managerB, unassigned]) {
    const denied = expectStatus(await preview(own, {}, actor), 403)
    assert.equal(denied.days, undefined)
    assert.equal(denied.lines, undefined)
    assert.equal(denied.definition, undefined)
  }
  expectStatus(await request(admin, 'POST', `${endpoint}/${global.policyId}/archive`, { expectedRevision: 1, reason: 'اختبار قراءة المعاينة للتاريخ' }), 201)
  expectStatus(await preview(global, {}, managerA), 200)
  const wrong = { ...own, versionId: global.versionId }
  expectStatus(await preview(wrong), 404)
})

test('LT preview API: every explicit body field is required and forged settings, definitions, parameters or server fields reject', async () => {
  const fixture = await previewFixture()
  const body = previewBody(fixture)
  for (const field of Object.keys(body)) expectStatus(await preview(fixture, { [field]: undefined }), 400)
  for (const field of Object.keys(body.days[0])) {
    const changed = plain(body.days); delete changed[0][field]
    expectStatus(await preview(fixture, { days: changed }), 400)
  }
  for (const extra of [
    { settings: { monthlyDays: 20 } }, { definition: referenceDefinition() }, { parameters: { FACTOR: '99' } },
    { status: 'ACTIVE' }, { engineVersion: 'CUSTOM' }, { policyId: fixture.policyId },
    { acknowledgedWarnings: [] }, { employeeId: employeeA.id }, { total: '0' }, { expectedRevision: '2' },
    { inputs: { variables: {}, components: {}, parameters: {} } },
    { days: [{ ...day(), graceUsed: true }] }, { days: [{ ...day(), employeeId: employeeA.id }] },
  ]) expectStatus(await preview(fixture, extra), 400)
})

test('LT preview API: invalid ranges, duplicate or out-of-range days and malformed exact inputs reject without writes', async () => {
  const fixture = await previewFixture()
  const invalid = [
    { periodStart: '2026-02-30' }, { periodEnd: '2026-02-30' },
    { periodStart: '2026-08-01', periodEnd: '2026-07-31' },
    { periodStart: '2026-7-01' }, { periodStart: '2026-07-01T00:00:00Z' },
    { days: [day(90, '2026-02-30')] }, { days: [day(90, '2026-06-30')] }, { days: [day(), day()] },
    { days: Array.from({ length: 367 }, (_, index) => day(1, new Date(Date.UTC(2024, 0, index + 1)).toISOString().slice(0, 10))), periodStart: '2024-01-01', periodEnd: '2025-01-01' },
    { basicSalary: -1 }, { grossSalary: 16200 }, { basicSalary: '-1' }, { grossSalary: 'NaN' },
    { basicSalary: 'Infinity' }, { grossSalary: '' }, { basicSalary: '1e4' }, { grossSalary: null },
    { days: [day(90, undefined, { rawLateSeconds: '-1' })] },
    { days: [day(90, undefined, { rawLateSeconds: 5400 })] },
    { days: [day(90, undefined, { excusedLateSeconds: '-1' })] },
    { days: [day(90, undefined, { excusedLateSeconds: 'Infinity' })] },
    { days: [day(90, undefined, { shiftGraceMinutes: -1 })] },
    { days: [day(90, undefined, { shiftGraceMinutes: 1441 })] },
    { days: [day(90, undefined, { shiftGraceMinutes: 1.5 })] },
    { days: [day(90, undefined, { flexibleStartEnabled: 'false' })] },
    { days: [day(90, undefined, { attendanceExempt: 'true' })] },
    { days: [day(90, undefined, { sourceRef: 'x'.repeat(121) })] },
    { basicSalary: '16200.001' }, { grossSalary: '10000000000000000' },
    { basicSalary: '16200.01', grossSalary: '16200' },
  ]
  for (const extra of invalid) expectStatus(await preview(fixture, extra), 400)
})

test('LT preview API: derived prices, attendance and unknown input maps cannot be overridden even when unused', async () => {
  const fixture = await previewFixture()
  for (const code of ['BASE_SALARY', 'GROSS_SALARY', 'DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE',
    'BASE_DAYS_BASIS', 'STANDARD_DAY_HOURS', 'PERIOD_DAYS',
    'LATE_MINUTES', 'LATE_INCIDENTS', 'IS_ATTENDANCE_EXEMPT', 'NOT_A_VARIABLE']) {
    expectStatus(await preview(fixture, { inputs: { variables: { [code]: '1' }, components: {} } }), 400)
  }
  for (const inputs of [
    { variables: {}, components: { UNKNOWN: '1' } }, { variables: { OT_AMOUNT: 1 }, components: {} },
    { variables: {}, components: { NET: '1' } },
    { variables: { OT_AMOUNT: [] }, components: {} }, { variables: { OT_AMOUNT: {} }, components: {} },
    { variables: { OT_AMOUNT: true }, components: {} },
    { variables: [], components: {} }, { variables: {}, components: [] },
    JSON.parse('{"variables":{"__proto__":"1"},"components":{}}'),
    JSON.parse('{"variables":{"constructor":"1"},"components":{}}'),
    JSON.parse('{"variables":{},"components":{"prototype":"1"}}'),
  ]) expectStatus(await preview(fixture, { inputs }), 400)
})

test('LT preview API: a stale revision is rejected after metadata changes and cannot reinterpret an earlier snapshot', async () => {
  const fixture = await previewFixture()
  expectStatus(await preview(fixture, { expectedRevision: 1 }), 409)
  const changed = expectStatus(await request(admin, 'PATCH', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}`,
    { expectedRevision: 2, reason: 'تحديث وصف النسخة قبل المعاينة', metadata: { notes: 'مراجعة جديدة' } }), 200)
  assert.equal(changed.version.revision, 3)
  expectStatus(await preview(fixture), 409)
  expectStatus(await preview({ ...fixture, revision: 3 }), 200)
})

test('LT preview API: missing or corrupt historical settings, catalog, engine, definition and acknowledgements block explicit preview', async () => {
  const missing = await create({ settings: { dailyHours: 9 } })
  expectStatus(await preview({ policyId: missing.policy.id, versionId: missing.versions[0].id, revision: 1 }), 409)
  for (const mutation of [
    { monthlyDays: null }, { monthlyDays: 29 }, { dailyHours: null },
    { contractVersion: 'LEGACY_V1' }, { catalogVersion: null }, { catalogVersion: 'FUTURE' },
    { engineVersion: null }, { engineVersion: 'FUTURE' }, { definitionWarningAcknowledgements: [] },
  ]) {
    const fixture = await previewFixture()
    await repo('PayrollPolicyVersion').update(fixture.versionId, mutation)
    expectStatus(await preview(fixture), 409)
  }
  const corrupt = await previewFixture()
  await ds.query('DELETE FROM payroll_policy_components WHERE versionId=@0 AND code=@1', [corrupt.versionId, 'NET'])
  expectStatus(await preview(corrupt), 409)
})

test('LT preview API: unsupported input families and input formulas are explicit conflicts rather than guessed providers', async () => {
  for (const set of [referenceSet({ inputVar: 'SHORT_MINUTES' }),
    referenceSet({ inputVar: null, inputFormula: 'LATE_MINUTES' })]) {
    const fixture = await previewFixture(set)
    expectStatus(await preview(fixture), 409)
  }
  const fixture = await previewFixture()
  expectStatus(await preview(fixture, { tierSetCode: 'MISSING' }), 409)
  await repo('PayrollTierSet').update({ versionId: fixture.versionId }, { isActive: false })
  expectStatus(await preview(fixture), 409)
})

test('LT-02/03 preview API: every numeric SRS boundary agrees for multiplier, day fraction and one-to-one patterns', async () => {
  const minutes = [59, 60, 61, 90, 119, 120, 150, 240]
  const definitions = [
    [referenceSet(), ['0.00', '90.00', '91.50', '135.00', '178.50', '240.00', '300.00', '480.00']],
    [referenceSet({ tiers: [tier(10, '60', '120', { method: 'DAY_FRACTION', dayFraction: '0.2500' }),
      tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.5000' })] }),
      ['0.00', '135.00', '135.00', '135.00', '135.00', '270.00', '270.00', '270.00']],
    [referenceSet({ tiers: [tier(10, '60', '120'), tier(20, '120', null)] }),
      ['0.00', '60.00', '61.00', '90.00', '119.00', '120.00', '150.00', '240.00']],
  ]
  for (const [set, expected] of definitions) {
    const fixture = await previewFixture(set)
    for (let index = 0; index < minutes.length; index++) {
      const result = await previewResult(fixture, { days: [day(minutes[index])] })
      assert.equal(result.total, expected[index], `${set.tiers[0].method} at ${minutes[index]}`)
      assert.equal(result.lines[0].inputValue, String(minutes[index]))
      assert.equal(result.days[0].roundedMinutes, String(minutes[index]))
      assert.equal(result.applicationBasis, 'PER_DAY')
      assert.equal(result.inputUnit, 'MINUTES')
      assert.deepEqual(canonical({ dayRate: result.rates.dayRate, hourRate: result.rates.hourRate, minuteRate: result.rates.minuteRate }),
        { dayRate: '540', hourRate: '60', minuteRate: '1' })
      if (minutes[index] >= 60) assert.ok(result.lines[0].portions.length)
    }
  }
})

test('LT-08 preview API: marginal rate portions remove the cliff while reached fixed and day fractions apply in full at the boundary', async () => {
  const marginal = await previewFixture(referenceSet({ tierApplicationMode: 'MARGINAL' }))
  for (const [minutes, expected] of [[90, '45.00'], [119, '88.50'], [120, '90.00'], [150, '150.00']]) {
    assert.equal((await previewResult(marginal, { days: [day(minutes)] })).total, expected)
  }
  const fixed = await previewFixture(referenceSet({ tierApplicationMode: 'MARGINAL', tiers: [
    tier(10, '60', '120', { method: 'FIXED_AMOUNT', fixedAmount: '100.00' }),
    tier(20, '120', null, { method: 'FIXED_AMOUNT', fixedAmount: '200.00' }),
  ] }))
  for (const [minutes, expected] of [[0, '0.00'], [59, '0.00'], [60, '100.00'], [119, '100.00'], [120, '300.00'], [150, '300.00']]) {
    assert.equal((await previewResult(fixed, { days: [day(minutes)] })).total, expected)
  }
  const fractions = await previewFixture(referenceSet({ tierApplicationMode: 'MARGINAL', tiers: [
    tier(10, '60', '120', { method: 'DAY_FRACTION', dayFraction: '0.2500' }),
    tier(20, '120', null, { method: 'DAY_FRACTION', dayFraction: '0.5000' }),
  ] }))
  assert.equal((await previewResult(fractions, { days: [day(120)] })).total, '405.00')
})

test('LT-05 preview API: subtract and all-or-nothing grace differ and excused seconds are removed once before grace', async () => {
  const subtract = await previewFixture(referenceSet({ graceMode: 'SUBTRACT', graceMinutes: 15 }))
  const waive = await previewFixture(referenceSet({ graceMode: 'WAIVE_ALL_OR_NOTHING', graceMinutes: 15 }))
  assert.equal((await previewResult(subtract, { days: [day(70)] })).total, '0.00')
  assert.equal((await previewResult(waive, { days: [day(70)] })).total, '105.00')
  for (const fixture of [subtract, waive]) {
    assert.equal((await previewResult(fixture, { days: [day(15)] })).total, '0.00')
  }
  const permitted = await previewResult(subtract, { days: [day(100, undefined, { excusedLateSeconds: '1200' })] })
  assert.equal(permitted.days[0].unexcusedMinutes, '80')
  assert.equal(permitted.days[0].effectiveMinutes, '65')
  assert.equal(permitted.total, '97.50')
  assert.equal(permitted.days[0].grace.appliedMinutes, '15')
  const overExcused = await previewResult(subtract, { days: [day(10, undefined, { excusedLateSeconds: '1200' })] })
  assert.equal(overExcused.total, '0.00')
  assert.equal(overExcused.graceUses, 0)
})

test('LT-05 preview API: flexible days receive no extra grace by default and shift overrides require the persisted flag', async () => {
  const set = referenceSet({ graceMode: 'SUBTRACT', graceMinutes: 15 })
  const blocked = await previewFixture(set)
  const allowed = await previewFixture({ ...set, allowGraceOnFlexibleShift: true })
  const flexible = [day(70, undefined, { flexibleStartEnabled: true })]
  const result = await previewResult(blocked, { days: flexible })
  assert.equal(result.total, '105.00')
  assert.equal(result.graceUses, 0)
  assert.ok(result.days[0].grace.reason)
  assert.equal((await previewResult(allowed, { days: flexible })).total, '0.00')
  const policyOnly = await previewFixture(referenceSet({ graceMode: 'SUBTRACT', graceMinutes: 5 }))
  const shiftOverride = await previewFixture(referenceSet({ graceMode: 'SUBTRACT', graceMinutes: 5, allowShiftGraceOverride: true }))
  const shifted = [day(70, undefined, { shiftGraceMinutes: 20 })]
  assert.equal((await previewResult(policyOnly, { days: shifted })).total, '97.50')
  const fromShift = await previewResult(shiftOverride, { days: shifted })
  assert.equal(fromShift.total, '0.00')
  assert.equal(fromShift.days[0].grace.source, 'SHIFT')
})

test('LT-05 preview API: grace counts actual benefit in chronological order and exempt days consume no use', async () => {
  const fixture = await previewFixture(rateSet({ graceMode: 'SUBTRACT', graceMinutes: 15, graceMaxUsesPerPeriod: 1 }))
  const result = await previewResult(fixture, { days: [day(12, '2026-07-03'),
    day(12, '2026-07-01', { attendanceExempt: true }), day(12, '2026-07-02')] })
  assert.deepEqual(result.days.map(row => row.date), ['2026-07-01', '2026-07-02', '2026-07-03'])
  assert.equal(result.total, '12.00')
  assert.equal(result.graceUses, 1)
  assert.ok(result.days[0].skippedReason)
  assert.equal(result.days[0].grace.consumed, false)
  assert.equal(result.days[1].grace.consumed, true)
  assert.equal(result.days[2].grace.consumed, false)
  assert.equal(result.days[2].grace.remaining, 0)
})

test('LT-06 preview API: daily and accumulated amounts follow all SRS reference examples and count basis uses actual incidents', async () => {
  const daily = await previewFixture()
  const period = await previewFixture(referenceSet({ applicationBasis: 'PERIOD_ACCUMULATED' }))
  const days = [20, 25, 30, 15, 40].map((minutes, index) => day(minutes, `2026-07-0${index + 1}`))
  assert.equal((await previewResult(daily, { days })).total, '0.00')
  const accumulated = await previewResult(period, { days })
  assert.equal(accumulated.total, '260.00')
  assert.equal(accumulated.lines.length, 1)
  assert.equal(accumulated.lines[0].date, null)
  assert.equal(accumulated.lines[0].inputValue, '130')
  const twice = [day(90), day(90, '2026-07-02')]
  assert.equal((await previewResult(daily, { days: twice })).total, '270.00')
  assert.equal((await previewResult(period, { days: twice })).total, '360.00')
  const count = await previewFixture(referenceSet({ applicationBasis: 'OCCURRENCE_COUNT', inputVar: 'LATE_INCIDENTS', inputUnit: 'COUNT',
    tiers: [tier(10, '1', '2', { method: 'FIXED_AMOUNT', fixedAmount: '100.00' }),
      tier(20, '2', null, { method: 'FIXED_AMOUNT', fixedAmount: '200.00' })] }))
  const counted = await previewResult(count, { days: [day(1), day(0, '2026-07-02'), day(9, '2026-07-03'),
    day(12, '2026-07-04', { attendanceExempt: true })] })
  assert.equal(counted.inputUnit, 'COUNT')
  assert.equal(counted.lines[0].inputValue, '2')
  assert.equal(counted.total, '200.00')
})

test('LT-04 preview API: daily cap and oldest-first period budget show reductions while accumulated basis has no daily cap', async () => {
  const daily = await previewFixture()
  const capped = await previewResult(daily, { days: [day(400)] })
  assert.equal(capped.lines[0].rawAmount, '800.000000')
  assert.equal(capped.lines[0].afterDailyCap, '540.00')
  assert.equal(capped.lines[0].dailyCapReduction, '260.000000')
  assert.equal(capped.total, '540.00')
  const period = await previewFixture(referenceSet({ maxPeriodDeductionDayFraction: '0.5000' }))
  const budget = await previewResult(period, { days: [day(150, '2026-07-02'), day(150)] })
  assert.equal(budget.totalBeforePeriodCap, '600.00')
  assert.equal(budget.total, '270.00')
  assert.equal(budget.periodCap, '270.00')
  assert.equal(budget.periodCapReduction, '330.00')
  assert.deepEqual(budget.lines.map(row => row.amount), ['270.00', '0.00'])
  assert.deepEqual(budget.lines.map(row => row.periodCapReduction), ['30.00', '300.00'])
  const aggregate = await previewFixture(referenceSet({ applicationBasis: 'PERIOD_ACCUMULATED' }))
  assert.equal((await previewResult(aggregate, { days: [day(400)] })).total, '800.00')
})

test('LT-09 preview API: second and minute-unit rounding remain explicit and do not round intermediate wage rates', async () => {
  for (const [mode, expected] of [['FLOOR', '1.00'], ['CEIL', '2.00'], ['NEAREST', '2.00']]) {
    const fixture = await previewFixture(rateSet({ secondsRoundingMode: mode }))
    assert.equal((await previewResult(fixture, { days: [day(0, undefined, { rawLateSeconds: '90' })] })).total, expected)
  }
  for (const [mode, expected] of [['FLOOR', '60.00'], ['CEIL', '75.00']]) {
    const fixture = await previewFixture(rateSet({ minutesRoundingMode: mode, roundingUnitMinutes: 15 }))
    assert.equal((await previewResult(fixture, { days: [day(61)] })).total, expected)
  }
  const fixture = await previewFixture()
  const precise = await previewResult(fixture, { basicSalary: '9000', grossSalary: '9000' })
  assert.equal(precise.rates.minuteRate, '0.555556')
  assert.equal(precise.total, '75.00')
  assert.equal(BigInt(precise.rates.minuteRateExact.numerator) * 9n, BigInt(precise.rates.minuteRateExact.denominator) * 5n)
})

test('LT preview API: exemption, skipped attendance and disabled lateness produce explained zeros without grace consumption', async () => {
  for (const settings of [{ skipAttendance: true }, { lateDeductionEnabled: false }, {}]) {
    const fixture = await previewFixture(referenceSet({ graceMode: 'SUBTRACT', graceMinutes: 15 }), settings)
    const extra = Object.keys(settings).length ? {} : { days: [day(90, undefined, { attendanceExempt: true })] }
    const result = await previewResult(fixture, extra)
    assert.equal(result.total, '0.00')
    assert.equal(result.graceUses, 0)
    assert.ok(result.days[0].skippedReason)
    assert.ok(result.lines[0].skippedReason)
    assert.equal(result.days[0].grace.consumed, false)
  }
})

test('LT preview API: formulas use persisted parameters and declared synthetic inputs, and unchanged requests are deterministic', async () => {
  const fixture = await previewFixture(referenceSet({ tiers: [tier(10, '0', null, {
    method: 'FORMULA', formula: 'LATE_MINUTES * MINUTE_RATE + PARAM[FACTOR] + COMP[FIXED_PAY] + OT_AMOUNT',
  })] }))
  const extra = { inputs: { variables: { OT_AMOUNT: '2.25' }, components: { FIXED_PAY: '1.5' } } }
  const first = expectStatus(await preview(fixture, extra), 200)
  assert.equal(first.result.total, '95.00')
  const second = expectStatus(await preview(fixture, extra), 200)
  assert.deepEqual(second, first)
  const signed = await previewResult(fixture, { inputs: { variables: { OT_AMOUNT: '-2.25' }, components: { FIXED_PAY: '-1.5' } } })
  assert.equal(signed.total, '87.50')
  const nulls = await previewResult(fixture, { inputs: { variables: { OT_AMOUNT: null }, components: { FIXED_PAY: null } } })
  assert.equal(nulls.total, '91.25')
  assert.ok(nulls.warnings.some(warning => warning.code === 'MISSING_INPUT'))
  const absent = await previewResult(fixture)
  assert.equal(absent.total, '91.25')
  assert.ok(absent.warnings.some(warning => warning.code === 'MISSING_INPUT'))
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.daily_hours' })
  try {
    await repo('RequestsConfig').update({ key: config.key }, { value: 'BROKEN_LIVE_CONFIG' })
    assert.deepEqual(expectStatus(await preview(fixture, extra), 200), first)
  } finally { await repo('RequestsConfig').update({ key: config.key }, { value: config.value }) }
})

test('LT-02/09 preview API: saved rate basis and monetary rounding override govern exact wages beyond Number precision', async () => {
  const basic = await previewFixture(referenceSet(), { rateBase: 'BASIC' })
  const gross = await previewFixture(referenceSet(), { rateBase: 'GROSS' })
  const salaries = { basicSalary: '9000', grossSalary: '16200' }
  assert.equal((await previewResult(basic, salaries)).total, '75.00')
  assert.equal((await previewResult(gross, salaries)).total, '135.00')
  const huge = await previewResult(gross, { basicSalary: '9007199254740991.91', grossSalary: '9007199254740991.91' })
  assert.equal(huge.total, '75059993789508.27')
  assert.equal(huge.rates.deductionBase, '9007199254740991.91')
  const fixed = referenceSet({ tiers: [tier(10, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '1.25' })] })
  const inherited = await previewFixture(fixed, { roundingMode: 'HALF_EVEN', roundingScale: 1 })
  const overridden = await previewFixture({ ...fixed, roundingMode: 'HALF_UP', roundingScale: 1 }, { roundingMode: 'HALF_EVEN', roundingScale: 1 })
  assert.equal((await previewResult(inherited)).total, '1.2')
  const rounded = await previewResult(overridden)
  assert.equal(rounded.total, '1.3')
  assert.deepEqual(rounded.rounding, { mode: 'HALF_UP', scale: 1 })
})

test('LT preview API: source references are opaque trace values and empty or zero days never charge fixed brackets', async () => {
  const fixture = await previewFixture(referenceSet({ tiers: [tier(10, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '100.00' })] }))
  const sourceRef = `employee:${employeeA.id}/payroll/opaque-reference`
  const result = await previewResult(fixture, { days: [day(1, undefined, { sourceRef })] })
  assert.equal(result.total, '100.00')
  assert.equal(result.days[0].sourceRef, sourceRef)
  assert.equal(result.lines[0].sourceRef, sourceRef)
  const zeroResult = await previewResult(fixture, { days: [day(0)] })
  assert.equal(zeroResult.total, '0.00')
  const empty = await previewResult(fixture, { days: [] })
  assert.equal(empty.total, '0.00')
  assert.deepEqual(empty.days, [])
  assert.deepEqual(empty.lines, [])
})
