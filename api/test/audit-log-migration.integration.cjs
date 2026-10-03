'use strict'
// ترحيل B2.1 (20261003_084) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_audit_log_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  ALM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (الأعمدة والقيود والفهارس) وفرقها صفر.
//  ALM-2) من غير الجدول: الإجراءات شغالة والأحداث مابتتسجلش، والبحث بيقول محتاج الترحيل؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدول والمشغّل،
//         والفرق صفر، وبعده التسجيل شغال، والتعديل والمسح على السجل مرفوضين.
//  ALM-3) آمن للتكرار.
// Run (من api/): node --test test/audit-log-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_audit_log_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_audit_log_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-audit-log-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-audit-log-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_084_audit_log.sql'
let app, ds, master, pool, audit, created = false
const admin = { sub: 1, role: 'super_admin', permissions: ['*'], branchId: null, employeeId: null }

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID('dbo.audit_log') ORDER BY c.column_id`),
  indexes: (await ds.query(`SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.audit_log') AND name IS NOT NULL ORDER BY name`)).map(row => row.name),
  checks: (await ds.query(`SELECT name FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID('dbo.audit_log') ORDER BY name`)).map(row => row.name),
})
const EXPECTED_INDEXES = ['IX_audit_log_actor_at', 'IX_audit_log_at', 'IX_audit_log_category_at', 'IX_audit_log_entity', 'PK_audit_log']
const EXPECTED_CHECKS = ['CK_audit_log_after_json', 'CK_audit_log_before_json']

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
  audit = app.get(require('../src/audit/audit.service').AuditService)
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-audit-log-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'audit log migration fixture cleanup failed')
})

test('ALM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_084: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [84001, 84002, 84003, 84004, 84005, 84006, 84010])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'إضافي فقط (UPDATE في قايمة أحداث المشغّل بس)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual([current.indexes, current.checks], [EXPECTED_INDEXES, EXPECTED_CHECKS])
  assert.equal(current.columns.length, 13)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('ALM-2: من غير الجدول الإجراءات شغالة والبحث بيقول محتاج الترحيل؛ والمُرحّل بيعمل الجدول والمشغّل والفرق صفر، والتعديل والمسح مرفوضين', async () => {
  const synchronized = await shape()
  assertDisposable()
  await pool.request().batch('DROP TABLE dbo.audit_log;')
  require('../src/audit/audit').resetAuditTableCache()
  // الإجراء نفسه (حدث مسير) شغال من غير تسجيل
  const run = await ds.getRepository('PayrollRun').save({ name: 'مسير قبل 084', period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', status: 'DRAFT', scopeType: 'COMPANY' })
  await ds.getRepository('PayrollRunEvent').save({ runId: run.id, eventType: 'CALCULATED', actorUserId: 1, reason: null, payload: null })
  await assert.rejects(audit.search(admin, {}), error => error.getStatus?.() === 409 && error.getResponse().code === 'AUDIT_MIGRATION_MISSING')

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

  require('../src/audit/audit').resetAuditTableCache()
  await ds.getRepository('PayrollRunEvent').save({ runId: run.id, eventType: 'APPROVED', actorUserId: 1, reason: 'بعد الترحيل', payload: null })
  const [row] = await ds.query(`SELECT [id], [action] FROM [audit_log] WHERE [entityId] = @0`, [String(run.id)])
  assert.equal(row.action, 'APPROVED')
  await assert.rejects(pool.request().query(`UPDATE dbo.audit_log SET [summary] = N'تلاعب' WHERE [id] = ${Number(row.id)}`), /84010|إضافة بس/)
  await assert.rejects(pool.request().query(`DELETE FROM dbo.audit_log WHERE [id] = ${Number(row.id)}`), /84010|إضافة بس/)
  assert.equal((await ds.query('SELECT COUNT(*) AS n FROM [audit_log]'))[0].n, 1, 'السطر لسه موجود زي ما هو')
})

test('ALM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const before = { shape: await shape(), rows: await ds.query('SELECT * FROM [audit_log] ORDER BY [id]') }
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual({ shape: await shape(), rows: await ds.query('SELECT * FROM [audit_log] ORDER BY [id]') }, before)
})
