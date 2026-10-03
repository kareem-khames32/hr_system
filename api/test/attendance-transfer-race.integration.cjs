'use strict'
// B1.4 (متابعة مراجعة Codex الجولتين 28 و29): كتابات الحضور اللي صلاحيتها بفرع الموظف بتقرا الفرع تحت قفله (نقل الموظف بياخد قفل
// الدوام والقفل المالي للموظف لآخر معاملته) — على قاعدة SQL مؤقتة معزولة (hr_attendance_transfer_race_test_<16 hex>):
//  AT-1) وردية اليوم، ومسح وردية الأسبوع، وجدول الأسبوع، وإسناد مدة: نقل اتحفظ قبل القفل = رفض (أو الموظف بيتعدّى في الجماعي) من غير كتابة.
//  AT-2) البصمة اليدوية وحذفها: نفس الشيء — البصمة مابتتسجلش، والمحذوفة بتفضل.
// الحاجز: اتصال تاني ماسك القفل المالي للموظف زي النقل بالظبط؛ الكتابة لازم تكون واقفة عليه، وبعدين النقل بيتحفظ جوه نفس المعاملة.
// Run (من api/): node --test test/attendance-transfer-race.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_attendance_transfer_race_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-attendance-race-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false, sequence = 0, branchA, branchB, deptA, hrA, shift

function assertDisposable() {
  assert.match(database, /^hr_attendance_transfer_race_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const employee = () => {
  const n = ++sequence
  return repo('Employee').save({ employeeCode: `ATR${n}`, fingerprintCode: `ATR${n}`, fullName: `موظف السباق ${n}`, branchId: branchA.id, departmentId: deptA.id,
    joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, annualLeaveEntitled: false, payMethod: 'transfer' })
}

async function whileTransferHoldsFinance(emp, action) {
  const barrier = ds.createQueryRunner()
  let pending, committed = false
  try {
    await barrier.connect(); await barrier.startTransaction()
    const spid = (await barrier.query('SELECT @@SPID AS spid'))[0].spid
    const locked = await barrier.query("DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=@0,@LockMode='Exclusive',@LockOwner='Transaction',@LockTimeout=5000; SELECT @result AS result",
      [`hr:employee-finance:${emp.id}`])
    assert.ok(locked[0].result >= 0)
    pending = action()
    const deadline = Date.now() + 8000
    let waiting = false
    while (!waiting && Date.now() < deadline) {
      waiting = (await master.request().input('spid', sql.Int, spid).input('database', sql.NVarChar, database)
        .query("SELECT session_id FROM sys.dm_exec_requests WHERE database_id=DB_ID(@database) AND blocking_session_id=@spid AND wait_type LIKE 'LCK%'")).recordset.length > 0
      if (!waiting) await new Promise(done => setTimeout(done, 25))
    }
    assert.equal(waiting, true, 'الكتابة لازم تستنى قفل الموظف قبل ما تقرا فرعه')
    await barrier.query('UPDATE employees SET branchId=@0 WHERE id=@1', [branchB.id, emp.id])
    await barrier.commitTransaction(); committed = true
    return await pending
  } finally {
    if (!committed && barrier.isTransactionActive) await barrier.rollbackTransaction()
    if (pending) await Promise.allSettled([pending])
    await barrier.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' }])
  branchA = await repo('Branch').save({ code: 'ATRA', name: 'فرع السباق أ' })
  branchB = await repo('Branch').save({ code: 'ATRB', name: 'فرع السباق ب' })
  deptA = await repo('Department').save({ name: 'قسم السباق', code: 'ATRD', branchId: branchA.id })
  hrA = await repo('User').save({ email: 'hr-a@attendance-race.invalid', displayName: 'موارد بشرية أ', passwordHash: 'test-only', role: 'hr_manager',
    branchId: branchA.id, permissions: JSON.stringify(['attendance.manage', 'attendance.view_all']) })
  shift = await repo('Shift').save({ name: 'وردية السباق', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed' })
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'attendance race fixture cleanup failed')
})

// أيام جاية (مفتوحة) — أحد لخميس
const DAY = '2026-11-08', WEEK = '2026-11-08'

test('AT-1: وردية اليوم ومسح وردية الأسبوع وجدول الأسبوع وإسناد المدة بتقرا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضها من غير كتابة', { timeout: 120000 }, async () => {
  // وردية يوم
  const day = await employee()
  const dayResult = await whileTransferHoldsFinance(day, () => request(hrA, 'POST', '/attendance/schedule/day', { employeeId: day.id, date: DAY, shiftId: shift.id }))
  assert.equal(dayResult.status, 403, JSON.stringify(dayResult.body))
  assert.equal(await repo('ScheduleDayOverride').countBy({ employeeId: day.id }), 0)
  // جدول الأسبوع: الموظف اللي اتنقل بيتعدّى (ولو هو الوحيد الطلب كله بيترفض)
  const weekly = await employee()
  const weeklyResult = await whileTransferHoldsFinance(weekly, () => request(hrA, 'POST', '/attendance/schedule',
    { entries: [{ weekStart: WEEK, employeeId: weekly.id, shiftName: shift.name, startTime: '08:00', endTime: '16:00', shiftId: shift.id }] }))
  assert.equal(weeklyResult.status, 403, JSON.stringify(weeklyResult.body))
  assert.equal(await repo('ScheduleEntry').countBy({ employeeId: weekly.id }), 0)
  // مسح وردية الأسبوع
  const cleared = await employee()
  assert.equal((await request(hrA, 'POST', '/attendance/schedule', { entries: [{ weekStart: WEEK, employeeId: cleared.id, shiftName: shift.name, startTime: '08:00',
    endTime: '16:00', shiftId: shift.id }] })).status, 201)
  const clearResult = await whileTransferHoldsFinance(cleared, () => request(hrA, 'DELETE', `/attendance/schedule/${WEEK}/${cleared.id}`))
  assert.equal(clearResult.status, 403, JSON.stringify(clearResult.body))
  assert.equal(await repo('ScheduleEntry').countBy({ employeeId: cleared.id }), 1)
  // إسناد مدة: الموظف اللي اتنقل بيطلع «فشل» بسببه، وزميله بيتسند عادي
  const moved = await employee(), stayed = await employee()
  const range = await whileTransferHoldsFinance(moved, () => request(hrA, 'POST', '/attendance/schedule/range',
    { employeeIds: [stayed.id, moved.id], from: DAY, to: '2026-11-12', shiftId: shift.id }))
  assert.equal(range.status, 201, JSON.stringify(range.body))
  assert.deepEqual([range.body.applied, range.body.failed.map(row => row.employeeId)], [1, [moved.id]])
  assert.equal(await repo('ScheduleDayOverride').countBy({ employeeId: moved.id }) + await repo('ScheduleEntry').countBy({ employeeId: moved.id }), 0)
  assert.ok(await repo('ScheduleDayOverride').countBy({ employeeId: stayed.id }) + await repo('ScheduleEntry').countBy({ employeeId: stayed.id }) > 0)
})

test('AT-2: البصمة اليدوية وحذفها بيقروا فرع الموظف تحت قفله — نقل اتحفظ قبله بيرفضهم من غير كتابة', { timeout: 120000 }, async () => {
  const at = (date, clock) => new Date(`${date}T${clock}:00`).toISOString()
  const punched = await employee()
  const manual = await whileTransferHoldsFinance(punched, () => request(hrA, 'POST', '/attendance/punches/manual',
    { punches: [{ employeeCode: punched.fingerprintCode, timestamp: at('2026-10-01', '08:05') }], reason: 'بصمة يدوية وقت النقل' }))
  assert.equal(manual.status, 403, JSON.stringify(manual.body))
  assert.equal(await repo('AttendancePunch').countBy({ employeeId: punched.id }), 0)
  const removed = await employee()
  expectCreated(await request(hrA, 'POST', '/attendance/punches/manual',
    { punches: [{ employeeCode: removed.fingerprintCode, timestamp: at('2026-10-01', '08:10') }], reason: 'بصمة يدوية قبل النقل' }))
  const [punch] = await repo('AttendancePunch').findBy({ employeeId: removed.id })
  const deleted = await whileTransferHoldsFinance(removed, () => request(hrA, 'DELETE', `/attendance/punches/${punch.id}`))
  assert.equal(deleted.status, 403, JSON.stringify(deleted.body))
  assert.equal(await repo('AttendancePunch').countBy({ id: punch.id }), 1)
})
function expectCreated(response) { assert.equal(response.status, 201, JSON.stringify(response.body)); return response.body }
