// الخطوة 13 (راتب شهر المسير من السجل الشهري) + الخطوة 14 (تجاور الفترات) + قاعدة المالك للموظف الجديد،
// على SQL وHTTP حقيقيين داخل قاعدة مؤقتة عشوائية؛ لا اتصال بقاعدة الشركة أو المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_run_salary_period_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-run-salary-period-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, admin, approver, branch, created = false, employeeNumber = 0, runNumber = 0, otNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const amount = value => Number(value)

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
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function employee(overrides = {}) {
  // راتب الملف مختلف عمدًا عن السجل؛ أي استخدام له بدل السجل يظهر في الأرقام.
  return repo('Employee').save({ employeeCode: `RSP${String(++employeeNumber).padStart(3, '0')}`, fullName: 'موظف اختبار راتب الشهر',
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 12345, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
const month = (basicSalary, effectivePayrollPeriod, effectiveToPayrollPeriod = null) => ({ basicSalary, housingAllowance: '0.00', transportAllowance: '0.00',
  phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', currency: 'SAR', effectivePayrollPeriod, effectiveToPayrollPeriod })
async function documentMonthly(emp, periods) {
  const history = expectStatus(await request(admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  return expectStatus(await request(admin, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: history.revision,
    expectedCurrentSourceHash: history.currentSourceHash, reason: 'قرار راتب شهري موثق للاختبار', evidenceReference: `fixture:${emp.id}:${history.revision + 1}`, periods }), 201)
}
function dates(from, to) {
  const result = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) result.push(new Date(time).toISOString().slice(0, 10))
  return result
}
async function attendance(emp, from, to, absentDates = []) {
  const rows = dates(from, to).filter(date => !absentDates.includes(date)).map(date => ({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
    checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
    lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 480 }))
  if (rows.length) await repo('AttendanceDay').save(rows)
  for (const date of absentDates) await repo('ScheduleDayOverride').save({ employeeId: emp.id, date, shiftName: 'وردية اختبار', startTime: '08:00', endTime: '16:00' })
}
async function calculate(employees, period, extra = {}) {
  return request(admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
    name: `اختبار راتب الشهر ${period} #${++runNumber}`, ...extra })
}
const recalculate = (run, employees, reason = 'إعادة حساب بعد تغيير سجل الأجر') =>
  request(admin, 'POST', '/payroll/runs/calculate-defined', { period: run.period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id), runId: run.id, reason })
const itemFor = (run, emp) => { const item = run.items.find(row => row.employeeId === emp.id); assert.ok(item, `بند الموظف ${emp.employeeCode}`); return item }
const memberFor = (run, emp) => { const member = run.members.find(row => row.employeeId === emp.id); assert.ok(member, `عضوية الموظف ${emp.employeeCode}`); return member }
async function setConfig(key, value) { await repo('RequestsConfig').save({ key, value }) }

// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية بنطاق المعتمد.
async function acknowledgeUnassigned(user, runId) {
  const report = await request(user, 'GET', `/payroll/runs/${runId}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(user, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_run_salary_period_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'Run salary period fixture', code: 'RSPERIOD' })
  admin = await repo('User').save({ email: 'admin@run-salary-period.invalid', displayName: 'Payroll calculator', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@run-salary-period.invalid', displayName: 'Payroll approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'attendance.absence_penalty_days', value: '1' },
    { key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY' },
  ])
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_run_salary_period_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Run salary/period fixture cleanup failed')
})

test('الخطوة 13: 9,000 ثم 10,000 من سبتمبر — أغسطس بعد الزيادة 9,000، وسبتمبر 10,000 ويبقى 10,000 بعد زيادة أكتوبر ثم يُعتمد', async t => {
  const emp = await employee()
  await attendance(emp, '2026-07-23', '2026-09-22')
  await documentMonthly(emp, [month('9000.00', '2026-01')])
  const august = expectStatus(await calculate([emp], '2026-08'), 201)
  assert.equal(amount(itemFor(august, emp).basicSalary), 9000)

  // زيادة من راتب سبتمبر: تُسجل بعد حساب مسودة أغسطس.
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-08'), month('10000.00', '2026-09')])
  const augustAfterRaise = expectStatus(await recalculate(august, [emp]), 201)
  assert.equal(amount(itemFor(augustAfterRaise, emp).basicSalary), 9000, 'أغسطس بعد زيادة سبتمبر يبقى 9,000')
  assert.equal(amount(itemFor(augustAfterRaise, emp).netPay), 9000)
  const augustSource = memberFor(augustAfterRaise, emp).snapshot.salarySource
  assert.equal(augustSource.kind, 'MONTHLY_HISTORY'); assert.equal(augustSource.referencePeriod, '2026-08')
  assert.equal(augustSource.effectivePayrollPeriod, '2026-01'); assert.equal(augustSource.amounts.basicSalary, '9000.00')
  assert.equal(augustSource.historyRevision, 2); assert.match(augustSource.sourceRef, /^salary-history:\d+:revision:2:[a-f0-9]{64}:period:1$/)
  assert.deepEqual(JSON.parse(itemFor(augustAfterRaise, emp).breakdown).salarySource, augustSource)

  const september = expectStatus(await calculate([emp], '2026-09'), 201)
  assert.equal(september.startDate, '2026-08-23'); assert.equal(september.endDate, '2026-09-22')
  assert.equal(amount(itemFor(september, emp).basicSalary), 10000, 'سبتمبر كامل بالراتب الجديد بما فيه أيام أغسطس داخله')
  assert.equal(JSON.parse(itemFor(september, emp).breakdown).dayRate, round(10000 / 30))

  // زيادة أكتوبر بعد حساب سبتمبر: إعادة حساب سبتمبر تبقيه 10,000 من المراجعة الجديدة، ثم يُعتمد.
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-08'), month('10000.00', '2026-09', '2026-09'), month('11000.00', '2026-10')])
  const septemberAfterOctober = expectStatus(await recalculate(september, [emp]), 201)
  assert.equal(amount(itemFor(septemberAfterOctober, emp).basicSalary), 10000, 'سبتمبر بعد زيادة أكتوبر يبقى 10,000')
  assert.equal(memberFor(septemberAfterOctober, emp).snapshot.salarySource.historyRevision, 3)
  await acknowledgeUnassigned(approver, september.id)
  const approved = expectStatus(await request(approver, 'POST', `/payroll/runs/${september.id}/approve`), 201)
  assert.equal(approved.status, 'APPROVED')
  t.diagnostic('أغسطس 9,000 قبل وبعد الزيادة؛ سبتمبر 10,000 قبل وبعد زيادة أكتوبر ثم اعتُمد')
})

test('الخطوة 13: الاعتماد يقارن راتب شهر المسير نفسه — زيادة شهر لاحق أو تصحيح شهر آخر لا يوقفه، وتغيير عملة أو مبلغ الشهر نفسه يوقفه', async t => {
  // دورة 23: «راتب مارس» = 23 فبراير → 22 مارس.
  const emp = await employee()
  await attendance(emp, '2026-02-23', '2026-03-22')
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-02'), month('10000.00', '2026-03')])
  const march = expectStatus(await calculate([emp], '2026-03'), 201)
  assert.equal(amount(itemFor(march, emp).basicSalary), 10000)
  const saved = memberFor(march, emp).snapshot.salarySource
  assert.equal(saved.historyRevision, 1)
  await acknowledgeUnassigned(approver, march.id)
  // مراجعة 2: عملة مارس وحدها تتغير → يوقف.
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-02'), { ...month('10000.00', '2026-03'), currency: 'EGP' }])
  const currencyChanged = await request(approver, 'POST', `/payroll/runs/${march.id}/approve`)
  assert.equal(currencyChanged.status, 409, JSON.stringify(currencyChanged.body)); assert.equal(currencyChanged.body.code, 'PAYRUN-SALARY-CHANGED')
  // مراجعة 3: تصحيح مبلغ مارس نفسه → يوقف.
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-02'), month('10500.00', '2026-03')])
  const amountChanged = await request(approver, 'POST', `/payroll/runs/${march.id}/approve`)
  assert.equal(amountChanged.status, 409, JSON.stringify(amountChanged.body)); assert.equal(amountChanged.body.code, 'PAYRUN-SALARY-CHANGED')
  // مراجعة 4: مارس كما حُسب (10,000 SAR)، مع زيادة أبريل وتصحيح بداية شهر سابق → لا يوقف رغم اختلاف المراجعة والبصمة.
  const unrelated = await documentMonthly(emp, [month('9000.00', '2026-02', '2026-02'), month('10000.00', '2026-03', '2026-03'), month('11000.00', '2026-04')])
  assert.equal(unrelated.revision, 4); assert.notEqual(unrelated.version.contentHash, saved.historyContentHash)
  assert.equal(expectStatus(await request(approver, 'POST', `/payroll/runs/${march.id}/approve`), 201).status, 'APPROVED')
  const approved = expectStatus(await request(admin, 'GET', `/payroll/runs/${march.id}`), 200)
  assert.equal(approved.status, 'APPROVED'); assert.equal(amount(itemFor(approved, emp).basicSalary), 10000)
  assert.equal(memberFor(approved, emp).snapshot.salarySource.historyRevision, 1, 'اللقطة المعتمدة تبقى على المراجعة التي حُسب منها المسير (مراجعات السجل تُلحق ولا تُعدّل)')
  t.diagnostic('EGP لمارس → 409؛ 10,500 لمارس → 409؛ مراجعة 4 (زيادة أبريل + تصحيح فبراير) ومارس 10,000 → 201 بلا إعادة حساب')
})

test('الخطوة 13: إنشاء الموظف يوثّق أجر التعيين «يسري من راتب شهر» فيدخل أول مسير بلا توثيق منفصل؛ الحدود والعملة تُفحص قبل الحفظ', async t => {
  const { payrollPeriodOfDate, payrollPeriodBounds, shiftPayrollPeriod } = require('../src/payroll/payroll-period')
  const local = new Date(), today = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
  const current = payrollPeriodOfDate(today, 23), currentBounds = payrollPeriodBounds(current, 23)
  const codeOf = n => `RSPNEW${String(n).padStart(2, '0')}`
  const create = async (n, extra = {}) => request(admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), employeeCode: codeOf(n), fullName: `موظف جديد ${n}`, branchId: branch.id,
    joinDate: currentBounds.startDate, basicSalary: 6000, housingAllowance: 1000, currency: 'SAR', status: 'active', payMethod: 'transfer', ...extra })
  const history = async emp => expectStatus(await request(admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)

  // سياق النموذج: الدورة والشهر الجاري وشهر التعيين والمدى، بصلاحية الإنشاء فقط.
  const context = expectStatus(await request(admin, 'GET', `/employees/salary-start-context?hireDate=${currentBounds.startDate}`), 200)
  assert.deepEqual(context, { cycleStartDay: 23, currentPayrollPeriod: current, hireDate: currentBounds.startDate, hirePayrollPeriod: current,
    minPayrollPeriod: current, maxPayrollPeriod: current, defaultPayrollPeriod: current, defaultPayrollPeriodBounds: currentBounds })
  const legacyContext = expectStatus(await request(admin, 'GET', '/employees/salary-start-context?hireDate=2020-01-01'), 200)
  assert.deepEqual([legacyContext.minPayrollPeriod, legacyContext.defaultPayrollPeriod], ['2020-01', current])
  assert.equal(expectStatus(await request(admin, 'GET', '/employees/salary-start-context'), 200).minPayrollPeriod, null)
  assert.equal((await request(admin, 'GET', '/employees/salary-start-context?hireDate=2026-9-1')).status, 400)
  const viewer = await repo('User').save({ email: 'viewer@run-salary-period.invalid', displayName: 'بلا صلاحية إنشاء', passwordHash: 'test-only', role: 'employee', permissions: '["employees.view"]' })
  assert.equal((await request(viewer, 'GET', '/employees/salary-start-context')).status, 403)

  // ملتحق في الشهر الجاري: مراجعة شهرية أولى بمبالغ الملف الدقيقة من شهر التعيين، ويدخل المسير مشمولًا.
  const joiner = expectStatus(await create(1, { contractNumber: 'C-77' }), 201)
  const joinerHistory = await history(joiner)
  assert.equal(joinerHistory.revision, 1); assert.equal(joinerHistory.version.contractVersion, 'SALARY_PAYROLL_PERIOD_HISTORY_V2_20260914')
  assert.equal(joinerHistory.version.createdBy, admin.id); assert.equal(joinerHistory.version.evidenceReference, 'عقد C-77')
  assert.equal(joinerHistory.version.reason, 'أجر التعيين المثبت عند إنشاء ملف الموظف')
  assert.equal(joinerHistory.segments.length, 1)
  assert.deepEqual({ ...joinerHistory.segments[0] }, { basicSalary: '6000.00', housingAllowance: '1000.00', transportAllowance: '0.00', phoneAllowance: '0.00',
    workNatureAllowance: '0.00', otherAllowance: '0.00', currency: 'SAR', effectivePayrollPeriod: current, effectiveToPayrollPeriod: null,
    effectiveFrom: currentBounds.startDate, effectiveTo: null })
  const saved = await repo('Employee').findOneByOrFail({ id: joiner.id })
  await attendance(saved, currentBounds.startDate, currentBounds.endDate)
  const run = expectStatus(await calculate([saved], current), 201)
  const member = memberFor(run, saved)
  assert.equal(member.membershipStatus, 'INCLUDED', JSON.stringify(member))
  assert.equal(member.snapshot.salarySource.kind, 'MONTHLY_HISTORY'); assert.equal(member.snapshot.salarySource.effectivePayrollPeriod, current)
  assert.equal(amount(itemFor(run, saved).basicSalary), 6000); assert.equal(member.snapshot.salarySource.amounts.housingAllowance, '1000.00')
  expectStatus(await request(admin, 'POST', `/payroll/runs/${run.id}/cancel`, { reason: 'إلغاء مسير اختبار إنشاء الموظف' }), 201)

  // ملف منقول بتاريخ تعيين قديم: الافتراض الشهر الجاري، وشهر التعيين يُقبل صراحةً؛ والعملة الغائبة تأخذ افتراض الملف SAR.
  const legacy = expectStatus(await create(2, { joinDate: '2020-01-01', currency: undefined }), 201)
  assert.deepEqual([(await history(legacy)).segments[0].effectivePayrollPeriod, (await history(legacy)).segments[0].currency], [current, 'SAR'])
  assert.equal((await history(legacy)).version.evidenceReference, `إنشاء ملف الموظف #${legacy.id}`)
  const explicitLegacy = expectStatus(await create(3, { joinDate: '2020-01-01', salaryEffectivePayrollPeriod: '2020-01', salaryEvidenceReference: 'قرار نقل الملفات' }), 201)
  assert.equal((await history(explicitLegacy)).segments[0].effectivePayrollPeriod, '2020-01')
  assert.equal((await history(explicitLegacy)).version.evidenceReference, 'قرار نقل الملفات')
  // تعيين مستقبلي: الافتراض شهر التعيين. والبداية الفعلية اللاحقة لتاريخ الالتحاق هي تاريخ التعيين.
  const nextBounds = payrollPeriodBounds(shiftPayrollPeriod(current, 1), 23)
  const future = expectStatus(await create(4, { joinDate: nextBounds.startDate }), 201)
  assert.equal((await history(future)).segments[0].effectivePayrollPeriod, shiftPayrollPeriod(current, 1))
  const delayed = await request(admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branch.id)), employeeCode: codeOf(5), fullName: 'موظف ببداية فعلية لاحقة', branchId: branch.id,
    joinDate: payrollPeriodBounds(shiftPayrollPeriod(current, -2), 23).startDate, actualStartDate: currentBounds.startDate, basicSalary: 5000, currency: 'EGP',
    salaryEffectivePayrollPeriod: shiftPayrollPeriod(current, -1) })
  assert.equal(delayed.status, 400, JSON.stringify(delayed.body)); assert.equal(delayed.body.code, 'EMPLOYEE_SALARY_START_BEFORE_HIRE')

  // رفض قبل أي حفظ: الملف كله يرجع (لا موظف ولا سجل).
  for (const [n, extra, wanted] of [
    [6, { salaryEffectivePayrollPeriod: shiftPayrollPeriod(current, -1) }, 'EMPLOYEE_SALARY_START_BEFORE_HIRE'],
    [7, { salaryEffectivePayrollPeriod: shiftPayrollPeriod(current, 1) }, 'EMPLOYEE_SALARY_START_TOO_LATE'],
    [8, { currency: 'AED' }, 'EMPLOYEE_SALARY_CURRENCY_REQUIRED'],
  ]) {
    const rejected = await create(n, extra)
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.equal(rejected.body.code, wanted)
    assert.equal(await repo('Employee').countBy({ employeeCode: codeOf(n) }), 0, `${wanted} يرجّع إنشاء الملف كله`)
  }
  assert.equal(await repo('Employee').countBy({ employeeCode: codeOf(5) }), 0)
  assert.equal((await create(10, { salaryEffectivePayrollPeriod: '2026-9' })).status, 400)

  // بلا أجر: الراتب الأساسي بقى إجباريًا عند الإضافة (قرار المالك 16 سبتمبر) — بشهر سريان أو بدونه يُرفض ولا يُحفظ ملف.
  for (const [n, extra] of [[9, { basicSalary: undefined, housingAllowance: undefined, salaryEffectivePayrollPeriod: current }],
    [11, { basicSalary: undefined, housingAllowance: undefined }]]) {
    const unpaid = await create(n, extra)
    assert.equal(unpaid.status, 400, JSON.stringify(unpaid.body)); assert.ok(unpaid.body.message.includes('الراتب الأساسي مطلوب'), JSON.stringify(unpaid.body))
    assert.equal(await repo('Employee').countBy({ employeeCode: codeOf(n) }), 0)
  }
  t.diagnostic(`إنشاء بتعيين ${currentBounds.startDate}: مراجعة شهرية 1 من ${current} ومشمول في المسير بـ6,000+1,000؛ القديم افتراضيًا من ${current}؛ الرفض يرجّع الملف`)
})

function round(value) { return Math.round(value * 100) / 100 }

test('الخطوة 13 / LOT-15: يوم إضافي في أغسطس يُعتمد بعد زيادة سبتمبر يُسعّر على 9,000، ويوم 23 أغسطس يتبع راتب سبتمبر', async () => {
  const { buildOvertimeApprovalSnapshot } = require('../src/payroll/overtime-financial')
  const emp = await employee()
  await documentMonthly(emp, [month('9000.00', '2026-01', '2026-08'), month('10000.00', '2026-09')])
  const price = date => ds.transaction(em => buildOvertimeApprovalSnapshot(em,
    { id: 900000 + (++otNumber), employeeId: emp.id, date, status: 'SUBMITTED', calculationSnapshot: null, hoursRequested: null },
    { employeeId: emp.id, workDate: date, dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', fingerprint: 'a'.repeat(64), detectedMinutes: 120,
      blockers: [], overtimeEligible: true, policy: { multiplier: 1.5, maxDailyMinutes: 0, maxWeeklyMinutes: 0, maxMonthlyMinutes: 0 } },
    { approvedMinutes: 60, approverId: admin.id }))
  const august = (await price('2026-08-10')).calculationSnapshot.approval
  assert.equal(august.wagePayrollPeriod, '2026-08'); assert.equal(august.wageBase, 9000)
  assert.equal(august.hourlyRate, 9000 / 30 / 8); assert.equal(august.amount, 56.25)
  assert.equal(august.wageSource.kind, 'MONTHLY_HISTORY'); assert.equal(august.wageSource.effectivePayrollPeriod, '2026-01')
  const cycleBoundary = (await price('2026-08-23')).calculationSnapshot.approval
  assert.equal(cycleBoundary.wagePayrollPeriod, '2026-09'); assert.equal(cycleBoundary.wageBase, 10000); assert.equal(cycleBoundary.amount, 62.5)
  // بلا سجل شهري في الوضع الافتراضي: لا تسعير من راتب الملف.
  const undocumented = await employee()
  await assert.rejects(ds.transaction(em => buildOvertimeApprovalSnapshot(em,
    { id: 900000 + (++otNumber), employeeId: undocumented.id, date: '2026-08-10', status: 'SUBMITTED', calculationSnapshot: null, hoursRequested: null },
    { employeeId: undocumented.id, workDate: '2026-08-10', dayKind: 'WEEKDAY', evidenceMode: 'PUNCH', fingerprint: 'b'.repeat(64), detectedMinutes: 120,
      blockers: [], overtimeEligible: true, policy: { multiplier: 1.5, maxDailyMinutes: 0, maxWeeklyMinutes: 0, maxMonthlyMinutes: 0 } },
    { approvedMinutes: 60, approverId: admin.id })), error => error?.getResponse?.()?.code === 'OT_SALARY_MONTH_EVIDENCE_REQUIRED')
})

test('الخطوة 13: بلا دليل لشهر المسير يُستبعد الموظف بسبب ظاهر ولا يُوقف المسير؛ الوضع الانتقالي يوسم راتب الملف «غير موثق»', async () => {
  const documented = await employee(), none = await employee(), gap = await employee(), daily = await employee()
  for (const emp of [documented, none, gap, daily]) await attendance(emp, '2026-06-23', '2026-07-22')
  await documentMonthly(documented, [month('7000.00', '2026-01')])
  await documentMonthly(gap, [month('7000.00', '2026-08')])
  const dailyHistory = expectStatus(await request(admin, 'GET', `/payroll/employees/${daily.id}/salary-history`), 200)
  expectStatus(await request(admin, 'POST', `/payroll/employees/${daily.id}/salary-history`, { expectedRevision: dailyHistory.revision,
    expectedCurrentSourceHash: dailyHistory.currentSourceHash, reason: 'دليل يومي قديم', evidenceReference: 'fixture:daily',
    segments: [{ effectiveFrom: '2026-01-01', effectiveTo: null, currency: 'SAR', basicSalary: '7000.00', housingAllowance: '0.00', transportAllowance: '0.00',
      phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00' }] }), 201)
  const run = expectStatus(await calculate([documented, none, gap, daily], '2026-07'), 201)
  assert.deepEqual(run.items.map(item => item.employeeId), [documented.id])
  assert.equal(amount(itemFor(run, documented).basicSalary), 7000)
  for (const [emp, code] of [[none, 'NO_SALARY_DEFINED'], [gap, 'SALARY_PAYROLL_PERIOD_GAP'], [daily, 'SALARY_DAILY_HISTORY_ONLY']]) {
    const member = memberFor(run, emp)
    assert.equal(member.membershipStatus, 'EXCLUDED'); assert.equal(member.exclusionReason, code)
    assert.equal(member.snapshot.salaryIssue.code, code); assert.match(member.snapshot.salaryIssue.message, /2026-07|شهر/)
    assert.equal(member.snapshot.salarySource, null)
  }
  try {
    await setConfig('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
    const transitional = expectStatus(await recalculate(run, [documented, none, gap, daily], 'اختبار الوضع الانتقالي'), 201)
    assert.deepEqual(transitional.items.map(item => item.employeeId).sort((a, b) => a - b), [documented.id, none.id, daily.id].sort((a, b) => a - b))
    for (const emp of [none, daily]) {
      const source = memberFor(transitional, emp).snapshot.salarySource
      assert.equal(source.kind, 'CURRENT_FILE_UNVERIFIED'); assert.ok(source.warning)
      assert.equal(amount(itemFor(transitional, emp).basicSalary), 12345)
    }
    assert.equal(memberFor(transitional, documented).snapshot.salarySource.kind, 'MONTHLY_HISTORY')
    assert.equal(memberFor(transitional, gap).exclusionReason, 'SALARY_PAYROLL_PERIOD_GAP', 'من له سجل شهري لا يرجع لراتب الملف')
    // عودة الوضع الافتراضي بعد حساب انتقالي: الاعتماد يرفض راتبًا غير موثق.
    await setConfig('payroll.salary_evidence_mode', 'MONTHLY_HISTORY')
    await acknowledgeUnassigned(approver, run.id)
    const blocked = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body)); assert.equal(blocked.body.code, 'PAYRUN-SALARY-CHANGED')
  } finally {
    await setConfig('payroll.salary_evidence_mode', 'MONTHLY_HISTORY')
  }
  assert.equal((await request(admin, 'PATCH', '/settings/config', { key: 'payroll.salary_evidence_mode', value: 'CURRENT_FILE' })).status, 400)
})

test('الخطوة 14: دورة 31 — اعتماد فبراير لا يمنع مارس (لا PAYRUN-DUP-002)، وتغيير الدورة يُظهر الفجوة على المسير', async t => {
  const emp = await employee()
  await documentMonthly(emp, [month('6000.00', '2026-01')])
  await attendance(emp, '2026-01-31', '2026-04-30')
  try {
    await setConfig('payroll.cycle_start_day', '31')
    const february = expectStatus(await calculate([emp], '2026-02'), 201)
    assert.equal(february.startDate, '2026-01-31'); assert.equal(february.endDate, '2026-02-28')
    await acknowledgeUnassigned(approver, february.id)
    expectStatus(await request(approver, 'POST', `/payroll/runs/${february.id}/approve`), 201)
    const march = await calculate([emp], '2026-03')
    assert.equal(march.status, 201, `مارس بعد اعتماد فبراير: ${JSON.stringify(march.body)}`)
    assert.equal(march.body.startDate, '2026-03-01'); assert.equal(march.body.endDate, '2026-03-30')
    assert.deepEqual(march.body.conflicts, []); assert.deepEqual(march.body.periodContinuity, [])
    assert.equal(amount(itemFor(march.body, emp).basicSalary), 6000)
    await acknowledgeUnassigned(approver, march.body.id)
    expectStatus(await request(approver, 'POST', `/payroll/runs/${march.body.id}/approve`), 201)
    const claims = await repo('PayrollPeriodClaim').find({ where: { employeeId: emp.id }, order: { startDate: 'ASC' } })
    assert.deepEqual(claims.map(claim => [claim.startDate, claim.endDate]), [['2026-01-31', '2026-02-28'], ['2026-03-01', '2026-03-30']])

    // تغيير الدورة إلى 1 بعد مسير مارس: أبريل 1/4 → 30/4 يترك 31 مارس بلا مسير — يظهر كفجوة بتاريخها.
    await setConfig('payroll.cycle_start_day', '1')
    const april = expectStatus(await calculate([emp], '2026-04'), 201)
    assert.equal(april.startDate, '2026-04-01')
    assert.equal(april.periodContinuity.length, 1)
    assert.deepEqual({ ...april.periodContinuity[0] }, { kind: 'GAP', previousPeriod: '2026-03', nextPeriod: '2026-04', previousEndDate: '2026-03-30',
      nextStartDate: '2026-04-01', from: '2026-03-31', to: '2026-03-31', days: 1, otherRunId: march.body.id, otherRunName: march.body.name,
      otherStatus: 'APPROVED', employeeIds: [emp.id] })
    const events = expectStatus(await request(admin, 'GET', `/payroll/runs/${april.id}/events`), 200)
    assert.equal(events.at(-1).payload.periodContinuity[0].kind, 'GAP')
  } finally {
    await setConfig('payroll.cycle_start_day', '23')
  }
  t.diagnostic('فبراير 31/1→28/2 معتمد، مارس 1/3→30/3 محسوب ومعتمد بلا تعارض، وفجوة 31 مارس ظاهرة على مسير أبريل')
})

test('قاعدة المالك: ملتحق في اليوم العاشر من الدورة — التغطية من تاريخ التعيين، لا غياب ولا خصم قبله، والتناسب 22/30 (الشهر 30 يومًا)', async t => {
  // دورة 23: «راتب أغسطس» = 23 يوليو → 22 أغسطس؛ اليوم العاشر = 1 أغسطس.
  const joiner = await employee({ joinDate: '2026-08-01' })
  const delayed = await employee({ joinDate: '2026-07-25', actualStartDate: '2026-08-01' })
  for (const emp of [joiner, delayed]) {
    await documentMonthly(emp, [month('9000.00', '2026-08')])
    await attendance(emp, '2026-08-01', '2026-08-22', ['2026-08-11'])
    // وردية مجدولة قبل التعيين: لا تتحول غيابًا.
    await repo('ScheduleDayOverride').save({ employeeId: emp.id, date: '2026-07-28', shiftName: 'وردية اختبار', startTime: '08:00', endTime: '16:00' })
  }
  // إجازة بلا أجر تبدأ قبل التعيين: تُخصم أيامها داخل التغطية فقط.
  await repo('Leave').save({ employeeId: joiner.id, leaveTypeCode: 'unpaid', fromDate: '2026-07-28', toDate: '2026-08-03', days: 7, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
  const run = expectStatus(await calculate([joiner, delayed], '2026-08'), 201)
  assert.equal(run.startDate, '2026-07-23'); assert.equal(run.endDate, '2026-08-22')
  for (const emp of [joiner, delayed]) {
    const item = itemFor(run, emp), detail = JSON.parse(item.breakdown), member = memberFor(run, emp)
    assert.equal(detail.coverFrom, '2026-08-01'); assert.equal(detail.coverTo, '2026-08-22'); assert.equal(detail.coverDays, 22)
    // قرار المالك: الشهر 30 يومًا — التناسب 22/30 بنفس أساس سعر اليوم
    assert.equal(detail.prorataFactor, 0.733333); assert.equal(detail.gross, 9000); assert.equal(detail.grossEarned, 6600)
    assert.equal(detail.dayRate, 300, 'سعر اليوم من الأجر الشهري الكامل ÷ 30')
    assert.equal(amount(item.basicSalary), 6600)
    assert.deepEqual(detail.absentDates, ['2026-08-11'], 'الغياب داخل التغطية فقط')
    assert.equal(amount(item.absenceDays), 1); assert.equal(amount(item.absenceDeduction), 300)
    assert.ok(detail.attendanceRules.every(day => day.date >= '2026-08-01'))
    assert.equal(member.snapshot.hireDate, '2026-08-01'); assert.equal(member.snapshot.coverDays, 22)
    const preHire = await ds.query('SELECT COUNT(*) AS n FROM attendance_days WHERE employeeId=@0 AND date < @1', [emp.id, '2026-08-01'])
    assert.equal(Number(preHire[0].n), 0, `لا صفوف حضور/غياب قبل التعيين للموظف ${emp.employeeCode}`)
  }
  const joinerItem = itemFor(run, joiner)
  assert.equal(amount(joinerItem.unpaidLeaveDays), 3, 'أيام الإجازة بلا أجر قبل التعيين لا تُخصم (1–3 أغسطس فقط)')
  assert.equal(amount(joinerItem.unpaidLeaveDeduction), 900)
  // 6600 ناقص يوم غياب 300 وثلاثة أيام إجازة بلا أجر 900 (سعر اليوم = الأجر ÷ 30)
  assert.equal(amount(joinerItem.netPay), 5400)
  assert.equal(amount(itemFor(run, delayed).netPay), 6300)
  t.diagnostic('ملتحق 1 أغسطس (اليوم العاشر): 9000×22/30=6600 على أساس 30 يومًا، غياب 11 أغسطس فقط، لا صفوف قبل التعيين حتى مع بداية فعلية بعد تاريخ الالتحاق')
})

test('الخطوة 9 (مسار R2): راتب صفري — من السجل الشهري أو من الملف في الوضع الانتقالي — يُستبعد NO_SALARY_DEFINED ولا يدخل بصافي صفر', async t => {
  const documented = await employee(), zeroMonthly = await employee(), zeroFile = await employee({ basicSalary: null, housingAllowance: 0, otherAllowance: 0 })
  for (const emp of [documented, zeroMonthly, zeroFile]) await attendance(emp, '2026-04-23', '2026-05-22')
  await documentMonthly(documented, [month('7000.00', '2026-05')])
  await documentMonthly(zeroMonthly, [month('0.00', '2026-05')])
  const run = expectStatus(await calculate([documented, zeroMonthly, zeroFile], '2026-05'), 201)
  assert.deepEqual(run.items.map(item => item.employeeId), [documented.id])
  for (const emp of [zeroMonthly, zeroFile]) {
    const member = memberFor(run, emp)
    assert.equal(member.membershipStatus, 'EXCLUDED'); assert.equal(member.exclusionReason, 'NO_SALARY_DEFINED')
    assert.equal(member.snapshot.salarySource, null)
  }
  assert.match(memberFor(run, zeroMonthly).snapshot.salaryIssue.message, /صفر في سجل الأجر الشهري/)
  try {
    await setConfig('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
    const transitional = expectStatus(await recalculate(run, [documented, zeroMonthly, zeroFile], 'الوضع الانتقالي لا يُدخل راتبًا صفريًا'), 201)
    assert.deepEqual(transitional.items.map(item => item.employeeId), [documented.id], 'قبل R2 كان الملف الصفري يدخل بصافي صفر')
    const fileMember = memberFor(transitional, zeroFile)
    assert.equal(fileMember.exclusionReason, 'NO_SALARY_DEFINED'); assert.match(fileMember.snapshot.salaryIssue.message, /صفر في ملف الموظف/)
    assert.equal(memberFor(transitional, zeroMonthly).exclusionReason, 'NO_SALARY_DEFINED', 'من له سجل شهري صفري لا يرجع لراتب الملف')
  } finally {
    await setConfig('payroll.salary_evidence_mode', 'MONTHLY_HISTORY')
  }
  t.diagnostic('راتب شهري 0.00 وملف بمكونات صفرية/فارغة: مستبعدان NO_SALARY_DEFINED في الوضعين، والموثق وحده في البنود')
})
