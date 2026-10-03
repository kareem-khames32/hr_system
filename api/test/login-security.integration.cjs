// B1.3 — أمان الدخول على قاعدة SQL مؤقتة معزولة (synchronize): القفل بعد محاولات غلط وفكه وانتهاؤه، والتأخير المتزايد، وسجل الدخول بنطاقه،
// وسياسة كلمة السر (NIST) في كل مكان بتتحط فيه كلمة جديدة، والتحقق بخطوتين الإلزامي لأدوار، ورؤوس حماية المتصفح. من غير SMTP حقيقي.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const bcrypt = require('../node_modules/bcryptjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_login_security_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-login-security-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// كلمات سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const passwordOf = () => `T-${crypto.randomBytes(9).toString('base64url')}`
let app, master, ds, base, created = false, mailbox = []
const U = {}, P = {}, B = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function http(method, route, body, user, headers = {}) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null }
}
const login = (email, password) => http('POST', '/auth/login', { email, password }, null, { 'User-Agent': 'login-security-test' })
const config = async (key, value) => { const row = await repo('RequestsConfig').findOneBy({ key }); await repo('RequestsConfig').save(row ? { ...row, value } : { key, value }) }
const lockState = async id => (await ds.query('SELECT [failedLoginCount], [lockedUntil] FROM dbo.users WHERE [id] = @0', [id]))[0]

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_login_security_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '60' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // نفس اللي main.ts بيعمله
  require('../src/security-headers').applySecurityHeaders(app, {})
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  mail.isConfigured = () => true
  mail.send = async message => { mailbox.push(message); return { messageId: 'test', response: '250 OK (test)', accepted: [message.to], rejected: [] } }

  B.a = await repo('Branch').save({ code: 'LS_A', name: 'فرع أ' })
  B.b = await repo('Branch').save({ code: 'LS_B', name: 'فرع ب' })
  const account = async (key, role, branch, permissions = []) => {
    P[key] = passwordOf()
    U[key] = await repo('User').save({ email: `${key}@login-security.invalid`, displayName: `حساب ${key}`, role, branchId: branch?.id ?? null,
      permissions: JSON.stringify(permissions), passwordHash: await bcrypt.hash(P[key], 10) })
  }
  await account('admin', 'super_admin', null)
  await account('branchAdmin', 'hr_manager', B.a, ['users.manage'])
  await account('target', 'employee', B.a)
  await account('other', 'employee', B.b)
  await account('finance', 'hr_manager', B.a)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_login_security_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'login security fixture cleanup failed')
})

test('B1.3: 10 محاولات غلط بتقفل الحساب، وحتى الصح بيرجع «مقفول»، والمدير بيفكه، والتأخير بيزيد من المحاولة التالتة', async () => {
  const email = U.target.email
  const timings = []
  for (let attempt = 1; attempt <= 9; attempt++) {
    const started = Date.now()
    const response = await login(email, `wrong-${attempt}-${passwordOf()}`)
    timings.push(Date.now() - started)
    assert.equal(response.status, 401, `محاولة ${attempt}`)
    assert.equal(response.body.message, 'بيانات الدخول غير صحيحة')
  }
  // التأخير: 60ms × (1، 2، 4، 4…) من التالتة — فوق وقت المقارنة نفسها
  assert.ok(timings[2] >= 60 && timings[3] >= 120 && timings[4] >= 240, JSON.stringify(timings))
  const tenth = await login(email, 'wrong-10-xyz-abc')
  assert.equal(tenth.status, 423)
  assert.equal(tenth.body.code, 'AUTH_ACCOUNT_LOCKED')
  assert.match(tenth.body.message, /اتقفل مؤقتًا/)
  const state = await lockState(U.target.id)
  assert.equal(state.failedLoginCount, 10)
  assert.ok(new Date(state.lockedUntil).getTime() > Date.now() + 14 * 60_000, 'مقفول 15 دقيقة')
  // الكلمة الصح نفسها: مقفول
  assert.equal((await login(email, P.target)).status, 423)
  // شاشة المستخدمين: المقفول عليه lockedUntil والباقي من غيرها
  const users = (await http('GET', '/users', undefined, U.admin)).body
  assert.ok(users.find(row => row.id === U.target.id).lockedUntil)
  assert.ok(!('lockedUntil' in users.find(row => row.id === U.other.id)))
  // حساب فرع تاني مايفكش القفل (حساب برّه نطاقه = مش موجود)، وحساب فرعه يفكه
  const outsider = await repo('User').save({ email: 'b-admin@login-security.invalid', displayName: 'مدير فرع ب', role: 'hr_manager', branchId: B.b.id,
    permissions: JSON.stringify(['users.manage']), passwordHash: 'x' })
  assert.equal((await http('POST', `/users/${U.target.id}/unlock`, {}, outsider)).status, 404)
  const unlocked = await http('POST', `/users/${U.target.id}/unlock`, {}, U.branchAdmin)
  assert.deepEqual([unlocked.status, unlocked.body], [200, { id: U.target.id, unlocked: true }])
  assert.deepEqual(await lockState(U.target.id), { failedLoginCount: 0, lockedUntil: null })
  const session = await login(email, P.target)
  assert.equal(session.status, 201)
  assert.ok(session.body.accessToken)
})

test('B1.3: الدخول الصح بيصفّر العداد، والقفل بيخلص لوحده بعد المدة، والحساب المعطّل والبريد الغلط نفس الرد', async () => {
  for (let attempt = 0; attempt < 3; attempt++) assert.equal((await login(U.other.email, 'nope-nope-nope')).status, 401)
  assert.equal((await lockState(U.other.id)).failedLoginCount, 3)
  assert.equal((await login(U.other.email, P.other)).status, 201)
  assert.equal((await lockState(U.other.id)).failedLoginCount, 0)
  // قفل منتهي: الدخول الصح بيعدّي ويصفّر
  await ds.query('UPDATE dbo.users SET [failedLoginCount] = 10, [lockedUntil] = DATEADD(minute, -1, SYSDATETIME()) WHERE [id] = @0', [U.other.id])
  assert.equal((await login(U.other.email, P.other)).status, 201)
  assert.deepEqual(await lockState(U.other.id), { failedLoginCount: 0, lockedUntil: null })
  // قفل منتهي وغلطة جديدة: العداد يبدأ من 1 (مش يقفل تاني على طول)
  await ds.query('UPDATE dbo.users SET [failedLoginCount] = 10, [lockedUntil] = DATEADD(minute, -1, SYSDATETIME()) WHERE [id] = @0', [U.other.id])
  assert.equal((await login(U.other.email, 'nope-nope-nope')).status, 401)
  assert.deepEqual(await lockState(U.other.id), { failedLoginCount: 1, lockedUntil: null })
  const unknown = await login('nobody@login-security.invalid', 'whatever-123')
  await repo('User').update(U.finance.id, { isActive: false })
  const inactive = await login(U.finance.email, P.finance)
  await repo('User').update(U.finance.id, { isActive: true })
  assert.deepEqual([unknown.status, unknown.body.message], [inactive.status, inactive.body.message])
})

test('B1.3: سجل الدخول بكل محاولة ونتيجتها والـIP والجهاز، وحساب الفرع بيشوف حسابات فرعه بس', async () => {
  const all = await http('GET', '/users/login-events', undefined, U.admin)
  assert.equal(all.status, 200)
  assert.equal(all.body.available, true)
  const outcomes = all.body.rows.filter(row => row.userId === U.target.id).map(row => row.outcome)
  for (const outcome of ['BAD_PASSWORD', 'LOCKED_OUT', 'LOCKED', 'UNLOCKED', 'SUCCESS']) assert.ok(outcomes.includes(outcome), outcome)
  assert.equal(outcomes.filter(outcome => outcome === 'BAD_PASSWORD').length, 9)
  const unlock = all.body.rows.find(row => row.outcome === 'UNLOCKED')
  assert.deepEqual([unlock.method, unlock.actorUserId, unlock.actorName], ['ADMIN', U.branchAdmin.id, U.branchAdmin.displayName])
  const success = all.body.rows.find(row => row.userId === U.target.id && row.outcome === 'SUCCESS')
  assert.ok(success.ip, 'الـIP متسجل')
  assert.equal(success.userAgent, 'login-security-test')
  assert.ok(all.body.rows.some(row => row.outcome === 'UNKNOWN_ACCOUNT' && row.identifier === 'nobody@login-security.invalid' && row.userId === null))
  assert.ok(all.body.rows.some(row => row.outcome === 'INACTIVE' && row.userId === U.finance.id))
  // فلتر النتيجة والبحث
  const locked = await http('GET', '/users/login-events?outcome=LOCKED_OUT', undefined, U.admin)
  assert.ok(locked.body.rows.length >= 1 && locked.body.rows.every(row => row.outcome === 'LOCKED_OUT'))
  const searched = await http('GET', `/users/login-events?search=${encodeURIComponent('حساب other')}`, undefined, U.admin)
  assert.ok(searched.body.rows.length > 0 && searched.body.rows.every(row => row.userId === U.other.id))
  // حساب فرع أ: محاولات حسابات فرعه بس، ومن غير البريد المش موجود
  const scoped = await http('GET', '/users/login-events', undefined, U.branchAdmin)
  assert.ok(scoped.body.rows.length > 0)
  assert.ok(scoped.body.rows.every(row => [U.target.id, U.finance.id, U.branchAdmin.id].includes(row.userId)), JSON.stringify(scoped.body.rows.map(row => row.userId)))
  // من غير صلاحية إدارة الحسابات: ممنوع
  assert.equal((await http('GET', '/users/login-events', undefined, U.target)).status, 403)
  assert.equal((await http('GET', '/users/login-events?outcome=bad', undefined, U.admin)).status, 400)
})

test('B1.3: سياسة كلمة السر (NIST) في التغيير والإنشاء والتعديل والكلمة المؤقتة، والموجودة مابتتأثرش', async () => {
  const session = (await login(U.target.email, P.target)).body
  const change = (newPassword) => fetch(`${base}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
    body: JSON.stringify({ currentPassword: P.target, newPassword }) }).then(async response => ({ status: response.status, body: await response.json() }))
  for (const weak of ['password123', 'Password@123', 'aaaaaaaaaaaa', 'my-target-pass', 'حساب target!!']) {
    const response = await change(weak)
    assert.deepEqual([response.status, response.body.code], [400, 'PASSWORD_POLICY'], weak)
  }
  const fresh = passwordOf()
  assert.equal((await change(fresh)).status, 200)
  P.target = fresh
  // الطول الأدنى من الإعداد
  await config('auth.password.min_length', '16')
  const short = await http('POST', '/users', { email: 'new@login-security.invalid', password: 'Abcdefgh1234', displayName: 'جديد', role: 'employee', branchId: B.a.id }, U.admin)
  assert.deepEqual([short.status, short.body.code, short.body.minLength], [400, 'PASSWORD_POLICY', 16])
  await config('auth.password.min_length', '8')
  const common = await http('POST', '/users', { email: 'new@login-security.invalid', password: 'qwerty123', displayName: 'جديد', role: 'employee', branchId: B.a.id }, U.admin)
  assert.equal(common.body.code, 'PASSWORD_POLICY')
  const created = await http('POST', '/users', { email: 'new@login-security.invalid', password: passwordOf(), displayName: 'جديد', role: 'employee', branchId: B.a.id }, U.admin)
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const update = await http('PATCH', `/users/${created.body.id}`, { password: 'iloveyou' }, U.admin)
  assert.equal(update.body.code, 'PASSWORD_POLICY')
  const temporary = await http('POST', '/users/temporary-password', { userIds: [created.body.id], password: 'welcome123' }, U.admin)
  assert.equal(temporary.body.code, 'PASSWORD_POLICY')
  assert.equal((await http('POST', '/users/temporary-password', { userIds: [created.body.id], password: passwordOf() }, U.admin)).status, 200)
  // إعدادات الشاشة بحدودها
  for (const [key, value] of [['auth.lockout.max_attempts', '2'], ['auth.lockout.minutes', '0'], ['auth.password.min_length', '7'], ['auth.two_factor.roles', 'Bad Role']]) {
    assert.equal((await http('PATCH', '/settings/config', { key, value }, U.admin)).status, 400, key)
  }
  assert.equal((await http('PATCH', '/settings/config', { key: 'auth.lockout.max_attempts', value: '5' }, U.admin)).status, 200)
  await config('auth.lockout.max_attempts', '10')
})

test('B1.3: التحقق بخطوتين إلزامي لدور بعينه والتحقق العام مقفول — صاحب الدور بس بياخد رمز البريد', async () => {
  mailbox = []
  const saved = await http('PATCH', '/settings/config', { key: 'auth.two_factor.roles', value: 'hr_manager' }, U.admin)
  assert.equal(saved.status, 200, JSON.stringify(saved.body))
  const pending = await login(U.finance.email, P.finance)
  assert.equal(pending.body.twoFactor, true, JSON.stringify(pending.body))
  assert.equal(pending.body.accessToken, undefined)
  assert.equal(mailbox.length, 1)
  const plain = await login(U.target.email, P.target)
  assert.ok(plain.body.accessToken, 'الدور التاني من غير رمز')
  assert.equal(mailbox.length, 1)
  await config('auth.two_factor.roles', '')
  assert.ok((await login(U.finance.email, P.finance)).body.accessToken)
})

test('B1.3: رؤوس حماية المتصفح في ردود الـAPI، ومن غير X-Powered-By', async () => {
  const response = await http('GET', '/auth/login/options')
  assert.equal(response.status, 200)
  for (const [name, value] of Object.entries({ 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'",
    'referrer-policy': 'no-referrer', 'cache-control': 'no-store' })) assert.equal(response.headers.get(name), value, name)
  assert.equal(response.headers.get('x-powered-by'), null)
})
