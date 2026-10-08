'use strict'
// B6.2 (أ) على SQL حقيقي: لغة عرض الواجهة لكل حساب — قبل ترحيل 182 الكل عربي والتغيير مرفوض؛ بعده صاحب الحساب بيغيّر لغته هو بس، من غير أثر على
// التوكن ولا على حساب تاني؛ والترحيل آمن للتكرار وبيرفض عمود بشكل غلط. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_user_language_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_user_language_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-language-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/auth/user-language')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261011_182_user_language.sql')
let master, pool, app, ds, base, created = false
const U = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { ...(user ? { Authorization: 'Bearer ' + token(user) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const stored = async user => (await pool.request().query(`SELECT [language], [tokenVersion] FROM dbo.users WHERE [id] = ${Number(user.id)}`)).recordset[0]

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  // القاعدة قبل الترحيل: المزامنة عملت العمود من الكيان، فبيتشال عشان نبدأ من شكل قاعدة ماتطبّقش عليها 182
  await pool.request().query('ALTER TABLE dbo.users DROP COLUMN [language]')
  U.one = await repo('User').save({ email: 'one@user-language.invalid', displayName: 'حساب أول', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true })
  U.two = await repo('User').save({ email: 'two@user-language.invalid', displayName: 'حساب تاني', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true })
}, { timeout: 120000 })

after(async t => {
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

test('UL-01: قبل ترحيل 182 — الحساب عربي، الخادم بيقول إن اللغة مش بتتغيّر، والتغيير مرفوض برسالة؛ ومن غير دخول مفيش رد', async () => {
  assert.deepEqual(ok(await request(U.one, 'GET', '/auth/language')), { language: 'ar', available: ['ar', 'en'], changeable: false })
  refused(await request(U.one, 'PUT', '/auth/language', { language: 'en' }), 409, rules.LANGUAGE_NOT_READY)
  assert.deepEqual([(await request(null, 'GET', '/auth/language')).status, (await request(null, 'PUT', '/auth/language', { language: 'en' })).status], [401, 401])
})

test('UL-02: الترحيل 182 — بيضيف العمود بشكله، آمن للتكرار، وبيرفض عمود موجود بشكل غلط', async () => {
  await pool.request().query('ALTER TABLE dbo.users ADD [language] int NULL')
  await assert.rejects(runMigration(), error => error.number === 182002)
  await pool.request().query('ALTER TABLE dbo.users DROP COLUMN [language]')
  await runMigration(); await runMigration()
  const column = (await pool.request().query(`SELECT TYPE_NAME(c.[system_type_id]) AS [type], c.[max_length] AS [length], c.[is_nullable] AS [nullable], c.[default_object_id] AS [hasDefault]
    FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.users') AND c.[name] = N'language'`)).recordset[0]
  assert.deepEqual([column.type, column.length, column.nullable, column.hasDefault], ['nvarchar', 10, true, 0])
  assert.deepEqual((await stored(U.one)).language, null)
})

test('UL-03: بعد الترحيل — صاحب الحساب بيغيّر لغته هو بس: القيمة بتتحفظ وبترجع، حساب تاني زي ما هو، والتوكن وإصداره ماتغيّروش؛ وقيمة غلط مرفوضة', async () => {
  assert.deepEqual(ok(await request(U.one, 'GET', '/auth/language')), { language: 'ar', available: ['ar', 'en'], changeable: true })
  const before = await stored(U.one)
  assert.deepEqual(ok(await request(U.one, 'PUT', '/auth/language', { language: 'en' })), { language: 'en', available: ['ar', 'en'], changeable: true })
  assert.deepEqual([ok(await request(U.one, 'GET', '/auth/language')).language, ok(await request(U.two, 'GET', '/auth/language')).language], ['en', 'ar'])
  assert.deepEqual([await stored(U.one), await stored(U.two)], [{ language: 'en', tokenVersion: before.tokenVersion }, { language: null, tokenVersion: 0 }])
  // نفس التوكن لسه شغال (اللغة مش في التوكن)
  assert.equal((await request(U.one, 'GET', '/auth/me')).status, 200)
  for (const value of ['fr', '', null, 5, 'EN', { code: 'en' }]) refused(await request(U.one, 'PUT', '/auth/language', { language: value }), 400, rules.LANGUAGE_INVALID)
  refused(await request(U.one, 'PUT', '/auth/language'), 400, rules.LANGUAGE_INVALID)
  assert.equal((await stored(U.one)).language, 'en')
  assert.deepEqual(ok(await request(U.one, 'PUT', '/auth/language', { language: 'ar' })).language, 'ar')
  assert.equal((await stored(U.one)).language, 'ar')
})
