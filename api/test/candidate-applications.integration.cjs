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
    [target, 'لينكد إن', 'B778899', null, true])
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
  assert.deepEqual([listed.application.cvFileId, typeof listed.application.consentAt, listed.application.source], [application.cvFileId, 'string', 'لينكد إن'])
  // ملف بتصنيف السيرة الذاتية بس مش ملف تقديم المرشح ده: غير موجود حتى لمسؤول التوظيف
  const stray = await repo('StoredFile').save({ originalName: 'stray.pdf', storedName: 'none/stray.pdf', mime: 'application/pdf', size: 10, entityType: 'candidate_cv', entityId: candidate.id })
  assert.equal((await fetch(base + '/files/' + stray.id, { headers: { Authorization: 'Bearer ' + jwt.sign(payloadOf(users.recruiterA)) } })).status, 404)
  // المرشح اتنقل لفرع تاني (وظيفته في فرع ب): مسؤول فرع أ مابقاش يقراه
  await repo('Candidate').update({ id: candidate.id }, { branchId: org.branchB.id })
  try { assert.deepEqual([await read(users.recruiterA), await read(users.recruiterB)], [404, 200]) } finally { await repo('Candidate').update({ id: candidate.id }, { branchId: org.branchA.id }) }
})
