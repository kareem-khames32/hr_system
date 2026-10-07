// B2.17 (أ): الجلسة في cookie httpOnly ورمز CSRF — الدخول بطلب «جلسة cookie»، وقراءة الجلسة منها، وطلب الكتابة برمزها، والخروج،
// وتغيير كلمة المرور، والتحقق بخطوتين؛ والدخول العادي (توكن في الجسم وترويسة Bearer) زي ما هو بالحرف.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء. ولا رسالة بريد حقيقية: send متبدّلة على النسخة نفسها.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_session_cookie_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-session-cookie-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/session-cookie')
const { jwtLifetimeSeconds } = require('../src/auth/jwt-secret')
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
let app, master, ds, base, created = false
const mailbox = []
const U = {}, P = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
/** نداء خام: الترويسات زي ما هي (Cookie، Authorization، X-CSRF-Token)، والرد بحالته وجسمه وSet-Cookie بتاعته */
async function http(method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body === undefined || body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed, cookies: response.headers.getSetCookie() }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const codeOf = response => response.body?.code ?? null
/** جلسة cookie من رد الدخول: قيمة الـcookie (اللي المتصفح هيبعتها) وخصائصها ورمز CSRF */
function sessionOf(response, name = 'hr_session') {
  assert.equal(response.cookies.length, 1, JSON.stringify(response.cookies))
  const [pair, ...attributes] = response.cookies[0].split('; ')
  assert.equal(pair.slice(0, pair.indexOf('=')), name)
  return { cookie: pair, token: pair.slice(pair.indexOf('=') + 1), attributes, csrf: response.body.csrfToken, user: response.body.user }
}
const cookieLogin = async (key, extra = {}) => sessionOf(await http('POST', '/auth/login', { email: U[key].email, password: P[key], cookieSession: true, ...extra }))
const withSession = (session, csrf) => ({ Cookie: session.cookie, ...(csrf === undefined ? {} : { 'X-CSRF-Token': csrf }) })
// طلب كتابة من غير أثر جانبي مهم: «علّم إشعاراتي مقروءة»
const write = headers => http('PATCH', '/notifications/read', {}, headers)
const config = async (key, value) => { const row = await repo('RequestsConfig').findOneBy({ key }); await repo('RequestsConfig').save(row ? { ...row, value } : { key, value }) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_session_cookie_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20',
    FRONTEND_URL: 'http://localhost:3000' })
  delete process.env.SESSION_COOKIE_SAMESITE; delete process.env.SESSION_COOKIE_SECURE
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية: رمز التحقق بيتسجّل في mailbox بس
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
  const branch = await repo('Branch').save({ code: 'SCK', name: 'فرع الجلسات', country: 'EG', weekendDays: 'FRI' })
  const account = async (key, role, extra = {}) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@session-cookie.invalid`, displayName: `حساب ${key}`, role, permissions: '[]', isActive: true, branchId: branch.id,
      passwordHash: await bcrypt.hash(P[key], 10), ...extra })
  }
  await account('admin', 'super_admin', { branchId: null })
  await account('worker', 'employee'); await account('second', 'employee'); await account('changer', 'employee'); await account('forced', 'employee'); await account('coded', 'employee')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_session_cookie_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-session-cookie-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار جلسة الـcookie')
})

test('SC-01: the plain login is unchanged — the token in the body, no cookie, and a Bearer write needs no CSRF token', async () => {
  const plain = await http('POST', '/auth/login', { email: U.worker.email, password: P.worker })
  const body = expect(plain, 201)
  assert.deepEqual([Object.keys(body).sort(), plain.cookies], [['accessToken', 'user'], []], 'نفس رد الدخول بالحرف ومن غير cookie')
  const claims = jwt.verify(body.accessToken)
  assert.deepEqual(['csrf' in claims, claims.sub, claims.role], [false, U.worker.id, 'employee'])
  const bearer = { Authorization: `Bearer ${body.accessToken}` }
  expect(await http('GET', '/auth/me', undefined, bearer), 200)
  expect(await write(bearer), 200)
  // cookieSession: false زي غيابه؛ وقيمة مش منطقية مرفوضة (نموذج من موقع تاني مايعرفش يبعت true منطقية)
  const off = await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: false, remember: true })
  assert.deepEqual([Object.keys(expect(off, 201)).sort(), off.cookies], [['accessToken', 'user'], []])
  for (const bad of [{ cookieSession: 'true' }, { cookieSession: 1 }, { remember: 'yes' }]) {
    const refused = await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, ...bad })
    assert.deepEqual([refused.status, refused.cookies], [400, []], JSON.stringify(bad))
  }
  const form = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: U.worker.email, password: P.worker, cookieSession: 'true' }) })
  assert.deepEqual([form.status, form.headers.getSetCookie()], [400, []], 'نموذج HTML من موقع تاني مايفتحش جلسة cookie')
  // من غير جلسة خالص: 401
  expect(await http('GET', '/auth/me'), 401); expect(await http('GET', '/auth/session'), 401)
})

test('SC-02: a cookie session keeps the token away from the page, and a write through it must carry the session\'s CSRF token', async () => {
  const response = await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: true })
  const body = expect(response, 201)
  assert.deepEqual(Object.keys(body).sort(), ['csrfToken', 'user'], 'من غير accessToken في الرد')
  assert.doesNotMatch(JSON.stringify(body), /eyJ/, 'ولا توكن في أي حقل')
  const session = sessionOf(response)
  // cookie جلسة: HttpOnly و SameSite=Strict، ومن غير Secure على HTTP، ومن غير عمر (بتتمسح مع قفل المتصفح)
  assert.deepEqual(session.attributes, ['Path=/', 'HttpOnly', 'SameSite=Strict'])
  const claims = jwt.verify(session.token)
  assert.deepEqual([claims.sub, claims.csrf, typeof claims.csrf, claims.csrf.length], [U.worker.id, session.csrf, 'string', 48])
  // «تذكرني»: الـcookie بتفضل لآخر مدة الجلسة
  const kept = await cookieLogin('worker', { remember: true })
  assert.deepEqual(kept.attributes, ['Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${jwtLifetimeSeconds(process.env.JWT_EXPIRES_IN ?? '8h')}`])
  assert.notEqual(kept.csrf, session.csrf, 'كل جلسة برمزها')

  // القراءة بالـcookie لوحدها
  assert.equal(expect(await http('GET', '/auth/me', undefined, withSession(session)), 200).sub, U.worker.id)
  const current = expect(await http('GET', '/auth/session', undefined, withSession(session)), 200)
  assert.deepEqual(current, { user: session.user, csrfToken: session.csrf }, 'نفس بيانات رد الدخول ورمز الجلسة')
  assert.deepEqual([current.user.id, current.user.displayName, current.user.mustChangePassword, current.user.scopeAllBranches], [U.worker.id, 'حساب worker', false, false])
  // الكتابة: من غير الرمز، أو برمز غلط، أو برمز جلسة تانية، أو فاضي = 403 بكوده — ومن غير أي أثر
  for (const csrf of [undefined, '', 'x'.repeat(48), kept.csrf, session.csrf.toUpperCase(), `${session.csrf}0`]) {
    const refused = await write(withSession(session, csrf))
    assert.deepEqual([refused.status, codeOf(refused), refused.body.message], [403, rules.CSRF_TOKEN_INVALID, rules.CSRF_MESSAGE], String(csrf))
  }
  expect(await write(withSession(session, session.csrf)), 200)
  // ورفع ملف (multipart — الشكل اللي نموذج من موقع تاني يقدر يبعته) بنفس الحكم
  const form = () => { const data = new FormData(); data.append('file', new Blob([Buffer.from('%PDF-1.4\n')], { type: 'application/pdf' }), 'note.pdf'); return data }
  const blocked = await http('POST', '/files/upload', form(), withSession(session))
  assert.deepEqual([blocked.status, codeOf(blocked)], [403, rules.CSRF_TOKEN_INVALID])
  assert.equal(await repo('StoredFile').count(), 0)
  assert.notEqual((await http('POST', '/files/upload', form(), withSession(session, session.csrf))).status, 403)
  // الرمز في الترويسة بس: في الجسم أو في الاستعلام مايتحسبش
  assert.equal((await http('PATCH', `/notifications/read?csrf=${session.csrf}`, { csrfToken: session.csrf, _csrf: session.csrf }, withSession(session))).status, 403)

  // ترويسة Bearer بتسبق الـcookie: توكن سليم في الترويسة = من غير شرط الرمز؛ وتوكن تالف في الترويسة = 401 (الـcookie مابتنقذوش)
  expect(await write({ Authorization: `Bearer ${session.token}` }), 200)
  expect(await write({ Authorization: `Bearer ${session.token}`, Cookie: kept.cookie }), 200)
  expect(await http('GET', '/auth/me', undefined, { Authorization: 'Bearer not-a-token', Cookie: session.cookie }), 401)
  // cookie تالفة، أو باسم تاني، أو فاضية: مفيش جلسة
  for (const cookie of ['hr_session=not-a-token', `session=${session.token}`, `hr_session_old=${session.token}`, 'hr_session=', `HR_SESSION=${session.token}`]) {
    expect(await http('GET', '/auth/me', undefined, { Cookie: cookie }), 401)
  }
  // cookie وسط غيرها بتتقري باسمها بالحرف
  expect(await http('GET', '/auth/me', undefined, { Cookie: `theme=dark; hr_session_old=x; ${session.cookie}; lang=ar` }), 200)
  // توكن بتوقيع تاني في الـcookie: مرفوض
  const forged = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret: crypto.randomBytes(48).toString('hex') }).sign({ ...claims, role: 'super_admin' })
  expect(await http('GET', '/auth/me', undefined, { Cookie: `hr_session=${forged}` }), 401)
  // إبطال الجلسة القايم (إصدار التوكن) شغال على الـcookie زي الترويسة
  const other = await cookieLogin('second')
  expect(await write(withSession(other, other.csrf)), 200)
  await repo('User').update({ id: U.second.id }, { tokenVersion: () => 'tokenVersion + 1' })
  expect(await http('GET', '/auth/me', undefined, withSession(other)), 401)
  expect(await write(withSession(other, other.csrf)), 401)
})

test('SC-03: logout clears the cookie only for a request that carries it', async () => {
  const session = await cookieLogin('worker')
  const out = await http('POST', '/auth/logout', undefined, withSession(session))
  assert.deepEqual([out.status, out.body, out.cookies], [200, { ok: true }, ['hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0']])
  // طلب من غير الـcookie (زي طلب من موقع تاني مع SameSite): مفيش مسح — مايعرفش يخرّج حد
  const foreign = await http('POST', '/auth/logout')
  assert.deepEqual([foreign.status, foreign.cookies], [200, []])
  // cookie منتهية أو تالفة برضه بتتمسح (الخروج من غير حارس)
  assert.equal((await http('POST', '/auth/logout', undefined, { Cookie: 'hr_session=expired-or-broken' })).cookies.length, 1)
})

test('SC-04: changing the password re-issues the session in the shape the request came in, and the temporary-password gate holds through the cookie', async () => {
  const session = await cookieLogin('changer', { remember: true })
  const next = passwordOf()
  // من غير رمز CSRF: مرفوض، وكلمة السر زي ما هي
  const blocked = await http('POST', '/auth/change-password', { currentPassword: P.changer, newPassword: next }, withSession(session))
  assert.deepEqual([blocked.status, codeOf(blocked)], [403, rules.CSRF_TOKEN_INVALID])
  expect(await http('POST', '/auth/login', { email: U.changer.email, password: P.changer }), 201)
  const changed = await http('POST', '/auth/change-password', { currentPassword: P.changer, newPassword: next, remember: true }, withSession(session, session.csrf))
  assert.deepEqual(Object.keys(expect(changed, 200)).sort(), ['csrfToken', 'user'])
  const fresh = sessionOf(changed)
  assert.equal(fresh.attributes.at(-1), `Max-Age=${jwtLifetimeSeconds(process.env.JWT_EXPIRES_IN ?? '8h')}`)
  assert.notEqual(fresh.csrf, session.csrf)
  // الجلسة القديمة ماتت (الإصدار زاد)، والجديدة شغالة برمزها هي
  expect(await http('GET', '/auth/me', undefined, withSession(session)), 401)
  expect(await write(withSession(fresh, session.csrf)), 403)
  expect(await write(withSession(fresh, fresh.csrf)), 200)
  // نفس التغيير بترويسة Bearer: الرد توكن في الجسم ومن غير cookie (زي ما كان)
  const bearer = expect(await http('POST', '/auth/login', { email: U.changer.email, password: next }), 201)
  const again = await http('POST', '/auth/change-password', { currentPassword: next, newPassword: passwordOf() }, { Authorization: `Bearer ${bearer.accessToken}` })
  assert.deepEqual([Object.keys(expect(again, 200)).sort(), again.cookies], [['accessToken', 'user'], []])

  // كلمة مؤقتة: جلسة الـcookie مابتفتحش غير «غيّر كلمة المرور» و«بيانات الجلسة»
  await repo('User').update({ id: U.forced.id }, { mustChangePassword: true })
  const forced = await cookieLogin('forced')
  assert.equal(forced.user.mustChangePassword, true)
  assert.equal(expect(await http('GET', '/auth/session', undefined, withSession(forced)), 200).user.mustChangePassword, true)
  const gated = await write(withSession(forced, forced.csrf))
  assert.deepEqual([gated.status, codeOf(gated)], [403, 'PASSWORD_CHANGE_REQUIRED'])
  const opened = sessionOf(await http('POST', '/auth/change-password', { currentPassword: P.forced, newPassword: passwordOf() }, withSession(forced, forced.csrf)))
  assert.equal(opened.user.mustChangePassword, false)
  expect(await write(withSession(opened, opened.csrf)), 200)
})

test('SC-05: the second login step hands the session over as a cookie when asked, and the pending step never sets one', async () => {
  await config('auth.two_factor_enabled', 'true')
  try {
    mailbox.length = 0
    const pending = await http('POST', '/auth/login', { email: U.coded.email, password: P.coded, cookieSession: true })
    const challenge = expect(pending, 201)
    assert.deepEqual([challenge.twoFactor, pending.cookies, 'accessToken' in challenge, 'csrfToken' in challenge], [true, [], false, false], 'الحالة المعلّقة مش جلسة: ولا cookie ولا رمز')
    const code = /رمز الدخول: (\d{6})/.exec(mailbox[0].text)[1]
    const verified = await http('POST', '/auth/login/verify', { challengeToken: challenge.challengeToken, code, cookieSession: true, remember: true })
    assert.deepEqual(Object.keys(expect(verified, 200)).sort(), ['csrfToken', 'user'])
    const session = sessionOf(verified)
    assert.equal(session.attributes.includes('HttpOnly'), true)
    expect(await write(withSession(session, session.csrf)), 200)
    // ومن غير الطلب: توكن في الجسم زي ما كان
    mailbox.length = 0
    const plain = expect(await http('POST', '/auth/login', { email: U.coded.email, password: P.coded }), 201)
    const done = await http('POST', '/auth/login/verify', { challengeToken: plain.challengeToken, code: /رمز الدخول: (\d{6})/.exec(mailbox[0].text)[1] })
    assert.deepEqual([Object.keys(expect(done, 200)).sort(), done.cookies], [['accessToken', 'user'], []])
  } finally { await config('auth.two_factor_enabled', 'false') }
})

test('SC-06: on HTTPS the cookie is Secure under the __Host- name, and only that name is read', async () => {
  const before = { FRONTEND_URL: process.env.FRONTEND_URL }
  try {
    process.env.FRONTEND_URL = 'https://hr.example.invalid'
    const secure = sessionOf(await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: true }), '__Host-hr_session')
    assert.deepEqual(secure.attributes, ['Path=/', 'HttpOnly', 'SameSite=Strict', 'Secure'])
    expect(await http('GET', '/auth/me', undefined, withSession(secure)), 200)
    // cookie بالاسم العادي (اللي نطاق فرعي أو صفحة HTTP يقدر يزرعها) مابتتقريش، حتى لو فيها توكن سليم
    expect(await http('GET', '/auth/me', undefined, { Cookie: `hr_session=${secure.token}` }), 401)
    expect(await http('GET', '/auth/me', undefined, { Cookie: `hr_session=${secure.token}; ${secure.cookie}` }), 200)
    assert.deepEqual((await http('POST', '/auth/logout', undefined, withSession(secure))).cookies, ['__Host-hr_session=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0'])
    // إعداد النشر على موقعين: Lax، وNone دايمًا مع Secure
    process.env.SESSION_COOKIE_SAMESITE = 'lax'
    assert.equal(sessionOf(await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: true }), '__Host-hr_session').attributes[2], 'SameSite=Lax')
    process.env.FRONTEND_URL = 'http://localhost:3000'; process.env.SESSION_COOKIE_SAMESITE = 'none'
    assert.deepEqual(sessionOf(await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: true }), '__Host-hr_session').attributes.slice(2), ['SameSite=None', 'Secure'])
  } finally {
    process.env.FRONTEND_URL = before.FRONTEND_URL; delete process.env.SESSION_COOKIE_SAMESITE
  }
  assert.deepEqual((await cookieLogin('worker')).attributes, ['Path=/', 'HttpOnly', 'SameSite=Strict'])
})

test('SC-07 (CRP3D-N02): a cookie logout sent from another site is refused unless it carries the session\'s CSRF token', async () => {
  const session = await cookieLogin('worker')
  const evil = { Origin: 'https://evil.example' }
  // من موقع تاني (أو Origin «null») من غير رمز الجلسة أو برمز غلط: مرفوض، ومن غير مسح، والجلسة لسه قايمة
  for (const headers of [{ ...withSession(session), ...evil }, { ...withSession(session, 'wrong-token'), ...evil }, { ...withSession(session), Origin: 'null' }]) {
    const refused = await http('POST', '/auth/logout', undefined, headers)
    assert.deepEqual([refused.status, codeOf(refused), refused.cookies], [403, 'CSRF_TOKEN_INVALID', []])
  }
  expect(await http('GET', '/auth/me', undefined, withSession(session)), 200)
  // من عنوان الواجهة نفسها (حتى من غير الرمز): بيخرج، والجلسة اتنهت من الخادم
  const own = await http('POST', '/auth/logout', undefined, { ...withSession(session), Origin: 'http://localhost:3000' })
  assert.deepEqual([own.status, own.cookies.length], [200, 1])
  expect(await http('GET', '/auth/me', undefined, withSession(session)), 401)
  // برمز الجلسة من أي عنوان (واجهة ورا عنوان تاني): بيخرج
  const second = await cookieLogin('worker')
  const withToken = await http('POST', '/auth/logout', undefined, { ...withSession(second, second.csrf), ...evil })
  assert.deepEqual([withToken.status, withToken.cookies.length], [200, 1])
  // cookie تالفة من موقع تاني: بتتمسح (مفيش جلسة تتحمى)؛ وطلب من غير cookie مابيمسحش حاجة
  assert.equal((await http('POST', '/auth/logout', undefined, { Cookie: 'hr_session=expired-or-broken', ...evil })).cookies.length, 1)
  assert.deepEqual((await http('POST', '/auth/logout', undefined, evil)).cookies, [])
  const { fromFrontendOrigin } = require('../src/auth/session-cookie')
  assert.deepEqual([undefined, '', 'http://localhost:3000', 'http://localhost:3000/', 'https://localhost:3000', 'http://localhost:3001', 'null', 'not a url', 7]
    .map(origin => fromFrontendOrigin(origin, { FRONTEND_URL: 'http://localhost:3000/' })), [true, true, true, true, false, false, false, false, false])
})
