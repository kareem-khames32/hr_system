// الخطوة 12: مفاتيح قرارات المالك في requests_config، وتحقق PATCH /settings/config، وحد لحاق الأقساط المتأخرة (D10) على مسير حقيقي.
// قاعدة SQL مؤقتة معزولة (hr_decision_settings_test_<hex>) تُحذف في النهاية؛ لا يلمس الاختبار hr_system.
const { test, before, after } = require('node:test')
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
const database = `hr_decision_settings_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-decision-settings-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false, sequence = 0
let admin, branch, department, team

function assertDisposable() {
  assert.match(database, /^hr_decision_settings_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
    tokenVersion: user.tokenVersion ?? 0, permissions: ['*'] })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const config = async key => (await repo('RequestsConfig').findOneByOrFail({ key })).value
const setConfig = async (key, value) => expectStatus(await request(admin, 'PATCH', '/settings/config', { key, value }), 200)

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
  // الإقلاع الحقيقي يبذر المفاتيح الناقصة؛ نعيد استدعاءه صراحةً ليكون الإثبات غير معتمد على توقيت الإقلاع.
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  admin = await repo('User').save({ email: 'admin@decision-settings-test.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  branch = await repo('Branch').save({ code: 'DECISION_B', name: 'فرع القرارات' })
  department = await repo('Department').save({ branchId: branch.id, name: 'قسم القرارات', code: 'DECISION_D' })
  team = await repo('Team').save({ departmentId: department.id, name: 'فريق القرارات', code: 'DECISION_T' })
}, { timeout: 90000 })

after(async t => {
  const errors = []
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
    assert.match(path.basename(uploads), /^hr-decision-settings-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Decision settings fixture cleanup failed')
})

test('Decision keys (D1, D2, D3, D5, D10, D11) are recorded in requests_config with the chosen values', async () => {
  const expected = {
    'payroll.early_leave_deduction_enabled': 'true', 'payroll.hourly_rate_basis': 'DAILY_HOURS', 'payroll.day_rate_basis': 'MONTHLY_FIXED_COMPONENTS_30',
    'payroll.loan_catchup_max_overdue': '1', 'overtime.default_window': 'AFTER_SHIFT_END', 'overtime.outside_window_policy': 'CLOSED',
    'payroll.shortfall_enabled': 'true', 'payroll.shortfall_mode': 'MINUTES', 'payroll.shortfall_value': '1',
    'payroll.attendance_overlap_policy': 'NET_OF_LATENESS', 'payroll.attendance_daily_cap_days': '1', 'attendance.flex.shortfall_grace_minutes': '10',
    'payroll.monthly_days': '30', 'payroll.daily_hours': '8', 'payroll.cycle_start_day': '23',
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(await config(key), value, key)
})

test('PATCH /settings/config rejects monthly days other than 30 and invalid decision values without changing the row', async () => {
  const invalid = [['payroll.monthly_days', '31'], ['payroll.monthly_days', '29.5'], ['payroll.loan_catchup_max_overdue', '-1'],
    ['payroll.loan_catchup_max_overdue', '2.5'], ['payroll.loan_catchup_max_overdue', '121'], ['overtime.outside_window_policy', 'OPEN'],
    ['overtime.default_window', 'ALWAYS'], ['payroll.hourly_rate_basis', 'SHIFT_HOURS'], ['payroll.day_rate_basis', 'BASIC_ONLY'],
    ['payroll.daily_hours', '25'], ['payroll.cycle_start_day', '32'], ['system.currency', 'USD'], ['payroll.early_leave_deduction_enabled', 'maybe']]
  for (const [key, value] of invalid) {
    const before = await config(key)
    const response = expectStatus(await request(admin, 'PATCH', '/settings/config', { key, value }), 400)
    assert.equal(typeof response.message, 'string')
    assert.equal(await config(key), before, `${key}=${value} must not be stored`)
  }
  const monthly = expectStatus(await request(admin, 'PATCH', '/settings/config', { key: 'payroll.monthly_days', value: '31' }), 400)
  assert.match(monthly.message, /30/)
  await setConfig('payroll.monthly_days', '30')
  await setConfig('payroll.loan_catchup_max_overdue', '2'); assert.equal(await config('payroll.loan_catchup_max_overdue'), '2')
  await setConfig('payroll.early_leave_deduction_enabled', 'false'); await setConfig('payroll.early_leave_deduction_enabled', 'true')
  await setConfig('payroll.loan_catchup_max_overdue', '1')
})

async function loanFixture(dueDates, amount = 500) {
  const employee = await repo('Employee').save({ employeeCode: `DECISION${++sequence}`, fullName: 'موظف اختبار لحاق الأقساط', branchId: branch.id,
    departmentId: department.id, teamId: team.id, joinDate: '2020-01-01', basicSalary: 20000, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
  // إعفاء حضور ثابت يعزل مبلغ الأقساط عن خصومات الحضور.
  await repo('AttendanceExemption').save({ employeeId: employee.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'إعفاء حضور ثابت لعزل اختبار لحاق الأقساط', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: false, unpaidLeaveDeductibleOverride: true,
    requiresCheckinForPresence: false })
  const loan = await repo('Loan').save({ employeeId: employee.id, amount: amount * dueDates.length, status: 'DISBURSED', disbursedAt: new Date('2026-05-01T08:00:00Z') })
  const installments = {}
  for (const dueDate of dueDates) installments[dueDate] = (await repo('LoanInstallment').save({ loanId: loan.id, dueDate, amount, paid: false })).id
  return { employee, loan, installments }
}
async function calculate(f) {
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: '2026-09', scopeType: 'CUSTOM',
    employeeIds: [f.employee.id], name: `مسير اختبار لحاق الأقساط ${sequence}` }), 201)
  const item = run.items.find(row => row.employeeId === f.employee.id)
  assert.ok(item, JSON.stringify(run))
  return { run, item, plan: JSON.parse(item.breakdown).installmentPlan }
}

test('D10: an employee with more overdue installments than the limit has only the limit deducted beside the current installment', async () => {
  const dues = ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']
  // الخطوة 13 تستبعد من لا يملك راتبًا شهريًا موثقًا؛ هذا الاختبار يعزل أثر الأقساط فيستخدم الوضع الانتقالي (راتب الملف الحالي).
  await repo('RequestsConfig').save({ key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' })
  const limited = await loanFixture(dues)
  const { item, plan } = await calculate(limited)
  const ids = limited.installments
  assert.equal(plan.policy.catchUpMaxOverdue, 1)
  assert.deepEqual(plan.catchUpDeferredIds, [ids['2026-07-01'], ids['2026-08-01']])
  assert.deepEqual(plan.sources.map(row => row.id).sort((a, b) => a - b), [ids['2026-06-01'], ids['2026-09-01'], ids['2026-10-01']].sort((a, b) => a - b))
  assert.deepEqual(plan.allocation.lines.filter(line => line.eligible).map(line => Number(line.installmentRef)).sort((a, b) => a - b), [ids['2026-06-01'], ids['2026-09-01']])
  assert.equal(plan.allocation.totals.deductedAmount, '1000.00')
  assert.equal(Number(item.loanInstallments), 1000)
  // الأقساط المؤجلة بالحد تبقى مستحقة كما هي؛ لا حجز ولا ترحيل ولا تعديل موعد.
  for (const due of ['2026-07-01', '2026-08-01']) {
    const row = await repo('LoanInstallment').findOneByOrFail({ id: ids[due] })
    assert.equal(row.paid, false); assert.equal(row.dueDate, due)
  }

  await setConfig('payroll.loan_catchup_max_overdue', '3')
  const all = await calculate(await loanFixture(dues))
  assert.deepEqual(all.plan.catchUpDeferredIds, [])
  assert.equal(all.plan.allocation.totals.deductedAmount, '2000.00')

  await setConfig('payroll.loan_catchup_max_overdue', '0')
  const currentOnly = await loanFixture(dues)
  const none = await calculate(currentOnly)
  assert.deepEqual(none.plan.catchUpDeferredIds, [currentOnly.installments['2026-06-01'], currentOnly.installments['2026-07-01'], currentOnly.installments['2026-08-01']])
  assert.equal(none.plan.allocation.totals.deductedAmount, '500.00')
  await setConfig('payroll.loan_catchup_max_overdue', '1')
})
