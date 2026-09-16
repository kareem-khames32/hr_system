// إسناد وردية لمدة (شهر/أي مدى) + فترات فتح وقفل الإضافي — على SQL حقيقي في قاعدة عشوائية تتمسح في الآخر.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_schedule_range_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-schedule-range-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dateAfter = (date, offset) => { const v = new Date(`${date}T12:00:00`); v.setDate(v.getDate() + offset); return iso(v) }
const dow = date => new Date(`${date}T12:00:00`).getDay()
const daysBetween = (from, to) => { const out = []; for (let d = from; d <= to; d = dateAfter(d, 1)) out.push(d); return out }
const today = iso(new Date())
// شهر بعيد في المستقبل: مفيش حضور محسوب فيه
const futureYear = new Date().getFullYear() + 2
const monthFrom = `${futureYear}-09-01`, monthTo = `${futureYear}-09-30`
const fullWeeks = (from, to) => daysBetween(from, to).filter(d => dow(d) === 0 && dateAfter(d, 6) <= to)
// أربعاء فات (مش النهارده ولا امبارح) لأيام الحضور
let pastDay = dateAfter(today, -2)
while (dow(pastDay) !== 3) pastDay = dateAfter(pastDay, -1)
const otDay = dateAfter(pastDay, -7)

let app, master, ds, base, attendance, created = false
let admin, hr, branchA, branchB, deptA1, deptA2, a1, a2, b1, morning, evening
const repo = name => ds.getRepository(name)
async function http(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, employeeId: user.employeeId ?? null,
    branchId: user.branchId ?? null, tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const range = (user, body) => http(user, 'POST', '/attendance/schedule/range', body)
const activeOvertime = async (employeeId, date) => (await repo('OvertimeEntry').find({ where: { employeeId, date } }))
  .filter(e => !['REJECTED', 'CANCELLED'].includes(e.status))

before(async () => {
  assert.match(database, /^hr_schedule_range_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master',
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
  await repo('RequestsConfig').save(Object.entries({ 'overtime.enabled': 'true', 'overtime.detection_threshold_hours': '0.5',
    'overtime.multiplier_weekday': '1.5', 'overtime.multiplier_weekend': '1.5', 'overtime.multiplier_holiday': '2',
    'overtime.rounding_minutes': '15', 'overtime.rounding_direction': 'DOWN', 'overtime.max_hours_per_day': '0',
    'overtime.max_hours_per_week': '0', 'overtime.max_hours_per_month': '0', 'overtime.request_backdate_days': '30',
    'overtime.max_closed_periods': '1', 'overtime.allow_early_overtime': 'false', 'overtime.missing_punch_policy': 'BLOCK',
    'overtime.leave_conflict_policy': 'BLOCK', 'payroll.monthly_days': '30', 'payroll.daily_hours': '8',
    'payroll.exempt_overtime_eligible': 'false', 'attendance.weekend_days': 'FRI,SAT', 'attendance.grace_minutes': '0',
    'attendance.flex.shortfall_grace_minutes': '10',
  }).map(([key, value]) => ({ key, value })))
  branchA = await repo('Branch').save({ code: 'RNGA', name: 'فرع المدى أ', weekendDays: 'FRI,SAT' })
  branchB = await repo('Branch').save({ code: 'RNGB', name: 'فرع المدى ب', weekendDays: 'FRI,SAT' })
  deptA1 = await repo('Department').save({ branchId: branchA.id, code: 'RNGA1', name: 'قسم أ1' })
  deptA2 = await repo('Department').save({ branchId: branchA.id, code: 'RNGA2', name: 'قسم أ2' })
  const person = (code, branch, department) => repo('Employee').save({ employeeCode: code, fingerprintCode: code, fullName: `موظف ${code}`,
    branchId: branch.id, departmentId: department?.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    annualLeaveEntitled: false, payMethod: 'cash' })
  a1 = await person('RNG1', branchA, deptA1)
  a2 = await person('RNG2', branchA, deptA2)
  b1 = await person('RNG3', branchB)
  const hrEmployee = await person('RNGHR', branchA, deptA1)
  admin = await repo('User').save({ email: 'admin@schedule-range.invalid', displayName: 'مدير اختبار المدى',
    passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  hr = await repo('User').save({ email: 'hr@schedule-range.invalid', displayName: 'موارد بشرية فرع أ', employeeId: hrEmployee.id,
    branchId: branchA.id, passwordHash: 'isolated-test-token-only', role: 'employee',
    permissions: JSON.stringify(['attendance.manage', 'attendance.view_all']) })
  const shift = async (name, startTime, endTime, requiredWorkMinutes) => {
    const res = await http(admin, 'POST', '/catalogs/shifts', { name, startTime, endTime, shiftMode: 'fixed', graceMinutes: 0,
      flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes, effectiveFrom: dateAfter(today, -120),
      changeReason: 'وردية مؤرخة لاختبار الإسناد لمدة' })
    assert.equal(res.status, 201, JSON.stringify(res.body))
    return res.body
  }
  morning = await shift('صباحي المدى', '08:00', '17:00', 540)
  evening = await shift('مسائي المدى', '14:00', '22:00', 480)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_schedule_range_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@database')
      assert.equal(found.recordset.length, 0); t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Schedule range cleanup failed')
})

test('إسناد شهر كامل لموظفي الفرع: الأسابيع الكاملة وردية أسبوع، والأطراف أيام خاصة، وموظف الفرع التاني يتخطى', { timeout: 60000 }, async () => {
  const res = await range(hr, { employeeIds: [a1.id, a2.id, b1.id], from: monthFrom, to: monthTo, shiftId: morning.id })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  const weeks = fullWeeks(monthFrom, monthTo)
  assert.equal(res.body.applied, 2)
  assert.equal(res.body.weeks, weeks.length)
  assert.equal(res.body.days, 30 - weeks.length * 7)
  assert.deepEqual(res.body.skipped, [{ employeeId: b1.id, reason: 'الموظف خارج نطاق فرعك' }])
  assert.deepEqual(res.body.failed, [])
  for (const emp of [a1, a2]) {
    const entries = await repo('ScheduleEntry').find({ where: { employeeId: emp.id } })
    assert.deepEqual(entries.map(e => String(e.weekStart).slice(0, 10)).sort(), weeks)
    assert.ok(entries.every(e => e.shiftId === morning.id && e.startTime === '08:00'))
    const overrides = await repo('ScheduleDayOverride').find({ where: { employeeId: emp.id } })
    assert.equal(overrides.length, 30 - weeks.length * 7)
    for (const date of daysBetween(monthFrom, monthTo)) {
      const shift = await attendance.shiftFor(emp.id, date)
      assert.equal(shift.shiftId, morning.id, `${emp.employeeCode} ${date}`)
      assert.equal(shift.start, '08:00')
    }
  }
  assert.equal(await repo('ScheduleEntry').count({ where: { employeeId: b1.id } }), 0)
  assert.equal(await repo('ScheduleDayOverride').count({ where: { employeeId: b1.id } }), 0)
})

test('إعادة الإسناد: الأيام الخاصة جوه المدة تتشال افتراضيًا وتفضل مع keepDayOverrides', { timeout: 60000 }, async () => {
  const week = fullWeeks(monthFrom, monthTo)[0]
  const special = dateAfter(week, 2)
  const day = await http(admin, 'POST', '/attendance/schedule/day', { employeeId: a1.id, date: special, shiftId: evening.id })
  assert.equal(day.status, 201, JSON.stringify(day.body))
  const kept = await range(hr, { employeeIds: [a1.id], from: week, to: dateAfter(week, 6), shiftId: morning.id, keepDayOverrides: true })
  assert.equal(kept.status, 201, JSON.stringify(kept.body))
  assert.equal(kept.body.keptOverrides, 1); assert.equal(kept.body.removedOverrides, 0)
  assert.equal((await attendance.shiftFor(a1.id, special)).shiftId, evening.id)
  const replaced = await range(hr, { employeeIds: [a1.id], from: week, to: dateAfter(week, 6), shiftId: morning.id })
  assert.equal(replaced.status, 201, JSON.stringify(replaced.body))
  assert.equal(replaced.body.removedOverrides, 1)
  const after = await attendance.shiftFor(a1.id, special)
  assert.equal(after.shiftId, morning.id); assert.equal(after.source, 'week')
})

test('أيام معينة بس (السبت): أيام خاصة على السبوت، ومفيش وردية أسبوع، وباقي الأيام زي ما هي', { timeout: 60000 }, async () => {
  const saturdays = daysBetween(monthFrom, monthTo).filter(d => dow(d) === 6)
  const res = await range(hr, { employeeIds: [a2.id], from: monthFrom, to: monthTo, weekdays: [6], shiftId: evening.id })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  assert.equal(res.body.weeks, 0); assert.equal(res.body.days, saturdays.length); assert.equal(res.body.dates, saturdays.length)
  for (const date of daysBetween(monthFrom, monthTo)) {
    const shift = await attendance.shiftFor(a2.id, date)
    assert.equal(shift.shiftId, dow(date) === 6 ? evening.id : morning.id, date)
  }
})

test('التحقق: تواريخ غلط وأيام غلط وقائمة فاضية ونطاق الفرع ووردية فرع تاني', { timeout: 60000 }, async () => {
  const bad = [
    { from: `${futureYear}-10-10`, to: `${futureYear}-10-01` },
    { from: `${futureYear}-02-30`, to: `${futureYear}-03-02` },
    { from: `${futureYear}-10-01`, to: `${futureYear}-10-02`, weekdays: [7] },
    { from: `${futureYear}-10-01`, to: `${futureYear}-10-02`, employeeIds: [] },
  ]
  for (const body of bad) {
    const res = await range(hr, { employeeIds: [a1.id], shiftId: morning.id, ...body })
    assert.equal(res.status, 400, JSON.stringify({ body, res: res.body }))
  }
  // مدى مفيهوش ولا يوم من الأيام المختارة
  let from = `${futureYear}-10-01`
  while (dow(from) !== 2) from = dateAfter(from, 1)
  const empty = await range(hr, { employeeIds: [a1.id], from, to: from, weekdays: [1], shiftId: morning.id })
  assert.equal(empty.status, 400)
  const outside = await range(hr, { employeeIds: [b1.id], from, to: from, shiftId: morning.id })
  assert.equal(outside.status, 403)
  const self = await range(hr, { employeeIds: [hr.employeeId], from, to: from, shiftId: morning.id })
  assert.equal(self.status, 403)
  if (repo('Shift').metadata.findColumnWithPropertyName('branchId')) {
    await repo('Shift').update(evening.id, { branchId: branchB.id })
    try {
      const res = await range(admin, { employeeIds: [a1.id, b1.id], from, to: from, shiftId: evening.id })
      assert.equal(res.status, 201, JSON.stringify(res.body))
      assert.equal(res.body.applied, 1)
      assert.match(res.body.skipped[0].reason, /خاصة بفرع تاني/)
      assert.equal(res.body.skipped[0].employeeId, a1.id)
    } finally {
      await repo('Shift').update(evening.id, { branchId: null })
    }
  }
})

test('أيام الحضور اللي فاتت تتحسب تاني بالوردية الجديدة', { timeout: 60000 }, async () => {
  const first = await range(admin, { employeeIds: [a1.id], from: pastDay, to: pastDay, shiftId: morning.id })
  assert.equal(first.status, 201, JSON.stringify(first.body))
  const punches = await http(admin, 'POST', '/attendance/punches/manual', { reason: 'اختبار إسناد مدة',
    punches: ['08:00', '17:00'].map(time => ({ employeeCode: a1.employeeCode, timestamp: new Date(`${pastDay}T${time}:00`).toISOString() })) })
  assert.equal(punches.status, 201, JSON.stringify(punches.body))
  const before = await repo('AttendanceDay').findOneByOrFail({ employeeId: a1.id, date: pastDay })
  assert.equal(before.shiftStart, '08:00'); assert.equal(before.lateMinutes, 0)
  const res = await range(hr, { employeeIds: [a1.id], from: dateAfter(pastDay, -1), to: dateAfter(pastDay, 1), shiftId: evening.id })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  assert.ok(res.body.recomputed >= 1, JSON.stringify(res.body))
  const after = await repo('AttendanceDay').findOneByOrFail({ employeeId: a1.id, date: pastDay })
  assert.equal(after.shiftStart, '14:00'); assert.equal(after.shiftId, evening.id)
})

test('فترات الإضافي: المقفولة توقف الحساب والمفتوحة تسمح بيه، والنطاق محمي', { timeout: 120000 }, async () => {
  const set = await range(admin, { employeeIds: [a2.id], from: otDay, to: otDay, shiftId: morning.id })
  assert.equal(set.status, 201, JSON.stringify(set.body))
  const punches = await http(admin, 'POST', '/attendance/punches/manual', { reason: 'اختبار فترات الإضافي',
    punches: ['08:00', '19:35'].map(time => ({ employeeCode: a2.employeeCode, timestamp: new Date(`${otDay}T${time}:00`).toISOString() })) })
  assert.equal(punches.status, 201, JSON.stringify(punches.body))
  let active = await activeOvertime(a2.id, otDay)
  assert.equal(active.length, 1); assert.equal(active[0].status, 'DETECTED')

  // النطاق: فرع أ مايقدرش يعمل فترة لكل الفروع ولا لفرع تاني
  const period = { name: 'قفل جرد', fromDate: otDay, toDate: otDay, effect: 'CLOSED' }
  assert.equal((await http(hr, 'POST', '/attendance/overtime-periods', period)).status, 403)
  assert.equal((await http(hr, 'POST', '/attendance/overtime-periods', { ...period, branchId: branchB.id })).status, 403)
  assert.equal((await http(hr, 'POST', '/attendance/overtime-periods', { ...period, fromDate: `${futureYear}-02-30`, toDate: `${futureYear}-03-01`, branchId: branchA.id })).status, 400)
  assert.equal((await http(hr, 'POST', '/attendance/overtime-periods', { ...period, effect: 'MAYBE', branchId: branchA.id })).status, 400)

  // قفل الفرع: المكتشف يتلغي فورًا
  const closed = await http(hr, 'POST', '/attendance/overtime-periods', { ...period, branchId: branchA.id })
  assert.equal(closed.status, 201, JSON.stringify(closed.body))
  assert.ok(closed.body.recompute.recomputed >= 1, JSON.stringify(closed.body))
  assert.equal((await activeOvertime(a2.id, otDay)).length, 0)
  assert.equal((await attendance.overtimeEvidence(a2.id, otDay)).window.open, false)

  // القائمة بنطاق الفرع: فترة فرع ب مش ظاهرة لفرع أ
  const other = await http(admin, 'POST', '/attendance/overtime-periods', { name: 'فرع ب', fromDate: otDay, toDate: otDay, effect: 'OPEN', branchId: branchB.id })
  assert.equal(other.status, 201, JSON.stringify(other.body))
  const global = await http(admin, 'POST', '/attendance/overtime-periods', { name: 'عام بعيد', fromDate: `${futureYear}-01-01`, toDate: `${futureYear}-01-02`, effect: 'OPEN' })
  assert.equal(global.status, 201, JSON.stringify(global.body))
  const listed = await http(hr, 'GET', '/attendance/overtime-periods')
  assert.equal(listed.status, 200)
  assert.deepEqual(listed.body.map(p => p.id).sort((x, y) => x - y), [closed.body.id, global.body.id].sort((x, y) => x - y))
  assert.equal((await http(hr, 'PATCH', `/attendance/overtime-periods/${global.body.id}`, { isActive: false })).status, 403)
  assert.equal((await http(hr, 'DELETE', `/attendance/overtime-periods/${other.body.id}`)).status, 403)
  assert.equal((await http(hr, 'PATCH', `/attendance/overtime-periods/${closed.body.id}`, { branchId: null })).status, 403)

  // حذف القفل: الإضافي يتكتشف تاني
  const removed = await http(hr, 'DELETE', `/attendance/overtime-periods/${closed.body.id}`)
  assert.equal(removed.status, 200, JSON.stringify(removed.body))
  active = await activeOvertime(a2.id, otDay)
  assert.equal(active.length, 1); assert.equal(active[0].status, 'DETECTED')

  // الإعداد العام مقفول: مفيش إضافي، وفترة مفتوحة للفرع ترجّعه، وإيقافها يشيله
  await repo('RequestsConfig').update({ key: 'overtime.enabled' }, { value: 'false' })
  await attendance.computeDay(a2.id, otDay)
  assert.equal((await activeOvertime(a2.id, otDay)).length, 0)
  const open = await http(hr, 'POST', '/attendance/overtime-periods', { name: 'فتح رمضان', fromDate: dateAfter(otDay, -3), toDate: otDay, effect: 'OPEN', branchId: branchA.id })
  assert.equal(open.status, 201, JSON.stringify(open.body))
  assert.equal((await activeOvertime(a2.id, otDay)).length, 1)
  const paused = await http(hr, 'PATCH', `/attendance/overtime-periods/${open.body.id}`, { isActive: false })
  assert.equal(paused.status, 200, JSON.stringify(paused.body))
  assert.equal(paused.body.isActive, false)
  assert.equal((await activeOvertime(a2.id, otDay)).length, 0)
  // تغيير الاسم بس مايعيدش الحساب
  const renamed = await http(hr, 'PATCH', `/attendance/overtime-periods/${open.body.id}`, { name: 'فتح رمضان ٢' })
  assert.equal(renamed.status, 200); assert.equal(renamed.body.recompute.recomputed, 0)
  await repo('RequestsConfig').update({ key: 'overtime.enabled' }, { value: 'true' })
})

test('إسناد لمدة بالفرق: أعضاء الفريق الشغالين بس، وحساب الفرع مايوصلش لفريق فرع تاني', { timeout: 60000 }, async () => {
  const teamA = await repo('Team').save({ name: 'فريق المدى أ', code: 'RNGTA', departmentId: deptA2.id })
  const deptB = await repo('Department').save({ branchId: branchB.id, code: 'RNGB1', name: 'قسم ب1' })
  const teamB = await repo('Team').save({ name: 'فريق المدى ب', code: 'RNGTB', departmentId: deptB.id })
  await repo('Employee').update(a2.id, { teamId: teamA.id })
  await repo('Employee').update(b1.id, { teamId: teamB.id })
  const gone = await repo('Employee').save({ employeeCode: 'RNGGONE', fullName: 'موظف ساب', branchId: branchA.id, departmentId: deptA2.id,
    teamId: teamA.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'terminated', isActive: false, annualLeaveEntitled: false, payMethod: 'cash' })
  const from = `${futureYear}-11-01`, to = `${futureYear}-11-03`
  const res = await range(hr, { teamIds: [teamA.id], from, to, shiftId: evening.id })
  assert.equal(res.status, 201, JSON.stringify(res.body))
  assert.equal(res.body.applied, 1)
  assert.deepEqual(res.body.skipped, [])
  for (const date of daysBetween(from, to)) assert.equal((await attendance.shiftFor(a2.id, date)).shiftId, evening.id, date)
  assert.equal(await repo('ScheduleDayOverride').count({ where: { employeeId: gone.id } }), 0)
  // فريق فرع تاني: حساب الفرع مايشوفش أعضاءه أصلًا
  const bBefore = await repo('ScheduleDayOverride').count({ where: { employeeId: b1.id } })
  const other = await range(hr, { teamIds: [teamB.id], from, to, shiftId: evening.id })
  assert.equal(other.status, 400, JSON.stringify(other.body))
  assert.equal(await repo('ScheduleDayOverride').count({ where: { employeeId: b1.id } }), bBefore)
  // المالك: فريق + موظف بالاسم مع بعض من غير تكرار
  const both = await range(admin, { teamIds: [teamA.id], employeeIds: [a2.id, a1.id], from, to, shiftId: evening.id })
  assert.equal(both.status, 201, JSON.stringify(both.body))
  assert.equal(both.body.applied, 2)
  // من غير موظفين ولا فرق = 400، وفرق غلط = 400
  assert.equal((await range(admin, { from, to, shiftId: evening.id })).status, 400)
  assert.equal((await range(admin, { teamIds: ['x'], from, to, shiftId: evening.id })).status, 400)
})
