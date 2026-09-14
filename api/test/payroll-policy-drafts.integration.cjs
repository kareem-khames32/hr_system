// اختبارات نواة السياسات بقاعدة SQL عشوائية معزولة؛ لا تستدعي حساب الرواتب أو الصرف.
const { test, before, after, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_policy_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-policy-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const endpoint = '/payroll/policies'
let app, ds, master, base, created = false, sequence = 0, canary
let admin, managerA, managerB, starA, unassigned, viewerA, noPermission
let branchA, branchB, departmentA, departmentB, teamA, teamB, employeeA, employeeB, costCenter, inactiveCostCenter

function assertDisposable() {
  assert.match(database, /^hr_payroll_policy_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function plain(value) { return JSON.parse(JSON.stringify(value)) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
function definition(overrides = {}) {
  return { code: `PL01_${++sequence}`, name: `سياسة اختبار ${sequence}`, effectiveFrom: '2026-07-01',
    metadata: { title: 'مسودة الموارد البشرية', notes: 'بيانات وصفية بلا محرك مالي' }, ...overrides }
}
async function create(overrides = {}, user = admin) {
  return expectStatus(await request(user, 'POST', endpoint, definition(overrides)), 201)
}
async function detail(id, user = admin) { return expectStatus(await request(user, 'GET', `${endpoint}/${id}`), 200) }
async function events(id, user = admin) {
  const result = expectStatus(await request(user, 'GET', `${endpoint}/${id}/events`), 200)
  assert.ok(Array.isArray(result), JSON.stringify(result))
  return result
}
async function policySnapshot() {
  const result = {}
  for (const name of ['PayrollPolicy', 'PayrollPolicyVersion', 'PayrollPolicyEvent']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  return result
}
async function financialSnapshot() {
  const result = {}
  // تحفظ المقارنة كل أعمدة السجلات، بما فيها نص لقطة القسيمة، وتكشف أي إدراج جانبي أيضاً.
  for (const name of ['Employee', 'PayrollRun', 'PayrollItem', 'PayrollRunMember', 'PayrollRunEvent',
    'OvertimeEntry', 'OvertimeEntryEvent', 'EmployeeObligation', 'Loan', 'LoanInstallment']) {
    result[name] = plain(await repo(name).find({ order: { id: 'ASC' } }))
  }
  return result
}
async function concurrentBehindPolicyLock(resource, actions) {
  // نثبت وصول الطلبين إلى انتظار SQL فعلي قبل تحرير القفل، فلا يعتمد الاختبار على سرعة HTTP.
  const runner = ds.createQueryRunner()
  let pending = [], committed = false
  try {
    await runner.connect(); await runner.startTransaction()
    const [{ spid }] = await runner.query('SELECT @@SPID AS spid')
    const result = await runner.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 5000;
      SELECT @result AS lockResult;`, [`hr:payroll:policy:${resource}`])
    assert.ok(Number(result[0].lockResult) >= 0)
    pending = actions.map(action => action())
    const deadline = Date.now() + 6000
    let waiting = []
    while (Date.now() < deadline) {
      const result = await master.request().input('blocker', sql.Int, spid).input('testDatabase', sql.NVarChar, database).query(`
        WITH waiting AS (
          SELECT session_id, blocking_session_id, wait_type FROM sys.dm_exec_requests
          WHERE database_id=DB_ID(@testDatabase) AND wait_type LIKE 'LCK%'
        ), blocked AS (
          SELECT session_id, blocking_session_id, wait_type, 1 AS depth FROM waiting WHERE blocking_session_id=@blocker
          UNION ALL
          SELECT w.session_id, w.blocking_session_id, w.wait_type, b.depth+1
          FROM waiting w INNER JOIN blocked b ON w.blocking_session_id=b.session_id
        ) SELECT DISTINCT session_id, blocking_session_id, wait_type, depth FROM blocked OPTION (MAXRECURSION 20)`)
      waiting = result.recordset
      if (waiting.length >= actions.length) break
      await new Promise(resolve => setTimeout(resolve, 25))
    }
    assert.ok(waiting.length >= actions.length, `Expected ${actions.length} SQL waiters, observed ${JSON.stringify(waiting)}`)
    process.stdout.write(`# Policy SQL barrier ${actions.length} operations: ${JSON.stringify(waiting)}\n`)
    await runner.commitTransaction(); committed = true
    return await Promise.all(pending)
  } finally {
    if (!committed && runner.isTransactionActive) await runner.rollbackTransaction()
    await Promise.allSettled(pending)
    await runner.release()
  }
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
  branchA = await repo('Branch').save({ code: 'POLICY_A', name: 'فرع السياسات الأول' })
  branchB = await repo('Branch').save({ code: 'POLICY_B', name: 'فرع السياسات الثاني' })
  departmentA = await repo('Department').save({ branchId: branchA.id, name: 'قسم الفرع الأول', code: 'POLICY_DA' })
  departmentB = await repo('Department').save({ branchId: branchB.id, name: 'قسم الفرع الثاني', code: 'POLICY_DB' })
  teamA = await repo('Team').save({ departmentId: departmentA.id, name: 'فريق الفرع الأول', code: 'POLICY_TA' })
  teamB = await repo('Team').save({ departmentId: departmentB.id, name: 'فريق الفرع الثاني', code: 'POLICY_TB' })
  costCenter = await repo('CostCenter').save({ code: 'POLICY_CC', name: 'مركز تكلفة عام', isActive: true })
  inactiveCostCenter = await repo('CostCenter').save({ code: 'POLICY_CC_OFF', name: 'مركز تكلفة متوقف', isActive: false })
  const user = (label, role, branchId = null, permissions = []) => repo('User').save({ email: `${label}@policy-test.invalid`,
    displayName: label, passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions) })
  admin = await user('admin', 'super_admin')
  const permissions = ['payroll.view', 'payroll.calculate']
  managerA = await user('manager-a', 'hr_manager', branchA.id, permissions)
  managerB = await user('manager-b', 'hr_manager', branchB.id, permissions)
  starA = await user('star-a', 'hr_manager', branchA.id, ['*'])
  unassigned = await user('unassigned', 'hr_manager', null, ['*'])
  viewerA = await user('viewer-a', 'hr_manager', branchA.id, ['payroll.view'])
  noPermission = await user('no-permission', 'hr_manager', branchA.id, [])
  const employee = (code, branchId, departmentId, teamId) => repo('Employee').save({ employeeCode: code, fullName: code,
    branchId, departmentId, teamId, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0,
    transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'cash' })
  employeeA = await employee('POLICY_CANARY_A', branchA.id, departmentA.id, teamA.id)
  employeeB = await employee('POLICY_CANARY_B', branchB.id, departmentB.id, teamB.id)
  const run = await repo('PayrollRun').save({ name: 'مسير مصروف يجب ألا يتغير', branchId: branchA.id,
    scopeType: 'BRANCH', scopeIds: JSON.stringify([branchA.id]), employeeIds: JSON.stringify([employeeA.id]),
    policyId: null, period: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31', status: 'PAID',
    totalNet: 9084.38, approvedBy: admin.id, approvedAt: new Date('2026-08-01T08:00:00Z'),
    paidAt: new Date('2026-08-01T09:00:00Z'), snapshotVersion: 0 })
  const overtime = await repo('OvertimeEntry').save({ employeeId: employeeA.id, date: '2026-07-08',
    source: 'PRE_REQUESTED', status: 'PAID', hoursRequested: 1.5, hoursActual: 1.5, payableHours: 1.5,
    rate: 1.5, payrollRunId: run.id })
  await repo('PayrollItem').save({ runId: run.id, employeeId: employeeA.id, basicSalary: 9000, allowances: 0,
    overtimeHours: 1.5, overtimeAmount: 84.38, netPay: 9084.38, payMethod: 'cash',
    breakdown: JSON.stringify({ canary: 'يجب حفظ هذا النص كما هو', overtimeEntryIds: [overtime.id], monthlyDays: 30 }) })
  canary = await financialSnapshot()
}, { timeout: 60000 })

afterEach(async () => { if (canary) assert.deepEqual(await financialSnapshot(), canary, 'Policy operation mutated financial source rows') })
after(async t => {
  const errors = []
  try { if (canary) assert.deepEqual(await financialSnapshot(), canary) } catch (error) { errors.push(error) }
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-policy-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Policy fixture cleanup failed')
})

test('PL-01: create and read a draft with normalized unique identity and authenticated audit', async () => {
  const created = await create({ code: '  policy_normalized  ', effectiveTo: '2026-12-31' })
  assert.equal(created.policy.code, 'POLICY_NORMALIZED')
  assert.equal(created.policy.revision, 1)
  assert.equal(created.policy.createdBy, admin.id)
  assert.equal(created.policy.branchId, null)
  assert.equal(created.policy.isActive, true)
  assert.equal(created.versions.length, 1)
  const version = created.versions[0]
  assert.equal(version.versionNo, 1)
  assert.equal(version.revision, 1)
  assert.equal(version.status, 'DRAFT')
  assert.equal(version.contractVersion, 'SRS_V1')
  assert.equal(version.frozenAt, null)
  assert.equal(version.publishedAt, null)
  assert.deepEqual(await detail(created.policy.id), created)
  const readVersion = expectStatus(await request(admin, 'GET', `${endpoint}/${created.policy.id}/versions/${version.id}`), 200)
  assert.deepEqual(readVersion.version, version)
  const log = await events(created.policy.id)
  assert.ok(log.length >= 1)
  for (const event of log) {
    assert.equal(event.actorUserId, admin.id)
    assert.equal(event.policyId, created.policy.id)
    assert.ok(event.payload && typeof event.payload === 'object')
  }
})

test('PL-01: draft identity and version updates have separate revisions and retain their audit reasons', async () => {
  const initial = await create({}, managerA)
  const { policy } = initial, version = initial.versions[0]
  const patched = expectStatus(await request(managerA, 'PATCH', `${endpoint}/${policy.id}`, {
    expectedRevision: 1, reason: 'تصحيح اسم السياسة', name: 'سياسة الفرع بعد التصحيح', description: 'وصف محدث' }), 200)
  assert.equal(patched.policy.revision, 2)
  assert.equal(patched.policy.name, 'سياسة الفرع بعد التصحيح')
  assert.equal(patched.policy.updatedBy, managerA.id)
  assert.deepEqual((await detail(policy.id)).versions[0], version)
  const changed = expectStatus(await request(managerA, 'PATCH', `${endpoint}/${policy.id}/versions/${version.id}`, {
    expectedRevision: 1, reason: 'تعديل تواريخ المسودة', effectiveFrom: '2028-02-29', effectiveTo: '2028-12-31',
    metadata: { title: 'عنوان جديد', notes: 'تاريخ كبيس صحيح' } }), 200)
  assert.equal(changed.editKind, 'UPDATED')
  assert.equal(changed.version.id, version.id)
  assert.equal(changed.version.versionNo, 1)
  assert.equal(changed.version.revision, 2)
  assert.equal(changed.version.effectiveFrom, '2028-02-29')
  assert.equal((await detail(policy.id)).policy.revision, 2)
  const log = await events(policy.id)
  for (const reason of ['تصحيح اسم السياسة', 'تعديل تواريخ المسودة']) {
    const event = log.find(row => row.reason === reason)
    assert.ok(event, JSON.stringify(log))
    assert.equal(event.actorUserId, managerA.id)
  }
  const identityEvent = log.find(row => row.eventType === 'IDENTITY_UPDATED')
  assert.equal(identityEvent.payload.before.name, policy.name)
  assert.equal(identityEvent.payload.after.name, patched.policy.name)
  assert.equal(identityEvent.payload.before.revision, 1)
  assert.equal(identityEvent.payload.after.revision, 2)
  const versionEvent = log.find(row => row.eventType === 'VERSION_UPDATED')
  assert.equal(versionEvent.payload.before.effectiveFrom, version.effectiveFrom)
  assert.equal(versionEvent.payload.after.effectiveFrom, '2028-02-29')
})

test('PL-01: invalid calendar dates, reversed ranges and malformed scope values reject atomically', async () => {
  const initial = await create()
  const version = initial.versions[0]
  const snapshot = await policySnapshot()
  for (const fields of [{ effectiveFrom: '2026-02-29' }, { effectiveFrom: '2026-04-31' },
    { effectiveFrom: '2026-13-01' }, { effectiveFrom: '2026-07-01T00:00:00Z' },
    { effectiveFrom: '2026-08-01', effectiveTo: '2026-07-31' }, { name: '  ' },
    { branchId: -1 }, { defaultScopeIds: [1, 1] }, { defaultScopeIds: ['1'] }, { metadata: { title: 7 } }]) {
    expectStatus(await request(admin, 'POST', endpoint, definition(fields)), 400)
  }
  for (const fields of [{ effectiveFrom: '2026-02-29' }, { effectiveTo: '2026-06-30' }, { reason: '  ' }, { expectedRevision: 0 }]) {
    expectStatus(await request(admin, 'PATCH', `${endpoint}/${initial.policy.id}/versions/${version.id}`,
      { expectedRevision: 1, reason: 'تاريخ غير صحيح', ...fields }), 400)
  }
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: strict HTTP DTOs reject forged server fields at create, identity, version, clone and archive boundaries', async () => {
  const initial = await create()
  const id = initial.policy.id, versionId = initial.versions[0].id
  const snapshot = await policySnapshot()
  for (const forged of [{ id: 999 }, { createdBy: managerB.id }, { revision: 50 }, { status: 'ACTIVE' },
    { versionNo: 99 }, { contractVersion: 'LEGACY_V1' }, { metadata: { title: 'صحيح', status: 'ACTIVE' } }]) {
    expectStatus(await request(admin, 'POST', endpoint, definition(forged)), 400)
  }
  for (const [route, method, body] of [
    [`${endpoint}/${id}`, 'PATCH', { code: 'FORGED' }],
    [`${endpoint}/${id}`, 'PATCH', { branchId: branchB.id }],
    [`${endpoint}/${id}`, 'PATCH', { isActive: false }],
    [`${endpoint}/${id}/versions/${versionId}`, 'PATCH', { status: 'ACTIVE' }],
    [`${endpoint}/${id}/versions/${versionId}`, 'PATCH', { frozenAt: '2026-01-01' }],
    [`${endpoint}/${id}/versions/${versionId}`, 'PATCH', { contractVersion: 'LEGACY_V1' }],
    [`${endpoint}/${id}/versions`, 'POST', { sourceVersionId: versionId, versionNo: 9 }],
    [`${endpoint}/${id}/archive`, 'POST', { policyId: id + 1 }],
  ]) expectStatus(await request(admin, method, route, { expectedRevision: 1, reason: 'محاولة تزوير', ...body }), 400)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: real JWT and permission guards enforce read and calculate separately', async () => {
  const initial = await create({}, managerA)
  expectStatus(await request(null, 'GET', endpoint), 401)
  expectStatus(await request(noPermission, 'GET', endpoint), 403)
  expectStatus(await request(noPermission, 'POST', endpoint, definition()), 403)
  expectStatus(await request(viewerA, 'GET', `${endpoint}/${initial.policy.id}`), 200)
  const snapshot = await policySnapshot()
  expectStatus(await request(viewerA, 'POST', endpoint, definition()), 403)
  expectStatus(await request(viewerA, 'PATCH', `${endpoint}/${initial.policy.id}`, {
    expectedRevision: 1, reason: 'بدون صلاحية احتساب', name: 'مرفوض' }), 403)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: branch ownership limits listing and mutations even for wildcard permissions; globals are read only', async () => {
  const global = await create(), own = await create({}, managerA), foreign = await create({}, managerB)
  assert.equal(own.policy.branchId, branchA.id)
  assert.equal(foreign.policy.branchId, branchB.id)
  for (const actor of [managerA, starA]) {
    const listed = expectStatus(await request(actor, 'GET', endpoint), 200)
    const rows = Array.isArray(listed) ? listed : listed.policies
    assert.ok(Array.isArray(rows), JSON.stringify(listed))
    const ids = rows.map(row => (row.policy || row).id)
    assert.ok(ids.includes(global.policy.id)); assert.ok(ids.includes(own.policy.id)); assert.ok(!ids.includes(foreign.policy.id))
    const globalRead = expectStatus(await request(actor, 'GET', `${endpoint}/${global.policy.id}`), 200)
    assert.equal(globalRead.capabilities.canEdit, false)
    assert.equal(globalRead.capabilities.canCloneVersion, false)
    assert.equal((await detail(own.policy.id, actor)).capabilities.canEdit, true)
    for (const route of [`${endpoint}/${foreign.policy.id}`, `${endpoint}/${foreign.policy.id}/events`,
      `${endpoint}/${foreign.policy.id}/versions/${foreign.versions[0].id}`]) {
      const denied = expectStatus(await request(actor, 'GET', route), 403)
      assert.equal(denied.policy, undefined)
      assert.equal(denied.versions, undefined)
      assert.equal(denied.events, undefined)
      assert.ok(!JSON.stringify(denied).includes(foreign.policy.code))
    }
    const snapshot = await policySnapshot()
    for (const target of [global, foreign]) {
      const status = 403
      expectStatus(await request(actor, 'PATCH', `${endpoint}/${target.policy.id}`, { expectedRevision: 1, reason: 'اختبار عزل', name: 'مرفوض' }), status)
      expectStatus(await request(actor, 'PATCH', `${endpoint}/${target.policy.id}/versions/${target.versions[0].id}`, {
        expectedRevision: 1, reason: 'اختبار عزل', metadata: { title: 'مرفوض' } }), status)
      expectStatus(await request(actor, 'POST', `${endpoint}/${target.policy.id}/versions`, {
        sourceVersionId: target.versions[0].id, expectedRevision: 1, reason: 'اختبار عزل' }), status)
      expectStatus(await request(actor, 'POST', `${endpoint}/${target.policy.id}/archive`, { expectedRevision: 1, reason: 'اختبار عزل' }), status)
    }
    expectStatus(await request(actor, 'POST', endpoint, definition({ branchId: branchB.id })), 403)
    expectStatus(await request(actor, 'POST', endpoint, definition({ branchId: null })), 403)
    assert.deepEqual(await policySnapshot(), snapshot)
  }
  const snapshot = await policySnapshot()
  expectStatus(await request(unassigned, 'GET', endpoint), 403)
  expectStatus(await request(unassigned, 'GET', `${endpoint}/${global.policy.id}`), 403)
  expectStatus(await request(unassigned, 'POST', endpoint, definition()), 403)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: default scope validates existing entities within owner branch without broadening ownership', async () => {
  for (const [type, ownId, foreignId] of [['BRANCH', branchA.id, branchB.id], ['DEPARTMENT', departmentA.id, departmentB.id],
    ['TEAM', teamA.id, teamB.id], ['CUSTOM', employeeA.id, employeeB.id]]) {
    const initial = await create({ defaultScopeType: type, defaultScopeIds: [ownId] }, managerA)
    assert.deepEqual(initial.policy.defaultScopeIds, [ownId])
    const snapshot = await policySnapshot()
    for (const ids of [[foreignId], [ownId, foreignId], [2147483647], []]) {
      const result = await request(managerA, 'POST', endpoint, definition({ defaultScopeType: type, defaultScopeIds: ids }))
      assert.ok([400, 403].includes(result.status), JSON.stringify(result))
    }
    const patch = await request(managerA, 'PATCH', `${endpoint}/${initial.policy.id}`, {
      expectedRevision: 1, reason: 'نطاق خارج الفرع', defaultScopeType: type, defaultScopeIds: [foreignId] })
    assert.ok([400, 403].includes(patch.status), JSON.stringify(patch))
    assert.deepEqual(await policySnapshot(), snapshot)
  }
  const general = await create({ defaultScopeType: 'COMPANY', defaultScopeIds: [] })
  assert.equal(general.policy.branchId, null)
  const denied = await request(managerA, 'POST', endpoint, definition({ defaultScopeType: 'COMPANY', defaultScopeIds: [] }))
  assert.ok([400, 403].includes(denied.status), JSON.stringify(denied))
  const center = await create({ defaultScopeType: 'COST_CENTER', defaultScopeIds: [costCenter.id] }, managerA)
  assert.equal(center.policy.branchId, branchA.id)
  for (const centerId of [inactiveCostCenter.id, 2147483647]) {
    expectStatus(await request(managerA, 'POST', endpoint, definition({ defaultScopeType: 'COST_CENTER', defaultScopeIds: [centerId] })), 400)
  }
})

test('PL-01: concurrent normalized code creation permits one identity and SQL enforces uniqueness', async () => {
  const code = `RACE_CODE_${++sequence}`
  const result = await concurrentBehindPolicyLock(`code:${code}`, [
    () => request(admin, 'POST', endpoint, definition({ code: code.toLowerCase() })),
    () => request(admin, 'POST', endpoint, definition({ code }))])
  assert.deepEqual(result.map(row => row.status).sort(), [201, 409], JSON.stringify(result))
  const policy = result.find(row => row.status === 201).body.policy
  assert.equal(await repo('PayrollPolicy').count({ where: { code } }), 1)
  const snapshot = await policySnapshot()
  await assert.rejects(ds.query(`INSERT INTO payroll_policies (code,name,branchId,isActive,revision,createdBy,updatedBy)
    SELECT code,name,branchId,isActive,revision,createdBy,updatedBy FROM payroll_policies WHERE id = @0`, [policy.id]),
  error => /2601|2627|duplicate|unique/i.test(String(error.message)))
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: concurrent identity and draft-version revisions allow exactly one update each', async () => {
  const initial = await create(), id = initial.policy.id, versionId = initial.versions[0].id
  const identity = await concurrentBehindPolicyLock(id, ['الأول', 'الثاني'].map(label => () => request(admin, 'PATCH', `${endpoint}/${id}`, {
    expectedRevision: 1, reason: `تنافس الهوية ${label}`, name: `سياسة ${label}` })))
  assert.deepEqual(identity.map(row => row.status).sort(), [200, 409], JSON.stringify(identity))
  assert.equal((await detail(id)).policy.revision, 2)
  const version = await concurrentBehindPolicyLock(id, ['الأول', 'الثاني'].map(label => () => request(admin, 'PATCH', `${endpoint}/${id}/versions/${versionId}`, {
    expectedRevision: 1, reason: `تنافس النسخة ${label}`, metadata: { title: label } })))
  assert.deepEqual(version.map(row => row.status).sort(), [200, 409], JSON.stringify(version))
  const final = await detail(id)
  assert.equal(final.versions.length, 1)
  assert.equal(final.versions[0].revision, 2)
  assert.equal(final.versions[0].metadata.title, version.find(row => row.status === 200).body.version.metadata.title)
  const log = await events(id)
  assert.equal(log.filter(row => row.reason?.startsWith('تنافس الهوية')).length, 1)
  assert.equal(log.filter(row => row.reason?.startsWith('تنافس النسخة')).length, 1)
})

test('PL-01: concurrent clones allocate distinct sequential numbers while preserving the source exactly', async () => {
  const initial = await create(), id = initial.policy.id, source = initial.versions[0]
  const original = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: source.id }))
  const responses = await concurrentBehindPolicyLock(id, ['الأول', 'الثاني'].map(label => () => request(admin, 'POST', `${endpoint}/${id}/versions`, {
    sourceVersionId: source.id, expectedRevision: 1, reason: `نسخ متزامن ${label}` })))
  for (const response of responses) expectStatus(response, 201)
  assert.deepEqual(responses.map(row => row.body.version.versionNo).sort(), [2, 3])
  for (const response of responses) {
    assert.equal(response.body.editKind, 'CLONED')
    assert.equal(response.body.version.sourceVersionId, source.id)
    assert.equal(response.body.version.status, 'DRAFT')
    assert.equal(response.body.version.revision, 1)
    assert.deepEqual(response.body.version.metadata, source.metadata)
  }
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: source.id })), original)
  assert.equal((await detail(id)).policy.revision, 1)
  assert.equal((await events(id)).filter(row => row.reason?.startsWith('نسخ متزامن')).length, 2)
})

test('PL-01: ACTIVE and frozen drafts use copy on write without rewriting any historical source field', async () => {
  for (const kind of ['ACTIVE', 'FROZEN_DRAFT']) {
    const initial = await create(), id = initial.policy.id, sourceId = initial.versions[0].id
    // حالة تاريخية مصطنعة داخل قاعدة الاختبار؛ لا توجد واجهة نشر في هذه النواة.
    await repo('PayrollPolicyVersion').update(sourceId, { status: kind === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
      contractVersion: 'LEGACY_V1', publishedAt: kind === 'ACTIVE' ? new Date('2026-06-15T08:00:00Z') : null,
      publishedBy: kind === 'ACTIVE' ? admin.id : null, frozenAt: kind === 'FROZEN_DRAFT' ? new Date('2026-07-02T08:00:00Z') : null })
    const original = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: sourceId }))
    const policyBefore = plain(await repo('PayrollPolicy').findOneByOrFail({ id }))
    const changed = expectStatus(await request(admin, 'PATCH', `${endpoint}/${id}/versions/${sourceId}`, {
      expectedRevision: 1, reason: `تعديل آمن ${kind}`, metadata: { title: 'نسخة قابلة للتعديل', notes: 'الأصل ثابت' } }), 200)
    assert.equal(changed.editKind, 'CLONED')
    assert.notEqual(changed.version.id, sourceId)
    assert.equal(changed.version.sourceVersionId, sourceId)
    assert.equal(changed.version.versionNo, 2)
    assert.equal(changed.version.status, 'DRAFT')
    assert.equal(changed.version.revision, 1)
    assert.equal(changed.version.frozenAt, null)
    assert.equal(changed.version.publishedAt, null)
    assert.equal(changed.version.contractVersion, 'LEGACY_V1')
    assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: sourceId })), original)
    assert.deepEqual(plain(await repo('PayrollPolicy').findOneByOrFail({ id })), policyBefore)
  }
})

test('PL-01: wrong policy/version pairs and stale clone revisions cannot read or mutate another source', async () => {
  const first = await create(), second = await create(), source = first.versions[0], foreign = second.versions[0]
  const snapshot = await policySnapshot()
  expectStatus(await request(admin, 'GET', `${endpoint}/${first.policy.id}/versions/${foreign.id}`), 404)
  expectStatus(await request(admin, 'PATCH', `${endpoint}/${first.policy.id}/versions/${foreign.id}`, {
    expectedRevision: 1, reason: 'نسخة لا تخص السياسة', metadata: { title: 'مرفوض' } }), 404)
  expectStatus(await request(admin, 'POST', `${endpoint}/${first.policy.id}/versions`, {
    sourceVersionId: foreign.id, expectedRevision: 1, reason: 'مصدر لا يخص السياسة' }), 404)
  expectStatus(await request(admin, 'POST', `${endpoint}/${first.policy.id}/versions`, {
    sourceVersionId: source.id, expectedRevision: 99, reason: 'نسخة مصدر قديمة' }), 409)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: an archived version within an active identity can be cloned without restoring its source', async () => {
  const initial = await create({}, managerA), id = initial.policy.id, sourceId = initial.versions[0].id
  await repo('PayrollPolicyVersion').update(sourceId, { status: 'ARCHIVED', frozenAt: new Date('2026-07-02T08:00:00Z') })
  const source = plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: sourceId }))
  const identity = plain(await repo('PayrollPolicy').findOneByOrFail({ id }))
  const cloned = expectStatus(await request(managerA, 'POST', `${endpoint}/${id}/versions`, {
    sourceVersionId: sourceId, expectedRevision: 1, reason: 'بدء مسودة من نسخة مؤرشفة' }), 201)
  assert.equal(cloned.editKind, 'CLONED')
  assert.equal(cloned.version.status, 'DRAFT')
  assert.equal(cloned.version.sourceVersionId, sourceId)
  assert.equal(cloned.version.versionNo, 2)
  assert.equal(cloned.version.frozenAt, null)
  assert.equal(cloned.capabilities.canEdit, true)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').findOneByOrFail({ id: sourceId })), source)
  assert.deepEqual(plain(await repo('PayrollPolicy').findOneByOrFail({ id })), identity)
})

test('PL-01: archive changes only identity state and keeps all version and event history readable', async () => {
  const initial = await create(), id = initial.policy.id, source = initial.versions[0]
  expectStatus(await request(admin, 'POST', `${endpoint}/${id}/versions`, {
    sourceVersionId: source.id, expectedRevision: 1, reason: 'نسخة قبل الأرشفة' }), 201)
  await repo('PayrollPolicyVersion').update(source.id, { status: 'ACTIVE', frozenAt: new Date('2026-07-02T08:00:00Z') })
  const versionsBefore = plain(await repo('PayrollPolicyVersion').find({ where: { policyId: id }, order: { id: 'ASC' } }))
  const eventsBefore = await events(id)
  const archived = expectStatus(await request(admin, 'POST', `${endpoint}/${id}/archive`, {
    expectedRevision: 1, reason: 'أرشفة مع حفظ التاريخ' }), 201)
  assert.equal(archived.policy.isActive, false)
  assert.equal(archived.policy.revision, 2)
  assert.deepEqual(plain(await repo('PayrollPolicyVersion').find({ where: { policyId: id }, order: { id: 'ASC' } })), versionsBefore)
  assert.equal((await detail(id)).versions.length, 2)
  const log = await events(id)
  for (const event of eventsBefore) assert.deepEqual(log.find(row => row.id === event.id), event)
  assert.equal(log.filter(row => row.reason === 'أرشفة مع حفظ التاريخ').length, 1)
  expectStatus(await request(admin, 'GET', `${endpoint}/${id}/versions/${source.id}`), 200)
  assert.equal(archived.capabilities.canEdit, false)
  assert.equal(archived.capabilities.canCloneVersion, false)
  const snapshot = await policySnapshot()
  for (const [method, route, body] of [
    ['PATCH', `${endpoint}/${id}`, { expectedRevision: 2, name: 'إحياء غير مسموح' }],
    ['PATCH', `${endpoint}/${id}/versions/${source.id}`, { expectedRevision: 1, metadata: { title: 'إحياء غير مسموح' } }],
    ['POST', `${endpoint}/${id}/versions`, { expectedRevision: 1, sourceVersionId: source.id }],
    ['POST', `${endpoint}/${id}/archive`, { expectedRevision: 2 }],
  ]) expectStatus(await request(admin, method, route, { reason: 'هوية مؤرشفة ثابتة', ...body }), 409)
  assert.deepEqual(await policySnapshot(), snapshot)
})

test('PL-01: event insert failure rolls back creation, draft update, clone and archive atomically', async () => {
  const initial = await create(), id = initial.policy.id, source = initial.versions[0]
  const snapshot = await policySnapshot()
  assertDisposable()
  await ds.query(`CREATE TRIGGER [TR_policy_test_reject_event] ON [payroll_policy_events] AFTER INSERT AS
    BEGIN SET NOCOUNT ON; THROW 51000, 'POLICY_TEST_EVENT_FAILURE', 1; END`)
  // نكتم سجل الأعطال المتوقع لهذه الحالة فقط؛ الخدمة وقاعدة SQL الفعليتان مستمرتان دون استبدال.
  app.useLogger(false)
  try {
    const requests = [
      ['POST', endpoint, definition()],
      ['PATCH', `${endpoint}/${id}`, { expectedRevision: 1, reason: 'فشل حدث الهوية', name: 'يجب التراجع' }],
      ['PATCH', `${endpoint}/${id}/versions/${source.id}`, { expectedRevision: 1, reason: 'فشل حدث النسخة', metadata: { title: 'يجب التراجع' } }],
      ['POST', `${endpoint}/${id}/versions`, { sourceVersionId: source.id, expectedRevision: 1, reason: 'فشل حدث النسخ' }],
      ['POST', `${endpoint}/${id}/archive`, { expectedRevision: 1, reason: 'فشل حدث الأرشفة' }],
    ]
    for (const [method, route, body] of requests) {
      const result = await request(admin, method, route, body)
      assert.ok(result.status >= 500, JSON.stringify(result))
      assert.deepEqual(await policySnapshot(), snapshot, `Audit failure partially committed ${method} ${route}`)
    }
  } finally { await ds.query('DROP TRIGGER IF EXISTS [TR_policy_test_reject_event]'); app.useLogger(['error']) }
  const accepted = expectStatus(await request(admin, 'PATCH', `${endpoint}/${id}`, {
    expectedRevision: 1, reason: 'عاد سجل الأحداث للعمل', name: 'تحديث بعد رفع العطل' }), 200)
  assert.equal(accepted.policy.revision, 2)
})

test('PL-01: draft APIs have no publish or assignment routes and leave the paid financial canary unchanged', async () => {
  const initial = await create(), id = initial.policy.id
  for (const route of [`${endpoint}/${id}/publish`, `${endpoint}/${id}/assign`, `${endpoint}/${id}/versions/${initial.versions[0].id}/publish`]) {
    expectStatus(await request(admin, 'POST', route, {}), 404)
  }
  assert.deepEqual(await financialSnapshot(), canary)
  assert.equal(canary.PayrollRun[0].status, 'PAID')
  assert.equal(canary.PayrollItem[0].netPay, 9084.38)
  assert.equal(canary.OvertimeEntry[0].status, 'PAID')
})
