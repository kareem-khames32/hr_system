'use strict'
// كلمة المرور المؤقتة للحسابات المنقولة من النظام القديم (ترحيل 20260919_056):
// - الـhash غير القابل للاستخدام (unusablePasswordHash بتاع المستورد) مايدخلش بأي تخمين
// - «مستخدم منقول — محتاج باسورد» من سجل المستورد (report.json + idmap.json) من غير ما أي hash يطلع
// - تعيين كلمة مؤقتة لكذا حساب: users.manage + نطاق الفرع + منع السيطرة على حساب أعلى + كله أو ولا حاجة + tokenVersion
// - الدخول بالمؤقتة → التوكن مايفتحش غير «غيّر كلمة المرور» و«مين أنا» لحد ما يغيّرها (مختلفة عن المؤقتة، 8+)
// - ملف الترحيل نفسه: إضافي، idempotent، والقيد الافتراضي باسم TypeORM (فرق المخطط لجدول users = صفر)
// قاعدة مؤقتة hr_user_temp_pw_test_<16 hex> تتمسح في الآخر. كلمات المرور عشوائية وقت التشغيل ومابتتطبعش.
// Run: node --test --test-concurrency=1 api/test/user-temporary-password.integration.cjs
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

const database = `hr_user_temp_pw_test_${crypto.randomBytes(8).toString('hex')}`
const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-temp-pw-legacy-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-temp-pw-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const MIGRATION = path.join(repoRoot, 'docs/migrations/payroll/20260919_056_user_must_change_password.sql')
const DF_NAME = 'DF_4a069c6680d61fbb99083c8a0a3'
const pass = () => `T${crypto.randomBytes(9).toString('base64url')}9`

let app, ds, master, pool, baseUrl, created = false
let branchA, branchB
const u = {}
const known = {} // كلمات الاختبار (عشوائية) بالحساب
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }

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
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
// توكن بنفس شكل auth.service (الصلاحيات من الدور) — للمنفّذين بس
async function tokenOf(user) {
  const row = await repo('User').findOneByOrFail({ id: user.id })
  const permissions = await app.get(require('../src/auth/auth.service').AuthService).resolvePermissions(row)
  return jwt.sign({ sub: row.id, email: row.email, role: row.role, branchId: row.branchId ?? null, employeeId: row.employeeId ?? null,
    permissions, tokenVersion: row.tokenVersion ?? 0 })
}
const loginAs = (user, password) => http(null, 'POST', '/auth/login', { email: user.email, password })
async function state(user) {
  const [row] = await ds.query('SELECT passwordHash, mustChangePassword, passwordChangedAt, tokenVersion FROM dbo.users WHERE id = @0', [user.id])
  return { ...row, mustChangePassword: row.mustChangePassword === true || row.mustChangePassword === 1 }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, /^hr_user_temp_pw_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads,
    LEGACY_MIGRATION_DIR: legacyDir })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()

  // المستورد نفسه — نفس الدالة اللي عملت الحسابات المنقولة
  const { unusablePasswordHash } = require('../scripts/legacy-import/framework')
  branchA = await repo('Branch').save({ name: 'TPW branch 1', code: 'TPWA' })
  branchB = await repo('Branch').save({ name: 'TPW branch 2', code: 'TPWB' })
  const make = async (key, role, branchId, { legacy = false, permissions = null } = {}) => {
    known[key] = legacy ? null : pass()
    u[key] = await repo('User').save({ email: `${key}@tpw-fixture.example.com`, displayName: `tpw ${key}`,
      passwordHash: legacy ? unusablePasswordHash() : await bcrypt.hash(known[key], 10), role, branchId, employeeId: null, permissions })
  }
  await make('admin', 'super_admin', null)
  await make('hr', 'hr_manager', branchA.id)
  await make('staff', 'employee', branchA.id)
  await make('legacyA1', 'employee', branchA.id, { legacy: true })
  await make('legacyA2', 'branch_manager', branchA.id, { legacy: true })
  await make('legacyB', 'employee', branchB.id, { legacy: true })
  // حساب منقول بصلاحية فوق مدير الموارد البشرية (roles.manage عبر العمود القديم) — تغيير كلمته لمدير النظام بس
  await make('legacyPowerful', 'employee', branchA.id, { legacy: true, permissions: JSON.stringify(['roles.manage']) })

  // سجل المستورد: 4 حسابات اتعملت بكلمة غير قابلة للاستخدام (legacyA1/legacyA2/legacyB/legacyPowerful)،
  // وحساب قديم اترَبط بالمدير القائم بنفس البريد (مش في البند — كلمته ماتلمستش)
  const legacyKeys = ['legacyA1', 'legacyA2', 'legacyB', 'legacyPowerful']
  const idmap = { user: Object.fromEntries([...legacyKeys.map((k, i) => [`old-${i + 1}`, u[k].id]), ['old-admin', u.admin.id]]) }
  const report = { updatedAt: new Date().toISOString(), migrationDir: legacyDir, domains: {
    'users-assets': { status: 'ok', counts: { user: 4 }, flags: {
      USER_PASSWORD_RESET_REQUIRED: legacyKeys.map((_, i) => ({ legacyId: `old-${i + 1}`, message: 'x' })),
      USER_EMAIL_EXISTS_LINKED: [{ legacyId: 'old-admin', message: 'x' }],
    } },
  } }
  fs.writeFileSync(path.join(legacyDir, 'idmap.json'), JSON.stringify(idmap))
  fs.writeFileSync(path.join(legacyDir, 'report.json'), JSON.stringify(report))
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try { if (pool) await pool.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_user_temp_pw_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  for (const dir of [legacyDir, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-temp-pw-(legacy|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (e) { errors.push(e) }
  }
  if (errors.length) throw new AggregateError(errors, 'temporary-password fixture cleanup failed')
})

test('the importer\'s unusable hash never logs in (no guess works, generic 401)', async () => {
  const { unusablePasswordHash } = require('../scripts/legacy-import/framework')
  const hash = unusablePasswordHash()
  assert.match(hash, /^\$2[aby]\$10\$/) // bcrypt عادي — مايتعرفش من شكله، والتعريف من سجل المستورد
  for (const guess of ['legacy-import:', `legacy-import:${'0'.repeat(64)}`, 'password', crypto.randomBytes(16).toString('hex')]) {
    assert.equal(await bcrypt.compare(guess, hash), false)
    const r = await loginAs(u.legacyA1, guess)
    assert.equal(r.status, 401, JSON.stringify(r.body))
    assert.equal(r.body.message, 'بيانات الدخول غير صحيحة')
  }
  // الحساب العادي لسه بيدخل، ومن غير «لازم يغيّر»
  const ok = expect(await loginAs(u.staff, known.staff), 201)
  assert.equal(ok.user.mustChangePassword, false)
  assert.equal(jwt.decode(ok.accessToken).mustChangePassword, undefined)
  expect(await http(ok.accessToken, 'GET', '/attendance/payroll-month'), 200)
})

test('users list flags migrated accounts without a password, never leaks hashes, respects branch scope', async () => {
  const admin = await tokenOf(u.admin)
  const rows = expect(await http(admin, 'GET', '/users'), 200)
  for (const row of rows) {
    assert.equal('passwordHash' in row, false)
    assert.equal(typeof row.legacyNeedsPassword, 'boolean')
    assert.equal(row.mustChangePassword, false)
  }
  const flagged = rows.filter(r => r.legacyNeedsPassword).map(r => r.id).sort((a, b) => a - b)
  assert.deepEqual(flagged, [u.legacyA1.id, u.legacyA2.id, u.legacyB.id, u.legacyPowerful.id].sort((a, b) => a - b))
  // hr_manager فرع A: مايشوفش فرع B
  const hrRows = expect(await http(await tokenOf(u.hr), 'GET', '/users'), 200)
  assert.equal(hrRows.some(r => r.id === u.legacyB.id), false)
  assert.equal(hrRows.find(r => r.id === u.legacyA1.id).legacyNeedsPassword, true)
  // من غير users.manage: ممنوع
  expect(await http(await tokenOf(u.staff), 'GET', '/users'), 403)
})

test('bulk temporary password: permission, branch scope, takeover and self guards are all-or-nothing', async () => {
  const hr = await tokenOf(u.hr)
  const temp = pass()
  const before = {}
  for (const key of ['legacyA1', 'legacyA2', 'legacyB', 'legacyPowerful']) before[key] = await state(u[key])
  const unchanged = async () => {
    for (const key of Object.keys(before)) assert.deepEqual(await state(u[key]), before[key], `${key} اتغيّر`)
  }

  expect(await http(await tokenOf(u.staff), 'POST', '/users/temporary-password', { userIds: [u.legacyA1.id], password: temp }), 403)
  await unchanged()
  // حساب من فرع تاني وسط المختارين = مفيش ولا حساب يتغيّر
  expect(await http(hr, 'POST', '/users/temporary-password', { userIds: [u.legacyA1.id, u.legacyB.id], password: temp }), 404)
  await unchanged()
  // حساب فيه صلاحية فوق المنفّذ
  const forbidden = expect(await http(hr, 'POST', '/users/temporary-password', { userIds: [u.legacyA1.id, u.legacyPowerful.id], password: temp }), 403)
  assert.match(forbidden.message, /مدير النظام/)
  await unchanged()
  // حسابك إنت
  expect(await http(hr, 'POST', '/users/temporary-password', { userIds: [u.hr.id, u.legacyA1.id], password: temp }), 400)
  await unchanged()
  // تحقق المدخلات
  expect(await http(hr, 'POST', '/users/temporary-password', { userIds: [u.legacyA1.id], password: 'short' }), 400)
  expect(await http(hr, 'POST', '/users/temporary-password', { userIds: [], password: temp }), 400)
  await unchanged()
})

test('bulk set → forced change on login → new password unlocks the system', async () => {
  const staleA1 = await tokenOf(u.legacyA1) // جلسة قديمة (لو كانت موجودة) لازم تبطل
  const temp = pass()
  const res = expect(await http(await tokenOf(u.hr), 'POST', '/users/temporary-password',
    { userIds: [u.legacyA1.id, u.legacyA2.id, u.legacyA1.id], password: temp }), 200)
  assert.equal(res.updated, 2)
  assert.equal(res.mustChangePassword, true)
  const a1 = await state(u.legacyA1), a2 = await state(u.legacyA2)
  for (const s of [a1, a2]) {
    assert.equal(s.mustChangePassword, true)
    assert.ok(s.passwordChangedAt instanceof Date)
    assert.equal(s.tokenVersion, 1)
  }
  assert.notEqual(a1.passwordHash, a2.passwordHash) // bcrypt بملح لكل حساب
  expect(await http(staleA1, 'GET', '/auth/me'), 401)
  // الشارة اختفت، وظهرت «كلمة مؤقتة»
  const rows = expect(await http(await tokenOf(u.admin), 'GET', '/users'), 200)
  const rowA1 = rows.find(r => r.id === u.legacyA1.id)
  assert.equal(rowA1.legacyNeedsPassword, false)
  assert.equal(rowA1.mustChangePassword, true)
  assert.equal(rows.find(r => r.id === u.legacyB.id).legacyNeedsPassword, true)

  // الدخول بالمؤقتة: التوكن مقفول على «غيّر كلمة المرور»
  const login = expect(await loginAs(u.legacyA1, temp), 201)
  assert.equal(login.user.mustChangePassword, true)
  assert.equal(jwt.decode(login.accessToken).mustChangePassword, true)
  const locked = login.accessToken
  const blocked = expect(await http(locked, 'GET', '/attendance/payroll-month'), 403)
  assert.equal(blocked.code, 'PASSWORD_CHANGE_REQUIRED')
  expect(await http(locked, 'GET', '/auth/me'), 200)

  // تغيير الكلمة: الحالية غلط / نفس المؤقتة / أقصر من 8 → 400 ومفيش حاجة اتغيّرت
  const beforeChange = await state(u.legacyA1)
  expect(await http(locked, 'POST', '/auth/change-password', { currentPassword: pass(), newPassword: pass() }), 400)
  const same = expect(await http(locked, 'POST', '/auth/change-password', { currentPassword: temp, newPassword: temp }), 400)
  assert.match(same.message, /المؤقتة/)
  expect(await http(locked, 'POST', '/auth/change-password', { currentPassword: temp, newPassword: 'Ab1' }), 400)
  assert.deepEqual(await state(u.legacyA1), beforeChange)

  const mine = pass()
  const changed = expect(await http(locked, 'POST', '/auth/change-password', { currentPassword: temp, newPassword: mine }), 200)
  assert.equal(changed.user.mustChangePassword, false)
  assert.equal(jwt.decode(changed.accessToken).mustChangePassword, undefined)
  const after = await state(u.legacyA1)
  assert.equal(after.mustChangePassword, false)
  assert.equal(after.tokenVersion, beforeChange.tokenVersion + 1)
  expect(await http(locked, 'GET', '/auth/me'), 401) // التوكن المقفول بطل
  expect(await http(changed.accessToken, 'GET', '/attendance/payroll-month'), 200)
  expect(await loginAs(u.legacyA1, temp), 401)
  const relogin = expect(await loginAs(u.legacyA1, mine), 201)
  assert.equal(relogin.user.mustChangePassword, false)
  // الحساب التاني لسه مقفول لحد ما يغيّر بنفسه
  assert.equal(expect(await loginAs(u.legacyA2, temp), 201).user.mustChangePassword, true)
})

test('single reset is temporary by default, can be made permanent, and the flag needs a password', async () => {
  const admin = await tokenOf(u.admin)
  const first = pass()
  expect(await http(admin, 'PATCH', `/users/${u.legacyB.id}`, { password: first }), 200)
  let s = await state(u.legacyB)
  assert.equal(s.mustChangePassword, true)
  assert.ok(s.passwordChangedAt instanceof Date)
  assert.equal(expect(await loginAs(u.legacyB, first), 201).user.mustChangePassword, true)

  const second = pass()
  expect(await http(admin, 'PATCH', `/users/${u.legacyB.id}`, { password: second, mustChangePassword: false }), 200)
  s = await state(u.legacyB)
  assert.equal(s.mustChangePassword, false)
  assert.equal(expect(await loginAs(u.legacyB, second), 201).user.mustChangePassword, false)

  expect(await http(admin, 'PATCH', `/users/${u.legacyB.id}`, { mustChangePassword: true }), 400)
  // مدير النظام بيغيّر كلمة حسابه هو من الشاشة: مش مؤقتة افتراضيًا
  const own = pass()
  expect(await http(admin, 'PATCH', `/users/${u.admin.id}`, { password: own }), 200)
  assert.equal((await state(u.admin)).mustChangePassword, false)
  expect(await http(admin, 'GET', '/users'), 401) // كلمته اتغيّرت → جلسته القديمة بطلت
  assert.equal(expect(await loginAs(u.admin, own), 201).user.mustChangePassword, false)
  // الحساب القوي: مدير النظام يقدر
  const admin2 = await tokenOf(u.admin)
  const strong = pass()
  expect(await http(admin2, 'POST', '/users/temporary-password', { userIds: [u.legacyPowerful.id], password: strong }), 200)
  assert.equal((await state(u.legacyPowerful)).mustChangePassword, true)
  const rows = expect(await http(admin2, 'GET', '/users'), 200)
  assert.equal(rows.filter(r => r.legacyNeedsPassword).length, 0)
})

test('migration 056 is additive, idempotent, SQL Server 2019-safe and matches the TypeORM schema', async () => {
  const content = fs.readFileSync(MIGRATION, 'utf8')
  assert.deepEqual(migrate.forbiddenStatements(content), [])
  assert.doesNotMatch(content, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(NOT\s+)?DISTINCT\s+FROM/i)
  const [{ n: usersBefore }] = await ds.query('SELECT COUNT(*) n FROM dbo.users')
  // حالة ما قبل الترحيل: العمودين مش موجودين
  await pool.request().batch(`ALTER TABLE dbo.users DROP CONSTRAINT [${DF_NAME}]; ALTER TABLE dbo.users DROP COLUMN mustChangePassword, passwordChangedAt;`)
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(content)) await pool.request().batch(batch)
  const cols = await ds.query(`SELECT c.name, t.name type, c.is_nullable nullable, dc.name df, dc.definition
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
    WHERE c.object_id = OBJECT_ID('dbo.users') AND c.name IN ('mustChangePassword', 'passwordChangedAt') ORDER BY c.name`)
  assert.deepEqual(cols.map(c => [c.name, c.type, !!c.nullable, c.df]), [
    ['mustChangePassword', 'bit', false, DF_NAME],
    ['passwordChangedAt', 'datetime', true, null],
  ])
  const [{ n: usersAfter, flagged }] = await ds.query('SELECT COUNT(*) n, SUM(CASE WHEN mustChangePassword = 1 THEN 1 ELSE 0 END) flagged FROM dbo.users')
  assert.equal(usersAfter, usersBefore)
  assert.equal(flagged, 0) // إضافي: محدش يتقفل من الترحيل
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(q => q.query).filter(q => /"users"/.test(q)), [])
})
