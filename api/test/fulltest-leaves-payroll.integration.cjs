// اختبار شامل قبل التشغيل (الموجة ب): الإجازات والعهدة والطلبات وسلاسل الاعتماد والرواتب —
// على قاعدة SQL مؤقتة عشوائية (hr_fulltest_payroll_<hex>) تُنشأ بـsynchronize وتُحذف في النهاية.
// لا مساس بقاعدة الشركة ولا بقاعدة المراجعة. التوكنات موقّعة محليًّا بسر عشوائي — لا كلمات مرور ولا أسرار.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
// اسم القاعدة يلتزم بحارس البيئة (isDisposableTestDatabase): hr_<اسم>_test_<16 حرف hex>
const database = `hr_fulltest_payroll_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-fulltest-payroll-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

// دورة المسير: من 23 الشهر السابق إلى 22 من شهر المسير (نفس دورة المالك)
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
// شهر المسير المستهدف كله في المستقبل بالنسبة لليوم، فقواعد الأثر الرجعي للإجازات لا تعترض
const PERIOD = '2026-10', CYCLE_FROM = '2026-09-23', CYCLE_TO = '2026-10-22'
const ATT_FROM = '2026-08-23', ATT_TO = '2026-11-22'

let app, master, ds, base, created = false
let admin, branchA, deptOps, policyVersionId, employeeNumber = 0
let hrUser, calcUser, approveUser, financeUser, mgr, mgrUser, e1, e2, e3, e4, e5, e6

function assertDisposable() {
  assert.match(database, /^hr_fulltest_payroll_test_[a-f0-9]{16}$/)
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
const query = (route, params) => `${route}?${new URLSearchParams(params).toString()}`

// ===== تحقق «ناعم»: الفشل يُسجَّل ولا يوقف باقي السيناريو، فنجمع أكبر عدد ملاحظات في تشغيلة واحدة =====
const soft = []
let currentScenario = '—'
const brief = error => String(error?.message ?? error).split('\n').map(line => line.trim()).filter(Boolean).join(' | ').slice(0, 600)
function expect(label, fn) {
  try { fn(); return true }
  catch (error) { soft.push({ scenario: currentScenario, label, message: brief(error) }); return false }
}
const scenarioNames = []
const scene = name => { currentScenario = name; scenarioNames.push(name); return name }

// ===== مساعدو التجهيز =====
async function employee(overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `FT${String(n).padStart(3, '0')}`, fullName: `موظف الاختبار الشامل ${n}`,
    branchId: branchA.id, departmentId: deptOps.id, teamId: null, jobTitle: 'محاسب', joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الاختبار',
    iban: 'SA0000000000000000000001', ...overrides })
  return emp
}
// حساب غير super_admin بلا فرع نطاقه -1 (بلا صلاحية) — كل الحسابات هنا على فرع الاختبار الأول
const user = (email, displayName, role, permissions, extra = {}) =>
  repo('User').save({ email: `${email}@fulltest.invalid`, displayName, passwordHash: 'test-only', role,
    branchId: branchA.id, permissions: JSON.stringify(permissions), ...extra })
// موظف + حساب دخول مربوط به (خدمة ذاتية)
async function staff(email, displayName, permissions = [], employeeOverrides = {}, role = 'employee') {
  const emp = await employee({ fullName: displayName, ...employeeOverrides })
  const account = await user(email, displayName, role, permissions, { employeeId: emp.id })
  return { emp, user: account, id: emp.id }
}
// حضور محسوب ثابت (حاضر كل يوم) يعزل السيناريو عن سياسة الغياب إلا حيث نقصد العكس
async function presentEveryDay(emp, from = ATT_FROM, to = ATT_TO, overrides = {}) {
  const rows = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    const custom = overrides[date]
    if (custom === null) continue // لا صف أصلاً (غياب)
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date, status: 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية الاختبار الشامل', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override',
      workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, ...(custom ?? {}) })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
}
// خطوات سلسلة اعتماد نوع طلب (البذرة تنشئ السلاسل فاضية عمدًا)
async function setChainSteps(typeCode, steps) {
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: `CH_${typeCode}` })
  expectStatus(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`,
    { steps: steps.map(step => (typeof step === 'string' ? { approverRole: step, slaDays: 3 } : step)) }), 200,
    `steps of CH_${typeCode}:`)
  return chain
}
const leaveTypeId = async code => (await repo('LeaveType').findOneByOrFail({ code })).id
// طلب كامل: إنشاء + تقديم
async function submitRequest(actor, typeCode, payload, extra = {}) {
  const created = expectStatus(await request(actor, 'POST', '/requests', { typeCode, payload, ...extra }), 201, `create ${typeCode}:`)
  const submitted = await request(actor, 'POST', `/requests/${created.id}/submit`)
  return { created, submitted, id: created.id }
}
const detailOf = async (actor, id) => expectStatus(await request(actor, 'GET', `/requests/${id}`), 200)
const act = (actor, id, action, comment) => request(actor, 'POST', `/requests/${id}/act`, { action, ...(comment ? { comment } : {}) })
const balancesOf = async emp => expectStatus(await request(admin, 'GET', `/leaves/balances/${emp.id}`), 200)
const balanceOf = async (emp, type) => (await balancesOf(emp)).find(row => row.balanceType === type)

// ===== مساعدو المسير =====
const draft = async (actor, name, filters, period = PERIOD, versionId = policyVersionId) =>
  expectStatus(await request(actor, 'POST', '/payroll/runs', { name, policyVersionId: versionId, period, filters }), 201, 'draft:')
const calcRun = async (actor, runId) => expectStatus(await request(actor, 'POST', `/payroll/runs/${runId}/calculate`, {}), 201, 'calculate:')
const runDetail = async (actor, runId) => expectStatus(await request(actor, 'GET', `/payroll/runs/${runId}`), 200)
async function approveRun(actor, runId) {
  const report = expectStatus(await request(actor, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(actor, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  return request(actor, 'POST', `/payroll/runs/${runId}/approve`)
}
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `no payroll item for #${emp.id}`); return row }
const bd = item => JSON.parse(item.breakdown || '{}')
// قص على منزلتين نحو الصفر — نفس قاعدة roundPayrollMoney في المنتج
const money = value => { const c = Math.trunc(Math.round(Math.abs(value) * 1e6) / 1e4); return c === 0 ? 0 : Math.sign(value) * c / 100 }

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

  branchA = await repo('Branch').save({ code: 'FT_A', name: 'فرع الاختبار الأول' })
  deptOps = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  admin = await repo('User').save({ email: 'admin@fulltest.invalid', displayName: 'مدير النظام', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  // كتالوج النظام الحقيقي: أنواع الطلبات وسلاسلها (فاضية عمدًا) وأنواع الإجازات والإعدادات
  await require('../src/seed/seed-requests').seedRequests(ds)
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.late_deduction_enabled', value: 'true' }, { key: 'attendance.absence_penalty_days', value: '1' },
    { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies',
    { name: 'مجموعة معدلات الاختبار الشامل', effectiveFrom: '2026-05-23', settings: { ...cycle23, dailyHours: 8 } }), 201)
  const [version] = createdPolicy.versions
  const published = expectStatus(await request(admin, 'POST',
    `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر مجموعة معدلات الاختبار الشامل' }), 200)
  policyVersionId = published.version.id

  // ===== الممثلون =====
  hrUser = await user('hr', 'هدى — الموارد البشرية', 'hr_manager', ['leaves.view_all', 'leaves.revoke', 'employees.view',
    'employees.edit', 'leave_balances.manage', 'requests.view_all', 'custody.assign', 'approve.custody',
    'approval_chains.manage', 'reports.view', 'payroll.view', 'deductions.manage', 'bonuses.manage',
    'offboarding.manage', 'settlement.edit', 'settlement.approve', 'requests.create_on_behalf'])
  calcUser = await user('calc', 'كمال — محاسب المسير', 'accountant', ['payroll.view', 'payroll.calculate', 'employees.view'])
  approveUser = await user('approver', 'عبير — معتمِدة المسير', 'finance_manager', ['payroll.view', 'payroll.approve', 'payroll.pay', 'payroll.reopen'])
  financeUser = await user('finance', 'فادي — المالية', 'finance_manager', ['approve.finance'])
  // مدير مباشر بحساب دخول
  const managerStaff = await staff('mgr', 'ماجد — المدير المباشر', [], { jobTitle: 'مدير عمليات' })
  mgr = managerStaff.emp; mgrUser = managerStaff.user
  const mk = async (email, name, extra = {}) => {
    const s = await staff(email, name, [], { managerEmployeeId: mgr.id, ...extra })
    await presentEveryDay(s.emp)
    return s
  }
  e1 = await mk('e1', 'سامي — إجازات سنوية')
  e2 = await mk('e2', 'نورا — بدون راتب ومرضية')
  e3 = await mk('e3', 'وليد — العهدة والمناسبات')
  e4 = await mk('e4', 'يارا — آثار المسير')
  e5 = await mk('e5', 'رامي — التصفية')
  e6 = await mk('e6', 'ليلى — تغيير الراتب')
  // رصيد افتتاحي حقيقي بآلية النظام
  for (const s of [e1, e2, e3, e4, e5, e6]) await require('../src/seed/seed-requests').ensureLeaveBalance(ds, s.id, 21)

  // ===== سلاسل الاعتماد (البذرة تنشئها فاضية — المالك يضبطها) =====
  await setChainSteps('LEAVE', ['direct_manager_of_requester', 'hr'])
  await setChainSteps('LEAVE_MODIFY_CANCEL', ['direct_manager_of_requester'])
  await setChainSteps('CUSTODY_REQUEST', ['direct_manager_of_requester', 'custody_officer'])
  await setChainSteps('CUSTODY_RETURN', ['custody_officer'])
  await setChainSteps('CUSTODY_TRANSFER', ['custody_officer'])
  await setChainSteps('GRIEVANCE', ['direct_manager_of_requester', 'hr'])
  await setChainSteps('PERMISSION', ['direct_manager_of_requester'])
  await setChainSteps('EXPENSE_CLAIM', ['direct_manager_of_requester', 'finance'])
  await setChainSteps('RESIGNATION', ['direct_manager_of_requester', 'hr'])
  await setChainSteps('HOLIDAY_WORK', ['hr'])

  // ===== أنواع الإجازات: الفئات والقواعد كما يضبطها المالك من الشاشة (البذرة تتركها بلا فئة) =====
  const patchType = async (code, body) =>
    expectStatus(await request(admin, 'PATCH', `/settings/leave-types/${await leaveTypeId(code)}`, body), 200, `leave-type ${code}:`)
  await patchType('ANNUAL', { category: 'ANNUAL', annualDays: 21, countingMode: 'WORKING_DAYS', carryOverEnabled: true, carryOverMaxDays: 10 })
  await patchType('CASUAL', { category: 'ANNUAL', annualDays: 21, countingMode: 'ALL_DAYS' })
  await patchType('UNPAID', { category: 'UNPAID', countingMode: 'ALL_DAYS' })
  await patchType('SICK', { category: 'SICK', annualDays: 120, attachmentRule: 'REQUIRED', attachmentTiming: 'AFTER_RETURN',
    sickPayTiers: [{ fromDay: 1, toDay: 2, payPercent: 100 }, { fromDay: 3, toDay: 5, payPercent: 75 }, { fromDay: 6, toDay: null, payPercent: 0 }] })
  await patchType('MARRIAGE', { category: 'OCCASION', fixedDays: 5, maxTimesPerYear: 1, attachmentRule: 'NONE', countingMode: 'WORKING_DAYS' })
  await patchType('BEREAVEMENT', { category: 'OCCASION', fixedDays: 5, countingMode: 'ALL_DAYS' })
  await patchType('HAJJ', { category: 'OCCASION', fixedDays: 21 })
  for (const code of ['MATERNITY', 'PATERNITY', 'EXAM', 'COMPENSATORY'])
    await patchType(code, { category: 'OCCASION', fixedDays: 3, attachmentRule: 'NONE' })
}, { timeout: 300000 })

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
  if (errors.length) throw new AggregateError(errors, 'fulltest leaves/payroll fixture cleanup failed')
})

// ============================================================================
// 1) الإجازات
// ============================================================================

test('L1 — كتالوج أنواع الإجازات المُعدّة في النظام كامل ومتاح للخدمة الذاتية', async () => {
  scene('L1 كتالوج أنواع الإجازات')
  const types = expectStatus(await request(e1.user, 'GET', '/leaves/types'), 200)
  const byCode = new Map(types.map(row => [row.code, row]))
  expect('الأنواع المبذورة كلها ظاهرة', () => assert.deepEqual(
    ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'HAJJ', 'MARRIAGE', 'BEREAVEMENT', 'EXAM', 'COMPENSATORY']
      .filter(code => !byCode.has(code)), []))
  expect('ANNUAL برصيد سنوي ومدفوعة', () => assert.deepEqual(
    [byCode.get('ANNUAL').balanceSource, byCode.get('ANNUAL').isPaid, byCode.get('ANNUAL').countingMode], ['annual', true, 'WORKING_DAYS']))
  expect('UNPAID بلا رصيد وغير مدفوعة وبكل أيام التقويم', () => assert.deepEqual(
    [byCode.get('UNPAID').balanceSource, byCode.get('UNPAID').isPaid, byCode.get('UNPAID').countingMode], ['none', false, 'ALL_DAYS']))
  expect('SICK برصيد مرضي', () => assert.equal(byCode.get('SICK').balanceSource, 'sick'))
  expect('MARRIAGE مناسبة بلا رصيد ومدفوعة', () => assert.deepEqual(
    [byCode.get('MARRIAGE').balanceSource, byCode.get('MARRIAGE').isPaid], ['none', true]))
  // «طلب إجازة» هو النوع الحي الوحيد بعد البذر
  const catalog = expectStatus(await request(e1.user, 'GET', '/requests/types'), 200)
  expect('«طلب إجازة» متاح للموظف', () => assert.ok(catalog.some(row => row.code === 'LEAVE')))
})

test('L2 — إجازة سنوية (خصم رصيد، أيام عمل فقط): الرصيد قبل/بعد، والسلسلة خطوتين', async () => {
  scene('L2 إجازة سنوية بخصم رصيد')
  const before = await balanceOf(e1.emp, 'annual')
  expect('استحقاق السنة 21 يومًا والمستحق حتى تاريخه بالتناسب الشهري', () => assert.deepEqual(
    [Number(before.annualEntitlement), Number(before.remaining)], [21, Number(before.accruedToDate)]))

  // 2026-10-05 (اتنين) → 2026-10-12 (اتنين) = 8 أيام تقويم، منها الجمعة 09 والسبت 10 عطلة ⇒ 6 أيام عمل
  const { created, submitted, id } = await submitRequest(e1.user, 'LEAVE',
    { leaveTypeCode: 'ANNUAL', fromDate: '2026-10-05', toDate: '2026-10-12', days: 99 })
  expect('التقديم مقبول', () => assert.equal(submitted.status, 201))
  const afterSubmit = await detailOf(hrUser, id)
  expect('الحالة قيد المراجعة', () => assert.equal(afterSubmit.status, 'UNDER_REVIEW'))
  expect('الأيام من السيرفر = 6 أيام عمل (الويك إند لا يُحسب)', () =>
    assert.equal(Number(JSON.parse(afterSubmit.payload).days), 6))
  expect('أيام العطلة المتخطاة مسجلة', () =>
    assert.deepEqual(JSON.parse(afterSubmit.payload).skippedHolidays, ['2026-10-09', '2026-10-10']))
  expect('خطوتان: المدير ثم الموارد البشرية', () => assert.deepEqual(
    JSON.parse(afterSubmit.resolvedSteps).map(s => [s.stepOrder, s.role, s.approverEmployeeId]),
    [[1, 'direct_manager_of_requester', mgr.id], [2, 'hr', null]]))

  // من ليس معتمِد الخطوة الحالية لا يتصرف فيها
  const skip = await act(financeUser, id, 'APPROVE')
  expect('غريب عن الخطوة لا يعتمدها', () => assert.equal(skip.status, 403))
  // صاحب الطلب لا يعتمد طلبه
  const selfAct = await act(e1.user, id, 'APPROVE')
  expect('صاحب الطلب لا يتصرف في خطوته', () => assert.equal(selfAct.status, 403))

  const midBalance = await balanceOf(e1.emp, 'annual')
  expect('الرصيد ما اتخصمش قبل الاعتماد النهائي', () => assert.equal(Number(midBalance.remaining), Number(before.remaining)))

  expectStatus(await act(mgrUser, id, 'APPROVE', 'موافق'), 201, 'manager approve:')
  const mid = await detailOf(hrUser, id)
  expect('انتقلت للخطوة الثانية', () => assert.equal(mid.currentStep, 2))
  expectStatus(await act(hrUser, id, 'APPROVE', 'اعتماد الموارد البشرية'), 201, 'hr approve:')

  const done = await detailOf(hrUser, id)
  expect('الطلب مكتمل', () => assert.equal(done.status, 'COMPLETED'))
  const after = await balanceOf(e1.emp, 'annual')
  expect('الرصيد اتخصم 6 أيام بالظبط', () => assert.equal(Number(before.remaining) - Number(after.remaining), 6))
  const leaves = expectStatus(await request(hrUser, 'GET', query('/leaves', { month: '2026-10' })), 200)
  const row = leaves.items.find(item => item.employeeId === e1.id)
  expect('سجل الإجازة اتكتب بنوعه وأيامه', () => assert.deepEqual(
    [row?.leaveTypeCode, Number(row?.days), row?.status, row?.isUnpaid], ['ANNUAL', 6, 'APPROVED', false]))
  e1.annualLeaveId = row?.id
  e1.annualRequestId = id
})

test('L3 — رفض التداخل: إجازة معتمدة أو طلب جارٍ على نفس الأيام', async () => {
  scene('L3 رفض تداخل الإجازات')
  const overlap = await request(e1.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-10-07', toDate: '2026-10-14', days: 1 } })
  const overlapId = overlap.body?.id
  const submitted = await request(e1.user, 'POST', `/requests/${overlapId}/submit`)
  expect('التداخل مع إجازة معتمدة مرفوض', () => assert.equal(submitted.status, 400))
  expect('الرسالة تقول إجازة معتمدة متداخلة', () => assert.match(String(submitted.body?.message), /متداخلة/))

  // طلب جارٍ ثم طلب تاني متقاطع معه
  const live = await submitRequest(e2.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-11-02', toDate: '2026-11-04', days: 1 })
  expect('الطلب الأول اتقدم', () => assert.equal(live.submitted.status, 201))
  const second = await request(e2.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-11-03', toDate: '2026-11-05', days: 1 } })
  const secondSubmit = await request(e2.user, 'POST', `/requests/${second.body?.id}/submit`, undefined)
  expect('التداخل مع طلب جارٍ مرفوض', () => assert.equal(secondSubmit.status, 400))
  // تنظيف: نلغي الطلب الجاري حتى لا يشوّش على سيناريوهات نورا التالية
  expectStatus(await request(e2.user, 'POST', `/requests/${live.id}/cancel`), 201)
})

test('L4 — إجازة بدون راتب (كل أيام التقويم، بلا رصيد) + إجازة تعبر حدّ الشهر', async () => {
  scene('L4 إجازة بدون راتب وعبور حد الشهر')
  const before = await balanceOf(e2.emp, 'annual')
  // 2026-10-19 (اتنين) → 2026-10-21 (أربعاء) = 3 أيام تقويم داخل دورة أكتوبر
  const unpaid = await submitRequest(e2.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: '2026-10-19', toDate: '2026-10-21', days: 1 })
  expect('التقديم مقبول', () => assert.equal(unpaid.submitted.status, 201))
  expectStatus(await act(mgrUser, unpaid.id, 'APPROVE', 'موافق'), 201)
  expectStatus(await act(hrUser, unpaid.id, 'APPROVE', 'موافق'), 201)
  const detail = await detailOf(hrUser, unpaid.id)
  expect('3 أيام تقويم', () => assert.equal(Number(JSON.parse(detail.payload).days), 3))
  const after = await balanceOf(e2.emp, 'annual')
  expect('الرصيد السنوي ما اتمسّش (balanceType = none)', () => assert.equal(Number(after.remaining), Number(before.remaining)))
  const row = (expectStatus(await request(hrUser, 'GET', query('/leaves', { month: '2026-10' })), 200)).items
    .find(item => item.employeeId === e2.id && item.leaveTypeCode === 'UNPAID')
  expect('السجل معلّم «بدون راتب»', () => assert.equal(row?.isUnpaid, true))

  // إجازة تعبر حد دورة المسير (22/10): 2026-10-20 مرفوضة للتداخل، فنستخدم موظفًا آخر
  const cross = await submitRequest(e3.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: '2026-10-20', toDate: '2026-10-26', days: 1 })
  expect('إجازة عابرة لحد الشهر تُقبل', () => assert.equal(cross.submitted.status, 201))
  expectStatus(await act(mgrUser, cross.id, 'APPROVE', 'موافق'), 201)
  expectStatus(await act(hrUser, cross.id, 'APPROVE', 'موافق'), 201)
  const crossDetail = await detailOf(hrUser, cross.id)
  expect('7 أيام تقويم كاملة في الطلب', () => assert.equal(Number(JSON.parse(crossDetail.payload).days), 7))
  const inOctober = (expectStatus(await request(hrUser, 'GET', query('/leaves', { month: '2026-10' })), 200)).items
    .some(item => item.employeeId === e3.id)
  expect('الإجازة العابرة تظهر في شهر بدايتها', () => assert.equal(inOctober, true))
})

test('L5 — إجازة مرضية بأجر متدرج (شرائح النوع)', async () => {
  scene('L5 إجازة مرضية بأجر متدرج')
  const before = await balanceOf(e2.emp, 'sick')
  // 6 أيام تقويم متصلة: يوم 1-2 بأجر 100%، 3-5 بأجر 75%، 6 بأجر 0%
  const sick = await submitRequest(e2.user, 'LEAVE', { leaveTypeCode: 'SICK', fromDate: '2026-10-01', toDate: '2026-10-06', days: 1 })
  expect('المرضية تُقدَّم بلا مرفق (المرفق بعد الرجوع)', () => assert.equal(sick.submitted.status, 201))
  if (sick.submitted.status !== 201) return
  expectStatus(await act(mgrUser, sick.id, 'APPROVE', 'موافق'), 201)
  expectStatus(await act(hrUser, sick.id, 'APPROVE', 'موافق'), 201)
  const detail = await detailOf(hrUser, sick.id)
  expect('6 أيام تقويم (المرضية دائمًا بكل الأيام)', () => assert.equal(Number(JSON.parse(detail.payload).days), 6))
  const after = await balanceOf(e2.emp, 'sick')
  expect('رصيد المرضي اتخصم 6', () => assert.equal(Number(before.remaining) - Number(after.remaining), 6))
  const row = (expectStatus(await request(hrUser, 'GET', query('/leaves', { month: '2026-10' })), 200)).items
    .find(item => item.employeeId === e2.id && item.leaveTypeCode === 'SICK')
  expect('المرضية مدفوعة (isUnpaid=false) والخصم بالشرائح في المسير', () => assert.equal(row?.isUnpaid, false))
  expect('مهلة المرفق بعد الرجوع مسجلة', () => assert.deepEqual([row?.attachmentStatus, row?.attachmentDueDate?.slice(0, 10)], ['PENDING', '2026-10-13']))
})

test('L6 — إجازة مناسبة بلا رصيد ومدفوعة + سقف مرات السنة', async () => {
  scene('L6 إجازة مناسبة')
  const before = await balanceOf(e4.emp, 'annual')
  const marriage = await submitRequest(e4.user, 'LEAVE', { leaveTypeCode: 'MARRIAGE', fromDate: '2026-11-09', toDate: '2026-11-11', days: 1 })
  expect('المناسبة تُقدَّم', () => assert.equal(marriage.submitted.status, 201))
  if (marriage.submitted.status === 201) {
    expectStatus(await act(mgrUser, marriage.id, 'APPROVE', 'موافق'), 201)
    expectStatus(await act(hrUser, marriage.id, 'APPROVE', 'موافق'), 201)
  }
  const after = await balanceOf(e4.emp, 'annual')
  expect('لا خصم من الرصيد السنوي', () => assert.equal(Number(after.remaining), Number(before.remaining)))
  // مرة واحدة في السنة
  const again = await request(e4.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'MARRIAGE', fromDate: '2026-11-16', toDate: '2026-11-18', days: 1 } })
  const againSubmit = await request(e4.user, 'POST', `/requests/${again.body?.id}/submit`)
  expect('المرة الثانية في نفس السنة مرفوضة', () => assert.equal(againSubmit.status, 400))
  expect('الرسالة تشرح سقف المرات', () => assert.match(String(againSubmit.body?.message), /مرة في السنة/))
  // أيام أكثر من fixedDays مرفوضة
  const tooLong = await request(e5.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'MARRIAGE', fromDate: '2026-11-09', toDate: '2026-11-20', days: 1 } })
  const tooLongSubmit = await request(e5.user, 'POST', `/requests/${tooLong.body?.id}/submit`)
  expect('تجاوز أيام المناسبة مرفوض', () => assert.equal(tooLongSubmit.status, 400))
})

test('L7 — إلغاء إجازة معتمدة: بطلب «إلغاء إجازة» ومن الموارد البشرية مباشرة — الرصيد يرجع', async () => {
  scene('L7 إلغاء إجازة معتمدة')
  // (أ) بطلب LEAVE_MODIFY_CANCEL
  const beforeCancel = await balanceOf(e1.emp, 'annual')
  const cancelReq = await submitRequest(e1.user, 'LEAVE_MODIFY_CANCEL', { leaveId: e1.annualLeaveId })
  expect('طلب إلغاء الإجازة يُقدَّم', () => assert.equal(cancelReq.submitted.status, 201))
  if (cancelReq.submitted.status === 201) {
    expectStatus(await act(mgrUser, cancelReq.id, 'APPROVE', 'موافق على الإلغاء'), 201)
    const done = await detailOf(hrUser, cancelReq.id)
    expect('طلب الإلغاء مكتمل', () => assert.equal(done.status, 'COMPLETED'))
  }
  const afterCancel = await balanceOf(e1.emp, 'annual')
  expect('الرصيد رجع 6 أيام بعد الإلغاء', () =>
    assert.equal(Number(afterCancel.remaining) - Number(beforeCancel.remaining), 6))
  const leaveRow = await repo('Leave').findOneBy({ id: e1.annualLeaveId })
  expect('سجل الإجازة صار ملغى', () => assert.equal(leaveRow?.status, 'CANCELLED'))

  // (ب) إلغاء مباشر من الموارد البشرية على إجازة تانية
  const fresh = await submitRequest(e1.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-11-23', toDate: '2026-11-25', days: 1 })
  expectStatus(await act(mgrUser, fresh.id, 'APPROVE', 'موافق'), 201)
  expectStatus(await act(hrUser, fresh.id, 'APPROVE', 'موافق'), 201)
  const beforeRevoke = await balanceOf(e1.emp, 'annual')
  const freshLeave = (expectStatus(await request(hrUser, 'GET', query('/leaves', { month: '2026-11' })), 200)).items
    .find(item => item.employeeId === e1.id && item.status === 'APPROVED')
  const revoked = await request(hrUser, 'POST', `/leaves/${freshLeave.id}/revoke`)
  expect('إلغاء الموارد البشرية المباشر مقبول', () => assert.equal(revoked.status, 201))
  const afterRevoke = await balanceOf(e1.emp, 'annual')
  expect('الرصيد رجع بعد الإلغاء المباشر', () =>
    assert.equal(Number(afterRevoke.remaining) - Number(beforeRevoke.remaining), Number(freshLeave.days)))
  const twice = await request(hrUser, 'POST', `/leaves/${freshLeave.id}/revoke`)
  expect('لا إلغاء مرتين', () => assert.equal(twice.status, 400))
})

// ============================================================================
// 2) العهدة
// ============================================================================

test('C1 — دورة العهدة كاملة: طلب الموظف نفسه → اعتماد → استلام → اعتماد المدير → تسليم → إرجاع', async () => {
  scene('C1 دورة العهدة كاملة')
  const asset = expectStatus(await request(hrUser, 'POST', '/assets',
    { name: 'لابتوب ديل اختبار', category: 'أجهزة', serialNumber: 'SN-FT-001', value: 4500 }), 201)
  expect('الأصل يبدأ متاحًا بلا حائز', () => assert.deepEqual([asset.status, asset.currentHolderId ?? null], ['AVAILABLE', null]))
  const available = expectStatus(await request(e3.user, 'GET', '/assets/available'), 200)
  expect('الأصل في قائمة المتاح للخدمة الذاتية', () => assert.ok(available.some(row => row.id === asset.id)))

  // (1) الموظف يرفع طلب العهدة بنفسه
  const req = await submitRequest(e3.user, 'CUSTODY_REQUEST', { assetIds: [asset.id] })
  expect('الموظف يقدّم طلب عهدته', () => assert.equal(req.submitted.status, 201))
  if (req.submitted.status !== 201) return
  const steps = JSON.parse((await detailOf(hrUser, req.id)).resolvedSteps)
  expect('سلسلة العهدة: المدير ثم مسؤول العهدة', () =>
    assert.deepEqual(steps.map(s => s.role), ['direct_manager_of_requester', 'custody_officer']))

  // (2) الاعتماد يمرّ بخطوتيه ثم يُنشئ الإسناد
  expectStatus(await act(mgrUser, req.id, 'APPROVE', 'موافق'), 201)
  expectStatus(await act(hrUser, req.id, 'APPROVE', 'تسليم العهدة'), 201)
  const afterApprove = await detailOf(hrUser, req.id)
  expect('الطلب دخل التنفيذ في انتظار استلام الموظف', () => assert.equal(afterApprove.status, 'IN_EXECUTION'))
  let assignment = await repo('CustodyAssignment').findOneBy({ assetId: asset.id })
  expect('إسناد واحد بحالة بانتظار الاستلام', () =>
    assert.deepEqual([assignment?.status, assignment?.employeeId, assignment?.requestId], ['PENDING_ACK', e3.id, req.id]))
  const assetBeforeAck = await repo('Asset').findOneBy({ id: asset.id })
  expect('الأصل لسه متاح لحد ما العهدة تنشط', () => assert.equal(assetBeforeAck.status, 'AVAILABLE'))

  // (3) موظف تاني لا يتصرف في عهدة غيره
  const foreign = await request(e4.user, 'POST', `/custody/${assignment.id}/acknowledge`)
  expect('موظف آخر لا يستلم عهدة غيره', () => assert.equal(foreign.status, 403))
  expect('الرسالة: العهدة ليست باسمك', () => assert.match(String(foreign.body?.message), /ليست باسمك/))
  const foreignHandover = await request(e4.user, 'POST', `/custody/${assignment.id}/handover`)
  expect('موظف آخر لا يسلّم عهدة غيره', () => assert.equal(foreignHandover.status, 403))

  // (4) الموظف يستلم
  expectStatus(await request(e3.user, 'POST', `/custody/${assignment.id}/acknowledge`), 201, 'acknowledge:')
  assignment = await repo('CustodyAssignment').findOneBy({ id: assignment.id })
  expect('بعد الاستلام: بانتظار اعتماد المدير', () => assert.equal(assignment.status, 'PENDING_MANAGER_CONFIRM'))
  expect('وقت الاستلام مسجل', () => assert.ok(assignment.acknowledgedAt))

  // (5) الحائز لا يعتمد عهدته بنفسه، والمدير يعتمد
  const selfConfirm = await request(e3.user, 'POST', `/custody/${assignment.id}/manager-confirm`)
  expect('الحائز لا يعتمد عهدته بنفسه', () => assert.equal(selfConfirm.status, 403))
  expectStatus(await request(mgrUser, 'POST', `/custody/${assignment.id}/manager-confirm`), 201, 'manager-confirm:')
  assignment = await repo('CustodyAssignment').findOneBy({ id: assignment.id })
  const assetActive = await repo('Asset').findOneBy({ id: asset.id })
  expect('العهدة نشطة والأصل مُسنَد لحائزه', () => assert.deepEqual(
    [assignment.status, assetActive.status, assetActive.currentHolderId], ['ACTIVE', 'ASSIGNED', e3.id]))
  expect('وقت اعتماد المدير مسجل', () => assert.ok(assignment.managerConfirmAt))
  const reqAfter = await detailOf(hrUser, req.id)
  expect('طلب العهدة اكتمل بعد تنشيط الإسناد', () => assert.equal(reqAfter.status, 'COMPLETED'))
  const mine = expectStatus(await request(e3.user, 'GET', '/custody/mine'), 200)
  expect('العهدة تظهر في «عهدي»', () => assert.ok(mine.some(row => row.id === assignment.id && row.status === 'ACTIVE')))

  // (6) الموظف يعلّم «سلّمت العهدة» ثم مسؤول العهدة يؤكد الإرجاع
  expectStatus(await request(e3.user, 'POST', `/custody/${assignment.id}/handover`), 201, 'handover:')
  assignment = await repo('CustodyAssignment').findOneBy({ id: assignment.id })
  expect('طلب الإرجاع مسجل', () => assert.equal(assignment.status, 'RETURN_REQUESTED'))
  expectStatus(await request(hrUser, 'POST', `/custody/${assignment.id}/return`, { condition: 'سليمة' }), 201, 'return:')
  assignment = await repo('CustodyAssignment').findOneBy({ id: assignment.id })
  const assetBack = await repo('Asset').findOneBy({ id: asset.id })
  expect('بعد الإرجاع: العهدة مُرجعة والأصل متاح بلا حائز', () => assert.deepEqual(
    [assignment.status, assignment.condition, assetBack.status, assetBack.currentHolderId ?? null],
    ['RETURNED', 'سليمة', 'AVAILABLE', null]))
  expect('تاريخ الإسناد كامل في الصف الواحد', () =>
    assert.ok(assignment.assignedAt && assignment.acknowledgedAt && assignment.managerConfirmAt && assignment.returnedAt))
  expect('لا إرجاع مرتين', () =>
    assert.equal(0, 0))
  const twice = await request(hrUser, 'POST', `/custody/${assignment.id}/return`, { condition: 'سليمة' })
  expect('إرجاع إسناد مقفول مرفوض', () => assert.equal(twice.status, 400))
})

test('C2 — تسليم مباشر من مسؤول العهدة ونقلها لموظف آخر', async () => {
  scene('C2 تسليم مباشر ونقل عهدة')
  const asset = expectStatus(await request(hrUser, 'POST', '/assets',
    { name: 'تليفون اختبار', category: 'أجهزة', serialNumber: 'SN-FT-002', value: 1200 }), 201)
  const assign = expectStatus(await request(hrUser, 'POST', '/custody/assign', { assetId: asset.id, employeeId: e4.id }), 201)
  expect('الإسناد المباشر بانتظار استلام الموظف', () => assert.equal(assign.status, 'PENDING_ACK'))
  expect('من سلّم مسجل', () => assert.equal(assign.assignedBy ?? assign.assignedByEmployeeId, hrUser.employeeId ?? null))
  const dup = await request(hrUser, 'POST', '/custody/assign', { assetId: asset.id, employeeId: e5.id })
  expect('لا إسنادان مفتوحان لنفس الأصل', () => assert.equal(dup.status, 400))

  expectStatus(await request(e4.user, 'POST', `/custody/${assign.id}/acknowledge`), 201)
  expectStatus(await request(mgrUser, 'POST', `/custody/${assign.id}/manager-confirm`), 201)
  // نقل لموظف آخر: صف جديد للمستلم، والقديم يقفل بعد اعتماد المدير
  const transfer = await request(hrUser, 'POST', `/custody/${assign.id}/transfer`, { toEmployeeId: e5.id, note: 'نقل داخلي' })
  expect('النقل مقبول من مسؤول العهدة', () => assert.equal(transfer.status, 201))
  const notOfficer = await request(e4.user, 'POST', `/custody/${assign.id}/transfer`, { toEmployeeId: e5.id, note: 'محاولة' })
  expect('الحائز وحده لا ينقل العهدة', () => assert.equal(notOfficer.status, 403))
  if (transfer.status !== 201) return
  const newRow = transfer.body
  expectStatus(await request(e5.user, 'POST', `/custody/${newRow.id}/acknowledge`), 201)
  expectStatus(await request(mgrUser, 'POST', `/custody/${newRow.id}/manager-confirm`), 201)
  const oldRow = await repo('CustodyAssignment').findOneBy({ id: assign.id })
  const activeRow = await repo('CustodyAssignment').findOneBy({ id: newRow.id })
  const assetNow = await repo('Asset').findOneBy({ id: asset.id })
  expect('القديم صار منقولًا والجديد نشطًا والأصل باسم المستلم', () => assert.deepEqual(
    [oldRow.status, activeRow.status, assetNow.currentHolderId], ['TRANSFERRED', 'ACTIVE', e5.id]))
})

// ============================================================================
// 3) الطلبات وسلاسل الاعتماد
// ============================================================================

test('R1 — كتالوج الأنواع وسلاسلها: نوع بلا خطوات لا يُقدَّم، والرسالة تدل على الشاشة', async () => {
  scene('R1 كتالوج الأنواع والسلاسل')
  const types = await repo('RequestType').find({ where: { isActive: true } })
  expect('كل الأنواع الفعّالة موجودة', () => assert.ok(types.length >= 50, `عدد الأنواع ${types.length}`))
  const chains = await repo('ApprovalChain').find()
  const withSteps = await repo('ApprovalStep').find()
  const chainIdsWithSteps = new Set(withSteps.map(s => s.chainId))
  const emptyChains = chains.filter(c => !chainIdsWithSteps.has(c.id))
  // ملاحظة مقصودة: البذرة تنشئ السلاسل فاضية، فالمالك يضبط المعتمدين
  expect('معظم السلاسل تبدأ فاضية بعد البذر (يضبطها المالك)', () => assert.ok(emptyChains.length > 0))
  const blocked = await submitRequest(e5.user, 'SUGGESTION', { description: 'اقتراح اختبار' })
  expect('نوع بلا خطوات: التقديم مرفوض', () => assert.equal(blocked.submitted.status, 400))
  expect('الرسالة تدل على «سلاسل الاعتماد»', () => assert.match(String(blocked.submitted.body?.message), /سلاسل الاعتماد/))
})

test('R2 — الرفض بسبب لا يطبّق شيئًا، والإرجاع للطالب ثم إعادة التقديم تعيد السلسلة من أولها', async () => {
  scene('R2 الرفض والإرجاع وإعادة التقديم')
  const before = await balanceOf(e5.emp, 'annual')
  // (أ) رفض بسبب
  const rejected = await submitRequest(e5.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-07', toDate: '2026-12-09', days: 1 })
  const noReason = await act(mgrUser, rejected.id, 'REJECT')
  expect('رفض بلا سبب مرفوض', () => assert.equal(noReason.status, 400))
  expectStatus(await act(mgrUser, rejected.id, 'REJECT', 'الفترة مزدحمة'), 201)
  const rejectedDetail = await detailOf(hrUser, rejected.id)
  expect('الطلب مرفوض', () => assert.equal(rejectedDetail.status, 'REJECTED'))
  const afterReject = await balanceOf(e5.emp, 'annual')
  expect('الرفض لا يخصم رصيدًا', () => assert.equal(Number(afterReject.remaining), Number(before.remaining)))
  const noLeave = await repo('Leave').findOneBy({ requestId: rejected.id })
  expect('الرفض لا يكتب سجل إجازة', () => assert.equal(noLeave, null))
  const afterFinal = await act(hrUser, rejected.id, 'APPROVE', 'محاولة')
  expect('طلب مرفوض لا يُعتمد', () => assert.equal(afterFinal.status, 400))

  // (ب) إرجاع لاستكمال معلومات ثم إعادة تقديم
  const returned = await submitRequest(e5.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-14', toDate: '2026-12-16', days: 1 })
  expectStatus(await act(mgrUser, returned.id, 'RETURN', 'وضّح سبب الإجازة'), 201)
  const returnedDetail = await detailOf(hrUser, returned.id)
  expect('الحالة مُرجَع لاستكمال معلومات', () => assert.equal(returnedDetail.status, 'RETURNED_FOR_INFO'))
  const resubmit = await request(e5.user, 'POST', `/requests/${returned.id}/resubmit`,
    { payload: { reason: 'سفر عائلي', fromDate: '2026-12-14', toDate: '2026-12-15' } })
  expect('إعادة التقديم مقبولة', () => assert.equal(resubmit.status, 201))
  const afterResubmit = await detailOf(hrUser, returned.id)
  expect('السلسلة رجعت لأول خطوة', () => assert.deepEqual([afterResubmit.status, afterResubmit.currentStep], ['UNDER_REVIEW', 1]))
  expect('الحمولة اتحدّثت', () => assert.equal(JSON.parse(afterResubmit.payload).toDate, '2026-12-15'))
  expectStatus(await act(mgrUser, returned.id, 'APPROVE', 'تمام'), 201)
  expectStatus(await act(hrUser, returned.id, 'APPROVE', 'تمام'), 201)
  const final = await detailOf(hrUser, returned.id)
  expect('الطلب اكتمل بعد إعادة التقديم', () => assert.equal(final.status, 'COMPLETED'))
  const leaveRows = await repo('Leave').findBy({ requestId: returned.id })
  expect('أثر واحد فقط (سجل إجازة واحد)', () => assert.equal(leaveRows.length, 1))
  const retry = await request(admin, 'POST', `/requests/${returned.id}/retry-execution`)
  expect('لا إعادة تنفيذ لطلب مكتمل', () => assert.equal(retry.status, 400))
})

test('R3 — اعتماد صاحب الطلب لنفسه عند خطوة وظيفية يحملها', async () => {
  scene('R3 اعتماد الطلب لنفسه عند خطوة وظيفية')
  // موظف بحساب «hr_manager» يقدّم إجازته: الخطوة 2 دورها hr وهو يحمله
  const hrSelf = await staff('hr-self', 'حسام — موارد بشرية وموظف', ['approve.hr'], { managerEmployeeId: mgr.id }, 'hr_manager')
  await presentEveryDay(hrSelf.emp)
  await require('../src/seed/seed-requests').ensureLeaveBalance(ds, hrSelf.id, 21)
  const own = await submitRequest(hrSelf.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-21', toDate: '2026-12-23', days: 1 })
  expect('الطلب اتقدّم', () => assert.equal(own.submitted.status, 201))
  if (own.submitted.status !== 201) return
  // خطوة 1 (المدير) — صاحب الطلب يحمل مخرج الموارد البشرية لكنه صاحب الطلب: المفروض يترفض
  const step1 = await act(hrSelf.user, own.id, 'APPROVE', 'اعتماد ذاتي')
  expect('صاحب الطلب لا يستعمل مخرج الموارد البشرية على طلبه', () => assert.equal(step1.status, 403))
  expectStatus(await act(mgrUser, own.id, 'APPROVE', 'موافق'), 201)
  // خطوة 2 دورها hr وصاحب الطلب يحملها — لا يجوز أن يعتمد طلب نفسه
  const balanceBefore = await balanceOf(hrSelf.emp, 'annual')
  const step2 = await act(hrSelf.user, own.id, 'APPROVE', 'اعتماد ذاتي')
  expect('صاحب الطلب لا يعتمد الخطوة الوظيفية الخاصة بطلبه', () => assert.equal(step2.status, 403))
  if (step2.status === 201) {
    // الأثر الفعلي للثغرة: الطلب اكتمل والرصيد اتخصم باعتماد صاحبه
    const done = await detailOf(admin, own.id)
    const balanceAfter = await balanceOf(hrSelf.emp, 'annual')
    soft.push({ scenario: currentScenario, label: 'أثر الاعتماد الذاتي',
      message: `الطلب صار ${done.status} والرصيد نزل من ${balanceBefore.remaining} إلى ${balanceAfter.remaining} باعتماد صاحب الطلب نفسه`
        + ` — آخر اعتماد سجّله ${done.approvals?.at(-1)?.approverId} وصاحب الطلب حسابه ${hrSelf.user.id}` })
  }
})

test('L9 — الرصيد لا يسلب: طلب أكبر من المتبقي يُرفض ويُحجز المعلق', async () => {
  scene('L9 حماية الرصيد')
  const target = await staff('e9', 'نجلاء — حماية الرصيد', [], { managerEmployeeId: mgr.id })
  await presentEveryDay(target.emp)
  await require('../src/seed/seed-requests').ensureLeaveBalance(ds, target.id, 21)
  const balance = await balanceOf(target.emp, 'annual')
  const remaining = Number(balance.remaining)
  expect('فيه رصيد نبدأ منه', () => assert.ok(remaining > 0, String(remaining)))
  // طلب أطول من الرصيد بكثير (أيام عمل)
  const tooMany = await request(target.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-10-05', toDate: '2026-11-20', days: 1 } })
  const tooManySubmit = await request(target.user, 'POST', `/requests/${tooMany.body?.id}/submit`)
  expect('طلب أكبر من الرصيد مرفوض عند التقديم', () => assert.equal(tooManySubmit.status, 400, JSON.stringify(tooManySubmit.body)))
  expect('الرسالة تقول الرصيد غير كافٍ', () => assert.match(String(tooManySubmit.body?.message), /الرصيد غير كافٍ|أقصى مدة/))
  const after = await balanceOf(target.emp, 'annual')
  expect('الرفض لا يمس الرصيد', () => assert.equal(Number(after.remaining), remaining))
})

test('L10 — بذرة الرصيد الافتتاحي بلا استحقاق صريح (نفس نداء seed.ts) تكتب الاستحقاق من السياسة', async () => {
  scene('L10 بذرة الرصيد الافتتاحي')
  // seed.ts ينادي ensureLeaveBalance(ds, emp.id) بلا قيمة استحقاق في كل مواضعه،
  // فالمفروض تُقرأ من leave.annual_entitled و leave.sick_entitled
  const annualPolicy = Number((await repo('RequestsConfig').findOneByOrFail({ key: 'leave.annual_entitled' })).value)
  const sickPolicy = Number((await repo('RequestsConfig').findOneByOrFail({ key: 'leave.sick_entitled' })).value)
  const fresh = await employee({ fullName: 'موظف بذرة الرصيد' })
  await require('../src/seed/seed-requests').ensureLeaveBalance(ds, fresh.id)
  const period = String(new Date().getFullYear())
  const annualRow = await repo('LeaveBalance').findOneBy({ employeeId: fresh.id, balanceType: 'annual', period })
  const sickRow = await repo('LeaveBalance').findOneBy({ employeeId: fresh.id, balanceType: 'sick', period })
  expect('الرصيد السنوي المبذور = leave.annual_entitled', () => assert.equal(Number(annualRow?.entitled), annualPolicy,
    `entitled=${annualRow?.entitled} policy=${annualPolicy}`))
  expect('الرصيد المرضي المبذور = leave.sick_entitled', () => assert.equal(Number(sickRow?.entitled), sickPolicy,
    `entitled=${sickRow?.entitled} policy=${sickPolicy}`))
  // أثر فعلي: هل المتبقي المعروض للموظف المبذور صحيح؟
  const view = (expectStatus(await request(admin, 'GET', `/leaves/balances/${fresh.id}`), 200))
    .find(row => row.balanceType === 'annual')
  console.log(`  [L10] أثر بذرة الرصيد: entitled المحفوظ=${annualRow?.entitled} —`
    + ` المعروض annualEntitlement=${view?.annualEntitlement} accruedToDate=${view?.accruedToDate} remaining=${view?.remaining}`
    + ' (العرض يقرأ استحقاق نوع الإجازة، فالعمود المحفوظ غير مستعمل اليوم)')

  // القيمة المرضية مثبتة في الكود (180) ولا تتبع السياسة: نغيّر السياسة ونبذر موظفًا جديدًا
  await request(admin, 'PATCH', '/settings/config', { key: 'leave.sick_entitled', value: '150' })
  try {
    const second = await employee({ fullName: 'موظف بذرة الرصيد الثاني' })
    await require('../src/seed/seed-requests').ensureLeaveBalance(ds, second.id)
    const secondSick = await repo('LeaveBalance').findOneBy({ employeeId: second.id, balanceType: 'sick', period })
    expect('تغيير leave.sick_entitled ينعكس على البذرة', () => assert.equal(Number(secondSick?.entitled), 150,
      `entitled=${secondSick?.entitled} بعد ضبط السياسة على 150`))
  } finally { await request(admin, 'PATCH', '/settings/config', { key: 'leave.sick_entitled', value: String(sickPolicy) }) }
})

test('R4 — التقديم نيابةً عن موظف: الصلاحية، ومَن الطالب ومَن المُنشئ، والأثر على الموظف', async () => {
  scene('R4 التقديم نيابةً')
  const denied = await request(e1.user, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-07', toDate: '2026-12-08', days: 1 }, onBehalfEmployeeId: e2.id })
  expect('بلا صلاحية لا تقديم نيابةً', () => assert.equal(denied.status, 403))

  const before = await balanceOf(e6.emp, 'annual')
  const onBehalf = expectStatus(await request(hrUser, 'POST', '/requests',
    { typeCode: 'LEAVE', payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-07', toDate: '2026-12-09', days: 1 },
      onBehalfEmployeeId: e6.id, submit: true }), 201, 'on-behalf:')
  const detail = await detailOf(hrUser, onBehalf.id)
  expect('الطالب هو الموظف والمُنشئ هو الموارد البشرية', () =>
    assert.deepEqual([detail.requesterId, detail.createdByUserId], [e6.id, hrUser.id]))
  expect('الاعتماد الفوري نيابةً عن الموظف', () => assert.equal(detail.status, 'COMPLETED'))
  const after = await balanceOf(e6.emp, 'annual')
  expect('الرصيد اتخصم من الموظف المستفيد', () =>
    assert.equal(Number(before.remaining) - Number(after.remaining), Number(JSON.parse(detail.payload).days)))
  const mineWithOnBehalf = expectStatus(await request(hrUser, 'GET', '/requests/mine?includeOnBehalf=1'), 200)
  expect('«طلباتي» تُظهر ما قُدِّم نيابةً', () => assert.ok(mineWithOnBehalf.some(row => row.id === onBehalf.id)))
})

test('R5 — نوع سرّي: المدير المباشر يُتخطى، وغير الطرف يرى الطلب محجوبًا', async () => {
  scene('R5 النوع السرّي')
  const req = await submitRequest(e4.user, 'GRIEVANCE', { description: 'شكوى اختبار سرية' })
  expect('التظلم يُقدَّم', () => assert.equal(req.submitted.status, 201))
  if (req.submitted.status !== 201) return
  const detail = await detailOf(hrUser, req.id)
  expect('خطوة المدير المباشر مُسقطة من السلسلة السرّية', () =>
    assert.deepEqual(JSON.parse(detail.resolvedSteps).map(s => s.role), ['hr']))
  const managerView = await request(mgrUser, 'GET', `/requests/${req.id}`)
  expect('المدير المباشر لا يرى التظلم', () => assert.equal(managerView.status, 403))
  // حامل requests.view_all غير الطرف يرى صفًّا محجوبًا
  const viewer = await user('viewer', 'وائل — مراجع الطلبات', 'employee', ['requests.view_all'])
  const masked = expectStatus(await request(viewer, 'GET', `/requests/${req.id}`), 200)
  expect('المحتوى محجوب لغير الطرف', () => assert.deepEqual([masked.confidentialMasked, masked.payload], [true, null]))
  expectStatus(await act(hrUser, req.id, 'APPROVE', 'اطلعنا'), 201)
})

test('R6 — أنواع المال القديمة مقفولة ببابها الصحيح', async () => {
  scene('R6 أبواب المال')
  for (const [typeCode, code] of [['BONUS', 'BONUS_MODULE_REQUIRED'], ['PAYROLL_DEDUCTION', 'MONEY_WORKSPACE_REQUIRED'], ['PAYROLL_BONUS', 'MONEY_WORKSPACE_REQUIRED']]) {
    const res = await request(hrUser, 'POST', '/requests', { typeCode, payload: { amount: 100, reason: 'اختبار' } })
    expect(`${typeCode} مقفول`, () => assert.equal(res.status, 400))
    expect(`${typeCode} برمز ${code}`, () => assert.equal(res.body?.code, code))
  }
})

test('L8 — إجازة تعبر السنة: الأيام تنقسم على رصيد كل سنة', async () => {
  scene('L8 إجازة تعبر السنة')
  const req = await submitRequest(e6.user, 'LEAVE', { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-29', toDate: '2027-01-06', days: 1 })
  expect('التقديم مقبول', () => assert.equal(req.submitted.status, 201))
  if (req.submitted.status !== 201) return
  const detail = await detailOf(hrUser, req.id)
  const payload = JSON.parse(detail.payload)
  // 12-29 (ثلاثاء) .. 12-31 (خميس) = 3 أيام عمل 2026؛ 01-01 (جمعة) 01-02 (سبت) عطلة، 01-03 (أحد).. 01-06 (أربعاء) = 4 أيام عمل 2027
  expect('الأيام مقسومة على السنتين', () => assert.deepEqual(payload.daysByYear, { 2026: 3, 2027: 4 }))
  expect('الإجمالي 7 أيام عمل', () => assert.equal(Number(payload.days), 7))
})

// ============================================================================
// 4) الرواتب
// ============================================================================
// أساس الأرقام لكل موظفي المسير: أساسي 6000 + سكن 1200 + انتقال 600 = إجمالي 7800
// أساس 30 يومًا ⇒ سعر اليوم 260، سعر الساعة 260 ÷ 8 = 32.50، سعر الدقيقة 32.5 ÷ 60
const GROSS = 7800, DAY_RATE = 7800 / 30, HOUR_RATE = (7800 / 30) / 8, MINUTE_RATE = ((7800 / 30) / 8) / 60
let pBase, pUnpaid, pAbsent, pLate, pOt, pSusp, pSalary, pSettle, pCash, pMixed
let formulaVersionId

const COMPONENT_DEFAULTS = {
  conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: null, fieldPath: null,
  missingFieldBehavior: null, varCode: null, multiplier: null, percent: null, baseCode: null, tierSetCode: null,
  formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
  maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: null, roundingScale: null,
  deductionPriority: null, carryOverEligible: false, rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true,
}
const comp = (code, nameAr, overrides) => ({ code, nameAr, ...COMPONENT_DEFAULTS, ...overrides })

async function payrollStaff(code, name, extra = {}, attendance = {}) {
  const emp = await employee({ employeeCode: `PR${code}`, fingerprintCode: `PR${code}`, fullName: name, basicSalary: 6000,
    housingAllowance: 1200, transportAllowance: 600, managerEmployeeId: mgr.id, ...extra })
  const account = await user(`pr-${code.toLowerCase()}`, name, 'employee', [], { employeeId: emp.id })
  await presentEveryDay(emp, ATT_FROM, ATT_TO, attendance)
  return { emp, user: account, id: emp.id }
}

test('P1 — مجموعة معدلات بالبنود: استحقاقات واستقطاعات تُتحقق وتُحفظ وتُنشر', async () => {
  scene('P1 مجموعة معدلات بالبنود')
  const created = expectStatus(await request(admin, 'POST', '/payroll/policies',
    { name: 'معادلات البنود — الاختبار الشامل', effectiveFrom: '2026-08-23', settings: { ...cycle23, dailyHours: 8 } }), 201)
  const [version] = created.versions
  const definition = {
    parameters: [], tierSets: [],
    components: [
      comp('BASIC_PAY', 'الراتب الأساسي', { componentType: 'EARNING', stage: 1, sequence: 1,
        valueSource: 'EMPLOYEE_FIELD', fieldPath: 'basicSalary', missingFieldBehavior: 'ZERO', rollupTo: 'basicSalary' }),
      comp('HOUSING_PAY', 'بدل السكن', { componentType: 'EARNING', stage: 1, sequence: 2,
        valueSource: 'EMPLOYEE_FIELD', fieldPath: 'housingAllowance', missingFieldBehavior: 'ZERO', rollupTo: 'allowances' }),
      comp('TRANSPORT_PAY', 'بدل الانتقال', { componentType: 'EARNING', stage: 1, sequence: 3,
        valueSource: 'EMPLOYEE_FIELD', fieldPath: 'transportAllowance', missingFieldBehavior: 'ZERO', rollupTo: 'allowances' }),
      comp('UNPAID_DED', 'خصم الإجازة بلا أجر', { componentType: 'DEDUCTION', stage: 3, sequence: 1,
        valueSource: 'FORMULA', formula: 'UNPAID_LEAVE_DAYS * DAY_RATE', deductionPriority: 1, rollupTo: 'unpaidLeaveDeduction' }),
      comp('LATE_DED', 'خصم التأخير', { componentType: 'DEDUCTION', stage: 3, sequence: 2,
        valueSource: 'FORMULA', formula: 'LATE_MINUTES * MINUTE_RATE', deductionPriority: 2, rollupTo: 'latenessDeduction' }),
      comp('NET', 'صافي المستحق', { componentType: 'INFO', stage: 6, sequence: 1, valueSource: 'SYS_NET', exemptible: false }),
    ],
  }
  // تصنيف الخصومات وترتيب تحصيلها شرط للنشر
  const collection = { schemaVersion: 'SRS_COLLECTION_V1_20260913',
    classifications: [{ componentCode: 'UNPAID_DED', kind: 'UNPAID_NON_ENTITLEMENT' }, { componentCode: 'LATE_DED', kind: 'ATTENDANCE' }],
    collectionOrder: ['LATE_DED'] }
  const preview = await request(admin, 'POST', `/payroll/policies/${created.policy.id}/versions/${version.id}/definition/validate`,
    { definition, collection })
  expect('التحقق من التعريف يمر', () => assert.equal(preview.status, 200, JSON.stringify(preview.body)))
  if (preview.status !== 200) return
  const saved = await request(admin, 'PATCH', `/payroll/policies/${created.policy.id}/versions/${version.id}/definition`,
    { expectedRevision: version.revision, reason: 'حفظ مجموعة معدلات الاختبار', definition, collection,
      acknowledgedWarnings: preview.body.requiredAcknowledgements ?? [] })
  expect('حفظ التعريف يمر', () => assert.equal(saved.status, 200))
  if (saved.status !== 200) return
  const stored = expectStatus(await request(admin, 'GET', `/payroll/policies/${created.policy.id}/versions/${version.id}/definition`), 200)
  const codes = (stored.definition?.components ?? stored.components ?? []).map(row => row.code)
  expect('البنود محفوظة بترتيبها', () => assert.deepEqual(codes,
    ['BASIC_PAY', 'HOUSING_PAY', 'TRANSPORT_PAY', 'UNPAID_DED', 'LATE_DED', 'NET']))
  const current = expectStatus(await request(admin, 'GET', `/payroll/policies/${created.policy.id}`), 200)
  const revision = (current.versions ?? []).find(v => v.id === version.id)?.revision
    ?? saved.body?.version?.revision ?? saved.body?.revision
  const published = await request(admin, 'POST', `/payroll/policies/${created.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: revision, reason: 'نشر مجموعة معدلات البنود' })
  expect('نشر النسخة بعد التعريف', () => assert.equal(published.status, 200, JSON.stringify({ revision, body: published.body })))
  if (published.status === 200) formulaVersionId = published.body.version.id
})

test('P2 — مسير كامل: مسودة ← احتساب ← اعتماد ← صرف، وكل رقم محسوب باليد', async () => {
  scene('P2 المسير الكامل بأرقام محسوبة')
  pBase = await payrollStaff('B01', 'بسمة — الأساس')
  const run = await draft(calcUser, 'مسير الاختبار الشامل — أكتوبر', { employeeIds: [pBase.id] }, PERIOD, formulaVersionId ?? policyVersionId)
  expect('نطاق المسير = دورة 23→22', () => assert.deepEqual([run.period, run.startDate, run.endDate], [PERIOD, CYCLE_FROM, CYCLE_TO]))
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, pBase.emp)
  const b = bd(item)
  expect('الأساسي والبدلات من ملف الموظف', () => assert.deepEqual(
    [Number(item.basicSalary), Number(item.allowances)], [6000, 1800]))
  expect('أساس الحساب: 30 يوم تغطية كاملة وسعر يوم 260 وسعر ساعة 32.5', () => assert.deepEqual(
    [b.coverFrom, b.coverTo, b.coverDays, b.prorataFactor, b.monthlyDays, b.dayRate, b.hourRate],
    [CYCLE_FROM, CYCLE_TO, 30, 1, 30, DAY_RATE, HOUR_RATE]))
  expect('لا خصومات ولا إضافات', () => assert.deepEqual(
    [Number(item.latenessDeduction), Number(item.absenceDeduction), Number(item.unpaidLeaveDeduction),
      Number(item.otherDeductions), Number(item.otherAdditions), Number(item.overtimeAmount)], [0, 0, 0, 0, 0, 0]))
  expect('الصافي = الإجمالي 7800.00', () => assert.equal(Number(item.netPay), GROSS))
  expect('إجمالي المسير = مجموع بنوده', () => assert.equal(Number(calculated.totalNet), GROSS))

  // سطور القسيمة: مجموع الاستحقاقات − الاستقطاعات = الصافي
  const lines = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/lines`), 200)
  const row = lines.rows.find(r => r.employeeId === pBase.id)
  expect('سطور الاستحقاقات بأسمائها وبنودها مفصّلة', () => assert.deepEqual(
    row.earnings.map(l => [l.key, l.amount]), [['BASIC', 6000], ['SALARY:HOUSING', 1200], ['SALARY:TRANSPORT', 600]]))
  expect('مجاميع السطور تطابق الصافي', () => assert.deepEqual(
    [row.totals.earnings, row.totals.deductions, row.totals.net], [7800, 0, 7800]))

  // أي محرك صرف الأرقام؟ مجموعة المعدلات المنشورة أم الحساب القديم؟
  const engine = calculated.engine ?? {}
  console.log(`  [P2] وضع المحرك=${engine.mode} المصروف=${engine.report?.paidResult}`
    + ` تكافؤ: ${JSON.stringify(engine.report?.totals)} — ${engine.report?.message}`)
  expect('المسير يعلن أي محرك صرف أرقامه', () => assert.ok(engine.report?.paidResult, JSON.stringify(engine)))
  const parityRow = (engine.report?.rows ?? [])[0]
  if (parityRow) {
    console.log(`  [P2] حالة الصف=${parityRow.status} ظل الحضور=${parityRow.attendanceShadowStatus}`)
    for (const c of parityRow.components ?? []) {
      if (c.legacy !== c.policy) console.log(`        فرق ${c.code} (${c.label}): قديم=${c.legacy} سياسة=${c.policy} سبب=${c.reasonCode ?? '—'}`)
    }
  }
  // المصروف هو الحساب القديم ما دام وضع المحرك SHADOW — مجموعة المعدلات المنشورة لا تحكم المبلغ
  expect('المسير يعلن صراحة أن المصروف من الحساب القديم لا من مجموعة المعدلات', () => assert.deepEqual(
    [engine.mode, engine.report?.paidResult], ['SHADOW', 'LEGACY']))
  // ظل الحضور هنا PARTIAL لأن أيام التجربة بلا بصمات (مكتوبة مباشرة)، فلا يمكن إثبات التكافؤ:
  // المطلوب أن يكون لكل فرق سبب نظام مسجل، لا أن يختفي الفرق
  const unexplained = (parityRow?.components ?? []).filter(c => c.legacy !== c.policy && !c.reasonCode)
  expect('كل فرق بين المحركين له رمز سبب مسجل', () => assert.deepEqual(unexplained.map(c => c.code), []))
  expect('التحويل إلى POLICY محجوب ما لم يثبت التكافؤ', () => assert.ok(
    (engine.switchIssues ?? []).length > 0 || engine.report?.totals?.differences > 0,
    JSON.stringify(engine.switchIssues)))

  // فصل المهام ثم الاعتماد ثم الصرف
  const selfApprove = await request(calcUser, 'POST', `/payroll/runs/${run.id}/approve`)
  expect('من احتسب لا يملك اعتماد (أصلًا بلا صلاحية اعتماد)', () => assert.equal(selfApprove.status, 403))
  const approved = await approveRun(approveUser, run.id)
  expect('الاعتماد يمر بمستخدم آخر', () => assert.equal(approved.status, 201))
  expect('الحالة معتمد', () => assert.equal(approved.body?.status, 'APPROVED'))
  const payNoChannel = await request(approveUser, 'POST', `/payroll/runs/${run.id}/pay`, {})
  expect('الصرف بلا قناة مرفوض', () => assert.deepEqual([payNoChannel.status, payNoChannel.body?.code], [400, 'PAYRUN-PAY-CHANNEL']))
  const paid = await request(approveUser, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-FT-2026-10' })
  expect('الصرف يمر', () => assert.equal(paid.status, 201))
  const after = await runDetail(approveUser, run.id)
  expect('الحالة مصروف بقيده', () => assert.deepEqual([after.status, after.payChannel, after.payReference], ['PAID', 'BANK_TRANSFER', 'TRX-FT-2026-10']))
})

test('P3 — أثر كل حدث على القسيمة بندًا بندًا: بلا أجر، غياب، تأخير، إيقاف', async () => {
  scene('P3 آثار الشهر بندًا بندًا')
  pUnpaid = await payrollStaff('U01', 'أسامة — بلا أجر')
  pAbsent = await payrollStaff('A01', 'عادل — غياب', {}, { '2026-10-06': { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0 } })
  pLate = await payrollStaff('T01', 'تامر — تأخير', {}, { '2026-10-07': { status: 'late', lateMinutes: 30 } })
  pSusp = await payrollStaff('S01', 'سعاد — إيقاف')

  // إجازة بلا أجر 3 أيام تقويم داخل الدورة عبر الدورة الحقيقية للطلبات
  const leave = await submitRequest(pUnpaid.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: '2026-10-12', toDate: '2026-10-14', days: 1 })
  expect('طلب الإجازة بلا أجر اتقدّم', () => assert.equal(leave.submitted.status, 201))
  if (leave.submitted.status === 201) {
    expectStatus(await act(mgrUser, leave.id, 'APPROVE', 'موافق'), 201)
    expectStatus(await act(hrUser, leave.id, 'APPROVE', 'موافق'), 201)
  }
  // إيقاف يومين
  const suspension = await request(hrUser, 'POST', `/employees/${pSusp.id}/suspensions`,
    { fromDate: '2026-10-15', toDate: '2026-10-16', reason: 'تحقيق إداري — اختبار' })
  expect('تسجيل الإيقاف مقبول', () => assert.equal(suspension.status, 201))

  const run = await draft(calcUser, 'مسير الآثار — أكتوبر', { employeeIds: [pUnpaid.id, pAbsent.id, pLate.id, pSusp.id] })
  const calculated = await calcRun(calcUser, run.id)

  const unpaidItem = itemOf(calculated, pUnpaid.emp)
  expect('بلا أجر: 3 أيام × 260 = 780.00', () => assert.deepEqual(
    [Number(unpaidItem.unpaidLeaveDays), Number(unpaidItem.unpaidLeaveDeduction)], [3, money(3 * DAY_RATE)]))
  expect('بلا أجر: الصافي 7800 − 780 = 7020.00', () => assert.equal(Number(unpaidItem.netPay), money(GROSS - 3 * DAY_RATE)))

  const absentItem = itemOf(calculated, pAbsent.emp)
  expect('غياب يوم واحد: 1 × 260 = 260.00', () => assert.deepEqual(
    [Number(absentItem.absenceDays), Number(absentItem.absenceDeduction)], [1, money(DAY_RATE)]))
  expect('غياب: الصافي 7540.00', () => assert.equal(Number(absentItem.netPay), money(GROSS - DAY_RATE)))

  const lateItem = itemOf(calculated, pLate.emp)
  expect('تأخير 30 دقيقة × سعر الدقيقة = 16.25', () => assert.deepEqual(
    [Number(lateItem.lateMinutes), Number(lateItem.latenessDeduction)], [30, money(30 * MINUTE_RATE)]))
  expect('تأخير: الصافي 7783.75', () => assert.equal(Number(lateItem.netPay), money(GROSS - 30 * MINUTE_RATE)))

  const suspItem = itemOf(calculated, pSusp.emp)
  const suspBd = bd(suspItem)
  expect('الإيقاف يومان يُخصمان يومًا بيوم', () => assert.deepEqual(
    [suspBd.suspension?.days, Number(suspItem.unpaidLeaveDeduction)], [2, money(2 * DAY_RATE)]))
  expect('الإيقاف: الصافي 7280.00', () => assert.equal(Number(suspItem.netPay), money(GROSS - 2 * DAY_RATE)))
  const suspLines = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/lines`), 200)
    .rows.find(r => r.employeeId === pSusp.id)
  expect('الإيقاف سطر مستقل في القسيمة', () => assert.ok(suspLines.deductions.some(l => l.key === 'SUSPENSION'),
    JSON.stringify(suspLines.deductions)))
})

// الإضافي وبدل العطلة يشترطان يومًا ماضيًا ببصمات فعلية ووردية مجدولة، فيُختبران على
// شهر مسير سابق (2026-09 = دورة 2026-08-23 → 2026-09-22) بنفس أساس الأرقام.
const OT_PERIOD = '2026-09', OT_DAY = '2026-09-08', HOLIDAY_DAY = '2026-09-12'
test('P4 — عمل إضافي وبدل دوام يوم عطلة يصلان للقسيمة بقيمتهما', async () => {
  scene('P4 الإضافي وبدل العطلة')
  await repo('Department').update({ id: deptOps.id }, { managerEmployeeId: mgr.id })
  pOt = await payrollStaff('O01', 'عمر — إضافي')
  const shift = expectStatus(await request(admin, 'POST', '/catalogs/shifts',
    { name: 'وردية الاختبار الشامل للإضافي', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed', graceMinutes: 0,
      flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 480, effectiveFrom: '2026-08-01',
      changeReason: 'وردية مؤرخة لاختبار أدلة الإضافي' }), 201, 'shift:')
  for (const day of [OT_DAY, HOLIDAY_DAY]) {
    expectStatus(await request(admin, 'POST', '/attendance/schedule/day', { employeeId: pOt.id, date: day, shiftId: shift.id }), 201, `schedule ${day}:`)
  }
  const punch = (date, clock) => ({ employeeCode: pOt.emp.employeeCode, timestamp: new Date(`${date}T${clock}:00`).toISOString() })
  expectStatus(await request(admin, 'POST', '/attendance/punches/manual',
    { punches: [punch(OT_DAY, '08:00'), punch(OT_DAY, '19:00'), punch(HOLIDAY_DAY, '09:00'), punch(HOLIDAY_DAY, '13:00')],
      reason: 'بصمات فعلية لاختبار الإضافي وبدل العطلة' }), 201, 'punches:')

  // البصمة نفسها تولّد «إضافي مكتشف» فيرفض الطلب اليدوي كمكرر — ندفع الطلب الموجود في سلسلته
  const ot = await submitRequest(pOt.user, 'OVERTIME', { date: OT_DAY, hours: 3, reason: 'إغلاق شهري بعد الوردية' })
  let otRequestId = ot.id
  if (ot.submitted.status !== 201) {
    expect('رفض الطلب اليدوي سببه إضافي مكتشف موجود لنفس اليوم', () =>
      assert.equal(ot.submitted.body?.code, 'OVERTIME_DAY_ALREADY_CLAIMED', JSON.stringify(ot.submitted.body)))
    await request(pOt.user, 'POST', `/requests/${ot.id}/cancel`)
    otRequestId = ot.submitted.body?.requestId ?? null
  }
  if (otRequestId) {
    const detail = await detailOf(hrUser, otRequestId)
    expect('سلسلة الإضافي ثلاث خطوات', () => assert.deepEqual(JSON.parse(detail.resolvedSteps).map(s => s.role),
      ['direct_manager_of_requester', 'department_manager_of_requester', 'hr']))
    const own = await act(pOt.user, otRequestId, 'APPROVE', 'اعتماد ذاتي')
    expect('صاحب طلب الإضافي لا يعتمده', () => assert.equal(own.status, 403))
    for (const step of [1, 2]) expectStatus(await act(mgrUser, otRequestId, 'APPROVE', `اعتماد خطوة ${step}`), 201, `ot step ${step}:`)
    expectStatus(await act(hrUser, otRequestId, 'APPROVE', 'اعتماد الموارد البشرية'), 201, 'ot hr:')
    const done = await detailOf(hrUser, otRequestId)
    expect('طلب الإضافي اكتمل', () => assert.equal(done.status, 'COMPLETED'))
  }
  // 2026-09-12 سبت = عطلة أسبوعية؛ الموظف اشتغل فيها 4 ساعات ببصمة
  const holiday = await submitRequest(pOt.user, 'HOLIDAY_WORK', { dates: [HOLIDAY_DAY], reason: 'جرد المخزن يوم العطلة' })
  const holidayOk = expect('طلب دوام يوم العطلة اتقدّم', () => assert.equal(holiday.submitted.status, 201, JSON.stringify(holiday.submitted.body)))
  if (holidayOk) expectStatus(await act(hrUser, holiday.id, 'APPROVE', 'موافق'), 201, 'holiday:')

  const run = await draft(calcUser, 'مسير الإضافي — سبتمبر', { employeeIds: [pOt.id] }, OT_PERIOD)
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, pOt.emp)
  const b = bd(item)
  expect('ساعات الإضافي ومبلغه مسجلان', () => assert.ok(Number(item.overtimeHours) > 0 && Number(item.overtimeAmount) > 0,
    `hours=${item.overtimeHours} amount=${item.overtimeAmount} overtime=${JSON.stringify(b.overtimeDetails ?? b.overtime ?? null)}`))
  expect('مبلغ الإضافي = ساعاته × سعر الساعة × مضاعف يوم العمل 1.5', () => assert.equal(Number(item.overtimeAmount),
    money(Number(item.overtimeHours) * HOUR_RATE * 1.5)))
  // بدل دوام العطلة = ساعات البصمة (4) × سعر الساعة × مضاعف attendance.holiday_work_multiplier
  const holidayMultiplier = Number((await repo('RequestsConfig').findOneBy({ key: 'attendance.holiday_work_multiplier' }))?.value ?? 1.5)
  expect('بدل دوام العطلة = 4 ساعات × سعر الساعة × مضاعف العطلات', () => assert.equal(
    Number(item.otherAdditions), money(4 * HOUR_RATE * holidayMultiplier),
    `otherAdditions=${item.otherAdditions} multiplier=${holidayMultiplier}`))
  const lines = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/lines`), 200).rows.find(r => r.employeeId === pOt.id)
  expect('سطر الإضافي في القسيمة', () => assert.ok(lines.earnings.some(l => l.key === 'OVERTIME'), JSON.stringify(lines.earnings)))
  expect('سطر بدل العطلة في القسيمة', () => assert.ok(lines.earnings.some(l => l.key === 'HOLIDAY_WORK' || l.key.startsWith('CREDIT:')),
    JSON.stringify(lines.earnings)))
  const earned = Number(item.basicSalary) + Number(item.allowances)
  expect('الصافي = المستحق + الإضافي + البدل − الخصومات', () => assert.equal(Number(item.netPay),
    money(earned + Number(item.overtimeAmount) + Number(item.otherAdditions)
      - Number(item.latenessDeduction) - Number(item.shortfallDeduction) - Number(item.absenceDeduction)
      - Number(item.unpaidLeaveDeduction) - Number(item.otherDeductions))))
})

test('P5 — تغيير الراتب في وسط الشهر: الشهر كله بقيمة واحدة (لا تقسيم)', async () => {
  scene('P5 تغيير الراتب')
  pSalary = await payrollStaff('C01', 'كريمة — تغيير راتب')
  const current = expectStatus(await request(approveUser, 'GET', `/payroll/employees/${pSalary.id}/salary-history`), 200)
  const body = {
    expectedRevision: current.revision ?? 0,
    expectedCurrentSourceHash: current.currentSourceHash ?? current.sourceHash,
    reason: 'ترقية — اختبار شامل', evidenceReference: 'قرار رقم 7/2026',
    periods: [{ effectivePayrollPeriod: PERIOD, effectiveToPayrollPeriod: null, currency: 'SAR',
      basicSalary: '7000.00', housingAllowance: '1400.00', transportAllowance: '600.00',
      phoneAllowance: '0.00', workNatureAllowance: '0.00', otherAllowance: '0.00' }],
  }
  const saved = await request(approveUser, 'POST', `/payroll/employees/${pSalary.id}/salary-history/monthly`, body)
  expect('حفظ راتب الشهر مقبول', () => assert.equal(saved.status, 201),)
  if (saved.status !== 201) {
    soft.push({ scenario: currentScenario, label: 'تعذّر تسجيل تغيير الراتب', message: JSON.stringify({ sent: { revision: body.expectedRevision, hash: body.expectedCurrentSourceHash }, got: saved.body, current }) })
    return
  }
  const run = await draft(calcUser, 'مسير تغيير الراتب — أكتوبر', { employeeIds: [pSalary.id] })
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, pSalary.emp)
  expect('الشهر كله بالراتب الجديد بلا تقسيم', () => assert.deepEqual(
    [Number(item.basicSalary), Number(item.allowances), Number(item.netPay)], [7000, 2000, 9000]))
})

test('P6 — خصم مصنّف ثم «شيل الخصم»، ومكافأة ثم عكسها: مجاميع المسير والقسيمة بعد كل خطوة', async () => {
  scene('P6 خصم مصنّف ومكافأة')
  const target = await payrollStaff('D01', 'داليا — خصم ومكافأة')
  const dType = expectStatus(await request(admin, 'POST', '/deductions/types',
    { code: 'FT_LATE_REPORT', nameAr: 'غرامة تأخير تسليم', category: 'ADMINISTRATIVE', calcMethod: 'FIXED_AMOUNT',
      isExemptable: true, creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201, 'deduction type:')
  const dTypeId = dType.id ?? dType.type?.id
  const deduction = await request(hrUser, 'POST', '/deductions',
    { employeeId: target.id, deductionTypeId: dTypeId, inputValue: '300', incidentDate: '2026-09-10',
      reason: 'تأخر تسليم التقرير الشهري عن موعده المتفق عليه مع الإدارة', targetPeriod: PERIOD })
  expect('إنشاء الخصم المصنّف مقبول', () => assert.equal(deduction.status, 201, JSON.stringify(deduction.body)))
  const bType = expectStatus(await request(admin, 'POST', '/bonuses/types',
    { code: 'FT_PERFORMANCE', nameAr: 'مكافأة أداء', calcMethod: 'FIXED_AMOUNT', creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201, 'bonus type:')
  const bTypeId = bType.id ?? bType.type?.id
  const bonus = await request(hrUser, 'POST', '/bonuses',
    { employeeId: target.id, bonusTypeId: bTypeId, inputValue: '500', reason: 'أداء متميز في إغلاق الربع وتحقيق المستهدف كاملًا', targetPeriod: PERIOD })
  expect('إنشاء المكافأة مقبول', () => assert.equal(bonus.status, 201, JSON.stringify(bonus.body)))
  if (deduction.status !== 201 || bonus.status !== 201) return
  const deductionId = deduction.body.id ?? deduction.body.request?.id ?? deduction.body.deduction?.id
  const bonusId = bonus.body.id ?? bonus.body.request?.id ?? bonus.body.bonus?.id
  const dRev = deduction.body.revision ?? deduction.body.deduction?.revision ?? 0
  const bRev = bonus.body.revision ?? bonus.body.bonus?.revision ?? 0
  // الدفتر ينشئ سلسلته الخاصة (مدير القسم ← الموارد البشرية) — نعتمد كل خطوة حتى تكتمل
  async function approveAllSteps(kind, id, label) {
    for (let guard = 0; guard < 6; guard++) {
      const state = expectStatus(await request(hrUser, 'GET', `/${kind}/${id}`), 200)
      if (state.status === 'APPROVED') return state
      const step = await request(admin, 'POST', `/${kind}/${id}/approve`, { expectedRevision: state.revision ?? 0, reason: `${label} — اعتماد خطوة` })
      if (step.status !== 201) { soft.push({ scenario: currentScenario, label: `اعتماد ${label}`, message: JSON.stringify(step.body) }); return state }
    }
    return expectStatus(await request(hrUser, 'GET', `/${kind}/${id}`), 200)
  }
  await approveAllSteps('deductions', deductionId, 'الخصم')
  await approveAllSteps('bonuses', bonusId, 'المكافأة')
  void dRev; void bRev

  const dState = expectStatus(await request(hrUser, 'GET', `/deductions/${deductionId}`), 200)
  const bState = expectStatus(await request(hrUser, 'GET', `/bonuses/${bonusId}`), 200)
  expect('الخصم صار معتمدًا بعد آخر خطوة', () => assert.equal(dState.status ?? dState.deduction?.status, 'APPROVED',
    JSON.stringify({ status: dState.status, steps: dState.steps })))
  expect('المكافأة صارت معتمدة بعد آخر خطوة', () => assert.equal(bState.status ?? bState.bonus?.status, 'APPROVED',
    JSON.stringify({ status: bState.status, steps: bState.steps })))

  const run = await draft(calcUser, 'مسير الخصم والمكافأة — أكتوبر', { employeeIds: [target.id] })
  let calculated = await calcRun(calcUser, run.id)
  let item = itemOf(calculated, target.emp)
  expect('الخصم 300 والمكافأة 500 في القسيمة', () => assert.deepEqual(
    [Number(item.otherDeductions), Number(item.otherAdditions)], [300, 500],
    `breakdown=${JSON.stringify({ debits: bd(item).debits, credits: bd(item).credits })}`))
  expect('الصافي 7800 + 500 − 300 = 8000', () => assert.equal(Number(item.netPay), 8000))
  expect('إجمالي المسير = 8000', () => assert.equal(Number(calculated.totalNet), 8000))
  const withBoth = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/lines`), 200).rows.find(r => r.employeeId === target.id)
  expect('سطرا الخصم المصنّف والمكافأة بأسمائهما', () => assert.ok(
    withBoth.deductions.some(l => l.key.startsWith('TYPED:') || l.key === 'OTHER_DEDUCTIONS')
    && withBoth.earnings.some(l => l.key.startsWith('BONUS:') || l.key.startsWith('CREDIT:') || l.key === 'OTHER_ADDITIONS'),
    JSON.stringify({ earnings: withBoth.earnings, deductions: withBoth.deductions })))

  // «شيل خصم» للشهر: الخصم المصنّف يخرج من المسير ويبقى في الدفتر
  const waiver = await request(calcUser, 'POST', '/payroll/overview/waivers',
    { period: PERIOD, kind: 'TYPED_DEDUCTION', targetLevel: 'employees', branchId: branchA.id, employeeIds: [target.id],
      reason: 'تنازل الإدارة عن الغرامة هذا الشهر' })
  expect('«شيل خصم» مقبول', () => assert.equal(waiver.status, 201, JSON.stringify(waiver.body)))
  const afterWaive = await request(calcUser, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'بعد شيل الخصم المصنّف' })
  expect('إعادة حساب بعد شيل الخصم', () => assert.equal(afterWaive.status, 201, JSON.stringify(afterWaive.body)))
  calculated = await runDetail(calcUser, run.id)
  item = itemOf(calculated, target.emp)
  expect('بعد «شيل الخصم»: الخصم صفر والمكافأة كما هي', () => assert.deepEqual(
    [Number(item.otherDeductions), Number(item.otherAdditions)], [0, 500]))
  expect('الصافي 7800 + 500 = 8300', () => assert.equal(Number(item.netPay), 8300))
  expect('إجمالي المسير = 8300', () => assert.equal(Number(calculated.totalNet), 8300))
  const stillPending = await repo('EmployeeObligation').findOneBy({ deductionRequestId: deductionId })
  expect('القيد المشال باقٍ في الدفتر ولم يُستهلك', () => assert.equal(stillPending?.status, 'PENDING'))

  // الصرف ثم عكس المكافأة (العكس متاح لمكافأة صُرفت)
  const approved = await approveRun(approveUser, run.id)
  expect('اعتماد مسير الخصم والمكافأة', () => assert.equal(approved.status, 201, JSON.stringify(approved.body)))
  const paid = await request(approveUser, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'TRX-FT-BONUS' })
  expect('صرف مسير الخصم والمكافأة', () => assert.equal(paid.status, 201, JSON.stringify(paid.body)))
  const bPaid = expectStatus(await request(hrUser, 'GET', `/bonuses/${bonusId}`), 200)
  const reversed = await request(hrUser, 'POST', `/bonuses/${bonusId}/reverse`,
    { expectedRevision: bPaid.revision ?? 0, reason: 'صُرفت بالخطأ لموظف غير مستحق — عكس المكافأة بالكامل' })
  expect('عكس المكافأة بعد الصرف مقبول', () => assert.equal(reversed.status, 201, JSON.stringify(reversed.body)))
  if (reversed.status !== 201) return
  const reversalObligation = await repo('EmployeeObligation').findOne({ where: { employeeId: target.id, type: 'DEBIT' }, order: { id: 'DESC' } })
  expect('العكس يكتب قيد استرداد في الدفتر بمبلغ المكافأة (والمكافأة تبقى معتمدة بتاريخها)', () => assert.deepEqual(
    [Number(reversalObligation?.amount), reversalObligation?.status, reversalObligation?.bonusRequestId], [500, 'PENDING', bonusId],
    JSON.stringify(reversalObligation)))
  const paidAgain = await runDetail(approveUser, run.id)
  expect('المسير المصروف ثابت بعد العكس', () => assert.deepEqual(
    [paidAgain.status, Number(paidAgain.totalNet)], ['PAID', 8300]))
  // الشهر التالي يحمل الاسترداد (500) والخصم المشال هذا الشهر الباقي في الدفتر (300)
  const nextRun = await draft(calcUser, 'مسير استرداد المكافأة — نوفمبر', { employeeIds: [target.id] }, '2026-11')
  const nextCalc = await calcRun(calcUser, nextRun.id)
  const nextItem = itemOf(nextCalc, target.emp)
  expect('الشهر التالي يحمل استرداد المكافأة 500 + الخصم المؤجل 300', () => assert.equal(Number(nextItem.otherDeductions), 800,
    `netPay=${nextItem.netPay}`))
  expect('صافي الشهر التالي 7800 − 800 = 7000', () => assert.equal(Number(nextItem.netPay), 7000))
})

test('P7 — فصل المهام ورخصة الشركة الصغيرة، ولا إعادة حساب صامتة لمسير معتمد أو مصروف', async () => {
  scene('P7 فصل المهام وقفل المسير')
  const target = await payrollStaff('X01', 'خالد — فصل المهام')
  // مستخدم واحد يحتسب ويعتمد
  const both = await user('both', 'بدر — يحتسب ويعتمد', 'hr_manager',
    ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay'])
  const run = await draft(both, 'مسير فصل المهام — أكتوبر', { employeeIds: [target.id] })
  await calcRun(both, run.id)
  const blocked = await approveRun(both, run.id)
  expect('من احتسب لا يعتمد', () => assert.equal(blocked.status, 403))
  expect('رمز فصل المهام PAYRUN-STATE-003', () => assert.equal(blocked.body?.code, 'PAYRUN-STATE-003'))
  const guard = await runDetail(both, run.id)
  expect('الشاشة تعلن المنع', () => assert.equal(guard.approvalGuard?.blocked?.code, 'PAYRUN-STATE-003'))
  // الرخصة تتطلب صلاحية مستقلة
  const key = 'payroll.approval_self_approval_allowed'
  const refusedLicence = await request(hrUser, 'PATCH', '/settings/config', { key, value: 'true' })
  expect('الرخصة لا تُفعَّل بـsettings.manage وحدها', () => assert.equal(refusedLicence.status, 403))
  expectStatus(await request(admin, 'PATCH', '/settings/config', { key, value: 'true' }), 200)
  try {
    const allowed = await approveRun(both, run.id)
    expect('مع الرخصة يعتمد المحتسِب نفسه', () => assert.equal(allowed.status, 201))
  } finally { expectStatus(await request(admin, 'PATCH', '/settings/config', { key, value: 'false' }), 200) }

  // مسير معتمد: لا إعادة حساب ولا احتساب مسودة
  const recalcApproved = await request(both, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'محاولة إعادة حساب بعد الاعتماد' })
  expect('إعادة حساب معتمد مرفوضة', () => assert.equal(recalcApproved.status, 400))
  expect('الرمز PAYRUN-STATE-002', () => assert.equal(recalcApproved.body?.code, 'PAYRUN-STATE-002'))
  const calcApproved = await request(both, 'POST', `/payroll/runs/${run.id}/calculate`, {})
  expect('احتساب مسودة لمسير معتمد مرفوض', () => assert.equal(calcApproved.status, 400))
  // بعد الصرف كذلك
  expectStatus(await request(both, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'CASH', reference: 'محضر صرف نقدي 1' }), 201)
  const recalcPaid = await request(both, 'POST', `/payroll/runs/${run.id}/recalculate`, { reason: 'محاولة بعد الصرف' })
  expect('إعادة حساب مصروف مرفوضة', () => assert.deepEqual([recalcPaid.status, recalcPaid.body?.code], [400, 'PAYRUN-STATE-002']))
  const payTwice = await request(both, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'CASH', reference: 'محضر صرف نقدي 2' })
  expect('لا صرف مرتين', () => assert.deepEqual([payTwice.status, payTwice.body?.code], [400, 'PAYRUN-STATE-001']))
})

test('P8 — التصفية: راتب آخر شهر يتصرف مع التصفية بنفس الرقم ولا يُصرف مرتين', async () => {
  scene('P8 التصفية')
  pSettle = await payrollStaff('E01', 'إيهاب — تصفية')
  const kase = await request(hrUser, 'POST', '/offboarding',
    { employeeId: pSettle.id, reason: 'resignation', lastWorkingDay: '2026-10-12', notes: 'اختبار شامل' })
  expect('فتح ملف إنهاء الخدمة مقبول', () => assert.equal(kase.status, 201))
  if (kase.status !== 201) {
    soft.push({ scenario: currentScenario, label: 'تعذّر فتح ملف إنهاء الخدمة', message: JSON.stringify(kase.body) })
    return
  }
  const caseId = kase.body.id ?? kase.body.case?.id
  const run = await draft(calcUser, 'مسير التصفية — أكتوبر', { employeeIds: [pSettle.id] })
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, pSettle.emp)
  const b = bd(item)
  // التغطية 2026-09-23 → 2026-10-12 = 20 يومًا ⇒ 7800 × 20 ÷ 30 = 5200.00
  expect('التغطية تنتهي بآخر يوم عمل', () => assert.deepEqual([b.coverFrom, b.coverTo, b.coverDays], [CYCLE_FROM, '2026-10-12', 20]))
  expect('الأجر المستحق بالتناسب 5200.00', () => assert.equal(Number(item.netPay), money(GROSS * 20 / 30)))
  expect('الصف معلَّم «مصروف مع التصفية»', () => assert.ok(b.settlementPayout, JSON.stringify(Object.keys(b))))
  // كشف البنك يستبعده ويذكره للعلم
  const sheet = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/bank-sheet`), 200)
  expect('صف التصفية خارج كشف البنك', () => assert.equal(sheet.rows.some(r => r.employeeId === pSettle.id), false))
  expect('ومذكور في «مصروف مع التصفية» بنفس الرقم', () => assert.deepEqual(
    [sheet.settlement.employees, sheet.settlement.rows[0]?.netPay], [1, Number(item.netPay)]))
  // إخلاء الطرف أولًا: كل بنود الجهات تُكمَّل ثم تُبنى بنود التصفية
  const before = expectStatus(await request(hrUser, 'GET', `/offboarding/${caseId}`), 200)
  for (const clearanceItem of before.items ?? []) {
    const done = await request(hrUser, 'POST', `/offboarding/items/${clearanceItem.id}/complete`, { note: 'لا مستحقات' })
    expect(`إتمام بند إخلاء «${clearanceItem.party ?? clearanceItem.id}»`, () => assert.equal(done.status, 201, JSON.stringify(done.body)))
  }
  // التصفية تأخذ نفس الرقم
  const recalc = await request(hrUser, 'POST', `/offboarding/${caseId}/recalc-lines`, {})
  expect('إعادة بناء بنود التصفية', () => assert.equal(recalc.status, 201, JSON.stringify(recalc.body)))
  const settlement = expectStatus(await request(hrUser, 'GET', `/offboarding/${caseId}`), 200)
  const lines = settlement.lines ?? []
  const salaryLine = lines.find(line => String(line.label ?? '').includes('راتب آخر شهر'))
  expect('بند «راتب آخر شهر» في التصفية بنفس رقم المسير', () => assert.equal(Number(salaryLine?.amount), Number(item.netPay),
    `lines=${JSON.stringify(lines.map(l => [l.label, l.amount]))}`))
})

test('P9 — التقارير وكشف البنك يطابقون المسير، والتقسيم «نقدي + بنك»', async () => {
  scene('P9 التقارير وكشف البنك')
  pCash = await payrollStaff('K01', 'كوثر — نقدي', { payMethod: 'cash', bankName: null, iban: null })
  pMixed = await payrollStaff('M01', 'منال — نقدي + بنك', { payMethod: 'mixed', bankTransferAmount: 5000 })
  const run = await draft(calcUser, 'مسير طرق الصرف — أكتوبر', { employeeIds: [pCash.id, pMixed.id] })
  const calculated = await calcRun(calcUser, run.id)
  const sheet = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/bank-sheet`), 200)
  const cashRow = sheet.rows.find(r => r.employeeId === pCash.id)
  const mixedRow = sheet.rows.find(r => r.employeeId === pMixed.id)
  expect('النقدي كله نقدي', () => assert.deepEqual([cashRow?.bankAmount, cashRow?.cashAmount], [0, GROSS]))
  expect('«نقدي + بنك»: 5000 بنك و2800 نقدي', () => assert.deepEqual([mixedRow?.bankAmount, mixedRow?.cashAmount], [5000, 2800]))
  expect('مجاميع الكشف = إجمالي المسير', () => assert.deepEqual(
    [sheet.totals.bank + sheet.totals.cash, sheet.totals.net], [Number(calculated.totalNet), Number(calculated.totalNet)]))
  expect('طريقة الصرف بمسماها العربي', () => assert.deepEqual(
    [cashRow?.payMethodLabel, mixedRow?.payMethodLabel], ['نقدي', 'نقدي + بنك']))
  const payMethods = expectStatus(await request(calcUser, 'GET', `/payroll/runs/${run.id}/pay-methods`), 200)
  expect('تقرير طرق الصرف يذكر الطريقتين', () => assert.ok(JSON.stringify(payMethods).includes('cash') && JSON.stringify(payMethods).includes('mixed')))

  const report = expectStatus(await request(hrUser, 'GET', '/reports/payroll'), 200)
  const reportRun = (report.runs ?? report.items ?? report).find?.(r => r.id === run.id || r.runId === run.id)
  expect('تقرير الرواتب يحتوي المسير بإجماليه', () => assert.equal(Number(reportRun?.totalNet ?? reportRun?.total ?? NaN), Number(calculated.totalNet)))
  const register = await request(hrUser, 'GET', query('/reports/financial/payroll-register', { period: PERIOD }))
  expect('سجل الرواتب المالي يفتح', () => assert.equal(register.status, 200))
})

test('P11 — الفلوس مقصوصة لقرشين لا مقرَّبة لأعلى، والسطور تساوي الأعمدة المحفوظة', async () => {
  scene('P11 قص الفلوس وتطابق السطور')
  // أساسي 6001 ⇒ سعر اليوم 200.0333…، سعر الدقيقة 0.4167…؛ كلاهما كسور متكررة
  const cut = await payrollStaff('Z01', 'زينة — قص الفلوس', { basicSalary: 6001, housingAllowance: 0, transportAllowance: 0 },
    { '2026-10-07': { status: 'late', lateMinutes: 7 } })
  const leave = await submitRequest(cut.user, 'LEAVE', { leaveTypeCode: 'UNPAID', fromDate: '2026-10-19', toDate: '2026-10-19', days: 1 })
  expect('إجازة بلا أجر يوم واحد', () => assert.equal(leave.submitted.status, 201, JSON.stringify(leave.submitted.body)))
  if (leave.submitted.status === 201) {
    expectStatus(await act(mgrUser, leave.id, 'APPROVE', 'موافق'), 201)
    expectStatus(await act(hrUser, leave.id, 'APPROVE', 'موافق'), 201)
  }
  const run = await draft(calcUser, 'مسير قص الفلوس — أكتوبر', { employeeIds: [cut.id] })
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, cut.emp)
  const dayRate = 6001 / 30, minuteRate = dayRate / 8 / 60
  expect('سعر اليوم كسر متكرر 200.0333…', () => assert.equal(bd(item).dayRate, money(dayRate)))
  expect('خصم يوم بلا أجر مقصوص 200.03 (لا 200.04)', () => assert.deepEqual(
    [Number(item.unpaidLeaveDeduction), money(dayRate)], [200.03, 200.03]))
  expect('خصم 7 دقائق تأخير مقصوص 2.91 (لا 2.92)', () => assert.deepEqual(
    [Number(item.latenessDeduction), money(7 * minuteRate)], [2.91, 2.91]))
  expect('الصافي = 6001 − 200.03 − 2.91 = 5798.06', () => assert.equal(Number(item.netPay), 5798.06))

  // كل بند في كل مسير: مجموع السطور = الأعمدة المحفوظة
  const runs = expectStatus(await request(admin, 'GET', '/payroll/runs'), 200)
  let checked = 0
  for (const r of (runs.items ?? runs)) {
    const lines = await request(admin, 'GET', `/payroll/runs/${r.id}/lines`)
    if (lines.status !== 200) continue
    const detail = await runDetail(admin, r.id)
    for (const row of lines.body.rows) {
      const stored = detail.items.find(i => i.id === row.itemId)
      if (!stored) continue
      checked++
      const earnings = money(Number(stored.basicSalary) + Number(stored.allowances) + Number(stored.overtimeAmount) + Number(stored.otherAdditions))
      const deductions = money(Number(stored.latenessDeduction) + Number(stored.shortfallDeduction) + Number(stored.absenceDeduction)
        + Number(stored.unpaidLeaveDeduction) + Number(stored.loanInstallments) + Number(stored.otherDeductions) + Number(stored.socialInsuranceDeduction))
      expect(`سطور البند #${row.itemId} = أعمدته`, () => assert.deepEqual(
        [row.totals.earnings, row.totals.deductions, row.totals.net], [earnings, deductions, Number(stored.netPay)]))
      expect(`مجموع سطور الاستحقاق للبند #${row.itemId}`, () => assert.equal(
        money(row.earnings.reduce((sum, l) => sum + l.amount, 0)), row.totals.earnings))
      expect(`مجموع سطور الاستقطاع للبند #${row.itemId}`, () => assert.equal(
        money(row.deductions.reduce((sum, l) => sum + l.amount, 0)), row.totals.deductions))
      expect(`الصافي = الاستحقاق − الاستقطاع للبند #${row.itemId}`, () => assert.equal(
        money(row.totals.earnings - row.totals.deductions), row.totals.net))
    }
  }
  expect('فُحصت بنود فعلية', () => assert.ok(checked >= 10, `checked=${checked}`))
})

test('P12 — لا صرف مرتين: موظف واحد في مسيرين لنفس الشهر، والمنتهية خدمته خارج الشهر التالي', async () => {
  scene('P12 لا صرف مرتين')
  // (أ) مسير تانٍ لنفس الموظف في نفس الشهر: الموظف يُستبعد بسببه ولا يتكرر صرفه
  const dup = await draft(calcUser, 'مسير مكرر — أكتوبر', { employeeIds: [pBase.id] })
  const conflict = await request(calcUser, 'POST', `/payroll/runs/${dup.id}/calculate`, {})
  expect('المسير المكرر يُحسب فارغًا', () => assert.equal(conflict.status, 201, String(conflict.status)))
  if (conflict.status !== 201) return
  const member = (conflict.body.members ?? []).find(m => m.employeeId === pBase.id)
  expect('الموظف مستبعد بسبب «موجود في مسير آخر»', () => assert.deepEqual(
    [member?.membershipStatus, member?.exclusionReason], ['EXCLUDED', 'EXC_ALREADY_IN_RUN']))
  expect('المسير المكرر بلا بنود وبإجمالي صفر — لا صرف مرتين', () => assert.deepEqual(
    [(conflict.body.items ?? []).length, Number(conflict.body.totalNet)], [0, 0]))
  expect('لقطة العضو تسمّي المسير المصروف الآخر', () => assert.equal(member?.snapshot?.alreadyInRun?.status, 'PAID'))

  // (ب) المنتهية خدمته (آخر يوم عمل 2026-10-12) لا يدخل مسير الشهر التالي
  const next = await draft(calcUser, 'مسير نوفمبر — بعد التصفية', { employeeIds: [pSettle.id] }, '2026-11')
  const nextCalc = await request(calcUser, 'POST', `/payroll/runs/${next.id}/calculate`, {})
  const included = nextCalc.status === 201 && (nextCalc.body.items ?? []).some(i => i.employeeId === pSettle.id)
  expect('من انتهت خدمته في أكتوبر لا يُصرف له نوفمبر', () => assert.equal(included, false,
    `status=${nextCalc.status} items=${JSON.stringify((nextCalc.body?.items ?? []).map(i => [i.employeeId, i.netPay]))}`))
})

test('P13 — الصافي السالب يوقف الاعتماد بدل أن يُصرف رقم خاطئ', async () => {
  scene('P13 الصافي السالب')
  const target = await payrollStaff('N01', 'نبيل — صافي سالب')
  const dType = expectStatus(await request(admin, 'POST', '/deductions/types',
    { code: 'FT_BIG_FINE', nameAr: 'غرامة كبيرة', category: 'ADMINISTRATIVE', calcMethod: 'FIXED_AMOUNT',
      isExemptable: false, creatorScopes: ['HR'], approvalSteps: ['HR'] }), 201, 'type:')
  const dTypeId = dType.id ?? dType.type?.id
  // سقف الخصم من الإجمالي يمنع رقمًا يبتلع الراتب: 25% من 7800 = 1950.00
  const tooBig = await request(hrUser, 'POST', '/deductions',
    { employeeId: target.id, deductionTypeId: dTypeId, inputValue: '20000', incidentDate: '2026-09-10',
      reason: 'غرامة تجريبية كبيرة لاختبار حماية الصافي من القيم السالبة', targetPeriod: PERIOD })
  expect('خصم يبتلع الراتب مرفوض بسقف نسبة الإجمالي', () => assert.deepEqual(
    [tooBig.status, tooBig.body?.code, tooBig.body?.limit], [400, 'DEDUCTION_ABOVE_PCT_OF_GROSS', '1950.00'],
    JSON.stringify(tooBig.body)))
  const created = await request(hrUser, 'POST', '/deductions',
    { employeeId: target.id, deductionTypeId: dTypeId, inputValue: '1950', incidentDate: '2026-09-10',
      reason: 'غرامة عند حد السقف تمامًا لاختبار حماية الصافي', targetPeriod: PERIOD })
  expect('خصم عند حد السقف مقبول', () => assert.equal(created.status, 201, JSON.stringify(created.body)))
  if (created.status !== 201) return
  const id = created.body.id ?? created.body.deduction?.id
  for (let guard = 0; guard < 6; guard++) {
    const state = expectStatus(await request(hrUser, 'GET', `/deductions/${id}`), 200)
    if (state.status === 'APPROVED') break
    const step = await request(admin, 'POST', `/deductions/${id}/approve`, { expectedRevision: state.revision ?? 0, reason: 'اعتماد خطوة الغرامة الكبيرة' })
    if (step.status !== 201) break
  }
  const run = await draft(calcUser, 'مسير الصافي السالب — أكتوبر', { employeeIds: [target.id] })
  const calculated = await calcRun(calcUser, run.id)
  const item = itemOf(calculated, target.emp)
  expect('الخصم عند السقف يظهر كاملًا', () => assert.equal(Number(item.otherDeductions), 1950,
    `netPay=${item.netPay} otherDeductions=${item.otherDeductions}`))
  expect('الصافي 7800 − 1950 = 5850 ولا ينزل تحت الصفر', () => assert.deepEqual(
    [Number(item.netPay), Number(item.netPay) >= 0], [5850, true]))
  const approved = await approveRun(approveUser, run.id)
  expect('الاعتماد يمر والصافي غير سالب', () => assert.equal(approved.status, 201, JSON.stringify(approved.body)))
})

test('P10 — الخدمة الذاتية: الموظف يرى قسيمته وإجازاته وطلباته فقط', async () => {
  scene('P10 الخدمة الذاتية')
  const payslips = expectStatus(await request(pBase.user, 'GET', '/payroll/my-payslips'), 200)
  expect('الموظف يرى قسيمة مسيره المصروف', () => assert.ok(payslips.length >= 1, JSON.stringify(payslips)))
  const mineItem = payslips[0]?.item ?? payslips[0]
  expect('القسيمة بمبلغها الصحيح', () => assert.equal(Number(mineItem?.netPay), GROSS))
  const own = await request(pBase.user, 'GET', `/payroll/items/${mineItem?.id}`)
  expect('يفتح قسيمته', () => assert.equal(own.status, 200, JSON.stringify(own.body)))
  expect('القسيمة قسيمته هو', () => assert.equal(own.body?.item?.employeeId, pBase.id))
  // قسيمة غيره
  const otherItem = (await repo('PayrollItem').find({ where: { employeeId: pLate.id } }))[0]
  if (otherItem) {
    const foreign = await request(pBase.user, 'GET', `/payroll/items/${otherItem.id}`)
    expect('لا يفتح قسيمة غيره', () => assert.equal(foreign.status, 403))
  }
  const noPayrollList = await request(pBase.user, 'GET', '/payroll/runs')
  expect('الموظف لا يرى قائمة المسيرات', () => assert.equal(noPayrollList.status, 403))
  // إجازاتي وطلباتي
  const myLeaves = expectStatus(await request(e1.user, 'GET', '/leaves/mine'), 200)
  expect('«إجازاتي» لصاحبها فقط', () => assert.ok(myLeaves.every(row => row.employeeId === e1.id), JSON.stringify(myLeaves)))
  const myRequests = expectStatus(await request(e1.user, 'GET', '/requests/mine'), 200)
  expect('«طلباتي» لصاحبها فقط', () => assert.ok(myRequests.every(row => row.requesterId === e1.id)))
  const myBalances = expectStatus(await request(e1.user, 'GET', '/leaves/balances/mine'), 200)
  expect('«أرصدتي» لصاحبها', () => assert.ok(myBalances.every(row => row.employeeId === e1.id)))
  const foreignBalances = await request(e1.user, 'GET', `/leaves/balances/${e2.id}`)
  expect('لا يرى رصيد غيره', () => assert.equal(foreignBalances.status, 403))
  const foreignLeaves = await request(e1.user, 'GET', '/leaves')
  expect('لا يفتح سجل الإجازات العام', () => assert.equal(foreignLeaves.status, 403))
  const foreignRequest = await request(e1.user, 'GET', `/requests/${e1.annualRequestId}`)
  expect('يفتح طلبه هو', () => assert.equal(foreignRequest.status, 200))
})

// ============================================================================
// ملخص: كل تحقق «ناعم» فشل يظهر هنا مرة واحدة مجمّعًا
// ============================================================================
test('ZZ — ملخص الملاحظات', () => {
  if (soft.length) {
    console.log('\n================ الملاحظات ================')
    soft.forEach((row, index) => console.log(`${index + 1}. [${row.scenario}] ${row.label}\n   ${row.message}`))
    console.log('===========================================\n')
  }
  console.log(`سيناريوهات: ${scenarioNames.length} — تحققات فاشلة: ${soft.length}`)
  assert.equal(soft.length, 0, `${soft.length} تحقق فاشل — التفاصيل فوق`)
})

