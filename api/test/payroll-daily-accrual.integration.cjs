// تراكم المسير يومًا بيوم (قرار المالك 20 سبتمبر): الإثبات الأساسي هنا هو أن النتيجة
// واحدة بالحرف — مسير محسوب من الأيام المتراكمة = مسير محسوب من الصفر، بند ببند.
// كل شيء في قاعدة بيانات عشوائية تُنشأ وتُحذف هنا؛ لا كتابة على قاعدة الإنتاج.
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
const database = `hr_payroll_accrual_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-accrual-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07'
const startDate = '2026-06-23'
const endDate = '2026-07-22'
let app, master, ds, base, admin, branch, shift, accrual, created = false, employeeNumber = 0
const repo = name => ds.getRepository(name)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: ['*'] })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function dates(from, to) {
  const out = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    out.push(new Date(time).toISOString().slice(0, 10))
  }
  return out
}
const isWorkday = date => ![5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay())

async function employee(overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `ACR${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف اختبار التراكم ${employeeNumber}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 1500, transportAllowance: 600, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  const weeks = new Set(dates(startDate, endDate).map(date => {
    const day = new Date(`${date}T12:00:00Z`)
    day.setUTCDate(day.getUTCDate() - day.getUTCDay())
    return day.toISOString().slice(0, 10)
  }))
  for (const weekStart of weeks) {
    await repo('ScheduleEntry').save({ employeeId: emp.id, weekStart, shiftId: shift.id, shiftName: shift.name, startTime: '08:00', endTime: '16:00' })
  }
  return emp
}
// بصمات خام حقيقية: محرك الحضور هو اللي يصنّف اليوم، مش الاختبار
async function punches(emp, workDates, lateOn = new Set()) {
  const rows = []
  for (const date of workDates) {
    const minute = lateOn.has(date) ? '25' : '00'
    rows.push({ employeeCode: emp.employeeCode, employeeId: emp.id, punchTime: new Date(`${date}T08:${minute}:00`), deviceSn: 'ACR', source: 'DEVICE' })
    rows.push({ employeeCode: emp.employeeCode, employeeId: emp.id, punchTime: new Date(`${date}T16:05:00`), deviceSn: 'ACR', source: 'DEVICE' })
  }
  if (rows.length) await repo('AttendancePunch').save(rows)
}
let runNumber = 0
async function calculate(employees, extra = {}) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
    ...(extra.runId ? {} : { name: `اختبار التراكم — قاعدة مؤقتة ${++runNumber}` }), ...extra,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
// بصمة المسير للمقارنة: كل بند بكل أعمدته وتفصيله، بلا المعرّفات المتغيرة بين نسخ الحساب
const VOLATILE = new Set(['id', 'runId', 'capturedAt'])
function fingerprint(run) {
  const strip = value => {
    if (Array.isArray(value)) return value.map(strip)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).filter(([key]) => !VOLATILE.has(key)).map(([key, item]) => [key, strip(item)]))
    }
    return value
  }
  return JSON.stringify({
    totalNet: Number(run.totalNet),
    items: [...run.items].sort((a, b) => a.employeeId - b.employeeId).map(item => {
      const { id: _id, runId: _runId, breakdown, ...columns } = item
      return { ...strip(columns), breakdown: strip(JSON.parse(breakdown)) }
    }),
    members: [...(run.members ?? [])].sort((a, b) => a.employeeId - b.employeeId).map(member => {
      const { id: _id, runId: _runId, ...rest } = member
      return strip(rest)
    }),
  }, null, 1)
}
// «من الصفر»: نفضّي مخزن التراكم فيرجع الحساب يعيد كل يوم-موظف زي ما كان قبل التراكم
async function clearAccrual() {
  await ds.query('DELETE FROM [payroll_daily_accrual]')
}
const accrualRows = (employeeId) => ds.query(
  'SELECT CONVERT(varchar(10), [date], 23) AS [date], [isDirty], [inputsHash], [computedAt], [attendanceStatus], [lateMinutes] FROM [payroll_daily_accrual] WHERE [employeeId] = @0 ORDER BY [date]',
  [employeeId])

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_accrual_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  // الجداول الدورية (ومنها جار التراكم) ما تلمسش بيانات الاختبار وسط التأكيدات
  const scheduler = app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry)
  for (const job of scheduler.getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  accrual = app.get(require('../src/payroll/payroll-daily-accrual.service').PayrollDailyAccrualService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'اختبار التراكم اليومي', code: 'ACCRUAL' })
  shift = await repo('Shift').save({ name: 'وردية التراكم', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed' })
  admin = await repo('User').save({ email: 'admin@payroll-accrual.invalid', displayName: 'تراكم',
    passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_accrual_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0, 'Temporary fixture database must actually be removed')
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false, 'Temporary uploads must actually be removed')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll accrual fixture cleanup failed')
})

test('ACR-01: المسير المحسوب من الأيام المتراكمة يطابق المحسوب من الصفر بندًا ببند', async t => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const present = await employee()
  const late = await employee()
  const absent = await employee()
  await punches(present, workDates)
  await punches(late, workDates, new Set([workDates[3], workDates[9], workDates[14]]))
  // موظف بغياب حقيقي: أيام عمل بلا بصمة يجسّدها محرك الحضور غيابًا
  await punches(absent, workDates.filter(date => ![workDates[5], workDates[11]].includes(date)))
  const employees = [present, late, absent]

  // (1) من الصفر: مخزن التراكم فاضي، فكل يوم-موظف بيتحسب زي المسار القديم بالضبط
  await clearAccrual()
  const cold = await calculate(employees)
  const coldPrint = fingerprint(cold)
  assert.equal(cold.items.length, 3)
  assert.ok(Number(cold.items.find(item => item.employeeId === late.id).latenessDeduction) > 0, 'التأخير لازم يتخصم')
  assert.ok(Number(cold.items.find(item => item.employeeId === absent.id).absenceDays) >= 2, 'الغياب لازم يتجسّد')

  // (2) الأيام اتخزنت متراكمة ونضيفة
  const rows = await accrualRows(present.id)
  assert.equal(rows.length, dates(startDate, endDate).length, 'كل يوم في الفترة له صف تراكم')
  assert.equal(rows.filter(row => row.isDirty).length, 0, 'مافيش يوم متسخ بعد الحساب')
  assert.ok(rows.every(row => row.computedAt && row.inputsHash), 'كل يوم له وقت حساب وبصمة مدخلات')

  // (3) إعادة حساب من التراكم: كل الأيام نضيفة فبتتقرا بدل ما تتحسب — والنتيجة واحدة بالحرف
  const warm = await calculate(employees, { runId: cold.id, reason: 'إعادة حساب من الأيام المتراكمة' })
  assert.equal(fingerprint(warm), coldPrint, 'المسير من التراكم لازم يطابق المسير من الصفر بالحرف')

  // (4) وتفضيل مخزن التراكم يرجّع نفس الأرقام كمان (إعادة حساب كاملة)
  await clearAccrual()
  const recold = await calculate(employees, { runId: cold.id, reason: 'إعادة حساب كاملة للمقارنة' })
  assert.equal(fingerprint(recold), coldPrint, 'إعادة الحساب الكاملة لازم تطابق الأولى')
  t.diagnostic('نفس totalNet ونفس كل بند وتفصيله في المسارين')
})

test('ACR-02: تغيير بأثر رجعي يعلّم يومه «متسخ» فقط، والنتيجة تفضل مطابقة لإعادة الحساب الكاملة', async () => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const emp = await employee()
  await punches(emp, workDates)
  await clearAccrual()
  const run = await calculate([emp])
  assert.equal((await accrualRows(emp.id)).filter(row => row.isDirty).length, 0)

  // تصحيح رجعي: بصمة دخول متأخرة في يوم فات — محرك الحضور بيعيد حساب اليوم
  const target = workDates[7]
  await repo('AttendancePunch').save({ employeeCode: emp.employeeCode, employeeId: emp.id,
    punchTime: new Date(`${target}T09:40:00`), deviceSn: 'ACR', source: 'MANUAL' })
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  await attendance.computeDay(emp.id, target)

  const dirty = (await accrualRows(emp.id)).filter(row => row.isDirty)
  assert.deepEqual(dirty.map(row => row.date), [target], 'اليوم المتأثر وحده يتعلّم متسخ')

  // إعادة الحساب بتعيد اليوم المتسخ بس — والنتيجة نفس إعادة الحساب الكاملة بالحرف
  const incremental = await calculate([emp], { runId: run.id, reason: 'إعادة حساب بعد تصحيح البصمة' })
  assert.equal((await accrualRows(emp.id)).filter(row => row.isDirty).length, 0, 'اليوم اتنضّف بعد ما اتحسب')
  await clearAccrual()
  const full = await calculate([emp], { runId: run.id, reason: 'إعادة حساب كاملة للمقارنة' })
  assert.equal(fingerprint(incremental), fingerprint(full), 'المسار التراكمي = المسار الكامل بعد التصحيح الرجعي')
})

test('ACR-03: بصمة المدخلات تمسك التغيير حتى لو محدش علّم اليوم متسخ', async () => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const emp = await employee()
  await punches(emp, workDates)
  await clearAccrual()
  const run = await calculate([emp])
  const target = workDates[4]
  // تعديل صف الحضور مباشرة وتنضيف العلامة يدويًا: البصمة المخزّنة بقت مختلفة
  await ds.query('UPDATE [attendance_days] SET [lateMinutes] = 33 WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1', [emp.id, target])
  await ds.query('UPDATE [payroll_daily_accrual] SET [isDirty] = 0 WHERE [employeeId] = @0', [emp.id])
  const after = await calculate([emp], { runId: run.id, reason: 'إعادة حساب بعد تغيير صامت' })
  const day = JSON.parse(after.items[0].breakdown).attendanceDeductions.days.find(row => row.date === target)
  assert.ok(day, 'اليوم موجود في تفصيل الخصم')
  const stored = (await accrualRows(emp.id)).find(row => row.date === target)
  assert.equal(stored.isDirty, false)
  assert.ok(stored.computedAt, 'اليوم اتعاد حسابه بسبب اختلاف بصمة المدخلات')
})

test('ACR-04: الجار الليلي آمن لإعادة التشغيل ولا يلمس مسيرًا معتمدًا', async () => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const emp = await employee()
  await punches(emp, workDates)
  await clearAccrual()
  const run = await calculate([emp])

  // تشغيلة أولى على نفس المسير: كل الأيام متراكمة نضيفة، فمفيش حساب جديد
  const first = await accrual.accrueRun(run.id)
  assert.equal(first.computed, 0, 'مافيش يوم اتحسب تاني — كله متراكم نضيف')
  assert.equal(first.reused, dates(startDate, endDate).length)
  // تشغيلة تانية فورًا: نفس النتيجة (idempotent)
  const second = await accrual.accrueRun(run.id)
  assert.deepEqual(second, first)

  // الجار الليلي: المسير المفتوح داخل، وبعد الاعتماد بيخرج (upTo يوم واحد عشان الاختبار خفيف)
  const openBefore = await accrual.accrueOpenRuns({ period, upTo: startDate })
  assert.equal(openBefore.disabled, false)
  assert.ok(openBefore.runs >= 1, 'المسير المفتوح دخل التشغيلة')
  await ds.query('UPDATE [payroll_runs] SET [status] = @1 WHERE [id] = @0', [run.id, 'APPROVED'])
  await assert.rejects(() => accrual.refreshDirty(run.id), /معتمد|مصروف|ملغى/)
  await assert.rejects(() => accrual.accrueRun(run.id), /معتمد|مصروف|ملغى/)
  const openAfter = await accrual.accrueOpenRuns({ period, upTo: startDate })
  assert.equal(openAfter.runs, openBefore.runs - 1, 'المسير المعتمد خرج من المسيرات المفتوحة')
  assert.equal((await accrual.status(run.id)).open, false)
  await ds.query('UPDATE [payroll_runs] SET [status] = @1 WHERE [id] = @0', [run.id, 'CALCULATED'])
})

test('ACR-06: مفتاح الإيقاف يرجّع الحساب لمساره القديم بنفس الأرقام بالحرف', async () => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const emp = await employee()
  await punches(emp, workDates, new Set([workDates[1], workDates[6]]))
  await clearAccrual()
  const withAccrual = await calculate([emp])
  // payroll.daily_accrual_enabled = false → كل يوم-موظف يتحسب من الأول زي قبل التراكم
  await repo('RequestsConfig').save({ key: 'payroll.daily_accrual_enabled', value: 'false' })
  const without = await calculate([emp], { runId: withAccrual.id, reason: 'إعادة حساب بمفتاح التراكم مقفول' })
  assert.equal(fingerprint(without), fingerprint(withAccrual), 'إيقاف التراكم ما يغيرش أي رقم')
  await repo('RequestsConfig').save({ key: 'payroll.daily_accrual_enabled', value: 'true' })
  const back = await calculate([emp], { runId: withAccrual.id, reason: 'إعادة حساب بعد فتح التراكم' })
  assert.equal(fingerprint(back), fingerprint(withAccrual), 'الرجوع للتراكم ما يغيرش أي رقم')
})

test('ACR-05: شاشة المسير تعرض «آخر يوم محسوب» وزرار «حدّث الحساب» يشتغل', async () => {
  const workDates = dates(startDate, endDate).filter(isWorkday)
  const emp = await employee()
  await punches(emp, workDates)
  await clearAccrual()
  const run = await calculate([emp])

  const status = await request(admin, 'GET', `/payroll/runs/${run.id}/accrual`)
  assert.equal(status.status, 200, JSON.stringify(status.body))
  assert.equal(status.body.runId, run.id)
  assert.equal(status.body.period, period)
  assert.equal(status.body.open, true)
  assert.equal(status.body.lastAccruedDate, endDate, 'آخر يوم محسوب = آخر يوم في الفترة')
  assert.equal(status.body.dirtyDays, 0)
  assert.equal(status.body.upToDate, true)

  // يوم اتوسّخ → الشاشة تقوله، والزرار ينضّفه
  await ds.query('UPDATE [payroll_daily_accrual] SET [isDirty] = 1 WHERE [employeeId] = @0 AND CONVERT(varchar(10), [date], 23) = @1', [emp.id, workDates[2]])
  const dirty = await request(admin, 'GET', `/payroll/runs/${run.id}/accrual`)
  assert.equal(dirty.body.dirtyDays, 1)
  assert.equal(dirty.body.upToDate, false)
  const refreshed = await request(admin, 'POST', `/payroll/runs/${run.id}/accrual/refresh`, {})
  assert.equal(refreshed.status, 201, JSON.stringify(refreshed.body))
  assert.equal(refreshed.body.computed, 1, 'اليوم المتسخ وحده هو اللي اتحسب')
  assert.equal(refreshed.body.accrual.dirtyDays, 0)
  assert.equal(refreshed.body.accrual.upToDate, true)
  assert.equal((await request(null, 'GET', `/payroll/runs/${run.id}/accrual`)).status, 401)
})
