'use strict'
// مزامنة حسابات الدومين — على قاعدة SQL مؤقتة تُحذف في النهاية. الحد الخارجي الوحيد المزيّف هو
// الدليل (listUsers / authenticate)، وكل الباقي حقيقي (Nest + TypeORM + HTTP).
// **مفيش أي اتصال LDAP حقيقي**: باني العميل (client) مستبدل برمي استثناء، فأي محاولة اتصال
// بتفشّل الاختبار بصوت عالي بدل ما تخرج للشبكة — وفيه اختبار بيتأكد من ده بنفسه (NOLDAP).
//
// اللي بيتأكد هنا:
//   A) المعاينة: الأرقام والأسباب صح، و**مفيش صف واحد بيتكتب**
//   B) المطابقة: كود، رقم بصمة (بالأصفار البادئة في الاتجاهين)، بريد AD، الـUPN — والغموض مرفوض
//   C) التطبيع الفعلي: الحسابات المتوقعة بالظبط، بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف
//   D) حساب قائم يُربط ولا يتكرر — ومفيش دور ولا صلاحيات ولا بريد ولا تفعيل بيتغيّر
//   E) التعارضات والتخطّي: GUID تاني، بريد محجوز، حساب معطّل، AD متوقف، موظف أرشيف/غير نشط،
//      حساب جهاز، حساب مجال مكرر لنفس الموظف
//   F) التمرير التاني مابيغيّرش ولا بايت (لقطة الجدول متطابقة)
//   G) الدخول الحيّ لسه بيشتغل: الحساب المتزامن بيدخل بلا إنشاء تاني، والمطابقة بالبصمة بقت شغّالة
//   H) الحراسة: users.manage + نطاق كل الفروع، والتطبيق محتاج apply=true صريحة
// Run: node --test --test-concurrency=1 api/test/domain-users-sync.integration.cjs
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

const database = `hr_domain_sync_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-domain-sync-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const pass = () => `T${crypto.randomBytes(9).toString('base64url')}9`

let app, ds, master, baseUrl, created = false
let DirectoryService, DirectoryAuthError, normalizeDomainLogin, directoryService
let branchA, branchB, adminToken, hrToken, staffToken
const E = {} // الموظفين بالاسم
const AD = new Map() // sAMAccountName → خصائص حساب المجال المزيّف
let localUsers = {} // حسابات محلية قائمة قبل المزامنة

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_domain_sync_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = (name) => { assertDisposable(); return ds.getRepository(name) }

async function http(token, method, route, body) {
  const response = await fetch(baseUrl + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

const login = async (email, password) => {
  const body = expect(await http(null, 'POST', '/auth/login', { email, password }), 201, 'login:')
  return body.accessToken
}
const loginDomain = (username, password) => http(null, 'POST', '/auth/login/domain', { username, password })
const runSync = (token, body) => http(token, 'POST', '/users/domain-sync', body)
const at = (summary, sam) => {
  const found = summary.entries.find((e) => e.sAMAccountName === sam)
  assert.ok(found, `مفيش صف للحساب ${sam}`)
  return found
}
/** لقطة كل أعمدة المستخدمين اللي المزامنة ممنوعة تلمسها (lastLoginAt برّه: الدخول بيغيّره) */
const snapshot = async () => (await ds.query(
  `SELECT id, email, passwordHash, displayName, role, branchId, employeeId, permissions, isActive,
          tokenVersion, mustChangePassword, passwordChangedAt, scopeAllBranches, domainObjectGuid
   FROM dbo.users ORDER BY id`
)).map((row) => JSON.stringify(row)).join('\n')
const countUsers = async () => (await ds.query('SELECT COUNT(*) n FROM dbo.users'))[0].n
const userRow = async (id) => (await ds.query(
  `SELECT id, email, passwordHash, displayName, role, branchId, employeeId, permissions, isActive,
          tokenVersion, mustChangePassword, passwordChangedAt, domainObjectGuid
   FROM dbo.users WHERE id = @0`, [id]))[0]

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
  ;({ DirectoryAuthError, normalizeDomainLogin } = require('../src/auth/directory.types'))
  ;({ DirectoryService } = require('../src/auth/directory.service'))
  directoryService = app.get(DirectoryService)
  directoryService.client = () => { throw new Error('الاختبار حاول يفتح اتصال LDAP حقيقي') }
  directoryService.isConfigured = () => true
  directoryService.listUsers = async () => [...AD.values()].map(({ password: _p, ...rest }) => ({ ...rest }))
  directoryService.authenticate = async (username, password) => {
    const name = normalizeDomainLogin(username, 'maharah.local')
    if (!name) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: اسم غير صالح')
    if (!password) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: كلمة فاضية')
    const account = AD.get(name.sam)
    if (!account || account.password !== password) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: بيانات غلط')
    if (account.disabled) throw new DirectoryAuthError('ACCOUNT_DISABLED', 'fake: متوقف')
    const { password: _p, objectClasses: _oc, ...rest } = account
    return { ...rest, userPrincipalName: name.upn }
  }

  // ===== بيانات =====
  branchA = await repo('Branch').save({ code: 'DSY_A', name: 'فرع المزامنة أ' })
  branchB = await repo('Branch').save({ code: 'DSY_B', name: 'فرع المزامنة ب' })
  const deptA = await repo('Department').save({ name: 'قسم أ', branchId: branchA.id, isActive: true })
  const deptB = await repo('Department').save({ name: 'قسم ب', branchId: branchB.id, isActive: true })
  let n = 0
  const employee = async (overrides = {}) => {
    const i = ++n
    return repo('Employee').save({ employeeCode: `DS${String(i).padStart(3, '0')}`, fingerprintCode: null,
      fullName: `موظف مزامنة ${i}`, branchId: branchA.id, departmentId: deptA.id, jobTitle: 'محاسب',
      joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
      workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true,
      payMethod: 'transfer', ...overrides })
  }

  E.byCode = await employee({ fullName: 'ندى — بكود الموظف' })                                   // DS001
  E.padded = await employee({ fullName: 'سامي — بصمته مصفَّرة', fingerprintCode: '00123' })        // DS002
  E.bare = await employee({ fullName: 'ليلى — بصمتها بلا أصفار', fingerprintCode: '456' })         // DS003
  E.byMail = await employee({ fullName: 'عمر — ببريد AD', email: 'omar@maharah.local',
    branchId: branchB.id, departmentId: deptB.id })                                                // DS004
  E.byUpn = await employee({ fullName: 'هدى — بالـUPN', email: 'huda@maharah.local' })             // DS005
  E.hasUser = await employee({ fullName: 'ماجد — له حساب قبل كده' })                              // DS006
  E.guidTaken = await employee({ fullName: 'رامي — حسابه مربوط بمجال تاني' })                      // DS007
  E.archived = await employee({ fullName: 'حسن — أرشيف', status: 'archived',
    archivedAt: new Date(), isActive: false, fingerprintCode: '901' })                              // DS008
  E.inactive = await employee({ fullName: 'منى — غير نشطة', isActive: false, fingerprintCode: '902' }) // DS009
  E.collide = await employee({ fullName: 'فادي — بريده محجوز', email: 'busy1@maharah.local' })     // DS010
  E.ambigA = await employee({ fullName: 'غامض أ', fingerprintCode: '777' })                        // DS011
  E.ambigB = await employee({ fullName: 'غامض ب', fingerprintCode: '0777' })                       // DS012
  E.adOff = await employee({ fullName: 'طارق — حسابه متوقف في المجال', fingerprintCode: '903' })   // DS013
  E.userOff = await employee({ fullName: 'سلمى — حسابها معطّل عندنا', fingerprintCode: '904' })     // DS014
  E.dup = await employee({ fullName: 'وليد — حسابين مجال', fingerprintCode: '905' })               // DS015
  E.already = await employee({ fullName: 'كريم — مربوط خلاص', fingerprintCode: '906' })            // DS016
  E.liveOnly = await employee({ fullName: 'أنس — للدخول الحيّ بس', fingerprintCode: '00907' })     // DS017
  E.liveAmbigA = await employee({ fullName: 'حيّ غامض أ', fingerprintCode: '999' })                // DS018
  E.liveAmbigB = await employee({ fullName: 'حيّ غامض ب', fingerprintCode: '00999' })              // DS019

  // حسابات محلية قائمة قبل المزامنة
  const mk = async (fields) => repo('User').save({ permissions: JSON.stringify([]), ...fields })
  localUsers.adminPassword = pass()
  localUsers.admin = await mk({ email: 'admin@dsync.invalid', displayName: 'مدير النظام',
    passwordHash: await bcrypt.hash(localUsers.adminPassword, 10), role: 'super_admin', branchId: null,
    passwordChangedAt: new Date() })
  localUsers.hrPassword = pass()
  localUsers.hr = await mk({ email: 'hr@dsync.invalid', displayName: 'مدير موارد بشرية على فرع',
    passwordHash: await bcrypt.hash(localUsers.hrPassword, 10), role: 'hr_manager', branchId: branchA.id,
    passwordChangedAt: new Date() })
  localUsers.staffPassword = pass()
  localUsers.staff = await mk({ email: 'staff@dsync.invalid', displayName: 'موظف عادي',
    passwordHash: await bcrypt.hash(localUsers.staffPassword, 10), role: 'employee', branchId: branchA.id,
    passwordChangedAt: new Date() })
  // (D) حساب قائم لماجد بلا ربط مجال — لازم يُربط ومايتكررش، وبريده مايتغيّرش
  localUsers.magedPassword = pass()
  localUsers.maged = await mk({ email: 'maged.old@maharah.local', displayName: 'ماجد — الاسم القديم',
    passwordHash: await bcrypt.hash(localUsers.magedPassword, 10), role: 'branch_manager', branchId: branchA.id,
    employeeId: E.hasUser.id, permissions: JSON.stringify(['finance']), passwordChangedAt: new Date() })
  // (E) حساب رامي مربوط بحساب مجال **تاني** — تعارض يتقال ومايتكتبش فوقه
  localUsers.rami = await mk({ email: 'rami@maharah.local', displayName: 'رامي', role: 'employee',
    passwordHash: await bcrypt.hash(pass(), 10), branchId: branchA.id, employeeId: E.guidTaken.id,
    domainObjectGuid: 'aaaaaaaa-0000-0000-0000-00000000aaaa' })
  // (E) حساب سلمى معطّل — مابنلمسوش (نفس قاعدة الدخول)
  localUsers.salma = await mk({ email: 'salma@maharah.local', displayName: 'سلمى', role: 'employee',
    passwordHash: await bcrypt.hash(pass(), 10), branchId: branchA.id, employeeId: E.userOff.id, isActive: false })
  // (E) عنوانين محجوزين لحسابات مالهاش علاقة بفادي → كل مرشّحاته محجوزة
  localUsers.busy1 = await mk({ email: 'busy1@maharah.local', displayName: 'حساب حاجز 1', role: 'employee',
    passwordHash: await bcrypt.hash(pass(), 10), branchId: branchA.id })
  localUsers.busy2 = await mk({ email: 'collide@maharah.local', displayName: 'حساب حاجز 2', role: 'employee',
    passwordHash: await bcrypt.hash(pass(), 10), branchId: branchA.id })
  // (E) حساب كريم مربوط خلاص بنفس الـGUID → alreadyLinked ومفيش أي تغيير
  localUsers.karim = await mk({ email: 'karim@maharah.local', displayName: 'كريم', role: 'employee',
    passwordHash: await bcrypt.hash(pass(), 10), branchId: branchA.id, employeeId: E.already.id,
    domainObjectGuid: 'cccccccc-0000-0000-0000-00000000cccc' })

  // ===== الدليل المزيّف: حساب لكل سيناريو =====
  const account = (sam, fields) => AD.set(sam, { objectGuid: `guid-${sam}`, sAMAccountName: sam,
    userPrincipalName: `${sam}@maharah.local`, mail: null, displayName: null, employeeId: null,
    disabled: false, objectClasses: ['top', 'person', 'organizationalPerson', 'user'], password: pass(), ...fields })

  account('a-code', { employeeId: E.byCode.employeeCode, displayName: 'ندى من الدليل', mail: 'nada@maharah.pro' })
  // البصمة عندنا «00123» وAD كاتب «123» — الاتجاه اللي 323 موظف اتعلّقوا عليه
  account('b-pad', { employeeId: '123', displayName: 'سامي من الدليل', mail: 'sami@maharah.pro' })
  // والعكس: البصمة عندنا «456» وAD كاتب «000456»
  account('c-bare', { employeeId: '  000456 ', displayName: 'ليلى من الدليل', mail: 'laila@maharah.pro' })
  // بريد AD بيطابق بريد الموظف، والفرع لازم يورث من الموظف (فرع ب)
  account('d-mail', { mail: 'OMAR@maharah.local', displayName: 'عمر من الدليل' })
  // مفيش employeeID ومفيش mail → الـUPN
  account('e-upn', { userPrincipalName: 'huda@maharah.local' })
  // حساب قائم لماجد: يُربط، وبريد AD مايتكتبش فوق بريد الحساب
  account('f-link', { employeeId: E.hasUser.employeeCode, mail: 'maged@maharah.pro', displayName: 'ماجد من الدليل' })
  account('g-conflict', { employeeId: E.guidTaken.employeeCode, mail: 'rami@maharah.pro' })
  account('h-archived', { employeeId: '901', mail: 'hassan@maharah.pro' })
  account('i-inactive', { employeeId: '902', mail: 'mona@maharah.pro' })
  account('j-collide', { employeeId: E.collide.employeeCode, mail: 'busy1@maharah.local',
    userPrincipalName: 'collide@maharah.local' })
  account('k-ambiguous', { employeeId: '777', mail: 'ambig@maharah.pro' })
  account('l-adoff', { employeeId: '903', mail: 'tarek@maharah.pro', disabled: true })
  account('m-useroff', { employeeId: '904', mail: 'salma@maharah.pro' })
  account('n-dup-a', { employeeId: '905', mail: 'walid.a@maharah.pro' })
  account('n-dup-b', { employeeId: '905', mail: 'walid.b@maharah.pro' })
  account('o-already', { objectGuid: 'cccccccc-0000-0000-0000-00000000cccc', employeeId: '906' })
  account('p-ghost', { mail: 'ghost@nowhere.example', displayName: 'مش موظف عندنا' })
  account('DC01$', { employeeId: E.byUpn.employeeCode })
  account('q-computer', { objectClasses: ['top', 'computer'], employeeId: E.byUpn.employeeCode })

  adminToken = await login(localUsers.admin.email, localUsers.adminPassword)
  hrToken = await login(localUsers.hr.email, localUsers.hrPassword)
  staffToken = await login(localUsers.staff.email, localUsers.staffPassword)
}, { timeout: 300000 })

after(async (t) => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_domain_sync_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'domain sync fixture cleanup failed')
})

// ============================================================================
// NOLDAP) مفيش اتصال حقيقي ممكن — والاختبار بيتأكد من ده بنفسه
// ============================================================================

test('NOLDAP — أي محاولة لفتح اتصال LDAP حقيقي بتفشّل الاختبار بصوت عالي', async () => {
  assert.throws(() => directoryService.client(), /اتصال LDAP حقيقي/)
  // ولو حد شال المزيّف عن listUsers، التنفيذ الحقيقي بيوصل لباني العميل ويرمي — مفيش خروج صامت للشبكة
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
// A) المعاينة — الأرقام والأسباب، ومفيش صف بيتكتب
// ============================================================================

test('A1 — المعاينة مفيش فيها أي كتابة: لقطة جدول المستخدمين قبلها وبعدها متطابقة بالحرف', async () => {
  const before = await snapshot()
  const beforeCount = await countUsers()
  const summary = expect(await runSync(adminToken, {}), 200, 'dry run:')
  assert.equal(summary.applied, false, 'الافتراضي معاينة')
  assert.equal(summary.entries.length, AD.size)
  assert.equal(summary.counts.scanned, AD.size)
  for (const entry of summary.entries) assert.equal(entry.applied, false, `${entry.sAMAccountName} اتكتب في المعاينة`)
  assert.equal(await countUsers(), beforeCount, 'ممنوع حساب يتعمل في المعاينة')
  assert.equal(await snapshot(), before, 'ممنوع أي عمود يتغيّر في المعاينة')
})

test('A2 — المعاينة بتقول اللي هيحصل بالظبط: الحسابات الجديدة والربط بالاسم والكود', async () => {
  const summary = expect(await runSync(adminToken, { apply: false }), 200)
  const creates = summary.entries.filter((e) => e.action === 'create')
    .map((e) => `${e.sAMAccountName}→${e.employeeCode}`).sort()
  assert.deepEqual(creates, ['a-code→DS001', 'b-pad→DS002', 'c-bare→DS003', 'd-mail→DS004',
    'e-upn→DS005', 'n-dup-a→DS015'])
  const links = summary.entries.filter((e) => e.action === 'link')
    .map((e) => `${e.sAMAccountName}→${e.employeeCode}`)
  assert.deepEqual(links, ['f-link→DS006'])
  assert.equal(summary.counts.create, 6)
  assert.equal(summary.counts.link, 1)
  assert.equal(summary.counts.conflict, 1)
  // كل صف فيه الاسم والكود اللي المالك محتاجهم
  for (const entry of creates.length ? summary.entries.filter((e) => e.employeeId) : []) {
    assert.ok(entry.employeeCode, entry.sAMAccountName)
    assert.ok(entry.employeeName, entry.sAMAccountName)
  }
  // والملخص فيه حالة الدليل بلا أي سر
  assert.equal(Object.keys(summary.directory).sort().join(','), 'configured,server,upnSuffix')
  assert.equal(JSON.stringify(summary).includes(env.DB_PASSWORD || '@@none@@'), false, 'ممنوع أي سر في الرد')
})

// ============================================================================
// B) المطابقة — بصمة بالأصفار في الاتجاهين، وغموض مرفوض
// ============================================================================

test('B1 — المطابقة برقم البصمة شغّالة في الاتجاهين حتى مع الأصفار البادئة والمسافات', async () => {
  const summary = expect(await runSync(adminToken, {}), 200)
  // AD كاتب «123» والبصمة عندنا «00123»
  const padded = at(summary, 'b-pad')
  assert.equal(padded.action, 'create')
  assert.equal(padded.employeeId, E.padded.id)
  assert.equal(padded.matchedVia, 'fingerprintCode')
  assert.ok(isArabic(padded.matchedViaLabel), padded.matchedViaLabel)
  // AD كاتب «  000456 » والبصمة عندنا «456»
  const bare = at(summary, 'c-bare')
  assert.equal(bare.employeeId, E.bare.id)
  assert.equal(bare.matchedVia, 'fingerprintCode')
  // وباقي الخانات بترتيبها
  assert.equal(at(summary, 'a-code').matchedVia, 'employeeCode')
  assert.equal(at(summary, 'd-mail').matchedVia, 'mail')
  assert.equal(at(summary, 'e-upn').matchedVia, 'userPrincipalName')
})

test('B2 — الغموض مرفوض بالاسم والكود، ومفيش تخمين ومفيش حساب', async () => {
  const summary = expect(await runSync(adminToken, {}), 200)
  const row = at(summary, 'k-ambiguous')
  assert.equal(row.action, 'skip')
  assert.equal(row.reason, 'ambiguous')
  assert.ok(isArabic(row.reasonText), row.reasonText)
  assert.equal(row.employeeId, null, 'ممنوع نختار واحد من الاتنين')
  assert.deepEqual(row.candidates.map((c) => c.employeeCode).sort(), ['DS011', 'DS012'])
  for (const c of row.candidates) assert.ok(c.fullName, 'الاسم لازم يبان للمالك يصلّح البيانات')
})

test('B3 — كل سبب تخطّي/تعارض بيطلع على الحساب الصح', async () => {
  const summary = expect(await runSync(adminToken, {}), 200)
  const expected = {
    'g-conflict': ['conflict', 'guidConflict'],
    'h-archived': ['skip', 'employeeEnded'],
    'i-inactive': ['skip', 'employeeInactive'],
    'j-collide': ['skip', 'emailTaken'],
    'k-ambiguous': ['skip', 'ambiguous'],
    'l-adoff': ['skip', 'adDisabled'],
    'm-useroff': ['skip', 'userInactive'],
    'n-dup-b': ['skip', 'duplicateEmployee'],
    'o-already': ['skip', 'alreadyLinked'],
    'p-ghost': ['skip', 'noMatch'],
    'DC01$': ['skip', 'notPerson'],
    'q-computer': ['skip', 'notPerson'],
  }
  for (const [sam, [action, reason]] of Object.entries(expected)) {
    const row = at(summary, sam)
    assert.equal(row.action, action, `${sam}: الإجراء`)
    assert.equal(row.reason, reason, `${sam}: السبب`)
    assert.ok(isArabic(row.reasonText), `${sam}: ${row.reasonText}`)
  }
  // الحساب المتوقف في المجال بيقول الموظف بالاسم والكود برضه — وإلا زرّ ملف الموظف كان بيقول
  // «مفيش حساب مجال مطابق» على موظف حسابه موجود بس متوقف (نفس سبب تسمية صف «مربوط خلاص»).
  // القرار ماتغيّرش: المتوقف مايتعملّوش حساب.
  const adOff = at(summary, 'l-adoff')
  assert.equal(adOff.employeeId, E.adOff.id)
  assert.equal(adOff.employeeCode, E.adOff.employeeCode)
  assert.equal(adOff.employeeName, E.adOff.fullName)
  assert.equal(adOff.matchedVia, 'fingerprintCode')
  // وتوزيع الأسباب في الملخص متطابق مع الصفوف
  for (const row of summary.reasons) {
    assert.equal(row.count, summary.entries.filter((e) => e.reason === row.reason).length, row.reason)
    assert.ok(isArabic(row.reasonText), row.reasonText)
  }
})

// ============================================================================
// C+D+E) التطبيق الفعلي
// ============================================================================

test('C1 — التطبيق بيعمل الحسابات المتوقعة بالظبط: بلا كلمة مرور، بالـGUID، بأقل دور، بفرع الموظف', async () => {
  const beforeCount = await countUsers()
  const summary = expect(await runSync(adminToken, { apply: true }), 200, 'apply:')
  assert.equal(summary.applied, true)
  assert.equal(summary.counts.create, 6)
  assert.equal(summary.counts.link, 1)
  assert.equal(summary.counts.failed, 0, JSON.stringify(summary.entries.filter((e) => e.error)))
  assert.equal(await countUsers(), beforeCount + 6, 'ستة حسابات بالظبط — ولا واحد زيادة')

  const checks = [
    ['a-code', E.byCode, 'nada@maharah.pro', 'ندى من الدليل', branchA],
    ['b-pad', E.padded, 'sami@maharah.pro', 'سامي من الدليل', branchA],
    ['c-bare', E.bare, 'laila@maharah.pro', 'ليلى من الدليل', branchA],
    // بريد AD بحالة أحرف كبيرة → بيتخزّن lowercase، والفرع من الموظف (فرع ب)
    ['d-mail', E.byMail, 'omar@maharah.local', 'عمر من الدليل', branchB],
    // مفيش displayName في AD → اسم الموظف، والبريد من نسختنا (مفيش mail في AD)
    ['e-upn', E.byUpn, 'huda@maharah.local', E.byUpn.fullName, branchA],
    ['n-dup-a', E.dup, 'walid.a@maharah.pro', E.dup.fullName, branchA],
  ]
  for (const [sam, employee, email, displayName, branch] of checks) {
    const entry = at(summary, sam)
    assert.equal(entry.action, 'create', sam)
    assert.equal(entry.applied, true, sam)
    assert.ok(entry.userId, sam)
    const row = await userRow(entry.userId)
    assert.equal(row.email, email, `${sam}: البريد`)
    assert.equal(row.displayName, displayName, `${sam}: اسم العرض`)
    assert.equal(row.role, 'employee', `${sam}: أقل دور`)
    assert.equal(row.permissions, null, `${sam}: بلا صلاحيات إضافية`)
    assert.equal(row.branchId, branch.id, `${sam}: فرع الموظف`)
    assert.equal(row.employeeId, employee.id, `${sam}: الربط بالموظف`)
    assert.equal(row.isActive, true, `${sam}: نشط`)
    assert.equal(row.mustChangePassword, false, sam)
    assert.equal(row.domainObjectGuid, `guid-${sam}`, `${sam}: الربط الثابت من أول لحظة`)
    // كلمة مرور غير قابلة للاستخدام: hash موجود (فمفيش دخول بكلمة فاضية) لكن محدش يعرف سره
    assert.match(row.passwordHash, /^\$2[aby]\$/, `${sam}: لازم hash`)
    assert.equal(row.passwordChangedAt, null, `${sam}: مفيش كلمة اتعيّنت على النظام ده`)
    assert.equal(await bcrypt.compare('', row.passwordHash), false)
    // ومسار البريد+كلمة المرور مايفتحش الحساب ده بأي كلمة معروفة
    for (const guess of ['', 'password', email, `guid-${sam}`, 'domain-only']) {
      assert.equal((await http(null, 'POST', '/auth/login', { email, password: guess })).status >= 400, true,
        `${sam}: الحساب المجالي ممنوع يدخل بكلمة مرور`)
    }
  }
})

test('D1 — حساب قائم يُربط ولا يتكرر، ومفيش دور ولا صلاحيات ولا بريد ولا كلمة مرور بتتغيّر', async () => {
  const row = await userRow(localUsers.maged.id)
  assert.equal(row.domainObjectGuid, 'guid-f-link', 'العمود الناقص بس اللي بيتملي')
  assert.equal(row.email, 'maged.old@maharah.local', 'ممنوع بريد AD يكتب فوق بريد الحساب')
  assert.equal(row.displayName, 'ماجد — الاسم القديم', 'ممنوع اسم AD يكتب فوق اسم الحساب')
  assert.equal(row.role, 'branch_manager', 'ممنوع الدور يتنزّل')
  assert.equal(row.permissions, JSON.stringify(['finance']), 'ممنوع الصلاحيات تتشال')
  assert.equal(row.isActive, true)
  assert.equal(row.passwordHash, localUsers.maged.passwordHash, 'ممنوع كلمة المرور تتغيّر')
  // وحساب واحد بالظبط للموظف ده
  const [{ n }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE employeeId = @0', [E.hasUser.id])
  assert.equal(n, 1)
  // وكلمته القديمة لسه بتدخل (المسارين شغّالين له)
  assert.ok(await login('maged.old@maharah.local', localUsers.magedPassword))
})

test('E1 — تعارض الـGUID بيتقال ومايتكتبش فوقه، والحساب المعطّل والبريد المحجوز مالهمش أي أثر', async () => {
  const rami = await userRow(localUsers.rami.id)
  assert.equal(rami.domainObjectGuid, 'aaaaaaaa-0000-0000-0000-00000000aaaa', 'ممنوع ربط يتغيّر لوحده')
  const salma = await userRow(localUsers.salma.id)
  assert.equal(salma.domainObjectGuid, null, 'الحساب المعطّل مابنلمسوش — نفس قاعدة الدخول')
  assert.equal(salma.isActive, false)
  // فادي (بريده محجوز): مفيش حساب اتعمل له
  const [{ n: fadi }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE employeeId = @0', [E.collide.id])
  assert.equal(fadi, 0)
  // والحاجزين ما اتلمسوش
  for (const key of ['busy1', 'busy2', 'karim']) {
    const row = await userRow(localUsers[key].id)
    assert.equal(row.email, localUsers[key].email)
    assert.equal(row.domainObjectGuid, localUsers[key].domainObjectGuid ?? null)
  }
  // الموظف الأرشيف وغير النشط والمتوقف في المجال والغامضين: مفيش حساب لأي واحد منهم
  for (const employee of [E.archived, E.inactive, E.adOff, E.ambigA, E.ambigB]) {
    const [{ n }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE employeeId = @0', [employee.id])
    assert.equal(n, 0, `${employee.fullName} ممنوع يتعملّه حساب`)
  }
  // وليد (حسابين مجال): حساب واحد بالظبط، ومربوط بالحساب الأول أبجديًّا
  const [walid] = await ds.query('SELECT COUNT(*) n, MIN(domainObjectGuid) g FROM dbo.users WHERE employeeId = @0', [E.dup.id])
  assert.equal(walid.n, 1)
  assert.equal(walid.g, 'guid-n-dup-a')
})

// ============================================================================
// F) التمرير التاني مابيغيّرش ولا بايت
// ============================================================================

test('F1 — تمرير تاني (وثالت): مفيش إنشاء ولا ربط، ولقطة الجدول متطابقة بالحرف', async () => {
  const before = await snapshot()
  const second = expect(await runSync(adminToken, { apply: true }), 200, 'second apply:')
  assert.equal(second.counts.create, 0, JSON.stringify(second.entries.filter((e) => e.action === 'create')))
  assert.equal(second.counts.link, 0)
  assert.equal(second.counts.failed, 0)
  assert.equal(await snapshot(), before, 'التمرير التاني ممنوع يغيّر أي عمود')
  // الحسابات اللي اتعملت بقت «موجودة ومربوطة»
  for (const sam of ['a-code', 'b-pad', 'c-bare', 'd-mail', 'e-upn', 'n-dup-a', 'f-link', 'o-already']) {
    assert.equal(at(second, sam).reason, 'alreadyLinked', sam)
  }
  // والمعاينة بعد التطبيع مابتقترحش أي حاجة
  const third = expect(await runSync(adminToken, {}), 200)
  assert.equal(third.counts.create + third.counts.link, 0)
  assert.equal(await snapshot(), before)
})

// ============================================================================
// G) الدخول الحيّ لسه بيشتغل — والمطابقة بالبصمة بقت شغّالة فيه
// ============================================================================

test('G1 — الحساب المتزامن بيدخل بحساب المجال ومفيش حساب تاني بيتعمل', async () => {
  const before = await countUsers()
  const account = AD.get('b-pad')
  const body = expect(await loginDomain('b-pad', account.password), 201, 'domain login:')
  const [{ n }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE domainObjectGuid = @0', [account.objectGuid])
  assert.equal(n, 1)
  assert.equal(await countUsers(), before, 'ممنوع حساب تاني — الربط بالـGUID موجود من المزامنة')
  assert.equal(body.user.email, 'sami@maharah.pro')
  assert.equal(body.user.employeeId, E.padded.id)
  assert.equal(body.user.role, 'employee')
  expect(await http(body.accessToken, 'GET', '/auth/me'), 200)
  // والدور اللي المالك يسنده بعد المزامنة هو اللي بيسري (الصلاحيات من جداولنا مش من AD)
  expect(await http(body.accessToken, 'GET', '/users'), 403)
})

test('G2 — الدخول الحيّ كسب خطوة رقم البصمة: حساب مجال ما اتزامنش بيطابق بالبصمة ويعمل حساب واحد', async () => {
  // حساب مش في قائمة المزامنة خالص — المطابقة لازم تحصل في الدخول نفسه
  AD.set('live-finger', { objectGuid: 'guid-live-finger', sAMAccountName: 'live-finger',
    userPrincipalName: 'live-finger@maharah.local', mail: 'anas@maharah.pro', displayName: 'أنس من الدليل',
    employeeId: '907', disabled: false, password: pass(),
    objectClasses: ['top', 'person', 'user'] })
  const before = await countUsers()
  const body = expect(await loginDomain('live-finger', AD.get('live-finger').password), 201, 'live fingerprint:')
  assert.equal(await countUsers(), before + 1, 'حساب واحد بالظبط')
  const row = await userRow(body.user.id)
  // البصمة عندنا «00907» وAD كاتب «907» — الخطوة الجديدة هي اللي لقيته
  assert.equal(row.employeeId, E.liveOnly.id)
  assert.equal(row.domainObjectGuid, 'guid-live-finger')
  assert.equal(row.email, 'anas@maharah.pro')
  assert.equal(row.role, 'employee')
  assert.equal(row.passwordChangedAt, null)
  // ودخول تاني بيستخدم نفس الحساب
  const again = expect(await loginDomain('live-finger', AD.get('live-finger').password), 201)
  assert.equal(again.user.id, body.user.id)
  assert.equal(await countUsers(), before + 1)
})

test('G3 — الدخول الحيّ بيرفض المطابقة الغامضة برسالة عربية ومفيش حساب بيتعمل', async () => {
  AD.set('live-ambig', { objectGuid: 'guid-live-ambig', sAMAccountName: 'live-ambig',
    userPrincipalName: 'live-ambig@maharah.local', mail: 'ambig-live@maharah.pro', displayName: null,
    employeeId: '999', disabled: false, password: pass(), objectClasses: ['top', 'person', 'user'] })
  const before = await countUsers()
  const refused = await loginDomain('live-ambig', AD.get('live-ambig').password)
  assert.equal(refused.status, 401)
  assert.ok(isArabic(msg(refused)), msg(refused))
  assert.match(msg(refused), /أكتر من موظف/)
  assert.equal(refused.body.accessToken, undefined)
  assert.equal(await countUsers(), before, 'ممنوع أي حساب مع الغموض')
  // ونفس الحساب في المزامنة بيتقال عنه «غامض» بالاسم والكود
  const summary = expect(await runSync(adminToken, {}), 200)
  const row = at(summary, 'live-ambig')
  assert.equal(row.reason, 'ambiguous')
  assert.deepEqual(row.candidates.map((c) => c.employeeCode).sort(), ['DS018', 'DS019'])
  AD.delete('live-ambig')
})

test('G4 — حساب المجال المتوقف والموظف الأرشيف لسه مرفوضين في الدخول الحيّ', async () => {
  const before = await countUsers()
  const off = await loginDomain('l-adoff', AD.get('l-adoff').password)
  assert.equal(off.status, 401)
  assert.match(msg(off), /متوقف/)
  const archived = await loginDomain('h-archived', AD.get('h-archived').password)
  assert.equal(archived.status, 401)
  assert.match(msg(archived), /أرشيف|منتهية/)
  const ghost = await loginDomain('p-ghost', AD.get('p-ghost').password)
  assert.equal(ghost.status, 401)
  assert.match(msg(ghost), /مش مربوط|الموارد البشرية/)
  assert.equal(await countUsers(), before, 'ولا حساب اتعمل في أي رفض')
})

// ============================================================================
// H) الحراسة
// ============================================================================

test('H1 — المسار محروس: بلا توكن، وبلا users.manage، وبحساب مقفول على فرع', async () => {
  const anonymous = await runSync(null, {})
  assert.equal(anonymous.status, 401)
  const staff = await runSync(staffToken, {})
  assert.equal(staff.status, 403, JSON.stringify(staff.body))
  // مدير موارد بشرية معاه users.manage لكن مقفول على فرع: المزامنة بتلمس كل الفروع فمرفوضة
  const hr = await runSync(hrToken, {})
  assert.equal(hr.status, 403, JSON.stringify(hr.body))
  assert.ok(isArabic(msg(hr)), msg(hr))
  assert.match(msg(hr), /كل الفروع/)
})

test('H2 — التطبيق محتاج apply=true صريحة، وأي قيمة غير منطقية مرفوضة', async () => {
  const before = await snapshot()
  // جسم فاضي، وapply=false، وحتى apply مبعوتة نص: مفيش كتابة
  for (const body of [{}, undefined, { apply: false }]) {
    const summary = expect(await runSync(adminToken, body), 200, JSON.stringify(body))
    assert.equal(summary.applied, false)
  }
  const bad = await runSync(adminToken, { apply: 'true' })
  assert.equal(bad.status, 400, JSON.stringify(bad.body))
  assert.ok(isArabic(msg(bad)), msg(bad))
  assert.equal(await snapshot(), before, 'مفيش صف اتغيّر في أي محاولة من دي')
})

test('H3 — قائمة المستخدمين بتعلّم حساب الدومين، ومفيش hash بيخرج', async () => {
  const rows = expect(await http(adminToken, 'GET', '/users'), 200)
  const byEmail = Object.fromEntries(rows.map((r) => [r.email, r]))
  assert.equal(byEmail['sami@maharah.pro'].isDomainAccount, true)
  assert.equal(byEmail['maged.old@maharah.local'].isDomainAccount, true, 'الحساب المربوط بقى حساب دومين')
  assert.equal(byEmail['admin@dsync.invalid'].isDomainAccount, false)
  assert.equal(byEmail['salma@maharah.local'].isDomainAccount, false)
  for (const row of rows) {
    assert.equal(row.passwordHash, undefined, 'ممنوع أي hash يخرج')
    // الحسابات المجالية مش «منقولة محتاجة باسورد» — العلامة دي لسجل المستورد بس
    if (row.isDomainAccount) assert.notEqual(row.legacyNeedsPassword, true, row.email)
  }
})
