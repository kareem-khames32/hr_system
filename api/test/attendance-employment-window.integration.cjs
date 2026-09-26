'use strict'
// قرار المالك (26 سبتمبر) عبر HTTP وSQL فعليين على قاعدة مؤقتة معزولة تُحذف في النهاية:
// (أ) «آخر سبت في الشهر المالي دوام» جوه جدول العمل نفسه — لموظفي الجدول ده بس، والتاني (الجمعة بس راحة) مش متأثر،
//     والاستثناء اللي مالوش معنى بيترفض (وقت الحفظ ولما أيام الراحة تتغير).
// (ب) فترة الخدمة: مفيش غياب بعد آخر يوم عمل (ملف إنهاء خدمة لسه مفتوح)، وغياب قديم بيتمسح بإعادة الحساب ومايتعدّش
//     في التقرير، والإسناد الجماعي (يوم/أيام/مدة/أسبوع/جدول عمل) بيقف عند آخر يوم من غير ما يوقف الباقيين.
// التوكنات موقّعة محليًا بسر عشوائي — لا كلمات مرور ولا اتصال بقاعدة الشركة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql'), env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_employment_window_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-employment-window-files-'))
const secret = crypto.randomBytes(48).toString('hex'), jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { AttendanceService } = require('../src/attendance/attendance.service')
let app, ds, master, base, created = false, sequence = 0
let branch, department, admin, shift, scheduleA, scheduleB, empA, empB, empC, empD
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const change = { effectiveFrom: '2026-07-01', changeReason: 'إعداد اختبار فترة الخدمة واستثناءات الجدول' }
async function employee(extra = {}) {
  return repo('Employee').save({ employeeCode: `EW${String(++sequence).padStart(3, '0')}`, fullName: `موظف فترة الخدمة ${sequence}`,
    branchId: branch.id, departmentId: department.id, joinDate: '2024-01-01', status: 'active', isActive: true,
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'EGP', payMethod: 'cash', ...extra })
}
const service = () => app.get(AttendanceService)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_employment_window_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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

  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '23' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' }])
  branch = await repo('Branch').save({ name: 'فرع المعادي للاختبار', code: 'EW_MAADI', country: 'EG' })
  department = await repo('Department').save({ name: 'قسم الاختبار', branchId: branch.id })
  admin = await repo('User').save({ email: 'admin@employment-window.invalid', displayName: 'مدير النظام', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify(['*']) })
  shift = expect(await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية الاختبار', startTime: '09:00', endTime: '17:00', shiftMode: 'fixed',
    graceMinutes: 10, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 480, ...change }))
  scheduleA = expect(await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول الجمعة والسبت ماعدا آخر سبت', startTime: '09:00',
    endTime: '17:00', weekendDays: 'FRI,SAT', isDefault: true, isActive: true, flexEnabled: false, requiredWorkMinutes: 480,
    weekendExceptions: [{ weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL' }], ...change }))
  scheduleB = expect(await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول الجمعة بس', startTime: '09:00', endTime: '17:00',
    weekendDays: 'FRI', isActive: true, flexEnabled: false, requiredWorkMinutes: 480, ...change }))
  empA = await employee(); empB = await employee()
  // موظف في فترة الإشعار: ملف إنهاء خدمة مفتوح وآخر يوم عمل 10 سبتمبر — لسه نشط ومش مؤرشف
  empC = await employee({ status: 'notice_period' })
  // موظف خدمته انتهت واتقفل ملفه واتأرشف قبل سبتمبر
  empD = await employee({ status: 'terminated', isActive: false, archivedAt: new Date('2026-08-25T10:00:00') })
  await repo('OffboardingCase').save({ employeeId: empC.id, lastWorkingDay: '2026-09-10', status: 'IN_CLEARANCE', openedBy: admin.id })
  await repo('OffboardingCase').save({ employeeId: empD.id, lastWorkingDay: '2026-08-20', status: 'CLOSED', openedBy: admin.id })
  expect(await request(admin, 'POST', `/catalogs/work-schedules/${scheduleA.id}/assign`, { employeeIds: [empA.id, empC.id], ...change }))
  expect(await request(admin, 'POST', `/catalogs/work-schedules/${scheduleB.id}/assign`, { employeeIds: [empB.id], ...change }))
}, { timeout: 120000 })

after(async () => {
  try { if (app) await app.close() } finally {
    try {
      if (created && master) {
        assert.match(database, /^hr_employment_window_test_[a-f0-9]{16}$/)
        await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      }
    } finally { await master?.close(); fs.rmSync(uploads, { recursive: true, force: true }) }
  }
})

test('EW-01: the schedule stores its exceptions with the company payroll cycle pinned, and rejects meaningless ones', async () => {
  const row = await repo('WorkSchedule').findOneByOrFail({ id: scheduleA.id })
  assert.deepEqual(JSON.parse(row.weekendExceptions), [{ weekday: 'SAT', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL', cycleStartDay: 23 }])
  const bad = await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول غلط', startTime: '09:00', endTime: '17:00', weekendDays: 'FRI,SAT',
    isActive: true, weekendExceptions: [{ weekday: 'SUN', occurrence: 'LAST', effect: 'WORK', basis: 'PAYROLL' }], ...change })
  assert.equal(bad.status, 400); assert.match(JSON.stringify(bad.body), /يوم شغل أصلًا/)
  // تغيير أيام الراحة لـ«الجمعة بس» والاستثناء «دوام آخر سبت» لسه موجود → رسالة واضحة، ومفيش نسخة جديدة
  const conflict = await request(admin, 'PATCH', `/catalogs/work-schedules/${scheduleA.id}`, { weekendDays: 'FRI', effectiveFrom: '2026-10-01', changeReason: 'تجربة' })
  assert.equal(conflict.status, 400); assert.match(JSON.stringify(conflict.body), /السبت يوم شغل أصلًا/)
})

test('EW-02: last Saturday of the payroll month is a working day for schedule A only; schedule B works every Saturday', async () => {
  const a = expect(await request(admin, 'GET', `/attendance/working-days?from=2026-08-23&to=2026-09-22&employeeId=${empA.id}`), 200)
  assert.ok(!a.skipped.includes('2026-09-19'), 'آخر سبت في الشهر المالي (19 سبتمبر) يوم شغل لموظف الجدول (أ)')
  assert.ok(a.skipped.includes('2026-09-12') && a.skipped.includes('2026-09-18'), 'باقي السبوت والجمعة راحة')
  const b = expect(await request(admin, 'GET', `/attendance/working-days?from=2026-08-23&to=2026-09-22&employeeId=${empB.id}`), 200)
  assert.ok(!b.skipped.includes('2026-09-12') && !b.skipped.includes('2026-09-19'), 'موظف الجدول (ب) شغال كل سبت')
  assert.ok(b.skipped.includes('2026-09-18'), 'والجمعة راحة')
  // الغياب: آخر سبت من غير بصمة غياب محفوظ، وسبت عادي مش غياب
  const lastSaturday = await service().computeDay(empA.id, '2026-09-19')
  assert.equal(lastSaturday.status, 'absent')
  assert.ok(await repo('AttendanceDay').findOneBy({ employeeId: empA.id, date: '2026-09-19', status: 'absent' }))
  const normalSaturday = await service().computeDay(empA.id, '2026-09-12')
  assert.notEqual(normalSaturday.status, 'absent')
})

test('EW-03: no absence after the last working day while the offboarding case is still open; stale rows are cleared and not reported', async () => {
  await service().materializeAbsences(empC.id, '2026-09-01', '2026-09-20')
  const rows = await repo('AttendanceDay').find({ where: { employeeId: empC.id } })
  assert.ok(rows.some(row => String(row.date).slice(0, 10) <= '2026-09-10' && row.status === 'absent'), 'قبل آخر يوم عمل: غياب عادي')
  assert.ok(!rows.some(row => String(row.date).slice(0, 10) > '2026-09-10'), 'بعد آخر يوم عمل: مفيش ولا صف')
  // غياب قديم اتكتب قبل التصحيح: إعادة الحساب بتمسحه، والشاشة اليومية والتقرير مابيعدّوهوش
  await repo('AttendanceDay').save([15, 16].map(day => ({ employeeId: empC.id, branchId: branch.id, date: `2026-09-${day}`, status: 'absent',
    shiftName: 'قديم', shiftStart: '09:00', shiftEnd: '17:00', workMinutes: 0, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })))
  const report = expect(await request(admin, 'GET', '/reports/attendance?from=2026-09-01&to=2026-09-20'), 200)
  const own = report.find(row => row.employeeId === empC.id)
  assert.equal(Number(own.absentDays), rows.filter(row => row.status === 'absent').length, 'التقرير مابيعدّش غياب بعد آخر يوم عمل')
  const daily = expect(await request(admin, 'GET', '/attendance/daily?date=2026-09-15'), 200)
  assert.ok(!daily.some(row => row.employeeId === empC.id), 'الشاشة اليومية مابتعرضش غياب بعد آخر يوم عمل')
  const recomputed = await service().computeDay(empC.id, '2026-09-15')
  assert.equal(recomputed.outsideEmployment, true)
  assert.equal(await repo('AttendanceDay').countBy({ employeeId: empC.id, date: '2026-09-15' }), 0, 'إعادة الحساب مسحت الغياب القديم')
})

test('EW-04: bulk assignments stop at each employee\'s service window without blocking the others', async () => {
  // يوم واحد صريح بعد آخر يوم عمل: رسالة واضحة
  const single = await request(admin, 'POST', '/attendance/schedule/day', { employeeId: empC.id, date: '2026-09-15', shiftId: shift.id })
  assert.equal(single.status, 400); assert.match(JSON.stringify(single.body), /بعد آخر يوم عمل/)
  // أيام لمجموعة: يوم برّه الخدمة بيتعدّى ويتعد
  const bulk = expect(await request(admin, 'POST', '/attendance/schedule/day/bulk',
    { employeeIds: [empA.id, empC.id], dates: ['2026-09-09', '2026-09-15'], shiftId: shift.id }))
  assert.equal(bulk.applied, 3); assert.equal(bulk.outsideEmployment, 1); assert.deepEqual(bulk.failed, [])
  // مدة: (ج) ياخد أيام خدمته بس كأيام خاصة، و(د) خدمته انتهت قبل المدة فبيتعدّى بسبب هادي
  const range = expect(await request(admin, 'POST', '/attendance/schedule/range',
    { employeeIds: [empA.id, empC.id, empD.id], from: '2026-09-06', to: '2026-09-19', shiftId: shift.id }))
  assert.equal(range.applied, 2); assert.equal(range.partial, 1)
  const skippedD = range.skipped.find(row => row.employeeId === empD.id)
  assert.equal(skippedD?.outsideEmployment, true); assert.match(skippedD.reason, /خدمته انتهت 2026-08-20/)
  const cOverrides = await repo('ScheduleDayOverride').find({ where: { employeeId: empC.id } })
  assert.ok(cOverrides.length > 0 && cOverrides.every(row => String(row.date).slice(0, 10) <= '2026-09-10'), 'أيام (ج) الخاصة جوه خدمته بس')
  assert.equal(await repo('ScheduleEntry').countBy({ employeeId: empC.id }), 0, 'مفيش «وردية أسبوع» لموظف خدمته بتنتهي جوه الأسبوع')
  assert.equal(await repo('ScheduleEntry').countBy({ employeeId: empA.id }), 2, 'الأسبوعين الكاملين لموظف في الخدمة')
  // الجدول الأسبوعي: أسبوع بعد آخر يوم عمل بيتعدّى، وأسبوع فيه آخر يوم عمل بيتحفظ
  const weekly = expect(await request(admin, 'POST', '/attendance/schedule', { entries: [
    { weekStart: '2026-09-13', employeeId: empC.id, shiftId: shift.id },
    { weekStart: '2026-09-06', employeeId: empC.id, shiftId: shift.id },
  ] }))
  assert.equal(weekly.saved.length, 1); assert.match(weekly.skipped[0].reason, /خدمته انتهت 2026-09-10/)
  // جدول العمل بتاريخ سريان بعد انتهاء الخدمة: بيتعدّى ويتعد بدل خطأ
  const assign = expect(await request(admin, 'POST', `/catalogs/work-schedules/${scheduleB.id}/assign`,
    { employeeIds: [empD.id, empB.id], effectiveFrom: '2026-09-01', changeReason: 'تجربة الإسناد بعد انتهاء الخدمة' }))
  assert.equal(assign.outsideEmployment, 1); assert.equal(assign.matched, 1)
})

test('EW-05: the employment-windows endpoint feeds the weekly schedule (who serves the shown week)', async () => {
  const all = expect(await request(admin, 'GET', '/attendance/employment-windows'), 200)
  const byId = new Map(all.map(row => [row.employeeId, row]))
  assert.deepEqual([byId.get(empC.id).to, byId.get(empC.id).toSource], ['2026-09-10', 'OFFBOARDING'])
  assert.deepEqual([byId.get(empD.id).to, byId.get(empD.id).toSource], ['2026-08-20', 'OFFBOARDING'])
  assert.equal(byId.get(empA.id).to, null)
  const week = expect(await request(admin, 'GET', '/attendance/employment-windows?from=2026-09-13&to=2026-09-19'), 200)
  assert.ok(week.some(row => row.employeeId === empA.id))
  assert.ok(!week.some(row => row.employeeId === empC.id || row.employeeId === empD.id), 'اللي خدمتهم انتهت قبل الأسبوع مايظهروش')
  assert.equal((await request(admin, 'GET', '/attendance/employment-windows?from=2026-09-20&to=2026-09-13')).status, 400)
})
