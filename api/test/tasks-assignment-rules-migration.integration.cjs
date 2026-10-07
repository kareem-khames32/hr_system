'use strict'
// ترحيل B2.5 — إضافة المالك (20261007_096) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_taskrules_migration_test_<16 hex> — لا مساس
// بقاعدة الشركة):
//  TRM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدولين ومفاتيحهم وفهرس السجل) وفرقها صفر، وجدول المهام نفسه بأعمدته العشرين زي ما هو (ترحيل 088 لسه بيعدّي).
//  TRM-2) من غير الجدولين: المهام شغالة زي الأول (تكليف، إقفال بالتزامه، إعادة فتح «مفتوحة» من غير عدّاد، قايمة، تذكير)، والجديد مقفول
//         برسالته (المهمة الشخصية، وطلب التمديد وقراره، والتقييم وعلامته) والتقرير والسجل مش متاحين؛ وجدول أو فهرس قديم بنفس الاسم وبشكل
//         تاني (عمود بنوع أو طول أو دقة أو إلزام غلط، أو بافتراضي، أو هوية، أو محسوب، أو عمود زيادة أو ناقص، أو مفتاح باسم أو عمود تاني،
//         أو فهرس مش فريد أو بترتيب معكوس أو بفلتر) = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدولين بنفس الشكل
//         والفرق صفر، وبعده — من غير إعادة تشغيل — الجديد شغال والمهام القديمة زي ما هي.
//  TRM-3) آمن للتكرار.
// Run (من api/): node --test test/tasks-assignment-rules-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_taskrules_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_taskrules_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-taskrules-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-taskrules-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_096_task_assignment_rules.sql'
const EXTRAS = 'task_extras', LOG = 'task_log'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, extras, tasksService, created = false
const made = {}, users = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shapeOf = async table => ({
  columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId, c.is_computed AS computed
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]))
    .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId, row.computed]),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.is_primary_key AS isPrimary, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.isPrimary, row.hasFilter]),
})
const shape = async () => ({ extras: await shapeOf(EXTRAS), log: await shapeOf(LOG) })
const NO_SHAPE = { extras: { columns: [], indexes: [] }, log: { columns: [], indexes: [] } }
// «قبل الترحيل»: الجدولين مش موجودين (على القاعدة المؤقتة بس)
const dropTables = () => { assertDisposable(); return pool.request().batch(`IF OBJECT_ID(N'dbo.${LOG}', N'U') IS NOT NULL DROP TABLE dbo.${LOG}; IF OBJECT_ID(N'dbo.${EXTRAS}', N'U') IS NOT NULL DROP TABLE dbo.${EXTRAS};`) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const setStatus = (user, id, body) => request(user, 'POST', `/tasks/${id}/status`, body)
const feature = enabled => request(users.admin, 'PUT', '/modules/features/tasks.rating', { enabled })
const logOf = async (user, id) => expectStatus(await request(user, 'GET', `/tasks/${id}/log`), 200).lines.map(line => line.event)
const RULES = view => [view.rulesAvailable, view.personal, view.returnCount, view.extension, view.canRequestExtension, view.canDecideExtension, view.canNotMine, view.ratingEnabled, view.needsRating, view.rating, view.canRate]
const tasksColumns = async () => Number((await ds.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.tasks', N'U')`))[0].n)

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
  extras = require('../src/tasks/task-extras')
  tasksService = app.get(require('../src/tasks/tasks.service').TasksService)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'TRM_A', name: 'فرع ترحيل قواعد المهام' })
  const employee = (code, extra = {}) => ds.getRepository('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
  made.manager = await employee('TRM001')
  made.worker = await employee('TRM002', { managerEmployeeId: made.manager.id })
  made.hrEmp = await employee('TRM003')
  const account = (label, role, permissions, extra = {}) => ds.getRepository('User').save({ email: `${label}@taskrules-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role, branchId: made.branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.manager = await account('manager', 'employee', [], { employeeId: made.manager.id })
  users.worker = await account('worker', 'employee', [], { employeeId: made.worker.id })
  users.hr = await account('hr', 'employee', ['tasks.manage', 'tasks.view_all'], { employeeId: made.hrEmp.id })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-taskrules-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'task rules migration fixture cleanup failed')
})

test('TRM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول المهام بأعمدته العشرين', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_096: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [96001, 96002, 96003, 96004, 96005, 96006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدولين جداد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.extras.columns, [
    ['taskId', 'int', 4, false, false, 0, false], ['isPersonal', 'bit', 1, false, false, 0, false], ['returnCount', 'int', 4, false, false, 0, false], ['needsRating', 'bit', 1, false, false, 0, false],
    ['rating', 'tinyint', 1, true, false, 0, false], ['ratingNote', 'nvarchar', 1000, true, false, 0, false], ['extensionDueDate', 'date', 3, true, false, 0, false],
    ['extensionReason', 'nvarchar', 1000, true, false, 0, false]])
  assert.deepEqual(current.extras.indexes, [['PK_task_extras', 'taskId', true, true, false]])
  assert.deepEqual(current.log.columns, [
    ['id', 'int', 4, false, true, 0, false], ['taskId', 'int', 4, false, false, 0, false], ['event', 'nvarchar', 80, false, false, 0, false], ['actorUserId', 'int', 4, false, false, 0, false],
    ['actorEmployeeId', 'int', 4, true, false, 0, false], ['body', 'nvarchar', 2000, false, false, 0, false], ['createdAt', 'datetime2', 8, false, false, 0, false]])
  assert.deepEqual(current.log.indexes, [['PK_task_log', 'id', true, true, false], ['UX_task_log_task_id', 'taskId,id', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // جدول المهام نفسه ماتزودش عليه عمود: تحقق ترحيل 088 (أعمدته العشرين بالظبط) لسه بيعدّي
  assert.equal(await tasksColumns(), 20)
  await runFile('20261005_088_tasks.sql')
  // الجدولين اللي synchronize عملهم بيعدّوا تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيهم حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(extras.TASK_RULES_MIGRATION_MISSING, /20261007_096/)
})

test('TRM-2: من غير الجدولين المهام زي الأول والجديد مقفول برسالته؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الجديد شغال', async () => {
  const synchronized = await shape()
  await dropTables()
  extras.resetTaskExtrasCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await extras.taskExtrasReady(ds.manager), false)
  const MISSING = extras.TASK_RULES_MIGRATION_MISSING

  // قبل الترحيل: التكليف والقراءة زي الأول، وخانات القواعد على قيمها الفاضية
  const task = expectStatus(await request(users.manager, 'POST', '/tasks', { title: 'مهمة قبل الترحيل', assigneeEmployeeId: made.worker.id, dueDate: day(2) }), 201)
  assert.deepEqual([task.canManage, ...RULES(task)], [true, false, false, 0, null, false, false, false, false, false, null, false])
  const mine = expectStatus(await request(users.worker, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === task.id)
  assert.deepEqual([mine.canWork, ...RULES(mine)], [true, false, false, 0, null, false, false, false, false, false, null, false])
  // المهمة الشخصية مقفولة برسالة الترحيل؛ وصاحب «إدارة المهام» على نفسه في نطاقه مهمة عادية زي الأول
  assert.deepEqual(answer(await request(users.worker, 'POST', '/tasks', { title: 'لنفسي', assigneeEmployeeId: made.worker.id })), [400, MISSING])
  const own = expectStatus(await request(users.hr, 'POST', '/tasks', { title: 'على نفسي قبل الترحيل', assigneeEmployeeId: made.hrEmp.id }), 201)
  assert.deepEqual([own.personal, own.canManage, own.canWork], [false, true, true])
  const options = expectStatus(await request(users.manager, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([options.rulesAvailable, options.ratingEnabled, options.employees.map(row => [row.id, row.self])], [false, false, [[made.worker.id, false]]])
  // طلب التمديد وقراره مقفولين برسالة الترحيل
  assert.deepEqual(answer(await request(users.worker, 'POST', `/tasks/${task.id}/extension`, { dueDate: day(5), reason: 'محتاج وقت' })), [400, MISSING])
  assert.deepEqual(answer(await request(users.manager, 'POST', `/tasks/${task.id}/extension/decision`, { approve: true })), [400, MISSING])
  // الإقفال بالتزامه (محسوب من الموعد والإقفال، من غير الجدولين)
  const done = expectStatus(await setStatus(users.worker, task.id, { status: 'DONE' }), 201)
  assert.deepEqual([done.status, done.compliance, done.complianceLabel], ['DONE', { onTime: true, lateDays: 0 }, 'في الميعاد'])
  // التقييم وعلامته: الميزة مقفولة = رسالتها؛ ومفتوحة = رسالة الترحيل
  assert.deepEqual(answer(await request(users.manager, 'POST', `/tasks/${task.id}/rating`, { rating: 4 })), [400, extras.TASK_RATING_CLOSED])
  expectStatus(await feature(true), 200)
  try {
    assert.deepEqual(answer(await request(users.manager, 'POST', `/tasks/${task.id}/rating`, { rating: 4 })), [400, MISSING])
    assert.deepEqual(answer(await request(users.manager, 'POST', '/tasks', { title: 'معلّمة قبل الترحيل', assigneeEmployeeId: made.worker.id, needsRating: true })), [400, MISSING])
    assert.equal(expectStatus(await request(users.manager, 'GET', `/tasks/${task.id}`), 200).ratingEnabled, false, 'من غير الجدولين مفيش خانات تقييم')
  } finally { expectStatus(await feature(false), 200) }
  // إعادة الفتح «مفتوحة» من غير عدّاد (زي قبل الإضافة)
  const reopened = expectStatus(await setStatus(users.manager, task.id, { status: 'OPEN', note: 'محتاجة تتراجع' }), 201)
  assert.deepEqual([reopened.status, reopened.returnCount, reopened.statusNote], ['OPEN', 0, 'محتاجة تتراجع'])
  // التقرير والسجل مش متاحين، والقايمة والتذكير شغالين، وحوار المهمة من غير أي سطر من الخادم
  const early = expectStatus(await request(users.hr, 'GET', '/tasks/report'), 200)
  assert.deepEqual([early.available, early.rows], [false, []])
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', `/tasks/${task.id}/log`), 200), { available: false, truncated: false, lines: [] })
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', `/tasks/${task.id}/comments`), 200).comments, [])
  assert.deepEqual(expectStatus(await request(users.hr, 'GET', '/tasks?status=all'), 200).tasks.map(row => row.id).sort((a, b) => a - b), [task.id, own.id])
  assert.deepEqual(await tasksService.runReminders(day(0)), { reminded: 0, escalated: 0 })
  assert.equal(await ds.getRepository('Task').count(), 2, 'المرفوض ماعملش مهام')
  assert.equal(await extras.taskExtrasReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] IN (N'${EXTRAS}', N'${LOG}') ORDER BY [name]`)).map(row => row.name) })
  const EXTRAS_SHAPE = /20261007_096: جدول task_extras موجود وشكله مش شكل قواعد إسناد المهام/
  const refused = async (setup, message = EXTRAS_SHAPE) => {
    await dropTables()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const before = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), before, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { taskId: 'int NOT NULL', isPersonal: 'bit NOT NULL', returnCount: 'int NOT NULL', needsRating: 'bit NOT NULL', rating: 'tinyint NULL', ratingNote: 'nvarchar(500) NULL',
    extensionDueDate: 'date NULL', extensionReason: 'nvarchar(500) NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${EXTRAS} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_task_extras'}] PRIMARY KEY (${changes.key ?? '[taskId]'})`});`
  await refused(`CREATE TABLE dbo.${EXTRAS} ([id] int NOT NULL, [name] nvarchar(50) NULL);`)
  // عمود واحد بنوع (بنفس الطول) أو طول أو إلزام غلط، أو بافتراضي، أو هوية، أو محسوب
  for (const changes of [{ ratingNote: 'varchar(1000) NULL' }, { ratingNote: 'nvarchar(100) NULL' }, { extensionReason: 'nvarchar(max) NULL' }, { rating: 'tinyint NOT NULL' }, { isPersonal: 'bit NULL' },
    { returnCount: 'bigint NOT NULL' }, { extensionDueDate: 'datetime2 NULL' }, { returnCount: 'int NOT NULL CONSTRAINT [DF_trm_return_count] DEFAULT 0' }, { taskId: 'int IDENTITY(1,1) NOT NULL' },
    { rating: 'AS (CAST(NULL AS tinyint))' },
    // عمود زيادة، أو عمود ناقص
    { extra: ', [note] nvarchar(50) NULL' }, { omit: 'extensionReason' },
    // المفتاح باسم تاني، أو على عمود تاني، أو بعمود زيادة، أو من غير مفتاح
    { pk: 'PK_other_name' }, { key: '[returnCount]' }, { key: '[taskId], [returnCount]' }, { key: null }]) {
    await refused(table(changes))
  }
  // وفهرس فريد بنفس اسم المفتاح مش مفتاح
  await refused([table({ key: null }), `CREATE UNIQUE INDEX [PK_task_extras] ON dbo.${EXTRAS} ([taskId]);`])

  // نفس الفحص لجدول السجل: عمود بنوع أو طول أو دقة أو إلزام غلط، أو بافتراضي، أو من غير هوية، أو عمود زيادة أو ناقص، أو مفتاح باسم أو أعمدة تانية
  const LOG_DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', taskId: 'int NOT NULL', event: 'nvarchar(40) NOT NULL', actorUserId: 'int NOT NULL', actorEmployeeId: 'int NULL', body: 'nvarchar(1000) NOT NULL',
    createdAt: 'datetime2 NOT NULL' }
  const logTable = (changes = {}) => `CREATE TABLE dbo.${LOG} (${Object.keys(LOG_DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? LOG_DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''
    }, CONSTRAINT [${changes.pk ?? 'PK_task_log'}] PRIMARY KEY (${changes.key ?? '[id]'}));`
  const LOG_SHAPE = /20261007_096: جدول task_log موجود وشكله مش شكل سجل المهمة/
  for (const changes of [{ event: 'varchar(80) NOT NULL' }, { event: 'nvarchar(20) NOT NULL' }, { body: 'nvarchar(max) NOT NULL' }, { actorEmployeeId: 'int NOT NULL' }, { taskId: 'int NULL' },
    { createdAt: 'datetime2(3) NOT NULL' }, { createdAt: 'datetime NOT NULL' }, { actorUserId: 'int NOT NULL CONSTRAINT [DF_trm_actor] DEFAULT 0' }, { id: 'int NOT NULL' },
    { extra: ', [note] nvarchar(50) NULL' }, { omit: 'actorEmployeeId' }, { pk: 'PK_other_log' }, { key: '[id], [taskId]' }]) {
    await refused(logTable(changes), LOG_SHAPE)
  }
  // جدول سجل سليم وفهرس بنفس الاسم: بترتيب معكوس، أو على عمود واحد، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const LOG_INDEX = /20261007_096: فهرس UX_task_log_task_id موجود ومش فريد على المهمة ورقم السطر بالترتيب/
  for (const definition of [`UNIQUE INDEX [UX_task_log_task_id] ON dbo.${LOG} ([id], [taskId])`, `UNIQUE INDEX [UX_task_log_task_id] ON dbo.${LOG} ([id])`, `INDEX [UX_task_log_task_id] ON dbo.${LOG} ([taskId], [id])`,
    `UNIQUE INDEX [UX_task_log_task_id] ON dbo.${LOG} ([taskId], [id], [actorUserId])`, `UNIQUE INDEX [UX_task_log_task_id] ON dbo.${LOG} ([taskId], [id]) INCLUDE ([event])`,
    `UNIQUE INDEX [UX_task_log_task_id] ON dbo.${LOG} ([taskId], [id]) WHERE [actorEmployeeId] IS NOT NULL`]) {
    await refused([logTable(), `CREATE ${definition};`], LOG_INDEX)
  }
  // وجدولين سليمين موجودين من غير فهرس السجل: الترحيل بيكمّل الناقص بس
  await dropTables()
  await pool.request().batch(table())
  await pool.request().batch(logTable())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدولين السليمين الموجودين اتكمّلوا بفهرس السجل')
  await dropTables()

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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل ولا مهلة): المهام القديمة زي ما هي (من غير تعبئة ولا سجل رجعي)، والجديد شغال
  assert.equal(await extras.taskExtrasReady(ds.manager), true)
  assert.deepEqual([await ds.query(`SELECT (SELECT COUNT(*) FROM [${EXTRAS}]) AS [extras], (SELECT COUNT(*) FROM [${LOG}]) AS [log]`), await tasksColumns()], [[{ extras: 0, log: 0 }], 20])
  const after = expectStatus(await request(users.worker, 'GET', `/tasks/${task.id}`), 200)
  assert.deepEqual([after.status, ...RULES(after)], ['OPEN', true, false, 0, null, true, false, true, false, false, null, false])
  // مهمة صاحب الصلاحية على نفسه من قبل الترحيل: مابتتحوّلش شخصية، و«مش بتاعتي» مش ليه (هو اللي كلّف نفسه)
  assert.deepEqual((({ personal, canNotMine, canWork }) => [personal, canNotMine, canWork])(expectStatus(await request(users.hr, 'GET', `/tasks/${own.id}`), 200)), [false, false, true])
  const personal = expectStatus(await request(users.worker, 'POST', '/tasks', { title: 'لنفسي بعد الترحيل', assigneeEmployeeId: made.worker.id }), 201)
  assert.deepEqual([personal.personal, personal.canManage], [true, true])
  const asked = expectStatus(await request(users.worker, 'POST', `/tasks/${task.id}/extension`, { dueDate: day(6), reason: 'محتاج وقت' }), 201)
  assert.deepEqual([asked.extension, asked.dueDate], [{ dueDate: day(6), reason: 'محتاج وقت' }, day(2)])
  assert.equal(expectStatus(await request(users.manager, 'POST', `/tasks/${task.id}/extension/decision`, { approve: true }), 201).dueDate, day(6))
  expectStatus(await setStatus(users.worker, task.id, { status: 'DONE' }), 201)
  const returned = expectStatus(await setStatus(users.manager, task.id, { status: 'OPEN', note: 'ناقصة' }), 201)
  assert.deepEqual([returned.status, returned.returnCount], ['IN_PROGRESS', 1])
  const options2 = expectStatus(await request(users.worker, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([options2.rulesAvailable, options2.canAssign, options2.employees.map(row => [row.id, row.self])], [true, true, [[made.worker.id, true]]])
  assert.equal(expectStatus(await request(users.hr, 'GET', '/tasks/report'), 200).available, true)
  // السجل من أول تغيير بعد الترحيل (اللي قبله من غير سطور)، ومهمة من غير حاجة من القواعد مالهاش صف حالة
  assert.deepEqual([await logOf(users.manager, task.id), await logOf(users.worker, personal.id), await logOf(users.hr, own.id)], [['EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'DONE', 'RETURNED'], ['ASSIGNED'], []])
  assert.deepEqual((await ds.query(`SELECT [taskId], [isPersonal], [returnCount] FROM [${EXTRAS}] ORDER BY [taskId]`)), [{ taskId: task.id, isPersonal: false, returnCount: 1 }, { taskId: personal.id, isPersonal: true, returnCount: 0 }])
  made.task = task.id
})

test('TRM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT * FROM [${EXTRAS}] ORDER BY [taskId]`),
    log: await ds.query(`SELECT [id], [taskId], [event], [actorUserId], [actorEmployeeId], [body] FROM [${LOG}] ORDER BY [id]`), tasks: await ds.query('SELECT [id], [status] FROM [tasks] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual([before.rows.length, before.log.length], [2, 5])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
