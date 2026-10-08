'use strict'
// B5.5 (أ) على SQL حقيقي: أدوات الجدولة — الميزة الفرعية مقفولة افتراضيًا، ترحيلي 161 و162، أنماط التدوير بنطاقها، نسخ أسبوع وتطبيق نمط من خلال
// حفظ الجدول الأسبوعي القايم، ونشر جدول أسبوع لفرع بإشعار لموظفيه. و(ب): قواعد الراحة وحد الساعات والتغطية بالمهارة (ترحيلات 163–165)، والفحص بالطلب
// وعند النشر (مخالفة «منع» بتوقّفه إلا بسبب تجاوز). قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_schedule_tools_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_schedule_tools_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-schedule-tools-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/attendance/schedule-tools')
const checks = require('../src/attendance/schedule-checks')
const MIGRATIONS = ['20261010_161_shift_rotations.sql', '20261010_162_schedule_publications.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
let master, pool, app, ds, base, modules, queue, created = false, sequence = 0
const B = {}, E = {}, U = {}, S = {}, R = {}
const repo = name => { assert.match(database, NAME); assert.equal(ds.options.database, database); return ds.getRepository(name) }
const query = (text, params) => { assert.equal(ds.options.database, database); return ds.query(text, params) }
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
const employee = (name, branch) => repo('Employee').save({ employeeCode: 'ST' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash' })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@schedule-tools.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const shift = (name, startTime, endTime, isActive = true) => repo('Shift').save({ name, startTime, endTime, shiftMode: 'fixed', isActive, branchId: null })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
/** بداية الأسبوع (الأحد) بعد n أسبوع من الأسبوع الحالي */
const week = n => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() - date.getDay() + n * 7); return ymd(date) }
const T = '/attendance/schedule-tools'
const entry = (person, weekStart, row) => ({ weekStart, employeeId: person.id, shiftId: row.id, shiftName: row.name, startTime: row.startTime, endTime: row.endTime })
const shiftsOf = async weekStart => Object.fromEntries((await query(`SELECT [employeeId], [shiftId] FROM [weekly_schedule_entries] WHERE [weekStart] = @0`, [weekStart])).map(row => [Number(row.employeeId), Number(row.shiftId)]))
async function drain() {
  for (let round = 0; round < 6; round++) {
    const result = await queue.runOnce({ limit: 200 })
    if (!result.dispatched && !result.done && !result.retried && !result.dead) return
  }
}
const notified = async id => (await query(`SELECT n.[recipientUserId], n.[eventCode], n.[category], n.[kind], n.[inApp], n.[title], n.[body], n.[link] FROM [notifications] n
  WHERE n.[entityType] = N'schedule_publication' AND n.[entityId] = @0 ORDER BY n.[recipientUserId]`, [String(id)]))

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
  queue = app.get(require('../src/queue/queue.service').QueueService)
  B.riyadh = await repo('Branch').save({ code: 'ST_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'ST_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@schedule-tools.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.one = await employee('موظف أول', B.riyadh); E.two = await employee('موظف تاني', B.riyadh); E.three = await employee('موظف تالت', B.riyadh); E.cairo = await employee('موظف القاهرة', B.cairo)
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id })
  U.sched = await account('sched', B.riyadh, ['attendance.manage', 'attendance.view_all']); U.schedCairo = await account('sched-cairo', B.cairo, ['attendance.manage', 'attendance.view_all'])
  U.viewer = await account('viewer', B.riyadh, ['attendance.view_all'])
  S.morning = await shift('صباحي', '08:00', '16:00'); S.evening = await shift('مسائي', '14:00', '22:00'); S.night = await shift('ليلي', '22:00', '06:00'); S.closed = await shift('وردية مقفولة', '09:00', '17:00', false)
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

test('ST-01: الميزة الفرعية مقفولة افتراضيًا = مفيش مسار والجدول القايم شغال؛ وقبل الترحيلين الشاشة بتقول ناقص؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان', async () => {
  assert.equal(await modules.isFeatureEnabled(rules.SCHEDULE_TOOLS_FEATURE), false)
  for (const [method, route, body] of [['GET', T], ['POST', `${T}/copy-week`, { fromWeek: week(1), toWeek: week(2) }], ['POST', `${T}/publish`, { week: week(1), branchId: B.riyadh.id }], ['POST', `${T}/rotations`, { name: 'نمط' }]]) {
    assert.equal((await request(U.admin, method, route, body)).status, 404, route)
  }
  // الجدول الأسبوعي القايم مش ورا الميزة
  ok(await request(U.sched, 'POST', '/attendance/schedule', { entries: [entry(E.one, week(1), S.morning), entry(E.two, week(1), S.evening)] }), 201)
  ok(await request(U.admin, 'POST', '/attendance/schedule', { entries: [entry(E.cairo, week(1), S.morning)] }), 201)
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.SCHEDULE_TOOLS_FEATURE}`, { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  await pool.request().batch('DROP TABLE dbo.schedule_publications'); await pool.request().batch('DROP TABLE dbo.shift_rotations'); rules.resetScheduleToolsCache()
  assert.deepEqual(ok(await request(U.sched, 'GET', T)), { ready: false, companyWide: false, rotations: [], shifts: [], branches: [], publications: [] })
  for (const [route, body] of [[`${T}/copy-week`, { fromWeek: week(1), toWeek: week(2) }], [`${T}/publish`, { week: week(1), branchId: B.riyadh.id }], [`${T}/rotations`, { name: 'نمط', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id] }],
    [`${T}/apply-rotation`, { rotationId: 1, employeeIds: [E.one.id], fromWeek: week(1), weeks: 1 }]]) refused(await request(U.sched, 'POST', route, body), 400, rules.SCHEDULE_TOOLS_MIGRATION_MISSING)
  await runMigrations(); await runMigrations()
  const ready = ok(await request(U.sched, 'GET', T))
  assert.deepEqual([ready.ready, ready.companyWide, ready.rotations, ready.branches, ready.shifts.map(row => row.name).sort(), ready.publications],
    [true, false, [], [{ id: B.riyadh.id, name: 'فرع الرياض' }], ['صباحي', 'مسائي', 'ليلي'].sort(), []])
  assert.equal(ok(await request(U.admin, 'GET', T)).companyWide, true)
  // قراءة الحضور بس مش كفاية
  assert.equal((await request(U.viewer, 'GET', T)).status, 403)
})

test('ST-02: أنماط التدوير — بنطاق فرعها (ونمط «كل الفروع» لحساب بكل الفروع)، بورديات مفعّلة، وبسطر تدقيق', async () => {
  const save = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${T}/rotations/${id}` : `${T}/rotations`, body)
  const good = { name: 'تدوير المصنع', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id, S.night.id] }
  for (const [body, message] of [[{ ...good, name: 'ت' }, 'اسم النمط من حرفين لحد 120 حرف'], [{ ...good, shiftIds: [S.morning.id] }, 'ترتيب الورديات من 2 لحد 12 خانة'],
    [{ ...good, shiftIds: [S.morning.id, S.morning.id] }, 'النمط محتاج ورديتين مختلفتين على الأقل'], [{ ...good, branchId: 'x' }, 'الفرع مش صحيح'], [{ ...good, shiftIds: [S.morning.id, S.closed.id] }, 'وردية في النمط مش موجودة أو مقفولة'],
    [{ ...good, shiftIds: [S.morning.id, 999999] }, 'وردية في النمط مش موجودة أو مقفولة']]) refused(await save(U.sched, body), 400, message)
  // حساب فرع: نمط لفرعه بس — فرع تاني «مش موجود»، و«كل الفروع» ممنوع
  refused(await save(U.sched, { ...good, branchId: B.cairo.id }), 404, rules.BRANCH_NOT_FOUND)
  refused(await save(U.sched, { ...good, branchId: 999999 }), 404, rules.BRANCH_NOT_FOUND)
  assert.equal((await save(U.sched, { ...good, branchId: null })).status, 403)
  R.riyadh = ok(await save(U.sched, good), 201).id
  R.all = ok(await save(U.admin, { name: 'صباحي ومسائي', branchId: null, shiftIds: [S.morning.id, S.evening.id] }), 201).id
  R.cairo = ok(await save(U.schedCairo, { name: 'تدوير القاهرة', branchId: B.cairo.id, shiftIds: [S.evening.id, S.morning.id] }), 201).id
  const names = async user => ok(await request(user, 'GET', T)).rotations.map(row => row.name).sort()
  assert.deepEqual([await names(U.sched), await names(U.schedCairo), (await names(U.admin)).length], [['تدوير المصنع', 'صباحي ومسائي'].sort(), ['تدوير القاهرة', 'صباحي ومسائي'].sort(), 3])
  // تعديل: نمط فرع تاني «مش موجود»، ونمط كل الفروع لحساب بكل الفروع
  refused(await save(U.sched, good, R.cairo), 404, rules.ROTATION_NOT_FOUND)
  refused(await save(U.sched, good, 999999), 404, rules.ROTATION_NOT_FOUND)
  assert.equal((await save(U.sched, { name: 'صباحي ومسائي', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id] }, R.all)).status, 403)
  ok(await save(U.sched, { ...good, name: 'تدوير المصنع الجديد' }, R.riyadh))
  assert.deepEqual(ok(await request(U.sched, 'GET', T)).rotations.find(row => row.id === R.riyadh), { id: R.riyadh, name: 'تدوير المصنع الجديد', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id, S.night.id], isActive: true })
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'shift_rotation' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { SHIFT_ROTATION_CREATED: 3, SHIFT_ROTATION_UPDATED: 1 })
})

test('ST-03: نسخ أسبوع — لموظفين نطاق الحساب بس، واللي له وردية في الهدف بيتساب إلا مع «اكتب فوق»، والهدف مش أسبوع فات', async () => {
  const copy = (user, body) => request(user, 'POST', `${T}/copy-week`, body)
  const good = { fromWeek: week(1), toWeek: week(2) }
  const monday = (() => { const date = new Date(`${week(2)}T12:00:00`); date.setDate(date.getDate() + 1); return ymd(date) })()
  for (const [body, message] of [[{ ...good, toWeek: monday }, 'أسبوع المصدر والهدف: تاريخ يوم أحد (بداية الأسبوع)'], [{ ...good, toWeek: week(1) }, 'أسبوع الهدف هو نفسه أسبوع المصدر'],
    [{ ...good, toWeek: week(-1) }, 'أسبوع الهدف فات — النسخ للأسبوع الحالي أو اللي بعده'], [{ ...good, toWeek: '2026-13-01' }, 'أسبوع المصدر والهدف: تاريخ يوم أحد (بداية الأسبوع)'], [{ ...good, overwrite: 'yes' }, '«اكتب فوق» نعم أو لا']]) {
    refused(await copy(U.sched, body), 400, message)
  }
  refused(await copy(U.sched, { ...good, branchId: B.cairo.id }), 404, rules.BRANCH_NOT_FOUND)
  // حساب الرياض بينسخ موظفين الرياض بس — وردية القاهرة في المصدر مابتتنسخش
  assert.deepEqual((({ source, copied, alreadyScheduled, skipped }) => [source, copied, alreadyScheduled, skipped])(ok(await copy(U.sched, good), 201)), [2, 2, 0, []])
  assert.deepEqual(await shiftsOf(week(2)), { [E.one.id]: S.morning.id, [E.two.id]: S.evening.id })
  // تاني مرة: الكل له وردية في الهدف
  assert.deepEqual((({ copied, alreadyScheduled }) => [copied, alreadyScheduled])(ok(await copy(U.sched, good), 201)), [0, 2])
  // المصدر اتغيّر: من غير «اكتب فوق» الهدف زي ما هو، ومعاه بيتحدّث
  ok(await request(U.sched, 'POST', '/attendance/schedule', { entries: [entry(E.one, week(1), S.night)] }), 201)
  ok(await copy(U.sched, good), 201)
  assert.equal((await shiftsOf(week(2)))[E.one.id], S.morning.id)
  assert.equal(ok(await copy(U.sched, { ...good, overwrite: true }), 201).copied, 2)
  assert.deepEqual(await shiftsOf(week(2)), { [E.one.id]: S.night.id, [E.two.id]: S.evening.id })
  // الحساب العام بفلتر الفرع: القاهرة بس
  assert.deepEqual((({ source, copied }) => [source, copied])(ok(await copy(U.admin, { ...good, branchId: B.cairo.id }), 201)), [1, 1])
  assert.equal((await shiftsOf(week(2)))[E.cairo.id], S.morning.id)
  // أسبوع مصدر فاضي = ولا حاجة
  assert.deepEqual((({ source, copied }) => [source, copied])(ok(await copy(U.sched, { fromWeek: week(9), toWeek: week(10) }), 201)), [0, 0])
})

test('ST-04: تطبيق نمط — كل أسبوع وردية الخانة اللي عليها الدور، والموظف برّه النطاق بيتخطّى بسببه، والكتابة بقواعد الجدول القايم', async () => {
  const apply = (user, body) => request(user, 'POST', `${T}/apply-rotation`, body)
  const good = { rotationId: R.riyadh, employeeIds: [E.one.id, E.two.id], fromWeek: week(3), weeks: 4, startIndex: 1 }
  for (const [body, message] of [[{ ...good, rotationId: 'x' }, 'اختار نمط التدوير'], [{ ...good, employeeIds: [] }, 'اختار الموظفين (لحد 500)'], [{ ...good, weeks: 0 }, 'عدد الأسابيع من 1 لحد 12'], [{ ...good, weeks: 13 }, 'عدد الأسابيع من 1 لحد 12'],
    [{ ...good, fromWeek: week(-2) }, 'أسبوع البداية فات — التطبيق من الأسبوع الحالي أو اللي بعده'], [{ ...good, startIndex: 3 }, 'خانة البداية أكبر من عدد خانات النمط']]) refused(await apply(U.sched, body), 400, message)
  refused(await apply(U.sched, { ...good, rotationId: R.cairo }), 404, rules.ROTATION_NOT_FOUND)
  refused(await apply(U.sched, { ...good, rotationId: 999999 }), 404, rules.ROTATION_NOT_FOUND)
  const result = ok(await apply(U.sched, { ...good, employeeIds: [E.one.id, E.two.id, E.cairo.id] }), 201)
  assert.deepEqual([result.weeks, result.saved, [...new Set(result.skipped.map(row => row.employeeId))]], [4, 8, [E.cairo.id]])
  // الخانات: صباحي(0) مسائي(1) ليلي(2) — البداية من 1
  const expected = [S.evening.id, S.night.id, S.morning.id, S.evening.id]
  for (let offset = 0; offset < 4; offset++) assert.deepEqual(await shiftsOf(week(3 + offset)), { [E.one.id]: expected[offset], [E.two.id]: expected[offset] }, `week +${3 + offset}`)
  assert.deepEqual(await shiftsOf(week(7)), {})
  // نمط «كل الفروع» متاح لحساب الفرع على موظفينه
  assert.equal(ok(await apply(U.sched, { rotationId: R.all, employeeIds: [E.three.id], fromWeek: week(3), weeks: 2, startIndex: 0 }), 201).saved, 2)
  assert.deepEqual([(await shiftsOf(week(3)))[E.three.id], (await shiftsOf(week(4)))[E.three.id]], [S.morning.id, S.evening.id])
  // نمط مقفول، أو وردية فيه اتقفلت
  ok(await request(U.sched, 'PATCH', `${T}/rotations/${R.riyadh}`, { name: 'تدوير المصنع الجديد', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id, S.night.id], isActive: false }))
  refused(await apply(U.sched, good), 400, 'النمط مقفول')
  ok(await request(U.sched, 'PATCH', `${T}/rotations/${R.riyadh}`, { name: 'تدوير المصنع الجديد', branchId: B.riyadh.id, shiftIds: [S.morning.id, S.evening.id, S.night.id], isActive: true }))
  await repo('Shift').update({ id: S.night.id }, { isActive: false })
  refused(await apply(U.sched, good), 400, 'وردية في النمط مش موجودة أو مقفولة')
  await repo('Shift').update({ id: S.night.id }, { isActive: true })
})

test('ST-05: النشر — سجل لفرع في النطاق بعدد موظفيه، وإشعار لحسابات موظفين الفرع الحاليين اللي لهم وردية في الأسبوع بس؛ وكل نشر صف وإشعار', async () => {
  const publish = (user, body) => request(user, 'POST', `${T}/publish`, body)
  for (const [body, message] of [[{ branchId: B.riyadh.id }, 'الأسبوع: تاريخ يوم أحد (بداية الأسبوع)'], [{ week: week(2) }, 'اختار الفرع'], [{ week: week(2), branchId: B.riyadh.id, note: 'x'.repeat(301) }, 'الملاحظة 300 حرف بالكتير']]) {
    refused(await publish(U.sched, body), 400, message)
  }
  refused(await publish(U.sched, { week: week(2), branchId: B.cairo.id }), 404, rules.BRANCH_NOT_FOUND)
  refused(await publish(U.sched, { week: week(11), branchId: B.riyadh.id }), 400, 'مفيش ورديات للأسبوع ده في الفرع — احفظ الجدول الأول')
  assert.equal((await publish(U.viewer, { week: week(2), branchId: B.riyadh.id })).status, 403)
  const before = await shiftsOf(week(2))
  const first = ok(await publish(U.sched, { week: week(2), branchId: B.riyadh.id, note: ' جدول   الأسبوع ' }), 201)
  assert.equal(first.employeesCount, 2)
  assert.deepEqual(await shiftsOf(week(2)), before, 'النشر مابيغيّرش الجدول')
  assert.deepEqual((await query(`SELECT [eventKey] FROM [outbox_events] WHERE [eventType] = N'SCHEDULE_PUBLISHED' AND [entityId] = @0`, [String(first.id)])).map(row => row.eventKey), [`schedule-published:${first.id}`])
  await drain()
  const rows = await notified(first.id)
  assert.deepEqual(rows.map(row => row.recipientUserId), [U.one.id, U.two.id].sort((a, b) => a - b))
  assert.deepEqual([...new Set(rows.map(row => [row.eventCode, row.category, row.kind, row.inApp, row.title, row.body, row.link].join('|')))],
    [`schedule.published|schedule|info|true|جدول الأسبوع اتنشر|جدول ورديات أسبوع ${week(2)} اتنشر — راجع ورديتك|/my/attendance`])
  // الإشعار ظاهر في قايمة الموظف
  const inbox = ok(await request(U.one, 'GET', '/notifications'))
  assert.ok((inbox.items ?? inbox).some(item => item.title === 'جدول الأسبوع اتنشر' && item.category === 'schedule'))
  // نشر تاني بعد نقل موظف: صف جديد، وإشعاره للي لسه في الفرع بس
  await repo('Employee').update({ id: E.two.id }, { branchId: B.cairo.id })
  const second = ok(await publish(U.sched, { week: week(2), branchId: B.riyadh.id }), 201)
  assert.deepEqual([second.id !== first.id, second.employeesCount], [true, 1])
  await drain()
  assert.deepEqual((await notified(second.id)).map(row => row.recipientUserId), [U.one.id])
  await repo('Employee').update({ id: E.two.id }, { branchId: B.riyadh.id })
  // السجل بنطاق الحساب
  const listed = ok(await request(U.sched, 'GET', T)).publications
  assert.deepEqual(listed.map(row => [row.id, row.weekStart, row.branchId, row.employeesCount, row.note, row.publishedByName]),
    [[second.id, week(2), B.riyadh.id, 1, null, 'حساب sched'], [first.id, week(2), B.riyadh.id, 2, 'جدول الأسبوع', 'حساب sched']])
  assert.deepEqual(ok(await request(U.schedCairo, 'GET', T)).publications, [])
  ok(await publish(U.schedCairo, { week: week(2), branchId: B.cairo.id }), 201)
  assert.equal(ok(await request(U.admin, 'GET', T)).publications.length, 3)
})

const CHECK_MIGRATIONS = ['20261010_163_schedule_rules.sql', '20261010_164_shift_coverage_rules.sql', '20261010_165_schedule_violations.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
const runCheckMigrations = async () => { assert.match(database, NAME); for (const file of CHECK_MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const dayOf = (weekStart, offset) => { const date = new Date(`${weekStart}T12:00:00`); date.setDate(date.getDate() + offset); return ymd(date) }
const saveRule = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${T}/rules/${id}` : `${T}/rules`, body)
const saveCoverage = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${T}/coverage/${id}` : `${T}/coverage`, body)
const check = async (user, weekStart, branch) => ok(await request(user, 'GET', `${T}/checks?week=${weekStart}&branchId=${branch.id}`))
const found = async (user, weekStart, branch) => (await check(user, weekStart, branch)).violations.map(row => [row.kind, row.severity, row.employeeName ?? row.shiftName, row.detail]).sort((a, b) => (a[2] + a[0]).localeCompare(b[2] + b[0], 'ar'))

test('ST-06: قواعد فحص الجدول — بنطاق فرعها وبشدتين؛ الفحص بيشوف الراحة عند تغيير الوردية بين أسبوعين ووردية اليوم الخاص وأيام الراحة؛ والتغطية بالمهارة وشهادتها السارية', async () => {
  for (const migration of CHECK_MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.ok(String(text).match(/THROW \d+/g).every(item => new RegExp(`^THROW ${code}0\\d\\d$`).test(item)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runCheckMigrations()
  for (const table of ['schedule_violations', 'shift_coverage_rules', 'schedule_rules']) await pool.request().batch(`DROP TABLE dbo.${table}`)
  checks.resetScheduleChecksCache()
  // قبل الترحيلات: مفيش فحص، والنشر شغال زي الأول
  assert.equal(ok(await request(U.sched, 'GET', `${T}/rules`)).ready, false)
  refused(await saveRule(U.sched, { kind: 'MIN_REST_HOURS', limitHours: 11, severity: 'BLOCK', branchId: B.riyadh.id }), 400, checks.SCHEDULE_CHECKS_MIGRATION_MISSING)
  assert.deepEqual((await check(U.sched, week(2), B.riyadh)).violations, [])
  ok(await request(U.sched, 'POST', `${T}/publish`, { week: week(2), branchId: B.riyadh.id }), 201)
  await runCheckMigrations(); await runCheckMigrations()
  const ready = ok(await request(U.sched, 'GET', `${T}/rules`))
  assert.deepEqual([ready.ready, ready.kinds.map(row => row.code), ready.severities.map(row => row.code), ready.rules, ready.coverage], [true, ['MIN_REST_HOURS', 'MAX_DAY_HOURS', 'MAX_WEEK_HOURS'], ['WARN', 'BLOCK'], [], []])
  // القواعد: القيم، والنطاق (فرع تاني «مش موجود»، و«كل الفروع» لحساب بكل الفروع)
  const rest = { kind: 'MIN_REST_HOURS', limitHours: 11, severity: 'BLOCK', branchId: B.riyadh.id }
  for (const [body, message] of [[{ ...rest, kind: 'NAPS' }, 'اختار نوع القاعدة'], [{ ...rest, limitHours: 0 }, 'الحد بالساعات رقم موجب لحد 24 (بمنزلتين بالكتير)'], [{ ...rest, limitHours: 25 }, 'الحد بالساعات رقم موجب لحد 24 (بمنزلتين بالكتير)'],
    [{ ...rest, limitHours: '11' }, 'الحد بالساعات رقم موجب لحد 24 (بمنزلتين بالكتير)'], [{ ...rest, severity: 'STOP' }, 'الشدة «تحذير» أو «منع»']]) refused(await saveRule(U.sched, body), 400, message)
  refused(await saveRule(U.sched, { ...rest, branchId: B.cairo.id }), 404, rules.BRANCH_NOT_FOUND)
  assert.equal((await saveRule(U.sched, { ...rest, branchId: null })).status, 403)
  R.rest = ok(await saveRule(U.sched, rest), 201).id
  R.day = ok(await saveRule(U.sched, { kind: 'MAX_DAY_HOURS', limitHours: 12, severity: 'WARN', branchId: B.riyadh.id }), 201).id
  R.week = ok(await saveRule(U.admin, { kind: 'MAX_WEEK_HOURS', limitHours: 48, severity: 'WARN', branchId: null }), 201).id
  refused(await saveRule(U.schedCairo, rest, R.rest), 404, checks.RULE_NOT_FOUND)
  assert.equal((await saveRule(U.sched, { kind: 'MAX_WEEK_HOURS', limitHours: 60, severity: 'WARN', branchId: B.riyadh.id }, R.week)).status, 403)
  assert.deepEqual([ok(await request(U.sched, 'GET', `${T}/rules`)).rules.length, ok(await request(U.schedCairo, 'GET', `${T}/rules`)).rules.map(row => row.id)], [3, [R.week]])
  // جدول أسبوعين نضاف: أول ليلي الأسبوع اللي قبله ثم صباحي؛ تاني مسائي ووردية يوم خاص 13 ساعة التلات؛ تالت صباحي وأيام راحته الجمعة والسبت
  const W = week(13), before = week(12)
  const schedule = await repo('WorkSchedule').save({ name: 'دوام خمس أيام', weekendDays: 'FRI,SAT', startTime: '08:00', endTime: '16:00', isDefault: false, isActive: true, branchId: null })
  await repo('Employee').update({ id: E.three.id }, { workScheduleId: schedule.id })
  ok(await request(U.sched, 'POST', '/attendance/schedule', { entries: [entry(E.one, before, S.night), entry(E.one, W, S.morning), entry(E.two, W, S.evening), entry(E.three, W, S.morning)] }), 201)
  await repo('ScheduleDayOverride').save({ employeeId: E.two.id, date: dayOf(W, 2), shiftId: null, shiftName: 'وردية طويلة', startTime: '06:00', endTime: '19:00' })
  assert.deepEqual(await found(U.sched, W, B.riyadh), [
    // أول: نهاية ليلي السبت 06:00 الأحد وبداية صباحي 08:00 = ساعتين راحة؛ وسبع أيام × 8 = 56 ساعة
    ['MAX_WEEK_HOURS', 'WARN', 'موظف أول', '56 ساعة في الأسبوع — الحد 48'], ['MIN_REST_HOURS', 'BLOCK', 'موظف أول', 'راحة 2 ساعة بين ورديتين — الحد 11'],
    // تاني: وردية التلات 13 ساعة، وبعد مسائي الاتنين (22:00) بـ8 ساعات، وأسبوعه 6×8 + 13 = 61
    ['MAX_DAY_HOURS', 'WARN', 'موظف تاني', 'وردية 13 ساعة — الحد 12'], ['MAX_WEEK_HOURS', 'WARN', 'موظف تاني', '61 ساعة في الأسبوع — الحد 48'], ['MIN_REST_HOURS', 'BLOCK', 'موظف تاني', 'راحة 8 ساعة بين ورديتين — الحد 11'],
    // تالت: خمس أيام × 8 = 40 — من غير مخالفات
  ].sort((a, b) => (a[2] + a[0]).localeCompare(b[2] + b[0], 'ar')))
  const summary = await check(U.sched, W, B.riyadh)
  assert.deepEqual([summary.warnings, summary.blocked, summary.violations[0].severityLabel != null], [3, 2, true])
  // النطاق والقيم
  refused(await request(U.sched, 'GET', `${T}/checks?week=${W}&branchId=${B.cairo.id}`), 404, rules.BRANCH_NOT_FOUND)
  refused(await request(U.sched, 'GET', `${T}/checks?week=${dayOf(W, 1)}&branchId=${B.riyadh.id}`), 400, 'الأسبوع: تاريخ يوم أحد (بداية الأسبوع)')
  assert.equal((await request(U.viewer, 'GET', `${T}/checks?week=${W}&branchId=${B.riyadh.id}`)).status, 403)
  // قاعدة مقفولة مابتتفحصش
  ok(await saveRule(U.admin, { kind: 'MAX_WEEK_HOURS', limitHours: 48, severity: 'WARN', branchId: null, isActive: false }, R.week))
  assert.deepEqual((await found(U.sched, W, B.riyadh)).map(row => row[0]).sort(), ['MAX_DAY_HOURS', 'MIN_REST_HOURS', 'MIN_REST_HOURS'])
  // التغطية: الصباحي محتاج واحد بمهارة «لحام» متوسط — لحساب بكل الفروع
  const skill = await repo('Skill').save({ name: 'لحام', category: null, description: null, isActive: true, updatedByUserId: U.admin.id, updatedAt: new Date() })
  const need = { shiftId: S.morning.id, skillId: skill.id, minLevel: 'intermediate', minCount: 1, severity: 'WARN' }
  assert.equal((await saveCoverage(U.sched, need)).status, 403)
  for (const [body, message] of [[{ ...need, shiftId: 'x' }, 'اختار الوردية'], [{ ...need, minLevel: 'master' }, 'اختار أقل مستوى للمهارة'], [{ ...need, minCount: 0 }, 'أقل عدد رقم صحيح من 1 لحد 500'],
    [{ ...need, shiftId: S.closed.id }, 'الوردية أو المهارة مش موجودة أو مقفولة'], [{ ...need, skillId: 999999 }, 'الوردية أو المهارة مش موجودة أو مقفولة']]) refused(await saveCoverage(U.admin, body), 400, message)
  R.cover = ok(await saveCoverage(U.admin, need), 201).id
  const coverage = async () => (await found(U.sched, W, B.riyadh)).filter(row => row[0] === 'SKILL_COVERAGE')
  assert.deepEqual(await coverage(), [['SKILL_COVERAGE', 'WARN', 'صباحي', 'الوردية محتاجة 1 بمهارة «لحام» — الموجود 0']])
  // مستوى أقل مايتعدّش؛ مستوى كفاية بشهادة سارية بيقفلها؛ وشهادة منتهية قبل الأسبوع بترجّعها
  const give = (person, level, validUntil) => pool.request().query(`DELETE FROM dbo.employee_skills WHERE [employeeId] = ${Number(person.id)} AND [skillId] = ${Number(skill.id)};
    INSERT INTO dbo.employee_skills ([employeeId], [name], [level], [skillId], [source], [validUntil], [createdAt]) VALUES (${Number(person.id)}, N'لحام', N'${level}', ${Number(skill.id)}, N'CERTIFICATE', ${validUntil ? `'${validUntil}'` : 'NULL'}, SYSDATETIME())`)
  await give(E.one, 'beginner', null); assert.equal((await coverage()).length, 1)
  await give(E.one, 'advanced', dayOf(W, 3)); assert.deepEqual(await coverage(), [])
  await give(E.one, 'advanced', dayOf(W, -1)); assert.equal((await coverage()).length, 1)
  await give(E.three, 'expert', null); assert.deepEqual(await coverage(), [])
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] IN (N'schedule_rule', N'shift_coverage_rule') GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { SCHEDULE_RULE_CREATED: 3, SCHEDULE_RULE_UPDATED: 1, SHIFT_COVERAGE_CREATED: 1 })
})

test('ST-07: النشر مع الفحص — مخالفة «منع» بتوقّف النشر من غير أي أثر إلا بسبب تجاوز؛ وكل مخالفات لحظة النشر بتتسجّل عليه، والسبب على مخالفات المنع بس', async () => {
  const W = week(13)
  const publish = (user, body) => request(user, 'POST', `${T}/publish`, { week: W, branchId: B.riyadh.id, ...body })
  const counts = async () => [await repo('SchedulePublication').count({ where: { weekStart: W } }), Number((await query(`SELECT COUNT(*) AS n FROM [outbox_events] WHERE [eventType] = N'SCHEDULE_PUBLISHED'`))[0].n), await repo('ScheduleViolation').count()]
  const before = await counts()
  refused(await publish(U.sched, {}), 409, 'الجدول فيه 2 مخالفة «منع» — صلّحها، أو اكتب سبب التجاوز وانشر')
  refused(await publish(U.sched, { overrideReason: 'ض' }), 400, 'سبب التجاوز من حرفين لحد 300 حرف')
  assert.deepEqual(await counts(), before, 'النشر المرفوض من غير سجل ولا حدث ولا مخالفات')
  const done = ok(await publish(U.sched, { overrideReason: '  ضغط   شغل استثنائي ' }), 201)
  assert.deepEqual([done.employeesCount, done.warnings, done.blocked], [3, 1, 2])
  const saved = (await repo('ScheduleViolation').find({ where: { publicationId: done.id }, order: { id: 'ASC' } })).map(row => [row.ruleKind, row.severity, row.overrideReason]).sort((a, b) => a[0].localeCompare(b[0]))
  assert.deepEqual(saved, [['MAX_DAY_HOURS', 'WARN', null], ['MIN_REST_HOURS', 'BLOCK', 'ضغط شغل استثنائي'], ['MIN_REST_HOURS', 'BLOCK', 'ضغط شغل استثنائي']])
  const [audit] = (await pool.request().query(`SELECT TOP (1) [after] FROM dbo.audit_log WHERE [action] = N'SCHEDULE_PUBLISHED' ORDER BY [id] DESC`)).recordset
  assert.deepEqual((({ warnings, blocked, overrideReason }) => [warnings, blocked, overrideReason])(JSON.parse(audit.after)), [1, 2, 'ضغط شغل استثنائي'])
  // تصليح المخالفات: «منع» بقت «تحذير» — النشر من غير سبب، والمخالفات بتتسجّل من غير سبب
  ok(await saveRule(U.sched, { kind: 'MIN_REST_HOURS', limitHours: 11, severity: 'WARN', branchId: B.riyadh.id }, R.rest))
  const soft = ok(await publish(U.sched, { overrideReason: 'مش مطلوب' }), 201)
  assert.deepEqual([soft.warnings, soft.blocked, [...new Set((await repo('ScheduleViolation').find({ where: { publicationId: soft.id } })).map(row => row.overrideReason))]], [3, 0, [null]])
  // فرع من غير مخالفات: نشر من غير صفوف مخالفات
  ok(await request(U.admin, 'POST', '/attendance/schedule', { entries: [entry(E.cairo, W, S.morning)] }), 201)
  await pool.request().query(`UPDATE dbo.shift_coverage_rules SET [isActive] = 0`)
  const clean = ok(await request(U.schedCairo, 'POST', `${T}/publish`, { week: W, branchId: B.cairo.id }), 201)
  assert.deepEqual([clean.warnings, clean.blocked, await repo('ScheduleViolation').count({ where: { publicationId: clean.id } })], [0, 0, 0])
})
