'use strict'
// CRP6A على SQL حقيقي — حواجز Codex P6A: (B01) الاستيراد بحراس مسار كل نوع؛ (B03) أرقام مراجع الموظف والوحدة محكومة بفرع المرجع الحالي في الـAPI العام،
// وأداة البحث من غير أرقام مراجع؛ (B05) الاقتراح مربوط بملف الموظف اللي اتجهّز له — بعد تغيير ربط الحساب مابيظهرش ومابيتأكدش ومابيتقررش؛
// (B06) تليفون وآيبان وبريد جوه ملاحظات المرشح مابيوصلوش للمزوّد. المزوّد وهمي. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_crp6a_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_crp6a_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-crp6a-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/ai/ai-rules')
let master, pool, app, ds, base, modules, created = false
const B = {}, D = {}, T = {}, U = {}, E = {}, C = {}, K = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = (user, extra = {}) => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'), ...extra })
async function request(user, method, route, body, claims) {
  const response = await fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token(user, claims), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => assert.deepEqual([response.status, response.body?.message], [status, message])
const publicGet = async (key, route) => { const response = await fetch(`${base}/public/v1${route}`, { headers: { 'X-API-Key': key } }); return { status: response.status, body: await response.json() } }
const account = (label, permissions, extra = {}) => repo('User').save({ email: `${label}@crp6a.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', permissions: JSON.stringify(permissions), isActive: true, ...extra })
const employee = (code, name, extra = {}) => repo('Employee').save({ employeeCode: code, fullName: name, branchId: B.a.id, joinDate: '2021-01-01', basicSalary: 5000, status: 'active', isActive: true, ...extra })
const count = async table => (await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.[${table}]`)).recordset[0].n
const fake = { name: 'fake', model: 'fake-1', seen: [], reply: '[]', plan: null, async turn(input) { this.seen.push(JSON.parse(JSON.stringify(input))); return this.plan ? this.plan(input) : { text: this.reply, toolCalls: [] } } }

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  delete process.env.AI_PROVIDER; delete process.env.AI_API_KEY; delete process.env.AI_MODEL
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.get(require('../src/ai/ai.service').AiService).useProvider(fake)
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
  B.a = await repo('Branch').save({ code: 'CR_A', name: 'فرع أ', country: 'SA' })
  B.b = await repo('Branch').save({ code: 'CR_B', name: 'فرع ب', country: 'SA' })
  D.parent = await repo('Department').save({ branchId: B.b.id, name: 'إدارة في فرع ب', isActive: true })
  D.unit = await repo('Department').save({ branchId: B.a.id, name: 'قسم في فرع أ', parentId: D.parent.id, isActive: true })
  T.team = await repo('Team').save({ departmentId: D.unit.id, name: 'فريق القسم', code: 'CR_T' })
  E.boss = await employee('CR001', 'مدير من فرع ب', { branchId: B.b.id })
  E.one = await employee('CR002', 'موظف فرع أ', { departmentId: D.unit.id, teamId: T.team.id, managerEmployeeId: E.boss.id })
  E.two = await employee('CR003', 'موظف تاني في فرع أ', { departmentId: D.unit.id, managerEmployeeId: E.one.id })
  U.admin = await repo('User').save({ email: 'admin@crp6a.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  U.settings = await account('settings', ['settings.manage'], { scopeAllBranches: true })
  U.viewer = await account('viewer', ['employees.view'], { branchId: B.a.id })
  U.staff = await account('staff', ['candidates.manage'], { branchId: B.a.id, employeeId: E.one.id })
  for (const key of ['ai', 'integrations']) ok(await request(U.admin, 'PUT', `/modules/${key}`, { enabled: true }))
  for (const feature of [rules.AI_READ_FEATURE, rules.AI_ACTION_FEATURE, rules.AI_RANKING_FEATURE]) ok(await request(U.admin, 'PUT', `/modules/features/${feature}`, { enabled: true }))
  modules.invalidate()
  K.a = ok(await request(U.admin, 'POST', '/integrations/keys', { name: 'مفتاح فرع أ', scopes: ['employees.read', 'structure.read'], branchIds: [B.a.id] }), 201).key
  K.all = ok(await request(U.admin, 'POST', '/integrations/keys', { name: 'مفتاح كل الفروع', scopes: ['employees.read', 'structure.read'], branchIds: null }), 201).key
}, { timeout: 180000 })

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

test('CR6-01 (B01): الاستيراد بحراس مسار كل نوع — صلاحية الإعدادات لوحدها مابتعملش فرع ولا موظف ولا رصيد ولا سلفة (زي المسارات الأصلية)، وبصلاحية النوع بيعدّي الحارس', async () => {
  // المسارات الأصلية بترفض الحساب ده
  assert.deepEqual([(await request(U.settings, 'POST', '/branches', { name: 'فرع جديد', code: 'CR_N', country: 'SA' })).status, (await request(U.settings, 'POST', '/employees', { fullName: 'موظف' })).status], [403, 403])
  const before = [await count('branches'), await count('employees')]
  const expected = { structure: 'استيراد الهيكل محتاج صلاحية إدارة الهيكل', employees: 'استيراد الموظفين محتاج صلاحية إضافة موظف', balances: 'استيراد الأرصدة محتاج صلاحية إدارة أرصدة الإجازات' }
  for (const [kind, message] of Object.entries(expected)) for (const step of ['template', 'preview', 'apply']) refused(await request(U.settings, 'POST', `/setup-import/${kind}/${step}`), 403, message)
  for (const step of ['template', 'preview', 'apply']) assert.equal((await request(U.settings, 'POST', `/setup-import/loans/${step}`)).status, 403)
  assert.deepEqual([await count('branches'), await count('employees')], before)
  // بصلاحية النوع: الحارس بيعدّي (والرفض بعده إن مفيش ملف)
  const structureOnly = await account('structure-only', ['settings.manage', 'org.manage'], { scopeAllBranches: true })
  refused(await request(structureOnly, 'POST', '/setup-import/structure/preview'), 400, 'ارفع ملف القالب')
  refused(await request(structureOnly, 'POST', '/setup-import/employees/preview'), 403, expected.employees)
  refused(await request(U.admin, 'POST', '/setup-import/employees/preview'), 400, 'ارفع ملف القالب')
})

test('CR6-02 (B03): الـAPI العام — رقم القسم والفريق والمدير وأب الوحدة بيرجعوا بس لو فرع المرجع الحالي جوه نطاق المفتاح (المدير من فرع تاني، والقسم بعد نقله)؛ وأداة البحث من غير أرقام مراجع', async () => {
  const one = async key => ok(await publicGet(key, `/employees/${E.one.id}`))
  // المدير من فرع ب: محجوب عن مفتاح فرع أ (قراءته نفسه «مش موجود»)، وظاهر لمفتاح كل الفروع
  assert.deepEqual([(await one(K.a)).departmentId, (await one(K.a)).teamId, (await one(K.a)).managerEmployeeId, (await publicGet(K.a, `/employees/${E.boss.id}`)).status], [D.unit.id, T.team.id, null, 404])
  assert.deepEqual([(await one(K.all)).departmentId, (await one(K.all)).teamId, (await one(K.all)).managerEmployeeId], [D.unit.id, T.team.id, E.boss.id])
  // مدير من نفس الفرع ظاهر
  assert.equal(ok(await publicGet(K.a, `/employees/${E.two.id}`)).managerEmployeeId, E.one.id)
  // أب الوحدة في فرع ب: مش من وحدات المفتاح، فرقمه مابيرجعش
  const structure = ok(await publicGet(K.a, '/structure'))
  assert.deepEqual(structure.departments.map(row => [row.id, row.parentId]), [[D.unit.id, null]])
  assert.equal(ok(await publicGet(K.all, '/structure')).departments.find(row => row.id === D.unit.id).parentId, D.parent.id)
  // القسم اتنقل لفرع ب (الموظف لسه في فرع أ): رقم القسم والفريق اتحجبوا — في الموظف الواحد وفي القايمة
  await repo('Department').update(D.unit.id, { branchId: B.b.id })
  try {
    assert.deepEqual([(await one(K.a)).departmentId, (await one(K.a)).teamId, (await one(K.a)).branchId], [null, null, B.a.id])
    const listed = ok(await publicGet(K.a, '/employees')).items.find(row => row.id === E.one.id)
    assert.deepEqual([listed.departmentId, listed.teamId, listed.managerEmployeeId], [null, null, null])
    assert.deepEqual(ok(await publicGet(K.a, '/structure')).departments, [])
    assert.deepEqual([(await one(K.all)).departmentId, (await one(K.all)).teamId], [D.unit.id, T.team.id])
  } finally { await repo('Department').update(D.unit.id, { branchId: B.a.id }) }
  // أداة البحث عن موظف: بيانات وظيفية بس — ولا رقم فرع ولا قسم ولا فريق ولا مدير بيوصل للمزوّد
  fake.seen = []
  fake.plan = input => (input.messages.at(-1).role === 'user' ? { text: '', toolCalls: [{ id: 'c1', name: 'employee_lookup', input: { query: 'موظف فرع' } }] } : { text: 'RESULT ' + input.messages.at(-1).result, toolCalls: [] })
  const asked = ok(await request(U.viewer, 'POST', '/ai/ask', { question: 'مين موظف فرع أ؟' }))
  const [row] = JSON.parse(asked.answer.replace(/^RESULT /, ''))
  fake.plan = null
  assert.deepEqual([row.fullName, ['branchId', 'departmentId', 'teamId', 'managerEmployeeId', 'id'].filter(key => key in row)], ['موظف فرع أ', []])
  assert.equal(/"(branchId|departmentId|teamId|managerEmployeeId)"/.test(JSON.stringify(fake.seen)), false)
})

test('CR6-03 (B05): الاقتراح مربوط بملف الموظف اللي اتجهّز له — بعد تغيير ربط الحساب بموظف تاني مابيظهرش ومابيتأكدش ومابيتلغيش، وولا طلب بيتعمل؛ وقرار اقتراحات التوظيف كذلك', async () => {
  const actions = repo('AiAction')
  const suggestion = JSON.stringify({ kind: 'LEAVE_REQUEST', dto: { leaveTypeCode: 'ANNUAL', fromDate: '2027-01-04', toDate: '2027-01-05', days: 2, reason: 'ظرف شخصي خاص بالموظف الأول' },
    view: { kind: 'LEAVE_REQUEST', title: 'طلب إجازة سنوية', details: [{ label: 'السبب', value: 'ظرف شخصي خاص بالموظف الأول' }], rows: [], total: null, notice: null } })
  const pending = await actions.save({ userId: U.staff.id, employeeId: E.one.id, kind: rules.AI_KIND_ACTION, question: 'عايز إجازة', tools: '[]', answer: 'المعاينة جاهزة', suggestion, confirmed: null, confirmedByUserId: null, confirmedAt: null,
    provider: 'fake', model: 'fake-1', status: 'OK', createdAt: new Date() })
  // بهوية الموظف الأول: ظاهر
  assert.deepEqual(ok(await request(U.staff, 'GET', '/ai/suggestions')).suggestions.map(row => row.id), [pending.id])
  // الحساب اتربط بالموظف التاني (جلسة جديدة بهويته الحالية): الاقتراح الشخصي القديم مش له
  const moved = { employeeId: E.two.id }
  const requestsBefore = await count('requests')
  assert.deepEqual(ok(await request(U.staff, 'GET', '/ai/suggestions', undefined, moved)).suggestions, [])
  refused(await request(U.staff, 'POST', `/ai/actions/${pending.id}/confirm`, undefined, moved), 404, rules.AI_SUGGESTION_NOT_FOUND)
  refused(await request(U.staff, 'POST', `/ai/actions/${pending.id}/dismiss`, undefined, moved), 404, rules.AI_SUGGESTION_NOT_FOUND)
  // وحساب من غير ملف موظف كذلك
  refused(await request(U.staff, 'POST', `/ai/actions/${pending.id}/confirm`, undefined, { employeeId: null }), 404, rules.AI_SUGGESTION_NOT_FOUND)
  const untouched = await actions.findOneByOrFail({ id: pending.id })
  assert.deepEqual([untouched.confirmed, untouched.status, await count('requests')], [null, 'OK', requestsBefore])
  // صاحبه الأصلي لسه يقدر يلغيه
  assert.deepEqual(ok(await request(U.staff, 'POST', `/ai/actions/${pending.id}/dismiss`)), { id: pending.id, dismissed: true })
  // CRP6B-B05: ربط الحساب اتغيّر في القاعدة والجلسة لسه بالهوية القديمة (السباق قبل الحجز): الحجز نفسه بيقرا الربط الحالي فمابيتنفّذش
  const racing = await actions.save({ userId: U.staff.id, employeeId: E.one.id, kind: rules.AI_KIND_ACTION, question: 'عايز إجازة', tools: '[]', answer: 'المعاينة جاهزة', suggestion, confirmed: null, confirmedByUserId: null, confirmedAt: null,
    provider: 'fake', model: 'fake-1', status: 'OK', createdAt: new Date() })
  const racingDraft = await actions.save({ userId: U.staff.id, employeeId: E.one.id, kind: rules.AI_KIND_CV, question: 'قراءة سيرة', tools: '[]', answer: null, suggestion: JSON.stringify({ kind: rules.AI_KIND_CV, entityId: 1, text: 'ملخص' }),
    confirmed: null, confirmedByUserId: null, confirmedAt: null, provider: 'fake', model: 'fake-1', status: 'OK', createdAt: new Date() })
  await repo('User').update(U.staff.id, { employeeId: E.two.id })
  try {
    assert.deepEqual([(await request(U.staff, 'POST', `/ai/actions/${racing.id}/confirm`)).status, (await request(U.staff, 'POST', `/ai/actions/${racing.id}/dismiss`)).status,
      (await request(U.staff, 'POST', `/ai/assist/${racingDraft.id}/outcome`, { used: true, finalText: 'ملخص' })).status], [409, 409, 409])
    const after = [await actions.findOneByOrFail({ id: racing.id }), await actions.findOneByOrFail({ id: racingDraft.id })]
    assert.deepEqual([after.map(row => [row.confirmed, row.status]), await count('requests')], [[[null, 'OK'], [null, 'OK']], requestsBefore])
  } finally { await repo('User').update(U.staff.id, { employeeId: E.one.id }) }
  // CRP6C (P6C-B01): الحجز نفسه (الجملة الذرية) بيرفض هوية حساب اتعطّل أو إصدار هويته اتغيّر (دور أو صلاحية) بعد ما الطلب عدّى حارس الجلسة
  const ai = app.get(require('../src/ai/ai.service').AiService)
  const gate = await actions.save({ userId: U.staff.id, employeeId: E.one.id, kind: rules.AI_KIND_ACTION, question: 'عايز إجازة', tools: '[]', answer: 'المعاينة جاهزة', suggestion, confirmed: null, confirmedByUserId: null, confirmedAt: null,
    provider: 'fake', model: 'fake-1', status: 'OK', createdAt: new Date() })
  const identity = { sub: U.staff.id, role: 'employee', email: U.staff.email, employeeId: E.one.id, tokenVersion: U.staff.tokenVersion ?? 0, permissions: [] }
  await repo('User').update(U.staff.id, { isActive: false })
  try { assert.equal(await ai.claim(identity, gate.id, true, 'EXECUTING'), false, 'حساب متعطّل') } finally { await repo('User').update(U.staff.id, { isActive: true }) }
  await repo('User').update(U.staff.id, { tokenVersion: (U.staff.tokenVersion ?? 0) + 1 })
  try { assert.equal(await ai.claim(identity, gate.id, true, 'EXECUTING'), false, 'إصدار الهوية اتغيّر') } finally { await repo('User').update(U.staff.id, { tokenVersion: U.staff.tokenVersion ?? 0 }) }
  assert.equal(await ai.claim({ ...identity, sub: 987654 }, gate.id, true, 'EXECUTING'), false, 'حساب مش موجود')
  assert.deepEqual([(await actions.findOneByOrFail({ id: gate.id })).confirmed, (await actions.findOneByOrFail({ id: gate.id })).status], [null, 'OK'])
  // والهوية السليمة بتحجز
  assert.equal(await ai.claim(identity, gate.id, false, 'DISMISSED'), true)
  // قرار اقتراح توظيف (B6.10) بنفس الحكم
  const draft = await actions.save({ userId: U.staff.id, employeeId: E.one.id, kind: rules.AI_KIND_CV, question: 'قراءة سيرة', tools: '[]', answer: null, suggestion: JSON.stringify({ kind: rules.AI_KIND_CV, entityId: 1, text: 'ملخص' }), confirmed: null,
    confirmedByUserId: null, confirmedAt: null, provider: 'fake', model: 'fake-1', status: 'OK', createdAt: new Date() })
  refused(await request(U.staff, 'POST', `/ai/assist/${draft.id}/outcome`, { used: true, finalText: 'ملخص' }, moved), 404, rules.AI_SUGGESTION_NOT_FOUND)
  assert.deepEqual(ok(await request(U.staff, 'POST', `/ai/assist/${draft.id}/outcome`, { used: true, finalText: 'ملخص' })), { id: draft.id, outcome: 'ACCEPTED' })
})

test('CR6-04 (B06): ترتيب المرشحين — تليفون وآيبان وبريد ورقم هوية مكتوبين جوه ملاحظات المرشح مابيوصلوش للمزوّد (بيتحجبوا)، وباقي الملاحظة بتوصل', async () => {
  const job = await repo('RecruitmentJob').save({ title: 'محاسب', branchId: B.a.id, departmentId: null, openings: 1, description: null, requirements: 'خبرة محاسبة', status: 'OPEN', internal: false, external: false, requestId: null,
    createdByUserId: U.admin.id, createdAt: new Date() })
  const candidate = (name, notes) => repo('Candidate').save({ fullName: name, email: `${crypto.randomBytes(4).toString('hex')}@cv.invalid`, phone: '0555000111', positionTitle: 'محاسب', branchId: B.a.id, stage: 'applied', notes })
  C.one = await candidate('مرشح أول', 'خبرة 6 سنين. واتساب 0501234567 وآيبانه SA4420000001234567891234')
  C.two = await candidate('مرشح تاني', 'خبرة 3 سنين — بريده private.person@mail.example وهويته 1099887766')
  for (const who of [C.one, C.two]) await repo('CandidateApplication').save({ candidateId: who.id, jobId: job.id, source: 'يدوي', nationalId: null, applicantEmployeeId: null, cvFileId: null, consentAt: null, createdAt: new Date() })
  fake.plan = null; fake.seen = []; fake.reply = JSON.stringify([{ candidateId: C.one.id, reason: 'خبرة أطول' }])
  ok(await request(U.staff, 'POST', `/ai/assist/ranking/${job.id}`))
  const sent = JSON.stringify(fake.seen)
  for (const hidden of ['0501234567', 'SA4420000001234567891234', 'private.person@mail.example', '1099887766', '0555000111']) assert.equal(sent.includes(hidden), false, hidden)
  const notes = JSON.parse(fake.seen[0].messages[0].text).candidates.map(row => row.notes)
  assert.deepEqual(notes, [`خبرة ${rules.AI_HIDDEN_TEXT} سنين. واتساب ${rules.AI_HIDDEN_TEXT} وآيبانه SA${rules.AI_HIDDEN_TEXT}`, `خبرة ${rules.AI_HIDDEN_TEXT} سنين — بريده ${rules.AI_HIDDEN_TEXT} وهويته ${rules.AI_HIDDEN_TEXT}`])
  // CRP6B-B06: بدائل P6B — أرقام فارسية، رقم سباعي، وأرقام بينها فاصل بعرض صفر: ولا واحد بيوصل
  // وبدائل P6C: «مبلغ» شكله رقم، ومجموعات بينها أربع مسافات
  const variants = ['۰۹۱۲۳۴۵۶۷۸۹', '5551234', '05\u200B01\u200B23\u200B45\u200B67', '05012345.67', '050    123    4567']
  await repo('Candidate').update(C.one.id, { notes: `تماس ${variants[0]} — Contact telephone ${variants[1]} — ${variants[3]}` })
  await repo('Candidate').update(C.two.id, { notes: `رقمه ${variants[2]} أو ${variants[4]} وخبرته طويلة` })
  fake.seen = []
  ok(await request(U.staff, 'POST', `/ai/assist/ranking/${job.id}`))
  const again = JSON.stringify(fake.seen), sentNotes = JSON.parse(fake.seen[0].messages[0].text).candidates.map(row => row.notes)
  for (const variant of [...variants, '0501234567', '۰۹۱۲', '555', '050', '4567']) assert.equal(again.includes(variant), false, JSON.stringify(variant))
  // ولا محرف رقمي في أي ملاحظة راحت للمزوّد
  assert.equal(sentNotes.some(note => /\p{N}/u.test(note)), false)
  assert.equal(sentNotes[1], `رقمه ${rules.AI_HIDDEN_TEXT} أو ${rules.AI_HIDDEN_TEXT} وخبرته طويلة`)
})
