'use strict'
// ترحيل B-ADD.5 (20261011_187) على قاعدة مؤقتة عشوائية بتتمسح في الآخر (hr_notify_channels_migration_test_<16 hex> — لا مساس بقاعدة الشركة):
//  NCM-1) فحص نصي: من غير BOM، وLF، ومفيش عبارة ممنوعة، وأكواد THROW فريدة، ومتوافق مع SQL Server 2019، وقاعدة synchronize بنفس الشكل
//         (الأعمدة والفهارس) وفرقها صفر.
//  NCM-2) من غير الجداول التلاتة السلوك هو سلوك النظام قبل الدفعة: البريد بإعداد الخادم ومفتاح الشركة، والواتساب مقفول، وكل قراءة بترجّع
//         الافتراضي من غير خطأ، وكل كتابة بترفض برسالة الترحيل — وعملية شغالة من قبل الترحيل بتشوفه أول ما يتطبق. والمُرحّل (بروفة ثم تطبيق)
//         بيعمل الجداول بنفس الشكل والفرق صفر، وبعده الإعداد بيتحفظ.
//  NCM-3) آمن للتكرار، وجدول موجود بشكل تاني بيوقّف الترحيل من غير ما يغيّر حاجة.
// Run (من api/): node --test test/notification-channels-migration.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_notify_channels_migration_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_notify_channels_migration_test_[a-f0-9]{16}$/
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notify-channels-migrations-'))
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notify-channels-mfiles-'))
const MIGRATIONS = path.join(apiRoot, '..', 'docs/migrations/payroll')
const FILE = '20261011_187_notification_channels.sql'
const TABLES = ['notification_channel_settings', 'notification_event_rules', 'employee_whatsapp_numbers']
let app, ds, master, pool, queue, notifications, channels, rules, outbox, mail, created = false
const sent = [], metaCalls = []

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
  // البريد التجريبي ونداء Meta التجريبي قبل أي حاجة: مفيش رسالة حقيقية ولا طلب شبكة بيطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  mail = app.get(MailService)
  mail.isConfigured = () => true
  mail.transporter = () => { throw new Error('الاختبار حاول يفتح اتصال SMTP حقيقي') }
  mail.send = async message => { sent.push(message); return { accepted: [message.to], rejected: [], messageId: 'test', response: '250 OK (test)' } }
  assert.notEqual(mail.send, MailService.prototype.send)
  channels = app.get(require('../src/notifications/channels/notification-channels.service').NotificationChannelsService)
  channels.http = async call => { metaCalls.push(call); return { status: 200, body: JSON.stringify({ messages: [{ id: 'wamid.test' }] }) } }
  await app.init()
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  queue = app.get(require('../src/queue/queue.service').QueueService)
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  rules = require('../src/notifications/channels/channel-rules')
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
      assert.equal(path.dirname(path.resolve(dir)), os.tmpdir()); assert.match(path.basename(dir), /^hr-notify-channels-(migrations|mfiles)-/)
      fs.rmSync(dir, { recursive: true, force: true })
    } catch (error) { errors.push(error) }
  }
  if (errors.length) throw new AggregateError(errors, 'notification channels migration fixture cleanup failed')
})

test('NCM-1: الملف LF من غير BOM ومن غير عبارة ممنوعة، وأكواده فريدة، وقاعدة synchronize بنفس الشكل وفرقها صفر', async () => {
  const raw = fs.readFileSync(path.join(MIGRATIONS, FILE))
  assert.notDeepEqual([...raw.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  assert.equal(raw.includes(0x0d), false, 'LF بس في الملف')
  const text = content(FILE)
  assert.match(text, /^-- 20261011_187: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [187001, 187002, 187003, 187004, 187005, 187006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.match(statements, /\bSET NOCOUNT ON;\s*\nGO\n/)
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  const current = await shape()
  assert.deepEqual(TABLES.map(table => current[table].columns.length), [7, 9, 5])
  assert.deepEqual(current.notification_channel_settings.indexes.map(row => row.name), ['PK_notification_channel_settings', 'UX_notification_channel_settings_channel'])
  assert.deepEqual(current.notification_event_rules.indexes.map(row => row.name), ['PK_notification_event_rules', 'UX_notification_event_rules_event'])
  assert.deepEqual(current.employee_whatsapp_numbers.indexes.map(row => row.name), ['PK_employee_whatsapp_numbers', 'UX_employee_whatsapp_numbers_employee'])
  for (const table of TABLES) for (const index of current[table].indexes.filter(row => row.name.startsWith('UX_'))) assert.deepEqual([index.isUnique, index.hasFilter], [true, false], index.name)
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
})

test('NCM-2: من غير الجداول السلوك هو سلوك النظام قبل الدفعة؛ والمُرحّل بيعملهم بنفس الشكل والفرق صفر، وبعده الإعداد بيتحفظ', async () => {
  const synchronized = await shape()
  assertDisposable()
  await pool.request().batch(TABLES.map(table => `DROP TABLE dbo.${table};`).join(' '))
  rules.resetNotificationChannelTablesCache()
  const admin = await ds.getRepository('User').save({ email: 'admin@channels-migration.invalid', displayName: 'مدير', passwordHash: 'test-only', role: 'super_admin', permissions: '[]', isActive: true })
  const payload = { sub: admin.id, email: admin.email, role: 'super_admin', branchId: null, employeeId: null, permissions: ['*'] }
  const envHost = mail.config.host
  // قبل الترحيل: كل قراءة بترجّع الافتراضي من غير خطأ، والواتساب مقفول، والبريد بإعداد الخادم
  assert.equal(await channels.ready(), false)
  assert.equal(await channels.storedMailConfig(), null)
  assert.deepEqual(await channels.whatsappSetup(), { enabled: false, settings: null, token: null, open: false })
  assert.deepEqual(await channels.ruleOf('request.pending_approval'), { rule: { inApp: true, email: true, whatsapp: false, mandatory: false }, bindings: {}, customized: false })
  assert.deepEqual(await channels.mandatoryEvents(), [])
  assert.deepEqual([...(await channels.whatsappNumbers([1, 2], null))], [])
  const state = await channels.state()
  assert.deepEqual([state.available, state.email.enabled, state.whatsapp.enabled, state.email.active.source, state.events.every(event => !event.whatsapp && event.email && !event.mandatory)], [false, false, false, 'env', true])
  assert.equal(mail.config.host, envHost)
  const missing = await channels.missingContacts(payload)
  assert.deepEqual([missing.available, missing.whatsappOpen], [false, false])
  // وكل كتابة بترفض برسالة الترحيل
  const body = { preset: 'SMTP', host: 'smtp.example.invalid', port: 587, encryption: 'STARTTLS', user: '', fromName: '', fromAddress: 'hr@example.invalid', enabled: true }
  await assert.rejects(channels.saveEmail(payload, body), /ترحيل 20261011_187/)
  await assert.rejects(channels.saveWhatsapp(payload, { phoneNumberId: '123456', token: 'test-token-not-real', enabled: true }), /ترحيل 20261011_187/)
  await assert.rejects(channels.saveEventRule(payload, 'request.decided', { inApp: true, email: true, whatsapp: true, mandatory: true }), /ترحيل 20261011_187/)
  await assert.rejects(channels.testWhatsapp(payload, { to: '+966500000000', eventCode: 'request.decided' }), /ترحيل 20261011_187/)
  // والمحرك زي ما كان: اختيارات المستخدم بشكلها، والحدث بيتوزع، ومفيش أي نداء واتساب
  const preferences = await notifications.preferences(payload)
  assert.deepEqual([preferences.available, preferences.whatsappEnabled, preferences.locked, preferences.mandatory, preferences.categories.length], [true, false, [], {}, 8])
  await ds.getRepository('RequestsConfig').update({ key: 'notifications.email.enabled' }, { value: 'true' })
  const branch = await ds.getRepository('Branch').save({ code: 'NCM_A', name: 'فرع ترحيل القنوات' })
  const employee = await ds.getRepository('Employee').save({ employeeCode: 'NCM001', fullName: 'موظف ترحيل القنوات', branchId: branch.id, joinDate: '2020-01-01', basicSalary: 5000,
    housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', phone: '0500000000' })
  const reader = await ds.getRepository('User').save({ email: 'reader@channels-migration.invalid', displayName: 'قارئ', passwordHash: 'test-only', role: 'employee', permissions: '[]', isActive: true,
    employeeId: employee.id, branchId: branch.id })
  const run = await ds.getRepository('PayrollRun').save({ name: 'مسير ترحيل القنوات', period: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22', branchId: branch.id, scopeType: 'CUSTOM',
    employeeIds: JSON.stringify([employee.id]), runType: 'REGULAR', status: 'APPROVED', totalNet: 5000, approvedAt: new Date() })
  await ds.getRepository('PayrollItem').save({ runId: run.id, employeeId: employee.id, basicSalary: 5000, netPay: 5000, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })
  assert.equal(await notifications.dispatch({ id: '700', type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 1)
  await queue.runOnce()
  assert.deepEqual(await ds.query(`SELECT d.[channel], d.[status] FROM [notification_deliveries] d ORDER BY d.[id]`), [{ channel: 'IN_APP', status: 'SENT' }, { channel: 'EMAIL', status: 'SENT' }])
  assert.deepEqual([sent.map(message => message.to), metaCalls.length], [['reader@channels-migration.invalid'], 0])
  const log = await notifications.deliveriesAdmin({ channel: 'WHATSAPP' })
  assert.deepEqual([log.available, log.total, log.whatsappEnabled], [true, 0, false])

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

  // بعد الترحيل — من غير نسيان الحالة: العملية الشغالة من قبله بتشوفه مع أول نداء (النتيجة السلبية مابتتحفظش)
  assert.equal(await channels.ready(), true)
  const saved = await channels.saveEmail(payload, body)
  assert.deepEqual([saved.available, saved.email.enabled, saved.email.active.source, mail.config.host], [true, true, 'screen', 'smtp.example.invalid'])
  await channels.saveEmail(payload, { ...body, enabled: false })
  assert.equal(mail.config.host, envHost)
  assert.equal(reader.id > 0, true)
})

test('NCM-3: آمن للتكرار، وجدول موجود بشكل تاني بيوقّف الترحيل من غير ما يغيّر حاجة', async () => {
  const replay = await migrate.apply({ database, base, schemaDiff: false, quiet: true })
  assert.deepEqual(replay.pendingBefore, []); assert.deepEqual(replay.applied, []); assert.equal(replay.ledgerComplete, true)
  const snapshot = async () => ({ shape: await shape(), rows: Object.fromEntries(await Promise.all(TABLES.map(async table => [table, await ds.query(`SELECT * FROM [${table}] ORDER BY [id]`)]))) })
  const before = await snapshot()
  assert.equal(before.rows.notification_channel_settings.length, 1)
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual(await snapshot(), before)
  // جدول بنفس الاسم وبشكل تاني (عمود ناقص): الترحيل بيقف بكوده من غير ما يلمسه
  assertDisposable()
  await pool.request().batch('DROP TABLE dbo.employee_whatsapp_numbers; CREATE TABLE dbo.employee_whatsapp_numbers ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_employee_whatsapp_numbers] PRIMARY KEY, [employeeId] int NOT NULL);')
  await assert.rejects(runFile(FILE), error => Number(error.number) === 187005)
  assert.equal(Number((await ds.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.employee_whatsapp_numbers')`))[0].n), 2)
  await pool.request().batch('DROP TABLE dbo.employee_whatsapp_numbers;')
  await runFile(FILE)
  assert.deepEqual((await snapshot()).shape, before.shape)
})
