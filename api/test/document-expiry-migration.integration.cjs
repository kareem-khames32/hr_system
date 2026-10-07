'use strict'
// ترحيل B2.15-أ (20261007_099) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_docexpiry_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  DEM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (الأعمدة الأربعة) وفرقها صفر.
//  DEM-2) من غير الأعمدة: أنواع المستندات والمستندات شغالين، والإعدادات على افتراضيها وحفظها مرفوض برسالة، والتنبيه على 30 يوم من غير
//         مهمة، والتقرير شغال؛ وعمود قديم بشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل
//         والفرق صفر، وبعده الإعدادات بتتحفظ والمهمة بتتفتح.
//  DEM-3) آمن للتكرار.
// Run (من api/): node --test test/document-expiry-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')

const database = `hr_docexpiry_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_docexpiry_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-docexpiry-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-docexpiry-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_099_document_expiry.sql'
const COLUMNS = [['doc_types', 'hasExpiry'], ['doc_types', 'alertDays'], ['doc_types', 'ownerRole'], ['employee_documents', 'renewalTaskId']]
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, queue, admin, employee, iqama, created = false, today

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => (await ds.query(`SELECT OBJECT_NAME(c.object_id) AS [table], c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable,
    c.default_object_id AS defaultId, c.is_computed AS computed
  FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
  WHERE (c.object_id = OBJECT_ID(N'dbo.doc_types') AND c.name IN (N'hasExpiry', N'alertDays', N'ownerRole')) OR (c.object_id = OBJECT_ID(N'dbo.employee_documents') AND c.name = N'renewalTaskId')
  ORDER BY [table], columnName`)).map(row => [row.table, row.columnName, row.type, row.maxLength, row.nullable, row.defaultId, row.computed])
// «قبل الترحيل»: الأعمدة الأربعة مش موجودة (على القاعدة المؤقتة بس)
async function dropColumns() {
  assertDisposable()
  for (const [table, column] of COLUMNS) await pool.request().batch(`IF COL_LENGTH(N'dbo.${table}', N'${column}') IS NOT NULL ALTER TABLE dbo.${table} DROP COLUMN [${column}];`)
  rules.resetDocumentExpiryCache()
}
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null, tokenVersion: user.tokenVersion ?? 0,
  permissions: ['*'] })
async function request(method, route, body) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(admin))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]

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
  rules = require('../src/assets/document-expiry')
  queue = app.get(require('../src/queue/queue.service').QueueService)
  today = localDateOf(new Date())
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  const branch = await ds.getRepository('Branch').save({ code: 'DEM_A', name: 'فرع ترحيل المستندات', country: 'SA' })
  admin = await ds.getRepository('User').save({ email: 'admin@docexpiry-migration.invalid', displayName: 'مدير ترحيل المستندات', passwordHash: 'test-only',
    role: 'super_admin', permissions: '["*"]', isActive: true })
  employee = await ds.getRepository('Employee').save({ employeeCode: 'DEM001', fullName: 'موظف ترحيل المستندات', branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01' })
  iqama = expectStatus(await request('GET', '/documents/expiry-settings'), 200).types.find(type => type.code === 'iqama')
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-docexpiry-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'document expiry migration fixture cleanup failed')
})

test('DEM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_099: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [99001, 99002, 99003, 99004, 99011, 99012, 99013, 99014])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'أعمدة جداد بس، من غير تعبئة')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current, [['doc_types', 'alertDays', 'nvarchar', 200, true, 0, false], ['doc_types', 'hasExpiry', 'bit', 1, true, 0, false],
    ['doc_types', 'ownerRole', 'nvarchar', 80, true, 0, false], ['employee_documents', 'renewalTaskId', 'int', 4, true, 0, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الأعمدة اللي synchronize عملها بتعدّي تحقق الترحيل الكامل، والترحيل مابيغيّرش فيها حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.DOCUMENT_EXPIRY_MIGRATION_MISSING, /20261007_099/)
})

test('DEM-2: من غير الأعمدة المستندات شغالة والإعدادات على افتراضيها؛ وعمود بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropColumns()
  assert.deepEqual(await shape(), [])
  assert.equal(await rules.documentExpiryReady(ds.manager), false)
  const MISSING = rules.DOCUMENT_EXPIRY_MIGRATION_MISSING

  // قبل الترحيل: الإعدادات بتتقري على افتراضيها (وبتقول إنها مش جاهزة)، وحفظها مرفوض برسالة الترحيل
  const early = expectStatus(await request('GET', '/documents/expiry-settings'), 200)
  assert.equal(early.ready, false)
  assert.deepEqual(early.types.map(type => [type.hasExpiry, type.alertDays.join(), type.ownerRole]).filter(row => row.join('|') !== 'false|30|'), [])
  assert.deepEqual(answer(await request('PATCH', `/documents/expiry-settings/${iqama.id}`, { ownerRole: 'hr' })), [400, MISSING])
  // أنواع المستندات والمستندات زي ما هم: نوع جديد، ومستند من غير تاريخ (مفيش إلزام)، وتعديله، والقايمة
  expectStatus(await request('POST', '/catalogs/doc-types', { code: 'dem_new', nameAr: 'نوع قبل الترحيل', isActive: true }), 201)
  const plain = expectStatus(await request('POST', '/documents', { employeeId: employee.id, docType: 'iqama' }), 201)
  const doc = expectStatus(await request('PATCH', `/documents/${plain.id}`, { expiryDate: addDays(today, 12) }), 200)
  assert.ok(expectStatus(await request('GET', '/documents'), 200).some(row => row.id === doc.id))
  // التنبيه على 30 يوم الافتراضي: حدث واحد ومن غير مهمة، والتقرير شغال من غير عمود المهمة
  assert.equal(await queue.recordDocumentExpiryEvents(today), 1)
  assert.equal(await queue.recordDocumentExpiryEvents(today), 0)
  assert.equal(await ds.getRepository('Task').count(), 0)
  const report = expectStatus(await request('GET', '/documents/expiry?days=30'), 200)
  assert.deepEqual(report.rows.map(row => [row.id, row.typeName, row.daysLeft, row.ownerRole, row.renewalTask]), [[doc.id, 'إقامة', 12, null, null]])
  // وتجديد المستند قبل الترحيل شغال (مفيش مهمة تتقفل)
  expectStatus(await request('PATCH', `/documents/${doc.id}`, { expiryDate: addDays(today, 15) }), 200)
  assert.equal(await rules.documentExpiryReady(ds.manager), false)

  // عمود قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const refused = async (table, column, definition, message) => {
    await dropColumns()
    await pool.request().batch(`ALTER TABLE dbo.${table} ADD [${column}] ${definition};`)
    const before = await shape()
    await assert.rejects(runFile(FILE), message, `${table}.${column} ${definition}`)
    assert.deepEqual(await shape(), before, `الترحيل المرفوض مالمسش حاجة: ${table}.${column} ${definition}`)
    // الافتراضي المسمّى بيتشال مع عموده في التنضيف
    await pool.request().batch(`DECLARE @name sysname = (SELECT d.name FROM sys.default_constraints d JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
      WHERE d.parent_object_id = OBJECT_ID(N'dbo.${table}') AND c.name = N'${column}'); IF @name IS NOT NULL EXEC(N'ALTER TABLE dbo.${table} DROP CONSTRAINT [' + @name + N']');`)
  }
  for (const [table, column, definition] of [['doc_types', 'hasExpiry', 'int NULL'], ['doc_types', 'hasExpiry', 'bit NOT NULL CONSTRAINT [DF_dem_has] DEFAULT 0'],
    ['doc_types', 'alertDays', 'nvarchar(50) NULL'], ['doc_types', 'alertDays', 'varchar(100) NULL'], ['doc_types', 'alertDays', 'nvarchar(max) NULL'],
    ['doc_types', 'ownerRole', 'nvarchar(40) NOT NULL CONSTRAINT [DF_dem_role] DEFAULT N\'hr\''], ['doc_types', 'ownerRole', 'nvarchar(100) NULL'],
    ['employee_documents', 'renewalTaskId', 'bigint NULL'], ['employee_documents', 'renewalTaskId', 'int NULL CONSTRAINT [DF_dem_task] DEFAULT 0'],
    ['employee_documents', 'renewalTaskId', 'AS (CAST(NULL AS int))']]) {
    await refused(table, column, definition, new RegExp(`20261007_099: عمود ${table}\\.${column} موجود وشكله مش`))
  }
  // وعمود سليم موجود لوحده: الترحيل بيكمّل الناقص بس
  await dropColumns()
  await pool.request().batch('ALTER TABLE dbo.doc_types ADD [alertDays] nvarchar(100) NULL;')
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الناقص اتكمّل')
  await dropColumns()

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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية، والإعدادات بتتحفظ، ويوم التنبيه الجاي بيفتح المهمة
  assert.equal(await rules.documentExpiryReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [doc_types] WHERE [hasExpiry] IS NOT NULL OR [alertDays] IS NOT NULL OR [ownerRole] IS NOT NULL`), [{ n: 0 }])
  const saved = expectStatus(await request('PATCH', `/documents/expiry-settings/${iqama.id}`, { hasExpiry: true, alertDays: [30, 7], ownerRole: 'hr' }), 200)
  assert.deepEqual([saved.hasExpiry, saved.alertDays, saved.ownerRole], [true, [30, 7], 'hr'])
  assert.equal(await queue.recordDocumentExpiryEvents(addDays(today, 10)), 1)
  const tasks = await ds.getRepository('Task').find()
  assert.deepEqual(tasks.map(task => [task.assigneeRole, task.status]), [['hr', 'OPEN']])
  assert.equal((await ds.query('SELECT [renewalTaskId] FROM [employee_documents] WHERE [id] = @0', [doc.id]))[0].renewalTaskId, tasks[0].id)
})

test('DEM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(),
    types: await ds.query('SELECT [id], [hasExpiry], [alertDays], [ownerRole] FROM [doc_types] ORDER BY [id]'),
    documents: await ds.query('SELECT [id], [renewalTaskId] FROM [employee_documents] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual(before.types.filter(row => row.ownerRole != null).map(row => [row.hasExpiry, row.alertDays, row.ownerRole]), [[true, '30,7', 'hr']])
  assert.equal(before.documents.filter(row => row.renewalTaskId != null).length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
