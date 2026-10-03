'use strict'
// ترحيل B2.3 (20261003_086) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_queue_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  QM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الأعمدة والفهارس) وفرقها صفر.
//  QM-2) من غير الجدولين: الإجراء شغال والحدث مابيتسجلش والعامل مابيعملش حاجة؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدولين بنفس الشكل
//        والفرق صفر، وبعده الحدث بيتسجل ويتوزع.
//  QM-3) آمن للتكرار.
// Run (من api/): node --test test/queue-outbox-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_queue_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_queue_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-queue-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-queue-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_086_queue_outbox.sql'
let app, ds, master, pool, queue, outbox, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => {
  const tables = {}
  for (const table of ['outbox_events', 'jobs_queue']) {
    tables[table] = {
      columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]),
      indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter, i.filter_definition AS filterDefinition,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]),
    }
  }
  return tables
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
  queue = app.get(require('../src/queue/queue.service').QueueService)
  outbox = require('../src/queue/outbox')
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-queue-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'queue migration fixture cleanup failed')
})

test('QM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_086: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [86001, 86002, 86003, 86004, 86005])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual([current.outbox_events.columns.length, current.jobs_queue.columns.length], [8, 14])
  assert.deepEqual(current.outbox_events.indexes.map(row => row.name), ['IX_outbox_events_pending', 'PK_outbox_events', 'UX_outbox_events_key'])
  assert.deepEqual(current.jobs_queue.indexes.map(row => row.name), ['IX_jobs_queue_due', 'PK_jobs_queue', 'UX_jobs_queue_key'])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('QM-2: من غير الجدولين الإجراء شغال والحدث مابيتسجلش؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الحدث بيتسجل ويتوزع', async () => {
  const synchronized = await shape()
  assertDisposable()
  await pool.request().batch('DROP TABLE dbo.jobs_queue; DROP TABLE dbo.outbox_events;')
  outbox.resetQueueTablesCache()
  // الإجراء نفسه شغال: التسجيل بيرجع false، والعامل والتوزيع والشاشة من غير أخطاء
  assert.equal(await ds.transaction(em => outbox.recordOutboxEvent(em, { type: 'EMPLOYEE_HIRED', entityType: 'employee', entityId: 1 })), false)
  assert.deepEqual(await queue.runOnce(), { recovered: 0, dispatched: 0, done: 0, retried: 0, dead: 0 })
  assert.deepEqual(await queue.overview(), { available: false })
  assert.equal(await queue.recordDocumentExpiryEvents('2026-10-03'), 0)

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

  outbox.resetQueueTablesCache()
  const seen = []
  queue.registerHandler('test.after-migration', async payload => { seen.push(payload.event.entityId) })
  queue.subscribe('EMPLOYEE_HIRED', 'test.after-migration')
  assert.equal(await ds.transaction(em => outbox.recordOutboxEvent(em, { type: 'EMPLOYEE_HIRED', entityType: 'employee', entityId: 42 })), true)
  await queue.runOnce()
  assert.deepEqual(seen, ['42'])
})

test('QM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const before = { shape: await shape(), events: await ds.query('SELECT * FROM [outbox_events] ORDER BY [id]'), jobs: await ds.query('SELECT * FROM [jobs_queue] ORDER BY [id]') }
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual({ shape: await shape(), events: await ds.query('SELECT * FROM [outbox_events] ORDER BY [id]'), jobs: await ds.query('SELECT * FROM [jobs_queue] ORDER BY [id]') }, before)
})
