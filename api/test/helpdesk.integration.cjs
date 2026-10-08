'use strict'
// B3.10: مركز خدمات الموارد البشرية على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_helpdesk_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير
// كلمات مرور. ولا رسالة بريد حقيقية.
//  HD-01) الدورة على محرك الطلبات: استفسار بيتقدّم ← بيتعتمد فورًا (سلسلة «تنفيذ فوري») وبتتفتح مهمة على دور النوع بمهلته ← حالة الخدمة عند
//         الموظف من حالة المهمة ← المسؤول بيرد في تعليقات الطلب ويقفل المهمة ← الطلب «مكتمل» ← الموظف بيقيّم مرة واحدة (صاحبه بس، بعد الإقفال).
//  HD-02) التقرير بالصلاحية وبنطاق الفروع: العدد والمفتوح، ومتوسط أول رد والحل، والمتجاوز لمهلة أول رد (إعداد) ومهلة الحل، والرضا؛ والموديول
//         المقفول بيقفل المسارات ونوع الاستفسار مابيظهرش في التقديم.
// Run (من api/): node --test test/helpdesk.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_helpdesk_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_helpdesk_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-helpdesk-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/helpdesk/helpdesk-rules')
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
const employee = (extra = {}) => repo('Employee').save({ employeeCode: `HD${String(++employeeNumber).padStart(3, '0')}`, fullName: `موظف الخدمات ${employeeNumber}`, branchId: org.branchA.id,
  joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@helpdesk.invalid`, displayName: `حساب ${label}`, passwordHash: 'test-only',
  role: 'employee', branchId: org.branchA.id, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const ask = (user, typeCode, reason) => request(user, 'POST', '/requests', { typeCode, payload: { reason }, submit: true })
const rowOf = async id => (await ds.query('SELECT [id], [status], [executionTaskId] FROM [requests] WHERE [id] = @0', [id]))[0]
const H = '/helpdesk'

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

  org.branchA = await repo('Branch').save({ code: 'HD_A', name: 'فرع الخدمات أ', country: 'SA' })
  org.branchB = await repo('Branch').save({ code: 'HD_B', name: 'فرع الخدمات ب', country: 'SA' })
  emps.asker = await employee({ fullName: 'موظف بيسأل' })
  emps.other = await employee({ fullName: 'موظف تاني' })
  emps.b1 = await employee({ fullName: 'موظف فرع ب', branchId: org.branchB.id })
  users.admin = await repo('User').save({ email: 'admin@helpdesk.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null,
    scopeAllBranches: true, permissions: '[]', isActive: true })
  users.asker = await account('asker', [], { employeeId: emps.asker.id })
  users.other = await account('other', [], { employeeId: emps.other.id })
  users.b1 = await account('b1', [], { employeeId: emps.b1.id, branchId: org.branchB.id })
  // مسؤول الاستفسارات: حامل دور الموارد البشرية في فرع أ (مهمة التنفيذ عليه)؛ وصاحب التقرير بصلاحيته
  users.agent = await account('agent', ['approve.hr'])
  users.agentB = await account('agent-b', ['approve.hr'], { branchId: org.branchB.id })
  users.lead = await account('lead', ['helpdesk.manage'])
  users.leadB = await account('lead-b', ['helpdesk.manage'], { branchId: org.branchB.id })
  // نوعين استفسار زي البذرة: سلسلة «تنفيذ فوري» من غير خطوات، ومهمة على الموارد البشرية بمهلة 3 أيام
  const chain = await repo('ApprovalChain').save({ code: 'CH_INQUIRY', nameAr: 'استفسارات — من غير اعتمادات', isActive: true, autoApprove: true })
  for (const [code, nameAr] of [['INQUIRY_PAYROLL', 'استفسار عن الراتب'], ['INQUIRY_GENERAL', 'استفسار عام']]) {
    const type = await repo('RequestType').save({ code, nameAr, category: 'inquiries', destinationHandler: 'none', approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['reason']) })
    await ds.query('UPDATE [request_types] SET [executionRole] = @1, [executionDays] = @2, [executionProof] = 0 WHERE [id] = @0', [type.id, 'hr', 3])
  }
  // نوع عادي مش استفسار (للتأكد إن التقييم والتقرير للاستفسارات بس)
  await repo('RequestType').save({ code: 'SUGGESTION', nameAr: 'اقتراح', category: 'employee_relations', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
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

test('HD-01: الاستفسار على محرك الطلبات — اعتماد فوري ومهمة على دوره بمهلة، وحالة الخدمة من المهمة، ورد في التعليقات، وإقفال، وتقييم مرة واحدة من صاحبه', async () => {
  // الموديول مقفول افتراضيًا: المسارات مقفولة ونوع الاستفسار مابيظهرش في التقديم
  assert.deepEqual([(await request(users.asker, 'GET', H + '/mine')).status, expectStatus(await request(users.asker, 'GET', '/requests/types'), 200).some(row => row.category === 'inquiries')], [404, false])
  expectStatus(await request(users.admin, 'PUT', '/modules/helpdesk', { enabled: true }), 200); modules.invalidate()
  assert.deepEqual(expectStatus(await request(users.asker, 'GET', '/requests/types'), 200).filter(row => row.category === 'inquiries').map(row => row.code).sort(), ['INQUIRY_GENERAL', 'INQUIRY_PAYROLL'])
  assert.deepEqual(expectStatus(await request(users.asker, 'GET', H + '/mine'), 200), { available: true, inquiries: [] })

  // التقديم: من غير اعتمادات — الطلب «قيد التنفيذ» ومهمة على الموارد البشرية بموعد
  const sent = expectStatus(await ask(users.asker, 'INQUIRY_PAYROLL', 'ليه راتب الشهر ده أقل؟'), 201)
  const row = await rowOf(sent.id)
  assert.deepEqual([row.status, !!row.executionTaskId], ['IN_EXECUTION', true])
  const task = await repo('Task').findOneByOrFail({ id: row.executionTaskId })
  assert.deepEqual([task.assigneeRole, task.branchId, task.status, !!task.dueDate], ['hr', org.branchA.id, 'OPEN', true])
  let mine = expectStatus(await request(users.asker, 'GET', H + '/mine'), 200).inquiries
  assert.deepEqual(mine.map(entry => [entry.id, entry.typeName, entry.subject, entry.serviceStatus, entry.serviceStatusLabel, entry.dueDate === String(task.dueDate).slice(0, 10), entry.rating, entry.canRate]),
    [[sent.id, 'استفسار عن الراتب', 'ليه راتب الشهر ده أقل؟', 'OPEN', 'مفتوح', true, null, false]])
  assert.deepEqual(expectStatus(await request(users.other, 'GET', H + '/mine'), 200).inquiries, [], 'استفسارات صاحب الحساب بس')
  // التقييم قبل الإقفال مرفوض
  const rate = (user, id, body) => request(user, 'POST', H + `/${id}/rate`, body)
  assert.deepEqual(answer(await rate(users.asker, sent.id, { rating: 5 })), [400, rules.HELPDESK_RATING_STAGE])

  // المسؤول: بيشتغل عليها، بيرد في تعليقات الطلب (ظاهر للموظف) وبيكتب ملاحظة داخلية، وبيستنى رد الموظف
  const status = (user, body) => request(user, 'POST', `/tasks/${task.id}/status`, body)
  expectStatus(await status(users.agent, { status: 'IN_PROGRESS' }), 201)
  assert.equal(expectStatus(await request(users.asker, 'GET', H + '/mine'), 200).inquiries[0].serviceStatusLabel, 'جاري')
  expectStatus(await request(users.agent, 'POST', `/requests/${sent.id}/comments`, { body: 'ملاحظة داخلية: راجع خصم الغياب', internal: true }), 201)
  expectStatus(await request(users.agent, 'POST', `/requests/${sent.id}/comments`, { body: 'الفرق خصم يومين غياب — ابعت لو عندك عذر' }), 201)
  expectStatus(await status(users.agent, { status: 'WAITING', note: 'مستني عذر الموظف' }), 201)
  assert.equal(expectStatus(await request(users.asker, 'GET', H + '/mine'), 200).inquiries[0].serviceStatusLabel, 'مستني ردّك')
  const thread = expectStatus(await request(users.asker, 'GET', `/requests/${sent.id}/comments`), 200)
  assert.equal(JSON.stringify(thread).includes('ملاحظة داخلية'), false, 'الداخلي مابيظهرش للموظف')
  expectStatus(await request(users.asker, 'POST', `/requests/${sent.id}/comments`, { body: 'تمام، مفيش عذر' }), 201)
  // الإقفال: مسؤول فرع تاني مالوش؛ والمسؤول بيقفل ← الطلب «مكتمل»
  assert.notEqual((await status(users.agentB, { status: 'DONE' })).status, 201)
  expectStatus(await status(users.agent, { status: 'DONE', proofNote: 'اتوضّح للموظف' }), 201)
  assert.equal((await rowOf(sent.id)).status, 'COMPLETED')
  mine = expectStatus(await request(users.asker, 'GET', H + '/mine'), 200).inquiries
  assert.deepEqual([mine[0].serviceStatus, mine[0].serviceStatusLabel, mine[0].canRate], ['DONE', 'اتحل', true])

  // التقييم: القيم، وصاحبه بس (غيره = غير موجود)، ومش لطلب مش استفسار، ومرة واحدة
  for (const bad of [{}, { rating: 0 }, { rating: 6 }, { rating: 4.5 }, { rating: '5' }]) assert.deepEqual(answer(await rate(users.asker, sent.id, bad)), [400, rules.HELPDESK_RATING], JSON.stringify(bad))
  assert.equal((await rate(users.asker, sent.id, { rating: 5, comment: 'ت'.repeat(501) })).status, 400)
  for (const stranger of [users.other, users.agent, users.lead]) assert.deepEqual(answer(await rate(stranger, sent.id, { rating: 5 })), [404, rules.HELPDESK_NOT_FOUND], stranger.email)
  const plain = expectStatus(await request(users.asker, 'POST', '/requests', { typeCode: 'SUGGESTION', payload: { reason: 'اقتراح' }, submit: true }), 201)
  assert.deepEqual([answer(await rate(users.asker, plain.id, { rating: 5 })), answer(await rate(users.asker, 987654, { rating: 5 }))], [[404, rules.HELPDESK_NOT_FOUND], [404, rules.HELPDESK_NOT_FOUND]])
  const rated = expectStatus(await rate(users.asker, sent.id, { rating: 4, comment: ' رد سريع ' }), 200).inquiries[0]
  assert.deepEqual([rated.rating, rated.ratingComment, rated.canRate], [4, 'رد سريع', false])
  assert.deepEqual(answer(await rate(users.asker, sent.id, { rating: 5 })), [409, rules.HELPDESK_RATED])
  // ضغطتين مع بعض على استفسار تاني: تقييم واحد
  const second = expectStatus(await ask(users.asker, 'INQUIRY_GENERAL', 'إمتى الإجازة الرسمية الجاية؟'), 201)
  expectStatus(await request(users.agent, 'POST', `/tasks/${(await rowOf(second.id)).executionTaskId}/status`, { status: 'DONE', proofNote: 'اترد عليه' }), 201)
  const race = await Promise.all([rate(users.asker, second.id, { rating: 2 }), rate(users.asker, second.id, { rating: 3 })])
  assert.deepEqual([race.map(response => response.status).sort(), await repo('RequestServiceRating').count({ where: { requestId: second.id } })], [[200, 409], 1])
  state.first = sent.id; state.second = second.id
})

test('HD-02: التقرير بالصلاحية وبنطاق الفروع — العدد والمفتوح ومتوسطات الرد والحل والمتجاوز للمهلتين والرضا؛ والموديول المقفول', async () => {
  const R = H + '/report'
  assert.deepEqual([(await request(users.asker, 'GET', R)).status, (await request(users.agent, 'GET', R)).status, answer(await request(users.lead, 'GET', R + '?from=2026-10-05&to=2026-10-01')),
    answer(await request(users.lead, 'GET', R + '?from=x&to=2026-10-01')), answer(await request(users.lead, 'GET', R + '?from=2024-01-01&to=2026-01-01'))],
  [403, 403, [400, rules.HELPDESK_RANGE], [400, rules.HELPDESK_RANGE], [400, rules.HELPDESK_RANGE]])
  // استفسار مفتوح من غير رد، واستفسار فرع ب (برّه نطاق فرع أ)
  const open = expectStatus(await ask(users.other, 'INQUIRY_PAYROLL', 'محتاج شرح لقسيمة الراتب'), 201)
  expectStatus(await ask(users.b1, 'INQUIRY_GENERAL', 'سؤال من فرع ب'), 201)
  const seen = expectStatus(await request(users.lead, 'GET', R), 200)
  // الرضا: متوسط التقييمين (4، واللي كسب من الضغطتين: 2 أو 3)
  const raced = (await repo('RequestServiceRating').findOneByOrFail({ requestId: state.second })).rating
  assert.deepEqual([seen.firstResponseLimitHours, seen.totals.total, seen.totals.open, seen.totals.resolved, seen.totals.rated, seen.totals.satisfaction, seen.totals.firstResponseBreached, seen.totals.resolutionBreached],
    [24, 3, 1, 2, 2, (4 + raced) / 2, 0, 0])
  assert.deepEqual(seen.types.map(row => [row.code, row.name, row.total, row.open, row.resolved, row.rated]), [['INQUIRY_PAYROLL', 'استفسار عن الراتب', 2, 1, 1, 1], ['INQUIRY_GENERAL', 'استفسار عام', 1, 0, 1, 1]])
  assert.ok(seen.totals.avgFirstResponseHours !== null && seen.totals.avgFirstResponseHours >= 0 && seen.totals.avgResolutionHours !== null)
  // فرع ب شايف استفساره بس؛ وحساب من غير قيد فروع شايف الكل
  assert.deepEqual([expectStatus(await request(users.leadB, 'GET', R), 200).totals.total, expectStatus(await request(users.admin, 'GET', R), 200).totals.total], [1, 4])
  // المهل: أول رد بعد 30 ساعة (المهلة 24) = متجاوز؛ والمفتوح من غير رد من يومين = متجاوز؛ وموعد المهمة فات = مهلة الحل متجاوزة
  const hours = count => new Date(Date.now() - count * 3600000)
  await repo('Request').update({ id: state.first }, { createdAt: hours(31) })
  await repo('Comment').update({ entityType: 'request', entityId: state.first, internal: false }, { createdAt: hours(1) })
  await repo('Request').update({ id: open.id }, { createdAt: hours(50) })
  await ds.query('UPDATE t SET t.[dueDate] = @1 FROM [tasks] t INNER JOIN [requests] r ON r.[executionTaskId] = t.[id] WHERE r.[id] = @0', [open.id, '2020-01-01'])
  const late = expectStatus(await request(users.lead, 'GET', R), 200)
  assert.deepEqual([late.totals.firstResponseBreached, late.totals.resolutionBreached, late.types.find(row => row.code === 'INQUIRY_PAYROLL').firstResponseBreached], [2, 1, 2])
  assert.ok(late.totals.avgFirstResponseHours >= 10, 'أول رد اتحسب من أول تعليق ظاهر من غير صاحب الطلب')
  // المهلة إعداد: 48 ساعة ← الرد بعد 30 ساعة مابقاش متجاوز (والمفتوح من 50 ساعة لسه متجاوز)
  await repo('RequestsConfig').save({ key: rules.HELPDESK_FIRST_RESPONSE_KEY, value: '48' })
  const relaxed = expectStatus(await request(users.lead, 'GET', R), 200)
  assert.deepEqual([relaxed.firstResponseLimitHours, relaxed.totals.firstResponseBreached], [48, 1])
  // فترة برّه التواريخ = فاضي
  assert.equal(expectStatus(await request(users.lead, 'GET', R + '?from=2020-01-01&to=2020-01-31'), 200).totals.total, 0)
  // الموديول لما يتقفل: المسارات مقفولة، والاستفسار المفتوح بيكمّل مهمته
  expectStatus(await request(users.admin, 'PUT', '/modules/helpdesk', { enabled: false }), 200); modules.invalidate()
  try {
    assert.deepEqual([(await request(users.asker, 'GET', H + '/mine')).status, (await request(users.lead, 'GET', R)).status], [404, 404])
  } finally { expectStatus(await request(users.admin, 'PUT', '/modules/helpdesk', { enabled: true }), 200); modules.invalidate() }
})

test('HD-03: قاعدة المعرفة — الإدارة بالصلاحية وبنطاق الفروع، والموظف بيشوف المنشور اللي في جمهوره بس (بحث بكلمة أو بنوع استفسار)، ولينك لسياسة من غير تكرار', async () => {
  const kb = require('../src/helpdesk/knowledge.service')
  const A = H + '/articles'
  const branchAudience = branch => ({ mode: 'all', where: { mode: 'branches', ids: [branch.id] } })
  const article = (extra = {}) => ({ title: 'ليه الراتب اتخصم منه؟', body: 'الخصم بييجي من الغياب أو التأخير. راجع قسيمة الراتب.', typeCode: 'INQUIRY_PAYROLL', keywords: 'خصم غياب قسيمة',
    audience: branchAudience(org.branchA), isPublished: true, ...extra })
  const empty = expectStatus(await request(users.asker, 'GET', A), 200)
  assert.deepEqual([empty.articles, empty.types.map(row => row.code).sort()], [[], ['INQUIRY_GENERAL', 'INQUIRY_PAYROLL']])
  // الإدارة: بالصلاحية، والقيم، وحساب الفروع بيكتب لفروعه بس
  assert.deepEqual([(await request(users.asker, 'POST', A, article())).status, (await request(users.asker, 'GET', A + '/manage')).status], [403, 403])
  for (const [change, message] of [[{ title: 'ا' }, kb.KB_TITLE], [{ body: '  ' }, kb.KB_BODY], [{ typeCode: 'SUGGESTION' }, kb.KB_TYPE], [{ typeCode: 'NOPE' }, kb.KB_TYPE], [{ policyId: 987654 }, kb.KB_POLICY],
    [{ keywords: 'ك'.repeat(501) }, kb.KB_KEYWORDS], [{ isPublished: 'yes' }, '«منشور» نعم أو لا']]) assert.deepEqual(answer(await request(users.lead, 'POST', A, article(change))), [400, message], JSON.stringify(change).slice(0, 60))
  for (const audience of [null, branchAudience(org.branchB), { mode: 'all', where: { mode: 'departments', ids: [1] } }]) {
    assert.deepEqual(answer(await request(users.lead, 'POST', A, article({ audience }))), [403, kb.KB_BRANCH_AUDIENCE], JSON.stringify(audience))
  }
  assert.equal(await repo('KbArticle').count(), 0)
  const policy = await repo('Policy').save({ title: 'لائحة الحضور والانصراف', category: null, audience: null, isMandatory: false, graceDays: 0, graceFrom: null, status: 'PUBLISHED', createdByUserId: users.admin.id,
    createdAt: new Date(), withdrawnAt: null, withdrawnByUserId: null })
  const mine = expectStatus(await request(users.lead, 'POST', A, article({ policyId: policy.id })), 201)
  assert.deepEqual([mine.title, mine.typeName, mine.keywords, mine.audience, mine.policyTitle, mine.isPublished],
    ['ليه الراتب اتخصم منه؟', 'استفسار عن الراتب', 'خصم غياب قسيمة', { ...branchAudience(org.branchA), ids: [] }, 'لائحة الحضور والانصراف', true])
  const general = expectStatus(await request(users.admin, 'POST', A, { title: 'إزاي أقدّم طلب؟', body: 'من شاشة الطلبات اختار النوع واملأ الخانات.', isPublished: true }), 201)
  const draft = expectStatus(await request(users.admin, 'POST', A, { title: 'مقال لسه مسودة', body: 'نص المسودة' }), 201)
  const other = expectStatus(await request(users.admin, 'POST', A, article({ title: 'مقال فرع ب', audience: branchAudience(org.branchB) })), 201)
  assert.deepEqual([general.audience, general.typeCode, draft.isPublished], [null, null, false])
  // قايمة الإدارة بنطاق الفروع: حساب فرع أ شايف مقالات فروعه بس
  assert.deepEqual([expectStatus(await request(users.lead, 'GET', A + '/manage'), 200).articles.map(row => row.id), expectStatus(await request(users.admin, 'GET', A + '/manage'), 200).articles.length], [[mine.id], 4])

  // الموظف: المنشور اللي في جمهوره بس — بكلمة، وبنوع (مقالات النوع الأول وبعدها العامة)
  const titles = async (user, query = '') => expectStatus(await request(user, 'GET', A + query), 200).articles.map(row => row.title)
  assert.deepEqual([await titles(users.asker), await titles(users.asker, '?typeCode=INQUIRY_PAYROLL'), await titles(users.asker, '?typeCode=INQUIRY_GENERAL'), await titles(users.asker, `?q=${encodeURIComponent('غياب')}`),
    await titles(users.asker, `?q=${encodeURIComponent('مش موجود')}`), await titles(users.b1), (await request(users.asker, 'GET', A + '?q=' + 'x'.repeat(101))).status],
  [['إزاي أقدّم طلب؟', 'ليه الراتب اتخصم منه؟'], ['ليه الراتب اتخصم منه؟', 'إزاي أقدّم طلب؟'], ['إزاي أقدّم طلب؟'], ['ليه الراتب اتخصم منه؟'], [], ['مقال فرع ب', 'إزاي أقدّم طلب؟'], 400])
  const listed = expectStatus(await request(users.asker, 'GET', A), 200).articles.find(row => row.id === mine.id)
  assert.deepEqual([listed.typeName, listed.hasPolicy, listed.excerpt.startsWith('الخصم بييجي'), 'body' in listed, 'audience' in listed], ['استفسار عن الراتب', true, true, false, false])
  // القراءة: مقال برّه الجمهور، أو مسودة، أو مش موجود = نفس الرد
  const read = expectStatus(await request(users.asker, 'GET', A + '/' + mine.id), 200)
  assert.deepEqual([read.title, read.body.includes('قسيمة الراتب'), read.policy], ['ليه الراتب اتخصم منه؟', true, { id: policy.id, title: 'لائحة الحضور والانصراف' }])
  for (const hidden of [other.id, draft.id, 987654]) assert.deepEqual(answer(await request(users.asker, 'GET', A + '/' + hidden)), [404, kb.KB_NOT_FOUND], String(hidden))
  assert.equal((await request(users.nobody ?? users.agent, 'GET', A + '/' + general.id)).status, 404, 'حساب من غير ملف موظف مالوش جمهور')
  // التعديل: في نطاق الحساب وإلا «غير موجود»، وبالخانات اللي اتبعتت بس؛ والسحب بيخفيه
  assert.deepEqual([answer(await request(users.leadB, 'PATCH', A + '/' + mine.id, { title: 'تغيير' })), answer(await request(users.lead, 'PATCH', A + '/' + general.id, { title: 'تغيير' })),
    answer(await request(users.lead, 'PATCH', A + '/' + mine.id, { audience: null }))], [[404, kb.KB_NOT_FOUND], [404, kb.KB_NOT_FOUND], [403, kb.KB_BRANCH_AUDIENCE]])
  const edited = expectStatus(await request(users.lead, 'PATCH', A + '/' + mine.id, { keywords: ' خصم  تأخير ', policyId: null }), 200)
  assert.deepEqual([edited.title, edited.keywords, edited.policyId, edited.typeCode, edited.isPublished], ['ليه الراتب اتخصم منه؟', 'خصم تأخير', null, 'INQUIRY_PAYROLL', true])
  expectStatus(await request(users.lead, 'PATCH', A + '/' + mine.id, { isPublished: false }), 200)
  assert.deepEqual([await titles(users.asker), (await request(users.asker, 'GET', A + '/' + mine.id)).status], [['إزاي أقدّم طلب؟'], 404])
})
