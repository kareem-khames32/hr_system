'use strict'
// شاشة «الإعدادات ← الموديولات» (خطة التنفيذ B0.3) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_modules_settings_test_<16 hex>)،
// عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  MS-01) الصلاحية: settings.modules بس (لا settings.manage ولا غيرها)، ومدير النظام بس اللي يمنحها؛ والكتابة لحساب على مستوى الشركة.
//  MS-02) الكتالوج: كل الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات التلاتة.
//  MS-03) التفعيل والقفل من الشاشة: الأثر فوري على المسارات و/modules/enabled، والتغيير متسجّل باسم اللي عمله.
//  MS-04) الرفض: موديول معتمد عليه موديول مفعّل (409 برسالة تسمّيه)، وتفعيل من غير تبعيته (409)، والأساسي (400)، والمجهول (404)،
//         والجسم الغلط (400) — ومفيش حاجة بتتكتب.
//  MS-05) أثر القفل قبل القفل: عدد الطلبات المفتوحة من أنواع الموديول وبياناته الشغالة.
//  MS-06) الباقات: معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات.
//  MS-07) المزايا الفرعية وجمهور التفعيل من الشاشة.
//  MS-08) شاشة الأدوار: صلاحيات الموديول المقفول متعلّمة «موديولها مقفول»، والممنوحة منها بتفضل على الدور.
// Run (من api/): node --test test/modules-settings.integration.cjs
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

const database = `hr_modules_settings_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_modules_settings_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-modules-settings-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, modules, created = false
const B = {}, E = {}, U = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}),
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, pattern) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (pattern) assert.match([].concat(response.body?.message ?? []).join(' '), pattern)
}
const moduleOf = (catalog, key) => catalog.modules.find(row => row.key === key)
async function clearRows() {
  assertDisposable()
  for (const name of ['SystemModule', 'SystemModuleFeature', 'SystemModuleEvent']) await repo(name).clear()
  modules.invalidate()
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

  B.cairo = await repo('Branch').save({ code: 'MS-CAI', name: 'فرع القاهرة' })
  B.alex = await repo('Branch').save({ code: 'MS-ALX', name: 'فرع الإسكندرية' })
  E.cairo = await repo('Employee').save({ employeeCode: 'MS-001', fullName: 'كريم موظف القاهرة', branchId: B.cairo.id, status: 'active', isActive: true, joinDate: '2022-01-01' })
  E.alex = await repo('Employee').save({ employeeCode: 'MS-002', fullName: 'منى موظفة الإسكندرية', branchId: B.alex.id, status: 'active', isActive: true, joinDate: '2022-01-01' })
  const user = (email, displayName, role, branch, employeeId, permissions, extra = {}) => repo('User').save({ email, displayName, passwordHash: 'isolated-test-token-only', role,
    branchId: branch ? branch.id : null, employeeId, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin@modules-settings.test', 'مدير النظام', 'super_admin', null, null, ['*'])
  // معاه كل إعدادات النظام والأدوار — من غير settings.modules
  U.hr = await user('hr@modules-settings.test', 'مدير الموارد', 'hr_manager', null, null, ['settings.manage', 'roles.manage', 'users.manage', 'candidates.manage', 'approve.hr'], { scopeAllBranches: true })
  // معاه settings.modules: واحد على مستوى الشركة وواحد مقفول على فرع
  U.modulesAll = await user('modules-all@modules-settings.test', 'مسؤول الموديولات', 'employee', null, null, ['settings.modules'], { scopeAllBranches: true })
  U.modulesBranch = await user('modules-branch@modules-settings.test', 'مسؤول موديولات فرع', 'employee', B.cairo, null, ['settings.modules'])
  U.cairo = await user('cairo@modules-settings.test', 'كريم', 'employee', B.cairo, E.cairo.id, [])
  U.alex = await user('alex@modules-settings.test', 'منى', 'employee', B.alex, E.alex.id, [])

  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_HR', nameAr: 'اعتماد الموارد البشرية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'REMOTE_WORK', nameAr: 'عمل عن بُعد', category: 'time_attendance', destinationHandler: 'attendance_log', approvalChainId: chain.id,
    isActive: true, requiredFields: JSON.stringify(['fromDate', 'toDate']) })
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
  if (errors.length) throw new AggregateError(errors, 'modules settings fixture cleanup failed')
})

test('MS-01: الصلاحية — settings.modules بس، والكتابة لحساب على مستوى الشركة', async () => {
  const reads = ['/modules/catalog', '/modules/events', '/modules/presets/basic/diff', '/modules/recruitment/impact']
  for (const route of reads) {
    for (const user of [U.hr, U.cairo]) assert.equal((await request(user, 'GET', route)).status, 403, `${user.email} ${route}`)
    for (const user of [U.admin, U.modulesAll, U.modulesBranch]) ok(await request(user, 'GET', route))
  }
  const writes = [['PUT', '/modules/recruitment', { enabled: false }], ['PUT', '/modules/features/platform.demo_screens', { enabled: true }], ['POST', '/modules/presets/basic/apply', undefined]]
  for (const [method, route, body] of writes) {
    for (const user of [U.hr, U.cairo]) assert.equal((await request(user, method, route, body)).status, 403, `${user.email} ${route}`)
    // حساب مقفول على فرع معاه الصلاحية: يشوف بس — الموديول بيتفتح أو يتقفل لكل الشركة
    refused(await request(U.modulesBranch, method, route, body), 403, /لكل الشركة/)
  }
  assert.equal(await repo('SystemModule').count(), 0); assert.equal(await repo('SystemModuleFeature').count(), 0); assert.equal(await repo('SystemModuleEvent').count(), 0)
  // المفعّل للمستخدم نفسه مفتوح لأي حساب داخل
  ok(await request(U.cairo, 'GET', '/modules/enabled'))
  // الصلاحية في السجل، ومدير النظام بس اللي يمنحها
  const entry = ok(await request(U.admin, 'GET', '/permissions-registry')).find(row => row.key === 'settings.modules')
  assert.deepEqual([entry.group, entry.superAdminOnly, entry.moduleEnabled], ['settings', true, true])
  const role = await repo('Role').save({ code: 'ms_role', nameAr: 'دور اختبار الموديولات', permissions: '[]', isSystem: false, isActive: true })
  refused(await request(U.hr, 'PATCH', `/roles/${role.id}`, { permissions: ['settings.modules'] }), 403, /مدير النظام/)
  ok(await request(U.admin, 'PATCH', `/roles/${role.id}`, { permissions: ['settings.modules'] }))
})

test('MS-02: الكتالوج — الموديولات بمجموعاتها وحالتها وتبعياتها ومزاياها، والباقات', async () => {
  const catalog = ok(await request(U.admin, 'GET', '/modules/catalog'))
  assert.deepEqual(catalog.presets.map(row => [row.key, row.nameAr]), [['basic', 'الأساسية'], ['standard', 'القياسية'], ['full', 'الكاملة']])
  assert.deepEqual(catalog.modules.map(row => row.key), registry.MODULE_KEYS)
  for (const row of catalog.modules) {
    assert.ok(row.nameAr && row.description && registry.MODULE_GROUPS[row.group], row.key)
    // من غير صفوف كل موديول على افتراضيه: الموجود قبل نظام الموديولات مفعّل، والوظائف المعتمدة (B2.11) مقفولة
    const byDefault = registry.MODULES[row.key].defaultEnabled
    assert.deepEqual([row.enabled, row.effective, row.audience, row.enabledAt], [byDefault, byDefault, null, null], `${row.key}: من غير صفوف كل موديول على افتراضيه`)
  }
  // B2.7: +policies (السياسات والإقرار أساسي زي المهام)
  assert.deepEqual(catalog.modules.filter(row => row.core).map(row => row.key), ['platform', 'org', 'employees', 'self_service', 'requests', 'notifications', 'tasks', 'documents', 'policies', 'reports'])
  assert.deepEqual(moduleOf(catalog, 'shifts').dependsOn, ['attendance'])
  assert.deepEqual(moduleOf(catalog, 'loans').dependsOn, ['payroll'])
  assert.deepEqual(moduleOf(catalog, 'recruitment').preset, 'standard')
  assert.deepEqual(moduleOf(catalog, 'platform').features.map(row => [row.key, row.enabled]), [['platform.demo_screens', false]])
})

test('MS-03: التفعيل والقفل من الشاشة — الأثر فوري والتغيير متسجّل باسم اللي عمله', async () => {
  ok(await request(U.hr, 'GET', '/candidates'))
  const closed = ok(await request(U.modulesAll, 'PUT', '/modules/recruitment', { enabled: false }))
  assert.deepEqual([moduleOf(closed, 'recruitment').enabled, moduleOf(closed, 'recruitment').effective], [false, false])
  assert.ok(moduleOf(closed, 'recruitment').enabledAt)
  assert.equal((await request(U.hr, 'GET', '/candidates')).status, 404)
  assert.ok(!ok(await request(U.cairo, 'GET', '/modules/enabled')).modules.includes('recruitment'))
  const opened = ok(await request(U.admin, 'PUT', '/modules/recruitment', { enabled: true }))
  assert.equal(moduleOf(opened, 'recruitment').effective, true)
  ok(await request(U.hr, 'GET', '/candidates'))
  const events = ok(await request(U.admin, 'GET', '/modules/events'))
  assert.deepEqual(events.map(row => [row.kind, row.key, row.nameAr, row.enabled, row.byName]),
    [['module', 'recruitment', 'التوظيف', true, 'مدير النظام'], ['module', 'recruitment', 'التوظيف', false, 'مسؤول الموديولات']])
  assert.ok(events.every(row => row.at && !('byUserId' in row)))
  await clearRows()
})

test('MS-04: الرفض — تبعيات وأساسي ومجهول وجسم غلط، ومفيش حاجة بتتكتب', async () => {
  refused(await request(U.admin, 'PUT', '/modules/attendance', { enabled: false }), 409, /اقفل .*الأول/)
  refused(await request(U.admin, 'PUT', '/modules/payroll', { enabled: false }), 409, /«السلف والالتزامات»/)
  refused(await request(U.admin, 'PUT', '/modules/employees', { enabled: false }), 400, /أساسي ومايتقفلش/)
  refused(await request(U.admin, 'PUT', '/modules/platform', { audience: { mode: 'roles', ids: ['hr_manager'] } }), 400, /أساسي/)
  refused(await request(U.admin, 'PUT', '/modules/no_such', { enabled: false }), 404, /الموديول غير موجود/)
  refused(await request(U.admin, 'PUT', '/modules/features/no.such', { enabled: true }), 404, /الميزة غير موجودة/)
  refused(await request(U.admin, 'GET', '/modules/no_such/impact'), 404)
  refused(await request(U.admin, 'GET', '/modules/presets/platinum/diff'), 404, /الباقة غير موجودة/)
  refused(await request(U.admin, 'POST', '/modules/presets/platinum/apply'), 404)
  for (const body of [{ enabled: 'yes' }, { enabled: 1 }, { audience: 'all' }, { audience: ['x'] }]) refused(await request(U.admin, 'PUT', '/modules/custody', body), 400)
  refused(await request(U.admin, 'PUT', '/modules/features/platform.demo_screens', {}), 400)
  refused(await request(U.admin, 'PUT', '/modules/custody', { audience: { mode: 'nobody' } }), 400, /مين/)
  assert.equal(await repo('SystemModule').count(), 0); assert.equal(await repo('SystemModuleEvent').count(), 0)
  // بالترتيب الصح بيعدّي، وتفعيل اللي بيعتمد والحضور مقفول مرفوض
  ok(await request(U.admin, 'PUT', '/modules/shifts', { enabled: false }))
  ok(await request(U.admin, 'PUT', '/modules/overtime', { enabled: false }))
  ok(await request(U.admin, 'PUT', '/modules/attendance', { enabled: false }))
  refused(await request(U.admin, 'PUT', '/modules/shifts', { enabled: true }), 409, /فعّل «الحضور والبصمة» الأول/)
  await clearRows()
})

test('MS-05: أثر القفل قبل القفل — الطلبات المفتوحة والبيانات الشغالة', async () => {
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/attendance/impact')), { key: 'attendance', nameAr: 'الحضور والبصمة', openRequests: 0, items: [],
    notes: ['من يوم القفل المسير مش هيحسب غياب ولا تأخير: مفيش بصمات بتتجمع. والأيام دي مش هتتحسب غياب بعد ما الموديول يتفتح تاني.'] })
  const day = new Date(); day.setDate(day.getDate() + 3)
  const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: iso, toDate: iso } }), 201)
  ok(await request(U.alex, 'POST', '/requests', { typeCode: 'REMOTE_WORK', submit: true, payload: { fromDate: iso, toDate: iso } }), 201)
  // المسودة مش طلب مفتوح
  ok(await request(U.cairo, 'POST', '/requests', { typeCode: 'REMOTE_WORK', payload: { fromDate: iso, toDate: iso } }), 201)
  await repo('BiometricDevice').save({ name: 'جهاز المدخل', serialNumber: 'MS-DEVICE-1', ip: '10.0.0.9', port: 4370, isActive: true, branchId: B.cairo.id })
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/attendance/impact')),
    { key: 'attendance', nameAr: 'الحضور والبصمة', openRequests: 2, items: [{ label: 'أجهزة بصمة مفعّلة', count: 1 }],
      notes: ['من يوم القفل المسير مش هيحسب غياب ولا تأخير: مفيش بصمات بتتجمع. والأيام دي مش هتتحسب غياب بعد ما الموديول يتفتح تاني.'] })
  // موديول من غير ملاحظة خاصة: قايمة فاضية؛ والعهد بتقول إن طلب العهدة المعتمد هيستنى
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/recruitment/impact')).notes, [])
  assert.match(ok(await request(U.admin, 'GET', '/modules/custody/impact')).notes[0], /هيستنى لحد ما الموديول يتفتح تاني/)
  await repo('Candidate').save([{ fullName: 'مرشح أول', positionTitle: 'محاسب', stage: 'interview', branchId: B.cairo.id },
    { fullName: 'مرشح اتعيّن', positionTitle: 'محاسب', stage: 'hired', branchId: B.cairo.id }])
  assert.deepEqual(ok(await request(U.modulesAll, 'GET', '/modules/recruitment/impact')).items, [{ label: 'مرشحين في المسار', count: 1 }])
  // الأثر قراءة بس
  assert.equal(await repo('SystemModule').count(), 0)
})

test('MS-06: الباقات — معاينة الفرق من غير كتابة، والتطبيق، وسجل التغييرات', async () => {
  // الأساسية فيها «لوحة فريقي» (B2.14) المقفولة افتراضيًا: تطبيقها بيفعّلها
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/presets/basic/diff')),
    { preset: 'basic', nameAr: 'الأساسية', enable: [{ key: 'announcements', nameAr: 'الإعلانات' }, { key: 'manager', nameAr: 'لوحة «فريقي»' }], disable: [{ key: 'recruitment', nameAr: 'التوظيف' }] })
  // القياسية فيها الوظائف المعتمدة (المقفولة افتراضيًا) ومعاها كل الأساسية: تطبيقها بيفعّلهم
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/presets/standard/diff')),
    { preset: 'standard', nameAr: 'القياسية', enable: [{ key: 'announcements', nameAr: 'الإعلانات' }, { key: 'manager', nameAr: 'لوحة «فريقي»' }, { key: 'performance', nameAr: 'إدارة الأداء' }, { key: 'training', nameAr: 'التدريب' }, { key: 'helpdesk', nameAr: 'مركز الخدمات' }, { key: 'cases', nameAr: 'الشكاوى والتحقيقات' }, { key: 'positions', nameAr: 'الوظائف المعتمدة' }], disable: [] })
  assert.equal(await repo('SystemModule').count(), 0, 'المعاينة مابتكتبش')
  const applied = ok(await request(U.modulesAll, 'POST', '/modules/presets/basic/apply'), 201)
  assert.deepEqual(applied.applied, { preset: 'basic', nameAr: 'الأساسية', enable: [{ key: 'announcements', nameAr: 'الإعلانات' }, { key: 'manager', nameAr: 'لوحة «فريقي»' }], disable: [{ key: 'recruitment', nameAr: 'التوظيف' }] })
  assert.equal(moduleOf(applied.catalog, 'manager').enabled, true)
  assert.equal(moduleOf(applied.catalog, 'recruitment').enabled, false)
  assert.equal((await request(U.hr, 'GET', '/candidates')).status, 404)
  // صف صريح لكل موديول اختياري بعد التطبيق
  const optional = registry.MODULE_KEYS.filter(key => !registry.MODULES[key].core)
  assert.deepEqual((await repo('SystemModule').find()).map(row => row.key).sort(), [...optional].sort())
  // الحدث للي اتغيّر بس، ومعاه حدث الباقة
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/events')).map(row => [row.kind, row.key, row.enabled]).sort((a, b) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`)),
    [['module', 'announcements', true], ['module', 'manager', true], ['module', 'recruitment', false], ['preset', 'basic', null]])
  // تطبيق نفس الباقة تاني: مفيش تغيير ولا أحداث موديولات
  assert.deepEqual(ok(await request(U.admin, 'POST', '/modules/presets/basic/apply'), 201).applied, { preset: 'basic', nameAr: 'الأساسية', enable: [], disable: [] })
  assert.equal(await repo('SystemModuleEvent').count({ where: { kind: 'module' } }), 3)
  const standard = ok(await request(U.admin, 'POST', '/modules/presets/standard/apply'), 201)
  // B3.6: + موديول الأداء (قياسية، مقفول افتراضيًا)
  assert.deepEqual(standard.applied.enable, [{ key: 'recruitment', nameAr: 'التوظيف' }, { key: 'performance', nameAr: 'إدارة الأداء' }, { key: 'training', nameAr: 'التدريب' }, { key: 'helpdesk', nameAr: 'مركز الخدمات' }, { key: 'cases', nameAr: 'الشكاوى والتحقيقات' }, { key: 'positions', nameAr: 'الوظائف المعتمدة' }])
  ok(await request(U.hr, 'GET', '/candidates'))
  await clearRows()
})

test('MS-07: المزايا الفرعية وجمهور التفعيل من الشاشة', async () => {
  const on = ok(await request(U.admin, 'PUT', '/modules/features/platform.demo_screens', { enabled: true }))
  assert.equal(moduleOf(on, 'platform').features[0].enabled, true)
  assert.deepEqual(ok(await request(U.cairo, 'GET', '/modules/enabled')).features, ['platform.demo_screens'])
  ok(await request(U.admin, 'PUT', '/modules/features/platform.demo_screens', { enabled: false }))
  assert.deepEqual(ok(await request(U.cairo, 'GET', '/modules/enabled')).features, [])

  const scoped = ok(await request(U.admin, 'PUT', '/modules/custody', { audience: { mode: 'all', where: { mode: 'branches', ids: [B.cairo.id] } } }))
  assert.deepEqual(moduleOf(scoped, 'custody').audience, { mode: 'all', ids: [], where: { mode: 'branches', ids: [B.cairo.id] } })
  assert.equal(moduleOf(scoped, 'custody').enabled, true, 'الجمهور لوحده مابيقفلش الموديول')
  ok(await request(U.cairo, 'GET', '/custody/mine'))
  assert.equal((await request(U.alex, 'GET', '/custody/mine')).status, 404)
  assert.ok(!ok(await request(U.alex, 'GET', '/modules/enabled')).modules.includes('custody'))
  // تغيير الجمهور مع الحالة في نداء واحد، ومسحه بـnull
  const cleared = ok(await request(U.admin, 'PUT', '/modules/custody', { audience: null }))
  assert.equal(moduleOf(cleared, 'custody').audience, null)
  ok(await request(U.alex, 'GET', '/custody/mine'))
  // تغيير الجمهور لوحده حدث من غير حالة (enabled = null: «غيّر جمهور» مش «فعّل»)، ومابيغيّرش «مين فتح أو قفل وإمتى»
  const events = ok(await request(U.admin, 'GET', '/modules/events'))
  assert.deepEqual(events.map(row => [row.kind, row.key, row.enabled, row.audience?.where?.ids ?? null]),
    [['module', 'custody', null, null], ['module', 'custody', null, [B.cairo.id]], ['feature', 'platform.demo_screens', false, null], ['feature', 'platform.demo_screens', true, null]])
  // طلب من غير تغيير: لا حدث ولا كتابة
  const untouched = await repo('SystemModule').findOneByOrFail({ key: 'custody' })
  ok(await request(U.admin, 'PUT', '/modules/custody', {}))
  assert.equal(ok(await request(U.admin, 'GET', '/modules/events')).length, events.length)
  // قفل حقيقي بيتسجّل بحالته ووقته، وتغيير الجمهور بعده مابيلمسش الوقت ده
  ok(await request(U.admin, 'PUT', '/modules/custody', { enabled: false }))
  const closedRow = await repo('SystemModule').findOneByOrFail({ key: 'custody' })
  assert.ok(new Date(closedRow.enabledAt) >= new Date(untouched.enabledAt))
  ok(await request(U.admin, 'PUT', '/modules/custody', { audience: { mode: 'roles', ids: ['hr_manager'] } }))
  const audienceRow = await repo('SystemModule').findOneByOrFail({ key: 'custody' })
  assert.deepEqual([audienceRow.enabled, new Date(audienceRow.enabledAt).getTime()], [false, new Date(closedRow.enabledAt).getTime()])
  assert.deepEqual(ok(await request(U.admin, 'GET', '/modules/events')).slice(0, 2).map(row => [row.kind, row.key, row.enabled]), [['module', 'custody', null], ['module', 'custody', false]])
  await clearRows()
})

test('MS-08: شاشة الأدوار — صلاحيات الموديول المقفول متعلّمة، والممنوحة منها بتفضل على الدور', async () => {
  const role = await repo('Role').save({ code: 'ms_recruiter', nameAr: 'مسؤول توظيف', permissions: JSON.stringify(['candidates.manage', 'employees.view']), isSystem: false, isActive: true })
  const flags = async () => Object.fromEntries(ok(await request(U.admin, 'GET', '/permissions-registry')).map(row => [row.key, row.moduleEnabled]))
  let enabled = await flags()
  // صلاحيات الموديولات المقفولة افتراضيًا (الوظائف المعتمدة، والإعلانات — B2.16) متعلّمة من الأول؛ والباقي موديولاته مفعّلة
  assert.deepEqual(Object.keys(enabled).filter(key => !enabled[key]).sort(), ['announcements.manage', 'cases.investigate', 'cases.penalties', 'helpdesk.manage', 'performance.calibrate', 'performance.manage', 'positions.manage', 'positions.view', 'training.manage'], 'كل الموديولات مفعّلة غير المقفول افتراضيًا')
  ok(await request(U.admin, 'PUT', '/modules/recruitment', { enabled: false }))
  ok(await request(U.admin, 'PUT', '/modules/loans', { enabled: false }))
  enabled = await flags()
  assert.deepEqual(Object.keys(enabled).filter(key => !enabled[key]).sort(),
    // B1.8: loans.disburse (تسجيل صرف السلفة) من صلاحيات موديول السلف
    // B2.11: + صلاحيتي الوظائف المعتمدة (موديولها مقفول افتراضيًا)؛ B2.16: + إدارة الإعلانات
    ['announcements.manage', 'candidates.approve_offers', 'candidates.manage', 'cases.investigate', 'cases.penalties', 'helpdesk.manage', 'loans.cap_override', 'loans.disburse', 'loans.exceptional', 'loans.policies', 'loans.repay', 'loans.write_off', 'performance.calibrate', 'performance.manage', 'positions.manage', 'positions.view', 'training.manage'])
  // الدور لسه شايل الصلاحية، وتعديله بنفس القايمة بيعدّي (الصلاحية محفوظة ومالهاش أثر)
  ok(await request(U.admin, 'PATCH', `/roles/${role.id}`, { permissions: ['employees.view', 'candidates.manage'] }))
  assert.deepEqual(JSON.parse((await repo('Role').findOneByOrFail({ id: role.id })).permissions).sort(), ['candidates.manage', 'employees.view'])
  assert.equal((await request(U.hr, 'GET', '/candidates')).status, 404, 'الصلاحية موجودة والموديول مقفول = 404')
  ok(await request(U.admin, 'PUT', '/modules/recruitment', { enabled: true }))
  ok(await request(U.hr, 'GET', '/candidates'))
  await clearRows()
  // صلاحية تابعة لموديول اختياري ومسار أساسي بيطلبها بتفضل ظاهرة: تعديل الراتب في ملف الموظف (payroll.approve)، وقواعد جدول الدوام (attendance.manage)
  for (const key of ['loans', 'payroll', 'shifts', 'overtime', 'attendance']) ok(await request(U.admin, 'PUT', `/modules/${key}`, { enabled: false }))
  enabled = await flags()
  assert.deepEqual([enabled['payroll.approve'], enabled['attendance.manage']], [true, true])
  assert.deepEqual([enabled['payroll.view'], enabled['payroll.calculate'], enabled['attendance.view_all'], enabled['overtime.confirm']], [false, false, false, false])
  await clearRows()
})
