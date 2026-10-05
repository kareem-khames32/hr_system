'use strict'
// B1.12 — الغياب اللحظي (السجل اليومي للنهارده وكارت «غائبون») بذاكرة دفعة واحدة للطلب، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر:
//  LA-01) المسار الجديد (بالدفعة) = المسار القديم (batch=false) بالحرف، على موظفين بكل مصادر الوردية: جدول الأسبوع، ويوم خاص بوردية
//         مرنة، ويوم خاص من غير وردية، وجدول عمل على الموظف، والجدول الافتراضي، ونص يوم إجازة، وبنطاق فرع واحد.
//  LA-02) اللي مايتحسبش غايب مابيظهرش: وردية لسه مابدأتش، وراحة أسبوعية للفرع، وإجازة يوم كامل، وحاضر، ومستثنى من الحضور.
//  LA-03) السجل اليومي (`GET /attendance/daily`) بيرجّع نفس الصفوف بعلامة live.
// الورديات من 00:00 لـ23:59 عشان الاختبار مايعتمدش على ساعة تشغيله (غير أول دقايق اليوم: التأكيدات اللي محتاجة السماحية تعدّي بتتخطى).
// Run (من api/): node --test test/attendance-live-absences.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_live_absences_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-live-absences-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const today = new Date().toLocaleDateString('en-CA')
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const todayCode = WEEKDAYS[new Date(`${today}T12:00:00`).getDay()]
// راحة أسبوعية مافيهاش النهارده (لفرع الشغل)، وراحة فيها النهارده (لفرع الراحة)
const workingWeekend = WEEKDAYS.filter(code => code !== todayCode).slice(0, 2).join(',')
let app, master, ds, base, service, admin, created = false, sequence = 0
const B = {}, E = {}

function assertDisposable() {
  assert.match(database, /^hr_live_absences_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const plain = value => JSON.parse(JSON.stringify(value))
const weekStartOf = date => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10) }
async function employee(branch, extra = {}) {
  const n = ++sequence
  return repo('Employee').save({ employeeCode: `LA${String(n).padStart(3, '0')}`, fullName: `موظف الغياب اللحظي ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, ...extra })
}
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null, tokenVersion: 0, permissions: ['*'] })

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
  service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const config = repo('RequestsConfig')
  for (const [key, value] of [['attendance.weekend_days', workingWeekend], ['attendance.grace_minutes', '10']]) {
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  admin = await repo('User').save({ email: 'admin@live-absences.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  B.work = await repo('Branch').save({ code: 'LAW', name: 'فرع شغال النهارده', weekendDays: workingWeekend })
  B.other = await repo('Branch').save({ code: 'LAO', name: 'فرع تاني شغال', weekendDays: workingWeekend })
  B.rest = await repo('Branch').save({ code: 'LAR', name: 'فرع راحته النهارده', weekendDays: todayCode })
  const fixed = await repo('Shift').save({ name: 'وردية ثابتة طول اليوم', startTime: '00:00', endTime: '23:59', shiftMode: 'fixed' })
  const flexible = await repo('Shift').save({ name: 'وردية مرنة طول اليوم', startTime: '00:00', endTime: '23:59', shiftMode: 'flexible', flexEnabled: true, flexWindowMinutes: 20 })
  const late = await repo('Shift').save({ name: 'وردية آخر الليل', startTime: '23:58', endTime: '23:59', shiftMode: 'fixed' })
  await repo('WorkSchedule').save({ name: 'الجدول الافتراضي', weekendDays: workingWeekend, startTime: '00:00', endTime: '23:59', isDefault: true, isActive: true })
  const own = await repo('WorkSchedule').save({ name: 'جدول على الموظف', weekendDays: workingWeekend, startTime: '00:00', endTime: '23:59', isDefault: false, isActive: true })
  const week = (emp, shift) => repo('ScheduleEntry').save({ weekStart: weekStartOf(today), employeeId: emp.id, shiftId: shift.id, shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime })
  const dayOverride = (emp, shift) => repo('ScheduleDayOverride').save({ employeeId: emp.id, date: today, ...(shift.id ? { shiftId: shift.id } : {}), shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime })
  // اللي المفروض يبانوا غياب لحظي بعد السماحية
  E.week = await employee(B.work); await week(E.week, fixed)
  E.flexDay = await employee(B.work); await dayOverride(E.flexDay, flexible)
  E.plainDay = await employee(B.work); await dayOverride(E.plainDay, { name: 'يوم خاص من غير وردية', startTime: '00:00', endTime: '23:59' })
  E.ownSchedule = await employee(B.work, { workScheduleId: own.id })
  E.byDefault = await employee(B.work)
  E.otherBranch = await employee(B.other); await week(E.otherBranch, fixed)
  E.halfLeave = await employee(B.work); await week(E.halfLeave, fixed)
  await repo('Leave').save({ employeeId: E.halfLeave.id, leaveTypeCode: 'ANNUAL', fromDate: today, toDate: today, days: 0.5, period: 'MORNING', isUnpaid: false, status: 'APPROVED' })
  // اللي مايبانوش
  E.notYet = await employee(B.work); await dayOverride(E.notYet, late)
  E.restDay = await employee(B.rest); await week(E.restDay, fixed)
  E.fullLeave = await employee(B.work); await week(E.fullLeave, fixed)
  await repo('Leave').save({ employeeId: E.fullLeave.id, leaveTypeCode: 'ANNUAL', fromDate: today, toDate: today, days: 1, period: 'FULL', isUnpaid: false, status: 'APPROVED' })
  E.present = await employee(B.work); await week(E.present, fixed)
  await repo('AttendanceDay').save({ employeeId: E.present.id, branchId: B.work.id, date: today, status: 'present', checkIn: '00:01', shiftName: fixed.name, shiftStart: '00:00', shiftEnd: '23:59',
    scheduleSource: 'week', workMinutes: 0, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  E.exempt = await employee(B.work); await week(E.exempt, fixed)
  await repo('AttendanceExemption').save({ employeeId: E.exempt.id, effectiveFrom: '2020-01-01', effectiveTo: '2099-12-31', reasonCode: 'field_role', reason: 'عمل ميداني لاختبار الغياب اللحظي',
    status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id, approvedAt: new Date('2020-01-01T08:00:00Z'), requiresCheckinForPresence: false })
}, { timeout: 180000 })

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
  if (errors.length) throw new AggregateError(errors, 'live absences fixture cleanup failed')
})

// الحسابين في لحظتين متتاليتين: موظف على حافة السماحية بالظبط ممكن يفرق بينهم، فبنعيد مرة قبل ما نعتبره فرق
async function both(scope) {
  for (let attempt = 0; ; attempt++) {
    const batched = plain(await service.liveAbsences(today, scope)), old = plain(await service.liveAbsences(today, scope, { batch: false }))
    if (attempt || JSON.stringify(batched) === JSON.stringify(old)) return { batched, old }
  }
}
const minutesNow = () => { const now = new Date(); return now.getHours() * 60 + now.getMinutes() }

test('LA-01: الغياب اللحظي بالدفعة = المسار القديم بالحرف، بكل مصادر الوردية وبنطاق الفرع', async t => {
  const { batched, old } = await both(null)
  assert.deepEqual(batched, old)
  const ids = new Set(batched.map(row => row.employeeId))
  t.diagnostic(JSON.stringify({ rows: batched.length, minutesNow: minutesNow(), sources: [...new Set(batched.map(row => row.scheduleSource))].sort() }))
  // بعد ما السماحية ونافذة المرونة يعدّوا (أول 45 دقيقة من اليوم مابنأكدش): كل مصدر وردية طالع غياب لحظي
  if (minutesNow() > 45 && minutesNow() < 23 * 60 + 50) {
    for (const name of ['week', 'flexDay', 'plainDay', 'ownSchedule', 'byDefault', 'otherBranch']) assert.equal(ids.has(E[name].id), true, name)
    const row = name => batched.find(item => item.employeeId === E[name].id)
    assert.deepEqual([row('week').scheduleSource, row('flexDay').scheduleSource, row('plainDay').scheduleSource, row('ownSchedule').scheduleSource, row('byDefault').scheduleSource],
      ['week', 'override', 'override', 'employee', 'default'])
    assert.ok(batched.every(item => item.live === true && item.status === 'absent' && item.id === -item.employeeId && item.flexOutcome === 'NO_PUNCH'))
    assert.equal(row('week').graceUsed, 10)
  }
  // بنطاق فرع واحد: نفس التطابق، ومن غير موظف الفرع التاني
  const scoped = await both([B.work.id])
  assert.deepEqual(scoped.batched, scoped.old)
  assert.equal(scoped.batched.some(row => row.employeeId === E.otherBranch.id), false)
  assert.deepEqual(scoped.batched, batched.filter(row => row.employeeId !== E.otherBranch.id))
  // نص يوم إجازة الصبح: بيتحسب غايب بعد ما نص الوردية والسماحية يعدّوا بس — في الحالتين المسارين متطابقين
  if (minutesNow() < 11 * 60) assert.equal(ids.has(E.halfLeave.id), false, 'قبل نص الوردية: نص يوم الإجازة مغطيه')
  if (minutesNow() > 12 * 60 + 30 && minutesNow() < 23 * 60 + 50) assert.equal(ids.has(E.halfLeave.id), true, 'بعد نص الوردية والسماحية: غايب')
})

test('LA-02: وردية لسه مابدأتش، وراحة الفرع، وإجازة يوم كامل، وحاضر، ومستثنى — مابيظهروش', async () => {
  const { batched, old } = await both(null)
  assert.deepEqual(batched, old)
  const ids = new Set(batched.map(row => row.employeeId))
  for (const name of ['restDay', 'fullLeave', 'present', 'exempt']) assert.equal(ids.has(E[name].id), false, name)
  if (minutesNow() < 23 * 60 + 57) assert.equal(ids.has(E.notYet.id), false, 'notYet')
})

test('LA-03: السجل اليومي للنهارده بيرجّع صفوف الغياب اللحظي نفسها بعلامة live', async () => {
  const response = await fetch(`${base}/attendance/daily?date=${today}`, { headers: { Authorization: `Bearer ${token(admin)}` } })
  assert.equal(response.status, 200)
  const rows = await response.json()
  const live = rows.filter(row => row.live === true), direct = plain(await service.liveAbsences(today, null))
  assert.deepEqual(live.map(row => row.employeeId).sort((a, b) => a - b), direct.map(row => row.employeeId).sort((a, b) => a - b))
  // الحاضر صفه المحفوظ موجود ومش live
  const present = rows.find(row => row.employeeId === E.present.id)
  assert.equal(present.status, 'present'); assert.notEqual(present.live, true)
})
