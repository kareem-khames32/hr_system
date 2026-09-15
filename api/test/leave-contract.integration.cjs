// NAM16/26/29: isolated SQL migration + actual HTTP/service compatibility.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), fs = require('node:fs'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recovery_test_${crypto.randomBytes(8).toString('hex')}`, secret = crypto.randomBytes(48).toString('hex')
const migration = fs.readFileSync(path.join(apiRoot, '../docs/migrations/20260911_006_pre_payroll_leave_request_names.sql'), 'utf8')
let master, app, ds, base, created = false, admin, hr, alice, bob, outsider, branch, otherBranch, legacyA, legacyB
const repos = {}
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
async function request(user, method, url, body) {
  const token = jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0, permissions: JSON.parse(user.permissions || '[]') })
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  return { status: response.status, body: await response.json() }
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test' })
  const { NestFactory } = require('../node_modules/@nestjs/core'), { ValidationPipe } = require('../node_modules/@nestjs/common')
  app = await NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1'); base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource)
  for (const [name, file] of Object.entries({ User: 'auth/user.entity', Employee: 'employees/employee.entity', Branch: 'org/entities/branch.entity',
    Request: 'requests/entities/request.entity', RequestType: 'requests/entities/request-type.entity',
    RequestApproval: 'requests/entities/request-approval.entity', ApprovalChain: 'requests/entities/approval-chain.entity',
    ApprovalStep: 'requests/entities/approval-step.entity', Leave: 'requests/entities/leave.entities',
    LeaveType: 'requests/entities/leave.entities', LeaveBalance: 'requests/entities/leave.entities', Asset: 'requests/entities/custody.entities',
    CustodyAssignment: 'requests/entities/custody.entities' })) repos[name] = ds.getRepository(require('../src/' + file)[name])
  // weekendDays=null = إعداد النظام؛ النص الفارغ يرفضه فحص لقطة التقويم كما يرفضه API الفروع
  branch = await repos.Branch.save({ name: 'Leave A', code: 'LEAVE_A', weekendDays: null })
  otherBranch = await repos.Branch.save({ name: 'Leave B', code: 'LEAVE_B', weekendDays: null })
  const person = async (name, branchId) => {
    const e = await repos.Employee.save({ employeeCode: name, fullName: name, branchId, joinDate: '2020-01-01', status: 'active' })
    return repos.User.save({ email: name+'@test.invalid', displayName: name, role: 'employee', employeeId: e.id, branchId, passwordHash: 'unused' })
  }
  alice = await person('ALICE', branch.id); bob = await person('BOB', branch.id); outsider = await person('OUTSIDER', otherBranch.id)
  admin = await repos.User.save({ email: 'admin@test.invalid', displayName: 'Admin', role: 'super_admin', permissions: '["*"]', passwordHash: 'unused' })
  hr = await repos.User.save({ email: 'hr@test.invalid', displayName: 'HR', role: 'hr_manager', branchId: branch.id, permissions: '["leaves.view_all","employees.view","leave_balances.manage","requests.view_all"]', passwordHash: 'unused' })
  await repos.LeaveType.save([{ code: 'ANNUAL', nameAr: 'Annual', balanceType: 'annual', isPaid: true },
    { code: 'UNPAID', nameAr: 'Unpaid', balanceType: 'none', isPaid: false }])
  const chainA = await repos.ApprovalChain.save({ code: 'PROFILE_A', nameAr: 'Profile A global', autoApprove: false })
  const branchA = await repos.ApprovalChain.save({ code: 'PROFILE_A', nameAr: 'Profile A branch', branchId: branch.id, autoApprove: false })
  const chainB = await repos.ApprovalChain.save({ code: 'PROFILE_B', nameAr: 'Profile B executive', autoApprove: false })
  await repos.ApprovalStep.save([{ chainId: chainA.id, stepOrder: 1, approverRole: 'finance' },
    { chainId: branchA.id, stepOrder: 1, approverRole: 'hr' }, { chainId: chainB.id, stepOrder: 1, approverRole: 'executive' }])
  const profile = (code, chain, handler, employeeId, field) => repos.RequestType.save({ code, nameAr: code+' custom', category: 'leaves',
    destinationHandler: handler, approvalChainId: chain, affectsBalance: handler === 'leave_calendar_balance',
    visibleTo: JSON.stringify({ mode: 'employees', ids: [employeeId] }), requiredFields: '["fromDate","toDate","days"]',
    customFields: JSON.stringify([{ key: field, label: field, type: 'text', required: true }]), isConfidential: code === 'LEAVE_UNPAID', isActive: true })
  await profile('LEAVE_ANNUAL', chainA.id, 'leave_calendar_balance', alice.employeeId, 'annualReason')
  await profile('LEAVE_UNPAID', chainB.id, 'leave_calendar_payroll', bob.employeeId, 'unpaidReason')
  legacyA = await repos.Request.save({ typeCode: 'LEAVE_ANNUAL', requesterId: alice.employeeId, createdByUserId: alice.id, branchId: branch.id,
    status: 'DRAFT', payload: JSON.stringify({ fromDate: '2026-09-15', toDate: '2026-09-15', days: 1, annualReason: 'Annual custom data' }) })
  legacyB = await repos.Request.save({ typeCode: 'LEAVE_UNPAID', requesterId: bob.employeeId, createdByUserId: bob.id, branchId: branch.id,
    status: 'DRAFT', payload: JSON.stringify({ fromDate: '2026-09-16', toDate: '2026-09-16', days: 1, unpaidReason: 'Unpaid custom data' }) })
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_recovery_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})

test('NAM16/29 migration renames columns and canonicalizes requests without altering profiles/chains/custom fields', async () => {
  const beforeProfiles = await ds.query('SELECT * FROM request_types ORDER BY id')
  const beforeChains = await ds.query('SELECT * FROM approval_chains ORDER BY id')
  const beforeSteps = await ds.query('SELECT * FROM approval_steps ORDER BY id')
  await ds.transaction(async (em) => {
    // Reproduce the old schema in this disposable database, including missing definitionCode.
    await em.query("EXEC sys.sp_rename 'dbo.leaves.leaveTypeCode','leaveType','COLUMN'")
    await em.query("EXEC sys.sp_rename 'dbo.leave_types.balanceType','balanceSource','COLUMN'")
    await em.query('ALTER TABLE dbo.requests DROP COLUMN definitionCode')
    await em.query(migration)
  })
  for (const [id, code, leaveCode] of [[legacyA.id, 'LEAVE_ANNUAL', 'ANNUAL'], [legacyB.id, 'LEAVE_UNPAID', 'UNPAID']]) {
    const row = await repos.Request.findOneBy({ id })
    assert.equal(row.typeCode, 'LEAVE'); assert.equal(row.definitionCode, code)
    assert.equal(JSON.parse(row.payload).leaveTypeCode, leaveCode)
    assert.equal(JSON.parse(row.payload).leaveType, leaveCode)
  }
  assert.deepEqual(await ds.query('SELECT * FROM request_types ORDER BY id'), beforeProfiles)
  assert.deepEqual(await ds.query('SELECT * FROM approval_chains ORDER BY id'), beforeChains)
  assert.deepEqual(await ds.query('SELECT * FROM approval_steps ORDER BY id'), beforeSteps)
  const first = await ds.query('SELECT * FROM requests ORDER BY id')
  await ds.transaction(em => em.query(migration))
  assert.deepEqual(await ds.query('SELECT * FROM requests ORDER BY id'), first, 'rerun is idempotent')
})

test('NAM16 migrated requests keep distinct branch chains, custom fields, audience and execution handlers', async () => {
  const a = await request(alice, 'POST', `/requests/${legacyA.id}/submit`)
  const b = await request(bob, 'POST', `/requests/${legacyB.id}/submit`)
  assert.equal(a.status, 201, JSON.stringify(a.body)); assert.equal(b.status, 201, JSON.stringify(b.body))
  assert.equal(JSON.parse(a.body.resolvedSteps)[0].role, 'hr', 'profile A retains its branch override')
  assert.equal(JSON.parse(b.body.resolvedSteps)[0].role, 'executive', 'profile B retains different chain')
  for (const result of [a, b]) assert.equal((await request(admin, 'POST', `/requests/${result.body.id}/act`, { action: 'APPROVE' })).status, 201)
  const annual = await repos.Leave.findOneBy({ requestId: legacyA.id }), unpaid = await repos.Leave.findOneBy({ requestId: legacyB.id })
  assert.equal(annual.leaveTypeCode, 'ANNUAL'); assert.equal(annual.isUnpaid, false)
  assert.equal(unpaid.leaveTypeCode, 'UNPAID'); assert.equal(unpaid.isUnpaid, true)
  assert.equal(Number((await repos.LeaveBalance.findOneBy({ employeeId: alice.employeeId, balanceType: 'annual', period: '2026' })).taken), 1)
  assert.equal(await repos.LeaveBalance.countBy({ employeeId: bob.employeeId }), 0, 'no-balance profile does not mutate balances')
  const scopedLog = await request(hr, 'GET', '/requests/all')
  assert.equal(scopedLog.body.find(r => r.id === legacyB.id).confidentialMasked, true, 'confidential flag belongs to exact definition')
  const legacyFilter = await request(admin, 'GET', '/requests/all?typeCode=LEAVE_ANNUAL')
  assert.ok(legacyFilter.body.length > 0)
  assert.ok(legacyFilter.body.every(r => r.definitionCode === 'LEAVE_ANNUAL'))
  const blocked = await request(bob, 'POST', '/requests', { typeCode: 'LEAVE', definitionCode: 'LEAVE_ANNUAL', submit: true,
    payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-09-17', toDate: '2026-09-17', days: 1, annualReason: 'x' } })
  assert.equal(blocked.status, 403, 'profile audience remains authoritative')
  const noCustom = await request(alice, 'POST', '/requests', { typeCode: 'LEAVE_ANNUAL', submit: true,
    payload: { fromDate: '2026-09-17', toDate: '2026-09-17', days: 1 } })
  assert.equal(noCustom.status, 400, 'legacy custom required field retained')
})

test('NAM16 catalog has one LEAVE key and preserves all permitted profiles without granting another audience', async () => {
  const all = await request(admin, 'GET', '/requests/types'), personal = await request(alice, 'GET', '/requests/types')
  assert.equal(all.status, 200); assert.equal(all.body.filter(t => t.code === 'LEAVE').length, 1)
  assert.equal(new Set(all.body.map(t => t.code)).size, all.body.length, 'safe unique keys for UI Map/selection')
  const group = all.body.find(t => t.code === 'LEAVE')
  assert.deepEqual(group.leaveProfiles.map(p => p.definitionCode).sort(), ['LEAVE_ANNUAL', 'LEAVE_UNPAID'])
  assert.equal(group.requiresDefinitionSelection, true)
  assert.ok(group.leaveProfiles.find(p => p.definitionCode === 'LEAVE_UNPAID').customFields.includes('unpaidReason'))
  assert.deepEqual(personal.body.find(t => t.code === 'LEAVE').leaveProfiles.map(p => p.definitionCode), ['LEAVE_ANNUAL'])
})

test('NAM16 old create verbs work, canonical writes persist, return/resubmit aliases work and profile mismatch rejects', async () => {
  const made = await request(alice, 'POST', '/requests', { typeCode: 'LEAVE_ANNUAL', submit: true,
    payload: { fromDate: '2026-09-17', toDate: '2026-09-17', days: 1, annualReason: 'legacy client' } })
  assert.equal(made.status, 201, JSON.stringify(made.body)); assert.equal(made.body.typeCode, 'LEAVE')
  assert.equal(made.body.definitionCode, 'LEAVE_ANNUAL')
  await request(admin, 'POST', `/requests/${made.body.id}/act`, { action: 'RETURN', comment: 'Complete details' })
  const again = await request(alice, 'POST', `/requests/${made.body.id}/resubmit`, { payload: { leaveType: 'ANNUAL', annualReason: 'updated' } })
  assert.equal(again.status, 201, JSON.stringify(again.body)); assert.equal(JSON.parse(again.body.payload).leaveTypeCode, 'ANNUAL')
  const bad = await request(alice, 'POST', '/requests', { typeCode: 'LEAVE', definitionCode: 'LEAVE_ANNUAL', submit: false,
    payload: { leaveTypeCode: 'UNPAID' } })
  assert.equal(bad.status, 400)
  const conflict = await request(alice, 'POST', '/requests', { typeCode: 'LEAVE_ANNUAL', payload: { leaveType: 'ANNUAL', leaveTypeCode: 'UNPAID' } })
  assert.equal(conflict.status, 400)
})

test('NAM26/29 canonical resource routes retain old aliases, columns and permissions remain compatible', async () => {
  for (const [modern, legacy, user] of [['/leaves/types', '/requests/leave-types', alice], ['/leaves/mine', '/requests/my-leaves', alice],
    ['/leaves/balances/mine', '/requests/leave-balances/mine', alice], ['/leaves/balances', '/requests/leave-balances', hr],
    [`/leaves/balances/${alice.employeeId}`, `/requests/leave-balances/${alice.employeeId}`, hr]]) {
    const a = await request(user, 'GET', modern), b = await request(user, 'GET', legacy)
    assert.equal(a.status, 200, modern); assert.deepEqual(a.body, b.body)
  }
  assert.equal((await request(hr, 'GET', `/leaves/balances/${outsider.employeeId}`)).status, 404)
  assert.equal((await request(alice, 'GET', '/leaves/balances')).status, 403)
  const list = await request(hr, 'GET', '/leaves?leaveTypeCode=ANNUAL')
  assert.equal(list.body.items[0].leaveTypeCode, 'ANNUAL'); assert.equal(list.body.items[0].leaveType, 'ANNUAL')
  const lt = await request(admin, 'POST', '/settings/leave-types', { code: 'ALIAS', nameAr: 'Alias type', balanceSource: 'sick' })
  assert.equal(lt.status, 201); assert.equal(lt.body.balanceType, 'sick'); assert.equal(lt.body.balanceSource, 'sick')
  assert.equal((await request(admin, 'PATCH', `/settings/leave-types/${lt.body.id}`, { balanceType: 'none' })).body.balanceSource, 'none')
  assert.equal((await request(admin, 'PATCH', `/settings/leave-types/${lt.body.id}`, { balanceType: 'annual', balanceSource: 'sick' })).status, 400)
  for (const action of ['acknowledge', 'reject', 'handover', 'transfer', 'manager-confirm']) {
    const input = action === 'reject' ? { reason: 'رفض الاستلام' } : action === 'transfer' ? { toEmployeeId: bob.employeeId } : undefined
    const a = await request(admin, 'POST', `/custody/99999/${action}`, input)
    const b = await request(admin, 'POST', `/requests/custody/99999/${action}`, input)
    assert.equal(a.status, b.status); assert.deepEqual(a.body, b.body)
  }
})

test('NAM16 migration refuses conflicting payloads and orphan profiles without partial updates', async () => {
  for (const [typeCode, definitionCode, payload] of [['LEAVE', 'LEAVE_ANNUAL', '{"leaveType":"UNPAID"}'],
    ['LEAVE_MISSING', null, '{}'], ['LEAVE', 'LEAVE_ANNUAL', '{"leaveType":"ANNUAL","leaveTypeCode":"UNPAID"}'],
    ['LEAVE', 'LEAVE_ANNUAL', 'invalid json']]) {
    const bad = await repos.Request.save({ typeCode, definitionCode, requesterId: alice.employeeId, branchId: branch.id, status: 'DRAFT', payload })
    const before = await ds.query('SELECT * FROM requests ORDER BY id')
    await assert.rejects(ds.transaction(em => em.query(migration)))
    assert.deepEqual(await ds.query('SELECT * FROM requests ORDER BY id'), before)
    await repos.Request.delete(bad.id)
  }
})
