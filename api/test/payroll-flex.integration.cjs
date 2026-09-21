// FX-01..12: real HTTP attendance/catalog writes and SQL-backed payroll evaluation.
// All fixtures use a random disposable DB and temporary upload root; never a source/review DB.
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
const database = `hr_payroll_flex_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-flex-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const date = '2026-07-08', nextDate = '2026-07-09'
let app, master, ds, base, admin, approver, created = false, sequence = 0
const repo = name => ds.getRepository(name)
const number = value => Number(value)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
async function request(user, method, url, body) {
  await writeParityReasonsBeforeApproval(request, user, method, url)
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function fixture({ kind = 'shifts', rule = {}, employee = {}, day = date } = {}) {
  const n = ++sequence
  // weekendDays=null للفرع = إعداد النظام؛ النص الفارغ يرفضه فحص لقطة التقويم (أما '' لجدول العمل فمعناه دوام 7 أيام وهو صالح)
  const branch = await repo('Branch').save({ code: `FLEX${n}`, name: `Flex fixture branch ${n}`, weekendDays: null })
  const actor = await repo('User').save({ email: `manager-${n}@payroll-flex.invalid`, displayName: 'Flex branch fixture manager',
    passwordHash: 'test-only', role: 'hr_manager', branchId: branch.id,
    permissions: JSON.stringify(['attendance.manage', 'attendance.view_all', 'employees.edit', 'employees.view', 'settings.manage', 'payroll.view']) })
  const createdRule = await request(admin, 'POST', `/catalogs/${kind}`, {
    name: `Flex ${kind} ${n}`, startTime: '09:00', endTime: '18:00',
    flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: '2026-07-01', changeReason: 'تعريف دوام اختبار مؤرخ ومعزول',
    ...(kind === 'shifts' ? { shiftMode: 'fixed', graceMinutes: 0 } : { weekendDays: '' }), ...rule,
  })
  assert.equal(createdRule.status, 201, JSON.stringify(createdRule.body))
  const source = createdRule.body
  const employeeInput = { employeeCode: `FLEXEMP${n}`, fingerprintCode: `FLEXEMP${n}`, fullName: 'موظف اختبار المرونة', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'cash', ...(kind === 'work-schedules' ? { workScheduleId: source.id } : {}), ...employee }
  let emp
  if (kind === 'work-schedules') {
    // الخطوة 13: الإنشاء يوثّق أجر التعيين؛ تاريخ التعيين قديم فيُختار صراحةً شهر مسير هذا الاختبار (2026-07).
    const savedEmployee = await request(admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), ...employeeInput, salaryEffectivePayrollPeriod: '2026-07',
      attendanceEffectiveFrom: '2026-07-01', attendanceChangeReason: 'إسناد جدول العمل بنسخة منذ إنشاء موظف الاختبار' })
    assert.equal(savedEmployee.status, 201, JSON.stringify(savedEmployee.body))
    emp = await repo('Employee').findOneByOrFail({ id: savedEmployee.body.id })
  } else emp = await repo('Employee').save(employeeInput)
  const f = { emp, actor, branch, source, kind, day }
  if (kind === 'shifts') await assign(f, day)
  return f
}
async function assign(f, day) {
  const result = await request(f.actor, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: day, shiftId: f.source.id })
  assert.equal(result.status, 201, JSON.stringify(result.body))
}
async function punches(f, start, end, day = f.day, endDay = day) {
  const rows = [[day, start], ...(end ? [[endDay, end]] : [])].map(([punchDate, time]) => ({
    employeeCode: f.emp.fingerprintCode, timestamp: new Date(`${punchDate}T${time.length === 5 ? time + ':00' : time}`).toISOString(),
  }))
  const response = await request(f.actor, 'POST', '/attendance/punches/manual', { punches: rows, reason: 'بصمات اختبار معزول للمرونة' })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return dayOf(f, day)
}
async function dayOf(f, day = f.day) {
  const saved = await repo('AttendanceDay').findOneByOrFail({ employeeId: f.emp.id, date: day })
  const response = await request(f.actor, 'GET', `/attendance/monthly?employeeId=${f.emp.id}&month=${day.slice(0, 7)}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  const shown = response.body.days.find(row => row.date === day)
  assert.ok(shown, 'The real HTTP attendance record must expose the evaluated day')
  for (const key of ['lateMinutes', 'rawLateMinutes', 'unexcusedLateMinutes', 'shortfallMinutes', 'countedWorkMinutes', 'earlyArrivalMinutes', 'flexOutcome', 'attendanceReviewRequired']) {
    assert.equal(shown[key], saved[key], `HTTP/SQL ${key}`)
  }
  assert.deepEqual(shown.attendanceRuleSnapshot, saved.attendanceRuleSnapshot)
  return saved
}
async function recompute(f, day = f.day) {
  const response = await request(f.actor, 'POST', `/attendance/recompute?date=${day}`)
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return dayOf(f, day)
}
function measured(row, expected) {
  for (const [key, value] of Object.entries(expected)) assert.equal(row[key], value, key)
}
async function override(f, mode, effectiveFrom = '2026-07-01') {
  if (f.kind === 'shifts') await assign(f, effectiveFrom)
  const response = await request(f.actor, 'PATCH', `/employees/${f.emp.id}`, {
    flexOverrideMode: mode, attendanceEffectiveFrom: effectiveFrom, attendanceChangeReason: 'اختيار فردي مؤرخ لاختبار المرونة',
  })
  assert.equal(response.status, 200, JSON.stringify(response.body))
}
async function history(f, sourceType = f.kind === 'shifts' ? 'SHIFT' : 'WORK_SCHEDULE', sourceId = f.source.id) {
  const response = await request(admin, 'GET', `/attendance-rules/${sourceType}/${sourceId}/history`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function configDuring(values, action) {
  const previous = new Map()
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, await repo('RequestsConfig').findOneBy({ key }))
    await repo('RequestsConfig').save({ key, value: String(value) })
  }
  try { return await action() } finally {
    for (const [key, old] of previous) {
      if (old) await repo('RequestsConfig').save(old)
      else await repo('RequestsConfig').delete({ key })
    }
  }
}
async function permission(f, { from = '09:00', to = '10:00', paid = false, day = f.day } = {}) {
  const type = await repo('PermissionType').save({ nameAr: `إذن مرونة ${f.emp.id} ${from} ${paid}`, isDeductible: paid,
    coverage: 'both', deductionPct: 100, isActive: true })
  return repo('Request').save({ requesterId: f.emp.id, typeCode: 'PERMISSION', status: 'APPROVED',
    payload: JSON.stringify({ date: day, from, to, permissionTypeId: type.id }) })
}
async function payroll(f, expected = { gross: 9000, grossEarned: 300, dayRate: 300, hourRate: 37.5 }) {
  // A single day of covered service isolates this day's money without fabricating
  // a month of attendance. Monthly gross 9000 still determines rates: 300/day, .625/min.
  // قرار المالك (الراتب على 30 يوم): المستحق = الراتب ÷ 30 × أيام التغطية مهما كان طول الفترة — يوم واحد من يوليو = 9000 ÷ 30 = 300.
  await repo('Employee').update(f.emp.id, { joinDate: f.day, status: 'terminated', isActive: false })
  await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day, status: 'CLOSED', terminationReason: 'termination' })
  // الخطوة 16 (B3): اسم المسير فريد داخل الشهر لغير الملغى؛ كل مسير جديد يأخذ رقم الموظف.
  const result = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period: '2026-07', scopeType: 'CUSTOM', employeeIds: [f.emp.id], name: `تقييم مالي ليوم مرونة — قاعدة اختبار #${f.emp.id}`,
  })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const run = result.body, item = run.items.find(row => row.employeeId === f.emp.id)
  assert.ok(item)
  const details = JSON.parse(item.breakdown)
  assert.equal(details.monthlyDays, 30); assert.equal(details.gross, expected.gross); assert.equal(details.grossEarned, expected.grossEarned)
  assert.equal(details.coverDays, 1); assert.equal(details.dayRate, expected.dayRate); assert.equal(details.hourRate, expected.hourRate)
  assert.ok(details.attendanceDeductions)
  const trace = details.attendanceDeductions.days.find(row => row.date === f.day)
  assert.ok(trace, 'Each evaluated flexible day needs a persisted financial explanation')
  return { run, item, details, trace }
}
// أ1 (16 سبتمبر): شرائح التأخير صارت داخل معادلة الرواتب (payroll_policies.latenessTierSetId) ولم يعد لها اختيار بالشهر،
// ومسيرات هذه المجموعة بلا معادلة، فخصم التأخير فيها بالدقيقة. أثر الشرائح على مسير بمعادلة مُختبر في payroll-policy-snapshot-engine.

// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية بنطاق المعتمد.
async function acknowledgeUnassigned(user, runId) {
  const report = await request(user, 'GET', `/payroll/runs/${runId}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(user, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_flex_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  assert.equal((await master.request().query('SELECT 1 AS ready')).recordset[0].ready, 1)
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const makeAdmin = email => repo('User').save({ email, displayName: 'Flex fixture admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  admin = await makeAdmin('admin@payroll-flex.invalid'); approver = await makeAdmin('approver@payroll-flex.invalid')
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' },
    // المرونة على راتب الملف؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'attendance.grace_minutes', value: '0' },
    { key: 'attendance.flex.count_early_work_toward_required', value: 'false' },
    { key: 'attendance.flex.prorate_window_on_partial_leave', value: 'false' },
    { key: 'attendance.flex.shortfall_grace_minutes', value: '10' },
    { key: 'attendance.flex.unpaid_break_minutes', value: '0' },
    { key: 'attendance.flex.max_session_minutes', value: '900' },
    { key: 'attendance.flex.window_supersedes_grace', value: 'true' },
    { key: 'attendance.flex.missing_checkout_policy', value: 'MANUAL_ONLY' },
    { key: 'payroll.shortfall_enabled', value: 'true' }, { key: 'payroll.shortfall_mode', value: 'MINUTES' },
    { key: 'payroll.shortfall_value', value: '1' }, { key: 'payroll.attendance_overlap_policy', value: 'NET_OF_LATENESS' },
    { key: 'payroll.attendance_daily_cap_days', value: '1' },
  ])
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_flex_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0, 'Disposable database removal must be verified')
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-flex-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Flex fixture cleanup failed')
})

test('FX-03: 09:00, 09:30 and inclusive 10:00 with nine hours earn no lateness, no shortfall and no compensation overtime', async () => {
  for (const [start, end] of [['09:00', '18:00'], ['09:30', '18:30'], ['10:00', '19:00']]) {
    const f = await fixture()
    const row = await punches(f, start, end)
    measured(row, { rawLateMinutes: 0, lateMinutes: 0, shortfallMinutes: 0, countedWorkMinutes: 540,
      flexOutcome: 'WITHIN_WINDOW', attendanceReviewRequired: false })
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id, source: 'BIOMETRIC_DETECTED' } }), 0,
      'Completing the floating workday is compensation, not automatically discovered overtime')
  }
})

test('FX-05: arrival 10:01 remains 61 minutes late after either nine complete hours or staying until 20:00', async () => {
  for (const end of ['19:01', '20:00']) {
    const f = await fixture()
    const row = await punches(f, '10:01', end)
    measured(row, { rawLateMinutes: 61, unexcusedLateMinutes: 61, lateMinutes: 61, shortfallMinutes: 0,
      flexOutcome: 'AFTER_WINDOW', attendanceReviewRequired: false })
    assert.equal(row.status, 'late')
  }
})

test('FX-05 AC1: 10:00:59 exceeds the window before minute rounding and stores 60 late minutes', async () => {
  const f = await fixture()
  const row = await punches(f, '10:00:59', '19:01:00')
  measured(row, { rawLateMinutes: 60, lateMinutes: 60, shortfallMinutes: 0, flexOutcome: 'AFTER_WINDOW' })
})

test('FX-04: in-window departures distinguish a 75-minute shortfall from a 30-minute shortfall without lateness', async () => {
  for (const [start, end, shortfall, worked] of [['09:45', '17:30', 75, 465], ['09:30', '18:00', 30, 510]]) {
    const f = await fixture()
    const row = await punches(f, start, end)
    measured(row, { rawLateMinutes: 0, lateMinutes: 0, shortfallMinutes: shortfall, countedWorkMinutes: worked,
      earlyLeaveMinutes: 0, flexOutcome: 'WITHIN_WINDOW', attendanceReviewRequired: false })
    assert.notEqual(row.status, 'late', 'Shortfall alone must not be labelled as lateness')
  }
})

test('FX-01: employee ENABLED, DISABLED and INHERIT resolve after that day\'s shift instead of overriding its duration', async () => {
  for (const [sourceEnabled, mode, late] of [[true, 'DISABLED', 30], [false, 'ENABLED', 0], [true, 'INHERIT', 0], [false, 'INHERIT', 30]]) {
    const f = await fixture({ rule: { flexEnabled: sourceEnabled } })
    // INHERIT is a real reset from the opposite explicit choice, not a no-op PATCH.
    if (mode === 'INHERIT') await override(f, sourceEnabled ? 'DISABLED' : 'ENABLED')
    const effectiveFrom = mode === 'INHERIT' ? '2026-07-02' : '2026-07-01'
    await override(f, mode, effectiveFrom)
    const row = await punches(f, '09:30', '18:30')
    assert.equal(row.lateMinutes, late, `Source enabled=${sourceEnabled}, employee=${mode}`)
    assert.ok(row.attendanceRuleSnapshot)
    const versions = await history(f, 'EMPLOYEE', f.emp.id)
    assert.equal(row.attendanceRuleSnapshot.employeeOverrideMode, mode)
    assert.ok(versions.some(version => version.effectiveFrom === effectiveFrom && version.snapshot.flexOverrideMode === mode))
  }
})

test('FX-01 extension: WorkSchedule without a Shift applies its own flexible window and employee override', async () => {
  const f = await fixture({ kind: 'work-schedules' })
  const initial = await punches(f, '09:30', '18:30')
  measured(initial, { lateMinutes: 0, shortfallMinutes: 0, countedWorkMinutes: 540 })
  assert.equal(initial.shiftId, null); assert.equal(initial.scheduleSource, 'employee')
  await override(f, 'DISABLED', nextDate)
  const disabled = await punches(f, '09:30', '18:30', nextDate)
  assert.equal(disabled.lateMinutes, 30)
  const old = await recompute(f)
  assert.equal(old.lateMinutes, 0)
  assert.deepEqual(old.attendanceRuleSnapshot, initial.attendanceRuleSnapshot)
})

test('FX-09: moving official start to 08:00 shifts the 60-minute window to 08:00–09:00 only from its effective date', async () => {
  const f = await fixture()
  const first = await punches(f, '09:30', '18:30')
  const originalVersions = await history(f)
  const patched = await request(admin, 'PATCH', `/catalogs/shifts/${f.source.id}`, {
    startTime: '08:00', endTime: '17:00', effectiveFrom: nextDate, changeReason: 'تحريك الدوام مع نافذة نسبية ثابتة المدة',
  })
  assert.equal(patched.status, 200, JSON.stringify(patched.body))
  await assign(f, nextDate)
  const next = await punches(f, '09:30', '18:30', nextDate)
  measured(next, { lateMinutes: 90, rawLateMinutes: 90, shortfallMinutes: 0 })
  assert.equal(next.shiftStart, '08:00')
  const old = await recompute(f)
  measured(old, { lateMinutes: 0, shortfallMinutes: 0, shiftStart: '09:00' })
  assert.deepEqual(old.attendanceRuleSnapshot, first.attendanceRuleSnapshot)
  const versions = await history(f)
  assert.equal(versions.length, originalVersions.length + 1)
  for (const original of originalVersions) assert.deepEqual(versions.find(row => row.id === original.id), original, 'Previous version must stay immutable')
  assert.ok(versions.some(row => row.effectiveFrom === nextDate && row.reason === 'تحريك الدوام مع نافذة نسبية ثابتة المدة' && row.actorUserId === admin.id))
})

test('FX-09: reducing the window from 60 to 30 minutes keeps a previous day unchanged after HTTP recomputation', async () => {
  const f = await fixture()
  const first = await punches(f, '09:45', '18:45')
  const patched = await request(admin, 'PATCH', `/catalogs/shifts/${f.source.id}`, {
    flexWindowMinutes: 30, effectiveFrom: nextDate, changeReason: 'تقصير نافذة الحضور ابتداءً من اليوم التالي',
  })
  assert.equal(patched.status, 200, JSON.stringify(patched.body))
  await assign(f, nextDate)
  measured(await punches(f, '09:45', '18:45', nextDate), { lateMinutes: 45, shortfallMinutes: 0 })
  const recomputed = await recompute(f)
  measured(recomputed, { lateMinutes: 0, shortfallMinutes: 0, countedWorkMinutes: 540 })
  assert.deepEqual(recomputed.attendanceRuleSnapshot, first.attendanceRuleSnapshot)
})

test('FX-02: invalid duration and negative input reject HTTP writes without a new source version', async () => {
  const f = await fixture()
  const original = await repo('Shift').findOneByOrFail({ id: f.source.id })
  const versions = await history(f)
  for (const change of [{ flexWindowMinutes: null }, { flexWindowMinutes: -1 }, { flexWindowMinutes: 0 }, { flexWindowMinutes: 540 },
    { flexWindowMinutes: 600 }, { requiredWorkMinutes: 0 }, { requiredWorkMinutes: -60 }, { flexWindowMinutes: 1.5 }]) {
    const response = await request(admin, 'PATCH', `/catalogs/shifts/${f.source.id}`, {
      ...change, effectiveFrom: nextDate, changeReason: 'محاولة قيمة اختبار غير صالحة',
    })
    assert.equal(response.status, 400, JSON.stringify(response.body))
    assert.deepEqual(await repo('Shift').findOneByOrFail({ id: f.source.id }), original)
    assert.deepEqual(await history(f), versions)
  }
})

test('FX-01/09: branch-scoped users cannot edit global source definitions or another employee\'s override', async () => {
  const local = await fixture(), foreign = await fixture()
  const source = await repo('Shift').findOneByOrFail({ id: local.source.id })
  const employeeBefore = await repo('Employee').findOneByOrFail({ id: foreign.emp.id })
  const outsideHistory = await history(foreign, 'EMPLOYEE', foreign.emp.id)
  const globalWrite = await request(local.actor, 'PATCH', `/catalogs/shifts/${local.source.id}`, {
    flexWindowMinutes: 30, effectiveFrom: nextDate, changeReason: 'محاولة تعديل كتالوج عام من نطاق فرع',
  })
  assert.equal(globalWrite.status, 403, JSON.stringify(globalWrite.body))
  const outside = await request(local.actor, 'PATCH', `/employees/${foreign.emp.id}`, {
    flexOverrideMode: 'DISABLED', attendanceEffectiveFrom: nextDate, attendanceChangeReason: 'محاولة تعديل موظف خارج النطاق',
  })
  assert.ok([403, 404].includes(outside.status), JSON.stringify(outside.body))
  assert.deepEqual(await repo('Shift').findOneByOrFail({ id: local.source.id }), source)
  assert.deepEqual(await repo('Employee').findOneByOrFail({ id: foreign.emp.id }), employeeBefore)
  assert.deepEqual(await history(foreign, 'EMPLOYEE', foreign.emp.id), outsideHistory)
})

test('FX-08.2: free and paid permissions retain raw lateness while excusing their interval exactly once', async () => {
  for (const paid of [false, true]) {
    const f = await fixture()
    await permission(f, { paid })
    const row = await punches(f, '10:30', '17:00')
    measured(row, { rawLateMinutes: 90, unexcusedLateMinutes: 30, lateMinutes: 30, flexOutcome: 'AFTER_WINDOW' })
    if (paid) {
      assert.equal(row.deductibleMinutes, 60)
      assert.equal(row.attendanceRuleSnapshot.paidPermissionCoveredMinutes, 60)
      assert.equal(row.attendanceRuleSnapshot.paidPermissionDeductibleMinutes, 60)
    } else {
      assert.equal(row.deductibleMinutes, 0)
      assert.equal(row.shortfallMinutes, 90, 'Free permission reduces required work by 60; it must not erase an additional genuine 60-minute shortfall')
    }
  }
})

test('FX-08.1: overnight punch-out belongs to the shift start date and never yields negative work duration', async () => {
  const f = await fixture({ rule: { startTime: '22:00', endTime: '07:00' } })
  const row = await punches(f, '23:30', '07:15', date, nextDate)
  measured(row, { rawLateMinutes: 90, lateMinutes: 90, shortfallMinutes: 75, countedWorkMinutes: 465, flexOutcome: 'AFTER_WINDOW' })
  assert.equal(row.date, date)
  assert.equal(row.checkOut, '07:15')
  const raw = await repo('AttendancePunch').find({ where: { employeeId: f.emp.id }, order: { punchTime: 'ASC' } })
  assert.equal(raw.length, 2)
  assert.equal(new Date(raw[1].punchTime).getDate(), 9, 'Raw checkout must remain on the actual following calendar day')
})

test('FX-08: attendance exemption takes precedence over a late/incomplete flexible shift without deleting punches', async () => {
  const f = await fixture()
  await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: date, effectiveTo: date,
    reasonCode: 'field_role', reason: 'استثناء معتمد في قاعدة اختبار', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: approver.id, approvedAt: new Date('2026-07-01T12:00:00Z'), requiresCheckinForPresence: false })
  const row = await punches(f, '10:01', null)
  assert.equal(row.status, 'exempt')
  assert.equal(row.lateMinutes, 0)
  assert.equal(number(row.shortfallMinutes ?? 0), 0)
  assert.equal(row.attendanceReviewRequired, false)
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: f.emp.id } }), 1)
})

test('FX-06: early work is excluded by default and counted only with the explicit company setting', async () => {
  for (const enabled of [false, true]) {
    await configDuring({ 'attendance.flex.count_early_work_toward_required': enabled }, async () => {
      const f = await fixture()
      const row = await punches(f, '08:30', '17:30')
      measured(row, { lateMinutes: 0, earlyArrivalMinutes: 30, countedWorkMinutes: enabled ? 540 : 510,
        shortfallMinutes: enabled ? 0 : 30, flexOutcome: 'BEFORE_START' })
      assert.equal(row.attendanceRuleSnapshot.countEarlyWorkTowardRequired, enabled)
      assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }), 0)
    })
  }
})

test('FX-08.3: morning half-leave moves the full 60-minute window to 13:30–14:30; explicit proration reduces it to 30', async () => {
  for (const prorate of [false, true]) {
    await configDuring({ 'attendance.flex.prorate_window_on_partial_leave': prorate }, async () => {
      const f = await fixture()
      await repo('Leave').save({ employeeId: f.emp.id, leaveTypeCode: 'annual', fromDate: date, toDate: date,
        days: 0.5, period: 'MORNING', isUnpaid: false, status: 'APPROVED' })
      const row = await punches(f, '14:15', '18:45')
      measured(row, { countedWorkMinutes: 270, shortfallMinutes: 0, rawLateMinutes: prorate ? 45 : 0, lateMinutes: prorate ? 45 : 0 })
      const snapshot = row.attendanceRuleSnapshot
      assert.equal(snapshot.effectiveStartMinute, 810)
      assert.equal(snapshot.effectiveRequiredWorkMinutes, 270)
      assert.equal(snapshot.windowEndMinute, prorate ? 840 : 870)
      assert.equal(snapshot.expectedEndMinute, 1125)
    })
  }
})

test('FX-04: independent shortfall tolerance forgives ten minutes but charges all forty minutes when above fifteen', async () => {
  await configDuring({ 'attendance.flex.shortfall_grace_minutes': 15 }, async () => {
    for (const [end, rawShortfall, chargeable] of [['18:20', 10, 0], ['17:50', 40, 40]]) {
      const f = await fixture()
      const row = await punches(f, '09:30', end)
      assert.equal(row.lateMinutes, 0); assert.equal(row.shortfallMinutes, rawShortfall)
      const { item, trace } = await payroll(f)
      assert.equal(trace.rawShortfallMinutes, rawShortfall)
      assert.equal(trace.chargeableShortfallMinutes, chargeable)
      assert.equal(number(item.shortfallDeduction), chargeable * 0.625)
      // الراتب على 30 يوم: المستحق 300، والخصم 0 أو 40×.625=25 ⇒ الصافي 300 أو 275
      assert.equal(number(item.netPay), 300 - chargeable * 0.625)
    }
  })
})

test('FX-04 financial: 75 minutes inside the window are recovered at .625 each with no lateness at all', async t => {
  const f = await fixture()
  await punches(f, '09:45', '17:30')
  const { item, trace } = await payroll(f)
  assert.equal(number(item.shortfallMinutes), 75)
  // قص لخانتين (لا تقريب): 75 × .625 = 46.875 ← 46.87؛ الراتب على 30 يوم: 300 − 46.87 = 253.13
  assert.equal(number(item.shortfallDeduction), 46.87)
  assert.equal(number(item.latenessDeduction), 0)
  assert.equal(number(item.netPay), 253.13)
  assert.equal(trace.rawShortfallMinutes, 75); assert.equal(trace.chargeableShortfallMinutes, 75)
  assert.equal(trace.latenessAmount, 0)
  assert.equal(trace.shortfallAmount, 46.875, 'Daily trace retains precision; the final item truncates the aggregate to 46.87')
  t.diagnostic('الراتب على 30 يوم: يوم مغطى = 9000 ÷ 30 = 300؛ والنقص 75 × 0.625 = 46.875 ← 46.87 بالقص؛ الصافي 253.13.')
})

test('أ4 financial: the whole 130-minute shortfall is charged beside the 70 late minutes — no overlap subtraction', async t => {
  const f = await fixture()
  measured(await punches(f, '10:10', '17:00'), { rawLateMinutes: 70, unexcusedLateMinutes: 70, lateMinutes: 70, shortfallMinutes: 130 })
  const { item, trace } = await payroll(f)
  assert.equal(number(item.shortfallMinutes), 130)
  assert.equal(number(item.latenessDeduction), 43.75)
  assert.equal(number(item.shortfallDeduction), 81.25)
  // الراتب على 30 يوم: 300 − 43.75 − 81.25 = 175
  assert.equal(number(item.netPay), 175)
  assert.equal(trace.rawShortfallMinutes, 130); assert.equal(trace.unexcusedLateMinutes, 70)
  assert.equal(trace.overlapMinutes, 0); assert.equal(trace.chargeableShortfallMinutes, 130)
  assert.equal(trace.totalAmount, 125)
  t.diagnostic('أ4: كل خصم يُحتسب كما جاء — تأخير 70×.625=43.75 ونقص 130×.625=81.25؛ الصافي 300−125=175 (الراتب على 30 يوم).')
})

test('FX-07 financial: free and paid permission coverage is counted once and raw lateness cannot erase a real later shortfall', async t => {
  for (const paid of [false, true]) {
    const f = await fixture()
    await permission(f, { paid })
    const day = await punches(f, '10:30', '17:00')
    assert.equal(day.rawLateMinutes, 90); assert.equal(day.unexcusedLateMinutes, 30)
    const { item, trace } = await payroll(f)
    assert.equal(trace.rawShortfallMinutes, paid ? 150 : 90)
    assert.equal(trace.unexcusedLateMinutes, 30)
    // أ4: الإذن المدفوع وحده يغطي دقائقه؛ ما بقي من النقص يُخصم كاملًا بلا طرح دقائق التأخير
    assert.equal(trace.chargeableShortfallMinutes, 90)
    assert.equal(trace.latenessAmount, 18.75)
    assert.equal(trace.permissionAmount, paid ? 37.5 : 0)
    assert.equal(trace.shortfallAmount, 56.25)
    assert.equal(number(item.shortfallDeduction), 56.25)
    // الراتب على 30 يوم: الحر 300 − 18.75 − 56.25 = 225، والمدفوع ينقص 37.50 ⇒ 187.50
    assert.equal(number(item.netPay), paid ? 187.5 : 225)
  }
  t.diagnostic('أ4: الإذن الحر ⇒ 300−18.75−56.25=225؛ والمدفوع يضيف 60×.625=37.50 فالصافي 187.50 (الراتب على 30 يوم). الإذن المدفوع لا يُحتسب مرتين.')
})

test('أ4 financial: forgiven lateness no longer shrinks the shortfall — the unworked 90 minutes are charged in full', async () => {
  await configDuring({ 'attendance.flex.window_supersedes_grace': false }, async () => {
    const f = await fixture({ rule: { graceMinutes: 60 } })
    await permission(f)
    measured(await punches(f, '10:30', '17:00'), { rawLateMinutes: 90, unexcusedLateMinutes: 30, lateMinutes: 0, shortfallMinutes: 90 })
    const { item, trace } = await payroll(f)
    assert.equal(trace.unexcusedLateMinutes, 30); assert.equal(trace.overlapMinutes, 0)
    assert.equal(trace.chargeableShortfallMinutes, 90)
    assert.equal(number(item.latenessDeduction), 0); assert.equal(number(item.shortfallDeduction), 56.25)
    // الراتب على 30 يوم: 300 − 90×.625 (56.25) = 243.75
    assert.equal(number(item.netPay), 243.75)
  })
})

test('FX-08.4: missing checkout keeps known lateness, leaves shortfall unknown and blocks payroll approval atomically', async () => {
  const f = await fixture()
  const row = await punches(f, '10:05', null)
  measured(row, { rawLateMinutes: 65, lateMinutes: 65, shortfallMinutes: null, countedWorkMinutes: null, attendanceReviewRequired: true })
  assert.ok(row.attendanceReviewReason)
  const { run, item } = await payroll(f)
  assert.equal(number(item.shortfallDeduction), 0, 'Missing work duration must never invent a zero-work/full-day penalty')
  // قص لخانتين (لا تقريب): 65 × .625 = 40.625 ← 40.62
  assert.equal(number(item.latenessDeduction), 40.62)
  await acknowledgeUnassigned(approver, run.id)
  const claimsBefore = await repo('PayrollPeriodClaim').count()
  const before = await repo('PayrollRun').findOneByOrFail({ id: run.id })
  const approval = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approval.status, 409, JSON.stringify(approval.body))
  assert.deepEqual(await repo('PayrollRun').findOneByOrFail({ id: run.id }), before)
  assert.equal(await repo('PayrollPeriodClaim').count(), claimsBefore)
  assert.equal(await repo('PayrollRunEvent').count({ where: { runId: run.id, eventType: 'APPROVED' } }), 0)
})

test('FX-09: approved payroll protects its original attendance and source versions against retroactive edits or recomputation', async () => {
  const f = await fixture()
  await punches(f, '09:30', '18:30')
  const { run, item } = await payroll(f)
  await acknowledgeUnassigned(approver, run.id)
  const approval = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approval.status, 201, JSON.stringify(approval.body))
  const oldDay = await dayOf(f)
  const oldItem = await repo('PayrollItem').findOneByOrFail({ id: item.id })
  const versions = await history(f)
  const patched = await request(admin, 'PATCH', `/catalogs/shifts/${f.source.id}`, {
    flexWindowMinutes: 15, effectiveFrom: date, changeReason: 'محاولة تغيير يوم سبق اعتماده ماليًا',
  })
  assert.equal(patched.status, 409, JSON.stringify(patched.body))
  assert.deepEqual(await history(f), versions)
  const overrideResponse = await request(f.actor, 'PATCH', `/employees/${f.emp.id}`, {
    flexOverrideMode: 'DISABLED', attendanceEffectiveFrom: date, attendanceChangeReason: 'محاولة تعديل مرونة يوم مقفل',
  })
  assert.equal(overrideResponse.status, 409, JSON.stringify(overrideResponse.body))
  // Disposable fixture injection represents a late-arriving correction: recompute
  // must preserve the already approved day even when its raw candidate has changed.
  await repo('AttendanceCorrection').save({ employeeId: f.emp.id, date, reason: 'Late correction fixture for locked day',
    correctedPunch: JSON.stringify({ in: '12:00', out: '16:00' }) })
  const recalculated = await request(f.actor, 'POST', `/attendance/recompute?date=${date}`)
  assert.ok([201, 409].includes(recalculated.status), JSON.stringify(recalculated.body))
  assert.deepEqual(await repo('AttendanceDay').findOneByOrFail({ id: oldDay.id }), oldDay)
  assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: item.id }), oldItem)
})

test('أ4 financial: no daily cap — lateness and shortfall are each charged in full, and only net protection stops the day going negative', async () => {
  const f = await fixture()
  await punches(f, '13:00', '14:00')
  const { item, trace } = await payroll(f)
  // 240 دقيقة تأخير × .625 = 150، و480 دقيقة نقص × .625 = 300: الطلب 450 بلا أي اقتطاع سقف
  assert.equal(trace.dailyCapAmount, 0); assert.equal(trace.cappedAmount, 0)
  assert.equal(trace.latenessAmount, 150); assert.equal(trace.shortfallAmount, 300)
  assert.equal(trace.totalAmount, 450)
  // حماية الصافي وحدها تمنع السالب: المصروف لا يتجاوز الأجر المستحق لليوم المغطى (الراتب على 30 يوم: 9000 ÷ 30 = 300)
  assert.equal(number(item.latenessDeduction) + number(item.shortfallDeduction), 300)
  assert.equal(number(item.netPay), 0)
})

test('FX-05 financial: approved overtime remains a separate source and cannot cancel after-window lateness', async () => {
  const f = await fixture()
  const ot = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date, source: 'PRE_REQUESTED',
    hoursRequested: 1, payableHours: 1, rate: 1.5, status: 'APPROVED' })
  const row = await punches(f, '10:01', '20:30')
  measured(row, { lateMinutes: 61, shortfallMinutes: 0 })
  const beforeOt = await repo('OvertimeEntry').findOneByOrFail({ id: ot.id })
  await recompute(f)
  const afterOt = await repo('OvertimeEntry').findOneByOrFail({ id: ot.id })
  assert.equal(afterOt.status, 'APPROVED'); assert.equal(afterOt.source, 'PRE_REQUESTED')
  assert.equal(number(afterOt.payableHours), 1)
  assert.deepEqual(afterOt, beforeOt)
  const { item, details } = await payroll(f)
  assert.equal(number(item.overtimeAmount), 56.25)
  // قص لخانتين: 61 × .625 = 38.125 ← 38.12؛ الراتب على 30 يوم: 300 + 56.25 − 38.12 = 318.13
  assert.equal(number(item.latenessDeduction), 38.12)
  assert.equal(number(item.shortfallDeduction), 0)
  assert.equal(number(item.netPay), 318.13)
  assert.deepEqual(details.overtimeEntryIds, [ot.id])
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: ot.id })).status, 'APPROVED')
})

test('FX policy validation: invalid settings are rejected over HTTP and a corrupted SQL policy cannot replace an existing payroll', async () => {
  const f = await fixture()
  await punches(f, '09:30', '18:00')
  const { run } = await payroll(f)
  for (const [key, value] of [
    ['attendance.flex.shortfall_grace_minutes', '-1'], ['attendance.flex.shortfall_grace_minutes', '1.5'],
    ['attendance.flex.unpaid_break_minutes', '1441'], ['attendance.flex.max_session_minutes', '0'],
    ['attendance.flex.count_early_work_toward_required', 'yes'], ['attendance.flex.missing_checkout_policy', 'ASSUME_ZERO'],
    ['payroll.shortfall_value', '-1'], ['payroll.attendance_daily_cap_days', '-1'],
    ['payroll.shortfall_mode', 'UNKNOWN'], ['payroll.attendance_overlap_policy', 'UNKNOWN'],
  ]) {
    const before = await repo('RequestsConfig').findOneByOrFail({ key })
    const response = await request(admin, 'PATCH', '/settings/config', { key, value })
    assert.equal(response.status, 400, JSON.stringify(response.body))
    assert.deepEqual(await repo('RequestsConfig').findOneByOrFail({ key }), before)
  }
  const before = await request(admin, 'GET', `/payroll/runs/${run.id}`)
  assert.equal(before.status, 200)
  assert.match(before.body.policySnapshotHash, /^[a-f0-9]{64}$/)
  await configDuring({ 'payroll.shortfall_mode': 'INVALID_FIXTURE_VALUE' }, async () => {
    // الخطوة 19: إعادة الحساب تقرأ لقطة السياسة المجمدة على المسير؛ الإعداد الحي التالف لا يُقرأ إلا عند «تحديث اللقطة» الصريح، فيُرفض ولا يستبدل المسير
    const failed = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period: '2026-07', scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: run.id, reason: 'اختبار سلامة السياسة قبل استبدال المسير',
      refreshPolicySnapshot: true, expectedPolicySnapshotHash: before.body.policySnapshotHash,
    })
    assert.equal(failed.status, 400, JSON.stringify(failed.body))
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${run.id}`)).body, before.body)
    // بلا تحديث: الحساب من اللقطة المجمدة نفسها، فلا تصل القيمة التالفة إلى النتيجة
    const frozen = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period: '2026-07', scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: run.id, reason: 'إعادة حساب من لقطة السياسة المجمدة',
    })
    assert.equal(frozen.status, 201, JSON.stringify(frozen.body))
    assert.equal(frozen.body.policySnapshotHash, before.body.policySnapshotHash)
    assert.equal(number(frozen.body.items.find(row => row.employeeId === f.emp.id).shortfallDeduction), number(before.body.items.find(row => row.employeeId === f.emp.id).shortfallDeduction))
  })
})

test('FX regression: final aggregate truncates an exact half-cent to two decimals despite binary floating-point noise', async t => {
  const f = await fixture({ employee: { basicSalary: 1000.08 } })
  measured(await punches(f, '09:30', '16:50'), { lateMinutes: 0, shortfallMinutes: 100 })
  // الراتب على 30 يوم وقص لخانتين: المستحق 100008 قرش ÷ 30 = 3333.6 ← 33.33، سعر اليوم 33.336 ← 33.33، الساعة 4.167 ← 4.16
  const { item, trace } = await payroll(f, { gross: 1000.08, grossEarned: 33.33, dayRate: 33.33, hourRate: 4.16 })
  assert.equal(number(item.shortfallMinutes), 100)
  assert.ok(Math.abs(trace.shortfallAmount - 6.945) < 1e-12, 'The trace must preserve full intermediate precision')
  // قرار المالك: لا تقريب للفلوس — 6.945 تُقص إلى 6.94
  assert.equal(number(item.shortfallDeduction), 6.94, 'Exact 6.945 truncates to 6.94 (owner rule: no rounding)')
  assert.equal(trace.totalAmount, 6.94)
  assert.equal(number(item.netPay), 26.39)
  t.diagnostic('Manual: monthly1000.08 /30 /8 /60 ×100min = 6.945 → 6.94 بالقص؛ ويوم مغطى واحد يستحق 1000.08 ÷ 30 = 33.336 ← 33.33 (الراتب على 30 يوم)؛ الصافي 26.39.')
})

test('FX / OT-08 regression: fixed-shift attendance materialization preserves a legacy approved overtime source', async t => {
  const f = await fixture({ rule: { flexEnabled: false } })
  // الاعتماد التاريخي لا يحمل دليل تسعير جديدًا؛ إعادة حساب الحضور لا تعيد تفسيره أو تعدّل ساعاته صامتًا.
  const overtime = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date, source: 'PRE_REQUESTED',
    hoursRequested: 2, hoursActual: 2, payableHours: 2, rate: 1.5, status: 'APPROVED' })
  const sourceBefore = await repo('OvertimeEntry').findOneByOrFail({ id: overtime.id })
  measured(await punches(f, '09:00', '19:00'), { lateMinutes: 0, shortfallMinutes: 0 })
  const { item, details } = await payroll(f)
  const latest = await repo('OvertimeEntry').findOneByOrFail({ id: overtime.id })
  assert.equal(latest.status, 'APPROVED'); assert.equal(latest.payrollRunId, null)
  assert.equal(number(latest.hoursRequested), 2)
  assert.deepEqual(latest, sourceBefore)
  assert.equal(number(latest.hoursActual), 2)
  assert.equal(number(latest.payableHours), 2)
  assert.equal(number(item.overtimeHours), 2)
  assert.equal(number(item.overtimeAmount), 112.5)
  // الراتب على 30 يوم: 300 + 112.50 = 412.50
  assert.equal(number(item.netPay), 412.5)
  assert.deepEqual(details.overtimeEntryIds, [overtime.id])
  t.diagnostic('Legacy approval remains2h: 2 ×(9000/30/8) ×1.5 =112.50; payroll cannot change an existing approval to1h by rereading attendance.')
})

test('FX regression: a backdated default work schedule cannot overlap a future default or alter its saved history', async () => {
  // Keep these source dates beyond the approved 2026 payroll fixtures so the
  // temporal-default guard, rather than the financial-period lock, is exercised.
  const createSchedule = (name, effectiveFrom, isDefault) => request(admin, 'POST', '/catalogs/work-schedules', {
    name, startTime: '09:00', endTime: '18:00', weekendDays: '', isActive: true, isDefault,
    flexEnabled: true, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom, changeReason: 'اختبار تعارض الجدول الافتراضي المؤرخ في قاعدة معزولة',
  })
  const a = await createSchedule('Temporal default A 2030', '2030-07-01', true)
  assert.equal(a.status, 201, JSON.stringify(a.body))
  const b = await createSchedule('Temporal default B 2030', '2030-07-20', true)
  assert.equal(b.status, 201, JSON.stringify(b.body))
  const c = await createSchedule('Temporal candidate C 2030', '2030-07-01', false)
  assert.equal(c.status, 201, JSON.stringify(c.body))
  const sources = [a.body, b.body, c.body].map(source => ({ kind: 'work-schedules', source }))
  const beforeHistory = await Promise.all(sources.map(source => history(source)))
  assert.ok(beforeHistory[0].some(version => version.effectiveFrom === '2030-07-01' && version.snapshot.isDefault))
  assert.ok(beforeHistory[0].some(version => version.effectiveFrom === '2030-07-20' && !version.snapshot.isDefault))
  assert.ok(beforeHistory[1].some(version => version.effectiveFrom === '2030-07-20' && version.snapshot.isDefault))
  const beforeRows = await repo('WorkSchedule').find({ order: { id: 'ASC' } })
  const beforeVersions = await repo('AttendanceRuleVersion').find({ order: { id: 'ASC' } })
  const unchanged = async () => {
    assert.deepEqual(await Promise.all(sources.map(source => history(source))), beforeHistory,
      'Rejected edits must preserve the existing effective dates, snapshots and audit history')
    assert.deepEqual(await repo('WorkSchedule').find({ order: { id: 'ASC' } }), beforeRows,
      'Rejected creation or update must not change defaults or leave an orphan schedule')
    assert.deepEqual(await repo('AttendanceRuleVersion').find({ order: { id: 'ASC' } }), beforeVersions,
      'Rejected creation or update must not append any source or employee version')
  }
  const rejectedCreate = await createSchedule('Rejected temporal default D 2030', '2030-07-15', true)
  assert.equal(rejectedCreate.status, 400, JSON.stringify(rejectedCreate.body))
  await unchanged()
  const rejectedPatch = await request(admin, 'PATCH', `/catalogs/work-schedules/${c.body.id}`, {
    isDefault: true, effectiveFrom: '2030-07-15', changeReason: 'محاولة تداخل افتراضي مع تغيير محفوظ في 20 يوليو',
  })
  assert.equal(rejectedPatch.status, 400, JSON.stringify(rejectedPatch.body))
  await unchanged()
})

test('FX-09 regression: changing general grace preserves historical source versions and applies only to a new effective version', async () => {
  await configDuring({ 'attendance.grace_minutes': 10 }, async () => {
    // WorkSchedule has no explicit shift grace override. Its fixed attendance
    // therefore captures the general setting when this source version is saved.
    const f = await fixture({ kind: 'work-schedules', rule: { flexEnabled: false } })
    const original = await punches(f, '09:15', '18:15')
    assert.equal(original.lateMinutes, 15)
    assert.equal(original.attendanceRuleSnapshot.graceMinutes, 10)
    const originalHistory = await history(f)
    assert.equal(originalHistory.find(version => version.id === original.attendanceRuleSnapshot.sourceVersionId)
      ?.snapshot.generalGraceMinutes, 10)

    const settings = await request(admin, 'PATCH', '/settings/config', { key: 'attendance.grace_minutes', value: '20' })
    assert.equal(settings.status, 200, JSON.stringify(settings.body))
    assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'attendance.grace_minutes' })).value, '20')
    const recomputed = await recompute(f)
    assert.equal(recomputed.lateMinutes, 15, 'Changing a global setting must not forgive lateness under an existing source version')
    assert.equal(recomputed.attendanceRuleSnapshot.sourceVersionId, original.attendanceRuleSnapshot.sourceVersionId)
    assert.deepEqual(recomputed.attendanceRuleSnapshot, original.attendanceRuleSnapshot)
    // تدقيق ما قبل المسير (الإصلاح 1): الإعداد لازم يسري للأمام على التعريف القائم، فحفظه
    // بيولّد نسخة مؤرخة من تاريخ التغيير. النسخ الموجودة تفضل بحروفها — الماضي مجمّد.
    const changedHistory = await history(f)
    for (const version of originalHistory) {
      assert.deepEqual(changedHistory.find(row => row.id === version.id), version,
        'An existing version must retain its captured general grace')
    }
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const fromSettings = changedHistory.filter(row => !originalHistory.some(old => old.id === row.id))
    assert.equal(fromSettings.length, 1, 'One dated version carries the new general grace forward')
    assert.equal(fromSettings[0].effectiveFrom, today, 'The new version is effective from the change date, not earlier')
    assert.equal(fromSettings[0].snapshot.generalGraceMinutes, 20)
    assert.equal(fromSettings[0].legacyBaseline, false)
    assert.equal(fromSettings[0].actorUserId, admin.id)
    // اليوم من تاريخ السريان: نفس التعريف القائم (بلا تعديل ولا تعريف جديد) بياخد القيمة الجديدة.
    // البصمة لحظة ماضية (البصمة المستقبلية مرفوضة)، والمقياس هو السماحية المحسوبة لليوم لا مقدار التأخير.
    const stamp = new Date(now.getTime() - 120000)
    if (stamp.getDate() === now.getDate()) {
      const at = `${String(stamp.getHours()).padStart(2, '0')}:${String(stamp.getMinutes()).padStart(2, '0')}:00`
      const forward = await punches(f, at, null, today)
      assert.equal(forward.attendanceRuleSnapshot.graceMinutes, 20,
        'A day from the effective date forward resolves the new general grace on the same existing source')
      assert.equal(forward.attendanceRuleSnapshot.sourceVersionId, fromSettings[0].id)
    }
    // ونفس اللحظة: اليوم الأقدم لسه على نسخته القديمة بقيمتها القديمة
    const stillFrozen = await recompute(f)
    assert.equal(stillFrozen.lateMinutes, 15, 'A day before the change keeps its old lateness after a recompute')
    assert.deepEqual(stillFrozen.attendanceRuleSnapshot, original.attendanceRuleSnapshot)

    const changed = await request(admin, 'PATCH', `/catalogs/work-schedules/${f.source.id}`, {
      flexWindowMinutes: 45, effectiveFrom: nextDate, changeReason: 'نسخة دوام جديدة تلتقط سماحية التأخير الحالية',
    })
    assert.equal(changed.status, 200, JSON.stringify(changed.body))
    const next = await punches(f, '09:15', '18:15', nextDate)
    assert.equal(next.lateMinutes, 0, 'A new explicitly dated source version captures the current 20-minute grace')
    assert.equal(next.attendanceRuleSnapshot.graceMinutes, 20)
    assert.notEqual(next.attendanceRuleSnapshot.sourceVersionId, original.attendanceRuleSnapshot.sourceVersionId)
    const nextHistory = await history(f)
    assert.equal(nextHistory.find(version => version.id === next.attendanceRuleSnapshot.sourceVersionId)
      ?.snapshot.generalGraceMinutes, 20)
    for (const version of originalHistory) assert.deepEqual(nextHistory.find(row => row.id === version.id), version)
    const historical = await recompute(f)
    assert.equal(historical.lateMinutes, 15)
    assert.deepEqual(historical.attendanceRuleSnapshot, original.attendanceRuleSnapshot)
  })
})

test('FX assignment date: a future shift rejects earlier daily and name assignments and bulk validates each date', async () => {
  const effectiveFrom = '2030-07-10', beforeDate = '2030-07-09'
  const f = await fixture({ day: effectiveFrom, rule: { effectiveFrom } })
  assert.equal((await repo('ScheduleDayOverride').findOneByOrFail({ employeeId: f.emp.id, date: effectiveFrom })).shiftId, f.source.id,
    'The source can be assigned on its exact first effective date')
  const before = await repo('ScheduleDayOverride').find({ where: { employeeId: f.emp.id }, order: { date: 'ASC' } })
  const beforeHistory = await history(f)
  for (const source of [{ shiftId: f.source.id }, { shiftName: f.source.name, startTime: '09:00', endTime: '18:00' }]) {
    const rejected = await request(f.actor, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: beforeDate, ...source })
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('ScheduleDayOverride').find({ where: { employeeId: f.emp.id }, order: { date: 'ASC' } }), before)
    assert.equal(await repo('AttendanceDay').count({ where: { employeeId: f.emp.id, date: beforeDate } }), 0)
    assert.deepEqual(await history(f), beforeHistory)
  }
  const nameAccepted = await request(f.actor, 'POST', '/attendance/schedule/day', {
    employeeId: f.emp.id, date: '2030-07-11', shiftName: f.source.name, startTime: '09:00', endTime: '18:00',
  })
  assert.equal(nameAccepted.status, 201, JSON.stringify(nameAccepted.body))
  assert.equal((await repo('ScheduleDayOverride').findOneByOrFail({ employeeId: f.emp.id, date: '2030-07-11' })).shiftId, f.source.id)
  const bulk = await request(f.actor, 'POST', '/attendance/schedule/day/bulk', {
    employeeIds: [f.emp.id], dates: [beforeDate, '2030-07-12'], shiftId: f.source.id,
  })
  assert.equal(bulk.status, 201, JSON.stringify(bulk.body))
  assert.equal(bulk.body.applied, 1)
  assert.equal(bulk.body.failed.length, 1)
  assert.equal(bulk.body.failed[0].employeeId, f.emp.id)
  assert.equal(bulk.body.failed[0].date, beforeDate)
  assert.ok(bulk.body.failed[0].error)
  assert.equal(await repo('ScheduleDayOverride').count({ where: { employeeId: f.emp.id, date: beforeDate } }), 0)
  assert.equal((await repo('ScheduleDayOverride').findOneByOrFail({ employeeId: f.emp.id, date: '2030-07-12' })).shiftId, f.source.id)
})

test('FX assignment date: a week straddling shift creation rejects by id or name and rolls back an earlier valid batch entry', async () => {
  const f = await fixture({ day: '2030-07-10', rule: { effectiveFrom: '2030-07-10' } })
  const valid = { employeeId: f.emp.id, weekStart: '2030-07-14', shiftId: f.source.id }
  const beforeHistory = await history(f)
  for (const source of [{ shiftId: f.source.id }, { shiftName: f.source.name, startTime: '09:00', endTime: '18:00' }]) {
    const rejected = await request(f.actor, 'POST', '/attendance/schedule', {
      entries: [valid, { employeeId: f.emp.id, weekStart: '2030-07-07', ...source }],
    })
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.equal(await repo('ScheduleEntry').count({ where: { employeeId: f.emp.id } }), 0,
      'No earlier valid batch row may survive a later week containing dates before source creation')
    assert.equal(await repo('AttendanceDay').count({ where: { employeeId: f.emp.id } }), 0)
    assert.deepEqual(await history(f), beforeHistory)
  }
  const accepted = await request(f.actor, 'POST', '/attendance/schedule', { entries: [valid] })
  assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
  assert.equal(accepted.body.saved.length, 1)
  assert.equal(accepted.body.skipped.length, 0)
  const saved = await repo('ScheduleEntry').findOneByOrFail({ employeeId: f.emp.id, weekStart: '2030-07-14' })
  assert.equal(saved.shiftId, f.source.id)
  assert.equal(saved.startTime, '09:00'); assert.equal(saved.endTime, '18:00')
})

test('FX assignment date: future deactivation permits earlier new assignments and preserves already saved daily and weekly schedules', async () => {
  const f = await fixture({ day: '2030-07-18', rule: { effectiveFrom: '2030-07-01' } })
  const weekly = await request(f.actor, 'POST', '/attendance/schedule', {
    entries: [{ employeeId: f.emp.id, weekStart: '2030-07-21', shiftId: f.source.id }],
  })
  assert.equal(weekly.status, 201, JSON.stringify(weekly.body))
  const existingDaily = await repo('ScheduleDayOverride').findOneByOrFail({ employeeId: f.emp.id, date: f.day })
  const existingWeek = await repo('ScheduleEntry').findOneByOrFail({ employeeId: f.emp.id, weekStart: '2030-07-21' })
  const deactivated = await request(admin, 'PATCH', `/catalogs/shifts/${f.source.id}`, {
    isActive: false, effectiveFrom: '2030-07-15', changeReason: 'إيقاف مؤرخ يمنع الإسناد الجديد ويحفظ الإسنادات السابقة',
  })
  assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body))
  assert.equal((await repo('Shift').findOneByOrFail({ id: f.source.id })).isActive, false,
    'The current catalog row is inactive, so acceptance must resolve its dated history')
  for (const source of [{ shiftId: f.source.id }, { shiftName: f.source.name, startTime: '09:00', endTime: '18:00' }]) {
    const earlier = await request(f.actor, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: '2030-07-14', ...source })
    assert.equal(earlier.status, 201, JSON.stringify(earlier.body))
    for (const day of ['2030-07-15', '2030-07-16']) {
      const rejected = await request(f.actor, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: day, ...source })
      assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
      assert.equal(await repo('ScheduleDayOverride').count({ where: { employeeId: f.emp.id, date: day } }), 0)
    }
  }
  const earlierWeek = await request(f.actor, 'POST', '/attendance/schedule', {
    entries: [{ employeeId: f.emp.id, weekStart: '2030-07-07', shiftId: f.source.id }],
  })
  assert.equal(earlierWeek.status, 201, JSON.stringify(earlierWeek.body))
  const crossingWeek = await request(f.actor, 'POST', '/attendance/schedule', {
    entries: [{ employeeId: f.emp.id, weekStart: '2030-07-14', shiftId: f.source.id }],
  })
  assert.equal(crossingWeek.status, 400, JSON.stringify(crossingWeek.body))
  assert.equal(await repo('ScheduleEntry').count({ where: { employeeId: f.emp.id, weekStart: '2030-07-14' } }), 0)
  assert.deepEqual(await repo('ScheduleDayOverride').findOneByOrFail({ id: existingDaily.id }), existingDaily)
  assert.deepEqual(await repo('ScheduleEntry').findOneByOrFail({ id: existingWeek.id }), existingWeek)
  // الحضور المستقبلي لا يُحفظ حتى مع وجود تصحيح، لذلك نثبت بقاء إسنادات 2030
  // من شاشة الجدولة، ثم نتحقق من حساب الإسناد بعد التعطيل ببصمات فعلية لأيام
  // منقضية تخص موظف اختبار آخر في القاعدة المعزولة نفسها.
  const futureDaily = await request(f.actor, 'GET', '/attendance/schedule/day-overrides?week=2030-07-14')
  const futureWeekly = await request(f.actor, 'GET', '/attendance/schedule?week=2030-07-21')
  assert.equal(futureDaily.status, 200); assert.equal(futureWeekly.status, 200)
  assert.ok(futureDaily.body.some(row => row.id === existingDaily.id && row.shiftId === f.source.id))
  assert.ok(futureWeekly.body.some(row => row.id === existingWeek.id && row.shiftId === f.source.id))
  assert.equal(await repo('AttendanceDay').count({ where: { employeeId: f.emp.id } }), 0)
  const past = await fixture({ day: '2026-07-16', rule: { effectiveFrom: '2026-07-01' } })
  const pastWeekly = await request(past.actor, 'POST', '/attendance/schedule', {
    entries: [{ employeeId: past.emp.id, weekStart: '2026-07-19', shiftId: past.source.id }],
  })
  assert.equal(pastWeekly.status, 201, JSON.stringify(pastWeekly.body))
  await punches(past, '09:30', '18:30')
  await punches(past, '09:30', '18:30', '2026-07-20')
  const pastDailyBefore = await repo('ScheduleDayOverride').findOneByOrFail({ employeeId: past.emp.id, date: past.day })
  const pastWeekBefore = await repo('ScheduleEntry').findOneByOrFail({ employeeId: past.emp.id, weekStart: '2026-07-19' })
  const pastDeactivate = await request(admin, 'PATCH', `/catalogs/shifts/${past.source.id}`, {
    isActive: false, effectiveFrom: '2026-07-15', changeReason: 'التحقق من بقاء حساب الإسنادات السابقة بعد إيقاف الوردية',
  })
  assert.equal(pastDeactivate.status, 200, JSON.stringify(pastDeactivate.body))
  for (const day of [past.day, '2026-07-20']) {
    const row = await recompute(past, day)
    assert.equal(row.shiftId, past.source.id, 'Deactivation must not silently turn an existing assignment into an unscheduled day')
    assert.equal(row.shiftStart, '09:00'); assert.equal(row.shiftEnd, '18:00')
    assert.equal(row.attendanceRuleSnapshot.sourceType, 'SHIFT')
    assert.equal(row.attendanceRuleSnapshot.sourceId, past.source.id)
    assert.equal(row.attendanceRuleSnapshot.sourceEffectiveFrom, '2026-07-15')
    measured(row, { lateMinutes: 0, shortfallMinutes: 0, countedWorkMinutes: 540 })
  }
  assert.deepEqual(await repo('ScheduleDayOverride').findOneByOrFail({ id: pastDailyBefore.id }), pastDailyBefore)
  assert.deepEqual(await repo('ScheduleEntry').findOneByOrFail({ id: pastWeekBefore.id }), pastWeekBefore)
})
