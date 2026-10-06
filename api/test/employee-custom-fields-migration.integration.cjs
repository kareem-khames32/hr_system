'use strict'
// ترحيل B2.9-ب (20261006_094) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_custom_fields_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  CFM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (الأعمدة والفهارس للجدولين) وفرقها صفر.
//  CFM-2) من غير الجدولين: ملف الموظف شغال، والحقول «مش متاحة» من غير خطأ، والحفظ والتعريف مرفوضين برسالة الترحيل، وشرط الجمهور
//         مابيلاقيش قيم؛ وجدول قديم بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يلمسه؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدولين
//         بنفس الشكل والفرق صفر، وبعده — من غير إعادة تشغيل ولا مهلة — الحقل بيتعرّف وقيمته بتتحفظ.
//  CFM-3) آمن للتكرار.
// Run (من api/): node --test test/employee-custom-fields-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_custom_fields_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_custom_fields_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-custom-fields-migrations-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261006_094_employee_custom_fields.sql'
const FIELDS = 'employee_custom_fields', VALUES = 'employee_custom_values'
let app, ds, master, pool, service, rules, created = false
const made = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shapeOf = async table => ({
  columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]))
    .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.hasFilter]),
})
const shape = async () => ({ fields: await shapeOf(FIELDS), values: await shapeOf(VALUES) })
const dropBoth = () => pool.request().batch(`IF OBJECT_ID(N'dbo.${VALUES}', N'U') IS NOT NULL DROP TABLE dbo.${VALUES}; IF OBJECT_ID(N'dbo.${FIELDS}', N'U') IS NOT NULL DROP TABLE dbo.${FIELDS};`)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex') })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  service = app.get(require('../src/employees/employee-custom-fields.service').EmployeeCustomFieldsService)
  rules = require('../src/employees/employee-custom-fields')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  made.branch = await ds.getRepository('Branch').save({ code: 'CFM_A', name: 'فرع ترحيل الحقول' })
  made.employee = await ds.getRepository('Employee').save({ employeeCode: 'CFM001', fullName: 'موظف ترحيل الحقول', branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  const hr = await ds.getRepository('User').save({ email: 'hr@custom-fields-migration.invalid', displayName: 'موارد', passwordHash: 'test-only', role: 'employee',
    permissions: JSON.stringify(['employees.view', 'employees.edit', 'settings.manage']), isActive: true, branchId: made.branch.id })
  made.hr = { sub: hr.id, email: hr.email, role: 'employee', branchId: made.branch.id, employeeId: null, permissions: ['employees.view', 'employees.edit', 'settings.manage'] }
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
  try {
    assert.equal(path.dirname(path.resolve(base)), os.tmpdir()); assert.match(path.basename(base), /^hr-custom-fields-migrations-/)
    fs.rmSync(base, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'custom fields migration fixture cleanup failed')
})

test('CFM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261006_094: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [94001, 94002, 94003, 94004, 94005])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.fields.columns, [
    ['id', 'int', 4, false, true, 0], ['fieldKey', 'nvarchar', 80, false, false, 0], ['label', 'nvarchar', 200, false, false, 0], ['type', 'nvarchar', 20, false, false, 0],
    ['options', 'nvarchar', -1, true, false, 0], ['required', 'bit', 1, false, false, 0], ['restricted', 'bit', 1, false, false, 0], ['sortOrder', 'int', 4, false, false, 0],
    ['isActive', 'bit', 1, false, false, 0], ['createdAt', 'datetime2', 8, false, false, 0]])
  assert.deepEqual(current.fields.indexes, [['PK_employee_custom_fields', 'id', true, false], ['UX_employee_custom_fields_key', 'fieldKey', true, false]])
  assert.deepEqual(current.values.columns, [
    ['id', 'int', 4, false, true, 0], ['employeeId', 'int', 4, false, false, 0], ['fieldId', 'int', 4, false, false, 0], ['textValue', 'nvarchar', 1000, true, false, 0],
    ['numberValue', 'decimal', 9, true, false, 0], ['dateValue', 'date', 3, true, false, 0], ['updatedAt', 'datetime2', 8, false, false, 0], ['updatedByUserId', 'int', 4, true, false, 0]])
  assert.deepEqual(current.values.indexes, [['PK_employee_custom_values', 'id', true, false], ['UX_employee_custom_values_employee_field', 'employeeId,fieldId', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('CFM-2: من غير الجدولين الحقول «مش متاحة» والحفظ مرفوض برسالته؛ والمُرحّل بيعمل الجدولين بنفس الشكل والفرق صفر، وبعده الحقل بيتعرّف من غير إعادة تشغيل', async () => {
  const synchronized = await shape()
  assertDisposable()
  await dropBoth()
  rules.resetCustomFieldsCache()
  // قبل الترحيل: «مش متاحة» من غير خطأ للي يشوف الملف، والتعريف والحفظ مرفوضين برسالة الترحيل، وشرط الجمهور مابيلاقيش حقول ولا قيم
  assert.equal(await rules.customFieldsReady(ds.manager), false)
  assert.deepEqual(await service.definitions(), { available: false, fields: [] })
  assert.deepEqual(await service.valuesFor(made.hr, made.employee.id), { available: false, canEdit: false, fields: [] })
  // واللي مايشوفش الملف بياخد رد الملف نفسه، مش «مش متاحة»
  await assert.rejects(service.valuesFor(made.hr, made.employee.id + 900), /الموظف غير موجود/)
  await assert.rejects(service.create(made.hr, { fieldKey: 'early', label: 'قبل الترحيل', type: 'TEXT' }), /ترحيل 20261006_094/)
  await assert.rejects(service.update(made.hr, 1, { label: 'قبل الترحيل' }), /ترحيل 20261006_094/)
  await assert.rejects(service.save(made.hr, made.employee.id, { early: 'x' }), /ترحيل 20261006_094/)
  assert.deepEqual([await service.audienceOptions(), await rules.audienceCustomValuesOf(ds.manager, made.employee.id)], [[], {}])

  // جدول قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته ومابيلمسوش
  await pool.request().batch(`CREATE TABLE dbo.${FIELDS} ([id] int NOT NULL, [name] nvarchar(50) NULL);`)
  await assert.rejects(runFile(FILE), /20261006_094: جدول employee_custom_fields موجود وأعمدته مش أعمدة تعريف الحقول الـ10/)
  assert.deepEqual((await shapeOf(FIELDS)).columns.map(row => row[0]), ['id', 'name'])
  assert.deepEqual((await shapeOf(VALUES)).columns, [], 'الترحيل وقف قبل ما يعمل الجدول التاني')
  await dropBoth()
  await pool.request().batch(`CREATE TABLE dbo.${VALUES} ([id] int NOT NULL, [value] nvarchar(50) NULL);`)
  await assert.rejects(runFile(FILE), /20261006_094: جدول employee_custom_values موجود وأعمدته مش أعمدة قيم الحقول الـ8/)
  assert.deepEqual([(await shapeOf(VALUES)).columns.map(row => row[0]), (await shapeOf(FIELDS)).columns], [['id', 'value'], []])
  await dropBoth()
  // وجدول بعشر أعمدة وبنوع غلط: التحقق الأخير بيرفضه
  await pool.request().batch(`CREATE TABLE dbo.${FIELDS} ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employee_custom_fields] PRIMARY KEY, [fieldKey] nvarchar(20) NOT NULL, [label] nvarchar(100) NOT NULL,
    [type] nvarchar(10) NOT NULL, [options] nvarchar(max) NULL, [required] bit NOT NULL, [restricted] bit NOT NULL, [sortOrder] int NOT NULL, [isActive] bit NOT NULL, [createdAt] datetime2 NOT NULL);`)
  await assert.rejects(runFile(FILE), /20261006_094: أعمدة جدول employee_custom_fields ناقصة أو بنوع غلط/)
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

  // بعد الترحيل والخادم شغال: من غير إعادة تشغيل ولا مهلة (النتيجة «مش موجود» مابتتحفظش)
  const field = await service.create(made.hr, { fieldKey: 'after_migration', label: 'بعد الترحيل', type: 'TEXT' })
  const saved = await service.save(made.hr, made.employee.id, { after_migration: 'اتحفظ' })
  assert.deepEqual([saved.available, saved.canEdit, saved.fields.map(row => [row.id, row.fieldKey, row.value])], [true, true, [[field.id, 'after_migration', 'اتحفظ']]])
})

test('CFM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), fields: await ds.query(`SELECT * FROM [${FIELDS}] ORDER BY [id]`), values: await ds.query(`SELECT * FROM [${VALUES}] ORDER BY [id]`) })
  const before = await snapshot()
  assert.deepEqual([before.fields.length, before.values.length], [1, 1])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
