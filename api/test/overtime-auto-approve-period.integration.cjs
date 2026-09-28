'use strict'
// «اعتماد تلقائي» لفترة الإضافي المفتوحة (قرار المالك 28 سبتمبر) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_ot_auto_approve_test_<16 hex> — لا مساس بقاعدة الشركة)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  AA-01) فترة مفتوحة عليها العلامة ويوم خلص: الكشف بيتعتمد لوحده — طلب OVERTIME_AUTO بخطوة نظام، وقرار approverId = 0
//         بتعليق «اعتماد تلقائي — فترة الإضافي «الاسم»»، وحدث AUTO_APPROVED بمعرّف الفترة، وحجز اليوم، ولقطة الاعتماد النهائي.
//  AA-02) فترة مفتوحة من غير العلامة: التوجيه لسلسلته UNDER_REVIEW زي الأول بالحرف، واعتماده اليدوي بنفس الدليل بيطلع
//         نفس الدقائق والساعات وسعر الساعة والقيمة بالظبط زي التلقائي.
//  AA-03) الاتنين بينزلوا المسير بلقطتهم المثبتة (APPROVAL_SNAPSHOT) بنفس القيمة — لقطة قرار النظام صالحة للصرف.
//  AA-04) الفترة المقفولة بتكسب: مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي.
//  AA-05) فترة الفرع عليها العلامة بتسري على فرعها بس: موظف فرع تاني في نفس اليوم بيتوجه لسلسلته.
//  AA-06) يوم لسه ماخلصش مابيتعتمدش وبيفضل مكتشف، وبيتعتمد في دورة بعد ما يخلص؛ وحد «خلص» من إطار يوم العمل نفسه
//         (آخر اليوم للنهارية، وحد صباح الغد ونافذة الانصراف للّيلية) + مهلة الاستقرار.
//  AA-07) الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه.
//  AA-08) رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش: رجوع للسلسلة UNDER_REVIEW والسبب متسجل.
//  AA-09) حد الفترات المالية المقفلة (قاعدة التقديم): مفيش اعتماد ولا توجيه والسبب بيتسجل مرة؛ ولما الحد يسمح بيتعتمد
//         بترحيل فترة المسير المقفلة زي اليدوي.
//  AA-10) «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية (إنشاء/تعديل/قفل)، والقيمة منطقية بس، والنطاق زي ما هو.
//  AA-11) تعليق القرار مابيسمّيش فترة فرع تاني.
//  AA-11ب) الشاشة: خانة العلامة وجملة شرحها للفترة المفتوحة بس وشغالة افتراضيًا، والشارة، و«اعتماد تلقائي» في السجل والطلبات.
//  AA-12) نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي.
//  AA-13) ترحيل 20260928_074 عبر المُرحّل المجمّع نفسه: إضافي، آمن للتكرار، الفترات القائمة صفر، وفرق المخطط صفر.
// Run (من api/): node --test test/overtime-auto-approve-period.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_ot_auto_approve_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_ot_auto_approve_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-auto-files-'))
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-ot-auto-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20260928_074_overtime_period_auto_approve.sql'
const DF = 'DF_c7cb6d2665b3c861c183e772c16'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const dateAfter = (value, offset) => { const day = new Date(`${value}T12:00:00`); day.setDate(day.getDate() + offset); return isoDate(day) }
const today = isoDate(new Date())
// يوم عمل (أربعاء) خلص من يومين على الأقل — نفس اختيار مجموعات الإضافي التانية
let workDate = dateAfter(today, -2)
while (new Date(`${workDate}T12:00:00`).getDay() !== 3) workDate = dateAfter(workDate, -1)
const numeric = value => Number(value)
const toObject = value => typeof value === 'string' ? JSON.parse(value) : value
// مهلة استقرار ضخمة (أطول من عمر يوم العمل) عشان يوم خلص فعلًا يفضل «مستني» لحد ما ترجع للصفر
const LONG_SYNC_INTERVAL = '20000'
let app, master, pool, ds, baseUrl, admin, attendance, requests, created = false, sequence = 0
const D = {}
const repo = name => ds.getRepository(name)

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(baseUrl + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
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

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  // المهام الدورية موقوفة: كل دورة توجيه في الاختبار صريحة (reconcile-overtime) أو من الإرسال الفوري بعد البصمة
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  pool = await new sql.ConnectionPool(connection(database)).connect()
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  requests = app.get(require('../src/requests/requests.service').RequestsService)
  admin = await repo('User').save({ email: 'admin@ot-auto.invalid', displayName: 'مراجع اختبار الاعتماد التلقائي', passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  const chain = await repo('ApprovalChain').save({ code: 'OT_AUTO_THREE', nameAr: 'مدير ثم رئيس قسم ثم موارد بشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save(['direct_manager_of_requester', 'department_manager_of_requester', 'hr'].map((approverRole, index) => ({
    chainId: chain.id, stepOrder: index + 1, approverRole })))
  for (const [code, destinationHandler] of [['OVERTIME', 'overtime_entries'], ['OVERTIME_AUTO', 'overtime_auto']]) {
    await repo('RequestType').save({ code, nameAr: code === 'OVERTIME' ? 'عمل إضافي' : 'إضافي مكتشف', category: 'time_attendance',
      destinationHandler, approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(code === 'OVERTIME' ? ['date', 'hours'] : []) })
  }
  await repo('RequestsConfig').save(Object.entries({
    // الإضافي مقفول بالإعداد العام: النافذة بتتفتح بالفترات بس (إلا AA-05 اللي بيفتحه للفرع التاني)
    'overtime.enabled': 'false', 'overtime.biometric_requires_confirmation': 'true', 'overtime.detection_threshold_hours': '0.5',
    'overtime.multiplier_weekday': '1.5', 'overtime.multiplier_weekend': '1.5', 'overtime.multiplier_holiday': '2',
    'overtime.rounding_minutes': '15', 'overtime.rounding_direction': 'DOWN', 'overtime.max_hours_per_day': '0',
    'overtime.max_hours_per_week': '0', 'overtime.max_hours_per_month': '0', 'overtime.request_backdate_days': '30',
    'overtime.max_closed_periods': '1', 'overtime.allow_early_overtime': 'false', 'overtime.missing_punch_policy': 'BLOCK',
    'overtime.leave_conflict_policy': 'BLOCK', 'overtime.wage_components': 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER',
    'payroll.cycle_start_day': '1', 'payroll.monthly_days': '30', 'payroll.daily_hours': '8',
    // تسعير الإضافي على راتب الملف (راتب شهر يوم العمل من السجل مغطى في payroll-run-salary-period.integration.cjs)
    'payroll.salary_evidence_mode': 'MONTHLY_HISTORY_OR_CURRENT_FILE', 'payroll.exempt_overtime_eligible': 'false',
    'attendance.weekend_days': 'FRI,SAT', 'attendance.grace_minutes': '0', 'attendance.flex.shortfall_grace_minutes': '10',
  }).map(([key, value]) => ({ key, value })))
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
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
  for (const dir of [uploads, base]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir())); assert.match(path.basename(dir), /^hr-ot-auto-(files|migrations)-/)
      fs.rmSync(dir, { recursive: true, force: true }); assert.equal(fs.existsSync(dir), false)
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'overtime auto-approve fixture cleanup failed')
})

// فرع مستقل لكل تركيب: مدير مباشر ورئيس قسم وموارد بشرية حقيقيين، وموظف براتب 9000 (سعر الساعة 9000/30/8 = 37.50)
async function fixture({ day = workDate, shift = {} } = {}) {
  const n = ++sequence
  const branch = await repo('Branch').save({ code: `AA${n}`, name: `فرع اعتماد تلقائي ${n}`, weekendDays: 'FRI,SAT' })
  const department = await repo('Department').save({ branchId: branch.id, code: `AADEPT${n}`, name: `قسم اعتماد تلقائي ${n}` })
  const person = (suffix, extra = {}) => repo('Employee').save({ employeeCode: `AA${n}${suffix}`, fingerprintCode: `AA${n}${suffix}`,
    fullName: `موظف اعتماد تلقائي ${n} ${suffix}`, branchId: branch.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 0,
    housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    annualLeaveEntitled: false, payMethod: 'cash', ...extra })
  const managerEmployee = await person('M'), headEmployee = await person('D'), hrEmployee = await person('H')
  await repo('Department').update(department.id, { managerEmployeeId: headEmployee.id })
  const emp = await person('E', { managerEmployeeId: managerEmployee.id, basicSalary: 9000 })
  const user = (employee, suffix, role = 'employee', permissions = []) => repo('User').save({ email: `${n}-${suffix}@ot-auto.invalid`,
    displayName: employee.fullName, employeeId: employee.id, branchId: branch.id, passwordHash: 'isolated-test-token-only', role,
    permissions: JSON.stringify(permissions) })
  const owner = await user(emp, 'owner')
  const manager = await user(managerEmployee, 'manager', 'employee', ['requests.view_all'])
  const head = await user(headEmployee, 'head', 'employee', ['requests.view_all'])
  const hr = await user(hrEmployee, 'hr', 'hr_manager', ['requests.view_all', 'attendance.manage', 'attendance.view_all'])
  const saved = await request(admin, 'POST', '/catalogs/shifts', { name: `وردية اعتماد تلقائي ${n}`, startTime: '08:00', endTime: '17:00',
    shiftMode: 'fixed', graceMinutes: 0, flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 540,
    effectiveFrom: dateAfter(day, -14), changeReason: 'وردية مؤرخة لاختبار الاعتماد التلقائي', ...shift })
  assert.equal(saved.status, 201, JSON.stringify(saved.body))
  const assigned = await request(admin, 'POST', '/attendance/schedule/day', { employeeId: emp.id, date: day, shiftId: saved.body.id })
  assert.equal(assigned.status, 201, JSON.stringify(assigned.body))
  return { n, emp, branch, owner, manager, head, hr, day }
}
// بصمات فعلية ليوم خلص (مش النهارده ولا بعده): 08:00 → 19:35 على وردية 9 ساعات = 155 دقيقة زيادة → 150 بعد التقريب
async function punches(f, clocks = ['08:00', '19:35']) {
  assert.ok(f.day < today, 'البصمات الفعلية لأيام خلصت بس')
  const result = await request(admin, 'POST', '/attendance/punches/manual', { reason: 'بصمات فعلية لاختبار الاعتماد التلقائي',
    punches: clocks.map(time => ({ employeeCode: f.emp.employeeCode, timestamp: new Date(`${f.day}T${time}:00`).toISOString() })) })
  assert.equal(result.status, 201, JSON.stringify(result.body))
}
async function period(actor, body) {
  const response = await request(actor, 'POST', '/attendance/overtime-periods', { fromDate: workDate, toDate: workDate, effect: 'OPEN', ...body })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function reconcile() {
  const response = await request(admin, 'POST', '/requests/engine/reconcile-overtime')
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
const entriesOf = f => repo('OvertimeEntry').find({ where: { employeeId: f.emp.id }, order: { id: 'ASC' } })
const eventsOf = entryId => repo('OvertimeEntryEvent').find({ where: { entryId }, order: { id: 'ASC' } })
const decisionsOf = requestId => repo('RequestApproval').find({ where: { requestId }, order: { id: 'ASC' } })
const decide = (actor, id) => request(actor, 'POST', `/requests/${id}/act`, { action: 'APPROVE', comment: 'مراجعة ساعات الإضافي وأدلتها' })
const COMMENT = name => `اعتماد تلقائي — فترة الإضافي «${name}»`
// الحقول المالية المحسوبة للقيد — لازم تبقى هي هي بين الاعتماد التلقائي واليدوي لنفس الدليل
const money = entry => ({ status: entry.status, approvedMinutes: numeric(entry.approvedMinutes), payableHours: numeric(entry.payableHours),
  hoursActual: numeric(entry.hoursActual), rate: numeric(entry.rate), hourlyRateSnapshot: numeric(entry.hourlyRateSnapshot),
  amountSnapshot: numeric(entry.amountSnapshot), originalPeriod: entry.originalPeriod, deferredFromRunId: entry.deferredFromRunId })
const pricing = approval => ({ approvedMinutes: approval.approvedMinutes, hours: approval.hours, multiplier: approval.multiplier,
  hourlyRate: approval.hourlyRate, amount: approval.amount, wageBase: approval.wageBase, wageBasis: approval.wageBasis,
  wageComponents: approval.wageComponents, monthlyDays: approval.monthlyDays, dailyHours: approval.dailyHours, dayKind: approval.dayKind,
  wagePayrollPeriod: approval.wagePayrollPeriod, evidenceMode: approval.evidenceMode, formula: approval.formula,
  originalPeriod: approval.originalPeriod, deferredFromRunId: approval.deferredFromRunId })
const evidenceNumbers = evidence => ({ workDate: evidence.workDate, dayKind: evidence.dayKind, checkIn: evidence.checkIn, checkOut: evidence.checkOut,
  workedMinutes: evidence.workedMinutes, requiredMinutes: evidence.requiredMinutes, rawMinutes: evidence.rawMinutes,
  detectedMinutes: evidence.detectedMinutes, policy: evidence.policy, open: evidence.window.open, blockers: evidence.blockers })
const EXPECTED_MONEY = { status: 'APPROVED', approvedMinutes: 150, payableHours: 2.5, hoursActual: 2.5, rate: 1.5, hourlyRateSnapshot: 37.5,
  amountSnapshot: 140.62, originalPeriod: workDate.slice(0, 7), deferredFromRunId: null }

test('AA-01: فترة مفتوحة عليها «اعتماد تلقائي» ويومها خلص — الكشف بيتعتمد لوحده بخطوة نظام وقرار approverId = 0 وحدث AUTO_APPROVED ولقطة الاعتماد النهائي', async t => {
  const f = await fixture()
  const window = await period(f.hr, { name: `رمضان فرع ${f.n}`, branchId: f.branch.id, autoApprove: true })
  assert.equal(window.autoApprove, true)
  await punches(f)
  // الإرسال الفوري بعد التزام البصمة اعتمده — من غير أي دورة من المهمة
  const entries = await entriesOf(f)
  assert.equal(entries.length, 1)
  const entry = entries[0]
  assert.equal(entry.source, 'BIOMETRIC_DETECTED'); assert.ok(entry.requestId)
  assert.deepEqual(money(entry), EXPECTED_MONEY)
  const snapshot = toObject(entry.calculationSnapshot)
  assert.equal(snapshot.approval.approverId, 0)
  assert.deepEqual(snapshot.approval.autoApproval, { periodIds: [window.id] })
  assert.deepEqual(snapshot.approval.evidence, snapshot.submission.evidence, 'الاعتماد بدليل التقديم نفسه في نفس المعاملة')
  assert.equal(snapshot.submission.submittedByUserId, null); assert.equal(snapshot.submission.requestedMinutes, null)
  assert.equal(snapshot.submission.evidence.detectedMinutes, 150); assert.equal(snapshot.submission.evidence.rawMinutes, 155)
  assert.deepEqual(snapshot.submission.evidence.window, { open: true, governingWindowIds: [window.id], reason: window.name })
  // الطلب: OVERTIME_AUTO مكتمل بخطوة نظام واحدة معتمدة — ومن غير أي خطوة من سلسلة النوع
  const req = await repo('Request').findOneByOrFail({ id: entry.requestId })
  assert.equal(req.typeCode, 'OVERTIME_AUTO'); assert.equal(req.status, 'COMPLETED'); assert.equal(req.currentStep, null)
  assert.equal(req.requesterId, f.emp.id); assert.equal(req.branchId, f.branch.id); assert.equal(req.createdByUserId, null)
  assert.match(req.destinationRef, /^OT/)
  assert.deepEqual(toObject(req.payload), { date: f.day, hours: 2.5, autoDetected: true })
  const steps = toObject(req.resolvedSteps)
  assert.equal(steps.length, 1)
  assert.deepEqual({ ...steps[0], actedAt: typeof steps[0].actedAt }, { stepOrder: 1, role: 'system', approverEmployeeId: null, slaDays: null,
    escalateTo: null, dueAt: null, actedAt: 'string', action: 'APPROVED' })
  // سجل القرار: النظام (0) على الخطوة الوحيدة، والتعليق باسم الفترة
  const decisions = await decisionsOf(req.id)
  assert.deepEqual(decisions.map(row => [row.step, row.approverId, row.action, row.comment]), [[1, 0, 'APPROVED', COMMENT(window.name)]])
  // أحداث السجل: كشف ← تقديم ← اعتماد تلقائي (بالفترة) ← تثبيت القيمة — كلها من النظام
  const events = await eventsOf(entry.id)
  assert.deepEqual(events.map(event => event.eventType), ['DETECTED', 'SUBMITTED', 'AUTO_APPROVED', 'APPROVED'])
  assert.ok(events.every(event => event.actorUserId === null))
  const auto = events[2]
  assert.equal(auto.requestId, req.id); assert.equal(auto.stepOrder, 1); assert.equal(auto.reason, COMMENT(window.name))
  assert.deepEqual(toObject(auto.payload), { periodIds: [window.id] })
  assert.equal(numeric(toObject(events[3].payload).approval.amount), 140.62)
  const claims = await repo('OvertimeDayClaim').find({ where: { employeeId: f.emp.id, workDate: f.day } })
  assert.equal(claims.length, 1); assert.equal(claims[0].entryId, entry.id); assert.equal(claims[0].releasedAt, null)
  // دورة المهمة بعد كده مالهاش حاجة تعملها ومابتكررش حاجة
  const pass = await reconcile()
  assert.deepEqual(pass, { routed: 0, autoApproved: 0 })
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 1)
  // الشاشات: تفاصيل الطلب لصاحبه والسجل بيقروا «اعتماد تلقائي» بلا أرقام مالية زيادة
  const detail = await request(f.owner, 'GET', `/requests/${req.id}`)
  assert.equal(detail.status, 200, JSON.stringify(detail.body))
  assert.equal(detail.body.overtime.calculationSnapshot.approval.autoApproved, true)
  assert.equal(detail.body.overtime.calculationSnapshot.approval.approverId, 0)
  assert.deepEqual(detail.body.overtime.events.map(event => [event.eventType, event.actorUserId, event.actorName]),
    [['DETECTED', null, null], ['SUBMITTED', null, null], ['AUTO_APPROVED', null, null], ['APPROVED', null, null]])
  assert.deepEqual(detail.body.approvals.map(row => [row.approverId, row.action, row.comment]), [[0, 'APPROVED', COMMENT(window.name)]])
  const log = await request(f.hr, 'GET', `/attendance/overtime?from=${f.day}&to=${f.day}`)
  assert.equal(log.status, 200, JSON.stringify(log.body))
  const row = log.body.entries.find(item => item.id === entry.id)
  assert.equal(row.autoApproved, true); assert.equal(row.autoApprovalPending, false); assert.equal(row.requestTypeCode, 'OVERTIME_AUTO')
  const listed = await request(f.hr, 'GET', '/attendance/overtime-periods')
  assert.equal(listed.body.find(item => item.id === window.id).autoApprove, true)
  D.auto = { f, entry, window }
  t.diagnostic('Auto: 08:00→19:35 on 08:00–17:00 (540 required) ⇒ 155 raw ⇒ 150 min = 2.5h × 37.50 × 1.5 = 140.62, system step approved.')
})

test('AA-02: فترة مفتوحة من غير العلامة — التوجيه لسلسلته UNDER_REVIEW زي الأول، واعتماده اليدوي بنفس الدليل بيطلع نفس القيمة بالظبط', async () => {
  const f = await fixture()
  const window = await period(f.hr, { name: `فتح فرع ${f.n}`, branchId: f.branch.id })
  assert.equal(window.autoApprove, false, 'غياب العلامة = لأ')
  await punches(f)
  const [entry] = await entriesOf(f)
  assert.equal(entry.status, 'SUBMITTED'); assert.ok(entry.requestId); assert.equal(entry.approvedMinutes, null); assert.equal(entry.amountSnapshot, null)
  const pending = await repo('Request').findOneByOrFail({ id: entry.requestId })
  assert.equal(pending.typeCode, 'OVERTIME_AUTO'); assert.equal(pending.status, 'UNDER_REVIEW'); assert.equal(pending.currentStep, 1)
  assert.deepEqual(toObject(pending.resolvedSteps).map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  assert.deepEqual(await decisionsOf(pending.id), [])
  assert.deepEqual((await eventsOf(entry.id)).map(event => event.eventType), ['DETECTED', 'SUBMITTED'])
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  assert.equal((await repo('Request').findOneByOrFail({ id: pending.id })).status, 'UNDER_REVIEW')
  for (const [index, actor] of [f.manager, f.head, f.hr].entries()) {
    const result = await decide(actor, pending.id)
    assert.equal(result.status, 201, JSON.stringify(result.body))
    assert.equal(result.body.status, index === 2 ? 'COMPLETED' : 'UNDER_REVIEW')
  }
  const manual = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
  assert.deepEqual(money(manual), EXPECTED_MONEY)
  // نفس الدليل ← نفس الحساب بالحرف: الدقائق والساعات والسعر والقيمة وأساس الأجر وفترة المسير
  const auto = D.auto.entry
  assert.deepEqual(money(manual), money(auto))
  const manualSnapshot = toObject(manual.calculationSnapshot), autoSnapshot = toObject(auto.calculationSnapshot)
  assert.deepEqual(pricing(manualSnapshot.approval), pricing(autoSnapshot.approval))
  assert.deepEqual(evidenceNumbers(manualSnapshot.approval.evidence), evidenceNumbers(autoSnapshot.approval.evidence))
  assert.equal(manualSnapshot.approval.approverId, f.hr.id); assert.equal(manualSnapshot.approval.autoApproval, undefined)
  assert.equal(numeric(manual.amountSnapshot), 140.62)
  D.manual = { f, entry: manual }
})

test('AA-03: المعتمد تلقائيًا بينزل المسير بلقطته المثبتة زي المعتمد يدويًا بالظبط', async () => {
  const report = async () => {
    const response = await request(admin, 'GET', `/reports/payroll/overtime?from=${workDate}&to=${workDate}`)
    assert.equal(response.status, 200, JSON.stringify(response.body))
    return [D.auto, D.manual].map(({ entry }) => response.body.rows.find(row => row.id === entry.id))
  }
  // قبل المسير: التقرير بيقرا قيمة الاتنين من لقطة الاعتماد نفسها (نفس فحص الصرف) من غير أي مشكلة
  const [autoBefore, manualBefore] = await report()
  assert.deepEqual([autoBefore.autoApproved, autoBefore.approverId, autoBefore.amountSource, autoBefore.amount, autoBefore.issue], [true, 0, 'APPROVAL_SNAPSHOT', '140.62', null])
  assert.deepEqual([manualBefore.autoApproved, manualBefore.approverId, manualBefore.amountSource, manualBefore.amount, manualBefore.issue],
    [false, D.manual.f.hr.id, 'APPROVAL_SNAPSHOT', '140.62', null])
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: workDate.slice(0, 7), scopeType: 'CUSTOM',
    employeeIds: [D.auto.f.emp.id, D.manual.f.emp.id], name: 'مسير اختبار الاعتماد التلقائي' })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  for (const { f, entry } of [D.auto, D.manual]) {
    const item = response.body.items.find(row => row.employeeId === f.emp.id)
    assert.ok(item)
    const breakdown = toObject(item.breakdown)
    assert.equal(numeric(item.overtimeHours), 2.5); assert.equal(numeric(item.overtimeAmount), 140.62)
    assert.deepEqual(breakdown.overtimeEntryIds, [entry.id])
    assert.equal(breakdown.overtime.length, 1)
    const line = breakdown.overtime[0]
    assert.equal(line.id, entry.id); assert.equal(line.provenance, 'APPROVAL_SNAPSHOT')
    assert.equal(numeric(line.hourlyRate), 37.5); assert.equal(numeric(line.multiplier), 1.5); assert.equal(numeric(line.amount), 140.62)
  }
  // بعد المسير: «اعتماد تلقائي» للأول بس، وقيمة الاتنين من بند المسير نفسه بنفس المبلغ
  const [autoRow, manualRow] = await report()
  assert.deepEqual([autoRow.autoApproved, autoRow.approverId, autoRow.amountSource, autoRow.amount, autoRow.issue], [true, 0, 'PAYROLL_ITEM', '140.62', null])
  assert.deepEqual([manualRow.autoApproved, manualRow.approverId, manualRow.amountSource, manualRow.amount, manualRow.issue], [false, D.manual.f.hr.id, 'PAYROLL_ITEM', '140.62', null])
  // فحص الصرف مايتفتحش بالعلامة: النظام (0) من غير علامة صالحة، أو مستخدم حقيقي بعلامة، لقطة غير صالحة زي الأول
  const { overtimeFinancialValue } = require('../src/payroll/overtime-financial')
  const tampered = change => {
    const saved = toObject(D.auto.entry.calculationSnapshot)
    return { ...D.auto.entry, calculationSnapshot: { ...saved, approval: change({ ...saved.approval }) } }
  }
  assert.equal(overtimeFinancialValue(tampered(approval => approval), 0).amount, 140.62)
  for (const change of [
    approval => { delete approval.autoApproval; return approval },
    approval => ({ ...approval, autoApproval: null }),
    approval => ({ ...approval, autoApproval: { periodIds: [] } }),
    approval => ({ ...approval, autoApproval: { periodIds: [D.auto.window.id, D.auto.window.id] } }),
    approval => ({ ...approval, autoApproval: { periodIds: [D.auto.window.id], by: 'x' } }),
    approval => ({ ...approval, approverId: D.manual.f.hr.id }),
    approval => ({ ...approval, approverId: -1 })]) {
    assert.throws(() => overtimeFinancialValue(tampered(change), 0), error => error?.response?.code === 'OT_FINANCIAL_SNAPSHOT_INVALID')
  }
  const manualSaved = toObject(D.manual.entry.calculationSnapshot)
  assert.throws(() => overtimeFinancialValue({ ...D.manual.entry, calculationSnapshot: { ...manualSaved,
    approval: { ...manualSaved.approval, autoApproval: { periodIds: [D.auto.window.id] } } } }, 0), error => error?.response?.code === 'OT_FINANCIAL_SNAPSHOT_INVALID')
})

test('AA-04: الفترة المقفولة بتكسب — مفيش كشف ولا اعتماد تلقائي، والطلب الصريح بيمشي في سلسلته، والمكتشف المستني بيتلغي أول ما القفل يتضاف', async () => {
  const f = await fixture()
  await period(f.hr, { name: `مفتوحة تلقائي ${f.n}`, branchId: f.branch.id, autoApprove: true })
  await period(f.hr, { name: `جرد ${f.n}`, branchId: f.branch.id, effect: 'CLOSED' })
  await punches(f)
  assert.deepEqual(await entriesOf(f), [])
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
  // طلب الموظف الصريح في الفترة المقفولة: سلسلته العادية (بيتحسب وقت الاعتماد) — مش اعتماد تلقائي
  const submitted = await request(f.owner, 'POST', '/requests', { typeCode: 'OVERTIME', submit: true,
    payload: { date: f.day, hours: 3, reason: 'عمل إضافي موثق في فترة مقفولة' } })
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body)); assert.equal(submitted.body.status, 'UNDER_REVIEW')
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  assert.equal((await repo('Request').findOneByOrFail({ id: submitted.body.id })).status, 'UNDER_REVIEW')
  const [requested] = await entriesOf(f)
  assert.equal(requested.status, 'SUBMITTED'); assert.equal(requested.source, 'PRE_REQUESTED')

  // مكتشف مستني (مهلة الاستقرار) وبعدين اتضافت فترة مقفولة: إعادة حساب اليوم بتلغيه، والدورة اللي بعدها مابتعتمدش حاجة
  const g = await fixture()
  await period(g.hr, { name: `مفتوحة تلقائي ${g.n}`, branchId: g.branch.id, autoApprove: true })
  await configDuring({ 'attendance.sync_interval_minutes': LONG_SYNC_INTERVAL }, async () => {
    await punches(g)
    const [waiting] = await entriesOf(g)
    assert.equal(waiting.status, 'DETECTED'); assert.equal(waiting.requestId, null)
    await period(g.hr, { name: `قفل متأخر ${g.n}`, branchId: g.branch.id, effect: 'CLOSED' })
  })
  const [cancelled] = await entriesOf(g)
  assert.equal(cancelled.status, 'CANCELLED')
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: cancelled.id })).status, 'CANCELLED')
  assert.equal(await repo('Request').count({ where: { requesterId: g.emp.id } }), 0)
  assert.equal(await repo('OvertimeEntryEvent').count({ where: { entryId: cancelled.id, eventType: 'AUTO_APPROVED' } }), 0)
})

test('AA-05: فترة فرع عليها العلامة بتسري على فرعها بس — موظف فرع تاني في نفس اليوم (الإضافي مفتوح بالإعداد العام) بيتوجه لسلسلته', async () => {
  await configDuring({ 'overtime.enabled': 'true' }, async () => {
    const a = await fixture(), b = await fixture()
    const window = await period(a.hr, { name: `تلقائي فرع ${a.n}`, branchId: a.branch.id, autoApprove: true })
    await punches(a); await punches(b)
    const [ea] = await entriesOf(a), [eb] = await entriesOf(b)
    assert.deepEqual(money(ea), EXPECTED_MONEY)
    assert.deepEqual(toObject(ea.calculationSnapshot).approval.autoApproval, { periodIds: [window.id] })
    assert.deepEqual((await decisionsOf(ea.requestId)).map(row => [row.approverId, row.comment]), [[0, COMMENT(window.name)]])
    assert.equal(eb.status, 'SUBMITTED')
    const routed = await repo('Request').findOneByOrFail({ id: eb.requestId })
    assert.equal(routed.status, 'UNDER_REVIEW')
    assert.deepEqual(toObject(routed.resolvedSteps).map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
    assert.deepEqual(toObject(eb.calculationSnapshot).submission.evidence.window, { open: true, governingWindowIds: [],
      reason: 'الإعداد العام للإضافي خارج الفترات المحددة' })
    assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
    assert.equal((await repo('Request').findOneByOrFail({ id: routed.id })).status, 'UNDER_REVIEW')
  })
})

test('AA-06: يوم لسه ماخلصش مابيتعتمدش — بيفضل مكتشف لحد دورة بعد ما يخلص وساعتها بيتعتمد؛ وحد «خلص» من إطار يوم العمل في محرك الحضور', async () => {
  // (أ) يوم النهارده: كشف من تصحيح بصمة لليوم الجاري — عمره ما يبقى «خلص» قبل بكرة، فيفضل مكتشف
  const t = await fixture({ day: today })
  const todayWindow = await period(t.hr, { name: `تلقائي النهارده ${t.n}`, branchId: t.branch.id, fromDate: today, toDate: today, autoApprove: true })
  await repo('AttendanceCorrection').save({ employeeId: t.emp.id, date: today, reason: 'تصحيح يوم جاري لاختبار الاعتماد التلقائي',
    correctedPunch: JSON.stringify({ in: '08:00', out: '19:35' }) })
  await attendance.computeDay(t.emp.id, today)
  const [current] = await entriesOf(t)
  assert.equal(current.status, 'DETECTED'); assert.equal(current.requestId, null)
  assert.deepEqual(toObject(current.calculationSnapshot).evidence.window.governingWindowIds, [todayWindow.id])
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: current.id })).status, 'DETECTED')
  const todayEvidence = await attendance.overtimeEvidence(t.emp.id, today)
  const todayDecision = await attendance.overtimeAutoApproval(t.emp.id, today, todayEvidence)
  assert.equal(todayDecision.finished, false)
  assert.deepEqual(todayDecision.periods.map(item => item.id), [todayWindow.id])
  assert.equal(todayDecision.endsAt.getTime(), new Date(`${dateAfter(today, 1)}T00:00:00`).getTime())
  const log = await request(t.hr, 'GET', `/attendance/overtime?from=${today}&to=${today}`)
  assert.equal(log.status, 200, JSON.stringify(log.body))
  const pendingRow = log.body.entries.find(item => item.id === current.id)
  assert.equal(pendingRow.autoApprovalPending, true); assert.equal(pendingRow.autoApproved, false)
  // مايدخلش استدراك اختبارات بعد كده
  await repo('OvertimeEntry').update(current.id, { status: 'CANCELLED' })

  // (ب) يوم فات لسه جوه مهلة الاستقرار (فاصل سحب الأجهزة): مكتشف في الدورة الأولى، ومعتمد في أول دورة بعد المهلة
  const f = await fixture()
  const window = await period(f.hr, { name: `تلقائي مستني ${f.n}`, branchId: f.branch.id, autoApprove: true })
  const dayEnd = new Date(`${dateAfter(f.day, 1)}T00:00:00`)
  await configDuring({ 'attendance.sync_interval_minutes': LONG_SYNC_INTERVAL }, async () => {
    await punches(f)
    const [waiting] = await entriesOf(f)
    assert.equal(waiting.status, 'DETECTED'); assert.equal(waiting.requestId, null)
    const end = await attendance.overtimeWorkdayEnd(f.emp.id, f.day)
    assert.equal(end.endsAt.getTime(), dayEnd.getTime(), 'الوردية النهارية: آخر اليوم التقويمي')
    assert.equal(end.settledAt.getTime(), dayEnd.getTime() + (5 + Number(LONG_SYNC_INTERVAL) + 5) * 60000)
    assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
    const still = await repo('OvertimeEntry').findOneByOrFail({ id: waiting.id })
    assert.equal(still.status, 'DETECTED'); assert.equal(still.requestId, null)
  })
  const settled = await attendance.overtimeWorkdayEnd(f.emp.id, f.day)
  assert.equal(settled.settledAt.getTime(), dayEnd.getTime() + 5 * 60000, 'من غير سحب مجدول: سماحية ساعة الجهاز بس')
  const pass = await reconcile()
  assert.equal(pass.autoApproved, 1); assert.equal(pass.routed, 0)
  const [approved] = await entriesOf(f)
  assert.deepEqual(money(approved), EXPECTED_MONEY)
  assert.deepEqual(toObject(approved.calculationSnapshot).approval.autoApproval, { periodIds: [window.id] })
  assert.equal((await repo('Request').findOneByOrFail({ id: approved.requestId })).status, 'COMPLETED')

  // (ج) الوردية الليلية 22:00 → 06:00: الحد صباح الغد (منتصف الفجوة لحد وردية الليلة الجاية = 14:00)، ونافذة الانصراف
  // لحد 16:00 بتأخره — نفس نسبة البصمة لليوم في محرك الحضور
  const night = { name: 'ليلية اعتماد تلقائي', startTime: '22:00', endTime: '06:00', requiredWorkMinutes: 480 }
  const plain = await fixture({ shift: night })
  const plainEnd = await attendance.overtimeWorkdayEnd(plain.emp.id, plain.day)
  assert.equal(plainEnd.endsAt.getTime(), new Date(`${dateAfter(plain.day, 1)}T14:00:00`).getTime())
  assert.equal(plainEnd.settledAt.getTime(), plainEnd.endsAt.getTime() + 5 * 60000)
  const windowed = await fixture({ shift: { ...night, name: 'ليلية بنوافذ', checkinFrom: '21:00', checkinTo: '23:30', checkoutFrom: '05:00', checkoutTo: '16:00' } })
  const windowedEnd = await attendance.overtimeWorkdayEnd(windowed.emp.id, windowed.day)
  assert.equal(windowedEnd.endsAt.getTime(), new Date(`${dateAfter(windowed.day, 1)}T16:00:00`).getTime())
  await configDuring({ 'attendance.sync_interval_minutes': '60' }, async () => {
    const pulled = await attendance.overtimeWorkdayEnd(windowed.emp.id, windowed.day)
    assert.equal(pulled.settledAt.getTime(), pulled.endsAt.getTime() + (5 + 60 + 5) * 60000)
  })
})

test('AA-07: الموظف المستثنى من الحضور بيفضل في سلسلته (مدير + موارد بشرية) — مفيش اعتماد تلقائي لإضافيه حتى جوه فترة العلامة', async () => {
  const f = await fixture()
  await period(f.hr, { name: `تلقائي مستثنى ${f.n}`, branchId: f.branch.id, autoApprove: true })
  let staleId
  await configDuring({ 'attendance.sync_interval_minutes': LONG_SYNC_INTERVAL }, async () => {
    await punches(f)
    const [waiting] = await entriesOf(f)
    assert.equal(waiting.status, 'DETECTED'); staleId = waiting.id
    // استثناء حضور معتمد لليوم (مستحق للإضافي بساعات صريحة) اتسجل بعد الكشف
    await repo('AttendanceExemption').save({ employeeId: f.emp.id, effectiveFrom: f.day, effectiveTo: f.day, reasonCode: 'field_role',
      reason: 'مستثنى مستحق للإضافي بساعات صريحة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
      approvedAt: new Date(), overtimeEligibleOverride: true })
  })
  // اليوم خلص والمهلة عدّت، بس الموظف مستثنى: مفيش اعتماد تلقائي ولا توجيه من البصمة
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  const stale = await repo('OvertimeEntry').findOneByOrFail({ id: staleId })
  assert.equal(stale.status, 'DETECTED'); assert.equal(stale.requestId, null); assert.equal(stale.approvedMinutes, null)
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
  // إعادة حساب اليوم بتلغي المكتشف (المستثنى مالوش إضافي من البصمة)، وإضافيه بطلب صريح في السلسلة بمدير وموارد بشرية
  await attendance.computeDay(f.emp.id, f.day)
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: staleId })).status, 'CANCELLED')
  const submitted = await request(f.owner, 'POST', '/requests', { typeCode: 'OVERTIME', submit: true,
    payload: { date: f.day, hours: 2, reason: 'ساعات إضافية صريحة لموظف مستثنى' } })
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body)); assert.equal(submitted.body.status, 'UNDER_REVIEW')
  assert.deepEqual(toObject(submitted.body.resolvedSteps).map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  const explicit = await repo('OvertimeEntry').findOneByOrFail({ requestId: submitted.body.id })
  assert.equal(toObject(explicit.calculationSnapshot).submission.evidence.evidenceMode, 'EXEMPT_APPROVAL')
  assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
  assert.equal((await repo('Request').findOneByOrFail({ id: submitted.body.id })).status, 'UNDER_REVIEW')
  assert.equal(await repo('RequestApproval').count({ where: { requestId: submitted.body.id } }), 0)
})

test('AA-08: رفض السقف الأسبوعي من مسار الاعتماد نفسه مابينبلعش — الإضافي بيرجع لسلسلته UNDER_REVIEW والسبب متسجل على السجل', async () => {
  const f = await fixture()
  const window = await period(f.hr, { name: `تلقائي بسقف ${f.n}`, branchId: f.branch.id, autoApprove: true })
  await configDuring({ 'overtime.max_hours_per_week': '2' }, async () => { await punches(f) })
  const [entry] = await entriesOf(f)
  assert.equal(entry.status, 'SUBMITTED'); assert.ok(entry.requestId)
  assert.equal(entry.approvedMinutes, null); assert.equal(entry.amountSnapshot, null)
  assert.equal(toObject(entry.calculationSnapshot).approval, undefined)
  const routed = await repo('Request').findOneByOrFail({ id: entry.requestId })
  assert.equal(routed.status, 'UNDER_REVIEW'); assert.equal(routed.currentStep, 1)
  assert.deepEqual(toObject(routed.resolvedSteps).map(step => step.role), ['direct_manager_of_requester', 'department_manager_of_requester', 'hr'])
  assert.deepEqual(await decisionsOf(routed.id), [], 'مفيش قرار نظام اتساب من الاعتماد اللي اترجع')
  assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 1, 'الطلب اللي اتعمل في الاعتماد التلقائي اترجع كله')
  const events = await eventsOf(entry.id)
  assert.deepEqual(events.map(event => event.eventType), ['DETECTED', 'AUTO_APPROVAL_FALLBACK', 'SUBMITTED'])
  const fallback = events[1]
  assert.equal(fallback.requestId, routed.id); assert.equal(fallback.actorUserId, null)
  assert.match(fallback.reason, /^تعذّر الاعتماد التلقائي: الاعتماد يتجاوز سقف الإضافي الأسبوعي/)
  assert.match(fallback.reason, /الإضافي بيمشي في سلسلة الاعتماد العادية$/)
  assert.deepEqual(toObject(fallback.payload), { periodIds: [window.id] })
  assert.equal(await repo('OvertimeDayClaim').count({ where: { entryId: entry.id, releasedAt: null } }), 1)
})

test('AA-09: حد الفترات المالية المقفلة — مفيش اعتماد ولا توجيه والسبب بيتسجل مرة واحدة؛ ولما الحد يسمح بيتعتمد بترحيل فترة المسير المقفلة زي اليدوي', async () => {
  const f = await fixture()
  const window = await period(f.hr, { name: `تلقائي فترة مقفلة ${f.n}`, branchId: f.branch.id, autoApprove: true })
  await configDuring({ 'attendance.sync_interval_minutes': LONG_SYNC_INTERVAL }, async () => { await punches(f) })
  const [entry] = await entriesOf(f)
  assert.equal(entry.status, 'DETECTED')
  // مسير معتمد للموظف بيغطي اليوم (بحجز فترته) — اتعمل بعد الكشف
  const periodKey = f.day.slice(0, 7)
  const [year, month] = periodKey.split('-').map(Number)
  const run = await repo('PayrollRun').save({ name: `مسير مقفول ${f.n}`, scopeType: 'CUSTOM', period: periodKey, startDate: `${periodKey}-01`,
    endDate: isoDate(new Date(year, month, 0, 12)), status: 'APPROVED', approvedBy: admin.id, approvedAt: new Date() })
  await repo('PayrollRunMember').save({ runId: run.id, employeeId: f.emp.id, membershipStatus: 'INCLUDED' })
  await repo('PayrollPeriodClaim').save({ employeeId: f.emp.id, runId: run.id, startDate: run.startDate, endDate: run.endDate, periodKey, releasedAt: null })
  await configDuring({ 'overtime.max_closed_periods': '0' }, async () => {
    for (let index = 0; index < 2; index++) assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
    const still = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
    assert.equal(still.status, 'DETECTED'); assert.equal(still.requestId, null)
    assert.equal(await repo('Request').count({ where: { requesterId: f.emp.id } }), 0)
    const fallbacks = await repo('OvertimeEntryEvent').find({ where: { entryId: entry.id, eventType: 'AUTO_APPROVAL_FALLBACK' } })
    assert.equal(fallbacks.length, 1, 'نفس السبب مرة واحدة رغم تكرار الدورات')
    assert.match(fallbacks[0].reason, /حد الفترات المالية المقفلة \(0\)/); assert.equal(fallbacks[0].requestId, null)
    assert.deepEqual(toObject(fallbacks[0].payload), { periodIds: [window.id] })
  })
  // الحد الافتراضي (1) بيسمح: نفس قاعدة الاعتماد اليدوي — القيمة بتترحل من فترة المسير المقفلة للمسير الجاي
  const pass = await reconcile()
  assert.equal(pass.autoApproved, 1)
  const approved = await repo('OvertimeEntry').findOneByOrFail({ id: entry.id })
  assert.deepEqual(money(approved), { ...EXPECTED_MONEY, originalPeriod: periodKey, deferredFromRunId: run.id })
  const approval = toObject(approved.calculationSnapshot).approval
  assert.equal(approval.originalPeriod, periodKey); assert.equal(approval.deferredFromRunId, run.id)
  assert.deepEqual((await eventsOf(entry.id)).map(event => event.eventType), ['DETECTED', 'AUTO_APPROVAL_FALLBACK', 'SUBMITTED', 'AUTO_APPROVED', 'APPROVED'])
})

test('AA-10: «اعتماد تلقائي» على فترة مقفولة مرفوض برسالة عربية — إنشاء وتعديل وقفل؛ والقيمة منطقية بس؛ وصلاحيات ونطاق الفترات زي ما هي', async () => {
  const f = await fixture(), other = await fixture()
  const range = { fromDate: dateAfter(today, 400), toDate: dateAfter(today, 401) }
  const CLOSED_REFUSAL = /^الاعتماد التلقائي للفترة المفتوحة بس — الفترة المقفولة مفيهاش إضافي مكتشف يتعتمد/
  const count = () => repo('OvertimePeriod').count({ where: { branchId: f.branch.id } })
  const before = await count()
  const closed = await request(f.hr, 'POST', '/attendance/overtime-periods', { name: 'قفل تلقائي', ...range, effect: 'CLOSED', branchId: f.branch.id, autoApprove: true })
  assert.equal(closed.status, 400, JSON.stringify(closed.body)); assert.match(closed.body.message, CLOSED_REFUSAL)
  const text = await request(f.hr, 'POST', '/attendance/overtime-periods', { name: 'نص', ...range, effect: 'OPEN', branchId: f.branch.id, autoApprove: 'true' })
  assert.equal(text.status, 400, JSON.stringify(text.body))
  assert.ok(JSON.stringify(text.body.message).includes('الاعتماد التلقائي (autoApprove) قيمة منطقية'))
  assert.equal(await count(), before)
  const plain = await period(f.hr, { name: 'فتح عادي', ...range, branchId: f.branch.id })
  assert.equal(plain.autoApprove, false)
  const flagged = await period(f.hr, { name: 'فتح تلقائي', ...range, branchId: f.branch.id, autoApprove: true })
  assert.equal(flagged.autoApprove, true)
  // قفل فترة عليها العلامة من غير ما تتشال صراحةً = مرفوض، والفترة زي ما هي
  const closing = await request(f.hr, 'PATCH', `/attendance/overtime-periods/${flagged.id}`, { effect: 'CLOSED' })
  assert.equal(closing.status, 400, JSON.stringify(closing.body)); assert.match(closing.body.message, CLOSED_REFUSAL)
  const unchanged = await repo('OvertimePeriod').findOneByOrFail({ id: flagged.id })
  assert.equal(unchanged.effect, 'OPEN'); assert.equal(unchanged.autoApprove, true)
  const invalid = await request(f.hr, 'PATCH', `/attendance/overtime-periods/${flagged.id}`, { autoApprove: 'yes' })
  assert.equal(invalid.status, 400, JSON.stringify(invalid.body)); assert.match(invalid.body.message, /قيمة منطقية/)
  const closedNow = await request(f.hr, 'PATCH', `/attendance/overtime-periods/${flagged.id}`, { effect: 'CLOSED', autoApprove: false })
  assert.equal(closedNow.status, 200, JSON.stringify(closedNow.body))
  assert.equal(closedNow.body.effect, 'CLOSED'); assert.equal(closedNow.body.autoApprove, false)
  const reflag = await request(f.hr, 'PATCH', `/attendance/overtime-periods/${flagged.id}`, { autoApprove: true })
  assert.equal(reflag.status, 400, JSON.stringify(reflag.body)); assert.match(reflag.body.message, CLOSED_REFUSAL)
  const toggled = await request(f.hr, 'PATCH', `/attendance/overtime-periods/${plain.id}`, { autoApprove: true })
  assert.equal(toggled.status, 200, JSON.stringify(toggled.body)); assert.equal(toggled.body.autoApprove, true)
  assert.deepEqual(toggled.body.recompute, { recomputed: 0, failed: 0 }, 'العلامة لوحدها مابتعيدش حساب أيام')
  // النطاق زي ما هو: حساب الفرع مايعدّلش فترة «كل الفروع» ولا فترة فرع تاني ولا ينشئ فترة لكل الفروع
  const global = await period(admin, { name: 'عامة بعيدة', ...range })
  assert.equal(global.autoApprove, false)
  assert.equal((await request(f.hr, 'PATCH', `/attendance/overtime-periods/${global.id}`, { autoApprove: true })).status, 403)
  const foreign = await period(other.hr, { name: 'فرع تاني', ...range, branchId: other.branch.id })
  assert.equal((await request(f.hr, 'PATCH', `/attendance/overtime-periods/${foreign.id}`, { autoApprove: true })).status, 403)
  assert.equal((await request(f.hr, 'POST', '/attendance/overtime-periods', { name: 'عامة من فرع', ...range, effect: 'OPEN', autoApprove: true })).status, 403)
  assert.equal((await repo('OvertimePeriod').findOneByOrFail({ id: global.id })).autoApprove, false)
  assert.equal((await repo('OvertimePeriod').findOneByOrFail({ id: foreign.id })).autoApprove, false)
  // موظف من غير صلاحية إدارة الحضور مالوش الفترات أصلًا
  assert.equal((await request(f.owner, 'PATCH', `/attendance/overtime-periods/${plain.id}`, { autoApprove: false })).status, 403)
  const listed = await request(f.hr, 'GET', '/attendance/overtime-periods')
  assert.equal(listed.status, 200)
  assert.ok(listed.body.every(item => typeof item.autoApprove === 'boolean'))
  assert.ok(!listed.body.some(item => item.id === foreign.id), 'فترة الفرع التاني مش في قايمة حساب الفرع')
})

test('AA-11: تعليق القرار بيسمّي فترة «كل الفروع» أو فترة فرع الطلب بس — فترة فرع تاني (يوم قبل نقل الموظف) مابتتسمّاش', () => {
  const { overtimeAutoApprovalComment, overtimeAutoApprovalFallbackReason } = require('../src/requests/overtime-auto-approval')
  assert.equal(overtimeAutoApprovalComment([{ id: 1, name: 'رمضان', branchId: 5 }], 5), 'اعتماد تلقائي — فترة الإضافي «رمضان»')
  assert.equal(overtimeAutoApprovalComment([{ id: 2, name: 'موسم', branchId: null }], 5), 'اعتماد تلقائي — فترة الإضافي «موسم»')
  assert.equal(overtimeAutoApprovalComment([{ id: 1, name: 'رمضان', branchId: 5 }, { id: 2, name: 'موسم', branchId: null }], 5),
    'اعتماد تلقائي — فترات الإضافي «رمضان»، «موسم»')
  const foreign = overtimeAutoApprovalComment([{ id: 3, name: 'فترة فرع قديم', branchId: 9 }], 5)
  assert.doesNotMatch(foreign, /فترة فرع قديم/)
  assert.equal(foreign, 'اعتماد تلقائي — فترة إضافي مفتوحة عليها «اعتماد تلقائي» في فرع يوم العمل')
  assert.equal(overtimeAutoApprovalComment([{ id: 3, name: 'فترة فرع قديم', branchId: 9 }, { id: 2, name: 'موسم', branchId: null }], 5),
    'اعتماد تلقائي — فترة الإضافي «موسم»')
  assert.equal(overtimeAutoApprovalFallbackReason('سبب'), 'تعذّر الاعتماد التلقائي: سبب — الإضافي بيمشي في سلسلة الاعتماد العادية')
})

test('AA-11ب: الشاشة — العلامة في إضافة الفترة للمفتوحة بس وشغالة افتراضيًا بجملة الشرح، وشارة على الفترات، و«اعتماد تلقائي» في سجل الإضافي والطلبات', () => {
  const src = rel => fs.readFileSync(path.join(apiRoot, '..', 'src', rel), 'utf8').replace(/\r\n/g, '\n')
  const page = src('app/attendance/overtime/page.tsx')
  const LABEL = 'اعتماد تلقائي للإضافي المكتشف في الفترة دي'
  const HINT = 'الإضافي اللي بيتكشف من البصمة في الفترة دي بيتعتمد لوحده بعد ما اليوم يخلص وينزل المسير؛ من غيرها بيمشي في سلسلة الاعتماد'
  assert.ok(page.includes('const [autoApprove, setAutoApprove] = useState(true)'), 'شغالة افتراضيًا للفترة الجديدة')
  assert.ok(page.includes("autoApprove: effect === 'OPEN' && autoApprove,"), 'المقفولة مابتبعتهاش')
  const modal = page.slice(page.indexOf('function AddOvertimePeriodModal'))
  const gated = modal.slice(modal.indexOf("{effect === 'OPEN' && ("), modal.indexOf('<OrgTargetPicker'))
  assert.ok(gated.includes(LABEL) && gated.includes(HINT), 'الخانة وجملة الشرح جوه شرط الفترة المفتوحة')
  assert.equal(page.split(HINT).length, 2, 'جملة الشرح مرة واحدة بالحرف')
  const list = page.slice(page.indexOf('function OvertimePeriodsSection'), page.indexOf('function AddOvertimePeriodModal'))
  assert.ok(list.includes('{isOpen && p.autoApprove && ('), 'الشارة للمفتوحة اللي عليها العلامة')
  assert.ok(list.includes('{isOpen && canEdit(p) && (') && list.includes(LABEL), 'تعديل العلامة للمفتوحة في نطاق الحساب')
  assert.ok(list.includes('updateOvertimePeriod(p.id, { autoApprove: !p.autoApprove })'))
  assert.ok(page.includes('{e.autoApproved && (') && page.includes('e.autoApprovalPending ? ('), 'سجل الإضافي بيقرا الاعتماد التلقائي والمستني')
  for (const file of ['app/approvals-inbox/page.tsx', 'app/requests/page.tsx', 'app/requests-console/page.tsx']) {
    assert.ok(src(file).includes("system: 'اعتماد تلقائي',"), file)
  }
  const summary = src('components/OvertimeRequestSummary.tsx')
  assert.ok(summary.includes("AUTO_APPROVED: 'اعتماد تلقائي من فترة الإضافي'") && summary.includes('AUTO_APPROVAL_FALLBACK:'))
  assert.ok(summary.includes('{approval?.autoApproved && <p'), 'ملخص الطلب بيقول إنه اعتماد تلقائي')
  // خطوة النظام مش دور يتضبط في محرر السلاسل
  assert.ok(!src('components/approvals/chainEditorModel.ts').includes('system'))
})

test('AA-12: نوع OVERTIME_AUTO لازم يكون مفعّل، وسلسلته مش شرط للاعتماد التلقائي — من غير سلسلة الكشف العادي بيفضل مكتشف زي الأول', async () => {
  const type = await repo('RequestType').findOneByOrFail({ code: 'OVERTIME_AUTO' })
  try {
    // النوع موقوف: مفيش اعتماد تلقائي ولا توجيه — والكشف بيفضل مكتشف لحد ما يتفعّل
    await repo('RequestType').update(type.id, { isActive: false })
    const inactive = await fixture()
    await period(inactive.hr, { name: `تلقائي نوع موقوف ${inactive.n}`, branchId: inactive.branch.id, autoApprove: true })
    await punches(inactive)
    const [waiting] = await entriesOf(inactive)
    assert.equal(waiting.status, 'DETECTED'); assert.equal(waiting.requestId, null)
    assert.deepEqual(await reconcile(), { routed: 0, autoApproved: 0 })
    // النوع مفعّل من غير سلسلة: الاعتماد التلقائي شغال، وكشف الفترة العادية (مفيش سلسلة يتوجه لها) بيفضل مكتشف
    await repo('RequestType').update(type.id, { isActive: true, approvalChainId: null })
    const noChain = await fixture()
    const window = await period(noChain.hr, { name: `تلقائي من غير سلسلة ${noChain.n}`, branchId: noChain.branch.id, autoApprove: true })
    const regular = await fixture()
    await period(regular.hr, { name: `عادي من غير سلسلة ${regular.n}`, branchId: regular.branch.id })
    await punches(noChain); await punches(regular)
    const [auto] = await entriesOf(noChain), [plain] = await entriesOf(regular)
    assert.deepEqual(money(auto), EXPECTED_MONEY)
    assert.deepEqual(toObject(auto.calculationSnapshot).approval.autoApproval, { periodIds: [window.id] })
    assert.deepEqual(toObject((await repo('Request').findOneByOrFail({ id: auto.requestId })).resolvedSteps).map(step => [step.role, step.action]), [['system', 'APPROVED']])
    assert.equal(plain.status, 'DETECTED'); assert.equal(plain.requestId, null)
    // المكتشف اللي كان مستني النوع: أول دورة بعد التفعيل بتعتمده
    const pass = await reconcile()
    assert.equal(pass.autoApproved, 1); assert.equal(pass.routed, 0)
    assert.deepEqual(money(await repo('OvertimeEntry').findOneByOrFail({ id: waiting.id })), EXPECTED_MONEY)
    assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: plain.id })).status, 'DETECTED')
    await repo('OvertimeEntry').update(plain.id, { status: 'CANCELLED' })
  } finally {
    await repo('RequestType').update(type.id, { isActive: type.isActive, approvalChainId: type.approvalChainId })
  }
})

// شكل العمود وقيده الافتراضي في القاعدة
const shape = () => ds.query(`SELECT t.name AS type, c.is_nullable AS nullable, d.name AS df, d.definition
  FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
  WHERE c.object_id = OBJECT_ID('dbo.overtime_periods') AND c.name = 'autoApprove'`)
const EXPECTED_SHAPE = [{ type: 'bit', nullable: false, df: DF, definition: '((0))' }]
const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')

test('AA-13: ترحيل 20260928_074 — إضافي بعمود واحد بقيد TypeORM، عبر المُرحّل المجمّع (بروفة ثم تطبيق)، الفترات القائمة صفر، آمن للتكرار، وفرق المخطط صفر', async () => {
  // فحص نصي: من غير BOM ولا CR، مفيش عبارة ممنوعة ولا تعبئة، وأكواده فريدة بين كل الملفات، واسم قيده هو حساب TypeORM
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  assert.equal(raw.includes(13), false, 'LF بس')
  const text = content()
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [74001, 74002, 74003, 74004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|INSERT|UPDATE)\b/i, 'إضافي فقط')
  assert.match(statements, /IF COL_LENGTH\(N'dbo\.overtime_periods', N'autoApprove'\) IS NULL\s+ALTER TABLE dbo\.overtime_periods ADD \[autoApprove\] bit NOT NULL\s+CONSTRAINT \[DF_c7cb6d2665b3c861c183e772c16\] DEFAULT 0;/)
  assert.match(text, /^-- 20260928_074: /)
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملف مقبول')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  const { DefaultNamingStrategy } = require('../node_modules/typeorm')
  assert.equal(new DefaultNamingStrategy().defaultConstraintName('overtime_periods', 'autoApprove'), DF)
  // القاعدة المتعملة بـsynchronize من الكيان نفسه: نفس الشكل ونفس اسم القيد، والفرق صفر قبل التجربة
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.equal((await ds.driver.createSchemaBuilder().log()).upQueries.length, 0)

  // المخطط القديم (العمود متشال) وفيه فترات قائمة من الاختبارات اللي فاتت — منها مفتوحة كانت عليها العلامة ومقفولة
  const columns = '[id], [name], CONVERT(varchar(10), [fromDate], 23) AS [fromDate], CONVERT(varchar(10), [toDate], 23) AS [toDate], [effect], [branchId], [isActive]'
  const before = await ds.query(`SELECT ${columns} FROM dbo.overtime_periods ORDER BY [id]`)
  assert.ok(before.length >= 10)
  assert.ok((await ds.query('SELECT COUNT(*) AS n FROM dbo.overtime_periods WHERE [autoApprove] = 1'))[0].n > 0)
  assert.ok(before.some(row => row.effect === 'CLOSED'))
  await pool.request().batch(`ALTER TABLE dbo.overtime_periods DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.overtime_periods DROP COLUMN [autoApprove];`)
  assert.deepEqual(await shape(), [])
  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), ['overtime_periods.autoApprove'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  // الفترات القائمة كلها بالصفر الافتراضي، وباقي أعمدتها زي ما هي بالحرف؛ والكيان بيقرا العمود والفرق صفر
  assert.deepEqual(await ds.query(`SELECT ${columns} FROM dbo.overtime_periods ORDER BY [id]`), before)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.overtime_periods WHERE [autoApprove] <> 0'))[0].n, 0)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  assert.equal((await repo('OvertimePeriod').findOneByOrFail({ id: before[0].id })).autoApprove, false)

  // آمن للتكرار: المُرحّل مالقاش ملف معلق، والملف مرتين كمان بنفس الشكل والبيانات
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query(`SELECT ${columns} FROM dbo.overtime_periods ORDER BY [id]`), before)

  // شكل غلط أو بيانات غلط بيوقف التحقق بكوده ومايسيبش أثر (كل حالة جوه معاملة بتترجع)
  const closedId = before.find(row => row.effect === 'CLOSED').id
  for (const [ddl, code] of [
    [`ALTER TABLE dbo.overtime_periods DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.overtime_periods ALTER COLUMN [autoApprove] bit NULL`, 74002],
    [`ALTER TABLE dbo.overtime_periods DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.overtime_periods ALTER COLUMN [autoApprove] int NOT NULL`, 74002],
    [`EXEC sp_rename N'dbo.${DF}', N'DF_overtime_auto_wrong_name', N'OBJECT'`, 74003],
    [`ALTER TABLE dbo.overtime_periods DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.overtime_periods ADD CONSTRAINT [${DF}] DEFAULT 1 FOR [autoApprove]`, 74003],
    [`ALTER TABLE dbo.overtime_periods DROP CONSTRAINT [${DF}]`, 74003],
    [`UPDATE dbo.overtime_periods SET [autoApprove] = 1 WHERE [id] = ${Number(closedId)}`, 74004]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(text).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query(`SELECT ${columns} FROM dbo.overtime_periods ORDER BY [id]`), before)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})
