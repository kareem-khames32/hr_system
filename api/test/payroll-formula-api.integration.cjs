// اختبارات HTTP للغة معادلات الرواتب: كل النسخ والبيانات التجريبية تُجهز قبل المقارنة، ولا ينفذ أي مسير.
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
const database = `hr_payroll_formula_api_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-formula-api-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary
const fixtures = {}
const catalogVersion = 'SRS_V1_20260913'
const settingFields = ['defaultPeriodType', 'cycleStartDay', 'cycleEndMode', 'cycleEndDay', 'baseDaysBasis', 'monthlyDays',
  'dailyHours', 'rateBase', 'roundingMode', 'roundingScale', 'divisionByZeroMode', 'maxDeductionPctOfGross', 'minNetGuarantee',
  'netFloorPct', 'carryOverExcess', 'skipAttendance', 'lateDeductionEnabled', 'currency']
const scalarCodes = ['BASE_SALARY', 'ALLOWANCES_TOTAL', 'GROSS_SALARY', 'BASE_DAYS_BASIS', 'PERIOD_DAYS', 'COVERED_DAYS',
  'DAY_RATE', 'STANDARD_DAY_HOURS', 'HOUR_RATE', 'MINUTE_RATE', 'LATE_MINUTES', 'LATE_INCIDENTS', 'SHORT_MINUTES',
  'ABSENCE_DAYS', 'EXCUSED_ABSENCE_DAYS', 'UNPAID_LEAVE_DAYS', 'PAID_LEAVE_DAYS', 'PRESENT_DAYS', 'WORKED_MINUTES',
  'REQUIRED_MINUTES', 'OT_HOURS_REGULAR', 'OT_HOURS_RESTDAY', 'OT_HOURS_HOLIDAY', 'OT_HOURS_NIGHT', 'OT_HOURS_TOTAL',
  'OT_AMOUNT', 'BONUS_TOTAL', 'TYPED_DEDUCTIONS_TOTAL', 'ADVANCE_BALANCE', 'ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD',
  'IS_ATTENDANCE_EXEMPT', 'SENIORITY_MONTHS']
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter

function assertDisposable() {
  assert.match(database, /^hr_payroll_formula_api_test_[a-f0-9]{16}$/)
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
async function databaseSnapshot() {
  return { financial: await financialSnapshot(), policies: await policySnapshot(),
    config: plain(await repo('RequestsConfig').find({ order: { key: 'ASC' } })) }
}
function formulaRoute(fixture, action) { return `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/formulas/${action}` }
async function validate(formula, fields = {}, actor = admin, fixture = fixtures.standard) {
  return request(actor, 'POST', formulaRoute(fixture, 'validate'), { formula, ...fields })
}
async function evaluate(formula, fields = {}, actor = admin, fixture = fixtures.standard) {
  return request(actor, 'POST', formulaRoute(fixture, 'test'), { formula, ...fields })
}
async function validateOrder(components, fields = {}, actor = admin, fixture = fixtures.standard) {
  return request(actor, 'POST', `${endpoint}/${fixture.policyId}/versions/${fixture.versionId}/components/validate-order`, { components, ...fields })
}
function decimal(text) {
  assert.equal(typeof text, 'string', `Decimal response must remain a string: ${text}`)
  assert.match(text, /^-?\d+(?:\.\d+)?$/)
  const negative = text.startsWith('-'), [integer, fraction = ''] = text.replace(/^-/, '').split('.')
  const normalized = `${integer.replace(/^0+(?=\d)/, '')}${fraction.replace(/0+$/, '') ? `.${fraction.replace(/0+$/, '')}` : ''}`
  return negative && normalized !== '0' ? `-${normalized}` : normalized
}
function expectDecimal(response, expected, rawExpected) {
  const result = expectStatus(response, 200)
  assert.equal(result.contractVersion, 'SRS_V1')
  assert.equal(result.catalogVersion, catalogVersion)
  assert.equal(decimal(result.value), decimal(expected))
  if (rawExpected !== undefined) assert.equal(decimal(result.rawValue), decimal(rawExpected))
  assert.ok(Array.isArray(result.warnings))
  assert.equal(typeof result.substitutedExpression, 'string')
  return result
}
function expectFormulaError(response) {
  const result = expectStatus(response, 400)
  assert.equal(typeof result.code, 'string')
  assert.equal(typeof result.message, 'string')
  assert.ok(Number.isInteger(result.position) && result.position >= 0, JSON.stringify(result))
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
  const fixture = async (name, settings = {}, actor = admin, fields = {}) => {
    const result = await create({ settings }, actor)
    const source = result.versions[0]
    if (Object.keys(fields).length) await repo('PayrollPolicyVersion').update(source.id, fields)
    fixtures[name] = { policyId: result.policy.id, versionId: source.id }
    return fixtures[name]
  }
  await fixture('standard', { roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING' })
  await fixture('failRow', { roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'FAIL_ROW' })
  await fixture('even', { roundingMode: 'HALF_EVEN', roundingScale: 2 })
  await fixture('floor', { roundingMode: 'FLOOR', roundingScale: 2 })
  await fixture('ceil', { roundingMode: 'CEIL', roundingScale: 2 })
  await fixture('scaleSix', { roundingMode: 'HALF_UP', roundingScale: 6 })
  await fixture('own', {}, managerA)
  await fixture('foreign', {}, managerB)
  await fixture('legacy', {}, admin, { contractVersion: 'LEGACY_V1' })
  await fixture('missing', {}, admin, Object.fromEntries(settingFields.map(field => [field, null])))
  await fixture('invalid', {}, admin, { monthlyDays: 29 })
  const archived = await fixture('archived')
  expectStatus(await request(admin, 'POST', `${endpoint}/${archived.policyId}/archive`, { expectedRevision: 1, reason: 'سياسة مؤرشفة للتجريب بلا حفظ' }), 201)
  // إفساد الافتراضيات بعد إعداد النسخ يثبت أن التقييم لا يقرأها ولا يعيد تفسير النسخة المحفوظة.
  await repo('RequestsConfig').save([{ key: 'payroll.policy.rounding_mode', value: 'CORRUPT_LIVE_CONFIG' },
    { key: 'payroll.policy.division_by_zero_mode', value: 'CORRUPT_LIVE_CONFIG' }])
  canary = await databaseSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await databaseSnapshot(), canary, 'Read-only formula operation mutated database rows') })
after(async t => {
  const errors = []
  try { if (canary) assert.deepEqual(await databaseSnapshot(), canary) } catch (error) { errors.push(error) }
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
    assert.match(path.basename(uploads), /^hr-payroll-formula-api-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('PL-04 API: authenticated closed catalog exposes SRS names with units and stable contract version', async () => {
  const result = expectStatus(await request(admin, 'GET', `${endpoint}/formula-catalog`), 200)
  assert.equal(result.contractVersion, 'SRS_V1')
  assert.equal(result.catalogVersion, catalogVersion)
  assert.ok(Array.isArray(result.variables))
  const codes = result.variables.map(variable => variable.code)
  assert.equal(new Set(codes).size, codes.length)
  for (const code of scalarCodes) assert.ok(codes.includes(code), `Missing SRS scalar ${code}`)
  assert.deepEqual([...codes].sort(), [...scalarCodes].sort())
  for (const code of ['BASIC', 'GROSS', 'LATE_DAYS', 'ABSENT_DAYS']) assert.ok(!codes.includes(code), `Legacy alias leaked into SRS catalog: ${code}`)
  for (const variable of result.variables) {
    assert.match(variable.code, /^[A-Z][A-Z0-9_]*$/)
    assert.equal(typeof variable.unit, 'string')
    assert.ok(variable.unit.length > 0)
    assert.equal(typeof variable.description, 'string')
    assert.ok(variable.description.length > 0)
  }
  assert.deepEqual(result.limits, { textLength: 500, tokens: 200, nesting: 10, components: 200 })
  expectStatus(await request(viewerA, 'GET', `${endpoint}/formula-catalog`), 200)
  expectStatus(await request(null, 'GET', `${endpoint}/formula-catalog`), 401)
  expectStatus(await request(noPermission, 'GET', `${endpoint}/formula-catalog`), 403)
})

test('PL-05 API: validation and test use actual permission and branch guards while permitting read-only global and archived experiments', async () => {
  for (const call of [validate, evaluate]) {
    expectStatus(await call('1 + 2', {}, null), 401)
    expectStatus(await call('1 + 2', {}, noPermission), 403)
    expectStatus(await call('1 + 2', {}, viewerA), 403)
    expectStatus(await call('1 + 2', {}, unassigned), 403)
    for (const actor of [managerA, starA]) {
      expectStatus(await call('1 + 2', {}, actor, fixtures.own), 200)
      expectStatus(await call('1 + 2', {}, actor, fixtures.standard), 200)
      expectStatus(await call('1 + 2', {}, actor, fixtures.archived), 200)
      const denied = expectStatus(await call('1 + 2', {}, actor, fixtures.foreign), 403)
      assert.equal(denied.value, undefined)
      assert.equal(denied.references, undefined)
    }
  }
  const wrong = { policyId: fixtures.standard.policyId, versionId: fixtures.foreign.versionId }
  expectStatus(await validate('1', {}, admin, wrong), 404)
  expectStatus(await evaluate('1', {}, admin, wrong), 404)
})

test('PL-05 API: strict bodies reject forged settings, status, contract, arrays, undeclared symbols and test inputs on validation', async () => {
  for (const fields of [{ status: 'ACTIVE' }, { expectedRevision: 1 }, { contractVersion: 'LEGACY_V1' },
    { catalogVersion: 'EVIL' }, { roundingMode: 'CEIL' }, { divisionByZeroMode: 'ZERO_WITH_WARNING' },
    { settings: { roundingScale: 0 } }, { components: [] }, { kind: 'SCRIPT' }, { symbols: [] },
    { symbols: { components: ['BASE_SALARY'] } }, { symbols: { components: ['ITEM', 'ITEM'] } },
    { symbols: { parameters: ['bad-code'] } }, { symbols: { components: ['ITEM'], parameters: ['ITEM'] } },
    { symbols: { functions: ['SQRT'] } }]) {
    expectStatus(await validate('1', fields), 400)
    expectStatus(await evaluate('1', fields), 400)
  }
  expectStatus(await validate('1', { inputs: { variables: { BASE_SALARY: 1 } } }), 400)
  for (const inputs of [[], { variables: [] }, { variables: { UNKNOWN_INPUT: 5 } },
    { variables: { BASE_SALARY: true } }, { variables: { BASE_SALARY: {} } },
    { variables: { BASE_SALARY: 'NaN' } }, { variables: { BASE_SALARY: 'Infinity' } },
    { variables: { BASE_SALARY: '9'.repeat(61) } }, { variables: { BASE_SALARY: '0'.repeat(81) } },
    { variables: { BASE_SALARY: 9007199254740992 } }, { variables: { BASE_SALARY: '1e3' } },
    { variables: { BASE_SALARY: '1; process.exit()' } }, { components: { UNDECLARED: 5 } },
    { parameters: { UNDECLARED: 5 } }, { typedDeductions: { UNDECLARED: 5 } }, { environment: {} }]) {
    expectStatus(await evaluate('1', { inputs }), 400)
  }
  for (const key of ['constructor', 'prototype', '__proto__']) {
    const badInputs = JSON.parse(`{"variables":{"${key}":1}}`)
    expectStatus(await evaluate('1', { inputs: badInputs }), 400)
    const badBody = JSON.parse(`{"formula":"1","${key}":{}}`)
    expectStatus(await request(admin, 'POST', formulaRoute(fixtures.standard, 'test'), badBody), 400)
  }
})

test('PL-05 API: validate checks SRS references without requiring historical settings; test refuses missing, invalid and legacy contracts', async () => {
  for (const fixture of [fixtures.missing, fixtures.invalid]) {
    const valid = expectStatus(await validate('BASE_SALARY + ALLOWANCES_TOTAL', {}, admin, fixture), 200)
    assert.equal(valid.valid, true)
    assert.equal(valid.contractVersion, 'SRS_V1')
    expectStatus(await evaluate('1', {}, admin, fixture), 409)
  }
  for (const call of [validate, evaluate]) {
    const denied = expectStatus(await call('1', {}, admin, fixtures.legacy), 409)
    assert.equal(typeof denied.code, 'string')
    assert.match(JSON.stringify(denied), /LEGACY|عقد|قديم/)
  }
})

test('PL-05 API: SRS examples validate references and evaluate declared synthetic symbols without saving them', async () => {
  const formula = 'MIN(LATE_MINUTES * MINUTE_RATE * 1.5, DAY_RATE * 0.5)'
  const valid = expectStatus(await validate(formula), 200)
  assert.equal(valid.valid, true)
  assert.equal(valid.kind, 'AMOUNT')
  assert.equal(valid.catalogVersion, catalogVersion)
  for (const name of ['LATE_MINUTES', 'MINUTE_RATE', 'DAY_RATE']) assert.ok(JSON.stringify(valid.references).includes(name))
  const result = expectDecimal(await evaluate(formula, { inputs: { variables: { LATE_MINUTES: 75, MINUTE_RATE: '0.555556', DAY_RATE: 300 } } }), '62.50', '62.50005')
  assert.equal(result.formula, formula)
  const symbols = { components: ['PREVIOUS'], parameters: ['ABSENCE_FACTOR'], typedDeductions: ['QUALITY'] }
  const symbolic = 'COMP[PREVIOUS] + IF(ABSENCE_DAYS > 0, ABSENCE_DAYS * DAY_RATE * PARAM[ABSENCE_FACTOR], 0) - TYPED_DEDUCTION[QUALITY]'
  expectStatus(await validate(symbolic, { symbols }), 200)
  expectDecimal(await evaluate(symbolic, { symbols, inputs: { variables: { ABSENCE_DAYS: 2, DAY_RATE: '100.25' },
    components: { PREVIOUS: '25.5' }, parameters: { ABSENCE_FACTOR: '1.5' }, typedDeductions: { QUALITY: '10' } } }), '316.25')
})

test('PL-05 API: unknown names and undeclared indexed symbols reject with a position even inside an unselected branch', async () => {
  for (let index = 0; index < 10; index += 1) {
    const name = `UNKNOWN_${crypto.randomBytes(4).toString('hex').toUpperCase()}`
    const error = expectFormulaError(await validate(`BASE_SALARY + ${name}`))
    assert.ok(JSON.stringify(error).includes(name))
  }
  for (const formula of ['COMP[MISSING]', 'PARAM[MISSING]', 'TYPED_DEDUCTION[MISSING]', 'BASIC + 1',
    'IF(BASE_SALARY > 0, 1, UNKNOWN_BRANCH)', 'SQRT(BASE_SALARY)', 'CLAMP(BASE_SALARY, 100)', 'ROUND(1)', 'ABS(1, 2)']) {
    expectFormulaError(await validate(formula))
  }
})

test('PL-05 API: script execution, object access, assignments and non-whitelisted syntax never pass parsing', async () => {
  for (const formula of ['process.exit()', 'process.env.JWT_SECRET', 'globalThis.fetch(1)', 'BASE_SALARY.constructor',
    'BASE_SALARY[0]', 'PARAM[constructor]', 'COMP[__proto__]', 'constructor.constructor(1)',
    '1; 2', 'BASE_SALARY := 10', 'while(1)', 'require("fs")', 'new Function("return 1")()',
    '`1`', '1 // comment', '1 /*comment*/ + 2', 'BASE_SALARY ** 2', 'BASE_SALARY ? 1 : 2']) {
    expectFormulaError(await validate(formula))
    expectFormulaError(await evaluate(formula))
  }
})

test('PL-05 API: postfix numeric percent is supported while modulo and percent on variables are forbidden', async () => {
  expectDecimal(await evaluate('BASE_SALARY * 10%', { inputs: { variables: { BASE_SALARY: '1234.50' } } }), '123.45')
  expectDecimal(await evaluate('10% + 2.5%'), '0.13', '0.125')
  for (const formula of ['5 % 2', 'BASE_SALARY%', '(5 + 5)%', '10%%']) expectFormulaError(await validate(formula))
})

test('PL-05 API: constant zero divisors are rejected at validation while variable zero obeys the persisted division mode', async () => {
  for (const formula of ['BASE_SALARY / 0', 'BASE_SALARY / (2 - 2)', 'IF(BASE_SALARY > 0, 1, 1 / 0)']) {
    expectFormulaError(await validate(formula))
  }
  expectStatus(await validate('BASE_SALARY / COVERED_DAYS'), 200)
  const fields = { inputs: { variables: { BASE_SALARY: 100, COVERED_DAYS: 0 } } }
  const warned = expectDecimal(await evaluate('BASE_SALARY / COVERED_DAYS', fields), '0')
  assert.ok(warned.warnings.length > 0)
  assert.match(JSON.stringify(warned.warnings), /ZERO|zero|صفر/)
  expectFormulaError(await evaluate('BASE_SALARY / COVERED_DAYS', fields, admin, fixtures.failRow))
})

test('PL-05 API: constant folding uses the persisted ROUND mode and missing settings defer only mode-dependent validation', async () => {
  const formula = 'BASE_SALARY / ROUND(0.5, 0)'
  expectStatus(await validate(formula, {}, admin, fixtures.standard), 200)
  expectDecimal(await evaluate(formula, { inputs: { variables: { BASE_SALARY: 100 } } }, admin, fixtures.standard), '100')
  const rejected = expectFormulaError(await validate(formula, {}, admin, fixtures.floor))
  assert.equal(rejected.code, 'CONSTANT_DIVISION_BY_ZERO')
  expectFormulaError(await evaluate(formula, { inputs: { variables: { BASE_SALARY: 100 } } }, admin, fixtures.floor))
  expectStatus(await validate(formula, {}, admin, fixtures.missing), 200)
  const components = [{ code: 'BASE', stage: 1, sequence: 1, isActive: true, formula },
    { code: 'NET', stage: 6, sequence: 1, isActive: true }]
  expectStatus(await validateOrder(components, {}, admin, fixtures.standard), 200)
  expectStatus(await validateOrder(components, {}, admin, fixtures.floor), 400)
})

test('PL-05 API: a component and typed deduction may share a code while a component and parameter may not', async () => {
  const formula = 'COMP[QUALITY] + TYPED_DEDUCTION[QUALITY]'
  const symbols = { components: ['QUALITY'], typedDeductions: ['QUALITY'] }
  expectStatus(await validate(formula, { symbols }), 200)
  expectDecimal(await evaluate(formula, { symbols, inputs: { components: { QUALITY: '5.25' }, typedDeductions: { QUALITY: '6.75' } } }), '12')
  expectStatus(await validate('COMP[QUALITY] + PARAM[QUALITY]', { symbols: { components: ['QUALITY'], parameters: ['QUALITY'] } }), 400)
})

test('PL-05 API: lazy IF and boolean short circuit do not evaluate an unselected variable-zero divisor in either policy mode', async () => {
  for (const fixture of [fixtures.standard, fixtures.failRow]) {
    const result = expectDecimal(await evaluate('IF(COVERED_DAYS = 0, 7.25, BASE_SALARY / COVERED_DAYS)', {
      inputs: { variables: { COVERED_DAYS: 0, BASE_SALARY: 100 } } }, admin, fixture), '7.25')
    assert.equal(result.warnings.length, 0, JSON.stringify(result.warnings))
    for (const [formula, expected] of [['COVERED_DAYS = 0 OR BASE_SALARY / COVERED_DAYS > 0', true],
      ['COVERED_DAYS <> 0 AND BASE_SALARY / COVERED_DAYS > 0', false]]) {
      const condition = expectStatus(await evaluate(formula, { kind: 'CONDITION', inputs: { variables: { COVERED_DAYS: 0, BASE_SALARY: 100 } } }, admin, fixture), 200)
      assert.equal(condition.value, expected)
      assert.equal(condition.rawValue, expected)
      assert.equal(condition.warnings.length, 0)
    }
  }
})

test('PL-05 API: condition comparisons and logical precedence return booleans while amount roots stay numeric', async () => {
  const formula = 'NOT (ABSENCE_DAYS > 0) AND BASE_SALARY >= 100 OR COVERED_DAYS = 0'
  expectStatus(await validate(formula, { kind: 'CONDITION' }), 200)
  const result = expectStatus(await evaluate(formula, { kind: 'CONDITION', inputs: { variables: { ABSENCE_DAYS: 0, BASE_SALARY: 100, COVERED_DAYS: 30 } } }), 200)
  assert.equal(result.value, true)
  expectFormulaError(await validate('BASE_SALARY > 0'))
  expectFormulaError(await validate('1 + 2', { kind: 'CONDITION' }))
  expectFormulaError(await validate('1 == 1', { kind: 'CONDITION' }))
})

test('PL-05 API: exact six-decimal arithmetic and persisted positive and negative rounding avoid binary drift', async () => {
  expectDecimal(await evaluate('0.1 + 0.2'), '0.3', '0.3')
  expectDecimal(await evaluate('1 / 3', {}, admin, fixtures.scaleSix), '0.333333', '0.333333')
  expectDecimal(await evaluate('1 / 3 * 3', {}, admin, fixtures.scaleSix), '1', '1')
  expectDecimal(await evaluate('BASE_SALARY - 10000000000000000', { inputs: { variables: { BASE_SALARY: '10000000000000000.01' } } }), '0.01')
  expectDecimal(await evaluate('ROUND(1.005, 2)', {}, admin, fixtures.even), '1')
  expectDecimal(await evaluate('ROUND(1.005, 2)', {}, admin, fixtures.standard), '1.01')
  for (const [fixture, expression, expected] of [[fixtures.standard, '1.005', '1.01'], [fixtures.even, '1.005', '1'],
    [fixtures.even, '1.015', '1.02'], [fixtures.standard, '-1.005', '-1.01'],
    [fixtures.floor, '-1.001', '-1.01'], [fixtures.ceil, '-1.009', '-1'],
    [fixtures.floor, '1.009', '1'], [fixtures.ceil, '1.001', '1.01']]) {
    expectDecimal(await evaluate(expression, {}, admin, fixture), expected, expression)
  }
  expectDecimal(await evaluate('MIN(4, 3, 9) + MAX(1, 7, 2) + ABS(-2) + FLOOR(-1.1) + CEIL(1.1) + CLAMP(10, 1, 5)'), '17')
})

test('PL-04 API: missing and null inputs become explicit zero with warnings and exemption forces exactly four attendance inputs to zero', async () => {
  const missing = expectDecimal(await evaluate('BASE_SALARY + ALLOWANCES_TOTAL', { inputs: { variables: { BASE_SALARY: null } } }), '0')
  assert.ok(missing.warnings.length > 0)
  for (const code of ['BASE_SALARY', 'ALLOWANCES_TOTAL']) assert.ok(JSON.stringify(missing.inputs).includes(code))
  const fields = { inputs: { variables: { IS_ATTENDANCE_EXEMPT: 1, LATE_MINUTES: 90, SHORT_MINUTES: 50, ABSENCE_DAYS: 3,
    LATE_INCIDENTS: 2, UNPAID_LEAVE_DAYS: 2, PAID_LEAVE_DAYS: 1, WORKED_MINUTES: 100, OT_HOURS_TOTAL: 4 } } }
  const exempt = expectDecimal(await evaluate('LATE_MINUTES + SHORT_MINUTES + ABSENCE_DAYS + LATE_INCIDENTS + UNPAID_LEAVE_DAYS + PAID_LEAVE_DAYS + WORKED_MINUTES + OT_HOURS_TOTAL', fields), '107')
  assert.ok(exempt.inputs && typeof exempt.inputs === 'object')
  for (const name of ['LATE_MINUTES', 'SHORT_MINUTES', 'ABSENCE_DAYS', 'LATE_INCIDENTS']) assert.equal(exempt.inputs[name], '0')
  assert.equal(exempt.inputs.IS_ATTENDANCE_EXEMPT, '1')
  assert.equal(exempt.inputs.UNPAID_LEAVE_DAYS, '2')
  assert.equal(exempt.inputs.WORKED_MINUTES, '100')
  assert.equal(exempt.inputs.OT_HOURS_TOTAL, '4')
  assert.ok(exempt.warnings.some(warning => warning.code === 'ATTENDANCE_EXEMPT'))
  expectStatus(await evaluate('1', { inputs: { variables: { IS_ATTENDANCE_EXEMPT: 2 } } }), 400)
  expectStatus(await evaluate('1', { inputs: { variables: { IS_ATTENDANCE_EXEMPT: '1.00000000000000000001' } } }), 400)
})

test('PL-05 API: text length, token count and nesting depth limits reject bounded hostile input', async () => {
  for (const formula of ['1'.repeat(501), `${'('.repeat(11)}1${')'.repeat(11)}`, Array(101).fill('1').join('+')]) {
    const result = await validate(formula)
    expectStatus(result, 400)
  }
  expectStatus(await validate(`${'('.repeat(10)}1${')'.repeat(10)}`), 200)
  expectStatus(await validate('1', { symbols: { parameters: Array.from({ length: 201 }, (_, index) => `P_${index}`) } }), 400)
})

test('PL-05 API: repeated identical HTTP evaluations remain deterministic and leave every policy, event and financial row unchanged', async () => {
  const formula = 'IF(ABSENCE_DAYS > 0, ROUND(BASE_SALARY * 2.5%, 2), 0)'
  const fields = { inputs: { variables: { ABSENCE_DAYS: 1, BASE_SALARY: '9000.29' } } }
  const responses = await Promise.all(Array.from({ length: 12 }, () => evaluate(formula, fields)))
  for (const response of responses) expectDecimal(response, '225.01')
  for (const response of responses.slice(1)) assert.deepEqual(response.body, responses[0].body)
  assert.deepEqual(await databaseSnapshot(), canary)
})

test('PL-06 API: dependencies are extracted from formula and condition ASTs and valid manual order remains read only', async () => {
  const components = [
    { code: 'BASE', stage: 1, sequence: 1, isActive: true, formula: 'BASE_SALARY' },
    { code: 'BONUS', stage: 2, sequence: 1, isActive: true, formula: 'COMP[BASE] * PARAM[RATE]', conditionFormula: 'COMP[BASE] > 0' },
    { code: 'NET', stage: 6, sequence: 1, isActive: true },
  ]
  const result = expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }), 200)
  assert.equal(result.valid, true)
  assert.equal(result.contractVersion, 'SRS_V1')
  assert.equal(result.catalogVersion, catalogVersion)
  assert.deepEqual(result.order, ['BASE', 'BONUS', 'NET'])
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, managerA, fixtures.standard), 200)
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, starA, fixtures.archived), 200)
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, admin, fixtures.missing), 200)
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, managerA, fixtures.foreign), 403)
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, viewerA), 403)
  expectStatus(await validateOrder(components, { symbols: { parameters: ['RATE'] } }, admin, fixtures.legacy), 409)
})

test('PL-06 API: same-stage forward references reject manually and auto order only suggests a valid sequence', async () => {
  const components = [
    { code: 'A', stage: 2, sequence: 1, isActive: true, formula: 'COMP[B] + 1' },
    { code: 'B', stage: 2, sequence: 2, isActive: true, formula: 'BONUS_TOTAL' },
    { code: 'NET', stage: 6, sequence: 1, isActive: true },
  ]
  const denied = expectStatus(await validateOrder(components), 400)
  assert.equal(denied.code, 'POLICY_COMPONENT_ORDER_INVALID')
  assert.ok(Array.isArray(denied.errors))
  assert.match(JSON.stringify(denied), /A/); assert.match(JSON.stringify(denied), /B/)
  const suggested = expectStatus(await validateOrder(components, { autoOrder: true }), 200)
  assert.deepEqual(suggested.order, ['B', 'A', 'NET'])
  assert.ok(suggested.warnings.length > 0)
  assert.ok(suggested.suggestedSequences.find(row => row.code === 'B').sequence < suggested.suggestedSequences.find(row => row.code === 'A').sequence)
  const crossStage = plain(components); crossStage[1].stage = 3
  expectStatus(await validateOrder(crossStage, { autoOrder: true }), 400)
})

test('PL-06 API: condition-only cycles, inactive dependencies and NET mutations reject with an explicit path or cause', async () => {
  const cycle = ['A', 'B', 'C'].map((code, index, codes) => ({ code, stage: 2, sequence: index + 1, isActive: true,
    formula: '1', conditionFormula: `COMP[${codes[(index + 1) % codes.length]}] > 0` }))
  cycle.push({ code: 'NET', stage: 6, sequence: 1, isActive: true })
  const cyclic = expectStatus(await validateOrder(cycle, { autoOrder: true }), 400)
  assert.equal(cyclic.code, 'POLICY_COMPONENT_ORDER_INVALID')
  assert.ok(cyclic.errors.some(error => Array.isArray(error.path) && error.path.length >= 4 && error.path[0] === error.path.at(-1)), JSON.stringify(cyclic))
  const dependent = [{ code: 'A', stage: 2, sequence: 1, isActive: false, formula: '1' },
    { code: 'B', stage: 3, sequence: 1, isActive: true, formula: 'COMP[A]' }, { code: 'NET', stage: 6, sequence: 1, isActive: true }]
  expectStatus(await validateOrder(dependent), 400)
  for (const components of [[{ code: 'A', stage: 1, sequence: 1, isActive: true }],
    [{ code: 'NET', stage: 5, sequence: 1, isActive: true }], [{ code: 'NET', stage: 6, sequence: 1, isActive: false }],
    [{ code: 'NET', stage: 6, sequence: 1, isActive: true, formula: '1' }]]) {
    expectStatus(await validateOrder(components), 400)
  }
})

test('PL-06 API: forged dependencies, symbols, stage and sequence cannot bypass AST order validation', async () => {
  const net = { code: 'NET', stage: 6, sequence: 1, isActive: true }
  for (const fields of [{ dependencies: [] }, { status: 'ACTIVE' }, { stage: 0 }, { stage: 7 }, { stage: '1' },
    { sequence: 1.5 }, { sequence: 0 }, { isActive: 'true' }]) {
    expectStatus(await validateOrder([{ code: 'A', stage: 1, sequence: 1, isActive: true, formula: '1', ...fields }, net]), 400)
  }
  expectStatus(await validateOrder([net], { symbols: { components: ['A'] } }), 400)
  expectStatus(await validateOrder([net], { dependencies: [] }), 400)
  expectStatus(await validateOrder([net], { inputs: { variables: { BASE_SALARY: 100 } } }), 400)
  assert.deepEqual(await databaseSnapshot(), canary)
})
