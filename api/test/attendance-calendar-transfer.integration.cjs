'use strict'
// النقل والتقويم المؤرخ عبر SQL وHTTP الفعليين داخل قاعدة مؤقتة فقط.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql'), env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_calendar_transfer_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-calendar-transfer-files-'))
const secret = crypto.randomBytes(48).toString('hex'), jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const { AttendanceService, localDateOf } = require('../src/attendance/attendance.service')
const { resolveEmployeeCalendarDay } = require('../src/attendance/attendance-calendar-resolver')
const { readCalendarSource } = require('../src/attendance/attendance-calendar-history')
const today = localDateOf(new Date())
const dateAfter = (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
const baseline = dateAfter(today, -3), yesterday = dateAfter(today, -1), tomorrow = dateAfter(today, 1)
let app, ds, master, base, branchA, branchB, teamA, teamB, admin, hr, outsider, created = false, sequence = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body, suppliedToken) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${suppliedToken ?? token(user)}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expect = (response, status = 201) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function calendarCommand(scope, sourceId, date = baseline) {
  const context = expect(await request(admin, 'GET', `/attendance/calendar-context?scope=${scope}&sourceId=${sourceId}`), 200)
  return { effectiveFrom: date, reason: 'تأكيد التقويم من قرار تاريخي للاختبار', expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash }
}
async function confirm(scope, sourceId, date = baseline) {
  return expect(await request(admin, 'POST', '/attendance/calendar-context/confirm', { scope, sourceId, calendarChange: await calendarCommand(scope, sourceId, date) }))
}
async function employee() {
  const emp = await repo('Employee').save({ employeeCode: `CALTR${++sequence}`, fullName: 'موظف اختبار نقل مؤرخ', branchId: branchA.id,
    departmentId: teamA.departmentId, teamId: teamA.id, joinDate: '2020-01-01', status: 'active', isActive: true,
    basicSalary: '6000.00', housingAllowance: '100.00', transportAllowance: '50.00', phoneAllowance: '20.00', workNatureAllowance: '10.00', otherAllowance: '0.00', currency: 'EGP' })
  const user = await repo('User').save({ email: `employee${sequence}@calendar-transfer.invalid`, displayName: 'موظف النقل', passwordHash: 'test-only',
    role: 'employee', employeeId: emp.id, branchId: branchA.id, permissions: '[]' })
  await confirm('EMPLOYEE', emp.id)
  expect(await request(admin, 'PATCH', `/employees/${emp.id}`, { workScheduleId: null, flexOverrideMode: 'INHERIT',
    attendanceEffectiveFrom: baseline, attendanceChangeReason: 'تأكيد الإسناد الحالي في التاريخ الموثق' }), 200)
  return { emp, user }
}
async function submit(emp, effectiveDate = today, typeCode = 'TRANSFER', user = admin) {
  return expect(await request(user, 'POST', '/requests', { typeCode, onBehalfEmployeeId: emp.id, submit: true, payload: { toTeamId: teamB.id, effectiveDate } }))
}
const act = (req, user = hr) => request(user, 'POST', `/requests/${req.id}/act`, { action: 'APPROVE' })
const org = emp => ds.transaction(em => readCalendarSource(em, 'EMPLOYEE', emp.id))
const resolve = (emp, date) => ds.transaction(em => resolveEmployeeCalendarDay(em, emp.id, date, { strict: true }))
async function withDate(date, run) {
  const RealDate = global.Date, now = Date.parse(`${date}T12:00:00Z`)
  global.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
  try { return await run() } finally { global.Date = RealDate }
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_calendar_transfer_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ name: 'فرع مصر للاختبار', code: 'CALTR_A', country: 'EG', weekendDays: 'FRI' })
  branchB = await repo('Branch').save({ name: 'فرع السعودية للاختبار', code: 'CALTR_B', country: 'SA', weekendDays: 'SAT' })
  const departmentA = await repo('Department').save({ name: 'قسم مصر', branchId: branchA.id })
  const departmentB = await repo('Department').save({ name: 'قسم السعودية', branchId: branchB.id })
  teamA = await repo('Team').save({ name: 'الفريق السابق', departmentId: departmentA.id })
  teamB = await repo('Team').save({ name: 'الفريق الجديد', departmentId: departmentB.id })
  const user = (name, role, branchId, permissions) => repo('User').save({ email: `${name}@calendar-transfer.invalid`, displayName: name, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin', null, ['*']); hr = await user('hr', 'hr_manager', branchA.id, ['approve.hr', 'requests.create_on_behalf'])
  outsider = await user('outsider', 'hr_manager', branchB.id, ['approve.hr', 'requests.create_on_behalf'])
  const chain = await repo('ApprovalChain').save({ code: 'CALENDAR_TRANSFER', nameAr: 'اعتماد نقل اختباري', requestTypeCode: 'TRANSFER' })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'TRANSFER', nameAr: 'نقل موظف', category: 'employment_status', destinationHandler: 'transfers_effective_date', approvalChainId: chain.id, requiredFields: '["toTeamId","effectiveDate"]' })
  const automatic = await repo('ApprovalChain').save({ code: 'CALENDAR_TRANSFER_AUTO', nameAr: 'تنفيذ نقل تلقائي اختباري', requestTypeCode: 'TRANSFER_AUTO_TEST', autoApprove: true })
  await repo('RequestType').save({ code: 'TRANSFER_AUTO_TEST', nameAr: 'نقل تلقائي للاختبار', category: 'employment_status', destinationHandler: 'transfers_effective_date', approvalChainId: automatic.id, requiredFields: '["toTeamId","effectiveDate"]' })
  await repo('RequestsConfig').save({ key: 'attendance.weekend_days', value: 'FRI' })
  await repo('PublicHoliday').save({ name: 'عطلة مصر الماضية للاختبار', date: yesterday, country: 'EG' })
  await confirm('GLOBAL', 0); await confirm('BRANCH', branchA.id); await confirm('BRANCH', branchB.id)
  expect(await request(admin, 'POST', '/catalogs/work-schedules', { name: 'جدول الساعات الافتراضي للاختبار', startTime: '08:00', endTime: '16:00',
    weekendDays: 'FRI,SAT', isDefault: true, isActive: true, flexEnabled: false, requiredWorkMinutes: 480, effectiveFrom: baseline, changeReason: 'تأكيد ساعات الاختبار' }))
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_calendar_transfer_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('db', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name=@db')).recordset.length, 0)
      t.diagnostic(`تم التحقق من حذف قاعدة الاختبار: ${database}`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-calendar-transfer-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('تم التحقق من حذف مرفقات الاختبار المؤقتة.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'فشل تنظيف اختبار النقل والتقويم')
})

test('approved transfer stores dated branch and actual approver while past computeDay retains the historical branch', async () => {
  const { emp, user } = await employee(), oldToken = token(user), before = await org(emp)
  const oldCalendar = await resolve(emp, yesterday); assert.equal(oldCalendar.dayKind, 'HOLIDAY'); assert.equal(oldCalendar.branchId, branchA.id)
  const req = await submit(emp); const result = expect(await act(req)); assert.equal(result.status, 'COMPLETED')
  const changed = await repo('Employee').findOneByOrFail({ id: emp.id }); assert.equal(changed.branchId, branchB.id); assert.equal(changed.teamId, teamB.id)
  const saved = await org(emp); assert.equal(saved.revision, before.revision + 1); assert.equal(saved.versions.at(-1).effectiveFrom, today)
  assert.equal(saved.versions.at(-1).snapshot.branchId, branchB.id)
  const actor = await repo('AttendanceRuleVersion').findOneByOrFail({ id: saved.versions.at(-1).id }); assert.equal(actor.actorUserId, hr.id)
  const historical = await resolve(emp, yesterday); assert.equal(historical.branchId, branchA.id); assert.equal(historical.dayKind, 'HOLIDAY')
  const calculated = await app.get(AttendanceService).computeDay(emp.id, yesterday)
  assert.equal(calculated.branchId, branchA.id); assert.equal(calculated.status, 'holiday')
  assert.equal((await repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date: yesterday })).branchId, branchA.id)
  const account = await repo('User').findOneByOrFail({ id: user.id }); assert.equal(account.branchId, branchB.id); assert.equal(account.tokenVersion, 1)
  assert.equal((await request(user, 'GET', '/requests/types', undefined, oldToken)).status, 401)
})

test('future transfer changes no employee or org version before its date and concurrent scheduler runs apply it once', async () => {
  const { emp, user } = await employee(), before = await org(emp), req = await submit(emp, tomorrow)
  assert.equal(expect(await act(req)).status, 'IN_EXECUTION')
  assert.equal((await org(emp)).revision, before.revision); assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).branchId, branchA.id)
  const early = expect(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})); assert.equal(early.executed, 0)
  await withDate(tomorrow, async () => {
    const responses = await Promise.all([request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {}), request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})])
    assert.equal(responses.map(row => expect(row).executed).reduce((a, b) => a + b, 0), 1)
  })
  const saved = await org(emp); assert.equal(saved.revision, before.revision + 1); assert.equal(saved.versions.at(-1).effectiveFrom, tomorrow)
  assert.equal((await repo('AttendanceRuleVersion').findOneByOrFail({ id: saved.versions.at(-1).id })).actorUserId, hr.id)
  assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'COMPLETED')
  assert.equal(await repo('Transfer').count({ where: { requestId: req.id, status: 'EXECUTED' } }), 1)
  assert.equal((await repo('User').findOneByOrFail({ id: user.id })).tokenVersion, 1)
})

test('owner-configured automatic transfer records an explicit automatic decision used by scheduled org history', async () => {
  const { emp } = await employee(), req = await submit(emp, tomorrow, 'TRANSFER_AUTO_TEST')
  assert.equal(req.status, 'IN_EXECUTION')
  const approvals = await repo('RequestApproval').find({ where: { requestId: req.id }, order: { id: 'ASC' } })
  assert.equal(approvals.length, 1); assert.equal(approvals[0].step, 0); assert.equal(approvals[0].approverId, admin.id); assert.match(approvals[0].comment, /تلقائي/)
  await withDate(tomorrow, async () => { assert.equal(expect(await request(admin, 'POST', '/requests/engine/run-scheduled-transfers', {})).executed, 1) })
  const saved = await org(emp), row = await repo('AttendanceRuleVersion').findOneByOrFail({ id: saved.versions.at(-1).id })
  assert.equal(row.actorUserId, admin.id); assert.equal(row.effectiveFrom, tomorrow)
})

test('a financially closed day rolls back transfer, employee, account and approval together', async () => {
  for (const status of ['APPROVED', 'PAID']) {
    const { emp, user } = await employee(), before = await org(emp), req = await submit(emp)
    const run = await repo('PayrollRun').save({ period: today.slice(0, 7), startDate: today, endDate: today, status })
    await repo('PayrollRunMember').save({ runId: run.id, employeeId: emp.id, membershipStatus: 'INCLUDED' })
    const response = await act(req); assert.equal(response.status, 409, JSON.stringify(response.body))
    assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).branchId, branchA.id)
    assert.equal((await repo('User').findOneByOrFail({ id: user.id })).tokenVersion, 0)
    assert.deepEqual(await org(emp), before)
    assert.equal((await repo('Request').findOneByOrFail({ id: req.id })).status, 'UNDER_REVIEW')
    assert.equal(await repo('Transfer').count({ where: { requestId: req.id } }), 0)
    assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id } }), 0)
    assert.equal(await repo('EmployeeStatusHistory').count({ where: { requestId: req.id } }), 0)
    await repo('PayrollRunMember').delete({ runId: run.id }); await repo('PayrollRun').delete({ id: run.id })
  }
})

test('cross-branch creator and approver cannot bypass scope to move the employee or append org history', async () => {
  const { emp } = await employee(), before = await org(emp)
  const unauthorizedCreate = await request(hr, 'POST', '/requests', { typeCode: 'TRANSFER', onBehalfEmployeeId: emp.id, submit: true, payload: { toTeamId: teamB.id, effectiveDate: today } })
  assert.equal(unauthorizedCreate.status, 403, JSON.stringify(unauthorizedCreate.body))
  const req = await submit(emp); assert.equal((await act(req, outsider)).status, 403)
  assert.deepEqual(await org(emp), before); assert.equal((await repo('Employee').findOneByOrFail({ id: emp.id })).branchId, branchA.id)
  assert.equal(await repo('RequestApproval').count({ where: { requestId: req.id } }), 0)
})
