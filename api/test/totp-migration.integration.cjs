'use strict'
// ترحيل B2.17-ج (20261007_102) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_totp_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  TPM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدول ومفتاحه وفهرسه الفريد) وفرقها صفر.
//  TPM-2) من غير الجدول: الدخول زي الأول حتى لدور في إعداد الإلزام (محدش بيتقفل برّه)، والحالة بتقول إن الترحيل ناقص، والتفعيل مرفوض
//         برسالته، وقايمة المستخدمين وإعادة الضبط شغالين؛ وجدول أو فهرس قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛
//         والمُرحّل (بروفة ثم تطبيق) بيعمل الجدول بنفس الشكل والفرق صفر، وبعده — من غير إعادة تشغيل — الإلزام والتفعيل شغالين.
//  TPM-3) آمن للتكرار.
// Run (من api/): node --test test/totp-migration.integration.cjs
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

const database = `hr_totp_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_totp_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-totp-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-totp-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_102_user_totp.sql'
const TABLE = 'user_totp'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
// كلمة سر الاختبار بتتولد عشوائي (مش ثابتة في الملف)
const password = `T-${crypto.randomBytes(9).toString('base64url')}`
let app, ds, master, pool, http, rules, service, user, admin, created = false

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
const signIn = async () => expectStatus(await request('POST', '/auth/login', { email: user.email, password }), 201)
const adminToken = () => jwt.sign({ sub: admin.id, email: admin.email, role: 'super_admin', branchId: null, employeeId: null, tokenVersion: 0, permissions: ['*'] })
const config = async (key, value) => { const repo = ds.getRepository('RequestsConfig'), row = await repo.findOneBy({ key }); await repo.save(row ? { ...row, value } : { key, value }) }

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
  rules = require('../src/auth/totp')
  service = require('../src/auth/totp.service')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  const branch = await ds.getRepository('Branch').save({ code: 'TPM_A', name: 'فرع ترحيل المصادقة', country: 'SA' })
  user = await ds.getRepository('User').save({ email: 'payroll@totp-migration.invalid', displayName: 'حساب ترحيل المصادقة', passwordHash: await bcrypt.hash(password, 10),
    role: 'payroll_officer', permissions: '[]', isActive: true, branchId: branch.id })
  admin = await ds.getRepository('User').save({ email: 'admin@totp-migration.invalid', displayName: 'مدير ترحيل المصادقة', passwordHash: 'test-only', role: 'super_admin',
    permissions: '["*"]', isActive: true })
  // دور الحساب في إعداد الإلزام من قبل الترحيل
  await config(rules.TOTP_ROLES_KEY, 'payroll_officer')
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-totp-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'totp migration fixture cleanup failed')
})

test('TPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_102: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [102001, 102002, 102003, 102004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيان)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, nullable = false, identity = false) => [name, type, length, nullable, identity, 0, false]
  assert.deepEqual(current.columns, [column('id', 'int', 4, false, true), column('userId', 'int', 4), column('secret', 'nvarchar', 400), column('confirmedAt', 'datetime2', 8, true),
    column('lastStep', 'int', 4, true), column('failedCount', 'int', 4), column('lockedUntil', 'datetime2', 8, true), column('createdAt', 'datetime2', 8)])
  assert.deepEqual(current.indexes, [['PK_user_totp', 'id', true, true, false], ['UX_user_totp_user', 'userId', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدول اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.TOTP_MIGRATION_MISSING, /20261007_102/)
})

test('TPM-2: من غير الجدول الدخول زي الأول حتى للدور الإلزامي؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropTable()
  service.resetTotpCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await service.totpReady(ds.manager), false)
  const MISSING = rules.TOTP_MIGRATION_MISSING

  // قبل الترحيل: دور في إعداد الإلزام بيدخل جلسة كاملة (الإلزام من غير جدول كان هيقفله برّه النظام)
  const early = await signIn()
  assert.deepEqual([Object.keys(early).sort(), 'totpSetupRequired' in early.user, 'totpSetupRequired' in jwt.verify(early.accessToken)], [['accessToken', 'user'], false, false])
  expectStatus(await request('GET', '/notifications', undefined, early.accessToken), 200)
  assert.deepEqual(expectStatus(await request('GET', '/auth/totp', undefined, early.accessToken), 200), { available: false, message: MISSING, enabled: false, pending: false, required: false })
  for (const [route, body] of [['/auth/totp/setup', undefined], ['/auth/totp/confirm', { code: '123456' }], ['/auth/totp/disable', { code: '123456' }]]) {
    assert.deepEqual(answer(await request('POST', route, body, early.accessToken)), [400, MISSING], route)
  }
  // قايمة المستخدمين وإعادة الضبط شغالين من غير الجدول
  assert.ok(expectStatus(await request('GET', '/users', undefined, adminToken()), 200).every(row => row.totpEnabled === undefined))
  assert.deepEqual(expectStatus(await request('POST', `/users/${user.id}/totp-reset`, {}, adminToken()), 200), { id: user.id, reset: false })
  assert.equal(await service.totpReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const TABLE_SHAPE = /20261007_102: جدول user_totp موجود وشكله مش شكل أسرار تطبيق المصادقة/
  const refused = async (setup, message = TABLE_SHAPE) => {
    await dropTable()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const state = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), state, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', userId: 'int NOT NULL', secret: 'nvarchar(200) NOT NULL', confirmedAt: 'datetime2 NULL', lastStep: 'int NULL',
    failedCount: 'int NOT NULL', lockedUntil: 'datetime2 NULL', createdAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_user_totp'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [key] nvarchar(50) NULL);`)
  for (const changes of [{ secret: 'varchar(200) NOT NULL' }, { secret: 'nvarchar(64) NOT NULL' }, { secret: 'nvarchar(200) NULL' }, { userId: 'bigint NOT NULL' }, { confirmedAt: 'datetime2 NOT NULL' },
    { lastStep: 'bigint NULL' }, { lastStep: 'int NOT NULL' }, { failedCount: 'int NULL' }, { failedCount: 'int NOT NULL CONSTRAINT [DF_tpm_failed] DEFAULT 0' }, { lockedUntil: 'datetime NULL' },
    { createdAt: 'datetime2(3) NOT NULL' }, { id: 'int NOT NULL' }, { secret: "AS (CAST(N'x' AS nvarchar(200)))" }, { extra: ', [recoveryCodes] nvarchar(400) NULL' }, { omit: 'lastStep' },
    { pk: 'PK_other_name' }, { key: '[userId]' }, { key: '[id], [userId]' }, { key: null }]) {
    await refused(table(changes))
  }
  // جدول سليم وفهرس بنفس الاسم: على عمود تاني، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const INDEX = /20261007_102: فهرس UX_user_totp_user موجود ومش فريد على الحساب/
  for (const definition of [`UNIQUE INDEX [UX_user_totp_user] ON dbo.${TABLE} ([lastStep])`, `INDEX [UX_user_totp_user] ON dbo.${TABLE} ([userId])`,
    `UNIQUE INDEX [UX_user_totp_user] ON dbo.${TABLE} ([userId], [failedCount])`, `UNIQUE INDEX [UX_user_totp_user] ON dbo.${TABLE} ([userId]) INCLUDE ([failedCount])`,
    `UNIQUE INDEX [UX_user_totp_user] ON dbo.${TABLE} ([userId]) WHERE [confirmedAt] IS NOT NULL`]) {
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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية؛ الجلسة اللي من قبله بتكمّل كاملة، والدخول الجديد للدور الإلزامي «فعّل الأول»
  assert.equal(await service.totpReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [${TABLE}]`), [{ n: 0 }])
  expectStatus(await request('GET', '/notifications', undefined, early.accessToken), 200)
  const gated = await signIn()
  assert.equal(gated.user.totpSetupRequired, true)
  assert.equal((await request('GET', '/notifications', undefined, gated.accessToken)).body.code, rules.TOTP_SETUP_REQUIRED)
  const setup = expectStatus(await request('POST', '/auth/totp/setup', undefined, gated.accessToken), 200)
  const code = rules.totpCode(rules.base32Decode(setup.secret), rules.totpStepAt(Date.now()))
  const opened = expectStatus(await request('POST', '/auth/totp/confirm', { code }, gated.accessToken), 200)
  expectStatus(await request('GET', '/notifications', undefined, opened.accessToken), 200)
  assert.equal(expectStatus(await request('GET', '/auth/totp', undefined, opened.accessToken), 200).enabled, true)
})

test('TPM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT [id], [userId], [secret], [lastStep], [failedCount] FROM [${TABLE}] ORDER BY [id]`) })
  const state = await snapshot()
  assert.equal(state.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), state)
})
