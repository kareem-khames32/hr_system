// اختبارات معاينة الأقساط الصريحة وخيارات نقص المتاح والتأجيل بقاعدة SQL عشوائية دون احتساب أو كتابة مالية.
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
const database = `hr_payroll_installment_preview_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-installment-preview-files-'))
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
  assert.match(database, /^hr_payroll_installment_preview_test_[a-f0-9]{16}$/)
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
  const loan = await repo('Loan').save({ employeeId: employeeA.id, amount: 3000, status: 'DISBURSED', disbursedAt: new Date('2026-08-01T10:00:00Z') })
  await repo('LoanInstallment').save([
    { loanId: loan.id, dueDate: '2026-08-01', amount: 1000, paid: true },
    { loanId: loan.id, dueDate: '2026-09-01', amount: 1000, paid: false },
    { loanId: loan.id, dueDate: '2026-10-01', amount: 1000, paid: false },
  ])
  await repo('EmployeeObligation').save({ employeeId: employeeA.id, type: 'DEBIT', category: 'manual', amount: 123.45,
    label: 'قيد فعلي يجب ألا تستهلكه المعاينة', status: 'PENDING', effectiveDate: '2026-09-01', sourceRef: 'canary:obligation' })
  // لحاق الإقلاع الحقيقي مؤجل 30 ثانية؛ ننتظر إتمامه قبل تثبيت canary كي لا يُنسب أثره لمعاينة قراءة فقط.
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
  // استدراك الحضور له مؤقت مستقل بعد 60 ثانية؛ ننفذ الخدمة الحقيقية ونثبت إنجازها قبل المقارنة.
  await app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).catchUpIfBehind()
  const materialized = await repo('RequestsConfig').findOneByOrFail({ key: 'attendance.absences_materialized_through' })
  assert.match(materialized.value, /^\d{4}-\d{2}-\d{2}$/)
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
    assert.match(path.basename(uploads), /^hr-payroll-installment-preview-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

function ledgerComponent(code = 'LOAN', extra = {}) {
  return { code, nameAr: `قسط ${code}`, componentType: 'DEDUCTION', stage: 5, sequence: 1, valueSource: 'LEDGER',
    conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: null, fieldPath: null,
    missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
    formula: null, ledgerCategory: 'loan', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL', minAmount: null,
    maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
    deductionPriority: 1, carryOverEligible: true, rollupTo: null, exemptible: true, showOnPayslip: true,
    isActive: true, ...extra }
}
function netComponent() {
  return ledgerComponent('NET', { nameAr: 'الصافي النظامي المؤجل', componentType: 'INFO', stage: 6, valueSource: 'SYS_NET',
    ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, deductionPriority: null,
    carryOverEligible: false, exemptible: false })
}
function ledgerDefinition(components = [ledgerComponent()]) {
  return { parameters: [], tierSets: [], components: [...components, netComponent()] }
}
function definitionRoute(fixture) { return `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/definition` }
async function readDefinition(fixture, actor = admin) {
  return expectStatus(await request(actor, 'GET', definitionRoute(fixture)), 200)
}
async function saveDefinition(fixture, componentDefinition, extra = {}, actor = admin) {
  const preview = expectStatus(await request(actor, 'POST', `${definitionRoute(fixture)}/validate`, { definition: componentDefinition }), 200)
  assert.ok(Array.isArray(preview.requiredAcknowledgements))
  return expectStatus(await request(actor, 'PATCH', definitionRoute(fixture), { expectedRevision: fixture.revision,
    reason: 'تعريف أقساط محفوظ لاختبار المعاينة فقط', definition: componentDefinition,
    acknowledgedWarnings: preview.requiredAcknowledgements, ...extra }), 200)
}
async function fixture(settings = {}, components = [ledgerComponent()], actor = admin, extra = {}) {
  const created = await create({ effectiveFrom: '2026-09-01', settings: {
    defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    dailyHours: 9, monthlyDays: 30, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
    minNetGuarantee: 500, netFloorPct: null, maxDeductionPctOfGross: null, carryOverExcess: true,
    ...settings }, ...extra }, actor)
  const result = { policyId: created.policy.id, versionId: created.versions[0].id, revision: created.versions[0].revision }
  if (components !== null) await saveDefinition(result, ledgerDefinition(components), {}, actor)
  const read = await readDefinition(result, actor)
  return { ...result, revision: read.revision, definition: read.definition, settings: read.settings }
}
function installment(extra = {}) {
  return { componentCode: 'LOAN', category: 'loan', installmentRef: 'i1', loanRef: 'l1', sourceRef: 'preview:i1',
    sourceRevision: 1, sequence: 1, originalDuePeriod: '2026-09', duePeriod: '2026-09',
    remainingAmount: '1666.00', priority: 1, extensionPeriod: null, ...extra }
}
function body(extra = {}) {
  return { period: '2026-09', nextPeriod: '2026-10',
    budget: { netBeforeLoans: '900', earnedFixedGross: '900', capConsumed: '0',
      sourceRefs: { netBeforeLoans: 'preview:net', earnedFixedGross: 'preview:gross', capConsumed: 'preview:prior' } },
    installments: [installment()], manualDeferrals: [], ...extra }
}
function withBudget(extra) { return body({ budget: { ...body().budget, ...extra } }) }
async function preview(fixture, values = body(), actor = admin, wrapper = {}) {
  const before = { policy: await policySnapshot(), financial: await financialSnapshot() }
  const response = await request(actor, 'POST', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/installments/preview`,
    { expectedRevision: fixture.revision, ...values, ...wrapper })
  assert.deepEqual(await policySnapshot(), before.policy, 'Installment preview wrote policy, definition, revision or audit history')
  assert.deepEqual(await financialSnapshot(), before.financial, 'Installment preview changed a loan, installment, payroll, request or financial source')
  return response
}
async function result(fixture, values = body(), actor = admin) {
  const response = expectStatus(await preview(fixture, values, actor), 200)
  assert.equal(response.policyId, fixture.policyId)
  assert.equal(response.versionId, fixture.versionId)
  assert.equal(response.revision, fixture.revision)
  assert.equal(response.previewOnly, true)
  assert.equal(response.source, 'EXPLICIT_INPUTS')
  assert.equal(response.sourceValidation, 'CALLER_UNVERIFIED')
  assert.equal(response.installmentOptionsVersion, 'OWNER_INSTALLMENT_OPTIONS_V1_20260913')
  assert.ok(response.budgetVersion)
  assert.ok(response.allocationVersion)
  assert.match(response.snapshotHash, /^[a-f0-9]{64}$/)
  assert.ok(Array.isArray(response.result.policyChoices))
  assert.equal(response.result.netPay, undefined)
  return response
}
function assertMoney(value, expected) {
  assert.equal(value.rawValue6, `${expected.includes('.') ? expected : `${expected}.`}`.padEnd(expected.split('.')[0].length + 7, '0'))
  const [integer, decimal = ''] = expected.split('.')
  assert.equal(BigInt(value.exact.numerator) * 10n ** BigInt(decimal.length), BigInt(integer + decimal) * BigInt(value.exact.denominator))
}
function line(response, ref = 'i1') {
  const found = response.result.allocation.lines.find(value => value.installmentRef === ref)
  assert.ok(found, `No allocation trace for ${ref}: ${JSON.stringify(response.result.allocation)}`)
  return found
}
function deducted(response, expected) { assert.equal(response.result.allocation.totals.deductedAmount, expected) }

test('Installment preview API: real authentication and branch scope allow own, shared and archived previews without wildcard escalation', async () => {
  const own = await fixture({}, undefined, managerA), global = await fixture()
  expectStatus(await preview(own, body(), null), 401)
  for (const actor of [viewerA, noPermission, managerB, unassigned]) {
    const denied = expectStatus(await preview(own, body(), actor), 403)
    assert.equal(denied.result, undefined)
  }
  for (const actor of [managerA, starA]) {
    await result(own, body(), actor)
    await result(global, body(), actor)
  }
  expectStatus(await request(admin, 'POST', `${endpoint}/${global.policyId}/archive`, { expectedRevision: 1, reason: 'اختبار معاينة تاريخ سياسة مؤرشفة' }), 201)
  await result(global, body(), managerA)
  expectStatus(await preview({ ...own, versionId: global.versionId }), 404)
})

test('AD-12 preview: saved ALLOW_PARTIAL yields 400 deducted, 1266 carried and net 500 with no persistence', async () => {
  const f = await fixture(), response = await result(f)
  deducted(response, '400.00')
  assert.equal(line(response).outcome, 'PARTIAL')
  assert.equal(line(response).continuation.amount, '1266.00')
  assert.equal(line(response).continuation.duePeriod, '2026-10')
  assert.equal(line(response).continuation.parentInstallmentRef, 'i1')
  assert.ok(line(response).continuation.reason)
  assertMoney(response.result.netAfterInstallments, '500')
  assert.deepEqual(response.result.policyChoices, [{ componentCode: 'LOAN', storedValue: 'ALLOW_PARTIAL', insufficientMode: 'PARTIAL_THEN_CARRY' }])
})

test('AD-12 preview: saved BLOCK skips all 1666, extends after the existing loan schedule and pays the remaining salary 900', async () => {
  const f = await fixture({}, [ledgerComponent('LOAN', { ledgerPartialPayment: 'BLOCK' })])
  const values = body({ installments: [installment({ extensionPeriod: '2026-11' }),
    installment({ installmentRef: 'i2', sourceRef: 'preview:i2', sequence: 2, originalDuePeriod: '2026-10', duePeriod: '2026-10', extensionPeriod: '2026-11' })] })
  const response = await result(f, values)
  deducted(response, '0.00')
  assert.equal(line(response).outcome, 'SKIPPED_AND_EXTENDED')
  assert.equal(line(response).continuation.amount, '1666.00')
  assert.equal(line(response).continuation.duePeriod, '2026-11')
  assert.equal(line(response, 'i2').outcome, 'NOT_DUE')
  assertMoney(response.result.netAfterInstallments, '900')
  assert.deepEqual(response.result.policyChoices, [{ componentCode: 'LOAN', storedValue: 'BLOCK', insufficientMode: 'SKIP_AND_EXTEND' }])
})

test('AD-10 preview: an explicit documented deferral skips a payable installment even when net 5000 can cover it', async () => {
  const f = await fixture(), values = withBudget({ netBeforeLoans: '5000', earnedFixedGross: '5000' })
  values.manualDeferrals = [{ installmentRef: 'i1', toPeriod: '2026-10', sourceRef: 'decision:1', reason: 'تأجيل معتمد بطلب الموظف' }]
  const response = await result(f, values)
  deducted(response, '0.00')
  assert.equal(line(response).outcome, 'DEFERRED_MANUAL')
  assert.equal(line(response).continuation.amount, '1666.00')
  assert.equal(line(response).continuation.duePeriod, '2026-10')
  assertMoney(response.result.netAfterInstallments, '5000')
  assert.match(JSON.stringify(line(response)), /decision:1/)
  assert.match(JSON.stringify(line(response)), /تأجيل معتمد بطلب الموظف/)
})

test('Installment preview API: full and exact-capacity repayments do not create continuations under either saved mode', async () => {
  for (const mode of ['ALLOW_PARTIAL', 'BLOCK']) {
    const f = await fixture({}, [ledgerComponent('LOAN', { ledgerPartialPayment: mode })])
    for (const net of ['2166', '5000']) {
      const values = withBudget({ netBeforeLoans: net, earnedFixedGross: net })
      values.installments[0].extensionPeriod = mode === 'BLOCK' ? '2026-10' : null
      const response = await result(f, values)
      deducted(response, '1666.00')
      assert.equal(line(response).outcome, 'DEDUCTED')
      assert.equal(line(response).continuation, null)
      assertMoney(response.result.netAfterInstallments, net === '2166' ? '500' : '3334')
    }
  }
})

test('PL-06/DD-11 preview: stored cap percentage and explicit prior consumption jointly limit available funds', async () => {
  const f = await fixture({ maxDeductionPctOfGross: 50 })
  const response = await result(f, withBudget({ capConsumed: '175' }))
  deducted(response, '275.00')
  assert.equal(line(response).continuation.amount, '1391.00')
  assertMoney(response.result.netAfterInstallments, '625')
  const floor = await fixture({ minNetGuarantee: null, netFloorPct: 60 })
  const response2 = await result(floor)
  deducted(response2, '360.00')
  assertMoney(response2.result.netAfterInstallments, '540')
})

test('Installment preview API: zero capacity cannot deduct or invent a salary top-up when the previous net is below its floor', async () => {
  const f = await fixture()
  for (const net of ['500', '400', '0', '-50']) {
    const response = await result(f, withBudget({ netBeforeLoans: net }))
    deducted(response, '0.00')
    assert.equal(line(response).outcome, 'CARRIED_NO_CAPACITY')
    assert.equal(line(response).continuation.amount, '1666.00')
    assertMoney(response.result.netAfterInstallments, net)
  }
})

test('Installment preview API: two saved ledger components allocate a single budget in explicit priority order and stay deterministic', async () => {
  const f = await fixture({}, [ledgerComponent(), ledgerComponent('SECOND_LOAN', { sequence: 2, deductionPriority: 2 })])
  const values = body({ installments: [
    installment({ componentCode: 'SECOND_LOAN', installmentRef: 'i2', loanRef: 'l2', sourceRef: 'preview:i2', priority: 2, remainingAmount: '300.00' }),
    installment({ remainingAmount: '300.00' }),
  ] })
  const first = await result(f, values), second = await result(f, values)
  deducted(first, '400.00')
  assert.equal(line(first).outcome, 'DEDUCTED')
  assert.equal(line(first, 'i2').outcome, 'PARTIAL')
  assert.equal(line(first, 'i2').continuation.amount, '200.00')
  assert.deepEqual(second, first)
})

test('AD-11 preview: overdue entries remain eligible while future and closed entries cannot consume the budget', async () => {
  const f = await fixture(), response = await result(f, body({ installments: [
    installment({ originalDuePeriod: '2026-08', duePeriod: '2026-08', remainingAmount: '300.00' }),
    installment({ installmentRef: 'future', loanRef: 'l2', sourceRef: 'preview:future', originalDuePeriod: '2026-10', duePeriod: '2026-10' }),
    installment({ installmentRef: 'closed', loanRef: 'l3', sourceRef: 'preview:closed', remainingAmount: '0.00' }),
  ] }))
  deducted(response, '300.00')
  assert.equal(line(response).outcome, 'DEDUCTED')
  assert.equal(line(response, 'future').outcome, 'NOT_DUE')
  assert.equal(line(response, 'closed').outcome, 'CLOSED')
})

test('Installment preview API: exact decimal cents survive above Number safe precision without changing stored loan canaries', async () => {
  const f = await fixture({ minNetGuarantee: null }), values = withBudget({ netBeforeLoans: '9007199254740991.91', earnedFixedGross: '9007199254740991.91' })
  values.installments[0].remainingAmount = '9007199254740991.90'
  const response = await result(f, values)
  deducted(response, '9007199254740991.90')
  assertMoney(response.result.netAfterInstallments, '0.01')
  const sixtyDigits = '9'.repeat(60), huge = withBudget({ netBeforeLoans: sixtyDigits, earnedFixedGross: sixtyDigits })
  huge.installments[0].remainingAmount = '100.00'
  const largest = await result(f, huge)
  deducted(largest, '100.00')
  assertMoney(largest.result.netAfterInstallments, String(BigInt(sixtyDigits) - 100n))
})

test('Installment preview API: monetary strings reject coercion, scientific notation, invalid scale and installment overflow', async () => {
  const f = await fixture()
  for (const invalid of [1666, null, '', ' ', '-0.01', 'NaN', 'Infinity', '1e3', '1.001', '10000000000000000.00', {}, [], true]) {
    expectStatus(await preview(f, body({ installments: [installment({ remainingAmount: invalid })] })), 400)
  }
  for (const field of ['netBeforeLoans', 'earnedFixedGross', 'capConsumed']) {
    for (const invalid of [900, null, '', '9e2', '0.0000001', {}, true]) {
      expectStatus(await preview(f, withBudget({ [field]: invalid })), 400)
    }
  }
  expectStatus(await preview(f, withBudget({ earnedFixedGross: '-1' })), 400)
  expectStatus(await preview(f, withBudget({ capConsumed: '-1' })), 400)
})

test('Installment preview API: forged modes, policy settings, capacity and prototype keys cannot bypass the strict body contract', async () => {
  const f = await fixture()
  for (const extra of [{ insufficientMode: 'SKIP_AND_EXTEND' }, { currencyScale: 0 }, { availableBudget: '999999' },
    { settings: { minNetGuarantee: 0 } }, { definition: ledgerDefinition() }, { policyId: f.policyId }, { employeeId: employeeA.id },
    { previewOnly: false }, { sourceValidation: 'VERIFIED' }]) expectStatus(await preview(f, body(extra)), 400)
  for (const changed of [
    body({ installments: [installment({ insufficientMode: 'SKIP_AND_EXTEND' })] }),
    body({ installments: [installment({ paid: true })] }),
    withBudget({ availableBudget: '999999' }),
    withBudget({ sourceRefs: { ...body().budget.sourceRefs, payrollRunId: 1 } }),
  ]) expectStatus(await preview(f, changed), 400)
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const outer = JSON.parse(JSON.stringify(body()).replace('"period":', `"${key}":{},"period":`))
    const inner = JSON.parse(JSON.stringify(body()).replace('"componentCode":', `"${key}":{},"componentCode":`))
    expectStatus(await preview(f, outer), 400)
    expectStatus(await preview(f, inner), 400)
  }
})

test('Installment preview API: required fields, explicit revisions and normalized unique references are validated before allocation', async () => {
  const f = await fixture(), original = body()
  for (const key of Object.keys(original)) {
    const changed = plain(original); delete changed[key]
    expectStatus(await preview(f, changed), 400)
  }
  for (const key of Object.keys(original.installments[0])) {
    const changed = plain(original); delete changed.installments[0][key]
    expectStatus(await preview(f, changed), 400)
  }
  for (const invalid of [undefined, '2', 0, 1.1, null]) expectStatus(await preview(f, original, admin, { expectedRevision: invalid }), 400)
  for (const extra of [{ sourceRevision: 0 }, { sourceRevision: '1' }, { sequence: 0 }, { priority: -1 },
    { installmentRef: ' ' }, { loanRef: '' }, { sourceRef: '' }]) expectStatus(await preview(f, body({ installments: [installment(extra)] })), 400)
  expectStatus(await preview(f, body({ installments: [installment(), installment({ installmentRef: ' i1 ', sequence: 2 })] })), 400)
  // نفس حد Express المستخدم في main.ts يرفض هذا الجسم (255KB) قبل وصوله إلى DTO؛ لا نوسع الحد في الاختبار.
  expectStatus(await preview(f, body({ installments: Array.from({ length: 1001 }, (_, index) => installment({ installmentRef: `i${index}` })) })), 413)
})

test('Installment preview API: period ordering, month rollover and explicit schedule-extension boundaries are enforced', async () => {
  const f = await fixture()
  for (const extra of [{ period: '2026-9' }, { period: '2026-13' }, { period: '0000-09' }, { nextPeriod: '2026-11' },
    { nextPeriod: '2026-09' }, { nextPeriod: '2026-08' }]) expectStatus(await preview(f, body(extra)), 400)
  expectStatus(await preview(f, body({ installments: [installment({ originalDuePeriod: '2026-10' })] })), 400)
  expectStatus(await preview(f, body({ installments: [installment({ extensionPeriod: '2026-10' })] })), 400)
  const block = await fixture({}, [ledgerComponent('LOAN', { ledgerPartialPayment: 'BLOCK' })])
  for (const extensionPeriod of [null, '2026-09', '2026-10']) {
    expectStatus(await preview(block, body({ installments: [installment({ extensionPeriod }),
      installment({ installmentRef: 'i2', sequence: 2, originalDuePeriod: '2026-10', duePeriod: '2026-10', extensionPeriod: '2026-11' })] })), 400)
  }
  const december = await result(f, body({ period: '2026-12', nextPeriod: '2027-01',
    installments: [installment({ originalDuePeriod: '2026-12', duePeriod: '2026-12' })] }))
  assert.equal(line(december).continuation.duePeriod, '2027-01')
})

test('Installment preview API: manual decisions require one open due target, future period, source and meaningful reason', async () => {
  const f = await fixture(), decision = { installmentRef: 'i1', toPeriod: '2026-10', sourceRef: 'decision:1', reason: 'سبب التأجيل الموثق' }
  for (const changed of [{ ...decision, reason: '  ' }, { ...decision, sourceRef: '' }, { ...decision, installmentRef: 'unknown' },
    { ...decision, toPeriod: '2026-09' }, { ...decision, toPeriod: '2026-08' }, { ...decision, approvedBy: admin.id }]) {
    expectStatus(await preview(f, body({ manualDeferrals: [changed] })), 400)
  }
  expectStatus(await preview(f, body({ manualDeferrals: [decision, decision] })), 400)
  expectStatus(await preview(f, body({ installments: [installment({ remainingAmount: '0.00' })], manualDeferrals: [decision] })), 400)
  expectStatus(await preview(f, body({ installments: [installment({ originalDuePeriod: '2026-10', duePeriod: '2026-10' })], manualDeferrals: [decision] })), 400)
})

test('Installment preview API: legacy, missing or invalid settings, absent definition and unknown markers reject without backfilling history', async () => {
  for (const mutation of [{ monthlyDays: null }, { monthlyDays: 29 }, { contractVersion: 'LEGACY_V1' },
    { catalogVersion: null }, { engineVersion: null }, { catalogVersion: 'UNKNOWN' }, { engineVersion: 'UNKNOWN' }]) {
    const f = await fixture()
    await repo('PayrollPolicyVersion').update(f.versionId, mutation)
    expectStatus(await preview(f), 409)
  }
  expectStatus(await preview(await fixture({}, null)), 409)
  expectStatus(await preview(await fixture({ defaultPeriodType: 'SEMI_MONTHLY' })), 409)
})

test('Installment preview API: only eligible saved stage-five currency ledger definitions can allocate original principal', async () => {
  for (const extra of [{ stage: 4 }, { carryOverEligible: false }, { conditionFormula: 'BASE_SALARY > 0' },
    { minAmount: '1.00' }, { maxAmount: '100.00' }, { roundingScale: 1, roundingMode: 'HALF_UP' }, { prorationMode: 'BY_COVERED_DAYS' }]) {
    const f = await fixture({}, [ledgerComponent('LOAN', extra)])
    expectStatus(await preview(f), 409)
  }
})

test('Installment preview API: unknown, inactive, mismatched category or duplicate loan ownership cannot reach allocation', async () => {
  const f = await fixture({}, [ledgerComponent(), ledgerComponent('SECOND_LOAN', { sequence: 2, deductionPriority: 2 })])
  expectStatus(await preview(f, body({ installments: [installment({ componentCode: 'UNKNOWN' })] })), 409)
  for (const category of ['*', 'debt', ' ']) expectStatus(await preview(f, body({ installments: [installment({ category })] })), 400)
  expectStatus(await preview(f, body({ installments: [installment(), installment({ componentCode: 'SECOND_LOAN', installmentRef: 'i2', sequence: 2 })] })), 400)
  const inactive = await fixture({}, [ledgerComponent('LOAN', { isActive: false })])
  expectStatus(await preview(inactive), 409)
  const wildcard = await fixture({}, [ledgerComponent('LOAN', { ledgerCategory: '*' })])
  const accepted = await result(wildcard, body({ installments: [installment({ category: 'documented_loan' })] }))
  assert.deepEqual(accepted.result.sourceAssignments, [{ installmentRef: 'i1', componentCode: 'LOAN', category: 'documented_loan' }])
})

test('Installment preview API: changing saved settings advances revision, rejects stale requests and changes only the new snapshot hash', async () => {
  const f = await fixture(), first = await result(f)
  const saved = expectStatus(await request(admin, 'PATCH', `${endpoint}/${f.policyId}/versions/${f.versionId}`, {
    expectedRevision: f.revision, reason: 'رفع الحد الأدنى في نسخة اختبار قابلة للتحرير', settings: { minNetGuarantee: 700 } }), 200)
  assert.equal(saved.editKind, 'UPDATED')
  expectStatus(await preview(f), 409)
  const updated = { ...f, revision: saved.version.revision }, second = await result(updated)
  deducted(first, '400.00'); deducted(second, '200.00')
  assert.notEqual(second.snapshotHash, first.snapshotHash)
  assertMoney(first.result.netAfterInstallments, '500')
  assertMoney(second.result.netAfterInstallments, '700')
})

test('Installment preview API: cloning a frozen source preserves its exact stored history and original result', async () => {
  const f = await fixture()
  await repo('PayrollPolicyVersion').update(f.versionId, { status: 'ACTIVE', frozenAt: new Date('2026-09-01T08:00:00Z') })
  const original = await result(f), source = await storedRows(f.versionId)
  const cloned = expectStatus(await request(admin, 'PATCH', `${endpoint}/${f.policyId}/versions/${f.versionId}`, {
    expectedRevision: f.revision, reason: 'مراجعة إعدادات نسخة جديدة مع حفظ التاريخ', settings: { minNetGuarantee: 700 } }), 200)
  assert.equal(cloned.editKind, 'CLONED')
  assert.notEqual(cloned.version.id, f.versionId)
  assert.deepEqual(await storedRows(f.versionId), source)
  assert.deepEqual(await result(f), original)
  const next = await result({ ...f, versionId: cloned.version.id, revision: cloned.version.revision })
  deducted(next, '200.00')
  assert.notEqual(next.snapshotHash, original.snapshotHash)
})

async function storedRows(versionId) {
  const value = { version: plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: versionId })) }
  for (const table of definitionTables) value[table] = await rawRows(table, versionId)
  return value
}

test('Installment preview API: corrupted live config does not change persisted policy settings or any explicit preview', async () => {
  const f = await fixture(), original = await result(f)
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.policy.min_net_guarantee' })
  try {
    await repo('RequestsConfig').update(config.key, { value: 'INVALID_UNUSED_DEFAULT' })
    assert.deepEqual(await result(f), original)
  } finally { await repo('RequestsConfig').save(config) }
})

test('Installment preview API: source references and revisions remain caller evidence and affect the hash without resolving live debts', async () => {
  const f = await fixture(), original = await result(f)
  const changed = body({ installments: [installment({ sourceRef: 'loan_installments:1; opaque caller text', sourceRevision: 2 })] })
  const next = await result(f, changed)
  deducted(next, '400.00')
  assert.equal(line(next).sourceRef, changed.installments[0].sourceRef)
  assert.equal(line(next).sourceRevision, 2)
  assert.notEqual(next.snapshotHash, original.snapshotHash)
  assert.equal(next.result.allocation.sourceValidation, 'CALLER_UNVERIFIED')
  assert.ok(next.result.warnings.some(warning => warning.code === 'INSTALLMENT_PREVIEW_ONLY'))
})

test('Installment preview API: shared SQL lock rejects a stale revision after a concurrent settings commit and performs no writes itself', async () => {
  const f = await fixture(), eventBefore = await events(f.policyId), financialBefore = await financialSnapshot()
  const runner = ds.createQueryRunner()
  let pending, committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const [{ lockResult }] = await runner.query(`DECLARE @result int;
      EXEC @result=sys.sp_getapplock @Resource=@0, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${f.policyId}`])
    assert.ok(lockResult >= 0)
    await runner.query('UPDATE payroll_policy_versions SET minNetGuarantee=700, revision=revision+1 WHERE id=@0', [f.versionId])
    pending = request(admin, 'POST', `${endpoint}/${f.policyId}/versions/${f.versionId}/installments/preview`,
      { expectedRevision: f.revision, ...body() })
    const deadline = Date.now() + 6000
    let waiters = []
    while (Date.now() < deadline) {
      const query = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
        WHERE database_id=DB_ID(@testDatabase) AND blocking_session_id=@blocker AND wait_type LIKE 'LCK%'`)
      waiters = query.recordset
      if (waiters.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiters.length, 'Expected a genuine SQL shared-lock waiter behind the policy settings mutation')
    process.stdout.write(`# Installment preview shared SQL waiters: ${JSON.stringify(waiters)}\n`)
    await runner.commitTransaction(); committed = true
    const afterConcurrentWrite = await policySnapshot()
    expectStatus(await pending, 409)
    assert.deepEqual(await policySnapshot(), afterConcurrentWrite, 'Rejected preview altered the concurrently committed policy')
    assert.deepEqual(await financialSnapshot(), financialBefore)
    assert.deepEqual(await events(f.policyId), eventBefore)
    const next = await result({ ...f, revision: f.revision + 1 })
    deducted(next, '200.00')
    assertMoney(next.result.netAfterInstallments, '700')
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    if (pending) await Promise.allSettled([pending])
    await runner.release()
  }
})

test('Installment preview API: sub-cent capacity stays unused and manual decisions reserve later months before an automatic extension', async () => {
  const f = await fixture(), exact = await result(f, withBudget({ netBeforeLoans: '900.009999' }))
  deducted(exact, '400.00')
  assertMoney(exact.result.netAfterInstallments, '500.009999')
  assertMoney(exact.result.budget.unusedFraction, '0.009999')
  const block = await fixture({}, [ledgerComponent('LOAN', { ledgerPartialPayment: 'BLOCK' })])
  const values = body({ installments: [
    installment({ extensionPeriod: '2026-11' }),
    installment({ installmentRef: 'i2', sequence: 2, sourceRef: 'preview:i2', extensionPeriod: '2026-11' }),
  ], manualDeferrals: [{ installmentRef: 'i1', toPeriod: '2026-11', sourceRef: 'decision:manual-tail', reason: 'تأجيل القسط لشهر محدد بقرار صريح' }] })
  const response = await result(block, values)
  deducted(response, '0.00')
  assert.equal(line(response).outcome, 'DEFERRED_MANUAL')
  assert.equal(line(response).continuation.duePeriod, '2026-11')
  assert.equal(line(response, 'i2').outcome, 'SKIPPED_AND_EXTENDED')
  assert.equal(line(response, 'i2').continuation.duePeriod, '2026-12')
})
