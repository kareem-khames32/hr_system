'use strict'
// B6.10 على SQL حقيقي: اقتراحات المساعد في التوظيف والأداء — كلها مقفولة افتراضيًا؛ ملخص السيرة والترتيب بصلاحية التوظيف ونطاق الفروع، ومسودة ملخص
// التقييم للمدير المقيِّم بس؛ الرد متعلّم إنه اقتراح؛ ولا صف في ملف مرشح أو تقييم بيتغيّر ولا مرحلة بتتنقل؛ الترتيب بيقبل أرقام مرشحي الوظيفة بس
// ومن غير أسماء عند المزوّد؛ وقرار صاحب الاقتراح (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة، والخادم هو اللي بيقارن النص.
// المزوّد وهمي ومكتوب جوه الاختبار: مفيش نداء لنموذج حقيقي. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_aiassistx_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_aiassistx_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-aiassistx-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/ai/ai-rules')
const CV_BYTES = Buffer.from('%PDF-1.4\n% test cv: 6 years accounting, last job senior accountant\n%%EOF\n')
let master, pool, app, ds, base, modules, ai, created = false
const B = {}, U = {}, E = {}, C = {}, J = {}, S = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token(user), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@aiassistx.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: B.a.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const employee = (code, name, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: B.a.id, joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
  currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const candidate = (name, branch, extra = {}) => repo('Candidate').save({ fullName: name, email: `${crypto.randomBytes(4).toString('hex')}@cv.invalid`, phone: '05' + String(crypto.randomInt(10000000, 99999999)),
  positionTitle: 'محاسب', branchId: branch.id, stage: 'applied', ...extra })
const apply = (who, job, cvFileId = null) => repo('CandidateApplication').save({ candidateId: who.id, jobId: job.id, source: 'يدوي', nationalId: null, applicantEmployeeId: null, cvFileId, consentAt: null, createdAt: new Date() })
const job = (title, branch) => repo('RecruitmentJob').save({ title, branchId: branch.id, departmentId: null, openings: 1, description: 'محاسب للفرع', requirements: 'خبرة 5 سنين في المحاسبة وإجادة Excel', status: 'OPEN',
  internal: false, external: false, requestId: null, createdByUserId: U.admin.id, createdAt: new Date() })
const actionRow = id => repo('AiAction').findOneByOrFail({ id })
const count = async table => (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.[${table}]`)).recordset[0].n

// المزوّد الوهمي: بيرد بالنص اللي الاختبار حدده، وبيسجّل اللي وصله
const fake = { name: 'fake', model: 'fake-1', seen: [], reply: '', async turn(input) { this.seen.push(JSON.parse(JSON.stringify(input))); if (this.reply instanceof Error) throw this.reply; return { text: this.reply, toolCalls: [] } } }
const answering = text => { fake.reply = text; fake.seen = [] }

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  delete process.env.AI_PROVIDER; delete process.env.AI_API_KEY; delete process.env.AI_MODEL
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  ai = app.get(require('../src/ai/ai.service').AiService)
  ai.useProvider(fake)
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const cron of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) cron.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  B.a = await repo('Branch').save({ code: 'AS_A', name: 'فرع الاقتراحات أ' })
  B.b = await repo('Branch').save({ code: 'AS_B', name: 'فرع الاقتراحات ب' })
  const sales = await repo('Department').save({ branchId: B.a.id, name: 'قسم المبيعات', isActive: true })
  U.admin = await repo('User').save({ email: 'admin@aiassistx.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.boss = await employee('AS001', 'مدير المبيعات', { departmentId: sales.id })
  E.rep = await employee('AS002', 'مندوب سري الاسم', { departmentId: sales.id, managerEmployeeId: E.boss.id })
  await repo('Department').update(sales.id, { managerEmployeeId: E.boss.id })
  U.recruiter = await account('recruiter', ['candidates.manage', 'performance.manage'])
  U.recruiterB = await account('recruiter-b', ['candidates.manage'], { branchId: B.b.id })
  U.plain = await account('plain', [])
  U.boss = await account('boss', [], { employeeId: E.boss.id })
  U.rep = await account('rep', [], { employeeId: E.rep.id })
  // التوظيف: وظيفة في الفرع أ عليها تلات مرشحين (الأول بسيرة PDF)، ومرشح في الفرع ب على وظيفة تانية
  J.a = await job('محاسب أول', B.a); J.b = await job('بائع', B.b)
  C.one = await candidate('سعاد المرشحة الأولى', B.a, { notes: 'خبرة 6 سنين محاسبة، Excel متقدم' })
  C.two = await candidate('كريم المرشح التاني', B.a, { notes: 'خبرة 8 سنين مراجعة ومحاسبة تكاليف' })
  C.three = await candidate('هدى المرشحة التالتة', B.a, { notes: null })
  C.other = await candidate('مرشح الفرع ب', B.b, { notes: 'خبرة بيع' })
  const storedName = `2026-10/${crypto.randomUUID()}.pdf`
  await require('../src/files/storage').fileStorage().write(storedName, CV_BYTES)
  S.cv = await repo('StoredFile').save({ originalName: 'cv.pdf', storedName, mime: 'application/pdf', size: CV_BYTES.length, entityType: 'candidate_cv', entityId: C.one.id })
  await apply(C.one, J.a, S.cv.id); await apply(C.two, J.a); await apply(C.three, J.a); await apply(C.other, J.b)
  // الأداء: دورة تقييم اتطلقت على قسم المبيعات — تكليف المندوب ومديره المقيِّم
  for (const key of ['ai', 'performance']) ok(await request(U.admin, 'PUT', `/modules/${key}`, { enabled: true }))
  modules.invalidate()
  const template = ok(await request(U.recruiter, 'POST', '/performance/reviews/templates', { name: 'نموذج سنوي', ratingMax: 5, sections: [{ title: 'الأهداف', kind: 'GOALS', weight: 50 },
    { title: 'الجدارات', kind: 'COMPETENCIES', weight: 50, items: [{ label: 'التعاون', type: 'rating' }] }] }), 201)
  const cycle = ok(await request(U.recruiter, 'POST', '/performance/reviews/cycles', { name: 'تقييم الربع الأخير', kind: 'ANNUAL', templateId: template.id, periodStart: '2026-10-01', periodEnd: '2026-12-31',
    selfDueDate: '2027-01-10', managerDueDate: '2027-01-20', audienceMode: 'DEPARTMENTS', audienceIds: [sales.id] }), 201)
  ok(await request(U.recruiter, 'POST', `/performance/reviews/cycles/${cycle.id}/launch`))
  S.assignment = ok(await request(U.boss, 'GET', '/performance/reviews/team')).reviews.find(row => row.employeeName === 'مندوب سري الاسم').id
}, { timeout: 300000 })

after(async t => {
  if (app) await app.close()
  if (pool) await pool.close()
  try {
    if (created) {
      assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } finally {
    if (master) await master.close()
    fs.rmSync(uploads, { recursive: true, force: true })
  }
})

test('AS-01: كل ميزة مقفولة افتراضيًا لوحدها (404 ومفيش نداء للمزوّد)، وبعد الفتح بصلاحية التوظيف؛ ومن غير مزوّد 503', async () => {
  answering('ملخص')
  const routes = [`/ai/assist/cv/${C.one.id}`, `/ai/assist/ranking/${J.a.id}`, `/ai/assist/review/${S.assignment}`]
  for (const route of routes) assert.equal((await request(U.admin, 'POST', route)).status, 404, route)
  assert.equal(fake.seen.length, 0)
  for (const feature of [rules.AI_CV_FEATURE, rules.AI_RANKING_FEATURE, rules.AI_REVIEW_DRAFT_FEATURE]) ok(await request(U.admin, 'PUT', `/modules/features/${feature}`, { enabled: true }))
  modules.invalidate()
  assert.deepEqual([(await request(U.plain, 'POST', routes[0])).status, (await request(U.plain, 'POST', routes[1])).status, (await request(U.boss, 'POST', routes[0])).status], [403, 403, 403])
  ai.useProvider(null)
  try { refused(await request(U.recruiter, 'POST', routes[0]), 503, rules.AI_NOT_AVAILABLE) } finally { ai.useProvider(fake) }
  // موديول الذكاء الاصطناعي مقفول = كل المسارات مش موجودة حتى لو المزايا مفتوحة
  ok(await request(U.admin, 'PUT', '/modules/ai', { enabled: false })); modules.invalidate()
  try { for (const route of routes) assert.equal((await request(U.admin, 'POST', route)).status, 404, route) } finally { ok(await request(U.admin, 'PUT', '/modules/ai', { enabled: true })); modules.invalidate() }
  assert.deepEqual([fake.seen.length, await count('ai_actions')], [0, 0])
})

test('AS-02: ملخص السيرة — اقتراح متعلّم، السيرة هي اللي اتبعتت للمزوّد، وملف المرشح ماتغيّرش؛ برّه النطاق غير موجود؛ وقرار صاحبه (زي ما هو / اتغيّر / اترفض) متسجّل مرة واحدة والخادم بيقارن', async () => {
  const before = await repo('Candidate').findOneByOrFail({ id: C.one.id })
  answering('- خبرة: 6 سنين محاسبة\n- آخر وظيفة: محاسب أول')
  const made = ok(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.one.id}`))
  assert.deepEqual([made.suggestion, made.label, made.kind, made.candidateId, made.text], [true, rules.AI_SUGGESTION_LABEL, rules.AI_KIND_CV, C.one.id, '- خبرة: 6 سنين محاسبة\n- آخر وظيفة: محاسب أول'])
  const sent = fake.seen[0]
  assert.deepEqual([sent.system, sent.tools, sent.messages.length, sent.messages[0].documents.length, sent.messages[0].documents[0].mediaType, Buffer.from(sent.messages[0].documents[0].base64, 'base64').equals(CV_BYTES)],
    [rules.CV_SUMMARY_SYSTEM, [], 1, 1, 'application/pdf', true])
  // ولا خانة في ملف المرشح اتغيّرت
  assert.deepEqual(await repo('Candidate').findOneByOrFail({ id: C.one.id }), before)
  const row = await actionRow(made.id)
  assert.deepEqual([row.kind, row.userId, row.status, row.confirmed, JSON.parse(row.suggestion), row.answer], [rules.AI_KIND_CV, U.recruiter.id, 'OK', null, { kind: rules.AI_KIND_CV, entityId: C.one.id, text: made.text }, null])
  // برّه نطاق الفرع، ومرشح مش موجود: نفس الرد؛ ومرشح من غير سيرة
  for (const [user, id] of [[U.recruiterB, C.one.id], [U.recruiter, C.other.id], [U.recruiter, 987654]]) refused(await request(user, 'POST', `/ai/assist/cv/${id}`), 404, 'المرشح غير موجود')
  refused(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.two.id}`), 400, 'المرشح مالوش سيرة ذاتية مرفوعة')
  assert.equal(fake.seen.length, 1)
  // القرار: لصاحبه بس؛ نفس النص (بفرق مسافات) = زي ما هو؛ مرة واحدة
  const outcome = (user, id, body) => request(user, 'POST', `/ai/assist/${id}/outcome`, body)
  for (const other of [U.admin, U.recruiterB]) refused(await outcome(other, made.id, { used: true, finalText: made.text }), 404, rules.AI_SUGGESTION_NOT_FOUND)
  assert.deepEqual([(await outcome(U.recruiter, made.id, {})).status, (await outcome(U.recruiter, made.id, { used: true })).status, (await outcome(U.recruiter, made.id, { used: true, finalText: '  ' })).status], [400, 400, 400])
  const both = await Promise.all([outcome(U.recruiter, made.id, { used: true, finalText: ' - خبرة: 6 سنين محاسبة\n\n- آخر وظيفة:  محاسب أول ' }), outcome(U.recruiter, made.id, { used: false })])
  assert.deepEqual(both.map(response => response.status).sort(), [200, 409])
  refused(await outcome(U.recruiter, made.id, { used: false }), 409, rules.AI_SUGGESTION_DECIDED)
  const decided = await actionRow(made.id)
  assert.deepEqual([decided.confirmedByUserId, decided.confirmedAt instanceof Date, ['ACCEPTED', 'DISMISSED'].includes(decided.status)], [U.recruiter.id, true, true])
  // اتغيّر: النص النهائي بيتحفظ جنب الاقتراح
  const second = ok(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.one.id}`))
  assert.deepEqual(ok(await outcome(U.recruiter, second.id, { used: true, finalText: 'خبرة 6 سنين — اتراجعت في المقابلة' })), { id: second.id, outcome: 'CHANGED' })
  const changed = await actionRow(second.id)
  assert.deepEqual([changed.status, changed.confirmed, changed.answer, JSON.parse(changed.suggestion).text], ['CHANGED', true, 'خبرة 6 سنين — اتراجعت في المقابلة', made.text])
  const third = ok(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.one.id}`))
  assert.deepEqual(ok(await outcome(U.recruiter, third.id, { used: true, finalText: third.text })), { id: third.id, outcome: 'ACCEPTED' })
  const fourth = ok(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.one.id}`))
  assert.deepEqual(ok(await outcome(U.recruiter, fourth.id, { used: false })), { id: fourth.id, outcome: 'DISMISSED' })
  assert.deepEqual([(await actionRow(fourth.id)).confirmed, (await actionRow(fourth.id)).answer], [false, null])
  // فشل المزوّد: متسجّل ومفيش اقتراح يتقرر فيه
  fake.reply = new Error('boom')
  refused(await request(U.recruiter, 'POST', `/ai/assist/cv/${C.one.id}`), 503, rules.AI_PROVIDER_FAILED)
  const failed = await repo('AiAction').findOne({ where: { kind: rules.AI_KIND_CV }, order: { id: 'DESC' } })
  assert.deepEqual([failed.status, failed.suggestion], ['FAILED', null])
  refused(await outcome(U.recruiter, failed.id, { used: false }), 404, rules.AI_SUGGESTION_NOT_FOUND)
})

test('AS-03: ترتيب المرشحين — مقترح بسبب لكل واحد، أرقام مرشحي الوظيفة بس، من غير أسماء ولا بيانات اتصال عند المزوّد، ومابينقلش مرحلة حد ولا بيقبل ولا بيرفض', async () => {
  const stages = async () => (await repo('Candidate').find({ order: { id: 'ASC' } })).map(row => [row.id, row.stage, row.notes])
  const before = await stages(), logs = await count('candidate_stage_log')
  answering(`الترتيب: ${JSON.stringify([{ candidateId: C.two.id, reason: 'خبرة أطول في المحاسبة' }, { candidateId: 987654, reason: 'دخيل' }, { candidateId: C.other.id, reason: 'من وظيفة تانية' },
    { candidateId: C.two.id, reason: 'مكرر' }, { candidateId: C.one.id, reason: 'خبرة مطابقة و Excel' }, { candidateId: C.three.id, reason: '  ' }])} انتهى`)
  const made = ok(await request(U.recruiter, 'POST', `/ai/assist/ranking/${J.a.id}`))
  assert.deepEqual([made.suggestion, made.label, made.kind, made.jobId], [true, rules.AI_SUGGESTION_LABEL, rules.AI_KIND_RANKING, J.a.id])
  assert.deepEqual(made.order, [
    { position: 1, candidateId: C.two.id, fullName: 'كريم المرشح التاني', stage: 'applied', reason: 'خبرة أطول في المحاسبة' },
    { position: 2, candidateId: C.one.id, fullName: 'سعاد المرشحة الأولى', stage: 'applied', reason: 'خبرة مطابقة و Excel' },
    { position: null, candidateId: C.three.id, fullName: 'هدى المرشحة التالتة', stage: 'applied', reason: null }])
  // المزوّد شاف مراجع وملاحظات بس: ولا اسم ولا تليفون ولا بريد
  const sent = JSON.stringify(fake.seen)
  for (const person of [C.one, C.two, C.three]) for (const hidden of [person.fullName, person.phone, person.email]) assert.equal(sent.includes(hidden), false, hidden)
  assert.deepEqual([fake.seen[0].system, JSON.parse(fake.seen[0].messages[0].text).candidates.map(row => Object.keys(row).sort())], [rules.RANKING_SYSTEM, [['candidateId', 'notes', 'stage'], ['candidateId', 'notes', 'stage'], ['candidateId', 'notes', 'stage']]])
  // ولا مرحلة اتنقلت ولا سطر في سجل المراحل
  assert.deepEqual([await stages(), await count('candidate_stage_log')], [before, logs])
  // رد مش JSON: الكل «من غير ترتيب»
  answering('أرشّح قبول كريم ورفض الباقي')
  assert.deepEqual(ok(await request(U.recruiter, 'POST', `/ai/assist/ranking/${J.a.id}`)).order.map(row => [row.position, row.reason]), [[null, null], [null, null], [null, null]])
  // وظيفة برّه نطاقه أو مش موجودة: نفس الرد؛ ووظيفة بمرشح واحد مافيهاش ترتيب
  for (const [user, id] of [[U.recruiterB, J.a.id], [U.recruiter, J.b.id], [U.recruiter, 987654]]) refused(await request(user, 'POST', `/ai/assist/ranking/${id}`), 404, 'الوظيفة غير موجودة')
  refused(await request(U.recruiterB, 'POST', `/ai/assist/ranking/${J.b.id}`), 400, 'الترتيب محتاج مرشحين اتنين على الأقل على الوظيفة')
  assert.deepEqual(ok(await request(U.recruiter, 'POST', `/ai/assist/${made.id}/outcome`, { used: true })), { id: made.id, outcome: 'ACCEPTED' })
  assert.deepEqual(await stages(), before)
})

test('AS-04: مسودة ملخص التقييم — للمدير المقيِّم بس وقبل التسليم، من أدلة النظام ومن غير اسم الموظف، ومابتكتبش في التقييم؛ والمدير بيسجّل إنه غيّرها', async () => {
  const responses = await count('review_responses')
  answering('المندوب حقق أغلب أهدافه والتزامه بالحضور كويس؛ محتاج متابعة في إقفال المهام.')
  const made = ok(await request(U.boss, 'POST', `/ai/assist/review/${S.assignment}`))
  assert.deepEqual([made.suggestion, made.label, made.kind, made.assignmentId, made.text], [true, rules.AI_SUGGESTION_LABEL, rules.AI_KIND_REVIEW_DRAFT, S.assignment, fake.reply])
  const sent = fake.seen[0], payload = JSON.parse(sent.messages[0].text)
  assert.deepEqual([sent.system, Object.keys(payload).sort(), payload.period, JSON.stringify(sent).includes('مندوب سري الاسم')], [rules.REVIEW_DRAFT_SYSTEM, ['evidence', 'goals', 'period', 'selfComment'], { from: '2026-10-01', to: '2026-12-31' }, false])
  // الموظف نفسه، وصاحب إدارة الأداء (مش المقيِّم)، وحساب مالوش علاقة، وتكليف مش موجود: نفس الرد
  for (const [user, id] of [[U.rep, S.assignment], [U.recruiter, S.assignment], [U.plain, S.assignment], [U.boss, 987654]]) refused(await request(user, 'POST', `/ai/assist/review/${id}`), 404, 'التقييم غير موجود')
  assert.equal(fake.seen.length, 1)
  // مفيش رد تقييم اتكتب، والتكليف لسه مستني المدير
  const assignment = await repo('ReviewAssignment').findOneByOrFail({ id: S.assignment })
  assert.deepEqual([await count('review_responses'), assignment.managerSubmittedAt, assignment.managerScore], [responses, null, null])
  assert.deepEqual(ok(await request(U.boss, 'POST', `/ai/assist/${made.id}/outcome`, { used: true, finalText: 'حقق أغلب أهدافه. محتاج متابعة أسبوعية في المهام.' })), { id: made.id, outcome: 'CHANGED' })
  const row = await actionRow(made.id)
  assert.deepEqual([row.kind, row.userId, row.confirmed, row.confirmedByUserId, row.status], [rules.AI_KIND_REVIEW_DRAFT, U.boss.id, true, U.boss.id, 'CHANGED'])
  // سجل الاستخدام للمدقق فيه نوع الاقتراح وقراره
  const log = ok(await request(U.admin, 'GET', '/ai/actions')).actions.find(item => item.id === made.id)
  assert.deepEqual([log.kind, log.status, log.confirmed], [rules.AI_KIND_REVIEW_DRAFT, 'CHANGED', true])
})


test('P6D-A02: original ASCII phone and IBAN are removed from provider input',async t=>{
 await repo('Candidate').update(C.one.id,{notes:'Five years accounting. Contact mobile 0501234567; IBAN SA4420000001234567891234'});
 answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));ok(await request(U.recruiter,'POST','/ai/assist/ranking/'+J.a.id));
 const sent=JSON.stringify(fake.seen);assert.equal(sent.includes('0501234567'),false);assert.equal(sent.includes('SA4420000001234567891234'),false);
 t.diagnostic(JSON.stringify({asciiPhoneRedacted:true,ibanRedacted:true}));
});
test('P6D-A05: prior alternative contact representations are now removed',async t=>{
 const examples=[{label:'Persian numerals',value:'\u06f0\u06f5\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7'}, {label:'local phone',value:'5551234'}, {label:'separated phone',value:'050\u200b123\u200b4567'}];
 for(const example of examples){
   await repo('Candidate').update(C.one.id,{notes:'Accounting experience. Contact telephone: '+example.value});
   answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));ok(await request(U.recruiter,'POST','/ai/assist/ranking/'+J.a.id));
   const exposed=JSON.stringify(fake.seen).includes(example.value);t.diagnostic(JSON.stringify({representation:example.label,providerReceivedContact:exposed}));assert.equal(exposed,false);
 }
});
test('P6D-A06: employee-less proposal cannot be decided after account gains an employee link',async t=>{
 answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));const made=ok(await request(U.recruiter,'POST','/ai/assist/ranking/'+J.a.id));
 const before=await repo('User').findOneByOrFail({id:U.recruiter.id});assert.equal(before.employeeId,null);
 const linked=await employee('P6D_LINK','P6D new linked employee');
 ok(await request(U.admin,'PATCH','/users/'+U.recruiter.id,{employeeId:linked.id}));
 const fresh=await repo('User').findOneByOrFail({id:U.recruiter.id});
 assert.equal((await request(fresh,'POST','/ai/assist/'+made.id+'/outcome',{used:true})).status,404);assert.equal((await actionRow(made.id)).confirmed,null);
});

test('P6D-A07: assist outcome rejects a stale identity after rebinding before its conditional update',async t=>{
 U.recruiter=await repo('User').findOneByOrFail({id:U.recruiter.id});
 answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));const made=ok(await request(U.recruiter,'POST','/ai/assist/ranking/'+J.a.id));
 const next=await employee('P6D_LINK2','P6D next identity');
 let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r),original=ds.query;
 ds.query=async function(sql,...args){if(/^UPDATE dbo.ai_actions SET/.test(sql)&&args[0]?.[5]===made.id){hit();await held}return original.call(this,sql,...args)};
 const pending=request(U.recruiter,'POST','/ai/assist/'+made.id+'/outcome',{used:true});
 try{
  await Promise.race([reached,pending.then(()=>{throw Error('outcome completed before barrier')}),new Promise((_,r)=>setTimeout(()=>r(Error('outcome barrier timeout')),8000))]);
  ok(await request(U.admin,'PATCH','/users/'+U.recruiter.id,{employeeId:next.id}));release();const done=await pending;
  const row=await actionRow(made.id),fresh=await repo('User').findOneByOrFail({id:U.recruiter.id});
  t.diagnostic(JSON.stringify({race:'assist-outcome',status:done.status,proposalEmployee:row.employeeId,currentEmployee:fresh.employeeId,decision:row.status}));
  assert.equal(done.status,409);assert.notEqual(row.employeeId,fresh.employeeId);assert.equal(row.status,'OK');assert.equal(row.confirmed,null);
 }finally{release();ds.query=original;await pending.catch(()=>{})}
});

test('P6D-A08: a free-text contact is exempted as an amount and spaced pairs bypass the digit pattern',async t=>{
 U.recruiter=await repo('User').findOneByOrFail({id:U.recruiter.id});
 for(const example of [{label:'amount-shaped phone in free-text notes',notes:'05012345.67',secret:'05012345.67'}, {label:'four spaces between digit pairs',notes:'Contact telephone: 05    01    23    45    67',secret:'05    01    23    45    67'}]){
  await repo('Candidate').update(C.one.id,{notes:example.notes});answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));
  ok(await request(U.recruiter,'POST','/ai/assist/ranking/'+J.a.id));const shown=JSON.parse(fake.seen[0].messages[0].text).candidates.find(x=>x.candidateId===C.one.id).notes;
  assert.equal(shown.includes(example.secret),false);assert.doesNotMatch(shown,/\p{N}/u);t.diagnostic(JSON.stringify({case:example.label,providerReceivedContact:false,notes:shown}));
 }
});

test('P6D-A12: user-authored goal unit is incorrectly trusted as fixed system text',async t=>{
 const contact='Phone 0501234567';
 const goal=ok(await request(U.boss,'POST','/performance/goals',{ownerType:'EMPLOYEE',employeeId:E.rep.id,title:'P6D service goal',weight:10,targetValue:5,unit:contact,periodStart:'2026-10-01',periodEnd:'2026-12-31'}),201);
 assert.equal(goal.status,'ACTIVE');answering('P6D draft for review');ok(await request(U.boss,'POST','/ai/assist/review/'+S.assignment));
 const payload=JSON.parse(fake.seen[0].messages[0].text),shown=payload.goals.find(g=>g.title===rules.scrubFreeText(goal.title));
 assert.notEqual(shown.unit,contact);assert.doesNotMatch(shown.unit,/\p{N}/u);assert.equal(payload.evidence.goals,undefined);
 assert.equal(shown.targetValue,'5.00');assert.equal(shown.actualValue,null);assert.equal(shown.weight,10);
 assert.deepEqual(payload.period,{from:'2026-10-01',to:'2026-12-31'});
 t.diagnostic(JSON.stringify({source:'POST /performance/goals',userField:'unit',providerReceivedContact:false}));
});

test('P6D-A18: outcome rejects disabled, version-changed and deleted actors before its update',async t=>{
 for(const mode of ['disabled','version','deleted']){
  const originalUser=await repo('User').findOneByOrFail({id:U.recruiter.id});
  const actor=await repo('User').save({...originalUser,id:undefined,email:'outcome-'+mode+'@p6d.invalid',employeeId:null});
  answering(JSON.stringify([{candidateId:C.one.id,reason:'Relevant experience'}]));const made=ok(await request(actor,'POST','/ai/assist/ranking/'+J.a.id));
  const original=ds.query;let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);
  ds.query=async function(sql,...args){if(/^UPDATE dbo.ai_actions SET/.test(sql)&&args[0]?.[5]===made.id){hit();await held}return original.call(this,sql,...args)};
  const pending=request(actor,'POST','/ai/assist/'+made.id+'/outcome',{used:true});
  try{
   await Promise.race([reached,pending.then(()=>{throw Error('outcome finished before barrier')})]);
   if(mode==='disabled')ok(await request(U.admin,'PATCH','/users/'+actor.id,{isActive:false}));
   if(mode==='version')ok(await request(U.admin,'PUT','/users/'+actor.id+'/permissions',{grants:[],revokes:['employees.view']}));
   if(mode==='deleted')await repo('User').delete(actor.id);
   release();const done=await pending;assert.equal(done.status,409);assert.equal((await actionRow(made.id)).confirmed,null);
   t.diagnostic(JSON.stringify({outcomeActor:mode,http:done.status,changed:false}));
  }finally{release();ds.query=original;await pending.catch(()=>{})}
 }
});
