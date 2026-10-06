'use strict'
// ترحيل B2.7-ب (20261006_092) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_docack_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  DM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (أعمدة المستند الأربعة وفهرسها، وجدول الدليل) وفرقها صفر.
//  DM-2) من غير الترحيل: الإصدار العادي شغال وطلب الإقرار مرفوض برسالته، والشاشات «مش متاح»، والمهام زي ما هي؛ وجدول قديم بشكل تاني =
//        الترحيل بيقف من غير ما يلمسه ولا يزوّد أعمدة المستند؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل والفرق صفر؛ وبعده طلب الإقرار
//        والإقرار شغالين، والدليل مابيتعدلش ولا بيتمسح (المشغّل).
//  DM-3) آمن للتكرار.
// Run (من api/): node --test test/hr-document-acknowledgements-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_docack_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_docack_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-docack-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-docack-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261006_092_document_acknowledgements.sql'
const TABLES = ['hr_issued_documents', 'hr_document_acknowledgements']
const ACK_COLUMNS = ['ackRequestedAt', 'ackDueDate', 'ackTaskId', 'ackContentHash']
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, rules, template, created = false
const made = {}, users = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => {
  const out = {}
  for (const table of TABLES) {
    out[table] = {
      columns: (await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.${table}') ORDER BY c.column_id`))
        .map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]),
      indexes: (await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.${table}') AND i.name IS NOT NULL ORDER BY i.name`))
        .map(row => [row.name, row.columns, row.isUnique, row.hasFilter]),
    }
  }
  return out
}
const triggers = async () => (await ds.query(`SELECT t.name, OBJECT_NAME(t.parent_id) AS [table], t.is_instead_of_trigger AS insteadOf, t.is_disabled AS disabled
  FROM sys.triggers t WHERE t.name LIKE N'TR[_]hr[_]document%' ORDER BY t.name`)).map(row => [row.name, row.table, row.insteadOf, row.disabled])
// «قبل الترحيل»: من غير جدول الدليل ولا أعمدة الطلب وفهرسها (على القاعدة المؤقتة بس)
async function dropAckSchema() {
  assertDisposable()
  await pool.request().batch(`IF OBJECT_ID(N'dbo.hr_document_acknowledgements', N'U') IS NOT NULL DROP TABLE dbo.hr_document_acknowledgements;`)
  await pool.request().batch(`IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.hr_issued_documents') AND name = N'UX_hr_issued_documents_ack_task')
    DROP INDEX [UX_hr_issued_documents_ack_task] ON dbo.hr_issued_documents;`)
  for (const column of ACK_COLUMNS) {
    await pool.request().batch(`IF COL_LENGTH(N'dbo.hr_issued_documents', N'${column}') IS NOT NULL ALTER TABLE dbo.hr_issued_documents DROP COLUMN [${column}];`)
  }
  rules.resetDocumentAckSchemaCache()
}
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
const issue = (extra = {}) => request(users.admin, 'POST', '/hr-documents/issue',
  { templateId: template.id, revisionId: template.publishedRevision.id, values: {}, idempotencyKey: crypto.randomUUID(), employeeId: made.staff.id, ...extra })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: 'https://hr.example.invalid/' })
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
  rules = require('../src/hr-documents/document-acknowledgements')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'DM_A', name: 'فرع ترحيل الإقرار' })
  made.staff = await ds.getRepository('Employee').save({ employeeCode: 'DM001', fullName: 'موظف DM001', branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  const account = (label, extra = {}) => ds.getRepository('User').save({ email: `${label}@docack-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role: 'employee', branchId: made.branch.id, permissions: '[]', isActive: true, ...extra })
  users.admin = await account('admin', { role: 'super_admin', branchId: null, scopeAllBranches: true })
  users.staff = await account('staff', { employeeId: made.staff.id })
  await ds.getRepository('RequestsConfig').save({ key: 'company.name', value: 'شركة الاختبار — بيانات وهمية' })
  const draft = { title: 'إقرار — للاختبار', greeting: '', body: 'أقرّ أنا {{employee.fullName}} بما ورد. بيانات اختبار فقط.', closing: '', footer: '' }
  const first = expectStatus(await request(users.admin, 'POST', '/hr-documents/templates', { name: 'إقرار — اختبار الترحيل', category: 'acknowledgement', draft, customFields: [] }), 201)
  template = expectStatus(await request(users.admin, 'POST', `/hr-documents/templates/${first.id}/publish`, { version: first.version }), 201)
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-docack-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'document acknowledgement migration fixture cleanup failed')
})

test('DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261006_092: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual([...migrate.throwCodes(text)].sort((a, b) => a - b), [92001, 92002, 92003, 92004, 92005, 92006, 92010])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT)\b|\bUPDATE\s+(?:dbo\.)?\[?\w|\bDELETE\s+FROM\b/i, 'أعمدة وجدول ومشغّل جداد بس، من غير تعبئة (UPDATE وDELETE في قايمة أحداث المشغّل بس)')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  // أعمدة طلب الإقرار على جدول المستندات وفهرسها الفريد المفلتر
  assert.deepEqual(current.hr_issued_documents.columns.filter(column => ACK_COLUMNS.includes(column[0])),
    [['ackRequestedAt', 'datetime2', 8, true, false, 0], ['ackDueDate', 'date', 3, true, false, 0], ['ackTaskId', 'int', 4, true, false, 0], ['ackContentHash', 'nvarchar', 128, true, false, 0]])
  assert.deepEqual(current.hr_issued_documents.indexes.filter(index => index[0] === 'UX_hr_issued_documents_ack_task'), [['UX_hr_issued_documents_ack_task', 'ackTaskId', true, true]])
  // وجدول الدليل
  assert.deepEqual(current.hr_document_acknowledgements, {
    columns: [['id', 'int', 4, false, true, 0], ['documentId', 'int', 4, false, false, 0], ['employeeId', 'int', 4, false, false, 0], ['userId', 'int', 4, false, false, 0],
      ['acknowledgedAt', 'datetime2', 8, false, false, 0], ['contentHash', 'nvarchar', 128, false, false, 0], ['ip', 'nvarchar', 128, true, false, 0], ['userAgent', 'nvarchar', 600, true, false, 0]],
    indexes: [['PK_hr_document_acknowledgements', 'id', true, false], ['UQ_hr_document_acknowledgements_document', 'documentId', true, false]],
  })
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('DM-2: من غير الترحيل الإصدار العادي شغال وطلب الإقرار مرفوض برسالته؛ وجدول قديم بشكل تاني بيوقّف الترحيل؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده الإقرار شغال والمشغّل بيمنع تعديله', async () => {
  const synchronized = await shape()
  // الجداول موجودة (synchronize): الخاصية جاهزة، والنتيجة محفوظة لحد ما تتنسي
  assert.equal(await rules.documentAckSchemaReady(ds.manager), true)
  await dropAckSchema()
  const without = await shape()
  assert.deepEqual([without.hr_document_acknowledgements, without.hr_issued_documents.columns.filter(column => ACK_COLUMNS.includes(column[0])).length,
    without.hr_issued_documents.indexes.some(index => index[0] === 'UX_hr_issued_documents_ack_task')], [{ columns: [], indexes: [] }, 0, false])
  assert.equal(await rules.documentAckSchemaReady(ds.manager), false)

  // قبل الترحيل: الإصدار العادي والسجل والتنزيل زي ما هم، وطلب الإقرار مرفوض برسالته من غير ما يكتب حاجة
  const plain = expectStatus(await issue(), 201)
  assert.equal(plain.ack, null)
  const counts = async () => [await ds.getRepository('HrIssuedDocument').count(), await ds.getRepository('StoredFile').count(), await ds.getRepository('Task').count()]
  const before = await counts()
  const refused = await issue({ requireAck: true })
  assert.deepEqual([refused.status, messageOf(refused), await counts()], [400, rules.DOCUMENT_ACK_MIGRATION_MISSING, before])
  assert.match(rules.DOCUMENT_ACK_MIGRATION_MISSING, /20261006_092/)
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', '/hr-documents/issued'), 200).map(row => [row.id, row.ack]), [[plain.id, null]])
  expectStatus(await request(users.admin, 'GET', '/hr-documents/issued?ack=pending'), 200)
  assert.deepEqual(expectStatus(await request(users.staff, 'GET', '/hr-documents/mine/acknowledgements'), 200), { available: false, documents: [] })
  for (const [method, route, body] of [['GET', `/hr-documents/issued/${plain.id}/acknowledgement`], ['POST', `/hr-documents/issued/${plain.id}/acknowledge`, { contentHash: 'a'.repeat(64) }]]) {
    const response = await request(users.staff, method, route, body)
    assert.deepEqual([response.status, messageOf(response)], [404, 'المستند غير موجود'], route)
  }
  assert.equal((await fetch(`${http}/hr-documents/issued/${plain.id}/download`, { headers: { Authorization: `Bearer ${jwt.sign(payloadOf(users.staff))}` } })).status, 200)
  // والمهام زي ما هي: مهمة عادية بتتكلّف وبتتقفل
  const task = expectStatus(await request(users.admin, 'POST', '/tasks', { title: 'مهمة قبل الترحيل', assigneeEmployeeId: made.staff.id }), 201)
  assert.deepEqual([task.documentAck, task.documentAckId], [false, null])
  expectStatus(await request(users.staff, 'POST', `/tasks/${task.id}/status`, { status: 'DONE' }), 201)

  // جدول قديم بشكل تاني: الترحيل بيقف برسالته ومابيلمسوش ولا بيزوّد أعمدة المستند
  await pool.request().batch('CREATE TABLE dbo.hr_document_acknowledgements ([id] int NOT NULL, [name] nvarchar(50) NULL);')
  await assert.rejects(runFile(FILE), /20261006_092: جدول hr_document_acknowledgements موجود وأعمدته مش أعمدة الإقرار الـ8/)
  assert.deepEqual((await ds.query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.hr_document_acknowledgements') ORDER BY c.column_id`)).map(row => row.name), ['id', 'name'])
  assert.equal((await ds.query(`SELECT COL_LENGTH(N'dbo.hr_issued_documents', N'ackTaskId') AS [length]`))[0].length, null)
  // والخاصية لسه مش متاحة: جدول بالاسم ده من غير أعمدة الطلب
  const refusedHalf = async label => {
    rules.resetDocumentAckSchemaCache()
    assert.equal(await rules.documentAckSchemaReady(ds.manager), false, label)
    const response = await issue({ requireAck: true })
    assert.deepEqual([response.status, messageOf(response)], [400, rules.DOCUMENT_ACK_MIGRATION_MISSING], label)
  }
  await refusedHalf('جدول من غير أعمدة')
  await dropAckSchema()
  // وأعمدة الطلب من غير جدول الدليل (ترحيل وقف في النص): لسه مش متاحة
  for (const [column, type] of [['ackRequestedAt', 'datetime2'], ['ackDueDate', 'date'], ['ackTaskId', 'int'], ['ackContentHash', 'nvarchar(64)']]) {
    await pool.request().batch(`ALTER TABLE dbo.hr_issued_documents ADD [${column}] ${type} NULL;`)
  }
  await refusedHalf('أعمدة من غير جدول')
  await dropAckSchema()
  // الخادم شغال ونتيجة «مش جاهز» محفوظة عنده قبل الترحيل
  assert.equal(await rules.documentAckSchemaReady(ds.manager), false)

  const record = await migrate.apply({ database, base, trial: true, schemaDiff: false, quiet: true })
  assert.equal(record.mode, 'disposable')
  assert.equal(record.failed, undefined, JSON.stringify(record.failed))
  assert.equal(record.trial?.passed, true)
  assert.deepEqual(record.applied.map(item => path.basename(item.file)), [FILE])
  assert.equal(record.ledgerComplete, true)
  assert.deepEqual(record.columns.removedOrRenamed, [])
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual(await triggers(), [['TR_hr_document_acknowledgements_append_only', 'hr_document_acknowledgements', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  const plan = await migrate.plan({ database, base })
  assert.equal(plan.readOnly, true); assert.equal(plan.pendingCount, 0); assert.deepEqual(plan.problems, [])
  assert.equal(plan.schemaDiffCount, 0, JSON.stringify(plan.schemaDiff))

  // بعد الترحيل والخادم شغال: الخاصية بتشتغل من غير إعادة تشغيل ومن غير مهلة — «مش جاهز» اللي العملية شافتها قبل الترحيل مابتتحفظش
  // (Codex CRP2N-B01: نتيجة سلبية محفوظة دقيقة كانت بتخلّي عملية قديمة تعامل مهمة إقرار فتحتها عملية تانية كمهمة عادية)
  assert.equal(await rules.documentAckSchemaReady(ds.manager), true)
  // طلب الإقرار بيتسجّل بمهمته، والموظف بيقرّ، والمستند القديم (قبل الترحيل) من غير طلب
  const sent = expectStatus(await issue({ requireAck: true }), 201)
  assert.deepEqual([sent.ack.state, expectStatus(await request(users.admin, 'GET', '/hr-documents/issued'), 200).map(row => [row.id, row.ack?.state ?? null])],
    ['PENDING', [[sent.id, 'PENDING'], [plain.id, null]]])
  // والعملية دي — اللي شافت المخطط ناقص قبل الترحيل — مابتقفلش مهمة الإقرار من غير إقرار ولا بتعدّلها
  const [{ ackTaskId }] = await ds.query('SELECT [ackTaskId] FROM [hr_issued_documents] WHERE [id] = @0', [sent.id])
  const BLOCKED = 'دي مهمة إقرار مستند: بتتقفل لوحدها لما الموظف يقرّ بيه من «مستنداتي»، ومابتتعدلش ولا بتتلغي من هنا'
  for (const [user, method, route, body] of [[users.staff, 'POST', `/tasks/${ackTaskId}/status`, { status: 'DONE' }], [users.admin, 'PATCH', `/tasks/${ackTaskId}`, { title: 'عنوان تاني' }]]) {
    const refused = await request(user, method, route, body)
    assert.deepEqual([refused.status, messageOf(refused)], [400, BLOCKED], `${method} ${route}`)
  }
  assert.deepEqual((({ status, title }) => [status, title])(await ds.getRepository('Task').findOneByOrFail({ id: ackTaskId })), ['OPEN', 'إقرار مستند'])
  const read = expectStatus(await request(users.staff, 'GET', `/hr-documents/issued/${sent.id}/acknowledgement`), 200)
  expectStatus(await request(users.staff, 'POST', `/hr-documents/issued/${sent.id}/acknowledge`, { contentHash: read.contentHash }), 201)
  // والدليل مابيتعدلش ولا بيتمسح من القاعدة نفسها
  await assert.rejects(pool.request().query(`UPDATE dbo.hr_document_acknowledgements SET [contentHash] = N'تلاعب' WHERE [documentId] = ${Number(sent.id)}`), /92010|إضافة بس/)
  await assert.rejects(pool.request().query(`DELETE FROM dbo.hr_document_acknowledgements WHERE [documentId] = ${Number(sent.id)}`), /92010|إضافة بس/)
  assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [hr_document_acknowledgements] WHERE [documentId] = @0 AND [contentHash] = @1', [sent.id, read.contentHash]))[0].n), 1)
  // والمهمة الواحدة مهمة إقرار مستند واحد (الفهرس الفريد المفلتر)، والمستندات من غير طلب مش داخلة فيه
  const taskId = (await ds.query('SELECT [ackTaskId] FROM [hr_issued_documents] WHERE [id] = @0', [sent.id]))[0].ackTaskId
  await assert.rejects(pool.request().query(`UPDATE dbo.hr_issued_documents SET [ackTaskId] = ${Number(taskId)} WHERE [id] = ${Number(plain.id)}`), /UX_hr_issued_documents_ack_task/)
  expectStatus(await issue(), 201)
})

test('DM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), triggers: await triggers(),
    documents: await ds.query('SELECT [id], [ackTaskId], [ackContentHash] FROM [hr_issued_documents] ORDER BY [id]'),
    acknowledgements: await ds.query('SELECT [id], [documentId], [employeeId], [contentHash] FROM [hr_document_acknowledgements] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual([before.documents.length, before.acknowledgements.length], [3, 1])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
