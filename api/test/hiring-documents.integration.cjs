'use strict'
// «مسوغات التعيين» (طلب المالك 30 سبتمبر: المستندات اللي لازم كل موظف يسلّمها عشان يتعيّن، والتهيئة ماتعدّيش غير لما تترفع
// كلها، وتقرير بالناقص عند كل موظف وتذكير له) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_hiring_docs_test_<16 hex>)،
// عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  HD-01) من غير نوع مطلوب: التقرير فاضي والتهيئة من غير مهمة نظام. علامة «مطلوب للتعيين» في الكتالوج بتتقري للكل، وكتابتها
//         لحساب على مستوى الشركة بصلاحية الإعدادات بس (حساب الفرع 403)، والقيمة منطقية بس.
//  HD-02) حساب الناقص: نوع مطلوب ومفعّل ومستند منه بملف مرفوع = موجود (الانتهاء مش شرط، ونوع قديم بحروف كبيرة محسوب)، والمستند
//         من غير ملف ناقص، والنوع المعطَّل مابيتحسبش؛ الموظفين الشغالين بس (منتهي الخدمة والمؤرشف برّه)، بالفرع والقسم وآخر تذكير؛
//         والبحث بالاسم (بتسامح الهمزات) أو الكود (من غير شرطات) وفلتر الفرع.
//  HD-03) نطاق الفروع: حساب الفرع بيشوف فرعه بس من غير اسم ولا كود ولا فرع برّه نطاقه؛ فرع أو موظف برّه النطاق 404 ومفيش تذكير
//         جزئي؛ ومن غير «إدارة مستندات الموظفين» 403؛ والمدخلات الغلط 400.
//  HD-04) التذكير: صف واحد لكل موظف شغال ناقصه حاجة (واللي مالوش ناقص بيتعدّى)، وآخر تذكير في التقرير، وإشعار الموظف «ناقصك من
//         مسوغات التعيين: …» بالناقص الحالي لحد ما يكتمل؛ الشطب زي باقي الإشعارات، وتذكير جديد بيرجّعه؛ و«المطلوب منّي».
//  HD-05) مهمة النظام «استلام مسوغات التعيين» في التهيئة: مع باقي المهام وللموجودين من قبل (مرة واحدة حتى مع قراءتين متزامنتين)،
//         بالتقدّم والناقص؛ ماتتقفلش والناقص موجود (رسالة بالناقص)، وبتكتمل لوحدها بعد رفع المستند، وترجع مفتوحة لو المستند اتغيّر
//         أو نوع جديد بقى مطلوب؛ ووصفها وجهتها ثابتين؛ وحساب فرع تاني 404.
// Run (من api/): node --test test/hiring-documents.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_hiring_docs_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_hiring_docs_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-hiring-docs-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const daysAgo = n => { const day = new Date(); day.setDate(day.getDate() - n); return isoDate(day) }
let app, ds, master, base, created = false
const B = {}, D = {}, E = {}, U = {}, T = {}

const CONTRACT = { code: 'contract', nameAr: 'عقد عمل' }
const NATIONAL_ID = { code: 'national_id', nameAr: 'هوية وطنية / رقم قومي' }
const CRIMINAL = { code: 'criminal_record', nameAr: 'فيش وتشبيه' }
const SYSTEM_KEY = 'HIRING_DOCS'

function assertDisposable() {
  assert.match(database, migrate.DISPOSABLE_DATABASE); assert.match(database, NAME)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }

async function request(user, method, route, body) {
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: 0, ...(user.scopeAllBranches ? { scopeAllBranches: true } : {}),
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, pattern) => {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (pattern) assert.match(JSON.stringify(response.body.message), pattern)
  return response.body
}
const missingReport = (user, query = {}) => request(user, 'GET', `/hiring-documents/missing?${new URLSearchParams(query)}`)
const hiringNotifications = async user => ok(await request(user, 'GET', '/notifications')).filter(n => n.id.startsWith('hiring-docs-reminder-'))
// ملف مرفوع فعلًا لموظف (نفس اللي بيعمله الرفع) + مستند بمرجعه من شاشة «مستندات الموظفين»
async function upload(employee, docType) {
  const file = await repo('StoredFile').save({ originalName: `${docType}.pdf`, storedName: `hiring/${docType}-${employee.id}.pdf`, mime: 'application/pdf',
    size: 10, entityType: 'document', uploadedBy: U.hrMain.id, employeeId: employee.id })
  return ok(await request(U.hrMain, 'POST', '/documents', { employeeId: employee.id, docType, fileRef: `file:${file.id}` }), 201)
}
const systemTasks = async employeeId => repo('OnboardingTask').find({ where: { employeeId, systemKey: SYSTEM_KEY } })

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.main = await repo('Branch').save({ code: 'HD-MAIN', name: 'فرع المعادي' })
  B.other = await repo('Branch').save({ code: 'HD-OTHER', name: 'فرع الإسكندرية السري' })
  D.main = await repo('Department').save({ name: 'قسم التشغيل', code: 'HD_OPS', branchId: B.main.id, isActive: true })
  D.other = await repo('Department').save({ name: 'قسم مبيعات الإسكندرية', code: 'HD_ALEX', branchId: B.other.id, isActive: true })
  const employee = (code, fullName, branch, department, joinDate, extra = {}) => repo('Employee').save({ employeeCode: code, fullName, branchId: branch.id,
    departmentId: department.id, status: 'active', isActive: true, joinDate, ...extra })
  E.new1 = await employee('HD-001', 'أحمد ناقص الهوية', B.main, D.main, daysAgo(5))
  E.new2 = await employee('HD-002', 'منى مستنداتها كاملة', B.main, D.main, daysAgo(10))
  E.self = await employee('HD-003', 'سعيد صاحب الحساب', B.main, D.main, daysAgo(3))
  E.other = await employee('HD-004', 'موظف فرع إسكندرية', B.other, D.other, daysAgo(4))
  E.old = await employee('HD-005', 'قديم بعقد ورقي', B.main, D.main, '2020-01-01')
  E.term = await employee('HD-006', 'منتهي الخدمة', B.main, D.main, daysAgo(20), { status: 'terminated', isActive: false })
  E.archived = await employee('HD-007', 'مؤرشف', B.main, D.main, daysAgo(15), { status: 'archived', isActive: false })
  E.lingering = await employee('HD-008', 'تهيئة متأخرة', B.main, D.main, daysAgo(200))
  // مهمة مفتوحة من زمان: الموظف بيفضل في قائمة التهيئة بعد النافذة
  await repo('OnboardingTask').save({ employeeId: E.lingering.id, templateItemId: null, label: 'تسليم العهدة المتأخرة', party: 'custody',
    dueDate: daysAgo(199), sortOrder: 10, status: 'PENDING' })

  const user = (email, role, branch, employeeId, permissions, extra = {}) => repo('User').save({ email, displayName: email, passwordHash: 'isolated-test-token-only',
    role, branchId: branch ? branch.id : null, employeeId, permissions: JSON.stringify(permissions), ...extra })
  const hrPerms = ['documents.manage', 'employees.view', 'employees.edit', 'approve.hr']
  U.admin = await user('admin@hiring.test', 'super_admin', null, null, ['*'])
  U.hrMain = await user('hr-main@hiring.test', 'hr_manager', B.main, null, hrPerms)
  U.hrOther = await user('hr-other@hiring.test', 'hr_manager', B.other, null, hrPerms)
  U.it = await user('it@hiring.test', 'employee', B.main, null, ['approve.it'])
  U.noDocs = await user('viewer@hiring.test', 'hr_manager', B.main, null, ['employees.view'])
  U.settingsBranch = await user('settings-branch@hiring.test', 'hr_manager', B.main, null, ['settings.manage'])
  U.settingsAll = await user('settings-all@hiring.test', 'hr_manager', B.main, null, ['settings.manage'], { scopeAllBranches: true })
  U.plain = await user('saeed@hiring.test', 'employee', B.main, E.self.id, [])

  // مستندات قائمة: عقد بملف + هوية من غير ملف (أحمد)؛ كل المطلوب بملفات والعقد منتهي (منى)؛ عقد قديم بحروف كبيرة ومرجع ملف خارجي (القديم)
  await repo('EmployeeDocument').save([
    { employeeId: E.new1.id, docType: 'contract', fileRef: 'file:9001' },
    { employeeId: E.new1.id, docType: 'national_id', number: '29801011234567', fileRef: null },
    { employeeId: E.new2.id, docType: 'contract', fileRef: 'file:9002', expiryDate: '2025-01-31' },
    { employeeId: E.new2.id, docType: 'national_id', fileRef: 'file:9003' },
    { employeeId: E.new2.id, docType: 'criminal_record', fileRef: 'file:9004' },
    { employeeId: E.old.id, docType: 'CONTRACT', fileRef: 'legacy/scans/contract-005.pdf' },
    { employeeId: E.term.id, docType: 'passport', fileRef: 'file:9005' },
  ])
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-hiring-docs-uploads-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'hiring-documents fixture cleanup failed')
})

test('HD-01: من غير نوع مطلوب التقرير فاضي ومفيش مهمة نظام؛ وعلامة «مطلوب للتعيين» بتتكتب من حساب الشركة بصلاحية الإعدادات بس', async () => {
  assert.deepEqual(ok(await missingReport(U.admin)), { required: [], employees: [] })
  const first = ok(await request(U.admin, 'GET', '/onboarding'))
  const listed = first.employees.map(row => row.id)
  for (const id of [E.new1.id, E.new2.id, E.self.id, E.other.id, E.lingering.id]) assert.ok(listed.includes(id), `في القائمة: ${id}`)
  assert.ok(first.employees.every(row => row.tasks.every(task => task.systemKey === null && task.hiringDocs === undefined)), 'من غير مهمة نظام')
  T.templateCount = await repo('OnboardingTemplateItem').count({ where: { isActive: true } })
  assert.ok(T.templateCount > 0)
  assert.equal(first.employees.find(row => row.id === E.new1.id).tasks.length, T.templateCount)

  // الكتالوج بيتقري لأي حساب ومعاه العلامة (الافتراضي مش مطلوب)
  const types = ok(await request(U.plain, 'GET', '/catalogs/doc-types'))
  assert.ok(types.length >= 12 && types.every(type => type.requiredForHiring === false))
  const contract = types.find(type => type.code === 'contract'), nationalId = types.find(type => type.code === 'national_id')
  const flag = (user, id, requiredForHiring) => request(user, 'PATCH', `/catalogs/doc-types/${id}`, { requiredForHiring })
  // الكتابة: حساب فرع (حتى بصلاحية الإعدادات) 403 برسالة «لكل الشركة»، ومن غير الصلاحية 403، والقيمة منطقية بس
  refused(await flag(U.settingsBranch, contract.id, true), 403, /لكل الشركة/)
  refused(await flag(U.plain, contract.id, true), 403)
  refused(await flag(U.hrMain, contract.id, true), 403)
  refused(await flag(U.admin, contract.id, 'yes'), 400, /مطلوب للتعيين: القيمة true أو false/)
  refused(await flag(U.admin, contract.id, 1), 400, /مطلوب للتعيين/)
  refused(await request(U.settingsBranch, 'POST', '/catalogs/doc-types', { code: 'branch_only', nameAr: 'نوع من حساب فرع', requiredForHiring: true }), 403, /لكل الشركة/)
  assert.equal((await repo('DocType').findOneByOrFail({ id: contract.id })).requiredForHiring, false, 'الرفض ماكتبش حاجة')
  // حساب «كل الفروع» بصلاحية الإعدادات ومدير النظام بيكتبوا، والرد فيه العلامة
  assert.equal(ok(await flag(U.settingsAll, contract.id, true)).requiredForHiring, true)
  assert.equal(ok(await flag(U.admin, nationalId.id, true)).requiredForHiring, true)
  const criminal = ok(await request(U.admin, 'POST', '/catalogs/doc-types', { code: 'criminal_record', nameAr: 'فيش وتشبيه', isActive: true, requiredForHiring: true }), 201)
  assert.equal(criminal.requiredForHiring, true)
  // نوع مطلوب لكن معطّل: مابيتحسبش
  T.medical = ok(await request(U.admin, 'POST', '/catalogs/doc-types', { code: 'medical_test', nameAr: 'تحليل طبي', requiredForHiring: true }), 201)
  ok(await request(U.admin, 'PATCH', `/catalogs/doc-types/${T.medical.id}`, { isActive: false }))
  // نوع جديد من غير العلامة = مش مطلوب (القيمة الافتراضية)
  const plainType = ok(await request(U.admin, 'POST', '/catalogs/doc-types', { code: 'bank_letter_copy', nameAr: 'صورة خطاب البنك' }), 201)
  assert.equal(plainType.requiredForHiring, false)
  const after = ok(await request(U.plain, 'GET', '/catalogs/doc-types'))
  assert.deepEqual(after.filter(type => type.requiredForHiring).map(type => [type.code, type.isActive]),
    [['contract', true], ['national_id', true], ['criminal_record', true], ['medical_test', false]])
})

test('HD-02: الناقص = المطلوب المفعّل من غير مستند بملف (الانتهاء مش شرط)، للموظفين الشغالين، بالفرع والقسم؛ والبحث وفلتر الفرع', async () => {
  const report = ok(await missingReport(U.admin))
  assert.deepEqual(report.required, [CONTRACT, NATIONAL_ID, CRIMINAL], 'المعطّل مش محسوب، وبترتيب الكتالوج')
  const byId = new Map(report.employees.map(row => [row.employeeId, row]))
  assert.deepEqual(byId.get(E.new1.id), { employeeId: E.new1.id, employeeCode: 'HD-001', fullName: 'أحمد ناقص الهوية', branchId: B.main.id,
    branchName: 'فرع المعادي', departmentId: D.main.id, departmentName: 'قسم التشغيل', missing: [NATIONAL_ID, CRIMINAL], requiredCount: 3,
    presentCount: 1, lastReminderAt: null }, 'العقد بملف موجود، والهوية من غير ملف ناقصة')
  assert.ok(!byId.has(E.new2.id), 'كل المطلوب بملفات — والعقد المنتهي محسوب موجود')
  assert.ok(!byId.has(E.term.id) && !byId.has(E.archived.id), 'منتهي الخدمة والمؤرشف برّه التقرير')
  assert.deepEqual(byId.get(E.old.id).missing, [NATIONAL_ID, CRIMINAL], 'عقد قديم بـ«CONTRACT» ومرجع ملف خارجي محسوب موجود')
  assert.deepEqual(byId.get(E.self.id).missing, [CONTRACT, NATIONAL_ID, CRIMINAL])
  assert.equal(byId.get(E.other.id).branchName, 'فرع الإسكندرية السري')
  assert.equal(byId.get(E.other.id).departmentName, 'قسم مبيعات الإسكندرية')
  assert.deepEqual([...byId.keys()].sort((a, b) => a - b), [E.new1.id, E.self.id, E.other.id, E.old.id, E.lingering.id].sort((a, b) => a - b))

  const ids = async query => ok(await missingReport(U.admin, query)).employees.map(row => row.employeeId)
  assert.deepEqual(await ids({ search: 'احمد' }), [E.new1.id], 'من غير همزة بيلاقي «أحمد»')
  assert.deepEqual(await ids({ search: '  ناقص   الهويه ' }), [E.new1.id], 'مسافات زيادة والتاء المربوطة')
  assert.deepEqual(await ids({ search: 'hd003' }), [E.self.id], 'الكود من غير شرطة ولا فرق حروف')
  assert.deepEqual(await ids({ search: 'مش موجود خالص' }), [])
  assert.deepEqual(await ids({ branchId: String(B.other.id) }), [E.other.id])
  assert.deepEqual(await ids({ branchId: String(B.main.id), search: 'سعيد' }), [E.self.id])
})

test('HD-03: نطاق الفروع — حساب الفرع يشوف فرعه بس من غير تسريب، وبرّه النطاق 404 من غير تذكير جزئي، ومن غير الصلاحية 403', async () => {
  const mine = ok(await missingReport(U.hrMain))
  assert.ok(mine.employees.length > 0 && mine.employees.every(row => row.branchId === B.main.id))
  const text = JSON.stringify(mine)
  for (const leak of ['موظف فرع إسكندرية', 'HD-004', 'فرع الإسكندرية السري', 'قسم مبيعات الإسكندرية']) assert.ok(!text.includes(leak), `تسريب: ${leak}`)
  assert.ok(!mine.employees.some(row => row.employeeId === E.other.id))
  assert.deepEqual(ok(await missingReport(U.hrOther)).employees.map(row => row.employeeId), [E.other.id])

  const outside = refused(await missingReport(U.hrMain, { branchId: String(B.other.id) }), 404)
  assert.ok(!JSON.stringify(outside).includes('الإسكندرية'))
  refused(await missingReport(U.hrMain, { branchId: 'abc' }), 400, /الفرع المختار غير صحيح/)
  refused(await missingReport(U.hrMain, { branchId: '0' }), 400)

  const remind = (user, employeeIds) => request(user, 'POST', '/hiring-documents/reminders', { employeeIds })
  const blocked = refused(await remind(U.hrMain, [E.other.id]), 404, /غير موجود/)
  assert.ok(!JSON.stringify(blocked).includes('إسكندرية') && !JSON.stringify(blocked).includes(String(E.other.employeeCode)))
  refused(await remind(U.hrMain, [E.new1.id, E.other.id]), 404)
  refused(await remind(U.hrMain, [987654]), 404)
  assert.equal(await repo('HiringDocumentReminder').count(), 0, 'مفيش تذكير جزئي')
  refused(await remind(U.hrMain, []), 400, /اختار موظف واحد على الأقل/)
  refused(await remind(U.hrMain, ['x']), 400)
  refused(await remind(U.hrMain, [0]), 400)
  refused(await request(U.hrMain, 'POST', '/hiring-documents/reminders', {}), 400)

  for (const user of [U.noDocs, U.plain, U.it]) {
    refused(await missingReport(user), 403)
    refused(await remind(user, [E.new1.id]), 403)
  }
  assert.equal(await repo('HiringDocumentReminder').count(), 0)
})

test('HD-04: التذكير وإشعار «ناقصك من مسوغات التعيين» بالناقص الحالي — الشطب، والتذكير الجديد، والاختفاء لما يكتمل؛ و«المطلوب منّي»', async () => {
  const sent = ok(await request(U.hrMain, 'POST', '/hiring-documents/reminders', { employeeIds: [E.self.id, E.new2.id, E.term.id, E.self.id] }), 201)
  assert.equal(sent.sent, 1); assert.equal(sent.skipped, 2, 'منى كاملة ومنتهي الخدمة برّه — والتكرار بيتحسب مرة')
  assert.deepEqual(sent.reminders.map(row => [row.employeeId, row.missing]), [[E.self.id, [CONTRACT, NATIONAL_ID, CRIMINAL]]])
  const rows = await repo('HiringDocumentReminder').find({ order: { id: 'ASC' } })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, sent.reminders[0].id)
  assert.equal(rows[0].employeeId, E.self.id); assert.equal(rows[0].sentByUserId, U.hrMain.id)
  assert.deepEqual(JSON.parse(rows[0].missingDocTypes), ['contract', 'national_id', 'criminal_record'])
  assert.ok(ok(await missingReport(U.hrMain)).employees.find(row => row.employeeId === E.self.id).lastReminderAt, 'آخر تذكير في التقرير')

  // إشعار الموظف نفسه بس
  const [note] = await hiringNotifications(U.plain)
  assert.deepEqual({ ...note, at: undefined }, { id: `hiring-docs-reminder-${rows[0].id}`, kind: 'warning', category: 'document',
    title: 'ناقصك من مسوغات التعيين: عقد عمل، هوية وطنية / رقم قومي، فيش وتشبيه',
    body: 'سلّم المستندات دي للموارد البشرية عشان تترفع على ملفك — والمطلوب منك كله في «مستنداتي»', at: undefined, link: '/my/documents', read: false })
  for (const user of [U.hrMain, U.admin, U.it]) assert.deepEqual(await hiringNotifications(user), [])
  assert.deepEqual(ok(await request(U.plain, 'GET', '/hiring-documents/mine')), { employeeLinked: true, missingCount: 3,
    documents: [{ ...CONTRACT, present: false }, { ...NATIONAL_ID, present: false }, { ...CRIMINAL, present: false }] })
  assert.deepEqual(ok(await request(U.admin, 'GET', '/hiring-documents/mine')), { employeeLinked: false, documents: [], missingCount: 0 })

  // قراءة وشطب زي باقي الإشعارات: المشطوب مابيرجعش لنفس التذكير
  ok(await request(U.plain, 'PATCH', '/notifications/read', { ids: [note.id] }))
  assert.equal((await hiringNotifications(U.plain))[0].read, true)
  ok(await request(U.plain, 'DELETE', `/notifications/${note.id}`))
  assert.deepEqual(await hiringNotifications(U.plain), [])
  refused(await request(U.hrMain, 'DELETE', `/notifications/${note.id}`), 404, /الإشعار غير موجود/)

  // تذكير جديد = مفتاح جديد: الإشعار راجع غير مقروء
  const again = ok(await request(U.hrMain, 'POST', '/hiring-documents/reminders', { employeeIds: [E.self.id] }), 201)
  assert.equal(again.sent, 1)
  const [renewed] = await hiringNotifications(U.plain)
  assert.equal(renewed.id, `hiring-docs-reminder-${again.reminders[0].id}`); assert.equal(renewed.read, false)

  // رفع الناقص من «مستندات الموظفين»: العنوان بالناقص الحالي على نفس المفتاح، ومستند من غير ملف مابيكمّلش
  await upload(E.self, 'contract')
  ok(await request(U.hrMain, 'POST', '/documents', { employeeId: E.self.id, docType: 'national_id', number: '29901011234567' }), 201)
  const [partial] = await hiringNotifications(U.plain)
  assert.equal(partial.id, renewed.id)
  assert.equal(partial.title, 'ناقصك من مسوغات التعيين: هوية وطنية / رقم قومي، فيش وتشبيه')
  assert.equal(ok(await request(U.plain, 'GET', '/hiring-documents/mine')).missingCount, 2)
  await upload(E.self, 'national_id')
  await upload(E.self, 'criminal_record')
  assert.deepEqual(await hiringNotifications(U.plain), [], 'اكتمل: الإشعار اختفى لوحده')
  assert.deepEqual(ok(await request(U.plain, 'GET', '/hiring-documents/mine')), { employeeLinked: true, missingCount: 0,
    documents: [{ ...CONTRACT, present: true }, { ...NATIONAL_ID, present: true }, { ...CRIMINAL, present: true }] })
  assert.ok(!ok(await missingReport(U.hrMain)).employees.some(row => row.employeeId === E.self.id))
  // وتذكير لموظف كامل مابيتبعتش
  const none = ok(await request(U.hrMain, 'POST', '/hiring-documents/reminders', { employeeIds: [E.self.id] }), 201)
  assert.deepEqual([none.sent, none.skipped, none.reminders], [0, 1, []])
  assert.equal(await repo('HiringDocumentReminder').count(), 2)
})

test('HD-05: مهمة «استلام مسوغات التعيين» — مع المهام وللموجودين مرة واحدة، بالتقدّم والناقص، ماتتقفلش والناقص موجود، وبتكتمل وترجع لوحدها', async () => {
  const listOf = async user => ok(await request(user, 'GET', '/onboarding'))
  const list = await listOf(U.hrMain)
  const tasksOf = id => list.employees.find(row => row.id === id)?.tasks ?? []
  const systemOf = id => tasksOf(id).filter(task => task.systemKey === SYSTEM_KEY)
  for (const id of [E.new1.id, E.new2.id, E.self.id, E.lingering.id]) assert.equal(systemOf(id).length, 1, `مهمة نظام واحدة: ${id}`)
  assert.ok(!list.employees.some(row => row.id === E.other.id), 'حساب الفرع مايشوفش موظف فرع تاني')
  const task = systemOf(E.new1.id)[0]
  assert.equal(tasksOf(E.new1.id)[0].id, task.id, 'أول مهمة في القائمة')
  assert.deepEqual([task.label, task.party, task.dueDate, task.status, task.templateItemId], ['استلام مسوغات التعيين', 'hr', daysAgo(5), 'PENDING', null])
  assert.deepEqual(task.hiringDocs, { requiredCount: 3, presentCount: 1, missing: [NATIONAL_ID, CRIMINAL] })
  assert.equal(tasksOf(E.new1.id).filter(t => t.systemKey === null).length, T.templateCount, 'القالب ماتنسخش تاني للموجود من قبل')
  // منى كاملة: المهمة اكتملت لوحدها من غير اسم؛ وسعيد اكتمل برفع المستندات (HD-04)
  const done = systemOf(E.new2.id)[0]
  assert.deepEqual([done.status, done.doneByName, done.hiringDocs.missing], ['DONE', null, []]); assert.ok(done.doneAt)
  assert.equal(systemOf(E.self.id)[0].status, 'DONE')
  // المتأخر بعد النافذة (عنده مهمة مفتوحة) عنده المهمة؛ والقديم برّه القائمة مالوش
  assert.equal(systemOf(E.lingering.id)[0].status, 'PENDING')
  assert.equal(await repo('OnboardingTask').count({ where: { employeeId: E.old.id } }), 0)

  // موظف جديد: مع باقي المهام أول ما يظهر — ومرة واحدة حتى مع قراءتين متزامنتين
  E.fresh = await repo('Employee').save({ employeeCode: 'HD-009', fullName: 'موظف جديد النهارده', branchId: B.main.id, departmentId: D.main.id,
    status: 'active', isActive: true, joinDate: daysAgo(0) })
  await Promise.all([listOf(U.hrMain), listOf(U.admin)])
  const fresh = await repo('OnboardingTask').find({ where: { employeeId: E.fresh.id }, order: { sortOrder: 'ASC', id: 'ASC' } })
  assert.equal(fresh.length, T.templateCount + 1)
  assert.deepEqual(fresh.filter(t => t.systemKey === SYSTEM_KEY).map(t => [t.label, t.sortOrder, t.status]), [['استلام مسوغات التعيين', 0, 'PENDING']])
  assert.equal(new Set(fresh.map(t => `${t.templateItemId}|${t.systemKey}`)).size, fresh.length, 'مفيش تكرار')

  // القفل: DONE أو SKIPPED والناقص موجود مرفوض برسالة بالناقص وتعمل إيه؛ والوصف والجهة ثابتين؛ والملاحظة عادي
  const patch = (user, body) => request(user, 'PATCH', `/onboarding/tasks/${task.id}`, body)
  refused(await patch(U.hrMain, { status: 'DONE' }), 400, /مش هتتقفل غير لما كل المستندات المطلوبة تترفع — ناقص: هوية وطنية \/ رقم قومي، فيش وتشبيه\. ارفعها من «مستندات الموظفين»/)
  refused(await patch(U.hrMain, { status: 'SKIPPED' }), 400, /ناقص: هوية وطنية \/ رقم قومي، فيش وتشبيه/)
  refused(await patch(U.admin, { status: 'DONE' }), 400, /ناقص/)
  refused(await patch(U.hrMain, { label: 'استلام أي ورق' }), 400, /ثابتين/)
  refused(await patch(U.hrMain, { party: 'it' }), 400, /ثابتين/)
  refused(await patch(U.hrOther, { status: 'DONE' }), 404, /المهمة غير موجودة/)
  refused(await patch(U.it, { status: 'DONE' }), 403)
  const noted = ok(await patch(U.hrMain, { note: 'هيجيب الفيش الأسبوع الجاي' }))
  assert.deepEqual([noted.status, noted.note, noted.systemKey, noted.hiringDocs.presentCount], ['PENDING', 'هيجيب الفيش الأسبوع الجاي', SYSTEM_KEY, 1])
  assert.equal((await systemTasks(E.new1.id))[0].status, 'PENDING')

  // رفع الناقص من «مستندات الموظفين» بيكمّل المهمة على طول (من غير قراءة التهيئة)
  const national = await upload(E.new1, 'national_id')
  assert.equal((await systemTasks(E.new1.id))[0].status, 'PENDING', 'لسه الفيش ناقص')
  const criminal = await upload(E.new1, 'criminal_record')
  const completed = (await systemTasks(E.new1.id))[0]
  assert.deepEqual([completed.status, completed.doneBy], ['DONE', null]); assert.ok(completed.doneAt)
  refused(await patch(U.hrMain, { status: 'PENDING' }), 400, /مسوغات التعيين كاملة/)
  refused(await patch(U.hrMain, { status: 'SKIPPED' }), 400, /كاملة/)
  assert.equal(ok(await patch(U.hrMain, { status: 'DONE' })).status, 'DONE', 'نفس الحالة: مفيش تغيير')

  // مستند مطلوب اتغيّر نوعه (اترفع غلط) → المهمة ترجع مفتوحة على طول، والتقرير بيرجّع الموظف
  ok(await request(U.hrMain, 'PATCH', `/documents/${criminal.id}`, { docType: 'other' }))
  const reopened = (await systemTasks(E.new1.id))[0]
  assert.deepEqual([reopened.status, reopened.doneBy, reopened.doneAt], ['PENDING', null, null])
  assert.deepEqual(ok(await missingReport(U.hrMain, { search: 'HD-001' })).employees.map(row => row.missing), [[CRIMINAL]])
  ok(await request(U.hrMain, 'PATCH', `/documents/${criminal.id}`, { docType: 'criminal_record' }))
  assert.equal((await systemTasks(E.new1.id))[0].status, 'DONE')
  // الملف اتشال من المستند → ناقص تاني
  ok(await request(U.hrMain, 'PATCH', `/documents/${national.id}`, { fileRef: '' }))
  assert.equal((await systemTasks(E.new1.id))[0].status, 'PENDING')
  await upload(E.new1, 'national_id')
  assert.equal((await systemTasks(E.new1.id))[0].status, 'DONE')

  // نوع بقى مطلوب بعد الاكتمال → المهمة بترجع مفتوحة مع أول قراءة، وبعد ما يبطل مطلوب بتكتمل تاني
  const types = ok(await request(U.admin, 'GET', '/catalogs/doc-types'))
  const passport = types.find(type => type.code === 'passport')
  ok(await request(U.admin, 'PATCH', `/catalogs/doc-types/${passport.id}`, { requiredForHiring: true }))
  const withPassport = systemOfList(await listOf(U.hrMain), E.new1.id)
  assert.deepEqual([withPassport.status, withPassport.hiringDocs.missing], ['PENDING', [{ code: 'passport', nameAr: passport.nameAr }]])
  assert.equal(withPassport.hiringDocs.requiredCount, 4)
  ok(await request(U.admin, 'PATCH', `/catalogs/doc-types/${passport.id}`, { requiredForHiring: false }))
  assert.equal(systemOfList(await listOf(U.hrMain), E.new1.id).status, 'DONE')

  // مفيش ولا نوع مطلوب: المهام الموجودة بتكتمل، والموظف الجديد مالوش مهمة نظام
  for (const type of ok(await request(U.admin, 'GET', '/catalogs/doc-types')).filter(row => row.requiredForHiring)) {
    ok(await request(U.admin, 'PATCH', `/catalogs/doc-types/${type.id}`, { requiredForHiring: false }))
  }
  E.later = await repo('Employee').save({ employeeCode: 'HD-010', fullName: 'موظف بعد إلغاء المطلوب', branchId: B.main.id, departmentId: D.main.id,
    status: 'active', isActive: true, joinDate: daysAgo(1) })
  const cleared = await listOf(U.admin)
  assert.equal(systemOfList(cleared, E.lingering.id).status, 'DONE')
  assert.deepEqual(systemOfList(cleared, E.lingering.id).hiringDocs, { requiredCount: 0, presentCount: 0, missing: [] })
  assert.equal((await systemTasks(E.later.id)).length, 0)
  assert.equal(cleared.employees.find(row => row.id === E.later.id).tasks.length, T.templateCount)
  assert.deepEqual(ok(await missingReport(U.admin)), { required: [], employees: [] })
})

function systemOfList(list, employeeId) {
  const tasks = list.employees.find(row => row.id === employeeId)?.tasks ?? []
  const system = tasks.filter(task => task.systemKey === SYSTEM_KEY)
  assert.equal(system.length, 1, `مهمة نظام واحدة للموظف ${employeeId}`)
  return system[0]
}
