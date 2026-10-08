'use strict'
// ترحيل B3.2-أ (20261008_104) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_recruit_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  RJM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدول ومفتاحه) وفرقها صفر.
//  RJM-2) من غير الجدول: قايمة الوظائف بتقول إن الترحيل ناقص، والإنشاء وطلب «احتياج توظيف» مرفوضين برسالته، والمرشحين زي الأول؛ وجدول
//         قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل والفرق صفر، وبعده — من غير
//         إعادة تشغيل — الإنشاء شغال.
//  RJM-3) آمن للتكرار.
// Run (من api/): node --test test/recruitment-jobs-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_recruit_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_recruit_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-recruit-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-recruit-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261008_104_recruitment_jobs.sql'
const TABLE = 'recruitment_jobs'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, admin, requester, branch, created = false

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.precision AS [precision], c.scale AS [scale], c.is_nullable AS nullable, c.is_identity AS isIdentity,
      c.default_object_id AS defaultId, c.is_computed AS computed
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${TABLE}`]))
    .map(row => [row.columnName, row.type, row.maxLength, row.precision, row.scale, row.nullable, row.isIdentity, row.defaultId, row.computed]),
  indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.is_primary_key AS isPrimary, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${TABLE}`]))
    .map(row => [row.name, row.columns, row.isUnique, row.isPrimary, row.hasFilter]),
})
const NO_SHAPE = { columns: [], indexes: [] }
// «قبل الترحيل»: الجدول مش موجود (على القاعدة المؤقتة بس)
const dropTable = () => { assertDisposable(); return pool.request().batch(`IF OBJECT_ID(N'dbo.${TABLE}', N'U') IS NOT NULL DROP TABLE dbo.${TABLE};`) }
async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: 0,
    permissions: user.role === 'super_admin' ? ['*'] : [] })
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const answer = response => [response.status, [].concat(response.body?.message ?? []).join('، ')]
const jobBody = () => ({ title: 'محاسب', branchId: branch.id, openings: 1 })

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
  rules = require('../src/recruitment/recruitment-rules')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  branch = await ds.getRepository('Branch').save({ code: 'RJM_A', name: 'فرع ترحيل التوظيف', country: 'SA' })
  await ds.getRepository('JobTitle').save({ title: 'محاسب', isActive: true })
  const employee = await ds.getRepository('Employee').save({ employeeCode: 'RJM-1', fullName: 'موظف ترحيل التوظيف', branchId: branch.id, joinDate: '2022-01-01', status: 'active', isActive: true })
  admin = await ds.getRepository('User').save({ email: 'admin@recruit-migration.invalid', displayName: 'مدير ترحيل التوظيف', passwordHash: 'test-only', role: 'super_admin',
    permissions: '["*"]', isActive: true })
  requester = await ds.getRepository('User').save({ email: 'requester@recruit-migration.invalid', displayName: 'مقدّم طلب الاحتياج', passwordHash: 'test-only', role: 'employee',
    permissions: '[]', isActive: true, branchId: branch.id, employeeId: employee.id })
  const chain = await ds.getRepository('ApprovalChain').save({ code: 'RJM_HR', nameAr: 'سلسلة ترحيل التوظيف', isActive: true, autoApprove: false })
  await ds.getRepository('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await ds.getRepository('RequestType').save({ code: 'RECRUITMENT_REQUISITION', nameAr: 'احتياج توظيف', category: 'employment_status', destinationHandler: 'recruitment_requisition',
    approvalChainId: chain.id, isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-recruit-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'recruitment jobs migration fixture cleanup failed')
})

test('RJM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261008_104: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [104001, 104002])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيان)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, precision, scale, nullable = false, identity = false) => [name, type, length, precision, scale, nullable, identity, 0, false]
  assert.deepEqual(current.columns, [column('id', 'int', 4, 10, 0, false, true), column('title', 'nvarchar', 400, 0, 0), column('branchId', 'int', 4, 10, 0), column('departmentId', 'int', 4, 10, 0, true),
    column('openings', 'int', 4, 10, 0), column('reason', 'nvarchar', 1000, 0, 0, true), column('salaryFrom', 'decimal', 9, 18, 2, true), column('salaryTo', 'decimal', 9, 18, 2, true),
    column('startDate', 'date', 3, 10, 0, true), column('description', 'nvarchar', 8000, 0, 0, true), column('requirements', 'nvarchar', 8000, 0, 0, true), column('status', 'nvarchar', 40, 0, 0),
    column('internal', 'bit', 1, 1, 0), column('external', 'bit', 1, 1, 0), column('requestId', 'int', 4, 10, 0, true), column('createdByUserId', 'int', 4, 10, 0),
    column('publishedAt', 'datetime2', 8, 27, 7, true), column('closedAt', 'datetime2', 8, 27, 7, true), column('createdAt', 'datetime2', 8, 27, 7)])
  assert.deepEqual(current.indexes, [['PK_recruitment_jobs', 'id', true, true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدول اللي synchronize عمله بيعدّي تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيه حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.RECRUITMENT_JOBS_MIGRATION_MISSING, /20261008_104/)
})

test('RJM-2: من غير الجدول الوظائف بتقول إن الترحيل ناقص والمرشحين زي الأول؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropTable()
  rules.resetRecruitmentJobsCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.recruitmentJobsReady(ds.manager), false)
  const MISSING = rules.RECRUITMENT_JOBS_MIGRATION_MISSING

  // قبل الترحيل: القايمة بتقول الناقص، والإنشاء والتعديل والحالة وطلب الاحتياج مرفوضين برسالته؛ والمرشحين شغالين
  assert.deepEqual(expectStatus(await request(admin, 'GET', '/recruitment/jobs'), 200), { available: false, message: MISSING, canManage: true, jobs: [] })
  assert.deepEqual(answer(await request(admin, 'POST', '/recruitment/jobs', jobBody())), [400, MISSING])
  assert.deepEqual(answer(await request(admin, 'GET', '/recruitment/jobs/1')), [400, MISSING])
  assert.deepEqual(answer(await request(admin, 'PATCH', '/recruitment/jobs/1', { openings: 2 })), [400, MISSING])
  assert.deepEqual(answer(await request(admin, 'POST', '/recruitment/jobs/1/status', { status: 'CLOSED' })), [400, MISSING])
  assert.deepEqual(answer(await request(requester, 'POST', '/requests', { typeCode: 'RECRUITMENT_REQUISITION', payload: { vacancyTitle: 'محاسب', openings: 1, reason: 'قبل الترحيل' }, submit: true })), [400, MISSING])
  expectStatus(await request(admin, 'GET', '/candidates'), 200)
  assert.equal(await rules.recruitmentJobsReady(ds.manager), false)

  // جدول قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] = N'${TABLE}'`)).map(row => row.name) })
  const TABLE_SHAPE = /20261008_104: جدول recruitment_jobs موجود وشكله مش شكل الوظائف الشاغرة/
  const refused = async setup => {
    await dropTable()
    await pool.request().batch(setup)
    const state = await objects()
    await assert.rejects(runFile(FILE), TABLE_SHAPE, setup.slice(0, 200))
    assert.deepEqual(await objects(), state, `الترحيل المرفوض مالمسش حاجة: ${setup.slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', title: 'nvarchar(200) NOT NULL', branchId: 'int NOT NULL', departmentId: 'int NULL', openings: 'int NOT NULL', reason: 'nvarchar(500) NULL',
    salaryFrom: 'decimal(18,2) NULL', salaryTo: 'decimal(18,2) NULL', startDate: 'date NULL', description: 'nvarchar(4000) NULL', requirements: 'nvarchar(4000) NULL', status: 'nvarchar(20) NOT NULL',
    internal: 'bit NOT NULL', external: 'bit NOT NULL', requestId: 'int NULL', createdByUserId: 'int NOT NULL', publishedAt: 'datetime2 NULL', closedAt: 'datetime2 NULL', createdAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${TABLE} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_recruitment_jobs'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${TABLE} ([id] int NOT NULL, [key] nvarchar(50) NULL);`)
  for (const changes of [{ title: 'varchar(200) NOT NULL' }, { title: 'nvarchar(100) NOT NULL' }, { title: 'nvarchar(200) NULL' }, { branchId: 'int NULL' }, { departmentId: 'int NOT NULL' },
    { openings: 'bigint NOT NULL' }, { salaryFrom: 'decimal(18,4) NULL' }, { salaryTo: 'decimal(12,2) NULL' }, { salaryFrom: 'money NULL' }, { startDate: 'datetime2 NULL' },
    { description: 'nvarchar(max) NULL' }, { status: 'nvarchar(20) NOT NULL CONSTRAINT [DF_rjm_status] DEFAULT N\'DRAFT\'' }, { internal: 'bit NULL' }, { requestId: 'int NOT NULL' },
    { createdAt: 'datetime NOT NULL' }, { id: 'int NOT NULL' }, { title: "AS (CAST(N'x' AS nvarchar(200)))" }, { extra: ', [stages] nvarchar(2000) NULL' }, { omit: 'requirements' },
    { pk: 'PK_other_name' }, { key: '[branchId]' }, { key: '[id], [branchId]' }, { key: null }]) {
    await refused(table(changes))
  }
  await dropTable()

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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): الجدول فاضي، والإنشاء والطلب شغالين
  assert.equal(await rules.recruitmentJobsReady(ds.manager), true)
  assert.deepEqual(expectStatus(await request(admin, 'GET', '/recruitment/jobs'), 200), { available: true, canManage: true, jobs: [] })
  const job = expectStatus(await request(admin, 'POST', '/recruitment/jobs', jobBody()), 201)
  assert.deepEqual([job.title, job.status, job.openings], ['محاسب', 'DRAFT', 1])
  expectStatus(await request(requester, 'POST', '/requests', { typeCode: 'RECRUITMENT_REQUISITION', payload: { vacancyTitle: 'محاسب', openings: 1, reason: 'بعد الترحيل' }, submit: true }), 201)
})

test('RJM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query(`SELECT [id], [title], [status], [openings] FROM [${TABLE}] ORDER BY [id]`) })
  const state = await snapshot()
  assert.equal(state.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), state)
})
