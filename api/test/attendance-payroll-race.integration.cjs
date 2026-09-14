// A real payroll approval competes with attendance recomputation on a disposable DB.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_attendance_race_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-attendance-race-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const date = '2026-07-08'
let app, master, ds, base, creator, approver, created = false
const repo = name => ds.getRepository(name)
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: 'super_admin', employeeId: null,
    branchId: null, tokenVersion: 0, permissions: ['*'] })
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
before(async () => {
  assert.match(database, /^hr_attendance_race_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
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
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const admin = email => repo('User').save({ email, displayName: 'Race test actor', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  creator = await admin('creator@attendance-race.invalid'); approver = await admin('approver@attendance-race.invalid')
  await repo('RequestsConfig').save(Object.entries({ 'payroll.cycle_start_day': '1', 'payroll.monthly_days': '30',
    'payroll.daily_hours': '8', 'attendance.weekend_days': '', 'attendance.grace_minutes': '0',
    'payroll.late_deduction_enabled': 'true', 'payroll.shortfall_enabled': 'true', 'payroll.shortfall_mode': 'MINUTES',
    'payroll.shortfall_value': '1', 'payroll.attendance_overlap_policy': 'NET_OF_LATENESS',
    'payroll.attendance_daily_cap_days': '1' }).map(([key, value]) => ({ key, value })))
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_attendance_race_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-attendance-race-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'Race test cleanup failed')
})

test('approval holding employee-finance wins before a waiting recompute; attendance snapshot and approved OT stay immutable', { timeout: 60000 }, async () => {
  const branch = await repo('Branch').save({ name: 'Attendance race fixture', code: 'ATRACE', weekendDays: '' })
  const emp = await repo('Employee').save({ employeeCode: 'ATRACE', fullName: 'Attendance race fixture', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 9000, status: 'active', isActive: true, payMethod: 'cash' })
  const source = await request(creator, 'POST', '/catalogs/shifts', { name: 'Race flex', startTime: '09:00', endTime: '18:00',
    flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540, graceMinutes: 0,
    effectiveFrom: '2026-07-01', changeReason: 'تعريف معزول لاختبار السباق' })
  assert.equal(source.status, 201, JSON.stringify(source.body))
  const assigned = await request(creator, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date, shiftId: source.body.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
  const punched = await request(creator, 'POST', '/attendance/punches/manual', { reason: 'اختبار سباق معزول',
    punches: ['09:30', '18:30'].map(time => ({ employeeCode: emp.employeeCode, timestamp: new Date(`${date}T${time}:00`).toISOString() })) })
  assert.equal(punched.status, 201, JSON.stringify(punched.body))
  await repo('Employee').update(emp.id, { joinDate: date, status: 'terminated', isActive: false })
  await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: date, status: 'CLOSED', terminationReason: 'termination' })
  const calculated = await request(creator, 'POST', '/payroll/runs/calculate-defined', {
    period: '2026-07', scopeType: 'CUSTOM', employeeIds: [emp.id], name: 'اختبار الاعتماد المتزامن مع الحضور' })
  assert.equal(calculated.status, 201, JSON.stringify(calculated.body))
  const beforeDay = await repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date })
  const savedOT = await repo('OvertimeEntry').save({ employeeId: emp.id, date, source: 'PRE_REQUESTED',
    status: 'APPROVED', hoursRequested: 2, hoursActual: 2, payableHours: 2, rate: 1.5 })
  const approvedOT = await repo('OvertimeEntry').findOneByOrFail({ id: savedOT.id })
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const payroll = app.get(require('../src/payroll/payroll.service').PayrollService)
  const finance = require('../src/payroll/payroll-settlement-boundary')
  const originalAssert = payroll.assertAttendanceRuleSnapshot
  const originalLock = finance.lockPayrollEmployees
  const approvalChecked = deferred(), releaseApproval = deferred(), computeEntered = deferred()
  let approvalPromise, computePromise, computed = false
  payroll.assertAttendanceRuleSnapshot = async function (...args) {
    await originalAssert.apply(this, args)
    approvalChecked.resolve()
    await releaseApproval.promise
  }
  try {
    approvalPromise = request(approver, 'POST', `/payroll/runs/${calculated.body.id}/approve`)
    await approvalChecked.promise
    // A newly received correction can remain raw after closing; it must not
    // replace the quantities that were validated and approved under the lock.
    const checkout = await repo('AttendancePunch').findOneOrFail({ where: { employeeId: emp.id }, order: { punchTime: 'DESC' } })
    await repo('AttendancePunch').update(checkout.id, { punchTime: new Date(`${date}T17:00:00`) })
    finance.lockPayrollEmployees = async function (...args) { computeEntered.resolve(); return originalLock(...args) }
    computePromise = attendance.computeDay(emp.id, date, false).then(day => { computed = true; return day })
    await computeEntered.promise
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(computed, false, 'Recompute must wait for the active approval employee lock')
    releaseApproval.resolve()
    const approved = await approvalPromise
    assert.equal(approved.status, 201, JSON.stringify(approved.body))
    assert.equal(approved.body.status, 'APPROVED')
    const computedDay = await computePromise
    const afterDay = await repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date })
    assert.deepEqual(afterDay, beforeDay)
    assert.deepEqual(computedDay.attendanceRuleSnapshot, beforeDay.attendanceRuleSnapshot)
    assert.equal(afterDay.checkOut, '18:30')
    assert.equal((await repo('AttendancePunch').findOneByOrFail({ id: checkout.id })).punchTime.getHours(), 17)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: approvedOT.id }), approvedOT)
  } finally {
    releaseApproval.resolve()
    await Promise.allSettled([approvalPromise, computePromise].filter(Boolean))
    payroll.assertAttendanceRuleSnapshot = originalAssert
    finance.lockPayrollEmployees = originalLock
  }
})
