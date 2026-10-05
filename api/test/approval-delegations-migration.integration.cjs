'use strict'
// ترحيل B2.6-ب (20261005_090) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_delegation_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  DM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الجدول بأعمدته وفهارسه، وعمود «بالنيابة عن») وفرقها صفر.
//  DM-2) من غير الجدول والعمود: التفويض مرفوض برسالة والقايمة «مش متاح»، والصندوق والقرار والبريد والتصعيد شغالين زي الأول؛ وجدول
//        قديم بشكل تاني أو عمود بنوع تاني = الترحيل بيقف من غير ما يلمسهم؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل والفرق صفر،
//        وبعده التفويض بيتسجّل وقرار البديل بيتكتب «بالنيابة عن».
//  DM-3) آمن للتكرار.
// Run (من api/): node --test test/approval-delegations-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_delegation_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_delegation_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-delegation-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-delegation-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261005_090_approval_delegations.sql'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, delegations, requests, queue, created = false
const made = {}, users = {}, mailbox = { sent: [] }

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity, c.default_object_id AS defaultId
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.approval_delegations') ORDER BY c.column_id`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.approval_delegations') AND i.name IS NOT NULL ORDER BY i.name`),
  onBehalf: await ds.query(`SELECT t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.default_object_id AS defaultId
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.request_approvals') AND c.name = N'onBehalfOfEmployeeId'`),
})
// «قبل الترحيل»: الجدول والعمود مش موجودين (على القاعدة المؤقتة بس)
async function dropDelegationSchema() {
  assertDisposable()
  await pool.request().batch(`IF OBJECT_ID(N'dbo.approval_delegations', N'U') IS NOT NULL DROP TABLE dbo.approval_delegations;`)
  await pool.request().batch(`IF COL_LENGTH(N'dbo.request_approvals', N'onBehalfOfEmployeeId') IS NOT NULL ALTER TABLE dbo.request_approvals DROP COLUMN [onBehalfOfEmployeeId];`)
  delegations.resetDelegationSchemaCache()
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
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const submit = async () => expectStatus(await request(users.worker, 'POST', '/requests', { typeCode: made.type.code, payload: { reason: 'طلب للاختبار' }, submit: true }), 201)
const inboxIds = async user => expectStatus(await request(user, 'GET', '/requests/inbox'), 200).map(row => row.id)
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}

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
  mail.isConfigured = () => true
  mail.send = async message => {
    mailbox.sent.push(message)
    return { accepted: [message.to], rejected: [], messageId: `test-${mailbox.sent.length}`, response: '250 OK (test)' }
  }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  http = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  delegations = require('../src/requests/approval-delegations')
  requests = app.get(require('../src/requests/requests.service').RequestsService)
  queue = app.get(require('../src/queue/queue.service').QueueService)
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'DM_A', name: 'فرع ترحيل التفويض' })
  const employee = (code, extra = {}) => ds.getRepository('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
  made.manager = await employee('DM001')
  made.worker = await employee('DM002', { managerEmployeeId: made.manager.id })
  made.deputy = await employee('DM003')
  const account = (label, employeeId, extra = {}) => ds.getRepository('User').save({ email: `${label}@delegation-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role: 'employee', branchId: made.branch.id, permissions: '[]', isActive: true, employeeId, ...extra })
  users.manager = await account('manager', made.manager.id)
  users.worker = await account('worker', made.worker.id)
  users.deputy = await account('deputy', made.deputy.id)
  const chain = await ds.getRepository('ApprovalChain').save({ code: 'CHAIN_DM', nameAr: 'سلسلة ترحيل التفويض', isActive: true, autoApprove: false })
  await ds.getRepository('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'hr' })
  made.type = await ds.getRepository('RequestType').save({ code: 'DM_PLAIN', nameAr: 'طلب عادي', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-delegation-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'delegation migration fixture cleanup failed')
})

test('DM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261005_090: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [90001, 90002, 90003, 90004])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول وعمود جداد بس، من غير تعبئة')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.columns.map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity, row.defaultId]), [
    ['id', 'int', 4, false, true, 0], ['delegatorEmployeeId', 'int', 4, false, false, 0], ['delegateEmployeeId', 'int', 4, false, false, 0],
    ['startDate', 'date', 3, false, false, 0], ['endDate', 'date', 3, false, false, 0], ['categories', 'nvarchar', 1000, true, false, 0],
    ['reason', 'nvarchar', 600, true, false, 0], ['createdByUserId', 'int', 4, false, false, 0], ['createdAt', 'datetime2', 8, false, false, 0],
    ['revokedAt', 'datetime2', 8, true, false, 0], ['revokedByUserId', 'int', 4, true, false, 0]])
  assert.deepEqual(current.indexes.map(row => [row.name, row.columns, row.isUnique, row.hasFilter]), [
    ['IX_approval_delegations_delegate', 'delegateEmployeeId,startDate,endDate', false, false],
    ['IX_approval_delegations_delegator', 'delegatorEmployeeId,startDate,endDate', false, false], ['PK_approval_delegations', 'id', true, false]])
  assert.deepEqual(current.onBehalf.map(row => [row.type, row.maxLength, row.nullable, row.defaultId]), [['int', 4, true, 0]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('DM-2: من غير الجدول والعمود التفويض مرفوض برسالة والصندوق والقرار والبريد والتصعيد زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده القرار بيتكتب «بالنيابة عن»', async () => {
  const synchronized = await shape()
  await dropDelegationSchema()
  assert.deepEqual(await shape(), { columns: [], indexes: [], onBehalf: [] })
  assert.equal(await delegations.delegationSchemaReady(ds.manager), false)

  // قبل الترحيل: القايمة «مش متاح» من غير خطأ، والإنشاء والإلغاء مرفوضين برسالتهم
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', '/requests/delegations'), 200), { available: false, canManageOthers: false, approver: false, mine: [], toMe: [], others: [] })
  const refused = await request(users.manager, 'POST', '/requests/delegations', { delegateEmployeeId: made.deputy.id, startDate: day(0), endDate: day(2) })
  assert.deepEqual([refused.status, messageOf(refused)], [400, delegations.DELEGATION_MIGRATION_MISSING])
  assert.match(delegations.DELEGATION_MIGRATION_MISSING, /20261005_090/)
  const revoked = await request(users.manager, 'POST', '/requests/delegations/1/revoke')
  assert.deepEqual([revoked.status, messageOf(revoked)], [404, delegations.DELEGATION_NOT_FOUND])
  // والصندوق والقرار وتفاصيل الطلب وبريد «طلب بانتظارك» والتصعيد زي الأول
  await ds.getRepository('RequestsConfig').save({ key: 'notifications.email.enabled', value: 'true' }).catch(() => ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'true' }))
  await drain(); mailbox.sent.length = 0
  const first = await submit()
  await drain()
  assert.deepEqual(mailbox.sent.map(message => message.to), ['manager@delegation-migration.invalid'])
  assert.deepEqual([await inboxIds(users.manager), await inboxIds(users.deputy)], [[first.id], []])
  expectStatus(await request(users.deputy, 'POST', `/requests/${first.id}/act`, { action: 'APPROVE' }), 403)
  expectStatus(await request(users.manager, 'POST', `/requests/${first.id}/act`, { action: 'APPROVE' }), 201)
  const detail = expectStatus(await request(users.worker, 'GET', `/requests/${first.id}`), 200)
  assert.deepEqual([detail.status, detail.approvals.map(row => [row.action, row.onBehalf ?? false])], ['COMPLETED', [['APPROVED', false]]])
  const escalating = await submit()
  await ds.query('UPDATE [requests] SET [resolvedSteps] = @1 WHERE [id] = @0', [escalating.id,
    JSON.stringify(JSON.parse((await ds.query('SELECT [resolvedSteps] FROM [requests] WHERE [id] = @0', [escalating.id]))[0].resolvedSteps).map(step => ({ ...step, dueAt: '2020-01-01T00:00:00.000Z' })))])
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  // خطوة التصعيد لدور وظيفي بتتحفظ زي الأول بالحرف: الدور بيتبدّل والباقي زي ما هو
  const escalatedStep = JSON.parse((await ds.query('SELECT [resolvedSteps] FROM [requests] WHERE [id] = @0', [escalating.id]))[0].resolvedSteps)[0]
  assert.deepEqual([escalatedStep.role, escalatedStep.approverEmployeeId, escalatedStep.escalateTo], ['hr', made.manager.id, null])
  await ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'false' })
  await drain()

  // جدول قديم بشكل تاني: الترحيل بيقف برسالته ومابيلمسوش
  await pool.request().batch('CREATE TABLE dbo.approval_delegations ([id] int NOT NULL, [name] nvarchar(50) NULL);')
  await assert.rejects(runFile(FILE), /20261005_090: جدول approval_delegations ناقص أو أعمدته مش 11/)
  assert.deepEqual((await ds.query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.approval_delegations') ORDER BY c.column_id`)).map(row => row.name), ['id', 'name'])
  await dropDelegationSchema()
  // وعمود «بالنيابة عن» بنوع تاني: نفس الحكاية
  await pool.request().batch('ALTER TABLE dbo.request_approvals ADD [onBehalfOfEmployeeId] nvarchar(10) NULL;')
  await assert.rejects(runFile(FILE), /20261005_090: العمود request_approvals\.onBehalfOfEmployeeId ناقص أو بنوع غلط/)
  assert.deepEqual((await ds.query(`SELECT t.name AS type FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.request_approvals') AND c.name = N'onBehalfOfEmployeeId'`)).map(row => row.type), ['nvarchar'])
  await dropDelegationSchema()

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

  // بعد الترحيل: التفويض بيتسجّل، والبديل بيعتمد، والقرار «بالنيابة عن» المفوِّض
  delegations.resetDelegationSchemaCache()
  const created = expectStatus(await request(users.manager, 'POST', '/requests/delegations', { delegateEmployeeId: made.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  assert.equal(expectStatus(await request(users.manager, 'GET', '/requests/delegations'), 200).mine[0].id, created.id)
  const second = await submit()
  assert.deepEqual(await inboxIds(users.deputy), [second.id])
  expectStatus(await request(users.deputy, 'POST', `/requests/${second.id}/act`, { action: 'APPROVE' }), 201)
  assert.deepEqual((await ds.query('SELECT [approverId], [onBehalfOfEmployeeId] FROM [request_approvals] WHERE [requestId] = @0', [second.id])).map(row => [row.approverId, row.onBehalfOfEmployeeId]),
    [[users.deputy.id, made.manager.id]])
  // والقرار اللي اتاخد قبل الترحيل زي ما هو
  assert.deepEqual((await ds.query('SELECT [onBehalfOfEmployeeId] FROM [request_approvals] WHERE [requestId] = @0', [first.id])).map(row => row.onBehalfOfEmployeeId), [null])
})

test('DM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query('SELECT [id], [delegatorEmployeeId], [delegateEmployeeId], [revokedAt] FROM [approval_delegations] ORDER BY [id]'),
    approvals: await ds.query('SELECT [id], [onBehalfOfEmployeeId] FROM [request_approvals] ORDER BY [id]') })
  const before = await snapshot()
  assert.deepEqual([before.rows.length, before.approvals.filter(row => row.onBehalfOfEmployeeId != null).length], [1, 1])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
