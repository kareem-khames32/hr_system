// اختبار شامل قبل التشغيل (الموجة ج-2): التقارير وأرقامها —
// على قاعدة SQL مؤقتة عشوائية (hr_reports_test_<16 hex>) تُنشأ بـsynchronize وتُحذف في النهاية.
// لا مساس بقاعدة الشركة ولا بقاعدة المراجعة. التوكنات موقّعة محليًّا بسر عشوائي — لا كلمات مرور ولا أسرار.
//
// المنهج: نبني بيانات حقيقية (فرعان، قسمان، فريق، مركز تكلفة، ٨ موظفين بطرق صرف مختلفة، شهر حضور فيه
// تأخير وغياب وإضافي ودوام عطلة وإجازة بلا أجر وإيقاف، مسير معتمد ومصروف، تصفية، خصم ومكافأة وسلفة)
// ثم نطالب كل تقرير برقمه ونقارنه بالصفوف المصدر محسوبة باليد — لا «مافيش خطأ».
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
// اسم القاعدة يلتزم بحارس البيئة (isDisposableTestDatabase): hr_<اسم>_test_<16 حرف hex>
const database = `hr_reports_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-reports-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

// دورة المسير: من 23 الشهر السابق إلى 22 من شهر المسير (نفس دورة المالك)
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
const PERIOD = '2026-10', CYCLE_FROM = '2026-09-23', CYCLE_TO = '2026-10-22'
const PREV_PERIOD = '2026-09', PREV_FROM = '2026-08-23', PREV_TO = '2026-09-22'
const ATT_FROM = '2026-08-23', ATT_TO = '2026-11-22'
// الإضافي وبدل العطلة يشترطان يومًا ماضيًا ببصمات فعلية ⇒ في دورة شهر المسير السابق (2026-08-23 → 2026-09-22)
const OT_DAY = '2026-09-08'        // ثلاثاء — يوم عمل ماضٍ
const HOLIDAY_DAY = '2026-09-12'   // سبت — عطلة أسبوعية ماضية (attendance.weekend_days = FRI,SAT)
const LATE_DAY = '2026-10-06'
const ABSENT_DAY = '2026-10-08'        // يوم بلا صف حضور أصلًا (زي ما بيحصل لما مفيش بصمة)
const ABSENT_ROW_DAY = '2026-10-14'    // يوم بصف حضور حالته «غياب»
const UNPAID_DAY = '2026-10-13'
const LWD = '2026-10-12'           // آخر يوم عمل لموظف التصفية
// فترة الإيقاف تبدأ قبل «النهارده» وتغطي دورة شهر التقرير كاملة، فشاشة الموظفين تعرض الحالة «موقوف»
const SUSPENSION_FROM = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
const YEAR = '2026'

// أساس الأرقام: أساسي 6000 + سكن 1200 + انتقال 600 = 7800 ⇒ يوم 260، ساعة 32.50، دقيقة 32.5/60
const GROSS = 7800, DAY_RATE = 7800 / 30, HOUR_RATE = DAY_RATE / 8, MINUTE_RATE = HOUR_RATE / 60

let app, master, ds, base, created = false
let admin, branchA, branchB, deptOps, deptSales, teamOne, ccMain, policyVersionId, employeeNumber = 0
// boss/payUser = حسابان على مستوى الشركة (النظام ما فيهوش دور غير super_admin بنطاق كل الفروع — branchScopeOf)
let boss, payUser, hrUser, branchAUser, branchBUser, reportOnlyUser, mgr, mgrUser
let eTransfer, eCash, eMixed, eLate, eSettle, eOt, eOther, eDraft, eSuspended, eJoinsLater
let runMain, runOther, runDraft, runPrev, loanMain
const runItems = new Map()   // runId -> items (من تفصيل المسير بعد الحساب)

function assertDisposable() {
  assert.match(database, /^hr_reports_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, note) {
  assert.equal(response.status, status, `${note ?? ''} ${JSON.stringify(response.body)}`)
  return response.body
}
const get = (user, route, params) => request(user, 'GET', params ? `${route}?${new URLSearchParams(params).toString()}` : route)
const ok = async (user, route, params) => expectStatus(await get(user, route, params), 200, `GET ${route} ${JSON.stringify(params ?? {})}:`)

// ===== تحقق «ناعم»: الفشل يُسجَّل ولا يوقف باقي السيناريو =====
const soft = []
let currentScenario = '—'
const brief = error => String(error?.message ?? error).split('\n').map(line => line.trim()).filter(Boolean).join(' | ').slice(0, 700)
function expect(label, fn) {
  checks++
  try { fn(); return true }
  catch (error) { soft.push({ scenario: currentScenario, label, message: brief(error) }); return false }
}
const scenarioNames = []
const scene = name => { currentScenario = name; scenarioNames.push(name); return name }
let checks = 0
// جدول التغطية: كل نقطة نهاية تقرير وهل اختُبرت فعلًا
const coverage = new Map()
const covered = (endpoint, note) => coverage.set(endpoint, { covered: true, note })
const notCovered = (endpoint, note) => { if (!coverage.get(endpoint)?.covered) coverage.set(endpoint, { covered: false, note }) }

// ===== الفلوس: قص على منزلتين نحو الصفر (نفس roundPayrollMoney) =====
const money = value => { const c = Math.trunc(Math.round(Math.abs(value) * 1e6) / 1e4); return c === 0 ? 0 : Math.sign(value) * c / 100 }
const M = value => money(value).toFixed(2)               // نص التقرير «1234.56»
const C = value => Math.round(Number(value ?? 0) * 100)  // قروش صحيحة من نص/رقم
const sumC = values => values.reduce((sum, value) => sum + C(value), 0)
const cM = cents => (cents / 100).toFixed(2)

// ===== مساعدو التجهيز =====
async function employee(overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `RP${String(n).padStart(3, '0')}`, fullName: `موظف تقارير ${n}`,
    branchId: branchA.id, departmentId: deptOps.id, teamId: null, jobTitle: 'محاسب', joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 1200, transportAllowance: 600, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك التقارير',
    iban: `SA${String(n).padStart(22, '0')}`, ...overrides })
}
const user = (email, displayName, role, permissions, extra = {}) =>
  repo('User').save({ email: `${email}@rpfull.invalid`, displayName, passwordHash: 'test-only', role,
    branchId: branchA.id, permissions: JSON.stringify(permissions), ...extra })
async function presentEveryDay(emp, from = ATT_FROM, to = ATT_TO, overrides = {}) {
  const rows = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    const custom = overrides[date]
    if (custom === null) continue // لا صف أصلاً (غياب)
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية التقارير', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
      workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, ...(custom ?? {}) })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
}
async function staff(code, name, extra = {}, attendance = {}) {
  const emp = await employee({ employeeCode: `RP${code}`, fingerprintCode: `RP${code}`, fullName: name, managerEmployeeId: mgr?.id ?? null, ...extra })
  const account = await user(`rp-${code.toLowerCase()}`, name, 'employee', [], { employeeId: emp.id, branchId: emp.branchId })
  await presentEveryDay(emp, ATT_FROM, ATT_TO, attendance)
  return { emp, user: account, id: emp.id, code: emp.employeeCode, name }
}
async function setChainSteps(typeCode, steps) {
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: `CH_${typeCode}` })
  expectStatus(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`,
    { steps: steps.map(step => (typeof step === 'string' ? { approverRole: step, slaDays: 3 } : step)) }), 200, `steps of CH_${typeCode}:`)
  return chain
}
async function submitRequest(actor, typeCode, payload, extra = {}) {
  const created = expectStatus(await request(actor, 'POST', '/requests', { typeCode, payload, ...extra }), 201, `create ${typeCode}:`)
  const submitted = await request(actor, 'POST', `/requests/${created.id}/submit`)
  return { created, submitted, id: created.id }
}
const act = (actor, id, action, comment) => request(actor, 'POST', `/requests/${id}/act`, { action, ...(comment ? { comment } : {}) })

// ===== مساعدو المسير =====
const draft = async (actor, name, filters, period = PERIOD) =>
  expectStatus(await request(actor, 'POST', '/payroll/runs', { name, policyVersionId, period, filters }), 201, `draft ${name}:`)
const calcRun = async (actor, runId) => expectStatus(await request(actor, 'POST', `/payroll/runs/${runId}/calculate`, {}), 201, 'calculate:')
const runDetail = async (actor, runId) => expectStatus(await request(actor, 'GET', `/payroll/runs/${runId}`), 200)
async function approveRun(actor, runId) {
  const report = expectStatus(await request(actor, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(actor, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  return request(actor, 'POST', `/payroll/runs/${runId}/approve`)
}
const itemOf = (runId, employeeId) => (runItems.get(runId) ?? []).find(item => item.employeeId === employeeId)
const allItems = (...runIds) => runIds.flatMap(id => runItems.get(id) ?? [])

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
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
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  branchA = await repo('Branch').save({ code: 'RP_A', name: 'فرع التقارير أ' })
  branchB = await repo('Branch').save({ code: 'RP_B', name: 'فرع التقارير ب' })
  deptOps = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  deptSales = await repo('Department').save({ name: 'قسم المبيعات', branchId: branchB.id, isActive: true })
  teamOne = await repo('Team').save({ name: 'فريق التشغيل', code: 'RP_T1', departmentId: deptOps.id, isActive: true })
  ccMain = await repo('CostCenter').save({ code: 'RP_CC1', name: 'مركز تكلفة المشاريع', isActive: true })
  admin = await repo('User').save({ email: 'admin@rpfull.invalid', displayName: 'مدير النظام', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await require('../src/seed/seed-requests').seedRequests(ds)
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'attendance.absence_penalty_days', value: '1' },
    { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies',
    { name: 'معدلات اختبار التقارير', effectiveFrom: '2026-05-23', settings: { ...cycle23, dailyHours: 8 } }), 201)
  const [version] = createdPolicy.versions
  const published = expectStatus(await request(admin, 'POST',
    `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر معدلات اختبار التقارير' }), 200)
  policyVersionId = published.version.id

  // ===== الحسابات =====
  // القارئ على مستوى الشركة (كل التقارير) والمعتمِد — حسابان مختلفان عشان فصل المهام في المسير
  boss = admin
  payUser = await repo('User').save({ email: 'pay@rpfull.invalid', displayName: 'عبير — معتمِدة المسير والصرف',
    passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  // الموارد البشرية على فرع أ (النظام يقفل أي دور غير super_admin على فرعه)
  hrUser = await user('hr', 'هدى — الموارد البشرية (فرع أ)', 'hr_manager', ['leaves.view_all', 'employees.view', 'employees.edit',
    'leave_balances.manage', 'requests.view_all', 'approval_chains.manage', 'reports.view', 'payroll.view',
    'deductions.manage', 'bonuses.manage', 'offboarding.manage', 'settlement.edit', 'settlement.approve',
    'attendance.view_all', 'overtime.view_all'], { branchId: branchA.id })
  // حساب محصور على الفرع أ (عنده صلاحية التقارير والرواتب لكن نطاقه فرع واحد)
  branchAUser = await user('branch-a', 'بدر — مدير فرع أ', 'branch_manager',
    ['reports.view', 'payroll.view', 'employees.view', 'attendance.view_all', 'leaves.view_all', 'requests.view_all'], { branchId: branchA.id })
  branchBUser = await user('branch-b', 'باسم — مدير فرع ب', 'branch_manager',
    ['reports.view', 'payroll.view', 'employees.view', 'attendance.view_all', 'leaves.view_all', 'requests.view_all'], { branchId: branchB.id })
  // تقارير بلا صلاحية رواتب
  reportOnlyUser = await user('reports-only', 'رشا — التقارير فقط', 'hr_manager', ['reports.view', 'employees.view'], { branchId: null })
  const managerStaff = await staff('MGR', 'ماجد — المدير المباشر', { jobTitle: 'مدير عمليات' })
  mgr = managerStaff.emp; mgrUser = managerStaff.user
  await repo('Employee').update({ id: mgr.id }, { managerEmployeeId: null })
  await repo('Department').update({ id: deptOps.id }, { managerEmployeeId: mgr.id })

  await setChainSteps('LEAVE', ['direct_manager_of_requester', 'hr'])
  await setChainSteps('HOLIDAY_WORK', ['hr'])
  const patchType = async (code, body) => {
    const type = await repo('LeaveType').findOneByOrFail({ code })
    expectStatus(await request(admin, 'PATCH', `/settings/leave-types/${type.id}`, body), 200, `leave-type ${code}:`)
  }
  await patchType('ANNUAL', { category: 'ANNUAL', annualDays: 21, countingMode: 'WORKING_DAYS' })
  await patchType('UNPAID', { category: 'UNPAID', countingMode: 'ALL_DAYS' })

  // ===== الموظفون =====
  eTransfer = await staff('T01', 'تامر — تحويل بنكي', { teamId: teamOne.id, costCenterId: ccMain.id })
  eCash = await staff('K01', 'كوثر — نقدي', { payMethod: 'cash', bankName: null, iban: null, costCenterId: ccMain.id })
  eMixed = await staff('M01', 'منال — نقدي + بنك', { payMethod: 'mixed', bankTransferAmount: 5000 })
  eLate = await staff('L01', 'ليلى — تأخير وغياب وخصم ومكافأة', { teamId: teamOne.id },
    { [LATE_DAY]: { status: 'late', lateMinutes: 30 }, [ABSENT_DAY]: null,
      [ABSENT_ROW_DAY]: { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0 } })
  eSettle = await staff('S01', 'سامي — التصفية')
  eOt = await staff('O01', 'عمر — إضافي ودوام عطلة')
  eOther = await staff('B01', 'بشار — فرع ب', { branchId: branchB.id, departmentId: deptSales.id, teamId: null })
  eDraft = await staff('D01', 'دانة — مسير غير معتمد')
  eSuspended = await staff('P01', 'بلال — موقوف')   // الإيقاف يُسجَّل بدورته الحقيقية في F1
  eJoinsLater = await staff('J01', 'جنى — تعيين لاحق', { joinDate: '2026-12-01' })
  for (const s of [eTransfer, eCash, eMixed, eLate, eSettle, eOt, eOther, eDraft])
    await require('../src/seed/seed-requests').ensureLeaveBalance(ds, s.id, 21)
}, { timeout: 420000 })

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
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'fulltest reports fixture cleanup failed')
})

// ============================================================================
// 0) تجهيز الأحداث المالية ثم المسيرات
// ============================================================================

test('F1 — أحداث الشهر: إجازة بلا أجر، إضافي، دوام عطلة، خصم، مكافأة، سلفة، وتصفية', async () => {
  scene('F1 تجهيز أحداث الشهر')

  // (أ) إجازة بلا أجر يوم واحد لموظف التأخير
  const leave = await submitRequest(eLate.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: UNPAID_DAY, toDate: UNPAID_DAY, days: 1 })
  if (expect('إجازة بلا أجر اتقدّمت', () => assert.equal(leave.submitted.status, 201, JSON.stringify(leave.submitted.body)))) {
    expectStatus(await act(mgrUser, leave.id, 'APPROVE', 'موافق'), 201, 'leave mgr:')
    expectStatus(await act(hrUser, leave.id, 'APPROVE', 'موافق'), 201, 'leave hr:')
  }

  // (ب) إضافي بالبصمة + دوام يوم عطلة
  const shift = expectStatus(await request(admin, 'POST', '/catalogs/shifts',
    { name: 'وردية تقارير الإضافي', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed', graceMinutes: 0,
      flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 480, effectiveFrom: '2026-08-01',
      changeReason: 'وردية مؤرخة لأدلة الإضافي في اختبار التقارير' }), 201, 'shift:')
  for (const day of [OT_DAY, HOLIDAY_DAY]) {
    expectStatus(await request(admin, 'POST', '/attendance/schedule/day', { employeeId: eOt.id, date: day, shiftId: shift.id }), 201, `schedule ${day}:`)
  }
  const punch = (date, clock) => ({ employeeCode: eOt.emp.employeeCode, timestamp: new Date(`${date}T${clock}:00`).toISOString() })
  const punches = await request(admin, 'POST', '/attendance/punches/manual',
    { punches: [punch(OT_DAY, '08:00'), punch(OT_DAY, '19:00'), punch(HOLIDAY_DAY, '09:00'), punch(HOLIDAY_DAY, '13:00')],
      reason: 'بصمات فعلية لاختبار أرقام تقارير الإضافي وبدل العطلة' })
  expect('البصمات اتقبلت', () => assert.equal(punches.status, 201, JSON.stringify(punches.body)))
  const ot = await submitRequest(eOt.user, 'OVERTIME', { date: OT_DAY, hours: 3, reason: 'إغلاق شهري بعد الوردية' })
  let otRequestId = ot.id
  if (ot.submitted.status !== 201) {
    await request(eOt.user, 'POST', `/requests/${ot.id}/cancel`)
    otRequestId = ot.submitted.body?.requestId ?? null
  }
  if (otRequestId) {
    for (const step of [1, 2]) await act(mgrUser, otRequestId, 'APPROVE', `اعتماد خطوة ${step}`)
    await act(hrUser, otRequestId, 'APPROVE', 'اعتماد الموارد البشرية')
    const done = expectStatus(await request(hrUser, 'GET', `/requests/${otRequestId}`), 200)
    expect('طلب الإضافي اكتمل', () => assert.equal(done.status, 'COMPLETED', JSON.stringify(done.status)))
  }
  const holiday = await submitRequest(eOt.user, 'HOLIDAY_WORK', { dates: [HOLIDAY_DAY], reason: 'جرد المخزن يوم العطلة' })
  if (expect('طلب دوام العطلة اتقدّم', () => assert.equal(holiday.submitted.status, 201, JSON.stringify(holiday.submitted.body))))
    expectStatus(await act(hrUser, holiday.id, 'APPROVE', 'موافق'), 201, 'holiday:')

  // (ج) خصم مصنّف 300 ومكافأة 500 على موظف واحد
  const dType = expectStatus(await request(admin, 'POST', '/deductions/types',
    { code: 'RP_FINE', nameAr: 'غرامة تأخير تسليم', category: 'ADMINISTRATIVE', calcMethod: 'FIXED_AMOUNT',
      isExemptable: true, creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201, 'deduction type:')
  const bType = expectStatus(await request(admin, 'POST', '/bonuses/types',
    { code: 'RP_PERF', nameAr: 'مكافأة أداء', calcMethod: 'FIXED_AMOUNT', creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201, 'bonus type:')
  const deduction = await request(hrUser, 'POST', '/deductions',
    { employeeId: eLate.id, deductionTypeId: dType.id ?? dType.type?.id, inputValue: '300', incidentDate: '2026-09-15',
      reason: 'تأخر تسليم التقرير الشهري عن موعده المتفق عليه مع الإدارة', targetPeriod: PERIOD })
  const bonus = await request(hrUser, 'POST', '/bonuses',
    { employeeId: eLate.id, bonusTypeId: bType.id ?? bType.type?.id, inputValue: '500',
      reason: 'أداء متميز في إغلاق الربع وتحقيق المستهدف كاملًا', targetPeriod: PERIOD })
  expect('إنشاء الخصم مقبول', () => assert.equal(deduction.status, 201, JSON.stringify(deduction.body)))
  expect('إنشاء المكافأة مقبول', () => assert.equal(bonus.status, 201, JSON.stringify(bonus.body)))
  const approveAll = async (kind, id, label) => {
    for (let guard = 0; guard < 6; guard++) {
      const state = expectStatus(await request(hrUser, 'GET', `/${kind}/${id}`), 200)
      if (state.status === 'APPROVED') return state
      const step = await request(admin, 'POST', `/${kind}/${id}/approve`, { expectedRevision: state.revision ?? 0, reason: `${label} — اعتماد خطوة` })
      if (step.status !== 201) { soft.push({ scenario: currentScenario, label: `اعتماد ${label}`, message: JSON.stringify(step.body) }); return state }
    }
    return expectStatus(await request(hrUser, 'GET', `/${kind}/${id}`), 200)
  }
  if (deduction.status === 201) {
    const state = await approveAll('deductions', deduction.body.id ?? deduction.body.deduction?.id, 'الخصم')
    expect('الخصم معتمد', () => assert.equal(state.status, 'APPROVED'))
  }
  if (bonus.status === 201) {
    const state = await approveAll('bonuses', bonus.body.id ?? bonus.body.bonus?.id, 'المكافأة')
    expect('المكافأة معتمدة', () => assert.equal(state.status, 'APPROVED'))
  }

  // (د) إيقاف عن العمل يغطي «النهارده» ودورة شهر التقرير كاملة ⇒ شاشة الموظفين تعرضه «موقوف»
  const suspension = await request(hrUser, 'POST', `/employees/${eSuspended.id}/suspensions`,
    { fromDate: SUSPENSION_FROM, toDate: CYCLE_TO, reason: 'تحقيق إداري — اختبار التقارير' })
  expect('تسجيل الإيقاف مقبول', () => assert.equal(suspension.status, 201, JSON.stringify(suspension.body)))

  // (هـ) سلفة 1500 على ٣ أقساط: واحد مسدّد قبل الشهرين، واحد مستحق داخل شهر التقرير، وواحد بعده
  loanMain = await repo('Loan').save({ employeeId: eTransfer.id, amount: 1500, status: 'DISBURSED', disbursedAt: '2026-07-25' })
  await repo('LoanInstallment').save([
    { loanId: loanMain.id, dueDate: '2026-08-10', amount: 500, paid: true, paidAmount: '500.00', financialStatus: 'PAID', financialRevision: 1 },
    { loanId: loanMain.id, dueDate: '2026-10-10', amount: 500, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 },
    { loanId: loanMain.id, dueDate: '2026-11-10', amount: 500, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 },
  ])

  // (و) إنهاء خدمة بآخر يوم عمل داخل الشهر ⇒ راتبه يتصرف مع التصفية
  const kase = await request(hrUser, 'POST', '/offboarding',
    { employeeId: eSettle.id, reason: 'resignation', lastWorkingDay: LWD, notes: 'اختبار التقارير' })
  expect('فتح ملف إنهاء الخدمة مقبول', () => assert.equal(kase.status, 201, JSON.stringify(kase.body)))
})

test('F2 — المسيرات: مسير الفرع أ (معتمد ومصروف)، مسير الفرع ب، مسير غير معتمد، ومسير الشهر السابق', async () => {
  scene('F2 تجهيز المسيرات')
  // الشهر السابق (للفروق): موظفان
  runPrev = await draft(boss, 'مسير التقارير — سبتمبر', { employeeIds: [eTransfer.id, eCash.id, eOt.id] }, PREV_PERIOD)
  const prevCalc = await calcRun(boss, runPrev.id)
  runItems.set(runPrev.id, prevCalc.items ?? [])
  expect('مسير سبتمبر بنطاق 08-23 → 09-22', () => assert.deepEqual([runPrev.startDate, runPrev.endDate], [PREV_FROM, PREV_TO]))
  expectStatus(await approveRun(payUser, runPrev.id), 201, 'approve prev:')
  expectStatus(await request(payUser, 'POST', `/payroll/runs/${runPrev.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-RP-09' }), 201, 'pay prev:')

  // شهر التقرير: كل موظفي الفرع أ اللي في المسير
  runMain = await draft(boss, 'مسير التقارير — أكتوبر', { employeeIds: [eTransfer.id, eCash.id, eMixed.id, eLate.id, eSettle.id, eOt.id] })
  const mainCalc = await calcRun(boss, runMain.id)
  runItems.set(runMain.id, mainCalc.items ?? [])
  expect('نطاق المسير = دورة 23→22', () => assert.deepEqual([runMain.period, runMain.startDate, runMain.endDate], [PERIOD, CYCLE_FROM, CYCLE_TO]))
  expect('المسير فيه ٦ بنود', () => assert.equal((mainCalc.items ?? []).length, 6, JSON.stringify((mainCalc.items ?? []).map(i => i.employeeId))))

  // أرقام أساسية محسوبة باليد
  const t = itemOf(runMain.id, eTransfer.id)
  expect('الموظف النظيف: 6000 + 1800 والصافي 7800 ناقص قسط السلفة', () => assert.deepEqual(
    [Number(t?.basicSalary), Number(t?.allowances)], [6000, 1800]))
  const settle = itemOf(runMain.id, eSettle.id)
  expect('التصفية: تغطية 20 يومًا ⇒ 7800 × 20 ÷ 30 = 5200.00', () => assert.equal(Number(settle?.netPay), money(GROSS * 20 / 30)))
  const late = itemOf(runMain.id, eLate.id)
  expect('التأخير ٣٠ دقيقة مقصوص', () => assert.equal(Number(late?.latenessDeduction), money(30 * MINUTE_RATE)))
  expect('إجازة بلا أجر يوم = سعر اليوم 260', () => assert.equal(Number(late?.unpaidLeaveDeduction), money(DAY_RATE)))
  expect('الغياب بصف صريح يوم واحد = سعر اليوم 260', () => assert.deepEqual(
    [Number(late?.absenceDays), Number(late?.absenceDeduction)], [1, money(DAY_RATE)]))
  expect('الخصم 300 والمكافأة 500 في بند الموظف', () => assert.deepEqual(
    [Number(late?.otherDeductions), Number(late?.otherAdditions)], [300, 500]))
  const otItem = itemOf(runPrev.id, eOt.id)
  expect('الإضافي في مسير الشهر السابق = ساعاته × سعر الساعة × ١.٥', () => assert.equal(
    Number(otItem?.overtimeAmount), money(Number(otItem?.overtimeHours) * HOUR_RATE * 1.5),
    `ot=${otItem?.overtimeAmount} hours=${otItem?.overtimeHours}`))
  expect('بدل دوام العطلة = ٤ ساعات × سعر الساعة × مضاعف العطلة', () => assert.equal(
    Number(otItem?.otherAdditions), money(4 * HOUR_RATE * 1.5), `holiday=${otItem?.otherAdditions}`))
  expect('إجمالي المسير = مجموع بنوده', () => assert.equal(
    C(mainCalc.totalNet), sumC((mainCalc.items ?? []).map(i => i.netPay))))
  expectStatus(await approveRun(payUser, runMain.id), 201, 'approve main:')
  expectStatus(await request(payUser, 'POST', `/payroll/runs/${runMain.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-RP-10' }), 201, 'pay main:')

  // مسير الفرع ب (معتمد بلا صرف)
  runOther = await draft(boss, 'مسير التقارير — فرع ب', { employeeIds: [eOther.id] })
  const otherCalc = await calcRun(boss, runOther.id)
  runItems.set(runOther.id, otherCalc.items ?? [])
  expectStatus(await approveRun(payUser, runOther.id), 201, 'approve other:')

  // مسير محسوب غير معتمد (للتحقق من includeDraft)
  runDraft = await draft(boss, 'مسير التقارير — مسودة', { employeeIds: [eDraft.id] })
  const draftCalc = await calcRun(boss, runDraft.id)
  runItems.set(runDraft.id, draftCalc.items ?? [])
  expect('المسير غير المعتمد حالته CALCULATED', () => assert.equal(draftCalc.status, 'CALCULATED', String(draftCalc.status)))
})

// ============================================================================
// 1) تعداد سطح التقارير — كل نقطة نهاية تُنادى مرة عشان التغطية تبان
// ============================================================================

test('RS0 — سطح التقارير: كل نقطة نهاية موجودة وتستجيب لمن يملك صلاحيتها', async () => {
  scene('RS0 سطح التقارير')
  const surface = [
    ['GET /reports/headcount', () => get(boss, '/reports/headcount')],
    ['GET /reports/attendance', () => get(boss, '/reports/attendance', { month: PERIOD })],
    ['GET /reports/leaves', () => get(boss, '/reports/leaves', { year: YEAR })],
    ['GET /reports/payroll', () => get(boss, '/reports/payroll')],
    ['GET /reports/payroll/unassigned', () => get(boss, '/reports/payroll/unassigned', { period: PERIOD })],
    ['GET /reports/payroll/overtime', () => get(boss, '/reports/payroll/overtime', { period: PERIOD })],
    ['GET /reports/payroll/loans', () => get(boss, '/reports/payroll/loans', { period: PERIOD })],
    ['GET /reports/payroll/variance', () => get(boss, '/reports/payroll/variance', { period: PERIOD, comparePeriod: PREV_PERIOD })],
    ['GET /reports/overtime', () => get(boss, '/reports/overtime', { month: PERIOD })],
    ['GET /reports/requests', () => get(boss, '/reports/requests')],
    ['GET /reports/cost-centers', () => get(boss, '/reports/cost-centers', { period: PERIOD })],
    ['GET /reports/financial/payroll-register', () => get(boss, '/reports/financial/payroll-register', { period: PERIOD })],
    ['GET /reports/financial/payroll-cost', () => get(boss, '/reports/financial/payroll-cost', { period: PERIOD })],
    ['GET /reports/financial/deductions', () => get(boss, '/reports/financial/deductions', { period: PERIOD })],
    ['GET /reports/financial/loans', () => get(boss, '/reports/financial/loans', { period: PERIOD })],
    ['GET /reports/financial/overtime', () => get(boss, '/reports/financial/overtime', { period: PERIOD })],
    ['GET /payroll/runs/:id/bank-sheet', () => get(boss, `/payroll/runs/${runMain.id}/bank-sheet`)],
    ['GET /payroll/runs/:id/pay-methods', () => get(boss, `/payroll/runs/${runMain.id}/pay-methods`)],
    ['GET /payroll/unassigned-report', () => get(boss, '/payroll/unassigned-report', { period: PERIOD })],
    ['GET /social-insurance/report', () => get(boss, '/social-insurance/report', { period: PERIOD })],
    ['GET /attendance/payroll-month', () => get(boss, '/attendance/payroll-month', { period: PERIOD })],
    ['GET /attendance/monthly', () => get(boss, '/attendance/monthly', { employeeId: String(eLate.id), month: PERIOD })],
  ]
  for (const [name, call] of surface) {
    const response = await call()
    if (response.status === 200) notCovered(name, 'نُوديت وترجع 200 — الأرقام تُفحص في سيناريو خاص')
    else notCovered(name, `ترجع ${response.status}`)
    expect(`${name} يستجيب 200`, () => assert.equal(response.status, 200, JSON.stringify(response.body)))
  }
  // نقاط تصدير (CSV/Excel/PDF) على الخادم: لو مش موجودة تبقى ملاحظة
  for (const suffix of ['.csv', '/export', '/csv', '/excel', '/pdf']) {
    const response = await get(boss, `/reports/financial/payroll-register${suffix}`, { period: PERIOD })
    notCovered(`GET /reports/financial/payroll-register${suffix}`, `ترجع ${response.status} — لا نقطة تصدير على الخادم`)
    expect(`لا نقطة تصدير ${suffix} (التصدير من المتصفح)`, () => assert.equal(response.status, 404, String(response.status)))
  }
})

// ============================================================================
// 2) التعداد والحضور والإجازات والطلبات
// ============================================================================

test('RS1 — التعداد: بالفرع والقسم والحالة يطابق جدول الموظفين', async () => {
  scene('RS1 التعداد')
  const report = await ok(boss, '/reports/headcount')
  covered('GET /reports/headcount', 'الأرقام مقارنة بجدول الموظفين')
  const employees = await repo('Employee').find()
  // إصلاح 21 سبتمبر: التعداد بقى بيقرا الحالة زي شاشة الموظفين (الإيقاف محسوب من فتراته، مش من
  // العمود المخزَّن)، فالمتوقع هنا بيتبني بنفس القاعدة بالظبط — نفس الدالة اللي المنتج بيستعملها.
  const { displayEmployeeStatus } = require('../src/employees/employee-suspension-rules')
  const todayYmd = new Date().toISOString().slice(0, 10)
  const openSuspensions = new Map()
  for (const row of await repo('EmployeeSuspension').find()) {
    if (String(row.status) === 'CANCELLED') continue
    const list = openSuspensions.get(row.employeeId) ?? []
    list.push({ fromDate: String(row.fromDate).slice(0, 10), toDate: String(row.toDate).slice(0, 10), status: row.status })
    openSuspensions.set(row.employeeId, list)
  }
  const shownStatus = e => displayEmployeeStatus(e.status, openSuspensions.get(e.id) ?? [], todayYmd)
  const activeOf = branchId => employees.filter(e => e.branchId === branchId && shownStatus(e) === 'active').length
  const totalOf = branchId => employees.filter(e => e.branchId === branchId).length
  const byBranch = new Map(report.byBranch.map(row => [row.branchName, row]))
  for (const branch of [branchA, branchB]) {
    const row = byBranch.get(branch.name)
    expect(`تعداد ${branch.name} = الصفوف الفعلية`, () => assert.deepEqual(
      [Number(row?.total), Number(row?.active)], [totalOf(branch.id), activeOf(branch.id)]))
  }
  const byStatus = new Map(report.byStatus.map(row => [row.status, Number(row.total)]))
  const statuses = new Map()
  for (const e of employees) { const st = shownStatus(e); statuses.set(st, (statuses.get(st) ?? 0) + 1) }
  expect('التوزيع بالحالة يطابق الجدول', () => assert.deepEqual([...byStatus.entries()].sort(), [...statuses.entries()].sort()))
  expect('مجموع الفروع = مجموع الحالات = كل الموظفين', () => assert.deepEqual(
    [report.byBranch.reduce((s, r) => s + Number(r.total), 0), report.byStatus.reduce((s, r) => s + Number(r.total), 0)],
    [employees.length, employees.length]))
  // شاشة الموظفين بتعرض حالة «موقوف» للموظف اللي النهارده جوه فترة إيقاف (displayEmployeeStatus)،
  // والتعداد بيجمع على عمود employees.status المحفوظ — فلازم الرقمان يتفقوا.
  const list = await ok(hrUser, '/employees', { search: eSuspended.code })
  const listed = (list.items ?? list).find(row => Number(row.id) === eSuspended.id)
  expect('حالة الموقوف في التعداد = حالته على شاشة الموظفين', () => assert.equal(
    (byStatus.get('suspended') ?? 0) >= 1, listed?.status === 'suspended',
    `شاشة الموظفين=${listed?.status} وتعداد «موقوف» في التقرير=${byStatus.get('suspended') ?? 0}`))
  const byDept = new Map(report.byDepartment.map(row => [row.departmentName, Number(row.total)]))
  expect('قسم المبيعات (فرع ب) بعدده', () => assert.equal(byDept.get(deptSales.name), employees.filter(e => e.departmentId === deptSales.id).length))

  // نطاق الفرع: مدير فرع أ لا يرى فرع ب في أي سطر
  const scoped = await ok(branchAUser, '/reports/headcount')
  expect('مدير الفرع يرى فرعه فقط في التعداد', () => assert.deepEqual(scoped.byBranch.map(r => r.branchName), [branchA.name]))
  expect('ولا يرى قسم الفرع الآخر', () => assert.equal(scoped.byDepartment.some(r => r.departmentName === deptSales.name), false))
  expect('مجموع تعداد الفرع = موظفي الفرع', () => assert.equal(
    scoped.byBranch.reduce((s, r) => s + Number(r.total), 0), totalOf(branchA.id)))
})

test('RS2 — الحضور: الأيام والدقائق = صفوف الحضور، والشهر = نطاق الأيام نفسه', async () => {
  scene('RS2 تقرير الحضور')
  const monthReport = await ok(boss, '/reports/attendance', { month: PERIOD })
  covered('GET /reports/attendance', 'الأيام والدقائق مقارنة بـattendance_days، والشهر مقابل النطاق')
  const rangeReport = await ok(boss, '/reports/attendance', { from: '2026-10-01', to: '2026-10-31' })
  expect('نفس الفترة بالشهر وبالنطاق ترجع نفس الأرقام', () => assert.deepEqual(monthReport, rangeReport))

  // النطاق بدورة المسير (23 → 22) مقابل الصفوف الفعلية
  const cycleReport = await ok(boss, '/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })
  const days = await ds.query(
    `SELECT [employeeId], [status], COUNT(*) AS [n], SUM([lateMinutes]) AS [late], SUM([workMinutes]) AS [work]
     FROM [attendance_days] WHERE [date] BETWEEN '${CYCLE_FROM}' AND '${CYCLE_TO}' GROUP BY [employeeId], [status]`)
  const expected = new Map()
  for (const row of days) {
    const acc = expected.get(Number(row.employeeId)) ?? { present: 0, late: 0, absent: 0, lateMinutes: 0, workMinutes: 0 }
    if (row.status === 'present') acc.present += Number(row.n)
    if (row.status === 'late') acc.late += Number(row.n)
    if (row.status === 'absent') acc.absent += Number(row.n)
    acc.lateMinutes += Number(row.late ?? 0); acc.workMinutes += Number(row.work ?? 0)
    expected.set(Number(row.employeeId), acc)
  }
  for (const s of [eTransfer, eLate, eOt]) {
    const row = cycleReport.find(r => Number(r.employeeId) === s.id)
    const want = expected.get(s.id)
    expect(`أيام ${s.name} في التقرير = صفوفه`, () => assert.deepEqual(
      [Number(row?.presentDays), Number(row?.lateDays), Number(row?.totalLateMinutes), Number(row?.totalWorkMinutes)],
      [want.present, want.late, want.lateMinutes, want.workMinutes]))
  }
  const lateRow = cycleReport.find(r => Number(r.employeeId) === eLate.id)
  expect('يوم التأخير الوحيد ظاهر بـ٣٠ دقيقة', () => assert.deepEqual(
    [Number(lateRow?.lateDays), Number(lateRow?.totalLateMinutes)], [1, 30]))
  // يوم الغياب في هذه التجربة بلا صف حضور أصلًا (زي ما بيحصل لما البصمة مش موجودة).
  // المسير خصم عليه غيابًا، فتقرير الحضور المفروض يوريه — لو صفر يبقى التقرير والمسير مش متفقين.
  const cycleRows = await ds.query(
    `SELECT COUNT(*) AS [n] FROM [attendance_days] WHERE [employeeId] = ${eLate.id} AND [date] BETWEEN '${CYCLE_FROM}' AND '${CYCLE_TO}'`)
  const counted = ['presentDays', 'lateDays', 'absentDays', 'earlyLeaveDays', 'leaveDays', 'holidayDays', 'partialLeaveDays']
    .reduce((sum, key) => sum + Number(lateRow?.[key] ?? 0), 0)
  expect('كل صف حضور داخل الدورة مصنّف في عمود (لا صف يسقط من التقرير)', () => assert.equal(counted, Number(cycleRows[0].n)))
  expect('يوم الغياب المخصوم في المسير ظاهر في عمود الغياب بالتقرير', () => assert.equal(
    Number(lateRow?.absentDays), 1,
    `المسير خصم غيابًا (${itemOf(runMain.id, eLate.id)?.absenceDeduction}) ⇒ عمود «الغياب» في تقرير الحضور = ${lateRow?.absentDays}`))
  const noRow = await ds.query(
    `SELECT COUNT(*) AS [n] FROM [attendance_days] WHERE [employeeId] = ${eLate.id} AND [date] = '${ABSENT_DAY}'`)
  expect('يوم بلا صف حضور أصلًا ليس في الجدول فلا يظهر في أي عمود', () => assert.equal(Number(noRow[0].n), 0))

  // نطاق الفرع
  const scoped = await ok(branchAUser, '/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })
  expect('مدير فرع أ لا يرى موظف فرع ب في الحضور', () => assert.equal(scoped.some(r => Number(r.employeeId) === eOther.id), false))
  const scopedB = await ok(branchBUser, '/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })
  expect('مدير فرع ب يرى موظفه فقط', () => assert.deepEqual([...new Set(scopedB.map(r => Number(r.employeeId)))], [eOther.id]))

  // فلاتر مرفوضة/مُتجاهَلة
  const half = await get(boss, '/reports/attendance', { from: CYCLE_FROM })
  expect('«من» بلا «إلى» مرفوض 400', () => assert.equal(half.status, 400, JSON.stringify(half.body)))
  const withBranch = await get(boss, '/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO, branchId: String(branchB.id) })
  expect('فلتر الفرع على تقرير الحضور: إما يُطبَّق وإما يُرفض — لا يُقبل ويُتجاهل', () => {
    if (withBranch.status !== 200) return
    const ids = new Set(withBranch.body.map(r => Number(r.employeeId)))
    assert.equal(ids.has(eTransfer.id), false,
      'branchId اتقبل (200) ورجع موظفي فرع تاني ⇒ الفلتر متجاهل بصمت')
  })
})

test('RS3 — الإجازات: الاستهلاك بالنوع = صفوف الإجازات المعتمدة، والأرصدة بنطاق الفرع', async () => {
  scene('RS3 تقرير الإجازات')
  const report = await ok(boss, '/reports/leaves', { year: YEAR })
  covered('GET /reports/leaves', 'الاستهلاك بالنوع والأرصدة مقارنة بجدولي leaves و leave_balances')
  const rows = await ds.query(`SELECT [leaveTypeCode], COUNT(*) AS [requests], SUM([days]) AS [days] FROM [leaves]
    WHERE [status] = 'APPROVED' AND [fromDate] >= '${YEAR}-01-01' AND [fromDate] <= '${YEAR}-12-31' GROUP BY [leaveTypeCode]`)
  const want = new Map(rows.map(r => [r.leaveTypeCode, { requests: Number(r.requests), days: Number(r.days) }]))
  const got = new Map(report.byType.map(r => [r.leaveTypeCode, { requests: Number(r.requests), days: Number(r.totalDays) }]))
  expect('الاستهلاك بالنوع = الصفوف المعتمدة للسنة', () => assert.deepEqual([...got.entries()].sort(), [...want.entries()].sort()))
  expect('إجازة «بدون راتب» يوم واحد ظاهرة', () => assert.deepEqual(
    [got.get('UNPAID')?.requests, got.get('UNPAID')?.days], [1, 1]))
  const balances = await repo('LeaveBalance').find({ where: { period: YEAR } })
  expect('عدد صفوف الأرصدة = الجدول', () => assert.equal(report.balances.length, balances.length))
  const scoped = await ok(branchAUser, '/reports/leaves', { year: YEAR })
  const branchBEmployees = new Set((await repo('Employee').find({ where: { branchId: branchB.id } })).map(e => e.id))
  expect('مدير الفرع لا يرى أرصدة فرع آخر', () => assert.equal(
    scoped.balances.some(r => branchBEmployees.has(Number(r.employeeId))), false))
  const badYear = await get(boss, '/reports/leaves', { year: '26' })
  expect('سنة غير صالحة مرفوضة 400', () => assert.equal(badYear.status, 400))
})

test('RS4 — حركة الطلبات: العدد بالفئة والحالة = جدول الطلبات', async () => {
  scene('RS4 تقرير الطلبات')
  const report = await ok(boss, '/reports/requests')
  covered('GET /reports/requests', 'العدد بالفئة والحالة مقارنة بجدول requests')
  const rows = await ds.query(`SELECT t.[category], r.[status], COUNT(*) AS [n] FROM [requests] r
    JOIN [request_types] t ON t.[code] = r.[typeCode] GROUP BY t.[category], r.[status]`)
  const key = row => `${row.category}|${row.status}`
  const want = new Map(rows.map(r => [key(r), Number(r.n)]))
  const got = new Map(report.byType.map(r => [key(r), Number(r.total)]))
  expect('العدد بالفئة والحالة يطابق الجدول', () => assert.deepEqual([...got.entries()].sort(), [...want.entries()].sort()))
  const requestCount = await repo('Request').count()
  expect('مجموع التقرير = عدد الطلبات كلها', () => assert.equal(
    report.byType.reduce((s, r) => s + Number(r.total), 0), requestCount))
})

// ============================================================================
// 3) ملخص المسيرات وكشف البنك
// ============================================================================

test('RS5 — ملخص المسيرات: إجمالي كل مسير = مجموع بنوده، وطرق الصرف = إجمالي الفترة', async () => {
  scene('RS5 ملخص المسيرات')
  // إصلاح 21 سبتمبر: المجاميع بقت للمعتمد والمصروف وحدهم افتراضيًا (زي كشف الرواتب المالي)،
  // وincludeDraft بيضم المحسوب اللي لسه ما اتعتمدش. السيناريو ده بيقارن بكل البنود فبيطلبه صراحةً.
  const report = await ok(boss, '/reports/payroll', { includeDraft: 'true' })
  covered('GET /reports/payroll', 'إجمالي كل مسير وطرق الصرف والخصومات مقارنة ببنود المسيرات')
  const byId = new Map(report.runs.map(run => [run.id, run]))
  for (const [runId, items] of runItems) {
    const run = byId.get(runId)
    expect(`المسير #${runId} في التقرير`, () => assert.ok(run, JSON.stringify([...byId.keys()])))
    if (!run) continue
    expect(`إجمالي المسير #${runId} = مجموع بنوده`, () => assert.equal(C(run.totalNet), sumC(items.map(i => i.netPay))))
    expect(`عدد موظفي المسير #${runId}`, () => assert.equal(run.employees, items.length))
    expect(`الإجمالي المحفوظ = المحسوب للمسير #${runId}`, () => assert.equal(C(run.storedTotalNet), sumC(items.map(i => i.netPay))))
  }
  // طرق الصرف: مجموعها = مجموع كل بنود المسيرات غير الملغاة
  const everyItem = [...runItems.values()].flat()
  expect('مجموع طرق الصرف = مجموع كل البنود', () => assert.equal(
    sumC(report.byMethod.map(r => r.total)), sumC(everyItem.map(i => i.netPay))))
  expect('عدد بنود طرق الصرف = عدد البنود', () => assert.equal(
    report.byMethod.reduce((s, r) => s + r.count, 0), everyItem.length))
  const methods = new Map(report.byMethod.map(r => [r.payMethod, r]))
  expect('طرق الصرف تذكر النقدي والمختلط والتحويل', () => assert.deepEqual(
    ['cash', 'mixed', 'transfer'].filter(m => !methods.has(m)), []))
  // كتلة الخصومات لكل فترة
  const october = report.deductions.find(r => r.period === PERIOD)
  const octoberItems = allItems(runMain.id, runOther.id, runDraft.id)
  expect('مجاميع أكتوبر: الأساسي والبدلات والإضافي والخصومات والصافي', () => assert.deepEqual(
    [october?.basic, october?.allowances, october?.overtime, october?.otherAdditions, october?.lateness,
      october?.absence, october?.unpaidLeave, october?.loans, october?.otherDeductions, october?.net],
    [cM(sumC(octoberItems.map(i => i.basicSalary))), cM(sumC(octoberItems.map(i => i.allowances))),
      cM(sumC(octoberItems.map(i => i.overtimeAmount))), cM(sumC(octoberItems.map(i => i.otherAdditions))),
      cM(sumC(octoberItems.map(i => i.latenessDeduction))), cM(sumC(octoberItems.map(i => i.absenceDeduction))),
      cM(sumC(octoberItems.map(i => i.unpaidLeaveDeduction))), cM(sumC(octoberItems.map(i => i.loanInstallments))),
      cM(sumC(octoberItems.map(i => i.otherDeductions))), cM(sumC(octoberItems.map(i => i.netPay)))]))
  expect('كل مبلغ في التقرير بمنزلتين بالضبط', () => assert.deepEqual(
    report.deductions.flatMap(r => [r.basic, r.net, r.lateness]).filter(v => !/^-?\d+\.\d{2}$/.test(String(v))), []))
  // الجوهر بعد إصلاح 21 سبتمبر: الملخص بلا includeDraft لازم يطابق كشف الرواتب لنفس الشهر بالمليم
  const registerNow = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  const defaultReport = await ok(boss, '/reports/payroll')
  const octoberDefault = defaultReport.deductions.find(r => r.period === PERIOD)
  expect('صافي الشهر في ملخص المسيرات = صافي كشف الرواتب لنفس الشهر', () => assert.equal(
    C(octoberDefault?.net), C(registerNow.totals.net),
    `الملخص=${octoberDefault?.net} الكشف=${registerNow.totals.net} — المسير غير المعتمد #${runDraft.id} `
    + `(${cM(sumC((runItems.get(runDraft.id) ?? []).map(i => i.netPay)))}) لازم يكون بره الاتنين`))
  expect('وبـincludeDraft الملخص بيزيد بالمسير غير المعتمد بالظبط', () => assert.equal(
    C(october?.net) - C(octoberDefault?.net), sumC((runItems.get(runDraft.id) ?? []).map(i => i.netPay))))

  // مسير ملغى يظهر في القائمة ولا يدخل المجاميع
  const cancel = await request(admin, 'POST', `/payroll/runs/${runDraft.id}/cancel`, { reason: 'إلغاء للتحقق من التقارير' })
  if (cancel.status === 201 || cancel.status === 200) {
    const afterCancel = await ok(boss, '/reports/payroll')
    const cancelled = afterCancel.runs.find(r => r.id === runDraft.id)
    expect('المسير الملغى ما زال معروضًا بحالته', () => assert.equal(cancelled?.status, 'CANCELLED', JSON.stringify(cancelled)))
    expect('المسير الملغى خارج مجاميع طرق الصرف', () => assert.equal(
      sumC(afterCancel.byMethod.map(r => r.total)), sumC(allItems(runMain.id, runOther.id, runPrev.id).map(i => i.netPay))))
    // نرجّعه محسوبًا عشان باقي السيناريوهات تلاقي «مسير غير معتمد»
    const reopened = await request(boss, 'POST', `/payroll/runs/${runDraft.id}/calculate`, {})
    if (reopened.status !== 201) {
      runDraft = await draft(boss, 'مسير التقارير — مسودة ٢', { employeeIds: [eDraft.id] })
      const again = await calcRun(boss, runDraft.id)
      runItems.set(runDraft.id, again.items ?? [])
    }
  } else {
    soft.push({ scenario: currentScenario, label: 'إلغاء مسير للتحقق', message: `status=${cancel.status} ${JSON.stringify(cancel.body)}` })
  }

  // نطاق الفرع: مدير فرع ب لا يرى إجمالي فرع أ
  const scopedB = await ok(branchBUser, '/reports/payroll')
  const mainInB = scopedB.runs.find(r => r.id === runMain.id)
  expect('مدير فرع ب لا يرى مسير فرع أ (أو يراه بصفر موظفين)', () => assert.ok(
    !mainInB || (mainInB.employees === 0 && C(mainInB.totalNet) === 0), JSON.stringify(mainInB)))
  expect('مدير الفرع لا يرى الإجمالي المحفوظ للشركة', () => assert.deepEqual(
    scopedB.runs.map(r => r.storedTotalNet).filter(v => v !== null), []))
  const otherInB = scopedB.runs.find(r => r.id === runOther.id)
  expect('مدير فرع ب يرى مسير فرعه بإجماليه', () => assert.equal(C(otherInB?.totalNet), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
  expect('مجموع طرق صرف فرع ب = مسير فرعه وحده', () => assert.equal(
    sumC(scopedB.byMethod.map(r => r.total)), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
})

test('RS6 — كشف البنك: السطور = بنود المسير، وبنك + نقدي = إجمالي المسير، والتصفية مستبعدة', async () => {
  scene('RS6 كشف البنك')
  const sheet = await ok(boss, `/payroll/runs/${runMain.id}/bank-sheet`)
  covered('GET /payroll/runs/:id/bank-sheet', 'السطور والمجاميع وتقسيم نقدي/بنك مقارنة ببنود المسير')
  const items = runItems.get(runMain.id) ?? []
  const settlementItem = itemOf(runMain.id, eSettle.id)
  expect('صف التصفية خارج الكشف', () => assert.equal(sheet.rows.some(r => r.employeeId === eSettle.id), false))
  expect('ومذكور في «مصروف مع التصفية» بنفس الرقم', () => assert.deepEqual(
    [sheet.settlement.employees, C(sheet.settlement.total)], [1, C(settlementItem?.netPay)]))
  expect('عدد سطور الكشف = بنود المسير ناقص التصفية', () => assert.equal(sheet.rows.length, items.length - 1))
  for (const row of sheet.rows) {
    const item = items.find(i => i.employeeId === row.employeeId)
    expect(`سطر #${row.employeeId}: بنك + نقدي = صافي بنده`, () => assert.equal(
      C(row.bankAmount) + C(row.cashAmount), C(item?.netPay)))
  }
  expect('مجاميع الكشف = مجموع السطور', () => assert.deepEqual(
    [C(sheet.totals.bank), C(sheet.totals.cash), C(sheet.totals.net), sheet.totals.employees],
    [sumC(sheet.rows.map(r => r.bankAmount)), sumC(sheet.rows.map(r => r.cashAmount)),
      sumC(sheet.rows.map(r => r.netPay)), sheet.rows.length]))
  expect('بنك + نقدي = إجمالي المسير ناقص التصفية', () => assert.equal(
    C(sheet.totals.bank) + C(sheet.totals.cash), sumC(items.map(i => i.netPay)) - C(settlementItem?.netPay)))
  const cashRow = sheet.rows.find(r => r.employeeId === eCash.id)
  const mixedRow = sheet.rows.find(r => r.employeeId === eMixed.id)
  expect('النقدي كله نقدي', () => assert.deepEqual([C(cashRow?.bankAmount), C(cashRow?.cashAmount)], [0, C(itemOf(runMain.id, eCash.id)?.netPay)]))
  expect('«نقدي + بنك»: 5000 بنك والباقي نقدي', () => assert.deepEqual(
    [C(mixedRow?.bankAmount), C(mixedRow?.cashAmount)], [500000, C(itemOf(runMain.id, eMixed.id)?.netPay) - 500000]))
  expect('طرق الصرف بمسمياتها العربية', () => assert.deepEqual(
    [cashRow?.payMethodLabel, mixedRow?.payMethodLabel], ['نقدي', 'نقدي + بنك']))
  expect('مجموع البنوك = مبلغ البنك في المجاميع', () => assert.equal(
    sumC(sheet.banks.map(b => b.total)), C(sheet.totals.bank)))
  // مدير فرع ب لا يفتح كشف مسير فرع أ ولا يرى أرقامه
  const foreign = await get(branchBUser, `/payroll/runs/${runMain.id}/bank-sheet`)
  expect('مدير فرع ب لا يتسرب له كشف بنك فرع أ', () => assert.ok(
    foreign.status === 403 || foreign.status === 404 || (foreign.status === 200 && foreign.body.rows.length === 0 && C(foreign.body.totals.net) === 0),
    `status=${foreign.status} ${JSON.stringify(foreign.body?.totals)}`))
  const plain = await get(eCash.user, `/payroll/runs/${runMain.id}/bank-sheet`)
  expect('الموظف العادي ممنوع من كشف البنك', () => assert.equal(plain.status, 403, String(plain.status)))
})

// ============================================================================
// 4) التقارير المالية لشهر الرواتب
// ============================================================================

test('RS7 — كشف الرواتب المالي: كل سطر = بنده، والمجاميع = مجموع السطور', async () => {
  scene('RS7 كشف الرواتب المالي')
  const report = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  covered('GET /reports/financial/payroll-register', 'كل سطر وكل مجموع مقارنة ببنود المسيرات المعتمدة')
  expect('الفترة بحدود دورة المسير', () => assert.deepEqual([report.period, report.startDate, report.endDate], [PERIOD, CYCLE_FROM, CYCLE_TO]))
  const included = allItems(runMain.id, runOther.id)   // المعتمد والمصروف فقط
  expect('عدد السطور = بنود المسيرات المعتمدة (المسودة مستبعدة)', () => assert.equal(report.rows.length, included.length))
  expect('المسير غير المعتمد مذكور في «قيد الانتظار»', () => assert.ok(
    (report.pendingRuns ?? []).some(r => r.id === runDraft.id), JSON.stringify(report.pendingRuns)))
  expect('صف المسير غير المعتمد ليس في السطور', () => assert.equal(report.rows.some(r => r.runId === runDraft.id), false))

  for (const row of report.rows) {
    const item = included.find(i => i.employeeId === row.employeeId && i.runId === row.runId)
      ?? included.find(i => i.employeeId === row.employeeId)
    if (!item) { soft.push({ scenario: currentScenario, label: `سطر بلا بند مقابل #${row.employeeId}`, message: JSON.stringify(row) }); continue }
    expect(`سطر ${row.employeeCode}: الأعمدة = البند`, () => assert.deepEqual(
      [row.basic, row.allowances, row.overtime, row.net], [M(item.basicSalary), M(item.allowances), M(item.overtimeAmount), M(item.netPay)]))
    expect(`سطر ${row.employeeCode}: الإجمالي = أساسي + بدلات + إضافي + إضافات`, () => assert.equal(
      C(row.gross), C(item.basicSalary) + C(item.allowances) + C(item.overtimeAmount) + C(item.otherAdditions)))
    expect(`سطر ${row.employeeCode}: مجموع أنواع الخصم = إجمالي الخصم`, () => assert.equal(
      sumC(Object.values(row.deductions)), C(row.totalDeductions)))
    expect(`سطر ${row.employeeCode}: الصافي = الإجمالي − الخصومات`, () => assert.equal(
      C(row.net), C(row.gross) - C(row.totalDeductions)))
    // قرار 2026-09-22: صف «مصروف مع التصفية» برّه البنك والنقدي زي كشف البنك بالظبط، فالصافي = بنك + نقدي + مع التصفية
    expect(`سطر ${row.employeeCode}: بنك + نقدي + مع التصفية = الصافي`, () => assert.equal(C(row.bank) + C(row.cash) + C(row.settlement), C(row.net)))
    expect(`سطر ${row.employeeCode}: مجموع البدلات المفصلة = عمود البدلات`, () => assert.equal(
      sumC(Object.values(row.allowanceBuckets)), C(row.allowances)))
    expect(`سطر ${row.employeeCode}: مجموع الإضافات المفصلة = عمود الإضافات`, () => assert.equal(
      sumC(Object.values(row.additions)) + C(row.holidayWork), C(item.otherAdditions)))
    expect(`سطر ${row.employeeCode}: كل مبلغ بمنزلتين`, () => assert.deepEqual(
      [row.basic, row.allowances, row.gross, row.net, row.totalDeductions, row.bank, row.cash]
        .filter(v => !/^-?\d+\.\d{2}$/.test(String(v))), []))
  }
  // المجاميع
  expect('مجاميع الكشف = مجموع سطوره', () => assert.deepEqual(
    [C(report.totals.basic), C(report.totals.allowances), C(report.totals.overtime), C(report.totals.gross),
      C(report.totals.totalDeductions), C(report.totals.net), C(report.totals.bank), C(report.totals.cash), report.totals.items],
    [sumC(report.rows.map(r => r.basic)), sumC(report.rows.map(r => r.allowances)), sumC(report.rows.map(r => r.overtime)),
      sumC(report.rows.map(r => r.gross)), sumC(report.rows.map(r => r.totalDeductions)), sumC(report.rows.map(r => r.net)),
      sumC(report.rows.map(r => r.bank)), sumC(report.rows.map(r => r.cash)), report.rows.length]))
  expect('مجموع الصافي = مجموع بنود المسيرات المعتمدة', () => assert.equal(C(report.totals.net), sumC(included.map(i => i.netPay))))
  // قرار 2026-09-22: نفس القاعدة في المجاميع — التصفية برّه البنك والنقدي ومذكورة في عمودها
  expect('بنك + نقدي + مع التصفية = إجمالي الصافي', () => assert.equal(C(report.totals.bank) + C(report.totals.cash) + C(report.totals.settlement), C(report.totals.net)))
  expect('أعمدة الخصومات بعناوينها العربية', () => assert.deepEqual(
    ['التأخير', 'الغياب', 'إجازة بدون راتب', 'أقساط السلف', 'الخصومات والجزاءات']
      .filter(label => !report.columns.deductions.some(c => c.label === label)), []))
  expect('مجموع كل عمود خصم = مجموعه في السطور', () => assert.deepEqual(
    report.columns.deductions.filter(c => C(c.total) !== sumC(report.rows.map(r => r.deductions[c.key]))).map(c => c.key), []))

  // التصفية: البند موجود في الكشف المالي (مالي) لكن خارج كشف البنك (صرف) — الرقم نفسه
  const settleRow = report.rows.find(r => r.employeeId === eSettle.id)
  expect('بند التصفية داخل الكشف المالي برقمه', () => assert.equal(C(settleRow?.net), C(itemOf(runMain.id, eSettle.id)?.netPay)))

  // includeDraft يضيف المسير غير المعتمد
  const withDraft = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD, includeDraft: 'true' })
  expect('includeDraft=true يضيف بنود المسير غير المعتمد', () => assert.equal(
    C(withDraft.totals.net), sumC(allItems(runMain.id, runOther.id, runDraft.id).map(i => i.netPay))))
  const badDraft = await get(boss, '/reports/financial/payroll-register', { period: PERIOD, includeDraft: 'maybe' })
  expect('قيمة غير منطقية لـincludeDraft مرفوضة 400', () => assert.equal(badDraft.status, 400))
})

test('RS8 — ملخص تكلفة الرواتب: الفرع والقسم يجمعان لنفس الإجمالي', async () => {
  scene('RS8 ملخص تكلفة الرواتب')
  const cost = await ok(boss, '/reports/financial/payroll-cost', { period: PERIOD })
  covered('GET /reports/financial/payroll-cost', 'التجميع بالفرع والقسم مقابل كشف الرواتب')
  const register = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  expect('مجموع الفروع = الإجمالي', () => assert.deepEqual(
    [sumC(cost.byBranch.map(r => r.gross)), sumC(cost.byBranch.map(r => r.net)), sumC(cost.byBranch.map(r => r.deductions))],
    [C(cost.totals.gross), C(cost.totals.net), C(cost.totals.deductions)]))
  expect('مجموع الأقسام = الإجمالي', () => assert.deepEqual(
    [sumC(cost.byDepartment.map(r => r.gross)), sumC(cost.byDepartment.map(r => r.net))],
    [C(cost.totals.gross), C(cost.totals.net)]))
  expect('إجمالي الملخص = إجمالي الكشف', () => assert.deepEqual(
    [C(cost.totals.gross), C(cost.totals.net), C(cost.totals.deductions), cost.totals.headcount],
    [C(register.totals.gross), C(register.totals.net), C(register.totals.totalDeductions), register.totals.headcount]))
  const opsRow = cost.byDepartment.find(r => r.name === deptOps.name)
  const opsItems = (runItems.get(runMain.id) ?? [])
  expect('قسم العمليات = بنود موظفيه', () => assert.deepEqual(
    [C(opsRow?.net), opsRow?.headcount], [sumC(opsItems.map(i => i.netPay)), opsItems.length]))
  const salesRow = cost.byDepartment.find(r => r.name === deptSales.name)
  expect('قسم المبيعات = بند فرع ب', () => assert.equal(C(salesRow?.net), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
  expect('تكلفة الشركة = الإجمالي + حصة صاحب العمل (أو الإجمالي لو التأمينات لا تنطبق)', () => assert.equal(
    C(cost.totals.totalCost), C(cost.totals.gross) + C(cost.totals.employerInsurance ?? 0)))
})

test('RS9 — تقرير الخصومات: الأنواع والموظفون = أعمدة الكشف', async () => {
  scene('RS9 تقرير الخصومات')
  const report = await ok(boss, '/reports/financial/deductions', { period: PERIOD })
  covered('GET /reports/financial/deductions', 'الأنواع والموظفون مقابل أعمدة كشف الرواتب')
  const register = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  const registerKinds = new Map(register.columns.deductions.map(c => [c.key, C(c.total)]))
  expect('مجموع كل نوع خصم = نفس العمود في الكشف', () => assert.deepEqual(
    report.kinds.filter(k => C(k.amount) !== registerKinds.get(k.key)).map(k => [k.key, k.amount, cM(registerKinds.get(k.key) ?? 0)]), []))
  expect('مجموع الأنواع = إجمالي الخصومات', () => assert.equal(sumC(report.kinds.map(k => k.amount)), C(report.totals.amount)))
  expect('إجمالي الخصومات = إجمالي خصومات الكشف', () => assert.equal(C(report.totals.amount), C(register.totals.totalDeductions)))
  expect('مجموع الموظفين = الإجمالي', () => assert.equal(sumC(report.employees.map(e => e.total)), C(report.totals.amount)))
  for (const row of report.employees) {
    expect(`خصومات ${row.employeeCode}: مجموع الأنواع = إجماليه`, () => assert.equal(sumC(Object.values(row.amounts)), C(row.total)))
  }
  const lateRow = report.employees.find(e => e.employeeId === eLate.id)
  const lateItem = itemOf(runMain.id, eLate.id)
  expect('موظف الخصم: التأخير والغياب وبدون راتب والخصم المصنّف بأرقام بنده', () => assert.deepEqual(
    [lateRow?.amounts.LATENESS, lateRow?.amounts.ABSENCE, lateRow?.amounts.UNPAID_LEAVE, lateRow?.amounts.TYPED],
    [M(lateItem.latenessDeduction), M(lateItem.absenceDeduction), M(lateItem.unpaidLeaveDeduction), M(300)]))
  expect('الخصم المصنّف مفصّل باسم نوعه العربي', () => assert.deepEqual(
    report.typedByType.map(r => [r.name, r.amount, r.employees]), [['غرامة تأخير تسليم', '300.00', 1]]))
  const loanRow = report.employees.find(e => e.employeeId === eTransfer.id)
  expect('قسط السلفة في خصومات صاحب السلفة', () => assert.equal(
    loanRow?.amounts.LOANS, M(itemOf(runMain.id, eTransfer.id)?.loanInstallments)))
})

test('RS10 — تقرير الإضافي المالي: الدقائق والمبالغ = بنود المسير، وبدل العطلة في عموده', async () => {
  scene('RS10 تقرير الإضافي المالي')
  // الإضافي وبدل العطلة داخل دورة الشهر السابق (يوم ماضٍ ببصمات فعلية)
  const report = await ok(boss, '/reports/financial/overtime', { period: PREV_PERIOD })
  covered('GET /reports/financial/overtime', 'الدقائق والمبالغ وبدل العطلة مقابل بنود المسير')
  const item = itemOf(runPrev.id, eOt.id)
  const row = report.employees.find(e => e.employeeId === eOt.id)
  expect('مبلغ الإضافي = عمود الإضافي في البند', () => assert.equal(row?.amount, M(item.overtimeAmount)))
  expect('دقائق الإضافي = ساعات البند × 60', () => assert.equal(row?.minutes, Math.round(Number(item.overtimeHours) * 60)))
  expect('بدل دوام العطلة في عموده لا مع الإضافي', () => assert.equal(C(row?.holidayWork), C(item.otherAdditions)))
  expect('مجموع الأقسام = الإجمالي', () => assert.deepEqual(
    [sumC(report.departments.map(d => d.amount)), report.departments.reduce((s, d) => s + d.minutes, 0)],
    [C(report.totals.amount), report.totals.minutes]))
  expect('مجموع الموظفين = الإجمالي', () => assert.deepEqual(
    [sumC(report.employees.map(e => e.amount)), sumC(report.employees.map(e => e.holidayWork))],
    [C(report.totals.amount), C(report.totals.holidayWork)]))
  const register = await ok(boss, '/reports/financial/payroll-register', { period: PREV_PERIOD })
  expect('إجمالي الإضافي = عمود الإضافي في الكشف', () => assert.equal(C(report.totals.amount), C(register.totals.overtime)))
  expect('إجمالي بدل العطلة = عمود بدل العطلة في الكشف', () => assert.equal(C(report.totals.holidayWork), C(register.totals.holidayWork)))
})

test('RS11 — تقرير السلف المالي: الأصل والمسدد والقائم وأقساط الشهر والمخصوم في المسير', async () => {
  scene('RS11 تقرير السلف المالي')
  const report = await ok(boss, '/reports/financial/loans', { period: PERIOD })
  covered('GET /reports/financial/loans', 'الأصل والمسدد والقائم وأقساط الشهر مقابل جدولي loans و loan_installments')
  const row = report.employees.find(e => e.employeeId === eTransfer.id)
  const installments = await repo('LoanInstallment').find({ where: { loanId: loanMain.id } })
  const paid = sumC(installments.map(i => i.paidAmount))
  const outstanding = sumC(installments.filter(i => (i.financialStatus ?? (i.paid ? 'PAID' : 'DUE')) === 'DUE').map(i => i.amount))
  const inPeriod = installments.filter(i => String(i.dueDate).slice(0, 10) >= CYCLE_FROM && String(i.dueDate).slice(0, 10) <= CYCLE_TO)
  expect('الأصل 1500 والمسدد والقائم = صفوف الأقساط', () => assert.deepEqual(
    [C(row?.principal), C(row?.paid), C(row?.outstanding)], [150000, paid, outstanding]))
  expect('أقساط الشهر = الأقساط المستحقة داخل الدورة', () => assert.deepEqual(
    [row?.dueCount, C(row?.dueAmount)], [inPeriod.length, sumC(inPeriod.map(i => i.amount))]))
  expect('المتأخر = أقساط مستحقة قبل بداية الدورة ولم تُسدَّد', () => assert.equal(C(row?.overdue), 0))
  expect('المخصوم في مسير الشهر = عمود أقساط السلف في البند', () => assert.equal(
    C(row?.deductedInPayroll), C(itemOf(runMain.id, eTransfer.id)?.loanInstallments)))
  expect('مجاميع السلف = مجموع السطور', () => assert.deepEqual(
    [C(report.totals.principal), C(report.totals.outstanding), C(report.totals.deductedInPayroll), report.totals.employees],
    [sumC(report.employees.map(e => e.principal)), sumC(report.employees.map(e => e.outstanding)),
      sumC(report.employees.map(e => e.deductedInPayroll)), report.employees.length]))
  expect('كل سلفة: الأصل = المسدد + القائم (أو فرق مفسَّر)', () => assert.deepEqual(
    report.employees.flatMap(e => e.loans).filter(l => C(l.principal) !== C(l.paid) + C(l.outstanding))
      .map(l => [l.loanId, l.principal, l.paid, l.outstanding]), []))
})

test('RS12 — تقرير مراكز التكلفة: المراكز تجمع للإجمالي، و«بدون مركز» في الآخر', async () => {
  scene('RS12 مراكز التكلفة')
  const report = await ok(boss, '/reports/cost-centers', { period: PERIOD })
  covered('GET /reports/cost-centers', 'التجميع لكل مركز والإجمالي مقابل بنود المسيرات')
  const included = allItems(runMain.id, runOther.id)
  expect('مجموع المراكز = الإجمالي', () => assert.deepEqual(
    [sumC(report.centers.map(c => c.gross)), sumC(report.centers.map(c => c.deductions)), sumC(report.centers.map(c => c.net))],
    [C(report.totals.gross), C(report.totals.deductions), C(report.totals.net)]))
  expect('إجمالي الصافي = مجموع بنود المسيرات المعتمدة', () => assert.equal(C(report.totals.net), sumC(included.map(i => i.netPay))))
  const main = report.centers.find(c => c.costCenterId === ccMain.id)
  const ccEmployees = [eTransfer.id, eCash.id]
  expect('المركز بموظفيه وأرقامهم', () => assert.deepEqual(
    [main?.headcount, C(main?.net)], [ccEmployees.length, sumC(included.filter(i => ccEmployees.includes(i.employeeId)).map(i => i.netPay))]))
  expect('«بدون مركز تكلفة» آخر مجموعة', () => assert.equal(report.centers[report.centers.length - 1]?.costCenterId, null))
  expect('صافي كل موظف داخل المركز = صافي بنده', () => assert.deepEqual(
    report.centers.flatMap(c => c.employees).filter(row => {
      const item = included.find(i => i.employeeId === row.employeeId && i.runId === row.runId)
      return item && C(row.net) !== C(item.netPay)
    }).map(row => [row.employeeId, row.net]), []))
  expect('كل موظف داخل مركز: الإجمالي − الخصومات = الصافي', () => assert.deepEqual(
    report.centers.flatMap(c => c.employees).filter(row => C(row.gross) - C(row.deductions) !== C(row.net))
      .map(row => [row.employeeId, row.gross, row.deductions, row.net]), []))
  const withDraft = await ok(boss, '/reports/cost-centers', { period: PERIOD, includeDraft: 'true' })
  expect('includeDraft يضيف المسير غير المعتمد', () => assert.equal(
    C(withDraft.totals.net), sumC(allItems(runMain.id, runOther.id, runDraft.id).map(i => i.netPay))))
  const badPeriod = await get(boss, '/reports/cost-centers', { period: '2026-13' })
  expect('شهر غير صالح مرفوض 400', () => assert.equal(badPeriod.status, 400))
})

// ============================================================================
// 5) تقارير الرواتب التفصيلية
// ============================================================================

test('RS13 — بلا مسير: الشهر = نطاق الأيام، والأسباب صحيحة لكل حالة', async () => {
  scene('RS13 تقرير بلا مسير')
  const byPeriod = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD })
  covered('GET /reports/payroll/unassigned', 'الأسباب والملخص، والشهر مقابل نطاق الأيام')
  const byRange = await ok(boss, '/reports/payroll/unassigned', { from: CYCLE_FROM, to: CYCLE_TO })
  expect('نفس الفترة بالشهر وبالنطاق ترجع نفس الصفوف', () => assert.deepEqual(
    byPeriod.rows.map(r => [r.employeeId, r.reason]).sort(), byRange.rows.map(r => [r.employeeId, r.reason]).sort()))
  expect('الملخص متطابق بين الشهر والنطاق', () => assert.deepEqual({ ...byPeriod.summary, from: null, to: null }, { ...byRange.summary, from: null, to: null }))
  expect('حدود الشهر تُعاد كما هي', () => assert.deepEqual([byPeriod.period, byPeriod.summary.from, byPeriod.summary.to], [PERIOD, CYCLE_FROM, CYCLE_TO]))

  const ids = new Set(byPeriod.rows.map(r => r.employeeId))
  expect('موظف في مسير معتمد ليس في «بلا مسير»', () => assert.equal(ids.has(eTransfer.id), false))
  expect('المدير المباشر بلا مسير ظاهر', () => assert.ok(ids.has(mgr.id), JSON.stringify([...ids])))
  expect('تعيينه بعد نهاية الفترة ⇒ مش على رأس العمل فلا يظهر', () => assert.equal(ids.has(eJoinsLater.id), false))
  // شاشة تقارير الرواتب فيها مربع «إظهار الموقوفين» (includeSuspended) — نتحقق إنه بيعمل حاجة فعلًا
  const withSuspended = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, includeSuspended: 'true' })
  const withoutSuspended = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, includeSuspended: 'false' })
  const suspendedRow = withSuspended.rows.find(r => r.employeeId === eSuspended.id)
  const suspendedEmployee = await repo('Employee').findOneBy({ id: eSuspended.id })
  const suspensionRows = await ds.query(`SELECT COUNT(*) AS [n] FROM [employee_suspensions] WHERE [employeeId] = ${eSuspended.id}`)
  expect('«إظهار الموقوفين» فلتر فعّال: يغيّر الصفوف أو على الأقل يعدّ موقوفًا في الملخص', () => assert.ok(
    withSuspended.rows.length !== withoutSuspended.rows.length || byPeriod.summary.suspended >= 1,
    `صفوف الموقوفين مع الفلتر=${withSuspended.rows.length} وبدونه=${withoutSuspended.rows.length}، `
    + `summary.suspended=${byPeriod.summary.suspended}، حالة الموظف=${suspendedEmployee?.status} isActive=${suspendedEmployee?.isActive}، `
    + `سجلات الإيقاف=${suspensionRows[0].n}، سببه في التقرير=${suspendedRow?.reason}`))
  expect('الموقوف يُعرض بسبب «موقوف» لا بسبب عام', () => assert.equal(suspendedRow?.reason, 'SUSPENDED',
    `السبب الفعلي=${JSON.stringify(suspendedRow?.reasons)} وحالة الموظف=${suspendedEmployee?.status}`))
  expect('عدد المغطّين + بلا مسير = من على رأس العمل', () => assert.equal(
    byPeriod.summary.covered + byPeriod.summary.unassigned, byPeriod.summary.onJob))
  expect('لا صرف مزدوج: مفيش موظف في مسيرين متداخلين', () => assert.deepEqual(byPeriod.duplicates, []))

  // موظف المسودة: المسير المحسوب غير المعتمد يغطيه فعلًا (بند موجود)
  expect('موظف المسير غير المعتمد مغطّى ببنده', () => assert.equal(ids.has(eDraft.id), false))

  // فلتر السبب والفروع والأقسام والفرق
  const filtered = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, reason: 'NO_RUN_IN_PERIOD' })
  expect('فلتر السبب يطبّق فعلًا', () => assert.deepEqual(
    filtered.rows.filter(r => !r.reasons.some(x => x.code === 'NO_RUN_IN_PERIOD')).map(r => r.employeeId), []))
  const byDept = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, departmentId: String(deptSales.id) })
  expect('فلتر القسم يطبّق فعلًا', () => assert.deepEqual(
    byDept.rows.filter(r => r.departmentId !== deptSales.id).map(r => [r.employeeId, r.departmentId]), []))
  const byTeam = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, teamId: String(teamOne.id) })
  const teamIds = new Set((await repo('Employee').find({ where: { teamId: teamOne.id } })).map(e => e.id))
  expect('فلتر الفريق يطبّق فعلًا', () => assert.deepEqual(byTeam.rows.filter(r => !teamIds.has(r.employeeId)).map(r => r.employeeId), []))
  const byBranch = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD, branchId: String(branchB.id) })
  expect('فلتر الفرع يطبّق فعلًا', () => assert.deepEqual(byBranch.rows.filter(r => r.branchId !== branchB.id).map(r => r.employeeId), []))
  const scoped = await ok(branchBUser, '/reports/payroll/unassigned', { period: PERIOD })
  expect('حساب الفرع يرى فرعه فقط في «بلا مسير»', () => assert.deepEqual(
    scoped.rows.filter(r => r.branchId !== branchB.id).map(r => [r.employeeId, r.branchId]), []))
  const badRange = await get(boss, '/reports/payroll/unassigned', { from: CYCLE_TO, to: CYCLE_FROM })
  expect('نطاق مقلوب مرفوض 400', () => assert.equal(badRange.status, 400))
  const halfRange = await get(boss, '/reports/payroll/unassigned', { from: CYCLE_FROM })
  expect('«من» بلا «إلى» مرفوض 400', () => assert.equal(halfRange.status, 400))
})

test('RS14 — الإضافي بالمبالغ: كل سجل بمصدر مبلغه، والمجموع = عمود الإضافي في المسيرات', async () => {
  scene('RS14 تقرير الإضافي بالمبالغ')
  const byPeriod = await ok(boss, '/reports/payroll/overtime', { period: PREV_PERIOD })
  covered('GET /reports/payroll/overtime', 'كل سجل ومصدر مبلغه والمجاميع مقابل overtime_entries وبنود المسير')
  const byRange = await ok(boss, '/reports/payroll/overtime', { from: PREV_FROM, to: PREV_TO })
  expect('الشهر = نطاق الأيام في تقرير الإضافي', () => assert.deepEqual(
    byPeriod.rows.map(r => [r.id, r.amount, r.amountSource]), byRange.rows.map(r => [r.id, r.amount, r.amountSource])))
  const entries = await repo('OvertimeEntry').find()
  const inRange = entries.filter(e => String(e.date).slice(0, 10) >= PREV_FROM && String(e.date).slice(0, 10) <= PREV_TO)
  expect('كل سجل إضافي داخل الفترة ظاهر مرة واحدة', () => assert.deepEqual(
    byPeriod.rows.map(r => r.id).sort((a, b) => a - b), inRange.map(e => e.id).sort((a, b) => a - b)))
  expect('التقرير فيه سجل إضافي واحد على الأقل (الفيكستشر أنتج سجلات فعلية)', () => assert.ok(byPeriod.rows.length >= 1, String(byPeriod.rows.length)))
  const paidRows = byPeriod.rows.filter(r => r.amountSource === 'PAYROLL_ITEM' || r.amountSource === 'PAYROLL_ITEM_ALLOCATED')
  expect('المبلغ المصروف داخل المسيرات = مجموع سطوره', () => assert.equal(
    C(byPeriod.summary.paidInRunsAmount), sumC(paidRows.map(r => r.amount))))
  expect('عمود الإضافي في المسيرات = مجموع المصروف داخلها (لا مبلغ يتيم)', () => assert.equal(
    C(byPeriod.summary.payrollColumnTotal), C(byPeriod.summary.paidInRunsAmount) + C(byPeriod.summary.unallocatedInRunsAmount)))
  expect('عمود الإضافي = مجموع عمود الإضافي في بنود مسير الفترة فعلًا', () => assert.equal(
    C(byPeriod.summary.payrollColumnTotal), sumC(allItems(runPrev.id).map(i => i.overtimeAmount))))
  expect('لا سجل بمبلغ يحتاج مراجعة', () => assert.deepEqual(
    byPeriod.rows.filter(r => r.amountSource === 'UNRESOLVED').map(r => [r.id, r.issue]), []))
  expect('كل مبلغ بمنزلتين', () => assert.deepEqual(
    byPeriod.rows.map(r => r.amount).filter(v => v !== null && !/^-?\d+\.\d{2}$/.test(String(v))), []))
  const otRow = byPeriod.rows.find(r => r.employeeId === eOt.id && String(r.date).slice(0, 10) === OT_DAY)
  expect('سجل الإضافي مربوط بمسيره وبمبلغه من البند', () => assert.deepEqual(
    [otRow?.run?.id, C(otRow?.amount)], [runPrev.id, C(itemOf(runPrev.id, eOt.id)?.overtimeAmount)]))
  const statusFilter = await ok(boss, '/reports/payroll/overtime', { period: PREV_PERIOD, status: 'APPROVED' })
  expect('فلتر الحالة يطبّق فعلًا', () => assert.deepEqual(statusFilter.rows.filter(r => r.status !== 'APPROVED').map(r => [r.id, r.status]), []))
  const deptFilter = await ok(boss, '/reports/payroll/overtime', { period: PREV_PERIOD, departmentId: String(deptSales.id) })
  expect('فلتر القسم يطبّق فعلًا (لا سجلات قسم آخر)', () => assert.deepEqual(deptFilter.rows.map(r => r.employeeId).filter(id => id === eOt.id), []))
  const scoped = await ok(branchBUser, '/reports/payroll/overtime', { period: PREV_PERIOD })
  expect('حساب فرع ب لا يرى إضافي فرع أ', () => assert.deepEqual(scoped.rows.filter(r => r.employeeId === eOt.id).map(r => r.id), []))
  expect('ولا يتسرب له مبلغ فرع أ في الملخص', () => assert.equal(C(scoped.summary.paidInRunsAmount), 0))
})

test('RS15 — السلف التفصيلي: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتوقع', async () => {
  scene('RS15 تقرير السلف التفصيلي')
  const report = await ok(boss, '/reports/payroll/loans', { period: PERIOD })
  covered('GET /reports/payroll/loans', 'الأصل والمسدد والمتبقي والتقادم والتحصيل المتوقع مقابل صفوف الأقساط')
  const row = report.rows.find(r => r.loanId === loanMain.id)
  const installments = await repo('LoanInstallment').find({ where: { loanId: loanMain.id } })
  const paid = sumC(installments.map(i => i.paidAmount))
  const remaining = sumC(installments.filter(i => (i.financialStatus ?? 'DUE') === 'DUE').map(i => i.amount))
  expect('الأصل والمسدد والمتبقي = صفوف الأقساط', () => assert.deepEqual(
    [C(row?.principal), C(row?.paid), C(row?.remaining)], [150000, paid, remaining]))
  expect('الأصل = المسدد + المتبقي (الرصيد متوازن)', () => assert.deepEqual([row?.balanced, C(row?.principal)], [true, C(row?.paid) + C(row?.remaining)]))
  const paidChains = installments.filter(i => ['PAID', 'SETTLED'].includes(i.financialStatus ?? (i.paid ? 'PAID' : 'DUE'))).length
  expect('«قسط س من ص»: عدد الأقساط والمسدّد منها = صفوف الجدول', () => assert.deepEqual(
    [row?.installments, row?.paidInstallments], [installments.length, paidChains]))
  expect('مجاميع التقرير = مجموع سطوره', () => assert.deepEqual(
    [C(report.summary.principal), C(report.summary.paid), C(report.summary.remaining), report.summary.loans],
    [sumC(report.rows.map(r => r.principal)), sumC(report.rows.map(r => r.paid)), sumC(report.rows.map(r => r.remaining)), report.rows.length]))
  expect('مجموع التقادم = المتأخر في الملخص', () => assert.equal(sumC(report.aging.map(b => b.amount)), C(report.summary.overdue)))
  expect('التحصيل المتوقع = الأقساط المستحقة مستقبلًا', () => assert.equal(
    sumC(report.forecast.map(f => f.amount)), sumC(installments.filter(i => (i.financialStatus ?? 'DUE') === 'DUE' && String(i.dueDate).slice(0, 10) >= new Date().toISOString().slice(0, 10)).map(i => i.amount))))
  expect('لا رصيد غير متوازن ولا مشكلة قراءة', () => assert.deepEqual([report.summary.unbalanced, report.summary.issues], [0, 0]))
  expect('عمود أقساط السلف في مسيرات الفترة = المخصوم فعلًا', () => assert.equal(
    C(report.summary.period?.payrollColumnTotal), sumC(allItems(runMain.id, runOther.id, runDraft.id).map(i => i.loanInstallments))))
  const open = await ok(boss, '/reports/payroll/loans', { period: PERIOD, status: 'open' })
  expect('فلتر «القائمة» يستبعد المسوّى', () => assert.deepEqual(open.rows.filter(r => C(r.remaining) === 0).map(r => r.loanId), []))
  const settled = await ok(boss, '/reports/payroll/loans', { period: PERIOD, status: 'settled' })
  expect('فلتر «المسوّاة» يستبعد ما عليه متبقٍّ', () => assert.deepEqual(settled.rows.filter(r => C(r.remaining) > 0).map(r => r.loanId), []))
  const scopedB = await ok(branchBUser, '/reports/payroll/loans', { period: PERIOD })
  expect('حساب فرع ب لا يرى سلفة فرع أ', () => assert.deepEqual(scopedB.rows.map(r => r.loanId), []))
  const byBranch = await ok(boss, '/reports/payroll/loans', { period: PERIOD, branchId: String(branchB.id) })
  expect('فلتر الفرع يطبّق فعلًا على السلف', () => assert.deepEqual(byBranch.rows.map(r => r.loanId), []))
})

test('RS16 — الفروق بين شهرين: الفرق مفسَّر ببنوده والمجاميع تطابق المسيرين', async () => {
  scene('RS16 تقرير الفروق')
  const report = await ok(boss, '/reports/payroll/variance', { period: PERIOD, comparePeriod: PREV_PERIOD })
  covered('GET /reports/payroll/variance', 'الفروق والأسباب والمجاميع مقابل بنود الشهرين')
  expect('الشهران كما طُلبا', () => assert.deepEqual([report.period, report.comparePeriod], [PERIOD, PREV_PERIOD]))
  const netTotals = report.totals.find(t => t.key === 'netPay')
  // إصلاح 21 سبتمبر: الفروق بقت على المعتمد والمصروف وحدهم افتراضيًا — نفس قاعدة كشف الرواتب
  // المالي — فالرقمان لنفس الشهر بقوا قابلين للمطابقة على شاشة الإدارة.
  const approvedOnly = allItems(runMain.id, runOther.id)
  const current = approvedOnly
  const previous = runItems.get(runPrev.id) ?? []
  expect('إجمالي الصافي الحالي والسابق = مجموع بنود كل شهر', () => assert.deepEqual(
    [C(netTotals?.current), C(netTotals?.previous), C(netTotals?.delta)],
    [sumC(current.map(i => i.netPay)), sumC(previous.map(i => i.netPay)), sumC(current.map(i => i.netPay)) - sumC(previous.map(i => i.netPay))]))
  // ملاحظة جوهرية: كشف الرواتب المالي لنفس الشهر يستبعد المسير غير المعتمد إلا بـincludeDraft،
  // فلو الفروق ضمّته يبقى الرقمان لنفس الشهر مش قابلين للمطابقة على شاشة الإدارة.
  const registerSameMonth = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  expect('إجمالي الشهر الحالي في الفروق = إجمالي كشف الرواتب لنفس الشهر', () => assert.equal(
    C(netTotals?.current), C(registerSameMonth.totals.net),
    `الفروق ضمّت المسير غير المعتمد #${runDraft.id} (${cM(sumC((runItems.get(runDraft.id) ?? []).map(i => i.netPay)))}) `
    + `بينما الكشف استبعده: الفروق=${netTotals?.current} الكشف=${registerSameMonth.totals.net} `
    + `(المعتمد وحده=${cM(sumC(approvedOnly.map(i => i.netPay)))})`))
  expect('كل بند في المجاميع = مجموع عموده في الشهرين', () => assert.deepEqual(
    report.totals.filter(t => t.key === 'basicSalary' || t.key === 'allowances' || t.key === 'overtimeAmount')
      .filter(t => C(t.current) !== sumC(current.map(i => i[t.key])) || C(t.previous) !== sumC(previous.map(i => i[t.key])))
      .map(t => [t.key, t.current, t.previous]), []))
  expect('مجموع الفروق في السطور = فرق الإجمالي', () => assert.equal(
    sumC(report.rows.map(r => r.difference)), C(netTotals?.delta)))
  expect('لا فرق غير مفسَّر', () => assert.deepEqual(report.unexplained.map(r => [r.employeeId, r.residual]), []))
  for (const row of report.rows) {
    expect(`الفرق للموظف #${row.employeeId} = الحالي − السابق`, () => assert.equal(C(row.difference), C(row.currentNet) - C(row.previousNet)))
    if (row.causes.some(c => c.code === 'NEW_IN_PERIOD' || c.code === 'LEFT_PERIOD')) continue
    expect(`أثر البنود يفسّر فرق الموظف #${row.employeeId}`, () => assert.equal(sumC(row.components.map(c => c.effect)), C(row.difference)))
  }
  const newRow = report.rows.find(r => r.employeeId === eLate.id)
  expect('الداخل الجديد سببه «انضمام أو دخول مسير جديد»', () => assert.ok(
    newRow?.causes.some(c => c.code === 'NEW_IN_PERIOD'), JSON.stringify(newRow?.causes)))
  const minAmount = await ok(boss, '/reports/payroll/variance', { period: PERIOD, comparePeriod: PREV_PERIOD, minAmount: '1000000' })
  expect('حد المبلغ يطبّق فعلًا (لا سطور تحت الحد)', () => assert.deepEqual(minAmount.rows.map(r => r.employeeId), []))
  const same = await get(boss, '/reports/payroll/variance', { period: PERIOD, comparePeriod: PERIOD })
  expect('مقارنة الشهر بنفسه مرفوضة 400', () => assert.equal(same.status, 400))
  const scopedB = await ok(branchBUser, '/reports/payroll/variance', { period: PERIOD, comparePeriod: PREV_PERIOD })
  expect('حساب فرع ب لا يرى موظفي فرع أ في الفروق', () => assert.deepEqual(
    scopedB.rows.filter(r => r.employeeId !== eOther.id).map(r => r.employeeId), []))
  const scopedTotals = scopedB.totals.find(t => t.key === 'netPay')
  expect('ولا يتسرب له إجمالي فرع أ', () => assert.equal(C(scopedTotals?.current), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
})

test('RS17 — الأوفرتايم الشهري (الساعات): الساعات = صفوفها، والمبلغ لمن يملك صلاحية الرواتب فقط', async () => {
  scene('RS17 الأوفرتايم الشهري')
  const report = await ok(boss, '/reports/overtime', { from: PREV_FROM, to: PREV_TO })
  covered('GET /reports/overtime', 'الساعات والمبالغ مقابل overtime_entries، والمبلغ محجوب بلا صلاحية الرواتب')
  const byMonth = await ok(boss, '/reports/overtime', { month: '2026-09' })
  const entries = await repo('OvertimeEntry').find()
  const inCycle = entries.filter(e => String(e.date).slice(0, 10) >= PREV_FROM && String(e.date).slice(0, 10) <= PREV_TO)
  expect('عدد السجلات = صفوف الفترة', () => assert.equal(report.reduce((s, r) => s + Number(r.entries), 0), inCycle.length))
  expect('التقرير فيه سجلات فعلية', () => assert.ok(inCycle.length >= 1 && report.length >= 1, `entries=${inCycle.length} rows=${report.length}`))
  const otRows = report.filter(r => Number(r.employeeId) === eOt.id)
  expect('ساعات الموظف = مجموع ساعات صفوفه', () => assert.equal(
    otRows.reduce((s, r) => s + Number(r.actualHours ?? 0), 0),
    inCycle.filter(e => e.employeeId === eOt.id).reduce((s, e) => s + Number(e.hoursActual ?? 0), 0)))
  expect('الشهر والنطاق يتفقان في عدد السجلات', () => assert.equal(
    byMonth.reduce((s, r) => s + Number(r.entries), 0),
    entries.filter(e => String(e.date).slice(0, 10) >= '2026-09-01' && String(e.date).slice(0, 10) <= '2026-09-30').length))
  const noPayroll = await ok(reportOnlyUser, '/reports/overtime', { from: PREV_FROM, to: PREV_TO })
  expect('بلا صلاحية الرواتب: الساعات ظاهرة والمبلغ محجوب', () => assert.deepEqual(
    noPayroll.map(r => Object.prototype.hasOwnProperty.call(r, 'approvedAmount')).filter(Boolean), []))
  expect('مع صلاحية الرواتب: المبلغ ظاهر', () => assert.ok(
    report.some(r => Object.prototype.hasOwnProperty.call(r, 'approvedAmount')), JSON.stringify(report[0])))
  const scopedB = await ok(branchBUser, '/reports/overtime', { from: PREV_FROM, to: PREV_TO })
  expect('حساب فرع ب لا يرى إضافي فرع أ', () => assert.deepEqual(scopedB.filter(r => Number(r.employeeId) === eOt.id).map(r => r.employeeId), []))
})

test('RS18 — التأمينات الاجتماعية: الصفوف والمجاميع وفلتر الفرع', async () => {
  scene('RS18 التأمينات الاجتماعية')
  const report = await ok(boss, '/social-insurance/report', { period: PERIOD })
  covered('GET /social-insurance/report', 'الصفوف والمجاميع وفلتر الفرع — الفرع بلا نظام تأمين يرجع تقريرًا فاضيًا نظيفًا')
  expect('مجاميع التأمينات = مجموع الصفوف', () => assert.deepEqual(
    [report.totals.employees, C(report.totals.employeeShare), C(report.totals.employerShare), C(report.totals.total)],
    [report.rows.length, sumC(report.rows.map(r => r.employeeShare)), sumC(report.rows.map(r => r.employerShare)),
      sumC(report.rows.map(r => r.employeeShare)) + sumC(report.rows.map(r => r.employerShare))]))
  expect('كل مبلغ في المجاميع بمنزلتين', () => assert.deepEqual(
    Object.values(report.totals).filter(v => typeof v === 'string' && !/^-?\d+\.\d{2}$/.test(v)), []))
  expect('فرع بلا نظام تأمين ⇒ تقرير فاضٍ لا خطأ', () => assert.deepEqual([report.rows.length, C(report.totals.total)], [0, 0]))
  const scopedB = await ok(branchBUser, '/social-insurance/report', { period: PERIOD })
  expect('حساب الفرع يُثبّت فرعه في التقرير', () => assert.equal(scopedB.branchId, branchB.id))
  const foreign = await get(branchBUser, '/social-insurance/report', { period: PERIOD, branchId: String(branchA.id) })
  expect('حساب الفرع ممنوع من فرع آخر', () => assert.equal(foreign.status, 403, String(foreign.status)))
  const badPeriod = await get(boss, '/social-insurance/report', { period: '2026' })
  expect('شهر غير صالح مرفوض 400', () => assert.equal(badPeriod.status, 400))
})

// ============================================================================
// 6) الفلاتر والصلاحيات والفترات الفاضية
// ============================================================================

test('RS19 — الفلاتر: الفرع والقسم ومركز التكلفة على التقارير المالية تطبّق فعلًا', async () => {
  scene('RS19 فلاتر التقارير المالية')
  const all = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  const branchFilter = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD, branchId: String(branchB.id) })
  expect('فلتر الفرع: السطور كلها من الفرع المطلوب', () => assert.deepEqual(
    branchFilter.rows.filter(r => r.branchName !== branchB.name).map(r => [r.employeeCode, r.branchName]), []))
  expect('وفلتر الفرع يطابق بنود مسير ذلك الفرع', () => assert.equal(
    C(branchFilter.totals.net), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
  const deptFilter = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD, departmentId: String(deptOps.id) })
  expect('فلتر القسم: السطور كلها من القسم المطلوب', () => assert.deepEqual(
    deptFilter.rows.filter(r => r.departmentName !== deptOps.name).map(r => [r.employeeCode, r.departmentName]), []))
  expect('فلتر القسم = بنود موظفي القسم', () => assert.equal(
    C(deptFilter.totals.net), sumC((runItems.get(runMain.id) ?? []).map(i => i.netPay))))
  const ccFilter = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD, costCenterId: String(ccMain.id) })
  expect('فلتر مركز التكلفة يطبّق فعلًا', () => assert.deepEqual(
    ccFilter.rows.filter(r => r.costCenterName !== ccMain.name).map(r => [r.employeeCode, r.costCenterName]), []))
  expect('فلتر مركز التكلفة = بنود موظفيه', () => assert.equal(
    C(ccFilter.totals.net), sumC(allItems(runMain.id).filter(i => [eTransfer.id, eCash.id].includes(i.employeeId)).map(i => i.netPay))))
  const branchAOnly = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD, branchId: String(branchA.id) })
  expect('مجموع الفرعين = الكل (لا سطر يسقط ولا يتكرر)', () => assert.deepEqual(
    [C(branchFilter.totals.net) + C(branchAOnly.totals.net), branchFilter.rows.length + branchAOnly.rows.length],
    [C(all.totals.net), all.rows.length]))
  // فلتر الفريق غير معروض على التقارير المالية — لو اتقبل ولا يُطبَّق تبقى ملاحظة
  const teamFilter = await get(boss, '/reports/financial/payroll-register', { period: PERIOD, teamId: String(teamOne.id) })
  expect('فلتر الفريق على التقرير المالي: يُطبَّق أو يُرفض — لا يُقبل ويُتجاهل', () => {
    if (teamFilter.status !== 200) return
    const teamOnly = new Set([eTransfer.id, eLate.id])
    assert.deepEqual(teamFilter.body.rows.filter(r => !teamOnly.has(r.employeeId)).map(r => r.employeeCode), [],
      'teamId اتقبل (200) ورجع موظفين برّه الفريق ⇒ الفلتر متجاهل بصمت')
  })
  // نفس الفلاتر على باقي التقارير المالية
  for (const route of ['payroll-cost', 'deductions', 'overtime', 'loans']) {
    const scopedReport = await ok(boss, `/reports/financial/${route}`, { period: PERIOD, branchId: String(branchB.id) })
    covered(`GET /reports/financial/${route} (filters)`, 'فلتر الفرع')
    const rows = scopedReport.rows ?? scopedReport.employees ?? scopedReport.byBranch ?? []
    expect(`فلتر الفرع على ${route} لا يسرّب فرعًا آخر`, () => assert.deepEqual(
      rows.filter(r => r.branchName && r.branchName !== branchB.name).map(r => [route, r.branchName]), []))
  }
  const badBranch = await get(boss, '/reports/financial/payroll-register', { period: PERIOD, branchId: 'x' })
  expect('رقم فرع غير صالح مرفوض 400', () => assert.equal(badBranch.status, 400))
})

test('RS20 — الصلاحيات: الموظف العادي ممنوع، والتقارير بلا صلاحية رواتب محجوبة، ونطاق الفرع يقيّد كل تقرير', async () => {
  scene('RS20 الصلاحيات ونطاق الفرع')
  const moneyRoutes = [
    '/reports/financial/payroll-register', '/reports/financial/payroll-cost', '/reports/financial/deductions',
    '/reports/financial/loans', '/reports/financial/overtime', '/reports/cost-centers',
    '/reports/payroll/unassigned', '/reports/payroll/overtime', '/reports/payroll/loans', '/reports/payroll/variance',
  ]
  for (const route of moneyRoutes) {
    const blocked = await get(reportOnlyUser, route, { period: PERIOD })
    expect(`${route} محجوب على من يملك التقارير بلا الرواتب`, () => assert.equal(blocked.status, 403, `status=${blocked.status}`))
  }
  const plainRoutes = [...moneyRoutes, '/reports/headcount', '/reports/attendance', '/reports/leaves', '/reports/payroll', '/reports/requests', '/reports/overtime']
  for (const route of plainRoutes) {
    const blocked = await get(eCash.user, route, { period: PERIOD, month: PERIOD, year: YEAR })
    expect(`${route} ممنوع على الموظف العادي`, () => assert.equal(blocked.status, 403, `status=${blocked.status}`))
  }
  // حساب الفرع لا يستطيع طلب فرع آخر صراحة
  for (const route of ['/reports/financial/payroll-register', '/reports/cost-centers']) {
    const foreign = await get(branchBUser, route, { period: PERIOD, branchId: String(branchA.id) })
    expect(`${route}: حساب الفرع ممنوع من فرع آخر`, () => assert.equal(foreign.status, 403, `status=${foreign.status}`))
  }
  // ولا يتسرب إجمالي فرع آخر من سطر ملخص
  const scopedRegister = await ok(branchBUser, '/reports/financial/payroll-register', { period: PERIOD })
  expect('كشف حساب الفرع = بنود فرعه وحده', () => assert.equal(
    C(scopedRegister.totals.net), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
  const scopedCost = await ok(branchBUser, '/reports/financial/payroll-cost', { period: PERIOD })
  expect('ملخص التكلفة لحساب الفرع بفرعه وحده', () => assert.deepEqual(scopedCost.byBranch.map(r => r.name), [branchB.name]))
  const scopedCenters = await ok(branchBUser, '/reports/cost-centers', { period: PERIOD })
  expect('مراكز التكلفة لحساب الفرع = بنود فرعه', () => assert.equal(
    C(scopedCenters.totals.net), sumC((runItems.get(runOther.id) ?? []).map(i => i.netPay))))
  const scopedDeductions = await ok(branchBUser, '/reports/financial/deductions', { period: PERIOD })
  expect('خصومات حساب الفرع لا تذكر موظفي فرع آخر', () => assert.deepEqual(
    scopedDeductions.employees.filter(e => e.employeeId !== eOther.id).map(e => e.employeeCode), []))
})

test('RS21 — فترة فاضية: كل تقرير يرجع أصفارًا نظيفة لا خطأ', async () => {
  scene('RS21 الفترة الفاضية')
  const EMPTY = '2019-06'   // قبل تعيين أي موظف (joinDate 2020-01-01)
  const routes = [
    ['/reports/financial/payroll-register', body => [body.rows.length, C(body.totals.net)]],
    ['/reports/financial/payroll-cost', body => [body.byBranch.length, C(body.totals.net)]],
    ['/reports/financial/deductions', body => [body.employees.length, C(body.totals.amount)]],
    ['/reports/financial/overtime', body => [body.employees.length, C(body.totals.amount)]],
    ['/reports/cost-centers', body => [body.centers.length, C(body.totals.net)]],
  ]
  for (const [route, pick] of routes) {
    const response = await get(boss, route, { period: EMPTY })
    if (!expect(`${route} لفترة فاضية يرجع 200`, () => assert.equal(response.status, 200, JSON.stringify(response.body)))) continue
    expect(`${route} لفترة فاضية بأصفار`, () => assert.deepEqual(pick(response.body), [0, 0]))
  }
  const emptyUnassigned = await get(boss, '/reports/payroll/unassigned', { period: EMPTY })
  expect('«بلا مسير» لفترة قبل التعيين: 200 ولا موظف على رأس العمل', () => assert.deepEqual(
    [emptyUnassigned.status, emptyUnassigned.body?.summary?.onJob], [200, 0]))
  const emptyOvertime = await ok(boss, '/reports/payroll/overtime', { period: EMPTY })
  expect('«الإضافي» لفترة فاضية بأصفار', () => assert.deepEqual([emptyOvertime.rows.length, C(emptyOvertime.summary.approvedAmount)], [0, 0]))
  const emptyAttendance = await ok(boss, '/reports/attendance', { month: EMPTY })
  expect('«الحضور» لفترة فاضية بقائمة فاضية', () => assert.deepEqual(emptyAttendance, []))
  const emptyLeaves = await ok(boss, '/reports/leaves', { year: '2024' })
  expect('«الإجازات» لسنة فاضية بلا صفوف', () => assert.deepEqual([emptyLeaves.byType.length, emptyLeaves.balances.length], [0, 0]))
})

test('RS22 — الفلوس مقصوصة لا مقرَّبة لأعلى في كل تقرير', async () => {
  scene('RS22 قص الفلوس في التقارير')
  // موظف بأساسي 6001 ⇒ سعر يوم 200.0333…، دقيقة 0.41673…؛ يوم بلا أجر و٧ دقائق تأخير
  const cut = await staff('C01', 'قاسم — قص الفلوس',
    { basicSalary: 6001, housingAllowance: 0, transportAllowance: 0, teamId: null },
    { '2026-10-15': { status: 'late', lateMinutes: 7 } })
  const leave = await submitRequest(cut.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: '2026-10-19', toDate: '2026-10-19', days: 1 })
  if (leave.submitted.status === 201) {
    await act(mgrUser, leave.id, 'APPROVE', 'موافق')
    await act(hrUser, leave.id, 'APPROVE', 'موافق')
  }
  const run = await draft(boss, 'مسير قص الفلوس — أكتوبر', { employeeIds: [cut.id] })
  const calculated = await calcRun(boss, run.id)
  runItems.set(run.id, calculated.items ?? [])
  const item = itemOf(run.id, cut.id)
  const dayRate = 6001 / 30, minuteRate = dayRate / 8 / 60
  expect('خصم يوم بلا أجر مقصوص 200.03 لا 200.04', () => assert.equal(Number(item?.unpaidLeaveDeduction), money(dayRate)))
  expect('خصم ٧ دقائق مقصوص 2.91 لا 2.92', () => assert.equal(Number(item?.latenessDeduction), money(7 * minuteRate)))
  expectStatus(await approveRun(payUser, run.id), 201, 'approve cut:')

  const register = await ok(boss, '/reports/financial/payroll-register', { period: PERIOD })
  const row = register.rows.find(r => r.employeeId === cut.id)
  expect('التقرير يعرض نفس القرشين المقصوصين', () => assert.deepEqual(
    [row?.deductions.UNPAID_LEAVE, row?.deductions.LATENESS, row?.net],
    [M(dayRate), M(7 * minuteRate), M(Number(item?.netPay))]))
  expect('لا مبلغ في التقرير أكبر من قيمته المحفوظة (لا تقريب لأعلى)', () => assert.deepEqual(
    [C(row?.net) > C(item?.netPay), C(row?.deductions.UNPAID_LEAVE) > C(item?.unpaidLeaveDeduction)], [false, false]))
  const centers = await ok(boss, '/reports/cost-centers', { period: PERIOD })
  const centerRow = centers.centers.flatMap(c => c.employees).find(e => e.employeeId === cut.id)
  expect('مراكز التكلفة بنفس القص', () => assert.equal(C(centerRow?.net), C(item?.netPay)))
  const payrollReport = await ok(boss, '/reports/payroll')
  const runRow = payrollReport.runs.find(r => r.id === run.id)
  expect('ملخص المسيرات بنفس القص', () => assert.equal(C(runRow?.totalNet), C(item?.netPay)))
  expect('كل مبالغ ملخص المسيرات بمنزلتين بالضبط', () => assert.deepEqual(
    payrollReport.runs.map(r => r.totalNet).filter(v => !/^-?\d+\.\d{2}$/.test(String(v))), []))
})

test('RS23 — طرق الصرف، «بلا مسير» من باب الرواتب، شهر الرواتب، وحضور الشهر لموظف', async () => {
  scene('RS23 تقارير الرواتب والحضور المساندة')

  // ١) تقرير طرق الصرف للمسير = بنوده (التصفية خارج المبلغ المستحق للصرف)
  const methods = await ok(boss, `/payroll/runs/${runMain.id}/pay-methods`)
  covered('GET /payroll/runs/:id/pay-methods', 'العدد والمبلغ لكل طريقة صرف مقابل بنود المسير')
  const items = runItems.get(runMain.id) ?? []
  const settlementNet = C(itemOf(runMain.id, eSettle.id)?.netPay)
  const payable = items.filter(i => i.employeeId !== eSettle.id)
  const expected = new Map()
  for (const item of payable) {
    const acc = expected.get(item.payMethod) ?? { count: 0, total: 0 }
    acc.count++; acc.total += C(item.netPay)
    expected.set(item.payMethod, acc)
  }
  expect('طرق الصرف بعددها ومبلغها = بنود المسير بلا التصفية', () => assert.deepEqual(
    Object.fromEntries(Object.entries(methods).map(([key, value]) => [key, { count: value.count, total: C(value.total) }])),
    Object.fromEntries([...expected.entries()])))
  expect('مجموع طرق الصرف = إجمالي المسير ناقص التصفية', () => assert.equal(
    sumC(Object.values(methods).map(v => v.total)), sumC(items.map(i => i.netPay)) - settlementNet))
  const sheet = await ok(boss, `/payroll/runs/${runMain.id}/bank-sheet`)
  expect('طرق الصرف = مجاميع كشف البنك', () => assert.equal(
    sumC(Object.values(methods).map(v => v.total)), C(sheet.totals.net)))

  // ٢) «بلا مسير» من باب الرواتب مقابل نفس التقرير من باب التقارير
  const fromPayroll = await ok(boss, '/payroll/unassigned-report', { period: PERIOD })
  covered('GET /payroll/unassigned-report', 'يتطابق مع /reports/payroll/unassigned لنفس الفترة')
  const fromReports = await ok(boss, '/reports/payroll/unassigned', { period: PERIOD })
  // تقريران بتطبيقين مستقلين لنفس السؤال: buildPayrollUnassignedReport (بوابة اعتماد المسير)
  // وpayrollUnassignedReport (شاشة التقارير). المطلوب على الأقل نفس الموظفين ونفس العدد.
  expect('نفس الموظفين بلا مسير من البابين', () => assert.deepEqual(
    (fromPayroll.rows ?? []).map(r => r.employeeId).sort((a, b) => a - b),
    fromReports.rows.map(r => r.employeeId).sort((a, b) => a - b),
    `باب الرواتب: ${JSON.stringify((fromPayroll.rows ?? []).map(r => [r.employeeId, r.reasonCode]))} — `
    + `باب التقارير: ${JSON.stringify(fromReports.rows.map(r => [r.employeeId, r.reason]))}`))
  expect('نفس العدد الكلي والمغطّى وغير المغطّى', () => assert.deepEqual(
    [fromPayroll.totals?.employed, fromPayroll.totals?.assigned, fromPayroll.totals?.unassigned],
    [fromReports.summary.onJob, fromReports.summary.covered, fromReports.summary.unassigned],
    `totals=${JSON.stringify(fromPayroll.totals)} summary=${JSON.stringify(fromReports.summary)}`))
  expect('حدود الفترة نفسها من البابين', () => assert.deepEqual(
    [fromPayroll.startDate, fromPayroll.endDate], [fromReports.summary.from, fromReports.summary.to]))

  // ٣) شهر الرواتب: حدوده = حدود المسير بالضبط
  const month = await ok(boss, '/attendance/payroll-month', { period: PERIOD })
  covered('GET /attendance/payroll-month', 'حدود شهر الرواتب = حدود المسير')
  expect('حدود شهر الرواتب = نطاق المسير', () => assert.deepEqual(
    [month.period, month.from, month.to, month.cycleStartDay], [PERIOD, runMain.startDate, runMain.endDate, 23]))
  const byDate = await ok(boss, '/attendance/payroll-month', { date: LWD })
  expect('شهر الرواتب اللي فيه يوم معين', () => assert.deepEqual([byDate.period, byDate.from, byDate.to], [PERIOD, CYCLE_FROM, CYCLE_TO]))

  // ٤) حضور الشهر لموظف: أيامه = صفوفه، والشهر = النطاق
  const monthly = await ok(boss, '/attendance/monthly', { employeeId: String(eLate.id), from: CYCLE_FROM, to: CYCLE_TO })
  covered('GET /attendance/monthly', 'أيام الموظف ومجاميعه مقابل attendance_days')
  const days = monthly.days ?? monthly.rows ?? monthly
  const rowCount = (await ds.query(
    `SELECT COUNT(*) AS [n] FROM [attendance_days] WHERE [employeeId] = ${eLate.id} AND [date] BETWEEN '${CYCLE_FROM}' AND '${CYCLE_TO}'`))[0].n
  expect('عدد أيام التقرير = صفوف الحضور في الدورة', () => assert.equal(
    Array.isArray(days) ? days.filter(d => d.status && d.status !== 'no_record' && d.status !== 'none').length : null, Number(rowCount),
    `أيام التقرير=${Array.isArray(days) ? days.length : typeof days} وصفوف الجدول=${rowCount}`))
  const report = await ok(boss, '/reports/attendance', { from: CYCLE_FROM, to: CYCLE_TO })
  const reportRow = report.find(r => Number(r.employeeId) === eLate.id)
  const lateDays = Array.isArray(days) ? days.filter(d => d.status === 'late').length : null
  const absentDays = Array.isArray(days) ? days.filter(d => d.status === 'absent').length : null
  expect('شاشة حضور الموظف وتقرير الحضور بيقولوا نفس الأيام', () => assert.deepEqual(
    [lateDays, absentDays], [Number(reportRow?.lateDays), Number(reportRow?.absentDays)]))
})

test('RS24 — التصدير: ملف مراكز التكلفة يطابق أرقام الشاشة بعناوينه العربية، والفاضي يتصدّر نظيفًا', async () => {
  scene('RS24 التصدير')
  // التصدير كله في المتصفح (لا نقطة تصدير على الخادم). الباني الوحيد المشترك القابل للاستدعاء
  // هو exportCostCenterReportCsv؛ باقي الشاشات بانيها جوه مكوّن الصفحة نفسه.
  let captured = null
  global.document = { body: { appendChild() {}, removeChild() {} },
    createElement: () => ({ set href(v) {}, set download(v) {}, click() {}, remove() {} }) }
  const originalCreate = global.URL.createObjectURL
  global.URL.createObjectURL = blob => { captured = blob; return 'blob:test' }
  global.URL.revokeObjectURL = () => {}
  let builder
  try { builder = require(path.resolve(apiRoot, '..', 'src', 'lib', 'cost-center-report-api.ts')).exportCostCenterReportCsv }
  catch (error) {
    soft.push({ scenario: currentScenario, label: 'تحميل باني ملف التصدير', message: brief(error) })
    notCovered('CSV export (مراكز التكلفة)', 'تعذّر تحميل الباني')
    return
  }
  const csvOf = async report => { captured = null; builder(report); return captured ? (await captured.text()).replace(/^﻿/, '') : null }

  const report = await ok(boss, '/reports/cost-centers', { period: PERIOD })
  const text = await csvOf(report)
  covered('CSV export (مراكز التكلفة)', 'العناوين العربية والصفوف والإجمالي مقابل أرقام التقرير')
  const lines = (text ?? '').split('\r\n').filter(Boolean)
  expect('عناوين الأعمدة العربية كما هي', () => assert.equal(lines[0],
    'مركز التكلفة,الكود,كود الموظف,الموظف,الفرع,المسير,حالة المسير,الإجمالي,الخصومات,الصافي,حصة صاحب العمل في التأمينات'))
  const expectedRows = report.centers.reduce((sum, center) => sum + center.employees.length + 1, 0) + 1
  expect('عدد السطور = موظفو كل مركز + سطر إجمالي كل مركز + سطر إجمالي الشهر', () => assert.equal(lines.length - 1, expectedRows))
  // كل موظف بصافيه كما في التقرير، ومجموع سطور «إجمالي المركز» = إجمالي الشهر
  const cell = (line, index) => line.split(',')[index]
  for (const center of report.centers) {
    for (const employee of center.employees) {
      const line = lines.find(row => cell(row, 2) === (employee.employeeCode ?? '') && cell(row, 0) === center.name)
      expect(`سطر ${employee.employeeCode} في الملف = رقمه على الشاشة`, () => assert.deepEqual(
        [cell(line, 7), cell(line, 8), cell(line, 9)], [employee.gross, employee.deductions, employee.net]))
    }
    const totalLine = lines.find(row => cell(row, 0) === `إجمالي ${center.name}`)
    expect(`سطر إجمالي ${center.name} = مجموع موظفيه`, () => assert.deepEqual(
      [cell(totalLine, 9), cell(totalLine, 3)], [center.net, `${center.headcount} موظف`]))
  }
  const grand = lines[lines.length - 1]
  expect('سطر إجمالي الشهر في الملف = إجمالي التقرير', () => assert.deepEqual(
    [cell(grand, 0), cell(grand, 7), cell(grand, 8), cell(grand, 9)],
    ['إجمالي الشهر', report.totals.gross, report.totals.deductions, report.totals.net]))
  expect('لا مبلغ في الملف مختلف عن مبلغ الشاشة', () => assert.equal(
    sumC(report.centers.flatMap(c => c.employees).map(e => e.net)), C(report.totals.net)))

  // فترة فاضية: يتصدّر بلا خطأ (العناوين + سطر إجمالي بأصفار)
  const empty = await ok(boss, '/reports/cost-centers', { period: '2019-06' })
  const emptyText = await csvOf(empty)
  const emptyLines = (emptyText ?? '').split('\r\n').filter(Boolean)
  expect('الفاضي يتصدّر نظيفًا: عناوين + سطر إجمالي بصفر', () => assert.deepEqual(
    [emptyLines.length, cell(emptyLines[1] ?? '', 0), cell(emptyLines[1] ?? '', 9)], [2, 'إجمالي الشهر', '0.00']))
  global.URL.createObjectURL = originalCreate
  delete global.document

  // باقي التقارير: بانيها جوه الصفحة نفسها (مش قابل للاستدعاء من غير تصيير)، ومفيش نقطة تصدير على الخادم
  for (const route of ['payroll-register', 'payroll-cost', 'deductions', 'loans', 'overtime'])
    notCovered(`CSV export (${route})`, 'الباني جوه مكوّن الصفحة — لا وحدة قابلة للاستدعاء ولا نقطة على الخادم')
})

// ============================================================================
// ملخص: التغطية + كل تحقق «ناعم» فشل
// ============================================================================
test('ZZ — ملخص التغطية والملاحظات', () => {
  console.log('\n================ تغطية سطح التقارير ================')
  for (const [endpoint, state] of [...coverage.entries()].sort())
    console.log(`${state.covered ? '[✓ مغطّى]   ' : '[✗ غير مغطّى]'} ${endpoint}${state.note ? ` — ${state.note}` : ''}`)
  console.log(`\nسيناريوهات: ${scenarioNames.length} — تحققات: ${checks} — ناجحة: ${checks - soft.length} — فاشلة: ${soft.length}`)
  if (soft.length) {
    console.log('\n================ الملاحظات ================')
    soft.forEach((row, index) => console.log(`${index + 1}. [${row.scenario}] ${row.label}\n   ${row.message}`))
    console.log('===========================================\n')
  }
  assert.equal(soft.length, 0, `${soft.length} تحقق فاشل — التفاصيل فوق`)
})
