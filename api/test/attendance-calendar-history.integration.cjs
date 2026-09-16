// Real SQL + HTTP. Each run creates and removes its own random disposable database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_calendar_history_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-calendar-history-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { employeeRequiredFields } = require('./helpers/employee-fixture.cjs')
const keys = ['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance']
const today = require('../src/attendance/attendance.service').localDateOf(new Date())
const baseSalary = { basicSalary: '6000.00', housingAllowance: '1500.00', transportAllowance: '500.00',
  phoneAllowance: '300.00', workNatureAllowance: '200.00', otherAllowance: '100.00', currency: 'EGP' }
let app, ds, master, base, created = false, sequence = 0, branchA, branchB, admin, editor, outsider, viewer
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const expect = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function request(user, method, route, body) {
  const token = user && jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
async function employee(extra = {}) {
  const emp = await repo('Employee').save({ employeeCode: `SCH${++sequence}`, fullName: 'موظف اختبار سريان الأجر',
    branchId: branchA.id, status: 'active', joinDate: '2020-01-01', ...baseSalary, ...extra })
  return emp
}
const context = async (emp, actor = editor) => expect(await request(actor, 'GET', `/employees/${emp.id}/salary-change-context`), 200)
async function command(emp, salary = {}, extra = {}, actor = editor) {
  const c = await context(emp, actor)
  return { expectedRevision: c.historyRevision, expectedCurrentSourceHash: c.currentSourceHash,
    effectiveDate: today, reason: 'قرار تعديل الأجر للاختبار', evidenceReference: 'قرار داخلي اختباري',
    salary: { ...c.current, ...salary }, ...extra }
}
async function patch(emp, salaryChange, other = {}, actor = editor) {
  return request(actor, 'PATCH', `/employees/${emp.id}`, { ...other, salaryChange })
}
async function history(emp) { return expect(await request(admin, 'GET', `/payroll/employees/${emp.id}/salary-history`), 200) }
async function snapshot(emp) {
  const result = {}
  for (const table of ['employees', 'employee_salary_history_versions', 'employee_status_history']) {
    const filter = table === 'employees' ? '[id]=@0' : '[employeeId]=@0'
    result[table] = (await ds.query(`SELECT (SELECT * FROM [${table}] WHERE ${filter} ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data`, [emp.id]))[0].data
  }
  result.history = (await ds.query('SELECT (SELECT * FROM employee_salary_history WHERE versionId IN (SELECT id FROM employee_salary_history_versions WHERE employeeId=@0) ORDER BY id FOR JSON PATH, INCLUDE_NULL_VALUES) AS data', [emp.id]))[0].data
  return result
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_calendar_history_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: false, abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ name: 'Salary fixture A', code: 'SALA' })
  branchB = await repo('Branch').save({ name: 'Salary fixture B', code: 'SALB' })
  const user = (name, role, branchId, permissions) => repo('User').save({ email: `${name}@salary-change.invalid`, displayName: name,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, ['*'])
  editor = await user('editor', 'hr', branchA.id, ['employees.edit', 'org.manage', 'settings.manage', 'attendance.manage'])
  outsider = await user('other', 'hr', branchB.id, ['employees.edit', 'org.manage', 'settings.manage', 'attendance.manage'])
  viewer = await user('viewer', 'hr', branchA.id, ['employees.view', 'payroll.view'])
})
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_calendar_history_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-calendar-history-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: temporary uploads removed.')
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'Salary change fixture cleanup failed')
})

const cal = require('../src/attendance/attendance-calendar-history')
const { resolveEmployeeCalendarDay, resolveBranchCalendarDay } = require('../src/attendance/attendance-calendar-resolver')
const { lockAttendanceRuleMutation } = require('../src/attendance/attendance-rule-history')
const calContext = async (scope = 'GLOBAL', id = 0, actor = admin) => expect(await request(actor, 'GET', `/attendance/calendar-context?scope=${scope}&sourceId=${id}`), 200)
async function calCommand(scope = 'GLOBAL', id = 0, from = '2026-06-01', actor = admin) {
  const c = await calContext(scope, id, actor)
  return { effectiveFrom: from, reason: 'تأكيد مصدر التقويم وفق قرار الاختبار', expectedRevision: c.revision, expectedCurrentSourceHash: c.currentSourceHash }
}
async function confirm(scope = 'GLOBAL', id = 0, from = '2026-06-01', actor = admin) {
  return expect(await request(actor, 'POST', '/attendance/calendar-context/confirm', { scope, sourceId: id, calendarChange: await calCommand(scope, id, from, actor) }), 201)
}
const resolve = (emp, date, strict = true) => ds.transaction('SERIALIZABLE', em => resolveEmployeeCalendarDay(em, emp.id, date, { strict }))
async function readyEmployee(branch = branchA) {
  const emp = await employee({ branchId: branch.id })
  await confirm('EMPLOYEE', emp.id)
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { workScheduleId: null, flexOverrideMode: 'INHERIT',
    attendanceEffectiveFrom: '2026-06-01', attendanceChangeReason: 'تأكيد أول تعريف دوام مسجل' }), 200)
  return emp
}

test('calendar metadata enforces source identity, read permission and branch scope; global contents contain no branch rules', async () => {
  const c = await calContext()
  assert.equal(c.revision, 0); assert.equal(c.effectiveFrom, null); assert.equal(c.legacyBaseline, true)
  assert.deepEqual(Object.keys(c.current).sort(), ['exceptions','holidays','weekendDays'])
  expect(await request(viewer, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0'), 403)
  expect(await request(null, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=0'), 401)
  expect(await request(editor, 'GET', `/attendance/calendar-context?scope=BRANCH&sourceId=${branchB.id}`), 404)
  expect(await request(admin, 'GET', '/attendance/calendar-context?scope=BAD&sourceId=0'), 400)
  expect(await request(admin, 'GET', '/attendance/calendar-context?scope=GLOBAL&sourceId=1'), 400)
})

test('explicit first confirmation proves only its dated interval and never infers history from joinDate', async () => {
  const emp = await employee()
  const missing = await resolve(emp, '2026-06-01')
  assert.notEqual(missing.state, 'AVAILABLE')
  const old = await ds.transaction(em => cal.readCalendarSource(em, 'GLOBAL', 0))
  await confirm(); await confirm('BRANCH', branchA.id); await confirm('EMPLOYEE', emp.id)
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { workScheduleId: null, flexOverrideMode: 'INHERIT',
    attendanceEffectiveFrom: '2026-06-01', attendanceChangeReason: 'إثبات عدم وجود تجاوز راحة الموظف' }), 200)
  assert.equal((await resolve(emp, '2026-06-01')).state, 'AVAILABLE')
  assert.notEqual((await resolve(emp, '2026-05-31')).state, 'AVAILABLE')
  const legacy = await resolve(emp, '2026-05-31', false)
  assert.equal(legacy.legacyFallback, true)
  const versions = await ds.transaction(em => cal.readCalendarSource(em, 'GLOBAL', 0))
  assert.equal(versions.versions.length, 2); assert.equal(versions.versions[0].effectiveFrom, null)
  assert.deepEqual(versions.versions[0].snapshot, old.current)
})

test('calendar changes require date, reason and current CAS, even for create/delete/toggle', async () => {
  expect(await request(admin, 'POST', '/catalogs/holidays', { name: 'عطلة اختبار', date: '2026-06-15', country: 'EG' }), 400)
  expect(await request(admin, 'PATCH', '/settings/config', { key: 'attendance.weekend_days', value: 'FRI' }), 400)
  expect(await request(admin, 'PATCH', `/branches/${branchA.id}`, { country: 'EG', name: 'لا يتغير' }), 400)
  const before = await calContext(), good = await calCommand()
  for (const bad of [null, { ...good, reason: ' ' }, { ...good, effectiveFrom: '2026-02-30' },
    { ...good, expectedRevision: '1' }, { ...good, expectedCurrentSourceHash: '0'.repeat(64) }]) {
    const r = await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'GLOBAL', sourceId: 0, calendarChange: bad })
    assert.ok([400,409].includes(r.status), JSON.stringify(r))
  }
  assert.deepEqual(await calContext(), before)
})

test('holiday create and dated removal retain the old holiday period and public holiday wins over work exception', async () => {
  expect(await request(admin, 'PATCH', `/branches/${branchA.id}`, { country: 'EG', calendarChange: await calCommand('BRANCH', branchA.id) }), 200)
  const emp = await readyEmployee()
  const holiday = expect(await request(admin, 'POST', '/catalogs/holidays', { name: 'عطلة ممتدة للاختبار', date: '2026-06-15', endDate: '2026-06-20', country: 'EG', calendarChange: await calCommand() }), 201)
  const rule = expect(await request(admin, 'POST', '/attendance/schedule-rules', { name: 'دوام الاثنين', weekday: 'MON', occurrence: 'ALL', effect: 'WORK', branchId: branchA.id,
    calendarChange: await calCommand('BRANCH', branchA.id) }), 201)
  assert.ok(rule.id)
  assert.equal((await resolve(emp, '2026-06-15')).dayKind, 'HOLIDAY')
  expect(await request(admin, 'DELETE', `/catalogs/holidays/${holiday.id}`, { calendarChange: await calCommand('GLOBAL', 0, '2026-06-18') }), 200)
  assert.equal((await resolve(emp, '2026-06-17')).dayKind, 'HOLIDAY')
  assert.equal((await resolve(emp, '2026-06-18')).dayKind, 'WORKING')
  assert.equal(await repo('PublicHoliday').countBy({ id: holiday.id }), 0)
})

test('future global weekends change only future day kinds and rejects back-insertion into its complete snapshot timeline', async () => {
  const emp = await readyEmployee()
  const before = await resolve(emp, '2026-06-19')
  expect(await request(admin, 'PATCH', '/settings/config', { key: 'attendance.weekend_days', value: 'SAT,SUN', calendarChange: await calCommand('GLOBAL', 0, '2026-06-20') }), 200)
  assert.equal((await resolve(emp, '2026-06-19')).dayKind, before.dayKind)
  assert.equal((await resolve(emp, '2026-06-21')).dayKind, 'WEEKEND')
  assert.equal((await resolve(emp, '2026-06-26')).dayKind, 'WORKING')
  const r = await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'GLOBAL', sourceId: 0, calendarChange: await calCommand('GLOBAL', 0, '2026-06-19') })
  assert.equal(expect(r, 409).code, 'CALENDAR_EFFECTIVE_ORDER_CONFLICT')
})

test('two concurrent calendar writes allow one committed scope version without lost update', async () => {
  const command = await calCommand('GLOBAL', 0, '2026-06-20'), rev = command.expectedRevision
  const r = await Promise.all(['FRI', 'SAT'].map(value => request(admin, 'PATCH', '/settings/config', { key: 'attendance.weekend_days', value, calendarChange: command })))
  assert.deepEqual(r.map(row => row.status).sort(), [200,409]); assert.equal((await calContext()).revision, rev + 1)
})

test('branch users cannot change global calendars or foreign branch calendars; branch-only rule does not leak', async () => {
  const globalChange = await calCommand('GLOBAL', 0, '2026-06-20', editor)
  expect(await request(editor, 'PATCH', '/settings/config', { key: 'attendance.weekend_days', value: 'FRI,SAT', calendarChange: globalChange }), 403)
  expect(await request(editor, 'POST', '/catalogs/holidays', { name: 'مرفوض خارج النطاق', date: '2026-06-21', country: 'EG', calendarChange: globalChange }), 403)
  const own = expect(await request(editor, 'POST', '/attendance/schedule-rules', { name: 'قاعدة خاصة فرع ألف', weekday: 'TUE', occurrence: 'ALL', effect: 'OFF', branchId: branchA.id,
    calendarChange: await calCommand('BRANCH', branchA.id, '2026-06-01', editor) }), 201)
  const visible = expect(await request(outsider, 'GET', '/attendance/schedule-rules'), 200)
  assert.equal(visible.some(row => row.id === own.id), false)
  expect(await request(outsider, 'PATCH', `/attendance/schedule-rules/${own.id}`, { isActive: false, calendarChange: globalChange }), 404)
  expect(await request(editor, 'PATCH', `/attendance/schedule-rules/${own.id}`, { branchId: branchB.id, calendarChange: await calCommand('BRANCH', branchA.id, '2026-06-01', editor) }), 400)
})

test('dated employee branch changes preserve past organization and require source CAS; future profile move is rejected', async () => {
  await confirm('BRANCH', branchB.id)
  expect(await request(admin, 'PATCH', `/branches/${branchB.id}`, { weekendDays: 'WED', calendarChange: await calCommand('BRANCH', branchB.id) }), 200)
  const emp = await readyEmployee(), before = await resolve(emp, '2026-06-10')
  const login = await repo('User').save({ email: 'calendar-moved@fixture.invalid', displayName: 'حساب المنقول', passwordHash: 'test-only', role: 'employee', branchId: branchA.id, employeeId: emp.id, tokenVersion: 3 })
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { branchId: branchB.id }), 400)
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { branchId: branchB.id, calendarChange: await calCommand('EMPLOYEE', emp.id, '2026-06-15') }), 200)
  assert.equal((await resolve(emp, '2026-06-10')).branchId, before.branchId)
  const moved = await resolve(emp, '2026-06-24'); assert.equal(moved.branchId, branchB.id); assert.equal(moved.dayKind, 'WEEKEND')
  const movedLogin = await repo('User').findOneByOrFail({ id: login.id })
  assert.equal(movedLogin.branchId, branchB.id); assert.equal(movedLogin.tokenVersion, 4)
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { branchId: branchA.id, calendarChange: await calCommand('EMPLOYEE', emp.id, '9999-01-01') }), 400)
  expect(await request(editor, 'GET', `/attendance/calendar-context?scope=EMPLOYEE&sourceId=${emp.id}`), 404)
})

test('noncalendar profile and branch edits preserve money and do not create calendar revisions', async () => {
  const emp = await readyEmployee(), e = await calContext('EMPLOYEE', emp.id), b = await calContext('BRANCH', branchA.id)
  await ds.query("UPDATE employees SET basicSalary=CAST('9007199254740991.23' AS decimal(18,2)) WHERE id=@0", [emp.id])
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { phone: '01234567890' }), 200)
  expect(await request(admin, 'PATCH', `/branches/${branchA.id}`, { name: 'اسم الفرع المعدل' }), 200)
  assert.deepEqual(await calContext('EMPLOYEE', emp.id), e); assert.deepEqual(await calContext('BRANCH', branchA.id), b)
  assert.equal((await context(emp, admin)).current.basicSalary, '9007199254740991.23')
})

test('current source drift and tampered immutable history fail closed and never manufacture a new baseline', async () => {
  const saved = await repo('Branch').findOneByOrFail({ id: branchB.id })
  await repo('Branch').update({ id: saved.id }, { country: 'SA' })
  const c = await calContext('BRANCH', saved.id); assert.equal(c.currentMatchesHistory, false)
  const r = await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'BRANCH', sourceId: saved.id, calendarChange: await calCommand('BRANCH', saved.id) })
  assert.equal(expect(r, 409).code, 'CALENDAR_CURRENT_SOURCE_DRIFT')
  await repo('Branch').update({ id: saved.id }, { country: saved.country })
  const row = await repo('AttendanceRuleVersion').findOne({ where: { sourceType: 'CALENDAR_BRANCH', sourceId: saved.id }, order: { version: 'DESC' } })
  const original = row.snapshot
  await repo('AttendanceRuleVersion').update({ id: row.id }, { snapshot: { ...original, contentHash: '0'.repeat(64) } })
  try { expect(await request(admin, 'GET', `/attendance/calendar-context?scope=BRANCH&sourceId=${saved.id}`), 409) }
  finally { await repo('AttendanceRuleVersion').update({ id: row.id }, { snapshot: original }) }
})

test('failed calendar append rolls back source mutation atomically', async () => {
  const command = await calCommand('GLOBAL', 0, '2026-06-20'), before = await calContext()
  await ds.query("ALTER TABLE attendance_rule_versions ADD CONSTRAINT CK_calendar_test_failure CHECK (reason <> N'TEST_CALENDAR_ROLLBACK')")
  try {
    expect(await request(admin, 'POST', '/catalogs/holidays', { name: 'لن تحفظ', country: 'EG', date: '2026-06-25', calendarChange: { ...command, reason: 'TEST_CALENDAR_ROLLBACK' } }), 500)
    assert.deepEqual(await calContext(), before)
  } finally { await ds.query('ALTER TABLE attendance_rule_versions DROP CONSTRAINT CK_calendar_test_failure') }
})

test('new branch has an observed creation-date calendar and never backfills its historical configuration', async () => {
  const branch = expect(await request(admin, 'POST', '/branches', { name: 'فرع جديد', code: 'CALNEW', country: 'EG', weekendDays: 'FRI' }), 201)
  const c = await calContext('BRANCH', branch.id)
  assert.equal(c.effectiveFrom, today); assert.equal(c.revision, 1)
  const old = await ds.transaction(em => resolveBranchCalendarDay(em, branch.id, '2020-01-01', { strict: true }))
  assert.notEqual(old.state, 'AVAILABLE')
})

test('approved and paid payroll memberships block calendar rewrites with no payroll or source mutation', async () => {
  for (const status of ['APPROVED','PAID']) {
    const emp = await readyEmployee(), run = await repo('PayrollRun').save({ period: '2026-06', startDate: '2026-06-01', endDate: '2026-06-30', status })
    await repo('PayrollRunMember').save({ runId: run.id, employeeId: emp.id, membershipStatus: 'INCLUDED' })
    const before = await calContext(), beforeEmp = await calContext('EMPLOYEE', emp.id)
    expect(await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'GLOBAL', sourceId: 0, calendarChange: await calCommand('GLOBAL', 0, '2026-06-20') }), 409)
    expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { branchId: branchB.id, calendarChange: await calCommand('EMPLOYEE', emp.id, '2026-06-20') }), 409)
    assert.deepEqual(await calContext(), before); assert.deepEqual(await calContext('EMPLOYEE', emp.id), beforeEmp)
    assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, status)
    await repo('PayrollRunMember').delete({ runId: run.id }); await repo('PayrollRun').delete({ id: run.id })
  }
})

test('a settled service also blocks retrospective calendar changes before its final working day', async () => {
  const emp = await readyEmployee(), c = await calContext('EMPLOYEE', emp.id)
  await repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay: '2026-06-30', status: 'SETTLED', terminationReason: 'termination' })
  const r = await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope: 'EMPLOYEE', sourceId: emp.id, calendarChange: await calCommand('EMPLOYEE', emp.id, '2026-06-20') })
  assert.equal(expect(r, 409).code, 'CALENDAR_CLOSED_SETTLEMENT'); assert.deepEqual(await calContext('EMPLOYEE', emp.id), c)
})

test('employee creation records only the observed creation date when no explicit calendar date was supplied', async () => {
  const emp = expect(await request(admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branchA.id)), employeeCode: 'CALCREATEA', fullName: 'إنشاء موظف دون تأريخ سابق', branchId: branchA.id,
    basicSalary: 6000, currency: 'EGP', joinDate: '2020-01-01' }), 201)
  const c = await calContext('EMPLOYEE', emp.id)
  assert.equal(c.effectiveFrom, today); assert.equal(c.revision, 1)
  const rule = await repo('AttendanceRuleVersion').findOne({ where: { sourceType: 'EMPLOYEE', sourceId: emp.id }, order: { version: 'DESC' } })
  assert.equal(rule.effectiveFrom, today); assert.equal(rule.snapshot.workScheduleId, null)
  assert.notEqual((await resolve(emp, '2020-01-01')).state, 'AVAILABLE')
})

test('an explicit creation calendar date records both branch and schedule without deriving either from joinDate', async () => {
  const emp = expect(await request(admin, 'POST', '/employees', { ...(await employeeRequiredFields(ds, branchA.id)), employeeCode: 'CALCREATEB', fullName: 'إنشاء موظف بتاريخ موثق', branchId: branchA.id,
    basicSalary: 6000, currency: 'EGP', joinDate: '2020-01-01', attendanceEffectiveFrom: '2026-06-01', attendanceChangeReason: 'تسجيل الدوام والفرع من القرار الصريح' }), 201)
  const c = await calContext('EMPLOYEE', emp.id)
  assert.equal(c.effectiveFrom, '2026-06-01')
  const rule = await repo('AttendanceRuleVersion').findOne({ where: { sourceType: 'EMPLOYEE', sourceId: emp.id }, order: { version: 'DESC' } })
  assert.equal(rule.effectiveFrom, '2026-06-01'); assert.equal(rule.actorUserId, admin.id)
  assert.equal((await resolve(emp, '2026-06-01')).state, 'AVAILABLE')
  assert.notEqual((await resolve(emp, '2020-01-01')).state, 'AVAILABLE')
})

test('candidate hiring supplies the real actor to employee calendar creation and enforces target branch scope', async () => {
  // التعيين = إضافة موظف: candidates.manage + employees.create، وبنفس الحقول الإجبارية
  const recruiter = await repo('User').save({ email: 'calendar-recruiter@fixture.invalid', displayName: 'اختبار تعيين', passwordHash: 'test-only', role: 'hr', branchId: branchA.id, permissions: JSON.stringify(['candidates.manage', 'employees.create']) })
  const pipelineOnly = await repo('User').save({ email: 'calendar-pipeline@fixture.invalid', displayName: 'مرشحين بس', passwordHash: 'test-only', role: 'hr', branchId: branchA.id, permissions: JSON.stringify(['candidates.manage']) })
  const hireBody = async (branchId, extra) => ({ ...(await employeeRequiredFields(ds, branchId)), branchId, basicSalary: 6000, currency: 'EGP', joinDate: '2020-01-01', ...extra })
  const candidate = await repo('Candidate').save({ fullName: 'مرشح تعيين التقويم', positionTitle: 'موظف', branchId: branchA.id })
  expect(await request(pipelineOnly, 'POST', `/candidates/${candidate.id}/hire`, await hireBody(branchA.id, { employeeCode: 'CALNOPERM' })), 403)
  expect(await request(recruiter, 'POST', `/candidates/${candidate.id}/hire`, await hireBody(branchB.id, { employeeCode: 'CALRECRUIT' })), 403)
  assert.equal((await repo('Candidate').findOneByOrFail({ id: candidate.id })).stage, 'applied')
  assert.equal(await repo('Employee').countBy({ employeeCode: 'CALNOPERM' }), 0)
  const result = expect(await request(recruiter, 'POST', `/candidates/${candidate.id}/hire`, await hireBody(branchA.id, { employeeCode: 'CALRECRUIT' })), 201)
  assert.equal(result.candidate.stage, 'hired')
  const version = await repo('AttendanceRuleVersion').findOne({ where: { sourceType: 'EMPLOYEE_ORG', sourceId: result.employee.id }, order: { version: 'DESC' } })
  assert.equal(version.actorUserId, recruiter.id); assert.equal(version.effectiveFrom, today)
  const foreign = await repo('Candidate').save({ fullName: 'مرشح فرع آخر', positionTitle: 'موظف', branchId: branchB.id })
  expect(await request(recruiter, 'POST', `/candidates/${foreign.id}/hire`, await hireBody(branchA.id, { employeeCode: 'CALREJECT' })), 404)
})
