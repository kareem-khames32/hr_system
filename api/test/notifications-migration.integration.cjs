'use strict'
// ترحيل B2.4 (20261005_087) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_notify_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  NM-1) فحص نصي: من غير BOM، وLF في المستودع، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize
//        بنفس الشكل (الأعمدة والفهارس) وفرقها صفر.
//  NM-2) من غير الجداول الأربعة: مفيش إشعار بيتخزن ولا بريد، والقايمة والتفضيلات والقوالب وسجل الإرسال من غير أخطاء، والحدث بيتوزع عادي؛
//        والمُرحّل (بروفة ثم تطبيق) بيعمل الجداول بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر.
//  NM-3) آمن للتكرار.
// Run (من api/): node --test test/notifications-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_notify_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_notify_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notify-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notify-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261005_087_notifications.sql'
const TABLES = ['notifications', 'notification_deliveries', 'notification_templates', 'notification_preferences']
let app, ds, master, pool, queue, notifications, store, outbox, created = false
const sent = []

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const content = file => fs.readFileSync(path.join(MIGRATIONS, file), 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const shape = async () => {
  const tables = {}
  for (const table of TABLES) {
    tables[table] = {
      columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]),
      indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter, i.filter_definition AS filterDefinition,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]),
    }
  }
  return tables
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: crypto.randomBytes(48).toString('hex'), UPLOADS_ROOT: uploads,
    FRONTEND_URL: 'https://hr.example.invalid' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // البريد التجريبي قبل أي حاجة: مفيش رسالة حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => true
  mail.send = async message => { sent.push(message); return { accepted: [message.to], rejected: [], messageId: 'test', response: '250 OK (test)' } }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  queue = app.get(require('../src/queue/queue.service').QueueService)
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  store = require('../src/notifications/notification-store')
  outbox = require('../src/queue/outbox')
  pool = await new sql.ConnectionPool(connection(database)).connect()
  fs.mkdirSync(path.join(base, 'payroll'), { recursive: true })
  fs.copyFileSync(path.join(MIGRATIONS, FILE), path.join(base, 'payroll', FILE))
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-notify-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'notifications migration fixture cleanup failed')
})

test('NM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const indexed = require('node:child_process').execFileSync('git', ['ls-files', '--eol', '--', `docs/migrations/payroll/${FILE}`], { cwd: path.join(apiRoot, '..'), encoding: 'utf8' })
  assert.match(indexed, /^i\/lf\b/, 'LF في المستودع — git add للملف قبل الفحص')
  const text = content(FILE)
  assert.match(text, /^-- 20261005_087: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [87001, 87002, 87003, 87004, 87005, 87006, 87007, 87008])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(TABLES.map(table => current[table].columns.length), [13, 11, 8, 6])
  assert.deepEqual(current.notifications.indexes.map(row => row.name), ['IX_notifications_recipient', 'PK_notifications', 'UX_notifications_dedupe'])
  assert.deepEqual(current.notification_deliveries.indexes.map(row => row.name), ['IX_notification_deliveries_status', 'PK_notification_deliveries', 'UX_notification_deliveries_channel'])
  assert.deepEqual(current.notification_templates.indexes.map(row => row.name), ['PK_notification_templates', 'UX_notification_templates_key'])
  assert.deepEqual(current.notification_preferences.indexes.map(row => row.name), ['PK_notification_preferences', 'UX_notification_preferences_key'])
  // الفهارس الفريدة على أعمدة مش بتقبل فاضي: من غير فلتر
  for (const table of TABLES) for (const index of current[table].indexes.filter(row => row.name.startsWith('UX_'))) assert.deepEqual([index.isUnique, index.hasFilter], [true, false], index.name)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('NM-2: من غير الجداول الإشعارات المخزّنة والبريد واقفين من غير أخطاء؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإشعار بيتخزن ويظهر', async () => {
  const synchronized = await shape()
  assertDisposable()
  await pool.request().batch(TABLES.map(table => `DROP TABLE dbo.${table};`).join(' '))
  store.resetNotificationTablesCache()
  const user = await ds.getRepository('User').save({ email: 'reader@notify-migration.invalid', displayName: 'قارئ', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true })
  const payload = { sub: user.id, email: user.email, role: 'employee', branchId: null, employeeId: null, permissions: [] }
  await ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'true' })
  // قبل الترحيل: ولا حاجة بتتخزن ولا بتتبعت، وكل قراءة بترجع «مش متاح» من غير خطأ
  const event = { id: '1', type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: '1', payload: { runId: 1 } }
  assert.equal(await notifications.ready(), false)
  assert.equal(await notifications.dispatch(event), 0)
  assert.deepEqual(await store.storedInAppNotifications(ds.manager, user.id), [])
  const preferences = await notifications.preferences(payload)
  assert.deepEqual([preferences.available, preferences.emailEnabled, preferences.categories.length], [false, false, 8]) // B5.5: + جدول الورديات
  await assert.rejects(notifications.setPreference(payload, { category: 'payroll', channel: 'EMAIL', mode: 'OFF' }), /ترحيل 20261005_087/)
  await assert.rejects(notifications.saveTemplate(payload, 'request.decided', 'EMAIL', { title: 'عنوان', body: 'نص' }), /ترحيل 20261005_087/)
  assert.equal((await notifications.templatesAdmin()).available, false)
  assert.deepEqual(await notifications.deliveriesAdmin(), { available: false, emailEnabled: false, mailConfigured: true, linkConfigured: true, counts: {}, rows: [] })
  assert.equal(await notifications.sendDigests(), 0)
  await notifications.sendEmail('1', { attempt: 1, maxAttempts: 5 })
  // الحدث نفسه بيتسجل ويتوزع ومهمته بتخلص من غير فشل
  assert.equal(await ds.transaction(em => outbox.recordOutboxEvent(em, { type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: 1, payload: { runId: 1 } })), true)
  const cycle = await queue.runOnce()
  // B6.3-ج: الحدث ده بقى له مشتركين — مهمة الإشعارات ومهمة توزيع الـwebhooks (بتخلص من غير إرسال: موديول التكاملات مقفول)
  assert.deepEqual([cycle.dispatched, cycle.done, cycle.retried, cycle.dead], [1, 2, 0, 0])
  assert.equal(sent.length, 0)

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

  // بعد الترحيل: مسير معتمد لموظف الحساب = إشعار مخزّن بيظهر في القايمة وبريد
  store.resetNotificationTablesCache()
  const branch = await ds.getRepository('Branch').save({ code: 'NM_A', name: 'فرع الترحيل' })
  const employee = await ds.getRepository('Employee').save({ employeeCode: 'NM001', fullName: 'موظف الترحيل', branchId: branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash' })
  await ds.getRepository('User').update({ id: user.id }, { employeeId: employee.id, branchId: branch.id })
  const run = await ds.getRepository('PayrollRun').save({ name: 'مسير الترحيل', period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', branchId: branch.id, scopeType: 'CUSTOM',
    employeeIds: JSON.stringify([employee.id]), runType: 'REGULAR', status: 'APPROVED', totalNet: 5000, approvedAt: new Date() })
  await ds.getRepository('PayrollItem').save({ runId: run.id, employeeId: employee.id, basicSalary: 5000, netPay: 5000, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })
  assert.equal(await notifications.dispatch({ id: '900', type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 1)
  const [item] = await store.storedInAppNotifications(ds.manager, user.id)
  assert.deepEqual([item.kind, item.category, item.title, item.body, item.link], ['info', 'payroll', 'قسيمة راتبك متاحة', 'قسيمة 2026-09 متاحة في «قسائم راتبي»', '/my/payslips'])
  assert.match(item.id, /^n-\d+$/)
  await queue.runOnce()
  assert.deepEqual(sent.map(message => [message.to, message.subject]), [['reader@notify-migration.invalid', 'قسيمة راتبك متاحة: 2026-09']])
})

test('NM-3: آمن للتكرار', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: Object.fromEntries(await Promise.all(TABLES.map(async table => [table, await ds.query(`SELECT * FROM [${table}] ORDER BY [id]`)]))) })
  const before = await snapshot()
  assert.ok(before.rows.notifications.length === 1 && before.rows.notification_deliveries.length === 2)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
})
