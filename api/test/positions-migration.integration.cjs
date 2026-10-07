'use strict'
// ترحيل B2.11 (20261007_097) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_positions_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  PSM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدولين ومفاتيحهم وفهرس الشاغلين) وفرقها صفر، وجدول الموظفين ماتزودش عليه عمود.
//  PSM-2) من غير الجدولين والموديول مفعّل: الشاشة بتقول إن الترحيل ناقص، والكتابة مرفوضة برسالته، والتعيين زي ما هو (حتى والإنفاذ مفعّل)؛
//         وجدول أو فهرس قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدولين بنفس الشكل
//         والفرق صفر، وبعده — من غير إعادة تشغيل — الوظائف شغالة.
//  PSM-3) آمن للتكرار.
// Run (من api/): node --test test/positions-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { requiredEmployeeFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_positions_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_positions_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-positions-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-positions-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_097_approved_positions.sql'
const POSITIONS = 'positions', HOLDERS = 'position_holders'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, modules, created = false
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
const shape = async () => ({ positions: await shapeOf(POSITIONS), holders: await shapeOf(HOLDERS) })
const NO_SHAPE = { positions: { columns: [], indexes: [] }, holders: { columns: [], indexes: [] } }
// «قبل الترحيل»: الجدولين مش موجودين (على القاعدة المؤقتة بس)
const dropTables = () => { assertDisposable(); return pool.request().batch(`IF OBJECT_ID(N'dbo.${HOLDERS}', N'U') IS NOT NULL DROP TABLE dbo.${HOLDERS}; IF OBJECT_ID(N'dbo.${POSITIONS}', N'U') IS NOT NULL DROP TABLE dbo.${POSITIONS};`) }
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
const employeesColumns = async () => Number((await ds.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.employees', N'U')`))[0].n)
const hire = extra => request(users.hr, 'POST', '/employees', { ...requiredEmployeeFields({ jobTitle: 'محاسب' }), fullName: 'معيّن الترحيل', joinDate: '2026-10-01', branchId: made.branch.id,
  departmentId: made.department.id, basicSalary: 5000, ...extra })

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
  rules = require('../src/positions/position-rules')
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'PSM_A', name: 'فرع ترحيل الوظائف', country: 'SA' })
  made.department = await ds.getRepository('Department').save({ name: 'قسم ترحيل الوظائف', code: 'PSM_D', branchId: made.branch.id })
  made.title = await ds.getRepository('JobTitle').save({ title: 'محاسب', isActive: true })
  const account = (label, role, permissions, extra = {}) => ds.getRepository('User').save({ email: `${label}@positions-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role, branchId: made.branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.hr = await account('hr', 'employee', ['positions.view', 'positions.manage', 'employees.create'])
  expectStatus(await request(users.admin, 'PUT', '/modules/positions', { enabled: true }), 200)
  modules.invalidate()
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-positions-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'positions migration fixture cleanup failed')
})

test('PSM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر، وجدول الموظفين زي ما هو', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_097: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [97001, 97002, 97003, 97004, 97005, 97006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدولين جداد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const int = (name, nullable = false, identity = false) => [name, 'int', 4, nullable, identity, 0, false]
  assert.deepEqual(current.positions.columns, [int('id', false, true), int('jobTitleId'), int('gradeId', true), int('branchId'), int('departmentId', true), int('teamId', true),
    int('costCenterId', true), int('headcount'), ['status', 'nvarchar', 40, false, false, 0, false], ['budget', 'decimal', 9, true, false, 0, false], ['createdAt', 'datetime2', 8, false, false, 0, false]])
  assert.deepEqual(current.positions.indexes, [['PK_positions', 'id', true, true, false]])
  assert.deepEqual(current.holders.columns, [int('employeeId'), int('positionId'), int('assignedByUserId'), ['assignedAt', 'datetime2', 8, false, false, 0, false]])
  assert.deepEqual(current.holders.indexes, [['PK_position_holders', 'employeeId', true, true, false], ['UX_position_holders_position', 'positionId,employeeId', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدولين اللي synchronize عملهم بيعدّوا تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيهم حاجة — ولا في جدول الموظفين
  const employeeColumns = await employeesColumns()
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.equal(await employeesColumns(), employeeColumns, 'ربط الموظف بوظيفته في جدوله، مش عمود على employees')
  assert.match(rules.POSITIONS_MIGRATION_MISSING, /20261007_097/)
})

test('PSM-2: من غير الجدولين الشاشة بتقول الترحيل ناقص والتعيين زي ما هو؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الوظائف شغالة', async () => {
  const synchronized = await shape()
  await dropTables()
  rules.resetPositionsCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.positionsReady(ds.manager), false)
  const MISSING = rules.POSITIONS_MIGRATION_MISSING
  const body = { jobTitleId: made.title.id, branchId: made.branch.id, departmentId: made.department.id, headcount: 2 }

  // قبل الترحيل والموديول مفعّل: الشاشة بتقول إن الترحيل ناقص، والكتابة والتوليد برسالته
  assert.deepEqual(expectStatus(await request(users.hr, 'GET', '/positions'), 200), { available: false, message: MISSING, canManage: true, enforce: false, positions: [], summary: [] })
  assert.deepEqual(expectStatus(await request(users.hr, 'GET', `/positions/options?branchId=${made.branch.id}`), 200), { available: false, enforce: false, positions: [] })
  for (const [method, route, payload] of [['POST', '/positions', body], ['GET', '/positions/1'], ['PATCH', '/positions/1', { headcount: 3 }], ['POST', '/positions/1/holders', { employeeId: 1 }],
    ['DELETE', '/positions/1/holders/1'], ['GET', '/positions/generate'], ['POST', '/positions/generate']]) {
    assert.deepEqual(answer(await request(users.hr, method, route, payload)), [400, MISSING], `${method} ${route}`)
  }
  // والتعيين زي ما هو: خانة الوظيفة بتتجاهل. والإنفاذ مفعّل والجدولين مش موجودين: التعيين مرفوض برسالة الترحيل (حالة مش معروفة
  // بتقفل) ومفيش موظف بيتعمل
  const plain = expectStatus(await hire({ positionId: 77 }), 201)
  expectStatus(await request(users.admin, 'PUT', '/modules/features/positions.enforce_on_hiring', { enabled: true }), 200)
  modules.invalidate()
  try {
    const employees = Number((await ds.query('SELECT COUNT(*) AS [n] FROM [employees]'))[0].n)
    assert.deepEqual(answer(await hire()), [400, MISSING])
    assert.deepEqual(answer(await hire({ positionId: 77 })), [400, MISSING])
    assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [employees]'))[0].n), employees)
  } finally {
    expectStatus(await request(users.admin, 'PUT', '/modules/features/positions.enforce_on_hiring', { enabled: false }), 200)
    modules.invalidate()
  }
  assert.equal(await rules.positionsReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] IN (N'${POSITIONS}', N'${HOLDERS}') ORDER BY [name]`)).map(row => row.name) })
  const POSITIONS_SHAPE = /20261007_097: جدول positions موجود وشكله مش شكل الوظائف المعتمدة/
  const refused = async (setup, message = POSITIONS_SHAPE) => {
    await dropTables()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const before = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), before, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const DEFINITIONS = { id: 'int IDENTITY(1,1) NOT NULL', jobTitleId: 'int NOT NULL', gradeId: 'int NULL', branchId: 'int NOT NULL', departmentId: 'int NULL', teamId: 'int NULL', costCenterId: 'int NULL',
    headcount: 'int NOT NULL', status: 'nvarchar(20) NOT NULL', budget: 'decimal(18,2) NULL', createdAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (changes = {}) => `CREATE TABLE dbo.${POSITIONS} (${Object.keys(DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? DEFINITIONS[name]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? 'PK_positions'}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  await refused(`CREATE TABLE dbo.${POSITIONS} ([id] int NOT NULL, [name] nvarchar(50) NULL);`)
  // عمود واحد بنوع أو طول أو دقة أو مقياس أو إلزام غلط، أو بافتراضي، أو من غير هوية، أو محسوب
  for (const changes of [{ status: 'varchar(40) NOT NULL' }, { status: 'nvarchar(50) NOT NULL' }, { status: 'nvarchar(max) NOT NULL' }, { budget: 'decimal(18,4) NULL' }, { budget: 'decimal(12,2) NULL' },
    { budget: 'decimal(18,2) NOT NULL' }, { budget: 'money NULL' }, { gradeId: 'int NOT NULL' }, { headcount: 'int NULL' }, { headcount: 'bigint NOT NULL' }, { createdAt: 'datetime2(3) NOT NULL' },
    { createdAt: 'datetime NOT NULL' }, { headcount: 'int NOT NULL CONSTRAINT [DF_psm_headcount] DEFAULT 1' }, { id: 'int NOT NULL' }, { teamId: 'AS (CAST(NULL AS int))' },
    // عمود زيادة، أو عمود ناقص
    { extra: ', [code] nvarchar(30) NULL' }, { omit: 'costCenterId' },
    // المفتاح باسم تاني، أو على عمود تاني، أو بعمود زيادة، أو من غير مفتاح
    { pk: 'PK_other_name' }, { key: '[jobTitleId]' }, { key: '[id], [branchId]' }, { key: null }]) {
    await refused(table(changes))
  }
  // وفهرس فريد بنفس اسم المفتاح مش مفتاح
  await refused([table({ key: null }), `CREATE UNIQUE INDEX [PK_positions] ON dbo.${POSITIONS} ([id]);`])

  // نفس الفحص لجدول الشاغلين
  const HOLDER_DEFINITIONS = { employeeId: 'int NOT NULL', positionId: 'int NOT NULL', assignedByUserId: 'int NOT NULL', assignedAt: 'datetime2 NOT NULL' }
  const holdersTable = (changes = {}) => `CREATE TABLE dbo.${HOLDERS} (${Object.keys(HOLDER_DEFINITIONS).filter(name => name !== changes.omit).map(name => `[${name}] ${changes[name] ?? HOLDER_DEFINITIONS[name]}`).join(', ')}${
    changes.extra ?? ''}, CONSTRAINT [${changes.pk ?? 'PK_position_holders'}] PRIMARY KEY (${changes.key ?? '[employeeId]'}));`
  const HOLDERS_SHAPE = /20261007_097: جدول position_holders موجود وشكله مش شكل ربط الموظف بوظيفته/
  for (const changes of [{ positionId: 'int NULL' }, { positionId: 'bigint NOT NULL' }, { assignedAt: 'datetime2(3) NOT NULL' }, { assignedAt: 'datetime NOT NULL' },
    { assignedByUserId: 'int NOT NULL CONSTRAINT [DF_psm_assigned_by] DEFAULT 0' }, { employeeId: 'int IDENTITY(1,1) NOT NULL' }, { extra: ', [note] nvarchar(50) NULL' }, { omit: 'assignedByUserId' },
    { pk: 'PK_other_holders' }, { key: '[positionId]' }, { key: '[employeeId], [positionId]' }]) {
    await refused(holdersTable(changes), HOLDERS_SHAPE)
  }
  // جدول شاغلين سليم وفهرس بنفس الاسم: بترتيب معكوس، أو على عمود واحد، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const HOLDERS_INDEX = /20261007_097: فهرس UX_position_holders_position موجود ومش فريد على الوظيفة والموظف بالترتيب/
  for (const definition of [`UNIQUE INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([employeeId], [positionId])`, `UNIQUE INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([employeeId])`,
    `INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([positionId], [employeeId])`, `UNIQUE INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([positionId], [employeeId], [assignedByUserId])`,
    `UNIQUE INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([positionId], [employeeId]) INCLUDE ([assignedAt])`,
    `UNIQUE INDEX [UX_position_holders_position] ON dbo.${HOLDERS} ([positionId], [employeeId]) WHERE [assignedByUserId] > 0`]) {
    await refused([holdersTable(), `CREATE ${definition};`], HOLDERS_INDEX)
  }
  // وجدولين سليمين موجودين من غير فهرس الشاغلين: الترحيل بيكمّل الناقص بس
  await dropTables()
  await pool.request().batch(table())
  // جدول واحد من الاتنين: الترحيل لسه ناقص
  rules.resetPositionsCache()
  assert.equal(await rules.positionsReady(ds.manager), false, 'جدول الوظائف من غير جدول الشاغلين = لسه ناقص')
  await pool.request().batch(holdersTable())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدولين السليمين الموجودين اتكمّلوا بفهرس الشاغلين')
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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل ولا مهلة): من غير تعبئة رجعية، والوظائف شغالة
  assert.equal(await rules.positionsReady(ds.manager), true)
  assert.deepEqual(await ds.query(`SELECT (SELECT COUNT(*) FROM [${POSITIONS}]) AS [positions], (SELECT COUNT(*) FROM [${HOLDERS}]) AS [holders]`), [{ positions: 0, holders: 0 }])
  const listed = expectStatus(await request(users.hr, 'GET', '/positions'), 200)
  // موظف واحد من غير وظيفة: اللي اتعيّن قبل الترحيل من غير الإنفاذ (تعيين الإنفاذ اترفض)
  assert.deepEqual([listed.available, listed.positions, listed.summary.map(line => [line.departmentId, line.approved, line.unassigned])], [true, [], [[made.department.id, 0, 1]]])
  const position = expectStatus(await request(users.hr, 'POST', '/positions', body), 201)
  const hired = expectStatus(await hire({ positionId: position.id }), 201)
  expectStatus(await request(users.hr, 'POST', `/positions/${position.id}/holders`, { employeeId: plain.id }), 201)
  const now = expectStatus(await request(users.hr, 'GET', `/positions/${position.id}`), 200)
  assert.deepEqual([now.approved, now.occupied, now.vacant, now.holders.map(row => row.employeeId).sort((a, b) => a - b)], [2, 2, 0, [plain.id, hired.id].sort((a, b) => a - b)])
  made.position = position.id
})

test('PSM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), positions: await ds.query(`SELECT [id], [jobTitleId], [branchId], [departmentId], [headcount], [status] FROM [${POSITIONS}] ORDER BY [id]`),
    holders: await ds.query(`SELECT [employeeId], [positionId], [assignedByUserId] FROM [${HOLDERS}] ORDER BY [employeeId]`) })
  const before = await snapshot()
  assert.deepEqual([before.positions.length, before.holders.length], [1, 2])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
