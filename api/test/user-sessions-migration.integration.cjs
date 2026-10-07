'use strict'
// ترحيل B2.17-ب (20261007_101) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_user_sessions_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  USM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدول ومفتاحه وفهرسه الفريد) وفرقها صفر.
//  USM-2) من غير الجدول: الدخول شغال والجلسة من غير رقم (زي الأول)، و«جلساتي» بتقول إن الترحيل ناقص، والإنهاء «غير موجودة»، والخروج
//         وتغيير كلمة المرور شغالين؛ وجدول أو فهرس قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق)
//         بيعمل الجدول بنفس الشكل والفرق صفر، وبعده — من غير إعادة تشغيل — الدخول الجديد بجلسة برقمها، والجلسة القديمة بتكمّل.
//  USM-3) آمن للتكرار.
// Run (من api/): node --test test/user-sessions-migration.integration.cjs
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

const database = `hr_user_sessions_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_user_sessions_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-sessions-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-user-sessions-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_101_user_sessions.sql'
const TABLE = 'user_sessions'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// كلمة سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const password = `T-${crypto.randomBytes(9).toString('base64url')}`
let app, ds, master, pool, http, rules, user, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId, c.is_computed AS computed
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${TABLE}`]))
    .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId, row.computed]),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.is_primary_key AS isPrimary, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${TABLE}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.isPrimary, row.hasFilter]),
})
const NO_SHAPE = { columns: [], indexes: [] }
// «قبل الترحيل»: الجدول مش موجود (على القاعدة المؤقتة بس)
const dropTable = () => { assertDisposable(); return pool.request().batch(`IF OBJECT_ID(N'dbo.${TABLE}', N'U') IS NOT NULL DROP TABLE dbo.${TABLE};`) }
async function request(method, route, body, token) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const signIn = async (secretText = password) => expectStatus(await request('POST', '/auth/login', { email: user.email, password: secretText }), 201).accessToken

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, AUTH_FAILURE_DELAY_MS: '20' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  http = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  rules = require('../src/auth/user-sessions')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  const branch = await ds.getRepository('Branch').save({ code: 'USM_A', name: 'فرع ترحيل الجلسات', country: 'SA' })
  user = await ds.getRepository('User').save({ email: 'worker@user-sessions-migration.invalid', displayName: 'حساب ترحيل الجلسات', passwordHash: await bcrypt.hash(password, 10),
    role: 'employee', permissions: '[]', isActive: true, branchId: branch.id })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  for (const dir of [base, uploads]) {
    try {
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-user-sessions-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'user sessions migration fixture cleanup failed')
})

test('USM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_101: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [101001, 101002, 101003, 101004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيان)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, nullable = false, identity = false) => [name, type, length, nullable, identity, 0, false]
  assert.deepEqual(current.columns, [column('id', 'int', 4, false, true), column('sid', 'nvarchar', 128), column('userId', 'int', 4), column('tokenVersion', 'int', 4),
    column('createdAt', 'datetime2', 8), column('lastSeenAt', 'datetime2', 8), column('expiresAt', 'datetime2', 8), column('ip', 'nvarchar', 128, true),
    column('userAgent', 'nvarchar', 800, true), column('revokedAt', 'datetime2', 8, true), column('revokedReason', 'nvarchar', 40, true)])
  assert.deepEqual(current.indexes, [['PK_user_sessions', 'id', true, true, false], ['UX_user_sessions_sid', 'sid', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدول اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.USER_SESSIONS_MIGRATION_MISSING, /20261007_101/)
})

test('USM-2: من غير الجدول الدخول والخروج وتغيير كلمة المرور شغالين والجلسة من غير رقم؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropTable()
  rules.resetUserSessionsCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.userSessionsReady(ds.manager), false)
  const MISSING = rules.USER_SESSIONS_MIGRATION_MISSING

  // قبل الترحيل: الدخول زي الأول (توكن من غير رقم جلسة)، و«جلساتي» بتقول إن الترحيل ناقص، والإنهاء «غير موجودة»
  const early = await signIn()
  assert.deepEqual(['sid' in jwt.verify(early), (await request('GET', '/auth/me', undefined, early)).status], [false, 200])
  assert.deepEqual(expectStatus(await request('GET', '/auth/sessions', undefined, early), 200), { available: false, message: MISSING, items: [] })
  assert.deepEqual(answer(await request('DELETE', '/auth/sessions/1', undefined, early)), [404, rules.SESSION_NOT_FOUND])
  assert.deepEqual(expectStatus(await request('POST', '/auth/sessions/end-others', undefined, early), 200), { ended: 0 })
  // الخروج مابيقعش (مفيش صف يتنهي)، والتوكن لسه بالإصدار زي الأول
  expectStatus(await request('POST', '/auth/logout', undefined, early), 200)
  assert.equal((await request('GET', '/auth/me', undefined, early)).status, 200)
  // تغيير كلمة المرور شغال
  const next = `T-${crypto.randomBytes(9).toString('base64url')}`
  const changed = expectStatus(await request('POST', '/auth/change-password', { currentPassword: password, newPassword: next }, early), 200)
  assert.deepEqual(['sid' in jwt.verify(changed.accessToken), (await request('GET', '/auth/me', undefined, early)).status], [false, 401])
  const before = changed.accessToken
  assert.equal(await rules.userSessionsReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const TABLE_SHAPE = /20261007_101: جدول user_sessions موجود وشكله مش شكل الجلسات النشطة/
  const refused = async (setup, message = TABLE_SHAPE) => {
    await dropTable()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const state = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), state, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', sid: 'nvarchar(64) NOT NULL', userId: 'int NOT NULL', tokenVersion: 'int NOT NULL', createdAt: 'datetime2 NOT NULL',
    lastSeenAt: 'datetime2 NOT NULL', expiresAt: 'datetime2 NOT NULL', ip: 'nvarchar(64) NULL', userAgent: 'nvarchar(400) NULL', revokedAt: 'datetime2 NULL', revokedReason: 'nvarchar(20) NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_user_sessions'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [token] nvarchar(50) NULL);`)
  for (const changes of [{ sid: 'varchar(64) NOT NULL' }, { sid: 'nvarchar(32) NOT NULL' }, { sid: 'nvarchar(64) NULL' }, { userId: 'bigint NOT NULL' }, { tokenVersion: 'int NULL' },
    { createdAt: 'datetime NOT NULL' }, { lastSeenAt: 'datetime2(3) NOT NULL' }, { expiresAt: 'datetime2 NULL' }, { ip: 'nvarchar(64) NOT NULL' }, { userAgent: 'nvarchar(max) NULL' },
    { revokedAt: 'datetime2 NOT NULL' }, { revokedReason: "nvarchar(20) NULL CONSTRAINT [DF_usm_reason] DEFAULT N'USER'" }, { id: 'int NOT NULL' }, { sid: "AS (CAST(N'x' AS nvarchar(64)))" },
    { extra: ', [device] nvarchar(100) NULL' }, { omit: 'tokenVersion' }, { pk: 'PK_other_name' }, { key: '[userId]' }, { key: '[id], [userId]' }, { key: null }]) {
    await refused(table(changes))
  }
  // جدول سليم وفهرس بنفس الاسم: على عمود تاني، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const INDEX = /20261007_101: فهرس UX_user_sessions_sid موجود ومش فريد على رقم الجلسة/
  for (const definition of [`UNIQUE INDEX [UX_user_sessions_sid] ON dbo.${TABLE} ([userId])`, `INDEX [UX_user_sessions_sid] ON dbo.${TABLE} ([sid])`,
    `UNIQUE INDEX [UX_user_sessions_sid] ON dbo.${TABLE} ([sid], [userId])`, `UNIQUE INDEX [UX_user_sessions_sid] ON dbo.${TABLE} ([sid]) INCLUDE ([userId])`,
    `UNIQUE INDEX [UX_user_sessions_sid] ON dbo.${TABLE} ([sid]) WHERE [revokedAt] IS NULL`]) {
    await refused([table(), `CREATE ${definition};`], INDEX)
  }
  // وجدول سليم موجود من غير الفهرس: الترحيل بيكمّل الناقص بس
  await dropTable()
  await pool.request().batch(table())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدول السليم الموجود اتكمّل بفهرسه')
  await dropTable()

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية؛ الجلسة اللي من قبله بتكمّل من غير صف، والدخول الجديد بجلسة برقمها
  assert.equal(await rules.userSessionsReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [${TABLE}]`), [{ n: 0 }])
  assert.equal((await request('GET', '/auth/me', undefined, before)).status, 200)
  const fresh = await signIn(next)
  assert.match(jwt.verify(fresh).sid, /^[0-9a-f]{48}$/)
  const listed = expectStatus(await request('GET', '/auth/sessions', undefined, fresh), 200)
  assert.deepEqual([listed.available, listed.message, listed.items.map(item => item.current)], [true, null, [true]])
  // والجلسة القديمة (من غير رقم) شايفة الجلسة الجديدة ومش «حالية» فيها
  assert.deepEqual(expectStatus(await request('GET', '/auth/sessions', undefined, before), 200).items.map(item => item.current), [false])
})

test('USM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT [id], [sid], [userId], [tokenVersion], [revokedAt] FROM [${TABLE}] ORDER BY [id]`) })
  const state = await snapshot()
  assert.equal(state.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), state)
})
