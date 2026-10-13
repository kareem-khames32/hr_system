'use strict'
// B-ADD.23: الاتصال من جوه النظام على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_meet_calls_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا
// ومن غير كلمات مرور. خادم الاجتماعات (LiveKit) خادم HTTP وهمي على 127.0.0.1 بيسجّل النداءات — مفيش أي اتصال بخادم حقيقي ولا مكالمة حقيقية.
//  MC-01) الموديول مقفول = المسارات مقفولة. وترحيل 198: قبله السجل فاضي بالسبب والاتصال برسالة الترحيل والاجتماعات شغالة عادي؛ والملف بيعمل الجدول
//         بنفس شكل synchronize وفرقها صفر، وآمن للتكرار، وشكل تاني بيوقّفه. ومن غير إعداد الخادم: رسالة واضحة.
//  MC-02) قبل ترحيل 188 (من غير خانة التحويلة): الاتصال بالاسم شغال، والاتصال بالتحويلة بيقول إن الخانة محتاجة ترحيلها.
//  MC-03) الاتصال بالتحويلة: بيرن عند صاحبها بس (باسم المتصل وتحويلته)، مالوش صف اجتماع، والرد وتذكرة كل طرف (من غير إدارة غرفة)، والقفل بينهيها
//         للاتنين على الخادم؛ والحساب التالت مالوش تذكرة ولا حالة ولا بيشوفها في أي قايمة؛ والسجل للطرفين بس.
//  MC-04) تحويلة مش عند حد (أو صاحبها من غير حساب نشط) بنفس الرد، والاتصال بالنفس مرفوض، والقيم، وحساب مالوش وجود — ومن غير بيانات موظف.
//  MC-05) الاتصال بالاسم، و«مشغول» من غير ما يتقال مع مين، والرفض، وإلغاء المتصل قبل الرد، واتصالين في نفس اللحظة.
//  MC-06) محدش رد: بعد مدة الرنة المكالمة فايتة (المدة متحقونة للاختبار).
//  MC-07) مكالمة اتردّ عليها ومحدش قفلها: غرفتها الفاضية على الخادم = انتهت، واللي لسه فيها حد = مشغول؛ والموديول لما يتقفل.
// Run (من api/): node --test test/meet-calls.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto')
const { disposableApp, apiRoot } = require('./helpers/disposable-app.cjs')
const { moduleTools } = require('./helpers/modules.cjs')
const migrate = require('../scripts/db-migrate.cjs')
const sql = require('../node_modules/mssql')
const rules = require('../src/meet/call-rules')
const meetRules = require('../src/meet/meet-rules')
const FILE = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_198_meet_calls.sql')
const FILE_188 = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_188_employee_work_extension.sql')
const LK = { key: `APItest${crypto.randomBytes(6).toString('hex')}`, secret: crypto.randomBytes(32).toString('hex') }
const extra = {}
const t = disposableApp('meet_calls', extra)
const U = {}, E = {}
let fake, pool, modules, service, branch, number = 0, down = false
// الخادم الوهمي: النداءات اللي وصلته، واللي جوه كل غرفة
const calls = [], present = new Map()
const C = '/meet/calls'
const call = (id, tail = '') => `${C}/${id}${tail}`
const messageOf = response => [].concat(response.body?.message ?? []).join('، ')
const coded = response => [response.status, response.body?.code, messageOf(response)]
const get = async (user, route) => t.expectStatus(await t.request(user, 'GET', route), 200)
const post = (user, route, body) => t.request(user, 'POST', route, body)
const ok = async (user, route, body) => t.expectStatus(await post(user, route, body), 200)
const dial = async (user, body) => t.expectStatus(await post(user, C, body), 201)
const stateOf = async (user, id) => (await get(user, call(id))).state
const ringingAt = async user => (await get(user, '/meet/inbox')).calls.map(row => row.id)
const decode = token => {
  const [head, body, signature] = token.split('.')
  assert.equal(crypto.createHmac('sha256', LK.secret).update(`${head}.${body}`).digest('base64url'), signature, 'التوقيع بسر الخادم')
  return JSON.parse(Buffer.from(body, 'base64url').toString())
}
const person = (key, extension = E[key]?.extension ?? null) => ({ id: U[key].id, displayName: U[key].displayName, jobTitle: E[key]?.jobTitle ?? null, extension })
const account = async (key, displayName, jobTitle, extension, overrides = {}) => {
  if (jobTitle !== null) {
    E[key] = await t.repo('Employee').save({ employeeCode: `MC${String(++number).padStart(3, '0')}`, fullName: displayName, branchId: branch.id, jobTitle, nationalId: `SECRET-ID-${number}`, phone: '0500000000',
      joinDate: '2020-01-01', basicSalary: 6000, status: 'active', isActive: true, payMethod: 'cash' })
    if (extension) await t.query('UPDATE dbo.employees SET [workExtension] = @0 WHERE [id] = @1', [extension, E[key].id])
    E[key].extension = extension
  }
  if (overrides.none) return null
  U[key] = await t.user({ email: `${key}@meet-calls.invalid`, displayName, role: 'employee', permissions: '[]', branchId: branch.id, employeeId: E[key]?.id ?? null, isActive: true, ...overrides })
  return U[key]
}
const shape = async () => ({
  columns: await t.query(`SELECT c.name AS columnName, ty.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
    FROM sys.columns c JOIN sys.types ty ON ty.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(N'dbo.meet_calls') ORDER BY c.column_id`),
  indexes: await t.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
      STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
    FROM sys.indexes i WHERE i.object_id = OBJECT_ID(N'dbo.meet_calls') AND i.name IS NOT NULL ORDER BY i.name`),
})
const content = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const runFile = async file => { for (const batch of migrate.splitBatches(content(file))) await pool.request().batch(batch) }
const rowOf = id => t.repo('MeetCall').findOneByOrFail({ code: id })
const idle = async () => { await t.repo('MeetCall').update({ endedAt: require('../node_modules/typeorm').IsNull() }, { endedAt: new Date() }) }

before(async () => {
  fake = http.createServer((req, res) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      const method = req.url.replace('/twirp/livekit.RoomService/', ''), body = raw ? JSON.parse(raw) : {}
      calls.push({ method, body, auth: String(req.headers.authorization ?? '') })
      const reply = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)) }
      if (down) return reply(500, { code: 'internal', msg: 'down' })
      if (method === 'ListRooms') return reply(200, { rooms: body.names.filter(name => present.has(name)).map(name => ({ name, numParticipants: present.get(name).size })) })
      if (method === 'DeleteRoom') { present.delete(body.room); return reply(200, {}) }
      return reply(404, { code: 'not_found', msg: 'unexpected' })
    })
  })
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve))
  Object.assign(extra, { LIVEKIT_URL: `ws://127.0.0.1:${fake.address().port}`, LIVEKIT_HTTP_URL: '', LIVEKIT_API_KEY: LK.key, LIVEKIT_API_SECRET: LK.secret })
  await t.start()
  assert.match(t.database, migrate.DISPOSABLE_DATABASE)
  modules = moduleTools(t.app)
  service = t.app.get(require('../src/meet/meet-calls.service').MeetCallsService)
  const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
  pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: t.database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()
  branch = await t.repo('Branch').save({ code: 'MC_A', name: 'فرع المكالمات', country: 'SA' })
  await account('amal', 'أمل المتصلة', 'مديرة مبيعات', '1001')
  await account('basem', 'باسم المطلوب', 'محاسب', '1002')
  await account('camelia', 'كاميليا التالتة', 'مهندسة', '0105')
  await account('dina', 'دينا من غير تحويلة', 'مصممة', null)
  await account('ghost', 'موظف من غير حساب', 'فني', '2001', { none: true })
  await account('stopped', 'حساب موقوف', 'سابق', '2002', { isActive: false })
  await account('bare', 'حساب من غير موظف', null, null)
  U.admin = await t.user({ displayName: 'مدير النظام', scopeAllBranches: true, isActive: true })
}, { timeout: 180000 })
after(async context => {
  const errors = []
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try { if (fake) await new Promise(resolve => { fake.closeAllConnections?.(); fake.close(resolve) }) } catch (error) { errors.push(error) }
  await t.stop(context)
  if (errors.length) context.diagnostic(errors.map(error => error.message).join(' | '))
})

test('MC-01: الموديول مقفول = مسارات الاتصال مقفولة؛ وترحيل 198 — قبله السجل فاضي بالسبب والاتصال برسالة الترحيل والاجتماعات شغالة، والملف بنفس شكل synchronize وآمن للتكرار، وشكل تاني بيوقّفه', async () => {
  const id = crypto.randomUUID()
  const routes = [['GET', C], ['POST', C], ['GET', call(id)], ['POST', call(id, '/accept')], ['POST', call(id, '/reject')], ['POST', call(id, '/hangup')], ['POST', call(id, '/token')]]
  for (const [method, route] of routes) for (const user of [U.admin, U.amal]) assert.equal((await t.request(user, method, route, method === 'POST' ? {} : undefined)).status, 404, `${method} ${route}`)
  await modules.enable('meet')
  assert.equal((await t.request(null, 'GET', C)).status, 401, 'من غير دخول')
  assert.deepEqual(await get(U.amal, C), { ready: true, configured: true, extensions: true, ringSeconds: 45, calls: [] })
  assert.deepEqual((await get(U.amal, '/meet/inbox')).calls, [])

  // الملف: من غير BOM، إضافي بس، وأكواده فريدة بين كل الملفات
  assert.notDeepEqual([...fs.readFileSync(FILE).subarray(0, 3)], [0xef, 0xbb, 0xbf])
  const text = content(FILE)
  assert.match(text, /^-- 20261012_198: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [198001, 198002])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جدول جديد بس')
  assert.doesNotMatch(statements, /\bmeetings\b|\bmeeting_invites\b|\bmeeting_attendance\b|\bemployees\b|\busers\b/, 'مابيلمسش جداول ترحيل 191 ولا غيرها')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [])
  // قاعدة synchronize: الشكل من الكيان
  const synchronized = await shape()
  assert.deepEqual(synchronized.columns.map(row => [row.columnName, row.type, row.maxLength, row.nullable, row.isIdentity]), [['id', 'int', 4, false, true], ['code', 'nvarchar', 72, false, false],
    ['callerUserId', 'int', 4, false, false], ['calleeUserId', 'int', 4, false, false], ['startedAt', 'datetime2', 8, false, false], ['answeredAt', 'datetime2', 8, true, false], ['endedAt', 'datetime2', 8, true, false],
    ['rejected', 'bit', 1, false, false]])
  assert.deepEqual(synchronized.indexes.map(row => [row.name, row.isUnique, row.columns]), [['IX_meet_calls_callee', false, 'calleeUserId,startedAt'], ['IX_meet_calls_caller', false, 'callerUserId,startedAt'],
    ['PK_meet_calls', true, 'id'], ['UX_meet_calls_code', true, 'code']])
  assert.deepEqual((await t.ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])

  // من غير الجدول: السجل فاضي بالسبب، والصندوق من غير مكالمات ومن غير خطأ، وكل مسار كتابة برسالة الترحيل — والاجتماعات نفسها شغالة عادي
  await pool.request().batch('DROP TABLE dbo.meet_calls;')
  rules.resetCallsCache()
  assert.deepEqual(await get(U.amal, C), { ready: false, configured: true, extensions: true, ringSeconds: 45, calls: [] })
  assert.deepEqual(await get(U.amal, '/meet/inbox'), { ready: true, configured: true, invites: [], knocks: [], declines: [], calls: [] })
  for (const [method, route, body] of [['POST', C, { extension: '1002' }], ['POST', C, { userId: U.basem.id }], ['GET', call(id)], ['POST', call(id, '/accept')], ['POST', call(id, '/reject')], ['POST', call(id, '/hangup')], ['POST', call(id, '/token')]]) {
    assert.deepEqual(coded(await t.request(U.amal, method, route, body)), [409, 'CALL_MIGRATION_MISSING', rules.CALL_MIGRATION_MISSING], `${method} ${route}`)
  }
  const meeting = t.expectStatus(await post(U.amal, '/meet/rooms', { title: 'اجتماع قبل ترحيل المكالمات', inviteUserIds: [U.basem.id] }), 201)
  assert.deepEqual([(await get(U.basem, '/meet/inbox')).invites.map(invite => invite.id), (await post(U.basem, `/meet/rooms/${meeting.id}/token`)).status, (await get(U.amal, '/meet/rooms')).meetings.length], [[meeting.id], 200, 1])
  t.expectStatus(await post(U.amal, `/meet/rooms/${meeting.id}/end`), 200)
  await t.repo('MeetingAttendance').clear(); await t.repo('MeetingInvite').clear(); await t.repo('Meeting').clear()

  // الملف بيعمل الجدول بنفس الشكل بالحرف، والعملية الشغالة بتشوفه من غير إعادة تشغيل
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await t.ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  assert.equal((await get(U.amal, C)).ready, true)
  // آمن للتكرار، وبيحافظ على الصفوف
  await t.repo('MeetCall').insert({ code: crypto.randomUUID(), callerUserId: U.admin.id, calleeUserId: U.bare.id, startedAt: new Date(Date.now() - 100 * 86400000), answeredAt: null, endedAt: null, rejected: false })
  for (let round = 0; round < 2; round++) await runFile(FILE)
  assert.deepEqual([await shape(), await t.repo('MeetCall').count()], [synchronized, 1])
  // جدول بنفس الاسم وبشكل تاني (عمود ناقص)، وفهرس بنفس الاسم على عمود تاني: الترحيل بيقف بكوده من غير ما يلمسه
  await pool.request().batch('DROP TABLE dbo.meet_calls; CREATE TABLE dbo.meet_calls ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_meet_calls] PRIMARY KEY, [code] nvarchar(36) NOT NULL);')
  await assert.rejects(runFile(FILE), error => Number(error.number) === 198001)
  assert.equal(Number((await t.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.meet_calls')`))[0].n), 2)
  await pool.request().batch('DROP TABLE dbo.meet_calls;')
  await runFile(FILE)
  await pool.request().batch('DROP INDEX [IX_meet_calls_callee] ON dbo.meet_calls; CREATE INDEX [IX_meet_calls_callee] ON dbo.meet_calls ([callerUserId]);')
  await assert.rejects(runFile(FILE), error => Number(error.number) === 198001)
  await pool.request().batch('DROP INDEX [IX_meet_calls_callee] ON dbo.meet_calls;')
  await runFile(FILE)
  assert.deepEqual(await shape(), synchronized)

  // من غير إعداد خادم الاجتماعات: السجل بيقول «مش مضبوط» والاتصال برسالة واضحة، ومن غير أي نداء على خادم
  const kept = process.env.LIVEKIT_API_KEY, reached = calls.length
  process.env.LIVEKIT_API_KEY = ''
  try {
    assert.deepEqual(await get(U.amal, C), { ready: true, configured: false, extensions: true, ringSeconds: 45, calls: [] })
    assert.deepEqual((await get(U.amal, '/meet/inbox')).calls, [])
    assert.deepEqual(coded(await post(U.amal, C, { extension: '1002' })), [503, 'MEET_NOT_CONFIGURED', meetRules.MEET_NOT_CONFIGURED])
  } finally { process.env.LIVEKIT_API_KEY = kept }
  assert.deepEqual([await t.repo('MeetCall').count(), calls.length - reached, calls.map(entry => entry.method)], [0, 0, ['ListRooms', 'DeleteRoom']], 'النداءات اللي فاتت بتاعة الاجتماع (قايمته وإنهاؤه) بس')
})

test('MC-02: قبل ترحيل 188 (من غير خانة التحويلة) — الاتصال بالاسم شغال، والاتصال بالتحويلة بيقول إن الخانة محتاجة ترحيلها', async () => {
  await t.query('DROP INDEX [UX_employees_workExtension] ON dbo.employees')
  await t.query('ALTER TABLE dbo.employees DROP COLUMN [workExtension]')
  rules.resetCallsCache()
  try {
    assert.deepEqual(await get(U.amal, C), { ready: true, configured: true, extensions: false, ringSeconds: 45, calls: [] })
    assert.deepEqual(coded(await post(U.amal, C, { extension: '1002' })), [409, 'CALL_EXTENSION_MIGRATION', rules.CALL_EXTENSION_MIGRATION])
    assert.equal(await t.repo('MeetCall').count(), 0)
    // بالاسم: بترن، والتحويلة فاضية في كل رد
    const made = await dial(U.amal, { userId: U.basem.id })
    assert.deepEqual(made.person, person('basem', null))
    assert.deepEqual((await get(U.basem, '/meet/inbox')).calls.map(row => [row.id, row.from]), [[made.id, person('amal', null)]])
    await ok(U.basem, call(made.id, '/accept'))
    assert.equal((await post(U.amal, call(made.id, '/token'))).status, 200)
    await ok(U.amal, call(made.id, '/hangup'))
    assert.deepEqual((await get(U.basem, C)).calls.map(row => [row.id, row.direction, row.state, row.person]), [[made.id, 'in', 'answered', person('amal', null)]])
  } finally {
    // ترحيل 188 نفسه بيرجّع الخانة، والعملية الشغالة بتشوفها
    await runFile(FILE_188)
    for (const [key, row] of Object.entries(E)) if (row.extension) await t.query('UPDATE dbo.employees SET [workExtension] = @0 WHERE [id] = @1', [row.extension, row.id])
    await t.repo('MeetCall').clear()
  }
  assert.equal((await get(U.amal, C)).extensions, true)
})

test('MC-03: الاتصال بالتحويلة — بيرن عند صاحبها بس، مالوش صف اجتماع، والرد وتذكرة كل طرف، والقفل بينهيها للاتنين؛ والحساب التالت مالوش تذكرة ولا حالة ولا بيشوفها في أي قايمة', async () => {
  const before = calls.length
  // الأرقام العربية بتتحوّل، والصفر في الأول محفوظ
  const made = await dial(U.amal, { extension: '١٠٠٢' })
  assert.match(made.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.deepEqual([Object.keys(made).sort(), made.person, made.ringSeconds], [['id', 'person', 'ringSeconds'], person('basem'), 45])
  const row = await rowOf(made.id)
  assert.deepEqual([row.callerUserId, row.calleeUserId, row.answeredAt, row.endedAt, row.rejected], [U.amal.id, U.basem.id, null, null, false])
  // بيرن عند صاحب التحويلة بس: «فلان بيتصل بيك» وتحويلته — ومش اجتماع عند أي حد
  const ringing = (await get(U.basem, '/meet/inbox')).calls
  assert.deepEqual(ringing.map(entry => [Object.keys(entry).sort(), entry.id, entry.from]), [[['from', 'id', 'startedAt'], made.id, person('amal')]])
  for (const key of ['amal', 'camelia', 'dina', 'admin']) assert.deepEqual(await ringingAt(U[key]), [], key)
  for (const key of ['amal', 'basem', 'camelia']) {
    const inbox = await get(U[key], '/meet/inbox')
    assert.deepEqual([inbox.invites, inbox.knocks, (await get(U[key], '/meet/rooms')).meetings], [[], [], []], key)
  }
  assert.deepEqual([await t.repo('Meeting').count(), await t.repo('MeetingInvite').count(), (await t.request(U.amal, 'GET', `/meet/rooms/${made.id}`)).status, (await post(U.camelia, `/meet/rooms/${made.id}/knock`)).status], [0, 0, 404, 404],
    'المكالمة مالهاش صف اجتماع: لا تفاصيل ولا طلب دخول')
  assert.deepEqual([await stateOf(U.amal, made.id), await stateOf(U.basem, made.id), (await get(U.amal, call(made.id))).direction, (await get(U.basem, call(made.id))).direction], ['ringing', 'ringing', 'out', 'in'])

  // الحساب التالت (ومدير النظام): زي مكالمة مالهاش وجود في كل مسار، ومالوش أثر عليها
  for (const user of [U.camelia, U.admin]) {
    for (const [method, route] of [['GET', call(made.id)], ['POST', call(made.id, '/accept')], ['POST', call(made.id, '/reject')], ['POST', call(made.id, '/hangup')], ['POST', call(made.id, '/token')]]) {
      assert.deepEqual(coded(await t.request(user, method, route)).slice(0, 3), [404, undefined, rules.CALL_NOT_FOUND], `${user.displayName} ${method} ${route}`)
    }
    assert.deepEqual((await get(user, C)).calls, [])
  }
  assert.deepEqual(coded(await t.request(U.amal, 'GET', call(crypto.randomUUID()))), [404, undefined, rules.CALL_NOT_FOUND], 'نفس رد المكالمة اللي مالهاش وجود بالحرف')
  assert.equal((await t.request(U.amal, 'GET', call('5'))).status, 400)
  assert.equal(await stateOf(U.amal, made.id), 'ringing')

  // قبل الرد: مفيش تذكرة لحد، والرد للي بيتّصلوا بيه بس
  for (const user of [U.amal, U.basem]) assert.deepEqual(coded(await post(user, call(made.id, '/token'))), [409, 'CALL_NOT_ANSWERED', rules.CALL_NOT_ANSWERED])
  for (const action of ['/accept', '/reject']) assert.deepEqual(coded(await post(U.amal, call(made.id, action))), [403, 'CALL_CALLEE_ONLY', rules.CALL_CALLEE_ONLY], action)
  assert.deepEqual(await ok(U.basem, call(made.id, '/accept')), { ok: true })
  assert.deepEqual(await ok(U.basem, call(made.id, '/accept')), { ok: true }, 'رد تاني (ضغطتين) من غير أثر')
  const answered = await rowOf(made.id)
  assert.ok(answered.answeredAt && !answered.endedAt)
  assert.deepEqual([await stateOf(U.amal, made.id), await stateOf(U.basem, made.id), await ringingAt(U.basem)], ['active', 'active', []])
  // تذكرة كل طرف: موقّعة بسر الخادم، لغرفة المكالمة دي بس، بهويته واسمه، ومن غير إدارة غرفة لحد
  const grant = { room: made.id, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: false, roomAdmin: false }
  for (const key of ['amal', 'basem']) {
    const ticket = await ok(U[key], call(made.id, '/token'))
    const claims = decode(ticket.token)
    assert.deepEqual([Object.keys(ticket).sort(), ticket.url, claims.iss, claims.sub, claims.name, JSON.parse(claims.metadata), claims.video, claims.exp - claims.nbf],
      [['token', 'url'], process.env.LIVEKIT_URL, LK.key, String(U[key].id), U[key].displayName, { jobTitle: E[key].jobTitle }, grant, 600], key)
    assert.equal(JSON.stringify(ticket).includes(LK.secret), false)
  }
  assert.equal(calls.length, before, 'الاتصال والرد والتذاكر من غير أي نداء على خادم الاجتماعات')

  // أي طرف يقفل = انتهت للاتنين: الغرفة بتتقفل على الخادم، ومفيش تذاكر بعدها
  present.set(made.id, new Set([String(U.amal.id), String(U.basem.id)]))
  await new Promise(resolve => setTimeout(resolve, 1100))
  assert.deepEqual(await ok(U.basem, call(made.id, '/hangup')), { ok: true })
  assert.deepEqual(calls.slice(before).map(entry => [entry.method, entry.body, decode(entry.auth.replace(/^Bearer /, '')).video]), [['DeleteRoom', { room: made.id }, { roomCreate: true }]])
  assert.equal(present.has(made.id), false)
  for (const user of [U.amal, U.basem]) assert.deepEqual(coded(await post(user, call(made.id, '/token'))), [410, 'CALL_OVER', rules.CALL_OVER])
  assert.deepEqual(coded(await post(U.basem, call(made.id, '/accept'))), [410, 'CALL_OVER', rules.CALL_OVER])
  // القفل تاني (الطرف التاني قفل هو كمان): من غير أثر ومن غير نداء
  await ok(U.amal, call(made.id, '/hangup')); await ok(U.basem, call(made.id, '/reject'))
  assert.equal(calls.length, before + 1)
  const done = await rowOf(made.id)
  assert.deepEqual([!!done.endedAt, done.rejected, new Date(done.answeredAt).getTime()], [true, false, new Date(answered.answeredAt).getTime()])

  // السجل للطرفين بس: مين اتصل بمين، وإمتى، واتردّ عليها، ومدتها — ومن غير أي بيان تاني عن الموظف
  const mine = (await get(U.amal, C)).calls, theirs = (await get(U.basem, C)).calls
  assert.deepEqual(mine.map(entry => [Object.keys(entry).sort(), entry.id, entry.direction, entry.state, entry.person]),
    [[['answeredAt', 'direction', 'durationSeconds', 'endedAt', 'id', 'person', 'startedAt', 'state'], made.id, 'out', 'answered', person('basem')]])
  assert.deepEqual(theirs.map(entry => [entry.id, entry.direction, entry.state, entry.person]), [[made.id, 'in', 'answered', person('amal')]])
  assert.ok(mine[0].durationSeconds >= 1 && mine[0].durationSeconds < 30 && mine[0].durationSeconds === theirs[0].durationSeconds, String(mine[0].durationSeconds))
  for (const user of [U.camelia, U.dina, U.admin]) assert.deepEqual((await get(user, C)).calls, [])
  const everything = JSON.stringify([made, ringing, mine, theirs])
  assert.deepEqual([everything.includes('SECRET-ID'), everything.includes('@meet-calls.invalid'), everything.includes('0500000000'), everything.includes('employeeId')], [false, false, false, false])
})

test('MC-04: تحويلة مش عند حد أو صاحبها من غير حساب نشط بنفس الرد، والاتصال بالنفس مرفوض، والقيم، وحساب مالوش وجود', async () => {
  const before = await t.repo('MeetCall').count()
  // مفيش حد بالتحويلة دي: رقم مش عند حد، وموظف من غير حساب، وموظف حسابه موقوف — نفس الرد بالحرف
  const answers = []
  for (const extension of ['9999', '2001', '2002', '105']) answers.push(coded(await post(U.amal, C, { extension })))
  assert.deepEqual(answers, Array.from({ length: 4 }, () => [404, 'CALL_NOBODY', rules.CALL_NOBODY]), '«0105» غير «105»')
  // حساب مالوش وجود وحساب موقوف: نفس الرد
  assert.deepEqual([coded(await post(U.amal, C, { userId: 987654 })), coded(await post(U.amal, C, { userId: U.stopped.id }))], [[404, 'CALL_USER', rules.CALL_USER], [404, 'CALL_USER', rules.CALL_USER]])
  // الاتصال بالنفس: بتحويلته أو بحسابه
  for (const body of [{ extension: '1001' }, { extension: '١٠٠١' }, { userId: U.amal.id }]) assert.deepEqual(coded(await post(U.amal, C, body)), [400, undefined, rules.CALL_YOURSELF], JSON.stringify(body))
  // القيم: واحد من الاتنين بالظبط، والتحويلة أرقام بس
  for (const body of [{}, { extension: '' }, { extension: '   ' }, { extension: null }, { extension: '1002', userId: U.basem.id }]) assert.deepEqual(coded(await post(U.amal, C, body)), [400, undefined, rules.CALL_TARGET], JSON.stringify(body))
  for (const extension of ['12a', '+1002', '10 02', '12345678901', {}]) assert.equal((await post(U.amal, C, { extension })).status, 400, JSON.stringify(extension))
  for (const userId of ['7', 0, -1, 1.5]) assert.deepEqual(coded(await post(U.amal, C, { userId })), [400, undefined, meetRules.MEET_USER], JSON.stringify(userId))
  assert.equal(await t.repo('MeetCall').count(), before, 'ولا مكالمة من طلب مرفوض')
  for (const key of ['basem', 'camelia', 'amal']) assert.deepEqual(await ringingAt(U[key]), [], key)
})

test('MC-05: الاتصال بالاسم، و«مشغول» من غير ما يتقال مع مين، والرفض، وإلغاء المتصل قبل الرد، واتصالين في نفس اللحظة على نفس الشخص', async () => {
  const before = calls.length
  // بالاسم: حساب من غير تحويلة، وحساب من غير موظف
  const first = await dial(U.amal, { userId: U.dina.id })
  assert.deepEqual([first.person, (await get(U.dina, '/meet/inbox')).calls.map(entry => [entry.id, entry.from])], [person('dina'), [[first.id, person('amal')]]])
  // مشغول: اللي بيرن عنده، واللي بيتصل — من غير اسم الطرف التاني ولا أي بيان عن مكالمته
  for (const target of [{ userId: U.dina.id }, { userId: U.amal.id }, { extension: '1001' }]) {
    const busy = await post(U.camelia, C, target)
    assert.deepEqual(coded(busy), [409, 'CALL_BUSY', rules.CALL_BUSY], JSON.stringify(target))
    assert.deepEqual([Object.keys(busy.body).sort(), /أمل|دينا|1001/.test(JSON.stringify(busy.body))], [['code', 'message'], false])
  }
  // اللي عنده مكالمة بترن مايتصلش لحد ما يرد أو يرفض
  assert.deepEqual(coded(await post(U.dina, C, { userId: U.camelia.id })), [409, 'CALL_SELF_BUSY', rules.CALL_SELF_BUSY])
  assert.deepEqual(coded(await post(U.dina, C, { userId: U.amal.id })), [409, 'CALL_SELF_BUSY', rules.CALL_SELF_BUSY])
  assert.equal(await t.repo('MeetCall').count({ where: { callerUserId: U.camelia.id } }) + await t.repo('MeetCall').count({ where: { callerUserId: U.dina.id } }), 0)
  // الرفض: المتصل بيعرف، والرنة بتقف، والاتنين فاضيين
  assert.deepEqual(await ok(U.dina, call(first.id, '/reject')), { ok: true })
  assert.deepEqual([await stateOf(U.amal, first.id), await stateOf(U.dina, first.id), await ringingAt(U.dina), coded(await post(U.dina, call(first.id, '/accept'))), coded(await post(U.amal, call(first.id, '/token')))],
    ['rejected', 'rejected', [], [410, 'CALL_OVER', rules.CALL_OVER], [410, 'CALL_OVER', rules.CALL_OVER]])
  const rejected = await rowOf(first.id)
  assert.deepEqual([rejected.rejected, !!rejected.endedAt, rejected.answeredAt], [true, true, null])
  // المتصل بيلغي قبل الرد: فايتة عند التاني، ومن غير رنة
  const second = await dial(U.camelia, { userId: U.bare.id })
  assert.deepEqual([second.person, await ringingAt(U.bare)], [person('bare'), [second.id]])
  await ok(U.camelia, call(second.id, '/hangup'))
  assert.deepEqual([await stateOf(U.camelia, second.id), await stateOf(U.bare, second.id), await ringingAt(U.bare), (await rowOf(second.id)).rejected], ['missed', 'missed', [], false])
  // اللي بيتّصلوا بيه «قفل» وهي بترن = رفض
  const third = await dial(U.camelia, { userId: U.bare.id })
  await ok(U.bare, call(third.id, '/hangup'))
  assert.equal(await stateOf(U.camelia, third.id), 'rejected')
  // اتصال جديد من المتصل وهو لسه بيرن على حد: الرنة القديمة بتتلغي (فايتة) والجديدة هي اللي بترن
  const old = await dial(U.amal, { userId: U.dina.id }), fresh = await dial(U.amal, { extension: '0105' })
  assert.deepEqual([await stateOf(U.dina, old.id), await ringingAt(U.dina), await ringingAt(U.camelia), fresh.person], ['missed', [], [fresh.id], person('camelia')])
  await ok(U.amal, call(fresh.id, '/hangup'))
  // اتصالين في نفس اللحظة على نفس الشخص: واحد بس اللي بيرن، والتاني «مشغول»
  const both = await Promise.all([post(U.amal, C, { userId: U.bare.id }), post(U.camelia, C, { userId: U.bare.id })])
  assert.deepEqual(both.map(response => response.status).sort(), [201, 409], JSON.stringify(both.map(response => response.body)))
  assert.deepEqual([both.find(response => response.status === 409).body.code, (await ringingAt(U.bare)).length], ['CALL_BUSY', 1])
  await idle()
  // السجل: كل طرف بيشوف مكالماته هو بس، الأحدث الأول
  assert.deepEqual((await get(U.dina, C)).calls.map(entry => [entry.direction, entry.state, entry.person.id, entry.durationSeconds]), [['in', 'missed', U.amal.id, null], ['in', 'rejected', U.amal.id, null]])
  assert.deepEqual((await get(U.basem, C)).calls.length, 1, 'مكالمة MC-03 بس')
  assert.equal(calls.length, before, 'الرنة والرفض والإلغاء من غير أي نداء على خادم الاجتماعات')
})

test('MC-06: محدش رد — بعد مدة الرنة المكالمة فايتة: الرنة بتقف، والرد مابقاش ينفع، والاتنين فاضيين', async () => {
  assert.deepEqual([rules.CALL_RING_MS, service.ringMs], [45000, 45000])
  service.ringMs = 1500
  try {
    const made = await dial(U.amal, { extension: '1002' })
    assert.deepEqual([made.ringSeconds, await ringingAt(U.basem), await stateOf(U.amal, made.id)], [2, [made.id], 'ringing'])
    await new Promise(resolve => setTimeout(resolve, 1800))
    assert.deepEqual([await ringingAt(U.basem), await stateOf(U.amal, made.id), await stateOf(U.basem, made.id)], [[], 'missed', 'missed'])
    assert.deepEqual([coded(await post(U.basem, call(made.id, '/accept'))), coded(await post(U.amal, call(made.id, '/token')))], [[410, 'CALL_OVER', rules.CALL_OVER], [410, 'CALL_OVER', rules.CALL_OVER]])
    // الرفض والقفل بعدها من غير أثر: لسه «فايتة» مش «مرفوضة»
    await ok(U.basem, call(made.id, '/reject')); await ok(U.amal, call(made.id, '/hangup'))
    const row = await rowOf(made.id)
    assert.deepEqual([row.rejected, row.answeredAt, row.endedAt], [false, null, null])
    const log = (await get(U.basem, C)).calls[0]
    assert.deepEqual([log.id, log.direction, log.state, log.durationSeconds], [made.id, 'in', 'missed', null])
    // والاتنين فاضيين: حد تالت يتصل بأي واحد فيهم
    const next = await dial(U.camelia, { userId: U.basem.id })
    await ok(U.camelia, call(next.id, '/hangup'))
  } finally { service.ringMs = rules.CALL_RING_MS }
  // بالمدة الحقيقية: مكالمة بدأت من 44 ثانية لسه بترن، ومن 46 ثانية فايتة
  const made = await dial(U.amal, { extension: '1002' })
  await t.repo('MeetCall').update({ code: made.id }, { startedAt: new Date(Date.now() - 44000) })
  assert.deepEqual(await ringingAt(U.basem), [made.id])
  await t.repo('MeetCall').update({ code: made.id }, { startedAt: new Date(Date.now() - 46000) })
  assert.deepEqual([await ringingAt(U.basem), await stateOf(U.amal, made.id)], [[], 'missed'])
})

test('MC-07: مكالمة اتردّ عليها ومحدش قفلها — غرفتها الفاضية على الخادم = انتهت، واللي لسه فيها حد = مشغول؛ والموديول لما يتقفل', async () => {
  const made = await dial(U.amal, { extension: '1002' })
  await ok(U.basem, call(made.id, '/accept'))
  // لسه في مهلة الدخول: مشغول من غير سؤال الخادم
  let before = calls.length
  assert.deepEqual([coded(await post(U.camelia, C, { userId: U.amal.id })), calls.length], [[409, 'CALL_BUSY', rules.CALL_BUSY], before])
  // عدّت المهلة والطرفين جوه الغرفة: مشغول
  await t.repo('MeetCall').update({ code: made.id }, { answeredAt: new Date(Date.now() - rules.CALL_CONNECT_GRACE_MS - 5000) })
  present.set(made.id, new Set([String(U.amal.id), String(U.basem.id)]))
  assert.deepEqual(coded(await post(U.camelia, C, { userId: U.basem.id })), [409, 'CALL_BUSY', rules.CALL_BUSY])
  assert.deepEqual(calls.slice(before).map(entry => [entry.method, entry.body, decode(entry.auth.replace(/^Bearer /, '')).video]), [['ListRooms', { names: [made.id] }, { roomList: true }]])
  // خادم الاجتماعات مش بيرد: المكالمة زي ما هي (مشغول)
  down = true
  try { assert.deepEqual(coded(await post(U.camelia, C, { userId: U.amal.id })), [409, 'CALL_BUSY', rules.CALL_BUSY]) } finally { down = false }
  assert.equal(await stateOf(U.amal, made.id), 'active')
  // الطرفين مشيوا من غير «اقفل» (الغرفة مابقتش موجودة): المكالمة انتهت، واللي بيتصل بيرن عادي
  present.delete(made.id)
  const next = await dial(U.camelia, { userId: U.amal.id })
  assert.deepEqual([await stateOf(U.amal, made.id), await stateOf(U.basem, made.id), !!(await rowOf(made.id)).endedAt, await ringingAt(U.amal)], ['answered', 'answered', true, [next.id]])
  await ok(U.camelia, call(next.id, '/hangup'))
  // مكالمة محدش قفلها خالص: منتهية بعد 12 ساعة من الرد
  const stale = await dial(U.amal, { extension: '1002' })
  await ok(U.basem, call(stale.id, '/accept'))
  await t.repo('MeetCall').update({ code: stale.id }, { startedAt: new Date(Date.now() - 13 * 3600000), answeredAt: new Date(Date.now() - 13 * 3600000 + 5000) })
  before = calls.length
  assert.deepEqual([await stateOf(U.amal, stale.id), coded(await post(U.amal, call(stale.id, '/token'))).slice(0, 2), (await post(U.camelia, C, { userId: U.basem.id })).status, calls.length], ['answered', [410, 'CALL_OVER'], 201, before])
  await idle()
  // الموديول لما يتقفل: المسارات مقفولة
  await modules.disable('meet')
  assert.deepEqual([(await t.request(U.amal, 'GET', C)).status, (await post(U.amal, C, { extension: '1002' })).status, (await t.request(U.amal, 'GET', call(made.id))).status, (await t.request(U.amal, 'GET', '/meet/inbox')).status], [404, 404, 404, 404])
})

test('MC-08 (P8A-B05): المكالمة اتقفلت وطلب التذكرة في الطريق — مفيش تذكرة بعد إنهاء اكتمل', async () => {
  await modules.enable('meet')
  const made = await dial(U.amal, { userId: U.basem.id })
  await ok(U.basem, call(made.id, '/accept'))
  // الطرف التاني بيقفل بعد ما طلب التذكرة اتحكم عليه وقبل ما تتوقّع (قراءة الاسم هي نقطة الانتظار)
  const original = service.people
  let hit = false
  service.people = async function (...args) {
    if (!hit) { hit = true; await ok(U.basem, call(made.id, '/hangup')) }
    return original.apply(this, args)
  }
  let late
  try { late = await post(U.amal, call(made.id, '/token')) } finally { service.people = original }
  assert.equal(hit, true)
  assert.ok((await rowOf(made.id)).endedAt)
  assert.deepEqual([coded(late).slice(0, 2), 'token' in late.body], [[410, 'CALL_OVER'], false])
  // من غير سباق: التذكرة بتطلع للطرفين وهي شغالة
  const next = await dial(U.amal, { userId: U.basem.id })
  await ok(U.basem, call(next.id, '/accept'))
  const claims = decode((await ok(U.amal, call(next.id, '/token'))).token)
  assert.deepEqual([claims.video.roomJoin, claims.exp - claims.nbf], [true, 600])
  await ok(U.amal, call(next.id, '/hangup'))
  await modules.disable('meet')
})
