'use strict'
// B5.5 (ج) على SQL حقيقي: تبديل الوردية بموافقة الطرف التاني — الميزة الفرعية مقفولة افتراضيًا والتبديل زي الأول، ترحيل 166، صف الموافقة عند كل تقديم،
// قرار الطرف التاني، وشرط موافقته عند تنفيذ التبديل بعد الاعتماد النهائي. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_swap_consents_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_swap_consents_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-swap-consents-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/attendance/swap-consents')
const MIGRATION = path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', '20261010_166_shift_swap_consents.sql')
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, S = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token(user) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const raw = await response.text(); let parsed = null
  try { parsed = raw ? JSON.parse(raw) : null } catch { parsed = raw }
  return { status: response.status, body: parsed }
}
const ok = (response, status = 200) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
const refused = (response, status, message) => { assert.deepEqual([response.status, response.body?.message], [status, message]) }
const employee = (name, branch) => repo('Employee').save({ employeeCode: 'SW' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@swap-consents.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigration = async () => { assert.match(database, NAME); for (const batch of migrate.splitBatches(fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const W = (() => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - date.getDay() + 14); return ymd(date) })()
const day = offset => { const date = new Date(`${W}T12:00:00`); date.setDate(date.getDate() + offset); return ymd(date) }
const C = '/attendance/swap-consents'
const ask = (user, date, partner) => request(user, 'POST', '/requests', { typeCode: 'SHIFT_SWAP', payload: { date, withEmployeeId: partner.id }, submit: true })
const act = (user, id, action, comment) => request(user, 'POST', `/requests/${id}/act`, { action, ...(comment ? { comment } : {}) })
const decide = (user, id, body) => request(user, 'POST', `${C}/${id}`, body)
const consentOf = id => repo('ShiftSwapConsent').findOne({ where: { requestId: id } })
const statusOf = async id => (await repo('Request').findOneByOrFail({ id })).status
const overrideOf = async (person, date) => (await repo('ScheduleDayOverride').findOne({ where: { employeeId: person.id, date } }))?.shiftId ?? null
const wrapped = message => `لم يُعتمد الطلب — ${message}. الطلب باقٍ في صندوقك: ارفضه أو أرجعه لاستكمال المعلومات`

before(async () => {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  const connection = { server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } }
  master = await new sql.ConnectionPool({ ...connection, database: 'master' }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
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
  B.main = await repo('Branch').save({ code: 'SW_1', name: 'الفرع الرئيسي', country: 'SA' })
  U.admin = await repo('User').save({ email: 'admin@swap-consents.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.a = await employee('موظف أ', B.main); E.b = await employee('موظف ب', B.main); E.c = await employee('موظف ج', B.main)
  U.a = await account('a', B.main, [], { employeeId: E.a.id }); U.b = await account('b', B.main, [], { employeeId: E.b.id }); U.c = await account('c', B.main, [], { employeeId: E.c.id })
  U.approver = await account('approver', B.main, ['approve.hr', 'requests.view_all'], { scopeAllBranches: true })
  S.early = await repo('Shift').save({ name: 'صباحي', startTime: '08:00', endTime: '16:00', shiftMode: 'fixed', isActive: true, branchId: null })
  S.late = await repo('Shift').save({ name: 'ليلي', startTime: '22:00', endTime: '06:00', shiftMode: 'fixed', isActive: true, branchId: null })
  S.mid = await repo('Shift').save({ name: 'مسائي', startTime: '14:00', endTime: '22:00', shiftMode: 'fixed', isActive: true, branchId: null })
  for (const [person, shift] of [[E.a, S.early], [E.b, S.late], [E.c, S.mid]]) await repo('ScheduleEntry').save({ weekStart: W, employeeId: person.id, shiftId: shift.id, shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime })
  const chain = await repo('ApprovalChain').save({ code: 'SW_HR', nameAr: 'سلسلة تبديل الوردية', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'SHIFT_SWAP', nameAr: 'تبديل وردية', category: 'time_attendance', destinationHandler: 'shift_schedule', approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(['date', 'withEmployeeId']) })
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

test('SW-01: الميزة مقفولة افتراضيًا = التبديل زي الأول بالحرف (اعتماد المدير كفاية ومن غير صف موافقة)؛ وقبل ترحيل 166 الشاشة بتقول ناقص؛ والترحيل بشكل الكيان وبيتكرر', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.SWAP_CONSENT_FEATURE), false)
  assert.deepEqual([(await request(U.b, 'GET', `${C}/mine`)).status, (await decide(U.b, 1, { accept: true })).status], [404, 404])
  const legacy = ok(await ask(U.a, day(1), E.b), 201)
  assert.equal(await consentOf(legacy.id), null)
  ok(await act(U.approver, legacy.id, 'APPROVE'), 201)
  assert.deepEqual([await statusOf(legacy.id), await overrideOf(E.a, day(1)), await overrideOf(E.b, day(1))], ['COMPLETED', S.late.id, S.early.id])
  // طلب اتقدّم والميزة مقفولة بيتنفّذ من غير موافقة حتى لو الميزة اتفتحت بعده
  const old = ok(await ask(U.a, day(2), E.b), 201)
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.SWAP_CONSENT_FEATURE}`, { enabled: true })); modules.invalidate()
  const text = fs.readFileSync(MIGRATION)
  assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
  assert.ok(String(text).match(/THROW \d+/g).every(code => /^THROW 1660\d\d$/.test(code)))
  assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  await runMigration()
  await pool.request().batch('DROP TABLE dbo.shift_swap_consents'); rules.resetSwapConsentsCache()
  assert.deepEqual(ok(await request(U.b, 'GET', `${C}/mine`)), { ready: false, rows: [] })
  refused(await decide(U.b, old.id, { accept: true }), 400, 'جدول موافقات تبديل الوردية ناقص — طبّق ترحيل 166 الأول')
  // قبل الترحيل: التقديم والتنفيذ من غير شرط الموافقة
  const early = ok(await ask(U.a, day(3), E.b), 201)
  ok(await act(U.approver, early.id, 'APPROVE'), 201)
  assert.equal(await statusOf(early.id), 'COMPLETED')
  await runMigration(); await runMigration()
  assert.deepEqual(ok(await request(U.b, 'GET', `${C}/mine`)), { ready: true, rows: [] })
  ok(await act(U.approver, old.id, 'APPROVE'), 201)
  assert.deepEqual([await statusOf(old.id), await consentOf(old.id)], ['COMPLETED', null])
})

test('SW-02: الميزة مفتوحة — التقديم بيسجّل موافقة «مستني» للطرف التاني، والتنفيذ بيقف لحد ما يوافق؛ والرفض بيوقّفه؛ والقرار لصاحبه بس ومرة واحدة', async () => {
  const sent = ok(await ask(U.a, day(4), E.b), 201)
  const row = await consentOf(sent.id)
  assert.deepEqual([row.partnerEmployeeId, row.status, row.decidedAt], [E.b.id, 'PENDING', null])
  // الطرف التاني بيشوف الطلب؛ وغيره لأ
  const mine = ok(await request(U.b, 'GET', `${C}/mine`)).rows
  assert.deepEqual(mine.map(item => [item.requestId, item.requesterName, item.date, item.withDate, item.status, item.open]), [[sent.id, 'موظف أ', day(4), day(4), 'PENDING', true]])
  assert.deepEqual([ok(await request(U.a, 'GET', `${C}/mine`)).rows, ok(await request(U.c, 'GET', `${C}/mine`)).rows], [[], []])
  refused(await request(U.approver, 'GET', `${C}/mine`), 403, 'حسابك مش مربوط بملف موظف')
  // المدير اعتمد قبل موافقة الطرف التاني: التنفيذ بيقف والطلب في صندوقه، ومفيش وردية اتبدّلت
  refused(await act(U.approver, sent.id, 'APPROVE'), 400, wrapped(rules.SWAP_CONSENT_PENDING))
  assert.deepEqual([await statusOf(sent.id) === 'COMPLETED', await overrideOf(E.a, day(4))], [false, null])
  // القرار: قيمه، ولصاحبه بس (طالب التبديل أو زميل تالت أو طلب مش موجود = «مش موجود»)
  for (const [body, message] of [[{}, 'اختار: موافق أو مش موافق'], [{ accept: 'yes' }, 'اختار: موافق أو مش موافق'], [{ accept: true, note: 'x'.repeat(301) }, 'الملاحظة 300 حرف بالكتير']]) refused(await decide(U.b, sent.id, body), 400, message)
  for (const [user, id] of [[U.a, sent.id], [U.c, sent.id], [U.b, 999999]]) refused(await decide(user, id, { accept: true }), 404, rules.SWAP_CONSENT_NOT_FOUND)
  ok(await decide(U.b, sent.id, { accept: false, note: '  عندي   ظرف ' }), 201)
  const declined = await consentOf(sent.id)
  assert.deepEqual([declined.status, declined.note, declined.decidedAt != null], ['DECLINED', 'عندي ظرف', true])
  refused(await decide(U.b, sent.id, { accept: true }), 409, 'سجّلت قرارك على الطلب ده قبل كده')
  refused(await act(U.approver, sent.id, 'APPROVE'), 400, wrapped(rules.SWAP_CONSENT_DECLINED))
  assert.equal(await overrideOf(E.a, day(4)), null)
  // الإرجاع وإعادة التقديم: موافقة جديدة مطلوبة
  ok(await act(U.approver, sent.id, 'RETURN', 'اتفقوا الأول'), 201)
  refused(await decide(U.b, sent.id, { accept: true }), 409, 'الطلب مابقاش تحت الاعتماد — مفيش قرار يتسجّل عليه')
  ok(await request(U.a, 'POST', `/requests/${sent.id}/resubmit`, {}), 201)
  const again = await consentOf(sent.id)
  assert.deepEqual([again.id, again.status, again.note, again.decidedAt], [row.id, 'PENDING', null, null])
  // طلبين قرار مع بعض = قرار واحد
  const both = await Promise.all([decide(U.b, sent.id, { accept: true }), decide(U.b, sent.id, { accept: true })])
  assert.deepEqual(both.map(response => response.status).sort(), [201, 409])
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  assert.deepEqual([await statusOf(sent.id), await overrideOf(E.a, day(4)), await overrideOf(E.b, day(4))], ['COMPLETED', S.late.id, S.early.id])
  assert.deepEqual(ok(await request(U.b, 'GET', `${C}/mine`)).rows.map(item => [item.status, item.open]), [['ACCEPTED', false]])
})

test('SW-03: الطرف التاني اتغيّر عند إعادة التقديم = الموافقة للطرف الجديد؛ وطلب اترفض مايتسجّلش عليه قرار؛ وموافقة لطرف قديم ماتنفّذش تبديل مع غيره', async () => {
  const sent = ok(await ask(U.a, day(5), E.b), 201)
  ok(await decide(U.b, sent.id, { accept: true }), 201)
  ok(await act(U.approver, sent.id, 'RETURN', 'غيّر الزميل'), 201)
  ok(await request(U.a, 'POST', `/requests/${sent.id}/resubmit`, { payload: { date: day(5), withEmployeeId: E.c.id } }), 201)
  const row = await consentOf(sent.id)
  assert.deepEqual([row.partnerEmployeeId, row.status], [E.c.id, 'PENDING'])
  assert.equal(await repo('ShiftSwapConsent').count({ where: { requestId: sent.id } }), 1, 'صف واحد للطلب')
  // الطرف القديم مابقاش طرف
  refused(await decide(U.b, sent.id, { accept: true }), 404, rules.SWAP_CONSENT_NOT_FOUND)
  assert.deepEqual([ok(await request(U.b, 'GET', `${C}/mine`)).rows.some(item => item.requestId === sent.id), ok(await request(U.c, 'GET', `${C}/mine`)).rows.map(item => item.requestId)], [false, [sent.id]])
  refused(await act(U.approver, sent.id, 'APPROVE'), 400, wrapped(rules.SWAP_CONSENT_PENDING))
  // صف «وافق» لطرف غير اللي في الحمولة مايعدّيش التنفيذ
  await pool.request().query(`UPDATE dbo.shift_swap_consents SET [status] = N'ACCEPTED', [partnerEmployeeId] = ${Number(E.b.id)} WHERE [requestId] = ${Number(sent.id)}`)
  refused(await act(U.approver, sent.id, 'APPROVE'), 400, wrapped(rules.SWAP_CONSENT_PENDING))
  await pool.request().query(`UPDATE dbo.shift_swap_consents SET [status] = N'PENDING', [partnerEmployeeId] = ${Number(E.c.id)} WHERE [requestId] = ${Number(sent.id)}`)
  ok(await decide(U.c, sent.id, { accept: true }), 201)
  ok(await act(U.approver, sent.id, 'APPROVE'), 201)
  assert.deepEqual([await overrideOf(E.a, day(5)), await overrideOf(E.c, day(5)), await overrideOf(E.b, day(5))], [S.mid.id, S.early.id, null])
  // طلب اترفض: مفيش قرار يتسجّل
  const dead = ok(await ask(U.a, day(6), E.b), 201)
  ok(await act(U.approver, dead.id, 'REJECT', 'مش مناسب'), 201)
  refused(await decide(U.b, dead.id, { accept: true }), 409, 'الطلب مابقاش تحت الاعتماد — مفيش قرار يتسجّل عليه')
  // قفل الميزة: مفيش مسار، وطلب جديد بيتنفّذ زي الأول من غير صف
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.SWAP_CONSENT_FEATURE}`, { enabled: false })); modules.invalidate()
  assert.equal((await request(U.b, 'GET', `${C}/mine`)).status, 404)
  const plain = ok(await ask(U.b, day(0), E.c), 201)
  assert.equal(await consentOf(plain.id), null)
  ok(await act(U.approver, plain.id, 'APPROVE'), 201)
  assert.equal(await statusOf(plain.id), 'COMPLETED')
})

test('SW-04 (Codex P5A-B07): حالة الميزة جوه معاملة تقديم التبديل بتتقري بمدير المعاملة — قارئ المخزن مابيتناداش، والذاكرة المؤقتة مش شرط، والميزة مقفولة أو مفتوحة', async () => {
  // أسبوع جديد بجدوله: أيام أسبوع الاختبارات اللي فاتت كلها عليها طلبات تبديل قايمة
  for (const [person, shift] of [[E.a, S.early], [E.b, S.late], [E.c, S.mid]]) await repo('ScheduleEntry').save({ weekStart: day(7), employeeId: person.id, shiftId: shift.id, shiftName: shift.name, startTime: shift.startTime, endTime: shift.endTime })
  const poolReader = modules.isFeatureEnabled.bind(modules), loader = modules.state.bind(modules)
  const submitWith = async (user, partner) => {
    let inside = 0
    // أي قراءة بالمخزن وقت التقديم بتتعد: الحارس بيقرا قبل المعاملة (مسموح)، فالعد بيبدأ بعده بحجب القارئين جوه مسار التقديم نفسه
    modules.isFeatureEnabled = async feature => { if (feature === rules.SWAP_CONSENT_FEATURE) { inside++; throw new Error('pool reader used for the swap consent feature') } return poolReader(feature) }
    try {
      // أول يوم في أسبوع الاختبار التبديل فيه مقبول (أيام اتستخدمت في الاختبارات اللي فاتت بتترفض برسالة عمل)
      for (const offset of [7, 8, 9, 10, 11, 12, 13]) {
        modules.invalidate()
        const response = await ask(user, day(offset), partner)
        assert.ok(response.status < 500, JSON.stringify(response.body))
        if (response.status === 201) return { response, inside }
      }
      throw new Error('no day in the test week accepted a swap')
    } finally { modules.isFeatureEnabled = poolReader; modules.state = loader }
  }
  // الميزة مقفولة (آخر حالة في SW-03): التقديم زي الأول ومن غير صف موافقة
  const closed = await submitWith(U.b, E.c)
  assert.deepEqual([closed.response.status, closed.inside, await consentOf(closed.response.body.id)], [201, 0, null])
  // الميزة مفتوحة: صف «مستني» بيتسجّل — وبرضه من غير قارئ المخزن
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.SWAP_CONSENT_FEATURE}`, { enabled: true })); modules.invalidate()
  const open = await submitWith(U.c, E.b)
  assert.deepEqual([open.response.status, open.inside, (await consentOf(open.response.body.id))?.status], [201, 0, 'PENDING'])
  // عشر تقديمات مع بعض بعد إبطال الذاكرة المؤقتة: كلهم بيعدّوا أو بيترفضوا برسالة عمل — مفيش 500
  modules.invalidate()
  const burst = await Promise.all(Array.from({ length: 10 }, (_, index) => ask(index % 2 ? U.b : U.c, day(7 + (index % 7)), index % 2 ? E.c : E.b)))
  assert.deepEqual(burst.filter(response => response.status >= 500).map(response => response.body), [])
  const source = fs.readFileSync(path.join(apiRoot, 'src', 'requests', 'requests.service.ts'), 'utf8')
  assert.match(source, /stageSwapConsent\(em, req, !!this\.modules && await this\.modules\.isFeatureEnabledIn\(em, SWAP_CONSENT_FEATURE\)\)/)
  assert.doesNotMatch(source, /isFeatureEnabled\(SWAP_CONSENT_FEATURE\)/)
})
