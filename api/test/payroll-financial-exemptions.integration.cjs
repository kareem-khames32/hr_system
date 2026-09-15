// C3 / الخطوة 26: الإعفاء المالي (EX-01..08) من الأول للآخر على قاعدة SQL مؤقتة (hr_payroll_exemptions_test_<hex>):
// قبول الخطوة — «إعفاء موظف من خصم» يظهر في القسيمة بالمبلغ الأصلي والمبلغ بعد الإعفاء والسبب — ومعه: كل الخصومات مع بقاء النظامي،
// تأجيل القسط لا إسقاطه، إسقاط وتأجيل الخصم المصنف عند الصرف، الاحتواء، إعادة الحساب قبل الاعتماد، المسير المعتمد، نطاق مدير القسم
// وسقفه واعتماد الموارد البشرية، فصل المهام (النفس، المُنشئ، المانح)، الإلغاء وإعادة الإعفاء، حدود الموظف والتهدئة ونسبة المانح، إعادة الفتح، الإلغاء، والتقرير.
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
const database = `hr_payroll_exemptions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-exemptions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
let app, ds, master, base, created = false, sequence = 0
const org = {}, people = {}, users = {}, types = {}

const today = new Date()
const ym = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const period = ym(today)
const nextPeriod = ym(new Date(today.getFullYear(), today.getMonth() + 1, 1))
const day = n => `${period}-${String(n).padStart(2, '0')}`
const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
const REASON = 'عطل حافلة الشركة صباح اليوم بمحضر الموارد البشرية الرسمي'

function assertDisposable() {
  assert.match(database, /^hr_payroll_exemptions_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
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
async function employee(code, overrides = {}) {
  return repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: org.branch.id, departmentId: org.department.id, teamId: null,
    managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'transfer', currency: 'SAR', ...overrides })
}
// حضور محسوب ثابت لكل أيام الشهر (لا غياب مجسّد) مع أيام تأخير وغياب محددة
async function attendance(emp, { late = [], absent = [] } = {}) {
  const rows = []
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  for (let n = 1; n <= days; n++) {
    const date = day(n)
    if (absent.includes(date)) {
      rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: 'absent', checkIn: null, checkOut: null, shiftName: 'وردية اختبار الإعفاء', shiftStart: '08:00', shiftEnd: '16:00',
        scheduleSource: 'override', workMinutes: 0, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
      continue
    }
    const minutes = late.includes(date) ? 60 : 0
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: minutes ? 'late' : 'present', checkIn: minutes ? '09:00' : '08:00', checkOut: '16:00',
      shiftName: 'وردية اختبار الإعفاء', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: minutes, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
}
async function calc(emps, runPeriod = period) {
  return expectStatus(await request(users.hr, 'POST', '/payroll/runs/calculate-defined', { period: runPeriod, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
    name: `مسير اختبار الإعفاء ${++sequence}` }), 201)
}
const recalc = async run => expectStatus(await request(users.hr, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'إعادة حساب بعد قرارات الإعفاء المالي' }), 201)
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `item for ${emp.employeeCode}`); return row }
async function transition(run, action, body) {
  if (action === 'approve') {
    const report = expectStatus(await request(users.hr, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
    expectStatus(await request(users.hr, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  }
  const payload = action === 'pay' && body === undefined ? { channel: 'BANK_TRANSFER', reference: `EX-TEST-${run.id}` } : body
  return request(users.hr, 'POST', `/payroll/runs/${run.id}/${action}`, payload)
}
async function deduction(creator, approver, emp, type, amount) {
  const request1 = expectStatus(await request(creator, 'POST', '/deductions', { employeeId: emp.id, deductionTypeId: type.id, inputValue: amount, incidentDate,
    reason: 'مخالفة موثقة في تقرير الجودة الأسبوعي للقسم', targetPeriod: period, confirmNotDuplicate: true }), 201)
  const detail = expectStatus(await request(approver, 'GET', `/deductions/${request1.id}`), 200)
  const approved = expectStatus(await request(approver, 'POST', `/deductions/${request1.id}/approve`, { expectedRevision: detail.revision }), 201)
  assert.equal(approved.status, 'APPROVED', JSON.stringify(approved))
  const [obligation] = await repo('EmployeeObligation').findBy({ deductionRequestId: request1.id })
  assert.ok(obligation)
  return { request: request1, obligation }
}
const exemption = (run, emp, extra) => ({ runId: run.id, employeeId: emp.id, reason: REASON, ...extra })
async function grant(user, input, status = 201, code) {
  const preview = await request(user, 'POST', '/payroll/exemptions/preview', input)
  if (preview.status !== 200 && preview.status !== 201) return expectStatus(preview, status, code)
  return expectStatus(await request(user, 'POST', '/payroll/exemptions', { ...input, previewHash: preview.body.previewHash }), status, code)
}

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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'], ['payroll.policy.default_period_type', 'CALENDAR_MONTH'],
    ['payroll.policy.min_net_guarantee', 'null'], ['payroll.policy.net_floor_pct', 'null'], ['payroll.policy.max_deduction_pct_of_gross', 'null'],
    ['loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY'], ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['attendance.absence_penalty_days', '1'],
    // نسبة المانح تُختبر صراحةً في المجموعة الثانية؛ مسير بموظف واحد يجعل أي إعفاء 100% من خصوماته
    ['financial_exemptions.max_pct_per_grantor', '0']]) await setConfig(key, value)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  org.branch = await repo('Branch').save({ code: 'EX_A', name: 'فرع الإعفاءات' })
  org.department = await repo('Department').save({ branchId: org.branch.id, name: 'قسم التشغيل', code: 'EX_DA' })
  const user = (label, role, employeeId, permissions = []) => repo('User').save({ email: `${label}@exemptions.invalid`, displayName: label, passwordHash: 'test-only', role,
    branchId: org.branch.id, employeeId, permissions: JSON.stringify(permissions) })
  people.branchManager = await employee('EX_BM')
  people.dm = await employee('EX_DM', { managerEmployeeId: people.branchManager.id })
  people.manager = await employee('EX_MG', { managerEmployeeId: people.dm.id })
  people.e1 = await employee('EX_E1', { managerEmployeeId: people.manager.id })
  people.e2 = await employee('EX_E2', { managerEmployeeId: people.manager.id })
  people.e3 = await employee('EX_E3', { managerEmployeeId: people.manager.id })
  await repo('Department').update(org.department.id, { managerEmployeeId: people.dm.id })
  await repo('Branch').update(org.branch.id, { managerEmployeeId: people.branchManager.id })
  const payroll = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel']
  users.hr = await user('hr', 'hr_manager', null, [...payroll, 'deductions.view', 'deductions.approve', 'deductions.manage',
    'financial_exemption.view', 'financial_exemption.grant', 'financial_exemption.approve', 'financial_exemption.override_limits'])
  users.hr2 = await user('hr2', 'hr_manager', null, ['payroll.view', 'deductions.view', 'deductions.approve', 'financial_exemption.view', 'financial_exemption.grant',
    'financial_exemption.approve', 'financial_exemption.override_limits'])
  users.dm = await user('department-manager', 'employee', people.dm.id)
  users.manager = await user('direct-manager', 'employee', people.manager.id)
  users.e1 = await user('employee-e1', 'employee', people.e1.id)
  users.e2 = await user('employee-e2', 'employee', people.e2.id)
  types.quality = expectStatus(await request(users.hr, 'POST', '/deductions/types', { code: 'EX_QUALITY', nameAr: 'خصم جودة', category: 'PERFORMANCE', calcMethod: 'FIXED_AMOUNT',
    creatorScopes: ['DIRECT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: null, isExemptable: true }), 201)
  types.statutory = expectStatus(await request(users.hr, 'POST', '/deductions/types', { code: 'EX_STATUTORY', nameAr: 'استقطاع نظامي', category: 'STATUTORY', calcMethod: 'FIXED_AMOUNT',
    creatorScopes: ['HR'], approvalSteps: ['HR'], escalationDays: null, maxPctOfGross: null }), 201)
  assert.equal(types.statutory.isExemptable, false)
}, { timeout: 180000 })

after(async () => {
  try { if (app) await app.close() } finally {
    try {
      if (master && created) {
        await master.request().query(`IF DB_ID(N'${database}') IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`)
        const left = await master.request().query(`SELECT name FROM sys.databases WHERE name = N'${database}'`)
        assert.equal(left.recordset.length, 0)
      }
    } finally { if (master) await master.close(); fs.rmSync(uploads, { recursive: true, force: true }) }
  }
})

test('قبول الخطوة 26: كل الخصومات القابلة لموظف تظهر في القسيمة بالأصل وبعد الإعفاء والسبب؛ النظامي يبقى، والقسط يُؤجل، والجودة تُسقط عند الصرف', { timeout: 420000 }, async () => {
  await attendance(people.e1, { late: [day(3)], absent: [day(8), day(9)] })
  const quality = await deduction(users.manager, users.hr2, people.e1, types.quality, '562.50')
  const statutory = await deduction(users.hr, users.hr2, people.e1, types.statutory, '1057.50')
  const loan = await repo('Loan').save({ employeeId: people.e1.id, amount: 2000, status: 'DISBURSED', disbursedAt: new Date(`${period}-01T08:00:00Z`) })
  const [installment] = await repo('LoanInstallment').save([{ loanId: loan.id, dueDate: day(10), amount: 1000, paid: false }, { loanId: loan.id, dueDate: `${nextPeriod}-10`, amount: 1000, paid: false }])
  const run = await calc([people.e1])
  const before = itemOf(run, people.e1)
  const lateness = Number(before.latenessDeduction), absence = Number(before.absenceDeduction)
  assert.ok(lateness > 0 && absence === 600, JSON.stringify(before))
  assert.equal(Number(before.otherDeductions), 1620)
  assert.equal(Number(before.loanInstallments), 1000)

  // الموارد البشرية ترى الموظف وخصوماته القابلة والمحمية
  const candidates = expectStatus(await request(users.hr, 'GET', `/payroll/exemptions/runs/${run.id}/candidates`), 200)
  assert.deepEqual(candidates.employees.map(row => [row.employeeId, row.bases]), [[people.e1.id, ['HR']]])
  const entries = expectStatus(await request(users.hr, 'GET', `/payroll/exemptions/runs/${run.id}/candidates?employeeId=${people.e1.id}`), 200)
  assert.deepEqual(entries.typedObligations.map(row => [row.obligationId, row.exemptable]).sort((a, b) => a[0] - b[0]), [[quality.obligation.id, true], [statutory.obligation.id, false]])
  assert.deepEqual(entries.installments.map(row => row.installmentId), [installment.id])

  // حد المرفق (يوم راتب = 300) ثم السبب المكرر، ثم فترة التهدئة (الجودة اعتُمدت للتو)، ثم المعاينة والحفظ
  const all = exemption(run, people.e1, { scopeKind: 'ALL_DEDUCTIONS' })
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', all), 400, 'EXEMPTION_ATTACHMENT_REQUIRED')
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', { ...all, attachmentRef: 'HR-2026-77', reason: 'موافقة موافقة موافقة موافقة موافقة' }), 400, 'EXEMPTION_REASON_REPETITIVE')
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', { ...all, attachmentRef: 'HR-2026-77' }), 400, 'EXEMPTION_OVERRIDE_REASON_REQUIRED')
  Object.assign(all, { attachmentRef: 'HR-2026-77', overrideReason: 'الخصم اعتُمد اليوم والمحضر الرسمي يثبت عطل الحافلة في يوم الواقعة' })
  const preview = expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', all), 201)
  assert.deepEqual(preview.overrides.map(row => row.limit), ['cooldown_hours'])
  const expected = (Math.round((lateness + absence + 562.5 + 1000) * 100) / 100).toFixed(2)
  assert.equal(preview.estimatedAmount, expected)
  assert.equal(preview.status, 'ACTIVE')
  assert.ok(preview.warnings.some(row => row.code === 'EXEMPTION_LOAN_DEFERRED'))
  assert.ok(preview.protectedItems.some(row => row.ref === String(statutory.obligation.id)))
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions', { ...all, previewHash: 'a'.repeat(64) }), 409, 'EXEMPTION_PREVIEW_STALE')
  const granted = expectStatus(await request(users.hr, 'POST', '/payroll/exemptions', { ...all, previewHash: preview.previewHash }), 201)
  assert.equal(granted.status, 'ACTIVE')
  // الأضيق محتوى، والمصدر لم يتغير، والاعتماد قبل إعادة الحساب مرفوض
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', exemption(run, people.e1, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' })), 409, 'EXEMPTION_CONTAINED')
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: quality.obligation.id })).status, 'PENDING')
  assert.equal((await repo('AttendanceDay').findOneByOrFail({ employeeId: people.e1.id, date: day(8) })).status, 'absent')
  assert.equal(expectStatus(await request(users.hr, 'GET', `/payroll/exemptions/runs/${run.id}`), 200).recalcRequired, true)
  expectStatus(await transition(run, 'approve'), 409, 'PAYRUN-EXEMPTION-RECALC-REQUIRED')

  const after1 = itemOf(await recalc(run), people.e1)
  assert.equal(Number(after1.latenessDeduction), 0)
  assert.equal(Number(after1.absenceDeduction), 0)
  assert.equal(Number(after1.loanInstallments), 0)
  assert.equal(Number(after1.otherDeductions), 1057.5)
  assert.equal(Math.round(Number(after1.netPay) * 100), Math.round((Number(before.netPay) + Number(expected)) * 100))

  // القسيمة: الأصل والمُعفى وبعد الإعفاء لكل بند، والسبب، والمانح بالدور، والنظامي باقٍ
  const payslip = expectStatus(await request(users.hr, 'GET', `/payroll/items/${after1.id}`), 200)
  const saved = JSON.parse(payslip.item.breakdown).financialExemptions
  assert.deepEqual(saved.lines.map(line => [line.component, line.originalAmount, line.afterAmount]), [
    ['LATENESS', lateness.toFixed(2), '0.00'], ['ABSENCE', '600.00', '0.00'], ['TYPED', '562.50', '0.00'], ['LOAN', '1000.00', '0.00']])
  assert.equal(saved.totals.exempted, expected)
  assert.ok(saved.protectedItems.some(row => row.ref === String(statutory.obligation.id) && /نظامي/.test(row.reason)))
  assert.deepEqual(payslip.financialExemptions.map(row => [row.id, row.reason, row.grantorBasisLabel, row.amount]), [[granted.id, REASON, 'الموارد البشرية', expected]])

  // الاعتماد يثبت المبلغ المُسقط؛ الإعفاء على مسير معتمد مرفوض، والمطبق لا يُلغى، والموظف يرى قسيمته بسبب الإعفاء
  expectStatus(await transition(run, 'approve'), 201)
  const applied = await repo('PayrollFinancialExemption').findOneByOrFail({ id: granted.id })
  assert.equal(applied.status, 'APPLIED')
  assert.equal(Number(applied.exemptedAmountSnapshot).toFixed(2), expected)
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', exemption(run, people.e1, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' })), 409, 'EXEMPTION_RUN_LOCKED')
  expectStatus(await request(users.hr, 'POST', `/payroll/exemptions/${granted.id}/revoke`, { reason: 'تصحيح قرار سابق بعد مراجعة المحضر الأصلي' }), 409, 'EXEMPTION_APPLIED')
  const own = expectStatus(await request(users.e1, 'GET', `/payroll/items/${after1.id}`), 200)
  assert.equal(own.financialExemptions[0].reason, REASON)
  assert.equal(expectStatus(await request(users.e1, 'GET', '/payroll/exemptions/mine'), 200)[0].amount, expected)

  // الصرف: الجودة EXEMPTED بمرجع الإعفاء، النظامي مستهلك، والقسط مؤجل بقسط جديد أول الشهر التالي
  expectStatus(await transition(run, 'pay'), 201)
  const exempted = await repo('EmployeeObligation').findOneByOrFail({ id: quality.obligation.id })
  assert.equal(exempted.status, 'EXEMPTED'); assert.equal(exempted.financialExemptionId, granted.id); assert.equal(Number(exempted.appliedAmount), 0)
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: statutory.obligation.id })).status, 'APPLIED')
  const deferred = await repo('LoanInstallment').findOneByOrFail({ id: installment.id })
  assert.equal(deferred.financialStatus, 'DEFERRED'); assert.equal(deferred.paid, false)
  const child = await repo('LoanInstallment').findOneByOrFail({ parentInstallmentId: installment.id })
  assert.equal(child.dueDate, `${nextPeriod}-01`); assert.equal(Number(child.amount), 1000)
  assert.ok(await repo('LoanInstallmentEvent').findOneBy({ installmentId: installment.id, action: 'DEFERRED_BY_EXEMPTION' }))
  assert.ok(await repo('DeductionRequestEvent').findOneBy({ requestId: quality.request.id, eventType: 'EXEMPTED' }))

  // الشهر التالي: القسط المؤجل يعود مستحقًا، والجودة المُسقطة لا تعود
  const next = itemOf(await calc([people.e1], nextPeriod), people.e1)
  const nextBreakdown = JSON.parse(next.breakdown)
  assert.ok(nextBreakdown.installmentIds.includes(child.id), JSON.stringify(nextBreakdown.installmentIds))
  assert.ok(!(nextBreakdown.obligationIds ?? []).includes(quality.obligation.id))

  // تقرير الحوكمة: مجموع اللقطات = تفصيل بنود المسيرات المعتمدة (فرق صفر)
  const report = expectStatus(await request(users.hr, 'GET', `/payroll/exemptions/report?fromPeriod=${period}&toPeriod=${period}`), 200)
  assert.equal(report.totals.exemptedAmount, expected)
  assert.equal(report.reconciliation.difference, '0.00')
  assert.equal(report.byGrantor[0].applied, 1)
})

test('EX-03/07/08: مدير القسم للحضور بسقف واعتماد، فصل المهام، الإلغاء وإعادة الإعفاء، التهدئة وحد الموظف ونسبة المانح، التأجيل وإعادة الفتح والإلغاء', { timeout: 420000 }, async () => {
  await attendance(people.e2, { late: [day(4)], absent: [day(10)] })
  await attendance(people.dm, { late: [day(4)] })
  const quality = await deduction(users.hr, users.hr2, people.e2, types.quality, '200')
  const run = await calc([people.e2, people.dm])
  assert.equal(Number(itemOf(run, people.e2).otherDeductions), 200)
  const late = exemption(run, people.e2, { scopeKind: 'SINGLE_ENTRY', targetKind: 'LATENESS_DAY', targetRef: day(4) })

  // مدير القسم: موظف قسمه فقط، خصومات الحضور فقط، لا «كل الخصومات»، لا لنفسه؛ منحه ينتظر اعتماد الموارد البشرية
  const dmCandidates = expectStatus(await request(users.dm, 'GET', `/payroll/exemptions/runs/${run.id}/candidates`), 200)
  assert.deepEqual(dmCandidates.employees.map(row => [row.employeeId, row.bases]), [[people.e2.id, ['DEPARTMENT_MANAGER']]])
  // مساحة «إعفاءاتي» لمدير القسم: المسير المحسوب بعدد موظفي نطاقه (بلا نفسه)
  const grantable = expectStatus(await request(users.dm, 'GET', '/payroll/exemptions/grantable-runs'), 200)
  assert.deepEqual(grantable.filter(row => row.id === run.id).map(row => row.candidates), [1])
  expectStatus(await request(users.dm, 'POST', '/payroll/exemptions/preview', exemption(run, people.e2, { scopeKind: 'SINGLE_ENTRY', targetKind: 'OBLIGATION', targetRef: String(quality.obligation.id) })), 403, 'EXEMPTION_BASIS_TARGET')
  expectStatus(await request(users.dm, 'POST', '/payroll/exemptions/preview', exemption(run, people.e2, { scopeKind: 'ALL_DEDUCTIONS' })), 403, 'EXEMPTION_ALL_REQUIRES_HR')
  expectStatus(await request(users.dm, 'POST', '/payroll/exemptions/preview', exemption(run, people.dm, { scopeKind: 'SINGLE_ENTRY', targetKind: 'LATENESS_DAY', targetRef: day(4) })), 403, 'EXEMPTION_SELF')
  expectStatus(await request(users.manager, 'POST', '/payroll/exemptions/preview', late), 403, 'EXEMPTION_OUT_OF_SCOPE')
  const dmGrant = await grant(users.dm, late)
  assert.equal(dmGrant.status, 'PENDING_APPROVAL')
  assert.equal(dmGrant.grantorBasis, 'DEPARTMENT_MANAGER')
  expectStatus(await request(users.dm, 'POST', `/payroll/exemptions/${dmGrant.id}/approve`, {}), 403)
  assert.equal(expectStatus(await request(users.hr, 'POST', `/payroll/exemptions/${dmGrant.id}/approve`, { expectedRevision: 1 }), 201).status, 'ACTIVE')

  // فصل المهام: من أنزل الخصم لا يعفيه؛ غيره يعفيه بتأجيل، والتهدئة 24 ساعة تتطلب تبريرًا لحامل التجاوز
  const typed = exemption(run, people.e2, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'TYPED', deductionTypeId: types.quality.id, disposition: 'DEFER_ONE_PERIOD' })
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', typed), 403, 'EXEMPTION_SOD_CREATOR')
  expectStatus(await request(users.hr2, 'POST', '/payroll/exemptions/preview', typed), 400, 'EXEMPTION_OVERRIDE_REASON_REQUIRED')
  const deferGrant = await grant(users.hr2, { ...typed, overrideReason: 'الخصم اعتُمد اليوم بخطأ مطبعي في التاريخ وتم التحقق منه' })
  assert.equal(deferGrant.status, 'ACTIVE')
  assert.deepEqual(deferGrant.overrides.map(row => row.limit), ['cooldown_hours'])
  // عمر الاعتماد يُقاس بالتوقيت نفسه الذي كُتب به (لا إزاحة ثلاث ساعات بين المحلي وUTC)
  assert.ok(deferGrant.overrides[0].ageMinutes >= 0 && deferGrant.overrides[0].ageMinutes < 60, JSON.stringify(deferGrant.overrides))

  // الإلغاء بسبب ثم إعادة الإعفاء نفسه تتطلب صلاحية التجاوز
  expectStatus(await request(users.hr, 'POST', `/payroll/exemptions/${dmGrant.id}/revoke`, { reason: 'قصير' }), 400, 'EXEMPTION_REASON_TOO_SHORT')
  assert.equal(expectStatus(await request(users.hr, 'POST', `/payroll/exemptions/${dmGrant.id}/revoke`, { reason: 'تبين من سجل البوابة أن التأخير غير مرتبط بالحافلة' }), 201).status, 'REVOKED')
  expectStatus(await request(users.dm, 'POST', '/payroll/exemptions/preview', late), 403, 'EXEMPTION_REEXEMPT_REQUIRES_OVERRIDE')

  // حد إعفاءات الموظف في 12 شهرًا ونسبة المانح: التجاوز موثق والإعفاء يُحوّل للاعتماد، والمانح لا يرفضه
  await setConfig('financial_exemptions.max_per_employee_year', '1')
  await setConfig('financial_exemptions.max_pct_per_grantor', '1')
  const absence = exemption(run, people.e2, { scopeKind: 'SINGLE_ENTRY', targetKind: 'ABSENCE_DAY', targetRef: day(10) })
  expectStatus(await request(users.hr, 'POST', '/payroll/exemptions/preview', absence), 400, 'EXEMPTION_OVERRIDE_REASON_REQUIRED')
  const routed = await grant(users.hr, { ...absence, overrideReason: 'غياب بإذن شفهي من مدير الفرع ثبت لاحقًا بمحضر مكتوب' })
  assert.equal(routed.status, 'PENDING_APPROVAL')
  assert.ok(routed.warnings.some(row => row.code === 'EXEMPTION_GRANTOR_PCT_APPROVAL'))
  assert.deepEqual(routed.overrides.map(row => row.limit), ['max_per_employee_year'])
  await setConfig('financial_exemptions.max_per_employee_year', '4')
  await setConfig('financial_exemptions.max_pct_per_grantor', '0')

  const recalculated = await recalc(run)
  const e2 = itemOf(recalculated, people.e2)
  assert.ok(Number(e2.latenessDeduction) > 0, 'الإلغاء يعيد خصم التأخير بعد إعادة الحساب')
  assert.equal(Number(e2.otherDeductions), 0)
  assert.deepEqual(JSON.parse(e2.breakdown).financialExemptions.lines.map(line => [line.component, line.originalAmount, line.disposition]), [['TYPED', '200.00', 'DEFER_ONE_PERIOD']])
  expectStatus(await transition(recalculated, 'approve'), 409, 'PAYRUN-EXEMPTION-PENDING')
  expectStatus(await request(users.hr, 'POST', `/payroll/exemptions/${routed.id}/reject`, { reason: 'المحضر المكتوب لا يغطي يوم الغياب المحدد' }), 403, 'EXEMPTION_SOD_GRANTOR')
  assert.equal(expectStatus(await request(users.hr2, 'POST', `/payroll/exemptions/${routed.id}/reject`, { reason: 'المحضر المكتوب لا يغطي يوم الغياب المحدد' }), 201).status, 'REJECTED')

  // الاعتماد ← APPLIED، إعادة الفتح ← ACTIVE، الاعتماد مجددًا بلا إعادة حساب، ثم الصرف يؤجل القسط المصنف بقسط للشهر التالي
  expectStatus(await transition(recalculated, 'approve'), 201)
  assert.equal((await repo('PayrollFinancialExemption').findOneByOrFail({ id: deferGrant.id })).status, 'APPLIED')
  expectStatus(await transition(recalculated, 'reopen', { reason: 'مراجعة قسيمة الموظف قبل الصرف' }), 201)
  assert.equal((await repo('PayrollFinancialExemption').findOneByOrFail({ id: deferGrant.id })).status, 'ACTIVE')
  expectStatus(await transition(recalculated, 'approve'), 201)
  expectStatus(await transition(recalculated, 'pay'), 201)
  const original = await repo('EmployeeObligation').findOneByOrFail({ id: quality.obligation.id })
  assert.equal(original.status, 'DEFERRED')
  const carried = await repo('EmployeeObligation').findOneByOrFail({ carriedFromObligationId: quality.obligation.id })
  assert.deepEqual([carried.status, Number(carried.amount), carried.targetPeriod, carried.financialExemptionId], ['PENDING', 200, nextPeriod, deferGrant.id])
  assert.ok(await repo('DeductionRequestEvent').findOneBy({ requestId: quality.request.id, eventType: 'DEFERRED_BY_EXEMPTION' }))
  assert.ok(await repo('DeductionRequestEvent').findOneBy({ requestId: quality.request.id, eventType: 'EXEMPTION_GRANTED' }))
  const events = await repo('PayrollFinancialExemptionEvent').find({ where: { exemptionId: deferGrant.id }, order: { id: 'ASC' } })
  assert.deepEqual(events.map(row => row.eventType), ['GRANTED', 'APPLIED', 'RUN_REOPENED', 'APPLIED'])

  // إلغاء المسير ينهي الإعفاء الحي (EXPIRED)
  await attendance(people.e3, { late: [day(5)] })
  const cancelled = await calc([people.e3])
  const expiring = await grant(users.hr, exemption(cancelled, people.e3, { scopeKind: 'DEDUCTION_TYPE', targetKind: 'LATENESS' }))
  expectStatus(await request(users.hr, 'POST', `/payroll/runs/${cancelled.id}/cancel`, { reason: 'مسير اختبار أُلغي بعد الإعفاء' }), 201)
  assert.equal((await repo('PayrollFinancialExemption').findOneByOrFail({ id: expiring.id })).status, 'EXPIRED')
})
