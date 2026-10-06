'use strict'
// B2.7 (الجزء ب): إرسال مستند للإقرار، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_docack_test_<16 hex>).
//  DA-01) الإصدار بطلب إقرار: الطلب والمهمة وبصمة الملف في معاملة الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار (حتى بعد
//         ما موعد المحاولة يعدّي)؛ والطلب للي على رأس العمل بس، واللي لسه مالوش حساب طلبه مستنيه.
//  DA-02) «مستني إقرارك» وقراءة المستند: لصاحبه بس، والبصمة من قراءة المستند مش من القايمة؛ وملفه بحجمه المعلَن.
//  DA-03) الإقرار: صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة (حتى في نفس اللحظة)، والدليل؛ ومهمته بتتقفل معاه؛ وملف اتبدّل = من غير إقرار.
//  DA-04) الملف: اتبدّل على التخزين مابيتعرضش (من مسار المستند ومن مسار الملفات العام)؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري
//         مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول.
//  DA-05) المهمة في محرك المهام: في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام (وصفها مابيتقفلش من هناك)،
//         والتذكير والتصعيد شغالين عليها؛ ومهمة ربطها اتثبّت والنداء واقف على صفها مابتتعاملش كمهمة عادية.
//  DA-06) الإلغاء: لصاحب «إدارة المستندات» اللي فرع الموظف دلوقتي في نطاقه (واللي مش ظاهر له = مش موجود)، ومش لصاحب المستند نفسه، وقبل
//         الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني؛ ونقل الموظف في نفس اللحظة مايتخطّاش الحكم.
//  DA-07) السجل: حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي.
//  DA-08) إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول.
// Run (من api/): node --test test/hr-document-acknowledgements.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_docack_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-docack-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, tasksService, template, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}

function assertDisposable() {
  assert.match(database, /^hr_docack_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const token = user => jwt.sign(payloadOf(user))
const auth = user => ({ headers: { Authorization: `Bearer ${token(user)}` } })
async function request(user, method, route, body, headers = {}) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `DA${String(number).padStart(3, '0')}`, fullName: `موظف الإقرار ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@docack.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const sha = content => crypto.createHash('sha256').update(content).digest('hex')
const key = () => crypto.randomUUID()
const issueBody = (extra = {}) => ({ templateId: template.id, revisionId: template.publishedRevision.id, values: {}, idempotencyKey: key(), ...extra })
const issue = (user, extra) => request(user, 'POST', '/hr-documents/issue', issueBody(extra))
// مستند صادر للموظف بطلب إقرار — الاختصار اللي أغلب الاختبارات بتبدأ منه
const issued = async (target = emps.subject, extra = {}) => expectStatus(await issue(users.hrA, { employeeId: target.id, requireAck: true, ...extra }), 201)
const ackColumns = async id => (await query(`SELECT [ackRequestedAt], CONVERT(nvarchar(10), [ackDueDate], 23) AS [ackDueDate], [ackTaskId], [ackContentHash], [fileId] FROM [hr_issued_documents] WHERE [id] = @0`, [id]))[0]
const taskOf = async id => repo('Task').findOneByOrFail({ id: (await ackColumns(id)).ackTaskId })
const eventsOf = (type, taskId) => query(`SELECT [payload] FROM [outbox_events] WHERE [eventType] = @0 AND [entityType] = N'task' AND [entityId] = @1 ORDER BY [id]`, [type, String(taskId)])
const myList = async user => expectStatus(await request(user, 'GET', '/hr-documents/mine/acknowledgements'), 200)
const reading = (user, id) => request(user, 'GET', `/hr-documents/issued/${id}/acknowledgement`)
const acknowledge = (user, id, contentHash) => request(user, 'POST', `/hr-documents/issued/${id}/acknowledge`, { contentHash })
const storedPathOf = async id => {
  const file = await repo('StoredFile').findOneByOrFail({ id: (await ackColumns(id)).fileId })
  const { fileStorage } = require('../src/files/storage')
  return { name: file.storedName, local: fileStorage().localPath(file.storedName) }
}
// اتصال تاني بيمسك قفل لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: التزامن مضمون مش بالصدفة. undo: اللي الاتصال عمله بيرجع (لما
// القفل تغيير فعلي في الصف عشان قراءة عادية تقف عليه — تحديث من غير تغيير مابيوقفش القراءة دايمًا)
async function releaseTogether(lockSql, params, count, start, whileBlocked, undo = false) {
  assertDisposable()
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  let waiting = null
  try {
    await holder.query(lockSql, params)
    waiting = start()
    let blocked = 0
    for (let waited = 0; waited < 8000 && blocked < count; waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      blocked = Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
    }
    assert.equal(blocked, count, 'الطلبات واقفة على القفل الممسوك')
    if (whileBlocked) await whileBlocked()
    if (undo) await holder.rollbackTransaction()
    else await holder.commitTransaction()
    return await waiting
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
    if (waiting) await waiting.catch(() => undefined)
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  tasksService = app.get(require('../src/tasks/tasks.service').TasksService)
  // أرقام الجداول متباعدة: رقم موظف مايساويش بالصدفة رقم حساب ولا مهمة ولا مستند (مقارنة برقم غلط كانت هتعدّي)
  for (const [table, seed] of [['employees', 1000], ['tasks', 5000], ['hr_issued_documents', 9000]]) await query(`DBCC CHECKIDENT ('${table}', RESEED, ${seed})`)

  org.branchA = await repo('Branch').save({ code: 'DA_A', name: 'فرع الإقرار أ' })
  org.branchB = await repo('Branch').save({ code: 'DA_B', name: 'فرع الإقرار ب' })
  emps.boss = await employee()
  emps.subject = await employee({ managerEmployeeId: emps.boss.id })
  emps.second = await employee()
  emps.remote = await employee({ branchId: org.branchB.id })
  emps.hrFile = await employee()
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.hrA = await account('hr-a', 'employee', ['documents.manage'])
  users.hrB = await account('hr-b', 'employee', ['documents.manage'], { branchId: org.branchB.id })
  users.hrLinked = await account('hr-linked', 'employee', ['documents.manage'], { employeeId: emps.hrFile.id })
  users.taskBoss = await account('task-boss', 'employee', ['tasks.manage', 'tasks.view_all'])
  users.boss = await account('boss', 'employee', [], { employeeId: emps.boss.id })
  users.subject = await account('subject', 'employee', [], { employeeId: emps.subject.id })
  users.second = await account('second', 'employee', [], { employeeId: emps.second.id })
  users.remote = await account('remote', 'employee', [], { employeeId: emps.remote.id, branchId: org.branchB.id })
  await repo('RequestsConfig').save({ key: 'company.name', value: 'شركة الاختبار — بيانات وهمية' })
  const draft = { title: 'إقرار استلام — للاختبار', greeting: '', body: 'أقرّ أنا {{employee.fullName}} باستلام ما ورد أعلاه. بيانات اختبار فقط.', closing: '', footer: '' }
  const made = expectStatus(await request(users.admin, 'POST', '/hr-documents/templates', { name: 'إقرار استلام عهدة — اختبار', category: 'acknowledgement', draft, customFields: [] }), 201)
  template = expectStatus(await request(users.admin, 'POST', `/hr-documents/templates/${made.id}/publish`, { version: made.version }), 201)
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-docack-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'document acknowledgement fixture cleanup failed')
})

test('DA-01: الإصدار بطلب إقرار — الطلب والمهمة وبصمة الملف مع الإصدار؛ ومن غير موظف مرفوض؛ وحدود الموعد؛ ومفتاح منع التكرار', async () => {
  // الحدود: من غير موظف، وموعد من غير طلب، وموعد بصيغة غلط، وموعد فات
  // موظف مش على رأس العمل (حتى لو حسابه لسه شغال): مش هيقرّ
  const gone = await employee({ status: 'terminated', isActive: false })
  await account('gone', 'employee', [], { employeeId: gone.id })
  const noLogin = await employee()
  for (const [extra, message] of [
    [{ requireAck: true }, 'طلب الإقرار لمستند صادر لموظف — اختار الموظف الأول'],
    [{ employeeId: gone.id, requireAck: true }, 'الموظف مش على رأس العمل — طلب الإقرار للي على رأس العمل بس'],
    [{ employeeId: emps.subject.id, ackDueDate: day(3) }, 'موعد الإقرار من غير «مطلوب إقرار الموظف»'],
    [{ employeeId: emps.subject.id, requireAck: true, ackDueDate: '2026-02-30' }, 'موعد الإقرار بصيغة YYYY-MM-DD'],
    [{ employeeId: emps.subject.id, requireAck: true, ackDueDate: '10/10/2026' }, 'موعد الإقرار بصيغة YYYY-MM-DD'],
    [{ employeeId: emps.subject.id, requireAck: true, ackDueDate: day(-1) }, 'موعد الإقرار من النهارده أو بعده'],
  ]) {
    const response = await issue(users.hrA, extra)
    assert.deepEqual([response.status, messageOf(response)], [400, message], JSON.stringify(extra))
  }
  assert.deepEqual([await repo('HrIssuedDocument').count(), await repo('Task').count(), await repo('StoredFile').count()], [0, 0, 0], 'المرفوض ماكتبش حاجة')

  // إصدار عادي: من غير طلب ولا مهمة، وشكل الرد زي الأول ومعاه ack فاضي
  const plain = expectStatus(await issue(users.hrA, { employeeId: emps.subject.id }), 201)
  assert.deepEqual([plain.ack, (await ackColumns(plain.id)).ackRequestedAt, (await ackColumns(plain.id)).ackTaskId, await repo('Task').count()], [null, null, null, 0])

  // بطلب إقرار وموعد: الطلب على المستند ببصمة الملف اللي اتكتب، ومهمة «إقرار مستند» على الموظف في فرعه، واللي كلّف بيها اللي أصدر
  const body = issueBody({ employeeId: emps.subject.id, requireAck: true, ackDueDate: day(5) })
  const made = expectStatus(await request(users.hrA, 'POST', '/hr-documents/issue', body), 201)
  assert.deepEqual([made.ack.state, made.ack.dueDate, made.ack.acknowledgedAt, 'contentHash' in made.ack, !!made.ack.requestedAt], ['PENDING', day(5), null, false, true])
  const columns = await ackColumns(made.id), stored = await storedPathOf(made.id)
  assert.deepEqual([!!columns.ackRequestedAt, columns.ackDueDate, columns.ackContentHash], [true, day(5), sha(fs.readFileSync(stored.local))])
  const task = await taskOf(made.id)
  assert.deepEqual([task.title, task.description, task.assigneeEmployeeId, task.assigneeRole, task.branchId, task.createdByUserId, task.dueDate, task.status, task.priority, task.requiresProof],
    ['إقرار مستند', null, emps.subject.id, null, org.branchA.id, users.hrA.id, day(5), 'OPEN', 'NORMAL', false])
  // ونفس حدث تكليف المهام (بريد «مهمة جديدة عليك» من محرك الإشعارات)
  assert.deepEqual((await eventsOf('TASK_ASSIGNED', task.id)).map(row => JSON.parse(row.payload)), [{ taskId: task.id, branchId: org.branchA.id }])

  // نفس المفتاح تاني: نفس المستند بطلبه، من غير مهمة ولا ملف تاني؛ ونفس المفتاح بطلب إقرار مختلف = تعارض
  const [tasksBefore, filesBefore] = [await repo('Task').count(), await repo('StoredFile').count()]
  const again = expectStatus(await request(users.hrA, 'POST', '/hr-documents/issue', body), 201)
  assert.deepEqual([again.id, again.ack.state, again.ack.dueDate, await repo('Task').count(), await repo('StoredFile').count()], [made.id, 'PENDING', day(5), tasksBefore, filesBefore])
  for (const change of [{ ackDueDate: day(6) }, { ackDueDate: null }, { requireAck: false, ackDueDate: undefined }]) {
    assert.equal((await request(users.hrA, 'POST', '/hr-documents/issue', { ...body, ...change })).status, 409, JSON.stringify(change))
  }
  // نفس المحاولة بمفتاحها بعد ما موعدها عدّى (الرد الأول ضاع والإعادة تاني يوم): بترجّع مستندها، مش «الموعد فات»
  const dated = issueBody({ employeeId: emps.subject.id, requireAck: true, ackDueDate: day(0) })
  const first = expectStatus(await request(users.hrA, 'POST', '/hr-documents/issue', dated), 201)
  // كأن المحاولة اتعملت امبارح بموعد امبارح: بصمة مدخلاتها وموعدها زي ما الخادم بيحسبهم
  const attempt = { templateId: dated.templateId, revisionId: dated.revisionId, employeeId: dated.employeeId, values: {}, requireAck: true, ackDueDate: day(-1) }
  await query('UPDATE [hr_issued_documents] SET [inputHash] = @1, [ackDueDate] = @2 WHERE [id] = @0', [first.id, sha(JSON.stringify(attempt)), day(-1)])
  const replay = expectStatus(await request(users.hrA, 'POST', '/hr-documents/issue', { ...dated, ackDueDate: day(-1) }), 201)
  assert.deepEqual([replay.id, replay.ack.dueDate, replay.ack.state], [first.id, day(-1), 'OVERDUE'])
  // والإصدار العادي للموظف اللي مش على رأس العمل زي الأول
  assert.equal(expectStatus(await issue(users.hrA, { employeeId: gone.id }), 201).ack, null)
  // موظف لسه مالوش حساب دخول: طلبه بيتقبل ويستناه (الحساب بيتعمل مع أول دخول)، وأول ما يبقى له حساب بيلاقيه
  const waiting = expectStatus(await issue(users.hrA, { employeeId: noLogin.id, requireAck: true }), 201)
  assert.deepEqual([waiting.ack.state, (await taskOf(waiting.id)).assigneeEmployeeId], ['PENDING', noLogin.id])
  assert.deepEqual((await myList(await account('first-login', 'employee', [], { employeeId: noLogin.id }))).documents.map(row => row.id), [waiting.id])
  // من غير موعد: الطلب والمهمة من غير موعد
  const open = await issued()
  assert.deepEqual([open.ack.dueDate, (await taskOf(open.id)).dueDate, open.ack.state], [null, null, 'PENDING'])
  // وصاحب «إدارة المستندات» في فرع تاني مايصدرش لموظف برّه نطاقه (حكم الإصدار القايم)
  assert.equal((await issue(users.hrB, { employeeId: emps.subject.id, requireAck: true })).status, 403)
})

test('DA-02: «مستني إقرارك» وقراءة المستند — لصاحبه بس، والبصمة من قراءة المستند مش من القايمة، وملفه بحجمه المعلَن', async () => {
  const made = await issued(emps.second, { ackDueDate: day(2) })
  const plain = expectStatus(await issue(users.hrA, { employeeId: emps.second.id }), 201)
  // القايمة: مستندات الموظف اللي عليها طلب بس، من غير بصمة
  const mine = await myList(users.second)
  assert.deepEqual([mine.available, mine.documents.map(row => [row.id, row.reference, row.templateName, row.category, row.state, row.dueDate, row.acknowledgedAt, 'contentHash' in row])],
    [true, [[made.id, made.reference, 'إقرار استلام عهدة — اختبار', 'acknowledgement', 'PENDING', day(2), null, false]]])
  // موظف تاني، وحساب من غير موظف، وصاحب «إدارة المستندات»: مش عليهم
  for (const user of [users.remote, users.admin, users.hrA]) assert.deepEqual((await myList(user)).documents, [], user.email)
  // قراءة المستند: لصاحبه، ومعاها بصمة ملفه
  const read = expectStatus(await reading(users.second, made.id), 200)
  assert.deepEqual([read.id, read.reference, read.templateName, read.state, read.dueDate, read.contentHash], [made.id, made.reference, 'إقرار استلام عهدة — اختبار', 'PENDING', day(2), (await ackColumns(made.id)).ackContentHash])
  // غير صاحبه (حتى الموارد البشرية ومدير النظام)، والمستند من غير طلب، واللي مش موجود: نفس الرد
  const missing = await reading(users.second, 999999)
  assert.deepEqual([missing.status, messageOf(missing)], [404, 'المستند غير موجود'])
  // ورقم أكبر من مدى العمود: غير موجود (مش خطأ خادم) — في القراءة والإقرار والتنزيل
  for (const response of [await reading(users.second, 3000000000), await acknowledge(users.second, 3000000000, 'a'.repeat(64)),
    await request(users.second, 'GET', '/hr-documents/issued/3000000000/download')]) assert.deepEqual([response.status, messageOf(response)], [404, 'المستند غير موجود'])
  for (const [user, id] of [[users.remote, made.id], [users.hrA, made.id], [users.admin, made.id], [users.subject, made.id], [users.second, plain.id]]) {
    const response = await reading(user, id)
    assert.deepEqual([response.status, response.body.message], [404, missing.body.message], `${user.email} ${id}`)
  }
  // ملف المستند لصاحبه: بنفس البايتات، وحجمه المعلَن حجم الملف المتحقق منه
  const stored = await storedPathOf(made.id), bytes = fs.readFileSync(stored.local)
  const download = await fetch(`${base}/hr-documents/issued/${made.id}/download`, auth(users.second))
  const downloaded = Buffer.from(await download.arrayBuffer())
  assert.deepEqual([download.status, download.headers.get('content-type'), download.headers.get('content-length'), sha(downloaded), sha(downloaded)],
    [200, 'application/pdf', String(bytes.length), sha(bytes), read.contentHash])
  // وموظف تاني مايقراش ملفه (حكم المستندات القايم)
  assert.equal((await fetch(`${base}/hr-documents/issued/${made.id}/download`, auth(users.remote))).status, 403)
})

test('DA-03: الإقرار — صاحب المستند لنفسه، وببصمة ملفه، ومرة واحدة، والدليل؛ ومهمته بتتقفل معاه', async () => {
  const made = await issued(emps.subject, { ackDueDate: day(4) })
  const hash = (await ackColumns(made.id)).ackContentHash
  const task = await taskOf(made.id)
  // بصمة بصيغة غلط، وبصمة مش بصمة الملف
  expectStatus(await acknowledge(users.subject, made.id, 'not-a-hash'), 400)
  const stale = await acknowledge(users.subject, made.id, 'a'.repeat(64))
  assert.deepEqual([stale.status, messageOf(stale)], [409, 'المستند اتغيّر — افتحه تاني واقراه قبل الإقرار'])
  // محدش بيقرّ نيابةً عن حد: موظف تاني، والموارد البشرية (حتى المربوطة بموظف)، ومدير النظام من غير موظف
  for (const user of [users.second, users.hrLinked, users.boss]) {
    const response = await acknowledge(user, made.id, hash)
    assert.deepEqual([response.status, messageOf(response)], [404, 'المستند غير موجود'], user.email)
  }
  for (const user of [users.admin, users.hrA]) {
    const response = await acknowledge(user, made.id, hash)
    assert.deepEqual([response.status, messageOf(response)], [403, 'الإقرار لصاحب المستند نفسه — حسابك مش مربوط بموظف'], user.email)
  }
  assert.deepEqual([await repo('HrDocumentAcknowledgement').count({ where: { documentId: made.id } }), (await repo('Task').findOneByOrFail({ id: task.id })).status], [0, 'OPEN'])

  // إقرارين من صاحبه في نفس اللحظة: سطر واحد، والتاني بياخد نفس السطر
  const responses = await releaseTogether('UPDATE [hr_issued_documents] SET [templateName] = [templateName] WHERE [id] = @0', [made.id], 2,
    () => Promise.all([0, 1].map(() => acknowledge(users.subject, made.id, hash, { 'User-Agent': 'docack-test/1.0' }))))
  assert.deepEqual(responses.map(response => response.status), [201, 201])
  assert.deepEqual(responses.map(response => response.body.already).sort(), [false, true])
  assert.equal(responses[0].body.id, responses[1].body.id)
  const rows = await repo('HrDocumentAcknowledgement').find({ where: { documentId: made.id } })
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].employeeId, rows[0].userId, rows[0].contentHash, !!rows[0].acknowledgedAt, !!rows[0].ip], [emps.subject.id, users.subject.id, hash, true, true])
  // والمهمة اتقفلت «خلصت» باسم حسابه
  const closed = await repo('Task').findOneByOrFail({ id: task.id })
  assert.deepEqual([closed.status, closed.closedByUserId, !!closed.closedAt, closed.statusNote], ['DONE', users.subject.id, true, null])
  // تالت مرة: نفس السطر
  const third = expectStatus(await acknowledge(users.subject, made.id, hash), 201)
  assert.deepEqual([third.already, third.id, await repo('HrDocumentAcknowledgement').count({ where: { documentId: made.id } })], [true, rows[0].id, 1])
  // والحالة بقت «أقرّ» في قايمته وفي قراءة المستند
  const mine = (await myList(users.subject)).documents.find(row => row.id === made.id)
  assert.deepEqual([mine.state, !!mine.acknowledgedAt, expectStatus(await reading(users.subject, made.id), 200).state], ['ACKNOWLEDGED', true, 'ACKNOWLEDGED'])
  // ملف المستند اتبدّل على التخزين (أو اختفى): الإقرار مرفوض ومن غير دليل، حتى لو اتعرض من مسار تاني؛ ولما يرجع مطابق بيتقرّ
  const guarded = await issued(emps.subject)
  const guardedHash = (await ackColumns(guarded.id)).ackContentHash, place = await storedPathOf(guarded.id), intact = fs.readFileSync(place.local)
  const MISMATCH = 'ملف المستند على التخزين مش مطابق للملف اللي اتصدر — بلّغ مسؤول النظام'
  fs.writeFileSync(place.local, Buffer.concat([intact, Buffer.from('\n% tampered')]))
  const altered = await acknowledge(users.subject, guarded.id, guardedHash)
  assert.deepEqual([altered.status, messageOf(altered)], [409, MISMATCH])
  fs.rmSync(place.local)
  const absent = await acknowledge(users.subject, guarded.id, guardedHash)
  assert.deepEqual([absent.status, messageOf(absent), await repo('HrDocumentAcknowledgement').count({ where: { documentId: guarded.id } }), (await taskOf(guarded.id)).status], [409, MISMATCH, 0, 'OPEN'])
  fs.writeFileSync(place.local, intact)
  expectStatus(await acknowledge(users.subject, guarded.id, guardedHash), 201)
  // واللي أقرّ خلاص بيرجع له إقراره حتى لو الملف اتبدّل بعدها (الإقرار اتسجّل على الملف اللي كان مطابق)
  fs.writeFileSync(place.local, Buffer.concat([intact, Buffer.from('\n% later')]))
  assert.equal(expectStatus(await acknowledge(users.subject, guarded.id, guardedHash), 201).already, true)
  fs.writeFileSync(place.local, intact)
  // الدليل فيه الجهاز اللي أقرّ منه؛ ومهمة اتقفلت قبل الإقرار (برّه شاشة المهام) بتفضل زي ما هي
  const withAgent = await issued(emps.subject)
  const settled = await taskOf(withAgent.id)
  await query(`UPDATE [tasks] SET [status] = N'CANCELLED', [statusNote] = N'اتقفلت قبل كده' WHERE [id] = @0`, [settled.id])
  expectStatus(await request(users.subject, 'POST', `/hr-documents/issued/${withAgent.id}/acknowledge`, { contentHash: (await ackColumns(withAgent.id)).ackContentHash }, { 'User-Agent': 'docack-test/2.0' }), 201)
  assert.equal((await repo('HrDocumentAcknowledgement').findOneByOrFail({ documentId: withAgent.id })).userAgent, 'docack-test/2.0')
  assert.deepEqual((({ status, statusNote, closedByUserId }) => [status, statusNote, closedByUserId ?? null])(await repo('Task').findOneByOrFail({ id: settled.id })), ['CANCELLED', 'اتقفلت قبل كده', null])
})

test('DA-04: الملف — اتبدّل على التخزين مابيتعرضش؛ واتبدّل بين القراءتين الرد بيتقطع؛ وعميل قفل بدري مابيسيبش ملف مفتوح؛ والمستند العادي زي الأول', async () => {
  const made = await issued(emps.second)
  const plain = expectStatus(await issue(users.hrA, { employeeId: emps.second.id }), 201)
  const stored = await storedPathOf(made.id), bytes = fs.readFileSync(stored.local)
  const route = `${base}/hr-documents/issued/${made.id}/download`
  // ونفس الملف من مسار الملفات العام (اللي شاشات الموارد البشرية بتفتحه منه): بنفس التطابق
  const general = `${base}/files/${(await ackColumns(made.id)).fileId}`
  // ملف اتبدّل على التخزين: مابيتعرضش لصاحبه ولا لصاحب الصلاحية من المسارين، فمحدش بيقرّ بمستند شاف غيره
  fs.writeFileSync(stored.local, Buffer.concat([bytes, Buffer.from('\n% tampered')]))
  for (const user of [users.second, users.hrA]) {
    for (const target of [route, general]) {
      const tampered = await request(user, 'GET', target.slice(base.length))
      assert.deepEqual([tampered.status, messageOf(tampered)], [409, 'ملف المستند على التخزين مش مطابق للملف اللي اتصدر — بلّغ مسؤول النظام'], `${user.email} ${target.slice(base.length)}`)
    }
  }
  fs.writeFileSync(stored.local, bytes)
  for (const target of [route, general]) {
    const intact = await fetch(target, auth(users.second))
    assert.deepEqual([intact.status, intact.headers.get('content-length'), sha(Buffer.from(await intact.arrayBuffer()))], [200, String(bytes.length), sha(bytes)], target.slice(base.length))
  }
  // والمستند من غير طلب إقرار بيتبعت زي الأول (من غير تطابق): سلوكه ماتغيّرش
  const plainStored = await storedPathOf(plain.id), plainBytes = fs.readFileSync(plainStored.local)
  fs.writeFileSync(plainStored.local, Buffer.concat([plainBytes, Buffer.from('\n% changed')]))
  assert.equal((await fetch(`${base}/hr-documents/issued/${plain.id}/download`, auth(users.second))).status, 200)
  assert.equal((await fetch(`${base}/files/${(await ackColumns(plain.id)).fileId}`, auth(users.second))).status, 200)
  fs.writeFileSync(plainStored.local, plainBytes)

  // ملف اتبدّل بعد التحقق منه (بين قراءة البصمة وقراءة الإرسال) — أصغر أو أكبر: الرد بيتقطع قبل ما يكمل، وبيتسجّل في سجل الخادم
  const { fileStorage } = require('../src/files/storage'), { Readable } = require('node:stream')
  const storage = fileStorage(), original = name => Object.getPrototypeOf(storage).read.call(storage, name)
  const controller = app.get(require('../src/hr-documents/hr-documents.controller').HrDocumentsController)
  const filesController = app.get(require('../src/files/files.controller').FilesController)
  const logged = []
  controller.logger.error = message => { logged.push(message) }
  filesController.logger.error = message => { logged.push(message) }
  try {
    for (const target of [route, general]) {
      for (const second of [[bytes.subarray(0, 100), Buffer.from('swapped tail')], [bytes, Buffer.from('one more chunk')]]) {
        let reads = 0
        storage.read = name => (name === stored.name && ++reads === 2 ? Readable.from(second) : original(name))
        const swapped = await fetch(target, auth(users.second)).then(async response => ({ status: response.status, length: Buffer.from(await response.arrayBuffer()).length })).catch(() => 'aborted')
        assert.deepEqual([swapped, reads], ['aborted', 2], target.slice(base.length))
      }
    }
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual(logged.map(message => String(message).includes(`ملف المستند ${made.id} اتبدّل على التخزين`)), [true, true, true, true])
    // العميل قفل الاتصال والتحقق لسه شغال: مفيش ملف بيتفتح للإرسال، واللي اتفتح للبصمة اتقفل
    const opened = []
    storage.read = name => { const stream = original(name); opened.push(stream); return stream }
    const gone = new (require('node:http').ServerResponse)({ method: 'GET', httpVersionMajor: 1, httpVersionMinor: 1 })
    gone.destroy()
    await controller.download(payloadOf(users.second), made.id, gone)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual([opened.length, opened.every(stream => stream.destroyed)], [1, true])
    // والإرسال ماقدرش يبدأ: الملف اللي اتفتح للإرسال بيتقفل، والرد بيتقفل بدل ما الطلب يفضل معلّق
    opened.length = 0
    const unusable = { destroyed: false, setHeader() {}, destroy() { this.destroyed = true } }
    await controller.download(payloadOf(users.second), made.id, unusable)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual([opened.length, opened.every(stream => stream.destroyed), unusable.destroyed], [2, true, true])
  } finally { delete storage.read; delete controller.logger.error; delete filesController.logger.error }
  assert.equal((await fetch(route, auth(users.second))).status, 200)
})

test('DA-05: المهمة في محرك المهام — في «مهامي» برابط مستندها، ومابتتقفلش ولا بتتعدّل ولا بتتلغي من شاشة المهام، والتذكير والتصعيد شغالين عليها', async () => {
  await query('DELETE FROM [tasks]')
  const made = await issued(emps.subject, { ackDueDate: day(1) })
  const task = await taskOf(made.id)
  const BLOCKED = 'دي مهمة إقرار مستند: بتتقفل لوحدها لما الموظف يقرّ بيه من «مستنداتي»، ومابتتعدلش ولا بتتلغي من هنا'
  // «مهامي» لصاحب المستند: المهمة برقم مستنده ومن غير أزرار
  const mine = expectStatus(await request(users.subject, 'GET', '/tasks/mine'), 200)
  assert.deepEqual(mine.tasks.map(row => [row.id, row.title, row.documentAck, row.documentAckId, row.canWork, row.canManage, row.dueDate, row.status]),
    [[task.id, 'إقرار مستند', true, made.id, false, false, day(1), 'OPEN']])
  assert.equal(mine.counts.open, 1)
  // مديره المباشر، واللي أصدر، وصاحب «عرض كل المهام»: شايفين المهمة من غير رقم المستند ومن غير أزرار
  const team = expectStatus(await request(users.boss, 'GET', '/tasks/team'), 200)
  assert.deepEqual(team.tasks.map(row => [row.id, row.title, row.documentAck, row.documentAckId, row.canWork, row.canManage]), [[task.id, 'إقرار مستند', true, null, false, false]])
  for (const user of [users.taskBoss]) {
    const all = expectStatus(await request(user, 'GET', '/tasks'), 200)
    assert.deepEqual(all.tasks.map(row => [row.id, row.documentAck, row.documentAckId, row.canWork, row.canManage]), [[task.id, true, null, false, false]], user.email)
  }
  // تغيير الحالة مرفوض للكل: صاحبها، ومديره، وصاحب «إدارة المهام»
  for (const [user, body] of [[users.subject, { status: 'DONE' }], [users.subject, { status: 'IN_PROGRESS' }], [users.subject, { status: 'WAITING', note: 'مستني' }],
    [users.taskBoss, { status: 'DONE' }], [users.taskBoss, { status: 'CANCELLED', note: 'مش مطلوبة' }]]) {
    const response = await request(user, 'POST', `/tasks/${task.id}/status`, body)
    assert.deepEqual([response.status, messageOf(response)], [400, BLOCKED], `${user.email} ${body.status}`)
  }
  // والتعديل والتحويل وتغيير الموعد
  for (const body of [{ title: 'عنوان تاني' }, { dueDate: day(9) }, { assigneeEmployeeId: emps.second.id }]) {
    const response = await request(users.taskBoss, 'PATCH', `/tasks/${task.id}`, body)
    assert.deepEqual([response.status, messageOf(response)], [400, BLOCKED], JSON.stringify(body))
  }
  // ترتيب القفل (المستند قبل المهمة): الطلب الواقف على صف المستند مايبقاش ماسك صف المهمة — وإلا إلغاء الطلب في نفس اللحظة بيتعارض معاه
  for (const [method, route, body] of [['POST', `/tasks/${task.id}/status`, { status: 'DONE' }], ['PATCH', `/tasks/${task.id}`, { title: 'عنوان تاني' }]]) {
    const waited = await releaseTogether(`UPDATE [hr_issued_documents] SET [templateName] = [templateName] + N' ' WHERE [id] = @0`, [made.id], 1,
      () => request(users.taskBoss, method, route, body),
      () => query('SELECT [id] FROM [tasks] WITH (UPDLOCK, NOWAIT) WHERE [id] = @0', [task.id]), true)
    assert.deepEqual([waited.status, messageOf(waited)], [400, BLOCKED], `${method} ${route}`)
  }
  const untouched = await repo('Task').findOneByOrFail({ id: task.id })
  assert.deepEqual([untouched.title, untouched.status, untouched.dueDate, untouched.assigneeEmployeeId], ['إقرار مستند', 'OPEN', day(1), emps.subject.id])
  // مهمة عادية جنبها زي ما هي: الخطافات لمهمة الإقرار بس
  const ordinary = expectStatus(await request(users.taskBoss, 'POST', '/tasks', { title: 'مهمة عادية', assigneeEmployeeId: emps.subject.id }), 201)
  assert.deepEqual([ordinary.documentAck, ordinary.documentAckId, ordinary.canManage], [false, null, true])
  expectStatus(await request(users.subject, 'POST', `/tasks/${ordinary.id}/status`, { status: 'DONE' }), 201)

  // التذكير قبل الموعد (للموظف) والتصعيد بعد التأخير (لمديره): نفس مهمة المحرك المجدولة
  assert.deepEqual(await tasksService.runReminders(), { reminded: 1, escalated: 0 })
  assert.equal((await eventsOf('TASK_DUE_SOON', task.id)).length, 1)
  assert.deepEqual(await tasksService.runReminders(day(5)), { reminded: 0, escalated: 1 })
  assert.equal((await eventsOf('TASK_OVERDUE', task.id)).length, 1)

  // وبعد الإقرار: المهمة «خلصت» وماتتفتحش تاني من شاشة المهام
  expectStatus(await acknowledge(users.subject, made.id, (await ackColumns(made.id)).ackContentHash), 201)
  const reopen = await request(users.taskBoss, 'POST', `/tasks/${task.id}/status`, { status: 'OPEN', note: 'نفتحها تاني' })
  assert.deepEqual([reopen.status, messageOf(reopen), (await repo('Task').findOneByOrFail({ id: task.id })).status], [400, BLOCKED, 'DONE'])
  assert.equal(expectStatus(await request(users.subject, 'GET', '/tasks/mine'), 200).tasks.length, 0)

  // صف مهمة الإقرار مابيتقفلش من خطافات المهام (مرفوضة من غير تغيير): نداء واقف على قراءة تانية (هنا صف الموظف) مايبقاش ماسكه — وإلا
  // إلغاء الطلب (المستند، وبعده الموظف، وبعده المهمة) بيتعارض معاه
  const watched = await issued(emps.subject)
  const watchedTask = await taskOf(watched.id)
  for (const [method, route, body, expected] of [['POST', `/tasks/${watchedTask.id}/status`, { status: 'DONE' }, [400, BLOCKED]],
    ['PATCH', `/tasks/${watchedTask.id}`, { title: 'عنوان تاني' }, [403, 'تعديل المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»']]]) {
    const waited = await releaseTogether(`UPDATE [employees] SET [fullName] = [fullName] + N' ' WHERE [id] = @0`, [emps.subject.id], 1,
      () => request(users.boss, method, route, body), () => query('SELECT [id] FROM [tasks] WITH (UPDLOCK, NOWAIT) WHERE [id] = @0', [watchedTask.id]), true)
    assert.deepEqual([waited.status, messageOf(waited)], expected, `${method} ${route}`)
  }

  // ربط المهمة بمستندها بيتكتب في معاملة الإصدار بعد صف المهمة: نداء قرا الربط قبل ما المعاملة تتثبت واستنى على صف المهمة مايكمّلش عليها
  // كمهمة عادية (كان هيقفلها أو يحوّلها والطلب لسه مستني). المحاكاة: مهمة ممسوكة، والربط بيتثبّت والنداء واقف عليها
  const loose = expectStatus(await request(users.taskBoss, 'POST', '/tasks', { title: 'مهمة لسه بتتربط', assigneeEmployeeId: emps.subject.id }), 201)
  const bare = expectStatus(await issue(users.hrA, { employeeId: emps.subject.id }), 201)
  const link = taskId => query('UPDATE [hr_issued_documents] SET [ackTaskId] = @1 WHERE [id] = @0', [bare.id, taskId])
  for (const [user, method, route, body] of [[users.subject, 'POST', `/tasks/${loose.id}/status`, { status: 'DONE' }],
    [users.taskBoss, 'PATCH', `/tasks/${loose.id}`, { assigneeEmployeeId: emps.second.id }]]) {
    await link(null)
    const waited = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [loose.id], 1, () => request(user, method, route, body), () => link(loose.id))
    assert.deepEqual([waited.status, messageOf(waited)], [409, 'المهمة لسه بتتسجّل — حاول تاني بعد لحظة'], `${method} ${route}`)
  }
  const kept = await repo('Task').findOneByOrFail({ id: loose.id })
  assert.deepEqual([kept.status, kept.assigneeEmployeeId, kept.title], ['OPEN', emps.subject.id, 'مهمة لسه بتتربط'])
  // والمحاولة الجاية بتقرا الربط من الأول: مهمة إقرار، مرفوضة برسالتها
  const retried = await request(users.subject, 'POST', `/tasks/${loose.id}/status`, { status: 'DONE' })
  assert.deepEqual([retried.status, messageOf(retried)], [400, BLOCKED])
  // والقراءة اللي بعد القفل مابتستناش: طرف تاني كتب ربط المهمة ولسه ماثبّتوش (صف الربط نفسه ممسوك)، والنداء بيرد «حاول تاني» من غير ما
  // يستنى الطرف ده يخلّص
  await link(null)
  const linkHolder = ds.createQueryRunner()
  await linkHolder.connect()
  await linkHolder.startTransaction()
  try {
    const answered = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [loose.id], 1,
      () => Promise.race([request(users.subject, 'POST', `/tasks/${loose.id}/status`, { status: 'DONE' }), new Promise(resolve => setTimeout(() => resolve({ status: 'waited', body: null }), 4000))]),
      () => linkHolder.query('UPDATE [hr_issued_documents] SET [ackTaskId] = @1 WHERE [id] = @0', [bare.id, loose.id]))
    assert.deepEqual([answered.status, messageOf(answered)], [409, 'المهمة لسه بتتسجّل — حاول تاني بعد لحظة'])
  } finally {
    await linkHolder.rollbackTransaction()
    await linkHolder.release()
  }
  // والربط اللي مااتثبّتش مالوش أثر: المهمة لسه عادية ومفتوحة
  assert.equal((await repo('Task').findOneByOrFail({ id: loose.id })).status, 'OPEN')
  await link(null)
  expectStatus(await request(users.taskBoss, 'POST', `/tasks/${loose.id}/status`, { status: 'CANCELLED', note: 'مهمة اختبار' }), 201)
})

test('DA-06: الإلغاء — لصاحب «إدارة المستندات» اللي يشوف المستند، وقبل الإقرار بس؛ والمهمة بتتلغي وماتتفتحش تاني', async () => {
  const made = await issued(emps.subject, { ackDueDate: day(3) })
  const task = await taskOf(made.id)
  const cancel = (user, id = made.id) => request(user, 'POST', `/hr-documents/issued/${id}/acknowledgement/cancel`)
  // من غير صلاحية: مرفوض من الحارس. وصاحب الصلاحية في فرع تاني: المستند مش ظاهر له = نفس رد اللي مش موجود
  expectStatus(await cancel(users.subject), 403)
  expectStatus(await cancel(users.taskBoss), 403)
  const missing = await cancel(users.hrA, 999999)
  assert.deepEqual([missing.status, messageOf(missing)], [404, 'المستند غير موجود'])
  for (const response of [await cancel(users.hrB), await cancel(users.hrA, 3000000000)]) assert.deepEqual([response.status, response.body.message], [404, missing.body.message])
  assert.deepEqual([(await ackColumns(made.id)).ackDueDate, (await repo('Task').findOneByOrFail({ id: task.id })).status], [day(3), 'OPEN'])
  // مستند من غير طلب: مفيش حاجة تتلغي
  const plain = expectStatus(await issue(users.hrA, { employeeId: emps.subject.id }), 201)
  const nothing = await cancel(users.hrA, plain.id)
  assert.deepEqual([nothing.status, messageOf(nothing)], [400, 'المستند ده مش عليه طلب إقرار'])

  // الإلغاء: المستند رجع من غير طلب، والمهمة اتلغت بسببها وباسم اللي لغى
  const done = expectStatus(await cancel(users.hrA), 201)
  assert.deepEqual([done.id, done.ack], [made.id, null])
  const columns = await ackColumns(made.id)
  assert.deepEqual([columns.ackRequestedAt, columns.ackDueDate, columns.ackContentHash, columns.ackTaskId], [null, null, null, task.id])
  const cancelled = await repo('Task').findOneByOrFail({ id: task.id })
  assert.deepEqual([cancelled.status, cancelled.statusNote, cancelled.closedByUserId, !!cancelled.closedAt], ['CANCELLED', 'طلب الإقرار اتلغى', users.hrA.id, true])
  // وبعده: مش في قايمة الموظف، ومابيتقريش للإقرار، ومابيتقرّش بيه، والإلغاء تاني مفيش طلب
  assert.equal((await myList(users.subject)).documents.some(row => row.id === made.id), false)
  expectStatus(await reading(users.subject, made.id), 404)
  expectStatus(await acknowledge(users.subject, made.id, 'b'.repeat(64)), 404)
  assert.equal(await repo('HrDocumentAcknowledgement').count({ where: { documentId: made.id } }), 0)
  assert.equal((await cancel(users.hrA)).status, 400)
  // والمهمة الملغية لسه مهمة إقرار: ماتتفتحش تاني من شاشة المهام
  const reopen = await request(users.taskBoss, 'POST', `/tasks/${task.id}/status`, { status: 'OPEN', note: 'نفتحها تاني' })
  assert.deepEqual([reopen.status, (await repo('Task').findOneByOrFail({ id: task.id })).status], [400, 'CANCELLED'])
  // وملفه بيتبعت زي المستند العادي بعد الإلغاء
  assert.equal((await fetch(`${base}/hr-documents/issued/${made.id}/download`, auth(users.subject))).status, 200)

  // صاحب المستند مايلغيش طلب عليه هو (حتى وهو صاحب «إدارة المستندات»)؛ وحساب تاني بيلغيه
  const own = await issued(emps.hrFile)
  const self = await cancel(users.hrLinked, own.id)
  assert.deepEqual([self.status, messageOf(self), !!(await ackColumns(own.id)).ackRequestedAt, (await taskOf(own.id)).status],
    [403, 'طلب الإقرار ده عليك إنت — يلغيه حساب تاني من الموارد البشرية', true, 'OPEN'])
  expectStatus(await cancel(users.hrA, own.id), 201)
  // ومستنده هو اللي من غير طلب (أو اللي طلبه اتلغى): «مفيش طلب»، مش «الطلب عليك»
  const idle = await cancel(users.hrLinked, own.id)
  assert.deepEqual([idle.status, messageOf(idle)], [400, 'المستند ده مش عليه طلب إقرار'])
  // إلغاء ونقل في نفس اللحظة: الحكم بفرع الموظف بعد قفل صف المستند — نقل اتثبّت والإلغاء واقف بيتحكم بيه
  const mover = await employee()
  await account('mover', 'employee', [], { employeeId: mover.id })
  const racing = await issued(mover)
  const raced = await releaseTogether('SELECT [id] FROM [hr_issued_documents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [racing.id], 1,
    () => cancel(users.hrA, racing.id), () => repo('Employee').update({ id: mover.id }, { branchId: org.branchB.id }))
  assert.deepEqual([raced.status, messageOf(raced), !!(await ackColumns(racing.id)).ackRequestedAt, (await taskOf(racing.id)).status], [404, 'المستند غير موجود', true, 'OPEN'])
  // وصاحب الصلاحية في فرعه الجديد هو اللي يلغيه
  expectStatus(await cancel(users.hrB, racing.id), 201)
  // والحكم ثابت لحد ما الإلغاء يخلص: الموظف مقروء بقفل، فنقله والإلغاء شغال (واقف هنا على صف المهمة) بيستنى
  const steady = await employee()
  await account('steady', 'employee', [], { employeeId: steady.id })
  const held = await issued(steady)
  const finished = await releaseTogether('SELECT [id] FROM [tasks] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [(await taskOf(held.id)).id], 1,
    () => cancel(users.hrA, held.id),
    () => assert.rejects(query('UPDATE [employees] WITH (NOWAIT) SET [branchId] = @1 WHERE [id] = @0', [steady.id, org.branchB.id]), /1222|time out/i))
  assert.deepEqual([finished.status, (await repo('Employee').findOneByOrFail({ id: steady.id })).branchId, (await ackColumns(held.id)).ackRequestedAt], [201, org.branchA.id, null])
  // بعد الإقرار: الإلغاء مرفوض، والإقرار ومهمته زي ما هم
  const kept = await issued(emps.subject)
  expectStatus(await acknowledge(users.subject, kept.id, (await ackColumns(kept.id)).ackContentHash), 201)
  const late = await cancel(users.hrA, kept.id)
  assert.deepEqual([late.status, messageOf(late)], [400, 'الموظف أقرّ بالمستند خلاص — الإقرار مابيتلغيش'])
  assert.deepEqual([await repo('HrDocumentAcknowledgement').count({ where: { documentId: kept.id } }), !!(await ackColumns(kept.id)).ackRequestedAt, (await taskOf(kept.id)).status], [1, true, 'DONE'])
})

test('DA-07: السجل — حالة الإقرار وفلترها، وبنطاق القارئ بفرع الموظف دلوقتي', async () => {
  for (const table of ['hr_document_acknowledgements', 'tasks']) await query(`DELETE FROM [${table}]`)
  await query('DELETE FROM [hr_issued_documents]')
  const target = await employee()
  const owner = await account('target', 'employee', [], { employeeId: target.id })
  const plain = expectStatus(await issue(users.hrA, { employeeId: target.id }), 201)
  const pending = await issued(target, { ackDueDate: day(2) })
  // موعده النهارده: لسه «مستني» (المتأخر من بكرة)
  const dueToday = await issued(target, { ackDueDate: day(0) })
  const overdue = await issued(target, { ackDueDate: day(0) })
  await query('UPDATE [hr_issued_documents] SET [ackDueDate] = @1 WHERE [id] = @0', [overdue.id, day(-1)])
  const acknowledged = await issued(target, { ackDueDate: day(0) })
  await query('UPDATE [hr_issued_documents] SET [ackDueDate] = @1 WHERE [id] = @0', [acknowledged.id, day(-3)])
  expectStatus(await acknowledge(owner, acknowledged.id, (await ackColumns(acknowledged.id)).ackContentHash), 201)
  const list = async (user, suffix = '') => expectStatus(await request(user, 'GET', `/hr-documents/issued${suffix}`), 200)
  // السجل كله: كل مستند بحالة طلبه (والمتأخر اللي أقرّ = أقرّ)، ومن غير بصمة
  const all = await list(users.hrA)
  assert.deepEqual(all.map(row => [row.id, row.ack?.state ?? null, row.ack?.dueDate ?? null]),
    [[acknowledged.id, 'ACKNOWLEDGED', day(-3)], [overdue.id, 'OVERDUE', day(-1)], [dueToday.id, 'PENDING', day(0)], [pending.id, 'PENDING', day(2)], [plain.id, null, null]])
  assert.equal(all.some(row => row.ack && 'contentHash' in row.ack), false)
  // الفلتر، ومع فلتر الموظف
  assert.deepEqual([(await list(users.hrA, '?ack=pending')).map(row => row.id), (await list(users.hrA, '?ack=overdue')).map(row => row.id),
    (await list(users.hrA, '?ack=acknowledged')).map(row => row.id), (await list(users.hrA, `?employeeId=${target.id}&ack=overdue`)).map(row => row.id)],
  [[dueToday.id, pending.id], [overdue.id], [acknowledged.id], [overdue.id]])
  expectStatus(await request(users.hrA, 'GET', '/hr-documents/issued?ack=whatever'), 400)
  // ونطاق القارئ بفرع الموظف دلوقتي: فرع تاني مايشوفش حاجة؛ وبعد نقل الموظف لفرعه بيشوفها هو، وفرعه القديم لأ
  assert.deepEqual([(await list(users.hrB)).length, (await list(users.hrB, '?ack=overdue')).length], [0, 0])
  await repo('Employee').update({ id: target.id }, { branchId: org.branchB.id })
  assert.deepEqual([(await list(users.hrB, '?ack=overdue')).map(row => [row.id, row.ack.state]), (await list(users.hrA, '?ack=overdue')).length, (await list(users.hrA)).length],
    [[[overdue.id, 'OVERDUE']], 0, 0])
  // وإلغاء طلبه بقى لصاحب الصلاحية في فرعه الجديد
  expectStatus(await request(users.hrA, 'POST', `/hr-documents/issued/${pending.id}/acknowledgement/cancel`), 404)
  expectStatus(await request(users.hrB, 'POST', `/hr-documents/issued/${pending.id}/acknowledgement/cancel`), 201)
})

test('DA-08: إقرار المستند مابيقفلش النظام (حتى المتأخر)؛ والحساب المقفول على سياسة إلزامية بيقرّ بيها الأول', async () => {
  const older = await issued(emps.second)
  const made = await issued(emps.second, { ackDueDate: day(0) })
  await query('UPDATE [hr_issued_documents] SET [ackDueDate] = @1 WHERE [id] = @0', [made.id, day(-2)])
  const hash = (await ackColumns(made.id)).ackContentHash
  // القايمة: الأحدث إصدارًا الأول
  assert.deepEqual((await myList(users.second)).documents.map(row => row.id), [made.id, older.id])
  // مستند إقراره متأخر: الموظف شغال في النظام عادي
  assert.equal((await myList(users.second)).documents.find(row => row.id === made.id).state, 'OVERDUE')
  expectStatus(await request(users.second, 'GET', '/requests/mine'), 200)
  expectStatus(await request(users.second, 'GET', '/tasks/mine'), 200)
  // سياسة إلزامية من غير مهلة: الحساب مقفول عليها، ومسارات إقرار المستند مش من المسموح وهو مقفول
  const policy = expectStatus(await request(users.admin, 'POST', '/policies', { title: 'سياسة إلزامية — اختبار', isMandatory: true, graceDays: 0 }), 201)
  const version = expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/versions`, { bodyText: 'نص السياسة — اختبار', effectiveDate: day(0) }), 201)
  try {
    for (const [method, route, body] of [['GET', '/hr-documents/mine/acknowledgements'], ['GET', `/hr-documents/issued/${made.id}/acknowledgement`],
      ['POST', `/hr-documents/issued/${made.id}/acknowledge`, { contentHash: hash }], ['GET', `/hr-documents/issued/${made.id}/download`]]) {
      const response = await request(users.second, method, route, body)
      assert.deepEqual([response.status, response.body.code], [403, 'POLICY_ACK_REQUIRED'], `${method} ${route}`)
    }
    assert.equal(await repo('HrDocumentAcknowledgement').count({ where: { documentId: made.id } }), 0)
    // أقرّ بالسياسة: إقرار المستند رجع متاح
    expectStatus(await request(users.second, 'POST', `/policies/versions/${version.id}/acknowledge`, { contentHash: version.contentHash }), 201)
    expectStatus(await reading(users.second, made.id), 200)
    expectStatus(await acknowledge(users.second, made.id, hash), 201)
  } finally {
    expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`), 201)
  }
})
