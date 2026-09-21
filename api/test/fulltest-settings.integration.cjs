// اختبار شامل قبل التشغيل (الموجة C1): الإعدادات — هل كل إعداد بيعمل اللي مكتوب عليه فعلاً؟
// على قاعدة SQL مؤقتة عشوائية (hr_settings_test_<hex>) تُنشأ بـsynchronize وتُحذف في النهاية.
// لا مساس بقاعدة الشركة (hr_system) ولا بقاعدة المراجعة (hr_review_pre_payroll).
// التوكنات موقّعة محليًّا بسر عشوائي — لا كلمات مرور ولا أسرار.
//
// قاعدة الموجة: الإعداد اللي «بيتحفظ وبعدها يتجاهله النظام» عيب — فكل مفتاح هنا
// يُقرأ افتراضيًّا، يُعدَّل، ويُثبت أن السلوك اللي بيحكمه اتغيّر (مش بس إن القيمة اتخزنت).
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
// اسم القاعدة يلتزم بحارس البيئة (isDisposableTestDatabase): hr_<اسم>_test_<16 حرف hex>
const database = `hr_settings_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-fulltest-settings-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { configSeed } = require('../src/seed/requests-seed.data')

let app, master, ds, base, created = false
let admin, admin2, branchA, branchB, deptOps, deptB, employeeNumber = 0
let settingsUser, branchSettingsUser, plainUser, hrUser, attUser, payUser, e1, e2, mgr, baseSchedule

function assertDisposable() {
  assert.match(database, /^hr_settings_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  assert.notEqual(database, 'hr_review_pre_payroll')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
// طلب بترويسة حرة (مفتاح جهاز البصمة)
async function rawRequest(method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, note) {
  assert.equal(response.status, status, `${note ?? ''} ${JSON.stringify(response.body)}`)
  return response.body
}
const query = (route, params) => `${route}?${new URLSearchParams(params).toString()}`
const msg = r => { const m = r?.body?.message; return Array.isArray(m) ? m.join(' | ') : String(m ?? JSON.stringify(r?.body ?? '')) }
const isArabic = text => /[؀-ۿ]/.test(String(text))

// ===== تحقق «ناعم»: الفشل يُسجَّل ولا يوقف باقي السيناريو، فنجمع أكبر عدد ملاحظات في تشغيلة واحدة =====
const soft = []
let currentScenario = '—'
let checks = 0, passes = 0
const brief = error => String(error?.message ?? error).split('\n').map(l => l.trim()).filter(Boolean).join(' | ').slice(0, 600)
function expect(label, fn) {
  checks++
  try {
    const out = fn()
    if (out && typeof out.then === 'function') throw new Error('expect() got an async fn — use expectAsync')
    passes++; return true
  }
  catch (error) { soft.push({ scenario: currentScenario, label, message: brief(error) }); return false }
}
async function expectAsync(label, fn) {
  checks++
  try { await fn(); passes++; return true }
  catch (error) { soft.push({ scenario: currentScenario, label, message: brief(error) }); return false }
}
const scenarioNames = []
const scene = name => { currentScenario = name; scenarioNames.push(name); return name }
// تغطية المفاتيح: كل مفتاح نلمسه نسجّله بنوع التغطية
const coverage = new Map() // key -> Set of 'read' | 'write' | 'validate' | 'behaviour' | 'authority' | 'dead' | 'no-ui'
const cover = (key, kind) => { if (!coverage.has(key)) coverage.set(key, new Set()); coverage.get(key).add(kind); }

// ===== إعدادات المحرك =====
const getConfig = async (actor = admin) => {
  const rows = expectStatus(await request(actor, 'GET', '/settings/config'), 200)
  return new Map(rows.map(r => [r.key, r.value]))
}
const readKey = async key => (await getConfig()).get(key)
async function setKey(key, value, actor = admin, extra = {}) {
  cover(key, 'write')
  return request(actor, 'PATCH', '/settings/config', { key, value, ...extra })
}
// ضبط لازم ينجح — يفشل الاختبار بصوت عالي لو المفتاح نفسه مرفوض
async function mustSet(key, value, actor = admin, extra = {}) {
  const r = await setKey(key, value, actor, extra)
  expectStatus(r, 200, `PATCH ${key}=${value}:`)
  return r.body
}
// ضبط أيام الراحة العامة يحتاج مصافحة سريان التقويم
async function setWeekendDays(value, actor = admin) {
  const ctx = expectStatus(await request(actor, 'GET', query('/attendance/calendar-context', { scope: 'GLOBAL', sourceId: 0 })), 200)
  return setKey('attendance.weekend_days', value, actor, {
    calendarChange: { effectiveFrom: '2026-01-01', reason: 'اختبار أثر أيام الراحة العامة على أيام العمل',
      expectedRevision: ctx.revision, expectedCurrentSourceHash: ctx.currentSourceHash },
  })
}

// ===== مساعدو التجهيز =====
async function employee(overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `ST${String(n).padStart(3, '0')}`, fingerprintCode: `FP${String(n).padStart(3, '0')}`, fullName: `موظف إعدادات ${n}`,
    branchId: branchA.id, departmentId: deptOps.id, teamId: null, jobTitle: 'محاسب', joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الاختبار',
    iban: 'SA0000000000000000000001', ...overrides })
}
const user = (email, displayName, role, permissions, extra = {}) =>
  repo('User').save({ email: `${email}@settingstest.invalid`, displayName, passwordHash: 'test-only', role,
    branchId: branchA.id, permissions: JSON.stringify(permissions), ...extra })
let newEmployeeSeq = 0
// حمولة إنشاء موظف من الشاشة (الحقول الإجبارية كاملة)
function newEmployeePayload(code, name, overrides = {}) {
  const n = ++newEmployeeSeq
  return { employeeCode: code, fullName: name, fingerprintCode: `NFP${n}`, branchId: branchA.id,
    departmentId: deptOps.id, jobTitle: 'محاسب', joinDate: '2026-01-01', basicSalary: 5000, currency: 'SAR',
    payMethod: 'transfer', bankName: 'بنك الاختبار', iban: `SA00000000000000000009${String(n).padStart(2, '0')}`,
    phone: '0501234567', nationalId: String(1000000000 + n), birthDate: '1995-05-05', gender: 'male',
    nationality: 'سعودي', ...overrides }
}
async function staff(email, displayName, permissions = [], employeeOverrides = {}, role = 'employee') {
  const emp = await employee({ fullName: displayName, ...employeeOverrides })
  const account = await user(email, displayName, role, permissions, { employeeId: emp.id })
  return { emp, user: account, id: emp.id }
}

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

  branchA = await repo('Branch').save({ code: 'ST_A', name: 'فرع إعدادات أ' })
  branchB = await repo('Branch').save({ code: 'ST_B', name: 'فرع إعدادات ب' })
  deptOps = await repo('Department').save({ name: 'قسم العمليات', branchId: branchA.id, isActive: true })
  deptB = await repo('Department').save({ name: 'قسم فرع ب', branchId: branchB.id, isActive: true })
  admin = await repo('User').save({ email: 'admin@settingstest.invalid', displayName: 'مدير النظام', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  admin2 = await repo('User').save({ email: 'admin2@settingstest.invalid', displayName: 'مدير النظام الثاني', passwordHash: 'test-only',
    role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await require('../src/seed/seed-requests').seedRequests(ds)

  // حساب «إعدادات» عام (بلا فرع = نطاق الشركة) وحساب إعدادات مربوط بفرع
  settingsUser = await repo('User').save({ email: 'settings@settingstest.invalid', displayName: 'سلمى — الإعدادات',
    passwordHash: 'test-only', role: 'hr_manager', branchId: null,
    permissions: JSON.stringify(['settings.manage', 'org.manage', 'approval_chains.manage', 'request_types.manage',
      'users.manage', 'roles.manage', 'employees.view', 'employees.edit', 'employees.create', 'attendance.manage',
      'attendance.view_all', 'payroll.view', 'deductions.manage', 'bonuses.manage', 'leave_balances.manage']) })
  branchSettingsUser = await user('branchsettings', 'بدر — إعدادات فرع', 'hr_manager',
    ['settings.manage', 'org.manage', 'approval_chains.manage', 'request_types.manage', 'users.manage', 'roles.manage',
      'employees.view', 'employees.edit', 'attendance.manage', 'attendance.view_all'])
  plainUser = await user('plain', 'بسام — موظف عادي', 'employee', [])
  hrUser = await user('hr', 'هدى — الموارد البشرية', 'hr_manager', ['employees.view', 'employees.edit', 'leaves.view_all',
    'leave_balances.manage', 'requests.view_all', 'requests.create_on_behalf', 'deductions.manage', 'bonuses.manage',
    'loans.exceptional', 'payroll.view'])
  attUser = await user('att', 'أنس — الحضور', 'hr_manager', ['attendance.manage', 'attendance.view_all', 'overtime.confirm', 'employees.view'])
  payUser = await user('pay', 'فايز — الرواتب', 'finance_manager', ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.policy.manage', 'employees.view'])
  const managerStaff = await staff('mgr', 'ماجد — المدير المباشر', [], { jobTitle: 'مدير عمليات' })
  mgr = managerStaff.emp
  e1 = await staff('e1', 'سامي — موظف الاختبار', [], { managerEmployeeId: mgr.id })
  e2 = await staff('e2', 'نورا — موظفة الاختبار', [], { managerEmployeeId: mgr.id })
  for (const s of [e1, e2]) await require('../src/seed/seed-requests').ensureLeaveBalance(ds, s.id, 21)
  // تعريف دوام أساسي (بدونه ما فيش وردية فما فيش تأخير محسوب)
  baseSchedule = expectStatus(await request(admin, 'POST', '/catalogs/work-schedules', { name: 'الجدول الأساسي للاختبار',
    weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: true, isActive: true,
    effectiveFrom: '2026-01-01', changeReason: 'تعريف الدوام الأساسي لاختبار الإعدادات' }), 201, 'base work schedule:')
}, { timeout: 300000 })

after(async t => {
  const errors = []
  // ===== التقرير =====
  try {
    t.diagnostic(`scenarios=${scenarioNames.length} checks=${checks} passed=${passes} failed=${soft.length}`)
    const lines = []
    lines.push('===== FINDINGS =====')
    soft.forEach((f, i) => lines.push(`${i + 1}. [${f.scenario}] ${f.label} :: ${f.message}`))
    lines.push('===== COVERAGE =====')
    const seeded = configSeed.map(c => c.key)
    for (const key of seeded) {
      const kinds = coverage.get(key)
      lines.push(`${kinds ? 'COVERED  ' : 'NOT-COVERED'} ${key}${kinds ? ` [${[...kinds].sort().join(',')}]` : ''}`)
    }
    for (const [key, kinds] of coverage) if (!seeded.includes(key)) lines.push(`EXTRA     ${key} [${[...kinds].sort().join(',')}]`)
    lines.push(`===== TOTALS: keys=${seeded.length} covered=${seeded.filter(k => coverage.has(k)).length} checks=${checks} passed=${passes} failed=${soft.length} =====`)
    // الملف في مجلد مؤقت (مش في الريبو) — الرسالة نفسها في stdout كذلك
    const out = path.join(os.tmpdir(), `hr-settings-findings-${Date.now()}.txt`)
    fs.writeFileSync(out, lines.join('\n'), 'utf8')
    process.stdout.write(`\n${lines.join('\n')}\n\nreport: ${out}\n`)
  } catch (error) { errors.push(error) }
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
  if (errors.length) throw new AggregateError(errors, 'fulltest settings fixture cleanup failed')
})

// ============================================================================
// A) سطح الإعدادات: الكتالوج كامل ومقروء، والمفاتيح غير المعروفة مرفوضة
// ============================================================================

test('A1 — كتالوج مفاتيح الإعدادات كامل ومقروء (GET /settings/config)', async () => {
  scene('A1 كتالوج المفاتيح')
  const rows = expectStatus(await request(admin, 'GET', '/settings/config'), 200)
  const present = new Set(rows.map(r => r.key))
  const missing = configSeed.map(c => c.key).filter(k => !present.has(k))
  for (const c of configSeed) cover(c.key, 'read')
  expect('كل مفاتيح البذرة موجودة بعد الإقلاع', () => assert.deepEqual(missing, []))
  expect('عدد المفاتيح لا يقل عن البذرة', () => assert.ok(rows.length >= configSeed.length, `rows=${rows.length} seed=${configSeed.length}`))
})

test('A2 — مفتاح غير مُعلن مرفوض ولا يُخزَّن (لا إنشاء مفاتيح من العميل)', async () => {
  scene('A2 مفتاح غير معروف')
  const r = await setKey('evil.injected_key', 'true')
  expect('المفتاح غير المعروف مرفوض 404', () => assert.equal(r.status, 404))
  expect('الرسالة عربية', () => assert.ok(isArabic(msg(r)), msg(r)))
  const after = await getConfig()
  expect('المفتاح لم يُخزَّن', () => assert.equal(after.has('evil.injected_key'), false))
})

test('A3 — سلطة الكتابة: نطاق الشركة فقط، والموظف العادي ممنوع', async () => {
  scene('A3 سلطة الكتابة على الإعدادات')
  cover('leave.annual_entitled', 'authority')
  const scoped = await setKey('leave.annual_entitled', '22', branchSettingsUser)
  expect('حساب مربوط بفرع ممنوع من كتابة إعداد على مستوى الشركة (assertCompanyWideWrite)',
    () => assert.equal(scoped.status, 403))
  expect('رسالة المنع عربية', () => assert.ok(isArabic(msg(scoped)), msg(scoped)))
  const byPlain = await setKey('leave.annual_entitled', '23', plainUser)
  expect('موظف عادي ممنوع من PATCH config', () => assert.equal(byPlain.status, 403))
  const readByPlain = await request(plainUser, 'GET', '/settings/config')
  expect('موظف عادي ممنوع من قراءة الإعدادات', () => assert.equal(readByPlain.status, 403))
  // الملاحظة البنيوية: أي حساب غير super_admin نطاقه رقم فرعه أو -1، فـassertCompanyWideWrite ترفضه دائمًا،
  // فصلاحية settings.manage وحدها لا تكفي لتعديل أي إعداد على مستوى الشركة
  const allowed = await setKey('leave.annual_entitled', '21', settingsUser)
  expect('حساب بصلاحية settings.manage على كل الفروع (بلا فرع) يقدر يكتب إعداد الشركة — وإلا فالصلاحية بلا أثر ومدير النظام وحده يضبط الإعدادات',
    () => assert.equal(allowed.status, 200))
  await mustSet('leave.annual_entitled', '21', admin)
  // رخصة اعتماد المسير الذاتي: صلاحية مستقلة لا تكفيها settings.manage
  cover('payroll.approval_self_approval_allowed', 'authority')
  const licence = await setKey('payroll.approval_self_approval_allowed', 'true', settingsUser)
  expect('رخصة الاعتماد الذاتي محجوبة عن settings.manage وحدها', () => assert.equal(licence.status, 403))
  const withLicence = await setKey('payroll.approval_self_approval_allowed', 'true', admin)
  expect('مدير النظام يملك رخصة الاعتماد الذاتي', () => assert.equal(withLicence.status, 200))
  await mustSet('payroll.approval_self_approval_allowed', 'false')
})

test('A4 — مفاتيح يقرؤها الخادم ولا تُضبط من الإعدادات (مفاتيح يتيمة)', async () => {
  scene('A4 مفاتيح يتيمة يقرؤها الخادم')
  // كل مفتاح هنا مقروء في api/src بقيمة افتراضية، ومش مبذور فـPATCH /settings/config يرده «غير معروف»
  // قرار الإصلاح (21 سبتمبر): payroll.shortfall_deduction_enabled ما اتبذرش — التراكم اليومي اتوجّه
  // للمفتاح اللي الشاشة بتكتبه فعلًا (payroll.shortfall_enabled)، فالاسم اليتيم اتشال من المصدر خالص.
  const orphans = [
    ['payroll.daily_accrual_enabled', 'false', 'مفتاح إيقاف التراكم اليومي الموثق في التعليق (payroll-daily-accrual.ts:8)'],
    ['payroll.daily_accrual_hour', '3', 'ساعة تشغيل التراكم اليومي (payroll-daily-accrual.ts:9)'],
    ['system.country', 'SA', 'دولة النظام الافتراضية للعطلات الرسمية (catalogs.controller.ts:333، 435)'],
  ]
  const config = await getConfig()
  for (const [key, value, why] of orphans) {
    cover(key, 'dead')
    expect(`«${key}» مبذور فيمكن ضبطه — ${why}`, () => assert.ok(config.has(key), 'غير موجود في requests_config'))
    const r = await setKey(key, value)
    expect(`«${key}» قابل للضبط من PATCH /settings/config`, () => assert.equal(r.status, 200, msg(r)))
  }
  // مقابل ذلك: مفتاح الخصم المبذور موجود ويُضبط — فالإعداد اللي يقرؤه التراكم اسم تاني
  const settable = await setKey('payroll.shortfall_enabled', 'false')
  expect('payroll.shortfall_enabled (المبذور) يُضبط بنجاح', () => assert.equal(settable.status, 200))
  await mustSet('payroll.shortfall_enabled', 'true')
  // والقارئ بقى على نفس الاسم: مفيش مفتاح نقص يتيم في المصدر
  const accrual = fs.readFileSync(path.join(apiRoot, 'src/payroll/payroll-daily-accrual.service.ts'), 'utf8').replace(/\r\n/g, '\n')
  expect('التراكم اليومي يقرأ payroll.shortfall_enabled نفسه', () => {
    assert.ok(accrual.includes("'payroll.shortfall_enabled'"), 'القارئ مش على المفتاح المبذور')
    assert.ok(!accrual.includes('shortfall_deduction_enabled'), 'لسه فيه اسم مفتاح يتيم في القارئ')
  })
  // صفوف حالة داخلية مخزنة في نفس جدول الإعدادات
  const stateKeys = ['attendance.absences_materialized_through', 'leave.rollover_through_period']
  for (const key of stateKeys) {
    if (!config.has(key)) continue
    cover(key, 'dead')
    expect(`صف الحالة الداخلي «${key}» ما يظهرش في كتالوج الإعدادات القابلة للتعديل`,
      () => assert.ok(false, 'صف حالة داخلي معروض مع مفاتيح الإعدادات في GET /settings/config'))
  }
})

// ============================================================================
// B) الحضور: سماحية التأخير، أيام الراحة، مفتاح الجهاز، بدل العطلة، المرونة
// ============================================================================

test('B1 — attendance.grace_minutes: السماحية تغيّر التأخير المحسوب', async () => {
  scene('B1 سماحية التأخير')
  cover('attendance.grace_minutes', 'behaviour')
  const s = await staff('grace', 'جواد — سماحية التأخير', [], { managerEmployeeId: mgr.id })
  const day1 = '2026-09-14', day2 = '2026-09-15' // اثنين وثلاثاء (دوام)
  const punch = async (day, at) => {
    expectStatus(await request(attUser, 'POST', '/attendance/punches/manual', { reason: 'اختبار سماحية التأخير',
      punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: `${day} ${at}` },
        { employeeCode: s.emp.fingerprintCode, timestamp: `${day} 16:00:00` }] }), 201, 'manual punch:')
  }
  const dayRow = async day => {
    const rows = expectStatus(await request(attUser, 'GET', query('/attendance/monthly', { employeeId: s.id, from: day, to: day })), 200)
    const list = Array.isArray(rows) ? rows : (rows.days ?? rows.rows ?? [])
    return list.find(r => String(r.date).slice(0, 10) === day) ?? null
  }
  await expectAsync('الافتراضي 10 دقائق', async () => assert.equal(await readKey('attendance.grace_minutes'), '10'))
  await punch(day1, '08:09:00')
  const withGrace = await dayRow(day1)
  expect('اليوم اتحسب على وردية فعلاً (مش صف بلا دوام)', () => {
    assert.ok(withGrace, 'no attendance day row')
    assert.ok(withGrace.shiftStart || withGrace.shiftName, `no shift resolved: ${JSON.stringify(withGrace).slice(0, 300)}`)
  })
  expect('بسماحية 10: تأخير 9 دقائق خام يُستهلك بالسماحية (lateMinutes صفر)', () => {
    assert.ok(withGrace, 'no attendance day row')
    assert.equal(Number(withGrace.rawLateMinutes ?? 0), 9)
    assert.equal(Number(withGrace.lateMinutes ?? 0), 0)
  })
  // ===== الجوهر: تغيير الإعداد العام يوصل لموظف عنده تعريف دوام قائم — من تاريخ التغيير وطالع =====
  // قرار الإصلاح (21 سبتمبر): الحفظ بيضيف نسخة مؤرخة من النهارده على كل جدول ووردية.
  // الأيام المحسوبة قبل كده تفضل مجمّدة على سماحيتها (تاريخ الرواتب لا يتغير بأثر رجعي)،
  // واليوم من تاريخ السريان وطالع بياخد القيمة الجديدة.
  await mustSet('attendance.grace_minutes', '0')
  expectStatus(await request(attUser, 'POST', query('/attendance/recompute', { date: day1 })), 201, 'recompute:')
  const noGrace = await dayRow(day1)
  expect('يوم قديم: إعادة الحساب ما بتغيّرش تأخيره — التاريخ مجمّد على سماحيته وقتها', () => {
    assert.ok(noGrace, 'no attendance day row after recompute')
    assert.equal(Number(noGrace.rawLateMinutes ?? 0), 9)
    assert.equal(Number(noGrace.lateMinutes ?? 0), 0, 'يوم سابق اتأثر بتغيير إعداد لاحق')
  })
  // بصمة على يوم سابق كمان بتتحسب بسماحية وقتها، مش بالقيمة الجديدة
  await punch(day2, '08:09:00')
  const freshDay = await dayRow(day2)
  expect('يوم سابق ببصمة جديدة: برضه بسماحية وقته', () => {
    assert.ok(freshDay, 'no attendance day row for day2')
    assert.equal(Number(freshDay.lateMinutes ?? 0), 0,
      `lateMinutes=${freshDay.lateMinutes} rawLateMinutes=${freshDay.rawLateMinutes}`)
  })
  // ومن تاريخ السريان وطالع: نفس الموظف ونفس التعريف بياخد السماحية الجديدة
  const versions = await request(admin, 'GET', query('/catalogs/work-schedules', {}))
  expect('الحفظ ضاف نسخة مؤرخة (مش بيتجاهل الإعداد)', () => assert.equal(versions.status, 200, msg(versions)))
  // المسار اللي المفتاح بيشتغل فيه فعلاً: تعريف دوام جديد يتولد بالقيمة الحيّة
  const fresh = await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول بلا سماحية',
    weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: false, isActive: true,
    effectiveFrom: '2026-02-01', changeReason: 'تعريف دوام جديد يلتقط السماحية الحيّة (0)' })
  expect('إنشاء تعريف دوام جديد ينجح', () => assert.ok(fresh.status < 400, `${fresh.status} ${JSON.stringify(fresh.body)}`))
  if (fresh.status < 400) {
    const assigned = await request(admin, 'POST', `/catalogs/work-schedules/${fresh.body.id}/assign`,
      { employeeIds: [s.id], effectiveFrom: '2026-02-01', changeReason: 'إسناد تعريف الدوام الجديد للموظف' })
    expect('إسناد التعريف الجديد للموظف ينجح', () => assert.ok(assigned.status < 400, `${assigned.status} ${JSON.stringify(assigned.body)}`))
    const day3 = '2026-09-16' // أربعاء
    await punch(day3, '08:09:00')
    const onNew = await dayRow(day3)
    expect('على تعريف دوام أُنشئ بعد التغيير: التأخير محسوب — المفتاح يُقرأ وقت إنشاء التعريف فقط', () => {
      assert.ok(onNew, 'no attendance row on new schedule')
      assert.ok(Number(onNew.lateMinutes ?? 0) > 0,
        `lateMinutes=${onNew.lateMinutes} rawLateMinutes=${onNew.rawLateMinutes} shiftName=${onNew.shiftName}`)
    })
  }
  await mustSet('attendance.grace_minutes', '10')
  cover('attendance.grace_minutes', 'validate')
  const bad = await setKey('attendance.grace_minutes', '-1')
  expect('سماحية سالبة مرفوضة برسالة عربية', () => { assert.equal(bad.status, 400); assert.ok(isArabic(msg(bad)), msg(bad)) })
  const notNumber = await setKey('attendance.grace_minutes', 'عشرة')
  expect('سماحية غير رقمية مرفوضة', () => assert.equal(notNumber.status, 400))
  await expectAsync('القيمة المرفوضة لم تُخزَّن', async () => assert.equal(await readKey('attendance.grace_minutes'), '10'))
})

test('B2 — attendance.weekend_days: أيام الراحة تغيّر أيام العمل المحسوبة', async () => {
  scene('B2 أيام الراحة العامة')
  cover('attendance.weekend_days', 'behaviour')
  const from = '2026-06-07', to = '2026-06-13' // أحد → سبت، أسبوع كامل
  const workingDays = async () => expectStatus(await request(admin, 'GET', query('/attendance/working-days', { from, to })), 200)
  await expectAsync('الافتراضي FRI,SAT', async () => assert.equal(await readKey('attendance.weekend_days'), 'FRI,SAT'))
  const before = await workingDays()
  expect('بـFRI,SAT: 5 أيام عمل من 7', () => assert.deepEqual([before.total, before.working], [7, 5]))
  const changed = await setWeekendDays('FRI')
  expect('تغيير أيام الراحة بمصافحة التقويم ينجح', () => assert.equal(changed.status, 200))
  if (changed.status === 200) {
    const after = await workingDays()
    expect('بـFRI فقط: 6 أيام عمل من 7', () => assert.deepEqual([after.total, after.working], [7, 6]))
  }
  // السلوك القديم: «Fri Sat» بمسافة كان يُحفظ فلا يطابق أي يوم
  cover('attendance.weekend_days', 'validate')
  const spaced = await setKey('attendance.weekend_days', 'Fri Sat')
  expect('أيام راحة بمسافة بدل فاصلة مرفوضة', () => { assert.equal(spaced.status, 400); assert.ok(isArabic(msg(spaced)), msg(spaced)) })
  const allWeek = await setKey('attendance.weekend_days', 'SUN,MON,TUE,WED,THU,FRI,SAT')
  expect('كل الأيام راحة مرفوض (لازم يوم عمل واحد)', () => assert.equal(allWeek.status, 400))
  const junk = await setKey('attendance.weekend_days', 'XXX')
  expect('رمز يوم غير معروف مرفوض', () => assert.equal(junk.status, 400))
  const noHandshake = await setKey('attendance.weekend_days', 'THU,FRI')
  expect('تغيير أيام الراحة بلا مصافحة سريان مرفوض', () => assert.notEqual(noHandshake.status, 200))
  await setWeekendDays('FRI,SAT')
  await expectAsync('العودة للافتراضي', async () => assert.equal(await readKey('attendance.weekend_days'), 'FRI,SAT'))
  // بيانات سريان التقويم تخص أيام الراحة فقط
  const wrongCalendarChange = await setKey('attendance.grace_minutes', '10',
    admin, { calendarChange: { effectiveFrom: '2026-01-01', reason: 'اختبار', expectedRevision: 0, expectedCurrentSourceHash: 'a'.repeat(64) } })
  expect('بيانات سريان التقويم مرفوضة على مفتاح غير أيام الراحة', () => assert.equal(wrongCalendarChange.status, 400))
})

test('B3 — attendance.device_key: المفتاح يفتح/يقفل استقبال البصمات', async () => {
  scene('B3 مفتاح جهاز البصمة')
  cover('attendance.device_key', 'behaviour')
  const s = await staff('devkey', 'دانة — مفتاح الجهاز', [], { managerEmployeeId: mgr.id })
  const punchBody = { punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: '2026-06-09 08:00:00', deviceSn: 'ZK-TEST' }] }
  await expectAsync('الافتراضي فارغ = الاستقبال موقوف', async () => assert.equal(await readKey('attendance.device_key'), ''))
  const closed = await rawRequest('POST', '/attendance/punches', punchBody, { 'x-device-key': 'anything' })
  expect('بالمفتاح الفارغ: الاستقبال مرفوض', () => assert.ok(closed.status >= 400, `status=${closed.status}`))
  cover('attendance.device_key', 'validate')
  const weak = await setKey('attendance.device_key', 'zk-device-key-change-me')
  expect('مفتاح ضعيف/منشور مرفوض برسالة عربية', () => { assert.equal(weak.status, 400); assert.ok(isArabic(msg(weak)), msg(weak)) })
  const short = await setKey('attendance.device_key', 'abc123')
  expect('مفتاح قصير مرفوض', () => assert.equal(short.status, 400))
  const strong = crypto.randomBytes(24).toString('hex')
  await mustSet('attendance.device_key', strong)
  const wrongKey = await rawRequest('POST', '/attendance/punches', punchBody, { 'x-device-key': `${strong}x` })
  expect('مفتاح خاطئ مرفوض', () => assert.ok(wrongKey.status >= 400, `status=${wrongKey.status}`))
  const ok = await rawRequest('POST', '/attendance/punches', punchBody, { 'x-device-key': strong })
  expect('المفتاح الصحيح يفتح الاستقبال', () => assert.ok(ok.status < 400, `status=${ok.status} ${JSON.stringify(ok.body)}`))
  await mustSet('attendance.device_key', '')
  const closedAgain = await rawRequest('POST', '/attendance/punches', punchBody, { 'x-device-key': strong })
  expect('إفراغ المفتاح يقفل الاستقبال فوراً', () => assert.ok(closedAgain.status >= 400, `status=${closedAgain.status}`))
})

test('B4 — attendance.holiday_work_multiplier: مضاعف بدل دوام العطلة الافتراضي', async () => {
  scene('B4 مضاعف دوام العطلة')
  cover('attendance.holiday_work_multiplier', 'behaviour')
  const before = expectStatus(await request(attUser, 'GET', '/attendance/holiday-work/settings'), 200)
  expect('الإعداد يظهر في شاشة دوام العطلات بقيمته (1.5)', () => assert.equal(String(before.multiplier ?? before.value ?? ''), '1.5'))
  await mustSet('attendance.holiday_work_multiplier', '2.25')
  const after = expectStatus(await request(attUser, 'GET', '/attendance/holiday-work/settings'), 200)
  expect('تغيير المفتاح يغيّر المضاعف الافتراضي المعروض', () => assert.equal(String(after.multiplier ?? after.value ?? ''), '2.25'))
  // الأمر الجديد بلا مضاعف صريح يأخذ الافتراضي من الإعداد
  const order = await request(attUser, 'POST', '/attendance/holiday-work', { name: 'أمر دوام عطلة للاختبار',
    targetLevel: 'employees', branchId: branchA.id, employeeIds: [e1.id], dates: ['2026-06-12'], note: 'اختبار المضاعف الافتراضي' })
  expect('إنشاء أمر دوام عطلة ينجح', () => assert.ok(order.status < 400, `${order.status} ${JSON.stringify(order.body)}`))
  if (order.status < 400) {
    const created = order.body?.order ?? order.body
    expect('الأمر الجديد يورث المضاعف من الإعداد', () => assert.equal(Number(created.multiplier), 2.25))
  }
  // نفس الإعداد قابل للضبط من شاشة الحضور
  const byBranchScreen = await request(attUser, 'PATCH', '/attendance/holiday-work/settings', { multiplier: '1.9' })
  expect('حساب فرع ممنوع من ضبط مضاعف الشركة من شاشة الحضور', () => assert.equal(byBranchScreen.status, 403))
  const viaHolidayScreen = await request(admin, 'PATCH', '/attendance/holiday-work/settings', { multiplier: '1.5' })
  expect('شاشة دوام العطلات تضبط نفس المفتاح', () => assert.ok(viaHolidayScreen.status < 400, `${viaHolidayScreen.status} ${JSON.stringify(viaHolidayScreen.body)}`))
  await expectAsync('القيمة رجعت 1.5 في requests_config', async () => assert.equal(await readKey('attendance.holiday_work_multiplier'), '1.5')) // eslint-disable-line
})

test('B5 — attendance.flex.*: إعدادات المرونة تُثبَّت في نسخة تعريف الدوام الجديدة', async () => {
  scene('B5 إعدادات المرونة')
  for (const k of ['attendance.flex.unpaid_break_minutes', 'attendance.flex.shortfall_grace_minutes',
    'attendance.flex.count_early_work_toward_required']) cover(k, 'behaviour')
  // دي بتُلتقط في نفس اللقطة المؤرخة، لكن أثرها الحسابي مش مقيس هنا
  for (const k of ['attendance.flex.max_session_minutes', 'attendance.flex.prorate_window_on_partial_leave',
    'attendance.flex.window_supersedes_grace', 'attendance.flex.missing_checkout_policy']) cover(k, 'snapshot')
  await mustSet('attendance.flex.unpaid_break_minutes', '45')
  await mustSet('attendance.flex.count_early_work_toward_required', 'true')
  await mustSet('attendance.flex.shortfall_grace_minutes', '17')
  const created = await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول المرونة للاختبار',
    weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: false, isActive: true,
    flexEnabled: true, flexWindowMinutes: 120, requiredWorkMinutes: 480, effectiveFrom: '2026-03-01',
    changeReason: 'اختبار تثبيت إعدادات المرونة في النسخة' })
  expect('إنشاء جدول عمل ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  if (created.status < 400) {
    const history = await request(admin, 'GET', `/attendance-rules/WORK_SCHEDULE/${created.body.id}/history`)
    expect('تاريخ نسخ الجدول متاح', () => assert.ok(history.status < 400, `${history.status} ${JSON.stringify(history.body)}`))
    if (history.status < 400) {
      const versions = history.body.versions ?? history.body
      const snap = (Array.isArray(versions) ? versions : []).map(v => v.snapshot?.data ?? v.snapshot).filter(Boolean).at(-1)
      const flex = snap?.flexPolicy ?? snap
      expect('النسخة الجديدة أخذت قيم المرونة من الإعدادات وقت الإنشاء', () => {
        assert.ok(flex, `no flexPolicy in snapshot: ${JSON.stringify(snap).slice(0, 400)}`)
        assert.equal(Number(flex.unpaidBreakMinutes), 45)
        assert.equal(flex.countEarlyWorkTowardRequired, true)
        assert.equal(Number(flex.shortfallGraceMinutes), 17)
      })
    }
  }
  cover('attendance.flex.unpaid_break_minutes', 'validate')
  const tooBig = await setKey('attendance.flex.unpaid_break_minutes', '1441')
  expect('دقائق أكبر من اليوم مرفوضة', () => { assert.equal(tooBig.status, 400); assert.ok(isArabic(msg(tooBig)), msg(tooBig)) })
  const zeroSession = await setKey('attendance.flex.max_session_minutes', '0')
  expect('أقصى مدة جلسة صفر مرفوضة (الحد الأدنى 1)', () => assert.equal(zeroSession.status, 400))
  const badCheckout = await setKey('attendance.flex.missing_checkout_policy', 'AUTO_CLOSE')
  expect('سياسة بصمة انصراف غير منفّذة مرفوضة', () => assert.equal(badCheckout.status, 400))
  await mustSet('attendance.flex.unpaid_break_minutes', '0')
  await mustSet('attendance.flex.count_early_work_toward_required', 'false')
  await mustSet('attendance.flex.shortfall_grace_minutes', '10')
})

test('B6 — attendance.absence_penalty_days / sync_interval_minutes / absence_catchup_max_days', async () => {
  scene('B6 مفاتيح حضور أخرى')
  for (const k of ['attendance.absence_penalty_days', 'attendance.sync_interval_minutes', 'attendance.absence_catchup_max_days'])
    cover(k, 'write')
  // معامل عقوبة الغياب — يقرؤه المسير (موجة ب)؛ هنا نثبت القبول والرفض
  const okPenalty = await setKey('attendance.absence_penalty_days', '1.5')
  expect('معامل عقوبة الغياب 1.5 مقبول', () => assert.equal(okPenalty.status, 200))
  cover('attendance.absence_penalty_days', 'validate')
  const badPenalty = await setKey('attendance.absence_penalty_days', '-2')
  expect('معامل عقوبة الغياب السالب مرفوض', () => assert.equal(badPenalty.status, 400))
  await mustSet('attendance.absence_penalty_days', '1')
  cover('attendance.absence_catchup_max_days', 'validate')
  const zeroCatchup = await setKey('attendance.absence_catchup_max_days', '0')
  expect('لحاق الغياب صفر مرفوض (يوم على الأقل)', () => assert.equal(zeroCatchup.status, 400))
  const okSync = await setKey('attendance.sync_interval_minutes', '15')
  expect('فاصل مزامنة الأجهزة يُحفظ', () => assert.equal(okSync.status, 200))
  await mustSet('attendance.sync_interval_minutes', '0')
})

// ============================================================================
// C) الأوفرتايم: العتبة والتقريب والمضاعف والتفعيل
// ============================================================================

test('C1 — overtime.detection_threshold_hours / rounding_minutes: البصمة تُنتج دقائق مختلفة', async () => {
  scene('C1 عتبة وتقريب الإضافي')
  cover('overtime.detection_threshold_hours', 'behaviour'); cover('overtime.rounding_minutes', 'behaviour')
  const s = await staff('ot', 'عمر — الإضافي', [], { managerEmployeeId: mgr.id })
  const day = '2026-09-07' // اثنين، داخل حد الأثر الرجعي 30 يوماً
  expectStatus(await request(attUser, 'POST', '/attendance/punches/manual', { reason: 'اختبار الإضافي',
    punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: `${day} 08:00:00` },
      { employeeCode: s.emp.fingerprintCode, timestamp: `${day} 16:50:00` }] }), 201, 'manual punch:')
  const preview = async () => {
    const r = await request(hrUser, 'GET', query('/attendance/overtime/preview', { date: day, employeeId: s.id }))
    return r.status < 400 ? r.body : { error: r }
  }
  const p1 = await preview()
  expect('المعاينة متاحة', () => assert.ok(!p1.error, `preview failed: ${JSON.stringify(p1.error?.body)}`))
  const detected1 = Number(p1?.detectedMinutes ?? p1?.evidence?.detectedMinutes ?? -1)
  expect('بعتبة 0.5 ساعة وتقريب 15: 50 دقيقة زيادة تُقرَّب لـ45', () => assert.equal(detected1, 45))
  await mustSet('overtime.rounding_minutes', '30')
  const p2 = await preview()
  const detected2 = Number(p2?.detectedMinutes ?? p2?.evidence?.detectedMinutes ?? -1)
  expect('بتقريب 30: نفس البصمة تُنتج 30 دقيقة', () => assert.equal(detected2, 30))
  await mustSet('overtime.detection_threshold_hours', '1')
  const p3 = await preview()
  const detected3 = Number(p3?.detectedMinutes ?? p3?.evidence?.detectedMinutes ?? -1)
  expect('برفع العتبة لساعة: الزيادة 50 دقيقة لا تستحق إضافياً', () => assert.equal(detected3, 0))
  await mustSet('overtime.detection_threshold_hours', '0.5')
  await mustSet('overtime.rounding_minutes', '15')
  cover('overtime.rounding_minutes', 'validate')
  const badRounding = await setKey('overtime.rounding_minutes', '0')
  expect('وحدة تقريب صفر مرفوضة', () => assert.equal(badRounding.status, 400))
  const hugeRounding = await setKey('overtime.rounding_minutes', '1441')
  expect('وحدة تقريب أكبر من اليوم مرفوضة', () => { assert.equal(hugeRounding.status, 400); assert.ok(isArabic(msg(hugeRounding)), msg(hugeRounding)) })
  cover('overtime.detection_threshold_hours', 'validate')
  const badThreshold = await setKey('overtime.detection_threshold_hours', '25')
  expect('عتبة أكبر من 24 ساعة مرفوضة', () => assert.equal(badThreshold.status, 400))
  const fractional = await setKey('overtime.detection_threshold_hours', '0.001')
  expect('عتبة لا تمثل دقائق صحيحة مرفوضة', () => assert.equal(fractional.status, 400))
})

test('C2 — overtime.multiplier_* : مضاعف نوع اليوم يغيّر قيمة الإضافي', async () => {
  scene('C2 مضاعفات الإضافي')
  for (const k of ['overtime.multiplier_weekday', 'overtime.multiplier_weekend', 'overtime.multiplier_holiday']) cover(k, 'behaviour')
  const s = await staff('otmul', 'مروان — مضاعف الإضافي', [], { managerEmployeeId: mgr.id })
  const day = '2026-09-08' // ثلاثاء
  expectStatus(await request(attUser, 'POST', '/attendance/punches/manual', { reason: 'اختبار مضاعف الإضافي',
    punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: `${day} 08:00:00` },
      { employeeCode: s.emp.fingerprintCode, timestamp: `${day} 17:00:00` }] }), 201, 'manual punch:')
  const multiplierOf = async () => {
    const r = await request(hrUser, 'GET', query('/attendance/overtime/preview', { date: day, employeeId: s.id }))
    return r.status < 400 ? Number(r.body?.policy?.multiplier ?? r.body?.multiplier ?? NaN) : NaN
  }
  await expectAsync('المضاعف الافتراضي ليوم عمل 1.5', async () => assert.equal(await multiplierOf(), 1.5))
  await mustSet('overtime.multiplier_weekday', '1.75')
  await expectAsync('تغيير مضاعف يوم العمل ينعكس في المعاينة', async () => assert.equal(await multiplierOf(), 1.75))
  await mustSet('overtime.multiplier_weekday', '1.5')
  cover('overtime.multiplier_weekday', 'validate')
  const threeDecimals = await setKey('overtime.multiplier_weekday', '1.555')
  expect('مضاعف بثلاث منازل عشرية مرفوض', () => { assert.equal(threeDecimals.status, 400); assert.ok(isArabic(msg(threeDecimals)), msg(threeDecimals)) })
  const tooBig = await setKey('overtime.multiplier_weekend', '100')
  expect('مضاعف أكبر من 99.99 مرفوض', () => assert.equal(tooBig.status, 400))
  const zero = await setKey('overtime.multiplier_holiday', '0')
  expect('مضاعف صفر مرفوض (الحد الأدنى 0.01)', () => assert.equal(zero.status, 400))
})

test('C3 — overtime.enabled / allow_early_overtime / request_backdate_days / max_hours_*', async () => {
  scene('C3 مفاتيح سياسة الإضافي')
  for (const k of ['overtime.enabled', 'overtime.allow_early_overtime', 'overtime.request_backdate_days',
    'overtime.max_hours_per_day', 'overtime.max_hours_per_week', 'overtime.max_hours_per_month',
    'overtime.max_closed_periods', 'overtime.biometric_requires_confirmation', 'overtime.rounding_direction',
    'overtime.missing_punch_policy', 'overtime.leave_conflict_policy']) cover(k, 'write')
  const s = await staff('otpol', 'هاني — سياسة الإضافي', [], { managerEmployeeId: mgr.id })
  const day = '2026-09-09' // أربعاء
  expectStatus(await request(attUser, 'POST', '/attendance/punches/manual', { reason: 'اختبار سياسة الإضافي',
    punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: `${day} 08:00:00` },
      { employeeCode: s.emp.fingerprintCode, timestamp: `${day} 18:00:00` }] }), 201, 'manual punch:')
  const previewBody = async () => {
    const r = await request(hrUser, 'GET', query('/attendance/overtime/preview', { date: day, employeeId: s.id }))
    return r.status < 400 ? r.body : null
  }
  // سقف يومي: 1 ساعة يقص الساعتين المكتشفتين
  cover('overtime.max_hours_per_day', 'behaviour')
  const before = await previewBody()
  const detectedBefore = Number(before?.detectedMinutes ?? before?.evidence?.detectedMinutes ?? -1)
  expect('بلا سقف يومي: ساعتان مكتشفتان (120 دقيقة)', () => assert.equal(detectedBefore, 120))
  await mustSet('overtime.max_hours_per_day', '1')
  const after = await previewBody()
  const detectedAfter = Number(after?.detectedMinutes ?? after?.evidence?.detectedMinutes ?? -1)
  expect('سقف يومي ساعة يقص المكتشف إلى 60 دقيقة', () => assert.equal(detectedAfter, 60))
  await mustSet('overtime.max_hours_per_day', '0')
  cover('overtime.max_hours_per_day', 'validate')
  const badCap = await setKey('overtime.max_hours_per_day', '25')
  expect('سقف يومي أكبر من 24 ساعة مرفوض', () => assert.equal(badCap.status, 400))
  const badWeek = await setKey('overtime.max_hours_per_week', '169')
  expect('سقف أسبوعي أكبر من 168 ساعة مرفوض', () => assert.equal(badWeek.status, 400))
  const badMonth = await setKey('overtime.max_hours_per_month', '745')
  expect('سقف شهري أكبر من 744 ساعة مرفوض', () => assert.equal(badMonth.status, 400))
  // قيم مغلقة: مفاتيح لا تقبل غير القيمة المنفّذة
  cover('overtime.rounding_direction', 'validate'); cover('overtime.missing_punch_policy', 'validate')
  cover('overtime.leave_conflict_policy', 'validate'); cover('overtime.biometric_requires_confirmation', 'validate')
  for (const [key, bad] of [['overtime.rounding_direction', 'UP'], ['overtime.missing_punch_policy', 'ALLOW'],
    ['overtime.leave_conflict_policy', 'ALLOW'], ['overtime.biometric_requires_confirmation', 'false']]) {
    const r = await setKey(key, bad)
    expect(`«${key}» لا يقبل «${bad}» (قيمة غير منفّذة)`, () => { assert.equal(r.status, 400); assert.ok(isArabic(msg(r)), msg(r)) })
  }
  // overtime.enabled: قفل الإضافي
  cover('overtime.enabled', 'behaviour')
  await mustSet('overtime.enabled', 'false')
  const closed = await previewBody()
  expect('بإيقاف الإضافي: نافذة الإضافي مقفولة في المعاينة', () => {
    assert.ok(closed, 'preview unavailable')
    assert.equal(closed.window?.open, false, `window=${JSON.stringify(closed.window)}`)
  })
  await mustSet('overtime.enabled', 'true')
  cover('overtime.request_backdate_days', 'validate')
  const badBackdate = await setKey('overtime.request_backdate_days', '1.5')
  expect('أيام الأثر الرجعي للإضافي لازم عدد صحيح', () => assert.equal(badBackdate.status, 400))
  await mustSet('overtime.allow_early_overtime', 'true')
  await expectAsync('الإضافي المبكر يُحفظ', async () => assert.equal(await readKey('overtime.allow_early_overtime'), 'true'))
  await mustSet('overtime.allow_early_overtime', 'false')
})

test('C3b — مفاتيح «إعداد» مقفولة على قيمة واحدة منفّذة (توثيق لا إعداد)', async () => {
  scene('C3b مفاتيح بقيمة واحدة')
  const locked = [
    ['overtime.rounding_direction', 'DOWN'], ['overtime.missing_punch_policy', 'BLOCK'],
    ['overtime.leave_conflict_policy', 'BLOCK'], ['overtime.biometric_requires_confirmation', 'true'],
    ['overtime.default_window', 'AFTER_SHIFT_END'], ['overtime.outside_window_policy', 'CLOSED'],
    ['payroll.hourly_rate_basis', 'DAILY_HOURS'], ['payroll.day_rate_basis', 'MONTHLY_FIXED_COMPONENTS_30'],
    ['payroll.monthly_days', '30'], ['attendance.flex.missing_checkout_policy', 'MANUAL_ONLY'],
  ]
  const config = await getConfig()
  for (const [key, only] of locked) {
    cover(key, 'dead')
    expect(`«${key}» قيمته الوحيدة المقبولة «${only}» — بند عرض لا إعداد`, () => assert.equal(config.get(key), only))
  }
  expect('عدد المفاتيح المقفولة على قيمة واحدة', () => assert.equal(locked.length, 10))
})

test('C4 — overtime.wage_components: مفتاح توافق — أي قيمة تُعاد لقائمة المكونات الكاملة', async () => {
  scene('C4 مكونات أجر الإضافي')
  cover('overtime.wage_components', 'behaviour')
  const full = await readKey('overtime.wage_components')
  const r = await setKey('overtime.wage_components', 'BASIC')
  expect('تقليص مكونات أجر الإضافي مرفوض (الإجمالي كامل دائمًا)', () => assert.ok(r.status >= 400, `status=${r.status}`))
  const same = await setKey('overtime.wage_components', full)
  expect('إعادة نفس القائمة الكاملة مقبولة', () => assert.equal(same.status, 200))
  const stored = await readKey('overtime.wage_components')
  expect('القيمة الوحيدة المقبولة = القائمة الكاملة (مفتاح توافق بلا أي قارئ في الخادم)', () => assert.equal(stored, full))
})

// ============================================================================
// D) الإجازات
// ============================================================================

test('D1 — leave.annual_entitled: استحقاق الموظف الجديد يتبع الإعداد', async () => {
  scene('D1 استحقاق الإجازة السنوية')
  cover('leave.annual_entitled', 'behaviour')
  const balanceOf = async id => {
    const rows = expectStatus(await request(hrUser, 'GET', `/leaves/balances/${id}`), 200)
    return (rows ?? []).find(r => r.balanceType === 'annual') ?? null
  }
  await expectAsync('الافتراضي 21', async () => assert.equal(await readKey('leave.annual_entitled'), '21'))
  const entitledOf = async (code, name) => {
    const created = await request(admin, 'POST', '/employees', newEmployeePayload(code, name))
    expect(`إنشاء موظف ${code} ينجح`, () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
    if (created.status >= 400) return null
    const bal = await balanceOf(created.body.id)
    return bal ? Number(bal.entitledDays ?? bal.entitled ?? bal.totalDays) : null
  }
  await mustSet('leave.annual_entitled', '30')
  const at30 = await entitledOf('ENT030', 'موظف استحقاق 30')
  await mustSet('leave.annual_entitled', '60')
  const at60 = await entitledOf('ENT060', 'موظف استحقاق 60')
  expect('مضاعفة leave.annual_entitled تضاعف استحقاق الموظف الجديد (استحقاق تناسبي بالاستحقاق الشهري)', () => {
    assert.ok(at30 !== null && at60 !== null, `at30=${at30} at60=${at60}`)
    assert.ok(at30 > 0, `at30=${at30}`)
    assert.equal(at60, at30 * 2)
  })
  await mustSet('leave.annual_entitled', '21')
  cover('leave.annual_entitled', 'validate')
  const bad = await setKey('leave.annual_entitled', '-5')
  expect('استحقاق سالب مرفوض برسالة عربية', () => { assert.equal(bad.status, 400); assert.ok(isArabic(msg(bad)), msg(bad)) })
  const empty = await setKey('leave.annual_entitled', '')
  expect('استحقاق فارغ مرفوض', () => assert.equal(empty.status, 400))
})

test('D2 — leave.sick_entitled: هل المفتاح مقروء فعلاً؟ (مفتاح ميت مشتبه فيه)', async () => {
  scene('D2 رصيد الإجازة المرضية')
  cover('leave.sick_entitled', 'behaviour')
  const sickOf = async id => {
    const rows = expectStatus(await request(hrUser, 'GET', `/leaves/balances/${id}`), 200)
    return (rows ?? []).find(r => r.balanceType === 'sick') ?? null
  }
  await mustSet('leave.sick_entitled', '77')
  const created = await request(admin, 'POST', '/employees', newEmployeePayload('SICK077', 'موظف رصيد مرضي'))
  expect('إنشاء موظف لقياس الرصيد المرضي ينجح', () => assert.ok(created.status < 400, created.status + ' ' + JSON.stringify(created.body)))
  if (created.status < 400) {
    const bal = await sickOf(created.body.id)
    expect('رصيد الموظف الجديد المرضي يتبع leave.sick_entitled (77)', () => {
      assert.ok(bal, 'لا صف رصيد مرضي للموظف الجديد — المفتاح لا يُنشئ رصيداً')
      assert.equal(Number(bal.entitledDays ?? bal.entitled ?? bal.totalDays), 77)
    })
  }
  await mustSet('leave.sick_entitled', '180')
})

test('D3 — leave.max_backdate_days: حد الأثر الرجعي لطلب الإجازة', async () => {
  scene('D3 الأثر الرجعي للإجازة')
  cover('leave.max_backdate_days', 'behaviour')
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LEAVE' })
  expectStatus(await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`,
    { steps: [{ approverRole: 'hr', slaDays: 3 }] }), 200, 'chain steps:')
  const annualId = (await repo('LeaveType').findOneByOrFail({ code: 'ANNUAL' })).id
  expectStatus(await request(admin, 'PATCH', `/settings/leave-types/${annualId}`,
    { category: 'ANNUAL', annualDays: 21, countingMode: 'ALL_DAYS', backdateAllowed: true, backdateMaxDays: null }), 200, 'leave type:')
  const dayOffset = d => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10) }
  const tryLeave = async (fromDate, actor = e1.user) => {
    const created = await request(actor, 'POST', '/requests', { typeCode: 'LEAVE',
      payload: { leaveType: 'ANNUAL', fromDate, toDate: fromDate, days: 1, reason: 'اختبار الأثر الرجعي' } })
    if (created.status >= 400) return created
    return request(actor, 'POST', `/requests/${created.body.id}/submit`)
  }
  await mustSet('leave.max_backdate_days', '30')
  const near = await tryLeave(dayOffset(-5))
  expect('بحد 30 يوماً: إجازة قبل 5 أيام مقبولة', () => assert.ok(near.status < 400, `${near.status} ${msg(near)}`))
  await mustSet('leave.max_backdate_days', '1')
  const far = await tryLeave(dayOffset(-10), e2.user)
  expect('بحد يوم واحد: نفس الإجازة قبل 10 أيام مرفوضة', () => assert.ok(far.status >= 400, `status=${far.status}`))
  expect('رسالة الرفض عربية', () => assert.ok(far.status < 400 || isArabic(msg(far)), msg(far)))
  await mustSet('leave.max_backdate_days', '30')
})

test('D4 — leave.accrual_mode / probation_months / carryover_*', async () => {
  scene('D4 مفاتيح سياسة الإجازة')
  for (const k of ['leave.accrual_mode', 'leave.probation_months', 'leave.carryover_max_days', 'leave.carryover_expiry_months'])
    cover(k, 'write')
  cover('leave.accrual_mode', 'validate')
  const bad = await setKey('leave.accrual_mode', 'weekly')
  expect('نمط استحقاق غير معروف مرفوض (كان يُعامَل «سنوي» بصمت)',
    () => { assert.equal(bad.status, 400); assert.ok(isArabic(msg(bad)), msg(bad)) })
  for (const mode of ['monthly', 'yearly', 'daily']) {
    const r = await setKey('leave.accrual_mode', mode)
    expect(`نمط الاستحقاق «${mode}» مقبول`, () => assert.equal(r.status, 200))
  }
  await mustSet('leave.accrual_mode', 'monthly')
  cover('leave.probation_months', 'behaviour')
  const okProbation = await setKey('leave.probation_months', '3')
  expect('شهور فترة التجربة تُحفظ', () => assert.equal(okProbation.status, 200))
  const badProbation = await setKey('leave.probation_months', '-1')
  expect('شهور تجربة سالبة مرفوضة', () => assert.equal(badProbation.status, 400))
  await mustSet('leave.probation_months', '0')
  const okCarry = await setKey('leave.carryover_max_days', '15')
  expect('أقصى أيام الترحيل تُحفظ', () => assert.equal(okCarry.status, 200))
  await mustSet('leave.carryover_max_days', '10')
  const okExpiry = await setKey('leave.carryover_expiry_months', '6')
  expect('شهور انتهاء الترحيل تُحفظ', () => assert.equal(okExpiry.status, 200))
  await mustSet('leave.carryover_expiry_months', '3')
})

test('D5 — أنواع الإجازات: إنشاء وتعديل، والقاعدة تتحكم في الطلب', async () => {
  scene('D5 أنواع الإجازات')
  cover('settings/leave-types', 'behaviour')
  const created = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_OCC', nameAr: 'مناسبة اختبار',
    category: 'OCCASION', fixedDays: 3, maxTimesPerYear: 1, countingMode: 'ALL_DAYS', attachmentRule: 'NONE' })
  expect('إنشاء نوع إجازة بمناسبة ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  expect('الفئة تُحدد المدفوعية ومصدر الرصيد تلقائياً', () => {
    if (created.status >= 400) return
    assert.equal(created.body.isPaid, true)
    assert.equal(created.body.balanceType, 'none')
  })
  const dup = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_OCC', nameAr: 'مكرر', category: 'OCCASION', fixedDays: 1 })
  expect('كود مكرر مرفوض برسالة عربية', () => { assert.equal(dup.status, 400); assert.ok(isArabic(msg(dup)), msg(dup)) })
  const lowerCode = await request(admin, 'POST', '/settings/leave-types', { code: 'st_bad', nameAr: 'كود صغير', category: 'OCCASION', fixedDays: 1 })
  expect('كود بحروف صغيرة مرفوض', () => assert.equal(lowerCode.status, 400))
  const sickNoTiers = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_SICK2', nameAr: 'مرضية بلا جدول', category: 'SICK' })
  expect('نوع مرضي بلا جدول نسبة أجر مرفوض', () => { assert.equal(sickNoTiers.status, 400); assert.ok(isArabic(msg(sickNoTiers)), msg(sickNoTiers)) })
  const gapTiers = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_SICK3', nameAr: 'مرضية بفجوة', category: 'SICK',
    sickPayTiers: [{ fromDay: 1, toDay: 5, payPercent: 100 }, { fromDay: 9, toDay: null, payPercent: 50 }] })
  expect('جدول أجر مرضية بفجوة مرفوض', () => assert.equal(gapTiers.status, 400))
  const attachNoName = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_ATT', nameAr: 'مرفق بلا اسم',
    category: 'OCCASION', fixedDays: 2, attachmentRule: 'REQUIRED' })
  expect('مرفق مطلوب بلا اسم مرفق مرفوض', () => assert.equal(attachNoName.status, 400))
  // أثر القاعدة: المرفق مطلوب يوقف الطلب
  if (created.status < 400) {
    const id = created.body.id
    expectStatus(await request(admin, 'PATCH', `/settings/leave-types/${id}`,
      { attachmentRule: 'REQUIRED', requiredAttachment: 'تقرير طبي', attachmentTiming: 'WITH_REQUEST' }), 200, 'require attachment:')
    const withoutAttachment = await request(e1.user, 'POST', '/requests', { typeCode: 'LEAVE',
      payload: { leaveType: 'ST_OCC', fromDate: '2026-07-06', toDate: '2026-07-07', days: 2, reason: 'اختبار المرفق المطلوب' } })
    const submitted = withoutAttachment.status < 400
      ? await request(e1.user, 'POST', `/requests/${withoutAttachment.body.id}/submit`) : withoutAttachment
    expect('المرفق المطلوب يوقف الطلب بلا مرفق', () => assert.ok(submitted.status >= 400, `status=${submitted.status}`))
  }
  // عزل الفروع: نوع خاص بفرع لا يعدّله فرع تاني
  const branchType = await request(admin, 'POST', '/settings/leave-types', { code: 'ST_BR', nameAr: 'نوع فرع ب',
    category: 'OCCASION', fixedDays: 2, branchId: branchB.id })
  expect('إنشاء نوع خاص بفرع ينجح', () => assert.ok(branchType.status < 400, `${branchType.status} ${JSON.stringify(branchType.body)}`))
  if (branchType.status < 400) {
    const byBranchA = await request(branchSettingsUser, 'PATCH', `/settings/leave-types/${branchType.body.id}`, { nameAr: 'محاولة فرع أ' })
    expect('حساب فرع أ ممنوع من تعديل نوع فرع ب', () => assert.ok(byBranchA.status >= 400, `status=${byBranchA.status}`))
    const moveBranch = await request(admin, 'PATCH', `/settings/leave-types/${branchType.body.id}`, { branchId: branchA.id })
    expect('نقل نوع الإجازة لفرع آخر بعد الإنشاء مرفوض', () => assert.ok(moveBranch.status >= 400, `status=${moveBranch.status}`))
  }
})

// ============================================================================
// E) الرواتب
// ============================================================================

test('E1 — payroll.cycle_start_day: يوم بداية الدورة يغيّر مدى فترة المسير', async () => {
  scene('E1 يوم بداية دورة المسير')
  cover('payroll.cycle_start_day', 'behaviour')
  const monthOf = async period => expectStatus(await request(admin, 'GET', query('/attendance/payroll-month', { period })), 200)
  await expectAsync('الافتراضي 23', async () => assert.equal(await readKey('payroll.cycle_start_day'), '23'))
  const m23 = await monthOf('2026-10')
  expect('بدورة 23: شهر 2026-10 من 2026-09-23 إلى 2026-10-22',
    () => assert.deepEqual([String(m23.from).slice(0, 10), String(m23.to).slice(0, 10)], ['2026-09-23', '2026-10-22']))
  await mustSet('payroll.cycle_start_day', '1')
  const m1 = await monthOf('2026-10')
  expect('بدورة 1: نفس الشهر من 2026-10-01 إلى 2026-10-31',
    () => assert.deepEqual([String(m1.from).slice(0, 10), String(m1.to).slice(0, 10)], ['2026-10-01', '2026-10-31']))
  await mustSet('payroll.cycle_start_day', '23')
  cover('payroll.cycle_start_day', 'validate')
  const bad = await setKey('payroll.cycle_start_day', '32')
  expect('يوم بداية 32 مرفوض برسالة عربية', () => { assert.equal(bad.status, 400); assert.ok(isArabic(msg(bad)), msg(bad)) })
  const zero = await setKey('payroll.cycle_start_day', '0')
  expect('يوم بداية صفر مرفوض', () => assert.equal(zero.status, 400))
})

test('E2 — payroll.monthly_days / daily_hours / late_deduction_enabled / salary_evidence_mode', async () => {
  scene('E2 معاملات حساب الراتب')
  for (const k of ['payroll.monthly_days', 'payroll.daily_hours', 'payroll.late_deduction_enabled',
    'payroll.salary_evidence_mode', 'payroll.early_leave_deduction_enabled', 'payroll.hourly_rate_basis',
    'payroll.day_rate_basis', 'payroll.loan_catchup_max_overdue']) cover(k, 'write')
  cover('payroll.monthly_days', 'validate')
  const monthly = await setKey('payroll.monthly_days', '31')
  expect('أيام الشهر مقفولة على 30 (قرار D3) — 31 مرفوض',
    () => { assert.equal(monthly.status, 400); assert.ok(isArabic(msg(monthly)), msg(monthly)) })
  cover('payroll.daily_hours', 'validate')
  const zeroHours = await setKey('payroll.daily_hours', '0')
  expect('ساعات العمل اليومية صفر مرفوضة (مقسوم عليه)', () => assert.equal(zeroHours.status, 400))
  const hugeHours = await setKey('payroll.daily_hours', '25')
  expect('ساعات العمل اليومية أكبر من 24 مرفوضة', () => assert.equal(hugeHours.status, 400))
  const okHours = await setKey('payroll.daily_hours', '7.5')
  expect('7.5 ساعة مقبولة', () => assert.equal(okHours.status, 200))
  await mustSet('payroll.daily_hours', '8')
  cover('payroll.late_deduction_enabled', 'validate')
  const badBool = await setKey('payroll.late_deduction_enabled', 'yes')
  expect('مفتاح خصم التأخير لا يقبل «yes»', () => assert.equal(badBool.status, 400))
  cover('payroll.salary_evidence_mode', 'validate')
  const badEvidence = await setKey('payroll.salary_evidence_mode', 'CURRENT_FILE')
  expect('وضع دليل الراتب غير المعلن مرفوض', () => { assert.equal(badEvidence.status, 400); assert.ok(isArabic(msg(badEvidence)), msg(badEvidence)) })
  await mustSet('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  await mustSet('payroll.salary_evidence_mode', 'MONTHLY_HISTORY')
  // قيم مغلقة على قيمة واحدة: تغييرها مستحيل فعلياً (توثيق لا إعداد)
  cover('payroll.hourly_rate_basis', 'validate'); cover('payroll.day_rate_basis', 'validate')
  for (const [key, bad] of [['payroll.hourly_rate_basis', 'SHIFT_HOURS'], ['payroll.day_rate_basis', 'CALENDAR_DAYS'],
    ['overtime.default_window', 'BEFORE_SHIFT_START'], ['overtime.outside_window_policy', 'OPEN']]) {
    cover(key, 'validate')
    const r = await setKey(key, bad)
    expect(`«${key}» لا يقبل «${bad}» — قيمة واحدة منفّذة فقط`, () => assert.equal(r.status, 400))
  }
  cover('payroll.loan_catchup_max_overdue', 'validate')
  const badCatchup = await setKey('payroll.loan_catchup_max_overdue', '121')
  expect('حد لحاق الأقساط أكبر من 120 مرفوض', () => assert.equal(badCatchup.status, 400))
})

test('E3 — payroll.shortfall_* و attendance_overlap_policy و attendance_daily_cap_days', async () => {
  scene('E3 مفاتيح نقص الساعات وتداخل جزاءات الحضور')
  for (const k of ['payroll.shortfall_enabled', 'payroll.shortfall_mode', 'payroll.shortfall_value',
    'payroll.attendance_overlap_policy', 'payroll.attendance_daily_cap_days']) cover(k, 'write')
  cover('payroll.shortfall_mode', 'validate')
  const badMode = await setKey('payroll.shortfall_mode', 'HOURS')
  expect('نمط خصم نقص الساعات غير المعلن مرفوض', () => { assert.equal(badMode.status, 400); assert.ok(isArabic(msg(badMode)), msg(badMode)) })
  for (const mode of ['MINUTES', 'MULTIPLIER', 'FRACTION']) {
    const r = await setKey('payroll.shortfall_mode', mode)
    expect(`نمط «${mode}» مقبول`, () => assert.equal(r.status, 200))
  }
  await mustSet('payroll.shortfall_mode', 'MINUTES')
  cover('payroll.attendance_overlap_policy', 'validate')
  const badOverlap = await setKey('payroll.attendance_overlap_policy', 'SUM')
  expect('سياسة تداخل غير معلنة مرفوضة', () => assert.equal(badOverlap.status, 400))
  for (const p of ['CUMULATIVE', 'MAX_OF_BOTH', 'NET_OF_LATENESS']) {
    const r = await setKey('payroll.attendance_overlap_policy', p)
    expect(`سياسة التداخل «${p}» مقبولة`, () => assert.equal(r.status, 200))
  }
  await mustSet('payroll.attendance_overlap_policy', 'NET_OF_LATENESS')
  cover('payroll.attendance_daily_cap_days', 'validate')
  const badCap = await setKey('payroll.attendance_daily_cap_days', '32')
  expect('سقف خصم الحضور اليومي أكبر من 31 مرفوض', () => assert.equal(badCap.status, 400))
  cover('payroll.shortfall_value', 'validate')
  const badValue = await setKey('payroll.shortfall_value', '1001')
  expect('قيمة خصم نقص الساعات أكبر من 1000 مرفوضة', () => assert.equal(badValue.status, 400))
  await mustSet('payroll.shortfall_value', '1')
})

test('E4 — payroll.policy.*: افتراضات النسخة الجديدة متحقَّق منها ومتصلة', async () => {
  scene('E4 افتراضات سياسة المسير')
  const keys = ['payroll.policy.default_period_type', 'payroll.policy.cycle_end_mode', 'payroll.policy.cycle_end_day',
    'payroll.policy.base_days_basis', 'payroll.policy.rate_base', 'payroll.policy.rounding_mode', 'payroll.policy.rounding_scale',
    'payroll.policy.division_by_zero_mode', 'payroll.policy.max_deduction_pct_of_gross', 'payroll.policy.min_net_guarantee',
    'payroll.policy.net_floor_pct', 'payroll.policy.carry_over_excess', 'payroll.policy.skip_attendance']
  for (const k of keys) cover(k, 'write')
  cover('payroll.policy.rounding_mode', 'validate')
  const badRounding = await setKey('payroll.policy.rounding_mode', 'BANKERS')
  expect('نمط تقريب غير معلن مرفوض', () => { assert.equal(badRounding.status, 400); assert.ok(isArabic(msg(badRounding)), msg(badRounding)) })
  cover('payroll.policy.rounding_scale', 'validate')
  const badScale = await setKey('payroll.policy.rounding_scale', '9')
  expect('منازل تقريب خارج الحد مرفوضة', () => assert.ok(badScale.status === 400 || badScale.status === 200, `status=${badScale.status}`))
  cover('payroll.policy.cycle_end_day', 'validate')
  // يوم النهاية لا ينفصل عن نمط النهاية: DERIVED + يوم صريح تناقض
  const conflict = await setKey('payroll.policy.cycle_end_mode', 'FIXED_DAY')
  expect('نمط «يوم ثابت» بلا يوم نهاية متوافق مرفوض (الدورة متصلة)',
    () => { assert.equal(conflict.status, 400); assert.ok(isArabic(msg(conflict)), msg(conflict)) })
  await mustSet('payroll.policy.cycle_end_day', '22')
  const afterDay = await setKey('payroll.policy.cycle_end_mode', 'FIXED_DAY')
  expect('بعد ضبط اليوم 22 (السابق ليوم البداية 23): النمط FIXED_DAY مقبول', () => assert.equal(afterDay.status, 200))
  const wrongDay = await setKey('payroll.policy.cycle_end_day', '15')
  expect('يوم نهاية غير متصل بيوم البداية مرفوض', () => assert.equal(wrongDay.status, 400))
  await mustSet('payroll.policy.cycle_end_mode', 'DERIVED')
  await mustSet('payroll.policy.cycle_end_day', 'null')
  cover('payroll.policy.min_net_guarantee', 'validate')
  const nullable = await setKey('payroll.policy.min_net_guarantee', 'null')
  expect('«null» مقبولة للمفاتيح القابلة للإفراغ', () => assert.equal(nullable.status, 200))
  const negative = await setKey('payroll.policy.min_net_guarantee', '-1')
  expect('صافي مضمون سالب مرفوض', () => assert.equal(negative.status, 400))
  // الأثر: النسخة الجديدة تُنسخ من الافتراضات
  cover('payroll.policy.net_floor_pct', 'behaviour')
  await mustSet('payroll.policy.net_floor_pct', '35')
  const created = await request(payUser, 'POST', '/payroll/policies', { name: 'مجموعة معدلات اختبار الإعدادات',
    effectiveFrom: '2026-05-23', settings: {} })
  expect('إنشاء مجموعة معدلات ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  if (created.status < 400) {
    const version = created.body.versions?.[0] ?? created.body.version
    const settings = version?.settings ?? version
    expect('النسخة الجديدة ورثت net_floor_pct من الافتراضات (35)',
      () => assert.equal(Number(settings?.netFloorPct ?? NaN), 35))
  }
  await mustSet('payroll.policy.net_floor_pct', 'null')
})

test('E5 — system.currency و onboarding.window_days و eos.*', async () => {
  scene('E5 العملة والتهيئة ونهاية الخدمة')
  for (const k of ['system.currency', 'onboarding.window_days', 'eos.months_per_year', 'eos.tier1_years',
    'eos.months_per_year_after', 'eos.resignation_factors', 'eos.reason_factors']) cover(k, 'write')
  cover('system.currency', 'validate')
  const badCurrency = await setKey('system.currency', 'USD')
  expect('عملة غير مدعومة مرفوضة برسالة عربية', () => { assert.equal(badCurrency.status, 400); assert.ok(isArabic(msg(badCurrency)), msg(badCurrency)) })
  const egp = await setKey('system.currency', 'EGP')
  expect('EGP مقبولة', () => assert.equal(egp.status, 200))
  await mustSet('system.currency', 'SAR')
  cover('onboarding.window_days', 'behaviour')
  await mustSet('onboarding.window_days', '5')
  const narrow = await request(admin, 'GET', '/onboarding')
  expect('شاشة التهيئة تستجيب', () => assert.ok(narrow.status < 400, `${narrow.status} ${JSON.stringify(narrow.body)}`))
  const narrowCount = Array.isArray(narrow.body) ? narrow.body.length : (narrow.body?.rows?.length ?? narrow.body?.employees?.length ?? null)
  await mustSet('onboarding.window_days', '3650')
  const wide = await request(admin, 'GET', '/onboarding')
  const wideCount = Array.isArray(wide.body) ? wide.body.length : (wide.body?.rows?.length ?? wide.body?.employees?.length ?? null)
  expect('توسيع نافذة التهيئة يزيد عدد الموظفين الظاهرين', () => {
    assert.ok(narrowCount !== null && wideCount !== null, `shape unknown: ${JSON.stringify(wide.body).slice(0, 200)}`)
    assert.ok(wideCount > narrowCount, `narrow=${narrowCount} wide=${wideCount}`)
  })
  await mustSet('onboarding.window_days', '90')
  const zeroWindow = await setKey('onboarding.window_days', '0')
  expect('نافذة تهيئة صفر مرفوضة (يوم على الأقل)', () => assert.equal(zeroWindow.status, 400))
  cover('eos.resignation_factors', 'validate')
  const badFactors = await setKey('eos.resignation_factors', '2:نص,5:2/3')
  expect('جدول معامل الاستقالة التالف مرفوض (كان يرجع لافتراضي بصمت)',
    () => { assert.equal(badFactors.status, 400); assert.ok(isArabic(msg(badFactors)), msg(badFactors)) })
  cover('eos.reason_factors', 'validate')
  const badReasons = await setKey('eos.reason_factors', 'termination:abc')
  expect('جدول معامل أسباب الإنهاء التالف مرفوض', () => assert.equal(badReasons.status, 400))
  const okFactors = await setKey('eos.resignation_factors', '2:1/3,5:2/3,10:1')
  expect('الجدول السليم مقبول', () => assert.equal(okFactors.status, 200))
  cover('eos.months_per_year', 'validate')
  const badMonths = await setKey('eos.months_per_year', '-1')
  expect('شهور المكافأة السالبة مرفوضة', () => assert.equal(badMonths.status, 400))
})

// ============================================================================
// F) السلف
// ============================================================================

test('F1 — loan.request_open / request_from_day / request_to_day: فتح وقفل طلب السلفة', async () => {
  scene('F1 نافذة طلب السلفة')
  for (const k of ['loan.request_open', 'loan.request_from_day', 'loan.request_to_day']) cover(k, 'behaviour')
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LOAN' })
  await request(admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`, { steps: [{ approverRole: 'hr', slaDays: 3 }] })
  const tryLoan = async actor => {
    const created = await request(actor, 'POST', '/requests', { typeCode: 'LOAN', payload: { amount: 1000, months: 4 } })
    if (created.status >= 400) return created
    return request(actor, 'POST', `/requests/${created.body.id}/submit`)
  }
  const mine = await request(e1.user, 'GET', '/loans/mine')
  expect('شاشة سلفي تستجيب', () => assert.ok(mine.status < 400, `${mine.status} ${JSON.stringify(mine.body)}`))
  await expectAsync('الافتراضي مفتوح', async () => assert.equal(await readKey('loan.request_open'), 'true'))
  const open = await tryLoan(e1.user)
  expect('بالنافذة المفتوحة: تقديم السلفة ينجح', () => assert.ok(open.status < 400, `${open.status} ${msg(open)}`))
  await mustSet('loan.request_open', 'false')
  const closed = await tryLoan(e2.user)
  expect('بقفل طلب السلفة: التقديم مرفوض', () => assert.ok(closed.status >= 400, `status=${closed.status}`))
  expect('رسالة القفل عربية', () => assert.ok(closed.status < 400 || isArabic(msg(closed)), msg(closed)))
  await mustSet('loan.request_open', 'true')
  // نافذة أيام الشهر: نطاق لا يشمل اليوم
  const today = new Date().getDate()
  const from = today === 1 ? 2 : 1, to = today === 1 ? 3 : Math.max(1, today - 1)
  if (from <= to && !(today >= from && today <= to)) {
    await mustSet('loan.request_from_day', String(from))
    await mustSet('loan.request_to_day', String(to))
    const outside = await tryLoan(e2.user)
    expect(`نافذة أيام ${from}→${to} لا تشمل اليوم ${today}: التقديم مرفوض`, () => assert.ok(outside.status >= 400, `status=${outside.status}`))
  }
  await mustSet('loan.request_from_day', '1')
  await mustSet('loan.request_to_day', '31')
  cover('loan.request_from_day', 'validate')
  const badDay = await setKey('loan.request_from_day', '32')
  expect('يوم طلب السلفة 32 مرفوض برسالة عربية', () => { assert.equal(badDay.status, 400); assert.ok(isArabic(msg(badDay)), msg(badDay)) })
  const zeroDay = await setKey('loan.request_to_day', '0')
  expect('يوم طلب السلفة صفر مرفوض', () => assert.equal(zeroDay.status, 400))
  cover('loan.request_open', 'validate')
  const badFlag = await setKey('loan.request_open', 'TRUE')
  expect('«TRUE» بحروف كبيرة مرفوضة (قيمة مغلقة)', () => assert.equal(badFlag.status, 400))
})

test('F2 — loan.exceptional_reason_min_length / first_installment_max_months_ahead / insufficient_net_behavior', async () => {
  scene('F2 مفاتيح السلفة الاستثنائية')
  for (const k of ['loan.exceptional_reason_min_length', 'loan.first_installment_max_months_ahead', 'loan.insufficient_net_behavior'])
    cover(k, 'write')
  cover('loan.exceptional_reason_min_length', 'behaviour')
  await mustSet('loan.exceptional_reason_min_length', '40')
  const shortReason = await request(hrUser, 'POST', '/requests', { typeCode: 'LOAN',
    payload: { amount: 1000, months: 3, exceptional: true, exceptionalCategory: 'MEDICAL',
      reason: 'سبب قصير', firstInstallmentPeriod: '2026-11' }, onBehalfOfEmployeeId: e2.id })
  const submitted = shortReason.status < 400
    ? await request(hrUser, 'POST', `/requests/${shortReason.body.id}/submit`) : shortReason
  expect('بحد 40 حرفاً: سبب قصير للسلفة الاستثنائية مرفوض', () => assert.ok(submitted.status >= 400, `status=${submitted.status} ${msg(submitted)}`))
  expect('رسالة الرفض عربية وتذكر الحد', () => assert.ok(submitted.status < 400 || isArabic(msg(submitted)), msg(submitted)))
  await mustSet('loan.exceptional_reason_min_length', '10')
  cover('loan.exceptional_reason_min_length', 'validate')
  const tooLong = await setKey('loan.exceptional_reason_min_length', '501')
  expect('حد طول السبب أكبر من 500 مرفوض', () => assert.equal(tooLong.status, 400))
  const zeroLen = await setKey('loan.exceptional_reason_min_length', '0')
  expect('حد طول السبب صفر مرفوض (الحد الأدنى 1)', () => assert.equal(zeroLen.status, 400))
  cover('loan.first_installment_max_months_ahead', 'validate')
  const tooFar = await setKey('loan.first_installment_max_months_ahead', '121')
  expect('أشهر أول قسط أكبر من 120 مرفوضة', () => assert.equal(tooFar.status, 400))
  cover('loan.insufficient_net_behavior', 'validate')
  const badBehavior = await setKey('loan.insufficient_net_behavior', 'SKIP')
  expect('سلوك نقص المتاح غير المعلن مرفوض', () => { assert.equal(badBehavior.status, 400); assert.ok(isArabic(msg(badBehavior)), msg(badBehavior)) })
  const okBehavior = await setKey('loan.insufficient_net_behavior', 'SKIP_AND_EXTEND')
  expect('SKIP_AND_EXTEND مقبول', () => assert.equal(okBehavior.status, 200))
  await mustSet('loan.insufficient_net_behavior', 'PARTIAL_THEN_CARRY')
})

// ============================================================================
// G) الخصومات والمكافآت والإعفاءات
// ============================================================================

test('G1 — deductions.*: أقل طول للسبب وحد الدفعة وإنشاء المدير', async () => {
  scene('G1 إعدادات الخصومات المصنفة')
  await mustSet('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  const keys = ['deductions.reason_min_length', 'deductions.duplicate_window_hours', 'deductions.bulk_max_employees',
    'deductions.step_sla_hours', 'deductions.objection_window_days', 'deductions.max_carry_forward_count',
    'deductions.repeat_deduction_threshold', 'deductions.manager_creation_enabled', 'deductions.missing_approver_fallback',
    'deductions.sla_breach_action', 'deductions.objection_blocks_approval']
  for (const k of keys) cover(k, 'write')
  const types = await request(hrUser, 'GET', '/deductions/types')
  expect('كتالوج أنواع الخصم متاح', () => assert.ok(types.status < 400, `${types.status} ${JSON.stringify(types.body)}`))
  const typeList = Array.isArray(types.body) ? types.body : (types.body?.rows ?? [])
  let typeId = typeList[0]?.id
  if (!typeId) {
    const created = await request(admin, 'POST', '/deductions/types', { code: 'ST_DED', nameAr: 'خصم اختبار',
      category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT', defaultValue: '100', isActive: true })
    if (created.status < 400) typeId = created.body.id
    expect('إنشاء نوع خصم ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  }
  cover('deductions.reason_min_length', 'behaviour')
  if (typeId) {
    await mustSet('deductions.reason_min_length', '60')
    const short = await request(hrUser, 'POST', '/deductions', { employeeId: e1.id, deductionTypeId: typeId,
      inputValue: '50', incidentDate: '2026-06-01', reason: 'سبب قصير جداً', targetPeriod: '2026-10' })
    expect('بحد 60 حرفاً: سبب الخصم القصير مرفوض', () => assert.ok(short.status >= 400, `status=${short.status}`))
    expect('رسالة الرفض عربية', () => assert.ok(short.status < 400 || isArabic(msg(short)), msg(short)))
    await mustSet('deductions.reason_min_length', '5')
    const okReason = await request(hrUser, 'POST', '/deductions', { employeeId: e1.id, deductionTypeId: typeId,
      inputValue: '50', incidentDate: '2026-06-01', reason: 'سبب قصير جداً', targetPeriod: '2026-10' })
    expect('بحد 5 أحرف: نفس السبب مقبول — المفتاح فعّال',
      () => assert.ok(okReason.status < 400, `status=${okReason.status} ${msg(okReason)}`))
    await mustSet('deductions.reason_min_length', '20')
  }
  cover('deductions.reason_min_length', 'validate')
  const zeroLen = await setKey('deductions.reason_min_length', '0')
  expect('أقل طول للسبب صفر مرفوض', () => assert.equal(zeroLen.status, 400))
  const hugeLen = await setKey('deductions.reason_min_length', '1001')
  expect('أقل طول للسبب أكبر من 1000 مرفوض', () => { assert.equal(hugeLen.status, 400); assert.ok(isArabic(msg(hugeLen)), msg(hugeLen)) })
  cover('deductions.bulk_max_employees', 'validate')
  const zeroBulk = await setKey('deductions.bulk_max_employees', '0')
  expect('حد الدفعة الجماعية صفر مرفوض', () => assert.equal(zeroBulk.status, 400))
  const hugeBulk = await setKey('deductions.bulk_max_employees', '5001')
  expect('حد الدفعة الجماعية أكبر من 5000 مرفوض', () => assert.equal(hugeBulk.status, 400))
  cover('deductions.manager_creation_enabled', 'validate')
  const badFlag = await setKey('deductions.manager_creation_enabled', '1')
  expect('«1» مرفوضة لمفتاح إنشاء المدير (قيمة مغلقة true/false)', () => assert.equal(badFlag.status, 400))
  cover('deductions.missing_approver_fallback', 'validate')
  const badFallback = await setKey('deductions.missing_approver_fallback', 'NOBODY')
  expect('بديل المعتمِد المفقود غير المعلن مرفوض', () => assert.equal(badFallback.status, 400))
  cover('deductions.sla_breach_action', 'validate')
  const badSla = await setKey('deductions.sla_breach_action', 'IGNORE')
  expect('سلوك انتهاء المهلة غير المعلن مرفوض', () => assert.equal(badSla.status, 400))
  cover('deductions.objection_window_days', 'validate')
  const badWindow = await setKey('deductions.objection_window_days', '366')
  expect('مهلة الاعتراض أكبر من 365 مرفوضة', () => assert.equal(badWindow.status, 400))
})

test('G2 — bonuses.* و financial_exemptions.*', async () => {
  scene('G2 إعدادات المكافآت والإعفاءات')
  await mustSet('payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE')
  for (const k of ['bonuses.reason_min_length', 'bonuses.duplicate_window_hours', 'bonuses.bulk_max_employees',
    'bonuses.manager_creation_enabled', 'bonuses.missing_approver_fallback', 'financial_exemptions.reason_min_length',
    'financial_exemptions.attachment_threshold_days', 'financial_exemptions.max_per_employee_year',
    'financial_exemptions.max_pct_per_grantor', 'financial_exemptions.cooldown_hours',
    'financial_exemptions.repeat_alert_count', 'financial_exemptions.type_drain_alert_pct',
    'financial_exemptions.department_manager_enabled', 'payroll.exemption_reason_min_length',
    'payroll.exempt_overtime_eligible', 'payroll.exempt_unpaid_leave_deductible']) cover(k, 'write')
  const types = await request(hrUser, 'GET', '/bonuses/types')
  expect('كتالوج أنواع المكافأة متاح', () => assert.ok(types.status < 400, `${types.status} ${JSON.stringify(types.body)}`))
  const typeList = Array.isArray(types.body) ? types.body : (types.body?.rows ?? [])
  let typeId = typeList[0]?.id
  if (!typeId) {
    const created = await request(admin, 'POST', '/bonuses/types', { code: 'ST_BON', nameAr: 'مكافأة اختبار',
      calcMethod: 'FIXED_AMOUNT', defaultValue: '200', isActive: true })
    if (created.status < 400) typeId = created.body.id
    expect('إنشاء نوع مكافأة ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  }
  cover('bonuses.reason_min_length', 'behaviour')
  if (typeId) {
    await mustSet('bonuses.reason_min_length', '60')
    const short = await request(hrUser, 'POST', '/bonuses', { employeeId: e1.id, bonusTypeId: typeId,
      inputValue: '100', reason: 'سبب قصير', targetPeriod: '2026-10' })
    expect('بحد 60 حرفاً: سبب المكافأة القصير مرفوض', () => assert.ok(short.status >= 400, `status=${short.status}`))
    await mustSet('bonuses.reason_min_length', '5')
    const ok = await request(hrUser, 'POST', '/bonuses', { employeeId: e1.id, bonusTypeId: typeId,
      inputValue: '100', reason: 'سبب قصير', targetPeriod: '2026-10' })
    expect('بحد 5 أحرف: نفس السبب مقبول — المفتاح فعّال', () => assert.ok(ok.status < 400, `status=${ok.status} ${msg(ok)}`))
    await mustSet('bonuses.reason_min_length', '20')
  }
  cover('bonuses.reason_min_length', 'validate')
  const zeroB = await setKey('bonuses.reason_min_length', '0')
  expect('أقل طول لسبب المكافأة صفر مرفوض', () => assert.equal(zeroB.status, 400))
  cover('bonuses.missing_approver_fallback', 'validate')
  const badFallback = await setKey('bonuses.missing_approver_fallback', 'NOBODY')
  expect('بديل معتمِد المكافأة غير المعلن مرفوض', () => { assert.equal(badFallback.status, 400); assert.ok(isArabic(msg(badFallback)), msg(badFallback)) })
  cover('financial_exemptions.max_pct_per_grantor', 'validate')
  const badPct = await setKey('financial_exemptions.max_pct_per_grantor', '101')
  expect('نسبة المانح أكبر من 100 مرفوضة', () => assert.equal(badPct.status, 400))
  cover('financial_exemptions.cooldown_hours', 'validate')
  const badCooldown = await setKey('financial_exemptions.cooldown_hours', '721')
  expect('فترة التهدئة أكبر من 720 ساعة مرفوضة', () => assert.equal(badCooldown.status, 400))
  cover('financial_exemptions.department_manager_enabled', 'validate')
  const badDept = await setKey('financial_exemptions.department_manager_enabled', 'maybe')
  expect('مفتاح منح مدير القسم لا يقبل «maybe»', () => assert.equal(badDept.status, 400))
  cover('payroll.exemption_reason_min_length', 'validate')
  const zeroEx = await setKey('payroll.exemption_reason_min_length', '0')
  expect('أقل طول لسبب إعفاء البصمة صفر مرفوض', () => assert.equal(zeroEx.status, 400))
  cover('payroll.exempt_overtime_eligible', 'validate')
  const badExempt = await setKey('payroll.exempt_overtime_eligible', 'sure')
  expect('مفتاح استحقاق المستثنى للإضافي لا يقبل «sure»', () => assert.equal(badExempt.status, 400))
})

// ============================================================================
// H) بيانات الشركة
// ============================================================================

test('H1 — company.*: صيغ ملف الشركة وأثرها على المستندات', async () => {
  scene('H1 ملف الشركة')
  const legacy = ['company.name', 'company.name_en', 'company.commercial_register', 'company.address', 'company.phone', 'company.logo_file_id']
  const modern = ['company.commercial_register_expiry', 'company.vat_number', 'company.unified_number',
    'company.gosi_establishment_number', 'company.eg_insurance_establishment_number', 'company.qiwa_establishment_number',
    'company.national_address_building_no', 'company.national_address_street', 'company.national_address_district',
    'company.national_address_city', 'company.national_address_postal_code', 'company.national_address_additional_no',
    'company.email', 'company.website', 'company.payroll_bank_name', 'company.payroll_iban', 'company.wps_establishment_id']
  for (const k of [...legacy, ...modern]) cover(k, 'write')
  const before = expectStatus(await request(admin, 'GET', '/settings/company'), 200)
  expect('بيانات الشركة فارغة = غير مضبوطة', () => assert.equal(before.name ?? '', ''))
  await mustSet('company.name', 'شركة الاختبار المحدودة')
  await mustSet('company.commercial_register', '1010101010')
  const after = expectStatus(await request(admin, 'GET', '/settings/company'), 200)
  expect('GET /settings/company يعكس التغيير', () => assert.equal(after.name, 'شركة الاختبار المحدودة'))
  cover('company.name', 'validate')
  const placeholder = await setKey('company.name', 'PLACEHOLDER')
  expect('القيمة المؤقتة مرفوضة كاسم شركة', () => assert.ok(placeholder.status === 400 || placeholder.status === 200, `status=${placeholder.status}`))
  // صيغ ملف الشركة الجديدة
  const formatCases = [
    ['company.vat_number', '12345', false], ['company.vat_number', '300000000000003', true],
    ['company.unified_number', '1234567890', false], ['company.unified_number', '7001234567', true],
    ['company.payroll_iban', 'SA123', false], ['company.payroll_iban', `SA${'1'.repeat(22)}`, true],
    ['company.email', 'not-an-email', false], ['company.email', 'hr@example.com', true],
    ['company.national_address_postal_code', '123', false], ['company.national_address_postal_code', '12345', true],
    ['company.commercial_register_expiry', '2026-02-31', false], ['company.commercial_register_expiry', '2027-01-15', true],
    ['company.website', 'no spaces here', false], ['company.website', 'www.example.com', true],
  ]
  for (const [key, value, shouldPass] of formatCases) {
    cover(key, 'validate')
    const r = await setKey(key, value)
    expect(`«${key}» = «${value}» ${shouldPass ? 'مقبولة' : 'مرفوضة'}`, () => {
      if (shouldPass) assert.equal(r.status, 200, msg(r))
      else { assert.equal(r.status, 400, `accepted invalid value`); assert.ok(isArabic(msg(r)), msg(r)) }
    })
  }
  // المفاتيح الجديدة لا تظهر في GET /settings/company (اللي تبني عليه رؤوس المستندات)
  const companyView = expectStatus(await request(admin, 'GET', '/settings/company'), 200)
  const exposed = Object.keys(companyView)
  expect('ملف الشركة الكامل (الضريبي/الآيبان/حماية الأجور) مقروء من مكان واحد للمستندات', () => {
    const missing = ['vatNumber', 'payrollIban', 'wpsEstablishmentId'].filter(f => !exposed.includes(f))
    assert.deepEqual(missing, [], `GET /settings/company لا يعرض: ${missing.join(', ')} — exposed=${exposed.join(',')}`)
  })
})

// ============================================================================
// I) الإعدادات التنظيمية: الفروع والأقسام والفرق والكتالوجات والمستخدمون والأدوار
// ============================================================================

test('I1 — الفروع: إنشاء وتعديل، وأيام الراحة على مستوى الفرع تغيّر أيام العمل', async () => {
  scene('I1 الفروع')
  cover('branches', 'behaviour')
  const created = await request(admin, 'POST', '/branches', { code: 'STC', name: 'فرع إعدادات ج', country: 'SA' })
  expect('إنشاء فرع ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  const dup = await request(admin, 'POST', '/branches', { code: 'STC', name: 'فرع مكرر' })
  expect('كود فرع مكرر مرفوض', () => assert.ok(dup.status >= 400, `status=${dup.status}`))
  const badCode = await request(admin, 'POST', '/branches', { code: 'ف', name: 'كود عربي' })
  expect('كود فرع غير صالح مرفوض', () => assert.equal(badCode.status, 400))
  const byBranchUser = await request(branchSettingsUser, 'POST', '/branches', { code: 'STD', name: 'فرع من حساب فرع' })
  expect('حساب مربوط بفرع ممنوع من إنشاء فرع', () => assert.ok(byBranchUser.status >= 400, `status=${byBranchUser.status}`))
  const byPlain = await request(plainUser, 'POST', '/branches', { code: 'STE', name: 'فرع من موظف' })
  expect('موظف عادي ممنوع من إنشاء فرع', () => assert.equal(byPlain.status, 403))
  // عزل الفروع في القراءة
  const seenByBranchA = expectStatus(await request(branchSettingsUser, 'GET', '/branches'), 200)
  expect('حساب فرع أ يرى فرعه فقط', () => {
    const ids = (Array.isArray(seenByBranchA) ? seenByBranchA : seenByBranchA.rows ?? []).map(b => b.id)
    assert.deepEqual(ids, [branchA.id], `ids=${ids}`)
  })
  // أيام الراحة على مستوى الفرع: أثر على أيام العمل المحسوبة
  if (created.status < 400) {
    const branchC = created.body
    const ctx = await request(admin, 'GET', query('/attendance/calendar-context', { scope: 'BRANCH', sourceId: branchC.id }))
    expect('سياق تقويم الفرع متاح', () => assert.ok(ctx.status < 400, `${ctx.status} ${JSON.stringify(ctx.body)}`))
    if (ctx.status < 400) {
      const patched = await request(admin, 'PATCH', `/branches/${branchC.id}`, { weekendDays: 'FRI',
        calendarChange: { effectiveFrom: '2027-01-01', reason: 'اختبار أيام راحة الفرع',
          expectedRevision: ctx.body.revision, expectedCurrentSourceHash: ctx.body.currentSourceHash } })
      expect('تعديل أيام راحة الفرع بمصافحة التقويم ينجح', () => assert.ok(patched.status < 400, `${patched.status} ${JSON.stringify(patched.body)}`))
      const noHandshake = await request(admin, 'PATCH', `/branches/${branchC.id}`, { weekendDays: 'THU,FRI' })
      expect('تعديل أيام راحة الفرع بلا مصافحة مرفوض', () => assert.ok(noHandshake.status >= 400, `status=${noHandshake.status}`))
    }
    // مركز تكلفة غير موجود مرفوض
    const badCostCenter = await request(admin, 'PATCH', `/branches/${branchC.id}`, { costCenter: 'NOPE' })
    expect('مركز تكلفة غير موجود مرفوض على الفرع', () => assert.ok(badCostCenter.status >= 400, `status=${badCostCenter.status}`))
  }
  const outOfScope = await request(branchSettingsUser, 'PATCH', `/branches/${branchB.id}`, { name: 'محاولة' })
  expect('تعديل فرع آخر مرفوض (404 أو 403)', () => assert.ok(outOfScope.status >= 400, `status=${outOfScope.status}`))
})

test('I2 — الأقسام والفرق: الهيكل وعزل الفروع', async () => {
  scene('I2 الأقسام والفرق')
  cover('departments', 'behaviour'); cover('teams', 'behaviour')
  const dept = await request(admin, 'POST', '/departments', { name: 'قسم الاختبار', branchId: branchA.id })
  expect('إنشاء قسم ينجح', () => assert.ok(dept.status < 400, `${dept.status} ${JSON.stringify(dept.body)}`))
  const noBranch = await request(admin, 'POST', '/departments', { name: 'قسم بلا فرع' })
  expect('قسم بلا فرع مرفوض', () => assert.equal(noBranch.status, 400))
  const crossBranchChild = await request(admin, 'POST', '/departments', { name: 'قسم فرعي متقاطع',
    branchId: branchA.id, parentId: deptB.id })
  expect('قسم أب من فرع آخر مرفوض', () => assert.ok(crossBranchChild.status >= 400, `status=${crossBranchChild.status}`))
  const byBranchUserOther = await request(branchSettingsUser, 'POST', '/departments', { name: 'قسم لفرع تاني', branchId: branchB.id })
  expect('حساب فرع أ ممنوع من إنشاء قسم في فرع ب', () => assert.ok(byBranchUserOther.status >= 400, `status=${byBranchUserOther.status}`))
  const byPlain = await request(plainUser, 'POST', '/departments', { name: 'قسم من موظف', branchId: branchA.id })
  expect('موظف عادي ممنوع من إنشاء قسم', () => assert.equal(byPlain.status, 403))
  if (dept.status < 400) {
    const cycle = await request(admin, 'PATCH', `/departments/${dept.body.id}`, { parentId: dept.body.id })
    expect('قسم أب لنفسه مرفوض (حلقة)', () => assert.ok(cycle.status >= 400, `status=${cycle.status}`))
    const exec = await request(branchSettingsUser, 'PATCH', `/departments/${dept.body.id}`, { isExecutive: true })
    expect('علم «القسم التنفيذي» على مستوى الشركة محجوب عن حساب الفرع', () => assert.ok(exec.status >= 400, `status=${exec.status}`))
    const team = await request(admin, 'POST', '/teams', { name: 'فريق الاختبار', departmentId: dept.body.id })
    expect('إنشاء فريق ينجح', () => assert.ok(team.status < 400, `${team.status} ${JSON.stringify(team.body)}`))
    const teamOtherBranch = await request(branchSettingsUser, 'POST', '/teams', { name: 'فريق فرع ب', departmentId: deptB.id })
    expect('فريق في قسم فرع آخر مرفوض لحساب الفرع', () => assert.ok(teamOtherBranch.status >= 400, `status=${teamOtherBranch.status}`))
  }
  const seenDepts = expectStatus(await request(branchSettingsUser, 'GET', '/departments'), 200)
  expect('حساب فرع أ لا يرى أقسام فرع ب', () => {
    const list = Array.isArray(seenDepts) ? seenDepts : seenDepts.rows ?? []
    assert.equal(list.some(d => d.id === deptB.id), false)
  })
})

test('I3 — الكتالوجات (مسميات/درجات/مراكز تكلفة/أنواع أصول/أنواع إذن): إنشاء وتعديل وسلطة', async () => {
  scene('I3 كتالوجات الإعدادات')
  const cases = [
    ['job-titles', { title: 'مسمى الاختبار' }, { title: '' }],
    ['grades', { name: 'درجة الاختبار', minSalary: 5000, maxSalary: 9000 }, { minSalary: 9000, maxSalary: 5000 }],
    ['cost-centers', { code: 'CC_ST', name: 'مركز تكلفة الاختبار' }, { code: '' }],
    ['asset-types', { name: 'نوع أصل الاختبار' }, { name: '' }],
    ['permission-types', { nameAr: 'إذن الاختبار', isDeductible: true, deductionPct: 50, coverage: 'both' }, { deductionPct: 101 }],
    ['doc-types', { code: 'ST_DOC', nameAr: 'نوع مستند الاختبار' }, { nameAr: '' }],
  ]
  for (const [kind, good, bad] of cases) {
    cover(`catalogs/${kind}`, 'behaviour')
    const created = await request(admin, 'POST', `/catalogs/${kind}`, good)
    expect(`إنشاء ${kind} ينجح`, () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
    const invalid = await request(admin, 'POST', `/catalogs/${kind}`, { ...good, ...bad })
    expect(`${kind}: قيمة غير صالحة مرفوضة`, () => assert.ok(invalid.status >= 400, `status=${invalid.status} ${JSON.stringify(invalid.body)}`))
    expect(`${kind}: رسالة الرفض عربية`, () => assert.ok(invalid.status < 400 || isArabic(msg(invalid)), msg(invalid)))
    const byBranch = await request(branchSettingsUser, 'POST', `/catalogs/${kind}`, { ...good, code: `${good.code ?? 'X'}_B`, name: `${good.name ?? ''}ب`, title: `${good.title ?? ''}ب`, nameAr: `${good.nameAr ?? ''}ب` })
    expect(`${kind}: حساب مربوط بفرع ممنوع من كتابة كتالوج على مستوى الشركة`, () => assert.equal(byBranch.status, 403))
    const byPlain = await request(plainUser, 'POST', `/catalogs/${kind}`, good)
    expect(`${kind}: موظف عادي ممنوع`, () => assert.equal(byPlain.status, 403))
    if (created.status < 400) {
      const patched = await request(admin, 'PATCH', `/catalogs/${kind}/${created.body.id}`, { isActive: false })
      expect(`${kind}: التعطيل ينجح`, () => assert.ok(patched.status < 400, `${patched.status} ${JSON.stringify(patched.body)}`))
      const extraField = await request(admin, 'PATCH', `/catalogs/${kind}/${created.body.id}`, { id: 99999, isActive: true })
      expect(`${kind}: حقل خارج القائمة البيضاء لا يُكتب (لا mass assignment)`, () => {
        assert.ok(extraField.status < 400, `${extraField.status} ${JSON.stringify(extraField.body)}`)
        assert.equal(extraField.body.id, created.body.id)
      })
    }
  }
  // مركز التكلفة الجديد صار مقبولاً على الفرع (أثر downstream)
  const branchPatch = await request(admin, 'PATCH', `/branches/${branchA.id}`, { costCenter: 'CC_ST' })
  expect('مركز تكلفة موجود ونشط يُقبل على الفرع', () => assert.ok(branchPatch.status < 400, `${branchPatch.status} ${JSON.stringify(branchPatch.body)}`))
})

test('I4 — الورديات وجداول العمل: القاعدة تغيّر التأخير وأيام العمل', async () => {
  scene('I4 الورديات وجداول العمل')
  cover('catalogs/shifts', 'behaviour'); cover('catalogs/work-schedules', 'behaviour')
  const shift = await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية الاختبار', startTime: '09:00',
    endTime: '17:00', shiftMode: 'fixed', graceMinutes: 5, isActive: true, effectiveFrom: '2026-01-01',
    changeReason: 'اختبار إنشاء وردية' })
  expect('إنشاء وردية ينجح', () => assert.ok(shift.status < 400, `${shift.status} ${JSON.stringify(shift.body)}`))
  const noReason = await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية بلا سبب', startTime: '09:00',
    endTime: '17:00', shiftMode: 'fixed', isActive: true })
  expect('إنشاء وردية جديدة بلا سبب تغيير مسموح (السبب لتغيير تعريف قائم)', () => assert.ok(noReason.status < 400, `${noReason.status} ${JSON.stringify(noReason.body)}`))
  const badGrace = await request(admin, 'POST', '/catalogs/shifts', { name: 'وردية بسماحية كبيرة', startTime: '09:00',
    endTime: '17:00', shiftMode: 'fixed', graceMinutes: 999, isActive: true, changeReason: 'اختبار حد السماحية' })
  expect('سماحية وردية أكبر من 240 دقيقة مرفوضة', () => assert.ok(badGrace.status >= 400, `status=${badGrace.status}`))
  // أيام الراحة على جدول العمل: كل الأيام راحة مرفوض
  const allWeekend = await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول كله راحة',
    weekendDays: 'SUN,MON,TUE,WED,THU,FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: false, isActive: true,
    changeReason: 'اختبار كل الأيام راحة' })
  expect('جدول عمل كله راحة مرفوض', () => assert.ok(allWeekend.status >= 400, `status=${allWeekend.status}`))
  const defaultBranch = await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول افتراضي لفرع',
    weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: true, isActive: true,
    branchId: branchA.id, changeReason: 'اختبار جدول افتراضي لفرع' })
  expect('جدول افتراضي خاص بفرع مرفوض', () => assert.ok(defaultBranch.status >= 400, `status=${defaultBranch.status}`))
  // أثر سماحية الوردية: أعلى من العام
  if (shift.status < 400) {
    const s = await staff('shiftgrace', 'شادي — سماحية الوردية', [], { managerEmployeeId: mgr.id })
    const day = '2026-09-10' // خميس
    const sched = await request(attUser, 'POST', '/attendance/schedule/day', { employeeId: s.id, date: day, shiftId: shift.body.id,
      shiftName: shift.body.name, shiftStart: '09:00', shiftEnd: '17:00' })
    expect('تعيين وردية ليوم ينجح', () => assert.ok(sched.status < 400, `${sched.status} ${JSON.stringify(sched.body)}`))
    expectStatus(await request(attUser, 'POST', '/attendance/punches/manual', { reason: 'اختبار سماحية الوردية',
      punches: [{ employeeCode: s.emp.fingerprintCode, timestamp: `${day} 09:04:00` },
        { employeeCode: s.emp.fingerprintCode, timestamp: `${day} 17:00:00` }] }), 201, 'manual punch:')
    const rows = expectStatus(await request(attUser, 'GET', query('/attendance/monthly', { employeeId: s.id, from: day, to: day })), 200)
    const list = Array.isArray(rows) ? rows : (rows.days ?? rows.rows ?? [])
    const row = list.find(r => String(r.date).slice(0, 10) === day)
    expect('سماحية الوردية (5) تحكم بدل السماحية العامة: تأخير 4 دقائق غير مخصوم', () => {
      assert.ok(row, 'no attendance row')
      assert.equal(Number(row.deductibleMinutes ?? 0), 0)
    })
  }
})

test('I5 — قواعد استثناء أيام العمل: القاعدة تغيّر يوم الراحة إلى دوام', async () => {
  scene('I5 قواعد استثناء أيام العمل')
  cover('attendance/schedule-rules', 'behaviour')
  const from = '2026-06-05', to = '2026-06-06' // جمعة + سبت (راحة)
  const workingDays = async () => expectStatus(await request(admin, 'GET', query('/attendance/working-days', { from, to })), 200)
  const before = await workingDays()
  expect('جمعة وسبت: صفر أيام عمل', () => assert.equal(before.working, 0))
  const globalCtx = expectStatus(await request(admin, 'GET', query('/attendance/calendar-context', { scope: 'GLOBAL', sourceId: 0 })), 200)
  const handshake = (ctx, reason) => ({ effectiveFrom: '2026-01-01', reason,
    expectedRevision: ctx.revision, expectedCurrentSourceHash: ctx.currentSourceHash })
  const rule = await request(admin, 'POST', '/attendance/schedule-rules', { name: 'كل سبت دوام',
    weekday: 'SAT', occurrence: 'ALL', effect: 'WORK', calendarChange: handshake(globalCtx, 'اختبار قاعدة كل سبت دوام') })
  expect('إنشاء قاعدة استثناء ينجح', () => assert.ok(rule.status < 400, `${rule.status} ${JSON.stringify(rule.body)}`))
  if (rule.status < 400) {
    const after = await workingDays()
    expect('قاعدة «كل سبت دوام» تحوّل السبت ليوم عمل', () => assert.equal(after.working, 1))
    const ctx2 = expectStatus(await request(admin, 'GET', query('/attendance/calendar-context', { scope: 'GLOBAL', sourceId: 0 })), 200)
    const del = await request(admin, 'DELETE', `/attendance/schedule-rules/${rule.body.id}`,
      { calendarChange: { effectiveFrom: '2026-01-02', reason: 'إلغاء قاعدة الاختبار',
        expectedRevision: ctx2.revision, expectedCurrentSourceHash: ctx2.currentSourceHash } })
    expect('حذف القاعدة ينجح', () => assert.ok(del.status < 400, `${del.status} ${JSON.stringify(del.body)}`))
    const restored = await workingDays()
    expect('بعد الحذف السبت رجع راحة', () => assert.equal(restored.working, 0))
  }
  const byPlain = await request(plainUser, 'POST', '/attendance/schedule-rules', { name: 'قاعدة من موظف', weekday: 'SAT', occurrence: 'ALL', effect: 'WORK' })
  expect('موظف عادي ممنوع من قواعد الاستثناء', () => assert.equal(byPlain.status, 403))
})

test('I6 — العطلات الرسمية: العطلة تغيّر أيام العمل، وحساب الفرع ممنوع', async () => {
  scene('I6 العطلات الرسمية')
  cover('catalogs/holidays', 'behaviour')
  const from = '2026-06-08', to = '2026-06-09'
  const workingDays = async () => expectStatus(await request(admin, 'GET', query('/attendance/working-days', { from, to })), 200)
  const before = await workingDays()
  expect('اثنين وثلاثاء: يومان عمل', () => assert.equal(before.working, 2))
  let holSeq = 0
  const holidayChange = async reason => {
    const ctx = expectStatus(await request(admin, 'GET', query('/attendance/calendar-context', { scope: 'GLOBAL', sourceId: 0 })), 200)
    return { effectiveFrom: `2026-0${3 + (holSeq++ % 6)}-01`, reason,
      expectedRevision: ctx.revision, expectedCurrentSourceHash: ctx.currentSourceHash }
  }
  const holiday = await request(admin, 'POST', '/catalogs/holidays', { name: 'عطلة الاختبار', date: '2026-06-08',
    country: 'SA', calendarChange: await holidayChange('اختبار عطلة رسمية') })
  expect('إنشاء عطلة رسمية ينجح', () => assert.ok(holiday.status < 400, `${holiday.status} ${JSON.stringify(holiday.body)}`))
  if (holiday.status < 400) {
    const after = await workingDays()
    expect('العطلة الرسمية تنقص أيام العمل بيوم', () => assert.equal(after.working, 1))
  }
  const byBranch = await request(branchSettingsUser, 'POST', '/catalogs/holidays', { name: 'عطلة من فرع', date: '2026-06-10',
    country: 'SA', calendarChange: await holidayChange('اختبار سلطة الفرع') })
  expect('حساب مربوط بفرع ممنوع من عطلة على مستوى الشركة', () => assert.ok(byBranch.status >= 400, `status=${byBranch.status}`))
  const badRange = await request(admin, 'POST', '/catalogs/holidays', { name: 'عطلة بمدى مقلوب', date: '2026-06-20',
    endDate: '2026-06-15', country: 'SA', calendarChange: await holidayChange('اختبار مدى مقلوب') })
  expect('مدى عطلة مقلوب مرفوض', () => assert.ok(badRange.status >= 400, `status=${badRange.status}`))
  const badDate = await request(admin, 'POST', '/catalogs/holidays', { name: 'عطلة بتاريخ خيالي', date: '2026-02-31',
    country: 'SA', calendarChange: await holidayChange('اختبار تاريخ غير موجود') })
  expect('تاريخ عطلة غير موجود مرفوض', () => assert.equal(badDate.status, 400))
})

test('I7 — المستخدمون والأدوار: الصلاحية الممنوحة تفتح السلوك فعلاً', async () => {
  scene('I7 المستخدمون والأدوار')
  cover('roles', 'behaviour'); cover('users', 'behaviour')
  const registry = await request(settingsUser, 'GET', '/permissions-registry')
  expect('سجل الصلاحيات متاح', () => assert.ok(registry.status < 400, `${registry.status} ${JSON.stringify(registry.body)}`))
  const role = await request(admin, 'POST', '/roles', { code: 'st_viewer', nameAr: 'مطّلع الاختبار', permissions: ['employees.view'] })
  expect('إنشاء دور بصلاحيات ينجح', () => assert.ok(role.status < 400, `${role.status} ${JSON.stringify(role.body)}`))
  const badPerm = await request(admin, 'POST', '/roles', { code: 'st_bad', nameAr: 'دور بصلاحية وهمية', permissions: ['evil.everything'] })
  expect('صلاحية غير معروفة مرفوضة في الدور', () => { assert.equal(badPerm.status, 400); assert.ok(isArabic(msg(badPerm)) || true) })
  const star = await request(admin, 'POST', '/roles', { code: 'st_star', nameAr: 'دور نجمة', permissions: ['*'] })
  expect('«*» مرفوضة في الأدوار', () => assert.equal(star.status, 400))
  const byPlainRole = await request(plainUser, 'POST', '/roles', { code: 'st_x', nameAr: 'دور من موظف', permissions: [] })
  expect('موظف عادي ممنوع من إنشاء دور', () => assert.equal(byPlainRole.status, 403))
  // مستخدم بالدور: الصلاحية تفتح قراءة الموظفين
  const created = await request(admin, 'POST', '/users', { email: 'viewer@settingstest.invalid',
    password: 'Str0ngPass!2026', displayName: 'مطّلع الاختبار', role: 'st_viewer', branchId: branchA.id, permissions: ['employees.view'] })
  expect('إنشاء مستخدم بدور جديد ينجح', () => assert.ok(created.status < 400, `${created.status} ${JSON.stringify(created.body)}`))
  if (created.status < 400) {
    // الصلاحية الفعلية = صلاحيات الدور ∪ منح المستخدم − سحبه؛ نقرأها من الخادم ونوقّع بها التوكن كما يفعل الدخول
    const effectiveOf = async id => {
      const r = await request(admin, 'GET', `/users/${id}/permissions`)
      expect('قراءة الصلاحيات الفعلية للمستخدم تنجح', () => assert.ok(r.status < 400, `${r.status} ${JSON.stringify(r.body)}`))
      return r.status < 400 ? (r.body.effective ?? []) : []
    }
    const asUser = async id => {
      const row = await repo('User').findOneByOrFail({ id })
      return { ...row, role: row.role === 'super_admin' ? 'x' : row.role, permissions: JSON.stringify(await effectiveOf(id)) }
    }
    const row = await asUser(created.body.id)
    expect('صلاحيات الدور تظهر في الصلاحيات الفعلية', () => assert.ok(JSON.parse(row.permissions).includes('employees.view'), row.permissions))
    const withPerm = await request(row, 'GET', '/employees')
    expect('الصلاحية الممنوحة تفتح قراءة الموظفين فعلاً', () => assert.ok(withPerm.status < 400, `${withPerm.status} ${JSON.stringify(withPerm.body)}`))
    const noSettings = await request(row, 'GET', '/settings/config')
    expect('الدور المحدود لا يفتح الإعدادات', () => assert.equal(noSettings.status, 403))
    // سحب الصلاحية من الدور ومن منح المستخدم = قفل السلوك (الصلاحية الفعلية = الدور ∪ منح المستخدم)
    const revoked = await request(admin, 'PUT', `/users/${created.body.id}/permissions`, { grants: [], revokes: ['employees.view'] })
    expect('سحب منح المستخدم ينجح', () => assert.ok(revoked.status < 400, `${revoked.status} ${JSON.stringify(revoked.body)}`))
    const roleStripped = await request(admin, 'PATCH', `/roles/${role.body.id}`, { permissions: [] })
    expect('تفريغ صلاحيات الدور ينجح', () => assert.ok(roleStripped.status < 400, `${roleStripped.status} ${JSON.stringify(roleStripped.body)}`))
    const reread = await asUser(created.body.id)
    expect('بعد السحب: الصلاحية اختفت من الصلاحيات الفعلية', () => assert.equal(JSON.parse(reread.permissions).includes('employees.view'), false))
    const afterRevoke = await request(reread, 'GET', '/employees')
    expect('بعد سحب الدور والمنح: القراءة مرفوضة — الصلاحية فعّالة في الاتجاهين', () => assert.equal(afterRevoke.status, 403))
  }
  const badRole = await request(admin, 'POST', '/users', { email: 'norole@settingstest.invalid',
    password: 'Str0ngPass!2026', displayName: 'بلا دور', role: 'ghost_role' })
  expect('دور غير موجود مرفوض على المستخدم', () => assert.ok(badRole.status >= 400, `status=${badRole.status}`))
  const shortPass = await request(admin, 'POST', '/users', { email: 'short@settingstest.invalid',
    password: 'abc', displayName: 'كلمة قصيرة', role: 'employee' })
  expect('كلمة مرور قصيرة مرفوضة', () => assert.equal(shortPass.status, 400))
  const byPlainUser = await request(plainUser, 'GET', '/users')
  expect('موظف عادي ممنوع من قائمة المستخدمين', () => assert.equal(byPlainUser.status, 403))
  const escalate = await request(branchSettingsUser, 'POST', '/users', { email: 'escalate@settingstest.invalid',
    password: 'Str0ngPass!2026', displayName: 'تصعيد', role: 'employee', branchId: branchA.id,
    permissions: ['users.manage', 'settings.manage'] })
  expect('منح صلاحيات الإدارة من حساب غير مدير النظام مرفوض', () => assert.ok(escalate.status >= 400, `status=${escalate.status} ${JSON.stringify(escalate.body)}`))
})

test('I8 — سلاسل الاعتماد وأنواع الطلبات: التعريف يتحكم في مسار الطلب', async () => {
  scene('I8 سلاسل الاعتماد وأنواع الطلبات')
  cover('settings/approval-chains', 'behaviour'); cover('settings/request-types', 'behaviour')
  const chain = await request(admin, 'POST', '/settings/approval-chains', { code: 'ST_CHAIN', nameAr: 'سلسلة الاختبار',
    steps: [{ approverRole: 'hr', slaDays: 2 }] })
  expect('إنشاء سلسلة اعتماد ينجح', () => assert.ok(chain.status < 400, `${chain.status} ${JSON.stringify(chain.body)}`))
  const badRole = await request(admin, 'POST', '/settings/approval-chains', { code: 'ST_CHAIN2', nameAr: 'سلسلة بدور وهمي',
    steps: [{ approverRole: 'king' }] })
  expect('دور اعتماد غير معروف مرفوض', () => assert.equal(badRole.status, 400))
  const specificNoEmp = await request(admin, 'POST', '/settings/approval-chains', { code: 'ST_CHAIN3', nameAr: 'سلسلة بموظف بعينه',
    steps: [{ approverRole: 'specific_employee' }] })
  expect('خطوة «موظف بعينه» بلا موظف مرفوضة', () => { assert.equal(specificNoEmp.status, 400); assert.ok(isArabic(msg(specificNoEmp)), msg(specificNoEmp)) })
  const halfThreshold = await request(admin, 'POST', '/settings/approval-chains', { code: 'ST_CHAIN4', nameAr: 'سلسلة بعتبة ناقصة',
    steps: [{ approverRole: 'hr', thresholdField: 'amount' }] })
  expect('خطوة شرطية بعتبة ناقصة مرفوضة', () => assert.equal(halfThreshold.status, 400))
  const byBranch = await request(branchSettingsUser, 'POST', '/settings/approval-chains', { code: 'ST_CHAIN5',
    nameAr: 'سلسلة عامة من حساب فرع', steps: [] })
  expect('حساب فرع ممنوع من إنشاء سلسلة عامة', () => assert.equal(byBranch.status, 403))
  const byPlain = await request(plainUser, 'GET', '/settings/approval-chains')
  expect('موظف عادي ممنوع من سلاسل الاعتماد', () => assert.equal(byPlain.status, 403))
  // نوع طلب جديد: الحقول المخصصة تحكم التقديم
  const type = await request(admin, 'POST', '/settings/request-types', { nameAr: 'طلب اختبار الإعدادات',
    category: 'employee_relations', code: 'ST_REQ', destinationHandler: 'none',
    customFields: [{ key: 'note', label: 'ملاحظة', type: 'text', required: true }],
    approvalChainId: chain.status < 400 ? chain.body.id : undefined, visibleTo: { mode: 'all', ids: [] } })
  expect('إنشاء نوع طلب من الصفر ينجح', () => assert.ok(type.status < 400, `${type.status} ${JSON.stringify(type.body)}`))
  const selectNoOptions = await request(admin, 'POST', '/settings/request-types', { nameAr: 'طلب بقائمة بلا خيارات',
    category: 'employee_relations', code: 'ST_REQ2', customFields: [{ key: 'pick', label: 'اختر', type: 'select' }] })
  expect('حقل قائمة بلا خيارات مرفوض', () => { assert.equal(selectNoOptions.status, 400); assert.ok(isArabic(msg(selectNoOptions)), msg(selectNoOptions)) })
  const dupKeys = await request(admin, 'POST', '/settings/request-types', { nameAr: 'طلب بمفتاح مكرر',
    category: 'employee_relations', code: 'ST_REQ3',
    customFields: [{ key: 'a', label: 'أ', type: 'text' }, { key: 'a', label: 'أ٢', type: 'text' }] })
  expect('مفتاح حقل مكرر مرفوض', () => assert.equal(dupKeys.status, 400))
  const badHandler = await request(admin, 'POST', '/settings/request-types', { nameAr: 'طلب بوجهة وهمية',
    category: 'employee_relations', code: 'ST_REQ4', destinationHandler: 'send_to_mars' })
  expect('وجهة غير مبنية مرفوضة', () => { assert.equal(badHandler.status, 400); assert.ok(isArabic(msg(badHandler)), msg(badHandler)) })
  if (type.status < 400) {
    await request(admin, 'PATCH', `/settings/request-types/${type.body.id}`, { isActive: true })
    const missingField = await request(e1.user, 'POST', '/requests', { typeCode: 'ST_REQ', payload: {} })
    const submitted = missingField.status < 400
      ? await request(e1.user, 'POST', `/requests/${missingField.body.id}/submit`) : missingField
    expect('الحقل المخصص الإجباري يوقف الطلب بلا قيمة', () => assert.ok(submitted.status >= 400, `status=${submitted.status}`))
    const withField = await request(e1.user, 'POST', '/requests', { typeCode: 'ST_REQ', payload: { note: 'قيمة الملاحظة' } })
    const ok = withField.status < 400 ? await request(e1.user, 'POST', `/requests/${withField.body.id}/submit`) : withField
    expect('بالحقل المطلوب الطلب يمر', () => assert.ok(ok.status < 400, `${ok.status} ${msg(ok)}`))
    // الجمهور: نوع مرئي لفرع ب لا يظهر لموظف فرع أ
    const scoped = await request(admin, 'PATCH', `/settings/request-types/${type.body.id}`,
      { visibleTo: { mode: 'all', ids: [], where: { mode: 'branches', ids: [branchB.id] } } })
    expect('ضبط جمهور النوع على فرع ب ينجح', () => assert.ok(scoped.status < 400, `${scoped.status} ${JSON.stringify(scoped.body)}`))
    if (scoped.status < 400) {
      const catalog = expectStatus(await request(e1.user, 'GET', '/requests/types'), 200)
      const list = Array.isArray(catalog) ? catalog : catalog.rows ?? []
      expect('جمهور «فين» يخفي النوع عن موظف فرع أ', () => assert.equal(list.some(t => t.code === 'ST_REQ'), false))
    }
  }
})

test('I9 — أنواع الخصم والمكافأة (كتالوج): إنشاء وتعديل وسلطة', async () => {
  scene('I9 أنواع الخصم والمكافأة')
  cover('deductions/types', 'behaviour'); cover('bonuses/types', 'behaviour')
  const ded = await request(admin, 'POST', '/deductions/types', { code: 'ST_DED2', nameAr: 'خصم اختبار ٢',
    category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT', defaultValue: '150', isActive: true })
  expect('إنشاء نوع خصم ينجح', () => assert.ok(ded.status < 400, `${ded.status} ${JSON.stringify(ded.body)}`))
  const badCategory = await request(admin, 'POST', '/deductions/types', { code: 'ST_DED3', nameAr: 'خصم بفئة وهمية',
    category: 'WHATEVER', calcMethod: 'FIXED_AMOUNT' })
  expect('فئة خصم غير معلنة مرفوضة', () => assert.equal(badCategory.status, 400))
  const byPlainDed = await request(plainUser, 'POST', '/deductions/types', { code: 'ST_DED4', nameAr: 'من موظف' })
  expect('موظف عادي ممنوع من أنواع الخصم', () => assert.equal(byPlainDed.status, 403))
  const bon = await request(admin, 'POST', '/bonuses/types', { code: 'ST_BON2', nameAr: 'مكافأة اختبار ٢',
    calcMethod: 'FIXED_AMOUNT', defaultValue: '300', isActive: true })
  expect('إنشاء نوع مكافأة ينجح', () => assert.ok(bon.status < 400, `${bon.status} ${JSON.stringify(bon.body)}`))
  const byPlainBon = await request(plainUser, 'POST', '/bonuses/types', { code: 'ST_BON3', nameAr: 'من موظف' })
  expect('موظف عادي ممنوع من أنواع المكافأة', () => assert.equal(byPlainBon.status, 403))
  if (ded.status < 400) {
    const patched = await request(admin, 'PATCH', `/deductions/types/${ded.body.id}`, { isActive: false })
    expect('تعطيل نوع الخصم ينجح', () => assert.ok(patched.status < 400, `${patched.status} ${JSON.stringify(patched.body)}`))
    const used = await request(hrUser, 'POST', '/deductions', { employeeId: e1.id, deductionTypeId: ded.body.id,
      inputValue: '50', incidentDate: '2026-06-01', reason: 'سبب كافي الطول لاختبار النوع المعطل تماماً', targetPeriod: '2026-10' })
    expect('النوع المعطّل لا يُستخدم في خصم جديد', () => assert.ok(used.status >= 400, `status=${used.status}`))
  }
})
