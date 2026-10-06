'use strict'
// ترحيل B2.8 (20261006_093) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_comments_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  CMM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (الأعمدة والفهارس) وفرقها صفر.
//  CMM-2) من غير الجدول: المهام شغالة، والحوار «مش متاح» من غير خطأ، والتعليق مرفوض برسالة الترحيل، وحدث إشارة مابيعملش حاجة، ومرفق
//         تعليق لغير رافعه «غير موجود»؛ وجدول comments قديم بشكل تاني = الترحيل بيقف من غير ما يلمسه؛ والمُرحّل (بروفة ثم تطبيق) بيعمل
//         الجدول بنفس الشكل والفرق صفر، وبعده — من غير إعادة تشغيل ولا مهلة — التعليق بيتكتب ويتقري.
//  CMM-3) آمن للتكرار.
// Run (من api/): node --test test/comments-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_comments_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_comments_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-comments-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-comments-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261006_093_comments.sql'
let app, ds, master, pool, tasks, comments, rules, notifications, created = false
const made = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.comments') ORDER BY c.column_id`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.comments') AND i.name IS NOT NULL ORDER BY i.name`),
})

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads })
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
  tasks = app.get(require('../src/tasks/tasks.service').TasksService)
  comments = app.get(require('../src/comments/comments.service').CommentsService)
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  rules = require('../src/comments/comment-rules')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  made.branch = await ds.getRepository('Branch').save({ code: 'CMM_A', name: 'فرع ترحيل التعليقات' })
  made.employee = await ds.getRepository('Employee').save({ employeeCode: 'CMM001', fullName: 'موظف ترحيل التعليقات', branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  const worker = await ds.getRepository('User').save({ email: 'worker@comments-migration.invalid', displayName: 'موظف', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true,
    branchId: made.branch.id, employeeId: made.employee.id })
  const manager = await ds.getRepository('User').save({ email: 'hr@comments-migration.invalid', displayName: 'موارد', passwordHash: 'test-only', role: 'employee',
    permissions: JSON.stringify(['tasks.manage', 'tasks.view_all']), isActive: true, branchId: made.branch.id })
  made.worker = { sub: worker.id, email: worker.email, role: 'employee', branchId: made.branch.id, employeeId: made.employee.id, permissions: [] }
  made.manager = { sub: manager.id, email: manager.email, role: 'employee', branchId: made.branch.id, employeeId: null, permissions: ['tasks.manage', 'tasks.view_all'] }
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-comments-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'comments migration fixture cleanup failed')
})

test('CMM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261006_093: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [93001, 93002, 93003])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.columns.map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]), [
    ['id', 'int', 4, false, true, 0], ['entityType', 'nvarchar', 60, false, false, 0], ['entityId', 'int', 4, false, false, 0], ['authorUserId', 'int', 4, false, false, 0],
    ['authorEmployeeId', 'int', 4, true, false, 0], ['body', 'nvarchar', 4000, false, false, 0], ['internal', 'bit', 1, false, false, 0], ['mentions', 'nvarchar', -1, true, false, 0],
    ['createdAt', 'datetime2', 8, false, false, 0]])
  assert.deepEqual(current.indexes.map(row => [row.name, row.columns, row.isUnique, row.hasFilter]), [
    ['IX_comments_entity', 'entityType,entityId,id', false, false], ['PK_comments', 'id', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('CMM-2: من غير الجدول الحوار «مش متاح» والتعليق مرفوض برسالته؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده التعليق بيتكتب من غير إعادة تشغيل', async () => {
  const synchronized = await shape()
  assertDisposable()
  const task = await tasks.create(made.manager, { title: 'مهمة قبل ترحيل التعليقات', assigneeEmployeeId: made.employee.id })
  await pool.request().batch('DROP TABLE dbo.comments;')
  rules.resetCommentsTableCache()
  // قبل الترحيل: المهمة زي ما هي، والحوار «مش متاح» من غير خطأ، والكتابة مرفوضة برسالة الترحيل
  assert.equal(await rules.commentsTableReady(ds.manager), false)
  assert.equal((await tasks.detail(made.worker, task.id)).id, task.id)
  const UNAVAILABLE = { available: false, comments: [], targets: [], canInternal: false, truncated: false }
  assert.deepEqual(await comments.list(made.worker, 'task', task.id), UNAVAILABLE)
  // «مش متاح» لأي رقم: مابيقولش المهمة موجودة ولا لأ
  assert.deepEqual(await comments.list(made.worker, 'task', task.id + 9000), UNAVAILABLE)
  await assert.rejects(comments.add(made.worker, 'task', task.id, { body: 'قبل الترحيل' }), /ترحيل 20261006_093/)
  assert.equal(await comments.byId(1), null)
  // مرفق تعليق: لرافعه، ولغيره «غير موجود»
  await comments.assertFileAccess(made.worker, { id: 1, uploadedBy: made.worker.sub, entityId: 1 })
  await assert.rejects(comments.assertFileAccess(made.manager, { id: 1, uploadedBy: made.worker.sub, entityId: 1 }), /الملف غير موجود/)
  // حدث إشارة من غير الجدول: ولا حاجة ومن غير خطأ
  assert.equal(await notifications.dispatch({ id: '1', type: 'COMMENT_MENTION', entityType: 'comment', entityId: '1', payload: { commentId: 1 } }), 0)

  // جدول comments قديم بشكل تاني: الترحيل بيقف برسالته ومابيلمسوش
  await pool.request().batch('CREATE TABLE dbo.comments ([id] int NOT NULL, [text] nvarchar(50) NULL);')
  await assert.rejects(runFile(FILE), /20261006_093: جدول comments موجود وأعمدته مش أعمدة التعليقات الـ9/)
  assert.deepEqual((await ds.query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.comments') ORDER BY c.column_id`)).map(row => row.name), ['id', 'text'])
  await pool.request().batch('DROP TABLE dbo.comments;')
  // وجدول بتسع أعمدة وبنوع غلط: التحقق الأخير بيرفضه
  await pool.request().batch(`CREATE TABLE dbo.comments ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_comments] PRIMARY KEY, [entityType] nvarchar(30) NOT NULL, [entityId] int NOT NULL,
    [authorUserId] int NOT NULL, [authorEmployeeId] int NULL, [body] nvarchar(500) NOT NULL, [internal] bit NOT NULL, [mentions] nvarchar(max) NULL, [createdAt] datetime2 NOT NULL);`)
  await assert.rejects(runFile(FILE), /20261006_093: أعمدة جدول comments ناقصة أو بنوع غلط/)
  await pool.request().batch('DROP TABLE dbo.comments;')

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
  const written = await comments.add(made.worker, 'task', task.id, { body: 'بعد الترحيل', targets: ['CREATOR'] })
  const read = await comments.list(made.manager, 'task', task.id)
  assert.deepEqual([read.available, read.comments.map(row => [row.ref, row.body, row.author.name])], [true, [[written.ref, 'بعد الترحيل', 'موظف ترحيل التعليقات']]])
  assert.match(written.ref, /^[a-f0-9]{20}$/)
  made.comment = written
})

test('CMM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query('SELECT * FROM [comments] ORDER BY [id]') })
  const before = await snapshot()
  assert.equal(before.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
