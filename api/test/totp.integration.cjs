// B2.17 (ج): التحقق بتطبيق مصادقة (TOTP) — التفعيل والإلغاء، وخطوة الرمز في الدخول (مرة واحدة، وقفل بعد رموز غلط)، والإلزام بالدور
// (الجلسة مابتفتحش غير التفعيل)، وإعادة الضبط من المدير. HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
// ولا رسالة بريد حقيقية: send متبدّلة على النسخة نفسها.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_totp_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-totp-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/totp')
const { TOTP_MAX_FAILURES } = require('../src/auth/totp.service')
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
let app, master, ds, base, created = false
const mailbox = []
const U = {}, P = {}, B = {}, S = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const query = (text, params) => { assert.equal(ds.options.database, database); return ds.query(text, params) }
async function http(method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null, cookies: response.headers.getSetCookie() }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const bearer = token => ({ Authorization: `Bearer ${token}` })
const login = (key, extra = {}) => http('POST', '/auth/login', { email: U[key].email, password: P[key], ...extra })
/** رمز التطبيق لسر (النص اللي الخادم رجّعه) عند خطوة زمنية (الافتراضي: دلوقتي) */
const stepNow = () => rules.totpStepAt(Date.now())
const codeOf = (secretText, step = stepNow()) => rules.totpCode(rules.base32Decode(secretText), step)
const wrongOf = code => String((Number(code) + 1) % 1000000).padStart(6, '0')
const rowOf = async key => (await query('SELECT [secret], [confirmedAt], [lastStep], [failedCount], [lockedUntil] FROM [user_totp] WHERE [userId] = @0', [U[key].id]))[0] ?? null
/** الرمز مرة واحدة: الاختبار بيرجّع «آخر خطوة اتقبلت» لورا عشان رمز الخطوة الحالية يتقبل تاني من غير انتظار 30 ثانية */
const rewind = key => query('UPDATE [user_totp] SET [lastStep] = NULL, [failedCount] = 0, [lockedUntil] = NULL WHERE [userId] = @0', [U[key].id])
const config = async (key, value) => { const row = await repo('RequestsConfig').findOneBy({ key }); await repo('RequestsConfig').save(row ? { ...row, value } : { key, value }) }
const audits = action => repo('AuditLog').count({ where: { action } })
/** تفعيل كامل لحساب بجلسة Bearer: بيرجّع السر */
async function enroll(key) {
  const session = expect(await login(key), 201)
  const setup = expect(await http('POST', '/auth/totp/setup', undefined, bearer(session.accessToken)), 200)
  expect(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, bearer(session.accessToken)), 200)
  S[key] = setup.secret
  await rewind(key)
  return setup.secret
}
/** دخول حساب مفعّل: الحالة المعلّقة ثم الرمز → التوكن */
async function signIn(key) {
  const challenge = expect(await login(key), 201)
  assert.equal(challenge.kind, 'TOTP')
  const done = expect(await http('POST', '/auth/login/verify', { challengeToken: challenge.challengeToken, code: codeOf(S[key]) }), 200)
  await rewind(key)
  return done.accessToken
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_totp_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20',
    FRONTEND_URL: 'http://localhost:3000' })
  delete process.env.SESSION_COOKIE_SAMESITE; delete process.env.SESSION_COOKIE_SECURE
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية: رمز البريد بيتسجّل في mailbox بس
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  mail.isConfigured = () => true
  mail.send = async message => { mailbox.push(message); return { messageId: 'test', response: '250 OK (test)', accepted: [message.to], rejected: [] } }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  B.a = await repo('Branch').save({ code: 'TPA', name: 'فرع المصادقة أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'TPB', name: 'فرع المصادقة ب', country: 'EG', weekendDays: 'FRI' })
  const account = async (key, role, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@totp.invalid`, displayName: `حساب ${key}`, role, permissions: '[]', isActive: true, branchId: B.a.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  await account('admin', 'super_admin', { branchId: null })
  await account('worker', 'employee'); await account('guard', 'employee'); await account('payroll', 'payroll_officer'); await account('cookie', 'payroll_officer')
  await account('adminA', 'employee', { permissions: JSON.stringify(['users.manage']) })
  await account('adminAll', 'employee', { permissions: JSON.stringify(['users.manage']), scopeAllBranches: true, branchId: null })
  await account('remote', 'employee', { branchId: B.b.id })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_totp_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-totp-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار تطبيق المصادقة')
})

test('TP-01: an account turns the authenticator on by confirming a code; the secret is shown once and stored sealed', async () => {
  const session = expect(await login('worker'), 201)
  assert.deepEqual(Object.keys(session).sort(), ['accessToken', 'user'], 'من غير تطبيق مصادقة: الدخول زي ما هو')
  const auth = bearer(session.accessToken)
  assert.deepEqual(expect(await http('GET', '/auth/totp', undefined, auth), 200), { available: true, message: null, enabled: false, pending: false, required: false })
  // تأكيد أو إلغاء من غير بداية
  assert.deepEqual(answer(await http('POST', '/auth/totp/confirm', { code: '123456' }, auth)), [400, rules.TOTP_NOT_STARTED])
  assert.deepEqual(answer(await http('POST', '/auth/totp/disable', { code: '123456' }, auth)), [400, rules.TOTP_NOT_ENABLED])
  // بداية التفعيل: سر (مجموعات base32) ورابط التطبيق
  const setup = expect(await http('POST', '/auth/totp/setup', undefined, auth), 200)
  assert.match(setup.secret, /^([A-Z2-7]{4} ){7}[A-Z2-7]{4}$/, '20 بايت = 32 حرف في 8 مجموعات')
  const plain = setup.secret.replace(/ /g, '')
  assert.equal(setup.otpauthUrl, `otpauth://totp/Logic%20Leap%20HR:${encodeURIComponent(U.worker.email)}?secret=${plain}&issuer=Logic%20Leap%20HR&algorithm=SHA1&digits=6&period=30`)
  // في القاعدة مشفّر، ولسه مش مؤكَّد — والدخول لسه من غير خطوة رمز
  const pending = await rowOf('worker')
  assert.match(pending.secret, /^v1\.[^.]+\.[^.]+\.[^.]+$/); assert.equal(pending.secret.includes(plain), false); assert.equal(pending.confirmedAt, null)
  assert.equal(rules.openTotpSecret(pending.secret, secret), plain)
  assert.equal(expect(await http('GET', '/auth/totp', undefined, auth), 200).pending, true)
  assert.deepEqual(Object.keys(expect(await login('worker'), 201)).sort(), ['accessToken', 'user'])
  // بداية تانية بتبدّل السر (القديم بطل)
  const again = expect(await http('POST', '/auth/totp/setup', undefined, auth), 200)
  assert.notEqual(again.secret, setup.secret)
  assert.deepEqual(answer(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, auth)), [400, rules.TOTP_WRONG_CODE], 'رمز السر القديم')
  // رمز بصيغة غلط = 400 من التحقق من المدخلات؛ ورمز غلط = «الرمز غلط»
  for (const code of ['12345', '1234567', 'abcdef', '', 123456]) expect(await http('POST', '/auth/totp/confirm', { code }, auth), 400)
  assert.deepEqual(answer(await http('POST', '/auth/totp/confirm', { code: wrongOf(codeOf(again.secret)) }, auth)), [400, rules.TOTP_WRONG_CODE])
  assert.equal((await rowOf('worker')).confirmedAt, null)
  await rewind('worker')
  // التأكيد برمز صح: مفعّل، والرد جلسة جديدة بشكل الجلسة اللي الطلب جه بيها (توكن في الجسم)
  const before = await audits('TOTP_ENABLED')
  const confirmed = await http('POST', '/auth/totp/confirm', { code: codeOf(again.secret) }, auth)
  assert.deepEqual([Object.keys(expect(confirmed, 200)).sort(), confirmed.cookies], [['accessToken', 'user'], []])
  assert.deepEqual([await audits('TOTP_ENABLED') - before, (await rowOf('worker')).confirmedAt instanceof Date], [1, true])
  S.worker = again.secret
  const fresh = bearer(confirmed.body.accessToken)
  assert.deepEqual(expect(await http('GET', '/auth/totp', undefined, fresh), 200), { available: true, message: null, enabled: true, pending: false, required: false })
  // الجلسة اللي فعّل بيها اتنهت (اتبدّلت بالجديدة)
  expect(await http('GET', '/auth/me', undefined, auth), 401)
  // مفعّل بالفعل: بداية تانية مرفوضة، والسر مابيرجعش في أي رد
  assert.deepEqual(answer(await http('POST', '/auth/totp/setup', undefined, fresh)), [400, rules.TOTP_ALREADY_ENABLED])
  assert.doesNotMatch(JSON.stringify([confirmed.body, await http('GET', '/auth/totp', undefined, fresh), await http('GET', '/auth/session', undefined, fresh)]), new RegExp(plain))
  // من غير جلسة: 401
  for (const [method, route] of [['GET', '/auth/totp'], ['POST', '/auth/totp/setup'], ['POST', '/auth/totp/confirm'], ['POST', '/auth/totp/disable']]) {
    expect(await http(method, route, method === 'GET' ? undefined : { code: '123456' }), 401)
  }
})

test('TP-02: an enrolled account logs in with the app code as the second step — once, with no mail, and wrong codes lock the check for a while', async () => {
  await rewind('worker')
  mailbox.length = 0
  // كلمة السر صح: حالة معلّقة برمز التطبيق — مش جلسة، ومن غير بريد
  const pending = await login('worker')
  const challenge = expect(pending, 201)
  assert.deepEqual([challenge.twoFactor, challenge.kind, challenge.sentTo, challenge.resendAfterSeconds, challenge.codeLength, 'accessToken' in challenge, pending.cookies, mailbox.length],
    [true, 'TOTP', rules.TOTP_CHALLENGE_SENT_TO, 0, 6, false, [], 0])
  // مفيش إعادة إرسال لرمز التطبيق
  assert.equal((await http('POST', '/auth/login/resend', { challengeToken: challenge.challengeToken })).status, 429)
  // رمز غلط: 401 والمحاولة بتتعد على الحالة
  const code = codeOf(S.worker)
  assert.deepEqual(answer(await http('POST', '/auth/login/verify', { challengeToken: challenge.challengeToken, code: wrongOf(code) })), [401, 'الرمز غلط — باقي لك 4 محاولة'])
  // رمز صح: جلسة
  const done = expect(await http('POST', '/auth/login/verify', { challengeToken: challenge.challengeToken, code }), 200)
  assert.equal(jwt.verify(done.accessToken).sub, U.worker.id)
  const accepted = (await rowOf('worker')).lastStep
  assert.ok(Math.abs(accepted - stepNow()) <= 1, 'خطوة الرمز المقبول متسجّلة')
  // الرمز مرة واحدة: نفس الرمز في دخول جديد مرفوض (حتى لو لسه في مدته)
  const second = expect(await login('worker'), 201)
  assert.equal((await http('POST', '/auth/login/verify', { challengeToken: second.challengeToken, code })).status, 401)
  // ورمز الخطوة اللي بعدها (جوه نافذة الساعة) بيتقبل؛ والحالة المعلّقة نفسها مرة واحدة
  const next = codeOf(S.worker, accepted + 1)
  expect(await http('POST', '/auth/login/verify', { challengeToken: second.challengeToken, code: next }), 200)
  assert.equal((await rowOf('worker')).lastStep, accepted + 1)
  assert.equal((await http('POST', '/auth/login/verify', { challengeToken: second.challengeToken, code: codeOf(S.worker, accepted + 2) })).status, 401)
  // التحقق العام برمز البريد مفتوح: الحساب المفعّل برضه رمزه من التطبيق (من غير بريد)
  await rewind('worker')
  await config('auth.two_factor_enabled', 'true')
  try {
    mailbox.length = 0
    assert.deepEqual([expect(await login('worker'), 201).kind, mailbox.length], ['TOTP', 0])
    // وحساب مش مفعّل: رمز البريد زي ما هو
    const mailed = expect(await login('guard'), 201)
    assert.deepEqual([mailed.twoFactor, mailed.kind, mailbox.length], [true, undefined, 1])
    // رمز تطبيق لحالة رمزها بريد مابيعدّيش
    assert.equal((await http('POST', '/auth/login/verify', { challengeToken: mailed.challengeToken, code: codeOf(S.worker) })).status, 401)
  } finally { await config('auth.two_factor_enabled', 'false') }

  // رموز غلط ورا بعض (على حالات دخول مختلفة): التحقق بيتقفل مدة — والرمز الصح نفسه مابيعدّيش وقتها
  await rewind('worker')
  for (let attempt = 1; attempt <= TOTP_MAX_FAILURES; attempt++) {
    const each = expect(await login('worker'), 201)
    assert.equal((await http('POST', '/auth/login/verify', { challengeToken: each.challengeToken, code: wrongOf(codeOf(S.worker)) })).status, 401, `محاولة ${attempt}`)
  }
  const locked = await rowOf('worker')
  assert.ok(locked.lockedUntil instanceof Date && Math.abs(locked.lockedUntil.getTime() - (Date.now() + 15 * 60_000)) < 60_000, 'مقفول ربع ساعة من دلوقتي')
  const blocked = expect(await login('worker'), 201)
  const refused = await http('POST', '/auth/login/verify', { challengeToken: blocked.challengeToken, code: codeOf(S.worker) })
  assert.equal(refused.status, 401); assert.match(messageOf(refused), /رموز غلط كتير — التحقق بتطبيق المصادقة واقف \d+ دقيقة/)
  // والحالة نفسها اتقفلت
  assert.equal((await http('POST', '/auth/login/verify', { challengeToken: blocked.challengeToken, code: codeOf(S.worker) })).status, 401)
  // بعد المدة: شغال
  await rewind('worker')
  assert.equal(typeof (await signIn('worker')), 'string')
})

test('TP-03: a role named in the setting must turn the authenticator on before anything else, and cannot turn it off', async () => {
  // حراسة الإعداد: صيغة أكواد الأدوار
  for (const value of ['Payroll Officer', 'payroll_officer,,x y', 'payroll_officer,payroll_officer']) {
    assert.equal((await http('PATCH', '/settings/config', { key: rules.TOTP_ROLES_KEY, value }, bearer(jwt.sign({ sub: U.admin.id, email: U.admin.email, role: 'super_admin', branchId: null,
      employeeId: null, tokenVersion: 0, permissions: ['*'] })))).status, 400, value)
  }
  await config(rules.TOTP_ROLES_KEY, 'payroll_officer')
  try {
    // دور مش في الإعداد: ولا حاجة اتغيّرت
    assert.equal('totpSetupRequired' in expect(await login('guard'), 201).user, false)
    // صاحب الدور الإلزامي ولسه مافعّلش: جلسة مقيّدة
    const gated = expect(await login('payroll'), 201)
    assert.deepEqual([gated.user.totpSetupRequired, jwt.verify(gated.accessToken).totpSetupRequired], [true, true])
    const auth = bearer(gated.accessToken)
    for (const [method, route, body] of [['GET', '/notifications'], ['PATCH', '/notifications/read', {}], ['GET', '/auth/sessions'], ['GET', '/modules/enabled'], ['POST', '/auth/totp/disable', { code: '123456' }]]) {
      const refused = await http(method, route, body, auth)
      assert.deepEqual([refused.status, refused.body.code, refused.body.message], [403, rules.TOTP_SETUP_REQUIRED, rules.TOTP_SETUP_MESSAGE], `${method} ${route}`)
    }
    // المفتوح له: «مين أنا» وبيانات الجلسة والحالة والتفعيل
    expect(await http('GET', '/auth/me', undefined, auth), 200)
    assert.equal(expect(await http('GET', '/auth/session', undefined, auth), 200).user.totpSetupRequired, true)
    assert.deepEqual(expect(await http('GET', '/auth/totp', undefined, auth), 200), { available: true, message: null, enabled: false, pending: false, required: true })
    const setup = expect(await http('POST', '/auth/totp/setup', undefined, auth), 200)
    // رمز غلط: لسه مقيّد
    expect(await http('POST', '/auth/totp/confirm', { code: wrongOf(codeOf(setup.secret)) }, auth), 400)
    expect(await http('GET', '/notifications', undefined, auth), 403)
    await rewind('payroll')
    // التأكيد: جلسة كاملة من غير العلامة، والجلسة المقيّدة اتنهت
    const opened = expect(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, auth), 200)
    S.payroll = setup.secret
    assert.deepEqual(['totpSetupRequired' in opened.user, 'totpSetupRequired' in jwt.verify(opened.accessToken)], [false, false])
    expect(await http('GET', '/notifications', undefined, bearer(opened.accessToken)), 200)
    expect(await http('GET', '/auth/me', undefined, auth), 401)
    // من دلوقتي دخوله برمز التطبيق، وجلسته كاملة
    await rewind('payroll')
    const token = await signIn('payroll')
    expect(await http('GET', '/notifications', undefined, bearer(token)), 200)
    // الإلزامي مايتقفلش — حتى برمز صح
    assert.deepEqual(answer(await http('POST', '/auth/totp/disable', { code: codeOf(S.payroll) }, bearer(token))), [400, rules.TOTP_REQUIRED_FOR_ROLE])
    assert.equal((await rowOf('payroll')).confirmedAt instanceof Date, true)

    // جلسة cookie لدور إلزامي: نفس البوابة، والتأكيد بيبدّل الـcookie
    const first = await login('cookie', { cookieSession: true })
    const cookie = first.cookies[0].split('; ')[0], csrf = expect(first, 201).csrfToken
    assert.equal(first.body.user.totpSetupRequired, true)
    const headers = { Cookie: cookie, 'X-CSRF-Token': csrf }
    assert.equal((await http('GET', '/notifications', undefined, headers)).body.code, rules.TOTP_SETUP_REQUIRED)
    assert.equal((await http('POST', '/auth/totp/setup', undefined, { Cookie: cookie })).status, 403, 'من غير رمز CSRF')
    const viaCookie = expect(await http('POST', '/auth/totp/setup', undefined, headers), 200)
    const swapped = await http('POST', '/auth/totp/confirm', { code: codeOf(viaCookie.secret), remember: true }, headers)
    assert.deepEqual(Object.keys(expect(swapped, 200)).sort(), ['csrfToken', 'user'])
    assert.equal(swapped.cookies.length, 1); assert.match(swapped.cookies[0], /^hr_session=[^;]+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=\d+$/)
    expect(await http('GET', '/notifications', undefined, { Cookie: swapped.cookies[0].split('; ')[0] }), 200)
    expect(await http('GET', '/auth/me', undefined, { Cookie: cookie }), 401)
  } finally { await config(rules.TOTP_ROLES_KEY, '') }
  // الإعداد اتفضّى: بقى اختياري — يقدر يلغيه برمزه، ودخوله بعدها من غير خطوة رمز
  await rewind('payroll')
  const token = await signIn('payroll')
  await rewind('payroll')
  assert.deepEqual(answer(await http('POST', '/auth/totp/disable', { code: wrongOf(codeOf(S.payroll)) }, bearer(token))), [400, rules.TOTP_WRONG_CODE])
  await rewind('payroll')
  const before = await audits('TOTP_DISABLED')
  assert.deepEqual(expect(await http('POST', '/auth/totp/disable', { code: codeOf(S.payroll) }, bearer(token)), 200), { enabled: false })
  assert.deepEqual([await rowOf('payroll'), await audits('TOTP_DISABLED') - before], [null, 1])
  assert.deepEqual(Object.keys(expect(await login('payroll'), 201)).sort(), ['accessToken', 'user'])
})

test('TP-04: a manager resets an account\'s authenticator inside his branches; a system admin\'s only by a system admin', async () => {
  await enroll('guard'); await enroll('remote'); await enroll('admin')
  const tokenOf = async key => (U[key].role === 'super_admin' || S[key]) ? signIn(key) : expect(await login(key), 201).accessToken
  const adminA = bearer(await tokenOf('adminA')), adminAll = bearer(await tokenOf('adminAll')), root = bearer(await tokenOf('admin'))
  // قايمة المستخدمين: علامة «مفعّل» للمفعّلين بس
  const listed = expect(await http('GET', '/users', undefined, root), 200)
  // (cookie فعّل في TP-03، وpayroll لغاه)
  assert.deepEqual(listed.filter(row => row.totpEnabled === true).map(row => row.id).sort((a, b) => a - b), [U.admin.id, U.worker.id, U.cookie.id, U.guard.id, U.remote.id].sort((a, b) => a - b))
  assert.equal(listed.find(row => row.id === U.payroll.id).totpEnabled, undefined)
  assert.doesNotMatch(JSON.stringify(listed), /"secret"|v1\./, 'ولا سر في القايمة')
  // من غير صلاحية إدارة المستخدمين
  expect(await http('POST', `/users/${U.guard.id}/totp-reset`, {}, bearer(await signIn('worker'))), 403)
  // حساب برّه نطاق فروع المنفّذ = مش موجود (ومابيتلمسش)؛ وحسابه هو نفسه من «الأمان»؛ ومدير النظام لمدير نظام بس
  assert.deepEqual(answer(await http('POST', `/users/${U.remote.id}/totp-reset`, {}, adminA)), [404, 'المستخدم غير موجود'])
  assert.deepEqual(answer(await http('POST', '/users/999999/totp-reset', {}, adminA)), [404, 'المستخدم غير موجود'])
  assert.equal((await http('POST', `/users/${U.adminA.id}/totp-reset`, {}, adminA)).status, 400)
  assert.equal((await http('POST', `/users/${U.admin.id}/totp-reset`, {}, adminAll)).status, 403)
  assert.deepEqual([(await rowOf('remote')).confirmedAt instanceof Date, (await rowOf('admin')).confirmedAt instanceof Date], [true, true])
  // إعادة الضبط: الصف اتمسح، وسطر تدقيق، ودخوله الجاي من غير رمز التطبيق
  const before = await audits('TOTP_RESET')
  assert.deepEqual(expect(await http('POST', `/users/${U.guard.id}/totp-reset`, {}, adminA), 200), { id: U.guard.id, reset: true })
  assert.deepEqual([await rowOf('guard'), await audits('TOTP_RESET') - before], [null, 1])
  assert.deepEqual(Object.keys(expect(await login('guard'), 201)).sort(), ['accessToken', 'user'])
  // مرة تانية: مفيش حاجة تتمسح، ومن غير سطر تدقيق
  assert.deepEqual(expect(await http('POST', `/users/${U.guard.id}/totp-reset`, {}, adminA), 200), { id: U.guard.id, reset: false })
  assert.equal(await audits('TOTP_RESET') - before, 1)
  // حساب كل الفروع بيعيد ضبط حساب الفرع التاني، ومدير النظام بيعيد ضبط مدير نظام تاني
  assert.equal(expect(await http('POST', `/users/${U.remote.id}/totp-reset`, {}, adminAll), 200).reset, true)
  // ودور إلزامي اتعاد ضبطه: دخوله الجاي جلسة «فعّل الأول»
  await enroll('payroll')
  await config(rules.TOTP_ROLES_KEY, 'payroll_officer')
  try {
    assert.equal(expect(await http('POST', `/users/${U.payroll.id}/totp-reset`, {}, adminA), 200).reset, true)
    assert.equal(expect(await login('payroll'), 201).user.totpSetupRequired, true)
  } finally { await config(rules.TOTP_ROLES_KEY, '') }
})

test('TP-05 (CRP3D): the reset keeps the password-takeover boundary and is re-judged under the account row lock; a mail code opened before enrolment opens nothing after it', async () => {
  const account = async (key, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@totp.invalid`, displayName: `حساب ${key}`, role: 'employee', permissions: '[]', isActive: true, branchId: B.a.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  // ===== B17-01: حساب أقوى من المنفّذ — زي تغيير كلمة مروره بالظبط، لمدير النظام بس =====
  await account('strong', { permissions: JSON.stringify(['settings.manage']) })
  await account('wide', { scopeBranchIds: JSON.stringify([B.a.id, B.b.id]) })
  await enroll('strong'); await enroll('wide')
  const adminA = bearer(expect(await login('adminA'), 201).accessToken), adminAll = bearer(expect(await login('adminAll'), 201).accessToken)
  const root = bearer(await signIn('admin'))
  const before = await audits('TOTP_RESET')
  assert.equal((await http('PATCH', `/users/${U.strong.id}`, { password: passwordOf() }, adminA)).status, 403, 'نفس حد تغيير كلمة المرور')
  for (const actor of [adminA, adminAll]) {
    const refused = await http('POST', `/users/${U.strong.id}/totp-reset`, {}, actor)
    assert.equal(refused.status, 403, JSON.stringify(refused.body))
    assert.match(messageOf(refused), /«إدارة الإعدادات»|إعادة ضبط تطبيق المصادقة له لمدير النظام بس/)
  }
  // حساب نطاقه فيه فرع برّه نطاق المنفّذ
  const wider = await http('POST', `/users/${U.wide.id}/totp-reset`, {}, adminA)
  assert.equal(wider.status, 403, JSON.stringify(wider.body)); assert.match(messageOf(wider), /نطاقه فيه فروع برّه نطاقك/)
  assert.deepEqual([(await rowOf('strong')).confirmedAt instanceof Date, (await rowOf('wide')).confirmedAt instanceof Date, await audits('TOTP_RESET') - before], [true, true, 0])
  // حساب نطاقه يغطيه بيعيد ضبطه، ومدير النظام بيعيد ضبط الحساب الأقوى
  assert.equal(expect(await http('POST', `/users/${U.wide.id}/totp-reset`, {}, adminAll), 200).reset, true)
  assert.equal(expect(await http('POST', `/users/${U.strong.id}/totp-reset`, {}, root), 200).reset, true)
  assert.equal(await audits('TOTP_RESET') - before, 2)
  // الحكم اتعمل على صف والحساب اترقّى قبل التنفيذ: المسح بيقفل صف الحساب ويرفض (الصف مابيتمسحش)
  await enroll('guard')
  const totp = app.get(require('../src/auth/totp.service').TotpService)
  const judged = await repo('User').findOneByOrFail({ id: U.guard.id })
  await repo('User').update({ id: U.guard.id }, { permissions: JSON.stringify(['settings.manage']) })
  await assert.rejects(totp.adminReset({ sub: U.adminA.id, branchId: B.a.id }, judged), error => error.getStatus?.() === 409 && /بيانات الحساب اتغيّرت/.test(error.message))
  assert.deepEqual([(await rowOf('guard')).confirmedAt instanceof Date, await audits('TOTP_RESET') - before], [true, 2])
  await repo('User').update({ id: U.guard.id }, { permissions: '[]' })
  assert.equal(await totp.adminReset({ sub: U.adminA.id, branchId: B.a.id }, await repo('User').findOneByOrFail({ id: U.guard.id })), true)

  // ===== B17-02: رمز بريد لحالة اتفتحت قبل تفعيل التطبيق =====
  await account('late')
  const early = bearer(expect(await login('late'), 201).accessToken)
  await config('auth.two_factor_enabled', 'true')
  try {
    mailbox.length = 0
    const pending = expect(await login('late'), 201)
    assert.deepEqual([pending.twoFactor, pending.kind, mailbox.length], [true, undefined, 1])
    const mailCode = mailbox[0].text.match(/\b\d{6}\b/)[0]
    const challenge = async () => (await query('SELECT [lockedAt], [consumedAt] FROM [login_challenges] WHERE [token] = @0', [pending.challengeToken]))[0]
    assert.deepEqual([(await challenge()).lockedAt, (await challenge()).consumedAt], [null, null])
    // التطبيق اتفعّل من جلسة تانية: حالة البريد المفتوحة اتقفلت مع التفعيل، ورمزها مابيفتحش جلسة
    const setup = expect(await http('POST', '/auth/totp/setup', undefined, early), 200)
    expect(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, early), 200)
    S.late = setup.secret; await rewind('late')
    assert.deepEqual([(await challenge()).lockedAt instanceof Date, (await challenge()).consumedAt], [true, null])
    const refused = await http('POST', '/auth/login/verify', { challengeToken: pending.challengeToken, code: mailCode })
    assert.deepEqual([refused.status, 'accessToken' in (refused.body ?? {}), refused.cookies.length], [401, false, 0])
    // حالة بريد اتفتحت والتفعيل بيتأكد (مااتقفلتش معاه): الحكم وقت التحقق بعامل الحساب دلوقتي، والحالة بتتقفل
    await query('UPDATE [login_challenges] SET [lockedAt] = NULL WHERE [token] = @0', [pending.challengeToken])
    assert.deepEqual(answer(await http('POST', '/auth/login/verify', { challengeToken: pending.challengeToken, code: mailCode })), [401, rules.TOTP_FACTOR_CHANGED])
    assert.deepEqual([(await challenge()).lockedAt instanceof Date, (await challenge()).consumedAt], [true, null])
    // والدخول الجاي برمز التطبيق (من غير بريد)
    mailbox.length = 0
    const next = expect(await login('late'), 201)
    assert.deepEqual([next.kind, mailbox.length], ['TOTP', 0])
    expect(await http('POST', '/auth/login/verify', { challengeToken: next.challengeToken, code: codeOf(S.late) }), 200)
    // حالة تطبيق مفتوحة لحساب مابتتقفلش بتفعيل حساب تاني
    await rewind('late')
    const open = expect(await login('late'), 201)
    await account('later')
    const other = bearer(jwt.sign({ sub: U.later.id, email: U.later.email, role: 'employee', branchId: B.a.id, employeeId: null, tokenVersion: 0, permissions: [] }))
    const otherSetup = expect(await http('POST', '/auth/totp/setup', undefined, other), 200)
    expect(await http('POST', '/auth/totp/confirm', { code: codeOf(otherSetup.secret) }, other), 200)
    expect(await http('POST', '/auth/login/verify', { challengeToken: open.challengeToken, code: codeOf(S.late) }), 200)
  } finally { await config('auth.two_factor_enabled', 'false') }
})

test('TP-06 (CRP3E): a reset is refused when the account version moved after the judgment; a mail-code login that the enrolment overtakes opens no session', async () => {
  const account = async (key, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@totp.invalid`, displayName: `حساب ${key}`, role: 'employee', permissions: '[]', isActive: true, branchId: B.a.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  const totp = app.get(require('../src/auth/totp.service').TotpService)
  const actor = { sub: U.adminA.id, branchId: B.a.id }
  // ===== B17-01: إصدار الحساب اتحرك بعد الحكم (ترقية من حزمة الدور أو من المنح الفردية: أعمدة الصف التانية زي ما هي) =====
  await account('versioned'); await enroll('versioned')
  const judged = await repo('User').findOneByOrFail({ id: U.versioned.id })
  await query('UPDATE [users] SET [tokenVersion] = [tokenVersion] + 1 WHERE [id] = @0', [U.versioned.id])
  const before = await audits('TOTP_RESET')
  await assert.rejects(totp.adminReset(actor, judged), error => error.getStatus?.() === 409 && /بيانات الحساب اتغيّرت/.test(error.message))
  assert.deepEqual([(await rowOf('versioned')).confirmedAt instanceof Date, await audits('TOTP_RESET') - before], [true, 0])
  // والمسارين الفعليين بيحرّكوا الإصدار: تعديل حزمة دور الحساب، والمنح الفردية
  const root = bearer(await signIn('admin'))
  const done = response => { assert.ok([200, 201].includes(response.status), JSON.stringify(response.body)); return response.body }
  const role = done(await http('POST', '/roles', { code: 'tp06_role', nameAr: 'دور اختبار الإصدار', permissions: [] }, root))
  await account('promoted', { role: role.code }); await enroll('promoted')
  for (const promote of [() => http('PATCH', `/roles/${role.id}`, { permissions: ['settings.manage'] }, root),
    () => http('PUT', `/users/${U.promoted.id}/permissions`, { grants: ['audit.view'], revokes: [] }, root)]) {
    const stale = await repo('User').findOneByOrFail({ id: U.promoted.id })
    done(await promote())
    assert.equal((await repo('User').findOneByOrFail({ id: U.promoted.id })).tokenVersion, stale.tokenVersion + 1, 'الترقية حرّكت إصدار الحساب')
    await assert.rejects(totp.adminReset(actor, stale), error => error.getStatus?.() === 409)
    assert.equal((await rowOf('promoted')).confirmedAt instanceof Date, true)
  }
  // وعلى الصف الحالي: الحكم نفسه بيرفض (الحساب بقى فيه صلاحية إدارية مش مع المنفّذ)
  assert.equal((await http('POST', `/users/${U.promoted.id}/totp-reset`, {}, bearer(expect(await login('adminA'), 201).accessToken))).status, 403)

  // ===== B17-02: التفعيل ثبت بعد آخر فحص للعامل وقبل ما جلسة رمز البريد تتفتح =====
  await account('racer')
  const early = bearer(expect(await login('racer'), 201).accessToken)
  const setup = expect(await http('POST', '/auth/totp/setup', undefined, early), 200)
  const sessions = app.get(require('../src/auth/user-sessions.service').UserSessionsService), realOpen = sessions.open
  const liveSessions = async () => Number((await query('SELECT COUNT(*) AS [n] FROM [user_sessions] WHERE [userId] = @0 AND [revokedAt] IS NULL', [U.racer.id]))[0].n)
  await config('auth.two_factor_enabled', 'true')
  let overtaken = false
  try {
    mailbox.length = 0
    const pending = expect(await login('racer'), 201)
    assert.deepEqual([pending.twoFactor, pending.kind, mailbox.length], [true, undefined, 1])
    const mailCode = mailbox[0].text.match(/\b\d{6}\b/)[0]
    // فتح صف جلسة الدخول برمز البريد بيستنى لحد ما التفعيل (من الجلسة التانية) يثبت — يعني كل فحوص العامل اللي قبله شافت «مش مفعّل»
    sessions.open = async function (user, ...rest) {
      if (user.id === U.racer.id && !overtaken) {
        overtaken = true
        expect(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, early), 200)
      }
      return realOpen.call(this, user, ...rest)
    }
    const raced = await http('POST', '/auth/login/verify', { challengeToken: pending.challengeToken, code: mailCode })
    assert.equal(overtaken, true)
    assert.deepEqual([raced.status, messageOf(raced), 'accessToken' in (raced.body ?? {}), raced.cookies.length], [401, rules.TOTP_FACTOR_CHANGED, false, 0])
  } finally { sessions.open = realOpen; await config('auth.two_factor_enabled', 'false') }
  // الصف اللي اتفتح لدخول رمز البريد اتنهى: الجلسة القايمة الوحيدة هي اللي التفعيل طلّعها
  assert.equal(await liveSessions(), 1)
  S.racer = setup.secret; await rewind('racer')
  // ودخول برمز التطبيق عادي
  const next = expect(await login('racer'), 201)
  assert.equal(next.kind, 'TOTP')
  expect(await http('POST', '/auth/login/verify', { challengeToken: next.challengeToken, code: codeOf(S.racer) }), 200)
})

test('TP-07 (CRP3F): a stale account or role save cannot write over a promotion, and a password-only login that the enrolment overtakes opens no session', async () => {
  const account = async (key, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@totp.invalid`, displayName: `حساب ${key}`, role: 'employee', permissions: '[]', isActive: true, branchId: B.a.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  const done = response => { assert.ok([200, 201].includes(response.status), JSON.stringify(response.body)); return response.body }
  const root = bearer(await signIn('admin'))
  const totp = app.get(require('../src/auth/totp.service').TotpService)
  const versionOf = async key => (await repo('User').findOneByOrFail({ id: U[key].id })).tokenVersion
  const permsOf = async id => JSON.parse((await repo('Role').findOneByOrFail({ id })).permissions)

  // ===== B17-01 (أ): تعديل حساب قرا الصف قبل ترقية دوره — الحفظ مابيرجّعش إصدار الحساب =====
  const role = done(await http('POST', '/roles', { code: 'tp07_role', nameAr: 'دور اختبار الحفظ القديم', permissions: [] }, root))
  await account('stale', { role: role.code }); await enroll('stale')
  const judged = await repo('User').findOneByOrFail({ id: U.stale.id })
  // مخزن المتحكم نفسه (النسخة اللي بيقرا بيها صف الحساب)
  const users = app.get(require('../src/auth/users.controller').UsersController).users, realFindUser = users.findOne
  let promoted = false
  // أول قراية لصف الحساب (من تعديل الحساب) بترجع بالصف، وبعدها حزمة دوره بتترقّى قبل ما التعديل يحفظ
  users.findOne = async function (...args) {
    const row = await realFindUser.apply(this, args)
    if (!promoted && row?.id === U.stale.id) {
      promoted = true
      done(await http('PATCH', `/roles/${role.id}`, { permissions: ['settings.manage'] }, root))
    }
    return row
  }
  let edited
  try { edited = await http('PATCH', `/users/${U.stale.id}`, {}, root) } finally { users.findOne = realFindUser }
  assert.equal(promoted, true)
  assert.deepEqual(answer(edited), [409, 'بيانات الحساب اتغيّرت — حدّث الصفحة وحاول تاني'])
  assert.deepEqual([await versionOf('stale'), await permsOf(role.id)], [judged.tokenVersion + 1, ['settings.manage']], 'الإصدار مارجعش والترقية باقية')
  // فحكم إعادة الضبط اللي اتعمل قبل الترقية بيترفض، والتفعيل باقي
  await assert.rejects(totp.adminReset({ sub: U.adminA.id, branchId: B.a.id }, judged), error => error.getStatus?.() === 409)
  assert.equal((await rowOf('stale')).confirmedAt instanceof Date, true)
  // والتعديل العادي زي ما هو: بالخانة المتغيّرة، والإصدار بيزيد واحد، وسطر التدقيق بيتسجّل
  const audited = await audits('USER_UPDATED'), version = await versionOf('stale')
  const disabled = expect(await http('PATCH', `/users/${U.stale.id}`, { isActive: false }, root), 200)
  assert.deepEqual([disabled.isActive, 'passwordHash' in disabled, await versionOf('stale'), await audits('USER_UPDATED') - audited], [false, false, version + 1, 1])
  assert.equal((await repo('User').findOneByOrFail({ id: U.stale.id })).role, role.code)
  // تعديل من غير أي تغيير: ولا كتابة ولا زيادة إصدار
  expect(await http('PATCH', `/users/${U.stale.id}`, {}, root), 200)
  assert.equal(await versionOf('stale'), version + 1)

  // ===== B17-01 (ب): تعديل اسم دور قرا حزمته قبل سحب صلاحية منها — الحفظ مابيرجّعش الحزمة القديمة =====
  await account('member', { role: role.code })
  const roles = app.get(require('../src/auth/roles.controller').RolesController).roles, realFindRole = roles.findOne
  let withdrawn = false
  roles.findOne = async function (...args) {
    const row = await realFindRole.apply(this, args)
    if (!withdrawn && row?.id === role.id) {
      withdrawn = true
      done(await http('PATCH', `/roles/${role.id}`, { permissions: [] }, root))
    }
    return row
  }
  const memberVersion = await versionOf('member')
  let renamed
  try { renamed = await http('PATCH', `/roles/${role.id}`, { nameAr: 'اسم جديد بحزمة قديمة' }, root) } finally { roles.findOne = realFindRole }
  assert.equal(withdrawn, true)
  assert.deepEqual(answer(renamed), [409, 'بيانات الدور اتغيّرت — حدّث الصفحة وحاول تاني'])
  const stored = await repo('Role').findOneByOrFail({ id: role.id })
  assert.deepEqual([JSON.parse(stored.permissions), stored.nameAr, await versionOf('member')], [[], 'دور اختبار الحفظ القديم', memberVersion + 1], 'الصلاحية المسحوبة مارجعتش')
  // وتعديل الاسم لوحده بعدها بيعدّي من غير ما يحرّك إصدار الحسابات
  assert.equal(done(await http('PATCH', `/roles/${role.id}`, { nameAr: 'دور باسمه الجديد' }, root)).nameAr, 'دور باسمه الجديد')
  assert.deepEqual([await permsOf(role.id), await versionOf('member')], [[], memberVersion + 1])

  // ===== B17-02: الدخول بكلمة السر لوحدها (رمز البريد مقفول) والتفعيل ثبت قبل فتح صف الجلسة =====
  await account('solo')
  const early = bearer(expect(await login('solo'), 201).accessToken)
  const setup = expect(await http('POST', '/auth/totp/setup', undefined, early), 200)
  const sessions = app.get(require('../src/auth/user-sessions.service').UserSessionsService), realOpen = sessions.open
  const liveSessions = async () => Number((await query('SELECT COUNT(*) AS [n] FROM [user_sessions] WHERE [userId] = @0 AND [revokedAt] IS NULL', [U.solo.id]))[0].n)
  let overtaken = false
  sessions.open = async function (user, ...rest) {
    if (user.id === U.solo.id && !overtaken) {
      overtaken = true
      expect(await http('POST', '/auth/totp/confirm', { code: codeOf(setup.secret) }, early), 200)
    }
    return realOpen.call(this, user, ...rest)
  }
  let raced
  try { raced = await login('solo') } finally { sessions.open = realOpen }
  assert.equal(overtaken, true)
  assert.deepEqual([raced.status, messageOf(raced), 'accessToken' in (raced.body ?? {}), raced.cookies.length], [401, rules.TOTP_FACTOR_CHANGED, false, 0])
  assert.equal(await liveSessions(), 1, 'صف جلسة الدخول اللي اتفتح اتنهى')
  S.solo = setup.secret; await rewind('solo')
  // والدخول الجاي برمز التطبيق، وتغيير كلمة المرور من الجلسة دي بيطلّع جلسة جديدة عادي (من جلسة قايمة)
  const token = await signIn('solo')
  const next = passwordOf()
  const changed = expect(await http('POST', '/auth/change-password', { currentPassword: P.solo, newPassword: next }, bearer(token)), 200)
  P.solo = next
  assert.equal(typeof changed.accessToken, 'string')
  expect(await http('GET', '/auth/me', undefined, bearer(changed.accessToken)), 200)
})

test('TP-08 (CRP3G): a password change issues its session from the account as it is now, and a role being assigned is pinned until the save', async () => {
  const account = async (key, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@totp.invalid`, displayName: `حساب ${key}`, role: 'employee', permissions: '[]', isActive: true, branchId: B.a.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  const done = response => { assert.ok([200, 201].includes(response.status), JSON.stringify(response.body)); return response.body }
  const root = bearer(await signIn('admin'))
  const manager = bearer(expect(await login('adminA'), 201).accessToken)
  const usersController = app.get(require('../src/auth/users.controller').UsersController)
  const authService = app.get(require('../src/auth/auth.service').AuthService)
  const stored = async key => repo('User').findOneByOrFail({ id: U[key].id })

  // ===== B01: الحساب اتسحب منه دوره وتغيير كلمة المرور في الطريق — الجلسة الجديدة بالدور الحالي =====
  await account('chief', { role: 'super_admin', branchId: null })
  const chief = bearer(expect(await login('chief'), 201).accessToken)
  expect(await http('GET', '/users', undefined, chief), 200)
  // سياسة كلمة السر بتتفحص بعد قراية صف الحساب وقبل الكتابة: هناك مدير نظام تاني بينزّل الحساب لموظف
  const policy = authService.security, realAssert = policy.assertPassword
  let demoted = false
  policy.assertPassword = async function (...args) {
    if (!demoted) { demoted = true; done(await http('PATCH', `/users/${U.chief.id}`, { role: 'employee', branchId: B.a.id }, root)) }
    return realAssert.apply(this, args)
  }
  const next = passwordOf()
  let changed
  try { changed = await http('POST', '/auth/change-password', { currentPassword: P.chief, newPassword: next }, chief) } finally { policy.assertPassword = realAssert }
  assert.equal(demoted, true)
  // التوكن القديم مات مع التنزيل (401)، أو التغيير كمّل بجلسة الحساب الحالي — في الحالتين مفيش جلسة مدير نظام
  if (changed.status === 200) {
    P.chief = next
    assert.deepEqual([changed.body.user.role, changed.body.user.permissions.includes('*')], ['employee', false])
    const claims = jwt.verify(changed.body.accessToken)
    assert.deepEqual([claims.role, claims.permissions.includes('*'), claims.tokenVersion], ['employee', false, (await stored('chief')).tokenVersion])
    assert.equal((await http('GET', '/users', undefined, bearer(changed.body.accessToken))).status, 403, 'جلسة موظف مش بتفتح شاشة المستخدمين')
    expect(await http('GET', '/auth/me', undefined, bearer(changed.body.accessToken)), 200)
  } else {
    assert.equal(changed.status, 401, JSON.stringify(changed.body))
  }
  assert.equal((await stored('chief')).role, 'employee')

  // ===== B02 (أ): إسناد دور لحساب، والدور اترقّى بعد حكم الصلاحيات وقبل الحفظ =====
  const role = done(await http('POST', '/roles', { code: 'tp08_role', nameAr: 'دور اختبار التثبيت', permissions: [] }, root))
  await account('assignee')
  const realResolve = usersController.auth.resolvePermissions
  let promoted = false
  // الحكم بيحسب صلاحيات الحساب بالدور المقترح؛ بعد الحساب ده مدير النظام بيضيف صلاحية إدارية للدور
  const promoteAfterJudgment = async function (user, ...rest) {
    const permissions = await realResolve.call(this, user, ...rest)
    if (!promoted && user?.role === role.code) {
      promoted = true
      done(await http('PATCH', `/roles/${role.id}`, { permissions: ['settings.manage'] }, root))
    }
    return permissions
  }
  usersController.auth.resolvePermissions = promoteAfterJudgment
  let assigned
  try { assigned = await http('PATCH', `/users/${U.assignee.id}`, { role: role.code }, manager) } finally { usersController.auth.resolvePermissions = realResolve }
  assert.equal(promoted, true)
  assert.deepEqual(answer(assigned), [409, 'الدور المختار اتغيّرت صلاحياته — حدّث الصفحة وحاول تاني'])
  assert.deepEqual([(await stored('assignee')).role, (await stored('assignee')).tokenVersion], ['employee', 0], 'الحساب ماخدش الدور ولا اتلمس')
  // والطلب الجديد بيتحكم على الحزمة الحالية: مرفوض (منح صلاحية إدارية لمدير النظام بس)
  assert.equal((await http('PATCH', `/users/${U.assignee.id}`, { role: role.code }, manager)).status, 403)
  // ومدير النظام بيسنده عادي
  assert.equal(done(await http('PATCH', `/users/${U.assignee.id}`, { role: role.code }, root)).role, role.code)

  // ===== B02 (ب): إنشاء حساب بدور اترقّى بعد الحكم =====
  const other = done(await http('POST', '/roles', { code: 'tp08_new', nameAr: 'دور حساب جديد', permissions: [] }, root))
  let grown = false
  usersController.auth.resolvePermissions = async function (user, ...rest) {
    const permissions = await realResolve.call(this, user, ...rest)
    if (!grown && user?.role === other.code) {
      grown = true
      done(await http('PATCH', `/roles/${other.id}`, { permissions: ['audit.view'] }, root))
    }
    return permissions
  }
  let createdAccount
  try {
    createdAccount = await http('POST', '/users', { email: 'made@totp.invalid', displayName: 'حساب جديد بدور اتغيّر', password: passwordOf(), role: other.code, branchId: B.a.id }, manager)
  } finally { usersController.auth.resolvePermissions = realResolve }
  assert.equal(grown, true)
  assert.deepEqual(answer(createdAccount), [409, 'الدور المختار اتغيّرت صلاحياته — حدّث الصفحة وحاول تاني'])
  assert.equal(await repo('User').count({ where: { email: 'made@totp.invalid' } }), 0)
  // ومن غير تغيير: الإنشاء بدور غير إداري عادي
  const plainRole = done(await http('POST', '/roles', { code: 'tp08_plain', nameAr: 'دور عادي', permissions: [] }, root))
  const made = done(await http('POST', '/users', { email: 'plain-made@totp.invalid', displayName: 'حساب جديد عادي', password: passwordOf(), role: plainRole.code, branchId: B.a.id }, manager))
  assert.deepEqual([made.role, 'passwordHash' in made], [plainRole.code, false])

  // ===== نفس الصنف: كلمة سر مؤقتة لحساب اترقّى بعد الحكم =====
  await account('reset')
  const before = (await stored('reset')).passwordHash
  const realPolicy = usersController.security.assertPassword
  let raised = false
  usersController.security.assertPassword = async function (...args) {
    if (!raised) { raised = true; done(await http('PUT', `/users/${U.reset.id}/permissions`, { grants: ['settings.manage'], revokes: [] }, root)) }
    return realPolicy.apply(this, args)
  }
  let temporary
  try { temporary = await http('POST', '/users/temporary-password', { userIds: [U.reset.id], password: passwordOf() }, manager) } finally { usersController.security.assertPassword = realPolicy }
  assert.equal(raised, true)
  assert.deepEqual(answer(temporary), [409, 'بيانات الحساب اتغيّرت — حدّث الصفحة وحاول تاني'])
  assert.equal((await stored('reset')).passwordHash, before, 'كلمة السر زي ما هي')
  assert.equal((await http('POST', '/users/temporary-password', { userIds: [U.reset.id], password: passwordOf() }, manager)).status, 403, 'والحكم الجديد بيرفض: الحساب بقى أقوى من المنفّذ')
})
