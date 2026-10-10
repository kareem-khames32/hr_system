'use strict'
// B3.3-أ: المرشح على وظيفة شاغرة على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_candidate_apps_test_<16 hex>)، عبر HTTP بتوكنات
// موقّعة محليًا ومن غير كلمات مرور. ولا رسالة بريد حقيقية.
//  CA-01) إضافة مرشح على وظيفة: المسمى والفرع من الوظيفة؛ الوظيفة برّه نطاق الحساب = غير موجودة؛ المسودة والمقفولة مرفوضين؛ فحص التكرار
//         (موبايل بصيغ مختلفة، بريد، هوية) = 409 ومن غير صف؛ والإضافة من غير وظيفة زي ما هي؛ وقايمة المرشحين والوظائف بتعرض الربط والعدد.
//  CA-02) «وظائف داخلية»: الموظف بيشوف المنشور داخليًا في فرعه الحالي بس (من غير نطاق الراتب)، وبيقدّم مرة واحدة من بيانات ملفه؛ وظيفة
//         فرع تاني أو خارجية بس أو موقوفة = غير موجودة؛ حساب من غير موظف أو موظف منتهي مابيقدّمش؛ والموظف اللي اتنقل بيتحكم بفرعه الحالي.
//  CA-03) الموديول المقفول بيقفل المسارات، ومن غير دخول 401.
//  CA-04) (ب) صفحة الوظائف العامة: الميزة المقفولة = 404؛ والمفتوحة بتعرض المنشور «خارجي» بس، من غير راتب ولا قسم ولا سبب.
//  CA-05) (ب) التقديم من اللينك: القيم والموافقة، والسيرة الذاتية بنوعها الحقيقي (PDF/Word بس)، والمرشح بيتعمل على الوظيفة بمصدره وموافقته
//         وملفه؛ المكرر بياخد نفس الرد من غير صف ولا ملف؛ وظيفة مش منشورة خارجيًا = غير موجودة؛ والحد بالعنوان 429.
//  CA-06) (ب) السيرة الذاتية بتتقري بحكم المرشح: مسؤول توظيف فرعه 200، فرع تاني 404، ومن غير الصلاحية 403.
//  CA-14) (B3.5-ج) أرقام التوظيف: بنطاق فروع الحساب، ومتطابقة مع الصفوف (العروض، المراحل، المصادر، الوظائف المفتوحة، المدد).
//  CA-13) (B3.5-ب) التعيين من العرض: العرض المقبول مع المرشح في القايمة؛ والوظيفة بتتقفل لما عدد المُعيَّنين عليها يكمل (مرة واحدة، بسطر تدقيق).
//  CA-11) (B3.5-أ) عرض العمل: القيم، ونطاق المرشح، وعرض مفتوح واحد، والتحذير لما الراتب برّه نطاق الوظيفة، والاعتماد بصلاحيته ولغير اللي عمله،
//         والإرجاع بسبب، والإرسال بلينك برمز (بصمته بس المتخزّنة).
//  CA-12) (B3.5-أ) رد المرشح: من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش.
//  CA-08) (B3.4-ب) تحديد مقابلة: القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة (.ics) بالبريد بعد ثبوت المعاملة.
//  CA-09) (B3.4-ب) بطاقات التقييم: المحاور بيسلّم بطاقته مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم؛ وبيقرا سيرة المرشح وهو محاور بس.
//  CA-10) (B3.4-ب) قفل المقابلة وإلغاؤها وملف الدعوة.
//  CA-07) (B3.4-أ) نقل المراحل: كل نقل سطر في السجل (من، لـ، السبب، مين)، ونفس المرحلة من غير سطر؛ النقل الجماعي كلهم أو ولا واحد (مرشح برّه
//         النطاق أو مُعيَّن بيوقف الكل)؛ السجل بنطاق المرشح واسم اللي نقل بنطاق القارئ؛ والتعديل بيكتب الخانات المبعوتة بس.
// Run (من api/): node --test test/candidate-applications.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_candidate_apps_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_candidate_apps_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-candidate-apps-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/recruitment/candidate-applications')
const careers = require('../src/recruitment/careers')
let app, master, ds, base, modules, created = false, employeeNumber = 0
const org = {}, users = {}, emps = {}, jobs = {}

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
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(payloadOf(user))}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const answer = response => [response.status, messageOf(response)]
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `CA${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف التقديم ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@candidate-apps.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const count = async table => Number((await query(`SELECT COUNT(*) AS [n] FROM [${table}]`))[0].n)
const job = (extra = {}) => repo('RecruitmentJob').save({ title: 'محاسب', branchId: org.branchA.id, departmentId: org.finance.id, openings: 2, reason: null, salaryFrom: '7000.00', salaryTo: '9000.00',
  startDate: null, description: 'محاسب عام لقسم المالية', requirements: 'خبرة سنتين', status: 'PUBLISHED', internal: true, external: false, requestId: null, createdByUserId: 0,
  publishedAt: new Date(), closedAt: null, createdAt: new Date(), ...extra })
const add = (user, body) => request(user, 'POST', '/candidates', body)
const openings = async user => expectStatus(await request(user, 'GET', '/recruitment/openings'), 200)
const apply = (user, id, body = {}) => request(user, 'POST', `/recruitment/openings/${id}/apply`, body)
// (ب) من غير دخول
const pdf = () => Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\n%%EOF\n')
const feature = on => request(users.admin, 'PUT', '/modules/features/recruitment.public_careers', { enabled: on })
const publicGet = route => request(null, 'GET', route)
async function submit(jobId, fields, file) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, String(value))
  if (file) form.append('cv', new Blob([file.bytes], { type: file.type ?? 'application/pdf' }), file.name)
  const response = await fetch(`${base}/careers/jobs/${jobId}/apply`, { method: 'POST', body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const person = (extra = {}) => ({ fullName: 'متقدّم من اللينك', email: 'link@applicant.invalid', phone: '+966 55 000 1111', consent: 'true', ...extra })
const storedFiles = () => fs.readdirSync(uploads, { recursive: true }).filter(name => /\.(pdf|docx?|png)$/.test(String(name))).length

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

  org.branchA = await repo('Branch').save({ code: 'CA_A', name: 'فرع التقديم أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'CA_B', name: 'فرع التقديم ب السري', country: 'SA' })
  org.finance = await repo('Department').save({ name: 'قسم المالية', code: 'CA_FIN', branchId: org.branchA.id })
  emps.a1 = await employee({ email: 'a1@work.invalid', phone: '0501112223' })
  emps.a2 = await employee({ email: null, personalEmail: 'a2@home.invalid', phone: '0503334445' })
  emps.b1 = await employee({ branchId: org.branchB.id, email: 'b1@work.invalid', phone: '0505556667' })
  emps.gone = await employee({ status: 'terminated', isActive: false, email: 'gone@work.invalid' })
  users.admin = await repo('User').save({ email: 'admin@candidate-apps.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.recruiterA = await account('recruiter-a', ['candidates.manage'])
  users.recruiterB = await account('recruiter-b', ['candidates.manage'], { branchId: org.branchB.id })
  users.a1 = await account('a1', [], { employeeId: emps.a1.id })
  users.a2 = await account('a2', [], { employeeId: emps.a2.id })
  users.b1 = await account('b1', [], { branchId: org.branchB.id, employeeId: emps.b1.id })
  users.gone = await account('gone', [], { employeeId: emps.gone.id })
  users.nobody = await account('nobody', [])
  jobs.open = await job()
  jobs.paused = await job({ status: 'PAUSED' })
  jobs.draft = await job({ status: 'DRAFT', publishedAt: null })
  jobs.closed = await job({ status: 'CLOSED', closedAt: new Date() })
  jobs.externalOnly = await job({ internal: false, external: true })
  jobs.branchB = await job({ branchId: org.branchB.id, departmentId: null, title: 'وظيفة فرع ب' })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-candidate-apps-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'candidate applications fixture cleanup failed')
})

test('CA-01: مرشح على وظيفة — المسمى والفرع منها، والنطاق، والحالة، وفحص التكرار، والإضافة من غير وظيفة زي ما هي', async () => {
  const person = { fullName: 'مرشح أول', email: 'First@Mail.invalid', phone: '+966 50 123 4567' }
  const made = expectStatus(await add(users.recruiterA, { ...person, jobId: jobs.open.id, positionTitle: 'اسم بالإيد', branchId: org.branchB.id, nationalId: 'a12-345 6', source: ' لينكد  إن ' }), 201)
  assert.deepEqual([made.positionTitle, made.branchId, made.stage], ['محاسب', org.branchA.id, 'applied'], 'المسمى والفرع من الوظيفة مش من العميل')
  const row = await repo('CandidateApplication').findOneByOrFail({ candidateId: made.id })
  assert.deepEqual([row.jobId, row.source, row.nationalId, row.applicantEmployeeId, row.cvFileId, row.consentAt], [jobs.open.id, 'لينكد إن', 'A123456', null, null, null])
  // من غير المسمى خالص (المسمى مطلوب للمرشح من غير وظيفة بس)، والمصدر الافتراضي «يدوي»
  const second = expectStatus(await add(users.recruiterA, { fullName: 'مرشح تاني', phone: '0509998887', jobId: jobs.paused.id }), 201)
  assert.deepEqual([second.positionTitle, (await repo('CandidateApplication').findOneByOrFail({ candidateId: second.id })).source], ['محاسب', 'يدوي'])

  // فحص التكرار على نفس الوظيفة: الموبايل بصيغة تانية، البريد بحروف تانية، الهوية بشكل تاني — وعلى وظيفة تانية مسموح
  const before = [await count('candidates'), await count('candidate_applications')]
  for (const [body, label] of [
    [{ fullName: 'نفس الموبايل', phone: '0501234567' }, 'موبايل'], [{ fullName: 'نفس الموبايل بأرقام عربية', phone: '٠٥٠١٢٣٤٥٦٧' }, 'أرقام عربية'],
    [{ fullName: 'نفس البريد', email: 'first@mail.INVALID' }, 'بريد'], [{ fullName: 'نفس الهوية', nationalId: 'A123456' }, 'هوية'],
  ]) assert.deepEqual(answer(await add(users.recruiterA, { ...body, jobId: jobs.open.id })), [409, rules.CANDIDATE_DUPLICATE], label)
  assert.deepEqual([await count('candidates'), await count('candidate_applications')], before, 'المرفوض ماعملش صف')
  expectStatus(await add(users.recruiterA, { fullName: 'نفس الشخص على وظيفة تانية', phone: '0501234567', jobId: jobs.paused.id }), 201)

  // النطاق والحالة والقيم
  for (const [user, body, status, message] of [
    [users.recruiterB, { jobId: jobs.open.id }, 404, 'الوظيفة غير موجودة'], [users.recruiterA, { jobId: jobs.branchB.id }, 404, 'الوظيفة غير موجودة'],
    [users.recruiterA, { jobId: 987654 }, 404, 'الوظيفة غير موجودة'], [users.recruiterA, { jobId: jobs.draft.id }, 400, rules.CANDIDATE_JOB_NOT_OPEN],
    [users.recruiterA, { jobId: jobs.closed.id }, 400, rules.CANDIDATE_JOB_NOT_OPEN], [users.recruiterA, { jobId: jobs.open.id, nationalId: '12' }, 400, rules.CANDIDATE_NATIONAL_ID],
    [users.recruiterA, { jobId: jobs.open.id, nationalId: 77 }, 400, rules.CANDIDATE_NATIONAL_ID], [users.recruiterA, { jobId: jobs.open.id, source: 'م'.repeat(61) }, 400, 'مصدر المرشح لا يتجاوز 60 حرف'],
  ]) assert.deepEqual(answer(await add(user, { fullName: 'مرشح مرفوض', phone: '0507770000', ...body })), [status, message], JSON.stringify(body))
  assert.equal((await add(users.nobody, { fullName: 'من غير صلاحية', jobId: jobs.open.id })).status, 403)

  // من غير وظيفة: زي الأول بالحرف (المسمى مطلوب، ومن غير صف تقديم)، والمصدر والهوية للمرشح على وظيفة بس
  assert.equal((await add(users.recruiterA, { fullName: 'من غير مسمى' })).status, 400)
  assert.deepEqual(answer(await add(users.recruiterA, { fullName: 'هوية من غير وظيفة', positionTitle: 'سائق', nationalId: 'A999999' })), [400, 'المصدر ورقم الهوية للمرشح على وظيفة شاغرة بس'])
  const free = expectStatus(await add(users.recruiterA, { fullName: 'مرشح حر', positionTitle: 'سائق', phone: '0501234567' }), 201)
  assert.deepEqual([free.positionTitle, free.branchId, await repo('CandidateApplication').count({ where: { candidateId: free.id } })], ['سائق', org.branchA.id, 0])

  // القايمة: وظيفة كل مرشح ومصدره، والحر من غير وظيفة؛ وقايمة الوظائف بعدد المتقدمين
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/candidates'), 200)
  const byId = Object.fromEntries(listed.map(item => [item.id, item]))
  assert.deepEqual(byId[made.id].application, { jobId: jobs.open.id, jobCode: `J-${String(jobs.open.id).padStart(4, '0')}`, source: 'لينكد إن', nationalId: 'A123456', internal: false,
    cvFileId: null, consentAt: null })
  assert.equal(byId[free.id].application, null)
  const board = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/jobs'), 200).jobs
  assert.deepEqual([board.find(item => item.id === jobs.open.id).applicants, board.find(item => item.id === jobs.paused.id).applicants, board.find(item => item.id === jobs.draft.id).applicants], [1, 2, 0])
  assert.equal(expectStatus(await request(users.recruiterB, 'GET', '/candidates'), 200).some(item => item.id === made.id), false, 'مرشح فرع تاني مش في قايمة فرع ب')
})

test('CA-02: وظائف داخلية — المنشور داخليًا في فرع الموظف الحالي بس، والتقديم مرة واحدة من بيانات الملف، والحكم بالفرع الحالي', async () => {
  const mine = await openings(users.a1)
  assert.deepEqual([mine.available, mine.canApply, mine.jobs.map(item => item.id)], [true, true, [jobs.open.id]], 'الموقوفة والمسودة والمقفولة والخارجية بس وفرع ب مش ظاهرين')
  const [shown] = mine.jobs
  assert.deepEqual([shown.title, shown.departmentName, shown.openings, shown.description, shown.requirements, shown.applied], ['محاسب', 'قسم المالية', 2, 'محاسب عام لقسم المالية', 'خبرة سنتين', false])
  assert.equal('salaryFrom' in shown || 'salaryTo' in shown || 'reason' in shown, false, 'نطاق الراتب وسبب الاحتياج مش للموظف')
  assert.deepEqual((await openings(users.b1)).jobs.map(item => item.id), [jobs.branchB.id])
  assert.deepEqual([(await openings(users.nobody)).canApply, (await openings(users.gone)).canApply, (await openings(users.nobody)).jobs], [false, false, []])

  // اللي مش مفتوح للموظف زي اللي مش موجود
  for (const target of [jobs.paused, jobs.draft, jobs.closed, jobs.externalOnly, jobs.branchB, { id: 987654 }]) {
    assert.deepEqual(answer(await apply(users.a1, target.id)), [404, 'الوظيفة غير موجودة'], String(target.id))
  }
  assert.deepEqual(answer(await apply(users.nobody, jobs.open.id)), [403, 'حسابك مش مربوط بملف موظف — التقديم الداخلي للموظفين'])
  assert.equal((await apply(users.gone, jobs.open.id)).status, 403)
  assert.equal((await apply(users.a1, jobs.open.id, { note: 7 })).status, 400)
  assert.equal((await apply(users.a1, jobs.open.id, { note: 'م'.repeat(1001) })).status, 400)

  const before = await count('candidates')
  assert.deepEqual(expectStatus(await apply(users.a1, jobs.open.id, { note: '  مهتم بالوظيفة  ' }), 200), { jobId: jobs.open.id, applied: true })
  const application = await repo('CandidateApplication').findOneByOrFail({ jobId: jobs.open.id, applicantEmployeeId: emps.a1.id })
  const candidate = await repo('Candidate').findOneByOrFail({ id: application.candidateId })
  assert.deepEqual([candidate.fullName, candidate.email, candidate.phone, candidate.positionTitle, candidate.branchId, candidate.stage, candidate.notes, application.source],
    [emps.a1.fullName, 'a1@work.invalid', '0501112223', 'محاسب', org.branchA.id, 'applied', 'مهتم بالوظيفة', 'داخلي'])
  assert.equal((await openings(users.a1)).jobs[0].applied, true)
  assert.deepEqual(answer(await apply(users.a1, jobs.open.id)), [409, rules.CANDIDATE_ALREADY_APPLIED])
  // من غير بريد عمل: البريد الشخصي؛ ومسؤول التوظيف شايفه «داخلي» من غير رقم الموظف
  expectStatus(await apply(users.a2, jobs.open.id), 200)
  const other = await repo('Candidate').findOneByOrFail({ id: (await repo('CandidateApplication').findOneByOrFail({ jobId: jobs.open.id, applicantEmployeeId: emps.a2.id })).candidateId })
  assert.equal(other.email, 'a2@home.invalid')
  assert.equal(await count('candidates'), before + 2)
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/candidates'), 200).find(item => item.id === candidate.id)
  assert.deepEqual([listed.application.internal, listed.application.source, 'applicantEmployeeId' in listed.application], [true, 'داخلي', false])
  // مسؤول التوظيف مايضيفش نفس الموظف يدوي على نفس الوظيفة (نفس الموبايل)
  assert.deepEqual(answer(await add(users.recruiterA, { fullName: 'تكرار للمتقدم الداخلي', phone: '+966501112223', jobId: jobs.open.id })), [409, rules.CANDIDATE_DUPLICATE])

  // الموظف اتنقل لفرع ب: الحكم بفرعه الحالي — وظيفة فرعه القديم مابقتش موجودة له، ووظيفة فرع ب اتفتحت
  await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchB.id })
  try {
    assert.deepEqual((await openings(users.a2)).jobs.map(item => item.id), [jobs.branchB.id])
    await repo('Employee').update({ id: emps.b1.id }, { branchId: org.branchA.id })
    assert.deepEqual(answer(await apply(users.b1, jobs.branchB.id)), [404, 'الوظيفة غير موجودة'], 'التوكن لسه بفرع ب، والملف بقى في فرع أ')
  } finally {
    await repo('Employee').update({ id: emps.a2.id }, { branchId: org.branchA.id })
    await repo('Employee').update({ id: emps.b1.id }, { branchId: org.branchB.id })
  }
})

test('CA-03: الموديول المقفول بيقفل المسارات، ومن غير دخول 401', async () => {
  assert.equal((await request(null, 'GET', '/recruitment/openings')).status, 401)
  assert.equal((await request(null, 'POST', `/recruitment/openings/${jobs.open.id}/apply`, {})).status, 401)
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try {
    assert.equal((await request(users.a1, 'GET', '/recruitment/openings')).status, 404)
    assert.equal((await apply(users.b1, jobs.branchB.id)).status, 404)
    assert.equal((await add(users.recruiterA, { fullName: 'والموديول مقفول', jobId: jobs.open.id })).status, 404)
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }
  expectStatus(await apply(users.b1, jobs.branchB.id), 200)
})

test('CA-04: صفحة الوظائف العامة — الميزة المقفولة 404، والمفتوحة بتعرض المنشور «خارجي» بس ومن غير راتب ولا قسم', async () => {
  // الافتراضي مقفول: المسارات التلاتة زي اللي مش موجودة
  assert.equal((await publicGet('/careers/jobs')).status, 404)
  assert.equal((await publicGet('/careers/jobs/' + jobs.externalOnly.id)).status, 404)
  assert.equal((await submit(jobs.externalOnly.id, person())).status, 404)
  assert.equal(await repo('Candidate').count({ where: { email: 'link@applicant.invalid' } }), 0)
  expectStatus(await feature(true), 200); modules.invalidate()
  jobs.both = await job({ internal: true, external: true, title: 'مندوب مبيعات', departmentId: null })
  jobs.externalPaused = await job({ internal: false, external: true, status: 'PAUSED' })
  const listed = expectStatus(await publicGet('/careers/jobs'), 200).jobs
  assert.deepEqual(listed.map(item => item.id).sort((a, b) => a - b), [jobs.externalOnly.id, jobs.both.id], 'الداخلي بس، والموقوف، والمسودة، والمقفول مش ظاهرين')
  const shown = expectStatus(await publicGet('/careers/jobs/' + jobs.externalOnly.id), 200)
  assert.deepEqual(Object.keys(shown).sort(), ['branchName', 'code', 'description', 'id', 'openings', 'publishedAt', 'requirements', 'startDate', 'title'])
  assert.deepEqual([shown.title, shown.branchName, shown.description], ['محاسب', 'فرع التقديم أ', 'محاسب عام لقسم المالية'])
  for (const hidden of [jobs.open, jobs.paused, jobs.draft, jobs.closed, jobs.externalPaused, { id: 987654 }]) assert.equal((await publicGet('/careers/jobs/' + hidden.id)).status, 404, String(hidden.id))
  // الموديول مقفول = الميزة مقفولة
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try { assert.equal((await publicGet('/careers/jobs')).status, 404) } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }
  // الميزة بترجع مفتوحة مع الموديول (الإعداد محفوظ)، وإلا نفتحها
  if ((await publicGet('/careers/jobs')).status !== 200) { expectStatus(await feature(true), 200); modules.invalidate() }
})

test('CA-05: التقديم من اللينك — القيم والموافقة والسيرة الذاتية، والمكرر بنفس الرد من غير صف، وغير المنشور خارجيًا غير موجود، والحد 429', async () => {
  const service = app.get(require('../src/recruitment/careers.service').CareersService)
  service.limiter.reset()
  const target = jobs.externalOnly.id
  const before = [await count('candidates'), await count('candidate_applications'), await count('stored_files'), storedFiles()]
  for (const [fields, message] of [
    [person({ fullName: 'ab' }), careers.CAREERS_NAME], [person({ fullName: undefined }), careers.CAREERS_NAME], [person({ email: 'not-an-email' }), careers.CAREERS_EMAIL],
    [person({ phone: '12345' }), careers.CAREERS_PHONE], [person({ phone: 'call me' }), careers.CAREERS_PHONE], [person({ consent: undefined }), careers.CAREERS_CONSENT],
    [person({ consent: 'false' }), careers.CAREERS_CONSENT], [person({ nationalId: '12' }), rules.CANDIDATE_NATIONAL_ID], [person({ source: 'م'.repeat(61) }), 'مصدر المرشح لا يتجاوز 60 حرف'],
  ]) assert.deepEqual(answer(await submit(target, fields)), [400, message], JSON.stringify(fields))
  // السيرة الذاتية: النوع الحقيقي PDF أو Word بس
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001a5f645400000000049454e44ae426082', 'hex')
  assert.match(messageOf(await submit(target, person(), { bytes: png, name: 'photo.png', type: 'image/png' })), /مش مسموح/)
  assert.equal((await submit(target, person(), { bytes: Buffer.from('<html><script>alert(1)</script></html>'), name: 'cv.pdf' })).status, 400)
  assert.equal((await submit(target, person(), { bytes: pdf(), name: 'cv.docx' })).status, 400, 'الامتداد لازم يطابق المحتوى')
  assert.deepEqual([await count('candidates'), await count('candidate_applications'), await count('stored_files'), storedFiles()], before, 'المرفوض ماكتبش صف ولا ملف')
  for (const hidden of [jobs.open, jobs.paused, jobs.externalPaused, { id: 987654 }]) assert.deepEqual(answer(await submit(hidden.id, person(), { bytes: pdf(), name: 'cv.pdf' })), [404, 'الوظيفة غير موجودة'])
  assert.deepEqual([await count('candidates'), storedFiles()], [before[0], before[3]], 'ولا الوظيفة اللي مش مفتوحة')

  // المقبول: مرشح على الوظيفة بمصدره وموافقته وملفه، والرد مافيهوش غير «اتستلم»
  assert.deepEqual(expectStatus(await submit(target, person({ nationalId: 'b77-88 99', source: 'لينكد إن' }), { bytes: pdf(), name: 'سيرتي.pdf' }), 200), { received: true })
  const candidate = await repo('Candidate').findOneByOrFail({ email: 'link@applicant.invalid' })
  const application = await repo('CandidateApplication').findOneByOrFail({ candidateId: candidate.id })
  const file = await repo('StoredFile').findOneByOrFail({ id: application.cvFileId })
  assert.deepEqual([candidate.fullName, candidate.phone, candidate.positionTitle, candidate.branchId, candidate.stage], ['متقدّم من اللينك', '+966 55 000 1111', 'محاسب', org.branchA.id, 'applied'])
  assert.deepEqual([application.jobId, application.source, application.nationalId, application.applicantEmployeeId, application.consentAt instanceof Date],
    // B-ADD.6: المصدر من اللينك العام من قايمة معروفة — «لينكد إن» بيتسجّل باسمه الموحد
    [target, 'LinkedIn', 'B778899', null, true])
  assert.deepEqual([file.entityType, file.entityId, file.mime, file.originalName, file.employeeId ?? null, file.uploadedBy ?? null], ['candidate_cv', candidate.id, 'application/pdf', 'سيرتي.pdf', null, null])
  assert.equal(storedFiles(), before[3] + 1)
  // من غير سيرة ذاتية ومن غير مصدر: مقبول، والمصدر «لينك عام»
  expectStatus(await submit(target, person({ email: 'second@applicant.invalid', phone: '0551112222' })), 200)
  const plain = await repo('CandidateApplication').findOneByOrFail({ candidateId: (await repo('Candidate').findOneByOrFail({ email: 'second@applicant.invalid' })).id })
  assert.deepEqual([plain.source, plain.cvFileId], ['لينك عام', null])

  // المكرر (نفس البريد، أو نفس الموبايل بصيغة تانية، أو نفس الهوية): نفس الرد بالحرف، ومن غير صف ولا ملف
  service.limiter.reset() // الاختبار نفسه عدّى حد العنوان الواحد (20 في 10 دقايق) بالمحاولات اللي فوق
  const mid = [await count('candidates'), await count('candidate_applications'), await count('stored_files'), storedFiles()]
  for (const fields of [person({ fullName: 'نفس البريد' }), person({ email: 'x1@applicant.invalid', phone: '0550001111' }), person({ email: 'x2@applicant.invalid', phone: '0559990000', nationalId: 'B778899' })]) {
    assert.deepEqual(expectStatus(await submit(target, fields, { bytes: pdf(), name: 'again.pdf' }), 200), { received: true })
  }
  assert.deepEqual([await count('candidates'), await count('candidate_applications'), await count('stored_files'), storedFiles()], mid, 'المكرر ماعملش صف وملفه اتشال')
  // ونفس الشخص على وظيفة تانية مسموح
  expectStatus(await submit(jobs.both.id, person()), 200)

  // الحد بالعنوان: المحاولة بتتحسب حتى المرفوضة، وبعد الحد 429 من غير أي كتابة
  service.limiter.reset()
  const real = service.limiter
  service.limiter = new careers.AttemptLimiter(2, 100, 60000)
  try {
    assert.equal((await submit(target, person({ email: 'bad' }))).status, 400)
    expectStatus(await submit(target, person({ email: 'third@applicant.invalid', phone: '0553334444' })), 200)
    assert.deepEqual(answer(await submit(target, person({ email: 'fourth@applicant.invalid', phone: '0555556666' }))), [429, careers.CAREERS_TOO_MANY])
    assert.equal(await repo('Candidate').count({ where: { email: 'fourth@applicant.invalid' } }), 0)
  } finally { service.limiter = real }
})

test('CA-06: السيرة الذاتية بتتقري بحكم المرشح — مسؤول توظيف فرعه بس', async () => {
  const candidate = await repo('Candidate').findOneByOrFail({ email: 'link@applicant.invalid' })
  const application = await repo('CandidateApplication').findOneByOrFail({ candidateId: candidate.id })
  const read = async user => (await fetch(base + '/files/' + application.cvFileId, { headers: user ? { Authorization: 'Bearer ' + jwt.sign(payloadOf(user)) } : {} })).status
  assert.deepEqual([await read(users.recruiterA), await read(users.recruiterB), await read(users.a1), await read(users.nobody), await read(null)], [200, 404, 403, 403, 401])
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/candidates'), 200).find(item => item.id === candidate.id)
  assert.deepEqual([listed.application.cvFileId, typeof listed.application.consentAt, listed.application.source], [application.cvFileId, 'string', 'LinkedIn'])
  // ملف بتصنيف السيرة الذاتية بس مش ملف تقديم المرشح ده: غير موجود حتى لمسؤول التوظيف
  const stray = await repo('StoredFile').save({ originalName: 'stray.pdf', storedName: 'none/stray.pdf', mime: 'application/pdf', size: 10, entityType: 'candidate_cv', entityId: candidate.id })
  assert.equal((await fetch(base + '/files/' + stray.id, { headers: { Authorization: 'Bearer ' + jwt.sign(payloadOf(users.recruiterA)) } })).status, 404)
  // المرشح اتنقل لفرع تاني (وظيفته في فرع ب): مسؤول فرع أ مابقاش يقراه
  await repo('Candidate').update({ id: candidate.id }, { branchId: org.branchB.id })
  try { assert.deepEqual([await read(users.recruiterA), await read(users.recruiterB)], [404, 200]) } finally { await repo('Candidate').update({ id: candidate.id }, { branchId: org.branchA.id }) }
})

test('CA-07: نقل المراحل — كل نقل سطر في السجل، والجماعي كلهم أو ولا واحد، والسجل بنطاق المرشح واسم اللي نقل بنطاق القارئ', async () => {
  const stages = require('../src/recruitment/candidate-stages.service')
  const make = (fullName, extra = {}) => repo('Candidate').save({ fullName, positionTitle: 'محاسب', branchId: org.branchA.id, stage: 'applied', ...extra })
  const one = await make('مرشح للنقل 1'), two = await make('مرشح للنقل 2'), three = await make('مرشح للنقل 3')
  const foreign = await make('مرشح فرع ب', { branchId: org.branchB.id }), hired = await make('مرشح متعيّن', { stage: 'hired' })
  const stageOf = async row => (await repo('Candidate').findOneByOrFail({ id: row.id })).stage
  const linesOf = async row => (await repo('CandidateStageLog').find({ where: { candidateId: row.id }, order: { id: 'ASC' } })).map(line => [line.fromStage, line.toStage, line.reason, line.byUserId])
  const move = (user, body) => request(user, 'POST', '/candidates/stage', body)
  const patchOne = (user, row, body) => request(user, 'PATCH', '/candidates/' + row.id, body)

  // النقل من التعديل القايم: بيتسجّل بسببه، ونفس المرحلة من غير سطر، والسبب لوحده مرفوض
  const moved = expectStatus(await patchOne(users.recruiterA, one, { stage: 'screening', reason: '  مناسب  مبدئيًا ' }), 200)
  assert.deepEqual([moved.stage, await linesOf(one)], ['screening', [['applied', 'screening', 'مناسب مبدئيًا', users.recruiterA.id]]])
  expectStatus(await patchOne(users.recruiterA, one, { stage: 'screening' }), 200)
  assert.equal((await linesOf(one)).length, 1, 'نفس المرحلة من غير سطر')
  assert.deepEqual(answer(await patchOne(users.recruiterA, one, { reason: 'سبب من غير نقل' })), [400, 'سبب النقل بيتبعت مع نقل المرحلة'])
  assert.deepEqual(answer(await patchOne(users.recruiterA, one, { stage: 'interview', reason: 'س'.repeat(301) })), [400, 'سبب النقل لا يتجاوز 300 حرف'])
  // التعديل بيكتب الخانات المبعوتة بس: مرحلة اتغيّرت من طلب تاني مابترجعش بتعديل ملاحظة
  await repo('Candidate').update({ id: two.id }, { stage: 'interview' })
  const noted = expectStatus(await patchOne(users.recruiterA, two, { notes: 'ملاحظة بس' }), 200)
  assert.deepEqual([noted.notes, noted.stage, (await linesOf(two)).length], ['ملاحظة بس', 'interview', 0])
  await repo('Candidate').update({ id: two.id }, { stage: 'applied' })

  // النقل الجماعي: كلهم أو ولا واحد
  for (const [body, status, message] of [
    [{ ids: [one.id, two.id, foreign.id], stage: 'interview' }, 404, stages.CANDIDATE_NOT_FOUND], [{ ids: [one.id, hired.id, two.id], stage: 'interview' }, 400, stages.CANDIDATE_HIRED],
    [{ ids: [one.id, 987654], stage: 'interview' }, 404, stages.CANDIDATE_NOT_FOUND], [{ ids: [], stage: 'interview' }, 400, stages.STAGE_MOVE_IDS],
    [{ ids: 'all', stage: 'interview' }, 400, stages.STAGE_MOVE_IDS], [{ ids: [one.id, 1.5], stage: 'interview' }, 400, stages.STAGE_MOVE_IDS],
    [{ ids: Array.from({ length: 201 }, (_, index) => index + 1), stage: 'interview' }, 400, stages.STAGE_MOVE_IDS], [{ ids: [one.id], stage: 'done' }, 400, 'مرحلة غير صالحة'],
    [{ ids: [one.id] }, 400, 'مرحلة غير صالحة'], [{ ids: [one.id], stage: 'interview', reason: 7 }, 400, 'سبب النقل نص'],
  ]) assert.deepEqual(answer(await move(users.recruiterA, body)), [status, message], JSON.stringify(body).slice(0, 80))
  assert.deepEqual([await stageOf(one), await stageOf(two), await stageOf(three), (await linesOf(two)).length], ['screening', 'applied', 'applied', 0], 'المرفوض مانقلش حد')
  assert.equal((await move(users.nobody, { ids: [one.id], stage: 'interview' })).status, 403)
  // التكرار في القايمة بيتحسب مرة، واللي في نفس المرحلة مابيتعدّش
  assert.deepEqual(expectStatus(await move(users.recruiterA, { ids: [three.id, one.id, two.id, one.id], stage: 'screening', reason: 'فرز الأسبوع' }), 200), { moved: 2 })
  assert.deepEqual([await stageOf(one), await stageOf(two), await stageOf(three)], ['screening', 'screening', 'screening'])
  assert.deepEqual([(await linesOf(one)).length, await linesOf(two)], [1, [['applied', 'screening', 'فرز الأسبوع', users.recruiterA.id]]])
  // مدير النظام بيرفض واحد بسبب
  assert.deepEqual(expectStatus(await move(users.admin, { ids: [two.id], stage: 'rejected', reason: 'مش مناسب للوظيفة' }), 200), { moved: 1 })

  // السجل: الأحدث أولًا بتسميات المراحل؛ واسم اللي نقل لو حسابه في نطاق القارئ (مدير النظام من غير فرع = مخفي عن مسؤول الفرع)
  const history = expectStatus(await request(users.recruiterA, 'GET', '/candidates/' + two.id + '/history'), 200)
  assert.deepEqual([history.available, history.lines.map(line => [line.fromLabel, line.toLabel, line.reason, line.byName])],
    [true, [['فرز', 'مرفوض', 'مش مناسب للوظيفة', null], ['تقدّم', 'فرز', 'فرز الأسبوع', 'حساب recruiter-a']]])
  const full = expectStatus(await request(users.admin, 'GET', '/candidates/' + two.id + '/history'), 200)
  assert.deepEqual(full.lines.map(line => line.byName), ['مدير النظام', 'حساب recruiter-a'])
  assert.deepEqual(answer(await request(users.recruiterB, 'GET', '/candidates/' + two.id + '/history')), [404, stages.CANDIDATE_NOT_FOUND])
  assert.equal((await request(users.nobody, 'GET', '/candidates/' + two.id + '/history')).status, 403)
  assert.deepEqual(expectStatus(await request(users.recruiterA, 'GET', '/candidates/' + three.id + '/history'), 200).lines.length, 1)
  // المُعيَّن مابيتنقلش من التعديل برضه
  assert.deepEqual(answer(await patchOne(users.recruiterA, hired, { stage: 'rejected' })), [400, stages.CANDIDATE_HIRED])
})

const interviewState = {}
const tomorrow = (hour = 10) => { const d = new Date(Date.now() + 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(hour).padStart(2, '0') + ':30' }
const scheduleInterview = (user, body) => request(user, 'POST', '/recruitment/interviews', body)
// بريد الاختبار: الإرسال متبدّل على النسخة نفسها (ولا رسالة حقيقية)، وبيتجمّع هنا
async function withMail(work) {
  const mail = app.get(require('../src/auth/mail.service').MailService), old = { configured: mail.isConfigured, send: mail.send }, sent = []
  assert.notEqual(mail.send, require('../src/auth/mail.service').MailService.prototype.send)
  mail.isConfigured = () => true
  mail.send = async message => { sent.push(message); if (String(message.to).startsWith('bounce')) throw new Error('fake bounce'); return { accepted: [message.to], rejected: [] } }
  try { return await work(sent) } finally { mail.isConfigured = old.configured; mail.send = old.send }
}

test('CA-08: تحديد مقابلة — القيم، ونطاق المرشح والمحاورين، والبطاقات الفاضية، والدعوة بالبريد', async () => {
  const rules = require('../src/recruitment/interview-rules')
  const candidate = await repo('Candidate').findOneByOrFail({ email: 'link@applicant.invalid' })
  const foreign = await repo('Candidate').save({ fullName: 'مرشح مقابلة فرع ب', positionTitle: 'محاسب', branchId: org.branchB.id, stage: 'applied' })
  const rejected = await repo('Candidate').save({ fullName: 'مرشح مرفوض', positionTitle: 'محاسب', branchId: org.branchA.id, stage: 'rejected' })
  const good = { candidateId: candidate.id, scheduledAt: tomorrow(), durationMinutes: 45, mode: 'VIDEO', location: ' https://meet.invalid/room ', notes: 'مقابلة أولى', interviewerEmployeeIds: [emps.a2.id, emps.a1.id] }
  const before = [await count('candidate_interviews'), await count('interview_scorecards')]
  for (const [change, status, message] of [
    [{ scheduledAt: '2020-01-01T10:00' }, 400, rules.INTERVIEW_TIME], [{ scheduledAt: 'بكرة' }, 400, rules.INTERVIEW_TIME], [{ scheduledAt: tomorrow().slice(0, 8) + '32T10:00' }, 400, rules.INTERVIEW_TIME],
    [{ durationMinutes: 10 }, 400, rules.INTERVIEW_DURATION], [{ durationMinutes: '45' }, 400, rules.INTERVIEW_DURATION], [{ mode: 'ZOOM' }, 400, rules.INTERVIEW_MODE],
    [{ interviewerEmployeeIds: [] }, 400, rules.INTERVIEW_PANEL], [{ interviewerEmployeeIds: [emps.a1.id, emps.a1.id] }, 400, rules.INTERVIEW_PANEL],
    [{ interviewerEmployeeIds: [emps.a1.id, emps.b1.id] }, 400, rules.INTERVIEW_PANEL_MEMBER], [{ interviewerEmployeeIds: [emps.gone.id] }, 400, rules.INTERVIEW_PANEL_MEMBER],
    [{ interviewerEmployeeIds: [987654] }, 400, rules.INTERVIEW_PANEL_MEMBER], [{ location: 'م'.repeat(301) }, 400, 'مكان المقابلة لا يتجاوز 300 حرف'],
    [{ candidateId: foreign.id }, 404, 'المرشح غير موجود'], [{ candidateId: 987654 }, 404, 'المرشح غير موجود'], [{ candidateId: rejected.id }, 400, rules.INTERVIEW_CANDIDATE_CLOSED],
  ]) assert.deepEqual(answer(await scheduleInterview(users.recruiterA, { ...good, ...change })), [status, message], JSON.stringify(change).slice(0, 70))
  assert.equal((await scheduleInterview(users.nobody, good)).status, 403)
  assert.deepEqual([await count('candidate_interviews'), await count('interview_scorecards')], before, 'المرفوض ماعملش مقابلة')

  // المقبول: المقابلة وبطاقتين فاضيين، والدعوة بعد ثبوت المعاملة (محاور ببريد عمل + المرشح؛ والمحاور اللي من غير بريد عمل من غير رسالة)
  const made = await withMail(async sent => {
    const body = expectStatus(await scheduleInterview(users.recruiterA, good), 201)
    assert.deepEqual(sent.map(message => message.to).sort(), ['a1@work.invalid', 'link@applicant.invalid'])
    assert.equal(body.invited, 2)
    const [attachment] = sent[0].attachments
    const ics = attachment.content.toString('utf8')
    assert.deepEqual([attachment.filename, /^text\/calendar/.test(attachment.contentType), ics.startsWith('BEGIN:VCALENDAR\r\n'), ics.includes('UID:interview-' + body.id + '@hr-system'),
      ics.includes('DTSTART:' + good.scheduledAt.replace(/[-:]/g, '') + '00'), ics.includes('METHOD:PUBLISH'), ics.endsWith('END:VCALENDAR\r\n')], ['interview.ics', true, true, true, true, true, true])
    assert.match(sent.find(message => message.to === 'link@applicant.invalid').text, /اتحدد لك موعد مقابلة/)
    assert.doesNotMatch(sent.find(message => message.to === 'link@applicant.invalid').text, /موظف التقديم/, 'رسالة المرشح مافيهاش أسماء المحاورين')
    return body
  })
  interviewState.first = made
  assert.deepEqual([made.candidateName, made.positionTitle, made.scheduledAt, made.durationMinutes, made.mode, made.modeLabel, made.location, made.status, made.statusLabel, made.cvFileId !== null],
    ['متقدّم من اللينك', 'محاسب', good.scheduledAt, 45, 'VIDEO', 'فيديو', 'https://meet.invalid/room', 'SCHEDULED', 'محددة', true])
  assert.deepEqual(made.scorecards.map(card => [card.interviewerName, card.submitted, card.rating, card.notes]), [[emps.a1.fullName, false, null, null], [emps.a2.fullName, false, null, null]])
  // بريد واقع لمستلم مابيرجّعش المقابلة
  await repo('Candidate').update({ id: candidate.id }, { email: 'bounce@applicant.invalid' })
  try {
    const second = await withMail(async () => expectStatus(await scheduleInterview(users.recruiterA, { ...good, scheduledAt: tomorrow(13), interviewerEmployeeIds: [emps.a1.id] }), 201))
    assert.equal(second.invited, 1); interviewState.second = second
  } finally { await repo('Candidate').update({ id: candidate.id }, { email: 'link@applicant.invalid' }) }
  // من غير بريد مضبوط: المقابلة بتتحدد ومن غير دعوات
  const quiet = expectStatus(await scheduleInterview(users.recruiterA, { ...good, scheduledAt: tomorrow(15), mode: 'ONSITE', location: undefined, notes: undefined, interviewerEmployeeIds: [emps.a2.id] }), 201)
  assert.deepEqual([quiet.invited, quiet.location, quiet.notes], [0, null, null]); interviewState.third = quiet

  // القايمة: مسؤول فرع المرشح بس، والنموذج بمرشحين ومحاورين نطاقه
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/interviews'), 200)
  assert.deepEqual([listed.available, listed.interviews.map(item => item.id).sort((a, b) => a - b)], [true, [made.id, interviewState.second.id, quiet.id]])
  assert.deepEqual(expectStatus(await request(users.recruiterB, 'GET', '/recruitment/interviews'), 200).interviews, [])
  assert.equal((await request(users.nobody, 'GET', '/recruitment/interviews')).status, 403)
  const form = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/interviews/form'), 200)
  assert.deepEqual([form.candidates.some(item => item.id === candidate.id), form.candidates.some(item => item.id === foreign.id || item.id === rejected.id),
    form.interviewers.some(item => item.id === emps.a1.id), form.interviewers.some(item => item.id === emps.b1.id || item.id === emps.gone.id)], [true, false, true, false])
})

test('CA-09: بطاقات التقييم — المحاور بيسلّم مرة واحدة ومابيشوفش بطاقات غيره قبل ما يسلّم، وبيقرا سيرة المرشح وهو محاور بس', async () => {
  const rules = require('../src/recruitment/interview-rules')
  const first = interviewState.first.id
  const mine = async user => expectStatus(await request(user, 'GET', '/recruitment/my-interviews'), 200)
  const submit = (user, id, body) => request(user, 'POST', '/recruitment/my-interviews/' + id + '/scorecard', body)
  const cardOf = (view, own) => view.scorecards.find(card => card.mine === own)
  const a1 = await mine(users.a1)
  assert.deepEqual([a1.available, a1.interviews.map(item => item.id).sort((x, y) => x - y)], [true, [first, interviewState.second.id]])
  const shown = a1.interviews.find(item => item.id === first)
  assert.deepEqual([shown.candidateName, shown.positionTitle, cardOf(shown, true).submitted, cardOf(shown, false).interviewerName, cardOf(shown, false).submitted], ['متقدّم من اللينك', 'محاسب', false, emps.a2.fullName, false])
  assert.deepEqual([(await mine(users.b1)).interviews, (await mine(users.nobody)).available, (await mine(users.recruiterA)).interviews], [[], false, []])
  // المحاور بيقرا سيرة المرشح اللي هيقابله (كان 403 قبل ما يبقى محاور — CA-06)
  const readCv = async user => (await fetch(base + '/files/' + shown.cvFileId, { headers: { Authorization: 'Bearer ' + jwt.sign(payloadOf(user)) } })).status
  assert.deepEqual([await readCv(users.a1), await readCv(users.a2), await readCv(users.b1), await readCv(users.nobody)], [200, 200, 403, 403])

  for (const [body, message] of [[{ rating: 6, recommendation: 'YES' }, rules.SCORECARD_RATING], [{ rating: '4', recommendation: 'YES' }, rules.SCORECARD_RATING], [{ rating: 4 }, rules.SCORECARD_RECOMMENDATION],
    [{ rating: 4, recommendation: 'GOOD' }, rules.SCORECARD_RECOMMENDATION], [{ rating: 4, recommendation: 'YES', notes: 'م'.repeat(2001) }, 'ملاحظات البطاقة لا يتجاوز 2000 حرف']]) {
    assert.deepEqual(answer(await submit(users.a1, first, body)), [400, message], JSON.stringify(body).slice(0, 60))
  }
  assert.deepEqual(answer(await submit(users.b1, first, { rating: 3, recommendation: 'NO' })), [404, rules.INTERVIEW_NOT_FOUND], 'مش محاور في المقابلة')
  assert.equal((await submit(users.nobody, first, { rating: 3, recommendation: 'NO' })).status, 403)
  assert.equal((await submit(users.recruiterA, first, { rating: 3, recommendation: 'NO' })).status, 403, 'مسؤول التوظيف من غير ملف موظف مايسلّمش بطاقة')
  // a1 بيسلّم: بيشوف بطاقته، ولسه مايشوفش محتوى بطاقة a2 (ماسلّمش)؛ وa2 قبل ما يسلّم مايشوفش محتوى بطاقة a1
  const done = expectStatus(await submit(users.a1, first, { rating: 4, recommendation: 'YES', notes: '  خبرة مناسبة\r\nومهارات كويسة ' }), 200)
  assert.deepEqual([cardOf(done, true).rating, cardOf(done, true).recommendationLabel, cardOf(done, true).notes, cardOf(done, false).submitted, cardOf(done, false).rating], [4, 'مناسب', 'خبرة مناسبة\nومهارات كويسة', false, null])
  assert.deepEqual(answer(await submit(users.a1, first, { rating: 1, recommendation: 'NO' })), [409, rules.SCORECARD_SUBMITTED])
  const blind = (await mine(users.a2)).interviews.find(item => item.id === first)
  assert.deepEqual([cardOf(blind, false).submitted, cardOf(blind, false).rating, cardOf(blind, false).recommendation, cardOf(blind, false).notes], [true, null, null, null], 'قبل ما يسلّم: عارف إن زميله سلّم بس')
  const open = expectStatus(await submit(users.a2, first, { rating: 2, recommendation: 'MAYBE' }), 200)
  assert.deepEqual([cardOf(open, false).rating, cardOf(open, false).recommendation, cardOf(open, false).notes, cardOf(open, true).rating], [4, 'YES', 'خبرة مناسبة\nومهارات كويسة', 2], 'بعد ما سلّم: شايف بطاقة زميله')
  // مسؤول التوظيف شايف البطاقتين، وبطاقة مقابلة تانية لسه ماتسلّمتش فاضية عنده
  const board = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/interviews'), 200).interviews
  assert.deepEqual(board.find(item => item.id === first).scorecards.map(card => [card.rating, card.recommendation]), [[4, 'YES'], [2, 'MAYBE']])
  assert.deepEqual(board.find(item => item.id === interviewState.second.id).scorecards.map(card => [card.submitted, card.rating]), [[false, null]])
  const stored = await repo('InterviewScorecard').find({ where: { interviewId: first }, order: { id: 'ASC' } })
  assert.deepEqual(stored.map(card => [card.rating, card.submittedAt instanceof Date]), [[4, true], [2, true]])
})

test('CA-10: قفل المقابلة وإلغاؤها وملف الدعوة — من «محددة» بس، والملغاة بتختفي من «مقابلاتي» وبطاقتها مابتتسلّمش', async () => {
  const rules = require('../src/recruitment/interview-rules')
  const close = (user, id, status) => request(user, 'POST', '/recruitment/interviews/' + id + '/status', { status })
  const first = interviewState.first.id, second = interviewState.second.id, third = interviewState.third.id
  assert.deepEqual(answer(await close(users.recruiterA, first, 'OPEN')), [400, 'الحالة: DONE أو CANCELLED'])
  assert.deepEqual(answer(await close(users.recruiterB, first, 'DONE')), [404, rules.INTERVIEW_NOT_FOUND])
  assert.equal((await close(users.a1, first, 'DONE')).status, 403)
  assert.deepEqual([expectStatus(await close(users.recruiterA, first, 'DONE'), 200).statusLabel, answer(await close(users.recruiterA, first, 'CANCELLED'))], ['تمّت', [400, rules.INTERVIEW_NOT_OPEN]])
  // الإلغاء بيبعت دعوة إلغاء، وبيقفل بطاقة المحاور وقراءته لسيرة المرشح من المقابلة دي
  await withMail(async sent => {
    assert.equal(expectStatus(await close(users.recruiterA, second, 'CANCELLED'), 200).status, 'CANCELLED')
    assert.deepEqual([sent.map(message => message.to).sort(), /^إلغاء مقابلة/.test(sent[0].subject), sent[0].attachments[0].content.toString('utf8').includes('METHOD:CANCEL')],
      [['a1@work.invalid', 'link@applicant.invalid'], true, true])
  })
  assert.deepEqual((await request(users.a1, 'GET', '/recruitment/my-interviews')).body.interviews.map(item => item.id), [first], 'الملغاة مش في مقابلاتي')
  assert.deepEqual(answer(await request(users.a1, 'POST', '/recruitment/my-interviews/' + second + '/scorecard', { rating: 3, recommendation: 'NO' })), [400, rules.SCORECARD_CANCELLED])
  // ملف الدعوة: مسؤول التوظيف في نطاق المرشح، والمحاور في المقابلة — وغيرهم غير موجودة
  const ics = async (user, id) => { const response = await fetch(base + '/recruitment/my-interviews/' + id + '/ics', { headers: { Authorization: 'Bearer ' + jwt.sign(payloadOf(user)) } }); return [response.status, response.headers.get('content-type'), await response.text()] }
  const [status, type, text] = await ics(users.recruiterA, third)
  assert.deepEqual([status, /^text\/calendar/.test(type), text.includes('BEGIN:VEVENT'), text.includes('UID:interview-' + third + '@hr-system')], [200, true, true, true])
  assert.deepEqual([(await ics(users.a2, third))[0], (await ics(users.a1, third))[0], (await ics(users.recruiterB, third))[0], (await ics(users.nobody, third))[0], (await ics(users.recruiterA, 987654))[0]], [200, 404, 404, 404, 404])
  assert.match((await ics(users.recruiterA, second))[2], /STATUS:CANCELLED/)
  // الموديول المقفول بيقفل المسارات
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try {
    assert.deepEqual([(await request(users.recruiterA, 'GET', '/recruitment/interviews')).status, (await request(users.a1, 'GET', '/recruitment/my-interviews')).status], [404, 404])
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }
})

const offerState = {}
const offerDay = days => { const d = new Date(Date.now() + days * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
const makeOffer = (user, body) => request(user, 'POST', '/recruitment/offers', body)
const actOffer = (user, id, action, extra = {}) => request(user, 'POST', '/recruitment/offers/' + id + '/act', { action, ...extra })

test('CA-11: عرض العمل — القيم والنطاق، وعرض مفتوح واحد، وتحذير النطاق، والاعتماد بصلاحيته ولغير اللي عمله، والإرسال بلينك برمز', async () => {
  const offers = require('../src/recruitment/offers.service')
  users.approver = await account('offer-approver', ['candidates.approve_offers'])
  users.both = await account('offer-both', ['candidates.manage', 'candidates.approve_offers'])
  const candidate = await repo('Candidate').findOneByOrFail({ email: 'link@applicant.invalid' })
  const foreign = await repo('Candidate').save({ fullName: 'مرشح عرض فرع ب', positionTitle: 'محاسب', branchId: org.branchB.id, stage: 'interview' })
  const closed = await repo('Candidate').save({ fullName: 'مرشح عرض مرفوض', positionTitle: 'محاسب', branchId: org.branchA.id, stage: 'rejected' })
  const good = { candidateId: candidate.id, salary: 9500, startDate: offerDay(30), expiresOn: offerDay(7), notes: ' عرض  مبدئي ' }
  for (const [change, status, message] of [
    [{ salary: 0 }, 400, offers.OFFER_SALARY], [{ salary: -5 }, 400, offers.OFFER_SALARY], [{ salary: '1.234' }, 400, offers.OFFER_SALARY], [{ salary: 'كتير' }, 400, offers.OFFER_SALARY],
    [{ startDate: undefined }, 400, offers.OFFER_START_DATE], [{ startDate: '2026-02-31' }, 400, offers.OFFER_START_DATE], [{ expiresOn: '2020-01-01' }, 400, offers.OFFER_EXPIRY],
    [{ notes: 'م'.repeat(1001) }, 400, 'ملاحظات العرض لا يتجاوز 1000 حرف'], [{ candidateId: foreign.id }, 404, 'المرشح غير موجود'], [{ candidateId: 987654 }, 404, 'المرشح غير موجود'],
    [{ candidateId: closed.id }, 400, offers.OFFER_CANDIDATE_CLOSED],
  ]) assert.deepEqual(answer(await makeOffer(users.recruiterA, { ...good, ...change })), [status, message], JSON.stringify(change).slice(0, 60))
  assert.deepEqual(answer(await makeOffer(users.approver, good)), [403, offers.OFFER_MANAGE_FORBIDDEN], 'المعتمد مش بيعمل عروض')
  assert.equal((await makeOffer(users.nobody, good)).status, 403)
  assert.equal(await count('candidate_offers'), 0)

  // الراتب برّه نطاق الوظيفة (7000–9000): تحذير بس
  const made = expectStatus(await makeOffer(users.recruiterA, good), 201)
  assert.deepEqual([made.candidateName, made.salary, made.startDate, made.expiresOn, made.notes, made.status, made.statusLabel, made.rangeFrom, made.rangeTo, made.outOfRange, made.mine, made.canApprove],
    ['متقدّم من اللينك', '9500.00', good.startDate, good.expiresOn, 'عرض  مبدئي', 'DRAFT', 'مسودة', '7000.00', '9000.00', true, true, false])
  assert.deepEqual(answer(await makeOffer(users.recruiterA, good)), [409, offers.OFFER_ALREADY_OPEN])
  const edited = expectStatus(await request(users.recruiterA, 'PATCH', '/recruitment/offers/' + made.id, { salary: '8500' }), 200)
  assert.deepEqual([edited.salary, edited.outOfRange, edited.startDate], ['8500.00', false, good.startDate], 'الخانة المبعوتة بس')
  assert.deepEqual(answer(await request(users.recruiterB, 'PATCH', '/recruitment/offers/' + made.id, { salary: 1 })), [404, offers.OFFER_NOT_FOUND])
  assert.deepEqual(answer(await request(users.approver, 'PATCH', '/recruitment/offers/' + made.id, { salary: 1 })), [403, offers.OFFER_MANAGE_FORBIDDEN])

  // الاعتماد: مسودة مابتتعتمدش؛ بعد الطلب: مسؤول التوظيف من غير الصلاحية 403، والمعتمد بيرجّع بسبب أو يعتمد
  assert.equal((await actOffer(users.approver, made.id, 'approve')).status, 400)
  assert.equal(expectStatus(await actOffer(users.recruiterA, made.id, 'submit'), 200).status, 'PENDING')
  assert.equal((await request(users.recruiterA, 'PATCH', '/recruitment/offers/' + made.id, { salary: 9000 })).status, 400, 'مش مسودة')
  assert.deepEqual(answer(await actOffer(users.recruiterA, made.id, 'approve')), [403, offers.OFFER_APPROVE_FORBIDDEN])
  assert.deepEqual(answer(await actOffer(users.approver, made.id, 'submit')), [403, offers.OFFER_MANAGE_FORBIDDEN])
  const inbox = expectStatus(await request(users.approver, 'GET', '/recruitment/offers'), 200)
  assert.deepEqual([inbox.canApprove, inbox.offers.map(item => [item.id, item.canApprove])], [true, [[made.id, true]]])
  assert.equal((await actOffer(users.approver, made.id, 'return')).status, 400, 'الإرجاع بسبب')
  const back = expectStatus(await actOffer(users.approver, made.id, 'return', { reason: 'الراتب محتاج مراجعة' }), 200)
  assert.deepEqual([back.status, back.returnReason], ['DRAFT', 'الراتب محتاج مراجعة'])
  expectStatus(await actOffer(users.recruiterA, made.id, 'submit'), 200)
  const approved = expectStatus(await actOffer(users.approver, made.id, 'approve'), 200)
  assert.deepEqual([approved.status, approved.returnReason, (await repo('CandidateOffer').findOneByOrFail({ id: made.id })).approvedByUserId], ['APPROVED', null, users.approver.id])
  // اللي عمل العرض مايعتمدوش حتى لو معاه الصلاحيتين؛ ومدير النظام بيعتمد
  const second = await repo('Candidate').save({ fullName: 'مرشح عرض تاني', positionTitle: 'محاسب', branchId: org.branchA.id, stage: 'interview', email: 'offer2@applicant.invalid' })
  const own = expectStatus(await makeOffer(users.both, { candidateId: second.id, salary: 6000, startDate: offerDay(20) }), 201)
  assert.deepEqual([own.rangeFrom, own.outOfRange, own.expiresOn], [null, false, null], 'مرشح من غير وظيفة: من غير نطاق')
  expectStatus(await actOffer(users.both, own.id, 'submit'), 200)
  assert.deepEqual(answer(await actOffer(users.both, own.id, 'approve')), [403, offers.OFFER_SELF_APPROVAL])
  assert.equal(expectStatus(await actOffer(users.admin, own.id, 'approve'), 200).status, 'APPROVED')

  // الإرسال: رمز لينك مرة واحدة، والمتخزّن بصمته بس
  assert.equal((await actOffer(users.approver, made.id, 'send')).status, 403, 'الإرسال لمسؤول التوظيف')
  const sent = expectStatus(await actOffer(users.recruiterA, made.id, 'send'), 200)
  const stored = await repo('CandidateOffer').findOneByOrFail({ id: made.id })
  assert.deepEqual([sent.status, /^[a-f0-9]{64}$/.test(sent.linkToken), stored.tokenHash === offers.offerTokenHash(sent.linkToken), stored.tokenHash !== sent.linkToken, stored.sentAt instanceof Date],
    ['SENT', true, true, true, true])
  assert.equal((await actOffer(users.recruiterA, made.id, 'send')).status, 400)
  assert.equal('linkToken' in expectStatus(await request(users.recruiterA, 'GET', '/recruitment/offers'), 200).offers.find(item => item.id === made.id), false, 'الرمز مابيطلعش تاني')
  assert.deepEqual(expectStatus(await request(users.recruiterB, 'GET', '/recruitment/offers'), 200).offers, [])
  assert.equal((await actOffer(users.recruiterA, made.id, 'fly')).status, 400)
  Object.assign(offerState, { first: made.id, token: sent.linkToken, second: own.id, secondCandidate: second.id })
})

test('CA-12: رد المرشح — من اللينك مرة واحدة وبدليله، أو مسجّل من مسؤول التوظيف؛ والمسحوب والمنتهي والميزة المقفولة = اللينك مابيشتغلش', async () => {
  const offers = require('../src/recruitment/offers.service')
  app.get(offers.OffersService).limiter.reset()
  const view = token => request(null, 'GET', '/careers/offers/' + token)
  const reply = (token, body) => request(null, 'POST', '/careers/offers/' + token, body)
  const shown = expectStatus(await view(offerState.token), 200)
  assert.deepEqual(shown, { candidateName: 'متقدّم من اللينك', positionTitle: 'محاسب', branchName: 'فرع التقديم أ', salary: '8500.00', startDate: offerDay(30), expiresOn: offerDay(7) })
  for (const bad of ['a'.repeat(64), 'short', offerState.token.toUpperCase(), offerState.token + 'ab']) assert.deepEqual(answer(await view(bad)), [404, offers.OFFER_LINK_GONE], bad.slice(0, 12))
  assert.equal((await reply(offerState.token, { answer: 'MAYBE' })).status, 400)
  assert.equal((await reply(offerState.token, { answer: 'ACCEPT', note: 'م'.repeat(501) })).status, 400)
  // الميزة مقفولة = اللينك زي مسار مش موجود، وبترجع تشتغل لما تتفتح
  expectStatus(await feature(false), 200); modules.invalidate()
  try { assert.equal((await view(offerState.token)).status, 404); assert.equal((await reply(offerState.token, { answer: 'ACCEPT' })).status, 404) } finally { expectStatus(await feature(true), 200); modules.invalidate() }
  assert.equal((await repo('CandidateOffer').findOneByOrFail({ id: offerState.first })).status, 'SENT')

  const audits = async action => Number((await query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = @0', [action]))[0].n)
  const before = await audits('RECRUITMENT_OFFER_ANSWERED')
  assert.deepEqual(expectStatus(await reply(offerState.token, { answer: 'ACCEPT', note: ' موافق وهبدأ في الميعاد ' }), 200), { answered: true, status: 'ACCEPTED' })
  const stored = await repo('CandidateOffer').findOneByOrFail({ id: offerState.first })
  assert.deepEqual([stored.status, stored.respondedVia, stored.respondedNote, stored.tokenHash, stored.respondedAt instanceof Date, typeof stored.respondedIp, await audits('RECRUITMENT_OFFER_ANSWERED') - before],
    ['ACCEPTED', 'LINK', 'موافق وهبدأ في الميعاد', null, true, 'string', 1])
  // اللينك اتقفل بالرد: مفيش رد تاني ولا عرض
  assert.deepEqual([answer(await view(offerState.token)), answer(await reply(offerState.token, { answer: 'DECLINE' }))], [[404, offers.OFFER_LINK_GONE], [404, offers.OFFER_LINK_GONE]])
  assert.equal((await actOffer(users.recruiterA, offerState.first, 'withdraw')).status, 400, 'المقبول مابيتسحبش')
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/offers'), 200).offers.find(item => item.id === offerState.first)
  assert.deepEqual([listed.status, listed.statusLabel, listed.respondedVia, listed.respondedNote], ['ACCEPTED', 'مقبول', 'LINK', 'موافق وهبدأ في الميعاد'])

  // الرد مسجّل من مسؤول التوظيف، والرمز بيموت
  const sent = expectStatus(await actOffer(users.both, offerState.second, 'send'), 200)
  assert.equal((await actOffer(users.approver, offerState.second, 'record', { answer: 'DECLINE' })).status, 403)
  assert.equal((await actOffer(users.both, offerState.second, 'record', { answer: 'LATER' })).status, 400)
  const declined = expectStatus(await actOffer(users.both, offerState.second, 'record', { answer: 'DECLINE', note: 'قبل عرض تاني' }), 200)
  assert.deepEqual([declined.status, declined.respondedVia, declined.respondedNote, (await view(sent.linkToken)).status], ['DECLINED', 'RECRUITER', 'قبل عرض تاني', 404])
  // بعد الرفض: عرض جديد لنفس المرشح مسموح؛ والمسحوب والمنتهي لينكهم مابيشتغلش
  const again = expectStatus(await makeOffer(users.both, { candidateId: offerState.secondCandidate, salary: 6500, startDate: offerDay(25), expiresOn: offerDay(3) }), 201)
  expectStatus(await actOffer(users.both, again.id, 'submit'), 200); expectStatus(await actOffer(users.admin, again.id, 'approve'), 200)
  const live = expectStatus(await actOffer(users.both, again.id, 'send'), 200)
  expectStatus(await view(live.linkToken), 200)
  await repo('CandidateOffer').update({ id: again.id }, { expiresOn: offerDay(-1) })
  assert.deepEqual([answer(await view(live.linkToken)), (await reply(live.linkToken, { answer: 'ACCEPT' })).status], [[404, offers.OFFER_LINK_GONE], 404], 'مدة الرد خلصت')
  await repo('CandidateOffer').update({ id: again.id }, { expiresOn: offerDay(3) })
  expectStatus(await view(live.linkToken), 200)
  assert.equal(expectStatus(await actOffer(users.both, again.id, 'withdraw'), 200).status, 'WITHDRAWN')
  assert.deepEqual([(await view(live.linkToken)).status, (await repo('CandidateOffer').findOneByOrFail({ id: again.id })).tokenHash], [404, null])
  // الحد بالعنوان
  const service = app.get(offers.OffersService), real = service.limiter
  service.limiter = new (require('../src/recruitment/careers').AttemptLimiter)(1, 100, 60000)
  try { assert.deepEqual([(await view('b'.repeat(64))).status, (await view('b'.repeat(64))).status], [404, 429]) } finally { service.limiter = real }
})

test('CA-13: التعيين من العرض — العرض المقبول مع المرشح في القايمة، والوظيفة بتتقفل لما عدد المُعيَّنين يكمل', async () => {
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/candidates'), 200)
  const acceptedId = (await repo('CandidateOffer').findOneByOrFail({ id: offerState.first })).candidateId
  const accepted = listed.find(item => item.id === acceptedId), declined = listed.find(item => item.id === offerState.secondCandidate)
  assert.deepEqual([accepted.acceptedOffer, declined.acceptedOffer, listed.filter(item => item.acceptedOffer).length], [{ salary: '8500.00', startDate: offerDay(30) }, null, 1],
    'المقبول بس — المرفوض والمسحوب من غير عرض')

  // وظيفة بعدد 2 وعليها تلات مرشحين: بتتقفل مع المُعيَّن التاني
  const service = app.get(require('../src/recruitment/candidate-applications.service').CandidateApplicationsService)
  const target = await job({ openings: 2, title: 'وظيفة بتتقفل بالتعيين' })
  const onJob = []
  for (const name of ['معيّن أول', 'معيّن تاني', 'لسه مرشح']) {
    const row = await repo('Candidate').save({ fullName: name, positionTitle: target.title, branchId: org.branchA.id, stage: 'offer' })
    await repo('CandidateApplication').save({ candidateId: row.id, jobId: target.id, source: 'يدوي', nationalId: null, applicantEmployeeId: null, cvFileId: null, consentAt: null, createdAt: new Date() })
    onJob.push(row)
  }
  const actor = payloadOf(users.recruiterA)
  const audits = async () => Number((await query('SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] = N\'RECRUITMENT_JOB_STATUS\' AND [entityId] = @0', [target.id]))[0].n)
  const statusOf = async () => (await repo('RecruitmentJob').findOneByOrFail({ id: target.id })).status
  assert.deepEqual([await service.afterHire(actor, onJob[0].id), await statusOf()], [{ jobClosed: false }, 'PUBLISHED'], 'ولا حد اتعيّن لسه')
  await repo('Candidate').update({ id: onJob[0].id }, { stage: 'hired' })
  assert.deepEqual([await service.afterHire(actor, onJob[0].id), await statusOf(), await audits()], [{ jobClosed: false }, 'PUBLISHED', 0], 'واحد من اتنين')
  await repo('Candidate').update({ id: onJob[1].id }, { stage: 'hired' })
  assert.deepEqual([await service.afterHire(actor, onJob[1].id), await statusOf(), await audits()], [{ jobClosed: true }, 'CLOSED', 1])
  const closed = await repo('RecruitmentJob').findOneByOrFail({ id: target.id })
  assert.equal(closed.closedAt instanceof Date, true)
  assert.deepEqual([await service.afterHire(actor, onJob[1].id), await audits()], [{ jobClosed: false }, 1], 'المقفولة مابتتقفلش تاني')
  // المرشح التالت فضل في مرحلته، والمقفولة مابتقبلش مرشح جديد
  assert.equal((await repo('Candidate').findOneByOrFail({ id: onJob[2].id })).stage, 'offer')
  assert.deepEqual(answer(await add(users.recruiterA, { fullName: 'بعد القفل', phone: '0508887776', jobId: target.id })), [400, rules.CANDIDATE_JOB_NOT_OPEN])
  // مرشح من غير وظيفة: التعيين مالوش أثر على وظايف
  const loose = await repo('Candidate').save({ fullName: 'من غير وظيفة', positionTitle: 'سائق', branchId: org.branchA.id, stage: 'hired' })
  assert.deepEqual(await service.afterHire(actor, loose.id), { jobClosed: false })
})

test('CA-14: أرقام التوظيف — بنطاق فروع الحساب ومتطابقة مع الصفوف', async () => {
  const numbers = user => request(user, 'GET', '/recruitment/jobs/metrics')
  const mine = expectStatus(await numbers(users.recruiterA), 200)
  const visible = (await repo('Candidate').find()).filter(row => row.branchId === null || row.branchId === org.branchA.id)
  const ids = new Set(visible.map(row => row.id))
  const offers = (await repo('CandidateOffer').find()).filter(row => ids.has(row.candidateId))
  const applications = (await repo('CandidateApplication').find()).filter(row => ids.has(row.candidateId))
  const openJobs = (await repo('RecruitmentJob').find()).filter(row => row.branchId === org.branchA.id && ['PUBLISHED', 'PAUSED'].includes(row.status))
  assert.equal(mine.candidates, visible.length)
  // العروض: واحد مقبول وواحد مرفوض في فرع أ (CA-12) = 50%
  assert.deepEqual(mine.offers, { accepted: offers.filter(row => row.status === 'ACCEPTED').length, declined: offers.filter(row => row.status === 'DECLINED').length, acceptanceRate: 50 })
  assert.deepEqual([mine.offers.accepted, mine.offers.declined], [1, 1])
  // المدد: العرض المقبول على وظيفة — الاتنين اتحسبوا من صف واحد، وفي نفس اليوم (أقل من يوم)
  assert.deepEqual([mine.timeToHire.offers, mine.timeToFill.jobs, mine.timeToHire.averageDays >= 0 && mine.timeToHire.averageDays < 1, mine.timeToFill.averageDays >= 0 && mine.timeToFill.averageDays < 1], [1, 1, true, true])
  assert.deepEqual([mine.openJobs.count, typeof mine.openJobs.averageAgeDays], [openJobs.length, 'number'])
  // المراحل: الحالي = عدد المرشحين في كل مرحلة، ومجموعه = الكل؛ و«دخلها» من سجل النقل
  assert.deepEqual(mine.stages.map(row => [row.stage, row.current]), ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'].map(stage => [stage, visible.filter(row => row.stage === stage).length]))
  assert.equal(mine.stages.reduce((sum, row) => sum + row.current, 0), visible.length)
  const moves = (await repo('CandidateStageLog').find()).filter(row => ids.has(row.candidateId))
  assert.equal(mine.stages.find(row => row.stage === 'screening').entered, new Set(moves.filter(row => row.toStage === 'screening').map(row => row.candidateId)).size)
  assert.equal(mine.stages.find(row => row.stage === 'screening').label, 'فرز')
  // المصادر: مجموعها = عدد التقديمات، ومرتبة تنازلي
  assert.equal(mine.sources.reduce((sum, row) => sum + row.count, 0), applications.length)
  assert.deepEqual(mine.sources.map(row => row.count), [...mine.sources.map(row => row.count)].sort((a, b) => b - a))
  assert.ok(mine.sources.some(row => row.source === 'داخلي') && mine.sources.some(row => row.source === 'لينك عام'))
  // فرع ب: أرقامه هو بس (من غير عروض)، ومدير النظام شايف الكل، ومن غير الصلاحية 403
  const other = expectStatus(await numbers(users.recruiterB), 200)
  assert.deepEqual([other.offers, other.timeToHire, other.candidates < mine.candidates], [{ accepted: 0, declined: 0, acceptanceRate: null }, { averageDays: null, offers: 0 }, true])
  assert.equal(expectStatus(await numbers(users.admin), 200).candidates, await repo('Candidate').count())
  assert.equal((await numbers(users.nobody)).status, 403)
})
