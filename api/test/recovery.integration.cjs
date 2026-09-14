// Run: node --test api/test/recovery.integration.cjs
// Creates its own SQL Server database. Never seeds or changes the configured database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recovery_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
const uploads = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hr-recovery-files-'))
let master, app, ds, base, created = false
let admin, hr, employee, outsider, branch, otherBranch, emp, otherEmp
const repos = {}
const { JwtService } = require('../node_modules/@nestjs/jwt')
const jwt = new JwtService({ secret })
function token(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${typeof user === 'string' ? user : token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql', 'This suite requires SQL Server')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test', UPLOADS_ROOT: uploads })
  const { NestFactory } = require('../node_modules/@nestjs/core')
  const { ValidationPipe } = require('../node_modules/@nestjs/common')
  const { AppModule } = require('../src/app.module')
  app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource)
  for (const [name, file] of Object.entries({ User: 'auth/user.entity', Branch: 'org/entities/branch.entity',
    Employee: 'employees/employee.entity', Leave: 'requests/entities/leave.entities',
    AttendanceDay: 'attendance/attendance.entities', OffboardingCase: 'offboarding/offboarding.entities',
    SettlementLine: 'offboarding/offboarding.entities', NotificationRead: 'assets/notification-read.entity',
    Request: 'requests/entities/request.entity', RequestType: 'requests/entities/request-type.entity',
    ApprovalChain: 'requests/entities/approval-chain.entity', ApprovalStep: 'requests/entities/approval-step.entity',
    Loan: 'requests/entities/financial.entities', LoanInstallment: 'requests/entities/financial.entities',
    LeaveBalance: 'requests/entities/leave.entities', RequestsConfig: 'requests/entities/requests-config.entity',
    OvertimeEntry: 'requests/entities/attendance.entities', LetterRequest: 'requests/entities/letter.entities',
    ClearanceItem: 'offboarding/offboarding.entities' })) {
    repos[name] = ds.getRepository(require(`../src/${file}`)[name])
  }
  branch = await repos.Branch.save({ name: 'Test A', code: 'TEST_A', weekendDays: '' })
  otherBranch = await repos.Branch.save({ name: 'Test B', code: 'TEST_B', weekendDays: '' })
  emp = await repos.Employee.save({ employeeCode: 'TEST001', fullName: 'Recovery employee', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 6000, status: 'active' })
  otherEmp = await repos.Employee.save({ employeeCode: 'TEST002', fullName: 'Other branch', branchId: otherBranch.id,
    joinDate: '2020-01-01', basicSalary: 9000, status: 'active' })
  const makeUser = (email, role, branchId, employeeId, permissions = []) => repos.User.save({ email, role, branchId,
    employeeId, displayName: email, passwordHash: 'unused-in-token-tests', permissions: JSON.stringify(permissions) })
  admin = await makeUser('admin@test.invalid', 'super_admin', null, null)
  hr = await makeUser('hr@test.invalid', 'hr_manager', branch.id, null,
    ['employees.view', 'employees.edit', 'offboarding.manage', 'settlement.edit', 'settings.manage', 'users.manage'])
  employee = await makeUser('employee@test.invalid', 'employee', branch.id, emp.id)
  outsider = await makeUser('other@test.invalid', 'employee', otherBranch.id, otherEmp.id)
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_recovery_test_[a-f0-9]{16}$/)
    assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
  assert.ok(path.basename(uploads).startsWith('hr-recovery-files-'))
  assert.equal(path.dirname(uploads), require('node:os').tmpdir())
  fs.rmSync(uploads, { recursive: true, force: true })
})

test('unauthenticated requests are rejected', async () => {
  assert.equal((await request(null, 'GET', '/attendance/my-today')).status, 401)
})
test('my-today reads schedule and leave without materializing attendance', async () => {
  const before = await repos.AttendanceDay.count()
  const response = await request(employee, 'GET', '/attendance/my-today')
  assert.equal(response.status, 200, JSON.stringify(response.body))
  assert.equal(response.body.shift, null)
  assert.equal(response.body.day, null)
  assert.equal(await repos.AttendanceDay.count(), before)
  assert.equal((await request(admin, 'GET', '/attendance/my-today')).body, null)
})
test('work schedules persist; assignment and branch isolation are enforced', async () => {
  const create = await request(admin, 'POST', '/catalogs/work-schedules', {
    name: 'Recovery schedule', startTime: '22:00', endTime: '06:00', weekendDays: '', isActive: true,
    effectiveFrom: '2020-01-01', changeReason: 'تعريف الدوام التاريخي المستخدم في اختبار الاستعادة',
  })
  assert.equal(create.status, 201, JSON.stringify(create.body))
  const id = create.body.id
  assert.equal((await request(employee, 'POST', `/catalogs/work-schedules/${id}/assign`, { employeeIds: [emp.id] })).status, 403)
  assert.equal((await request(hr, 'POST', `/catalogs/work-schedules/${id}/assign`, { employeeIds: [otherEmp.id] })).status, 404)
  const assign = await request(hr, 'POST', `/catalogs/work-schedules/${id}/assign`, {
    employeeIds: [emp.id], effectiveFrom: '2020-01-01', changeReason: 'إسناد الدوام التاريخي لاختبار البصمات الليلية',
  })
  assert.equal(assign.status, 201, JSON.stringify(assign.body))
  assert.equal(assign.body.assigned, 1)
  const today = await request(employee, 'GET', '/attendance/my-today')
  assert.equal(today.body.shift.start, '22:00')
  assert.equal(today.body.shift.end, '06:00')
  assert.equal((await request(admin, 'GET', '/catalogs/work-schedules')).body.find(s => s.id === id).employeeCount, 1)
})
test('document types support persisted creation and renaming with permission checks', async () => {
  const create = await request(admin, 'POST', '/catalogs/doc-types', { code: 'test_permit', nameAr: 'Test permit', isActive: true })
  assert.equal(create.status, 201, JSON.stringify(create.body))
  assert.ok((await request(employee, 'GET', '/catalogs/doc-types')).body.some(t => t.code === 'test_permit'))
  const rename = await request(admin, 'PATCH', `/catalogs/doc-types/${create.body.id}`, { nameAr: 'Updated permit' })
  assert.equal(rename.status, 200)
  const forbidden = await request(employee, 'PATCH', `/catalogs/doc-types/${create.body.id}`, { nameAr: 'Unauthorized' })
  assert.equal(forbidden.status, 403)
})
test('offboarding preview has no writes and uses the same EOS as persisted settlement', async () => {
  const service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  const actor = { sub: hr.id, role: hr.role, branchId: branch.id, permissions: JSON.parse(hr.permissions) }
  const before = await repos.SettlementLine.count()
  const preview = await service.preview(actor, { employeeId: emp.id, reason: 'termination', lastWorkingDay: '2026-09-01' })
  assert.equal(await repos.SettlementLine.count(), before)
  const rows = await service.buildSettlement({ id: 0, employeeId: emp.id, terminationReason: 'termination', lastWorkingDay: '2026-09-01' }, true, true)
  assert.deepEqual(preview.lines, rows.map(({ label, type, amount }) => ({ label, type, amount })))
  const kase = await repos.OffboardingCase.save({ employeeId: emp.id, terminationReason: 'termination', lastWorkingDay: '2026-09-01', status: 'IN_SETTLEMENT' })
  await service.recalcLines(actor, kase.id)
  const persisted = await repos.SettlementLine.findBy({ caseId: kase.id })
  assert.deepEqual(preview.lines, persisted.map(({ label, type, amount }) => ({ label, type, amount: Number(amount) })))
  assert.ok(preview.lines.some(l => l.amount > 0))
  await assert.rejects(service.preview(actor, { employeeId: otherEmp.id, reason: 'termination', lastWorkingDay: '2026-09-01' }), /غير موجود/)
})

test('a structural approval with no manager fails before entering the workflow', async () => {
  const chain = await repos.ApprovalChain.save({ code: 'TEST_MANAGER', nameAr: 'Manager test', isActive: true })
  await repos.ApprovalStep.save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  await repos.RequestType.save({ code: 'TEST_MANAGER', nameAr: 'Manager test', category: 'personal_data',
    destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  const before = await repos.Request.count()
  const result = await request(employee, 'POST', '/requests', { typeCode: 'TEST_MANAGER', submit: true })
  assert.equal(result.status, 400, JSON.stringify(result.body))
  assert.equal(await repos.Request.count(), before)
})
test('disabled approval chains stop new submissions', async () => {
  const chain = await repos.ApprovalChain.save({ code: 'TEST_DISABLED', nameAr: 'Disabled', isActive: false, autoApprove: true })
  await repos.RequestType.save({ code: 'TEST_DISABLED', nameAr: 'Disabled', category: 'personal_data',
    destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  assert.equal((await request(employee, 'POST', '/requests', { typeCode: 'TEST_DISABLED', submit: true })).status, 400)
})
test('personal updates cannot change email or bank outside their controlled routes', async () => {
  await repos.RequestType.save({ code: 'TEST_PERSONAL', nameAr: 'Personal', category: 'personal_data', destinationHandler: 'employee_record', isActive: true })
  for (const payload of [{ email: 'attacker@test.invalid' }, { bankName: 'Other bank' }]) {
    assert.equal((await request(employee, 'POST', '/requests', { typeCode: 'TEST_PERSONAL', payload, submit: true })).status, 400)
  }
})
test('early loan settlement pays existing installments instead of creating another loan', async () => {
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const loan = await repos.Loan.save({ employeeId: emp.id, amount: 1200, status: 'APPROVED' })
  await repos.LoanInstallment.save([{ loanId: loan.id, dueDate: '2027-01-01', amount: 600 }, { loanId: loan.id, dueDate: '2027-02-01', amount: 600 }])
  const type = { code: 'EARLY_LOAN_SETTLEMENT', destinationHandler: 'loans_installments' }
  // الحركة المالية تتطلب طلبًا معتمدًا داخل معاملته؛ إعادة تنفيذ نفس الطلب آمنة (نفس الحركة)، وطلب آخر يُرفض لأن السلفة مسددة.
  const req = { id: 10000, typeCode: type.code, requesterId: emp.id, status: 'APPROVED', payload: JSON.stringify({ loanId: loan.id }) }
  const before = await repos.Loan.count()
  await ds.transaction(em => destinations.execute(em, req, type))
  assert.equal(await repos.Loan.count(), before)
  assert.equal(await repos.LoanInstallment.countBy({ loanId: loan.id, paid: false }), 0)
  assert.equal((await repos.Loan.findOneBy({ id: loan.id })).status, 'SETTLED')
  const [repayment] = await ds.query("SELECT CONVERT(varchar(40),amount) AS amount,mode,reference,requestId FROM loan_repayments WHERE loanId=@0", [loan.id])
  assert.deepEqual([repayment.amount, repayment.mode, repayment.reference, repayment.requestId], ['1200.00', 'FULL', 'REQ-10000', 10000])
  await ds.transaction(em => destinations.execute(em, req, type))
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM loan_repayments WHERE loanId=@0', [loan.id]))[0].n, 1)
  await assert.rejects(ds.transaction(em => destinations.execute(em, { ...req, id: 10002 }, type)), /مسددة/)
})
test('invalid loan amounts and fractional installment counts roll back', async () => {
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const before = await repos.Loan.count()
  for (const payload of [{ amount: -1, months: 1 }, { amount: 'bad', months: 1 }, { amount: 100, months: 1.5 }]) {
    await assert.rejects(ds.transaction(em => destinations.execute(em,
      { id: 10001, typeCode: 'LOAN', requesterId: emp.id, payload: JSON.stringify(payload) },
      { code: 'LOAN', destinationHandler: 'loans_installments' })))
  }
  assert.equal(await repos.Loan.count(), before)
})
test('future punches and weak device keys cannot write attendance', async () => {
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  await assert.rejects(service.ingest([{ employeeCode: emp.employeeCode, timestamp: '2099-01-01T08:00:00' }], undefined,
    { sub: admin.id, role: 'super_admin', employeeId: null, permissions: ['*'] }))
  await assert.rejects(service.ingest([{ employeeCode: emp.employeeCode, timestamp: '2026-01-01T08:00:00' }], 'weak'))
})
test('overnight punches are attributed to the starting workday', async () => {
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const actor = { sub: admin.id, role: 'super_admin', employeeId: null, permissions: ['*'] }
  await repos.RequestsConfig.update({ key: 'overtime.enabled' }, { value: 'true' })
  await service.ingest([
    { employeeCode: emp.employeeCode, timestamp: '2026-09-07T22:00:00' },
    { employeeCode: emp.employeeCode, timestamp: '2026-09-08T06:00:00' },
  ], undefined, actor, { reason: 'Recovery overnight test' })
  const day = await repos.AttendanceDay.findOneBy({ employeeId: emp.id, date: '2026-09-07' })
  assert.equal(day.checkIn, '22:00')
  assert.equal(day.checkOut, '06:00')
  assert.equal(day.workMinutes, 480)
  assert.equal(day.lateMinutes, 0)
  assert.equal(await repos.OvertimeEntry.countBy({ employeeId: emp.id, date: '2026-09-07', status: 'DETECTED' }), 0)
})
test('morning punch arriving in a later batch completes the previous overnight shift', async () => {
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const actor = { sub: admin.id, role: 'super_admin', employeeId: null, permissions: ['*'] }
  await service.ingest([{ employeeCode: emp.employeeCode, timestamp: '2026-09-09T22:00:00' }], undefined, actor)
  const incomplete = await repos.AttendanceDay.findOneBy({ employeeId: emp.id, date: '2026-09-09' })
  assert.equal(incomplete.checkOut, null)
  await service.ingest([{ employeeCode: emp.employeeCode, timestamp: '2026-09-10T06:00:00' }], undefined, actor)
  const complete = await repos.AttendanceDay.findOneBy({ employeeId: emp.id, date: '2026-09-09' })
  assert.equal(complete.checkOut, '06:00')
  assert.equal(complete.workMinutes, 480)
  assert.equal(complete.status, 'present')
  assert.equal(await repos.OvertimeEntry.countBy({ employeeId: emp.id, date: '2026-09-09', status: 'DETECTED' }), 0)
})
test('leave deduction consumes opening balance first and restores exactly', async () => {
  const service = app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  await repos.LeaveBalance.save({ employeeId: emp.id, balanceType: 'annual', period: '2026', entitled: 21,
    taken: 0, openingDays: 5, openingTaken: 0, openingExpiry: '2026-12-31' })
  await ds.transaction(em => service.deduct(em, emp.id, 'annual', 7, '2026-09-01'))
  const deducted = await repos.LeaveBalance.findOneBy({ employeeId: emp.id, balanceType: 'annual', period: '2026' })
  assert.equal(Number(deducted.taken), 7)
  assert.equal(Number(deducted.openingTaken), 5)
  await ds.transaction(em => service.restore(em, emp.id, 'annual', 7, '2026'))
  const restored = await repos.LeaveBalance.findOneBy({ id: deducted.id })
  assert.equal(Number(restored.taken), 0)
  assert.equal(Number(restored.openingTaken), 0)
})
test('notification reads and dismissals persist and stay private', async () => {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  await repos.AttendanceDay.save({ employeeId: emp.id, branchId: branch.id, date, status: 'missing_punch', checkIn: '08:00',
    shiftName: 'Test shift', shiftStart: '08:00', shiftEnd: '17:00' })
  const notifications = await request(employee, 'GET', '/notifications')
  assert.equal(notifications.status, 200, JSON.stringify(notifications.body))
  const item = notifications.body.find(n => n.id.startsWith('missing-punch-'))
  assert.ok(item)
  assert.equal(item.category, 'attendance')
  assert.equal(item.read, false)
  assert.equal((await request(employee, 'PATCH', '/notifications/read', { ids: [item.id] })).status, 200)
  assert.equal((await request(employee, 'GET', '/notifications')).body.find(n => n.id === item.id).read, true)
  assert.ok(!(await request(outsider, 'GET', '/notifications')).body.some(n => n.id === item.id))
  assert.equal((await request(employee, 'DELETE', `/notifications/${item.id}`)).status, 200)
  assert.ok(!(await request(employee, 'GET', '/notifications')).body.some(n => n.id === item.id))
})
test('old JWTs stop working when tokenVersion changes', async () => {
  const old = token(employee)
  await repos.User.increment({ id: employee.id }, 'tokenVersion', 1)
  assert.equal((await request(old, 'GET', '/attendance/my-today')).status, 401)
  employee.tokenVersion = 1
  assert.equal((await request(employee, 'GET', '/attendance/my-today')).status, 200)
})

test('failed direct submission leaves no orphan draft', async () => {
  await repos.RequestType.save({ code: 'TEST_NO_CHAIN', nameAr: 'No chain test', category: 'personal_data',
    destinationHandler: 'none', isActive: true })
  const before = await repos.Request.count()
  const result = await request(employee, 'POST', '/requests', { typeCode: 'TEST_NO_CHAIN', submit: true })
  assert.equal(result.status, 400, JSON.stringify(result.body))
  assert.equal(await repos.Request.count(), before)
})
test('required fields are enforced when submitting a previously saved draft', async () => {
  await repos.RequestType.save({ code: 'TEST_REQUIRED', nameAr: 'Required test', category: 'personal_data',
    requiredFields: JSON.stringify(['reason']), destinationHandler: 'none', isActive: true })
  const draft = await request(employee, 'POST', '/requests', { typeCode: 'TEST_REQUIRED', submit: false })
  assert.equal(draft.status, 201, JSON.stringify(draft.body))
  const submitted = await request(employee, 'POST', `/requests/${draft.body.id}/submit`)
  assert.equal(submitted.status, 400)
  assert.match(submitted.body.message, /reason/)
  assert.equal((await repos.Request.findOneBy({ id: draft.body.id })).status, 'DRAFT')
})
test('failed resubmission preserves returned status and original payload', async () => {
  const draft = await repos.Request.save({ typeCode: 'TEST_NO_CHAIN', requesterId: emp.id,
    branchId: branch.id, status: 'RETURNED_FOR_INFO', payload: JSON.stringify({ reason: 'original' }) })
  const response = await request(employee, 'POST', `/requests/${draft.id}/resubmit`, { payload: { reason: 'changed' } })
  assert.equal(response.status, 400, JSON.stringify(response.body))
  const saved = await repos.Request.findOneBy({ id: draft.id })
  assert.equal(saved.status, 'RETURNED_FOR_INFO')
  assert.deepEqual(JSON.parse(saved.payload), { reason: 'original' })
})
test('unsupported destinations cannot create completed requests', async () => {
  await repos.RequestType.save({ code: 'TEST_UNSUPPORTED', nameAr: 'Unsupported', category: 'personal_data',
    destinationHandler: 'not_implemented', isActive: true })
  const before = await repos.Request.count()
  assert.equal((await request(employee, 'POST', '/requests', { typeCode: 'TEST_UNSUPPORTED', submit: true })).status, 400)
  assert.equal(await repos.Request.count(), before)
})
test('on-behalf submission does not escape the actor branch', async () => {
  const actor = { ...hr, permissions: JSON.stringify(['requests.create_on_behalf']) }
  const before = await repos.Request.count()
  const result = await request(actor, 'POST', '/requests', {
    typeCode: 'TEST_REQUIRED', onBehalfEmployeeId: otherEmp.id, payload: { reason: 'Cross branch' }, submit: false,
  })
  assert.equal(result.status, 403)
  assert.equal(await repos.Request.count(), before)
})
test('request details cannot be read by unrelated employees', async () => {
  const req = await repos.Request.save({ typeCode: 'TEST_REQUIRED', requesterId: emp.id,
    branchId: branch.id, status: 'DRAFT', payload: '{}' })
  assert.equal((await request(outsider, 'GET', `/requests/${req.id}`)).status, 403)
})
test('future attendance recalculation does not store absence', async () => {
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const future = '2099-01-01'
  await service.computeDay(emp.id, future)
  assert.equal(await repos.AttendanceDay.countBy({ employeeId: emp.id, date: future }), 0)
})
test('negative shift grace and invalid holiday ranges are rejected', async () => {
  assert.equal((await request(admin, 'POST', '/catalogs/shifts', {
    name: 'Invalid', startTime: '08:00', endTime: '17:00', graceMinutes: -5,
  })).status, 400)
  assert.equal((await request(admin, 'POST', '/catalogs/holidays', {
    name: 'Invalid', date: '2026-09-11', endDate: '2026-09-10',
  })).status, 400)
})
test('manual finalization respects branch scope, last working day and idempotency', async () => {
  const today = new Date()
  const ymd = d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const make = async (code, branchId, lastWorkingDay) => {
    const e = await repos.Employee.save({ employeeCode: code, fullName: code, branchId, status: 'notice_period', joinDate: '2020-01-01' })
    const c = await repos.OffboardingCase.save({ employeeId: e.id, lastWorkingDay, status: 'SETTLED', settlementNet: 100 })
    return { e, c }
  }
  const due = await make('END_A', branch.id, ymd(yesterday))
  const sameDay = await make('END_TODAY', branch.id, ymd(today))
  const other = await make('END_B', otherBranch.id, ymd(yesterday))
  const result = await request(hr, 'POST', '/offboarding/finalize-due')
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.finalized, 1)
  assert.equal((await repos.Employee.findOneBy({ id: due.e.id })).status, 'terminated')
  assert.equal((await repos.OffboardingCase.findOneBy({ id: due.c.id })).status, 'CLOSED')
  assert.equal((await repos.Employee.findOneBy({ id: sameDay.e.id })).status, 'notice_period')
  assert.equal((await repos.Employee.findOneBy({ id: other.e.id })).status, 'notice_period')
  assert.equal((await request(hr, 'POST', '/offboarding/finalize-due')).body.finalized, 0)
})

test('retirement opens clearance and notice period without prematurely disabling the employee', async () => {
  const retiring = await repos.Employee.save({ employeeCode: 'RETIRE_TEST', fullName: 'Retiring employee', branchId: branch.id,
    status: 'active', joinDate: '2020-01-01' })
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const result = await ds.transaction(em => destinations.execute(em,
    { id: 20001, typeCode: 'RETIREMENT', requesterId: retiring.id, payload: JSON.stringify({ effectiveDate: '2027-01-01' }) },
    { code: 'RETIREMENT', nameAr: 'Retirement', destinationHandler: 'employee_status' }))
  assert.equal(result.completed, true)
  const e = await repos.Employee.findOneBy({ id: retiring.id })
  assert.equal(e.status, 'notice_period')
  assert.equal(e.isActive, true)
  const kase = await repos.OffboardingCase.findOneBy({ employeeId: retiring.id })
  assert.equal(kase.terminationReason, 'retirement')
  assert.equal(await repos.ClearanceItem.countBy({ caseId: kase.id }), 5)
  const service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  await assert.rejects(service.withdraw({ sub: employee.id, employeeId: retiring.id, role: 'employee', branchId: branch.id }, kase.id), /للموارد البشرية/)
})
test('letters generate real Arabic PDFs, persist once and restrict downloads to owner/scoped HR', async () => {
  await repos.RequestsConfig.save({ key: 'company.name', value: 'شركة آفاق للتقنية — بيانات تجريبية' })
  await repos.Employee.update(emp.id, { fullName: 'أحمد محمد عبدالله', jobTitle: 'مهندس برمجيات', phoneAllowance: 150, workNatureAllowance: 250, otherAllowance: 300 })
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const req = { id: 20002, typeCode: 'LETTER_SALARY', requesterId: emp.id, payload: JSON.stringify({ purpose: 'تقديم تعريف بالراتب إلى الجهة المختصة' }) }
  const result = await ds.transaction(em => destinations.execute(em,
    req,
    { code: 'LETTER_SALARY', destinationHandler: 'letter_pdf_generator' }))
  assert.equal(result.completed, true)
  const letter = await repos.LetterRequest.findOneBy({ requestId: 20002 })
  assert.equal(letter.status, 'GENERATED')
  assert.match(letter.generatedPdfRef, /^file:\d+$/)
  const files = ds.getRepository(require('../src/files/stored-file.entity').StoredFile)
  const file = await files.findOneBy({ id: Number(letter.generatedPdfRef.slice(5)) })
  const bytes = fs.readFileSync(path.join(uploads, file.storedName))
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  assert.ok(bytes.length > 10000)
  const sample = path.resolve(apiRoot, '../output/pdf/salary-letter-sample.pdf')
  fs.mkdirSync(path.dirname(sample), { recursive: true }); fs.writeFileSync(sample, bytes)
  const response = await fetch(`${base}/letters/${letter.id}/download`, { headers: { Authorization: `Bearer ${token(employee)}` } })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/pdf')
  assert.equal((await response.arrayBuffer()).byteLength, bytes.length)
  assert.equal((await request(outsider, 'GET', `/letters/${letter.id}/download`)).status, 403)
  assert.equal((await request(outsider, 'GET', `/files/${file.id}`)).status, 403)
  const scopedOtherHR = { ...hr, branchId: otherBranch.id, permissions: JSON.stringify(['documents.manage']) }
  assert.equal((await request(scopedOtherHR, 'GET', `/letters/${letter.id}/download`)).status, 403)
  const repeat = await ds.transaction(em => destinations.execute(em, req, { code: 'LETTER_SALARY', destinationHandler: 'letter_pdf_generator' }))
  assert.deepEqual(repeat, result)
  assert.equal(await repos.LetterRequest.countBy({ requestId: req.id }), 1)
  assert.equal(await files.countBy({ entityType: 'letter', entityId: req.id }), 1)
})

test('letter generation without required company identity leaves no destination or file record', async () => {
  await repos.RequestsConfig.update({ key: 'company.name' }, { value: '' })
  const letters = app.get(require('../src/letters/letters.service').LettersService)
  await assert.rejects(ds.transaction(em => letters.generate(em, { id: 29999, requesterId: emp.id }, { code: 'LETTER_SALARY' }, {})), /اسم الشركة/)
  assert.equal(await repos.LetterRequest.countBy({ requestId: 29999 }), 0)
})

test('file metadata cannot spoof another employee or public company logo', async () => {
  const upload = async (user, query) => {
    const form = new FormData(); form.append('file', new Blob(['%PDF-test'], { type: 'application/pdf' }), 'test.pdf')
    return fetch(`${base}/files/upload?${query}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  }
  assert.equal((await upload(employee, `employeeId=${otherEmp.id}&entityType=document`)).status, 404)
  assert.equal((await upload(employee, 'entityType=company_logo')).status, 403)
  assert.equal((await upload(employee, 'employeeId=-1')).status, 400)
  const response = await upload(employee, 'entityType=document')
  assert.equal(response.status, 201)
  const file = await response.json()
  assert.equal((await request(outsider, 'GET', `/files/${file.id}`)).status, 403)
})
test('an unchanged aggregated notification stays dismissed but a new item brings it back', async () => {
  const actor = { ...hr, permissions: JSON.stringify(['attendance.manage']) }
  let item = (await request(actor, 'GET', '/notifications')).body.find(n => n.id === 'missing-punch-scope')
  assert.ok(item)
  await request(actor, 'DELETE', '/notifications/missing-punch-scope')
  assert.ok(!(await request(actor, 'GET', '/notifications')).body.some(n => n.id === item.id))
  const now = new Date(); now.setDate(now.getDate() - 1)
  const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  await repos.AttendanceDay.save({ employeeId: emp.id, branchId: branch.id, date,
    status: 'missing_punch', checkIn: '08:00', shiftName: 'Test', shiftStart: '08:00', shiftEnd: '17:00' })
  item = (await request(actor, 'GET', '/notifications')).body.find(n => n.id === 'missing-punch-scope')
  assert.ok(item)
  assert.equal(item.read, false)
})

test('expiry reminders derive from current scoped data and disappear after renewal', async () => {
  const soon = new Date(); soon.setDate(soon.getDate() + 10)
  const date = [soon.getFullYear(), String(soon.getMonth() + 1).padStart(2, '0'), String(soon.getDate()).padStart(2, '0')].join('-')
  await repos.Employee.update(emp.id, { contractEnd: date })
  await repos.Employee.update(otherEmp.id, { contractEnd: date })
  const docs = ds.getRepository(require('../src/assets/assets.entities').EmployeeDocument)
  const own = await docs.save({ employeeId: emp.id, docType: 'test_permit', expiryDate: date })
  const other = await docs.save({ employeeId: otherEmp.id, docType: 'test_permit', expiryDate: date })
  const notices = (await request(employee, 'GET', '/notifications')).body
  assert.ok(notices.some(n => n.id === `contract-expiry-${emp.id}-${date}`))
  assert.ok(notices.some(n => n.id === `document-expiry-${own.id}-${date}`))
  assert.ok(!notices.some(n => n.id === `contract-expiry-${otherEmp.id}-${date}` || n.id === `document-expiry-${other.id}-${date}`))
  await docs.update(own.id, { expiryDate: '2099-12-31' })
  await repos.Employee.update(emp.id, { contractEnd: '2099-12-31' })
  const renewed = (await request(employee, 'GET', '/notifications')).body
  assert.ok(!renewed.some(n => n.id === `contract-expiry-${emp.id}-${date}` || n.id === `document-expiry-${own.id}-${date}`))
})

test('canonical leave handlers keep balance behavior and old saved keys remain executable', async () => {
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const options = await request(admin, 'GET', '/settings/destination-handlers')
  assert.equal(options.status, 200)
  const keys = options.body.map(x => x.key)
  for (const key of ['leave_deduct_balance', 'leave_no_balance', 'custody_return']) assert.ok(keys.includes(key))
  for (const key of ['leave_calendar_balance', 'leave_calendar', 'leave_calendar_payroll', 'leave_calendar_once', 'custody_assignments']) assert.ok(!keys.includes(key))
  const variants = [['leave_deduct_balance', 1], ['leave_calendar', 1], ['leave_calendar_balance', 1], ['leave_no_balance', 0], ['leave_calendar_payroll', 0], ['leave_calendar_once', 0]]
  for (const [index, [handler, deduction]] of variants.entries()) {
    const e = await repos.Employee.save({ employeeCode: `HANDLER${index}`, fullName: handler, branchId: branch.id, joinDate: '2020-01-01', status: 'active', basicSalary: 1000 })
    await repos.LeaveBalance.save({ employeeId: e.id, balanceType: 'annual', period: '2026', entitled: 21, taken: 0, openingDays: 5, openingTaken: 0, openingExpiry: '2026-12-31' })
    const result = await ds.transaction(em => destinations.execute(em, { id: 35000 + index, requesterId: e.id, payload: JSON.stringify({ leaveType: 'ANNUAL', fromDate: '2026-09-15', toDate: '2026-09-15', days: 1 }) }, { code: 'LEAVE', destinationHandler: handler }))
    assert.equal(result.completed, true)
    assert.equal(await repos.Leave.countBy({ employeeId: e.id, status: 'APPROVED' }), 1)
    assert.equal(Number((await repos.LeaveBalance.findOneBy({ employeeId: e.id, balanceType: 'annual', period: '2026' })).taken), deduction)
  }
})

test('work type accepts legacy aliases but stores canonical values and rejects unknown codes', async () => {
  const e = await repos.Employee.findOneByOrFail({ employeeCode: 'HANDLER0' })
  for (const [input, stored] of [['fulltime', 'full_time'], ['parttime', 'part_time'], ['consultant', 'consultant']]) {
    const response = await request(admin, 'PATCH', `/employees/${e.id}`, { workType: input })
    assert.equal(response.status, 200, JSON.stringify(response.body))
    assert.equal((await repos.Employee.findOneByOrFail({ id: e.id })).workType, stored)
  }
  assert.equal((await request(admin, 'PATCH', `/employees/${e.id}`, { workType: 'unknown' })).status, 400)
  assert.equal((await repos.Employee.findOneByOrFail({ id: e.id })).workType, 'consultant')
  assert.equal((await request(admin, 'PATCH', `/employees/${e.id}`, { workType: null })).status, 200)
  assert.equal((await repos.Employee.findOneByOrFail({ id: e.id })).workType, null)
})

test('letter template catalog, draft validation, preview and optimistic editing enforce access and publication', async () => {
  assert.equal((await request(outsider, 'GET', '/letters/templates')).status, 403)
  assert.equal((await request(null, 'GET', '/letters/templates')).status, 401)
  const catalog = await request(admin, 'GET', '/letters/templates')
  assert.equal(catalog.status, 200)
  assert.equal(catalog.body.templates.filter(t => t.publishedRevision).length, 6)
  assert.ok(catalog.body.variables.some(v => v.key === 'employee.fullName'))
  const draft = { title: 'خطاب اختبار', greeting: 'إلى من يهمه الأمر', body: 'نشهد أن {{employee.fullName}} يعمل في {{company.name}}.', closing: 'وتفضلوا بقبول الاحترام', footer: '' }
  for (const body of ['رمز غير مسموح {{employee.password}}', 'متغير ناقص {{employee.fullName', 'قصير']) {
    assert.equal((await request(admin, 'POST', '/letters/templates', { name: 'Invalid', draft: { ...draft, body } })).status, 400)
  }
  assert.equal((await request(outsider, 'POST', '/letters/templates', { name: 'Forbidden', draft })).status, 403)
  const made = await request(admin, 'POST', '/letters/templates', { name: 'Editable test', draft })
  assert.equal(made.status, 201, JSON.stringify(made.body))
  assert.equal(made.body.publishedRevision, null)
  for (const field of ['name', 'draft', 'isActive']) assert.equal((await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: 1, [field]: null })).status, 400)
  const saved = await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: 1, draft: { ...draft, title: 'مسودة معدلة' } })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.version, 2)
  const stale = await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: 1, name: 'Stale overwrite' })
  assert.equal(stale.status, 409)
  assert.equal((await request(admin, 'POST', `/letters/templates/${made.body.id}/publish`, { version: 1 })).status, 409)
  const published = await request(admin, 'POST', `/letters/templates/${made.body.id}/publish`, { version: 2 })
  assert.equal(published.status, 201)
  assert.equal(published.body.publishedRevision.title, 'مسودة معدلة')
  const again = await request(admin, 'POST', `/letters/templates/${made.body.id}/publish`, { version: published.body.version })
  assert.equal(again.body.publishedRevision.id, published.body.publishedRevision.id)
  const preview = await fetch(`${base}/letters/templates/preview`, { method: 'POST', headers: { Authorization: `Bearer ${token(admin)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ draft }) })
  assert.equal(preview.status, 201)
  assert.equal(preview.headers.get('content-type'), 'application/pdf')
  const bytes = Buffer.from(await preview.arrayBuffer())
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
  const sample = path.resolve(apiRoot, '../output/pdf/template-preview.pdf')
  fs.mkdirSync(path.dirname(sample), { recursive: true }); fs.writeFileSync(sample, bytes)
})

test('approved custom letter uses the bound published revision and preserves its issued snapshot', async () => {
  await repos.RequestsConfig.update({ key: 'company.name' }, { value: 'شركة المراجعة التجريبية' })
  const letterEmp = await repos.Employee.save({ employeeCode: 'LETTERFLOW', fullName: 'أحمد محمد للاختبار', branchId: branch.id, joinDate: '2020-01-01', jobTitle: 'أخصائي موارد بشرية', basicSalary: 8500, status: 'active' })
  const actor = await repos.User.save({ email: 'letter@test.invalid', role: 'employee', branchId: branch.id, employeeId: letterEmp.id, displayName: 'Letter test', passwordHash: 'unused-in-token-tests', permissions: '[]' })
  const chain = await repos.ApprovalChain.save({ code: 'LETTER_FLOW_TEST', nameAr: 'اعتماد الخطاب', isActive: true })
  await repos.ApprovalStep.save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  const type = await repos.RequestType.save({ code: 'LETTER_CUSTOM_TEST', nameAr: 'خطاب مخصص', category: 'letters', destinationHandler: 'letter_pdf_generator', approvalChainId: chain.id, isActive: true })
  const draft = { title: 'شهادة مخصصة', greeting: 'إلى من يهمه الأمر', body: 'النسخة الأولى: {{employee.fullName}} — {{employee.jobTitle}} — {{purpose}}', closing: 'وتفضلوا بقبول الاحترام', footer: 'شؤون الموظفين' }
  const made = await request(admin, 'POST', '/letters/templates', { name: 'Workflow custom', draft })
  assert.equal(made.status, 201)
  const endpoint = `/letters/template-bindings/${type.code}`
  assert.equal((await request(admin, 'PATCH', endpoint, { templateId: made.body.id })).status, 400)
  const count = await repos.Request.count()
  const submit = () => request(actor, 'POST', '/requests', { typeCode: type.code, payload: { purpose: 'طلب البنك التجريبي' }, submit: true })
  assert.equal((await submit()).status, 400)
  assert.equal(await repos.Request.count(), count, 'Unbound submission must not leave an orphan request')
  const pub1 = await request(admin, 'POST', `/letters/templates/${made.body.id}/publish`, { version: made.body.version })
  assert.equal(pub1.status, 201)
  assert.equal((await request(admin, 'PATCH', endpoint, { templateId: made.body.id })).status, 200)
  const req1 = await submit()
  assert.equal(req1.status, 201, JSON.stringify(req1.body))
  assert.equal(req1.body.status, 'UNDER_REVIEW')
  assert.equal(await repos.LetterRequest.countBy({ requestId: req1.body.id }), 0, 'No document is issued before approval')
  const approved = await request(admin, 'POST', `/requests/${req1.body.id}/act`, { action: 'APPROVE', comment: 'اختبار اعتماد خطاب' })
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const issued = await repos.LetterRequest.findOneByOrFail({ requestId: req1.body.id })
  assert.equal(issued.templateRevisionId, pub1.body.publishedRevision.id)
  assert.ok(issued.contentSnapshot.content.body.includes('النسخة الأولى: أحمد محمد للاختبار'))
  assert.ok(!issued.contentSnapshot.content.body.includes('{{'))
  const files = ds.getRepository(require('../src/files/stored-file.entity').StoredFile)
  const stored = await files.findOneByOrFail({ id: Number(issued.generatedPdfRef.replace('file:', '')) })
  const filePath = require('../src/files/storage').storedPath(stored.storedName)
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
  const v2 = await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: pub1.body.version, draft: { ...draft, body: 'النسخة الثانية المعتمدة: {{employee.fullName}} والغرض {{purpose}}' } })
  assert.equal(v2.status, 200)
  const req2 = await submit()
  assert.equal(req2.status, 201)
  assert.equal((await request(admin, 'POST', `/requests/${req2.body.id}/act`, { action: 'APPROVE' })).status, 201)
  assert.equal((await repos.LetterRequest.findOneByOrFail({ requestId: req2.body.id })).templateRevisionId, issued.templateRevisionId, 'Saving a draft must not change issued content')
  const pub2 = await request(admin, 'POST', `/letters/templates/${made.body.id}/publish`, { version: v2.body.version })
  assert.equal(pub2.body.publishedRevision.revision, 2)
  const req3 = await submit()
  assert.equal((await request(admin, 'POST', `/requests/${req3.body.id}/act`, { action: 'APPROVE' })).status, 201)
  assert.equal((await repos.LetterRequest.findOneByOrFail({ requestId: req3.body.id })).templateRevisionId, pub2.body.publishedRevision.id)
  await repos.Employee.update(letterEmp.id, { fullName: 'اسم جديد لا يغير الخطاب الصادر' })
  const service = app.get(require('../src/letters/letters.service').LettersService)
  await ds.transaction(em => service.generate(em, { id: req1.body.id, requesterId: letterEmp.id }, type, {}))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'), hash)
  assert.deepEqual((await repos.LetterRequest.findOneByOrFail({ id: issued.id })).contentSnapshot, issued.contentSnapshot)
  assert.equal((await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: pub2.body.version, isActive: false })).status, 409)
  const catalog = (await request(admin, 'GET', '/letters/templates')).body
  const otherTemplate = catalog.templates.find(t => t.code === 'LETTER_SALARY')
  assert.equal((await request(admin, 'PATCH', endpoint, { templateId: otherTemplate.id })).status, 200)
  assert.equal((await request(admin, 'PATCH', `/letters/templates/${made.body.id}`, { version: pub2.body.version, isActive: false })).status, 200)
  await app.get(require('../src/letters/letter-templates.service').LetterTemplatesService).onApplicationBootstrap()
  const refreshed = (await request(admin, 'GET', '/letters/templates')).body
  assert.equal(refreshed.bindings.find(b => b.requestTypeCode === type.code).templateId, otherTemplate.id)
  assert.equal(refreshed.templates.find(t => t.id === made.body.id).draft.body, v2.body.draft.body)
  const download = await fetch(`${base}/letters/${issued.id}/download`, { headers: { Authorization: `Bearer ${token(actor)}` } })
  assert.equal(download.status, 200)
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex'), hash)
  assert.equal((await request(outsider, 'GET', `/letters/${issued.id}/download`)).status, 403)
})

test('my decisions are private, canonical, paginated and retain audit access after a branch change', async () => {
  const approvals = ds.getRepository(require('../src/requests/entities/request-approval.entity').RequestApproval)
  const req = await repos.Request.save({ typeCode: 'TEST_PERSONAL', requesterId: otherEmp.id, branchId: otherBranch.id, status: 'REJECTED', payload: JSON.stringify({ privateData: 'must-not-appear-in-summary' }) })
  const actions = await approvals.save(Array.from({ length: 52 }, (_, index) => ({ requestId: req.id, step: index + 1, approverId: hr.id, action: index % 2 ? 'RETURN' : 'APPROVE', comment: `My decision ${index}` })))
  const other = await approvals.save({ requestId: req.id, step: 53, approverId: outsider.id, action: 'REJECTED', comment: 'Other approver secret' })
  assert.equal((await request(null, 'GET', '/requests/my-decisions')).status, 401)
  for (const cursor of ['abc', '0', '-1', '1.5']) assert.equal((await request(hr, 'GET', `/requests/my-decisions?before=${cursor}`)).status, 400)
  const page1 = await request(hr, 'GET', '/requests/my-decisions')
  assert.equal(page1.status, 200, JSON.stringify(page1.body))
  assert.equal(page1.body.items.length, 50)
  assert.ok(page1.body.nextCursor)
  assert.ok(page1.body.items.every(item => ['APPROVED', 'RETURNED_FOR_INFO'].includes(item.action)))
  assert.ok(page1.body.items.every(item => item.requestId === req.id && !('payload' in item) && !('requesterId' in item)))
  assert.ok(!JSON.stringify(page1.body).includes('Other approver secret'))
  const page2 = await request(hr, 'GET', `/requests/my-decisions?before=${page1.body.nextCursor}`)
  assert.equal(page2.status, 200)
  const combined = [...page1.body.items, ...page2.body.items].filter(item => actions.some(action => action.id === item.id))
  assert.equal(combined.length, 52)
  assert.equal(new Set(combined.map(item => item.id)).size, 52)
  assert.equal((await request(hr, 'GET', `/requests/${req.id}`)).status, 200)
  const outsiders = await request(outsider, 'GET', '/requests/my-decisions')
  assert.ok(outsiders.body.items.some(item => item.id === other.id))
  assert.ok(!outsiders.body.items.some(item => actions.some(action => action.id === item.id)))
  assert.equal((await approvals.findOneByOrFail({ id: actions[0].id })).action, 'APPROVE', 'Read compatibility must not rewrite audit history')
})
