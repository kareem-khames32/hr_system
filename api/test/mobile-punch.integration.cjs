'use strict'
// B5.6 على SQL حقيقي: بصمة الموبايل — الميزة الفرعية مقفولة افتراضيًا، ترحيلي 167 و168، مواقع البصمة بنطاق الفرع، والحكم على الخادم (نطاق، دقة، وقت الخادم،
// مهلة بين بصمتين)، وتسجيل كل محاولة، ودخول البصمة المقبولة من مسار البصمات القايم. قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_mobile_punch_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_mobile_punch_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-mobile-punch-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/attendance/mobile-punch')
const MIGRATIONS = ['20261010_167_punch_sites.sql', '20261010_168_mobile_punch_attempts.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'MP' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@mobile-punch.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const P = '/attendance/mobile-punch'
// موقع المصنع ونقط حواليه
const SITE = { latitude: 24.7136, longitude: 46.6753 }
const INSIDE = { latitude: 24.7137, longitude: 46.6754, accuracy: 12.4 }
const OUTSIDE = { latitude: 24.72, longitude: 46.6753, accuracy: 10 }
const punch = (user, body) => request(user, 'POST', P, body)
const saveSite = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${P}/sites/${id}` : `${P}/sites`, body)
const attemptsOf = async person => (await repo('MobilePunchAttempt').find({ where: { employeeId: person.id }, order: { id: 'ASC' } })).map(row => [row.outcome, row.siteId, row.accuracyMeters, row.distanceMeters])
const punchesOf = person => repo('AttendancePunch').find({ where: { employeeId: person.id }, order: { id: 'ASC' } })
const cool = person => pool.request().query(`UPDATE dbo.mobile_punch_attempts SET [createdAt] = DATEADD(MINUTE, -5, [createdAt]) WHERE [employeeId] = ${Number(person.id)}`)

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
  B.riyadh = await repo('Branch').save({ code: 'MP_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'MP_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@mobile-punch.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.one = await employee('موظف أول', B.riyadh, { fingerprintCode: '9001' }); E.bare = await employee('موظف من غير بصمة', B.riyadh)
  E.cairo = await employee('موظف القاهرة', B.cairo, { fingerprintCode: '9003' }); E.gone = await employee('موظف منتهي', B.riyadh, { fingerprintCode: '9004', status: 'terminated', isActive: false })
  E.racer = await employee('موظف مستعجل', B.riyadh, { fingerprintCode: '9005' })
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.bare = await account('bare', B.riyadh, [], { employeeId: E.bare.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id })
  U.gone = await account('gone', B.riyadh, [], { employeeId: E.gone.id }); U.racer = await account('racer', B.riyadh, [], { employeeId: E.racer.id })
  U.mgr = await account('mgr', B.riyadh, ['attendance.manage', 'attendance.view_all']); U.mgrCairo = await account('mgr-cairo', B.cairo, ['attendance.manage', 'attendance.view_all'])
  U.viewer = await account('viewer', B.riyadh, ['attendance.view_all'])
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

test('MP-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار؛ وقبل الترحيلين الشاشة بتقول ناقص ومفيش بصمة؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.MOBILE_PUNCH_FEATURE), false)
  assert.deepEqual([(await request(U.one, 'GET', P)).status, (await punch(U.one, INSIDE)).status, (await request(U.mgr, 'GET', `${P}/sites`)).status, (await request(U.mgr, 'GET', `${P}/attempts`)).status], [404, 404, 404, 404])
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.MOBILE_PUNCH_FEATURE}`, { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  await pool.request().batch('DROP TABLE dbo.mobile_punch_attempts'); await pool.request().batch('DROP TABLE dbo.punch_sites'); rules.resetMobilePunchCache()
  assert.deepEqual(ok(await request(U.one, 'GET', P)), { ready: false, hasFingerprint: false, sites: [], attempts: [] })
  assert.deepEqual((({ ready, sites }) => [ready, sites])(ok(await request(U.mgr, 'GET', `${P}/sites`))), [false, []])
  refused(await punch(U.one, INSIDE), 400, rules.MOBILE_PUNCH_MIGRATION_MISSING)
  refused(await saveSite(U.mgr, { name: 'المصنع', branchId: B.riyadh.id, ...SITE, radiusMeters: 150 }), 400, rules.MOBILE_PUNCH_MIGRATION_MISSING)
  assert.equal((await punchesOf(E.one)).length, 0)
  await runMigrations(); await runMigrations()
  assert.deepEqual(ok(await request(U.one, 'GET', P)), { ready: true, hasFingerprint: true, sites: [], attempts: [] })
})

test('MP-02: مواقع البصمة — بنطاق الفرع (فرع تاني «مش موجود»)، بإحداثيات ونصف قطر متحكم فيهم، وبسطر تدقيق', async () => {
  const good = { name: '  مصنع   الرياض ', branchId: B.riyadh.id, ...SITE, radiusMeters: 150 }
  for (const [body, message] of [[{ ...good, name: 'م' }, 'اسم الموقع من حرفين لحد 120 حرف'], [{ ...good, branchId: 'x' }, 'اختار الفرع'], [{ ...good, latitude: 91 }, 'الإحداثيات مش صحيحة (خط العرض من -90 لـ90، والطول من -180 لـ180)'],
    [{ ...good, longitude: '46.6' }, 'الإحداثيات مش صحيحة (خط العرض من -90 لـ90، والطول من -180 لـ180)'], [{ ...good, radiusMeters: 10 }, 'نصف القطر رقم صحيح من 20 لحد 5000 متر'],
    [{ ...good, radiusMeters: 150.5 }, 'نصف القطر رقم صحيح من 20 لحد 5000 متر']]) refused(await saveSite(U.mgr, body), 400, message)
  refused(await saveSite(U.mgr, { ...good, branchId: B.cairo.id }), 404, 'الفرع مش موجود')
  assert.equal((await saveSite(U.viewer, good)).status, 403)
  S.plant = ok(await saveSite(U.mgr, good), 201).id
  S.far = ok(await saveSite(U.mgr, { name: 'مخزن بعيد', branchId: B.riyadh.id, latitude: 24.9, longitude: 46.9, radiusMeters: 100 }), 201).id
  S.off = ok(await saveSite(U.mgr, { name: 'موقع مقفول', branchId: B.riyadh.id, ...SITE, radiusMeters: 5000, isActive: false }), 201).id
  refused(await saveSite(U.mgrCairo, good, S.plant), 404, rules.SITE_NOT_FOUND)
  refused(await saveSite(U.mgr, good, 999999), 404, rules.SITE_NOT_FOUND)
  ok(await saveSite(U.mgr, { ...good, radiusMeters: 200 }, S.plant))
  const listed = ok(await request(U.mgr, 'GET', `${P}/sites`))
  assert.deepEqual([listed.branches, listed.sites.find(row => row.id === S.plant)], [[{ id: B.riyadh.id, name: 'فرع الرياض' }], { id: S.plant, name: 'مصنع الرياض', branchId: B.riyadh.id, latitude: 24.7136, longitude: 46.6753, radiusMeters: 200, isActive: true }])
  assert.deepEqual(ok(await request(U.mgrCairo, 'GET', `${P}/sites`)).sites, [])
  // الموظف بيشوف أسماء مواقع فرعه المفعّلة ونصف قطرها — من غير إحداثيات
  assert.deepEqual(ok(await request(U.one, 'GET', P)).sites.map(row => Object.keys(row).sort().join(',') + ':' + row.name).sort(), ['id,name,radiusMeters:مخزن بعيد', 'id,name,radiusMeters:مصنع الرياض'].sort())
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'punch_site' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { PUNCH_SITE_CREATED: 3, PUNCH_SITE_UPDATED: 1 })
})

test('MP-03: البصمة — الحكم على الخادم وكل محاولة بتتسجّل: مفيش موقع، دقة ضعيفة، برّه النطاق = مرفوضة من غير بصمة؛ والمقبولة بوقت الخادم من مسار البصمات القايم، ومهلة دقيقة', async () => {
  refused(await punch(U.mgr, INSIDE), 403, 'حسابك مش مربوط بملف موظف')
  refused(await punch(U.gone, INSIDE), 403, 'ملفك مش على رأس العمل — مفيش بصمة تتسجّل')
  refused(await punch(U.bare, INSIDE), 400, 'ملفك مالوش رقم بصمة — راجع الموارد البشرية')
  // موقع مش صالح: مفيش حكم ولا محاولة
  for (const [body, message] of [[{}, 'موقعك مااتحددش — اسمح للمتصفح بتحديد الموقع وجرّب تاني'], [{ ...INSIDE, latitude: 200 }, 'موقعك مااتحددش — اسمح للمتصفح بتحديد الموقع وجرّب تاني'],
    [{ latitude: INSIDE.latitude, longitude: INSIDE.longitude }, 'دقة الموقع مش معروفة — جرّب تاني'], [{ ...INSIDE, accuracy: 0 }, 'دقة الموقع مش معروفة — جرّب تاني']]) refused(await punch(U.one, body), 400, message)
  assert.deepEqual(await attemptsOf(E.one), [])
  // فرع من غير موقع
  refused(await punch(U.cairo, INSIDE), 400, rules.OUTCOME_MESSAGES.NO_SITE)
  assert.deepEqual(await attemptsOf(E.cairo), [['NO_SITE', null, 13, null]])
  // دقة أسوأ من الحد حتى والنقطة جوه؛ وبرّه النطاق (أقرب موقع المصنع على ~712 متر)
  refused(await punch(U.one, { ...INSIDE, accuracy: 250 }), 400, rules.OUTCOME_MESSAGES.LOW_ACCURACY)
  refused(await punch(U.one, OUTSIDE), 400, rules.OUTCOME_MESSAGES.OUT_OF_RANGE)
  const refusedRows = await attemptsOf(E.one)
  assert.deepEqual([refusedRows.map(row => [row[0], row[1], row[2]]), refusedRows[1][3] > 650 && refusedRows[1][3] < 780, (await punchesOf(E.one)).length], [[['LOW_ACCURACY', S.plant, 250], ['OUT_OF_RANGE', S.plant, 10]], true, 0])
  // المقبولة: وقت الخادم (العميل مايبعتش وقت)، بصمة جهاز باسم الموقع من المسار القايم، وتأكيد فوري
  const started = Date.now()
  const done = ok(await punch(U.one, { ...INSIDE, timestamp: '2020-01-01T08:00:00', employeeCode: '9003', siteId: S.far }), 201)
  assert.deepEqual([done.accepted, done.siteName, done.distanceMeters < 30, Math.abs(new Date(done.at).getTime() - started) < 60000], [true, 'مصنع الرياض', true, true])
  const [saved] = await punchesOf(E.one)
  assert.deepEqual([saved.employeeCode, saved.deviceSn, saved.source, Math.abs(new Date(saved.punchTime).getTime() - started) < 120000, (await punchesOf(E.cairo)).length], ['9001', `${rules.MOBILE_DEVICE_PREFIX}${S.plant}`, 'DEVICE', true, 0])
  assert.equal((await attemptsOf(E.one)).at(-1)[0], 'ACCEPTED')
  // مهلة دقيقة بين بصمتين مقبولتين؛ وبعدها بصمة تانية
  refused(await punch(U.one, INSIDE), 409, 'لسه مسجّل بصمة من أقل من دقيقة')
  await cool(E.one)
  ok(await punch(U.one, INSIDE), 201)
  assert.equal((await punchesOf(E.one)).length, 2)
  // طلبين مع بعض = بصمة واحدة
  const both = await Promise.all([punch(U.racer, INSIDE), punch(U.racer, INSIDE)])
  assert.deepEqual([both.map(response => response.status).sort(), (await punchesOf(E.racer)).length], [[201, 409], 1])
  // الموقع المقفول مابيتحسبش: قفل المصنع = أقرب موقع المخزن البعيد
  ok(await saveSite(U.mgr, { name: 'مصنع الرياض', branchId: B.riyadh.id, ...SITE, radiusMeters: 200, isActive: false }, S.plant))
  await cool(E.one)
  refused(await punch(U.one, INSIDE), 400, rules.OUTCOME_MESSAGES.OUT_OF_RANGE)
  assert.equal((await attemptsOf(E.one)).at(-1)[1], S.far)
  ok(await saveSite(U.mgr, { name: 'مصنع الرياض', branchId: B.riyadh.id, ...SITE, radiusMeters: 200, isActive: true }, S.plant))
  // الموظف اتنقل لفرع من غير موقع: بصمته بتتحكم بفرعه الحالي
  await repo('Employee').update({ id: E.one.id }, { branchId: B.cairo.id })
  refused(await punch(U.one, INSIDE), 400, rules.OUTCOME_MESSAGES.NO_SITE)
  await repo('Employee').update({ id: E.one.id }, { branchId: B.riyadh.id })
})

test('MP-04: المراجعة — محاولات موظفين نطاق الحساب بفرعهم الحالي (مقبولة ومرفوضة بسببها)، والموظف بيشوف محاولاته هو بس', async () => {
  const riyadh = ok(await request(U.viewer, 'GET', `${P}/attempts`))
  assert.deepEqual([riyadh.ready, riyadh.canManage, [...new Set(riyadh.rows.map(row => row.employeeName))].sort()], [true, false, ['موظف أول', 'موظف مستعجل'].sort()])
  const first = riyadh.rows.find(row => row.outcome === 'OUT_OF_RANGE' && row.siteName === 'مصنع الرياض')
  assert.deepEqual([first.outcomeLabel, first.accuracyMeters, first.distanceMeters > 650, 'latitude' in first], ['برّه نطاق الموقع', 10, true, false])
  const cairo = ok(await request(U.mgrCairo, 'GET', `${P}/attempts`))
  assert.deepEqual([cairo.canManage, cairo.rows.map(row => [row.employeeName, row.outcome, row.siteName])], [true, [['موظف القاهرة', 'NO_SITE', null]]])
  assert.equal((await request(U.one, 'GET', `${P}/attempts`)).status, 403)
  const mine = ok(await request(U.one, 'GET', P)).attempts
  assert.deepEqual([mine.length, mine[0].outcome, mine.every(row => row.employeeId === E.one.id), ok(await request(U.bare, 'GET', P)).attempts], [6, 'NO_SITE', true, []]) // دقة ضعيفة، برّه النطاق، مقبولتين، برّه النطاق (المخزن)، مفيش موقع — ومحاولة «قبل دقيقة» مابتتسجّلش
  // قفل الميزة: مفيش مسار ولا بصمة
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.MOBILE_PUNCH_FEATURE}`, { enabled: false })); modules.invalidate()
  await cool(E.one)
  assert.deepEqual([(await punch(U.one, INSIDE)).status, (await request(U.viewer, 'GET', `${P}/attempts`)).status, (await punchesOf(E.one)).length], [404, 404, 2])
})
