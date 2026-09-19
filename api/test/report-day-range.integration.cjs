// فلاتر «من تاريخ / إلى تاريخ» في الحضور (قاعدة المالك 2026-09-19): شهر الرواتب (23 → 22) من /attendance/payroll-month،
// والكشف والتقارير والإضافي والبصمات تقبل from/to باليوم مع بقاء ?month= للتوافق.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_day_range_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-day-range-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const { readCalendarSource, confirmCalendarSource } = require('../src/attendance/attendance-calendar-history')
let app, ds, master, base, created = false, admin, branch, emp

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function request(method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(admin))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function confirm(scope, sourceId, effectiveFrom = '2026-01-01') {
  await ds.transaction(async em => {
    const read = await readCalendarSource(em, scope, sourceId)
    await confirmCalendarSource(em, claims(admin), scope, sourceId, { expectedRevision: read.revision, expectedCurrentSourceHash: read.currentSourceHash,
      effectiveFrom, reason: 'تأكيد تقويم اختبار فلتر الأيام' })
  })
}
// دقائق العمل المحفوظة للموظف بين يومين (شاملين) — المرجع اللي التقرير لازم يطابقه
async function storedWorkMinutes(from, to) {
  const rows = await repo('AttendanceDay').find({ where: { employeeId: emp.id } })
  return rows.filter(row => String(row.date).slice(0, 10) >= from && String(row.date).slice(0, 10) <= to).reduce((sum, row) => sum + Number(row.workMinutes ?? 0), 0)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_day_range_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  admin = await repo('User').save({ email: 'admin@day-range.invalid', displayName: 'Day range fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '23' }, { key: 'attendance.weekend_days', value: 'FRI' }])
  branch = await repo('Branch').save({ code: 'RANGE', name: 'فرع اختبار فلتر الأيام', country: 'EG', weekendDays: 'FRI' })
  await confirm('GLOBAL', 0); await confirm('BRANCH', branch.id)
  const saved = expect(await request('POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), employeeCode: 'RANGE1', fullName: 'موظف اختبار فلتر الأيام',
    branchId: branch.id, joinDate: '2026-06-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
    otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', attendanceEffectiveFrom: '2026-06-01', attendanceChangeReason: 'إسناد دوام موظف اختبار فلتر الأيام' }), 201)
  await confirm('EMPLOYEE', saved.id, '2026-06-01')
  emp = await repo('Employee').findOneByOrFail({ id: saved.id })
  // أربع أيام على حدود شهر رواتب يوليو (23 يونيو → 22 يوليو) بساعات مختلفة: 1 و2 و4 و8 ساعات
  const days = [['2026-06-22', '09:00'], ['2026-06-23', '10:00'], ['2026-07-22', '12:00'], ['2026-07-23', '16:00']]
  const punches = days.flatMap(([date, out]) => [`${date}T08:00:00`, `${date}T${out}:00`])
    .map(stamp => ({ employeeCode: emp.fingerprintCode, timestamp: new Date(stamp).toISOString() }))
  expect(await request('POST', '/attendance/punches/manual', { punches, reason: 'بصمات اختبار فلتر الأيام' }), 201)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_day_range_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-day-range-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار فلتر الأيام')
})

test('/attendance/payroll-month gives the payroll month (23 → 22) from the company setting', async () => {
  const july = { cycleStartDay: 23, period: '2026-07', from: '2026-06-23', to: '2026-07-22' }
  const byDate = expect(await request('GET', '/attendance/payroll-month?date=2026-07-01'), 200)
  assert.deepEqual({ cycleStartDay: byDate.cycleStartDay, period: byDate.period, from: byDate.from, to: byDate.to }, july)
  const byPeriod = expect(await request('GET', '/attendance/payroll-month?period=2026-07'), 200)
  assert.deepEqual({ cycleStartDay: byPeriod.cycleStartDay, period: byPeriod.period, from: byPeriod.from, to: byPeriod.to }, july)
  assert.equal(expect(await request('GET', '/attendance/payroll-month?date=2026-07-23'), 200).period, '2026-08')
  const current = expect(await request('GET', '/attendance/payroll-month'), 200)
  assert.ok(current.from <= current.today && current.today <= current.to, JSON.stringify(current))
  expect(await request('GET', '/attendance/payroll-month?date=2026-02-30'), 400)
})

test('attendance report: from/to counts exactly the chosen days; ?month= still works; bad ranges are 400', async () => {
  const inRange = await storedWorkMinutes('2026-06-23', '2026-07-22')
  assert.ok(inRange > 0, 'البصمات اتحسبت أيام حضور')
  const ranged = expect(await request('GET', '/reports/attendance?from=2026-06-23&to=2026-07-22'), 200)
  const row = ranged.find(item => Number(item.employeeId) === emp.id)
  assert.ok(row, JSON.stringify(ranged))
  assert.equal(Number(row.totalWorkMinutes), inRange)
  const june = expect(await request('GET', '/reports/attendance?month=2026-06'), 200).find(item => Number(item.employeeId) === emp.id)
  assert.equal(Number(june.totalWorkMinutes), await storedWorkMinutes('2026-06-01', '2026-06-30'))
  assert.notEqual(Number(june.totalWorkMinutes), inRange, 'الشهر التقويمي غير شهر الرواتب')
  const oneDay = expect(await request('GET', '/reports/attendance?from=2026-07-22&to=2026-07-22'), 200).find(item => Number(item.employeeId) === emp.id)
  assert.equal(Number(oneDay.totalWorkMinutes), await storedWorkMinutes('2026-07-22', '2026-07-22'))
  for (const bad of ['/reports/attendance', '/reports/attendance?from=2026-07-10&to=2026-07-01', '/reports/attendance?from=2026-07-01',
    "/reports/attendance?month=2026-07'--", '/reports/overtime?from=2025-01-01&to=2026-07-01']) expect(await request('GET', bad), 400)
  assert.ok(Array.isArray(expect(await request('GET', '/reports/overtime?from=2026-06-23&to=2026-07-22'), 200)))
  assert.ok(Array.isArray(expect(await request('GET', '/reports/overtime?month=2026-07'), 200)))
})

test('employee sheet, overtime log and manual punches accept the payroll month by day', async () => {
  const sheet = expect(await request('GET', `/attendance/monthly?employeeId=${emp.id}&from=2026-06-23&to=2026-07-22`), 200)
  assert.equal(sheet.from, '2026-06-23'); assert.equal(sheet.to, '2026-07-22')
  const dates = sheet.days.map(row => String(row.date).slice(0, 10))
  assert.ok(dates.every(date => date >= '2026-06-23' && date <= '2026-07-22'), dates.join(','))
  assert.ok(dates.includes('2026-06-23') && dates.includes('2026-07-22'))
  assert.ok(!dates.includes('2026-06-22') && !dates.includes('2026-07-23'))
  const legacy = expect(await request('GET', `/attendance/monthly?employeeId=${emp.id}&month=2026-07`), 200)
  assert.equal(legacy.from, '2026-07-01'); assert.equal(legacy.to, '2026-07-31')
  assert.ok(legacy.days.some(row => String(row.date).slice(0, 10) === '2026-07-23'))
  expect(await request('GET', `/attendance/monthly?employeeId=${emp.id}&from=2026-07-01`), 400)
  expect(await request('GET', `/attendance/monthly?employeeId=${emp.id}`), 400)

  const overtime = expect(await request('GET', '/attendance/overtime?from=2026-06-23&to=2026-07-22'), 200)
  assert.deepEqual([overtime.from, overtime.to], ['2026-06-23', '2026-07-22'])
  assert.equal(expect(await request('GET', '/attendance/overtime?month=2026-07'), 200).from, '2026-07-01')

  const punches = expect(await request('GET', '/attendance/punches?source=MANUAL&from=2026-06-23&to=2026-07-22'), 200)
  assert.deepEqual([...new Set(punches.filter(row => row.employeeId === emp.id).map(row => row.date))].sort(), ['2026-06-23', '2026-07-22'])
  const junePunches = expect(await request('GET', '/attendance/punches?source=MANUAL&month=2026-06'), 200)
  assert.deepEqual([...new Set(junePunches.filter(row => row.employeeId === emp.id).map(row => row.date))].sort(), ['2026-06-22', '2026-06-23'])
})
