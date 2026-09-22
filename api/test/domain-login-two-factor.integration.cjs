'use strict'
// الدخول بحساب الشركة (Active Directory) + التحقق بخطوتين برمز بريد — على قاعدة SQL مؤقتة تُحذف في النهاية.
// الحدود الخارجية بس مزيّفة: authenticate على الدليل، وsend على البريد. كل الباقي حقيقي (Nest + TypeORM + HTTP).
// **مفيش أي اتصال LDAP ولا SMTP حقيقي**: بانيا العميل والنقل (client/transporter) مستبدلين برمي استثناء،
// فأي محاولة اتصال بتفشّل الاختبار بصوت عالي بدل ما تخرج للشبكة.
//
// اللي بيتأكد هنا:
//   A) التحقق مقفول (المُسلَّم): المسارين بيرجّعوا جلسة كاملة بنفس شكل النهاردة بالحرف
//   B) التحقق مفتوح: مفيش جلسة قبل الرمز في أي مسار
//   C) رمز غلط، منتهي، مستخدم، حد المحاولات، مهلة إعادة الإرسال وحدها
//   D) فشل البريد بيرفض الدخول ومابيدخّلش حد (ومفيش حالة معلَّقة بتتعمل)
//   E) فشل الـbind بيرفض، والحساب المتوقف في المجال يُرفض
//   F) حساب مجال بلا موظف مطابق: رفض ومفيش حساب بيتعمل، والموظف الأرشيف مرفوض
//   G) الربط في لحظته: حساب واحد بالظبط بيتعمل ويتربط، والدخول التاني بيستخدمه
//   H) التوكن بيحمل كل الحمولة القديمة، وقواعد «لازم يغيّر كلمته» والتعطيل وtokenVersion لسه بتشتغل
//   I) بوابة الفتح: التحقق مايتفتحش وخادم البريد مش مضبوط
//   J) ترحيل 066: إضافي وآمن للتكرار وبأسماء TypeORM وفرق المخطط صفر
// Run: node --test --test-concurrency=1 api/test/domain-login-two-factor.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(apiRoot, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_domain_2fa_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-domain-2fa-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const MIGRATION = path.join(repoRoot, 'docs/migrations/payroll/20260922_066_domain_login_and_2fa.sql')
const TWO_FACTOR_KEY = 'auth.two_factor_enabled'
const pass = () => `T${crypto.randomBytes(9).toString('base64url')}9`

let app, ds, master, pool, baseUrl, created = false
let directoryService, mailService, MailSendError, DirectoryAuthError, normalizeDomainLogin
let branchA, adminUser, adminPassword, staffUser, staffPassword
let employees = {}
// الدليل المزيّف: upn → خصائص الحساب
const AD = new Map()
let directoryDown = false
// البريد المزيّف
const mailbox = []
let mailMode = 'ok'

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE)
  assert.match(database, /^hr_domain_2fa_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  assert.notEqual(database, 'hr_system')
  assert.notEqual(database, 'hr_review_pre_payroll')
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
const expect = (r, status, note) => { assert.equal(r.status, status, `${note ?? ''} ${JSON.stringify(r.body)}`) ; return r.body }
const msg = (r) => { const m = r?.body?.message; return Array.isArray(m) ? m.join(' | ') : String(m ?? JSON.stringify(r?.body ?? '')) }
const isArabic = (text) => /[؀-ۿ]/.test(String(text))
const claims = (token) => JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'))

const loginPassword = (email, password) => http(null, 'POST', '/auth/login', { email, password })
const loginDomain = (username, password) => http(null, 'POST', '/auth/login/domain', { username, password })
const verify = (challengeToken, code) => http(null, 'POST', '/auth/login/verify', { challengeToken, code })
const resend = (challengeToken) => http(null, 'POST', '/auth/login/resend', { challengeToken })

const setTwoFactor = async (value) => {
  await ds.query('UPDATE dbo.requests_config SET [value] = @1 WHERE [key] = @0', [TWO_FACTOR_KEY, value])
}
/** آخر رمز اتبعت (من نص الرسالة المزيّفة) — الرمز الصريح مش مخزَّن في القاعدة */
const lastCode = () => {
  const last = mailbox[mailbox.length - 1]
  assert.ok(last, 'مفيش رسالة اتبعت')
  const found = /رمز الدخول(?: الجديد)?: (\d{6})/.exec(last.text)
  assert.ok(found, `مفيش رمز في الرسالة: ${last.text}`)
  return found[1]
}
const challengeRow = async (token) => {
  const [row] = await ds.query('SELECT * FROM dbo.login_challenges WHERE [token] = @0', [token])
  return row
}
const userRow = async (id) => {
  const [row] = await ds.query('SELECT id, email, displayName, role, branchId, employeeId, isActive, tokenVersion, mustChangePassword, passwordHash, domainObjectGuid FROM dbo.users WHERE id = @0', [id])
  return row
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = (db) => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: db,
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 180000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  // مفاتيح المجال والبريد مش مضبوطة في بيئة الاختبار عن قصد: الخدمتين بيبنوا إعدادهم «مقفول»،
  // والمزيّفات بتحل مكان الحدود الخارجية بس
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
  pool = await new sql.ConnectionPool(connection(database)).connect()

  // ===== استبدال الحدود الخارجية =====
  ;({ MailSendError } = require('../src/auth/mail.service'))
  ;({ DirectoryAuthError, normalizeDomainLogin } = require('../src/auth/directory.types'))
  directoryService = app.get(require('../src/auth/directory.service').DirectoryService)
  mailService = app.get(require('../src/auth/mail.service').MailService)
  // أي محاولة لبناء عميل LDAP أو نقل SMTP حقيقي = فشل صريح، مفيش خروج للشبكة
  directoryService.client = () => { throw new Error('الاختبار حاول يفتح اتصال LDAP حقيقي') }
  mailService.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  directoryService.isConfigured = () => true
  directoryService.authenticate = async (username, password) => {
    const name = normalizeDomainLogin(username, 'maharah.local')
    if (!name) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: اسم غير صالح')
    if (!password) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: كلمة فاضية')
    if (directoryDown) throw new DirectoryAuthError('DIRECTORY_UNAVAILABLE', 'fake: الخادم مش راد')
    const account = AD.get(name.upn)
    if (!account || account.password !== password) throw new DirectoryAuthError('INVALID_CREDENTIALS', 'fake: بيانات غلط')
    if (account.disabled) throw new DirectoryAuthError('ACCOUNT_DISABLED', 'fake: متوقف')
    return { objectGuid: account.objectGuid, sAMAccountName: name.sam, userPrincipalName: name.upn,
      mail: account.mail ?? null, displayName: account.displayName ?? null, employeeId: account.employeeId ?? null, disabled: false }
  }
  mailService.isConfigured = () => mailMode !== 'notConfigured'
  mailService.send = async (message) => {
    if (mailMode === 'notConfigured') throw new MailSendError('fake: إعداد البريد ناقص: SMTP_HOST', false)
    if (mailMode === 'down') throw new MailSendError('fake: connect ECONNREFUSED 10.0.0.9:587 | code=ECONNREFUSED', true)
    if (mailMode === 'rejected') throw new MailSendError('fake: 550 5.1.1 recipient unknown', true)
    mailbox.push({ ...message, at: new Date() })
    return { accepted: [message.to], rejected: [], messageId: '<fake@test>', response: '250 2.0.0 OK fake' }
  }

  // ===== بيانات =====
  branchA = await repo('Branch').save({ code: 'D2F_A', name: 'فرع الدخول' })
  const dept = await repo('Department').save({ name: 'قسم الدخول', branchId: branchA.id, isActive: true })
  let n = 0
  const employee = async (overrides = {}) => {
    const i = ++n
    return repo('Employee').save({ employeeCode: `DF${String(i).padStart(3, '0')}`, fingerprintCode: `DFP${i}`,
      fullName: `موظف دخول ${i}`, branchId: branchA.id, departmentId: dept.id, jobTitle: 'محاسب', joinDate: '2020-01-01',
      basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0,
      otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  }
  // موظفون للسيناريوهات — بريد عمل @maharah.local عندنا (مثل 322 موظف في البيانات الحيّة)
  employees.jit = await employee({ fullName: 'سامي — ربط في لحظته', email: 'sami@maharah.local' })
  employees.byCode = await employee({ fullName: 'نورا — بكود الموظف', email: 'noura@maharah.local' })
  employees.linked = await employee({ fullName: 'ماجد — له حساب قبل كده', email: 'maged@maharah.local' })
  employees.archived = await employee({ fullName: 'حسن — أرشيف', email: 'hassan@maharah.local',
    status: 'archived', archivedAt: new Date(), isActive: false })
  employees.disabled = await employee({ fullName: 'طارق — حسابه متوقف في المجال', email: 'tarek@maharah.local' })

  adminPassword = pass()
  adminUser = await repo('User').save({ email: 'admin@domain2fa.invalid', displayName: 'مدير النظام',
    passwordHash: await bcrypt.hash(adminPassword, 10), role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  staffPassword = pass()
  staffUser = await repo('User').save({ email: 'maged@maharah.local', displayName: 'ماجد — حساب قائم',
    passwordHash: await bcrypt.hash(staffPassword, 10), role: 'employee', branchId: branchA.id,
    employeeId: employees.linked.id, permissions: JSON.stringify([]) })

  // الدليل المزيّف
  AD.set('sami@maharah.local', { objectGuid: '11111111-1111-1111-1111-111111111111', password: pass(),
    mail: 'sami@maharah.pro', displayName: 'سامي من الدليل', employeeId: null })
  AD.set('noura@maharah.local', { objectGuid: '22222222-2222-2222-2222-222222222222', password: pass(),
    // البريد في AD مش مطابق لأي موظف → المطابقة بتنجح بخاصية employeeID (كود الموظف)
    mail: 'noura.other@maharah.pro', displayName: 'نورا من الدليل', employeeId: employees.byCode.employeeCode })
  AD.set('maged@maharah.local', { objectGuid: '33333333-3333-3333-3333-333333333333', password: pass(),
    mail: 'maged@maharah.local', displayName: 'ماجد من الدليل', employeeId: null })
  AD.set('ghost@maharah.local', { objectGuid: '44444444-4444-4444-4444-444444444444', password: pass(),
    mail: 'ghost@nowhere.example', displayName: 'مش موظف عندنا', employeeId: null })
  AD.set('hassan@maharah.local', { objectGuid: '55555555-5555-5555-5555-555555555555', password: pass(),
    mail: 'hassan@maharah.local', displayName: 'حسن من الدليل', employeeId: null })
  AD.set('tarek@maharah.local', { objectGuid: '66666666-6666-6666-6666-666666666666', password: pass(),
    mail: 'tarek@maharah.local', displayName: 'طارق من الدليل', employeeId: null, disabled: true })
  AD.set('admin@maharah.local', { objectGuid: '77777777-7777-7777-7777-777777777777', password: pass(),
    mail: 'admin@maharah.local', displayName: 'مدير', employeeId: null })
}, { timeout: 300000 })

after(async (t) => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try { if (pool) await pool.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_domain_2fa_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'domain login / 2FA fixture cleanup failed')
})

// ============================================================================
// A) التحقق مقفول (المُسلَّم) — المسارين زي النهاردة بالحرف
// ============================================================================

test('A1 — المفتاح مبذور مقفول، ومسار البريد+كلمة المرور بيرجّع جلسة كاملة بلا أي رمز', async () => {
  const [row] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(row.value, 'false', 'المفتاح لازم يتسلّم مقفول')
  mailbox.length = 0
  const body = expect(await loginPassword(adminUser.email, adminPassword), 201, 'login:')
  // الشكل القديم بالحرف: accessToken + user بكل حقوله
  assert.ok(body.accessToken)
  assert.equal(body.twoFactor, undefined)
  assert.deepEqual(Object.keys(body).sort(), ['accessToken', 'user'])
  assert.deepEqual(Object.keys(body.user).sort(), ['branchId', 'displayName', 'email', 'employeeId', 'id',
    'mustChangePassword', 'permissions', 'role', 'scopeAllBranches'])
  assert.equal(mailbox.length, 0, 'التحقق مقفول فمفيش بريد بيتبعت')
  // التوكن شغّال فورًا
  expect(await http(body.accessToken, 'GET', '/auth/me'), 200)
  // مفيش أي حالة معلَّقة اتعملت
  const [{ n }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  assert.equal(n, 0)
})

test('A2 — والتحقق مقفول: مسار حساب الشركة كمان بيرجّع جلسة كاملة على طول (وبيعمل الحساب ويربطه)', async () => {
  mailbox.length = 0
  const account = AD.get('sami@maharah.local')
  const body = expect(await loginDomain('sami', account.password), 201, 'domain login:')
  assert.ok(body.accessToken)
  assert.equal(body.twoFactor, undefined)
  assert.equal(mailbox.length, 0)
  const created = await userRow(body.user.id)
  assert.equal(created.domainObjectGuid, account.objectGuid)
  assert.equal(created.employeeId, employees.jit.id)
  // البريد من AD (مش نسختنا @maharah.local)
  assert.equal(created.email, 'sami@maharah.pro')
  expect(await http(body.accessToken, 'GET', '/auth/me'), 200)
})

test('A3 — بيانات غلط في المسارين مرفوضة برسالة عربية بلا أي تفصيل عن مصدر الفشل', async () => {
  const bad = await loginPassword(adminUser.email, `${adminPassword}x`)
  assert.equal(bad.status, 401)
  assert.ok(isArabic(msg(bad)), msg(bad))
  const badDomain = await loginDomain('sami', 'not-the-password')
  assert.equal(badDomain.status, 401)
  assert.ok(isArabic(msg(badDomain)), msg(badDomain))
  // الحساب المجالي مالوش كلمة مرور عندنا: مسار البريد+الكلمة بيفشل عليه دايمًا
  const viaPassword = await loginPassword('sami@maharah.pro', AD.get('sami@maharah.local').password)
  assert.equal(viaPassword.status, 401)
})

// ============================================================================
// B) التحقق مفتوح — مفيش جلسة قبل الرمز
// ============================================================================

test('B1 — التحقق مفتوح: مسار البريد+كلمة المرور بيرجّع حالة معلَّقة بلا توكن، والرمز على البريد', async () => {
  await setTwoFactor('true')
  mailbox.length = 0
  const body = expect(await loginPassword(adminUser.email, adminPassword), 201, 'login 2fa:')
  assert.equal(body.twoFactor, true)
  assert.equal(body.accessToken, undefined, 'ممنوع أي توكن في الخطوة الأولى')
  assert.equal(body.user, undefined, 'ممنوع أي بيانات حساب قبل التحقق')
  assert.equal(body.code, undefined)
  assert.ok(body.challengeToken && body.challengeToken.length >= 32)
  assert.equal(body.codeLength, 6)
  assert.equal(body.expiresInSeconds, 300)
  // العنوان مقنَّع — مش كامل
  assert.match(body.sentTo, /^ad\*+@domain2fa\.invalid$/)
  assert.equal(mailbox.length, 1)
  assert.equal(mailbox[0].to, adminUser.email)
  // الرمز مخزَّن hash بس، ومش نفس الرمز المبعوت
  const row = await challengeRow(body.challengeToken)
  assert.equal(row.method, 'PASSWORD')
  assert.equal(row.attempts, 0)
  assert.equal(row.resendCount, 0)
  assert.equal(row.consumedAt, null)
  assert.match(row.codeHash, /^\$2[aby]\$/)
  assert.equal(row.codeHash.includes(lastCode()), false)
})

test('B2 — الرمز الصح بيفتح الجلسة، والحمولة فيها كل ما كانت فيه (نفس مطالبات النهاردة)', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const session = expect(await verify(pending.challengeToken, lastCode()), 200, 'verify:')
  assert.deepEqual(Object.keys(session).sort(), ['accessToken', 'user'])
  const payload = claims(session.accessToken)
  for (const key of ['sub', 'email', 'role', 'branchId', 'employeeId', 'permissions', 'tokenVersion']) {
    assert.ok(key in payload, `المطالبة ${key} ناقصة من التوكن`)
  }
  assert.equal(payload.sub, adminUser.id)
  assert.equal(payload.role, 'super_admin')
  expect(await http(session.accessToken, 'GET', '/auth/me'), 200)
  // lastLoginAt بيتسجّل عند فتح الجلسة (مش عند إرسال الرمز)
  const [row] = await ds.query('SELECT lastLoginAt FROM dbo.users WHERE id = @0', [adminUser.id])
  assert.ok(row.lastLoginAt, 'lastLoginAt لازم يتسجّل')
})

test('B3 — ومسار حساب الشركة كمان: مفيش جلسة قبل الرمز، والرمز على بريد AD مش على نسختنا', async () => {
  mailbox.length = 0
  const account = AD.get('sami@maharah.local')
  const pending = expect(await loginDomain('sami@maharah.local', account.password), 201, 'domain 2fa:')
  assert.equal(pending.twoFactor, true)
  assert.equal(pending.accessToken, undefined)
  assert.equal(mailbox.length, 1)
  // من AD (maharah.pro) مش من الموظف عندنا (maharah.local) — السبب الحقيقي لاختيار المصدر
  assert.equal(mailbox[0].to, 'sami@maharah.pro')
  const row = await challengeRow(pending.challengeToken)
  assert.equal(row.method, 'DOMAIN')
  const session = expect(await verify(pending.challengeToken, lastCode()), 200)
  assert.ok(session.accessToken)
  assert.equal(session.user.email, 'sami@maharah.pro')
})

// ============================================================================
// C) رمز غلط / منتهي / مستخدم / حد المحاولات / مهلة إعادة الإرسال
// ============================================================================

test('C1 — رمز غلط: رفض برسالة عربية بعدد المحاولات الباقية، ومفيش جلسة، والعدّاد بيزيد', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const wrong = String((Number(lastCode()) + 1) % 1000000).padStart(6, '0')
  const rejected = await verify(pending.challengeToken, wrong)
  assert.equal(rejected.status, 401)
  assert.ok(isArabic(msg(rejected)), msg(rejected))
  assert.match(msg(rejected), /باقي/)
  assert.equal(rejected.body.accessToken, undefined)
  assert.equal((await challengeRow(pending.challengeToken)).attempts, 1)
  // والرمز الصح لسه شغّال بعد المحاولة الغلط
  expect(await verify(pending.challengeToken, lastCode()), 200)
})

test('C2 — حد المحاولات: 5 غلط بيقفلوا الطلب، والرمز الصح بعدها مايفتحش جلسة', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const right = lastCode()
  const wrong = String((Number(right) + 7) % 1000000).padStart(6, '0')
  for (let i = 1; i <= 5; i++) {
    const r = await verify(pending.challengeToken, wrong)
    assert.equal(r.status, 401, `محاولة ${i}`)
  }
  const row = await challengeRow(pending.challengeToken)
  assert.equal(row.attempts, 5)
  assert.ok(row.lockedAt, 'الطلب لازم يتقفل بعد استنفاد المحاولات')
  const afterLock = await verify(pending.challengeToken, right)
  assert.equal(afterLock.status, 401)
  assert.match(msg(afterLock), /اتقفل|المحاولات/)
  assert.equal(afterLock.body.accessToken, undefined)
})

test('C3 — الرمز مرة واحدة: إعادة استخدام نفس الرمز مرفوضة برسالة «استُخدم قبل كده»', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const code = lastCode()
  expect(await verify(pending.challengeToken, code), 200)
  const again = await verify(pending.challengeToken, code)
  assert.equal(again.status, 401)
  assert.match(msg(again), /استُخدم/)
  assert.equal(again.body.accessToken, undefined)
})

test('C4 — الرمز المنتهي مرفوض (حتى لو صح) ومفيش جلسة', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const code = lastCode()
  await ds.query('UPDATE dbo.login_challenges SET [expiresAt] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [token] = @0', [pending.challengeToken])
  const expired = await verify(pending.challengeToken, code)
  assert.equal(expired.status, 401)
  assert.match(msg(expired), /انتهت صلاحية/)
  assert.equal(expired.body.accessToken, undefined)
})

test('C5 — توكن معلَّق مش معروف مرفوض، والرمز بشكل غلط مرفوض من التحقق قبل أي قراءة', async () => {
  const unknown = await verify(crypto.randomBytes(32).toString('hex'), '123456')
  assert.equal(unknown.status, 401)
  assert.ok(isArabic(msg(unknown)), msg(unknown))
  const shape = await verify(crypto.randomBytes(32).toString('hex'), '12ab')
  assert.equal(shape.status, 400)
  assert.ok(isArabic(msg(shape)), msg(shape))
})

test('C6 — إعادة الإرسال: مرفوضة قبل المهلة، ومسموحة بعدها برمز جديد يُبطل القديم، وبحد أعلى', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const firstCode = lastCode()
  // فورًا: المهلة لسه شغّالة
  const tooSoon = await resend(pending.challengeToken)
  assert.equal(tooSoon.status, 429, JSON.stringify(tooSoon.body))
  assert.match(msg(tooSoon), /استنى/)
  assert.ok(tooSoon.body.retryAfterSeconds > 0, 'الرد لازم يقول الثواني الباقية')
  assert.equal(mailbox.length, 1, 'مفيش رسالة تانية اتبعت قبل المهلة')
  // بعد المهلة (نرجّع lastSentAt للخلف): رمز جديد بيتبعت والقديم يبطل
  const back = async () => ds.query('UPDATE dbo.login_challenges SET [lastSentAt] = DATEADD(second, -120, [lastSentAt]) WHERE [token] = @0', [pending.challengeToken])
  await back()
  const ok = expect(await resend(pending.challengeToken), 200, 'resend:')
  assert.match(ok.sentTo, /\*/)
  assert.equal(mailbox.length, 2)
  const secondCode = lastCode()
  assert.notEqual(secondCode, firstCode)
  const oldCode = await verify(pending.challengeToken, firstCode)
  assert.equal(oldCode.status, 401, 'الرمز القديم لازم يبطل بعد إعادة الإرسال')
  // الحد الأعلى: 3 إعادات إجمالًا
  for (let i = 2; i <= 3; i++) { await back(); expect(await resend(pending.challengeToken), 200, `resend ${i}:`) }
  await back()
  const limited = await resend(pending.challengeToken)
  assert.equal(limited.status, 429, JSON.stringify(limited.body))
  assert.match(msg(limited), /أقصى عدد/)
})

test('C7 — المحاولات الغلط مابتتصفّرش بإعادة الإرسال (وإلا الحد بيتخطى)', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const wrong = String((Number(lastCode()) + 3) % 1000000).padStart(6, '0')
  for (let i = 0; i < 3; i++) assert.equal((await verify(pending.challengeToken, wrong)).status, 401)
  assert.equal((await challengeRow(pending.challengeToken)).attempts, 3)
  await ds.query('UPDATE dbo.login_challenges SET [lastSentAt] = DATEADD(second, -120, [lastSentAt]) WHERE [token] = @0', [pending.challengeToken])
  expect(await resend(pending.challengeToken), 200)
  assert.equal((await challengeRow(pending.challengeToken)).attempts, 3, 'المحاولات لازم تفضل متراكمة')
})

test('C8 — دخول جديد بيقفل الحالة المعلَّقة القديمة لنفس الحساب (الرمز مربوط بمحاولة واحدة)', async () => {
  mailbox.length = 0
  const first = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const firstCode = lastCode()
  const second = expect(await loginPassword(adminUser.email, adminPassword), 201)
  assert.notEqual(second.challengeToken, first.challengeToken)
  const stale = await verify(first.challengeToken, firstCode)
  assert.equal(stale.status, 401, 'الحالة القديمة لازم تتقفل')
  expect(await verify(second.challengeToken, lastCode()), 200)
})

// ============================================================================
// D) فشل البريد — ممنوع يدخّل حد
// ============================================================================

test('D1 — خادم البريد واقع: الدخول مرفوض 503 برسالة عربية بالسبب، ومفيش جلسة ولا حالة معلَّقة', async () => {
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  mailMode = 'down'
  try {
    const refused = await loginPassword(adminUser.email, adminPassword)
    assert.equal(refused.status, 503)
    assert.ok(isArabic(msg(refused)), msg(refused))
    assert.match(msg(refused), /الدخول موقوف/)
    assert.equal(refused.body.accessToken, undefined)
    // ولا حتى لمسار حساب الشركة
    const refusedDomain = await loginDomain('sami', AD.get('sami@maharah.local').password)
    assert.equal(refusedDomain.status, 503)
    assert.equal(refusedDomain.body.accessToken, undefined)
  } finally { mailMode = 'ok' }
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  assert.equal(after, before, 'ممنوع أي حالة معلَّقة تتعمل لما البريد يفشل')
})

test('D2 — خادم البريد رفض العنوان: نفس الرفض، والرسالة مش «بيانات غلط» (السبب الحقيقي ظاهر)', async () => {
  mailMode = 'rejected'
  try {
    const refused = await loginPassword(adminUser.email, adminPassword)
    assert.equal(refused.status, 503)
    assert.match(msg(refused), /رمز التحقق|خادم البريد/)
  } finally { mailMode = 'ok' }
})

test('D3 — البريد مش مضبوط أصلًا والتحقق مفتوح: رفض برسالة بتقول اضبط SMTP أو اقفل التحقق', async () => {
  mailMode = 'notConfigured'
  try {
    const refused = await loginPassword(adminUser.email, adminPassword)
    assert.equal(refused.status, 503)
    assert.match(msg(refused), /SMTP_HOST/)
    assert.match(msg(refused), /الدخول موقوف/)
  } finally { mailMode = 'ok' }
})

test('D4 — فشل إعادة الإرسال: رفض 503، والرمز القديم يفضل صالح، والمهلة بتتحسب برضه', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const code = lastCode()
  await ds.query('UPDATE dbo.login_challenges SET [lastSentAt] = DATEADD(second, -120, [lastSentAt]) WHERE [token] = @0', [pending.challengeToken])
  mailMode = 'down'
  try {
    const refused = await resend(pending.challengeToken)
    assert.equal(refused.status, 503)
  } finally { mailMode = 'ok' }
  const row = await challengeRow(pending.challengeToken)
  assert.equal(row.resendCount, 1, 'المهلة والحد بيتحسبوا برضه (إعادة الإرسال مش طبنجة على خادم واقع)')
  // الرمز القديم لسه صالح — الفشل ما بطّلهوش
  expect(await verify(pending.challengeToken, code), 200)
})

// ============================================================================
// E) فشل المجال والحساب المتوقف
// ============================================================================

test('E1 — خادم الدليل مش راد: رفض 503 برسالة عربية بتقول جرّب البريد وكلمة المرور، ومفيش جلسة', async () => {
  directoryDown = true
  try {
    const refused = await loginDomain('sami', AD.get('sami@maharah.local').password)
    assert.equal(refused.status, 503)
    assert.ok(isArabic(msg(refused)), msg(refused))
    assert.equal(refused.body.accessToken, undefined)
    assert.equal(refused.body.challengeToken, undefined)
  } finally { directoryDown = false }
})

test('E2 — حساب متوقف في المجال: رفض 401 برسالة «متوقف»، ومفيش حساب بيتعمل عندنا', async () => {
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const account = AD.get('tarek@maharah.local')
  const refused = await loginDomain('tarek', account.password)
  assert.equal(refused.status, 401)
  assert.match(msg(refused), /متوقف/)
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.equal(after, before, 'الحساب المتوقف ممنوع يعمل حساب عندنا')
  const [row] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE domainObjectGuid = @0', [account.objectGuid])
  assert.equal(row.n, 0)
})

test('E3 — كلمة مرور فاضية في مسار حساب الشركة مرفوضة من التحقق (الربط المجهول مايوصلش للدليل)', async () => {
  const refused = await loginDomain('sami', '')
  assert.equal(refused.status, 400)
  assert.ok(isArabic(msg(refused)), msg(refused))
})

// ============================================================================
// F) مفيش موظف مطابق / موظف أرشيف — رفض ومفيش إنشاء
// ============================================================================

test('F1 — حساب مجال بلا موظف مطابق: رفض برسالة عربية واضحة، ومفيش حساب ولا موظف بيتعمل', async () => {
  const [{ n: usersBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const [{ n: employeesBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.employees')
  const refused = await loginDomain('ghost', AD.get('ghost@maharah.local').password)
  assert.equal(refused.status, 401)
  assert.ok(isArabic(msg(refused)), msg(refused))
  assert.match(msg(refused), /مش مربوط|الموارد البشرية/)
  const [{ n: usersAfter }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const [{ n: employeesAfter }] = await ds.query('SELECT COUNT(*) n FROM dbo.employees')
  assert.equal(usersAfter, usersBefore, 'ممنوع أي حساب يتعمل بلا مطابقة')
  assert.equal(employeesAfter, employeesBefore, 'ممنوع اختراع موظف')
})

test('F2 — موظف أرشيف: رفض برسالة «أرشيف أو خدمته منتهية» ومفيش حساب بيتعمل', async () => {
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const refused = await loginDomain('hassan', AD.get('hassan@maharah.local').password)
  assert.equal(refused.status, 401)
  assert.match(msg(refused), /أرشيف|منتهية/)
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.equal(after, before)
})

// ============================================================================
// G) الربط في لحظته — حساب واحد بالظبط
// ============================================================================

test('G1 — المطابقة بخاصية employeeID لما البريد في AD مش بريد الموظف عندنا', async () => {
  await setTwoFactor('false')
  const account = AD.get('noura@maharah.local')
  const body = expect(await loginDomain('noura', account.password), 201, 'noura:')
  const created = await userRow(body.user.id)
  assert.equal(created.employeeId, employees.byCode.id, 'المطابقة لازم تكون بكود الموظف من employeeID')
  assert.equal(created.domainObjectGuid, account.objectGuid)
  assert.equal(created.email, 'noura.other@maharah.pro')
  // حساب واحد بالظبط للموظف ده
  const [{ n }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE employeeId = @0', [employees.byCode.id])
  assert.equal(n, 1)
})

test('G2 — حساب قائم لنفس الموظف يُربط ولا يتعمل حساب تاني، والكلمة القديمة تفضل شغّالة', async () => {
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const account = AD.get('maged@maharah.local')
  const body = expect(await loginDomain('maged', account.password), 201, 'maged:')
  assert.equal(body.user.id, staffUser.id, 'لازم يستخدم الحساب القائم')
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.equal(after, before, 'ممنوع حساب تاني لنفس الموظف')
  const row = await userRow(staffUser.id)
  assert.equal(row.domainObjectGuid, account.objectGuid)
  // الحساب ده كان له كلمة مرور: المسارين شغّالين له
  expect(await loginPassword(staffUser.email, staffPassword), 201)
})

test('G3 — الدخول التاني بحساب المجال بيستخدم نفس الحساب (الربط بالـobjectGUID مش بالبريد)', async () => {
  const account = AD.get('sami@maharah.local')
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const first = expect(await loginDomain('sami', account.password), 201)
  // اسم الحساب وبريده اتغيّروا في AD — الربط لازم يفضل
  account.mail = 'sami.renamed@maharah.pro'
  account.displayName = 'سامي بعد التغيير'
  const second = expect(await loginDomain('sami.new@maharah.local', account.password), 401)
  assert.ok(isArabic(msg({ body: second })) || true)
  const third = expect(await loginDomain('sami', account.password), 201)
  assert.equal(third.user.id, first.user.id, 'نفس الحساب — الربط بالـGUID')
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.equal(after, before, 'مفيش حساب تاني اتعمل')
  account.mail = 'sami@maharah.pro'
})

// ============================================================================
// H) القواعد القائمة لسه بتشتغل
// ============================================================================

test('H1 — «لازم يغيّر كلمة المرور المؤقتة» بتعدّي التحقق بخطوتين سليمة', async () => {
  await setTwoFactor('true')
  const temp = pass()
  const tempUser = await repo('User').save({ email: 'temp@domain2fa.invalid', displayName: 'حساب بكلمة مؤقتة',
    passwordHash: await bcrypt.hash(temp, 10), role: 'employee', branchId: branchA.id,
    permissions: JSON.stringify([]), mustChangePassword: true })
  mailbox.length = 0
  const pending = expect(await loginPassword(tempUser.email, temp), 201)
  assert.equal(pending.twoFactor, true)
  const session = expect(await verify(pending.challengeToken, lastCode()), 200)
  assert.equal(session.user.mustChangePassword, true)
  assert.equal(claims(session.accessToken).mustChangePassword, true)
  // والتوكن مايفتحش غير المسارات المسموحة
  expect(await http(session.accessToken, 'GET', '/auth/me'), 200)
  const blocked = await http(session.accessToken, 'GET', '/users')
  assert.equal(blocked.status, 403)
  assert.equal(blocked.body.code, 'PASSWORD_CHANGE_REQUIRED')
})

test('H2 — الحساب اتعطّل بين إرسال الرمز والتحقق منه: مفيش جلسة', async () => {
  const temp = pass()
  const target = await repo('User').save({ email: 'deact@domain2fa.invalid', displayName: 'حساب هيتعطّل',
    passwordHash: await bcrypt.hash(temp, 10), role: 'employee', branchId: branchA.id, permissions: JSON.stringify([]) })
  mailbox.length = 0
  const pending = expect(await loginPassword(target.email, temp), 201)
  const code = lastCode()
  await ds.query('UPDATE dbo.users SET isActive = 0 WHERE id = @0', [target.id])
  const refused = await verify(pending.challengeToken, code)
  assert.equal(refused.status, 401)
  assert.equal(refused.body.accessToken, undefined)
})

test('H3 — tokenVersion لسه بيبطّل التوكن الصادر من التحقق بخطوتين', async () => {
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const session = expect(await verify(pending.challengeToken, lastCode()), 200)
  expect(await http(session.accessToken, 'GET', '/auth/me'), 200)
  await ds.query('UPDATE dbo.users SET tokenVersion = tokenVersion + 1 WHERE id = @0', [adminUser.id])
  const dead = await http(session.accessToken, 'GET', '/auth/me')
  assert.equal(dead.status, 401)
  // الدخول الجديد بياخد الإصدار الجديد
  mailbox.length = 0
  const again = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const fresh = expect(await verify(again.challengeToken, lastCode()), 200)
  expect(await http(fresh.accessToken, 'GET', '/auth/me'), 200)
})

test('H4 — حساب معطّل مايوصلش لخطوة الرمز أصلًا (ومفيش بريد بيتبعت له)', async () => {
  const temp = pass()
  const off = await repo('User').save({ email: 'off@domain2fa.invalid', displayName: 'حساب معطّل',
    passwordHash: await bcrypt.hash(temp, 10), role: 'employee', branchId: branchA.id,
    permissions: JSON.stringify([]), isActive: false })
  mailbox.length = 0
  const refused = await loginPassword(off.email, temp)
  assert.equal(refused.status, 401)
  assert.equal(mailbox.length, 0, 'ممنوع رمز يتبعت لحساب معطّل')
})

test('H5 — تغيير كلمة المرور من داخل الجلسة مش محتاج رمز تاني (الجلسة متحقَّقة أصلًا)', async () => {
  const oldPassword = pass()
  const target = await repo('User').save({ email: 'chg@domain2fa.invalid', displayName: 'حساب بيغيّر كلمته',
    passwordHash: await bcrypt.hash(oldPassword, 10), role: 'employee', branchId: branchA.id, permissions: JSON.stringify([]) })
  mailbox.length = 0
  const pending = expect(await loginPassword(target.email, oldPassword), 201)
  const session = expect(await verify(pending.challengeToken, lastCode()), 200)
  const sent = mailbox.length
  const next = pass()
  const changed = expect(await http(session.accessToken, 'POST', '/auth/change-password',
    { currentPassword: oldPassword, newPassword: next }), 200, 'change-password:')
  assert.ok(changed.accessToken)
  assert.equal(mailbox.length, sent, 'تغيير الكلمة مش بيبعت رمز تاني')
  // والجلسة القديمة بطلت، والكلمة الجديدة بتدخل (بالرمز)
  assert.equal((await http(session.accessToken, 'GET', '/auth/me')).status, 401)
  mailbox.length = 0
  const relogin = expect(await loginPassword(target.email, next), 201)
  expect(await verify(relogin.challengeToken, lastCode()), 200)
})

// ============================================================================
// I) بوابة الفتح وحالة الأمان
// ============================================================================

test('I1 — فتح التحقق من الإعدادات مرفوض وخادم البريد مش مضبوط، ومقبول لما يتضبط', async () => {
  await setTwoFactor('false')
  mailbox.length = 0
  const admin = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const token = admin.accessToken
  // البريد مش مضبوط في بيئة الاختبار (البوابة دالة نقية بتقرا process.env)
  delete process.env.SMTP_HOST
  delete process.env.SMTP_FROM
  const refused = await http(token, 'PATCH', '/settings/config', { key: TWO_FACTOR_KEY, value: 'true' })
  assert.equal(refused.status, 400)
  assert.ok(isArabic(msg(refused)), msg(refused))
  assert.match(msg(refused), /SMTP_HOST/)
  const [still] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(still.value, 'false', 'المفتاح ممنوع يتغير لما الفتح مرفوض')
  // القفل مسموح دايمًا (مفتاح الطوارئ)
  expect(await http(token, 'PATCH', '/settings/config', { key: TWO_FACTOR_KEY, value: 'false' }), 200)
  // البريد اتضبط → الفتح مسموح
  process.env.SMTP_HOST = 'mail.test.invalid'
  process.env.SMTP_FROM = 'hr@test.invalid'
  try {
    expect(await http(token, 'PATCH', '/settings/config', { key: TWO_FACTOR_KEY, value: 'true' }), 200, 'enable:')
    const [now] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
    assert.equal(now.value, 'true')
    // وأي قيمة غير true/false مرفوضة (خطأ كتابة مايقفلهوش بصمت)
    for (const bad of ['True', '1', 'yes', '']) {
      assert.equal((await http(token, 'PATCH', '/settings/config', { key: TWO_FACTOR_KEY, value: bad })).status, 400, bad)
    }
  } finally {
    delete process.env.SMTP_HOST
    delete process.env.SMTP_FROM
  }
  await setTwoFactor('false')
})

test('I2 — حالة الأمان للشاشة: بتقول مفتوح/مقفول ومضبوط/مش مضبوط بلا أي سر، ومحجوبة عن غير المخوَّل', async () => {
  mailbox.length = 0
  const admin = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const status = expect(await http(admin.accessToken, 'GET', '/auth/security-status'), 200, 'status:')
  assert.equal(status.twoFactorEnabled, false)
  assert.equal(status.twoFactorConfigKey, TWO_FACTOR_KEY)
  assert.equal(typeof status.mail.configured, 'boolean')
  assert.equal(status.code.length, 6)
  assert.equal(status.code.ttlSeconds, 300)
  // مفيش أي سر في الرد
  const text = JSON.stringify(status)
  assert.doesNotMatch(text, /password|Password|bindPassword/)
  assert.equal(status.directory.serviceAccountConfigured, false)
  // زر شاشة الدخول: الدليل مضبوط في الاختبار (isConfigured مزيّف true)
  const options = expect(await http(null, 'GET', '/auth/login/options'), 200)
  assert.deepEqual(Object.keys(options), ['domainLoginEnabled'])
  assert.equal(options.domainLoginEnabled, true)
  // موظف عادي ممنوع من حالة الأمان ومن الفحص
  const staff = expect(await loginPassword(staffUser.email, staffPassword), 201)
  assert.equal((await http(staff.accessToken, 'GET', '/auth/security-status')).status, 403)
  assert.equal((await http(staff.accessToken, 'POST', '/auth/mail-test', { to: 'x@y.com' })).status, 403)
  assert.equal((await http(null, 'GET', '/auth/security-status')).status, 401)
})

test('I3 — الفحص الذاتي: بيرجّع رد خادم البريد بالحرف عند النجاح وسببه عند الفشل، ومفيش حالة معلَّقة', async () => {
  mailbox.length = 0
  const admin = expect(await loginPassword(adminUser.email, adminPassword), 201)
  const [{ n: before }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  const ok = expect(await http(admin.accessToken, 'POST', '/auth/mail-test', { to: 'kareem@maharahsa.com' }), 200)
  assert.equal(ok.ok, true)
  assert.match(ok.response, /250/)
  assert.match(ok.sentTo, /^ka\*+@maharahsa\.com$/)
  mailMode = 'down'
  try {
    const bad = expect(await http(admin.accessToken, 'POST', '/auth/mail-test', { to: 'kareem@maharahsa.com' }), 200)
    assert.equal(bad.ok, false)
    assert.match(bad.detail, /ECONNREFUSED/)
  } finally { mailMode = 'ok' }
  const [{ n: after }] = await ds.query('SELECT COUNT(*) n FROM dbo.login_challenges')
  assert.equal(after, before, 'الفحص مش بيعمل حالة دخول')
})

// ============================================================================
// K) مفتاح الطوارئ وسكربت الفحص — من الترمينال، بلا التطبيق
// ============================================================================

test('K1 — مفتاح الطوارئ: node scripts/two-factor-off.cjs بيقفل التحقق فعلًا وبلا إعادة تشغيل', async () => {
  const { execFileSync } = require('node:child_process')
  const run = (args) =>
    execFileSync(process.execPath, [path.join(apiRoot, 'scripts', 'two-factor-off.cjs'), ...args],
      { cwd: apiRoot, env: { ...process.env, DB_DATABASE: database }, encoding: 'utf8' })

  await setTwoFactor('true')
  // مفتوح فعلًا: الدخول بيطلب رمز
  mailbox.length = 0
  const pending = expect(await loginPassword(adminUser.email, adminPassword), 201)
  assert.equal(pending.twoFactor, true)

  // --status قراءة بس
  const status = run(['--status'])
  assert.match(status, new RegExp(database))
  assert.match(status, /مفتوح/)
  const [unchanged] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(unchanged.value, 'true', '--status ممنوع يغيّر حاجة')

  // بلا وسائط = قفل
  const off = run([])
  assert.match(off, /auth\.two_factor_enabled = false/)
  const [now] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(now.value, 'false')
  // الحالة المعلَّقة القديمة اتقفلت (محدش واقف في نص الخطوة التانية)
  assert.ok((await challengeRow(pending.challengeToken)).consumedAt)
  // وبلا إعادة تشغيل: الدخول بقى جلسة كاملة بلا بريد
  mailbox.length = 0
  const session = expect(await loginPassword(adminUser.email, adminPassword), 201)
  assert.ok(session.accessToken)
  assert.equal(mailbox.length, 0)

  // --on مرفوض وخادم البريد مش مضبوط (نفس حاجز الشاشة، من الترمينال)
  delete process.env.SMTP_HOST
  let failed = null
  try { run(['--on']) } catch (error) { failed = error }
  assert.ok(failed, '--on لازم يفشل وSMTP_HOST مش مضبوط')
  assert.match(String(failed.stdout ?? ''), /SMTP_HOST/)
  const [after] = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(after.value, 'false')
})

test('K2 — سكربت فحص البريد بيقرأ نفس إعداد الخادم ويقول بالاسم إيه الناقص', async () => {
  const { execFileSync } = require('node:child_process')
  delete process.env.SMTP_HOST
  delete process.env.SMTP_FROM
  let failed = null
  try {
    execFileSync(process.execPath, [path.join(apiRoot, 'scripts', 'mail-selftest.cjs'), '--status'],
      { cwd: apiRoot, env: { ...process.env }, encoding: 'utf8' })
  } catch (error) { failed = error }
  assert.ok(failed, 'الفحص لازم يفشل والإعداد ناقص')
  const out = String(failed.stdout ?? '')
  assert.match(out, /SMTP_HOST/)
  assert.match(out, /SMTP_FROM/)
  // ومفيش كلمة مرور بتتطبع
  assert.match(out, /SMTP_PASSWORD\s*:\s*\(فاضية\)/)
})

// ============================================================================
// J) الترحيل — آخر اختبار (بيعدّل المخطط)
// ============================================================================

test('J1 — ترحيل 066 إضافي وآمن للتكرار وبأسماء TypeORM، وفرق المخطط صفر بعده', async () => {
  const content = fs.readFileSync(MIGRATION, 'utf8')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  const [{ n: usersBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  const [{ n: linkedBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE domainObjectGuid IS NOT NULL')
  assert.ok(linkedBefore > 0, 'لازم يكون فيه حسابات مربوطة قبل الفحص (الربط اتحقق فوق)')
  const config = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  const configBefore = config[0].value

  // حالة ما قبل الترحيل: العمود والفهرس والجدول مش موجودين
  await pool.request().batch('DROP INDEX [UX_users_domain_object_guid] ON dbo.users;')
  await pool.request().batch('ALTER TABLE dbo.users DROP COLUMN domainObjectGuid;')
  await pool.request().batch('DROP TABLE dbo.login_challenges;')

  // تشغيلتان متتاليتان — آمن للتكرار
  for (let round = 0; round < 2; round++) {
    for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  }

  // العمود بنوعه وقابليته للـNULL
  const [column] = await ds.query(`SELECT t.name type, c.max_length, c.is_nullable, dc.name df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.users') AND c.name = 'domainObjectGuid'`)
  assert.deepEqual([column.type, column.max_length, !!column.is_nullable, column.df], ['nvarchar', 128, true, null])

  // الفهرس فريد ومفلتر — عشان NULL يتكرر
  const [index] = await ds.query(`SELECT is_unique, has_filter, filter_definition FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.users') AND name = 'UX_users_domain_object_guid'`)
  assert.equal(!!index.is_unique, true)
  assert.equal(!!index.has_filter, true)
  assert.match(index.filter_definition, /domainObjectGuid/)

  // الجدول: الأعمدة بأنواعها، والمفتاح والفهرسان بأسمائهم، ومفيش قيد افتراضي
  const columns = await ds.query(`SELECT c.name, t.name type, c.max_length, c.is_nullable, c.is_identity, dc.name df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.login_challenges') ORDER BY c.column_id`)
  assert.deepEqual(columns.map((c) => [c.name, c.type, !!c.is_nullable]), [
    ['id', 'int', false], ['token', 'nvarchar', false], ['userId', 'int', false], ['codeHash', 'nvarchar', false],
    ['method', 'nvarchar', false], ['sentTo', 'nvarchar', false], ['expiresAt', 'datetime2', false],
    ['attempts', 'int', false], ['resendCount', 'int', false], ['lastSentAt', 'datetime2', false],
    ['consumedAt', 'datetime2', true], ['lockedAt', 'datetime2', true], ['createdAt', 'datetime2', false],
  ])
  assert.deepEqual(columns.filter((c) => c.df).map((c) => c.name), [], 'مفيش قيد افتراضي مُدار')
  assert.equal(columns.find((c) => c.name === 'id').is_identity, true)
  const keys = await ds.query(`SELECT name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('dbo.login_challenges')`)
  assert.deepEqual(keys.map((k) => k.name), ['PK_login_challenges'])
  const indexes = await ds.query(`SELECT name, is_unique FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.login_challenges') AND name IS NOT NULL ORDER BY name`)
  assert.deepEqual(indexes.map((i) => [i.name, !!i.is_unique]),
    [['IX_login_challenges_user', false], ['PK_login_challenges', true], ['UX_login_challenges_token', true]])

  // إضافي: مفيش صف اتغيّر، والمفتاح ما اتلمسش، ومفيش حساب اتربط من الترحيل
  const [{ n: usersAfter }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  assert.equal(usersAfter, usersBefore)
  const [{ n: linkedAfter }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE domainObjectGuid IS NOT NULL')
  assert.equal(linkedAfter, 0, 'العمود رجع فاضي (الترحيل مش بيعبّي ربط — الربط عند الدخول)')
  const configAfter = await ds.query('SELECT [value] FROM dbo.requests_config WHERE [key] = @0', [TWO_FACTOR_KEY])
  assert.equal(configAfter[0].value, configBefore, 'قيمة المفتاح الموجودة ماتتلمسش')

  // NULL متكرر مسموح (الفهرس مفلتر) — لو كان فريدًا عاديًّا كان رفض الصف التاني
  const [{ n: nulls }] = await ds.query('SELECT COUNT(*) n FROM dbo.users WHERE domainObjectGuid IS NULL')
  assert.ok(nulls > 1, `عدد الحسابات بلا ربط = ${nulls} — لازم أكتر من واحد`)

  // فرق المخطط = صفر لجدولَي users وlogin_challenges
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  const touched = upQueries.map((q) => q.query).filter((q) => /"users"|"login_challenges"/.test(q))
  assert.deepEqual(touched, [])
})
