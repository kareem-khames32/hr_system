'use strict'
// B5.7 على SQL حقيقي: السلامة وإصابات العمل — الموديول مقفول افتراضيًا، ترحيلي 169 و170، بلاغ الموظف على فرعه الحالي، سجل الحوادث بنطاق فرع الحادث
// وبإخفاء الاسم بفرع الموظف الحالي، الإجراءات التصحيحية ومهمة إبلاغ الجهة كمهام في محرك المهام، القفل بشروطه، وربط إجازة المصاب.
// قاعدة اختبار عشوائية تُحذف في النهاية.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const migrate = require('../scripts/db-migrate.cjs')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = 'hr_safety_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_safety_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-safety-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/safety/safety')
const MIGRATIONS = ['20261010_169_safety_incidents.sql', '20261010_170_safety_incident_actions.sql'].map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, I = {}, L = {}
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'SF' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 5000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@safety.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const day = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return ymd(date) }
const today = day(0)
const S = '/safety', IN = '/safety/incidents'
const good = { kind: 'INJURY', occurredOn: today, location: '  مخزن   2 ', description: 'وقع صندوق على رجل العامل أثناء التحميل', injured: 'SELF' }
const report = (user, body) => request(user, 'POST', `${S}/my`, body)
const incident = id => repo('SafetyIncident').findOne({ where: { id } })
const detail = (user, id) => request(user, 'GET', `${IN}/${id}`)
const step = (user, id, status) => request(user, 'POST', `${IN}/${id}/status`, { status })
const HIDDEN = { id: null, fullName: 'موظف خارج نطاقك', employeeCode: null }
const person = row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode })
const leave = (who, fromDate, toDate, status = 'APPROVED') => repo('Leave').save({ employeeId: who.id, leaveTypeCode: 'sick', fromDate, toDate, days: 3, period: 'FULL', isUnpaid: false, status })

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
  B.riyadh = await repo('Branch').save({ code: 'SF_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'SF_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@safety.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.one = await employee('موظف أول', B.riyadh); E.two = await employee('موظف تاني', B.riyadh); E.spam = await employee('موظف كتير البلاغات', B.riyadh)
  E.cairo = await employee('موظف القاهرة', B.cairo); E.gone = await employee('موظف منتهي', B.riyadh, { status: 'terminated', isActive: false })
  U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id }); U.spam = await account('spam', B.riyadh, [], { employeeId: E.spam.id })
  U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id }); U.gone = await account('gone', B.riyadh, [], { employeeId: E.gone.id })
  U.mgr = await account('mgr', B.riyadh, ['safety.manage']); U.mgrCairo = await account('mgr-cairo', B.cairo, ['safety.manage'])
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

test('SF-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلين الشاشة بتقول ناقص ومفيش بلاغ؛ والترحيلين بشكل الكيانات وبيتكرروا بأمان', async () => {
  assert.equal(await modules.isEnabled('safety'), false)
  assert.deepEqual([(await request(U.one, 'GET', `${S}/my`)).status, (await report(U.one, good)).status, (await request(U.mgr, 'GET', IN)).status], [404, 404, 404])
  ok(await request(U.admin, 'PUT', '/modules/safety', { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  await pool.request().batch('DROP TABLE dbo.safety_incident_actions'); await pool.request().batch('DROP TABLE dbo.safety_incidents'); rules.resetSafetyCache()
  assert.deepEqual((({ ready, reports }) => [ready, reports])(ok(await request(U.one, 'GET', `${S}/my`))), [false, []])
  assert.deepEqual((({ ready, incidents, people }) => [ready, incidents, people])(ok(await request(U.mgr, 'GET', IN))), [false, [], []])
  refused(await report(U.one, good), 400, rules.SAFETY_MIGRATION_MISSING)
  refused(await detail(U.mgr, 1), 400, rules.SAFETY_MIGRATION_MISSING)
  await runMigrations(); await runMigrations()
  const mine = ok(await request(U.one, 'GET', `${S}/my`))
  assert.deepEqual([mine.ready, mine.reports, mine.kinds.map(row => row.code), mine.severities.map(row => row.code)], [true, [], ['INJURY', 'PROPERTY', 'HAZARD'], ['MINOR', 'MODERATE', 'SERIOUS']])
})

test('SF-02: البلاغ — من موظف على رأس العمل على فرعه الحالي، بقيم متحكم فيها، وبحد أقصى في اليوم؛ والمبلّغ بيشوف بلاغاته وحالتها بس', async () => {
  for (const [body, message] of [[{ ...good, kind: 'X' }, 'اختار نوع الحادث'], [{ ...good, occurredOn: '2026-13-01' }, 'تاريخ الحادث مطلوب'], [{ ...good, occurredOn: day(1) }, 'تاريخ الحادث في المستقبل'],
    [{ ...good, occurredOn: day(-31) }, 'البلاغ لحادث في آخر 30 يوم'], [{ ...good, location: 'م' }, 'اكتب مكان الحادث (لحد 200 حرف)'], [{ ...good, description: 'قصير' }, 'اكتب وصف الحادث (من 10 حروف لحد 1000)'],
    [{ ...good, injured: 'X' }, 'حدّد المصاب: إنت، حد تاني، أو محدش'], [{ ...good, injured: 'NONE' }, 'بلاغ الإصابة محتاج مصاب'], [{ ...good, injured: 'OTHER' }, 'اكتب اسم المصاب']]) refused(await report(U.one, body), 400, message)
  refused(await report(U.mgr, good), 403, 'حسابك مش مربوط بملف موظف')
  refused(await report(U.gone, good), 403, 'ملفك مش على رأس العمل')
  assert.equal(await repo('SafetyIncident').count(), 0)
  // العميل مايقدرش يبعت فرع ولا حالة ولا مبلّغ
  const first = ok(await report(U.one, { ...good, occurredOn: day(-30), branchId: B.cairo.id, status: 'CLOSED', reporterEmployeeId: E.two.id, severity: 'SERIOUS' }), 201)
  I.one = first.id
  assert.equal(first.code, rules.incidentCode(I.one))
  const saved = await incident(I.one)
  assert.deepEqual([saved.branchId, saved.reporterEmployeeId, saved.injuredEmployeeId, saved.injuredNote, saved.location, saved.status, saved.severity, String(saved.occurredOn).slice(0, 10)],
    [B.riyadh.id, E.one.id, E.one.id, null, 'مخزن 2', 'REPORTED', null, day(-30)])
  I.two = ok(await report(U.two, { ...good, injured: 'OTHER', injuredNote: ' عامل  مقاول ' }), 201).id
  I.cairo = ok(await report(U.cairo, { kind: 'HAZARD', occurredOn: today, location: 'سلم الطوارئ', description: 'السلم مقفول بكراتين من أسبوع' }), 201).id
  assert.deepEqual([(await incident(I.two)).injuredEmployeeId, (await incident(I.two)).injuredNote, (await incident(I.cairo)).injuredEmployeeId, (await incident(I.cairo)).injuredNote, (await incident(I.cairo)).branchId],
    [null, 'عامل مقاول', null, null, B.cairo.id])
  const mine = ok(await request(U.one, 'GET', `${S}/my`)).reports
  assert.deepEqual([mine.map(row => row.id), Object.keys(mine[0]).sort().join(','), mine[0].statusLabel, mine[0].kindLabel],
    [[I.one], 'code,createdAt,description,id,kind,kindLabel,location,occurredOn,status,statusLabel', 'اتبلّغ', 'إصابة'])
  // حد اليوم
  const hazard = { kind: 'HAZARD', occurredOn: today, location: 'الممر', description: 'سلك كهربا مكشوف في الممر' }
  for (let index = 0; index < rules.REPORTS_PER_DAY; index++) ok(await report(U.spam, hazard), 201)
  refused(await report(U.spam, hazard), 409, '5 بلاغات في اليوم بالكتير — كلّم مسؤول السلامة')
  assert.equal(await repo('SafetyIncident').count({ where: { reporterEmployeeId: E.spam.id } }), 5)
})

test('SF-03: السجل — بصلاحيته وبنطاق فرع الحادث (فرع تاني «مش موجود»)، والمراجعة بقيمها والمصاب من نطاق الحساب، والاسم بيتحجب بفرع الموظف الحالي', async () => {
  assert.equal((await request(U.two, 'GET', IN)).status, 403)
  const listed = ok(await request(U.mgr, 'GET', IN))
  assert.deepEqual([listed.incidents.length, listed.incidents.some(row => row.id === I.cairo), listed.summary, listed.people.map(row => row.id).sort((a, b) => a - b)],
    [7, false, { open: 7, injuriesThisYear: today.slice(0, 4) === day(-30).slice(0, 4) ? 2 : 1, lostDaysThisYear: 0 }, [E.one.id, E.two.id, E.spam.id].sort((a, b) => a - b)])
  assert.deepEqual([ok(await request(U.mgrCairo, 'GET', IN)).incidents.map(row => row.id), ok(await request(U.admin, 'GET', IN)).incidents.length], [[I.cairo], 8])
  refused(await detail(U.mgrCairo, I.one), 404, rules.INCIDENT_NOT_FOUND)
  refused(await detail(U.mgr, 999999), 404, rules.INCIDENT_NOT_FOUND)
  refused(await request(U.mgrCairo, 'PATCH', `${IN}/${I.one}`, { severity: 'MINOR', injuredEmployeeId: E.one.id }), 404, rules.INCIDENT_NOT_FOUND)
  const opened = ok(await detail(U.mgr, I.one))
  assert.deepEqual([opened.reporter, opened.injured, opened.nextStatuses, opened.actions, opened.authorityTask, opened.leave, opened.description],
    [person(E.one), person(E.one), [{ code: 'INVESTIGATING', label: 'تحت التحقيق' }], [], null, null, good.description])
  for (const [body, message] of [[{ severity: 'X' }, 'الشدة: بسيطة، متوسطة، أو جسيمة'], [{ injuredEmployeeId: 'x' }, 'المصاب مش صحيح'], [{ lostDays: -1 }, 'الأيام المفقودة رقم صحيح من صفر'], [{ lostDays: 1.5 }, 'الأيام المفقودة رقم صحيح من صفر'],
    // إصابة من غير مصاب (لا موظف ولا اسم مكتوب)
    [{ severity: 'MINOR' }, 'حادث الإصابة محتاج مصاب']]) refused(await request(U.mgr, 'PATCH', `${IN}/${I.one}`, body), 400, message)
  for (const id of [E.cairo.id, 999999]) refused(await request(U.mgr, 'PATCH', `${IN}/${I.two}`, { injuredEmployeeId: id }), 404, 'الموظف غير موجود')
  ok(await request(U.mgr, 'PATCH', `${IN}/${I.two}`, { severity: 'MODERATE', injuredEmployeeId: E.two.id, lostDays: 3, rootCause: '  رف   من غير حاجز ' }))
  const reviewed = await incident(I.two)
  assert.deepEqual([reviewed.severity, reviewed.injuredEmployeeId, reviewed.lostDays, reviewed.rootCause, reviewed.injuredNote], ['MODERATE', E.two.id, 3, 'رف من غير حاجز', 'عامل مقاول'])
  assert.deepEqual((({ summary }) => summary.lostDaysThisYear)(ok(await request(U.mgr, 'GET', IN))), 3)
  // المبلّغ مابيشوفش نتيجة التحقيق
  assert.equal(JSON.stringify(ok(await request(U.two, 'GET', `${S}/my`))).includes('رف من غير حاجز'), false)
  // الموظف اتنقل لفرع برّه نطاق القارئ: الحادث فاضل في سجل فرعه، والاسم والرقم بيتحجبوا
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.cairo.id)} WHERE [id] = ${Number(E.one.id)}`)
  const masked = ok(await detail(U.mgr, I.one))
  const row = ok(await request(U.mgr, 'GET', IN)).incidents.find(item => item.id === I.one)
  assert.deepEqual([masked.reporter, masked.injured, masked.leaveOptions, row.reporter, row.injured], [HIDDEN, HIDDEN, [], HIDDEN, HIDDEN])
  assert.equal(JSON.stringify([masked, row]).includes('موظف أول'), false)
  refused(await detail(U.mgrCairo, I.one), 404, rules.INCIDENT_NOT_FOUND)
  await pool.request().query(`UPDATE dbo.employees SET [branchId] = ${Number(B.riyadh.id)} WHERE [id] = ${Number(E.one.id)}`)
})

test('SF-04: الإجراءات التصحيحية ومهمة إبلاغ الجهة مهام في محرك المهام؛ والقفل بيشترط الشدة والسبب وإن كل مهام الحادث اتقفلت؛ والمقفول مابيتعدّلش', async () => {
  refused(await step(U.mgr, I.two, 'CLOSED'), 409, 'الحادث «اتبلّغ» — الخطوة دي مش متاحة')
  refused(await step(U.mgrCairo, I.two, 'INVESTIGATING'), 404, rules.INCIDENT_NOT_FOUND)
  ok(await step(U.mgr, I.two, 'INVESTIGATING'), 201)
  const action = { title: ' تركيب  حاجز على الرف ', assigneeEmployeeId: E.one.id, dueDate: day(7) }
  for (const [body, message] of [[{ ...action, title: 'ab' }, 'اكتب الإجراء (من 3 حروف لحد 150)'], [{ ...action, assigneeEmployeeId: undefined }, 'اختار المسؤول عن الإجراء'], [{ ...action, dueDate: day(-1) }, 'موعد الإجراء تاريخ من النهارده'],
    [{ ...action, dueDate: '2026-02-30' }, 'موعد الإجراء تاريخ من النهارده']]) refused(await request(U.mgr, 'POST', `${IN}/${I.two}/actions`, body), 400, message)
  for (const id of [E.cairo.id, E.gone.id, 999999]) refused(await request(U.mgr, 'POST', `${IN}/${I.two}/actions`, { ...action, assigneeEmployeeId: id }), 404, 'الموظف غير موجود')
  refused(await request(U.mgrCairo, 'POST', `${IN}/${I.two}/actions`, action), 404, rules.INCIDENT_NOT_FOUND)
  assert.equal(await repo('Task').count(), 0)
  const added = ok(await request(U.mgr, 'POST', `${IN}/${I.two}/actions`, action), 201)
  const task = await repo('Task').findOne({ where: { id: added.taskId } })
  assert.deepEqual([task.title, task.assigneeEmployeeId, task.assigneeRole, task.branchId, task.createdByUserId, task.status, String(task.dueDate).slice(0, 10), task.description],
    [`إجراء تصحيحي (${rules.incidentCode(I.two)}): تركيب حاجز على الرف`, E.one.id, null, B.riyadh.id, U.mgr.id, 'OPEN', day(7), null])
  // مهمة إبلاغ الجهة: واحدة للحادث على دور الموارد البشرية في فرعه — وطلبين مع بعض = مهمة واحدة
  refused(await request(U.mgr, 'POST', `${IN}/${I.two}/authority-task`, {}), 400, 'موعد الإبلاغ تاريخ من النهارده')
  const both = await Promise.all([request(U.mgr, 'POST', `${IN}/${I.two}/authority-task`, { dueDate: day(2) }), request(U.mgr, 'POST', `${IN}/${I.two}/authority-task`, { dueDate: day(2) })])
  assert.deepEqual(both.map(response => response.status).sort(), [201, 409])
  refused(both.find(response => response.status === 409), 409, 'مهمة إبلاغ الجهة مفتوحة للحادث ده قبل كده')
  const authorityId = (await incident(I.two)).authorityTaskId
  const authority = await repo('Task').findOne({ where: { id: authorityId } })
  assert.deepEqual([authority.title, authority.assigneeEmployeeId, authority.assigneeRole, authority.branchId, String(authority.dueDate).slice(0, 10), await repo('Task').count()],
    [`إبلاغ الجهة المختصة بحادث ${rules.incidentCode(I.two)}`, null, 'hr', B.riyadh.id, day(2), 2])
  // عنوان المهمة مافيهوش تفاصيل الحادث؛ وحدث التكليف بتاع محرك المهام اتسجّل لكل مهمة
  assert.equal([task.title, authority.title].some(title => title.includes('صندوق') || title.includes('مخزن')), false)
  const events = await pool.request().query(`SELECT [entityId] FROM dbo.outbox_events WHERE [eventType] = N'TASK_ASSIGNED' ORDER BY [id]`)
  assert.deepEqual(events.recordset.map(row => Number(row.entityId)), [task.id, authority.id])
  const shown = ok(await detail(U.mgr, I.two))
  assert.deepEqual([shown.actions.map(item => [item.taskId, item.status, item.open, item.assignee, item.dueDate]), [shown.authorityTask.taskId, shown.authorityTask.assigneeRole, shown.authorityTask.open], shown.nextStatuses.map(item => item.code)],
    [[[task.id, 'OPEN', true, person(E.one), day(7)]], [authority.id, 'hr', true], ['CLOSED']])
  // القفل: مهام مفتوحة = مرفوض
  refused(await step(U.mgr, I.two, 'CLOSED'), 409, 'فيه 2 مهمة للحادث لسه مفتوحة — اقفلها أو الغيها من المهام الأول')
  await pool.request().query(`UPDATE dbo.tasks SET [status] = N'DONE' WHERE [id] = ${Number(task.id)}`)
  refused(await step(U.mgr, I.two, 'CLOSED'), 409, 'فيه 1 مهمة للحادث لسه مفتوحة — اقفلها أو الغيها من المهام الأول')
  // مهمة الإبلاغ الملغية بتتفتح غيرها
  await pool.request().query(`UPDATE dbo.tasks SET [status] = N'CANCELLED' WHERE [id] = ${Number(authority.id)}`)
  const again = ok(await request(U.mgr, 'POST', `${IN}/${I.two}/authority-task`, { dueDate: day(3) }), 201)
  assert.notEqual(again.taskId, authority.id)
  await pool.request().query(`UPDATE dbo.tasks SET [status] = N'DONE' WHERE [id] = ${Number(again.taskId)}`)
  ok(await step(U.mgr, I.two, 'CLOSED'), 201)
  const closed = await incident(I.two)
  assert.deepEqual([closed.status, closed.closedByUserId, closed.closedAt instanceof Date], ['CLOSED', U.mgr.id, true])
  // المقفول مابيتعدّلش
  const locked = 'الحادث مقفول — افتح التحقيق تاني الأول'
  refused(await request(U.mgr, 'PATCH', `${IN}/${I.two}`, { severity: 'SERIOUS', injuredEmployeeId: E.two.id }), 409, locked)
  refused(await request(U.mgr, 'POST', `${IN}/${I.two}/actions`, action), 409, locked)
  refused(await request(U.mgr, 'POST', `${IN}/${I.two}/authority-task`, { dueDate: day(2) }), 409, locked)
  refused(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: null }), 409, locked)
  assert.deepEqual([(await incident(I.two)).severity, await repo('Task').count(), ok(await request(U.two, 'GET', `${S}/my`)).reports[0].statusLabel], ['MODERATE', 3, 'اتقفل'])
  // قفل من غير شدة وسبب مرفوض
  ok(await step(U.mgr, I.one, 'INVESTIGATING'), 201)
  refused(await step(U.mgr, I.one, 'CLOSED'), 400, 'اكتب الشدة والسبب قبل قفل الحادث')
  // فتح التحقيق تاني
  ok(await step(U.mgr, I.two, 'INVESTIGATING'), 201)
  const reopened = await incident(I.two)
  assert.deepEqual([reopened.status, reopened.closedByUserId, reopened.closedAt], ['INVESTIGATING', null, null])
})

test('SF-05: ربط إجازة المصاب — إجازة معتمدة للمصاب نفسه آخرها من يوم الحادث؛ وتغيير المصاب بيفك الربط؛ وكل كتابة بسطر تدقيق', async () => {
  L.ok = (await leave(E.two, today, day(2))).id; L.old = (await leave(E.two, day(-9), day(-5))).id
  L.cancelled = (await leave(E.two, today, day(2), 'CANCELLED')).id; L.other = (await leave(E.one, today, day(2))).id
  refused(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: 'x' }), 400, 'اختار الإجازة')
  for (const id of [L.other, L.old, L.cancelled, 999999]) refused(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: id }), 404, 'الإجازة مش موجودة')
  refused(await request(U.mgrCairo, 'PUT', `${IN}/${I.two}/leave`, { leaveId: L.ok }), 404, rules.INCIDENT_NOT_FOUND)
  // حادث من غير مصاب موظف
  refused(await request(U.admin, 'PUT', `${IN}/${I.cairo}/leave`, { leaveId: L.ok }), 400, 'حدّد المصاب (موظف) قبل ربط الإجازة')
  assert.deepEqual(ok(await detail(U.mgr, I.two)).leaveOptions.map(item => item.id), [L.ok])
  ok(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: L.ok }))
  const linked = ok(await detail(U.mgr, I.two))
  assert.deepEqual([linked.leave, (await incident(I.two)).leaveId], [{ id: L.ok, leaveTypeCode: 'sick', fromDate: today, toDate: day(2), days: 3, status: 'APPROVED' }, L.ok])
  // الإجازة اتلغت بعد الربط: بتفضل ظاهرة بحالتها
  await pool.request().query(`UPDATE dbo.leaves SET [status] = N'CANCELLED' WHERE [id] = ${Number(L.ok)}`)
  const after = ok(await detail(U.mgr, I.two))
  assert.deepEqual([after.leave.status, after.leaveOptions], ['CANCELLED', []])
  // تغيير المصاب بيفك الربط
  ok(await request(U.mgr, 'PATCH', `${IN}/${I.two}`, { severity: 'MODERATE', injuredEmployeeId: E.one.id, lostDays: 3, rootCause: 'رف من غير حاجز' }))
  assert.equal((await incident(I.two)).leaveId, null)
  ok(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: L.other }))
  ok(await request(U.mgr, 'PUT', `${IN}/${I.two}/leave`, { leaveId: null }))
  assert.equal((await incident(I.two)).leaveId, null)
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'safety_incident' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])),
    { SAFETY_INCIDENT_REVIEWED: 2, SAFETY_INCIDENT_STATUS: 4, SAFETY_ACTION_ADDED: 1, SAFETY_AUTHORITY_TASK: 2, SAFETY_LEAVE_LINKED: 3 })
  // قفل الموديول = المسارات بتختفي
  ok(await request(U.admin, 'PUT', '/modules/safety', { enabled: false })); modules.invalidate()
  assert.deepEqual([(await request(U.one, 'GET', `${S}/my`)).status, (await request(U.mgr, 'GET', IN)).status], [404, 404])
})
