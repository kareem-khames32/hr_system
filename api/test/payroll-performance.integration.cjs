'use strict'
// B1.12: اختبار أداء ثابت ببيانات 500 موظف (PERF_STAFF لتغيير العدد) على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر:
//  PF-01) الحساب ومجموعه اليدوي (500 × 7,800)، والاعتماد أقل من 30 ثانية (فحص لقطة الحضور بيعيد حساب الأيام اللي فاتت).
//  PF-02) رد تفاصيل المسير للشاشة (?view=screen) أقل من 2 ميجا وفيه اللي الشاشة بتقراه، والرد الكامل والقسيمة بالتفصيل كله.
//  PF-03) حدث «محسوب» من غير تفصيل البنود، وبصمة كل تفصيل مطابقة للمخزن.
//  PF-04) الحضور اليومي (النهارده، فيه حساب الغياب اللحظي) أقل من 3 ثواني.
// Run (من api/): node --test test/payroll-performance.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

const STAFF = Number(process.env.PERF_STAFF || 500)
const database = `hr_payroll_perf_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-perf-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// شهر فات بالكامل: الاعتماد بيعيد حساب كل يوم (المسار التقيل)
const period = '2026-07', cycleFrom = '2026-06-23', cycleTo = '2026-07-22'
let app, master, ds, base, created = false
const users = {}, state = {}

function assertDisposable() {
  assert.match(database, /^hr_payroll_perf_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const started = Date.now()
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, bytes: Buffer.byteLength(text), ms: Date.now() - started }
}
function ok(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body)?.slice(0, 500))
  return response
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000, requestTimeout: 600000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['attendance.weekend_days', 'FRI,SAT']]) {
    const config = repo('RequestsConfig')
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  users.admin = await repo('User').save({ email: 'admin@payroll-perf.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  users.approver = await repo('User').save({ email: 'approver@payroll-perf.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '[]' })
  state.branch = await repo('Branch').save({ code: 'PERF', name: 'فرع اختبار الأداء' })
  const staff = []
  for (let index = 0; index < STAFF; index++) {
    staff.push({ employeeCode: `PF${String(index).padStart(4, '0')}`, fullName: `موظف أداء ${index}`, branchId: state.branch.id, joinDate: '2020-01-01', status: 'active',
      isActive: true, basicSalary: 6000, housingAllowance: 1200, transportAllowance: 600, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, payMethod: 'cash', currency: 'SAR' })
  }
  state.employees = await repo('Employee').save(staff, { chunk: 50 })
  const rows = []
  for (const employee of state.employees) {
    for (let time = Date.parse(`${cycleFrom}T12:00:00Z`); time <= Date.parse(`${cycleTo}T12:00:00Z`); time += 86400000) {
      rows.push({ employeeId: employee.id, branchId: state.branch.id, date: new Date(time).toISOString().slice(0, 10), status: 'present', checkIn: '08:00', checkOut: '16:00',
        shiftName: 'وردية ثابتة', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
    }
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
  const createdPolicy = ok(await request(users.admin, 'POST', '/payroll/policies', { name: 'مجموعة الأداء', effectiveFrom: '2026-05-23',
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }), 201).body
  state.version = ok(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${createdPolicy.versions[0].id}/publish`,
    { expectedRevision: createdPolicy.versions[0].revision, reason: 'نشر مجموعة لاختبار الأداء' }), 200).body.version.id
}, { timeout: 1800000 })

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
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-payroll-perf-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'payroll performance fixture cleanup failed')
})

test('PF-01: حساب 500 موظف بالمجموع اليدوي، والاعتماد أقل من 30 ثانية', { timeout: 1800000 }, async t => {
  const draft = ok(await request(users.admin, 'POST', '/payroll/runs', { name: 'مسير الأداء', policyVersionId: state.version, period, filters: { branchIds: [state.branch.id] } }), 201).body
  const calculated = ok(await request(users.admin, 'POST', `/payroll/runs/${draft.id}/calculate`, {}), 201)
  state.run = calculated.body
  const [{ total, n }] = await ds.query('SELECT CONVERT(varchar(40), SUM([netPay])) AS [total], COUNT(*) AS [n] FROM [payroll_items] WHERE [runId] = @0', [draft.id])
  assert.deepEqual([Number(n), Number(total)], [STAFF, STAFF * 7800], 'المجموع اليدوي: الأساسي 6,000 + السكن 1,200 + المواصلات 600')
  const report = ok(await request(users.approver, 'GET', `/payroll/runs/${draft.id}/unassigned`), 200).body
  ok(await request(users.approver, 'POST', `/payroll/runs/${draft.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  const approved = ok(await request(users.approver, 'POST', `/payroll/runs/${draft.id}/approve`), 201)
  state.approveMs = approved.ms
  t.diagnostic(JSON.stringify({ staff: STAFF, calculateMs: calculated.ms, calculateBytes: calculated.bytes, approveMs: approved.ms, approveBytes: approved.bytes }))
  assert.ok(approved.ms < 30000, `الاعتماد خد ${approved.ms} مللي`)
})

test('PF-02: رد التفاصيل للشاشة أقل من 2 ميجا وفيه اللي الشاشة بتقراه؛ والرد الكامل والقسيمة بالتفصيل كله', { timeout: 600000 }, async t => {
  const full = ok(await request(users.admin, 'GET', `/payroll/runs/${state.run.id}`), 200)
  const screen = ok(await request(users.admin, 'GET', `/payroll/runs/${state.run.id}?view=screen`), 200)
  t.diagnostic(JSON.stringify({ fullBytes: full.bytes, fullMs: full.ms, screenBytes: screen.bytes, screenMs: screen.ms }))
  // مين بياخد حجم رد الشاشة (الأجزاء اللي فوق 2 كيلو)، وحجم بند وعضو واحد
  const sizeOf = value => Buffer.byteLength(JSON.stringify(value) ?? '')
  t.diagnostic(JSON.stringify({ screenParts: Object.fromEntries(Object.entries(screen.body).map(([key, value]) => [key, sizeOf(value)]).filter(([, bytes]) => bytes > 2000)),
    oneItem: sizeOf(screen.body.items[0]), oneItemBreakdown: Buffer.byteLength(screen.body.items[0].breakdown ?? ''), oneMember: sizeOf(screen.body.members[0]),
    memberSnapshotKeys: Object.fromEntries(Object.entries(full.body.members[0].snapshot ?? {}).map(([key, value]) => [key, sizeOf(value)])) }))
  assert.ok(screen.bytes < 2 * 1024 * 1024, `رد الشاشة ${screen.bytes} بايت`)
  assert.equal(screen.body.items.length, STAFF)
  const slim = JSON.parse(screen.body.items[0].breakdown), stored = JSON.parse(full.body.items[0].breakdown)
  for (const key of ['coverFrom', 'coverTo', 'coverDays', 'prorataFactor', 'monthlyDays', 'missingPunchDates', 'leaveDeductionLines', 'obligationLines', 'installmentPlan', 'overtime']) {
    assert.deepEqual(slim[key], stored[key], key)
  }
  assert.deepEqual(slim.attendanceDeductions?.totals, stored.attendanceDeductions?.totals)
  assert.equal(slim.attendanceRules, undefined, 'تتبّع قواعد الحضور يوم بيوم في القسيمة بس')
  assert.ok(Array.isArray(stored.attendanceRules) && stored.attendanceRules.length >= 20, 'الرد الكامل زي ما هو')
  // الأرقام نفسها في الردين
  assert.deepEqual(screen.body.items.map(item => [item.id, item.netPay]), full.body.items.map(item => [item.id, item.netPay]))
  // الأعضاء: نفس اللقطة من غير مكونات الراتب، ومصدر الراتب بنوعه وشهره وسريانه
  const { salaryComponents, salarySource, ...memberRest } = full.body.members[0].snapshot
  assert.ok(Array.isArray(salaryComponents) && salaryComponents.length > 0, 'الرد الكامل فيه مكونات الراتب')
  assert.deepEqual(screen.body.members[0].snapshot, { ...memberRest, salarySource: { kind: salarySource.kind, referencePeriod: salarySource.referencePeriod,
    effectivePayrollPeriod: salarySource.effectivePayrollPeriod } })
  // باقي الرد (الحالة والتعريف والسياسة والمحرك وغيرهم) زي ما هو بالحرف
  const { items: _screenItems, members: _screenMembers, ...screenRest } = screen.body, { items: _fullItems, members: _fullMembers, ...fullRest } = full.body
  assert.deepEqual(screenRest, fullRest)
  const slip = ok(await request(users.admin, 'GET', `/payroll/items/${full.body.items[0].id}`), 200)
  assert.equal(slip.body.item.breakdown, full.body.items[0].breakdown, 'القسيمة بالتفصيل كله')
})

test('PF-03: حدث «محسوب» من غير تفصيل البنود، وبصمة كل تفصيل مطابقة للمخزن', { timeout: 600000 }, async t => {
  const [event] = await ds.query(`SELECT TOP (1) [payload], DATALENGTH([payload]) AS [bytes] FROM [payroll_run_events] WHERE [runId] = @0 AND [eventType] = N'CALCULATED' ORDER BY [id] DESC`, [state.run.id])
  t.diagnostic(JSON.stringify({ calculatedEventBytes: Number(event.bytes) }))
  const payload = JSON.parse(event.payload)
  assert.equal(payload.after.items.length, STAFF)
  assert.equal(payload.after.items.some(item => 'breakdown' in item), false)
  const stored = new Map((await ds.query('SELECT [id], [breakdown] FROM [payroll_items] WHERE [runId] = @0', [state.run.id])).map(row => [Number(row.id), row.breakdown]))
  for (const item of payload.after.items) {
    assert.equal(item.breakdownSha256, crypto.createHash('sha256').update(stored.get(Number(item.id)) ?? '').digest('hex'))
  }
  assert.ok(Number(event.bytes) < 5 * 1024 * 1024, `الحدث ${event.bytes} بايت`)
})

test('PF-04: الحضور اليومي (النهارده بالغياب اللحظي) أقل من 3 ثواني', { timeout: 600000 }, async t => {
  const today = new Date().toLocaleDateString('en-CA')
  // الحالة التقيلة: كل الموظفين عندهم وردية النهارده ولسه مابصموش، فالشاشة بتحسب الغياب اللحظي لكل واحد (وردية وتقويم وإطار وسماحية وأذونات)
  await repo('ScheduleDayOverride').save(state.employees.map(employee => ({ employeeId: employee.id, date: today, shiftName: 'وردية اليوم', startTime: '00:00', endTime: '23:59' })), { chunk: 100 })
  // PERF_PROFILE=1: عدّ استعلامات طلب واحد وأكتر 12 جملة تكرارًا (للتشخيص بس)
  if (process.env.PERF_PROFILE === '1') {
    const runner = require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner').SqlServerQueryRunner.prototype, original = runner.query
    const counts = new Map(); let total = 0
    runner.query = function (text, ...rest) { total += 1; const key = String(text).replace(/\s+/g, ' ').replace(/@\d+/g, '@').slice(0, 110); counts.set(key, (counts.get(key) ?? 0) + 1); return original.call(this, text, ...rest) }
    try { ok(await request(users.admin, 'GET', `/attendance/daily?date=${today}`), 200) } finally { runner.query = original }
    t.diagnostic(JSON.stringify({ profileQueries: total, top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12) }))
  }
  const daily = ok(await request(users.admin, 'GET', `/attendance/daily?date=${today}`), 200)
  const again = ok(await request(users.admin, 'GET', `/attendance/daily?date=${today}`), 200)
  const past = ok(await request(users.admin, 'GET', `/attendance/daily?date=2026-07-01`), 200)
  t.diagnostic(JSON.stringify({ todayMs: daily.ms, todayAgainMs: again.ms, todayRows: daily.body.length, pastMs: past.ms, pastRows: past.body.length }))
  assert.equal(past.body.length, STAFF)
  // يوم شغل وعدّت السماحية: كل الموظفين غياب لحظي (صفوف عرض بس). في الراحة الأسبوعية أو أول ربع ساعة من اليوم مفيش صفوف، والقياس لسه صالح
  if (daily.body.length) {
    assert.equal(daily.body.length, STAFF)
    assert.ok(daily.body.every(row => row.live === true && row.status === 'absent'))
  }
  assert.ok(daily.ms < 3000, `الحضور اليومي خد ${daily.ms} مللي`)
  assert.ok(past.ms < 3000, `يوم فات خد ${past.ms} مللي`)
})
