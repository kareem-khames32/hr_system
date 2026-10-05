'use strict'
// B2.6 (الجزء أ): مهمة تنفيذ بعد الاعتماد، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_reqexec_test_<16 hex>).
//  RX-01) نوع من غير الإعداد: الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة — السلوك القايم بالحرف.
//  RX-02) الإعداد على نوع الطلب: الدور والمهلة والإثبات، بحدودهم، وشيل الدور بيشيل الباقي، ومن الإضافة والتعديل والقايمة؛ ولأنواع
//         «تسجيل فقط» بس (نوع وجهته بتنفّذ آليًا مايتحطش عليه دور، ونوع عليه دور ماتتغيّرش وجهته لتنفيذ آلي).
//  RX-03) نوع عليه مهمة: الطلب «قيد التنفيذ»، ومهمة واحدة على الدور في فرع الطلب بموعدها، وفي «مهامي» بتاعة حامل الدور في الفرع بس،
//         وفي تقرير «معتمد ومااتنفذش» بتاريخ اعتماده ومسؤوله.
//  RX-04) اللي المهمة عليه بيقرا الطلب (طرف فيه)، وحامل الدور في فرع تاني لأ.
//  RX-05) إقفال المهمة = الطلب «مكتمل» وسطر «اتنفّذ» في سجله وبريد لصاحبه من غير نص الإثبات؛ الإثبات الإجباري مطلوب؛ إقفالين في نفس
//         اللحظة واحد بس؛ والمهمة ماتتفتحش تاني.
//  RX-06) مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام، ومايقفلهاش غير مسؤولها؛ رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب.
//  RX-07) الطلب السري: عنوان المهمة عام ومن غير اسم معتمده، وصاحب «عرض كل المهام» أو «إدارة المهام» مايعرفش نوعه ولا صاحبه ولا رقمه
//         ومالوش طريق يقراه، والمنفّذ بيقراه.
//  RX-08) المهمة والاعتماد معاملة واحدة: لو المهمة ماتكتبتش، الاعتماد كله بيرجع.
//  RX-09) باقي مداخل الاعتماد: سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ والمهمة على فرع الطلب لو صاحبه اتنقل؛ ونوع
//         وجهته بتنفّذ آليًا مالوش مهمة حتى لو الإعداد متخزن؛ والتشغيل المجدول بيعدّي على الطلب اللي مستني مهمته؛ ومعالج لسه ماخلّصش
//         = دورته زي ما هي ومن غير مهمة.
//  RX-10) محدش ينفّذ طلبه: صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته (ومنشئ بمخرج الموارد البشرية يقدر)، ومدير النظام بيفكّ الانسداد.
//  RX-11) إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه بس؛ والمهمة العادية زي ما هي.
//  RX-12) إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة: واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل (ترتيب القفل واحد).
// Run (من api/): node --test test/request-execution-tasks.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_reqexec_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-reqexec-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, queue, destinations, created = false, employeeNumber = 0
const FRONTEND = 'https://hr.example.invalid'
const mailbox = { sent: [] }
const org = {}, users = {}, emps = {}, types = {}, made = {}

function assertDisposable() {
  assert.match(database, /^hr_reqexec_test_[a-f0-9]{16}$/)
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
  return repo('Employee').save({ employeeCode: `RX${String(number).padStart(3, '0')}`, fullName: `موظف التنفيذ ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@reqexec.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const submit = async (user, type, extra = {}) => expectStatus(await request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true, ...extra }), 201)
const act = (user, id, action = 'APPROVE', comment) => request(user, 'POST', `/requests/${id}/act`, { action, comment })
const taskStatus = (user, id, body) => request(user, 'POST', `/tasks/${id}/status`, body)
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
const requestRow = async id => (await query('SELECT [id], [status], [executionTaskId], [completedAt], [destinationRef] FROM [requests] WHERE [id] = @0', [id]))[0]
const history = id => query('SELECT [approverId], [action], [comment] FROM [request_approvals] WHERE [requestId] = @0 ORDER BY [id]', [id])
const eventsOf = (type, entityType, id) => query('SELECT [payload] FROM [outbox_events] WHERE [eventType] = @0 AND [entityType] = @1 AND [entityId] = @2 ORDER BY [id]', [type, entityType, String(id)])
const typePatch = (id, body) => request(users.admin, 'PATCH', `/settings/request-types/${id}`, body)
const listedType = async id => expectStatus(await request(users.admin, 'GET', '/settings/request-types'), 200).find(row => row.id === id)
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
// طلب اتعتمد من مدير صاحبه (السلسلة خطوة واحدة) — بيرجّع الطلب بعد الاعتماد
async function approved(type, requester = users.worker) {
  const req = await submit(requester, type)
  expectStatus(await act(users.manager, req.id), 201)
  return requestRow(req.id)
}
// اتصال تاني بيمسك صفوف لحد ما `count` طلب يقفوا عليها وبعدها يسيبها: التزامن مضمون مش بالصدفة
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
  destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)

  org.branchA = await repo('Branch').save({ code: 'RX_A', name: 'فرع التنفيذ أ' })
  org.branchB = await repo('Branch').save({ code: 'RX_B', name: 'فرع التنفيذ ب' })
  emps.manager = await employee()
  emps.worker = await employee({ managerEmployeeId: emps.manager.id })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.worker = await account('worker', 'employee', [], { employeeId: emps.worker.id })
  users.itA = await account('it-a', 'employee', ['approve.it'])
  users.itB = await account('it-b', 'employee', ['approve.it'], { branchId: org.branchB.id })
  users.hrA = await account('hr-a', 'employee', ['approve.hr'])
  users.console = await account('console', 'employee', ['requests.view_all'])
  users.tasksAdmin = await account('tasks-admin', 'employee', ['tasks.manage', 'tasks.view_all'])
  users.viewer = await account('viewer', 'employee', ['tasks.view_all'])

  const chain = await repo('ApprovalChain').save({ code: 'CHAIN_RX', nameAr: 'سلسلة التنفيذ', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'direct_manager_of_requester' })
  const type = (code, nameAr, extra = {}) => repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true, ...extra })
  types.plain = await type('RX_PLAIN', 'طلب من غير تنفيذ')
  types.device = await type('RX_DEVICE', 'طلب جهاز')
  types.proof = await type('RX_PROOF', 'طلب بإثبات')
  types.reject = await type('RX_REJECT', 'طلب هيترفض تنفيذه')
  const secretChain = await repo('ApprovalChain').save({ code: 'CHAIN_RX_SECRET', nameAr: 'سلسلة السري', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: secretChain.id, stepOrder: 1, approverRole: 'specific_employee', specificEmployeeId: emps.manager.id })
  types.secret = await type('RX_SECRET', 'بلاغ حساس جدًا', { isConfidential: true, approvalChainId: secretChain.id })
  const autoChain = await repo('ApprovalChain').save({ code: 'CHAIN_RX_AUTO', nameAr: 'سلسلة تلقائية', isActive: true, autoApprove: true })
  types.auto = await type('RX_AUTO', 'طلب باعتماد تلقائي', { approvalChainId: autoChain.id })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-reqexec-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'request execution fixture cleanup failed')
})

test('RX-01: نوع من غير الإعداد — الاعتماد بيكمّل الطلب في لحظتها ومن غير مهمة', async () => {
  const before = Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n)
  const req = await approved(types.plain)
  assert.deepEqual([req.status, req.executionTaskId, !!req.completedAt, /^REQ-/.test(req.destinationRef)], ['COMPLETED', null, true, true])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n), before)
  assert.deepEqual((await history(req.id)).map(row => row.action), ['APPROVED'])
  const listed = await listedType(types.plain.id)
  assert.deepEqual([listed.executionRole, listed.executionDays, listed.executionProof, listed.executionAvailable], [null, null, false, true])
})

test('RX-02: الإعداد على نوع الطلب — الدور والمهلة والإثبات بحدودهم، وشيل الدور بيشيل الباقي', async () => {
  for (const body of [{ executionRole: 'ceo' }, { executionRole: 'direct_manager_of_requester' }, { executionRole: 'it', executionDays: 0 }, { executionRole: 'it', executionDays: 366 },
    { executionRole: 'it', executionDays: 1.5 }, { executionRole: 'it', executionProof: 'yes' }]) {
    expectStatus(await typePatch(types.device.id, body), 400)
  }
  // مهلة أو إثبات من غير دور
  const lonely = await typePatch(types.device.id, { executionDays: 3 })
  assert.deepEqual([lonely.status, messageOf(lonely)], [400, 'اختار دور مهمة التنفيذ الأول'])
  assert.equal((await listedType(types.device.id)).executionRole, null, 'المرفوض ماكتبش حاجة')
  let saved = expectStatus(await typePatch(types.device.id, { executionRole: 'it', executionDays: 3, executionProof: false }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], ['it', 3, false])
  // الخانة اللي مش مبعوتة مابتتغيّرش، وتعديل تاني للنوع مابيلمسش الإعداد
  saved = expectStatus(await typePatch(types.device.id, { executionProof: true }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], ['it', 3, true])
  // وتغيير المهلة لوحدها مابيلمسش الإثبات
  saved = expectStatus(await typePatch(types.device.id, { executionDays: 4 }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], ['it', 4, true])
  expectStatus(await typePatch(types.device.id, { executionDays: 3 }), 200)
  saved = expectStatus(await typePatch(types.device.id, { nameAr: 'طلب جهاز' }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], ['it', 3, true])
  // شيل الدور بيشيل المهلة والإثبات
  saved = expectStatus(await typePatch(types.device.id, { executionRole: null }), 200)
  assert.deepEqual([saved.executionRole, saved.executionDays, saved.executionProof], [null, null, false])
  expectStatus(await typePatch(types.device.id, { executionRole: 'it', executionDays: 3 }), 200)
  expectStatus(await typePatch(types.proof.id, { executionRole: 'it', executionProof: true }), 200)
  expectStatus(await typePatch(types.reject.id, { executionRole: 'it' }), 200)
  expectStatus(await typePatch(types.secret.id, { executionRole: 'hr', executionDays: 7, executionProof: true }), 200)
  expectStatus(await typePatch(types.auto.id, { executionRole: 'it' }), 200)
  const listed = await listedType(types.device.id)
  assert.deepEqual([listed.executionRole, listed.executionDays, listed.executionProof, listed.executionMode], ['it', 3, false, 'RECORD_ONLY'])
  // نوع جديد بإعداده من الإضافة، وإعداد غلط مابيعملش النوع
  const count = await repo('RequestType').count()
  expectStatus(await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع بإعداد غلط', category: 'personal_data', executionRole: 'ceo' }), 400)
  expectStatus(await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع بمهلة من غير دور', category: 'personal_data', executionDays: 2 }), 400)
  assert.equal(await repo('RequestType').count(), count)
  const fresh = expectStatus(await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع جديد بمهمة', category: 'personal_data', executionRole: 'finance', executionDays: 5 }), 201)
  assert.deepEqual([fresh.executionRole, fresh.executionDays, fresh.executionProof], ['finance', 5, false])
  assert.deepEqual((({ executionRole, executionDays }) => [executionRole, executionDays])(await listedType(fresh.id)), ['finance', 5])
  // مهمة التنفيذ لأنواع «تسجيل فقط» بس: نوع وجهته بتنفّذ آليًا مايتحطش عليه دور ولا يتعمل بدور، ونوع عليه دور ماتتغيّرش وجهته لتنفيذ آلي
  const RECORD_ONLY = 'مهمة التنفيذ لأنواع «تسجيل فقط» بس: النوع ده وجهته بتنفّذ آليًا بعد الاعتماد — شيل مهمة التنفيذ أو خلّي وجهته «سجل فقط»'
  types.executes = await repo('RequestType').save({ code: 'RX_EXPENSE', nameAr: 'طلب بوجهة منفّذة', category: 'personal_data', destinationHandler: 'expense_register',
    approvalChainId: types.plain.approvalChainId, isActive: true })
  for (const response of [await typePatch(types.executes.id, { executionRole: 'finance' }), await typePatch(types.device.id, { destinationHandler: 'expense_register' }),
    await typePatch(types.device.id, { destinationHandler: 'expense_register', executionDays: 9 }),
    await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع منفّذ بمهمة', category: 'personal_data', destinationHandler: 'expense_register', executionRole: 'finance' })]) {
    assert.deepEqual([response.status, messageOf(response)], [400, RECORD_ONLY])
  }
  assert.deepEqual((({ destinationHandler, executionRole, executionDays }) => [destinationHandler, executionRole, executionDays])(await listedType(types.device.id)), ['none', 'it', 3])
  assert.equal((await listedType(types.executes.id)).executionRole, null)
  assert.equal(await repo('RequestType').countBy({ nameAr: 'نوع منفّذ بمهمة' }), 0)
  // شيل المهمة مع تغيير الوجهة في نفس الطلب مقبول، وتعديل تاني لنوع منفّذ (من غير مهمة) زي الأول
  const moving = expectStatus(await request(users.admin, 'POST', '/settings/request-types', { nameAr: 'نوع هتتغيّر وجهته', category: 'personal_data', executionRole: 'hr' }), 201)
  const movedType = expectStatus(await typePatch(moving.id, { destinationHandler: 'expense_register', executionRole: null }), 200)
  assert.deepEqual([movedType.destinationHandler, movedType.executionRole, movedType.executionMode], ['expense_register', null, 'EXECUTES'])
  expectStatus(await typePatch(types.executes.id, { nameAr: 'طلب بوجهة منفّذة' }), 200)
  // من غير صلاحية أنواع الطلبات
  expectStatus(await request(users.tasksAdmin, 'PATCH', `/settings/request-types/${types.device.id}`, { executionRole: 'hr' }), 403)
})

test('RX-03: نوع عليه مهمة — الطلب «قيد التنفيذ» ومهمة واحدة على الدور في فرع الطلب، وفي «مهامي» والتقرير', async () => {
  const tasksBefore = Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n)
  const req = await approved(types.device)
  made.device = req
  assert.deepEqual([req.status, !!req.executionTaskId, req.completedAt, /^REQ-/.test(req.destinationRef)], ['IN_EXECUTION', true, null, true])
  const task = await repo('Task').findOneByOrFail({ id: req.executionTaskId })
  assert.deepEqual([task.title, task.description, task.assigneeEmployeeId, task.assigneeRole, task.branchId, task.createdByUserId, task.dueDate, task.status, task.requiresProof, task.priority],
    [`تنفيذ طلب: طلب جهاز — ${emps.worker.fullName}`, null, null, 'it', org.branchA.id, 0, day(3), 'OPEN', false, 'NORMAL'])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [tasks]'))[0].n), tasksBefore + 1, 'مهمة واحدة بس اتفتحت للطلب')
  assert.deepEqual((await eventsOf('TASK_ASSIGNED', 'task', task.id)).map(row => JSON.parse(row.payload)), [{ taskId: task.id, branchId: org.branchA.id }])
  // في «مهامي» بتاعة حامل الدور في فرع الطلب بس، ومعاها رقم الطلب
  const mine = expectStatus(await request(users.itA, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === task.id)
  assert.deepEqual([mine.canWork, mine.execution, mine.requestId], [true, true, req.id])
  assert.equal(expectStatus(await request(users.itB, 'GET', '/tasks/mine'), 200).tasks.some(row => row.id === task.id), false)
  // صاحب الطلب شايف طلبه «قيد التنفيذ»
  assert.equal(expectStatus(await request(users.worker, 'GET', `/requests/${req.id}`), 200).status, 'IN_EXECUTION')
  // التقرير: «معتمد ومااتنفذش» بتاريخ الاعتماد والمسؤول وحالة مهمته
  const pending = expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200)
  assert.ok(pending.every(row => ['APPROVED', 'IN_EXECUTION'].includes(row.status)))
  const row = pending.find(item => item.id === req.id)
  assert.deepEqual([row.status, row.executionTask], ['IN_EXECUTION', { id: task.id, assignee: 'تقنية المعلومات', status: 'OPEN', dueDate: day(3), overdue: false }])
  // مهمة فات موعدها: «متأخرة» في التقرير
  await query('UPDATE [tasks] SET [dueDate] = @1 WHERE [id] = @0', [task.id, day(-1)])
  assert.deepEqual((({ dueDate, overdue }) => [dueDate, overdue])(expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200).find(item => item.id === req.id).executionTask),
    [day(-1), true])
  await query('UPDATE [tasks] SET [dueDate] = @1 WHERE [id] = @0', [task.id, day(3)])
  // تاريخ الاعتماد من سجل الاعتماد (ساعة القاعدة): بيتقارن بساعة القاعدة نفسها
  const [{ now }] = await query('SELECT GETDATE() AS [now]')
  assert.ok(Math.abs(new Date(row.approvedAt).getTime() - new Date(now).getTime()) < 120000, String(row.approvedAt))
  // القايمة العادية فيها المكتمل كمان، ومن غير بيانات تنفيذ عليه
  const all = expectStatus(await request(users.console, 'GET', '/requests/all'), 200)
  const done = all.find(item => item.status === 'COMPLETED')
  assert.ok(done && done.executionTask === undefined && done.approvedAt === undefined)
  // موعد فات = متأخرة في التقرير
  await repo('Task').update({ id: task.id }, { dueDate: day(-1) })
  assert.equal(expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200).find(item => item.id === req.id).executionTask.overdue, true)
  await repo('Task').update({ id: task.id }, { dueDate: day(3) })
})

test('RX-04: اللي المهمة عليه بيقرا الطلب، وحامل الدور في فرع تاني والغريب لأ', async () => {
  const req = made.device
  const seen = expectStatus(await request(users.itA, 'GET', `/requests/${req.id}`), 200)
  assert.deepEqual([seen.id, seen.status, JSON.parse(seen.payload).reason], [req.id, 'IN_EXECUTION', 'طلب للاختبار'])
  const missing = await request(users.itB, 'GET', '/requests/999999')
  const foreign = await request(users.itB, 'GET', `/requests/${req.id}`)
  assert.deepEqual([foreign.status, foreign.body.message], [404, missing.body.message])
  // حساب في نفس الفرع من غير حق في الطلب: الرفض الصريح القايم (مش طرف)
  expectStatus(await request(users.viewer, 'GET', `/requests/${req.id}`), 403)
  // طلب من نوع من غير مهمة: حامل الدور مالوش فيه حاجة زي الأول
  const plain = await approved(types.plain)
  expectStatus(await request(users.itA, 'GET', `/requests/${plain.id}`), 403)
})

test('RX-05: إقفال المهمة — الطلب «مكتمل» وسطر «اتنفّذ» وبريد لصاحبه؛ والإثبات الإجباري، وإقفالين في نفس اللحظة، ومن غير إعادة فتح', async () => {
  const req = await approved(types.proof)
  await drain()
  mailbox.sent.length = 0
  // الإثبات إجباري
  const bare = await taskStatus(users.itA, req.executionTaskId, { status: 'DONE' })
  assert.deepEqual([bare.status, (await requestRow(req.id)).status], [400, 'IN_EXECUTION'])
  // حامل الدور في فرع تاني مش شايفها
  expectStatus(await taskStatus(users.itB, req.executionTaskId, { status: 'DONE', proofNote: 'مش بتاعته' }), 404)
  const closed = expectStatus(await taskStatus(users.itA, req.executionTaskId, { status: 'DONE', proofNote: 'اتسلّم الجهاز برقم 4471' }), 201)
  assert.deepEqual([closed.status, closed.execution, closed.requestId], ['DONE', true, req.id])
  const after = await requestRow(req.id)
  assert.deepEqual([after.status, !!after.completedAt], ['COMPLETED', true])
  assert.deepEqual((await history(req.id)).map(row => [row.approverId, row.action, row.comment]),
    [[users.manager.id, 'APPROVED', null], [users.itA.id, 'EXECUTED', 'اتنفّذ: اتسلّم الجهاز برقم 4471']])
  assert.deepEqual((await eventsOf('REQUEST_EXECUTED', 'request', req.id)).map(row => JSON.parse(row.payload)),
    [{ requestId: req.id, typeCode: 'RX_PROOF', requesterId: emps.worker.id, branchId: org.branchA.id }])
  // بريد «طلبك اتنفّذ» لصاحب الطلب، من غير نص الإثبات
  await drain()
  const mail = mailbox.sent.filter(message => message.to === 'worker@reqexec.invalid')
  assert.deepEqual(mail.map(message => message.subject), ['طلبك اتنفّذ: طلب بإثبات'])
  assert.equal(mail[0].text.includes('4471'), false)
  // اللي قفلها بقى في سجل الطلب، فلسه بيقراه؛ والتاني من حاملي الدور اللي ماقفلهاش مابقاش طرف
  expectStatus(await request(users.itA, 'GET', `/requests/${req.id}`), 200)
  users.itA2 = await account('it-a2', 'employee', ['approve.it'])
  const otherIt = users.itA2
  expectStatus(await request(otherIt, 'GET', `/requests/${req.id}`), 403)
  // ماتتفتحش تاني (الطلب اكتمل)، حتى لصاحب «إدارة المهام»
  const reopen = await taskStatus(users.tasksAdmin, req.executionTaskId, { status: 'OPEN', note: 'عايز أفتحها' })
  assert.deepEqual([reopen.status, messageOf(reopen)], [400, 'طلب المهمة دي اتقفل، فمهمة تنفيذه ماتتفتحش تاني'])
  assert.equal((await requestRow(req.id)).status, 'COMPLETED')
  // إقفالين في نفس اللحظة: واحد بس، وسطر «اتنفّذ» واحد
  const race = await approved(types.device)
  // صاحب «إدارة المهام» مش مسؤولها: مايقفلهاش (اللي بيقفل بيتكتب في سجل الطلب وبيبقى طرف فيه)
  const byManager = await taskStatus(users.tasksAdmin, race.executionTaskId, { status: 'DONE', proofNote: 'من الإدارة' })
  assert.deepEqual([byManager.status, messageOf(byManager), (await requestRow(race.id)).status], [403, 'مهمة تنفيذ الطلب بيقفلها المسؤول عنها بس', 'IN_EXECUTION'])
  const results = await releaseTogether('UPDATE [requests] SET [typeCode] = [typeCode] WHERE [id] = @0', [race.id], 2,
    () => Promise.all([taskStatus(users.itA, race.executionTaskId, { status: 'DONE', proofNote: 'أ' }), taskStatus(otherIt, race.executionTaskId, { status: 'DONE', proofNote: 'ب' })]))
  assert.deepEqual(results.map(response => response.status).sort(), [201, 400])
  assert.deepEqual([(await requestRow(race.id)).status, (await history(race.id)).filter(row => row.action === 'EXECUTED').length], ['COMPLETED', 1])
  // مهمة عادية (مش مهمة تنفيذ): إقفالها مابيلمسش أي طلب
  const plainTask = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة عادية', assigneeRole: 'it', branchId: org.branchA.id }), 201)
  assert.deepEqual([plainTask.execution, plainTask.requestId], [false, null])
  expectStatus(await taskStatus(users.itA, plainTask.id, { status: 'DONE' }), 201)
})

test('RX-06: مهمة التنفيذ ماتتلغيش ولا تتعدّل ولا تتحوّل من شاشة المهام — رفض التنفيذ من لوحة الطلبات بيلغيها ويرفض الطلب', async () => {
  const req = await approved(types.reject)
  const cancel = await taskStatus(users.tasksAdmin, req.executionTaskId, { status: 'CANCELLED', note: 'مش عايزينها' })
  assert.deepEqual([cancel.status, messageOf(cancel)], [400, 'دي مهمة تنفيذ طلب معتمد: ماتتلغيش من هنا — رفض تنفيذ الطلب من «لوحة الطلبات» بيلغيها'])
  assert.deepEqual([(await repo('Task').findOneByOrFail({ id: req.executionTaskId })).status, (await requestRow(req.id)).status], ['OPEN', 'IN_EXECUTION'])
  // ولا تتعدّل ولا تتحوّل: مسؤولها من إعداد النوع (تحويلها كان هيدّي المسؤول الجديد حق قراءة الطلب)
  const before = await repo('Task').findOneByOrFail({ id: req.executionTaskId })
  for (const body of [{ assigneeRole: 'hr', branchId: org.branchA.id }, { assigneeEmployeeId: emps.worker.id }, { title: 'عنوان تاني' }, { dueDate: day(30) }, { requiresProof: true }]) {
    const edited = await request(users.tasksAdmin, 'PATCH', `/tasks/${req.executionTaskId}`, body)
    assert.deepEqual([edited.status, messageOf(edited)], [400, 'دي مهمة تنفيذ طلب معتمد: ماتتعدّلش ولا تتحوّل من هنا — مسؤولها حاملي دور نوع الطلب في فرعه'], JSON.stringify(body))
  }
  assert.deepEqual(await repo('Task').findOneByOrFail({ id: req.executionTaskId }), before)
  // وصاحب «إدارة المهام» شايفها في القايمة من غير أزرار إدارة ومن غير رقم الطلب، ومالوش يقرا الطلب
  const managed = expectStatus(await request(users.tasksAdmin, 'GET', '/tasks'), 200).tasks.find(item => item.id === req.executionTaskId)
  assert.deepEqual([managed.execution, managed.canManage, managed.canWork, managed.requestId, managed.createdByUserId, managed.createdByName], [true, false, false, null, 0, null])
  expectStatus(await request(users.tasksAdmin, 'GET', `/requests/${req.id}`), 403)
  expectStatus(await request(users.itA, 'GET', `/requests/${req.id}`), 200)
  expectStatus(await request(users.hrA, 'GET', `/requests/${req.id}`), 403)
  // رفض التنفيذ: بصلاحية الإعدادات وبسبب
  expectStatus(await request(users.tasksAdmin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'مش من حقه' }), 403)
  expectStatus(await request(users.admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: '' }), 400)
  expectStatus(await request(users.admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'مفيش ميزانية للجهاز' }), 201)
  const task = await repo('Task').findOneByOrFail({ id: req.executionTaskId })
  assert.deepEqual([(await requestRow(req.id)).status, task.status, task.statusNote, task.closedByUserId], ['REJECTED', 'CANCELLED', 'اترفض تنفيذ الطلب: مفيش ميزانية للجهاز', users.admin.id])
  assert.deepEqual((await history(req.id)).map(row => [row.action, row.comment]), [['APPROVED', null], ['REJECTED', 'رفض التنفيذ: مفيش ميزانية للجهاز']])
  // بعدها: المهمة مقفولة، وماتتفتحش تاني، والرفض مايتكررش
  expectStatus(await taskStatus(users.itA, req.executionTaskId, { status: 'DONE', proofNote: 'بعد الرفض' }), 400)
  const reopen = await taskStatus(users.tasksAdmin, req.executionTaskId, { status: 'OPEN', note: 'ترجع' })
  assert.deepEqual([reopen.status, messageOf(reopen)], [400, 'طلب المهمة دي اتقفل، فمهمة تنفيذه ماتتفتحش تاني'])
  expectStatus(await request(users.admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'تاني' }), 400)
  // طلب مكتمل (من غير مهمة) لسه مايترفضش تنفيذه
  expectStatus(await request(users.admin, 'POST', `/requests/${(await approved(types.plain)).id}/reject-execution`, { comment: 'مكتمل' }), 400)
})

test('RX-07: الطلب السري — عنوان المهمة عام ومن غير اسم معتمده، وأصحاب «عرض كل المهام» و«إدارة المهام» مالهمش طريق له، والمنفّذ بيقراه', async () => {
  const req = await submit(users.worker, types.secret)
  expectStatus(await act(users.manager, req.id), 201)
  const row = await requestRow(req.id)
  assert.equal(row.status, 'IN_EXECUTION')
  const task = await repo('Task').findOneByOrFail({ id: row.executionTaskId })
  assert.deepEqual([task.title, task.description, task.assigneeRole, task.requiresProof, task.dueDate], ['تنفيذ طلب سري', null, 'hr', true, day(7)])
  // صاحب «عرض كل المهام» في الفرع: المهمة ظاهرة بعنوانها العام بس
  const listed = expectStatus(await request(users.viewer, 'GET', '/tasks'), 200).tasks.find(item => item.id === task.id)
  assert.deepEqual([listed.title, listed.description, listed.execution, listed.requestId], ['تنفيذ طلب سري', null, true, null])
  assert.equal(JSON.stringify(listed).includes(emps.worker.fullName) || JSON.stringify(listed).includes('بلاغ حساس'), false)
  // ومن غير اسم معتمد الطلب (هويته محجوبة في الطلب السري): «اللي كلّف بيها» النظام
  assert.deepEqual([task.createdByUserId, listed.createdByName, JSON.stringify(listed).includes(users.manager.displayName)], [0, null, false])
  // صاحب «إدارة المهام» (مش من حاملي الدور): مايحوّلهاش لنفسه ولا لغيره، ومايقفلهاش، ومايعرفش رقم الطلب — فمالوش طريق يبقى طرف فيه
  const managerView = expectStatus(await request(users.tasksAdmin, 'GET', '/tasks'), 200).tasks.find(item => item.id === task.id)
  assert.deepEqual([managerView.canManage, managerView.canWork, managerView.requestId], [false, false, null])
  expectStatus(await request(users.tasksAdmin, 'PATCH', `/tasks/${task.id}`, { assigneeEmployeeId: emps.manager.id }), 400)
  expectStatus(await taskStatus(users.tasksAdmin, task.id, { status: 'DONE', proofNote: 'إقفال من غير حق' }), 403)
  expectStatus(await request(users.tasksAdmin, 'GET', `/requests/${req.id}`), 403)
  assert.deepEqual([(await repo('Task').findOneByOrFail({ id: task.id })).status, (await requestRow(req.id)).status], ['OPEN', 'IN_EXECUTION'])
  // المنفّذ (حامل دور الموارد البشرية في الفرع) بيقرا الطلب كامل
  const mine = expectStatus(await request(users.hrA, 'GET', '/tasks/mine'), 200).tasks.find(item => item.id === task.id)
  assert.equal(mine.requestId, req.id)
  const detail = expectStatus(await request(users.hrA, 'GET', `/requests/${req.id}`), 200)
  assert.deepEqual([detail.requesterId, JSON.parse(detail.payload).reason], [emps.worker.id, 'طلب للاختبار'])
  // لوحة الطلبات لصاحب «عرض كل الطلبات»: الطلب السري محجوب زي الأول، وعليه مسؤول تنفيذه بس
  const masked = expectStatus(await request(users.console, 'GET', '/requests/all?execution=pending'), 200).find(item => item.id === req.id)
  assert.deepEqual([masked.requesterId ?? null, masked.payload ?? null, masked.executionTask.assignee], [null, null, 'الموارد البشرية'])
  assert.equal(masked.confidentialMasked, true)
  // رفض تنفيذ الطلب السري: مسؤول الإعدادات اللي مش طرف فيه لأ (اسمه كان هيتكتب في سجله فيبقى طرف ويقراه)، والطلب العادي أيوه
  const settingsOnly = await account('settings-only', 'employee', ['settings.manage', 'requests.view_all'])
  const refused = await request(settingsOnly, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'مش طرف' })
  assert.deepEqual([refused.status, messageOf(refused), (await requestRow(req.id)).status, (await repo('Task').findOneByOrFail({ id: task.id })).status, (await history(req.id)).length],
    [403, 'رفض تنفيذ طلب سري لأطرافه بس', 'IN_EXECUTION', 'OPEN', 1])
  assert.deepEqual((({ confidentialMasked, requesterId, payload }) => [confidentialMasked, requesterId, payload])(expectStatus(await request(settingsOnly, 'GET', `/requests/${req.id}`), 200)), [true, null, null])
  const normal = await approved(types.device)
  expectStatus(await request(settingsOnly, 'POST', `/requests/${normal.id}/reject-execution`, { comment: 'مفيش ميزانية' }), 201)
  assert.equal((await requestRow(normal.id)).status, 'REJECTED')
  // وطرف في السري (مدير النظام: أي خطوة في سلسلته عليه) يقدر
  const second = await submit(users.worker, types.secret)
  expectStatus(await act(users.manager, second.id), 201)
  expectStatus(await request(users.admin, 'POST', `/requests/${second.id}/reject-execution`, { comment: 'مش هيتنفذ' }), 201)
  assert.deepEqual([(await requestRow(second.id)).status, (await repo('Task').findOneByOrFail({ id: (await requestRow(second.id)).executionTaskId })).status], ['REJECTED', 'CANCELLED'])
  // البريد لصاحبه بالنص العام
  await drain()
  mailbox.sent.length = 0
  expectStatus(await taskStatus(users.hrA, task.id, { status: 'DONE', proofNote: 'اتبحث واتقفل' }), 201)
  await drain()
  const mail = mailbox.sent.filter(message => message.to === 'worker@reqexec.invalid')
  assert.equal(mail.length, 1)
  assert.equal(mail[0].subject.includes('بلاغ حساس') || mail[0].text.includes('بلاغ حساس') || mail[0].text.includes('اتبحث'), false, mail[0].text)
})

test('RX-08: المهمة والاعتماد معاملة واحدة — لو المهمة ماتكتبتش، الاعتماد كله بيرجع', async () => {
  const req = await submit(users.worker, types.device)
  await query(`CREATE TRIGGER rx_reject_tasks ON [tasks] AFTER INSERT AS BEGIN SET NOCOUNT ON; THROW 59010, 'Synthetic task failure', 1; END`)
  let failed
  try { failed = await act(users.manager, req.id) } finally { await query('DROP TRIGGER rx_reject_tasks') }
  assert.ok(failed.status >= 400)
  const row = await requestRow(req.id)
  assert.deepEqual([row.status, row.executionTaskId, row.destinationRef, (await history(req.id)).length], ['UNDER_REVIEW', null, null, 0])
  // وبعد ما السبب يتشال: نفس المعتمد يعتمد عادي
  expectStatus(await act(users.manager, req.id), 201)
  assert.equal((await requestRow(req.id)).status, 'IN_EXECUTION')
})

test('RX-09: باقي مداخل الاعتماد — سلسلة فاضية باعتماد تلقائي، وطلب الموارد البشرية نيابةً؛ ومعالج لسه ماخلّصش من غير مهمة', async () => {
  // سلسلة من غير خطوات باعتماد تلقائي: الطلب بيتعتمد لحظة تقديمه، ومهمته بتتفتح و«اللي كلّف بيها» النظام
  const auto = await requestRow((await submit(users.worker, types.auto)).id)
  assert.equal(auto.status, 'IN_EXECUTION')
  assert.deepEqual((({ assigneeRole, createdByUserId }) => [assigneeRole, createdByUserId])(await repo('Task').findOneByOrFail({ id: auto.executionTaskId })), ['it', 0])
  // الموارد البشرية بتقدّم نيابةً: اعتماد فوري، ومهمة التنفيذ بتتفتح برضه
  const hrFull = await account('hr-full', 'employee', ['approve.hr', 'employees.view', 'employees.edit', 'requests.create_on_behalf', 'requests.view_all'])
  const onBehalf = expectStatus(await request(hrFull, 'POST', '/requests', { typeCode: types.device.code, payload: { reason: 'نيابة عن الموظف' }, submit: true, onBehalfEmployeeId: emps.worker.id }), 201)
  const instant = await requestRow(onBehalf.id)
  assert.deepEqual([instant.status, !!instant.executionTaskId], ['IN_EXECUTION', true])
  assert.equal((await repo('Task').findOneByOrFail({ id: instant.executionTaskId })).createdByUserId, 0)
  // الموظف اتنقل فرع بعد ما قدّم: المهمة على فرع الطلب مش فرعه الجديد
  const movedReq = await submit(users.worker, types.device)
  await query('UPDATE [employees] SET [branchId] = @1 WHERE [id] = @0', [emps.worker.id, org.branchB.id])
  try { expectStatus(await act(users.manager, movedReq.id), 201) } finally { await query('UPDATE [employees] SET [branchId] = @1 WHERE [id] = @0', [emps.worker.id, org.branchA.id]) }
  assert.equal((await repo('Task').findOneByOrFail({ id: (await requestRow(movedReq.id)).executionTaskId })).branchId, org.branchA.id)
  // نوع اتغيّرت وجهته لتغيير وظيفي مجدول بعد ما طلبه اتعتمد ومستني مهمته: التشغيل المجدول مابيلمسوش (وجهته خلصت)
  const waiting = await approved(types.device)
  const requestsService = app.get(require('../src/requests/requests.service').RequestsService)
  await query(`UPDATE [request_types] SET [destinationHandler] = N'employee_update_promotions' WHERE [id] = @0`, [types.device.id])
  try {
    assert.equal((await requestsService.runScheduledTransfers()).employmentExecuted, 0)
  } finally { await query(`UPDATE [request_types] SET [destinationHandler] = N'none' WHERE [id] = @0`, [types.device.id]) }
  const untouched = await requestRow(waiting.id)
  assert.deepEqual([untouched.status, untouched.executionTaskId, untouched.destinationRef, (await history(waiting.id)).map(row => row.action)],
    ['IN_EXECUTION', waiting.executionTaskId, waiting.destinationRef, ['APPROVED']])
  const execute = destinations.execute
  // نوع وجهته بتنفّذ آليًا والإعداد متخزن عليه (من برّه الشاشة): مفيش مهمة، والطلب بيكتمل زي الأول
  await query(`UPDATE [request_types] SET [executionRole] = N'finance' WHERE [id] = @0`, [types.executes.id])
  destinations.execute = async (em, req, type) => type.code === 'RX_EXPENSE' ? { ref: 'EXPENSE-TEST', completed: true } : execute.call(destinations, em, req, type)
  try {
    const done = await approved(types.executes)
    assert.deepEqual([done.status, done.executionTaskId, done.destinationRef, !!done.completedAt], ['COMPLETED', null, 'EXPENSE-TEST', true])
  } finally {
    delete destinations.execute
    await query(`UPDATE [request_types] SET [executionRole] = NULL WHERE [id] = @0`, [types.executes.id])
  }
  // معالج رجّع «لسه ماخلّصش» (تاريخ جاي أو عهدة مستنية): الطلب قيد التنفيذ بدورته هو، ومن غير مهمة
  destinations.execute = async (em, req, type) => type.code === 'RX_DEVICE' ? { ref: 'SCHEDULED-TEST', completed: false } : execute.call(destinations, em, req, type)
  try {
    const scheduled = await approved(types.device)
    assert.deepEqual([scheduled.status, scheduled.executionTaskId, scheduled.destinationRef], ['IN_EXECUTION', null, 'SCHEDULED-TEST'])
  } finally { delete destinations.execute }
  assert.equal(typeof destinations.execute, 'function')
})

test('RX-10: محدش ينفّذ طلبه — صاحب الطلب ومنشئه نيابةً مايشتغلوش على مهمته، ومدير النظام بيفكّ الانسداد', async () => {
  const OWN = 'دي مهمة تنفيذ طلبك: بيشتغل عليها حد تاني من المسؤولين عنها'
  // موظف من حاملي دور التنفيذ قدّم طلب من نفس النوع: مهمته ظاهرة له برقم طلبه، ومن غير شغل
  emps.itWorker = await employee({ managerEmployeeId: emps.manager.id })
  users.itWorker = await account('it-worker', 'employee', ['approve.it'], { employeeId: emps.itWorker.id })
  const own = await approved(types.device, users.itWorker)
  const card = expectStatus(await request(users.itWorker, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === own.executionTaskId)
  assert.deepEqual([card.execution, card.canWork, card.canManage, card.requestId], [true, false, false, own.id])
  for (const body of [{ status: 'IN_PROGRESS' }, { status: 'WAITING', note: 'مستني نفسي' }, { status: 'DONE', proofNote: 'نفّذت طلبي' }]) {
    const response = await taskStatus(users.itWorker, own.executionTaskId, body)
    assert.deepEqual([response.status, messageOf(response)], [403, OWN], body.status)
  }
  assert.deepEqual([(await repo('Task').findOneByOrFail({ id: own.executionTaskId })).status, (await requestRow(own.id)).status, (await history(own.id)).length], ['OPEN', 'IN_EXECUTION', 1])
  // زميله من حاملي الدور بيشتغل عليها عادي
  assert.equal(expectStatus(await request(users.itA, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === own.executionTaskId).canWork, true)
  expectStatus(await taskStatus(users.itA, own.executionTaskId, { status: 'DONE' }), 201)
  assert.equal((await requestRow(own.id)).status, 'COMPLETED')
  // وطلب اتقدّم له نيابةً (هو صاحبه مش منشئه): نفس المنع
  const hrCreator = await account('hr-creator', 'employee', ['approve.hr', 'employees.view', 'employees.edit', 'requests.create_on_behalf', 'requests.view_all'])
  const forHim = expectStatus(await request(hrCreator, 'POST', '/requests', { typeCode: types.device.code, payload: { reason: 'نيابة عن موظف التقنية' }, submit: true, onBehalfEmployeeId: emps.itWorker.id }), 201)
  const forHimRow = await requestRow(forHim.id)
  assert.deepEqual([forHimRow.status, forHim.requesterId, forHim.createdByUserId], ['IN_EXECUTION', emps.itWorker.id, hrCreator.id])
  const byRequester = await taskStatus(users.itWorker, forHimRow.executionTaskId, { status: 'DONE', proofNote: 'طلبي' })
  assert.deepEqual([byRequester.status, messageOf(byRequester), (await requestRow(forHim.id)).status], [403, OWN, 'IN_EXECUTION'])
  assert.equal(expectStatus(await request(users.itWorker, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === forHimRow.executionTaskId).canWork, false)

  // اللي أنشأ الطلب نيابةً (من غير مخرج الموارد البشرية) زي صاحبه
  const creator = await account('it-creator', 'employee', ['approve.it', 'employees.view', 'requests.create_on_behalf'])
  const behalf = expectStatus(await request(creator, 'POST', '/requests', { typeCode: types.device.code, payload: { reason: 'نيابة عن الموظف' }, submit: true, onBehalfEmployeeId: emps.worker.id }), 201)
  assert.deepEqual([behalf.requesterId, behalf.createdByUserId], [emps.worker.id, creator.id])
  if ((await requestRow(behalf.id)).status !== 'IN_EXECUTION') expectStatus(await act(users.manager, behalf.id), 201)
  const behalfRow = await requestRow(behalf.id)
  assert.equal(behalfRow.status, 'IN_EXECUTION')
  const byCreator = await taskStatus(creator, behalfRow.executionTaskId, { status: 'DONE', proofNote: 'نفّذت اللي أنشأته' })
  assert.deepEqual([byCreator.status, messageOf(byCreator), (await requestRow(behalf.id)).status], [403, OWN, 'IN_EXECUTION'])
  assert.equal(expectStatus(await request(creator, 'GET', '/tasks/mine'), 200).tasks.find(row => row.id === behalfRow.executionTaskId).canWork, false)
  // ومنشئ بمخرج الموارد البشرية (طلب نيابةً باعتماد فوري) بيقفل مهمة الدور بتاعه
  const hrType = await repo('RequestType').save({ code: 'RX_HR_TASK', nameAr: 'خطاب تعريف', category: 'personal_data', destinationHandler: 'none', approvalChainId: types.plain.approvalChainId, isActive: true })
  expectStatus(await typePatch(hrType.id, { executionRole: 'hr' }), 200)
  const letter = expectStatus(await request(hrCreator, 'POST', '/requests', { typeCode: hrType.code, payload: { reason: 'خطاب للموظف' }, submit: true, onBehalfEmployeeId: emps.worker.id }), 201)
  const letterRow = await requestRow(letter.id)
  assert.equal(letterRow.status, 'IN_EXECUTION')
  expectStatus(await taskStatus(hrCreator, letterRow.executionTaskId, { status: 'DONE' }), 201)
  assert.equal((await requestRow(letter.id)).status, 'COMPLETED')

  // مدير النظام (مش من حاملي الدور) بيشتغل على مهمة التنفيذ الواقفة ويقفلها — زي ما بيفكّ أي خطوة اعتماد
  const stuck = await approved(types.device)
  const adminCard = expectStatus(await request(users.admin, 'GET', `/tasks/${stuck.executionTaskId}`), 200)
  assert.deepEqual([adminCard.canWork, adminCard.canManage, adminCard.requestId], [true, false, stuck.id])
  expectStatus(await taskStatus(users.admin, stuck.executionTaskId, { status: 'IN_PROGRESS' }), 201)
  expectStatus(await taskStatus(users.admin, stuck.executionTaskId, { status: 'DONE', proofNote: 'اتنفّذ من الإدارة' }), 201)
  assert.deepEqual([(await requestRow(stuck.id)).status, (await history(stuck.id)).map(row => [row.approverId, row.action])], ['COMPLETED', [[users.manager.id, 'APPROVED'], [users.admin.id, 'EXECUTED']]])
  // ومدير النظام على مهمة عادية زي الأول: «إدارة» مش «شغل»
  const plainTask = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة عادية على دور', assigneeRole: 'it', branchId: org.branchA.id }), 201)
  const adminPlain = expectStatus(await request(users.admin, 'GET', `/tasks/${plainTask.id}`), 200)
  assert.deepEqual([adminPlain.canWork, adminPlain.canManage], [false, true])
  expectStatus(await taskStatus(users.admin, plainTask.id, { status: 'IN_PROGRESS' }), 403)
})

test('RX-11: إثبات مهمة التنفيذ وسبب تعليقها ومين قفلها — للي يقدر يفتح الطلب بس، وملف إثباتها لرافعه', async () => {
  const req = await approved(types.proof)
  const read = async user => expectStatus(await request(user, 'GET', `/tasks/${req.executionTaskId}`), 200)
  // «مستنية» بسبب: حاملي الدور شايفين السبب، وأصحاب «عرض كل المهام» و«إدارة المهام» شايفين الحالة بس
  expectStatus(await taskStatus(users.itA, req.executionTaskId, { status: 'WAITING', note: 'مستني توريد الجهاز' }), 201)
  assert.deepEqual([(await read(users.itA)).statusNote, (await read(users.itA2)).statusNote], ['مستني توريد الجهاز', 'مستني توريد الجهاز'])
  for (const user of [users.viewer, users.tasksAdmin]) assert.deepEqual((({ status, statusNote, requestId }) => [status, statusNote, requestId])(await read(user)), ['WAITING', null, null], user.email)
  // الإقفال بنص وملف: للي قفلها بس
  const file = await upload(users.itA)
  expectStatus(await taskStatus(users.itA, req.executionTaskId, { status: 'DONE', proofNote: 'اتسلّم للموظف في مكتبه', proofFileId: file }), 201)
  const shown = async user => (({ status, proofNote, proofFileId, statusNote, closedByName, requestId, closedAt }) => [status, proofNote, proofFileId, statusNote, closedByName, requestId, !!closedAt])(await read(user))
  assert.deepEqual(await shown(users.itA), ['DONE', 'اتسلّم للموظف في مكتبه', file, null, users.itA.displayName, req.id, true])
  for (const user of [users.itA2, users.viewer, users.tasksAdmin, users.admin]) assert.deepEqual(await shown(user), ['DONE', null, null, null, null, null, true], user.email)
  assert.deepEqual([await download(users.itA, file), await download(users.itA2, file), await download(users.viewer, file), await download(users.tasksAdmin, file), await download(users.admin, file)],
    [200, 404, 404, 404, 404])
  // وسبب رفض التنفيذ على المهمة الملغية: للي رفض بس
  const rejected = await approved(types.reject)
  expectStatus(await request(users.admin, 'POST', `/requests/${rejected.id}/reject-execution`, { comment: 'سبب داخلي' }), 201)
  const cancelled = async user => (({ status, statusNote, closedByName }) => [status, statusNote, closedByName])(expectStatus(await request(user, 'GET', `/tasks/${rejected.executionTaskId}`), 200))
  assert.deepEqual(await cancelled(users.admin), ['CANCELLED', 'اترفض تنفيذ الطلب: سبب داخلي', users.admin.displayName])
  for (const user of [users.itA, users.viewer, users.tasksAdmin]) assert.deepEqual(await cancelled(user), ['CANCELLED', null, null], user.email)
  // مهمة عادية بإثبات: زي الأول، لكل اللي شايفها
  const plain = expectStatus(await request(users.tasksAdmin, 'POST', '/tasks', { title: 'مهمة عادية بإثبات', assigneeRole: 'it', branchId: org.branchA.id, requiresProof: true }), 201)
  const plainFile = await upload(users.itA)
  expectStatus(await taskStatus(users.itA, plain.id, { status: 'DONE', proofNote: 'تم', proofFileId: plainFile }), 201)
  for (const user of [users.itA2, users.viewer, users.tasksAdmin]) {
    const row = expectStatus(await request(user, 'GET', `/tasks/${plain.id}`), 200)
    assert.deepEqual([row.proofNote, row.proofFileId, row.closedByName, await download(user, plainFile)], ['تم', plainFile, users.itA.displayName, 200], user.email)
  }
})

test('RX-12: إقفال المهمة ورفض تنفيذ الطلب في نفس اللحظة — واحد بس بيكسب والتاني بيترفض برسالة، من غير تعليق متبادل', async () => {
  for (let round = 0; round < 2; round++) {
    const req = await approved(types.device)
    // صف المهمة ممسوك: الإقفال بيقف عليه وهو ماسك صف الطلب، ورفض التنفيذ بيقف على صف الطلب (أو العكس) — وبعدها الاتنين بيكمّلوا
    const [close, reject] = await releaseTogether('UPDATE [tasks] SET [title] = [title] WHERE [id] = @0', [req.executionTaskId], 2,
      () => Promise.all([taskStatus(users.itA, req.executionTaskId, { status: 'DONE', proofNote: 'اتنفّذ' }), request(users.admin, 'POST', `/requests/${req.id}/reject-execution`, { comment: 'اترفض' })]))
    assert.deepEqual([close.status, reject.status].sort(), [201, 400], JSON.stringify([close.body, reject.body]))
    const row = await requestRow(req.id), task = await repo('Task').findOneByOrFail({ id: req.executionTaskId })
    assert.deepEqual([row.status, task.status], close.status === 201 ? ['COMPLETED', 'DONE'] : ['REJECTED', 'CANCELLED'])
    assert.deepEqual((await history(req.id)).map(item => item.action), ['APPROVED', close.status === 201 ? 'EXECUTED' : 'REJECTED'])
  }
})
