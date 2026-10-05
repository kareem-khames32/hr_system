'use strict'
// ترحيل B2.5 (20261005_088) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_tasks_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  TM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الأعمدة والفهارس) وفرقها صفر.
//  TM-2) من غير الجدول: «مهامي» شغالة (التهيئة والإخلاء)، والمهمة العامة مرفوضة برسالة، وباقي القراءات «مش متاح» من غير خطأ، وحدث مهمة
//        في محرك الإشعارات مابيعملش حاجة؛ والمُرحّل (بروفة ثم تطبيق) بيعمل الجدول بنفس الشكل والفرق صفر، وبعده المهمة بتتكلّف وتظهر.
//        وجدول tasks قديم بشكل تاني = الترحيل بيقف من غير ما يلمسه.
//  TM-3) آمن للتكرار.
// Run (من api/): node --test test/tasks-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_tasks_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_tasks_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-tasks-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-tasks-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261005_088_tasks.sql'
let app, ds, master, pool, tasks, rules, notifications, created = false
const made = {}

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => ({
  columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.tasks') ORDER BY c.column_id`),
  indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.tasks') AND i.name IS NOT NULL ORDER BY i.name`),
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
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  rules = require('../src/tasks/task-rules')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
  made.branch = await ds.getRepository('Branch').save({ code: 'TM_A', name: 'فرع ترحيل المهام' })
  made.employee = await ds.getRepository('Employee').save({ employeeCode: 'TM001', fullName: 'موظف ترحيل المهام', branchId: made.branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  const worker = await ds.getRepository('User').save({ email: 'worker@tasks-migration.invalid', displayName: 'موظف', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true,
    branchId: made.branch.id, employeeId: made.employee.id })
  const manager = await ds.getRepository('User').save({ email: 'hr@tasks-migration.invalid', displayName: 'موارد', passwordHash: 'test-only', role: 'employee',
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-tasks-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'tasks migration fixture cleanup failed')
})

test('TM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261005_088: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [88001, 88002, 88003])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.equal(current.columns.length, 20)
  assert.deepEqual(current.indexes.map(row => [row.name, row.columns, row.isUnique, row.hasFilter]), [
    ['IX_tasks_assignee', 'assigneeEmployeeId,status', false, false], ['IX_tasks_branch', 'branchId,status,dueDate', false, false], ['PK_tasks', 'id', true, false]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('TM-2: من غير الجدول «مهامي» شغالة والمهمة العامة مرفوضة برسالة؛ والمُرحّل بيعمل الجدول بنفس الشكل والفرق صفر، وبعده المهمة بتتكلّف وتظهر', async () => {
  const synchronized = await shape()
  assertDisposable()
  // حساب جهة (تقنية المعلومات) عليه مهمة تهيئة وبند إخلاء حقيقيين: قبل الترحيل لازم يفضلوا في «مهامي» وعدّادها
  const it = await ds.getRepository('User').save({ email: 'it@tasks-migration.invalid', displayName: 'تقنية', passwordHash: 'test-only', role: 'employee',
    permissions: JSON.stringify(['approve.it']), isActive: true, branchId: made.branch.id })
  const itUser = { sub: it.id, email: it.email, role: 'employee', branchId: made.branch.id, employeeId: null, permissions: ['approve.it'] }
  const onboardingTask = await ds.getRepository('OnboardingTask').save({ employeeId: made.employee.id, templateItemId: null, label: 'حساب البريد', party: 'it', dueDate: '2099-01-01',
    sortOrder: 10, status: 'PENDING' })
  const kase = await ds.getRepository('OffboardingCase').save({ employeeId: made.employee.id, lastWorkingDay: '2099-02-01', status: 'IN_CLEARANCE', terminationReason: 'termination' })
  const item = await ds.getRepository('ClearanceItem').save({ caseId: kase.id, party: 'it', label: 'تسليم الأجهزة', status: 'PENDING' })
  await pool.request().batch('DROP TABLE dbo.tasks;')
  rules.resetTasksTableCache()
  // قبل الترحيل: كل قراءة بترجع «مش متاح» من غير خطأ، والتكليف مرفوض برسالة الترحيل
  assert.equal(await tasks.ready(), false)
  const early = await tasks.mine(itUser)
  assert.deepEqual([early.available, early.tasks, early.onboarding.map(row => row.taskId), early.clearance.map(row => row.itemId), early.counts],
    [false, [], [onboardingTask.id], [item.id], { open: 2, overdue: 0 }])
  assert.deepEqual(await tasks.mineCount(itUser), { open: 2, overdue: 0 })
  await ds.getRepository('OnboardingTask').update({ id: onboardingTask.id }, { status: 'DONE' })
  await ds.getRepository('OffboardingCase').update({ id: kase.id }, { status: 'CANCELLED' })
  assert.deepEqual(await tasks.mine(made.worker), { available: false, tasks: [], onboarding: [], clearance: [], counts: { open: 0, overdue: 0 } })
  assert.deepEqual(await tasks.mineCount(made.worker), { open: 0, overdue: 0 })
  assert.deepEqual(await tasks.team(made.worker), { manager: false, tasks: [] })
  assert.deepEqual(await tasks.list(made.manager), { available: false, tasks: [] })
  const options = await tasks.assignees(made.manager)
  assert.deepEqual([options.available, options.canManage, options.employees.length], [false, true, 1])
  await assert.rejects(tasks.create(made.manager, { title: 'قبل الترحيل', assigneeEmployeeId: made.employee.id }), /ترحيل 20261005_088/)
  await assert.rejects(tasks.detail(made.manager, 1), /المهمة غير موجودة/)
  await assert.rejects(tasks.setStatus(made.worker, 1, { status: 'DONE' }), /المهمة غير موجودة/)
  assert.deepEqual(await tasks.runReminders(), { reminded: 0, escalated: 0 })
  await assert.rejects(rules.assertTaskFileAccess(ds.manager, made.manager, { id: 1, uploadedBy: made.worker.sub }), /الملف غير موجود/)
  await rules.assertTaskFileAccess(ds.manager, made.worker, { id: 1, uploadedBy: made.worker.sub })
  // حدث مهمة في محرك الإشعارات من غير الجدول: ولا حاجة ومن غير خطأ
  await ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'true' })
  assert.equal(await notifications.dispatch({ id: '1', type: 'TASK_ASSIGNED', entityType: 'task', entityId: '1', payload: { taskId: 1 } }), 0)
  await ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'false' })

  // جدول tasks قديم بشكل تاني: الترحيل بيقف برسالته ومابيلمسوش
  await pool.request().batch('CREATE TABLE dbo.tasks ([id] int NOT NULL, [name] nvarchar(50) NULL);')
  await assert.rejects(runFile(FILE), /20261005_088: جدول tasks ناقص أو أعمدته مش 20/)
  assert.deepEqual((await ds.query(`SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID(N'dbo.tasks') ORDER BY c.column_id`)).map(row => row.name), ['id', 'name'])
  await pool.request().batch('DROP TABLE dbo.tasks;')

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

  // بعد الترحيل: المهمة بتتكلّف وتظهر لمسؤولها وتتقفل
  rules.resetTasksTableCache()
  const task = await tasks.create(made.manager, { title: 'بعد الترحيل', assigneeEmployeeId: made.employee.id, requiresProof: true })
  const inbox = await tasks.mine(made.worker)
  assert.deepEqual([inbox.available, inbox.tasks.map(row => row.id), inbox.counts], [true, [task.id], { open: 1, overdue: 0 }])
  const done = await tasks.setStatus(made.worker, task.id, { status: 'DONE', proofNote: 'تم' })
  assert.deepEqual([done.status, done.proofNote], ['DONE', 'تم'])
  made.task = task
})

test('TM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: await ds.query('SELECT * FROM [tasks] ORDER BY [id]') })
  const before = await snapshot()
  assert.equal(before.rows.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
