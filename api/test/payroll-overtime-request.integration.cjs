// قبول مسارات الإضافي عبر HTTP وقاعدة SQL عشوائية، دون تغيير بيانات النظام أو قاعدة المراجعة.
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
const database = `hr_payroll_ot_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-ot-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, financeApprover, created = false, sequence = 0
const repo = name => ds.getRepository(name)
const numeric = value => Number(value)
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const dateAfter = (value, offset) => { const day = new Date(`${value}T12:00:00`); day.setDate(day.getDate() + offset); return isoDate(day) }
const today = isoDate(new Date())
let workDate = dateAfter(today, -2)
while (new Date(`${workDate}T12:00:00`).getDay() !== 3) workDate = dateAfter(workDate, -1)
const toObject = value => typeof value === 'string' ? JSON.parse(value) : value

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function configDuring(values, action) {
  const previous = new Map()
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, await repo('RequestsConfig').findOneBy({ key }))
    await repo('RequestsConfig').save({ key, value: String(value) })
  }
  try { return await action() } finally {
    for (const [key, row] of previous) {
      if (row) await repo('RequestsConfig').save(row)
      else await repo('RequestsConfig').delete({ key })
    }
  }
}
async function fixture({ day = workDate, shift = {}, employee = {} } = {}) {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `OT${n}`, name: `فرع اختبار إضافي ${n}`, country: `T${n}`, weekendDays: 'FRI,SAT' })
  const department = await repo('Department').save({ branchId: branch.id, code: `OTDEPT${n}`, name: `قسم اختبار إضافي ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `OT${n}${suffix}`, fullName: `موظف إضافي ${n} ${suffix}`,
    branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 0,
    housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('D'), hrEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id, basicSalary: 9000, ...employee })
  const user = (employee, suffix, role = 'employee', permissions = []) => repo('User').save({
    email: `${n}-${suffix}@payroll-ot.invalid`, displayName: employee.fullName, employeeId: employee.id,
    branchId: branch.id, passwordHash: 'isolated-test-token-only', role, permissions: JSON.stringify(permissions),
  })
  const owner = await user(emp, 'owner')
  const manager = await user(managerEmployee, 'manager', 'employee', ['requests.view_all'])
  const head = await user(headEmployee, 'head', 'employee', ['requests.view_all'])
  const hr = await user(hrEmployee, 'hr', 'hr_manager', ['requests.view_all', 'attendance.manage', 'attendance.view_all', 'requests.create_on_behalf'])
  const saved = await request(admin, 'POST', '/catalogs/shifts', {
    name: `وردية اختبار إضافي ${n}`, startTime: '08:00', endTime: '17:00', shiftMode: 'fixed', graceMinutes: 0,
    flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'تعريف وردية مؤرخة لاختبار أدلة الإضافي', ...shift,
  })
  assert.equal(saved.status, 201, JSON.stringify(saved.body))
  const f = { emp, branch, department, owner, manager, head, hr, source: saved.body, day }
  await assign(f, day)
  return f
}
async function assign(f, day = f.day) {
  const assigned = await request(f.hr, 'POST', '/attendance/schedule/day', { employeeId: f.emp.id, date: day, shiftId: f.source.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
}
async function punches(f, start, end, { day = f.day, endDay = day } = {}) {
  assert.ok(day <= today && endDay <= today, 'Fixtures must never fabricate future attendance')
  const values = [[day, start], ...(end ? [[endDay, end]] : [])].map(([date, clock]) => ({
    employeeCode: f.emp.employeeCode, timestamp: new Date(`${date}T${clock}:00`).toISOString(),
  }))
  const result = await request(f.hr, 'POST', '/attendance/punches/manual', { punches: values, reason: 'بصمات فعلية لقبول الإضافي في قاعدة معزولة' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  return repo('AttendanceDay').findOneByOrFail({ employeeId: f.emp.id, date: day })
}
async function preview(f, day = f.day, actor = f.owner, employeeId) {
  const response = await request(actor, 'GET', `/attendance/overtime/preview?date=${day}${employeeId === undefined ? '' : `&employeeId=${employeeId}`}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function window(f, effect, extra = {}) {
  const response = await request(extra.branchId === null ? admin : f.hr, 'POST', '/attendance/overtime-periods', { name: `نافذة ${effect} للاختبار`,
    fromDate: f.day, toDate: f.day, branchId: f.branch.id, effect, isActive: true, ...extra })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
const submit = (f, extra = {}) => request(f.owner, 'POST', '/requests', {
  typeCode: 'OVERTIME', submit: true, payload: { date: f.day, hours: 3, reason: 'عمل إضافي موثق بعد انتهاء الوردية', ...extra },
})
const decide = (actor, id, extra = {}) => request(actor, 'POST', `/requests/${id}/act`, {
  action: 'APPROVE', comment: 'مراجعة ساعات الإضافي وأدلتها', ...extra,
})
async function complete(f, pending, final = {}) {
  let result
  for (const [index, actor] of [f.manager, f.head, f.hr].entries()) {
    result = await decide(actor, pending.id, index === 2 ? final : {})
    assert.equal(result.status, 201, JSON.stringify(result.body))
    assert.equal(result.body.status, index === 2 ? 'COMPLETED' : 'UNDER_REVIEW')
    if (index < 2) assert.equal(result.body.currentStep, index + 2)
  }
  return repo('OvertimeEntry').findOneByOrFail({ requestId: pending.id })
}
async function counts(f) {
  return { requests: await repo('Request').count({ where: { requesterId: f.emp.id } }),
    entries: await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }),
    approvals: await repo('RequestApproval').count(), claims: await repo('OvertimeDayClaim').count(), events: await repo('OvertimeEntryEvent').count() }
}
const claimsFor = f => repo('OvertimeDayClaim').find({ where: { employeeId: f.emp.id, workDate: f.day }, order: { id: 'ASC' } })
async function payroll(f, period = f.day.slice(0, 7), extra = {}) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: [f.emp.id], name: 'مسير قبول مصادر الإضافي', ...extra,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  const item = response.body.items.find(row => row.employeeId === f.emp.id)
  assert.ok(item)
  return { run: response.body, item, breakdown: toObject(item.breakdown) }
}
async function payPayroll(run) {
  const approved = await request(financeApprover, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const paid = await request(financeApprover, 'POST', `/payroll/runs/${run.id}/pay`)
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
  return paid.body
}
const monthAfter = period => {
  const [year, month] = period.split('-').map(Number)
  return isoDate(new Date(year, month, 1, 12)).slice(0, 7)
}
async function concurrentBehindEmployeeLock(f, actions) {
  // حاجز SQL فعلي يجعل الطلبات تنتظر قفل الموظف نفسه قبل تحريرها، دون استبدال
  // أي خدمة أو دالة في التطبيق ودون الاعتماد على اختلاف سرعة طلبات الشبكة.
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const locked = await runner.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @result AS lockResult;`, [`hr:employee-finance:${f.emp.id}`])
    assert.ok(numeric(locked[0].lockResult) >= 0)
    pending = actions.map(action => action())
    const deadline = Date.now() + 6000
    let waiting = []
    while (Date.now() < deadline) {
      // SQL قد يضع المنتظر الثاني خلف الأول؛ نتتبع السلسلة كاملة ونظل نطلب
      // دليلاً على انتظار كل عملية فعلياً داخل قاعدة الاختبار نفسها.
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type
          FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth
          FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL
          SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiting = result.recordset
      if (waiting.length >= actions.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiting.length >= actions.length, `Expected ${actions.length} actual SQL waiters, observed ${JSON.stringify(waiting)}`)
    process.stdout.write(`# SQL barrier ${actions.length} operations: ${JSON.stringify(waiting)}\n`)
    await runner.commitTransaction(); committed = true
    return await Promise.all(pending)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_ot_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  const makeAdmin = email => repo('User').save({ email, displayName: 'مراجع اختبار الإضافي', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  admin = await makeAdmin('admin@payroll-ot.invalid'); financeApprover = await makeAdmin('finance@payroll-ot.invalid')
  const chain = await repo('ApprovalChain').save({ code: 'OT_HTTP_THREE', nameAr: 'مدير ثم رئيس قسم ثم موارد بشرية',
    requestTypeCode: 'OVERTIME', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([
    { chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'department_manager_of_requester' },
    { chainId: chain.id, stepOrder: 3, approverRole: 'hr' },
  ])
  for (const [code, destinationHandler] of [['OVERTIME', 'overtime_entries'], ['OVERTIME_AUTO', 'overtime_auto']]) {
    const old = await repo('RequestType').findOneBy({ code })
    await repo('RequestType').save({ ...old, code, nameAr: code === 'OVERTIME' ? 'عمل إضافي' : 'إضافي مكتشف', category: 'time_attendance',
      destinationHandler, approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(code === 'OVERTIME' ? ['date', 'hours'] : []) })
  }
  await repo('RequestsConfig').save([
    { key: 'overtime.enabled', value: 'false' }, { key: 'overtime.biometric_requires_confirmation', value: 'true' },
    { key: 'overtime.detection_threshold_hours', value: '0.5' },
    { key: 'overtime.multiplier_weekday', value: '1.5' }, { key: 'overtime.multiplier_weekend', value: '1.75' },
    { key: 'overtime.multiplier_holiday', value: '2' },
    { key: 'overtime.rounding_minutes', value: '15' }, { key: 'overtime.rounding_direction', value: 'DOWN' },
    { key: 'overtime.max_hours_per_day', value: '0' }, { key: 'overtime.max_hours_per_week', value: '0' },
    { key: 'overtime.max_hours_per_month', value: '0' }, { key: 'overtime.request_backdate_days', value: '30' },
    { key: 'overtime.max_closed_periods', value: '1' }, { key: 'overtime.allow_early_overtime', value: 'false' },
    { key: 'overtime.missing_punch_policy', value: 'BLOCK' }, { key: 'overtime.leave_conflict_policy', value: 'BLOCK' },
    { key: 'overtime.wage_components', value: 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER' },
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'attendance.grace_minutes', value: '0' }, { key: 'attendance.flex.shortfall_grace_minutes', value: '10' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  ])
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_ot_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-ot-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Overtime fixture cleanup failed')
})

test('OT-06 preview: closed-window 07:52–19:20 over an 08:00–17:00 shift exposes 140 raw and 135 rounded minutes without writes', async t => {
  const f = await fixture()
  await punches(f, '07:52', '19:20')
  const before = await counts(f), beforeDays = await repo('AttendanceDay').find({ where: { employeeId: f.emp.id } })
  const evidence = await preview(f)
  assert.equal(evidence.schemaVersion, 1); assert.equal(evidence.employeeId, f.emp.id); assert.equal(evidence.workDate, f.day)
  assert.equal(evidence.evidenceMode, 'PUNCH'); assert.equal(evidence.dayKind, 'WEEKDAY')
  assert.equal(evidence.checkIn, '07:52'); assert.equal(evidence.checkOut, '19:20')
  assert.ok(evidence.firstIn); assert.ok(evidence.lastOut)
  assert.equal(evidence.schedule.start, '08:00'); assert.equal(evidence.schedule.end, '17:00')
  assert.equal(evidence.schedule.sourceId, f.source.id); assert.ok(evidence.schedule.sourceVersionId)
  assert.equal(evidence.rawMinutes, 140); assert.equal(evidence.detectedMinutes, 135)
  assert.equal(evidence.policy.thresholdMinutes, 30); assert.equal(evidence.policy.roundingMinutes, 15)
  assert.equal(evidence.policy.roundingDirection, 'DOWN'); assert.equal(evidence.policy.multiplier, 1.5)
  assert.equal(evidence.window.open, false); assert.ok(evidence.fingerprint)
  assert.deepEqual(await counts(f), before)
  assert.deepEqual(await repo('AttendanceDay').find({ where: { employeeId: f.emp.id } }), beforeDays)
  t.diagnostic('Manual: max(19:20−17:00,0)=140; floor(140/15)×15=135min=2.25h; 9000/30/8×1.5×2.25=126.56.')
})

test('OT-03 preview: threshold precedes rounding and 155 raw minutes become exactly 150', async () => {
  for (const [out, raw, detected] of [['17:25', 25, 0], ['17:30', 30, 30], ['19:35', 155, 150]]) {
    const f = await fixture()
    await punches(f, '08:00', out)
    const evidence = await preview(f)
    assert.equal(evidence.rawMinutes, raw); assert.equal(evidence.detectedMinutes, detected)
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }), 0)
  }
})

test('OT-06 preview: no evidence, incomplete checkout and a future date prevent submission without request or entry orphans', async () => {
  for (const mode of ['none', 'missing_checkout', 'future']) {
    const f = await fixture()
    if (mode === 'missing_checkout') await punches(f, '08:00', null)
    const day = mode === 'future' ? dateAfter(today, 1) : f.day
    const evidence = await preview(f, day)
    assert.equal(evidence.detectedMinutes, 0); assert.equal(evidence.canSubmit, false)
    assert.ok(evidence.blockers.length > 0)
    const before = await counts(f)
    const result = await submit(f, { date: day })
    assert.equal(result.status, 400, JSON.stringify(result.body))
    assert.deepEqual(await counts(f), before)
    assert.equal(await repo('AttendanceDay').count({ where: { employeeId: f.emp.id, date: dateAfter(today, 1) } }), 0)
  }
})

test('OT-02 preview: a company closure governs over a branch opening and exposes its identifier', async () => {
  const f = await fixture(), outsider = await fixture()
  await punches(f, '08:00', '19:35')
  const opened = await window(f, 'OPEN')
  assert.equal((await preview(f)).window.open, true)
  assert.equal((await preview(outsider)).window.open, false)
  const closed = await window(f, 'CLOSED', { branchId: null, name: 'إغلاق عام يغلب فتح الفرع' })
  const evidence = await preview(f)
  assert.equal(evidence.window.open, false)
  assert.ok(evidence.window.governingWindowIds.includes(closed.id))
  assert.ok(evidence.window.reason)
  await repo('OvertimePeriod').delete([opened.id, closed.id])
})

test('OT-07 preview: a scoped public holiday counts the full eight worked hours and leaves other countries unchanged', async () => {
  const f = await fixture(), outsider = await fixture()
  const holiday = await repo('PublicHoliday').save({ name: 'عطلة اختبار إضافي', date: f.day, endDate: f.day, country: f.branch.country })
  await punches(f, '08:00', '16:00')
  await punches(outsider, '08:00', '16:00')
  const evidence = await preview(f)
  assert.equal(evidence.dayKind, 'HOLIDAY'); assert.equal(evidence.rawMinutes, 480); assert.equal(evidence.detectedMinutes, 480)
  assert.equal(evidence.policy.multiplier, 2)
  assert.equal((await preview(outsider)).dayKind, 'WEEKDAY')
  await repo('PublicHoliday').delete(holiday.id)
})

test('OT-03 preview: night overtime belongs to the starting work date and flex compensation creates no overtime', async () => {
  const night = await fixture({ shift: { startTime: '22:00', endTime: '06:00', requiredWorkMinutes: 480 } })
  await punches(night, '22:00', '08:00', { endDay: dateAfter(night.day, 1) })
  const evidence = await preview(night)
  assert.equal(evidence.workDate, night.day); assert.equal(evidence.checkIn, '22:00'); assert.equal(evidence.checkOut, '08:00')
  assert.equal(evidence.rawMinutes, 120); assert.equal(evidence.detectedMinutes, 120)
  const flex = await fixture({ shift: { startTime: '09:00', endTime: '18:00', flexEnabled: true, flexWindowMinutes: 60 } })
  await punches(flex, '09:30', '18:30')
  const compensated = await preview(flex)
  assert.equal(compensated.schedule.flexEnabled, true)
  assert.equal(compensated.rawMinutes, 0); assert.equal(compensated.detectedMinutes, 0)
  assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: flex.emp.id } }), 0)
})

test('OT-06 preview scope: an employee cannot inspect another employee and a branch manager cannot inspect another branch', async () => {
  const f = await fixture(), outsider = await fixture()
  for (const actor of [f.owner, f.hr]) {
    const denied = await request(actor, 'GET', `/attendance/overtime/preview?date=${outsider.day}&employeeId=${outsider.emp.id}`)
    assert.ok([403, 404].includes(denied.status), JSON.stringify(denied.body))
  }
  const allowed = await preview(f, f.day, f.hr, f.emp.id)
  assert.equal(allowed.employeeId, f.emp.id)
})

test('OT-04/06 request: requested three hours remain pending through all three actual approvers and pay only 135 evidence minutes', async t => {
  const f = await fixture()
  await punches(f, '07:52', '19:20')
  const result = await submit(f)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.status, 'UNDER_REVIEW'); assert.equal(result.body.currentStep, 1)
  const entry = await repo('OvertimeEntry').findOneByOrFail({ requestId: result.body.id })
  assert.equal(entry.status, 'SUBMITTED'); assert.equal(entry.source, 'PRE_REQUESTED')
  const claims = await claimsFor(f)
  assert.equal(claims.length, 1); assert.equal(claims[0].entryId, entry.id); assert.equal(claims[0].releasedAt, null)
  assert.equal(numeric(entry.hoursRequested), 3)
  assert.equal(numeric(entry.payableHours ?? 0), 0)
  const resolved = toObject((await repo('Request').findOneByOrFail({ id: result.body.id })).resolvedSteps)
  assert.deepEqual(resolved.map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  for (const [index, actor] of [f.manager, f.head, f.hr].entries()) {
    const response = await decide(actor, result.body.id)
    assert.equal(response.status, 201, JSON.stringify(response.body))
    const current = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
    if (index < 2) {
      assert.equal(response.body.status, 'UNDER_REVIEW'); assert.equal(response.body.currentStep, index + 2)
      assert.equal(current.status, 'SUBMITTED'); assert.equal(numeric(current.payableHours ?? 0), 0)
    } else {
      assert.equal(response.body.status, 'COMPLETED'); assert.equal(current.status, 'APPROVED')
      assert.equal(numeric(current.approvedMinutes), 135); assert.equal(numeric(current.payableHours), 2.25)
      assert.equal(numeric(current.hourlyRateSnapshot), 37.5); assert.equal(numeric(current.rate), 1.5)
      assert.equal(numeric(current.amountSnapshot), 126.56)
      assert.ok(toObject(current.calculationSnapshot).approval)
    }
    assert.equal(await repo('OvertimeEntry').count({ where: { requestId: result.body.id } }), 1)
  }
  const actions = await repo('RequestApproval').find({ where: { requestId: result.body.id }, order: { id: 'ASC' } })
  assert.deepEqual(actions.map(action => action.action), ['APPROVED', 'APPROVED', 'APPROVED'])
  assert.equal(new Set(actions.map(action => action.approverId)).size, 3, 'Each sequential step must identify its actual different approver')
  const event = await repo('OvertimeEntryEvent').findOneByOrFail({ entryId: entry.id, eventType: 'APPROVED' })
  assert.equal(event.actorUserId, f.hr.id); assert.equal(numeric(event.payload.approval.amount), 126.56)
  assert.deepEqual(await claimsFor(f), claims)
  t.diagnostic('Manual: request180min, evidence135min ⇒ approved135min=2.25h; frozen37.50×1.50×2.25=126.56.')
})

test('OT-04 request: rejection at step two stops the third step and a new request retains the rejected predecessor', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const result = await submit(f)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const first = await decide(f.manager, result.body.id)
  assert.equal(first.status, 201); assert.equal(first.body.currentStep, 2)
  const deniedWithoutReason = await decide(f.head, result.body.id, { action: 'REJECT', comment: '   ' })
  assert.equal(deniedWithoutReason.status, 400, JSON.stringify(deniedWithoutReason.body))
  const rejected = await decide(f.head, result.body.id, { action: 'REJECT', comment: 'لا يعتمد الطلب قبل توضيح مهمة العمل' })
  assert.equal(rejected.status, 201, JSON.stringify(rejected.body)); assert.equal(rejected.body.status, 'REJECTED')
  const oldEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: result.body.id })
  assert.equal(oldEntry.status, 'REJECTED'); assert.equal(numeric(oldEntry.payableHours ?? 0), 0)
  assert.ok((await claimsFor(f)).every(claim => claim.releasedAt !== null))
  const actions = await repo('RequestApproval').find({ where: { requestId: result.body.id }, order: { id: 'ASC' } })
  assert.deepEqual(actions.map(action => action.action), ['APPROVED', 'REJECTED'])
  const third = await decide(f.hr, result.body.id)
  assert.ok([400, 409].includes(third.status), JSON.stringify(third.body))
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: oldEntry.id }), oldEntry)
  assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: result.body.id }, order: { id: 'ASC' } }), actions)
  const again = await submit(f, { reason: 'طلب جديد بعد استكمال توضيح المهمة' })
  assert.equal(again.status, 201, JSON.stringify(again.body)); assert.notEqual(again.body.id, result.body.id)
  const newEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: again.body.id })
  assert.notEqual(newEntry.id, oldEntry.id); assert.equal(newEntry.status, 'SUBMITTED')
  assert.deepEqual((await claimsFor(f)).filter(claim => claim.releasedAt === null).map(claim => claim.entryId), [newEntry.id])
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: oldEntry.id }), oldEntry)
})

test('OT-04 request: explicit reduction requires its permission and reason and cannot exceed detected minutes', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  for (const actor of [f.manager, f.head]) assert.equal((await decide(actor, pending.body.id)).status, 201)
  const beforeEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  const beforeRequest = await repo('Request').findOneByOrFail({ id: pending.body.id })
  const beforeActions = await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } })
  const unauthorized = await decide(f.hr, pending.body.id, { approvedMinutes: 120, reductionReason: 'تقليل المعتمد إلى ساعتين' })
  assert.equal(unauthorized.status, 403, JSON.stringify(unauthorized.body))
  f.hr.permissions = JSON.stringify([...JSON.parse(f.hr.permissions), 'overtime.adjust'])
  await repo('User').update(f.hr.id, { permissions: f.hr.permissions })
  for (const adjustment of [{ approvedMinutes: 120 }, { approvedMinutes: 120, reductionReason: '   ' },
    { approvedMinutes: 151, reductionReason: 'تجاوز غير مقبول للأدلة' }, { approvedMinutes: -1, reductionReason: 'قيمة غير صالحة' }]) {
    const rejected = await decide(f.hr, pending.body.id, adjustment)
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: beforeEntry.id }), beforeEntry)
    assert.deepEqual(await repo('Request').findOneByOrFail({ id: pending.body.id }), beforeRequest)
    assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } }), beforeActions)
  }
  const approved = await decide(f.hr, pending.body.id, { approvedMinutes: 120, reductionReason: 'اعتماد ساعتين فقط من وقت العمل المثبت' })
  assert.equal(approved.status, 201, JSON.stringify(approved.body)); assert.equal(approved.body.status, 'COMPLETED')
  const entry = await repo('OvertimeEntry').findOneByOrFail({ id: beforeEntry.id })
  assert.equal(numeric(entry.approvedMinutes), 120); assert.equal(numeric(entry.payableHours), 2)
  assert.equal(numeric(entry.amountSnapshot), 112.5)
  const snapshot = toObject(entry.calculationSnapshot)
  assert.equal(snapshot.submission.evidence.detectedMinutes, 150)
  assert.ok(JSON.stringify(snapshot).includes('اعتماد ساعتين فقط من وقت العمل المثبت'))
})

test('OT-06 request: a closed-window reason is mandatory and autoApprove with no steps cannot mint approved overtime', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:20')
  for (const reason of [undefined, '', '  ']) {
    const before = await counts(f)
    const result = await submit(f, { reason })
    assert.equal(result.status, 400, JSON.stringify(result.body)); assert.deepEqual(await counts(f), before)
  }
  const type = await repo('RequestType').findOneByOrFail({ code: 'OVERTIME' })
  const chain = await repo('ApprovalChain').save({ code: 'OT_FORBIDDEN_AUTO', nameAr: 'اختبار رفض الإضافي بلا اعتماد',
    requestTypeCode: 'OVERTIME', isActive: true, autoApprove: true })
  try {
    await repo('RequestType').update(type.id, { approvalChainId: chain.id })
    const before = await counts(f)
    const result = await submit(f)
    assert.equal(result.status, 400, JSON.stringify(result.body)); assert.deepEqual(await counts(f), before)
  } finally { await repo('RequestType').save(type) }
})

test('OT-10 request: employee cancellation releases the active day while preserving its cancelled audit and allows a fresh submission', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:20')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const cancelled = await request(f.owner, 'POST', `/requests/${pending.body.id}/cancel`, {})
  assert.equal(cancelled.status, 201, JSON.stringify(cancelled.body)); assert.equal(cancelled.body.status, 'CANCELLED')
  const old = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  assert.equal(old.status, 'CANCELLED')
  assert.ok((await claimsFor(f)).every(claim => claim.releasedAt !== null))
  const again = await submit(f)
  assert.equal(again.status, 201, JSON.stringify(again.body))
  assert.notEqual(again.body.id, pending.body.id)
  const current = await repo('OvertimeEntry').findOneByOrFail({ requestId: again.body.id })
  assert.equal(current.status, 'SUBMITTED'); assert.notEqual(current.id, old.id)
  assert.deepEqual((await claimsFor(f)).filter(claim => claim.releasedAt === null).map(claim => claim.entryId), [current.id])
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.id }), old)
})

test('OT-08 request: approved price, evidence and day kind remain frozen after salary, multiplier, holiday and attendance changes', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body)
  assert.equal(numeric(entry.amountSnapshot), 140.63); assert.equal(numeric(entry.hourlyRateSnapshot), 37.5)
  const salaryEdit = await request(admin, 'PATCH', `/employees/${f.emp.id}`, { basicSalary: 18000 })
  assert.equal(salaryEdit.status, 200, JSON.stringify(salaryEdit.body))
  const holiday = await repo('PublicHoliday').save({ name: 'تعديل تقويم لاحق لاعتماد الإضافي', date: f.day, country: f.branch.country })
  try {
    await configDuring({ 'overtime.multiplier_weekday': 3, 'overtime.multiplier_holiday': 4 }, async () => {
      await punches(f, '08:00', '21:00')
      const recompute = await request(f.hr, 'POST', `/attendance/recompute?date=${f.day}`)
      assert.equal(recompute.status, 201, JSON.stringify(recompute.body))
      assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), entry,
        'Approved evidence, minutes and price must not follow later mutable inputs')
    })
  } finally { await repo('PublicHoliday').delete(holiday.id) }
})

test('OT-10 concurrency: two simultaneous submissions acquire only one active employee-day record and later discovery cannot duplicate it', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const results = await concurrentBehindEmployeeLock(f, [() => submit(f), () => submit(f)])
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409], JSON.stringify(results))
  const winning = results.find(result => result.status === 201)
  let entries = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id, date: f.day } })
  assert.equal(entries.length, 1); assert.equal(entries[0].requestId, winning.body.id); assert.equal(entries[0].status, 'SUBMITTED')
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 1)
  const original = entries[0]
  await configDuring({ 'overtime.enabled': true }, async () => {
    for (let index = 0; index < 2; index++) {
      const response = await request(f.hr, 'POST', `/attendance/recompute?date=${f.day}`)
      assert.equal(response.status, 201, JSON.stringify(response.body))
      assert.equal(response.body.failed, 0)
    }
  })
  entries = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id, date: f.day } })
  assert.equal(entries.length, 1); assert.equal(entries[0].id, original.id); assert.equal(entries[0].requestId, winning.body.id)
  assert.deepEqual((await claimsFor(f)).filter(claim => claim.releasedAt === null).map(claim => claim.entryId), [original.id])
}, { timeout: 30000 })

test('OT-10 concurrency: simultaneous discovery and two employee submissions leave one active source and no unlinked request', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  await configDuring({ 'overtime.enabled': true }, async () => {
    const results = await concurrentBehindEmployeeLock(f, [() => submit(f), () => submit(f),
      () => request(f.hr, 'POST', `/attendance/recompute?date=${f.day}`)])
    assert.equal(results[2].status, 201, JSON.stringify(results))
    assert.equal(results[2].body.failed, 0)
    assert.ok(results.slice(0, 2).every(result => [201, 409].includes(result.status)), JSON.stringify(results))
    assert.ok(results.slice(0, 2).filter(result => result.status === 201).length <= 1)
    const entries = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id, date: f.day } })
    assert.equal(entries.length, 1)
    assert.ok(['DETECTED', 'SUBMITTED'].includes(entries[0].status))
    const requests = await repo('Request').find({ where: { requesterId: f.emp.id } })
    assert.ok(requests.every(row => row.id === entries[0].requestId), 'The losing concurrent submit must roll back its request row')
    assert.equal(numeric(entries[0].payableHours ?? 0), 0)
    assert.deepEqual((await claimsFor(f)).filter(claim => claim.releasedAt === null).map(claim => claim.entryId), [entries[0].id])
  })
}, { timeout: 30000 })

test('OT-05 discovery: disabling the legacy confirmation flag cannot directly approve or pay discovered overtime', async () => {
  const f = await fixture()
  await configDuring({ 'overtime.enabled': true, 'overtime.biometric_requires_confirmation': false }, async () => {
    await punches(f, '08:00', '19:35')
    const entries = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id, date: f.day } })
    assert.equal(entries.length, 1); assert.equal(entries[0].source, 'BIOMETRIC_DETECTED')
    assert.ok(['DETECTED', 'SUBMITTED'].includes(entries[0].status))
    assert.equal(numeric(entries[0].payableHours ?? 0), 0)
    assert.equal(entries[0].amountSnapshot, null)
    const existing = await preview(f)
    assert.equal(existing.existingRecord.id, entries[0].id); assert.equal(existing.canSubmit, false)
    const duplicate = await submit(f)
    assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body))
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id, date: f.day } }), 1)
  })
})

test('OT-04 discovery: punch commit routes immediately and catch-up cannot duplicate the three-step workflow', async () => {
  const f = await fixture()
  await configDuring({ 'overtime.enabled': true }, async () => {
    await punches(f, '08:00', '19:35')
    const original = await repo('OvertimeEntry').findOneByOrFail({ employeeId: f.emp.id, date: f.day })
    assert.equal(original.status, 'SUBMITTED')
    assert.ok(original.requestId)
    for (let index = 0; index < 2; index++) {
      const routed = await request(admin, 'POST', '/requests/engine/reconcile-overtime')
      assert.equal(routed.status, 201, JSON.stringify(routed.body))
      assert.equal(routed.body.routed, 0)
    }
    const entry = await repo('OvertimeEntry').findOneByOrFail({ id: original.id })
    assert.equal(entry.status, 'SUBMITTED'); assert.ok(entry.requestId)
    const pending = await repo('Request').findOneByOrFail({ id: entry.requestId })
    assert.equal(pending.typeCode, 'OVERTIME_AUTO'); assert.equal(pending.status, 'UNDER_REVIEW')
    assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 1)
    const approved = await complete(f, pending)
    assert.equal(approved.id, original.id); assert.equal(approved.source, 'BIOMETRIC_DETECTED')
    assert.equal(numeric(approved.approvedMinutes), 150); assert.equal(numeric(approved.amountSnapshot), 140.63)
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id, date: f.day } }), 1)
  })
})

test('EX-11 overtime: eligible exemption uses explicit manager and HR approval without any biometric evidence or invented actual hours', async () => {
  const f = await fixture()
  const exemption = await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'مستثنى مؤهل لإضافي صريح في قاعدة اختبار', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  const evidence = await preview(f)
  assert.equal(evidence.evidenceMode, 'EXEMPT_APPROVAL'); assert.equal(evidence.exemptionId, exemption.id)
  assert.equal(evidence.rawMinutes, 0); assert.equal(evidence.detectedMinutes, 0)
  assert.equal(evidence.firstIn, null); assert.equal(evidence.lastOut, null)
  const pending = await submit(f, { hours: 2 })
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const approved = await complete(f, pending.body)
  assert.equal(approved.status, 'APPROVED'); assert.equal(approved.source, 'PRE_REQUESTED')
  assert.equal(numeric(approved.approvedMinutes), 120); assert.equal(numeric(approved.payableHours), 2)
  assert.equal(approved.hoursActual, null); assert.equal(numeric(approved.amountSnapshot), 112.5)
  assert.equal(toObject(approved.calculationSnapshot).submission.evidence.evidenceMode, 'EXEMPT_APPROVAL')
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: f.emp.id } }), 0)
  assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id, source: 'BIOMETRIC_DETECTED' } }), 0)
})

test('EX-11 overtime: ineligible exemption rejects submission and eligibility revoked before final approval rolls back the final decision', async () => {
  const f = await fixture()
  const exemption = await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'التحقق من حدود استحقاق إضافي المستثنى', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: false })
  const before = await counts(f), rejected = await submit(f, { hours: 2 })
  assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.deepEqual(await counts(f), before)
  await repo('AttendanceExemption').update(exemption.id, { overtimeEligibleOverride: true })
  const pending = await submit(f, { hours: 2 })
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  for (const actor of [f.manager, f.head]) assert.equal((await decide(actor, pending.body.id)).status, 201)
  const entry = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  const requestBefore = await repo('Request').findOneByOrFail({ id: pending.body.id })
  const approvalsBefore = await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } })
  await repo('AttendanceExemption').update(exemption.id, { overtimeEligibleOverride: false })
  const final = await decide(f.hr, pending.body.id)
  assert.equal(final.status, 409, JSON.stringify(final.body))
  assert.equal(final.body.code, 'OVERTIME_EVIDENCE_CHANGED')
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), entry)
  assert.deepEqual(await repo('Request').findOneByOrFail({ id: pending.body.id }), requestBefore)
  assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } }), approvalsBefore)
})

test('OT-10 return: changed evidence cannot be approved until return and resubmit refresh the same claimed entry', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:20')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const original = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id }), claim = await claimsFor(f)
  await punches(f, '08:00', '19:35')
  const denied = await decide(f.manager, pending.body.id)
  assert.equal(denied.status, 409, JSON.stringify(denied.body)); assert.equal(denied.body.code, 'OVERTIME_EVIDENCE_CHANGED')
  const returned = await decide(f.manager, pending.body.id, { action: 'RETURN', comment: 'تغيرت البصمة ويرجى إعادة تقديم الأدلة الحالية' })
  assert.equal(returned.status, 201, JSON.stringify(returned.body)); assert.equal(returned.body.status, 'RETURNED_FOR_INFO')
  assert.deepEqual(await claimsFor(f), claim)
  const duplicate = await submit(f)
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body))
  const ownPreviewUrl = `/attendance/overtime/preview?date=${f.day}&requestId=${pending.body.id}`
  const ownPreview = await request(f.owner, 'GET', ownPreviewUrl)
  assert.equal(ownPreview.status, 200, JSON.stringify(ownPreview.body))
  assert.equal(ownPreview.body.resubmission, true); assert.equal(ownPreview.body.canSubmit, true)
  assert.equal(ownPreview.body.existingRecord.id, original.id)
  const wrongDate = await request(f.owner, 'GET', `/attendance/overtime/preview?date=${dateAfter(f.day, 1)}&requestId=${pending.body.id}`)
  assert.equal(wrongDate.status, 400, JSON.stringify(wrongDate.body))
  const intruder = await request(f.head, 'GET', `${ownPreviewUrl}&employeeId=${f.emp.id}`)
  assert.equal(intruder.status, 403, JSON.stringify(intruder.body))
  const leave = await repo('Leave').save({ employeeId: f.emp.id, leaveTypeCode: 'ANNUAL', fromDate: f.day, toDate: f.day,
    days: 1, period: 'FULL', status: 'APPROVED' })
  try {
    const blocked = await request(f.owner, 'GET', ownPreviewUrl)
    assert.equal(blocked.status, 200, JSON.stringify(blocked.body)); assert.equal(blocked.body.canSubmit, false)
    assert.ok(blocked.body.blockers.some(blocker => /LEAVE/.test(blocker.code)), JSON.stringify(blocked.body.blockers))
    assert.deepEqual(await claimsFor(f), claim)
  } finally { await repo('Leave').delete(leave.id) }
  const refreshed = await request(f.owner, 'POST', `/requests/${pending.body.id}/resubmit`, {
    payload: { date: f.day, hours: 3, reason: 'إعادة التقديم بعد اكتمال بصمة الانصراف' },
  })
  assert.equal(refreshed.status, 201, JSON.stringify(refreshed.body)); assert.equal(refreshed.body.status, 'UNDER_REVIEW')
  const updated = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  assert.equal(updated.id, original.id); assert.deepEqual(await claimsFor(f), claim)
  assert.equal(toObject(updated.calculationSnapshot).submission.evidence.detectedMinutes, 150)
  assert.notEqual(toObject(updated.calculationSnapshot).submission.evidence.fingerprint, toObject(original.calculationSnapshot).submission.evidence.fingerprint)
  const approved = await complete(f, refreshed.body)
  assert.equal(numeric(approved.approvedMinutes), 150); assert.equal(numeric(approved.amountSnapshot), 140.63)
})

test('OT request integrity: client financial fields and cross-branch on-behalf submission are rejected without any orphan', async () => {
  const f = await fixture(), outsider = await fixture()
  await punches(f, '08:00', '19:20'); await punches(outsider, '08:00', '19:20')
  for (const forged of [{ approvedMinutes: 600 }, { amountSnapshot: 99999 }, { rate: 99 }, { status: 'APPROVED' },
    { employeeId: outsider.emp.id }, { calculationSnapshot: { approval: { amount: 99999 } } }]) {
    const before = await counts(f), rejected = await submit(f, forged)
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.deepEqual(await counts(f), before)
  }
  const before = await counts(outsider)
  const denied = await request(f.hr, 'POST', '/requests', { typeCode: 'OVERTIME', submit: true,
    onBehalfEmployeeId: outsider.emp.id, payload: { date: outsider.day, hours: 3, reason: 'محاولة نيابة عن فرع آخر' } })
  assert.equal(denied.status, 403, JSON.stringify(denied.body)); assert.deepEqual(await counts(outsider), before)
})

test('OT-06 request: the configured backdate limit blocks older evidence and approved leave blocks an otherwise complete punch pair', async () => {
  const f = await fixture({ day: dateAfter(workDate, -7) })
  await punches(f, '08:00', '19:20')
  await configDuring({ 'overtime.request_backdate_days': 1 }, async () => {
    const evidence = await preview(f)
    assert.equal(evidence.canSubmit, false)
    assert.ok(evidence.blockers.some(blocker => /BACKDATE/.test(blocker.code)), JSON.stringify(evidence.blockers))
    const before = await counts(f), rejected = await submit(f)
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.deepEqual(await counts(f), before)
  })
  const onLeave = await fixture()
  await punches(onLeave, '08:00', '19:20')
  await repo('Leave').save({ employeeId: onLeave.emp.id, leaveTypeCode: 'ANNUAL', fromDate: onLeave.day, toDate: onLeave.day,
    days: 1, period: 'FULL', status: 'APPROVED' })
  const evidence = await preview(onLeave)
  assert.equal(evidence.canSubmit, false)
  assert.ok(evidence.blockers.some(blocker => /LEAVE/.test(blocker.code)), JSON.stringify(evidence.blockers))
  const before = await counts(onLeave), rejected = await submit(onLeave)
  assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.deepEqual(await counts(onLeave), before)
})

test('OT-09 limits: daily cap preserves raw evidence and weekly approval cap rejects the second payable record atomically', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  await configDuring({ 'overtime.max_hours_per_day': 2 }, async () => {
    const evidence = await preview(f)
    assert.equal(evidence.rawMinutes, 155); assert.equal(evidence.detectedMinutes, 120)
    assert.ok(evidence.flags.some(flag => /CAP/.test(flag)), JSON.stringify(evidence.flags))
  })
  await configDuring({ 'overtime.max_hours_per_week': 3 }, async () => {
    const first = await submit(f, { hours: 2 })
    assert.equal(first.status, 201, JSON.stringify(first.body))
    const approved = await complete(f, first.body)
    assert.equal(numeric(approved.approvedMinutes), 120)
    const next = { ...f, day: dateAfter(f.day, 1) }
    await assign(next); await punches(next, '08:00', '19:20')
    const second = await submit(next, { hours: 2 })
    assert.equal(second.status, 201, JSON.stringify(second.body))
    for (const actor of [f.manager, f.head]) assert.equal((await decide(actor, second.body.id)).status, 201)
    const before = await repo('OvertimeEntry').findOneByOrFail({ requestId: second.body.id })
    const actions = await repo('RequestApproval').find({ where: { requestId: second.body.id }, order: { id: 'ASC' } })
    const rejected = await decide(f.hr, second.body.id)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: before.id }), before)
    assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: second.body.id }, order: { id: 'ASC' } }), actions)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: approved.id }), approved)
  })
})

test('OT-03 policy: early work is excluded by default and counts only when explicitly enabled', async () => {
  const f = await fixture()
  await punches(f, '07:00', '17:45')
  const normal = await preview(f)
  assert.equal(normal.rawMinutes, 45); assert.equal(normal.detectedMinutes, 45)
  await configDuring({ 'overtime.allow_early_overtime': true }, async () => {
    const early = await preview(f)
    assert.equal(early.policy.earlyOvertime, true)
    assert.equal(early.rawMinutes, 105); assert.equal(early.detectedMinutes, 105)
  })
})

test('OT-09 limits: monthly cap is enforced independently of a disabled weekly cap', async () => {
  const day = numeric(workDate.slice(-2)) === 1 ? dateAfter(workDate, -7) : dateAfter(workDate, -1)
  const f = await fixture({ day })
  await punches(f, '08:00', '19:20')
  await configDuring({ 'overtime.max_hours_per_week': 0, 'overtime.max_hours_per_month': 3 }, async () => {
    const first = await submit(f, { hours: 2 })
    assert.equal(first.status, 201, JSON.stringify(first.body))
    const approved = await complete(f, first.body)
    const next = { ...f, day: dateAfter(f.day, 1) }
    assert.equal(next.day.slice(0, 7), f.day.slice(0, 7))
    await assign(next); await punches(next, '08:00', '19:20')
    const second = await submit(next, { hours: 2 })
    assert.equal(second.status, 201, JSON.stringify(second.body))
    for (const actor of [f.manager, f.head]) assert.equal((await decide(actor, second.body.id)).status, 201)
    const before = await repo('OvertimeEntry').findOneByOrFail({ requestId: second.body.id })
    const count = await repo('RequestApproval').count({ where: { requestId: second.body.id } })
    const rejected = await decide(f.hr, second.body.id)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: before.id }), before)
    assert.equal(await repo('RequestApproval').count({ where: { requestId: second.body.id } }), count)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: approved.id }), approved)
  })
})

test('OT-05 payroll: pending approval contributes zero and recalculation after completed approval uses the frozen amount once', async () => {
  const f = await fixture()
  await punches(f, '07:52', '19:20')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const before = await payroll(f)
  assert.equal(numeric(before.item.overtimeAmount), 0); assert.equal(numeric(before.item.overtimeHours), 0)
  assert.deepEqual(before.breakdown.overtimeEntryIds, [])
  const pendingEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  const beforeDetail = await request(admin, 'GET', `/payroll/runs/${before.run.id}`)
  assert.equal(beforeDetail.status, 200, JSON.stringify(beforeDetail.body))
  assert.equal(beforeDetail.body.pendingOvertime.length, 1)
  const warning = beforeDetail.body.pendingOvertime[0]
  assert.equal(warning.id, pendingEntry.id); assert.equal(warning.employeeId, f.emp.id)
  assert.equal(warning.date, f.day); assert.equal(warning.status, 'SUBMITTED'); assert.equal(warning.requestId, pending.body.id)
  assert.equal(numeric(warning.detectedMinutes), 135); assert.equal(numeric(warning.requestedMinutes), 180)
  const entry = await complete(f, pending.body)
  const afterDetail = await request(admin, 'GET', `/payroll/runs/${before.run.id}`)
  assert.equal(afterDetail.status, 200, JSON.stringify(afterDetail.body)); assert.deepEqual(afterDetail.body.pendingOvertime, [])
  assert.equal(numeric(afterDetail.body.items.find(item => item.employeeId === f.emp.id).overtimeAmount), 0,
    'The pending list is live guidance and must not change the saved payroll calculation')
  const changed = await request(admin, 'PATCH', `/employees/${f.emp.id}`, { basicSalary: 18000 })
  assert.equal(changed.status, 200, JSON.stringify(changed.body))
  const after = await payroll(f, f.day.slice(0, 7), { runId: before.run.id, reason: 'إعادة المسير بعد اكتمال اعتماد الإضافي' })
  assert.equal(numeric(after.item.overtimeHours), 2.25); assert.equal(numeric(after.item.overtimeAmount), 126.56)
  assert.deepEqual(after.breakdown.overtimeEntryIds, [entry.id]); assert.equal(after.breakdown.overtime.length, 1)
  const line = after.breakdown.overtime[0]
  assert.equal(line.id, entry.id); assert.equal(line.date, f.day); assert.equal(line.originalPeriod, f.day.slice(0, 7))
  assert.equal(line.provenance, 'APPROVAL_SNAPSHOT'); assert.equal(numeric(line.hourlyRate), 37.5)
  assert.equal(numeric(line.multiplier), 1.5); assert.equal(numeric(line.amount), 126.56)
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), entry)
})

test('OT-08 payroll: a partial or corrupted approval snapshot blocks calculation instead of falling back to the employee current rate', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const approved = await complete(f, pending.body), original = await payroll(f)
  const beforeRun = await request(admin, 'GET', `/payroll/runs/${original.run.id}`)
  for (const corruption of [{ amountSnapshot: numeric(approved.amountSnapshot) + 1 },
    { calculationSnapshot: { schemaVersion: 1, submission: toObject(approved.calculationSnapshot).submission } }]) {
    try {
      await repo('OvertimeEntry').update(approved.id, corruption)
      const failed = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
        period: f.day.slice(0, 7), scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: original.run.id,
        reason: 'منع استبدال المسير عند تلف لقطة الإضافي',
      })
      assert.equal(failed.status, 409, JSON.stringify(failed.body))
      assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${original.run.id}`)).body, beforeRun.body)
    } finally { await repo('OvertimeEntry').save(approved) }
  }
})

test('OT-05 settlement boundary: payroll payment consumes an approved source once and settlement cannot claim it again', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body), result = await payroll(f)
  assert.equal(numeric(result.item.overtimeAmount), 140.63)
  await payPayroll(result.run)
  const consumed = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
  assert.equal(consumed.status, 'PAID'); assert.equal(consumed.payrollRunId, result.run.id)
  assert.equal(numeric(consumed.amountSnapshot), 140.63)
  const kase = await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day,
    status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const lines = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(lines.status, 201, JSON.stringify(lines.body))
  const settlement = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  assert.deepEqual(toObject(settlement.settlementFinancialSnapshot).overtime, [])
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), consumed)
})

test('OT-05 settlement boundary: settled overtime retains its approval price and is excluded from payroll', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body)
  const salary = await request(admin, 'PATCH', `/employees/${f.emp.id}`, { basicSalary: 18000 })
  assert.equal(salary.status, 200, JSON.stringify(salary.body))
  const kase = await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day,
    status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const recalc = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(recalc.status, 201, JSON.stringify(recalc.body))
  const prepared = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  const sources = toObject(prepared.settlementFinancialSnapshot).overtime
  assert.equal(sources.length, 1); assert.equal(sources[0].id, entry.id); assert.equal(numeric(sources[0].amount), 140.63)
  const approved = await request(financeApprover, 'POST', `/offboarding/${kase.id}/approve-settlement`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const result = await payroll(f)
  assert.equal(numeric(result.item.overtimeAmount), 0); assert.deepEqual(result.breakdown.overtimeEntryIds, [])
  const final = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  assert.deepEqual(toObject(final.settlementFinancialSnapshot).overtime, sources)
})

test('OT-05 retroactive: approval after a paid period enters the following payroll once with its original period and run reference', async () => {
  const now = new Date(), lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 12)
  let day = isoDate(lastMonthEnd)
  while (new Date(`${day}T12:00:00`).getDay() !== 3) day = dateAfter(day, -1)
  await configDuring({ 'overtime.request_backdate_days': 90 }, async () => {
    const f = await fixture({ day })
    await punches(f, '07:52', '19:20')
    const pending = await submit(f)
    assert.equal(pending.status, 201, JSON.stringify(pending.body))
    const original = await payroll(f)
    assert.equal(numeric(original.item.overtimeAmount), 0)
    await payPayroll(original.run)
    const entry = await complete(f, pending.body)
    assert.equal(entry.originalPeriod, original.run.period); assert.equal(entry.deferredFromRunId, original.run.id)
    const laterPeriod = monthAfter(original.run.period), later = await payroll(f, laterPeriod)
    assert.equal(numeric(later.item.overtimeAmount), 126.56)
    assert.deepEqual(later.breakdown.overtimeEntryIds, [entry.id])
    const line = later.breakdown.overtime.find(row => row.id === entry.id)
    assert.ok(line); assert.equal(line.originalPeriod, original.run.period); assert.equal(line.deferredFromRunId, original.run.id)
    assert.equal(line.date, day); assert.equal(numeric(line.amount), 126.56)
    await payPayroll(later.run)
    const consumed = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
    assert.equal(consumed.payrollRunId, later.run.id); assert.equal(consumed.status, 'PAID')
    const following = await payroll(f, monthAfter(laterPeriod))
    assert.equal(numeric(following.item.overtimeAmount), 0); assert.deepEqual(following.breakdown.overtimeEntryIds, [])
    const old = await request(admin, 'GET', `/payroll/runs/${original.run.id}`)
    assert.equal(numeric(old.body.items.find(item => item.employeeId === f.emp.id).overtimeAmount), 0)
  })
})

test('EX-11 legacy payroll: an approved explicit request supplies missing legacy payable hours consistently through calculation approval and payment', async () => {
  const f = await fixture()
  await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'اختبار توافق إضافي قديم لموظف مستثنى', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  // حالة قديمة مقصودة: طلب مكتمل بساعتين صريحتين وقيد معتمد بلا لقطة مالية
  // وبلا payableHours؛ يجب توحيد تفسيره دون ملء بيانات تاريخية بالتخمين.
  const oldRequest = await repo('Request').save({ typeCode: 'OVERTIME', requesterId: f.emp.id, branchId: f.branch.id,
    createdByUserId: f.owner.id, status: 'COMPLETED', currentStep: 3,
    payload: JSON.stringify({ date: f.day, hours: 2, reason: 'طلب قديم مكتمل لاعتماد ساعتين صريحتين' }) })
  const entry = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date: f.day, requestId: oldRequest.id,
    source: 'PRE_REQUESTED', status: 'APPROVED', hoursRequested: 2, hoursActual: null, payableHours: null, rate: 1.5,
    calculationSnapshot: null, approvedMinutes: null, hourlyRateSnapshot: null, amountSnapshot: null })
  const original = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
  const result = await payroll(f)
  assert.equal(numeric(result.item.overtimeHours), 2); assert.equal(numeric(result.item.overtimeAmount), 112.5)
  assert.deepEqual(result.breakdown.overtimeEntryIds, [entry.id])
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), original,
    'Calculation must not silently populate missing legacy payroll evidence')
  const approved = await request(financeApprover, 'POST', `/payroll/runs/${result.run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), original)
  const paid = await request(financeApprover, 'POST', `/payroll/runs/${result.run.id}/pay`)
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
  assert.deepEqual({ ...await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }) }, { ...original, status: 'PAID', payrollRunId: result.run.id })
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: f.emp.id } }), 0)
})

test('OT-08 corruption: settlement rejects a new approved source whose payable hours became null and preserves prepared lines', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body)
  const kase = await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day,
    status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const prepared = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(prepared.status, 201, JSON.stringify(prepared.body))
  const beforeCase = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  const beforeLines = await repo('SettlementLine').find({ where: { caseId: kase.id }, order: { id: 'ASC' } })
  try {
    // إفساد متعمد في قاعدة الاختبار: وجود لقطة جديدة يمنع إسقاط المصدر بصمت
    // لمجرد أن عمود الساعات القديم أصبح فارغاً، كما يمنع تفسيره كسجل قديم.
    await repo('OvertimeEntry').update(entry.id, { payableHours: null })
    const rejected = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('OffboardingCase').findOneByOrFail({ id: kase.id }), beforeCase)
    assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: kase.id }, order: { id: 'ASC' } }), beforeLines)
  } finally { await repo('OvertimeEntry').save(entry) }
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), entry)
})

test('OT-08 corruption: original-period or deferred-run markers alone cannot disguise a partial new snapshot as legacy data', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body), result = await payroll(f)
  const before = await request(admin, 'GET', `/payroll/runs/${result.run.id}`)
  assert.equal(before.status, 200, JSON.stringify(before.body))
  for (const marker of [{ originalPeriod: f.day.slice(0, 7), deferredFromRunId: null },
    { originalPeriod: null, deferredFromRunId: result.run.id }]) {
    try {
      await repo('OvertimeEntry').update(entry.id, { calculationSnapshot: null, approvedMinutes: null,
        hourlyRateSnapshot: null, amountSnapshot: null, ...marker })
      const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
        period: f.day.slice(0, 7), scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: result.run.id,
        reason: 'اختبار منع تفسير لقطة جزئية كسجل إضافي قديم',
      })
      assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
      assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${result.run.id}`)).body, before.body)
    } finally { await repo('OvertimeEntry').save(entry) }
  }
})

test('OT-08 corruption: missing payroll trace cannot hide an altered new overtime source from the approval guard', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const pending = await submit(f)
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body), result = await payroll(f)
  const originalItem = await repo('PayrollItem').findOneByOrFail({ id: result.item.id })
  const originalRun = await repo('PayrollRun').findOneByOrFail({ id: result.run.id })
  const periodClaims = await repo('PayrollPeriodClaim').count({ where: { runId: result.run.id } })
  try {
    const broken = toObject(originalItem.breakdown)
    delete broken.overtime
    await repo('PayrollItem').update(originalItem.id, { breakdown: JSON.stringify(broken) })
    await repo('OvertimeEntry').update(entry.id, { amountSnapshot: numeric(entry.amountSnapshot) + 1 })
    const brokenItem = await repo('PayrollItem').findOneByOrFail({ id: originalItem.id })
    const rejected = await request(financeApprover, 'POST', `/payroll/runs/${result.run.id}/approve`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.deepEqual(await repo('PayrollRun').findOneByOrFail({ id: result.run.id }), originalRun)
    assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: originalItem.id }), brokenItem)
    assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: result.run.id } }), periodClaims)
    assert.equal(await repo('PayrollRunEvent').count({ where: { runId: result.run.id, eventType: 'APPROVED' } }), 0)
  } finally {
    await repo('OvertimeEntry').save(entry)
    await repo('PayrollItem').save(originalItem)
  }
})

test('EX-11 legacy settlement: explicit approved hours supply 112.50 while old biometric overtime stays excluded and both sources remain unchanged', async () => {
  const f = await fixture(), biometricDate = dateAfter(f.day, -1)
  await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: biometricDate, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'اختبار اتساق إضافي المستثنى القديم في التصفية', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  const oldRequest = await repo('Request').save({ typeCode: 'OVERTIME', requesterId: f.emp.id, branchId: f.branch.id,
    createdByUserId: f.owner.id, status: 'COMPLETED', currentStep: 3,
    payload: JSON.stringify({ date: f.day, hours: 2, reason: 'طلب قديم مكتمل لساعتين صريحتين' }) })
  const explicit = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date: f.day, requestId: oldRequest.id,
    source: 'PRE_REQUESTED', status: 'APPROVED', hoursRequested: 2, hoursActual: null, payableHours: null, rate: 1.5 })
  const biometric = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date: biometricDate,
    source: 'BIOMETRIC_DETECTED', status: 'APPROVED', hoursActual: 4, payableHours: 4, rate: 1.5 })
  const originals = await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id }, order: { id: 'ASC' } })
  const kase = await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day,
    status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const result = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const saved = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  const snapshot = toObject(saved.settlementFinancialSnapshot)
  assert.equal(numeric(snapshot.overtimeAmount), 112.5)
  assert.equal(snapshot.overtime.length, 1); assert.equal(snapshot.overtime[0].id, explicit.id)
  assert.ok(snapshot.overtime.every(row => row.id !== biometric.id))
  assert.equal(numeric(snapshot.overtime[0].payableHours), 2); assert.equal(numeric(snapshot.overtime[0].amount), 112.5)
  assert.deepEqual(snapshot.overtime[0].legacyExplicitRequest, { requestId: oldRequest.id, requestHours: 2,
    entryHoursRequested: 2, sourcePayableHours: null })
  const line = await repo('SettlementLine').findOneByOrFail({ id: snapshot.overtimeLineId, caseId: kase.id })
  assert.equal(line.type, 'CREDIT'); assert.equal(numeric(line.amount), 112.5)
  assert.deepEqual(await repo('OvertimeEntry').find({ where: { employeeId: f.emp.id }, order: { id: 'ASC' } }), originals,
    'Interpreting legacy explicit evidence must not modify either old source')
})

test('OT compatibility: a decimal hour cap of 4.1 is exactly 246 minutes through preview and approval', async () => {
  const f = await fixture()
  await configDuring({ 'overtime.max_hours_per_day': 4.1 }, async () => {
    await punches(f, '08:00', '22:00')
    const view = await preview(f)
    assert.equal(view.policy.maxDailyMinutes, 246)
    assert.equal(view.detectedMinutes, 246)
    const pending = await submit(f, { hours: 5 })
    assert.equal(pending.status, 201, JSON.stringify(pending.body))
    assert.equal((await complete(f, pending.body)).approvedMinutes, 246)
  })
})

test('OT compatibility: legacy detected request refreshes evidence after return without inventing a different source or duplicate claim', async () => {
  const f = await fixture()
  await window(f, 'OPEN')
  await punches(f, '08:00', '19:35')
  await request(admin, 'POST', '/requests/engine/reconcile-overtime')
  const entry = await repo('OvertimeEntry').findOneByOrFail({ employeeId: f.emp.id, date: f.day })
  assert.ok(entry.requestId)
  // نعيد حالة تاريخية معروفة داخل قاعدة الاختبار وحدها: كشف قديم بلا لقطة أو دفتر حجز.
  await repo('OvertimeDayClaim').delete({ entryId: entry.id })
  await repo('OvertimeEntry').update(entry.id, { calculationSnapshot: null, status: 'DETECTED' })
  const returned = await request(f.manager, 'POST', `/requests/${entry.requestId}/act`, { action: 'RETURN', comment: 'راجع دليل الطلب القديم' })
  assert.equal(returned.status, 201, JSON.stringify(returned.body))
  const view = await request(f.owner, 'GET', `/attendance/overtime/preview?date=${f.day}&requestId=${entry.requestId}`)
  assert.equal(view.status, 200, JSON.stringify(view.body)); assert.equal(view.body.canSubmit, true); assert.equal(view.body.resubmission, true)
  const refreshed = await request(f.owner, 'POST', `/requests/${entry.requestId}/resubmit`, { payload: { date: f.day, reason: 'تمت مراجعة البصمات القديمة', previewFingerprint: view.body.fingerprint } })
  assert.equal(refreshed.status, 201, JSON.stringify(refreshed.body))
  assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id, date: f.day } }), 1)
  assert.equal(await repo('OvertimeDayClaim').count({ where: { entryId: entry.id } }), 1)
  const approved = await complete(f, refreshed.body)
  assert.equal(approved.id, entry.id); assert.equal(approved.approvedMinutes, 150)
})

test('OT compatibility: returned automatic request without an original detected entry cannot create a replacement source', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const orphan = await repo('Request').save({ typeCode: 'OVERTIME_AUTO', requesterId: f.emp.id, branchId: f.branch.id,
    status: 'RETURNED_FOR_INFO', payload: JSON.stringify({ date: f.day, reason: 'طلب قديم بلا مرجع كشف' }) })
  const view = await request(f.owner, 'GET', `/attendance/overtime/preview?date=${f.day}&requestId=${orphan.id}`)
  assert.equal(view.status, 409, JSON.stringify(view.body))
  const resubmitted = await request(f.owner, 'POST', `/requests/${orphan.id}/resubmit`, { payload: { date: f.day, reason: 'محاولة مراجعة مرجع مفقود' } })
  assert.equal(resubmitted.status, 409, JSON.stringify(resubmitted.body))
  assert.equal(await repo('OvertimeEntry').count({ where: { requestId: orphan.id } }), 0)
})

test('OT compatibility: submitting a stale preview rejects atomically and a refreshed preview can be submitted', async () => {
  const f = await fixture()
  await punches(f, '08:00', '19:35')
  const initial = await preview(f)
  await configDuring({ 'overtime.rounding_minutes': 30 }, async () => {
    const stale = await submit(f, { previewFingerprint: initial.fingerprint })
    assert.equal(stale.status, 409, JSON.stringify(stale.body))
    assert.equal(await repo('OvertimeEntry').count({ where: { employeeId: f.emp.id } }), 0)
    assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
    const fresh = await preview(f)
    assert.notEqual(fresh.fingerprint, initial.fingerprint)
    const accepted = await submit(f, { previewFingerprint: fresh.fingerprint })
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
  })
})

test('OT final audit corruption: an ineligible EX day cannot hide a broken approval snapshot or replace the saved payroll', async () => {
  const f = await fixture()
  const exemption = await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'اختبار حماية لقطة إضافي المستثنى', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  const pending = await submit(f, { hours: 2 })
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const entry = await complete(f, pending.body), result = await payroll(f)
  assert.equal(numeric(result.item.overtimeAmount), 112.5)
  const before = await request(admin, 'GET', `/payroll/runs/${result.run.id}`)
  try {
    // تغيير مقصود داخل قاعدة الاختبار: لا يجوز أن يخفي الاستبعاد تلف مصدر جديد.
    await repo('AttendanceExemption').update(exemption.id, { overtimeEligibleOverride: false })
    await repo('OvertimeEntry').update(entry.id, { calculationSnapshot: {
      schemaVersion: 1, submission: toObject(entry.calculationSnapshot).submission,
    } })
    const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period: f.day.slice(0, 7), scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: result.run.id,
      reason: 'اختبار رفض المصدر التالف قبل استبعاد يوم المستثنى',
    })
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.equal(rejected.body.code, 'OT_FINANCIAL_SNAPSHOT_INVALID')
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${result.run.id}`)).body, before.body)
  } finally {
    await repo('AttendanceExemption').save(exemption)
    await repo('OvertimeEntry').save(entry)
  }
})

test('OT final audit corruption: a null retroactive snapshot with new financial fields cannot erase a later payroll entitlement', async () => {
  const now = new Date()
  let day = isoDate(new Date(now.getFullYear(), now.getMonth(), 0, 12))
  while (new Date(`${day}T12:00:00`).getDay() !== 3) day = dateAfter(day, -1)
  await configDuring({ 'overtime.request_backdate_days': 90 }, async () => {
    const f = await fixture({ day })
    await punches(f, '08:00', '19:20')
    const pending = await submit(f)
    assert.equal(pending.status, 201, JSON.stringify(pending.body))
    const original = await payroll(f)
    await payPayroll(original.run)
    const entry = await complete(f, pending.body)
    const laterPeriod = monthAfter(original.run.period), later = await payroll(f, laterPeriod)
    assert.equal(numeric(later.item.overtimeAmount), 126.56)
    assert.deepEqual(later.breakdown.overtimeEntryIds, [entry.id])
    const before = await request(admin, 'GET', `/payroll/runs/${later.run.id}`)
    const originalBefore = await request(admin, 'GET', `/payroll/runs/${original.run.id}`)
    try {
      await repo('OvertimeEntry').update(entry.id, { calculationSnapshot: null })
      const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
        period: laterPeriod, scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: later.run.id,
        reason: 'اختبار رفض اللقطة الرجعية الناقصة دون إسقاط مبلغ المسير اللاحق',
      })
      assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
      assert.equal(rejected.body.code, 'OT_FINANCIAL_SNAPSHOT_INVALID')
      assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${later.run.id}`)).body, before.body)
      assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${original.run.id}`)).body, originalBefore.body)
    } finally { await repo('OvertimeEntry').save(entry) }
  })
})

async function legacyCapSource(f, { source = 'PRE_REQUESTED', hours = 2 } = {}) {
  const day = dateAfter(f.day, -1)
  const exemption = await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'اختبار احتساب مصادر المستثنى القديمة ضمن سقف الإضافي', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  const oldRequest = source === 'PRE_REQUESTED' ? await repo('Request').save({ typeCode: 'OVERTIME', requesterId: f.emp.id,
    branchId: f.branch.id, createdByUserId: f.owner.id, status: 'COMPLETED', currentStep: 3,
    payload: JSON.stringify({ date: day, hours, reason: 'طلب إضافي تاريخي مكتمل بساعات صريحة' }) }) : null
  const entry = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date: day, requestId: oldRequest?.id ?? null,
    source, status: 'APPROVED', hoursRequested: oldRequest ? hours : null, hoursActual: oldRequest ? null : hours,
    payableHours: oldRequest ? null : hours, rate: 1.5 })
  return { entry: await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }), exemption }
}

test('OT final audit caps: explicit legacy EX hours with null payable hours consume both weekly and monthly limits atomically', async () => {
  for (const key of ['overtime.max_hours_per_week', 'overtime.max_hours_per_month']) {
    const f = await fixture(), old = await legacyCapSource(f)
    await configDuring({ [key]: 3 }, async () => {
      const pending = await submit(f, { hours: 2 })
      assert.equal(pending.status, 201, JSON.stringify(pending.body))
      for (const actor of [f.manager, f.head]) {
        const result = await decide(actor, pending.body.id)
        assert.equal(result.status, 201, JSON.stringify(result.body))
      }
      const requestBefore = await repo('Request').findOneByOrFail({ id: pending.body.id })
      const entryBefore = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
      const eventsBefore = await repo('OvertimeEntryEvent').find({ where: { entryId: entryBefore.id }, order: { id: 'ASC' } })
      const rejected = await decide(f.hr, pending.body.id)
      assert.equal(rejected.status, 409, `${key}: ${JSON.stringify(rejected.body)}`)
      assert.deepEqual(await repo('Request').findOneByOrFail({ id: pending.body.id }), requestBefore)
      assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: entryBefore.id }), entryBefore)
      assert.deepEqual(await repo('OvertimeEntryEvent').find({ where: { entryId: entryBefore.id }, order: { id: 'ASC' } }), eventsBefore)
      assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
    })
  }
})

test('OT final audit caps: unpaid legacy biometric hours excluded for EX do not consume weekly or monthly entitlement', async () => {
  const f = await fixture(), old = await legacyCapSource(f, { source: 'BIOMETRIC_DETECTED', hours: 4 })
  await configDuring({ 'overtime.max_hours_per_week': 2, 'overtime.max_hours_per_month': 2 }, async () => {
    const pending = await submit(f, { hours: 2 })
    assert.equal(pending.status, 201, JSON.stringify(pending.body))
    const approved = await complete(f, pending.body)
    assert.equal(approved.approvedMinutes, 120)
    assert.equal(numeric(approved.amountSnapshot), 112.5)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
  })
})

test('OT final audit caps: paid legacy EX minutes come from the saved payroll even when the current exemption no longer grants overtime', async () => {
  const f = await fixture(), old = await legacyCapSource(f)
  const paidPayroll = await payroll(f)
  assert.equal(numeric(paidPayroll.item.overtimeHours), 2)
  await payPayroll(paidPayroll.run)
  const paidEntry = await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id })
  assert.equal(paidEntry.status, 'PAID'); assert.equal(paidEntry.payableHours, null)
  const paidItem = await repo('PayrollItem').findOneByOrFail({ id: paidPayroll.item.id })
  // الساعات المصروفة تُقرأ من مستند الصرف القديم حتى مع تغير قرار تاريخي لاحقاً.
  await repo('AttendanceExemption').update(old.exemption.id, { effectiveTo: old.entry.date, overtimeEligibleOverride: false })
  await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day,
    reasonCode: 'field_role', reason: 'استحقاق اليوم الجديد في اختبار السقف', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: financeApprover.id, approvedAt: new Date(), overtimeEligibleOverride: true })
  await configDuring({ 'overtime.max_hours_per_week': 3, 'overtime.max_hours_per_month': 3 }, async () => {
    const pending = await submit(f, { hours: 2 })
    assert.equal(pending.status, 201, JSON.stringify(pending.body))
    for (const actor of [f.manager, f.head]) {
      const result = await decide(actor, pending.body.id)
      assert.equal(result.status, 201, JSON.stringify(result.body))
    }
    const before = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
    const rejected = await decide(f.hr, pending.body.id)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.match(rejected.body.message, /سقف الإضافي/)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: before.id }), before)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: paidEntry.id }), paidEntry)
    assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: paidItem.id }), paidItem)
    try {
      // شكل أقدم للقسيمة: إجمالي مصدر واحد يظل دليلاً كافياً على الساعتين المصروفتين.
      const olderBreakdown = { ...toObject(paidItem.breakdown) }
      delete olderBreakdown.overtime
      await repo('PayrollItem').update(paidItem.id, { breakdown: JSON.stringify(olderBreakdown) })
      const olderRejected = await decide(f.hr, pending.body.id)
      assert.equal(olderRejected.status, 409, JSON.stringify(olderRejected.body))
      assert.match(olderRejected.body.message, /سقف الإضافي/)
      // إذا غاب المرجع والمدة التاريخية معاً فلا تُخترع مدة صفرية للمصروف.
      delete olderBreakdown.overtimeEntryIds
      await repo('PayrollItem').update(paidItem.id, { breakdown: JSON.stringify(olderBreakdown) })
      const ambiguous = await decide(f.hr, pending.body.id)
      assert.equal(ambiguous.status, 409, JSON.stringify(ambiguous.body))
      assert.equal(ambiguous.body.code, 'OT_PAID_MINUTES_UNVERIFIABLE')
      assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: before.id }), before)
    } finally { await repo('PayrollItem').save(paidItem) }
    assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: paidItem.id }), paidItem)
  })
})

async function unresolvedLegacyOvertime(f) {
  const oldRequest = await repo('Request').save({ typeCode: 'OVERTIME', requesterId: f.emp.id, branchId: f.branch.id,
    createdByUserId: f.owner.id, status: 'COMPLETED', currentStep: 3,
    payload: JSON.stringify({ date: f.day, hours: 2, reason: 'طلب قديم مكتمل لم تثبت ساعاته المستحقة' }) })
  const entry = await repo('OvertimeEntry').save({ employeeId: f.emp.id, date: f.day, requestId: oldRequest.id,
    source: 'PRE_REQUESTED', status: 'APPROVED', hoursRequested: 2, hoursActual: null, payableHours: null, rate: 1.5 })
  return { entry: await repo('OvertimeEntry').findOneByOrFail({ id: entry.id }),
    request: await repo('Request').findOneByOrFail({ id: oldRequest.id }) }
}

async function historicalZeroOvertimePayroll(f, hasTrace) {
  const result = await payroll(f), old = await unresolvedLegacyOvertime(f)
  const breakdown = { ...result.breakdown, overtimeEntryIds: [old.entry.id] }
  // نعيد شكل المسير التاريخي الذي سبق الحارس: المصدر الفارغ مسجل بصفر، مع تفصيل أو بدونه.
  if (hasTrace) breakdown.overtime = [{ id: old.entry.id, date: f.day, source: 'PRE_REQUESTED',
    approvedMinutes: 0, hours: 0, multiplier: 1.5, hourlyRate: 37.5, amount: 0, provenance: 'LEGACY',
    dayKind: null, originalPeriod: f.day.slice(0, 7), deferredFromRunId: null, retroactive: false }]
  else delete breakdown.overtime
  await repo('PayrollItem').update(result.item.id, { breakdown: JSON.stringify(breakdown) })
  return { result, old }
}

test('OT unresolved legacy: calculation rejects an approved non-EX request with unknown payable hours and preserves the earlier payroll', async () => {
  const f = await fixture(), result = await payroll(f), old = await unresolvedLegacyOvertime(f)
  const before = await request(admin, 'GET', `/payroll/runs/${result.run.id}`)
  const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period: f.day.slice(0, 7), scopeType: 'CUSTOM', employeeIds: [f.emp.id], runId: result.run.id,
    reason: 'حماية مسير محفوظ من طلب إضافي قديم بلا ساعات مستحقة مثبتة',
  })
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.equal(rejected.body.code, 'OT_LEGACY_HOURS_UNRESOLVED')
  assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${result.run.id}`)).body, before.body)
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
  assert.deepEqual(await repo('Request').findOneByOrFail({ id: old.request.id }), old.request)
})

test('OT unresolved legacy: approving an older zero payroll rejects an unresolved source with or without its historical trace', async () => {
  for (const hasTrace of [false, true]) {
    const f = await fixture(), { result, old } = await historicalZeroOvertimePayroll(f, hasTrace)
    const beforeRun = await repo('PayrollRun').findOneByOrFail({ id: result.run.id })
    const beforeItem = await repo('PayrollItem').findOneByOrFail({ id: result.item.id })
    const rejected = await request(financeApprover, 'POST', `/payroll/runs/${result.run.id}/approve`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.equal(rejected.body.code, 'OT_LEGACY_HOURS_UNRESOLVED')
    assert.deepEqual(await repo('PayrollRun').findOneByOrFail({ id: result.run.id }), beforeRun)
    assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: result.item.id }), beforeItem)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
    assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: result.run.id } }), 0)
    assert.equal(await repo('PayrollRunEvent').count({ where: { runId: result.run.id, eventType: 'APPROVED' } }), 0)
  }
})

test('OT unresolved legacy: paying an older approved zero payroll cannot mark unknown overtime paid with or without a trace', async () => {
  for (const hasTrace of [false, true]) {
    const f = await fixture(), { result, old } = await historicalZeroOvertimePayroll(f, hasTrace)
    // حالة قديمة معتمدة قبل الإصلاح؛ اختبار الصرف لا يمر عبر الاعتماد الحديث لتهيئتها.
    await repo('PayrollRun').update(result.run.id, { status: 'APPROVED', approvedBy: financeApprover.id, approvedAt: new Date() })
    const beforeRun = await repo('PayrollRun').findOneByOrFail({ id: result.run.id })
    const beforeItem = await repo('PayrollItem').findOneByOrFail({ id: result.item.id })
    const rejected = await request(financeApprover, 'POST', `/payroll/runs/${result.run.id}/pay`)
    assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
    assert.equal(rejected.body.code, 'OT_LEGACY_HOURS_UNRESOLVED')
    assert.deepEqual(await repo('PayrollRun').findOneByOrFail({ id: result.run.id }), beforeRun)
    assert.deepEqual(await repo('PayrollItem').findOneByOrFail({ id: result.item.id }), beforeItem)
    assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
    assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: result.run.id } }), 0)
    assert.equal(await repo('PayrollRunEvent').count({ where: { runId: result.run.id, eventType: 'PAID' } }), 0)
  }
})

test('OT unresolved legacy: settlement regeneration rejects unknown non-EX hours before dropping prepared lines', async () => {
  const f = await fixture()
  const kase = await repo('OffboardingCase').save({ employeeId: f.emp.id, lastWorkingDay: f.day,
    status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const prepared = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(prepared.status, 201, JSON.stringify(prepared.body))
  const old = await unresolvedLegacyOvertime(f)
  const beforeCase = await repo('OffboardingCase').findOneByOrFail({ id: kase.id })
  const beforeLines = await repo('SettlementLine').find({ where: { caseId: kase.id }, order: { id: 'ASC' } })
  const rejected = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.equal(rejected.body.code, 'OT_LEGACY_HOURS_UNRESOLVED')
  assert.deepEqual(await repo('OffboardingCase').findOneByOrFail({ id: kase.id }), beforeCase)
  assert.deepEqual(await repo('SettlementLine').find({ where: { caseId: kase.id }, order: { id: 'ASC' } }), beforeLines)
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id }), old.entry)
  assert.deepEqual(await repo('Request').findOneByOrFail({ id: old.request.id }), old.request)
})

test('OT unresolved legacy compatibility: an explicitly recorded zero remains a known zero through payroll approval and payment', async () => {
  const f = await fixture(), old = await unresolvedLegacyOvertime(f)
  await repo('OvertimeEntry').update(old.entry.id, { hoursActual: 0, payableHours: 0 })
  const knownZero = await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id })
  const result = await payroll(f)
  assert.equal(numeric(result.item.overtimeAmount), 0)
  assert.deepEqual(result.breakdown.overtimeEntryIds, [old.entry.id])
  await payPayroll(result.run)
  const paid = await repo('OvertimeEntry').findOneByOrFail({ id: old.entry.id })
  assert.deepEqual({ ...paid }, { ...knownZero, status: 'PAID', payrollRunId: result.run.id })
})

test('OT gross salary: settings cannot exclude allowances from new overtime approvals', async () => {
  const before = await repo('RequestsConfig').findOneByOrFail({ key: 'overtime.wage_components' })
  for (const value of ['BASIC', 'BASIC,HOUSING,TRANSPORT,OTHER', 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,BASIC']) {
    const rejected = await request(admin, 'PATCH', '/settings/config', { key: before.key, value })
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.match(rejected.body.message, /إجمالي الراتب/)
    assert.deepEqual(await repo('RequestsConfig').findOneByOrFail({ key: before.key }), before)
  }
  const accepted = await request(admin, 'PATCH', '/settings/config', {
    key: before.key, value: 'OTHER,WORK_NATURE,PHONE,TRANSPORT,HOUSING,BASIC',
  })
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body))
  assert.equal(accepted.body.value, 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER')
})

test('OT gross salary: new approval uses full monthly salary despite a historical basic-only setting', async () => {
  const f = await fixture({ employee: { basicSalary: 6000, housingAllowance: 1000, transportAllowance: 500,
    phoneAllowance: 200, workNatureAllowance: 300, otherAllowance: 1000 } })
  await punches(f, '08:00', '19:00')
  await configDuring({ 'overtime.wage_components': 'BASIC' }, async () => {
    const submitted = await submit(f, { hours: undefined })
    assert.equal(submitted.status, 201, JSON.stringify(submitted.body))
    const approved = await complete(f, submitted.body)
    const saved = approved.calculationSnapshot.approval
    assert.equal(saved.wageBasis, 'GROSS_MONTHLY_SALARY')
    assert.equal(saved.wageBase, 9000)
    assert.deepEqual(saved.wageComponents.map(row => row.amount), [6000, 1000, 500, 200, 300, 1000])
    assert.equal(saved.monthlyDays, 30); assert.equal(saved.dailyHours, 8)
    assert.equal(saved.hourlyRate, 37.5); assert.equal(saved.approvedMinutes, 120)
    assert.equal(saved.amount, 112.5)
    const result = await payroll(f)
    assert.equal(numeric(result.item.overtimeAmount), 112.5)
    await payPayroll(result.run)
    const paid = await repo('OvertimeEntry').findOneByOrFail({ id: approved.id })
    assert.equal(paid.status, 'PAID')
    assert.deepEqual(paid.calculationSnapshot, approved.calculationSnapshot)
  })
})

test('OT gross salary compatibility: a historical approval priced on basic salary keeps its original amount', async () => {
  const f = await fixture({ employee: { basicSalary: 6000, housingAllowance: 3000 } })
  await punches(f, '08:00', '19:00')
  const submitted = await submit(f, { hours: undefined })
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body))
  const approved = await complete(f, submitted.body)
  // نموذج تاريخي متسق من النسخة السابقة في قاعدة الاختبار وحدها؛ لا نعدل سجل مستخدم.
  const historicalSnapshot = JSON.parse(JSON.stringify(approved.calculationSnapshot))
  delete historicalSnapshot.approval.wageBasis
  Object.assign(historicalSnapshot.approval, { wageBase: 6000, wageComponents: [{ code: 'BASIC', amount: 6000 }], hourlyRate: 25, amount: 75 })
  await repo('OvertimeEntry').update(approved.id, { calculationSnapshot: historicalSnapshot, hourlyRateSnapshot: 25, amountSnapshot: 75 })
  const historical = await repo('OvertimeEntry').findOneByOrFail({ id: approved.id })
  const result = await payroll(f)
  assert.equal(numeric(result.item.overtimeAmount), 75)
  await payPayroll(result.run)
  const paid = await repo('OvertimeEntry').findOneByOrFail({ id: approved.id })
  assert.equal(paid.status, 'PAID')
  assert.equal(numeric(paid.amountSnapshot), 75)
  assert.deepEqual(paid.calculationSnapshot, historical.calculationSnapshot)
})
