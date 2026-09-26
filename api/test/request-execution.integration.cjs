// Run: node --test api/test/request-execution.integration.cjs
// Creates its own SQL Server database. Never seeds or changes the configured database.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_recovery_test_${crypto.randomBytes(8).toString('hex')}`
const secret = crypto.randomBytes(48).toString('hex')
let master, app, ds, base, created = false
let admin, hr, employee, outsider, branch, otherBranch, emp, otherEmp
const repos = {}
const { JwtService } = require('../node_modules/@nestjs/jwt')
const jwt = new JwtService({ secret })
function token(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, url, body) {
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${typeof user === 'string' ? user : token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql', 'This suite requires SQL Server')
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME || 'sa', password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test' })
  const { NestFactory } = require('../node_modules/@nestjs/core')
  const { ValidationPipe } = require('../node_modules/@nestjs/common')
  const { AppModule } = require('../src/app.module')
  app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource)
  for (const [name, file] of Object.entries({ User: 'auth/user.entity', Branch: 'org/entities/branch.entity',
    Employee: 'employees/employee.entity', Leave: 'requests/entities/leave.entities',
    AttendanceDay: 'attendance/attendance.entities', OffboardingCase: 'offboarding/offboarding.entities',
    SettlementLine: 'offboarding/offboarding.entities', NotificationRead: 'assets/notification-read.entity',
    Request: 'requests/entities/request.entity', RequestType: 'requests/entities/request-type.entity',
    ApprovalChain: 'requests/entities/approval-chain.entity', ApprovalStep: 'requests/entities/approval-step.entity',
    Loan: 'requests/entities/financial.entities', LoanInstallment: 'requests/entities/financial.entities',
    LeaveBalance: 'requests/entities/leave.entities', RequestsConfig: 'requests/entities/requests-config.entity',
    OvertimeEntry: 'requests/entities/attendance.entities', LetterRequest: 'requests/entities/letter.entities',
    ClearanceItem: 'offboarding/offboarding.entities' })) {
    repos[name] = ds.getRepository(require(`../src/${file}`)[name])
  }
  // weekendDays=null للفرع = إعداد النظام؛ النص الفارغ يرفضه فحص لقطة التقويم كما يرفضه API الفروع
  branch = await repos.Branch.save({ name: 'Test A', code: 'TEST_A', weekendDays: null })
  otherBranch = await repos.Branch.save({ name: 'Test B', code: 'TEST_B', weekendDays: null })
  emp = await repos.Employee.save({ employeeCode: 'TEST001', fullName: 'Recovery employee', branchId: branch.id,
    joinDate: '2020-01-01', basicSalary: 6000, status: 'active' })
  otherEmp = await repos.Employee.save({ employeeCode: 'TEST002', fullName: 'Other branch', branchId: otherBranch.id,
    joinDate: '2020-01-01', basicSalary: 9000, status: 'active' })
  const makeUser = (email, role, branchId, employeeId, permissions = []) => repos.User.save({ email, role, branchId,
    employeeId, displayName: email, passwordHash: 'unused-in-token-tests', permissions: JSON.stringify(permissions) })
  admin = await makeUser('admin@test.invalid', 'super_admin', null, null)
  hr = await makeUser('hr@test.invalid', 'hr_manager', branch.id, null,
    ['employees.view', 'employees.edit', 'offboarding.manage', 'settlement.edit', 'settings.manage', 'users.manage'])
  employee = await makeUser('employee@test.invalid', 'employee', branch.id, emp.id)
  outsider = await makeUser('other@test.invalid', 'employee', otherBranch.id, otherEmp.id)
}, { timeout: 60000 })
after(async () => {
  if (app) await app.close()
  if (created && master) {
    assert.match(database, /^hr_recovery_test_[a-f0-9]{16}$/)
    assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})

let sequence = 0
const repo = (name, file) => ds.getRepository(require(`../src/${file}`)[name])
const employeesRepo = () => repos.Employee
const histories = () => repo('EmployeeStatusHistory', 'requests/entities/employment.entities')
const transfers = () => repo('Transfer', 'requests/entities/employment.entities')
const overrides = () => repo('ScheduleDayOverride', 'attendance/attendance.entities')
async function person(extra = {}, branchId = branch.id) {
  sequence++
  const employee = await employeesRepo().save({ employeeCode: `EX${sequence}`, fullName: `Execution employee ${sequence}`,
    branchId, joinDate: '2020-01-01', contractType: 'fixed_term', contractStart: '2025-01-01', contractEnd: '2025-12-31',
    contractDurationMonths: 12, jobTitle: 'Original title', status: 'active', ...extra })
  const user = await repos.User.save({ email: `execution${sequence}@test.invalid`, role: 'employee', branchId,
    employeeId: employee.id, displayName: employee.fullName, passwordHash: 'unused' })
  return { employee, user }
}
async function requestType(code, destinationHandler, requiredFields = []) {
  const existing = await repos.RequestType.findOneBy({ code })
  if (existing) return existing
  const chain = await repos.ApprovalChain.save({ code: `CHAIN_${code}`, nameAr: code, isActive: true, autoApprove: true })
  return repos.RequestType.save({ code, nameAr: code, category: 'employment_status', destinationHandler,
    approvalChainId: chain.id, isActive: true, requiredFields: JSON.stringify(requiredFields) })
}
async function submit(user, code, payload) {
  return request(user, 'POST', '/requests', { typeCode: code, payload, submit: true })
}
const destinationService = () => app.get(require('../src/requests/destinations.service').DestinationsService)
const requestService = () => app.get(require('../src/requests/requests.service').RequestsService)
async function makeTeam(name, branchId = branch.id, managerId = null) {
  const department = await repo('Department', 'org/entities/department.entity').save({ name: name + ' department', branchId, managerEmployeeId: managerId })
  const team = await repo('Team', 'org/entities/team.entity').save({ name, departmentId: department.id, leaderEmployeeId: managerId })
  return { team, department }
}

test('TITLE_CHANGE updates the employee and writes a complete audit; invalid/no-op titles never submit', async () => {
  await requestType('TITLE_CHANGE', 'employee_update')
  const { employee, user } = await person()
  const before = await repos.Request.count()
  for (const toTitle of ['', '<bad>', 'X'.repeat(101)]) {
    assert.equal((await submit(user, 'TITLE_CHANGE', { toTitle })).status, 400)
  }
  assert.equal(await repos.Request.count(), before)
  const title = 'A'.repeat(100)
  const result = await submit(user, 'TITLE_CHANGE', { toTitle: title })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.status, 'COMPLETED')
  assert.match(result.body.destinationRef, /^TITLE-/)
  assert.equal((await employeesRepo().findOneBy({ id: employee.id })).jobTitle, title)
  const audit = await histories().findOneBy({ requestId: result.body.id })
  assert.equal(audit.changeType, 'TITLE')
  assert.equal(audit.newValue, title, 'full title stays structured without SQL legacy-column truncation')
  assert.equal(audit.oldStatus, null)
  assert.equal(audit.newStatus, 'change')
  const view = await request(hr, 'GET', `/employees/${employee.id}/history`)
  assert.equal(view.status, 200)
  assert.equal(view.body.find(row => row.id === audit.id).newStatus, 'jobTitle:' + title)
  assert.equal((await submit(user, 'TITLE_CHANGE', { toTitle: title })).status, 400)
})

test('future title changes wait for their effective date and scheduled execution is idempotent', async () => {
  await requestType('TITLE_CHANGE', 'employee_update')
  const { employee, user } = await person()
  const result = await submit(user, 'TITLE_CHANGE', { toTitle: 'Scheduled title', effectiveDate: '2099-01-01' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.status, 'IN_EXECUTION')
  assert.equal((await employeesRepo().findOneBy({ id: employee.id })).jobTitle, 'Original title')
  assert.equal((await submit(user, 'TITLE_CHANGE', { toTitle: 'Conflicting title', effectiveDate: '2099-02-01' })).status, 400)
  await repos.Request.update(result.body.id, { payload: JSON.stringify({ toTitle: 'Scheduled title', effectiveDate: '2026-01-01' }) })
  assert.equal((await requestService().runScheduledTransfers()).employmentExecuted, 1)
  assert.equal((await requestService().runScheduledTransfers()).employmentExecuted, 0)
  assert.equal((await employeesRepo().findOneBy({ id: employee.id })).jobTitle, 'Scheduled title')
  assert.equal(await histories().countBy({ requestId: result.body.id }), 1)
})

test('contract renewal and type change update dated contract data with audit and preserve employee tenure', async () => {
  await requestType('CONTRACT_RENEWAL', 'contracts_register')
  await requestType('CONTRACT_TYPE_CHANGE', 'contracts_register')
  const { employee, user } = await person()
  const renewal = await submit(user, 'CONTRACT_RENEWAL', { contractStart: '2026-01-01', contractEnd: '2026-12-31', contractNumber: 'R-2026' })
  assert.equal(renewal.status, 201, JSON.stringify(renewal.body))
  assert.equal(renewal.body.status, 'COMPLETED')
  const renewed = await employeesRepo().findOneBy({ id: employee.id })
  assert.equal(renewed.contractStart, '2026-01-01')
  assert.equal(renewed.contractEnd, '2026-12-31')
  assert.equal(renewed.contractNumber, 'R-2026')
  assert.equal(renewed.joinDate, '2020-01-01')
  assert.equal(renewed.contractDurationMonths, null, 'old duration must not describe the new dates')
  assert.ok(await histories().countBy({ requestId: renewal.body.id }) >= 3)
  const permanent = await submit(user, 'CONTRACT_TYPE_CHANGE', { contractType: 'permanent' })
  assert.equal(permanent.status, 201, JSON.stringify(permanent.body))
  assert.equal((await employeesRepo().findOneBy({ id: employee.id })).contractEnd, null)
  assert.equal((await submit(user, 'CONTRACT_RENEWAL', { contractStart: '2027-01-01', contractEnd: '2027-12-31' })).status, 400)
})

test('contract validation rejects impossible/overlapping dates and future contracts wait without changing the current contract', async () => {
  const { employee, user } = await person()
  for (const payload of [{}, { contractStart: '2026-02-30', contractEnd: '2026-12-31' },
    { contractStart: '2025-12-01', contractEnd: '2026-12-31' }, { contractStart: '2026-01-01', contractEnd: '2025-12-31' }]) {
    assert.equal((await submit(user, 'CONTRACT_RENEWAL', payload)).status, 400)
  }
  const result = await submit(user, 'CONTRACT_RENEWAL', { contractStart: '2099-01-01', contractEnd: '2099-12-31' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.status, 'IN_EXECUTION')
  assert.equal((await employeesRepo().findOneBy({ id: employee.id })).contractEnd, '2025-12-31')
  assert.equal(await histories().countBy({ requestId: result.body.id }), 0)
})

async function swapPair() {
  const first = await person()
  const second = await person()
  const shiftRepo = repo('Shift', 'assets/assets.entities')
  const early = await shiftRepo.save({ name: 'Early ' + sequence, startTime: '08:00', endTime: '16:00' })
  const late = await shiftRepo.save({ name: 'Late ' + sequence, startTime: '22:00', endTime: '06:00' })
  const schedule = repo('ScheduleEntry', 'attendance/attendance.entities')
  await schedule.save([
    { employeeId: first.employee.id, weekStart: '2026-09-06', shiftId: early.id, shiftName: early.name, startTime: early.startTime, endTime: early.endTime },
    { employeeId: second.employee.id, weekStart: '2026-09-06', shiftId: late.id, shiftName: late.name, startTime: late.startTime, endTime: late.endTime },
  ])
  return { first, second, early, late }
}

test('SHIFT_SWAP writes both dates atomically, recalculates both employees, and rejects duplicate employee/date targets', async () => {
  await requestType('SHIFT_SWAP', 'shift_schedule')
  const { first, second, early, late } = await swapPair()
  const attendance = app.get(require('../src/attendance/attendance.service').AttendanceService)
  await attendance.computeDay(first.employee.id, '2026-09-07')
  await attendance.computeDay(second.employee.id, '2026-09-08')
  const result = await submit(first.user, 'SHIFT_SWAP', { date: '2026-09-07', withDate: '2026-09-08', withEmployeeId: second.employee.id })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.status, 'COMPLETED')
  assert.equal((await overrides().findOneBy({ employeeId: first.employee.id, date: '2026-09-07' })).shiftId, late.id)
  assert.equal((await overrides().findOneBy({ employeeId: second.employee.id, date: '2026-09-08' })).shiftId, early.id)
  assert.equal((await repos.AttendanceDay.findOneBy({ employeeId: first.employee.id, date: '2026-09-07' })).shiftStart, '22:00')
  assert.equal((await repos.AttendanceDay.findOneBy({ employeeId: second.employee.id, date: '2026-09-08' })).shiftStart, '08:00')
  assert.equal(await histories().countBy({ requestId: result.body.id }), 2)
  assert.equal((await submit(first.user, 'SHIFT_SWAP', { date: '2026-09-07', withEmployeeId: second.employee.id })).status, 400)
})

test('SHIFT_SWAP rejects self swaps, unknown/inactive/outside-branch employees, invalid dates, and approved leave', async () => {
  const { first, second } = await swapPair()
  for (const payload of [{ date: '2026-09-07', withEmployeeId: first.employee.id },
    { date: '2026-02-30', withEmployeeId: second.employee.id }, { date: '2026-09-07', withEmployeeId: 999999 }]) {
    assert.equal((await submit(first.user, 'SHIFT_SWAP', payload)).status, 400)
  }
  assert.equal((await submit(first.user, 'SHIFT_SWAP', { date: '2026-09-07', withEmployeeId: otherEmp.id })).status, 403)
  await repos.Leave.save({ employeeId: second.employee.id, leaveTypeCode: 'ANNUAL', fromDate: '2026-09-07', toDate: '2026-09-07', days: 1, status: 'APPROVED' })
  assert.equal((await submit(first.user, 'SHIFT_SWAP', { date: '2026-09-07', withEmployeeId: second.employee.id })).status, 400)
  assert.equal(await overrides().countBy({ employeeId: first.employee.id }), 0)
})

test('a failure after both shift writes rolls back overrides and audit rows together', async () => {
  const type = await requestType('SHIFT_SWAP', 'shift_schedule')
  const { first, second } = await swapPair()
  const req = { id: 909001, requesterId: first.employee.id, branchId: branch.id, typeCode: type.code,
    payload: JSON.stringify({ date: '2026-09-07', withEmployeeId: second.employee.id }) }
  await assert.rejects(ds.transaction(async em => {
    await destinationService().execute(em, req, type)
    assert.equal(await em.getRepository(overrides().target).countBy({ employeeId: first.employee.id }), 1)
    throw new Error('forced rollback after writes')
  }), /forced rollback/)
  assert.equal(await overrides().countBy({ employeeId: first.employee.id }), 0)
  assert.equal(await overrides().countBy({ employeeId: second.employee.id }), 0)
  assert.equal(await histories().countBy({ requestId: req.id }), 0)
})

test('TEAM_TRANSFER checks the target employee custody and enforces on-behalf permission', async () => {
  await requestType('TEAM_TRANSFER', 'transfers_effective_date')
  const target = await person()
  const unrelated = await person()
  const { team } = await makeTeam('Custody target team')
  const payload = { employeeId: target.employee.id, toTeamId: team.id, effectiveDate: '2026-09-01' }
  assert.equal((await submit(unrelated.user, 'TEAM_TRANSFER', payload)).status, 403)
  const custody = repo('CustodyAssignment', 'requests/entities/custody.entities')
  const row = await custody.save({ employeeId: target.employee.id, assetId: 99999, status: 'ACTIVE' })
  const blocked = await submit(admin, 'TEAM_TRANSFER', payload)
  assert.equal(blocked.status, 400, JSON.stringify(blocked.body))
  assert.match(blocked.body.message, /عهدة/)
  await custody.delete(row.id)
  const result = await submit(admin, 'TEAM_TRANSFER', payload)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  assert.equal(result.body.requesterId, target.employee.id)
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).teamId, team.id)
  assert.equal((await transfers().findOneBy({ requestId: result.body.id })).fromTeam, null)
  const history = await request(admin, 'GET', '/transfers')
  assert.equal(history.status, 200, JSON.stringify(history.body))
  assert.equal(history.body.find(t => t.requestId === result.body.id).fromTeamName, 'بدون فريق')
})

test('transfer changes team, department, branch, direct manager and login scope in one transaction', async () => {
  const target = await person()
  const manager = await person({}, otherBranch.id)
  const { team, department } = await makeTeam('Destination branch team', otherBranch.id, manager.employee.id)
  const result = await submit(admin, 'TEAM_TRANSFER', { employeeId: target.employee.id, toTeamId: team.id, effectiveDate: '2026-09-01' })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const updated = await employeesRepo().findOneBy({ id: target.employee.id })
  assert.equal(updated.teamId, team.id)
  assert.equal(updated.departmentId, department.id)
  assert.equal(updated.branchId, otherBranch.id)
  assert.equal(updated.managerEmployeeId, manager.employee.id)
  const login = await repos.User.findOneBy({ id: target.user.id })
  assert.equal(login.branchId, otherBranch.id)
  assert.equal(login.tokenVersion, 1)
  assert.equal((await request(target.user, 'GET', '/attendance/my-today')).status, 401, 'old branch token must be revoked')
  assert.equal(await histories().countBy({ requestId: result.body.id }), 4)
})

test('duplicate scheduled transfers and a second executed transfer on the same date are rejected', async () => {
  await requestType('TEAM_TRANSFER', 'transfers_effective_date')
  const target = await person()
  const one = await makeTeam('First transfer team')
  const two = await makeTeam('Second transfer team')
  const scheduled = await submit(admin, 'TEAM_TRANSFER', { employeeId: target.employee.id, toTeamId: one.team.id, effectiveDate: '2099-01-01' })
  assert.equal(scheduled.status, 201, JSON.stringify(scheduled.body))
  assert.equal(scheduled.body.status, 'IN_EXECUTION')
  assert.equal((await submit(admin, 'TEAM_TRANSFER', { employeeId: target.employee.id, toTeamId: two.team.id, effectiveDate: '2099-02-01' })).status, 400)
  const transfer = await transfers().findOneBy({ requestId: scheduled.body.id })
  await transfers().update(transfer.id, { effectiveDate: '2026-09-01' })
  assert.equal((await requestService().runScheduledTransfers()).executed, 1)
  assert.equal((await requestService().runScheduledTransfers()).executed, 0)
  assert.equal((await submit(admin, 'TEAM_TRANSFER', { employeeId: target.employee.id, toTeamId: two.team.id, effectiveDate: '2026-09-01' })).status, 400)
})

test('new handlers reject incompatible request codes instead of silently completing', async () => {
  for (const destinationHandler of ['employee_update', 'contracts_register', 'shift_schedule']) {
    assert.equal(destinationService().supports({ code: 'UNRELATED_TYPE', destinationHandler }), false)
  }
})

test('private attachment references cannot grant access through a request; owner and employee attachments are accepted', async () => {
  await requestType('TEST_ATTACHMENT', 'none', ['attachmentUrl'])
  const first = await person()
  const second = await person()
  const files = repo('StoredFile', 'files/stored-file.entity')
  const privateFile = await files.save({ originalName: 'private.pdf', storedName: 'isolated-fixture.pdf', mime: 'application/pdf', size: 1,
    employeeId: second.employee.id, uploadedBy: second.user.id })
  const before = await repos.Request.count()
  assert.equal((await submit(first.user, 'TEST_ATTACHMENT', { attachmentUrl: `file:${privateFile.id}` })).status, 403)
  assert.equal((await submit(first.user, 'TEST_ATTACHMENT', { attachmentUrl: `file:9999999` })).status, 403)
  assert.equal(await repos.Request.count(), before)
  assert.equal((await submit(second.user, 'TEST_ATTACHMENT', { attachmentUrl: `file:${privateFile.id}` })).status, 201)
  const ownUpload = await files.save({ originalName: 'own.pdf', storedName: 'isolated-fixture-2.pdf', mime: 'application/pdf', size: 1, uploadedBy: first.user.id })
  assert.equal((await submit(first.user, 'TEST_ATTACHMENT', { attachmentUrl: `file:${ownUpload.id}` })).status, 201)
})

test('old catalogs expose required contract fields and optional letter purpose without a database seed', async () => {
  await requestType('LETTER_SALARY', 'letter_pdf_generator')
  const { user } = await person()
  const result = await request(user, 'GET', '/requests/types')
  assert.equal(result.status, 200, JSON.stringify(result.body))
  const renewal = result.body.find(t => t.code === 'CONTRACT_RENEWAL')
  assert.ok(JSON.parse(renewal.requiredFields).includes('contractStart'))
  assert.ok(JSON.parse(renewal.customFields).some(f => f.key === 'contractEnd' && f.type === 'date'))
  const letter = result.body.find(t => t.code === 'LETTER_SALARY')
  assert.equal(letter.autoGeneratesPdf, true)
  assert.ok(JSON.parse(letter.customFields).some(f => f.key === 'purpose'))
})

async function activeCustody() {
  const owner = await person()
  const target = await person()
  const asset = await repo('Asset', 'requests/entities/custody.entities').save({ name: 'Laptop ' + sequence, category: 'IT', status: 'ASSIGNED', currentHolderId: owner.employee.id })
  const assignment = await repo('CustodyAssignment', 'requests/entities/custody.entities').save({ assetId: asset.id, employeeId: owner.employee.id, status: 'ACTIVE' })
  return { owner, target, asset, assignment }
}

test('custody transfer retains the current holder until recipient acceptance and manager confirmation', async () => {
  const { owner, target, asset, assignment } = await activeCustody()
  const transfer = await request(admin, 'POST', `/requests/custody/${assignment.id}/transfer`, { toEmployeeId: target.employee.id })
  assert.equal(transfer.status, 201, JSON.stringify(transfer.body))
  const assets = repo('Asset', 'requests/entities/custody.entities')
  const assignments = repo('CustodyAssignment', 'requests/entities/custody.entities')
  assert.equal((await assets.findOneBy({ id: asset.id })).currentHolderId, owner.employee.id)
  assert.equal((await assignments.findOneBy({ id: assignment.id })).status, 'ACTIVE')
  assert.equal((await request(admin, 'POST', `/requests/custody/${assignment.id}/transfer`, { toEmployeeId: target.employee.id })).status, 400)
  assert.equal((await request(owner.user, 'POST', `/requests/custody/${assignment.id}/handover`)).status, 400)
  assert.equal((await request(target.user, 'POST', `/requests/custody/${transfer.body.id}/acknowledge`)).status, 201)
  assert.equal((await assets.findOneBy({ id: asset.id })).currentHolderId, owner.employee.id)
  const confirmation = await request(admin, 'POST', `/requests/custody/${transfer.body.id}/manager-confirm`)
  assert.equal(confirmation.status, 201, JSON.stringify(confirmation.body))
  assert.equal((await assets.findOneBy({ id: asset.id })).currentHolderId, target.employee.id)
  assert.equal((await assignments.findOneBy({ id: assignment.id })).status, 'TRANSFERRED')
  assert.equal((await assignments.findOneBy({ id: transfer.body.id })).status, 'ACTIVE')
})

test('recipient can reject a transfer and the original holder retains the asset; unrelated employees cannot reject', async () => {
  const { owner, target, asset, assignment } = await activeCustody()
  const transfer = await request(admin, 'POST', `/requests/custody/${assignment.id}/transfer`, { toEmployeeId: target.employee.id })
  assert.equal((await request(employee, 'POST', `/requests/custody/${transfer.body.id}/reject`, { reason: 'Not mine' })).status, 403)
  const rejection = await request(target.user, 'POST', `/requests/custody/${transfer.body.id}/reject`, { reason: 'لم أستلم هذا الأصل' })
  assert.equal(rejection.status, 201, JSON.stringify(rejection.body))
  assert.equal(rejection.body.status, 'REJECTED')
  assert.equal((await repo('Asset', 'requests/entities/custody.entities').findOneBy({ id: asset.id })).currentHolderId, owner.employee.id)
  assert.equal((await repo('CustodyAssignment', 'requests/entities/custody.entities').findOneBy({ id: assignment.id })).status, 'ACTIVE')
  assert.equal((await request(target.user, 'POST', `/requests/custody/${transfer.body.id}/acknowledge`)).status, 400)
})

test('incorrect initial custody assignment can be rejected and returns the asset to inventory', async () => {
  const target = await person()
  const assets = repo('Asset', 'requests/entities/custody.entities')
  const asset = await assets.save({ name: 'Wrong assignment ' + sequence, category: 'IT', status: 'AVAILABLE' })
  const assignment = await repo('CustodyAssignment', 'requests/entities/custody.entities').save({ assetId: asset.id, employeeId: target.employee.id, status: 'PENDING_ACK' })
  assert.equal((await request(target.user, 'POST', `/requests/custody/${assignment.id}/reject`, { reason: 'لم أطلب هذه العهدة' })).status, 201)
  const updated = await assets.findOneBy({ id: asset.id })
  assert.equal(updated.currentHolderId, null)
  assert.equal(updated.status, 'AVAILABLE')
})

test('custody transfer enforces the officer branch and request owner before any write', async () => {
  const { owner, target, assignment } = await activeCustody()
  const officer = await repos.User.save({ email: 'officer-other@test.invalid', displayName: 'Other officer', passwordHash: 'unused',
    role: 'hr_manager', branchId: otherBranch.id, permissions: JSON.stringify(['custody.assign']) })
  // تدقيق الأدوار D3: عهدة موظف خارج نطاق أمين العهدة = نفس رد الإسناد الغايب بالحرف (كان 403 فبيفشّي وجودها)
  const foreignTransfer = await request(officer, 'POST', `/requests/custody/${assignment.id}/transfer`, { toEmployeeId: target.employee.id })
  const missingTransfer = await request(officer, 'POST', '/requests/custody/99999999/transfer', { toEmployeeId: target.employee.id })
  assert.deepEqual([foreignTransfer.status, foreignTransfer.body], [404, missingTransfer.body])
  await requestType('CUSTODY_TRANSFER', 'custody_transfer', ['assignmentId', 'toEmployeeId'])
  assert.equal((await submit(target.user, 'CUSTODY_TRANSFER', { assignmentId: assignment.id, toEmployeeId: emp.id })).status, 403)
  const result = await submit(owner.user, 'CUSTODY_TRANSFER', { assignmentId: assignment.id, toEmployeeId: target.employee.id })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const recipient = await repo('CustodyAssignment', 'requests/entities/custody.entities').findOneBy({ requestId: result.body.id })
  await request(target.user, 'POST', `/requests/custody/${recipient.id}/reject`, { reason: 'لم أستلم الأصل' })
  assert.equal((await repos.Request.findOneBy({ id: result.body.id })).status, 'REJECTED')
})

test('forged attachment references are also rejected when saving drafts', async () => {
  const first = await person()
  const second = await person()
  const file = await repo('StoredFile', 'files/stored-file.entity').save({ originalName: 'private.pdf', storedName: 'draft-fixture.pdf', mime: 'application/pdf', size: 1, uploadedBy: second.user.id, employeeId: second.employee.id })
  const before = await repos.Request.count()
  const response = await request(first.user, 'POST', '/requests', { typeCode: 'TEST_ATTACHMENT', submit: false, payload: { attachmentUrl: `file:${file.id}` } })
  assert.equal(response.status, 403)
  assert.equal(await repos.Request.count(), before)
})

test('an approved custody return cannot bypass a pending transfer or return somebody else\'s assignment', async () => {
  const { owner, target, assignment, asset } = await activeCustody()
  const transfer = await request(admin, 'POST', `/requests/custody/${assignment.id}/transfer`, { toEmployeeId: target.employee.id })
  const type = await requestType('CUSTODY_RETURN', 'custody_assignments', ['assignmentId'])
  const result = await submit(owner.user, type.code, { assignmentId: assignment.id })
  assert.equal(result.status, 400, JSON.stringify(result.body))
  assert.equal((await repo('Asset', 'requests/entities/custody.entities').findOneBy({ id: asset.id })).currentHolderId, owner.employee.id)
  assert.equal((await submit(target.user, type.code, { assignmentId: assignment.id })).status, 400)
  assert.equal((await request(target.user, 'POST', `/requests/custody/${transfer.body.id}/reject`, { reason: 'إلغاء النقل قبل الإرجاع' })).status, 201)
  const returned = await submit(owner.user, type.code, { assignmentId: assignment.id })
  assert.equal(returned.status, 201, JSON.stringify(returned.body))
  assert.equal((await repo('Asset', 'requests/entities/custody.entities').findOneBy({ id: asset.id })).status, 'AVAILABLE')
})

test('concurrent cancellation of the same leave restores its balance only once', async () => {
  const { employee } = await person()
  const leaveType = repo('LeaveType', 'requests/entities/leave.entities')
  await leaveType.save({ code: 'CANCEL_RACE', nameAr: 'Cancellation race', balanceType: 'annual', isPaid: true, isActive: true })
  const balance = await repos.LeaveBalance.save({ employeeId: employee.id, balanceType: 'annual', period: '2026', entitled: 21, taken: 10 })
  const leave = await repos.Leave.save({ employeeId: employee.id, leaveTypeCode: 'CANCEL_RACE', fromDate: '2026-09-01', toDate: '2026-09-05', days: 5, status: 'APPROVED' })
  const type = { code: 'LEAVE_CANCEL', destinationHandler: 'leave_balance_restore' }
  const execute = id => ds.transaction(em => destinationService().execute(em, { id, requesterId: employee.id, payload: JSON.stringify({ leaveId: leave.id }) }, type))
  await Promise.all([execute(919001), execute(919002)])
  assert.equal((await repos.Leave.findOneBy({ id: leave.id })).status, 'CANCELLED')
  assert.equal(Number((await repos.LeaveBalance.findOneBy({ id: balance.id })).taken), 5)
})

test('personal and emergency request forms expose editable fields mapped to their actual destinations', async () => {
  await requestType('PERSONAL_DATA_UPDATE', 'employee_record')
  await requestType('EMERGENCY_CONTACT', 'employee_record_auto', ['name', 'phone'])
  const { employee, user } = await person({ phone: 'original phone' })
  const types = await request(user, 'GET', '/requests/types')
  const personal = types.body.find(t => t.code === 'PERSONAL_DATA_UPDATE')
  assert.deepEqual(JSON.parse(personal.customFields).map(f => f.key), ['phone', 'phoneAlt', 'address', 'maritalStatus'])
  const emergency = types.body.find(t => t.code === 'EMERGENCY_CONTACT')
  assert.deepEqual(JSON.parse(emergency.customFields).map(f => f.key), ['name', 'phone', 'relation', 'phoneAlt'])
  const update = await submit(user, 'EMERGENCY_CONTACT', { name: 'Emergency person', phone: '12345', relation: 'Sibling' })
  assert.equal(update.status, 201, JSON.stringify(update.body))
  const saved = await employeesRepo().findOneBy({ id: employee.id })
  assert.equal(saved.emergencyContactName, 'Emergency person')
  assert.equal(saved.emergencyContactPhone, '12345')
  assert.equal(saved.phone, 'original phone')
})

test('startup catch-up executes overdue transfers and escalations, and concurrent escalation cannot duplicate its audit', async () => {
  await requestType('TEAM_TRANSFER', 'transfers_effective_date')
  const target = await person()
  const { team } = await makeTeam('Startup transfer destination')
  const future = await submit(admin, 'TEAM_TRANSFER', { employeeId: target.employee.id, toTeamId: team.id, effectiveDate: '2099-01-01' })
  assert.equal(future.status, 201, JSON.stringify(future.body))
  const transfer = await transfers().findOneBy({ requestId: future.body.id })
  await transfers().update(transfer.id, { effectiveDate: '2026-01-01' })
  const overdue = await repos.Request.save({ requesterId: target.employee.id, typeCode: 'TEST_ESCALATION', status: 'UNDER_REVIEW', currentStep: 1,
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', dueAt: '2020-01-01T00:00:00.000Z', escalateTo: 'executive', slaDays: 1 }]) })
  const scheduler = app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler)
  await scheduler.catchUp()
  assert.equal((await transfers().findOneBy({ id: transfer.id })).status, 'EXECUTED')
  assert.equal((await repos.Request.findOneBy({ id: future.body.id })).status, 'COMPLETED')
  const approvals = repo('RequestApproval', 'requests/entities/request-approval.entity')
  assert.equal(await approvals.countBy({ requestId: overdue.id, action: 'ESCALATED' }), 1)
  await scheduler.catchUp()
  assert.equal(await approvals.countBy({ requestId: overdue.id, action: 'ESCALATED' }), 1)
  const second = await repos.Request.save({ requesterId: target.employee.id, typeCode: 'TEST_ESCALATION', status: 'UNDER_REVIEW', currentStep: 1,
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', dueAt: '2020-01-01T00:00:00.000Z', escalateTo: 'executive', slaDays: 1 }]) })
  await Promise.all([requestService().runEscalations(), requestService().runEscalations()])
  assert.equal(await approvals.countBy({ requestId: second.id, action: 'ESCALATED' }), 1)
})

test('NAM-31 day and bulk overrides trust the shift ID, retain it after rename, and reject invalid catalog references', async () => {
  const target = await person()
  const shiftRepo = repo('Shift', 'assets/assets.entities')
  const shift = await shiftRepo.save({ name: 'ID-linked override', startTime: '10:00', endTime: '16:00', isActive: true })
  const created = await request(admin, 'POST', '/attendance/schedule/day', {
    employeeId: target.employee.id, date: '2026-09-10', shiftId: shift.id,
    shiftName: 'Untrusted snapshot', startTime: '01:00', endTime: '02:00',
  })
  assert.equal(created.status, 201, JSON.stringify(created.body))
  const stored = await overrides().findOneBy({ employeeId: target.employee.id, date: '2026-09-10' })
  assert.equal(stored.shiftId, shift.id)
  assert.equal(stored.shiftName, shift.name)
  assert.equal(stored.startTime, '10:00')
  await shiftRepo.update(shift.id, { name: 'Renamed catalog shift', startTime: '11:00' })
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  const actual = await service.shiftFor(target.employee.id, '2026-09-10')
  assert.equal(actual.shiftId, shift.id)
  assert.equal(actual.start, '11:00')
  assert.match(actual.name, /Renamed catalog shift/)
  const bulk = await request(admin, 'POST', '/attendance/schedule/day/bulk', {
    employeeIds: [target.employee.id], dates: ['2026-09-11', '2026-09-12'], shiftId: shift.id,
  })
  assert.equal(bulk.status, 201, JSON.stringify(bulk.body))
  assert.equal(bulk.body.applied, 2)
  assert.equal((await overrides().findOneBy({ employeeId: target.employee.id, date: '2026-09-12' })).shiftId, shift.id)
  assert.equal((await request(admin, 'POST', '/attendance/schedule/day', {
    employeeId: target.employee.id, date: '2026-09-13', shiftId: 99999999,
  })).status, 400)
  await shiftRepo.update(shift.id, { isActive: false })
  assert.equal((await request(admin, 'POST', '/attendance/schedule/day/bulk', {
    employeeIds: [target.employee.id], dates: ['2026-09-13'], shiftId: shift.id,
  })).status, 400)
  assert.equal(await overrides().countBy({ employeeId: target.employee.id, date: '2026-09-13' }), 0)
})

test('ATT-17 employee calendars apply their work schedule, branch exceptions and holidays with read scope enforced', async () => {
  const schedule = await repo('WorkSchedule', 'assets/assets.entities').save({
    name: 'Sunday rest employee schedule', weekendDays: 'SUN', startTime: '08:00', endTime: '16:00',
  })
  const scopedBranch = await repos.Branch.save({ name: 'Saturday rest branch', code: 'SAT_BRANCH', weekendDays: 'SAT' })
  const branchEmployee = await person({}, scopedBranch.id)
  const scheduledEmployee = await person({ workScheduleId: schedule.id }, scopedBranch.id)
  const secondBranch = await repos.Branch.save({ name: 'Friday rest branch', code: 'FRI_BRANCH', weekendDays: 'FRI' })
  const crossEmployee = await person({}, secondBranch.id)
  const holiday = await repo('PublicHoliday', 'assets/assets.entities').save({ name: 'Test Tuesday holiday', date: '2026-09-08', country: 'EG' })
  const exception = await repo('ScheduleExceptionRule', 'attendance/attendance.entities').save({ name: 'Branch Wednesday off', weekday: 'WED', occurrence: 'ALL', effect: 'OFF', branchId: scopedBranch.id, isActive: true })
  const read = async (user, id) => request(user, 'GET', `/attendance/working-days?from=2026-09-06&to=2026-09-12&employeeId=${id}`)
  const branchDays = await read(admin, branchEmployee.employee.id)
  assert.equal(branchDays.status, 200, JSON.stringify(branchDays.body))
  assert.deepEqual(branchDays.body.weekendDays, ['SAT'])
  assert.deepEqual(branchDays.body.skipped, ['2026-09-08', '2026-09-09', '2026-09-12'])
  assert.equal(branchDays.body.working, 4, 'Friday remains an editable working day')
  const ownDays = await read(scheduledEmployee.user, scheduledEmployee.employee.id)
  assert.equal(ownDays.status, 200, JSON.stringify(ownDays.body))
  assert.deepEqual(ownDays.body.weekendDays, ['SUN'])
  assert.deepEqual(ownDays.body.skipped, ['2026-09-06', '2026-09-08', '2026-09-09'])
  const otherDays = await read(admin, crossEmployee.employee.id)
  assert.deepEqual(otherDays.body.skipped, ['2026-09-08', '2026-09-11'], 'branch-only Wednesday rule does not cross branches')
  assert.equal((await read(branchEmployee.user, scheduledEmployee.employee.id)).status, 403)
  const scopedViewer = await repos.User.save({ email: 'scheduleviewer@test.invalid', displayName: 'Schedule viewer', role: 'hr_manager', branchId: scopedBranch.id,
    passwordHash: 'unused', permissions: JSON.stringify(['attendance.view_all']) })
  assert.equal((await read(scopedViewer, crossEmployee.employee.id)).status, 403)
  assert.equal((await read(scopedViewer, branchEmployee.employee.id)).status, 200)
  await repo('PublicHoliday', 'assets/assets.entities').delete(holiday.id)
  await repo('ScheduleExceptionRule', 'attendance/attendance.entities').delete(exception.id)
})

test('ATT-17 clearing a week restores the employee schedule, preserves day overrides, recomputes attendance and enforces write scope', async () => {
  const schedule = await repo('WorkSchedule', 'assets/assets.entities').save({
    name: 'Fallback after week removal', weekendDays: '', startTime: '08:00', endTime: '16:00',
  })
  const target = await person({ workScheduleId: schedule.id })
  const shift = await repo('Shift', 'assets/assets.entities').save({ name: 'Temporary weekly shift', startTime: '10:00', endTime: '18:00', isActive: true })
  const week = await request(admin, 'POST', '/attendance/schedule', { entries: [{ employeeId: target.employee.id, weekStart: '2026-09-06', shiftId: shift.id }] })
  assert.equal(week.status, 201, JSON.stringify(week.body))
  assert.equal(week.body.saved[0].startTime, '10:00', 'shift ID alone resolves canonical weekly snapshot')
  const service = app.get(require('../src/attendance/attendance.service').AttendanceService)
  await service.computeDay(target.employee.id, '2026-09-07')
  await request(admin, 'POST', '/attendance/schedule/day', { employeeId: target.employee.id, date: '2026-09-08', shiftId: shift.id })
  assert.equal((await service.shiftFor(target.employee.id, '2026-09-07')).source, 'week')
  const manager = await repos.User.save({ email: 'schedulemanager@test.invalid', displayName: 'Schedule manager', role: 'hr_manager', branchId: branch.id,
    employeeId: target.employee.id, passwordHash: 'unused', permissions: JSON.stringify(['attendance.manage']) })
  assert.equal((await request(manager, 'DELETE', `/attendance/schedule/2026-09-06/${otherEmp.id}`)).status, 403)
  assert.equal((await request(manager, 'DELETE', `/attendance/schedule/2026-09-06/${target.employee.id}`)).status, 403)
  const cleared = await request(admin, 'DELETE', `/attendance/schedule/2026-09-06/${target.employee.id}`)
  assert.equal(cleared.status, 200, JSON.stringify(cleared.body))
  assert.equal(cleared.body.deleted, true)
  assert.deepEqual(cleared.body.failed, [])
  assert.equal((await service.shiftFor(target.employee.id, '2026-09-07')).source, 'employee')
  assert.equal((await service.shiftFor(target.employee.id, '2026-09-07')).start, '08:00')
  assert.equal((await service.shiftFor(target.employee.id, '2026-09-08')).source, 'override')
  const recalculated = await repos.AttendanceDay.findOneBy({ employeeId: target.employee.id, date: '2026-09-07' })
  assert.equal(recalculated.scheduleSource, 'employee')
  assert.equal((await request(admin, 'DELETE', `/attendance/schedule/2026-09-06/${target.employee.id}`)).body.deleted, false)
})

test('EMP-14 direct renewal rejects invalid dates, overlaps, missing permission, outside branch and pending contract requests', async () => {
  const target = await person()
  const url = `/employees/${target.employee.id}/contract/renew`
  const data = { contractStart: '2026-01-01', contractEnd: '2026-12-31', reason: 'Approved annual renewal' }
  for (const changes of [
    { contractStart: '2026-02-30' }, { contractEnd: '2026-02-30' },
    { contractStart: '2027-01-01' }, { reason: '   ' }, { contractFileRef: 'https://example.invalid/private.pdf' },
  ]) assert.equal((await request(admin, 'POST', url, { ...data, ...changes })).status, 400)
  assert.equal((await request(admin, 'POST', url, { ...data, contractStart: '2025-12-31' })).status, 409)
  assert.equal((await request(target.user, 'POST', url, data)).status, 403)
  assert.equal((await request(hr, 'POST', `/employees/${otherEmp.id}/contract/renew`, data)).status, 404)
  const pending = await repos.Request.save({ requesterId: target.employee.id, typeCode: 'CONTRACT_RENEWAL', status: 'IN_EXECUTION' })
  assert.equal((await request(admin, 'POST', url, data)).status, 409)
  await repos.Request.delete(pending.id)
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).contractStart, '2025-01-01')
  assert.equal(await histories().countBy({ employeeId: target.employee.id }), 0)
})

test('EMP-14 direct renewal records old and new dates, actor and reason and atomically saves the optional owned document', async () => {
  const target = await person({ contractNumber: 'RENEW-14' })
  const files = repo('StoredFile', 'files/stored-file.entity')
  const documentRepo = repo('EmployeeDocument', 'assets/assets.entities')
  const file = await files.save({ originalName: 'renewed-contract.pdf', storedName: 'renewal-fixture.pdf', mime: 'application/pdf', size: 12,
    uploadedBy: hr.id, entityType: 'contract' })
  const data = { contractStart: '2026-01-01', contractEnd: '2026-12-31', reason: 'Renewed by HR decision', contractFileRef: `file:${file.id}` }
  const url = `/employees/${target.employee.id}/contract/renew`
  const result = await request(hr, 'POST', url, data)
  assert.equal(result.status, 201, JSON.stringify(result.body))
  const saved = await employeesRepo().findOneBy({ id: target.employee.id })
  assert.equal(saved.contractStart, data.contractStart)
  assert.equal(saved.contractEnd, data.contractEnd)
  assert.equal(saved.contractDurationMonths, null)
  assert.equal(saved.joinDate, '2020-01-01')
  assert.equal(saved.status, 'active')
  assert.equal((await files.findOneBy({ id: file.id })).employeeId, target.employee.id)
  const document = await documentRepo.findOneBy({ employeeId: target.employee.id, fileRef: data.contractFileRef })
  assert.equal(document.docType, 'contract')
  assert.equal(document.number, 'RENEW-14')
  assert.equal(document.issueDate, data.contractStart)
  assert.equal(document.expiryDate, data.contractEnd)
  const audit = await histories().findOneBy({ employeeId: target.employee.id })
  assert.equal(audit.changeType, 'CONTRACT')
  assert.equal(audit.fieldName, 'contract')
  assert.equal(audit.oldStatus, null)
  assert.equal(audit.newStatus, 'change')
  assert.equal(audit.oldValue, '2025-01-01 → 2025-12-31')
  assert.equal(audit.newValue, '2026-01-01 → 2026-12-31')
  assert.equal(audit.changedByUserId, hr.id)
  const historyResponse = await request(hr, 'GET', `/employees/${target.employee.id}/history`)
  assert.equal(historyResponse.status, 200)
  const compatible = historyResponse.body.find(row => row.id === audit.id)
  assert.equal(compatible.oldStatus, 'contract: 2025-01-01 → 2025-12-31')
  assert.equal(compatible.newStatus, 'contract: 2026-01-01 → 2026-12-31')
  assert.ok(audit.reason.includes(`#${hr.id}`))
  assert.ok(audit.reason.includes(data.reason))
  assert.ok(audit.reason.includes(data.contractFileRef))
  assert.equal((await request(hr, 'POST', url, data)).status, 409, 'repeat cannot duplicate renewal or document')
  assert.equal(await histories().countBy({ employeeId: target.employee.id }), 1)
  const withoutFile = await request(hr, 'POST', url, { contractStart: '2027-01-01', contractEnd: '2027-12-31', reason: 'Next renewal without document' })
  assert.equal(withoutFile.status, 201, JSON.stringify(withoutFile.body))
  assert.equal(await documentRepo.countBy({ employeeId: target.employee.id }), 1)
})

test('EMP-14 a foreign file or a failure after document save cannot leave changed dates, an attached file or a partial audit', async () => {
  const target = await person()
  const foreign = await person()
  const files = repo('StoredFile', 'files/stored-file.entity')
  const docs = repo('EmployeeDocument', 'assets/assets.entities')
  const file = await files.save({ originalName: 'foreign-contract.pdf', storedName: 'foreign-contract-fixture.pdf', mime: 'application/pdf', size: 12,
    uploadedBy: foreign.user.id, employeeId: foreign.employee.id, entityType: 'contract' })
  const data = { contractStart: '2026-01-01', contractEnd: '2026-12-31', reason: 'Rollback check', contractFileRef: `file:${file.id}` }
  assert.equal((await request(hr, 'POST', `/employees/${target.employee.id}/contract/renew`, data)).status, 403)
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).contractEnd, '2025-12-31')
  assert.equal((await files.findOneBy({ id: file.id })).employeeId, foreign.employee.id)
  const owned = await files.save({ originalName: 'atomic-contract.pdf', storedName: 'atomic-contract-fixture.pdf', mime: 'application/pdf', size: 12,
    uploadedBy: hr.id, entityType: 'contract' })
  const service = app.get(require('../src/employees/employees.service').EmployeesService)
  const save = service.saveContractDocument
  service.saveContractDocument = async function (...args) { await save.apply(this, args); throw new Error('injected after document save') }
  try {
    // نطاق الفروع قائمة (branchScopeOf): حساب الفرع الواحد = [فرعه]
    await assert.rejects(service.renewContract(target.employee.id, { ...data, contractFileRef: `file:${owned.id}` }, [branch.id], hr.id), /injected after document save/)
  } finally { service.saveContractDocument = save }
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).contractEnd, '2025-12-31')
  assert.equal((await files.findOneBy({ id: owned.id })).employeeId, null)
  assert.equal(await docs.countBy({ employeeId: target.employee.id }), 0)
  assert.equal(await histories().countBy({ employeeId: target.employee.id }), 0)
})

async function decisionType(code) {
  const chain = await repos.ApprovalChain.save({ code: `CHAIN_${code}`, nameAr: code, isActive: true, autoApprove: false })
  await repos.ApprovalStep.save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  return repos.RequestType.save({ code, nameAr: code, category: 'personal_data', destinationHandler: 'none', approvalChainId: chain.id, isActive: true })
}

test('NAM-1 public decision verbs store identical canonical actions in resolved steps and the immutable approval audit', async () => {
  const type = await decisionType('NAM1_DECISIONS')
  const target = await person()
  const auditRepo = repo('RequestApproval', 'requests/entities/request-approval.entity')
  for (const [verb, canonical, status] of [
    ['APPROVE', 'APPROVED', 'COMPLETED'], ['REJECT', 'REJECTED', 'REJECTED'], ['RETURN', 'RETURNED_FOR_INFO', 'RETURNED_FOR_INFO'],
  ]) {
    const made = await submit(target.user, type.code, { reason: 'Decision normalization' })
    assert.equal(made.status, 201, JSON.stringify(made.body))
    assert.equal(made.body.status, 'UNDER_REVIEW')
    const result = await request(admin, 'POST', `/requests/${made.body.id}/act`, { action: verb, comment: `Public ${verb} stays compatible` })
    assert.equal(result.status, 201, JSON.stringify(result.body))
    assert.equal(result.body.status, status)
    const saved = await repos.Request.findOneBy({ id: made.body.id })
    const audit = await auditRepo.findOneBy({ requestId: made.body.id })
    assert.equal(JSON.parse(saved.resolvedSteps)[0].action, canonical)
    assert.equal(audit.action, canonical)
    assert.equal(JSON.parse(result.body.resolvedSteps)[0].action, canonical)
  }
})

test('NAM-1 legacy step actions normalize on every read without changing stored history and legacy returned requests resubmit', async () => {
  const type = await decisionType('NAM1_LEGACY')
  const target = await person()
  const auditRepo = repo('RequestApproval', 'requests/entities/request-approval.entity')
  let returned
  for (const [legacy, canonical] of [['APPROVE', 'APPROVED'], ['APPPROVE', 'APPROVED'], ['REJECT', 'REJECTED'], ['RETURN', 'RETURNED_FOR_INFO']]) {
    const raw = JSON.stringify([{ stepOrder: 1, role: 'hr', approverEmployeeId: null, actedAt: '2026-09-01T10:00:00.000Z', action: legacy }])
    const saved = await repos.Request.save({ requesterId: target.employee.id, createdByUserId: target.user.id, branchId: branch.id,
      typeCode: type.code, status: canonical === 'RETURNED_FOR_INFO' ? 'RETURNED_FOR_INFO' : canonical === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
      payload: JSON.stringify({ reason: 'Legacy draft' }), resolvedSteps: raw, currentStep: 1 })
    const audit = await auditRepo.save({ requestId: saved.id, step: 1, approverId: admin.id, action: canonical, comment: 'Historical audit must remain unchanged' })
    const beforeAudit = await auditRepo.findOneBy({ id: audit.id })
    const detail = await request(target.user, 'GET', `/requests/${saved.id}`)
    assert.equal(detail.status, 200, JSON.stringify(detail.body))
    assert.equal(JSON.parse(detail.body.resolvedSteps)[0].action, canonical)
    const mine = await request(target.user, 'GET', '/requests/mine')
    assert.equal(JSON.parse(mine.body.find(r => r.id === saved.id).resolvedSteps)[0].action, canonical)
    const all = await request(admin, 'GET', `/requests/all?typeCode=${type.code}`)
    assert.equal(JSON.parse(all.body.find(r => r.id === saved.id).resolvedSteps)[0].action, canonical)
    assert.equal((await repos.Request.findOneBy({ id: saved.id })).resolvedSteps, raw, 'GET must not rewrite stored legacy steps')
    assert.deepEqual(await auditRepo.findOneBy({ id: audit.id }), beforeAudit, 'immutable audit remains byte-equivalent')
    if (legacy === 'RETURN') returned = { saved, audit: beforeAudit }
  }
  const resubmitted = await request(target.user, 'POST', `/requests/${returned.saved.id}/resubmit`, { payload: { reason: 'Missing information completed' } })
  assert.equal(resubmitted.status, 201, JSON.stringify(resubmitted.body))
  assert.equal(resubmitted.body.status, 'UNDER_REVIEW')
  assert.equal(JSON.parse(resubmitted.body.resolvedSteps)[0].action, null)
  assert.deepEqual(await auditRepo.findOneBy({ id: returned.audit.id }), returned.audit)
  const approved = await request(admin, 'POST', `/requests/${returned.saved.id}/act`, { action: 'APPROVE' })
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  assert.equal(approved.body.status, 'COMPLETED')
  assert.equal(JSON.parse(approved.body.resolvedSteps)[0].action, 'APPROVED')
  assert.deepEqual((await auditRepo.findBy({ requestId: returned.saved.id })).map(a => a.action).sort(), ['APPROVED', 'RETURNED_FOR_INFO'])
  const queued = await repos.Request.save({ requesterId: target.employee.id, branchId: branch.id, typeCode: type.code, status: 'UNDER_REVIEW', currentStep: 2,
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', actedAt: '2026-09-01T10:00:00.000Z', action: 'APPROVE' }, { stepOrder: 2, role: 'hr', actedAt: null, action: null }]) })
  const inbox = await request(admin, 'GET', '/requests/inbox')
  assert.equal(JSON.parse(inbox.body.find(r => r.id === queued.id).resolvedSteps)[0].action, 'APPROVED')
  assert.equal(JSON.parse((await repos.Request.findOneBy({ id: queued.id })).resolvedSteps)[0].action, 'APPROVE')
})

test('EMP-12 cleared optional fields persist as null across branch, department, team, user and leave type edit and reload', async () => {
  const target = await person()
  const branchRow = await repos.Branch.save({ name: 'Clear branch', code: 'CLEAR_BRANCH', nameEn: 'Previous name', city: 'Previous city',
    address: 'Previous address', phone: '01000000000', email: 'branch@test.invalid', managerEmployeeId: target.employee.id,
    country: 'EG', costCenter: 'OLD_CC', weekendDays: 'FRI' })
  const departmentRepo = repo('Department', 'org/entities/department.entity')
  const parent = await departmentRepo.save({ name: 'Clear parent', branchId: branchRow.id })
  const department = await departmentRepo.save({ name: 'Clear department', nameEn: 'Previous name', code: 'OLD_DEP',
    branchId: branchRow.id, parentId: parent.id, managerEmployeeId: target.employee.id })
  const team = await repo('Team', 'org/entities/team.entity').save({ name: 'Clear team', code: 'OLD_TEAM', departmentId: department.id, leaderEmployeeId: target.employee.id })
  const leaveType = await repo('LeaveType', 'requests/entities/leave.entities').save({ code: 'CLEAR_OPTIONALS', nameAr: 'Clear optional limits',
    requiredAttachment: 'medical_report', maxDays: 7, balanceSource: 'none' })
  const cases = [
    // مسح دولة الفرع وعطلته يمس تقويمه المؤرخ فيلزمه calendarChange بنسخة المصدر المقروءة قبل الحفظ مباشرة
    { url: `/branches/${branchRow.id}`, list: '/branches', id: branchRow.id, calendarScope: 'BRANCH',
      clear: { nameEn: null, city: null, address: null, phone: null, email: null, managerEmployeeId: null, costCenter: null, country: null, weekendDays: null } },
    { url: `/departments/${department.id}`, list: '/departments', id: department.id,
      clear: { nameEn: null, code: null, parentId: null, managerEmployeeId: null } },
    { url: `/teams/${team.id}`, list: '/teams', id: team.id, clear: { code: null, leaderEmployeeId: null } },
    { url: `/users/${target.user.id}`, list: '/users', id: target.user.id, clear: { branchId: null, employeeId: null } },
    { url: `/settings/leave-types/${leaveType.id}`, list: '/settings/leave-types', id: leaveType.id, clear: { requiredAttachment: null, maxDays: null } },
  ]
  for (const c of cases) {
    let body = c.clear
    if (c.calendarScope) {
      const context = await request(admin, 'GET', `/attendance/calendar-context?scope=${c.calendarScope}&sourceId=${c.id}`)
      assert.equal(context.status, 200, JSON.stringify(context.body))
      body = { ...c.clear, calendarChange: { effectiveFrom: '2026-06-01', reason: 'مسح دولة الفرع وعطلته وفق قرار الاختبار',
        expectedRevision: context.body.revision, expectedCurrentSourceHash: context.body.currentSourceHash } }
    }
    const result = await request(admin, 'PATCH', c.url, body)
    assert.equal(result.status, 200, `${c.url}: ${JSON.stringify(result.body)}`)
    const reloaded = await request(admin, 'GET', c.list)
    assert.equal(reloaded.status, 200, `${c.list}: ${JSON.stringify(reloaded.body)}`)
    const row = reloaded.body.find(r => r.id === c.id)
    assert.ok(row, `${c.url} is readable after save`)
    for (const key of Object.keys(c.clear)) assert.equal(row[key], null, `${c.url}.${key} must remain cleared after reload`)
  }
})

for (const initialStatus of ['DRAFT', 'RETURNED_FOR_INFO']) test(`concurrent ${initialStatus} submissions execute once and the losing payload cannot overwrite the committed request`, async () => {
  const target = await person()
  const type = await requestType(`LOCKED_SUBMISSION_${initialStatus}`, 'none', ['reason'])
  const row = await repos.Request.save({ typeCode: type.code, requesterId: target.employee.id, createdByUserId: target.user.id,
    branchId: branch.id, status: initialStatus, payload: JSON.stringify({ reason: 'Initial reason' }) })
  const service = requestService(), destinations = destinationService()
  const execute = destinations.execute, owned = service.owned
  const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
  const entered = deferred(), release = deferred(), contender = deferred()
  let firstManager, executions = 0, first, second
  const endpoint = initialStatus === 'DRAFT' ? 'submit' : 'resubmit'
  const body = reason => initialStatus === 'DRAFT' ? {} : { payload: { reason } }
  const bounded = async promise => {
    let timer
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Submission race timed out')), 12000) })]) }
    finally { clearTimeout(timer) }
  }
  destinations.execute = async function (em, req, ...rest) {
    if (req.id === row.id) { executions++; firstManager = em; entered.resolve(); await release.promise }
    return execute.call(this, em, req, ...rest)
  }
  service.owned = async function (user, id, em) {
    if (id === row.id && firstManager && em !== firstManager) contender.resolve()
    return owned.call(this, user, id, em)
  }
  try {
    first = request(target.user, 'POST', `/requests/${row.id}/${endpoint}`, body('Winning edit'))
    await bounded(entered.promise)
    second = request(target.user, 'POST', `/requests/${row.id}/${endpoint}`, body('Losing edit'))
    await bounded(contender.promise)
    release.resolve()
    const results = await bounded(Promise.all([first, second]))
    assert.equal(results[0].status, 201, JSON.stringify(results[0].body))
    assert.equal(results[1].status, 400, JSON.stringify(results[1].body))
    const persisted = await repos.Request.findOneBy({ id: row.id })
    assert.equal(persisted.status, 'COMPLETED')
    assert.equal(JSON.parse(persisted.payload).reason, initialStatus === 'DRAFT' ? 'Initial reason' : 'Winning edit')
    assert.equal(executions, 1)
  } finally {
    release.resolve()
    await Promise.allSettled([first, second].filter(Boolean))
    destinations.execute = execute; service.owned = owned
  }
})

async function pendingCustody(target) {
  const asset = await repo('Asset', 'requests/entities/custody.entities').save({ name: `REQ23 fixture ${target.employee.id}`, category: 'IT', status: 'AVAILABLE' })
  const row = await repos.Request.save({ typeCode: 'CUSTODY_REQUEST', requesterId: target.employee.id, branchId: target.employee.branchId,
    createdByUserId: target.user.id, status: 'IN_EXECUTION', payload: JSON.stringify({ assetIds: [asset.id] }) })
  const assignment = await repo('CustodyAssignment', 'requests/entities/custody.entities').save({ assetId: asset.id,
    employeeId: target.employee.id, requestId: row.id, status: 'PENDING_ACK' })
  return { asset, row, assignment }
}

test('REQ-23 team leader receives and confirms custody when the employee has no explicit manager', async () => {
  const leader = await person(), unrelated = await person()
  const { team, department } = await makeTeam('REQ23 team fallback', branch.id, leader.employee.id)
  const target = await person({ managerEmployeeId: null, teamId: team.id, departmentId: department.id })
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).managerEmployeeId, null)
  const { asset, row, assignment } = await pendingCustody(target)
  const endpoint = '/custody/pending-my-confirm'
  assert.ok(!(await request(leader.user, 'GET', endpoint)).body.some(item => item.id === assignment.id), 'unacknowledged custody is not ready for manager confirmation')
  const acknowledged = await request(target.user, 'POST', `/custody/${assignment.id}/acknowledge`)
  assert.equal(acknowledged.status, 201, JSON.stringify(acknowledged.body))
  const inbox = await request(leader.user, 'GET', endpoint)
  assert.equal(inbox.status, 200)
  assert.equal(inbox.body.filter(item => item.id === assignment.id).length, 1)
  assert.equal(inbox.body.find(item => item.id === assignment.id).assetName, asset.name)
  for (const user of [target.user, unrelated.user]) {
    assert.ok(!(await request(user, 'GET', endpoint)).body.some(item => item.id === assignment.id))
    assert.equal((await request(user, 'POST', `/custody/${assignment.id}/manager-confirm`)).status, 403)
  }
  assert.equal((await repos.Request.findOneBy({ id: row.id })).status, 'IN_EXECUTION')
  const confirmed = await request(leader.user, 'POST', `/custody/${assignment.id}/manager-confirm`)
  assert.equal(confirmed.status, 201, JSON.stringify(confirmed.body))
  const saved = await repo('CustodyAssignment', 'requests/entities/custody.entities').findOneBy({ id: assignment.id })
  assert.equal(saved.status, 'ACTIVE'); assert.ok(saved.acknowledgedAt); assert.ok(saved.managerConfirmAt)
  const savedAsset = await repo('Asset', 'requests/entities/custody.entities').findOneBy({ id: asset.id })
  assert.equal(savedAsset.status, 'ASSIGNED'); assert.equal(savedAsset.currentHolderId, target.employee.id)
  assert.equal((await repos.Request.findOneBy({ id: row.id })).status, 'COMPLETED')
  assert.ok(!(await request(leader.user, 'GET', endpoint)).body.some(item => item.id === assignment.id))
  assert.equal((await request(leader.user, 'POST', `/custody/${assignment.id}/manager-confirm`)).status, 400)
})

test('REQ-23 an out-of-branch structural manager sees no custody and cannot confirm it by ID', async () => {
  const leader = await person()
  // Deliberately inconsistent legacy assignment: the resolver finds this manager,
  // but neither the inbox nor direct action may bypass their branch scope.
  const target = await person({ managerEmployeeId: leader.employee.id }, otherBranch.id)
  const { asset, assignment } = await pendingCustody(target)
  assert.equal((await request(target.user, 'POST', `/custody/${assignment.id}/acknowledge`)).status, 201)
  const inbox = await request(leader.user, 'GET', '/custody/pending-my-confirm')
  assert.equal(inbox.status, 200); assert.ok(!inbox.body.some(item => item.id === assignment.id))
  // تدقيق الأدوار D3: عهدة موظف خارج نطاق السائل = نفس رد الإسناد الغايب بالحرف (كان 403 فبيفشّي وجودها)
  const foreignConfirm = await request(leader.user, 'POST', `/custody/${assignment.id}/manager-confirm`)
  const missingConfirm = await request(leader.user, 'POST', '/custody/99999999/manager-confirm')
  assert.deepEqual([foreignConfirm.status, foreignConfirm.body], [404, missingConfirm.body])
  assert.equal((await repo('CustodyAssignment', 'requests/entities/custody.entities').findOneBy({ id: assignment.id })).status, 'PENDING_MANAGER_CONFIRM')
  assert.equal((await repo('Asset', 'requests/entities/custody.entities').findOneBy({ id: asset.id })).currentHolderId, null)
})

const personalInitial = { phone: '01012345678', phoneAlt: '02012345678', address: 'Original fixture address', maritalStatus: 'single' }
const personalChanged = { phone: '01098765432', phoneAlt: '02098765432', address: 'Updated fixture address', maritalStatus: 'married' }
// المسح الصريح بقيمة null؛ النص الفارغ (ما ترسله الشاشة للحقل غير المعدّل) لا يمسح — الاختبار التالي
for (const clear of [null]) test(`REQ-10 allowed personal fields persist with exact before/after audit and clear with ${clear === null ? 'null' : 'empty strings'}`, async () => {
  await requestType('PERSONAL_DATA_UPDATE', 'employee_record')
  const target = await person({ ...personalInitial, emergencyContactName: 'Unaffected fixture contact' })
  const changed = await submit(target.user, 'PERSONAL_DATA_UPDATE', personalChanged)
  assert.equal(changed.status, 201, JSON.stringify(changed.body)); assert.equal(changed.body.status, 'COMPLETED')
  const saved = await employeesRepo().findOneBy({ id: target.employee.id })
  const audit = await histories().findBy({ requestId: changed.body.id })
  assert.equal(audit.length, 4)
  for (const field of Object.keys(personalChanged)) {
    assert.equal(saved[field], personalChanged[field])
    const record = audit.find(item => item.fieldName === field)
    assert.ok(record); assert.equal(record.changeType, 'DATA'); assert.equal(record.employeeId, target.employee.id)
    assert.equal(record.oldValue, personalInitial[field]); assert.equal(record.newValue, personalChanged[field])
  }
  assert.equal(saved.emergencyContactName, 'Unaffected fixture contact')
  assert.equal(saved.jobTitle, target.employee.jobTitle)
  const cleared = await submit(target.user, 'PERSONAL_DATA_UPDATE', Object.fromEntries(Object.keys(personalChanged).map(field => [field, clear])))
  assert.equal(cleared.status, 201, JSON.stringify(cleared.body))
  const clearedEmployee = await employeesRepo().findOneBy({ id: target.employee.id })
  const clearAudit = await histories().findBy({ requestId: cleared.body.id })
  assert.equal(clearAudit.length, 4)
  for (const field of Object.keys(personalChanged)) {
    assert.equal(clearedEmployee[field], clear)
    const record = clearAudit.find(item => item.fieldName === field)
    assert.equal(record.oldValue, personalChanged[field]); assert.equal(record.newValue, clear)
  }
  const repeat = await submit(target.user, 'PERSONAL_DATA_UPDATE', Object.fromEntries(Object.keys(personalChanged).map(field => [field, clear])))
  assert.equal(repeat.status, 400); assert.match(repeat.body.message, /لم تتغير/)
  assert.equal(await histories().countBy({ employeeId: target.employee.id }), 8)
})

test('REQ-10 blank strings sent by the requests screen for untouched fields keep saved personal data (only changed fields are written)', async () => {
  await requestType('PERSONAL_DATA_UPDATE', 'employee_record')
  const target = await person(personalInitial)
  // الشاشة ترسل كل حقول النموذج؛ الموظف غيّر العنوان فقط
  const result = await submit(target.user, 'PERSONAL_DATA_UPDATE', { phone: '', phoneAlt: '', address: 'Only the address changed', maritalStatus: '' })
  assert.equal(result.status, 201, JSON.stringify(result.body)); assert.equal(result.body.status, 'COMPLETED')
  const saved = await employeesRepo().findOneBy({ id: target.employee.id })
  assert.deepEqual([saved.phone, saved.phoneAlt, saved.address, saved.maritalStatus], [personalInitial.phone, personalInitial.phoneAlt, 'Only the address changed', personalInitial.maritalStatus])
  assert.deepEqual((await histories().findBy({ requestId: result.body.id })).map(item => item.fieldName), ['address'])
  const blank = await submit(target.user, 'PERSONAL_DATA_UPDATE', { phone: '', phoneAlt: ' ', address: '', maritalStatus: '' })
  assert.equal(blank.status, 400); assert.match(blank.body.message, /لم تتغير/)
  assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).phone, personalInitial.phone)
})

test('REQ-10 empty, unchanged, protected and malformed personal updates cannot complete or append history', async () => {
  await requestType('PERSONAL_DATA_UPDATE', 'employee_record')
  const target = await person(personalInitial)
  const before = await employeesRepo().findOneBy({ id: target.employee.id })
  for (const payload of [{}, { reason: 'No changed data' }, personalInitial, { email: 'spoof@test.invalid' }, { basicSalary: 9000 },
    { iban: 'GB82WEST12345698765432' }, { phone: {} }, { address: ['invalid'] }, { address: 'x'.repeat(501) }]) {
    const result = await submit(target.user, 'PERSONAL_DATA_UPDATE', payload)
    assert.equal(result.status, 400, JSON.stringify(result.body))
    assert.deepEqual(await employeesRepo().findOneBy({ id: target.employee.id }), before)
    assert.equal(await histories().countBy({ employeeId: target.employee.id }), 0)
    assert.equal(await repos.Request.countBy({ requesterId: target.employee.id }), 0, 'failed immediate submission leaves no completed row or orphan draft')
  }
})

async function queuedPersonal(employeeId, payload) {
  await requestType('PERSONAL_DATA_UPDATE', 'employee_record')
  return repos.Request.save({ typeCode: 'PERSONAL_DATA_UPDATE', requesterId: employeeId, branchId: branch.id,
    status: 'UNDER_REVIEW', currentStep: 1, resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'hr', actedAt: null }]), payload: JSON.stringify(payload) })
}

test('REQ-10 a missing employee or a failure after data/history writes rolls back the final decision', async () => {
  const auditRepo = repo('RequestApproval', 'requests/entities/request-approval.entity')
  const missing = await queuedPersonal(2000000000, { address: 'Must never complete' })
  const result = await request(admin, 'POST', `/requests/${missing.id}/act`, { action: 'APPROVE' })
  assert.equal(result.status, 400, JSON.stringify(result.body))
  assert.equal((await repos.Request.findOneBy({ id: missing.id })).status, 'UNDER_REVIEW')
  assert.equal(await auditRepo.countBy({ requestId: missing.id }), 0)
  assert.equal(await histories().countBy({ requestId: missing.id }), 0)
  const target = await person(personalInitial)
  const row = await queuedPersonal(target.employee.id, personalChanged)
  const service = destinationService(), handler = service.handlers.employee_record
  service.handlers.employee_record = async function (...args) { await handler.apply(this, args); throw new Error('injected after personal data and history write') }
  let failed
  try { failed = await request(admin, 'POST', `/requests/${row.id}/act`, { action: 'APPROVE' }) }
  finally { service.handlers.employee_record = handler }
  assert.equal(failed.status, 400)
  const unchanged = await employeesRepo().findOneBy({ id: target.employee.id })
  for (const field of Object.keys(personalInitial)) assert.equal(unchanged[field], personalInitial[field])
  assert.equal((await repos.Request.findOneBy({ id: row.id })).status, 'UNDER_REVIEW')
  assert.equal(await auditRepo.countBy({ requestId: row.id }), 0)
  assert.equal(await histories().countBy({ requestId: row.id }), 0)
})

test('REQ-10 simultaneous personal requests preserve the committed before/after chain', async () => {
  const target = await person(personalInitial)
  const first = await queuedPersonal(target.employee.id, { phone: 'First committed phone' })
  const second = await queuedPersonal(target.employee.id, { phone: 'Second committed phone' })
  const service = destinationService(), handler = service.handlers.employee_record
  const EmployeeEntity = require('../src/employees/employee.entity').Employee
  let release, entered, a, b, secondFinished = false, blockingSession
  const gate = new Promise(done => { release = done }), started = new Promise(done => { entered = done })
  const bounded = async promise => {
    let timer
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Personal update race timed out')), 12000) })]) }
    finally { clearTimeout(timer) }
  }
  service.handlers.employee_record = async function (em, req, ...rest) {
    if (req.id !== first.id) return handler.call(this, em, req, ...rest)
    const employeeRepo = em.getRepository(EmployeeEntity), find = employeeRepo.findOne
    employeeRepo.findOne = async function (...args) {
      const employee = await find.apply(this, args)
      blockingSession = (await em.query('SELECT @@SPID AS id'))[0].id
      entered(); await gate
      return employee
    }
    try { return await handler.call(this, em, req, ...rest) }
    finally { employeeRepo.findOne = find }
  }
  try {
    a = request(admin, 'POST', `/requests/${first.id}/act`, { action: 'APPROVE' })
    await bounded(started)
    b = request(admin, 'POST', `/requests/${second.id}/act`, { action: 'APPROVE' }).finally(() => { secondFinished = true })
    await bounded((async () => {
      while (!secondFinished) {
        const blocked = await master.request().input('blocker', sql.Int, blockingSession)
          .query("SELECT COUNT(*) AS total FROM sys.dm_exec_requests WHERE blocking_session_id=@blocker AND wait_type LIKE 'LCK%'")
        if (blocked.recordset[0].total > 0) return
        await new Promise(done => setTimeout(done, 20))
      }
    })())
    release()
    const results = await bounded(Promise.all([a, b]))
    for (const response of results) assert.equal(response.status, 201, JSON.stringify(response.body))
    assert.equal((await employeesRepo().findOneBy({ id: target.employee.id })).phone, 'Second committed phone')
    const firstAudit = await histories().findOneBy({ requestId: first.id })
    const secondAudit = await histories().findOneBy({ requestId: second.id })
    assert.equal(firstAudit.oldValue, personalInitial.phone); assert.equal(firstAudit.newValue, 'First committed phone')
    assert.equal(secondAudit.oldValue, 'First committed phone'); assert.equal(secondAudit.newValue, 'Second committed phone')
  } finally {
    release(); await Promise.allSettled([a, b].filter(Boolean)); service.handlers.employee_record = handler
  }
})


