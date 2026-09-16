// S28 — الوردية الليلية 20:00 ← 01:00 تُنسب كلها ليوم بدايتها (قاعدة المالك): محرك الحضور ومسيره
// القديم ومزود الحضور في محرك السياسات. HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_night_shift_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-night-shift-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const { readCalendarSource, confirmCalendarSource } = require('../src/attendance/attendance-calendar-history')
const { readPayrollLiveSchedule } = require('../src/payroll/payroll-live-schedule-provider')
const { readPayrollLiveEmployment } = require('../src/payroll/payroll-live-employment-provider')
const { readPayrollLiveAttendance } = require('../src/payroll/payroll-live-attendance-provider')
let app, ds, master, base, created = false, sequence = 0, admin, branch, shift

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const number = value => Number(value)
async function request(method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(admin))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function measured(row, expected) {
  for (const [key, value] of Object.entries(expected)) assert.equal(row[key], value, `${row.date} ${key}`)
}
async function confirm(scope, sourceId, effectiveFrom = '2026-01-01') {
  await ds.transaction(async em => {
    const read = await readCalendarSource(em, scope, sourceId)
    await confirmCalendarSource(em, claims(admin), scope, sourceId, { expectedRevision: read.revision, expectedCurrentSourceHash: read.currentSourceHash,
      effectiveFrom, reason: 'تأكيد تقويم اختبار الوردية الليلية' })
  })
}
async function nightEmployee(joinDate) {
  const n = ++sequence
  const saved = expect(await request('POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), employeeCode: `NIGHT${n}`, fullName: `موظف وردية ليلية ${n}`, branchId: branch.id,
    joinDate, basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash', attendanceEffectiveFrom: '2026-07-01', attendanceChangeReason: 'إسناد دوام موظف اختبار الوردية الليلية' }), 201)
  // إنشاء الموظف بسريان حضور 2026-07-01 يسجل تغيير تقويمه بهذا التاريخ؛ التأكيد لا يسبقه
  await confirm('EMPLOYEE', saved.id, '2026-07-01')
  return repo('Employee').findOneByOrFail({ id: saved.id })
}
async function assignNight(emp, dates) {
  for (const date of dates) expect(await request('POST', '/attendance/schedule/day', { employeeId: emp.id, date, shiftId: shift.id }), 201)
}
async function punch(emp, stamps) {
  const punches = stamps.map(stamp => ({ employeeCode: emp.employeeCode, timestamp: new Date(stamp).toISOString() }))
  expect(await request('POST', '/attendance/punches/manual', { punches, reason: 'بصمات اختبار الوردية الليلية' }), 201)
  const rows = await repo('AttendancePunch').find({ where: { employeeId: emp.id }, order: { punchTime: 'ASC' } })
  return Object.fromEntries(rows.map(row => [new Date(row.punchTime).toISOString(), row.id]))
}
const idOf = (ids, stamp) => ids[new Date(stamp).toISOString()]
const dayOf = (emp, date) => repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date })
async function sources(emp, start, end) {
  return ds.transaction('SERIALIZABLE', async em => {
    const schedule = await readPayrollLiveSchedule(em, emp.id, start, end), employment = await readPayrollLiveEmployment(em, emp.id, start, end)
    return { schedule, attendance: await readPayrollLiveAttendance(em, emp.id, start, end, schedule, employment.employment) }
  })
}
// راتب شهر المسير من سجل الأجر الشهري (الخطوة 13): 9000 من راتب أغسطس ومستمر
async function documentMonthly(emp, effectivePayrollPeriod) {
  const history = expect(await request('GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  return expect(await request('POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: history.revision,
    expectedCurrentSourceHash: history.currentSourceHash, reason: 'راتب شهري موثق لاختبار الوردية الليلية', evidenceReference: `fixture:night:${emp.id}`,
    periods: [{ basicSalary: '9000.00', housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00',
      otherAllowance: '0.00', currency: emp.currency ?? 'SAR', effectivePayrollPeriod, effectiveToPayrollPeriod: null }] }), 201)
}
async function payrollRun(emp, period) {
  const run = expect(await request('POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [emp.id],
    name: `مسير اختبار الوردية الليلية ${period}` }), 201)
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, `موظف الاختبار داخل المسير: ${JSON.stringify({ ...run, items: (run.items ?? []).map(row => row.employeeId) }).slice(0, 3000)}`)
  return { run, item, details: JSON.parse(item.breakdown) }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_night_shift_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  admin = await repo('User').save({ email: 'admin@night-shift.invalid', displayName: 'Night shift fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  // الجمعة وحدها عطلة: 12 و13 أغسطس (أربعاء/خميس) و22 و23 (سبت/أحد) أيام عمل
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI' },
    { key: 'attendance.grace_minutes', value: '0' },
    { key: 'attendance.flex.count_early_work_toward_required', value: 'false' },
    { key: 'attendance.flex.prorate_window_on_partial_leave', value: 'false' },
    { key: 'attendance.flex.shortfall_grace_minutes', value: '0' },
    { key: 'attendance.flex.unpaid_break_minutes', value: '0' },
    { key: 'attendance.flex.max_session_minutes', value: '900' },
    { key: 'attendance.flex.window_supersedes_grace', value: 'true' },
    { key: 'attendance.flex.missing_checkout_policy', value: 'MANUAL_ONLY' },
    { key: 'payroll.shortfall_enabled', value: 'true' }, { key: 'payroll.shortfall_mode', value: 'MINUTES' },
    { key: 'payroll.shortfall_value', value: '1' }, { key: 'payroll.attendance_overlap_policy', value: 'NET_OF_LATENESS' },
    { key: 'payroll.attendance_daily_cap_days', value: '1' },
  ])
  branch = await repo('Branch').save({ code: 'NIGHT', name: 'فرع اختبار الوردية الليلية', country: 'EG', weekendDays: 'FRI' })
  await confirm('GLOBAL', 0); await confirm('BRANCH', branch.id)
  shift = expect(await request('POST', '/catalogs/shifts', { name: 'ليلية 20:00-01:00', startTime: '20:00', endTime: '01:00', shiftMode: 'fixed',
    graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 300,
    effectiveFrom: '2026-07-01', changeReason: 'وردية ليلية مؤرخة لاختبار نسب البصمات ليوم البداية' }), 201)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_night_shift_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-night-shift-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار الوردية الليلية')
})

test('ليلة 12 (20:00 ← 01:00): الساعات والتأخير والنقص ليوم 12، وبصمة 00:50 لا تدخل يوم 13', async () => {
  const emp = await nightEmployee('2026-01-01')
  await assignNight(emp, ['2026-08-12', '2026-08-13'])
  const ids = await punch(emp, ['2026-08-12T20:10:00', '2026-08-13T00:50:00', '2026-08-13T20:00:00', '2026-08-14T01:00:00'])
  const d12 = await dayOf(emp, '2026-08-12'), d13 = await dayOf(emp, '2026-08-13')
  // 5 ساعات مطلوبة؛ دخول 20:10 وخروج 00:50 = 280 دقيقة: تأخير 10 ونقص 20 (منها 10 انصراف مبكر)
  measured(d12, { checkIn: '20:10', checkOut: '00:50', shiftStart: '20:00', shiftEnd: '01:00', workMinutes: 280, rawLateMinutes: 10,
    lateMinutes: 10, shortfallMinutes: 20, countedWorkMinutes: 280, earlyLeaveMinutes: 10, status: 'late', punchAnomalies: null, attendanceReviewRequired: false })
  measured(d13, { checkIn: '20:00', checkOut: '01:00', workMinutes: 300, rawLateMinutes: 0, lateMinutes: 0, shortfallMinutes: 0,
    countedWorkMinutes: 300, earlyLeaveMinutes: 0, status: 'present', punchAnomalies: null, attendanceReviewRequired: false })
  assert.equal(await repo('AttendanceDay').count({ where: { employeeId: emp.id, date: '2026-08-14' } }), 0, 'انصراف 01:00 يوم 14 لا ينشئ يومًا له')
  const raw = await repo('AttendancePunch').findOneByOrFail({ id: idOf(ids, '2026-08-13T00:50:00') })
  assert.equal(new Date(raw.punchTime).getDate(), 13, 'البصمة الخام تبقى بتاريخها التقويمي الفعلي')
  const monthly = expect(await request('GET', `/attendance/monthly?employeeId=${emp.id}&month=2026-08`), 200)
  const shown = monthly.days.find(row => row.date === '2026-08-12')
  assert.equal(shown.checkOut, '00:50'); assert.equal(shown.shortfallMinutes, 20); assert.equal(shown.lateMinutes, 10)

  // محرك السياسات: نفس النسب من البصمات الخام والنسخ المؤرخة، دون كتابة
  const { schedule, attendance } = await sources(emp, '2026-08-12', '2026-08-13')
  assert.equal(schedule.state, 'AVAILABLE', JSON.stringify(schedule.issues))
  assert.equal(attendance.state, 'AVAILABLE', JSON.stringify(attendance.issues))
  assert.deepEqual(attendance.data.tierDays.map(row => [row.date, row.rawLateSeconds]), [['2026-08-12', '600'], ['2026-08-13', '0']])
  assert.deepEqual(attendance.data.totals, { absentDays: 0, workedDays: 2, shortfallMinutes: 20, paidPermissionDeductibleMinutes: 0 })
  const [p12, p13] = attendance.data.days
  assert.deepEqual(p12.proof.punchIds, [idOf(ids, '2026-08-12T20:10:00'), idOf(ids, '2026-08-13T00:50:00')])
  assert.deepEqual(p13.proof.punchIds, [idOf(ids, '2026-08-13T20:00:00'), idOf(ids, '2026-08-14T01:00:00')])
  assert.equal(p12.proof.shortfallMinutes, 20); assert.equal(p12.proof.workdayWindow.overnight, true)
  assert.ok(new Date(p12.proof.workdayWindow.to) > new Date('2026-08-13T00:50:00'), 'نافذة يوم 12 تمتد لصباح 13')
  assert.ok(!p13.sourceRefs.includes(`attendance_punches:${idOf(ids, '2026-08-13T00:50:00')}`), 'يوم 13 لا يأخذ شيئًا من ليلة 12')
})

test('غياب ليلة 12 يُسجل ليوم 12 وحده، وليلة 13 المكتملة لا ترث منه شيئًا', async () => {
  const emp = await nightEmployee('2026-01-01')
  await assignNight(emp, ['2026-08-12', '2026-08-13'])
  await punch(emp, ['2026-08-13T20:00:00', '2026-08-14T01:00:00'])
  expect(await request('POST', '/attendance/recompute?date=2026-08-12'), 201)
  measured(await dayOf(emp, '2026-08-12'), { status: 'absent', checkIn: null, checkOut: null, lateMinutes: 0 })
  measured(await dayOf(emp, '2026-08-13'), { status: 'present', checkIn: '20:00', checkOut: '01:00', shortfallMinutes: 0 })
  const { attendance } = await sources(emp, '2026-08-12', '2026-08-13')
  assert.equal(attendance.state, 'AVAILABLE', JSON.stringify(attendance.issues))
  assert.deepEqual(attendance.data.totals, { absentDays: 1, workedDays: 1, shortfallMinutes: 0, paidPermissionDeductibleMinutes: 0 })
  assert.equal(attendance.data.days[0].proof.basis, 'EXPLICIT_STORED_ABSENCE_VERIFIED')
})

test('ليلة آخر يوم في فترة الرواتب (22 أغسطس) تبقى في مسير أغسطس، ومسير سبتمبر (23/8–22/9) يبدأ بليلة 23 نظيفة', async t => {
  const emp = await nightEmployee('2026-08-22')
  await documentMonthly(emp, '2026-08')
  await assignNight(emp, ['2026-08-22', '2026-08-23'])
  const ids = await punch(emp, ['2026-08-22T20:10:00', '2026-08-23T00:50:00', '2026-08-23T20:00:00', '2026-08-24T01:00:00'])
  measured(await dayOf(emp, '2026-08-22'), { checkIn: '20:10', checkOut: '00:50', lateMinutes: 10, shortfallMinutes: 20, status: 'late' })
  measured(await dayOf(emp, '2026-08-23'), { checkIn: '20:00', checkOut: '01:00', lateMinutes: 0, shortfallMinutes: 0, status: 'present' })
  // خدمة يومين (تعيين 22 وآخر يوم عمل 23) تعزل كل فترة بيوم واحد دون اختلاق شهر حضور
  await repo('Employee').update(emp.id, { status: 'terminated', isActive: false })
  await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2026-08-23', status: 'CLOSED', terminationReason: 'termination' })

  const august = await sources(emp, '2026-07-23', '2026-08-22')
  assert.equal(august.attendance.state, 'AVAILABLE', JSON.stringify(august.attendance.issues))
  assert.deepEqual(august.attendance.data.tierDays.map(row => [row.date, row.rawLateSeconds]), [['2026-08-22', '600']])
  assert.deepEqual(august.attendance.data.totals, { absentDays: 0, workedDays: 1, shortfallMinutes: 20, paidPermissionDeductibleMinutes: 0 })
  const lastDay = august.attendance.data.days.find(row => row.date === '2026-08-22')
  assert.deepEqual(lastDay.proof.punchIds, [idOf(ids, '2026-08-22T20:10:00'), idOf(ids, '2026-08-23T00:50:00')], 'انصراف 23 أغسطس يبقى في فترة تنتهي 22')
  const september = await sources(emp, '2026-08-23', '2026-09-22')
  assert.equal(september.attendance.state, 'AVAILABLE', JSON.stringify(september.attendance.issues))
  assert.deepEqual(september.attendance.data.tierDays.map(row => [row.date, row.rawLateSeconds]), [['2026-08-23', '0']])
  assert.deepEqual(september.attendance.data.totals, { absentDays: 0, workedDays: 1, shortfallMinutes: 0, paidPermissionDeductibleMinutes: 0 })
  const firstDay = september.attendance.data.days.find(row => row.date === '2026-08-23')
  assert.deepEqual(firstDay.proof.punchIds, [idOf(ids, '2026-08-23T20:00:00'), idOf(ids, '2026-08-24T01:00:00')], 'أول يوم في الفترة التالية لا يأخذ انصراف ليلة 22')

  // المسير القديم الفعلي: كل مسير يقرأ صف يومه فقط
  const aug = await payrollRun(emp, '2026-08'), sep = await payrollRun(emp, '2026-09')
  assert.equal(aug.run.startDate, '2026-07-23'); assert.equal(aug.run.endDate, '2026-08-22')
  assert.equal(sep.run.startDate, '2026-08-23'); assert.equal(sep.run.endDate, '2026-09-22')
  assert.equal(aug.details.coverDays, 1); assert.equal(sep.details.coverDays, 1)
  assert.deepEqual(aug.details.attendanceDeductions.days.map(row => row.date), ['2026-08-22'])
  assert.deepEqual(sep.details.attendanceDeductions.days.map(row => row.date), ['2026-08-23'])
  const augDay = aug.details.attendanceDeductions.days[0], sepDay = sep.details.attendanceDeductions.days[0]
  // أ4: دقائق التأخير لا تُطرح من النقص — النقص الخاضع للخصم 20 كاملة، و20 × .625 = 12.50
  assert.equal(augDay.unexcusedLateMinutes, 10); assert.equal(augDay.rawShortfallMinutes, 20); assert.equal(augDay.chargeableShortfallMinutes, 20)
  assert.equal(number(aug.item.latenessDeduction), 6.25); assert.equal(number(aug.item.shortfallDeduction), 12.5)
  assert.equal(number(aug.item.shortfallMinutes), 20); assert.equal(number(aug.item.absenceDays), 0)
  assert.equal(sepDay.unexcusedLateMinutes, 0); assert.equal(sepDay.rawShortfallMinutes, 0); assert.equal(sepDay.totalAmount, 0)
  assert.equal(number(sep.item.latenessDeduction), 0); assert.equal(number(sep.item.shortfallDeduction), 0)
  assert.equal(number(sep.item.shortfallMinutes), 0); assert.equal(number(sep.item.absenceDays), 0)
  t.diagnostic('يدويًا: 9000/30 = 300 لليوم، 300/8/60 = 0.625 للدقيقة؛ تأخير 10 = 6.25، ونقص 20 كاملًا بلا طرح التأخير (أ4) = 20 × 0.625 = 12.50 — كلها في مسير أغسطس.')

  // محرك السياسة بوضع SHADOW داخل المسيرين الفعليين نفسيهما (المصروف = القديم): الليلة تُحسب ليوم البداية 22 أغسطس
  const augShadow = aug.details.policyShadow, sepShadow = sep.details.policyShadow
  assert.equal(augShadow.engineMode, 'SHADOW'); assert.equal(augShadow.paidResult, 'LEGACY')
  assert.equal(augShadow.status, 'MATCHED', JSON.stringify({ status: augShadow.status, differences: augShadow.differences, unproven: augShadow.unprovenDays, error: augShadow.error, sources: augShadow.sources }))
  assert.deepEqual(augShadow.period, { start: '2026-07-23', end: '2026-08-22' }); assert.equal(augShadow.sources.attendance.state, 'AVAILABLE')
  assert.equal(augShadow.provenWorkDays, 1)
  assert.equal(augShadow.days.length, 1); const shadowNight = augShadow.days[0]
  assert.equal(shadowNight.date, '2026-08-22'); assert.equal(shadowNight.overnight, true)
  assert.deepEqual(shadowNight.punchIds, [idOf(ids, '2026-08-22T20:10:00'), idOf(ids, '2026-08-23T00:50:00')], 'انصراف 23 أغسطس داخل يوم 22 في محرك السياسة')
  assert.equal(shadowNight.inputs.rawLateSeconds, '600'); assert.equal(shadowNight.inputs.shortfallMinutes, 20)
  // أ4: الظل كالقديم — نقص 20 كاملًا = 12.50، والمجموع 6.25 + 12.50 = 18.75
  assert.deepEqual(shadowNight.policy, { lateness: '6.250000', shortfall: '12.500000', absence: '0.000000', total: '18.750000' })
  assert.deepEqual(shadowNight.legacy, shadowNight.policy); assert.equal(shadowNight.matches, true)
  assert.deepEqual(augShadow.totals.policy, { lateness: '6.25', shortfall: '12.50', absence: '0.00', total: '18.75' })
  assert.deepEqual(augShadow.totals.legacy, augShadow.totals.policy)
  // سبتمبر: ليلة 23 نظيفة لا ترث انصراف ليلة 22، ومحرك السياسة يطابق صفر المسير القديم
  assert.equal(sepShadow.status, 'MATCHED', JSON.stringify({ status: sepShadow.status, differences: sepShadow.differences, unproven: sepShadow.unprovenDays, error: sepShadow.error }))
  assert.equal(sepShadow.provenWorkDays, 1); assert.equal(sepShadow.days.length, 1)
  assert.equal(sepShadow.days[0].date, '2026-08-23')
  assert.deepEqual(sepShadow.days[0].punchIds, [idOf(ids, '2026-08-23T20:00:00'), idOf(ids, '2026-08-24T01:00:00')])
  assert.deepEqual(sepShadow.days[0].policy, { lateness: '0.000000', shortfall: '0.000000', absence: '0.000000', total: '0.000000' })
  assert.deepEqual(sepShadow.totals.policy, { lateness: '0.00', shortfall: '0.00', absence: '0.00', total: '0.00' })
  // SHADOW لا يغير المصروف: البند القديم كما هو
  // أ4: 6.25 + 12.50 = 18.75
  assert.equal(number(aug.item.latenessDeduction) + number(aug.item.shortfallDeduction), 18.75)
})
