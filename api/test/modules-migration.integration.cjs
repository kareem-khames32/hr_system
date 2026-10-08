'use strict'
// ترحيلا نظام الموديولات 20261002_076 (الجداول) و20261002_077 (حالة الشركة الحالية) على قاعدة مؤقتة عشوائية بتتمسح في الآخر
// (hr_modules_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  MM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW 76001-76011 و77001-77004 فريدة بين كل الملفات،
//        ومتوافقين مع SQL Server 2019، وأسماء المفاتيح والقيد والفهرس = أسماء الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر.
//  MM-2) المخطط القديم (الجداول التلاتة متشالة) على قاعدة فيها بيانات: المُرحّل (بروفة ثم تطبيق) بيضيف الجداول ويزرع حالة الشركة —
//        العشرة بتوع الباقة الأساسية مفعّلين، والتوظيف مفعّل لأن فيه دور شايل «المرشحون والتعيين»، وشاشات العرض مفعّلة — ومفيش صف
//        قائم اتغيّر، وفرق المخطط صفر، والخدمة بتقرا نفس اللي كان شغال قبل الترحيل + شاشات العرض.
//  MM-3) آمن للتكرار: الملفين مرتين كمان بنفس النتيجة، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل.
//  MM-4) التوظيف من غير مرشحين ولا حامل للصلاحية = مقفول؛ ومرشح واحد أو منحة لمستخدم = مفعّل.
//  MM-5) شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض بكوده.
// Run (من api/): node --test test/modules-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const registry = require('../src/modules-registry/registry')

const database = `hr_modules_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_modules_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-modules-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-modules-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const TABLES = '20261002_076_system_modules.sql', SEED = '20261002_077_system_modules_company_seed.sql'
const BASIC = ['attendance', 'custody', 'expenses', 'leave', 'loans', 'offboarding', 'onboarding', 'overtime', 'payroll', 'shifts']
const DEMO = 'platform.demo_screens'
let app, ds, master, pool, modules, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
// نسخة العمل على Windows بتبقى CRLF (core.autocrlf) والمُرحّل بيوحّدها قبل البصمة — الفحص النصي على الشكل الموحّد
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const dropTables = () => { assertDisposable(); return pool.request().batch('DROP TABLE dbo.system_module_events; DROP TABLE dbo.system_module_features; DROP TABLE dbo.system_modules;') }

const shape = async () => ({
  columns: await ds.query(`SELECT OBJECT_NAME(c.object_id) AS tableName, c.name AS columnName, t.name AS type, c.max_length AS maxLength,
      c.is_nullable AS nullable, c.is_identity AS isIdentity, d.name AS df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE c.object_id IN (OBJECT_ID('dbo.system_modules'), OBJECT_ID('dbo.system_module_features'), OBJECT_ID('dbo.system_module_events'))
    ORDER BY tableName, c.column_id`),
  keys: await ds.query(`SELECT k.name, k.type FROM sys.key_constraints k
    WHERE k.parent_object_id IN (OBJECT_ID('dbo.system_modules'), OBJECT_ID('dbo.system_module_features'), OBJECT_ID('dbo.system_module_events')) ORDER BY k.name`),
  checks: await ds.query(`SELECT k.name, k.is_disabled AS isDisabled FROM sys.check_constraints k WHERE k.parent_object_id = OBJECT_ID('dbo.system_modules') ORDER BY k.name`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, ic.key_ordinal AS ordinal, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.system_module_events') AND i.is_primary_key = 0 ORDER BY i.name, ic.key_ordinal`),
})
const col = (tableName, columnName, type, maxLength, nullable, isIdentity = false) => ({ tableName, columnName, type, maxLength, nullable, isIdentity, df: null })
const EXPECTED_SHAPE = {
  columns: [
    col('system_module_events', 'id', 'int', 4, false, true),
    col('system_module_events', 'kind', 'nvarchar', 40, false),
    col('system_module_events', 'key', 'nvarchar', 200, false),
    col('system_module_events', 'enabled', 'bit', 1, true),
    col('system_module_events', 'audience', 'nvarchar', -1, true),
    col('system_module_events', 'byUserId', 'int', 4, false),
    col('system_module_events', 'at', 'datetime2', 8, false),
    col('system_module_features', 'key', 'nvarchar', 200, false),
    col('system_module_features', 'enabled', 'bit', 1, false),
    col('system_module_features', 'updatedAt', 'datetime2', 8, true),
    col('system_module_features', 'updatedBy', 'int', 4, true),
    col('system_modules', 'key', 'nvarchar', 120, false),
    col('system_modules', 'enabled', 'bit', 1, false),
    col('system_modules', 'enabledAt', 'datetime2', 8, true),
    col('system_modules', 'enabledBy', 'int', 4, true),
    col('system_modules', 'audience', 'nvarchar', -1, true),
  ],
  keys: [{ name: 'PK_system_module_events', type: 'PK' }, { name: 'PK_system_module_features', type: 'PK' }, { name: 'PK_system_modules', type: 'PK' }],
  checks: [{ name: 'CK_system_modules_audience_json', isDisabled: false }],
  indexes: [{ name: 'IX_system_module_events_key', isUnique: false, ordinal: 1, columnName: 'key' }, { name: 'IX_system_module_events_key', isUnique: false, ordinal: 2, columnName: 'id' }],
}
const moduleRows = async () => (await ds.query('SELECT [key], [enabled], [enabledAt], [enabledBy], [audience] FROM dbo.system_modules ORDER BY [key]'))
  .map(row => [row.key, row.enabled, row.enabledAt, row.enabledBy, row.audience])
const featureRows = async () => (await ds.query('SELECT [key], [enabled], [updatedAt], [updatedBy] FROM dbo.system_module_features ORDER BY [key]'))
  .map(row => [row.key, row.enabled, row.updatedAt, row.updatedBy])
// بيانات قائمة لازم تفضل زي ما هي بالحرف
const existing = async () => ({
  roles: await ds.query('SELECT [id], [code], [permissions], [isActive] FROM dbo.roles ORDER BY [id]'),
  users: await ds.query('SELECT [id], [email], [role], [permissions] FROM dbo.users ORDER BY [id]'),
  candidates: await ds.query('SELECT [id], [fullName], [stage] FROM dbo.candidates ORDER BY [id]'),
  config: (await ds.query('SELECT COUNT(*) AS n FROM dbo.requests_config'))[0].n,
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
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  for (const file of [TABLES, SEED]) fs.copyFileSync(path.join(MIGRATIONS, file), path.join(base, 'payroll', file))
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-modules-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'modules migration fixture cleanup failed')
})

test('MM-1: الملفين LF من غير BOM، من غير عبارة ممنوعة، وأكوادهم فريدة، وأسماء المفاتيح والقيد والفهرس بتاعة الكيانات، وقاعدة synchronize بنفس الشكل', async () => {
  for (const [file, header, codes] of [[TABLES, /^-- 20261002_076: /, [76001, 76002, 76003, 76004, 76005, 76006, 76007, 76008, 76009, 76010, 76011]],
    [SEED, /^-- 20261002_077: /, [77001, 77002, 77003, 77004]]]) {
    const raw = fs.readFileSync(path.join(MIGRATIONS, file))
    assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], `${file}: من غير BOM`)
    assert.ok(!raw.toString('utf8').replace(/\r\n/g, '\n').includes('\r'), `${file}: نهايات سطور سليمة`)
    const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${file}`],
      { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
    assert.match(indexed, /^i\/lf\b/, `${file}: LF في المستودع — git add للملف قبل الفحص`)
    const text = content(file)
    assert.match(text, header)
    assert.deepEqual(migrate.forbiddenStatements(text), [], file)
    assert.deepEqual(migrate.throwCodes(text), codes, file)
    const statements = migrate.stripComments(text)
    assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE)\b/i, `${file}: بلا مسح ولا تعديل`)
    assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM|STRING_SPLIT\s*\([^)]*,[^)]*,/i, `${file}: SQL Server 2019`)
    assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  }
  const tables = migrate.stripComments(content(TABLES)), seed = migrate.stripComments(content(SEED))
  assert.doesNotMatch(tables, /\bINSERT\b/i, '076 جداول بس — من غير بيانات')
  for (const table of ['system_modules', 'system_module_features', 'system_module_events']) {
    assert.match(tables, new RegExp(`IF OBJECT_ID\\(N'dbo\\.${table}', N'U'\\) IS NULL\\s+BEGIN\\s+CREATE TABLE dbo\\.${table} \\(`))
  }
  // 077: إدراج في جدولي الموديولات بس، وكل إدراج بشرط إن الصف مش موجود
  const inserts = seed.match(/INSERT INTO dbo\.\w+/g)
  assert.deepEqual(inserts, ['INSERT INTO dbo.system_modules', 'INSERT INTO dbo.system_modules', 'INSERT INTO dbo.system_module_features'])
  assert.equal((seed.match(/NOT EXISTS \(SELECT 1 FROM dbo\.system_module/g) || []).length, 4)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملفين مقبولين')
  // الموديولات المزروعة = كل الموديولات الاختيارية اللي كانت في السجل وقت الترحيل بالظبط. واللي اتضاف بعده (B2.11: الوظائف المعتمدة، B2.14: لوحة فريقي)
  // مقفول افتراضيًا ومن غير صف: مش في بذرة 077 (ملف معتمد مابيتعدّلش) وحالته من السجل
  const optional = registry.MODULE_KEYS.filter(key => !registry.MODULES[key].core)
  const LATER = ['positions', 'manager', 'announcements', 'performance', 'training', 'helpdesk', 'cases', 'surveys', 'dependents', 'compensation', 'benefits', 'skills'] // B5.4: + المهارات؛ B3.6: + الأداء؛ B3.9: + التدريب؛ B3.10: + مركز الخدمات؛ B5.1: + تخطيط الزيادات؛ B5.2: + المزايا
  assert.deepEqual([...optional].sort(), [...BASIC, 'recruitment', ...LATER].sort())
  for (const key of BASIC) assert.equal(registry.MODULES[key].preset, 'basic', key)
  for (const key of optional.filter(key => !LATER.includes(key))) assert.match(seed, new RegExp(`N'${key}'`), `${key} في ترحيل البيانات`)
  for (const key of LATER) {
    assert.equal(registry.MODULES[key].defaultEnabled, false, `${key}: مضاف بعد البذرة = مقفول افتراضيًا`)
    assert.doesNotMatch(seed, new RegExp(`N'${key}'`), `${key} مش في ترحيل البيانات`)
  }
  // أسماء الكيانات الصريحة هي اللي في الملف
  const names = name => { const meta = ds.getMetadata(name); return [meta.tableName, meta.primaryColumns[0].primaryKeyConstraintName] }
  assert.deepEqual(names('SystemModule'), ['system_modules', 'PK_system_modules'])
  assert.deepEqual(names('SystemModuleFeature'), ['system_module_features', 'PK_system_module_features'])
  assert.deepEqual(names('SystemModuleEvent'), ['system_module_events', 'PK_system_module_events'])
  assert.deepEqual(ds.getMetadata('SystemModule').checks.map(check => check.name), ['CK_system_modules_audience_json'])
  assert.deepEqual(ds.getMetadata('SystemModuleEvent').indices.map(index => [index.name, index.columns.map(c => c.propertyName)]), [['IX_system_module_events_key', ['key', 'id']]])
  // القاعدة المتعملة بـsynchronize من الكيانات نفسها: نفس الشكل ونفس الأسماء، والفرق صفر قبل التجربة
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('MM-2: المخطط القديم ببيانات قائمة — المُرحّل بيضيف الجداول ويزرع حالة الشركة من غير ما يغيّر صف قائم، والفرق صفر', async () => {
  // بيانات قائمة زي قاعدة الشركة: دور مدير الموارد البشرية شايل «المرشحون والتعيين»
  for (const [code, nameAr, permissions] of [['hr_manager', 'مدير الموارد البشرية', ['employees.view', 'candidates.manage', 'payroll.view']], ['employee', 'موظف', []]]) {
    if (!(await repo('Role').findOneBy({ code }))) await repo('Role').save({ code, nameAr, permissions: JSON.stringify(permissions), isSystem: true, isActive: true })
  }
  assert.match((await repo('Role').findOneByOrFail({ code: 'hr_manager' })).permissions, /"candidates\.manage"/)
  await repo('User').save({ email: 'plain@modules-migration.test', displayName: 'موظف', passwordHash: 'isolated-test-token-only', role: 'employee', permissions: '[]' })
  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize — نشيل الجداول زي ما كان على قاعدة الشركة (قاعدة مؤقتة بس)
  await dropTables(); modules.invalidate()
  assert.deepEqual(await shape(), { columns: [], keys: [], checks: [], indexes: [] })
  // الكود قبل الترحيل: كل حاجة على الافتراضي
  const beforeEnabled = await modules.enabledFor(null)
  assert.deepEqual(beforeEnabled, { modules: registry.enabledSnapshot({ modules: {}, features: {} }).modules, features: [] })
  const before = await existing()

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [TABLES, SEED])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [
    { table: 'system_module_events', before: null, after: 0, kind: 'new-table' },
    { table: 'system_module_features', before: null, after: 1, kind: 'new-table' },
    { table: 'system_modules', before: null, after: 11, kind: 'new-table' },
  ])

  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  // حالة الشركة: العشرة مفعّلين، والتوظيف مفعّل (فيه دور شايل الصلاحية)، وشاشات العرض مفعّلة — صفوف مزروعة من غير مستخدم ولا وقت
  assert.deepEqual(await moduleRows(), [...BASIC, 'recruitment'].sort().map(key => [key, true, null, null, null]))
  assert.deepEqual(await featureRows(), [[DEMO, true, null, null]])
  assert.deepEqual(await existing(), before, 'ولا صف قائم اتغيّر')
  // فرق المخطط صفر: من كيانات التطبيق، ومن «plan --database» على القاعدة المؤقتة
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // الخدمة بعد الترحيل: نفس الموديولات اللي كانت شغالة قبله بالظبط، وزيادة عليها شاشات العرض
  modules.invalidate()
  assert.deepEqual(await modules.enabledFor(null), { modules: beforeEnabled.modules, features: [DEMO] })
})

test('MM-3: آمن للتكرار، وصف غيّره المالك من الشاشة مايرجعش لقيمة الترحيل', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const seeded = await moduleRows()
  for (let round = 0; round < 2; round++) { await runFile(TABLES); await runFile(SEED) }
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await moduleRows(), seeded); assert.deepEqual(await featureRows(), [[DEMO, true, null, null]])
  // المالك قفل العهد وشاشات العرض من الشاشة: إعادة تشغيل الترحيل مابترجّعهمش
  const owner = await repo('User').save({ email: 'owner@modules-migration.test', displayName: 'المالك', passwordHash: 'isolated-test-token-only', role: 'super_admin', permissions: '["*"]' })
  const actor = { sub: owner.id, email: owner.email, role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'], tokenVersion: 0 }
  await modules.setModule(actor, 'custody', { enabled: false })
  await modules.setFeature(actor, DEMO, false)
  await runFile(TABLES); await runFile(SEED)
  const rows = Object.fromEntries((await moduleRows()).map(row => [row[0], row[1]]))
  assert.equal(rows.custody, false); assert.equal(rows.attendance, true)
  assert.equal((await featureRows())[0][1], false)
  assert.equal(await repo('SystemModuleEvent').count(), 2, 'سجل تغييرات المالك زي ما هو')
})

test('MM-4: التوظيف — من غير مرشحين ولا حامل للصلاحية مقفول؛ ومرشح واحد أو منحة لمستخدم مفعّل', async () => {
  assertDisposable()
  const recruitment = async () => (await ds.query(`SELECT [enabled] FROM dbo.system_modules WHERE [key] = N'recruitment'`))[0]?.enabled
  const reseed = async () => { await pool.request().batch(`DELETE FROM dbo.system_modules WHERE [key] = N'recruitment'`); await runFile(SEED); return recruitment() }
  // قاعدة مؤقتة: نشيل الصلاحية من كل الأدوار والمستخدمين
  const roles = await repo('Role').find()
  for (const role of roles) await repo('Role').update(role.id, { permissions: JSON.stringify(JSON.parse(role.permissions).filter(key => key !== 'candidates.manage')) })
  assert.equal(await repo('Candidate').count(), 0)
  assert.equal(await reseed(), false, 'من غير مرشحين ولا حامل = مقفول')
  // دور معطَّل شايل الصلاحية مابيتحسبش
  const idle = await repo('Role').save({ code: 'mm_idle', nameAr: 'دور معطل', permissions: '["candidates.manage"]', isSystem: false, isActive: false })
  assert.equal(await reseed(), false)
  await repo('Role').update(idle.id, { isActive: true })
  assert.equal(await reseed(), true, 'دور مفعّل شايل الصلاحية')
  await repo('Role').update(idle.id, { isActive: false })
  // منحة مباشرة لمستخدم
  const user = await repo('User').findOneByOrFail({ email: 'plain@modules-migration.test' })
  const grant = await repo('UserPermissionOverride').save({ userId: user.id, permission: 'candidates.manage', effect: 'GRANT' })
  assert.equal(await reseed(), true, 'منحة لمستخدم')
  await repo('UserPermissionOverride').update(grant.id, { effect: 'REVOKE' })
  assert.equal(await reseed(), false, 'السحب مش منحة')
  // مرشح واحد في الجدول
  const branch = await repo('Branch').save({ code: 'MM_MAIN', name: 'فرع ترحيل الموديولات' })
  await repo('Candidate').save({ fullName: 'مرشح قديم', positionTitle: 'محاسب', stage: 'rejected', branchId: branch.id })
  assert.equal(await reseed(), true, 'فيه بيانات مرشحين')
})

test('MM-5: شكل غلط بيوقف التحقق بكوده ومايسيبش أثر، و077 قبل 076 بيرفض', async () => {
  const verify076 = migrate.splitBatches(content(TABLES)).at(-1)
  for (const [ddl, code] of [
    ['ALTER TABLE dbo.system_modules ALTER COLUMN [enabled] bit NULL', 76002],
    ['ALTER TABLE dbo.system_modules DROP CONSTRAINT [CK_system_modules_audience_json]; ALTER TABLE dbo.system_modules ALTER COLUMN [audience] nvarchar(400) NULL', 76002],
    ['ALTER TABLE dbo.system_modules DROP CONSTRAINT [PK_system_modules]', 76003],
    ['ALTER TABLE dbo.system_modules DROP CONSTRAINT [CK_system_modules_audience_json]', 76004],
    ['ALTER TABLE dbo.system_modules NOCHECK CONSTRAINT [CK_system_modules_audience_json]', 76004],
    ['ALTER TABLE dbo.system_module_features ALTER COLUMN [updatedAt] datetime NULL', 76006],
    ['ALTER TABLE dbo.system_module_features DROP CONSTRAINT [PK_system_module_features]', 76007],
    ['ALTER TABLE dbo.system_module_events ALTER COLUMN [byUserId] int NULL', 76009],
    ['ALTER TABLE dbo.system_module_events DROP CONSTRAINT [PK_system_module_events]', 76010],
    ['DROP INDEX [IX_system_module_events_key] ON dbo.system_module_events', 76011]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(verify076), error => { assert.equal(error.number, code, `${ddl}: ${error.message}`); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  // قيد الـJSON شغال: جمهور مش JSON مرفوض من القاعدة نفسها
  await assert.rejects(pool.request().batch(`INSERT INTO dbo.system_modules ([key], [enabled], [audience]) VALUES (N'mm_bad', 1, N'مش JSON')`), /CK_system_modules_audience_json/)
  // 077: صف أساسي مقفول بيوقف التحقق، و077 من غير جداول 076 بيرفض بكوده
  const verify077 = migrate.splitBatches(content(SEED)).at(-1)
  const tx = new sql.Transaction(pool)
  await tx.begin()
  try {
    await new sql.Request(tx).batch(`INSERT INTO dbo.system_modules ([key], [enabled]) VALUES (N'employees', 0)`)
    await assert.rejects(new sql.Request(tx).batch(verify077), error => { assert.equal(error.number, 77004); return true })
  } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  const before = { modules: await moduleRows(), features: await featureRows() }
  assert.equal(await repo('SystemModule').count({ where: { key: 'employees' } }), 0, 'مفيش أثر بعد الرجوع')
  await dropTables()
  await assert.rejects(pool.request().batch(migrate.splitBatches(content(SEED))[1]), error => { assert.equal(error.number, 77001); return true })
  // نرجّع الجداول للاختبارات اللي بعد كده (ولتنضيف التجهيزة)
  await runFile(TABLES)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.ok(before.modules.length === 11 && before.features.length === 1)
})
