// B2.14: لوحة «فريقي» للمدير الهيكلي — قائد فريق بدور «موظف» بيشوف فريقه بس، ومايشوفش رواتبهم إلا بحق عرض الرواتب.
// HTTP وSQL فعليان في قاعدة اختبار عشوائية تُحذف بعد الانتهاء.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_team_dashboard_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-team-dashboard-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
let app, ds, master, base, modules, created = false, today
const U = {}, E = {}, B = {}

const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function call(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(claims(user))}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
const idsOf = rows => rows.map(row => row.id ?? row.employeeId).sort((a, b) => a - b)
const sorted = (...employees) => employees.map(employee => employee.id).sort((a, b) => a - b)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_team_dashboard_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  // ولا رسالة بريد حقيقية من اختبار
  const mail = app.get(require('../src/auth/mail.service').MailService)
  mail.isConfigured = () => false; mail.send = async () => { throw new Error('no mail in tests') }
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  today = localDateOf(new Date())
  B.a = await repo('Branch').save({ code: 'TDA', name: 'فرع الفريق أ', country: 'EG', weekendDays: 'FRI' })
  B.b = await repo('Branch').save({ code: 'TDB', name: 'فرع الفريق ب', country: 'EG', weekendDays: 'FRI' })
  let n = 0
  const employee = async (key, extra = {}) => { E[key] = await repo('Employee').save({ employeeCode: `TD${String(++n).padStart(3, '0')}`, fullName: `موظف فريق ${key}`, branchId: B.a.id,
    status: 'active', isActive: true, joinDate: '2024-01-01', basicSalary: 5000 + n * 100, ...extra }) }
  await employee('head'); await employee('lead')
  const department = await repo('Department').save({ branchId: B.a.id, name: 'قسم الفريق', managerEmployeeId: E.head.id })
  const other = await repo('Department').save({ branchId: B.a.id, name: 'قسم تاني' })
  const team = await repo('Team').save({ departmentId: department.id, name: 'فريق القائد', leaderEmployeeId: E.lead.id })
  await repo('Employee').update({ id: E.head.id }, { departmentId: department.id })
  await repo('Employee').update({ id: E.lead.id }, { departmentId: department.id, teamId: team.id })
  // m1 وm2 في فريق القائد (مديرهم المباشر قائد الفريق)، m3 في القسم من غير فريق (مديره رئيس القسم)، x1 في فرع تاني ومديره المسجّل القائد
  await employee('m1', { departmentId: department.id, teamId: team.id, contractEnd: addDays(today, 200) })
  await employee('m2', { departmentId: department.id, teamId: team.id, status: 'probation', probationEndDate: addDays(today, 5) })
  await employee('m3', { departmentId: department.id })
  await employee('x1', { branchId: B.b.id, managerEmployeeId: E.lead.id, contractEnd: addDays(today, 20) })
  // برّه الفريق: قسم تاني، وعضو مؤرشف
  await employee('o1', { departmentId: other.id })
  await employee('gone', { departmentId: department.id, teamId: team.id, status: 'archived', isActive: false })
  const account = (key, role, permissions, employeeKey, extra = {}) => repo('User').save({ email: `${key}@team-dashboard.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only',
    role, permissions: JSON.stringify(permissions), isActive: true, branchId: B.a.id, employeeId: employeeKey ? E[employeeKey].id : null, ...extra }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'], null, { branchId: null })
  await account('lead', 'employee', [], 'lead'); await account('head', 'employee', [], 'head'); await account('member', 'employee', [], 'm1')
  // حضور النهارده
  const day = (who, status, extra = {}) => ({ employeeId: E[who].id, branchId: E[who].branchId, date: today, status, shiftName: 'وردية الاختبار', shiftStart: '08:00', shiftEnd: '16:00', ...extra })
  await repo('AttendanceDay').save([day('m1', 'present', { checkIn: '08:00' }), day('m2', 'late', { checkIn: '08:20', lateMinutes: 20 }), day('x1', 'absent'), day('o1', 'present', { checkIn: '08:01' })])
  // الإجازات: m3 في إجازة النهارده، m2 بعد 10 أيام، وإجازات مش المفروض تظهر (ملغية، بعد النافذة، وموظف برّه الفريق)
  const leave = (who, from, to, extra = {}) => ({ employeeId: E[who].id, leaveTypeCode: 'SICK', fromDate: addDays(today, from), toDate: addDays(today, to), days: to - from + 1, period: 'FULL',
    status: 'APPROVED', ...extra })
  await repo('Leave').save([leave('m3', 0, 2), leave('m2', 10, 11), leave('m1', 3, 4, { status: 'CANCELLED' }), leave('m1', 40, 41), leave('o1', 1, 2)])
  // المستندات: إقامة m1 هتنتهي بعد 10 أيام؛ ومستند بعد النافذة، ومستند موظف برّه الفريق
  await repo('EmployeeDocument').save([{ employeeId: E.m1.id, docType: 'إقامة', number: 'SECRET-123', expiryDate: addDays(today, 10) },
    { employeeId: E.m2.id, docType: 'جواز سفر', expiryDate: addDays(today, 100) }, { employeeId: E.o1.id, docType: 'إقامة', expiryDate: addDays(today, 3) }])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_team_dashboard_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-team-dashboard-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار لوحة الفريق')
})

test('TD-01: a team leader with the plain employee role sees his own team only, without salaries; the module is closed until opened', async () => {
  // الموديول مقفول افتراضيًا: المسارين مش موجودين
  for (const route of ['/manager/team', '/manager/status']) expect(await call(U.lead, 'GET', route), 404)
  expect(await call(U.admin, 'PUT', '/modules/manager', { enabled: true }), 200)
  modules.invalidate()
  assert.deepEqual(expect(await call(U.lead, 'GET', '/manager/status'), 200), { manager: true })
  const view = expect(await call(U.lead, 'GET', '/manager/team'), 200)
  assert.deepEqual([view.manager, view.date, view.windowDays, view.canSeeCompensation], [true, today, 30, false])
  // فريقه: m1 وm2 (فريقه) وx1 (مديره المسجّل) — مش رئيس القسم، ولا m3 (مديره رئيس القسم)، ولا القسم التاني، ولا المؤرشف، ولا هو نفسه
  assert.deepEqual(idsOf(view.team), sorted(E.m1, E.m2, E.x1))
  assert.ok(view.team.every(member => member.direct === true))
  // من غير أي حقل فلوس
  for (const member of view.team) for (const field of ['basicSalary', 'currency', 'iban', 'bankName']) assert.equal(field in member, false, `${member.fullName}: ${field}`)
  assert.doesNotMatch(JSON.stringify(view), /basicSalary|SECRET-123|SICK|leaveTypeCode/, 'ولا راتب، ولا رقم مستند، ولا نوع إجازة')
  assert.deepEqual(view.team.find(member => member.id === E.m2.id).status, 'probation')
  // وحدات عضو فرعه بأسمائها، ومرؤوسه في فرع برّه نطاق حسابه باسمه بس (من غير اسم فرعه ولا قسمه)
  const unitsOf = id => { const member = view.team.find(item => item.id === id); return [member.fullName, member.branchName, member.departmentName, member.teamName] }
  assert.deepEqual(unitsOf(E.m1.id), ['موظف فريق m1', 'فرع الفريق أ', 'قسم الفريق', 'فريق القائد'])
  assert.deepEqual(unitsOf(E.x1.id), ['موظف فريق x1', null, null, null])
  assert.doesNotMatch(JSON.stringify(view), /فرع الفريق ب/)
  // حضور النهارده
  const { rows, ...counts } = view.attendanceToday
  assert.deepEqual(counts, { attended: 2, late: 1, absent: 1, onLeave: 0, none: 0 })
  assert.deepEqual(Object.fromEntries(rows.map(row => [row.employeeId, [row.status, row.checkIn, row.lateMinutes]])),
    { [E.m1.id]: ['present', '08:00', 0], [E.m2.id]: ['late', '08:20', 20], [E.x1.id]: ['absent', null, 0] })
  // الإجازات المعتمدة في النافذة لفريقه بس: الملغية وبعد النافذة وموظف القسم التاني برّه
  assert.deepEqual(view.leaves.map(leave => [leave.employeeId, leave.fromDate, leave.toDate, leave.days]), [[E.m2.id, addDays(today, 10), addDays(today, 11), 2]])
  // اللي هينتهي: بالتاريخ
  assert.deepEqual(view.expiring.map(item => [item.employeeId, item.kind, item.label, item.date, item.daysLeft]), [
    [E.m2.id, 'probation', 'نهاية فترة التجربة', addDays(today, 5), 5], [E.m1.id, 'document', 'إقامة', addDays(today, 10), 10], [E.x1.id, 'contract', 'نهاية العقد', addDays(today, 20), 20]])
  assert.deepEqual([view.pendingApprovals, view.tasks], [0, { open: 0, overdue: 0 }])
  // اللي مالوش حد تحته: ولا بيان — نفس الرد لحساب من غير موظف
  for (const user of [U.member, U.admin]) {
    assert.deepEqual(expect(await call(user, 'GET', '/manager/team'), 200), { manager: false })
    assert.deepEqual(expect(await call(user, 'GET', '/manager/status'), 200), { manager: false })
  }
})

test('TD-02: a department head sees the whole tree under him, with direct reports marked and today\'s leave counted', async () => {
  const view = expect(await call(U.head, 'GET', '/manager/team'), 200)
  // تحته: القائد وm3 مباشرين، وتحت القائد m1 وm2 وx1
  assert.deepEqual(idsOf(view.team), sorted(E.lead, E.m1, E.m2, E.m3, E.x1))
  assert.deepEqual(idsOf(view.team.filter(member => member.direct)), sorted(E.lead, E.m3))
  const { rows, ...counts } = view.attendanceToday
  // m3 في إجازة النهارده من غير صف حضور، والقائد من غير بصمة لسه
  assert.deepEqual(counts, { attended: 2, late: 1, absent: 1, onLeave: 1, none: 1 })
  assert.deepEqual([rows.find(row => row.employeeId === E.m3.id).status, rows.find(row => row.employeeId === E.lead.id).status], ['leave', 'none'])
  assert.deepEqual(view.leaves.map(leave => leave.employeeId), [E.m3.id, E.m2.id])
  // الموديول اتقفل تاني: المسار مش موجود
  expect(await call(U.admin, 'PUT', '/modules/manager', { enabled: false }), 200)
  modules.invalidate()
  expect(await call(U.head, 'GET', '/manager/team'), 404)
  expect(await call(U.admin, 'PUT', '/modules/manager', { enabled: true }), 200)
  modules.invalidate()
})

test('TD-03: salaries appear only with the compensation right, and only for members inside the account\'s branch scope', async () => {
  // قبل المنح: ملف مرؤوس مايتفتحش أصلًا (القائد من غير employees.view)
  expect(await call(U.lead, 'GET', `/employees/${E.m1.id}`), 403)
  await repo('User').update({ id: U.lead.id }, { permissions: '["employees.view_compensation"]' })
  U.lead.permissions = '["employees.view_compensation"]'
  const view = expect(await call(U.lead, 'GET', '/manager/team'), 200)
  assert.equal(view.canSeeCompensation, true)
  const byId = Object.fromEntries(view.team.map(member => [member.id, member]))
  // موظفين فرع حسابه: الراتب بعملة فرعهم. مرؤوس في فرع برّه نطاق حسابه: من غير راتب
  for (const key of ['m1', 'm2']) {
    assert.equal(Number(byId[E[key].id].basicSalary), Number(E[key].basicSalary), key)
    assert.equal(typeof byId[E[key].id].currency, 'string')
  }
  assert.equal('basicSalary' in byId[E.x1.id], false, 'مرؤوس في فرع تاني من غير راتب')
  assert.deepEqual(idsOf(view.team), sorted(E.m1, E.m2, E.x1), 'الفريق نفسه — المفتاح مابيوسّعش مين في الفريق')
  // المفتاح مابيفتحش ملفات الموظفين (محتاج employees.view)، وملف الموظف بيعرض الراتب للي معاه المفتاح مع العرض
  expect(await call(U.lead, 'GET', `/employees/${E.m1.id}`), 403)
  await repo('User').update({ id: U.member.id }, { permissions: '["employees.view"]' })
  U.member.permissions = '["employees.view"]'
  assert.equal('basicSalary' in expect(await call(U.member, 'GET', `/employees/${E.m2.id}`), 200), false, 'عرض الموظفين لوحده: من غير راتب (زي الأول)')
  await repo('User').update({ id: U.member.id }, { permissions: '["employees.view","employees.view_compensation"]' })
  U.member.permissions = '["employees.view","employees.view_compensation"]'
  assert.equal(Number(expect(await call(U.member, 'GET', `/employees/${E.m2.id}`), 200).basicSalary), Number(E.m2.basicSalary))
  // القاعدة القايمة زي ما هي: تعديل بيانات الموظف بيشوف الراتب من غير المفتاح
  await repo('User').update({ id: U.member.id }, { permissions: '["employees.view","employees.edit"]' })
  U.member.permissions = '["employees.view","employees.edit"]'
  assert.equal(Number(expect(await call(U.member, 'GET', `/employees/${E.m2.id}`), 200).basicSalary), Number(E.m2.basicSalary))
})
