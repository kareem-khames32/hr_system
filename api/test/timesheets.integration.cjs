'use strict'
// B5.8 على SQL حقيقي: ساعات المشاريع — الموديول مقفول افتراضيًا، ترحيلات 171 لحد 174، المشاريع بنطاق الفرع، تسجيل ساعات الموظف وإرسال الأسبوع وسحبه،
// اعتماد المدير المباشر (أو صاحب الصلاحية في نطاقه) بالحكم بعد القفل، وتقرير الساعات المعتمدة والتكلفة ورا ميزتها وصلاحية الرواتب.
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
const database = 'hr_timesheets_test_' + crypto.randomBytes(8).toString('hex')
const NAME = /^hr_timesheets_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-timesheets-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/timesheets/timesheets')
const { weekOfDay } = require('../src/attendance/schedule-tools')
const MIGRATIONS = ['20261010_171_timesheet_projects.sql', '20261010_172_timesheet_project_tasks.sql', '20261010_173_timesheet_weeks.sql', '20261010_174_timesheet_entries.sql']
  .map(name => path.resolve(apiRoot, '..', 'docs', 'migrations', 'payroll', name))
let master, pool, app, ds, base, modules, created = false, sequence = 0
const B = {}, E = {}, U = {}, P = {}, K = {}
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
const employee = (name, branch, extra = {}) => repo('Employee').save({ employeeCode: 'TS' + ++sequence, fullName: name, branchId: branch.id, joinDate: '2020-01-01',
  basicSalary: 0, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...extra })
const account = (label, branch, permissions, extra = {}) => repo('User').save({ email: `${label}@timesheets.invalid`, displayName: 'حساب ' + label, passwordHash: 'test-only', role: 'employee', branchId: branch.id,
  permissions: JSON.stringify(permissions), isActive: true, ...extra })
const runMigrations = async () => { assert.match(database, NAME); for (const file of MIGRATIONS) for (const batch of migrate.splitBatches(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))) await pool.request().batch(batch) }
const ymd = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const today = ymd(new Date())
// أسبوع فات كله (الأحد لحد السبت)، واللي قبله
const WEEK = rules.addDays(weekOfDay(today), -7), OLDER = rules.addDays(WEEK, -7)
const dayOf = (week, index) => rules.addDays(week, index)
const T = '/timesheets'
const saveProject = (user, body, id) => request(user, id ? 'PATCH' : 'POST', id ? `${T}/projects/${id}` : `${T}/projects`, body)
const entry = (user, body) => request(user, 'PUT', `${T}/my/entries`, body)
const mine = (user, week = WEEK) => request(user, 'GET', `${T}/my?week=${week}`)
const submit = (user, weekStart = WEEK) => request(user, 'POST', `${T}/my/submit`, { weekStart })
const recall = (user, weekStart = WEEK) => request(user, 'POST', `${T}/my/recall`, { weekStart })
const decide = (user, id, action, note) => request(user, 'POST', `${T}/weeks/${id}/decision`, { action, note })
const weekOf = (who, weekStart = WEEK) => repo('TimesheetWeek').findOne({ where: { employeeId: who.id, weekStart } })
const entriesOf = async (who, weekStart = WEEK) => (await repo('TimesheetEntry').find({ where: { employeeId: who.id, weekStart }, order: { workDate: 'ASC', id: 'ASC' } })).map(row => [String(row.workDate).slice(0, 10), row.projectId, row.taskId, row.minutes, row.note])

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
  B.riyadh = await repo('Branch').save({ code: 'TS_1', name: 'فرع الرياض', country: 'SA' })
  B.cairo = await repo('Branch').save({ code: 'TS_2', name: 'فرع القاهرة', country: 'EG' })
  U.admin = await repo('User').save({ email: 'admin@timesheets.invalid', displayName: 'مدير النظام', passwordHash: 'test-only', role: 'super_admin', scopeAllBranches: true, permissions: '[]', isActive: true })
  E.boss = await employee('المدير المباشر', B.riyadh); E.other = await employee('مدير تاني', B.riyadh)
  E.one = await employee('موظف أول', B.riyadh, { managerEmployeeId: E.boss.id, basicSalary: 6000 }); E.two = await employee('موظف تاني', B.riyadh, { managerEmployeeId: E.boss.id })
  E.lead = await employee('مسؤول المشاريع', B.riyadh, { managerEmployeeId: E.boss.id }); E.cairo = await employee('موظف القاهرة', B.cairo)
  E.gone = await employee('موظف منتهي', B.riyadh, { status: 'terminated', isActive: false })
  U.boss = await account('boss', B.riyadh, [], { employeeId: E.boss.id }); U.one = await account('one', B.riyadh, [], { employeeId: E.one.id }); U.two = await account('two', B.riyadh, [], { employeeId: E.two.id })
  U.lead = await account('lead', B.riyadh, ['timesheets.manage'], { employeeId: E.lead.id }); U.cairo = await account('cairo', B.cairo, [], { employeeId: E.cairo.id }); U.gone = await account('gone', B.riyadh, [], { employeeId: E.gone.id })
  U.pm = await account('pm', B.riyadh, ['timesheets.manage']); U.pmCairo = await account('pm-cairo', B.cairo, ['timesheets.manage']); U.pay = await account('pay', B.riyadh, ['timesheets.manage', 'payroll.view'])
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

test('TS-01: الموديول مقفول افتراضيًا = مفيش مسار؛ وقبل الترحيلات الشاشة بتقول ناقص ومفيش تسجيل؛ والترحيلات بشكل الكيانات وبتتكرر بأمان', async () => {
  assert.deepEqual([await modules.isEnabled('timesheets'), await modules.isFeatureEnabled(rules.TIMESHEETS_COST_FEATURE)], [false, false])
  assert.deepEqual([(await mine(U.one)).status, (await request(U.boss, 'GET', `${T}/team`)).status, (await request(U.pm, 'GET', `${T}/projects`)).status, (await request(U.pm, 'GET', `${T}/report?from=${WEEK}&to=${today}`)).status], [404, 404, 404, 404])
  ok(await request(U.admin, 'PUT', '/modules/timesheets', { enabled: true })); modules.invalidate()
  for (const migration of MIGRATIONS) {
    const text = fs.readFileSync(migration), code = path.basename(migration).split('_')[1]
    assert.equal(text.includes(Buffer.from('\r\n')), false, 'LF بس — git بيخزّن الملف LF')
    assert.notDeepEqual([...text.subarray(0, 3)], [0xef, 0xbb, 0xbf])
    assert.ok(String(text).match(/THROW \d+/g).every(found => new RegExp(`^THROW ${code}0\\d\\d$`).test(found)), code)
    assert.doesNotMatch(String(text), /\bDROP\b|\bTRUNCATE\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b/i)
  }
  await runMigrations()
  for (const table of ['timesheet_entries', 'timesheet_weeks', 'timesheet_project_tasks', 'timesheet_projects']) await pool.request().batch(`DROP TABLE dbo.${table}`)
  rules.resetTimesheetsCache()
  assert.deepEqual((({ ready, editable, projects }) => [ready, editable, projects])(ok(await mine(U.one))), [false, false, []])
  assert.deepEqual([ok(await request(U.boss, 'GET', `${T}/team`)), ok(await request(U.pm, 'GET', `${T}/projects`)).ready], [{ ready: false, weeks: [] }, false])
  refused(await entry(U.one, { workDate: dayOf(WEEK, 0), projectId: 1, minutes: 60 }), 400, rules.TIMESHEETS_MIGRATION_MISSING)
  refused(await saveProject(U.pm, { clientName: 'عميل', name: 'مشروع', branchId: B.riyadh.id }), 400, rules.TIMESHEETS_MIGRATION_MISSING)
  await runMigrations(); await runMigrations()
  const first = ok(await mine(U.one))
  assert.deepEqual([first.ready, first.weekStart, first.status, first.editable, first.days.map(row => row.date), first.entries, first.projects], [true, WEEK, 'DRAFT', true, rules.weekDays(WEEK), [], []])
  // أسبوع مش أحد = أسبوع النهارده
  assert.equal(ok(await mine(U.one, dayOf(WEEK, 2))).weekStart, weekOfDay(today))
})

test('TS-02: المشاريع — بصلاحيتها وبنطاق الفرع (لكل الفروع = حساب بكل الفروع)، بمهامها اللي بتتضاف وتتعدّل وتتقفل، وبسطر تدقيق', async () => {
  const good = { clientName: '  شركة   النور ', name: ' بوابة العملاء ', branchId: B.riyadh.id, tasks: [{ name: 'تحليل' }, { name: ' تطوير ' }] }
  for (const [body, message] of [[{ ...good, clientName: 'ش' }, 'اسم العميل من حرفين لحد 120 حرف'], [{ ...good, name: '' }, 'اسم المشروع من حرفين لحد 150 حرف'], [{ ...good, branchId: 'x' }, 'الفرع مش صحيح'],
    [{ ...good, tasks: 'x' }, 'مهام المشروع قايمة لحد 50 مهمة'], [{ ...good, tasks: [{ name: 'ت' }] }, 'اسم المهمة من حرفين لحد 120 حرف'], [{ ...good, tasks: [{ name: 'تحليل' }, { name: 'تحليل' }] }, 'مهمة مكررة في المشروع']]) refused(await saveProject(U.pm, body), 400, message)
  assert.equal((await saveProject(U.one, good)).status, 403)
  // مشروع لكل الفروع من حساب بفرع = ممنوع؛ وفرع برّه النطاق «مش موجود»
  assert.equal((await saveProject(U.pm, { ...good, branchId: null })).status, 403)
  refused(await saveProject(U.pm, { ...good, branchId: B.cairo.id }), 404, 'الفرع مش موجود')
  refused(await saveProject(U.pm, { ...good, branchId: 999999 }), 404, 'الفرع مش موجود')
  assert.equal(await repo('TimesheetProject').count(), 0)
  P.portal = ok(await saveProject(U.pm, good), 201).id
  P.all = ok(await saveProject(U.admin, { clientName: 'داخلي', name: 'اجتماعات وتدريب' }), 201).id
  P.cairo = ok(await saveProject(U.pmCairo, { clientName: 'شركة النيل', name: 'موقع النيل', branchId: B.cairo.id, tasks: [{ name: 'تصميم' }] }), 201).id
  P.off = ok(await saveProject(U.pm, { clientName: 'شركة النور', name: 'مشروع مقفول', branchId: B.riyadh.id, isActive: false }), 201).id
  const listed = ok(await request(U.pm, 'GET', `${T}/projects`))
  const portal = listed.projects.find(row => row.id === P.portal)
  K.analysis = portal.tasks[0].id; K.build = portal.tasks[1].id
  assert.deepEqual([listed.canEditAll, listed.branches, listed.projects.map(row => row.id).sort((a, b) => a - b), { ...portal, tasks: portal.tasks.map(task => [task.name, task.isActive]) }],
    [false, [{ id: B.riyadh.id, name: 'فرع الرياض' }], [P.portal, P.all, P.off].sort((a, b) => a - b), { id: P.portal, clientName: 'شركة النور', name: 'بوابة العملاء', branchId: B.riyadh.id, isActive: true, tasks: [['تحليل', true], ['تطوير', true]] }])
  K.design = ok(await request(U.pmCairo, 'GET', `${T}/projects`)).projects.find(row => row.id === P.cairo).tasks[0].id
  assert.equal(ok(await request(U.admin, 'GET', `${T}/projects`)).canEditAll, true)
  // تعديل: مشروع فرع تاني «مش موجود»، ومشروع كل الفروع ممنوع على حساب بفرع، ومهمة مش تبع المشروع مرفوضة
  refused(await saveProject(U.pm, good, P.cairo), 404, rules.PROJECT_NOT_FOUND)
  refused(await saveProject(U.pm, good, 999999), 404, rules.PROJECT_NOT_FOUND)
  assert.equal((await saveProject(U.pm, { clientName: 'داخلي', name: 'اجتماعات', branchId: B.riyadh.id }, P.all)).status, 403)
  refused(await saveProject(U.pm, { ...good, tasks: [{ id: K.design, name: 'تصميم' }] }, P.portal), 400, 'مهمة من المهام مش تبع المشروع')
  refused(await saveProject(U.pm, { ...good, tasks: [{ name: 'تحليل' }] }, P.portal), 400, 'مهمة مكررة في المشروع')
  // تعديل اسم مهمة، وقفل مهمة، وإضافة واحدة
  ok(await saveProject(U.pm, { ...good, tasks: [{ id: K.analysis, name: 'تحليل المتطلبات' }, { id: K.build, name: 'تطوير', isActive: false }, { name: 'اختبار' }] }, P.portal))
  const tasks = await repo('TimesheetProjectTask').find({ where: { projectId: P.portal }, order: { id: 'ASC' } })
  K.test = tasks[2].id
  assert.deepEqual(tasks.map(row => [row.id, row.name, row.isActive]), [[K.analysis, 'تحليل المتطلبات', true], [K.build, 'تطوير', false], [K.test, 'اختبار', true]])
  const audit = await pool.request().query(`SELECT [action], COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] = N'timesheet_project' GROUP BY [action]`)
  assert.deepEqual(Object.fromEntries(audit.recordset.map(row => [row.action, Number(row.n)])), { TIMESHEET_PROJECT_CREATED: 4, TIMESHEET_PROJECT_UPDATED: 1 })
})

test('TS-03: تسجيل الساعات — لموظف على رأس العمل، على مشروع مفعّل ومتاح لفرعه، بقيم متحكم فيها ومجموع يوم 24 ساعة؛ ودقايق الحضور المحسوبة جنب المسجّل', async () => {
  const sunday = dayOf(WEEK, 0), monday = dayOf(WEEK, 1)
  const good = { workDate: sunday, projectId: P.portal, taskId: K.analysis, minutes: 150, note: '  ورشة  مع العميل ' }
  for (const [body, message] of [[{ ...good, workDate: '2026-13-01' }, 'اليوم مش صحيح'], [{ ...good, workDate: rules.addDays(today, 1) }, 'ماينفعش تسجّل ساعات يوم لسه ماجاش'], [{ ...good, workDate: rules.addDays(today, -63) }, 'التسجيل لآخر 62 يوم بس'],
    [{ ...good, projectId: 'x' }, 'اختار المشروع'], [{ ...good, taskId: 'x' }, 'المهمة مش صحيحة'], [{ ...good, minutes: 1.5 }, 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440'], [{ ...good, minutes: 1441 }, 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440'],
    [{ ...good, minutes: '60' }, 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440'], [{ ...good, note: 'x'.repeat(301) }, 'الملاحظة 300 حرف بالكتير']]) refused(await entry(U.one, body), 400, message)
  refused(await entry(U.pm, good), 403, 'حسابك مش مربوط بملف موظف')
  refused(await entry(U.gone, good), 403, 'ملفك مش على رأس العمل')
  // مشروع فرع تاني، ومشروع مقفول، ومشروع مش موجود = «مش موجود»؛ ومهمة مشروع تاني أو مهمة مقفولة مرفوضة
  for (const projectId of [P.cairo, P.off, 999999]) refused(await entry(U.one, { ...good, projectId, taskId: null }), 404, rules.PROJECT_NOT_FOUND)
  for (const taskId of [K.design, K.build, 999999]) refused(await entry(U.one, { ...good, taskId }), 400, 'المهمة مش تبع المشروع')
  assert.deepEqual(await entriesOf(E.one), [])
  // العميل مايقدرش يبعت موظف ولا أسبوع ولا حالة
  ok(await entry(U.one, { ...good, employeeId: E.two.id, weekStart: OLDER, status: 'APPROVED' }))
  ok(await entry(U.one, { ...good, minutes: 180 }))
  ok(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 60 }))
  ok(await entry(U.one, { workDate: monday, projectId: P.portal, taskId: K.test, minutes: 480 }))
  assert.deepEqual([await entriesOf(E.one), await entriesOf(E.two), await entriesOf(E.one, OLDER)],
    [[[sunday, P.portal, K.analysis, 180, 'ورشة مع العميل'], [sunday, P.all, null, 60, null], [monday, P.portal, K.test, 480, null]], [], []])
  // مجموع اليوم 24 ساعة بالكتير (السطر نفسه بيتبدّل مش بيتجمع)
  refused(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 1261 }), 400, 'مجموع ساعات اليوم أكتر من 24 ساعة')
  ok(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 1260 }))
  ok(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 60 }))
  // صفر بيشيل السطر — حتى لو المشروع اتقفل بعدها
  ok(await entry(U.one, { workDate: monday, projectId: P.portal, taskId: null, minutes: 30 }))
  ok(await entry(U.one, { workDate: monday, projectId: P.portal, taskId: null, minutes: 0 }))
  assert.equal((await entriesOf(E.one)).length, 3)
  await repo('AttendanceDay').save({ employeeId: E.one.id, branchId: B.riyadh.id, date: sunday, shiftName: 'عام', shiftStart: '08:00', shiftEnd: '17:00', status: 'present', workMinutes: 465 })
  const view = ok(await mine(U.one))
  assert.deepEqual([view.status, view.editable, view.totalMinutes, view.days.slice(0, 3), view.projects.map(row => [row.id, row.tasks.map(task => task.id)]).sort((a, b) => a[0] - b[0]),
    view.entries.map(row => [row.workDate, row.clientName, row.projectName, row.taskName, row.minutes])],
  ['DRAFT', true, 720, [{ date: sunday, loggedMinutes: 240, attendanceMinutes: 465 }, { date: monday, loggedMinutes: 480, attendanceMinutes: null }, { date: dayOf(WEEK, 2), loggedMinutes: 0, attendanceMinutes: null }],
    [[P.portal, [K.analysis, K.test]], [P.all, []]].sort((a, b) => a[0] - b[0]),
    [[sunday, 'شركة النور', 'بوابة العملاء', 'تحليل المتطلبات', 180], [sunday, 'داخلي', 'اجتماعات وتدريب', null, 60], [monday, 'شركة النور', 'بوابة العملاء', 'اختبار', 480]]])
  // موظف القاهرة بيشوف مشاريع فرعه ومشاريع كل الفروع بس
  assert.deepEqual(ok(await mine(U.cairo)).projects.map(row => row.id).sort((a, b) => a - b), [P.all, P.cairo].sort((a, b) => a - b))
})

test('TS-04: الإرسال والسحب وقرار المدير — الأسبوع المبعوت مابيتعدّلش، والقرار للمدير المباشر دلوقتي أو لصاحب الصلاحية في نطاقه (غير كده «مش موجود»)، ومحدش بيعتمد أسبوعه', async () => {
  const sunday = dayOf(WEEK, 0)
  refused(await submit(U.one, dayOf(WEEK, 1)), 400, 'الأسبوع مش صحيح (بدايته الأحد)')
  refused(await submit(U.one, rules.addDays(weekOfDay(today), 7)), 400, 'الأسبوع مش صحيح (بدايته الأحد)')
  refused(await submit(U.one, OLDER), 400, 'مفيش ساعات مسجّلة في الأسبوع ده')
  refused(await recall(U.one), 409, 'مفيش أسبوع مبعوت يتسحب')
  // طلبين إرسال مع بعض = صف واحد
  const both = await Promise.all([submit(U.one), submit(U.one)])
  assert.deepEqual([both.map(response => response.status).sort(), await repo('TimesheetWeek').count({ where: { employeeId: E.one.id } })], [[201, 409], 1])
  const sent = await weekOf(E.one)
  assert.deepEqual([sent.status, sent.totalMinutes, sent.decidedByUserId], ['SUBMITTED', 720, null])
  refused(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 90 }), 409, 'الأسبوع اتبعت للاعتماد — اسحبه الأول لو عايز تعدّل')
  refused(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 0 }), 409, 'الأسبوع اتبعت للاعتماد — اسحبه الأول لو عايز تعدّل')
  // السحب بيرجّعه مسودة، والتعديل بيرجع
  ok(await recall(U.one), 201)
  assert.equal(await weekOf(E.one), null)
  ok(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 90 }))
  assert.equal(ok(await submit(U.one), 201).totalMinutes, 750)
  const weekId = (await weekOf(E.one)).id
  // «ساعات فريقي»: المدير المباشر وصاحب الصلاحية في نطاقه بيشوفوه بسطوره ودقايق الحضور؛ الزميل وصاحب صلاحية فرع تاني لأ
  const forBoss = ok(await request(U.boss, 'GET', `${T}/team`)).weeks
  assert.deepEqual([forBoss.map(row => [row.id, row.fullName, row.status, row.totalMinutes, row.canDecide]), forBoss[0].days[0], forBoss[0].lines.length],
    [[[weekId, 'موظف أول', 'SUBMITTED', 750, true]], { date: sunday, loggedMinutes: 270, attendanceMinutes: 465 }, 3])
  assert.deepEqual([ok(await request(U.pm, 'GET', `${T}/team`)).weeks.map(row => row.id), ok(await request(U.two, 'GET', `${T}/team`)).weeks, ok(await request(U.pmCairo, 'GET', `${T}/team`)).weeks, ok(await request(U.one, 'GET', `${T}/team`)).weeks],
    [[weekId], [], [], []])
  for (const [body, message] of [[{ action: 'X' }, 'القرار: اعتماد أو رفض'], [{ action: 'REJECT' }, 'اكتب سبب الرفض'], [{ action: 'REJECT', note: 'لا' }, 'اكتب سبب الرفض']]) refused(await request(U.boss, 'POST', `${T}/weeks/${weekId}/decision`, body), 400, message)
  for (const user of [U.two, U.pmCairo, U.one]) refused(await decide(user, weekId, 'APPROVE'), 404, rules.WEEK_NOT_FOUND)
  refused(await decide(U.boss, 999999, 'APPROVE'), 404, rules.WEEK_NOT_FOUND)
  // المدير اتغيّر بعد الإرسال: المدير القديم مابقاش له قرار، والموظف اتنقل لفرع برّه نطاق صاحب الصلاحية كمان
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.other.id)}, [branchId] = ${Number(B.cairo.id)} WHERE [id] = ${Number(E.one.id)}`)
  for (const user of [U.boss, U.pm]) refused(await decide(user, weekId, 'APPROVE'), 404, rules.WEEK_NOT_FOUND)
  assert.deepEqual([ok(await request(U.boss, 'GET', `${T}/team`)).weeks, ok(await request(U.pm, 'GET', `${T}/team`)).weeks, ok(await request(U.pmCairo, 'GET', `${T}/team`)).weeks.map(row => row.id)], [[], [], [weekId]])
  await pool.request().query(`UPDATE dbo.employees SET [managerEmployeeId] = ${Number(E.boss.id)}, [branchId] = ${Number(B.riyadh.id)} WHERE [id] = ${Number(E.one.id)}`)
  assert.equal((await weekOf(E.one)).status, 'SUBMITTED')
  // رفض بسبب: بيرجع للموظف يعدّل ويبعت تاني بنفس الصف
  ok(await decide(U.boss, weekId, 'REJECT', '  ساعات الأحد   مش منطقية '), 201)
  const rejected = await weekOf(E.one)
  assert.deepEqual([rejected.status, rejected.decidedByUserId, rejected.decisionNote], ['REJECTED', U.boss.id, 'ساعات الأحد مش منطقية'])
  assert.deepEqual((({ status, editable, decisionNote }) => [status, editable, decisionNote])(ok(await mine(U.one))), ['REJECTED', true, 'ساعات الأحد مش منطقية'])
  refused(await decide(U.boss, weekId, 'APPROVE'), 409, 'الأسبوع مش مستني اعتماد')
  ok(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 60 }))
  ok(await submit(U.one), 201)
  const resent = await weekOf(E.one)
  assert.deepEqual([resent.id, resent.status, resent.totalMinutes, resent.decidedByUserId, resent.decisionNote], [weekId, 'SUBMITTED', 720, null, null])
  // قرارين مع بعض = واحد بس
  const race = await Promise.all([decide(U.boss, weekId, 'APPROVE'), decide(U.pm, weekId, 'REJECT', 'سبب تاني')])
  assert.deepEqual(race.map(response => response.status).sort(), [201, 409])
  if ((await weekOf(E.one)).status === 'REJECTED') { ok(await submit(U.one), 201); ok(await decide(U.boss, weekId, 'APPROVE'), 201) }
  assert.equal((await weekOf(E.one)).status, 'APPROVED')
  // المعتمد مابيتعدّلش ولا بيتسحب ولا بيتبعت
  refused(await entry(U.one, { workDate: sunday, projectId: P.all, minutes: 30 }), 409, 'الأسبوع معتمد ومابيتعدّلش')
  refused(await recall(U.one), 409, 'مفيش أسبوع مبعوت يتسحب')
  refused(await submit(U.one), 409, 'الأسبوع معتمد ومابيتعدّلش')
  // محدش بيعتمد أسبوعه حتى بصلاحيته — وأسبوعه مش في قايمته
  ok(await entry(U.lead, { workDate: sunday, projectId: P.portal, taskId: K.test, minutes: 120 }))
  ok(await submit(U.lead), 201)
  const own = (await weekOf(E.lead)).id
  refused(await decide(U.lead, own, 'APPROVE'), 403, 'ماينفعش تعتمد ساعاتك بنفسك')
  assert.equal(ok(await request(U.lead, 'GET', `${T}/team`)).weeks.some(row => row.id === own), false)
  ok(await decide(U.pm, own, 'APPROVE'), 201)
  // أسبوع موظف تاني مبعوت ومااتعتمدش (للتقرير)
  ok(await entry(U.two, { workDate: sunday, projectId: P.portal, taskId: K.analysis, minutes: 300 }))
  ok(await submit(U.two), 201)
  const audit = await pool.request().query(`SELECT [action] FROM dbo.audit_log WHERE [entityType] = N'timesheet_week' ORDER BY [id]`)
  assert.deepEqual([...new Set(audit.recordset.map(row => row.action))].sort(), ['TIMESHEET_WEEK_APPROVED', 'TIMESHEET_WEEK_REJECTED'])
})

test('TS-05: التقرير — الأسابيع المعتمدة بس، لموظفين نطاق القارئ، لكل مشروع ومهمة وموظف؛ والتكلفة ورا ميزتها المقفولة وصلاحية عرض الرواتب، واللي راتبه مش متحدد «من غير تسعير»', async () => {
  const route = (from, to) => `${T}/report?from=${from}&to=${to}`
  for (const [from, to] of [['x', today], [today, WEEK], [rules.addDays(today, -400), today]]) refused(await request(U.pm, 'GET', route(from, to)), 400, 'حدّد فترة التقرير (من وإلى، سنة بالكتير)')
  assert.equal((await request(U.one, 'GET', route(WEEK, today))).status, 403)
  const plain = ok(await request(U.pm, 'GET', route(WEEK, today)))
  // أسبوع الموظف التاني لسه مااتعتمدش فمش في التقرير
  assert.deepEqual([plain.costShown, plain.totalMinutes, plain.projects.map(row => [row.clientName, row.projectName, row.minutes, row.tasks.map(task => [task.taskName, task.minutes]), row.employees.map(person => [person.fullName, person.minutes]), 'costs' in row])],
    [false, 840, [['داخلي', 'اجتماعات وتدريب', 60, [[null, 60]], [['موظف أول', 60]], false],
      ['شركة النور', 'بوابة العملاء', 780, [['تحليل المتطلبات', 180], ['اختبار', 600]], [['موظف أول', 660], ['مسؤول المشاريع', 120]], false]]])
  // فترة برّه الأسبوع، ونطاق فرع تاني
  assert.deepEqual([ok(await request(U.pm, 'GET', route(dayOf(WEEK, 2), today))).totalMinutes, ok(await request(U.pm, 'GET', route(dayOf(WEEK, 1), dayOf(WEEK, 1)))).totalMinutes, ok(await request(U.pmCairo, 'GET', route(WEEK, today))).projects], [0, 480, []])
  // الميزة مقفولة: حتى صاحب صلاحية الرواتب مابيشوفش تكلفة
  assert.equal(ok(await request(U.pay, 'GET', route(WEEK, today))).costShown, false)
  ok(await request(U.admin, 'PUT', `/modules/features/${rules.TIMESHEETS_COST_FEATURE}`, { enabled: true })); modules.invalidate()
  // من غير صلاحية عرض الرواتب مفيش تكلفة
  const noRight = ok(await request(U.pm, 'GET', route(WEEK, today)))
  assert.deepEqual([noRight.costShown, noRight.projects.some(row => 'costs' in row || 'unpricedMinutes' in row)], [false, false])
  // الوضع الافتراضي (سجل الأجر الشهري بس) ومفيش سجل: كل الدقايق «من غير تسعير» — مش صفر
  const strict = ok(await request(U.pay, 'GET', route(WEEK, today)))
  assert.deepEqual([strict.costShown, strict.projects.map(row => [row.costs, row.unpricedMinutes])], [true, [[[], 60], [[], 780]]])
  // راتب الملف الحالي مسموح: أجر الساعة = 6000 ÷ 30 ÷ 8 = 25، واللي راتبه صفر «من غير تسعير»
  const { PAYROLL_SALARY_EVIDENCE_MODE_KEY } = require('../src/payroll/payroll-run-salary')
  await repo('RequestsConfig').save({ key: PAYROLL_SALARY_EVIDENCE_MODE_KEY, value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' })
  const priced = ok(await request(U.pay, 'GET', route(WEEK, today)))
  assert.deepEqual(priced.projects.map(row => [row.projectName, row.costs, row.unpricedMinutes]), [['اجتماعات وتدريب', [{ currency: 'SAR', cents: 2500 }], 0], ['بوابة العملاء', [{ currency: 'SAR', cents: 27500 }], 120]])
  // التقرير مابيكتبش حاجة
  const ledger = await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.audit_log WHERE [entityType] IN (N'timesheet_week', N'timesheet_project') AND [action] LIKE N'%COST%'`)
  assert.equal(Number(ledger.recordset[0].n), 0)
  // قفل الموديول = المسارات بتختفي
  ok(await request(U.admin, 'PUT', '/modules/timesheets', { enabled: false })); modules.invalidate()
  assert.deepEqual([(await mine(U.one)).status, (await request(U.pay, 'GET', route(WEEK, today))).status], [404, 404])
})
