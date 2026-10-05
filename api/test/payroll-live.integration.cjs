'use strict'
// B1.14 — الراتب الحي، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (بصمات خام حقيقية، ومحرك الحضور هو اللي بيصنّف اليوم):
//  LV-01) المعاينة قبل أي حساب: الموظفين ظاهرين و«لسه ماتحسبش»، وبالصلاحية والنطاق.
//  LV-02) «حدّث الحساب» بنطاق الحساب: مجموع كل موظف = مجموع صفوف تراكمه بالقرش، والتأخير والغياب بمبالغهم، وإجمالي الفرع والعملة.
//  LV-03) مهمة الليل بتحسب للموظف اللي مالوش مسير مفتوح (الإعداد مفتوح)، والإعداد المقفول = زي الأول، وإعادة التشغيل مابتحسبش تاني.
//  LV-04) يوم اتعلّم متسخ ← مهمة في الطابور ← اتنفذت ← المعاينة اتغيرت. وتعديلات متتالية = مهمة واحدة، ووقت التنفيذ بتوقيت UTC صح.
//  LV-05) «مستحقي التقديري» للموظف: الميزة مقفولة 404، ومفتوحة أرقامه هو بس ومطابقة لصف المعاينة.
//  LV-06) المهمة مابتعيدش حساب يوم مقفول: صف مسيره معتمد أو مصروف، أو صف من غير مسير مفتوح والموظف ليه في فترته مسير عادي معتمد. والمفتوح والملغى بيتعادوا.
//  LV-08) «حدّث الحساب» بميزانية وقت: كل طلب بيحسب اللي يلحقه ويقول الباقي، وبيحسب الناقصين بس.
//  LV-09) موديول الرواتب مقفول = مهمة إعادة الحساب مابتحسبش (زي مهمة الليل)، ولما يتفتح اليوم بيتحسب.
//  LV-10) (CRP2B-C-B01) صلاحية الحساب من غير صلاحية العرض: «حدّث الحساب» بيشتغل وبيرجّع أعداد بس — لا أسماء ولا مبالغ.
//  LV-11) (CRP2B-C-B03) «مكتمل» = كل أيام الفترة المطلوبة موجودة: آخر يوم لوحده أو يوم ناقص في النص = لسه محتاج حساب، وبتاريخ التعيين.
//  LV-12) (CRP2B-C-B02) الإقفال بيتفحص جوه المعاملة تحت قفل الموظف المالي: مسير اتعتمد بين الاختيار والكتابة مابيتكتبش على أيامه.
//  LV-07) سباق معاملتين على نفس مفتاح المهمة: التانية بتستنى وبترجع false ومعاملتها سليمة — بالعزل الافتراضي وبـRCSI (الفهرس الفريد هو الحكم).
// الفترة الجارية من ساعة التشغيل (دورة 23)، فالتأكيدات نسبية ليها: مفيش تاريخ ثابت يبوظ مع الوقت.
// Run (من api/): node --test test/payroll-live.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_payroll_live_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_payroll_live_test_[a-f0-9]{16}$/
// قاعدة مؤقتة تانية صغيرة (جدولين الطابور بس) بـREAD_COMMITTED_SNAPSHOT لاختبار السباق LV-07
const rcsiDatabase = `hr_payroll_live_rcsi_test_${crypto.randomBytes(8).toString('hex')}`
const RCSI_NAME = /^hr_payroll_live_rcsi_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-live-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, accrual, queue, shift, win, created = false, sequence = 0, rcsi = null, rcsiCreated = false
const B = {}, U = {}, E = {}, D = {}

function assertDisposable() { assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system'); if (ds) assert.equal(ds.options.database, database) }
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)?.slice(0, 600)); return response.body }
const dates = (from, to) => { const out = []; for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) out.push(new Date(time).toISOString().slice(0, 10)); return out }
const isWorkday = date => ![5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())
const cents = value => Math.round(Number(value) * 100)
const rowOf = (preview, emp) => preview.rows.find(row => row.employeeId === emp.id)

async function employee(branch, extra = {}) {
  const n = ++sequence
  // البصمة اليدوية بتتطابق برقم البصمة (fingerprintCode)، مش بالكود الوظيفي
  const emp = await repo('Employee').save({ employeeCode: `LV${String(n).padStart(3, '0')}`, fingerprintCode: `LV${String(n).padStart(3, '0')}`, fullName: `موظف الراتب الحي ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 1500, transportAllowance: 600, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
  const weeks = new Set(dates(win.startDate, win.today).map(date => { const day = new Date(`${date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() - day.getUTCDay()); return day.toISOString().slice(0, 10) }))
  for (const weekStart of weeks) await repo('ScheduleEntry').save({ employeeId: emp.id, weekStart, shiftId: shift.id, shiftName: shift.name, startTime: '08:00', endTime: '16:00' })
  return emp
}
// بصمات خام: كل أيام الشغل في الفترة لحد امبارح، ما عدا أيام الغياب، والدخول 08:25 في أيام التأخير
async function punches(emp, { lateOn = [], absentOn = [] } = {}) {
  const rows = []
  for (const date of dates(win.startDate, win.upTo).filter(isWorkday)) {
    if (absentOn.includes(date)) continue
    rows.push({ employeeCode: emp.employeeCode, employeeId: emp.id, punchTime: new Date(`${date}T08:${lateOn.includes(date) ? '25' : '00'}:00`), deviceSn: 'LV', source: 'DEVICE' })
    rows.push({ employeeCode: emp.employeeCode, employeeId: emp.id, punchTime: new Date(`${date}T16:05:00`), deviceSn: 'LV', source: 'DEVICE' })
  }
  if (rows.length) await repo('AttendancePunch').save(rows)
}
const accrualSums = async emp => (await query(`SELECT COUNT(*) AS [days], SUM([earningsAmount]) AS [earnings], SUM([latenessAmount]) AS [lateness], SUM([shortfallAmount]) AS [shortfall],
    SUM([absenceAmount]) AS [absence], SUM([leaveAmount]) AS [unpaidLeave], SUM([suspensionAmount]) AS [suspension], SUM([overtimeAmount]) AS [overtime],
    SUM(CAST([isAbsent] AS int)) AS [absentDays], SUM(CAST([isDirty] AS int)) AS [dirtyDays]
  FROM [payroll_daily_accrual] WHERE [employeeId] = @0 AND [period] = @1 AND [date] >= @2 AND [date] <= @3`, [emp.id, win.period, win.startDate, win.upTo]))[0]

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
  accrual = app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService)
  queue = app.get(require('../src/queue/queue.service').QueueService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  const config = repo('RequestsConfig')
  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'], ['payroll.late_deduction_enabled', 'true'],
    ['attendance.absence_penalty_days', '1'], ['attendance.weekend_days', 'FRI,SAT'], ['attendance.grace_minutes', '0']]) {
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  // الإعدادين الجداد مبذورين بافتراضيهم
  assert.equal((await config.findOneByOrFail({ key: 'payroll.live_accrual_all' })).value, 'true')
  assert.equal((await config.findOneByOrFail({ key: 'payroll.approval.net_change_alert_percent' })).value, '20')
  win = await accrual.liveWindow()
  B.a = await repo('Branch').save({ code: 'LVA', name: 'فرع الراتب الحي أ' })
  B.b = await repo('Branch').save({ code: 'LVB', name: 'فرع الراتب الحي ب' })
  shift = await repo('Shift').save({ name: 'وردية الراتب الحي', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed' })
  const workdays = dates(win.startDate, win.upTo).filter(isWorkday)
  D.late = workdays[0] ?? null; D.absent = workdays[1] ?? null
  E.late = await employee(B.a); await punches(E.late, { lateOn: D.late ? [D.late] : [] })
  E.absent = await employee(B.a); await punches(E.absent, { absentOn: D.absent ? [D.absent] : [] })
  E.other = await employee(B.b); await punches(E.other)
  const user = (email, role, branch, permissions, employeeId = null) => repo('User').save({ email: `${email}@payroll-live.invalid`, displayName: email, passwordHash: 'test-only',
    role, branchId: branch?.id ?? null, employeeId, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin', 'super_admin', null, ['*'])
  U.readerA = await user('reader-a', 'employee', B.a, ['payroll.view'])
  U.calcA = await user('calc-a', 'employee', B.a, ['payroll.view', 'payroll.calculate'])
  U.self = await user('self', 'employee', B.a, [], E.absent.id)
  U.plain = await user('plain', 'employee', B.a, [])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (rcsi?.isInitialized) await rcsi.destroy() } catch (error) { errors.push(error) }
  try {
    if (rcsiCreated && master) {
      assert.match(rcsiDatabase, RCSI_NAME); assert.notEqual(rcsiDatabase, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${rcsiDatabase}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${rcsiDatabase}]`)
      const found = await master.request().input('database', sql.NVarChar, rcsiDatabase).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${rcsiDatabase} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
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
  if (errors.length) throw new AggregateError(errors, 'payroll live fixture cleanup failed')
})

test('LV-01: المعاينة قبل أي حساب — الموظفين ظاهرين و«لسه ماتحسبش»، بصلاحية الرواتب وبنطاق الفرع', async t => {
  t.diagnostic(JSON.stringify({ window: win, lateDay: D.late, absentDay: D.absent }))
  const all = ok(await request(U.admin, 'GET', '/payroll/live'))
  assert.deepEqual([all.available, all.period, all.startDate, all.upTo, all.estimated], [true, win.period, win.startDate, win.upTo, true])
  assert.match(all.note, /تقديري/)
  assert.deepEqual(all.rows.map(row => row.employeeId).sort((a, b) => a - b), [E.late.id, E.absent.id, E.other.id])
  for (const row of all.rows) assert.deepEqual([row.days, row.earned, row.deductions, row.estimatedNet, row.complete], [0, 0, 0, 0, false])
  assert.deepEqual(all.counts, { employees: 3, complete: 0, pending: 3 })
  // قارئ فرع أ: موظفي فرعه بس، وإجمالي فرعه بس
  const scoped = ok(await request(U.readerA, 'GET', '/payroll/live'))
  assert.deepEqual(scoped.rows.map(row => row.employeeId).sort((a, b) => a - b), [E.late.id, E.absent.id])
  assert.deepEqual(scoped.byBranch.map(group => group.branchId), [B.a.id])
  assert.equal(JSON.stringify(scoped).includes(B.b.name), false)
  // من غير صلاحية الرواتب 403، والقارئ من غير صلاحية الحساب مايحدّثش
  assert.equal((await request(U.plain, 'GET', '/payroll/live')).status, 403)
  assert.equal((await request(U.readerA, 'POST', '/payroll/live/refresh')).status, 403)
  // المعاينة للفترة الجارية بس: مفيش اختيار فترة (فترة قديمة أيامها ماتتحسبش تاني، فأرقامها تبقى مضللة)
  assert.equal(ok(await request(U.admin, 'GET', '/payroll/live?period=2020-01')).period, win.period)
})

test('LV-02: «حدّث الحساب» بنطاق الحساب — مجموع كل موظف = مجموع صفوف تراكمه بالقرش، والتأخير والغياب بمبالغهم، وإجمالي الفرع والعملة', async () => {
  const refreshed = ok(await request(U.calcA, 'POST', '/payroll/live/refresh'), 201)
  const totalDays = dates(win.startDate, win.upTo).length
  assert.deepEqual([refreshed.disabled, refreshed.employees, refreshed.computed], [false, 2, 2 * totalDays])
  const preview = refreshed.preview
  assert.deepEqual(preview.rows.map(row => row.employeeId).sort((a, b) => a - b), [E.late.id, E.absent.id])
  const gross = 9000 + 1500 + 600, dayRate = gross / 30
  for (const emp of [E.late, E.absent]) {
    const row = rowOf(preview, emp), sums = await accrualSums(emp)
    assert.deepEqual([row.days, row.dirtyDays, row.lastDate, row.complete], [totalDays, 0, win.upTo, true])
    assert.equal(Number(sums.days), totalDays)
    assert.equal(cents(row.earned), Math.min(cents(sums.earnings), cents(gross)))
    for (const key of ['lateness', 'shortfall', 'absence', 'unpaidLeave', 'suspension', 'overtime']) assert.equal(cents(row[key]), cents(sums[key]), `${emp.employeeCode} ${key}`)
    assert.equal(cents(row.deductions), cents(row.lateness) + cents(row.shortfall) + cents(row.absence) + cents(row.unpaidLeave) + cents(row.suspension))
    assert.equal(cents(row.estimatedNet), cents(row.earned) + cents(row.overtime) - cents(row.deductions))
  }
  const late = rowOf(preview, E.late), absent = rowOf(preview, E.absent)
  if (D.late) { assert.ok(late.lateness > 0, 'دخول 08:25 على وردية 08:00 = خصم تأخير'); assert.ok(late.lateMinutes >= 25) }
  if (D.absent) assert.deepEqual([absent.absentDays, cents(absent.absence)], [1, cents(dayRate)], 'يوم شغل من غير بصمة = يوم غياب بقيمة اليوم')
  // إجمالي الفرع والعملة = مجموع الصفوف
  const sum = key => preview.rows.reduce((total, row) => total + cents(row[key]), 0)
  assert.equal(preview.byBranch.length, 1)
  for (const key of ['earned', 'deductions', 'estimatedNet']) {
    assert.equal(cents(preview.byBranch[0].totals[key]), sum(key), key)
    assert.equal(preview.byCurrency.reduce((total, group) => total + cents(group.totals[key]), 0), sum(key), key)
  }
  // تحديث حساب فرع أ ماحسبش موظف فرع ب
  assert.equal(Number((await accrualSums(E.other)).days), 0)
  assert.deepEqual([rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.other).days], [0])
  // إعادة التحديث: كله جاهز، فمفيش موظف يتحسب له حاجة
  const again = ok(await request(U.calcA, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([again.employees, again.computed, again.reused, again.remaining], [0, 0, 0, 0])
  assert.deepEqual(again.preview.counts, { employees: 2, complete: 2, pending: 0 })
})

test('LV-03: مهمة الليل بتحسب للموظف اللي مالوش مسير مفتوح؛ الإعداد المقفول = موظفو المسيرات المفتوحة بس؛ وإعادة التشغيل مابتحسبش تاني', async () => {
  const totalDays = dates(win.startDate, win.upTo).length
  // مقفول: زي الأول — موظف فرع ب (من غير مسير) مابيتحسبش
  await repo('RequestsConfig').update({ key: 'payroll.live_accrual_all' }, { value: 'false' })
  const off = await accrual.accrueOpenRuns()
  assert.deepEqual([off.disabled, off.runs, off.employees, off.computed], [false, 0, 0, 0])
  assert.equal(Number((await accrualSums(E.other)).days), 0)
  // مفتوح (الافتراضي): الباقي النشطين كلهم
  await repo('RequestsConfig').update({ key: 'payroll.live_accrual_all' }, { value: 'true' })
  const on = await accrual.accrueOpenRuns()
  assert.deepEqual([on.disabled, on.employees, on.computed], [false, 3, totalDays], 'اللي اتحسب جديد أيام موظف فرع ب بس')
  const row = rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.other)
  assert.deepEqual([row.days, row.complete, cents(row.deductions)], [totalDays, true, 0])
  const [stored] = await query('SELECT COUNT(*) AS [n], SUM(CASE WHEN [runId] IS NULL THEN 1 ELSE 0 END) AS [withoutRun] FROM [payroll_daily_accrual] WHERE [employeeId] = @0', [E.other.id])
  assert.deepEqual([Number(stored.n), Number(stored.withoutRun)], [totalDays, totalDays], 'صفوف من غير مسير')
  const again = await accrual.accrueOpenRuns()
  assert.deepEqual([again.computed, again.reused], [0, 3 * totalDays])
  assert.deepEqual(ok(await request(U.admin, 'GET', '/payroll/live')).counts, { employees: 3, complete: 3, pending: 0 })
})

test('LV-04: يوم اتعلّم متسخ ← مهمة في الطابور ← اتنفذت ← المعاينة اتغيرت؛ والتعديلات المتتالية مهمة واحدة بوقت UTC صح', async t => {
  if (!D.late) { t.skip('الفترة الجارية لسه مفيهاش يوم شغل فات'); return }
  const { requestPayrollAccrualRefresh, PAYROLL_ACCRUAL_REFRESH_JOB } = require('../src/payroll/payroll-daily-accrual')
  const jobsOf = emp => query(`SELECT [id], [status], [idempotencyKey], DATEDIFF(second, SYSUTCDATETIME(), [runAfter]) AS [delay] FROM [jobs_queue]
    WHERE [jobType] = @0 AND JSON_VALUE([payload], '$.employeeId') = @1 ORDER BY [id]`, [PAYROLL_ACCRUAL_REFRESH_JOB, String(emp.id)])
  const before = rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.late)
  assert.ok(before.lateness > 0 && before.complete)
  assert.equal((await jobsOf(E.late)).length, 0)
  // تصحيح بصمة يوم التأخير (دخول 07:55): اليوم بيتعاد حسابه في الحضور، وصف تراكمه بيتعلّم متسخ، ومهمة بتتسجل في نفس العملية
  ok(await request(U.admin, 'POST', '/attendance/punches/manual', { punches: [{ employeeCode: E.late.employeeCode, timestamp: new Date(`${D.late}T07:55:00`).toISOString() }],
    reason: 'تصحيح بصمة دخول لاختبار الراتب الحي' }), 201)
  const jobs = await jobsOf(E.late)
  assert.equal(jobs.length, 1, 'مهمة واحدة للموظف')
  assert.equal(jobs[0].status, 'PENDING')
  assert.ok(Number(jobs[0].delay) >= 0 && Number(jobs[0].delay) <= 25, `وقت التنفيذ بعد آخر النافذة بثواني (UTC): ${jobs[0].delay}`)
  const stale = rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.late)
  assert.deepEqual([stale.dirtyDays, stale.complete], [1, false], 'المعاينة بتقول إن فيه يوم محتاج إعادة حساب')
  // العامل: المهمة بتتنفذ بعد وقتها
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [id] = @0`, [jobs[0].id])
  const cycle = await queue.runOnce()
  assert.ok(cycle.done >= 1, JSON.stringify(cycle))
  assert.equal((await jobsOf(E.late))[0].status, 'DONE')
  const fresh = rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.late)
  assert.deepEqual([cents(fresh.lateness), fresh.lateMinutes, fresh.dirtyDays, fresh.complete], [0, 0, 0, true], 'خصم التأخير اتشال من المعاينة')
  assert.ok(cents(fresh.estimatedNet) > cents(before.estimatedNet))
  // نفس الموظف في نفس النافذة = مهمة واحدة (المفتاح)؛ النافذة اللي بعدها مهمة جديدة؛ وموظف تاني مهمته لوحده
  const now = new Date(Date.now() + 3_600_000)
  assert.deepEqual([await requestPayrollAccrualRefresh(ds.manager, E.late.id, now), await requestPayrollAccrualRefresh(ds.manager, E.late.id, now),
    await requestPayrollAccrualRefresh(ds.manager, E.late.id, new Date(now.getTime() + 20_000)), await requestPayrollAccrualRefresh(ds.manager, E.absent.id, now)], [true, false, true, true])
  assert.equal((await jobsOf(E.late)).length, 3)
  // مهمة اتنفذت والأيام نضيفة: آمنة للتكرار ومابتحسبش حاجة
  assert.deepEqual(await accrual.refreshEmployee(E.late.id), { computed: 0, reused: 0 })
  assert.deepEqual(await accrual.refreshEmployee(0), { computed: 0, reused: 0 })
  // التراكم نفسه مايسجّلش مهام لنفسه: يوم نضيف اتغيّرت بصمته بيتعاد حسابه في «حدّث الحساب» من غير أي مهمة جديدة
  const jobsBefore = Number((await query('SELECT COUNT(*) AS [n] FROM [jobs_queue]'))[0].n)
  await query('UPDATE [payroll_daily_accrual] SET [inputsHash] = N\'stale\' WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1', [E.late.id, D.late])
  const recomputed = await accrual.refreshLive([E.late.id])
  assert.equal(recomputed.computed, 1)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [jobs_queue]'))[0].n), jobsBefore)
})

test('LV-05: «مستحقي التقديري» للموظف — الميزة مقفولة 404، ومفتوحة أرقامه هو بس ومطابقة لصف المعاينة', async () => {
  assert.equal((await request(U.self, 'GET', '/payroll/live/mine')).status, 404, 'الميزة الفرعية مقفولة افتراضيًا')
  ok(await request(U.admin, 'PUT', '/modules/features/payroll.live_employee_view', { enabled: true }))
  try {
    const mine = ok(await request(U.self, 'GET', '/payroll/live/mine'))
    const row = rowOf(ok(await request(U.admin, 'GET', '/payroll/live')), E.absent)
    assert.deepEqual([mine.available, mine.period, mine.upTo, mine.estimated], [true, win.period, win.upTo, true])
    assert.match(mine.note, /تقديري، والنهائي في القسيمة بعد الاعتماد/)
    for (const key of ['days', 'earned', 'overtime', 'lateness', 'shortfall', 'absence', 'unpaidLeave', 'suspension', 'deductions', 'estimatedNet', 'complete']) {
      assert.deepEqual(mine.summary[key], row[key], key)
    }
    if (D.absent) {
      assert.deepEqual(mine.days.map(day => [day.date, cents(day.absence)]), [[D.absent, cents((9000 + 1500 + 600) / 30)]], 'الأيام اللي عليها خصم أو إضافي بس')
    }
    // مفيش أي موظف تاني في الرد
    const text = JSON.stringify(mine)
    assert.equal(text.includes(E.late.fullName) || text.includes(E.late.employeeCode), false)
    // حساب مش مربوط بموظف: 404
    assert.equal((await request(U.readerA, 'GET', '/payroll/live/mine')).status, 404)
  } finally { ok(await request(U.admin, 'PUT', '/modules/features/payroll.live_employee_view', { enabled: false })) }
  assert.equal((await request(U.self, 'GET', '/payroll/live/mine')).status, 404)
})

test('LV-06: المهمة مابتعيدش حساب يوم مقفول — صف مسيره معتمد أو مصروف، أو من غير مسير مفتوح والموظف ليه في فترته مسير عادي معتمد؛ والمفتوح والملغى والتكميلي بيتعادوا', async t => {
  if (!D.late) { t.skip('الفترة الجارية لسه مفيهاش يوم شغل فات'); return }
  // صفوف موظف فرع ب اتحسبت من غير مسير (LV-03). مسير مزروع (صف المسير وبند الموظف) من غير حساب: الحالة عن القراءة بس
  const dirtyDays = async () => Number((await accrualSums(E.other)).dirtyDays)
  const mark = () => query(`UPDATE [payroll_daily_accrual] SET [isDirty] = 1, [dirtyReason] = N'اختبار اليوم المقفول', [dirtyAt] = SYSUTCDATETIME()
    WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1`, [E.other.id, D.late])
  const stamp = runId => query('UPDATE [payroll_daily_accrual] SET [runId] = @1 WHERE [employeeId] = @0', [E.other.id, runId])
  const run = await repo('PayrollRun').save({ name: 'مسير الراتب الحي المزروع', period: win.period, startDate: win.startDate, endDate: win.endDate, branchId: B.b.id, scopeType: 'BRANCH',
    runType: 'REGULAR', status: 'APPROVED', totalNet: 11100, approvedAt: new Date() })
  await repo('PayrollItem').save({ runId: run.id, employeeId: E.other.id, basicSalary: 9000, netPay: 11100, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })
  const status = (value, runType = 'REGULAR') => repo('PayrollRun').update({ id: run.id }, { status: value, runType })
  const closed = { computed: 0, reused: 0 }, redone = { computed: 1, reused: 0 }
  await mark()
  // (أ) صف من غير مسير + مسير عادي معتمد أو مصروف للموظف في الفترة: مقفول
  for (const value of ['APPROVED', 'PAID']) {
    await status(value)
    assert.deepEqual(await accrual.refreshEmployee(E.other.id), closed, value)
    assert.equal(await dirtyDays(), 1, `${value}: اليوم فضل زي ما هو`)
  }
  // مسير تكميلي معتمد مابيقفلش أيام الفترة (المسير الأصلي هو اللي بيقفلها)، والملغى كمان
  await status('APPROVED', 'SUPPLEMENTARY')
  assert.deepEqual(await accrual.refreshEmployee(E.other.id), redone)
  assert.equal(await dirtyDays(), 0)
  await mark(); await status('CANCELLED')
  assert.deepEqual(await accrual.refreshEmployee(E.other.id), redone)
  // (ب) صف مسيره هو: المفتوح (مسودة أو محسوب) بيتعاد، والمعتمد والمصروف لأ
  await stamp(run.id)
  for (const value of ['DRAFT', 'CALCULATED']) {
    await mark(); await status(value)
    assert.deepEqual(await accrual.refreshEmployee(E.other.id), redone, value)
    assert.equal(await dirtyDays(), 0)
  }
  await mark()
  for (const value of ['APPROVED', 'PAID']) {
    await status(value)
    assert.deepEqual(await accrual.refreshEmployee(E.other.id), closed, value)
    assert.equal(await dirtyDays(), 1)
  }
  // مسير الصف اتلغى: الصف بيرجع زي اللي من غير مسير — بيتعاد (وإلا كان هيفضل متسخ لحد مهمة الليل)
  await status('CANCELLED')
  assert.deepEqual(await accrual.refreshEmployee(E.other.id), redone)
  assert.equal(await dirtyDays(), 0)
  await mark(); await status('PAID')
  // مهمة الطابور نفسها على يوم مقفول: بتخلص «تمت» من غير حساب (مابتفشلش ومابتتعادش)
  const { requestPayrollAccrualRefresh, PAYROLL_ACCRUAL_REFRESH_JOB } = require('../src/payroll/payroll-daily-accrual')
  assert.equal(await requestPayrollAccrualRefresh(ds.manager, E.other.id, new Date(Date.now() + 7_200_000)), true)
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = @0 AND [status] = N'PENDING'`, [PAYROLL_ACCRUAL_REFRESH_JOB])
  await queue.runOnce()
  const left = await query(`SELECT COUNT(*) AS [n] FROM [jobs_queue] WHERE [jobType] = @0 AND JSON_VALUE([payload], '$.employeeId') = @1 AND [status] <> N'DONE'`, [PAYROLL_ACCRUAL_REFRESH_JOB, String(E.other.id)])
  assert.equal(Number(left[0].n), 0)
  assert.equal(await dirtyDays(), 1)
})

test('LV-07: سباق معاملتين على نفس مفتاح المهمة — التانية بتستنى وبترجع false ومعاملتها سليمة، بالعزل الافتراضي وبـRCSI (الفهرس الفريد هو الحكم)', async t => {
  const { enqueueQueueJob } = require('../src/queue/outbox')
  // المعاملة الأولى سجّلت المهمة ولسه ماخلصتش، والتانية (زي معاملة حضور أو طلب تانية لنفس الموظف) بتسجّل نفس المفتاح
  const race = async (source, label) => {
    const key = `race:${label}:${crypto.randomUUID()}`, other = `${key}:after`
    const first = source.createQueryRunner(), second = source.createQueryRunner()
    await first.connect(); await second.connect()
    try {
      await first.startTransaction(); await second.startTransaction()
      assert.equal(await enqueueQueueJob(first.manager, { jobType: 'race.test', key, lockFree: true }), true)
      let settled = false
      const pending = enqueueQueueJob(second.manager, { jobType: 'race.test', key, lockFree: true }).then(value => { settled = true; return value })
      await new Promise(resolve => setTimeout(resolve, 500))
      assert.equal(settled, false, `${label}: التانية مستنية الأولى (صف المفتاح مقفول)`)
      await first.commitTransaction()
      assert.equal(await pending, false, `${label}: المفتاح موجود = مفيش صف تاني ومن غير خطأ`)
      // معاملة التانية لسه سليمة بعد المفتاح المكرر: بتكتب وبتتأكد
      assert.equal(await enqueueQueueJob(second.manager, { jobType: 'race.test', key: other, lockFree: true }), true)
      await second.commitTransaction()
      const rows = await source.query('SELECT [idempotencyKey] FROM [jobs_queue] WHERE [idempotencyKey] IN (@0, @1) ORDER BY [idempotencyKey]', [key, other])
      assert.deepEqual(rows.map(row => row.idempotencyKey), [key, other])
    } finally {
      for (const runner of [first, second]) {
        if (runner.isTransactionActive) await runner.rollbackTransaction().catch(() => undefined)
        await runner.release()
      }
    }
  }
  const isolation = async source => Number((await source.query('SELECT [is_read_committed_snapshot_on] AS [on] FROM sys.databases WHERE [name] = DB_NAME()'))[0].on)
  // (أ) قاعدة الاختبار بعزلها الافتراضي: فحص «مش موجود» نفسه بيستنى الصف المقفول
  assert.equal(await isolation(ds), 0)
  await race(ds, 'locking')
  // (ب) RCSI: الفحص مابيشوفش الصف اللي لسه ماتأكدش، فالإدخال بيوصل للفهرس الفريد وبيترفض (2601) — برضه false ومن غير ما المعاملة تبوظ
  assert.match(rcsiDatabase, RCSI_NAME); assert.notEqual(rcsiDatabase, env.DB_DATABASE)
  await master.request().query(`CREATE DATABASE [${rcsiDatabase}]`); rcsiCreated = true
  await master.request().query(`ALTER DATABASE [${rcsiDatabase}] SET READ_COMMITTED_SNAPSHOT ON`)
  const { OutboxEvent, QueueJob } = require('../src/queue/queue.entities')
  rcsi = new (require('../node_modules/typeorm').DataSource)({ type: 'mssql', host: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), username: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: rcsiDatabase, entities: [OutboxEvent, QueueJob], synchronize: true, options: { encrypt: false, trustServerCertificate: true } })
  await rcsi.initialize()
  assert.equal(rcsi.options.database, rcsiDatabase)
  assert.equal(await isolation(rcsi), 1)
  await race(rcsi, 'rcsi')
  t.diagnostic('lock-free enqueue: duplicate key under locking read committed and under RCSI returns false and leaves the second transaction usable')
})

test('LV-08: «حدّث الحساب» بميزانية وقت — كل طلب بيحسب اللي يلحقه ويقول الباقي، وبيحسب الناقصين بس، والتقدّم مضمون', async () => {
  // فرع تالت بحساب نطاقه الفرع ده بس، فالعدّ مايتأثرش بموظفي الاختبارات اللي فاتت
  const branch = await repo('Branch').save({ code: 'LVC', name: 'فرع الراتب الحي ج' })
  const calc = await repo('User').save({ email: 'calc-c@payroll-live.invalid', displayName: 'calc-c', passwordHash: 'test-only', role: 'employee', branchId: branch.id,
    employeeId: null, permissions: JSON.stringify(['payroll.view', 'payroll.calculate']) })
  const one = await employee(branch), two = await employee(branch), three = await employee(branch)
  for (const emp of [one, two, three]) await punches(emp)
  // موظف تعيينه النهارده: مفيش عليه أيام لحد امبارح، فمش «محتاج حساب»
  const hiredToday = await employee(branch, { joinDate: win.today })
  const totalDays = dates(win.startDate, win.upTo).length
  const before = ok(await request(calc, 'GET', '/payroll/live'))
  assert.deepEqual(before.counts, { employees: 4, complete: 1, pending: 3 })
  assert.equal(rowOf(before, hiredToday).complete, true)
  // ميزانية صفر: موظف واحد في الطلب (تقدّم مضمون) والباقي متعدّد
  const first = await accrual.refreshLive([one.id, two.id, three.id], { budgetMs: 0 })
  assert.deepEqual([first.disabled, first.employees, first.computed, first.reused, first.remaining], [false, 1, totalDays, 0, 2])
  assert.deepEqual(ok(await request(calc, 'GET', '/payroll/live')).counts, { employees: 4, complete: 2, pending: 2 })
  // الزرار: الناقصين بس (الاتنين الباقيين)، والجاهز مابيتعادش
  const rest = ok(await request(calc, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([rest.disabled, rest.employees, rest.computed, rest.reused, rest.remaining], [false, 2, 2 * totalDays, 0, 0])
  assert.deepEqual(rest.preview.counts, { employees: 4, complete: 4, pending: 0 })
  const idle = ok(await request(calc, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([idle.employees, idle.computed, idle.reused, idle.remaining], [0, 0, 0, 0])
  // من غير ميزانية (مهمة الليل والاختبارات): الكل في مرة واحدة
  const all = await accrual.refreshLive([one.id, two.id, three.id])
  assert.deepEqual([all.employees, all.computed, all.reused, all.remaining], [3, 0, 3 * totalDays, 0])
})

test('LV-09: موديول الرواتب مقفول = مهمة إعادة الحساب مابتحسبش (زي مهمة الليل)، ولما يتفتح اليوم بيتحسب', async t => {
  if (!D.late) { t.skip('الفترة الجارية لسه مفيهاش يوم شغل فات'); return }
  const { requestPayrollAccrualRefresh, PAYROLL_ACCRUAL_REFRESH_JOB } = require('../src/payroll/payroll-daily-accrual')
  const modules = app.get(require('../src/modules-registry/modules.service').ModulesService), original = modules.jobEnabled
  const dirtyDays = async () => Number((await accrualSums(E.late)).dirtyDays)
  const runJob = async at => {
    assert.equal(await requestPayrollAccrualRefresh(ds.manager, E.late.id, at), true)
    await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = @0 AND [status] = N'PENDING'`, [PAYROLL_ACCRUAL_REFRESH_JOB])
    await queue.runOnce()
    const [left] = await query(`SELECT COUNT(*) AS [n] FROM [jobs_queue] WHERE [jobType] = @0 AND [status] <> N'DONE'`, [PAYROLL_ACCRUAL_REFRESH_JOB])
    assert.equal(Number(left.n), 0, 'المهمة خلصت')
  }
  await query(`UPDATE [payroll_daily_accrual] SET [isDirty] = 1, [dirtyReason] = N'اختبار قفل الموديول', [dirtyAt] = SYSUTCDATETIME()
    WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1`, [E.late.id, D.late])
  assert.equal(await dirtyDays(), 1)
  // مقفول (نفس سؤال مهمة الليل للسجل: payroll.daily-accrual): المهمة بتخلص من غير حساب
  modules.jobEnabled = async job => job === 'payroll.daily-accrual' ? false : original.call(modules, job)
  try {
    await runJob(new Date(Date.now() + 10_800_000))
    assert.equal(await dirtyDays(), 1, 'اليوم فضل متسخ')
  } finally { modules.jobEnabled = original }
  // مفتوح: مهمة جديدة بتحسبه
  await runJob(new Date(Date.now() + 14_400_000))
  assert.equal(await dirtyDays(), 0)
})

// فرع جديد بموظف ببصماته وحساب بالصلاحيات دي (الاختبارات اللي تحت مستقلة عن اللي فوق)
async function isolated(code, permissions, extra = {}) {
  const branch = await repo('Branch').save({ code, name: `فرع الراتب الحي ${code}` })
  const emp = await employee(branch, extra)
  await punches(emp)
  const user = await repo('User').save({ email: `${code.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}@payroll-live.invalid`, displayName: code, passwordHash: 'test-only', role: 'employee',
    branchId: branch.id, employeeId: null, permissions: JSON.stringify(permissions) })
  return { branch, emp, user }
}
const accrualRows = emp => query('SELECT * FROM [payroll_daily_accrual] WHERE [employeeId] = @0 AND [period] = @1 ORDER BY [date]', [emp.id, win.period])
const markDirty = (emp, date) => query(`UPDATE [payroll_daily_accrual] SET [isDirty] = 1, [dirtyReason] = N'اختبار', [dirtyAt] = SYSUTCDATETIME()
  WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1`, [emp.id, date])

test('LV-10 (CRP2B-C-B01): صلاحية الحساب من غير صلاحية العرض — «حدّث الحساب» بيحسب وبيرجّع أعداد بس، من غير أسماء ولا مبالغ', async () => {
  const { branch, emp, user } = await isolated('LVD', ['payroll.calculate'])
  const totalDays = dates(win.startDate, win.upTo).length
  assert.equal((await request(user, 'GET', '/payroll/live')).status, 403)
  const refreshed = await request(user, 'POST', '/payroll/live/refresh')
  assert.equal(refreshed.status, 201)
  // الحساب اتعمل فعلًا، والرد أعداد بس
  assert.deepEqual(refreshed.body, { employees: 1, computed: totalDays, reused: 0, disabled: false, remaining: 0, preview: null })
  const text = JSON.stringify(refreshed.body)
  for (const hidden of [emp.fullName, emp.employeeCode, branch.name, 'earned', 'estimatedNet', '11100', '370']) assert.equal(text.includes(hidden), false, hidden)
  // قارئ الرواتب في نفس الفرع بيشوف اللي اتحسب، وبياخد المعاينة في رد التحديث
  const viewer = await repo('User').save({ email: `lvd-view-${crypto.randomUUID().slice(0, 6)}@payroll-live.invalid`, displayName: 'lvd-view', passwordHash: 'test-only', role: 'employee',
    branchId: branch.id, employeeId: null, permissions: JSON.stringify(['payroll.view', 'payroll.calculate']) })
  const seen = ok(await request(viewer, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([seen.computed, seen.preview.rows.map(row => [row.employeeId, row.days, row.complete])], [0, [[emp.id, totalDays, true]]])
  // من غير أي صلاحية رواتب: 403 في الاتنين
  assert.equal((await request(U.plain, 'POST', '/payroll/live/refresh')).status, 403)
})

test('LV-11 (CRP2B-C-B03): «مكتمل» = كل أيام الفترة المطلوبة موجودة — آخر يوم لوحده، ويوم ناقص في النص، وتاريخ التعيين', async t => {
  const totalDays = dates(win.startDate, win.upTo).length
  if (totalDays < 3) { t.skip('الفترة الجارية أقصر من 3 أيام'); return }
  const { emp, user } = await isolated('LVE', ['payroll.view', 'payroll.calculate'])
  // حالة المراجعة بالحرف: آخر يوم بس اتحسب (بنفس دالة التراكم)
  const one = await ds.transaction(em => accrual.accrueEmployeeRange(em, { employeeId: emp.id, period: win.period, runId: null, from: win.upTo, to: win.upTo, today: win.today }))
  assert.equal(one.computed, 1)
  const partial = ok(await request(user, 'GET', '/payroll/live'))
  const row = rowOf(partial, emp)
  assert.deepEqual([row.days, row.lastDate, row.dirtyDays, row.missingDays, row.complete], [1, win.upTo, 0, totalDays - 1, false])
  assert.deepEqual(partial.counts, { employees: 1, complete: 0, pending: 1 })
  // «حدّث الحساب» بيكمّل الناقص بس
  const filled = ok(await request(user, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([filled.employees, filled.computed, filled.reused, filled.remaining], [1, totalDays - 1, 1, 0])
  assert.deepEqual([rowOf(filled.preview, emp).days, rowOf(filled.preview, emp).missingDays, rowOf(filled.preview, emp).complete], [totalDays, 0, true])
  assert.equal(cents(rowOf(filled.preview, emp).earned), Math.min(totalDays * 37000, 1110000), 'استحقاق كل الأيام')
  // يوم ناقص في نص الفترة (أول يوم وآخر يوم موجودين)
  const middle = dates(win.startDate, win.upTo)[1]
  await query('DELETE FROM [payroll_daily_accrual] WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1', [emp.id, middle])
  const hole = rowOf(ok(await request(user, 'GET', '/payroll/live')), emp)
  assert.deepEqual([hole.days, hole.lastDate, hole.missingDays, hole.complete], [totalDays - 1, win.upTo, 1, false])
  assert.equal(ok(await request(user, 'POST', '/payroll/live/refresh'), 201).computed, 1)
  assert.equal(rowOf(ok(await request(user, 'GET', '/payroll/live')), emp).complete, true)
  // موظف تعيينه جوه الفترة: المطلوب من يوم تعيينه بس
  const hireDate = dates(win.startDate, win.upTo)[2]
  const late = await isolated('LVF', ['payroll.view', 'payroll.calculate'], { joinDate: hireDate })
  const before = rowOf(ok(await request(late.user, 'GET', '/payroll/live')), late.emp)
  assert.deepEqual([before.days, before.missingDays, before.complete], [0, totalDays - 2, false])
  const hired = ok(await request(late.user, 'POST', '/payroll/live/refresh'), 201)
  assert.deepEqual([hired.computed, rowOf(hired.preview, late.emp).days, rowOf(hired.preview, late.emp).missingDays, rowOf(hired.preview, late.emp).complete], [totalDays - 2, totalDays - 2, 0, true])
  // كارت الموظف نفسه بنفس الحكم
  const self = await repo('User').save({ email: `lve-self-${crypto.randomUUID().slice(0, 6)}@payroll-live.invalid`, displayName: 'lve-self', passwordHash: 'test-only', role: 'employee',
    branchId: emp.branchId, employeeId: emp.id, permissions: '[]' })
  ok(await request(U.admin, 'PUT', '/modules/features/payroll.live_employee_view', { enabled: true }))
  try {
    await query('DELETE FROM [payroll_daily_accrual] WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1', [emp.id, middle])
    assert.equal(ok(await request(self, 'GET', '/payroll/live/mine')).summary.complete, false)
  } finally { ok(await request(U.admin, 'PUT', '/modules/features/payroll.live_employee_view', { enabled: false })) }
})

test('LV-12 (CRP2B-C-B02): الإقفال بيتفحص جوه المعاملة تحت قفل الموظف المالي — مسير اتعتمد بين الاختيار والكتابة مابيتكتبش على أيامه', async t => {
  if (!D.late) { t.skip('الفترة الجارية لسه مفيهاش يوم شغل فات'); return }
  const { branch, emp } = await isolated('LVG', [])
  assert.equal((await accrual.refreshLive([emp.id])).computed, dates(win.startDate, win.upTo).length)
  const original = accrual.accrueEmployeeRange
  // حاجز بين اختيار اليوم وكتابته: الحدث ده بيحصل (ومتأكَّد عليه) قبل ما دالة التراكم تكمّل
  const between = async (event, work) => {
    let fired = 0
    accrual.accrueEmployeeRange = async function (em, input) { if (input.employeeId === emp.id && !fired++) await event(); return original.call(this, em, input) }
    try { return [await work(), fired] } finally { accrual.accrueEmployeeRange = original }
  }
  // (أ) صف من غير مسير: مسير عادي للموظف في الفترة اتعتمد بعد اختيار اليوم، وراتب الملف اتغيّر
  await markDirty(emp, D.late)
  let run
  const beforeNoRun = await accrualRows(emp)
  const [noRun, firedNoRun] = await between(async () => {
    run = await repo('PayrollRun').save({ name: 'مسير اعتمد وسط التحديث', period: win.period, startDate: win.startDate, endDate: win.endDate, branchId: branch.id, scopeType: 'CUSTOM',
      employeeIds: JSON.stringify([emp.id]), runType: 'REGULAR', status: 'APPROVED', totalNet: 11100, approvedAt: new Date() })
    await repo('PayrollItem').save({ runId: run.id, employeeId: emp.id, basicSalary: 9000, netPay: 11100, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })
    await repo('Employee').update({ id: emp.id }, { basicSalary: 12000 })
  }, () => accrual.refreshEmployee(emp.id))
  assert.equal(firedNoRun, 1, 'اليوم اتاختار قبل الاعتماد')
  assert.deepEqual(noRun, { computed: 0, reused: 0 })
  assert.deepEqual(await accrualRows(emp), beforeNoRun, 'صفوف الفترة المعتمدة زي ما هي بالحرف (ولسه اليوم متعلّم)')
  // (ب) صف مسيره هو: المسير كان مفتوح وقت الاختيار واتعتمد قبل الكتابة — من مهمة إعادة الحساب، ومن تراكم المسير نفسه
  await repo('PayrollRun').update({ id: run.id }, { status: 'CALCULATED', approvedAt: null })
  await query('UPDATE [payroll_daily_accrual] SET [runId] = @1 WHERE [employeeId] = @0 AND [period] = @2', [emp.id, run.id, win.period])
  const beforeOwn = await accrualRows(emp)
  for (const work of [() => accrual.refreshEmployee(emp.id), () => accrual.accrueRun(run.id)]) {
    await repo('PayrollRun').update({ id: run.id }, { status: 'CALCULATED', approvedAt: null })
    const [, fired] = await between(() => repo('PayrollRun').update({ id: run.id }, { status: 'APPROVED', approvedAt: new Date() }), work)
    assert.equal(fired, 1)
    assert.deepEqual(await accrualRows(emp), beforeOwn, 'صفوف المسير المعتمد زي ما هي')
  }
  // الضابط: نفس اليوم والمسير لسه مفتوح = بيتحسب براتب الملف الجديد
  await repo('PayrollRun').update({ id: run.id }, { status: 'CALCULATED', approvedAt: null })
  assert.deepEqual(await accrual.refreshEmployee(emp.id), { computed: 1, reused: 0 })
  const [after] = await query('SELECT [isDirty], [earningsAmount] FROM [payroll_daily_accrual] WHERE [employeeId] = @0 AND [period] = @1 AND CONVERT(varchar(10), [date], 23) = @2', [emp.id, win.period, D.late])
  assert.equal(after.isDirty, false)
  assert.equal(cents(after.earningsAmount), cents((12000 + 1500 + 600) / 30), 'اتحسب براتب الملف الحالي')
  // (ج) نفس قفل الاعتماد: عملية مالية ماسكة قفل الموظف = التراكم بيستنى لحد ما تخلص
  await markDirty(emp, D.late)
  const holder = ds.createQueryRunner()
  await holder.connect(); await holder.startTransaction()
  let settled = false
  try {
    const [lock] = await holder.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
      SELECT @result AS [lockResult];`, [`hr:employee-finance:${emp.id}`])
    assert.ok(Number(lock.lockResult) >= 0)
    const pending = accrual.refreshEmployee(emp.id).then(value => { settled = true; return value })
    await new Promise(resolve => setTimeout(resolve, 700))
    assert.equal(settled, false, 'التراكم مستني قفل الموظف المالي')
    await holder.commitTransaction()
    assert.deepEqual(await pending, { computed: 1, reused: 0 })
    // عملية مالية طويلة (ماسكة القفل أكتر من مهلة شغل الخلفية): مهمة إعادة الحساب بتفشل بسرعة عشان الطابور يعيدها، و«حدّث الحساب»
    // بيتخطّى الموظف من غير ما يقف — واليوم بيفضل متعلّم لحد ما العملية تخلص
    await markDirty(emp, D.late)
    await holder.startTransaction()
    await holder.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
      SELECT @result AS [lockResult];`, [`hr:employee-finance:${emp.id}`])
    const started = Date.now()
    await assert.rejects(accrual.refreshEmployee(emp.id), /عملية مالية جارية/)
    const skipped = await accrual.refreshLive([emp.id])
    assert.deepEqual([skipped.employees, skipped.computed, skipped.remaining], [0, 0, 0])
    assert.ok(Date.now() - started < 9000, `شغل الخلفية مااستناش مهلة العمليات المالية الكاملة: ${Date.now() - started} مللي`)
    assert.equal(Number((await accrualSums(emp)).dirtyDays), 1)
    await holder.commitTransaction()
    assert.deepEqual(await accrual.refreshEmployee(emp.id), { computed: 1, reused: 0 })
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction().catch(() => undefined)
    await holder.release()
  }
})
