'use strict'
// ترحيل B1.5 (20261003_080) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_statutory_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  SM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW 80001-80007 فريدة، ومتوافق مع SQL Server 2019،
//        وأسماء المفتاحين والفهرسين والافتراضي = أسماء الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر.
//  SM-2) المخطط القديم (من غير العمود والجدولين) على قاعدة فيها موظفين: الكود شغال (المسار القديم والحدود من الشاشة، والملف بيتحفظ،
//        وتاريخ أول تسجيل بيترفض برسالة الترحيل)، والمُرحّل (بروفة ثم تطبيق) بيضيفهم من غير ما يغيّر صف، والفرق صفر، والبيانات الأولية بتتضاف.
//  SM-3) آمن للتكرار.
// Run (من api/): node --test test/statutory-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_statutory_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_statutory_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-statutory-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-statutory-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_080_statutory_gosi_tracks.sql'
let app, ds, master, pool, employees, seeder, created = false
const { readStatutoryEntries } = require('../src/statutory/statutory.service')
const { readGosiFirstRegistered } = require('../src/employees/employee-gosi-registration')
const { readSocialInsuranceContext } = require('../src/payroll/social-insurance.service')
const { computeSocialInsurance } = require('../src/payroll/social-insurance')

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const dropNew = () => {
  assertDisposable()
  return pool.request().batch('ALTER TABLE dbo.employees DROP COLUMN [gosiFirstRegisteredAt]; DROP TABLE dbo.statutory_values; DROP TABLE dbo.statutory_definitions;')
}
const shape = async () => ({
  columns: await ds.query(`SELECT OBJECT_NAME(c.object_id) AS tableName, c.name AS columnName, t.name AS type, c.max_length AS maxLength,
      c.precision AS precision, c.scale AS scale, c.is_nullable AS nullable, c.is_identity AS isIdentity, d.name AS df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE (c.object_id = OBJECT_ID('dbo.employees') AND c.name = 'gosiFirstRegisteredAt') OR c.object_id IN (OBJECT_ID('dbo.statutory_definitions'), OBJECT_ID('dbo.statutory_values'))
    ORDER BY tableName, c.column_id`),
  keys: await ds.query(`SELECT name, type FROM sys.key_constraints WHERE parent_object_id IN (OBJECT_ID('dbo.statutory_definitions'), OBJECT_ID('dbo.statutory_values')) ORDER BY name`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, ic.key_ordinal AS ordinal, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id IN (OBJECT_ID('dbo.statutory_definitions'), OBJECT_ID('dbo.statutory_values')) AND i.is_primary_key = 0 ORDER BY i.name, ic.key_ordinal`),
})
const col = (tableName, columnName, type, maxLength, precision, scale, nullable, isIdentity = false, df = null) =>
  ({ tableName, columnName, type, maxLength, precision, scale, nullable, isIdentity, df })
const EXPECTED_SHAPE = {
  columns: [
    col('employees', 'gosiFirstRegisteredAt', 'date', 3, 10, 0, true),
    col('statutory_definitions', 'id', 'int', 4, 10, 0, false, true),
    col('statutory_definitions', 'country', 'nvarchar', 4, 0, 0, false),
    col('statutory_definitions', 'key', 'nvarchar', 160, 0, 0, false),
    col('statutory_definitions', 'effectiveFrom', 'date', 3, 10, 0, false),
    col('statutory_definitions', 'verified', 'bit', 1, 1, 0, false, false, 'DF_5ebd7b4ee9ed71cf7162d2c581d'),
    col('statutory_definitions', 'source', 'nvarchar', 600, 0, 0, true),
    col('statutory_values', 'id', 'int', 4, 10, 0, false, true),
    col('statutory_values', 'definitionId', 'int', 4, 10, 0, false),
    col('statutory_values', 'code', 'nvarchar', 120, 0, 0, false),
    col('statutory_values', 'value', 'decimal', 9, 18, 4, false),
  ],
  keys: [{ name: 'PK_statutory_definitions', type: 'PK' }, { name: 'PK_statutory_values', type: 'PK' }],
  indexes: [
    { name: 'UX_statutory_definitions_key', isUnique: true, ordinal: 1, columnName: 'country' },
    { name: 'UX_statutory_definitions_key', isUnique: true, ordinal: 2, columnName: 'key' },
    { name: 'UX_statutory_definitions_key', isUnique: true, ordinal: 3, columnName: 'effectiveFrom' },
    { name: 'UX_statutory_values_code', isUnique: true, ordinal: 1, columnName: 'definitionId' },
    { name: 'UX_statutory_values_code', isUnique: true, ordinal: 2, columnName: 'code' },
  ],
}

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
  employees = app.get(require('../src/employees/employees.service').EmployeesService)
  seeder = app.get(require('../src/statutory/statutory.service').StatutorySeedService)
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-statutory-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'statutory migration fixture cleanup failed')
})

test('SM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_080: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [80001, 80002, 80003, 80004, 80005, 80006, 80007])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE|INSERT)\b/i, 'بلا مسح ولا تعديل ولا بيانات')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const definitions = ds.getMetadata('StatutoryDefinition'), values = ds.getMetadata('StatutoryValue')
  assert.deepEqual([definitions.tableName, definitions.primaryColumns[0].primaryKeyConstraintName], ['statutory_definitions', 'PK_statutory_definitions'])
  assert.deepEqual([values.tableName, values.primaryColumns[0].primaryKeyConstraintName], ['statutory_values', 'PK_statutory_values'])
  assert.deepEqual(definitions.indices.map(index => [index.name, index.isUnique, index.columns.map(c => c.propertyName)]), [['UX_statutory_definitions_key', true, ['country', 'key', 'effectiveFrom']]])
  assert.deepEqual(values.indices.map(index => [index.name, index.isUnique, index.columns.map(c => c.propertyName)]), [['UX_statutory_values_code', true, ['definitionId', 'code']]])
  // عمود الموظف برّه الكيان في القراءة والإنشاء والحفظ (الكود قبل الترحيل)
  const column = ds.getMetadata('Employee').findColumnWithPropertyName('gosiFirstRegisteredAt')
  assert.deepEqual([column.isSelect, column.isInsert, column.isUpdate, column.isNullable, column.default], [false, false, false, true, undefined])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('SM-2: المخطط القديم بموظفين قائمين — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمود والجدولين من غير ما يغيّر صف، والفرق صفر', async () => {
  const branch = await ds.getRepository('Branch').save({ code: 'SM_SA', name: 'فرع ترحيل 080', insuranceSystem: 'SAUDI' })
  const emp = await ds.getRepository('Employee').save({ employeeCode: 'SM001', fullName: 'موظف قبل ترحيل 080', nationality: 'سعودي', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 9000, status: 'active', isActive: true, payMethod: 'transfer', isGosiRegistered: true, gosiBaseSalary: 10000 })
  await dropNew()
  assert.deepEqual(await shape(), { columns: [], keys: [], indexes: [] })
  // الكود قبل الترحيل: مفيش قيم مؤرخة ولا تواريخ تسجيل، والحساب هو بتاع النهارده بالحرف
  assert.deepEqual(await readStatutoryEntries(ds.manager), [])
  assert.equal((await readGosiFirstRegistered(ds.manager, [emp.id])).size, 0)
  await seeder.onApplicationBootstrap()
  const context = await readSocialInsuranceContext(ds.manager)
  const rates = context.ratesAt('2026-07-31')
  assert.deepEqual([rates.saudiNewTrack, rates.egyptianLimits], [null, null])
  const result = computeSocialInsurance({ system: 'SAUDI', registered: true, declaredSalary: 10000, nationality: 'سعودي', firstRegisteredAt: '2024-07-03' }, context.settings, rates)
  assert.deepEqual([result.track, result.employeeShare, result.employerShare], ['NEW', 975, 1175])
  // الملف: إنشاء وحفظ عادي قبل الترحيل (العمود برّه الكيان)، والعرض بتاريخ فاضي، والتاريخ نفسه بيترفض برسالة الترحيل
  const fresh = await ds.getRepository('Employee').save({ employeeCode: 'SM002', fullName: 'موظف جديد قبل ترحيل 080', branchId: branch.id, joinDate: '2026-01-01',
    basicSalary: 7000, status: 'active', isActive: true, payMethod: 'transfer' })
  await ds.getRepository('Employee').save({ ...fresh, fullName: 'اسم اتعدّل قبل ترحيل 080' })
  assert.equal((await employees.findOne(emp.id, null)).gosiFirstRegisteredAt, null)
  assert.equal((await employees.update(emp.id, { gosiFirstRegisteredAt: null }, null, 1)).gosiFirstRegisteredAt, null)
  await assert.rejects(employees.update(emp.id, { gosiFirstRegisteredAt: '2024-07-03' }, null, 1), error => error.getStatus?.() === 400 && /ترحيل 080/.test(error.message))
  const before = await ds.query('SELECT [id], [employeeCode], [fullName], [gosiBaseSalary], [isGosiRegistered] FROM dbo.employees ORDER BY [id]')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id], [employeeCode], [fullName], [gosiBaseSalary], [isGosiRegistered] FROM dbo.employees ORDER BY [id]'), before, 'ولا صف قائم اتغيّر')
  assert.deepEqual(await ds.query('SELECT DISTINCT [gosiFirstRegisteredAt] FROM dbo.employees'), [{ gosiFirstRegisteredAt: null }], 'فاضي = المسار القديم')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // بعد الترحيل: البيانات الأولية بتتضاف (مرة واحدة)، والتاريخ بيتحفظ، والمسار الجديد بيشتغل
  assert.equal(await seeder.seed(), 7)
  assert.equal(await seeder.seed(), 0)
  assert.equal((await readStatutoryEntries(ds.manager)).length, 7)
  assert.equal((await employees.update(emp.id, { gosiFirstRegisteredAt: '2024-07-03' }, null, 1)).gosiFirstRegisteredAt, '2024-07-03')
  const after = await readSocialInsuranceContext(ds.manager)
  const now = computeSocialInsurance({ system: 'SAUDI', registered: true, declaredSalary: 10000, nationality: 'سعودي',
    firstRegisteredAt: (await readGosiFirstRegistered(ds.manager, [emp.id])).get(emp.id) }, after.settings, after.ratesAt('2026-07-31'))
  assert.deepEqual([now.track, now.employeeShare, now.employerShare], ['NEW', 1075, 1275])
})

test('SM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const rows = await ds.query('SELECT [id], CONVERT(nvarchar(10), [gosiFirstRegisteredAt], 23) AS [date] FROM dbo.employees ORDER BY [id]')
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id], CONVERT(nvarchar(10), [gosiFirstRegisteredAt], 23) AS [date] FROM dbo.employees ORDER BY [id]'), rows)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.statutory_definitions'))[0].n, 7)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.statutory_values'))[0].n, 24, '5 تعريفات للمسار الجديد × 4 + 2 لمصر × 2')
})
