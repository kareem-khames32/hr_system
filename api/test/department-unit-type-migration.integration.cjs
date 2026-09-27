'use strict'
// ترحيل 20260927_072 — مستوى «الإدارة» فوق القسم (قرار المالك 27 سبتمبر: «الإدارة ← القسم ← الفريق») على قاعدة مؤقتة عشوائية
// تُحذف في النهاية (hr_unit_type_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  UT-M1) فحص نصي: من غير BOM، ومفيش عبارة ممنوعة ولا حذف، وتعبئة UPDATE واحدة بس (الإدارة التنفيذية)، وأكواد THROW 72001-72004
//         فريدة بين كل الملفات، ومتوافق مع SQL Server 2019، واسم القيد الافتراضي = حساب TypeORM نفسه (وsynchronize بيسمّيه كده).
//  UT-M2) المخطط القديم (العمود متشال) وفيه إدارة تنفيذية وأقسام تحتها من فرعها ومن فرع تاني: الملف عبر المُرحّل المجمّع نفسه (بروفة ثم
//         تطبيق) بيضيف العمود بس — nvarchar(20) NOT NULL بقيمة 'DEPARTMENT' باسم قيد TypeORM — والإدارة التنفيذية بقت «إدارة» والباقي
//         «قسم»، ومفيش صف اتضاف ولا اتشال، وفرق المخطط مع كل الكيانات صفر.
//  UT-M3) آمن للتكرار: إعادة المُرحّل مابتلاقيش ملف معلق، والملف مرتين كمان بنفس الشكل والبيانات؛ والتعبئة بتلمس الإدارة التنفيذية بس
//         (إدارة عادية فاضلة «إدارة»، وإدارة تنفيذية نوعها اتغيّر بالغلط بترجع «إدارة»). وشكل غلط بيوقف التحقق بكوده.
// Run (من api/): node --test test/department-unit-type-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_unit_type_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_unit_type_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-unit-type-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-unit-type-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20260927_072_department_unit_type.sql'
const DF = 'DF_8445a8ae50fcab9b4a3c007e0f1'
let app, ds, master, pool, created = false
const D = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const content = () => fs.readFileSync(path.join(MIGRATIONS, FILE), 'utf8')
// شكل العمود وقيده الافتراضي في القاعدة
const shape = () => ds.query(`SELECT t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, d.name AS df, d.definition
  FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
  WHERE c.object_id = OBJECT_ID('dbo.departments') AND c.name = 'unitType'`)
const EXPECTED_SHAPE = [{ type: 'nvarchar', maxLength: 40, nullable: false, df: DF, definition: "('DEPARTMENT')" }]
const unitTypes = async () => (await ds.query('SELECT [id], [unitType] FROM dbo.departments ORDER BY [id]')).map(row => [row.id, row.unitType])

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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-unit-type-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'unit-type migration fixture cleanup failed')
})

test('UT-M1: الملف إضافي بتعبئة واحدة، وأكواده فريدة، واسم قيده هو اللي TypeORM بيحسبه وsynchronize بيعمله', async () => {
  const text = content()
  assert.notEqual(text.charCodeAt(0), 0xfeff, 'من غير BOM')
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [72001, 72002, 72003, 72004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|INSERT)\b/i, 'بلا حذف ولا إدخال')
  assert.equal((statements.match(/\bUPDATE\b/gi) || []).length, 1, 'تعبئة واحدة بس')
  assert.match(statements, /UPDATE dbo\.departments SET \[unitType\] = N'ADMINISTRATION' WHERE \[isExecutive\] = 1 AND \[unitType\] <> N'ADMINISTRATION';/)
  assert.match(statements, /IF COL_LENGTH\(N'dbo\.departments', N'unitType'\) IS NULL\s+ALTER TABLE dbo\.departments ADD \[unitType\] nvarchar\(20\) NOT NULL/)
  assert.doesNotMatch(statements, /\bCHECK\b/i, 'القيم بتتفحص في الكود — من غير قيد CHECK')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات والملف مقبول')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  const { DefaultNamingStrategy } = require('../node_modules/typeorm')
  assert.equal(new DefaultNamingStrategy().defaultConstraintName('departments', 'unitType'), DF)
  // القاعدة المتعملة بـsynchronize من الكيان نفسه: نفس الشكل ونفس اسم القيد، والفرق صفر قبل التجربة
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.equal((await ds.driver.createSchemaBuilder().log()).upQueries.length, 0)
})

test('UT-M2: المخطط القديم بإدارة تنفيذية وأقسام — المُرحّل بيضيف العمود بس، والإدارة التنفيذية «إدارة» والباقي «قسم»، والفرق صفر', async () => {
  const main = await repo('Branch').save({ code: 'UTM_MAIN', name: 'الفرع الرئيسي' })
  const nasr = await repo('Branch').save({ code: 'UTM_NASR', name: 'فرع النصر' })
  const dept = values => repo('Department').save({ isActive: true, ...values })
  D.exec = await dept({ name: 'الإدارة التنفيذية', code: 'UTM_EXEC', branchId: main.id, isExecutive: true })
  D.office = await dept({ name: 'مكتب الرئيس', code: 'UTM_OFFICE', branchId: main.id, parentId: D.exec.id })
  D.nasr = await dept({ name: 'مبيعات النصر', code: 'UTM_NASR', branchId: nasr.id, parentId: D.exec.id })
  D.nasrSub = await dept({ name: 'تجزئة النصر', code: 'UTM_NASR_SUB', branchId: nasr.id, parentId: D.nasr.id })
  D.alone = await dept({ name: 'مخازن النصر', code: 'UTM_STORE', branchId: nasr.id })
  // ما قبل الترحيل: القاعدة اتعملت بـsynchronize فالعمود موجود — نشيله زي ما كان على قاعدة الشركة
  await pool.request().batch(`ALTER TABLE dbo.departments DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.departments DROP COLUMN [unitType];`)
  assert.deepEqual(await shape(), [])
  const rowsBefore = await ds.query('SELECT [id], [name], [branchId], [parentId], [isExecutive] FROM dbo.departments ORDER BY [id]')
  assert.equal(rowsBefore.length, 5)

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.added.filter(column => !column.startsWith('app_schema_migrations.')), ['departments.unitType'])
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(record.rowCounts.differences.filter(d => d.table !== 'app_schema_migrations'), [])

  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  // التعبئة: الإدارة التنفيذية «إدارة» والباقي «قسم» بالقيمة الافتراضية — وباقي الصفوف زي ما هي بالحرف
  assert.deepEqual(await unitTypes(), [[D.exec.id, 'ADMINISTRATION'], [D.office.id, 'DEPARTMENT'], [D.nasr.id, 'DEPARTMENT'],
    [D.nasrSub.id, 'DEPARTMENT'], [D.alone.id, 'DEPARTMENT']])
  assert.deepEqual(await ds.query('SELECT [id], [name], [branchId], [parentId], [isExecutive] FROM dbo.departments ORDER BY [id]'), rowsBefore)
  // فرق المخطط مع كل الكيانات (ومنها Department) صفر، والكيان بيقرا النوع
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  assert.equal((await repo('Department').findOneByOrFail({ id: D.exec.id })).unitType, 'ADMINISTRATION')
  assert.equal((await repo('Department').findOneByOrFail({ id: D.nasrSub.id })).unitType, 'DEPARTMENT')
})

test('UT-M3: آمن للتكرار، والتعبئة بتلمس الإدارة التنفيذية بس، وشكل غلط بيوقف التحقق بكوده', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const text = content()
  const typesAfter = await unitTypes()
  for (let round = 0; round < 2; round++) for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await unitTypes(), typesAfter)

  // إدارة عادية (من الشاشة) فاضلة «إدارة»، والإدارة التنفيذية لو نوعها اتغيّر بالغلط بترجع «إدارة» — والباقي مايتلمسش
  await ds.query(`UPDATE dbo.departments SET [unitType] = N'ADMINISTRATION' WHERE [id] = @0`, [D.alone.id])
  await ds.query(`UPDATE dbo.departments SET [unitType] = N'DEPARTMENT' WHERE [id] = @0`, [D.exec.id])
  for (const batch of migrate.splitBatches(text)) await pool.request().batch(batch)
  assert.deepEqual(await unitTypes(), typesAfter.map(([id, type]) => [id, id === D.alone.id ? 'ADMINISTRATION' : type]))
  await ds.query(`UPDATE dbo.departments SET [unitType] = N'DEPARTMENT' WHERE [id] = @0`, [D.alone.id])

  // شكل غلط يوقف التحقق بكوده ومايسيبش أثر (كل حالة جوه معاملة بتترجع)
  for (const [ddl, code] of [
    [`ALTER TABLE dbo.departments DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.departments ALTER COLUMN [unitType] nvarchar(20) NULL`, 72002],
    [`ALTER TABLE dbo.departments DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.departments ALTER COLUMN [unitType] nvarchar(30) NOT NULL`, 72002],
    [`EXEC sp_rename N'dbo.${DF}', N'DF_unit_type_wrong_name', N'OBJECT'`, 72003],
    [`ALTER TABLE dbo.departments DROP CONSTRAINT [${DF}]; ALTER TABLE dbo.departments ADD CONSTRAINT [${DF}] DEFAULT 'ADMINISTRATION' FOR [unitType]`, 72003],
    [`ALTER TABLE dbo.departments DROP CONSTRAINT [${DF}]`, 72003],
    [`UPDATE dbo.departments SET [unitType] = N'DEPARTMENT' WHERE [isExecutive] = 1`, 72004]]) {
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      await new sql.Request(tx).batch(ddl)
      await assert.rejects(new sql.Request(tx).batch(migrate.splitBatches(text).at(-1)), error => { assert.equal(error.number, code, error.message); return true })
    } finally { try { await tx.rollback() } catch { /* أُجهضت من الخادم */ } }
  }
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await unitTypes(), typesAfter)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})
