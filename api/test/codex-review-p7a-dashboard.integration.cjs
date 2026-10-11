// B-ADD.3: كروت لوحة الإدارة — الصلاحيات والنطاق والفلتر الموحد على HTTP وSQL فعليين.
// «خلص لما»: مدير HR فرع واحد يفتح اللوحة، يختار إدارة، يضغط على «غايب» في فريق، ويشوف الأسماء — كله جوه فرعه بس.
// ومفيش مبلغ من غير صلاحية الرواتب، وكل كارت بصلاحيته وموديوله، والأرقام اللي ليها مؤشر في القاموس = رقم التقرير.
// قاعدة اختبار عشوائية تُحذف بعد الانتهاء. Run (من api/): node --test test/dashboard-cards.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_dashboard_cards_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-dashboard-cards-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { localDateOf } = require('../src/attendance/attendance.service')
const { addDays } = require('../src/employees/employee-suspension-rules')
const today = localDateOf(new Date())
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const todayCode = WEEKDAYS[new Date(`${today}T12:00:00`).getDay()]
// راحة أسبوعية مافيهاش النهارده (فروع الشغل)، وراحة فيها النهارده (فرع الراحة)
const workingWeekend = WEEKDAYS.filter(code => code !== todayCode).slice(0, 2).join(',')
let app, ds, master, base, modules, created = false
const B = {}, D = {}, T = {}, E = {}, U = {}

function assertDisposable() {
  assert.match(database, /^hr_dashboard_cards_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE); assert.notEqual(database, 'hr_system')
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const claims = user => ({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]'),
  ...(user.scopeBranchIds ? { branchIds: JSON.parse(user.scopeBranchIds) } : {}) })
const expect = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body ?? null)); return response.body }
async function call(user, route) {
  const response = await fetch(base + route, { headers: { Authorization: `Bearer ${jwt.sign(claims(user))}` } })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const card = async (user, route) => expect(await call(user, `/dashboard/cards${route}`), 200)
const minutesNow = () => { const now = new Date(); return now.getHours() * 60 + now.getMinutes() }
const names = list => list.map(row => row.name).sort()
const rowOf = (body, name) => body.rows.find(row => row.name === name)
// Independent probes. Success means the named leak was reproduced.
test('P7A-D01: task card reveals current employee name outside its reader branch', async t => {
  try {
    await repo('Employee').update({ id: E.j1.id }, { branchId: B.r.id, fullName: 'P7A foreign branch private name' });
    const body = await card(U.hr, '/tasks');
    const leaked = body.assignees.find(row => row.employeeId === E.j1.id);
    assert.equal(leaked?.name, 'P7A foreign branch private name');
    t.diagnostic(JSON.stringify({ case: 'P7A-D01', status: 200, foreignEmployeeNameDisclosed: true }));
  } finally { await repo('Employee').update({ id: E.j1.id }, { branchId: B.j.id, fullName: E.j1.fullName }); }
});
test('P7A-D02: dashboard cache continues exposing names and phones after a transfer', async t => {
  const svc = app.get(require('../src/dashboard/dashboard-cards.service').DashboardCardsService);
  svc.shared.clear();
  const route = '/absent-late';
  const before = await card(U.hr, route);
  assert.ok(JSON.stringify(before).includes(E.j3.fullName));
  try {
    await repo('Employee').update({ id: E.j3.id }, { branchId: B.r.id });
    const body = await card(U.hr, route);
    assert.ok(JSON.stringify(body).includes(E.j3.fullName));
    assert.ok(JSON.stringify(body).includes(E.j3.phone));
    svc.shared.clear();
    assert.equal(JSON.stringify(await card(U.hr, route)).includes(E.j3.fullName), false);
    t.diagnostic(JSON.stringify({ case: 'P7A-D02', cachedLeak: true, freshReadLeak: false }));
  } finally { await repo('Employee').update({ id: E.j3.id }, { branchId: B.j.id }); svc.shared.clear(); }
});

test('P7A-D03: a confidential custom definition is counted through a department filter', async t => {
  await repo('RequestType').save({ code: 'P7A_SECRET', nameAr: 'P7A confidential definition', category: 'inquiries', destinationHandler: 'NONE', isConfidential: true });
  const route = `/requests?departmentIds=${D.retail.id}`;
  const before = await card(U.hr, route);
  const row = await repo('Request').save({ typeCode: 'DC_TEST', definitionCode: 'P7A_SECRET', requesterId: E.j1.id, createdByUserId: U.admin.id,
    branchId: B.j.id, status: 'SUBMITTED', currentStep: 1, payload: '{}', submittedAt: new Date() });
  try {
    const after = await card(U.hr, route);
    assert.equal(after.pending, before.pending + 1);
    // Control: the same record with its secret definition as typeCode is hidden by this filter.
    await repo('Request').update({ id: row.id }, { typeCode: 'P7A_SECRET' });
    assert.equal((await card(U.hr, route)).pending, before.pending);
    t.diagnostic(JSON.stringify({ case: 'P7A-D03', secretDefinitionInDepartmentCount: true, directSecretTypeHidden: true }));
  } finally { await repo('Request').delete({ id: row.id }); await repo('RequestType').delete({ code: 'P7A_SECRET' }); }
});

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assertDisposable()
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
  ds = app.get(require('../node_modules/typeorm').DataSource); assertDisposable()
  modules = app.get(require('../src/modules-registry/modules.service').ModulesService)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  const config = repo('RequestsConfig')
  for (const [key, value] of [['payroll.cycle_start_day', '1'], ['attendance.weekend_days', workingWeekend], ['attendance.grace_minutes', '10']]) {
    if (await config.findOneBy({ key })) await config.update({ key }, { value }); else await config.save({ key, value })
  }
  await repo('WorkSchedule').save({ name: 'الجدول الافتراضي', weekendDays: workingWeekend, startTime: '08:00', endTime: '16:00', isDefault: true, isActive: true })

  // ===== الهيكل: فرع جدة (إدارتين، وقسمين تحت إدارة المبيعات، وفريقين في التجزئة)، وفرع الرياض، وفرع راحته النهارده =====
  B.j = await repo('Branch').save({ code: 'DCJ', name: 'فرع جدة', country: 'EG', weekendDays: workingWeekend })
  B.r = await repo('Branch').save({ code: 'DCR', name: 'فرع الرياض', country: 'EG', weekendDays: workingWeekend })
  B.x = await repo('Branch').save({ code: 'DCX', name: 'فرع راحته النهارده', country: 'EG', weekendDays: todayCode })
  const unit = (key, branch, name, unitType, parent) => repo('Department').save({ branchId: branch.id, name, unitType, parentId: parent ? parent.id : null })
    .then(saved => { D[key] = saved })
  await unit('sales', B.j, 'إدارة المبيعات', 'ADMINISTRATION'); await unit('retail', B.j, 'قسم التجزئة', 'DEPARTMENT', D.sales)
  await unit('wholesale', B.j, 'قسم الجملة', 'DEPARTMENT', D.sales); await unit('ops', B.j, 'إدارة التشغيل', 'ADMINISTRATION')
  await unit('radm', B.r, 'إدارة الرياض', 'ADMINISTRATION'); await unit('rdep', B.r, 'قسم الرياض', 'DEPARTMENT', D.radm)
  const team = (key, department, name) => repo('Team').save({ departmentId: department.id, name }).then(saved => { T[key] = saved })
  await team('showroom', D.retail, 'فريق المعرض'); await team('online', D.retail, 'فريق الأونلاين'); await team('rteam', D.rdep, 'فريق الرياض')

  let n = 0
  const employee = (key, branch, department, teamRow, extra = {}) => repo('Employee').save({ employeeCode: `DC${String(++n).padStart(3, '0')}`, fullName: `موظف لوحة ${key}`,
    branchId: branch.id, departmentId: department ? department.id : null, teamId: teamRow ? teamRow.id : null, status: 'active', isActive: true, joinDate: '2024-01-01',
    phone: `05000000${String(n).padStart(2, '0')}`, basicSalary: 5000, ...extra }).then(saved => { E[key] = saved })
  await employee('j1', B.j, D.retail, T.showroom); await employee('j2', B.j, D.retail, T.showroom); await employee('j3', B.j, D.retail, T.showroom)
  await employee('j4', B.j, D.retail, T.showroom); await employee('j5', B.j, D.retail, T.online); await employee('j6', B.j, D.retail, T.online)
  await employee('j7', B.j, D.retail, null)
  // j8 عقده انتهى من 3 أيام، وj9 عقده هينتهي بعد 20 يوم، وj10 تحت التجربة لحد بعد 5 أيام، وj11 اتعيّن النهارده ومن غير قسم
  await employee('j8', B.j, D.wholesale, null, { contractEnd: addDays(today, -3) }); await employee('j9', B.j, D.wholesale, null, { contractEnd: addDays(today, 20) })
  await employee('j10', B.j, D.ops, null, { status: 'probation', probationEndDate: addDays(today, 5) })
  await employee('j11', B.j, null, null, { joinDate: today }); await employee('j12', B.j, D.wholesale, null)
  // خرج النهارده (مؤرشف): برّه العدد، وجوه «الخارجين» في شهر الرواتب
  await employee('gone', B.j, D.retail, T.showroom, { status: 'archived', isActive: false, archivedAt: new Date(`${today}T10:00:00`) })
  await employee('r1', B.r, D.rdep, T.rteam); await employee('r2', B.r, D.rdep, T.rteam); await employee('r3', B.r, D.rdep, null)
  await employee('x1', B.x, null, null)

  const account = (key, role, permissions, branch) => repo('User').save({ email: `${key}@dashboard-cards.invalid`, displayName: `حساب ${key}`, passwordHash: 'test-only', role,
    permissions: JSON.stringify(permissions), isActive: true, branchId: branch ? branch.id : null }).then(saved => { U[key] = saved })
  await account('admin', 'super_admin', ['*'], null)
  // مدير HR فرع جدة: كل الكروت غير الفلوس والمستندات
  await account('hr', 'employee', ['dashboard.view_all', 'attendance.view_all', 'employees.view', 'leaves.view_all', 'requests.view_all', 'tasks.view_all', 'reports.view'], B.j)
  // قارئ حضور من غير صلاحية عرض الموظفين (من غير تليفونات)، وقارئ رواتب، ولوحة من غير أي كارت، وحساب من غير اللوحة
  await account('att', 'employee', ['dashboard.view_all', 'attendance.view_all'], B.j)
  await account('pay', 'employee', ['dashboard.view_all', 'attendance.view_all', 'payroll.view'], B.j)
  await account('bare', 'employee', ['dashboard.view_all'], B.j)
  await account('plain', 'employee', ['attendance.view_all', 'payroll.view'], B.j)

  // ===== حضور النهارده (صفوف محسوبة) وأيام فاتت للاتجاهات =====
  const day = (who, date, status, extra = {}) => ({ employeeId: E[who].id, branchId: E[who].branchId, date, status, shiftName: 'وردية الصبح', shiftStart: '08:00', shiftEnd: '16:00',
    scheduleSource: 'default', workMinutes: 0, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, ...extra })
  await repo('AttendanceDay').save([
    day('j1', today, 'present', { checkIn: '08:01' }), day('j2', today, 'late', { checkIn: '08:25', lateMinutes: 25 }),
    day('j3', today, 'absent'), day('j4', today, 'absent'), day('j5', today, 'absent'), day('j7', today, 'mission'),
    day('j10', today, 'early_leave', { checkIn: '08:00', checkOut: '13:00' }), day('j11', today, 'present', { checkIn: '07:58' }),
    day('r1', today, 'absent'), day('r2', today, 'present', { checkIn: '08:00' }), day('r3', today, 'absent'),
    day('j1', addDays(today, -1), 'present', { checkIn: '08:00' }), day('j1', addDays(today, -2), 'present', { checkIn: '08:00' }),
    day('j2', addDays(today, -1), 'late', { checkIn: '08:30', lateMinutes: 30 }), day('j3', addDays(today, -1), 'absent'),
  ])
  // j6 إجازة يوم كامل النهارده ولبعد بكرة، وj1 إجازة بعد 3 أيام، وr2 إجازة في الرياض
  const leave = (who, from, to, period = 'FULL') => ({ employeeId: E[who].id, leaveTypeCode: 'ANNUAL', fromDate: from, toDate: to, days: 1, period, isUnpaid: false, status: 'APPROVED' })
  await repo('Leave').save([leave('j6', today, addDays(today, 2)), leave('j1', addDays(today, 3), addDays(today, 4)), leave('r2', addDays(today, 1), addDays(today, 1))])
  // j8 ورديته آخر الليل: لسه مابصمش. j9 مستثنى من البصمة. j12 في مأمورية معتمدة النهارده (من غير صف)
  await repo('ScheduleDayOverride').save({ employeeId: E.j8.id, date: today, shiftName: 'وردية آخر الليل', startTime: '23:58', endTime: '23:59' })
  await repo('AttendanceExemption').save({ employeeId: E.j9.id, effectiveFrom: '2020-01-01', effectiveTo: '2099-12-31', reasonCode: 'field_role', reason: 'عمل ميداني لاختبار اللوحة',
    status: 'APPROVED', createdByUserId: U.admin.id, approvedByUserId: U.admin.id, approvedAt: new Date('2020-01-01T08:00:00Z'), requiresCheckinForPresence: false })
  await repo('Request').save({ typeCode: 'BUSINESS_TRIP', requesterId: E.j12.id, createdByUserId: U.admin.id, branchId: B.j.id, status: 'COMPLETED',
    payload: JSON.stringify({ fromDate: today, toDate: today }) })

  // ===== الطلبات: 3 معلّقة في جدة (واحد عدّى مهلته من 10 أيام)، واتنين معتمدين ومااتنفذوش، وواحد في الرياض =====
  await repo('RequestType').save({ code: 'DC_TEST', nameAr: 'طلب اختبار اللوحة', category: 'inquiries', destinationHandler: 'NONE' })
  const step = dueAt => JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, slaDays: 2, escalateTo: null, dueAt, actedAt: null, action: null }])
  const request = (branch, who, status, daysAgo, dueAt) => ({ typeCode: 'DC_TEST', requesterId: E[who].id, createdByUserId: U.admin.id, branchId: branch.id, status, currentStep: 1,
    payload: '{}', resolvedSteps: dueAt ? step(dueAt) : null, submittedAt: new Date(Date.now() - daysAgo * 86400000) })
  await repo('Request').save([
    request(B.j, 'j1', 'UNDER_REVIEW', 10, new Date(Date.now() - 8 * 86400000).toISOString()), request(B.j, 'j5', 'UNDER_REVIEW', 0, new Date(Date.now() + 2 * 86400000).toISOString()),
    request(B.j, 'j8', 'SUBMITTED', 2), request(B.j, 'j1', 'APPROVED', 5), request(B.j, 'j2', 'IN_EXECUTION', 6), request(B.j, 'j2', 'COMPLETED', 9),
    request(B.r, 'r1', 'UNDER_REVIEW', 12, new Date(Date.now() - 9 * 86400000).toISOString()),
  ])
  // ===== المهام: j1 عنده مفتوحتين (واحدة متأخرة)، ودور الموارد البشرية عنده واحدة متأخرة، ومهمة خلصت، ومهمة في الرياض =====
  const task = (branch, status, due, assignee) => ({ title: 'مهمة اختبار اللوحة', branchId: branch.id, createdByUserId: U.admin.id, status, priority: 'NORMAL', requiresProof: false, createdAt: new Date(), updatedAt: new Date(),
    dueDate: due, ...assignee })
  await repo('Task').save([
    task(B.j, 'OPEN', addDays(today, -1), { assigneeEmployeeId: E.j1.id }), task(B.j, 'IN_PROGRESS', addDays(today, 1), { assigneeEmployeeId: E.j1.id }),
    task(B.j, 'OPEN', addDays(today, -2), { assigneeRole: 'hr' }), task(B.j, 'DONE', addDays(today, -3), { assigneeEmployeeId: E.j5.id }),
    task(B.r, 'OPEN', addDays(today, -4), { assigneeEmployeeId: E.r1.id }),
  ])
  // ===== الإضافي في شهر الرواتب الجاري: المعتمد والمصروف بيتحسبوا، والمرفوض برّه، والمكتشف مستني تأكيد =====
  const overtime = (who, status, payableHours, amountSnapshot) => ({ employeeId: E[who].id, date: today, source: 'PRE_REQUESTED', hoursActual: payableHours, payableHours, status, amountSnapshot })
  await repo('OvertimeEntry').save([overtime('j1', 'APPROVED', 2.5, 100), overtime('j5', 'PAID', 1.5, 60), overtime('j10', 'REJECTED', 4, 999), overtime('j2', 'DETECTED', 1, null),
    overtime('r1', 'APPROVED', 1, 40)])
  // مستند (إقامة) هينتهي بعد 10 أيام
  await repo('EmployeeDocument').save({ employeeId: E.j1.id, docType: 'IQAMA', expiryDate: addDays(today, 10) })
}, { timeout: 240000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تحقق حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-dashboard-cards-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'تعذر تنظيف بيئة اختبار كروت اللوحة')
})

const ALL = ['attendance', 'absentLate', 'leaves', 'workforce', 'requests', 'tasks', 'overtime', 'payroll', 'trends']
const ROUTES = { attendance: '/attendance', absentLate: '/absent-late', leaves: '/leaves', workforce: '/workforce', requests: '/requests', tasks: '/tasks',
  overtime: '/overtime', payroll: '/payroll', trends: '/trends' }

test('DC-01: every card has its own permission on top of the dashboard permission, and the money card needs the payroll permission', async () => {
  const keys = async user => (await card(user, '')).cards.map(item => item.key)
  assert.deepEqual(await keys(U.admin), ALL)
  assert.deepEqual(await keys(U.hr), ALL.filter(key => key !== 'payroll'))
  assert.deepEqual(await keys(U.att), ['attendance', 'absentLate', 'overtime', 'trends'])
  assert.deepEqual(await keys(U.pay), ['attendance', 'absentLate', 'overtime', 'payroll', 'trends'])
  assert.deepEqual(await keys(U.bare), [])
  const access = await card(U.hr, '')
  assert.deepEqual({ today: access.today, money: access.money, contact: access.contact, documents: access.documents }, { today, money: false, contact: true, documents: false })
  assert.equal((await card(U.pay, '')).money, true); assert.equal((await card(U.att, '')).contact, false)
  // لوحة من غير صلاحية أي كارت: كل كارت مرفوض. ومن غير صلاحية اللوحة نفسها: الكل مرفوض حتى لو معاه صلاحية الشاشة
  for (const key of ALL) expect(await call(U.bare, `/dashboard/cards${ROUTES[key]}`), 403)
  expect(await call(U.bare, '/dashboard/cards/attendance/employees?bucket=absent'), 403)
  for (const route of ['', ...Object.values(ROUTES)]) expect(await call(U.plain, `/dashboard/cards${route}`), 403)
  // كل كارت بصلاحية شاشته: قارئ الحضور مايفتحش كروت غيره، ومدير HR مايفتحش كارت الرواتب
  for (const key of ['leaves', 'workforce', 'requests', 'tasks', 'payroll']) expect(await call(U.att, `/dashboard/cards${ROUTES[key]}`), 403)
  expect(await call(U.hr, '/dashboard/cards/payroll'), 403)
  for (const key of ALL.filter(item => item !== 'payroll')) expect(await call(U.hr, `/dashboard/cards${ROUTES[key]}`), 200)
  const unauthenticated = await fetch(`${base}/dashboard/cards/attendance`)
  assert.equal(unauthenticated.status, 401)
})

test('DC-02: a one-branch HR manager opens the dashboard, picks an administration, clicks "absent" in a team and sees the names — inside the branch only', async () => {
  const top = await card(U.hr, '/attendance')
  assert.deepEqual({ date: top.date, isToday: top.isToday, group: top.group, total: top.total }, { date: today, isToday: true, group: null, total: 12 })
  // حاضر: j1 وj10 (انصرف بدري) وj11. متأخر: j2. غايب: j3 j4 j5. إجازة: j6. مأمورية: j7 (صف) وj12 (طلب معتمد). مستثنى: j9
  const pendingKnown = minutesNow() < 23 * 60 + 50
  const fixed = { present: 3, late: 1, absent: 3, leave: 1, mission: 2, rest: 0, other: 1 }
  for (const [bucket, count] of Object.entries(fixed)) if (pendingKnown || bucket !== 'absent') assert.equal(top.counts[bucket], count, bucket)
  if (pendingKnown) assert.equal(top.counts.pending, 1, 'j8 ورديته لسه مابدأتش')
  assert.equal(Object.values(top.counts).reduce((sum, count) => sum + count, 0), top.total, 'كل موظف في خانة واحدة')
  // المستوى الأول: الإدارات و«من غير قسم» — ولا اسم من الرياض
  assert.deepEqual(top.rows.map(row => [row.name, row.level, row.total, row.expandable]),
    [['إدارة المبيعات', 'إدارة', 10, true], ['إدارة التشغيل', 'إدارة', 1, false], ['من غير قسم', '', 1, false]])
  assert.equal(JSON.stringify(top).includes('الرياض'), false)
  assert.equal(rowOf(top, 'إدارة المبيعات').counts.absent >= 3, true)
  // يختار الإدارة: أقسامها
  const sales = await card(U.hr, `/attendance?group=${rowOf(top, 'إدارة المبيعات').group}`)
  assert.deepEqual(sales.group, { group: `unit:${D.sales.id}`, name: 'إدارة المبيعات', level: 'إدارة' })
  assert.deepEqual(sales.rows.map(row => [row.name, row.level, row.total, row.expandable]), [['قسم التجزئة', 'قسم', 7, true], ['قسم الجملة', 'قسم', 3, false]])
  // يفتح القسم: فرقه و«من غير فريق»
  const retail = await card(U.hr, `/attendance?group=${rowOf(sales, 'قسم التجزئة').group}`)
  assert.deepEqual(retail.rows.map(row => [row.name, row.level, row.total, row.counts.absent]),
    [['فريق المعرض', 'فريق', 4, 2], ['فريق الأونلاين', 'فريق', 2, 1], ['قسم التجزئة — من غير فريق', '', 1, 0]])
  // يضغط على «غايب» في فريق المعرض: الأسماء باسم وفريق ووردية وأول بصمة وحالة — ومن غير رقم تليفون في القايمة دي
  const absent = await card(U.hr, `/attendance/employees?group=${rowOf(retail, 'فريق المعرض').group}&bucket=absent`)
  assert.deepEqual(names(absent.employees), [E.j3.fullName, E.j4.fullName].sort())
  assert.deepEqual(absent.employees.map(row => [row.team, row.unit, row.shift, row.firstPunch, row.status]),
    [['فريق المعرض', 'قسم التجزئة', 'وردية الصبح (08:00–16:00)', null, 'غايب'], ['فريق المعرض', 'قسم التجزئة', 'وردية الصبح (08:00–16:00)', null, 'غايب']])
  assert.equal(absent.employees.some(row => 'phone' in row), false)
  const late = await card(U.hr, `/attendance/employees?group=team:${T.showroom.id}&bucket=late`)
  assert.deepEqual(late.employees.map(row => [row.name, row.firstPunch, row.lateMinutes]), [[E.j2.fullName, '08:25', 25]])
  // فلتر اللوحة على الإدارة (الإدارة بأقسامها الفرعية): الكارت بيفتح على أقسامها مباشرة
  const filtered = await card(U.hr, `/attendance?departmentIds=${[D.sales.id, D.retail.id, D.wholesale.id].join(',')}`)
  assert.equal(filtered.total, 10); assert.equal(filtered.group.name, 'إدارة المبيعات')
  assert.deepEqual(filtered.rows.map(row => row.name), ['قسم التجزئة', 'قسم الجملة'])
  assert.equal((await card(U.hr, `/attendance?teamId=${T.online.id}`)).total, 2)
  // برّه فرعه: وحدة أو فريق من الرياض = غير موجود، وفرع الرياض مرفوض، وقسم الرياض في الفلتر = ولا حد
  expect(await call(U.hr, `/dashboard/cards/attendance?group=unit:${D.rdep.id}`), 404)
  expect(await call(U.hr, `/dashboard/cards/attendance/employees?group=team:${T.rteam.id}&bucket=absent`), 404)
  expect(await call(U.hr, `/dashboard/cards/attendance?branchId=${B.r.id}`), 403)
  const outside = await card(U.hr, `/attendance?departmentIds=${D.rdep.id}`)
  assert.deepEqual({ total: outside.total, rows: outside.rows }, { total: 0, rows: [] })
  assert.deepEqual((await card(U.hr, `/attendance/employees?teamId=${T.rteam.id}&bucket=absent`)).employees, [])
  // مدخلات غلط
  expect(await call(U.hr, '/dashboard/cards/attendance?group=unit:abc'), 400)
  expect(await call(U.hr, '/dashboard/cards/attendance/employees?bucket=everything'), 400)
  expect(await call(U.hr, `/dashboard/cards/attendance?date=${addDays(today, 1)}`), 400)
  expect(await call(U.hr, '/dashboard/cards/attendance?date=2026-02-31'), 400)
  // مدير النظام: الشركة كلها، وفرع الراحة في «راحة»
  const company = await card(U.admin, '/attendance')
  assert.equal(company.total, 16); assert.equal(company.counts.rest, 1)
  assert.deepEqual(names((await card(U.admin, '/attendance/employees?bucket=rest')).employees), [E.x1.fullName])
  assert.equal((await card(U.admin, `/attendance?branchId=${B.r.id}`)).total, 3)
  // يوم فات: صفوفه المحسوبة، ومن غير غياب لحظي
  const yesterday = await card(U.hr, `/attendance?date=${addDays(today, -1)}`)
  assert.deepEqual({ isToday: yesterday.isToday, present: yesterday.counts.present, late: yesterday.counts.late, absent: yesterday.counts.absent, pending: yesterday.counts.pending },
    { isToday: false, present: 1, late: 1, absent: 1, pending: 0 })
})

test('DC-03: absent and late by name grouped by team, and the phone only for whoever may see employees', async () => {
  const mine = await card(U.hr, '/absent-late')
  assert.equal(mine.late, 1); assert.equal(mine.contact, true)
  if (minutesNow() < 23 * 60 + 50) assert.equal(mine.absent, 3)
  const showroom = mine.teams.find(team => team.name === 'فريق المعرض'), online = mine.teams.find(team => team.name === 'فريق الأونلاين')
  assert.deepEqual([names(showroom.absent), names(showroom.late), names(online.absent)], [[E.j3.fullName, E.j4.fullName].sort(), [E.j2.fullName], [E.j5.fullName]])
  assert.equal(showroom.unit, 'قسم التجزئة')
  assert.equal(showroom.absent.find(row => row.name === E.j3.fullName).phone, E.j3.phone)
  assert.equal(JSON.stringify(mine).includes(E.r1.fullName), false, 'غايب الرياض مش في لوحة جدة')
  // قارئ حضور من غير صلاحية عرض الموظفين: نفس الأسماء من غير حقل التليفون أصلًا
  const noContact = await card(U.att, '/absent-late')
  assert.equal(noContact.contact, false)
  const rows = noContact.teams.flatMap(team => [...team.absent, ...team.late])
  assert.equal(rows.length >= 4, true); assert.equal(rows.some(row => 'phone' in row), false)
  assert.equal(JSON.stringify(noContact).includes('0500'), false)
  // الفلتر: فريق الأونلاين بس
  const one = await card(U.hr, `/absent-late?teamId=${T.online.id}`)
  assert.deepEqual(one.teams.map(team => [team.name, names(team.absent)]), [['فريق الأونلاين', [E.j5.fullName]]])
})

test('DC-04: no amount without the payroll permission — the field is absent, and the payroll card is refused', async () => {
  const hours = await card(U.hr, '/overtime')
  // j1 معتمد 2.5 + j5 مصروف 1.5 (المرفوض برّه، والمكتشف مستني تأكيد، والرياض برّه النطاق)
  assert.deepEqual({ hours: hours.hours, entries: hours.entries, pendingEntries: hours.pendingEntries }, { hours: 4, entries: 2, pendingEntries: 1 })
  assert.deepEqual(hours.byUnit, [{ id: D.retail.id, name: 'قسم التجزئة', hours: 4, entries: 2 }])
  assert.equal('amounts' in hours, false); assert.doesNotMatch(JSON.stringify(hours), /amount/i)
  const paid = await card(U.pay, '/overtime')
  assert.deepEqual(paid.amounts, [{ currency: 'EGP', amount: 160 }])
  assert.deepEqual(paid.byUnit, [{ id: D.retail.id, name: 'قسم التجزئة', hours: 4, entries: 2, amounts: [{ currency: 'EGP', amount: 160 }] }])
  // نفس رقم مؤشر «ساعات الإضافي» في قاموس المؤشرات لنفس الفلتر والشهر
  const metric = (report, key) => report.metrics.find(item => item.key === key)
  for (const [user, query] of [[U.hr, ''], [U.admin, ''], [U.admin, `?branchId=${B.r.id}`], [U.hr, `?departmentIds=${D.retail.id}`]]) {
    const cardBody = await card(user, `/overtime${query}`), report = expect(await call(user, `/reports/metrics${query}`), 200)
    assert.equal(cardBody.hours, metric(report, 'overtime').value, `overtime ${user.email} ${query}`)
    assert.deepEqual([cardBody.period, cardBody.from, cardBody.to], [report.period, report.from, report.to])
  }
  assert.equal((await card(U.admin, '/overtime')).hours, 5)
  // كارت الرواتب: لصاحب الصلاحية بس
  expect(await call(U.hr, '/dashboard/cards/payroll'), 403); expect(await call(U.att, '/dashboard/cards/payroll'), 403)
  const payroll = await card(U.pay, '/payroll')
  assert.match(payroll.period, /^\d{4}-\d{2}$/); assert.ok(Array.isArray(payroll.runs)); assert.ok(Array.isArray(payroll.alerts))
  assert.equal(payroll.accrued.available, true)
  // موظفو المعاينة = النشطين في فرعه بس (12 حالي في جدة)
  assert.equal(payroll.accrued.employees, 12)
  assert.equal((await card(U.pay, `/payroll?teamId=${T.showroom.id}`)).accrued.employees, 4)
})

test('DC-05: a closed module removes its card, and its endpoint answers like a missing route', async () => {
  const admin = claims(U.admin)
  await modules.setModule(admin, 'leave', { enabled: false })
  try {
    assert.equal((await card(U.hr, '')).cards.some(item => item.key === 'leaves'), false)
    const closed = await call(U.hr, '/dashboard/cards/leaves')
    assert.equal(closed.status, 404); assert.match(closed.body.message, /^Cannot GET \/api\/dashboard\/cards\/leaves/)
    expect(await call(U.hr, '/dashboard/cards/attendance'), 200)
  } finally { await modules.setModule(admin, 'leave', { enabled: true }) }
  await modules.setModule(admin, 'overtime', { enabled: false })
  try {
    assert.equal((await card(U.admin, '')).cards.some(item => item.key === 'overtime'), false)
    expect(await call(U.admin, '/dashboard/cards/overtime'), 404)
  } finally { await modules.setModule(admin, 'overtime', { enabled: true }) }
  // الرواتب مقفولة: الكارت مش موجود، ومبلغ الإضافي مش في الرد حتى لصاحب الصلاحية
  await modules.setModule(admin, 'loans', { enabled: false }); await modules.setModule(admin, 'payroll', { enabled: false })
  try {
    const access = await card(U.pay, '')
    assert.equal(access.money, false); assert.equal(access.cards.some(item => item.key === 'payroll'), false)
    expect(await call(U.pay, '/dashboard/cards/payroll'), 404)
    assert.equal('amounts' in (await card(U.pay, '/overtime')), false)
  } finally { await modules.setModule(admin, 'payroll', { enabled: true }); await modules.setModule(admin, 'loans', { enabled: true }) }
  assert.deepEqual((await card(U.admin, '')).cards.map(item => item.key), ALL)
})

test('DC-06: the workforce numbers are the metrics dictionary numbers, and the expiring lists stay inside the scope and the permission', async () => {
  const metric = (report, key) => report.metrics.find(item => item.key === key)
  for (const [user, query, headcount] of [[U.hr, '', 12], [U.admin, '', 16], [U.admin, `?branchId=${B.r.id}`, 3], [U.hr, `?departmentIds=${D.wholesale.id}`, 3]]) {
    const body = await card(user, `/workforce${query}`), report = expect(await call(user, `/reports/metrics${query}`), 200)
    const head = expect(await call(user, `/reports/headcount${query}`), 200)
    assert.equal(body.headcount, headcount, `headcount ${user.email} ${query}`)
    assert.equal(body.headcount, metric(report, 'headcount').value); assert.equal(body.active, metric(report, 'active_employees').value)
    assert.deepEqual({ headcount: body.headcount, active: body.active }, head.summary)
    assert.equal(body.leavers, metric(report, 'turnover').parts.leavers, 'الخارجين = تعريف الدوران في القاموس')
    assert.equal(body.total, body.headcount, 'توزيع الكارت على نفس العدد')
  }
  const mine = await card(U.hr, '/workforce')
  assert.deepEqual(mine.rows.map(row => [row.name, row.total]), [['إدارة المبيعات', 10], ['إدارة التشغيل', 1], ['من غير قسم', 1]])
  assert.deepEqual({ joiners: mine.joiners.count, leavers: mine.leavers, onProbation: mine.onProbation, probation: mine.probationEnding.count,
    contracts: mine.contractsEnding.count, expired: mine.contractsEnding.expired }, { joiners: 1, leavers: 1, onProbation: 1, probation: 1, contracts: 1, expired: 1 })
  assert.deepEqual(mine.joiners.list.map(row => row.name), [E.j11.fullName])
  assert.deepEqual(mine.probationEnding.list.map(row => [row.name, row.date, row.daysLeft]), [[E.j10.fullName, addDays(today, 5), 5]])
  assert.deepEqual(mine.contractsEnding.list.map(row => [row.name, row.daysLeft]), [[E.j9.fullName, 20]])
  // المستندات لصاحب صلاحية إدارة المستندات بس: مدير HR هنا من غيرها، فالحقل مش موجود
  assert.equal('documentsEnding' in mine, false)
  const all = await card(U.admin, '/workforce')
  assert.deepEqual({ count: all.documentsEnding.count, expired: all.documentsEnding.expired, list: all.documentsEnding.list.map(row => [row.name, row.type, row.daysLeft]) },
    { count: 1, expired: 0, list: [[E.j1.fullName, 'IQAMA', 10]] })
  assert.equal((await card(U.admin, `/workforce?branchId=${B.r.id}`)).documentsEnding.count, 0)
  // فتح مستوى: أقسام الإدارة بأعدادها، ووحدة فرع تاني غير موجودة
  const sales = await card(U.hr, `/workforce?group=unit:${D.sales.id}`)
  assert.deepEqual(sales.rows.map(row => [row.name, row.total]), [['قسم التجزئة', 7], ['قسم الجملة', 3]])
  expect(await call(U.hr, `/dashboard/cards/workforce?group=unit:${D.radm.id}`), 404)
})

test('DC-07: leaves, requests, tasks and trends count inside the scope and follow the dashboard filter', async () => {
  const leaves = await card(U.hr, '/leaves')
  assert.deepEqual(leaves.today, { onLeave: 1, halfDay: 0 })
  assert.equal(leaves.nextWeek.employees, 2)
  assert.deepEqual(leaves.nextWeek.list.map(row => [row.name, row.from, row.to]), [[E.j6.fullName, today, addDays(today, 2)], [E.j1.fullName, addDays(today, 3), addDays(today, 4)]])
  // j6: 3 أيام + j1: يومين، الاتنين في قسم التجزئة
  assert.deepEqual(leaves.topUnits, [{ id: D.retail.id, name: 'قسم التجزئة', days: 5, employees: 2 }])
  assert.equal((await card(U.admin, '/leaves')).nextWeek.employees, 3)
  assert.equal((await card(U.hr, `/leaves?teamId=${T.showroom.id}`)).nextWeek.employees, 1)

  const requests = await card(U.hr, '/requests')
  assert.deepEqual({ pending: requests.pending, overdue: requests.overdue, approvedNotExecuted: requests.approvedNotExecuted, oldestDays: requests.oldestDays },
    { pending: 3, overdue: 1, approvedNotExecuted: 2, oldestDays: 10 })
  assert.deepEqual(requests.byType, [{ code: 'DC_TEST', name: 'طلب اختبار اللوحة', count: 3, overdue: 1 }])
  assert.deepEqual(requests.byAge.map(band => [band.key, band.count]), [['today', 1], ['d1_3', 1], ['d4_7', 0], ['older', 1]])
  assert.deepEqual([(await card(U.admin, '/requests')).pending, (await card(U.admin, '/requests')).overdue], [4, 2])
  // الفلتر بمكان صاحب الطلب: طلب j5 بس في فريق الأونلاين
  assert.equal((await card(U.hr, `/requests?teamId=${T.online.id}`)).pending, 1)

  const tasks = await card(U.hr, '/tasks')
  assert.deepEqual({ available: tasks.available, open: tasks.open, overdue: tasks.overdue }, { available: true, open: 3, overdue: 2 })
  assert.deepEqual(tasks.assignees.map(row => [row.name, row.open, row.overdue]).sort(), [[E.j1.fullName, 2, 1], ['الموارد البشرية', 1, 1]].sort())
  assert.equal((await card(U.admin, '/tasks')).open, 4)
  // فلتر الفريق بمكان المسؤول: مهام j1 بس (مهمة الدور مالهاش مكان)
  assert.deepEqual((await card(U.hr, `/tasks?teamId=${T.showroom.id}`)).assignees.map(row => [row.name, row.open]), [[E.j1.fullName, 2]])

  const trends = await card(U.hr, '/trends')
  assert.deepEqual({ from: trends.from, to: trends.to, days: trends.days.length }, { from: addDays(today, -29), to: today, days: 30 })
  // المطلوب: النهارده 7 (3 حاضر + متأخر + 3 غايب)، امبارح 3، أول امبارح 1 = 11. الغياب 4، التأخير 2، الحضور 7
  assert.deepEqual(trends.summary, { required: 11, attendance: 63.64, late: 18.18, absence: 36.36, tone: 'red' })
  assert.deepEqual(trends.days.at(-1), { date: today, required: 7, attendance: 57.14, late: 14.29, absence: 42.86 })
  assert.deepEqual(trends.days.at(-2), { date: addDays(today, -1), required: 3, attendance: 66.67, late: 33.33, absence: 33.33 })
  assert.deepEqual(trends.days[0], { date: addDays(today, -29), required: 0, attendance: null, late: null, absence: null })
  assert.deepEqual(trends.units.map(unit => [unit.name, unit.required]), [['إدارة المبيعات', 9], ['إدارة التشغيل', 1], ['من غير قسم', 1]])
  // بالقسم: تحت الإدارة
  const sales = await card(U.hr, `/trends?group=unit:${D.sales.id}`)
  assert.deepEqual(sales.units.map(unit => [unit.name, unit.required]), [['قسم التجزئة', 9]])
  assert.equal((await card(U.admin, '/trends')).summary.required, 14)
  expect(await call(U.hr, `/dashboard/cards/trends?group=unit:${D.rdep.id}`), 404)
})

test('DC-08: the dashboard opens within the 3-second target for 600 employees', async t => {
  // فرع لوحده بـ600 موظف (إدارتين × 3 أقسام × 5 فرق). القياس الأول يوم شغل عادي: 540 بصفوف حضور و60 من غير صف (بيعدّوا على محرك الحضور:
  // غياب لحظي أو لسه مابصمش حسب الساعة). القياس التاني الأصعب: نص الفرع من غير صف.
  const branch = await repo('Branch').save({ code: 'DCP', name: 'فرع القياس', country: 'EG', weekendDays: workingWeekend })
  const admins = await repo('Department').save([0, 1].map(i => ({ branchId: branch.id, name: `إدارة قياس ${i + 1}`, unitType: 'ADMINISTRATION' })))
  const departments = await repo('Department').save(Array.from({ length: 6 }, (_, i) => ({ branchId: branch.id, name: `قسم قياس ${i + 1}`, unitType: 'DEPARTMENT', parentId: admins[i % 2].id })))
  const teams = await repo('Team').save(departments.flatMap(department => Array.from({ length: 5 }, (_, i) => ({ departmentId: department.id, name: `فريق ${department.id}-${i + 1}` }))))
  const people = []
  for (let offset = 0; offset < 600; offset += 100) {
    people.push(...await repo('Employee').save(Array.from({ length: 100 }, (_, i) => {
      const index = offset + i, team = teams[index % teams.length]
      return { employeeCode: `DP${String(index).padStart(4, '0')}`, fullName: `موظف قياس ${String(index).padStart(4, '0')}`, branchId: branch.id, departmentId: team.departmentId, teamId: team.id,
        status: 'active', isActive: true, joinDate: '2024-01-01', phone: '0550000000', basicSalary: 6000 }
    })))
  }
  for (let offset = 0; offset < 540; offset += 90) {
    await repo('AttendanceDay').save(people.slice(offset, offset + 90).map((person, i) => ({ employeeId: person.id, branchId: branch.id, date: today, status: i % 4 === 0 ? 'late' : 'present',
      checkIn: i % 4 === 0 ? '08:20' : '08:00', shiftName: 'وردية الصبح', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'default', workMinutes: 0,
      lateMinutes: i % 4 === 0 ? 20 : 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })))
  }
  const permissions = JSON.stringify(['dashboard.view_all', 'attendance.view_all', 'employees.view', 'leaves.view_all', 'requests.view_all', 'tasks.view_all', 'reports.view', 'payroll.view', 'documents.manage'])
  const perf = await repo('User').save({ email: 'perf@dashboard-cards.invalid', displayName: 'حساب القياس', passwordHash: 'test-only', role: 'employee', isActive: true, branchId: branch.id, permissions })
  // فتح اللوحة زي الصفحة بالظبط: نداء الكروت المتاحة، ثم كل الكروت مع بعض — من غير أي حساب محفوظ للنطاق ده
  const open = async user => {
    const timings = {}, started = Date.now()
    const access = await card(user, '')
    assert.deepEqual(access.cards.map(item => item.key), ALL)
    const bodies = await Promise.all(ALL.map(async key => {
      const at = Date.now()
      const body = await card(user, ROUTES[key])
      timings[key] = Date.now() - at
      return [key, body]
    }))
    return { total: Date.now() - started, timings, cards: Object.fromEntries(bodies) }
  }
  const first = await open(perf)
  assert.equal(first.cards.attendance.total, 600); assert.equal(first.cards.workforce.headcount, 600)
  assert.equal(first.cards.attendance.counts.present + first.cards.attendance.counts.late, 540)
  assert.equal(first.cards.attendance.counts.absent + first.cards.attendance.counts.pending, 60, 'اللي من غير صف: غياب لحظي أو لسه مابصمش حسب الساعة')
  assert.deepEqual(first.cards.attendance.rows.map(row => row.total), [300, 300])
  // تاني فتح (الحسابات المشتركة لسه محفوظة) وفتح مستوى وقايمة أسماء
  const again = Date.now()
  await Promise.all(ALL.map(key => card(perf, ROUTES[key])))
  const warm = Date.now() - again
  const drill = Date.now()
  await card(perf, `/attendance?group=unit:${departments[0].id}`)
  const list = await card(perf, `/attendance/employees?group=team:${teams[0].id}&bucket=present`)
  const drillMs = Date.now() - drill
  assert.equal(list.employees.length > 0, true)
  t.diagnostic(`600 employees, 60 without a row — first open ${first.total} ms (cards in parallel: ${JSON.stringify(first.timings)}), second open ${warm} ms, drill-down + names ${drillMs} ms`)
  assert.ok(first.total < 3000, `فتح اللوحة لـ600 موظف أخد ${first.total} ms (الهدف أقل من 3000)`)

  // الأصعب: 300 من غير صف (قبل ميعاد الوردية، أو يوم غياب جماعي) — بحساب نطاقه فرعين عشان مايقراش المحفوظ
  await repo('AttendanceDay').delete({ employeeId: require('../node_modules/typeorm').In(people.slice(300, 540).map(person => person.id)), date: today })
  const wide = await repo('User').save({ email: 'perf-wide@dashboard-cards.invalid', displayName: 'حساب القياس على فرعين', passwordHash: 'test-only', role: 'employee', isActive: true,
    branchId: branch.id, scopeBranchIds: JSON.stringify([branch.id, B.x.id]), permissions })
  const hard = await open(wide)
  assert.equal(hard.cards.attendance.total, 601)
  assert.equal(hard.cards.attendance.counts.absent + hard.cards.attendance.counts.pending, 300)
  assert.equal(hard.cards.attendance.counts.rest, 1)
  const engineAt = Date.now()
  const engineRows = (await app.get(require('../src/attendance/attendance.service').AttendanceService).liveAbsences(today, [branch.id, B.x.id])).length
  const engineMs = Date.now() - engineAt
  const pendingList = Date.now()
  const pending = await card(wide, `/attendance/employees?group=team:${teams[0].id}&bucket=${hard.cards.attendance.counts.pending ? 'pending' : 'absent'}`)
  assert.equal(pending.employees.every(row => row.shift === 'الجدول الافتراضي (08:00–16:00)'), true, JSON.stringify(pending.employees[0]))
  t.diagnostic(`600 employees, 300 without a row — first open ${hard.total} ms (cards in parallel: ${JSON.stringify(hard.timings)}); the attendance engine's own live-absence pass for the same scope: ${engineMs} ms (${engineRows} rows); names of one team with shifts ${Date.now() - pendingList} ms`)
})
