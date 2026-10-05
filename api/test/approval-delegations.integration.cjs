'use strict'
// B2.6 (الجزء ب): تفويض الاعتمادات، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_delegation_test_<16 hex>).
//  DG-01) الإنشاء: الموظف لنفسه، ولغيره بصلاحية وفي نطاقه (ومش لنفسه بديل)؛ حدود الفترة والفئات والبديل (موظف تاني، نشط، في النطاق، ليه
//         حساب)؛ والقايمة وعلامة «معتمد هيكلي».
//  DG-02) طول الفترة الخطوة مستنية البديل كمان: صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين، والمفوِّض لسه يقدر يعتمد.
//  DG-03) قبل البداية وبعد النهاية وبعد الإلغاء ولما المفوِّض يسيب الشغل: البديل مالوش حاجة؛ والإلغاء لصاحبه أو لصاحب الصلاحية بس.
//  DG-04) تفويض بفئات: طلب برّه الفئة مش عند البديل.
//  DG-05) خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض.
//  DG-06) فصل المهام: البديل مايعتمدش طلبه، ولا طلب المفوِّض نفسه أو اللي أنشأه، ولا طلب ليه هو خطوة لسه مستنية فيه (باسمه أو بدور وظيفي)،
//         ولا طلب اعتمد فيه بصفة تانية (بنفسه أو عن مفوِّض تاني)، ولا خطوة بصفته بعد ما اعتمد بالنيابة؛ واللي اعتمده عن نفس المفوِّض
//         مابيمنعش؛ وبديل البديل مش بديل.
//  DG-07) النطاق: بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش؛ وهوية موظف برّه نطاق القارئ (اسمه ورقمه) مابتظهرش في القايمة ولا في
//         سجل التدقيق ولا في البحث فيه — بفرع الموظف دلوقتي.
//  DG-08) السري: البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس (في التفاصيل وفي لوحة الطلبات)، ومابيوصلش للمدير المباشر لصاحبه بتفويض.
//  DG-09) بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال.
//  DG-10) التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم (السري مش للمدير المباشر، ومش لصاحب الطلب ولا منشئه ولا لتابع له)؛ ولو
//         مالوش صاحب الخطوة بتفضل مع معتمدها؛ وخطوة الدور الوظيفي بتتحفظ زي الأول؛ ومهلة الخطوة بتبدأ لما توصل لصاحبها.
//  DG-11) تفويضين متداخلين في نفس اللحظة: واحد بس.
// Run (من api/): node --test test/approval-delegations.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_delegation_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-delegation-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, queue, requests, created = false, employeeNumber = 0
const mailbox = { sent: [] }
const org = {}, users = {}, emps = {}, types = {}, chains = {}

function assertDisposable() {
  assert.match(database, /^hr_delegation_test_[a-f0-9]{16}$/)
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
  return repo('Employee').save({ employeeCode: `DG${String(number).padStart(3, '0')}`, fullName: `موظف التفويض ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@delegation.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const submit = async (user, type, extra = {}) => expectStatus(await request(user, 'POST', '/requests', { typeCode: type.code, payload: { reason: 'طلب للاختبار' }, submit: true, ...extra }), 201)
const act = (user, id, action = 'APPROVE', comment) => request(user, 'POST', `/requests/${id}/act`, { action, comment })
const inboxIds = async user => expectStatus(await request(user, 'GET', '/requests/inbox'), 200).map(row => row.id)
const requestRow = async id => (await query('SELECT [id], [status], [currentStep], [resolvedSteps] FROM [requests] WHERE [id] = @0', [id]))[0]
const history = id => query('SELECT [approverId], [action], [step], [onBehalfOfEmployeeId] FROM [request_approvals] WHERE [requestId] = @0 ORDER BY [id]', [id])
const delegate = (user, body) => request(user, 'POST', '/requests/delegations', body)
const revoke = (user, id) => request(user, 'POST', `/requests/delegations/${id}/revoke`)
const listed = async user => expectStatus(await request(user, 'GET', '/requests/delegations'), 200)
// إلغاء كل التفويضات السارية جوه الاختبار (زي ما المفوِّض بيلغي)
const clearDelegations = () => query('UPDATE [approval_delegations] SET [revokedAt] = GETDATE(), [revokedByUserId] = 0 WHERE [revokedAt] IS NULL')
// كل اختبار بيبدأ نضيف: من غير أي تفويض (مسح في قاعدة الاختبار، عشان قاعدة «الملغي مش ساري» تتثبّت في اختبارها مش بالتنضيف)، ولا طلب
// قيد المراجعة من اختبار قبله، ولا موظف منقول لفرع تاني ولا حساب متغيّر ربطه أو صلاحيته (اختبار وقع مايوقّعش اللي بعده)
async function fresh() {
  await query('DELETE FROM [approval_delegations]')
  await query(`UPDATE [requests] SET [status] = N'CANCELLED' WHERE [status] = N'UNDER_REVIEW'`)
  await query('UPDATE [employees] SET [branchId] = @0 WHERE [id] IN (@1, @2)', [org.branchA.id, emps.manager.id, emps.deputy.id])
  await query('UPDATE [users] SET [employeeId] = CASE [id] WHEN @0 THEN @1 WHEN @2 THEN @3 END WHERE [id] IN (@0, @2, @4)',
    [users.manager.id, emps.manager.id, users.deputy.id, emps.deputy.id, users.chainsA.id])
  await permit('deputy', [])
}
const permit = async (key, permissions) => {
  await repo('User').update({ id: users[key].id }, { permissions: JSON.stringify(permissions) })
  users[key] = await repo('User').findOneByOrFail({ id: users[key].id })
}
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
// اتصال تاني بيمسك قفل لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: التزامن مضمون مش بالصدفة
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
    assert.equal(blocked, count, 'الطلبات واقفة على القفل الممسوك')
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
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: 'https://hr.example.invalid/' })
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
  requests = app.get(require('../src/requests/requests.service').RequestsService)
  assert.equal(app.get(require('../src/queue/queue.worker').QueueWorker).enabled, false)

  org.branchA = await repo('Branch').save({ code: 'DG_A', name: 'فرع التفويض أ' })
  org.branchB = await repo('Branch').save({ code: 'DG_B', name: 'فرع التفويض ب' })
  emps.head = await employee()
  org.department = await repo('Department').save({ name: 'قسم التفويض', branchId: org.branchA.id, managerEmployeeId: emps.head.id })
  emps.manager = await employee({ departmentId: org.department.id })
  emps.worker = await employee({ managerEmployeeId: emps.manager.id, departmentId: org.department.id })
  emps.deputy = await employee({ managerEmployeeId: emps.manager.id, departmentId: org.department.id })
  emps.second = await employee()
  emps.noAccount = await employee()
  emps.inactive = await employee({ isActive: false, status: 'terminated' })
  emps.remote = await employee({ branchId: org.branchB.id })
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.head = await account('head', 'employee', [], { employeeId: emps.head.id })
  users.manager = await account('manager', 'employee', [], { employeeId: emps.manager.id })
  users.worker = await account('worker', 'employee', [], { employeeId: emps.worker.id })
  users.deputy = await account('deputy', 'employee', [], { employeeId: emps.deputy.id })
  users.second = await account('second', 'employee', [], { employeeId: emps.second.id })
  users.remote = await account('remote', 'employee', [], { employeeId: emps.remote.id, branchId: org.branchB.id })
  users.chainsA = await account('chains-a', 'employee', ['approval_chains.manage'])
  users.chainsB = await account('chains-b', 'employee', ['approval_chains.manage'], { branchId: org.branchB.id })
  users.console = await account('console', 'employee', ['requests.view_all'])
  users.unlinked = await account('unlinked', 'employee', [])
  users.auditorA = await account('auditor-a', 'employee', ['audit.view'])
  users.hr = await account('hr', 'employee', ['approve.hr'])
  users.finance = await account('finance', 'employee', ['approve.finance'])

  const chain = async (code, steps, extra = {}) => {
    const row = await repo('ApprovalChain').save({ code, nameAr: `سلسلة ${code}`, isActive: true, autoApprove: false, ...extra })
    for (const [index, step] of steps.entries()) await repo('ApprovalStep').save({ chainId: row.id, stepOrder: index + 1, ...step })
    return row
  }
  chains.manager = await chain('DG_MANAGER', [{ approverRole: 'direct_manager_of_requester' }])
  chains.locked = await chain('DG_LOCKED', [{ approverRole: 'direct_manager_of_requester', canDelegate: false }])
  chains.twoSteps = await chain('DG_TWO', [{ approverRole: 'specific_employee', specificEmployeeId: emps.deputy.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.hrFirst = await chain('DG_HR_FIRST', [{ approverRole: 'hr' }, { approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.reversed = await chain('DG_REVERSED', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.deputy.id }])
  chains.thenHead = await chain('DG_THEN_HEAD', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.head.id }])
  chains.thenFinance = await chain('DG_THEN_FIN', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }, { approverRole: 'finance' }])
  chains.financeFirst = await chain('DG_FIN_FIRST', [{ approverRole: 'finance' }, { approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.twice = await chain('DG_TWICE', [{ approverRole: 'direct_manager_of_requester' }, { approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.secret = await chain('DG_SECRET', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.secretLater = await chain('DG_SECRET_LATER', [{ approverRole: 'specific_employee', specificEmployeeId: emps.second.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }])
  chains.secretEarlier = await chain('DG_SECRET_EARLIER', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.second.id }])
  chains.staged = await chain('DG_STAGED', [{ approverRole: 'specific_employee', specificEmployeeId: emps.manager.id }, { approverRole: 'specific_employee', specificEmployeeId: emps.head.id, slaDays: 2, escalateTo: 'hr' }])
  chains.toDirect = await chain('DG_TO_DIRECT', [{ approverRole: 'specific_employee', specificEmployeeId: emps.head.id, slaDays: 1, escalateTo: 'direct_manager_of_requester' }])
  chains.toSkipLevel = await chain('DG_TO_SKIP', [{ approverRole: 'specific_employee', specificEmployeeId: emps.second.id, slaDays: 1, escalateTo: 'manager_of_direct_manager' }])
  chains.escalating = await chain('DG_ESCALATE', [{ approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'department_manager_of_requester' }])
  chains.toFunctional = await chain('DG_TO_HR', [{ approverRole: 'direct_manager_of_requester', slaDays: 1, escalateTo: 'hr' }])
  const type = (code, nameAr, approvalChainId, extra = {}) => repo('RequestType').save({ code, nameAr, category: 'personal_data', destinationHandler: 'none', approvalChainId, isActive: true, ...extra })
  types.plain = await type('DG_PLAIN', 'طلب عادي', chains.manager.id)
  types.training = await type('DG_TRAINING', 'طلب تدريب', chains.manager.id, { category: 'training' })
  types.locked = await type('DG_LOCKED', 'طلب خطوته مقفولة', chains.locked.id)
  types.twoSteps = await type('DG_TWO', 'طلب بخطوتين', chains.twoSteps.id)
  types.hrFirst = await type('DG_HR_FIRST', 'طلب بخطوة موارد بشرية', chains.hrFirst.id)
  types.reversed = await type('DG_REVERSED', 'طلب البديل معتمد خطوته التانية', chains.reversed.id)
  types.thenHead = await type('DG_THEN_HEAD', 'طلب بخطوة للمدير وخطوة لمدير القسم', chains.thenHead.id)
  types.thenFinance = await type('DG_THEN_FIN', 'طلب بخطوة للمدير وبعدها مالية', chains.thenFinance.id)
  types.financeFirst = await type('DG_FIN_FIRST', 'طلب بخطوة مالية وبعدها المدير', chains.financeFirst.id)
  types.twice = await type('DG_TWICE', 'طلب بخطوتين للمدير نفسه', chains.twice.id)
  types.secret = await type('DG_SECRET', 'بلاغ حساس جدًا', chains.secret.id, { isConfidential: true })
  types.secretLater = await type('DG_SECRET_LATER', 'بلاغ سري خطوة المدير فيه التانية', chains.secretLater.id, { isConfidential: true })
  types.secretEarlier = await type('DG_SECRET_EARLIER', 'بلاغ سري خطوة المدير فيه الأولى', chains.secretEarlier.id, { isConfidential: true })
  types.staged = await type('DG_STAGED', 'طلب بخطوتين والتانية بمهلة', chains.staged.id)
  types.toDirect = await type('DG_TO_DIRECT', 'طلب بيتصعّد للمدير المباشر', chains.toDirect.id)
  types.secretToDirect = await type('DG_SECRET_DIRECT', 'بلاغ سري بيتصعّد للمدير المباشر', chains.toDirect.id, { isConfidential: true })
  types.toSkipLevel = await type('DG_TO_SKIP', 'طلب بيتصعّد لمدير المدير', chains.toSkipLevel.id)
  types.secretToSkipLevel = await type('DG_SECRET_SKIP', 'بلاغ سري بيتصعّد لمدير المدير', chains.toSkipLevel.id, { isConfidential: true })
  types.escalating = await type('DG_ESCALATE', 'طلب بيتصعّد', chains.escalating.id)
  types.toFunctional = await type('DG_TO_HR', 'طلب بيتصعّد للموارد البشرية', chains.toFunctional.id)
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-delegation-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'delegation fixture cleanup failed')
})

test('DG-01: الإنشاء — الموظف لنفسه، ولغيره بصلاحية وفي نطاقه؛ وحدود الفترة والفئات والبديل؛ والقايمة', async () => {
  const good = { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(5) }
  // حدود الفترة والفئات والسبب
  for (const [body, message] of [
    [{ ...good, endDate: day(-1), startDate: day(-3) }, 'فترة التفويض خلصت — اختار نهاية من النهارده أو بعده'],
    [{ ...good, startDate: day(5), endDate: day(2) }, 'نهاية التفويض قبل بدايته'],
    [{ ...good, endDate: day(366) }, 'فترة التفويض أقصاها سنة'],
    [{ ...good, startDate: '2026-02-30' }, 'تاريخ بداية ونهاية التفويض بصيغة YYYY-MM-DD'],
    [{ ...good, categories: ['training', 'nonsense'] }, 'فئة طلبات غير معروفة'],
    [{ ...good, delegateEmployeeId: emps.manager.id }, 'البديل لازم يكون موظف تاني'],
    [{ ...good, delegateEmployeeId: emps.noAccount.id }, 'البديل مالوش حساب شغال في النظام'],
  ]) {
    const response = await delegate(users.manager, body)
    assert.deepEqual([response.status, messageOf(response)], [400, message], JSON.stringify(body))
  }
  expectStatus(await delegate(users.manager, { ...good, startDate: 'tomorrow' }), 400)
  expectStatus(await delegate(users.manager, { ...good, reason: 'س'.repeat(301) }), 400)
  // بديل مش موجود، أو مش نشط، أو برّه نطاق اللي بينشئ: نفس الرد
  const missing = await delegate(users.manager, { ...good, delegateEmployeeId: 999999 })
  for (const id of [emps.inactive.id, emps.remote.id]) {
    const response = await delegate(users.manager, { ...good, delegateEmployeeId: id })
    assert.deepEqual([response.status, response.body.message], [404, missing.body.message])
  }
  assert.equal(missing.status, 404)
  // حساب من غير موظف
  const unlinked = await delegate(users.unlinked, good)
  assert.deepEqual([unlinked.status, messageOf(unlinked)], [400, 'حسابك مش مربوط بموظف — التفويض بيتسجّل على موظف'])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [approval_delegations]'))[0].n), 0, 'المرفوض ماكتبش حاجة')

  // الموظف لنفسه
  const mine = expectStatus(await delegate(users.manager, { ...good, categories: ['training', 'training'], reason: '  إجازة سنوية  ' }), 201)
  const stored = await repo('ApprovalDelegation').findOneByOrFail({ id: mine.id })
  assert.deepEqual([stored.delegatorEmployeeId, stored.delegateEmployeeId, stored.startDate, stored.endDate, stored.categories, stored.reason, stored.createdByUserId, stored.revokedAt],
    [emps.manager.id, emps.deputy.id, day(0), day(5), '["training"]', 'إجازة سنوية', users.manager.id, null])
  // وفي سجل التدقيق (فئة الصلاحيات): مين فوّض مين ولحد إمتى
  const audit = await query(`SELECT [category], [action], [entityId], [actorUserId], [branchId], [summary], [after] FROM [audit_log] WHERE [entityType] = N'approval_delegation' ORDER BY [id]`)
  assert.deepEqual(audit.map(row => [row.category, row.action, row.entityId, row.actorUserId, row.branchId, row.summary]),
    [['PERMISSIONS', 'APPROVAL_DELEGATION_CREATED', String(mine.id), users.manager.id, org.branchA.id, `تفويض اعتمادات {delegatorEmployeeId} لـ{delegateEmployeeId} من ${day(0)} لـ${day(5)}`]])
  // الملخص متخزن من غير أسماء (CRP2J)، والاسمين بيتحطوا في رد سجل التدقيق لقارئ الموظفين في نطاقه؛ والمنفّذ (المفوِّض نفسه) ظاهر بحسابه
  const shownAudit = expectStatus(await request(users.auditorA, 'GET', `/audit?entityType=approval_delegation&entityId=${mine.id}`), 200).rows[0]
  assert.deepEqual([shownAudit.summary, shownAudit.actorUserId, shownAudit.actorName, shownAudit.after.actorEmployeeId],
    [`تفويض اعتمادات ${emps.manager.fullName} لـ${emps.deputy.fullName} من ${day(0)} لـ${day(5)}`, users.manager.id, users.manager.displayName, emps.manager.id])
  // والحدث بيسجّل رقم المنفّذ لما يكون هو المفوِّض نفسه
  assert.deepEqual(JSON.parse(audit[0].after), { delegatorEmployeeId: emps.manager.id, delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(5), categories: ['training'],
    actorEmployeeId: emps.manager.id })
  // تفويض تاني متداخل لنفس المفوِّض مرفوض (حتى لبديل تاني)، وبعد نهايته مسموح
  const overlap = await delegate(users.manager, { delegateEmployeeId: emps.second.id, startDate: day(5), endDate: day(9) })
  assert.deepEqual([overlap.status, messageOf(overlap)], [409, 'للمفوِّض تفويض قايم في نفس الفترة — الغيه الأول أو اختار فترة تانية'])
  const later = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.second.id, startDate: day(6), endDate: day(9) }), 201)

  // لموظف تاني: بصلاحية «بانِي دورات الاعتماد» وفي نطاقه بس
  const forOther = { delegatorEmployeeId: emps.head.id, delegateEmployeeId: emps.second.id, startDate: day(0), endDate: day(2) }
  const noPermission = await delegate(users.deputy, forOther)
  assert.deepEqual([noPermission.status, messageOf(noPermission)], [403, 'تفويض اعتمادات موظف تاني لصاحب صلاحية «بانِي دورات الاعتماد» بس'])
  const outOfScope = await delegate(users.chainsB, forOther)
  assert.deepEqual([outOfScope.status, outOfScope.body.message], [404, missing.body.message])
  // المفوِّض برّه نطاقه والبديل جوّاه: نفس الرد (الحكم على المفوِّض لوحده)
  const foreignDelegator = await delegate(users.chainsB, { ...forOther, delegateEmployeeId: emps.remote.id })
  assert.deepEqual([foreignDelegator.status, foreignDelegator.body.message], [404, missing.body.message])
  // صاحب الصلاحية مايحطّش نفسه بديل عن غيره (كان هياخد خطوات غيره المفتوحة من غير ما صاحبها يفوّضه)
  await permit('second', ['approval_chains.manage'])
  const selfServing = await delegate(users.second, forOther)
  assert.deepEqual([selfServing.status, messageOf(selfServing)], [400, 'ماتقدرش تسجّل نفسك بديل عن موظف تاني — خلّيه يسجّل تفويضه بنفسه، أو يسجّله صاحب صلاحية غيرك'])
  await permit('second', [])
  const byAdmin = expectStatus(await delegate(users.chainsA, forOther), 201)
  assert.equal((await repo('ApprovalDelegation').findOneByOrFail({ id: byAdmin.id })).createdByUserId, users.chainsA.id)
  // ومنفّذ مش طرف (صاحب صلاحية سجّل تفويض غيره): الحدث من غير رقم منفّذ
  assert.deepEqual(JSON.parse((await query(`SELECT [after] FROM [audit_log] WHERE [action] = N'APPROVAL_DELEGATION_CREATED' AND [entityId] = @0`, [String(byAdmin.id)]))[0].after),
    { delegatorEmployeeId: emps.head.id, delegateEmployeeId: emps.second.id, startDate: day(0), endDate: day(2), categories: null })

  // القايمة: تفويضاتي، واللي أنا بديل فيها، ولصاحب الصلاحية تفويضات نطاقه
  const managerList = await listed(users.manager)
  assert.deepEqual([managerList.available, managerList.canManageOthers, managerList.others.length], [true, false, 0])
  assert.deepEqual(managerList.mine.map(row => [row.id, row.delegateName, row.startDate, row.endDate, row.categories, row.reason, row.state, row.canRevoke]), [
    [later.id, emps.second.fullName, day(6), day(9), null, null, 'UPCOMING', true], [mine.id, emps.deputy.fullName, day(0), day(5), ['training'], 'إجازة سنوية', 'ACTIVE', true]])
  const deputyList = await listed(users.deputy)
  assert.deepEqual([deputyList.mine.length, deputyList.toMe.map(row => [row.id, row.delegatorName, row.state, row.canRevoke])], [0, [[mine.id, emps.manager.fullName, 'ACTIVE', false]]])
  const chainsList = await listed(users.chainsA)
  assert.deepEqual([chainsList.canManageOthers, chainsList.others.map(row => row.id).sort((a, b) => a - b), chainsList.others.every(row => row.canRevoke)], [true, [mine.id, later.id, byAdmin.id].sort((a, b) => a - b), true])
  // صاحب الصلاحية في فرع تاني: ولا تفويض من دول في نطاقه
  assert.deepEqual((await listed(users.chainsB)).others, [])
  assert.deepEqual((({ mine, toMe, others }) => [mine, toMe, others])(await listed(users.unlinked)), [[], [], []])
  // «معتمد هيكلي» (بيها بند «بانتظار موافقتي» بيظهر للموظف والصندوق فاضي): كل سبب لوحده
  const approver = async user => (await listed(user)).approver
  assert.deepEqual([await approver(users.worker), await approver(users.remote), await approver(users.unlinked), await approver(users.manager)], [false, false, false, true])
  // مدير مسجّل لموظف شغال (ولموظف مش شغال لأ)
  const report = await employee({ branchId: org.branchB.id, managerEmployeeId: emps.remote.id })
  assert.equal(await approver(users.remote), true)
  await repo('Employee').update({ id: report.id }, { isActive: false })
  assert.equal(await approver(users.remote), false)
  // قائد فريق
  const team = await repo('Team').save({ name: 'فريق مؤقت', departmentId: org.department.id, leaderEmployeeId: emps.worker.id })
  assert.equal(await approver(users.worker), true)
  await repo('Team').delete({ id: team.id })
  assert.equal(await approver(users.worker), false)
  // مدير قسم أو إدارة
  const unit = await repo('Department').save({ name: 'قسم مؤقت', branchId: org.branchA.id, managerEmployeeId: emps.worker.id })
  assert.equal(await approver(users.worker), true)
  await repo('Department').delete({ id: unit.id })
  assert.equal(await approver(users.worker), false)
  // مدير فرع
  await repo('Branch').update({ id: org.branchB.id }, { managerEmployeeId: emps.worker.id })
  assert.equal(await approver(users.worker), true)
  await repo('Branch').update({ id: org.branchB.id }, { managerEmployeeId: null })
  assert.equal(await approver(users.worker), false)
  // مسمّى في خطوة سلسلة
  const named = await repo('ApprovalStep').save({ chainId: chains.manager.id, stepOrder: 9, approverRole: 'specific_employee', specificEmployeeId: emps.worker.id })
  assert.equal(await approver(users.worker), true)
  await repo('ApprovalStep').delete({ id: named.id })
  assert.equal(await approver(users.worker), false)
  await clearDelegations()
})

test('DG-02: طول الفترة الخطوة مستنية البديل كمان — صندوقه بشارة «بالنيابة عن»، وقراره بيتسجّل بالاسمين', async () => {
  await fresh()
  const req = await submit(users.worker, types.plain)
  // من غير تفويض: البديل مالوش حاجة
  assert.deepEqual([await inboxIds(users.manager), await inboxIds(users.deputy)], [[req.id], []])
  expectStatus(await act(users.deputy, req.id), 403)
  expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 403)
  const delegation = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(3) }), 201)
  // الطلب المفتوح من قبل التفويض بقى عند الاتنين، وعند البديل بالشارة
  const deputyInbox = expectStatus(await request(users.deputy, 'GET', '/requests/inbox'), 200)
  assert.deepEqual(deputyInbox.map(row => [row.id, row.onBehalfOfEmployeeId, row.onBehalfOfName]), [[req.id, emps.manager.id, emps.manager.fullName]])
  const managerInbox = expectStatus(await request(users.manager, 'GET', '/requests/inbox'), 200)
  assert.deepEqual(managerInbox.map(row => [row.id, row.onBehalfOfEmployeeId ?? null]), [[req.id, null]])
  // والبديل بيقرا تفاصيله (طرف طول ما الخطوة مستنية المفوِّض)
  assert.equal(expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 200).requesterId, emps.worker.id)
  // حد تالت مالوش حاجة
  assert.deepEqual(await inboxIds(users.second), [])
  expectStatus(await act(users.second, req.id), 403)
  // قرار البديل
  expectStatus(await act(users.deputy, req.id, 'APPROVE', 'تمام'), 201)
  assert.equal((await requestRow(req.id)).status, 'COMPLETED')
  assert.deepEqual((await history(req.id)).map(row => [row.approverId, row.action, row.onBehalfOfEmployeeId]), [[users.deputy.id, 'APPROVED', emps.manager.id]])
  // في تفاصيل الطلب: لأطرافه بالاسمين، ولصاحب «عرض كل الطلبات» من غير أسماء
  for (const user of [users.worker, users.deputy]) {
    const approvals = expectStatus(await request(user, 'GET', `/requests/${req.id}`), 200).approvals
    assert.deepEqual(approvals.map(row => [row.onBehalf, row.onBehalfOfName, row.actedByName]), [[true, emps.manager.fullName, users.deputy.displayName]], user.email)
  }
  const forConsole = expectStatus(await request(users.console, 'GET', `/requests/${req.id}`), 200).approvals
  assert.deepEqual(forConsole.map(row => [row.onBehalf, row.onBehalfOfName ?? null, row.actedByName ?? null]), [[true, null, null]])
  // والمفوِّض لسه يقدر يعتمد بنفسه، وقراره من غير «بالنيابة»
  const own = await submit(users.worker, types.plain)
  expectStatus(await act(users.manager, own.id), 201)
  assert.deepEqual((await history(own.id)).map(row => [row.approverId, row.onBehalfOfEmployeeId]), [[users.manager.id, null]])
  assert.deepEqual(expectStatus(await request(users.worker, 'GET', `/requests/${own.id}`), 200).approvals.map(row => row.onBehalf ?? false), [false])
  // الرفض والإرجاع من البديل بيتسجّلوا بالنيابة برضه، وبعد الإرجاع وإعادة التقديم لسه يقدر يعتمد
  const returned = await submit(users.worker, types.plain)
  expectStatus(await act(users.deputy, returned.id, 'RETURN', 'ناقص بيان'), 201)
  expectStatus(await request(users.worker, 'POST', `/requests/${returned.id}/resubmit`, { payload: { reason: 'اتكمّل' } }), 201)
  expectStatus(await act(users.deputy, returned.id, 'REJECT', 'مش مقبول'), 201)
  assert.deepEqual((await history(returned.id)).map(row => [row.approverId, row.action, row.onBehalfOfEmployeeId]),
    [[users.deputy.id, 'RETURNED_FOR_INFO', emps.manager.id], [users.deputy.id, 'REJECTED', emps.manager.id]])
  assert.equal(delegation.id > 0, true)
  await clearDelegations()
})

test('DG-03: قبل البداية وبعد النهاية وبعد الإلغاء البديل مالوش حاجة — والإلغاء لصاحبه أو لصاحب الصلاحية بس', async () => {
  await fresh()
  const req = await submit(users.worker, types.plain)
  // تفويض لسه مابدأش
  const upcoming = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(1), endDate: day(4) }), 201)
  assert.deepEqual(await inboxIds(users.deputy), [])
  expectStatus(await act(users.deputy, req.id), 403)
  // بدأ النهارده (آخر يوم فيه النهارده كمان)
  await query('UPDATE [approval_delegations] SET [startDate] = @1, [endDate] = @1 WHERE [id] = @0', [upcoming.id, day(0)])
  assert.deepEqual(await inboxIds(users.deputy), [req.id])
  // انتهى امبارح
  await query('UPDATE [approval_delegations] SET [startDate] = @1, [endDate] = @2 WHERE [id] = @0', [upcoming.id, day(-3), day(-1)])
  assert.deepEqual(await inboxIds(users.deputy), [])
  expectStatus(await act(users.deputy, req.id), 403)
  expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 403)
  assert.deepEqual((({ id, state, canRevoke }) => [id, state, canRevoke])((await listed(users.manager)).mine.find(row => row.id === upcoming.id)), [upcoming.id, 'ENDED', false])
  const ended = await revoke(users.manager, upcoming.id)
  assert.deepEqual([ended.status, messageOf(ended)], [400, 'التفويض انتهى'])

  // تفويض ساري بيتلغي: مش من البديل ولا من حد تاني ولا من صاحب صلاحية برّه النطاق (نفس رد التفويض اللي مش موجود)
  const active = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(4) }), 201)
  assert.deepEqual(await inboxIds(users.deputy), [req.id])
  const missing = await revoke(users.manager, 999999)
  for (const user of [users.deputy, users.second, users.chainsB]) {
    const response = await revoke(user, active.id)
    assert.deepEqual([response.status, response.body.message], [404, missing.body.message], user.email)
  }
  assert.equal(missing.status, 404)
  expectStatus(await revoke(users.manager, active.id), 201)
  const stored = await repo('ApprovalDelegation').findOneByOrFail({ id: active.id })
  assert.deepEqual([!!stored.revokedAt, stored.revokedByUserId], [true, users.manager.id])
  assert.deepEqual((await query(`SELECT [category], [actorUserId], [summary], [before] FROM [audit_log] WHERE [action] = N'APPROVAL_DELEGATION_REVOKED' AND [entityId] = @0`, [String(active.id)]))
    .map(row => [row.category, row.actorUserId, row.summary, JSON.parse(row.before)]), [['PERMISSIONS', users.manager.id, 'إلغاء تفويض اعتمادات {delegatorEmployeeId}',
    // المفوِّض لغى تفويضه بنفسه: رقمه كمنفّذ متسجّل مع الحدث
    { delegatorEmployeeId: emps.manager.id, delegateEmployeeId: emps.deputy.id, actorEmployeeId: emps.manager.id }]])
  assert.equal(expectStatus(await request(users.auditorA, 'GET', `/audit?entityType=approval_delegation&entityId=${active.id}`), 200).rows.find(row => row.action === 'APPROVAL_DELEGATION_REVOKED').summary,
    `إلغاء تفويض اعتمادات ${emps.manager.fullName}`)
  assert.deepEqual(await inboxIds(users.deputy), [])
  expectStatus(await act(users.deputy, req.id), 403)
  const again = await revoke(users.manager, active.id)
  assert.deepEqual([again.status, messageOf(again)], [400, 'التفويض ملغي فعلًا'])
  assert.deepEqual((await listed(users.manager)).mine.find(row => row.id === active.id).state, 'REVOKED')
  // وصاحب الصلاحية في النطاق بيلغي تفويض غيره
  const third = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(4) }), 201)
  expectStatus(await revoke(users.chainsA, third.id), 201)
  assert.equal((await repo('ApprovalDelegation').findOneByOrFail({ id: third.id })).revokedByUserId, users.chainsA.id)
  // صاحب الصلاحية مش طرف: حدث الإلغاء من غير رقم منفّذ
  assert.deepEqual(JSON.parse((await query(`SELECT [before] FROM [audit_log] WHERE [action] = N'APPROVAL_DELEGATION_REVOKED' AND [entityId] = @0`, [String(third.id)]))[0].before),
    { delegatorEmployeeId: emps.manager.id, delegateEmployeeId: emps.deputy.id })
  // المفوِّض مابقاش موظف شغال: تفويضه وقف (خطوته بتتعامل «واقفة» زي الأول) وبيتعرض «انتهى»؛ ولما يرجع التفويض بيرجع
  const fourth = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(4) }), 201)
  assert.deepEqual(await inboxIds(users.deputy), [req.id])
  await repo('Employee').update({ id: emps.manager.id }, { isActive: false })
  assert.deepEqual(await inboxIds(users.deputy), [])
  expectStatus(await act(users.deputy, req.id), 403)
  assert.deepEqual([(await listed(users.deputy)).toMe.find(row => row.id === fourth.id).state,
    (({ state, canRevoke }) => [state, canRevoke])((await listed(users.manager)).mine.find(row => row.id === fourth.id))], ['ENDED', ['ENDED', false]])
  await repo('Employee').update({ id: emps.manager.id }, { isActive: true })
  assert.deepEqual([await inboxIds(users.deputy), (await listed(users.deputy)).toMe.find(row => row.id === fourth.id).state], [[req.id], 'ACTIVE'])
  expectStatus(await revoke(users.manager, fourth.id), 201)
  // والمفوِّض لسه معاه طلبه
  assert.deepEqual(await inboxIds(users.manager), [req.id])
  expectStatus(await act(users.manager, req.id), 201)
})

test('DG-04: تفويض بفئات — طلب برّه الفئة مش عند البديل', async () => {
  await fresh()
  const plain = await submit(users.worker, types.plain), training = await submit(users.worker, types.training)
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2), categories: ['training', 'letters'] }), 201)
  assert.deepEqual(await inboxIds(users.deputy), [training.id])
  expectStatus(await act(users.deputy, plain.id), 403)
  expectStatus(await request(users.deputy, 'GET', `/requests/${plain.id}`), 403)
  expectStatus(await act(users.deputy, training.id), 201)
  assert.deepEqual((await history(training.id)).map(row => row.onBehalfOfEmployeeId), [emps.manager.id])
  expectStatus(await act(users.manager, plain.id), 201)
  await clearDelegations()
})

test('DG-05: خطوة «مش مسموح تتفوّض» مابتتفوّضش، وخطوة محفوظة من غير العلامة بتتفوّض', async () => {
  await fresh()
  const locked = await submit(users.worker, types.locked), open = await submit(users.worker, types.plain)
  // العلامة في الخطوة المحفوظة للمقفولة بس: الخطوات العادية زي ما كانت بتتحفظ
  assert.deepEqual([JSON.parse((await requestRow(locked.id)).resolvedSteps).map(step => step.canDelegate), JSON.parse((await requestRow(open.id)).resolvedSteps).map(step => 'canDelegate' in step)], [[false], [false]])
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  assert.deepEqual(await inboxIds(users.deputy), [open.id])
  expectStatus(await act(users.deputy, locked.id), 403)
  expectStatus(await request(users.deputy, 'GET', `/requests/${locked.id}`), 403)
  assert.deepEqual((await inboxIds(users.manager)).sort((a, b) => a - b), [locked.id, open.id])
  // محرر السلسلة: الخانة بتتحفظ وبترجع
  expectStatus(await request(users.admin, 'PATCH', `/settings/approval-chains/${chains.manager.id}/steps`, { steps: [{ approverRole: 'direct_manager_of_requester', canDelegate: false }] }), 200)
  assert.equal((await repo('ApprovalStep').findOneByOrFail({ chainId: chains.manager.id })).canDelegate, false)
  const listedChain = expectStatus(await request(users.admin, 'GET', '/settings/approval-chains'), 200).find(row => row.id === chains.manager.id)
  assert.deepEqual(listedChain.steps.map(step => step.canDelegate), [false])
  const afterLock = await submit(users.worker, types.plain)
  assert.deepEqual(JSON.parse((await requestRow(afterLock.id)).resolvedSteps).map(step => step.canDelegate), [false])
  assert.equal((await inboxIds(users.deputy)).includes(afterLock.id), false)
  expectStatus(await request(users.admin, 'PATCH', `/settings/approval-chains/${chains.manager.id}/steps`, { steps: [{ approverRole: 'direct_manager_of_requester' }] }), 200)
  assert.equal((await repo('ApprovalStep').findOneByOrFail({ chainId: chains.manager.id })).canDelegate, true)
  for (const id of [locked.id, open.id, afterLock.id]) expectStatus(await act(users.manager, id), 201)
  await clearDelegations()
})

test('DG-06: فصل المهام — البديل مايعتمدش طلبه، ولا طلب ليه هو خطوة مستنية فيه، ولا طلب اعتمد فيه بصفة تانية؛ وبديل البديل مش بديل', async () => {
  await fresh()
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(3) }), 201)
  // طلب البديل نفسه (مديره المباشر هو المفوِّض): مش في صندوقه ومايعتمدوش
  const own = await submit(users.deputy, types.plain)
  assert.equal((await inboxIds(users.deputy)).includes(own.id), false)
  expectStatus(await act(users.deputy, own.id), 403)
  assert.deepEqual((await history(own.id)).length, 0)
  // طلب البديل معتمد مسمّى في خطوته الأولى: خطوته في صندوقه من غير شارة «بالنيابة»، وبيعتمدها هو، وخطوة المفوِّض مش عليه
  const two = await submit(users.worker, types.twoSteps)
  const ownStep = expectStatus(await request(users.deputy, 'GET', '/requests/inbox'), 200).find(row => row.id === two.id)
  assert.deepEqual([ownStep.onBehalfOfEmployeeId ?? null, ownStep.onBehalfOfName ?? null], [null, null])
  expectStatus(await act(users.deputy, two.id), 201)
  assert.deepEqual([(await requestRow(two.id)).currentStep, (await inboxIds(users.deputy)).includes(two.id), (await inboxIds(users.manager)).includes(two.id)], [2, false, true])
  expectStatus(await act(users.deputy, two.id), 403)
  assert.deepEqual((await history(two.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId]), [[users.deputy.id, 1, null]])
  // طلب البديل معتمد مسمّى في خطوته التانية (لسه ماجتش): خطوة المفوِّض الأولى مش عليه — وإلا يعتمد المستويين
  const reversed = await submit(users.worker, types.reversed)
  assert.deepEqual([(await inboxIds(users.deputy)).includes(reversed.id), (await inboxIds(users.manager)).includes(reversed.id)], [false, true])
  expectStatus(await act(users.deputy, reversed.id), 403)
  assert.deepEqual((await history(reversed.id)).length, 0)
  // بعد إرجاع وإعادة تقديم السلسلة بتبدأ من الأول: البديل اللي اعتمد خطوة المفوِّض قبل كده يعتمدها تاني (نفس الخطوة مش مستوى تاني)
  const again = await submit(users.worker, types.thenHead)
  expectStatus(await act(users.deputy, again.id), 201)
  expectStatus(await act(users.head, again.id, 'RETURN', 'ناقص بيان'), 201)
  expectStatus(await request(users.worker, 'POST', `/requests/${again.id}/resubmit`, { payload: { reason: 'اتكمّل' } }), 201)
  assert.deepEqual([(await requestRow(again.id)).currentStep, (await inboxIds(users.deputy)).includes(again.id)], [1, true])
  expectStatus(await act(users.deputy, again.id), 201)
  assert.deepEqual((await history(again.id)).map(row => [row.approverId, row.action, row.step, row.onBehalfOfEmployeeId]),
    [[users.deputy.id, 'APPROVED', 1, emps.manager.id], [users.head.id, 'RETURNED_FOR_INFO', 2, null], [users.deputy.id, 'APPROVED', 1, emps.manager.id]])
  expectStatus(await act(users.head, again.id), 201)
  // خطوتين للمفوِّض نفسه (مدير مباشر، وبالاسم): البديل بينوب في الاتنين — المفوِّض نفسه كان هيعتمدهم
  const twice = await submit(users.worker, types.twice)
  expectStatus(await act(users.deputy, twice.id), 201)
  assert.deepEqual([(await requestRow(twice.id)).currentStep, (await inboxIds(users.deputy)).includes(twice.id)], [2, true])
  expectStatus(await act(users.deputy, twice.id), 201)
  assert.deepEqual([(await requestRow(twice.id)).status, (await history(twice.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId])],
    ['COMPLETED', [[users.deputy.id, 1, emps.manager.id], [users.deputy.id, 2, emps.manager.id]]])
  // بديل لمفوِّضين في نفس الطلب (المدير ومدير القسم): اعتمد عن الأول، فخطوة التاني مش عليه
  const headDelegation = expectStatus(await delegate(users.head, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(3) }), 201)
  const both = await submit(users.worker, types.thenHead)
  expectStatus(await act(users.deputy, both.id), 201)
  assert.deepEqual([(await requestRow(both.id)).currentStep, (await inboxIds(users.deputy)).includes(both.id), (await inboxIds(users.head)).includes(both.id)], [2, false, true])
  expectStatus(await act(users.deputy, both.id), 403)
  expectStatus(await act(users.head, both.id), 201)
  assert.deepEqual((await history(both.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId]), [[users.deputy.id, 1, emps.manager.id], [users.head.id, 2, null]])
  expectStatus(await revoke(users.head, headDelegation.id), 201)
  // طلب المفوِّض نفسه وخطوته باسمه (هو مايعتمدوش): بديله مايعتمدوش عنه
  const ofDelegator = await submit(users.manager, types.thenHead)
  assert.deepEqual([(await inboxIds(users.deputy)).includes(ofDelegator.id), (await inboxIds(users.manager)).includes(ofDelegator.id)], [false, false])
  expectStatus(await act(users.deputy, ofDelegator.id), 403)
  assert.deepEqual((await history(ofDelegator.id)).length, 0)
  // وطلب باسم المفوِّض قدّمه حد تاني نيابةً عنه: نفس الحكم
  await permit('second', ['requests.create_on_behalf'])
  const forDelegator = await submit(users.second, types.thenHead, { onBehalfEmployeeId: emps.manager.id })
  await permit('second', [])
  assert.deepEqual([(await requestRow(forDelegator.id)).status, (await inboxIds(users.deputy)).includes(forDelegator.id)], ['UNDER_REVIEW', false])
  expectStatus(await act(users.deputy, forDelegator.id), 403)
  assert.deepEqual((await history(forDelegator.id)).length, 0)
  // وطلب أنشأه المفوِّض نيابةً عن موظف (مايعتمدش اللي أنشأه): بديله مايعتمدوش عنه
  await permit('manager', ['requests.create_on_behalf'])
  const createdByDelegator = await submit(users.manager, types.plain, { onBehalfEmployeeId: emps.worker.id })
  await permit('manager', [])
  assert.deepEqual([(await requestRow(createdByDelegator.id)).status, (await inboxIds(users.deputy)).includes(createdByDelegator.id)], ['UNDER_REVIEW', false])
  expectStatus(await act(users.deputy, createdByDelegator.id), 403)
  expectStatus(await act(users.manager, createdByDelegator.id), 403)
  assert.deepEqual((await history(createdByDelegator.id)).length, 0)
  // اعتمد خطوة بالنيابة وبعدها خد صلاحية خطوة تانية في نفس الطلب: مايعتمدهاش بصفته، وحامل تاني للدور بيعتمدها
  const later = await submit(users.worker, types.thenFinance), refusable = await submit(users.worker, types.thenFinance)
  expectStatus(await act(users.deputy, later.id), 201)
  expectStatus(await act(users.deputy, refusable.id), 201)
  await permit('deputy', ['approve.finance'])
  const afterOnBehalf = await act(users.deputy, later.id)
  assert.deepEqual([afterOnBehalf.status, messageOf(afterOnBehalf)], [403, 'اعتمدت خطوة في الطلب ده بالنيابة عن معتمد تاني — لازم حد غيرك يعتمد الخطوة دي'])
  expectStatus(await act(users.finance, later.id), 201)
  assert.deepEqual((await history(later.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId]), [[users.deputy.id, 1, emps.manager.id], [users.finance.id, 2, null]])
  // المنع على الاعتماد بس: الرفض بصفته مسموح (مابيعدّيش مستوى تاني)
  expectStatus(await act(users.deputy, refusable.id, 'REJECT', 'مش مستوفي'), 201)
  assert.deepEqual((await history(refusable.id)).map(row => [row.approverId, row.action, row.step, row.onBehalfOfEmployeeId]),
    [[users.deputy.id, 'APPROVED', 1, emps.manager.id], [users.deputy.id, 'REJECTED', 2, null]])
  // البديل حامل دور وظيفي خطوته لسه جاية في الطلب (مالية): خطوة المفوِّض مش عليه — وإلا يعتمد المستويين، واحد منهم بالتفويض
  const thenFinance = await submit(users.worker, types.thenFinance)
  assert.deepEqual([(await inboxIds(users.deputy)).includes(thenFinance.id), (await inboxIds(users.manager)).includes(thenFinance.id)], [false, true])
  expectStatus(await act(users.deputy, thenFinance.id), 403)
  expectStatus(await act(users.manager, thenFinance.id), 201)
  expectStatus(await act(users.deputy, thenFinance.id), 201)
  assert.deepEqual((await history(thenFinance.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId]), [[users.manager.id, 1, null], [users.deputy.id, 2, null]])
  // ولو خطوة الدور الوظيفي اتصرف فيها حامل تاني: مابقتش مستنياه، فبينوب عادي في خطوة المفوِّض
  const financeFirst = await submit(users.worker, types.financeFirst)
  expectStatus(await act(users.finance, financeFirst.id), 201)
  const delegated = expectStatus(await request(users.deputy, 'GET', '/requests/inbox'), 200).find(row => row.id === financeFirst.id)
  assert.equal(delegated?.onBehalfOfEmployeeId, emps.manager.id)
  expectStatus(await act(users.deputy, financeFirst.id), 201)
  assert.deepEqual((await history(financeFirst.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId]), [[users.finance.id, 1, null], [users.deputy.id, 2, emps.manager.id]])
  // طلب اعتمد البديل خطوته الأولى بدور وظيفي: خطوة المفوِّض التانية مش عليه
  await permit('deputy', ['approve.hr'])
  const hrFirst = await submit(users.worker, types.hrFirst)
  expectStatus(await act(users.deputy, hrFirst.id), 201)
  assert.deepEqual([(await requestRow(hrFirst.id)).currentStep, (await inboxIds(users.deputy)).includes(hrFirst.id)], [2, false])
  // (مخرج الموارد البشرية للطلب الواقف مش تفويض: المعتمد المسمّى هنا شغال، فمفيش مخرج)
  expectStatus(await request(users.deputy, 'GET', `/requests/${hrFirst.id}`), 200)
  await permit('deputy', [])
  expectStatus(await act(users.deputy, hrFirst.id), 403)
  // بديل البديل مش بديل للمفوِّض
  expectStatus(await delegate(users.deputy, { delegateEmployeeId: emps.second.id, startDate: day(0), endDate: day(3) }), 201)
  const plain = await submit(users.worker, types.plain)
  assert.deepEqual([(await inboxIds(users.deputy)).includes(plain.id), (await inboxIds(users.second)).includes(plain.id)], [true, false])
  expectStatus(await act(users.second, plain.id), 403)
  for (const id of [own.id, two.id, hrFirst.id, plain.id, reversed.id]) expectStatus(await act(users.manager, id), 201)
  await clearDelegations()
  // مدير النظام لو هو البديل: قراره في خطوة المفوِّض بالنيابة، وبعدها لسه يقدر يفكّ خطوة تانية بصفته (آخر مخرج للطلب الواقف)
  users.root = await account('root', 'super_admin', [], { employeeId: emps.noAccount.id, branchId: null, scopeAllBranches: true })
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.noAccount.id, startDate: day(0), endDate: day(3) }), 201)
  const unblocked = await submit(users.worker, types.thenHead)
  expectStatus(await act(users.root, unblocked.id), 201)
  expectStatus(await act(users.root, unblocked.id), 201)
  assert.deepEqual([(await requestRow(unblocked.id)).status, (await history(unblocked.id)).map(row => [row.approverId, row.step, row.onBehalfOfEmployeeId])],
    ['COMPLETED', [[users.root.id, 1, emps.manager.id], [users.root.id, 2, null]]])
  await repo('User').update({ id: users.root.id }, { isActive: false })
  await clearDelegations()
})

test('DG-07: النطاق — بديل فرع الطلب برّه نطاقه مابيشوفوش ومابيعتمدوش', async () => {
  await fresh()
  // صاحب صلاحية على كل الفروع بيفوّض لموظف في فرع تاني (المدير نفسه مايقدرش يختاره: برّه نطاقه)
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.remote.id, startDate: day(0), endDate: day(2) }), 404)
  const crossBranch = expectStatus(await delegate(users.admin, { delegatorEmployeeId: emps.manager.id, delegateEmployeeId: emps.remote.id, startDate: day(0), endDate: day(2) }), 201)
  // اسم البديل (فرع تاني) لصاحب الصلاحية اللي الفرع ده برّه نطاقه مابيظهرش؛ ولصاحب كل الفروع وللمفوِّض نفسه بيظهر
  const nameFor = async (user, list) => (await listed(user))[list].find(row => row.id === crossBranch.id)
  assert.deepEqual((({ delegatorName, delegateName }) => [delegatorName, delegateName])(await nameFor(users.chainsA, 'others')), [emps.manager.fullName, null])
  assert.deepEqual((({ delegatorName, delegateName }) => [delegatorName, delegateName])(await nameFor(users.admin, 'others')), [emps.manager.fullName, emps.remote.fullName])
  assert.equal((await nameFor(users.manager, 'mine')).delegateName, emps.remote.fullName)
  // والرقم زي الاسم (CRP2I): رقم البديل اللي من فرع تاني فاضي لصاحب صلاحية الفرع (مش طرف)، وموجود لصاحب كل الفروع وللطرفين؛ ورقم المفوِّض موجود
  const numbersFor = async (user, list) => (({ delegatorEmployeeId, delegateEmployeeId }) => [delegatorEmployeeId, delegateEmployeeId])(await nameFor(user, list))
  assert.deepEqual([await numbersFor(users.chainsA, 'others'), await numbersFor(users.admin, 'others'), await numbersFor(users.manager, 'mine'), await numbersFor(users.remote, 'toMe')],
    [[emps.manager.id, null], [emps.manager.id, emps.remote.id], [emps.manager.id, emps.remote.id], [emps.manager.id, emps.remote.id]])
  // وسجل التدقيق بيتقري بفرع المفوِّض: الملخص المخزن من غير أسماء، ورقم البديل في التفاصيل
  const [crossAudit] = await query(`SELECT [summary], [branchId], [after] FROM [audit_log] WHERE [action] = N'APPROVAL_DELEGATION_CREATED' AND [entityId] = @0`, [String(crossBranch.id)])
  assert.deepEqual([crossAudit.summary, crossAudit.branchId, JSON.parse(crossAudit.after).delegateEmployeeId],
    [`تفويض اعتمادات {delegatorEmployeeId} لـ{delegateEmployeeId} من ${day(0)} لـ${day(2)}`, org.branchA.id, emps.remote.id])
  const req = await submit(users.worker, types.plain)
  assert.deepEqual(await inboxIds(users.remote), [])
  const refused = await act(users.remote, req.id)
  assert.equal(refused.status, 403)
  const missing = await request(users.remote, 'GET', '/requests/999999'), hidden = await request(users.remote, 'GET', `/requests/${req.id}`)
  assert.deepEqual([hidden.status, hidden.body.message], [404, missing.body.message])
  assert.deepEqual((await history(req.id)).length, 0)
  // والبديل اللي نطاقه بقى فيه الفرع (كل الفروع): الطلب عنده
  await repo('User').update({ id: users.remote.id }, { scopeAllBranches: true })
  users.remote = await repo('User').findOneByOrFail({ id: users.remote.id })
  assert.deepEqual(await inboxIds(users.remote), [req.id])
  expectStatus(await act(users.remote, req.id), 201)
  assert.deepEqual((await history(req.id)).map(row => [row.approverId, row.onBehalfOfEmployeeId]), [[users.remote.id, emps.manager.id]])
  await repo('User').update({ id: users.remote.id }, { scopeAllBranches: false })
  users.remote = await repo('User').findOneByOrFail({ id: users.remote.id })
  // ورد سجل التدقيق (CRP2I): لقارئ فرع المفوِّض رقم البديل الأجنبي فاضي في حدثي الإنشاء والإلغاء ورقم المفوِّض موجود؛ ولصاحب كل الفروع
  // الرقمين موجودين؛ والمخزن زي ما هو
  expectStatus(await revoke(users.admin, crossBranch.id), 201)
  const auditOf = async user => {
    const rows = expectStatus(await request(user, 'GET', `/audit?entityType=approval_delegation&entityId=${crossBranch.id}`), 200).rows
    const numbers = side => [side.delegatorEmployeeId, side.delegateEmployeeId]
    return [numbers(rows.find(row => row.action === 'APPROVAL_DELEGATION_CREATED').after), numbers(rows.find(row => row.action === 'APPROVAL_DELEGATION_REVOKED').before)]
  }
  assert.deepEqual(await auditOf(users.auditorA), [[emps.manager.id, null], [emps.manager.id, null]])
  assert.deepEqual(await auditOf(users.admin), [[emps.manager.id, emps.remote.id], [emps.manager.id, emps.remote.id]])
  // والاسم زي الرقم (CRP2J): في ملخص الحدثين لقارئ الفرع «موظف برّه نطاقك» مكان البديل الأجنبي، ولصاحب كل الفروع اسمه
  const summariesOf = async user => expectStatus(await request(user, 'GET', `/audit?entityType=approval_delegation&entityId=${crossBranch.id}`), 200).rows
    .sort((a, b) => Number(a.id) - Number(b.id)).map(row => row.summary)
  assert.deepEqual(await summariesOf(users.auditorA),
    [`تفويض اعتمادات ${emps.manager.fullName} لـموظف برّه نطاقك من ${day(0)} لـ${day(2)}`, `إلغاء تفويض اعتمادات ${emps.manager.fullName}`])
  assert.deepEqual(await summariesOf(users.admin),
    [`تفويض اعتمادات ${emps.manager.fullName} لـ${emps.remote.fullName} من ${day(0)} لـ${day(2)}`, `إلغاء تفويض اعتمادات ${emps.manager.fullName}`])
  // والبحث بنص: اسم البديل الأجنبي لقارئ الفرع زي اسم مش موجود؛ واسم موظف في نطاقه بيلاقي الحدثين؛ وصاحب كل الفروع بيلاقي بالاسمين
  const found = async (user, id, text) => expectStatus(await request(user, 'GET', `/audit?entityType=approval_delegation&entityId=${id}&q=${encodeURIComponent(text)}`), 200).total
  assert.deepEqual([await found(users.auditorA, crossBranch.id, emps.remote.fullName), await found(users.auditorA, crossBranch.id, 'اسم مش موجود خالص'),
    await found(users.auditorA, crossBranch.id, emps.manager.fullName), await found(users.admin, crossBranch.id, emps.remote.fullName), await found(users.admin, crossBranch.id, 'إلغاء تفويض'),
    // واسم موظف في نطاقه بس مش مذكور في الحدث مابيطابقش
    await found(users.auditorA, crossBranch.id, emps.worker.fullName)],
  [0, 0, 2, 2, 1, 0])
  const storedAudit = await query(`SELECT [before], [after] FROM [audit_log] WHERE [entityType] = N'approval_delegation' AND [entityId] = @0 ORDER BY [id]`, [String(crossBranch.id)])
  assert.deepEqual(storedAudit.map(row => JSON.parse(row.after ?? row.before).delegateEmployeeId), [emps.remote.id, emps.remote.id])
  // والحكم بفرع الموظف دلوقتي: تفويض والطرفين في فرع أ، وبعدها البديل اتنقل لفرع ب — قارئ فرع أ مابيشوفش اسمه في الملخص ولا رقمه، والبحث
  // باسمه زي اسم مش موجود. صاحب كل الفروع زي ما هو، والمخزن ماتغيّرش. ولما يرجع فرعه بيرجعوا
  const local = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(1) }), 201)
  const localAudit = async user => (({ summary, after }) => [summary, after.delegateEmployeeId])(expectStatus(await request(user, 'GET', `/audit?entityType=approval_delegation&entityId=${local.id}`), 200).rows[0])
  const named = `تفويض اعتمادات ${emps.manager.fullName} لـ${emps.deputy.fullName} من ${day(0)} لـ${day(1)}`
  const storedOf = () => query(`SELECT * FROM [audit_log] WHERE [entityType] = N'approval_delegation' AND [entityId] = @0`, [String(local.id)])
  const storedBefore = await storedOf()
  assert.deepEqual([await localAudit(users.auditorA), await found(users.auditorA, local.id, emps.deputy.fullName)], [[named, emps.deputy.id], 1])
  await repo('Employee').update({ id: emps.deputy.id }, { branchId: org.branchB.id })
  assert.deepEqual([await localAudit(users.auditorA), await found(users.auditorA, local.id, emps.deputy.fullName), await found(users.auditorA, local.id, 'اسم مش موجود خالص')],
    [[`تفويض اعتمادات ${emps.manager.fullName} لـموظف برّه نطاقك من ${day(0)} لـ${day(1)}`, null], 0, 0])
  assert.deepEqual([await localAudit(users.admin), await found(users.admin, local.id, emps.deputy.fullName), await storedOf()], [[named, emps.deputy.id], 1, storedBefore])
  await repo('Employee').update({ id: emps.deputy.id }, { branchId: org.branchA.id })
  assert.deepEqual([await localAudit(users.auditorA), await found(users.auditorA, local.id, emps.deputy.fullName)], [[named, emps.deputy.id], 1])
  // والمنفّذ زي الطرف (CRP2J): المفوِّض سجّل تفويضين بنفسه ولغى الأول بنفسه، والتاني لغاه البديل (وهو صاحب صلاحية). الحدث بيسجّل رقم المنفّذ لما
  // يكون طرف فيه. صف لكل حدث: الملخص، ورقم حساب المنفّذ واسمه، وفيه IP وجهاز ولا لأ، ورقم المنفّذ في التفاصيل
  expectStatus(await revoke(users.manager, local.id), 201)
  const handed = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(1) }), 201)
  await permit('deputy', ['approval_chains.manage'])
  expectStatus(await revoke(users.deputy, handed.id), 201)
  await permit('deputy', [])
  const events = [local.id, handed.id].map(String)
  const storedEvents = () => query(`SELECT * FROM [audit_log] WHERE [entityType] = N'approval_delegation' AND [entityId] IN (@0, @1) ORDER BY [id]`, events)
  const storedActors = await storedEvents()
  assert.deepEqual(storedActors.map(row => [row.action, row.actorUserId, JSON.parse(row.after ?? row.before).actorEmployeeId, row.ip != null, row.userAgent != null]), [
    ['APPROVAL_DELEGATION_CREATED', users.manager.id, emps.manager.id, true, true], ['APPROVAL_DELEGATION_REVOKED', users.manager.id, emps.manager.id, true, true],
    ['APPROVAL_DELEGATION_CREATED', users.manager.id, emps.manager.id, true, true], ['APPROVAL_DELEGATION_REVOKED', users.deputy.id, emps.deputy.id, true, true]])
  const actorsOf = async reader => {
    const rows = []
    for (const id of events) rows.push(...expectStatus(await request(reader, 'GET', `/audit?entityType=approval_delegation&entityId=${id}`), 200).rows)
    return rows.sort((a, b) => Number(a.id) - Number(b.id)).map(row => [row.summary, row.actorUserId, row.actorName, row.ip != null, row.userAgent != null, (row.after ?? row.before).actorEmployeeId])
  }
  const byActor = async (reader, actorUserId) => {
    let total = 0
    for (const id of events) total += expectStatus(await request(reader, 'GET', `/audit?entityType=approval_delegation&entityId=${id}&actorUserId=${actorUserId}`), 200).total
    return total
  }
  const OUT = 'موظف برّه نطاقك', M = emps.manager.fullName, D = emps.deputy.fullName
  const shownActor = account => [account.id, account.displayName, true, true, account.employeeId], hiddenActor = [null, OUT, false, false, null]
  const view = (delegator, delegate, managerActor, deputyActor) => [
    [`تفويض اعتمادات ${delegator} لـ${delegate} من ${day(0)} لـ${day(1)}`, ...managerActor], [`إلغاء تفويض اعتمادات ${delegator}`, ...managerActor],
    [`تفويض اعتمادات ${delegator} لـ${delegate} من ${day(0)} لـ${day(1)}`, ...managerActor], [`إلغاء تفويض اعتمادات ${delegator}`, ...deputyActor]]
  const everyone = view(M, D, shownActor(users.manager), shownActor(users.deputy))
  const setLink = (account, employeeId) => query('UPDATE [users] SET [employeeId] = @1 WHERE [id] = @0', [account.id, employeeId])
  const setBranch = (employeeRow, branch) => query('UPDATE [employees] SET [branchId] = @1 WHERE [id] = @0', [employeeRow.id, branch.id])
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.manager.id), await byActor(users.auditorA, users.deputy.id)], [everyone, 3, 1])
  // المفوِّض اتنقل لفرع ب: قارئ فرع أ مابيشوفش حسابه (الرقم والاسم) ولا جهازه ولا رقمه في الأحداث اللي نفّذها، والفلتر برقم حسابه زي رقم حساب
  // مش موجود. حدث البديل (لسه في فرع أ) منفّذه ظاهر. صاحب كل الفروع زي ما هو، والمخزن ماتغيّرش
  await setBranch(emps.manager, org.branchB)
  const managerGone = view(OUT, D, hiddenActor, shownActor(users.deputy))
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.manager.id), await byActor(users.auditorA, users.deputy.id), await byActor(users.auditorA, 999999)],
    [managerGone, 0, 1, 0])
  assert.deepEqual([await actorsOf(users.admin), await byActor(users.admin, users.manager.id), await storedEvents()], [everyone, 3, storedActors])
  // وحسابه اتفك ربطه بالموظف (أو اتربط بموظف تاني) بعد الحدث: لسه محجوب، برقمه المتسجّل مع الحدث
  await setLink(users.manager, null)
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.manager.id)], [managerGone, 0])
  await setLink(users.manager, emps.noAccount.id)
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.manager.id)], [managerGone, 0])
  await setLink(users.manager, emps.manager.id)
  // والبديل اللي لغى (طرف هو كمان) اتنقل وحسابه اتفك ربطه: حدثه محجوب زيه
  await setBranch(emps.deputy, org.branchB)
  await setLink(users.deputy, null)
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.deputy.id)], [view(OUT, OUT, hiddenActor, hiddenActor), 0])
  assert.deepEqual([await actorsOf(users.admin), await byActor(users.admin, users.deputy.id), await storedEvents()], [everyone, 1, storedActors])
  await setLink(users.deputy, emps.deputy.id)
  await setBranch(emps.deputy, org.branchA)
  // ولما المفوِّض يرجع فرعه بيرجعوا
  await setBranch(emps.manager, org.branchA)
  assert.deepEqual([await actorsOf(users.auditorA), await byActor(users.auditorA, users.manager.id), await byActor(users.auditorA, users.deputy.id)], [everyone, 3, 1])
  // وبربط الحساب دلوقتي كمان: حساب سجّل تفويض غيره (مش طرف وقتها، فالحدث من غير رقم منفّذ)، وبعدها الحساب اتربط بالمفوِّض نفسه والمفوِّض اتنقل
  const lateDelegator = await employee(), lateDelegate = await employee()
  await account('late-delegate', 'employee', [], { employeeId: lateDelegate.id })
  const late = expectStatus(await delegate(users.chainsA, { delegatorEmployeeId: lateDelegator.id, delegateEmployeeId: lateDelegate.id, startDate: day(0), endDate: day(1) }), 201)
  const lateEvent = async (reader, filter = '') => (({ total, rows }) => [total, rows.map(row => [row.actorUserId, row.actorName, row.ip != null])])(
    expectStatus(await request(reader, 'GET', `/audit?entityType=approval_delegation&entityId=${late.id}${filter}`), 200))
  const byChains = `&actorUserId=${users.chainsA.id}`, chainsShown = [1, [[users.chainsA.id, users.chainsA.displayName, true]]]
  assert.deepEqual([await lateEvent(users.auditorA), await lateEvent(users.auditorA, byChains)], [chainsShown, chainsShown])
  await setLink(users.chainsA, lateDelegator.id)
  await setBranch(lateDelegator, org.branchB)
  assert.deepEqual([await lateEvent(users.auditorA), await lateEvent(users.auditorA, byChains)], [[1, [[null, OUT, false]]], [0, []]])
  assert.deepEqual([await lateEvent(users.admin), await lateEvent(users.admin, byChains)], [chainsShown, chainsShown])
  await setLink(users.chainsA, null)
  assert.deepEqual([await lateEvent(users.auditorA), await lateEvent(users.auditorA, byChains)], [chainsShown, chainsShown])
  // ومنفّذ مش طرف في التفويض بيفضل ظاهر زي باقي أحداث السجل، حتى لو ملف موظفه في فرع برّه نطاق القارئ: صاحب صلاحية على كل الفروع وملفه في فرع ب
  const officerFile = await employee({ branchId: org.branchB.id })
  const officer = await account('officer', 'employee', ['approval_chains.manage'], { employeeId: officerFile.id, branchId: org.branchB.id, scopeAllBranches: true })
  const byOfficer = expectStatus(await delegate(officer, { delegatorEmployeeId: emps.head.id, delegateEmployeeId: emps.second.id, startDate: day(0), endDate: day(1) }), 201)
  const officerEvent = expectStatus(await request(users.auditorA, 'GET', `/audit?entityType=approval_delegation&entityId=${byOfficer.id}&actorUserId=${officer.id}`), 200)
  assert.deepEqual([officerEvent.total, officerEvent.rows.map(row => [row.summary, row.actorUserId, row.actorName, row.ip != null])],
    [1, [[`تفويض اعتمادات ${emps.head.fullName} لـ${emps.second.fullName} من ${day(0)} لـ${day(1)}`, officer.id, officer.displayName, true]]])
  await repo('User').update({ id: officer.id }, { isActive: false })
  // وحدث نوع كيانه اسم من أسماء Object (constructor): مش من الأنواع المعلَنة، فصفحة السجل بترجع عادي
  await query(`INSERT [audit_log]([at], [category], [action], [entityType], [entityId], [branchId], [summary]) VALUES (GETDATE(), N'EXPORT', N'SCREEN_EXPORT', N'constructor', N'x', @0, N'حدث للاختبار')`,
    [org.branchA.id])
  assert.deepEqual((({ total, rows }) => [total, rows.map(row => row.summary)])(expectStatus(await request(users.auditorA, 'GET', '/audit?entityType=constructor'), 200)), [1, ['حدث للاختبار']])
  await clearDelegations()
})

test('DG-08: السري — البديل بيقراه طول ما الخطوة الحالية مستنية المفوِّض بس', async () => {
  await fresh()
  const req = await submit(users.worker, types.secret)
  expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 403)
  const delegation = expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  const seen = expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 200)
  assert.deepEqual([seen.requesterId, JSON.parse(seen.payload).reason, seen.confidentialMasked ?? false], [emps.worker.id, 'طلب للاختبار', false])
  // طلب سري قديم المفوِّض اعتمده قبل التفويض: مش للبديل
  await clearDelegations()
  const old = await submit(users.worker, types.secret)
  expectStatus(await act(users.manager, old.id), 201)
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  expectStatus(await request(users.deputy, 'GET', `/requests/${old.id}`), 403)
  // ولو البديل معاه «عرض كل الطلبات»: صف الطلب في لوحة الطلبات بنفس حكم التفاصيل — المستني المفوِّض مكشوف، والقديم محجوب
  const consoleRows = async user => {
    const rows = expectStatus(await request(user, 'GET', '/requests/all'), 200)
    return [req.id, old.id].map(id => (({ requesterId, confidentialMasked }) => [requesterId, confidentialMasked ?? false])(rows.find(row => row.id === id)))
  }
  await permit('deputy', ['requests.view_all'])
  assert.deepEqual(await consoleRows(users.deputy), [[emps.worker.id, false], [null, true]])
  assert.deepEqual(await consoleRows(users.console), [[null, true], [null, true]])
  await clearDelegations()
  assert.deepEqual(await consoleRows(users.deputy), [[null, true], [null, true]])
  await permit('deputy', [])
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  // وصاحب «عرض كل الطلبات» لسه محجوب عنه
  assert.equal(expectStatus(await request(users.console, 'GET', `/requests/${req.id}`), 200).confidentialMasked, true)
  // التفويض اتلغى: البديل مابقاش طرف
  await clearDelegations()
  expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 403)
  // ولو اعتمده وهو بديل: بقى في سجله زي أي معتمد
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  expectStatus(await act(users.deputy, req.id), 201)
  await clearDelegations()
  assert.equal(expectStatus(await request(users.deputy, 'GET', `/requests/${req.id}`), 200).requesterId, emps.worker.id)
  assert.equal(delegation.id > 0, true)
  // الخطوة الحالية بس والطلب لسه شغال: خطوة المفوِّض لسه جاية = مش للبديل، وصلت = له؛ وخطوته خلصت والطلب عند غيره = مش له
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  const laterStep = await submit(users.worker, types.secretLater)
  expectStatus(await request(users.deputy, 'GET', `/requests/${laterStep.id}`), 403)
  expectStatus(await act(users.second, laterStep.id), 201)
  assert.equal(expectStatus(await request(users.deputy, 'GET', `/requests/${laterStep.id}`), 200).requesterId, emps.worker.id)
  const earlierStep = await submit(users.worker, types.secretEarlier)
  expectStatus(await act(users.manager, earlierStep.id), 201)
  assert.deepEqual([(await requestRow(earlierStep.id)).status, (await requestRow(earlierStep.id)).currentStep], ['UNDER_REVIEW', 2])
  expectStatus(await request(users.deputy, 'GET', `/requests/${earlierStep.id}`), 403)
  await clearDelegations()
  // السري مابيوصلش للمدير المباشر لصاحبه بتفويض (التقديم نفسه بيتخطّاه)؛ والطلب العادي بنفس السلسلة بيوصله
  expectStatus(await delegate(users.head, { delegateEmployeeId: emps.manager.id, startDate: day(0), endDate: day(2) }), 201)
  const complaint = await submit(users.worker, types.secretToDirect), ordinary = await submit(users.worker, types.toDirect)
  const managerInbox = await inboxIds(users.manager)
  assert.deepEqual([managerInbox.includes(complaint.id), managerInbox.includes(ordinary.id)], [false, true])
  expectStatus(await request(users.manager, 'GET', `/requests/${complaint.id}`), 403)
  expectStatus(await act(users.manager, complaint.id), 403)
  expectStatus(await act(users.manager, ordinary.id), 201)
  assert.deepEqual((await history(ordinary.id)).map(row => [row.approverId, row.onBehalfOfEmployeeId]), [[users.manager.id, emps.head.id]])
  assert.deepEqual((await history(complaint.id)).length, 0)
  // وبديل تاني مش المدير المباشر لصاحب الطلب بيوصله السري عادي
  await clearDelegations()
  expectStatus(await delegate(users.head, { delegateEmployeeId: emps.second.id, startDate: day(0), endDate: day(2) }), 201)
  assert.equal(expectStatus(await request(users.second, 'GET', `/requests/${complaint.id}`), 200).requesterId, emps.worker.id)
  await clearDelegations()
})

test('DG-09: بريد «طلب بانتظارك» بيروح للبديل كمان، ومابيتبعتش لو التفويض اتلغى قبل الإرسال', async () => {
  await fresh()
  await setting('notifications.email.enabled', 'true')
  await drain()
  mailbox.sent.length = 0
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  const req = await submit(users.worker, types.plain)
  await drain()
  const to = mailbox.sent.map(message => message.to).sort()
  assert.deepEqual(to, ['deputy@delegation.invalid', 'manager@delegation.invalid'])
  assert.ok(mailbox.sent.every(message => message.text.includes(`/approvals-inbox?request=${req.id}`)))
  // من غير تفويض: للمعتمد بس
  await clearDelegations()
  mailbox.sent.length = 0
  const second = await submit(users.worker, types.plain)
  await drain()
  assert.deepEqual(mailbox.sent.map(message => message.to), ['manager@delegation.invalid'])
  // التفويض اتلغى بعد ما الرسالة اتجهّزت وقبل ما تتبعت (ساعات الهدوء بتأجّل الإرسال): البديل مابيتبعتلوش، والمعتمد بيتبعتله
  const minuteNow = new Date().getHours() * 60 + new Date().getMinutes()
  const clock = offset => { const minute = (((minuteNow + offset) % 1440) + 1440) % 1440; return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}` }
  const quiet = on => setting('notifications.quiet_hours', on ? `${clock(-60)}-${clock(120)}` : '')
  const deliveries = requestId => query(`SELECT d.[status], d.[detail], n.[recipientUserId] FROM [notification_deliveries] d INNER JOIN [notifications] n ON n.[id] = d.[notificationId]
    WHERE n.[entityType] = N'request' AND n.[entityId] = @0 AND d.[channel] = N'EMAIL' ORDER BY n.[recipientUserId]`, [String(requestId)])
  expectStatus(await delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(2) }), 201)
  mailbox.sent.length = 0
  await quiet(true)
  const third = await submit(users.worker, types.plain)
  await drain()
  assert.deepEqual([(await deliveries(third.id)).map(row => [row.recipientUserId, row.status]), mailbox.sent.length],
    [[[users.manager.id, 'PENDING'], [users.deputy.id, 'PENDING']].sort((a, b) => a[0] - b[0]), 0])
  await clearDelegations()
  await quiet(false)
  await query(`UPDATE [jobs_queue] SET [runAfter] = DATEADD(second, -1, SYSUTCDATETIME()) WHERE [jobType] = N'notifications.email' AND [status] = N'PENDING'`)
  await drain()
  assert.deepEqual((await deliveries(third.id)).map(row => [row.recipientUserId, row.status, row.detail]),
    [[users.manager.id, 'SENT', null], [users.deputy.id, 'SKIPPED', 'الطلب مابقاش مستني اعتماد الحساب ده']].sort((a, b) => a[0] - b[0]))
  assert.deepEqual(mailbox.sent.map(message => message.to), ['manager@delegation.invalid'])
  for (const id of [req.id, second.id, third.id]) expectStatus(await act(users.manager, id), 201)
  await setting('notifications.email.enabled', 'false')
})

test('DG-10: التصعيد لدور هيكلي بيحسب صاحب الدور الجديد بأحكام التقديم — ولو مالوش صاحب مسموح الخطوة بتفضل مع معتمدها؛ والوظيفي من غير موظف مسمّى', async () => {
  await fresh()
  const overdue = async id => {
    const row = await requestRow(id)
    const steps = JSON.parse(row.resolvedSteps).map(step => ({ ...step, dueAt: '2020-01-01T00:00:00.000Z' }))
    await query('UPDATE [requests] SET [resolvedSteps] = @1 WHERE [id] = @0', [id, JSON.stringify(steps)])
  }
  const stepOf = async id => JSON.parse((await requestRow(id)).resolvedSteps)[0]
  // من المدير المباشر لمدير القسم: الخطوة بتتنقل لمدير القسم فعلًا
  const req = await submit(users.worker, types.escalating)
  assert.deepEqual((({ role, approverEmployeeId, escalateTo }) => [role, approverEmployeeId, escalateTo])(await stepOf(req.id)), ['direct_manager_of_requester', emps.manager.id, 'department_manager_of_requester'])
  await overdue(req.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  assert.deepEqual((({ role, approverEmployeeId, escalateTo }) => [role, approverEmployeeId, escalateTo])(await stepOf(req.id)), ['department_manager_of_requester', emps.head.id, null])
  assert.deepEqual((await history(req.id)).map(row => [row.approverId, row.action]), [[0, 'ESCALATED']])
  assert.deepEqual([(await inboxIds(users.head)).includes(req.id), (await inboxIds(users.manager)).includes(req.id)], [true, false])
  expectStatus(await act(users.manager, req.id), 403)
  expectStatus(await act(users.head, req.id), 201)
  // مفيش مدير قسم: الخطوة بتفضل مع المدير المباشر، ومن غير سطر تصعيد
  await repo('Department').update({ id: org.department.id }, { managerEmployeeId: null })
  const stuck = await submit(users.worker, types.escalating)
  await overdue(stuck.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual((({ role, approverEmployeeId, escalateTo }) => [role, approverEmployeeId, escalateTo])(await stepOf(stuck.id)), ['direct_manager_of_requester', emps.manager.id, 'department_manager_of_requester'])
  assert.deepEqual((await history(stuck.id)).length, 0)
  // مدير القسم طلع صاحب الطلب نفسه: زي اللي مالوش صاحب — للطلب اللي قدّمه بنفسه، وللي اتقدّم باسمه من حد تاني
  await permit('second', ['requests.create_on_behalf'])
  const forWorker = await submit(users.second, types.escalating, { onBehalfEmployeeId: emps.worker.id })
  await permit('second', [])
  await overdue(forWorker.id)
  await repo('Department').update({ id: org.department.id }, { managerEmployeeId: emps.worker.id })
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual([(await stepOf(stuck.id)).approverEmployeeId, (await stepOf(forWorker.id)).approverEmployeeId], [emps.manager.id, emps.manager.id])
  await repo('Department').update({ id: org.department.id }, { managerEmployeeId: emps.head.id })
  assert.deepEqual(await requests.runEscalations(), { escalated: 2 })
  assert.deepEqual([(await stepOf(stuck.id)).approverEmployeeId, (await stepOf(forWorker.id)).approverEmployeeId], [emps.head.id, emps.head.id])
  expectStatus(await act(users.head, stuck.id), 201)
  expectStatus(await act(users.head, forWorker.id), 201)
  // لدور وظيفي: من غير موظف مسمّى، وحامل الدور يعتمد والمدير المباشر مابقاش عليه
  const toHr = await submit(users.worker, types.toFunctional)
  await overdue(toHr.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  // (خطوة الدور الوظيفي بتتحفظ زي الأول بالحرف: الدور بيتبدّل والباقي زي ما هو)
  assert.deepEqual((({ role, approverEmployeeId, escalateTo }) => [role, approverEmployeeId, escalateTo])(await stepOf(toHr.id)), ['hr', emps.manager.id, null])
  expectStatus(await act(users.manager, toHr.id), 403)
  expectStatus(await act(users.hr, toHr.id), 201)
  // السري مابيتصعّدش للمدير المباشر (التقديم نفسه بيتخطّاه في السري)؛ والطلب العادي بنفس السلسلة بيتصعّد له
  const shape = async id => (({ role, approverEmployeeId }) => [role, approverEmployeeId])(await stepOf(id))
  const sealed = await submit(users.worker, types.secretToDirect), open = await submit(users.worker, types.toDirect)
  await overdue(sealed.id); await overdue(open.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  assert.deepEqual([await shape(sealed.id), await shape(open.id)], [['specific_employee', emps.head.id], ['direct_manager_of_requester', emps.manager.id]])
  expectStatus(await request(users.manager, 'GET', `/requests/${sealed.id}`), 403)
  expectStatus(await act(users.head, sealed.id), 201)
  expectStatus(await act(users.manager, open.id), 201)
  // ولا لمنشئ الطلب نيابةً (مايعتمدش اللي أنشأه): الخطوة بتفضل مع معتمدها
  await permit('head', ['requests.create_on_behalf'])
  const byHead = await submit(users.head, types.escalating, { onBehalfEmployeeId: emps.worker.id })
  await permit('head', [])
  await overdue(byHead.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual(await shape(byHead.id), ['direct_manager_of_requester', emps.manager.id])
  expectStatus(await act(users.manager, byHead.id), 201)
  // مهلة الخطوة بتبدأ لما توصل لصاحبها: خطوة تانية مهلتها (المحسوبة وقت التقديم) فاتت قبل ما توصل مابتتصعّدش في ساعتها
  const staged = await submit(users.worker, types.staged)
  await overdue(staged.id)
  expectStatus(await act(users.manager, staged.id), 201)
  const arrived = JSON.parse((await requestRow(staged.id)).resolvedSteps)[1]
  assert.ok(Date.parse(arrived.dueAt) > Date.now() + 1.9 * 86400000 && Date.parse(arrived.dueAt) < Date.now() + 2.1 * 86400000, arrived.dueAt)
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual((({ role, approverEmployeeId }) => [role, approverEmployeeId])(JSON.parse((await requestRow(staged.id)).resolvedSteps)[1]), ['specific_employee', emps.head.id])
  expectStatus(await act(users.head, staged.id), 201)
  // «مدير المدير»: بيتحسب (مدير المدير المباشر المسجّل في ملفه)
  await repo('Employee').update({ id: emps.manager.id }, { managerEmployeeId: emps.head.id })
  const skip = await submit(users.worker, types.toSkipLevel)
  await overdue(skip.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  assert.deepEqual(await shape(skip.id), ['manager_of_direct_manager', emps.head.id])
  expectStatus(await act(users.head, skip.id), 201)
  // ولو طلع تابع لصاحب الطلب (دايرة في المديرين المسجّلين: مدير المدير مديره صاحب الطلب): مابيتصعّدش
  await repo('Employee').update({ id: emps.head.id }, { managerEmployeeId: emps.worker.id })
  const cycle = await submit(users.worker, types.toSkipLevel)
  await overdue(cycle.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual(await shape(cycle.id), ['specific_employee', emps.second.id])
  await repo('Employee').update({ id: emps.head.id }, { managerEmployeeId: null })
  await repo('Employee').update({ id: emps.manager.id }, { managerEmployeeId: null })
  expectStatus(await act(users.second, cycle.id), 201)
  // المدير المباشر هو رأس الشركة (مدير الإدارة التنفيذية): «مدير المدير» بيقع عليه هو — السري مابيتصعّدش له، والعادي بيتصعّد
  const executive = await repo('Department').save({ name: 'الإدارة التنفيذية للاختبار', branchId: org.branchA.id, managerEmployeeId: emps.manager.id, isExecutive: true, unitType: 'ADMINISTRATION' })
  const secretTop = await submit(users.worker, types.secretToSkipLevel), openTop = await submit(users.worker, types.toSkipLevel)
  await overdue(secretTop.id); await overdue(openTop.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  assert.deepEqual([await shape(secretTop.id), await shape(openTop.id)], [['specific_employee', emps.second.id], ['manager_of_direct_manager', emps.manager.id]])
  await repo('Department').delete({ id: executive.id })
  expectStatus(await act(users.second, secretTop.id), 201)
  expectStatus(await act(users.manager, openTop.id), 201)
  // تأجيل القسط بيمشي على سلسلة السلفة وسريتها (زي التقديم): السلفة سرية = تأجيلها مابيتصعّدش للمدير المباشر
  const loanDeferral = require('../src/requests/loan-installment-requests').LOAN_DEFERRAL_TYPE
  const ensureType = async (code, extra) => (await repo('RequestType').findOneBy({ code }))
    ? repo('RequestType').update({ code }, extra) : repo('RequestType').save({ code, nameAr: code, category: 'financial', destinationHandler: 'none', approvalChainId: chains.toDirect.id, isActive: true, ...extra })
  await ensureType('LOAN', { isConfidential: true })
  await ensureType(loanDeferral, { isConfidential: false })
  const deferral = await submit(users.worker, types.toDirect)
  await query('UPDATE [requests] SET [typeCode] = @1, [definitionCode] = @1 WHERE [id] = @0', [deferral.id, loanDeferral])
  await overdue(deferral.id)
  assert.deepEqual(await requests.runEscalations(), { escalated: 0 })
  assert.deepEqual(await shape(deferral.id), ['specific_employee', emps.head.id])
  await repo('RequestType').update({ code: 'LOAN' }, { isConfidential: false })
  assert.deepEqual(await requests.runEscalations(), { escalated: 1 })
  assert.deepEqual(await shape(deferral.id), ['direct_manager_of_requester', emps.manager.id])
})

test('DG-11: تفويضين متداخلين لنفس المفوِّض في نفس اللحظة — واحد بس', async () => {
  await fresh()
  const before = Number((await query('SELECT COUNT(*) AS [n] FROM [approval_delegations] WHERE [revokedAt] IS NULL'))[0].n)
  const results = await releaseTogether(
    `DECLARE @r int; EXEC @r = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000; SELECT @r AS [r]`,
    [`hr:approval-delegation:${emps.manager.id}`], 2,
    () => Promise.all([delegate(users.manager, { delegateEmployeeId: emps.deputy.id, startDate: day(0), endDate: day(3) }),
      delegate(users.chainsA, { delegatorEmployeeId: emps.manager.id, delegateEmployeeId: emps.second.id, startDate: day(2), endDate: day(6) })]))
  assert.deepEqual(results.map(response => response.status).sort(), [201, 409])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [approval_delegations] WHERE [revokedAt] IS NULL'))[0].n), before + 1)
})
