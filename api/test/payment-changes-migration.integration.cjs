'use strict'
// ترحيل B1.7 (20261003_081) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_payment_changes_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  PM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW 81001-81005 فريدة، ومتوافق مع SQL Server 2019،
//        وأسماء المفتاح والفهرس = أسماء الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر.
//  PM-2) المخطط القديم (من غير الجدول) على قاعدة فيها موظفين: تعديل الآيبان شغال ومابيكتبش في السجل الجديد (والقديم بيتكتب زي ما هو)،
//        والمُرحّل (بروفة ثم تطبيق) بيضيف الجدول فاضي من غير ما يغيّر صف، والفرق صفر، وبعده التعديل بيكتب صف بمصدره.
//  PM-3) آمن للتكرار.
// Run (من api/): node --test test/payment-changes-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_payment_changes_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_payment_changes_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payment-changes-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payment-changes-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_081_employee_payment_changes.sql'
const IBAN_A = 'SA0380000000608010167519', IBAN_B = 'SA4420000001234567891234', IBAN_C = 'SA1510000000000012345678'
let app, ds, master, pool, employees, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.precision AS precision, c.scale AS scale,
      c.is_nullable AS nullable, c.is_identity AS isIdentity, d.name AS df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE c.object_id = OBJECT_ID('dbo.employee_payment_changes') ORDER BY c.column_id`),
  keys: await ds.query(`SELECT name, type FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('dbo.employee_payment_changes') ORDER BY name`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, ic.key_ordinal AS ordinal, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.employee_payment_changes') AND i.is_primary_key = 0 ORDER BY i.name, ic.key_ordinal`),
})
const col = (columnName, type, maxLength, precision, scale, nullable, isIdentity = false) => ({ columnName, type, maxLength, precision, scale, nullable, isIdentity, df: null })
const EXPECTED_SHAPE = {
  columns: [
    col('id', 'int', 4, 10, 0, false, true),
    col('employeeId', 'int', 4, 10, 0, false),
    col('field', 'nvarchar', 80, 0, 0, false),
    col('oldValue', 'nvarchar', 400, 0, 0, true),
    col('newValue', 'nvarchar', 400, 0, 0, true),
    col('changedByUserId', 'int', 4, 10, 0, true),
    col('changedAt', 'datetime2', 8, 27, 7, false),
    col('source', 'nvarchar', 40, 0, 0, false),
    col('requestId', 'int', 4, 10, 0, true),
  ],
  keys: [{ name: 'PK_employee_payment_changes', type: 'PK' }],
  indexes: [
    { name: 'IX_employee_payment_changes_employee', isUnique: false, ordinal: 1, columnName: 'employeeId' },
    { name: 'IX_employee_payment_changes_employee', isUnique: false, ordinal: 2, columnName: 'changedAt' },
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-payment-changes-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'payment changes migration fixture cleanup failed')
})

test('PM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_081: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [81001, 81002, 81003, 81004, 81005])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE|INSERT)\b/i, 'بلا مسح ولا تعديل ولا بيانات')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const meta = ds.getMetadata('EmployeePaymentChange')
  assert.deepEqual([meta.tableName, meta.primaryColumns[0].primaryKeyConstraintName], ['employee_payment_changes', 'PK_employee_payment_changes'])
  assert.deepEqual(meta.indices.map(index => [index.name, index.isUnique, index.columns.map(c => c.propertyName)]),
    [['IX_employee_payment_changes_employee', false, ['employeeId', 'changedAt']]])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('PM-2: المخطط القديم بموظفين قائمين — التعديل شغال قبل الترحيل من غير السجل الجديد، والمُرحّل بيضيف الجدول فاضي من غير ما يغيّر صف، والفرق صفر', async () => {
  const branch = await ds.getRepository('Branch').save({ code: 'PM_BR', name: 'فرع ترحيل 081' })
  const emp = await ds.getRepository('Employee').save({ employeeCode: 'PM001', fullName: 'موظف قبل ترحيل 081', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, status: 'active', isActive: true, payMethod: 'transfer', iban: IBAN_A, bankName: 'البنك الأهلي' })
  assertDisposable()
  await pool.request().batch('DROP TABLE dbo.employee_payment_changes;')
  assert.deepEqual(await shape(), { columns: [], keys: [], indexes: [] })
  // قبل الترحيل: تعديل الآيبان والبنك بيتحفظ، وسجل التغييرات القديم بيتكتب زي ما هو، ومفيش جدول جديد
  const updated = await employees.update(emp.id, { iban: IBAN_B, bankName: 'بنك الراجحي' }, null, 1)
  assert.deepEqual([updated.iban, updated.bankName], [IBAN_B, 'بنك الراجحي'])
  const legacy = await ds.query("SELECT [fieldName], [changedByUserId] FROM dbo.employee_status_history WHERE [employeeId] = @0 AND [fieldName] IN ('iban', 'bankName') ORDER BY [id]", [emp.id])
  assert.deepEqual(legacy.map(row => [row.fieldName, row.changedByUserId]), [['iban', 1], ['bankName', 1]])
  assert.equal((await ds.query("SELECT OBJECT_ID(N'dbo.employee_payment_changes', N'U') AS id"))[0].id, null)
  // الإنشاء كمان شغال قبل الترحيل
  const fresh = await employees.create({ ...(await employeeRequiredFields(ds, branch.id)), fullName: 'موظف جديد قبل ترحيل', branchId: branch.id,
    joinDate: '2026-01-01', basicSalary: 7000, payMethod: 'transfer', iban: IBAN_C, bankName: 'البنك الأهلي' }, 1, null)
  assert.ok(fresh.id)
  const before = await ds.query('SELECT [id], [employeeCode], [fullName], [iban], [bankName], [payMethod] FROM dbo.employees ORDER BY [id]')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id], [employeeCode], [fullName], [iban], [bankName], [payMethod] FROM dbo.employees ORDER BY [id]'), before, 'ولا صف قائم اتغيّر')
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.employee_payment_changes'))[0].n, 0, 'من غير تعبئة رجعية')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // بعد الترحيل: التعديل بيكتب صف بمصدره ومين غيّر، والآيبان متخفي
  await employees.update(emp.id, { iban: IBAN_A }, null, 1)
  const rows = await ds.query('SELECT [employeeId], [field], [oldValue], [newValue], [changedByUserId], [source], [requestId] FROM dbo.employee_payment_changes ORDER BY [id]')
  assert.deepEqual(rows, [{ employeeId: emp.id, field: 'iban', oldValue: '****1234', newValue: '****7519', changedByUserId: 1, source: 'PROFILE', requestId: null }])
})

test('PM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const rows = await ds.query('SELECT * FROM dbo.employee_payment_changes ORDER BY [id]')
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT * FROM dbo.employee_payment_changes ORDER BY [id]'), rows)
})
