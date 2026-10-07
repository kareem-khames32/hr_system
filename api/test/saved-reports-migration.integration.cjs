'use strict'
// ترحيل B2.13-ب (20261007_098) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_saved_reports_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  SRM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدول ومفتاحه وفهرسه الفريد) وفرقها صفر.
//  SRM-2) من غير الجدول: القايمة بتقول إن الترحيل ناقص، والكتابة مرفوضة برسالته، ومهمة الإرسال مابتعملش حاجة، والتصدير العادي شغال؛
//         وجدول أو فهرس قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدول بنفس الشكل
//         والفرق صفر، وبعده — من غير إعادة تشغيل — الحفظ شغال.
//  SRM-3) آمن للتكرار.
// Run (من api/): node --test test/saved-reports-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_saved_reports_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_saved_reports_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-saved-reports-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-saved-reports-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_098_saved_reports.sql'
const TABLE = 'saved_reports'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, saved, admin, created = false

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
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null, tokenVersion: user.tokenVersion ?? 0,
  scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(method, route, body) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(admin))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const type = response.headers.get('content-type') ?? ''
  if (!type.includes('json')) return { status: response.status, body: null, bytes: Buffer.from(await response.arrayBuffer()) }
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
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
  rules = require('../src/reports/saved-reports')
  saved = app.get(require('../src/reports/saved-reports.service').SavedReportsService)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  await ds.getRepository('Branch').save({ code: 'SRM_A', name: 'فرع ترحيل التقارير', country: 'SA' })
  admin = await ds.getRepository('User').save({ email: 'admin@saved-reports-migration.invalid', displayName: 'مدير ترحيل التقارير', passwordHash: 'test-only',
    role: 'super_admin', permissions: '["*"]', isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-saved-reports-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'saved reports migration fixture cleanup failed')
})

test('SRM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_098: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [98001, 98002, 98003, 98004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيان)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, nullable = false, identity = false) => [name, type, length, nullable, identity, 0, false]
  assert.deepEqual(current.columns, [column('id', 'int', 4, false, true), column('ownerUserId', 'int', 4), column('name', 'nvarchar', 240), column('reportKey', 'nvarchar', 60),
    column('filters', 'nvarchar', 8000), column('frequency', 'nvarchar', 20), column('format', 'nvarchar', 10), column('lastSentOn', 'date', 3, true),
    column('lastError', 'nvarchar', 600, true), column('createdAt', 'datetime2', 8)])
  assert.deepEqual(current.indexes, [['PK_saved_reports', 'id', true, true, false], ['UX_saved_reports_owner_name', 'ownerUserId,name', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدول اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.SAVED_REPORTS_MIGRATION_MISSING, /20261007_098/)
})

test('SRM-2: من غير الجدول القايمة بتقول الترحيل ناقص والتصدير زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropTable()
  rules.resetSavedReportsCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.savedReportsReady(ds.manager), false)
  const MISSING = rules.SAVED_REPORTS_MIGRATION_MISSING
  const body = { name: 'تقرير قبل الترحيل', report: 'headcount', frequency: 'DAILY', format: 'xlsx' }

  // قبل الترحيل: القايمة فاضية وبتقول إن الترحيل ناقص، والكتابة برسالته، والإرسال المجدول مابيعملش حاجة، والتصدير العادي شغال
  const listed = expectStatus(await request('GET', '/reports/saved'), 200)
  assert.deepEqual([listed.ready, listed.migrationMessage, listed.items], [false, MISSING, []])
  for (const [method, route, payload] of [['POST', '/reports/saved', body], ['PATCH', '/reports/saved/1', { frequency: 'NONE' }], ['DELETE', '/reports/saved/1'],
    ['GET', '/reports/saved/1/export']]) {
    assert.deepEqual(answer(await request(method, route, payload)), [400, MISSING], `${method} ${route}`)
  }
  assert.deepEqual(await saved.sendDue(new Date(new Date().setHours(9, 0, 0, 0))), { due: 0, sent: 0, failed: 0, skipped: 'migration' })
  const file = await request('GET', '/reports/export?report=headcount&format=xlsx')
  assert.equal(file.status, 200); assert.equal(file.bytes.subarray(0, 2).toString(), 'PK')
  assert.equal(await rules.savedReportsReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const TABLE_SHAPE = /20261007_098: جدول saved_reports موجود وشكله مش شكل التقارير المحفوظة/
  const refused = async (setup, message = TABLE_SHAPE) => {
    await dropTable()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const before = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), before, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', ownerUserId: 'int NOT NULL', name: 'nvarchar(120) NOT NULL', reportKey: 'nvarchar(30) NOT NULL',
    filters: 'nvarchar(4000) NOT NULL', frequency: 'nvarchar(10) NOT NULL', format: 'nvarchar(5) NOT NULL', lastSentOn: 'date NULL', lastError: 'nvarchar(300) NULL',
    createdAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_saved_reports'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [title] nvarchar(50) NULL);`)
  for (const changes of [{ name: 'varchar(120) NOT NULL' }, { name: 'nvarchar(200) NOT NULL' }, { filters: 'nvarchar(max) NOT NULL' }, { frequency: 'nvarchar(10) NULL' },
    { lastSentOn: 'date NOT NULL' }, { lastSentOn: 'datetime NULL' }, { lastError: 'nvarchar(300) NOT NULL' }, { createdAt: 'datetime2(3) NOT NULL' }, { ownerUserId: 'bigint NOT NULL' },
    { format: "nvarchar(5) NOT NULL CONSTRAINT [DF_srm_format] DEFAULT N'xlsx'" }, { id: 'int NOT NULL' }, { reportKey: "AS (CAST(N'x' AS nvarchar(30)))" },
    { extra: ', [recipients] nvarchar(500) NULL' }, { omit: 'lastError' },
    { pk: 'PK_other_name' }, { key: '[ownerUserId]' }, { key: '[id], [ownerUserId]' }, { key: null }]) {
    await refused(table(changes))
  }
  // جدول سليم وفهرس بنفس الاسم: بترتيب معكوس، أو على عمود واحد، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const INDEX = /20261007_098: فهرس UX_saved_reports_owner_name موجود ومش فريد على الحساب والاسم بالترتيب/
  for (const definition of [`UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([name], [ownerUserId])`, `UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([ownerUserId])`,
    `INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([ownerUserId], [name])`, `UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([ownerUserId], [name], [reportKey])`,
    `UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([ownerUserId], [name]) INCLUDE ([format])`,
    `UNIQUE INDEX [UX_saved_reports_owner_name] ON dbo.${TABLE} ([ownerUserId], [name]) WHERE [ownerUserId] > 0`]) {
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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية، والحفظ شغال
  assert.equal(await rules.savedReportsReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [${TABLE}]`), [{ n: 0 }])
  const made = expectStatus(await request('POST', '/reports/saved', body), 201)
  const now = expectStatus(await request('GET', '/reports/saved'), 200)
  assert.deepEqual([now.ready, now.migrationMessage, now.items.map(item => [item.id, item.name, item.report, item.frequency])], [true, null, [[made.id, body.name, 'headcount', 'DAILY']]])
})

test('SRM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT [id], [ownerUserId], [name], [reportKey], [frequency], [format] FROM [${TABLE}] ORDER BY [id]`) })
  const before = await snapshot()
  assert.equal(before.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
