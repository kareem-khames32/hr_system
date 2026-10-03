'use strict'
// ترحيل أمان الدخول 20261003_078 على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_login_security_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  LSM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW 78001-78006 فريدة، ومتوافق مع SQL Server 2019،
//         وأسماء المفتاح والفهرسين والافتراضي = أسماء الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر.
//  LSM-2) المخطط القديم (من غير العمودين والجدول) على قاعدة فيها حسابات: الكود شغال (الدخول زي الأول ومفيش قفل ولا سجل)، والمُرحّل
//         (بروفة ثم تطبيق) بيضيفهم من غير ما يغيّر صف قائم (العداد صفر ومفيش قفل)، والفرق صفر، والقفل والسجل اشتغلوا.
//  LSM-3) آمن للتكرار.
// Run (من api/): node --test test/login-security-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_login_security_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_login_security_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-login-security-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-login-security-files-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_078_login_security.sql'
let app, ds, master, pool, security, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const dropNew = () => {
  assertDisposable()
  return pool.request().batch(`ALTER TABLE dbo.users DROP COLUMN [failedLoginCount], [lockedUntil]; DROP TABLE dbo.login_events;`)
}
const shape = async () => ({
  columns: await ds.query(`SELECT OBJECT_NAME(c.object_id) AS tableName, c.name AS columnName, t.name AS type, c.max_length AS maxLength,
      c.is_nullable AS nullable, c.is_identity AS isIdentity, d.name AS df
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
    WHERE (c.object_id = OBJECT_ID('dbo.users') AND c.name IN ('failedLoginCount', 'lockedUntil')) OR c.object_id = OBJECT_ID('dbo.login_events')
    ORDER BY tableName, c.column_id`),
  keys: await ds.query(`SELECT name, type FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('dbo.login_events') ORDER BY name`),
  indexes: await ds.query(`SELECT i.name, ic.key_ordinal AS ordinal, c.name AS columnName FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.login_events') AND i.is_primary_key = 0 ORDER BY i.name, ic.key_ordinal`),
})
const col = (tableName, columnName, type, maxLength, nullable, isIdentity = false, df = null) => ({ tableName, columnName, type, maxLength, nullable, isIdentity, df })
const EXPECTED_SHAPE = {
  columns: [
    col('login_events', 'id', 'int', 4, false, true),
    col('login_events', 'at', 'datetime2', 8, false),
    col('login_events', 'userId', 'int', 4, true),
    col('login_events', 'identifier', 'nvarchar', 400, false),
    col('login_events', 'method', 'nvarchar', 20, false),
    col('login_events', 'outcome', 'nvarchar', 60, false),
    col('login_events', 'ip', 'nvarchar', 128, true),
    col('login_events', 'userAgent', 'nvarchar', 800, true),
    col('login_events', 'actorUserId', 'int', 4, true),
    col('users', 'failedLoginCount', 'int', 4, true),
    col('users', 'lockedUntil', 'datetime2', 8, true),
  ],
  keys: [{ name: 'PK_login_events', type: 'PK' }],
  indexes: [{ name: 'IX_login_events_at', ordinal: 1, columnName: 'at' }, { name: 'IX_login_events_user', ordinal: 1, columnName: 'userId' },
    { name: 'IX_login_events_user', ordinal: 2, columnName: 'at' }],
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads,
    AUTH_FAILURE_DELAY_MS: '0' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  security = app.get(require('../src/auth/login-security.service').LoginSecurityService)
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-login-security-(migrations|files)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'login security migration fixture cleanup failed')
})

test('LSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وأسماؤه بتاعة الكيانات، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_078: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [78001, 78002, 78003, 78004, 78005, 78006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(DELETE|DROP|TRUNCATE|MERGE|UPDATE|INSERT)\b/i, 'بلا مسح ولا تعديل ولا بيانات')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const meta = ds.getMetadata('LoginEvent')
  assert.deepEqual([meta.tableName, meta.primaryColumns[0].primaryKeyConstraintName], ['login_events', 'PK_login_events'])
  assert.deepEqual(meta.indices.map(index => [index.name, index.columns.map(c => c.propertyName)]).sort(), [['IX_login_events_at', ['at']], ['IX_login_events_user', ['userId', 'at']]])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('LSM-2: المخطط القديم بحسابات قائمة — الكود شغال قبل الترحيل، والمُرحّل بيضيف العمودين والجدول من غير ما يغيّر صف، والفرق صفر', async () => {
  const user = await ds.getRepository('User').save({ email: 'old@login-migration.test', displayName: 'حساب قديم', role: 'employee', permissions: '[]',
    passwordHash: await require('../node_modules/bcryptjs').hash('Correct-horse-9', 10) })
  await dropNew()
  assert.deepEqual(await shape(), { columns: [], keys: [], indexes: [] })
  // الكود قبل الترحيل: مفيش قفل ولا سجل، والدخول الغلط والصح زي الأول
  assert.deepEqual(await security.lockState(user.id), { failedLoginCount: 0, lockedUntil: null })
  assert.equal(await security.registerFailure(user.id, { maxAttempts: 3, minutes: 5 }), null)
  await security.record({ userId: user.id, identifier: user.email, method: 'PASSWORD', outcome: 'BAD_PASSWORD' })
  assert.equal((await security.lockedAccounts()).size, 0)
  const auth = app.get(require('../src/auth/auth.service').AuthService)
  await assert.rejects(auth.login(user.email, 'wrong-password-1'), error => error.getStatus?.() === 401)
  const session = await auth.login(user.email, 'Correct-horse-9')
  assert.ok(session.accessToken)
  // إنشاء حساب جديد وحفظ حساب قائم قبل الترحيل (TypeORM بيحط كل عمود insert في INSERT): العمودين برّه الكيان في الكتابة
  const fresh = await ds.getRepository('User').save({ email: 'new-before-078@login-migration.test', displayName: 'حساب جديد قبل الترحيل', role: 'employee',
    permissions: '[]', passwordHash: 'not-a-password' })
  await ds.getRepository('User').save({ ...fresh, displayName: 'اسم اتعدّل قبل الترحيل' })
  await ds.getRepository('User').delete({ id: fresh.id })
  const before = await ds.query('SELECT [id], [email], [passwordHash], [role], [isActive] FROM dbo.users ORDER BY [id]')

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id], [email], [passwordHash], [role], [isActive] FROM dbo.users ORDER BY [id]'), before, 'ولا صف قائم اتغيّر')
  assert.deepEqual(await ds.query('SELECT DISTINCT [failedLoginCount], [lockedUntil] FROM dbo.users'), [{ failedLoginCount: null, lockedUntil: null }], 'NULL = صفر')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))
  // بعد الترحيل: القفل والسجل شغالين
  const after = await security.registerFailure(user.id, { maxAttempts: 2, minutes: 5 })
  assert.equal(after.failedLoginCount, 1)
  await security.record({ userId: user.id, identifier: user.email, method: 'PASSWORD', outcome: 'BAD_PASSWORD' })
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.login_events'))[0].n, 1)
})

test('LSM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const rows = await ds.query('SELECT [id], [failedLoginCount] FROM dbo.users ORDER BY [id]')
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await shape(), EXPECTED_SHAPE)
  assert.deepEqual(await ds.query('SELECT [id], [failedLoginCount] FROM dbo.users ORDER BY [id]'), rows)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM dbo.login_events'))[0].n, 1)
})
