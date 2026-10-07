'use strict'
// ترحيل B3.1-أ (20261007_103) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_onb_tpl_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  OTM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدول ومفتاحه، وعمود الربط) وفرقها صفر.
//  OTM-2) من غير الجدول والعمود: التهيئة زي الأول (القالب العام، وموظف جديد بياخده، وبند جديد للقالب العام)، وقايمة القوالب بتقول إن
//         الترحيل ناقص، وإنشاء قالب بنطاق مرفوض برسالته؛ وجدول أو عمود قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛
//         والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل والفرق صفر، وبعده — من غير إعادة تشغيل — القوالب شغالة والبنود القايمة عامة.
//  OTM-3) آمن للتكرار.
// Run (من api/): node --test test/onboarding-templates-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_onb_tpl_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_onb_tpl_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-onb-tpl-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-onb-tpl-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_103_onboarding_templates.sql'
const TABLE = 'onboarding_templates', ITEMS = 'onboarding_template_items', COLUMN = 'templateId'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const yesterday = () => { const day = new Date(); day.setDate(day.getDate() - 1); return isoDate(day) }
let app, ds, master, pool, http, rules, admin, branch, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const columnsOf = async (table, only) => (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId, c.is_computed AS computed
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]))
  .filter(row => !only || row.columnName === only)
  .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId === 0 ? 0 : 'default', row.computed])
const shape = async () => ({
  columns: await columnsOf(TABLE),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.is_primary_key AS isPrimary, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${TABLE}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.isPrimary, row.hasFilter]),
  link: await columnsOf(ITEMS, COLUMN),
})
const NO_SHAPE = { columns: [], indexes: [], link: [] }
// «قبل الترحيل»: الجدول والعمود مش موجودين (على القاعدة المؤقتة بس). افتراضي العمود (لو اتعمل في حالة رفض) بيتشال قبله
const dropTable = () => { assertDisposable(); return pool.request().batch(`IF OBJECT_ID(N'dbo.${TABLE}', N'U') IS NOT NULL DROP TABLE dbo.${TABLE};`) }
async function dropColumn() {
  assertDisposable()
  const defaults = await pool.request().query(`SELECT d.[name] FROM sys.default_constraints d JOIN sys.columns c ON c.[object_id] = d.[parent_object_id] AND c.[column_id] = d.[parent_column_id]
    WHERE d.[parent_object_id] = OBJECT_ID(N'dbo.${ITEMS}') AND c.[name] = N'${COLUMN}'`)
  for (const row of defaults.recordset) await pool.request().batch(`ALTER TABLE dbo.${ITEMS} DROP CONSTRAINT [${row.name}];`)
  await pool.request().batch(`IF COL_LENGTH(N'dbo.${ITEMS}', N'${COLUMN}') IS NOT NULL ALTER TABLE dbo.${ITEMS} DROP COLUMN [${COLUMN}];`)
}
const dropBoth = async () => { await dropTable(); await dropColumn() }
async function request(method, route, body) {
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: 'super_admin', branchId: null, employeeId: null, tokenVersion: 0, permissions: ['*'] })
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
let sequence = 0
const hire = () => ds.getRepository('Employee').save({ employeeCode: `OTM-${++sequence}`, fullName: `موظف ترحيل القوالب ${sequence}`, branchId: branch.id, status: 'active',
  isActive: true, joinDate: yesterday() })
const taskLabels = async employee => (expectStatus(await request('GET', '/onboarding'), 200).employees.find(row => row.id === employee.id)?.tasks ?? []).map(task => task.label)

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
  rules = require('../src/onboarding/onboarding-templates')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  branch = await ds.getRepository('Branch').save({ code: 'OTM_A', name: 'فرع ترحيل القوالب' })
  admin = await ds.getRepository('User').save({ email: 'admin@onb-tpl-migration.invalid', displayName: 'مدير ترحيل القوالب', passwordHash: 'test-only', role: 'super_admin',
    permissions: '["*"]', isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-onb-tpl-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'onboarding templates migration fixture cleanup failed')
})

test('OTM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_103: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [103001, 103002, 103003, 103004, 103005])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول وعمود جداد بس')
  assert.deepEqual(statements.match(/\bALTER\b[^;]*;/gi), [`ALTER TABLE dbo.${ITEMS} ADD [${COLUMN}] int NULL;`], 'التغيير الوحيد على جدول قايم: عمود واحد يقبل الفراغ')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيان)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, nullable = false, identity = false) => [name, type, length, nullable, identity, 0, false]
  assert.deepEqual(current.columns, [column('id', 'int', 4, false, true), column('name', 'nvarchar', 300), column('branchId', 'int', 4, true), column('jobTitle', 'nvarchar', 200, true),
    column('gradeId', 'int', 4, true), column('contractType', 'nvarchar', 60, true), column('isActive', 'bit', 1), column('createdAt', 'datetime2', 8)])
  assert.deepEqual(current.indexes, [['PK_onboarding_templates', 'id', true, true, false]])
  assert.deepEqual(current.link, [column(COLUMN, 'int', 4, true)])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.ONBOARDING_TEMPLATES_MIGRATION_MISSING, /20261007_103/)
})

test('OTM-2: من غير الجدول والعمود التهيئة زي الأول؛ وجدول أو عمود بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropBoth()
  rules.resetOnboardingTemplatesCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.onboardingTemplatesReady(ds.manager), false)
  const MISSING = rules.ONBOARDING_TEMPLATES_MIGRATION_MISSING

  // قبل الترحيل: القالب العام وموظف جديد بياخده، وبند جديد للقالب العام وتعديله؛ والقوالب بالنطاق بتقول إن الترحيل ناقص
  const general = expectStatus(await request('GET', '/onboarding/template'), 200)
  assert.equal(general.length, 8)
  assert.deepEqual(await taskLabels(await hire()), general.map(item => item.label))
  const extra = expectStatus(await request('POST', '/onboarding/template', { label: 'بند قبل الترحيل', party: 'hr', dueOffsetDays: 3 }), 201)
  assert.equal(extra.sortOrder, Math.max(...general.map(item => item.sortOrder)) + 10)
  expectStatus(await request('PATCH', `/onboarding/template/${extra.id}`, { label: 'بند اتعدّل قبل الترحيل' }), 200)
  assert.deepEqual(expectStatus(await request('GET', '/onboarding/templates'), 200), { ready: false, templates: [] })
  assert.deepEqual(answer(await request('POST', '/onboarding/templates', { name: 'قالب قبل الترحيل', branchId: branch.id })), [400, MISSING])
  assert.deepEqual(answer(await request('PATCH', '/onboarding/templates/1', { isActive: false })), [400, MISSING])
  assert.deepEqual(answer(await request('GET', '/onboarding/template?templateId=1')), [400, MISSING])
  assert.deepEqual(answer(await request('POST', '/onboarding/template', { templateId: 1, label: 'بند لقالب قبل الترحيل', party: 'hr' })), [400, MISSING])
  assert.equal(await rules.onboardingTemplatesReady(ds.manager), false)

  // جدول أو عمود قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const TABLE_SHAPE = /20261007_103: جدول onboarding_templates موجود وشكله مش شكل قوالب التهيئة/
  const refused = async (setup, message = TABLE_SHAPE) => {
    await dropBoth()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const state = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), state, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', name: 'nvarchar(150) NOT NULL', branchId: 'int NULL', jobTitle: 'nvarchar(100) NULL', gradeId: 'int NULL',
    contractType: 'nvarchar(30) NULL', isActive: 'bit NOT NULL', createdAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_onboarding_templates'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [key] nvarchar(50) NULL);`)
  for (const changes of [{ name: 'varchar(150) NOT NULL' }, { name: 'nvarchar(100) NOT NULL' }, { name: 'nvarchar(150) NULL' }, { branchId: 'bigint NULL' }, { branchId: 'int NOT NULL' },
    { jobTitle: 'nvarchar(200) NULL' }, { gradeId: 'int NOT NULL' }, { contractType: 'nvarchar(20) NULL' }, { isActive: 'bit NULL' },
    { isActive: 'bit NOT NULL CONSTRAINT [DF_otm_active] DEFAULT 1' }, { createdAt: 'datetime NOT NULL' }, { createdAt: 'datetime2(3) NOT NULL' }, { id: 'int NOT NULL' },
    { name: "AS (CAST(N'x' AS nvarchar(150)))" }, { extra: ', [priority] int NULL' }, { omit: 'contractType' }, { pk: 'PK_other_name' }, { key: '[name]' }, { key: '[id], [name]' }, { key: null }]) {
    await refused(table(changes))
  }
  const COLUMN_SHAPE = /20261007_103: عمود onboarding_template_items\.templateId موجود وشكله مش int NULL من غير افتراضي/
  for (const definition of ['bigint NULL', 'int NOT NULL CONSTRAINT [DF_otm_template] DEFAULT 0', 'int NULL CONSTRAINT [DF_otm_template] DEFAULT 0', 'nvarchar(20) NULL', 'AS (CAST(1 AS int))']) {
    await refused(`ALTER TABLE dbo.${ITEMS} ADD [${COLUMN}] ${definition};`, COLUMN_SHAPE)
    await refused([table(), `ALTER TABLE dbo.${ITEMS} ADD [${COLUMN}] ${definition};`], COLUMN_SHAPE)
  }
  // وجدول سليم موجود من غير العمود (أو العكس): الترحيل بيكمّل الناقص بس
  await dropBoth()
  await pool.request().batch(table())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدول السليم الموجود اتكمّل بعمود الربط')
  await dropTable()
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'عمود الربط السليم الموجود اتكمّل بالجدول')
  await dropBoth()

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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية — كل البنود القايمة (ومنها بند قبل الترحيل) عامة، والقوالب شغالة
  assert.equal(await rules.onboardingTemplatesReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [${ITEMS}] WHERE [${COLUMN}] IS NOT NULL`), [{ n: 0 }])
  assert.deepEqual(expectStatus(await request('GET', '/onboarding/templates'), 200), { ready: true, templates: [] })
  const after = expectStatus(await request('GET', '/onboarding/template'), 200)
  assert.deepEqual(after.map(item => item.label), [...general.map(item => item.label), 'بند اتعدّل قبل الترحيل'])
  const created = expectStatus(await request('POST', '/onboarding/templates', { name: 'قالب بعد الترحيل', branchId: branch.id }), 201)
  assert.equal(created.activeItems, 9)
  expectStatus(await request('POST', '/onboarding/template', { templateId: created.id, label: 'بند القالب الجديد', party: 'it' }), 201)
  assert.equal(expectStatus(await request('GET', '/onboarding/template'), 200).length, 9, 'القالب العام مااتزوّدش')
  assert.deepEqual(await taskLabels(await hire()), [...after.map(item => item.label), 'بند القالب الجديد'])
})

test('OTM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), templates: await ds.query(`SELECT [id], [name], [branchId], [isActive] FROM [${TABLE}] ORDER BY [id]`),
    items: await ds.query(`SELECT [id], [label], [${COLUMN}] FROM [${ITEMS}] ORDER BY [id]`) })
  const state = await snapshot()
  assert.equal(state.templates.length, 1)
  assert.equal(state.items.filter(item => item[COLUMN] !== null).length, 10)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), state)
})
