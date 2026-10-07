// B2.17 (ب): الجلسات النشطة — كل دخول بيفتح جلسة برقمها في التوكن، وصاحب الحساب بيشوف جلساته وبينهي أي واحدة، والجلسة المنتهية
// (من «جلساتي» أو بالخروج أو بتغيير كلمة المرور) مابتعدّيش حتى لو توكنها لسه في مدته.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_user_sessions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-sessions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/user-sessions')
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const PHONE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
let app, master, ds, base, created = false
const U = {}, P = {}

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
const bearer = token => ({ Authorization: `Bearer ${token}` })
/** دخول بترويسة جهاز: التوكن ومطالبه */
async function signIn(key, userAgent = CHROME, password = P[key]) {
  const body = expect(await http('POST', '/auth/login', { email: U[key].email, password }, { 'User-Agent': userAgent }), 201)
  return { token: body.accessToken, claims: jwt.verify(body.accessToken) }
}
const alive = async token => (await http('GET', '/auth/me', undefined, bearer(token))).status
const mine = async token => expect(await http('GET', '/auth/sessions', undefined, bearer(token)), 200)
const rowsOf = userId => query('SELECT [id], [sid], [tokenVersion], [ip], [userAgent], [revokedAt], [revokedReason] FROM [user_sessions] WHERE [userId] = @0 ORDER BY [id]', [userId])
const audits = action => repo('AuditLog').count({ where: { action } })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_user_sessions_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20',
    FRONTEND_URL: 'http://localhost:3000' })
  delete process.env.SESSION_COOKIE_SAMESITE; delete process.env.SESSION_COOKIE_SECURE
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية من اختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false; mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const branch = await repo('Branch').save({ code: 'USS', name: 'فرع الجلسات', country: 'EG', weekendDays: 'FRI' })
  for (const key of ['worker', 'other', 'changer']) {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@user-sessions.invalid`, displayName: `حساب ${key}`, role: 'employee', permissions: '[]', isActive: true, branchId: branch.id,
      passwordHash: await bcrypt.hash(P[key], 10) })
  }
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_user_sessions_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-user-sessions-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار الجلسات النشطة')
})

test('US-01: every login opens a session whose number rides in the token, and the owner sees his own open sessions only', async () => {
  const desk = await signIn('worker', CHROME), phone = await signIn('worker', PHONE)
  const theirs = await signIn('other', CHROME)
  // رقم الجلسة في التوكن: 48 حرف عشوائي، ولكل دخول رقمه
  assert.match(desk.claims.sid, /^[0-9a-f]{48}$/); assert.notEqual(desk.claims.sid, phone.claims.sid)
  const rows = await rowsOf(U.worker.id)
  assert.deepEqual(rows.map(row => [row.sid, row.tokenVersion, row.userAgent, row.revokedAt, row.revokedReason]),
    [[desk.claims.sid, 0, CHROME, null, null], [phone.claims.sid, 0, PHONE, null, null]])
  assert.ok(rows.every(row => typeof row.ip === 'string' && row.ip.length > 0), 'الـIP متسجّل')
  // «جلساتي»: جلسات الحساب نفسه بس — بالجهاز، وعلامة الجلسة الحالية، ومن غير رقم الجلسة
  const list = await mine(desk.token)
  assert.deepEqual([list.available, list.message], [true, null])
  assert.deepEqual(list.items.map(item => [item.id, item.current, item.device]).sort((a, b) => a[0] - b[0]),
    [[rows[0].id, true, 'Chrome على Windows'], [rows[1].id, false, 'Chrome على Android']])
  assert.deepEqual(Object.keys(list.items[0]).sort(), ['createdAt', 'current', 'device', 'expiresAt', 'id', 'ip', 'lastSeenAt'])
  assert.doesNotMatch(JSON.stringify(list), new RegExp(`${desk.claims.sid}|${phone.claims.sid}|${theirs.claims.sid}|Mozilla`), 'ولا رقم جلسة ولا ترويسة خام')
  assert.deepEqual((await mine(phone.token)).items.map(item => item.current).sort(), [false, true])
  assert.equal((await mine(theirs.token)).items.length, 1)
  // مدة الجلسة = مدة التوكن
  const item = list.items.find(row => row.current)
  assert.ok(Math.abs(new Date(item.expiresAt).getTime() - desk.claims.exp * 1000) < 5000, 'نهاية الجلسة = نهاية التوكن')
  // «آخر نشاط» بيتحدّث لما يعدّي عليه كام دقيقة، مش مع كل طلب
  const seen = async () => new Date((await query('SELECT [lastSeenAt] FROM [user_sessions] WHERE [sid] = @0', [desk.claims.sid]))[0].lastSeenAt).getTime()
  const first = await seen()
  assert.equal(await alive(desk.token), 200); assert.equal(await seen(), first)
  await query(`UPDATE [user_sessions] SET [lastSeenAt] = DATEADD(minute, -${rules.SESSION_TOUCH_MINUTES + 1}, SYSUTCDATETIME()) WHERE [sid] = @0`, [desk.claims.sid])
  const stale = await seen()
  assert.equal(await alive(desk.token), 200)
  assert.ok(await seen() > stale + 60_000, 'اتحدّث بعد المدة')
  // وبساعة التطبيق نفسها (اللي الشاشة بتعرضها): «آخر نشاط» دلوقتي، مش مزاح بفرق المنطقة الزمنية
  assert.ok(Math.abs(await seen() - Date.now()) < 60_000, 'آخر نشاط = دلوقتي')
  assert.ok(Math.abs(new Date((await mine(desk.token)).items.find(row => row.current).lastSeenAt).getTime() - Date.now()) < 60_000)
  // من غير جلسة: 401
  expect(await http('GET', '/auth/sessions'), 401)
  expect(await http('DELETE', `/auth/sessions/${rows[0].id}`), 401)
})

test('US-02: ending one session kills its token only; another account\'s session answers like a missing one', async () => {
  const desk = await signIn('worker'), phone = await signIn('worker', PHONE), theirs = await signIn('other')
  const idOf = async sid => Number((await query('SELECT [id] FROM [user_sessions] WHERE [sid] = @0', [sid]))[0].id)
  const phoneId = await idOf(phone.claims.sid), theirId = await idOf(theirs.claims.sid)
  const before = await audits('SESSION_ENDED')
  // جلسة حساب تاني، ورقم مش موجود، ورقم غلط: نفس الرد — ومابتتلمسش
  for (const id of [theirId, 999999, 0]) {
    const refused = await http('DELETE', `/auth/sessions/${id}`, undefined, bearer(desk.token))
    assert.deepEqual([refused.status, messageOf(refused)], [404, rules.SESSION_NOT_FOUND], String(id))
  }
  expect(await http('DELETE', '/auth/sessions/abc', undefined, bearer(desk.token)), 400)
  assert.equal(await alive(theirs.token), 200)
  // إنهاء جلسة الموبايل من المكتب: توكنها مابقاش يعدّي، والمكتب شغال
  assert.deepEqual(expect(await http('DELETE', `/auth/sessions/${phoneId}`, undefined, bearer(desk.token)), 200), { ended: true, current: false })
  const dead = await http('GET', '/auth/me', undefined, bearer(phone.token))
  assert.deepEqual([dead.status, messageOf(dead)], [401, rules.SESSION_ENDED_MESSAGE])
  assert.equal(await alive(desk.token), 200)
  assert.equal((await mine(desk.token)).items.some(item => item.id === phoneId), false)
  const [row] = await query('SELECT [revokedReason], [revokedAt] FROM [user_sessions] WHERE [id] = @0', [phoneId])
  assert.deepEqual([row.revokedReason, row.revokedAt instanceof Date, Math.abs(row.revokedAt.getTime() - Date.now()) < 60_000], ['USER', true, true], 'وقت الإنهاء = دلوقتي')
  // مرة تانية على نفس الجلسة: مش موجودة (اتنهت)
  expect(await http('DELETE', `/auth/sessions/${phoneId}`, undefined, bearer(desk.token)), 404)
  assert.equal(await audits('SESSION_ENDED') - before, 1)

  // «إنهاء كل الجلسات التانية»: الحالية بتفضل، وجلسات الحساب التاني مالهاش دعوة
  const tab = await signIn('worker'), old = await signIn('worker', PHONE)
  const ended = expect(await http('POST', '/auth/sessions/end-others', undefined, bearer(tab.token)), 200)
  assert.ok(ended.ended >= 2, JSON.stringify(ended))
  assert.deepEqual([await alive(tab.token), await alive(desk.token), await alive(old.token), await alive(theirs.token)], [200, 401, 401, 200])
  assert.deepEqual((await mine(tab.token)).items.map(item => item.current), [true])
  assert.deepEqual(expect(await http('POST', '/auth/sessions/end-others', undefined, bearer(tab.token)), 200), { ended: 0 })
  assert.equal(await audits('SESSIONS_ENDED'), 1)

  // إنهاء الجلسة الحالية نفسها وهي cookie: الـcookie بتتمسح والجلسة بتموت
  const login = await http('POST', '/auth/login', { email: U.worker.email, password: P.worker, cookieSession: true })
  const cookie = login.cookies[0].split('; ')[0], csrf = expect(login, 201).csrfToken
  const currentId = (expect(await http('GET', '/auth/sessions', undefined, { Cookie: cookie }), 200)).items.find(item => item.current).id
  // من غير رمز CSRF: مرفوض والجلسة قايمة
  assert.equal((await http('DELETE', `/auth/sessions/${currentId}`, undefined, { Cookie: cookie })).status, 403)
  const out = await http('DELETE', `/auth/sessions/${currentId}`, undefined, { Cookie: cookie, 'X-CSRF-Token': csrf })
  assert.deepEqual([expect(out, 200), out.cookies], [{ ended: true, current: true }, ['hr_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0']])
  expect(await http('GET', '/auth/me', undefined, { Cookie: cookie }), 401)
})

test('US-03: logout ends the session on the server — its token no longer passes, in a header or in a cookie', async () => {
  const session = await signIn('other')
  assert.equal(await alive(session.token), 200)
  expect(await http('POST', '/auth/logout', undefined, bearer(session.token)), 200)
  assert.equal(await alive(session.token), 401)
  const [row] = await query('SELECT [revokedReason] FROM [user_sessions] WHERE [sid] = @0', [session.claims.sid])
  assert.equal(row.revokedReason, 'LOGOUT')
  // بالـcookie
  const login = await http('POST', '/auth/login', { email: U.other.email, password: P.other, cookieSession: true })
  const cookie = login.cookies[0].split('; ')[0]
  expect(await http('GET', '/auth/me', undefined, { Cookie: cookie }), 200)
  assert.equal((await http('POST', '/auth/logout', undefined, { Cookie: cookie })).cookies.length, 1)
  expect(await http('GET', '/auth/me', undefined, { Cookie: cookie }), 401)
  // توكن تالف أو من غير جلسة: الخروج مابيعملش حاجة وبيرد عادي
  const count = async () => Number((await query('SELECT COUNT(*) AS [n] FROM [user_sessions] WHERE [revokedAt] IS NOT NULL'))[0].n)
  const revoked = await count()
  for (const headers of [{}, bearer('not-a-token'), { Cookie: 'hr_session=broken' }]) expect(await http('POST', '/auth/logout', undefined, headers), 200)
  assert.equal(await count(), revoked)
})

test('US-04: a password change closes every session row; a dead or foreign session number never passes; a token without a number keeps the standing rule', async () => {
  const first = await signIn('changer'), second = await signIn('changer', PHONE)
  const next = passwordOf()
  const changed = expect(await http('POST', '/auth/change-password', { currentPassword: P.changer, newPassword: next }, bearer(first.token)), 200)
  const fresh = jwt.verify(changed.accessToken)
  assert.deepEqual([await alive(first.token), await alive(second.token), await alive(changed.accessToken)], [401, 401, 200])
  const rows = await rowsOf(U.changer.id)
  assert.deepEqual(rows.map(row => [row.sid === fresh.sid, row.tokenVersion, row.revokedReason]), [[false, 0, 'PASSWORD'], [false, 0, 'PASSWORD'], [true, 1, null]])
  assert.deepEqual((await mine(changed.accessToken)).items.map(item => item.current), [true])

  // إصدار الحساب زاد من برّه (تعطيل، تغيير دور…): جلساته القديمة ميتة بالإصدار، فمابتتعرضش في «جلساتي» بعد دخول جديد
  await repo('User').update({ id: U.changer.id }, { tokenVersion: () => 'tokenVersion + 1' })
  assert.equal(await alive(changed.accessToken), 401)
  const again = await signIn('changer', CHROME, next)
  assert.deepEqual((await mine(again.token)).items.map(item => item.current), [true])
  // وجلسة مدتها خلصت مابتتعرضش
  const idle = await signIn('changer', PHONE, next)
  await query('UPDATE [user_sessions] SET [expiresAt] = DATEADD(minute, -1, SYSUTCDATETIME()) WHERE [sid] = @0', [idle.claims.sid])
  assert.deepEqual((await mine(again.token)).items.map(item => item.current), [true])

  // توكن موقّع سليم لكن برقم جلسة حساب تاني، أو برقم مش موجود، أو بحروف كبيرة: مرفوض
  const other = await signIn('other')
  const claims = { sub: U.worker.id, email: U.worker.email, role: 'employee', branchId: U.worker.branchId, employeeId: null, tokenVersion: 0, permissions: [] }
  for (const sid of [other.claims.sid, 'f'.repeat(48), other.claims.sid.toUpperCase()]) {
    const refused = await http('GET', '/auth/me', undefined, bearer(jwt.sign({ ...claims, sid })))
    assert.deepEqual([refused.status, messageOf(refused)], [401, rules.SESSION_ENDED_MESSAGE], sid.slice(0, 8))
  }
  // توكن من غير رقم جلسة (متوقّع برّه مسار الدخول — السكربتات والاختبارات): بالإصدار بس زي الأول، ومالوش «جلسة حالية»
  const bare = jwt.sign(claims)
  assert.equal(await alive(bare), 200)
  const listed = await mine(bare)
  assert.ok(listed.items.every(item => item.current === false))
  // «إنهاء الباقي» بتوكن من غير رقم: مفيش حالية، فكل جلسات الحساب بتتنهي
  const live = await signIn('worker')
  expect(await http('POST', '/auth/sessions/end-others', undefined, bearer(bare)), 200)
  assert.deepEqual([await alive(live.token), await alive(bare)], [401, 200])
})
