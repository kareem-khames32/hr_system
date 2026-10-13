'use strict'
// B-ADD.15: الاجتماعات على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_meet_test_<16 hex>)، عبر HTTP بتوكنات موقّعة محليًا ومن غير كلمات مرور.
// خادم الاجتماعات (LiveKit) هنا خادم HTTP وهمي على 127.0.0.1 بيسجّل النداءات — مفيش أي اتصال بخادم حقيقي.
//  MT-01) الموديول مقفول افتراضيًا = المسارات مقفولة؛ ومن غير إعداد الخادم: القراءات بترجع «مش مضبوط» من غير خطأ والكتابة برسالة واضحة.
//  MT-02) ترحيل 191: من غير الجداول القراءات فاضية والكتابة برسالة الترحيل؛ والملف بيعمل الجداول بنفس شكل synchronize وفرقها صفر، وآمن للتكرار،
//         وجدول بشكل تاني بيوقّفه من غير ما يغيّر حاجة.
//  MT-03) الدليل والإنشاء والدعوة اللي بترن، وتذكرة الدخول الموقّعة (الهوية والصلاحيات والمدة)، والحضور.
//  MT-04) غرفة الانتظار: غير المدعو مايدخلش من غير موافقة — طلب، رفض، طلب تاني، موافقة؛ والاعتذار؛ والطلب اللي صاحبه مشي بيختفي.
//  MT-05) تحكم صاحب الاجتماع بس: كتم وإخراج وإنهاء (نداءات Twirp على الخادم الوهمي)، والتعديل والإلغاء، والاجتماع بميعاد ومن غير غرفة انتظار.
// Run (من api/): node --test test/meet.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), http = require('node:http')
const apiRoot = path.resolve(__dirname, '..')
const migrate = require('../scripts/db-migrate.cjs')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_meet_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_meet_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-meet-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/meet/meet-rules')
const FILE = path.join(apiRoot, '..', 'docs/migrations/payroll/20261012_191_meetings.sql')
const TABLES = ['meetings', 'meeting_invites', 'meeting_attendance']
// مفتاح وسر للخادم الوهمي بس (عشوائيين لكل تشغيلة)
const LK = { key: `APItest${crypto.randomBytes(6).toString('hex')}`, secret: crypto.randomBytes(32).toString('hex') }
let app, master, pool, ds, base, modules, meet, fake, created = false, employeeNumber = 0
const org = {}, users = {}, state = {}
// الخادم الوهمي: النداءات اللي وصلته، واللي جوه كل غرفة، وهل هو «واقع»
const calls = [], present = new Map()
let down = false

function assertDisposable() {
  assert.match(database, NAME); assert.match(database, migrate.DISPOSABLE_DATABASE); assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
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
const coded = response => [response.status, response.body?.code, messageOf(response)]
const account = async (label, displayName, jobTitle, extra = {}) => {
  const employee = jobTitle === null ? null : await repo('Employee').save({ employeeCode: `MT${String(++employeeNumber).padStart(3, '0')}`, fullName: displayName, branchId: org.branch.id, jobTitle,
    nationalId: `SECRET-ID-${employeeNumber}`, phone: '0500000000', joinDate: '2020-01-01', basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, currency: 'SAR', status: 'active', isActive: true,
    payMethod: 'cash' })
  return repo('User').save({ email: `${label}@meet.invalid`, displayName, passwordHash: 'test-only', role: 'employee', branchId: org.branch.id, permissions: '[]', isActive: true,
    employeeId: employee?.id ?? null, ...extra })
}
const M = '/meet', R = '/meet/rooms'
const room = (id, tail = '') => `${R}/${id}${tail}`
// JWT بتاع LiveKit: التوقيع بسر الخادم الوهمي، والمحتوى
const decode = token => {
  const [head, body, signature] = token.split('.')
  assert.equal(crypto.createHmac('sha256', LK.secret).update(`${head}.${body}`).digest('base64url'), signature, 'التوقيع بسر الخادم')
  assert.deepEqual(JSON.parse(Buffer.from(head, 'base64url').toString()), { alg: 'HS256', typ: 'JWT' })
  return JSON.parse(Buffer.from(body, 'base64url').toString())
}
const shape = async () => {
  const tables = {}
  for (const table of TABLES) {
    tables[table] = {
      columns: await ds.query(`SELECT c.name AS columnName, t.name AS type, c.max_length AS maxLength, c.is_nullable AS nullable, c.is_identity AS isIdentity
        FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id WHERE c.object_id = OBJECT_ID(@0) ORDER BY c.column_id`, [`dbo.${table}`]),
      indexes: await ds.query(`SELECT i.name, i.is_unique AS isUnique, i.has_filter AS hasFilter,
          STUFF((SELECT ',' + c.name FROM sys.index_columns ic JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id ORDER BY ic.key_ordinal FOR XML PATH('')), 1, 1, '') AS [columns]
        FROM sys.indexes i WHERE i.object_id = OBJECT_ID(@0) AND i.name IS NOT NULL ORDER BY i.name`, [`dbo.${table}`]),
    }
  }
  return tables
}
const content = () => fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')
const runFile = async () => { for (const batch of migrate.splitBatches(content())) await pool.request().batch(batch) }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  // خادم LiveKit الوهمي (Twirp): بيسجّل كل نداء بتذكرته وجسمه
  fake = http.createServer((req, res) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      const method = req.url.replace('/twirp/livekit.RoomService/', ''), body = raw ? JSON.parse(raw) : {}
      calls.push({ url: req.url, verb: req.method, type: req.headers['content-type'], method, body, auth: String(req.headers.authorization ?? '') })
      const reply = (status, json) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)) }
      if (down) return reply(500, { code: 'internal', msg: 'down' })
      const inside = present.get(body.room) ?? new Set()
      if (method === 'ListRooms') return reply(200, { rooms: body.names.filter(name => present.has(name)).map(name => ({ name, numParticipants: present.get(name).size })) })
      if (method === 'DeleteRoom') { present.delete(body.room); return reply(200, {}) }
      if (!inside.has(body.identity)) return reply(404, { code: 'not_found', msg: 'participant does not exist' })
      if (method === 'GetParticipant') return reply(200, { identity: body.identity, tracks: [{ sid: 'TR_mic', source: 'MICROPHONE', muted: false }, { sid: 'TR_cam', source: 'CAMERA', muted: false },
        { sid: 'TR_screen', source: 'SCREEN_SHARE', muted: false }, { sid: 'TR_mic_off', source: 'MICROPHONE', muted: true }] })
      if (method === 'RemoveParticipant') inside.delete(body.identity)
      return reply(200, {})
    })
  })
  await new Promise(resolve => fake.listen(0, '127.0.0.1', resolve))
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  // إعداد خادم الاجتماعات بتاع الاختبار بيكتب فوق أي قيمة في api/.env: العنوان 127.0.0.1 بس
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads,
    LIVEKIT_URL: `ws://127.0.0.1:${fake.address().port}`, LIVEKIT_HTTP_URL: '', LIVEKIT_API_KEY: LK.key, LIVEKIT_API_SECRET: LK.secret })
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
  meet = app.get(require('../src/meet/meet.service').MeetService)
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  pool = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database, options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 10000, requestTimeout: 120000 }).connect()

  org.branch = await repo('Branch').save({ code: 'MT_A', name: 'فرع الاجتماعات', country: 'SA' })
  users.admin = await repo('User').save({ email: 'admin@meet.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', branchId: null, scopeAllBranches: true, permissions: '[]', isActive: true })
  users.host = await account('host', 'أحمد صاحب الاجتماع', 'مدير مشروعات')
  users.guest = await account('guest', 'بسمة المدعوة', 'محاسبة')
  users.second = await account('second', 'تامر المدعو', 'مهندس')
  users.outsider = await account('outsider', 'جمال من برّه', null)
  users.late = await account('late', 'دينا المتأخرة', 'مصممة')
  users.gone = await account('gone', 'حساب موقوف', 'سابق', { isActive: false })
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try { if (pool) await pool.close() } catch (error) { errors.push(error) }
  try {
    if (created) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { if (fake) await new Promise(resolve => fake.close(resolve)) } catch (error) { errors.push(error) }
  fs.rmSync(uploads, { recursive: true, force: true })
  if (errors.length) t.diagnostic(errors.map(error => error.message).join(' | '))
}, { timeout: 60000 })

test('MT-01: الموديول مقفول افتراضيًا = المسارات مقفولة؛ ومن غير إعداد خادم الاجتماعات القراءات بترجع «مش مضبوط» والكتابة برسالة واضحة', async () => {
  const id = crypto.randomUUID()
  for (const [method, route] of [['GET', M + '/inbox'], ['GET', M + '/directory'], ['GET', R], ['POST', R], ['GET', room(id)], ['POST', room(id, '/token')], ['POST', room(id, '/end')]]) {
    for (const user of [users.admin, users.host]) assert.equal((await request(user, method, route, method === 'POST' ? {} : undefined)).status, 404, `${method} ${route}`)
  }
  expectStatus(await request(users.admin, 'PUT', '/modules/meet', { enabled: true }), 200); modules.invalidate()
  assert.equal((await request(null, 'GET', M + '/inbox')).status, 401, 'من غير دخول')
  assert.deepEqual(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200), { ready: true, configured: true, invites: [], knocks: [], declines: [], calls: [] })
  // من غير مفتاح الخادم (أو عنوان مش ws): مش مضبوط — من غير أي نداء على خادم
  const kept = { key: process.env.LIVEKIT_API_KEY, url: process.env.LIVEKIT_URL }
  for (const broken of [{ LIVEKIT_API_KEY: '' }, { LIVEKIT_URL: '' }, { LIVEKIT_URL: 'meet.example.invalid' }]) {
    Object.assign(process.env, broken)
    try {
      assert.deepEqual(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200), { ready: true, configured: false, invites: [], knocks: [], declines: [], calls: [] })
      assert.deepEqual(expectStatus(await request(users.host, 'GET', R), 200), { ready: true, configured: false, meetings: [] })
      for (const [method, route, body] of [['POST', R, { title: 'اجتماع' }], ['GET', M + '/directory'], ['GET', room(id)], ['POST', room(id, '/token')], ['POST', room(id, '/end')]]) {
        assert.deepEqual(coded(await request(users.host, method, route, body)), [503, 'MEET_NOT_CONFIGURED', rules.MEET_NOT_CONFIGURED], `${method} ${route}`)
      }
    } finally { Object.assign(process.env, { LIVEKIT_API_KEY: kept.key, LIVEKIT_URL: kept.url }) }
  }
  assert.equal(await repo('Meeting').count(), 0)
  assert.equal(calls.length, 0, 'ولا نداء على خادم الاجتماعات')
})

test('MT-02: ترحيل 191 — من غير الجداول القراءات فاضية والكتابة برسالة الترحيل؛ والملف بيعملهم بنفس شكل synchronize وفرقها صفر، وآمن للتكرار، وشكل تاني بيوقّفه', async () => {
  assert.notDeepEqual([...fs.readFileSync(FILE).subarray(0, 3)], [0xef, 0xbb, 0xbf], 'من غير BOM')
  const text = content()
  assert.match(text, /^-- 20261012_191: /)
  assert.deepEqual(migrate.forbiddenStatements(text), [])
  assert.deepEqual(migrate.throwCodes(text), [191001, 191002, 191003, 191004, 191005, 191006])
  const statements = migrate.stripComments(text)
  assert.doesNotMatch(statements, /\b(?:DROP|TRUNCATE|MERGE|INSERT|DELETE|ALTER)\b|\bUPDATE\s+(?:dbo\.)?\[?\w/i, 'جداول جديدة بس')
  assert.doesNotMatch(statements, /\b(GREATEST|LEAST|GENERATE_SERIES|DATETRUNC|JSON_OBJECT|JSON_ARRAY)\s*\(|IS\s+(?:NOT\s+)?DISTINCT\s+FROM/i, 'SQL Server 2019')
  assert.deepEqual(migrate.analyze(migrate.discover()).problems, [], 'أكواد THROW فريدة بين كل الملفات')
  // قاعدة synchronize: الشكل من الكيانات
  const synchronized = await shape()
  assert.deepEqual(TABLES.map(table => synchronized[table].columns.length), [9, 4, 4])
  assert.deepEqual(TABLES.map(table => synchronized[table].indexes.map(row => [row.name, row.isUnique, row.columns])), [
    [['IX_meetings_host', false, 'hostUserId,createdAt'], ['PK_meetings', true, 'id'], ['UX_meetings_code', true, 'code']],
    [['IX_meeting_invites_user', false, 'userId'], ['PK_meeting_invites', true, 'id'], ['UX_meeting_invites_target', true, 'meetingId,userId']],
    [['IX_meeting_attendance_meeting', false, 'meetingId,joinedAt'], ['PK_meeting_attendance', true, 'id']]])
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])

  // من غير الجداول: القراءات فاضية بالسبب، والكتابة برسالة الترحيل
  assertDisposable()
  await pool.request().batch(TABLES.map(table => `DROP TABLE dbo.${table};`).join(' '))
  rules.resetMeetCache()
  assert.deepEqual(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200), { ready: false, configured: true, invites: [], knocks: [], declines: [], calls: [] })
  assert.deepEqual(expectStatus(await request(users.host, 'GET', R), 200), { ready: false, configured: true, meetings: [] })
  for (const [method, route, body] of [['POST', R, { title: 'اجتماع' }], ['GET', M + '/directory'], ['GET', room(crypto.randomUUID())], ['POST', room(crypto.randomUUID(), '/token')]]) {
    assert.deepEqual(coded(await request(users.host, method, route, body)), [409, 'MEET_MIGRATION_MISSING', rules.MEET_MIGRATION_MISSING], `${method} ${route}`)
  }
  // الملف بيعمل الجداول بنفس الشكل بالحرف، والعملية الشغالة بتشوفها من غير إعادة تشغيل (النتيجة السلبية مابتتحفظش)
  await runFile()
  assert.deepEqual(await shape(), synchronized, 'نفس شكل synchronize بالحرف')
  assert.deepEqual((await ds.driver.createSchemaBuilder().log()).upQueries.map(q => q.query), [])
  assert.equal(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).ready, true)
  // آمن للتكرار
  await repo('Meeting').insert({ code: crypto.randomUUID(), title: 'صف قبل التكرار', hostUserId: users.admin.id, startsAt: null, lobby: true, createdAt: new Date(Date.now() - 100 * 86400000), endedAt: null, cancelledAt: null })
  for (let round = 0; round < 2; round++) await runFile()
  assert.deepEqual([await shape(), await repo('Meeting').count()], [synchronized, 1])
  // جدول بنفس الاسم وبشكل تاني (عمود ناقص): الترحيل بيقف بكوده من غير ما يلمسه
  await pool.request().batch('DROP TABLE dbo.meeting_attendance; CREATE TABLE dbo.meeting_attendance ([id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_meeting_attendance] PRIMARY KEY, [meetingId] int NOT NULL);')
  await assert.rejects(runFile(), error => Number(error.number) === 191005)
  assert.equal(Number((await ds.query(`SELECT COUNT(*) AS [n] FROM sys.columns WHERE [object_id] = OBJECT_ID(N'dbo.meeting_attendance')`))[0].n), 2)
  // وفهرس بنفس الاسم على عمود تاني
  await pool.request().batch('DROP TABLE dbo.meeting_attendance;')
  await runFile()
  await pool.request().batch('DROP INDEX [IX_meeting_invites_user] ON dbo.meeting_invites; CREATE INDEX [IX_meeting_invites_user] ON dbo.meeting_invites ([meetingId]);')
  await assert.rejects(runFile(), error => Number(error.number) === 191003)
  await pool.request().batch('DROP INDEX [IX_meeting_invites_user] ON dbo.meeting_invites;')
  await runFile()
  assert.deepEqual(await shape(), synchronized)
  await repo('Meeting').clear()
})

test('MT-03: الدليل (الاسم والمسمى بس)، والإنشاء بقيمه، والدعوة بترن عند المدعو، وتذكرة الدخول الموقّعة (الهوية والصلاحيات والمدة)، والحضور', async () => {
  // الدليل: الحسابات النشطة غير صاحب الطلب — الاسم والمسمى الوظيفي بس
  const directory = expectStatus(await request(users.host, 'GET', M + '/directory'), 200)
  assert.deepEqual(Object.keys(directory), ['users'])
  assert.deepEqual(directory.users.map(row => row.displayName), ['بسمة المدعوة', 'تامر المدعو', 'جمال من برّه', 'دينا المتأخرة', 'مدير النظام'])
  assert.deepEqual(directory.users.find(row => row.id === users.guest.id), { id: users.guest.id, displayName: 'بسمة المدعوة', jobTitle: 'محاسبة', alias: null })
  // كلمة المالك 13 أكتوبر: الاسم المعروض اسم الموظف من ملفه (حسابات المجال اسمها غيره)، واسم الحساب والاسم بالإنجليزي بديل للبحث بس
  await repo('Employee').update({ id: users.guest.employeeId }, { fullName: 'بسمة أحمد علي', fullNameEn: 'Basma Ahmed' })
  assert.deepEqual(expectStatus(await request(users.host, 'GET', M + '/directory'), 200).users.find(row => row.id === users.guest.id),
    { id: users.guest.id, displayName: 'بسمة أحمد علي', jobTitle: 'محاسبة', alias: 'بسمة المدعوة Basma Ahmed' })
  await repo('Employee').update({ id: users.guest.employeeId }, { fullName: 'بسمة المدعوة', fullNameEn: null })
  assert.deepEqual([directory.users.find(row => row.id === users.outsider.id).jobTitle, JSON.stringify(directory).includes('SECRET-ID'), JSON.stringify(directory).includes('@meet.invalid')], [null, false, false])

  // القيم
  for (const [body, message] of [[{}, rules.MEET_TITLE], [{ title: '   ' }, rules.MEET_TITLE], [{ title: 'ع'.repeat(201) }, rules.MEET_TITLE], [{ title: 5 }, rules.MEET_TITLE],
    [{ title: 'ا', lobby: 'yes' }, rules.MEET_LOBBY], [{ title: 'ا', inviteUserIds: 'x' }, rules.MEET_INVITES], [{ title: 'ا', inviteUserIds: [1.5] }, rules.MEET_INVITES],
    [{ title: 'ا', inviteUserIds: Array.from({ length: 501 }, (_, index) => index + 1) }, rules.MEET_INVITES],
    [{ title: 'ا', startsAt: 'x' }, rules.MEET_START], [{ title: 'ا', startsAt: new Date(Date.now() - 3600000).toISOString() }, rules.MEET_START],
    [{ title: 'ا', startsAt: new Date(Date.now() + 400 * 86400000).toISOString() }, rules.MEET_START]]) {
    assert.deepEqual(answer(await request(users.host, 'POST', R, body)), [400, message], JSON.stringify(body).slice(0, 60))
  }
  assert.equal(await repo('Meeting').count(), 0)

  // اجتماع فوري: المدعوين النشطين بس (من غير صاحبه ولا الموقوف ولا رقم مش موجود)، وغرفة الانتظار مفتوحة افتراضيًا
  const made = expectStatus(await request(users.host, 'POST', R, { title: '  متابعة   المشروع ', inviteUserIds: [users.guest.id, users.second.id, users.host.id, users.gone.id, 987654, users.guest.id] }), 201)
  assert.match(made.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'كود عشوائي — اللينك مايتخمّنش')
  const row = await repo('Meeting').findOneByOrFail({ code: made.id })
  assert.deepEqual([row.title, row.hostUserId, row.startsAt, row.lobby, row.endedAt, row.cancelledAt], ['متابعة المشروع', users.host.id, null, true, null, null])
  assert.deepEqual((await repo('MeetingInvite').find({ where: { meetingId: row.id }, order: { userId: 'ASC' } })).map(invite => invite.userId), [users.guest.id, users.second.id])
  state.id = made.id; state.rowId = row.id

  // بترن عند المدعوين (مش عند صاحبه ولا عند اللي برّه)
  const ringing = expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200)
  assert.deepEqual(ringing.invites.map(invite => [invite.id, invite.title, invite.startsAt, invite.host, invite.isHost]),
    [[made.id, 'متابعة المشروع', null, { id: users.host.id, displayName: 'أحمد صاحب الاجتماع', jobTitle: 'مدير مشروعات' }, false]])
  for (const user of [users.host, users.outsider]) assert.deepEqual(expectStatus(await request(user, 'GET', M + '/inbox'), 200).invites, [], user.email)

  // «اجتماعاتي»: لصاحبه والمدعو، مش للي برّه — وعدد الموجودين من الخادم
  present.set(made.id, new Set(['x', 'y']))
  const mine = expectStatus(await request(users.host, 'GET', R), 200)
  assert.deepEqual([mine.ready, mine.configured, mine.meetings.map(meeting => [meeting.id, meeting.title, meeting.status, meeting.isHost, meeting.inviteCount, meeting.participants, meeting.host.displayName])],
    [true, true, [[made.id, 'متابعة المشروع', 'live', true, 2, 2, 'أحمد صاحب الاجتماع']]])
  const listed = calls.at(-1)
  assert.deepEqual([listed.url, listed.verb, listed.type, listed.body, decode(listed.auth.replace(/^Bearer /, '')).video, decode(listed.auth.replace(/^Bearer /, '')).iss],
    ['/twirp/livekit.RoomService/ListRooms', 'POST', 'application/json', { names: [made.id] }, { roomList: true }, LK.key])
  assert.deepEqual([expectStatus(await request(users.guest, 'GET', R), 200).meetings.map(meeting => [meeting.id, meeting.isHost]), expectStatus(await request(users.outsider, 'GET', R), 200).meetings], [[[made.id, false]], []])
  // الخادم واقع: القايمة بتيجي برضه (من غير عدد)
  down = true
  try { assert.deepEqual(expectStatus(await request(users.host, 'GET', R), 200).meetings.map(meeting => meeting.participants), [0]) } finally { down = false }
  present.delete(made.id)

  // التفاصيل على قد الدور
  const asHost = expectStatus(await request(users.host, 'GET', room(made.id)), 200), asGuest = expectStatus(await request(users.guest, 'GET', room(made.id)), 200), asOutsider = expectStatus(await request(users.outsider, 'GET', room(made.id)), 200)
  assert.deepEqual([asHost.access, asHost.isHost, asHost.invitees.map(person => person.displayName), asHost.knocks, asHost.attendance], ['host', true, ['بسمة المدعوة', 'تامر المدعو'], [], []])
  assert.deepEqual([asGuest.access, asGuest.isHost, asGuest.invitees.length, 'knocks' in asGuest, 'attendance' in asGuest], ['invited', false, 2, false, false])
  assert.deepEqual([asOutsider.access, asOutsider.title, asOutsider.host.displayName, asOutsider.status, asOutsider.lobby, 'invitees' in asOutsider], ['knock', 'متابعة المشروع', 'أحمد صاحب الاجتماع', 'live', true, false])
  assert.deepEqual([answer(await request(users.host, 'GET', room(crypto.randomUUID()))), (await request(users.host, 'GET', room('5'))).status], [[404, rules.MEET_NOT_FOUND], 400])

  // تذكرة الدخول: موقّعة بسر الخادم، هويتها رقم الحساب، لغرفة الاجتماع ده بس، عشر دقايق، وإدارة الغرفة لصاحبه بس
  const before = calls.length
  const hostTicket = expectStatus(await request(users.host, 'POST', room(made.id, '/token')), 200), guestTicket = expectStatus(await request(users.guest, 'POST', room(made.id, '/token')), 200)
  assert.deepEqual([hostTicket.url, hostTicket.host, guestTicket.host, Object.keys(guestTicket).sort()], [process.env.LIVEKIT_URL, true, false, ['host', 'token', 'url']])
  const hostClaims = decode(hostTicket.token), guestClaims = decode(guestTicket.token)
  const grant = admin => ({ room: made.id, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: false, roomAdmin: admin })
  assert.deepEqual([hostClaims.iss, hostClaims.sub, hostClaims.jti, hostClaims.name, JSON.parse(hostClaims.metadata), hostClaims.video], [LK.key, String(users.host.id), String(users.host.id), 'أحمد صاحب الاجتماع', { jobTitle: 'مدير مشروعات' }, grant(true)])
  assert.deepEqual([guestClaims.sub, guestClaims.name, guestClaims.video, guestClaims.exp - guestClaims.nbf], [String(users.guest.id), 'بسمة المدعوة', grant(false), 600])
  assert.ok(Math.abs(guestClaims.nbf - Date.now() / 1000) < 60)
  assert.equal(JSON.stringify(guestTicket).includes(LK.secret), false)
  assert.equal(calls.length, before, 'التذكرة من غير أي نداء على الخادم')
  // الحضور: صف لكل دخول، والرجوع في خلال دقيقتين مش دخول جديد؛ واللي دخل دعوته مابترنش تاني
  expectStatus(await request(users.guest, 'POST', room(made.id, '/token')), 200)
  assert.deepEqual((await repo('MeetingAttendance').find({ where: { meetingId: row.id }, order: { id: 'ASC' } })).map(entry => entry.userId), [users.host.id, users.guest.id])
  await repo('MeetingAttendance').update({ meetingId: row.id, userId: users.guest.id }, { joinedAt: new Date(Date.now() - 3 * 60000) })
  expectStatus(await request(users.guest, 'POST', room(made.id, '/token')), 200)
  assert.equal(await repo('MeetingAttendance').count({ where: { meetingId: row.id, userId: users.guest.id } }), 2)
  assert.deepEqual(expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).invites, [])
  assert.equal(expectStatus(await request(users.second, 'GET', M + '/inbox'), 200).invites.length, 1, 'اللي لسه مادخلش لسه بترن عنده')
  assert.deepEqual(expectStatus(await request(users.host, 'GET', room(made.id)), 200).attendance.map(entry => entry.displayName), ['بسمة المدعوة', 'أحمد صاحب الاجتماع', 'بسمة المدعوة'])
  // الرنة دقيقة من بدايتها
  await repo('Meeting').update({ id: row.id }, { createdAt: new Date(Date.now() - 2 * 60000) })
  await repo('MeetingInvite').update({ meetingId: row.id }, { createdAt: new Date(Date.now() - 2 * 60000) })
  assert.deepEqual(expectStatus(await request(users.second, 'GET', M + '/inbox'), 200).invites, [])
})

test('MT-04: غرفة الانتظار — غير المدعو مايدخلش من غير موافقة صاحب الاجتماع: طلب، رفض، طلب تاني، موافقة؛ والاعتذار؛ والطلب اللي صاحبه مشي بيختفي', async () => {
  const id = state.id, K = room(id, '/knock')
  // من غير دعوة: مفيش تذكرة
  assert.deepEqual(coded(await request(users.outsider, 'POST', room(id, '/token'))), [403, 'MEET_KNOCK_REQUIRED', rules.MEET_KNOCK_REQUIRED])
  assert.equal(await repo('MeetingAttendance').count({ where: { meetingId: state.rowId, userId: users.outsider.id } }), 0)
  // المدعو وصاحب الاجتماع «طلبهم» = يدخلوا على طول
  assert.deepEqual([expectStatus(await request(users.guest, 'POST', K), 200), expectStatus(await request(users.host, 'POST', K), 200), expectStatus(await request(users.guest, 'GET', K), 200)], [{ admitted: true }, { admitted: true }, { state: 'admitted' }])
  assert.deepEqual(expectStatus(await request(users.outsider, 'GET', K), 200), { state: 'none' })
  // الطلب بيوصل صندوق صاحب الاجتماع (وتفاصيله) — مش لحد تاني
  assert.deepEqual(expectStatus(await request(users.outsider, 'POST', K), 200), { waiting: true })
  const knocking = expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks
  assert.deepEqual(knocking.map(knock => [knock.meetingId, knock.title, knock.user]), [[id, 'متابعة المشروع', { id: users.outsider.id, displayName: 'جمال من برّه', jobTitle: null }]])
  assert.deepEqual([expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).knocks, expectStatus(await request(users.host, 'GET', room(id)), 200).knocks.map(knock => knock.user.id),
    expectStatus(await request(users.outsider, 'GET', K), 200)], [[], [users.outsider.id], { state: 'waiting' }])
  // الرفض والموافقة لصاحب الاجتماع بس، ومش على نفسه
  for (const action of ['/admit', '/deny']) {
    assert.deepEqual(coded(await request(users.guest, 'POST', room(id, action), { userId: users.outsider.id })), [403, 'MEET_HOST_ONLY', rules.MEET_HOST_ONLY], action)
    assert.deepEqual([answer(await request(users.host, 'POST', room(id, action), { userId: users.host.id })), answer(await request(users.host, 'POST', room(id, action), {})),
      answer(await request(users.host, 'POST', room(id, action), { userId: '7' }))], [[400, rules.MEET_NOT_YOURSELF], [400, rules.MEET_USER], [400, rules.MEET_USER]], action)
  }
  assert.deepEqual(expectStatus(await request(users.outsider, 'GET', K), 200), { state: 'waiting' })
  // رفض: الطلب بيختفي واللي مستني بيعرف، ولسه مفيش تذكرة
  expectStatus(await request(users.host, 'POST', room(id, '/deny'), { userId: users.outsider.id }), 200)
  assert.deepEqual([expectStatus(await request(users.outsider, 'GET', K), 200), expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks, (await request(users.outsider, 'POST', room(id, '/token'))).status],
    [{ state: 'denied' }, [], 403])
  // طلب تاني ← موافقة: بيبقى مدعو وياخد تذكرته (من غير إدارة الغرفة)
  assert.deepEqual([expectStatus(await request(users.outsider, 'POST', K), 200), expectStatus(await request(users.outsider, 'GET', K), 200)], [{ waiting: true }, { state: 'waiting' }])
  assert.deepEqual(answer(await request(users.host, 'POST', room(id, '/admit'), { userId: users.gone.id })), [404, rules.MEET_USER], 'حساب موقوف')
  expectStatus(await request(users.host, 'POST', room(id, '/admit'), { userId: users.outsider.id }), 200)
  assert.deepEqual([expectStatus(await request(users.outsider, 'GET', K), 200), expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks,
    await repo('MeetingInvite').count({ where: { meetingId: state.rowId, userId: users.outsider.id } }), expectStatus(await request(users.outsider, 'GET', room(id)), 200).access], [{ state: 'admitted' }, [], 1, 'invited'])
  const ticket = expectStatus(await request(users.outsider, 'POST', room(id, '/token')), 200)
  assert.deepEqual([ticket.host, decode(ticket.token).video.roomAdmin, decode(ticket.token).sub], [false, false, String(users.outsider.id)])
  // موافقة تانية مابتكررش الدعوة
  expectStatus(await request(users.host, 'POST', room(id, '/admit'), { userId: users.outsider.id }), 200)
  assert.equal(await repo('MeetingInvite').count({ where: { meetingId: state.rowId, userId: users.outsider.id } }), 1)

  // اللي مستني ومشي من غير ما يلغي (بطّل يسأل): طلبه بيختفي من عند صاحب الاجتماع؛ واللي لغى طلبه كمان
  assert.deepEqual(expectStatus(await request(users.late, 'POST', K), 200), { waiting: true })
  assert.equal(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks.length, 1)
  meet.knocks.get(id).get(users.late.id).seenAt = Date.now() - rules.MEET_KNOCK_FRESH_MS - 1000
  assert.deepEqual([expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks, expectStatus(await request(users.late, 'GET', K), 200)], [[], { state: 'none' }])
  expectStatus(await request(users.late, 'POST', K), 200)
  expectStatus(await request(users.late, 'DELETE', K), 200)
  assert.deepEqual([expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks, expectStatus(await request(users.late, 'GET', K), 200)], [[], { state: 'none' }])

  // الاعتذار: المدعو اللي دعوته بترن — صاحب الاجتماع بيعرف مرة، ودعوته مابترنش تاني؛ واعتذار غير المدعو مالوش أثر
  await repo('Meeting').update({ id: state.rowId }, { createdAt: new Date() })
  assert.equal(expectStatus(await request(users.second, 'GET', M + '/inbox'), 200).invites.length, 1)
  expectStatus(await request(users.late, 'POST', room(id, '/decline')), 200)
  assert.deepEqual(expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).declines, [])
  expectStatus(await request(users.second, 'POST', room(id, '/decline')), 200)
  expectStatus(await request(users.second, 'POST', room(id, '/decline')), 200)
  assert.deepEqual([expectStatus(await request(users.second, 'GET', M + '/inbox'), 200).invites, expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).declines.map(entry => [entry.meetingId, entry.title, entry.user]),
    expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).declines],
  [[], [[id, 'متابعة المشروع', { id: users.second.id, displayName: 'تامر المدعو', jobTitle: 'مهندس' }]], []])
  // اللي اعتذر لسه مدعو: يقدر يدخل بعدين
  assert.equal((await request(users.second, 'POST', room(id, '/token'))).status, 200)
})

test('MT-05: تحكم صاحب الاجتماع بس — كتم وإخراج وإنهاء على خادم الاجتماعات، والتعديل والإلغاء، والاجتماع بميعاد ومن غير غرفة انتظار', async () => {
  const id = state.id, target = String(users.guest.id)
  const claims = call => decode(call.auth.replace(/^Bearer /, ''))
  // لغير صاحب الاجتماع: ولا إجراء، ولا نداء على الخادم
  let before = calls.length
  for (const [method, route, body] of [['POST', room(id, '/mute'), { userId: users.second.id, track: 'audio' }], ['POST', room(id, '/remove'), { userId: users.second.id }], ['POST', room(id, '/end')],
    ['PATCH', room(id), { title: 'عنوان تاني' }], ['DELETE', room(id)]]) {
    for (const user of [users.guest, users.late, users.admin]) assert.deepEqual(coded(await request(user, method, route, body)), [403, 'MEET_HOST_ONLY', rules.MEET_HOST_ONLY], `${method} ${route} ${user.email}`)
  }
  assert.deepEqual([calls.length, (await repo('Meeting').findOneByOrFail({ id: state.rowId })).title], [before, 'متابعة المشروع'])

  // الكتم: المايك المفتوح بس (أو الكاميرا)، بتذكرة إدارة الغرفة دي
  present.set(id, new Set([target, String(users.host.id)]))
  assert.deepEqual([answer(await request(users.host, 'POST', room(id, '/mute'), { userId: users.guest.id, track: 'screen' })), answer(await request(users.host, 'POST', room(id, '/mute'), { userId: users.host.id, track: 'audio' }))],
    [[400, rules.MEET_TRACK], [400, rules.MEET_NOT_YOURSELF]])
  before = calls.length
  assert.deepEqual(expectStatus(await request(users.host, 'POST', room(id, '/mute'), { userId: users.guest.id, track: 'audio' }), 200), { ok: true, muted: 1 })
  assert.deepEqual(calls.slice(before).map(call => [call.method, call.body, claims(call).video]), [
    ['GetParticipant', { room: id, identity: target }, { roomAdmin: true, room: id }],
    ['MutePublishedTrack', { room: id, identity: target, track_sid: 'TR_mic', muted: true }, { roomAdmin: true, room: id }]])
  before = calls.length
  assert.deepEqual(expectStatus(await request(users.host, 'POST', room(id, '/mute'), { userId: users.guest.id, track: 'video' }), 200), { ok: true, muted: 1 })
  assert.deepEqual(calls.slice(before).map(call => [call.method, call.body.track_sid]), [['GetParticipant', undefined], ['MutePublishedTrack', 'TR_cam']])
  // مشارك مش في الغرفة، وخادم واقع
  assert.deepEqual(coded(await request(users.host, 'POST', room(id, '/mute'), { userId: users.second.id, track: 'audio' })), [404, 'MEET_NOT_IN_ROOM', rules.MEET_NOT_IN_ROOM])
  down = true
  try { assert.deepEqual(coded(await request(users.host, 'POST', room(id, '/mute'), { userId: users.guest.id, track: 'audio' })), [503, 'MEET_UNAVAILABLE', rules.MEET_UNAVAILABLE]) } finally { down = false }

  // الإخراج: بيخرج من الغرفة، ودعوته بتتشال، ولازم يطلب الدخول عشان يرجع (حتى لو كان مدعو)
  before = calls.length
  expectStatus(await request(users.host, 'POST', room(id, '/remove'), { userId: users.guest.id }), 200)
  assert.deepEqual(calls.slice(before).map(call => [call.method, call.body, claims(call).video]), [['RemoveParticipant', { room: id, identity: target }, { roomAdmin: true, room: id }]])
  assert.deepEqual([present.get(id).has(target), await repo('MeetingInvite').count({ where: { meetingId: state.rowId, userId: users.guest.id } }), coded(await request(users.guest, 'POST', room(id, '/token'))).slice(0, 2),
    expectStatus(await request(users.guest, 'GET', room(id)), 200).access], [false, 0, [403, 'MEET_KNOCK_REQUIRED'], 'knock'])
  // إخراج حد مش في الغرفة عادي (مدعو لسه مادخلش)
  expectStatus(await request(users.host, 'POST', room(id, '/remove'), { userId: users.late.id }), 200)
  // المُخرَج بيطلب ← صاحب الاجتماع يوافق ← يرجع
  assert.deepEqual(expectStatus(await request(users.guest, 'POST', room(id, '/knock')), 200), { waiting: true })
  expectStatus(await request(users.host, 'POST', room(id, '/admit'), { userId: users.guest.id }), 200)
  assert.equal((await request(users.guest, 'POST', room(id, '/token'))).status, 200)

  // التعديل: بالخانات اللي اتبعتت بس؛ وقايمة المدعوين بتتبدّل — الجديد دعوته بترن (اجتماع شغال)، والقديم مابيرنش تاني
  await repo('Meeting').update({ id: state.rowId }, { createdAt: new Date(Date.now() - 5 * 60000) })
  const old = await repo('MeetingInvite').findOneByOrFail({ meetingId: state.rowId, userId: users.second.id })
  assert.deepEqual([answer(await request(users.host, 'PATCH', room(id), { title: '' })), answer(await request(users.host, 'PATCH', room(id), { lobby: 1 }))], [[400, rules.MEET_TITLE], [400, rules.MEET_LOBBY]])
  expectStatus(await request(users.host, 'PATCH', room(id), { title: 'متابعة المشروع — الجزء التاني' }), 200)
  let row = await repo('Meeting').findOneByOrFail({ id: state.rowId })
  assert.deepEqual([row.title, row.lobby, row.startsAt, await repo('MeetingInvite').count({ where: { meetingId: state.rowId } })], ['متابعة المشروع — الجزء التاني', true, null, 3])
  expectStatus(await request(users.host, 'PATCH', room(id), { inviteUserIds: [users.second.id, users.late.id, users.host.id, users.gone.id] }), 200)
  assert.deepEqual((await repo('MeetingInvite').find({ where: { meetingId: state.rowId }, order: { userId: 'ASC' } })).map(invite => invite.userId), [users.second.id, users.late.id])
  assert.equal((await repo('MeetingInvite').findOneByOrFail({ meetingId: state.rowId, userId: users.second.id })).id, old.id, 'الدعوة القديمة زي ما هي')
  // (علامة «مُخرَج» على دينا من فوق: الدعوة الجديدة بترن عندها برضه، ودخولها بموافقة)
  assert.deepEqual([expectStatus(await request(users.late, 'GET', M + '/inbox'), 200).invites.map(invite => invite.id), expectStatus(await request(users.second, 'GET', M + '/inbox'), 200).invites], [[id], []])

  // من غير غرفة انتظار: أي حساب معاه اللينك يدخل
  const open = expectStatus(await request(users.host, 'POST', R, { title: 'لقاء مفتوح', lobby: false }), 201)
  assert.deepEqual([expectStatus(await request(users.outsider, 'GET', room(open.id)), 200).access, expectStatus(await request(users.outsider, 'POST', room(open.id, '/knock')), 200), (await request(users.outsider, 'POST', room(open.id, '/token'))).status],
    ['open', { admitted: true }, 200])
  expectStatus(await request(users.host, 'PATCH', room(open.id), { lobby: true }), 200)
  assert.equal((await request(users.late, 'POST', room(open.id, '/token'))).status, 403)

  // اجتماع بميعاد: مابيرنش قبل ميعاده، وبيرن عند المدعو وصاحبه لما ييجي؛ والإلغاء بيقفله
  const later = new Date(Date.now() + 2 * 3600000).toISOString()
  const planned = expectStatus(await request(users.host, 'POST', R, { title: 'اجتماع الأسبوع', startsAt: later, inviteUserIds: [users.guest.id] }), 201)
  const plannedRow = await repo('Meeting').findOneByOrFail({ code: planned.id })
  assert.deepEqual([new Date(plannedRow.startsAt).toISOString(), expectStatus(await request(users.guest, 'GET', room(planned.id)), 200).status, expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).invites,
    expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).invites], [later, 'scheduled', [], []])
  await repo('Meeting').update({ id: plannedRow.id }, { startsAt: new Date(Date.now() - 5000) })
  assert.deepEqual([expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).invites.map(invite => [invite.id, invite.isHost]), expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).invites.map(invite => [invite.id, invite.isHost]),
    expectStatus(await request(users.guest, 'GET', room(planned.id)), 200).status], [[[planned.id, false]], [[planned.id, true]], 'live'])
  before = calls.length
  expectStatus(await request(users.host, 'DELETE', room(planned.id)), 200)
  assert.deepEqual(calls.slice(before).map(call => [call.method, call.body, claims(call).video]), [['DeleteRoom', { room: planned.id }, { roomCreate: true }]])
  assert.deepEqual([coded(await request(users.guest, 'POST', room(planned.id, '/token'))), coded(await request(users.host, 'DELETE', room(planned.id))).slice(0, 2), coded(await request(users.host, 'PATCH', room(planned.id), { title: 'تاني' })).slice(0, 2),
    expectStatus(await request(users.guest, 'GET', M + '/inbox'), 200).invites, expectStatus(await request(users.guest, 'GET', room(planned.id)), 200).status],
  [[410, 'MEET_CANCELLED', rules.MEET_CANCELLED], [410, 'MEET_CANCELLED'], [410, 'MEET_CANCELLED'], [], 'cancelled'])

  // الإنهاء: الغرفة بتتقفل على الخادم، ومفيش تذاكر ولا طلبات دخول بعدها؛ والإنهاء تاني مالوش أثر
  assert.deepEqual(expectStatus(await request(users.late, 'POST', room(open.id, '/knock')), 200), { waiting: true })
  before = calls.length
  expectStatus(await request(users.host, 'POST', room(id, '/end')), 200)
  expectStatus(await request(users.host, 'POST', room(open.id, '/end')), 200)
  assert.deepEqual(calls.slice(before).map(call => [call.method, call.body]), [['DeleteRoom', { room: id }], ['DeleteRoom', { room: open.id }]])
  row = await repo('Meeting').findOneByOrFail({ id: state.rowId })
  assert.ok(row.endedAt && !row.cancelledAt)
  for (const [user, route] of [[users.host, '/token'], [users.second, '/token'], [users.late, '/knock']]) assert.deepEqual(coded(await request(user, 'POST', room(id, route))), [410, 'MEET_ENDED', rules.MEET_ENDED], route)
  assert.deepEqual([coded(await request(users.late, 'GET', room(open.id, '/knock'))).slice(0, 2), expectStatus(await request(users.host, 'GET', M + '/inbox'), 200).knocks, meet.knocks.size, meet.blocked.size], [[410, 'MEET_ENDED'], [], 0, 0])
  before = calls.length
  expectStatus(await request(users.host, 'POST', room(id, '/end')), 200)
  assert.equal(calls.length, before)
  // الخادم واقع وقت الإنهاء: الاجتماع بيتقفل في النظام برضه
  const last = expectStatus(await request(users.host, 'POST', R, { title: 'آخر اجتماع' }), 201)
  down = true
  try { expectStatus(await request(users.host, 'POST', room(last.id, '/end')), 200) } finally { down = false }
  assert.equal((await request(users.host, 'POST', room(last.id, '/token'))).status, 410)
  // اجتماع محدش أنهاه: منتهي بعد 12 ساعة من بدايته
  const stale = expectStatus(await request(users.host, 'POST', R, { title: 'اجتماع قديم' }), 201)
  await repo('Meeting').update({ code: stale.id }, { createdAt: new Date(Date.now() - 13 * 3600000) })
  assert.deepEqual([expectStatus(await request(users.host, 'GET', room(stale.id)), 200).status, coded(await request(users.host, 'POST', room(stale.id, '/token'))).slice(0, 2)], ['ended', [410, 'MEET_ENDED']])
  const all = expectStatus(await request(users.host, 'GET', R), 200).meetings
  assert.deepEqual(all.map(meeting => [meeting.title, meeting.status]).sort(), [['آخر اجتماع', 'ended'], ['اجتماع الأسبوع', 'cancelled'], ['اجتماع قديم', 'ended'], ['لقاء مفتوح', 'ended'], ['متابعة المشروع — الجزء التاني', 'ended']])
  // الموديول لما يتقفل: المسارات مقفولة
  expectStatus(await request(users.admin, 'PUT', '/modules/meet', { enabled: false }), 200); modules.invalidate()
  assert.deepEqual([(await request(users.host, 'GET', R)).status, (await request(users.host, 'GET', M + '/inbox')).status, (await request(users.host, 'POST', room(id, '/token'))).status], [404, 404, 404])
})

test('MT-06 (P8A-B05): الاجتماع اتنهى وطلب التذكرة في الطريق — مفيش تذكرة بعد إنهاء اكتمل؛ والتذكرة عشر دقايق', async () => {
  expectStatus(await request(users.admin, 'PUT', '/modules/meet', { enabled: true }), 200); modules.invalidate()
  const made = expectStatus(await request(users.host, 'POST', R, { title: 'سباق الإنهاء', inviteUserIds: [users.guest.id] }), 201)
  const row = await repo('Meeting').findOneByOrFail({ code: made.id })
  // «إنهاء للكل» بيكتمل بعد ما طلب المدعو اتحكم عليه وقبل ما التذكرة تتوقّع (قراءة الاسم هي نقطة الانتظار)
  const original = meet.people
  let hit = false
  meet.people = async function (...args) {
    if (!hit) { hit = true; expectStatus(await request(users.host, 'POST', room(made.id, '/end')), 200) }
    return original.apply(this, args)
  }
  let late
  try { late = await request(users.guest, 'POST', room(made.id, '/token')) } finally { meet.people = original }
  assert.equal(hit, true)
  assert.ok((await repo('Meeting').findOneByOrFail({ id: row.id })).endedAt)
  assert.deepEqual([coded(late).slice(0, 2), 'token' in late.body, await repo('MeetingAttendance').countBy({ meetingId: row.id, userId: users.guest.id })], [[410, 'MEET_ENDED'], false, 0])
  // والإخراج في نفس النقطة: المُخرَج مابياخدش تذكرة
  const kicked = expectStatus(await request(users.host, 'POST', R, { title: 'سباق الإخراج', inviteUserIds: [users.guest.id] }), 201)
  hit = false
  meet.people = async function (...args) {
    if (!hit) { hit = true; expectStatus(await request(users.host, 'POST', room(kicked.id, '/remove'), { userId: users.guest.id }), 200) }
    return original.apply(this, args)
  }
  let removed
  try { removed = await request(users.guest, 'POST', room(kicked.id, '/token')) } finally { meet.people = original }
  assert.deepEqual([hit, coded(removed).slice(0, 2), 'token' in removed.body], [true, [403, 'MEET_KNOCK_REQUIRED'], false])
  // من غير سباق: التذكرة بتطلع، ومدتها عشر دقايق (زي تذاكر التجديد اللي خادم الاجتماعات بيديها للي جوه الغرفة)
  const open = expectStatus(await request(users.host, 'POST', R, { title: 'اجتماع عادي', inviteUserIds: [users.guest.id] }), 201)
  const claims = decode(expectStatus(await request(users.guest, 'POST', room(open.id, '/token')), 200).token)
  assert.deepEqual([claims.exp - claims.nbf, claims.video.roomJoin, require('../src/meet/livekit').LIVEKIT_TOKEN_TTL_SECONDS], [600, true, 600])
  expectStatus(await request(users.host, 'POST', room(open.id, '/end')), 200)
  expectStatus(await request(users.host, 'POST', room(kicked.id, '/end')), 200)
  expectStatus(await request(users.admin, 'PUT', '/modules/meet', { enabled: false }), 200); modules.invalidate()
})
