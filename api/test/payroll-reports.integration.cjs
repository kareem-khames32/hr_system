// الخطوة 30 / PR-07, RP-07, RP-08, RP-10, RP-12: تقارير الرواتب عبر الـAPI الحقيقي.
// كل الكتابة في قاعدة مؤقتة عشوائية الاسم تُحذف في النهاية؛ التقارير نفسها قراءة فقط ويُتحقق من ذلك بعدّ الصفوف.
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
const database = `hr_payroll_reports_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-reports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const JULY = { period: '2026-07', startDate: '2026-06-23', endDate: '2026-07-22' }
const JUNE = { period: '2026-06', startDate: '2026-05-23', endDate: '2026-06-22' }
let app, master, ds, base, created = false, employeeNumber = 0
let admin, hrA, viewerA, noScope, branchA, branchB, deptA
const E = {}, R = {}, OT = {}, L = {}
let today
const repo = name => ds.getRepository(name)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function get(user, endpoint) {
  const response = await request(user, 'GET', endpoint)
  assert.equal(response.status, 200, `${endpoint}: ${JSON.stringify(response.body)}`)
  return response.body
}
async function employee(overrides = {}, periods = [JULY]) {
  const emp = await repo('Employee').save({ employeeCode: `RPT${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف تقارير ${employeeNumber}`, branchId: branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  const rows = []
  for (const period of periods) {
    for (let time = Date.parse(`${period.startDate}T12:00:00Z`); time <= Date.parse(`${period.endDate}T12:00:00Z`); time += 86400000) {
      rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10),
        status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار التقارير',
        shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
        lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
    }
  }
  if (rows.length) await repo('AttendanceDay').save(rows)
  return emp
}
async function calculate(body) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', body)
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
const addDays = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
const cents = value => { const [whole, fraction = '00'] = String(value).replace('-', '').split('.'); return (String(value).startsWith('-') ? -1n : 1n) * BigInt(whole + fraction.padEnd(2, '0')) }
async function tableCounts() {
  const counts = {}
  for (const name of ['PayrollRun', 'PayrollRunMember', 'PayrollItem', 'PayrollPeriodClaim', 'PayrollRunEvent', 'OvertimeEntry', 'Loan', 'LoanInstallment', 'Employee']) {
    counts[name] = await repo(name).count()
  }
  return counts
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_reports_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  today = require('../src/attendance/attendance.service').localDateOf(new Date())

  branchA = await repo('Branch').save({ code: 'RPT_A', name: 'فرع تقارير أ' })
  branchB = await repo('Branch').save({ code: 'RPT_B', name: 'فرع تقارير ب' })
  deptA = await repo('Department').save({ code: 'RPT_DA', name: 'قسم تقارير أ', branchId: branchA.id })
  const user = (email, role, branchId = null, permissions = []) => repo('User').save({ email, displayName: email,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin@payroll-reports.invalid', 'super_admin')
  hrA = await user('hr-a@payroll-reports.invalid', 'hr_manager', branchA.id, ['payroll.view', 'reports.view'])
  viewerA = await user('viewer-a@payroll-reports.invalid', 'branch_manager', branchA.id, ['reports.view'])
  noScope = await user('no-scope@payroll-reports.invalid', 'hr_manager', null, ['payroll.view', 'reports.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    // التقارير لا تعتمد على مصدر الراتب؛ الوضع الانتقالي يحسب براتب الملف بلا سجل أجر شهري في القاعدة المؤقتة
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])

  E.inDept1 = await employee({ departmentId: deptA.id })
  E.inDept2 = await employee({ departmentId: deptA.id })
  E.movedLater = await employee({})
  E.cancelledOnly = await employee({})
  E.manualExcluded = await employee({ branchId: branchB.id })
  E.wageChange = await employee({ branchId: branchB.id, basicSalary: 5000 }, [JUNE, JULY])
  E.suspended = await employee({ status: 'suspended', isActive: false }, [])
  E.dataIssue = await employee({ branchId: branchB.id, status: 'terminated', isActive: false }, [])
  // قرار المالك (20 سبتمبر): المنتهي/المؤرشف بلا تاريخ آخر يوم عمل ما بقاش «مشكلة بيانات» (له سبب استبعاد واضح
  // في عضوية المسير) — بيانات الخدمة المتعارضة هي «على رأس العمل ومع ذلك غير نشط»
  E.noLastDay = await employee({ branchId: branchB.id, status: 'active', isActive: false }, [])
  E.outOfScope = await employee({ branchId: branchB.id })

  // مسير قسم بلا فرع (نفس شكل المسيرات 18-21 في قاعدة الشركة)
  R.dept = await calculate({ period: JULY.period, scopeType: 'DEPARTMENT', scopeIds: [deptA.id], name: 'قسم التقارير يوليو' })
  const deptItems = await repo('PayrollItem').find({ where: { runId: R.dept.id } })
  const deptMembers = await repo('PayrollRunMember').find({ where: { runId: R.dept.id } })
  assert.deepEqual(deptItems.map(item => item.employeeId).sort((a, b) => a - b), [E.inDept1.id, E.inDept2.id].sort((a, b) => a - b),
    `شرط مسبق: مسير القسم يضم موظفَي القسم ${JSON.stringify({ run: { id: R.dept.id, scopeType: R.dept.scopeType, scopeIds: R.dept.scopeIds, status: R.dept.status },
      items: deptItems.map(item => ({ runId: item.runId, employeeId: item.employeeId })), members: deptMembers.map(member => ({ employeeId: member.employeeId, status: member.membershipStatus, reason: member.exclusionReason })),
      employees: [E.inDept1.id, E.inDept2.id], deptA: deptA.id })}`)
  R.duplicate = await calculate({ period: JULY.period, scopeType: 'CUSTOM', employeeIds: [E.inDept1.id], name: 'مسودة مكررة للتقرير', allowDraftConflicts: true })
  R.cancelled = await calculate({ period: JULY.period, scopeType: 'CUSTOM', employeeIds: [E.cancelledOnly.id], name: 'مسير سيُلغى' })
  const cancel = await request(admin, 'POST', `/payroll/runs/${R.cancelled.id}/cancel`, { reason: 'اختبار تقرير بلا مسير' })
  assert.equal(cancel.status, 201, JSON.stringify(cancel.body))
  R.june = await calculate({ period: JUNE.period, scopeType: 'CUSTOM', employeeIds: [E.wageChange.id], name: 'يونيو تغيير الأجر' })
  await repo('Employee').update({ id: E.wageChange.id }, { basicSalary: 6000 })
  R.custom = await calculate({ period: JULY.period, scopeType: 'CUSTOM', employeeIds: [E.manualExcluded.id, E.wageChange.id], name: 'مخصّص الفرع ب' })
  assert.equal(R.dept.branchId, null, 'مسير القسم بلا فرع')

  // استبعاد يدوي داخل القاعدة المؤقتة (لا مسار API للاستبعاد اليدوي بعد)
  await repo('PayrollRunMember').update({ runId: R.custom.id, employeeId: E.manualExcluded.id }, { membershipStatus: 'EXCLUDED', exclusionReason: 'EXC_MANUAL' })
  await repo('PayrollItem').delete({ runId: R.custom.id, employeeId: E.manualExcluded.id })
  // بند غير متسق: الصافي يزيد 10 عن مكوناته ⇒ فرق غير مفسَّر
  const inconsistent = await repo('PayrollItem').findOneByOrFail({ runId: R.dept.id, employeeId: E.inDept2.id })
  await repo('PayrollItem').update({ id: inconsistent.id }, { netPay: Number(inconsistent.netPay) + 10 })

  await sleep(1500)
  E.joinedAfter = await employee({ departmentId: deptA.id, basicSalary: 0 })
  await repo('Employee').update({ id: E.movedLater.id }, { departmentId: deptA.id })

  // ===== الإضافي =====
  const approval = { schemaVersion: 1, employeeId: E.inDept1.id, workDate: '2026-07-05', approvedMinutes: 90, approverId: admin.id,
    approvedAt: '2026-07-06T09:00:00.000Z', reason: null, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', evidenceFingerprint: 'a'.repeat(64),
    evidence: { fingerprint: 'a'.repeat(64), employeeId: E.inDept1.id, workDate: '2026-07-05', dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', detectedMinutes: 100, policy: { multiplier: 1.5 } },
    hours: 1.5, multiplier: 1.5, hourlyRate: 25, amount: 56.25, wageBase: 6000, wageBasis: 'GROSS_MONTHLY_SALARY',
    wageComponents: [{ code: 'BASIC', amount: 6000 }], monthlyDays: 30, dailyHours: 8, originalPeriod: '2026-07', deferredFromRunId: null }
  OT.snapshot = await repo('OvertimeEntry').save({ employeeId: E.inDept1.id, date: '2026-07-05', source: 'BIOMETRIC_DETECTED', status: 'APPROVED',
    hoursActual: 1.67, hoursRequested: 1.58, payableHours: 1.5, rate: 1.5, approvedMinutes: 90, hourlyRateSnapshot: 25, amountSnapshot: 56.25,
    originalPeriod: '2026-07', deferredFromRunId: null,
    calculationSnapshot: { schemaVersion: 1, submission: { requestedMinutes: 95, evidence: { detectedMinutes: 100 } }, approval } })
  OT.rejected = await repo('OvertimeEntry').save({ employeeId: E.inDept2.id, date: '2026-07-06', source: 'BIOMETRIC_DETECTED', status: 'REJECTED', hoursActual: 1.5, hoursRequested: 1.5, rate: 1.5 })
  OT.legacy = await repo('OvertimeEntry').save({ employeeId: E.inDept2.id, date: '2026-07-07', source: 'PRE_REQUESTED', status: 'APPROVED', hoursRequested: 2, payableHours: 2, rate: 1.5 })
  OT.unresolved = await repo('OvertimeEntry').save({ employeeId: E.inDept1.id, date: '2026-07-08', source: 'PRE_REQUESTED', status: 'APPROVED', hoursRequested: 1, rate: 1.5 })
  OT.paid = await repo('OvertimeEntry').save({ employeeId: E.wageChange.id, date: '2026-07-09', source: 'PRE_REQUESTED', status: 'PAID', hoursRequested: 2, payableHours: 2, rate: 1.5 })
  const paidItem = await repo('PayrollItem').findOneByOrFail({ runId: R.custom.id, employeeId: E.wageChange.id })
  const breakdown = JSON.parse(paidItem.breakdown || '{}')
  await repo('PayrollItem').update({ id: paidItem.id }, { breakdown: JSON.stringify({ ...breakdown, overtimeEntryIds: [OT.paid.id],
    overtime: [{ id: OT.paid.id, date: '2026-07-09', source: 'PRE_REQUESTED', hours: 2, amount: 80.5, multiplier: 1.5 }] }) })
  // بنود قديمة بمراجع فقط (overtimeEntryIds بلا overtime مفصّل) كما في hr_system (البند 1185: 1430.63 لتسعة سجلات)؛
  // الصافي يرتفع بقيمة الإضافي نفسها حتى يبقى البند متسقًا ولا يظهر فرق غير مفسَّر في تقرير الفروق
  const legacyOvertimeItem = async (runId, employeeId, entryIds, amount, hours, extra = {}) => {
    const item = await repo('PayrollItem').findOneByOrFail({ runId, employeeId })
    const saved = JSON.parse(item.breakdown || '{}')
    delete saved.overtime
    await repo('PayrollItem').update({ id: item.id }, { overtimeAmount: amount, overtimeHours: hours, netPay: Number(item.netPay) + amount,
      breakdown: JSON.stringify({ ...saved, overtimeEntryIds: entryIds, ...extra }) })
  }
  const legacyEntry = (employeeId, date, fields) => repo('OvertimeEntry').save({ employeeId, date, source: 'PRE_REQUESTED', status: 'APPROVED', rate: 1.5, ...fields })
  // ١) قابل للتوزيع ومتسق: (2.25 + 0.75) س × 1.5 × 25 = 112.50 بنسبة 3:1 ⇒ 84.375 و28.125 — الباقيان متساويان
  //    فالقرش الزائد للسجل الأصغر رقمًا: 84.38 + 28.12 = 112.50 بالضبط
  OT.allocA = await legacyEntry(E.inDept1.id, '2026-07-10', { hoursRequested: 2.25, payableHours: 2.25 })
  OT.allocB = await legacyEntry(E.inDept1.id, '2026-07-11', { source: 'BIOMETRIC_DETECTED', hoursActual: 0.75, payableHours: 0.75 })
  await legacyOvertimeItem(R.duplicate.id, E.inDept1.id, [OT.allocA.id, OT.allocB.id], 112.5, 3, { hourRate: 25 })
  // ٢) ساعات السجلات تغيّرت بعد الحساب (2.00 الآن مقابل 3.00 في البند): يُوزَّع ما صُرف فعلًا مع ملاحظة
  OT.driftA = await legacyEntry(E.inDept1.id, '2026-07-12', { hoursRequested: 1, payableHours: 1 })
  OT.driftB = await legacyEntry(E.inDept1.id, '2026-07-13', { hoursRequested: 1, payableHours: 1 })
  await legacyOvertimeItem(R.dept.id, E.inDept1.id, [OT.driftA.id, OT.driftB.id], 112.5, 3, { hourRate: 25 })
  // ٣) غير قابل للتوزيع (سجل بلا ساعات مستحقة): القيمة مجهولة null لا صفر، وقيمة البند تظهر «غير موزّعة»
  OT.lostA = await legacyEntry(E.wageChange.id, '2026-06-10', { hoursRequested: 2, payableHours: 2 })
  OT.lostB = await legacyEntry(E.wageChange.id, '2026-06-11', { hoursRequested: 1 })
  await legacyOvertimeItem(R.june.id, E.wageChange.id, [OT.lostA.id, OT.lostB.id], 150, 3)

  // ===== السلف (تواريخ نسبية لليوم حتى يثبت التقادم) =====
  const loan = (employeeId, amount, status) => repo('Loan').save({ employeeId, amount, status })
  const installment = (loanId, dueDate, amount, financialStatus, paidAmount, extra = {}) => repo('LoanInstallment').save({ loanId, dueDate, amount,
    paid: ['PAID', 'SETTLED'].includes(financialStatus), paidAmount, financialStatus, financialRevision: 1, originalDueDate: dueDate, ...extra })
  L.partial = await loan(E.inDept1.id, 1000, 'DISBURSED')
  await installment(L.partial.id, addDays(today, -90), 250, 'PAID', '250.00')
  const parent = await installment(L.partial.id, addDays(today, -45), 250, 'PARTIAL', '100.00')
  await installment(L.partial.id, addDays(today, -20), 150, 'DUE', '0.00', { originalDueDate: addDays(today, -45), parentInstallmentId: parent.id })
  await installment(L.partial.id, addDays(today, 10), 250, 'DUE', '0.00')
  await installment(L.partial.id, addDays(today, 40), 250, 'DUE', '0.00')
  L.settled = await loan(E.outOfScope.id, 300, 'SETTLED')
  await installment(L.settled.id, addDays(today, -60), 300, 'PAID', '300.00')
  L.afterService = await loan(E.dataIssue.id, 500, 'DISBURSED')
  await installment(L.afterService.id, addDays(today, 10), 500, 'DUE', '0.00')
  L.broken = await loan(E.movedLater.id, 400, 'DISBURSED')
  await installment(L.broken.id, addDays(today, -10), 400, 'PARTIAL', '100.00')
}, { timeout: 600000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_reports_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-reports-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll reports fixture cleanup failed')
})

test('runs report lists runs without a branch, keeps cancelled runs out of totals, and scopes branch users by member snapshot', async () => {
  const report = await get(admin, '/reports/payroll')
  const dept = report.runs.find(run => run.id === R.dept.id)
  assert.ok(dept, 'مسير القسم بلا فرع يظهر')
  assert.equal(dept.branchId, null)
  assert.equal(dept.branchName, null)
  assert.equal(dept.scopeLabel, `قسم: ${deptA.name}`)
  assert.equal(dept.employees, 2)
  assert.equal(report.runs.find(run => run.id === R.custom.id).scopeLabel, 'قائمة مخصّصة (2 موظف)')
  assert.equal(report.runs.find(run => run.id === R.cancelled.id).status, 'CANCELLED')
  assert.deepEqual(new Set(report.runs.map(run => run.id)), new Set(Object.values(R).map(run => run.id)))
  const [{ count, total }] = await ds.query(`SELECT COUNT(*) AS count, CONVERT(varchar(40), SUM(i.netPay)) AS total FROM payroll_items i
    JOIN payroll_runs r ON r.id = i.runId WHERE r.status <> 'CANCELLED'`)
  const methodCount = report.byMethod.reduce((sum, row) => sum + row.count, 0)
  assert.equal(methodCount, Number(count), 'طرق الصرف لا تحسب بنود المسير الملغى')
  assert.equal(report.byMethod.reduce((sum, row) => sum + cents(row.total), 0n), cents(total))
  assert.deepEqual(report.deductions.map(row => row.period).sort(), ['2026-06', '2026-07'])

  const scoped = await get(hrA, '/reports/payroll')
  assert.deepEqual(new Set(scoped.runs.map(run => run.id)), new Set([R.dept.id, R.duplicate.id, R.cancelled.id]), 'مدير الفرع أ يرى مسيرات أعضاء فرعه فقط')
  assert.equal(scoped.runs.find(run => run.id === R.dept.id).partial, false)
  assert.deepEqual((await get(noScope, '/reports/payroll')).runs, [], 'حساب بلا فرع لا يرى شيئًا')
  assert.equal((await get(viewerA, '/reports/payroll')).runs.length, 3, 'مركز التقارير وحده يكفي للملخص')
  assert.equal((await request(null, 'GET', '/reports/payroll')).status, 401)
})

test('detailed payroll reports require payroll.view on top of reports.view', async () => {
  for (const endpoint of ['/reports/payroll/unassigned?period=2026-07', '/reports/payroll/overtime?period=2026-07', '/reports/payroll/loans', '/reports/payroll/variance']) {
    assert.equal((await request(viewerA, 'GET', endpoint)).status, 403, endpoint)
    assert.equal((await request(null, 'GET', endpoint)).status, 401, endpoint)
  }
  const overtime = await get(viewerA, '/reports/overtime?month=2026-07')
  assert.ok(overtime.length > 0)
  assert.ok(overtime.every(row => !('approvedAmount' in row)), 'مدير الفرع يرى الساعات بلا مبالغ')
  assert.ok((await get(admin, '/reports/overtime?month=2026-07')).some(row => row.approvedAmount === '56.25'))
})

test('unassigned report lists every on-job employee outside a run with a reason, and changes nothing', async () => {
  const before = await tableCounts()
  const report = await get(admin, '/reports/payroll/unassigned?period=2026-07')
  assert.equal(report.period, '2026-07')
  assert.equal(report.summary.from, JULY.startDate)
  assert.equal(report.summary.to, JULY.endDate)
  const row = emp => report.rows.find(item => item.employeeId === emp.id)
  const expectReason = (emp, code, runId) => {
    const found = row(emp)
    assert.ok(found, `${emp.employeeCode} يجب أن يظهر`)
    assert.equal(found.reason, code, JSON.stringify(found.reasons))
    if (runId !== undefined) assert.equal(found.reasons[0].run?.id, runId)
    return found
  }
  expectReason(E.movedLater, 'IN_SCOPE_NOT_RECALCULATED', R.dept.id)
  expectReason(E.cancelledOnly, 'ONLY_CANCELLED_RUN', R.cancelled.id)
  const joined = expectReason(E.joinedAfter, 'JOINED_AFTER_SNAPSHOT', R.dept.id)
  assert.ok(joined.reasons.some(reason => reason.code === 'NO_SALARY_DEFINED'), 'الراتب الصفري سبب إضافي')
  const excluded = expectReason(E.manualExcluded, 'EXCLUDED_IN_RUN', R.custom.id)
  assert.equal(excluded.detail, 'استبعاد يدوي')
  assert.match(expectReason(E.noLastDay, 'DATA_ISSUE').detail, /آخر يوم عمل/)
  expectReason(E.outOfScope, 'OUT_OF_ALL_RUN_SCOPES')
  for (const covered of [E.inDept1, E.inDept2, E.wageChange]) assert.equal(row(covered), undefined, `${covered.employeeCode} مشمول`)
  // قرار المالك (20 سبتمبر): الموقوف عضو في المسير زي أي حد، فلو مش في مسير بيظهر «بلا مسير» ومش مخفي؛
  // والمنتهي بلا تاريخ آخر يوم عمل مش على رأس العمل، سببه بيظهر في معاينة عضوية المسير
  assert.ok(row(E.suspended), 'الموقوف بقى عضوًا عاديًا؛ غيابه عن المسيرات لازم يظهر')
  assert.equal(row(E.dataIssue), undefined, 'المنتهي بلا تاريخ آخر يوم عمل خارج «على رأس العمل»')
  assert.ok(report.rows.every(item => typeof item.reasonLabel === 'string' && item.reasonLabel.length > 3))
  assert.equal(report.summary.covered + report.summary.unassigned, report.summary.onJob, 'PR-07: المشمولون + بلا مسير = على رأس العمل')
  assert.equal(report.summary.unassigned, report.rows.length)
  assert.equal(report.summary.covered, 3)
  const duplicate = report.duplicates.find(item => item.employeeId === E.inDept1.id)
  assert.deepEqual(new Set(duplicate.runs.map(run => run.id)), new Set([R.dept.id, R.duplicate.id]))
  assert.ok(row(E.outOfScope).lastRun === null)

  // فلتر «أظهر الموقوفين» ما بقاش بيخفي حد: الموقوف مستحق لأيامه برّه الإيقاف فبيتعد على رأس العمل دائمًا
  for (const flag of ['true', '1', '0']) {
    const view = await get(admin, `/reports/payroll/unassigned?period=2026-07&includeSuspended=${flag}`)
    assert.equal(view.rows.some(item => item.employeeId === E.suspended.id), true, flag)
    assert.equal(view.summary.suspended, 0, flag)
  }
  const onlyIssues = await get(admin, '/reports/payroll/unassigned?period=2026-07&reason=DATA_ISSUE')
  assert.deepEqual(onlyIssues.rows.map(item => item.employeeId), [E.noLastDay.id])
  const explicit = await get(admin, `/reports/payroll/unassigned?from=${JULY.startDate}&to=${JULY.endDate}`)
  assert.equal(explicit.rows.length, report.rows.length)
  const noRuns = await get(admin, '/reports/payroll/unassigned?period=2026-01')
  assert.equal(noRuns.rows.find(item => item.employeeId === E.inDept1.id)?.reason, 'NO_RUN_IN_PERIOD')

  const scoped = await get(hrA, '/reports/payroll/unassigned?period=2026-07')
  assert.deepEqual(new Set(scoped.rows.map(item => item.employeeId)),
    new Set([E.movedLater.id, E.cancelledOnly.id, E.joinedAfter.id, E.suspended.id]))
  const masked = scoped.rows.find(item => item.employeeId === E.cancelledOnly.id).reasons[0].run
  assert.equal(masked.id, null, 'مسير مخصّص لا يُكشف رقمه لمستخدم الفرع')
  assert.equal(masked.name, 'مسير خارج نطاق صلاحيتك')

  for (const bad of ['?period=2026-07&reason=NOPE', '?from=2026-06-23', '?from=2026-07-22&to=2026-06-23', '?period=2026-13',
    '?period=2026-07&includeSuspended=maybe', '?period=2026-07&includeSuspended=']) {
    assert.equal((await request(admin, 'GET', `/reports/payroll/unassigned${bad}`)).status, 400, bad)
  }
  assert.equal((await request(admin, 'GET', '/reports/payroll/variance?period=2026-07&includeUnchanged=maybe')).status, 400, 'includeUnchanged غير المنطقي مرفوض')
  await get(admin, '/reports/payroll/overtime?period=2026-07')
  await get(admin, '/reports/payroll/loans?period=2026-07&status=all')
  await get(admin, '/reports/payroll/variance?period=2026-07')
  assert.deepEqual(await tableCounts(), before, 'التقارير لا تكتب أي صف')
})

test('overtime report shows amounts with their source; rejected rows are zero and outside the total', async () => {
  const report = await get(admin, '/reports/payroll/overtime?period=2026-07')
  const row = entry => report.rows.find(item => item.id === entry.id)
  assert.deepEqual({ amount: row(OT.snapshot).amount, source: row(OT.snapshot).amountSource, approved: row(OT.snapshot).approvedMinutes,
    detected: row(OT.snapshot).detectedMinutes, requested: row(OT.snapshot).requestedMinutes, difference: row(OT.snapshot).differenceMinutes },
  { amount: '56.25', source: 'APPROVAL_SNAPSHOT', approved: 90, detected: 100, requested: 95, difference: 10 })
  assert.deepEqual([row(OT.rejected).amount, row(OT.rejected).amountSource], ['0.00', 'NOT_PAYABLE'])
  assert.deepEqual([row(OT.legacy).amount, row(OT.legacy).amountSource], ['75.00', 'ESTIMATE'])
  assert.equal(row(OT.unresolved).amount, null)
  assert.equal(row(OT.unresolved).amountSource, 'UNRESOLVED')
  assert.ok(row(OT.unresolved).issue)
  assert.deepEqual([row(OT.paid).amount, row(OT.paid).amountSource, row(OT.paid).run?.id], ['80.50', 'PAYROLL_ITEM', R.custom.id])

  // بند قديم يجمع عدة سجلات: القيمة المصروفة موزّعة بالقروش لا صفر مخترع (خلل hr_system: السجلات 5-13 و27-34 ظهرت 0.00)
  const brief = entry => ({ amount: row(entry).amount, source: row(entry).amountSource, run: row(entry).run?.id, issue: row(entry).issue, hourlyRate: row(entry).hourlyRate })
  assert.deepEqual(brief(OT.allocA), { amount: '84.38', source: 'PAYROLL_ITEM_ALLOCATED', run: R.duplicate.id, issue: null, hourlyRate: 25 })
  assert.deepEqual(brief(OT.allocB), { amount: '28.12', source: 'PAYROLL_ITEM_ALLOCATED', run: R.duplicate.id, issue: null, hourlyRate: 25 })
  assert.equal(row(OT.allocA).amountSourceLabel, 'موزّع من بند المسير بنسبة الساعات')
  for (const entry of [OT.driftA, OT.driftB]) {
    assert.deepEqual([row(entry).amount, row(entry).amountSource, row(entry).run?.id], ['56.25', 'PAYROLL_ITEM_ALLOCATED', R.dept.id])
    assert.match(row(entry).issue, /\(2\.00\).*\(3\.00\)/, 'تغيّر الساعات بعد الحساب يظهر كملاحظة')
  }
  const itemSum = runId => report.rows.filter(item => item.run?.id === runId && item.amountSource === 'PAYROLL_ITEM_ALLOCATED')
    .reduce((sum, item) => sum + cents(item.amount), 0n)
  for (const runId of [R.duplicate.id, R.dept.id]) {
    const [{ amount }] = await ds.query(`SELECT CONVERT(varchar(40), overtimeAmount) AS amount FROM payroll_items WHERE runId = @0 AND employeeId = @1`, [runId, E.inDept1.id])
    assert.equal(itemSum(runId), cents(amount), `مجموع الموزّع على سجلات بند المسير ${runId} = قيمة البند بالضبط`)
  }
  assert.ok(report.rows.every(item => item.amountSource !== 'PAYROLL_ITEM' || item.amount !== '0.00' || item.id === OT.rejected.id), 'لا صف «من بند المسير» بصفر مخترع')

  // 56.25 لقطة + 80.50 مفصّل + 112.50 + 112.50 موزّعان؛ التقديري خارج المعتمد
  assert.equal(report.summary.approvedAmount, '361.75')
  assert.equal(report.summary.estimatedAmount, '75.00')
  assert.equal(report.summary.paidInRunsAmount, '305.50')
  assert.equal(report.summary.allocatedAmount, '225.00')
  assert.equal(report.summary.unallocatedInRunsAmount, '0.00')
  assert.equal(report.summary.rejected, 1)
  assert.equal(report.summary.unresolved, 1)
  assert.equal(report.summary.withIssues, 3)
  const [{ total }] = await ds.query(`SELECT CONVERT(varchar(40), ISNULL(SUM(i.overtimeAmount), 0)) AS total FROM payroll_items i JOIN payroll_runs r ON r.id = i.runId
    WHERE r.status <> 'CANCELLED' AND r.startDate <= '2026-07-22' AND r.endDate >= '2026-06-23'`)
  assert.equal(cents(report.summary.payrollColumnTotal), cents(total))
  assert.equal(cents(report.summary.paidInRunsAmount) - cents('80.50'), cents(total), 'داخل بنود المسيرات (عدا المفصّل غير المنعكس في العمود) = عمود الإضافي')
  assert.deepEqual((await get(admin, '/reports/payroll/overtime?period=2026-07&status=REJECTED')).rows.map(item => item.id), [OT.rejected.id])
  const scoped = await get(hrA, '/reports/payroll/overtime?period=2026-07')
  assert.deepEqual(new Set(scoped.rows.map(item => item.id)), new Set([OT.snapshot.id, OT.rejected.id, OT.legacy.id, OT.unresolved.id,
    OT.allocA.id, OT.allocB.id, OT.driftA.id, OT.driftB.id]))

  // بند لا يمكن توزيعه بأمانة: القيمة مجهولة (null) ومصدرها «يحتاج مراجعة»، وقيمة البند تُعرض غير موزّعة ولا تدخل المعتمد
  const june = await get(admin, '/reports/payroll/overtime?period=2026-06')
  const juneRow = entry => june.rows.find(item => item.id === entry.id)
  for (const entry of [OT.lostA, OT.lostB]) {
    assert.deepEqual([juneRow(entry).amount, juneRow(entry).amountSource, juneRow(entry).run?.id], [null, 'UNRESOLVED', R.june.id])
    assert.match(juneRow(entry).issue, /150\.00.*تعذر توزيعها/)
  }
  assert.deepEqual({ approved: june.summary.approvedAmount, unallocated: june.summary.unallocatedInRunsAmount, unresolved: june.summary.unresolved, column: june.summary.payrollColumnTotal },
    { approved: '0.00', unallocated: '150.00', unresolved: 2, column: '150.00' })
})

test('loans report reconciles paid + remaining = principal, shows installment n of m, aging and after-service balances', async () => {
  const report = await get(admin, '/reports/payroll/loans?status=all')
  const row = loan => report.rows.find(item => item.loanId === loan.id)
  const partial = row(L.partial)
  assert.deepEqual({ paid: partial.paid, remaining: partial.remaining, installments: partial.installments, paidInstallments: partial.paidInstallments,
    current: partial.currentInstallment, next: partial.nextDueDate, overdue: partial.overdueCount, overdueAmount: partial.overdueAmount,
    partialCount: partial.partialCount, close: partial.expectedCloseDate, balanced: partial.balanced },
  { paid: '350.00', remaining: '650.00', installments: 4, paidInstallments: 1, current: 2, next: addDays(today, -20), overdue: 1, overdueAmount: '150.00',
    partialCount: 1, close: addDays(today, 40), balanced: true })
  for (const item of report.rows.filter(entry => !entry.issue)) assert.equal(cents(item.paid) + cents(item.remaining), cents(item.principal), `سلفة ${item.loanId}`)
  assert.ok(row(L.broken).issue, 'سلسلة أقساط غير متسقة تظهر كملاحظة لا تُسقط التقرير')
  assert.equal(report.summary.issues, 1)
  assert.deepEqual(report.afterService.map(item => item.loanId), [L.afterService.id])
  assert.equal(report.aging[0].count, 1)
  assert.equal(report.aging[0].amount, '150.00')
  assert.ok(report.forecast.some(item => item.month === addDays(today, 10).slice(0, 7)))
  assert.ok(!(await get(admin, '/reports/payroll/loans?status=open')).rows.some(item => item.loanId === L.settled.id))
  assert.ok((await get(admin, '/reports/payroll/loans?status=settled')).rows.some(item => item.loanId === L.settled.id))
  const scoped = await get(hrA, '/reports/payroll/loans?status=all')
  assert.deepEqual(new Set(scoped.rows.map(item => item.loanId)), new Set([L.partial.id, L.broken.id]))
  const withPeriod = await get(admin, '/reports/payroll/loans?status=all&period=2026-07')
  assert.equal(withPeriod.summary.period.from, JULY.startDate)
  const [{ total }] = await ds.query(`SELECT CONVERT(varchar(40), ISNULL(SUM(i.loanInstallments), 0)) AS total FROM payroll_items i JOIN payroll_runs r ON r.id = i.runId
    WHERE r.status <> 'CANCELLED' AND r.startDate <= '2026-07-22' AND r.endDate >= '2026-06-23'`)
  assert.equal(cents(withPeriod.summary.period.payrollColumnTotal), cents(total))
})

test('variance report explains each employee difference by component and isolates unexplained residuals', async () => {
  const report = await get(admin, '/reports/payroll/variance?period=2026-07&comparePeriod=2026-06')
  const row = emp => report.rows.find(item => item.employeeId === emp.id)
  const wage = row(E.wageChange)
  assert.ok(wage)
  assert.equal(wage.components.find(component => component.key === 'basicSalary')?.delta, '1000.00')
  assert.ok(wage.causes.some(cause => cause.code === 'WAGE_CHANGE'))
  assert.equal(wage.unexplained, false)
  assert.equal(cents(wage.difference), wage.components.reduce((sum, component) => sum + cents(component.effect), 0n))
  assert.equal(wage.percent, Math.round(Number(cents(wage.difference)) * 10000 / Number(cents(wage.previousNet))) / 100)
  const unexplained = row(E.inDept2)
  assert.equal(unexplained.unexplained, true)
  assert.equal(unexplained.residual, '10.00')
  assert.ok(report.unexplained.some(item => item.employeeId === E.inDept2.id))
  // الجديد في الفترة: سببه الانضمام وحده، لا «تغيير الأجر/إضافي» لأن كل بنوده تتغير بالضرورة
  assert.deepEqual(row(E.inDept1).causes.map(cause => cause.code), ['NEW_IN_PERIOD'])
  assert.ok(wage.causes.some(cause => cause.code === 'OVERTIME'), 'الموجود في الفترتين يحتفظ بأسباب بنوده')
  assert.deepEqual(new Set(row(E.inDept1).currentRuns), new Set([R.dept.id, R.duplicate.id]))
  // الغائب عن الفترة الحالية (LEFT_PERIOD): لا أسباب بنود مزعجة، ويبقى «غير مفسَّر» إن كان بنده السابق غير متسق
  const reversed = await get(admin, '/reports/payroll/variance?period=2026-06&comparePeriod=2026-07')
  const left = emp => reversed.rows.find(item => item.employeeId === emp.id)
  assert.deepEqual(left(E.inDept1).causes.map(cause => cause.code), ['LEFT_PERIOD'])
  assert.ok(left(E.inDept1).components.length > 0, 'تفصيل البنود يبقى معروضًا')
  assert.deepEqual(left(E.inDept2).causes.map(cause => cause.code), ['LEFT_PERIOD', 'UNEXPLAINED'])
  const high = await get(admin, `/reports/payroll/variance?period=2026-07&comparePeriod=2026-06&minAmount=${Number(cents(wage.difference) / 100n) + 1}`)
  assert.equal(high.rows.some(item => item.employeeId === E.wageChange.id), false, 'رفع العتبة يقلل الصفوف')
  assert.equal(high.summary.employees, report.summary.employees, 'دون تغيير قيم الفروق أو عدد الموظفين')
  assert.equal((await request(admin, 'GET', '/reports/payroll/variance?period=2026-07&comparePeriod=2026-07')).status, 400)
  const scoped = await get(hrA, '/reports/payroll/variance?period=2026-07&comparePeriod=2026-06')
  assert.ok(scoped.rows.every(item => [E.inDept1.id, E.inDept2.id].includes(item.employeeId)))
})
