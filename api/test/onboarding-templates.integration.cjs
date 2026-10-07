'use strict'
// B3.1-أ: قوالب التهيئة بالنطاق (فرع، مسمى، درجة، نوع تعاقد) على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر
// (hr_onb_templates_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور:
//  OT-01) من غير قالب بنطاق: السلوك القايم بالحرف (القالب العام بـ8 بنود وموظف جديد بياخدها)؛ والمدخلات الغلط 400، ومن غير
//         صلاحية الإعدادات 403، وقالب مش موجود 404.
//  OT-02) قالب بنطاق بيبدأ بنسخة من بنود القالب العام وبنوده مستقلة عنه؛ الموظف بياخد أدق قالب مفعّل بيطابق ملفه (من الشاشة ومن
//         حدث التعيين)، والمسمى بيتقارن من غير فرق مسافات؛ قالب معطّل أو من غير بنود مفعّلة = اللي بعده ثم القالب العام؛ والقوايم
//         القايمة مابتتغيّرش.
//  OT-03) نطاق الفروع: حساب الفرع بيشوف ويدير قوالب فرعه بس (من غير اسم فرع تاني)، وقالب لكل الفروع أو لفرع برّه نطاقه وبنوده =
//         غير موجود؛ ومايعملش قالب من غير فرع ولا ينقل قالبه لفرع برّه نطاقه.
// Run (من api/): node --test test/onboarding-templates.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))

const database = `hr_onb_templates_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_onb_templates_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-onb-templates-uploads-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const isoDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const daysAgo = n => { const day = new Date(); day.setDate(day.getDate() - n); return isoDate(day) }
let app, ds, master, base, created = false, sequence = 0
const B = {}, D = {}, U = {}, G = {}, T = {}
const TITLE = 'مندوب مبيعات'
const SAMPLES = 'تسليم عينات المنتجات'

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
// موظف جديد (التحق من يومين) بملف معيّن
const hire = (branch, extra = {}) => repo('Employee').save({ employeeCode: `OT-${String(++sequence).padStart(3, '0')}`, fullName: `موظف قوالب ${sequence}`,
  branchId: branch.id, departmentId: (branch.id === B.main.id ? D.main : D.other).id, status: 'active', isActive: true, joinDate: daysAgo(2), ...extra })
// مهام الموظف من شاشة التهيئة (القراءة بتنسخ القالب للي مالوش مهام)
const tasksOf = async employee => ok(await request(U.admin, 'GET', '/onboarding')).employees.find(row => row.id === employee.id)?.tasks ?? []
const labels = tasks => tasks.map(task => task.label)
const items = (user, templateId) => request(user, 'GET', `/onboarding/template${templateId ? `?templateId=${templateId}` : ''}`)
const templates = async user => ok(await request(user, 'GET', '/onboarding/templates'))

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  const connection = db => ({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: db, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 })
  master = await new sql.ConnectionPool(connection('master')).connect()
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
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  B.main = await repo('Branch').save({ code: 'OT-MAIN', name: 'فرع المعادي' })
  B.other = await repo('Branch').save({ code: 'OT-OTHER', name: 'فرع الإسكندرية السري' })
  D.main = await repo('Department').save({ name: 'قسم المبيعات', code: 'OT_SALES', branchId: B.main.id, isActive: true })
  D.other = await repo('Department').save({ name: 'قسم مبيعات الإسكندرية', code: 'OT_ALEX', branchId: B.other.id, isActive: true })
  G.senior = await repo('Grade').save({ name: 'درجة أولى قوالب', isActive: true })
  const user = (email, role, branch, permissions, extra = {}) => repo('User').save({ email, displayName: email, passwordHash: 'isolated-test-token-only',
    role, branchId: branch ? branch.id : null, employeeId: null, permissions: JSON.stringify(permissions), ...extra })
  U.admin = await user('admin@onb-templates.test', 'super_admin', null, ['*'])
  U.settingsMain = await user('settings-main@onb-templates.test', 'hr_manager', B.main, ['settings.manage', 'employees.view', 'employees.edit'])
  U.settingsOther = await user('settings-other@onb-templates.test', 'hr_manager', B.other, ['settings.manage', 'employees.view'])
  U.hr = await user('hr@onb-templates.test', 'hr_manager', B.main, ['employees.view', 'employees.edit', 'approve.hr'])
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-onb-templates-uploads-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'onboarding templates fixture cleanup failed')
})

test('OT-01: من غير قالب بنطاق السلوك القايم بالحرف؛ والمدخلات الغلط 400، ومن غير الصلاحية 403، وقالب مش موجود 404', async () => {
  assert.deepEqual(await templates(U.admin), { ready: true, templates: [] })
  T.general = ok(await items(U.admin))
  assert.equal(T.general.length, 8)
  assert.ok(T.general.every(item => !('templateId' in item)), 'شكل بند القالب العام زي ما هو')
  const first = await hire(B.main, { jobTitle: TITLE })
  assert.deepEqual(labels(await tasksOf(first)), labels(T.general))

  const create = body => request(U.admin, 'POST', '/onboarding/templates', body)
  refused(await create({ name: 'قالب من غير نطاق' }), 400, /القالب محتاج نطاق/)
  refused(await create({ name: 'قالب من غير نطاق', branchId: null, jobTitle: '   ', gradeId: null, contractType: null }), 400, /القالب محتاج نطاق/)
  refused(await create({ name: 'ق', branchId: B.main.id }), 400, /اسم القالب حرفان/)
  refused(await create({ branchId: B.main.id }), 400, /اسم القالب/)
  refused(await create({ name: 'نوع غلط', contractType: 'weekly' }), 400, /نوع التعاقد/)
  refused(await create({ name: 'فرع نص', branchId: 'x' }), 400, /الفرع رقم صحيح/)
  refused(await create({ name: 'فرع مش موجود', branchId: 987654 }), 404, /الفرع غير موجود/)
  refused(await create({ name: 'درجة مش موجودة', gradeId: 987654 }), 400, /الدرجة غير موجودة/)
  refused(await create({ name: 'مسمى طويل', jobTitle: 'م'.repeat(101) }), 400, /المسمى لا يتجاوز 100/)
  for (const [method, route, body] of [['GET', '/onboarding/templates'], ['POST', '/onboarding/templates', { name: 'قالب', branchId: B.main.id }],
    ['PATCH', '/onboarding/templates/1', { isActive: false }], ['GET', '/onboarding/template']]) {
    refused(await request(U.hr, method, route, body), 403)
  }
  refused(await items(U.admin, 987654), 404, /القالب غير موجود/)
  refused(await request(U.admin, 'GET', '/onboarding/template?templateId=abc'), 400, /رقم القالب غير صالح/)
  refused(await request(U.admin, 'GET', '/onboarding/template?templateId=0'), 400, /رقم القالب غير صالح/)
  refused(await request(U.admin, 'PATCH', '/onboarding/templates/987654', { isActive: false }), 404, /القالب غير موجود/)
  refused(await request(U.admin, 'POST', '/onboarding/template', { templateId: 987654, label: 'بند لقالب مش موجود', party: 'hr' }), 404, /القالب غير موجود/)
  assert.equal(await repo('OnboardingTemplate').count(), 0)
  assert.equal(ok(await items(U.admin)).length, 8)
})

test('OT-02: القالب بيبدأ بنسخة من العام وبنوده مستقلة؛ الموظف بياخد أدق قالب مفعّل بيطابق ملفه؛ والمعطّل والفاضي = اللي بعده ثم العام', async () => {
  // قالب «فرع + مسمى»: نسخة من الـ8 بنود بأرقام جديدة، والقالب العام زي ما هو
  T.sales = ok(await request(U.admin, 'POST', '/onboarding/templates', { name: 'مبيعات المعادي', branchId: B.main.id, jobTitle: `  ${TITLE} ` }), 201)
  assert.deepEqual(T.sales, { id: T.sales.id, name: 'مبيعات المعادي', branchId: B.main.id, branchName: 'فرع المعادي', jobTitle: TITLE, gradeId: null, gradeName: null,
    contractType: null, isActive: true, activeItems: 8 })
  const copied = ok(await items(U.admin, T.sales.id))
  assert.deepEqual(labels(copied), labels(T.general))
  assert.equal(copied.filter(item => T.general.some(general => general.id === item.id)).length, 0, 'بنود القالب صفوف جديدة')
  assert.equal(ok(await items(U.admin)).length, 8, 'القالب العام مااتزوّدش')

  // بند جديد للقالب، وتعطيل بند منسوخ، وتعديل وصف بند: كله على القالب ده بس
  const added = ok(await request(U.admin, 'POST', '/onboarding/template', { templateId: T.sales.id, label: SAMPLES, party: 'custody', dueOffsetDays: 1 }), 201)
  assert.equal(added.sortOrder, Math.max(...copied.map(item => item.sortOrder)) + 10)
  const training = copied.find(item => item.label === 'التدريب التعريفي الإلزامي')
  ok(await request(U.admin, 'PATCH', `/onboarding/template/${training.id}`, { isActive: false }))
  const tour = copied.find(item => item.party === 'manager')
  ok(await request(U.admin, 'PATCH', `/onboarding/template/${tour.id}`, { label: 'جولة على عملاء المنطقة' }))
  assert.equal(ok(await items(U.admin, T.sales.id)).length, 9)
  assert.deepEqual(labels(ok(await items(U.admin))), labels(T.general), 'القالب العام زي ما هو')
  assert.equal((await templates(U.admin)).templates.find(row => row.id === T.sales.id).activeItems, 8)
  const salesLabels = [...labels(T.general).filter(label => label !== training.label).map(label => label === tour.label ? 'جولة على عملاء المنطقة' : label), SAMPLES]

  // قالب «فرع بس» وقالب «درجة + نوع تعاقد» لكل الفروع
  T.branch = ok(await request(U.admin, 'POST', '/onboarding/templates', { name: 'فرع المعادي', branchId: B.main.id }), 201)
  const branchItems = ok(await items(U.admin, T.branch.id))
  ok(await request(U.admin, 'PATCH', `/onboarding/template/${branchItems[0].id}`, { label: 'استلام مستندات فرع المعادي' }))
  const branchLabels = ['استلام مستندات فرع المعادي', ...labels(T.general).slice(1)]
  T.grade = ok(await request(U.admin, 'POST', '/onboarding/templates', { name: 'درجة أولى موسمي', gradeId: G.senior.id, contractType: 'seasonal' }), 201)
  assert.deepEqual([T.grade.branchId, T.grade.branchName, T.grade.gradeName, T.grade.contractType], [null, null, 'درجة أولى قوالب', 'seasonal'])
  for (const item of ok(await items(U.admin, T.grade.id))) ok(await request(U.admin, 'PATCH', `/onboarding/template/${item.id}`, { isActive: false }))
  assert.equal((await templates(U.admin)).templates.find(row => row.id === T.grade.id).activeItems, 0)

  // الأدق أولًا: فرع + مسمى (حتى بفرق مسافات في ملف الموظف) → قالب المبيعات، وبنوده هي مصدر المهام
  const seller = await hire(B.main, { jobTitle: `${TITLE.replace(' ', '   ')} ` })
  const sellerTasks = await tasksOf(seller)
  assert.deepEqual(labels(sellerTasks), salesLabels)
  const salesItemIds = new Set(ok(await items(U.admin, T.sales.id)).map(item => item.id))
  assert.ok(sellerTasks.every(task => salesItemIds.has(task.templateItemId)))
  assert.equal(sellerTasks.find(task => task.label === SAMPLES).party, 'custody')
  // نفس الفرع ومسمى تاني → قالب الفرع؛ وفرع تاني بنفس المسمى → القالب العام
  assert.deepEqual(labels(await tasksOf(await hire(B.main, { jobTitle: 'محاسب' }))), branchLabels)
  assert.deepEqual(labels(await tasksOf(await hire(B.other, { jobTitle: TITLE }))), labels(T.general))
  // قالب مطابق من غير بنود مفعّلة: بيتعدّى للي بعده (قالب الفرع)، ولو مفيش فالقالب العام
  assert.deepEqual(labels(await tasksOf(await hire(B.main, { gradeId: G.senior.id, contractType: 'seasonal' }))), branchLabels)
  assert.deepEqual(labels(await tasksOf(await hire(B.other, { gradeId: G.senior.id, contractType: 'seasonal' }))), labels(T.general))
  // حدث «تم التعيين» (مستهلك الطابور) بنفس الاختيار
  const queued = await hire(B.main, { jobTitle: TITLE })
  await app.get(require('../src/onboarding/onboarding.service').OnboardingService).materializeHired(queued.id)
  assert.deepEqual((await repo('OnboardingTask').find({ where: { employeeId: queued.id }, order: { sortOrder: 'ASC', id: 'ASC' } })).map(task => task.label), salesLabels)

  // تعطيل القالب: الموظف الجديد بياخد اللي بعده، وقايمة الموظف القديم زي ما هي
  const disabled = ok(await request(U.admin, 'PATCH', `/onboarding/templates/${T.sales.id}`, { isActive: false }))
  assert.deepEqual([disabled.isActive, disabled.name, disabled.jobTitle, disabled.branchId], [false, 'مبيعات المعادي', TITLE, B.main.id])
  assert.deepEqual(labels(await tasksOf(await hire(B.main, { jobTitle: TITLE }))), branchLabels)
  assert.deepEqual(labels(await tasksOf(seller)), salesLabels)
  // تعديل الاسم والنطاق بالحقول المبعوتة بس؛ ومسح خانة بـnull؛ ومسح كل النطاق مرفوض
  const renamed = ok(await request(U.admin, 'PATCH', `/onboarding/templates/${T.sales.id}`, { name: 'مبيعات المعادي (دائم)', contractType: 'permanent', isActive: true }))
  assert.deepEqual([renamed.name, renamed.branchId, renamed.jobTitle, renamed.contractType, renamed.isActive], ['مبيعات المعادي (دائم)', B.main.id, TITLE, 'permanent', true])
  assert.deepEqual(labels(await tasksOf(await hire(B.main, { jobTitle: TITLE, contractType: 'fixed_term' }))), branchLabels, 'نوع تعاقد تاني مابيطابقش')
  assert.deepEqual(labels(await tasksOf(await hire(B.main, { jobTitle: TITLE, contractType: 'permanent' }))), salesLabels)
  const cleared = ok(await request(U.admin, 'PATCH', `/onboarding/templates/${T.sales.id}`, { contractType: null }))
  assert.deepEqual([cleared.contractType, cleared.jobTitle], [null, TITLE])
  refused(await request(U.admin, 'PATCH', `/onboarding/templates/${T.branch.id}`, { branchId: null }), 400, /القالب محتاج نطاق/)
  assert.equal((await repo('OnboardingTemplate').findOneBy({ id: T.branch.id })).branchId, B.main.id)
})

test('OT-03: حساب الفرع بيشوف ويدير قوالب فرعه بس؛ وقالب لكل الفروع أو لفرع برّه نطاقه وبنوده غير موجود له', async () => {
  T.other = ok(await request(U.admin, 'POST', '/onboarding/templates', { name: 'قالب الإسكندرية', branchId: B.other.id }), 201)
  const mine = await templates(U.settingsMain)
  assert.deepEqual(mine.templates.map(row => row.id).sort((a, b) => a - b), [T.sales.id, T.branch.id].sort((a, b) => a - b))
  assert.doesNotMatch(JSON.stringify(mine), /الإسكندرية|درجة أولى موسمي/)
  assert.deepEqual((await templates(U.settingsOther)).templates.map(row => row.id), [T.other.id])
  assert.deepEqual((await templates(U.admin)).templates.map(row => row.id), [T.sales.id, T.branch.id, T.grade.id, T.other.id])

  // قالب برّه النطاق (فرع تاني، أو لكل الفروع): هو وبنوده غير موجودين
  const otherItems = ok(await items(U.admin, T.other.id)), gradeItems = ok(await items(U.admin, T.grade.id))
  for (const template of [T.other, T.grade]) {
    refused(await items(U.settingsMain, template.id), 404, /القالب غير موجود/)
    refused(await request(U.settingsMain, 'PATCH', `/onboarding/templates/${template.id}`, { name: 'اسم من برّه النطاق' }), 404, /القالب غير موجود/)
    refused(await request(U.settingsMain, 'POST', '/onboarding/template', { templateId: template.id, label: 'بند من برّه النطاق', party: 'hr' }), 404, /القالب غير موجود/)
  }
  for (const item of [otherItems[0], gradeItems[0]]) {
    refused(await request(U.settingsMain, 'PATCH', `/onboarding/template/${item.id}`, { label: 'تعديل من برّه النطاق' }), 404, /بند القالب غير موجود/)
  }
  assert.equal((await repo('OnboardingTemplate').findOneBy({ id: T.other.id })).name, 'قالب الإسكندرية')
  assert.deepEqual(labels(ok(await items(U.admin, T.other.id))), labels(otherItems))
  assert.deepEqual(labels(ok(await items(U.admin, T.grade.id))), labels(gradeItems))

  // حساب الفرع: قالب جديد لفرعه بس — من غير فرع 403، وفرع برّه نطاقه 404 (زي فرع مش موجود)، ونقل قالبه لفرع تاني 404، ومسح فرعه 403
  refused(await request(U.settingsMain, 'POST', '/onboarding/templates', { name: 'مسمى لكل الفروع', jobTitle: TITLE }), 403, /فروع محددة/)
  refused(await request(U.settingsMain, 'POST', '/onboarding/templates', { name: 'فرع برّه النطاق', branchId: B.other.id }), 404, /الفرع غير موجود/)
  refused(await request(U.settingsMain, 'PATCH', `/onboarding/templates/${T.branch.id}`, { branchId: B.other.id }), 404, /الفرع غير موجود/)
  refused(await request(U.settingsMain, 'PATCH', `/onboarding/templates/${T.sales.id}`, { branchId: null }), 403, /فروع محددة/)
  const own = ok(await request(U.settingsMain, 'POST', '/onboarding/templates', { name: 'محاسبين المعادي', branchId: B.main.id, jobTitle: 'محاسب' }), 201)
  assert.deepEqual([own.branchId, own.jobTitle, own.activeItems], [B.main.id, 'محاسب', 8])
  ok(await request(U.settingsMain, 'POST', '/onboarding/template', { templateId: own.id, label: 'تسليم ختم المحاسبة', party: 'finance' }), 201)
  ok(await request(U.settingsMain, 'PATCH', `/onboarding/templates/${own.id}`, { name: 'محاسبين فرع المعادي' }))
  assert.equal(ok(await items(U.settingsMain, own.id)).length, 9)
  // بنود القالب العام لحساب الفرع زي ما كانت (القاعدة القايمة)
  ok(await request(U.settingsMain, 'PATCH', `/onboarding/template/${T.general[0].id}`, { dueOffsetDays: 0 }))
  assert.equal(ok(await items(U.settingsMain)).length, 8)
})
