// EX-09/13/16: approval workflow over real HTTP and an isolated random SQL database.
// Dates follow today's runtime cycle. No source/review database or fixed historical payroll is used.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const { loadAttendanceExemptions, exemptionOnDate } = require('../src/attendance/attendance-exemption-resolver')
const database = `hr_exemption_workflow_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-exemption-workflow-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const now = new Date()
const formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateOffset = days => formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12))
const today = dateOffset(0), tomorrow = dateOffset(1), later = dateOffset(2), beforeOpenPeriod = dateOffset(-62)
const explanation = 'سبب اختبار موثق وواضح يتجاوز عشرين حرفًا لاتخاذ القرار الإداري'
let app, master, ds, base, admin, branchA, branchB, hr, otherHr, creator, approver, executive, viewer, nobody
let created = false, employeeNumber = 0, userNumber = 0
const viewPerm = 'attendance_exemption.view', managePerm = 'attendance_exemption.manage'
const approvePerm = 'attendance_exemption.approve', executivePerm = 'attendance_exemption.approve_executive'
function assertDisposable() {
  assert.match(database, /^hr_exemption_workflow_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const route = id => `/attendance-exemptions/${id}`
async function user(permissions = [], branchId = branchA.id, extra = {}) {
  return repo('User').save({ email: `exemption-user-${++userNumber}@fixture.invalid`, displayName: `مستخدم اختبار ${userNumber}`,
    passwordHash: 'test-only', role: 'hr_manager', branchId, permissions: JSON.stringify(permissions), ...extra })
}
async function employee(extra = {}) {
  return repo('Employee').save({ employeeCode: `EXWF${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف اختبار اعتماد ${employeeNumber}`, branchId: branchA.id, joinDate: '2020-01-01',
    status: 'active', isActive: true, basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0, ...extra })
}
function input(emp, extra = {}) {
  return { employeeId: emp.id, effectiveFrom: today, reasonCode: 'field_role', reason: explanation, ...extra }
}
async function create(emp, extra = {}, actor = hr) {
  const response = await request(actor, 'POST', '/attendance-exemptions', input(emp, extra))
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function approve(row, actor = approver) {
  const response = await request(actor, 'POST', `${route(row.id)}/approve`, { reason: explanation })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function events(row, actor = hr) {
  const response = await request(actor, 'GET', `${route(row.id)}/events`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function evidence(row) {
  return { row: await repo('AttendanceExemption').findOneByOrFail({ id: row.id }), events: await events(row, admin) }
}
async function counts() {
  return { windows: await repo('AttendanceExemption').count(), events: await repo('AttendanceExemptionEvent').count() }
}
async function lockedPayroll(emp, status = 'APPROVED') {
  const run = await repo('PayrollRun').save({ name: 'مسير اختبار معتمد لحماية قرار الاستثناء', period: today.slice(0, 7),
    scopeType: 'BRANCH', branchId: emp.branchId, scopeIds: JSON.stringify([emp.branchId]), startDate: today, endDate: later,
    status, approvedBy: admin.id, approvedAt: new Date(), paidAt: status === 'PAID' ? new Date() : null, totalNet: 6000 })
  await repo('PayrollItem').save({ runId: run.id, employeeId: emp.id, basicSalary: 6000, allowances: 0, netPay: 6000, payMethod: 'cash' })
  return run
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'EXWF_A', name: 'فرع اختبار الاستثناء الأول' })
  branchB = await repo('Branch').save({ code: 'EXWF_B', name: 'فرع اختبار الاستثناء الآخر' })
  admin = await user([], null, { role: 'super_admin' })
  hr = await user([viewPerm, managePerm, approvePerm])
  otherHr = await user([viewPerm, managePerm, approvePerm], branchB.id)
  creator = await user([viewPerm, managePerm])
  approver = await user([viewPerm, approvePerm])
  executive = await user([viewPerm, executivePerm])
  viewer = await user([viewPerm])
  nobody = await user([])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.exemption_reason_min_length', value: '20' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' },
    { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      assert.equal((await master.request().input('database', sql.NVarChar, database).query('SELECT DB_ID(@database) AS id')).recordset[0].id, null)
      t.diagnostic(`Cleanup verified: ${database} was removed and DB_ID is NULL.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-exemption-workflow-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: temporary uploads were removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Exemption workflow fixture cleanup failed')
})

test('EX-09: creation requires authentication, explicit permission and the employee branch', async () => {
  const own = await employee(), outside = await employee({ branchId: branchB.id })
  const original = await counts()
  for (const [actor, emp, expected] of [[null, own, 401], [viewer, own, 403], [nobody, own, 403], [hr, outside, 403]]) {
    const denied = await request(actor, 'POST', '/attendance-exemptions', input(emp))
    assert.equal(denied.status, expected, JSON.stringify(denied.body))
  }
  assert.deepEqual(await counts(), original)
  const outsideWindow = await create(outside, {}, otherHr)
  assert.equal((await request(hr, 'GET', `/attendance-exemptions/employee/${outside.id}`)).status, 403)
  assert.equal((await request(hr, 'GET', `${route(outsideWindow.id)}/events`)).status, 403)
  assert.equal((await request(hr, 'POST', `${route(outsideWindow.id)}/approve`, { reason: explanation })).status, 403)
  assert.equal((await request(hr, 'POST', `${route(outsideWindow.id)}/cancel`, { reason: explanation })).status, 403)
  assert.equal((await request(nobody, 'GET', `/attendance-exemptions/employee/${own.id}`)).status, 403)
})

test('EX-09: the HTTP whitelist blocks mass assignment of approval, actor and termination fields; drafts stay inactive', async () => {
  const emp = await employee()
  const row = await create(emp, { status: 'APPROVED', createdByUserId: admin.id,
    approvedByUserId: admin.id, approvedAt: new Date().toISOString(), executiveApprovedByUserId: admin.id,
    executiveApprovedAt: new Date().toISOString(), terminatedFrom: tomorrow, terminatedByUserId: admin.id,
    terminationReason: explanation, overtimeEligibleOverride: true, unpaidLeaveDeductibleOverride: false }, creator)
  assert.equal(row.status, 'PENDING')
  assert.equal(row.createdByUserId, creator.id)
  for (const field of ['approvedByUserId', 'approvedAt', 'executiveApprovedByUserId', 'executiveApprovedAt', 'terminatedFrom', 'terminatedByUserId', 'terminationReason']) assert.equal(row[field], null, field)
  assert.equal(row.overtimeEligibleOverride, true)
  assert.equal(row.unpaidLeaveDeductibleOverride, false)
  assert.deepEqual(await loadAttendanceExemptions(ds.manager, emp.id, today, later), [])
  const history = await events(row)
  assert.equal(history.length, 1)
  assert.equal(history[0].eventType, 'CREATED')
  assert.equal(history[0].actorUserId, creator.id)
  assert.equal(history[0].payload.after.status, 'PENDING')
  assert.equal((await request(creator, 'POST', `${route(row.id)}/approve`, { reason: explanation })).status, 403)
})

test('EX-09: an ordinary window activates only after HR approval and mine exposes only that employee approved windows', async () => {
  const emp = await employee(), another = await employee()
  const self = await user([], branchA.id, { role: 'employee', employeeId: emp.id })
  const row = await create(emp)
  assert.deepEqual((await request(self, 'GET', '/attendance-exemptions/mine')).body, [])
  const accepted = await approve(row)
  assert.equal(accepted.status, 'APPROVED')
  assert.equal(accepted.approvedByUserId, approver.id)
  assert.ok(accepted.approvedAt)
  await approve(await create(another))
  const overlap = await request(creator, 'POST', '/attendance-exemptions', input(emp, { effectiveFrom: later, effectiveTo: later }))
  assert.equal(overlap.status, 409, JSON.stringify(overlap.body))
  const mine = await request(self, 'GET', '/attendance-exemptions/mine')
  assert.equal(mine.status, 200)
  assert.deepEqual(mine.body.map(window => window.id), [row.id])
  assert.ok(mine.body.every(window => window.employeeId === emp.id))
  assert.deepEqual((await request(nobody, 'GET', '/attendance-exemptions/mine')).body, [])
  assert.equal(exemptionOnDate(await loadAttendanceExemptions(ds.manager, emp.id, today, later), today).id, row.id)
  const original = await evidence(row)
  assert.equal((await request(approver, 'POST', `${route(row.id)}/approve`, { reason: explanation })).status, 400)
  assert.deepEqual(await evidence(row), original)
})

test('EX-16: executive exemption needs HR then a separately authorized executive step, with immutable intermediate history', async () => {
  const emp = await employee()
  const row = await create(emp, { reasonCode: 'executive' })
  const original = await evidence(row)
  assert.equal((await request(executive, 'POST', `${route(row.id)}/approve-executive`, { reason: explanation })).status, 400)
  assert.equal((await request(hr, 'POST', `${route(row.id)}/approve-executive`, { reason: explanation })).status, 403)
  assert.deepEqual(await evidence(row), original)
  const hrApproved = await approve(row)
  assert.equal(hrApproved.status, 'PENDING')
  assert.equal(hrApproved.approvedByUserId, approver.id)
  assert.equal(hrApproved.executiveApprovedByUserId, null)
  assert.deepEqual(await loadAttendanceExemptions(ds.manager, emp.id, today, later), [])
  const intermediate = await events(row)
  assert.deepEqual(intermediate.map(event => event.eventType), ['CREATED', 'HR_APPROVED'])
  assert.equal((await request(approver, 'POST', `${route(row.id)}/approve`, { reason: explanation })).status, 400)
  const completed = await request(executive, 'POST', `${route(row.id)}/approve-executive`, { reason: explanation })
  assert.equal(completed.status, 201, JSON.stringify(completed.body))
  assert.equal(completed.body.status, 'APPROVED')
  assert.equal(completed.body.executiveApprovedByUserId, executive.id)
  assert.equal(exemptionOnDate(await loadAttendanceExemptions(ds.manager, emp.id, today, later), today).id, row.id)
  const finalEvents = await events(row)
  assert.deepEqual(finalEvents.slice(0, intermediate.length), intermediate)
  assert.equal(finalEvents.at(-1).eventType, 'EXECUTIVE_APPROVED')
  assert.equal(finalEvents.at(-1).actorUserId, executive.id)
  assert.equal(finalEvents.at(-1).payload.before.status, 'PENDING')
  assert.equal(finalEvents.at(-1).payload.after.status, 'APPROVED')
})

test('EX-09: two overlapping pending approvals race to one approved window and one atomic 409', async () => {
  const emp = await employee()
  const first = await create(emp, { effectiveTo: later })
  const second = await create(emp, { effectiveFrom: tomorrow })
  const secondApprover = await user([viewPerm, approvePerm])
  const response = await Promise.all([
    request(approver, 'POST', `${route(first.id)}/approve`, { reason: explanation }),
    request(secondApprover, 'POST', `${route(second.id)}/approve`, { reason: explanation }),
  ])
  assert.deepEqual(response.map(result => result.status).sort(), [201, 409], JSON.stringify(response))
  const winner = response[0].status === 201 ? first : second
  const loser = winner.id === first.id ? second : first
  assert.equal((await repo('AttendanceExemption').findOneByOrFail({ id: winner.id })).status, 'APPROVED')
  const rejected = await repo('AttendanceExemption').findOneByOrFail({ id: loser.id })
  assert.equal(rejected.status, 'PENDING')
  assert.equal(rejected.approvedByUserId, null)
  assert.equal(rejected.approvedAt, null)
  assert.deepEqual((await events(loser)).map(event => event.eventType), ['CREATED'])
  assert.equal((await loadAttendanceExemptions(ds.manager, emp.id, tomorrow, tomorrow)).length, 1)
})

test('EX-13: termination preserves approved history through today and restores ordinary attendance from tomorrow', async () => {
  const emp = await employee()
  const row = await approve(await create(emp))
  const previous = await events(row)
  assert.equal((await request(creator, 'POST', `${route(row.id)}/terminate`, { effectiveFrom: tomorrow, reason: explanation })).status, 403)
  const terminated = await request(approver, 'POST', `${route(row.id)}/terminate`, { effectiveFrom: tomorrow, reason: explanation })
  assert.equal(terminated.status, 201, JSON.stringify(terminated.body))
  assert.equal(terminated.body.status, 'APPROVED')
  assert.equal(terminated.body.effectiveFrom, today)
  assert.equal(terminated.body.effectiveTo, null)
  assert.equal(terminated.body.terminatedFrom, tomorrow)
  assert.equal(terminated.body.terminatedByUserId, approver.id)
  const windows = await loadAttendanceExemptions(ds.manager, emp.id, today, later)
  assert.equal(exemptionOnDate(windows, today).id, row.id)
  assert.equal(exemptionOnDate(windows, tomorrow), null)
  assert.equal(exemptionOnDate(windows, later), null)
  const history = await events(row)
  assert.deepEqual(history.slice(0, previous.length), previous)
  assert.equal(history.at(-1).eventType, 'TERMINATED')
  assert.equal(history.at(-1).payload.before.terminatedFrom, null)
  assert.equal(history.at(-1).payload.after.terminatedFrom, tomorrow)
  const preserved = await evidence(row)
  assert.equal((await request(approver, 'POST', `${route(row.id)}/terminate`, { effectiveFrom: later, reason: explanation })).status, 400)
  assert.equal((await request(hr, 'POST', `${route(row.id)}/cancel`, { reason: explanation })).status, 400)
  assert.equal((await request(hr, 'DELETE', route(row.id))).status, 404)
  assert.deepEqual(await evidence(row), preserved)
  const replacement = await approve(await create(emp, { effectiveFrom: tomorrow }))
  assert.notEqual(replacement.id, row.id)
  assert.equal(exemptionOnDate(await loadAttendanceExemptions(ds.manager, emp.id, today, later), tomorrow).id, replacement.id)
})

test('EX-09/16: cancelling a pending decision retains its records and events and never activates the window', async () => {
  const emp = await employee()
  const row = await create(emp)
  const original = await events(row)
  assert.equal((await request(viewer, 'POST', `${route(row.id)}/cancel`, { reason: explanation })).status, 403)
  const cancelled = await request(creator, 'POST', `${route(row.id)}/cancel`, { reason: explanation })
  assert.equal(cancelled.status, 201, JSON.stringify(cancelled.body))
  assert.equal(cancelled.body.status, 'CANCELLED')
  assert.equal(await repo('AttendanceExemption').count({ where: { id: row.id } }), 1)
  assert.deepEqual(await loadAttendanceExemptions(ds.manager, emp.id, today, later), [])
  const history = await events(row)
  assert.deepEqual(history.slice(0, original.length), original)
  assert.equal(history.at(-1).eventType, 'CANCELLED')
  const preserved = await evidence(row)
  assert.equal((await request(approver, 'POST', `${route(row.id)}/approve`, { reason: explanation })).status, 400)
  assert.deepEqual(await evidence(row), preserved)
})

test('EX-13: approved or paid payroll blocks a new overlapping exemption without any partial window or audit record', async () => {
  for (const status of ['APPROVED', 'PAID']) {
    const emp = await employee()
    await lockedPayroll(emp, status)
    const original = await counts()
    const response = await request(hr, 'POST', '/attendance-exemptions', input(emp))
    assert.equal(response.status, 409, JSON.stringify(response.body))
    assert.deepEqual(await counts(), original)
  }
})

test('EX-13: a payroll approved after draft creation blocks exemption approval and termination atomically', async () => {
  const pendingEmployee = await employee()
  const pending = await create(pendingEmployee)
  await lockedPayroll(pendingEmployee)
  const pendingBefore = await evidence(pending)
  assert.equal((await request(approver, 'POST', `${route(pending.id)}/approve`, { reason: explanation })).status, 409)
  assert.deepEqual(await evidence(pending), pendingBefore)
  const activeEmployee = await employee()
  const active = await approve(await create(activeEmployee))
  await lockedPayroll(activeEmployee)
  const activeBefore = await evidence(active)
  assert.equal((await request(approver, 'POST', `${route(active.id)}/terminate`, { effectiveFrom: tomorrow, reason: explanation })).status, 409)
  assert.deepEqual(await evidence(active), activeBefore)
})

test('EX-13/16: invalid dates, earlier cycles, reversed ranges, reasons and override types leave no records', async () => {
  const emp = await employee()
  const original = await counts()
  const invalid = [
    { effectiveFrom: '2026-02-30' }, { effectiveFrom: `${today}T00:00:00Z` },
    { effectiveTo: '2026-09-31' }, { effectiveFrom: beforeOpenPeriod }, { effectiveFrom: tomorrow, effectiveTo: today },
    { reason: '' }, { reason: '   ' }, { reason: 'سبب قصير' }, { reason: 'x'.repeat(501) },
    { reasonCode: 'unknown' }, { overtimeEligibleOverride: 'false' }, { unpaidLeaveDeductibleOverride: 0 },
  ]
  for (const extra of invalid) {
    const response = await request(hr, 'POST', '/attendance-exemptions', input(emp, extra))
    assert.equal(response.status, 400, JSON.stringify({ extra, response }))
    assert.deepEqual(await counts(), original)
  }
  const futureEmployee = await employee({ joinDate: later })
  assert.equal((await request(hr, 'POST', '/attendance-exemptions', input(futureEmployee))).status, 400)
  assert.deepEqual(await counts(), original)
  const row = await create(emp)
  const preserved = await evidence(row)
  for (const operation of ['approve', 'cancel']) {
    assert.equal((await request(hr, 'POST', `${route(row.id)}/${operation}`, { reason: 'قصير' })).status, 400)
    assert.deepEqual(await evidence(row), preserved)
  }
})

async function calculateCurrentPeriod(emp, options = {}) {
  // The cycle ending in a month is labelled by that month, including after the 23rd.
  const period = formatDate(new Date(now.getFullYear(), now.getMonth() + (now.getDate() >= 23 ? 1 : 0), 1, 12)).slice(0, 7)
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: [emp.id], name: 'مسير اختبار اتساق قرار الاستثناء', ...options,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  assert.ok(response.body.startDate <= today && response.body.endDate >= today)
  return response.body
}

test('EX-13: a new exemption approved after calculation blocks stale payroll approval without claims/events until explicit recalculation', async () => {
  const emp = await employee()
  const run = await calculateCurrentPeriod(emp)
  const originalItems = await repo('PayrollItem').find({ where: { runId: run.id } })
  const originalEvents = await repo('PayrollRunEvent').find({ where: { runId: run.id }, order: { id: 'ASC' } })
  const approvedExemption = await approve(await create(emp))
  assert.equal(approvedExemption.status, 'APPROVED')
  const rejected = await request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.equal(rejected.body.code, 'PAYRUN-EXEMPTION-CHANGED')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')
  assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: run.id } }), 0)
  assert.deepEqual(await repo('PayrollItem').find({ where: { runId: run.id } }), originalItems)
  assert.deepEqual(await repo('PayrollRunEvent').find({ where: { runId: run.id }, order: { id: 'ASC' } }), originalEvents)
  const refreshed = await calculateCurrentPeriod(emp, { runId: run.id, reason: 'إعادة حساب صريحة بعد اعتماد قرار استثناء الحضور' })
  assert.equal(refreshed.snapshotVersion, run.snapshotVersion + 1)
  assert.ok(JSON.parse(refreshed.items[0].breakdown).attendanceExemptions.some(window => window.id === approvedExemption.id))
  const accepted = await request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
  assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: run.id } }), 1)
})

test('EX-13: termination after coverage and later organization defaults preserve a calculated payroll decision', async () => {
  const emp = await employee()
  const row = await approve(await create(emp))
  const run = await calculateCurrentPeriod(emp)
  const savedItems = structuredClone(run.items)
  const nextDay = new Date(`${run.endDate}T12:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const terminationDate = nextDay.toISOString().slice(0, 10)
  const terminated = await request(approver, 'POST', `${route(row.id)}/terminate`, { effectiveFrom: terminationDate, reason: explanation })
  assert.equal(terminated.status, 201, JSON.stringify(terminated.body))
  await repo('RequestsConfig').update({ key: 'payroll.exempt_overtime_eligible' }, { value: 'true' })
  await repo('RequestsConfig').update({ key: 'payroll.exempt_unpaid_leave_deductible' }, { value: 'false' })
  try {
    const accepted = await request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(accepted.status, 201, JSON.stringify(accepted.body))
    const detail = await request(admin, 'GET', `/payroll/runs/${run.id}`)
    assert.equal(detail.status, 200, JSON.stringify(detail.body))
    assert.deepEqual(detail.body.items, savedItems)
    const savedWindow = JSON.parse(detail.body.items[0].breakdown).attendanceExemptions.find(window => window.id === row.id)
    assert.equal(savedWindow.overtimeEligible, false)
    assert.equal(savedWindow.unpaidLeaveDeductible, true)
  } finally {
    await repo('RequestsConfig').update({ key: 'payroll.exempt_overtime_eligible' }, { value: 'false' })
    await repo('RequestsConfig').update({ key: 'payroll.exempt_unpaid_leave_deductible' }, { value: 'true' })
  }
})
