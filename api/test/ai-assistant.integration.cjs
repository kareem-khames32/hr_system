'use strict'
// B6.6 على SQL حقيقي: مساعد القراءة وحوكمته — الموديول والميزة مقفولين افتراضيًا، من غير مزوّد أو قبل ترحيل 185 المساعد «مش متاح» ومفيش سؤال بيطلع،
// «رصيدي كام؟» بياناته = شاشة أرصدتي بالحرف، سؤال السياسة فيه اسمها ورقم نسختها، موظف برّه النطاق = «مش متاح» (نفس رد اللي مش موجود)،
// أداة موديولها مقفول أو مش في القايمة مابتتنفّذش، الخانات الحساسة مابتوصلش للمزوّد، وكل سؤال (نجح أو فشل) في ai_actions.
// المزوّد وهمي ومكتوب جوه الاختبار: مفيش نداء لنموذج حقيقي ومفيش اتصال برّه الجهاز. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_aiassist_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_aiassist_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-aiassist-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/ai/ai-rules')
const today = require('../src/policies/policy-rules').policyLocalDate(new Date())
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261011_185_ai_actions.sql')
let master, pool, app, ds, base, modules, ai, created = false, entityShape = []
const B = {}, U = {}, E = {}, P = {}
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
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const shapeOf = async () => (await pool.request().query(`SELECT c.[name], t.[name] AS [type], c.[max_length] AS [max], c.[is_nullable] AS [nullable], c.[is_identity] AS [identity]
  FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.ai_actions') ORDER BY c.[name]`)).recordset
const employee = (code, name, branch, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: branch.id, joinDate: '2022-03-01', basicSalary: 9000, status: 'active', isActive: true, ...extra })
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@aiassist.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', permissions: JSON.stringify(permissions), isActive: true, ...extra })
const actions = async () => (await pool.request().query('SELECT * FROM dbo.ai_actions ORDER BY [id]')).recordset
const lastAction = async () => (await actions()).at(-1)

// المزوّد الوهمي: بيسجّل كل اللي اتبعت له، وبيمشي بخطة الاختبار (أول دور ينادي الأدوات، والتاني يرد بنتايجها بالحرف)
const fake = { name: 'fake', model: 'fake-1', seen: [], plan: null, async turn(input) { this.seen.push(JSON.parse(JSON.stringify(input))); return this.plan(input) } }
const scripted = calls => input => (input.messages.at(-1).role === 'user'
  ? { text: '', toolCalls: calls.map((call, index) => ({ id: 'call-' + index, name: call.name, input: call.input ?? {} })) }
  : { text: 'RESULT ' + input.messages.filter(message => message.role === 'tool').map(message => message.result).join(' | '), toolCalls: [] })
/** سؤال بخطة أدوات: بيرجّع الرد، وناتج الأدوات اللي وصل للمزوّد (بعد الحجب) */
async function ask(user, question, calls) {
  fake.plan = scripted(calls); fake.seen = []
  const body = ok(await request(user, 'POST', '/ai/ask', { question }))
  const results = body.answer.replace(/^RESULT /, '').split(' | ').map(text => JSON.parse(text))
  return { body, results, sentTools: fake.seen[0].tools.map(tool => tool.name), system: fake.seen[0].system }
}

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
  ai.useProvider(null)
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
  // قاعدة قبل ترحيل 185: المزامنة عملت الجدول من الكيان — شكله بيتحفظ للمقارنة وبعدين بيتشال
  entityShape = await shapeOf()
  await pool.request().batch('DROP TABLE dbo.ai_actions')
  B.riyadh = await repo('Branch').save({ code: 'AI_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'AI_2', name: 'فرع القاهرة', country: 'EG' })
  E.r1 = await employee('AI-001', 'سالم الرياض', B.riyadh, { nationalId: '1099887766', phone: '0500000001', iban: 'SA4420000001234567891234', jobTitle: 'محاسب' })
  E.r2 = await employee('AI-002', 'ماجد الرياض', B.riyadh, { jobTitle: 'مندوب' })
  E.c1 = await employee('AI-003', 'هشام القاهرة', B.cairo, { jobTitle: 'مهندس' })
  U.admin = await repo('User').save({ email: 'admin@aiassist.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.staff = await account('staff', [], { branchId: B.riyadh.id, employeeId: E.r1.id })
  U.hrBranch = await account('hr-branch', ['employees.view', 'audit.view'], { branchId: B.riyadh.id, employeeId: E.r2.id })
  U.auditor = await account('auditor', ['audit.view'], { scopeAllBranches: true })
  U.noFile = await account('no-file', [], { branchId: B.riyadh.id })
  const year = String(new Date().getFullYear())
  await repo('LeaveBalance').save({ employeeId: E.r1.id, balanceType: 'annual', period: year, entitled: 21, taken: 4, openingDays: 3, openingTaken: 1 })
  await repo('LeaveBalance').save({ employeeId: E.c1.id, balanceType: 'annual', period: year, entitled: 30, taken: 0, openingDays: 0, openingTaken: 0 })
}, { timeout: 120000 })

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

test('AI-01: مقفول افتراضيًا (الموديول ثم الميزة)؛ من غير مزوّد أو قبل ترحيل 185 المساعد مش متاح ومفيش سؤال بيطلع؛ والترحيل بشكل الكيان وبيتكرر بأمان', async () => {
  const closed = async () => [(await request(U.staff, 'GET', '/ai/status')).status, (await request(U.staff, 'POST', '/ai/ask', { question: 'رصيدي كام؟' })).status]
  assert.deepEqual([...(await closed()), (await request(U.admin, 'GET', '/ai/actions')).status], [404, 404, 404])
  ok(await request(U.admin, 'PUT', '/modules/ai', { enabled: true })); modules.invalidate()
  // الموديول اتفتح والميزة لسه مقفولة: المساعد لسه مش موجود
  assert.deepEqual(await closed(), [404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.AI_READ_FEATURE}`, { enabled: true })); modules.invalidate()
  // من غير مزوّد
  assert.deepEqual(ok(await request(U.staff, 'GET', '/ai/status')), { available: false, limits: { questionMin: rules.AI_QUESTION_MIN, questionMax: rules.AI_QUESTION_MAX }, tools: [], actions: false })
  refused(await request(U.staff, 'POST', '/ai/ask', { question: 'رصيدي كام؟' }), 503, rules.AI_NOT_AVAILABLE)
  // بمزوّد وقبل الترحيل: مش متاح، ومفيش سؤال وصل للمزوّد
  ai.useProvider(fake); fake.plan = scripted([{ name: 'my_leave_balance' }])
  assert.equal(ok(await request(U.staff, 'GET', '/ai/status')).available, false)
  refused(await request(U.staff, 'POST', '/ai/ask', { question: 'رصيدي كام؟' }), 409, rules.AI_MIGRATION_MISSING)
  assert.deepEqual(ok(await request(U.admin, 'GET', '/ai/actions')), { available: false, actions: [] })
  assert.equal(fake.seen.length, 0)
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس')
  assert.ok(String(text).match(/THROW \d+/g).every(found => /^THROW 1850\d\d$/.test(found)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  await runMigration(); await runMigration()
  assert.deepEqual(await shapeOf(), entityShape, 'الترحيل = شكل الكيان')
  const status = ok(await request(U.staff, 'GET', '/ai/status'))
  assert.deepEqual([status.available, status.tools.map(tool => tool.name)], [true, ['my_leave_balance', 'my_requests', 'my_attendance_today', 'my_payslips', 'company_policies', 'pending_my_approval', 'employee_lookup']])
  for (const question of [undefined, '', 'س', 'س'.repeat(rules.AI_QUESTION_MAX + 1), 5, ['رصيدي']]) assert.equal((await request(U.staff, 'POST', '/ai/ask', { question })).status, 400)
  assert.deepEqual([fake.seen.length, (await actions()).length], [0, 0])
})

test('AI-02: «رصيدي كام؟» — بيانات الرد = شاشة «أرصدتي» بالحرف، لملف السائل بس، والسؤال في ai_actions بالأداة اللي اتنادت', async () => {
  const screen = ok(await request(U.staff, 'GET', '/leaves/balances/mine'))
  assert.equal(screen.length, 1)
  const asked = await ask(U.staff, 'رصيدي كام؟', [{ name: 'my_leave_balance' }])
  const [balance] = asked.results[0]
  assert.deepEqual([balance.balanceType, balance.period, balance.remaining, balance.totalTaken, balance.annualEntitlement, balance.accruedToDate, balance.opening],
    [screen[0].balanceType, screen[0].period, screen[0].remaining, screen[0].totalTaken, screen[0].annualEntitlement, screen[0].accruedToDate, screen[0].opening])
  assert.deepEqual(asked.body.sources, [{ name: 'my_leave_balance', label: 'رصيد إجازاتي' }])
  assert.equal(asked.system, rules.READ_ASSISTANT_SYSTEM)
  // مدخلات من النموذج بتحاول تقرا ملف حد تاني: الأداة مابتاخدش رقم موظف — الرد هو رصيد السائل نفسه
  const tricked = await ask(U.staff, 'رصيد هشام كام؟', [{ name: 'my_leave_balance', input: { employeeId: E.c1.id, id: E.c1.id } }])
  assert.deepEqual(tricked.results[0], asked.results[0])
  // حساب من غير ملف موظف: مش متاح
  assert.deepEqual((await ask(U.noFile, 'رصيدي كام؟', [{ name: 'my_leave_balance' }])).results, [rules.AI_UNAVAILABLE_DATA])
  const rows = await actions()
  assert.equal(rows.length, 3)
  const first = rows[0]
  assert.deepEqual([first.userId, first.employeeId, first.kind, first.question, JSON.parse(first.tools), first.status, first.provider, first.model, first.suggestion, first.confirmed, first.id],
    [U.staff.id, E.r1.id, rules.AI_KIND_READ, 'رصيدي كام؟', [{ name: 'my_leave_balance', input: {}, ok: true }], 'OK', 'fake', 'fake-1', null, null, asked.body.id])
  assert.equal(first.answer, asked.body.answer)
  assert.deepEqual([rows[2].userId, rows[2].employeeId, JSON.parse(rows[2].tools)], [U.noFile.id, null, [{ name: 'my_leave_balance', input: {}, ok: false }]])
  // قسائمي وطلباتي وحضوري: نفس مسارات شاشاتها
  const more = await ask(U.staff, 'قسيمتي وطلباتي', [{ name: 'my_payslips' }, { name: 'my_requests' }, { name: 'pending_my_approval' }])
  assert.deepEqual([more.results[0], more.results[1], more.results[2]], [ok(await request(U.staff, 'GET', '/payroll/my-payslips')), ok(await request(U.staff, 'GET', '/requests/mine')), { count: 0, requests: [] }])
})

test('AI-03: سؤال السياسة — الرد فيه اسم السياسة ورقم نسختها من مكتبة السياسات، للي في جمهورها بس؛ وأداة موديولها مقفول (الإجازات) مش في القايمة ومابتتنفّذش', async () => {
  P.leave = ok(await request(U.admin, 'POST', '/policies', { title: 'سياسة الإجازات السنوية', category: 'الإجازات', isMandatory: false }), 201)
  ok(await request(U.admin, 'POST', `/policies/${P.leave.id}/versions`, { bodyText: 'نص النسخة الأولى', effectiveDate: today }), 201)
  ok(await request(U.admin, 'POST', `/policies/${P.leave.id}/versions`, { bodyText: 'نص النسخة التانية', effectiveDate: today }), 201)
  P.cairo = ok(await request(U.admin, 'POST', '/policies', { title: 'سياسة سكن القاهرة', isMandatory: false, audience: { mode: 'all', where: { mode: 'branches', ids: [B.cairo.id] } } }), 201)
  ok(await request(U.admin, 'POST', `/policies/${P.cairo.id}/versions`, { bodyText: 'نص سياسة السكن', effectiveDate: today }), 201)
  const screen = ok(await request(U.staff, 'GET', '/policies/mine')).policies
  assert.deepEqual(screen.map(row => [row.title, row.version.versionNo]), [['سياسة الإجازات السنوية', 2]])
  const asked = await ask(U.staff, 'إيه سياسة الإجازات؟', [{ name: 'company_policies', input: { query: 'الإجازات' } }])
  assert.deepEqual(asked.results[0].map(row => [row.source, row.title, row.versionNo, row.category]), [['مكتبة السياسات', 'سياسة الإجازات السنوية', 2, 'الإجازات']])
  assert.match(asked.body.answer, /سياسة الإجازات السنوية/)
  assert.deepEqual(asked.body.sources, [{ name: 'company_policies', label: 'سياسات الشركة' }])
  // سياسة برّه جمهوره، وسياسة مش موجودة: نفس الرد
  const outside = await ask(U.staff, 'سياسة السكن؟', [{ name: 'company_policies', input: { query: 'سكن' } }, { name: 'company_policies', input: { query: 'مش موجودة خالص' } }])
  assert.deepEqual(outside.results, [rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA])
  assert.deepEqual(outside.body.sources, [])
  // موديول الإجازات مقفول: أداة الرصيد مابتتبعتش للنموذج، ولو النموذج ناداها برضه مابتتنفّذش (وأداة مش موجودة أصلًا زيها)
  ok(await request(U.admin, 'PUT', '/modules/leave', { enabled: false })); modules.invalidate()
  try {
    const closed = await ask(U.staff, 'رصيدي كام؟', [{ name: 'my_leave_balance', input: {} }, { name: 'delete_everything', input: {} }])
    assert.deepEqual([closed.sentTools.includes('my_leave_balance'), closed.sentTools.includes('company_policies')], [false, true])
    assert.deepEqual(closed.results, ['أداة مش معروفة', 'أداة مش معروفة'])
    assert.deepEqual(closed.body.sources, [])
    assert.deepEqual(JSON.parse((await lastAction()).tools).map(item => [item.name, item.ok]), [['my_leave_balance', false], ['delete_everything', false]])
  } finally { ok(await request(U.admin, 'PUT', '/modules/leave', { enabled: true })); modules.invalidate() }
  assert.equal((await ask(U.staff, 'رصيدي كام؟', [{ name: 'my_leave_balance' }])).results[0].length, 1)
})

test('AI-04: موظف برّه النطاق = «مش متاح» (نفس رد الموظف اللي مش موجود ونفس رد اللي من غير صلاحية)؛ وجوه النطاق البيانات الوظيفية بس — الهوية والجوال والآيبان مابتوصلش للمزوّد', async () => {
  const lookup = name => [{ name: 'employee_lookup', input: { query: name } }]
  // حساب فرع الرياض بصلاحية عرض الموظفين: موظف فرعه ظاهر
  const inside = await ask(U.hrBranch, 'مين سالم؟', lookup('سالم'))
  assert.deepEqual(inside.results[0].map(row => [row.employeeCode, row.fullName, row.jobTitle]), [['AI-001', 'سالم الرياض', 'محاسب']])
  const sent = JSON.stringify(fake.seen)
  for (const hidden of ['1099887766', '0500000001', 'SA4420000001234567891234', 'nationalId', 'iban', 'basicSalary']) assert.equal(sent.includes(hidden), false, hidden)
  // موظف القاهرة (برّه نطاقه)، وموظف مش موجود: نفس الرد بالحرف
  const outside = await ask(U.hrBranch, 'مين هشام؟', [...lookup('هشام'), ...lookup('AI-003'), ...lookup('اسم مش موجود')])
  assert.deepEqual(outside.results, [rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA, rules.AI_UNAVAILABLE_DATA])
  assert.deepEqual(outside.body.sources, [])
  assert.equal(JSON.stringify(fake.seen).includes('هشام القاهرة'), false)
  // موظف من غير صلاحية عرض الموظفين: حتى زميل فرعه «مش متاح»
  assert.deepEqual((await ask(U.staff, 'مين ماجد؟', lookup('ماجد'))).results, [rules.AI_UNAVAILABLE_DATA])
  // حساب كل الفروع: الاتنين ظاهرين
  assert.deepEqual((await ask(U.admin, 'مين هشام؟', lookup('هشام'))).results[0].map(row => row.employeeCode), ['AI-003'])
  const logged = await lastAction()
  assert.deepEqual([logged.userId, logged.question, JSON.parse(logged.tools)], [U.admin.id, 'مين هشام؟', [{ name: 'employee_lookup', input: { query: 'هشام' }, ok: true }]])
})

test('AI-05: السجل والحدود — فشل المزوّد بيتسجّل FAILED والرد 503؛ حلقة الأدوات ليها آخر؛ سجل الاستخدام بصلاحية التدقيق ولحساب بكل الفروع ومن غير نص الرد؛ وحد الأسئلة في الدقيقة', async () => {
  const before = (await actions()).length
  fake.plan = async () => { throw new Error('boom: provider down') }
  refused(await request(U.staff, 'POST', '/ai/ask', { question: 'رصيدي كام؟' }), 503, rules.AI_PROVIDER_FAILED)
  const failed = await lastAction()
  assert.deepEqual([(await actions()).length, failed.status, failed.answer, failed.question, failed.userId], [before + 1, 'FAILED', null, 'رصيدي كام؟', U.staff.id])
  // نموذج مابيبطّلش ينادي أدوات: الحلقة بتقف عند حدها والرد اعتذار
  fake.seen = []; fake.plan = () => ({ text: '', toolCalls: [{ id: 'loop', name: 'my_requests', input: {} }] })
  const looped = ok(await request(U.staff, 'POST', '/ai/ask', { question: 'لف كتير' }))
  assert.deepEqual([fake.seen.length, looped.answer], [rules.AI_MAX_TURNS, 'ماقدرتش أوصل لإجابة — جرّب تسأل بشكل تاني.'])
  assert.equal(JSON.parse((await lastAction()).tools).length, rules.AI_MAX_TURNS)
  // سجل الاستخدام
  assert.deepEqual([(await request(U.staff, 'GET', '/ai/actions')).status], [403])
  refused(await request(U.hrBranch, 'GET', '/ai/actions'), 403, rules.AI_ACTIONS_COMPANY_WIDE)
  const log = ok(await request(U.auditor, 'GET', '/ai/actions'))
  assert.equal(log.available, true)
  assert.equal(log.actions.length, (await actions()).length)
  assert.deepEqual([log.actions[0].question, log.actions[0].displayName, log.actions[0].status, log.actions[0].tools.length, 'answer' in log.actions[0]], ['لف كتير', 'حساب staff', 'OK', rules.AI_MAX_TURNS, false])
  assert.equal(log.actions.every(row => row.tools.every(tool => Object.keys(tool).join() === 'name,ok')), true, 'القايمة من غير مدخلات الأدوات')
  refused(await request(U.auditor, 'GET', '/ai/actions?page=0'), 400, 'page رقم صحيح من 1')
  // حد الأسئلة: حساب جديد بيتقفل بعد حده في الدقيقة، وحساب تاني مش متأثر
  fake.plan = () => ({ text: 'تمام', toolCalls: [] })
  const statuses = []
  for (let index = 0; index < rules.AI_QUESTIONS_PER_MINUTE + 2; index++) statuses.push((await request(U.noFile, 'POST', '/ai/ask', { question: 'سؤال ' + index })).status)
  // الحساب ده سأل مرة في AI-02
  assert.deepEqual([statuses.filter(status => status === 200).length, statuses.filter(status => status === 429).length], [rules.AI_QUESTIONS_PER_MINUTE - 1, 3])
  refused(await request(U.noFile, 'POST', '/ai/ask', { question: 'سؤال زيادة' }), 429, rules.AI_RATE_LIMITED)
  assert.equal(ok(await request(U.auditor, 'POST', '/ai/ask', { question: 'سؤال من حساب تاني' })).answer, 'تمام')
})
