// تكامل SQL وHTTP لتعريفات بنود محفوظة تقرؤها نواة تنفيذ نقية؛ دون مسير أو كتابة نتائج مالية.
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
const database = `hr_payroll_component_execution_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-component-execution-files-'))
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
  assert.match(database, /^hr_payroll_component_execution_test_[a-f0-9]{16}$/)
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
function sixSources() {
  return { parameters: [{ code: 'FACTOR', nameAr: 'معامل ثابت محفوظ', value: '1.250000', unit: 'SCALAR', isActive: true }],
    tierSets: [], components: [
      component('FIXED_PAY', { amount: '100.00', sequence: 1, prorationMode: 'BY_COVERED_DAYS' }),
      component('HOUSING_PAY', { sequence: 2, valueSource: 'EMPLOYEE_FIELD', amount: null,
        fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO', prorationMode: 'BY_COVERED_WORKING_DAYS' }),
      component('PERCENT_PAY', { sequence: 3, valueSource: 'PERCENT_OF', amount: null, percent: '10.0000', baseCode: 'COMP[FIXED_PAY]' }),
      component('OT_PAY', { stage: 2, sequence: 1, valueSource: 'SYSTEM_VAR', amount: null, varCode: 'OT_AMOUNT' }),
      component('FORMULA_PAY', { stage: 2, sequence: 2, valueSource: 'FORMULA', amount: null,
        formula: '(COMP[FIXED_PAY] + COMP[PERCENT_PAY]) * PARAM[FACTOR]' }),
      component('EXTERNAL_PAY', { stage: 2, sequence: 3, valueSource: 'EXTERNAL', amount: null }),
      netComponent(),
    ] }
}
async function storedDefinition(definition = sixSources(), settings = {}, actor = managerA, policyExtra = {}) {
  const initial = await create({ effectiveFrom: '2026-06-01', settings: { cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, ...settings }, ...policyExtra }, actor)
  await saveValid(initial.policy.id, initial.versions[0].id, definition, {}, actor)
  const read = expectStatus(await readDefinition(initial.policy.id, initial.versions[0].id, actor), 200)
  assert.equal(read.definitionStatus, 'COMPLETE')
  assert.equal(read.settingsStatus, 'COMPLETE')
  assert.equal(read.contractVersion, 'SRS_V1')
  assert.equal(read.revision, 2)
  return { policyId: initial.policy.id, versionId: initial.versions[0].id, revision: read.revision,
    definition: read.definition, settings: read.settings, catalogVersion: read.catalogVersion, engineVersion: read.engineVersion }
}
function explicitFacts(settings, extra = {}) {
  return require('../src/payroll/payroll-input-facts').buildPayrollInputFacts({
    periodStart: '2026-06-01', periodEnd: '2026-06-30', hireDate: '2020-01-01',
    coverageStart: '2026-06-16', coverageEnd: '2026-06-30', coverageSourceRef: 'explicit:coverage',
    salarySegments: [{ from: '2026-06-16', to: '2026-06-30', sourceRef: 'explicit:salary', salary: {
      basicSalary: '9000.00', housingAllowance: '600.00', transportAllowance: '0.00', phoneAllowance: '0.00',
      workNatureAllowance: '0.00', otherAllowance: '0.00' } }],
    scheduledWorkDates: ['2026-06-01', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-30'], scheduleSourceRef: 'explicit:schedule',
    ...extra,
  }, settings)
}
function executionInput(stored, factInput = explicitFacts(stored.settings)) {
  const variables = { BASE_SALARY: factInput.monthlyEquivalent.components.basicSalary.exact,
    GROSS_SALARY: factInput.monthlyEquivalent.grossSalary.exact, OT_AMOUNT: '75' }
  const employeeFields = Object.fromEntries(Object.entries(factInput.monthlyEquivalent.components).map(([key, value]) => [key, value.exact]))
  const externalValues = Object.fromEntries(stored.definition.components.filter(row => row.isActive && row.valueSource === 'EXTERNAL').map(row => [row.code, '20']))
  return { variables, employeeFields, externalValues,
    sourceMetadata: {
      variables: { BASE_SALARY: { sourceRef: 'facts:monthly-salary', alreadyProrated: false }, GROSS_SALARY: { sourceRef: 'facts:monthly-salary', alreadyProrated: false },
        OT_AMOUNT: { sourceRef: 'ot:explicit-frozen:75', alreadyProrated: true } },
      employeeFields: Object.fromEntries(Object.keys(employeeFields).map(key => [key, { sourceRef: `facts:employee-field:${key}`, alreadyProrated: false }])),
      externalValues: Object.fromEntries(Object.keys(externalValues).map(key => [key, { sourceRef: `external:${key}`, alreadyProrated: false }])),
    },
    proration: { calendar30: { value: factInput.coverage.earnedCalendar30Factor.exact, sourceRef: 'facts:calendar30-factor' },
      working: { value: factInput.coverage.workingCoverageFactor?.exact ?? null, sourceRef: 'facts:working-factor' } },
    exemptions: [],
  }
}
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }
  return value
}
async function execute(stored, input = executionInput(stored)) {
  const policyBefore = await policySnapshot(), financialBefore = await financialSnapshot()
  const argumentsBefore = plain({ definition: stored.definition, settings: stored.settings, input })
  freeze(stored.definition); freeze(stored.settings); freeze(input)
  try {
    return require('../src/payroll/payroll-component-execution').executePayrollComponents(stored.definition, stored.settings, input)
  } finally {
    assert.deepEqual(plain({ definition: stored.definition, settings: stored.settings, input }), argumentsBefore)
    assert.deepEqual(await policySnapshot(), policyBefore, 'Pure execution changed persisted policies or audit rows')
    assert.deepEqual(await financialSnapshot(), financialBefore, 'Pure execution changed financial or attendance source rows')
  }
}
function line(result, code) {
  const found = result.components.find(component => component.code === code)
  assert.ok(found, `Missing output component ${code}`)
  return found
}
function onlyComponents(components) { return { parameters: [], tierSets: [], components: [...components, netComponent()] } }
function assertDeferredNet(result) {
  assert.equal(result.source, 'EXPLICIT_UNVERIFIED')
  assert.equal(result.preCapsOnly, true)
  assert.equal(result.netPay, undefined)
  assert.equal(result.net, undefined)
  assert.equal(line(result, 'NET').status, 'DEFERRED')
  assert.equal(line(result, 'NET').amount, null)
  assert.ok(result.deferred.includes('NET'))
  assert.ok(result.deferred.includes('NET_CAPS'))
}
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment', 'LatenessTier',
    'AttendanceDay', 'AttendancePunch', 'AttendanceExemption', 'AttendanceExemptionEvent', 'PayrollPeriodClaim',
    'Request', 'RequestApproval', 'AttendanceCorrection', 'LeaveBalance', 'EmployeeStatusHistory',
    'LoanInstallmentAllocation', 'LoanInstallmentEvent']) {
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
  const loan = await repo('Loan').save({ employeeId: employeeA.id, amount: 1666, status: 'DISBURSED', disbursedAt: new Date('2026-05-01T08:00:00Z') })
  await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-06-01', amount: 1666, paid: false })
  await repo('EmployeeObligation').save({ employeeId: employeeA.id, type: 'CREDIT', category: 'bonus', amount: 50,
    label: 'مستحق حقيقي يجب ألا تستهلكه النواة النقية', status: 'PENDING', effectiveDate: '2026-06-01', sourceRef: 'canary:policy-credit' })
  // لحاق الإقلاع الحقيقي مؤجل 30 ثانية؛ ننتظر إتمامه قبل تثبيت canary كي لا يُنسب أثره لمعاينة قراءة فقط.
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
  // استدراك الحضور له مؤقت مستقل؛ ننتظر الخدمة الحقيقية قبل المقارنات الطويلة.
  await app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).catchUpIfBehind()
  assert.match((await repo('RequestsConfig').findOneByOrFail({ key: 'attendance.absences_materialized_through' })).value, /^\d{4}-\d{2}-\d{2}$/)
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
    assert.match(path.basename(uploads), /^hr-payroll-component-execution-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('Component execution integration: six sources saved and read through real branch-scoped HTTP execute in dependency order using exact facts factors', async () => {
  const stored = await storedDefinition()
  const result = await execute(stored)
  assertDeferredNet(result)
  assert.equal(stored.catalogVersion, 'SRS_V1_20260913')
  for (const [code, amount] of Object.entries({ FIXED_PAY: '50.00', HOUSING_PAY: '360.00', PERCENT_PAY: '5.00',
    OT_PAY: '75.00', FORMULA_PAY: '68.75', EXTERNAL_PAY: '20.00' })) {
    assert.equal(line(result, code).amount, amount)
    assert.equal(line(result, code).status, 'CALCULATED')
  }
  assert.equal(result.totalsPreCaps.earnings.amount, '578.75')
  assert.equal(result.totalsPreCaps.deductions.amount, '0.00')
  assert.equal(result.totalsPreCaps.balanceBeforeCaps.amount, '578.75')
  assert.ok(result.components.findIndex(row => row.code === 'FIXED_PAY') < result.components.findIndex(row => row.code === 'PERCENT_PAY'))
  assert.ok(result.components.findIndex(row => row.code === 'PERCENT_PAY') < result.components.findIndex(row => row.code === 'FORMULA_PAY'))
  expectStatus(await readDefinition(stored.policyId, stored.versionId, managerB), 403)
  expectStatus(await readDefinition(stored.policyId, stored.versionId, viewerA), 200)
})

test('Component execution integration: SQL CAST definition reads preserve money beyond Number precision through the pure result', async () => {
  const amount = '9007199254740991.91'
  const stored = await storedDefinition(onlyComponents([component('EXACT_PAY', { amount })]))
  assert.equal(stored.definition.components.find(row => row.code === 'EXACT_PAY').amount, amount)
  const [sqlValue] = await ds.query('SELECT CAST(amount AS nvarchar(100)) AS amount FROM payroll_policy_components WHERE versionId=@0 AND code=@1', [stored.versionId, 'EXACT_PAY'])
  assert.equal(sqlValue.amount, amount)
  const result = await execute(stored)
  assert.equal(line(result, 'EXACT_PAY').amount, amount)
  assert.equal(BigInt(line(result, 'EXACT_PAY').amountExact.numerator) * 100n,
    900719925474099191n * BigInt(line(result, 'EXACT_PAY').amountExact.denominator))
  assertDeferredNet(result)
})

test('Component execution integration: missing SKIP and false or inactive components remain zero without revival by their minimum', async () => {
  const definition = onlyComponents([
    component('MISSING_SKIP', { sequence: 1, valueSource: 'EMPLOYEE_FIELD', amount: null, fieldPath: 'housingAllowance', missingFieldBehavior: 'SKIP', minAmount: '10.00' }),
    component('CONDITION_SKIP', { sequence: 2, conditionFormula: 'BASE_SALARY < 0', minAmount: '10.00' }),
    component('INACTIVE_SKIP', { sequence: 3, isActive: false, minAmount: '10.00' }),
  ])
  const stored = await storedDefinition(definition), input = executionInput(stored)
  input.employeeFields.housingAllowance = null
  delete input.sourceMetadata.employeeFields.housingAllowance
  const result = await execute(stored, input)
  for (const code of ['MISSING_SKIP', 'CONDITION_SKIP', 'INACTIVE_SKIP']) {
    assert.equal(line(result, code).status, 'SKIPPED')
    assert.equal(line(result, code).amount, '0.00')
    assert.ok(line(result, code).skippedReason)
  }
})

test('Component execution integration: variable-zero division uses the stored policy warning or failure behavior without partial writes', async () => {
  const definition = onlyComponents([component('DIVISION_PAY', { valueSource: 'FORMULA', amount: null, formula: 'BASE_SALARY / OT_AMOUNT' })])
  const warning = await storedDefinition(definition, { divisionByZeroMode: 'ZERO_WITH_WARNING' })
  const warningInput = executionInput(warning); warningInput.variables.OT_AMOUNT = '0'
  const result = await execute(warning, warningInput)
  assert.equal(line(result, 'DIVISION_PAY').amount, '0.00')
  assert.ok(result.warnings.some(item => item.code === 'DIVISION_BY_ZERO') || line(result, 'DIVISION_PAY').warnings.some(item => item.code === 'DIVISION_BY_ZERO'))
  const failed = await storedDefinition(definition, { divisionByZeroMode: 'FAIL_ROW' })
  const failInput = executionInput(failed); failInput.variables.OT_AMOUNT = '0'
  await assert.rejects(execute(failed, failInput), error => error.name === 'PayrollComponentExecutionError' && /DIVISION_BY_ZERO/.test(error.code))
})

test('Component execution integration: missing working-day factor raises an explicit error only when a stored component needs it', async () => {
  const stored = await storedDefinition(), facts = explicitFacts(stored.settings, { scheduledWorkDates: [] })
  assert.equal(facts.coverage.workingCoverageFactor, null)
  await assert.rejects(execute(stored, executionInput(stored, facts)), error => error.name === 'PayrollComponentExecutionError')
  const unused = await storedDefinition(onlyComponents([component('FIXED_ONLY')]))
  const noSchedule = explicitFacts(unused.settings, { scheduledWorkDates: [] })
  assert.equal(line(await execute(unused, executionInput(unused, noSchedule)), 'FIXED_ONLY').amount, '100.00')
})

test('Component execution integration: stored settings and parameters remain deterministic despite corrupted live defaults', async () => {
  const stored = await storedDefinition(), input = executionInput(stored)
  const first = await execute(stored, input)
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.daily_hours' })
  try {
    await repo('RequestsConfig').update({ key: config.key }, { value: 'BROKEN_LIVE_CONFIG' })
    const version = expectStatus(await request(managerA, 'GET', `${endpoint}/${stored.policyId}/versions/${stored.versionId}`), 200).version
    assert.deepEqual(version.settings, stored.settings)
    assert.deepEqual(await execute(stored, input), first)
  } finally { await repo('RequestsConfig').update({ key: config.key }, { value: config.value }) }
})

test('Component execution integration: approved OT amount stays fully valued and repeated reads report its source only once', async () => {
  const stored = await storedDefinition(onlyComponents([
    component('OT_PAY', { stage: 2, sequence: 1, valueSource: 'SYSTEM_VAR', amount: null, varCode: 'OT_AMOUNT' }),
    component('OT_TRACE', { stage: 2, sequence: 2, componentType: 'INFO', valueSource: 'FORMULA', amount: null, formula: 'OT_AMOUNT + COMP[OT_PAY]' }),
  ]))
  const result = await execute(stored)
  assert.equal(line(result, 'OT_PAY').amount, '75.00')
  assert.equal(line(result, 'OT_TRACE').amount, '150.00')
  assert.equal(result.totalsPreCaps.earnings.amount, '75.00')
  assert.deepEqual(result.approvedOtConsumedRefs, ['ot:explicit-frozen:75'])
  const unused = await storedDefinition(onlyComponents([component('WITHOUT_OT')]))
  assert.deepEqual((await execute(unused)).approvedOtConsumedRefs, [])
})

test('Component execution integration: already-prorated source metadata prevents applying a second coverage factor', async () => {
  const stored = await storedDefinition(), input = executionInput(stored)
  input.sourceMetadata.employeeFields.housingAllowance.alreadyProrated = true
  await assert.rejects(execute(stored, input), error => error.name === 'PayrollComponentExecutionError')
})

test('Component execution integration: full per-component deduction exemptions retain trace and cannot affect an ineligible earning', async () => {
  const stored = await storedDefinition(onlyComponents([
    component('EARNING_PAY', { sequence: 1 }),
    component('PENALTY_DED', { stage: 3, componentType: 'DEDUCTION', deductionPriority: 1, minAmount: '20.00' }),
  ]))
  const input = executionInput(stored); input.exemptions = [{ code: 'PENALTY_DED', sourceRef: 'exemption:full-penalty' }]
  const result = await execute(stored, input)
  assert.equal(line(result, 'PENALTY_DED').amount, '0.00')
  assert.equal(line(result, 'PENALTY_DED').status, 'CALCULATED')
  assert.ok(line(result, 'PENALTY_DED').steps.length)
  assert.equal(line(result, 'EARNING_PAY').amount, '100.00')
  assert.equal(result.totalsPreCaps.deductions.amount, '0.00')
  const invalid = executionInput(stored); invalid.exemptions = [{ code: 'EARNING_PAY', sourceRef: 'exemption:invalid-earning' }]
  await assert.rejects(execute(stored, invalid), error => error.name === 'PayrollComponentExecutionError')
})

test('Component execution integration: persisted component rounding flows into dependent COMP reads and component caps follow proration', async () => {
  const stored = await storedDefinition(onlyComponents([
    component('ROUND_PAY', { sequence: 1, amount: '1.25', roundingMode: 'HALF_EVEN', roundingScale: 1 }),
    component('DEPENDENT_PAY', { sequence: 2, valueSource: 'FORMULA', amount: null, formula: 'COMP[ROUND_PAY] * 10' }),
    component('CAPPED_PAY', { sequence: 3, prorationMode: 'BY_COVERED_DAYS', minAmount: '60.00', maxAmount: '90.00', capPctOfBase: '0.5000', capBaseCode: 'GROSS_SALARY' }),
  ]))
  const result = await execute(stored)
  assert.equal(line(result, 'ROUND_PAY').amount, '1.2')
  assert.equal(line(result, 'DEPENDENT_PAY').amount, '12.00')
  assert.equal(line(result, 'CAPPED_PAY').amount, '48.00')
})

test('Component execution integration: negative financial results clamp to zero without minimum revival while INFO stays descriptive', async () => {
  const stored = await storedDefinition(onlyComponents([
    component('NEGATIVE_PAY', { sequence: 1, valueSource: 'EXTERNAL', amount: null, minAmount: '10.00' }),
    component('NEGATIVE_INFO', { sequence: 2, componentType: 'INFO', amount: '-2.50' }),
  ]))
  const input = executionInput(stored); input.externalValues.NEGATIVE_PAY = '-10'
  const result = await execute(stored, input)
  assert.equal(line(result, 'NEGATIVE_PAY').amount, '0.00')
  assert.equal(line(result, 'NEGATIVE_INFO').amount, '-2.50')
  assert.equal(result.totalsPreCaps.earnings.amount, '0.00')
})

test('Component execution integration: active ledger and tiered definitions remain explicitly unsupported and no net payroll output is produced', async () => {
  for (const unsupported of ['LEDGER', 'TIERED']) {
    const definition = onlyComponents([component('UNSUPPORTED_DED', { componentType: 'DEDUCTION', stage: unsupported === 'LEDGER' ? 5 : 3,
      valueSource: unsupported, amount: null, deductionPriority: 1,
      ...(unsupported === 'LEDGER' ? { ledgerCategory: '*', ledgerDirection: 'DEBIT', ledgerPartialPayment: 'ALLOW_PARTIAL' } : { tierSetCode: 'LATE_SET' }),
    })])
    if (unsupported === 'TIERED') definition.tierSets = [tierSet()]
    const stored = await storedDefinition(definition)
    await assert.rejects(execute(stored), error => error.name === 'PayrollComponentExecutionError' && error.code === 'COMPONENT_SOURCE_UNSUPPORTED')
  }
})

test('Component execution integration: unknown values, forged COMP or parameter overrides and missing source metadata reject after genuine definition reads', async () => {
  const stored = await storedDefinition()
  for (const mutate of [
    input => { input.variables.UNKNOWN_VAR = '1'; input.sourceMetadata.variables.UNKNOWN_VAR = { sourceRef: 'unknown', alreadyProrated: false } },
    input => { input.components = { FIXED_PAY: '999' } },
    input => { input.parameters = { FACTOR: '999' } },
    input => { delete input.sourceMetadata.variables.OT_AMOUNT },
    input => { input.sourceMetadata.variables.OT_AMOUNT.alreadyProrated = 'true' },
    input => { input.externalValues.UNKNOWN_EXTERNAL = '99' },
    input => { delete input.employeeFields.phoneAllowance },
  ]) {
    const input = executionInput(stored); mutate(input)
    await assert.rejects(execute(stored, input), error => error.name === 'PayrollComponentExecutionError')
  }
})

test('Component execution integration: concurrent atomic definition and settings replacement yields one coherent locked HTTP snapshot', async () => {
  const stored = await storedDefinition(onlyComponents([component('ATOMIC_PAY', { amount: '100.00' })]))
  const nextDefinition = plain(stored.definition)
  nextDefinition.components.find(row => row.code === 'ATOMIC_PAY').amount = '200.00'
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const [{ lockResult }] = await runner.query(`DECLARE @result int;
      EXEC @result=sys.sp_getapplock @Resource=@0, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${stored.policyId}`])
    assert.ok(lockResult >= 0)
    pending = [
      saveDefinition(stored.policyId, stored.versionId, nextDefinition, { expectedRevision: 2,
        reason: 'تبديل تعريف وساعات معاينة ذري', settings: { roundingScale: 1 } }, managerA),
      readDefinition(stored.policyId, stored.versionId, managerA),
    ]
    const deadline = Date.now() + 6000
    let waiters = []
    while (Date.now() < deadline) {
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiters = result.recordset
      if (waiters.length >= 2) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiters.length >= 2, `Expected writer and reader to wait in SQL, observed ${JSON.stringify(waiters)}`)
    process.stdout.write(`# Component execution coherent snapshot SQL waiters: ${JSON.stringify(waiters)}\n`)
    await runner.commitTransaction(); committed = true
    const [savedResponse, readResponse] = await Promise.all(pending)
    expectStatus(savedResponse, 200)
    const snapshot = expectStatus(readResponse, 200)
    const snapshotAmount = snapshot.definition.components.find(row => row.code === 'ATOMIC_PAY').amount
    assert.ok([[2, 2, '100.00'], [3, 1, '200.00']].some(([revision, scale, amount]) =>
      snapshot.revision === revision && snapshot.settings.roundingScale === scale && snapshotAmount === amount),
    `Mixed definition/settings snapshot: ${JSON.stringify({ revision: snapshot.revision, scale: snapshot.settings.roundingScale, snapshotAmount })}`)
    const executed = await execute({ ...stored, revision: snapshot.revision, definition: snapshot.definition, settings: snapshot.settings })
    assert.equal(line(executed, 'ATOMIC_PAY').amount, snapshot.revision === 2 ? '100.00' : '200.0')
    const after = expectStatus(await readDefinition(stored.policyId, stored.versionId, managerA), 200)
    assert.equal(after.revision, 3)
    assert.equal(after.settings.roundingScale, 1)
    assert.equal(after.definition.components.find(row => row.code === 'ATOMIC_PAY').amount, '200.00')
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
})

test('Component execution integration: a negative raw formula cannot be revived by minimum after zero working factor or zero currency conversion', async () => {
  const stored = await storedDefinition(onlyComponents([
    component('NEGATIVE_WORK', { sequence: 1, valueSource: 'FORMULA', amount: null, formula: '-40',
      prorationMode: 'BY_COVERED_WORKING_DAYS', minAmount: '10.00' }),
    component('NEGATIVE_CONVERT', { sequence: 2, valueSource: 'FORMULA', amount: null, formula: '-40',
      unit: 'MINUTES', minAmount: '10.00' }),
  ]))
  const facts = explicitFacts(stored.settings, { scheduledWorkDates: ['2026-06-01', '2026-06-15'] })
  assert.equal(facts.coverage.workingCoverageFactor.exact.numerator, '0')
  const input = executionInput(stored, facts)
  input.variables.MINUTE_RATE = '0'
  input.sourceMetadata.variables.MINUTE_RATE = { sourceRef: 'facts:zero-minute-rate', alreadyProrated: false }
  const result = await execute(stored, input)
  for (const code of ['NEGATIVE_WORK', 'NEGATIVE_CONVERT']) {
    const component = line(result, code)
    assert.equal(component.amount, '0.00')
    assert.equal(component.steps.find(step => step.stage === 'RAW').value.rawValue6, '-40.000000')
    assert.ok(component.warnings.length, 'Negative raw amount must retain an explanation')
  }
  assert.equal(line(result, 'NEGATIVE_CONVERT').steps.find(step => step.stage === 'CONVERT_TO_CURRENCY').value.rawValue6, '0.000000')
  assert.equal(result.totalsPreCaps.earnings.amount, '0.00')
})

test('Component execution integration: an earned allowance used only by IF condition does not taint base salary while its numeric use blocks repeated proration', async () => {
  const conditionOnly = await storedDefinition(onlyComponents([
    component('CONDITION_BASE', { valueSource: 'FORMULA', amount: null,
      formula: 'IF(ALLOWANCES_TOTAL > 0, BASE_SALARY, 0)', prorationMode: 'BY_COVERED_DAYS' }),
  ]))
  const withAllowance = stored => {
    const input = executionInput(stored)
    input.variables.ALLOWANCES_TOTAL = '600'
    input.sourceMetadata.variables.ALLOWANCES_TOTAL = { sourceRef: 'facts:earned-allowances', alreadyProrated: true }
    return input
  }
  const result = await execute(conditionOnly, withAllowance(conditionOnly))
  assert.equal(line(result, 'CONDITION_BASE').amount, '4500.00')
  assert.ok(line(result, 'CONDITION_BASE').sourceRefs.includes('facts:earned-allowances'), 'Condition reads still retain audit source trace')
  const numericBranch = await storedDefinition(onlyComponents([
    component('NUMERIC_ALLOWANCE', { valueSource: 'FORMULA', amount: null,
      formula: 'IF(ALLOWANCES_TOTAL > 0, BASE_SALARY + ALLOWANCES_TOTAL, 0)', prorationMode: 'BY_COVERED_DAYS' }),
  ]))
  await assert.rejects(execute(numericBranch, withAllowance(numericBranch)), error =>
    error.name === 'PayrollComponentExecutionError' && error.code === 'COMPONENT_ALREADY_PRORATED')
})

function completePolicyDefinition({ salary = '900.00', loanMode = 'ALLOW_PARTIAL', credit = false } = {}) {
  const values = onlyComponents([
    component('BASE_PAY', { amount: salary }),
    ...(credit ? [component('CREDIT_PAY', { stage: 2, valueSource: 'LEDGER', amount: null,
      ledgerCategory: 'bonus', ledgerDirection: 'CREDIT', ledgerPartialPayment: 'ALLOW_PARTIAL' })] : []),
    component('LATE_DED', { stage: 3, componentType: 'DEDUCTION', valueSource: 'TIERED', amount: null,
      tierSetCode: 'LATE_SET', deductionPriority: 1, carryOverEligible: false }),
    component('LOAN_DED', { stage: 5, componentType: 'DEDUCTION', valueSource: 'LEDGER', amount: null,
      ledgerCategory: 'loan', ledgerDirection: 'DEBIT', ledgerPartialPayment: loanMode, deductionPriority: 2, carryOverEligible: true }),
  ])
  values.tierSets = [tierSet('LATE_SET', { maxDailyDeductionDayFraction: null,
    tiers: [tier(1, '0', null, { method: 'FIXED_AMOUNT', fixedAmount: '100.00' })] })]
  return values
}
function completePolicyInput(stored, extra = {}) {
  const salary = stored.definition.components.find(row => row.code === 'BASE_PAY').amount
  const amountMeta = { sourceRef: 'explicit:monthly-salary-snapshot', alreadyProrated: false }
  const components = { variables: { BASE_SALARY: salary, GROSS_SALARY: salary },
    employeeFields: Object.fromEntries(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'].map(key => [key, null])),
    externalValues: {}, sourceMetadata: { variables: { BASE_SALARY: { ...amountMeta }, GROSS_SALARY: { ...amountMeta } }, employeeFields: {}, externalValues: {} },
    proration: { calendar30: { value: '1', sourceRef: 'explicit:full-coverage' }, working: { value: '1', sourceRef: 'explicit:full-schedule' } }, exemptions: [] }
  const block = stored.definition.components.find(row => row.code === 'LOAN_DED').ledgerPartialPayment === 'BLOCK'
  const sources = { tiers: { LATE_DED: { expectedRevision: stored.revision, periodStart: '2026-06-01', periodEnd: '2026-06-30',
    basicSalary: salary, grossSalary: salary, sourceRef: 'explicit:attendance-snapshot', days: [{ date: '2026-06-01', sourceRef: 'explicit:attendance-day',
      rawLateSeconds: extra.rawLateSeconds ?? '5400', excusedLateSeconds: '0', flexibleStartEnabled: false, attendanceExempt: false, shiftGraceMinutes: null }] } },
    ledger: { period: '2026-06', nextPeriod: '2026-07', installments: [{ componentCode: 'LOAN_DED', category: 'loan', installmentRef: 'explicit:i1',
      loanRef: 'explicit:l1', sourceRef: 'explicit:loan-source', sourceRevision: 1, sequence: 1, originalDuePeriod: '2026-06', duePeriod: '2026-06',
      remainingAmount: '1666.00', priority: 1, extensionPeriod: block ? '2026-07' : null }], obligations: [], manualDeferrals: [] } }
  const net = { earnedFixedGross: salary, sourceRef: 'explicit:earned-fixed-gross', collectionOrder: extra.collectionOrder ?? ['LOAN_DED', 'LATE_DED'],
    collectionOrderSourceRef: 'owner:explicit-collection-order', classifications: [
      { componentCode: 'LATE_DED', kind: 'ATTENDANCE', sourceRef: 'explicit:attendance-classification', carryOverEligible: false },
      { componentCode: 'LOAN_DED', kind: 'LOAN', sourceRef: 'explicit:loan-classification', carryOverEligible: true },
    ] }
  return { components, sources, net }
}
async function executeCompletePolicy(stored, input = completePolicyInput(stored)) {
  const policyBefore = await policySnapshot(), financialBefore = await financialSnapshot()
  const before = plain({ definition: stored.definition, settings: stored.settings, input })
  freeze(stored.definition); freeze(stored.settings); freeze(input)
  try {
    const result = require('../src/payroll/payroll-policy-execution').executePayrollPolicy(stored.definition, stored.settings, input)
    assert.equal(result.sourceValidation, 'CALLER_UNVERIFIED'); assert.equal(result.preCapsOnly, false)
    assert.equal(result.finalization.trace.claimsCreated, false)
    assert.ok(result.deferred.includes('PAYROLL_PERSISTENCE')); assert.ok(result.deferred.includes('CARRY_POSTING'))
    assert.ok(Object.isFrozen(result)); assert.doesNotThrow(() => JSON.stringify(result))
    return result
  } finally {
    assert.deepEqual(plain({ definition: stored.definition, settings: stored.settings, input }), before)
    assert.deepEqual(await policySnapshot(), policyBefore, 'Pure policy execution changed stored definition or policy audit')
    assert.deepEqual(await financialSnapshot(), financialBefore, 'Pure policy execution posted or reserved a financial source')
  }
}
const allocation = (result, code) => result.finalization.allocations.find(row => row.componentCode === code)

test('Policy execution integration: saved tier and installment definitions honor owner collection order instead of hard-coded attendance priority', async () => {
  const stored = await storedDefinition(completePolicyDefinition(), { minNetGuarantee: 500 })
  const loanFirst = await executeCompletePolicy(stored), attendanceFirst = await executeCompletePolicy(stored,
    completePolicyInput(stored, { collectionOrder: ['LATE_DED', 'LOAN_DED'] }))
  for (const result of [loanFirst, attendanceFirst]) {
    assert.equal(line(result, 'LATE_DED').calculatedAmount, '100.00'); assert.equal(line(result, 'LOAN_DED').calculatedAmount, '1666.00')
    assert.equal(result.finalization.netPay.amount, '500.00'); assert.equal(line(result, 'NET').payableAmount, '500.00')
  }
  assert.equal(allocation(loanFirst, 'LOAN_DED').collectedAmount, '400.00')
  assert.equal(allocation(loanFirst, 'LOAN_DED').loanDetails.lines[0].continuation.amount, '1266.00')
  assert.equal(allocation(loanFirst, 'LATE_DED').collectedAmount, '0.00'); assert.equal(allocation(loanFirst, 'LATE_DED').droppedAmount, '100.00')
  assert.equal(allocation(attendanceFirst, 'LATE_DED').collectedAmount, '100.00')
  assert.equal(allocation(attendanceFirst, 'LOAN_DED').collectedAmount, '300.00')
  assert.equal(allocation(attendanceFirst, 'LOAN_DED').loanDetails.lines[0].continuation.amount, '1366.00')
  assert.deepEqual(loanFirst.finalization.normalizedInput.collectionOrder, ['LOAN_DED', 'LATE_DED'])
})

test('Policy execution integration: explicit manual deferral from a saved installment policy preserves principal despite enough net funds', async () => {
  const stored = await storedDefinition(completePolicyDefinition({ salary: '5000.00' }), { minNetGuarantee: 500 })
  const input = completePolicyInput(stored, { rawLateSeconds: '0' })
  input.sources.ledger.manualDeferrals = [{ installmentRef: 'explicit:i1', toPeriod: '2026-08', sourceRef: 'explicit:manual-decision', reason: 'طلب تأجيل تجريبي مع كفاية الدخل' }]
  const result = await executeCompletePolicy(stored, input), loan = allocation(result, 'LOAN_DED')
  assert.equal(loan.requestedAmount, '1666.00'); assert.equal(loan.collectedAmount, '0.00'); assert.equal(loan.carriedAmount, '1666.00')
  assert.equal(loan.loanDetails.lines[0].outcome, 'DEFERRED_MANUAL')
  assert.equal(loan.loanDetails.lines[0].continuation.duePeriod, '2026-08')
  assert.equal(result.finalization.netPay.amount, '5000.00')
})

test('Policy execution integration: saved BLOCK skips the whole installment and pays the remaining salary after attendance', async () => {
  const stored = await storedDefinition(completePolicyDefinition({ loanMode: 'BLOCK' }), { minNetGuarantee: 500 })
  const result = await executeCompletePolicy(stored), loan = allocation(result, 'LOAN_DED')
  assert.equal(loan.collectedAmount, '0.00'); assert.equal(loan.carriedAmount, '1666.00')
  assert.equal(loan.loanDetails.lines[0].outcome, 'SKIPPED_AND_EXTENDED')
  assert.equal(loan.loanDetails.lines[0].continuation.duePeriod, '2026-07')
  assert.equal(allocation(result, 'LATE_DED').collectedAmount, '100.00')
  assert.equal(result.finalization.netPay.amount, '800.00')
})

test('Policy execution integration: due CREDIT ledger additions do not enlarge the declared fixed gross cap basis or consume future entries', async () => {
  const stored = await storedDefinition(completePolicyDefinition({ credit: true }), { minNetGuarantee: 500, maxDeductionPctOfGross: 40 })
  const input = completePolicyInput(stored, { rawLateSeconds: '0' })
  const credit = { componentCode: 'CREDIT_PAY', entryRef: 'explicit:o1', category: 'bonus', direction: 'CREDIT', sourceRef: 'explicit:credit-source',
    sourceRevision: 1, duePeriod: '2026-06', remainingAmount: '50.00', priority: 1, sequence: 1 }
  input.sources.ledger.obligations = [credit, { ...credit, entryRef: 'explicit:o2', duePeriod: '2026-07', remainingAmount: '200.00', sequence: 2 }]
  const result = await executeCompletePolicy(stored, input)
  assert.equal(line(result, 'CREDIT_PAY').payableAmount, '50.00')
  assert.equal(result.finalization.totals.earnings.amount, '950.00')
  assert.equal(result.finalization.limits.earnedFixedGross.rawValue6, '900.000000')
  assert.equal(result.finalization.limits.cap.rawValue6, '360.000000')
  assert.equal(allocation(result, 'LOAN_DED').collectedAmount, '360.00')
  assert.equal(result.finalization.netPay.amount, '590.00')
})

test('Policy execution integration: the complete engine replays a stored revision unchanged after settings update and live default corruption', async () => {
  const stored = await storedDefinition(completePolicyDefinition(), { minNetGuarantee: 500 })
  const first = await executeCompletePolicy(stored)
  expectStatus(await request(managerA, 'PATCH', `${endpoint}/${stored.policyId}/versions/${stored.versionId}`,
    { expectedRevision: stored.revision, reason: 'رفع أرضية الصافي في نسخة السياسة', settings: { minNetGuarantee: 600 } }), 200)
  const fresh = expectStatus(await readDefinition(stored.policyId, stored.versionId, managerA), 200)
  assert.equal(fresh.revision, 3); assert.equal(fresh.settings.minNetGuarantee, 600)
  const config = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.policy.min_net_guarantee' })
  try {
    await repo('RequestsConfig').update({ key: config.key }, { value: 'BROKEN_LIVE_CONFIG' })
    assert.deepEqual(await executeCompletePolicy(stored), first)
    const next = await executeCompletePolicy({ ...stored, definition: fresh.definition, settings: fresh.settings, revision: fresh.revision })
    assert.equal(allocation(next, 'LOAN_DED').collectedAmount, '300.00')
    assert.equal(next.finalization.netPay.amount, '600.00')
  } finally { await repo('RequestsConfig').update({ key: config.key }, { value: config.value }) }
})

test('Policy execution integration: invalid source mappings loan classifications and principal exemptions reject without SQL mutation', async () => {
  const stored = await storedDefinition(completePolicyDefinition(), { minNetGuarantee: 500 })
  for (const [mutate, expected] of [
    [input => { input.sources.ledger.installments[0].componentCode = 'BASE_PAY' }, 'COMPONENT_LEDGER_COMPONENT_UNAVAILABLE'],
    [input => { input.sources.ledger.installments.push({ ...input.sources.ledger.installments[0] }) }, 'COMPONENT_LEDGER_SOURCE_DUPLICATE'],
    [input => { input.net.classifications.find(row => row.componentCode === 'LOAN_DED').kind = 'OTHER' }, 'POLICY_NET_LOAN_CLASSIFICATION'],
    [input => { input.components.exemptions = [{ code: 'LOAN_DED', sourceRef: 'explicit:invalid-waiver' }] }, 'COMPONENT_LEDGER_EXEMPTION_UNSUPPORTED'],
    [input => { input.sources.ledger.obligations = [{ componentCode: 'LOAN_DED', entryRef: 'debit:o1', category: 'loan', direction: 'DEBIT', sourceRef: 'explicit:debit', sourceRevision: 1, duePeriod: '2026-06', remainingAmount: '1.00', priority: 1, sequence: 1 }] }, 'COMPONENT_LEDGER_OBLIGATION_DEBIT_UNSUPPORTED'],
  ]) {
    const input = completePolicyInput(stored); mutate(input)
    await assert.rejects(executeCompletePolicy(stored, input), error => error.code === expected)
  }
  expectStatus(await readDefinition(stored.policyId, stored.versionId, managerB), 403)
})

const collectionRoute = stored => `${endpoint}/${stored.policyId}/versions/${stored.versionId}/collection`
const executionRoute = stored => `${endpoint}/${stored.policyId}/versions/${stored.versionId}/execution/preview`
function collectionPolicy(order = ['LOAN_DED', 'LATE_DED']) {
  return { schemaVersion: 'SRS_COLLECTION_V1_20260913', classifications: [
    { componentCode: 'LATE_DED', kind: 'ATTENDANCE' }, { componentCode: 'LOAN_DED', kind: 'LOAN' },
  ], collectionOrder: order }
}
async function saveCollection(stored, collection = collectionPolicy(), actor = managerA, extra = {}) {
  return request(actor, 'PATCH', collectionRoute(stored), { expectedRevision: stored.revision, reason: 'اختيار ترتيب التحصيل في نسخة السياسة', collection, ...extra })
}
async function withCollection(extra = {}) {
  const stored = await storedDefinition(completePolicyDefinition(), { minNetGuarantee: 500 }, managerA, extra)
  const saved = expectStatus(await saveCollection(stored), 200)
  return { ...stored, revision: saved.revision, collection: saved.collection }
}
function executionBody(stored) {
  const input = completePolicyInput(stored)
  return { expectedRevision: stored.revision, components: input.components, sources: input.sources,
    basis: { earnedFixedGross: input.net.earnedFixedGross, sourceRef: input.net.sourceRef } }
}

test('Collection policy HTTP: old or new unconfigured versions remain MISSING and preview requires a saved owner decision', async () => {
  const stored = await storedDefinition(completePolicyDefinition())
  const before = await policySnapshot()
  const view = expectStatus(await request(managerA, 'GET', collectionRoute(stored)), 200)
  assert.equal(view.collectionState, 'MISSING'); assert.equal(view.collection, null); assert.equal(view.capabilities.canEdit, true)
  assert.equal(expectStatus(await request(managerA, 'POST', executionRoute(stored), executionBody(stored)), 409).code, 'POLICY_COLLECTION_INCOMPLETE')
  assert.deepEqual(await policySnapshot(), before)
})

test('Collection policy HTTP: saving the owner order increments revision and atomically records before and after', async () => {
  const stored = await storedDefinition(completePolicyDefinition()), before = await sourceSnapshot(stored.versionId)
  const saved = expectStatus(await saveCollection(stored, collectionPolicy(['LATE_DED', 'LOAN_DED'])), 200)
  assert.equal(saved.revision, stored.revision + 1); assert.equal(saved.collectionState, 'COMPLETE'); assert.equal(saved.editKind, 'UPDATED')
  const raw = await ds.query('SELECT [collectionPolicy] FROM [payroll_policy_versions] WHERE id=@0', [stored.versionId])
  assert.deepEqual(JSON.parse(raw[0].collectionPolicy), saved.collection)
  const history = await events(stored.policyId), latest = history.at(-1)
  assert.equal(latest.eventType, 'COLLECTION_UPDATED'); assert.equal(latest.actorUserId, managerA.id)
  assert.equal(latest.payload.before.collectionPolicy, null); assert.deepEqual(latest.payload.after.collectionPolicy, saved.collection)
  const after = await sourceSnapshot(stored.versionId)
  for (const table of definitionTables) assert.equal(after[table], before[table], 'Collection edit changed source component rows')
})

test('Collection policy HTTP: branch and permission boundaries allow shared reads but prohibit unauthorized edits', async () => {
  const stored = await storedDefinition(completePolicyDefinition())
  const before = await sourceSnapshot(stored.versionId), beforeEvents = await events(stored.policyId)
  expectStatus(await request(null, 'GET', collectionRoute(stored)), 401)
  expectStatus(await request(managerB, 'GET', collectionRoute(stored)), 403)
  expectStatus(await request(viewerA, 'GET', collectionRoute(stored)), 200)
  for (const actor of [viewerA, managerB, noPermission, unassigned]) expectStatus(await saveCollection(stored, collectionPolicy(), actor), 403)
  const global = await storedDefinition(completePolicyDefinition(), {}, admin, { branchId: null })
  const shared = expectStatus(await request(managerA, 'GET', collectionRoute(global)), 200)
  assert.equal(shared.capabilities.canEdit, false)
  expectStatus(await saveCollection(global), 403)
  assert.deepEqual(await sourceSnapshot(stored.versionId), before)
  assert.deepEqual(await events(stored.policyId), beforeEvents)
})

test('Collection policy HTTP: incomplete duplicate protected-order and forged source fields reject without any write', async () => {
  const stored = await storedDefinition(completePolicyDefinition()), original = collectionPolicy()
  for (const mutate of [
    value => { value.classifications.pop() }, value => { value.classifications.push({ ...value.classifications[0] }) },
    value => { value.collectionOrder = ['LOAN_DED', 'LOAN_DED'] }, value => { value.classifications[1].kind = 'OTHER' },
    value => { value.classifications[0].kind = 'STATUTORY' }, value => { value.classifications[0].sourceRef = 'forged' },
    value => { value.schemaVersion = 'CUSTOM' }, value => { value.collectionOrderSourceRef = 'forged' },
  ]) {
    const attempted = plain(original); mutate(attempted)
    const before = await policySnapshot(); expectStatus(await saveCollection(stored, attempted), 400); assert.deepEqual(await policySnapshot(), before)
  }
  for (const extra of [{ collection: null }, { expectedRevision: 0 }, { reason: ' ' }, { unrelated: true }]) {
    const before = await policySnapshot(); expectStatus(await saveCollection(stored, original, managerA, extra), 400); assert.deepEqual(await policySnapshot(), before)
  }
})

test('Collection policy HTTP: concurrent edits serialize and a stale revision cannot overwrite the winning choice', async () => {
  const stored = await storedDefinition(completePolicyDefinition()), beforeEvents = await events(stored.policyId)
  const answers = await Promise.all([saveCollection(stored), saveCollection(stored, collectionPolicy(['LATE_DED', 'LOAN_DED']))])
  assert.deepEqual(answers.map(value => value.status).sort(), [200, 409])
  assert.equal(answers.find(value => value.status === 409).body.code, 'POLICY_VERSION_CONFLICT')
  const winner = answers.find(value => value.status === 200).body
  assert.deepEqual(expectStatus(await request(managerA, 'GET', collectionRoute(stored)), 200).collection, winner.collection)
  assert.equal((await events(stored.policyId)).length, beforeEvents.length + 1)
  expectStatus(await saveCollection(stored), 409)
})

test('Collection policy HTTP: active and frozen versions copy on write while the source policy and component identities remain unchanged', async () => {
  for (const frozen of [false, true]) {
    const stored = await withCollection()
    await repo('PayrollPolicyVersion').update({ id: stored.versionId }, frozen ? { frozenAt: new Date() } : { status: 'ACTIVE', publishedAt: new Date(), publishedBy: managerA.id })
    const before = await sourceSnapshot(stored.versionId)
    const saved = expectStatus(await saveCollection(stored, collectionPolicy(['LATE_DED', 'LOAN_DED'])), 200)
    assert.equal(saved.editKind, 'CLONED'); assert.notEqual(saved.versionId, stored.versionId); assert.equal(saved.revision, 1)
    assert.equal(saved.version.sourceVersionId, stored.versionId); assert.deepEqual(saved.collection.collectionOrder, ['LATE_DED', 'LOAN_DED'])
    assert.deepEqual(await sourceSnapshot(stored.versionId), before)
    assert.equal((await events(stored.policyId)).at(-1).payload.collectionReplaced, true)
  }
})

test('Collection policy HTTP: cloning or editing metadata preserves the saved collection policy including historical sources', async () => {
  const stored = await withCollection(), existing = await sourceSnapshot(stored.versionId)
  const cloned = expectStatus(await request(managerA, 'POST', `${endpoint}/${stored.policyId}/versions`, { expectedRevision: stored.revision,
    sourceVersionId: stored.versionId, reason: 'نسخ سياسة التحصيل المحفوظة' }), 201)
  const clonedView = expectStatus(await request(managerA, 'GET', collectionRoute({ ...stored, versionId: cloned.version.id })), 200)
  assert.deepEqual(clonedView.collection, stored.collection); assert.deepEqual(await sourceSnapshot(stored.versionId), existing)
  const changed = expectStatus(await request(managerA, 'PATCH', `${endpoint}/${stored.policyId}/versions/${stored.versionId}`, {
    expectedRevision: stored.revision, reason: 'تحديث عنوان النسخة', metadata: { title: 'العنوان الجديد' }, settings: { minNetGuarantee: 600 } }), 200)
  assert.deepEqual(changed.version.collectionPolicy, stored.collection)
})

test('Collection policy HTTP: a component change requires an atomic matching collection update instead of silently dropping its classification', async () => {
  const stored = await withCollection(), changedDefinition = plain(stored.definition)
  changedDefinition.components.splice(changedDefinition.components.length - 1, 0, component('OTHER_DED', { componentType: 'DEDUCTION', stage: 5, sequence: 2, amount: '10', deductionPriority: 3 }))
  const before = await policySnapshot()
  assert.equal(expectStatus(await saveDefinition(stored.policyId, stored.versionId, changedDefinition, { expectedRevision: stored.revision }, managerA), 409).code, 'POLICY_COLLECTION_REPAIR_REQUIRED')
  assert.deepEqual(await policySnapshot(), before)
  const collection = collectionPolicy(); collection.classifications.push({ componentCode: 'OTHER_DED', kind: 'OTHER' }); collection.collectionOrder.push('OTHER_DED')
  const validation = expectStatus(await validateDefinition(stored.policyId, stored.versionId, changedDefinition, { collection }, managerA), 200)
  const saved = expectStatus(await saveDefinition(stored.policyId, stored.versionId, changedDefinition, { expectedRevision: stored.revision, collection,
    acknowledgedWarnings: validation.requiredAcknowledgements }, managerA), 200)
  assert.equal(saved.collectionState, 'COMPLETE'); assert.deepEqual(saved.collection.collectionOrder, collection.collectionOrder)
  assert.equal(saved.definition.components.find(row => row.code === 'OTHER_DED').amount, '10.00')
})

test('Collection policy HTTP: malformed persisted JSON is visible as INVALID and can be repaired without resetting the definition', async () => {
  const stored = await withCollection()
  for (const raw of ['{broken-json', ' null ', JSON.stringify({ schemaVersion: 'UNKNOWN' })]) {
    await ds.query('UPDATE [payroll_policy_versions] SET [collectionPolicy]=@0 WHERE id=@1', [raw, stored.versionId])
    const view = expectStatus(await request(managerA, 'GET', collectionRoute(stored)), 200)
    assert.equal(view.definitionStatus, 'COMPLETE'); assert.equal(view.collectionState, 'INVALID'); assert.equal(view.collection, null); assert.ok(view.collectionIssues.length)
    assert.equal(expectStatus(await request(managerA, 'POST', executionRoute(stored), executionBody(stored)), 409).code, 'POLICY_COLLECTION_INCOMPLETE')
    const before = await policySnapshot()
    assert.equal(expectStatus(await saveDefinition(stored.policyId, stored.versionId, stored.definition, { expectedRevision: stored.revision }, managerA), 409).code, 'POLICY_COLLECTION_REPAIR_REQUIRED')
    assert.deepEqual(await policySnapshot(), before)
    const cloned = expectStatus(await request(managerA, 'POST', `${endpoint}/${stored.policyId}/versions`, { expectedRevision: stored.revision,
      sourceVersionId: stored.versionId, reason: 'نسخ حالة تالفة للمراجعة دون افتراض ترتيب' }), 201)
    const copied = expectStatus(await request(managerA, 'GET', collectionRoute({ ...stored, versionId: cloned.version.id })), 200)
    assert.equal(copied.collectionState, 'INVALID')
    if (raw.startsWith('{broken') || raw.trim() === 'null') assert.equal((await ds.query('SELECT [collectionPolicy] FROM [payroll_policy_versions] WHERE id=@0', [cloned.version.id]))[0].collectionPolicy, raw)
  }
  const fixed = expectStatus(await saveCollection(stored), 200)
  assert.equal(fixed.collectionState, 'COMPLETE'); assert.deepEqual(fixed.definition, stored.definition)
})

test('Collection policy HTTP: failure to persist the audit event rolls back collection and revision together', async () => {
  const stored = await storedDefinition(completePolicyDefinition()), before = await policySnapshot()
  assertDisposable()
  await ds.query(`CREATE TRIGGER [collection_test_event_failure] ON [payroll_policy_events] AFTER INSERT AS
    BEGIN IF EXISTS (SELECT 1 FROM inserted WHERE eventType='COLLECTION_UPDATED') THROW 51000, 'collection test event failure', 1; END`)
  try { expectStatus(await saveCollection(stored), 500); assert.deepEqual(await policySnapshot(), before) }
  finally { assertDisposable(); await ds.query('DROP TRIGGER [collection_test_event_failure]') }
})

test('Collection policy HTTP: complete calculation consumes the stored order and derives revision evidence on the server', async () => {
  const stored = await withCollection(), before = await policySnapshot(), body = executionBody(stored)
  const first = expectStatus(await request(managerA, 'POST', executionRoute(stored), body), 200)
  assert.equal(first.collectionSource, 'STORED_POLICY_VERSION'); assert.equal(first.sourceValidation, 'CALLER_UNVERIFIED')
  assert.equal(allocation(first.result, 'LOAN_DED').collectedAmount, '400.00'); assert.equal(first.result.finalization.netPay.amount, '500.00')
  assert.equal(first.result.finalization.normalizedInput.collectionOrderSourceRef, `payroll-policy:${stored.policyId}:version:${stored.versionId}:revision:${stored.revision}`)
  assert.match(first.snapshotHash, /^[a-f0-9]{64}$/); assert.deepEqual(await policySnapshot(), before)
  assert.deepEqual(expectStatus(await request(managerA, 'POST', executionRoute(stored), body), 200), first)
  const saved = expectStatus(await saveCollection(stored, collectionPolicy(['LATE_DED', 'LOAN_DED'])), 200)
  const next = { ...stored, revision: saved.revision }
  const second = expectStatus(await request(managerA, 'POST', executionRoute(next), executionBody(next)), 200)
  assert.equal(allocation(second.result, 'LATE_DED').collectedAmount, '100.00'); assert.equal(allocation(second.result, 'LOAN_DED').collectedAmount, '300.00')
  assert.notEqual(first.snapshotHash, second.snapshotHash)
  const replay = require('../src/payroll/payroll-policy-execution').executePayrollPolicy(first.result.snapshot.definition, first.result.snapshot.settings, first.result.snapshot.input)
  assert.deepEqual(plain(replay), first.result)
})

test('Collection policy HTTP: callers cannot override collection settings classifications or server source evidence in execution preview', async () => {
  const stored = await withCollection(), source = executionBody(stored)
  for (const mutate of [body => { body.net = { collectionOrder: ['LATE_DED', 'LOAN_DED'] } }, body => { body.collection = collectionPolicy() },
    body => { body.settings = { minNetGuarantee: 0 } }, body => { body.basis.classifications = [] }, body => { body.basis.sourceRef = 22 },
    body => { body.components.employeeFields.basicSalary = 9 }, body => { body.sources.ledger.installments[0].insufficientMode = 'BLOCK' }]) {
    const body = plain(source); mutate(body); const before = await policySnapshot()
    expectStatus(await request(managerA, 'POST', executionRoute(stored), body), 400); assert.deepEqual(await policySnapshot(), before)
  }
  const staleTier = plain(source); staleTier.sources.tiers.LATE_DED.expectedRevision -= 1
  assert.equal(expectStatus(await request(managerA, 'POST', executionRoute(stored), staleTier), 409).code, 'POLICY_SOURCE_REVISION_CONFLICT')
  expectStatus(await request(viewerA, 'POST', executionRoute(stored), source), 403)
  expectStatus(await request(managerB, 'POST', executionRoute(stored), source), 403)
  expectStatus(await request(managerA, 'POST', executionRoute(stored), { ...source, expectedRevision: stored.revision - 1 }), 409)
})

const liveRoute = stored => `${endpoint}/${stored.policyId}/versions/${stored.versionId}/sources/read`
const liveBody = (stored, extra = {}) => ({ expectedRevision: stored.revision, employeeId: employeeA.id, periodStart: '2026-06-01', periodEnd: '2026-06-30', ...extra })
const readLive = (stored, extra = {}, actor = managerA) => request(actor, 'POST', liveRoute(stored), liveBody(stored, extra))
async function liveTemporaryRows(work) {
  const rows = []
  try {
    return await work(async (entity, values) => { const saved = await repo(entity).save(values); rows.push({ entity, id: saved.id }); return saved })
  } finally {
    for (const row of rows.reverse()) await repo(row.entity).delete(row.id)
  }
}

test('Live source HTTP: captured server rows expose gaps without financial writes or invented salary history', async () => {
  const stored = await withCollection(), before = await policySnapshot()
  const result = expectStatus(await readLive(stored), 200), snap = result.snapshot
  assert.equal(result.readOnly, true); assert.equal(result.sourceValidation, 'SERVER_READ_PARTIAL')
  assert.equal(result.executionReady, false); assert.equal(result.approvalEligible, false); assert.equal(result.persisted, false)
  assert.equal(result.capturedBy, managerA.id); assert.equal(snap.employee.id, employeeA.id)
  assert.equal(snap.policy.version.id, stored.versionId); assert.equal(snap.policy.revision, stored.revision)
  assert.equal(snap.sections.compensation.state, 'MISSING'); assert.equal(snap.sections.attendance.state, 'UNSUPPORTED')
  assert.equal(snap.sections.employment.state, 'AVAILABLE')
  assert.equal(snap.sections.compensation.data.current.basicSalary, '9000.00')
  assert.equal(snap.sections.compensation.data.datedSegments, null)
  assert.equal(snap.sections.installments.state, 'AVAILABLE'); assert.equal(snap.sections.credits.state, 'AVAILABLE')
  assert.ok(snap.sections.installments.sourceRefs.length > 0); assert.ok(snap.sections.credits.sourceRefs.length > 0)
  assert.ok(snap.blockers.some(row => row.code === 'LIVE_SOURCE_EXECUTION_NOT_CONNECTED'))
  assert.match(result.contentHash, /^[a-f0-9]{64}$/)
  assert.equal(require('../src/payroll/payroll-live-source-contract').payrollLiveSourceContent(snap).contentHash, result.contentHash)
  assert.deepEqual(await policySnapshot(), before)
})

test('Live source HTTP: employee scope remains independent of a global or branch policy and wildcard permissions', async () => {
  const stored = await withCollection(), global = await storedDefinition(completePolicyDefinition(), {}, admin, { branchId: null })
  for (const actor of [null, viewerA, noPermission, unassigned, managerB]) expectStatus(await readLive(stored, {}, actor), actor ? 403 : 401)
  for (const actor of [managerA, starA]) {
    expectStatus(await readLive(global, { employeeId: employeeB.id }, actor), 403)
    expectStatus(await readLive(global, { employeeId: employeeA.id }, actor), 200)
  }
  expectStatus(await readLive(global, { employeeId: employeeB.id }, admin), 200)
  expectStatus(await readLive(stored, { employeeId: 2147483647 }, managerA), 404)
  expectStatus(await readLive({ ...stored, versionId: global.versionId }), 404)
})

test('Live source HTTP: only employee period and expected revision are accepted; malformed periods never load sources', async () => {
  const stored = await withCollection(), before = await financialSnapshot()
  for (const patch of [{ employeeId: '1' }, { employeeId: 0 }, { employeeId: 2147483648 }, { expectedRevision: null },
    { periodStart: '2026-02-29' }, { periodStart: '2026-06-31' }, { periodEnd: '2026-05-31' }, { periodEnd: '2026-07-03' },
    { salary: { basicSalary: '100' } }, { sources: {} }, { referenceRunId: 1 }, { sourceValidation: 'TRUSTED' }, { policyId: stored.policyId }]) expectStatus(await readLive(stored, patch), 400)
  assert.equal(expectStatus(await readLive(stored, { expectedRevision: stored.revision - 1 }), 409).code, 'POLICY_VERSION_CONFLICT')
  assert.deepEqual(await financialSnapshot(), before)
})

test('Live source HTTP: identical reads retain content fingerprint and policy edits invalidate revision instead of mixing snapshots', async () => {
  const stored = await withCollection()
  const first = expectStatus(await readLive(stored), 200), second = expectStatus(await readLive(stored), 200)
  assert.equal(first.contentHash, second.contentHash); assert.deepEqual(first.snapshot, second.snapshot)
  const saved = expectStatus(await saveCollection(stored, collectionPolicy(['LATE_DED', 'LOAN_DED'])), 200)
  expectStatus(await readLive(stored), 409)
  const next = expectStatus(await readLive({ ...stored, revision: saved.revision }), 200)
  assert.notEqual(next.contentHash, first.contentHash)
  assert.deepEqual(next.snapshot.policy.collection.collectionOrder, ['LATE_DED', 'LOAN_DED'])
})

test('Live source HTTP: missing policy definition and out-of-range dates remain visible diagnostics without activation', async () => {
  const initial = await create({ effectiveFrom: '2026-07-01' }, managerA)
  const stored = { policyId: initial.policy.id, versionId: initial.versions[0].id, revision: 1 }
  const before = await policySnapshot(), result = expectStatus(await readLive(stored), 200)
  assert.equal(result.snapshot.policy.definitionStatus, 'MISSING')
  for (const code of ['LIVE_POLICY_INCOMPLETE','LIVE_POLICY_NOT_PUBLISHED','LIVE_POLICY_PERIOD_MISMATCH']) assert.ok(result.snapshot.blockers.some(row => row.code === code), code)
  assert.deepEqual(await policySnapshot(), before)
})

test('Live source HTTP: compensation and CREDIT amounts larger than safe cents remain exact SQL strings', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const credit = await save('EmployeeObligation', { employeeId: employeeB.id, type: 'CREDIT', category: 'bonus', amount: 1, label: 'exact source fixture', status: 'PENDING', effectiveDate: '2026-06-01' })
    await ds.query('UPDATE [employee_obligations] SET amount=CAST(@0 AS decimal(18,2)) WHERE id=@1', ['90071992547409.93', credit.id])
    await ds.query('UPDATE [employees] SET basicSalary=CAST(@0 AS decimal(18,2)) WHERE id=@1', ['90071992547409.93', employeeB.id])
    try {
      const result = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200)
      assert.equal(result.snapshot.sections.compensation.data.current.basicSalary, '90071992547409.93')
      const row = result.snapshot.sections.credits.data.entries.find(row => row.id === credit.id)
      assert.equal(row.amount, '90071992547409.93'); assert.equal(result.snapshot.sections.credits.state, 'AVAILABLE')
      assert.equal(result.executionReady, false)
    } finally { await ds.query('UPDATE [employees] SET basicSalary=CAST(@0 AS decimal(18,2)) WHERE id=@1', ['9000.00', employeeB.id]) }
  })
})

test('Live source HTTP: legacy approved overtime is explicitly unpriced while raw invalid approval JSON does not crash the read', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const ot = await save('OvertimeEntry', { employeeId: employeeB.id, date: '2026-06-08', source: 'PRE_REQUESTED', status: 'APPROVED', payableHours: 1, hoursRequested: 1, rate: 1.5 })
    const first = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200)
    assert.equal(first.snapshot.sections.overtime.state, 'UNSUPPORTED'); assert.equal(first.snapshot.sections.overtime.data.totals, null)
    await ds.query('UPDATE [overtime_entries] SET calculationSnapshot=@0 WHERE id=@1', ['{broken', ot.id])
    const second = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200)
    assert.equal(second.snapshot.sections.overtime.state, 'INVALID'); assert.notEqual(second.contentHash, first.contentHash)
  })
})

test('Live source HTTP: unpaid DEBIT remains unsupported and future CREDIT remains excluded instead of disappearing', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const debit = await save('EmployeeObligation', { employeeId: employeeB.id, type: 'DEBIT', category: 'fine', amount: 19.75, label: 'debit fixture', status: 'PENDING', effectiveDate: null })
    const future = await save('EmployeeObligation', { employeeId: employeeB.id, type: 'CREDIT', category: 'bonus', amount: 50, label: 'future fixture', status: 'PENDING', effectiveDate: '2026-07-01' })
    const result = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200)
    assert.equal(result.snapshot.sections.otherDebits.state, 'UNSUPPORTED')
    assert.ok(result.snapshot.sections.otherDebits.data.entries.some(row => row.id === debit.id))
    assert.ok(result.snapshot.sections.credits.data.excluded.some(row => row.id === future.id))
    assert.equal(result.snapshot.sections.credits.data.totalEligible, '0.00')
  })
})

test('Live source HTTP: shared financial lock waits for a source writer and returns the committed coherent value', async () => {
  const stored = await withCollection(), runner = ds.createQueryRunner()
  let pending, committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const [{ lockResult }] = await runner.query(`DECLARE @result int;
      EXEC @result=sys.sp_getapplock @Resource=@0, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000;
      SELECT @result AS lockResult;`, [`hr:employee-finance:${employeeB.id}`])
    assert.ok(lockResult >= 0)
    await runner.query('UPDATE [employees] SET basicSalary=4321.09 WHERE id=@0', [employeeB.id])
    pending = readLive(stored, { employeeId: employeeB.id }, admin)
    const deadline = Date.now() + 6000
    let waiters = []
    while (Date.now() < deadline) {
      waiters = (await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database)
        .query("SELECT session_id,blocking_session_id,wait_type FROM sys.dm_exec_requests WHERE database_id=DB_ID(@testDatabase) AND blocking_session_id=@blocker AND wait_type LIKE 'LCK%'")).recordset
      if (waiters.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiters.length, 'Live reader did not wait for the employee financial lock')
    await runner.commitTransaction(); committed = true
    const result = expectStatus(await pending, 200)
    assert.equal(result.snapshot.sections.compensation.data.current.basicSalary, '4321.09')
    assert.match(result.consistency, /^SERIALIZABLE/)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    if (pending) await Promise.allSettled([pending])
    await runner.release()
    await ds.query('UPDATE [employees] SET basicSalary=9000.00 WHERE id=@0', [employeeB.id])
  }
})

test('Live source HTTP: real installment continuations preserve principal and held source is excluded even when current deduction is zero', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const loan = await save('Loan', { employeeId: employeeB.id, amount: 100, status: 'DISBURSED', disbursedAt: new Date('2026-05-01T08:00:00Z') })
    const parent = await save('LoanInstallment', { loanId: loan.id, dueDate: '2026-06-01', originalDueDate: '2026-06-01', amount: 100, paidAmount: '40.00', paid: false, financialStatus: 'PARTIAL', financialRevision: 2 })
    const child = await save('LoanInstallment', { loanId: loan.id, parentInstallmentId: parent.id, dueDate: '2026-07-01', originalDueDate: '2026-06-01', amount: 60, paidAmount: '0.00', paid: false, financialStatus: 'DUE', financialRevision: 1 })
    const june = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200).snapshot.sections.installments
    assert.equal(june.state, 'AVAILABLE'); assert.equal(june.data.totals.remainingAmount, '60.00'); assert.equal(june.data.totals.eligibleAmount, '0.00')
    const july = { employeeId: employeeB.id, periodStart: '2026-07-01', periodEnd: '2026-07-31' }
    const before = expectStatus(await readLive(stored, july, admin), 200).snapshot.sections.installments
    assert.equal(before.data.totals.eligibleAmount, '60.00'); assert.equal(before.data.positions.find(row => row.id === parent.id).remainingAmount, '0.00')
    const run = await save('PayrollRun', { name: 'held source fixture', branchId: branchB.id, scopeType: 'BRANCH', scopeIds: JSON.stringify([branchB.id]), employeeIds: JSON.stringify([employeeB.id]), period: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'APPROVED', snapshotVersion: 1 })
    await save('LoanInstallmentAllocation', { installmentId: child.id, employeeId: employeeB.id, payrollRunId: run.id, payrollSnapshotVersion: 1, sourceRevision: 1,
      deductedAmount: '0.00', carriedAmount: '60.00', continuationDueDate: '2026-08-01', outcome: 'SKIPPED', status: 'HELD',
      sourceSnapshot: JSON.stringify({ id: child.id, loanId: loan.id, employeeId: employeeB.id, dueDate: child.dueDate, originalDueDate: child.originalDueDate, amount: '60.00', paidAmount: '0.00', remainingAmount: '60.00', financialStatus: 'DUE', financialRevision: 1, parentInstallmentId: parent.id }), createdByUserId: admin.id })
    const after = expectStatus(await readLive(stored, july, admin), 200).snapshot.sections.installments
    assert.equal(after.state, 'AVAILABLE'); assert.equal(after.data.totals.eligibleAmount, '0.00'); assert.equal(after.data.totals.remainingAmount, '60.00')
    assert.ok(after.data.excluded.find(row => row.id === child.id).claimRefs.length > 0)
  })
})

test('Live source HTTP: frozen approved overtime amount is read from SQL unchanged and an approved payroll claim removes its candidacy', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const date = '2026-06-08'
    const evidence = { fingerprint: 'a'.repeat(64), employeeId: employeeB.id, workDate: date, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', policy: { multiplier: 1 } }
    const approval = { schemaVersion: 1, employeeId: employeeB.id, workDate: date, approvedAt: '2026-06-09T10:00:00Z', approverId: admin.id,
      approvedMinutes: 60, hours: 1, multiplier: 1, hourlyRate: 75, amount: 75, wageBase: 18000,
      wageComponents: [{ code: 'BASIC', amount: 18000 }], monthlyDays: 30, dailyHours: 8, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', evidenceFingerprint: evidence.fingerprint, evidence, originalPeriod: '2026-06', deferredFromRunId: null }
    const ot = await save('OvertimeEntry', { employeeId: employeeB.id, date, source: 'PRE_REQUESTED', status: 'APPROVED', payableHours: 1, hoursRequested: 1, rate: 1,
      calculationSnapshot: { schemaVersion: 1, approval }, approvedMinutes: 60, hourlyRateSnapshot: 75, amountSnapshot: 75, originalPeriod: '2026-06' })
    const before = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200).snapshot.sections.overtime
    assert.equal(before.state, 'AVAILABLE'); assert.equal(before.data.totals.eligibleAmount, '75.00'); assert.equal(before.data.rows[0].approvedAmount, '75.00')
    const run = await save('PayrollRun', { name: 'OT claim fixture', branchId: branchB.id, scopeType: 'BRANCH', scopeIds: JSON.stringify([branchB.id]), employeeIds: JSON.stringify([employeeB.id]), period: '2026-06', startDate: '2026-06-01', endDate: '2026-06-30', status: 'APPROVED', snapshotVersion: 1 })
    await ds.query('UPDATE [overtime_entries] SET payrollRunId=@0 WHERE id=@1', [run.id, ot.id])
    const inconsistent = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200).snapshot.sections.overtime
    assert.equal(inconsistent.state, 'INVALID'); assert.equal(inconsistent.data.totals, null)
    assert.equal(inconsistent.data.rows[0].payrollRunId, run.id)
    assert.ok(inconsistent.issues.some(issue => issue.code === 'OT_PAYMENT_LINK_INVALID'))
    await ds.query('UPDATE [overtime_entries] SET payrollRunId=NULL WHERE id=@0', [ot.id])
    await save('PayrollItem', { runId: run.id, employeeId: employeeB.id, basicSalary: 9000, allowances: 0, overtimeHours: 1, overtimeAmount: 75, netPay: 9075, payMethod: 'cash', breakdown: JSON.stringify({ overtimeEntryIds: [ot.id] }) })
    const after = expectStatus(await readLive(stored, { employeeId: employeeB.id }, admin), 200).snapshot.sections.overtime
    assert.equal(after.state, 'AVAILABLE'); assert.equal(after.data.totals.eligibleAmount, '0.00')
    assert.equal(after.data.rows[0].approvedAmount, '75.00'); assert.equal(after.data.rows[0].eligible, false)
    assert.equal(after.data.rows[0].claims[0].id, run.id)
  })
})

const salaryRoute = id => `/payroll/employees/${id}/salary-history`
const salarySegment = (extra = {}) => ({ effectiveFrom: '2026-06-01', effectiveTo: null, currency: 'SAR', basicSalary: '9000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', ...extra })
async function salaryView(id = employeeA.id, actor = admin) { return expectStatus(await request(actor, 'GET', salaryRoute(id)), 200) }
function salaryBody(view, segments = [salarySegment()]) { return { expectedRevision: view.revision, expectedCurrentSourceHash: view.currentSourceHash, reason: 'إثبات راتب حسب قرار الاختبار', evidenceReference: 'TEST-CONTRACT-001', segments } }
// قاعدة المالك (الخطوة 13): راتب المسير يثبت بشهر المسير كاملًا عبر المسار الشهري؛ التاريخ اليومي لا يثبت استحقاق الشهر
const monthlySalaryRoute = id => `${salaryRoute(id)}/monthly`
const salaryMonth = (extra = {}) => ({ effectivePayrollPeriod: '2026-06', effectiveToPayrollPeriod: null, currency: 'SAR', basicSalary: '9000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', ...extra })
function monthlySalaryBody(view, periods = [salaryMonth()]) { return { expectedRevision: view.revision, expectedCurrentSourceHash: view.currentSourceHash, reason: 'إثبات راتب شهر المسير حسب قرار الاختبار', evidenceReference: 'TEST-CONTRACT-001', periods } }
async function salaryFixture(action) {
  assertDisposable()
  // المسار الشهري يشتق حدود الشهور من payroll.cycle_start_day المحفوظ؛ يُضاف مؤقتًا إن غاب ويُحذف بعد الاختبار
  const cycle = await repo('RequestsConfig').findOneBy({ key: 'payroll.cycle_start_day' })
  if (!cycle) await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '1' })
  try { await action() } finally {
    await ds.query('DELETE FROM employee_salary_history WHERE versionId IN (SELECT id FROM employee_salary_history_versions WHERE employeeId IN (@0,@1))', [employeeA.id, employeeB.id])
    await ds.query('DELETE FROM employee_salary_history_versions WHERE employeeId IN (@0,@1)', [employeeA.id, employeeB.id])
    assert.equal((await ds.query('SELECT COUNT(*) AS n FROM employee_salary_history_versions WHERE employeeId IN (@0,@1)', [employeeA.id, employeeB.id]))[0].n, 0)
    if (!cycle) await repo('RequestsConfig').delete({ key: 'payroll.cycle_start_day' })
  }
}
test('Salary history HTTP: empty read is explicit and does not backfill employee values or dates', async () => {
  const view = await salaryView()
  assert.equal(view.revision, 0); assert.equal(view.version, null); assert.deepEqual(view.segments, [])
  assert.equal(view.current.basicSalary, '9000.00'); assert.match(view.currentSourceHash, /^[a-f0-9]{64}$/)
  assert.equal(view.capabilities.canEdit, true)
  assert.equal((await salaryView(employeeA.id, viewerA)).capabilities.canEdit, false)
})
test('Salary history HTTP: authority, wildcard branch scope, raw strict DTO and all six explicit amounts are enforced', async () => salaryFixture(async () => {
  const view = await salaryView(), body = salaryBody(view)
  for (const actor of [managerA, viewerA, noPermission, managerB, unassigned]) expectStatus(await request(actor, 'POST', salaryRoute(employeeA.id), body), 403)
  expectStatus(await request(null, 'GET', salaryRoute(employeeA.id)), 401)
  expectStatus(await request(starA, 'GET', salaryRoute(employeeB.id)), 403)
  expectStatus(await request(starA, 'POST', salaryRoute(employeeB.id), body), 403)
  expectStatus(await request(unassigned, 'GET', salaryRoute(employeeA.id)), 403)
  const bad = [ { ...body, employeeId: employeeB.id }, { ...body, approvedBy: admin.id }, { ...body, expectedRevision: '0' }, { ...body, reason: ' ' }, { ...body, evidenceReference: '' }, { ...body, segments: [] },
    { ...body, segments: [salarySegment({ id: 1 })] }, { ...body, segments: [salarySegment({ basicSalary: 100 })] }, { ...body, segments: [salarySegment({ basicSalary: '1.001' })] },
    { ...body, segments: [salarySegment({ effectiveFrom: '2026-02-30' })] }, { ...body, segments: [salarySegment(), salarySegment({ effectiveFrom: '2026-07-01' })] } ]
  const missing = salarySegment(); delete missing.phoneAllowance; bad.push({ ...body, segments: [missing] })
  for (const invalid of bad) expectStatus(await request(admin, 'POST', salaryRoute(employeeA.id), invalid), 400)
  assert.equal((await salaryView()).revision, 0)
  const saved = expectStatus(await request(starA, 'POST', salaryRoute(employeeA.id), body), 201)
  assert.equal(saved.revision, 1)
}))
test('Salary history HTTP: immutable exact decimal monthly revision feeds one payroll-month salary without day weighting', async () => salaryFixture(async () => {
  const stored = await withCollection(), view = await salaryView()
  // مايو 6000 ويونيو 9000: مسير يونيو يأخذ راتب شهره كاملًا ولا يقسم بين الراتب القديم والجديد
  const periods = [salaryMonth({ effectivePayrollPeriod: '2026-05', effectiveToPayrollPeriod: '2026-05', basicSalary: '6000.00' }), salaryMonth({ effectivePayrollPeriod: '2026-06', basicSalary: '9000.00' })]
  const saved = expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(view, periods)), 201)
  assert.equal(saved.payrollChanged, false); assert.equal(saved.retroAdjustmentsCreated, false)
  const sources = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections
  assert.equal(sources.compensation.state, 'AVAILABLE', JSON.stringify(sources.compensation.issues))
  assert.equal(sources.compensation.data.referencePeriod, '2026-06'); assert.equal(sources.compensation.data.selectedSalary.effectivePayrollPeriod, '2026-06')
  assert.deepEqual(sources.compensation.data.datedSegments.map(row => [row.from, row.to, row.salary.basicSalary]), [['2026-06-01', '2026-06-30', '9000.00']])
  const { buildPayrollInputFacts } = require('../src/payroll/payroll-input-facts')
  const settings = { ...stored.settings, defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null,
    baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 9, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'FAIL_ROW',
    maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
  // الجدول هنا دليل اختبار صريح للنواة؛ قارئ الجدول الحي لا يدعي اكتمال التقويم.
  const facts = buildPayrollInputFacts({ periodStart: '2026-06-01', periodEnd: '2026-06-30', hireDate: '2020-01-01', coverageStart: '2026-06-01', coverageEnd: '2026-06-30', coverageSourceRef: 'test:coverage',
    salarySegments: sources.compensation.data.datedSegments.map(({ currency, ...row }) => row), scheduledWorkDates: ['2026-06-01'], scheduleSourceRef: 'test:explicit-schedule' }, settings)
  const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
  // راتب الشهر كاملًا (9000) لا متوسط أيام 6000/9000
  assert.equal(new PayrollDecimal(BigInt(facts.monthlyEquivalent.components.basicSalary.exact.numerator), BigInt(facts.monthlyEquivalent.components.basicSalary.exact.denominator)).canonical(), '9000')
  // شهر 2026-07 دخل مسيرًا مصروفًا في تهيئة الملف: تغيير راتبه من السجل مرفوض، والمراجعة الكاملة تبقيه كما هو ولا تعدل إلا يونيو
  const touchesPaidMonth = await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(saved, [periods[0], salaryMonth({ basicSalary: '9999999999999999.99', phoneAllowance: '0.29' })]))
  assert.equal(expectStatus(touchesPaidMonth, 409).code, 'SALARY_HISTORY_CLOSED_PERIOD')
  const second = expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(saved, [periods[0],
    salaryMonth({ effectivePayrollPeriod: '2026-06', effectiveToPayrollPeriod: '2026-06', basicSalary: '9999999999999999.99', phoneAllowance: '0.29' }),
    salaryMonth({ effectivePayrollPeriod: '2026-07', basicSalary: '9000.00' })])), 201)
  const june = second.segments.find(row => row.effectivePayrollPeriod === '2026-06')
  assert.equal(june.basicSalary, '9999999999999999.99'); assert.equal(june.phoneAllowance, '0.29')
  const current = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
  assert.equal(current.data.datedSegments[0].salary.basicSalary, '9999999999999999.99')
  assert.equal((await ds.query('SELECT CAST(basicSalary AS nvarchar(80)) AS amount FROM employee_salary_history WHERE versionId=@0 AND sequence=1', [saved.version.id]))[0].amount, '6000.00')
}))
test('Salary history HTTP: full revisions retain gaps instead of inheriting prior wages or generating retro payments', async () => salaryFixture(async () => {
  const stored = await withCollection(), first = expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(await salaryView())), 201)
  const original = (await ds.query('SELECT (SELECT * FROM employee_salary_history_versions WHERE id=@0 FOR JSON PATH) AS text', [first.version.id]))[0].text
  // المراجعة الثانية كاملة تبدأ من يوليو: شهر يونيو يبقى فجوة ولا يرث راتب المراجعة السابقة
  const second = expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(first, [salaryMonth({ effectivePayrollPeriod: '2026-07' })])), 201)
  assert.equal(second.revision, 2)
  const section = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
  assert.equal(section.state, 'MISSING'); assert.deepEqual(section.data.missingPayrollPeriods, ['2026-06']); assert.equal(section.data.datedSegments, null)
  assert.ok(section.issues.some(row => row.code === 'SALARY_PAYROLL_PERIOD_GAP'), JSON.stringify(section.issues))
  assert.equal((await ds.query('SELECT (SELECT * FROM employee_salary_history_versions WHERE id=@0 FOR JSON PATH) AS text', [first.version.id]))[0].text, original)
  // قيد رجعي موثق يمكن قراءته، لكن المسير المصروف السابق لم يتغير ولم ينشأ قيد فروقات.
  assert.equal(second.payrollChanged, false); assert.equal(second.retroAdjustmentsCreated, false)
}))
test('Salary history HTTP: salary and currency drift invalidate old evidence and reject stale confirmation', async () => salaryFixture(async () => {
  const stored = await withCollection(), view = await salaryView()
  const saved = expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(view)), 201)
  try {
    await ds.query('UPDATE employees SET basicSalary=9100.01 WHERE id=@0', [employeeA.id])
    let section = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
    assert.equal(section.state, 'UNSUPPORTED'); assert.equal(section.data.datedSegments, null); assert.ok(section.issues.some(row => row.code === 'COMPENSATION_CURRENT_SOURCE_CHANGED'))
    expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(saved)), 409)
    await ds.query('UPDATE employees SET basicSalary=9000.00,currency=@1 WHERE id=@0', [employeeA.id, view.current.currency === 'SAR' ? 'EGP' : 'SAR'])
    section = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
    assert.ok(section.issues.some(row => row.code === 'COMPENSATION_CURRENT_SOURCE_CHANGED'))
  } finally { await ds.query('UPDATE employees SET basicSalary=9000.00,currency=@1 WHERE id=@0', [employeeA.id, view.current.currency]) }
}))
test('Salary history HTTP: employee financial serialization lets only one concurrent revision win', async () => salaryFixture(async () => {
  const view = await salaryView(), body = salaryBody(view)
  const replies = await Promise.all([request(admin, 'POST', salaryRoute(employeeA.id), body), request(admin, 'POST', salaryRoute(employeeA.id), { ...body, reason: 'قرار متزامن ثان' })])
  assert.deepEqual(replies.map(reply => reply.status).sort(), [201, 409])
  assert.equal((await salaryView()).revision, 1)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM employee_salary_history_versions WHERE employeeId=@0', [employeeA.id]))[0].n, 1)
}))
test('Salary history HTTP: corrupted persisted amount fails hash validation and cannot become a trusted source', async () => salaryFixture(async () => {
  const stored = await withCollection(), saved = expectStatus(await request(admin, 'POST', salaryRoute(employeeA.id), salaryBody(await salaryView())), 201)
  await ds.query('UPDATE employee_salary_history SET basicSalary=1.00 WHERE versionId=@0', [saved.version.id])
  expectStatus(await request(admin, 'GET', salaryRoute(employeeA.id)), 409)
  const section = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
  assert.equal(section.state, 'INVALID'); assert.equal(section.data.datedSegments, null)
}))
test('Salary history HTTP: policy currency mismatch does not convert currencies or expose executable segments', async () => salaryFixture(async () => {
  const stored = await withCollection()
  expectStatus(await request(admin, 'POST', monthlySalaryRoute(employeeA.id), monthlySalaryBody(await salaryView(), [salaryMonth({ currency: 'EGP' })])), 201)
  const section = expectStatus(await readLive(stored, {}, admin), 200).snapshot.sections.compensation
  assert.equal(section.state, 'UNSUPPORTED'); assert.equal(section.data.datedSegments, null)
  assert.ok(section.issues.some(row => row.code === 'COMPENSATION_POLICY_CURRENCY_MISMATCH'))
}))

test('Schedule source HTTP: explicit dated rule versions and day override survive future edits without disclosing other branch exceptions', async () => {
  const stored = await withCollection()
  await liveTemporaryRows(async save => {
    const shift = await save('Shift', { name: 'TEST_DATED_DAY', startTime: '10:00', endTime: '19:00', flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540 })
    const override = await save('Shift', { name: 'TEST_DATED_OVERRIDE', startTime: '06:00', endTime: '15:00', flexEnabled: false, flexWindowMinutes: null, requiredWorkMinutes: 540 })
    const old = await save('AttendanceRuleVersion', { sourceType: 'SHIFT', sourceId: shift.id, version: 1, effectiveFrom: '2026-06-01', legacyBaseline: false, actorUserId: admin.id, reason: 'قاعدة تاريخية مثبتة', snapshot: { name: shift.name, startTime: '09:00', endTime: '18:00', isActive: true, flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540 } })
    await save('AttendanceRuleVersion', { sourceType: 'SHIFT', sourceId: shift.id, version: 2, effectiveFrom: '2026-07-01', legacyBaseline: false, actorUserId: admin.id, reason: 'تغيير مستقبلي', snapshot: { ...old.snapshot, startTime: '10:00', endTime: '19:00' } })
    await save('AttendanceRuleVersion', { sourceType: 'SHIFT', sourceId: override.id, version: 1, effectiveFrom: '2026-06-01', legacyBaseline: false, actorUserId: admin.id, reason: 'استثناء مثبت', snapshot: { name: override.name, startTime: '06:00', endTime: '15:00', isActive: true, flexEnabled: false, flexWindowMinutes: null, requiredWorkMinutes: 540 } })
    await save('AttendanceRuleVersion', { sourceType: 'EMPLOYEE', sourceId: employeeA.id, version: 1, effectiveFrom: '2026-06-01', legacyBaseline: false, actorUserId: admin.id, reason: 'اختيار الموظف', snapshot: { workScheduleId: null, flexOverrideMode: 'INHERIT' } })
    await save('ScheduleEntry', { employeeId: employeeA.id, weekStart: '2026-06-14', shiftId: shift.id, shiftName: shift.name, startTime: '10:00', endTime: '19:00' })
    await save('ScheduleDayOverride', { employeeId: employeeA.id, date: '2026-06-16', shiftId: override.id, shiftName: override.name, startTime: '06:00', endTime: '15:00' })
    const privateRule = await save('ScheduleExceptionRule', { name: 'PRIVATE_OTHER_BRANCH_EXCEPTION', branchId: branchB.id, weekday: 'MON', occurrence: 'ALL', effect: 'OFF', isActive: true })
    const section = expectStatus(await readLive(stored, { periodStart: '2026-06-15', periodEnd: '2026-06-20' }, managerA), 200).snapshot.sections.schedule
    // قاعدة الدوام مؤرخة لكن التقويم بلا نسخة مؤرخة لفرع الموظف في أيام الفترة: الحالة MISSING ولا تُستنتج أيام عمل من الجداول الحالية
    assert.equal(section.state, 'MISSING', JSON.stringify(section.issues))
    assert.ok(section.data.days.every(row => row.calendarState === 'MISSING' && row.issues.some(issue => issue.code === 'CALENDAR_VERSION_MISSING')), JSON.stringify(section.issues))
    assert.equal(section.data.scheduledWorkDates, null); assert.equal(section.data.historicalCalendarComplete, false)
    assert.equal(section.data.days[0].timingState, 'AVAILABLE'); assert.equal(section.data.days[0].sourceRule.versionId, old.id)
    assert.equal(section.data.days[0].timing.startTime, '09:00'); assert.equal(section.data.days[0].timing.flexWindowMinutes, 60)
    assert.equal(section.data.days[1].assignment.kind, 'OVERRIDE'); assert.equal(section.data.days[1].timing.startTime, '06:00'); assert.equal(section.data.days[1].timing.flexEnabled, false)
    assert.ok(section.data.days.every(row => row.scheduled === null && row.timingState === 'AVAILABLE'))
    assert.ok(section.data.calendarEvidence.exceptions.every(row => row.id !== privateRule.id)); assert.doesNotMatch(JSON.stringify(section), /PRIVATE_OTHER_BRANCH_EXCEPTION/)
  })
})
