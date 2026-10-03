'use strict'
// ترحيل B1.8c (20261003_083) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_settlement_payment_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  SPM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW 83001-83004 فريدة، ومتوافق مع SQL Server 2019،
//         والأعمدة برّه الكيان في القراءة والإنشاء والحفظ، وقاعدة synchronize بنفس الشكل وفرقها صفر.
//  SPM-2) المخطط القديم (من غير الأعمدة الأربعة) بتصفية معتمدة: التفاصيل شغالة من غير بيانات صرف، والتسجيل بيقول إن الترحيل مش متطبق
//         من غير كتابة؛ والمُرحّل (بروفة ثم تطبيق) بيضيفهم فاضيين من غير ما يغيّر صف، والفرق صفر، وبعده التسجيل شغال.
//  SPM-3) آمن للتكرار.
// Run (من api/): node --test test/settlement-payment-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_settlement_payment_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_settlement_payment_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-settlement-payment-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-settlement-payment-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_083_settlement_payment.sql'
const COLUMNS = ['settlementPaidAt', 'settlementPaidByUserId', 'settlementPaymentMethod', 'settlementPaymentReference']
let app, ds, master, pool, offboarding, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = () => ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.precision AS precision, c.scale AS scale,
    c.is_nullable AS nullable, d.name AS df FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
  WHERE c.object_id = OBJECT_ID('dbo.offboarding_cases') AND c.name IN (${COLUMNS.map(name => `'${name}'`).join(',')}) ORDER BY c.column_id`)
const col = (columnName, type, maxLength, precision, scale) => ({ columnName, type, maxLength, precision, scale, nullable: true, df: null })
const EXPECTED_SHAPE = [
  col('settlementPaidAt', 'date', 3, 10, 0), col('settlementPaidByUserId', 'int', 4, 10, 0),
  col('settlementPaymentMethod', 'nvarchar', 40, 0, 0), col('settlementPaymentReference', 'nvarchar', 200, 0, 0),
]
const admin = { sub: 1, role: 'super_admin', permissions: ['*'], branchId: null, employeeId: null }
const localDate = (value = new Date()) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

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
  offboarding = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-settlement-payment-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'settlement payment migration fixture cleanup failed')
})

test('SPM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، والأعمدة برّه الكيان، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_083: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [83001, 83002, 83003, 83004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE|INSERT)\b/i, 'إضافي فقط')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const meta = ds.getMetadata('OffboardingCase')
  for (const name of COLUMNS) {
    const column = meta.findColumnWithPropertyName(name)
    assert.deepEqual([column.isSelect, column.isInsert, column.isUpdate, column.isNullable, column.default], [false, false, false, true, undefined], name)
  }
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('SPM-2: المخطط القديم بتصفية معتمدة — التفاصيل من غير بيانات صرف والتسجيل بيقول إن الترحيل مش متطبق من غير كتابة؛ والمُرحّل بيضيف الأعمدة فاضية من غير ما يغيّر صف', async () => {
  const branch = await ds.getRepository('Branch').save({ code: 'SPM_BR', name: 'فرع ترحيل 083' })
  const emp = await ds.getRepository('Employee').save({ employeeCode: 'SPM001', fullName: 'موظف قبل ترحيل 083', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 9000, status: 'active', isActive: true, payMethod: 'cash' })
  const kase = await ds.getRepository('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2099-07-10', status: 'SETTLED', terminationReason: 'termination',
    settlementNet: 1234.5, settlementApprovedBy: 1, settlementApprovedAt: new Date(), settlementDocRef: 'SET-2026-00001' })
  assertDisposable()
  await pool.request().batch(`ALTER TABLE dbo.offboarding_cases DROP COLUMN ${COLUMNS.map(name => `[${name}]`).join(', ')};`)
  assert.deepEqual(await shape(), [])
  // قبل الترحيل: التفاصيل شغالة من غير بيانات صرف، والتسجيل 409 من غير أي كتابة
  const detail = await offboarding.detail(kase.id, admin)
  assert.deepEqual([detail.id, detail.settlementPayment, detail.settlementPaymentReady], [kase.id, null, false])
  await assert.rejects(offboarding.recordSettlementPayment(admin, kase.id, { date: localDate(), method: 'CASH' }),
    error => error.getStatus?.() === 409 && error.getResponse().code === 'SETTLEMENT_PAYMENT_MIGRATION_MISSING')
  const before = await ds.query('SELECT [id],[employeeId],[status],CAST([settlementNet] AS nvarchar(40)) AS [net],[settlementDocRef] FROM dbo.offboarding_cases ORDER BY [id]')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id],[employeeId],[status],CAST([settlementNet] AS nvarchar(40)) AS [net],[settlementDocRef] FROM dbo.offboarding_cases ORDER BY [id]'), before, 'ولا صف قائم اتغيّر')
  assert.deepEqual(await ds.query(`SELECT DISTINCT ${COLUMNS.map(name => `[${name}]`).join(',')} FROM dbo.offboarding_cases`),
    [Object.fromEntries(COLUMNS.map(name => [name, null]))], 'من غير تعبئة رجعية')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // بعد الترحيل: التسجيل شغال
  const done = await offboarding.recordSettlementPayment(admin, kase.id, { date: localDate(), method: 'CASH' })
  assert.deepEqual([done.settlementPayment.method, done.settlementPayment.paidAt, done.settlementPayment.paidByUserId, done.settlementPaymentReady], ['CASH', localDate(), 1, true])
})

test('SPM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const rows = await ds.query(`SELECT [id],${COLUMNS.map(name => `[${name}]`).join(',')} FROM dbo.offboarding_cases ORDER BY [id]`)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query(`SELECT [id],${COLUMNS.map(name => `[${name}]`).join(',')} FROM dbo.offboarding_cases ORDER BY [id]`), rows)
})
