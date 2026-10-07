'use strict'
// ترحيل B2.16-أ (20261007_100) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_announcements_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  ANM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//         بنفس الشكل (أعمدة الجدولين ومفاتيحهم والفهرس الفريد) وفرقها صفر.
//  ANM-2) من غير الجدولين: اللوحة فاضية، والإدارة بتقول إن الترحيل ناقص وكتابتها مرفوضة برسالته، ومفيش إشعار إعلان؛ وجدول أو فهرس
//         قديم بنفس الاسم وبشكل تاني = الترحيل بيقف قبل أي تغيير؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدولين بنفس الشكل والفرق صفر،
//         وبعده — من غير إعادة تشغيل — الإعلان بيتكتب ويتنشر.
//  ANM-3) آمن للتكرار.
// Run (من api/): node --test test/announcements-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_announcements_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_announcements_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-announcements-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-announcements-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261007_100_announcements.sql'
const TABLES = ['announcements', 'announcement_reads']
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, service, admin, reader, created = false

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
const shape = async () => ({ announcements: await shapeOf('announcements'), reads: await shapeOf('announcement_reads') })
const EMPTY = { columns: [], indexes: [] }, NO_SHAPE = { announcements: EMPTY, reads: EMPTY }
// «قبل الترحيل»: الجدولين مش موجودين (على القاعدة المؤقتة بس)
const dropTables = () => { assertDisposable(); return pool.request().batch(TABLES.map(table => `IF OBJECT_ID(N'dbo.${table}', N'U') IS NOT NULL DROP TABLE dbo.${table};`).join('\n')) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(http + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
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
  rules = require('../src/announcements/announcement-rules')
  service = app.get(require('../src/announcements/announcements.service').AnnouncementsService)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  const branch = await ds.getRepository('Branch').save({ code: 'ANM_A', name: 'فرع ترحيل الإعلانات', country: 'SA' })
  const employee = await ds.getRepository('Employee').save({ employeeCode: 'ANM001', fullName: 'موظف ترحيل الإعلانات', branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01' })
  admin = await ds.getRepository('User').save({ email: 'admin@announcements-migration.invalid', displayName: 'مدير ترحيل الإعلانات', passwordHash: 'test-only',
    role: 'super_admin', permissions: '["*"]', isActive: true })
  reader = await ds.getRepository('User').save({ email: 'reader@announcements-migration.invalid', displayName: 'قارئ ترحيل الإعلانات', passwordHash: 'test-only',
    role: 'employee', permissions: '[]', isActive: true, branchId: branch.id, employeeId: employee.id })
  // الموديول مقفول افتراضيًا: بيتفتح عشان المسارات تتجرّب قبل الترحيل وبعده
  expectStatus(await request(admin, 'PUT', '/modules/announcements', { enabled: true }), 200)
  app.get(require('../src/modules-registry/modules.service').ModulesService).invalidate()
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-announcements-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'announcements migration fixture cleanup failed')
})

test('ANM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261007_100: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [100001, 100002, 100003, 100004, 100005, 100006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدولين جداد بس')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  const column = (name, type, length, nullable = false, identity = false) => [name, type, length, nullable, identity, 0, false]
  assert.deepEqual(current.announcements.columns, [column('id', 'int', 4, false, true), column('title', 'nvarchar', 400), column('body', 'nvarchar', 8000),
    column('audience', 'nvarchar', 4000, true), column('publishDate', 'date', 3), column('expiryDate', 'date', 3, true), column('pinned', 'bit', 1), column('requiresRead', 'bit', 1),
    column('status', 'nvarchar', 40), column('createdByUserId', 'int', 4), column('createdAt', 'datetime2', 8), column('publishedAt', 'datetime2', 8, true)])
  assert.deepEqual(current.announcements.indexes, [['PK_announcements', 'id', true, true, false]])
  assert.deepEqual(current.reads.columns, [column('id', 'int', 4, false, true), column('announcementId', 'int', 4), column('employeeId', 'int', 4), column('userId', 'int', 4),
    column('readAt', 'datetime2', 8)])
  assert.deepEqual(current.reads.indexes, [['PK_announcement_reads', 'id', true, true, false], ['UX_announcement_reads_announcement_employee', 'announcementId,employeeId', true, false, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  // الجدولين اللي synchronize عملهم بيعدّوا تحقق الترحيل الكامل (قبل وبعد)، والترحيل مابيغيّرش فيهم حاجة
  await runFile(FILE)
  assert.deepEqual(await shape(), current)
  assert.match(rules.ANNOUNCEMENTS_MIGRATION_MISSING, /20261007_100/)
})

test('ANM-2: من غير الجدولين اللوحة فاضية والإدارة بتقول الترحيل ناقص؛ وجدول بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر', async () => {
  const synchronized = await shape()
  await dropTables()
  rules.resetAnnouncementsCache()
  assert.deepEqual(await shape(), NO_SHAPE)
  assert.equal(await rules.announcementsReady(ds.manager), false)
  const MISSING = rules.ANNOUNCEMENTS_MIGRATION_MISSING
  const body = { title: 'إعلان قبل الترحيل', body: 'نص الإعلان' }

  // قبل الترحيل: اللوحة فاضية (والشاشة شغالة)، والإدارة بتقول إن الترحيل ناقص، والكتابة برسالته، ومحرك الإشعارات مابيلاقيش إعلان
  assert.deepEqual(expectStatus(await request(reader, 'GET', '/announcements/board'), 200), { available: false, items: [] })
  assert.deepEqual(expectStatus(await request(admin, 'GET', '/announcements'), 200), { available: false, message: MISSING, items: [] })
  for (const [user, method, route, payload] of [[admin, 'POST', '/announcements', body], [admin, 'PATCH', '/announcements/1', { title: 'عنوان' }], [admin, 'POST', '/announcements/1/publish'],
    [admin, 'POST', '/announcements/1/withdraw'], [admin, 'GET', '/announcements/1/report'], [reader, 'POST', '/announcements/1/read']]) {
    assert.deepEqual(answer(await request(user, method, route, payload)), [400, MISSING], `${method} ${route}`)
  }
  assert.equal(await service.liveAudienceAccounts(1), null)
  assert.equal(await service.liveFor(payloadOf(reader), 1), null)
  assert.deepEqual([...(await service.liveIdsFor(payloadOf(reader), [1, 2]))], [])
  // قايمة الإشعارات شغالة من غير الجدولين
  expectStatus(await request(reader, 'GET', '/notifications'), 200)
  assert.equal(await rules.announcementsReady(ds.manager), false)

  // جدول أو فهرس قديم بنفس الاسم وبشكل تاني: الترحيل بيقف برسالته قبل أي تغيير
  const objects = async () => ({ ...(await shape()), tables: (await ds.query(`SELECT [name] FROM sys.tables WHERE [name] IN (N'announcements', N'announcement_reads') ORDER BY [name]`)).map(row => row.name) })
  const refused = async (setup, message) => {
    await dropTables()
    for (const statement of [].concat(setup)) await pool.request().batch(statement)
    const before = await objects()
    await assert.rejects(runFile(FILE), message, [].concat(setup).join(' ').slice(0, 200))
    assert.deepEqual(await objects(), before, `الترحيل المرفوض مالمسش حاجة: ${[].concat(setup).join(' ').slice(0, 160)}`)
  }
  const MAIN = { id: 'int IDENTITY(1,1) NOT NULL', title: 'nvarchar(200) NOT NULL', body: 'nvarchar(4000) NOT NULL', audience: 'nvarchar(2000) NULL', publishDate: 'date NOT NULL',
    expiryDate: 'date NULL', pinned: 'bit NOT NULL', requiresRead: 'bit NOT NULL', status: 'nvarchar(20) NOT NULL', createdByUserId: 'int NOT NULL', createdAt: 'datetime2 NOT NULL',
    publishedAt: 'datetime2 NULL' }
  const READS = { id: 'int IDENTITY(1,1) NOT NULL', announcementId: 'int NOT NULL', employeeId: 'int NOT NULL', userId: 'int NOT NULL', readAt: 'datetime2 NOT NULL' }
  // الجدول بتغيير واحد: تعريف عمود، أو عمود ناقص (omit)، أو عمود زيادة (extra)، أو المفتاح (pk: الاسم، key: أعمدته — null = من غير مفتاح)
  const table = (name, definitions, changes = {}) => `CREATE TABLE dbo.${name} (${Object.keys(definitions).filter(key => key !== changes.omit).map(key => `[${key}] ${changes[key] ?? definitions[key]}`).join(', ')}${changes.extra ?? ''}${
    changes.key === null ? '' : `, CONSTRAINT [${changes.pk ?? `PK_${name}`}] PRIMARY KEY (${changes.key ?? '[id]'})`});`
  const main = changes => table('announcements', MAIN, changes), readsTable = changes => table('announcement_reads', READS, changes)
  const MAIN_SHAPE = /20261007_100: جدول announcements موجود وشكله مش شكل الإعلانات/
  const READS_SHAPE = /20261007_100: جدول announcement_reads موجود وشكله مش شكل قراءات الإعلانات/
  await refused(`CREATE TABLE dbo.announcements ([id] int NOT NULL, [text] nvarchar(50) NULL);`, MAIN_SHAPE)
  for (const changes of [{ title: 'varchar(200) NOT NULL' }, { title: 'nvarchar(300) NOT NULL' }, { body: 'nvarchar(max) NOT NULL' }, { audience: 'nvarchar(2000) NOT NULL' },
    { publishDate: 'datetime NOT NULL' }, { expiryDate: 'date NOT NULL' }, { pinned: 'int NOT NULL' }, { requiresRead: 'bit NULL' }, { status: 'nvarchar(10) NOT NULL' },
    { status: "nvarchar(20) NOT NULL CONSTRAINT [DF_anm_status] DEFAULT N'DRAFT'" }, { createdByUserId: 'bigint NOT NULL' }, { createdAt: 'datetime2(3) NOT NULL' },
    { publishedAt: 'datetime2 NOT NULL' }, { id: 'int NOT NULL' }, { title: "AS (CAST(N'x' AS nvarchar(200)))" }, { extra: ', [attachmentId] int NULL' }, { omit: 'pinned' },
    { pk: 'PK_other_name' }, { key: '[createdByUserId]' }, { key: '[id], [createdByUserId]' }, { key: null }]) {
    await refused(main(changes), MAIN_SHAPE)
  }
  await refused([main(), `CREATE TABLE dbo.announcement_reads ([id] int NOT NULL, [note] nvarchar(50) NULL);`], READS_SHAPE)
  for (const changes of [{ announcementId: 'bigint NOT NULL' }, { employeeId: 'int NULL' }, { userId: 'nvarchar(20) NOT NULL' }, { readAt: 'datetime NOT NULL' }, { readAt: 'datetime2 NULL' },
    { id: 'int NOT NULL' }, { extra: ', [device] nvarchar(50) NULL' }, { omit: 'userId' }, { pk: 'PK_reads_other' }, { key: '[announcementId]' }, { key: null }]) {
    await refused([main(), readsTable(changes)], READS_SHAPE)
  }
  // جدولين سليمين وفهرس بنفس الاسم: بترتيب معكوس، أو على عمود واحد، أو مش فريد، أو بعمود زيادة، أو بعمود مضمّن، أو بفلتر
  const INDEX = /20261007_100: فهرس UX_announcement_reads_announcement_employee موجود ومش فريد على الإعلان والموظف بالترتيب/
  const UX = 'UX_announcement_reads_announcement_employee'
  for (const definition of [`UNIQUE INDEX [${UX}] ON dbo.announcement_reads ([employeeId], [announcementId])`, `UNIQUE INDEX [${UX}] ON dbo.announcement_reads ([announcementId])`,
    `INDEX [${UX}] ON dbo.announcement_reads ([announcementId], [employeeId])`, `UNIQUE INDEX [${UX}] ON dbo.announcement_reads ([announcementId], [employeeId], [userId])`,
    `UNIQUE INDEX [${UX}] ON dbo.announcement_reads ([announcementId], [employeeId]) INCLUDE ([readAt])`,
    `UNIQUE INDEX [${UX}] ON dbo.announcement_reads ([announcementId], [employeeId]) WHERE [employeeId] > 0`]) {
    await refused([main(), readsTable(), `CREATE ${definition};`], INDEX)
  }
  // وجدول واحد سليم موجود (أو الاتنين من غير الفهرس): الترحيل بيكمّل الناقص بس
  await dropTables()
  await pool.request().batch(main())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدول السليم الموجود اتكمّل بجدول القراءات وفهرسه')
  await dropTables()
  await pool.request().batch(main()); await pool.request().batch(readsTable())
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'الجدولين السليمين اتكمّلوا بالفهرس')
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

  // بعد الترحيل والخادم شغال (من غير إعادة تشغيل): من غير تعبئة رجعية، والإعلان بيتكتب ويتنشر ويتقري
  assert.equal(await rules.announcementsReady(ds.manager), true)
  for (const name of TABLES) assert.deepEqual(await ds.query(`SELECT COUNT(*) AS [n] FROM [${name}]`), [{ n: 0 }])
  const made = expectStatus(await request(admin, 'POST', '/announcements', body), 201)
  expectStatus(await request(admin, 'POST', `/announcements/${made.id}/publish`), 201)
  const board = expectStatus(await request(reader, 'GET', '/announcements/board'), 200)
  assert.deepEqual([board.available, board.items.map(item => [item.id, item.title, item.read])], [true, [[made.id, body.title, false]]])
  expectStatus(await request(reader, 'POST', `/announcements/${made.id}/read`), 201)
  const listed = expectStatus(await request(admin, 'GET', '/announcements'), 200)
  assert.deepEqual([listed.available, listed.message, listed.items.map(item => [item.id, item.status])], [true, null, [[made.id, 'PUBLISHED']]])
})

test('ANM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query('SELECT [id], [title], [status] FROM [announcements] ORDER BY [id]'),
    reads: await ds.query('SELECT [announcementId], [employeeId], [userId] FROM [announcement_reads] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual([before.rows.length, before.reads.length], [1, 1])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
