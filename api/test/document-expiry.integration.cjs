// B2.15 (أ): صلاحية المستندات — إعدادات النوع، والتنبيه (إشعار للموظف ومهمة تجديد على المسؤول)، وقفل المهمة بالتجديد، وتقرير
// «هينتهي / منتهي» بالفرع. HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_document_expiry_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-document-expiry-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const rules = require('../src/assets/document-expiry')
let app, ds, master, base, queue, created = false, today
const outbox = []
const U = {}, E = {}, B = {}, D = {}, T = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const linkOf = async id => (await ds.query('SELECT [renewalTaskId] FROM [employee_documents] WHERE [id] = @0', [id]))[0].renewalTaskId
const eventKeys = async () => (await ds.query(`SELECT [eventKey] FROM [outbox_events] WHERE [eventType] = N'DOCUMENT_EXPIRING' ORDER BY [id]`)).map(row => row.eventKey)
const drain = async () => { for (let round = 0; round < 4; round++) await queue.runOnce() }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_document_expiry_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads,
    FRONTEND_URL: 'https://hr.example.invalid' })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية من اختبار: الإرسال بيتسجّل في outbox بس
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => true
  mail.send = async message => { outbox.push(message); return { accepted: [message.to], rejected: [], messageId: 'test', response: 'ok' } }
  assert.notEqual(mail.send, MailService.prototype.send)
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  queue = app.get(require('../src/queue/queue.service').QueueService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  today = localDateOf(new Date())
  B.a = await repo('Branch').save({ code: 'DXA', name: 'فرع المستندات أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'DXB', name: 'فرع المستندات ب', country: 'EG', weekendDays: 'FRI' })
  let n = 0
  const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `DX${String(++n).padStart(3, '0')}`, fullName: `موظف مستندات ${key}`,
    branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01', ...extra }) }
  await employee('a1', B.a); await employee('a2', B.a); await employee('b1', B.b); await employee('gone', B.a, { status: 'archived', isActive: false })
  const account = (key, role, permissions, extra = {}) => repo('User').save({ email: `${key}@document-expiry.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'])
  await account('hrA', 'employee', ['documents.manage'], { branchId: B.a.id })
  await account('owner', 'employee', [], { branchId: B.a.id, employeeId: E.a1.id })
  await account('other', 'employee', [], { branchId: B.a.id, employeeId: E.a2.id })
  await repo('RequestsConfig').save({ key: require('../src/notifications/notifications.service').NOTIFICATIONS_EMAIL_ENABLED_KEY, value: 'true' })
  // أنواع المستندات المزروعة عند الإقلاع
  for (const type of expect(await call(U.admin, 'GET', '/documents/expiry-settings'), 200).types) T[type.code] = type
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_document_expiry_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-document-expiry-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار صلاحية المستندات')
})

test('DX-01: a document type carries its expiry settings; a type that expires makes the date required', async () => {
  // الافتراضي = السلوك القايم: من غير إلزام تاريخ، والتنبيه على 30 يوم، ومن غير مسؤول
  const listed = expect(await call(U.admin, 'GET', '/documents/expiry-settings'), 200)
  assert.equal(listed.ready, true)
  assert.deepEqual(listed.roles.find(row => row.role === 'hr'), { role: 'hr', label: 'الموارد البشرية' })
  assert.deepEqual([T.iqama.nameAr, T.iqama.hasExpiry, T.iqama.alertDays, T.iqama.ownerRole], ['إقامة', false, [30], null])
  const saved = expect(await call(U.admin, 'PATCH', `/documents/expiry-settings/${T.iqama.id}`, { hasExpiry: true, alertDays: [7, 60, 30, 30], ownerRole: 'hr' }), 200)
  assert.deepEqual([saved.hasExpiry, saved.alertDays, saved.ownerRole], [true, [60, 30, 7], 'hr'])
  // تعديل حقل واحد مابيلمسش الباقي، والفاضي بيرجّع الافتراضي
  assert.deepEqual(expect(await call(U.admin, 'PATCH', `/documents/expiry-settings/${T.passport.id}`, { alertDays: '45, 10' }), 200).alertDays, [45, 10])
  const cleared = expect(await call(U.admin, 'PATCH', `/documents/expiry-settings/${T.passport.id}`, { alertDays: null }), 200)
  assert.deepEqual([cleared.alertDays, cleared.hasExpiry, cleared.ownerRole], [[30], false, null])
  assert.deepEqual(expect(await call(U.admin, 'GET', '/documents/expiry-settings'), 200).types.find(type => type.code === 'iqama').alertDays, [60, 30, 7])
  for (const body of [{ alertDays: ['x'] }, { alertDays: [0] }, { alertDays: [366] }, { alertDays: [1, 2, 3, 4, 5, 6] }, { alertDays: '7;30' }, { ownerRole: 'ceo' }, { hasExpiry: 'yes' }]) {
    expect(await call(U.admin, 'PATCH', `/documents/expiry-settings/${T.iqama.id}`, body), 400)
  }
  expect(await call(U.admin, 'PATCH', '/documents/expiry-settings/999999', { hasExpiry: true }), 404)
  for (const [method, route, body] of [['GET', '/documents/expiry-settings'], ['PATCH', `/documents/expiry-settings/${T.iqama.id}`, { ownerRole: null }]]) {
    expect(await call(U.hrA, method, route, body), 403)
  }
  // النوع اللي «له انتهاء»: التاريخ إلزامي عند الإضافة؛ والنوع التاني زي الأول
  const refused = await call(U.admin, 'POST', '/documents', { employeeId: E.a1.id, docType: 'iqama' })
  assert.deepEqual([refused.status, messageOf(refused)], [400, rules.DOCUMENT_EXPIRY_REQUIRED])
  D.plain = expect(await call(U.admin, 'POST', '/documents', { employeeId: E.a1.id, docType: 'passport' }), 201)
  assert.equal(await repo('EmployeeDocument').count(), 1)
})

test('DX-02: a document reaching an alert day raises one event, notifies its owner and opens one renewal task on the responsible role', async () => {
  const doc = (who, docType, days) => repo('EmployeeDocument').save({ employeeId: E[who].id, docType, number: 'SECRET-77', expiryDate: addDays(today, days) })
  D.d1 = await doc('a1', 'iqama', 25)          // وصل تنبيه الـ30
  D.d2 = await doc('a2', 'passport', 10)       // نوع من غير إعداد: تنبيه الـ30 الافتراضي ومن غير مهمة
  D.d3 = await doc('b1', 'iqama', 70)          // لسه بدري (أكبر يوم 60)
  D.d4 = await doc('gone', 'iqama', 5)         // موظف مؤرشف
  D.d6 = await doc('a2', 'iqama', 3); await doc('a2', 'iqama', 300)   // متبدّل بمستند أحدث من نفس النوع
  D.expired = await doc('a2', 'driver_license', -10)
  D.d7 = await doc('a1', 'health_certificate', 12)   // هيتجدد قبل ما رسالته تطلع
  assert.equal(await queue.recordDocumentExpiryEvents(today), 3)
  assert.deepEqual(await eventKeys(), [`document-expiring:${D.d2.id}:${addDays(today, 10)}:30`, `document-expiring:${D.d7.id}:${addDays(today, 12)}:30`,
    `document-expiring:${D.d1.id}:${addDays(today, 25)}:30`])
  // مهمة التجديد: على دور النوع في فرع الموظف، وميعادها تاريخ الانتهاء، ومن النظام
  const tasks = await repo('Task').find({ order: { id: 'ASC' } })
  assert.equal(tasks.length, 1)
  const task = tasks[0]
  assert.deepEqual([task.title, task.assigneeRole, task.assigneeEmployeeId, task.branchId, String(task.dueDate).slice(0, 10), task.status, task.createdByUserId],
    ['تجديد مستند: إقامة — موظف مستندات a1', 'hr', null, B.a.id, addDays(today, 25), 'OPEN', 0])
  assert.doesNotMatch(task.title, /SECRET-77/)
  assert.deepEqual([await linkOf(D.d1.id), await linkOf(D.d2.id)], [task.id, null])
  assert.equal(Number((await ds.query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'TASK_ASSIGNED' AND [entityId] = @0`, [String(task.id)]))[0].n), 1)
  // نفس اليوم تاني: ولا حدث ولا مهمة
  assert.equal(await queue.recordDocumentExpiryEvents(today), 0)
  assert.equal(await repo('Task').count(), 1)
  // مستند اتجدد بعد الحدث وقبل ما رسالته تطلع: مفيش رسالة عنه
  expect(await call(U.admin, 'PATCH', `/documents/${D.d7.id}`, { expiryDate: addDays(today, 200) }), 200)
  // البريد لصاحب المستند بس، بنوع المستند وتاريخه ومن غير رقمه
  await drain()
  const mails = outbox.map(message => [message.to, message.subject])
  assert.deepEqual(mails.sort(), [[U.other.email, 'مستندك هينتهي: جواز سفر'], [U.owner.email, 'مستندك هينتهي: إقامة']].sort())
  const mine = outbox.find(message => message.to === U.owner.email)
  assert.match(mine.text, new RegExp(`مستندك «إقامة» هينتهي يوم ${addDays(today, 25)}`))
  assert.match(mine.text, /https:\/\/hr\.example\.invalid\/my\/documents/)
  assert.doesNotMatch(JSON.stringify(outbox), /SECRET-77|شهادة صحية/)
  // وجوه النظام العنصر المحسوب القايم لصاحب المستند (من غير عنصر تاني من المحرك)
  const inApp = expect(await call(U.owner, 'GET', '/notifications'), 200)
  const items = (inApp.items ?? inApp).filter(item => item.category === 'document')
  assert.deepEqual(items.map(item => item.id), [`document-expiry-${D.d1.id}-${addDays(today, 25)}`])
  // بعد 20 يوم: d1 وصل تنبيه الـ7 (حدث جديد، والمهمة المفتوحة هي هي)، وd3 وصل تنبيه الـ60 (حدث ومهمة في فرعه)
  assert.equal(await queue.recordDocumentExpiryEvents(addDays(today, 20)), 2)
  assert.deepEqual((await eventKeys()).slice(3).sort(), [`document-expiring:${D.d1.id}:${addDays(today, 25)}:7`, `document-expiring:${D.d3.id}:${addDays(today, 70)}:60`].sort())
  const later = await repo('Task').find({ order: { id: 'ASC' } })
  assert.deepEqual(later.map(row => [row.assigneeRole, row.branchId]), [['hr', B.a.id], ['hr', B.b.id]])
  assert.deepEqual([await linkOf(D.d1.id), await linkOf(D.d3.id)], [task.id, later[1].id])
  // مهمة اتقفلت من غير تجديد (اتلغت): يوم التنبيه الجاي بيفتح مهمة جديدة
  await repo('Task').update({ id: later[1].id }, { status: 'CANCELLED' })
  assert.equal(await queue.recordDocumentExpiryEvents(addDays(today, 45)), 1)
  const reopened = await linkOf(D.d3.id)
  assert.notEqual(reopened, later[1].id)
  assert.equal((await repo('Task').findOneByOrFail({ id: reopened })).status, 'OPEN')
})

test('DX-03: the expiring and expired report follows the branch scope, and renewing a document closes its renewal task', async () => {
  const report = expect(await call(U.admin, 'GET', '/documents/expiry?days=30'), 200)
  assert.deepEqual([report.date, report.days, report.summary], [today, 30, { expired: 1, expiring: 2 }])
  // المنتهي أولًا بالتاريخ؛ من غير المتبدّل، ولا الموظف المؤرشف، ولا اللي برّه المدة
  assert.deepEqual(report.rows.map(row => [row.id, row.state, row.daysLeft, row.typeName, row.branchName]), [
    [D.expired.id, 'EXPIRED', -10, 'رخصة قيادة', 'فرع المستندات أ'], [D.d2.id, 'EXPIRING', 10, 'جواز سفر', 'فرع المستندات أ'], [D.d1.id, 'EXPIRING', 25, 'إقامة', 'فرع المستندات أ']])
  const first = report.rows.find(row => row.id === D.d1.id)
  assert.deepEqual([first.employeeName, first.ownerRole, first.ownerRoleLabel, first.renewalTask.status], ['موظف مستندات a1', 'hr', 'الموارد البشرية', 'OPEN'])
  assert.deepEqual([report.rows[1].ownerRole, report.rows[1].renewalTask], [null, null])
  assert.doesNotMatch(JSON.stringify(report), /SECRET-77|"number"|fileRef/, 'من غير رقم المستند ولا ملفه')
  // نطاق الفرع: حساب الفرع (أ) بيشوف فرعه بس، وفرع غيره مرفوض؛ ومدير النظام بيفلتر بالفرع
  assert.deepEqual(expect(await call(U.hrA, 'GET', '/documents/expiry?days=90'), 200).rows.map(row => row.branchId).filter(id => id !== B.a.id), [])
  expect(await call(U.hrA, 'GET', `/documents/expiry?branchId=${B.b.id}`), 403)
  assert.deepEqual(expect(await call(U.admin, 'GET', `/documents/expiry?days=90&branchId=${B.b.id}`), 200).rows.map(row => row.id), [D.d3.id])
  for (const bad of ['days=0', 'days=366', 'days=x', 'branchId=abc']) expect(await call(U.admin, 'GET', `/documents/expiry?${bad}`), 400)
  expect(await call(U.owner, 'GET', '/documents/expiry'), 403)
  // تعديل من غير تجديد (تاريخ أقرب): المهمة مفتوحة زي ما هي
  const taskId = await linkOf(D.d1.id)
  expect(await call(U.admin, 'PATCH', `/documents/${D.d1.id}`, { expiryDate: addDays(today, 20) }), 200)
  assert.deepEqual([await linkOf(D.d1.id), (await repo('Task').findOneByOrFail({ id: taskId })).status], [taskId, 'OPEN'])
  // التجديد (تاريخ أبعد): المهمة «خلصت» وربطها اتفك، والمستند خرج من التقرير، ومفيش تنبيه جديد لحد ما يقرب تاني
  expect(await call(U.hrA, 'PATCH', `/documents/${D.d1.id}`, { expiryDate: addDays(today, 400) }), 200)
  const closed = await repo('Task').findOneByOrFail({ id: taskId })
  assert.deepEqual([closed.status, closed.statusNote, closed.closedByUserId, await linkOf(D.d1.id)], ['DONE', rules.DOCUMENT_RENEWED_NOTE, U.hrA.id, null])
  assert.equal(expect(await call(U.admin, 'GET', '/documents/expiry?days=30'), 200).rows.some(row => row.id === D.d1.id), false)
  const eventsBefore = (await eventKeys()).length
  assert.equal(await queue.recordDocumentExpiryEvents(today), 0)
  assert.equal((await eventKeys()).length, eventsBefore)
  // ولما التاريخ الجديد يقرب: تنبيه جديد ومهمة جديدة
  assert.equal(await queue.recordDocumentExpiryEvents(addDays(today, 345)) >= 1, true)
  const fresh = await linkOf(D.d1.id)
  assert.ok(fresh && fresh !== taskId)
  // تعديل نوع له انتهاء من غير تاريخ مرفوض (على القيم بعد الدمج)
  const moved = await call(U.admin, 'PATCH', `/documents/${D.plain.id}`, { docType: 'iqama' })
  assert.deepEqual([moved.status, messageOf(moved)], [400, rules.DOCUMENT_EXPIRY_REQUIRED])
})
