// B1.6 — حراس المسير على قاعدة SQL مؤقتة معزولة (synchronize). راتب 9,000 واليوم 300، والفترة من 23 لـ22:
//  PG-1) الحارس مقفول = أرقام النهارده بالحرف لفترات 28 و30 و31 يوم × (بدون راتب كامل، غياب 16 يوم شغل × 2، جزاءات 108%)،
//        وشهر 31 بدون راتب صافيه −300: الاعتماد بيترفض بالاسم والسبب، والشاشة فيها القايمة.
//  PG-2) الحارس مفتوح: بدون راتب 31 = 9,000 وصافي 0، و28 = 8,400 وصافي 600، و30 = 9,000، والغياب والجزاءات زي ما هم، والقسيمة بالمقصوص.
//  PG-3) الحارس في لقطة السياسة: المقفول مابيغيّرش البصمة، والتفعيل فرق ظاهر، وإعادة الحساب من غير تحديث اللقطة بنفس الأرقام.
//  PG-4) جزاءات 108%: بيتعتمد ويتصرف، والباقي 720 قيد للشهر الجاي.
//  PG-5) اعتماد شغال لنفس المسير: الطلب التاني بيترفض على طول، وبعده بيتعتمد عادي.
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
const database = `hr_payroll_guards_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-guards-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
let app, master, ds, base, admin, approver, branch, created = false, employeeNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  await writeParityReasonsBeforeApproval(request, user, method, endpoint)
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
// الفترات (بداية الدورة يوم 23): 28 و30 و31 يوم
const PERIODS = { 28: ['2026-03', '2026-02-23', '2026-03-22'], 30: ['2026-05', '2026-04-23', '2026-05-22'], 31: ['2026-09', '2026-08-23', '2026-09-22'] }
const datesOf = (from, to) => { const out = []; for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 86400000) out.push(new Date(t).toISOString().slice(0, 10)); return out }
// الجمعة والسبت راحة (الافتراضي)، فالغياب على أيام الشغل بس
const workdaysOf = (from, to) => datesOf(from, to).filter(date => ![5, 6].includes(new Date(`${date}T12:00:00Z`).getUTCDay()))
async function employee(label) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `PG${String(n).padStart(3, '0')}`, fullName: `${label} ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer' })
}
async function attendance(emp, from, to, absent = []) {
  const off = new Set(absent)
  await repo('AttendanceDay').save(datesOf(from, to).map(date => ({ employeeId: emp.id, branchId: emp.branchId, date, status: off.has(date) ? 'absent' : 'present',
    checkIn: off.has(date) ? null : '08:00', checkOut: off.has(date) ? null : '16:00', shiftName: 'وردية حراس المسير', shiftStart: '08:00', shiftEnd: '16:00',
    scheduleSource: 'override', workMinutes: off.has(date) ? 0 : 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })), { chunk: 100 })
}
// موظف لكل حالة في الفترة: بدون راتب كامل، وغياب 16 يوم شغل، وجزاء 9,720 (108%)
async function scenario(length, label) {
  const [period, from, to] = PERIODS[length]
  const unpaid = await employee(`${label} بدون راتب ${length}`); await attendance(unpaid, from, to)
  await repo('Leave').save({ employeeId: unpaid.id, leaveTypeCode: 'UNPAID', fromDate: from, toDate: to, days: Number(length), period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  const absent = await employee(`${label} غياب ${length}`); await attendance(absent, from, to, workdaysOf(from, to).slice(0, 16))
  const debts = await employee(`${label} جزاءات ${length}`); await attendance(debts, from, to)
  await repo('EmployeeObligation').save({ employeeId: debts.id, type: 'DEBIT', category: 'quality', label: 'جزاء 108% — اختبار', amount: 9720, status: 'PENDING',
    effectiveDate: from, createdByUserId: admin.id })
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [unpaid.id, absent.id, debts.id],
    name: `حراس المسير ${label} ${length} ${crypto.randomUUID().slice(0, 8)}` }), 201)
  return { run, unpaid, absent, debts }
}
const amounts = (run, emp) => {
  const item = run.items.find(row => row.employeeId === emp.id)
  return { unpaid: Number(item.unpaidLeaveDeduction), absence: Number(item.absenceDeduction), other: Number(item.otherDeductions), net: Number(item.netPay) }
}
async function acknowledge(runId) {
  const report = expectStatus(await request(approver, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}
const guard = value => repo('RequestsConfig').save({ key: 'payroll.period_deduction_guard.enabled', value })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_guards_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branch = await repo('Branch').save({ code: 'PG', name: 'فرع حراس المسير' })
  admin = await repo('User').save({ email: 'admin@payroll-guards.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@payroll-guards.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'attendance.absence_penalty_days', value: '2' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_guards_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll guards fixture cleanup failed')
})

let offRuns
test('PG-1: الحارس مقفول = أرقام النهارده بالحرف، وشهر 31 بدون راتب بيوقف الاعتماد بالاسم والسبب', async () => {
  // القيمة الافتراضية مبذورة مقفولة
  assert.equal((await repo('RequestsConfig').findOneBy({ key: 'payroll.period_deduction_guard.enabled' }))?.value, 'false')
  offRuns = {}
  const expected = { 28: { unpaid: 8400, net: 600 }, 30: { unpaid: 9000, net: 0 }, 31: { unpaid: 9300, net: -300 } }
  for (const length of [28, 30, 31]) {
    const s = offRuns[length] = await scenario(length, 'مقفول')
    assert.deepEqual(amounts(s.run, s.unpaid), { unpaid: expected[length].unpaid, absence: 0, other: 0, net: expected[length].net }, `${length}: بدون راتب`)
    assert.deepEqual(amounts(s.run, s.absent), { unpaid: 0, absence: 9000, other: 0, net: 0 }, `${length}: الغياب سقفه الراتب أصلًا`)
    assert.deepEqual(amounts(s.run, s.debts), { unpaid: 0, absence: 0, other: 9000, net: 0 }, `${length}: الجزاءات سقفها الراتب أصلًا`)
    assert.equal(JSON.parse(s.run.items.find(row => row.employeeId === s.unpaid.id).breakdown).periodDeductionGuard, undefined)
  }
  // شهر 31: القايمة في الشاشة، والاعتماد بيترفض بالاسم والصافي والسبب
  const { run, unpaid } = offRuns[31]
  const detail = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}`), 200)
  assert.equal(detail.negativeNet.length, 1)
  const row = detail.negativeNet[0]
  assert.deepEqual([row.employeeId, row.fullName, row.employeeCode, row.net, row.cause], [unpaid.id, unpaid.fullName, unpaid.employeeCode, -300, 'UNPAID_LEAVE'])
  assert.deepEqual(row.lines.map(line => [line.code, line.amount]), [['EARNED', 9000], ['UNPAID_LEAVE', -9300]])
  assert.match(row.hint, /حارس الفترة/)
  await acknowledge(run.id)
  const refused = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(refused.status, 409, JSON.stringify(refused.body))
  assert.equal(refused.body.code, 'PAYRUN-NET-NEGATIVE'); assert.deepEqual(refused.body.employeeIds, [unpaid.id])
  assert.ok(refused.body.message.includes(unpaid.fullName) && refused.body.message.includes('-300.00'), refused.body.message)
  assert.equal(refused.body.negativeNet[0].cause, 'UNPAID_LEAVE')
  // صلاحية الاعتماد من غير عرض الرواتب: الرسالة العامة بأرقام الموظفين زي ما كانت
  const approveOnly = await repo('User').save({ email: 'approve-only@payroll-guards.invalid', displayName: 'معتمد فقط', passwordHash: 'test-only', role: 'finance', branchId: branch.id,
    permissions: JSON.stringify(['payroll.approve']) })
  const plain = await request(approveOnly, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(plain.status, 409, JSON.stringify(plain.body))
  assert.deepEqual([plain.body.employeeIds, plain.body.negativeNet], [[unpaid.id], undefined])
  assert.ok(!plain.body.message.includes(unpaid.fullName))
  // شهر 28 و30: بيتعتمدوا
  for (const length of [28, 30]) {
    await acknowledge(offRuns[length].run.id)
    expectStatus(await request(approver, 'POST', `/payroll/runs/${offRuns[length].run.id}/approve`), 201)
  }
})

test('PG-2: الحارس مفتوح — بدون راتب ماتعديش راتب الفترة، والغياب والجزاءات زي ما هم، والقسيمة بالمقصوص', async () => {
  await guard('true')
  try {
    const expected = { 28: { unpaid: 8400, net: 600 }, 30: { unpaid: 9000, net: 0 }, 31: { unpaid: 9000, net: 0 } }
    for (const length of [28, 30, 31]) {
      const s = await scenario(length, 'مفتوح')
      assert.equal(JSON.parse(s.run.policySnapshot ?? (await repo('PayrollRun').findOneByOrFail({ id: s.run.id })).policySnapshot).values.periodDeductionGuard, true)
      assert.deepEqual(amounts(s.run, s.unpaid), { unpaid: expected[length].unpaid, absence: 0, other: 0, net: expected[length].net }, `${length}: بدون راتب`)
      assert.deepEqual(amounts(s.run, s.absent), { unpaid: 0, absence: 9000, other: 0, net: 0 }, `${length}: الغياب`)
      assert.deepEqual(amounts(s.run, s.debts), { unpaid: 0, absence: 0, other: 9000, net: 0 }, `${length}: الجزاءات`)
      const item = s.run.items.find(row => row.employeeId === s.unpaid.id)
      assert.equal(Number(item.unpaidLeaveDays), length, 'الأيام بتتسجل كاملة')
      const cut = JSON.parse(item.breakdown).periodDeductionGuard
      if (length === 31) {
        assert.deepEqual(cut, { requested: 9300, applied: 9000, cut: 300 })
        const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${item.id}`), 200)
        assert.deepEqual(payslip.leaveDeductions.map(line => [line.code, line.days, line.amount]), [['UNPAID_LEAVE', 31, 9000]])
        assert.equal(expectStatus(await request(admin, 'GET', `/payroll/runs/${s.run.id}`), 200).negativeNet.length, 0)
        await acknowledge(s.run.id)
        expectStatus(await request(approver, 'POST', `/payroll/runs/${s.run.id}/approve`), 201)
      } else assert.equal(cut, undefined, `${length}: مفيش قص`)
    }
  } finally { await guard('false') }
})

test('PG-3: الحارس في لقطة السياسة — المقفول بنفس البصمة، والتفعيل فرق ظاهر، وإعادة الحساب من غير تحديث بنفس الأرقام', async () => {
  const { run, unpaid } = offRuns[31]
  const stored = await repo('PayrollRun').findOneByOrFail({ id: run.id })
  const snapshot = JSON.parse(stored.policySnapshot)
  assert.equal('periodDeductionGuard' in snapshot.values, false); assert.equal('periodDeductionGuard' in snapshot.sources, false)
  // مقفول: مفيش فرق
  let view = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/policy-snapshot`), 200)
  assert.equal(view.differences.length, 0, JSON.stringify(view.differences))
  await guard('true')
  try {
    view = expectStatus(await request(admin, 'GET', `/payroll/runs/${run.id}/policy-snapshot`), 200)
    assert.deepEqual(view.differences.map(d => [d.key, d.stored, d.current]), [['values.periodDeductionGuard', 'لا', 'نعم']])
    // إعادة الحساب من غير تحديث اللقطة: الحارس المحفوظ (مقفول) = نفس الأرقام
    const same = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب من غير تحديث اللقطة' }), 201)
    assert.equal(Number(same.items.find(row => row.employeeId === unpaid.id).netPay), -300)
    // تحديث اللقطة صراحة: الحارس بيسري
    const refreshed = expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'تفعيل حارس الفترة',
      refreshPolicySnapshot: true, expectedPolicySnapshotHash: view.current.fingerprint }), 201)
    assert.deepEqual(amounts(refreshed, unpaid), { unpaid: 9000, absence: 0, other: 0, net: 0 })
  } finally { await guard('false') }
})

test('PG-4: جزاءات 108% — المسير بيتعتمد ويتصرف، والباقي 720 قيد للشهر الجاي', async () => {
  const s = await scenario(30, 'صرف')
  await acknowledge(s.run.id)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${s.run.id}/approve`), 201)
  expectStatus(await request(admin, 'POST', `/payroll/runs/${s.run.id}/pay`, { channel: 'BANK_TRANSFER', reference: `PG-${s.run.id}` }), 201)
  const rows = await repo('EmployeeObligation').find({ where: { employeeId: s.debts.id }, order: { id: 'ASC' } })
  const pending = rows.filter(row => row.status === 'PENDING')
  assert.equal(pending.reduce((sum, row) => sum + Math.round(Number(row.amount) * 100), 0), 72000, JSON.stringify(rows.map(row => [row.id, row.status, row.amount])))
})

test('PG-5: اعتماد شغال لنفس المسير — الطلب التاني بيترفض على طول، وبعده بيتعتمد عادي', async () => {
  const [period, from, to] = PERIODS[30]
  const emp = await employee('اعتماد مرتين'); await attendance(emp, from, to)
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [emp.id],
    name: `اعتماد مرتين ${crypto.randomUUID().slice(0, 8)}` }), 201)
  await acknowledge(run.id)
  // اعتماد شغال = ماسك قفل الاعتماد في معاملة مفتوحة
  const running = ds.createQueryRunner()
  await running.connect(); await running.startTransaction()
  try {
    const [lock] = await running.query(`DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0; SELECT @r AS r`,
      [`hr:payroll:approve:${run.id}`])
    assert.ok(Number(lock.r) >= 0)
    const started = Date.now()
    const second = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(second.status, 409, JSON.stringify(second.body))
    assert.equal(second.body.code, 'PAYRUN-APPROVAL-RUNNING'); assert.match(second.body.message, /شغال دلوقتي/)
    assert.ok(Date.now() - started < 5000, 'الرفض على طول من غير ما يستنى قفل المسير')
    assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')
  } finally { await running.rollbackTransaction(); await running.release() }
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'APPROVED')
})
