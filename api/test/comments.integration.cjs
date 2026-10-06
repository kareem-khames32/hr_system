'use strict'
// B2.8: التعليقات والإشارات، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_comments_test_<16 hex>).
//  CM-01) موظف يسأل على طلبه والمعتمد يرد: الحوار بترتيبه، و«أنت» وصاحب الطلب، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل.
//  CM-02) الحق هو حق الطلب بالحرف: اللي مايشوفش الطلب بياخد نفس رد تفاصيله (403 أو 404) قراءةً وكتابةً، و«عرض كل الطلبات» في فرعه بيقرا ويكتب.
//  CM-03) «داخلي»: مابيرجعش لصاحب الطلب (لا صف ولا رد عليه)، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي؛
//         وحساب صاحب الطلب لو اتربط بموظف تاني، واللي قدّم نيابةً من غير صفة تانية في الطلب، واللي رفض استلام عهدة الطلب، على جانب الموظف.
//  CM-04) الطلب السري: حواره لأطرافه بس، وغيرهم (حتى «عرض كل الطلبات») 403 من غير أي أثر.
//  CM-05) اسم الكاتب: الأطراف بيشوفوه؛ وغير الطرف بيشوفه لو فرع الكاتب دلوقتي في نطاقه (وبعد نقله لأ)؛ والاسم بموظف الحساب وقت
//         الكتابة؛ ومفيش رقم حساب ولا موظف في الرد.
//  CM-06) المهام: حوار لكل اللي يشوف المهمة العادية، من غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار.
//  CM-07) الإشعار: للدور المشار له وكاتب التعليق المردود عليه، اللي يقرا التعليق دلوقتي بس، ومش للكاتب؛ نصه من غير محتوى؛ ووقت
//         الإرسال بيتحكم تاني؛ وفئته في التفضيلات؛ وتعليق من غير إشارة مالوش حدث.
//  CM-08) المرفقات: بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق (والداخلي مش لصاحب الطلب).
//  CM-09) التعليق والتغيير في نفس اللحظة: الحق بيتحكم وصف الطلب أو المهمة مقفول، فالقرار أو التحويل بيستنى التعليق؛ والقرار بيقف على
//         صف الطلب نفسه (التعليق ماسكه بقفل القرار) فمايتقاطعوش على سجل الاعتماد؛ وكاتب مابياخدش صف الطلب الأول بيتقاطع مع التعليق
//         فالتعليق بيتعاد لوحده؛ ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق؛ وتعديلين على نفس الحساب في نفس اللحظة
//         ورا بعض، فربط الحساب اللي في النص متسجّل ومابيتحفظش فوقه بكيان قديم.
//  CM-10) قفل تعديل الحساب مايستنفدش اتصالات القاعدة (Codex CRP2R-B01): أقفال الحسابات المفتوحة نص المخزن بالكتير، والباقي بيستنى دوره
//         من غير اتصال وبياخد دوره بالترتيب؛ واللي دوره ماجاش في المهلة «مشغول» من غير ما شغله يتنفّذ.
// الـAPI بيرجّع مرجع للتعليق (ref) مش رقمه. المساعدين said وshown بيزوّدوا الرقم من القاعدة (id وcommentId) عشان فحوصات القاعدة.
// Run (من api/): node --test test/comments.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const { In } = require('../node_modules/typeorm')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_comments_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-comments-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, queue, created = false, employeeNumber = 0
const FRONTEND = 'https://hr.example.invalid'
const mailbox = { sent: [] }
const org = {}, users = {}, emps = {}, types = {}
const ASKING = 'المعتمد الحالي', OWNER = 'صاحب الطلب'

function assertDisposable() {
  assert.match(database, /^hr_comments_test_[a-f0-9]{16}$/)
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
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: response.status, body: parsed }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
async function setting(key, value) {
  const config = repo('RequestsConfig')
  if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
}
async function employee(extra = {}) {
  const number = ++employeeNumber
  return repo('Employee').save({ employeeCode: `CM${String(number).padStart(3, '0')}`, fullName: `موظف الحوار ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@comments.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const submit = async (user, type, reason = 'طلب للاختبار') => expectStatus(await request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason }, submit: true }), 201)
const act = (user, id, action = 'APPROVE', comment) => request(user, 'POST', `/requests/${id}/act`, { action, comment })
const refOf = id => require('../src/comments/comment-rules').commentRef(id)
const thread = (user, kind, id) => request(user, 'GET', `/${kind}/${id}/comments`)
// الرد على تعليق بمرجعه: الاختبار بيكتب الرقم، والمساعد بيبعت مرجعه (نص زي ما هو بيتبعت زي ما هو)
const comment = (user, kind, id, body) => request(user, 'POST', `/${kind}/${id}/comments`, typeof body === 'string' ? { body }
  : { ...body, ...(Array.isArray(body.replyTo) ? { replyTo: body.replyTo.map(value => typeof value === 'number' ? refOf(value) : value) } : {}) })
const idsOf = async (kind, id) => new Map((await query('SELECT [id] FROM [comments] WHERE [entityType] = @0 AND [entityId] = @1', [kind === 'requests' ? 'request' : 'task', id])).map(row => [refOf(row.id), row.id]))
// شكل التعليق للفحص: رقمه من القاعدة مكان مرجعه (والمرجع لازم يكون مرجع تعليق من نفس الحوار)
const withIds = (ids, row) => {
  const idFor = ref => { assert.ok(ids.has(ref), `مرجع مش من الحوار: ${ref}`); return ids.get(ref) }
  const { ref, ...rest } = row
  return { ...rest, id: idFor(ref), mentions: { targets: row.mentions.targets, replies: row.mentions.replies.map(reply => ({ commentId: idFor(reply.ref), mine: reply.mine, author: reply.author })) } }
}
const said = async (user, kind, id, body) => { const view = expectStatus(await comment(user, kind, id, body), 201); return withIds(await idsOf(kind, id), view) }
const shown = async (user, kind, id) => {
  const view = expectStatus(await thread(user, kind, id), 200), ids = await idsOf(kind, id)
  return { ...view, comments: view.comments.map(row => withIds(ids, row)) }
}
const rowsOf = (kind, id) => query('SELECT [id], [authorUserId], [authorEmployeeId], [internal], [mentions], [body] FROM [comments] WHERE [entityType] = @0 AND [entityId] = @1 ORDER BY [id]', [kind, id])
const mentionEvents = async id => Number((await query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [eventType] = N'COMMENT_MENTION' AND [entityId] = @0`, [String(id)]))[0].n)
const notificationsOf = id => query(`SELECT n.[recipientUserId], n.[eventCode], n.[category], n.[inApp], n.[title], n.[body], n.[link] FROM [notifications] n
  WHERE n.[entityType] = N'comment' AND n.[entityId] = @0 ORDER BY n.[recipientUserId]`, [String(id)])
const deliveriesOf = id => query(`SELECT d.[status], d.[detail], d.[channel], n.[recipientUserId] FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
  WHERE n.[entityType] = N'comment' AND n.[entityId] = @0 AND d.[channel] = N'EMAIL' ORDER BY n.[recipientUserId]`, [String(id)])
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
async function upload(user, search = 'entityType=comment', name = 'note.png') {
  const form = new FormData()
  form.append('file', new Blob([png()], { type: 'image/png' }), name)
  const response = await fetch(`${base}/files/upload?${search}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const uploaded = async (user, search, name) => expectStatus(await upload(user, search, name), 201).id
const download = async (user, fileId) => {
  const response = await fetch(`${base}/files/${fileId}`, { headers: { Authorization: `Bearer ${token(user)}` } })
  const text = response.status === 200 ? '' : await response.text()
  await response.arrayBuffer().catch(() => undefined)
  return [response.status, text ? [].concat(JSON.parse(text).message ?? []).join('، ') : '']
}
// اتصال تاني بيمسك صف لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: التزامن مضمون مش بالصدفة
async function releaseTogether(lockSql, params, count, start, whileBlocked) {
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
    assert.equal(blocked, count, 'الطلبات واقفة على الصف الممسوك')
    if (whileBlocked) await whileBlocked()
    await holder.rollbackTransaction()
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
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: `${FRONTEND}/` })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => true
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
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)
  // أرقام الجداول متباعدة: رقم موظف مايساويش بالصدفة رقم حساب ولا طلب ولا مهمة ولا تعليق
  for (const [table, seed] of [['employees', 1000], ['requests', 3000], ['tasks', 5000], ['comments', 7000]]) await query(`DBCC CHECKIDENT ('${table}', RESEED, ${seed})`)

  org.branchA = await repo('Branch').save({ code: 'CM_A', name: 'فرع الحوار أ' })
  org.branchB = await repo('Branch').save({ code: 'CM_B', name: 'فرع الحوار ب' })
  emps.manager = await employee()
  emps.worker = await employee({ managerEmployeeId: emps.manager.id })
  emps.other = await employee({ managerEmployeeId: emps.manager.id })
  emps.far = await employee({ branchId: org.branchB.id })
  emps.hrPerson = await employee({ managerEmployeeId: emps.manager.id })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.worker = await account('worker', 'employee', [], { employeeId: emps.worker.id })
  users.other = await account('other', 'employee', [], { employeeId: emps.other.id })
  users.far = await account('far', 'employee', [], { employeeId: emps.far.id, branchId: org.branchB.id })
  users.hrA = await account('hr-a', 'employee', ['approve.hr'], { employeeId: emps.hrPerson.id })
  users.hrB = await account('hr-b', 'employee', ['approve.hr'], { branchId: org.branchB.id })
  users.consoleA = await account('console-a', 'employee', ['requests.view_all'])
  users.consoleB = await account('console-b', 'employee', ['requests.view_all'], { branchId: org.branchB.id })
  users.outsider = await account('outsider', 'employee', [], { branchId: org.branchB.id })
  users.tasksAdmin = await account('tasks-admin', 'employee', ['tasks.manage', 'tasks.view_all'])
  users.viewer = await account('viewer', 'employee', ['tasks.view_all'])
  users.itA = await account('it-a', 'employee', ['approve.it'])
  users.proxy = await account('proxy', 'employee', ['requests.create_on_behalf'])
  users.proxyAll = await account('proxy-all', 'employee', ['requests.create_on_behalf', 'requests.view_all'])
  // مدير بيقدّم نيابةً عن مرؤوسه: خطوة السلسلة (المدير المباشر) عليه هو
  emps.lead = await employee()
  emps.junior = await employee({ managerEmployeeId: emps.lead.id })
  users.leadProxy = await account('lead-proxy', 'employee', ['requests.create_on_behalf'], { employeeId: emps.lead.id })
  users.junior = await account('junior', 'employee', [], { employeeId: emps.junior.id })

  const chain = async (code, steps, extra = {}) => {
    const row = await repo('ApprovalChain').save({ code, nameAr: `سلسلة ${code}`, isActive: true, autoApprove: false, ...extra })
    await repo('ApprovalStep').save(steps.map((step, index) => ({ chainId: row.id, stepOrder: index + 1, ...step })))
    return row
  }
  const type = (code, nameAr, chainRow, extra = {}) => repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chainRow.id, isActive: true, ...extra })
  const direct = await chain('CM_DIRECT', [{ approverRole: 'direct_manager_of_requester' }])
  types.plain = await type('CM_PLAIN', 'طلب الحوار العادي', direct)
  types.hr = await type('CM_HR', 'طلب على الموارد البشرية', await chain('CM_HR', [{ approverRole: 'hr' }]))
  types.far = await type('CM_FAR', 'طلب بمعتمد من فرع تاني',
    await chain('CM_FAR', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'specific_employee', specificEmployeeId: emps.far.id }]))
  types.secret = await type('CM_SECRET', 'بلاغ حساس جدًا', await chain('CM_SECRET', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }]), { isConfidential: true })
  types.device = await type('CM_DEVICE', 'طلب جهاز', direct)
  expectStatus(await request(users.admin, 'PATCH', `/settings/request-types/${types.device.id}`, { executionRole: 'it', executionDays: 3, executionProof: false }), 200)
  await setting('notifications.email.enabled', 'true')
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-comments-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'comments fixture cleanup failed')
})

test('CM-01: موظف يسأل على طلبه والمعتمد يرد — الحوار بترتيبه، والإشارة لدور في الموضوع ورد على تعليق، وحدود المدخل', async () => {
  const req = await submit(users.worker, types.plain)
  // حوار فاضي: صاحب الطلب يشاور للمعتمد الحالي بس (مش لنفسه)، ومالوش «داخلي»
  assert.deepEqual(await shown(users.worker, 'requests', req.id), { available: true, comments: [], targets: [{ key: 'CURRENT_APPROVERS', label: ASKING }], canInternal: false, truncated: false })
  const asked = await said(users.worker, 'requests', req.id, { body: '  الطلب واقف ليه؟\r\nمحتاجه بكرة  ', targets: ['CURRENT_APPROVERS'] })
  assert.deepEqual([asked.body, asked.internal, asked.mine, asked.author, asked.mentions, asked.files],
    ['الطلب واقف ليه؟\nمحتاجه بكرة', false, true, { name: emps.worker.fullName, subject: true }, { targets: [{ key: 'CURRENT_APPROVERS', label: ASKING }], replies: [] }, []])
  assert.deepEqual((await rowsOf('request', req.id)).map(row => [row.id, row.authorUserId, row.authorEmployeeId, row.internal, row.mentions]),
    [[asked.id, users.worker.id, emps.worker.id, false, JSON.stringify({ targets: ['CURRENT_APPROVERS'], replyTo: [] })]])
  // المعتمد بيقراه: صاحب الطلب باسمه، ويقدر يشاور له ويكتب داخلي
  let view = await shown(users.manager, 'requests', req.id)
  assert.deepEqual([view.targets, view.canInternal], [[{ key: 'REQUESTER', label: OWNER }, { key: 'CURRENT_APPROVERS', label: ASKING }], true])
  assert.deepEqual(view.comments.map(row => [row.id, row.mine, row.author]), [[asked.id, false, { name: emps.worker.fullName, subject: true }]])
  const answered = await said(users.manager, 'requests', req.id, { body: 'بكرة الصبح', targets: ['REQUESTER'], replyTo: [asked.id, asked.id] })
  assert.deepEqual(answered.mentions, { targets: [{ key: 'REQUESTER', label: OWNER }], replies: [{ commentId: asked.id, mine: false, author: { name: emps.worker.fullName, subject: true } }] })
  // وصاحب الطلب بيلاقي الرد بعد سؤاله، باسم المعتمد، والرد على تعليقه هو
  view = await shown(users.worker, 'requests', req.id)
  assert.deepEqual(view.comments.map(row => [row.id, row.mine, row.author, row.mentions.replies]), [
    [asked.id, true, { name: emps.worker.fullName, subject: true }, []],
    [answered.id, false, { name: emps.manager.fullName, subject: false }, [{ commentId: asked.id, mine: true, author: { name: emps.worker.fullName, subject: true } }]]])
  // تعليق من غير إشارة: مفيش إشارات مخزّنة
  const plain = await said(users.worker, 'requests', req.id, 'تمام شكرًا')
  assert.equal((await rowsOf('request', req.id)).find(row => row.id === plain.id).mentions, null)
  // حدود المدخل: كل واحدة برسالتها، ومن غير صف
  const other = await submit(users.worker, types.plain)
  const foreign = await said(users.worker, 'requests', other.id, 'تعليق على طلب تاني')
  const before = (await rowsOf('request', req.id)).length
  for (const [body, message] of [[{ body: '   ' }, 'اكتب نص التعليق'], [{ body: 'ن'.repeat(2001) }, 'التعليق بحد أقصى 2000 حرف'],
    [{ body: 'نص', targets: ['ASSIGNEE'] }, 'إشارة غير معروفة على الموضوع ده'], [{ body: 'نص', targets: ['NOBODY'] }, 'إشارة غير معروفة على الموضوع ده'],
    // صاحب الطلب مايشاورش لنفسه
    [{ body: 'نص', targets: ['REQUESTER'] }, 'الإشارة دي مش متاحة على التعليق ده'],
    [{ body: 'نص', replyTo: [answered.id + 500] }, 'تعليق مردود عليه مش موجود في الحوار ده'],
    // تعليق من حوار طلب تاني مايتردّش عليه من هنا
    [{ body: 'نص', replyTo: [foreign.id] }, 'تعليق مردود عليه مش موجود في الحوار ده'],
    [{ body: 'نص', replyTo: [1, 2, 3, 4, 5, 6] }, 'التعليقات المردود عليها: بحد أقصى 5'], [{ body: 'نص', replyTo: ['xyz'] }, 'التعليقات المردود عليها غير صالحة'], [{ body: 'نص', replyTo: [String(asked.id)] }, 'التعليقات المردود عليها غير صالحة'],
    [{ body: 'نص', fileIds: [1, 2, 3, 4] }, 'المرفقات: بحد أقصى 3']]) {
    assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, body)), [400, message], JSON.stringify(body).slice(0, 60))
  }
  assert.equal((await rowsOf('request', req.id)).length, before)
  // نص بحده بالظبط مقبول (نهاية السطر بتتوحّد قبل العدّ)
  assert.equal((await said(users.worker, 'requests', req.id, `${'ن'.repeat(1998)}\r\nن`)).body.length, 2000)
  // بعد الاعتماد: الحوار مكمّل، ومفيش «معتمد حالي» يتشاور له
  expectStatus(await act(users.manager, req.id), 201)
  assert.deepEqual((await shown(users.worker, 'requests', req.id)).targets, [])
  assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, { body: 'نص', targets: ['CURRENT_APPROVERS'] })), [400, 'الإشارة دي مش متاحة على التعليق ده'])
  await said(users.worker, 'requests', req.id, 'وصل، شكرًا')
  // حوار أطول من الحد: آخر 200 تعليق بترتيبهم، وعلامة إن فيه أقدم
  const short = await shown(users.worker, 'requests', req.id)
  assert.deepEqual([short.truncated, short.comments.length < 200], [false, true])
  await query(`INSERT INTO [comments] ([entityType], [entityId], [authorUserId], [authorEmployeeId], [body], [internal], [mentions], [createdAt])
    SELECT TOP (200) N'request', @0, @1, @2, N'تعليق قديم ' + CAST(ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS nvarchar(10)), 0, NULL, SYSUTCDATETIME() FROM sys.all_objects`, [req.id, users.worker.id, emps.worker.id])
  const all = (await rowsOf('request', req.id)).map(row => row.id)
  const long = await shown(users.worker, 'requests', req.id)
  assert.deepEqual([long.truncated, long.comments.map(row => row.id)], [true, all.slice(-200)])
  // والرد على تعليق من آخر 200 بس: الأقدم منهم «مش موجود»، وأقدم المعروض بيتردّ عليه
  assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, { body: 'رد على تعليق قديم', replyTo: [all[0]] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  const edge = all.slice(-200)[0]
  assert.deepEqual((await said(users.worker, 'requests', req.id, { body: 'رد على أقدم المعروض', replyTo: [edge] })).mentions.replies.map(row => row.commentId), [edge])
  // والحد بيتعدّ من نوع الرد نفسه: تعليق داخلي جديد مايطلّعش تعليق ظاهر من اللي صاحب الطلب يقدر يرد عليه (وإلا عدد الداخلي كان هيبان له)
  await said(users.manager, 'requests', req.id, { body: 'داخلي فوق الحوار', internal: true })
  const oldest = (await shown(users.worker, 'requests', req.id)).comments[0].id
  assert.deepEqual((await said(users.worker, 'requests', req.id, { body: 'رد على أقدم المعروض له', replyTo: [oldest] })).mentions.replies.map(row => row.commentId), [oldest])
})

test('CM-02: الحق هو حق الطلب بالحرف — اللي مايشوفش الطلب بياخد نفس رد تفاصيله، و«عرض كل الطلبات» في فرعه بيقرا ويكتب', async () => {
  const req = await submit(users.worker, types.plain)
  const first = await said(users.worker, 'requests', req.id, 'سؤال')
  for (const [user, expected] of [[users.other, [403, 'لا تملك صلاحية عرض هذا الطلب']], [users.outsider, [404, 'الطلب غير موجود']], [users.consoleB, [404, 'الطلب غير موجود']], [users.hrB, [404, 'الطلب غير موجود']]]) {
    const detail = answer(await request(user, 'GET', `/requests/${req.id}`))
    assert.deepEqual(detail, expected, user.email)
    assert.deepEqual(answer(await thread(user, 'requests', req.id)), detail, user.email)
    assert.deepEqual(answer(await comment(user, 'requests', req.id, 'محاولة')), detail, user.email)
  }
  // رقم مش موجود = نفس رد اللي مش ظاهر
  for (const user of [users.worker, users.consoleA, users.outsider]) {
    // ومنه رقم أكبر من حد أرقام القاعدة
    for (const id of [req.id + 9000, 2147483648, 9007199254740991]) {
      assert.deepEqual(answer(await thread(user, 'requests', id)), [404, 'الطلب غير موجود'], `${user.email} ${id}`)
      assert.deepEqual(answer(await comment(user, 'requests', id, 'محاولة')), [404, 'الطلب غير موجود'], `${user.email} ${id}`)
    }
  }
  assert.deepEqual((await rowsOf('request', req.id)).map(row => row.id), [first.id], 'المرفوض ماكتبش حاجة')
  expectStatus(await thread(null, 'requests', req.id), 401)
  // «عرض كل الطلبات» في فرع الطلب: بيقرا الحوار ويكتب فيه (ومش طرف: يشاور لصاحب الطلب وللمعتمد)
  const view = await shown(users.consoleA, 'requests', req.id)
  assert.deepEqual([view.comments.map(row => row.id), view.targets.map(row => row.key), view.canInternal], [[first.id], ['REQUESTER', 'CURRENT_APPROVERS'], true])
  const note = await said(users.consoleA, 'requests', req.id, 'ملاحظة من لوحة الطلبات')
  assert.deepEqual([note.mine, (await rowsOf('request', req.id)).find(row => row.id === note.id).authorEmployeeId], [true, null])
})

test('CM-03: «داخلي» — مابيرجعش لصاحب الطلب، وصاحب الطلب مايكتبوش حتى لو معاه صلاحيات، وتعليق ظاهر مايردّش على داخلي', async () => {
  const req = await submit(users.worker, types.plain)
  const asked = await said(users.worker, 'requests', req.id, 'سؤال ظاهر')
  const inner = await said(users.manager, 'requests', req.id, { body: 'ملاحظة داخلية: الموظف عليه إنذار', internal: true, targets: ['CURRENT_APPROVERS'], replyTo: [asked.id] })
  assert.deepEqual([inner.internal, (await rowsOf('request', req.id)).find(row => row.id === inner.id).internal], [true, true])
  const visible = await said(users.manager, 'requests', req.id, 'رد ظاهر')
  // صاحب الطلب: الظاهر بس، ومن غير أي أثر للداخلي
  const mine = await shown(users.worker, 'requests', req.id)
  assert.deepEqual([mine.comments.map(row => row.id), mine.truncated], [[asked.id, visible.id], false])
  assert.equal(JSON.stringify(mine).includes('إنذار'), false)
  // المعتمد واللوحة: التلاتة، والداخلي معلَّم
  for (const user of [users.manager, users.consoleA]) {
    assert.deepEqual((await shown(user, 'requests', req.id)).comments.map(row => [row.id, row.internal]), [[asked.id, false], [inner.id, true], [visible.id, false]], user.email)
  }
  // صاحب الطلب مايكتبش داخلي، ومايردّش على داخلي (زي رقم مش موجود)
  assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'])
  assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, { body: 'نص', replyTo: [inner.id] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  // وتعليق ظاهر من أي حد مايردّش على داخلي (كان هيقول لصاحب الطلب إن فيه تعليق داخلي ومين كاتبه)؛ والداخلي يرد على الاتنين
  assert.deepEqual(answer(await comment(users.manager, 'requests', req.id, { body: 'نص', replyTo: [inner.id] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  const second = await said(users.consoleA, 'requests', req.id, { body: 'داخلي تاني', internal: true, replyTo: [inner.id, asked.id] })
  assert.deepEqual(second.mentions.replies.map(row => row.commentId), [inner.id, asked.id])
  // والداخلي مايشاورش لصاحب الطلب (مش هيشوفه)
  assert.deepEqual(answer(await comment(users.manager, 'requests', req.id, { body: 'نص', internal: true, targets: ['REQUESTER'] })), [400, 'الإشارة دي مش متاحة على التعليق ده'])
  assert.deepEqual(answer(await comment(users.manager, 'requests', req.id, { body: 'نص', internal: 'yes' })), [400, 'internal must be a boolean value'])
  // صاحب الطلب بحساب معاه صلاحيات الموارد البشرية و«عرض كل الطلبات»: لسه صاحب الطلب
  const own = await submit(users.hrA, types.plain)
  const hidden = await said(users.manager, 'requests', own.id, { body: 'داخلي عن طلب موظف الموارد البشرية', internal: true })
  const powerful = { ...users.hrA, permissions: JSON.stringify(['approve.hr', 'requests.view_all']) }
  assert.deepEqual([(await shown(powerful, 'requests', own.id)).comments.map(row => row.id), (await shown(powerful, 'requests', own.id)).canInternal], [[], false])
  assert.deepEqual(answer(await comment(powerful, 'requests', own.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'])
  assert.deepEqual((await shown(users.manager, 'requests', own.id)).comments.map(row => row.id), [hidden.id])
  // والحساب ده (معاه «عرض كل الطلبات») اتربط بموظف تاني أو اتفك ربطه: لسه الحساب اللي قدّم الطلب = لسه على جانب الموظف
  try {
    for (const employeeId of [emps.other.id, null]) {
      await repo('User').update({ id: users.hrA.id }, { employeeId })
      const moved = { ...powerful, employeeId }
      const view = await shown(moved, 'requests', own.id)
      assert.deepEqual([view.comments.map(row => row.id), view.canInternal], [[], false], String(employeeId))
      assert.deepEqual(answer(await comment(moved, 'requests', own.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'], String(employeeId))
    }
  } finally { await repo('User').update({ id: users.hrA.id }, { employeeId: emps.hrPerson.id }) }
  // حساب صاحب الطلب اتربط بموظف تاني: لسه منشئ طلبه وبيقراه، ولسه على جانب الموظف (الداخلي مش ليه ومايكتبوش)
  try {
    await repo('User').update({ id: users.worker.id }, { employeeId: emps.other.id })
    const relinked = { ...users.worker, employeeId: emps.other.id }
    const view = await shown(relinked, 'requests', req.id)
    assert.deepEqual([view.comments.map(row => row.id), view.canInternal, view.targets.map(row => row.key)], [[asked.id, visible.id], false, ['REQUESTER', 'CURRENT_APPROVERS']])
    assert.deepEqual(answer(await comment(relinked, 'requests', req.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'])
    assert.deepEqual(answer(await comment(relinked, 'requests', req.id, { body: 'نص', replyTo: [inner.id] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  } finally { await repo('User').update({ id: users.worker.id }, { employeeId: emps.worker.id }) }
  // اللي قدّم نيابةً عن الموظف على جانب الموظف برضه — حتى لو معاه «عرض كل الطلبات»، أو خطوة السلسلة عليه هو (الطلب مابيسجّلش مين قدّمه
  // لنفسه ومين نيابةً، فالحساب اللي قدّم مابيشوفش الداخلي في الحالتين)
  for (const [creator, staff, target, owner] of [[users.proxy, false, emps.worker, users.worker], [users.proxyAll, false, emps.worker, users.worker], [users.leadProxy, false, emps.junior, users.junior]]) {
    const made = expectStatus(await request(creator, 'POST', '/requests', { typeCode: types.plain.code, payload: { reason: 'نيابة عن الموظف' }, submit: true, onBehalfEmployeeId: target.id }), 201)
    assert.deepEqual([made.requesterId, made.createdByUserId], [target.id, creator.id])
    const open = await said(creator, 'requests', made.id, 'تعليق اللي قدّم')
    const secret = await said(users.consoleA, 'requests', made.id, { body: 'داخلي على طلب بالنيابة', internal: true })
    const view = await shown(creator, 'requests', made.id)
    assert.deepEqual([view.comments.map(row => row.id), view.canInternal], staff ? [[open.id, secret.id], true] : [[open.id], false], creator.email)
    assert.equal((await comment(creator, 'requests', made.id, { body: 'محاولة داخلي', internal: true })).status, staff ? 201 : 400, creator.email)
    assert.deepEqual((await shown(owner, 'requests', made.id)).comments.map(row => row.id), [open.id])
  }
  // وزميل اللي قدّم (نفس الصلاحية، ومش هو اللي قدّم) بيشوف الداخلي عادي
  const byOther = expectStatus(await request(users.proxyAll, 'POST', '/requests', { typeCode: types.plain.code, payload: { reason: 'نيابة' }, submit: true, onBehalfEmployeeId: emps.worker.id }), 201)
  const note = await said(users.manager, 'requests', byOther.id, { body: 'داخلي', internal: true })
  assert.deepEqual([(await shown(users.consoleA, 'requests', byOther.id)).comments.map(row => row.id), (await shown(users.proxyAll, 'requests', byOther.id)).comments.map(row => row.id)], [[note.id], []])
  // رفض استلام العهدة: المستلم بيكتب سطر في سجل الطلب (خطوة 0) فيبقى طرف فيه ويقراه (من قبل الدفعة). هو موظف مستلم مش جهة اعتماد:
  // بيقرا الظاهر ويكتب فيه، والداخلي مابيرجعلوش ومايكتبوش
  const handover = await submit(users.worker, types.plain)
  const inside = await said(users.manager, 'requests', handover.id, { body: 'داخلي عن النقل', internal: true })
  const outside = await said(users.manager, 'requests', handover.id, 'ظاهر للأطراف')
  const asset = await repo('Asset').save({ name: 'جهاز للاختبار', category: 'IT', status: 'AVAILABLE' })
  const pending = await repo('CustodyAssignment').save({ assetId: asset.id, employeeId: emps.other.id, status: 'PENDING_ACK', requestId: handover.id })
  assert.deepEqual(answer(await thread(users.other, 'requests', handover.id)), [403, 'لا تملك صلاحية عرض هذا الطلب'])
  expectStatus(await request(users.other, 'POST', `/requests/custody/${pending.id}/reject`, { reason: 'مش عهدتي' }), 201)
  assert.deepEqual(await query('SELECT [step], [approverId], [action] FROM [request_approvals] WHERE [requestId] = @0', [handover.id]), [{ step: 0, approverId: users.other.id, action: 'REJECTED' }])
  const peer = await shown(users.other, 'requests', handover.id)
  assert.deepEqual([peer.comments.map(row => row.id), peer.canInternal], [[outside.id], false])
  assert.deepEqual(answer(await comment(users.other, 'requests', handover.id, { body: 'داخلي من المستلم', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'])
  assert.deepEqual(answer(await comment(users.other, 'requests', handover.id, { body: 'نص', replyTo: [inside.id] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  await said(users.other, 'requests', handover.id, 'ماكانتش عهدتي')
  // والسطر ده مابيغيّرش جانب قارئ تاني. ومعتمد في السلسلة رفض الاستلام بعدها (سطر قرار في خطوة 1 وسطر رفض في «خطوة 0»)، ومنفّذ طلب
  // من غير خطوات (سطر تنفيذ في «خطوة 0» من غير رفض): الاتنين جهة اعتماد، بيشوفوا الداخلي ويكتبوه
  assert.deepEqual([(await shown(users.manager, 'requests', handover.id)).comments.length, (await shown(users.manager, 'requests', handover.id)).canInternal], [3, true])
  const logRow = (account, step, action) => query(`INSERT INTO [request_approvals] ([requestId], [step], [approverId], [action], [comment]) VALUES (@0, @1, @2, @3, N'سطر للاختبار')`, [handover.id, step, account.id, action])
  await logRow(users.hrA, 1, 'APPROVED')
  await logRow(users.hrA, 0, 'REJECTED')
  await logRow(users.itA, 0, 'EXECUTED')
  for (const staff of [users.hrA, users.itA]) {
    const view = await shown(staff, 'requests', handover.id)
    assert.deepEqual([view.comments.length, view.canInternal], [3, true], staff.email)
  }
  // حساب صاحب طلب اتقدّم له نيابةً، ومعاه «عرض كل الطلبات»، ربطه اتغيّر من شاشة الحسابات (اتفك، وبعدها اتربط بموظف تاني): الربط القديم
  // بيتسجّل قبل ما يتغيّر، فالحساب لسه على جانب الموظف في طلبات الموظف ده (Codex CRP2P-B03)
  const behalf = expectStatus(await request(users.proxy, 'POST', '/requests', { typeCode: types.plain.code, payload: { reason: 'نيابة عن موظف الموارد البشرية' }, submit: true, onBehalfEmployeeId: emps.hrPerson.id }), 201)
  const hush = await said(users.manager, 'requests', behalf.id, { body: 'داخلي عن طلب اتقدّم نيابةً', internal: true })
  assert.deepEqual([(await shown(powerful, 'requests', behalf.id)).comments.map(row => row.id), (await shown(users.consoleA, 'requests', behalf.id)).comments.map(row => row.id)], [[], [hush.id]])
  const spare = await employee()
  try {
    let version = 0
    for (const employeeId of [null, spare.id]) {
      expectStatus(await request(users.admin, 'PATCH', `/users/${users.hrA.id}`, { employeeId }), 200)
      const changed = { ...powerful, employeeId, tokenVersion: ++version }
      const view = await shown(changed, 'requests', behalf.id)
      assert.deepEqual([view.comments.map(row => row.id), view.canInternal], [[], false], String(employeeId))
      assert.deepEqual(answer(await comment(changed, 'requests', behalf.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي لغير صاحب الطلب'], String(employeeId))
      // والربط القديم بيخص طلبات الموظف القديم وحسابه هو بس: طلب موظف تاني بيتقري بداخليه، وقارئ تاني بيقرا داخلي الطلب ده
      assert.deepEqual([(await shown(changed, 'requests', req.id)).comments.some(row => row.id === inner.id), (await shown(users.consoleA, 'requests', behalf.id)).comments.map(row => row.id)],
        [true, [hush.id]], String(employeeId))
    }
    // والسطر داخلي (فيه رقم حساب): متسجّل مرة واحدة على الموظف القديم، ومابيرجعش في سجل الموظف
    const history = expectStatus(await request(users.admin, 'GET', `/employees/${emps.hrPerson.id}/history`), 200)
    assert.deepEqual([history.some(row => row.fieldName === 'loginAccount'),
      await query(`SELECT [oldValue], [changedByUserId] FROM [employee_status_history] WHERE [employeeId] = @0 AND [fieldName] = N'loginAccount'`, [emps.hrPerson.id])],
    [false, [{ oldValue: String(users.hrA.id), changedByUserId: users.admin.id }]])
  } finally { await repo('User').update({ id: users.hrA.id }, { employeeId: emps.hrPerson.id, tokenVersion: 0 }) }
})

test('CM-04: الطلب السري — حواره لأطرافه بس، وغيرهم 403 من غير أي أثر', async () => {
  const req = await submit(users.worker, types.secret)
  const first = await said(users.worker, 'requests', req.id, { body: 'تفاصيل البلاغ الحساس', targets: ['CURRENT_APPROVERS'] })
  const reply = await said(users.manager, 'requests', req.id, { body: 'وصل', targets: ['REQUESTER'] })
  for (const user of [users.worker, users.manager]) assert.deepEqual((await shown(user, 'requests', req.id)).comments.map(row => row.id), [first.id, reply.id], user.email)
  // «عرض كل الطلبات» بيشوف الطلب محجوب، ومالوش حواره — قراءةً وكتابةً، ومن غير عدّ
  assert.equal(expectStatus(await request(users.consoleA, 'GET', `/requests/${req.id}`), 200).confidentialMasked, true)
  for (const [user, message] of [[users.consoleA, 'حوار الطلب السري لأطرافه بس'], [users.hrA, 'لا تملك صلاحية عرض هذا الطلب']]) {
    const read = await thread(user, 'requests', req.id)
    assert.deepEqual(answer(read), [403, message], user.email)
    assert.equal(JSON.stringify(read.body).includes('البلاغ'), false)
    assert.deepEqual(answer(await comment(user, 'requests', req.id, 'محاولة')), [403, message], user.email)
  }
  assert.deepEqual(answer(await thread(users.consoleB, 'requests', req.id)), [404, 'الطلب غير موجود'])
  assert.equal((await rowsOf('request', req.id)).length, 2)
})

test('CM-05: اسم الكاتب — للأطراف، ولغير الطرف لو فرع الكاتب دلوقتي في نطاقه؛ وبموظف الحساب وقت الكتابة؛ ومن غير أرقام', async () => {
  const req = await submit(users.worker, types.far)
  expectStatus(await act(users.manager, req.id), 201)
  const asked = await said(users.worker, 'requests', req.id, 'سؤال')
  const local = await said(users.manager, 'requests', req.id, 'رد المدير')
  const remote = await said(users.far, 'requests', req.id, 'رد المعتمد من الفرع التاني')
  const system = await said(users.admin, 'requests', req.id, 'تعليق حساب من غير موظف')
  const names = async user => (await shown(user, 'requests', req.id)).comments.map(row => row.author.name)
  // الأطراف (صاحب الطلب والمعتمدين): كل الأسماء، واللي مالوش موظف باسم حسابه
  for (const user of [users.worker, users.manager, users.far]) {
    assert.deepEqual(await names(user), [emps.worker.fullName, emps.manager.fullName, emps.far.fullName, users.admin.displayName], user.email)
  }
  // «عرض كل الطلبات» في فرع الطلب (مش طرف): صاحب الطلب واللي فرعه في نطاقه بس
  assert.deepEqual(await names(users.consoleA), [emps.worker.fullName, emps.manager.fullName, null, null])
  const raw = JSON.stringify(await shown(users.consoleA, 'requests', req.id))
  assert.equal(raw.includes(emps.far.fullName) || raw.includes(users.admin.displayName) || raw.includes(emps.far.employeeCode), false)
  // مفيش رقم حساب ولا رقم موظف في الرد لأي قارئ
  for (const user of [users.worker, users.consoleA]) {
    const keys = new Set()
    JSON.stringify(await shown(user, 'requests', req.id), (key, value) => { keys.add(key); return value })
    assert.deepEqual([...keys].filter(key => /user|employee/i.test(key)), [], user.email)
  }
  // ومفيش رقم تعليق في الرد: مرجع مايتخمّنش منه الرقم ولا الترتيب
  const plainView = expectStatus(await thread(users.worker, 'requests', req.id), 200)
  assert.deepEqual([...new Set(plainView.comments.flatMap(row => Object.keys(row)))].sort(), ['author', 'body', 'createdAt', 'files', 'internal', 'mentions', 'mine', 'ref'])
  assert.ok(plainView.comments.every(row => /^[a-f0-9]{20}$/.test(row.ref)))
  assert.equal(new Set(plainView.comments.map(row => row.ref)).size, plainView.comments.length)
  try {
    // الكاتب اتنقل لفرع القارئ: اسمه بيظهر. والمدير اتنقل برّه: اسمه بيتحجب (الحكم بالفرع دلوقتي)
    await repo('Employee').update({ id: emps.far.id }, { branchId: org.branchA.id })
    await repo('Employee').update({ id: emps.manager.id }, { branchId: org.branchB.id })
    assert.deepEqual(await names(users.consoleA), [emps.worker.fullName, null, emps.far.fullName, null])
    // صاحب الطلب نفسه اتنقل برّه: اسمه لسه ظاهر (على كارت الطلب نفسه)
    await repo('Employee').update({ id: emps.worker.id }, { branchId: org.branchB.id })
    assert.equal((await names(users.consoleA))[0], emps.worker.fullName)
  } finally {
    await repo('Employee').update({ id: emps.far.id }, { branchId: org.branchB.id })
    await repo('Employee').update({ id: In([emps.manager.id, emps.worker.id]) }, { branchId: org.branchA.id })
  }
  try {
    // حساب الكاتب اتربط بموظف تاني بعدها: التعليق لسه باسم موظفه وقت الكتابة
    await repo('User').update({ id: users.manager.id }, { employeeId: emps.other.id })
    assert.equal((await names(users.worker))[1], emps.manager.fullName)
    assert.equal((await names(users.consoleA))[1], emps.manager.fullName)
  } finally { await repo('User').update({ id: users.manager.id }, { employeeId: emps.manager.id }) }
  assert.deepEqual([asked.id, local.id, remote.id, system.id].every(Number.isSafeInteger), true)
})

test('CM-06: المهام — حوار لكل اللي يشوف المهمة العادية ومن غير «داخلي»؛ ومهمة تنفيذ طلب ومهمة إقرار مستند مالهمش حوار', async () => {
  const task = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'تجهيز ملف', assigneeEmployeeId: emps.worker.id }), 201)
  assert.deepEqual(await shown(users.worker, 'tasks', task.id), { available: true, comments: [], targets: [{ key: 'CREATOR', label: 'اللي كلّف بالمهمة' }], canInternal: false, truncated: false })
  const asked = await said(users.worker, 'tasks', task.id, { body: 'الملف المطلوب أنهي؟', targets: ['CREATOR'] })
  assert.deepEqual([asked.author, asked.mentions.targets], [{ name: emps.worker.fullName, subject: false }, [{ key: 'CREATOR', label: 'اللي كلّف بالمهمة' }]])
  let view = await shown(users.tasksAdmin, 'tasks', task.id)
  assert.deepEqual([view.targets.map(row => row.key), view.canInternal, view.comments.map(row => [row.id, row.mine, row.author.name])], [['ASSIGNEE'], false, [[asked.id, false, emps.worker.fullName]]])
  const reply = await said(users.tasksAdmin, 'tasks', task.id, { body: 'ملف التأمين', targets: ['ASSIGNEE'], replyTo: [asked.id] })
  // كل اللي يشوف المهمة بيشوف الحوار بالأسماء: مسؤولها، ومديره، و«عرض كل المهام» في فرعها
  for (const user of [users.worker, users.manager, users.viewer]) {
    view = await shown(user, 'tasks', task.id)
    assert.deepEqual(view.comments.map(row => [row.id, row.author.name]), [[asked.id, emps.worker.fullName], [reply.id, users.tasksAdmin.displayName]], user.email)
  }
  // المدير المباشر (مش مسؤولها ولا اللي كلّف بيها): يشاور للاتنين
  assert.deepEqual((await shown(users.manager, 'tasks', task.id)).targets.map(row => row.key), ['ASSIGNEE', 'CREATOR'])
  // من غير «داخلي»، وإشارات الطلب مش هنا
  assert.deepEqual(answer(await comment(users.tasksAdmin, 'tasks', task.id, { body: 'نص', internal: true })), [400, 'التعليق الداخلي على الطلبات بس'])
  assert.deepEqual(answer(await comment(users.tasksAdmin, 'tasks', task.id, { body: 'نص', targets: ['REQUESTER'] })), [400, 'إشارة غير معروفة على الموضوع ده'])
  assert.deepEqual(answer(await comment(users.worker, 'tasks', task.id, { body: 'نص', targets: ['ASSIGNEE'] })), [400, 'الإشارة دي مش متاحة على التعليق ده'])
  // اللي مايشوفش المهمة = «غير موجودة»، زي الرقم الغلط
  for (const [user, id] of [[users.other, task.id], [users.outsider, task.id], [users.worker, task.id + 9000], [users.worker, 2147483648]]) {
    assert.deepEqual(answer(await thread(user, 'tasks', id)), [404, 'المهمة غير موجودة'], user.email)
    assert.deepEqual(answer(await comment(user, 'tasks', id, 'محاولة')), [404, 'المهمة غير موجودة'], user.email)
  }
  // تعليق طلب مايتردّش عليه من حوار مهمة بنفس الرقم ولا العكس
  assert.deepEqual(answer(await comment(users.worker, 'requests', (await submit(users.worker, types.plain)).id, { body: 'نص', replyTo: [asked.id] })), [400, 'تعليق مردود عليه مش موجود في الحوار ده'])
  // مهمة تنفيذ طلب: مالهاش حوار (اللي يشوفها 400 برسالتها، واللي مايشوفهاش 404)
  const device = await submit(users.worker, types.device)
  expectStatus(await act(users.manager, device.id), 201)
  const [{ executionTaskId }] = await query('SELECT [executionTaskId] FROM [requests] WHERE [id] = @0', [device.id])
  assert.ok(executionTaskId)
  const LINKED = 'المهمة دي تبع طلب أو مستند — مفيش تعليقات عليها من هنا'
  for (const user of [users.itA, users.viewer]) {
    assert.deepEqual(answer(await thread(user, 'tasks', executionTaskId)), [400, LINKED], user.email)
    assert.deepEqual(answer(await comment(user, 'tasks', executionTaskId, 'محاولة')), [400, LINKED], user.email)
  }
  assert.deepEqual(answer(await thread(users.outsider, 'tasks', executionTaskId)), [404, 'المهمة غير موجودة'])
  // وحوار الطلب نفسه مفتوح للمنفّذ (طرف فيه)
  await said(users.itA, 'requests', device.id, { body: 'الجهاز جاهز بكرة', targets: ['REQUESTER'] })
  // مهمة إقرار مستند (ربطها على المستند): مالهاش حوار
  const ack = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'إقرار مستند', assigneeEmployeeId: emps.worker.id }), 201)
  await said(users.worker, 'tasks', ack.id, 'قبل الربط: مهمة عادية')
  await query(`INSERT INTO [hr_issued_documents] ([reference], [templateId], [revisionId], [fileId], [templateName], [category], [isFinancial], [issuedByUserId], [idempotencyKey], [inputHash], [snapshot], [ackTaskId])
    VALUES (N'CM-DOC-1', 1, 1, 990001, N'مستند للاختبار', N'ACKNOWLEDGEMENT', 0, @0, @1, @2, N'{}', @3)`, [users.tasksAdmin.id, crypto.randomUUID(), 'a'.repeat(64), ack.id])
  assert.deepEqual(answer(await thread(users.worker, 'tasks', ack.id)), [400, LINKED])
  assert.deepEqual(answer(await comment(users.worker, 'tasks', ack.id, 'محاولة')), [400, LINKED])
  assert.equal((await rowsOf('task', executionTaskId)).length + (await rowsOf('task', ack.id)).length, 1)
})

test('CM-07: الإشعار — للدور المشار له وكاتب التعليق المردود عليه اللي يقروا التعليق، ومن غير محتوى، وبيتحكم تاني وقت الإرسال', async () => {
  const mailTo = user => mailbox.sent.filter(message => message.to === user.email)
  await drain()
  mailbox.sent.length = 0
  const req = await submit(users.worker, types.plain)
  await drain()
  mailbox.sent.length = 0
  const asked = await said(users.worker, 'requests', req.id, { body: 'سر صغير في نص السؤال', targets: ['CURRENT_APPROVERS'] })
  assert.equal(await mentionEvents(asked.id), 1)
  await drain()
  // المعتمد الحالي اتبلّغ جوه النظام وبالبريد، والكاتب لأ؛ والنص من غير محتوى
  assert.deepEqual(await notificationsOf(asked.id), [{ recipientUserId: users.manager.id, eventCode: 'comment.mentioned', category: 'comment', inApp: true,
    title: 'إشارة لك في تعليق', body: 'على طلب', link: `/requests?request=${req.id}` }])
  assert.deepEqual([mailTo(users.manager).length, mailTo(users.worker).length], [1, 0])
  const mail = JSON.stringify(mailTo(users.manager)[0])
  assert.equal(mail.includes(`${FRONTEND}/requests?request=${req.id}`), true)
  for (const leaked of ['سر صغير', emps.worker.fullName, types.plain.nameAr]) assert.equal(mail.includes(leaked), false, leaked)
  // وفي قايمة إشعاراته بلينك يفتح الطلب نفسه
  const listed = expectStatus(await request(users.manager, 'GET', '/notifications'), 200).find(item => item.title === 'إشارة لك في تعليق')
  assert.deepEqual([listed.link, listed.category, listed.body], [`/requests?request=${req.id}`, 'comment', 'على طلب'])
  // والإشعار ولينكه (فيه رقم الطلب) بيظهروا طول ما الحساب لسه يقرا التعليق بهويته دلوقتي: حساب اتربط بموظف فرع تاني مابقاش يشوف الطلب
  // ولا إشعاره، ولما يرجع يرجعوا (Codex CRP2P-B02)
  const mentionsOf = async user => expectStatus(await request(user, 'GET', '/notifications'), 200).filter(item => item.title === 'إشارة لك في تعليق').length
  const mentions = await mentionsOf(users.manager)
  assert.ok(mentions >= 1)
  try {
    await repo('User').update({ id: users.manager.id }, { employeeId: emps.far.id, branchId: org.branchB.id })
    const moved = { ...users.manager, employeeId: emps.far.id, branchId: org.branchB.id }
    assert.deepEqual([answer(await thread(moved, 'requests', req.id)), await mentionsOf(moved)], [[404, 'الطلب غير موجود'], 0])
  } finally { await repo('User').update({ id: users.manager.id }, { employeeId: emps.manager.id, branchId: org.branchA.id }) }
  assert.equal(await mentionsOf(users.manager), mentions)
  // وإشعارات محجوبة أحدث مابتزاحمش إشعار مسموح أقدم برّه القايمة: الحكم قبل الحد، صفحة ورا صفحة (Codex CRP2Q-N01)
  const hiddenThread = await submit(users.other, types.hr)
  const [hiddenComment] = await query(`INSERT INTO [comments] ([entityType], [entityId], [authorUserId], [authorEmployeeId], [body], [internal], [mentions], [createdAt])
    OUTPUT INSERTED.[id] VALUES (N'request', @0, @1, @2, N'تعليق على طلب مش ظاهر للمعتمد', 0, NULL, SYSUTCDATETIME())`, [hiddenThread.id, users.other.id, emps.other.id])
  assert.deepEqual(answer(await thread(users.manager, 'requests', hiddenThread.id)), [403, 'لا تملك صلاحية عرض هذا الطلب'])
  const mentionRow = (recipient, commentId, requestId, key) => query(`INSERT INTO [notifications] ([recipientUserId], [eventCode], [category], [kind], [title], [body], [link], [entityType], [entityId], [inApp], [dedupeKey], [createdAt])
    SELECT TOP (@4) @0, N'comment.mentioned', N'comment', N'info', N'إشارة لك في تعليق', N'على طلب', @1, N'comment', CAST(@2 AS nvarchar(30)), 1,
      @3 + CAST(ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS nvarchar(10)), SYSUTCDATETIME() FROM sys.all_objects`, [recipient.id, `/requests?request=${requestId}`, commentId, key, key.startsWith('cm07-hidden') ? 70 : 1])
  try {
    await mentionRow(users.manager, hiddenComment.id, hiddenThread.id, 'cm07-hidden:')
    assert.equal(await mentionsOf(users.manager), mentions, 'المسموح لسه ظاهر ورا 70 صف محجوب')
    // والحكم لكل تعليق بنوعه: إشعارين لصاحب الطلب على نفس الطلب، واحد على تعليق ظاهر وواحد على داخلي — الظاهر بس
    const inside = await said(users.manager, 'requests', req.id, { body: 'داخلي على نفس الطلب', internal: true })
    const mine = await mentionsOf(users.worker)
    await mentionRow(users.worker, asked.id, req.id, 'cm07-visible:')
    await mentionRow(users.worker, inside.id, req.id, 'cm07-inside:')
    assert.equal(await mentionsOf(users.worker), mine + 1)
  } finally { await query(`DELETE FROM [notifications] WHERE [dedupeKey] LIKE N'cm07-%'`) }
  // رد المعتمد: صاحب الطلب مشار له بالدور وبالرد — إشعار واحد
  mailbox.sent.length = 0
  const answered = await said(users.manager, 'requests', req.id, { body: 'رد', targets: ['REQUESTER'], replyTo: [asked.id] })
  await drain()
  assert.deepEqual((await notificationsOf(answered.id)).map(row => row.recipientUserId), [users.worker.id])
  assert.equal(mailTo(users.worker).length, 1)
  // المعتمد الحالي بيشاور للمعتمد الحالي: هو نفسه مابيتبعتلوش
  const self = await said(users.manager, 'requests', req.id, { body: 'للمعتمد الحالي', targets: ['CURRENT_APPROVERS'] })
  await drain()
  assert.deepEqual(await notificationsOf(self.id), [])
  // داخلي بيرد على تعليق صاحب الطلب: صاحب الطلب مايتبلّغش (مايقراهوش)
  const inner = await said(users.manager, 'requests', req.id, { body: 'داخلي', internal: true, replyTo: [asked.id] })
  assert.equal(await mentionEvents(inner.id), 1)
  await drain()
  assert.deepEqual(await notificationsOf(inner.id), [])
  // من غير إشارة: مفيش حدث
  assert.equal(await mentionEvents((await said(users.manager, 'requests', req.id, 'من غير إشارة')).id), 0)
  // الرد على تعليق: كاتبه بس (حتى لو مش دور في الموضوع)، ومرة واحدة لو اترد على تعليقين ليه
  const note = await said(users.consoleA, 'requests', req.id, 'ملاحظة اللوحة')
  const note2 = await said(users.consoleA, 'requests', req.id, 'ملاحظة تانية')
  const back = await said(users.worker, 'requests', req.id, { body: 'شكرًا', replyTo: [note.id, note2.id] })
  await drain()
  assert.deepEqual((await notificationsOf(back.id)).map(row => row.recipientUserId), [users.consoleA.id])
  // وبريده اتبعت: كاتب التعليق المردود عليه لسه مقصود وقت الإرسال
  assert.deepEqual((await deliveriesOf(back.id)).map(row => row.status), ['SENT'])
  // الطلب اتحسم قبل ما مهمة التوزيع تشتغل: مفيش «معتمد حالي»
  const late = await said(users.worker, 'requests', req.id, { body: 'لسه؟', targets: ['CURRENT_APPROVERS'] })
  expectStatus(await act(users.manager, req.id), 201)
  await drain()
  assert.deepEqual(await notificationsOf(late.id), [])
  // خطوة على دور وظيفي: نفس الحسابات اللي اتبلّغت إن الطلب مستنيها (حامل الدور في فرع الطلب، مش اللي في فرع تاني)
  const onRole = await submit(users.worker, types.hr)
  await drain()
  const awaited = (await query(`SELECT [recipientUserId] FROM [notifications] WHERE [entityType] = N'request' AND [entityId] = @0 AND [eventCode] = N'request.pending_approval'
    ORDER BY [recipientUserId]`, [String(onRole.id)])).map(row => row.recipientUserId)
  assert.deepEqual(awaited, [users.hrA.id])
  const toRole = await said(users.worker, 'requests', onRole.id, { body: 'سؤال للموارد البشرية', targets: ['CURRENT_APPROVERS'] })
  await drain()
  assert.deepEqual((await notificationsOf(toRole.id)).map(row => row.recipientUserId), awaited)
  // المهام: اللي كلّف بيها، ومسؤولها — بلينك «مهامي»
  const task = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة بحوار', assigneeEmployeeId: emps.worker.id }), 201)
  const toCreator = await said(users.worker, 'tasks', task.id, { body: 'سؤال', targets: ['CREATOR'] })
  const toAssignee = await said(users.tasksAdmin, 'tasks', task.id, { body: 'رد', targets: ['ASSIGNEE'] })
  await drain()
  assert.deepEqual(await notificationsOf(toCreator.id), [{ recipientUserId: users.tasksAdmin.id, eventCode: 'comment.mentioned', category: 'comment', inApp: true,
    title: 'إشارة لك في تعليق', body: 'على مهمة', link: `/my/tasks?task=${task.id}` }])
  assert.deepEqual((await notificationsOf(toAssignee.id)).map(row => row.recipientUserId), [users.worker.id])
  assert.deepEqual([(await deliveriesOf(toCreator.id)).map(row => row.status), (await deliveriesOf(toAssignee.id)).map(row => row.status)], [['SENT'], ['SENT']])
  // وقت الإرسال: الرسالة اتأجلت (ساعات الهدوء) والمستلم مابقاش يقرا التعليق (حسابه اتربط بموظف تاني) = مابتتبعتش
  const open = await submit(users.worker, types.plain)
  await drain()
  const clock = offset => { const date = new Date(Date.now() + offset * 60_000); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }
  mailbox.sent.length = 0
  const seen = await said(users.consoleA, 'requests', open.id, 'ملاحظة اللوحة قبل الهدوء')
  const twoStep = await submit(users.worker, types.far)
  await drain()
  mailbox.sent.length = 0
  await setting('notifications.quiet_hours', `${clock(-60)}-${clock(120)}`)
  const deferred = await said(users.manager, 'requests', open.id, { body: 'رد متأجل', targets: ['REQUESTER'] })
  const kept = await said(users.manager, 'requests', open.id, { body: 'رد متأجل تاني', targets: ['REQUESTER'] })
  const lost = await said(users.worker, 'requests', open.id, { body: 'رد على اللوحة', replyTo: [seen.id] })
  const moved = await said(users.worker, 'requests', open.id, { body: 'سؤال للمعتمد قبل ما يحسم', targets: ['CURRENT_APPROVERS'] })
  const passed = await said(users.worker, 'requests', twoStep.id, { body: 'سؤال لمعتمد الخطوة الأولى', targets: ['CURRENT_APPROVERS'] })
  await drain()
  assert.deepEqual((await deliveriesOf(passed.id)).map(row => row.status), ['PENDING'])
  assert.deepEqual([(await deliveriesOf(deferred.id)).map(row => row.status), (await deliveriesOf(lost.id)).map(row => row.status), (await deliveriesOf(moved.id)).map(row => row.status), mailbox.sent.length],
    [['PENDING'], ['PENDING'], ['PENDING'], 0])
  const due = id => query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'
    AND JSON_VALUE([payload], '$.deliveryId') IN (SELECT CAST(d.[id] AS nvarchar(20)) FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId] WHERE n.[entityId] = @0 AND n.[entityType] = N'comment')`, [String(id)])
  try {
    await repo('User').update({ id: users.worker.id }, { employeeId: emps.other.id })
    await repo('User').update({ id: users.consoleA.id }, { permissions: '[]' })
    await setting('notifications.quiet_hours', '')
    // والطلب اتحسم قبل الإرسال: معتمده مابقاش «المعتمد الحالي»
    expectStatus(await act(users.manager, open.id), 201)
    // وطلب بخطوتين: الأولى اتعتمدت والطلب لسه قيد المراجعة على معتمد تاني — معتمد الأولى مابقاش «المعتمد الحالي»
    expectStatus(await act(users.manager, twoStep.id), 201)
    assert.equal((await query('SELECT [status] FROM [requests] WHERE [id] = @0', [twoStep.id]))[0].status, 'UNDER_REVIEW')
    await due(deferred.id)
    await due(lost.id)
    await due(moved.id)
    await due(passed.id)
    await drain()
    assert.deepEqual((await deliveriesOf(moved.id)).map(row => [row.status, row.detail]), [['SKIPPED', 'الحساب مابقاش في الدور اللي اتشاور له']])
    assert.deepEqual((await deliveriesOf(passed.id)).map(row => [row.status, row.detail]), [['SKIPPED', 'الحساب مابقاش في الدور اللي اتشاور له']])
    assert.deepEqual((await deliveriesOf(deferred.id)).map(row => [row.status, row.detail]), [['SKIPPED', 'الحساب مابقاش في الدور اللي اتشاور له']])
    assert.deepEqual((await deliveriesOf(lost.id)).map(row => [row.status, row.detail]), [['SKIPPED', 'التعليق مابقاش ظاهر للحساب ده']])
    // ولا رسالة إشارة طلعت (بريد «طلب بانتظار اعتمادك» لمعتمد الخطوة التانية حاجة تانية)
    assert.equal(mailbox.sent.filter(message => /إشارة لك في تعليق/.test(JSON.stringify(message))).length, 0)
  } finally {
    await repo('User').update({ id: users.worker.id }, { employeeId: emps.worker.id })
    await repo('User').update({ id: users.consoleA.id }, { permissions: JSON.stringify(['requests.view_all']) })
    await setting('notifications.quiet_hours', '')
  }
  // واللي لسه يقراه بتوصله
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.deepEqual([(await deliveriesOf(kept.id)).map(row => row.status), mailTo(users.worker).length], [['SENT'], 1])
  // الفئة في التفضيلات، وقفل بريدها وقفل ظهورها جوه النظام
  const preferences = expectStatus(await request(users.worker, 'GET', '/notifications/preferences'), 200)
  assert.equal(preferences.categories.find(row => row.key === 'comment').label, 'التعليقات والإشارات')
  expectStatus(await request(users.worker, 'PATCH', '/notifications/preferences', { category: 'comment', channel: 'EMAIL', mode: 'OFF' }), 200)
  expectStatus(await request(users.worker, 'PATCH', '/notifications/preferences', { category: 'comment', channel: 'IN_APP', mode: 'OFF' }), 200)
  const muted = await said(users.manager, 'requests', open.id, { body: 'رد والفئة مقفولة', targets: ['REQUESTER'] })
  await drain()
  assert.deepEqual([(await notificationsOf(muted.id)).map(row => row.inApp), (await deliveriesOf(muted.id)).map(row => [row.status, row.detail])], [[false], [['SKIPPED', 'المستخدم قافل بريد الفئة دي']]])
})

test('CM-08: المرفقات — بتترفع بتصنيف «تعليق» من غير رقم، وبتتربط مرة واحدة برافعها، وقراءتها بحكم التعليق', async () => {
  const req = await submit(users.worker, types.plain)
  // العميل مايحددش رقم كيان ولا موظف لمرفق التعليق
  for (const search of ['entityType=comment&entityId=7001', `entityType=comment&employeeId=${emps.worker.id}`]) {
    assert.deepEqual(answer(await upload(users.worker, search)), [400, 'مرفق التعليق بيترفع من غير رقم كيان أو موظف'], search)
  }
  const file = await uploaded(users.worker)
  // قبل الربط: لرافعه بس
  assert.deepEqual([await download(users.worker, file), await download(users.manager, file)], [[200, ''], [404, 'الملف غير موجود']])
  const asked = await said(users.worker, 'requests', req.id, { body: 'مرفق', fileIds: [file, file] })
  assert.deepEqual(asked.files, [{ id: file, name: 'note.png', size: png().length }])
  assert.deepEqual((await shown(users.manager, 'requests', req.id)).comments[0].files, [{ id: file, name: 'note.png', size: png().length }])
  // ملف بتصنيف تاني متسجّل عليه نفس الرقم (رقم كيان من نوع تاني) مش من مرفقات التعليق
  const stray = await uploaded(users.worker, 'entityType=task')
  await repo('StoredFile').update({ id: stray }, { entityId: asked.id })
  assert.deepEqual((await shown(users.manager, 'requests', req.id)).comments[0].files.map(row => row.id), [file])
  // بعد الربط: كل اللي يقرا التعليق، واللي مايقراش الطلب زي الملف الغايب
  assert.deepEqual([await download(users.manager, file), await download(users.consoleA, file), await download(users.other, file), await download(users.outsider, file), await download(users.consoleB, file)],
    [[200, ''], [200, ''], [404, 'الملف غير موجود'], [404, 'الملف غير موجود'], [404, 'الملف غير موجود']])
  // مرفق اتربط مايتربطش تاني، ومرفق حد تاني أو بتصنيف تاني أو رقم غلط مرفوض — ومن غير تعليق
  const theirs = await uploaded(users.manager), proof = await uploaded(users.worker, 'entityType=task')
  const rows = (await rowsOf('request', req.id)).length
  for (const fileIds of [[file], [theirs], [proof], [file + 9000]]) {
    assert.deepEqual(answer(await comment(users.worker, 'requests', req.id, { body: 'مرفق غلط', fileIds })), [400, 'مرفق غير صالح — ارفعه من خانة التعليق نفسها'], String(fileIds))
  }
  assert.equal((await rowsOf('request', req.id)).length, rows)
  // مرفق تعليق داخلي: مش لصاحب الطلب
  const inner = await said(users.manager, 'requests', req.id, { body: 'داخلي بمرفق', internal: true, fileIds: [theirs] })
  assert.deepEqual([await download(users.worker, theirs), await download(users.consoleA, theirs), await download(users.manager, theirs)], [[404, 'الملف غير موجود'], [200, ''], [200, '']])
  assert.equal(inner.files.length, 1)
  // والمرفق المربوط حقه حق تعليقه حتى لرافعه: حساب كاتب الداخلي اتربط بصاحب الطلب بعد ما كتب، فالتعليق مابقاش ليه ولا مرفقه؛ ولما
  // يرجع يرجعوا (Codex CRP2P-B01)
  try {
    await repo('User').update({ id: users.manager.id }, { employeeId: emps.worker.id })
    const turned = { ...users.manager, employeeId: emps.worker.id }
    assert.deepEqual([(await shown(turned, 'requests', req.id)).comments.some(row => row.id === inner.id), await download(turned, theirs)], [false, [404, 'الملف غير موجود']])
  } finally { await repo('User').update({ id: users.manager.id }, { employeeId: emps.manager.id }) }
  assert.deepEqual(await download(users.manager, theirs), [200, ''])
  // تلات مرفقات بحدهم
  const three = [await uploaded(users.worker, undefined, 'a.png'), await uploaded(users.worker, undefined, 'b.png'), await uploaded(users.worker, undefined, 'c.png')]
  assert.deepEqual((await said(users.worker, 'requests', req.id, { body: 'تلاتة', fileIds: three })).files.map(row => row.name), ['a.png', 'b.png', 'c.png'])
  // تعليقين بنفس المرفق في نفس اللحظة: واحد بس بياخده، والتاني مرفوض ومن غير تعليق
  const shared = await uploaded(users.worker)
  const count = (await rowsOf('request', req.id)).length
  const both = await releaseTogether(`UPDATE [stored_files] SET [originalName] = [originalName] + N' ' WHERE [id] = @0`, [shared], 2,
    () => Promise.all([comment(users.worker, 'requests', req.id, { body: 'الأول', fileIds: [shared] }), comment(users.worker, 'requests', req.id, { body: 'التاني', fileIds: [shared] })]))
  assert.deepEqual(both.map(response => response.status).sort(), [201, 400], JSON.stringify(both.map(response => response.body)).slice(0, 300))
  assert.equal((await rowsOf('request', req.id)).length, count + 1)
  // مرفق تعليق مهمة: بحكم المهمة
  const task = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة بمرفق', assigneeEmployeeId: emps.worker.id }), 201)
  const taskFile = await uploaded(users.worker)
  await said(users.worker, 'tasks', task.id, { body: 'مرفق المهمة', fileIds: [taskFile] })
  assert.deepEqual([await download(users.tasksAdmin, taskFile), await download(users.viewer, taskFile), await download(users.other, taskFile)], [[200, ''], [200, ''], [404, 'الملف غير موجود']])
})

test('CM-09: التعليق والتغيير في نفس اللحظة — القرار أو التحويل بيستنى التعليق، ومهمة ربطها اتثبّت والتعليق واقف على صفها مابتاخدش تعليق', async () => {
  const blockedNow = async () => Number((await query('SELECT COUNT(*) AS [n] FROM sys.dm_exec_requests WHERE [database_id] = DB_ID() AND [blocking_session_id] <> 0'))[0].n)
  const untilBlocked = async count => {
    for (let waited = 0; waited < 8000; waited += 50) {
      if (await blockedNow() >= count) return
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    assert.fail(`الطلب رقم ${count} ماوقفش`)
  }
  // جدول التعليقات ممسوك: التعليق عدّى فحص حقه وواقف على الكتابة. القرار اللي بعده لازم يستناه (صف الطلب مقفول مع التعليق)، مايعدّيش قبله
  const req = await submit(users.worker, types.plain)
  const [written, decided] = await releaseTogether('SELECT TOP (1) 1 FROM [comments] WITH (TABLOCKX, HOLDLOCK)', [], 2, async () => {
    const first = comment(users.manager, 'requests', req.id, { body: 'تعليق قبل القرار', targets: ['REQUESTER'] })
    await untilBlocked(1)
    const second = act(users.manager, req.id)
    return Promise.all([first, second])
  })
  assert.deepEqual([written.status, decided.status], [201, 201], JSON.stringify([written.body, decided.body]).slice(0, 300))
  assert.equal((await rowsOf('request', req.id)).length, 1)
  // التعليق والقرار مايتقاطعوش على سجل الاعتماد. طلب بخطوتين، وسطر اعتماد خطوته الأولى ممسوك من اتصال تالت: التعليق عدّى صف الطلب وواقف
  // على قراءة السجل، والقرار اللي بعده بيقف على صف الطلب نفسه (التعليق ماسكه بقفل القرار). فالتعليق اللي بدأ الأول بيتحكم الأول:
  // إشارته لـ«المعتمد الحالي» لسه متاحة. بقفل قراءة القرار كان هيعدّي صف الطلب ويكتب سطره ويقف على تحديث الطلب، والتعليق يقف على
  // سطره: الاتنين مستنيين بعض، والتعليق بيتوقّع ويتعاد بعد القرار (الطلب اترجّع ومابقاش له معتمد حالي)، فإشارته بتترفض
  const crossed = await submit(users.worker, types.far)
  expectStatus(await act(users.manager, crossed.id), 201)
  const [earlier] = await query('SELECT [id] FROM [request_approvals] WHERE [requestId] = @0', [crossed.id])
  const [late, ruled] = await releaseTogether(`UPDATE [request_approvals] SET [comment] = N'ممسوك' WHERE [id] = @0`, [earlier.id], 2, async () => {
    const first = comment(users.worker, 'requests', crossed.id, { body: 'تعليق والقرار جاي', targets: ['CURRENT_APPROVERS'] })
    await untilBlocked(1)
    const second = act(users.admin, crossed.id, 'RETURN', 'محتاج مستند')
    return Promise.all([first, second])
  })
  assert.deepEqual([late.status, ruled.status], [201, 201], JSON.stringify([late.body, ruled.body]).slice(0, 300))
  assert.deepEqual([(await rowsOf('request', crossed.id)).map(row => row.mentions), (await query('SELECT [status] FROM [requests] WHERE [id] = @0', [crossed.id]))[0].status],
    [[JSON.stringify({ targets: ['CURRENT_APPROVERS'], replyTo: [] })], 'RETURNED_FOR_INFO'])
  // كاتب مابياخدش صف الطلب الأول (رفض استلام العهدة بيكتب سطره في سجل الطلب وبعدين يحدّث الطلب): التعليق ماسك صف الطلب وواقف على السطر،
  // والكاتب واقف على صف الطلب. القاعدة بتوقّع التعليق (ماكتبش حاجة لسه)، والتعليق بيتعاد لوحده ويتكتب بعد ما الكاتب يخلص
  const tangled = await submit(users.worker, types.plain)
  const writer = ds.createQueryRunner()
  await writer.connect()
  await writer.startTransaction()
  let retried = null
  try {
    await writer.query(`INSERT INTO [request_approvals] ([requestId], [step], [approverId], [action], [comment]) VALUES (@0, 0, @1, N'REJECTED', N'سطر كاتب تاني')`, [tangled.id, users.admin.id])
    retried = comment(users.worker, 'requests', tangled.id, 'تعليق اتقاطع مع كاتب تاني')
    await untilBlocked(1)
    await writer.query('UPDATE [requests] SET [completedAt] = GETDATE() WHERE [id] = @0', [tangled.id])
    await writer.rollbackTransaction()
    assert.equal((await retried).status, 201)
  } finally {
    if (writer.isTransactionActive) await writer.rollbackTransaction()
    await writer.release()
    if (retried) await retried.catch(() => undefined)
  }
  assert.deepEqual([(await rowsOf('request', tangled.id)).length, (await query('SELECT COUNT(*) AS [n] FROM [request_approvals] WHERE [requestId] = @0', [tangled.id]))[0].n], [1, 0])
  // تعديلين على نفس الحساب في نفس اللحظة (Codex CRP2Q-B01): ورا بعض، فكل تعديل بيقرا الربط اللي قبله اتثبّت. جدول سجل الموظف ممسوك من
  // اتصال تالت: الأول قرا الحساب وواقف على تسجيل ربطه القديم، والتاني واقف على قفل الحساب قبل ما يقراه (من غير القفل كان هيقرا نفس
  // الربط القديم ويسجّله تاني). الربط اللي في النص (اللي الأول ثبّته والتاني شاله) متسجّل، والأصلي مرة واحدة
  const linksOf = async employeeId => (await query(`SELECT [oldValue] FROM [employee_status_history] WHERE [employeeId] = @0 AND [fieldName] = N'loginAccount'`, [employeeId])).map(row => row.oldValue)
  const origin = await employee(), left = await employee({ managerEmployeeId: emps.manager.id }), right = await employee({ managerEmployeeId: emps.manager.id })
  const racer = await account('racer', 'employee', ['requests.view_all'], { employeeId: origin.id })
  const patch = body => request(users.admin, 'PATCH', `/users/${racer.id}`, body)
  const HOLD = 'SELECT TOP (1) 1 FROM [employee_status_history] WITH (TABLOCKX, HOLDLOCK)'
  const [first, second] = await releaseTogether(HOLD, [], 2, async () => {
    const one = patch({ employeeId: left.id })
    await untilBlocked(1)
    return Promise.all([one, patch({ employeeId: right.id })])
  })
  assert.deepEqual([first.status, second.status, (await repo('User').findOneByOrFail({ id: racer.id })).employeeId], [200, 200, right.id])
  assert.deepEqual([await linksOf(origin.id), await linksOf(left.id), await linksOf(right.id)], [[String(racer.id)], [String(racer.id)], []])
  // والحساب بهويته الأخيرة مايقراش الداخلي عن طلب الموظف اللي كان مربوط بيه في النص
  const midway = expectStatus(await request(users.proxy, 'POST', '/requests', { typeCode: types.plain.code, payload: { reason: 'نيابة عن موظف النص' }, submit: true, onBehalfEmployeeId: left.id }), 201)
  await said(users.manager, 'requests', midway.id, { body: 'داخلي عن موظف النص', internal: true })
  const settled = await repo('User').findOneByOrFail({ id: racer.id })
  assert.deepEqual([(await shown(settled, 'requests', midway.id)).comments.length, (await shown(settled, 'requests', midway.id)).canInternal], [0, false])
  // وتعديل صلاحيات بس بدأ والربط بيتغيّر مابيرجّعش الربط القديم: بيقرا الحساب بعد ما تغيير الربط اتثبّت
  const [linked, granted] = await releaseTogether(HOLD, [], 2, async () => {
    const one = patch({ employeeId: origin.id })
    await untilBlocked(1)
    return Promise.all([one, patch({ permissions: ['requests.view_all', 'employees.view'] })])
  })
  const after = await repo('User').findOneByOrFail({ id: racer.id })
  assert.deepEqual([linked.status, granted.status, after.employeeId, JSON.parse(after.permissions)], [200, 200, origin.id, ['requests.view_all', 'employees.view']])
  assert.deepEqual(await linksOf(right.id), [String(racer.id)])
  // ونفس الشيء للمهمة: تحويلها لموظف تاني بيستنى تعليق مسؤولها اللي بدأ قبله
  const task = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة بتتحوّل', assigneeEmployeeId: emps.worker.id }), 201)
  const [noted, moved] = await releaseTogether('SELECT TOP (1) 1 FROM [comments] WITH (TABLOCKX, HOLDLOCK)', [], 2, async () => {
    const first = comment(users.worker, 'tasks', task.id, 'تعليق قبل التحويل')
    await untilBlocked(1)
    const second = request(users.tasksAdmin, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.other.id })
    return Promise.all([first, second])
  })
  assert.deepEqual([noted.status, moved.status], [201, 200], JSON.stringify([noted.body, moved.body]).slice(0, 300))
  // وبعد التحويل: المسؤول القديم مابقاش يشوف المهمة ولا يعلّق عليها
  assert.deepEqual(answer(await comment(users.worker, 'tasks', task.id, 'بعد التحويل')), [404, 'المهمة غير موجودة'])
  assert.equal((await rowsOf('task', task.id)).length, 1)
  // مهمة ربطها (بمستند إقرار) اتثبّت والتعليق واقف على صفها: «حاول تاني»، وبعدها مهمة مربوطة من غير حوار
  const loose = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة لسه بتتربط', assigneeEmployeeId: emps.worker.id }), 201)
  await query(`INSERT INTO [hr_issued_documents] ([reference], [templateId], [revisionId], [fileId], [templateName], [category], [isFinancial], [issuedByUserId], [idempotencyKey], [inputHash], [snapshot])
    VALUES (N'CM-DOC-2', 1, 1, 990002, N'مستند للاختبار', N'ACKNOWLEDGEMENT', 0, @0, @1, @2, N'{}')`, [users.tasksAdmin.id, crypto.randomUUID(), 'b'.repeat(64)])
  const link = taskId => query(`UPDATE [hr_issued_documents] SET [ackTaskId] = @0 WHERE [reference] = N'CM-DOC-2'`, [taskId])
  try {
    const [waited] = await releaseTogether(`UPDATE [tasks] SET [title] = [title] + N' ' WHERE [id] = @0`, [loose.id], 1,
      () => Promise.all([comment(users.worker, 'tasks', loose.id, 'تعليق والمهمة بتتربط')]), () => link(loose.id))
    assert.deepEqual(answer(waited), [409, 'المهمة لسه بتتسجّل — حاول تاني بعد لحظة'])
    assert.deepEqual(answer(await comment(users.worker, 'tasks', loose.id, 'محاولة تانية')), [400, 'المهمة دي تبع طلب أو مستند — مفيش تعليقات عليها من هنا'])
    assert.equal((await rowsOf('task', loose.id)).length, 0)
  } finally { await link(null) }
})

test('CM-10: قفل تعديل الحساب مايستنفدش اتصالات القاعدة — نص المخزن بالكتير، والباقي بيستنى دوره من غير اتصال', async () => {
  const { accountEditLocked, accountEditLockLimit, accountEditGateState, ACCOUNT_EDIT_BUSY } = require('../src/auth/account-edit-lock')
  const pool = ds.driver.master.pool, max = pool.max, limit = accountEditLockLimit(ds)
  assert.deepEqual([max, limit, accountEditGateState()], [10, 5, { open: 0, waiting: 0 }])
  const until = async (ready, label) => {
    for (let waited = 0; waited < 8000 && !ready(); waited += 25) await new Promise(resolve => setTimeout(resolve, 25))
    assert.ok(ready(), label)
  }
  // تعديلات لحسابات مختلفة بعدد اتصالات المخزن، وكل معالج واقف قبل أول قراءة للحساب (بعد ما أخد قفله)
  const many = []
  for (let index = 0; index < max; index++) many.push(await account(`pool${index}`, 'employee', []))
  const ids = new Set(many.map(user => user.id)), repository = app.get(require('../src/auth/users.controller').UsersController).users, find = repository.findOne
  let release, pending
  const seen = new Set(), entered = () => seen.size
  const held = new Promise(resolve => { release = resolve })
  // قراءات الحراس ليها select؛ دي أول قراءة في معالج التعديل نفسه
  repository.findOne = async function (options) {
    if (!options?.select && ids.has(options?.where?.id)) { seen.add(options.where.id); await held }
    return find.call(this, options)
  }
  try {
    pending = Promise.all(many.map(user => request(users.admin, 'PATCH', `/users/${user.id}`, { permissions: ['reports.view'] })))
    await until(() => entered() === limit && accountEditGateState().waiting === max - limit, 'نص التعديلات دخل والباقي في الدور')
    await new Promise(resolve => setTimeout(resolve, 300))
    // نص المخزن بس ماسك أقفال، والباقي مستني من غير اتصال: فاضل اتصالات لشغل المعالجات
    assert.deepEqual([entered(), accountEditGateState(), pool.numUsed() < max], [limit, { open: limit, waiting: max - limit }, true])
    release()
    assert.deepEqual((await pending).map(response => response.status), many.map(() => 200))
    assert.equal(entered(), max)
  } finally {
    release()
    if (pending) await pending.catch(() => undefined)
    repository.findOne = find
  }
  assert.deepEqual(accountEditGateState(), { open: 0, waiting: 0 })
  assert.deepEqual((await repo('User').find({ where: { id: In([...ids]) } })).map(user => JSON.parse(user.permissions)), many.map(() => ['reports.view']))

  // الدور بالترتيب: اللي خلص بيسلّم مكانه لأول واحد مستني، ومحدش جديد بيدخل قبله
  const order = [], doors = []
  const hold = (name, id) => accountEditLocked(ds, id, () => new Promise(resolve => { order.push(name); doors.push(resolve) }))
  const running = Array.from({ length: limit }, (_, index) => hold(`holder${index}`, 800000 + index))
  try {
    await until(() => doors.length === limit, 'الحد اتملى')
    running.push(hold('first', 800100))
    await until(() => accountEditGateState().waiting === 1, 'واحد في الدور')
    running.push(hold('second', 800101))
    await until(() => accountEditGateState().waiting === 2, 'اتنين في الدور')
    // دوره ماجاش في المهلة: «مشغول» من غير ما شغله يتنفّذ، ومكانه في الدور بيتشال
    let ran = false
    await assert.rejects(accountEditLocked(ds, 800102, async () => { ran = true }, 250), error => error.getStatus?.() === 409 && error.message === ACCOUNT_EDIT_BUSY)
    assert.deepEqual([ran, accountEditGateState()], [false, { open: limit, waiting: 2 }])
    // واحد خلص: الأول في الدور دخل مكانه (العدد زي ما هو)، والتاني لسه مستني
    doors[0]()
    await until(() => doors.length === limit + 1, 'الأول في الدور دخل')
    assert.deepEqual([order.slice(limit), accountEditGateState()], [['first'], { open: limit, waiting: 1 }])
    doors[1]()
    await until(() => doors.length === limit + 2, 'التاني في الدور دخل')
    assert.deepEqual([order.slice(limit), accountEditGateState()], [['first', 'second'], { open: limit, waiting: 0 }])
  } finally {
    // الأبواب كلها بتتفتح حتى لو فحص وقع: مفيش معاملة قفل بتفضل ماسكة اتصال
    for (let waited = 0; waited < 8000 && (accountEditGateState().open > 0 || accountEditGateState().waiting > 0); waited += 25) {
      for (const open of doors) open()
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    await Promise.allSettled(running)
  }
  assert.deepEqual(accountEditGateState(), { open: 0, waiting: 0 })
  // ومخزن باتصال واحد مافيهوش مكان لقفل قاعدة: التعديلات ورا بعض في العملية (من غير ما معاملة القفل تمسك الاتصال الوحيد)
  assert.deepEqual([{ driver: { master: { pool: { max: 1 } } } }, { driver: { master: { pool: { max: 2 } } } }, { driver: { master: { pool: { max: 7 } } } }, { driver: {} }].map(accountEditLockLimit), [0, 1, 3, 1])
  const single = { driver: { master: { pool: { max: 1 } } }, transaction: () => { throw new Error('معاملة قفل على مخزن باتصال واحد') } }
  const steps = []
  await Promise.all([accountEditLocked(single, 1, async () => { steps.push('a1'); await new Promise(resolve => setTimeout(resolve, 60)); steps.push('a2') }),
    accountEditLocked(single, 2, async () => { steps.push('b1'); steps.push('b2') })])
  assert.deepEqual([steps, accountEditGateState()], [['a1', 'a2', 'b1', 'b2'], { open: 0, waiting: 0 }])
  // مهلة واحدة للدور ولقفل القاعدة: اللي استناه في الدور بيتخصم من مهلة القفل. وقفل قاعدة ماجاش = «مشغول» من غير ما الشغل يتنفّذ
  const asked = []
  const fake = result => ({ driver: { master: { pool: { max: 2 } } },
    transaction: work => work({ query: async sqlText => { asked.push(Number(/@LockTimeout = (\d+)/.exec(sqlText)[1])); return [{ result }] } }) })
  let open
  const blocker = accountEditLocked(fake(0), 1, () => new Promise(resolve => { open = resolve }))
  try {
    await until(() => !!open, 'القفل الأول دخل')
    const queued = accountEditLocked(fake(0), 2, async () => 'done', 5000)
    await new Promise(resolve => setTimeout(resolve, 300))
    open()
    assert.deepEqual([await blocker, await queued], [undefined, 'done'])
  } finally { if (open) open() }
  assert.ok(asked.length === 2 && asked[0] > 14900 && asked[0] <= 15000 && asked[1] >= 4000 && asked[1] <= 4750, JSON.stringify(asked))
  let reached = false
  await assert.rejects(accountEditLocked(fake(-1), 3, async () => { reached = true }), error => error.getStatus?.() === 409 && error.message === ACCOUNT_EDIT_BUSY)
  assert.deepEqual([reached, accountEditGateState()], [false, { open: 0, waiting: 0 }])
})
