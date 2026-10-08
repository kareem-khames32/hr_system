'use strict'
// B3.14: سجل المعالين على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_dependents_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
// ولا رسالة بريد حقيقية.
//  DP-01) الموارد البشرية: الموديول مقفول افتراضيًا؛ القيم؛ الموظف بفرعه الحالي في نطاق الحساب وإلا «غير موجود»؛ رقم هوية مكرر مرفوض؛ مستند
//         الهوية بتاريخ انتهائه؛ التعديل بيكتب المبعوت بس؛ الحذف بسبب والمحذوف مابيتعدّلش؛ وكل تغيير سطر في سجل تغييرات الموظف.
//  DP-02) طلب «تحديث المعالين»: الحقول من الخادم؛ التقديم مابيعدّلش؛ الاعتماد بيضيف المعال بمستند هويته (مربوط بالطلب)؛ التعديل والحذف لمعال
//         صاحب الطلب بس ورقمه بيثبّته الخادم؛ والمعال اللي اتحذف بعد التقديم بيوقّف الاعتماد.
//  DP-03) ضغطتين مع بعض بنفس رقم الهوية: واحدة بتعدّي والتانية 409، وصف واحد.
// Run (من api/): node --test test/dependents.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_dependents_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_dependents_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-dependents-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/dependents/dependent-rules')
const links = require('../src/dependents/dependent-requests')
const { localDateOf } = require('../src/attendance/attendance.service')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `DP${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف المعالين ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@dependents.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const plus = days => localDateOf(new Date(Date.now() + days * 86400000))
const D = '/dependents'
const child = (extra = {}) => ({ nameAr: 'يوسف أحمد', relation: 'SON', birthDate: '2020-05-01', nationalId: '1122334455', gender: 'MALE', ...extra })
const history = async employeeId => (await repo('EmployeeStatusHistory').find({ where: { employeeId, fieldName: 'dependents' }, order: { id: 'ASC' } })).map(row => [row.changeType, row.oldValue, row.newValue, row.requestId ?? null, row.changedByUserId ?? null])
const documentOf = async id => (await ds.query('SELECT [employeeId], [docType], [number], CONVERT(char(10), [expiryDate], 23) AS [expiryDate], [notes] FROM [employee_documents] WHERE [id] = @0', [id]))
  .map(row => [row.employeeId, row.docType, row.number, row.expiryDate, row.notes])[0]

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

  org.branchA = await repo('Branch').save({ code: 'DP_A', name: 'فرع المعالين أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'DP_B', name: 'فرع المعالين ب', country: 'SA' })
  emps.a1 = await employee(); emps.a2 = await employee(); emps.b1 = await employee({ branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@dependents.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.hr = await account('hr', ['dependents.manage'])
  users.hrB = await account('hr-b', ['dependents.manage'], { branchId: org.branchB.id })
  users.viewer = await account('viewer', ['employees.view'])
  users.a1 = await account('a1', [], { employeeId: emps.a1.id })
  users.a2 = await account('a2', [], { employeeId: emps.a2.id })
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

test('DP-01: الموارد البشرية — القيم والنطاق بفرع الموظف الحالي، ورقم الهوية المكرر، ومستند الهوية بانتهائه، والتعديل بالمبعوت بس، والحذف بسبب، وسجل التغييرات', async () => {
  assert.deepEqual([(await request(users.hr, 'GET', `${D}?employeeId=${emps.a1.id}`)).status, (await request(users.a1, 'GET', D + '/mine')).status], [404, 404], 'مقفول لحد ما الشركة تفتحه')
  expectStatus(await request(users.admin, 'PUT', '/modules/dependents', { enabled: true }), 200); modules.invalidate()

  // الصلاحية: اللي يشوف الموظفين بس مايشوفش المعالين ولا يكتبهم
  assert.deepEqual([(await request(users.viewer, 'GET', `${D}?employeeId=${emps.a1.id}`)).status, (await request(users.viewer, 'POST', D, { employeeId: emps.a1.id, ...child() })).status,
    (await request(users.a1, 'POST', D, { employeeId: emps.a1.id, ...child() })).status], [403, 403, 403])
  // القيم
  const add = (user, body) => request(user, 'POST', D, body)
  for (const [bad, message] of [[{ nameAr: 'ي' }, rules.DEPENDENT_NAME], [{ nameAr: undefined }, rules.DEPENDENT_NAME], [{ relation: 'COUSIN' }, rules.DEPENDENT_RELATION], [{ birthDate: plus(1) }, rules.DEPENDENT_BIRTH],
    [{ birthDate: '2020-02-30' }, rules.DEPENDENT_BIRTH], [{ nationalId: '12' }, rules.DEPENDENT_ID_NUMBER], [{ nationalId: 1122334455 }, rules.DEPENDENT_ID_NUMBER], [{ gender: 'ذكر' }, rules.DEPENDENT_GENDER],
    [{ isInsured: 'yes' }, rules.DEPENDENT_INSURED], [{ idExpiryDate: '2030-13-01' }, rules.DEPENDENT_ID_EXPIRY], [{ nameEn: 'x'.repeat(151) }, rules.DEPENDENT_NAME_EN]]) {
    assert.deepEqual(answer(await add(users.hr, { employeeId: emps.a1.id, ...child(bad) })), [400, message], JSON.stringify(bad))
  }
  // النطاق: موظف فرع تاني أو مش موجود نفس الرد
  for (const employeeId of [emps.b1.id, 999999, 'x', undefined]) assert.deepEqual(answer(await add(users.hr, { ...child(), employeeId })), [404, rules.DEPENDENT_EMPLOYEE], String(employeeId))
  assert.deepEqual(answer(await request(users.hr, 'GET', `${D}?employeeId=${emps.b1.id}`)), [404, rules.DEPENDENT_EMPLOYEE])
  assert.equal(await repo('Dependent').count(), 0)

  // إضافة بمستند هوية بتاريخ انتهاء
  const expiry = plus(400)
  const made = expectStatus(await add(users.hr, { employeeId: emps.a1.id, ...child({ nameAr: '  يوسف   أحمد ', nameEn: 'Youssef Ahmed', idExpiryDate: expiry, isInsured: true }) }), 201)
  state.son = made.id
  assert.deepEqual([made.nameAr, made.nameEn, made.relation, made.relationLabel, made.birthDate, made.nationalId, made.gender, made.genderLabel, made.isInsured, made.idExpiryDate, made.status],
    ['يوسف أحمد', 'Youssef Ahmed', 'SON', 'ابن', '2020-05-01', '1122334455', 'MALE', 'ذكر', true, expiry, 'ACTIVE'])
  assert.deepEqual(await documentOf(made.documentId), [emps.a1.id, rules.DEPENDENT_ID_CODE, '1122334455', expiry, 'هوية المعال: يوسف أحمد'])
  const docType = await repo('DocType').findOneByOrFail({ code: rules.DEPENDENT_ID_CODE })
  assert.deepEqual([docType.nameAr, docType.isActive, docType.requiredForHiring], [rules.DEPENDENT_ID_NAME, true, false])
  // من غير تاريخ انتهاء: من غير مستند
  const wife = expectStatus(await add(users.hr, { employeeId: emps.a1.id, nameAr: 'سارة محمد', relation: 'SPOUSE' }), 201)
  state.wife = wife.id
  assert.deepEqual([wife.documentId, wife.idExpiryDate, wife.birthDate, wife.nationalId, wife.gender, wife.isInsured], [null, null, null, null, null, false])
  assert.equal(await repo('DocType').count({ where: { code: rules.DEPENDENT_ID_CODE } }), 1)
  // رقم هوية مكرر لنفس الموظف مرفوض؛ ولموظف تاني عادي
  assert.deepEqual(answer(await add(users.hr, { employeeId: emps.a1.id, ...child({ nameAr: 'اسم تاني' }) })), [409, rules.DEPENDENT_DUPLICATE])
  const other = expectStatus(await add(users.hr, { employeeId: emps.a2.id, ...child() }), 201)
  state.other = other.id

  // القراءة: صاحب الصلاحية بنطاقه، والموظف معالينه بس
  assert.deepEqual(expectStatus(await request(users.hr, 'GET', `${D}?employeeId=${emps.a1.id}`), 200).dependents.map(row => row.id), [made.id, wife.id])
  assert.deepEqual([expectStatus(await request(users.a1, 'GET', D + '/mine'), 200).dependents.map(row => row.id), expectStatus(await request(users.a2, 'GET', D + '/mine'), 200).dependents.map(row => row.id),
    expectStatus(await request(users.hr, 'GET', D + '/mine'), 200)], [[made.id, wife.id], [other.id], { available: false, dependents: [] }])

  // التعديل: المبعوت بس، والفاضي بيفضّي الاختياري، ومستند الهوية بيتحدّث معاه
  const patch = (user, id, body) => request(user, 'PATCH', `${D}/${id}`, body)
  assert.deepEqual(answer(await patch(users.hr, made.id, {})), [400, rules.DEPENDENT_NOTHING])
  assert.deepEqual(answer(await patch(users.hr, made.id, { nameAr: 'يوسف أحمد', gender: 'MALE' })), [400, rules.DEPENDENT_NOTHING], 'نفس القيم')
  assert.deepEqual(answer(await patch(users.hr, wife.id, { nationalId: '1122334455' })), [409, rules.DEPENDENT_DUPLICATE])
  for (const user of [users.hrB, users.viewer]) assert.notEqual((await patch(user, made.id, { nameAr: 'تغيير' })).status, 200)
  assert.deepEqual(answer(await patch(users.hrB, made.id, { nameAr: 'تغيير' })), [404, rules.DEPENDENT_NOT_FOUND])
  const newExpiry = plus(800)
  const edited = expectStatus(await patch(users.hr, made.id, { nationalId: '9988776655', nameEn: '', idExpiryDate: newExpiry }), 200)
  assert.deepEqual([edited.nameAr, edited.nameEn, edited.nationalId, edited.birthDate, edited.isInsured, edited.idExpiryDate, edited.documentId], ['يوسف أحمد', null, '9988776655', '2020-05-01', true, newExpiry, made.documentId])
  assert.deepEqual((await documentOf(made.documentId)).slice(2, 4), ['9988776655', newExpiry])
  // تاريخ انتهاء لمعال من غير مستند بيعمل مستنده
  const withDoc = expectStatus(await patch(users.hr, wife.id, { idExpiryDate: expiry }), 200)
  assert.deepEqual([withDoc.documentId > made.documentId, withDoc.idExpiryDate, (await documentOf(withDoc.documentId))[4]], [true, expiry, 'هوية المعال: سارة محمد'])

  // الحذف: بسبب، والصف بيفضل محذوف، والمحذوف مابيتعدّلش ولا بيتحذف تاني
  const remove = (user, id, reason) => request(user, 'POST', `${D}/${id}/remove`, { reason })
  for (const bad of [undefined, '', 'اب', 'ت'.repeat(301)]) assert.deepEqual(answer(await remove(users.hr, wife.id, bad)), [400, rules.DEPENDENT_REASON], String(bad).slice(0, 10))
  assert.deepEqual(answer(await remove(users.hrB, wife.id, 'سبب كافي')), [404, rules.DEPENDENT_NOT_FOUND])
  assert.deepEqual(expectStatus(await remove(users.hr, wife.id, '  انفصال   موثّق '), 200), { removed: true })
  const gone = await repo('Dependent').findOneByOrFail({ id: wife.id })
  assert.deepEqual([gone.status, gone.removeReason, gone.documentId], ['REMOVED', 'انفصال موثّق', withDoc.documentId])
  assert.deepEqual([answer(await patch(users.hr, wife.id, { nameAr: 'تغيير' })), answer(await remove(users.hr, wife.id, 'مرة تانية')), answer(await patch(users.hr, 999999, { nameAr: 'تغيير' }))],
    [[404, rules.DEPENDENT_NOT_FOUND], [404, rules.DEPENDENT_NOT_FOUND], [404, rules.DEPENDENT_NOT_FOUND]])
  assert.deepEqual(expectStatus(await request(users.a1, 'GET', D + '/mine'), 200).dependents.map(row => row.id), [made.id])
  // حذف معال مابيقفلش تعديل غيره
  expectStatus(await patch(users.hr, made.id, { nameEn: 'Youssef' }), 200)

  // سجل تغييرات الموظف: سطر لكل تغيير باسم اللي عمله
  assert.deepEqual(await history(emps.a1.id), [
    ['DATA', null, 'إضافة: يوسف أحمد (ابن)', null, users.hr.id],
    ['DATA', null, 'إضافة: سارة محمد (زوج/زوجة)', null, users.hr.id],
    ['DATA', 'يوسف أحمد (ابن)', 'تعديل: يوسف أحمد (ابن) — الاسم بالإنجليزي، رقم الهوية، انتهاء الهوية', null, users.hr.id],
    ['DATA', 'سارة محمد (زوج/زوجة)', 'تعديل: سارة محمد (زوج/زوجة) — انتهاء الهوية', null, users.hr.id],
    ['DATA', 'سارة محمد (زوج/زوجة)', 'حذف', null, users.hr.id],
    ['DATA', 'يوسف أحمد (ابن)', 'تعديل: يوسف أحمد (ابن) — الاسم بالإنجليزي', null, users.hr.id],
  ])

  // الموظف اتنقل لفرع تاني: صاحب صلاحية الفرع القديم مابقاش يوصل لمعالينه، وصاحب الفرع الجديد بيوصل
  await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchB.id })
  try {
    assert.deepEqual([answer(await request(users.hr, 'GET', `${D}?employeeId=${emps.a2.id}`)), answer(await patch(users.hr, other.id, { nameAr: 'تغيير' })), answer(await remove(users.hr, other.id, 'سبب كافي')),
      (await request(users.hrB, 'GET', `${D}?employeeId=${emps.a2.id}`)).status], [[404, rules.DEPENDENT_EMPLOYEE], [404, rules.DEPENDENT_NOT_FOUND], [404, rules.DEPENDENT_NOT_FOUND], 200])
  } finally { await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchA.id }) }
  assert.equal((await repo('Dependent').findOneByOrFail({ id: other.id })).status, 'ACTIVE')
})

test('DP-02: طلب «تحديث المعالين» — الحقول من الخادم، والاعتماد بيضيف المعال بمستند هويته، والتعديل والحذف لمعال صاحب الطلب بس، والمحذوف بعد التقديم بيوقّف الاعتماد', async () => {
  const chain = await repo('ApprovalChain').save({ code: 'DP_HR', nameAr: 'سلسلة تحديث المعالين', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'DEPENDENTS_UPDATE', nameAr: 'تحديث المعالين', category: 'personal_data', destinationHandler: links.DEPENDENTS_REQUEST_HANDLER, approvalChainId: chain.id, isActive: true })
  users.approver = await account('approver', ['approve.hr', 'requests.view_all'])
  const ask = (user, payload) => request(user, 'POST', '/requests', { typeCode: 'DEPENDENTS_UPDATE', payload, submit: true })
  const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })
  const ACT = links.DEPENDENTS_REQUEST_ACTIONS
  const option = (id, name, relation) => `${name} — ${relation} (#${id})`

  // حقول النموذج من الخادم: معالين صاحب الحساب الساريين بس
  const fieldsFor = async user => { const type = expectStatus(await request(user, 'GET', '/requests/types'), 200).find(row => row.code === 'DEPENDENTS_UPDATE'); return [JSON.parse(type.customFields), JSON.parse(type.requiredFields)] }
  const [fields, required] = await fieldsFor(users.a1)
  assert.deepEqual([fields.map(field => field.key), required, fields[0].options, fields[1].options, fields[4].options, fields[7].options],
    [[...links.DEPENDENTS_REQUEST_CLIENT_KEYS], ['dependentAction'], ['إضافة معال', 'تعديل بيانات معال', 'حذف معال'], [option(state.son, 'يوسف أحمد', 'ابن')],
      ['زوج/زوجة', 'ابن', 'ابنة', 'أب', 'أم', 'أخرى'], ['ذكر', 'أنثى']])
  assert.deepEqual((await fieldsFor(users.a2))[0][1].options, [option(state.other, 'يوسف أحمد', 'ابن')])

  // التقديم: الإجراء إلزامي، والقيم بتتحكم، والتقديم مابيعدّلش السجل
  const countBefore = await repo('Dependent').count()
  assert.deepEqual(answer(await ask(users.a1, {})), [400, 'حقول ناقصة: dependentAction'])
  for (const [bad, message] of [[{ dependentAction: 'حاجة تانية' }, links.DEPENDENTS_REQUEST_ACTION], [{ dependentAction: ACT.ADD }, rules.DEPENDENT_NAME],
    [{ dependentAction: ACT.ADD, dependentName: 'ليلى أحمد' }, rules.DEPENDENT_RELATION], [{ dependentAction: ACT.ADD, dependentName: 'ليلى أحمد', dependentRelation: 'ابنة', dependentBirthDate: plus(2) }, rules.DEPENDENT_BIRTH],
    [{ dependentAction: ACT.UPDATE, dependentName: 'اسم جديد' }, links.DEPENDENTS_REQUEST_PICK], [{ dependentAction: ACT.UPDATE, dependent: option(state.son, 'يوسف أحمد', 'ابن') }, links.DEPENDENTS_REQUEST_EMPTY],
    // معال موظف تاني: بالاختيار أو بالرقم — نفس الرد
    [{ dependentAction: ACT.REMOVE, dependent: option(state.other, 'يوسف أحمد', 'ابن') }, links.DEPENDENTS_REQUEST_PICK], [{ dependentAction: ACT.REMOVE, dependentId: state.other }, links.DEPENDENTS_REQUEST_PICK],
    [{ dependentAction: ACT.REMOVE, dependentId: state.wife }, links.DEPENDENTS_REQUEST_PICK]]) {
    assert.deepEqual(answer(await ask(users.a1, bad)), [400, message], JSON.stringify(bad))
  }
  assert.deepEqual([await repo('Request').count(), await repo('Dependent').count()], [0, countBefore], 'المرفوض مابيسيبش مسودة')
  // الموظف مابيحددش «مشمول بالتأمين»
  assert.equal((await ask(users.a1, { dependentAction: ACT.ADD, dependentName: 'ليلى أحمد', dependentRelation: 'ابنة', isInsured: true })).status, 400)

  // «خلص لما»: طلب إضافة مولود اتعتمد ← المعال ظهر في الملف ← مستند هويته بانتهاء
  const expiry = plus(1800)
  const sent = expectStatus(await ask(users.a1, { dependentAction: ACT.ADD, dependentName: 'ليلى أحمد', dependentRelation: 'ابنة', dependentBirthDate: plus(-10), dependentNationalId: '5566778899', dependentGender: 'أنثى',
    dependentIdExpiry: expiry, dependentId: state.other, dependent: 'أي حاجة', reason: 'مولودة جديدة' }), 201)
  assert.deepEqual(JSON.parse((await repo('Request').findOneByOrFail({ id: sent.id })).payload), { dependentAction: ACT.ADD, dependentName: 'ليلى أحمد', dependentRelation: 'ابنة', dependentBirthDate: plus(-10),
    dependentNationalId: '5566778899', dependentGender: 'أنثى', dependentIdExpiry: expiry, reason: 'مولودة جديدة' })
  assert.equal(await repo('Dependent').count(), countBefore, 'التقديم مابيعدّلش')
  assert.notEqual((await approve(users.a1, sent.id)).status, 201)
  expectStatus(await approve(users.approver, sent.id), 201)
  const born = await repo('Dependent').findOneByOrFail({ requestId: sent.id })
  const done = await repo('Request').findOneByOrFail({ id: sent.id })
  assert.deepEqual([born.employeeId, born.nameAr, born.relation, String(born.birthDate).slice(0, 10), born.nationalId, born.gender, born.isInsured, born.status, born.createdByUserId, done.status, done.destinationRef],
    [emps.a1.id, 'ليلى أحمد', 'DAUGHTER', plus(-10), '5566778899', 'FEMALE', false, 'ACTIVE', null, 'COMPLETED', `DEP-${born.id}`])
  assert.deepEqual(await documentOf(born.documentId), [emps.a1.id, rules.DEPENDENT_ID_CODE, '5566778899', expiry, 'هوية المعال: ليلى أحمد'])
  const mine = expectStatus(await request(users.a1, 'GET', D + '/mine'), 200).dependents
  assert.deepEqual(mine.map(row => [row.id, row.nameAr, row.idExpiryDate]).at(-1), [born.id, 'ليلى أحمد', expiry])
  assert.deepEqual((await history(emps.a1.id)).at(-1), ['DATA', null, 'إضافة: ليلى أحمد (ابنة)', sent.id, null])
  // نفس رقم الهوية في طلب تاني: الاعتماد بيقف والطلب باقي
  const twin = expectStatus(await ask(users.a1, { dependentAction: ACT.ADD, dependentName: 'ليلى مكررة', dependentRelation: 'ابنة', dependentNationalId: '5566778899' }), 201)
  const refused = await approve(users.approver, twin.id)
  assert.deepEqual([refused.status === 201, messageOf(refused).includes(rules.DEPENDENT_DUPLICATE), (await repo('Request').findOneByOrFail({ id: twin.id })).status === 'COMPLETED', await repo('Dependent').count({ where: { nationalId: '5566778899' } })],
    [false, true, false, 1])

  // تعديل: المعال بالاختيار ورقمه بيثبّته الخادم؛ والاعتماد بيكتب المبعوت بس
  const pick = option(born.id, 'ليلى أحمد', 'ابنة')
  const change = expectStatus(await ask(users.a1, { dependentAction: ACT.UPDATE, dependent: pick, dependentId: state.son, dependentNameEn: 'Layla Ahmed', dependentIdExpiry: plus(2000) }), 201)
  assert.deepEqual(JSON.parse((await repo('Request').findOneByOrFail({ id: change.id })).payload), { dependentAction: ACT.UPDATE, dependent: pick, dependentNameEn: 'Layla Ahmed', dependentIdExpiry: plus(2000), dependentId: born.id })
  expectStatus(await approve(users.approver, change.id), 201)
  const changed = await repo('Dependent').findOneByOrFail({ id: born.id })
  assert.deepEqual([changed.nameAr, changed.nameEn, changed.nationalId, changed.documentId, (await documentOf(born.documentId))[3], (await repo('Request').findOneByOrFail({ id: change.id })).destinationRef],
    ['ليلى أحمد', 'Layla Ahmed', '5566778899', born.documentId, plus(2000), `DEP-${born.id}`])
  assert.deepEqual((await history(emps.a1.id)).at(-1), ['DATA', 'ليلى أحمد (ابنة)', 'تعديل: ليلى أحمد (ابنة) — الاسم بالإنجليزي، انتهاء الهوية', change.id, null])

  // حذف بطلب، والمعال اللي الموارد البشرية حذفته بعد التقديم بيوقّف الاعتماد والطلب باقي
  const drop = expectStatus(await ask(users.a1, { dependentAction: ACT.REMOVE, dependent: pick, reason: 'تسجيل بالغلط' }), 201)
  const late = expectStatus(await ask(users.a1, { dependentAction: ACT.UPDATE, dependent: pick, dependentNameEn: 'Layla' }), 201)
  expectStatus(await approve(users.approver, drop.id), 201)
  const removed = await repo('Dependent').findOneByOrFail({ id: born.id })
  assert.deepEqual([removed.status, removed.removeReason, (await history(emps.a1.id)).at(-1)], ['REMOVED', 'تسجيل بالغلط', ['DATA', 'ليلى أحمد (ابنة)', 'حذف', drop.id, null]])
  const stale = await approve(users.approver, late.id)
  assert.deepEqual([stale.status === 201, messageOf(stale).includes(links.DEPENDENTS_REQUEST_GONE), (await repo('Request').findOneByOrFail({ id: late.id })).status === 'COMPLETED', (await repo('Dependent').findOneByOrFail({ id: born.id })).nameEn],
    [false, true, false, 'Layla Ahmed'])
  // الموديول لما يتقفل المسارات بتتقفل
  expectStatus(await request(users.admin, 'PUT', '/modules/dependents', { enabled: false }), 200); modules.invalidate()
  try { assert.equal((await request(users.a1, 'GET', D + '/mine')).status, 404) } finally { expectStatus(await request(users.admin, 'PUT', '/modules/dependents', { enabled: true }), 200); modules.invalidate() }
})

test('DP-03: ضغطتين مع بعض بنفس رقم الهوية — واحدة بتعدّي والتانية 409، وصف واحد ومستند واحد', async () => {
  const body = { employeeId: emps.a2.id, nameAr: 'توأم', relation: 'DAUGHTER', nationalId: '7700770077', idExpiryDate: plus(300) }
  const results = await Promise.all(Array.from({ length: 4 }, () => request(users.hr, 'POST', D, body)))
  assert.deepEqual(results.map(response => response.status).sort(), [201, 409, 409, 409], JSON.stringify(results.map(response => response.body?.message)))
  const rows = await repo('Dependent').find({ where: { employeeId: emps.a2.id, nationalId: '7700770077' } })
  assert.deepEqual([rows.length, rows[0].status, (await ds.query('SELECT COUNT(*) AS [n] FROM [employee_documents] WHERE [employeeId] = @0 AND [number] = @1', [emps.a2.id, '7700770077']))[0].n], [1, 'ACTIVE', 1])
  // حذف وتعديل مع بعض لنفس المعال: واحد بس بيعدّي
  const [edit, remove] = await Promise.all([request(users.hr, 'PATCH', `${D}/${rows[0].id}`, { nameEn: 'Twin' }), request(users.hr, 'POST', `${D}/${rows[0].id}/remove`, { reason: 'سباق اختبار' })])
  const final = await repo('Dependent').findOneByOrFail({ id: rows[0].id })
  assert.deepEqual([remove.status, final.status, [200, 404].includes(edit.status), edit.status === 200 ? final.nameEn : null], [200, 'REMOVED', true, edit.status === 200 ? 'Twin' : null])
})
