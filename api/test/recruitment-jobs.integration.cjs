'use strict'
// B3.2-أ: الاحتياج والوظيفة الشاغرة على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_recruitment_jobs_test_<16 hex>)، عبر HTTP بتوكنات
// موقّعة محليًا ومن غير كلمات مرور. ولا رسالة بريد حقيقية.
//  RJ-01) طلب «احتياج توظيف»: حقوله من الخادم، وفحوص التقديم (المسمى من الكتالوج، العدد، نطاق الراتب، التاريخ)، والقسم بيتثبّت من مقدّم
//         الطلب فوق أي قيمة من العميل؛ والاعتماد النهائي بيعمل وظيفة «مسودة» على فرع الطلب والقسم المتثبّت، والطلب مكتمل بمرجعها؛
//         وقسم اتنقل لفرع تاني والاعتماد مستني = الاعتماد مرفوض ومن غير وظيفة.
//  RJ-02) شاشة الوظائف: بصلاحية إدارة التوظيف وبنطاق فروع الحساب (برّه النطاق = غير موجودة)؛ الإنشاء والتعديل بالخانات؛ الفرع والقسم
//         مابيتغيّروش؛ واسم القسم بفرعه الحالي.
//  RJ-03) الحالة: النشر محتاج وصف ومكان نشر؛ منشورة ↔ موقوفة؛ والقفل نهائي؛ وكل تغيير في سجل التدقيق؛ والموديول المقفول بيقفل المسارات.
// Run (من api/): node --test test/recruitment-jobs.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recruitment_jobs_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_recruitment_jobs_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-recruitment-jobs-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/recruitment/recruitment-rules')
const requisition = require('../src/recruitment/requisition-requests')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, made = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const query = (text, params = []) => { assertDisposable(); return ds.query(text, params) }
const payloadOf = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false,
  permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(payloadOf(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `RJ${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف التوظيف ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@recruitment-jobs.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const audits = async action => Number((await query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', [action]))[0].n)
const jobCount = async () => Number((await query('SELECT COUNT(*) AS [n] FROM [recruitment_jobs]'))[0].n)
const refused = message => `لم يُعتمد الطلب — ${message}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`
const ask = (user, payload, extra = {}) => request(user, 'POST', '/requests', { typeCode: 'RECRUITMENT_REQUISITION', payload, submit: true, ...extra })
const approve = (user, id) => request(user, 'POST', `/requests/${id}/act`, { action: 'APPROVE' })
const stagedOf = async id => { const payload = JSON.parse((await repo('Request').findOneByOrFail({ id })).payload); return [payload.vacancyDepartmentId, payload.vacancyDepartment] }
const list = async user => expectStatus(await request(user, 'GET', '/recruitment/jobs'), 200)
const createJob = (user, body) => request(user, 'POST', '/recruitment/jobs', body)
const setStatus = (user, id, status) => request(user, 'POST', `/recruitment/jobs/${id}/status`, { status })
const good = { vacancyTitle: 'مندوب مبيعات', openings: 2, reason: 'فريق مبيعات جديد' }

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
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()

  org.branchA = await repo('Branch').save({ code: 'RJ_A', name: 'فرع التوظيف أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'RJ_B', name: 'فرع التوظيف ب السري', country: 'SA' })
  org.finance = await repo('Department').save({ name: 'قسم المالية', code: 'RJ_FIN', branchId: org.branchA.id })
  org.sales = await repo('Department').save({ name: 'قسم المبيعات', code: 'RJ_SAL', branchId: org.branchA.id })
  org.bDepartment = await repo('Department').save({ name: 'قسم فرع ب', code: 'RJ_BD', branchId: org.branchB.id })
  await repo('JobTitle').save([{ title: 'محاسب', isActive: true }, { title: 'مندوب مبيعات', isActive: true }, { title: 'مسمى مقفول', isActive: false }])
  emps.a1 = await employee({ departmentId: org.finance.id, jobTitle: 'محاسب' })
  emps.s1 = await employee({ departmentId: org.sales.id, jobTitle: 'مندوب مبيعات' })
  users.admin = await repo('User').save({ email: 'admin@recruitment-jobs.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.recruiterA = await account('recruiter-a', ['candidates.manage'])
  users.recruiterB = await account('recruiter-b', ['candidates.manage'], { branchId: org.branchB.id })
  users.fin = await account('fin', [], { employeeId: emps.a1.id })
  users.seller = await account('seller', [], { employeeId: emps.s1.id })
  users.approver = await account('approver', ['approve.hr', 'requests.view_all'])
  users.nobody = await account('nobody', [])
  const chain = await repo('ApprovalChain').save({ code: 'RJ_HR', nameAr: 'سلسلة احتياج التوظيف', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'RECRUITMENT_REQUISITION', nameAr: 'احتياج توظيف', category: 'employment_status', destinationHandler: 'recruitment_requisition',
    approvalChainId: chain.id, isActive: true })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-recruitment-jobs-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'recruitment jobs fixture cleanup failed')
})

test('RJ-01: طلب «احتياج توظيف» — حقوله من الخادم، وفحوص التقديم، والقسم المتثبّت، والاعتماد بيعمل وظيفة مسودة بمرجعها', async () => {
  const type = expectStatus(await request(users.fin, 'GET', '/requests/types'), 200).find(row => row.code === 'RECRUITMENT_REQUISITION')
  assert.deepEqual(JSON.parse(type.requiredFields), ['vacancyTitle', 'openings', 'reason'])
  assert.deepEqual(JSON.parse(type.customFields), [
    { key: 'vacancyTitle', label: 'المسمى الوظيفي المطلوب', type: 'select', required: true, options: ['محاسب', 'مندوب مبيعات'] },
    { key: 'openings', label: 'العدد المطلوب', type: 'number', required: true },
    { key: 'reason', label: 'سبب الاحتياج', type: 'text', required: true },
    { key: 'salaryFrom', label: 'الراتب المقترح من', type: 'number', required: false },
    { key: 'salaryTo', label: 'الراتب المقترح إلى', type: 'number', required: false },
    { key: 'startDate', label: 'تاريخ البدء المطلوب', type: 'date', required: false }])
  assert.equal(type.destinationSupported, true)
  // فحوص التقديم: نفس رسايل الاعتماد النهائي بدري، ومفيش طلب بيتقدّم من المرفوض
  for (const [payload, message] of [
    [{ ...good, vacancyTitle: 'مسمى مش موجود' }, rules.RECRUITMENT_TITLE_MISSING], [{ ...good, vacancyTitle: 'مسمى مقفول' }, rules.RECRUITMENT_TITLE_MISSING],
    [{ ...good, openings: 0 }, rules.RECRUITMENT_OPENINGS], [{ ...good, openings: 1001 }, rules.RECRUITMENT_OPENINGS], [{ ...good, openings: 1.5 }, rules.RECRUITMENT_OPENINGS],
    [{ ...good, salaryFrom: 9000, salaryTo: 7000 }, rules.RECRUITMENT_SALARY], [{ ...good, salaryFrom: -1 }, rules.RECRUITMENT_SALARY], [{ ...good, salaryTo: '12.345' }, rules.RECRUITMENT_SALARY],
    [{ ...good, startDate: '2027-02-31' }, rules.RECRUITMENT_START_DATE], [{ ...good, startDate: 'بكرة' }, rules.RECRUITMENT_START_DATE],
  ]) assert.deepEqual(answer(await ask(users.fin, payload)), [400, message], JSON.stringify(payload))
  assert.equal((await ask(users.fin, { ...good, departmentId: org.sales.id })).status, 400, 'القسم مش من الحمولة: من مقدّم الطلب')
  assert.equal(Number((await query(`SELECT COUNT(*) AS [n] FROM [requests] WHERE [typeCode] = N'RECRUITMENT_REQUISITION' AND [status] <> N'DRAFT'`))[0].n), 0)

  // القسم مش من العميل: حتى لو بعت مفتاحَي الخادم بقسم تاني، الخادم بيثبّت قسم مقدّم الطلب فوقهم
  const before = await audits('RECRUITMENT_JOB_CREATED')
  const sent = expectStatus(await ask(users.fin, { vacancyTitle: ' مندوب  مبيعات ', openings: '2', reason: 'فريق مبيعات جديد', salaryFrom: 7000, salaryTo: '9000.5', startDate: '2026-12-01',
    vacancyDepartmentId: org.sales.id, vacancyDepartment: 'قسم مزوّر' }), 201)
  assert.deepEqual(await stagedOf(sent.id), [org.finance.id, 'قسم المالية'])
  assert.equal(await jobCount(), 0, 'قبل الاعتماد مفيش وظيفة')
  assert.notEqual((await approve(users.fin, sent.id)).status, 201, 'اللي مش على الخطوة مايعتمدش')
  expectStatus(await approve(users.approver, sent.id), 201)
  const [job] = await repo('RecruitmentJob').find()
  assert.deepEqual([job.title, job.branchId, job.departmentId, job.openings, job.reason, Number(job.salaryFrom).toFixed(2), Number(job.salaryTo).toFixed(2), String(job.startDate).slice(0, 10), job.status, job.internal, job.external,
    job.requestId, job.createdByUserId, job.description, job.publishedAt],
    ['مندوب مبيعات', org.branchA.id, org.finance.id, 2, 'فريق مبيعات جديد', '7000.00', '9000.50', '2026-12-01', 'DRAFT', true, false, sent.id, 0, null, null])
  const stored = await repo('Request').findOneByOrFail({ id: sent.id })
  assert.deepEqual([stored.status, stored.destinationRef, await audits('RECRUITMENT_JOB_CREATED') - before], ['COMPLETED', `JOB-${job.id}`, 1])
  made.fromRequest = job

  // قسم مقدّم الطلب اتنقل لفرع تاني والاعتماد مستني: الاعتماد مرفوض ومن غير وظيفة؛ ورجوعه = الاعتماد بيعدّي
  const waiting = expectStatus(await ask(users.seller, { vacancyTitle: 'محاسب', openings: 1, reason: 'محاسب للمبيعات' }), 201)
  assert.deepEqual(await stagedOf(waiting.id), [org.sales.id, 'قسم المبيعات'])
  await repo('Department').update({ id: org.sales.id }, { branchId: org.branchB.id })
  assert.deepEqual(answer(await approve(users.approver, waiting.id)), [400, refused(requisition.REQUISITION_UNIT_GONE)])
  assert.equal(await jobCount(), 1)
  await repo('Department').update({ id: org.sales.id }, { branchId: org.branchA.id })
  expectStatus(await approve(users.approver, waiting.id), 201)
  assert.deepEqual((await repo('RecruitmentJob').find({ order: { id: 'ASC' } })).map(row => [row.title, row.departmentId, row.requestId]),
    [['مندوب مبيعات', org.finance.id, sent.id], ['محاسب', org.sales.id, waiting.id]])
  // موظف من غير قسم: على مستوى الفرع
  await repo('Employee').update({ id: emps.s1.id }, { departmentId: null })
  const level = expectStatus(await ask(users.seller, { vacancyTitle: 'محاسب', openings: 1, reason: 'للفرع' }), 201)
  assert.deepEqual(await stagedOf(level.id), [null, requisition.REQUISITION_BRANCH_LEVEL])
  expectStatus(await approve(users.approver, level.id), 201)
  assert.equal((await repo('RecruitmentJob').findOneByOrFail({ requestId: level.id })).departmentId, null)
  await repo('Employee').update({ id: emps.s1.id }, { departmentId: org.sales.id })
})

test('RJ-02: شاشة الوظائف — بصلاحية إدارة التوظيف وبنطاق فروع الحساب؛ الإنشاء والتعديل بالخانات؛ والوحدة مابتتغيّرش؛ واسم القسم بفرعه الحالي', async () => {
  const mine = await list(users.recruiterA)
  assert.deepEqual([mine.available, mine.canManage, mine.jobs.length], [true, true, 3])
  const row = mine.jobs.find(job => job.id === made.fromRequest.id)
  assert.deepEqual([row.code, row.title, row.branchName, row.departmentId, row.departmentName, row.openings, row.status, row.statusLabel, row.requestId, row.salaryFrom, row.salaryTo, row.startDate],
    [`J-${String(row.id).padStart(4, '0')}`, 'مندوب مبيعات', 'فرع التوظيف أ', org.finance.id, 'قسم المالية', 2, 'DRAFT', 'مسودة', made.fromRequest.requestId, '7000.00', '9000.50', '2026-12-01'])
  // حساب فرع تاني: ولا وظيفة، والوظيفة برّه نطاقه غير موجودة (قراءة وتعديل وحالة)؛ ومن غير الصلاحية 403
  assert.deepEqual((await list(users.recruiterB)).jobs, [])
  for (const [method, route, body] of [['GET', `/recruitment/jobs/${row.id}`], ['PATCH', `/recruitment/jobs/${row.id}`, { openings: 9 }], ['POST', `/recruitment/jobs/${row.id}/status`, { status: 'CLOSED' }]]) {
    assert.deepEqual(answer(await request(users.recruiterB, method, route, body)), [404, 'الوظيفة غير موجودة'], route)
  }
  for (const user of [users.nobody, users.fin]) assert.equal((await request(user, 'GET', '/recruitment/jobs')).status, 403)
  assert.equal((await createJob(users.nobody, { title: 'محاسب', branchId: org.branchA.id, openings: 1 })).status, 403)
  assert.equal((await list(users.admin)).jobs.length, 3)

  // الإنشاء من الشاشة: المدخلات، والفرع من النطاق، والقسم تبع الفرع
  const body = { title: 'محاسب', branchId: org.branchA.id, departmentId: org.finance.id, openings: 3, reason: 'توسّع', description: 'محاسب عام لقسم المالية', requirements: 'خبرة سنتين' }
  for (const [change, status, message] of [
    [{ title: 'مسمى مش موجود' }, 400, rules.RECRUITMENT_TITLE_MISSING], [{ title: undefined }, 400, rules.RECRUITMENT_TITLE_MISSING], [{ openings: 0 }, 400, rules.RECRUITMENT_OPENINGS],
    [{ openings: undefined }, 400, rules.RECRUITMENT_OPENINGS], [{ salaryFrom: 5, salaryTo: 4 }, 400, rules.RECRUITMENT_SALARY], [{ startDate: '2026-13-01' }, 400, rules.RECRUITMENT_START_DATE],
    [{ description: 'و'.repeat(4001) }, 400, 'وصف الوظيفة لا يتجاوز 4000 حرف'], [{ reason: 7 }, 400, 'سبب الاحتياج نص'],
    [{ branchId: org.branchB.id, departmentId: null }, 404, 'الفرع غير موجود'], [{ branchId: 987654, departmentId: null }, 404, 'الفرع غير موجود'],
    [{ departmentId: org.bDepartment.id }, 400, 'القسم مش تبع الفرع ده'], [{ departmentId: 987654 }, 400, 'القسم مش تبع الفرع ده'],
  ]) assert.deepEqual(answer(await createJob(users.recruiterA, { ...body, ...change })), [status, message], JSON.stringify(change))
  assert.equal((await createJob(users.recruiterA, { ...body, branchId: 'x' })).status, 400)
  assert.equal(await jobCount(), 3, 'المرفوض ماعملش وظيفة')
  // بيانات النموذج: فروع نطاق الحساب وأقسامها بس، والمسميات النشطة بس
  const form = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/jobs/form'), 200)
  assert.deepEqual([form.branches.map(row => row.id), form.departments.every(row => row.branchId === org.branchA.id), form.departments.some(row => row.id === org.bDepartment.id),
    form.jobTitles.map(row => row.title)], [[org.branchA.id], true, false, ['محاسب', 'مندوب مبيعات']])
  assert.equal((await request(users.nobody, 'GET', '/recruitment/jobs/form')).status, 403)
  const logged = await audits('RECRUITMENT_JOB_CREATED')
  const job = expectStatus(await createJob(users.recruiterA, body), 201)
  assert.deepEqual([job.title, job.branchId, job.departmentName, job.openings, job.reason, job.description, job.requirements, job.status, job.internal, job.external, job.requestId, job.salaryFrom,
    job.startDate, await audits('RECRUITMENT_JOB_CREATED') - logged],
    ['محاسب', org.branchA.id, 'قسم المالية', 3, 'توسّع', 'محاسب عام لقسم المالية', 'خبرة سنتين', 'DRAFT', true, false, null, null, null, 1])
  assert.equal((await repo('RecruitmentJob').findOneByOrFail({ id: job.id })).createdByUserId, users.recruiterA.id)
  made.manual = job

  // التعديل بالخانات المبعوتة بس، والفرع والقسم مابيتغيّروش
  const edited = expectStatus(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${job.id}`, { openings: 4, salaryFrom: 6000, salaryTo: 8000, external: true }), 200)
  assert.deepEqual([edited.openings, edited.salaryFrom, edited.salaryTo, edited.external, edited.internal, edited.description, edited.reason], [4, '6000.00', '8000.00', true, true, 'محاسب عام لقسم المالية', 'توسّع'])
  assert.deepEqual(answer(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${job.id}`, { salaryTo: 5000 })), [400, rules.RECRUITMENT_SALARY], 'النطاق بيتحكم بالقيمة المتخزّنة للطرف التاني')
  for (const unit of [{ branchId: org.branchB.id }, { departmentId: org.sales.id }, { departmentId: null }]) {
    const refusal = await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${job.id}`, unit)
    assert.equal(refusal.status, 400, JSON.stringify(unit)); assert.match(messageOf(refusal), /فرع الوظيفة وقسمها مابيتغيّروش/)
  }
  expectStatus(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${job.id}`, { branchId: org.branchA.id, departmentId: org.finance.id, reason: null }), 200)
  const stored = await repo('RecruitmentJob').findOneByOrFail({ id: job.id })
  assert.deepEqual([stored.branchId, stored.departmentId, stored.reason, stored.openings], [org.branchA.id, org.finance.id, null, 4])

  // قسم الوظيفة اتنقل لفرع تاني: اسمه ورقمه مابيتعرضوش في وظيفة فرعه القديم
  await repo('Department').update({ id: org.finance.id }, { branchId: org.branchB.id })
  try {
    const moved = (await list(users.recruiterA)).jobs.find(item => item.id === job.id)
    assert.deepEqual([moved.departmentId, moved.departmentName, moved.branchName], [null, null, 'فرع التوظيف أ'])
    assert.deepEqual((await list(users.recruiterA)).jobs.filter(item => item.departmentId === org.finance.id || item.departmentName === 'قسم المالية'), [], 'ولا وظيفة بتعرض القسم المنقول (الوصف نص كتبه صاحبه)')
  } finally { await repo('Department').update({ id: org.finance.id }, { branchId: org.branchA.id }) }
})

test('RJ-03: الحالة — النشر محتاج وصف ومكان نشر، منشورة ↔ موقوفة، والقفل نهائي، وكل تغيير في سجل التدقيق، والموديول المقفول بيقفل المسارات', async () => {
  const draft = made.fromRequest.id, job = made.manual.id
  // وظيفة الطلب من غير وصف: النشر مرفوض؛ وبعد الوصف بيعدّي
  assert.deepEqual(answer(await setStatus(users.recruiterA, draft, 'PUBLISHED')), [400, rules.RECRUITMENT_PUBLISH_NEEDS])
  assert.deepEqual(answer(await setStatus(users.recruiterA, draft, 'PAUSED')), [400, 'الوظيفة مسودة: ماتتحوّلش لـ«موقوفة»'])
  assert.equal((await setStatus(users.recruiterA, draft, 'ARCHIVED')).status, 400)
  expectStatus(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${draft}`, { description: 'مندوب مبيعات ميداني لمنطقة الرياض' }), 200)
  const logged = await audits('RECRUITMENT_JOB_STATUS')
  const published = expectStatus(await setStatus(users.recruiterA, draft, 'PUBLISHED'), 200)
  assert.deepEqual([published.status, published.statusLabel, typeof published.publishedAt, published.closedAt], ['PUBLISHED', 'منشورة', 'string', null])
  // منشورة: لازم تفضل صالحة للنشر (الوصف مايتمسحش، ومكان نشر واحد على الأقل)
  for (const change of [{ description: '' }, { description: 'قصير' }, { internal: false }]) {
    assert.deepEqual(answer(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${draft}`, change)), [400, rules.RECRUITMENT_PUBLISH_NEEDS], JSON.stringify(change))
  }
  expectStatus(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${draft}`, { internal: false, external: true }), 200)
  // نفس الحالة تاني: ولا تغيير ولا سطر تدقيق
  expectStatus(await setStatus(users.recruiterA, draft, 'PUBLISHED'), 200)
  assert.equal(await audits('RECRUITMENT_JOB_STATUS') - logged, 1)
  // إيقاف ورجوع للنشر: تاريخ أول نشر زي ما هو
  assert.equal(expectStatus(await setStatus(users.recruiterA, draft, 'PAUSED'), 200).status, 'PAUSED')
  const again = expectStatus(await setStatus(users.recruiterA, draft, 'PUBLISHED'), 200)
  assert.equal(again.publishedAt, published.publishedAt)
  // القفل نهائي: لا تعديل ولا فتح
  const closed = expectStatus(await setStatus(users.recruiterA, draft, 'CLOSED'), 200)
  assert.deepEqual([closed.status, typeof closed.closedAt], ['CLOSED', 'string'])
  assert.deepEqual(answer(await request(users.recruiterA, 'PATCH', `/recruitment/jobs/${draft}`, { openings: 5 })), [400, rules.RECRUITMENT_JOB_CLOSED])
  for (const next of ['PUBLISHED', 'PAUSED', 'DRAFT']) assert.deepEqual(answer(await setStatus(users.recruiterA, draft, next)), [400, rules.RECRUITMENT_JOB_CLOSED], next)
  assert.equal(await audits('RECRUITMENT_JOB_STATUS') - logged, 4)
  // مسودة بتتقفل من غير نشر
  assert.equal(expectStatus(await setStatus(users.recruiterA, job, 'CLOSED'), 200).status, 'CLOSED')

  // الموديول اتقفل: المسارات مش موجودة، ونوع الطلب مش بيتقدّم
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try {
    assert.equal((await request(users.recruiterA, 'GET', '/recruitment/jobs')).status, 404)
    assert.notEqual((await ask(users.fin, good)).status, 201)
    assert.equal(expectStatus(await request(users.fin, 'GET', '/requests/types'), 200).some(row => row.code === 'RECRUITMENT_REQUISITION'), false)
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }
  assert.equal((await list(users.recruiterA)).jobs.length, 4)
})
