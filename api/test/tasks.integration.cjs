'use strict'
// B2.5: محرك المهام على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_tasks_test_<16 hex>).
//  TK-01) مهمة لموظف: بتظهر في «مهامي» بتاعته بس، ويشوفها مسؤولها ومنشئها ومديره المباشر وصاحب «عرض كل المهام» في فرعها — برّه كده 404.
//         وحدثها في الطابور بمراجع بس.
//  TK-02) حدود التكليف: مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، وموظف على رأس العمل، ومن غير كاشف وجود.
//  TK-03) المدير المباشر بيكلّف مرؤوسيه من غير صلاحية، ومش غيرهم ولا نفسه ولا دور. وقايمة «مين أقدر أكلّفه».
//  TK-04) الحالة: المسؤول يبدأ ويعلّق بسبب ويقفل بإثبات (نص أو ملف رفعه هو بنوع task ومش مستعمل)، واللي بيديرها يلغي بسبب ويعيد الفتح
//         بسبب، وإقفالين في نفس اللحظة واحد بس بينجح، ونفس ملف الإثبات لمهمتين في نفس اللحظة واحدة بس بتاخده.
//  TK-05) مهمة الدور: لحاملي الدور اللي فرعها في نطاقهم — مش فرع تاني، ومش مدير النظام في «مهامي» بتاعته.
//  TK-06) «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم بالظبط، والموديول المقفول (أو اللي الحساب برّه
//         جمهوره) مصدره مابيظهرش، ومصدر وقع مابيسيبش وعد مرفوض من غير مستمع.
//  TK-07) «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف على هيكل فيه كل درجات التدرّج.
//  TK-08) قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول.
//  TK-09) التعديل والتحويل للي بيديرها: تحويل المسؤول تكليف جديد واللي حوّلها بيبقى هو اللي كلّف بيها، وتغيير الموعد بيرجّع التذكير.
//  TK-10) التذكير والتصعيد مرة واحدة لكل مهمة وموعد (حتى مع تشغيلات متزامنة)، بأيام الإعدادين، والمقفولة برّه.
//  TK-11) التهيئة وقت التعيين: مهام الموظف الجديد بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة (قفل قاعدة)،
//         وبنفس نافذة «الموظف الجديد» بتاعة الشاشة (ملف بتاريخ التحاق قديم أو من غير تاريخ مالوش مهام).
//  TK-12) ملف الإثبات بيتحمّل بنفس حكم المهمة.
//  TK-13) حدود الإعدادين.
//  TK-14) إشعارات المهام بالبريد: تكليف وتذكير للمسؤول، وتأخير لمديره (ومهمة الدور، أو مدير مالوش حساب، للي كلّف بيها طول ما هو شايفها)
//         — بالعنوان والموعد بس، ولحاملي الدور في نطاقهم بس، وبفحص وقت الإرسال في البريد الفوري والملخص (مهمة اتقفلت أو اتحوّلت أو
//         موعدها اتغيّر)، واختيار المستخدم، والبريد المقفول = ولا صف.
//  TK-15) اللي كلّف بالمهمة بيديرها بحقه دلوقتي: مدير مابقاش مدير مسؤولها، أو صلاحية اتشالت، أو نطاق اتغيّر = لا يشوفها ولا يديرها.
//         والمهمة بتفضل في الفرع اللي اتكلّف فيه لو مسؤولها اتنقل، والمدير المباشر من غير قيد فرع.
//  TK-16) طلبات متزامنة أكتر من اتصالات المجمّع: كل طلب على اتصال معاملته.
//  TK-17) مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server): «فريقي» وقايمة التكليف و«مهامي» شغالين.
// Run (من api/): node --test test/tasks.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')

const database = `hr_tasks_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-tasks-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, queue, tasksService, onboarding, resolver, modules, notifications, created = false, employeeNumber = 0
const FRONTEND = 'https://hr.example.invalid'
// صندوق البريد التجريبي: مقفول (خادم البريد «مش مضبوط») لحد اختبار الإشعارات
const mailbox = { sent: [], configured: false }
const org = {}, users = {}, emps = {}, made = {}

function assertDisposable() {
  assert.match(database, /^hr_tasks_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const token = user => jwt.sign(payloadOf(user))
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
async function setting(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
}
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `TK${String(number).padStart(3, '0')}`, fullName: `موظف المهام ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@tasks.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
// تاريخ محلي بعد (أو قبل) النهارده بأيام
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const mine = async user => expectStatus(await request(user, 'GET', '/tasks/mine'), 200)
const ids = rows => rows.map(row => row.id).sort((a, b) => a - b)
const create = async (user, body) => expectStatus(await request(user, 'POST', '/tasks', body), 201)
const status = (user, id, body) => request(user, 'POST', `/tasks/${id}/status`, body)
const eventsOf = (type, taskId) => query(`SELECT [payload] FROM [outbox_events] WHERE [eventType] = @0 AND [entityType] = N'task' AND [entityId] = @1 ORDER BY [id]`, [type, String(taskId)])
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
function png() {
  const zlib = require('node:zlib')
  const chunk = (kind, data) => {
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(kind), data])) >>> 0)
    return Buffer.concat([length, Buffer.from(kind), data, crc])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0]))), chunk('IEND', Buffer.alloc(0))])
}
async function upload(user, entityType = 'task') {
  const form = new FormData()
  form.append('file', new Blob([png()], { type: 'image/png' }), 'proof.png')
  const response = await fetch(`${base}/files/upload?entityType=${entityType}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  assert.equal(response.status, 201, await response.clone().text())
  return (await response.json()).id
}
const download = async (user, fileId) => (await fetch(`${base}/files/${fileId}`, { headers: { Authorization: `Bearer ${token(user)}` } })).status
// اتصال تاني بيمسك صفوف لحد ما `count` طلب يقفوا عليها وبعدها يسيبها: اللي واقفين بيكمّلوا في نفس اللحظة بالظبط، فالتزامن مضمون مش بالصدفة
async function releaseTogether(lockSql, params, count, start) {
  assertDisposable()
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  let pending = null
  try {
    await holder.query(lockSql, params)
    pending = start()
    let blocked = 0
    for (let waited = 0; waited < 8000 && blocked < count; waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      blocked = Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
    }
    assert.equal(blocked, count, 'الطلبات واقفة على الصفوف الممسوكة')
    await holder.commitTransaction()
    return await pending
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
    if (pending) await pending.catch(() => undefined)
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: `${FRONTEND}/` })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => mailbox.configured
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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  queue = app.get(require('../src/queue/queue.service').QueueService)
  tasksService = app.get(require('../src/tasks/tasks.service').TasksService)
  onboarding = app.get(require('../src/onboarding/onboarding.service').OnboardingService)
  resolver = app.get(require('../src/requests/approver-resolver.service').ApproverResolver, { strict: false })
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)

  org.branchA = await repo('Branch').save({ code: 'TK_A', name: 'فرع المهام أ' })
  org.branchB = await repo('Branch').save({ code: 'TK_B', name: 'فرع المهام ب' })
  emps.manager = await employee()
  emps.w1 = await employee({ managerEmployeeId: emps.manager.id })
  emps.w2 = await employee({ managerEmployeeId: emps.manager.id })
  emps.other = await employee()
  emps.gone = await employee({ managerEmployeeId: emps.manager.id, status: 'terminated', isActive: false })
  emps.bw = await employee({ branchId: org.branchB.id })
  users.admin = await account('admin', 'super_admin', [], { branchId: null })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.w1 = await account('w1', 'employee', [], { employeeId: emps.w1.id })
  users.w2 = await account('w2', 'employee', [], { employeeId: emps.w2.id })
  users.other = await account('other', 'employee', [], { employeeId: emps.other.id })
  users.bw = await account('bw', 'employee', [], { employeeId: emps.bw.id, branchId: org.branchB.id })
  users.hrA = await account('hr-a', 'employee', ['tasks.manage', 'tasks.view_all'])
  users.hrB = await account('hr-b', 'employee', ['tasks.manage', 'tasks.view_all'], { branchId: org.branchB.id })
  users.viewer = await account('viewer', 'employee', ['tasks.view_all'])
  users.itA = await account('it-a', 'employee', ['approve.it'])
  users.itB = await account('it-b', 'employee', ['approve.it'], { branchId: org.branchB.id })
  // صلاحية تعديل الموظفين بتقفل أي مهمة تهيئة من شاشتها، بس مش «جهة» في أي مهمة
  users.hrEdit = await account('hr-edit', 'employee', ['employees.view', 'employees.edit'])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
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
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-tasks-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'tasks fixture cleanup failed')
})

test('TK-01: مهمة لموظف — في «مهامي» بتاعته بس، ويشوفها أصحاب الحق، وبرّه كده 404', async () => {
  for (const [key, value] of [['tasks.reminder_days_before', '1'], ['tasks.escalation_days_after', '3']]) assert.equal((await repo('RequestsConfig').findOneByOrFail({ key })).value, value)
  expectStatus(await request(null, 'GET', '/tasks/mine'), 401)
  assert.deepEqual(await mine(users.w1), { available: true, tasks: [], onboarding: [], clearance: [], counts: { open: 0, overdue: 0 } })
  const task = await create(users.hrA, { title: '  جهّز   ملف التأمين ', description: 'النسخة الورقية', assigneeEmployeeId: emps.w1.id, dueDate: day(5), priority: 'HIGH', requiresProof: true })
  made.first = task
  assert.deepEqual([task.title, task.description, task.assigneeEmployeeId, task.assigneeName, task.assigneeCode, task.assigneeRole, task.branchId, task.branchName, task.createdByName,
    task.dueDate, task.overdue, task.priority, task.status, task.requiresProof, task.proofNote, task.proofFileId, task.canWork, task.canManage],
  ['جهّز ملف التأمين', 'النسخة الورقية', emps.w1.id, emps.w1.fullName, emps.w1.employeeCode, null, org.branchA.id, 'فرع المهام أ', 'حساب hr-a',
    day(5), false, 'HIGH', 'OPEN', true, null, null, false, true])
  // في «مهامي» بتاعة مسؤولها بس
  const inbox = await mine(users.w1)
  assert.deepEqual([ids(inbox.tasks), inbox.counts, inbox.tasks[0].canWork, inbox.tasks[0].canManage], [[task.id], { open: 1, overdue: 0 }, true, false])
  assert.deepEqual(expectStatus(await request(users.w1, 'GET', '/tasks/mine/count'), 200), { open: 1, overdue: 0 })
  for (const user of [users.w2, users.manager, users.hrA, users.viewer, users.admin]) assert.deepEqual((await mine(user)).tasks, [], user.email)
  // يشوفها: مسؤولها، ومنشئها، ومديره المباشر، وصاحب «عرض كل المهام» في فرعها، ومدير النظام
  for (const [user, canWork, canManage] of [[users.w1, true, false], [users.hrA, false, true], [users.manager, false, false], [users.viewer, false, false], [users.admin, false, true]]) {
    const seen = expectStatus(await request(user, 'GET', `/tasks/${task.id}`), 200)
    assert.deepEqual([seen.id, seen.canWork, seen.canManage], [task.id, canWork, canManage], user.email)
  }
  // برّه كده: نفس رد المهمة اللي مالهاش وجود
  const missing = await request(users.hrA, 'GET', '/tasks/999999')
  expectStatus(missing, 404)
  for (const user of [users.w2, users.other, users.hrB, users.bw, users.itA]) {
    const response = await request(user, 'GET', `/tasks/${task.id}`)
    assert.deepEqual([response.status, response.body.message], [404, missing.body.message], user.email)
  }
  // الحدث في نفس معاملة التكليف، بمراجع بس
  const events = await eventsOf('TASK_ASSIGNED', task.id)
  assert.deepEqual(events.map(row => JSON.parse(row.payload)), [{ taskId: task.id, branchId: org.branchA.id }])
})

test('TK-02: حدود التكليف — مسؤول واحد، وفرع من النطاق، وموعد حقيقي مش فايت، ومن غير كاشف وجود', async () => {
  const post = (user, body) => request(user, 'POST', '/tasks', body)
  const before = Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n)
  for (const body of [
    { title: 'ا', assigneeEmployeeId: emps.w1.id },
    { title: 'من غير مسؤول' },
    { title: 'مسؤولين', assigneeEmployeeId: emps.w1.id, assigneeRole: 'it', branchId: org.branchA.id },
    { title: 'دور من غير فرع', assigneeRole: 'it' },
    { title: 'دور في فرع برّه نطاقي', assigneeRole: 'it', branchId: org.branchB.id },
    { title: 'دور مش معروف', assigneeRole: 'ceo', branchId: org.branchA.id },
    { title: 'موعد فات', assigneeEmployeeId: emps.w1.id, dueDate: day(-1) },
    { title: 'يوم مش موجود', assigneeEmployeeId: emps.w1.id, dueDate: '2031-02-30' },
    { title: 'أولوية غلط', assigneeEmployeeId: emps.w1.id, priority: 'URGENT' },
    { title: 'موظف مش على رأس العمل', assigneeEmployeeId: emps.gone.id },
  ]) expectStatus(await post(users.hrA, body), 400)
  // موظف مش موجود وموظف في فرع برّه النطاق: نفس الرد بالحرف
  const unknown = await post(users.hrA, { title: 'موظف مش موجود', assigneeEmployeeId: 999999 })
  const foreign = await post(users.hrA, { title: 'موظف فرع تاني', assigneeEmployeeId: emps.bw.id })
  assert.deepEqual([unknown.status, foreign.status, foreign.body.message], [404, 404, unknown.body.message])
  // من غير صلاحية ومش مديره: نفس الرد سواء الموظف موجود أو لأ، والدور مرفوض
  const denied = await post(users.other, { title: 'مش مديره', assigneeEmployeeId: emps.w1.id })
  const guess = await post(users.other, { title: 'تخمين', assigneeEmployeeId: 999999 })
  assert.deepEqual([denied.status, guess.status, guess.body.message], [403, 403, denied.body.message])
  expectStatus(await post(users.other, { title: 'دور من غير صلاحية', assigneeRole: 'it', branchId: org.branchA.id }), 403)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n), before, 'ولا مهمة اتكتبت من المرفوض')
  // موعد النهارده مقبول
  const today = await create(users.hrA, { title: 'موعدها النهارده', assigneeEmployeeId: emps.w2.id, dueDate: day(0) })
  assert.deepEqual([today.dueDate, today.overdue, today.priority, today.requiresProof], [day(0), false, 'NORMAL', false])
  made.today = today
})

test('TK-03: المدير المباشر بيكلّف مرؤوسيه من غير صلاحية — مش غيرهم ولا نفسه ولا دور', async () => {
  const task = await create(users.manager, { title: 'راجع كشف الجرد', assigneeEmployeeId: emps.w2.id })
  made.byManager = task
  assert.deepEqual([task.assigneeEmployeeId, task.branchId, task.canManage, task.canWork, task.createdByName], [emps.w2.id, org.branchA.id, true, false, 'حساب manager'])
  for (const body of [{ title: 'مش مرؤوسه', assigneeEmployeeId: emps.other.id }, { title: 'نفسه', assigneeEmployeeId: emps.manager.id },
    { title: 'فرع تاني', assigneeEmployeeId: emps.bw.id }, { title: 'دور', assigneeRole: 'it', branchId: org.branchA.id }]) {
    expectStatus(await request(users.manager, 'POST', '/tasks', body), 403)
  }
  // «مين أقدر أكلّفه»: المدير مرؤوسيه اللي على رأس العمل، وصاحب الصلاحية موظفي نطاقه والأدوار وفروعه، وغيرهم ولا حد
  const forManager = expectStatus(await request(users.manager, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([forManager.available, forManager.canManage, forManager.canAssign, ids(forManager.employees), forManager.roles, forManager.branches],
    [true, false, true, [emps.w1.id, emps.w2.id].sort((a, b) => a - b), [], []])
  const forHr = expectStatus(await request(users.hrA, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([forHr.canManage, forHr.canAssign, ids(forHr.employees), forHr.roles.map(role => role.key), forHr.branches],
    [true, true, [emps.manager.id, emps.w1.id, emps.w2.id, emps.other.id].sort((a, b) => a - b), ['hr', 'finance', 'it', 'custody_officer', 'payroll_officer', 'executive'],
      [{ id: org.branchA.id, name: 'فرع المهام أ' }]])
  assert.equal(forHr.roles.find(role => role.key === 'it').label, 'تقنية المعلومات')
  const forOther = expectStatus(await request(users.other, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([forOther.canManage, forOther.canAssign, forOther.employees, forOther.roles, forOther.branches], [false, false, [], [], []])
})

test('TK-04: الحالة — المسؤول يبدأ ويعلّق ويقفل بإثبات، والمنشئ يلغي ويعيد الفتح، وإقفالين في نفس اللحظة واحد بس', async () => {
  const task = made.first
  // مش شايفها أصلًا، وشايفها بس مش عليه ولا بيديرها
  expectStatus(await status(users.w2, task.id, { status: 'IN_PROGRESS' }), 404)
  for (const user of [users.viewer, users.manager, users.hrA]) expectStatus(await status(user, task.id, { status: 'IN_PROGRESS' }), 403)
  expectStatus(await status(users.w1, task.id, { status: 'ARCHIVED' }), 400)
  let now = expectStatus(await status(users.w1, task.id, { status: 'IN_PROGRESS' }), 201)
  assert.deepEqual([now.status, now.statusNote, now.canWork], ['IN_PROGRESS', null, true])
  expectStatus(await status(users.w1, task.id, { status: 'IN_PROGRESS' }), 400)
  expectStatus(await status(users.w1, task.id, { status: 'WAITING' }), 400)
  now = expectStatus(await status(users.w1, task.id, { status: 'WAITING', note: ' مستني رد شركة التأمين ' }), 201)
  assert.deepEqual([now.status, now.statusNote], ['WAITING', 'مستني رد شركة التأمين'])
  assert.deepEqual(ids((await mine(users.w1)).tasks), [task.id], 'المستنية لسه في «مهامي»')
  // الإلغاء وإعادة الفتح مش للمسؤول
  expectStatus(await status(users.w1, task.id, { status: 'CANCELLED', note: 'مش عايز' }), 403)
  // مطلوب إثبات: من غيره مرفوض
  const noProof = await status(users.w1, task.id, { status: 'DONE' })
  assert.deepEqual([noProof.status, messageOf(noProof)], [400, 'المهمة دي مطلوب لها إثبات: اكتب اللي اتعمل أو ارفع ملف'])
  now = expectStatus(await status(users.w1, task.id, { status: 'DONE', proofNote: ' اتبعت الملف للشركة ورقم الاستلام 7781 ' }), 201)
  assert.deepEqual([now.status, now.proofNote, now.proofFileId, now.statusNote, now.closedByName, now.canWork], ['DONE', 'اتبعت الملف للشركة ورقم الاستلام 7781', null, null, 'حساب w1', false])
  assert.ok(now.closedAt)
  assert.deepEqual((await mine(users.w1)).tasks, [])
  // مقفولة: مفيش تغيير غير إعادة الفتح، وإعادة الفتح للمنشئ أو صاحب الصلاحية
  for (const next of ['IN_PROGRESS', 'WAITING', 'CANCELLED']) expectStatus(await status(next === 'CANCELLED' ? users.hrA : users.w1, task.id, { status: next, note: 'سبب' }), 400)
  expectStatus(await status(users.w1, task.id, { status: 'OPEN' }), 403)
  // إعادة الفتح بتشيل إثبات الإقفال اللي فات، فسببها إلزامي — والمرفوض مابيغيّرش حاجة
  const noReason = await status(users.hrA, task.id, { status: 'OPEN' })
  assert.deepEqual([noReason.status, messageOf(noReason)], [400, 'اكتب سبب إعادة فتح المهمة'])
  assert.deepEqual((({ status, proofNote }) => [status, proofNote])(await repo('Task').findOneByOrFail({ id: task.id })), ['DONE', 'اتبعت الملف للشركة ورقم الاستلام 7781'])
  now = expectStatus(await status(users.hrA, task.id, { status: 'OPEN', note: 'الرقم غلط' }), 201)
  assert.deepEqual([now.status, now.statusNote, now.proofNote, now.proofFileId, now.closedAt, now.closedByName], ['OPEN', 'الرقم غلط', null, null, null, null])
  expectStatus(await status(users.hrA, task.id, { status: 'OPEN' }), 400)

  // الإثبات بملف: رفعه اللي بيقفل، بنوع task، ومش مستعمل في مهمة تانية
  const foreignFile = await upload(users.w2), wrongType = await upload(users.w1, 'document'), proof = await upload(users.w1)
  for (const proofFileId of [foreignFile, wrongType, 999999]) {
    const response = await status(users.w1, task.id, { status: 'DONE', proofFileId })
    assert.deepEqual([response.status, messageOf(response)], [400, 'ملف الإثبات غير صالح — ارفعه من شاشة المهمة'], String(proofFileId))
  }
  now = expectStatus(await status(users.w1, task.id, { status: 'DONE', proofFileId: proof }), 201)
  assert.deepEqual([now.status, now.proofFileId, now.proofNote], ['DONE', proof, null])
  made.proofFile = proof
  const second = await create(users.hrA, { title: 'مهمة تانية بإثبات', assigneeEmployeeId: emps.w1.id, requiresProof: true })
  const reused = await status(users.w1, second.id, { status: 'DONE', proofFileId: proof })
  assert.deepEqual([reused.status, messageOf(reused)], [400, 'ملف الإثبات مستعمل في مهمة تانية'])
  // نفس الملف لمهمتين في نفس اللحظة: واحدة بس بتاخده. اتصال تاني ماسك صف الملف لحد ما الإقفالين يقفوا عليه، وبعدها بيسيبه
  const shared = await upload(users.w1)
  const pair = [await create(users.hrA, { title: 'إثبات مشترك أ', assigneeEmployeeId: emps.w1.id }), await create(users.hrA, { title: 'إثبات مشترك ب', assigneeEmployeeId: emps.w1.id })]
  const both = await releaseTogether('UPDATE [stored_files] SET [entityType] = [entityType] WHERE [id] = @0', [shared], 2,
    () => Promise.all(pair.map(row => status(users.w1, row.id, { status: 'DONE', proofFileId: shared }))))
  assert.deepEqual(both.map(response => response.status).sort(), [201, 400])
  assert.equal(messageOf(both.find(response => response.status === 400)), 'ملف الإثبات مستعمل في مهمة تانية')
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [tasks] WHERE [proofFileId] = @0', [shared]))[0].n), 1)
  // المنشئ يلغي بسبب، والملغية مابتتقفلش
  expectStatus(await status(users.hrA, second.id, { status: 'CANCELLED' }), 400)
  now = expectStatus(await status(users.hrA, second.id, { status: 'CANCELLED', note: 'اتلغى الطلب' }), 201)
  assert.deepEqual([now.status, now.statusNote, now.closedByName], ['CANCELLED', 'اتلغى الطلب', 'حساب hr-a'])
  expectStatus(await status(users.w1, second.id, { status: 'DONE', proofNote: 'خلصت' }), 400)
  // المنشئ يقدر يقفل هو كمان (بالإثبات لو مطلوب)، والمهمة من غير إثبات بتتقفل من غيره
  const plain = await create(users.hrA, { title: 'من غير إثبات', assigneeEmployeeId: emps.w1.id })
  expectStatus(await status(users.hrA, plain.id, { status: 'DONE' }), 201)
  // إقفالين في نفس اللحظة: واحد بس
  const race = await create(users.hrA, { title: 'سباق الإقفال', assigneeEmployeeId: emps.w1.id })
  const results = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [race.id], 2,
    () => Promise.all([status(users.w1, race.id, { status: 'DONE', proofNote: 'أ' }), status(users.hrA, race.id, { status: 'DONE', proofNote: 'ب' })]))
  assert.deepEqual(results.map(response => response.status).sort(), [201, 400])
})

test('TK-05: مهمة الدور — لحاملي الدور اللي فرعها في نطاقهم، ومش مدير النظام في «مهامي» بتاعته', async () => {
  const task = await create(users.hrA, { title: 'جهّز لابتوب للموظف الجديد', assigneeRole: 'it', branchId: org.branchA.id, requiresProof: true })
  made.role = task
  assert.deepEqual([task.assigneeEmployeeId, task.assigneeName, task.assigneeRole, task.assigneeRoleLabel, task.branchId], [null, null, 'it', 'تقنية المعلومات', org.branchA.id])
  assert.deepEqual(ids((await mine(users.itA)).tasks), [task.id])
  for (const user of [users.itB, users.admin, users.hrA, users.w1]) assert.equal((await mine(user)).tasks.some(row => row.id === task.id), false, user.email)
  expectStatus(await request(users.itB, 'GET', `/tasks/${task.id}`), 404)
  expectStatus(await status(users.itB, task.id, { status: 'IN_PROGRESS' }), 404)
  // مدير النظام شايفها في قايمة كل المهام ويقدر يديرها
  assert.ok(expectStatus(await request(users.admin, 'GET', '/tasks'), 200).tasks.some(row => row.id === task.id && row.canManage && !row.canWork))
  const done = expectStatus(await status(users.itA, task.id, { status: 'DONE', proofNote: 'اتسلّم' }), 201)
  assert.deepEqual([done.status, done.closedByName], ['DONE', 'حساب it-a'])
  assert.deepEqual((await mine(users.itA)).tasks, [])
})

test('TK-06: «مهامي» فيها مهام التهيئة اللي على جهتي وبنود الإخلاء اللي عليّ بنفس حكم شاشاتهم', async () => {
  // موظف جديد مديره المباشر «manager»: مهامه من القالب الافتراضي
  const fresh = await employee({ joinDate: day(0), managerEmployeeId: emps.manager.id })
  await onboarding.materializeHired(fresh.id)
  const rows = await repo('OnboardingTask').find({ where: { employeeId: fresh.id }, order: { id: 'ASC' } })
  assert.ok(rows.length >= 8)
  const partyIds = party => rows.filter(row => row.party === party && row.status === 'PENDING').map(row => row.id).sort((a, b) => a - b)
  const onboardingIds = async user => (await mine(user)).onboarding.map(row => row.taskId).sort((a, b) => a - b)
  assert.deepEqual(await onboardingIds(users.itA), partyIds('it'))
  assert.deepEqual(await onboardingIds(users.manager), partyIds('manager'))
  assert.ok(partyIds('it').length >= 1 && partyIds('manager').length >= 1)
  for (const user of [users.itB, users.w1, users.hrEdit, users.admin]) assert.deepEqual(await onboardingIds(user), [], user.email)
  const [shown] = (await mine(users.itA)).onboarding
  assert.deepEqual(Object.keys(shown).sort(), ['dueDate', 'employeeCode', 'employeeId', 'employeeName', 'label', 'party', 'taskId'])
  assert.deepEqual([shown.employeeId, shown.employeeName, shown.party], [fresh.id, fresh.fullName, 'it'])
  // نفس حكم شاشة التهيئة: اللي الحساب يقدر يقفله هناك كجهة هو اللي في «مهامي»
  const screen = expectStatus(await request(users.itA, 'GET', '/onboarding'), 200)
  const actionable = screen.employees.flatMap(row => row.tasks).filter(task => task.canAct && task.status === 'PENDING').map(task => task.id).sort((a, b) => a - b)
  assert.deepEqual(await onboardingIds(users.itA), actionable)
  // صلاحية تعديل الموظفين بتقفل أي مهمة من شاشة التهيئة، بس مش كل المهام «عليها»
  const hrScreen = expectStatus(await request(users.hrEdit, 'GET', '/onboarding'), 200)
  assert.ok(hrScreen.employees.find(row => row.id === fresh.id).tasks.every(task => task.canAct))
  // بتتقفل من شاشتها، وبتختفي من «مهامي»
  expectStatus(await request(users.itA, 'PATCH', `/onboarding/tasks/${partyIds('it')[0]}`, { status: 'DONE' }), 200)
  assert.deepEqual(await onboardingIds(users.itA), partyIds('it').slice(1))
  // موظف انتهت خدمته: مهام تهيئته مابقتش على حد
  await repo('Employee').update({ id: fresh.id }, { status: 'terminated' })
  assert.deepEqual([await onboardingIds(users.manager), (await mine(users.manager)).counts.open], [[], 0])
  await repo('Employee').update({ id: fresh.id }, { status: 'active' })
  assert.deepEqual(await onboardingIds(users.manager), partyIds('manager'))

  // ملف إنهاء خدمة جاري لمرؤوس «manager»: بنوده الخمسة على جهاتها
  const kase = await repo('OffboardingCase').save({ employeeId: emps.w2.id, lastWorkingDay: day(20), status: 'IN_CLEARANCE', terminationReason: 'termination' })
  const items = {}
  for (const party of ['manager', 'custody', 'it', 'finance', 'hr']) items[party] = await repo('ClearanceItem').save({ caseId: kase.id, party, label: `بند ${party}`, status: 'PENDING' })
  const clearanceIds = async user => (await mine(user)).clearance.map(row => row.itemId).sort((a, b) => a - b)
  assert.deepEqual(await clearanceIds(users.itA), [items.it.id])
  assert.deepEqual(await clearanceIds(users.manager), [items.manager.id])
  for (const user of [users.itB, users.w1, users.other]) assert.deepEqual(await clearanceIds(user), [], user.email)
  // بالظبط اللي «بنودي في الإخلاء» بترجّعه
  for (const user of [users.itA, users.manager, users.hrA, users.w1]) {
    assert.deepEqual((await mine(user)).clearance, expectStatus(await request(user, 'GET', '/offboarding/my-items'), 200), user.email)
  }
  // مدير النظام يقدر يقفل بند أي جهة بصلاحيتها («بنودي في الإخلاء» بتدّيله الأربعة؛ بند المدير المباشر هيكلي)، بس في «مهامي» مش كل بنود الشركة عليه — زي مهام الأدوار
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', '/offboarding/my-items'), 200).map(row => row.party).sort(), ['custody', 'finance', 'hr', 'it'])
  assert.deepEqual(await clearanceIds(users.admin), [])
  // ولو هو المدير المباشر لصاحب الملف: بند المدير عليه
  const boss = await account('boss', 'super_admin', [], { branchId: null, employeeId: emps.manager.id })
  assert.deepEqual(await clearanceIds(boss), [items.manager.id])
  assert.deepEqual(await onboardingIds(boss), partyIds('manager'))
  // العدّاد: التلاتة مع بعض
  const inbox = await mine(users.itA)
  assert.equal(inbox.counts.open, inbox.tasks.length + inbox.onboarding.length + inbox.clearance.length)
  assert.ok(inbox.onboarding.length + inbox.clearance.length >= 1)
  assert.deepEqual(expectStatus(await request(users.itA, 'GET', '/tasks/mine/count'), 200), inbox.counts)
  // موديول مقفول = مصدره مابيظهرش، والباقي زي ما هو
  await modules.setModule(payloadOf(users.admin), 'offboarding', { enabled: false })
  try {
    const without = await mine(users.itA)
    assert.deepEqual([without.clearance, without.onboarding.length, without.counts.open], [[], inbox.onboarding.length, inbox.counts.open - inbox.clearance.length])
  } finally { await modules.setModule(payloadOf(users.admin), 'offboarding', { enabled: true }) }
  assert.deepEqual(await clearanceIds(users.itA), [items.it.id])
  // جمهور الموديول: التهيئة مفتوحة لفرع «ب» بس = حساب في فرع «أ» مصدر التهيئة مابيظهرلوش، والإخلاء زي ما هو
  assert.ok((await onboardingIds(users.manager)).length >= 1)
  await modules.setModule(payloadOf(users.admin), 'onboarding', { audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchB.id] } } })
  try {
    const narrowed = await mine(users.manager)
    assert.deepEqual([narrowed.onboarding, narrowed.clearance.map(row => row.itemId)], [[], [items.manager.id]])
  } finally { await modules.setModule(payloadOf(users.admin), 'onboarding', { audience: null }) }
  assert.deepEqual(await onboardingIds(users.manager), partyIds('manager'))
  // مصدر وقع وإحنا لسه بنسأل عن الموديولات: الخطأ بيرجع للطالب من غير وعد مرفوض مالوش مستمع (كان بيوقّع الخادم)
  const unhandled = []
  const onUnhandled = reason => unhandled.push(reason)
  process.on('unhandledRejection', onUnhandled)
  const allowedFor = modules.allowedFor
  tasksService.myOpenTasks = () => Promise.reject(new Error('مصدر المهام وقع'))
  modules.allowedFor = async (...args) => { await new Promise(resolve => setTimeout(resolve, 80)); return allowedFor.apply(modules, args) }
  try {
    await assert.rejects(tasksService.mine(payloadOf(users.w1)), /مصدر المهام وقع/)
    await new Promise(resolve => setTimeout(resolve, 80))
  } finally {
    delete tasksService.myOpenTasks
    delete modules.allowedFor
    process.off('unhandledRejection', onUnhandled)
  }
  assert.deepEqual([unhandled, typeof tasksService.myOpenTasks, modules.allowedFor === allowedFor], [[], 'function', true])
  await repo('OffboardingCase').update({ id: kase.id }, { status: 'CANCELLED' })
  await repo('OnboardingTask').update({ employeeId: fresh.id }, { status: 'DONE' })
})

test('TK-07: «فريقي» لمرؤوسي المدير المباشرين، و«مرؤوسي المدير» بنفس حكم «المدير المباشر» بالحرف', async () => {
  const team = expectStatus(await request(users.manager, 'GET', '/tasks/team'), 200)
  assert.equal(team.manager, true)
  // مهام w1 وw2 المفتوحة واللي اتقفلت قريب — ومفيش مهمة لحد برّه مرؤوسيه
  assert.ok(team.tasks.length >= 4)
  assert.ok(team.tasks.every(row => [emps.w1.id, emps.w2.id].includes(row.assigneeEmployeeId)))
  assert.ok(team.tasks.some(row => row.id === made.first.id && row.status === 'DONE') && team.tasks.some(row => row.id === made.byManager.id && row.canManage))
  // المفتوح الأول
  const firstClosed = team.tasks.findIndex(row => ['DONE', 'CANCELLED'].includes(row.status))
  assert.ok(team.tasks.slice(firstClosed).every(row => ['DONE', 'CANCELLED'].includes(row.status)))
  assert.deepEqual(expectStatus(await request(users.w1, 'GET', '/tasks/team'), 200), { manager: false, tasks: [] })
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', '/tasks/team'), 200), { manager: false, tasks: [] })

  // هيكل فيه كل درجات التدرّج: مدير مسجّل في الملف، وقائد فريق، ورئيس قسم، ومدير فرع، واللي هو نفسه رئيس وحدته
  const branch = await repo('Branch').save({ code: 'TK_H', name: 'فرع الهيكل' })
  const person = extra => employee({ branchId: branch.id, ...extra })
  const branchHead = await person(), deptHead = await person(), lead = await person(), named = await person()
  await repo('Branch').update({ id: branch.id }, { managerEmployeeId: branchHead.id })
  const dept = await repo('Department').save({ name: 'قسم الهيكل', code: 'TK_D', branchId: branch.id, managerEmployeeId: deptHead.id })
  const emptyDept = await repo('Department').save({ name: 'قسم من غير رئيس', code: 'TK_D2', branchId: branch.id })
  const squad = await repo('Team').save({ name: 'فريق الهيكل', code: 'TK_T', departmentId: dept.id, leaderEmployeeId: lead.id })
  const noLead = await repo('Team').save({ name: 'فريق من غير قائد', code: 'TK_T2', departmentId: dept.id })
  await repo('Employee').update({ id: deptHead.id }, { departmentId: dept.id })
  await repo('Employee').update({ id: lead.id }, { departmentId: dept.id, teamId: squad.id })
  const people = [branchHead, deptHead, lead, named,
    await person({ departmentId: dept.id, teamId: squad.id }), await person({ departmentId: dept.id, teamId: noLead.id }), await person({ departmentId: dept.id }),
    await person({ departmentId: emptyDept.id }), await person(), await person({ departmentId: dept.id, teamId: squad.id, managerEmployeeId: named.id }),
    await person({ managerEmployeeId: named.id, status: 'terminated', isActive: false })]
  const everyone = [...people.map(row => row.id), emps.manager.id, emps.w1.id, emps.w2.id, emps.other.id, emps.bw.id]
  let reporting = 0
  for (const managerId of everyone) {
    const reports = (await resolver.directReportsOf(managerId)).sort((a, b) => a - b)
    const expected = []
    for (const employeeId of everyone) if (employeeId !== managerId && (await resolver.directManagerOf(employeeId)) === managerId) expected.push(employeeId)
    // برّه قايمة الاختبار ممكن يكون فيه موظفين تانيين (من اختبارات قبل كده) — المقارنة جوّاها
    assert.deepEqual(reports.filter(id => everyone.includes(id)), expected.sort((a, b) => a - b), `مرؤوسي #${managerId}`)
    reporting += expected.length
  }
  assert.ok(reporting >= 12, 'الهيكل فيه علاقات من كل الدرجات')
  assert.deepEqual((await resolver.directReportsOf(lead.id)).length, 1, 'قائد الفريق: عضو فريقه اللي مالوش مدير مسجّل بس')
  assert.ok((await resolver.directReportsOf(deptHead.id)).includes(lead.id), 'قائد الفريق نفسه بيتبع رئيس القسم')
  assert.ok((await resolver.directReportsOf(branchHead.id)).includes(deptHead.id), 'رئيس القسم نفسه بيتبع مدير الفرع')
  assert.deepEqual(await resolver.directReportsOf(999999), [])
  // مدير مسجّل بصفر (العمود مالوش مفتاح أجنبي) = من غير مدير مسجّل عند الاتنين
  const zero = await person({ departmentId: dept.id, teamId: squad.id, managerEmployeeId: 0 })
  assert.deepEqual([await resolver.directManagerOf(zero.id), (await resolver.directReportsOf(lead.id)).includes(zero.id)], [lead.id, true])
})

test('TK-08: قايمة كل المهام بصلاحيتها وفي نطاق الفروع، بفلاتر الحالة والمتأخر والمسؤول', async () => {
  const foreign = await create(users.hrB, { title: 'مهمة فرع ب', assigneeEmployeeId: emps.bw.id })
  made.foreign = foreign
  for (const user of [users.w1, users.manager, users.itA]) expectStatus(await request(user, 'GET', '/tasks'), 403)
  const list = async (user, search = '') => expectStatus(await request(user, 'GET', `/tasks${search}`), 200).tasks
  const open = await list(users.viewer)
  assert.ok(open.length >= 2 && open.every(row => row.branchId === org.branchA.id && ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(row.status)))
  assert.equal(open.some(row => row.id === foreign.id), false, 'فرع تاني برّه القايمة')
  assert.deepEqual(ids(await list(users.hrB)), [foreign.id])
  assert.ok((await list(users.admin)).some(row => row.id === foreign.id))
  // فلتر الفرع مايوسّعش النطاق
  assert.deepEqual(await list(users.viewer, `?branchId=${org.branchB.id}`), [])
  const done = await list(users.viewer, '?status=done'), cancelled = await list(users.viewer, '?status=cancelled'), all = await list(users.viewer, '?status=all')
  assert.ok(done.length >= 3 && done.every(row => row.status === 'DONE'))
  assert.ok(cancelled.length >= 1 && cancelled.every(row => row.status === 'CANCELLED'))
  assert.equal(all.length, open.length + done.length + cancelled.length)
  assert.deepEqual(ids(await list(users.viewer, `?assigneeEmployeeId=${emps.w2.id}`)), [made.today.id, made.byManager.id].sort((a, b) => a - b))
  // المتأخر: مفتوحة وموعدها فات
  assert.deepEqual(await list(users.viewer, '?overdue=1'), [])
  await repo('Task').update({ id: made.byManager.id }, { dueDate: day(-2) })
  const overdue = await list(users.viewer, '?overdue=1')
  assert.deepEqual([ids(overdue), overdue[0].overdue], [[made.byManager.id], true])
  assert.deepEqual((await mine(users.w2)).counts, { open: 2, overdue: 1 })
  // مهمة مقفولة موعدها فات مش «متأخرة»
  await repo('Task').update({ id: made.first.id }, { dueDate: day(-9) })
  assert.deepEqual(ids(await list(users.viewer, '?overdue=1')), [made.byManager.id])
})

test('TK-09: التعديل والتحويل للمنشئ أو صاحب الصلاحية — التحويل تكليف جديد، وتغيير الموعد بيرجّع التذكير', async () => {
  const task = await create(users.hrA, { title: 'مهمة للتعديل', assigneeEmployeeId: emps.w1.id, dueDate: day(3) })
  const patch = (user, body, id = task.id) => request(user, 'PATCH', `/tasks/${id}`, body)
  expectStatus(await patch(users.w2, { title: 'مش شايفها' }), 404)
  for (const user of [users.w1, users.manager, users.viewer]) expectStatus(await patch(user, { title: 'مش بيديرها' }), 403)
  for (const body of [{ title: 'ا' }, { dueDate: day(-3) }, { dueDate: '2031-13-01' }, { priority: 'URGENT' }, { assigneeEmployeeId: emps.bw.id }, { assigneeRole: 'it' }]) {
    assert.ok([400, 404].includes((await patch(users.hrA, body)).status), JSON.stringify(body))
  }
  // null في الأولوية والإثبات = الخانة مش مبعوتة (مش خطأ خادم)
  let now = expectStatus(await patch(users.hrA, { priority: null, requiresProof: null }), 200)
  assert.deepEqual([now.priority, now.requiresProof], ['NORMAL', false])
  await repo('Task').update({ id: task.id }, { remindedAt: new Date(), escalatedAt: new Date(), status: 'WAITING', statusNote: 'مستنية' })
  // تعديل من غير تغيير الموعد ولا المسؤول: التذكير والحالة زي ما هم
  now = expectStatus(await patch(users.hrA, { title: ' عنوان   جديد ', description: null, priority: 'LOW', requiresProof: true }), 200)
  assert.deepEqual([now.title, now.description, now.priority, now.requiresProof, now.status, now.dueDate], ['عنوان جديد', null, 'LOW', true, 'WAITING', day(3)])
  let row = await repo('Task').findOneByOrFail({ id: task.id })
  assert.ok(row.remindedAt && row.escalatedAt)
  // نفس الموعد = مفيش تغيير؛ موعد جديد = التذكير والتصعيد من الأول
  now = expectStatus(await patch(users.hrA, { dueDate: day(3) }), 200)
  assert.ok((await repo('Task').findOneByOrFail({ id: task.id })).remindedAt)
  now = expectStatus(await patch(users.hrA, { dueDate: day(8) }), 200)
  row = await repo('Task').findOneByOrFail({ id: task.id })
  assert.deepEqual([now.dueDate, row.remindedAt, row.escalatedAt, row.status], [day(8), null, null, 'WAITING'])
  // التحويل: مسؤول جديد، والحالة بترجع «مفتوحة»، وحدث تكليف جديد
  now = expectStatus(await patch(users.hrA, { assigneeEmployeeId: emps.w2.id }), 200)
  assert.deepEqual([now.assigneeEmployeeId, now.status, now.statusNote], [emps.w2.id, 'OPEN', null])
  assert.equal((await eventsOf('TASK_ASSIGNED', task.id)).length, 2)
  assert.equal((await mine(users.w1)).tasks.some(entry => entry.id === task.id), false)
  assert.ok((await mine(users.w2)).tasks.some(entry => entry.id === task.id))
  // لدور وبالعكس
  now = expectStatus(await patch(users.hrA, { assigneeRole: 'it', branchId: org.branchA.id }), 200)
  assert.deepEqual([now.assigneeEmployeeId, now.assigneeRole], [null, 'it'])
  assert.ok((await mine(users.itA)).tasks.some(entry => entry.id === task.id))
  now = expectStatus(await patch(users.hrA, { assigneeEmployeeId: emps.w1.id }), 200)
  assert.deepEqual([now.assigneeEmployeeId, now.assigneeRole], [emps.w1.id, null])
  assert.equal((await eventsOf('TASK_ASSIGNED', task.id)).length, 4)
  // موعد قديم محفوظ (فات) مايمنعش تعديل تاني، والموعد بيتشال بـnull
  await repo('Task').update({ id: task.id }, { dueDate: day(-1) })
  expectStatus(await patch(users.hrA, { dueDate: day(-1), title: 'لسه بنفس الموعد' }), 200)
  now = expectStatus(await patch(users.hrA, { dueDate: null }), 200)
  assert.equal(now.dueDate, null)
  // المدير اللي أنشأ مهمة مرؤوسه يعدّلها ويلغيها، ومايحوّلهاش لحد مش مرؤوسه
  expectStatus(await patch(users.manager, { title: 'عدّلها مديره' }, made.byManager.id), 200)
  expectStatus(await patch(users.manager, { assigneeEmployeeId: emps.other.id }, made.byManager.id), 403)
  // اللي يحوّل المهمة بيبقى هو اللي كلّف بيها. اللي كلّف نفسه لما يحوّلها لمرؤوس تاني: لسه هو
  now = expectStatus(await patch(users.manager, { assigneeEmployeeId: emps.w1.id }, made.byManager.id), 200)
  assert.deepEqual([now.assigneeEmployeeId, now.createdByName, now.canManage], [emps.w1.id, 'حساب manager', true])
  // صاحب الصلاحية حوّلها لمرؤوس تاني للمدير: المدير لسه شايفها (مدير مسؤولها) بس مابقاش بيديرها
  now = expectStatus(await patch(users.hrA, { assigneeEmployeeId: emps.w2.id }, made.byManager.id), 200)
  assert.deepEqual([now.assigneeEmployeeId, now.createdByName, now.canManage], [emps.w2.id, 'حساب hr-a', true])
  assert.deepEqual((({ canManage, canWork }) => [canManage, canWork])(expectStatus(await request(users.manager, 'GET', `/tasks/${made.byManager.id}`), 200)), [false, false])
  expectStatus(await patch(users.manager, { title: 'مابقاش بيديرها' }, made.byManager.id), 403)
  // وحوّلها لموظف مش مرؤوسه: اللي كلّف بيها زمان مابقاش يشوفها ولا اسم مسؤولها الجديد
  expectStatus(await patch(users.hrA, { assigneeEmployeeId: emps.other.id }, made.byManager.id), 200)
  expectStatus(await request(users.manager, 'GET', `/tasks/${made.byManager.id}`), 404)
  expectStatus(await patch(users.manager, { title: 'مابقتش بتاعته' }, made.byManager.id), 404)
  assert.equal(expectStatus(await request(users.manager, 'GET', '/tasks/team'), 200).tasks.some(row => row.id === made.byManager.id), false)
  // المقفولة مابتتعدّلش
  expectStatus(await status(users.hrA, task.id, { status: 'CANCELLED', note: 'خلاص' }), 201)
  expectStatus(await patch(users.hrA, { title: 'بعد القفل' }), 400)
  made.edited = task
})

test('TK-10: التذكير والتصعيد مرة واحدة لكل مهمة وموعد، بأيام الإعدادين، والمقفولة برّه', async () => {
  // تصفير: المهام المفتوحة الموجودة من غير موعد
  await query('UPDATE [tasks] SET [dueDate] = NULL, [remindedAt] = NULL, [escalatedAt] = NULL')
  const make = async (title, offset) => {
    const task = await create(users.hrA, { title, assigneeEmployeeId: emps.w1.id })
    await repo('Task').update({ id: task.id }, { dueDate: day(offset) })
    return task
  }
  const far = await make('موعدها بعيد', 5), soon = await make('موعدها بكرة', 1), today = await make('موعدها النهارده', 0)
  const late = await make('متأخرة يومين', -2), veryLate = await make('متأخرة 3 أيام', -3), closed = await make('اتقفلت', 1)
  expectStatus(await status(users.w1, closed.id, { status: 'DONE' }), 201)
  assert.deepEqual(await tasksService.runReminders(), { reminded: 2, escalated: 1 })
  const stamps = async task => { const row = await repo('Task').findOneByOrFail({ id: task.id }); return [!!row.remindedAt, !!row.escalatedAt] }
  assert.deepEqual([await stamps(far), await stamps(soon), await stamps(today), await stamps(late), await stamps(veryLate), await stamps(closed)],
    [[false, false], [true, false], [true, false], [false, false], [false, true], [false, false]])
  const counts = async task => [(await eventsOf('TASK_DUE_SOON', task.id)).length, (await eventsOf('TASK_OVERDUE', task.id)).length]
  assert.deepEqual([await counts(far), await counts(soon), await counts(today), await counts(late), await counts(veryLate), await counts(closed)],
    [[0, 0], [1, 0], [1, 0], [0, 0], [0, 1], [0, 0]])
  assert.deepEqual(JSON.parse((await eventsOf('TASK_OVERDUE', veryLate.id))[0].payload), { taskId: veryLate.id, branchId: org.branchA.id })
  // مرة واحدة: تشغيل تاني مابيكررش
  assert.deepEqual(await tasksService.runReminders(), { reminded: 0, escalated: 0 })
  // تشغيلين في نفس اللحظة: كل مهمة بتتذكّر وتتصعّد مرة واحدة (الحكم تحت قفل صفها)
  const twins = [await make('تذكير مرة واحدة', 1), await make('تصعيد مرة واحدة', -6)]
  const runs = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [twins[0].id], 3,
    () => Promise.all([tasksService.runReminders(), tasksService.runReminders(), tasksService.runReminders()]))
  assert.deepEqual([runs.reduce((sum, run) => sum + run.reminded, 0), runs.reduce((sum, run) => sum + run.escalated, 0)], [1, 1])
  assert.deepEqual([await counts(twins[0]), await counts(twins[1])], [[1, 0], [0, 1]])
  // بكرة: المتأخرة يومين بقت 3 فبتتصعّد، واللي موعدها بعيد لسه
  assert.deepEqual(await tasksService.runReminders(day(1)), { reminded: 0, escalated: 1 })
  assert.deepEqual(await counts(late), [0, 1])
  // الإعدادين: تذكير قبلها بخمس أيام، ومن غير تصعيد
  await setting('tasks.reminder_days_before', '5')
  await setting('tasks.escalation_days_after', '0')
  // (واللي موعدها النهارده بتتذكّر بس: «من غير تصعيد» مش «تصعيد من أول يوم»)
  const other = await make('متأخرة أسبوع', -7), atZero = await make('موعدها النهارده والتصعيد مقفول', 0)
  assert.deepEqual(await tasksService.runReminders(), { reminded: 2, escalated: 0 })
  assert.deepEqual([await counts(far), await counts(other), await counts(atZero)], [[1, 0], [0, 0], [1, 0]])
  // قيمة غلط متخزنة = الافتراضي (يوم واحد و3 أيام)
  await setting('tasks.reminder_days_before', 'oops')
  await setting('tasks.escalation_days_after', '-4')
  const fallback = await make('بعد يومين', 2)
  assert.deepEqual(await tasksService.runReminders(), { reminded: 0, escalated: 1 })
  assert.deepEqual([await counts(fallback), await counts(other)], [[0, 0], [0, 1]])
  // تغيير الموعد بيرجّع التذكير
  await setting('tasks.reminder_days_before', '1')
  await setting('tasks.escalation_days_after', '3')
  expectStatus(await request(users.hrA, 'PATCH', `/tasks/${soon.id}`, { dueDate: day(0) }), 200)
  assert.deepEqual(await tasksService.runReminders(), { reminded: 1, escalated: 0 })
  assert.deepEqual(await counts(soon), [2, 0])
  // إعادة فتح مقفولة موعدها قرّب بترجّع تذكيرها
  expectStatus(await status(users.hrA, closed.id, { status: 'OPEN', note: 'محتاجة تتراجع' }), 201)
  assert.deepEqual(await tasksService.runReminders(), { reminded: 1, escalated: 0 })
  assert.deepEqual(await counts(closed), [1, 0])
})

test('TK-11: التهيئة وقت التعيين — المهام بتتعمل من حدث التعيين من غير فتح الشاشة، ومرة واحدة حتى مع نداءات متزامنة', async () => {
  const template = await repo('OnboardingTemplateItem').count({ where: { isActive: true } })
  assert.ok(template >= 8)
  const templateTasks = async employeeId => Number((await query(`SELECT COUNT(*) AS [n] FROM [onboarding_tasks] WHERE [employeeId] = @0 AND [systemKey] IS NULL`, [employeeId]))[0].n)
  // تعيين من الشاشة: الحدث بيتسجل مع الإنشاء، والطابور بيعمل المهام
  await drain()
  const hired = expectStatus(await request(users.admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, org.branchA.id)), employeeCode: 'TKHIRE1', fullName: 'موظف اتعيّن النهارده',
    branchId: org.branchA.id, joinDate: day(0), basicSalary: 5000, currency: 'SAR' }), 201)
  assert.equal(await templateTasks(hired.id), 0, 'قبل ما الطابور يشتغل مفيش مهام')
  await drain()
  assert.equal(await templateTasks(hired.id), template)
  const [job] = await query(`SELECT TOP (1) [status] FROM [jobs_queue] WHERE [jobType] = N'onboarding.materialize' ORDER BY [id] DESC`)
  assert.equal(job.status, 'DONE')
  // فتح الشاشة بعدها (وتكرار الحدث) مابيكررش
  expectStatus(await request(users.admin, 'GET', '/onboarding'), 200)
  await onboarding.materializeHired(hired.id)
  assert.equal(await templateTasks(hired.id), template)
  // والموعد من تاريخ الالتحاق بإزاحة القالب
  const first = await repo('OnboardingTask').findOne({ where: { employeeId: hired.id }, order: { sortOrder: 'ASC', id: 'ASC' } })
  assert.equal(first.dueDate, day(0))

  // نداءات متزامنة لموظف جديد: نسخة واحدة
  const racer = await employee({ joinDate: day(0) })
  await Promise.all(Array.from({ length: 6 }, () => onboarding.materializeHired(racer.id)))
  assert.equal(await templateTasks(racer.id), template)

  // القفل قفل قاعدة (مش جوه العملية): اتصال تاني ماسك قفل الموظف = النسخ بيستنى، وبيكمّل لما يتساب
  const gated = await employee({ joinDate: day(0) })
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  let pendingRun = null
  try {
    await holder.query(`DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0; SELECT @result AS [result]`, [`hr:onboarding:${gated.id}`])
    let finished = false
    pendingRun = onboarding.materializeHired(gated.id).then(() => { finished = true })
    let waiting = 0
    for (let waited = 0; waited < 5000 && !waiting; waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      waiting = Number((await query(`SELECT COUNT(*) AS [n] FROM sys.dm_tran_locks WHERE resource_type = N'APPLICATION' AND request_status = N'WAIT' AND resource_database_id = DB_ID()`))[0].n)
    }
    assert.ok(waiting >= 1, 'النسخ واقف على قفل القاعدة')
    assert.deepEqual([finished, await templateTasks(gated.id)], [false, 0])
    await holder.commitTransaction()
    await pendingRun
    assert.equal(await templateTasks(gated.id), template)
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
    if (pendingRun) await pendingRun.catch(() => undefined)
  }

  // الموديول مقفول = مفيش مهام وقت التعيين؛ ولما يتفتح، فتح الشاشة بينسخ للي اتعيّن
  await modules.setModule(payloadOf(users.admin), 'onboarding', { enabled: false })
  const quiet = await employee({ joinDate: day(0) })
  try {
    await onboarding.materializeHired(quiet.id)
    assert.equal(await templateTasks(quiet.id), 0)
  } finally { await modules.setModule(payloadOf(users.admin), 'onboarding', { enabled: true }) }
  expectStatus(await request(users.admin, 'GET', '/onboarding'), 200)
  assert.equal(await templateTasks(quiet.id), template)

  // نافذة «الموظف الجديد» زي الشاشة بالظبط: ملف اتضاف بتاريخ التحاق قديم (موظف قايم بيتسجّل) أو من غير تاريخ مش موظف جديد — ولا مهمة من
  // القالب ولا مهمة مسوغات. وجوه النافذة (لحد حدّها) أو لسه جاي: الاتنين
  const allTasks = async employeeId => Number((await query('SELECT COUNT(*) AS [n] FROM [onboarding_tasks] WHERE [employeeId] = @0', [employeeId]))[0].n)
  await repo('DocType').save({ code: 'TK_HIRING', nameAr: 'مسوغ اختبار المهام', isActive: true, requiredForHiring: true })
  await setting('onboarding.window_days', '90')
  try {
    const old = await employee({ joinDate: day(-91) }), edge = await employee({ joinDate: day(-90) }), coming = await employee({ joinDate: day(20) }), undated = await employee({ joinDate: null })
    for (const person of [old, edge, coming, undated]) await onboarding.materializeHired(person.id)
    assert.deepEqual([await allTasks(old.id), await allTasks(undated.id), await allTasks(edge.id), await allTasks(coming.id)], [0, 0, template + 1, template + 1])
    // الإعداد بيتقري: نافذة أسبوع = اللي التحق من 10 أيام مش جديد
    await setting('onboarding.window_days', '7')
    const tenDays = await employee({ joinDate: day(-10) }), threeDays = await employee({ joinDate: day(-3) })
    await onboarding.materializeHired(tenDays.id)
    await onboarding.materializeHired(threeDays.id)
    assert.deepEqual([await allTasks(tenDays.id), await allTasks(threeDays.id)], [0, template + 1])
    // ومن الشاشة نفس الحكم: اللي برّه النافذة مالوش مهام بعد فتحها
    expectStatus(await request(users.admin, 'GET', '/onboarding'), 200)
    assert.deepEqual([await allTasks(old.id), await allTasks(undated.id), await allTasks(tenDays.id)], [0, 0, 0])
  } finally {
    await setting('onboarding.window_days', '90')
    await repo('DocType').update({ code: 'TK_HIRING' }, { requiredForHiring: false })
  }
  // موظف مش موجود أو منتهية خدمته: ولا حاجة
  await onboarding.materializeHired(999999)
  await onboarding.materializeHired(emps.gone.id)
  assert.equal(await templateTasks(emps.gone.id), 0)
})

test('TK-12: ملف الإثبات بيتحمّل بنفس حكم المهمة', async () => {
  const file = made.proofFile
  // المهمة «made.first»: مسؤولها w1 (الرافع)، منشئها hrA، مدير مسؤولها manager، و«عرض كل المهام» في فرعها viewer
  for (const user of [users.w1, users.hrA, users.manager, users.viewer, users.admin]) assert.equal(await download(user, file), 200, user.email)
  for (const user of [users.w2, users.other, users.hrB, users.itA, users.hrEdit]) assert.equal(await download(user, file), 404, user.email)
  // ملف بنوع task مش مربوط بمهمة: لرافعه بس
  const loose = await upload(users.w2)
  assert.equal(await download(users.w2, loose), 200)
  for (const user of [users.w1, users.hrA, users.manager]) assert.equal(await download(user, loose), 404, user.email)
  assert.equal((await fetch(`${base}/files/${file}`)).status, 401)
})

test('TK-13: حدود الإعدادين', async () => {
  const patch = (key, value) => request(users.admin, 'PATCH', '/settings/config', { key, value })
  for (const key of ['tasks.reminder_days_before', 'tasks.escalation_days_after']) {
    for (const value of ['-1', '61', '1.5', 'oops', '']) expectStatus(await patch(key, value), 400)
    for (const value of ['0', '60', '7']) expectStatus(await patch(key, value), 200)
  }
  expectStatus(await patch('tasks.reminder_days_before', '1'), 200)
  expectStatus(await patch('tasks.escalation_days_after', '3'), 200)
})

test('TK-14: إشعارات المهام بالبريد — تكليف وتذكير للمسؤول، وتأخير لمديره، بالعنوان والموعد بس وبفحص وقت الإرسال', async () => {
  const deliveries = taskId => query(`SELECT d.[status], d.[detail], n.[recipientUserId], n.[eventCode] FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
    WHERE n.[entityType] = N'task' AND n.[entityId] = @0 AND d.[channel] = N'EMAIL' ORDER BY d.[id]`, [String(taskId)])
  const sent = () => mailbox.sent.map(message => [message.to, message.subject]).sort()
  const minuteNow = new Date().getHours() * 60 + new Date().getMinutes()
  const clock = offset => { const minute = (((minuteNow + offset) % 1440) + 1440) % 1440; return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}` }
  const quiet = on => setting('notifications.quiet_hours', on ? `${clock(-60)}-${clock(120)}` : '')
  const release = async () => { await quiet(false); await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`); await drain() }
  // حساب مدير النظام المربوط بنفس موظف «manager» (من TK-06) برّه الاختبار ده
  await repo('User').update({ email: 'boss@tasks.invalid' }, { isActive: false })
  await query('UPDATE [tasks] SET [dueDate] = NULL, [remindedAt] = NULL, [escalatedAt] = NULL')
  await drain()

  // البريد مقفول (الافتراضي): ولا صف ولا رسالة
  mailbox.configured = true
  const silent = await create(users.hrA, { title: 'والبريد مقفول', assigneeEmployeeId: emps.w1.id })
  await drain()
  assert.deepEqual([await deliveries(silent.id), mailbox.sent.length], [[], 0])
  await setting('notifications.email.enabled', 'true')

  // فئة «المهام» في اختيارات المستخدم (من غير اختيار داخل النظام: «مهامي» بعدّادها دايمًا ظاهرة)
  const prefs = expectStatus(await request(users.w1, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual(prefs.categories.find(row => row.key === 'task'), { key: 'task', label: 'المهام', inApp: null, email: 'ON' })

  // تكليف موظف: لحسابه بس، بالعنوان والموعد ولينك المهمة — من غير الوصف
  const task = await create(users.hrA, { title: 'راجع عقد المورد', description: 'تفاصيل داخلية في الوصف', assigneeEmployeeId: emps.w1.id, dueDate: day(4) })
  await drain()
  assert.deepEqual(sent(), [['w1@tasks.invalid', 'مهمة جديدة عليك: راجع عقد المورد']])
  const [mail] = mailbox.sent
  assert.ok(mail.text.includes(`${FRONTEND}/my/tasks?task=${task.id}`) && mail.text.includes(day(4)) && mail.text.includes('حساب w1'), mail.text)
  assert.equal(mail.text.includes('تفاصيل داخلية'), false, 'وصف المهمة مابيتبعتش')
  assert.deepEqual((await deliveries(task.id)).map(row => [row.recipientUserId, row.eventCode, row.status]), [[users.w1.id, 'task.assigned', 'SENT']])

  // مهمة الدور: لحاملي الدور اللي فرعها في نطاقهم — مش فرع تاني، ولا مدير النظام
  mailbox.sent.length = 0
  const roleTask = await create(users.hrA, { title: 'جهّز حساب البريد', assigneeRole: 'it', branchId: org.branchA.id })
  await drain()
  assert.deepEqual(sent(), [['it-a@tasks.invalid', 'مهمة جديدة عليك: جهّز حساب البريد']])
  assert.ok(mailbox.sent[0].text.includes('من غير موعد'))

  // اللي كلّف نفسه مابيتبعتلوش
  mailbox.sent.length = 0
  const selfEmployee = await employee()
  const self = await account('self', 'employee', ['tasks.manage'], { employeeId: selfEmployee.id })
  const own = await create(self, { title: 'مهمة لنفسي', assigneeEmployeeId: selfEmployee.id })
  await drain()
  assert.deepEqual([(await mine(self)).tasks.some(row => row.id === own.id), mailbox.sent.length], [true, 0])

  // التذكير للمسؤول
  mailbox.sent.length = 0
  await repo('Task').update({ id: task.id }, { dueDate: day(1) })
  assert.deepEqual(await tasksService.runReminders(), { reminded: 1, escalated: 0 })
  await drain()
  assert.deepEqual(sent(), [['w1@tasks.invalid', 'موعد مهمتك قرّب: راجع عقد المورد']])

  // التأخير: لمدير المسؤول المباشر، ومهمة الدور للي كلّف بيها — مش للمسؤول نفسه. ومدير مالوش حساب شغال = اللي كلّف بيها
  const ghost = await employee()
  const lonely = await employee({ managerEmployeeId: ghost.id })
  const orphan = await create(users.hrA, { title: 'مهمة مدير مسؤولها من غير حساب', assigneeEmployeeId: lonely.id })
  // واللي كلّف بمهمة دور وبعدها اتشالت صلاحيته مابقاش يشوفها: تأخيرها مايوصلوش (لا اسم دورها ولا موعدها)
  const former = await account('former', 'employee', ['tasks.manage'])
  const dropped = await create(former, { title: 'اللي كلّف بيها فقد صلاحيته', assigneeRole: 'finance', branchId: org.branchA.id })
  await repo('User').update({ id: former.id }, { permissions: '[]' })
  await drain()
  mailbox.sent.length = 0
  await repo('Task').update({ id: task.id }, { dueDate: day(-3) })
  await repo('Task').update({ id: roleTask.id }, { dueDate: day(-5) })
  await repo('Task').update({ id: orphan.id }, { dueDate: day(-6) })
  await repo('Task').update({ id: dropped.id }, { dueDate: day(-7) })
  assert.deepEqual(await tasksService.runReminders(), { reminded: 0, escalated: 4 })
  await drain()
  assert.deepEqual(sent(), [['hr-a@tasks.invalid', 'مهمة متأخرة: جهّز حساب البريد'], ['hr-a@tasks.invalid', 'مهمة متأخرة: مهمة مدير مسؤولها من غير حساب'],
    ['manager@tasks.invalid', 'مهمة متأخرة: راجع عقد المورد']])
  assert.deepEqual(await deliveries(dropped.id), [])
  const late = mailbox.sent.find(message => message.to === 'manager@tasks.invalid')
  assert.ok(late.text.includes(emps.w1.fullName) && late.text.includes(day(-3)), late.text)
  assert.ok(mailbox.sent.find(message => message.subject === 'مهمة متأخرة: جهّز حساب البريد').text.includes('تقنية المعلومات'))

  // فحص وقت الإرسال: بريد اتأجل (ساعات الهدوء) والمهمة اتحوّلت لحد تاني أو اتقفلت قبل ما يطلع
  await quiet(true)
  mailbox.sent.length = 0
  const moved = await create(users.hrA, { title: 'مهمة هتتحوّل', assigneeEmployeeId: emps.w1.id })
  const closed = await create(users.hrA, { title: 'مهمة هتتقفل', assigneeEmployeeId: emps.w1.id })
  const lateTask = await create(users.hrA, { title: 'تأخيرها هيتعالج', assigneeEmployeeId: emps.w2.id })
  await repo('Task').update({ id: lateTask.id }, { dueDate: day(-4) })
  // موعدها قرّب وبعدها الموعد اتأجّل، ومتأخرة وبعدها اتحوّلت لمرؤوس تاني لنفس المدير (لسه متأخرة وهو لسه اللي بيتبلّغ)
  const postponed = await create(users.hrA, { title: 'موعدها هيتأجّل', assigneeEmployeeId: emps.w1.id, dueDate: day(1) })
  const handed = await create(users.hrA, { title: 'متأخرة وهتتحوّل', assigneeEmployeeId: emps.w1.id })
  await repo('Task').update({ id: handed.id }, { dueDate: day(-8) })
  assert.deepEqual(await tasksService.runReminders(), { reminded: 1, escalated: 2 })
  await drain()
  expectStatus(await request(users.hrA, 'PATCH', `/tasks/${moved.id}`, { assigneeEmployeeId: emps.w2.id }), 200)
  expectStatus(await status(users.w1, closed.id, { status: 'DONE' }), 201)
  // المتأخرة اتمدّ موعدها قبل ما رسالة التأخير تطلع
  expectStatus(await request(users.hrA, 'PATCH', `/tasks/${lateTask.id}`, { dueDate: day(6) }), 200)
  expectStatus(await request(users.hrA, 'PATCH', `/tasks/${postponed.id}`, { dueDate: day(9) }), 200)
  expectStatus(await request(users.hrA, 'PATCH', `/tasks/${handed.id}`, { assigneeEmployeeId: emps.w2.id }), 200)
  await drain()
  assert.equal(mailbox.sent.length, 0)
  await release()
  assert.deepEqual(sent(), [['w1@tasks.invalid', 'مهمة جديدة عليك: موعدها هيتأجّل'], ['w2@tasks.invalid', 'مهمة جديدة عليك: تأخيرها هيتعالج'],
    ['w2@tasks.invalid', 'مهمة جديدة عليك: متأخرة وهتتحوّل'], ['w2@tasks.invalid', 'مهمة جديدة عليك: مهمة هتتحوّل']])
  assert.deepEqual((await deliveries(moved.id)).map(row => [row.recipientUserId, row.status, row.detail]),
    [[users.w1.id, 'SKIPPED', 'المهمة مابقتش على الحساب ده'], [users.w2.id, 'SENT', null]])
  assert.deepEqual((await deliveries(closed.id)).map(row => [row.recipientUserId, row.status, row.detail]), [[users.w1.id, 'SKIPPED', 'المهمة اتقفلت أو اتلغت']])
  assert.deepEqual((await deliveries(lateTask.id)).filter(row => row.eventCode === 'task.overdue').map(row => [row.recipientUserId, row.status, row.detail]),
    [[users.manager.id, 'SKIPPED', 'المهمة مابقتش متأخرة']])
  // «موعدها قرّب» بموعد اتغيّر، و«متأخرة» باسم مسؤول اتغيّر: الرسالتين عن وضع فات
  const byCode = async (taskId, code) => (await deliveries(taskId)).filter(row => row.eventCode === code).map(row => [row.recipientUserId, row.status, row.detail])
  assert.deepEqual(await byCode(postponed.id, 'task.due_soon'), [[users.w1.id, 'SKIPPED', 'موعد المهمة اتغيّر بعد تجهيز الرسالة']])
  assert.deepEqual(await byCode(handed.id, 'task.overdue'), [[users.manager.id, 'SKIPPED', 'المهمة اتحوّلت أو موعدها اتغيّر بعد تجهيز الرسالة']])
  for (const row of [lateTask, postponed, handed, moved]) await repo('Task').update({ id: row.id }, { status: 'CANCELLED' })

  // الملخص اليومي بنفس فحص وقت الإرسال: مهمة اتقفلت قبل الملخص مابتدخلوش، واللي لسه على المسؤول بتدخل
  mailbox.sent.length = 0
  expectStatus(await request(users.w2, 'PATCH', '/notifications/preferences', { category: 'task', channel: 'EMAIL', mode: 'DIGEST' }), 200)
  const kept = await create(users.hrA, { title: 'هتفضل في الملخص', assigneeEmployeeId: emps.w2.id })
  const gone = await create(users.hrA, { title: 'اتقفلت قبل الملخص', assigneeEmployeeId: emps.w2.id })
  await drain()
  assert.deepEqual([mailbox.sent.length, (await deliveries(kept.id)).map(row => row.status), (await deliveries(gone.id)).map(row => row.status)], [0, ['DIGEST'], ['DIGEST']])
  expectStatus(await status(users.w2, gone.id, { status: 'DONE' }), 201)
  assert.equal(await notifications.sendDigests(), 1)
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['w2@tasks.invalid', 'ملخص إشعاراتك (1)']])
  assert.ok(mailbox.sent[0].text.includes(`${FRONTEND}/my/tasks?task=${kept.id}`) && !mailbox.sent[0].text.includes(`task=${gone.id}`), mailbox.sent[0].text)
  assert.deepEqual((await deliveries(gone.id)).map(row => [row.status, row.detail]), [['SKIPPED', 'المهمة اتقفلت أو اتلغت']])
  expectStatus(await request(users.w2, 'PATCH', '/notifications/preferences', { category: 'task', channel: 'EMAIL', mode: 'ON' }), 200)

  // اختيار المستخدم: قافل بريد فئة المهام
  mailbox.sent.length = 0
  expectStatus(await request(users.w1, 'PATCH', '/notifications/preferences', { category: 'task', channel: 'EMAIL', mode: 'OFF' }), 200)
  const muted = await create(users.hrA, { title: 'من غير بريد', assigneeEmployeeId: emps.w1.id })
  await drain()
  assert.deepEqual([mailbox.sent.length, (await deliveries(muted.id)).map(row => [row.status, row.detail])], [0, [['SKIPPED', 'المستخدم قافل بريد الفئة دي']]])
  expectStatus(await request(users.w1, 'PATCH', '/notifications/preferences', { category: 'task', channel: 'EMAIL', mode: 'ON' }), 200)
  await setting('notifications.email.enabled', 'false')
  mailbox.configured = false
})

test('TK-15: اللي كلّف بالمهمة بيديرها بحقه دلوقتي — مدير مابقاش مدير المسؤول، وصلاحية اتشالت، ونطاق اتغيّر؛ والمهمة بتفضل في فرع تكليفها', async () => {
  const patch = (user, id, body) => request(user, 'PATCH', `/tasks/${id}`, body)
  const seenBy = async (user, id) => (await request(user, 'GET', `/tasks/${id}`)).status
  // 1) المدير المباشر كلّف مرؤوسه، والمرؤوس قفلها بإثبات، وبعدها اتنقل لمدير تاني
  const staff = await employee({ managerEmployeeId: emps.manager.id })
  const staffUser = await account('staff', 'employee', [], { employeeId: staff.id })
  const task = await create(users.manager, { title: 'مهمة مدير هيتغيّر', assigneeEmployeeId: staff.id, requiresProof: true })
  const proof = await upload(staffUser)
  expectStatus(await status(staffUser, task.id, { status: 'DONE', proofFileId: proof }), 201)
  assert.deepEqual([await seenBy(users.manager, task.id), await download(users.manager, proof)], [200, 200])
  await repo('Employee').update({ id: staff.id }, { managerEmployeeId: emps.other.id })
  // اللي كلّف بيها زمان: لا يشوفها ولا إثباتها، ولا يعيد فتحها ولا يعدّلها، ومش في «فريقي» بتاعته — بنفس رد المهمة اللي مالهاش وجود
  const hidden = await request(users.manager, 'GET', `/tasks/${task.id}`)
  assert.deepEqual([hidden.status, hidden.body.message], [404, (await request(users.manager, 'GET', '/tasks/999999')).body.message])
  expectStatus(await status(users.manager, task.id, { status: 'OPEN', note: 'عايز أرجّعها' }), 404)
  expectStatus(await patch(users.manager, task.id, { title: 'مابقاش مديره' }), 404)
  assert.equal(await download(users.manager, proof), 404)
  assert.equal(expectStatus(await request(users.manager, 'GET', '/tasks/team'), 200).tasks.some(row => row.id === task.id), false)
  // المدير الجديد شايفها وإثباتها (مدير مسؤولها) ومش بيديرها (مش هو اللي كلّف بيها)
  const forNew = expectStatus(await request(users.other, 'GET', `/tasks/${task.id}`), 200)
  assert.deepEqual([forNew.canManage, forNew.canWork, await download(users.other, proof)], [false, false, 200])
  expectStatus(await status(users.other, task.id, { status: 'OPEN', note: 'مش هو اللي كلّف' }), 403)
  // رجع مديره: حقه رجع — الحكم بالعلاقة دلوقتي
  await repo('Employee').update({ id: staff.id }, { managerEmployeeId: emps.manager.id })
  assert.equal(expectStatus(await request(users.manager, 'GET', `/tasks/${task.id}`), 200).canManage, true)
  expectStatus(await status(users.manager, task.id, { status: 'OPEN', note: 'محتاجة تكملة' }), 201)
  // مدير كلّف مرؤوسه وعنده «عرض كل المهام»: لما المرؤوس يتنقل لمدير تاني بيفضل شايفها (بالصلاحية) ومابيديرهاش — في المهمة وفي القوايم
  const watcherEmployee = await employee()
  const watcher = await account('watcher', 'employee', ['tasks.view_all'], { employeeId: watcherEmployee.id })
  const watched = await employee({ managerEmployeeId: watcherEmployee.id })
  const seen = await create(watcher, { title: 'مهمة مدير عنده عرض بس', assigneeEmployeeId: watched.id })
  assert.equal(seen.canManage, true)
  await repo('Employee').update({ id: watched.id }, { managerEmployeeId: emps.other.id })
  assert.equal(expectStatus(await request(watcher, 'GET', `/tasks/${seen.id}`), 200).canManage, false)
  assert.equal(expectStatus(await request(watcher, 'GET', '/tasks'), 200).tasks.find(row => row.id === seen.id).canManage, false)
  expectStatus(await patch(watcher, seen.id, { title: 'شايفها بس' }), 403)
  expectStatus(await status(watcher, seen.id, { status: 'CANCELLED', note: 'شايفها بس' }), 403)

  // 2) صاحب صلاحية كلّف، وبعدها صلاحيته اتشالت أو فرع المهمة خرج من نطاقه
  const lead = await account('lead', 'employee', ['tasks.manage'])
  const owned = await create(lead, { title: 'مهمة صاحب صلاحية هتتشال', assigneeEmployeeId: emps.w1.id })
  assert.equal(await seenBy(lead, owned.id), 200)
  const change = async fields => { await repo('User').update({ id: lead.id }, fields); Object.assign(lead, fields) }
  await change({ permissions: '[]' })
  assert.equal(await seenBy(lead, owned.id), 404)
  expectStatus(await patch(lead, owned.id, { title: 'من غير صلاحية' }), 404)
  expectStatus(await status(lead, owned.id, { status: 'CANCELLED', note: 'من غير صلاحية' }), 404)
  await change({ permissions: JSON.stringify(['tasks.manage']), branchId: org.branchB.id })
  assert.equal(await seenBy(lead, owned.id), 404)
  expectStatus(await patch(lead, owned.id, { title: 'برّه نطاقه' }), 404)
  await change({ branchId: org.branchA.id })
  assert.equal(expectStatus(await request(lead, 'GET', `/tasks/${owned.id}`), 200).canManage, true)
  assert.equal((await repo('Task').findOneByOrFail({ id: owned.id })).title, 'مهمة صاحب صلاحية هتتشال', 'المرفوض ماغيّرش حاجة')

  // 3) المهمة بتفضل في الفرع اللي اتكلّف فيه: المسؤول اتنقل فرع
  const mover = await employee({ managerEmployeeId: emps.manager.id })
  const moverUser = await account('mover', 'employee', [], { employeeId: mover.id })
  const kept = await create(users.hrA, { title: 'مهمة موظف هيتنقل', assigneeEmployeeId: mover.id, dueDate: day(4) })
  expectStatus(await status(moverUser, kept.id, { status: 'IN_PROGRESS' }), 201)
  await repo('Employee').update({ id: mover.id }, { branchId: org.branchB.id })
  await repo('User').update({ id: moverUser.id }, { branchId: org.branchB.id })
  moverUser.branchId = org.branchB.id
  const assignedBefore = (await eventsOf('TASK_ASSIGNED', kept.id)).length
  // نفس الموظف اتبعت تاني مع تعديل: مش تحويل — الحالة والفرع واللي كلّف بيها زي ما هم، ومفيش حدث تكليف جديد
  const same = expectStatus(await patch(users.hrA, kept.id, { assigneeEmployeeId: mover.id, title: 'نفس المسؤول بعد النقل' }), 200)
  assert.deepEqual([same.title, same.status, same.branchId, same.createdByName, same.assigneeEmployeeId, (await eventsOf('TASK_ASSIGNED', kept.id)).length],
    ['نفس المسؤول بعد النقل', 'IN_PROGRESS', org.branchA.id, 'حساب hr-a', mover.id, assignedBefore])
  // لسه في «مهامي» بتاعته، ولسه بتاعة فرع تكليفها: صاحب صلاحية فرعه الجديد مش شايفها، ومديره المباشر وصاحب «عرض كل المهام» في فرعها شايفينها
  assert.ok((await mine(moverUser)).tasks.some(row => row.id === kept.id))
  assert.deepEqual([await seenBy(users.hrB, kept.id), await seenBy(users.manager, kept.id), await seenBy(users.viewer, kept.id)], [404, 200, 200])

  // 4) المدير المباشر من غير قيد فرع: مرؤوس في فرع تاني
  const far = await employee({ branchId: org.branchB.id, managerEmployeeId: emps.manager.id, joinDate: day(0) })
  const cross = await create(users.manager, { title: 'مهمة لمرؤوس في فرع تاني', assigneeEmployeeId: far.id })
  assert.deepEqual([cross.branchId, cross.canManage], [org.branchB.id, true])
  assert.ok(expectStatus(await request(users.manager, 'GET', '/tasks/team'), 200).tasks.some(row => row.id === cross.id && row.canManage))
  assert.ok(expectStatus(await request(users.manager, 'GET', '/tasks/assignees'), 200).employees.some(row => row.id === far.id))
  // فرع المهمة فرع مسؤولها: صاحب صلاحية فرع المدير مش شايفها، وصاحب صلاحية فرعها شايفها
  assert.deepEqual([await seenBy(users.hrA, cross.id), await seenBy(users.hrB, cross.id)], [404, 200])
  // ومهمة التهيئة اللي على «المدير المباشر» بتوصله من غير قيد فرع، ومهمة الجهة لحساب في نطاق فرع الموظف بس
  await onboarding.materializeHired(far.id)
  const farTasks = await repo('OnboardingTask').find({ where: { employeeId: far.id, status: 'PENDING' } })
  const partyIds = party => farTasks.filter(row => row.party === party).map(row => row.id).sort((a, b) => a - b)
  const onboardingOf = async user => (await mine(user)).onboarding.filter(row => row.employeeId === far.id).map(row => row.taskId).sort((a, b) => a - b)
  assert.ok(partyIds('manager').length >= 1 && partyIds('it').length >= 1)
  assert.deepEqual([await onboardingOf(users.manager), await onboardingOf(users.itB), await onboardingOf(users.itA)], [partyIds('manager'), partyIds('it'), []])
  await repo('OnboardingTask').update({ employeeId: far.id }, { status: 'DONE' })
})

test('TK-16: طلبات متزامنة أكتر من اتصالات المجمّع — كل طلب على اتصال معاملته، ومحدش بيستنى اتصال تاني', async () => {
  const count = 40
  // تحويل (شروط التكليف بتتقري جوه المعاملة)
  const moved = []
  for (let index = 0; index < count; index++) moved.push(await create(users.hrA, { title: `تحويل متزامن ${index + 1}`, assigneeEmployeeId: emps.w1.id }))
  let started = Date.now()
  const transfers = await Promise.all(moved.map(row => request(users.hrA, 'PATCH', `/tasks/${row.id}`, { assigneeEmployeeId: emps.w2.id })))
  assert.deepEqual([...new Set(transfers.map(response => response.status))], [200], JSON.stringify(transfers.find(response => response.status !== 200)?.body))
  assert.ok(transfers.every(response => response.body.assigneeEmployeeId === emps.w2.id))
  assert.ok(Date.now() - started < 20000, 'من غير استنى مهلة المجمّع')
  // إلغاء من المدير اللي كلّف (حل المدير المباشر بيتقري جوه المعاملة)
  const owned = []
  for (let index = 0; index < count; index++) owned.push(await create(users.manager, { title: `إلغاء متزامن ${index + 1}`, assigneeEmployeeId: emps.w1.id }))
  started = Date.now()
  const cancelled = await Promise.all(owned.map(row => status(users.manager, row.id, { status: 'CANCELLED', note: 'تنضيف' })))
  assert.deepEqual([...new Set(cancelled.map(response => response.status))], [201], JSON.stringify(cancelled.find(response => response.status !== 201)?.body))
  assert.ok(Date.now() - started < 20000, 'من غير استنى مهلة المجمّع')
  for (const row of moved) await repo('Task').update({ id: row.id }, { status: 'CANCELLED' })
})

test('TK-17: مدير ليه آلاف المرؤوسين (فوق حد معاملات SQL Server) — «فريقي» وقايمة التكليف و«مهامي» شغالين', async () => {
  const branch = await repo('Branch').save({ code: 'TK_BIG', name: 'فرع كبير' })
  const big = await employee({ branchId: branch.id })
  const boss = await account('big-boss', 'employee', [], { employeeId: big.id, branchId: branch.id })
  const total = 2200
  const rows = Array.from({ length: total }, (_, index) => ({ employeeCode: `TKB${String(index + 1).padStart(4, '0')}`, fullName: `مرؤوس كبير ${index + 1}`, branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer',
    managerEmployeeId: big.id }))
  for (let offset = 0; offset < rows.length; offset += 100) await repo('Employee').insert(rows.slice(offset, offset + 100))
  const reports = await resolver.directReportsOf(big.id)
  assert.equal(reports.length, total)
  // مهمة عامة ومهمة تهيئة على آخر مرؤوس (في آخر دفعة)
  const last = Math.max(...reports)
  const task = await create(boss, { title: 'مهمة لآخر مرؤوس', assigneeEmployeeId: last })
  await repo('OnboardingTask').save({ employeeId: last, templateItemId: null, label: 'تعريف آخر مرؤوس بالفريق', party: 'manager', dueDate: day(2), sortOrder: 10, status: 'PENDING' })
  const team = expectStatus(await request(boss, 'GET', '/tasks/team'), 200)
  assert.deepEqual([team.manager, team.tasks.map(row => [row.id, row.canManage])], [true, [[task.id, true]]])
  const options = expectStatus(await request(boss, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([options.canAssign, options.employees.length], [true, total])
  const inbox = await mine(boss)
  assert.deepEqual([inbox.tasks, inbox.onboarding.map(row => [row.employeeId, row.party]), inbox.counts], [[], [[last, 'manager']], { open: 1, overdue: 0 }])
  assert.deepEqual(expectStatus(await request(boss, 'GET', '/tasks/mine/count'), 200), { open: 1, overdue: 0 })

  // أكتر من حد القايمة (500): «مهامي» بتجيب الأقرب موعدًا، و«فريقي» الأحدث — مش أي 500
  const lastUser = await account('big-last', 'employee', [], { employeeId: last, branchId: branch.id })
  const now = new Date()
  const row = (title, dueDate) => ({ title, description: null, assigneeEmployeeId: last, assigneeRole: null, branchId: branch.id, createdByUserId: boss.id, dueDate, priority: 'NORMAL',
    status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null, remindedAt: now, escalatedAt: now, createdAt: now, updatedAt: now })
  const bulk = Array.from({ length: 500 }, (_, index) => row(`مهمة كتير ${index + 1}`, null))
  for (let offset = 0; offset < bulk.length; offset += 50) await repo('Task').insert(bulk.slice(offset, offset + 50))
  const urgent = (await repo('Task').save(row('آخر مهمة وموعدها فات', day(-1)))).id
  assert.equal(await repo('Task').count({ where: { assigneeEmployeeId: last, status: 'OPEN' } }), 502)
  const crowded = await mine(lastUser)
  assert.deepEqual([crowded.tasks.length, crowded.tasks[0].id, crowded.counts], [500, urgent, { open: 500, overdue: 1 }])
  const crowdedTeam = expectStatus(await request(boss, 'GET', '/tasks/team'), 200).tasks
  assert.deepEqual([crowdedTeam.length, crowdedTeam.some(entry => entry.id === urgent), crowdedTeam.some(entry => entry.id === task.id)], [500, true, false])
})
