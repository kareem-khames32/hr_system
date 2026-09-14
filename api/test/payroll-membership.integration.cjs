// SPEC 1-4 / PR-05, PR-06, PR-11, PR-12: persisted membership, approval claims and audit history.
// The owner chose reservation at APPROVAL. Draft conflicts need explicit acknowledgement.
// All SQL writes and failure fixtures are confined to one randomly named disposable database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const { IsNull } = require('../node_modules/typeorm')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_members_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-members-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
let app, master, ds, base, admin, secondAdmin, branchA, branchB, managerA, managerB, limitedManager
let created = false, employeeNumber = 0, branchNumber = 0, runNumber = 0
const repo = name => ds.getRepository(name)
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
async function branch() {
  return repo('Branch').save({ code: `MEM_B${++branchNumber}`, name: `فرع عضوية اختبار ${branchNumber}` })
}
async function employee(overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `MEM${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف لقطة الاختبار ${employeeNumber}`, branchId: branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // Stable computed attendance removes unrelated absence policy from membership tests.
  const rows = []
  const from = emp.joinDate > startDate ? emp.joinDate : startDate
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${endDate}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10),
      status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار العضوية',
      shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
      lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  if (rows.length) await repo('AttendanceDay').save(rows)
  return emp
}
function definition(employees, extra = {}) {
  return { period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
    name: `اختبار عضوية مستقل ${++runNumber}`, ...extra }
}
async function calculate(employees, extra = {}, user = admin) {
  const response = await request(user, 'POST', '/payroll/runs/calculate-defined', definition(employees, extra))
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function detail(run, user = admin) {
  const response = await request(user, 'GET', `/payroll/runs/${run.id}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
async function events(run, user = admin) {
  const response = await request(user, 'GET', `/payroll/runs/${run.id}/events`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  assert.ok(Array.isArray(response.body))
  return response.body
}
function member(run, emp) {
  const row = run.members.find(row => row.employeeId === emp.id)
  assert.ok(row, `Missing stored membership for ${emp.employeeCode}`)
  return row
}
const activeClaims = employeeId => repo('PayrollPeriodClaim').find({ where: { employeeId, releasedAt: IsNull() }, order: { id: 'ASC' } })
async function payrollCounts() {
  const counts = {}
  for (const name of ['PayrollRun', 'PayrollRunMember', 'PayrollItem', 'PayrollPeriodClaim', 'PayrollRunEvent']) counts[name] = await repo(name).count()
  return counts
}
async function approve(run, user = admin) {
  const response = await request(user, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function competingDrafts(emp) {
  const first = await calculate([emp])
  const second = await calculate([emp], { allowDraftConflicts: true })
  assert.equal((await activeClaims(emp.id)).length, 0, 'Calculating drafts must not reserve the employee')
  return [first, second]
}
async function assertApprovalRace(first, second, emp) {
  const results = await Promise.all([
    request(admin, 'POST', `/payroll/runs/${first.id}/approve`),
    request(secondAdmin, 'POST', `/payroll/runs/${second.id}/approve`),
  ])
  assert.deepEqual(results.map(row => row.status).sort(), [201, 409], JSON.stringify(results))
  const winner = results[0].status === 201 ? first : second
  const loser = winner.id === first.id ? second : first
  assert.equal((await detail(winner)).status, 'APPROVED')
  assert.equal((await detail(loser)).status, 'CALCULATED')
  const claims = await activeClaims(emp.id)
  assert.equal(claims.length, 1)
  assert.equal(claims[0].runId, winner.id)
  assert.equal(claims[0].startDate, winner.startDate)
  assert.equal(claims[0].endDate, winner.endDate)
  assert.equal((await events(loser)).filter(row => row.eventType === 'APPROVED').length, 0)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_members_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
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
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await branch(); branchB = await branch()
  const user = (email, role, branchId = null, permissions = []) => repo('User').save({ email, displayName: email,
    passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin@payroll-members.invalid', 'super_admin')
  secondAdmin = await user('second@payroll-members.invalid', 'super_admin')
  const permissions = ['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen', 'payroll.cancel']
  managerA = await user('branch-a@payroll-members.invalid', 'hr_manager', branchA.id, permissions)
  managerB = await user('branch-b@payroll-members.invalid', 'hr_manager', branchB.id, permissions)
  limitedManager = await user('limited@payroll-members.invalid', 'hr_manager', branchA.id, ['payroll.view', 'payroll.calculate', 'payroll.approve'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_members_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-members-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Membership fixture cleanup failed')
})

test('PR-05: calculation persists included and automatically excluded members; only included members reserve on approval', async () => {
  const included = await employee({ fullName: 'الاسم المحفوظ وقت الحساب', basicSalary: 7000 })
  const excluded = await employee({ joinDate: '2026-07-23' })
  const run = await calculate([included, excluded])
  assert.equal(run.snapshotVersion, 1)
  assert.equal(member(run, included).membershipStatus, 'INCLUDED')
  assert.equal(member(run, included).snapshot.fullName, included.fullName)
  assert.equal(member(run, included).snapshot.employeeCode, included.employeeCode)
  assert.equal(member(run, included).snapshot.branchId, branchA.id)
  assert.equal(member(run, included).snapshot.basicSalary, 7000)
  assert.equal(member(run, excluded).membershipStatus, 'EXCLUDED')
  assert.ok(typeof member(run, excluded).exclusionReason === 'string' && member(run, excluded).exclusionReason.length > 0)
  assert.ok(!run.items.some(row => row.employeeId === excluded.id))
  assert.equal((await activeClaims(included.id)).length, 0)
  assert.equal((await activeClaims(excluded.id)).length, 0)
  await approve(run)
  assert.equal((await activeClaims(included.id)).length, 1)
  assert.equal((await activeClaims(excluded.id)).length, 0)
})

test('PR-05: GET and approval preserve saved name, salary and historical branch after the employee moves', async () => {
  const emp = await employee({ fullName: 'اسم قبل النقل', basicSalary: 6500 })
  const run = await calculate([emp], {}, managerA)
  const savedMembers = structuredClone(run.members)
  const savedItems = structuredClone(run.items)
  await repo('Employee').update(emp.id, { fullName: 'اسم جديد لا يغير اللقطة', employeeCode: 'MEM_CHANGED', basicSalary: 9900, branchId: branchB.id })
  const unchanged = await detail(run, managerA)
  assert.deepEqual(unchanged.members, savedMembers)
  assert.deepEqual(unchanged.items, savedItems)
  assert.equal(unchanged.snapshotVersion, 1)
  assert.ok([403, 404].includes((await request(managerB, 'GET', `/payroll/runs/${run.id}`)).status))
  await approve(run, managerA)
  const frozen = await detail(run, managerA)
  assert.deepEqual(frozen.members, savedMembers)
  assert.deepEqual(frozen.items, savedItems)
  const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp], { runId: run.id, reason: 'محاولة بعد الاعتماد' }))
  assert.ok([400, 409].includes(rejected.status), JSON.stringify(rejected.body))
  assert.deepEqual((await detail(run, managerA)).members, savedMembers)
  assert.equal((await activeClaims(emp.id))[0].runId, run.id)
  assert.equal((await request(managerA, 'GET', `/payroll/runs/${run.id}/events`)).status, 200)
  assert.ok([403, 404].includes((await request(managerB, 'GET', `/payroll/runs/${run.id}/events`)).status))
})

test('PR-05 / PR-12: recalculation requires a reason and records immutable before/after snapshots and their diff', async () => {
  const emp = await employee({ fullName: 'قبل إعادة الحساب', basicSalary: 6000 })
  const run = await calculate([emp])
  const originalEvents = await events(run)
  assert.equal(run.snapshotVersion, 1)
  await repo('Employee').update(emp.id, { fullName: 'بعد إعادة الحساب', basicSalary: 7200 })
  for (const reason of [undefined, '', '   ']) {
    const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp], { runId: run.id, reason }))
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body))
    assert.deepEqual((await detail(run)).members, run.members)
    assert.deepEqual(await events(run), originalEvents)
  }
  const reason = 'تصحيح راتب واسم الموظف قبل الاعتماد'
  const recalculated = await calculate([emp], { runId: run.id, reason })
  assert.equal(recalculated.snapshotVersion, 2)
  assert.equal(member(recalculated, emp).snapshot.fullName, 'بعد إعادة الحساب')
  assert.equal(member(recalculated, emp).snapshot.basicSalary, 7200)
  assert.equal(Number(recalculated.totalNet), 7200)
  const history = await events(run)
  assert.deepEqual(history.filter(row => originalEvents.some(old => old.id === row.id)), originalEvents)
  const event = history.find(row => row.eventType === 'RECALCULATED')
  assert.ok(event)
  assert.equal(event.actorUserId, admin.id)
  assert.equal(event.reason, reason)
  assert.equal(event.payload.before.snapshotVersion, 1)
  assert.equal(event.payload.after.snapshotVersion, 2)
  assert.equal(event.payload.before.members.find(row => row.employeeId === emp.id).snapshot.fullName, 'قبل إعادة الحساب')
  assert.equal(event.payload.after.members.find(row => row.employeeId === emp.id).snapshot.fullName, 'بعد إعادة الحساب')
  assert.equal(Number(event.payload.before.totalNet), 6000)
  assert.equal(Number(event.payload.after.totalNet), 7200)
  assert.deepEqual(event.payload.diff.addedEmployeeIds, [])
  assert.deepEqual(event.payload.diff.removedEmployeeIds, [])
  assert.deepEqual(event.payload.diff.changedEmployeeIds, [emp.id])
})

test('PR-05: dynamic membership refreshes only on explicit recalculation while CUSTOM remains its stored list', async () => {
  const localBranch = await branch()
  const first = await employee({ branchId: localBranch.id })
  const branchDefinition = { scopeType: 'BRANCH', branchId: localBranch.id, scopeIds: [localBranch.id], employeeIds: undefined }
  const dynamic = await calculate([first], branchDefinition)
  const custom = await calculate([first], { allowDraftConflicts: true })
  const added = await employee({ branchId: localBranch.id })
  assert.deepEqual((await detail(dynamic)).members.map(row => row.employeeId), [first.id])
  assert.deepEqual((await detail(custom)).members.map(row => row.employeeId), [first.id])
  const updatedDynamic = await calculate([first], { ...branchDefinition, runId: dynamic.id, reason: 'تحديث أعضاء الفرع', allowDraftConflicts: true })
  assert.equal(updatedDynamic.snapshotVersion, 2)
  assert.deepEqual(updatedDynamic.members.map(row => row.employeeId).sort((a, b) => a - b), [first.id, added.id])
  const updatedCustom = await calculate([first], { runId: custom.id, reason: 'إعادة حساب القائمة الصريحة', allowDraftConflicts: true })
  assert.equal(updatedCustom.snapshotVersion, 2)
  assert.deepEqual(updatedCustom.members.map(row => row.employeeId), [first.id])
  const dynamicEvent = (await events(dynamic)).find(row => row.eventType === 'RECALCULATED')
  assert.deepEqual(dynamicEvent.payload.diff.addedEmployeeIds, [added.id])
})

test('PR-06: draft conflict needs explicit acknowledgement, creates no claims, and approved/paid conflicts cannot be acknowledged away', async () => {
  const emp = await employee()
  const first = await calculate([emp])
  const before = await payrollCounts()
  const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp]))
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.deepEqual(await payrollCounts(), before)
  const second = await calculate([emp], { allowDraftConflicts: true })
  const conflicts = (await detail(second)).conflicts
  assert.ok(conflicts.some(row => row.employeeId === emp.id && row.otherRunId === first.id && row.status === 'CALCULATED'))
  assert.equal((await activeClaims(emp.id)).length, 0)
  await approve(first)
  for (const state of ['APPROVED', 'PAID']) {
    if (state === 'PAID') assert.equal((await request(admin, 'POST', `/payroll/runs/${first.id}/pay`)).status, 201)
    const stable = await payrollCounts()
    const blocked = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp], { allowDraftConflicts: true }))
    assert.equal(blocked.status, 409, `${state}: ${JSON.stringify(blocked.body)}`)
    assert.deepEqual(await payrollCounts(), stable)
  }
})

test('PR-06: concurrent approval of exact matching periods has one winner and one 409 without partial claims', async () => {
  const emp = await employee()
  const [first, second] = await competingDrafts(emp)
  await assertApprovalRace(first, second, emp)
})

test('PR-06: concurrent one-day overlaps are blocked across ordinary, February and 31-day boundaries', async () => {
  const examples = [
    ['2026-06-23', '2026-07-22', '2026-07-22', '2026-08-22'],
    ['2026-02-01', '2026-02-28', '2026-02-28', '2026-03-31'],
    ['2026-07-01', '2026-07-31', '2026-07-31', '2026-08-31'],
  ]
  for (const [firstStart, firstEnd, secondStart, secondEnd] of examples) {
    const emp = await employee()
    const [first, second] = await competingDrafts(emp)
    // Custom-range APIs are a later delivery. Dates on this isolated fixture
    // deliberately exercise approval's interval guard rather than calendar generation.
    await repo('PayrollRun').update(first.id, { startDate: firstStart, endDate: firstEnd })
    await repo('PayrollRun').update(second.id, { startDate: secondStart, endDate: secondEnd })
    Object.assign(first, { startDate: firstStart, endDate: firstEnd })
    Object.assign(second, { startDate: secondStart, endDate: secondEnd })
    const conflicts = (await detail(second)).conflicts
    assert.ok(conflicts.some(row => row.otherRunId === first.id && row.overlapDays === 1), JSON.stringify(conflicts))
    await assertApprovalRace(first, second, emp)
  }
})

test('PR-06: adjacent non-overlapping intervals may both be approved even with the same legacy period key', async () => {
  const emp = await employee()
  const [first, second] = await competingDrafts(emp)
  await repo('PayrollRun').update(first.id, { startDate: '2026-07-01', endDate: '2026-07-31' })
  await repo('PayrollRun').update(second.id, { startDate: '2026-08-01', endDate: '2026-08-31' })
  const result = await Promise.all([
    request(admin, 'POST', `/payroll/runs/${first.id}/approve`),
    request(secondAdmin, 'POST', `/payroll/runs/${second.id}/approve`),
  ])
  assert.deepEqual(result.map(row => row.status), [201, 201], JSON.stringify(result))
  assert.equal((await activeClaims(emp.id)).length, 2)
})

test('PR-06: approval reserves the full run interval rather than the employee partial coverage window', async () => {
  const emp = await employee({ joinDate: '2026-07-20' })
  const run = await calculate([emp])
  assert.equal(member(run, emp).snapshot.coverFrom, '2026-07-20')
  assert.equal(member(run, emp).snapshot.coverDays, 3)
  assert.equal(member(run, emp).snapshot.basicSalary, 6000)
  assert.equal(member(run, emp).snapshot.grossEarned, 600)
  await approve(run)
  const [claim] = await activeClaims(emp.id)
  assert.equal(claim.startDate, startDate)
  assert.equal(claim.endDate, endDate)
})

test('PR-06: legacy approved items without members or claims still prevent a second calculation', async () => {
  const emp = await employee()
  const legacy = await repo('PayrollRun').save({ name: 'مسير قديم للاختبار دون لقطة', period, startDate, endDate,
    scopeType: 'BRANCH', branchId: branchA.id, scopeIds: JSON.stringify([branchA.id]), status: 'APPROVED',
    approvedBy: admin.id, approvedAt: new Date(), totalNet: 6000, snapshotVersion: 0 })
  await repo('PayrollItem').save({ runId: legacy.id, employeeId: emp.id, basicSalary: 6000, allowances: 0, netPay: 6000, payMethod: 'transfer' })
  assert.equal(await repo('PayrollRunMember').count({ where: { runId: legacy.id } }), 0)
  assert.equal((await activeClaims(emp.id)).length, 0)
  const before = await payrollCounts()
  const rejected = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition([emp], { allowDraftConflicts: true }))
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.deepEqual(await payrollCounts(), before)
  const read = await detail(legacy)
  assert.equal(read.snapshotVersion, 0)
  assert.ok(read.members.every(row => row.snapshot == null), 'Legacy history must not invent a snapshot from live employee data')
})

test('PR-06 / PR-11: a SQL failure during claim insertion rolls back every claim, status and approval event', async () => {
  const first = await employee(), second = await employee()
  const run = await calculate([first, second])
  const before = await detail(run)
  const oldEvents = await events(run)
  assert.equal(ds.options.database, database)
  assert.ok(Number.isSafeInteger(second.id))
  await ds.query(`ALTER TABLE [dbo].[payroll_period_claims] WITH CHECK
    ADD CONSTRAINT [CK_membership_fixture_reject_claim] CHECK (employeeId <> ${second.id})`)
  try {
    const result = await request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
    assert.equal(result.status, 500, JSON.stringify(result.body))
    assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: run.id } }), 0)
    assert.deepEqual(await detail(run), before)
    assert.deepEqual(await events(run), oldEvents)
  } finally {
    assert.equal(ds.options.database, database)
    await ds.query('ALTER TABLE [dbo].[payroll_period_claims] DROP CONSTRAINT [CK_membership_fixture_reject_claim]')
  }
  await approve(run)
  assert.equal(await repo('PayrollPeriodClaim').count({ where: { runId: run.id, releasedAt: IsNull() } }), 2)
})

test('PR-11 / PR-12: reopen requires permission and reason, releases approved claims with audit history and permits another approval', async () => {
  const emp = await employee()
  const run = await calculate([emp])
  await approve(run)
  const frozen = await detail(run)
  const claims = await activeClaims(emp.id)
  assert.equal((await request(limitedManager, 'POST', `/payroll/runs/${run.id}/reopen`, { reason: 'لا يملك الصلاحية' })).status, 403)
  for (const body of [{}, { reason: '' }, { reason: '   ' }]) {
    assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/reopen`, body)).status, 400)
  }
  assert.deepEqual(await detail(run), frozen)
  assert.deepEqual(await activeClaims(emp.id), claims)
  const reason = 'إعادة المراجعة قبل الصرف'
  assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/reopen`, { reason })).status, 201)
  const reopened = await detail(run)
  assert.equal(reopened.status, 'CALCULATED')
  assert.equal(reopened.approvedBy, null)
  assert.equal(reopened.approvedAt, null)
  assert.deepEqual(reopened.members, frozen.members)
  assert.deepEqual(reopened.items, frozen.items)
  assert.equal((await activeClaims(emp.id)).length, 0)
  const released = await repo('PayrollPeriodClaim').findOneByOrFail({ id: claims[0].id })
  assert.ok(released.releasedAt)
  assert.ok((await events(run)).some(row => row.eventType === 'REOPENED' && row.reason === reason && row.actorUserId === admin.id))
  const other = await calculate([emp], { allowDraftConflicts: true })
  await approve(other)
  assert.equal((await activeClaims(emp.id))[0].runId, other.id)
})

test('PR-11: a paid run cannot reopen and retains its active reservation and frozen archive', async () => {
  const emp = await employee()
  const run = await calculate([emp])
  await approve(run)
  assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/pay`)).status, 201)
  const before = await detail(run)
  const oldEvents = await events(run)
  const claims = await activeClaims(emp.id)
  const result = await request(admin, 'POST', `/payroll/runs/${run.id}/reopen`, { reason: 'محاولة فتح مسير مصروف' })
  assert.ok([400, 409].includes(result.status), JSON.stringify(result.body))
  assert.deepEqual(await detail(run), before)
  assert.deepEqual(await events(run), oldEvents)
  assert.deepEqual(await activeClaims(emp.id), claims)
})

test('PR-11 / PR-12: cancelling a calculated run requires permission/reason, keeps its archive and removes draft conflict', async () => {
  const emp = await employee()
  const run = await calculate([emp])
  const before = await detail(run)
  assert.equal((await request(limitedManager, 'POST', `/payroll/runs/${run.id}/cancel`, { reason: 'بلا صلاحية' })).status, 403)
  for (const body of [{}, { reason: '' }, { reason: '   ' }]) {
    assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/cancel`, body)).status, 400)
  }
  assert.deepEqual(await detail(run), before)
  const reason = 'استبدال المسودة بمسير مصحح'
  assert.equal((await request(admin, 'POST', `/payroll/runs/${run.id}/cancel`, { reason })).status, 201)
  const cancelled = await detail(run)
  assert.equal(cancelled.status, 'CANCELLED')
  assert.deepEqual(cancelled.members, before.members)
  assert.deepEqual(cancelled.items, before.items)
  assert.equal(cancelled.snapshotVersion, before.snapshotVersion)
  assert.equal((await activeClaims(emp.id)).length, 0)
  assert.ok((await events(run)).some(row => row.eventType === 'CANCELLED' && row.reason === reason && row.actorUserId === admin.id))
  const replacement = await calculate([emp])
  await approve(replacement)
  const approved = await detail(replacement)
  const rejected = await request(admin, 'POST', `/payroll/runs/${replacement.id}/cancel`, { reason: 'لا يمكن إلغاء المعتمد مباشرة' })
  assert.ok([400, 409].includes(rejected.status), JSON.stringify(rejected.body))
  assert.deepEqual(await detail(replacement), approved)
})
