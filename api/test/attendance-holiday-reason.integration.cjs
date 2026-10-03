// B1.2 (D13، عرض بس): سبب «عطلة» في السجل اليومي للحضور — اسم العطلة الرسمية من تقويم الموظف نفسه، وراحة أسبوعية = null،
// وباقي الصفوف زي ما هي. والعطلات الرسمية مقروءة لحساب الحضور (رسالة اليوم الفاضي). قاعدة SQL مؤقتة معزولة (synchronize).
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
const database = `hr_holiday_reason_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-holiday-reason-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const U = {}, E = {}
const HOLIDAY = '2026-09-23', FRIDAY = '2026-09-25', WORKDAY = '2026-09-22'
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function get(user, endpoint) {
  const response = await fetch(base + endpoint, { headers: { Authorization: `Bearer ${token(user)}` } })
  const text = await response.text()
  assert.equal(response.status, 200, `${endpoint}: ${text}`)
  return text ? JSON.parse(text) : null
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_holiday_reason_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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

  const branch = await repo('Branch').save({ code: 'HR_SA', name: 'فرع الرياض', country: 'SA' })
  U.admin = await repo('User').save({ email: 'admin@holiday.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  U.attendance = await repo('User').save({ email: 'att@holiday.invalid', displayName: 'مسؤول الحضور', passwordHash: 'test-only', role: 'hr_manager', branchId: branch.id,
    permissions: JSON.stringify(['attendance.view_all']) })
  E.one = await repo('Employee').save({ employeeCode: 'HOL001', fullName: 'سعد', branchId: branch.id, joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 0,
    transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer' })
  await repo('PublicHoliday').save({ name: 'اليوم الوطني', date: HOLIDAY, country: 'SA' })
  const day = (date, status) => ({ employeeId: E.one.id, branchId: branch.id, date, status, checkIn: '09:00', checkOut: '12:00', shiftName: 'وردية', shiftStart: '08:00',
    shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 180, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  await repo('AttendanceDay').save([day(HOLIDAY, 'holiday'), day(FRIDAY, 'holiday'), day(WORKDAY, 'present')])
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_holiday_reason_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Holiday reason fixture cleanup failed')
})

test('B1.2: السجل اليومي بيقول سبب «عطلة» — اسم العطلة الرسمية أو راحة أسبوعية، وباقي الصفوف زي ما هي', async () => {
  const [holiday] = await get(U.attendance, `/attendance/daily?date=${HOLIDAY}`)
  assert.deepEqual([holiday.status, holiday.holidayName], ['holiday', 'اليوم الوطني'])
  const [friday] = await get(U.attendance, `/attendance/daily?date=${FRIDAY}`)
  assert.deepEqual([friday.status, friday.holidayName], ['holiday', null], 'الجمعة راحة أسبوعية')
  const [workday] = await get(U.attendance, `/attendance/daily?date=${WORKDAY}`)
  assert.equal(workday.status, 'present')
  assert.ok(!('holidayName' in workday), 'صف يوم العمل مابيتغيرش')
  // رسالة اليوم الفاضي: العطلات الرسمية مقروءة لحساب الحضور من غير صلاحية إعدادات
  const holidays = await get(U.attendance, '/catalogs/holidays')
  assert.ok(holidays.some(row => row.name === 'اليوم الوطني' && String(row.date).slice(0, 10) === HOLIDAY), JSON.stringify(holidays))
})
