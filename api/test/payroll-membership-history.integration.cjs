// SPEC 1-4 / PR-05, PR-11, PR-12: historical membership and financial audit regressions.
// This suite creates its own random SQL database. It never uses the source or review clone.
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
const database = `hr_payroll_history_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-history-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
let app, master, ds, base, admin, branchA, branchB, managerA, managerB
let created = false, employeeNumber = 0, branchNumber = 0, runNumber = 0

function assertDisposable() {
  assert.match(database, /^hr_payroll_history_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) {
  assertDisposable()
  return ds.getRepository(name)
}
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    Authorization: `Bearer ${token(user)}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function branch() {
  return repo('Branch').save({ code: `HIST_B${++branchNumber}`, name: `فرع اختبار تاريخ الرواتب ${branchNumber}` })
}
async function employee(overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `HIST${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف اختبار التاريخ ${employeeNumber}`, branchId: branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  const rows = []
  for (let time = Date.parse(`${startDate}T12:00:00Z`); time <= Date.parse(`${endDate}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10),
      status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار التاريخ',
      shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
      lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows)
  return emp
}
function definition(employees, extra = {}) {
  return { period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
    name: `اختبار تاريخ مستقل ${++runNumber}`, ...extra }
}
async function calculate(employees, extra = {}, user = admin) {
  const response = await request(user, 'POST', '/payroll/runs/calculate-defined', definition(employees, extra))
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function detail(run, user = admin) {
  const response = await request(user, 'GET', `/payroll/runs/${run.id}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function events(run, user = admin) {
  const response = await request(user, 'GET', `/payroll/runs/${run.id}/events`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  assert.ok(Array.isArray(response.body))
  return response.body
}
function assertNoCurrentPrivateValues(payload, live) {
  const serialized = JSON.stringify(payload)
  for (const field of ['nationalId', 'passportNo', 'iban', 'bankName', 'personalEmail', 'phone', 'address']) {
    assert.ok(!serialized.includes(live[field]), `Payslip leaked the current employee ${field}`)
    assert.ok(payload.employee?.[field] == null, `Payslip should not expose the live ${field} field`)
  }
  assert.notEqual(Number(payload.employee?.basicSalary), live.basicSalary, 'Historical payslip leaked the current salary')
  assert.notEqual(payload.employee?.branchId, live.branchId, 'Historical payslip borrowed the current branch after transfer')
}
function currentPrivateValues() {
  return { branchId: branchB.id, basicSalary: 98765.43, nationalId: 'HISTORY_PRIVATE_NATIONAL_ID',
    passportNo: 'HISTORY_PRIVATE_PASSPORT', iban: 'HISTORY_PRIVATE_IBAN', bankName: 'HISTORY_PRIVATE_BANK',
    personalEmail: 'history-private@fixture.invalid', phone: 'HISTORY_PRIVATE_PHONE', address: 'HISTORY_PRIVATE_ADDRESS' }
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
  branchA = await branch(); branchB = await branch()
  const user = (email, role, branchId = null, permissions = []) => repo('User').save({ email, displayName: email,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin@payroll-history.invalid', 'super_admin')
  const permissions = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel']
  managerA = await user('branch-a@payroll-history.invalid', 'hr_manager', branchA.id, permissions)
  managerB = await user('branch-b@payroll-history.invalid', 'hr_manager', branchB.id, permissions)
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    // العضوية على راتب الملف؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
}, { timeout: 60000 })

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
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-history-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll history fixture cleanup failed')
})

test('PR-11: the legacy branch calculation creates a replacement after cancellation, while an explicit cancelled runId remains locked', async () => {
  const localBranch = await branch()
  const emp = await employee({ branchId: localBranch.id })
  const first = await request(admin, 'POST', '/payroll/runs/calculate', { branchId: localBranch.id, period })
  assert.equal(first.status, 201, JSON.stringify(first.body))
  const run = first.body
  const cancelled = await request(admin, 'POST', `/payroll/runs/${run.id}/cancel`, { reason: 'استبدال مسودة الفرع مع حفظ تاريخها' })
  assert.equal(cancelled.status, 201, JSON.stringify(cancelled.body))
  const archive = await detail(run)
  const archivedEvents = await events(run)
  assert.equal(archive.status, 'CANCELLED')
  const replacement = await request(admin, 'POST', '/payroll/runs/calculate', { branchId: localBranch.id, period })
  assert.equal(replacement.status, 201, JSON.stringify(replacement.body))
  assert.notEqual(replacement.body.id, run.id)
  assert.equal(replacement.body.status, 'CALCULATED')
  assert.equal(replacement.body.snapshotVersion, 1)
  assert.deepEqual(replacement.body.members.map(member => member.employeeId), [emp.id])
  assert.deepEqual(await detail(run), archive)
  assert.deepEqual(await events(run), archivedEvents)
  const runCount = await repo('PayrollRun').count()
  const explicit = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp], {
    runId: run.id, scopeType: 'BRANCH', branchId: localBranch.id, scopeIds: [localBranch.id], reason: 'محاولة إعادة استخدام المسير الملغى' }))
  assert.equal(explicit.status, 400, JSON.stringify(explicit.body))
  assert.equal(await repo('PayrollRun').count(), runCount)
  assert.deepEqual(await detail(run), archive)
  assert.deepEqual(await events(run), archivedEvents)
})

test('PR-05: snapshot payslip maps the saved hireDate to joinDate and keeps employee identity and salary from calculation', async () => {
  const emp = await employee({ actualStartDate: '2020-02-03', fullName: 'الاسم المحفوظ قبل النقل', basicSalary: 6400 })
  const run = await calculate([emp], {}, managerA)
  const snapshot = run.members.find(member => member.employeeId === emp.id).snapshot
  assert.equal(snapshot.hireDate, '2020-02-03')
  const live = currentPrivateValues()
  await repo('Employee').update(emp.id, { ...live, joinDate: '2025-01-01', actualStartDate: '2025-01-02', fullName: 'اسم الموظف بعد النقل' })
  const result = await request(managerA, 'GET', `/payroll/items/${run.items[0].id}`)
  assert.equal(result.status, 200, JSON.stringify(result.body))
  assert.equal(result.body.employee.joinDate, snapshot.hireDate)
  assert.equal(result.body.employee.fullName, snapshot.fullName)
  assert.equal(Number(result.body.employee.basicSalary), snapshot.basicSalary)
  assert.equal(result.body.employee.branchId, snapshot.branchId)
  assertNoCurrentPrivateValues(result.body, live)
  // لا كاشف وجود: قسيمة فرع آخر = نفس رد البند المفقود (404)
  assert.equal((await request(managerB, 'GET', `/payroll/items/${run.items[0].id}`)).status, 404)
})

test('PR-05: legacy branch payslip never exposes current private data or current salary after an employee transfer', async () => {
  const emp = await employee()
  const run = await repo('PayrollRun').save({ name: 'مسير قديم بلا لقطة للاختبار', period, startDate, endDate,
    scopeType: 'BRANCH', branchId: branchA.id, scopeIds: JSON.stringify([branchA.id]), status: 'APPROVED',
    approvedBy: admin.id, approvedAt: new Date(), totalNet: 5700, snapshotVersion: 0 })
  const item = await repo('PayrollItem').save({ runId: run.id, employeeId: emp.id, basicSalary: 5700, allowances: 0,
    netPay: 5700, payMethod: 'transfer' })
  assert.equal(await repo('PayrollRunMember').count({ where: { runId: run.id } }), 0)
  const live = currentPrivateValues()
  await repo('Employee').update(emp.id, live)
  for (const viewer of [managerA, admin]) {
    const result = await request(viewer, 'GET', `/payroll/items/${item.id}`)
    assert.equal(result.status, 200, JSON.stringify(result.body))
    assert.equal(Number(result.body.item.basicSalary), 5700)
    assert.equal(result.body.run.snapshotVersion, 0)
    assertNoCurrentPrivateValues(result.body, live)
  }
  assert.equal((await request(managerB, 'GET', `/payroll/items/${item.id}`)).status, 404)
})

test('PR-12: an installment-only recalculation appears in changedEmployeeIds while membership and employee salary stay unchanged', async () => {
  const emp = await employee()
  const loan = await repo('Loan').save({ employeeId: emp.id, amount: 1000, status: 'DISBURSED', disbursedAt: new Date() })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-07-10', amount: 200, paid: false })
  const run = await calculate([emp])
  assert.equal(Number(run.items[0].loanInstallments), 200)
  const originalEvents = await events(run)
  await repo('LoanInstallment').update(installment.id, { amount: 350 })
  const recalculated = await calculate([emp], { runId: run.id, reason: 'تصحيح قيمة قسط فقط دون تغيير عضوية أو راتب الموظف' })
  assert.equal(Number(recalculated.items[0].loanInstallments), 350)
  assert.equal(Number(run.totalNet) - Number(recalculated.totalNet), 150)
  const comparableMember = member => {
    const { capturedAt: _capturedAt, ...snapshot } = member.snapshot
    return { snapshot, employeeId: member.employeeId, membershipStatus: member.membershipStatus,
      exclusionReason: member.exclusionReason, inclusionSource: member.inclusionSource }
  }
  assert.deepEqual(recalculated.members.map(comparableMember), run.members.map(comparableMember))
  const history = await events(run)
  assert.deepEqual(history.filter(event => originalEvents.some(previous => previous.id === event.id)), originalEvents)
  const event = history.find(row => row.eventType === 'RECALCULATED')
  assert.ok(event)
  assert.deepEqual(event.payload.diff.changedEmployeeIds, [emp.id])
  assert.deepEqual(event.payload.diff.addedEmployeeIds, [])
  assert.deepEqual(event.payload.diff.removedEmployeeIds, [])
  assert.equal(Number(event.payload.before.items[0].loanInstallments), 200)
  assert.equal(Number(event.payload.after.items[0].loanInstallments), 350)
  assert.equal(event.payload.before.snapshotVersion, 1)
  assert.equal(event.payload.after.snapshotVersion, 2)
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid, false)
})

test('PR-12: CUSTOM history with old items but no historical members denies branch access even when every current member is local', async () => {
  const local = await employee()
  const historical = await employee({ branchId: branchB.id })
  const run = await calculate([local], {}, managerA)
  assert.ok(run.members.every(member => member.snapshot.branchId === branchA.id))
  const historicalEvent = await repo('PayrollRunEvent').save({ runId: run.id, eventType: 'LEGACY_IMPORT',
    actorUserId: admin.id, reason: 'سجل اختبار قديم ناقص توثيق العضوية', payload: {
      before: { snapshotVersion: 0, totalNet: 4321,
        items: [{ id: 101, runId: run.id, employeeId: historical.id, basicSalary: 4321, netPay: 4321 }] },
      after: { snapshotVersion: run.snapshotVersion, totalNet: run.totalNet, members: run.members, items: run.items },
    } })
  assert.equal((await request(managerA, 'GET', `/payroll/runs/${run.id}`)).status, 200)
  const denied = await request(managerA, 'GET', `/payroll/runs/${run.id}/events`)
  assert.equal(denied.status, 403, JSON.stringify(denied.body))
  assert.ok(!JSON.stringify(denied.body).includes('4321'), 'Denied history must not include the old amounts')
  const history = await events(run)
  assert.ok(history.some(event => event.id === historicalEvent.id))
  const stored = await repo('PayrollRunEvent').findOneByOrFail({ id: historicalEvent.id })
  assert.deepEqual(stored.payload, historicalEvent.payload, 'Authorization must not rewrite historical evidence')
})
