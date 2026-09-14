// الخطوة 13 / LOT-15 على مسار اعتماد الطلب الحقيقي (POST /requests ثم /requests/:id/act): سعر ساعة الإضافي من راتب شهر
// المسير الذي يقع فيه يوم العمل في سجل الأجر الشهري، لا من راتب الملف ولا من زيادة الشهر التالي. وبلا دليل للشهر في الوضع
// الافتراضي يُرفض الاعتماد النهائي بسبب ظاهر مسبقًا في شاشة الطلب، ويبقى الطلب معلقًا حتى يُوثَّق الشهر.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء؛ لا اتصال بقاعدة الشركة أو المراجعة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_ot_wage_month_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-wage-month-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { readCalendarSource, confirmCalendarSource } = require('../src/attendance/attendance-calendar-history')
const { payrollPeriodOfDate, shiftPayrollPeriod } = require('../src/payroll/payroll-period')
let app, master, ds, base, admin, created = false, sequence = 0

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const dateAfter = (value, offset) => { const day = new Date(`${value}T12:00:00`); day.setDate(day.getDate() + offset); return isoDate(day) }
const today = isoDate(new Date())
// يوم أربعاء ماضٍ (لا بصمات مستقبلية)، ويقع في شهر مسير محدد بدورة 23.
let workDate = dateAfter(today, -2)
while (new Date(`${workDate}T12:00:00`).getDay() !== 3) workDate = dateAfter(workDate, -1)
const wageMonth = payrollPeriodOfDate(workDate, 23), nextMonth = shiftPayrollPeriod(wageMonth, 1)

const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function confirm(scope, sourceId, effectiveFrom) {
  await ds.transaction(async em => {
    const read = await readCalendarSource(em, scope, sourceId)
    await confirmCalendarSource(em, claims(admin), scope, sourceId, { expectedRevision: read.revision, expectedCurrentSourceHash: read.currentSourceHash,
      effectiveFrom, reason: 'تأكيد تقويم اختبار راتب شهر الإضافي' })
  })
}
const month = (basicSalary, effectivePayrollPeriod, effectiveToPayrollPeriod = null) => ({ basicSalary, housingAllowance: '0.00', transportAllowance: '0.00',
  phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00', currency: 'SAR', effectivePayrollPeriod, effectiveToPayrollPeriod })
async function documentMonthly(emp, periods) {
  const history = expectStatus(await request(admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200)
  return expectStatus(await request(admin, 'POST', `/payroll/employees/${emp.id}/salary-history/monthly`, { expectedRevision: history.revision,
    expectedCurrentSourceHash: history.currentSourceHash, reason: 'قرار راتب شهري موثق لاختبار الإضافي', evidenceReference: `fixture:ot:${emp.id}:${history.revision + 1}`, periods }), 201)
}

async function fixture(employee) {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `OTWM${n}`, name: `فرع راتب شهر الإضافي ${n}`, country: 'SA', weekendDays: 'FRI,SAT' })
  await confirm('BRANCH', branch.id, dateAfter(workDate, -60))
  const department = await repo('Department').save({ branchId: branch.id, code: `OTWMD${n}`, name: `قسم راتب شهر الإضافي ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `OTWM${n}${suffix}`, fullName: `موظف راتب شهر الإضافي ${n} ${suffix}`,
    branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 0, housingAllowance: 0, transportAllowance: 0,
    phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('D'), hrEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id, ...employee })
  const user = (person, suffix, role = 'employee', permissions = []) => repo('User').save({ email: `${n}-${suffix}@ot-wage-month.invalid`,
    displayName: person.fullName, employeeId: person.id, branchId: branch.id, passwordHash: 'isolated-test-token-only', role, permissions: JSON.stringify(permissions) })
  const owner = await user(emp, 'owner')
  const manager = await user(managerEmployee, 'manager', 'employee', ['requests.view_all'])
  const head = await user(headEmployee, 'head', 'employee', ['requests.view_all'])
  const hr = await user(hrEmployee, 'hr', 'hr_manager', ['requests.view_all', 'attendance.manage', 'attendance.view_all', 'requests.create_on_behalf'])
  const shift = expectStatus(await request(admin, 'POST', '/catalogs/shifts', { name: `وردية راتب شهر الإضافي ${n}`, startTime: '08:00', endTime: '17:00',
    shiftMode: 'fixed', graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(workDate, -14), changeReason: 'وردية مؤرخة لاختبار تسعير الإضافي على راتب الشهر' }), 201)
  expectStatus(await request(hr, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date: workDate, shiftId: shift.id }), 201)
  // خروج 19:00 بعد وردية تنتهي 17:00 = 120 دقيقة إضافية (عتبة 30 دقيقة، تقريب 15 للأسفل).
  expectStatus(await request(hr, 'POST', '/attendance/punches/manual', { reason: 'بصمات فعلية لاختبار راتب شهر الإضافي',
    punches: [['08:00'], ['19:00']].map(([clock]) => ({ employeeCode: emp.employeeCode, timestamp: new Date(`${workDate}T${clock}:00`).toISOString() })) }), 201)
  const submitted = expectStatus(await request(owner, 'POST', '/requests', { typeCode: 'OVERTIME', submit: true,
    payload: { date: workDate, hours: 2, reason: 'عمل إضافي موثق بعد انتهاء الوردية' } }), 201)
  return { emp, owner, manager, head, hr, request: submitted }
}
const decide = (actor, id) => request(actor, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'مراجعة ساعات الإضافي وأدلتها' })
const detail = async (actor, id) => expectStatus(await request(actor, 'GET', `/requests/${id}`), 200)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_ot_wage_month_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  admin = await repo('User').save({ email: 'admin@ot-wage-month.invalid', displayName: 'مراجع اختبار راتب شهر الإضافي', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  const chain = await repo('ApprovalChain').save({ code: 'OT_WAGE_MONTH', nameAr: 'مدير ثم رئيس قسم ثم موارد بشرية', requestTypeCode: 'OVERTIME', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([
    { chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'department_manager_of_requester' },
    { chainId: chain.id, stepOrder: 3, approverRole: 'hr' },
  ])
  const old = await repo('RequestType').findOneBy({ code: 'OVERTIME' })
  await repo('RequestType').save({ ...old, code: 'OVERTIME', nameAr: 'عمل إضافي', category: 'time_attendance', destinationHandler: 'overtime_entries',
    approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['date', 'hours']) })
  await repo('RequestsConfig').save([
    { key: 'overtime.enabled', value: 'false' }, { key: 'overtime.biometric_requires_confirmation', value: 'true' },
    { key: 'overtime.detection_threshold_hours', value: '0.5' },
    { key: 'overtime.multiplier_weekday', value: '1.5' }, { key: 'overtime.multiplier_weekend', value: '1.75' }, { key: 'overtime.multiplier_holiday', value: '2' },
    { key: 'overtime.rounding_minutes', value: '15' }, { key: 'overtime.rounding_direction', value: 'DOWN' },
    { key: 'overtime.max_hours_per_day', value: '0' }, { key: 'overtime.max_hours_per_week', value: '0' }, { key: 'overtime.max_hours_per_month', value: '0' },
    { key: 'overtime.request_backdate_days', value: '30' }, { key: 'overtime.max_closed_periods', value: '1' },
    { key: 'overtime.allow_early_overtime', value: 'false' }, { key: 'overtime.missing_punch_policy', value: 'BLOCK' },
    { key: 'overtime.leave_conflict_policy', value: 'BLOCK' }, { key: 'overtime.wage_components', value: 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER' },
    // قاعدة المالك: «راتب سبتمبر» = 23 أغسطس → 22 سبتمبر؛ والوضع الافتراضي المبذور على hr_system.
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY' },
    { key: 'attendance.weekend_days', value: 'FRI,SAT' }, { key: 'attendance.grace_minutes', value: '0' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  ])
  await confirm('GLOBAL', 0, dateAfter(workDate, -60))
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_ot_wage_month_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Overtime wage-month fixture cleanup failed')
})

test('الخطوة 13 / LOT-15 عبر مسار الطلب: الإضافي المعتمد بعد زيادة الشهر التالي يُسعَّر على راتب شهر يوم العمل، لا على الزيادة ولا راتب الملف', async t => {
  // راتب الملف 12,000 عمدًا؛ السجل: 9,000 حتى شهر يوم العمل ثم 10,000 من الشهر التالي (مُسجلة قبل الاعتماد).
  const f = await fixture({ basicSalary: 12000 })
  await documentMonthly(f.emp, [month('9000.00', '2026-01', wageMonth), month('10000.00', nextMonth)])
  const pending = await detail(f.hr, f.request.id)
  assert.deepEqual(pending.overtime.wageEvidence, { wagePayrollPeriod: wageMonth, ready: true, code: null, reason: null, message: null, sourceKind: 'MONTHLY_HISTORY' })
  for (const [index, actor] of [f.manager, f.head, f.hr].entries()) {
    const acted = expectStatus(await decide(actor, f.request.id), 201)
    assert.equal(acted.status, index === 2 ? 'COMPLETED' : 'UNDER_REVIEW')
  }
  const entry = await repo('OvertimeEntry').findOneByOrFail({ requestId: f.request.id })
  assert.equal(entry.status, 'APPROVED')
  const approval = entry.calculationSnapshot.approval
  assert.equal(approval.wagePayrollPeriod, wageMonth)
  assert.equal(approval.wageBase, 9000, 'يوم العمل في شهر راتبه 9,000 رغم زيادة الشهر التالي وراتب الملف 12,000')
  assert.equal(approval.hourlyRate, 9000 / 30 / 8); assert.equal(approval.approvedMinutes, 120); assert.equal(approval.multiplier, 1.5)
  assert.equal(approval.amount, 112.5); assert.equal(Number(entry.amountSnapshot), 112.5)
  assert.equal(approval.wageSource.kind, 'MONTHLY_HISTORY'); assert.equal(approval.wageSource.referencePeriod, wageMonth)
  assert.equal(approval.wageSource.effectivePayrollPeriod, '2026-01'); assert.equal(approval.wageSource.historyRevision, 1)
  assert.equal((await detail(f.hr, f.request.id)).overtime.wageEvidence, null, 'بعد الاعتماد تُعرض القيمة المثبتة لا الجاهزية')
  t.diagnostic(`يوم ${workDate} (راتب شهر ${wageMonth}) اعتُمد عبر /requests/:id/act على 9,000: 2 س × 1.5 × 37.5 = 112.50`)
})

test('الخطوة 13 عبر مسار الطلب: بلا راتب موثق لشهر يوم العمل تُظهر شاشة الطلب السبب مسبقًا، ويُرفض الاعتماد النهائي ويبقى الطلب معلقًا حتى التوثيق', async t => {
  const f = await fixture({ basicSalary: 9000 })
  const before = await detail(f.manager, f.request.id)
  assert.equal(before.overtime.wageEvidence.ready, false)
  assert.equal(before.overtime.wageEvidence.wagePayrollPeriod, wageMonth)
  assert.equal(before.overtime.wageEvidence.code, 'OT_SALARY_MONTH_EVIDENCE_REQUIRED')
  assert.equal(before.overtime.wageEvidence.reason, 'NO_SALARY_DEFINED')
  assert.match(before.overtime.wageEvidence.message, new RegExp(`راتب شهر ${wageMonth}`))
  assert.doesNotMatch(JSON.stringify(before.overtime.wageEvidence), /9000/, 'الجاهزية لا تكشف مبالغ الأجر')
  expectStatus(await decide(f.manager, f.request.id), 201)
  expectStatus(await decide(f.head, f.request.id), 201)
  const refused = await decide(f.hr, f.request.id)
  assert.equal(refused.status, 409, JSON.stringify(refused.body))
  assert.equal(refused.body.code, 'OT_SALARY_MONTH_EVIDENCE_REQUIRED')
  const stillPending = await repo('Request').findOneByOrFail({ id: f.request.id })
  assert.equal(stillPending.status, 'UNDER_REVIEW'); assert.equal(stillPending.currentStep, 3)
  const untouched = await repo('OvertimeEntry').findOneByOrFail({ requestId: f.request.id })
  assert.equal(untouched.status, 'SUBMITTED'); assert.equal(untouched.approvedMinutes, null); assert.equal(untouched.amountSnapshot, null)
  assert.equal(untouched.calculationSnapshot?.approval, undefined)

  await documentMonthly(f.emp, [month('9000.00', wageMonth)])
  assert.equal((await detail(f.hr, f.request.id)).overtime.wageEvidence.ready, true)
  assert.equal(expectStatus(await decide(f.hr, f.request.id), 201).status, 'COMPLETED')
  const approved = await repo('OvertimeEntry').findOneByOrFail({ requestId: f.request.id })
  assert.equal(approved.status, 'APPROVED')
  assert.equal(approved.calculationSnapshot.approval.wagePayrollPeriod, wageMonth)
  assert.equal(approved.calculationSnapshot.approval.wageBase, 9000); assert.equal(approved.calculationSnapshot.approval.amount, 112.5)
  t.diagnostic('409 OT_SALARY_MONTH_EVIDENCE_REQUIRED والطلب باقٍ في الخطوة 3؛ بعد توثيق الشهر اكتمل الاعتماد نفسه بلا إعادة تقديم')
})
