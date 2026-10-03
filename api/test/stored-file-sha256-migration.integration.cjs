'use strict'
// ترحيل B2.2 (20261003_085) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_file_sha_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  FSM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل وفرقها صفر.
//  FSM-2) من غير العمود: الرفع شغال من غير بصمة؛ والمُرحّل (بروفة ثم تطبيق) بيضيف العمود بنفس شكل synchronize، والقديم من غير بصمة،
//         وبعده الرفع بيسجّل البصمة.
//  FSM-3) آمن للتكرار.
// Run (من api/): node --test test/stored-file-sha256-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_file_sha_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_file_sha_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-file-sha-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-file-sha-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261003_085_stored_file_sha256.sql'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, url, me, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.default_object_id AS defaultId
  FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID('dbo.stored_files') ORDER BY c.column_id`)
async function upload(name, bytes) {
  const token = jwt.sign({ sub: me.id, email: me.email, role: me.role, branchId: me.branchId, employeeId: me.employeeId, tokenVersion: 0, permissions: [] })
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), name)
  const response = await fetch(`${url}/files/upload?entityType=document`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  const body = await response.json()
  assert.equal(response.status, 201, JSON.stringify(body))
  return body
}
const pdf = text => Buffer.from(`%PDF-1.4\n% ${text}\n%%EOF\n`)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  url = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  const branch = await ds.getRepository('Branch').save({ code: 'FSM_B', name: 'فرع بصمة الملفات' })
  const employee = await ds.getRepository('Employee').save({ employeeCode: 'FSM001', fullName: 'موظف بصمة الملفات', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer' })
  me = await ds.getRepository('User').save({ email: 'me@file-sha.invalid', displayName: 'me', passwordHash: 'test-only', role: 'employee', branchId: branch.id,
    employeeId: employee.id, permissions: '[]' })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-file-sha-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'stored file sha256 migration fixture cleanup failed')
})

test('FSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261003_085: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [85001])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'إضافي فقط ومن غير تعبئة رجعية')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const column = (await shape()).find(row => row.columnName === 'sha256')
  assert.deepEqual(column, { columnName: 'sha256', type: 'nvarchar', maxLength: 128, nullable: true, defaultId: 0 })
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('FSM-2: من غير العمود الرفع شغال من غير بصمة؛ والمُرحّل بيضيفه بنفس الشكل، والقديم من غير بصمة، والجديد ببصمته', async () => {
  const synchronized = await shape()
  assertDisposable()
  await pool.request().batch('ALTER TABLE dbo.stored_files DROP COLUMN [sha256];')
  const old = await upload('old.pdf', pdf('قبل 085'))
  assert.equal(old.sha256, null, 'من غير الترحيل: مفيش بصمة في الرد')
  assert.equal(fs.existsSync(path.join(uploads, (await ds.query('SELECT [storedName] FROM [stored_files] WHERE [id] = @0', [old.id]))[0].storedName)), true)

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

  assert.equal((await ds.query('SELECT [sha256] FROM [stored_files] WHERE [id] = @0', [old.id]))[0].sha256, null, 'القديم من غير بصمة (مفيش تعبئة رجعية)')
  const bytes = pdf('بعد 085')
  const fresh = await upload('new.pdf', bytes)
  const expected = crypto.createHash('sha256').update(bytes).digest('hex')
  assert.equal(fresh.sha256, expected)
  assert.equal((await ds.query('SELECT [sha256] FROM [stored_files] WHERE [id] = @0', [fresh.id]))[0].sha256, expected)
})

test('FSM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const before = { shape: await shape(), rows: await ds.query('SELECT * FROM [stored_files] ORDER BY [id]') }
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual({ shape: await shape(), rows: await ds.query('SELECT * FROM [stored_files] ORDER BY [id]') }, before)
})
