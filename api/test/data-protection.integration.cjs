'use strict'
// B4.8 (ب) على SQL حقيقي: سجل حوادث تسريب البيانات بموعد إخطار 72 ساعة (ترحيل 139 والشغل قبله)، ومدد الاحتفاظ (فاضية افتراضيًا)
// ومهمة التنبيه اليومية اللي بتعمل مهام مراجعة للموارد البشرية في الفرع — من غير أي مسح. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_data_protection_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_data_protection_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-data-protection-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/settings/data-protection')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261009_139_data_breach_incidents.sql')
const D = '/settings/data-protection'
let master, pool, app, ds, base, admin, scoped, plain, created = false, sequence = 0
const B = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); return { status: response.status, body: raw ? JSON.parse(raw) : null }
}
const ok = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const hoursAgo = hours => new Date(Date.now() - hours * 3600000).toISOString()
const monthsAgo = months => { const date = new Date(); date.setMonth(date.getMonth() - months); return date }
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const tableExists = async () => (await pool.request().query(`SELECT OBJECT_ID(N'dbo.data_breach_incidents', N'U') AS id`)).recordset[0].id != null
const archived = (branch, months) => repo('Employee').save({ employeeCode: 'DP' + ++sequence, fullName: 'موظف مؤرشف ' + sequence, branchId: branch.id, joinDate: '2015-01-01', basicSalary: 5000,
  housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'archived', isActive: false, payMethod: 'cash', archivedAt: monthsAgo(months) })
async function candidate(branch, months, hiredEmployeeId = null) {
  const row = await repo('Candidate').save({ fullName: 'مرشح ' + ++sequence, positionTitle: 'محاسب', branchId: branch ? branch.id : null, stage: 'applied', hiredEmployeeId })
  await pool.request().input('id', row.id).input('at', monthsAgo(months)).query('UPDATE dbo.candidates SET [createdAt] = @at WHERE [id] = @id')
  return row
}
const retentionOf = async () => Object.fromEntries(ok(await request(admin, 'GET', D), 200).retention.map(row => [row.key, [row.months, row.expired]]))
const systemTasks = async () => (await repo('Task').find({ where: { createdByUserId: 0 }, order: { id: 'ASC' } })).map(row => [row.title, row.branchId, row.assigneeRole, row.status])

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  B.one = await repo('Branch').save({ code: 'DP_1', name: 'فرع الرياض', country: 'SA' })
  B.two = await repo('Branch').save({ code: 'DP_2', name: 'فرع القاهرة', country: 'EG' })
  admin = await repo('User').save({ email: 'admin@data-protection.invalid', displayName: 'Fixture admin', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]' })
  scoped = await repo('User').save({ email: 'scoped@data-protection.invalid', displayName: 'branch settings', passwordHash: 'test-only', role: 'hr_manager', branchId: B.one.id, permissions: '["settings.manage"]' })
  plain = await repo('User').save({ email: 'plain@data-protection.invalid', displayName: 'plain', passwordHash: 'test-only', role: 'employee', branchId: B.one.id, permissions: '["employees.view"]' })
}, { timeout: 120000 })

after(async t => {
  if (pool) await pool.close()
  if (app) await app.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('DP-01: قبل ترحيل 139 الشاشة بتقول إن السجل ناقص ومدد الاحتفاظ شغالة؛ والترحيل بيعمل الجدول بشكل الكيان وبيتكرر بأمان', async () => {
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
  assert.ok(String(text).match(/THROW \d+/g).every(code => /^THROW 1390\d\d$/.test(code)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i)
  // شكل الكيان = شكل الترحيل: الملف بيعدّي على قاعدة synchronize من غير تغيير
  await runMigration()
  await pool.request().batch('DROP TABLE dbo.data_breach_incidents'); rules.resetBreachIncidentsCache()
  assert.equal(await tableExists(), false)
  const before = ok(await request(admin, 'GET', D), 200)
  assert.deepEqual([before.notifyHours, before.incidentsAvailable, before.incidents, before.retention.map(row => [row.key, row.months, row.expired])],
    [72, false, [], [['ex_employees', null, 0], ['candidates', null, 0]]])
  assert.equal((await request(admin, 'POST', `${D}/incidents`, { title: 'حادثة قبل الترحيل', discoveredAt: hoursAgo(1) })).status, 400)
  await runMigration(); await runMigration()
  assert.equal(await tableExists(), true)
  assert.equal(ok(await request(admin, 'GET', D), 200).incidentsAvailable, true)
})

test('DP-02: حادثة تسريب — موعد الإخطار = الاكتشاف + 72 ساعة، والعدّاد والتأخير، وخطوتي «اتبلّغت» و«اتقفلت» تحت القفل وبسطر تدقيق، ولحساب بكل الفروع', async () => {
  // بالصلاحية وبالنطاق وبالقيم
  assert.deepEqual([(await request(plain, 'GET', D)).status, (await request(scoped, 'GET', D)).status, (await request(scoped, 'POST', `${D}/incidents`, { title: 'حادثة', discoveredAt: hoursAgo(1) })).status,
    (await request(admin, 'POST', `${D}/incidents`, { title: 'حا', discoveredAt: hoursAgo(1) })).status, (await request(admin, 'POST', `${D}/incidents`, { title: 'حادثة' })).status,
    (await request(admin, 'POST', `${D}/incidents`, { title: 'حادثة', discoveredAt: new Date(Date.now() + 3600000).toISOString() })).status], [403, 403, 403, 400, 400, 400])
  assert.equal(await repo('DataBreachIncident').count(), 0)
  const discovered = hoursAgo(10)
  const first = ok(await request(admin, 'POST', `${D}/incidents`, { title: ' ملف رواتب اتبعت لبريد غلط ', details: 'ملف شهر سبتمبر', discoveredAt: discovered, affectedCount: 40 }), 201).incidents[0]
  assert.deepEqual([first.title, first.details, first.status, first.statusLabel, first.affectedCount, new Date(first.notifyBy).getTime() - new Date(first.discoveredAt).getTime(), first.hoursLeft, first.overdue, first.notifiedLate],
    ['ملف رواتب اتبعت لبريد غلط', 'ملف شهر سبتمبر', 'OPEN', 'لسه مااتبلّغتش', 40, 72 * 3600000, 61, false, false])
  // حادثة اكتُشفت من 80 ساعة: الموعد فات
  const late = ok(await request(admin, 'POST', `${D}/incidents`, { title: 'دخول غير مصرّح', discoveredAt: hoursAgo(80) }), 201).incidents.find(row => row.title === 'دخول غير مصرّح')
  assert.deepEqual([late.overdue, late.hoursLeft <= -8], [true, true])
  // «اتبلّغت» محتاجة الجهة والمرجع؛ والحادثة المتأخرة بتتعلّم «اتبلّغت متأخر»
  assert.deepEqual([(await request(admin, 'POST', `${D}/incidents/${first.id}/notify`, { note: '' })).status, (await request(admin, 'POST', `${D}/incidents/987654/notify`, { note: 'هيئة البيانات' })).status,
    (await request(scoped, 'POST', `${D}/incidents/${first.id}/notify`, { note: 'هيئة البيانات' })).status], [400, 404, 403])
  const notified = ok(await request(admin, 'POST', `${D}/incidents/${first.id}/notify`, { note: ' هيئة البيانات — مرجع 2026/55 ' }), 201).incidents.find(row => row.id === first.id)
  assert.deepEqual([notified.status, notified.notificationNote, notified.hoursLeft, notified.overdue, notified.notifiedLate, notified.notifiedAt !== null], ['NOTIFIED', 'هيئة البيانات — مرجع 2026/55', null, false, false, true])
  const lateNotified = ok(await request(admin, 'POST', `${D}/incidents/${late.id}/notify`, { note: 'هيئة البيانات — متأخر' }), 201).incidents.find(row => row.id === late.id)
  assert.deepEqual([lateNotified.status, lateNotified.notifiedLate], ['NOTIFIED', true])
  // مرتين «اتبلّغت» مرفوضة، والإقفال مرة واحدة، ومفيش مسار مسح ولا تعديل
  assert.equal((await request(admin, 'POST', `${D}/incidents/${first.id}/notify`, { note: 'تاني مرة' })).status, 400)
  const closed = ok(await request(admin, 'POST', `${D}/incidents/${first.id}/close`, { note: 'اتراجع الملف واتمسح عند المستلم' }), 201).incidents.find(row => row.id === first.id)
  assert.deepEqual([closed.status, closed.closeNote, closed.notificationNote], ['CLOSED', 'اتراجع الملف واتمسح عند المستلم', 'هيئة البيانات — مرجع 2026/55'])
  assert.deepEqual([(await request(admin, 'POST', `${D}/incidents/${first.id}/close`, {})).status, (await request(admin, 'DELETE', `${D}/incidents/${first.id}`)).status, (await request(admin, 'PATCH', `${D}/incidents/${first.id}`, { title: 'x' })).status],
    [400, 404, 404])
  // ضغطتين «اتبلّغت» مع بعض على حادثة: واحدة بس
  const third = ok(await request(admin, 'POST', `${D}/incidents`, { title: 'حادثة تالتة', discoveredAt: hoursAgo(2) }), 201).incidents.find(row => row.title === 'حادثة تالتة')
  const race = await Promise.all([request(admin, 'POST', `${D}/incidents/${third.id}/notify`, { note: 'هيئة البيانات أ' }), request(admin, 'POST', `${D}/incidents/${third.id}/notify`, { note: 'هيئة البيانات ب' })])
  assert.deepEqual(race.map(response => response.status).sort(), [201, 400])
  assert.deepEqual((await repo('AuditLog').find({ where: { entityType: 'data_breach_incident' }, order: { id: 'ASC' } })).map(row => row.action),
    ['DATA_BREACH_RECORDED', 'DATA_BREACH_RECORDED', 'DATA_BREACH_NOTIFIED', 'DATA_BREACH_NOTIFIED', 'DATA_BREACH_CLOSED', 'DATA_BREACH_RECORDED', 'DATA_BREACH_NOTIFIED'])
})

test('DP-03: مدد الاحتفاظ — فاضية افتراضيًا (مفيش مهام)، وبالمدة بيتعدّ اللي عدّاها وبتتعمل مهمة مراجعة لكل فرع مرة واحدة، ومن غير أي مسح', async () => {
  const service = app.get(require('../src/settings/data-protection.service').DataProtectionService)
  await archived(B.one, 40); await archived(B.one, 30); await archived(B.one, 6); await archived(B.two, 50)
  await repo('Employee').save({ employeeCode: 'DPA', fullName: 'موظف نشط', branchId: B.one.id, joinDate: '2015-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash' })
  await candidate(B.one, 20); await candidate(B.two, 20); await candidate(B.two, 3); await candidate(null, 20)
  await candidate(B.one, 20, (await repo('Employee').findOneByOrFail({ employeeCode: 'DPA' })).id)
  const counts = async () => [await repo('Employee').count(), await repo('Candidate').count()]
  const beforeCounts = await counts()
  // الافتراضي: من غير مدة = مفيش عدّ ولا مهام
  assert.deepEqual([await retentionOf(), await service.raiseRetentionTasks(), await systemTasks()], [{ ex_employees: [null, 0], candidates: [null, 0] }, 0, []])
  // القيم: رقم صحيح من 1 لـ600 أو فاضي؛ ولحساب بكل الفروع؛ ومن مسارها بس
  assert.deepEqual([(await request(admin, 'PUT', `${D}/retention/ex_employees`, { months: 0 })).status, (await request(admin, 'PUT', `${D}/retention/ex_employees`, { months: 601 })).status,
    (await request(admin, 'PUT', `${D}/retention/ex_employees`, { months: '24' })).status, (await request(admin, 'PUT', `${D}/retention/unknown`, { months: 12 })).status,
    (await request(scoped, 'PUT', `${D}/retention/ex_employees`, { months: 12 })).status], [400, 400, 400, 404, 403])
  ok(await request(admin, 'PUT', `${D}/retention/ex_employees`, { months: 24 }), 200)
  ok(await request(admin, 'PUT', `${D}/retention/candidates`, { months: 12 }), 200)
  const generic = await request(admin, 'PATCH', '/settings/config', { key: 'privacy.retention.ex_employees_months', value: '1' })
  assert.deepEqual([generic.status, generic.body.message], [400, rules.RETENTION_REFUSAL])
  // المؤرشفين من أكتر من 24 شهر: 3 (اتنين في الأول وواحد في التاني)؛ المرشحين اللي مااتعيّنوش من أكتر من 12 شهر: 3 (واحد من غير فرع)
  assert.deepEqual(await retentionOf(), { ex_employees: [24, 3], candidates: [12, 3] })
  // المهمة اليومية: مهمة لكل نوع ولكل فرع ليه سجلات (المرشح اللي من غير فرع مالوش مهمة)، على الموارد البشرية في الفرع
  assert.equal(await service.raiseRetentionTasks(), 4)
  const EMP = rules.retentionTaskTitle(rules.RETENTION_TYPES[0]), CAND = rules.retentionTaskTitle(rules.RETENTION_TYPES[1])
  assert.deepEqual((await systemTasks()).sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]),
    [[EMP, B.one.id, 'hr', 'OPEN'], [EMP, B.two.id, 'hr', 'OPEN'], [CAND, B.one.id, 'hr', 'OPEN'], [CAND, B.two.id, 'hr', 'OPEN']].sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]))
  assert.match((await repo('Task').findOneByOrFail({ title: EMP, branchId: B.one.id })).description, /^2 سجل عدّى مدة الاحتفاظ \(24 شهر/)
  // تاني يوم والمهام لسه مفتوحة: مفيش مهام جديدة؛ وتشغيلين مع بعض مايكرروش
  assert.deepEqual([await service.raiseRetentionTasks(), (await Promise.all([service.raiseRetentionTasks(), service.raiseRetentionTasks()])).reduce((sum, made) => sum + made, 0), (await systemTasks()).length], [0, 0, 4])
  // ولا سجل اتمسح ولا اتغيّر
  assert.deepEqual(await counts(), beforeCounts)
  // تفضية المدة = مفيش عدّ ولا مهام جديدة
  ok(await request(admin, 'PUT', `${D}/retention/candidates`, { months: null }), 200)
  assert.deepEqual((await retentionOf()).candidates, [null, 0])
  assert.deepEqual((await repo('AuditLog').find({ where: { action: 'DATA_RETENTION_SET' }, order: { id: 'ASC' } })).length, 3)
})
