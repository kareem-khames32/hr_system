'use strict'
// B-ADD.6: نشر الوظيفة على السوشيال ميديا على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_job_share_test_<16 hex>)، عبر HTTP بتوكنات
// موقّعة محليًا ومن غير كلمات مرور. ولا نداء لأي منصة ولا رسالة بريد: الخادم مابينشرش، والاختبار بينادي الخادم المحلي بس.
//  JS-01) لوحة «انشر الوظيفة»: بصلاحية إدارة التوظيف وبنطاق فروع الحساب (برّه النطاق = غير موجودة زي مسار الوظيفة)، وللوظيفة المنشورة «خارجي»
//         بس، وبشكلها العام بالحرف (من غير راتب ولا قسم ولا سبب)، وبعنوان الواجهة العام وحالته؛ وقنوات النشر (الفيدات، والنشر التلقائي مقفول)؛
//         ومن غير أي كتابة.
//  JS-02) «خلص لما»: وظيفة منشورة ← لينك LinkedIn من اللوحة ← مرشح قدّم منه ← مصدره «LinkedIn» في المرشحين وفي «مصادر المرشحين»؛ والمصدر
//         المجهول = «لينك عام»؛ والأرقام بنطاق الفروع.
//  JS-03) الفيد العام: ورا ميزة الصفحة العامة، والمنشور «خارجي» بس وبخاناته العامة، ولينك التقديم بمصدره؛ واسم غير معروف أو عنوان مش مضبوط = 404.
// Run (من api/): node --test test/job-share.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_job_share_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_job_share_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-job-share-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const share = require('../src/recruitment/job-share')
const { JOB_SHARE_NOT_PUBLIC } = require('../src/recruitment/job-share.service')
const ui = require('../../src/lib/job-share')
const BASE_URL = 'https://jobs.example.com'
const COMPANY = 'شركة النشر التجريبية'
const PUBLIC_KEYS = ['branchName', 'code', 'description', 'id', 'openings', 'publishedAt', 'requirements', 'startDate', 'title']
let app, master, ds, base, modules, created = false
const org = {}, users = {}, jobs = {}

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
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@job-share.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const count = async table => Number((await query(`SELECT COUNT(*) AS [n] FROM [${table}]`))[0].n)
const job = (extra = {}) => repo('RecruitmentJob').save({ title: 'محاسب', branchId: org.branchA.id, departmentId: org.finance.id, openings: 2, reason: 'سبب داخلي سري', salaryFrom: '7111.00', salaryTo: '9333.00',
  startDate: null, description: 'محاسب عام لقسم الحسابات', requirements: '- خبرة سنتين\n- إجادة Excel', status: 'PUBLISHED', internal: false, external: true, requestId: null, createdByUserId: 0,
  publishedAt: new Date(), closedAt: null, createdAt: new Date(), ...extra })
const feature = async on => { expectStatus(await request(users.admin, 'PUT', '/modules/features/recruitment.public_careers', { enabled: on }), 200); modules.invalidate() }
const kit = (user, id) => request(user, 'GET', `/recruitment/share/jobs/${id}`)
// من غير دخول: التقديم (نموذج متعدد الأجزاء) والفيد (XML)
async function submit(jobId, fields) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, String(value))
  const response = await fetch(`${base}/careers/jobs/${jobId}/apply`, { method: 'POST', body: form })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function feed(name) {
  const response = await fetch(`${base}/careers/feed/${name}`)
  return { status: response.status, type: response.headers.get('content-type'), text: await response.text() }
}
let applicantNumber = 0
const person = (extra = {}) => { applicantNumber += 1; return { fullName: `متقدّم النشر ${applicantNumber}`, email: `share${applicantNumber}@applicant.invalid`, phone: `05500${String(10000 + applicantNumber)}`, consent: 'true', ...extra } }
const sourceOf = async email => (await repo('CandidateApplication').findOneByOrFail({ candidateId: (await repo('Candidate').findOneByOrFail({ email })).id })).source
const sourcesOf = async user => Object.fromEntries(expectStatus(await request(user, 'GET', '/recruitment/jobs/metrics'), 200).sources.map(row => [row.source, row.count]))

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads, FRONTEND_URL: `${BASE_URL}/` })
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

  org.branchA = await repo('Branch').save({ code: 'JS_A', name: 'فرع النشر أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'JS_B', name: 'فرع النشر ب', country: 'SA' })
  org.finance = await repo('Department').save({ name: 'قسم المالية السري', code: 'JS_FIN', branchId: org.branchA.id })
  await repo('RequestsConfig').save({ key: 'company.name', value: COMPANY })
  users.admin = await repo('User').save({ email: 'admin@job-share.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.recruiterA = await account('recruiter-a', ['candidates.manage'])
  users.recruiterB = await account('recruiter-b', ['candidates.manage'], { branchId: org.branchB.id })
  users.nobody = await account('nobody', [])
  jobs.open = await job()
  jobs.both = await job({ internal: true, title: 'مندوب مبيعات', departmentId: null })
  jobs.internalOnly = await job({ internal: true, external: false, title: 'وظيفة داخلية بس' })
  jobs.draft = await job({ status: 'DRAFT', publishedAt: null, title: 'وظيفة مسودة' })
  jobs.paused = await job({ status: 'PAUSED', title: 'وظيفة موقوفة' })
  jobs.closed = await job({ status: 'CLOSED', closedAt: new Date(), title: 'وظيفة مقفولة' })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-job-share-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'job share fixture cleanup failed')
})

test('JS-01: لوحة «انشر الوظيفة» — بصلاحيتها وبنطاق الفروع، وللمنشورة «خارجي» بس وبشكلها العام، وقنوات النشر، ومن غير كتابة', async () => {
  const service = app.get(require('../src/recruitment/job-share.service').JobShareService)
  const tables = ['audit_log', 'candidates', 'candidate_applications', 'recruitment_jobs']
  const before = []
  for (const table of tables) before.push(await count(table))

  // صفحة الوظائف العامة مقفولة افتراضيًا: اللوحة بتفتح وبتقول كده
  const mine = expectStatus(await kit(users.recruiterA, jobs.open.id), 200)
  assert.deepEqual(Object.keys(mine).sort(), ['baseInternal', 'baseUrl', 'careersOpen', 'company', 'job', 'sources'])
  assert.deepEqual([mine.careersOpen, mine.baseUrl, mine.baseInternal, mine.company], [false, BASE_URL, false, COMPANY])
  assert.deepEqual(Object.keys(mine.job).sort(), PUBLIC_KEYS, 'الوظيفة بشكلها العام بالحرف')
  assert.deepEqual([mine.job.id, mine.job.code, mine.job.title, mine.job.branchName, mine.job.openings, mine.job.requirements],
    [jobs.open.id, `J-${String(jobs.open.id).padStart(4, '0')}`, 'محاسب', 'فرع النشر أ', 2, '- خبرة سنتين\n- إجادة Excel'])
  assert.doesNotMatch(JSON.stringify(mine), /7111|9333|سبب داخلي سري|قسم المالية السري|salary|department|reason/i, 'من غير راتب ولا قسم ولا سبب احتياج')
  assert.deepEqual(mine.sources, share.JOB_SOURCES.map(source => ({ key: source.key, label: source.label })))
  // البوست واللينك اللي الواجهة بتبنيهم من الرد ده
  const link = ui.applyLink(mine.baseUrl, mine.job.id, 'linkedin')
  assert.equal(link, `${BASE_URL}/careers/${jobs.open.id}?src=linkedin`)
  const post = ui.jobPost(ui.jobPostBody(mine.job, mine.company, 'ar'), link, 'ar')
  assert.equal(post, `${COMPANY} تعلن عن وظيفة شاغرة: محاسب\nالمكان: فرع النشر أ\nالعدد المطلوب: 2\nالمتطلبات:\n- خبرة سنتين\n- إجادة Excel\n\nللتقديم: ${link}`)
  assert.match(ui.jobPostBody(mine.job, mine.company, 'en'), /is hiring: محاسب\nLocation: فرع النشر أ\nOpenings: 2\nRequirements:/)

  // نطاق الفروع: وظيفة فرع تاني = غير موجودة بنفس رد مسار الوظيفة، والحكم ده قبل «منشورة خارجي»
  const outside = answer(await request(users.recruiterB, 'GET', `/recruitment/jobs/${jobs.open.id}`))
  assert.deepEqual(outside, [404, 'الوظيفة غير موجودة'])
  for (const id of [jobs.open.id, jobs.both.id, jobs.internalOnly.id, jobs.draft.id, jobs.closed.id, 987654]) assert.deepEqual(answer(await kit(users.recruiterB, id)), outside, String(id))
  assert.deepEqual(answer(await kit(users.recruiterA, jobs.branchB.id)), outside)
  assert.equal(expectStatus(await kit(users.recruiterB, jobs.branchB.id), 200).job.branchName, 'فرع النشر ب')
  assert.deepEqual([(await kit(users.admin, jobs.open.id)).status, (await kit(users.admin, jobs.branchB.id)).status], [200, 200])
  // المنشورة «خارجي» بس: الداخلية بس، والمسودة، والموقوفة، والمقفولة مرفوضين برسالتهم
  for (const hidden of [jobs.internalOnly, jobs.draft, jobs.paused, jobs.closed]) assert.deepEqual(answer(await kit(users.recruiterA, hidden.id)), [400, JOB_SHARE_NOT_PUBLIC], hidden.title)
  assert.equal(expectStatus(await kit(users.recruiterA, jobs.both.id), 200).job.title, 'مندوب مبيعات')
  // الصلاحية والدخول والرقم
  assert.deepEqual([(await kit(users.nobody, jobs.open.id)).status, (await kit(null, jobs.open.id)).status, (await kit(users.recruiterA, 'abc')).status], [403, 401, 400])

  // قنوات النشر: الفيدين، والنشر التلقائي مقفول ومن غير أي بيانات ربط
  const channels = expectStatus(await request(users.recruiterA, 'GET', '/recruitment/share/channels'), 200)
  assert.deepEqual(Object.keys(channels).sort(), ['autoPublish', 'baseInternal', 'baseUrl', 'careersOpen', 'feeds'])
  assert.deepEqual(channels.feeds, [{ name: 'indeed.xml', label: 'Indeed' }, { name: 'linkedin.xml', label: 'LinkedIn Limited Listings' }])
  assert.deepEqual(channels.autoPublish.map(channel => [channel.key, channel.enabled, Object.keys(channel).sort().join()]),
    ['linkedin', 'facebook', 'instagram'].map(key => [key, false, 'enabled,key,label,needs']))
  assert.deepEqual([channels.careersOpen, channels.baseUrl, channels.baseInternal], [false, BASE_URL, false])
  assert.deepEqual([(await request(users.nobody, 'GET', '/recruitment/share/channels')).status, (await request(null, 'GET', '/recruitment/share/channels')).status], [403, 401])

  // عنوان الواجهة: مش مضبوط = من غير لينك (الواجهة بتقفل المشاركة)، وداخلي = متعلّم، وCAREERS_PUBLIC_URL بيكسب لو مضبوط
  const real = service.base, settings = service.config
  try {
    service.config = { get: key => ({ CAREERS_PUBLIC_URL: 'https://careers.example.org/', FRONTEND_URL: 'http://192.168.1.10:3000' })[key] }
    const own = expectStatus(await kit(users.recruiterA, jobs.open.id), 200)
    assert.deepEqual([own.baseUrl, own.baseInternal], ['https://careers.example.org', false])
    service.config = settings
    service.base = () => share.publicBaseOf('')
    assert.deepEqual([expectStatus(await kit(users.recruiterA, jobs.open.id), 200).baseUrl, expectStatus(await request(users.recruiterA, 'GET', '/recruitment/share/channels'), 200).baseUrl], [null, null])
    service.base = () => share.publicBaseOf('http://192.168.1.10:3000')
    const inside = expectStatus(await kit(users.recruiterA, jobs.open.id), 200)
    assert.deepEqual([inside.baseUrl, inside.baseInternal], ['http://192.168.1.10:3000', true])
  } finally { service.base = real; service.config = settings }

  // الموديول المقفول بيقفل المسارين
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try {
    assert.deepEqual([(await kit(users.recruiterA, jobs.open.id)).status, (await request(users.recruiterA, 'GET', '/recruitment/share/channels')).status], [404, 404])
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }

  // قراءة بس: ولا صف اتكتب (غير سطور تدقيق قفل وفتح الموديول)
  const afterCounts = []
  for (const table of tables) afterCounts.push(await count(table))
  assert.deepEqual(afterCounts.slice(1), before.slice(1))
  const shareAudits = await query(`SELECT COUNT(*) AS [n] FROM [audit_log] WHERE [action] LIKE N'%SHARE%' OR [entityType] = N'recruitment_job'`)
  assert.equal(Number(shareAudits[0].n), 0, 'اللوحة ماكتبتش سطر تدقيق ولا لمست وظيفة')
})

test('JS-02: «خلص لما» — لينك LinkedIn من اللوحة ← مرشح قدّم منه ← مصدره «LinkedIn» في المرشحين وفي «مصادر المرشحين»؛ والمجهول «لينك عام»', async () => {
  app.get(require('../src/recruitment/careers.service').CareersService).limiter.reset()
  await feature(true)
  const shown = expectStatus(await kit(users.recruiterA, jobs.open.id), 200)
  assert.equal(shown.careersOpen, true)
  // اللينك اللي زرار LinkedIn بيشاركه: بيفتح صفحة الوظيفة العامة، والصفحة بتاخد المصدر من ‎?src= (المعروف بس) وتبعته مع الطلب
  const link = new URL(ui.applyLink(shown.baseUrl, shown.job.id, 'linkedin'))
  assert.match(ui.shareUrl('linkedin', ui.jobPostBody(shown.job, shown.company, 'ar'), link.href, 'ar'), /^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=https%3A%2F%2Fjobs\.example\.com%2Fcareers%2F\d+%3Fsrc%3Dlinkedin$/)
  const jobId = Number(link.pathname.split('/').pop())
  assert.equal(expectStatus(await request(null, 'GET', `/careers/jobs/${jobId}`), 200).title, 'محاسب')
  const fromPage = raw => ui.knownShareSource(raw) || undefined
  const first = person()
  assert.deepEqual(expectStatus(await submit(jobId, { ...first, source: fromPage(link.searchParams.get('src')) }), 200), { received: true })
  assert.equal(await sourceOf(first.email), 'LinkedIn')
  // المرشح ظاهر لمسؤول التوظيف بمصدره
  const candidate = await repo('Candidate').findOneByOrFail({ email: first.email })
  const listed = expectStatus(await request(users.recruiterA, 'GET', '/candidates'), 200).find(item => item.id === candidate.id)
  assert.deepEqual([listed.application.jobId, listed.application.source], [jobId, 'LinkedIn'])

  // باقي المصادر، والمجهول: الخادم هو اللي بيحكم — أي نص برّه القايمة (حتى لو اتبعت من غير الصفحة) = «لينك عام»
  for (const [raw, stored] of [['facebook', 'Facebook'], ['x', 'X'], ['WhatsApp', 'WhatsApp'], ['لينكد إن', 'LinkedIn'], ['jobfair-2026', 'لينك عام'], ['<script>alert(1)</script>', 'لينك عام'],
    ['linkedin.com/evil', 'لينك عام'], ['', 'لينك عام'], [undefined, 'لينك عام']]) {
    const who = person()
    expectStatus(await submit(jobId, { ...who, source: raw }), 200)
    assert.equal(await sourceOf(who.email), stored, String(raw))
  }
  const rows = await count('candidate_applications')
  assert.deepEqual(answer(await submit(jobId, person({ source: 'م'.repeat(61) }))), [400, 'مصدر المرشح لا يتجاوز 60 حرف'])
  assert.equal(await count('candidate_applications'), rows)
  // فرع ب: متقدّم من الفيد على وظيفته
  const other = person()
  expectStatus(await submit(jobs.branchB.id, { ...other, source: 'indeed' }), 200)
  assert.equal(await sourceOf(other.email), 'Indeed')
  // مسؤول التوظيف كتب المصدر بإيده بحروف صغيرة: بيتخزّن زي ما كتبه (المسار القايم)، وبيتجمّع في الأرقام على «LinkedIn»
  expectStatus(await request(users.recruiterA, 'POST', '/candidates', { fullName: 'مرشح مضاف بالإيد', phone: '0507770001', jobId, source: ' linkedin ' }), 201)

  // «مصادر المرشحين»: LinkedIn بعدده، والمجهول اتجمّع على «لينك عام»، ومفيش نص من برّه ظهر — وبنطاق فروع الحساب
  const mine = await sourcesOf(users.recruiterA)
  assert.deepEqual(mine, { LinkedIn: 3, 'لينك عام': 5, Facebook: 1, X: 1, WhatsApp: 1 })
  assert.deepEqual(await sourcesOf(users.recruiterB), { Indeed: 1 })
  assert.deepEqual(await sourcesOf(users.admin), { ...mine, Indeed: 1 })
  assert.equal((await request(users.nobody, 'GET', '/recruitment/jobs/metrics')).status, 403)
})

test('JS-03: الفيد العام — ورا ميزة الصفحة العامة، والمنشور «خارجي» بس وبخاناته العامة، ولينك التقديم بمصدره', async () => {
  const service = app.get(require('../src/recruitment/job-share.service').JobShareService)
  const publicIds = [jobs.open.id, jobs.both.id, jobs.branchB.id].sort((a, b) => a - b)
  const idsIn = (xml, source) => [...xml.matchAll(new RegExp(`${BASE_URL.replace(/[.]/g, '\\.')}/careers/(\\d+)\\?src=${source}\\]\\]>`, 'g'))].map(match => Number(match[1])).sort((a, b) => a - b)

  const indeed = await feed('indeed.xml')
  assert.deepEqual([indeed.status, indeed.type], [200, 'application/xml; charset=utf-8'])
  assert.ok(indeed.text.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<source>\n') && indeed.text.endsWith('</source>\n'))
  assert.deepEqual(idsIn(indeed.text, 'indeed'), publicIds, 'الداخلي بس، والمسودة، والموقوف، والمقفول مش في الفيد — وكل الفروع زي الصفحة العامة')
  assert.equal(indeed.text.split('<job>').length - 1, publicIds.length)
  assert.match(indeed.text, new RegExp(`<publisher>${COMPANY}</publisher>\n<publisherurl>${BASE_URL}/careers</publisherurl>`))
  assert.match(indeed.text, /<title><!\[CDATA\[محاسب\]\]><\/title>\n<date><!\[CDATA\[[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT\]\]><\/date>\n<referencenumber><!\[CDATA\[J-\d{4}\]\]><\/referencenumber>/)
  assert.match(indeed.text, /<city><!\[CDATA\[فرع النشر أ\]\]><\/city>\n<description><!\[CDATA\[محاسب عام لقسم الحسابات<br><br><b>المتطلبات<\/b><br>- خبرة سنتين<br>- إجادة Excel\]\]><\/description>/)
  const linkedin = await feed('linkedin.xml')
  assert.deepEqual([linkedin.status, idsIn(linkedin.text, 'linkedin')], [200, publicIds])
  assert.match(linkedin.text, /<partnerJobId><!\[CDATA\[J-\d{4}\]\]><\/partnerJobId>/); assert.match(linkedin.text, /<applyUrl><!\[CDATA\[https:\/\/jobs\.example\.com\/careers\/\d+\?src=linkedin\]\]><\/applyUrl>/)
  // من غير أي بيان داخلي ولا بيان مرشح (JS-02 قدّم مرشحين على الوظايف دي)
  for (const xml of [indeed.text, linkedin.text]) {
    assert.doesNotMatch(xml, /7111|9333|سبب داخلي سري|قسم المالية السري|salary|department|reason|applicant\.invalid|متقدّم النشر|مرشح مضاف|وظيفة داخلية بس|وظيفة مسودة|وظيفة موقوفة|وظيفة مقفولة/i)
  }
  // اسم فيد غير معروف = غير موجود
  for (const name of ['other.xml', 'indeed', 'INDEED.XML', 'indeed.xml.bak', '%2e%2e%2findeed.xml']) assert.equal((await feed(name)).status, 404, name)
  // الوظيفة اللي اتوقفت بتخرج من الفيد، ولما ترجع بترجع
  await repo('RecruitmentJob').update({ id: jobs.both.id }, { status: 'PAUSED' })
  try { assert.deepEqual(idsIn((await feed('indeed.xml')).text, 'indeed'), publicIds.filter(id => id !== jobs.both.id)) } finally { await repo('RecruitmentJob').update({ id: jobs.both.id }, { status: 'PUBLISHED' }) }
  // من غير عنوان واجهة مضبوط مفيش لينك تقديم صح: الفيد غير موجود
  const real = service.base
  try { service.base = () => share.publicBaseOf(''); assert.equal((await feed('indeed.xml')).status, 404) } finally { service.base = real }
  assert.equal((await feed('indeed.xml')).status, 200)
  // الميزة المقفولة (الافتراضي) أو الموديول المقفول = الفيد زي المسار اللي مش موجود
  await feature(false)
  assert.deepEqual([(await feed('indeed.xml')).status, (await feed('linkedin.xml')).status, (await request(null, 'GET', '/careers/jobs')).status], [404, 404, 404])
  await feature(true)
  expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: false }), 200); modules.invalidate()
  try { assert.equal((await feed('indeed.xml')).status, 404) } finally { expectStatus(await request(users.admin, 'PUT', '/modules/recruitment', { enabled: true }), 200); modules.invalidate() }
})
