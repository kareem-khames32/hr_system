'use strict'
// B2.5 (إضافة المالك 6 أكتوبر — «7.1 (إضافة المالك)»): قواعد إسناد المهام وتقييمها، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر
// (hr_task_rules_test_<16 hex>).
//  TR-01) اختبارات المالك الخمسة بالحرف: موظف يسند لزميله مرفوض؛ مدير يسند لحد تحت مديره المرؤوس مقبول؛ مدير يسند لقسم تاني مرفوض برسالة
//         الطلب؛ المسؤول يحاول يحوّل مرفوض؛ HR يسند برّه فروعه 404.
//  TR-02) «تحته في الشجرة»: المدير المباشر (المسجّل، قائد الفريق، رئيس القسم، مدير الفرع) ومديري الوحدات اللي فوق القسم، بأي عمق ومن غير قيد
//         فرع — ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟» على كل زوج في الهيكل (ومنه دايرة).
//  TR-03) المهمة الشخصية: أي موظف لنفسه من غير صلاحية؛ بيشوفها هو ومديره المباشر بس (مش مدير أعلى ولا صاحب صلاحية ولا مدير النظام)،
//         وبيديرها صاحبها بس؛ برّه قايمة «المهام» والتقرير؛ من غير «مهمة جديدة عليك» ولا تبليغ تأخير؛ وملف إثباتها بحكمها؛ وحساب اتربط
//         بموظف تاني مالوش عليها حق.
//  TR-04) صلاحية «تكليف أي موظف»: أي موظف في نطاق الحساب (برّه النطاق 404، والدور لأ)، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي؛ والصلاحية
//         مش في أي دور جاهز.
//  TR-05) اللي كلّف بيها بيديرها بحقه دلوقتي: مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد
//         من مرؤوسيه المباشرين.
//  TR-06) المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ «مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف (من الخادم)، لمسؤول المهمة بس؛
//         وسطور السجل برّه حوار المهمة.
//  TR-07) طلب تمديد الميعاد: للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق (الموعد بيتغيّر والتذكير بيتصفّر) أو يرفض؛ وبيتشال مع تغيير
//         الموعد أو التحويل أو الإقفال؛ وطلبين في نفس اللحظة واحد بس.
//  TR-08) سيناريو «خلص لما» والميزة مفتوحة: مدير أسند مهمة معلّمة «تحتاج تقييم» لحد في شجرته؛ المسؤول قفلها متأخر يومين بإثبات؛ المدير
//         رجّعها مرة بسبب (بترجع «جاري» والعدّاد 1) وبعدين قبلها وقيّمها 4 — وكله في سجل المهمة وفي التقرير؛ والتقييم مرة واحدة وللي كلّف بس،
//         والمقيّمة ماتترجعش.
//  TR-09) نفس السيناريو والميزة مقفولة: من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين؛ والتقييم القديم بيختفي لما الميزة تتقفل.
//  TR-10) التقرير: صاحب «عرض كل المهام» في نطاقه (وصف الموظف لو فرعه دلوقتي في النطاق)، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور
//         والشخصية برّاه؛ وحدود الفترة.
//  TR-11) سجل المهمة (GET /tasks/:id/log): كل تغيير سطر بنوعه وباسم اللي عمله، بيتقري بحكم المهمة، وبرّه حوار التعليقات؛ والتغيير اللي له
//         مستلم معاه تعليق عادي بإشارة في الحوار.
// Run (من api/): node --test test/tasks-assignment-rules.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_task_rules_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-task-rules-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, tasksService, resolver, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, made = {}
const OUTSIDE_TEAM = 'الموظف ده مش في فريقك. اعمل طلب، ولما يتعتمد هيتحوّل مهمة'
const ASSIGNEE_CANNOT_MANAGE = 'تعديل المهمة وتحويلها للي كلّف بيها أو لصاحب صلاحية «إدارة المهام». لو مش بتاعتك اكتب تعليق «مش بتاعتي»، ولو محتاج وقت اطلب تمديد الميعاد'
const RATING_CLOSED = 'تقييم المهام مقفول — بيتفتح من إعدادات الموديولات'

function assertDisposable() {
  assert.match(database, /^hr_task_rules_test_[a-f0-9]{16}$/)
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
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `TR${String(number).padStart(3, '0')}`, fullName: `موظف القواعد ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@task-rules.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
// حساب موظف من غير أي صلاحية
const login = (label, emp, extra = {}) => account(label, 'employee', [], { employeeId: emp.id, branchId: emp.branchId, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const create = async (user, body) => expectStatus(await request(user, 'POST', '/tasks', body), 201)
const status = (user, id, body) => request(user, 'POST', `/tasks/${id}/status`, body)
const view = (user, id) => request(user, 'GET', `/tasks/${id}`)
const mineIds = async user => expectStatus(await request(user, 'GET', '/tasks/mine'), 200).tasks.map(row => row.id).sort((a, b) => a - b)
const teamIds = async user => expectStatus(await request(user, 'GET', '/tasks/team'), 200).tasks.map(row => row.id).sort((a, b) => a - b)
const listIds = async (user, search = '?status=all') => expectStatus(await request(user, 'GET', `/tasks${search}`), 200).tasks.map(row => row.id)
const eventsOf = (type, taskId) => query(`SELECT [id] FROM [outbox_events] WHERE [eventType] = @0 AND [entityType] = N'task' AND [entityId] = @1`, [type, String(taskId)])
// صف حالة قواعد الإسناد للمهمة (جدول task_extras) — null لو المهمة من غير صف
const extrasOf = async id => (await query(`SELECT [isPersonal], [returnCount], [needsRating], [rating], [ratingNote], CONVERT(varchar(10), [extensionDueDate], 23) AS [extensionDueDate], [extensionReason]
  FROM [task_extras] WHERE [taskId] = @0`, [id]))[0] ?? null
// سجل المهمة زي ما القارئ ده شايفه: نوع كل سطر ونصه
const logOf = async (user, id) => expectStatus(await request(user, 'GET', `/tasks/${id}/log`), 200).lines.map(line => [line.event, line.body])
const feature = (enabled) => request(users.admin, 'PUT', '/modules/features/tasks.rating', { enabled })
const report = (user, search = '') => request(user, 'GET', `/tasks/report${search}`)
const rowOf = (body, emp) => body.rows.find(row => row.employeeId === emp.id) ?? null
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
async function upload(user) {
  const form = new FormData()
  form.append('file', new Blob([png()], { type: 'image/png' }), 'proof.png')
  const response = await fetch(`${base}/files/upload?entityType=task`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  assert.equal(response.status, 201, await response.clone().text())
  return (await response.json()).id
}
const download = async (user, fileId) => (await fetch(`${base}/files/${fileId}`, { headers: { Authorization: `Bearer ${token(user)}` } })).status
// اتصال تاني بيمسك صف لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: اللي واقفين بيكمّلوا في نفس اللحظة
async function releaseTogether(lockSql, params, count, start) {
  assertDisposable()
  const holder = ds.createQueryRunner()
  await holder.connect()
  await holder.startTransaction()
  try {
    await holder.query(lockSql, params)
    const pending = start()
    let blocked = 0
    for (let waited = 0; waited < 8000 && blocked < count; waited += 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      blocked = Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
    }
    assert.equal(blocked, count, 'الطلبات واقفة على الصف الممسوك')
    await holder.commitTransaction()
    return await pending
  } finally {
    if (holder.isTransactionActive) await holder.rollbackTransaction()
    await holder.release()
  }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  tasksService = app.get(require('../src/tasks/tasks.service').TasksService)
  resolver = app.get(require('../src/requests/approver-resolver.service').ApproverResolver)

  // الهيكل: فرع أ فيه إدارة (مديرها head) ← قسم (مديره subHead) ← فريق (قائده lead) فيه worker؛ وpeer في القسم برّه الفريق؛
  // وقسم تاني (مديره otherHead) فيه outsider؛ وفرع ب فيه bEmp. كل واحد بحساب من غير صلاحيات.
  org.branchA = await repo('Branch').save({ code: 'TR_A', name: 'فرع القواعد أ' })
  org.branchB = await repo('Branch').save({ code: 'TR_B', name: 'فرع القواعد ب' })
  emps.head = await employee(); emps.subHead = await employee(); emps.lead = await employee(); emps.otherHead = await employee()
  org.administration = await repo('Department').save({ name: 'إدارة التشغيل', code: 'TR_ADM', branchId: org.branchA.id, managerEmployeeId: emps.head.id })
  org.department = await repo('Department').save({ name: 'قسم الصيانة', code: 'TR_DEP', branchId: org.branchA.id, parentId: org.administration.id, managerEmployeeId: emps.subHead.id })
  org.otherDepartment = await repo('Department').save({ name: 'قسم المبيعات', code: 'TR_SAL', branchId: org.branchA.id, managerEmployeeId: emps.otherHead.id })
  org.team = await repo('Team').save({ name: 'فريق الورشة', code: 'TR_T', departmentId: org.department.id, leaderEmployeeId: emps.lead.id })
  await repo('Employee').update({ id: emps.head.id }, { departmentId: org.administration.id })
  await repo('Employee').update({ id: emps.subHead.id }, { departmentId: org.department.id })
  await repo('Employee').update({ id: emps.lead.id }, { departmentId: org.department.id, teamId: org.team.id })
  await repo('Employee').update({ id: emps.otherHead.id }, { departmentId: org.otherDepartment.id })
  emps.worker = await employee({ departmentId: org.department.id, teamId: org.team.id })
  emps.peer = await employee({ departmentId: org.department.id })
  emps.outsider = await employee({ departmentId: org.otherDepartment.id })
  emps.bEmp = await employee({ branchId: org.branchB.id })
  for (const key of Object.keys(emps)) users[key] = await login(key, emps[key])
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.hrA = await account('hr-a', 'employee', ['tasks.manage', 'tasks.view_all'])
  users.hrB = await account('hr-b', 'employee', ['tasks.manage', 'tasks.view_all'], { branchId: org.branchB.id })
  users.viewer = await account('viewer', 'employee', ['tasks.view_all'])
  users.pm = await account('pm', 'employee', ['tasks.assign_any'])
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-task-rules-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw errors[0]
})

test('TR-01: اختبارات المالك الخمسة — زميل مرفوض، وتحت المدير المرؤوس مقبول، وقسم تاني مرفوض برسالة الطلب، والمسؤول مايحوّلش، وHR برّه فروعه 404', async () => {
  // 1) موظف يسند لزميله ← مرفوض
  assert.deepEqual(answer(await request(users.worker, 'POST', '/tasks', { title: 'لزميلي', assigneeEmployeeId: emps.peer.id })), [403, OUTSIDE_TEAM])
  // 2) مدير يسند لحد تحت مديره المرؤوس ← مقبول (head فوق subHead، وsubHead فوق lead، وlead فوق worker)
  const task = await create(users.head, { title: 'راجع عقود الصيانة', assigneeEmployeeId: emps.worker.id, dueDate: day(3) })
  made.first = task
  assert.deepEqual([task.assigneeEmployeeId, task.branchId, task.canManage, task.canWork, task.personal, task.createdByName], [emps.worker.id, org.branchA.id, true, false, false, 'حساب head'])
  // 3) مدير يسند لقسم تاني ← مرفوض برسالة الطلب
  assert.deepEqual(answer(await request(users.head, 'POST', '/tasks', { title: 'لقسم تاني', assigneeEmployeeId: emps.outsider.id })), [403, OUTSIDE_TEAM])
  // 4) المسؤول يحاول يحوّل ← مرفوض (برسالة بتقول الإجراء الصح)
  assert.deepEqual(answer(await request(users.worker, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.peer.id })), [403, ASSIGNEE_CANNOT_MANAGE])
  assert.equal((await repo('Task').findOneByOrFail({ id: task.id })).assigneeEmployeeId, emps.worker.id)
  // 5) HR يسند برّه فروعه ← 404 (نفس رد الموظف اللي مش موجود)
  for (const assigneeEmployeeId of [emps.bEmp.id, 987654]) {
    assert.deepEqual(answer(await request(users.hrA, 'POST', '/tasks', { title: 'برّه فروعي', assigneeEmployeeId })), [404, 'الموظف غير موجود'], String(assigneeEmployeeId))
  }
  // والرفض مابيكشفش وجود: رقم مش موجود لحساب من غير صلاحية = نفس رسالة الموجود اللي برّه فريقه
  assert.deepEqual(answer(await request(users.worker, 'POST', '/tasks', { title: 'مش موجود', assigneeEmployeeId: 987654 })), [403, OUTSIDE_TEAM])
  assert.equal(await repo('Task').count(), 1, 'المرفوض ماعملش مهام')
})

test('TR-02: «تحته في الشجرة» — المدير المباشر ومديري الوحدات اللي فوق القسم بأي عمق، ومش لفوق ولا للجنب؛ و«كل اللي تحته» بنفس حكم «تحته؟»', async () => {
  const may = async (from, to) => (await request(users[from], 'POST', '/tasks', { title: `${from} ← ${to}`, assigneeEmployeeId: emps[to].id })).status
  // لتحت: قائد الفريق لعضو فريقه، ورئيس القسم لأي حد في قسمه (ومنهم قائد الفريق واللي برّه الفريق)، ومدير الإدارة لكل اللي تحتها
  for (const [from, to] of [['lead', 'worker'], ['subHead', 'worker'], ['subHead', 'lead'], ['subHead', 'peer'], ['head', 'subHead'], ['head', 'lead'], ['head', 'peer']]) {
    assert.equal(await may(from, to), 201, `${from} ← ${to}`)
  }
  // لفوق أو للجنب أو لقسم تاني: مرفوض
  for (const [from, to] of [['lead', 'peer'], ['lead', 'subHead'], ['subHead', 'head'], ['worker', 'lead'], ['peer', 'worker'], ['otherHead', 'worker'], ['head', 'otherHead'], ['subHead', 'outsider']]) {
    assert.equal(await may(from, to), 403, `${from} ← ${to}`)
  }
  // من غير قيد فرع: مرؤوس مسجّل في ملفه ومكانه فرع تاني
  const remote = await employee({ branchId: org.branchB.id, managerEmployeeId: emps.lead.id })
  const far = await create(users.lead, { title: 'مرؤوس في فرع تاني', assigneeEmployeeId: remote.id })
  assert.deepEqual([far.branchId, far.canManage], [org.branchB.id, true])
  // واللي فوق قائده كمان فوقه (سلسلة: remote ← lead ← subHead ← head)
  assert.equal((await request(users.head, 'POST', '/tasks', { title: 'أبعد في السلسلة', assigneeEmployeeId: remote.id })).status, 201)

  // «كل اللي تحته» = «تحته؟» على كل زوج، وعلى هيكل فيه دايرة (أ مدير ب وب مدير أ) ومدير مسجّل بنفسه
  const loopA = await employee(), loopB = await employee({ managerEmployeeId: loopA.id })
  await repo('Employee').update({ id: loopA.id }, { managerEmployeeId: loopB.id })
  const selfManaged = await employee()
  await repo('Employee').update({ id: selfManaged.id }, { managerEmployeeId: selfManaged.id })
  const everyone = (await repo('Employee').find({ select: { id: true } })).map(row => row.id)
  for (const manager of everyone) {
    const under = new Set(await resolver.subordinatesOf(manager))
    assert.equal(under.has(manager), false, 'المدير مش تحت نفسه')
    for (const person of everyone) assert.equal(await resolver.isUnder(person, manager), under.has(person), `${person} تحت ${manager}`)
  }
  assert.deepEqual([await resolver.isUnder(loopA.id, loopB.id), await resolver.isUnder(loopB.id, loopA.id), await resolver.isUnder(selfManaged.id, selfManaged.id)], [true, true, false])
  // المتوقع بالاسم للهيكل الأساسي
  const underHead = new Set(await resolver.subordinatesOf(emps.head.id))
  assert.deepEqual(['subHead', 'lead', 'worker', 'peer', 'outsider', 'otherHead', 'bEmp'].map(key => underHead.has(emps[key].id)), [true, true, true, true, false, false, false])
  assert.equal(underHead.has(remote.id), true)
  // قايمة «مين أقدر أكلّفه» لمدير الإدارة: كل اللي تحته ونفسه
  const options = expectStatus(await request(users.head, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual(options.employees.map(row => row.id).sort((a, b) => a - b), [emps.head.id, emps.subHead.id, emps.lead.id, emps.worker.id, emps.peer.id, remote.id].sort((a, b) => a - b))
  assert.deepEqual([options.canAssign, options.canManage, options.roles, options.rulesAvailable], [true, false, [], true])
  await query(`DELETE FROM [tasks] WHERE [id] <> @0`, [made.first.id])
  await repo('Employee').update({ id: remote.id }, { status: 'terminated', isActive: false })
})

test('TR-03: المهمة الشخصية — لصاحبها ومديره المباشر بس، وبيديرها صاحبها، وبرّه قايمة «المهام» والتقرير، ومن غير إشعار تكليف ولا تبليغ تأخير', async () => {
  const personal = await create(users.worker, { title: 'أجدّد رخصة القيادة', assigneeEmployeeId: emps.worker.id, dueDate: day(2), requiresProof: true })
  made.personal = personal
  assert.deepEqual([personal.personal, personal.canWork, personal.canManage, personal.canNotMine, personal.canRequestExtension], [true, true, true, false, false])
  assert.deepEqual((({ isPersonal, returnCount }) => [isPersonal, returnCount])(await extrasOf(personal.id)), [true, 0])
  // والمهمة العادية من غير حاجة من القواعد مالهاش صف
  assert.equal(await extrasOf(made.first.id), null)
  assert.deepEqual(await eventsOf('TASK_ASSIGNED', personal.id), [], 'من غير «مهمة جديدة عليك»')
  // بيشوفها صاحبها ومديره المباشر (قائد فريقه) بس — مش رئيس القسم ولا مدير الإدارة ولا أصحاب الصلاحيات ولا مدير النظام
  assert.ok((await mineIds(users.worker)).includes(personal.id))
  const forLead = expectStatus(await view(users.lead, personal.id), 200)
  assert.deepEqual([forLead.personal, forLead.canWork, forLead.canManage], [true, false, false])
  assert.ok((await teamIds(users.lead)).includes(personal.id), 'في «فريقي» بتاع مديره المباشر')
  for (const user of [users.subHead, users.head, users.peer, users.hrA, users.viewer, users.pm, users.admin]) {
    assert.deepEqual(answer(await view(user, personal.id)), [404, 'المهمة غير موجودة'], user.email)
    assert.equal((await request(user, 'GET', `/tasks/${personal.id}/comments`)).status, 404, user.email)
  }
  for (const user of [users.hrA, users.viewer, users.admin]) assert.equal((await listIds(user)).includes(personal.id), false, `${user.email}: برّه قايمة «المهام»`)
  // صاحبها بيديرها (موعد، إلغاء، إعادة فتح)، ومديره بيشوف بس، وصاحب الصلاحية مايلمسهاش
  expectStatus(await request(users.worker, 'PATCH', `/tasks/${personal.id}`, { dueDate: day(4) }), 200)
  assert.equal((await request(users.lead, 'PATCH', `/tasks/${personal.id}`, { dueDate: day(5) })).status, 403)
  assert.equal((await status(users.lead, personal.id, { status: 'CANCELLED', note: 'مديره مايلغيهاش' })).status, 403)
  assert.equal((await request(users.hrA, 'PATCH', `/tasks/${personal.id}`, { dueDate: day(5) })).status, 404)
  // مش لحد تاني من غير حق تكليفه، ومن غير تقييم ولا طلب تمديد
  assert.deepEqual(answer(await request(users.worker, 'PATCH', `/tasks/${personal.id}`, { assigneeEmployeeId: emps.peer.id })), [403, OUTSIDE_TEAM])
  expectStatus(await feature(true), 200)
  try {
    assert.deepEqual(answer(await request(users.worker, 'PATCH', `/tasks/${personal.id}`, { needsRating: true })), [400, 'علامة «تحتاج تقييم» لمهمة على موظف غير اللي بيكلّف بيها'])
    assert.deepEqual(answer(await request(users.worker, 'POST', '/tasks', { title: 'شخصية بتقييم', assigneeEmployeeId: emps.worker.id, needsRating: true })), [400, 'علامة «تحتاج تقييم» لمهمة على موظف غير اللي بيكلّف بيها'])
  } finally { expectStatus(await feature(false), 200) }
  assert.deepEqual(answer(await request(users.worker, 'POST', `/tasks/${personal.id}/extension`, { dueDate: day(9), reason: 'محتاج وقت' })), [400, 'المهمة الشخصية موعدها بيتعدّل من صاحبها'])
  // ملف إثباتها بحكمها: صاحبها ومديره المباشر، ومش صاحب الصلاحية
  const proof = await upload(users.worker)
  expectStatus(await status(users.worker, personal.id, { status: 'DONE', proofFileId: proof }), 201)
  assert.deepEqual([await download(users.worker, proof), await download(users.lead, proof), await download(users.hrA, proof), await download(users.subHead, proof), await download(users.admin, proof)], [200, 200, 404, 404, 404])
  // برّه التقرير: لصاحب «عرض كل المهام» ولمديره المباشر
  for (const user of [users.viewer, users.lead]) assert.equal(rowOf(expectStatus(await report(user), 200), emps.worker), null, user.email)
  // تأخيرها بيتختم من غير تبليغ لحد (والتذكير لصاحبها زي أي مهمة)
  expectStatus(await status(users.worker, personal.id, { status: 'OPEN', note: 'لسه ماخلصتش' }), 201)
  await repo('Task').update({ id: personal.id }, { dueDate: day(-10), remindedAt: null, escalatedAt: null })
  const normal = await create(users.lead, { title: 'مهمة عادية متأخرة', assigneeEmployeeId: emps.worker.id, dueDate: day(1) })
  await repo('Task').update({ id: normal.id }, { dueDate: day(-10) })
  const run = await tasksService.runReminders(day(0))
  assert.deepEqual([run.escalated, (await eventsOf('TASK_OVERDUE', personal.id)).length, (await eventsOf('TASK_OVERDUE', normal.id)).length], [1, 0, 1])
  assert.ok((await repo('Task').findOneByOrFail({ id: personal.id })).escalatedAt, 'اتختمت (ماتتفحصش كل يوم)')
  assert.deepEqual((await tasksService.runReminders(day(0))).escalated, 0)
  // صاحب صلاحية بيكلّف نفسه = شخصية برضه (مش ظاهرة لزميله صاحب نفس الصلاحية)
  const hrEmployee = await employee()
  const hrSelf = await account('hr-self', 'employee', ['tasks.manage', 'tasks.view_all'], { employeeId: hrEmployee.id })
  const own = await create(hrSelf, { title: 'تذكير لنفسي', assigneeEmployeeId: hrEmployee.id })
  assert.deepEqual([own.personal, (await view(users.hrA, own.id)).status, (await listIds(hrSelf)).includes(own.id)], [true, 404, false])
  // حساب اتربط بموظف تاني: مالوش حق على المهمة الشخصية القديمة، وحساب صاحبها الجديد بيديرها
  await repo('User').update({ id: users.worker.id }, { employeeId: emps.outsider.id })
  const moved = { ...users.worker, employeeId: emps.outsider.id }
  assert.equal((await view(moved, personal.id)).status, 404)
  const fresh = await login('worker-new', emps.worker)
  assert.deepEqual((({ canWork, canManage }) => [canWork, canManage])(expectStatus(await view(fresh, personal.id), 200)), [true, true])
  await repo('User').update({ id: users.worker.id }, { employeeId: emps.worker.id })
  await repo('User').update({ id: fresh.id }, { isActive: false })
  await query(`DELETE FROM [tasks] WHERE [id] = @0`, [normal.id])
})

test('TR-04: «تكليف أي موظف» — أي موظف في نطاق الحساب، وبيدير اللي كلّف بيه هو بس وبحقه دلوقتي، والصلاحية مش في أي دور جاهز', async () => {
  const task = await create(users.pm, { title: 'جهّز عرض المشروع', assigneeEmployeeId: emps.outsider.id, dueDate: day(5) })
  assert.deepEqual([task.assigneeEmployeeId, task.canManage, task.canWork, task.personal], [emps.outsider.id, true, false, false])
  // برّه النطاق 404 (موجود أو لأ)، والدور لأ
  for (const assigneeEmployeeId of [emps.bEmp.id, 987654]) assert.deepEqual(answer(await request(users.pm, 'POST', '/tasks', { title: 'برّه نطاقي', assigneeEmployeeId })), [404, 'الموظف غير موجود'])
  assert.equal((await request(users.pm, 'POST', '/tasks', { title: 'دور', assigneeRole: 'it', branchId: org.branchA.id })).status, 403)
  // بيدير اللي كلّف بيه (ومنه التحويل لحد تاني في نطاقه)، ومايشوفش مهمة غيره
  expectStatus(await request(users.pm, 'PATCH', `/tasks/${task.id}`, { dueDate: day(6) }), 200)
  assert.equal((await view(users.pm, made.first.id)).status, 404)
  assert.ok((await teamIds(users.pm)).includes(task.id), 'اللي كلّف بيه في «فريقي»')
  assert.deepEqual((({ manager }) => manager)(expectStatus(await request(users.pm, 'GET', '/tasks/team'), 200)), true)
  const options = expectStatus(await request(users.pm, 'GET', '/tasks/assignees'), 200)
  assert.deepEqual([options.canAssign, options.canManage, options.roles, options.branches], [true, false, [], []])
  assert.ok(options.employees.some(row => row.id === emps.outsider.id) && !options.employees.some(row => row.id === emps.bEmp.id))
  // بحقه دلوقتي: الصلاحية اتشالت، أو فرع المهمة خرج من نطاقه = لا يشوفها ولا يديرها؛ ورجعت = رجعت
  const without = { ...users.pm, permissions: JSON.stringify([]) }, elsewhere = { ...users.pm, branchId: org.branchB.id }
  for (const user of [without, elsewhere]) assert.equal((await view(user, task.id)).status, 404)
  assert.equal(expectStatus(await view(users.pm, task.id), 200).canManage, true)
  // «إدارة المهام» في فرعها بتديرها برضه، و«عرض كل المهام» بيشوفها بس
  assert.deepEqual([expectStatus(await view(users.hrA, task.id), 200).canManage, expectStatus(await view(users.viewer, task.id), 200).canManage], [true, false])
  // مش في أي دور جاهز
  const { ROLE_PRESETS } = require('../src/auth/permissions')
  for (const [role, preset] of Object.entries(ROLE_PRESETS)) assert.equal((preset.permissions ?? preset).includes('tasks.assign_any'), false, role)
  made.byPm = task
})

test('TR-05: اللي كلّف بيها بيديرها بحقه دلوقتي — مسؤولها خرج من تحته = لا يشوفها ولا يديرها، ورجع = رجعت؛ و«فريقي» فيه اللي كلّف بيه حد أبعد من مرؤوسيه', async () => {
  const task = made.first
  // head كلّف worker (مش مرؤوسه المباشر): المهمة في «فريقي» بتاعه وبيديرها
  const inTeam = expectStatus(await request(users.head, 'GET', '/tasks/team'), 200).tasks.find(row => row.id === task.id)
  assert.deepEqual([inTeam.canManage, inTeam.assigneeEmployeeId], [true, emps.worker.id])
  // قائد الفريق (مديره المباشر) بيشوفها ومايديرهاش، ورئيس القسم (فوقه بس مش المباشر ومش اللي كلّف) مايشوفهاش
  assert.deepEqual([expectStatus(await view(users.lead, task.id), 200).canManage, (await view(users.subHead, task.id)).status], [false, 404])
  // worker اتنقل لقسم تاني: head مابقاش فوقه
  await repo('Employee').update({ id: emps.worker.id }, { departmentId: org.otherDepartment.id, teamId: null })
  assert.equal((await view(users.head, task.id)).status, 404)
  assert.equal((await request(users.head, 'PATCH', `/tasks/${task.id}`, { dueDate: day(8) })).status, 404)
  assert.equal((await teamIds(users.head)).includes(task.id), false)
  // ومديره الجديد (رئيس القسم التاني) بيشوفها من غير إدارة
  assert.equal(expectStatus(await view(users.otherHead, task.id), 200).canManage, false)
  // رجع: حق اللي كلّف رجع
  await repo('Employee').update({ id: emps.worker.id }, { departmentId: org.department.id, teamId: org.team.id })
  assert.equal(expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { dueDate: day(3) }), 200).canManage, true)
  // اللي يحوّل المهمة بيبقى هو اللي كلّف بيها: subHead (فوق worker) مايقدرش يحوّلها (مش بتاعته)، وhrA يحوّلها فتبقى بتاعته
  assert.equal((await request(users.subHead, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.peer.id })).status, 404)
})

test('TR-06: المسؤول مايرفضش ولا يحوّل ولا يلغي ولا يغيّر الموعد؛ و«مش بتاعتي» تعليق بعلامته بيتشاور فيه للي كلّف من الخادم', async () => {
  const task = made.first
  for (const body of [{ dueDate: day(9) }, { title: 'عنوان تاني' }, { assigneeEmployeeId: emps.peer.id }, { assigneeEmployeeId: emps.worker.id, dueDate: day(9) }]) {
    assert.deepEqual(answer(await request(users.worker, 'PATCH', `/tasks/${task.id}`, body)), [403, ASSIGNEE_CANNOT_MANAGE], JSON.stringify(body))
  }
  assert.equal((await status(users.worker, task.id, { status: 'CANCELLED', note: 'مش عايزها' })).status, 403)
  const mine = expectStatus(await view(users.worker, task.id), 200)
  assert.deepEqual([mine.canNotMine, mine.canRequestExtension, mine.canManage], [true, true, false])
  assert.equal(expectStatus(await view(users.head, task.id), 200).canNotMine, false)
  // «مش بتاعتي»: المسؤول بيكتبها من غير ما يبعت إشارة، والخادم بيشاور للي كلّف ويسجّل حدث الإشارة
  const before = Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'COMMENT_MENTION'`))[0].n)
  const said = expectStatus(await request(users.worker, 'POST', `/tasks/${task.id}/comments`, { body: 'العقود دي تبع المشتريات مش الصيانة', notMine: true }), 201)
  assert.deepEqual([said.event, said.eventLabel, said.mentions.targets.map(target => target.key), said.body], ['NOT_MINE', 'مش بتاعتي', ['CREATOR'], 'العقود دي تبع المشتريات مش الصيانة'])
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'COMMENT_MENTION'`))[0].n), before + 1)
  // «مش بتاعتي» تعليق في حوار المهمة بعلامته — مش سطر في سجلها؛ وسطور السجل (التكليف وتغيير الموعد…) مش في الحوار
  const threadOf = async user => expectStatus(await request(user, 'GET', `/tasks/${task.id}/comments`), 200).comments
  assert.deepEqual((await threadOf(users.head)).map(row => [row.event, row.eventLabel, row.body, row.author.name]), [['NOT_MINE', 'مش بتاعتي', 'العقود دي تبع المشتريات مش الصيانة', emps.worker.fullName]])
  const logged = await logOf(users.head, task.id)
  assert.deepEqual([logged.length > 0, logged.some(row => row[0] === 'NOT_MINE'), logged[0]], [true, false, ['ASSIGNED', 'كلّف بالمهمة']])
  // المهمة زي ما هي: لسه عليه (القرار للي كلّف)
  assert.deepEqual((({ assigneeEmployeeId, status }) => [assigneeEmployeeId, status])(await repo('Task').findOneByOrFail({ id: task.id })), [emps.worker.id, 'OPEN'])
  // مش للي كلّف، ولا لمديره المباشر، ولا على مهمة شخصية (هو اللي كلّف نفسه)، ولا على طلب
  const REFUSED = [400, '«مش بتاعتي» لمسؤول المهمة على مهمة كلّفه بيها حد تاني']
  for (const user of [users.head, users.lead, users.hrA]) assert.deepEqual(answer(await request(user, 'POST', `/tasks/${task.id}/comments`, { body: 'مش بتاعتي', notMine: true })), REFUSED, user.email)
  assert.deepEqual(answer(await request(users.worker, 'POST', `/tasks/${made.personal.id}/comments`, { body: 'مش بتاعتي', notMine: true })), REFUSED)
  assert.equal((await request(users.worker, 'POST', `/tasks/${task.id}/comments`, { body: 'قيمة غلط', notMine: 'yes' })).status, 400)
  // والتعليق العادي من غير علامة، والعميل مايقدرش يبعت علامة سطر سجل
  const plain = expectStatus(await request(users.worker, 'POST', `/tasks/${task.id}/comments`, { body: 'تعليق عادي', event: 'RATED' }), 201)
  assert.deepEqual(['event' in plain, 'eventLabel' in plain], [false, false], 'التعليق العادي بشكله القديم')
  assert.deepEqual((await threadOf(users.head)).map(row => row.body), ['العقود دي تبع المشتريات مش الصيانة', 'تعليق عادي'])
})

test('TR-07: طلب تمديد الميعاد — للمسؤول بسبب، واحد معلّق، واللي بيدير المهمة يوافق أو يرفض، وبيتشال مع تغيير الموعد أو التحويل أو الإقفال', async () => {
  const task = made.first, due = (await repo('Task').findOneByOrFail({ id: task.id })).dueDate
  const ask = (user, body, id = task.id) => request(user, 'POST', `/tasks/${id}/extension`, body)
  const decide = (user, body, id = task.id) => request(user, 'POST', `/tasks/${id}/extension/decision`, body)
  // للمسؤول بس، وبموعد بعد الحالي ومش فايت، وبسبب
  assert.deepEqual(answer(await ask(users.head, { dueDate: day(9), reason: 'محتاج وقت' })), [403, 'طلب تمديد الميعاد لمسؤول المهمة'])
  assert.equal((await ask(users.peer, { dueDate: day(9), reason: 'محتاج وقت' })).status, 404)
  for (const dueDate of [due, day(1), day(-1)]) {
    assert.deepEqual(answer(await ask(users.worker, { dueDate, reason: 'محتاج وقت' })), [400, 'الموعد المطلوب لازم يبقى بعد موعد المهمة الحالي ومش قبل النهارده'], dueDate)
  }
  assert.equal((await ask(users.worker, { dueDate: day(9), reason: 'ن' })).status, 400)
  assert.equal((await ask(users.worker, { dueDate: '2026-02-30', reason: 'تاريخ مش حقيقي' })).status, 400)
  assert.deepEqual(answer(await decide(users.head, { approve: true })), [400, 'مفيش طلب تمديد مستني الرد'])
  // طلبين في نفس اللحظة: واحد بس
  const both = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [task.id], 2,
    () => Promise.all([ask(users.worker, { dueDate: day(9), reason: 'مستني قطع الغيار' }), ask(users.worker, { dueDate: day(10), reason: 'مستني قطع الغيار' })]))
  assert.deepEqual(both.map(response => response.status).sort(), [201, 409])
  assert.equal(messageOf(both.find(response => response.status === 409)), 'فيه طلب تمديد مستني الرد')
  const asked = both.find(response => response.status === 201).body
  assert.deepEqual([asked.extension.reason, asked.canRequestExtension, asked.dueDate], ['مستني قطع الغيار', false, due])
  // ظاهر للي يشوف المهمة، والرد للي بيديرها بس
  const forHead = expectStatus(await view(users.head, task.id), 200)
  assert.deepEqual([forHead.extension.dueDate, forHead.canDecideExtension, expectStatus(await view(users.lead, task.id), 200).canDecideExtension], [asked.extension.dueDate, true, false])
  for (const user of [users.worker, users.lead]) assert.deepEqual(answer(await decide(user, { approve: true })), [403, 'الرد على طلب التمديد للي كلّف بالمهمة أو لصاحب صلاحية «إدارة المهام»'], user.email)
  // الرفض بيشيل الطلب والموعد زي ما هو
  const rejected = expectStatus(await decide(users.head, { approve: false, note: 'القطع وصلت' }), 201)
  assert.deepEqual([rejected.extension, rejected.dueDate], [null, due])
  // الموافقة بتغيّر الموعد وبتصفّر ختم التذكير
  await repo('Task').update({ id: task.id }, { remindedAt: new Date(), escalatedAt: new Date() })
  expectStatus(await ask(users.worker, { dueDate: day(12), reason: 'الجرد اتأجل' }), 201)
  const approved = expectStatus(await decide(users.hrA, { approve: true }), 201)
  assert.deepEqual([approved.dueDate, approved.extension, approved.canRequestExtension], [day(12), null, false], 'hrA شايفها ومش مسؤولها')
  assert.deepEqual((await logOf(users.head, task.id)).map(row => row[0]).filter(kind => kind.startsWith('EXTENSION_')),
    ['EXTENSION_REQUESTED', 'EXTENSION_REJECTED', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED'])
  assert.deepEqual((({ dueDate, remindedAt, escalatedAt }) => [dueDate, remindedAt, escalatedAt])(await repo('Task').findOneByOrFail({ id: task.id })), [day(12), null, null])
  // طلب موعده فات مايتوافقش عليه؛ وبيتشال مع تغيير الموعد من اللي بيديرها
  expectStatus(await ask(users.worker, { dueDate: day(20), reason: 'طلب تالت' }), 201)
  await query(`UPDATE [task_extras] SET [extensionDueDate] = @1 WHERE [taskId] = @0`, [task.id, day(-1)])
  assert.deepEqual(answer(await decide(users.head, { approve: true })), [400, 'الموعد المطلوب فات — ارفض الطلب وعدّل موعد المهمة'])
  await query(`UPDATE [task_extras] SET [extensionDueDate] = @1 WHERE [taskId] = @0`, [task.id, day(20)])
  assert.equal(expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { dueDate: day(14) }), 200).extension, null)
  // وبيتشال مع الإقفال، ومع التحويل
  expectStatus(await ask(users.worker, { dueDate: day(21), reason: 'طلب رابع' }), 201)
  expectStatus(await status(users.worker, task.id, { status: 'DONE' }), 201)
  assert.deepEqual((({ extensionDueDate, extensionReason }) => [extensionDueDate, extensionReason])(await extrasOf(task.id)), [null, null])
  assert.deepEqual(answer(await ask(users.worker, { dueDate: day(22), reason: 'مقفولة' })), [400, 'المهمة مقفولة'])
  expectStatus(await status(users.head, task.id, { status: 'OPEN', note: 'ناقصة مراجعة' }), 201)
  expectStatus(await ask(users.worker, { dueDate: day(22), reason: 'طلب خامس' }), 201)
  const moved = expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.peer.id }), 200)
  assert.deepEqual([moved.assigneeEmployeeId, moved.extension, moved.returnCount, moved.status], [emps.peer.id, null, 0, 'OPEN'], 'التحويل بيبدأ من غير طلب ولا رجوع من اللي قبله')
  // ومهمة من غير موعد مالهاش تمديد
  const open = await create(users.head, { title: 'من غير موعد', assigneeEmployeeId: emps.worker.id })
  assert.deepEqual([answer(await ask(users.worker, { dueDate: day(5), reason: 'محتاج وقت' }, open.id)), open.canRequestExtension], [[400, 'المهمة من غير موعد — مفيش ميعاد يتمدّد'], false])
  await query(`DELETE FROM [tasks] WHERE [id] = @0`, [open.id])
  expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.worker.id }), 200)
})

test('TR-08: «خلص لما» والميزة مفتوحة — مهمة معلّمة، اتقفلت متأخر يومين بإثبات، اترجّعت مرة بسبب، واتقبلت واتقيّمت 4؛ وكله في السجل والتقرير', async () => {
  expectStatus(await feature(true), 200)
  // مدير أسند مهمة لحد في شجرته بعلامة «تحتاج تقييم»
  const task = await create(users.head, { title: 'تقرير أعطال الربع', assigneeEmployeeId: emps.worker.id, dueDate: day(1), requiresProof: true, needsRating: true })
  made.rated = task
  assert.deepEqual([task.needsRating, task.ratingEnabled, task.rating, task.canRate, task.returnCount, task.compliance], [true, true, null, false, 0, null])
  // المسؤول قفلها متأخر يومين بإثبات
  await repo('Task').update({ id: task.id }, { dueDate: day(-2) })
  const mentions = async () => Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'COMMENT_MENTION'`))[0].n)
  const beforeDone = await mentions()
  let now = expectStatus(await status(users.worker, task.id, { status: 'DONE', proofNote: 'التقرير اتبعت بالإيميل' }), 201)
  assert.deepEqual([now.status, now.compliance, now.complianceLabel, now.canRate], ['DONE', { onTime: false, lateDays: 2 }, 'متأخر يومين', false])
  assert.equal(await mentions(), beforeDone + 1, 'إنجاز مهمة معلّمة بيبلّغ اللي كلّف بيها')
  assert.equal(expectStatus(await view(users.head, task.id), 200).canRate, true)
  assert.equal(expectStatus(await view(users.hrA, task.id), 200).canRate, false, 'التقييم للي كلّف بيها بس (مش لصاحب «إدارة المهام»)')
  // المدير رجّعها مرة بسبب: بترجع «جاري» للمسؤول، والعدّاد 1، وإثبات الإقفال اتشال
  assert.deepEqual(answer(await status(users.head, task.id, { status: 'OPEN' })), [400, 'اكتب سبب رجوع المهمة للتعديل'])
  assert.equal((await status(users.worker, task.id, { status: 'OPEN', note: 'أرجّعها لنفسي' })).status, 403)
  const beforeReturn = await mentions()
  now = expectStatus(await status(users.head, task.id, { status: 'OPEN', note: 'ناقص جدول الأعطال المتكررة' }), 201)
  assert.equal(await mentions(), beforeReturn + 1, 'الرجوع للتعديل بيبلّغ المسؤول')
  assert.deepEqual([now.status, now.statusNote, now.returnCount, now.proofNote, now.closedAt, now.compliance], ['IN_PROGRESS', 'ناقص جدول الأعطال المتكررة', 1, null, null, null])
  assert.ok((await mineIds(users.worker)).includes(task.id), 'رجعت في «مهامي» بتاعة المسؤول')
  // قبلها وقيّمها 4: بعد ما تخلص، واللي كلّف بيها بس، ومرة واحدة، ومن 1 لـ5
  const rate = (user, body) => request(user, 'POST', `/tasks/${task.id}/rating`, body)
  assert.deepEqual(answer(await rate(users.head, { rating: 4 })), [400, 'التقييم بعد ما المهمة تخلص'])
  now = expectStatus(await status(users.worker, task.id, { status: 'DONE', proofNote: 'اتضاف الجدول' }), 201)
  assert.deepEqual([now.compliance.lateDays, now.returnCount], [2, 1])
  for (const user of [users.worker, users.lead, users.hrA]) assert.deepEqual(answer(await rate(user, { rating: 5 })), [403, 'تقييم المهمة للي كلّف بيها'], user.email)
  for (const rating of [0, 6, 3.5]) assert.equal((await rate(users.head, { rating })).status, 400, String(rating))
  const beforeRate = await mentions()
  now = expectStatus(await rate(users.head, { rating: 4, note: ' شغل كويس بعد التعديل ' }), 201)
  assert.deepEqual([now.rating, now.ratingNote, now.canRate, now.needsRating], [4, 'شغل كويس بعد التعديل', false, true])
  assert.equal(await mentions(), beforeRate + 1, 'التقييم بيبلّغ المسؤول (عشان يشوف تقييمه في كارت مهمته)')
  assert.deepEqual(answer(await rate(users.head, { rating: 5 })), [409, 'المهمة اتقيّمت قبل كده'])
  // المقيّمة اتقبلت: ماتترجعش
  assert.deepEqual(answer(await status(users.head, task.id, { status: 'OPEN', note: 'تاني' })), [400, 'المهمة اتقبلت واتقيّمت — ماتترجعش للتعديل'])
  // الموظف يشوف تقييم مهمته، وزمايله لأ (مايشوفوش المهمة أصلًا)
  assert.deepEqual((({ rating, ratingNote }) => [rating, ratingNote])(expectStatus(await view(users.worker, task.id), 200)), [4, 'شغل كويس بعد التعديل'])
  assert.equal((await view(users.peer, task.id)).status, 404)
  // كله ظاهر في سجل المهمة
  assert.deepEqual(await logOf(users.worker, task.id), [['ASSIGNED', 'كلّف بالمهمة'], ['DONE', 'قفل المهمة — متأخر يومين'], ['RETURNED', 'رجّع المهمة للتعديل: ناقص جدول الأعطال المتكررة'],
    ['DONE', 'قفل المهمة — متأخر يومين'], ['RATED', 'قيّم المهمة']])
  // والتغييرات اللي ليها مستلم (إنجاز المهمة المعلّمة، والرجوع للتعديل، والتقييم) تعليقات عادية في حوار المهمة باسم اللي عملها وبإشارة للمستلم
  const notices = expectStatus(await request(users.head, 'GET', `/tasks/${task.id}/comments`), 200).comments
  assert.deepEqual(notices.map(row => [row.body, row.author.name, row.mentions.targets.map(target => target.key), 'event' in row]), [
    ['قفل المهمة — متأخر يومين', emps.worker.fullName, ['CREATOR'], false], ['رجّع المهمة للتعديل: ناقص جدول الأعطال المتكررة', 'موظف القواعد 1', ['ASSIGNEE'], false],
    ['قفل المهمة — متأخر يومين', emps.worker.fullName, ['CREATOR'], false], ['قيّم المهمة', 'موظف القواعد 1', ['ASSIGNEE'], false]])
  // وفي التقرير: للمدير اللي كلّف، ولصاحب «عرض كل المهام»
  for (const user of [users.head, users.viewer]) {
    const body = expectStatus(await report(user), 200)
    assert.deepEqual((({ done, onTime, late, noDueDate, returns, rated, ratingAverage }) => [done, onTime, late, noDueDate, returns, rated, ratingAverage])(rowOf(body, emps.worker)), [1, 0, 1, 0, 1, 1, 4], user.email)
    assert.deepEqual([body.available, body.ratingEnabled], [true, true])
  }
  // مهمة مش معلّمة مابتتقيّمش، ومهمة النظام (تنفيذ طلب) والدور مابيتعلّموش
  const plain = await create(users.head, { title: 'مش معلّمة', assigneeEmployeeId: emps.worker.id })
  expectStatus(await status(users.worker, plain.id, { status: 'DONE' }), 201)
  assert.deepEqual(answer(await request(users.head, 'POST', `/tasks/${plain.id}/rating`, { rating: 3 })), [400, 'المهمة دي مش معلّمة «تحتاج تقييم»'])
  assert.deepEqual(answer(await request(users.hrA, 'POST', '/tasks', { title: 'دور بتقييم', assigneeRole: 'it', branchId: org.branchA.id, needsRating: true })),
    [400, 'علامة «تحتاج تقييم» لمهمة على موظف غير اللي بيكلّف بيها'])
  made.plain = plain
  // معلّمة ولسه مفتوحة: بتتقفل في TR-09 بعد ما الميزة تتقفل
  made.flagged = await create(users.head, { title: 'معلّمة لسه مفتوحة', assigneeEmployeeId: emps.peer.id, needsRating: true })
  // ومهمة اتقبلت واتقيّمت والميزة مفتوحة: بترجع للتعديل في TR-09 بعد ما الميزة تتقفل
  made.accepted = await create(users.head, { title: 'اتقيّمت قبل قفل الميزة', assigneeEmployeeId: emps.peer.id, needsRating: true })
  expectStatus(await status(users.peer, made.accepted.id, { status: 'DONE' }), 201)
  expectStatus(await request(users.head, 'POST', `/tasks/${made.accepted.id}/rating`, { rating: 5, note: 'تمام' }), 201)
  assert.deepEqual(answer(await status(users.head, made.accepted.id, { status: 'OPEN', note: 'والميزة مفتوحة' })), [400, 'المهمة اتقبلت واتقيّمت — ماتترجعش للتعديل'])
})

test('TR-09: نفس السيناريو والميزة مقفولة — من غير علامة ولا تقييم ولا خاناتهم، والالتزام والرجوع شغالين', async () => {
  expectStatus(await feature(false), 200)
  // التقييم القديم اختفى من الخانات والتقرير (والبيانات محفوظة)
  const old = expectStatus(await view(users.head, made.rated.id), 200)
  assert.deepEqual([old.ratingEnabled, old.needsRating, old.rating, old.ratingNote, old.canRate, old.complianceLabel, old.returnCount], [false, false, null, null, false, 'متأخر يومين', 1])
  assert.deepEqual((({ rating }) => rating)(await extrasOf(made.rated.id)), 4)
  const closedReport = expectStatus(await report(users.head), 200)
  assert.deepEqual([closedReport.ratingEnabled, rowOf(closedReport, emps.worker).rated, rowOf(closedReport, emps.worker).ratingAverage, rowOf(closedReport, emps.worker).returns], [false, null, null, 1])
  // مهمة اتعلّمت والميزة مفتوحة واتقفلت بعد قفل الميزة: من غير إشعار «قيّمها» للي كلّف، ومن غير خانات تقييم
  const mentions = async () => Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'COMMENT_MENTION'`))[0].n)
  const beforeClose = await mentions()
  const closedFlagged = expectStatus(await status(users.peer, made.flagged.id, { status: 'DONE' }), 201)
  assert.deepEqual([closedFlagged.status, closedFlagged.needsRating, closedFlagged.canRate, await mentions()], ['DONE', false, false, beforeClose])
  // رجوع مرتين: العدّاد بيزيد كل مرة
  expectStatus(await status(users.head, made.flagged.id, { status: 'OPEN', note: 'أول مرة' }), 201)
  expectStatus(await status(users.peer, made.flagged.id, { status: 'DONE' }), 201)
  const twice = expectStatus(await status(users.head, made.flagged.id, { status: 'OPEN', note: 'تاني مرة' }), 201)
  assert.deepEqual([twice.status, twice.returnCount], ['IN_PROGRESS', 2])
  // مهمة اتقيّمت والميزة مفتوحة: والميزة مقفولة التقييم لا ظاهر ولا ساري، فالرجوع شغال زي أي مهمة — وبيشيل التقييم المخزّن (الإنجاز اللي اتقيّم اترفض)
  assert.deepEqual((({ rating, ratingNote }) => [rating, ratingNote])(await extrasOf(made.accepted.id)), [5, 'تمام'])
  const voided = expectStatus(await status(users.head, made.accepted.id, { status: 'OPEN', note: 'ناقصها مراجعة' }), 201)
  assert.deepEqual([voided.status, voided.returnCount, voided.rating], ['IN_PROGRESS', 1, null])
  assert.deepEqual((({ rating, ratingNote, needsRating, returnCount }) => [rating, ratingNote, needsRating, returnCount])(await extrasOf(made.accepted.id)), [null, null, true, 1])
  // ولما تخلص تاني والميزة تتفتح: من غير تقييم قديم، وتتقيّم من جديد
  expectStatus(await status(users.peer, made.accepted.id, { status: 'DONE' }), 201)
  expectStatus(await feature(true), 200)
  assert.deepEqual((({ rating, canRate, needsRating }) => [rating, canRate, needsRating])(expectStatus(await view(users.head, made.accepted.id), 200)), [null, true, true])
  expectStatus(await feature(false), 200)
  // العلامة والتقييم مرفوضين برسالتهم
  assert.deepEqual(answer(await request(users.head, 'POST', '/tasks', { title: 'معلّمة والميزة مقفولة', assigneeEmployeeId: emps.worker.id, needsRating: true })), [400, RATING_CLOSED])
  assert.deepEqual(answer(await request(users.head, 'POST', `/tasks/${made.rated.id}/rating`, { rating: 5 })), [400, RATING_CLOSED])
  // والسيناريو نفسه من غير تقييم: قفل متأخر يومين، ورجوع مرة بسبب، وقبول
  const task = await create(users.head, { title: 'تقرير أعطال الشهر', assigneeEmployeeId: emps.worker.id, dueDate: day(1), requiresProof: true })
  assert.deepEqual([task.needsRating, task.ratingEnabled, task.canRate], [false, false, false])
  await repo('Task').update({ id: task.id }, { dueDate: day(-2) })
  let now = expectStatus(await status(users.worker, task.id, { status: 'DONE', proofNote: 'اتبعت' }), 201)
  assert.deepEqual([now.complianceLabel, now.rating, now.canRate], ['متأخر يومين', null, false])
  now = expectStatus(await status(users.head, task.id, { status: 'OPEN', note: 'ناقص التوقيع' }), 201)
  assert.deepEqual([now.status, now.returnCount], ['IN_PROGRESS', 1])
  now = expectStatus(await status(users.worker, task.id, { status: 'DONE', proofNote: 'اتوقّع' }), 201)
  assert.deepEqual([now.status, now.returnCount, now.complianceLabel], ['DONE', 1, 'متأخر يومين'])
  assert.deepEqual((await logOf(users.head, task.id)).map(row => row[0]), ['ASSIGNED', 'DONE', 'RETURNED', 'DONE'])
  // والملغية بتتفتح «مفتوحة» من غير عدّاد، وفي الميعاد
  const quick = await create(users.head, { title: 'في ميعادها', assigneeEmployeeId: emps.worker.id, dueDate: day(0) })
  expectStatus(await status(users.head, quick.id, { status: 'CANCELLED', note: 'اتأجلت' }), 201)
  now = expectStatus(await status(users.head, quick.id, { status: 'OPEN', note: 'رجعنا لها' }), 201)
  assert.deepEqual([now.status, now.returnCount, now.statusNote], ['OPEN', 0, 'رجعنا لها'])
  now = expectStatus(await status(users.worker, quick.id, { status: 'DONE' }), 201)
  assert.deepEqual([now.compliance, now.complianceLabel], [{ onTime: true, lateDays: 0 }, 'في الميعاد'])
  assert.deepEqual((await logOf(users.head, quick.id)).map(row => row[0]), ['ASSIGNED', 'CANCELLED', 'REOPENED', 'DONE'])
  made.second = task; made.quick = quick
})

test('TR-10: التقرير — صاحب «عرض كل المهام» في نطاقه، والمدير على اللي يشوفه، وغيرهم فاضي؛ ومهمة الدور والشخصية برّاه؛ وحدود الفترة', async () => {
  // worker خلّص 4 مهام في الفترة: واحدة متأخرة ومقيّمة (TR-08)، وواحدة من غير موعد، وواحدة متأخرة (TR-09)، وواحدة في ميعادها
  const forViewer = expectStatus(await report(users.viewer), 200)
  assert.deepEqual((({ done, onTime, late, noDueDate, returns }) => [done, onTime, late, noDueDate, returns])(rowOf(forViewer, emps.worker)), [4, 1, 2, 1, 2])
  assert.deepEqual([rowOf(forViewer, emps.worker).fullName, rowOf(forViewer, emps.worker).branchName], [emps.worker.fullName, 'فرع القواعد أ'])
  // مهمة الدور برّاه (مالهاش موظف)، والشخصية برّاه (TR-03)
  const role = await create(users.hrA, { title: 'مهمة دور', assigneeRole: 'it', branchId: org.branchA.id })
  expectStatus(await status(users.hrA, role.id, { status: 'DONE' }), 201)
  assert.deepEqual(expectStatus(await report(users.viewer), 200).rows.map(row => row.employeeId), forViewer.rows.map(row => row.employeeId))
  // فرع تاني مايشوفش، والموظف من غير مرؤوسين ولا صلاحية فاضي
  assert.equal(rowOf(expectStatus(await report(users.hrB), 200), emps.worker), null)
  for (const user of [users.worker, users.peer]) assert.deepEqual(expectStatus(await report(user), 200).rows, [], user.email)
  // المدير المباشر (قائد الفريق) بيشوف مهام مرؤوسه كلها؛ ومدير الإدارة اللي كلّف بيها بس (كلها هنا منه)؛ ورئيس القسم (لا مباشر ولا كلّف) لأ
  assert.equal(rowOf(expectStatus(await report(users.lead), 200), emps.worker).done, 4)
  assert.equal(rowOf(expectStatus(await report(users.head), 200), emps.worker).done, 4)
  assert.equal(rowOf(expectStatus(await report(users.subHead), 200), emps.worker), null)
  // الموظف اتنقل لفرع برّه نطاق صاحب الصلاحية بعد ما خلّص: صفه مابيتسمّاش عنده (ومديره المباشر لسه شايفه)
  await repo('Employee').update({ id: emps.worker.id }, { branchId: org.branchB.id })
  assert.equal(rowOf(expectStatus(await report(users.viewer), 200), emps.worker), null)
  assert.equal(rowOf(expectStatus(await report(users.lead), 200), emps.worker).done, 4)
  // وصاحب صلاحية الفرع اللي اتنقل له مايعدّش مهامه اللي اتكلّف بيها في الفرع القديم (التقرير على مهام فروع نطاقه)
  assert.equal(rowOf(expectStatus(await report(users.hrB), 200), emps.worker), null)
  await repo('Employee').update({ id: emps.worker.id }, { branchId: org.branchA.id })
  // وصاحب «تكليف أي موظف» زيه: اللي كلّف بيه (TR-04) خلص وظاهر في تقريره، ولما الموظف يتنقل برّه نطاقه صفه مابيتسمّاش
  expectStatus(await status(users.outsider, made.byPm.id, { status: 'DONE' }), 201)
  assert.deepEqual((({ done, fullName }) => [done, fullName])(rowOf(expectStatus(await report(users.pm), 200), emps.outsider)), [1, emps.outsider.fullName])
  assert.deepEqual(expectStatus(await report({ ...users.pm, permissions: JSON.stringify([]) }), 200).rows, [], 'اللي كلّف وفقد حقه مايشوفش اللي كلّف بيه في التقرير')
  await repo('Employee').update({ id: emps.outsider.id }, { branchId: org.branchB.id })
  assert.deepEqual(expectStatus(await report(users.pm), 200).rows, [])
  // (ورئيس قسمه — مديره المباشر — لسه شايف صفه: فوقه في الهيكل)
  assert.equal(rowOf(expectStatus(await report(users.otherHead), 200), emps.outsider).done, 1)
  await repo('Employee').update({ id: emps.outsider.id }, { branchId: org.branchA.id })
  // الفترة: بتاريخ الإقفال، من ≤ إلى، وبحد أقصى سنة
  assert.equal(rowOf(expectStatus(await report(users.viewer, `?from=${day(-30)}&to=${day(-1)}`), 200), emps.worker), null)
  assert.equal(rowOf(expectStatus(await report(users.viewer, `?from=${day(0)}&to=${day(0)}`), 200), emps.worker).done, 4)
  for (const search of [`?from=${day(1)}&to=${day(0)}`, `?from=${day(-400)}&to=${day(0)}`]) assert.equal((await report(users.viewer, search)).status, 400, search)
})

test('TR-11: سجل المهمة — كل تغيير سطر في حوارها بعلامة نوعه وباسم اللي عمله، بيتقري بحكم المهمة', async () => {
  const task = await create(users.head, { title: 'جرد المخزن', assigneeEmployeeId: emps.worker.id, dueDate: day(2) })
  expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { title: 'جرد المخزن الرئيسي', priority: 'HIGH' }), 200)
  expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { dueDate: day(4) }), 200)
  expectStatus(await status(users.worker, task.id, { status: 'IN_PROGRESS' }), 201)
  expectStatus(await status(users.worker, task.id, { status: 'WAITING', note: 'مستني مفتاح المخزن' }), 201)
  expectStatus(await request(users.worker, 'POST', `/tasks/${task.id}/extension`, { dueDate: day(6), reason: 'المفتاح مع المدير' }), 201)
  expectStatus(await request(users.head, 'POST', `/tasks/${task.id}/extension/decision`, { approve: false, note: 'المفتاح جاهز' }), 201)
  expectStatus(await request(users.head, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.peer.id }), 200)
  expectStatus(await status(users.head, task.id, { status: 'CANCELLED', note: 'الجرد اتأجل' }), 201)
  const expected = [['ASSIGNED', 'كلّف بالمهمة'], ['EDITED', 'عدّل العنوان والأولوية'], ['DUE_CHANGED', `غيّر الموعد من ${day(2)} لـ${day(4)}`], ['STARTED', 'بدأ المهمة'],
    ['WAITING', 'علّق المهمة «مستنية»: مستني مفتاح المخزن'], ['EXTENSION_REQUESTED', `طلب تمديد الميعاد من ${day(4)} لـ${day(6)}: المفتاح مع المدير`],
    ['EXTENSION_REJECTED', `رفض تمديد الميعاد لـ${day(6)}: المفتاح جاهز`], ['REASSIGNED', 'حوّل المهمة لمسؤول جديد'], ['CANCELLED', 'لغى المهمة: الجرد اتأجل']]
  assert.deepEqual(await logOf(users.head, task.id), expected)
  // كل سطر باسم اللي عمله وبمسمّى نوعه (ومن غير أرقام)؛ ونص السطور من غير اسم المسؤول القديم ولا الجديد
  const sheet = expectStatus(await request(users.peer, 'GET', `/tasks/${task.id}/log`), 200)
  assert.deepEqual([sheet.available, sheet.truncated, Object.keys(sheet.lines[0]).sort()], [true, false, ['at', 'body', 'by', 'event', 'label', 'mine']])
  assert.deepEqual(sheet.lines.map(line => [line.label, line.by, line.mine]), [['تكليف', 'موظف القواعد 1', false], ['تعديل', 'موظف القواعد 1', false], ['تغيير الموعد', 'موظف القواعد 1', false],
    ['بدأت', emps.worker.fullName, false], ['مستنية', emps.worker.fullName, false], ['طلب تمديد', emps.worker.fullName, false], ['رفض التمديد', 'موظف القواعد 1', false], ['تحويل', 'موظف القواعد 1', false],
    ['إلغاء', 'موظف القواعد 1', false]])
  assert.equal(sheet.lines.some(line => line.body.includes(emps.worker.fullName) || line.body.includes(emps.peer.fullName)), false)
  assert.equal(expectStatus(await request(users.head, 'GET', `/tasks/${task.id}/log`), 200).lines.filter(line => line.mine).length, 6, 'سطوره هو متعلّمة له')
  // السجل برّه حوار التعليقات: الحوار فيه التغييرين اللي ليهم مستلم بس (طلب التمديد للي كلّف، ورفضه للمسؤول) كتعليقين عاديين؛
  // وتعليق جديد بيدخل الحوار ومابيدخلش السجل
  const talk = async () => expectStatus(await request(users.peer, 'GET', `/tasks/${task.id}/comments`), 200)
  const NOTICES = [`طلب تمديد الميعاد من ${day(4)} لـ${day(6)}: المفتاح مع المدير`, `رفض تمديد الميعاد لـ${day(6)}: المفتاح جاهز`]
  assert.deepEqual((({ comments, truncated }) => [comments.map(row => [row.body, row.author.name, row.mentions.targets.map(target => target.key)]), truncated])(await talk()),
    [[[NOTICES[0], emps.worker.fullName, ['CREATOR']], [NOTICES[1], 'موظف القواعد 1', ['ASSIGNEE']]], false])
  const note = expectStatus(await request(users.peer, 'POST', `/tasks/${task.id}/comments`, { body: 'استلمت' }), 201)
  assert.deepEqual([(await talk()).comments.map(row => row.body), (await logOf(users.peer, task.id)).length], [[...NOTICES, 'استلمت'], expected.length])
  // وصفوف جدول التعليقات للمهمة = تعليقات حوارها بالظبط (سطور السجل في جدولها)
  assert.deepEqual([Number((await query(`SELECT COUNT(*) AS [n] FROM [comments] WHERE [entityType] = N'task' AND [entityId] = @0`, [task.id]))[0].n),
    Number((await query(`SELECT COUNT(*) AS [n] FROM [task_log] WHERE [taskId] = @0`, [task.id]))[0].n)], [3, expected.length])
  // والرد على تعليق من الحوار شغال
  expectStatus(await request(users.head, 'POST', `/tasks/${task.id}/comments`, { body: 'تمام', replyTo: [note.ref] }), 201)
  // بحكم المهمة: اللي مايشوفهاش مايقراش سجلها (المسؤول القديم خرج منها، ومديره المباشر معاه)؛ والمدير المباشر للمسؤول الجديد بيقراه
  for (const user of [users.worker, users.outsider, users.lead]) assert.deepEqual(answer(await request(user, 'GET', `/tasks/${task.id}/log`)), [404, 'المهمة غير موجودة'], user.email)
  assert.equal((await request(users.subHead, 'GET', `/tasks/${task.id}/log`)).status, 200)
  assert.deepEqual(answer(await request(users.head, 'GET', '/tasks/987654/log')), [404, 'المهمة غير موجودة'])
  // سطر السجل بيتكتب في نفس معاملة التغيير: تعديل مرفوض مابيسيبش سطر
  const before = (await logOf(users.head, task.id)).length
  assert.equal((await request(users.head, 'PATCH', `/tasks/${task.id}`, { dueDate: day(9) })).status, 400, 'المهمة ملغية')
  assert.equal((await logOf(users.head, task.id)).length, before)
})
