'use strict'
// ترحيل B2.6-أ (20261005_089) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_reqexec_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  RM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الأعمدة الأربعة والفهرس) وفرقها صفر.
//  RM-2) من غير الأعمدة: أنواع الطلبات بتتقري وتتعدّل، وإعداد مهمة التنفيذ مرفوض برسالة، والاعتماد بيكمّل الطلب زي الأول، والتقرير
//        والمهام العادية شغالين؛ وعمود قديم بنوع تاني = الترحيل بيقف من غير ما يلمسه؛ والمُرحّل (بروفة ثم تطبيق) بيعمل نفس الشكل
//        والفرق صفر، وبعده الإعداد بيتحفظ والاعتماد بيفتح المهمة وإقفالها بيكمّل الطلب.
//  RM-3) آمن للتكرار.
// Run (من api/): node --test test/request-execution-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_reqexec_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_reqexec_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-reqexec-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-reqexec-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261005_089_request_execution_tasks.sql'
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, pool, http, execution, created = false
const made = {}, users = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const COLUMNS = `SELECT OBJECT_NAME(c.object_id) AS [table], c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.default_object_id AS defaultId
  FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
  WHERE (c.object_id = OBJECT_ID(N'dbo.request_types') AND c.name IN (N'executionRole', N'executionDays', N'executionProof'))
     OR (c.object_id = OBJECT_ID(N'dbo.requests') AND c.name = N'executionTaskId') ORDER BY [table], c.name`
const shape = async () => ({
  columns: await ds.query(COLUMNS),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter, i.filter_definition AS filter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.requests') AND i.name = N'UX_requests_execution_task'`),
})
// «قبل الترحيل»: الأعمدة الأربعة وفهرسها مش موجودين (على القاعدة المؤقتة بس)
async function dropExecutionSchema() {
  assertDisposable()
  await pool.request().batch(`IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.requests') AND name = N'UX_requests_execution_task') DROP INDEX [UX_requests_execution_task] ON dbo.requests;`)
  for (const [table, column] of [['request_types', 'executionRole'], ['request_types', 'executionDays'], ['request_types', 'executionProof'], ['requests', 'executionTaskId']]) {
    await pool.request().batch(`IF COL_LENGTH(N'dbo.${table}', N'${column}') IS NOT NULL ALTER TABLE dbo.${table} DROP COLUMN [${column}];`)
  }
  execution.resetExecutionSchemaCache()
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
const listedType = async id => expectStatus(await request(users.admin, 'GET', '/settings/request-types'), 200).find(row => row.id === id)
// طلب من الموظف بيعتمده مديره (السلسلة خطوة واحدة) — بيرجّع صف الطلب بعد الاعتماد
async function approved(type) {
  const req = expectStatus(await request(users.worker, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true }), 201)
  expectStatus(await request(users.manager, 'POST', `/requests/${req.id}/act`, { action: 'APPROVE' }), 201)
  return (await ds.query('SELECT [id], [status], [completedAt] FROM [requests] WHERE [id] = @0', [req.id]))[0]
}

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
  execution = require('../src/requests/execution-tasks')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))

  made.branch = await ds.getRepository('Branch').save({ code: 'RM_A', name: 'فرع ترحيل التنفيذ' })
  const employee = (code, extra = {}) => ds.getRepository('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
  made.manager = await employee('RM001')
  made.worker = await employee('RM002', { managerEmployeeId: made.manager.id })
  const account = (label, role, permissions, extra = {}) => ds.getRepository('User').save({ email: `${label}@reqexec-migration.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
    role, branchId: made.branch.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.manager = await account('manager', 'employee', [], { employeeId: made.manager.id })
  users.worker = await account('worker', 'employee', [], { employeeId: made.worker.id })
  users.it = await account('it', 'employee', ['approve.it'])
  users.console = await account('console', 'employee', ['requests.view_all'])
  users.tasksAdmin = await account('tasks-admin', 'employee', ['tasks.manage', 'tasks.view_all'])
  const chain = await ds.getRepository('ApprovalChain').save({ code: 'CHAIN_RM', nameAr: 'سلسلة ترحيل التنفيذ', isActive: true, autoApprove: false })
  await ds.getRepository('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  made.type = await ds.getRepository('RequestType').save({ code: 'RM_DEVICE', nameAr: 'طلب جهاز', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-reqexec-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'request execution migration fixture cleanup failed')
})

test('RM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261005_089: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [89001, 89002, 89003])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'أعمدة وفهرس جداد بس، من غير تعبئة')
  assert.doesNotMatch(statements, /\bDEFAULT\b/i, 'من غير افتراضي (زي الكيانات)')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(current.columns.map(row => [row.table, row.columnName, row.type, row.maxLength, row.nullable, row.defaultId]), [
    ['request_types', 'executionDays', 'int', 4, true, 0], ['request_types', 'executionProof', 'bit', 1, true, 0], ['request_types', 'executionRole', 'nvarchar', 80, true, 0],
    ['requests', 'executionTaskId', 'int', 4, true, 0]])
  assert.deepEqual(current.indexes.map(row => [row.name, row.columns, row.isUnique, row.hasFilter, row.filter]),
    [['UX_requests_execution_task', 'executionTaskId', true, true, '([executionTaskId] IS NOT NULL)']])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('RM-2: من غير الأعمدة الإعداد مرفوض برسالة والاعتماد بيكمّل الطلب زي الأول؛ والمُرحّل بيعمل نفس الشكل والفرق صفر، وبعده المهمة بتتفتح', async () => {
  const synchronized = await shape()
  await dropExecutionSchema()
  assert.deepEqual(await shape(), { columns: [], indexes: [] })
  assert.equal(await execution.executionSchemaReady(ds.manager), false)

  // قبل الترحيل: القايمة بتتقري وبتقول إن الإعداد مش متاح، وتعديل تاني للنوع شغال، وإعداد المهمة مرفوض برسالة الترحيل
  const early = await listedType(made.type.id)
  assert.deepEqual([early.executionRole, early.executionDays, early.executionProof, early.executionAvailable], [null, null, false, false])
  assert.equal(expectStatus(await request(users.admin, 'PATCH', `/settings/request-types/${made.type.id}`, { nameAr: 'طلب جهاز جديد' }), 200).nameAr, 'طلب جهاز جديد')
  const refused = await request(users.admin, 'PATCH', `/settings/request-types/${made.type.id}`, { executionRole: 'it', executionDays: 2 })
  assert.deepEqual([refused.status, messageOf(refused)], [400, execution.EXECUTION_MIGRATION_MISSING])
  assert.match(execution.EXECUTION_MIGRATION_MISSING, /20261005_089/)
  const count = await ds.getRepository('RequestType').count()
  const refusedNew = await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع بمهمة قبل الترحيل', category: 'personal_data', executionRole: 'it' })
  assert.deepEqual([refusedNew.status, messageOf(refusedNew)], [400, execution.EXECUTION_MIGRATION_MISSING])
  assert.equal(await ds.getRepository('RequestType').count(), count, 'المرفوض ماعملش نوع')
  // شيل الإعداد (فاضي) مش طلب مهمة: مقبول قبل الترحيل ومابيكتبش حاجة
  expectStatus(await request(users.admin, 'PATCH', `/settings/request-types/${made.type.id}`, { executionRole: null }), 200)
  const plainNew = expectStatus(await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع عادي قبل الترحيل', category: 'personal_data' }), 201)
  assert.deepEqual([plainNew.executionRole ?? null, plainNew.executionAvailable ?? false], [null, false])

  // الاعتماد بيكمّل الطلب في لحظتها زي الأول، وتفاصيله والتقرير شغالين
  const before = await approved(made.type)
  assert.deepEqual([before.status, !!before.completedAt], ['COMPLETED', true])
  assert.equal(expectStatus(await request(users.worker, 'GET', `/requests/${before.id}`), 200).status, 'COMPLETED')
  assert.equal(expectStatus(await request(users.it, 'GET', `/requests/${before.id}`), 403).statusCode ?? 403, 403)
  assert.deepEqual(expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200), [])
  assert.ok(expectStatus(await request(users.console, 'GET', '/requests/all'), 200).some(row => row.id === before.id))
  // طلب معتمد لسه مااكتملش (معالجه مجدول مثلًا) قبل الترحيل: في التقرير بتاريخ اعتماده ومن غير مهمة، ومنفّذ الدور مش طرف فيه
  await ds.query(`UPDATE [requests] SET [status] = N'IN_EXECUTION', [completedAt] = NULL WHERE [id] = @0`, [before.id])
  const waiting = expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200)
  assert.deepEqual(waiting.map(row => [row.id, row.status, row.executionTask, !!row.approvedAt]), [[before.id, 'IN_EXECUTION', null, true]])
  expectStatus(await request(users.it, 'GET', `/requests/${before.id}`), 403)
  await ds.query(`UPDATE [requests] SET [status] = N'COMPLETED', [completedAt] = GETDATE() WHERE [id] = @0`, [before.id])
  // والمهمة العادية بتتكلّف وتظهر وتتقفل من غير ما تتحسب مهمة تنفيذ
  const task = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة عادية قبل الترحيل', assigneeEmployeeId: made.worker.id }), 201)
  const mine = expectStatus(await request(users.worker, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === task.id)
  assert.deepEqual([mine.execution, mine.requestId], [false, null])
  assert.equal(expectStatus(await request(users.worker, 'POST', `/tasks/${task.id}/status`, { status: 'DONE' }), 201).status, 'DONE')
  assert.equal(expectStatus(await request(users.tasksAdmin, 'POST', `/tasks/${task.id}/status`, { status: 'OPEN', note: 'محتاجة تتراجع' }), 201).status, 'OPEN')
  assert.equal(expectStatus(await request(users.tasksAdmin, 'POST', `/tasks/${task.id}/status`, { status: 'CANCELLED', note: 'مش لازمة' }), 201).status, 'CANCELLED')

  // عمود قديم بنوع تاني: الترحيل بيقف برسالته ومابيلمسوش
  await pool.request().batch('ALTER TABLE dbo.request_types ADD [executionRole] nvarchar(10) NULL;')
  await assert.rejects(runFile(FILE), /20261005_089: أعمدة مهمة التنفيذ على request_types ناقصة أو بنوع غلط/)
  assert.deepEqual((await ds.query(`SELECT c.max_length AS maxLength FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.request_types') AND c.name = N'executionRole'`)).map(row => row.maxLength), [20])
  await dropExecutionSchema()

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

  // بعد الترحيل: الطلب اللي اكتمل قبله زي ما هو، والإعداد بيتحفظ، والاعتماد بيفتح المهمة وإقفالها بيكمّل الطلب
  execution.resetExecutionSchemaCache()
  assert.equal((await ds.query('SELECT [status] FROM [requests] WHERE [id] = @0', [before.id]))[0].status, 'COMPLETED')
  const saved = expectStatus(await request(users.admin, 'PATCH', `/settings/request-types/${made.type.id}`, { executionRole: 'it', executionDays: 2 }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], ['it', 2, false])
  assert.equal((await listedType(made.type.id)).executionAvailable, true)
  const after = await approved(made.type)
  assert.deepEqual([after.status, after.completedAt], ['IN_EXECUTION', null])
  const [{ executionTaskId }] = await ds.query('SELECT [executionTaskId] FROM [requests] WHERE [id] = @0', [after.id])
  const inbox = expectStatus(await request(users.it, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === executionTaskId)
  assert.deepEqual([inbox.execution, inbox.requestId, inbox.canWork], [true, after.id, true])
  assert.deepEqual(expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200).map(row => row.id), [after.id])
  assert.equal(expectStatus(await request(users.it, 'POST', `/tasks/${executionTaskId}/status`, { status: 'DONE' }), 201).status, 'DONE')
  assert.equal((await ds.query('SELECT [status] FROM [requests] WHERE [id] = @0', [after.id]))[0].status, 'COMPLETED')
  made.executed = after.id
})

test('RM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(),
    types: await ds.query('SELECT [id], [executionRole], [executionDays], [executionProof] FROM [request_types] ORDER BY [id]'),
    requests: await ds.query('SELECT [id], [status], [executionTaskId] FROM [requests] ORDER BY [id]') })
  const before = await snapshot()
  assert.equal(before.requests.filter(row => row.executionTaskId != null).length, 1)
  assert.deepEqual(before.types.filter(row => row.executionRole != null).map(row => [row.executionRole, row.executionDays]), [['it', 2]])
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
