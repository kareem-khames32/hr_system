// SQL وHTTP فعليان في قاعدة اختبار عشوائية تُحذف بعد انتهاء الاختبارات.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_attendance_proof_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-attendance-proof-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { readCalendarSource, confirmCalendarSource } = require('../src/attendance/attendance-calendar-history')
const { readPayrollLiveSchedule } = require('../src/payroll/payroll-live-schedule-provider')
const { readPayrollLiveEmployment } = require('../src/payroll/payroll-live-employment-provider')
const { readPayrollLiveAttendance } = require('../src/payroll/payroll-live-attendance-provider')
const { AttendanceService } = require('../src/attendance/attendance.service')
const workDate = '2026-06-01'
const flexPolicy = { countEarlyWorkTowardRequired: false, prorateWindowOnPartialLeave: false, windowSupersedesGrace: true,
  unpaidBreakMinutes: 0, shortfallGraceMinutes: 10, maxSessionMinutes: 900, missingCheckoutPolicy: 'MANUAL_ONLY' }
let app, ds, master, base, created = false, sequence = 0, branchA, branchB, admin, reader, outsider, viewer, policy
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(claims(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
async function confirm(scope, sourceId, effectiveFrom = '2026-01-01') {
  await ds.transaction(async em => {
    const read = await readCalendarSource(em, scope, sourceId)
    await confirmCalendarSource(em, claims(admin), scope, sourceId, { expectedRevision: read.revision, expectedCurrentSourceHash: read.currentSourceHash,
      effectiveFrom, reason: 'تأكيد تقويم بيانات الاختبار' })
  })
}
async function employee({ absent = false, missing = false, flex = false, incoming = '09:01:30', outgoing = '18:00:00', calendar = true, branch = branchA } = {}) {
  const ws = await repo('WorkSchedule').save({ name: `اختبار دوام ${++sequence}`, startTime: '09:00', endTime: '18:00', weekendDays: 'FRI,SAT',
    requiredWorkMinutes: 540, flexEnabled: flex, flexWindowMinutes: 60, isDefault: false, isActive: true })
  const emp = await repo('Employee').save({ employeeCode: `ATP${sequence}`, fullName: 'موظف إثبات حضور', branchId: branch.id, workScheduleId: ws.id,
    status: 'active', joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'EGP', flexOverrideMode: 'INHERIT' })
  const rule = (sourceType, sourceId, snapshot) => repo('AttendanceRuleVersion').save({ sourceType, sourceId, version: 1, effectiveFrom: '2026-01-01',
    legacyBaseline: false, snapshot, actorUserId: admin.id, reason: 'إعداد دوام مؤرخ للاختبار' })
  await rule('WORK_SCHEDULE', ws.id, { ...ws, flexPolicy, generalGraceMinutes: 5 })
  await rule('EMPLOYEE', emp.id, { workScheduleId: ws.id, flexOverrideMode: 'INHERIT' })
  if (calendar) await confirm('EMPLOYEE', emp.id)
  if (!absent && !missing) for (const time of [incoming, outgoing]) {
    const punchTime = new Date(`${workDate}T${time}`)
    await repo('AttendancePunch').save({ employeeId: emp.id, employeeCode: emp.employeeCode, source: 'DEVICE', deviceSn: 'TEST_DEVICE',
      punchTime, receivedAt: new Date(punchTime.getTime() + 1000) })
  }
  if (!missing) await app.get(AttendanceService).computeDay(emp.id, workDate, false)
  return emp
}
async function readSources(emp, start = workDate, end = workDate) {
  return ds.transaction('SERIALIZABLE', async em => {
    const schedule = await readPayrollLiveSchedule(em, emp.id, start, end), employment = await readPayrollLiveEmployment(em, emp.id, start, end)
    const attendance = await readPayrollLiveAttendance(em, emp.id, start, end, schedule, employment.employment)
    return { schedule, attendance }
  })
}
const httpRead = (emp, user = reader, extra = {}) => request(user, 'POST', `/payroll/policies/${policy.policy.id}/versions/${policy.versions[0].id}/sources/read`,
  { expectedRevision: policy.versions[0].revision, employeeId: emp.id, periodStart: workDate, periodEnd: workDate, ...extra })
async function snapshot() {
  const result = {}
  for (const table of ['employees', 'attendance_days', 'attendance_punches', 'attendance_rule_versions', 'attendance_corrections', 'requests', 'leaves', 'attendance_exemptions',
    'payroll_runs', 'payroll_items', 'payroll_memberships', 'employee_salary_history_versions', 'employee_status_history']) {
    const exists = (await ds.query('SELECT OBJECT_ID(@0) AS id', [`dbo.${table}`]))[0]?.id
    if (!exists) continue
    result[table] = (await ds.query(`SELECT (SELECT * FROM [${table}] ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data`))[0].data
  }
  return result
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_attendance_proof_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ name: 'Attendance fixture A', code: 'ATPA', country: 'EG', weekendDays: 'FRI,SAT' })
  branchB = await repo('Branch').save({ name: 'Attendance fixture B', code: 'ATPB', country: 'EG', weekendDays: 'FRI,SAT' })
  const user = (name, role, branchId, permissions) => repo('User').save({ email: `${name}@attendance-proof.invalid`, displayName: name, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, ['*']); reader = await user('reader', 'hr', branchA.id, ['payroll.calculate'])
  outsider = await user('other', 'hr', branchB.id, ['payroll.calculate']); viewer = await user('viewer', 'hr', branchA.id, ['payroll.view'])
  await repo('RequestsConfig').save({ key: 'attendance.weekend_days', value: 'FRI,SAT' })
  await confirm('GLOBAL', 0); await confirm('BRANCH', branchA.id); await confirm('BRANCH', branchB.id)
  policy = expect(await request(admin, 'POST', '/payroll/policies', { code: 'ATTENDANCEPROOF', name: 'سياسة إثبات حضور اختبارية', branchId: null,
    effectiveFrom: '2026-01-01', settings: { currency: 'EGP' } }), 201)
})
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_attendance_proof_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-attendance-proof-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار إثبات الحضور')
})

test('SQL: اليوم الفعلي المحسوب والبصمتان ينتجان ثواني دقيقة وتقويمًا مؤرخًا دون كتابة', async () => {
  const emp = await employee(), before = await snapshot(), read = await readSources(emp)
  assert.equal(read.schedule.state, 'AVAILABLE', JSON.stringify(read.schedule.issues))
  assert.equal(read.attendance.state, 'AVAILABLE', JSON.stringify(read.attendance.issues))
  assert.equal(read.attendance.data.tierDays[0].rawLateSeconds, '90'); assert.equal(read.attendance.data.tierDays[0].shiftGraceMinutes, null)
  assert.equal(read.attendance.data.totals.workedDays, 1); assert.deepEqual(await snapshot(), before)
})
test('SQL: 10:00:59 بعد المرونة يحفظ3659 ثانية من بداية الدوام', async () => {
  const emp = await employee({ flex: true, incoming: '10:00:59', outgoing: '19:00:59' }), result = await readSources(emp)
  assert.equal(result.attendance.state, 'AVAILABLE', JSON.stringify(result.attendance.issues)); assert.equal(result.attendance.data.tierDays[0].rawLateSeconds, '3659')
})
test('SQL: غياب محفوظ صريح يثبت بينما عدم وجود صف لا ينشئ غيابًا', async () => {
  const absent = await employee({ absent: true }), a = await readSources(absent)
  assert.equal(a.attendance.state, 'AVAILABLE', JSON.stringify(a.attendance.issues)); assert.equal(a.attendance.data.totals.absentDays, 1)
  const missing = await employee({ missing: true }), before = await snapshot(), b = await readSources(missing)
  assert.equal(b.attendance.state, 'MISSING'); assert.equal(b.attendance.data.totals, null); assert.deepEqual(await snapshot(), before)
})
test('SQL: فجوة التنظيم المؤرخ تمنع تحويل الحضور الصحيح إلى مصدر مالي', async () => {
  const emp = await employee({ calendar: false }), result = await readSources(emp)
  assert.equal(result.schedule.state, 'MISSING'); assert.notEqual(result.attendance.state, 'AVAILABLE'); assert.equal(result.attendance.data.tierDays, null)
})
test('SQL: تعديل الأعمدة أو استقبال دليل أحدث يمنع الاعتماد على الحساب القديم', async () => {
  const emp = await employee()
  await repo('AttendanceDay').update({ employeeId: emp.id, date: workDate }, { rawLateMinutes: 99 })
  const changed = await readSources(emp); assert.notEqual(changed.attendance.state, 'AVAILABLE'); assert.ok(changed.attendance.issues.some(i => i.code === 'ATTENDANCE_STORED_COLUMNS_MISMATCH'))
  const newer = await employee()
  await repo('AttendanceDay').update({ employeeId: newer.id, date: workDate }, { computedAt: new Date(Date.now() - 3600000) })
  const first = await repo('AttendancePunch').findOne({ where: { employeeId: newer.id }, order: { id: 'ASC' } })
  await repo('AttendancePunch').update(first.id, { receivedAt: new Date(Date.now() - 1000) })
  const stale = await readSources(newer); assert.notEqual(stale.attendance.state, 'AVAILABLE'); assert.ok(stale.attendance.issues.some(i => i.code === 'ATTENDANCE_NEWER_PUNCH_EVIDENCE'))
})
test('SQL: الإجازة غير المدفوعة والتصحيح غير المثبت يظهران دون صفوف أو خصومات مصطنعة', async () => {
  const emp = await employee()
  await repo('Leave').save({ employeeId: emp.id, requestId: null, leaveTypeCode: 'UNPAID', fromDate: workDate, toDate: workDate, days: '0.50', period: 'MORNING', isUnpaid: true, status: 'APPROVED' })
  await repo('AttendanceCorrection').save({ employeeId: emp.id, requestId: null, date: workDate, correctedPunch: '{"in":"09:00"}', reason: 'تصحيح قديم للاختبار' })
  const before = await snapshot(), result = await readSources(emp)
  assert.notEqual(result.attendance.state, 'AVAILABLE'); assert.equal(result.attendance.data.totals, null)
  assert.ok(result.attendance.issues.some(i => i.code === 'ATTENDANCE_PARTIAL_LEAVE_PROOF_UNSUPPORTED'))
  assert.ok(result.attendance.issues.some(i => i.code === 'ATTENDANCE_CORRECTION_APPROVAL_UNPROVEN')); assert.deepEqual(await snapshot(), before)
})
test('HTTP: المصدر موثق جزئيًا ويظل تنفيذ المسير مغلقًا ولا يتغير عند القراءة', async () => {
  const emp = await employee(), before = await snapshot(), result = expect(await httpRead(emp), 200)
  assert.equal(result.snapshot.sections.attendance.state, 'AVAILABLE', JSON.stringify(result.snapshot.sections.attendance.issues))
  assert.equal(result.snapshot.sections.schedule.state, 'AVAILABLE'); assert.equal(result.executionReady, false); assert.equal(result.persisted, false)
  assert.equal(result.snapshot.sections.attendance.data.tierDays[0].rawLateSeconds, '90'); assert.deepEqual(await snapshot(), before)
})
test('HTTP: صلاحية حساب الرواتب ونطاق الموظف مستقلان عن السياسة العامة', async () => {
  const emp = await employee(), other = await employee({ branch: branchB })
  expect(await httpRead(emp, null), 401); expect(await httpRead(emp, viewer), 403); expect(await httpRead(emp, outsider), 403)
  expect(await httpRead(other, reader), 403); expect(await httpRead(other, admin), 200)
  expect(await httpRead(emp, reader, { rawLateSeconds: '0' }), 400)
})
