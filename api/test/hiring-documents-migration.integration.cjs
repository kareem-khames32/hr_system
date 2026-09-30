'use strict'
// ترحيل 20260930_075 — «مسوغات التعيين» (طلب المالك 30 سبتمبر) على قاعدة مؤقتة عشوائية بتتمسح في الآخر
// (hr_hiring_docs_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  HD-M1) فحص نصي: من غير BOM، وLF في المستودع (git ls-files --eol = i/lf)، ومفيش عبارة ممنوعة ولا تعديل بيانات، وأكواد THROW
//         75001-75008 فريدة بين كل الملفات، ومتوافق مع SQL Server 2019، واسم القيد الافتراضي = حساب TypeORM نفسه، والمفتاح والفهرس
//         بأسماء الكيان، والقاعدة المتعملة بـsynchronize من الكيانات بنفس الشكل وفرقها صفر.
//  HD-M2) المخطط القديم (العمودين والجدول متشالين) وفيه أنواع مستندات ومهام تهيئة قائمة: الملف عبر المُرحّل المجمّع نفسه (بروفة ثم
//         تطبيق) بيضيف العمودين والجدول بس — الأنواع القائمة «مش مطلوبة» والمهام القائمة من غير مفتاح نظام، ومفيش صف اتضاف ولا اتشال —
//         وفرق المخطط صفر من الكيانات (قاعدة التطبيق) ومن «plan --database» على القاعدة المؤقتة.
//  HD-M3) آمن للتكرار (المُرحّل مالقاش ملف معلق، والملف مرتين كمان بنفس الشكل)، وشكل غلط بيوقف التحقق بكوده ومايسيبش أثر.
// Run (من api/): node --test test/hiring-documents-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_hiring_docs_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_hiring_docs_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-hiring-docs-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-hiring-docs-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20260930_075_hiring_documents.sql'
const DF = 'DF_2caa2b3de768bf45b96d893289e'
const PK = 'PK_hiring_document_reminders'
const IX = 'IX_hiring_document_reminders_employee'
let app, ds, master, pool, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
// نسخة العمل على Windows بتبقى CRLF (core.autocrlf) والمُرحّل بيوحّدها قبل البصمة — الفحص النصي على الشكل الموحّد
const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8').replace(/\r\n/g, '\n')

// شكل الأعمدة الجديدة وقيودها في القاعدة
const shape = async () => ({
  columns: await ds.query(`SELECT OBJECT_NAME(c.object_id) AS tableName, c.name AS columnName, t.name AS type, c.max_length AS maxLength,
      c.is_nullable AS nullable, c.is_identity AS isIdentity, d.name AS df, d.definition
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE (c.object_id = OBJECT_ID('dbo.doc_types') AND c.name = 'requiredForHiring')
       OR (c.object_id = OBJECT_ID('dbo.onboarding_tasks') AND c.name = 'systemKey')
       OR c.object_id = OBJECT_ID('dbo.hiring_document_reminders')
    ORDER BY tableName, c.column_id`),
  keys: await ds.query(`SELECT k.name, k.type FROM sys.key_constraints k WHERE k.parent_object_id = OBJECT_ID('dbo.hiring_document_reminders') ORDER BY k.name`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.hiring_document_reminders') AND i.is_primary_key = 0 ORDER BY i.name`),
})
const col = (tableName, columnName, type, maxLength, nullable, extra = {}) =>
  ({ tableName, columnName, type, maxLength, nullable, isIdentity: false, df: null, definition: null, ...extra })
const EXPECTED_SHAPE = {
  columns: [
    col('doc_types', 'requiredForHiring', 'bit', 1, false, { df: DF, definition: '((0))' }),
    col('hiring_document_reminders', 'id', 'int', 4, false, { isIdentity: true }),
    col('hiring_document_reminders', 'employeeId', 'int', 4, false),
    col('hiring_document_reminders', 'sentByUserId', 'int', 4, false),
    col('hiring_document_reminders', 'sentAt', 'datetime2', 8, false),
    col('hiring_document_reminders', 'missingDocTypes', 'nvarchar', 800, false),
    col('onboarding_tasks', 'systemKey', 'nvarchar', 80, true),
  ],
  keys: [{ name: PK, type: 'PK' }],
  indexes: [{ name: IX, isUnique: false, columnName: 'employeeId' }],
}
const snapshot = async () => ({
  docTypes: await ds.query('SELECT [id], [code], [nameAr], [isActive] FROM dbo.doc_types ORDER BY [id]'),
  tasks: await ds.query(`SELECT [id], [employeeId], [templateItemId], [label], [party], CONVERT(varchar(10), [dueDate], 23) AS [dueDate], [status]
    FROM dbo.onboarding_tasks ORDER BY [id]`),
})

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-hiring-docs-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'hiring-documents migration fixture cleanup failed')
})

test('HD-M1: الملف LF من غير BOM، إضافي بلا تعديل بيانات، وأكواده فريدة، وأسماء القيد والمفتاح والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  assert.ok(!raw.toString('utf8').replace(/\r\n/g, '\n').includes('\r'), 'نهايات سطور سليمة')
  // LF في نسخة المستودع (نسخة العمل على Windows ممكن تبقى CRLF)
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`],
    { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content()
  assert.match(text, /^-- 20260930_075: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [75001, 75002, 75003, 75004, 75005, 75006, 75007, 75008])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|INSERT|UPDATE)\b/i, 'إضافي فقط: بلا تعديل بيانات')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.match(statements, /IF COL_LENGTH\(N'dbo\.doc_types', N'requiredForHiring'\) IS NULL\s+ALTER TABLE dbo\.doc_types ADD \[requiredForHiring\] bit NOT NULL\s+CONSTRAINT \[DF_2caa2b3de768bf45b96d893289e\] DEFAULT 0;/)
  assert.match(statements, /IF COL_LENGTH\(N'dbo\.onboarding_tasks', N'systemKey'\) IS NULL\s+ALTER TABLE dbo\.onboarding_tasks ADD \[systemKey\] nvarchar\(40\) NULL;/)
  assert.match(statements, /IF OBJECT_ID\(N'dbo\.hiring_document_reminders', N'U'\) IS NULL\s+BEGIN\s+CREATE TABLE dbo\.hiring_document_reminders \(/)
  assert.match(statements, /CONSTRAINT \[PK_hiring_document_reminders\] PRIMARY KEY \(\[id\]\)/)
  assert.match(statements, /CREATE INDEX \[IX_hiring_document_reminders_employee\] ON dbo\.hiring_document_reminders \(\[employeeId\]\);/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملف مقبول')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM|STRING_SPLIT\s*\([^)]*,[^)]*,/i, 'SQL Server 2019')
  const { DefaultNamingStrategy } = require('../node_modules/typeorm')
  assert.equal(new DefaultNamingStrategy().defaultConstraintName('doc_types', 'requiredForHiring'), DF)
  // أسماء الكيان الصريحة هي اللي في الملف
  const reminder = ds.getMetadata('HiringDocumentReminder')
  assert.equal(reminder.tableName, 'hiring_document_reminders')
  assert.equal(reminder.primaryColumns[0].primaryKeyConstraintName, PK)
  assert.deepEqual(reminder.indices.map(index => [index.name, index.columns.map(c => c.propertyName)]), [[IX, ['employeeId']]])
  // القاعدة المتعملة بـsynchronize من الكيانات نفسها: نفس الشكل ونفس الأسماء، والفرق صفر قبل التجربة
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('HD-M2: المخطط القديم بأنواع مستندات ومهام تهيئة قائمة — المُرحّل بيضيف العمودين والجدول بس، والقائم «مش مطلوب» ومن غير مفتاح نظام، والفرق صفر', async () => {
  // صفوف قائمة: الأنواع الأساسية بتتبذر مع الإقلاع؛ ومهام تهيئة لموظف (من القالب ويدوية)
  assert.ok((await repo('DocType').count()) >= 12, 'كتالوج الأنواع الأساسي مبذور')
  const branch = await repo('Branch').save({ code: 'HDM_MAIN', name: 'فرع ترحيل مسوغات التعيين' })
  const employee = await repo('Employee').save({ employeeCode: 'HDM-001', fullName: 'موظف مهام تهيئة قائمة', branchId: branch.id, status: 'active',
    isActive: true, joinDate: '2026-09-01' })
  await repo('OnboardingTask').save([
    { employeeId: employee.id, templateItemId: null, label: 'مهمة يدوية قديمة', party: 'hr', dueDate: '2026-09-01', sortOrder: 10, status: 'PENDING' },
    { employeeId: employee.id, templateItemId: null, label: 'مهمة مقفولة قديمة', party: 'it', dueDate: '2026-09-02', sortOrder: 20, status: 'DONE' },
  ])
  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize — نشيل الجديد زي ما كان على قاعدة الشركة (قاعدة مؤقتة بس)
  await pool.request().batch(`DROP TABLE dbo.hiring_document_reminders;
    ALTER TABLE dbo.doc_types DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.doc_types DROP COLUMN [requiredForHiring];
    ALTER TABLE dbo.onboarding_tasks DROP COLUMN [systemKey];`)
  assert.deepEqual(await shape(), { columns: [], keys: [], indexes: [] })
  const before = await snapshot()
  assert.ok(before.tasks.length >= 2)

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')).sort(), [
    'doc_types.requiredForHiring', 'hiring_document_reminders.employeeId', 'hiring_document_reminders.id', 'hiring_document_reminders.missingDocTypes',
    'hiring_document_reminders.sentAt', 'hiring_document_reminders.sentByUserId', 'onboarding_tasks.systemKey'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'),
    [{ table: 'hiring_document_reminders', before: null, after: 0, kind: 'new-table' }])

  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  // القائم زي ما هو بالحرف: كل نوع «مش مطلوب» وكل مهمة من غير مفتاح نظام
  assert.deepEqual(await snapshot(), before)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.doc_types WHERE [requiredForHiring] <> 0'))[0].n, 0)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.onboarding_tasks WHERE [systemKey] IS NOT NULL'))[0].n, 0)
  // فرق المخطط صفر: من كيانات التطبيق، ومن «plan --database» (كل ملفات الكيانات) على القاعدة المؤقتة
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true)
  assert.equal(plan.pendingCount, 0)
  assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // الكيانات بتقرا الأعمدة الجديدة
  assert.equal((await repo('DocType').findOneByOrFail({ code: 'contract' })).requiredForHiring, false)
  assert.equal((await repo('OnboardingTask').findOneByOrFail({ id: before.tasks[0].id })).systemKey, null)
})

test('HD-M3: آمن للتكرار، وشكل غلط بيوقف التحقق بكوده ومايسيبش أثر', async () => {
  const text = content()
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const before = await snapshot()
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await snapshot(), before)

  for (const [ddl, code] of [
    [`ALTER TABLE dbo.doc_types DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.doc_types ALTER COLUMN [requiredForHiring] bit NULL`, 75002],
    [`ALTER TABLE dbo.doc_types DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.doc_types ALTER COLUMN [requiredForHiring] int NOT NULL`, 75002],
    [`EXEC sp_rename N'dbo.${DF}', N'DF_hiring_docs_wrong_name', N'OBJECT'`, 75003],
    [`ALTER TABLE dbo.doc_types DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.doc_types ADD CONSTRAINT [${DF}] DEFAULT 1 FOR [requiredForHiring]`, 75003],
    [`ALTER TABLE dbo.doc_types DROP CONSTRAINT [${DF}]`, 75003],
    ['ALTER TABLE dbo.onboarding_tasks ALTER COLUMN [systemKey] nvarchar(80) NULL', 75004],
    ['ALTER TABLE dbo.onboarding_tasks ALTER COLUMN [systemKey] varchar(40) NULL', 75004],
    ['ALTER TABLE dbo.hiring_document_reminders ALTER COLUMN [missingDocTypes] nvarchar(500) NOT NULL', 75006],
    ['ALTER TABLE dbo.hiring_document_reminders ALTER COLUMN [sentAt] datetime NOT NULL', 75006],
    ['ALTER TABLE dbo.hiring_document_reminders ALTER COLUMN [employeeId] int NULL', 75006],
    [`ALTER TABLE dbo.hiring_document_reminders DROP CONSTRAINT [${PK}]`, 75007],
    [`DROP INDEX [${IX}] ON dbo.hiring_document_reminders`, 75008]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(text).at(-1)), error => { assert.equal(error.number, code, `${ddl}: ${error.message}`); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await snapshot(), before)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})
