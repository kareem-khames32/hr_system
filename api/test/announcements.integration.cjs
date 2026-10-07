// B2.16 (أ): الإعلانات — إعلان لفرع مايظهرش لفرع تاني، وتقرير القراءة، وإدارة حساب الفروع لإعلانات فروعه بس، وإشعار «إعلان جديد»
// (وقت التوزيع، ووقت الإرسال، وفي القايمة). HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
// ولا رسالة بريد حقيقية: send متبدّلة على النسخة نفسها.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_announcements_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-announcements-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const { NOTIFICATIONS_EMAIL_ENABLED_KEY, NOTIFICATIONS_QUIET_HOURS_KEY } = require('../src/notifications/notifications.service')
const rules = require('../src/announcements/announcement-rules')
let app, ds, master, base, queue, modules, created = false, today
const outbox = []
const U = {}, E = {}, B = {}, A = {}, D = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const query = (text, params) => { assert.equal(ds.options.database, database); return ds.query(text, params) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, ...(user.scopeAllBranches === true ? { scopeAllBranches: true } : {}),
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const branches = (...list) => ({ mode: 'all', ids: [], where: { mode: 'branches', ids: list.map(branch => branch.id).sort((a, b) => a - b) } })
const draft = (title, audience, extra = {}) => ({ title, body: `نص ${title}`, audience, ...extra })
const make = async (user, title, audience, extra) => expect(await call(user, 'POST', '/announcements', draft(title, audience, extra)), 201)
const publish = async (user, row) => expect(await call(user, 'POST', `/announcements/${row.id}/publish`), 201)
const board = async user => expect(await call(user, 'GET', '/announcements/board'), 200)
const titles = async user => (await board(user)).items.map(item => item.title)
const rowOf = id => repo('Announcement').findOneByOrFail({ id })
const reads = () => repo('AnnouncementRead').count()
const setting = async (key, value) => {
  const configs = repo('RequestsConfig'), found = await configs.findOne({ where: { key } })
  await configs.save({ ...(found ?? {}), key, value })
}
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
const events = async id => (await query(`SELECT [eventKey] FROM [outbox_events] WHERE [eventType] = N'ANNOUNCEMENT_PUBLISHED' AND [entityId] = @0`, [String(id)])).map(row => row.eventKey)
const notified = async id => (await query(`SELECT n.[recipientUserId], n.[eventCode], n.[category], n.[kind], n.[inApp], n.[title], n.[body], n.[link] FROM [notifications] n
  WHERE n.[entityType] = N'announcement' AND n.[entityId] = @0 ORDER BY n.[recipientUserId]`, [String(id)]))
const mailsOf = async id => (await query(`SELECT d.[status], d.[detail], n.[recipientUserId] FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
  WHERE n.[entityType] = N'announcement' AND n.[entityId] = @0 AND d.[channel] = N'EMAIL' ORDER BY n.[recipientUserId]`, [String(id)])).map(row => [row.recipientUserId, row.status, row.detail])
const makeDue = id => query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'
  AND JSON_VALUE([payload], '$.deliveryId') IN (SELECT CAST(d.[id] AS nvarchar(20)) FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
    WHERE n.[entityId] = @0 AND n.[entityType] = N'announcement')`, [String(id)])
const inApp = async user => {
  const listed = expect(await call(user, 'GET', '/notifications'), 200)
  return (listed.items ?? listed).filter(item => item.category === 'announcement')
}
const ids = (...users) => users.map(user => user.id).sort((a, b) => a - b)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_announcements_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  today = localDateOf(new Date())
  B.a = await repo('Branch').save({ code: 'ANA', name: 'فرع الإعلانات أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'ANB', name: 'فرع الإعلانات ب', country: 'EG', weekendDays: 'FRI' })
  let n = 0
  const employee = async (key, branch, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `AN${String(++n).padStart(3, '0')}`, fullName: `موظف إعلانات ${key}`,
    branchId: branch.id, status: 'active', isActive: true, joinDate: '2024-01-01', ...extra }) }
  await employee('a1', B.a); await employee('a2', B.a); await employee('head', B.a); await employee('quiet', B.a)
  await employee('b1', B.b); await employee('b2', B.b); await employee('gone', B.a, { status: 'archived', isActive: false })
  D.dep = await repo('Department').save({ branchId: B.a.id, name: 'قسم الإعلانات', managerEmployeeId: E.head.id })
  await repo('Employee').update({ id: E.head.id }, { departmentId: D.dep.id })
  const account = (key, role, permissions, extra = {}) => repo('User').save({ email: `${key}@announcements.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'])
  // مدير نظام مربوط بموظف في الفرع (ب): على اللوحة موظف زي غيره
  await account('root', 'super_admin', ['*'], { employeeId: E.b2.id })
  await account('hr', 'employee', ['announcements.manage'], { scopeAllBranches: true })
  await account('hrA', 'employee', ['announcements.manage'], { branchId: B.a.id })
  await account('a1', 'employee', [], { branchId: B.a.id, employeeId: E.a1.id })
  await account('a2', 'employee', [], { branchId: B.a.id, employeeId: E.a2.id })
  await account('head', 'employee', [], { branchId: B.a.id, employeeId: E.head.id })
  await account('b1', 'employee', [], { branchId: B.b.id, employeeId: E.b1.id })
  await account('gone', 'employee', [], { branchId: B.a.id, employeeId: E.gone.id })
  await account('plain', 'employee', [], { branchId: B.a.id })
  await setting(NOTIFICATIONS_EMAIL_ENABLED_KEY, 'true')
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_announcements_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-announcements-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار الإعلانات')
})

test('AN-01: the module is closed until opened; a draft is judged field by field; a branch account manages announcements of its own branches only', async () => {
  // الموديول مقفول افتراضيًا: ولا مسار موجود (حتى لمدير النظام)
  for (const [user, method, route, body] of [[U.a1, 'GET', '/announcements/board'], [U.admin, 'GET', '/announcements'], [U.admin, 'POST', '/announcements', draft('قبل الفتح', null)],
    [U.a1, 'POST', '/announcements/1/read']]) expect(await call(user, method, route, body), 404)
  assert.equal(await repo('Announcement').count(), 0)
  expect(await call(U.admin, 'PUT', '/modules/announcements', { enabled: true }), 200)
  modules.invalidate()
  assert.deepEqual(await board(U.a1), { available: true, items: [] })

  // مسودة لفرع (أ): العنوان بيتنضّف، والتواريخ الافتراضية، والجمهور بصيغته
  A.a = expect(await call(U.admin, 'POST', '/announcements', { title: '  إعلان   فرع أ ', body: ' نص فرع أ\nسطر تاني ', audience: branches(B.a), requiresRead: true }), 201)
  assert.deepEqual([A.a.title, A.a.body, A.a.status, A.a.publishDate, A.a.expiryDate, A.a.pinned, A.a.requiresRead, A.a.audience, A.a.publishedAt],
    ['إعلان فرع أ', 'نص فرع أ\nسطر تاني', 'DRAFT', today, null, false, true, branches(B.a), null])
  // المسودة مش على اللوحة، ولا بتتسجّل قراءتها
  assert.deepEqual(await titles(U.a1), [])
  assert.deepEqual(answer(await call(U.a1, 'POST', `/announcements/${A.a.id}/read`)), [404, rules.ANNOUNCEMENT_NOT_FOUND])
  // كل قيمة بتتحكم: عنوان ونص وتواريخ وجمهور وعلامتين
  const bad = [{ title: 'x', body: 'نص' }, { title: 'عنوان', body: '   ' }, { title: 'عنوان' }, { body: 'نص' }, { title: 'ع'.repeat(201), body: 'نص' }, { title: 'عنوان', body: 'ن'.repeat(4001) },
    { title: 'عنوان', body: 'نص', publishDate: '2026-13-01' }, { title: 'عنوان', body: 'نص', publishDate: 'بكرة' }, { title: 'عنوان', body: 'نص', publishDate: today, expiryDate: addDays(today, -1) },
    { title: 'عنوان', body: 'نص', expiryDate: '2026-02-30' }, { title: 'عنوان', body: 'نص', audience: 'all' }, { title: 'عنوان', body: 'نص', audience: [1] },
    { title: 'عنوان', body: 'نص', audience: { mode: 'everyone' } }, { title: 'عنوان', body: 'نص', audience: { mode: 'roles', ids: [] } },
    { title: 'عنوان', body: 'نص', audience: { mode: 'all', where: { mode: 'branches', ids: [] } } }, { title: 'عنوان', body: 'نص', audience: { mode: 'all', where: { mode: 'floors', ids: [1] } } },
    { title: 'عنوان', body: 'نص', audience: { mode: 'all', where: { mode: 'branches', ids: ['x', 0, -3] } } },
    // شروط الصفات مش من جمهور الإعلان: مرفوضة بدل ما تتشال بصمت والإعلان يطلع لجمهور أوسع
    { title: 'عنوان', body: 'نص', audience: { mode: 'all', ids: [], conditions: [{ field: 'nationality', values: ['SAUDI'] }] } },
    { title: 'عنوان', body: 'نص', pinned: 'yes' }, { title: 'عنوان', body: 'نص', requiresRead: 1 }]
  for (const body of bad) expect(await call(U.admin, 'POST', '/announcements', body), 400)
  assert.equal(await repo('Announcement').count(), 1)
  // «الكل» في «كل الشركة» = من غير جمهور محفوظ
  A.all = await make(U.hr, 'إعلان الشركة', { mode: 'all', ids: [], where: { mode: 'company', ids: [] } })
  assert.deepEqual([A.all.audience, (await rowOf(A.all.id)).audience], [null, null])
  A.b = await make(U.admin, 'إعلان فرع ب', branches(B.b))
  A.heads = await make(U.admin, 'إعلان رؤساء الأقسام', { mode: 'positions', ids: ['DEPARTMENT_MANAGERS'] })

  // من غير صلاحية الإدارة: ولا مسار إدارة، واللوحة مفتوحة
  for (const user of [U.a1, U.plain]) {
    for (const [method, route, body] of [['GET', '/announcements'], ['POST', '/announcements', draft('من غير صلاحية', null)], ['PATCH', `/announcements/${A.a.id}`, { title: 'تعديل' }],
      ['POST', `/announcements/${A.a.id}/publish`], ['POST', `/announcements/${A.a.id}/withdraw`], ['GET', `/announcements/${A.a.id}/report`]]) {
      expect(await call(user, method, route, body), 403)
    }
  }
  assert.deepEqual(await board(U.plain), { available: true, items: [] })

  // حساب الفروع: جمهوره «فروع محددة» من نطاقه بس
  for (const audience of [null, undefined, branches(B.b), branches(B.a, B.b), { mode: 'all', ids: [], where: { mode: 'departments', ids: [D.dep.id] } },
    { mode: 'positions', ids: ['DEPARTMENT_MANAGERS'] }]) {
    assert.deepEqual(answer(await call(U.hrA, 'POST', '/announcements', draft('برّه النطاق', audience))), [403, rules.ANNOUNCEMENT_BRANCH_AUDIENCE])
  }
  A.mine = await make(U.hrA, 'إعلان مدير الفرع', branches(B.a), { pinned: false })
  // وبيشوف وبيدير اللي جمهوره جوه نطاقه بس؛ الباقي = نفس رد رقم مش موجود، ومابيتلمسش
  assert.deepEqual(expect(await call(U.hrA, 'GET', '/announcements'), 200).items.map(item => item.id), [A.mine.id, A.a.id])
  assert.deepEqual(expect(await call(U.hr, 'GET', '/announcements'), 200).items.map(item => item.id), [A.mine.id, A.heads.id, A.b.id, A.all.id, A.a.id])
  for (const id of [A.b.id, A.all.id, A.heads.id, 999999]) {
    for (const [method, route, body] of [['PATCH', `/announcements/${id}`, { title: 'اتغيّر' }], ['POST', `/announcements/${id}/publish`], ['POST', `/announcements/${id}/withdraw`],
      ['GET', `/announcements/${id}/report`]]) {
      assert.deepEqual(answer(await call(U.hrA, method, route, body)), [404, rules.ANNOUNCEMENT_NOT_FOUND], `${method} ${route}`)
    }
  }
  assert.deepEqual((await repo('Announcement').find({ order: { id: 'ASC' } })).map(row => [row.title, row.status]),
    [['إعلان فرع أ', 'DRAFT'], ['إعلان الشركة', 'DRAFT'], ['إعلان فرع ب', 'DRAFT'], ['إعلان رؤساء الأقسام', 'DRAFT'], ['إعلان مدير الفرع', 'DRAFT']])
  // تعديل المسودة بالحقول المبعوتة بس؛ ومايقدرش يطلّع جمهورها برّه نطاقه
  const edited = expect(await call(U.hrA, 'PATCH', `/announcements/${A.mine.id}`, { title: 'إعلان مدير الفرع (معدّل)', expiryDate: addDays(today, 10) }), 200)
  assert.deepEqual([edited.title, edited.body, edited.expiryDate, edited.audience, edited.status], ['إعلان مدير الفرع (معدّل)', 'نص إعلان مدير الفرع', addDays(today, 10), branches(B.a), 'DRAFT'])
  assert.deepEqual(answer(await call(U.hrA, 'PATCH', `/announcements/${A.mine.id}`, { audience: branches(B.b) })), [403, rules.ANNOUNCEMENT_BRANCH_AUDIENCE])
  assert.deepEqual(answer(await call(U.hrA, 'PATCH', `/announcements/${A.mine.id}`, { audience: null })), [403, rules.ANNOUNCEMENT_BRANCH_AUDIENCE])
  expect(await call(U.hrA, 'PATCH', `/announcements/${A.mine.id}`, { expiryDate: addDays(today, -2) }), 400)
  assert.deepEqual(JSON.parse((await rowOf(A.mine.id)).audience), branches(B.a))
  // سطر تدقيق لكل إنشاء
  assert.equal(await repo('AuditLog').count({ where: { action: 'ANNOUNCEMENT_CREATED' } }), 5)
})

test('AN-02: an announcement for one branch does not show to another branch; pinned first; reading is recorded once by the employee himself', async () => {
  expect(await call(U.hr, 'PATCH', `/announcements/${A.all.id}`, { pinned: true }), 200)
  const published = await publish(U.admin, A.a)
  assert.deepEqual([published.status, typeof published.publishedAt], ['PUBLISHED', 'string'])
  await publish(U.admin, A.b); await publish(U.hr, A.all); await publish(U.admin, A.heads); await publish(U.hrA, A.mine)
  // منشور بتاريخ بكرة: مش على اللوحة النهارده، ومن غير حدث إشعار؛ ومنشور انتهى امبارح: مش على اللوحة
  A.future = await publish(U.admin, await make(U.admin, 'إعلان بكرة', branches(B.a), { publishDate: addDays(today, 1) }))
  A.expired = await publish(U.admin, await make(U.admin, 'إعلان انتهى', branches(B.a), { publishDate: addDays(today, -5), expiryDate: addDays(today, -1) }))
  A.draft = await make(U.admin, 'مسودة لسه', branches(B.a))
  assert.deepEqual([await events(A.a.id), await events(A.future.id)], [[`announcement-published:${A.a.id}`], []])
  // المنشور مابيتعدّلش (اتقري بنصه)، ومابيتنشرش تاني
  assert.deepEqual(answer(await call(U.admin, 'PATCH', `/announcements/${A.a.id}`, { title: 'عنوان تاني' })), [400, rules.ANNOUNCEMENT_NOT_DRAFT])
  expect(await call(U.admin, 'POST', `/announcements/${A.a.id}/publish`), 400)
  assert.equal((await rowOf(A.a.id)).title, 'إعلان فرع أ')

  // اللوحة: المثبّت أولًا ثم الأحدث؛ وكل موظف بيشوف اللي هو في جمهوره بس
  assert.deepEqual(await titles(U.a1), ['إعلان الشركة', 'إعلان مدير الفرع (معدّل)', 'إعلان فرع أ'])
  assert.deepEqual(await titles(U.head), ['إعلان الشركة', 'إعلان مدير الفرع (معدّل)', 'إعلان رؤساء الأقسام', 'إعلان فرع أ'])
  assert.deepEqual(await titles(U.b1), ['إعلان الشركة', 'إعلان فرع ب'])
  assert.doesNotMatch(JSON.stringify(await board(U.b1)), /فرع أ|مدير الفرع|رؤساء الأقسام|بكرة|انتهى|مسودة/, 'ولا عنوان ولا نص من إعلانات فرع تاني')
  // مدير النظام المربوط بموظف في (ب): اللي لموظفه بس؛ وحساب من غير موظف، وحساب موظف مؤرشف: لوحة فاضية
  assert.deepEqual(await titles(U.root), ['إعلان الشركة', 'إعلان فرع ب'])
  for (const user of [U.admin, U.hr, U.hrA, U.plain, U.gone]) assert.deepEqual(await board(user), { available: true, items: [] })
  const first = (await board(U.a1)).items[0]
  assert.deepEqual(Object.keys(first).sort(), ['body', 'expiryDate', 'id', 'pinned', 'publishDate', 'read', 'readAt', 'requiresRead', 'title'], 'من غير جمهور ولا حالة ولا مين كتبه')
  assert.deepEqual([first.pinned, first.read, first.readAt, first.publishDate], [true, false, null, today])

  // «أقرّ بالقراءة»: الموظف لنفسه، لإعلان ساري هو في جمهوره، ومرة واحدة
  const read = expect(await call(U.a1, 'POST', `/announcements/${A.a.id}/read`), 201)
  assert.equal(read.read, true)
  assert.deepEqual(expect(await call(U.a1, 'POST', `/announcements/${A.a.id}/read`), 201), read, 'المرة التانية بترجّع نفس الوقت')
  const [twice, again] = await Promise.all([call(U.a2, 'POST', `/announcements/${A.a.id}/read`), call(U.a2, 'POST', `/announcements/${A.a.id}/read`)])
  assert.deepEqual([twice.status, again.status, twice.body.readAt], [201, 201, again.body.readAt])
  assert.deepEqual((await repo('AnnouncementRead').find({ order: { employeeId: 'ASC' } })).map(row => [row.announcementId, row.employeeId, row.userId]),
    [[A.a.id, E.a1.id, U.a1.id], [A.a.id, E.a2.id, U.a2.id]])
  assert.deepEqual((await board(U.a1)).items.map(item => [item.title, item.read]), [['إعلان الشركة', false], ['إعلان مدير الفرع (معدّل)', false], ['إعلان فرع أ', true]])
  // إعلان مش للحساب (فرع تاني، منصب مش منصبه، لسه ماجاش يومه، انتهى، مسودة) أو حساب من غير موظف = نفس رد رقم مش موجود، ومن غير صف
  const before = await reads()
  for (const [user, id] of [[U.b1, A.a.id], [U.a1, A.b.id], [U.a1, A.heads.id], [U.a1, A.future.id], [U.a1, A.expired.id], [U.a1, A.draft.id], [U.a1, 999999], [U.admin, A.a.id],
    [U.hrA, A.a.id], [U.gone, A.a.id], [U.root, A.a.id]]) {
    assert.deepEqual(answer(await call(user, 'POST', `/announcements/${id}/read`)), [404, rules.ANNOUNCEMENT_NOT_FOUND], `${user.email} → ${id}`)
  }
  assert.equal(await reads(), before)

  // موظف اتنقل لفرع (ب): لوحته بقت لوحة (ب) — وإعلان فرعه القديم مابقاش يتسجّل له قراءة
  await repo('Employee').update({ id: E.a2.id }, { branchId: B.b.id })
  assert.deepEqual(await titles(U.a2), ['إعلان الشركة', 'إعلان فرع ب'])
  assert.deepEqual(answer(await call(U.a2, 'POST', `/announcements/${A.mine.id}/read`)), [404, rules.ANNOUNCEMENT_NOT_FOUND])
  await repo('Employee').update({ id: E.a2.id }, { branchId: B.a.id })

  // السحب: الإعلان بيختفي من اللوحة ومابيتسجّلش له قراءة، وقراءاته القديمة بتفضل
  expect(await call(U.b1, 'POST', `/announcements/${A.b.id}/read`), 201)
  const withdrawn = expect(await call(U.admin, 'POST', `/announcements/${A.b.id}/withdraw`), 201)
  assert.equal(withdrawn.status, 'WITHDRAWN')
  assert.deepEqual(await titles(U.b1), ['إعلان الشركة'])
  assert.deepEqual(answer(await call(U.root, 'POST', `/announcements/${A.b.id}/read`)), [404, rules.ANNOUNCEMENT_NOT_FOUND])
  for (const route of [`/announcements/${A.b.id}/withdraw`, `/announcements/${A.b.id}/publish`, `/announcements/${A.draft.id}/withdraw`]) expect(await call(U.admin, 'POST', route), 400)
  assert.equal(await repo('AnnouncementRead').count({ where: { announcementId: A.b.id } }), 1)
  assert.deepEqual([await repo('AuditLog').count({ where: { action: 'ANNOUNCEMENT_PUBLISHED' } }), await repo('AuditLog').count({ where: { action: 'ANNOUNCEMENT_WITHDRAWN' } })], [7, 1])

  // نص جمهور اتغيّر برّه الكاتب (تالف): الإعلان مش لحد — مش «للكل» زي مقيّم الجمهور
  const intact = (await rowOf(A.a.id)).audience
  for (const broken of ['{bad json', '{"mode":"all","ids":[],"where":{"mode":"branches","ids":[]}}', '{"mode":"everyone","ids":[]}', '']) {
    await repo('Announcement').update({ id: A.a.id }, { audience: broken })
    assert.deepEqual([await titles(U.b1), (await titles(U.a1)).includes('إعلان فرع أ')], [['إعلان الشركة'], false], broken)
  }
  await repo('Announcement').update({ id: A.a.id }, { audience: intact })
  assert.equal((await titles(U.a1)).includes('إعلان فرع أ'), true)
})

test('AN-03: the read report lists the announcement audience inside the reader\'s branches — who read and when, and who has not', async () => {
  // إعلان الفرع (أ): جمهوره موظفين (أ) الحاليين (المؤرشف لأ)، ومين قرا منهم
  const report = expect(await call(U.hrA, 'GET', `/announcements/${A.a.id}/report`), 200)
  assert.deepEqual(report.summary, { audience: 4, read: 2 })
  assert.deepEqual(report.rows.map(row => [row.employeeId, row.employeeCode, row.fullName, row.branchName, row.readAt !== null]),
    [[E.a1.id, E.a1.employeeCode, 'موظف إعلانات a1', 'فرع الإعلانات أ', true], [E.a2.id, E.a2.employeeCode, 'موظف إعلانات a2', 'فرع الإعلانات أ', true],
      [E.head.id, E.head.employeeCode, 'موظف إعلانات head', 'فرع الإعلانات أ', false], [E.quiet.id, E.quiet.employeeCode, 'موظف إعلانات quiet', 'فرع الإعلانات أ', false]])
  assert.deepEqual([report.announcement.id, report.announcement.status, report.announcement.requiresRead], [A.a.id, 'PUBLISHED', true])
  // حساب الشركة: إعلان الشركة بكل الموظفين الحاليين، وإعلان المنصب بأصحابه بس، والمسحوب بقراءاته
  const company = expect(await call(U.hr, 'GET', `/announcements/${A.all.id}/report`), 200)
  assert.deepEqual([company.summary, company.rows.map(row => row.employeeId)], [{ audience: 6, read: 0 }, [E.a1.id, E.a2.id, E.head.id, E.quiet.id, E.b1.id, E.b2.id]])
  assert.deepEqual(expect(await call(U.admin, 'GET', `/announcements/${A.heads.id}/report`), 200).rows.map(row => row.employeeId), [E.head.id])
  const gone = expect(await call(U.admin, 'GET', `/announcements/${A.b.id}/report`), 200)
  assert.deepEqual([gone.announcement.status, gone.summary, gone.rows.map(row => [row.employeeId, row.readAt !== null])],
    ['WITHDRAWN', { audience: 2, read: 1 }, [[E.b1.id, true], [E.b2.id, false]]])
  // إعلان الشركة وإعلان فرع تاني برّه إدارة حساب الفرع: تقريرهم مش موجود له (ولا أسماء موظفين برّه فروعه)
  for (const id of [A.all.id, A.b.id, A.heads.id]) assert.deepEqual(answer(await call(U.hrA, 'GET', `/announcements/${id}/report`)), [404, rules.ANNOUNCEMENT_NOT_FOUND])
  assert.doesNotMatch(JSON.stringify(report), /موظف إعلانات (b1|b2|gone)|فرع الإعلانات ب/)
  // موظف اتنقل برّه جمهور الإعلان: مابقاش في تقريره (الجمهور بحالته دلوقتي)
  await repo('Employee').update({ id: E.quiet.id }, { branchId: B.b.id })
  assert.deepEqual(expect(await call(U.hrA, 'GET', `/announcements/${A.a.id}/report`), 200).summary, { audience: 3, read: 2 })
  await repo('Employee').update({ id: E.quiet.id }, { branchId: B.a.id })
})

test('AN-04: publishing notifies the audience accounts once, judged again when the mail leaves and when the list is read', async () => {
  // أحداث الإعلانات اللي اتنشرت في AN-02 لسه ماتوزّعتش: المسحوب والمنتهي مايطلعش عنهم حاجة
  outbox.length = 0
  await drain()
  assert.deepEqual([await notified(A.b.id), await notified(A.expired.id), await notified(A.future.id)], [[], [], []])
  // إعلان الفرع (أ): لحسابات موظفين (أ) الحاليين بس — جوه النظام وبالبريد، بعنوانه ومن غير نصه
  const rows = await notified(A.a.id)
  assert.deepEqual(rows.map(row => row.recipientUserId), ids(U.a1, U.a2, U.head))
  assert.deepEqual([...new Set(rows.map(row => [row.eventCode, row.category, row.kind, row.inApp, row.title, row.body, row.link].join('|')))],
    ['announcement.published|announcement|info|true|إعلان جديد|إعلان فرع أ|/announcements'])
  assert.deepEqual((await mailsOf(A.a.id)).map(row => row[1]), ['SENT', 'SENT', 'SENT'])
  const mine = outbox.filter(message => message.to === U.a1.email).map(message => message.subject).sort()
  assert.deepEqual(mine, ['إعلان جديد: إعلان الشركة', 'إعلان جديد: إعلان فرع أ', 'إعلان جديد: إعلان مدير الفرع (معدّل)'])
  const mail = outbox.find(message => message.to === U.a1.email && message.subject === 'إعلان جديد: إعلان فرع أ')
  assert.match(mail.text, /https:\/\/hr\.example\.invalid\/announcements/)
  assert.doesNotMatch(mail.text, /نص فرع أ|سطر تاني/, 'الرسالة بالعنوان واللينك — نص الإعلان على اللوحة')
  // ولا رسالة لفرع تاني عن إعلان فرع، ولا لحساب من غير موظف أو لموظف مؤرشف
  const sentTo = email => outbox.filter(message => message.to === email).map(message => message.subject).sort()
  assert.deepEqual(sentTo(U.b1.email), ['إعلان جديد: إعلان الشركة'])
  for (const user of [U.admin, U.hr, U.hrA, U.plain, U.gone]) assert.deepEqual(sentTo(user.email), [])
  assert.deepEqual((await notified(A.heads.id)).map(row => row.recipientUserId), [U.head.id])
  // نفس الحدث تاني (مهمة اتعادت): ولا إشعار زيادة
  const total = async () => Number((await query(`SELECT COUNT(*) AS [n] FROM [notifications] WHERE [entityType] = N'announcement'`))[0].n)
  const count = await total()
  await drain()
  assert.equal(await total(), count)
  // القايمة جوه النظام: «إعلان جديد» بعنوانه، ولكل حساب إعلاناته بس
  assert.deepEqual((await inApp(U.b1)).map(item => [item.title, item.body, item.link, item.kind]), [['إعلان جديد', 'إعلان الشركة', '/announcements', 'info']])
  assert.deepEqual((await inApp(U.a1)).map(item => item.body).sort(), ['إعلان الشركة', 'إعلان فرع أ', 'إعلان مدير الفرع (معدّل)'])
  assert.deepEqual(await inApp(U.admin), [])

  // إعلان اتسحب قبل ما حدثه يتوزّع: ولا إشعار
  const early = await publish(U.admin, await make(U.admin, 'اتسحب بدري', branches(B.a)))
  expect(await call(U.admin, 'POST', `/announcements/${early.id}/withdraw`), 201)
  await drain()
  assert.deepEqual(await notified(early.id), [])

  // وقت الإرسال (البريد متأجّل بساعات الهدوء): الحكم بيتعاد — موظف اتنقل برّه الجمهور مابيتبعتلوش، وإعلان اتسحب مابيتبعتش لحد
  const minuteNow = new Date().getHours() * 60 + new Date().getMinutes()
  const clock = offset => { const minute = (((minuteNow + offset) % 1440) + 1440) % 1440; return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}` }
  await setting(NOTIFICATIONS_QUIET_HOURS_KEY, `${clock(-60)}-${clock(120)}`)
  outbox.length = 0
  const moved = await publish(U.admin, await make(U.admin, 'إعلان قبل النقل', branches(B.a)))
  const pulled = await publish(U.admin, await make(U.admin, 'إعلان هيتسحب', branches(B.a)))
  await drain()
  assert.deepEqual([(await mailsOf(moved.id)).map(row => row[1]), (await mailsOf(pulled.id)).map(row => row[1]), outbox.length], [['PENDING', 'PENDING', 'PENDING'], ['PENDING', 'PENDING', 'PENDING'], 0])
  assert.equal((await inApp(U.a2)).some(item => item.body === 'إعلان قبل النقل'), true)
  try {
    await repo('Employee').update({ id: E.a2.id }, { branchId: B.b.id })
    expect(await call(U.admin, 'POST', `/announcements/${pulled.id}/withdraw`), 201)
    await setting(NOTIFICATIONS_QUIET_HOURS_KEY, '')
    await makeDue(moved.id); await makeDue(pulled.id)
    await drain()
    const STALE = 'الإعلان مابقاش ساري أو الحساب مابقاش في جمهوره'
    assert.deepEqual(await mailsOf(moved.id), [[U.a1.id, 'SENT', null], [U.a2.id, 'SKIPPED', STALE], [U.head.id, 'SENT', null]].sort((a, b) => a[0] - b[0]))
    assert.deepEqual((await mailsOf(pulled.id)).map(row => [row[1], row[2]]), [['SKIPPED', STALE], ['SKIPPED', STALE], ['SKIPPED', STALE]])
    assert.deepEqual(outbox.map(message => [message.to, message.subject]).sort(), [[U.a1.email, 'إعلان جديد: إعلان قبل النقل'], [U.head.email, 'إعلان جديد: إعلان قبل النقل']].sort())
    // والقايمة جوه النظام بنفس الحكم: المنقول مابقاش شايف عنوان إعلان فرعه القديم، والمسحوب اختفى عند الكل
    const bodies = async user => (await inApp(user)).map(item => item.body)
    assert.deepEqual([(await bodies(U.a2)).includes('إعلان قبل النقل'), (await bodies(U.a2)).includes('إعلان فرع أ'), (await bodies(U.a2)).includes('إعلان الشركة')], [false, false, true])
    assert.deepEqual([(await bodies(U.a1)).includes('إعلان قبل النقل'), (await bodies(U.a1)).includes('إعلان هيتسحب')], [true, false])
  } finally {
    await repo('Employee').update({ id: E.a2.id }, { branchId: B.a.id })
    await setting(NOTIFICATIONS_QUIET_HOURS_KEY, '')
  }
  // الصفوف المخزّنة زي ما هي (الحجب وقت القراءة مش مسح): المنقول رجع فرعه فرجع يشوف إشعاره
  assert.equal((await inApp(U.a2)).some(item => item.body === 'إعلان قبل النقل'), true)

  // الموديول اتقفل: ولا مسار، ولا إشعار إعلان في القايمة
  expect(await call(U.admin, 'PUT', '/modules/announcements', { enabled: false }), 200)
  modules.invalidate()
  expect(await call(U.a1, 'GET', '/announcements/board'), 404)
  assert.deepEqual(await inApp(U.a1), [])
  expect(await call(U.admin, 'PUT', '/modules/announcements', { enabled: true }), 200)
  modules.invalidate()
  assert.equal((await inApp(U.a1)).length > 0, true)
})
