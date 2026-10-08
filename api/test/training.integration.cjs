'use strict'
// B3.9: التدريب على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_training_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
// ولا رسالة بريد حقيقية.
//  TR-01) الموديول مقفول افتراضيًا (404)؛ الكتالوج: القيم (الاسم، النوع، الرابط، المدة، صلاحية الشهادة) والتعديل بالخانات؛ الجلسات: القيم ونطاق
//         الفروع (جلسة «كل الشركة» لحساب من غير قيد فروع بس، وجلسة فرع تاني = غير موجودة).
//  TR-02) التسجيل تحت قفل الجلسة: موظفين نطاق الحساب الشغالين بس، والمسجّل بيتعدّى، والسعة بتتحترم حتى مع تسجيلين مع بعض؛ الحضور والإكمال؛
//         «أكمل» لدورة بشهادة بيسجّل مستند موظف «شهادة تدريب» بانتهائه؛ المقفول مابيتغيّرش؛ الحكم بفرع الموظف الحالي.
//  TR-03) الموظف: «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره.
// Run (من api/): node --test test/training.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_training_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_training_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-training-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/training/training-rules')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `TR${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف التدريب ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@training.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const course = (extra = {}) => ({ name: 'السلامة المهنية', kind: 'INTERNAL', durationHours: 8, provider: 'إدارة السلامة', givesCertificate: true, certificateValidMonths: 12, ...extra })
const session = (extra = {}) => ({ courseId: state.course, branchId: org.branchA.id, startDate: '2026-11-01', endDate: '2026-11-02', location: 'قاعة 1', trainer: 'م. سامي', capacity: 2, costPerSeat: '350.5', ...extra })
const T = '/training'

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
  for (const cron of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) cron.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()

  org.branchA = await repo('Branch').save({ code: 'TR_A', name: 'فرع التدريب أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'TR_B', name: 'فرع التدريب ب السري', country: 'SA' })
  emps.a1 = await employee({ fullName: 'متدرب أول' })
  emps.a2 = await employee({ fullName: 'متدرب تاني' })
  emps.a3 = await employee({ fullName: 'متدرب تالت' })
  emps.gone = await employee({ fullName: 'موظف منتهي', status: 'terminated', isActive: false })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@training.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.hrA = await account('hr-a', ['training.manage'])
  users.hrB = await account('hr-b', ['training.manage'], { branchId: org.branchB.id })
  users.a1 = await account('a1', [], { employeeId: emps.a1.id })
  users.a2 = await account('a2', [], { employeeId: emps.a2.id })
  users.nobody = await account('nobody', [])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('TR-01: الموديول مقفول افتراضيًا؛ الكتالوج بقيمه وتعديله بالخانات؛ والجلسات بقيمها ونطاق الفروع', async () => {
  assert.deepEqual([(await request(users.hrA, 'GET', T + '/courses')).status, (await request(users.a1, 'GET', T + '/mine')).status], [404, 404], 'مقفول لحد ما الشركة تفتحه')
  expectStatus(await request(users.admin, 'PUT', '/modules/training', { enabled: true }), 200); modules.invalidate()
  assert.deepEqual([(await request(users.nobody, 'GET', T + '/courses')).status, (await request(users.a1, 'POST', T + '/courses', course())).status, (await request(users.a1, 'GET', T + '/sessions')).status], [403, 403, 403])

  for (const [change, message] of [[{ name: 'اب' }, rules.TRAINING_NAME], [{ kind: 'LIVE' }, rules.TRAINING_KIND], [{ kind: 'ONLINE' }, rules.TRAINING_URL], [{ url: 'ftp://x' }, rules.TRAINING_URL],
    [{ durationHours: 0.1 }, rules.TRAINING_DURATION], [{ durationHours: '8.555' }, rules.TRAINING_DURATION], [{ certificateValidMonths: 0 }, rules.TRAINING_VALID_MONTHS], [{ certificateValidMonths: 121 }, rules.TRAINING_VALID_MONTHS],
    [{ givesCertificate: false, certificateValidMonths: 12 }, rules.TRAINING_VALID_MONTHS], [{ givesCertificate: 'yes' }, 'بتطلّع شهادة: نعم أو لا']]) {
    assert.deepEqual(answer(await request(users.hrA, 'POST', T + '/courses', course(change))), [400, message], JSON.stringify(change))
  }
  assert.equal(await repo('TrainingCourse').count(), 0)
  const made = expectStatus(await request(users.hrA, 'POST', T + '/courses', course({ name: '  السلامة   المهنية ' })), 201)
  assert.deepEqual([made.name, made.kind, made.kindLabel, made.durationHours, made.provider, made.givesCertificate, made.certificateValidMonths, made.isActive, made.url],
    ['السلامة المهنية', 'INTERNAL', 'داخلي', 8, 'إدارة السلامة', true, 12, true, null])
  state.course = made.id
  const online = expectStatus(await request(users.hrA, 'POST', T + '/courses', { name: 'مهارات العرض', kind: 'ONLINE', url: 'https://learn.example.invalid/c/1' }), 201)
  assert.deepEqual([online.givesCertificate, online.certificateValidMonths, online.url], [false, null, 'https://learn.example.invalid/c/1'])
  state.plain = online.id
  // التعديل بالخانات اللي اتبعتت بس؛ وإلغاء الشهادة بيشيل صلاحيتها؛ والأونلاين مايتشالش رابطه
  const renamed = expectStatus(await request(users.hrA, 'PATCH', T + `/courses/${made.id}`, { provider: 'جهة خارجية' }), 200)
  assert.deepEqual([renamed.name, renamed.provider, renamed.certificateValidMonths, renamed.durationHours], ['السلامة المهنية', 'جهة خارجية', 12, 8])
  assert.deepEqual([answer(await request(users.hrA, 'PATCH', T + `/courses/${online.id}`, { url: null })), answer(await request(users.hrA, 'PATCH', T + '/courses/987654', { name: 'دورة تانية' }))],
    [[400, rules.TRAINING_URL], [404, rules.TRAINING_COURSE_NOT_FOUND]])
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', T + '/courses'), 200).courses.map(row => row.name), ['مهارات العرض', 'السلامة المهنية'])

  // الجلسات: القيم
  for (const [change, message] of [[{ startDate: '2026-11-03' }, rules.TRAINING_DATES], [{ endDate: '2026-02-31' }, rules.TRAINING_DATES], [{ capacity: 0 }, rules.TRAINING_CAPACITY], [{ capacity: 2.5 }, rules.TRAINING_CAPACITY],
    [{ costPerSeat: '-5' }, rules.TRAINING_COST], [{ costPerSeat: '5.555' }, rules.TRAINING_COST], [{ courseId: 987654 }, rules.TRAINING_COURSE_NOT_FOUND], [{ branchId: org.branchB.id }, 'الفرع غير موجود'],
    [{ branchId: 987654 }, 'الفرع غير موجود'], [{ branchId: null }, 'اختار فرع الجلسة']]) {
    assert.deepEqual(answer(await request(users.hrA, 'POST', T + '/sessions', session(change))), [400, message], JSON.stringify(change))
  }
  const planned = expectStatus(await request(users.hrA, 'POST', T + '/sessions', session()), 201)
  assert.deepEqual([planned.courseName, planned.branchName, planned.startDate, planned.endDate, planned.capacity, planned.costPerSeat, planned.status, planned.statusLabel, planned.counts, planned.givesCertificate],
    ['السلامة المهنية', 'فرع التدريب أ', '2026-11-01', '2026-11-02', 2, '350.50', 'PLANNED', 'مجدولة', { seats: 0, attended: 0, completed: 0 }, true])
  state.session = planned.id
  // جلسة «كل الشركة» لحساب من غير قيد فروع بس؛ وجلسة فرع ب مش في قايمة فرع أ ولا تفاصيلها
  state.company = expectStatus(await request(users.admin, 'POST', T + '/sessions', session({ branchId: null, capacity: null, costPerSeat: null })), 201).id
  state.sessionB = expectStatus(await request(users.hrB, 'POST', T + '/sessions', session({ branchId: org.branchB.id })), 201).id
  const listA = expectStatus(await request(users.hrA, 'GET', T + '/sessions'), 200)
  assert.deepEqual([listA.canCompany, listA.sessions.map(row => row.id)], [false, [state.session]])
  assert.deepEqual(expectStatus(await request(users.admin, 'GET', T + '/sessions'), 200).sessions.map(row => row.id).sort(), [state.session, state.company, state.sessionB].sort())
  for (const hidden of [state.company, state.sessionB]) {
    assert.deepEqual([answer(await request(users.hrA, 'GET', T + `/sessions/${hidden}`)), answer(await request(users.hrA, 'PATCH', T + `/sessions/${hidden}`, { location: 'تغيير' })),
      answer(await request(users.hrA, 'POST', T + `/sessions/${hidden}/enroll`, { employeeIds: [emps.a1.id] }))],
    [[404, rules.TRAINING_SESSION_NOT_FOUND], [404, rules.TRAINING_SESSION_NOT_FOUND], [404, rules.TRAINING_SESSION_NOT_FOUND]], String(hidden))
  }
  // دورة موقوفة: مفيش جلسات جديدة عليها
  expectStatus(await request(users.hrA, 'PATCH', T + `/courses/${state.plain}`, { isActive: false }), 200)
  assert.deepEqual(answer(await request(users.hrA, 'POST', T + '/sessions', session({ courseId: state.plain }))), [400, rules.TRAINING_COURSE_NOT_FOUND])
})

test('TR-02: التسجيل تحت قفل الجلسة بنطاق الفروع والسعة، والحضور والإكمال، والشهادة مستند موظف بانتهائه، والمقفول مابيتغيّرش', async () => {
  const S = T + `/sessions/${state.session}`
  const enroll = (user, ids, target = S) => request(user, 'POST', target + '/enroll', { employeeIds: ids })
  for (const bad of [undefined, [], ['x'], [0], 'نص']) assert.equal((await enroll(users.hrA, bad)).status, 400, JSON.stringify(bad))
  // موظف فرع تاني، ومنتهي، ومش موجود: نفس الرد — ومفيش حد اتسجّل
  for (const stranger of [emps.b1.id, emps.gone.id, 987654]) assert.deepEqual(answer(await enroll(users.hrA, [emps.a1.id, stranger])), [400, 'موظف من المختارين غير موجود أو ملفه مش شغال'], String(stranger))
  assert.equal(await repo('TrainingEnrollment').count(), 0)
  // السعة 2: تلاتة مع بعض مرفوضين كلهم؛ وتسجيلين مع بعض بيعدّي منهم اللي السعة تكفّيه بس
  assert.deepEqual(answer(await enroll(users.hrA, [emps.a1.id, emps.a2.id, emps.a3.id])), [400, rules.TRAINING_FULL + ' (الباقي 2)'])
  const race = await Promise.all([enroll(users.hrA, [emps.a1.id, emps.a2.id]), enroll(users.hrA, [emps.a3.id])])
  assert.deepEqual(race.map(response => response.status).sort(), [200, 400], JSON.stringify(race.map(messageOf)))
  await repo('TrainingEnrollment').delete({ sessionId: state.session })
  const first = expectStatus(await enroll(users.hrA, [emps.a1.id, emps.a2.id]), 200)
  assert.deepEqual([first.enrolled, first.already, first.session.counts.seats, first.enrollments.map(row => [row.employeeName, row.status, row.statusLabel, row.certificate])],
    [2, 0, 2, [['متدرب أول', 'ENROLLED', 'مسجّل', null], ['متدرب تاني', 'ENROLLED', 'مسجّل', null]]])
  assert.deepEqual([expectStatus(await enroll(users.hrA, [emps.a1.id]), 200).already, answer(await enroll(users.hrA, [emps.a3.id]))], [1, [400, rules.TRAINING_FULL + ' (الباقي 0)']])
  // السعة ماتقلّش عن المسجّلين
  assert.deepEqual(answer(await request(users.hrA, 'PATCH', S, { capacity: 1 })), [400, 'السعة ماتقلّش عن المسجّلين (2)'])
  assert.equal(expectStatus(await request(users.hrA, 'PATCH', S, { capacity: 3, trainer: 'م. هاني' }), 200).session.trainer, 'م. هاني')

  // الحضور والإكمال
  const [e1, e2] = first.enrollments.map(row => row.id)
  const mark = (user, id, body) => request(user, 'POST', T + `/enrollments/${id}/mark`, body)
  assert.deepEqual([answer(await mark(users.hrA, e1, { status: 'ENROLLED' })), answer(await mark(users.hrA, e1, { status: 'DONE' })), answer(await mark(users.hrB, e1, { status: 'ATTENDED' })),
    (await mark(users.a1, e1, { status: 'ATTENDED' })).status, answer(await mark(users.hrA, 987654, { status: 'ATTENDED' }))],
  [[400, rules.TRAINING_MARK], [400, rules.TRAINING_MARK], [404, rules.TRAINING_ENROLLMENT_NOT_FOUND], 403, [404, rules.TRAINING_ENROLLMENT_NOT_FOUND]])
  assert.equal(expectStatus(await mark(users.hrA, e1, { status: 'ATTENDED' }), 200).session.counts.attended, 1)
  // موظف اتنقل لفرع ب: الحكم بفرعه الحالي
  await repo('Employee').update({ id: emps.a1.id }, { branchId: org.branchB.id })
  try {
    assert.deepEqual([answer(await mark(users.hrA, e1, { status: 'COMPLETED' })), expectStatus(await request(users.hrA, 'GET', S), 200).enrollments.map(row => row.employeeName), expectStatus(await request(users.hrA, 'GET', S), 200).hidden],
      [[404, rules.TRAINING_ENROLLMENT_NOT_FOUND], ['متدرب تاني'], 1])
  } finally { await repo('Employee').update({ id: emps.a1.id }, { branchId: org.branchA.id }) }
  // «أكمل» لدورة بشهادة: مستند موظف «شهادة تدريب» — الإصدار آخر يوم في الجلسة والانتهاء بعد 12 شهر
  const before = await repo('EmployeeDocument').count()
  const done = expectStatus(await mark(users.hrA, e1, { status: 'COMPLETED', result: ' ناجح 92% ' }), 200)
  const row = done.enrollments.find(entry => entry.id === e1)
  assert.deepEqual([row.status, row.result, row.certificate, done.session.counts], ['COMPLETED', 'ناجح 92%', { issueDate: '2026-11-02', expiryDate: '2027-11-02' }, { seats: 2, attended: 1, completed: 1 }])
  const documents = await repo('EmployeeDocument').find({ where: { employeeId: emps.a1.id } })
  assert.deepEqual([await repo('EmployeeDocument').count() - before, documents.map(entry => [entry.docType, String(entry.issueDate).slice(0, 10), String(entry.expiryDate).slice(0, 10), entry.notes])],
    [1, [[rules.TRAINING_CERT_CODE, '2026-11-02', '2027-11-02', 'شهادة دورة «السلامة المهنية»']]])
  assert.deepEqual((await repo('DocType').find({ where: { code: rules.TRAINING_CERT_CODE } })).map(entry => [entry.nameAr, entry.isActive]), [[rules.TRAINING_CERT_NAME, true]])
  assert.deepEqual([answer(await mark(users.hrA, e1, { status: 'ABSENT' })), await repo('EmployeeDocument').count() - before], [[409, rules.TRAINING_MARK_FINAL], 1], 'اللي أكمل مابيتغيّرش')
  // «غاب» بيفضّي المكان وبيتصحّح؛ و«اتلغى» نهائي
  assert.equal(expectStatus(await mark(users.hrA, e2, { status: 'ABSENT' }), 200).session.counts.seats, 1)
  assert.equal(expectStatus(await mark(users.hrA, e2, { status: 'ATTENDED' }), 200).session.counts.seats, 2)
  expectStatus(await mark(users.hrA, e2, { status: 'CANCELLED' }), 200)
  assert.deepEqual(answer(await mark(users.hrA, e2, { status: 'ATTENDED' })), [409, rules.TRAINING_MARK_FINAL])
  // اللي اتلغى يتسجّل من جديد؛ ودورة من غير شهادة مابتسجّلش مستند
  assert.equal(expectStatus(await enroll(users.hrA, [emps.a2.id]), 200).enrolled, 1)
  await repo('TrainingCourse').update({ id: state.course }, { givesCertificate: false, certificateValidMonths: null })
  const again = (await repo('TrainingEnrollment').findOneByOrFail({ sessionId: state.session, employeeId: emps.a2.id, status: 'ENROLLED' })).id
  assert.deepEqual([expectStatus(await mark(users.hrA, again, { status: 'COMPLETED' }), 200).enrollments.find(entry => entry.id === again).certificate, await repo('EmployeeDocument').count() - before], [null, 1])
  // جلسة اتعملت أو اتلغت: مفيش تسجيل؛ والملغية مفيش تعديل
  expectStatus(await request(users.hrA, 'PATCH', S, { status: 'DONE' }), 200)
  assert.equal((await enroll(users.hrA, [emps.a3.id])).status, 400)
  assert.deepEqual([answer(await request(users.hrA, 'PATCH', S, { status: 'نص' })), expectStatus(await request(users.hrA, 'PATCH', S, { status: 'CANCELLED' }), 200).session.status, answer(await request(users.hrA, 'PATCH', S, { location: 'تغيير' }))],
    [[400, rules.TRAINING_SESSION_STATUS], 'CANCELLED', [400, rules.TRAINING_SESSION_CLOSED]])
  state.e1 = e1; state.again = again
})

test('TR-03: الموظف — «دوراتي» بشهادته، وتقييم التدريب مرة واحدة بعد الحضور، ومش لتسجيل غيره', async () => {
  const mine = expectStatus(await request(users.a1, 'GET', T + '/mine'), 200)
  assert.deepEqual([mine.available, mine.enrollments.map(row => [row.id, row.courseName, row.status, row.startDate, row.trainer, row.certificate, row.canRate, row.rating])],
    [true, [[state.e1, 'السلامة المهنية', 'COMPLETED', '2026-11-01', 'م. هاني', { issueDate: '2026-11-02', expiryDate: '2027-11-02' }, true, null]]])
  assert.deepEqual(expectStatus(await request(users.nobody, 'GET', T + '/mine'), 200).enrollments, [])
  const rate = (user, id, body) => request(user, 'POST', T + `/enrollments/${id}/rate`, body)
  for (const bad of [{}, { rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: '5' }]) assert.deepEqual(answer(await rate(users.a1, state.e1, bad)), [400, rules.TRAINING_RATING], JSON.stringify(bad))
  for (const stranger of [users.a2, users.hrA, users.nobody]) assert.deepEqual(answer(await rate(stranger, state.e1, { rating: 5 })), [404, rules.TRAINING_ENROLLMENT_NOT_FOUND], stranger.email)
  const rated = expectStatus(await rate(users.a1, state.e1, { rating: 4, comment: ' مفيد ' }), 200).enrollments[0]
  assert.deepEqual([rated.rating, rated.ratingComment, rated.canRate], [4, 'مفيد', false])
  assert.deepEqual(answer(await rate(users.a1, state.e1, { rating: 5 })), [409, rules.TRAINING_RATING_STAGE])
  // إدارة التدريب شايفة التقييم في الجلسة (حساب من غير قيد فروع: الجلسة الملغية لسه بتتقري)
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', T + `/sessions/${state.session}`), 200).enrollments.find(row => row.id === state.e1).rating, 4)
  // والموديول لما يتقفل المسارات بتتقفل
  expectStatus(await request(users.admin, 'PUT', '/modules/training', { enabled: false }), 200); modules.invalidate()
  try { assert.equal((await request(users.a1, 'GET', T + '/mine')).status, 404) } finally { expectStatus(await request(users.admin, 'PUT', '/modules/training', { enabled: true }), 200); modules.invalidate() }
})

test('TR-04: «طلب تدريب» — الجلسة من المتاح لفرع مقدّم الطلب، ورقمها بيثبّته الخادم، والاعتماد النهائي بيسجّله تحت قفل الجلسة والسعة، والجلسة اللي راحت بتوقّف الاعتماد', async () => {
  const links = require('../src/training/training-requests')
  const { localDateOf } = require('../src/attendance/attendance.service')
  const plus = days => localDateOf(new Date(Date.now() + days * 86400000))
  const chain = await repo('ApprovalChain').save({ code: 'TR_HR', nameAr: 'سلسلة طلب التدريب', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'TRAINING_REQUEST', nameAr: 'طلب تدريب/دورة', category: 'training', destinationHandler: links.TRAINING_REQUEST_HANDLER, approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['courseName']) })
  users.approver = await account('approver', ['approve.hr', 'requests.view_all'])
  users.a3 = await account('a3', [], { employeeId: emps.a3.id })
  users.b1 = await account('b1', [], { employeeId: emps.b1.id, branchId: org.branchB.id })
  const ask = (user, payload) => request(user, 'POST', '/requests', { typeCode: 'TRAINING_REQUEST', payload, submit: true })
  const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })
  const open = expectStatus(await request(users.hrA, 'POST', T + '/sessions', session({ startDate: plus(30), endDate: plus(31), capacity: 1 })), 201)
  const later = expectStatus(await request(users.hrA, 'POST', T + '/sessions', session({ startDate: plus(40), endDate: plus(40), capacity: null })), 201)
  const past = expectStatus(await request(users.hrA, 'POST', T + '/sessions', session({ startDate: plus(-3), endDate: plus(-2) })), 201)
  const option = row => `السلامة المهنية — ${row.startDate} (#${row.id})`

  // حقول النموذج من الخادم: الجلسات المجدولة اللي لسه مابدأتش، لفرع صاحب الحساب (أو لكل الشركة)
  const fieldsFor = async user => { const type = expectStatus(await request(user, 'GET', '/requests/types'), 200).find(row => row.code === 'TRAINING_REQUEST'); return [JSON.parse(type.customFields), JSON.parse(type.requiredFields)] }
  const [fields, required] = await fieldsFor(users.a1)
  assert.deepEqual([fields.map(field => [field.key, field.type, field.required]), required], [[['trainingSession', 'select', true]], ['trainingSession']])
  assert.deepEqual([fields[0].options.includes(option(open)), fields[0].options.includes(option(later)), fields[0].options.includes(option(past)), fields[0].options.some(text => text.endsWith(`(#${state.session})`)),
    fields[0].options.some(text => text.endsWith(`(#${state.sessionB})`))], [true, true, false, false, false], 'مجدولة ولسه مابدأتش ولفرعه')
  const [fieldsB] = await fieldsFor(users.b1)
  assert.deepEqual([fieldsB[0].options.includes(option(open)), fieldsB[0].options.some(text => text.endsWith(`(#${state.sessionB})`))], [false, true])

  // التقديم: اختيار من المتاح بس — جلسة فرع تاني أو فاتت أو مش موجودة نفس الرد؛ ورقم الجلسة واسم الدورة بيثبّتهم الخادم
  for (const bad of [{ trainingSession: 'أي حاجة' }, { trainingSession: `السلامة المهنية — 2026-11-01 (#${state.sessionB})` }, { trainingSession: option(past) }]) {
    assert.deepEqual(answer(await ask(users.a1, bad)), [400, links.TRAINING_REQUEST_SESSION], JSON.stringify(bad))
  }
  // الجلسة هي الإلزامية (مش اسم الدورة القديم)، ورقمها مايتبعتش من العميل بدلها
  for (const bad of [{}, { trainingSessionId: open.id, courseName: 'السلامة المهنية' }]) assert.deepEqual(answer(await ask(users.a1, bad)), [400, 'حقول ناقصة: trainingSession'], JSON.stringify(bad))
  assert.equal(await repo('Request').count(), 0, 'المرفوض مابيسيبش مسودة')
  const sent = expectStatus(await ask(users.a1, { trainingSession: option(open), trainingSessionId: later.id, courseName: 'اسم مزيّف', reason: 'محتاجها لشغلي' }), 201)
  assert.deepEqual(JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload), { trainingSession: option(open), reason: 'محتاجها لشغلي', trainingSessionId: open.id, courseName: 'السلامة المهنية' })
  assert.equal(await repo('TrainingEnrollment').count({ where: { sessionId: open.id } }), 0, 'التقديم مابيسجّلش')
  // الاعتماد النهائي بيسجّله مربوط بالطلب
  assert.notEqual((await approve(users.a1, sent.id)).status, 201)
  expectStatus(await approve(users.approver, sent.id), 201)
  const made = await repo('TrainingEnrollment').findOneByOrFail({ sessionId: open.id, employeeId: emps.a1.id })
  const done = await repo('Request').findOneByOrFail({ id: sent.id })
  assert.deepEqual([made.status, made.requestId, made.enrolledByUserId, done.status, done.destinationRef], ['ENROLLED', sent.id, 0, 'COMPLETED', `TRN-${made.id}`])
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', T + `/sessions/${open.id}`), 200).enrollments.map(row => [row.employeeName, row.fromRequest]), [['متدرب أول', true]])
  assert.deepEqual(answer(await ask(users.a1, { trainingSession: option(open) })), [400, links.TRAINING_REQUEST_TAKEN])
  // السعة: الجلسة اتملت ← الاعتماد واقف والطلب باقي عند المعتمد؛ ولما السعة تزيد بيعدّي
  const second = expectStatus(await ask(users.a2, { trainingSession: option(open) }), 201)
  const full = await approve(users.approver, second.id)
  assert.deepEqual([full.status === 201, messageOf(full).includes(rules.TRAINING_FULL), (await repo('Request').findOneByOrFail({ id: second.id })).status === 'COMPLETED', await repo('TrainingEnrollment').count({ where: { sessionId: open.id } })],
    [false, true, false, 1])
  expectStatus(await request(users.hrA, 'PATCH', T + `/sessions/${open.id}`, { capacity: 2 }), 200)
  expectStatus(await approve(users.approver, second.id), 201)
  assert.equal(await repo('TrainingEnrollment').count({ where: { sessionId: open.id, status: 'ENROLLED' } }), 2)
  // إدارة التدريب سجّلته في النص: الاعتماد بيربط التسجيل القايم بالطلب من غير صف تاني
  const third = expectStatus(await ask(users.a3, { trainingSession: option(later) }), 201)
  expectStatus(await request(users.hrA, 'POST', T + `/sessions/${later.id}/enroll`, { employeeIds: [emps.a3.id] }), 200)
  expectStatus(await approve(users.approver, third.id), 201)
  assert.deepEqual((await repo('TrainingEnrollment').find({ where: { sessionId: later.id } })).map(row => [row.employeeId, row.requestId, row.enrolledByUserId]), [[emps.a3.id, third.id, users.hrA.id]])
  // الجلسة اتلغت بعد التقديم: الاعتماد مابيعدّيش والطلب باقي
  const fourth = expectStatus(await ask(users.a2, { trainingSession: option(later) }), 201)
  expectStatus(await request(users.hrA, 'PATCH', T + `/sessions/${later.id}`, { status: 'CANCELLED' }), 200)
  const gone = await approve(users.approver, fourth.id)
  assert.deepEqual([gone.status === 201, messageOf(gone).includes(links.TRAINING_REQUEST_GONE), (await repo('Request').findOneByOrFail({ id: fourth.id })).status === 'COMPLETED', await repo('TrainingEnrollment').count({ where: { sessionId: later.id } })],
    [false, true, false, 1])
  // الموديول مقفول: نوع الطلب مابيظهرش في التقديم
  expectStatus(await request(users.admin, 'PUT', '/modules/training', { enabled: false }), 200); modules.invalidate()
  try { assert.equal(expectStatus(await request(users.a1, 'GET', '/requests/types'), 200).some(row => row.code === 'TRAINING_REQUEST'), false) }
  finally { expectStatus(await request(users.admin, 'PUT', '/modules/training', { enabled: true }), 200); modules.invalidate() }
})

test('TR-05: ميزانية الأقسام وتقرير التكلفة مقابلها بنطاق الفروع، والتدريب الإلزامي لمسمى أو قسم والناقص منه (لإدارة التدريب، وللمدير عن فريقه)', async () => {
  const plans = require('../src/training/training-plans.service')
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'TR_SAL', branchId: org.branchA.id })
  org.bDepartment = await repo('Department').save({ name: 'قسم فرع ب', code: 'TR_BD', branchId: org.branchB.id })
  await repo('Employee').update({ id: emps.a1.id }, { departmentId: org.sales.id, jobTitle: 'فني سلامة' })
  await repo('Employee').update({ id: emps.a2.id }, { departmentId: org.sales.id, jobTitle: 'محاسب' })
  await repo('Employee').update({ id: emps.a3.id }, { jobTitle: 'فني  سلامة' })
  await repo('Employee').update({ id: emps.b1.id }, { departmentId: org.bDepartment.id, jobTitle: 'فني سلامة' })
  emps.a4 = await employee({ fullName: 'فني جديد', departmentId: org.sales.id, jobTitle: 'فني سلامة', managerEmployeeId: emps.a1.id })
  // الجلسة المجدولة اللي فيها متدربين القسم (350.50 للمقعد) — والجلسات الملغية برّه الحساب
  const open = expectStatus(await request(users.hrA, 'GET', T + '/sessions'), 200).sessions.find(row => row.status === 'PLANNED' && row.counts.seats === 2)
  const year = Number(open.startDate.slice(0, 4))
  const B = T + '/budget'
  assert.deepEqual([(await request(users.a1, 'GET', B)).status, (await request(users.hrA, 'GET', B + '?year=x')).status, (await request(users.hrA, 'GET', B + '?year=1999')).status], [403, 400, 400])
  const first = expectStatus(await request(users.hrA, 'GET', B + `?year=${year}`), 200)
  assert.deepEqual([first.year, first.rows.map(row => [row.departmentName, row.branchName, row.hasBudget, row.budget, row.spent, row.remaining, row.seats, row.over]), first.totals],
    [year, [['قسم المبيعات', 'فرع التدريب أ', false, '0.00', '701.00', '-701.00', 2, false]], { budget: '0.00', spent: '701.00', remaining: '-701.00', seats: 2 }])
  // موظف من غير قسم بيتجمع في صف لوحده
  expectStatus(await request(users.hrA, 'PATCH', T + `/sessions/${open.id}`, { capacity: 3 }), 200)
  expectStatus(await request(users.hrA, 'POST', T + `/sessions/${open.id}/enroll`, { employeeIds: [emps.a3.id] }), 200)
  assert.deepEqual(expectStatus(await request(users.hrA, 'GET', B + `?year=${year}`), 200).rows.map(row => [row.departmentName, row.spent, row.seats]), [['قسم المبيعات', '701.00', 2], ['من غير قسم', '350.50', 1]])
  // الميزانية: القيم، والقسم في النطاق، وصف واحد لكل قسم وسنة
  const put = (user, body) => request(user, 'PUT', B, body)
  for (const [body, message] of [[{ year: 1999, departmentId: org.sales.id, budget: 100 }, plans.TRAINING_YEAR], [{ year, departmentId: org.sales.id, budget: -1 }, plans.TRAINING_BUDGET],
    [{ year, departmentId: org.sales.id }, plans.TRAINING_BUDGET], [{ year, departmentId: org.sales.id, budget: '5.555' }, plans.TRAINING_BUDGET]]) assert.deepEqual(answer(await put(users.hrA, body)), [400, message], JSON.stringify(body))
  assert.deepEqual([answer(await put(users.hrA, { year, departmentId: org.bDepartment.id, budget: 100 })), answer(await put(users.hrA, { year, departmentId: 987654, budget: 100 })), (await put(users.a1, { year, departmentId: org.sales.id, budget: 100 })).status],
    [[404, plans.TRAINING_DEPARTMENT_NOT_FOUND], [404, plans.TRAINING_DEPARTMENT_NOT_FOUND], 403])
  const tight = expectStatus(await put(users.hrA, { year, departmentId: org.sales.id, budget: '500' }), 200).rows[0]
  assert.deepEqual([tight.hasBudget, tight.budget, tight.spent, tight.remaining, tight.over], [true, '500.00', '701.00', '-201.00', true])
  const roomy = expectStatus(await put(users.hrA, { year, departmentId: org.sales.id, budget: 1000 }), 200)
  assert.deepEqual([roomy.rows[0].remaining, roomy.rows[0].over, roomy.totals, await repo('TrainingPlan').count()], ['299.00', false, { budget: '1000.00', spent: '1051.50', remaining: '-51.50', seats: 3 }, 1])
  assert.equal(Number((await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', ['TRAINING_BUDGET_SET']))[0].n), 2)
  // فرع ب شايف قسمه بس؛ وسنة تانية من غير أرقام
  assert.deepEqual([expectStatus(await request(users.hrB, 'GET', B + `?year=${year}`), 200).rows.map(row => [row.departmentName, row.spent]), expectStatus(await request(users.hrA, 'GET', B + `?year=${year + 2}`), 200).rows.map(row => [row.budget, row.spent])],
    [[['قسم فرع ب', '0.00']], [['0.00', '0.00']]])

  // التدريب الإلزامي: لمسمى أو قسم؛ الإلزام بالمسمى بس على مستوى الشركة لحساب من غير قيد فروع
  const Q = T + '/requirements'
  const add = (user, body) => request(user, 'POST', Q, body)
  for (const [body, message] of [[{ courseId: state.course }, plans.TRAINING_REQUIREMENT_TARGET], [{ courseId: state.course, jobTitle: 'ا' }, plans.TRAINING_REQUIREMENT_TARGET],
    [{ courseId: state.plain, departmentId: org.sales.id }, rules.TRAINING_COURSE_NOT_FOUND], [{ courseId: 987654, departmentId: org.sales.id }, rules.TRAINING_COURSE_NOT_FOUND]]) {
    assert.deepEqual(answer(await add(users.hrA, body)), [400, message], JSON.stringify(body))
  }
  assert.deepEqual([answer(await add(users.hrA, { courseId: state.course, jobTitle: 'فني سلامة' })), answer(await add(users.hrA, { courseId: state.course, departmentId: org.bDepartment.id })), (await add(users.a1, { courseId: state.course, departmentId: org.sales.id })).status],
    [[403, plans.TRAINING_REQUIREMENT_COMPANY], [404, plans.TRAINING_DEPARTMENT_NOT_FOUND], 403])
  expectStatus(await add(users.hrA, { courseId: state.course, departmentId: org.sales.id, jobTitle: ' فني   سلامة ' }), 200)
  assert.deepEqual(answer(await add(users.hrA, { courseId: state.course, departmentId: org.sales.id, jobTitle: 'فني سلامة' })), [400, plans.TRAINING_REQUIREMENT_EXISTS])
  const wide = expectStatus(await add(users.admin, { courseId: state.course, jobTitle: 'فني سلامة' }), 200)
  assert.equal(wide.requirements.length, 2)
  // الناقص: اللي أكمل مش ناقص؛ المسجّل في جلسة شغالة «مسجّل»؛ والجديد ناقص — مرة واحدة حتى لو طابق إلزامين
  const seen = expectStatus(await request(users.hrA, 'GET', Q), 200)
  assert.deepEqual([seen.canCompany, seen.requirements.map(row => [row.courseName, row.jobTitle, row.departmentName, row.canRemove])],
    [false, [['السلامة المهنية', 'فني سلامة', 'قسم المبيعات', true], ['السلامة المهنية', 'فني سلامة', null, false]]])
  assert.deepEqual(seen.missing.map(row => [row.employeeName, row.departmentName, row.courseName, row.enrolled]).sort(),
    [['فني جديد', 'قسم المبيعات', 'السلامة المهنية', false], ['متدرب تالت', null, 'السلامة المهنية', true]].sort())
  // Codex P3K-B09: قسم الموظف اتنقل لفرع ب واتغيّر اسمه (الموظف لسه في فرع أ): موارد فرع أ بتشوفه ناقص بإلزام الشركة من غير اسم قسمه
  await repo('Department').update({ id: org.sales.id }, { branchId: org.branchB.id, name: 'SECRET-B قسم فرع ب' })
  try {
    const moved = expectStatus(await request(users.hrA, 'GET', Q), 200)
    assert.deepEqual([moved.missing.find(row => row.employeeName === 'فني جديد')?.departmentName, JSON.stringify(moved).includes('SECRET-B'), moved.requirements.map(row => row.departmentName)], [null, false, [null]])
  } finally { await repo('Department').update({ id: org.sales.id }, { branchId: org.branchA.id, name: 'قسم المبيعات' }) }
  // فرع ب: شايف إلزام الشركة بس وناقصه عند موظفينه
  const seenB = expectStatus(await request(users.hrB, 'GET', Q), 200)
  assert.deepEqual([seenB.requirements.map(row => [row.jobTitle, row.departmentName, row.canRemove]), seenB.missing.map(row => row.employeeName)], [[['فني سلامة', null, false]], ['موظف فرع ب']])
  // المدير شايف الناقص عند مرؤوسيه المباشرين بس
  assert.deepEqual([expectStatus(await request(users.a1, 'GET', T + '/mandatory/team'), 200).missing.map(row => [row.employeeName, row.enrolled]), expectStatus(await request(users.a2, 'GET', T + '/mandatory/team'), 200).missing,
    expectStatus(await request(users.nobody, 'GET', T + '/mandatory/team'), 200).missing], [[['فني جديد', false]], [], []])
  // الحذف: بنطاقه
  const [own, company] = seen.requirements.map(row => row.id)
  const remove = (user, id) => request(user, 'DELETE', Q + '/' + id)
  assert.deepEqual([answer(await remove(users.hrA, company)), answer(await remove(users.hrB, own)), answer(await remove(users.hrA, 987654)), (await remove(users.a1, own)).status],
    [[403, plans.TRAINING_REQUIREMENT_COMPANY], [404, plans.TRAINING_REQUIREMENT_NOT_FOUND], [404, plans.TRAINING_REQUIREMENT_NOT_FOUND], 403])
  const left = expectStatus(await remove(users.hrA, own), 200)
  assert.deepEqual([left.requirements.length, left.missing.length], [1, 2], 'إلزام الشركة لسه شغال')
  const none = expectStatus(await remove(users.admin, company), 200)
  assert.deepEqual([none.requirements, none.missing], [[], []])
})
