'use strict'
// B6.7 على SQL حقيقي: مساعد التنفيذ — «اعمل مكافأة 500 لفريق الإنتاج» بتطلّع معاينة بالأسماء والتكلفة والسلسلة (= معاينة الشاشة بالحرف) ومفيش حاجة بتتكتب،
// وبعد تأكيد صاحبها بتتعمل بنفس مسار الشاشة وتدخل سلسلتها؛ مرة واحدة بالظبط (تأكيدين متزامنين = دفعة واحدة)؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛
// قرار الموارد البشرية النهائي ظاهر في المعاينة؛ اللي برّه النطاق «مش متاح»؛ وطلب الإجازة بنفس النمط. كل اقتراح وقراره في ai_actions.
// المزوّد وهمي ومكتوب جوه الاختبار: مفيش نداء لنموذج حقيقي. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_aiaction_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_aiaction_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-aiaction-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/ai/ai-rules')
let master, pool, app, ds, base, modules, ai, created = false
const B = {}, D = {}, T = {}, U = {}, E = {}, K = {}
const REASON = 'أداء متميز في تسليم طلبية الربع الثالث للعميل'
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
const employee = (code, name, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: B.a.id, departmentId: D.a.id, teamId: null, managerEmployeeId: null, joinDate: '2020-01-01',
  basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, role, employeeRow, permissions = [], extra = {}) => repo('User').save({ email: `${label}@aiaction.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role,
  branchId: B.a.id, employeeId: employeeRow?.id ?? null, permissions: JSON.stringify(permissions), isActive: true, ...extra })
const actionRow = id => repo('AiAction').findOneByOrFail({ id })
const count = async table => (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.[${table}]`)).recordset[0].n
// أول يوم اتنين بعد شهر (واليوم اللي بعده): بعيد عن نهاية الأسبوع
const future = offset => { const date = new Date(Date.now() + 30 * 86400000); while (date.getDay() !== 1) date.setDate(date.getDate() + 1); date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

// المزوّد الوهمي: أول دور ينادي الأدوات اللي الاختبار حددها، والتاني يرد بنتايجها بالحرف
const fake = { name: 'fake', model: 'fake-1', seen: [], plan: null, async turn(input) { this.seen.push(JSON.parse(JSON.stringify(input))); return this.plan(input) } }
const scripted = calls => input => (input.messages.at(-1).role === 'user'
  ? { text: '', toolCalls: calls.map((call, index) => ({ id: 'call-' + index, name: call.name, input: call.input ?? {} })) }
  : { text: 'RESULT ' + input.messages.filter(message => message.role === 'tool').map(message => message.result).join(' | '), toolCalls: [] })
async function ask(user, question, calls) {
  fake.plan = scripted(calls); fake.seen = []
  const body = ok(await request(user, 'POST', '/ai/ask', { question }))
  return { body, results: body.answer.replace(/^RESULT /, '').split(' | ').map(text => JSON.parse(text)), sentTools: fake.seen[0].tools.map(tool => tool.name), system: fake.seen[0].system }
}
const bonusCall = (extra = {}) => [{ name: 'propose_bonus', input: { bonusType: 'فورية', amount: '500', targetKind: 'TEAM', targetNames: ['الإنتاج'], reason: REASON, ...extra } }]
const confirm = (user, id) => request(user, 'POST', `/ai/actions/${id}/confirm`)

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  // مفيش مزوّد حقيقي في الاختبار حتى لو ملف البيئة فيه مفتاح
  delete process.env.AI_PROVIDER; delete process.env.AI_API_KEY; delete process.env.AI_MODEL
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  ai = app.get(require('../src/ai/ai.service').AiService)
  ai.useProvider(fake)
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  pool = await new sql.ConnectionPool({ ...connection, database }).connect()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await require('../src/seed/seed-requests').seedRequests(ds)
  await repo('RequestsConfig').save([{ key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' }])
  B.a = await repo('Branch').save({ code: 'AX_A', name: 'فرع المصنع' })
  B.b = await repo('Branch').save({ code: 'AX_B', name: 'فرع المعرض' })
  D.a = await repo('Department').save({ branchId: B.a.id, name: 'قسم التشغيل', code: 'AX_DA', isActive: true })
  D.b = await repo('Department').save({ branchId: B.b.id, name: 'قسم البيع', code: 'AX_DB', isActive: true })
  T.production = await repo('Team').save({ departmentId: D.a.id, name: 'فريق الإنتاج', code: 'AX_TP' })
  T.maintenance = await repo('Team').save({ departmentId: D.a.id, name: 'فريق الصيانة', code: 'AX_TM' })
  T.sales = await repo('Team').save({ departmentId: D.b.id, name: 'فريق المبيعات', code: 'AX_TS' })
  E.head = await employee('AX_HD', 'مدير التشغيل')
  E.leader = await employee('AX_TL', 'قائد الفريقين', { managerEmployeeId: E.head.id })
  E.p1 = await employee('AX_P1', 'عامل الإنتاج الأول', { teamId: T.production.id, managerEmployeeId: E.leader.id })
  E.p2 = await employee('AX_P2', 'عامل الإنتاج التاني', { teamId: T.production.id, managerEmployeeId: E.leader.id })
  E.p3 = await employee('AX_P3', 'عامل الإنتاج التالت', { teamId: T.production.id, managerEmployeeId: E.leader.id })
  E.m1 = await employee('AX_M1', 'فني الصيانة', { teamId: T.maintenance.id, managerEmployeeId: E.leader.id })
  E.s1 = await employee('AX_S1', 'بائع المعرض', { branchId: B.b.id, departmentId: D.b.id, teamId: T.sales.id })
  await repo('Department').update(D.a.id, { managerEmployeeId: E.head.id })
  await repo('Team').update(T.production.id, { leaderEmployeeId: E.leader.id })
  await repo('Team').update(T.maintenance.id, { leaderEmployeeId: E.leader.id })
  U.admin = await repo('User').save({ email: 'admin@aiaction.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.leader = await account('leader', 'employee', E.leader)
  U.worker = await account('worker', 'employee', E.p1)
  U.hr = await account('hr', 'hr_manager', null, ['bonuses.view', 'bonuses.approve', 'bonuses.manage', 'payroll.view'])
  K.spot = ok(await request(U.admin, 'POST', '/bonuses/types', { code: 'SPOT', nameAr: 'مكافأة فورية', calcMethod: 'FIXED_AMOUNT' }), 201)
  K.yearly = ok(await request(U.admin, 'POST', '/bonuses/types', { code: 'YEARLY', nameAr: 'مكافأة سنوية', calcMethod: 'FIXED_AMOUNT' }), 201)
  // سلسلة طلب الإجازة: المدير المباشر (البذرة بتعملها فاضية)، ونوع إجازة من غير رصيد وبأيام تقويم
  const chain = await repo('ApprovalChain').findOneByOrFail({ code: 'CH_LEAVE' })
  ok(await request(U.admin, 'PATCH', `/settings/approval-chains/${chain.id}/steps`, { steps: [{ approverRole: 'direct_manager_of_requester', slaDays: 3 }] }))
  await repo('LeaveType').save([{ code: 'AX_CASUAL', nameAr: 'إجازة عارضة', isPaid: true, balanceType: 'none', category: 'OCCASION', countingMode: 'ALL_DAYS', isActive: true }])
  await pool.request().query(`UPDATE dbo.leave_types SET [isActive] = 0 WHERE [code] <> N'AX_CASUAL'`)
  ok(await request(U.admin, 'PUT', '/modules/ai', { enabled: true }))
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_READ_FEATURE}`, { enabled: true })); modules.invalidate()
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

test('AX-01: الميزة مقفولة افتراضيًا — أدوات الاقتراح مابتتبعتش للنموذج ولو ناداها مابتتنفّذش، ومسار التأكيد مش موجود؛ بعد الفتح بتظهر للي موديولها مفعّل له', async () => {
  const closed = await ask(U.leader, 'اعمل مكافأة 500 لفريق الإنتاج', bonusCall())
  assert.deepEqual([closed.sentTools.filter(name => name.startsWith('propose_')), closed.results, closed.body.suggestion, closed.system], [[], ['أداة مش معروفة'], null, rules.READ_ASSISTANT_SYSTEM])
  assert.deepEqual([ok(await request(U.leader, 'GET', '/ai/status')).actions, (await confirm(U.leader, closed.body.id)).status, (await request(U.leader, 'POST', `/ai/actions/${closed.body.id}/dismiss`)).status], [false, 404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_ACTION_FEATURE}`, { enabled: true })); modules.invalidate()
  assert.equal(ok(await request(U.leader, 'GET', '/ai/status')).actions, true)
  const open = await ask(U.leader, 'رصيدي كام؟', [{ name: 'my_requests' }])
  assert.deepEqual([open.sentTools.filter(name => name.startsWith('propose_')), open.system, open.body.suggestion], [['propose_bonus', 'propose_leave_request'], rules.ACTION_ASSISTANT_SYSTEM, null])
  // حساب من غير ملف موظف: مفيش طلب إجازة يتجهّز له
  assert.deepEqual((await ask(U.hr, 'إيه الأخبار؟', [{ name: 'my_requests' }])).sentTools.filter(name => name.startsWith('propose_')), ['propose_bonus'])
  // سؤال قراءة مالوش اقتراح: تأكيده «غير موجود»
  refused(await confirm(U.leader, open.body.id), 404, rules.AI_SUGGESTION_NOT_FOUND)
  assert.deepEqual([await count('bonus_requests'), await count('bonus_batches')], [0, 0])
})

test('AX-02: «اعمل مكافأة 500 لفريق الإنتاج» — المعاينة = معاينة الشاشة (الأسماء والمبالغ والإجمالي والسلسلة) ومفيش حاجة اتكتبت؛ وبعد تأكيد صاحبها بتتعمل بنفس المسار وتدخل سلسلتها؛ مرة واحدة بالظبط', async () => {
  const asked = await ask(U.leader, 'اعمل مكافأة 500 لفريق الإنتاج', bonusCall())
  const suggestion = asked.body.suggestion
  const screen = ok(await request(U.leader, 'POST', '/bonuses/preview', { bonusTypeId: K.spot.id, inputValue: '500', reason: REASON, targetPeriod: ok(await request(U.leader, 'GET', '/bonuses/creatable')).currentPeriod,
    selection: { mode: 'TEAM', ids: [T.production.id] } }), 201)
  assert.deepEqual(suggestion.rows.map(row => [row.name, row.code, row.amount, row.ready, row.chain]), screen.rows.map(row => [row.fullName, row.employeeCode, row.amount, row.status === 'READY', row.steps.map(step => step.roleLabel)]))
  assert.deepEqual([suggestion.kind, suggestion.rows.map(row => row.name), suggestion.total, suggestion.total, suggestion.rows.every(row => row.chain.length > 0), suggestion.notice, suggestion.id],
    ['BONUS_BULK', ['عامل الإنتاج الأول', 'عامل الإنتاج التاني', 'عامل الإنتاج التالت'], '1500.00', screen.totals.totalAmount, true, 'بعد التأكيد كل مكافأة بتدخل سلسلة اعتمادها.', asked.body.id])
  assert.deepEqual(asked.results[0], { status: 'PREVIEW_READY', type: 'مكافأة فورية', targetPeriod: screen.targetPeriod, ready: 3, skipped: 0, totalAmount: '1500.00', instant: false })
  assert.deepEqual(asked.body.sources, [])
  // المعاينة مابتكتبش: ولا مكافأة ولا دفعة، والسجل فيه الاقتراح مستني قراره
  assert.deepEqual([await count('bonus_requests'), await count('bonus_batches')], [0, 0])
  const pending = await actionRow(suggestion.id)
  assert.deepEqual([pending.kind, pending.confirmed, pending.confirmedByUserId, pending.status, JSON.parse(pending.suggestion).previewHash, JSON.parse(pending.tools).map(item => [item.name, item.ok])],
    [rules.AI_KIND_ACTION, null, null, 'OK', screen.previewHash, [['propose_bonus', true]]])
  // مش صاحب الاقتراح (حتى مدير النظام): نفس رد اللي مش موجود
  for (const other of [U.worker, U.admin, U.hr]) refused(await confirm(other, suggestion.id), 404, rules.AI_SUGGESTION_NOT_FOUND)
  refused(await confirm(U.leader, 999999), 404, rules.AI_SUGGESTION_NOT_FOUND)
  // تأكيدين متزامنين من صاحبها: واحد بس بينفّذ
  const both = await Promise.all([confirm(U.leader, suggestion.id), confirm(U.leader, suggestion.id)])
  assert.deepEqual(both.map(response => response.status).sort(), [200, 409])
  const done = both.find(response => response.status === 200).body
  assert.deepEqual([done.executed, done.result.kind, done.result.created, done.result.skipped, done.result.totalAmount, done.result.statuses], [true, 'BONUS_BULK', 3, 0, '1500.00', ['IN_APPROVAL']])
  refused(both.find(response => response.status === 409), 409, rules.AI_SUGGESTION_DECIDED)
  refused(await confirm(U.leader, suggestion.id), 409, rules.AI_SUGGESTION_DECIDED)
  // اللي اتعمل = اللي مسار الشاشة بيعمله: دفعة واحدة، وكل مكافأة باسم المُقترِح وفي سلسلتها
  const rows = await repo('BonusRequest').find({ order: { id: 'ASC' } })
  assert.deepEqual([await count('bonus_batches'), rows.map(row => [row.employeeId, Number(row.estimatedAmount), row.status, row.creatorUserId, row.batchId])],
    [1, [E.p1, E.p2, E.p3].map(emp => [emp.id, 500, 'IN_APPROVAL', U.leader.id, done.result.batchId])])
  assert.deepEqual(rows.map(row => JSON.parse(row.steps).map(step => step.role)), screen.rows.map(row => row.steps.map(step => step.role)))
  const decided = await actionRow(suggestion.id)
  assert.deepEqual([decided.confirmed, decided.confirmedByUserId, decided.status, decided.confirmedAt instanceof Date, JSON.parse(decided.answer).batchId], [true, U.leader.id, 'EXECUTED', true, done.result.batchId])
})

test('AX-03: الحدود — برّه النطاق والاسم اللي مش موجود «مش متاح»، والناقص أو الغامض بيرجع للمستخدم باختياراته؛ معاينة اتغيّرت أو قدمت مابتتنفّذش؛ والإلغاء بيتسجّل', async () => {
  const before = [await count('bonus_requests'), await count('bonus_batches')]
  // موظف مالوش حق يقترح مكافأة، وفريق برّه نطاق القائد، وفريق مش موجود: نفس الرد ومفيش اقتراح
  for (const [user, names] of [[U.worker, ['الإنتاج']], [U.leader, ['المبيعات']], [U.leader, ['فريق مش موجود']]]) {
    const denied = await ask(user, 'اعمل مكافأة', bonusCall({ targetNames: names }))
    assert.deepEqual([denied.results, denied.body.suggestion], [[rules.AI_UNAVAILABLE_DATA], null])
  }
  // ناقص أو غامض: نوع المكافأة (نوعين)، واسم بيطابق فريقين، ومبلغ مش رقم، وسبب فاضي
  const noType = await ask(U.leader, 'اعمل مكافأة', bonusCall({ bonusType: undefined }))
  assert.deepEqual(noType.results[0], { status: 'NEEDS_INPUT', missing: 'نوع المكافأة', options: ['مكافأة فورية', 'مكافأة سنوية'] })
  assert.deepEqual((await ask(U.leader, 'اعمل مكافأة', bonusCall({ targetNames: ['فريق'] }))).results[0], { status: 'NEEDS_INPUT', missing: 'الاسم بالظبط (أكتر من فريق بالاسم ده)', options: ['فريق الإنتاج', 'فريق الصيانة'] })
  assert.equal((await ask(U.leader, 'اعمل مكافأة', bonusCall({ amount: 'كتير' }))).results[0].missing, 'قيمة المكافأة (رقم)')
  assert.equal((await ask(U.leader, 'اعمل مكافأة', bonusCall({ reason: ' ' }))).results[0].missing, 'سبب المكافأة')
  // رفض الخدمة لشكل المدخلات بيرجع برسالته (زي الشاشة) ومن غير اقتراح
  const short = await ask(U.leader, 'اعمل مكافأة', bonusCall({ reason: 'قصير' }))
  assert.deepEqual([short.results[0].status, typeof short.results[0].message, short.body.suggestion], ['REFUSED', 'string', null])
  // نفس المكافأة تاني لنفس الفريق والشهر: قاعدة التكرار القايمة بتمنعها من المعاينة (مفيش حد جاهز = مفيش اقتراح)
  const again = await ask(U.leader, 'اعمل مكافأة 500 لفريق الإنتاج', bonusCall())
  assert.deepEqual([again.results[0].status, again.results[0].reasons.length > 0, again.body.suggestion], ['NOTHING_READY', true, null])
  // اقتراح واحد في السؤال: التاني مابيتبنيش
  const twice = await ask(U.leader, 'اعمل مكافأتين', [...bonusCall({ targetNames: ['الصيانة'] }), ...bonusCall({ targetNames: ['الصيانة'], amount: '900' })])
  assert.deepEqual([twice.results[0].status, twice.results[1], twice.body.suggestion.rows.map(row => [row.name, row.amount])], ['PREVIEW_READY', 'فيه اقتراح اتجهّز في السؤال ده — اقتراح واحد في المرة', [['فني الصيانة', '500.00']]])
  // إلغاء: بيتسجّل إن صاحبه رفضه، وبعده مايتأكدش
  assert.deepEqual(ok(await request(U.leader, 'POST', `/ai/actions/${twice.body.suggestion.id}/dismiss`)), { id: twice.body.suggestion.id, dismissed: true })
  const dismissed = await actionRow(twice.body.suggestion.id)
  assert.deepEqual([dismissed.confirmed, dismissed.confirmedByUserId, dismissed.status], [false, U.leader.id, 'DISMISSED'])
  refused(await confirm(U.leader, twice.body.suggestion.id), 409, rules.AI_SUGGESTION_DECIDED)
  // معاينة قدمت (أكتر من المهلة): مابتتنفّذش
  const old = await ask(U.leader, 'اعمل مكافأة للصيانة', bonusCall({ targetNames: ['الصيانة'] }))
  assert.match(database, NAME)
  await pool.request().input('id', old.body.suggestion.id).query(`UPDATE dbo.ai_actions SET [createdAt] = DATEADD(MINUTE, -16, [createdAt]) WHERE [id] = @id`)
  refused(await confirm(U.leader, old.body.suggestion.id), 409, rules.AI_SUGGESTION_EXPIRED)
  // معاينة اتغيّرت بعد عرضها (موظف خرج من الفريق): الخدمة بترفض زي الشاشة ومفيش مكافأة، والاقتراح بيتقفل
  const stale = await ask(U.leader, 'اعمل مكافأة للصيانة', bonusCall({ targetNames: ['الصيانة'] }))
  await repo('Employee').update(E.m1.id, { teamId: null })
  try {
    const response = await confirm(U.leader, stale.body.suggestion.id)
    assert.deepEqual([response.status, response.body.code], [409, 'BONUS_PREVIEW_STALE'])
    const failed = await actionRow(stale.body.suggestion.id)
    assert.deepEqual([failed.confirmed, failed.status], [true, 'EXEC_FAILED'])
    refused(await confirm(U.leader, stale.body.suggestion.id), 409, rules.AI_SUGGESTION_DECIDED)
  } finally { await repo('Employee').update(E.m1.id, { teamId: T.maintenance.id }) }
  assert.deepEqual([await count('bonus_requests'), await count('bonus_batches')], before)
  // موديول الرواتب اتقفل بعد المعاينة: التأكيد «غير موجود» ومفيش مكافأة
  const gated = await ask(U.leader, 'اعمل مكافأة للصيانة', bonusCall({ targetNames: ['الصيانة'] }))
  for (const key of ['loans', 'payroll']) ok(await request(U.admin, 'PUT', `/modules/${key}`, { enabled: false }))
  modules.invalidate()
  try { refused(await confirm(U.leader, gated.body.suggestion.id), 404, rules.AI_SUGGESTION_NOT_FOUND) } finally {
    for (const key of ['payroll', 'loans']) ok(await request(U.admin, 'PUT', `/modules/${key}`, { enabled: true }))
    modules.invalidate()
  }
  assert.deepEqual([(await actionRow(gated.body.suggestion.id)).status, (await actionRow(gated.body.suggestion.id)).confirmed], ['EXEC_FAILED', true])
  assert.deepEqual([await count('bonus_requests'), await count('bonus_batches')], before)
})

test('AX-04: قرار الموارد البشرية النهائي ظاهر في المعاينة — «هتتعتمد فورًا»، وبعد التأكيد المكافآت معتمدة زي ما مسار الشاشة بيعمل لصاحب السلطة', async () => {
  const before = await count('bonus_requests')
  const asked = await ask(U.hr, 'اعمل مكافأة 300 لفني الصيانة', bonusCall({ amount: '300', targetKind: 'EMPLOYEES', targetNames: ['AX_M1'] }))
  assert.deepEqual([asked.results[0].instant, asked.results[0].ready, asked.body.suggestion.notice, asked.body.suggestion.rows.map(row => [row.name, row.amount])],
    [true, 1, 'هتتعتمد فورًا من غير سلسلة اعتماد: قرارك كموارد بشرية نهائي.', [['فني الصيانة', '300.00']]])
  assert.equal(await count('bonus_requests'), before)
  const done = ok(await confirm(U.hr, asked.body.suggestion.id))
  assert.deepEqual([done.result.created, done.result.statuses], [1, ['APPROVED']])
  const row = await repo('BonusRequest').findOneOrFail({ where: { employeeId: E.m1.id }, order: { id: 'DESC' } })
  assert.deepEqual([row.status, Number(row.estimatedAmount), row.creatorUserId, row.decidedByUserId], ['APPROVED', 300, U.hr.id, U.hr.id])
})

test('AX-05: طلب الإجازة — معاينة بالتفاصيل من غير كتابة، وبعد التأكيد الطلب بيتعمل بمسار الطلبات نفسه وبيدخل سلسلة اعتماده؛ والنوع الناقص بيرجع باختياراته', async () => {
  const from = future(0), to = future(1), before = await count('requests')
  assert.deepEqual((await ask(U.worker, 'عايز إجازة', [{ name: 'propose_leave_request', input: { fromDate: from, toDate: to } }])).results[0], { status: 'NEEDS_INPUT', missing: 'نوع الإجازة', options: ['إجازة عارضة'] })
  assert.equal((await ask(U.worker, 'عايز إجازة', [{ name: 'propose_leave_request', input: { leaveType: 'عارضة', fromDate: to, toDate: from } }])).results[0].missing, 'تاريخ أول يوم وآخر يوم في الإجازة')
  const asked = await ask(U.worker, 'عايز إجازة عارضة', [{ name: 'propose_leave_request', input: { leaveType: 'عارضة', fromDate: from, toDate: to, reason: 'ظرف عائلي' } }])
  const suggestion = asked.body.suggestion
  assert.deepEqual([suggestion.kind, suggestion.title, suggestion.details, suggestion.rows, suggestion.total],
    ['LEAVE_REQUEST', 'طلب إجازة عارضة', [{ label: 'نوع الإجازة', value: 'إجازة عارضة' }, { label: 'من', value: from }, { label: 'إلى', value: to }, { label: 'السبب', value: 'ظرف عائلي' }], [], null])
  assert.equal(await count('requests'), before)
  const done = ok(await confirm(U.worker, suggestion.id))
  const made = await repo('Request').findOneByOrFail({ id: done.result.requestId })
  const payload = JSON.parse(made.payload)
  assert.deepEqual([await count('requests'), made.typeCode, made.requesterId, made.createdByUserId, made.status, done.result.status, payload.leaveTypeCode, payload.fromDate, payload.toDate],
    [before + 1, 'LEAVE', E.p1.id, U.worker.id, 'UNDER_REVIEW', 'UNDER_REVIEW', 'AX_CASUAL', from, to])
  // دخل السلسلة العادية: واقف عند مديره المباشر (قائد الفريق)
  assert.deepEqual(ok(await request(U.leader, 'GET', '/requests/inbox')).map(row => row.id).includes(made.id), true)
  refused(await confirm(U.worker, suggestion.id), 409, rules.AI_SUGGESTION_DECIDED)
  assert.equal(await count('requests'), before + 1)
  // سجل الاستخدام: نوع الاستخدام وقرار صاحبه ظاهرين للمدقق
  const log = ok(await request(U.admin, 'GET', '/ai/actions')).actions.find(row => row.id === suggestion.id)
  assert.deepEqual([log.kind, log.confirmed, log.status], [rules.AI_KIND_ACTION, true, 'EXECUTED'])
})

test('AX-06 (B6.8): «اقتراحاتي المستنية» — اقتراح اتجهّز من أي قناة بيظهر لصاحبه في البوابة ويتأكد منها؛ اقتراح حد تاني، واللي اتقرر، واللي قدم مابيظهروش', async () => {
  const list = async user => ok(await request(user, 'GET', '/ai/suggestions')).suggestions
  assert.deepEqual([await list(U.leader), await list(U.worker)], [[], []])
  const from = future(7), to = future(8)
  const mine = await ask(U.worker, 'عايز إجازة عارضة الأسبوع الجاي', [{ name: 'propose_leave_request', input: { leaveType: 'عارضة', fromDate: from, toDate: to } }])
  const other = await ask(U.leader, 'اعمل مكافأة للصيانة', bonusCall({ targetNames: ['الصيانة'], amount: '150' }))
  const shown = await list(U.worker)
  assert.deepEqual(shown.map(row => [row.id, row.question, row.kind, row.title, row.details.slice(0, 3)]),
    [[mine.body.suggestion.id, 'عايز إجازة عارضة الأسبوع الجاي', 'LEAVE_REQUEST', 'طلب إجازة عارضة', [{ label: 'نوع الإجازة', value: 'إجازة عارضة' }, { label: 'من', value: from }, { label: 'إلى', value: to }]]])
  assert.equal(shown[0].expiresAt, mine.body.suggestion.expiresAt)
  assert.deepEqual((await list(U.leader)).map(row => [row.id, row.kind, row.total]), [[other.body.suggestion.id, 'BONUS_BULK', '150.00']])
  assert.deepEqual(await list(U.admin), [])
  // التأكيد من القايمة (جلسة تانية غير اللي سألت): بيتنفّذ وبيخرج من القايمة
  const before = await count('requests')
  ok(await confirm(U.worker, shown[0].id))
  assert.deepEqual([await count('requests'), await list(U.worker)], [before + 1, []])
  // اللي قدم مابيظهرش، واللي اتلغى مابيظهرش
  assert.match(database, NAME)
  await pool.request().input('id', other.body.suggestion.id).query('UPDATE dbo.ai_actions SET [createdAt] = DATEADD(MINUTE, -16, [createdAt]) WHERE [id] = @id')
  assert.deepEqual(await list(U.leader), [])
  const third = await ask(U.leader, 'اعمل مكافأة للصيانة', bonusCall({ targetNames: ['الصيانة'], amount: '175' }))
  assert.equal((await list(U.leader)).length, 1)
  ok(await request(U.leader, 'POST', `/ai/actions/${third.body.suggestion.id}/dismiss`))
  assert.deepEqual(await list(U.leader), [])
  // الميزة مقفولة: القايمة مش موجودة
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_ACTION_FEATURE}`, { enabled: false })); modules.invalidate()
  try { assert.equal((await request(U.worker, 'GET', '/ai/suggestions')).status, 404) } finally { ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_ACTION_FEATURE}`, { enabled: true })); modules.invalidate() }
})


test('P6C-A01: fresh identity cannot list, confirm or dismiss an old personal proposal', async t=>{
  ok(await request(U.admin,'PUT','/modules/features/'+rules.AI_ACTION_FEATURE,{enabled:true}));modules.invalidate();
  const made=await ask(U.worker,'P6C leave preview',[{name:'propose_leave_request',input:{leaveType:'AX_CASUAL',fromDate:future(14),toDate:future(14),reason:'P6C private appointment'}}]);
  const id=made.body.suggestion.id, before=await count('requests');
  ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:E.p2.id}));
  U.worker=await repo('User').findOneByOrFail({id:U.worker.id});
  assert.equal(ok(await request(U.worker,'GET','/ai/suggestions')).suggestions.some(x=>x.id===id),false);
  assert.equal((await confirm(U.worker,id)).status,404);
  assert.equal((await request(U.worker,'POST','/ai/actions/'+id+'/dismiss')).status,404);
  assert.equal(await count('requests'),before);assert.equal((await actionRow(id)).confirmed,null);
  ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:E.p1.id}));
  U.worker=await repo('User').findOneByOrFail({id:U.worker.id});
  t.diagnostic(JSON.stringify({closed:'fresh-rebinding',write:false}));
});
test('P6C-A04: account is rebound after authorization and before the proposal claim',async t=>{
  const made=await ask(U.worker,'P6C claim race',[{name:'propose_leave_request',input:{leaveType:'AX_CASUAL',fromDate:future(21),toDate:future(21),reason:'P6C race appointment'}}]);
  const id=made.body.suggestion.id, original=ai.claim;
  let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);
  ai.claim=async function(...args){if(args[1]===id){hit();await held}return original.apply(this,args)};
  const pending=confirm(U.worker,id);
  try{
    await Promise.race([reached,pending.then(()=>{throw Error('completed before claim barrier')}),new Promise((_,r)=>setTimeout(()=>r(Error('claim barrier timeout')),8000))]);
    ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:E.p2.id}));
    const fresh=await repo('User').findOneByOrFail({id:U.worker.id});release();const done=await pending;
    const row=done.body?.result?.requestId ? await repo('Request').findOneByOrFail({id:done.body.result.requestId}) : null;
    t.diagnostic(JSON.stringify({race:'before-claim',status:done.status,currentEmployee:fresh.employeeId,requestEmployee:row?.requesterId??null,action:(await actionRow(id)).status}));
    assert.equal(done.status,409);assert.equal(row,null);assert.equal(fresh.employeeId,E.p2.id);assert.equal((await actionRow(id)).confirmed,null);
  }finally{release();ai.claim=original;await pending.catch(()=>{});U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
});

async function claimInterleaving(offset,change){
 U.worker=await repo('User').findOneByOrFail({id:U.worker.id});
 const made=await ask(U.worker,'P6C identity boundary '+offset,[{name:'propose_leave_request',input:{leaveType:'AX_CASUAL',fromDate:future(offset),toDate:future(offset),reason:'P6C synthetic appointment'}}]);
 const id=made.body.suggestion.id,original=ai.claim;let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);
 ai.claim=async function(...args){if(args[1]===id){hit();await held}return original.apply(this,args)};
 const pending=confirm(U.worker,id);let done;
 try{
  await Promise.race([reached,pending.then(()=>{throw Error('finished before barrier')}),new Promise((_,r)=>setTimeout(()=>r(Error('barrier timeout')),8000))]);
  ok(await request(U.admin,'PATCH','/users/'+U.worker.id,change));release();done=await pending;
  const fresh=await repo('User').findOneByOrFail({id:U.worker.id}),action=await actionRow(id);
  return {done,fresh,action};
 }finally{release();ai.claim=original;await pending.catch(()=>{});U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
}
test('P6C-A09: disabling the account before claim still permits execution',async t=>{
 try{
  const {done,fresh,action}=await claimInterleaving(28,{isActive:false});
  t.diagnostic(JSON.stringify({race:'disabled-before-claim',status:done.status,isActive:fresh.isActive,action:action.status}));
  assert.equal(fresh.isActive,false);assert.equal(done.status,200);assert.equal(action.status,'EXECUTED');
 }finally{ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{isActive:true}));U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
});
test('P6C-A10: removing employee link before claim is refused with no write',async t=>{
 const originalEmployee=U.worker.employeeId;
 try{const {done,fresh,action}=await claimInterleaving(35,{employeeId:null});assert.equal(done.status,409);assert.equal(fresh.employeeId,null);assert.equal(action.confirmed,null);t.diagnostic(JSON.stringify({race:'unlink-before-claim',status:done.status,claimed:action.confirmed}));}
 finally{ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:originalEmployee}));U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
});
test('P6C-A11: current identity check remains correct while claim waits for the action row',async t=>{
 const made=await ask(U.worker,'P6C SQL wait',[{name:'propose_leave_request',input:{leaveType:'AX_CASUAL',fromDate:future(42),toDate:future(42)}}]);
 const id=made.body.suggestion.id,runner=ds.createQueryRunner();await runner.connect();await runner.startTransaction();
 await runner.manager.query('SELECT id FROM dbo.ai_actions WITH (UPDLOCK,ROWLOCK) WHERE id=@0',[id]);
 const original=ds.query;let hit,finished=false;const reached=new Promise(r=>hit=r);
 ds.query=async function(sql,...args){if(/^UPDATE dbo.ai_actions SET/.test(sql)&&args[0]?.[4]===id)hit();return original.call(this,sql,...args)};
 const pending=confirm(U.worker,id).then(x=>{finished=true;return x});let changing;
 try{
  await Promise.race([reached,pending.then(()=>{throw Error('claim finished before query barrier')})]);await new Promise(r=>setTimeout(r,300));assert.equal(finished,false);
  let changed=false;changing=request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:E.p1.id}).then(x=>{changed=true;return x});
  await Promise.race([changing,new Promise(r=>setTimeout(r,800))]);const changeCommittedBeforeUnlock=changed;
  await runner.commitTransaction();const [decision,moved]=await Promise.all([pending,changing]);ok(moved);
  t.diagnostic(JSON.stringify({race:'sql-row-wait',changeCommittedBeforeUnlock,decision:decision.status,action:(await actionRow(id)).status}));
  if(changeCommittedBeforeUnlock)assert.equal(decision.status,409);else assert.equal(decision.status,200);
 }finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();ds.query=original;await pending.catch(()=>{});if(changing)await changing.catch(()=>{});U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
});

test('P6C-A13: disabled HR account can still claim and instantly approve a bonus',async t=>{
 const person=await employee('P6C_PAYEE','P6C bonus recipient',{managerEmployeeId:E.leader.id});
 const made=await ask(U.hr,'P6C bonus identity boundary',bonusCall({targetKind:'EMPLOYEES',targetNames:[person.employeeCode],amount:'100'}));
 const id=made.body.suggestion.id,original=ai.claim;let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);
 ai.claim=async function(...args){if(args[1]===id){hit();await held}return original.apply(this,args)};
 const pending=confirm(U.hr,id);
 try{
  await Promise.race([reached,pending.then(()=>{throw Error('claim already completed')})]);
  ok(await request(U.admin,'PATCH','/users/'+U.hr.id,{isActive:false}));release();const done=await pending;
  const fresh=await repo('User').findOneByOrFail({id:U.hr.id}),bonuses=await repo('BonusRequest').find({where:{employeeId:person.id}});
  assert.equal(done.status,200);assert.equal(fresh.isActive,false);assert.equal(bonuses.length,1);assert.equal(bonuses[0].status,'APPROVED');
  t.diagnostic(JSON.stringify({race:'disabled-before-bonus-claim',http:done.status,accountActive:fresh.isActive,bonuses:bonuses.length,bonusStatus:bonuses[0].status}));
 }finally{release();ai.claim=original;await pending.catch(()=>{});ok(await request(U.admin,'PATCH','/users/'+U.hr.id,{isActive:true}));U.hr=await repo('User').findOneByOrFail({id:U.hr.id})}
});

test('P6C-A14: loss of HR authority before claim still produces an instantly approved bonus',async t=>{
 const person=await employee('P6C_PAYEE2','P6C second bonus recipient',{managerEmployeeId:E.leader.id});
 const made=await ask(U.hr,'P6C revoked HR authority',bonusCall({targetKind:'EMPLOYEES',targetNames:[person.employeeCode],amount:'125'}));
 const id=made.body.suggestion.id,original=ai.claim;let hit,release;const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);
 ai.claim=async function(...args){if(args[1]===id){hit();await held}return original.apply(this,args)};
 const pending=confirm(U.hr,id);
 try{
  await Promise.race([reached,pending.then(()=>{throw Error('claim already completed')})]);
  ok(await request(U.admin,'PATCH','/users/'+U.hr.id,{role:'employee'}));release();const done=await pending;
  const fresh=await repo('User').findOneByOrFail({id:U.hr.id}),bonuses=await repo('BonusRequest').find({where:{employeeId:person.id}});
  assert.equal(fresh.role,'employee');assert.equal(done.status,200);assert.equal(bonuses.length,1);assert.equal(bonuses[0].status,'APPROVED');
  t.diagnostic(JSON.stringify({race:'role-revoked-before-claim',http:done.status,currentRole:fresh.role,bonusStatus:bonuses[0].status,sessionVersion:U.hr.tokenVersion??0,currentVersion:fresh.tokenVersion}));
 }finally{release();ai.claim=original;await pending.catch(()=>{});ok(await request(U.admin,'PATCH','/users/'+U.hr.id,{role:'hr_manager'}));U.hr=await repo('User').findOneByOrFail({id:U.hr.id})}
});
test('P6C-A15: rebinding after successful claim retains the accepted identity boundary',async t=>{
 const made=await ask(U.worker,'P6C after claim control',[{name:'propose_leave_request',input:{leaveType:'AX_CASUAL',fromDate:future(49),toDate:future(49)}}]);
 const proposals=app.get(require('../src/ai/ai-proposals.service').AiProposalsService),original=proposals.execute,oldEmployee=U.worker.employeeId;let hit,release;
 const reached=new Promise(r=>hit=r),held=new Promise(r=>release=r);proposals.execute=async function(...args){hit();await held;return original.apply(this,args)};
 const pending=confirm(U.worker,made.body.suggestion.id);
 try{
  await reached;assert.equal((await actionRow(made.body.suggestion.id)).status,'EXECUTING');
  ok(await request(U.admin,'PATCH','/users/'+U.worker.id,{employeeId:E.p2.id}));release();const done=await pending;assert.equal(done.status,200);
  const requestRow=await repo('Request').findOneByOrFail({id:done.body.result.requestId});assert.equal(requestRow.requesterId,oldEmployee);
  t.diagnostic(JSON.stringify({control:'identity-change-after-claim',status:done.status,acceptedEmployee:oldEmployee,requestEmployee:requestRow.requesterId}));
 }finally{release();proposals.execute=original;await pending.catch(()=>{});U.worker=await repo('User').findOneByOrFail({id:U.worker.id})}
});
