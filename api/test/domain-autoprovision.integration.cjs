'use strict'
// حساب الدخول من الدومين للموظف الواحد — على قاعدة SQL مؤقتة تُحذف في النهاية. الحد الخارجي الوحيد
// المزيّف هو الدليل (listUsers)، وكل الباقي حقيقي (Nest + TypeORM + HTTP).
// **مفيش أي اتصال LDAP حقيقي**: باني العميل (client) مستبدل برمي استثناء، فأي محاولة اتصال بتفشّل
// الاختبار بصوت عالي بدل ما تخرج للشبكة — وفيه اختبار بيتأكد من ده بنفسه (NOLDAP).
//
// اللي بيتأكد هنا:
//   A) التزويد عند الإضافة: موظف موجود في AD بياخد حساب واحد بالظبط، واللي مش موجود يتحفظ بلا حساب وبسبب
//   B) **ممنوع يوقّف الإضافة**: الدليل واقف / مش مضبوط / بطيء / بيرمي استثناء غريب = الموظف اتحفظ والرد 201
//   C) المفتاح: مقفول = مفيش نداء دليل خالص، ومفتوح تاني = التزويد رجع. والمفتاح مبذور في القاعدة عند الإقلاع
//   D) الزرّ لموظف واحد: بيعمل، بيربط حساب قائم، وبيقول كل سبب تخطّي بالاسم — والضغط تاني مابيغيّرش بايت
//   E) الحراسة: بلا توكن، بلا users.manage، وحساب مقفول على فرع — والزرّ شغّال والمفتاح مقفول
//   F) الكارت: مرتبط/مش مرتبط، دومين/عندنا، البريد والدور، وصلاحية القراءة وعزل الفرع، وبلا أي hash
// Run: node --test --test-concurrency=1 api/test/domain-autoprovision.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const { DOMAIN_AUTOPROVISION_CONFIG_KEY } = require('../src/auth/domain-provision')

const database = `hr_domain_autoprov_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-domain-autoprov-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwtService = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })

let app, ds, master, baseUrl, created = false
let DirectoryService, DirectoryAuthError, directoryService
let branchA, branchB, deptA, deptB
const U = {} // حسابات النظام بالاسم
const E = {} // موظفين مبذورين بالاسم
const AD = new Map() // sAMAccountName → حساب مجال مزيّف
// الدليل المزيّف: نمط الرد + عدّاد النداءات (عشان نتأكد إن المفتاح المقفول مابينديهوش خالص)
let listMode = 'ok'
let listCalls = 0

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_domain_autoprov_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = (name) => { assertDisposable(); return ds.getRepository(name) }

const token = (user) => jwtService.sign({
  sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
  scopeAllBranches: user.scopeAllBranches === true,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
})

async function http(user, method, route, body) {
  const response = await fetch(baseUrl + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
const expect = (r, status, note) => { assert.equal(r.status, status, `${note ?? ''} ${JSON.stringify(r.body)}`); return r.body }
const msg = (r) => { const v = r?.body?.message; return Array.isArray(v) ? v.join(' | ') : String(v ?? JSON.stringify(r?.body ?? '')) }
const isArabic = (text) => /[؀-ۿ]/.test(String(text))

const syncEmployee = (user, employeeId) => http(user, 'POST', `/users/domain-sync/employee/${employeeId}`)
const readCard = (user, employeeId) => http(user, 'GET', `/employees/${employeeId}/login-account`)
const setSwitch = (value) => ds.query('UPDATE dbo.requests_config SET value = @1 WHERE [key] = @0',
  [DOMAIN_AUTOPROVISION_CONFIG_KEY, value])

/** لقطة كل أعمدة المستخدمين اللي التزويد ممنوع يلمسها */
const snapshot = async () => (await ds.query(
  `SELECT id, email, passwordHash, displayName, role, branchId, employeeId, permissions, isActive,
          tokenVersion, mustChangePassword, passwordChangedAt, scopeAllBranches, domainObjectGuid
   FROM dbo.users ORDER BY id`
)).map((row) => JSON.stringify(row)).join('\n')
const countUsers = async () => (await ds.query('SELECT COUNT(*) n FROM dbo.users'))[0].n
const usersOf = (employeeId) => ds.query(
  `SELECT id, email, passwordHash, displayName, role, branchId, employeeId, permissions, isActive,
          mustChangePassword, passwordChangedAt, domainObjectGuid
   FROM dbo.users WHERE employeeId = @0 ORDER BY id`, [employeeId])

/** إضافة موظف من المسار الحقيقي (POST /employees) — الكود بيتولّد في الخادم */
const addEmployee = async (overrides = {}) => http(U.admin, 'POST', '/employees', {
  ...(await employeeRequiredFields(ds, branchA.id)),
  fullName: 'موظف جديد للتزويد', branchId: branchA.id, joinDate: '2026-01-01',
  basicSalary: 7000, currency: 'SAR', payMethod: 'cash', ...overrides,
})

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = (db) => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: db,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 180000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  // مفاتيح المجال والبريد مش مضبوطة في بيئة الاختبار عن قصد — المزيّف بيحل مكان الحد الخارجي بس
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test',
    JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  for (const key of ['AD_HOST', 'AD_ENABLED', 'AD_BASE_DN', 'AD_UPN_SUFFIX', 'AD_BIND_DN', 'AD_BIND_PASSWORD',
    'SMTP_HOST', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD']) delete process.env[key]

  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule,
    { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  // ===== الدليل المزيّف: مفيش اتصال حقيقي ممكن =====
  ;({ DirectoryAuthError } = require('../src/auth/directory.types'))
  ;({ DirectoryService } = require('../src/auth/directory.service'))
  directoryService = app.get(DirectoryService)
  directoryService.client = () => { throw new Error('الاختبار حاول يفتح اتصال LDAP حقيقي') }
  directoryService.isConfigured = () => true
  directoryService.listUsers = async () => {
    listCalls += 1
    if (listMode === 'unavailable') throw new DirectoryAuthError('DIRECTORY_UNAVAILABLE', 'fake: الدليل مش راد')
    if (listMode === 'notConfigured') throw new DirectoryAuthError('NOT_CONFIGURED', 'fake: إعداد المجال ناقص: AD_HOST')
    if (listMode === 'weird') throw new TypeError('fake: استثناء غريب خارج أنواع الدليل')
    if (listMode === 'slow') await new Promise((resolve) => setTimeout(resolve, 250))
    return [...AD.values()].map(({ password: _p, ...rest }) => ({ ...rest }))
  }

  // ===== بيانات =====
  branchA = await repo('Branch').save({ code: 'DAP_A', name: 'فرع التزويد أ' })
  branchB = await repo('Branch').save({ code: 'DAP_B', name: 'فرع التزويد ب' })
  deptA = await repo('Department').save({ name: 'قسم أ', branchId: branchA.id, isActive: true })
  deptB = await repo('Department').save({ name: 'قسم ب', branchId: branchB.id, isActive: true })

  let n = 0
  const employee = async (overrides = {}) => {
    const i = ++n
    return repo('Employee').save({ employeeCode: `AP${String(i).padStart(3, '0')}`, fingerprintCode: null,
      fullName: `موظف تزويد ${i}`, branchId: branchA.id, departmentId: deptA.id, jobTitle: 'محاسب',
      joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
      workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true,
      payMethod: 'transfer', ...overrides })
  }

  // موظفين مبذورين لسيناريوهات الزرّ (الغموض والتكرار مايتعملوش من المسار العادي — الفرادة بترفضهم)
  E.button = await employee({ fullName: 'بدر — الزرّ بيعمل له حساب', fingerprintCode: '3001' })      // AP001
  E.hasUser = await employee({ fullName: 'سعيد — له حساب قبل كده', fingerprintCode: '3002' })         // AP002
  E.ambigA = await employee({ fullName: 'غامض أ', fingerprintCode: '3003' })                          // AP003
  E.ambigB = await employee({ fullName: 'غامض ب', fingerprintCode: '03003' })                         // AP004
  E.adOff = await employee({ fullName: 'ياسر — حسابه متوقف في المجال', fingerprintCode: '3005' })     // AP005
  E.archived = await employee({ fullName: 'فهد — أرشيف', status: 'archived', archivedAt: new Date(),
    isActive: false, fingerprintCode: '3006' })                                                        // AP006
  E.inactive = await employee({ fullName: 'نورة — غير نشطة', isActive: false, fingerprintCode: '3007' }) // AP007
  E.mailTaken = await employee({ fullName: 'عادل — بريده محجوز', fingerprintCode: '3008',
    email: 'taken1@maharah.local' })                                                                   // AP008
  E.guidTaken = await employee({ fullName: 'ماهر — حسابه مربوط بمجال تاني', fingerprintCode: '3009' }) // AP009
  E.userOff = await employee({ fullName: 'هالة — حسابها معطّل عندنا', fingerprintCode: '3010' })       // AP010
  E.machine = await employee({ fullName: 'وسام — حساب جهاز باسمه', fingerprintCode: '3011' })          // AP011
  E.noAccount = await employee({ fullName: 'سلوى — مفيش حساب ولا مجال', fingerprintCode: '3012' })     // AP012
  E.otherBranch = await employee({ fullName: 'ريم — فرع تاني', branchId: branchB.id,
    departmentId: deptB.id, fingerprintCode: '3013' })                                                 // AP013
  E.viewerSelf = await employee({ fullName: 'حساب المشاهد نفسه', fingerprintCode: '3014' })            // AP014

  // ===== حسابات النظام =====
  const mk = async (fields) => repo('User').save({ permissions: JSON.stringify([]), ...fields })
  U.admin = await mk({ email: 'admin@dap.invalid', displayName: 'مدير النظام',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), role: 'super_admin',
    branchId: null, passwordChangedAt: new Date() })
  // معاه users.manage لكن مقفول على فرع → الزرّ مرفوض (المزامنة بتلمس كل الفروع)
  U.branchHr = await mk({ email: 'hr-branch@dap.invalid', displayName: 'مدير موارد بشرية على فرع',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), role: 'hr_manager',
    branchId: branchA.id, permissions: JSON.stringify(['users.manage', 'employees.view']) })
  // نفس الصلاحية بس نطاقه «كل الفروع» → مسموح
  U.wideHr = await mk({ email: 'hr-wide@dap.invalid', displayName: 'مدير موارد بشرية كل الفروع',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), role: 'hr_manager',
    branchId: branchA.id, scopeAllBranches: true, permissions: JSON.stringify(['users.manage', 'employees.view']) })
  // بيشوف الموظفين بس — الكارت يتقرا والزرّ مايظهرش ومرفوض من الخادم
  U.viewer = await mk({ email: 'viewer@dap.invalid', displayName: 'مشاهد موظفين',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), role: 'hr_manager',
    branchId: branchA.id, permissions: JSON.stringify(['employees.view']) })
  // موظف عادي بلا أي صلاحية — بس مربوط بموظف عشان يقرا كارت نفسه
  U.staff = await mk({ email: 'staff@dap.invalid', displayName: 'موظف عادي',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), role: 'employee',
    branchId: branchA.id, employeeId: E.viewerSelf.id })
  // حساب قائم لسعيد بلا ربط مجال → الزرّ بيربطه ومايغيّرش حاجة تانية
  U.saeedPassword = `T${crypto.randomBytes(9).toString('base64url')}9`
  U.saeed = await mk({ email: 'saeed.old@maharah.local', displayName: 'سعيد — الاسم القديم',
    passwordHash: await bcrypt.hash(U.saeedPassword, 10), role: 'branch_manager', branchId: branchA.id,
    employeeId: E.hasUser.id, permissions: JSON.stringify(['finance']), passwordChangedAt: new Date() })
  // حساب ماهر مربوط بحساب مجال **تاني** → تعارض يتقال ومايتكتبش فوقه
  U.maher = await mk({ email: 'maher@maharah.local', displayName: 'ماهر', role: 'employee',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), branchId: branchA.id,
    employeeId: E.guidTaken.id, domainObjectGuid: 'bbbbbbbb-0000-0000-0000-00000000bbbb' })
  // حساب هالة معطّل → مابنلمسوش (نفس قاعدة الدخول)
  U.hala = await mk({ email: 'hala@maharah.local', displayName: 'هالة', role: 'employee',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), branchId: branchA.id,
    employeeId: E.userOff.id, isActive: false })
  // عنوانين محجوزين لحسابات مالهاش علاقة بعادل → كل مرشّحاته محجوزة
  U.busy1 = await mk({ email: 'taken1@maharah.local', displayName: 'حساب حاجز 1', role: 'employee',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), branchId: branchA.id })
  U.busy2 = await mk({ email: 'taken2@maharah.local', displayName: 'حساب حاجز 2', role: 'employee',
    passwordHash: await bcrypt.hash(crypto.randomBytes(12).toString('base64url'), 10), branchId: branchA.id })

  // ===== الدليل المزيّف: حساب لكل سيناريو =====
  const account = (sam, fields) => AD.set(sam, { objectGuid: `guid-${sam}`, sAMAccountName: sam,
    userPrincipalName: `${sam}@maharah.local`, mail: null, displayName: null, employeeId: null,
    disabled: false, objectClasses: ['top', 'person', 'organizationalPerson', 'user'],
    password: `T${crypto.randomBytes(9).toString('base64url')}9`, ...fields })

  account('btn-create', { employeeId: '3001', mail: 'badr@maharah.pro', displayName: 'بدر من الدليل' })
  account('btn-link', { employeeId: '3002', mail: 'saeed@maharah.pro', displayName: 'سعيد من الدليل' })
  account('btn-ambiguous', { employeeId: '3003', mail: 'ambig@maharah.pro' })
  account('btn-adoff', { employeeId: '3005', mail: 'yasser@maharah.pro', disabled: true })
  account('btn-archived', { employeeId: '3006', mail: 'fahd@maharah.pro' })
  account('btn-inactive', { employeeId: '3007', mail: 'noura@maharah.pro' })
  account('btn-mailtaken', { employeeId: '3008', mail: 'taken1@maharah.local',
    userPrincipalName: 'taken2@maharah.local' })
  account('btn-guidconflict', { employeeId: '3009', mail: 'maher@maharah.pro' })
  account('btn-useroff', { employeeId: '3010', mail: 'hala@maharah.pro' })
  account('MACHINE01$', { employeeId: '3011', mail: 'machine@maharah.pro' })
  // حسابات المسار التلقائي (إضافة موظف) — رقم البصمة هو اللي بنتحكم فيه، الكود بيتولّد في الخادم
  account('hire-ok', { employeeId: '7001', mail: 'newhire@maharah.pro', displayName: 'موظف جديد من الدليل' })
  account('hire-slow', { employeeId: '7002', mail: 'slowhire@maharah.pro', displayName: 'موظف بطيء من الدليل' })
  account('hire-switch', { employeeId: '7003', mail: 'switchhire@maharah.pro' })
  account('hire-again', { employeeId: '7004', mail: 'againhire@maharah.pro' })
}, { timeout: 300000 })

after(async (t) => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_domain_autoprov_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'domain autoprovision fixture cleanup failed')
})

// ============================================================================
// NOLDAP) مفيش اتصال حقيقي ممكن
// ============================================================================

test('NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي', async () => {
  assert.throws(() => directoryService.client(), /اتصال LDAP حقيقي/)
  // ولو حد شال المزيّف، التنفيذ الحقيقي بيوصل لباني العميل ويرمي — مفيش خروج صامت للشبكة
  const realListUsers = DirectoryService.prototype.listUsers
  const savedBindDn = directoryService.config.bindDn
  directoryService.config.bindDn = 'svc-fake@maharah.local'
  try {
    await assert.rejects(() => realListUsers.call(directoryService), /اتصال LDAP حقيقي/)
  } finally {
    directoryService.config.bindDn = savedBindDn
  }
})

// ============================================================================
// A) التزويد عند إضافة موظف
// ============================================================================

test('A1 — موظف جديد موجود في الدومين: حساب واحد بالظبط اتعمل واتربط، والرد بيقول كده', async () => {
  listMode = 'ok'
  const before = await countUsers()
  const callsBefore = listCalls
  const employee = expect(await addEmployee({ fullName: 'وليد الجديد', fingerprintCode: '7001' }), 201, 'إضافة:')
  assert.ok(employee.id)
  // الحقل الإضافي في الرد — بلا أي تغيير في الحقول القديمة
  const provision = employee.domainProvision
  assert.ok(provision, 'الرد لازم يقول اللي حصل')
  assert.equal(provision.outcome, 'created')
  assert.equal(provision.employeeId, employee.id)
  assert.equal(provision.sAMAccountName, 'hire-ok')
  assert.equal(provision.matchedVia, 'fingerprintCode')
  assert.ok(isArabic(provision.message), provision.message)
  assert.ok(isArabic(provision.matchedViaLabel), provision.matchedViaLabel)
  assert.equal(provision.directoryConfigured, true)
  assert.equal(listCalls, callsBefore + 1, 'نداء دليل واحد بالظبط')

  // حساب واحد بالظبط، بأقل دور، بفرع الموظف، بالربط الثابت، وبلا كلمة مرور قابلة للاستخدام
  assert.equal(await countUsers(), before + 1, 'حساب واحد ولا واحد زيادة')
  const rows = await usersOf(employee.id)
  assert.equal(rows.length, 1)
  const row = rows[0]
  assert.equal(row.id, provision.userId)
  assert.equal(row.email, 'newhire@maharah.pro')
  assert.equal(row.displayName, 'موظف جديد من الدليل')
  assert.equal(row.role, 'employee')
  assert.equal(row.permissions, null)
  assert.equal(row.branchId, branchA.id)
  assert.equal(row.isActive, true)
  assert.equal(row.mustChangePassword, false)
  assert.equal(row.domainObjectGuid, 'guid-hire-ok')
  assert.match(row.passwordHash, /^\$2[aby]\$/)
  assert.equal(row.passwordChangedAt, null, 'مفيش كلمة مرور اتعيّنت على النظام ده')
  // ومسار البريد+كلمة المرور مايفتحش الحساب ده بأي كلمة معروفة
  for (const guess of ['', 'password', row.email, 'guid-hire-ok', 'domain-only']) {
    assert.ok((await http(null, 'POST', '/auth/login', { email: row.email, password: guess })).status >= 400,
      'الحساب المجالي ممنوع يدخل بكلمة مرور')
  }
  E.hired = employee
})

test('A2 — موظف جديد مش في الدومين: اتحفظ عادي، مفيش حساب، والسبب عربي صريح', async () => {
  listMode = 'ok'
  const before = await countUsers()
  const employee = expect(await addEmployee({ fullName: 'جديد مش في المجال', fingerprintCode: '9990' }), 201)
  assert.equal(employee.domainProvision.outcome, 'noMatch')
  assert.ok(isArabic(employee.domainProvision.message), employee.domainProvision.message)
  assert.match(employee.domainProvision.message, /مفيش موظف مطابق|مفيش حساب مجال/)
  assert.equal(employee.domainProvision.userId, null)
  assert.equal((await usersOf(employee.id)).length, 0)
  assert.equal(await countUsers(), before, 'ممنوع أي حساب بلا مطابقة')
  // والموظف نفسه محفوظ فعلاً في القاعدة (مش رد بس)
  assert.ok(await repo('Employee').findOneBy({ id: employee.id }))
})

// ============================================================================
// B) ممنوع التزويد يوقّف إضافة الموظف
// ============================================================================

test('B1 — الدليل واقف أو مش مضبوط أو بيرمي استثناء غريب: الموظف اتحفظ والطلب ناجح', async () => {
  for (const [mode, label] of [['unavailable', 'الدليل مش راد'], ['notConfigured', 'إعداد ناقص'],
    ['weird', 'استثناء غريب']]) {
    listMode = mode
    const before = await countUsers()
    const employee = expect(await addEmployee({ fullName: `جديد وقت ${label}` }), 201, `${label}:`)
    assert.ok(await repo('Employee').findOneBy({ id: employee.id }), `${label}: الموظف لازم يتحفظ`)
    assert.equal(employee.domainProvision.outcome, 'directoryUnavailable', label)
    assert.ok(isArabic(employee.domainProvision.message), employee.domainProvision.message)
    assert.match(employee.domainProvision.message, /اتحفظ/, label)
    assert.equal(await countUsers(), before, `${label}: مفيش حساب اتعمل`)
  }
  listMode = 'ok'
})

test('B2 — الدليل بطيء: الإضافة بتنجح والحساب بيتعمل، ومفيش فشل ولا نصف عملية', async () => {
  listMode = 'slow'
  const started = Date.now()
  const employee = expect(await addEmployee({ fullName: 'جديد والدليل بطيء', fingerprintCode: '7002' }), 201, 'بطيء:')
  assert.ok(Date.now() - started >= 250, 'المزيّف المفروض يكون أخّر فعلاً')
  assert.equal(employee.domainProvision.outcome, 'created')
  const rows = await usersOf(employee.id)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].domainObjectGuid, 'guid-hire-slow')
  listMode = 'ok'
})

// ============================================================================
// C) المفتاح
// ============================================================================

test('C1 — المفتاح مبذور في القاعدة عند الإقلاع بقيمته الافتراضية (مفتوح) بلا أي ترحيل', async () => {
  const rows = await ds.query('SELECT [key], value FROM dbo.requests_config WHERE [key] = @0',
    [DOMAIN_AUTOPROVISION_CONFIG_KEY])
  assert.equal(rows.length, 1, 'المفتاح لازم يكون موجود بعد الإقلاع')
  assert.equal(rows[0].value, 'true')
})

test('C2 — المفتاح مقفول: مفيش تزويد ومفيش نداء دليل خالص، والموظف اتحفظ وبسبب واضح', async () => {
  await setSwitch('false')
  const before = await countUsers()
  const callsBefore = listCalls
  const employee = expect(await addEmployee({ fullName: 'جديد والمفتاح مقفول', fingerprintCode: '7003' }), 201)
  assert.equal(employee.domainProvision.outcome, 'switchedOff')
  assert.ok(isArabic(employee.domainProvision.message), employee.domainProvision.message)
  assert.match(employee.domainProvision.message, /مقفولة/)
  assert.equal(listCalls, callsBefore, 'المفتاح المقفول معناه مفيش نداء للدليل أصلاً')
  assert.equal(await countUsers(), before)
  assert.equal((await usersOf(employee.id)).length, 0)
  E.switchedOff = employee
})

test('C3 — الزرّ شغّال والمفتاح مقفول (ضغطة بإيد المالك على موظف بالاسم)', async () => {
  const result = expect(await syncEmployee(U.admin, E.switchedOff.id), 200, 'زرّ والمفتاح مقفول:')
  assert.equal(result.outcome, 'created')
  assert.equal(result.sAMAccountName, 'hire-switch')
  const rows = await usersOf(E.switchedOff.id)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].domainObjectGuid, 'guid-hire-switch')
})

test('C4 — فتح المفتاح تاني: التزويد التلقائي رجع في نفس اللحظة بلا إعادة تشغيل', async () => {
  await setSwitch('true')
  const employee = expect(await addEmployee({ fullName: 'جديد بعد فتح المفتاح', fingerprintCode: '7004' }), 201)
  assert.equal(employee.domainProvision.outcome, 'created')
  assert.equal(employee.domainProvision.sAMAccountName, 'hire-again')
  assert.equal((await usersOf(employee.id)).length, 1)
})

// ============================================================================
// D) زرّ الموظف الواحد
// ============================================================================

test('D1 — الزرّ بيعمل حساب للموظف المطابق، والضغط تاني مابيغيّرش ولا بايت', async () => {
  const before = await countUsers()
  const first = expect(await syncEmployee(U.admin, E.button.id), 200, 'أول ضغطة:')
  assert.equal(first.outcome, 'created')
  assert.equal(first.sAMAccountName, 'btn-create')
  assert.equal(first.email, 'badr@maharah.pro')
  assert.equal(await countUsers(), before + 1)
  const rows = await usersOf(E.button.id)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].domainObjectGuid, 'guid-btn-create')
  assert.equal(rows[0].role, 'employee')

  // الضغطة التانية والتالتة: مفيش أي عمود بيتغيّر، والرد بيقول «مربوط خلاص»
  const snapshotBefore = await snapshot()
  for (const attempt of ['تانية', 'تالتة']) {
    const again = expect(await syncEmployee(U.admin, E.button.id), 200, `ضغطة ${attempt}:`)
    assert.equal(again.outcome, 'alreadyLinked', attempt)
    assert.equal(again.reason, 'alreadyLinked')
    assert.ok(isArabic(again.message), again.message)
    assert.equal(again.userId, rows[0].id)
  }
  assert.equal(await snapshot(), snapshotBefore, 'الضغط تاني ممنوع يغيّر أي عمود')
})

test('D2 — الزرّ بيربط حساب قائم: العمود الناقص بس، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر', async () => {
  const before = await countUsers()
  const result = expect(await syncEmployee(U.admin, E.hasUser.id), 200, 'ربط:')
  assert.equal(result.outcome, 'linked')
  assert.equal(result.userId, U.saeed.id)
  assert.equal(await countUsers(), before, 'ممنوع حساب تاني للموظف')
  const rows = await usersOf(E.hasUser.id)
  assert.equal(rows.length, 1)
  const row = rows[0]
  assert.equal(row.domainObjectGuid, 'guid-btn-link', 'العمود الناقص بس اللي بيتملي')
  assert.equal(row.email, 'saeed.old@maharah.local', 'ممنوع بريد AD يكتب فوق بريد الحساب')
  assert.equal(row.displayName, 'سعيد — الاسم القديم')
  assert.equal(row.role, 'branch_manager', 'ممنوع الدور يتنزّل')
  assert.equal(row.permissions, JSON.stringify(['finance']), 'ممنوع الصلاحيات تتشال')
  assert.equal(row.passwordHash, U.saeed.passwordHash, 'ممنوع كلمة المرور تتغيّر')
  // وكلمته القديمة لسه بتدخل (المسارين شغّالين له)
  const login = expect(await http(null, 'POST', '/auth/login',
    { email: 'saeed.old@maharah.local', password: U.saeedPassword }), 201, 'دخول بكلمة قديمة:')
  assert.ok(login.accessToken)
})

test('D3 — كل سبب تخطّي/تعارض بيتقال بالاسم وبعربي، ومفيش أي حساب بيتعمل لأي واحد منهم', async () => {
  const cases = [
    ['ambigA', E.ambigA, 'skipped', 'ambiguous'],
    ['ambigB', E.ambigB, 'skipped', 'ambiguous'],
    ['adOff', E.adOff, 'skipped', 'adDisabled'],
    ['archived', E.archived, 'skipped', 'employeeEnded'],
    ['inactive', E.inactive, 'skipped', 'employeeInactive'],
    ['mailTaken', E.mailTaken, 'skipped', 'emailTaken'],
    ['guidTaken', E.guidTaken, 'conflict', 'guidConflict'],
    ['userOff', E.userOff, 'skipped', 'userInactive'],
    // حساب جهاز باسم الموظف: الدليل بيتخطّاه كـ«مش شخص» فمن ناحية الموظف مفيش مطابقة
    ['machine', E.machine, 'noMatch', 'noMatch'],
    ['noAccount', E.noAccount, 'noMatch', 'noMatch'],
  ]
  const snapshotBefore = await snapshot()
  for (const [label, employee, outcome, reason] of cases) {
    const result = expect(await syncEmployee(U.admin, employee.id), 200, `${label}:`)
    assert.equal(result.outcome, outcome, `${label}: الحالة`)
    assert.equal(result.reason, reason, `${label}: السبب`)
    assert.ok(isArabic(result.message), `${label}: ${result.message}`)
    assert.ok(isArabic(result.reasonText), `${label}: ${result.reasonText}`)
  }
  // الغموض بيقول المرشّحين بالاسم والكود — عشان المالك يصلّح البيانات
  const ambiguous = expect(await syncEmployee(U.admin, E.ambigA.id), 200)
  assert.deepEqual(ambiguous.candidates.map((c) => c.employeeCode).sort(), ['AP003', 'AP004'])
  for (const candidate of ambiguous.candidates) assert.ok(candidate.fullName, 'الاسم لازم يبان')
  // ولا صف واحد اتغيّر في كل ده
  assert.equal(await snapshot(), snapshotBefore, 'ممنوع أي كتابة مع أي سبب تخطّي')
  for (const [, employee, outcome] of cases) {
    if (outcome === 'created' || outcome === 'linked') continue
    const rows = await usersOf(employee.id)
    // ماهر وهالة عندهم حسابات قديمة — الممنوع هو **تغييرها**، واللقطة فوق أثبتت كده
    if (employee.id === E.guidTaken.id) assert.equal(rows[0].domainObjectGuid, 'bbbbbbbb-0000-0000-0000-00000000bbbb')
    else if (employee.id === E.userOff.id) assert.equal(rows[0].domainObjectGuid, null)
    else assert.equal(rows.length, 0, `${employee.fullName}: ممنوع يتعملّه حساب`)
  }
})

test('D4 — الدليل الواقف على الزرّ: سبب واضح ومفيش أي كتابة، والموظف المفقود 404', async () => {
  listMode = 'unavailable'
  const snapshotBefore = await snapshot()
  const result = expect(await syncEmployee(U.admin, E.noAccount.id), 200, 'دليل واقف:')
  assert.equal(result.outcome, 'directoryUnavailable')
  assert.ok(isArabic(result.message), result.message)
  assert.equal(await snapshot(), snapshotBefore)
  listMode = 'ok'
  const missing = await syncEmployee(U.admin, 999999)
  assert.equal(missing.status, 404, JSON.stringify(missing.body))
  assert.ok(isArabic(msg(missing)), msg(missing))
})

// ============================================================================
// E) الحراسة
// ============================================================================

test('E1 — الزرّ محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع', async () => {
  const anonymous = await syncEmployee(null, E.noAccount.id)
  assert.equal(anonymous.status, 401)
  // employees.view وحدها مش كفاية
  const viewer = await syncEmployee(U.viewer, E.noAccount.id)
  assert.equal(viewer.status, 403, JSON.stringify(viewer.body))
  const staff = await syncEmployee(U.staff, E.noAccount.id)
  assert.equal(staff.status, 403, JSON.stringify(staff.body))
  // معاه users.manage لكن مقفول على فرع → مرفوض برسالة «كل الفروع»
  const branchHr = await syncEmployee(U.branchHr, E.noAccount.id)
  assert.equal(branchHr.status, 403, JSON.stringify(branchHr.body))
  assert.ok(isArabic(msg(branchHr)), msg(branchHr))
  assert.match(msg(branchHr), /كل الفروع/)
  // ونفس الصلاحية بنطاق كل الفروع → مسموح
  const wide = expect(await syncEmployee(U.wideHr, E.noAccount.id), 200, 'نطاق كل الفروع:')
  assert.equal(wide.outcome, 'noMatch')
})

// ============================================================================
// F) الكارت
// ============================================================================

test('F1 — الكارت بيقول «مفيش حساب» بصراحة، وبيقول «حساب دومين» و«حساب عندنا» لما يكون فيه', async () => {
  const none = expect(await readCard(U.admin, E.noAccount.id), 200, 'مفيش حساب:')
  assert.equal(none.hasAccount, false)
  assert.equal(none.account, null)
  assert.ok(isArabic(none.summary), none.summary)
  assert.match(none.summary, /مش مرتبط/)
  assert.equal(none.canSync, true)
  assert.equal(none.directory.configured, true)
  assert.equal(none.autoProvisionEnabled, true)
  assert.equal(none.employeeCode, E.noAccount.employeeCode)

  // حساب دومين (اتعمل من الزرّ في D1)
  const domain = expect(await readCard(U.admin, E.button.id), 200, 'حساب دومين:')
  assert.equal(domain.hasAccount, true)
  assert.equal(domain.account.isDomainAccount, true)
  assert.equal(domain.account.email, 'badr@maharah.pro')
  assert.equal(domain.account.role, 'employee')
  assert.ok(isArabic(domain.account.roleLabel), domain.account.roleLabel)
  assert.equal(domain.account.isActive, true)
  assert.match(domain.summary, /الدومين/)

  // حساب عندنا (بريد + كلمة مرور) — هالة معطّلة ومفيش ربط مجال
  const local = expect(await readCard(U.admin, E.userOff.id), 200, 'حساب عندنا:')
  assert.equal(local.account.isDomainAccount, false)
  assert.equal(local.account.isActive, false)
  assert.equal(local.account.email, 'hala@maharah.local')
  assert.match(local.summary, /عندنا/)
})

test('F2 — الكارت بيتقرا بصلاحية عرض الملف نفسها، مش بـusers.manage، وبلا أي hash', async () => {
  // الموظف يشوف كارت نفسه بلا أي صلاحية
  const self = expect(await readCard(U.staff, E.viewerSelf.id), 200, 'الموظف لنفسه:')
  assert.equal(self.employeeId, E.viewerSelf.id)
  assert.equal(self.canSync, false, 'مايقدرش يزامن')
  // مشاهد الموظفين يقرا أي كارت في فرعه — والزرّ مايظهرش له
  const viewer = expect(await readCard(U.viewer, E.button.id), 200, 'مشاهد:')
  assert.equal(viewer.hasAccount, true)
  assert.equal(viewer.canSync, false)
  // موظف عادي على موظف تاني = مرفوض، وبلا توكن = 401
  const forbidden = await readCard(U.staff, E.button.id)
  assert.equal(forbidden.status, 403, JSON.stringify(forbidden.body))
  assert.ok(isArabic(msg(forbidden)), msg(forbidden))
  assert.equal((await readCard(null, E.button.id)).status, 401)
  // ولا hash ولا GUID ولا كلمة مرور بتخرج
  const raw = JSON.stringify(viewer)
  for (const secretish of ['passwordHash', '$2a$', '$2b$', 'domainObjectGuid', 'guid-btn-create']) {
    assert.equal(raw.includes(secretish), false, `ممنوع «${secretish}» يخرج في الكارت`)
  }
})

test('F3 — عزل الفرع: حساب مقفول على فرع مايقراش كارت موظف فرع تاني، والمفتاح المقفول بيبان في الكارت', async () => {
  // ريم في فرع ب، والمشاهد مقفول على فرع أ → غير موجود
  const across = await readCard(U.viewer, E.otherBranch.id)
  assert.equal(across.status, 404, JSON.stringify(across.body))
  assert.ok(isArabic(msg(across)), msg(across))
  // ومدير النظام يقراه عادي
  expect(await readCard(U.admin, E.otherBranch.id), 200, 'مدير النظام:')
  // المفتاح المقفول بيبان في الكارت عشان الشاشة تقول «التلقائي مقفول، والزرّ شغّال»
  await setSwitch('false')
  const closed = expect(await readCard(U.admin, E.noAccount.id), 200)
  assert.equal(closed.autoProvisionEnabled, false)
  await setSwitch('true')
  const open = expect(await readCard(U.admin, E.noAccount.id), 200)
  assert.equal(open.autoProvisionEnabled, true)
})

test('F4 — المزامنة الجماعية لسه شغّالة زي ما هي جنب الزرّ (معاينة افتراضيًّا)', async () => {
  const snapshotBefore = await snapshot()
  const preview = expect(await http(U.admin, 'POST', '/users/domain-sync', {}), 200, 'معاينة:')
  assert.equal(preview.applied, false)
  assert.equal(preview.counts.scanned, AD.size)
  assert.equal(await snapshot(), snapshotBefore, 'المعاينة ممنوع تكتب')
  // والتطبيق بعد كل اللي فوق مالوش أي حاجة جديدة يعملها للموظفين اللي اتزوّدوا
  const applied = expect(await http(U.admin, 'POST', '/users/domain-sync', { apply: true }), 200, 'تطبيق:')
  assert.equal(applied.counts.failed, 0, JSON.stringify(applied.entries.filter((e) => e.error)))
  for (const sam of ['btn-create', 'btn-link', 'hire-ok', 'hire-slow', 'hire-switch', 'hire-again']) {
    const entry = applied.entries.find((e) => e.sAMAccountName === sam)
    assert.ok(entry, sam)
    assert.equal(entry.reason, 'alreadyLinked', `${sam}: المفروض مربوط خلاص من التزويد`)
  }
})
