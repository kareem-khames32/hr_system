'use strict'
// B5.5 (أ) على SQL حقيقي: أدوات الجدولة — الميزة الفرعية مقفولة افتراضيًا، ترحيلي 161 و162، أنماط التدوير بنطاقها، نسخ أسبوع وتطبيق نمط من خلال
// حفظ الجدول الأسبوعي القايم، ونشر جدول أسبوع لفرع بإشعار لموظفيه. قاعدة اختبار عشوائية تُحذف في النهاية.
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
