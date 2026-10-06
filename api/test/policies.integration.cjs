'use strict'
// B2.7 (الجزء أ): مكتبة السياسات وبوابة الإقرار، على قاعدة SQL مؤقتة معزولة بتتمسح في الآخر (hr_policies_test_<16 hex>).
//  PL-01) إنشاء السياسة وتعديل بياناتها: لصاحب «إدارة السياسات» ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة بنطاق القارئ.
//  PL-02) نشر نسخة: نص أو ملف PDF (واحد منهم)، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة.
//  PL-03) «سياساتي» و«اللي مستنيني»: الجمهور «مين + فين»، وحساب من غير موظف، والمسودة، والنسخة اللي لسه ماسرتش، وغير الإلزامية.
//  PL-04) الإقرار: الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة (حتى في نفس اللحظة)، والدليل (الحساب، الوقت، البصمة، الـIP، الجهاز).
//  PL-05) البوابة: جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة (مسار مسار)؛ والإقرار بيفتح فورًا؛ وكلمة السر
//         المؤقتة الأول؛ ومدير السياسات بيسحب وهو مقفول.
//  PL-06) مين مابيتقفلش: حساب من غير موظف، وموظف برّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه.
//  PL-07) نسخة جديدة: غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها.
//  PL-08) التقرير: مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ.
//  PL-09) قراءة النسخة وملفها: للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة.
//  PL-10) من غير سياسة إلزامية منشورة: مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها: الحساب «المش مقفول» بيتفحص مرة في المدة.
//  PL-11) سجل التدقيق: إنشاء وتعديل ونشر وسحب.
// Run (من api/): node --test test/policies.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_policies_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-policies-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, gate, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}

function assertDisposable() {
  assert.match(database, /^hr_policies_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
const token = user => jwt.sign(payloadOf(user))
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
  return repo('Employee').save({ employeeCode: `PL${String(number).padStart(3, '0')}`, fullName: `موظف السياسات ${number}`, branchId: org.branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'transfer', ...extra })
}
const account = (label, role, permissions, extra = {}) => repo('User').save({ email: `${label}@policies.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role, branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return localDate(date) }
const sha = content => crypto.createHash('sha256').update(content).digest('hex')
// PDF صغير صحيح الشكل (رأس وذيل) — المحتوى مش مهم، المهم نوعه وبايتاته
const pdf = (label = 'policy') => Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n% ${label}\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`, 'latin1')
const png = () => Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
async function upload(user, bytes = pdf(), name = 'policy.pdf', type = 'application/pdf', entityType = 'policy', extraQuery = '') {
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  const response = await fetch(`${base}/files/upload?entityType=${entityType}${extraQuery}`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const createPolicy = (user, body) => request(user, 'POST', '/policies', body)
const publish = (user, id, body) => request(user, 'POST', `/policies/${id}/versions`, body)
const mine = async user => expectStatus(await request(user, 'GET', '/policies/mine'), 200).policies
const pending = async user => expectStatus(await request(user, 'GET', '/policies/pending'), 200)
const acknowledge = (user, versionId, contentHash) => request(user, 'POST', `/policies/versions/${versionId}/acknowledge`, { contentHash })
// سياسة منشورة بنسخة نصية — الاختصار اللي أغلب الاختبارات بتبدأ منه
async function published(extra = {}, version = {}) {
  const policy = expectStatus(await createPolicy(users.admin, { title: `سياسة ${crypto.randomBytes(3).toString('hex')}`, isMandatory: true, graceDays: 0, ...extra }), 201)
  const body = version.bodyText ?? `نص السياسة ${policy.id}`
  const made = expectStatus(await publish(users.admin, policy.id, { bodyText: body, effectiveDate: day(0), ...version }), 201)
  return { id: policy.id, versionId: made.id, contentHash: made.contentHash, body }
}
// كل اختبار بيبدأ نضيف: من غير سياسات ولا إقرارات (مسح في قاعدة الاختبار)، والبوابة ناسية اللي فات
async function fresh() {
  for (const table of ['policy_acknowledgements', 'policy_versions', 'policies']) await query(`DELETE FROM [${table}]`)
  await gate.changed()
}
// اتصال تاني بيمسك قفل لحد ما `count` طلب يقفوا عليه وبعدها يسيبه: التزامن مضمون مش بالصدفة
async function releaseTogether(lockSql, params, count, start) {
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
    await holder.commitTransaction()
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
  gate = app.get(require('../src/policies/policy-gate').PolicyGate)
  // العلامة في الاختبار بتتحكم فيها الاختبارات نفسها: التحديث الدوري مابيشتغلش تحت NODE_ENV=test (PL-10)

  org.branchA = await repo('Branch').save({ code: 'PL_A', name: 'فرع السياسات أ' })
  org.branchB = await repo('Branch').save({ code: 'PL_B', name: 'فرع السياسات ب' })
  emps.head = await employee()
  org.department = await repo('Department').save({ name: 'قسم السياسات', branchId: org.branchA.id, managerEmployeeId: emps.head.id })
  emps.staff = await employee({ departmentId: org.department.id })
  emps.other = await employee()
  emps.remote = await employee({ branchId: org.branchB.id })
  emps.newHire = await employee({ joinDate: day(0) })
  emps.noAccount = await employee()
  emps.left = await employee({ isActive: false, status: 'terminated' })
  emps.hr = await employee()
  users.admin = await account('admin', 'super_admin', [], { branchId: null, scopeAllBranches: true })
  users.hrAll = await account('hr-all', 'employee', ['policies.manage', 'policies.report'], { employeeId: emps.hr.id, scopeAllBranches: true })
  users.hrBranch = await account('hr-branch', 'employee', ['policies.manage', 'policies.report'])
  users.reporterA = await account('reporter-a', 'employee', ['policies.report'])
  users.reporterB = await account('reporter-b', 'employee', ['policies.report'], { branchId: org.branchB.id })
  users.reporterAll = await account('reporter-all', 'employee', ['policies.report'], { scopeAllBranches: true })
  users.head = await account('head', 'employee', [], { employeeId: emps.head.id })
  users.staff = await account('staff', 'employee', [], { employeeId: emps.staff.id })
  users.other = await account('other', 'employee', [], { employeeId: emps.other.id })
  users.remote = await account('remote', 'employee', [], { employeeId: emps.remote.id, branchId: org.branchB.id })
  users.newHire = await account('new-hire', 'employee', [], { employeeId: emps.newHire.id })
  users.unlinked = await account('unlinked', 'employee', ['employees.view'])
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-policies-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'policies fixture cleanup failed')
})

test('PL-01: إنشاء السياسة وتعديل بياناتها — لصاحب الصلاحية ونطاقه كل الفروع؛ وحدود العنوان والفئة والمهلة والجمهور؛ والقايمة', async () => {
  await fresh()
  const good = { title: 'لائحة العمل الداخلية', category: 'لوائح', isMandatory: true, graceDays: 7 }
  // من غير صلاحية: مرفوض من الحارس. بصلاحية ونطاق فرع: مرفوض برسالته (السياسة على الشركة كلها)
  expectStatus(await createPolicy(users.staff, good), 403)
  expectStatus(await createPolicy(users.reporterA, good), 403)
  const branchOnly = await createPolicy(users.hrBranch, good)
  assert.deepEqual([branchOnly.status, messageOf(branchOnly)], [403, 'إدارة السياسات لحساب نطاقه كل الفروع — السياسة بتسري على الشركة كلها'])
  // الحدود
  for (const [body, message] of [
    [{ ...good, title: 'س' }, null],
    [{ ...good, graceDays: 366 }, null],
    [{ ...good, graceDays: -1 }, null],
    [{ ...good, audience: { mode: 'nonsense' } }, 'اختيار «مين» في جمهور السياسة غير معروف'],
    [{ ...good, audience: { mode: 'all', where: { mode: 'planet', ids: [1] } } }, 'اختيار «فين» في جمهور السياسة غير معروف'],
    [{ ...good, audience: { mode: 'roles', ids: [] } }, 'اختار مين السياسة عليهم، أو خلّيها «الكل»'],
    // «فين» من غير اختيار مابيتقريش «كل الشركة»، وجمهور أطول من العمود مرفوض برسالة (مش خطأ خادم)
    [{ ...good, audience: { mode: 'all', where: { mode: 'branches', ids: [] } } }, 'اختار الفروع أو الأقسام أو الفرق، أو خلّيها «كل الشركة»'],
    [{ ...good, audience: { mode: 'roles', ids: ['hr'], where: { mode: 'teams', ids: ['x', 0] } } }, 'اختار الفروع أو الأقسام أو الفرق، أو خلّيها «كل الشركة»'],
    [{ ...good, audience: { mode: 'employees', ids: Array.from({ length: 500 }, (_, index) => 100000 + index) } }, 'جمهور السياسة أطول من المسموح — اختار بالدور أو المنصب أو الفرع بدل أسماء كتير'],
  ]) {
    const response = await createPolicy(users.hrAll, body)
    assert.equal(response.status, 400, JSON.stringify(body))
    if (message) assert.equal(messageOf(response), message)
  }
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [policies]'))[0].n), 0, 'المرفوض ماكتبش حاجة')

  const created = expectStatus(await createPolicy(users.hrAll, { ...good, title: '  لائحة العمل الداخلية  ', audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchA.id] } } }), 201)
  const stored = await repo('Policy').findOneByOrFail({ id: created.id })
  assert.deepEqual([stored.title, stored.category, stored.isMandatory, stored.graceDays, stored.status, stored.createdByUserId, JSON.parse(stored.audience)],
    ['لائحة العمل الداخلية', 'لوائح', true, 7, 'DRAFT', users.hrAll.id, { mode: 'all', ids: [], where: { mode: 'branches', ids: [org.branchA.id] } }])
  // الاختيارات بتتخزن مرتّبة ومن غير تكرار: نفس الجمهور بترتيب تاني هو نفس الجمهور
  const ordered = expectStatus(await createPolicy(users.hrAll, { title: 'جمهور مرتّب', audience: { mode: 'roles', ids: ['hr', 'employee', 'hr'],
    where: { mode: 'branches', ids: [org.branchB.id, org.branchA.id, org.branchB.id] } } }), 201)
  assert.ok(org.branchA.id < org.branchB.id)
  assert.deepEqual(JSON.parse((await repo('Policy').findOneByOrFail({ id: ordered.id })).audience),
    { mode: 'roles', ids: ['employee', 'hr'], where: { mode: 'branches', ids: [org.branchA.id, org.branchB.id] } })
  await query('DELETE FROM [policies] WHERE [id] = @0', [ordered.id])
  // «الكل» في «كل الشركة» = من غير جمهور
  const everyone = expectStatus(await createPolicy(users.admin, { title: 'سياسة للكل', audience: { mode: 'all', where: { mode: 'company' } } }), 201)
  assert.deepEqual((({ audience, isMandatory, graceDays }) => [audience, isMandatory, graceDays])(await repo('Policy').findOneByOrFail({ id: everyone.id })), [null, false, 0])

  // تعديل البيانات: نفس الحكم ونفس الحدود، والمحتوى مش من هنا
  expectStatus(await request(users.hrBranch, 'PATCH', `/policies/${created.id}`, { graceDays: 3 }), 403)
  // صلاحية التقرير لوحدها (حتى بنطاق كل الفروع) مابتنشئش ولا بتعدّل
  expectStatus(await createPolicy(users.reporterAll, good), 403)
  expectStatus(await request(users.reporterAll, 'PATCH', `/policies/${created.id}`, { graceDays: 3 }), 403)
  expectStatus(await request(users.hrAll, 'PATCH', `/policies/${created.id}`, { graceDays: 400 }), 400)
  expectStatus(await request(users.hrAll, 'PATCH', '/policies/999999', { graceDays: 3 }), 404)
  expectStatus(await request(users.hrAll, 'PATCH', `/policies/${created.id}`, { graceDays: 3, category: null, audience: null, isMandatory: false, title: 'لائحة العمل' }), 200)
  assert.deepEqual((({ title, category, audience, isMandatory, graceDays }) => [title, category, audience, isMandatory, graceDays])(await repo('Policy').findOneByOrFail({ id: created.id })),
    ['لائحة العمل', null, null, false, 3])

  // القايمة: لصاحب الإدارة أو التقرير. الجمهور نفسه لمدير السياسات اللي نطاقه كل الفروع بس
  expectStatus(await request(users.staff, 'GET', '/policies'), 403)
  expectStatus(await request(users.hrAll, 'PATCH', `/policies/${created.id}`, { audience: { mode: 'employees', ids: [emps.remote.id] } }), 200)
  const forManager = expectStatus(await request(users.hrAll, 'GET', '/policies'), 200)
  assert.deepEqual([forManager.available, forManager.canManage, forManager.policies.map(row => [row.id, row.status, row.versions, row.current])],
    [true, true, [[everyone.id, 'DRAFT', 0, null], [created.id, 'DRAFT', 0, null]]])
  assert.deepEqual(forManager.policies.find(row => row.id === created.id).audience, { mode: 'employees', ids: [String(emps.remote.id)], where: null })
  // حساب الفروع (إدارة أو تقرير): السياسات اللي ليها حد في نطاقه بس، ومن غير الجمهور. سياسة موظف فرع ب مابتظهرش لحساب فرع أ
  for (const [reader, ids] of [[users.hrBranch, [everyone.id]], [users.reporterA, [everyone.id]], [users.reporterB, [everyone.id, created.id]]]) {
    const list = expectStatus(await request(reader, 'GET', '/policies'), 200)
    assert.deepEqual([list.canManage, list.policies.map(row => row.id), list.policies.map(row => row.audience)], [false, ids, ids.map(() => null)], reader.email)
  }
  // ونفس السياسة لحساب فرع أ زي اللي مش موجودة: التفاصيل والتقرير
  const missingPolicy = await request(users.reporterA, 'GET', '/policies/999999')
  for (const route of [`/policies/${created.id}`, `/policies/${created.id}/report`]) {
    const response = await request(users.reporterA, 'GET', route)
    assert.deepEqual([response.status, response.body.message], [404, missingPolicy.body.message], route)
  }
  assert.equal(missingPolicy.status, 404)
  assert.equal(expectStatus(await request(users.reporterB, 'GET', `/policies/${created.id}`), 200).id, created.id)
  // والمسودة مابتظهرش للموظفين
  assert.deepEqual([await mine(users.remote), (await pending(users.remote)).policies], [[], []])
})

test('PL-02: نشر نسخة — نص أو ملف PDF، وبصمة المحتوى، وتاريخ السريان، وأول نسخة جوهرية، والترقيم؛ ورفع ملف السياسة', async () => {
  await fresh()
  const policy = expectStatus(await createPolicy(users.admin, { title: 'سياسة سرية المعلومات', isMandatory: true, graceDays: 2 }), 201)
  const text = 'البند الأول: المعلومات سرية.\nالبند التاني: ممنوع نشرها.'
  // مين ينشر، وحدود المحتوى والتاريخ
  expectStatus(await publish(users.staff, policy.id, { bodyText: text, effectiveDate: day(0) }), 403)
  expectStatus(await publish(users.hrBranch, policy.id, { bodyText: text, effectiveDate: day(0) }), 403)
  expectStatus(await publish(users.reporterAll, policy.id, { bodyText: text, effectiveDate: day(0) }), 403)
  expectStatus(await publish(users.admin, 999999, { bodyText: text, effectiveDate: day(0) }), 404)
  for (const [body, message] of [
    [{ effectiveDate: day(0) }, 'محتوى النسخة: نص، أو ملف PDF — واحد منهم بس'],
    [{ bodyText: '   ', effectiveDate: day(0) }, 'محتوى النسخة: نص، أو ملف PDF — واحد منهم بس'],
    [{ bodyText: text, fileId: 1, effectiveDate: day(0) }, 'محتوى النسخة: نص، أو ملف PDF — واحد منهم بس'],
    [{ bodyText: text, effectiveDate: day(-1) }, 'تاريخ السريان من النهارده أو بعده'],
    [{ bodyText: text, effectiveDate: '2026-02-30' }, 'تاريخ السريان بصيغة YYYY-MM-DD'],
    // نص أطول من الحد: يترفع ملف PDF (الحد بعد توحيد نهايات السطور في الخدمة، وسقف النص الخام في فحص الطلب بنفس الرسالة)
    [{ bodyText: 'س'.repeat(30001), effectiveDate: day(0) }, 'نص السياسة بحد أقصى 30000 حرف — الأطول يترفع ملف PDF'],
    [{ bodyText: 'a'.repeat(60001), effectiveDate: day(0) }, 'نص السياسة بحد أقصى 30000 حرف — الأطول يترفع ملف PDF'],
  ]) {
    const response = await publish(users.admin, policy.id, body)
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 120))
    if (message) assert.equal(messageOf(response), message)
  }
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [policy_versions]'))[0].n), 0, 'المرفوض ماكتبش حاجة')
  // والنص لحد الحد بيتقبل حتى لو كله عربي (جوه حجم الطلب المسموح)
  const long = expectStatus(await createPolicy(users.admin, { title: 'سياسة طويلة' }), 201)
  assert.equal(expectStatus(await publish(users.admin, long.id, { bodyText: 'س'.repeat(30000), effectiveDate: day(0) }), 201).contentHash, sha('س'.repeat(30000)))
  // نهايات سطور ويندوز بتتوحّد قبل العدّ: نص خامه أطول من الحد وبعد التوحيد جوّاه بيتقبل
  const windows = 'س\r\n'.repeat(12000)
  assert.ok(windows.length > 30000)
  assert.equal(expectStatus(await publish(users.admin, long.id, { bodyText: windows, effectiveDate: day(0) }), 201).contentHash, sha('س\n'.repeat(12000).trim()))
  expectStatus(await request(users.admin, 'POST', `/policies/${long.id}/withdraw`), 201)

  // أول نسخة: نصية، جوهرية حتى لو اتبعتت غير كده، وبصمتها sha256 للنص، والسياسة بقت منشورة
  const first = expectStatus(await publish(users.hrAll, policy.id, { bodyText: `  ${text.replace(/\n/g, '\r\n')}  `, effectiveDate: day(0), isMaterial: false }), 201)
  const v1 = await repo('PolicyVersion').findOneByOrFail({ id: first.id })
  assert.deepEqual([first.versionNo, first.contentHash, v1.bodyText, v1.fileId, v1.effectiveDate, v1.isMaterial, v1.publishedByUserId, (await repo('Policy').findOneByOrFail({ id: policy.id })).status],
    [1, sha(text), text, null, day(0), true, users.hrAll.id, 'PUBLISHED'])
  // بعد النشر العنوان والفئة مابيتغيّروش (الموظفين بيقرّوا بالسياسة بيهم)، وباقي البيانات بتتعدل والعنوان والفئة نفسهم مقبولين
  const renamed = await request(users.admin, 'PATCH', `/policies/${policy.id}`, { title: 'عنوان تاني' })
  assert.deepEqual([renamed.status, messageOf(renamed)], [400, 'عنوان السياسة مابيتغيّرش بعد النشر — اسحبها واعمل سياسة جديدة بالعنوان الصح'])
  const recategorized = await request(users.admin, 'PATCH', `/policies/${policy.id}`, { category: 'أمن المعلومات' })
  assert.deepEqual([recategorized.status, messageOf(recategorized)], [400, 'فئة السياسة مابتتغيّرش بعد النشر — اسحبها واعمل سياسة جديدة بالفئة الصح'])
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { title: 'سياسة سرية المعلومات', category: null, graceDays: 4 }), 200)
  assert.deepEqual((({ title, category, graceDays }) => [title, category, graceDays])(await repo('Policy').findOneByOrFail({ id: policy.id })), ['سياسة سرية المعلومات', null, 4])

  // رفع ملف السياسة: لمدير السياسات بس، وPDF بس، ومش تبع موظف
  assert.equal((await upload(users.staff)).status, 403)
  assert.equal((await upload(users.reporterA)).status, 403)
  assert.equal((await upload(users.admin, png(), 'policy.png', 'image/png')).status, 403)
  assert.equal((await upload(users.admin, pdf(), 'policy.pdf', 'application/pdf', 'policy', `&employeeId=${emps.staff.id}`)).status, 403)
  const bytes = pdf('v2')
  const file = expectStatus(await upload(users.hrAll, bytes), 201)
  assert.deepEqual((({ entityType, mime, employeeId, uploadedBy }) => [entityType, mime, employeeId ?? null, uploadedBy])(await repo('StoredFile').findOneByOrFail({ id: file.id })),
    ['policy', 'application/pdf', null, users.hrAll.id])
  // ملف مش ملف سياسة (مرفق عادي) أو مش موجود: مرفوض
  const loose = expectStatus(await upload(users.admin, pdf('loose'), 'doc.pdf', 'application/pdf', 'document'), 201)
  for (const fileId of [loose.id, 999999]) {
    const response = await publish(users.admin, policy.id, { fileId, effectiveDate: day(1) })
    assert.deepEqual([response.status, messageOf(response)], [400, 'ملف السياسة لازم يكون PDF مرفوع من شاشة السياسات'])
  }
  // النسخة التانية: ملف، غير جوهرية، بتاريخ جاي، وبصمتها sha256 لبايتات الملف
  const second = expectStatus(await publish(users.admin, policy.id, { fileId: file.id, effectiveDate: day(3) }), 201)
  const v2 = await repo('PolicyVersion').findOneByOrFail({ id: second.id })
  assert.deepEqual([second.versionNo, second.contentHash, v2.bodyText, v2.fileId, v2.effectiveDate, v2.isMaterial], [2, sha(bytes), null, file.id, day(3), false])
  // تاريخ قبل سريان النسخة اللي قبلها مرفوض، وجوهرية بالطلب
  const earlier = await publish(users.admin, policy.id, { bodyText: 'نسخة تالتة', effectiveDate: day(2) })
  assert.deepEqual([earlier.status, messageOf(earlier)], [400, 'تاريخ السريان قبل سريان النسخة اللي قبلها'])
  const third = expectStatus(await publish(users.admin, policy.id, { bodyText: 'نسخة تالتة', effectiveDate: day(3), isMaterial: true }), 201)
  assert.deepEqual([third.versionNo, (await repo('PolicyVersion').findOneByOrFail({ id: third.id })).isMaterial], [3, true])
  // النسخة الأولى زي ما اتنشرت
  assert.deepEqual((({ bodyText, contentHash }) => [bodyText, contentHash])(await repo('PolicyVersion').findOneByOrFail({ id: first.id })), [text, sha(text)])
  // القايمة: السارية هي الأولى، والجاية أول نسخة لسه ماسرتش (التانية، مش آخر واحدة منشورة)
  const listed = expectStatus(await request(users.admin, 'GET', '/policies'), 200).policies.find(row => row.id === policy.id)
  assert.deepEqual([listed.status, listed.versions, listed.current.versionNo, listed.current.kind, listed.upcoming.versionNo, listed.upcoming.kind], ['PUBLISHED', 3, 1, 'TEXT', 2, 'FILE'])
  const detail = expectStatus(await request(users.reporterA, 'GET', `/policies/${policy.id}`), 200)
  assert.deepEqual([detail.audience, detail.versions.map(version => [version.versionNo, version.kind, version.isMaterial])], [null, [[3, 'TEXT', true], [2, 'FILE', false], [1, 'TEXT', true]]])
  // السياسة المسحوبة: لا نشر ولا تعديل، والسحب مرة واحدة
  expectStatus(await request(users.hrBranch, 'POST', `/policies/${policy.id}/withdraw`), 403)
  expectStatus(await request(users.reporterAll, 'POST', `/policies/${policy.id}/withdraw`), 403)
  expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`), 201)
  const withdrawn = await repo('Policy').findOneByOrFail({ id: policy.id })
  assert.deepEqual([withdrawn.status, !!withdrawn.withdrawnAt, withdrawn.withdrawnByUserId], ['WITHDRAWN', true, users.admin.id])
  for (const response of [await publish(users.admin, policy.id, { bodyText: 'بعد السحب', effectiveDate: day(3) }), await request(users.admin, 'PATCH', `/policies/${policy.id}`, { graceDays: 1 }),
    await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`)]) assert.equal(response.status, 400)
})

test('PL-03: «سياساتي» و«اللي مستنيني» — الجمهور «مين + فين»، وحساب من غير موظف، والنسخة اللي لسه ماسرتش، وغير الإلزامية', async () => {
  await fresh()
  const everyone = await published({ title: 'للكل', graceDays: 5 })
  const branchB = await published({ title: 'فرع ب بس', audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchB.id] } } })
  const managers = await published({ title: 'مديرين الأقسام', audience: { mode: 'positions', ids: ['DEPARTMENT_MANAGERS'] } })
  const named = await published({ title: 'موظف بعينه', audience: { mode: 'employees', ids: [emps.other.id] } })
  const department = await published({ title: 'قسم بعينه', audience: { mode: 'all', where: { mode: 'departments', ids: [org.department.id] } } })
  const optional = await published({ title: 'اختيارية', isMandatory: false })
  const future = expectStatus(await createPolicy(users.admin, { title: 'لسه ماسرتش', isMandatory: true }), 201)
  expectStatus(await publish(users.admin, future.id, { bodyText: 'هتسري بكرة', effectiveDate: day(1) }), 201)
  expectStatus(await createPolicy(users.admin, { title: 'مسودة', isMandatory: true }), 201)
  const titles = async user => (await mine(user)).map(row => row.title).sort()
  assert.deepEqual(await titles(users.staff), ['اختيارية', 'قسم بعينه', 'للكل'])
  assert.deepEqual(await titles(users.head), ['اختيارية', 'للكل', 'مديرين الأقسام'])
  assert.deepEqual(await titles(users.other), ['اختيارية', 'للكل', 'موظف بعينه'])
  assert.deepEqual(await titles(users.remote), ['اختيارية', 'فرع ب بس', 'للكل'])
  // حساب من غير موظف: مفيش سياسات عليه
  assert.deepEqual([await mine(users.unlinked), await pending(users.unlinked)], [[], { blocked: false, policies: [] }])
  // الصف: النسخة السارية ونوعها وحالته وموعد القفل (سريان النسخة + المهلة). من غير بصمة النسخة: البصمة بتيجي من قراءة النسخة نفسها،
  // فالإقرار مايتمش من القايمة لوحدها
  const row = (await mine(users.staff)).find(item => item.policyId === everyone.id)
  assert.deepEqual([row.isMandatory, row.version.id, row.version.versionNo, row.version.kind, 'contentHash' in row.version, row.state, row.lockDate, row.acknowledgedAt],
    [true, everyone.versionId, 1, 'TEXT', false, 'PENDING', day(5), null])
  assert.equal((await pending(users.staff)).policies.some(item => 'contentHash' in item.version), false)
  assert.equal(expectStatus(await request(users.staff, 'GET', `/policies/versions/${everyone.versionId}`), 200).contentHash, everyone.contentHash)
  // «اللي مستنيني»: الإلزامي بس. مهلة صفر = مقفول من يوم السريان
  const waiting = await pending(users.staff)
  assert.deepEqual([waiting.blocked, waiting.policies.map(item => [item.title, item.state]).sort()], [true, [['قسم بعينه', 'OVERDUE'], ['للكل', 'PENDING']]])
  // غير الإلزامية (مهلتها صفر برضه): «لسه» من غير موعد قفل، ومابتدخلش في «اللي مستنيني»
  assert.deepEqual((({ state, lockDate, isMandatory }) => [state, lockDate, isMandatory])((await mine(users.staff)).find(item => item.policyId === optional.id)), ['PENDING', null, false])
  assert.equal(branchB.id > 0 && managers.id > 0 && named.id > 0 && department.id > 0, true)
})

test('PL-04: الإقرار — الموظف لنفسه، وبالنسخة السارية وببصمتها، ومرة واحدة، والدليل', async () => {
  await fresh()
  const policy = await published({ title: 'سياسة الإقرار' })
  const onlyB = await published({ title: 'لفرع ب', audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchB.id] } } })
  // حساب من غير موظف، ونسخة مش موجودة، ونسخة سياسة برّه جمهوره: مرفوض (والأخيرين بنفس الرد)
  const unlinked = await acknowledge(users.unlinked, policy.versionId, policy.contentHash)
  assert.deepEqual([unlinked.status, messageOf(unlinked)], [403, 'الإقرار للموظف نفسه — حسابك مش مربوط بموظف'])
  const missing = await acknowledge(users.staff, 999999, policy.contentHash), foreign = await acknowledge(users.staff, onlyB.versionId, onlyB.contentHash)
  assert.deepEqual([missing.status, foreign.status, foreign.body.message], [404, 404, missing.body.message])
  // بصمة غير بصمة النسخة: مرفوض
  expectStatus(await acknowledge(users.staff, policy.versionId, 'not-a-hash'), 400)
  const wrong = await acknowledge(users.staff, policy.versionId, sha('حاجة تانية'))
  assert.deepEqual([wrong.status, messageOf(wrong)], [409, 'نسخة السياسة اتغيّرت — افتحها تاني واقراها قبل الإقرار'])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements]'))[0].n), 0)
  // الإقرار الصح: الدليل كامل
  const done = await request(users.staff, 'POST', `/policies/versions/${policy.versionId}/acknowledge`, { contentHash: policy.contentHash }, { 'User-Agent': 'policies-test-agent/1.0' })
  expectStatus(done, 201)
  const [stored] = await query('SELECT * FROM [policy_acknowledgements]')
  assert.deepEqual([stored.id, stored.policyId, stored.versionId, stored.employeeId, stored.userId, stored.contentHash, stored.userAgent, !!stored.ip, !!stored.acknowledgedAt],
    [done.body.id, policy.id, policy.versionId, emps.staff.id, users.staff.id, policy.contentHash, 'policies-test-agent/1.0', true, true])
  assert.equal(done.body.already, false)
  // تاني مرة: نفس السطر
  const again = expectStatus(await acknowledge(users.staff, policy.versionId, policy.contentHash), 201)
  assert.deepEqual([again.id, again.already, Number((await query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements]'))[0].n)], [stored.id, true, 1])
  const row = (await mine(users.staff)).find(item => item.policyId === policy.id)
  assert.deepEqual([row.state, row.lockDate, row.acknowledgedVersionNo, !!row.acknowledgedAt], ['ACKNOWLEDGED', null, 1, true])
  assert.deepEqual((await pending(users.staff)).policies.map(item => item.policyId), [])
  // إقرارين من نفس الموظف في نفس اللحظة: سطر واحد والاتنين ناجحين
  const before = Number((await query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements] WHERE [employeeId] = @0', [emps.other.id]))[0].n)
  const both = await releaseTogether('SELECT TOP (1) [id] FROM [policy_acknowledgements] WITH (TABLOCKX, HOLDLOCK)', [], 2,
    () => Promise.all([acknowledge(users.other, policy.versionId, policy.contentHash), acknowledge(users.other, policy.versionId, policy.contentHash)]))
  assert.deepEqual([both.map(response => response.status), new Set(both.map(response => response.body.id)).size, both.map(response => response.body.already).sort()], [[201, 201], 1, [false, true]])
  assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements] WHERE [employeeId] = @0', [emps.other.id]))[0].n), before + 1)
})

test('PL-05: البوابة — جوه المهلة كل حاجة شغالة؛ بعدها كل نداء مرفوض بالكود إلا القايمة المسموحة؛ والإقرار بيفتح فورًا', async () => {
  await fresh()
  const blockedBody = { statusCode: 403, code: 'POLICY_ACK_REQUIRED', message: 'عليك سياسة إلزامية لازم تقرّ بيها الأول قبل ما تكمّل في النظام' }
  const ordinary = [['GET', '/requests/mine'], ['GET', '/tasks/mine/count'], ['GET', '/requests/inbox'], ['GET', '/custody/mine'], ['POST', '/requests', { typeCode: 'NOPE', payload: {} }]]
  // جوه المهلة: النداءات العادية شغالة، و«اللي مستنيني» بيقول مش مقفول
  const policy = await published({ title: 'سياسة بمهلة', graceDays: 3 })
  assert.deepEqual((({ blocked, policies }) => [blocked, policies.map(item => [item.policyId, item.state, item.lockDate])])(await pending(users.staff)), [false, [[policy.id, 'PENDING', day(3)]]])
  for (const [method, route] of ordinary.slice(0, 4)) expectStatus(await request(users.staff, method, route), 200)
  // المهلة خلصت (سريان النسخة من 3 أيام): كل نداء عادي مرفوض بالكود
  await query('UPDATE [policy_versions] SET [effectiveDate] = @1 WHERE [id] = @0', [policy.versionId, day(-3)])
  await gate.changed()
  assert.equal((await pending(users.staff)).blocked, true)
  for (const [method, route, body] of ordinary) assert.deepEqual((({ status, body: reply }) => [status, reply])(await request(users.staff, method, route, body)), [403, blockedBody], `${method} ${route}`)
  // القايمة المسموحة، مسار مسار
  expectStatus(await request(users.staff, 'GET', '/auth/me'), 200)
  expectStatus(await request(users.staff, 'GET', '/modules/enabled'), 200)
  expectStatus(await request(users.staff, 'GET', '/policies/mine'), 200)
  expectStatus(await request(users.staff, 'GET', '/policies/pending'), 200)
  assert.equal(expectStatus(await request(users.staff, 'GET', `/policies/versions/${policy.versionId}`), 200).bodyText, policy.body)
  // (ملف النسخة النصية مش موجود: 404 من المسار نفسه، مش 403 من البوابة)
  expectStatus(await request(users.staff, 'GET', `/policies/versions/${policy.versionId}/file`), 404)
  // مسارات السياسات الإدارية مش في القايمة: حتى مدير السياسات لو عليه إقرار متأخر مقفول عنها
  assert.deepEqual((({ status, body }) => [status, body.code])(await request(users.hrAll, 'GET', '/policies')), [403, 'POLICY_ACK_REQUIRED'])
  assert.deepEqual((({ status, body }) => [status, body.code])(await request(users.hrAll, 'GET', `/policies/${policy.id}/report`)), [403, 'POLICY_ACK_REQUIRED'])
  assert.deepEqual((({ status, body }) => [status, body.code])(await request(users.hrAll, 'PATCH', `/policies/${policy.id}`, { graceDays: 9 })), [403, 'POLICY_ACK_REQUIRED'])
  // ماعدا السحب: مدير السياسات يقدر يسحب سياسة اتنشرت غلط وهو نفسه مقفول عليها (من غير ما يقرّ بيها)؛ وغير المدير لأ
  const mistake = await published({ title: 'اتنشرت غلط', graceDays: 0 })
  assert.equal((await request(users.staff, 'POST', `/policies/${mistake.id}/withdraw`)).status, 403)
  expectStatus(await request(users.hrAll, 'POST', `/policies/${mistake.id}/withdraw`), 201)
  assert.equal((await repo('Policy').findOneByOrFail({ id: mistake.id })).status, 'WITHDRAWN')
  assert.deepEqual((({ status, body }) => [status, body.code])(await request(users.hrAll, 'GET', '/policies')), [403, 'POLICY_ACK_REQUIRED'])
  // كلمة سر مؤقتة وسياسة عدّت مهلتها مع بعض: كلمة السر الأول (حارس الدخول قافل الحساب على تغييرها)، وبعدها بوابة الإقرار
  const bcrypt = require('../node_modules/bcryptjs')
  const temporary = await employee()
  const temporaryUser = await repo('User').save({ email: 'temporary@policies.invalid', displayName: 'حساب مؤقت', passwordHash: await bcrypt.hash('Temp-Start-73x!', 4), role: 'employee',
    branchId: org.branchA.id, permissions: '[]', isActive: true, employeeId: temporary.id, mustChangePassword: true })
  const call = async (bearer, method, route, body) => {
    const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const reply = await response.text()
    return { status: response.status, body: reply ? JSON.parse(reply) : null }
  }
  const pendingPassword = jwt.sign({ ...payloadOf(temporaryUser), mustChangePassword: true })
  assert.deepEqual(await Promise.all([['GET', '/requests/mine'], ['GET', '/policies/pending'], ['POST', `/policies/versions/${policy.versionId}/acknowledge`, { contentHash: policy.contentHash }]]
    .map(async ([method, route, body]) => (({ status, body: reply }) => [status, reply.code])(await call(pendingPassword, method, route, body)))),
  [[403, 'PASSWORD_CHANGE_REQUIRED'], [403, 'PASSWORD_CHANGE_REQUIRED'], [403, 'PASSWORD_CHANGE_REQUIRED']])
  assert.equal((await call(pendingPassword, 'GET', '/auth/me')).status, 200)
  const changed = await call(pendingPassword, 'POST', '/auth/change-password', { currentPassword: 'Temp-Start-73x!', newPassword: 'Vulture-Maple-Quartz-42!' })
  assert.ok([200, 201].includes(changed.status) && typeof changed.body.accessToken === 'string', JSON.stringify(changed.body).slice(0, 200))
  // وبعد التغيير: بوابة الإقرار هي اللي واقفة، والإقرار بيفتح
  assert.deepEqual((({ status, body }) => [status, body.code])(await call(changed.body.accessToken, 'GET', '/requests/mine')), [403, 'POLICY_ACK_REQUIRED'])
  assert.equal((await call(changed.body.accessToken, 'POST', `/policies/versions/${policy.versionId}/acknowledge`, { contentHash: policy.contentHash })).status, 201)
  assert.equal((await call(changed.body.accessToken, 'GET', '/requests/mine')).status, 200)
  await repo('User').update({ id: temporaryUser.id }, { isActive: false })
  await repo('Employee').update({ id: temporary.id }, { isActive: false })
  // الإقرار بيفتح فورًا (من غير انتظار أي مدة)
  expectStatus(await acknowledge(users.staff, policy.versionId, policy.contentHash), 201)
  for (const [method, route] of ordinary.slice(0, 4)) expectStatus(await request(users.staff, method, route), 200)
  assert.deepEqual(await pending(users.staff), { blocked: false, policies: [] })
  // وزميله لسه مقفول
  assert.equal((await request(users.other, 'GET', '/requests/mine')).status, 403)
})

test('PL-06: مين مابيتقفلش — حساب من غير موظف، وبرّه الجمهور، وغير الإلزامية، والمسحوبة؛ والمعيَّن الجديد مهلته من تعيينه', async () => {
  await fresh()
  const open = async user => (await request(user, 'GET', '/requests/mine')).status
  // سياسة لفرع أ بمهلة يومين، سارية من 10 أيام
  const policy = await published({ title: 'لفرع أ', graceDays: 2, audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchA.id] } } })
  await query('UPDATE [policy_versions] SET [effectiveDate] = @1 WHERE [id] = @0', [policy.versionId, day(-10)])
  await gate.changed()
  // موظف فرع أ مقفول؛ موظف فرع ب (برّه الجمهور) وحساب من غير موظف ومدير النظام من غير موظف: شغالين
  assert.deepEqual([await open(users.staff), await open(users.remote), await open(users.unlinked), await open(users.admin)], [403, 200, 200, 200])
  // مدير نظام مربوط بموظف: عليه سياسات موظفه بس (مش كل سياسة عشان هو مدير النظام). موظفه في فرع ب: سياسة فرع أ مش عليه ولا بتعدّه في تقريرها
  const ownerFile = await employee({ branchId: org.branchB.id })
  const owner = await repo('User').save({ email: 'owner@policies.invalid', displayName: 'حساب owner', passwordHash: 'test-only', role: 'super_admin', branchId: null, scopeAllBranches: true,
    permissions: '[]', isActive: true, employeeId: ownerFile.id })
  assert.deepEqual([await open(owner), await mine(owner), (await pending(owner)).policies], [200, [], []])
  assert.equal(expectStatus(await request(users.admin, 'GET', `/policies/${policy.id}/report`), 200).rows.some(row => row.employeeId === ownerFile.id), false)
  // ولما موظفه يبقى في الجمهور (فرع أ) بيتقفل زي غيره
  await repo('Employee').update({ id: ownerFile.id }, { branchId: org.branchA.id })
  await gate.changed()
  assert.deepEqual([await open(owner), (await pending(owner)).blocked], [403, true])
  await repo('User').update({ id: owner.id }, { isActive: false })
  await repo('Employee').update({ id: ownerFile.id }, { isActive: false })
  // المعيَّن النهارده: مهلته من تعيينه (يومين) مش من سريان النسخة
  assert.equal(await open(users.newHire), 200)
  assert.deepEqual((await pending(users.newHire)).policies.map(item => [item.state, item.lockDate]), [['PENDING', day(2)]])
  const lockOf = async user => (await pending(user)).policies.map(item => [item.state, item.lockDate])
  const graceFrom = async () => (await query('SELECT CONVERT(nvarchar(10), [graceFrom], 23) AS [day] FROM [policies] WHERE [id] = @0', [policy.id]))[0].day
  assert.equal(await graceFrom(), null)
  // غير الإلزامية مابتقفلش
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { isMandatory: false }), 200)
  assert.deepEqual([await open(users.staff), await graceFrom()], [200, null])
  // ولما ترجع إلزامية: المهلة من النهارده (مش من سريان نسخة من 10 أيام)، فمحدش بيتقفل بمهلة خلصت قبل ما الإلزام يبدأ
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { isMandatory: true }), 200)
  assert.deepEqual([await open(users.staff), await lockOf(users.staff), await graceFrom()], [200, [['PENDING', day(2)]], day(0)])
  // تعديل من غير إلزام جديد ولا جمهور جديد (تقليل المهلة) مابيحرّكش بداية المهلة؛ واللي مهلته خلصت مقفول من النهارده
  await query('UPDATE [policies] SET [graceFrom] = @1 WHERE [id] = @0', [policy.id, day(-1)])
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { graceDays: 1 }), 200)
  assert.deepEqual([await graceFrom(), await open(users.staff)], [day(-1), 403])
  // نفس الجمهور بترتيب تاني أو بتكرار مش «جمهور اتغيّر»: بداية المهلة زي ما هي، واللي مقفول مقفول
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchA.id, org.branchB.id] } } }), 200)
  await query('UPDATE [policies] SET [graceFrom] = @1 WHERE [id] = @0', [policy.id, day(-1)])
  await gate.changed()
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchB.id, org.branchA.id, org.branchB.id] } } }), 200)
  assert.deepEqual([await graceFrom(), await open(users.staff)], [day(-1), 403])
  // تغيير الجمهور بيفتح للي خرج منه فورًا، واللي دخل مهلته من النهارده
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { audience: { mode: 'employees', ids: [emps.other.id] } }), 200)
  assert.deepEqual([await open(users.staff), await open(users.other), await lockOf(users.other), await graceFrom()], [200, 200, [['PENDING', day(1)]], day(0)])
  expectStatus(await request(users.admin, 'PATCH', `/policies/${policy.id}`, { audience: null, graceDays: 0 }), 200)
  assert.deepEqual([await open(users.staff), await open(users.other)], [403, 403])
  // المسحوبة مابتقفلش حد، ومابتظهرش للموظف، وإقراراتها باقية
  expectStatus(await acknowledge(users.other, policy.versionId, policy.contentHash), 201)
  expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`), 201)
  assert.deepEqual([await open(users.staff), await mine(users.staff), Number((await query('SELECT COUNT(*) AS [n] FROM [policy_acknowledgements] WHERE [policyId] = @0', [policy.id]))[0].n)], [200, [], 1])
})

test('PL-07: نسخة جديدة — غير الجوهرية مابتطلبش إقرار تاني، والجوهرية بتطلبه من الكل؛ والنسخة القديمة مابيتقرّش بيها', async () => {
  await fresh()
  const policy = await published({ title: 'سياسة بنسخ', graceDays: 4 })
  expectStatus(await acknowledge(users.staff, policy.versionId, policy.contentHash), 201)
  // نسخة تانية غير جوهرية (تصحيح صياغة): اللي أقرّ لسه مقرّ، واللي ماأقرّش بيقرّ بالنسخة السارية الجديدة
  const second = expectStatus(await publish(users.admin, policy.id, { bodyText: 'نص مصحح', effectiveDate: day(0) }), 201)
  const state = async user => (({ state: value, lockDate, version, acknowledgedVersionNo }) => [value, lockDate, version.versionNo, acknowledgedVersionNo])((await mine(user)).find(item => item.policyId === policy.id))
  assert.deepEqual([await state(users.staff), await state(users.other)], [['ACKNOWLEDGED', null, 2, 1], ['PENDING', day(4), 2, null]])
  // النسخة الأولى مابقتش السارية: الإقرار بيها نفس رد اللي مش موجودة
  const missing = await acknowledge(users.other, 999999, policy.contentHash), old = await acknowledge(users.other, policy.versionId, policy.contentHash)
  assert.deepEqual([old.status, old.body.message], [404, missing.body.message])
  expectStatus(await acknowledge(users.other, second.id, second.contentHash), 201)
  // نسخة تالتة جوهرية: الكل يقرّ من جديد، والمهلة من سريانها
  const third = expectStatus(await publish(users.admin, policy.id, { bodyText: 'تغيير جوهري', effectiveDate: day(0), isMaterial: true }), 201)
  assert.deepEqual([await state(users.staff), await state(users.other)], [['PENDING', day(4), 3, 1], ['PENDING', day(4), 3, 2]])
  expectStatus(await acknowledge(users.staff, third.id, third.contentHash), 201)
  assert.deepEqual(await state(users.staff), ['ACKNOWLEDGED', null, 3, 3])
  // والإقرارات القديمة باقية زي ما هي
  assert.deepEqual((await query('SELECT [versionId], [employeeId] FROM [policy_acknowledgements] ORDER BY [id]')).map(row => [row.versionId, row.employeeId]),
    [[policy.versionId, emps.staff.id], [second.id, emps.other.id], [third.id, emps.staff.id]])
  // والتقرير بياخد أحدث نسخة أقرّ بيها الموظف (مش أول سطر): staff أقرّ بالأولى والتالتة = مقرّ بالتالتة؛ وother أقرّ بالتانية بس = لسه
  const reported = expectStatus(await request(users.admin, 'GET', `/policies/${policy.id}/report`), 200).rows
  assert.deepEqual([emps.staff.id, emps.other.id].map(id => (({ state, acknowledgedVersionNo }) => [state, acknowledgedVersionNo])(reported.find(row => row.employeeId === id))),
    [['ACKNOWLEDGED', 3], ['PENDING', 2]])
})

test('PL-08: التقرير — مطابق لجدول الإقرارات، ولموظفي نطاق القارئ بس، وبالحالات والعدّ', async () => {
  await fresh()
  const policy = await published({ title: 'سياسة التقرير', graceDays: 6 })
  expectStatus(await acknowledge(users.staff, policy.versionId, policy.contentHash), 201)
  expectStatus(await acknowledge(users.remote, policy.versionId, policy.contentHash), 201)
  // مين يقرا التقرير
  expectStatus(await request(users.staff, 'GET', `/policies/${policy.id}/report`), 403)
  expectStatus(await request(users.reporterA, 'GET', '/policies/999999/report'), 404)
  const rowsOf = report => report.rows.map(row => [row.employeeId, row.state, row.acknowledgedVersionNo, row.hasAccount, row.lockDate]).sort((a, b) => a[0] - b[0])
  // صاحب كل الفروع: كل الموظفين الشغالين (اللي ساب الشغل برّه)، واللي من غير حساب متعلّم
  const all = expectStatus(await request(users.hrAll, 'GET', `/policies/${policy.id}/report`), 200)
  assert.deepEqual(rowsOf(all), [
    [emps.head.id, 'PENDING', null, true, day(6)], [emps.staff.id, 'ACKNOWLEDGED', 1, true, null], [emps.other.id, 'PENDING', null, true, day(6)],
    [emps.remote.id, 'ACKNOWLEDGED', 1, true, null], [emps.newHire.id, 'PENDING', null, true, day(6)], [emps.noAccount.id, 'PENDING', null, false, day(6)],
    [emps.hr.id, 'PENDING', null, true, day(6)]].sort((a, b) => a[0] - b[0]))
  assert.deepEqual([all.summary, all.current.versionNo, all.policy.title], [{ audience: 7, acknowledged: 2, pending: 5, overdue: 0 }, 1, 'سياسة التقرير'])
  // مطابق لجدول الإقرارات
  const stored = (await query('SELECT [employeeId] FROM [policy_acknowledgements] WHERE [policyId] = @0 ORDER BY [employeeId]', [policy.id])).map(row => row.employeeId)
  assert.deepEqual(all.rows.filter(row => row.state === 'ACKNOWLEDGED').map(row => row.employeeId).sort((a, b) => a - b), stored)
  // قارئ فرع أ: موظفين فرع أ بس (موظف فرع ب مابيظهرش ولا بيتعدّ)، وقارئ فرع ب: موظفه بس
  const branchA = expectStatus(await request(users.reporterA, 'GET', `/policies/${policy.id}/report`), 200)
  assert.deepEqual([branchA.rows.some(row => row.employeeId === emps.remote.id), branchA.summary], [false, { audience: 6, acknowledged: 1, pending: 5, overdue: 0 }])
  const branchB = expectStatus(await request(users.reporterB, 'GET', `/policies/${policy.id}/report`), 200)
  assert.deepEqual([rowsOf(branchB), branchB.summary], [[[emps.remote.id, 'ACKNOWLEDGED', 1, true, null]], { audience: 1, acknowledged: 1, pending: 0, overdue: 0 }])
  // المهلة خلصت: اللي ماأقرّوش «متأخر»، والمعيَّن الجديد لسه جوه مهلته
  await query('UPDATE [policy_versions] SET [effectiveDate] = @1 WHERE [id] = @0', [policy.versionId, day(-6)])
  const late = expectStatus(await request(users.reporterA, 'GET', `/policies/${policy.id}/report`), 200)
  assert.deepEqual([late.summary, late.rows.find(row => row.employeeId === emps.newHire.id).state, late.rows.find(row => row.employeeId === emps.other.id).state],
    [{ audience: 6, acknowledged: 1, pending: 1, overdue: 4 }, 'PENDING', 'OVERDUE'])
  // وقارئ التقرير اللي هو نفسه موظف عليه سياسة عدّت مهلتها مقفول زي غيره لحد ما يقرّ (التاريخ اتغيّر في القاعدة مباشرة، فالبوابة بتتحدّث بالإيد)
  await gate.changed()
  assert.equal((await request(users.hrAll, 'GET', `/policies/${policy.id}/report`)).body.code, 'POLICY_ACK_REQUIRED')
  // جمهور بالدور وبالمنصب على قايمة موظفين: زي حساب كل واحد وهو داخل
  const roles = await published({ title: 'للموظفين بدور', audience: { mode: 'roles', ids: ['employee'] } })
  const managers = await published({ title: 'للمديرين', audience: { mode: 'positions', ids: ['DEPARTMENT_MANAGERS'] } })
  const idsOf = async id => expectStatus(await request(users.admin, 'GET', `/policies/${id}/report`), 200).rows.map(row => row.employeeId).sort((a, b) => a - b)
  assert.deepEqual(await idsOf(roles.id), [emps.head.id, emps.staff.id, emps.other.id, emps.remote.id, emps.newHire.id, emps.hr.id].sort((a, b) => a - b))
  assert.deepEqual(await idsOf(managers.id), [emps.head.id])
})

test('PL-09: قراءة النسخة وملفها — للجمهور ولصاحب الصلاحية؛ ولغيرهم نفس رد اللي مش موجودة', async () => {
  await fresh()
  // ملف أكبر من جزء قراءة واحد (64 ك.ب): القراءة والإرسال بالتدفق لازم يطلّعوا نفس البايتات
  const bytes = pdf(`file-policy ${'x'.repeat(200_000)}`)
  const file = expectStatus(await upload(users.admin, bytes), 201)
  const policy = expectStatus(await createPolicy(users.admin, { title: 'سياسة بملف لفرع أ', isMandatory: true, graceDays: 9, audience: { mode: 'all', where: { mode: 'branches', ids: [org.branchA.id] } } }), 201)
  const version = expectStatus(await publish(users.admin, policy.id, { fileId: file.id, effectiveDate: day(0) }), 201)
  const upcoming = expectStatus(await publish(users.admin, policy.id, { bodyText: 'نسخة جاية', effectiveDate: day(2) }), 201)
  const missing = await request(users.staff, 'GET', '/policies/versions/999999')
  // الموظف في الجمهور: النسخة السارية بنوعها وبصمتها، وملفها ببايتاته
  const content = expectStatus(await request(users.staff, 'GET', `/policies/versions/${version.id}`), 200)
  assert.deepEqual([content.kind, content.bodyText, content.contentHash, content.versionNo, content.title], ['FILE', null, sha(bytes), 1, 'سياسة بملف لفرع أ'])
  const download = await fetch(`${base}/policies/versions/${version.id}/file`, { headers: { Authorization: `Bearer ${token(users.staff)}` } })
  const downloaded = Buffer.from(await download.arrayBuffer())
  // والحجم المعلَن في الرد هو حجم الملف المتحقق منه (رد مقطوع مابيتحسبش كامل عند أي مستلم)
  assert.deepEqual([download.status, download.headers.get('content-type'), download.headers.get('content-length'), downloaded.length, sha(downloaded)],
    [200, 'application/pdf', String(bytes.length), bytes.length, sha(bytes)])
  // النسخة اللي لسه ماسرتش، وموظف برّه الجمهور، وحساب من غير موظف: نفس رد اللي مش موجودة
  for (const [user, id] of [[users.staff, upcoming.id], [users.remote, version.id], [users.unlinked, version.id]]) {
    for (const route of [`/policies/versions/${id}`, `/policies/versions/${id}/file`]) {
      const response = await request(user, 'GET', route)
      assert.deepEqual([response.status, response.body.message], [404, missing.body.message], `${user.email} ${route}`)
    }
  }
  // صاحب الإدارة أو التقرير: أي نسخة (حتى اللي لسه ماسرتش) من سياسة ليها حد في نطاقه؛ وصاحب تقرير فرع ب (السياسة لفرع أ): نفس رد اللي مش موجودة
  for (const reader of [users.admin, users.reporterA]) assert.equal(expectStatus(await request(reader, 'GET', `/policies/versions/${upcoming.id}`), 200).bodyText, 'نسخة جاية')
  for (const route of [`/policies/versions/${upcoming.id}`, `/policies/versions/${version.id}`, `/policies/versions/${version.id}/file`]) {
    const response = await request(users.reporterB, 'GET', route)
    assert.deepEqual([response.status, response.body.message], [404, missing.body.message], route)
  }
  // وملف السياسة مابيتقراش من مسار الملفات العام لغير رافعه
  expectStatus(await request(users.staff, 'GET', `/files/${file.id}`), 403)
  // ملف اتبدّل على التخزين (بايتاته مابقتش بصمة النسخة): مابيتعرضش، فمحدش بيقرّ بنسخة شاف غيرها
  const { fileStorage } = require('../src/files/storage')
  const storedName = (await repo('StoredFile').findOneByOrFail({ id: file.id })).storedName
  const local = fileStorage().localPath(storedName)
  assert.ok(local && fs.existsSync(local), 'ملف الاختبار على التخزين المحلي')
  fs.writeFileSync(local, pdf('tampered'))
  const tampered = await request(users.staff, 'GET', `/policies/versions/${version.id}/file`)
  assert.deepEqual([tampered.status, messageOf(tampered)], [409, 'ملف السياسة على التخزين مش مطابق للنسخة المنشورة — بلّغ مسؤول النظام'])
  // والملف الأصلي بيتعرض تاني
  fs.writeFileSync(local, bytes)
  const fileRoute = `${base}/policies/versions/${version.id}/file`, asStaff = { headers: { Authorization: `Bearer ${token(users.staff)}` } }
  const intact = await fetch(fileRoute, asStaff)
  assert.deepEqual([intact.status, sha(Buffer.from(await intact.arrayBuffer()))], [200, sha(bytes)])
  // صف الملف مابقاش PDF سياسة (اتغيّر في القاعدة): مش مطابق للنسخة المنشورة، بنفس الرد
  for (const change of [{ entityType: 'document' }, { mime: 'image/png' }]) {
    await repo('StoredFile').update({ id: file.id }, change)
    const altered = await request(users.staff, 'GET', `/policies/versions/${version.id}/file`)
    assert.deepEqual([altered.status, messageOf(altered)], [409, 'ملف السياسة على التخزين مش مطابق للنسخة المنشورة — بلّغ مسؤول النظام'], JSON.stringify(change))
    await repo('StoredFile').update({ id: file.id }, { entityType: 'policy', mime: 'application/pdf' })
  }
  // ملف اتبدّل بعد التحقق منه (بين قراءة البصمة وقراءة الإرسال) — أصغر من الأصلي أو أكبر منه: الرد بيتقطع قبل ما يكمل، فالملف المتبدّل
  // مابيوصلش كامل لحد، والحدث بيتسجّل في سجل الخادم
  const storage = fileStorage(), { Readable } = require('node:stream')
  const controller = app.get(require('../src/policies/policies.controller').PoliciesController)
  const stored = name => Object.getPrototypeOf(storage).read.call(storage, name)
  const logged = []
  controller.logger.error = message => { logged.push(message) }
  try {
    for (const second of [[pdf('swapped-a '.repeat(9000)), pdf('swapped-b')], [bytes, pdf('one more chunk')]]) {
      let reads = 0
      storage.read = name => (name === storedName && ++reads === 2 ? Readable.from(second) : stored(name))
      const swapped = await fetch(fileRoute, asStaff).then(async response => ({ status: response.status, length: Buffer.from(await response.arrayBuffer()).length })).catch(() => 'aborted')
      assert.deepEqual([swapped, reads], ['aborted', 2])
    }
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual(logged.map(message => String(message).includes(`ملف نسخة السياسة ${version.id} اتبدّل على التخزين`)), [true, true])
    // العميل قفل الاتصال والتحقق لسه شغال: مفيش ملف بيتفتح للإرسال (كان هيفضل مفتوح)، واللي اتفتح للبصمة اتقفل
    const opened = []
    storage.read = name => { const stream = stored(name); opened.push(stream); return stream }
    const gone = new (require('node:http').ServerResponse)({ method: 'GET', httpVersionMajor: 1, httpVersionMinor: 1 })
    gone.destroy()
    await controller.versionFile(payloadOf(users.staff), version.id, gone)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual([opened.length, opened.every(stream => stream.destroyed)], [1, true])
    // والإرسال ماقدرش يبدأ (الرد مابقاش بيتكتب فيه): الملف اللي اتفتح للإرسال بيتقفل، والرد بيتقفل بدل ما الطلب يفضل معلّق
    opened.length = 0
    const unusable = { destroyed: false, setHeader() {}, destroy() { this.destroyed = true } }
    await controller.versionFile(payloadOf(users.staff), version.id, unusable)
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepEqual([opened.length, opened.every(stream => stream.destroyed), unusable.destroyed], [2, true, true])
  } finally { delete storage.read; delete controller.logger.error }
  assert.equal((await fetch(fileRoute, asStaff)).status, 200)
  // والملف الضايع من التخزين برسالته
  fs.unlinkSync(local)
  const lost = await request(users.staff, 'GET', `/policies/versions/${version.id}/file`)
  assert.deepEqual([lost.status, messageOf(lost)], [404, 'ملف السياسة غير موجود'])
})

test('PL-10: من غير سياسة إلزامية مسار الطلب العادي مابينادّيش فحص الإقرار خالص؛ ومعاها الحساب «المش مقفول» بيتفحص مرة في المدة', async () => {
  await fresh()
  let checks = 0
  const original = gate.overdueFor
  gate.overdueFor = async user => { checks++; return original(user) }
  try {
    // من غير سياسات، وبسياسة مش إلزامية، وبمسودة إلزامية: البوابة مش شغالة ومفيش فحص
    await published({ title: 'اختيارية', isMandatory: false })
    expectStatus(await createPolicy(users.admin, { title: 'مسودة إلزامية', isMandatory: true }), 201)
    // وسياسة إلزامية اتسحبت: مابقتش بتشغّل البوابة
    const gone = await published({ title: 'إلزامية مسحوبة', graceDays: 5 })
    assert.equal(gate.active(), true)
    expectStatus(await request(users.admin, 'POST', `/policies/${gone.id}/withdraw`), 201)
    assert.equal(gate.active(), false)
    for (let round = 0; round < 3; round++) expectStatus(await request(users.staff, 'GET', '/requests/mine'), 200)
    assert.equal(checks, 0)
    // سياسة إلزامية منشورة جوه مهلتها: أول نداء بيفحص، واللي بعده في نفس المدة لأ
    const policy = await published({ title: 'إلزامية', graceDays: 5 })
    assert.equal(gate.active(), true)
    for (let round = 0; round < 3; round++) expectStatus(await request(users.staff, 'GET', '/requests/mine'), 200)
    assert.equal(checks, 1)
    // حساب من غير موظف، والمسارات المسموحة: من غير فحص
    expectStatus(await request(users.unlinked, 'GET', '/requests/mine'), 200)
    expectStatus(await request(users.other, 'GET', '/modules/enabled'), 200)
    assert.equal(checks, 1)
    // والمقفول بيتفحص كل نداء (عشان الإقرار يفتح فورًا)
    await query('UPDATE [policy_versions] SET [effectiveDate] = @1 WHERE [id] = @0', [policy.versionId, day(-5)])
    await gate.changed()
    checks = 0
    for (let round = 0; round < 2; round++) assert.equal((await request(users.other, 'GET', '/requests/mine')).status, 403)
    assert.equal(checks, 2)
    // كتابة على السياسات والفحص شغال (نشر في نفس اللحظة): «مش مقفول» اللي اتحسبت قبل الكتابة مابتتسجّلش، فالنداء اللي بعده بيفحص تاني
    const counted = gate.overdueFor
    let interleave = true
    gate.overdueFor = async user => { const overdue = await counted(user); if (interleave) { interleave = false; await gate.changed() } return overdue }
    checks = 0
    for (let round = 0; round < 3; round++) expectStatus(await request(users.newHire, 'GET', '/requests/mine'), 200)
    assert.equal(checks, 2)
    gate.overdueFor = counted
    // الخادم اتشغّل تاني وفيه سياسة إلزامية: العلامة بتتحسب عند الإقلاع، فالمقفول مقفول من أول نداء؛ وبعدها بتتحسب كل شوية من مؤقّت في الخلفية
    // (خادم تاني نشر أو سحب) مابيمسكش العملية شغالة
    gate.reset()
    assert.equal(gate.active(), false)
    await gate.onApplicationBootstrap()
    assert.equal(gate.active(), true)
    assert.equal((await request(users.other, 'GET', '/requests/mine')).status, 403)
    // المؤقّت مابيشتغلش في الاختبارات (زي عامل الطابور)؛ وفي التشغيل العادي مؤقّت مابيمسكش العملية، وبيتوقف مع قفل الخادم
    assert.equal(gate.timer, null)
    gate.startBackgroundRefresh()
    assert.deepEqual([gate.timer !== null, gate.timer.hasRef()], [true, false])
    gate.onModuleDestroy()
    assert.equal(gate.timer, null)
    // وقراءة للعلامة بدأت قبل كتابة على السياسات مابتكتبش فوق اللي بعدها
    const stale = gate.refresh()
    gate.generation++
    gate.mandatory = false
    await stale
    assert.equal(gate.mandatory, false)
    await gate.changed()
    assert.equal(gate.active(), true)
    // قراءة العلامة فشلت بعد كتابة اتثبتت (القاعدة اتقطعت لحظة): الطلب مابيفشلش (كان هيتعاد وينشر نسخة تانية)، والبوابة شغالة احتياطي
    const later = expectStatus(await createPolicy(users.admin, { title: 'وقت عطل القراءة' }), 201)
    gate.mandatory = false
    gate.refresh = async () => { throw new Error('database unavailable') }
    try {
      expectStatus(await publish(users.admin, later.id, { bodyText: 'نص', effectiveDate: day(0) }), 201)
      assert.equal(gate.mandatory, true)
    } finally { delete gate.refresh }
    assert.equal(Number((await query('SELECT COUNT(*) AS [n] FROM [policy_versions] WHERE [policyId] = @0', [later.id]))[0].n), 1)
    // وقراءة قديمة فشلت بعد كتابة أحدث منها: مابتكتبش فوق علامتها
    let fail
    gate.refresh = () => new Promise((_resolve, reject) => { fail = () => reject(new Error('late failure')) })
    const older = gate.changed()
    delete gate.refresh
    gate.generation++
    gate.mandatory = false
    fail()
    await older
    assert.equal(gate.mandatory, false)
    await gate.changed()
  } finally { gate.overdueFor = original }
})

test('PL-11: سجل التدقيق — إنشاء وتعديل ونشر وسحب', async () => {
  await fresh()
  await query(`DELETE FROM [audit_log] WHERE [entityType] = N'policy'`).catch(() => undefined)
  const policy = expectStatus(await createPolicy(users.hrAll, { title: 'سياسة للتدقيق', isMandatory: true, graceDays: 1 }), 201)
  expectStatus(await request(users.hrAll, 'PATCH', `/policies/${policy.id}`, { graceDays: 2 }), 200)
  // تعديل من غير تغيير: من غير سطر
  expectStatus(await request(users.hrAll, 'PATCH', `/policies/${policy.id}`, { graceDays: 2 }), 200)
  const version = expectStatus(await publish(users.hrAll, policy.id, { bodyText: 'نص', effectiveDate: day(0) }), 201)
  expectStatus(await request(users.admin, 'POST', `/policies/${policy.id}/withdraw`), 201)
  const rows = await query(`SELECT [category], [action], [entityId], [actorUserId], [branchId], [summary], [before], [after] FROM [audit_log] WHERE [entityType] = N'policy' ORDER BY [id]`)
  assert.deepEqual(rows.map(row => [row.category, row.action, row.entityId, row.actorUserId, row.branchId, row.summary]), [
    ['SETTINGS', 'POLICY_CREATED', String(policy.id), users.hrAll.id, null, 'سياسة جديدة: سياسة للتدقيق'],
    ['SETTINGS', 'POLICY_UPDATED', String(policy.id), users.hrAll.id, null, 'تعديل بيانات سياسة: سياسة للتدقيق'],
    ['SETTINGS', 'POLICY_VERSION_PUBLISHED', String(policy.id), users.hrAll.id, null, 'نشر النسخة 1 من سياسة: سياسة للتدقيق'],
    ['SETTINGS', 'POLICY_WITHDRAWN', String(policy.id), users.admin.id, null, 'سحب سياسة: سياسة للتدقيق']])
  assert.deepEqual([JSON.parse(rows[1].before).graceDays, JSON.parse(rows[1].after).graceDays], [1, 2])
  assert.deepEqual((({ versionId, versionNo, kind, contentHash, isMaterial }) => [versionId, versionNo, kind, contentHash, isMaterial])(JSON.parse(rows[2].after)), [version.id, 1, 'TEXT', sha('نص'), true])
})
