'use strict'
// نظام تشغيل وقفل الموديولات (خطة التنفيذ — الجزء 3، الدفعة B0.2) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_modules_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  ME-01) من غير صفوف: كل الموجود مفعّل (افتراضي السجل)، وGET /modules/enabled بيرجّعه لأي مستخدم داخل، والمزايا على افتراضيها.
//  ME-02) موديول مقفول: مساراته 404 بنفس رد المسار اللي مالوش وجود بالحرف — حتى من غير توكن ولمدير النظام — ومش في /modules/enabled،
//         والتغيير متسجّل (مين وإمتى)؛ والفتح بيرجّع كل ده من غير ترحيل.
//  ME-03) التبعيات: قفل موديول معتمد عليه موديول مفعّل مرفوض، وتفعيل موديول اللي بيعتمد عليه مقفول مرفوض، والأساسي مايتقفلش؛
//         ولو الصف اتقفل من القاعدة مباشرة، اللي بيعتمد عليه بيتقفل فعليًا معاه.
//  ME-04) أنواع الطلبات: نوع موديوله مقفول مابيظهرش في الكتالوج، وإنشاؤه وتقديم مسودته 404 «نوع الطلب غير موجود»،
//         والطلب المفتوح منه بيكمّل سلسلته ويتعتمد؛ والفتح بيرجّع التقديم.
//  ME-05) المهام المجدولة: مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل دايمًا.
//  ME-06) جمهور التفعيل: الموديول مفعّل لجمهوره بس (مين + فين) — برّه الجمهور 404 ومش في /modules/enabled ولا في كتالوج الطلبات،
//         ومدير النظام بيعدّي؛ الجمهور الغلط 400، والأساسي مالوش جمهور.
//  ME-07) المزايا الفرعية والباقات: الميزة بتتفتح وتتقفل، والباقة بتعرض الفرق قبل التطبيق وبتتطبق.
//  ME-08) الإشعارات والتقويم: إشعارات الموديول المقفول وإجازات التقويم مابتظهرش.
//  ME-09) قبل ترحيل 076 (الجداول مش موجودة): كل حاجة شغالة على الافتراضي.
//  ME-11) الحضور مقفول: محرك الحضور مابيحسبش غياب عن أيام القفل (لا في المسير ولا في لحاق الغياب بعد الفتح)، واللي قبل القفل زي ما هو.
//  ME-12) وراثة الجمهور للموديول المعتمِد، ومسار الوردية جوه كنترولر الحضور والكتالوج، والطلب المُرجَع بيتقدّم تاني والموديول مقفول.
//  ME-10) مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية (ملف الموظف ولوحة التحكم): جزء الموديول المقفول بيرجع فاضي، والمسار نفسه شغال.
//         وطلب السلفة المفتوح بتتراجع سقفه بعد قفل السلف. (مكتوب قبل ME-09 في الملف لأن ME-09 بيشيل الجداول.)
// Run (من api/): node --test test/modules-enforcement.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const registry = require('../src/modules-registry/registry')
const { In } = require('../node_modules/typeorm')

const database = `hr_modules_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_modules_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-modules-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const daysAgo = n => { const day = new Date(); day.setDate(day.getDate() - n); return isoDate(day) }
let app, ds, master, base, modules, created = false
const B = {}, D = {}, E = {}, U = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
// رد Nest لمسار مالوش وجود: الموديول المقفول لازم يطلع بنفس الشكل بالحرف
const gone = (response, method, route) => assert.deepEqual(response, { status: 404, body: { message: `Cannot ${method} /api${route}`, error: 'Not Found', statusCode: 404 } })
const enabledFor = async user => ok(await request(user, 'GET', '/modules/enabled'))
const admin = () => payloadOf(U.admin)
// حالة الموديول من القاعدة مباشرة (زي ما الدفعة بتقول: «قفل موديول من القاعدة») — والكاش بيتمسح
async function setRow(key, enabled, audience = null) {
  await repo('SystemModule').save({ key, enabled, enabledAt: null, enabledBy: null, audience })
  modules.invalidate()
}
async function clearRows() {
  assertDisposable()
  await repo('SystemModule').clear(); await repo('SystemModuleFeature').clear()
  modules.invalidate()
}
const refused = async (work, status, pattern) => {
  await assert.rejects(work, error => {
    assert.equal(error.getStatus?.(), status, error.message)
    if (pattern) assert.match(String(error.message), pattern)
    return true
  })
}
// جاسوس على دالة: كام مرة اتنادت (والأصل بيرجع بعد الاختبار)
function spy(target, name, result) {
  const original = target[name]
  const calls = []
  target[name] = async (...args) => { calls.push(args); return result }
  return { calls, restore: () => { target[name] = original } }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.cairo = await repo('Branch').save({ code: 'MOD-CAI', name: 'فرع القاهرة' })
  B.alex = await repo('Branch').save({ code: 'MOD-ALX', name: 'فرع الإسكندرية' })
  D.cairo = await repo('Department').save({ name: 'التشغيل', code: 'MOD_OPS', branchId: B.cairo.id, isActive: true })
  D.alex = await repo('Department').save({ name: 'المبيعات', code: 'MOD_SALES', branchId: B.alex.id, isActive: true })
  const employee = (code, fullName, branch, department) => repo('Employee').save({ employeeCode: code, fullName, branchId: branch.id, departmentId: department.id,
    status: 'active', isActive: true, joinDate: '2022-01-01', basicSalary: 9000 })
  E.hr = await employee('MOD-001', 'هدى مسؤولة الموارد', B.cairo, D.cairo)
  E.cairo = await employee('MOD-002', 'كريم موظف القاهرة', B.cairo, D.cairo)
  E.alex = await employee('MOD-003', 'منى موظفة الإسكندرية', B.alex, D.alex)
  const user = (email, role, branch, employeeId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'isolated-test-token-only', role,
    branchId: branch ? branch.id : null, employeeId, permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@modules.test', 'super_admin', null, null, ['*'])
  U.hr = await user('hr@modules.test', 'hr_manager', B.cairo, E.hr.id, ['employees.view', 'candidates.manage', 'attendance.view_all', 'attendance.manage',
    'leaves.view_all', 'leaves.revoke', 'payroll.view', 'custody.assign', 'offboarding.manage', 'approve.hr', 'requests.view_all', 'overtime.confirm'])
  U.cairo = await user('cairo@modules.test', 'employee', B.cairo, E.cairo.id, [])
  U.alex = await user('alex@modules.test', 'employee', B.alex, E.alex.id, [])

  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_HR', nameAr: 'اعتماد الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  const type = (code, nameAr, category, destinationHandler, requiredFields = []) => repo('RequestType').save({ code, nameAr, category, destinationHandler,
    approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(requiredFields) })
  await type('REMOTE_WORK', 'عمل عن بُعد', 'time_attendance', 'attendance_log', ['fromDate', 'toDate'])
  await type('SUGGESTION', 'اقتراح/ملاحظة', 'employee_relations', 'none', ['description'])
  await type('CUSTODY_RETURN', 'إرجاع عهدة', 'custody_assets', 'custody_return', ['assignmentId'])
}, { timeout: 180000 })

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
  if (errors.length) throw new AggregateError(errors, 'modules enforcement fixture cleanup failed')
})

test('ME-01: من غير صفوف — كل الموجود مفعّل، و/modules/enabled بيرجّعه لأي مستخدم داخل', async () => {
  assert.equal(await repo('SystemModule').count(), 0)
  const defaults = registry.enabledSnapshot({ modules: {}, features: {} })
  for (const user of [U.admin, U.hr, U.cairo, U.alex]) assert.deepEqual(await enabledFor(user), { modules: defaults.modules, features: [] })
  for (const key of ['platform', 'employees', 'requests', 'attendance', 'shifts', 'overtime', 'leave', 'payroll', 'loans', 'custody', 'offboarding', 'onboarding', 'recruitment']) {
    assert.ok(defaults.modules.includes(key), key)
  }
  // من غير دخول: 401 زي أي مسار محمي (الموديول نفسه أساسي ومفعّل)
  assert.equal((await request(null, 'GET', '/modules/enabled')).status, 401)
  // مسارات الموديولات الاختيارية شغالة
  ok(await request(U.hr, 'GET', '/candidates'))
  ok(await request(U.cairo, 'GET', '/custody/mine'))
  ok(await request(U.hr, 'GET', '/leaves'))
  ok(await request(U.cairo, 'GET', '/loans/mine'))
  ok(await request(U.hr, 'GET', '/offboarding'))
  ok(await request(U.hr, 'GET', '/payroll/runs'))
})

test('ME-02: موديول مقفول — مساراته 404 بنفس رد المسار اللي مالوش وجود، والفتح بيرجّعها', async () => {
  // مرجع: مسار مالوش وجود فعلًا
  gone(await request(U.hr, 'GET', '/definitely-not-a-route'), 'GET', '/definitely-not-a-route')
  await modules.setModule(admin(), 'recruitment', { enabled: false })
  gone(await request(U.hr, 'GET', '/candidates'), 'GET', '/candidates')
  gone(await request(U.hr, 'POST', '/candidates', { fullName: 'مرشح', positionTitle: 'محاسب' }), 'POST', '/candidates')
  gone(await request(U.hr, 'PATCH', '/candidates/1', { stage: 'interview' }), 'PATCH', '/candidates/1')
  // مدير النظام نفسه، ومن غير توكن: 404 برضه (مش 401) — محدش يعرف إنه موجود
  gone(await request(U.admin, 'GET', '/candidates'), 'GET', '/candidates')
  gone(await request(null, 'GET', '/candidates'), 'GET', '/candidates')
  gone(await request(U.cairo, 'GET', '/candidates?x=1'), 'GET', '/candidates?x=1')
  for (const user of [U.admin, U.hr, U.cairo]) assert.ok(!(await enabledFor(user)).modules.includes('recruitment'))
  // باقي الموديولات مالهاش دعوة
  ok(await request(U.cairo, 'GET', '/custody/mine'))
  ok(await request(U.hr, 'GET', '/leaves'))
  // التغيير متسجّل: مين وإمتى
  const row = await repo('SystemModule').findOneByOrFail({ key: 'recruitment' })
  assert.equal(row.enabled, false); assert.equal(row.enabledBy, U.admin.id); assert.ok(row.enabledAt instanceof Date)
  const events = await repo('SystemModuleEvent').find({ where: { key: 'recruitment' }, order: { id: 'ASC' } })
  assert.deepEqual(events.map(event => [event.kind, event.enabled, event.byUserId]), [['module', false, U.admin.id]])

  // الفتح: كل حاجة بترجع من غير ترحيل
  await modules.setModule(admin(), 'recruitment', { enabled: true })
  ok(await request(U.hr, 'GET', '/candidates'))
  assert.ok((await enabledFor(U.cairo)).modules.includes('recruitment'))
  assert.equal(await repo('SystemModuleEvent').count({ where: { key: 'recruitment' } }), 2)
  await clearRows()
})

test('ME-03: التبعيات — قفل معتمد عليه مرفوض، وتفعيل من غير تبعيته مرفوض، والأساسي مايتقفلش', async () => {
  await refused(() => modules.setModule(admin(), 'attendance', { enabled: false }), 409, /الورديات.*الإضافي|الإضافي.*الورديات/)
  await refused(() => modules.setModule(admin(), 'payroll', { enabled: false }), 409, /السلف/)
  await refused(() => modules.setModule(admin(), 'employees', { enabled: false }), 400, /أساسي/)
  await refused(() => modules.setModule(admin(), 'no_such_module', { enabled: false }), 404)
  assert.equal(await repo('SystemModule').count(), 0, 'الرفض مابيكتبش حاجة')

  // القفل بالترتيب: اللي بيعتمد الأول
  await modules.setModule(admin(), 'shifts', { enabled: false })
  await modules.setModule(admin(), 'overtime', { enabled: false })
  await modules.setModule(admin(), 'attendance', { enabled: false })
  gone(await request(U.cairo, 'GET', '/attendance/my-today'), 'GET', '/attendance/my-today')
  gone(await request(U.hr, 'GET', '/attendance/daily?date=2026-10-01'), 'GET', '/attendance/daily?date=2026-10-01')
  // تفعيل اللي بيعتمد والحضور مقفول: مرفوض برسالة بتقول يفعّل إيه
  await refused(() => modules.setModule(admin(), 'shifts', { enabled: true }), 409, /الحضور/)
  await modules.setModule(admin(), 'attendance', { enabled: true })
  await modules.setModule(admin(), 'shifts', { enabled: true })
  ok(await request(U.cairo, 'GET', '/attendance/my-today'))
  await clearRows()

  // صف الحضور اتقفل من القاعدة مباشرة وصفوف اللي بيعتمد عليه مفعّلة: بيتقفلوا فعليًا معاه
  await setRow('attendance', false); await setRow('shifts', true); await setRow('overtime', true)
  const enabled = (await enabledFor(U.hr)).modules
  for (const key of ['attendance', 'shifts', 'overtime']) assert.ok(!enabled.includes(key), key)
  for (const key of ['leave', 'payroll', 'custody']) assert.ok(enabled.includes(key), key)
  gone(await request(U.hr, 'GET', '/attendance/schedule?weekStart=2026-09-27'), 'GET', '/attendance/schedule?weekStart=2026-09-27')
  gone(await request(U.hr, 'GET', '/attendance/overtime?month=2026-09'), 'GET', '/attendance/overtime?month=2026-09')
  gone(await request(U.hr, 'GET', '/attendance/holiday-work'), 'GET', '/attendance/holiday-work')
  ok(await request(U.hr, 'GET', '/leaves'))
  await clearRows()
})

test('ME-04: أنواع الطلبات — نوع الموديول المقفول مابيتقدمش، والمفتوح منه بيكمّل سلسلته', async () => {
  const codes = async user => ok(await request(user, 'GET', '/requests/types')).map(type => type.code)
  assert.deepEqual((await codes(U.cairo)).sort(), ['CUSTODY_RETURN', 'REMOTE_WORK', 'SUGGESTION'])
  const day = daysAgo(-3)
  const open = ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: day, toDate: day } }), 201)
  assert.equal(open.status, 'UNDER_REVIEW')
  const draft = ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', payload: { fromDate: daysAgo(-5), toDate: daysAgo(-5) } }), 201)
  assert.equal(draft.status, 'DRAFT')

  await setRow('attendance', false)
  assert.deepEqual((await codes(U.cairo)).sort(), ['CUSTODY_RETURN', 'SUGGESTION'], 'النوع مش في الكتالوج')
  assert.deepEqual((await codes(U.admin)).sort(), ['CUSTODY_RETURN', 'SUGGESTION'], 'ولا لمدير النظام')
  const refusedCreate = await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: day, toDate: day } })
  assert.equal(refusedCreate.status, 404); assert.equal(refusedCreate.body.message, 'نوع الطلب غير موجود')
  // نفس رد النوع اللي مش موجود فعلًا
  const unknown = await request(U.cairo, 'POST', '/requests', { typeCode: 'NO_SUCH_TYPE', submit: true, payload: {} })
  assert.deepEqual(refusedCreate.body, unknown.body)
  const refusedSubmit = await request(U.cairo, 'POST', `/requests/${draft.id}/submit`)
  assert.equal(refusedSubmit.status, 404); assert.equal(refusedSubmit.body.message, 'نوع الطلب غير موجود')
  assert.equal((await repo('Request').findOneByOrFail({ id: draft.id })).status, 'DRAFT')
  // نوع الأساسي شغال
  ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'SUGGESTION', submit: true, payload: { description: 'اقتراح للتجربة' } }), 201)

  // الطلب المفتوح قبل القفل: بيظهر للمعتمد وبيتعتمد ويكمّل
  assert.ok(ok(await request(U.hr, 'GET', '/requests/inbox')).some(row => row.id === open.id))
  ok(await request(U.hr, 'POST', `/requests/${open.id}/act`, { action: 'APPROVE' }), 201)
  assert.equal((await repo('Request').findOneByOrFail({ id: open.id })).status, 'COMPLETED')

  // الفتح: التقديم بيرجع
  await clearRows()
  assert.ok((await codes(U.cairo)).includes('REMOTE_WORK'))
  assert.equal(ok(await request(U.cairo, 'POST', `/requests/${draft.id}/submit`), 201).status, 'UNDER_REVIEW')
})

test('ME-05: المهام المجدولة — مهمة الموديول المقفول مابتشتغلش، ومهمة الأساسي بتشتغل', async () => {
  const get = (file, name) => app.get(require(file)[name])
  const jobs = [
    { module: 'attendance', run: () => get('../src/attendance/attendance-scheduler.service', 'AttendanceScheduler').materializeYesterday(),
      spy: () => spy(get('../src/attendance/attendance.service', 'AttendanceService'), 'materializeAbsencesCatchUp', null) },
    { module: 'attendance', run: () => get('../src/attendance/attendance-scheduler.service', 'AttendanceScheduler').catchUpIfBehind(),
      spy: () => spy(get('../src/attendance/attendance.service', 'AttendanceService'), 'materializeAbsencesCatchUp', null) },
    { module: 'attendance', run: () => get('../src/attendance/device-sync.service', 'DeviceSyncService').scheduledSync(),
      spy: () => spy(get('../src/attendance/device-sync.service', 'DeviceSyncService').config, 'findOne', null) },
    { module: 'overtime', run: () => get('../src/requests/requests.service', 'RequestsService').reconcileAutoOvertime(),
      spy: () => spy(get('../src/requests/requests.service', 'RequestsService').types, 'findOneBy', null) },
    { module: 'leave', run: () => get('../src/requests/requests-scheduler.service', 'RequestsScheduler').yearStart(),
      // خدمة الأرصدة ليها أكتر من نسخة (كل موديول Nest بيوفّرها لنفسه): الجاسوس على نسخة المجدول نفسه
      spy: () => spy(get('../src/requests/requests-scheduler.service', 'RequestsScheduler').balances, 'catchUpRollover', null) },
    { module: 'leave', run: () => get('../src/requests/leave-attachment-deadline.job', 'LeaveAttachmentDeadlineJob').daily(),
      spy: () => spy(get('../src/requests/leave-attachment-deadline.job', 'LeaveAttachmentDeadlineJob'), 'run', { reminders: [], missed: [] }) },
    { module: 'payroll', run: () => get('../src/payroll/payroll-daily-accrual.scheduler', 'PayrollDailyAccrualScheduler').hourly(),
      spy: () => spy(get('../src/payroll/payroll-daily-accrual.scheduler', 'PayrollDailyAccrualScheduler'), 'setting', 'false') },
    { module: 'payroll', run: () => get('../src/payroll/typed-deductions-scheduler.service', 'TypedDeductionsScheduler').processStepSla(),
      spy: () => spy(get('../src/payroll/typed-deductions.service', 'TypedDeductionsService'), 'processSla', { escalated: 0, rejected: 0, breached: 0 }) },
    { module: 'offboarding', run: () => get('../src/offboarding/offboarding.service', 'OffboardingService').finalizeDue(),
      spy: () => spy(get('../src/offboarding/offboarding.service', 'OffboardingService'), 'finalizeDueFor', { finalized: 0 }) },
    // الأساسي: مايتقفلش فبيشتغل دايمًا
    { module: null, run: () => get('../src/requests/requests-scheduler.service', 'RequestsScheduler').escalations(),
      spy: () => spy(get('../src/requests/requests.service', 'RequestsService'), 'runEscalations', { escalated: 0 }) },
    { module: null, run: () => get('../src/requests/requests-scheduler.service', 'RequestsScheduler').transfers(),
      spy: () => spy(get('../src/requests/requests.service', 'RequestsService'), 'runScheduledTransfers', { executed: 0, employmentExecuted: 0, cancelled: 0 }) },
    // B2.3: أحداث المستندات اللي هتنتهي (موديول المستندات أساسي)
    { module: null, run: () => get('../src/queue/queue.service', 'QueueService').recordDocumentExpiryEvents('2026-10-03'),
      spy: () => spy(get('../src/queue/queue.service', 'QueueService'), 'documentAlerts', { events: 0, tasks: 0 }) },
    // B2.4: الملخص اليومي لإشعارات البريد في ساعته المضبوطة (موديول الإشعارات أساسي)
    { module: null, run: () => get('../src/notifications/notifications.service', 'NotificationsService').digestHourlyWork(new Date(2026, 9, 5, 8, 5)),
      spy: () => spy(get('../src/notifications/notifications.service', 'NotificationsService'), 'sendDigests', 0) },
    // B2.13: التقارير المجدولة بالبريد من ساعة الإرسال (موديول التقارير أساسي)
    { module: null, run: () => get('../src/reports/saved-reports.service', 'SavedReportsService').sendDue(new Date(2026, 9, 5, 9, 20)),
      spy: () => spy(get('../src/reports/saved-reports.service', 'SavedReportsService'), 'dueRows', []) },
  ]
  const calls = async job => { const watch = job.spy(); try { await job.run(); return watch.calls.length } finally { watch.restore() } }
  // كل الموديولات مفعّلة: كل مهمة بتوصل لشغلها
  for (const [index, job] of jobs.entries()) assert.equal(await calls(job), 1, `المهمة ${index} والموديولات مفعّلة`)
  // كل الاختياري مقفول
  for (const key of ['shifts', 'overtime', 'attendance', 'leave', 'loans', 'payroll', 'offboarding']) await setRow(key, false)
  for (const [index, job] of jobs.entries()) assert.equal(await calls(job), job.module ? 0 : 1, `المهمة ${index} (${job.module ?? 'أساسي'}) والموديولات مقفولة`)
  // نتيجة المهمة المقفولة شكلها زي «مفيش شغل»
  assert.deepEqual(await app.get(require('../src/requests/requests.service').RequestsService).reconcileAutoOvertime(), { routed: 0, autoApproved: 0 })
  assert.deepEqual(await app.get(require('../src/offboarding/offboarding.service').OffboardingService).finalizeDue(), { finalized: 0 })
  await clearRows()
  for (const [index, job] of jobs.entries()) assert.equal(await calls(job), 1, `المهمة ${index} بعد الفتح`)
})

test('ME-06: جمهور التفعيل — الموديول لجمهوره بس، ومدير النظام بيعدّي', async () => {
  // فين: فرع القاهرة بس
  await modules.setModule(admin(), 'custody', { audience: { mode: 'all', where: { mode: 'branches', ids: [B.cairo.id] } } })
  ok(await request(U.cairo, 'GET', '/custody/mine'))
  gone(await request(U.alex, 'GET', '/custody/mine'), 'GET', '/custody/mine')
  ok(await request(U.admin, 'GET', '/custody/mine'))
  assert.ok((await enabledFor(U.cairo)).modules.includes('custody'))
  assert.ok(!(await enabledFor(U.alex)).modules.includes('custody'))
  assert.ok((await enabledFor(U.admin)).modules.includes('custody'))
  // نوع طلب العهدة مش في كتالوج اللي برّه الجمهور، وتقديمه 404
  const codes = async user => ok(await request(user, 'GET', '/requests/types')).map(type => type.code)
  assert.ok((await codes(U.cairo)).includes('CUSTODY_RETURN'))
  assert.ok(!(await codes(U.alex)).includes('CUSTODY_RETURN'))
  const refusedCreate = await request(U.alex, 'POST', '/requests', { typeCode: 'CUSTODY_RETURN', submit: true, payload: { assignmentId: 1 } })
  assert.equal(refusedCreate.status, 404); assert.equal(refusedCreate.body.message, 'نوع الطلب غير موجود')
  // من غير توكن: الحارس العام مابيقفلش (الموديول مفعّل)، وحارس الدخول هو اللي بيرفض
  assert.equal((await request(null, 'GET', '/custody/mine')).status, 401)

  // مين: دور مدير الموارد البشرية بس
  await modules.setModule(admin(), 'custody', { audience: { mode: 'roles', ids: ['hr_manager'] } })
  ok(await request(U.hr, 'GET', '/custody/mine'))
  gone(await request(U.cairo, 'GET', '/custody/mine'), 'GET', '/custody/mine')
  // مين + فين مع بعض
  await modules.setModule(admin(), 'custody', { audience: { mode: 'roles', ids: ['hr_manager'], where: { mode: 'branches', ids: [B.alex.id] } } })
  gone(await request(U.hr, 'GET', '/custody/mine'), 'GET', '/custody/mine')

  // الجمهور الغلط مرفوض، والأساسي مالوش جمهور
  await refused(() => modules.setModule(admin(), 'custody', { audience: { mode: 'nobody' } }), 400)
  await refused(() => modules.setModule(admin(), 'custody', { audience: { mode: 'roles', ids: [] } }), 400)
  await refused(() => modules.setModule(admin(), 'custody', { audience: 'all' }), 400)
  await refused(() => modules.setModule(admin(), 'employees', { audience: { mode: 'roles', ids: ['hr_manager'] } }), 400, /أساسي/)
  // «الكل في كل الشركة» = من غير جمهور، وnull بيمسحه
  await modules.setModule(admin(), 'custody', { audience: { mode: 'all' } })
  assert.equal((await repo('SystemModule').findOneByOrFail({ key: 'custody' })).audience, null)
  ok(await request(U.alex, 'GET', '/custody/mine'))
  await modules.setModule(admin(), 'custody', { audience: { mode: 'roles', ids: ['hr_manager'] } })
  await modules.setModule(admin(), 'custody', { audience: null })
  ok(await request(U.cairo, 'GET', '/custody/mine'))
  // الجمهور متسجّل في سجل التغييرات
  const events = await repo('SystemModuleEvent').find({ where: { key: 'custody' }, order: { id: 'ASC' } })
  assert.equal(events.length, 6)
  assert.deepEqual(JSON.parse(events[0].audience), { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.cairo.id] } })
  assert.equal(events[5].audience, null)
  await clearRows()
})

test('ME-07: المزايا الفرعية والباقات', async () => {
  const demo = registry.DEMO_SCREENS_FEATURE
  assert.deepEqual((await enabledFor(U.cairo)).features, [])
  await modules.setFeature(admin(), demo, true)
  assert.deepEqual((await enabledFor(U.cairo)).features, [demo])
  await modules.setFeature(admin(), demo, false)
  assert.deepEqual((await enabledFor(U.cairo)).features, [])
  await refused(() => modules.setFeature(admin(), 'no.such_feature', true), 404)
  assert.deepEqual((await repo('SystemModuleEvent').find({ where: { key: demo }, order: { id: 'ASC' } })).map(event => [event.kind, event.enabled]), [['feature', true], ['feature', false]])

  // الباقة الأساسية: التوظيف برّاها (كل الباقي من الموجود جوّاها)، وفيها «لوحة فريقي» المقفولة افتراضيًا (B2.14): تطبيقها بيفعّلها
  const basic = await modules.presetDiff('basic')
  assert.deepEqual(basic.enable, [{ key: 'announcements', nameAr: 'الإعلانات' }, { key: 'manager', nameAr: 'لوحة «فريقي»' }, { key: 'dependents', nameAr: 'سجل المعالين' }]); assert.deepEqual(basic.disable.map(row => row.key), ['recruitment'])
  assert.equal(basic.disable[0].nameAr, 'التوظيف')
  assert.equal(await repo('SystemModule').count(), 0, 'المعاينة مابتكتبش')
  await modules.applyPreset(admin(), 'basic')
  assert.ok(!(await enabledFor(U.hr)).modules.includes('recruitment'))
  gone(await request(U.hr, 'GET', '/candidates'), 'GET', '/candidates')
  ok(await request(U.hr, 'GET', '/leaves'))
  const standard = await modules.presetDiff('standard')
  assert.deepEqual(standard.enable.map(row => row.key), ['recruitment', 'performance', 'training', 'helpdesk', 'cases', 'surveys', 'positions']); assert.deepEqual(standard.disable, []) // B3.6: + الأداء؛ B3.9: + التدريب؛ B3.10: + مركز الخدمات
  await modules.applyPreset(admin(), 'standard')
  ok(await request(U.hr, 'GET', '/candidates'))
  assert.deepEqual((await modules.presetDiff('standard')), { preset: 'standard', nameAr: 'القياسية', enable: [], disable: [] })
  await refused(() => modules.presetDiff('platinum'), 404)
  assert.equal(await repo('SystemModuleEvent').count({ where: { kind: 'preset' } }), 2)
  await clearRows()
})

test('ME-08: الإشعارات والتقويم — بتوع الموديول المقفول مابيظهروش', async () => {
  const yesterday = daysAgo(1)
  await repo('AttendanceDay').save({ employeeId: E.cairo.id, branchId: B.cairo.id, date: yesterday, status: 'missing_punch', checkIn: '09:00', checkOut: null,
    shiftName: 'وردية اختبار', shiftStart: '09:00', shiftEnd: '17:00', scheduleSource: 'override', lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 0 })
  const leave = await repo('Leave').save({ employeeId: E.cairo.id, leaveTypeCode: 'ANNUAL', fromDate: daysAgo(2), toDate: daysAgo(2), days: 1, status: 'CANCELLED',
    revokedByUserId: U.hr.id, revokedAt: new Date() })
  const approved = await repo('Leave').save({ employeeId: E.cairo.id, leaveTypeCode: 'ANNUAL', fromDate: isoDate(new Date()), toDate: isoDate(new Date()), days: 1, status: 'APPROVED' })
  const ids = async user => ok(await request(user, 'GET', '/notifications')).map(item => item.id)
  const month = isoDate(new Date()).slice(0, 7)
  const calendarLeaves = async user => ok(await request(user, 'GET', `/calendar?month=${month}`)).leaves.map(row => row.id)

  let mine = await ids(U.cairo)
  assert.ok(mine.includes(`missing-punch-${yesterday}`)); assert.ok(mine.includes(`leave-revoked-${leave.id}`))
  assert.ok((await ids(U.hr)).includes('missing-punch-scope'))
  assert.deepEqual(await calendarLeaves(U.cairo), [approved.id])

  await setRow('attendance', false)
  mine = await ids(U.cairo)
  assert.ok(!mine.includes(`missing-punch-${yesterday}`)); assert.ok(mine.includes(`leave-revoked-${leave.id}`))
  assert.ok(!(await ids(U.hr)).includes('missing-punch-scope'))

  await setRow('leave', false)
  assert.ok(!(await ids(U.cairo)).includes(`leave-revoked-${leave.id}`))
  assert.deepEqual(await calendarLeaves(U.cairo), [], 'التقويم من غير إجازات والإجازات مقفولة')
  // الإشعارات والتقويم نفسهم أساسي وشغالين
  ok(await request(U.cairo, 'GET', '/notifications'))

  await clearRows()
  mine = await ids(U.cairo)
  assert.ok(mine.includes(`missing-punch-${yesterday}`)); assert.ok(mine.includes(`leave-revoked-${leave.id}`))
})

test('ME-11: الحضور مقفول — محرك الحضور مابيحسبش غياب عن أيام القفل، ولا بعد ما يتفتح تاني', async () => {
  await clearRows()
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  await repo('RequestsConfig').save({ key: 'attendance.weekend_days', value: 'FRI,SAT' })
  const person = code => repo('Employee').save({ employeeCode: code, fullName: 'موظف ' + code, branchId: B.cairo.id, departmentId: D.cairo.id, status: 'active', isActive: true,
    joinDate: '2022-01-01', basicSalary: 9000 })
  const rows = async emp => (await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } })).map(row => [String(row.date).slice(0, 10), row.status])
  const from = daysAgo(14), to = daysAgo(0)

  // الحضور مفعّل: الأيام اللي فاتت من غير بصمة بتتسجّل غياب (ده اللي المسير بيخصمه)
  const on = await person('MOD-ABS-1')
  const created = await attendance.materializeAbsences(on.id, from, to)
  assert.ok(created >= 8, 'أيام شغل في آخر 15 يوم من غير بصمة = غياب: ' + created)
  assert.ok((await rows(on)).every(([, status]) => status === 'absent'))

  // الحضور مقفول (ومعاه الورديات والإضافي): نفس النداء مابيولّدش ولا صف — مفيش بصمات بتتجمع فمفيش غياب
  for (const key of ['shifts', 'overtime', 'attendance']) await modules.setModule(admin(), key, { enabled: false })
  const off = await person('MOD-ABS-2')
  assert.equal(await attendance.materializeAbsences(off.id, from, to), 0)
  assert.deepEqual(await rows(off), [])
  // والمحفوظ من قبل القفل زي ما هو (مابيتمسحش ولا بيتغيّر)
  const before = await rows(on)
  await attendance.materializeAbsences(on.id, from, to)
  assert.deepEqual(await rows(on), before)
  // نفس الحكم لنداء اليوم الواحد (ده اللي تراكم المسير وإعادة الحساب بعد تعديل عطلة بينادوه)
  const single = await attendance.computeDay(off.id, daysAgo(3), false)
  assert.equal(single.status, 'present'); assert.deepEqual(await rows(off), [])
  assert.deepEqual([await modules.wasOffOn('attendance', daysAgo(40)), await modules.wasOffOn('attendance', to)], [true, true], 'مقفول دلوقتي = أي يوم')

  // القفل كان من 5 أيام واتفتح النهارده: أيام القفل (من يوم القفل ليوم الفتح) مابتتحسبش غياب في اللحاق، واللي قبلها بتتحسب
  await repo('SystemModuleEvent').update({ kind: 'module', key: 'attendance', enabled: false }, { at: new Date(Date.now() - 5 * 86400000) })
  for (const key of ['attendance', 'shifts', 'overtime']) await modules.setModule(admin(), key, { enabled: true })
  const offStart = daysAgo(5)
  assert.deepEqual([await modules.wasOffOn('attendance', daysAgo(6)), await modules.wasOffOn('attendance', offStart), await modules.wasOffOn('attendance', to)], [false, true, true])
  const back = await person('MOD-ABS-3')
  const later = await attendance.materializeAbsences(back.id, from, to)
  const backRows = await rows(back)
  assert.ok(later >= 3 && backRows.length === later, JSON.stringify(backRows))
  assert.ok(backRows.every(([date, status]) => status === 'absent' && date < offStart), 'ولا يوم من أيام القفل اتسجّل غياب: ' + JSON.stringify(backRows))
  // والأيام دي تفضل من غير غياب حتى بعد ما سجل الفتح والقفل يتقري من جديد
  modules.invalidate()
  assert.equal(await attendance.materializeAbsences(back.id, offStart, to), 0)
  await repo('AttendanceDay').delete({ employeeId: In([on.id, off.id, back.id]) })
  await clearRows(); await repo('SystemModuleEvent').clear(); modules.invalidate()
})

test('ME-12: وراثة الجمهور، ومسارات الورديات جوه كنترولر الحضور والكتالوج، والطلب المُرجَع والموديول مقفول', async () => {
  await clearRows()
  // الجمهور بينزل على اللي بيعتمد على الموديول: برّه جمهور الحضور = برّه الورديات والإضافي كمان
  await modules.setModule(admin(), 'attendance', { audience: { mode: 'all', where: { mode: 'branches', ids: [B.cairo.id] } } })
  const cairo = (await enabledFor(U.cairo)).modules, alex = (await enabledFor(U.alex)).modules
  for (const key of ['attendance', 'shifts', 'overtime']) { assert.ok(cairo.includes(key), key); assert.ok(!alex.includes(key), key + ' برّه الجمهور') }
  assert.ok(alex.includes('leave') && alex.includes('payroll'), 'اللي مابيعتمدش على الحضور زي ما هو')
  ok(await request(U.cairo, 'GET', '/attendance/my-today'))
  gone(await request(U.alex, 'GET', '/attendance/my-today'), 'GET', '/attendance/my-today')
  await clearRows()

  // الورديات مقفولة والحضور مفعّل: مسارات الورديات جوه كنترولر الحضور وكتالوجها وتاريخ تعريفها 404، وباقي الحضور والكتالوجات شغال
  await modules.setModule(admin(), 'shifts', { enabled: false })
  const week = isoDate(new Date())
  gone(await request(admin(), 'GET', `/attendance/schedule?weekStart=${week}`), 'GET', `/attendance/schedule?weekStart=${week}`)
  gone(await request(admin(), 'GET', '/catalogs/shifts'), 'GET', '/catalogs/shifts')
  gone(await request(admin(), 'GET', '/attendance-rules/SHIFT/1/history'), 'GET', '/attendance-rules/SHIFT/1/history')
  ok(await request(U.cairo, 'GET', '/attendance/my-today'))
  ok(await request(admin(), 'GET', '/catalogs/holidays'))
  const scheduleHistory = await request(admin(), 'GET', '/attendance-rules/WORK_SCHEDULE/999999/history')
  assert.notEqual(scheduleHistory.body?.message, 'Cannot GET /api/attendance-rules/WORK_SCHEDULE/999999/history', 'تاريخ جدول أيام العمل أساسي: الرد من الخدمة')
  await clearRows()

  // طلب اترجّع لصاحبه وبعدين موديوله اتقفل: بيتقدّم تاني ويكمّل اعتماده، وطلب جديد من نفس النوع مرفوض
  const day = daysAgo(-9)
  const returned = ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: day, toDate: day } }), 201)
  ok(await request(U.hr, 'POST', `/requests/${returned.id}/act`, { action: 'RETURN', comment: 'وضّح مكان الشغل' }), 201)
  assert.equal((await repo('Request').findOneByOrFail({ id: returned.id })).status, 'RETURNED_FOR_INFO')
  await setRow('attendance', false)
  assert.equal((await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: day, toDate: day } })).status, 404)
  assert.equal(ok(await request(U.cairo, 'POST', `/requests/${returned.id}/resubmit`, { payload: { fromDate: day, toDate: day, note: 'من البيت' } }), 201).status, 'UNDER_REVIEW')
  ok(await request(U.hr, 'POST', `/requests/${returned.id}/act`, { action: 'APPROVE' }), 201)
  assert.equal((await repo('Request').findOneByOrFail({ id: returned.id })).status, 'COMPLETED')
  await clearRows()
})

test('ME-10: مسارات الأساس اللي بتجمّع بيانات موديولات اختيارية — جزء الموديول المقفول بيرجع فاضي، والمسار شغال', async () => {
  await clearRows()
  // موظف عليه من كل موديول: إجازة معتمدة، وعهدة، وسلفة، وحضور امبارح
  const leave = await repo('Leave').save({ employeeId: E.alex.id, leaveTypeCode: 'ANNUAL', fromDate: isoDate(new Date()), toDate: isoDate(new Date()), days: 1, period: 'FULL', status: 'APPROVED' })
  const asset = await repo('Asset').save({ name: 'لابتوب اختبار الموديولات', category: 'أجهزة' })
  const custody = await repo('CustodyAssignment').save({ assetId: asset.id, employeeId: E.alex.id, status: 'ACTIVE' })
  const loan = await repo('Loan').save({ employeeId: E.alex.id, amount: 1500, status: 'DISBURSED' })
  await repo('AttendanceDay').save({ employeeId: E.alex.id, branchId: B.alex.id, date: isoDate(new Date()), status: 'late', checkIn: '09:30', checkOut: null,
    shiftName: 'وردية اختبار', shiftStart: '09:00', shiftEnd: '17:00', scheduleSource: 'override', lateMinutes: 30, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 0 })
  await repo('PayrollRun').save({ name: 'مسير اختبار الموديولات', scopeType: 'COMPANY', period: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'APPROVED', totalNet: 12345.67 })
  const profileOf = async () => ok(await request(admin(), 'GET', `/employees/${E.alex.id}/profile`))
  // (الأرصدة بتتقفل مع الإجازات بنفس الشرط؛ الموظف ده مالوش أرصدة في القاعدة دي فمابتتفحصش هنا)
  const shape = body => [body.leaves.map(row => row.id), body.custody.map(row => row.id), body.loans.map(row => row.id)]

  // كله مفعّل: الملف بيرجّع الأربعة
  let profile = await profileOf()
  assert.deepEqual(shape(profile), [[leave.id], [custody.id], [loan.id]])
  assert.equal(profile.employee.id, E.alex.id)

  // الإجازات مقفولة: الإجازات والأرصدة فاضيين، والباقي زي ما هو
  await setRow('leave', false)
  assert.deepEqual(shape(await profileOf()), [[], [custody.id], [loan.id]])
  // العهد مقفولة كمان
  await setRow('custody', false)
  assert.deepEqual(shape(await profileOf()), [[], [], [loan.id]])
  // السلف مقفولة كمان: الملف لسه شغال ببيانات الموظف والسجل والمستندات
  await setRow('loans', false)
  profile = await profileOf()
  assert.deepEqual(shape(profile), [[], [], []])
  assert.equal(profile.employee.id, E.alex.id); assert.ok(Array.isArray(profile.history) && Array.isArray(profile.documents))
  // وصاحب الملف نفسه بياخد نفس الشكل
  assert.deepEqual(shape(ok(await request(U.alex, 'GET', `/employees/${E.alex.id}/profile`))), [[], [], []])
  await clearRows()
  assert.deepEqual(shape(await profileOf()), [[leave.id], [custody.id], [loan.id]], 'الفتح بيرجّع البيانات زي ما هي (مفيش حاجة اتمسحت)')

  // لوحة التحكم: الأرقام العامة أساسية، وأرقام الحضور والإجازات والمسيرات من موديولاتها
  let stats = ok(await request(admin(), 'GET', '/dashboard/stats'))
  assert.ok(stats.attendanceToday.late >= 1 && stats.onLeaveToday >= 1, JSON.stringify(stats))
  assert.deepEqual(stats.payrollRuns.map(row => Number(row.totalNet)), [12345.67])
  ok(await request(admin(), 'GET', '/dashboard/attendance-trend')); ok(await request(admin(), 'GET', '/dashboard/departments'))
  await setRow('leave', false)
  stats = ok(await request(admin(), 'GET', '/dashboard/stats'))
  assert.deepEqual([stats.onLeaveToday, stats.halfDayLeaveToday], [0, 0])
  assert.ok(stats.attendanceToday.late >= 1, 'أرقام الحضور زي ما هي والإجازات بس اللي مقفولة')
  await setRow('payroll', false)
  assert.deepEqual(ok(await request(admin(), 'GET', '/dashboard/stats')).payrollRuns, [])
  await setRow('attendance', false)
  stats = ok(await request(admin(), 'GET', '/dashboard/stats'))
  assert.deepEqual(stats.attendanceToday, { attended: 0, present: 0, late: 0, earlyLeave: 0, absent: 0 })
  assert.ok(stats.employees.total >= 3 && stats.org.branches >= 2, 'أرقام الموظفين والهيكل زي ما هي')
  // ويدجتات الحضور نفسها مسارات الحضور: 404 زي أي مسار للموديول
  gone(await request(admin(), 'GET', '/dashboard/attendance-trend'), 'GET', '/dashboard/attendance-trend')
  gone(await request(admin(), 'GET', '/dashboard/departments'), 'GET', '/dashboard/departments')
  await clearRows()

  // مراجعة سقف طلب سلفة مفتوح: تابعة لمحرك الطلبات، فبتفضل شغالة بعد قفل السلف (الطلب المفتوح بيكمّل اعتماده)
  await setRow('loans', false)
  gone(await request(admin(), 'GET', '/loans/mine'), 'GET', '/loans/mine')
  const review = await request(admin(), 'GET', '/loans/requests/999999/cap-review')
  assert.notDeepEqual(review.body, { message: 'Cannot GET /api/loans/requests/999999/cap-review', error: 'Not Found', statusCode: 404 }, 'المسار موجود: الرد من الخدمة مش من حارس الموديول')
  assert.match(String(review.body?.message ?? ''), /[\u0600-\u06FF]/, 'رسالة الخدمة العربية (طلب مش موجود)')
  await clearRows()
})

test('ME-09: قبل ترحيل 076 (الجداول مش موجودة) — كل حاجة شغالة على الافتراضي', async () => {
  assertDisposable()
  await modules.setModule(admin(), 'recruitment', { enabled: false })
  gone(await request(U.hr, 'GET', '/candidates'), 'GET', '/candidates')
  // قاعدة مؤقتة للاختبار بس: نشيل الجداول عشان نحاكي سيرفر نزل عليه الكود قبل الترحيل
  for (const table of ['system_module_events', 'system_module_features', 'system_modules']) await ds.query(`DROP TABLE [${table}]`)
  modules.invalidate()
  ok(await request(U.hr, 'GET', '/candidates'))
  ok(await request(U.cairo, 'GET', '/attendance/my-today'))
  assert.deepEqual(await enabledFor(U.cairo), { modules: registry.enabledSnapshot({ modules: {}, features: {} }).modules, features: [] })
  assert.ok(ok(await request(U.cairo, 'GET', '/requests/types')).some(type => type.code === 'REMOTE_WORK'))
  // شاشة الموديولات قبل الترحيل: القراية شغالة (الكتالوج على الافتراضي وسجل التغييرات فاضي)، والتغيير بيرفض برسالة واضحة مش خطأ خادم
  const catalog = ok(await request(admin(), 'GET', '/modules/catalog'))
  assert.ok(catalog.modules.every(row => row.enabled === registry.MODULES[row.key].defaultEnabled && row.effective === row.enabled), 'كل موديول على افتراضيه')
  assert.deepEqual(catalog.modules.filter(row => !row.enabled).map(row => row.key), ['announcements', 'manager', 'performance', 'training', 'helpdesk', 'cases', 'surveys', 'dependents', 'compensation', 'benefits', 'skills', 'safety', 'timesheets', 'integrations', 'ai', 'positions'], 'المقفول افتراضيًا: المضاف بعد نظام الموديولات — الإعلانات (B2.16) ولوحة فريقي (B2.14) والأداء (B3.6) والوظائف المعتمدة (B2.11)')
  assert.deepEqual(ok(await request(admin(), 'GET', '/modules/events')), [])
  ok(await request(admin(), 'GET', '/modules/recruitment/impact'))
  ok(await request(admin(), 'GET', '/modules/presets/standard/diff'))
  for (const [method, route, body] of [['PUT', '/modules/recruitment', { enabled: false }], ['PUT', `/modules/features/${registry.DEMO_SCREENS_FEATURE}`, { enabled: true }],
    ['POST', '/modules/presets/basic/apply', undefined]]) {
    const refusal = await request(admin(), method, route, body)
    assert.equal(refusal.status, 409, `${method} ${route}: ${JSON.stringify(refusal.body)}`)
    assert.match(refusal.body.message, /طبّق ترحيل 076 الأول/)
  }
  // والرفض ماغيّرش حاجة
  ok(await request(U.hr, 'GET', '/candidates'))
})
