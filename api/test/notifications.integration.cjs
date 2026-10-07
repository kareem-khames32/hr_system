'use strict'
// B2.4: محرك الإشعارات على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_notifications_test_<16 hex>). البريد مستبدل على نسخة MailService
// نفسها: مفيش اتصال SMTP حقيقي في أي اختبار.
//  NT-01) البريد مقفول افتراضيًا: ولا رسالة ولا صف، والطلب ماشي عادي.
//  NT-02) «طلب مستني اعتمادك»: المستلمين هم بالظبط اللي الطلب في صندوقهم (هيكلي، ووظيفي بنطاق الفرع)، من غير مدير النظام ولا صاحب الطلب،
//         بلينك مباشر، وعنوان بريد العمل لو بريد الحساب مش عنوان.
//  NT-03) حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة أو والأولى لسه عند خادم البريد = إشعار واحد وبريد واحد.
//  NT-04) «قرار طلبك» (اعتماد، رفض، إرجاع) لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة داخل النظام بعنصرها المحسوب بس. و«أُعيد طلبك»
//         مابتتكتبش لو صاحبه قدّمه تاني قبل ما الحدث يتوزع.
//  NT-05) التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس.
//  NT-06) الطلب السري: لا نوع ولا اسم ولا قرار في البريد، ومستلمه مخفي في سجل الإرسال.
//  NT-07) فشل البريد: إعادة محاولة بمهلة، وبعد الحد «فشل» بسببه ومهمته الميتة بتتعاد من شاشة الطابور، والعنوان المرفوض «فشل» من غير إعادة
//         وسببه من غير العنوان الكامل، وخادم بريد واقف مايسدّش الطابور، والطلب نفسه مش متأثر. والبريد اللي اتقفل قبل الإرسال بيتخطّى.
//  NT-08) التفضيلات: مقفول = مفيش بريد، ملخص يومي = رسالة واحدة في ساعتها (من غير اللي مابقاش مستني ولا اللي صاحبه قفل فئته). والتحقق من
//         الاختيارات. وفشل الملخص: إعادة لحد 3، وعنوان مرفوض «فشل» من أول مرة، وخادم واقف بيأجّل باقي الملخصات من غير ما تتحسب عليها محاولة.
//  NT-09) ساعات الهدوء بتأجّل البريد لآخرها (حتى لو مهمته اتسحبت جوّاها)، واللي اتأجل ومابقاش صحيح مابيتبعتش: طلب اتحسم، وطلب مرتجع اتقدّم تاني،
//         وإشعار أحدث لنفس الحدث، ومستخدم قفل بريد الفئة قبل ما الرسالة تطلع.
//  NT-10) «قسيمتك ظهرت»: إشعار مخزّن في القايمة بنفس شكل العنصر الحالي (مقروء وحذف بنفس المسارين) وبريد من غير أي مبلغ، لموظفي المسير بس،
//         وبيختفي لو المسير اتفتح تاني، ومرة واحدة لو اتعتمد تاني.
//  NT-11) القوالب وسجل الإرسال لحساب الشركة بس: تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، والعنوان متخفي.
//  NT-12) حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة.
//  NT-13) دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل».
//  NT-14) (Codex P2E) حق المستلم بيتفحص وقت الإرسال: حساب اتربط بموظف تاني مابيوصلوش قرار طلب الموظف القديم، وموديول اتقفل للمستلم
//         بعد التوزيع مابيوصلوش بريده، وإرجاع الطلب السري بيبطل بإعادة التقديم زي العادي — في الفوري والملخص.
// Run (من api/): node --test test/notifications.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')

const database = `hr_notifications_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-notifications-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const FRONTEND = 'https://hr.example.invalid'
const policyStart = '2026-05-23', attendanceEnd = '2026-08-22', period = '2026-08'
let app, master, ds, base, queue, notifications, requestsService, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, types = {}
// صندوق البريد التجريبي: كل محاولة إرسال، واللي نجح منها
// hold: وعد بيوقّف الإرسال لحد ما يتحل (رسالة «في الطريق»)
const mailbox = { attempts: [], sent: [], failure: null, configured: true, hold: null }

function assertDisposable() {
  assert.match(database, /^hr_notifications_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function setting(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
}
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `NT${String(number).padStart(3, '0')}`, fullName: `موظف الإشعارات ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
async function attend(emp) {
  const rows = []
  for (let time = Date.parse(`${policyStart}T12:00:00Z`); time <= Date.parse(`${attendanceEnd}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10), status: 'present', checkIn: '08:00', checkOut: '16:00',
      shiftName: 'وردية الإشعارات', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows, { chunk: 100 })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@notify.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
// كل الدورات اللازمة: التوزيع بيعمل مهمة التوزيع، وهي بتعمل مهام البريد اللي بتتسحب في الدورة اللي بعدها
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
const submit = async (user, type, reason = 'طلب للاختبار') => expectStatus(await request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason }, submit: true }), 201)
const act = async (user, id, action, comment) => expectStatus(await request(user, 'POST', `/requests/${id}/act`, { action, comment }), 201)
const notificationsOf = (entityType, entityId) => query(`SELECT n.[id], n.[recipientUserId], n.[eventCode], n.[category], n.[inApp], n.[title], n.[body], n.[link], n.[dedupeKey]
  FROM [notifications] n WHERE n.[entityType] = @0 AND n.[entityId] = @1 ORDER BY n.[id]`, [entityType, String(entityId)])
const deliveriesOf = (entityType, entityId, channel = 'EMAIL') => query(`SELECT d.[id], d.[status], d.[attempts], d.[address], d.[subject], d.[body], d.[detail], d.[sentAt],
    n.[recipientUserId], n.[eventCode]
  FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
  WHERE n.[entityType] = @0 AND n.[entityId] = @1 AND d.[channel] = @2 ORDER BY d.[id]`, [entityType, String(entityId), channel])
const emailJobs = () => query(`SELECT [id], [status], [attempts], [maxAttempts], [lastError], DATEDIFF(second, SYSUTCDATETIME(), [runAfter]) AS [delay], JSON_VALUE([payload], '$.deliveryId') AS [deliveryId]
  FROM [jobs_queue] WHERE [jobType] = N'notifications.email' ORDER BY [id]`)
const clearMailbox = () => { mailbox.attempts.length = 0; mailbox.sent.length = 0 }
const to = list => list.map(message => message.to).sort()
// الحسابات اللي الطلب في صندوق اعتمادها فعلًا (من المسار نفسه)
async function inboxHolders(requestId, candidates) {
  const holders = []
  for (const user of candidates) {
    const inbox = expectStatus(await request(user, 'GET', '/requests/inbox'), 200)
    if (inbox.some(row => row.id === requestId)) holders.push(user)
  }
  return holders
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: `${FRONTEND}/` })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // البريد التجريبي قبل أي حاجة: مفيش رسالة حقيقية بتطلع من الاختبار
  const { MailService, MailSendError } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => mailbox.configured
  mail.send = async message => {
    mailbox.attempts.push(message)
    if (mailbox.hold) await mailbox.hold
    if (mailbox.failure) throw new MailSendError(mailbox.failure, true)
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
  notifications = app.get(require('../src/notifications/notifications.service').NotificationsService)
  requestsService = app.get(require('../src/requests/requests.service').RequestsService)
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)
  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['payroll.monthly_days', '30'], ['payroll.daily_hours', '8'],
    ['payroll.salary_evidence_mode', 'MONTHLY_HISTORY_OR_CURRENT_FILE'], ['attendance.weekend_days', 'FRI,SAT'], ['company.name', 'شركة الاختبار']]) await setting(key, value)

  org.branchA = await repo('Branch').save({ code: 'NT_A', name: 'فرع الإشعارات أ' })
  org.branchB = await repo('Branch').save({ code: 'NT_B', name: 'فرع الإشعارات ب' })
  emps.manager = await employee()
  emps.requester = await employee({ managerEmployeeId: emps.manager.id })
  emps.hrA = await employee({ managerEmployeeId: emps.manager.id })
  emps.hrGrant = await employee({ email: 'hr.grant.work@notify.invalid' })
  emps.noMail = await employee()
  users.admin = await account('admin', 'super_admin', [], { branchId: null })
  users.admin2 = await account('admin2', 'super_admin', [], { branchId: null })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.requester = await account('requester', 'employee', [], { employeeId: emps.requester.id })
  users.hrA = await account('hr-a', 'hr_manager', [], { employeeId: emps.hrA.id })
  // حساب دخوله مش عنوان بريد (حساب مجال): بريد العمل في ملف الموظف هو اللي بيتبعت عليه
  users.hrGrant = await account('hr-grant', 'employee', ['approve.hr'], { employeeId: emps.hrGrant.id, email: 'hr.grant' })
  // حامل الخطوة من غير أي عنوان صالح
  users.hrNoMail = await account('hr-nomail', 'employee', ['approve.hr'], { employeeId: emps.noMail.id, email: 'hr.nomail' })
  users.hrB = await account('hr-b', 'hr_manager', [], { branchId: org.branchB.id })
  users.hrInactive = await account('hr-inactive', 'hr_manager', [], { isActive: false })
  users.branchSettings = await account('branch-settings', 'hr_manager', ['settings.manage'], { branchId: org.branchB.id })

  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_NT', nameAr: 'سلسلة الإشعارات', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'hr' },
    { chainId: chain.id, stepOrder: 2, approverRole: 'hr' }])
  types.general = await repo('RequestType').save({ code: 'NT_GENERAL', nameAr: 'طلب إشعارات عام', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  const secretChain = await repo('ApprovalChain').save({ code: 'CHAIN_NT_SECRET', nameAr: 'سلسلة السري', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: secretChain.id, stepOrder: 1, approverRole: 'hr' })
  types.secret = await repo('RequestType').save({ code: 'NT_SECRET', nameAr: 'بلاغ داخلي حساس', category: 'personal_data', destinationHandler: 'none', approvalChainId: secretChain.id,
    isActive: true, isConfidential: true })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-notifications-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'notifications fixture cleanup failed')
})

test('NT-01: البريد مقفول افتراضيًا — ولا رسالة ولا صف، والطلب ماشي عادي', async () => {
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'notifications.email.enabled' })).value, 'false')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'notifications.quiet_hours' })).value, '')
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'notifications.digest_hour' })).value, '8')
  const req = await submit(users.requester, types.general)
  // الحدث اتسجل في نفس معاملة التقديم بمراجع بس
  const [event] = await query(`SELECT [payload] FROM [outbox_events] WHERE [eventType] = N'REQUEST_STEP_PENDING' AND [entityId] = @0`, [String(req.id)])
  assert.deepEqual(JSON.parse(event.payload), { requestId: req.id, typeCode: 'NT_GENERAL', requesterId: emps.requester.id, branchId: org.branchA.id, stepOrder: 1, escalated: false })
  await drain()
  assert.deepEqual([mailbox.attempts.length, (await notificationsOf('request', req.id)).length], [0, 0])
  await act(users.manager, req.id, 'APPROVE')
  await act(users.hrA, req.id, 'APPROVE')
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [notifications]'))[0].n), 0)
  // نوع من غير وجهة تنفيذ: الاعتماد النهائي بيكمّله
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'COMPLETED')
  // المهام خلصت من غير فشل
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [jobs_queue] WHERE [status] <> N'DONE'`))[0].n), 0)
})

test('NT-02: «طلب مستني اعتمادك» للي الطلب في صندوقهم بالظبط، بلينك مباشر', async () => {
  await setting('notifications.email.enabled', 'true')
  clearMailbox()
  const everyone = [users.manager, users.requester, users.hrA, users.hrGrant, users.hrNoMail, users.hrB, users.branchSettings]
  const req = await submit(users.requester, types.general)
  await drain()
  // الخطوة 1 هيكلية: المدير المباشر المسمّى بس
  assert.deepEqual((await inboxHolders(req.id, everyone)).map(user => user.id), [users.manager.id])
  assert.deepEqual(to(mailbox.sent), ['manager@notify.invalid'])
  const [mail] = mailbox.sent
  assert.equal(mail.subject, 'طلب بانتظار اعتمادك: طلب إشعارات عام')
  assert.ok(mail.text.includes(`${FRONTEND}/approvals-inbox?request=${req.id}`), mail.text)
  assert.ok(mail.text.includes(emps.requester.fullName) && mail.text.includes('حساب manager') && mail.text.includes('شركة الاختبار'))
  assert.equal(mail.text.includes('طلب للاختبار'), false, 'محتوى الطلب مابيتبعتش')
  // مدير النظام شايف الطلب في صندوقه (يقدر يتصرف في أي خطوة) بس مش مستلم
  assert.ok((await inboxHolders(req.id, [users.admin])).length === 1)
  let rows = await notificationsOf('request', req.id)
  assert.deepEqual(rows.map(row => [row.recipientUserId, row.eventCode, row.category, row.inApp, row.link]),
    [[users.manager.id, 'request.pending_approval', 'approval', false, `/approvals-inbox?request=${req.id}`]])
  let [delivery] = await deliveriesOf('request', req.id)
  assert.deepEqual([delivery.status, delivery.attempts, delivery.address, delivery.detail], ['SENT', 1, 'ma*****@notify.invalid', null])
  assert.ok(delivery.sentAt)
  // مفيش صف «داخل النظام» للحدث ده: العدّاد المحسوب هو اللي بيظهر
  assert.deepEqual(await deliveriesOf('request', req.id, 'IN_APP'), [])

  // الخطوة 2 وظيفية (hr): كل حامل للصلاحية فرع الطلب في نطاقه — مش فرع تاني، ولا حساب مقفول، ولا مدير النظام
  clearMailbox()
  await act(users.manager, req.id, 'APPROVE')
  await drain()
  const holders = await inboxHolders(req.id, everyone)
  assert.deepEqual(holders.map(user => user.id).sort(), [users.hrA.id, users.hrGrant.id, users.hrNoMail.id].sort())
  rows = (await notificationsOf('request', req.id)).filter(row => row.eventCode === 'request.pending_approval' && row.recipientUserId !== users.manager.id)
  assert.deepEqual(rows.map(row => row.recipientUserId).sort(), holders.map(user => user.id).sort(), 'المستلمين = أصحاب الصندوق')
  // بريد الحساب، وإلا بريد العمل من ملف الموظف؛ واللي مالوش عنوان بيتسجل «اتخطّى» بسببه
  assert.deepEqual(to(mailbox.sent), ['hr-a@notify.invalid', 'hr.grant.work@notify.invalid'])
  const skipped = (await deliveriesOf('request', req.id)).find(row => row.recipientUserId === users.hrNoMail.id)
  assert.deepEqual([skipped.status, skipped.detail, skipped.address], ['SKIPPED', 'مفيش بريد صالح على الحساب ولا في ملف الموظف', null])

  // صاحب الطلب اللي بيحمل دور الخطوة مش مستلم لطلبه
  clearMailbox()
  const own = await submit(users.hrA, types.general)
  await drain()
  await act(users.manager, own.id, 'APPROVE')
  await drain()
  const ownHolders = await inboxHolders(own.id, everyone)
  assert.equal(ownHolders.some(user => user.id === users.hrA.id), false)
  const ownRows = (await notificationsOf('request', own.id)).filter(row => row.eventCode === 'request.pending_approval' && row.recipientUserId !== users.manager.id)
  assert.deepEqual(ownRows.map(row => row.recipientUserId).sort(), ownHolders.map(user => user.id).sort())
  assert.equal(mailbox.sent.some(message => message.to === 'hr-a@notify.invalid' && message.subject.startsWith('طلب بانتظار اعتمادك')), false)
  types.pendingAtHr = req
})

test('NT-03: حدث اتوزع مرتين، ومهمة بريد اتعادت، ومهمتين لنفس الرسالة في نفس اللحظة = إشعار واحد وبريد واحد', async () => {
  clearMailbox()
  const req = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.sent.length, 1)
  const before = await notificationsOf('request', req.id)
  assert.equal(before.length, 1)
  // نفس الحدث بيتوزع تاني (المهمة اتعادت بعد ما اتنفذت): مفيش إشعار ولا بريد جديد
  const [job] = await query(`SELECT [payload] FROM [jobs_queue] WHERE [jobType] = N'notifications.dispatch' AND JSON_VALUE([payload], '$.event.entityId') = @0 ORDER BY [id] DESC`, [String(req.id)])
  const event = JSON.parse(job.payload).event
  assert.equal(await notifications.dispatch(event), 0)
  assert.equal(await notifications.dispatch(event), 0)
  await drain()
  assert.deepEqual(await notificationsOf('request', req.id), before)
  assert.equal(mailbox.sent.length, 1)
  assert.match(before[0].dedupeKey, new RegExp(`^outbox:${event.id}:request\\.pending_approval:${users.manager.id}$`))
  // مهمة البريد نفسها اتعادت بعد ما الرسالة اتبعتت: مابتتبعتش تاني
  const [delivery] = await deliveriesOf('request', req.id)
  await query(`UPDATE [jobs_queue] SET [status] = N'PENDING', [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND JSON_VALUE([payload], '$.deliveryId') = @0`, [String(delivery.id)])
  await drain()
  assert.equal(mailbox.attempts.length, 1)
  // مهمتين لنفس الرسالة اشتغلوا في نفس اللحظة (مهمة اتعادت بعد عطل ونسختين من الخادم) والإرسال واخد وقته: واحدة بس اللي بتبعت
  clearMailbox()
  const twice = await submit(users.requester, types.general)
  await queue.runOnce({ limit: 200 })
  const [pending] = await deliveriesOf('request', twice.id)
  assert.deepEqual([pending.status, pending.attempts], ['PENDING', 0])
  let release
  mailbox.hold = new Promise(resolve => { release = resolve })
  const finished = []
  const runs = [1, 2].map(run => notifications.sendEmail(String(pending.id), { attempt: 1, maxAttempts: 10 }).then(() => finished.push(run)))
  const until = async (done, limit = 5000) => { for (let waited = 0; waited < limit && !done(); waited += 20) await new Promise(resolve => setTimeout(resolve, 20)) }
  try {
    // اللي مامسكتش قفل التوصيل بتخلص من غير إرسال، والتانية واقفة عند خادم البريد
    await until(() => finished.length === 1 && mailbox.attempts.length >= 1)
    assert.deepEqual([finished.length, mailbox.attempts.length], [1, 1])
    // ومهمة تالتة بتبدأ والأولى لسه واقفة عند خادم البريد (Codex CRP2E-N01): القفل ممسوك طول المحاولة، فبترجع من غير إرسال
    runs.push(notifications.sendEmail(String(pending.id), { attempt: 1, maxAttempts: 10 }).then(() => finished.push(3)))
    await until(() => finished.length === 2, 3000)
    assert.deepEqual([finished.length, mailbox.attempts.length], [2, 1], 'التالتة رجعت من غير إرسال والأولى لسه شغالة')
    assert.deepEqual([(await deliveriesOf('request', twice.id))[0].status, (await deliveriesOf('request', twice.id))[0].attempts], ['PENDING', 0])
  } finally {
    // لو القفل وقع، النداءات واقفة عند بديل البريد: بتتساب عشان الاختبار يقع من غير ما يعلّق
    release()
    mailbox.hold = null
    await Promise.all(runs.map(run => run.catch(() => undefined)))
  }
  assert.equal(mailbox.attempts.length, 1, 'رسالة واحدة من المهمتين')
  const [once] = await deliveriesOf('request', twice.id)
  assert.deepEqual([once.status, once.attempts], ['SENT', 1])
  // ومهمة الطابور الأصلية لما تشتغل بعدها مابتبعتش تاني
  await drain()
  assert.equal(mailbox.attempts.length, 1)
  await act(users.manager, twice.id, 'REJECT', 'تنضيف')
  await drain()
  // الطلب اتحرك قبل ما مهمة التوزيع تشتغل: الحدث القديم مابيبعتش لحد
  clearMailbox()
  const moved = await submit(users.requester, types.general)
  await act(users.manager, moved.id, 'REJECT', 'رفض قبل التوزيع')
  await drain()
  assert.equal(mailbox.sent.some(message => message.subject.startsWith('طلب بانتظار اعتمادك')), false)
})

test('NT-04: «قرار طلبك» لصاحب الطلب بالبريد من غير تعليق المعتمد، والقايمة بعنصرها المحسوب بس', async () => {
  clearMailbox()
  const approved = types.pendingAtHr
  await act(users.hrA, approved.id, 'APPROVE', 'تعليق داخلي للمعتمد')
  const rejected = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, rejected.id, 'REJECT', 'سبب الرفض التفصيلي')
  const returned = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, returned.id, 'RETURN', 'كمّل البيانات الناقصة')
  await drain()
  const mine = mailbox.sent.filter(message => message.to === 'requester@notify.invalid')
  assert.deepEqual(mine.map(message => message.subject).sort(), ['أُعيد طلبك لاستكمال المعلومات: طلب إشعارات عام', 'تم رفض طلبك: طلب إشعارات عام', 'تمت الموافقة على طلبك: طلب إشعارات عام'].sort())
  for (const message of mine) {
    assert.ok(message.text.includes(`${FRONTEND}/requests`))
    assert.equal(/تعليق داخلي|سبب الرفض|كمّل البيانات/.test(message.text), false, 'تعليق المعتمد مابيتبعتش')
  }
  const [decided] = (await notificationsOf('request', approved.id)).filter(row => row.eventCode === 'request.decided')
  assert.deepEqual([decided.recipientUserId, decided.category, decided.inApp], [users.requester.id, 'request', false])
  const [returnEvent] = await query(`SELECT [payload] FROM [outbox_events] WHERE [eventType] = N'REQUEST_RETURNED' AND [entityId] = @0`, [String(returned.id)])
  assert.deepEqual(JSON.parse(returnEvent.payload), { requestId: returned.id, typeCode: 'NT_GENERAL', requesterId: emps.requester.id, branchId: org.branchA.id })
  // «أُعيد طلبك» بكوده، فبيتفحص وقت الإرسال إن الطلب لسه مرتجع
  assert.deepEqual((await notificationsOf('request', returned.id)).filter(row => row.recipientUserId === users.requester.id).map(row => row.eventCode), ['request.returned'])
  // اترجع وصاحبه كمّله وقدّمه تاني قبل ما الحدث يتوزع: «أُعيد طلبك» فات وقتها فمابتتكتبش أصلًا
  const quick = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, quick.id, 'RETURN', 'ناقص')
  expectStatus(await request(users.requester, 'POST', `/requests/${quick.id}/resubmit`, { payload: { reason: 'بعد الاستكمال' } }), 201)
  clearMailbox()
  await drain()
  assert.equal((await notificationsOf('request', quick.id)).some(row => row.eventCode === 'request.returned'), false)
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['manager@notify.invalid', 'طلب بانتظار اعتمادك: طلب إشعارات عام']])
  await act(users.manager, quick.id, 'REJECT', 'تنضيف')
  await drain()
  // داخل النظام: عنصر «قرار طلبك» المحسوب زي ما هو، ومن غير عنصر مخزّن تاني لنفس القرار
  const list = expectStatus(await request(users.requester, 'GET', '/notifications'), 200)
  assert.ok(list.some(item => item.id.startsWith('act-') && item.title === 'تمت الموافقة على طلبك'))
  assert.equal(list.some(item => item.id.startsWith('n-')), false)
})

test('NT-05: التصعيد بيوصل للي الخطوة بقت عليهم — وفي مجموعة متوازية لحاملي الدور اللي اتصعّد له بس', async () => {
  clearMailbox()
  const req = await submit(users.requester, types.general)
  await drain()
  clearMailbox()
  // مهلة الخطوة عدّت
  const stored = await repo('Request').findOneByOrFail({ id: req.id })
  const steps = JSON.parse(stored.resolvedSteps)
  assert.equal(steps[0].escalateTo, 'hr')
  steps[0].dueAt = new Date(Date.now() - 3600_000).toISOString()
  await repo('Request').update({ id: req.id }, { resolvedSteps: JSON.stringify(steps) })
  assert.deepEqual(await requestsService.runEscalations(), { escalated: 1 })
  await drain()
  assert.deepEqual(to(mailbox.sent), ['hr-a@notify.invalid', 'hr.grant.work@notify.invalid'])
  assert.ok(mailbox.sent.every(message => message.subject === 'طلب تم تصعيده لك: طلب إشعارات عام' && message.text.includes(`/approvals-inbox?request=${req.id}`)))
  const escalated = (await notificationsOf('request', req.id)).filter(row => row.eventCode === 'request.escalated')
  assert.deepEqual(escalated.map(row => row.recipientUserId).sort(), [users.hrA.id, users.hrGrant.id, users.hrNoMail.id].sort())
  const [escalation] = await query(`SELECT TOP (1) [payload] FROM [outbox_events] WHERE [eventType] = N'REQUEST_STEP_PENDING' AND [entityId] = @0 ORDER BY [id] DESC`, [String(req.id)])
  assert.deepEqual(JSON.parse(escalation.payload), { requestId: req.id, typeCode: 'NT_GENERAL', requesterId: emps.requester.id, branchId: org.branchA.id, stepOrder: 1, escalated: true, role: 'hr' })

  // مجموعة متوازية (المدير ‖ المالية): تصعيد خطوة المدير للموارد البشرية بيوصل لحاملي الموارد البشرية بس، مش للمالية اللي اتبلّغت لما الطلب وصلها
  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_NT_PARALLEL', nameAr: 'سلسلة متوازية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save([{ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'hr' },
    { chainId: chain.id, stepOrder: 1, approverRole: 'finance', isParallel: true }])
  const parallel = await repo('RequestType').save({ code: 'NT_PARALLEL', nameAr: 'طلب متوازي', category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
  users.finance = await account('finance', 'employee', ['approve.finance'])
  clearMailbox()
  const grouped = await submit(users.requester, parallel)
  await drain()
  assert.deepEqual(to(mailbox.sent), ['finance@notify.invalid', 'manager@notify.invalid'])
  clearMailbox()
  const groupSteps = JSON.parse((await repo('Request').findOneByOrFail({ id: grouped.id })).resolvedSteps)
  groupSteps.find(step => step.role === 'direct_manager_of_requester').dueAt = new Date(Date.now() - 3600_000).toISOString()
  await repo('Request').update({ id: grouped.id }, { resolvedSteps: JSON.stringify(groupSteps) })
  assert.deepEqual(await requestsService.runEscalations(), { escalated: 1 })
  await drain()
  assert.deepEqual(to(mailbox.sent), ['hr-a@notify.invalid', 'hr.grant.work@notify.invalid'], 'المالية مابيوصلهاش «تم تصعيده لك»')
  assert.ok(mailbox.sent.every(message => message.subject === 'طلب تم تصعيده لك: طلب متوازي'))
  await act(users.admin, grouped.id, 'REJECT', 'تنضيف')
  await drain()
})

test('NT-06: الطلب السري — لا نوع ولا اسم ولا قرار في البريد', async () => {
  clearMailbox()
  const req = await submit(users.requester, types.secret, 'تفاصيل البلاغ الحساسة')
  await drain()
  assert.deepEqual(to(mailbox.sent), ['hr-a@notify.invalid', 'hr.grant.work@notify.invalid'])
  await act(users.hrA, req.id, 'REJECT', 'قرار البلاغ')
  await drain()
  assert.equal(mailbox.sent.length, 3)
  for (const message of mailbox.sent) {
    assert.equal(message.subject, 'تحديث على طلب سري')
    assert.equal(/بلاغ داخلي|حساس|موظف الإشعارات|رفض|قرار البلاغ|تفاصيل البلاغ/.test(`${message.subject}\n${message.text}`), false, message.text)
  }
  const rows = await notificationsOf('request', req.id)
  assert.ok(rows.length === 4 && rows.every(row => row.eventCode === 'request.confidential' && row.title === 'تحديث على طلب سري' && row.inApp === false))
  // سجل الإرسال (مدير الإعدادات مش طرف في الطلب): الحالة والسبب من غير مين المستلم — «فلان عنده طلب سري» معلومة عن الطلب نفسه
  const log = expectStatus(await request(users.admin, 'GET', '/notifications/deliveries'), 200)
  const hidden = log.rows.filter(row => row.event === 'تحديث على طلب سري')
  assert.equal(hidden.length, 4)
  for (const row of hidden) assert.deepEqual([row.recipientUserId, row.recipientName, row.address, 'title' in row], [null, null, null, false])
  assert.ok(hidden.some(row => row.status === 'SENT') && hidden.some(row => row.status === 'SKIPPED' && row.detail))
  // والباقي بمستلمه
  assert.ok(log.rows.some(row => row.event === 'طلب بانتظار اعتمادك' && row.recipientUserId === users.manager.id && row.recipientName === 'حساب manager'))
})

test('NT-07: فشل البريد — إعادة بمهلة، وبعد الحد «فشل» ومهمته بتتعاد من الطابور، والعنوان المرفوض من غير إعادة، وخادم واقف مايسدّش الطابور', async () => {
  const statusOf = async id => (await repo('Request').findOneByOrFail({ id })).status
  clearMailbox()
  mailbox.failure = 'connect ECONNREFUSED 127.0.0.1:25'
  const req = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.attempts.length, 1)
  let [delivery] = await deliveriesOf('request', req.id)
  assert.deepEqual([delivery.status, delivery.attempts, delivery.detail, delivery.sentAt], ['PENDING', 1, 'connect ECONNREFUSED 127.0.0.1:25', null])
  let job = (await emailJobs()).find(row => row.deliveryId === String(delivery.id))
  assert.deepEqual([job.status, job.attempts, job.maxAttempts], ['PENDING', 1, 10])
  assert.ok(job.delay >= 20 && job.delay <= 31, `مهلة الإعادة ${job.delay} ثانية`)
  // خطأ المهمة في شاشة الطابور بنص الإشعارات (مش نص رمز الدخول)
  assert.equal(job.lastError, 'تعذر إرسال بريد الإشعار: connect ECONNREFUSED 127.0.0.1:25')

  // خادم البريد مش بيرد = الإرسال واقف دقيقة: رسالة تانية بتفشل فورًا من غير محاولة اتصال (ومن غير ما تستنى مهلته)، وباقي مهام الطابور ماشية
  const blocked = await submit(users.requester, types.general)
  const cycle = await queue.runOnce({ limit: 200 })
  await drain()
  assert.ok(cycle.done >= 1, 'مهمة التوزيع خلصت والبريد واقف')
  assert.equal(mailbox.attempts.length, 1, 'ولا محاولة اتصال تانية والخادم واقف')
  const [fast] = await deliveriesOf('request', blocked.id)
  assert.deepEqual([fast.status, fast.attempts, fast.detail], ['PENDING', 1, 'خادم البريد مش بيرد — الإرسال واقف دقيقة وهيتجرّب تاني'])
  await act(users.manager, blocked.id, 'REJECT', 'اتحسم والبريد واقع')
  await drain()

  // الطلب نفسه مش متأثر بفشل البريد: لسه مستني اعتماده
  assert.equal(await statusOf(req.id), 'UNDER_REVIEW')
  for (let attempt = 2; attempt <= 10; attempt++) {
    notifications.resumeMail()
    await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [id] = @0`, [job.id])
    await queue.runOnce({ limit: 200 })
  }
  [delivery] = await deliveriesOf('request', req.id)
  job = (await emailJobs()).find(row => row.deliveryId === String(delivery.id))
  assert.deepEqual([delivery.status, delivery.attempts, delivery.detail, job.status, job.attempts], ['FAILED', 10, 'connect ECONNREFUSED 127.0.0.1:25', 'DEAD', 10])
  assert.equal(mailbox.attempts.length, 10)
  // البريد رجع: مدير النظام بيعيد المهمة الميتة من شاشة الطابور، والرسالة بتتبعت (والنص مابيفضلش متخزن بعد الإرسال)
  mailbox.failure = null
  notifications.resumeMail()
  clearMailbox()
  expectStatus(await request(users.admin, 'POST', `/queue/jobs/${job.id}/retry`), 201)
  await queue.runOnce({ limit: 200 })
  assert.deepEqual(mailbox.sent.filter(message => message.text.includes(`request=${req.id}`)).map(message => [message.to, message.subject]),
    [['manager@notify.invalid', 'طلب بانتظار اعتمادك: طلب إشعارات عام']])
  ;[delivery] = await deliveriesOf('request', req.id)
  assert.deepEqual([delivery.status, delivery.attempts, delivery.detail, delivery.subject, delivery.body], ['SENT', 11, null, null, null])

  // والقرار بيتاخد عادي والبريد واقع؛ بريد القرار بيفشل وبيتبعت لما البريد يرجع
  mailbox.failure = 'connect ECONNREFUSED 127.0.0.1:25'
  await act(users.manager, req.id, 'REJECT', 'الطلب ماشي والبريد واقع')
  await drain()
  assert.equal(await statusOf(req.id), 'REJECTED')
  // بريد «مستني اعتمادك» فشل مرة، والطلب اتحسم قبل إعادة المحاولة: المحاولة التانية مابتبعتش بريد فات وقته
  notifications.resumeMail()
  const moved = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, moved.id, 'REJECT', 'اتحسم قبل إعادة المحاولة')
  await drain()
  mailbox.failure = null
  notifications.resumeMail()
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  clearMailbox()
  await drain()
  // قرارات الرفض التلاتة لصاحبها، ومن غير «مستني اعتمادك» للطلبين اللي اتحسموا
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), Array.from({ length: 3 }, () => ['requester@notify.invalid', 'تم رفض طلبك: طلب إشعارات عام']))
  for (const id of [moved.id, blocked.id]) {
    const [stalled] = (await deliveriesOf('request', id)).filter(row => row.recipientUserId === users.manager.id)
    assert.deepEqual([stalled.status, stalled.attempts, stalled.detail, stalled.body], ['SKIPPED', 1, 'الطلب مابقاش مستني اعتماد الحساب ده', null])
  }

  // خادم البريد رفض العنوان نفسه: «فشل» من أول مرة من غير إعادة ومن غير ما الإرسال يقف، والسبب متخزن من غير العنوان الكامل
  mailbox.failure = 'خادم البريد رفض العنوان: manager@notify.invalid — 550 5.1.1 <manager@notify.invalid>: Recipient address rejected'
  clearMailbox()
  const bounced = await submit(users.requester, types.general)
  await drain()
  mailbox.failure = null
  const [rejected] = await deliveriesOf('request', bounced.id)
  assert.deepEqual([rejected.status, rejected.attempts, rejected.detail],
    ['FAILED', 1, 'خادم البريد رفض العنوان: ma*****@notify.invalid — 550 5.1.1 <ma*****@notify.invalid>: Recipient address rejected'])
  const rejectedJob = (await emailJobs()).find(row => row.deliveryId === String(rejected.id))
  assert.deepEqual([rejectedJob.status, rejectedJob.attempts, mailbox.attempts.length], ['DONE', 1, 1], 'مفيش إعادة لعنوان مرفوض')
  const failedLog = expectStatus(await request(users.admin, 'GET', '/notifications/deliveries?status=FAILED'), 200)
  assert.equal(JSON.stringify(failedLog).includes('manager@notify.invalid'), false, 'العنوان الكامل مابيطلعش في سبب الفشل')
  await act(users.manager, bounced.id, 'REJECT', 'تنضيف')
  await drain()

  // البريد اتقفل من الإعدادات بعد ما الرسالة اتجهّزت وقبل ما تتبعت
  clearMailbox()
  const late = await submit(users.requester, types.general)
  await queue.runOnce({ limit: 200 })
  assert.equal((await deliveriesOf('request', late.id))[0].status, 'PENDING')
  await setting('notifications.email.enabled', 'false')
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  const [closed] = await deliveriesOf('request', late.id)
  assert.deepEqual([closed.status, closed.detail], ['SKIPPED', 'البريد اتقفل من الإعدادات قبل الإرسال'])
  await setting('notifications.email.enabled', 'true')
  // خادم البريد مش مضبوط: الرسالة بتتسجل «اتخطّت» من غير محاولة، واختيارات المستخدم بتقول إن البريد مش شغال
  mailbox.configured = false
  const unconfigured = await submit(users.requester, types.general)
  await drain()
  assert.equal(expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200).emailEnabled, false)
  mailbox.configured = true
  const [missing] = await deliveriesOf('request', unconfigured.id)
  assert.deepEqual([missing.status, missing.detail, mailbox.attempts.length], ['SKIPPED', 'خادم البريد غير مضبوط (SMTP)', 0])
  // عنوان الواجهة مش مضبوط على الخادم (FRONTEND_URL): لينك الرسالة مش هيشتغل، فبتتسجل «اتخطّت» بسببها، واللوحة والاختيارات بيقولوا إن البريد مش شغال
  const config = app.get(require('../node_modules/@nestjs/config').ConfigService), readConfig = config.get
  config.get = function (key, ...rest) { return key === 'FRONTEND_URL' ? '' : readConfig.call(this, key, ...rest) }
  try {
    const unlinked = await submit(users.requester, types.general)
    await drain()
    const [noLink] = await deliveriesOf('request', unlinked.id)
    assert.deepEqual([noLink.status, noLink.detail, noLink.body, mailbox.attempts.length], ['SKIPPED', 'عنوان الواجهة مش مضبوط على الخادم (FRONTEND_URL)، ولينك الرسالة محتاجه', null, 0])
    assert.equal(expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200).emailEnabled, false)
    const panel = expectStatus(await request(users.admin, 'GET', '/notifications/deliveries'), 200)
    assert.deepEqual([panel.emailEnabled, panel.mailConfigured, panel.linkConfigured], [true, true, false])
  } finally { delete config.get }
  assert.equal(expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200).emailEnabled, true)
})

test('NT-08: التفضيلات — مقفول = مفيش بريد، وملخص يومي = رسالة واحدة في ساعتها', async () => {
  const initial = expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200)
  assert.deepEqual([initial.available, initial.emailEnabled], [true, true])
  assert.deepEqual(initial.categories, [
    { key: 'approval', label: 'طلبات بانتظار اعتمادي', inApp: null, email: 'ON' },
    { key: 'request', label: 'قرارات طلباتي', inApp: null, email: 'ON' },
    { key: 'payroll', label: 'الرواتب', inApp: 'ON', email: 'ON' },
    { key: 'task', label: 'المهام', inApp: null, email: 'ON' },
    { key: 'comment', label: 'التعليقات والإشارات', inApp: 'ON', email: 'ON' },
    // B2.15: «مستندك هينتهي» بالبريد (جوه النظام العنصر المحسوب القايم)
    { key: 'document', label: 'مستنداتي', inApp: null, email: 'ON' },
  ])
  for (const body of [{ category: 'unknown', channel: 'EMAIL', mode: 'OFF' }, { category: 'approval', channel: 'SMS', mode: 'OFF' }, { category: 'approval', channel: 'EMAIL', mode: 'LATER' },
    { category: 'payroll', channel: 'IN_APP', mode: 'DIGEST' }, { category: 'approval', channel: 'IN_APP', mode: 'OFF' }]) {
    expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', body), 400)
  }
  expectStatus(await request(null, 'GET', '/notifications/preferences'), 401)

  // مقفول
  clearMailbox()
  let saved = expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'OFF' }), 200)
  assert.equal(saved.categories.find(row => row.key === 'approval').email, 'OFF')
  // اختيار الحساب لنفسه بس
  assert.equal(expectStatus(await request(users.hrA, 'GET', '/notifications/preferences'), 200).categories.find(row => row.key === 'approval').email, 'ON')
  const off = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  const [skipped] = await deliveriesOf('request', off.id)
  assert.deepEqual([skipped.status, skipped.detail], ['SKIPPED', 'المستخدم قافل بريد الفئة دي'])

  // ملخص يومي: مفيش بريد فوري، ورسالة واحدة في الساعة المضبوطة
  saved = expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'DIGEST' }), 200)
  assert.equal(saved.categories.find(row => row.key === 'approval').email, 'DIGEST')
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [notification_preferences] WHERE [userId] = @0 AND [category] = N'approval' AND [channel] = N'EMAIL'`, [users.manager.id]))[0].n), 1)
  const first = await submit(users.requester, types.general), second = await submit(users.requester, types.general), handled = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  assert.deepEqual([(await deliveriesOf('request', first.id))[0].status, (await deliveriesOf('request', second.id))[0].status, (await deliveriesOf('request', handled.id))[0].status],
    ['DIGEST', 'DIGEST', 'DIGEST'])
  // واحد منهم اتحسم من حد تاني قبل ميعاد الملخص: مابيدخلش الملخص (صاحب الطلب نفسه بريده فوري، فبيوصله قراره)
  await act(users.admin, handled.id, 'REJECT', 'اتحسم قبل الملخص')
  await drain()
  clearMailbox()
  await setting('notifications.digest_hour', '9')
  const at = hour => { const date = new Date(); date.setHours(hour, 5, 0, 0); return date }
  assert.equal(await notifications.digestHourlyWork(at(8)), 0)
  assert.equal(mailbox.attempts.length, 0)
  assert.equal(await notifications.digestHourlyWork(at(9)), 1)
  assert.deepEqual(to(mailbox.sent), ['manager@notify.invalid'])
  const [digest] = mailbox.sent
  assert.equal(digest.subject, 'ملخص إشعاراتك (2)')
  assert.ok(digest.text.includes(`${FRONTEND}/approvals-inbox?request=${first.id}`) && digest.text.includes(`${FRONTEND}/approvals-inbox?request=${second.id}`))
  assert.equal((digest.text.match(/طلب بانتظار اعتمادك/g) ?? []).length, 2)
  assert.equal(digest.text.includes(`request=${handled.id}`), false)
  for (const id of [first.id, second.id]) {
    const [row] = await deliveriesOf('request', id)
    assert.deepEqual([row.status, row.detail, row.attempts], ['SENT', 'ضمن الملخص اليومي', 1])
  }
  const [stale] = (await deliveriesOf('request', handled.id)).filter(row => row.recipientUserId === users.manager.id)
  assert.deepEqual([stale.status, stale.detail, stale.sentAt], ['SKIPPED', 'الطلب مابقاش مستني اعتماد الحساب ده', null])
  // تشغيل تاني في نفس الساعة: مفيش حاجة متجمعة
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  // الملخص اللي فشل بيتجرّب تاني، وبعد 3 مرات «فشل»
  const failing = await submit(users.requester, types.general)
  await drain()
  mailbox.failure = '451 4.3.0 temporary failure'
  for (let round = 1; round <= 3; round++) {
    assert.equal(await notifications.digestHourlyWork(at(9)), 0)
    const [row] = await deliveriesOf('request', failing.id)
    assert.deepEqual([row.status, row.attempts, row.detail], [round < 3 ? 'DIGEST' : 'FAILED', round, '451 4.3.0 temporary failure'])
  }
  mailbox.failure = null
  // خادم البريد رفض عنوان الملخص نفسه: «فشل» من أول مرة (الإعادة مش هتغيّر حاجة)، والسبب من غير العنوان الكامل
  const bounced = await submit(users.requester, types.general)
  await drain()
  mailbox.failure = 'خادم البريد رفض العنوان: manager@notify.invalid — 550 5.1.1 <manager@notify.invalid>: Recipient address rejected'
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  mailbox.failure = null
  const [bouncedRow] = await deliveriesOf('request', bounced.id)
  assert.deepEqual([bouncedRow.status, bouncedRow.attempts, bouncedRow.detail],
    ['FAILED', 1, 'خادم البريد رفض العنوان: ma*****@notify.invalid — 550 5.1.1 <ma*****@notify.invalid>: Recipient address rejected'])
  // اختيار المستخدم بيتقري وقت الملخص: اللي اتجمع وصاحبه قفل بريد الفئة بعدها مابيتبعتش
  const muted = await submit(users.requester, types.general)
  await drain()
  assert.equal((await deliveriesOf('request', muted.id))[0].status, 'DIGEST')
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'OFF' }), 200)
  clearMailbox()
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  const [mutedRow] = await deliveriesOf('request', muted.id)
  assert.deepEqual([mutedRow.status, mutedRow.detail, mailbox.attempts.length], ['SKIPPED', 'المستخدم قافل بريد الفئة دي', 0])
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'DIGEST' }), 200)
  // خادم البريد نفسه مش بيرد وفيه ملخصين لمستخدمين: أول واحد بيتحسب عليه محاولة، والتاني بيستنى من غير محاولة ومن غير اتصال
  for (const user of ['hrA', 'hrGrant']) {
    expectStatus(await request(users[user], 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'DIGEST' }), 200)
  }
  const shared = await submit(users.requester, types.secret, 'بلاغ للملخص')
  await drain()
  const digestRows = async () => (await deliveriesOf('request', shared.id)).filter(row => [users.hrA.id, users.hrGrant.id].includes(row.recipientUserId))
    .sort((a, b) => a.recipientUserId - b.recipientUserId).map(row => [row.status, row.attempts])
  assert.deepEqual(await digestRows(), [['DIGEST', 0], ['DIGEST', 0]])
  clearMailbox()
  mailbox.failure = 'connect ECONNREFUSED 127.0.0.1:25'
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  assert.equal(mailbox.attempts.length, 1, 'الملخص التاني مابيتجرّبش والخادم واقف')
  assert.deepEqual(await digestRows(), [['DIGEST', 1], ['DIGEST', 0]])
  // والإرسال واقف: تشغيل تاني من غير أي اتصال ولا محاولة
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  assert.equal(mailbox.attempts.length, 1)
  assert.deepEqual(await digestRows(), [['DIGEST', 1], ['DIGEST', 0]])
  mailbox.failure = null
  notifications.resumeMail()
  assert.equal(await notifications.digestHourlyWork(at(9)), 2)
  assert.deepEqual(to(mailbox.sent), ['hr-a@notify.invalid', 'hr.grant.work@notify.invalid'])
  // ملخص الطلب السري بنصه العام بس
  assert.ok(mailbox.sent.every(message => message.subject === 'ملخص إشعاراتك (1)' && message.text.includes('تحديث على طلب سري') && !/بلاغ داخلي|حساس|بلاغ للملخص/.test(message.text)))
  assert.deepEqual(await digestRows(), [['SENT', 2], ['SENT', 1]])
  for (const user of ['hrA', 'hrGrant']) {
    expectStatus(await request(users[user], 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'ON' }), 200)
  }
  await act(users.admin, shared.id, 'REJECT', 'تنضيف')
  await drain()
  // (Codex CRP2E-N02) ميعاد الملخص جه في ساعات الهدوء: مابيطلعش، وبيتأجل لآخرها بمهمة واحدة في الطابور
  const digestJobs = () => query(`SELECT [id], [status], [idempotencyKey], DATEDIFF(second, SYSUTCDATETIME(), [runAfter]) AS [delay] FROM [jobs_queue]
    WHERE [jobType] = N'notifications.digest-send' ORDER BY [id]`)
  const held = await submit(users.requester, types.general)
  await drain()
  assert.equal((await deliveriesOf('request', held.id))[0].status, 'DIGEST')
  clearMailbox()
  const pad = value => String(value).padStart(2, '0')
  await setting('notifications.quiet_hours', '08:00-10:00')
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  assert.deepEqual([mailbox.attempts.length, (await deliveriesOf('request', held.id))[0].status], [0, 'DIGEST'])
  let deferred = await digestJobs()
  const quietEnd = new Date(); quietEnd.setHours(10, 0, 0, 0)
  assert.deepEqual(deferred.map(job => [job.status, job.idempotencyKey]), [['PENDING', `notifications.digest-send:${quietEnd.getTime()}`]], 'مهمة واحدة لآخر ساعات الهدوء (10:00)')
  assert.ok(Math.abs(deferred[0].delay - Math.round((quietEnd.getTime() + 1000 - Date.now()) / 1000)) <= 90, `المهمة متأجلة ${deferred[0].delay} ثانية`)
  // المهمة اتسحبت وساعات الهدوء لسه شغالة دلوقتي (النافذة اتمدّت): مهمة جديدة لآخرها ومن غير إرسال
  const nowMinute = new Date().getHours() * 60 + new Date().getMinutes()
  const around = offset => { const minute = (((nowMinute + offset) % 1440) + 1440) % 1440; return `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}` }
  await setting('notifications.quiet_hours', `${around(-60)}-${around(120)}`)
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.digest-send' AND [status] = N'PENDING'`)
  await drain()
  deferred = await digestJobs()
  assert.deepEqual([deferred.map(job => job.status), mailbox.attempts.length], [['DONE', 'PENDING'], 0])
  assert.ok(deferred[1].delay > 3600 && deferred[1].delay <= 2 * 3600 + 90)
  // آخر ساعات الهدوء جه: الملخص بيطلع من مهمة التأجيل
  await setting('notifications.quiet_hours', '')
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.digest-send' AND [status] = N'PENDING'`)
  await drain()
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['manager@notify.invalid', 'ملخص إشعاراتك (1)']])
  assert.deepEqual([(await deliveriesOf('request', held.id))[0].status, (await digestJobs()).map(job => job.status)], ['SENT', ['DONE', 'DONE']])
  // تشغيلين للملخص في نفس اللحظة (الموعد ومهمة التأجيل، أو نسختين من الخادم): رسالة واحدة
  const twin = await submit(users.requester, types.general)
  await drain()
  clearMailbox()
  let letGo
  mailbox.hold = new Promise(resolve => { letGo = resolve })
  const results = []
  const start = () => notifications.sendDigests().then(sent => { results.push(sent) })
  const runs = [start(), start()]
  const until = async (done, limit = 5000) => { for (let waited = 0; waited < limit && !done(); waited += 20) await new Promise(resolve => setTimeout(resolve, 20)) }
  try {
    // واحد ماسك قفل الملخص وواقف عند خادم البريد، والتاني رجع من غير إرسال
    await until(() => results.length === 1 && mailbox.attempts.length >= 1)
    assert.deepEqual([results, mailbox.attempts.length], [[0], 1])
    // وتشغيل تالت والأول لسه عند خادم البريد
    runs.push(start())
    await until(() => results.length === 2, 3000)
    assert.deepEqual([results, mailbox.attempts.length], [[0, 0], 1])
  } finally {
    letGo()
    mailbox.hold = null
    await Promise.all(runs.map(run => run.catch(() => undefined)))
  }
  assert.deepEqual([...results].sort(), [0, 0, 1])
  assert.deepEqual([mailbox.attempts.length, (await deliveriesOf('request', twin.id))[0].status], [1, 'SENT'])
  // البريد اتقفل من الإعدادات واللي متجمّع للملخص لسه مستني: بيتسجل «اتخطّى» في ميعاد الملخص، مايفضلش لحد ما البريد يتفتح بعد أسابيع
  const parked = await submit(users.requester, types.general)
  await drain()
  assert.equal((await deliveriesOf('request', parked.id))[0].status, 'DIGEST')
  await setting('notifications.email.enabled', 'false')
  assert.equal(await notifications.digestHourlyWork(at(9)), 0)
  const [dropped] = await deliveriesOf('request', parked.id)
  assert.deepEqual([dropped.status, dropped.detail], ['SKIPPED', 'البريد اتقفل من الإعدادات قبل الإرسال'])
  await setting('notifications.email.enabled', 'true')
  await setting('notifications.digest_hour', '8')
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'ON' }), 200)
})

test('NT-09: ساعات الهدوء بتأجّل البريد لآخرها، واللي اتأجل ومابقاش صحيح مابيتبعتش', async () => {
  const { parseQuietHours, quietHoursEnd } = require('../src/notifications/notification-events')
  const now = new Date()
  const clock = offsetMinutes => {
    const minute = (((now.getHours() * 60 + now.getMinutes() + offsetMinutes) % 1440) + 1440) % 1440
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
  }
  const window = `${clock(-60)}-${clock(120)}`
  await setting('notifications.quiet_hours', window)
  clearMailbox()
  const req = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.attempts.length, 0, 'جوه ساعات الهدوء مفيش إرسال')
  const [delivery] = await deliveriesOf('request', req.id)
  assert.equal(delivery.status, 'PENDING')
  const job = (await emailJobs()).find(row => row.deliveryId === String(delivery.id))
  const expected = Math.round((quietHoursEnd(new Date(), parseQuietHours(window)).getTime() - Date.now()) / 1000)
  assert.ok(Math.abs(job.delay - expected) <= 90, `المهمة متأجلة ${job.delay} ثانية والمتوقع ${expected}`)
  assert.ok(job.delay > 3600 && job.delay <= 2 * 3600 + 90)
  // طلب تاني اتأجل بريده، واتحسم من حد تاني قبل آخر ساعات الهدوء: بريده مابيتبعتش الصبح
  const handled = await submit(users.requester, types.general)
  await drain()
  await act(users.admin, handled.id, 'REJECT', 'اتحسم بالليل')
  await drain()
  // طلب تالت اترجع لصاحبه بالليل وصاحبه كمّله وقدّمه تاني قبل الصبح: «أُعيد طلبك» فات وقتها، و«مستني اعتمادك» مرة واحدة (الأحدث)
  const back = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, back.id, 'RETURN', 'ناقص بيانات')
  await drain()
  expectStatus(await request(users.requester, 'POST', `/requests/${back.id}/resubmit`, { payload: { reason: 'بعد الاستكمال' } }), 201)
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  // المهمة اتسحبت وساعات الهدوء لسه شغالة (الساعتين مش ماشيين مع بعض، أو محاولة اتعادت): بتتأجل تاني لآخرها بدل ما تتبعت
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.equal(mailbox.attempts.length, 0, 'ولا رسالة جوه ساعات الهدوء حتى لو مهمتها اتسحبت')
  const requeued = (await emailJobs()).filter(row => row.deliveryId === String(delivery.id))
  assert.deepEqual(requeued.map(row => row.status), ['DONE', 'PENDING'])
  assert.ok(requeued[1].delay > 3600 && requeued[1].delay <= 2 * 3600 + 90, `المهمة الجديدة متأجلة ${requeued[1].delay} ثانية`)
  assert.equal((await deliveriesOf('request', req.id))[0].status, 'PENDING')
  // آخر ساعات الهدوء جه
  await setting('notifications.quiet_hours', '')
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  // بريد الطلبين اللي لسه مستنيين، وقرار الطلب التاني لصاحبه — من غير «طلب مستني اعتمادك» للطلب اللي اتحسم، ومن غير «أُعيد طلبك» للي اتقدّم تاني
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]).sort(), [['manager@notify.invalid', 'طلب بانتظار اعتمادك: طلب إشعارات عام'],
    ['manager@notify.invalid', 'طلب بانتظار اعتمادك: طلب إشعارات عام'], ['requester@notify.invalid', 'تم رفض طلبك: طلب إشعارات عام']].sort())
  assert.equal(mailbox.sent.some(message => message.text.includes(`request=${handled.id}`)), false)
  assert.equal(mailbox.sent.filter(message => message.text.includes(`request=${back.id}`)).length, 1)
  const [skipped] = (await deliveriesOf('request', handled.id)).filter(row => row.recipientUserId === users.manager.id)
  assert.deepEqual([skipped.status, skipped.detail], ['SKIPPED', 'الطلب مابقاش مستني اعتماد الحساب ده'])
  const backRows = await deliveriesOf('request', back.id)
  assert.deepEqual(backRows.map(row => [row.eventCode, row.status, row.detail]), [['request.pending_approval', 'SKIPPED', 'فيه إشعار أحدث لنفس الحدث'],
    ['request.returned', 'SKIPPED', 'الطلب اتقدّم تاني أو اتحسم'], ['request.pending_approval', 'SENT', null]])
  // برّه النافذة: الإرسال فوري
  await setting('notifications.quiet_hours', `${clock(120)}-${clock(180)}`)
  clearMailbox()
  const outside = await submit(users.requester, types.general)
  await drain()
  assert.equal(mailbox.sent.length, 1)
  // اختيار المستخدم بيتقري وقت الإرسال: رسالة اتأجلت وصاحبها قفل بريد الفئة قبل ما تطلع
  await setting('notifications.quiet_hours', window)
  clearMailbox()
  const muted = await submit(users.requester, types.general)
  await drain()
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'OFF' }), 200)
  await setting('notifications.quiet_hours', '')
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  const [mutedRow] = await deliveriesOf('request', muted.id)
  assert.deepEqual([mutedRow.status, mutedRow.detail], ['SKIPPED', 'المستخدم قافل بريد الفئة دي'])
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'ON' }), 200)
  // واللي اختار «ملخص يومي» قبل ما رسالته المتأجلة تطلع: بتتحوّل للملخص بدل ما تتبعت لوحدها، وبتطلع فيه
  await setting('notifications.quiet_hours', window)
  const digested = await submit(users.requester, types.general)
  await drain()
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'DIGEST' }), 200)
  await setting('notifications.quiet_hours', '')
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  const [digestedRow] = await deliveriesOf('request', digested.id)
  assert.deepEqual([digestedRow.status, digestedRow.detail, digestedRow.subject, digestedRow.body, mailbox.attempts.length], ['DIGEST', null, null, null, 0])
  assert.equal(await notifications.sendDigests(), 1)
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['manager@notify.invalid', 'ملخص إشعاراتك (1)']])
  assert.ok(mailbox.sent[0].text.includes(`${FRONTEND}/approvals-inbox?request=${digested.id}`))
  expectStatus(await request(users.manager, 'PATCH', '/notifications/preferences', { category: 'approval', channel: 'EMAIL', mode: 'ON' }), 200)
  for (const id of [req.id, back.id, outside.id, muted.id, digested.id]) await act(users.admin, id, 'REJECT', 'تنضيف')
  await drain()
})

test('NT-10: «قسيمتك ظهرت» — إشعار مخزّن في القايمة وبريد من غير أي مبلغ، لموظفي المسير بس', async () => {
  const worker = await employee({ basicSalary: 6123 }), silent = await employee({ basicSalary: 5123 }), other = await employee({ basicSalary: 4123 })
  const outsider = await employee({ basicSalary: 7123 })
  for (const emp of [worker, silent, other]) await attend(emp)
  users.worker = await account('worker', 'employee', [], { employeeId: worker.id })
  users.silent = await account('silent', 'employee', [], { employeeId: silent.id })
  users.workerInactive = await account('worker-inactive', 'employee', [], { employeeId: other.id, isActive: false })
  users.outsider = await account('outsider', 'employee', [], { employeeId: outsider.id })
  users.payrollB = await account('payroll-b', 'employee', ['payroll.view'], { branchId: org.branchB.id })
  // «silent» قافل الرواتب داخل النظام وبالبريد
  for (const channel of ['IN_APP', 'EMAIL']) expectStatus(await request(users.silent, 'PATCH', '/notifications/preferences', { category: 'payroll', channel, mode: 'OFF' }), 200)

  const createdPolicy = expectStatus(await request(users.admin, 'POST', '/payroll/policies', { name: 'مجموعة الإشعارات', effectiveFrom: policyStart,
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } }), 201)
  const published = expectStatus(await request(users.admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${createdPolicy.versions[0].id}/publish`,
    { expectedRevision: createdPolicy.versions[0].revision, reason: 'نشر مجموعة لاختبار الإشعارات' }), 200)
  let run = expectStatus(await request(users.admin, 'POST', '/payroll/runs', { name: 'مسير الإشعارات', policyVersionId: published.version.id, period,
    filters: { employeeIds: [worker.id, silent.id, other.id] } }), 201)
  run = expectStatus(await request(users.admin, 'POST', `/payroll/runs/${run.id}/calculate`, {}), 201)
  clearMailbox()
  await drain()
  assert.equal((await notificationsOf('payroll_run', run.id)).length, 0, 'قبل الاعتماد مفيش إشعار')
  const report = expectStatus(await request(users.admin2, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(users.admin2, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expectStatus(await request(users.admin2, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  await drain()

  // لموظفي المسير اللي ليهم حساب شغال بس: مش اللي برّه المسير، ولا قارئ رواتب من فرع تاني، ولا الحساب المقفول
  const rows = await notificationsOf('payroll_run', run.id)
  assert.deepEqual(rows.map(row => [row.recipientUserId, row.eventCode, row.category, row.inApp, row.title, row.body, row.link]).sort((a, b) => a[0] - b[0]), [
    [users.worker.id, 'payroll.payslip_available', 'payroll', true, 'قسيمة راتبك متاحة', `قسيمة ${period} متاحة في «قسائم راتبي»`, '/my/payslips'],
    [users.silent.id, 'payroll.payslip_available', 'payroll', false, 'قسيمة راتبك متاحة', `قسيمة ${period} متاحة في «قسائم راتبي»`, '/my/payslips'],
  ].sort((a, b) => a[0] - b[0]))
  assert.deepEqual(to(mailbox.sent), ['worker@notify.invalid'])
  const [mail] = mailbox.sent
  assert.equal(mail.subject, `قسيمة راتبك متاحة: ${period}`)
  assert.ok(mail.text.includes(`${FRONTEND}/my/payslips`))
  // من غير أي مبلغ: ولا رقم غير الشهر
  assert.equal(/6123|5123|4123|\d{4,}(?!-)/.test(mail.text.replace(period, '').replace(/https?:\/\/\S+/g, '')), false, mail.text)
  const inApp = await deliveriesOf('payroll_run', run.id, 'IN_APP')
  assert.deepEqual(inApp.map(row => [row.recipientUserId, row.status, row.detail]).sort((a, b) => a[0] - b[0]),
    [[users.worker.id, 'SENT', null], [users.silent.id, 'SKIPPED', 'المستخدم قافل الإشعار داخل النظام للفئة دي']].sort((a, b) => a[0] - b[0]))
  const emails = await deliveriesOf('payroll_run', run.id)
  assert.deepEqual(emails.map(row => [row.recipientUserId, row.status, row.detail]).sort((a, b) => a[0] - b[0]),
    [[users.worker.id, 'SENT', null], [users.silent.id, 'SKIPPED', 'المستخدم قافل بريد الفئة دي']].sort((a, b) => a[0] - b[0]))

  // المسير اتفتح تاني = القسيمة مابقتش ظاهرة = الإشعار بيختفي من القايمة (نفس شرط «قسائم راتبي»)، ولما يتعتمد تاني بيرجع
  const stored = rows.find(row => row.recipientUserId === users.worker.id)
  const itemsOf = async user => expectStatus(await request(user, 'GET', '/notifications'), 200).filter(entry => entry.id.startsWith('n-')).map(entry => entry.id)
  assert.deepEqual(await itemsOf(users.worker), [`n-${stored.id}`])
  await repo('PayrollRun').update({ id: run.id }, { status: 'CALCULATED' })
  assert.deepEqual(await itemsOf(users.worker), [])
  // بريد قسيمة اتأجل (ساعات الهدوء) والمسير اتفتح قبل ما يتبعت: مابيتبعتش
  await repo('PayrollRun').update({ id: run.id }, { status: 'APPROVED' })
  const clock = offsetMinutes => {
    const now = new Date(), minute = (((now.getHours() * 60 + now.getMinutes() + offsetMinutes) % 1440) + 1440) % 1440
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
  }
  await setting('notifications.quiet_hours', `${clock(-60)}-${clock(120)}`)
  clearMailbox()
  // المسير اتعتمد تاني = حدث جديد = إشعار تاني لنفس المسير: في القايمة الأحدث بس
  assert.equal(await notifications.dispatch({ id: '990001', type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 2)
  await setting('notifications.quiet_hours', '')
  const again = (await notificationsOf('payroll_run', run.id)).filter(row => row.recipientUserId === users.worker.id)
  assert.equal(again.length, 2)
  assert.deepEqual(await itemsOf(users.worker), [`n-${again[1].id}`], 'إشعار واحد للقسيمة: الأحدث')
  await repo('PayrollRun').update({ id: run.id }, { status: 'CALCULATED' })
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.equal(mailbox.attempts.length, 0)
  const late = (await deliveriesOf('payroll_run', run.id)).filter(row => row.recipientUserId === users.worker.id).pop()
  assert.deepEqual([late.status, late.detail], ['SKIPPED', 'المسير اتفتح تاني والقسيمة مابقتش ظاهرة'])
  await repo('PayrollRun').update({ id: run.id }, { status: 'APPROVED' })
  // اتعتمد مرتين ورا بعض والبريد متأجل: رسالة واحدة (الأحدث)، والأقدم «اتخطّى»
  await setting('notifications.quiet_hours', `${clock(-60)}-${clock(120)}`)
  for (const id of ['990002', '990003']) {
    assert.equal(await notifications.dispatch({ id, type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 2)
  }
  await setting('notifications.quiet_hours', '')
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  clearMailbox()
  await drain()
  assert.deepEqual(mailbox.sent.map(message => [message.to, message.subject]), [['worker@notify.invalid', `قسيمة راتبك متاحة: ${period}`]])
  const workerMails = (await deliveriesOf('payroll_run', run.id)).filter(row => row.recipientUserId === users.worker.id)
  assert.deepEqual(workerMails.slice(-2).map(row => [row.status, row.detail]), [['SKIPPED', 'فيه إشعار أحدث لنفس الحدث'], ['SENT', null]])
  const newest = (await notificationsOf('payroll_run', run.id)).filter(row => row.recipientUserId === users.worker.id).pop()
  assert.deepEqual(await itemsOf(users.worker), [`n-${newest.id}`])
  // موظف مش في المسير (اتشال منه بعد ما اتفتح): إشعاره القديم مابيظهرش
  await query(`INSERT INTO [notifications] ([recipientUserId], [eventCode], [category], [entityType], [entityId], [kind], [title], [body], [link], [inApp], [dedupeKey], [createdAt])
    VALUES (@0, N'payroll.payslip_available', N'payroll', N'payroll_run', @1, N'info', N'قسيمة راتبك متاحة', N'تجربة', N'/my/payslips', 1, N'test:removed-member', SYSDATETIME())`, [users.outsider.id, String(run.id)])
  assert.deepEqual(await itemsOf(users.outsider), [])

  // القايمة: نفس شكل العنصر الحالي بالحرف، ومقروء وحذف بنفس المسارين
  stored.id = newest.id
  let list = expectStatus(await request(users.worker, 'GET', '/notifications'), 200)
  const item = list.find(entry => entry.id === `n-${stored.id}`)
  assert.deepEqual(Object.keys(item).sort(), ['at', 'body', 'category', 'id', 'kind', 'link', 'read', 'title'])
  assert.deepEqual([item.kind, item.category, item.title, item.body, item.link, item.read], ['info', 'payroll', 'قسيمة راتبك متاحة', `قسيمة ${period} متاحة في «قسائم راتبي»`, '/my/payslips', false])
  assert.ok(Math.abs(new Date(item.at).getTime() - Date.now()) < 5 * 60_000)
  for (const user of [users.silent, users.outsider, users.payrollB, users.admin]) {
    assert.equal(expectStatus(await request(user, 'GET', '/notifications'), 200).some(entry => entry.id.startsWith('n-')), false, user.email)
  }
  // إشعار حد تاني مابيتعلّمش ولا بيتحذف
  assert.deepEqual(expectStatus(await request(users.outsider, 'PATCH', '/notifications/read', { ids: [item.id] }), 200), { ok: true, updated: 0 })
  expectStatus(await request(users.outsider, 'DELETE', `/notifications/${item.id}`), 404)
  assert.deepEqual(expectStatus(await request(users.worker, 'PATCH', '/notifications/read', { ids: [item.id] }), 200), { ok: true, updated: 1 })
  list = expectStatus(await request(users.worker, 'GET', '/notifications'), 200)
  assert.equal(list.find(entry => entry.id === item.id).read, true)
  expectStatus(await request(users.worker, 'DELETE', `/notifications/${item.id}`), 200)
  assert.equal(expectStatus(await request(users.worker, 'GET', '/notifications'), 200).some(entry => entry.id === item.id), false)
  const [state] = await query(`SELECT [readAt], [dismissedAt] FROM [notification_reads] WHERE [userId] = @0 AND [notificationId] = @1`, [users.worker.id, item.id])
  assert.ok(state.readAt && state.dismissedAt)

  // الأقدم من 60 يوم مابيظهرش، والجديد بنفس الشكل بيظهر (إشعار من غير كيان: العمر هو الشرط الوحيد)
  const plain = (code, key, days) => query(`INSERT INTO [notifications] ([recipientUserId], [eventCode], [category], [entityType], [entityId], [kind], [title], [body], [link], [inApp], [dedupeKey], [createdAt])
    OUTPUT INSERTED.[id] VALUES (@0, @1, N'payroll', NULL, NULL, N'info', N'إشعار تجربة', N'تجربة', N'/my/payslips', 1, @2, DATEADD(day, -@3, SYSDATETIME()))`, [users.worker.id, code, key, days])
  await plain('test.old', 'test:old', 61)
  const [recent] = await plain('test.recent', 'test:recent', 1)
  assert.deepEqual(await itemsOf(users.worker), [`n-${recent.id}`])
})

test('NT-11: القوالب وسجل الإرسال لحساب الشركة بس — تعديل بمتغيرات الحدث، ورجوع للافتراضي، وسطر تدقيق، وعنوان متخفي', async () => {
  for (const [method, route, body] of [['GET', '/notifications/templates'], ['GET', '/notifications/deliveries'],
    ['PUT', '/notifications/templates/request.decided/EMAIL', { title: 'عنوان', body: 'نص' }], ['DELETE', '/notifications/templates/request.decided/EMAIL']]) {
    expectStatus(await request(users.requester, method, route, body), 403)
    expectStatus(await request(users.branchSettings, method, route, body), 403)
    expectStatus(await request(null, method, route, body), 401)
  }
  const catalog = expectStatus(await request(users.admin, 'GET', '/notifications/templates'), 200)
  assert.equal(catalog.available, true)
  assert.deepEqual(catalog.events.map(event => event.code), ['request.pending_approval', 'request.escalated', 'request.decided', 'request.returned', 'request.confidential', 'payroll.payslip_available',
    'document.expiring', 'task.assigned', 'task.due_soon', 'task.overdue', 'comment.mentioned'])
  const decided = catalog.events.find(event => event.code === 'request.decided')
  assert.deepEqual([decided.templates.EMAIL.customized, decided.storedInApp, decided.variables.map(variable => variable.key)],
    [false, false, ['request.type', 'request.decision', 'recipient.name', 'company.name', 'link']])
  // متغير مش بتاع الحدث، وصيغة ناقصة، وعنوان بسطرين، وحدث أو قناة مش معروفين
  const put = (code, channel, body) => request(users.admin, 'PUT', `/notifications/templates/${code}/${channel}`, body)
  for (const body of [{ title: 'قرار {{request.requester}}', body: 'نص' }, { title: 'قرار', body: 'نص {{request.type' }, { title: 'سطر\nتاني', body: 'نص' },
    { title: 'قرار {{payslip.period}}', body: 'نص' }, { title: 'ق', body: 'نص' }, { title: 'قرار', body: '' }]) {
    expectStatus(await put('request.decided', 'EMAIL', body), 400)
  }
  expectStatus(await put('request.unknown', 'EMAIL', { title: 'عنوان', body: 'نص' }), 400)
  expectStatus(await put('request.decided', 'SMS', { title: 'عنوان', body: 'نص' }), 400)
  // السري مايقبلش متغير النوع ولا الاسم حتى من المحرر
  expectStatus(await put('request.confidential', 'EMAIL', { title: 'سري {{request.type}}', body: 'نص' }), 400)

  const changed = expectStatus(await put('request.decided', 'EMAIL', { title: 'تحديث طلبك — {{request.type}}', body: 'أهلًا {{recipient.name}}\n{{request.decision}}\n{{link}}' }), 200)
  const template = changed.events.find(event => event.code === 'request.decided').templates.EMAIL
  assert.deepEqual([template.customized, template.title, template.default.title], [true, 'تحديث طلبك — {{request.type}}', '{{request.decision}}: {{request.type}}'])
  const [audit] = await query(`SELECT TOP (1) [action], [entityType], [entityId], [actorUserId] FROM [audit_log] WHERE [action] = N'NOTIFICATION_TEMPLATE_CHANGED' ORDER BY [id] DESC`)
  assert.deepEqual([audit.entityType, audit.entityId, audit.actorUserId], ['notification_template', 'request.decided:EMAIL', users.admin.id])
  clearMailbox()
  const req = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, req.id, 'REJECT', 'رفض')
  await drain()
  const mail = mailbox.sent.find(message => message.to === 'requester@notify.invalid')
  assert.equal(mail.subject, 'تحديث طلبك — طلب إشعارات عام')
  assert.equal(mail.text, `أهلًا حساب requester\nتم رفض طلبك\n${FRONTEND}/requests`)
  // الرجوع للافتراضي
  const reset = expectStatus(await request(users.admin, 'DELETE', '/notifications/templates/request.decided/EMAIL'), 200)
  assert.equal(reset.events.find(event => event.code === 'request.decided').templates.EMAIL.customized, false)
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [notification_templates]`))[0].n), 0)
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = N'NOTIFICATION_TEMPLATE_RESET'`))[0].n), 1)

  // سجل الإرسال: حالات، وعدّ، وفلتر، وعنوان متخفي — من غير نص الرسالة
  const log = expectStatus(await request(users.admin, 'GET', '/notifications/deliveries'), 200)
  assert.deepEqual([log.available, log.emailEnabled, log.mailConfigured, log.linkConfigured], [true, true, true, true])
  assert.ok(log.counts.SENT > 0 && log.counts.SKIPPED > 0 && log.counts.FAILED > 0)
  assert.ok(log.rows.length > 0 && log.rows.length <= 100)
  const row = log.rows.find(entry => entry.status === 'SENT' && entry.channel === 'EMAIL')
  assert.deepEqual(Object.keys(row).sort(), ['address', 'attempts', 'channel', 'createdAt', 'detail', 'event', 'id', 'recipientName', 'recipientUserId', 'sentAt', 'status'])
  // العدّ للبريد بس: إشعار القسيمة داخل النظام مش «رسالة اتبعتت»
  const [{ mails }] = await query(`SELECT COUNT(*) AS [mails] FROM [notification_deliveries] WHERE [channel] = N'EMAIL' AND [status] = N'SENT'`)
  assert.equal(log.counts.SENT, Number(mails))
  assert.equal(JSON.stringify(log).includes('requester@notify.invalid'), false, 'العنوان الكامل مابيطلعش')
  assert.ok(log.rows.some(entry => entry.address === 're*******@notify.invalid'))
  const failed = expectStatus(await request(users.admin, 'GET', '/notifications/deliveries?status=FAILED'), 200)
  assert.ok(failed.rows.length > 0 && failed.rows.every(entry => entry.status === 'FAILED' && entry.detail))
})

test('NT-12: حدود الإعدادات التلاتة، ومسح مهام الطابور المنتهية القديمة', async () => {
  const patch = (key, value) => request(users.admin, 'PATCH', '/settings/config', { key, value })
  for (const [key, values] of [['notifications.email.enabled', ['TRUE', '1', 'yes', '']], ['notifications.quiet_hours', ['oops', '25:00-07:00', '22:00', '22:00-22:00', '22:00 to 07:00']],
    ['notifications.digest_hour', ['-1', '24', '8.5', 'oops', '']]]) {
    for (const value of values) expectStatus(await patch(key, value), 400)
  }
  expectStatus(await patch('notifications.quiet_hours', ' 22:00-07:00 '), 200)
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'notifications.quiet_hours' })).value, '22:00-07:00')
  expectStatus(await patch('notifications.quiet_hours', ''), 200)
  expectStatus(await patch('notifications.digest_hour', '23'), 200)
  expectStatus(await patch('notifications.digest_hour', '8'), 200)
  expectStatus(await patch('notifications.email.enabled', 'false'), 200)
  assert.equal(expectStatus(await request(users.manager, 'GET', '/notifications/preferences'), 200).emailEnabled, false)

  // مسح المنتهي: DONE الأقدم من 30 يوم بس — الميتة والمستنية والجديدة بتفضل
  const insert = (status, daysAgo, key) => query(`INSERT INTO [jobs_queue] ([jobType], [payload], [status], [attempts], [maxAttempts], [runAfter], [idempotencyKey], [createdAt], [finishedAt])
    VALUES (N'test.prune', NULL, @0, 1, 5, SYSUTCDATETIME(), @2, DATEADD(day, -@1, SYSUTCDATETIME()), CASE WHEN @0 = N'PENDING' THEN NULL ELSE DATEADD(day, -@1, SYSUTCDATETIME()) END)`, [status, daysAgo, key])
  await insert('DONE', 31, 'prune:old-done'); await insert('DONE', 29, 'prune:new-done'); await insert('DEAD', 90, 'prune:old-dead'); await insert('PENDING', 90, 'prune:old-pending')
  const doneBefore = Number((await query(`SELECT COUNT(*) AS [n] FROM [jobs_queue] WHERE [status] = N'DONE'`))[0].n)
  assert.equal(await queue.pruneDone(), 1)
  assert.deepEqual((await query(`SELECT [idempotencyKey] FROM [jobs_queue] WHERE [jobType] = N'test.prune' ORDER BY [idempotencyKey]`)).map(job => job.idempotencyKey),
    ['prune:new-done', 'prune:old-dead', 'prune:old-pending'])
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [jobs_queue] WHERE [status] = N'DONE'`))[0].n), doneBefore - 1)
  assert.equal(await queue.pruneDone(), 0)
})

test('NT-13: دفعة كبيرة (قسايم مسير) بتتوزع على دقايق، ورسالة «مستنية» مهمتها وقفت بتتسجل «فشل»', async () => {
  await setting('notifications.email.enabled', 'true')
  const staff = []
  for (let index = 0; index < 25; index++) {
    const emp = await employee()
    staff.push({ emp, user: await account(`bulk-${index}`, 'employee', [], { employeeId: emp.id }) })
  }
  // مسير معتمد مكتوب مباشرة: التوزيع بيقرا حالة المسير وبنوده بس
  const run = await repo('PayrollRun').save({ name: 'مسير الدفعة الكبيرة', period: '2026-07', startDate: '2026-06-23', endDate: '2026-07-22', branchId: org.branchA.id,
    status: 'APPROVED', totalNet: 0, approvedAt: new Date() })
  await repo('PayrollItem').save(staff.map(row => ({ runId: run.id, employeeId: row.emp.id, basicSalary: 6000, netPay: 6000, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })))
  clearMailbox()
  assert.equal(await notifications.dispatch({ id: '991001', type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 25)
  const ids = new Set((await deliveriesOf('payroll_run', run.id)).map(row => String(row.id)))
  const jobs = (await emailJobs()).filter(row => ids.has(row.deliveryId))
  assert.equal(jobs.length, 25)
  // 20 في الدقيقة: العشرين الأولانيين دلوقتي، والخمسة الباقيين بعد دقيقة (الهامش لفرق ساعة التطبيق عن ساعة القاعدة)
  assert.deepEqual([jobs.filter(row => row.delay <= 0).length, jobs.filter(row => row.delay >= 30 && row.delay <= 90).length], [20, 5])
  await drain()
  assert.equal(mailbox.sent.length, 20)
  // واحد من الخمسة المتأجلين اتشال من المسير قبل ما رسالته تطلع (المسير اتفتح واتعتمد من غيره): قسيمته مابقتش ظاهرة، فرسالته مابتتبعتش
  const delayed = (await deliveriesOf('payroll_run', run.id)).filter(row => row.status === 'PENDING')
  assert.equal(delayed.length, 5)
  const removed = staff.find(row => row.user.id === delayed[0].recipientUserId)
  await repo('PayrollItem').delete({ runId: run.id, employeeId: removed.emp.id })
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.equal(mailbox.sent.length, 24)
  assert.equal(new Set(mailbox.sent.map(message => message.to)).size, 24)
  assert.equal(mailbox.sent.some(message => message.to === removed.user.email), false)
  const [left] = (await deliveriesOf('payroll_run', run.id)).filter(row => row.recipientUserId === removed.user.id)
  assert.deepEqual([left.status, left.detail], ['SKIPPED', 'المسير اتفتح تاني والقسيمة مابقتش ظاهرة'])

  // رسالة «مستنية» ومهمتها ماتت من غير ما تسجّل نتيجة (العامل وقع في آخر محاولة): الفحص كل ساعة بيسجلها «فشل»، وإعادة مهمتها بتبعتها
  clearMailbox()
  const req = await submit(users.requester, types.general)
  await queue.runOnce({ limit: 200 })
  const [stuck] = await deliveriesOf('request', req.id)
  assert.equal(stuck.status, 'PENDING')
  const stuckJob = (await emailJobs()).find(row => row.deliveryId === String(stuck.id))
  await query(`UPDATE [jobs_queue] SET [status] = N'DEAD', [attempts] = [maxAttempts], [finishedAt] = SYSUTCDATETIME() WHERE [id] = @0`, [stuckJob.id])
  // لسه جديدة: مابتتلمسش
  await notifications.settleStuck()
  assert.equal((await deliveriesOf('request', req.id))[0].status, 'PENDING')
  await notifications.settleStuck(new Date(Date.now() + 16 * 60_000))
  const [settled] = await deliveriesOf('request', req.id)
  assert.deepEqual([settled.status, settled.detail], ['FAILED', 'المهمة وقفت قبل ما تسجّل النتيجة'])
  // رسالة مستنية ومهمتها لسه شغالة مابتتلمسش
  const live = await submit(users.requester, types.general)
  await queue.runOnce({ limit: 200 })
  await notifications.settleStuck(new Date(Date.now() + 16 * 60_000))
  assert.equal((await deliveriesOf('request', live.id))[0].status, 'PENDING')
  expectStatus(await request(users.admin, 'POST', `/queue/jobs/${stuckJob.id}/retry`), 201)
  await drain()
  assert.deepEqual([(await deliveriesOf('request', req.id))[0].status, (await deliveriesOf('request', live.id))[0].status], ['SENT', 'SENT'])
  await setting('notifications.email.enabled', 'false')
})

test('NT-14: (Codex P2E) حق المستلم بيتفحص وقت الإرسال — حساب اتربط بموظف تاني، وموديول اتقفل بعد التوزيع، وإرجاع الطلب السري', async () => {
  await setting('notifications.email.enabled', 'true')
  const minuteNow = new Date().getHours() * 60 + new Date().getMinutes()
  const clock = offset => { const minute = (((minuteNow + offset) % 1440) + 1440) % 1440; return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}` }
  const quiet = on => setting('notifications.quiet_hours', on ? `${clock(-60)}-${clock(120)}` : '')
  // آخر ساعات الهدوء: المتأجل كله بيتسحب
  const release = async () => { await quiet(false); await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`); await drain() }
  const mode = (user, category, value) => request(user, 'PATCH', '/notifications/preferences', { category, channel: 'EMAIL', mode: value })
  const mineOf = async (entityType, entityId, user) => (await deliveriesOf(entityType, entityId)).filter(row => row.recipientUserId === user.id)

  // ===== CRP2E-B01: قرار طلب موظف مابيوصلش لحساب اتربط بموظف تاني بعد التوزيع =====
  const spare = await employee({ branchId: org.branchB.id })
  // بالنيابة: الطلب قدّمه حساب تاني للموظف، فالحساب بعد تغيير ربطه مابقاش يقراه خالص (404). ومن نفسه: الحساب لسه منشئ الطلب، بس مابقاش صاحبه
  for (const [digest, onBehalf] of [[false, true], [true, true], [false, false]]) {
    if (digest) expectStatus(await mode(users.requester, 'request', 'DIGEST'), 200); else await quiet(true)
    const req = onBehalf
      ? expectStatus(await request(users.admin, 'POST', '/requests', { typeCode: types.general.code, payload: { reason: 'طلب بالنيابة' }, submit: true, onBehalfEmployeeId: emps.requester.id }), 201)
      : await submit(users.requester, types.general)
    await drain()
    if ((await repo('Request').findOneByOrFail({ id: req.id })).status === 'UNDER_REVIEW') {
      await act(users.manager, req.id, 'REJECT', 'رفض قبل تغيير ربط الحساب')
      await drain()
    }
    assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).createdByUserId, onBehalf ? users.admin.id : users.requester.id)
    const [waiting] = await mineOf('request', req.id, users.requester)
    assert.deepEqual([waiting.eventCode, waiting.status], ['request.decided', digest ? 'DIGEST' : 'PENDING'])
    // الحساب اتربط بموظف تاني في فرع تاني (المسار الفعلي): الطلب مابقاش يتقري بالحساب ده
    expectStatus(await request(users.admin, 'PATCH', `/users/${users.requester.id}`, { employeeId: spare.id, branchId: org.branchB.id }), 200)
    const moved = await repo('User').findOneByOrFail({ id: users.requester.id })
    try {
      expectStatus(await request(moved, 'GET', `/requests/${req.id}`), onBehalf ? 404 : 200)
      clearMailbox()
      if (digest) assert.equal(await notifications.sendDigests(), 0); else await release()
      assert.equal(mailbox.sent.some(message => message.to === 'requester@notify.invalid'), false, 'ولا رسالة عن طلب الموظف القديم')
      const [gone] = await mineOf('request', req.id, users.requester)
      assert.deepEqual([gone.status, gone.detail, gone.body], ['SKIPPED', 'الحساب مابقاش حساب صاحب الطلب', null])
    } finally {
      await repo('User').update({ id: users.requester.id }, { employeeId: emps.requester.id, branchId: org.branchA.id, tokenVersion: users.requester.tokenVersion ?? 0 })
      await quiet(false)
      await mode(users.requester, 'request', 'ON')
    }
  }
  // ومن غير تغيير الربط: نفس المسارين بيبعتوا (الفحص مابيمنعش صاحب الطلب نفسه)
  await quiet(true)
  const kept = await submit(users.requester, types.general)
  await drain()
  await act(users.manager, kept.id, 'REJECT', 'رفض عادي')
  await drain()
  clearMailbox()
  await release()
  assert.deepEqual(mailbox.sent.filter(message => message.to === 'requester@notify.invalid').map(message => message.subject), ['تم رفض طلبك: طلب إشعارات عام'])

  // ===== CRP2E-B02: بريد القسيمة مابيطلعش لو موديول الرواتب اتقفل للمستلم بعد التوزيع =====
  const paid = await employee()
  const paidUser = await account('paid', 'employee', [], { employeeId: paid.id })
  const run = await repo('PayrollRun').save({ name: 'مسير قفل الموديول', period: '2026-06', startDate: '2026-05-23', endDate: '2026-06-22', branchId: org.branchA.id,
    status: 'APPROVED', totalNet: 0, approvedAt: new Date() })
  await repo('PayrollItem').save({ runId: run.id, employeeId: paid.id, basicSalary: 6000, netPay: 6000, absenceDays: 0, unpaidLeaveDays: 0, payMethod: 'cash' })
  const modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  const payroll = async enabled => {
    if (enabled) await repo('SystemModule').delete({ key: 'payroll' })
    else await repo('SystemModule').save({ key: 'payroll', enabled: false, enabledAt: new Date(), enabledBy: users.admin.id, audience: null })
    modules.invalidate()
  }
  let eventId = 992000
  for (const digest of [false, true]) {
    if (digest) expectStatus(await mode(paidUser, 'payroll', 'DIGEST'), 200); else await quiet(true)
    assert.equal(await notifications.dispatch({ id: String(++eventId), type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 1)
    const waiting = (await mineOf('payroll_run', run.id, paidUser)).pop()
    assert.equal(waiting.status, digest ? 'DIGEST' : 'PENDING')
    await payroll(false)
    try {
      expectStatus(await request(paidUser, 'GET', '/payroll/my-payslips'), 404)
      clearMailbox()
      if (digest) assert.equal(await notifications.sendDigests(), 0); else await release()
      assert.equal(mailbox.attempts.length, 0, 'ولا رسالة عن شاشة مقفولة للمستلم')
      const closed = (await mineOf('payroll_run', run.id, paidUser)).pop()
      assert.deepEqual([closed.status, closed.detail], ['SKIPPED', 'الشاشة اللي الإشعار بيودّي ليها مابقتش متاحة للمستلم'])
    } finally {
      await payroll(true)
      await quiet(false)
    }
  }
  // والموديول مفتوح: بيتبعت (الملخص هنا)
  assert.equal(await notifications.dispatch({ id: String(++eventId), type: 'PAYROLL_RUN_APPROVED', entityType: 'payroll_run', entityId: String(run.id), payload: { runId: run.id } }), 1)
  clearMailbox()
  assert.equal(await notifications.sendDigests(), 1)
  assert.deepEqual(to(mailbox.sent), ['paid@notify.invalid'])
  await mode(paidUser, 'payroll', 'ON')

  // ===== CRP2E-N03: إرجاع الطلب السري بيبطل بإعادة التقديم زي العادي =====
  await quiet(true)
  const hidden = await submit(users.requester, types.secret, 'تفاصيل حساسة')
  await drain()
  await act(users.hrA, hidden.id, 'RETURN', 'استكمال')
  await drain()
  expectStatus(await request(users.requester, 'POST', `/requests/${hidden.id}/resubmit`, { payload: { reason: 'بعد الاستكمال' } }), 201)
  await drain()
  // وطلب سري تاني اترفض (قرار مش إرجاع): رسالته لسه صحيحة
  const refused = await submit(users.requester, types.secret, 'تفاصيل تانية')
  await drain()
  await act(users.hrA, refused.id, 'REJECT', 'رفض')
  await drain()
  clearMailbox()
  await release()
  const back = await mineOf('request', hidden.id, users.requester)
  assert.deepEqual(back.map(row => [row.eventCode, row.status, row.detail]), [['request.confidential', 'SKIPPED', 'الطلب اتقدّم تاني أو اتحسم']])
  const decided = await mineOf('request', refused.id, users.requester)
  assert.deepEqual(decided.map(row => [row.eventCode, row.status]), [['request.confidential', 'SENT']])
  assert.deepEqual(mailbox.sent.filter(message => message.to === 'requester@notify.invalid').map(message => message.subject), ['تحديث على طلب سري'])
  for (const id of [hidden.id]) await act(users.admin, id, 'REJECT', 'تنضيف')
  await drain()

  // ===== نفس الصنف: نوع الطلب بقى سري بعد ما الرسالة اتجهّزت بنوعه واسم صاحبه (فوري وملخص) =====
  for (const digest of [false, true]) {
    if (digest) expectStatus(await mode(users.manager, 'approval', 'DIGEST'), 200); else await quiet(true)
    const plain = await submit(users.requester, types.general)
    await drain()
    const [ready] = await mineOf('request', plain.id, users.manager)
    assert.equal(ready.status, digest ? 'DIGEST' : 'PENDING')
    await repo('RequestType').update({ id: types.general.id }, { isConfidential: true })
    try {
      clearMailbox()
      if (digest) assert.equal(await notifications.sendDigests(), 0); else await release()
      assert.equal(mailbox.sent.some(message => `${message.subject}\n${message.text}`.includes('طلب إشعارات عام')), false, 'نوع الطلب السري مابيطلعش في رسالة اتجهّزت قبل كده')
      const [sealed] = await mineOf('request', plain.id, users.manager)
      assert.deepEqual([sealed.status, sealed.detail], ['SKIPPED', 'نوع الطلب بقى سري بعد تجهيز الرسالة'])
    } finally {
      await repo('RequestType').update({ id: types.general.id }, { isConfidential: false })
      await quiet(false)
      await mode(users.manager, 'approval', 'ON')
    }
    await act(users.manager, plain.id, 'REJECT', 'تنضيف')
    await drain()
  }
  await setting('notifications.email.enabled', 'false')
})
