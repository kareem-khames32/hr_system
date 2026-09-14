// إرسال الكشف بعد الالتزام على SQL حقيقي مع إيقاف cron؛ كل البيانات في قاعدة عشوائية قابلة للحذف.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_ot_dispatch_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-dispatch-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const finance = require('../src/payroll/payroll-settlement-boundary')
const iso = day => `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
const dateAfter = (date, offset) => { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + offset); return iso(value) }
let day = dateAfter(iso(new Date()), -2)
while (new Date(`${day}T12:00:00`).getDay() !== 3) day = dateAfter(day, -1)
let app, master, ds, base, admin, attendance, requests, autoType, autoChain, created = false, sequence = 0
const repo = name => ds.getRepository(name)
async function http(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, employeeId: user.employeeId ?? null,
    branchId: user.branchId ?? null, tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
before(async () => {
  assert.match(database, /^hr_ot_dispatch_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  requests = app.get(require('../src/requests/requests.service').RequestsService)
  admin = await repo('User').save({ email: 'admin@ot-dispatch.invalid', displayName: 'مراجع اختبار الإرسال',
    passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  autoChain = await repo('ApprovalChain').save({ code: 'CUSTOM_AUTO_DISPATCH', nameAr: 'مسار مخصص لاختبار الإرسال', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save(['direct_manager_of_requester', 'department_manager_of_requester', 'hr'].map((role, i) => ({
    chainId: autoChain.id, stepOrder: i + 1, approverRole: role })))
  autoType = await repo('RequestType').save({ code: 'OVERTIME_AUTO', nameAr: 'إضافي مكتشف', category: 'time_attendance',
    isActive: true, approvalChainId: autoChain.id, destinationHandler: 'overtime_auto', requiredFields: '[]' })
  const correctionChain = await repo('ApprovalChain').save({ code: 'DISPATCH_CORRECTION', nameAr: 'اعتماد تصحيح البصمة', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: correctionChain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  await repo('RequestType').save({ code: 'PUNCH_CORRECTION', nameAr: 'تصحيح بصمة', category: 'time_attendance', isActive: true,
    approvalChainId: correctionChain.id, destinationHandler: 'attendance_corrections', requiredFields: '["date","in","out","reason"]' })
  await repo('RequestsConfig').save(Object.entries({ 'overtime.enabled': 'true', 'overtime.biometric_requires_confirmation': 'true',
    'overtime.detection_threshold_hours': '0.5', 'overtime.multiplier_weekday': '1.5', 'overtime.multiplier_weekend': '1.5',
    'overtime.multiplier_holiday': '2', 'overtime.rounding_minutes': '15', 'overtime.rounding_direction': 'DOWN',
    'overtime.max_hours_per_day': '0', 'overtime.max_hours_per_week': '0', 'overtime.max_hours_per_month': '0',
    'overtime.request_backdate_days': '30', 'overtime.max_closed_periods': '1', 'overtime.allow_early_overtime': 'false',
    'overtime.missing_punch_policy': 'BLOCK', 'overtime.leave_conflict_policy': 'BLOCK',
    'payroll.monthly_days': '30', 'payroll.daily_hours': '8', 'payroll.exempt_overtime_eligible': 'false',
    'attendance.weekend_days': 'FRI,SAT', 'attendance.grace_minutes': '0', 'attendance.flex.shortfall_grace_minutes': '10',
  }).map(([key, value]) => ({ key, value })))
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_ot_dispatch_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@database')
      assert.equal(found.recordset.length, 0); t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-ot-dispatch-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: temporary uploads removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Dispatch cleanup failed')
})
async function fixture() {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `DIS${n}`, name: `فرع إرسال ${n}`, weekendDays: 'FRI,SAT' })
  const department = await repo('Department').save({ branchId: branch.id, code: `DIS${n}`, name: `قسم إرسال ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `DIS${n}${suffix}`, fullName: `اختبار إرسال ${n} ${suffix}`,
    branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id })
  const user = employee => repo('User').save({ email: `${employee.employeeCode}@ot-dispatch.invalid`, displayName: employee.fullName,
    employeeId: employee.id, branchId: branch.id, passwordHash: 'isolated-test-token-only', role: 'employee', permissions: '[]' })
  const owner = await user(emp), manager = await user(managerEmployee)
  const shift = await http(admin, 'POST', '/catalogs/shifts', { name: `وردية إرسال ${n}`, startTime: '08:00', endTime: '17:00',
    shiftMode: 'fixed', graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'وردية مؤرخة لاختبار الإرسال الفوري' })
  assert.equal(shift.status, 201, JSON.stringify(shift.body))
  const assigned = await http(admin, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date: day, shiftId: shift.body.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
  return { emp, owner, manager, managerEmployee, headEmployee, branch, day }
}
async function punch(f, clocks = ['08:00', '19:35']) {
  const result = await http(admin, 'POST', '/attendance/punches/manual', { reason: 'اختبار إرسال فوري معزول',
    punches: clocks.map(time => ({ employeeCode: f.emp.employeeCode, timestamp: new Date(`${f.day}T${time}:00`).toISOString() })) })
  assert.equal(result.status, 201, JSON.stringify(result.body)); return result
}
async function rawPunches(f, em = ds.manager) {
  await em.getRepository('AttendancePunch').save(['08:00', '19:35'].map(time => ({ employeeId: f.emp.id,
    employeeCode: f.emp.employeeCode, punchTime: new Date(`${f.day}T${time}:00`), source: 'MANUAL', reason: 'بصمة اختبار داخل المعاملة' })))
}
async function routed(f, expectedId) {
  const entries = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id } })
  assert.equal(entries.length, 1)
  const entry = entries[0]
  if (expectedId != null) assert.equal(entry.id, expectedId)
  assert.equal(entry.status, 'SUBMITTED'); assert.ok(entry.requestId)
  assert.equal(entry.approvedMinutes, null); assert.equal(entry.amountSnapshot, null); assert.equal(entry.payableHours, null)
  const req = await repo('Request').findOneByOrFail({ id: entry.requestId })
  assert.equal(req.typeCode, 'OVERTIME_AUTO'); assert.equal(req.status, 'UNDER_REVIEW'); assert.equal(req.currentStep, 1)
  const steps = JSON.parse(req.resolvedSteps)
  assert.deepEqual(steps.map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  assert.equal(steps[0].approverEmployeeId, f.managerEmployee.id)
  assert.equal(steps[1].approverEmployeeId, f.headEmployee.id)
  assert.ok(steps.every(step => step.action === null))
  assert.equal(await repo('OvertimeDayClaim').count({ where: { entryId: entry.id } }), 1)
  return entry
}
async function withRunner(work) {
  const runner = ds.createQueryRunner()
  try { await runner.connect(); await runner.startTransaction(); return await work(runner) }
  finally { if (runner.isTransactionActive) await runner.rollbackTransaction(); await runner.release() }
}

test('Immediate OT dispatch: HTTP checkout already has one manager approval request before cron and remains idempotent', { timeout: 30000 }, async () => {
  const f = await fixture()
  await punch(f)
  const entry = await routed(f)
  await attendance.computeDay(f.emp.id, f.day, false)
  const recovery = await http(admin, 'POST', '/requests/engine/reconcile-overtime')
  assert.equal(recovery.status, 201); assert.equal(recovery.body.routed, 0)
  await routed(f, entry.id)
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id, typeCode: 'OVERTIME_AUTO' } }), 1)
})

test('Immediate OT dispatch: closed windows incomplete punches and below-threshold days produce no automatic request', async () => {
  for (const mode of ['closed', 'incomplete', 'threshold']) {
    const f = await fixture()
    if (mode === 'closed') await repo('OvertimePeriod').save({ name: 'قفل فرع الاختبار', fromDate: f.day, toDate: f.day,
      branchId: f.branch.id, effect: 'CLOSED', isActive: true })
    await punch(f, mode === 'incomplete' ? ['08:00'] : ['08:00', mode === 'threshold' ? '17:20' : '19:35'])
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }), 0, mode)
    assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0, mode)
  }
})

test('Immediate OT dispatch: a computed day inside an outer transaction routes only after its SQL commit releases the employee lock', { timeout: 30000 }, async () => {
  const f = await fixture()
  let entryId
  await withRunner(async runner => {
    await finance.lockPayrollEmployees(runner.manager, [f.emp.id])
    await rawPunches(f, runner.manager)
    await attendance.computeDay(f.emp.id, f.day, false, false, runner.manager)
    const entry = await runner.manager.getRepository('OvertimeEntry').findOneByOrFail({ employeeId: f.emp.id })
    entryId = entry.id; assert.equal(entry.status, 'DETECTED'); assert.equal(entry.requestId, null)
    assert.equal(await runner.manager.getRepository('Request').count({ where: { requesterId: f.emp.id } }), 0)
    await runner.commitTransaction()
    assert.equal(runner.isTransactionActive, false)
    await routed(f, entryId)
  })
})

test('Immediate OT dispatch: rolling back the outer computation leaves no request source claim or punch', async () => {
  const f = await fixture()
  await withRunner(async runner => {
    await finance.lockPayrollEmployees(runner.manager, [f.emp.id])
    await rawPunches(f, runner.manager)
    await attendance.computeDay(f.emp.id, f.day, false, false, runner.manager)
    assert.equal(await runner.manager.getRepository('OvertimeEntry').count({ where: { employeeId: f.emp.id } }), 1)
    await runner.rollbackTransaction()
  })
  for (const name of ['OvertimeEntry', 'OvertimeDayClaim', 'AttendancePunch']) {
    assert.equal(await repo(name).count({ where: { employeeId: f.emp.id } }), 0)
  }
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
})

test('Immediate OT dispatch: committing an inner savepoint waits for the outer commit and does not dispatch twice', async () => {
  const f = await fixture()
  await withRunner(async runner => {
    await finance.lockPayrollEmployees(runner.manager, [f.emp.id])
    await runner.startTransaction()
    await rawPunches(f, runner.manager)
    await attendance.computeDay(f.emp.id, f.day, false, false, runner.manager)
    await runner.commitTransaction()
    assert.equal(runner.isTransactionActive, true)
    assert.equal(await runner.manager.getRepository('Request').count({ where: { requesterId: f.emp.id } }), 0)
    await runner.commitTransaction()
  })
  await routed(f)
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id, typeCode: 'OVERTIME_AUTO' } }), 1)
})

test('Immediate OT dispatch: nested rollback discards only its refreshed existing source and preserves outer committed dispatch', async () => {
  const keep = await fixture(), rolledBack = await fixture()
  await rawPunches(rolledBack)
  const old = await repo('OvertimeEntry').save({ employeeId: rolledBack.emp.id, date: rolledBack.day, source: 'BIOMETRIC_DETECTED',
    status: 'DETECTED', hoursActual: 2.5, payableHours: null, rate: 1.5 })
  await withRunner(async runner => {
    await finance.lockPayrollEmployees(runner.manager, [keep.emp.id, rolledBack.emp.id])
    await rawPunches(keep, runner.manager)
    await attendance.computeDay(keep.emp.id, keep.day, false, false, runner.manager)
    await runner.startTransaction()
    await attendance.computeDay(rolledBack.emp.id, rolledBack.day, false, false, runner.manager)
    await runner.rollbackTransaction()
    await runner.commitTransaction()
  })
  await routed(keep)
  const unchanged = await repo('OvertimeEntry').findOneByOrFail({ id: old.id })
  assert.equal(unchanged.status, 'DETECTED'); assert.equal(unchanged.requestId, null)
  assert.equal(await repo('Request').count({ where: { requesterId: rolledBack.emp.id } }), 0)
  // يمنع هذا المصدر التاريخي من دخول استدراك اختبارات لاحقة غير مرتبطة.
  await repo('OvertimeEntry').update(old.id, { status: 'CANCELLED' })
})

test('Immediate OT dispatch: missing manager does not fail a committed punch and cron recovers the same source after configuration is repaired', async () => {
  const f = await fixture()
  await repo('Employee').update(f.emp.id, { managerEmployeeId: null })
  // حل المدير يقبل رئيس القسم بديلاً؛ نجعل الهيكل المعزول ناقصاً فعلاً دون تغيير المحلل.
  await repo('Department').update(f.emp.departmentId, { managerEmployeeId: null })
  await punch(f)
  const entry = await repo('OvertimeEntry').findOneByOrFail({ employeeId: f.emp.id })
  assert.equal(entry.status, 'DETECTED'); assert.equal(entry.requestId, null)
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: f.emp.id } }), 2)
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
  await repo('Employee').update(f.emp.id, { managerEmployeeId: f.managerEmployee.id })
  await repo('Department').update(f.emp.departmentId, { managerEmployeeId: f.headEmployee.id })
  const recovery = await http(admin, 'POST', '/requests/engine/reconcile-overtime')
  assert.equal(recovery.status, 201); assert.equal(recovery.body.routed, 1)
  await routed(f, entry.id)
})

test('Immediate OT dispatch: an approved punch correction creates its manager overtime request after correction and attendance commit', async () => {
  const f = await fixture()
  await punch(f, ['08:00'])
  const submitted = await http(f.owner, 'POST', '/requests', { typeCode: 'PUNCH_CORRECTION', submit: true,
    payload: { date: f.day, in: '08:00', out: '19:35', reason: 'تصحيح انصراف مفقود لاختبار الإرسال الفوري' } })
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body))
  const approved = await http(f.manager, 'POST', `/requests/${submitted.body.id}/act`, { action: 'APPROVE', comment: 'تأكيد الانصراف' })
  assert.equal(approved.status, 201, JSON.stringify(approved.body)); assert.equal(approved.body.status, 'COMPLETED')
  assert.equal(await repo('AttendanceCorrection').count({ where: { employeeId: f.emp.id } }), 1)
  const entry = await routed(f)
  assert.equal(entry.calculationSnapshot.submission.evidence.detectedMinutes, 150)
})

test('Immediate OT dispatch: a top-level routing failure cannot reject the committed attendance and cron recovers its DETECTED record', async () => {
  const f = await fixture(), original = requests.dispatchDetectedOvertime
  // إخفاق العملية المستقلة بعد COMMIT؛ الحساب وقاعدة SQL يظلان فعليين دون استبدال منطق الأدلة.
  requests.dispatchDetectedOvertime = async () => { throw new Error('تعذر توجيه مستقل متعمد لاختبار الاستدراك') }
  try { await punch(f) } finally { requests.dispatchDetectedOvertime = original }
  const entry = await repo('OvertimeEntry').findOneByOrFail({ employeeId: f.emp.id })
  assert.equal(entry.status, 'DETECTED'); assert.equal(entry.requestId, null)
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: f.emp.id } }), 2)
  const recovery = await http(admin, 'POST', '/requests/engine/reconcile-overtime')
  assert.equal(recovery.status, 201); assert.equal(recovery.body.routed, 1)
  await routed(f, entry.id)
})
