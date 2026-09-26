// C8 / الخطوة 31: مسار العكس والمسير التكميلي بعد الصرف على قاعدة SQL مؤقتة (hr_payroll_corrections_test_<hex>) — لا اتصال بـhr_system.
// قبول الخطوة: مسير PAID غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين به بـparentRunId دون تعديل صفوف المسير الأصلي، وقيود REVERSAL تُكتب
// في دفتر الأقساط، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف؛ ثم يُصرف التكميلي بالأرقام نفسها ويظهر في تقرير التسويات والقسيمة.
// ومعه: الصلاحية ونطاق الفرع، السبب، بصمة المعاينة، منع عكس البند مرتين، منع حساب مسير العكس وعكسه، فصل المهام، الإلغاء قبل التنفيذ، وأهلية التكميلي.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_corrections_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-corrections-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
const policyStart = '2026-05-23', attendanceEnd = '2026-08-22', period = '2026-08'
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
const REASON = 'صُرف أجر أغسطس بخطأ في إدخال الإضافي حسب مراجعة المالية رقم 88'
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, people = {}

function assertDisposable() {
  assert.match(database, /^hr_payroll_corrections_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const money = value => (Math.round(Number(value) * 100) / 100).toFixed(2)
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, code) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (code) assert.equal(response.body?.code, code, JSON.stringify(response.body))
  return response.body
}
async function setConfig(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value })
  else await config.save({ key, value })
}
async function employee(salary, branch = org.branch, lateOn = null, overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `C8E${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف تصحيح المسير ${employeeNumber}`,
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: salary, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // حضور محسوب ثابت للفترة يعزل الاختبار عن سياسة الغياب؛ يوم تأخير واحد عند الطلب
  const rows = []
  for (let time = Date.parse(`${policyStart}T12:00:00Z`); time <= Date.parse(`${attendanceEnd}T12:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    const late = lateOn && lateOn.date === date ? lateOn.minutes : 0
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: late ? 'late' : 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار التصحيح',
      shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: late, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
  return emp
}
// إضافي معتمد بلقطة اعتماد كاملة (OT-08): الساعات × 1.5 × (الأجر ÷ 30 ÷ 8)
async function approvedOvertime(emp, date, minutes) {
  const hours = minutes / 60, hourlyRate = Number(emp.basicSalary) / 30 / 8, amount = Math.round(hours * 1.5 * hourlyRate * 100) / 100
  const fingerprint = crypto.createHash('sha256').update(`c8:${emp.id}:${date}`).digest('hex')
  const approval = { schemaVersion: 1, employeeId: emp.id, workDate: date, approvedMinutes: minutes, approverId: users.admin.id, approvedAt: '2026-08-06T09:00:00.000Z',
    reason: null, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', evidenceFingerprint: fingerprint,
    evidence: { fingerprint, employeeId: emp.id, workDate: date, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', detectedMinutes: minutes, policy: { multiplier: 1.5 } },
    hours, multiplier: 1.5, hourlyRate, amount, wageBase: Number(emp.basicSalary), wageBasis: 'GROSS_MONTHLY_SALARY',
    wageComponents: [{ code: 'BASIC', amount: Number(emp.basicSalary) }], monthlyDays: 30, dailyHours: 8, originalPeriod: period, deferredFromRunId: null }
  return repo('OvertimeEntry').save({ employeeId: emp.id, date, source: 'BIOMETRIC_DETECTED', status: 'APPROVED', hoursActual: hours, hoursRequested: hours, payableHours: hours,
    rate: 1.5, approvedMinutes: minutes, hourlyRateSnapshot: hourlyRate, amountSnapshot: amount, originalPeriod: period, deferredFromRunId: null,
    calculationSnapshot: { schemaVersion: 1, submission: { requestedMinutes: minutes, evidence: { detectedMinutes: minutes } }, approval } })
}
async function publishPolicy(name) {
  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name, branchId: org.branch.id, effectiveFrom: policyStart, settings: { ...cycle23 } }), 201)
  const [version] = createdPolicy.versions
  const published = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة معدلات لاختبار تصحيح المسير المصروف' }), 200)
  return { policyId: createdPolicy.policy.id, versionId: published.version.id }
}
const calculate = async (run, user) => expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)
async function acknowledge(run, user) {
  const report = expectStatus(await request(user, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  return expectStatus(await request(user, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
}
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `missing item for ${emp.employeeCode}`); return row }

// صفوف المسير الأصلي كما في القاعدة (المسير وبنوده وأعضاؤه) — يجب ألا تتغير بالعكس أو التكميلي
async function runRows(runId) {
  const [run] = await query('SELECT * FROM [payroll_runs] WHERE [id]=@0', [runId])
  const items = await query('SELECT * FROM [payroll_items] WHERE [runId]=@0 ORDER BY [id]', [runId])
  const members = await query('SELECT * FROM [payroll_run_members] WHERE [runId]=@0 ORDER BY [id]', [runId])
  return JSON.parse(JSON.stringify({ run, items, members }))
}
// الحالة المالية للموظفين: الإضافي، الأقساط (الحالة المعيارية والمدفوع)، السلف، وقيود الدفتر
async function financialState(employeeIds) {
  const list = employeeIds.map(Number).filter(Number.isSafeInteger).join(',')
  const overtime = await query(`SELECT [id],[status],[payrollRunId] FROM [overtime_entries] WHERE [employeeId] IN (${list}) ORDER BY [id]`)
  const installments = await query(`SELECT i.[id],i.[loanId],CONVERT(varchar(10),i.[dueDate],23) AS [dueDate],CONVERT(varchar(40),i.[amount]) AS [amount],
      CONVERT(varchar(40),COALESCE(i.[paidAmount],CASE WHEN i.[paid]=1 THEN i.[amount] ELSE 0 END)) AS [paidAmount],CAST(i.[paid] AS int) AS [paid],
      CASE WHEN i.[paidAt] IS NULL THEN 0 ELSE 1 END AS [hasPaidAt],COALESCE(i.[financialStatus],CASE WHEN i.[paid]=1 THEN 'PAID' ELSE 'DUE' END) AS [status],i.[parentInstallmentId]
    FROM [loan_installments] i INNER JOIN [loans] l ON l.[id]=i.[loanId] WHERE l.[employeeId] IN (${list}) ORDER BY i.[id]`)
  const loans = await query(`SELECT [id],[status] FROM [loans] WHERE [employeeId] IN (${list}) ORDER BY [id]`)
  const obligations = await query(`SELECT [id],[employeeId],[type],[category],CONVERT(varchar(40),[amount]) AS [amount],[status],CONVERT(varchar(10),[effectiveDate],23) AS [effectiveDate],
      [targetPeriod],[appliedPayrollRunId],[payrollReversalRunId],[payrollReversalOfObligationId],[deductionRequestId],[bonusRequestId]
    FROM [employee_obligations] WHERE [employeeId] IN (${list}) ORDER BY [id]`)
  return JSON.parse(JSON.stringify({ overtime, installments, loans, obligations }))
}
const pendingShape = state => state.obligations.filter(row => row.status === 'PENDING')
  .map(({ employeeId, type, category, amount, effectiveDate, targetPeriod }) => ({ employeeId, type, category, amount, effectiveDate, targetPeriod }))

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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['payroll.late_deduction_enabled', 'true'], ['attendance.absence_penalty_days', '1'],
    ['attendance.weekend_days', 'FRI,SAT'], ['loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY']]) await setConfig(key, value)
  // فصل المهام مفعّل (الرخصة مبذورة مقفلة): من احتسب أو أنشأ العكس لا يعتمده
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.approval_self_approval_allowed' })).value, 'false')
  org.branch = await repo('Branch').save({ code: 'C8_A', name: 'فرع تصحيح المسير' })
  org.other = await repo('Branch').save({ code: 'C8_B', name: 'فرع آخر' })
  const user = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@payroll-corrections-test.invalid`, displayName: label, passwordHash: 'test-only',
    role, branchId: org.branch.id, permissions: JSON.stringify(permissions), ...extra })
  users.admin = await user('admin', 'super_admin', [], { branchId: null })
  users.desk = await user('payroll-desk', 'hr_manager', ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.cancel', 'payroll.reverse'])
  users.approver = await user('payroll-approver', 'hr_manager', ['payroll.view', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel'])
  users.clerk = await user('payroll-clerk', 'hr_manager', ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay'])
  users.otherBranch = await user('other-branch-desk', 'hr_manager', ['payroll.view', 'payroll.calculate', 'payroll.reverse'], { branchId: org.other.id })
  people.e1 = await employee(6000)
  people.e2 = await employee(3000)
  people.e3 = await employee(5000)
  users.e1 = await user('employee-e1', 'employee', [], { employeeId: people.e1.id })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { assert.match(path.basename(uploads), /^hr-payroll-corrections-files-/); fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll corrections fixture cleanup failed')
})

test('قبول الخطوة 31: مسير مصروف غلط يُصحح بمسير عكس ثم مسير تكميلي مربوطين دون تعديل صفوفه، والإضافي والأقساط والقيود ترجع لحالتها قبل الصرف', { timeout: 900000 }, async () => {
  const { e1, e2, e3 } = people
  const ids = [e1.id, e2.id, e3.id]
  const policy = await publishPolicy('مجموعة تصحيح المسير المصروف')
  // مصادر مالية حقيقية: إضافي معتمد وسلفة تُسدد كاملة وقيدا دفتر للموظف الأول، وسلفة أكبر من الصافي تُرحّل للموظف الثاني
  const overtime = await approvedOvertime(e1, '2026-08-05', 120)
  const loan1 = await repo('Loan').save({ employeeId: e1.id, amount: 1000, status: 'DISBURSED', disbursedAt: new Date('2026-07-01T08:00:00Z') })
  const inst1 = await repo('LoanInstallment').save({ loanId: loan1.id, dueDate: '2026-08-10', amount: 1000, paid: false })
  const loan2 = await repo('Loan').save({ employeeId: e2.id, amount: 5000, status: 'DISBURSED', disbursedAt: new Date('2026-07-01T08:00:00Z') })
  const inst2 = await repo('LoanInstallment').save({ loanId: loan2.id, dueDate: '2026-08-10', amount: 5000, paid: false })
  const debit = await repo('EmployeeObligation').save({ employeeId: e1.id, type: 'DEBIT', category: 'manual', amount: 250, label: 'استرداد عهدة مفقودة',
    status: 'PENDING', effectiveDate: '2026-08-01', sourceRef: 'c8:debit' })
  const credit = await repo('EmployeeObligation').save({ employeeId: e1.id, type: 'CREDIT', category: 'manual', amount: 400, label: 'بدل مهمة عمل',
    status: 'PENDING', effectiveDate: '2026-08-01', sourceRef: 'c8:credit' })

  // ١) المسير الأصلي: مسودة ← حساب ← اعتماد بمستخدم آخر ← صرف
  let run = expectStatus(await request(users.desk, 'POST', '/payroll/runs', { name: 'مسير أغسطس — قبل التصحيح', policyVersionId: policy.versionId, period,
    filters: { employeeIds: ids } }), 201)
  run = await calculate(run, users.desk)
  const item1 = itemOf(run, e1), item2 = itemOf(run, e2), item3 = itemOf(run, e3)
  assert.deepEqual([Number(item1.overtimeAmount), Number(item1.loanInstallments), Number(item1.otherDeductions), Number(item1.otherAdditions)], [75, 1000, 250, 400], JSON.stringify(item1))
  assert.ok(Number(item2.loanInstallments) > 0 && Number(item2.loanInstallments) < 5000, `الموظف الثاني يُخصم منه جزء ويُرحّل الباقي: ${item2.loanInstallments}`)
  const beforePay = await financialState(ids)
  await acknowledge(run, users.approver)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-C8-AUG' }), 201)
  const afterPay = await financialState(ids)
  assert.deepEqual(afterPay.overtime.map(row => [row.id, row.status, row.payrollRunId]), [[overtime.id, 'PAID', run.id]])
  assert.equal(afterPay.installments.find(row => row.id === inst1.id).status, 'PAID')
  const continuation = afterPay.installments.find(row => row.parentInstallmentId === inst2.id)
  assert.ok(continuation && continuation.status === 'DUE', JSON.stringify(afterPay.installments))
  assert.equal(afterPay.loans.find(row => row.id === loan1.id).status, 'SETTLED')
  assert.deepEqual(afterPay.obligations.filter(row => [debit.id, credit.id].includes(row.id)).map(row => row.status), ['APPLIED', 'APPLIED'])
  const original = await runRows(run.id)

  // ٢) الشاشة والصلاحية ونطاق الفرع
  const view = expectStatus(await request(users.desk, 'GET', `/payroll/runs/${run.id}/corrections`), 200)
  assert.deepEqual([view.run.runType, view.reversible.length, view.permissions.canReverse, view.supplementary.available, view.supplementary.candidates], ['REGULAR', 3, true, true, []])
  assert.equal(expectStatus(await request(users.clerk, 'GET', `/payroll/runs/${run.id}/corrections`), 200).permissions.canReverse, false)
  expectStatus(await request(users.clerk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, {}), 403)
  expectStatus(await request(users.clerk, 'POST', `/payroll/runs/${run.id}/reversals`, { reason: REASON, previewHash: 'a'.repeat(64) }), 403)
  expectStatus(await request(users.otherBranch, 'POST', `/payroll/runs/${run.id}/reversal-preview`, {}), 403)
  expectStatus(await request(users.e1, 'GET', `/payroll/runs/${run.id}/corrections`), 403)

  // ٣) معاينة العكس لموظفين وإنشاؤه بسبب وبصمة
  const selection = { employeeIds: [e1.id, e2.id] }
  const preview = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, selection), 201)
  assert.equal(preview.blocked, false, JSON.stringify(preview.blockers))
  const line1 = preview.lines.find(line => line.employeeId === e1.id), line2 = preview.lines.find(line => line.employeeId === e2.id)
  assert.deepEqual([line1.overtimeEntries, line1.installments, line1.installmentAmount, line1.obligations, line1.reinstatedDebits, line1.reinstatedCredits, line1.settledLoansReopened, line1.warnings],
    [1, 1, '1000.00', 2, '250.00', '400.00', 1, []])
  assert.deepEqual([line2.installments, line2.voidedContinuations, line2.installmentAmount], [1, 1, money(item2.loanInstallments)])
  assert.equal(preview.totalNet, money(Number(item1.netPay) + Number(item2.netPay)))
  assert.deepEqual(await financialState(ids), afterPay, 'المعاينة قراءة فقط')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { ...selection, reason: 'خطأ في الراتب', previewHash: preview.previewHash }), 400, 'PAYRUN-CORRECTION-REASON')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { ...selection, reason: REASON, previewHash: 'f'.repeat(64) }), 409, 'PAYRUN-REVERSAL-PREVIEW-STALE')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { employeeIds: [999999], reason: REASON, previewHash: preview.previewHash }), 400, 'PAYRUN-REVERSAL-EMPLOYEE-NOT-IN-RUN')
  const reversal = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { ...selection, reason: REASON, previewHash: preview.previewHash }), 201)
  assert.deepEqual([reversal.runType, reversal.parentRunId, reversal.status, reversal.correctionReason, Number(reversal.totalNet), reversal.items.length],
    ['REVERSAL', run.id, 'CALCULATED', REASON, -Number(preview.totalNet), 0])
  assert.deepEqual(reversal.correction.lines.map(line => [line.employeeId, line.status, line.netPay]), [[e1.id, 'PENDING', money(item1.netPay)], [e2.id, 'PENDING', money(item2.netPay)]])
  assert.deepEqual(await financialState(ids), afterPay, 'إنشاء مسير العكس لا ينفذ أثرًا ماليًا')

  // ٤) البند لا يُعكس مرتين، ومسير العكس لا يُحتسب ولا يُعكس ولا يغيّر وضع محركه، ومن أنشأه لا يعتمده
  const again = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, { employeeIds: [e1.id] }), 201)
  assert.deepEqual([again.blocked, again.blockers[0].code], [true, 'PAYRUN-REVERSAL-EXISTS'])
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { employeeIds: [e1.id], reason: REASON, previewHash: again.previewHash }), 409, 'PAYRUN-REVERSAL-BLOCKED')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${reversal.id}/recalculate`, { reason: 'إعادة حساب مسير العكس غير مسموحة' }), 409, 'PAYRUN-REVERSAL-NO-CALCULATION')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${reversal.id}/reversal-preview`, {}), 409, 'PAYRUN-REVERSAL-OF-REVERSAL')
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal.id}/engine-mode`, { mode: 'LEGACY', reason: 'تغيير وضع محرك مسير العكس' }), 409, 'PAYRUN-REVERSAL-NO-CALCULATION')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${reversal.id}/approve`), 403, 'PAYRUN-STATE-003')
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'REFUND-EARLY' }), 400, 'PAYRUN-STATE-001')

  // ٥) إلغاء عكس قبل تنفيذه: سطوره تُلغى وتبقى محفوظة، ويعود البند قابلًا للعكس
  const preview3 = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, { employeeIds: [e3.id] }), 201)
  const reversal3 = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversals`, { employeeIds: [e3.id], reason: REASON, previewHash: preview3.previewHash }), 201)
  assert.notEqual(reversal3.name, reversal.name)
  const cancelled = expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal3.id}/cancel`, { reason: 'أُنشئ العكس للموظف الخطأ بعد مراجعة الكشف' }), 201)
  assert.deepEqual([cancelled.status, cancelled.correction.lines.map(line => line.status)], ['CANCELLED', ['CANCELLED']])
  assert.equal(expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, { employeeIds: [e3.id] }), 201).blocked, false)

  // ٦) الاعتماد بمستخدم آخر لا ينفذ شيئًا، والتنفيذ بقيد الاسترداد يعيد الحالة قبل الصرف
  assert.equal(expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal.id}/approve`), 201).status, 'APPROVED')
  assert.deepEqual(await financialState(ids), afterPay, 'اعتماد مسير العكس لا ينفذ أثرًا ماليًا')
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal.id}/pay`), 400, 'PAYRUN-PAY-CHANNEL')
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${reversal.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'REFUND-C8-AUG' }), 201)
  const afterReversal = await financialState(ids)
  // الإضافي معتمد بلا مسير كما كان قبل الصرف
  assert.deepEqual(afterReversal.overtime, beforePay.overtime)
  // الأقساط الأصلية مستحقة بلا مدفوع كما كانت، والسلفة المسددة جارية مجددًا، وابن الترحيل مُلغى بلا رصيد ومرتبط بأصله
  assert.deepEqual(afterReversal.installments.filter(row => row.parentInstallmentId === null), beforePay.installments)
  assert.deepEqual(afterReversal.loans, beforePay.loans)
  const voided = afterReversal.installments.find(row => row.id === continuation.id)
  assert.deepEqual([voided.status, voided.paidAmount, voided.parentInstallmentId], ['REVERSED', '0.00', inst2.id])
  // القيود المستهلكة تبقى APPLIED تاريخيًا معلّمة بمسير العكس، وقيود إعادة PENDING بالمبالغ نفسها = الرصيد المعلق قبل الصرف
  assert.deepEqual(pendingShape(afterReversal), pendingShape(beforePay))
  assert.deepEqual(afterReversal.obligations.filter(row => [debit.id, credit.id].includes(row.id)).map(row => [row.status, row.appliedPayrollRunId, row.payrollReversalRunId]),
    [['APPLIED', run.id, reversal.id], ['APPLIED', run.id, reversal.id]])
  assert.deepEqual(afterReversal.obligations.filter(row => row.payrollReversalOfObligationId !== null).map(row => row.payrollReversalOfObligationId), [debit.id, credit.id])
  // دفتر الأقساط: حركة REVERSAL لكل قسط باسم مسير العكس، والحجز المنشور يبقى POSTED ويُحرر بمسير العكس
  const reversalEvents = await query(`SELECT [installmentId],[payrollRunId],[allocationId] FROM [loan_installment_events] WHERE [action]='REVERSAL' ORDER BY [installmentId]`)
  assert.deepEqual(reversalEvents.map(row => [row.installmentId, row.payrollRunId]), [[inst1.id, reversal.id], [inst2.id, reversal.id]])
  const allocations = await query(`SELECT [installmentId],[status],[reversalRunId],CASE WHEN [releasedAt] IS NULL THEN 0 ELSE 1 END AS [released]
    FROM [loan_installment_allocations] WHERE [payrollRunId]=@0 ORDER BY [installmentId]`, [run.id])
  assert.deepEqual(allocations.map(row => [row.installmentId, row.status, row.reversalRunId, row.released]), [[inst1.id, 'POSTED', reversal.id, 1], [inst2.id, 'POSTED', reversal.id, 1]])
  assert.deepEqual((await query(`SELECT [entryId] FROM [overtime_entry_events] WHERE [eventType]='PAYROLL_REVERSED'`)).map(row => row.entryId), [overtime.id])
  const claims = await query(`SELECT [employeeId],CASE WHEN [releasedAt] IS NULL THEN 0 ELSE 1 END AS [released] FROM [payroll_period_claims] WHERE [runId]=@0 ORDER BY [employeeId]`, [run.id])
  assert.deepEqual(claims.map(row => [row.employeeId, row.released]), [[e1.id, 1], [e2.id, 1], [e3.id, 0]])
  // صفوف المسير الأصلي وبنوده وأعضاؤه لم تتغير
  assert.deepEqual(await runRows(run.id), original, 'صفوف المسير الأصلي لا تُعدَّل بالعكس')
  const paidReversal = expectStatus(await request(users.desk, 'GET', `/payroll/runs/${reversal.id}`), 200)
  assert.deepEqual([paidReversal.status, paidReversal.payReference, paidReversal.correction.parentRun.id, paidReversal.correction.runType], ['PAID', 'REFUND-C8-AUG', run.id, 'REVERSAL'])
  assert.deepEqual(paidReversal.correction.lines.map(line => [line.employeeId, line.status, line.effects.overtime, line.effects.installments, line.effects.obligations]),
    [[e1.id, 'POSTED', 1, 1, 2], [e2.id, 'POSTED', 0, 1, 0]])
  const parentEvents = expectStatus(await request(users.desk, 'GET', `/payroll/runs/${run.id}/events`), 200).map(event => event.eventType)
  for (const type of ['REVERSAL_CREATED', 'REVERSAL_CANCELLED', 'REVERSAL_POSTED']) assert.ok(parentEvents.includes(type), `${type} in ${parentEvents}`)
  // القسيمة الأصلية تبقى في سجل الموظف موسومة بعكسها وسببه، و«بلا مسير» يعرض الموظفَين المعكوسين
  const slip = expectStatus(await request(users.e1, 'GET', `/payroll/items/${item1.id}`), 200)
  assert.deepEqual([slip.reversal.line.status, slip.reversal.line.reversalRunId, slip.reversal.line.reason, slip.reversal.supplementary], ['POSTED', reversal.id, REASON, []])
  const unassigned = expectStatus(await request(users.approver, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  assert.deepEqual(unassigned.rows.map(row => row.employeeId).filter(id => ids.includes(id)).sort((a, b) => a - b), [e1.id, e2.id])
  // تقرير «بلا مسير» في تقارير الرواتب (الخطوة 30): المعكوسان بلا مسير بسبب العكس، والثالث مغطى بمسيره
  const reportUnassigned = expectStatus(await request(users.admin, 'GET', `/reports/payroll/unassigned?period=${period}`), 200)
  assert.deepEqual(reportUnassigned.rows.filter(row => ids.includes(row.employeeId)).map(row => [row.employeeId, row.reason]).sort((a, b) => a[0] - b[0]),
    [[e1.id, 'REVERSED_IN_RUN'], [e2.id, 'REVERSED_IN_RUN']])

  // ٧) المسير التكميلي: المؤهلون من عُكس بندهم، وبنسخة سياسة المسير الأصلي وفترته
  const afterView = expectStatus(await request(users.desk, 'GET', `/payroll/runs/${run.id}/corrections`), 200)
  assert.deepEqual(afterView.supplementary.candidates.map(row => [row.employeeId, row.basis, row.eligible, row.warning]), [[e1.id, 'REVERSED', true, null], [e2.id, 'REVERSED', true, null]])
  assert.deepEqual(afterView.reversible.map(row => [row.employeeId, row.reversal?.status ?? null]), [[e1.id, 'POSTED'], [e2.id, 'POSTED'], [e3.id, null]])
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/supplementary`, { employeeIds: [e1.id, e3.id], reason: REASON }), 409, 'PAYRUN-SUPPLEMENTARY-NOT-ELIGIBLE')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/supplementary`, { employeeIds: [e1.id], reason: 'قصير' }), 400, 'PAYRUN-CORRECTION-REASON')
  expectStatus(await request(users.desk, 'POST', `/payroll/runs/${reversal.id}/supplementary`, { employeeIds: [e1.id], reason: REASON }), 409, 'PAYRUN-REVERSAL-OF-REVERSAL')
  let supplementary = expectStatus(await request(users.desk, 'POST', `/payroll/runs/${run.id}/supplementary`, { employeeIds: [e1.id, e2.id], reason: REASON }), 201)
  assert.deepEqual([supplementary.runType, supplementary.parentRunId, supplementary.status, supplementary.policyVersionId, supplementary.startDate, supplementary.endDate, supplementary.correctionReason],
    ['SUPPLEMENTARY', run.id, 'DRAFT', policy.versionId, run.startDate, run.endDate, REASON])
  expectStatus(await request(users.desk, 'PATCH', `/payroll/runs/${supplementary.id}`, { filters: { branchIds: [], departmentIds: [], teamIds: [], employeeIds: ids } }), 409, 'PAYRUN-SUPPLEMENTARY-DEFINITION')
  supplementary = await calculate(supplementary, users.desk)
  const s1 = itemOf(supplementary, e1), s2 = itemOf(supplementary, e2)
  assert.equal(supplementary.items.length, 2)
  const amounts = item => ['netPay', 'overtimeAmount', 'loanInstallments', 'otherDeductions', 'otherAdditions'].map(field => money(item[field]))
  assert.deepEqual(amounts(s1), amounts(item1), 'الموظف الأول: التكميلي يعيد المصادر نفسها بالأرقام نفسها')
  assert.deepEqual(amounts(s2), amounts(item2), 'الموظف الثاني: القسط المستحق نفسه يُخصم من جديد')
  await acknowledge(supplementary, users.approver)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${supplementary.id}/approve`), 201)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${supplementary.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-C8-AUG-SUP' }), 201)
  const afterSupplementary = await financialState(ids)
  assert.deepEqual(afterSupplementary.overtime.map(row => [row.id, row.status, row.payrollRunId]), [[overtime.id, 'PAID', supplementary.id]])
  assert.equal(afterSupplementary.installments.find(row => row.id === inst1.id).status, 'PAID')
  assert.equal(afterSupplementary.loans.find(row => row.id === loan1.id).status, 'SETTLED')
  // الترحيل الجديد يعيد تفعيل ابن الترحيل المُلغى نفسه (ابن واحد لكل أصل) بالمبلغ نفسه
  assert.deepEqual(afterSupplementary.installments.filter(row => row.parentInstallmentId === inst2.id).map(row => [row.id, row.status, row.amount]), [[continuation.id, 'DUE', continuation.amount]])
  assert.deepEqual(afterSupplementary.obligations.filter(row => row.payrollReversalOfObligationId !== null).map(row => [row.status, row.appliedPayrollRunId]),
    [['APPLIED', supplementary.id], ['APPLIED', supplementary.id]])

  // ٨) تقرير التسويات: المصروف − المعكوس + التكميلي، وفرق التسوية صفر لأن الأرقام نفسها
  const reconciliation = expectStatus(await request(users.desk, 'GET', `/payroll/runs/${supplementary.id}/corrections`), 200).reconciliation
  const net1 = money(item1.netPay)
  const r1 = reconciliation.employees.find(row => row.employeeId === e1.id)
  assert.deepEqual([r1.originalNet, r1.reversedNet, r1.supplementaryPaidNet, r1.effectiveNet, r1.settlementDifference], [net1, net1, net1, net1, '0.00'])
  assert.deepEqual(reconciliation.runs.map(row => [row.id, row.runType, row.status]),
    [[run.id, 'REGULAR', 'PAID'], [reversal.id, 'REVERSAL', 'PAID'], [reversal3.id, 'REVERSAL', 'CANCELLED'], [supplementary.id, 'SUPPLEMENTARY', 'PAID']])
  assert.equal(reconciliation.totals.settlementDifference, '0.00')
  const report = expectStatus(await request(users.desk, 'GET', `/payroll/corrections/report?fromPeriod=${period}&toPeriod=${period}`), 200)
  assert.deepEqual([report.totals.chains, report.chains[0].root.id, report.totals.reversedNet, report.totals.supplementaryPaidNet, report.totals.settlementDifference],
    [1, run.id, preview.totalNet, preview.totalNet, '0.00'])
  assert.equal(expectStatus(await request(users.otherBranch, 'GET', `/payroll/corrections/report?fromPeriod=${period}&toPeriod=${period}`), 200).totals.chains, 0)

  // ٩) تقارير الرواتب (الخطوة 30) بعد العكس والتكميلي: البند المعكوس لا يُحتسب مرة ثانية بجوار التكميلي، ومسير العكس بسطوره سالبة
  const net2 = money(item2.netPay), net3 = money(item3.netPay), reversedTotal = money(Number(net1) + Number(net2))
  const loansTotal = money(Number(item1.loanInstallments) + Number(item2.loanInstallments) + Number(item3.loanInstallments))
  const runsReport = expectStatus(await request(users.admin, 'GET', '/reports/payroll'), 200)
  const reportRow = id => runsReport.runs.find(row => row.id === id)
  assert.deepEqual(['runType', 'employees', 'reversedEmployees', 'reversedNet'].map(key => reportRow(run.id)[key]), ['REGULAR', 3, 2, reversedTotal])
  assert.deepEqual(['runType', 'parentRunId', 'employees', 'totalNet'].map(key => reportRow(reversal.id)[key]), ['REVERSAL', run.id, 2, money(-Number(reversedTotal))])
  assert.deepEqual(['runType', 'parentRunId', 'employees', 'totalNet'].map(key => reportRow(supplementary.id)[key]), ['SUPPLEMENTARY', run.id, 2, money(Number(s1.netPay) + Number(s2.netPay))])
  const augustTotals = runsReport.deductions.find(row => row.period === period)
  assert.deepEqual([augustTotals.employees, augustTotals.net, augustTotals.overtime, augustTotals.loans], [3, money(Number(net1) + Number(net2) + Number(net3)), '75.00', loansTotal])
  assert.deepEqual(runsReport.byMethod.map(row => [row.payMethod, row.count, row.total]), [['transfer', 3, augustTotals.net]])
  const variance = expectStatus(await request(users.admin, 'GET', `/reports/payroll/variance?period=${period}&comparePeriod=2026-07`), 200)
  assert.deepEqual(['currentRuns', 'currentNet'].map(key => variance.rows.find(row => row.employeeId === e1.id)[key]), [[supplementary.id], net1])
  assert.equal(variance.totals.find(row => row.key === 'netPay').current, augustTotals.net)
  const overtimeReport = expectStatus(await request(users.admin, 'GET', `/reports/payroll/overtime?period=${period}`), 200)
  const overtimeRow = overtimeReport.rows.find(row => row.id === overtime.id)
  assert.deepEqual([overtimeRow.run?.id, overtimeRow.amount, overtimeRow.amountSource], [supplementary.id, '75.00', 'PAYROLL_ITEM'])
  assert.deepEqual([overtimeReport.summary.paidInRunsAmount, overtimeReport.summary.payrollColumnTotal], ['75.00', '75.00'])
  const loansReport = expectStatus(await request(users.admin, 'GET', `/reports/payroll/loans?period=${period}`), 200)
  assert.deepEqual([loansReport.summary.period.payrollColumnTotal, loansReport.summary.period.allocatedInRuns], [loansTotal, loansTotal])
  const unassignedAfter = expectStatus(await request(users.admin, 'GET', `/reports/payroll/unassigned?period=${period}`), 200)
  assert.deepEqual([unassignedAfter.rows.filter(row => ids.includes(row.employeeId)), unassignedAfter.duplicates.filter(row => ids.includes(row.employeeId))], [[], []])
  // القسيمة الأصلية تشير لقسيمة التكميلي، وقسائم الموظف تحمل الاثنتين
  const slip2 = expectStatus(await request(users.e1, 'GET', `/payroll/items/${item1.id}`), 200)
  assert.deepEqual(slip2.reversal.supplementary.map(row => [row.runId, row.itemId, row.netPay]), [[supplementary.id, s1.id, net1]])
  const mine = expectStatus(await request(users.e1, 'GET', '/payroll/my-payslips'), 200)
  assert.deepEqual(mine.map(row => [row.item.id, row.reversal?.line?.status ?? null]).sort((a, b) => a[0] - b[0]), [[item1.id, 'POSTED'], [s1.id, null]])
  // الأصل لم يتغير بعد التكميلي أيضًا، والموظف الثالث بقي على مسيره الأصلي
  assert.deepEqual(await runRows(run.id), original, 'صفوف المسير الأصلي لا تُعدَّل بالتكميلي')
  assert.equal(item3.runId, run.id)
})

test('العكس والإعفاء المالي (C3): إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي دون منح جديد ولا تجاوز حدود، فيعود الصافي نفسه وفرق التسوية صفرًا', { timeout: 900000 }, async () => {
  const branch = org.other
  const exemptionPerms = ['financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits']
  const make = (label, permissions) => repo('User').save({ email: `${label}@payroll-corrections-test.invalid`, displayName: label, passwordHash: 'test-only', role: 'hr_manager',
    branchId: branch.id, permissions: JSON.stringify(permissions) })
  const desk = await make('exemption-desk', ['payroll.view', 'payroll.calculate', 'payroll.cancel', 'payroll.reverse', ...exemptionPerms])
  const approver = await make('exemption-approver', ['payroll.view', 'payroll.approve', 'payroll.pay', 'financial_exemption.view'])
  // نسبة المانح تُختبر في مجموعة C3؛ مسير بموظف واحد يجعل أي إعفاء 100% من خصوماته
  await setConfig('financial_exemptions.max_pct_per_grantor', '0')
  // حد الموظف: إعفاءان خلال 12 شهرًا. الإعفاء الأصلي ونسخته المنقولة قرار واحد، فمعاينة إعفاء آخر على التكميلي لا تطلب تجاوزًا
  await setConfig('financial_exemptions.max_per_employee_year', '2')
  await setConfig('financial_exemptions.attachment_threshold_days', '2')
  const e4 = await employee(6000, branch, { date: '2026-08-03', minutes: 60 })
  // يوم غياب بلا إذن يبقى خصمًا غير مُعفى في المسيرين
  await repo('AttendanceDay').update({ employeeId: e4.id, date: '2026-08-04' }, { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0, lateMinutes: 0 })
  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name: 'مجموعة الفرع الآخر — تصحيح وإعفاء', branchId: branch.id, effectiveFrom: policyStart, settings: { ...cycle23 } }), 201)
  const [version] = createdPolicy.versions
  const policy = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة معدلات لاختبار العكس مع الإعفاء المالي' }), 200)
  const reason = 'عطل بوابة البصمة صباح يوم الواقعة بمحضر الموارد البشرية الرسمي رقم 17'
  const grantInput = (target, targetKind) => ({ runId: target.id, employeeId: e4.id, reason, scopeKind: 'DEDUCTION_TYPE', targetKind })

  // مسير مصروف طُبق فيه إعفاء التأخير (والغياب مخصوم)
  let run = expectStatus(await request(desk, 'POST', '/payroll/runs', { name: 'مسير أغسطس — إعفاء ثم عكس', policyVersionId: policy.version.id, period, filters: { employeeIds: [e4.id] } }), 201)
  run = await calculate(run, desk)
  const lateness = Number(itemOf(run, e4).latenessDeduction), absence = Number(itemOf(run, e4).absenceDeduction)
  assert.ok(lateness > 0 && absence > 0, `يوم التأخير ويوم الغياب يولّدان خصمين: ${JSON.stringify(itemOf(run, e4))}`)
  const shown = expectStatus(await request(desk, 'POST', '/payroll/exemptions/preview', grantInput(run, 'LATENESS')), 201)
  const exemption = expectStatus(await request(desk, 'POST', '/payroll/exemptions', { ...grantInput(run, 'LATENESS'), previewHash: shown.previewHash }), 201)
  assert.equal(exemption.status, 'ACTIVE', JSON.stringify(exemption))
  run = expectStatus(await request(desk, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد قرار الإعفاء المالي من خصم التأخير' }), 201)
  const item = itemOf(run, e4)
  assert.deepEqual([money(item.latenessDeduction), money(item.absenceDeduction)], ['0.00', money(absence)])
  await acknowledge(run, approver)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-C8-EXEMPT' }), 201)
  assert.equal((await repo('PayrollFinancialExemption').findOneByOrFail({ id: exemption.id })).status, 'APPLIED')

  // المعاينة: لا مانع، وتنبيه أن إعفاء الحضور يُنقل للتكميلي
  const preview = expectStatus(await request(desk, 'POST', `/payroll/runs/${run.id}/reversal-preview`, { employeeIds: [e4.id] }), 201)
  const line = preview.lines[0]
  assert.deepEqual([preview.blocked, line.exemptions, line.warnings.map(row => [row.code, row.exemptionIds])], [false, 1, [['PAYRUN-REVERSAL-EXEMPTION-CARRIED', [exemption.id]]]])
  const reversal = expectStatus(await request(desk, 'POST', `/payroll/runs/${run.id}/reversals`, { employeeIds: [e4.id], reason: REASON, previewHash: preview.previewHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${reversal.id}/approve`), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${reversal.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'REFUND-C8-EXEMPT' }), 201)
  // القرار يبقى مطبقًا على مسيره، وتُسجل عليه واقعة العكس
  assert.equal((await repo('PayrollFinancialExemption').findOneByOrFail({ id: exemption.id })).status, 'APPLIED')
  const events = await query(`SELECT [eventType],[runId] FROM [payroll_financial_exemption_events] WHERE [exemptionId]=@0 ORDER BY [id]`, [exemption.id])
  assert.ok(events.some(row => row.eventType === 'RUN_REVERSED' && row.runId === run.id), JSON.stringify(events))

  // المرشح للتكميلي يحمل ما سيُنقل، وإنشاء التكميلي ينقل الإعفاء بقراره الأصلي ومرجعه
  const view = expectStatus(await request(desk, 'GET', `/payroll/runs/${run.id}/corrections`), 200)
  const [candidate] = view.supplementary.candidates
  assert.deepEqual([candidate.employeeId, candidate.eligible, candidate.exemptionIds, candidate.carriedExemptionIds], [e4.id, true, [exemption.id], [exemption.id]])
  assert.match(candidate.warning, /يُنقل تلقائيًا بقراره الأصلي إلى المسير التكميلي/)
  let supplementary = expectStatus(await request(desk, 'POST', `/payroll/runs/${run.id}/supplementary`, { employeeIds: [e4.id], reason: REASON }), 201)
  const carried = await repo('PayrollFinancialExemption').find({ where: { runId: supplementary.id } })
  assert.equal(carried.length, 1, 'نسخة واحدة منقولة على التكميلي')
  const [copy] = carried
  assert.deepEqual([copy.status, copy.employeeId, copy.scopeKind, copy.targetKind, copy.disposition, copy.reason, copy.grantedByUserId, copy.grantorBasis, copy.overrides],
    ['ACTIVE', e4.id, 'DEDUCTION_TYPE', 'LATENESS', 'DROP', reason, desk.id, 'HR', null])
  const carriedFrom = JSON.parse(copy.evaluation).carriedFrom
  assert.deepEqual([carriedFrom.exemptionId, carriedFrom.runId, carriedFrom.reversalRunId, carriedFrom.supplementaryRunId], [exemption.id, run.id, reversal.id, supplementary.id])
  const carryEvents = await query(`SELECT [exemptionId],[eventType],[runId] FROM [payroll_financial_exemption_events] WHERE [eventType] IN ('CARRIED_FROM_REVERSED_RUN','CARRIED_TO_SUPPLEMENTARY') ORDER BY [id]`)
  assert.deepEqual(carryEvents.map(row => [row.exemptionId, row.eventType, row.runId]), [[copy.id, 'CARRIED_FROM_REVERSED_RUN', supplementary.id], [exemption.id, 'CARRIED_TO_SUPPLEMENTARY', run.id]])
  const supplementaryEvent = expectStatus(await request(desk, 'GET', `/payroll/runs/${run.id}/events`), 200).find(event => event.eventType === 'SUPPLEMENTARY_CREATED')
  assert.deepEqual(supplementaryEvent.payload.carriedExemptions, [{ fromExemptionId: exemption.id, exemptionId: copy.id, employeeId: e4.id }])

  // حساب التكميلي يطبق الإعفاء المنقول: التأخير صفر والغياب مخصوم فيعود الصافي كما صُرف — بلا منح جديد ولا تبرير تجاوز
  supplementary = await calculate(supplementary, desk)
  const sItem = itemOf(supplementary, e4)
  assert.deepEqual([money(sItem.latenessDeduction), money(sItem.absenceDeduction), money(sItem.netPay)], ['0.00', money(absence), money(item.netPay)])
  // حد الموظف 2: الأصل على بند معكوس لا يُحتسب مع نسخته، فمعاينة إعفاء الغياب تُقبل بلا تجاوز (لو احتُسبا لطُلب تبرير التجاوز)
  const absencePreview = expectStatus(await request(desk, 'POST', '/payroll/exemptions/preview', grantInput(supplementary, 'ABSENCE')), 201)
  assert.deepEqual(absencePreview.overrides, [])
  await acknowledge(supplementary, approver)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${supplementary.id}/approve`), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${supplementary.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-C8-EXEMPT-SUP' }), 201)
  const appliedCopy = await repo('PayrollFinancialExemption').findOneByOrFail({ id: copy.id })
  assert.deepEqual([appliedCopy.status, money(appliedCopy.exemptedAmountSnapshot)], ['APPLIED', money(lateness)])
  const reconciliation = expectStatus(await request(desk, 'GET', `/payroll/runs/${run.id}/corrections`), 200).reconciliation
  assert.deepEqual([reconciliation.totals.reversedNet, reconciliation.totals.supplementaryPaidNet, reconciliation.totals.settlementDifference], [money(item.netPay), money(item.netPay), '0.00'])
  // تقرير حوكمة الإعفاءات: القرار المنقول يُحتسب مرة واحدة (نسخة التكميلي) والمطابقة مع بنود المسيرات صفر
  const governance = expectStatus(await request(desk, 'GET', `/payroll/exemptions/report?fromPeriod=${period}&toPeriod=${period}`), 200)
  assert.deepEqual([governance.totals.applied, governance.totals.exemptedAmount, governance.reconciliation.difference], [1, money(lateness), '0.00'])
})

test('العكس مع الخصم المصنف والمكافأة الفردية وعكسهما اليدوي والسلف: القيود تُعاد بمراجع طلباتها وأحداثها وتُصرف في التكميلي، وقيد العكس اليدوي لا يمنع عكس مسيره، والسلفة تعود لحالتها قبل الصرف', { timeout: 900000 }, async () => {
  const branch = await repo('Branch').save({ code: 'C8_C', name: 'فرع الخصومات والمكافآت' })
  const make = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@payroll-corrections-test.invalid`, displayName: label, passwordHash: 'test-only', role,
    branchId: branch.id, permissions: JSON.stringify(permissions), ...extra })
  const desk = await make('typed-desk', 'hr_manager', ['payroll.view', 'payroll.calculate', 'payroll.cancel', 'payroll.reverse',
    'deductions.view', 'deductions.approve', 'deductions.manage', 'bonuses.view', 'bonuses.approve', 'bonuses.manage'])
  const approver = await make('typed-approver', 'hr_manager', ['payroll.view', 'payroll.approve', 'payroll.pay'])
  const lead = await employee(9000, branch)
  const e5 = await employee(9000, branch, null, { managerEmployeeId: lead.id })
  const manager = await make('typed-manager', 'employee', [], { employeeId: lead.id })
  const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
  // أنواع الخصم والمكافأة لكل الشركة (عزل الفروع — 16 سبتمبر): يُعرّفها حساب على مستوى الشركة، وحساب الفرع يستخدمها بس
  const deductionType = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'C8_FIXED', nameAr: 'خصم إداري لاختبار التصحيح', category: 'ADMINISTRATIVE',
    calcMethod: 'FIXED_AMOUNT', creatorScopes: ['DIRECT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: null }), 201)
  const bonusType = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'C8_SPOT', nameAr: 'مكافأة فورية لاختبار التصحيح', calcMethod: 'FIXED_AMOUNT' }), 201)
  // المدير المباشر ينشئ والموارد البشرية تعتمد (المكافأة الفردية تحتاج اعتمادًا)
  const approvedDeduction = async (inputValue, targetPeriod) => {
    const row = expectStatus(await request(manager, 'POST', '/deductions', { deductionTypeId: deductionType.id, inputValue, incidentDate, targetPeriod, employeeId: e5.id,
      reason: 'تأخر متكرر عن اجتماع التسليم الصباحي لفريق العمليات' }), 201)
    return expectStatus(await request(desk, 'POST', `/deductions/${row.id}/approve`, { expectedRevision: 0, reason: 'موثق بمحضر اجتماع الفريق' }), 201)
  }
  const approvedBonus = async (inputValue, targetPeriod) => {
    const row = expectStatus(await request(manager, 'POST', '/bonuses', { bonusTypeId: bonusType.id, inputValue, targetPeriod, employeeId: e5.id,
      reason: 'أداء متميز في تسليم مشروع الربع الثالث للعميل الرئيسي' }), 201)
    return expectStatus(await request(desk, 'POST', `/bonuses/${row.id}/approve`, { expectedRevision: 0, reason: 'موثق بتقرير العميل' }), 201)
  }
  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name: 'مجموعة فرع الخصومات والمكافآت', branchId: branch.id, effectiveFrom: policyStart, settings: { ...cycle23 } }), 201)
  const [version] = createdPolicy.versions
  const policy = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة معدلات لاختبار العكس مع الخصم والمكافأة' }), 200)
  const calculatedRun = async (name, runPeriod) => calculate(expectStatus(await request(desk, 'POST', '/payroll/runs', { name, policyVersionId: policy.version.id, period: runPeriod,
    filters: { employeeIds: [e5.id] } }), 201), desk)
  const approveAndPay = async (target, reference) => {
    await acknowledge(target, approver)
    expectStatus(await request(approver, 'POST', `/payroll/runs/${target.id}/approve`), 201)
    expectStatus(await request(approver, 'POST', `/payroll/runs/${target.id}/pay`, { channel: 'BANK_TRANSFER', reference }), 201)
  }
  const detail = async (kind, id) => expectStatus(await request(desk, 'GET', `/${kind}/${id}`), 200)
  const loanEvents = async runId => (await query(`SELECT [loanId], JSON_VALUE([payload], '$.loanStatusBefore') AS [before] FROM [loan_installment_events]
    WHERE [action]='PAYROLL_POSTED' AND [payrollRunId]=@0 ORDER BY [loanId]`, [runId])).map(row => [row.loanId, row.before])

  // ١) يوليو: خصم مصنف ومكافأة فردية معتمدان يُصرفان
  const d1 = await approvedDeduction('300', '2026-07')
  const b1 = await approvedBonus('250', '2026-07')
  const july = await calculatedRun('مسير يوليو — خصم ومكافأة', '2026-07')
  assert.deepEqual([money(itemOf(july, e5).otherDeductions), money(itemOf(july, e5).otherAdditions)], ['300.00', '250.00'])
  await approveAndPay(july, 'TRX-C8-TYPED-JUL')

  // ٢) عكس يدوي (DD-12) لجزء من الخصم والمكافأة بعد صرفهما؛ الخادم يؤرخ قيد العكس بساعة التشغيل فيُنقل لشهر الاختبار المفتوح (أغسطس)
  for (const [kind, row, amount] of [['deductions', d1, '100'], ['bonuses', b1, '50']]) {
    expectStatus(await request(desk, 'POST', `/${kind}/${row.id}/reverse`, { expectedRevision: (await detail(kind, row.id)).revision,
      reason: 'ثبت بعد مراجعة المالية أن جزءًا من المبلغ محسوب بالخطأ', amount }), 201)
  }
  const d1Credit = await repo('EmployeeObligation').findOneByOrFail({ deductionRequestId: d1.id, category: 'deduction_reversal' })
  const b1Debit = await repo('EmployeeObligation').findOneByOrFail({ bonusRequestId: b1.id, category: 'bonus_reversal' })
  for (const entry of [d1Credit, b1Debit]) await repo('EmployeeObligation').update({ id: entry.id }, { targetPeriod: period, effectiveDate: '2026-07-23' })

  // ٣) أغسطس: خصم ومكافأة جديدان، وقيدا العكس اليدوي، وسلفتان تُسددان كاملتين: معتمدة بلا تاريخ صرف (مثل سلف الشركة) وجاري سدادها بتاريخ صرف
  const d2 = await approvedDeduction('200', period)
  const b2 = await approvedBonus('150', period)
  const approvedLoan = await repo('Loan').save({ employeeId: e5.id, amount: 700, status: 'APPROVED' })
  await repo('LoanInstallment').save({ loanId: approvedLoan.id, dueDate: '2026-08-10', amount: 700, paid: false })
  const disbursedLoan = await repo('Loan').save({ employeeId: e5.id, amount: 300, status: 'DISBURSED', disbursedAt: new Date('2026-07-01T08:00:00Z') })
  await repo('LoanInstallment').save({ loanId: disbursedLoan.id, dueDate: '2026-08-10', amount: 300, paid: false })
  const august = await calculatedRun('مسير أغسطس — خصم ومكافأة وعكسهما وسلف', period)
  const item = itemOf(august, e5)
  assert.deepEqual([money(item.otherDeductions), money(item.otherAdditions), money(item.loanInstallments)], ['250.00', '250.00', '1000.00'], JSON.stringify(item))
  const beforePay = await financialState([e5.id])
  assert.deepEqual(beforePay.loans.map(row => row.status), ['APPROVED', 'DISBURSED'])
  await approveAndPay(august, 'TRX-C8-TYPED-AUG')
  assert.deepEqual((await financialState([e5.id])).loans.map(row => row.status), ['SETTLED', 'SETTLED'])
  assert.deepEqual(await loanEvents(august.id), [[approvedLoan.id, 'APPROVED'], [disbursedLoan.id, 'DISBURSED']], 'حركة الصرف تحفظ حالة السلفة قبله')

  // ٤) عكس يوليو ممنوع بحق: لأصل الخصم والمكافأة عكس يدوي مستهلك خارج مسيرهما
  const julyPreview = expectStatus(await request(desk, 'POST', `/payroll/runs/${july.id}/reversal-preview`, { employeeIds: [e5.id] }), 201)
  assert.deepEqual([julyPreview.blocked, julyPreview.blockers.map(row => row.code)], [true, ['PAYRUN-REVERSAL-OBLIGATION-REVERSED', 'PAYRUN-REVERSAL-OBLIGATION-REVERSED']])

  // ٥) عكس أغسطس: قيدا العكس اليدوي المستهلكان فيه لا يمنعان عكسه، ويُعاد كل قيد بمرجع طلبه والسلفتان لحالتيهما
  const preview = expectStatus(await request(desk, 'POST', `/payroll/runs/${august.id}/reversal-preview`, { employeeIds: [e5.id] }), 201)
  assert.equal(preview.blocked, false, JSON.stringify(preview.blockers))
  const [line] = preview.lines
  assert.deepEqual([line.obligations, line.reinstatedDebits, line.reinstatedCredits, line.installments, line.settledLoansReopened, line.reopenedLoanStatuses],
    [4, '250.00', '250.00', 2, 2, [{ loanId: approvedLoan.id, status: 'APPROVED' }, { loanId: disbursedLoan.id, status: 'DISBURSED' }]])
  const reversal = expectStatus(await request(desk, 'POST', `/payroll/runs/${august.id}/reversals`, { employeeIds: [e5.id], reason: REASON, previewHash: preview.previewHash }), 201)
  await approveAndPay(reversal, 'REFUND-C8-TYPED-AUG')
  const afterReversal = await financialState([e5.id])
  assert.deepEqual(afterReversal.loans, beforePay.loans, 'السلفتان تعودان لحالتهما قبل الصرف: معتمدة وجاري سدادها')
  const requestShape = rows => rows.filter(row => row.status === 'PENDING')
    .map(({ type, category, amount, targetPeriod, deductionRequestId, bonusRequestId }) => ({ type, category, amount, targetPeriod, deductionRequestId, bonusRequestId }))
  assert.deepEqual(requestShape(afterReversal.obligations), requestShape(beforePay.obligations), 'القيود المعلقة بعد العكس = قبل الصرف بالنوع والتصنيف والمبلغ والشهر ومرجع الطلب')
  assert.equal(requestShape(beforePay.obligations).length, 4)
  assert.deepEqual((await query(`SELECT [requestId] FROM [deduction_request_events] WHERE [eventType]='PAYROLL_REVERSED' ORDER BY [requestId]`)).map(row => row.requestId), [d1.id, d2.id])
  assert.deepEqual((await query(`SELECT [requestId] FROM [bonus_request_events] WHERE [eventType]='PAYROLL_REVERSED' ORDER BY [requestId]`)).map(row => row.requestId), [b1.id, b2.id])
  // حالة الطلبات بعد العكس: المكافأة بانتظار الصرف من جديد، والمحصل والمعكوس لا يُحتسبان مرتين
  const [b1View, b2View, d1View, d2View] = [await detail('bonuses', b1.id), await detail('bonuses', b2.id), await detail('deductions', d1.id), await detail('deductions', d2.id)]
  assert.deepEqual([b2View.payout.state, b2View.paidAmount, b1View.reversedAmount, d1View.collectedAmount, d1View.reversedAmount, d2View.collectedAmount],
    ['AWAITING_PAYROLL', '0.00', '50.00', '300.00', '100.00', '0.00'])

  // ٦) التكميلي يصرف القيود المعادة بالأرقام نفسها ويسدد السلفتين من جديد
  let supplementary = expectStatus(await request(desk, 'POST', `/payroll/runs/${august.id}/supplementary`, { employeeIds: [e5.id], reason: REASON }), 201)
  supplementary = await calculate(supplementary, desk)
  const amounts = row => ['netPay', 'otherDeductions', 'otherAdditions', 'loanInstallments'].map(field => money(row[field]))
  assert.deepEqual(amounts(itemOf(supplementary, e5)), amounts(item))
  await approveAndPay(supplementary, 'TRX-C8-TYPED-AUG-SUP')
  const afterSupplementary = await financialState([e5.id])
  assert.deepEqual(afterSupplementary.loans.map(row => row.status), ['SETTLED', 'SETTLED'])
  assert.deepEqual(await loanEvents(supplementary.id), [[approvedLoan.id, 'APPROVED'], [disbursedLoan.id, 'DISBURSED']])
  assert.deepEqual(afterSupplementary.obligations.filter(row => row.payrollReversalOfObligationId !== null).map(row => [row.status, row.appliedPayrollRunId, row.deductionRequestId, row.bonusRequestId]),
    [['APPLIED', supplementary.id, d1.id, null], ['APPLIED', supplementary.id, null, b1.id], ['APPLIED', supplementary.id, d2.id, null], ['APPLIED', supplementary.id, null, b2.id]])
  const [b1After, b2After, d1After, d2After] = [await detail('bonuses', b1.id), await detail('bonuses', b2.id), await detail('deductions', d1.id), await detail('deductions', d2.id)]
  assert.deepEqual([b2After.payout.state, b2After.payout.runId, b2After.paidAmount, b1After.reversedAmount, d1After.reversedAmount, d2After.collectedAmount],
    ['PAID', supplementary.id, '150.00', '50.00', '100.00', '200.00'])
  assert.equal(expectStatus(await request(desk, 'GET', `/payroll/runs/${august.id}/corrections`), 200).reconciliation.totals.settlementDifference, '0.00')
})
