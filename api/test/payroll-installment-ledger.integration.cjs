// اختبارات الحجز والصرف والتصفية الحقيقية في قاعدة SQL عشوائية مع حماية بيانات مستقلة.
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
const database = `hr_payroll_installment_ledger_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-installment-ledger-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary, protectedRunId
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
  assert.match(database, /^hr_payroll_installment_ledger_test_[a-f0-9]{16}$/)
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
    'Request', 'RequestApproval', 'AttendanceCorrection', 'LeaveBalance', 'EmployeeStatusHistory',
    'LoanInstallmentAllocation', 'LoanInstallmentEvent', 'OffboardingCase', 'SettlementLine', 'ClearanceItem']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  result.RequestsConfig = plain(await repo('RequestsConfig').find({ order: { key: 'ASC' } }))
  return result
}
async function protectedSnapshot() {
  const state = await financialSnapshot(), ids = new Set([employeeA.id, employeeB.id])
  const loans = new Set(state.Loan.filter(row => ids.has(row.employeeId)).map(row => row.id))
  const requests = new Set(state.Request.filter(row => ids.has(row.requesterId)).map(row => row.id))
  const cases = new Set(state.OffboardingCase.filter(row => ids.has(row.employeeId)).map(row => row.id))
  return Object.fromEntries(Object.entries(state).map(([name, rows]) => [name, name === 'RequestsConfig' ? rows : rows.filter(row => {
    if (name === 'Employee') return ids.has(row.id)
    if (name === 'PayrollRun') return row.id === protectedRunId
    if (name === 'PayrollRunEvent') return row.runId === protectedRunId
    if (name === 'LoanInstallment') return loans.has(row.loanId)
    if (name === 'Request') return ids.has(row.requesterId)
    if (name === 'RequestApproval') return requests.has(row.requestId)
    if (name === 'SettlementLine' || name === 'ClearanceItem') return cases.has(row.caseId)
    return ids.has(row.employeeId)
  })]))
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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '9' }, { key: 'payroll.policy.default_period_type', value: 'CALENDAR_MONTH' },
    { key: 'payroll.policy.cycle_end_mode', value: 'DERIVED' }, { key: 'payroll.policy.cycle_end_day', value: 'null' },
    { key: 'payroll.policy.min_net_guarantee', value: '500' }, { key: 'payroll.policy.net_floor_pct', value: 'null' },
    { key: 'payroll.policy.max_deduction_pct_of_gross', value: 'null' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' },
  ])
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
  const permissions = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel', 'settlement.edit', 'settlement.approve']
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
  protectedRunId = run.id
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
  canary = await protectedSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await protectedSnapshot(), canary, 'Policy operation mutated financial source rows') })
after(async t => {
  const errors = []
  try { if (canary) assert.deepEqual(await protectedSnapshot(), canary) } catch (error) { errors.push(error) }
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
    assert.match(path.basename(uploads), /^hr-payroll-installment-ledger-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

const ledger = () => require('../src/payroll/payroll-installment-ledger')
const positions = f => require('../src/payroll/payroll-installment-balances').readLoanInstallmentPositions(ds.manager, f.employee.id, f.loan.id)
async function fixture(options = {}) {
  const employee = await repo('Employee').save({ employeeCode: `LEDGER${++sequence}`, fullName: 'موظف اختبار دفتر الأقساط',
    branchId: options.branchId ?? branchA.id, departmentId: departmentA.id, teamId: teamA.id,
    joinDate: '2020-01-01', basicSalary: options.salary ?? 900, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  await repo('AttendanceExemption').save({ employeeId: employee.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31',
    reasonCode: 'field_role', reason: 'إعفاء حضور ثابت لعزل اختبار الأقساط', status: 'APPROVED', createdByUserId: admin.id,
    approvedByUserId: admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null,
    overtimeEligibleOverride: false, unpaidLeaveDeductibleOverride: true, requiresCheckinForPresence: false })
  const amount = options.amount ?? '1666.00'
  const loan = await repo('Loan').save({ employeeId: employee.id, amount: Number(amount), status: 'DISBURSED', disbursedAt: new Date('2026-08-01T08:00:00Z') })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, dueDate: options.dueDate ?? '2026-09-01', amount: Number(amount), paid: false })
  return { employee, loan, installment }
}
async function calc(f, extra = {}, actor = admin) {
  const run = expectStatus(await request(actor, 'POST', '/payroll/runs/calculate-defined', { period: '2026-09', scopeType: 'CUSTOM',
    employeeIds: [f.employee.id], name: `مسير اختبار الأقساط ${sequence}`, ...extra }), 201)
  const read = expectStatus(await request(actor, 'GET', `/payroll/runs/${run.id}`), 200)
  assert.deepEqual(read, run)
  return run
}
function item(run, f) { const row = run.items.find(row => row.employeeId === f.employee.id); assert.ok(row); return row }
function plan(run, f) { const value = JSON.parse(item(run, f).breakdown).installmentPlan; assert.equal(value?.version, 'LOAN_ALLOCATION_V1_20260913'); return value }
async function transition(run, action, body, actor = admin) { return request(actor, 'POST', `/payroll/runs/${run.id}/${action}`, body) }
async function approve(run, actor = admin) { return expectStatus(await transition(run, 'approve', undefined, actor), 201) }
async function pay(run, actor = admin) { return expectStatus(await transition(run, 'pay', undefined, actor), 201) }
async function assertRejected(operation, status = 409) {
  const before = await financialSnapshot(), policies = await policySnapshot()
  const response = expectStatus(await operation(), status)
  assert.deepEqual(await financialSnapshot(), before, 'Rejected transition changed financial rows or history')
  assert.deepEqual(await policySnapshot(), policies)
  return response
}
async function assertHelperRejected(operation, status = 409) {
  const before = await financialSnapshot()
  await assert.rejects(operation, error => { assert.equal(error.getStatus?.(), status, error.stack); return true })
  assert.deepEqual(await financialSnapshot(), before, 'Rejected ledger transaction changed financial state')
}
async function allocations(f) { return repo('LoanInstallmentAllocation').find({ where: { employeeId: f.employee.id }, order: { id: 'ASC' } }) }
async function ledgerEvents(f) { return repo('LoanInstallmentEvent').find({ where: { employeeId: f.employee.id }, order: { id: 'ASC' } }) }
async function withConfig(changes, operation) {
  const before = await repo('RequestsConfig').findBy({ key: require('../node_modules/typeorm').In(Object.keys(changes)) })
  assert.equal(before.length, Object.keys(changes).length)
  try { await repo('RequestsConfig').save(Object.entries(changes).map(([key, value]) => ({ key, value }))); return await operation() }
  finally { await repo('RequestsConfig').save(before) }
}
async function eventFailure(f, action, operation) {
  assertDisposable(); assert.match(action, /^[A-Z_]+$/)
  const name = `TR_loan_ledger_test_${++sequence}`
  await ds.query(`CREATE TRIGGER [${name}] ON [loan_installment_events] AFTER INSERT AS
    BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted WHERE [employeeId]=${f.employee.id} AND [action]='${action}')
      THROW 51077, 'Intentional isolated ledger audit failure', 1; END`)
  try { return await operation() } finally { await ds.query(`DROP TRIGGER [${name}]`) }
}
async function approvedRequest(f, typeCode) {
  return repo('Request').save({ requesterId: f.employee.id, branchId: f.employee.branchId, typeCode, status: 'APPROVED',
    createdByUserId: admin.id, payload: JSON.stringify({ loanId: f.loan.id, reason: 'قرار اختبار موثق' }) })
}
async function defer(f, requestId, extra = {}) {
  return ds.transaction(em => ledger().deferLoanInstallment(em, { employeeId: f.employee.id, loanId: f.loan.id,
    installmentId: f.installment.id, expectedRevision: 1, toPeriod: '2027-01', requestId, actorId: admin.id,
    reason: 'تأجيل معتمد لحاجة الموظف', ...extra }))
}
async function early(f, requestId) {
  return ds.transaction(em => ledger().settleLoanEarly(em, { employeeId: f.employee.id, loanId: f.loan.id,
    requestId, actorId: admin.id, reason: 'سداد مبكر موثق باختبار مستقل' }))
}
async function settlement(f) {
  const kase = await repo('OffboardingCase').save({ employeeId: f.employee.id, lastWorkingDay: '2027-12-31', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  await repo('ClearanceItem').save(['manager', 'custody', 'it', 'finance', 'hr'].map(party => ({ caseId: kase.id, party, label: party, status: 'DONE' })))
  return { ...f, kase }
}
async function recalcSettlement(f) { return request(admin, 'POST', `/offboarding/${f.kase.id}/recalc-lines`) }
function loanLine(response) { return response.lines.find(row => row.label === 'رصيد سلف متبقٍ') }

test('Installment ledger: calculation is a draft, approval reserves, and payment posts exactly 400 with a 1266 child and net 500', async () => {
  const f = await fixture(), original = plain(await positions(f)), run = await calc(f)
  assert.equal(Number(item(run, f).loanInstallments), 400); assert.equal(Number(item(run, f).netPay), 500)
  assert.equal(plan(run, f).allocation.totals.deductedAmount, '400.00')
  assert.deepEqual(plain(await positions(f)), original)
  assert.equal((await allocations(f)).length, 0); assert.equal((await ledgerEvents(f)).length, 0)
  await approve(run)
  assert.equal((await allocations(f))[0].status, 'HELD')
  assert.deepEqual(plain(await positions(f)), original)
  await pay(run)
  const rows = await positions(f), parent = rows.find(row => row.id === f.installment.id), child = rows.find(row => row.parentInstallmentId === parent.id)
  assert.equal(parent.financialStatus, 'PARTIAL'); assert.equal(parent.paid, false)
  assert.equal(parent.paidAmount, '400.00'); assert.equal(parent.remainingAmount, '0.00'); assert.ok(parent.paidAt)
  assert.equal(child.financialStatus, 'DUE'); assert.equal(child.amount, '1266.00'); assert.equal(child.remainingAmount, '1266.00')
  assert.equal(child.dueDate, '2026-10-01'); assert.equal(child.originalDueDate, '2026-09-01')
  assert.equal((await allocations(f))[0].status, 'POSTED')
  assert.deepEqual((await ledgerEvents(f)).map(row => row.action), ['RESERVED', 'PAYROLL_POSTED'])
  const read = expectStatus(await request(admin, 'GET', '/loans'), 200).find(row => row.id === f.loan.id)
  assert.equal(Number(read.paidAmount), 400); assert.equal(Number(read.remainingAmount), 1266)
})

test('Installment ledger: SKIP reserves the zero deduction action and posts a full deferred child without reducing salary', async () => {
  await withConfig({ 'loan.insufficient_net_behavior': 'SKIP_AND_EXTEND' }, async () => {
    const f = await fixture(), run = await calc(f)
    assert.equal(Number(item(run, f).loanInstallments), 0); assert.equal(Number(item(run, f).netPay), 900)
    await approve(run)
    const held = (await allocations(f))[0]
    assert.equal(held.status, 'HELD'); assert.equal(Number(held.deductedAmount), 0); assert.equal(Number(held.carriedAmount), 1666)
    await pay(run)
    const rows = await positions(f), parent = rows.find(row => row.id === f.installment.id), child = rows.find(row => row.parentInstallmentId === parent.id)
    assert.equal(parent.financialStatus, 'DEFERRED'); assert.equal(parent.paidAmount, '0.00'); assert.equal(parent.paid, false)
    assert.equal(child.remainingAmount, '1666.00'); assert.equal(child.dueDate, '2026-10-01')
  })
})

test('Installment ledger: full repayment creates no child, cannot be posted twice, and PAID cannot be reopened or cancelled', async () => {
  const f = await fixture({ salary: 5000 }), run = await calc(f)
  assert.equal(Number(item(run, f).netPay), 3334)
  await approve(run); await pay(run)
  const [position] = await positions(f)
  assert.equal((await positions(f)).length, 1); assert.equal(position.financialStatus, 'PAID'); assert.equal(position.paid, true)
  assert.equal(position.paidAmount, '1666.00'); assert.equal(position.remainingAmount, '0.00')
  assert.equal((await repo('Loan').findOneByOrFail({ id: f.loan.id })).status, 'SETTLED')
  await assertRejected(() => transition(run, 'pay'), 400)
  await assertRejected(() => transition(run, 'reopen', { reason: 'رفض إعادة فتح مسير مصروف' }), 400)
  await assertRejected(() => transition(run, 'cancel', { reason: 'رفض إلغاء مسير مصروف' }), 400)
})

test('Installment ledger: reopening releases the claim with history and reapproval reserves a fresh allocation before one payment', async () => {
  const f = await fixture(), run = await calc(f)
  await approve(run)
  expectStatus(await transition(run, 'reopen', { reason: 'مراجعة سبب القسط قبل الصرف' }), 201)
  let rows = await allocations(f)
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'RELEASED'); assert.ok(rows[0].releasedAt)
  assert.equal((await positions(f))[0].financialStatus, 'DUE')
  await approve(run); await pay(run)
  rows = await allocations(f)
  assert.deepEqual(rows.map(row => row.status), ['RELEASED', 'POSTED'])
  assert.deepEqual((await ledgerEvents(f)).map(row => row.action), ['RESERVED', 'RELEASED', 'RESERVED', 'PAYROLL_POSTED'])
  assert.equal((await positions(f)).filter(row => row.parentInstallmentId === f.installment.id).length, 1)
})

test('Installment ledger: repeated draft calculations and cancellation never reserve or move a loan balance', async () => {
  const f = await fixture(), before = plain(await positions(f)), first = await calc(f)
  const next = await calc(f, { runId: first.id, reason: 'إعادة حساب المسودة دون تكرار الدين' })
  assert.equal(Number(item(next, f).loanInstallments), 400)
  assert.equal((await allocations(f)).length, 0); assert.equal((await ledgerEvents(f)).length, 0)
  expectStatus(await transition(next, 'cancel', { reason: 'إلغاء المسودة التجريبية' }), 201)
  assert.deepEqual(plain(await positions(f)), before)
  assert.equal((await allocations(f)).length, 0)
})

test('Installment ledger: an amount changed after calculation rejects approval atomically without reserving stale debt', async () => {
  const f = await fixture(), run = await calc(f)
  await repo('LoanInstallment').update(f.installment.id, { amount: 1700 })
  await assertRejected(() => transition(run, 'approve'))
  assert.equal((await allocations(f)).length, 0)
})

test('Installment ledger: a source revision changed after approval rejects payment and preserves the held allocation', async () => {
  const f = await fixture(), run = await calc(f)
  await approve(run)
  await repo('LoanInstallment').update(f.installment.id, { financialRevision: 2 })
  await assertRejected(() => transition(run, 'pay'))
  assert.equal((await allocations(f))[0].status, 'HELD')
})

test('Installment ledger: approval and payment use captured options when live defaults change', async () => {
  const f = await fixture(), run = await calc(f)
  await withConfig({ 'loan.insufficient_net_behavior': 'SKIP_AND_EXTEND', 'payroll.policy.min_net_guarantee': '800' }, async () => {
    await approve(run); await pay(run)
    assert.equal((await positions(f)).find(row => row.id === f.installment.id).paidAmount, '400.00')
  })
})

test('Installment ledger: failure writing the reservation audit rolls back both installment and employee period claims', async () => {
  const f = await fixture(), run = await calc(f)
  await eventFailure(f, 'RESERVED', async () => assertRejected(() => transition(run, 'approve'), 500))
  assert.equal((await allocations(f)).length, 0)
  await approve(run)
})

test('Installment ledger: failure writing payment audit rolls back parent, child, allocation and payroll status together', async () => {
  const f = await fixture(), run = await calc(f)
  await approve(run)
  await eventFailure(f, 'PAYROLL_POSTED', async () => assertRejected(() => transition(run, 'pay'), 500))
  assert.equal((await positions(f)).length, 1); assert.equal((await allocations(f))[0].status, 'HELD')
  await pay(run)
  assert.equal((await positions(f)).length, 2)
})

test('Installment ledger: planless legacy amounts and tampered saved plans require recalculation before approval or payment', async () => {
  const f = await fixture(), run = await calc(f), row = item(run, f), original = JSON.parse(row.breakdown)
  await repo('PayrollItem').update(row.id, { breakdown: JSON.stringify({ ...original, installmentPlan: null }) })
  const error = await assertRejected(() => transition(run, 'approve'))
  assert.equal(error.code, 'LOAN_PLAN_RECALCULATION_REQUIRED')
  await repo('PayrollItem').update(row.id, { breakdown: JSON.stringify(original) })
  await approve(run)
  const altered = plain(original); altered.installmentPlan.allocation.totals.deductedAmount = '401.00'
  await repo('PayrollItem').update(row.id, { breakdown: JSON.stringify(altered) })
  await assertRejected(() => transition(run, 'pay'))
  assert.equal((await positions(f)).length, 1)
})

test('Installment ledger: manual deferral closes the parent and creates one complete future child even when salary can cover it', async () => {
  const f = await fixture({ salary: 5000 }), decision = await approvedRequest(f, 'LOAN_INSTALLMENT_DEFER')
  const evidence = await ds.transaction(em => ledger().getLoanInstallmentDeferralEvidence(em, {
    employeeId: f.employee.id, loanId: f.loan.id, installmentId: f.installment.id, toPeriod: '2027-01' }))
  assert.equal(evidence.amount, '1666.00'); assert.equal(evidence.sourceRevision, 1)
  const result = await defer(f, decision.id, { expectedAmount: evidence.amount }), beforeRetry = await financialSnapshot()
  assert.deepEqual(await defer(f, decision.id, { expectedAmount: evidence.amount }), result)
  assert.deepEqual(await financialSnapshot(), beforeRetry, 'Idempotent decision generated a second child or event')
  const rows = await positions(f), parent = rows.find(row => row.id === f.installment.id), child = rows.find(row => row.id === result.continuationId)
  assert.equal(parent.financialStatus, 'DEFERRED'); assert.equal(parent.paid, false); assert.equal(parent.paidAmount, '0.00')
  assert.equal(child.remainingAmount, '1666.00'); assert.equal(child.dueDate, '2027-01-01'); assert.equal(child.originalDueDate, '2026-09-01')
  const run = await calc(f)
  assert.equal(Number(item(run, f).loanInstallments), 0); assert.equal(Number(item(run, f).netPay), 5000)
  await approve(run); await pay(run)
  assert.deepEqual(plain(await positions(f)), plain(rows), 'A future deferred child was consumed before its due period')
})

test('Installment ledger: held claims block manual deferral and early settlement including zero-deduction SKIP', async () => {
  await withConfig({ 'loan.insufficient_net_behavior': 'SKIP_AND_EXTEND' }, async () => {
    const f = await fixture(), run = await calc(f), decision = await approvedRequest(f, 'LOAN_INSTALLMENT_DEFER'), earlyDecision = await approvedRequest(f, 'LOAN_EARLY_SETTLEMENT')
    await approve(run)
    await assertHelperRejected(() => defer(f, decision.id))
    await assertHelperRejected(() => early(f, earlyDecision.id))
    assert.equal((await allocations(f))[0].status, 'HELD')
  })
})

test('Installment ledger: manual deferral rejects stale revision, changed captured amount and invalid reason without moving debt', async () => {
  const f = await fixture(), decision = await approvedRequest(f, 'LOAN_INSTALLMENT_DEFER')
  await assertHelperRejected(() => defer(f, decision.id, { expectedRevision: 2 }))
  await assertHelperRejected(() => defer(f, decision.id, { expectedAmount: '1600.00' }))
  await assertHelperRejected(() => defer(f, decision.id, { reason: 'x' }), 400)
  const before = await financialSnapshot()
  await eventFailure(f, 'DEFERRED', async () => {
    await assert.rejects(() => defer(f, decision.id), /Intentional isolated ledger audit failure/)
    assert.deepEqual(await financialSnapshot(), before)
  })
  assert.equal((await positions(f)).length, 1)
})

test('Installment ledger: early settlement consumes only the remaining child after partial payroll and retries are idempotent', async () => {
  const f = await fixture(), run = await calc(f)
  await approve(run); await pay(run)
  const decision = await approvedRequest(f, 'LOAN_EARLY_SETTLEMENT'), result = await early(f, decision.id), after = await financialSnapshot()
  assert.deepEqual(await early(f, decision.id), result); assert.deepEqual(await financialSnapshot(), after)
  const rows = await positions(f), parent = rows.find(row => row.id === f.installment.id), child = rows.find(row => row.parentInstallmentId === parent.id)
  assert.equal(parent.financialStatus, 'PARTIAL'); assert.equal(parent.paidAmount, '400.00')
  assert.equal(child.financialStatus, 'SETTLED'); assert.equal(child.paidAmount, '1266.00'); assert.equal(child.paid, true)
  assert.equal(rows.reduce((sum, row) => sum + Number(row.paidAmount), 0), 1666)
  assert.equal((await repo('Loan').findOneByOrFail({ id: f.loan.id })).status, 'SETTLED')
  const read = expectStatus(await request(admin, 'GET', '/loans'), 200).find(row => row.id === f.loan.id)
  assert.equal(Number(read.paidAmount), 1666); assert.equal(Number(read.remainingAmount), 0)
})

test('Installment ledger: EOS includes a draft source, blocks on approval, then reads only the unpaid child after payroll payment', async () => {
  const f = await settlement(await fixture()), run = await calc(f)
  const first = expectStatus(await recalcSettlement(f), 201)
  assert.equal(Number(loanLine(first).amount), 1666)
  await approve(run)
  await assertRejected(() => recalcSettlement(f))
  await assertRejected(() => request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`))
  await pay(run)
  const fresh = expectStatus(await recalcSettlement(f), 201)
  assert.equal(Number(loanLine(fresh).amount), 1266)
  const before = plain(await positions(f))
  expectStatus(await request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`), 201)
  assert.deepEqual(plain(await positions(f)), before, 'EOS approval is a claim, not fabricated installment payment')
  const saved = await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })
  assert.equal(saved.settlementFinancialSnapshot.installments.length, 1)
  assert.equal(saved.settlementFinancialSnapshot.installments[0].id, before.find(row => row.parentInstallmentId === f.installment.id).id)
  assert.equal(saved.settlementFinancialSnapshot.installmentAmount, 1266)
})

test('Installment ledger: an EOS snapshot becomes stale when a manual deferral replaces its source with a new child ID', async () => {
  const f = await settlement(await fixture()), decision = await approvedRequest(f, 'LOAN_INSTALLMENT_DEFER')
  expectStatus(await recalcSettlement(f), 201)
  await defer(f, decision.id)
  await assertRejected(() => request(admin, 'POST', `/offboarding/${f.kase.id}/approve-settlement`))
  assert.equal((await repo('OffboardingCase').findOneByOrFail({ id: f.kase.id })).status, 'IN_SETTLEMENT')
})

test('Installment ledger: inconsistent transferred balances fail visibly in payroll and EOS instead of losing the remainder', async () => {
  const f = await settlement(await fixture())
  await repo('LoanInstallment').update(f.installment.id, { financialStatus: 'PARTIAL', paidAmount: '400.00', financialRevision: 2, originalDueDate: '2026-09-01' })
  const response = await assertRejected(() => request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period: '2026-09', scopeType: 'CUSTOM', employeeIds: [f.employee.id] }))
  assert.equal(response.code, 'LOAN_BALANCE_INVALID')
  await assertRejected(() => recalcSettlement(f))
})

test('Installment ledger: real JWT permissions and branch scope protect run transitions and loan financial reads', async () => {
  const f = await fixture(), run = await calc(f, {}, managerA)
  await assertRejected(() => transition(run, 'approve', undefined, null), 401)
  await assertRejected(() => transition(run, 'approve', undefined, viewerA), 403)
  await assertRejected(() => transition(run, 'approve', undefined, managerB), 403)
  await assertRejected(() => transition(run, 'approve', undefined, unassigned), 403)
  const foreign = expectStatus(await request(managerB, 'GET', '/loans'), 200)
  assert.equal(foreign.some(row => row.id === f.loan.id), false)
  await approve(run, managerA)
  await assertRejected(() => transition(run, 'pay', undefined, viewerA), 403)
  await assertRejected(() => transition(run, 'pay', undefined, managerB), 403)
  await pay(run, managerA)
})

test('Installment ledger: concurrent approvals in different payroll periods cannot reserve the same overdue parent twice', async t => {
  const f = await fixture(), september = await calc(f), october = await calc(f, { period: '2026-10' })
  const runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction()
  let requests = [], lockReleased = false
  try {
    const blocker = (await runner.query('SELECT @@SPID AS id'))[0].id
    await runner.query(`DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=@0, @LockMode='Exclusive',
      @LockOwner='Transaction', @LockTimeout=5000; IF @result<0 THROW 51078, 'Test barrier lock failed', 1`, [`hr:employee-finance:${f.employee.id}`])
    requests = [transition(september, 'approve'), transition(october, 'approve')]
    let waiters = [], until = Date.now() + 6000
    while (Date.now() < until && waiters.length < 1) {
      waiters = (await master.request().input('database', sql.NVarChar, database).input('blocker', sql.Int, blocker).query(`
        SELECT session_id,blocking_session_id,wait_type FROM sys.dm_exec_requests
        WHERE database_id=DB_ID(@database) AND blocking_session_id=@blocker AND wait_type LIKE 'LCK%'`)).recordset
      if (!waiters.length) await new Promise(resolve => setTimeout(resolve, 20))
    }
    assert.ok(waiters.length, 'Concurrent approval did not wait behind the actual SQL employee financial lock')
    t.diagnostic(`SQL barrier observed: ${JSON.stringify(waiters)}`)
    await runner.commitTransaction(); lockReleased = true
    const responses = await Promise.all(requests)
    assert.deepEqual(responses.map(row => row.status).sort(), [201, 409], JSON.stringify(responses))
    assert.equal((await allocations(f)).filter(row => row.status === 'HELD').length, 1)
    assert.equal((await ledgerEvents(f)).length, 1)
    assert.equal((await positions(f))[0].financialStatus, 'DUE')
  } finally {
    if (!lockReleased && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(requests)
    await runner.release()
  }
})
