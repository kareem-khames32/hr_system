'use strict'
// B6.4 على SQL حقيقي: الدخول المؤسسي (OIDC) من أوله لآخره بمزوّد هوية محلي على 127.0.0.1 جوه الاختبار (اكتشاف، مفاتيح، تبديل كود) — من غير أي اتصال
// برّه الجهاز ومن غير أي كلمة مرور: المسار مقفول من غير إعداد؛ البداية بترجّع عنوان المزوّد ومعاملة في cookie؛ الإكمال بيتحقق من المعاملة والـstate
// والـPKCE والـID token، وبيطابق الموظف بنفس منطق حساب الشركة (ربط مرة، ورفض الغريب والنطاق والهوية التانية)، وبيكمّل بالخطوة التانية بتاعة النظام.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), http = require('node:http')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_sso_oidc_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_sso_oidc_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sso-oidc-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const rules = require('../src/auth/sso-oidc')
const { DOMAIN_LOGIN_REFUSALS } = require('../src/auth/domain-login.service')
const FRONTEND = 'http://localhost:3000', CLIENT_ID = 'hr-test-client', CLIENT_SECRET = crypto.randomBytes(24).toString('hex')
let master, pool, app, ds, base, provider, issuer, created = false
const B = {}, E = {}
// ===== مزوّد الهوية المحلي =====
const idpKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const idpJwk = { ...idpKey.publicKey.export({ format: 'jwk' }), kid: 'idp-key-1', use: 'sig', alg: 'RS256' }
const b64 = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
const tokenRequests = []
/** الكود ← الادعاءات اللي المزوّد هيصدرها له (والـnonce وتحدي PKCE اللي اتسجلوا وقت التفويض) */
const codes = new Map()
let tokenOverride = null
const signIdToken = (claims, key = idpKey.privateKey, kid = 'idp-key-1') => {
  const head = b64({ alg: 'RS256', typ: 'JWT', kid }), body = b64(claims)
  return `${head}.${body}.${crypto.sign('RSA-SHA256', Buffer.from(`${head}.${body}`), key).toString('base64url')}`
}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
async function post(route, body, cookie) {
  const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: FRONTEND, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body ?? {}) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed, cookies: response.headers.getSetCookie() }
}
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
/** بداية دخول: عنوان المزوّد، وcookie المعاملة زي ما المتصفح هيبعتها */
async function begin() {
  const started = await post('/auth/login/sso/start')
  assert.equal(started.status, 200, JSON.stringify(started.body))
  const url = new URL(started.body.url), cookie = started.cookies.find(value => value.startsWith(rules.SSO_TX_COOKIE + '='))
  return { url, cookie: cookie.split(';')[0], cookieHeader: cookie }
}
/** «المستخدم دخل عند المزوّد»: المزوّد بيصدر كود للادعاءات دي مربوط بالـnonce وتحدي PKCE بتوع طلب التفويض */
function approve(url, claims) {
  const code = crypto.randomBytes(16).toString('hex')
  codes.set(code, { claims, nonce: url.searchParams.get('nonce'), challenge: url.searchParams.get('code_challenge'), redirectUri: url.searchParams.get('redirect_uri') })
  return { code, state: url.searchParams.get('state') }
}
const signIn = async (claims, options = {}) => {
  const started = await begin(), returned = approve(started.url, claims)
  return post('/auth/login/sso/callback', { code: returned.code, state: returned.state, ...options.body }, options.cookie === undefined ? started.cookie : options.cookie)
}
const employee = (code, name, email, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, email, branchId: B.main.id, joinDate: '2022-03-01', basicSalary: 9000, status: 'active', isActive: true, ...extra })
const userOf = employeeId => repo('User').findOne({ where: { employeeId } })
const events = async () => (await pool.request().query(`SELECT [method], [outcome], [identifier] FROM dbo.login_events ORDER BY [id]`)).recordset.map(row => [row.method, row.outcome, row.identifier])

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  provider = http.createServer((incoming, response) => {
    const chunks = []
    incoming.on('data', chunk => chunks.push(chunk))
    incoming.on('end', () => {
      const send = (status, body) => { response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(body)) }
      if (incoming.url === '/.well-known/openid-configuration') return send(200, { issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', jwks_uri: issuer + '/keys' })
      if (incoming.url === '/keys') return send(200, { keys: [idpJwk] })
      if (incoming.url === '/token' && incoming.method === 'POST') {
        const form = Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')))
        tokenRequests.push(form)
        const granted = codes.get(form.code)
        codes.delete(form.code)
        // مزوّد حقيقي: الكود لمرة واحدة، وسر التطبيق، وعنوان الرجوع، ومفتاح PKCE لازم يطابق تحدي طلب التفويض
        if (!granted || form.client_id !== CLIENT_ID || form.client_secret !== CLIENT_SECRET || form.grant_type !== 'authorization_code' || form.redirect_uri !== granted.redirectUri ||
          crypto.createHash('sha256').update(String(form.code_verifier)).digest('base64url') !== granted.challenge) return send(400, { error: 'invalid_grant' })
        const now = Math.floor(Date.now() / 1000)
        const idToken = tokenOverride ? tokenOverride(granted, now) : signIdToken({ iss: issuer, aud: CLIENT_ID, exp: now + 300, iat: now, nonce: granted.nonce, ...granted.claims })
        return send(200, { token_type: 'Bearer', access_token: 'unused', id_token: idToken })
      }
      send(404, { error: 'not_found' })
    })
  })
  await new Promise(resolve => provider.listen(0, '127.0.0.1', resolve))
  issuer = `http://127.0.0.1:${provider.address().port}`
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  // الـSSO مش مضبوط في أول اختبار (المفاتيح بتتحط بعده)؛ ومزوّد http محلي مسموح للاختبار بس
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: FRONTEND, AUTH_FAILURE_DELAY_MS: '0' })
  for (const key of Object.keys(process.env)) if (key.startsWith('SSO_OIDC_')) delete process.env[key]
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار، ومفيش اتصال بدليل الشركة
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  const directory = app.get(require('../src/auth/directory.service').DirectoryService)
  directory.isConfigured = () => false
  directory.authenticate = async () => { throw new Error('no directory in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  B.main = await repo('Branch').save({ code: 'SSO_1', name: 'الفرع الرئيسي', country: 'SA' })
  E.mona = await employee('SSO-001', 'منى أحمد', 'mona@corp.example.com')
  E.omar = await employee('SSO-002', 'عمر خالد', 'omar@corp.example.com')
  E.gone = await employee('SSO-003', 'موظف منتهي', 'gone@corp.example.com', { status: 'terminated', isActive: false })
}, { timeout: 120000 })

after(async t => {
  if (provider) await new Promise(resolve => provider.close(resolve))
  if (app) await app.close()
  if (pool) await pool.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('SS-01: من غير إعداد المسار مقفول وشاشة الدخول زي ما هي؛ وبالإعداد الزرار بيظهر باسمه، والبداية بترجّع عنوان المزوّد ومعاملة في cookie على مسارها', async () => {
  const closed = await (await fetch(base + '/auth/login/options')).json()
  assert.deepEqual(Object.keys(closed), ['domainLoginEnabled'])
  refused(await post('/auth/login/sso/start'), 503, rules.SSO_NOT_CONFIGURED)
  refused(await post('/auth/login/sso/callback', { code: 'x', state: 'y' }), 503, rules.SSO_NOT_CONFIGURED)
  Object.assign(process.env, { SSO_OIDC_ISSUER: issuer, SSO_OIDC_CLIENT_ID: CLIENT_ID, SSO_OIDC_CLIENT_SECRET: CLIENT_SECRET, SSO_OIDC_ALLOWED_DOMAINS: 'corp.example.com', SSO_OIDC_ALLOW_INSECURE: '1', SSO_OIDC_LABEL: 'الدخول بحساب Microsoft' })
  assert.deepEqual(await (await fetch(base + '/auth/login/options')).json(), { domainLoginEnabled: false, ssoEnabled: true, ssoLabel: 'الدخول بحساب Microsoft' })
  const started = await begin()
  assert.deepEqual([started.url.origin + started.url.pathname, started.url.searchParams.get('client_id'), started.url.searchParams.get('redirect_uri'), started.url.searchParams.get('response_type'), started.url.searchParams.get('code_challenge_method'),
    started.url.searchParams.get('scope')], [issuer + '/authorize', CLIENT_ID, FRONTEND + '/login', 'code', 'S256', 'openid profile email'])
  // ولا سر في العنوان ولا في رد البداية؛ والـcookie للمسار ده بس ومش مقروءة من سكربت الصفحة
  assert.equal(started.url.toString().includes(CLIENT_SECRET), false)
  assert.match(started.cookieHeader, /; Path=\/api\/auth\/login\/sso; HttpOnly; SameSite=Strict; Max-Age=600$/)
  // من أصل غير واجهة النظام: مرفوض
  const foreign = await fetch(base + '/auth/login/sso/start', { method: 'POST', headers: { Origin: 'https://evil.example' } })
  assert.equal(foreign.status, 403)
})

test('SS-02: الدخول — هوية المزوّد بتتطابق بالموظف بنفس منطق حساب الشركة: أول دخول بيعمل حساب واحد مربوط، والتاني بيلاقيه بالمعرّف الثابت حتى لو البريد اتغيّر عند المزوّد', async () => {
  const first = await signIn({ sub: 'idp-mona', preferred_username: 'Mona@corp.example.com', name: 'Mona Ahmed' }, { body: { cookieSession: true } })
  assert.equal(first.status, 201, JSON.stringify(first.body))
  const account = await userOf(E.mona.id)
  // جلسة cookie: التوكن في الـcookie مش في الرد، ومعاها مسح cookie المعاملة
  assert.deepEqual([first.body.user.employeeId, first.body.accessToken, first.cookies.some(value => value.startsWith('hr_session=') && value.includes('HttpOnly')), first.cookies.some(value => value.startsWith(rules.SSO_TX_COOKIE + '=;') && value.includes('Max-Age=0')),
    account.domainObjectGuid, account.role, account.permissions ?? '[]', account.scopeAllBranches], [E.mona.id, undefined, true, true, rules.ssoObjectId(issuer, 'idp-mona'), 'employee', '[]', false])
  // المزوّد اتطلب منه الكود مرة، بسر التطبيق ومفتاح PKCE
  const exchange = tokenRequests.at(-1)
  assert.deepEqual([exchange.grant_type, exchange.client_id, exchange.client_secret === CLIENT_SECRET, exchange.redirect_uri, exchange.code_verifier.length >= 43], ['authorization_code', CLIENT_ID, true, FRONTEND + '/login', true])
  // دخول تاني بنفس الهوية والبريد اتغيّر عند المزوّد (لنطاق مسموح): نفس الحساب بالمعرّف الثابت، ومفيش حساب تاني
  const again = await signIn({ sub: 'idp-mona', preferred_username: 'mona.ahmed@corp.example.com' })
  assert.deepEqual([again.status, again.body.user.id, typeof again.body.accessToken, await repo('User').count({ where: { employeeId: E.mona.id } })], [201, account.id, 'string', 1])
  assert.deepEqual((await events()).filter(row => row[0] === 'SSO').map(row => [row[1], row[2]]), [['SSO_IDENTITY', 'mona@corp.example.com'], ['SSO_IDENTITY', 'mona.ahmed@corp.example.com']])
})

test('SS-03: الرفض — من غير معاملة أو بـstate غلط أو بمعاملة متصفح تاني؛ ونطاق مش مسموح، وهوية غريبة، وموظف منتهي، وهوية تانية لحساب مربوط: مفيش جلسة ومفيش حساب', async () => {
  const users = await repo('User').count()
  const started = await begin(), returned = approve(started.url, { sub: 'idp-omar', preferred_username: 'omar@corp.example.com' })
  // من غير cookie المعاملة، وبـstate مش بتاعها، وبمعاملة بدأها متصفح تاني
  const otherBrowser = await begin()
  refused(await post('/auth/login/sso/callback', { code: returned.code, state: returned.state }), 401, rules.SSO_TX_INVALID)
  refused(await post('/auth/login/sso/callback', { code: returned.code, state: 'another-state-another-state' }, started.cookie), 401, rules.SSO_TX_INVALID)
  refused(await post('/auth/login/sso/callback', { code: returned.code, state: returned.state }, otherBrowser.cookie), 401, rules.SSO_TX_INVALID)
  refused(await post('/auth/login/sso/callback', { code: returned.code, state: returned.state }, started.cookie.replace(/.$/, 'x')), 401, rules.SSO_TX_INVALID)
  // ولا محاولة من دول وصلت للمزوّد
  const before = tokenRequests.length
  assert.equal(codes.has(returned.code), true)
  // كود اتستخدم قبل كده (المزوّد بيرفضه): رسالة واحدة عامة
  const used = await begin(), usedReturn = approve(used.url, { sub: 'idp-omar', preferred_username: 'omar@corp.example.com' })
  codes.delete(usedReturn.code)
  refused(await post('/auth/login/sso/callback', { code: usedReturn.code, state: usedReturn.state }, used.cookie), 401, rules.SSO_PROVIDER_FAILED)
  assert.equal(tokenRequests.length, before + 1)
  // نطاق مش مسموح، وخانة email (اللي المستخدم يقدر يغيّرها) لوحدها من غير UPN
  refused(await signIn({ sub: 'idp-x', preferred_username: 'omar@evil.example' }), 401, rules.SSO_IDENTITY_REFUSED)
  refused(await signIn({ sub: 'idp-x', email: 'omar@corp.example.com' }), 401, rules.SSO_IDENTITY_REFUSED)
  // هوية صحيحة من المزوّد بس مالهاش موظف، وموظف منتهي
  refused(await signIn({ sub: 'idp-stranger', preferred_username: 'stranger@corp.example.com' }), 401, DOMAIN_LOGIN_REFUSALS.noMatch)
  refused(await signIn({ sub: 'idp-gone', preferred_username: 'gone@corp.example.com' }), 401, DOMAIN_LOGIN_REFUSALS.employeeEnded)
  // هوية تانية عند المزوّد ببريد موظف حسابه مربوط بهوية أولى: مفيش ربط بيتغيّر لوحده
  refused(await signIn({ sub: 'idp-impostor', preferred_username: 'mona@corp.example.com' }), 401, DOMAIN_LOGIN_REFUSALS.guidConflict)
  assert.deepEqual([await repo('User').count(), (await userOf(E.mona.id)).domainObjectGuid, await userOf(E.omar.id)], [users, rules.ssoObjectId(issuer, 'idp-mona'), null])
})

test('SS-04: الـID token — مزوّد تاني، تطبيق تاني، nonce غلط، منتهي، أو موقّع بمفتاح مش من مفاتيح المزوّد: رسالة واحدة ومفيش جلسة', async () => {
  const stranger = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const good = (granted, now, extra = {}) => ({ iss: issuer, aud: CLIENT_ID, exp: now + 300, iat: now, nonce: granted.nonce, ...granted.claims, ...extra })
  const cases = {
    'مزوّد تاني': (granted, now) => signIdToken(good(granted, now, { iss: 'https://login.example.com/other' })),
    'تطبيق تاني': (granted, now) => signIdToken(good(granted, now, { aud: 'another-app' })),
    'nonce غلط': (granted, now) => signIdToken(good(granted, now, { nonce: 'replayed-nonce-replayed-nonce' })),
    'منتهي': (granted, now) => signIdToken(good(granted, now, { exp: now - 600, iat: now - 900 })),
    'مفتاح غريب بنفس الاسم': (granted, now) => signIdToken(good(granted, now), stranger.privateKey),
    'مفتاح مش معروف': (granted, now) => signIdToken(good(granted, now), stranger.privateKey, 'unknown-key'),
    'من غير توقيع': (granted, now) => `${b64({ alg: 'none', kid: 'idp-key-1' })}.${b64(good(granted, now))}.`,
  }
  try {
    for (const [label, forge] of Object.entries(cases)) {
      tokenOverride = forge
      const response = await signIn({ sub: 'idp-omar', preferred_username: 'omar@corp.example.com' })
      assert.deepEqual([response.status, response.body?.message, response.cookies.some(value => value.startsWith('hr_session='))], [401, rules.SSO_PROVIDER_FAILED, false], label)
    }
  } finally { tokenOverride = null }
  assert.equal(await userOf(E.omar.id), null)
  // وبعد كل الرفض: الدخول الصحيح لنفس الموظف بيعدّي
  const ok = await signIn({ sub: 'idp-omar', preferred_username: 'omar@corp.example.com' })
  assert.deepEqual([ok.status, ok.body.user.employeeId, (await userOf(E.omar.id)).domainObjectGuid], [201, E.omar.id, rules.ssoObjectId(issuer, 'idp-omar')])
})

test('SS-05: الخطوة التانية بتاعة النظام بتفضل شغالة بعد الدخول المؤسسي — دور إلزامي له رمز البريد: مفيش جلسة من الـSSO لوحده', async () => {
  await repo('RequestsConfig').save({ key: 'auth.two_factor.roles', value: 'employee' })
  const response = await signIn({ sub: 'idp-omar', preferred_username: 'omar@corp.example.com' }, { body: { cookieSession: true } })
  // البريد مش مضبوط في الاختبار: الخطوة التانية مطلوبة ومابتتبعتش = مفيش دخول (فشل مقفول) — المهم مفيش جلسة
  assert.equal(response.cookies.some(value => value.startsWith('hr_session=')), false)
  assert.equal(response.body?.accessToken, undefined)
  assert.notEqual(response.status, 201)
  await repo('RequestsConfig').delete({ key: 'auth.two_factor.roles' })
})
