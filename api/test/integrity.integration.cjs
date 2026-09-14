// Run: node --test api/test/integrity.integration.cjs
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
const database = `hr_integrity_test_${crypto.randomBytes(8).toString('hex')}`
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
  branch = await repos.Branch.save({ name: 'Test A', code: 'TEST_A', weekendDays: '' })
  otherBranch = await repos.Branch.save({ name: 'Test B', code: 'TEST_B', weekendDays: '' })
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
    assert.match(database, /^hr_integrity_test_[a-f0-9]{16}$/)
    assert.notEqual(database, env.DB_DATABASE)
    await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
  }
  if (master) await master.close()
})


const entity = (file, name) => ds.getRepository(require('../src/' + file)[name])
const day = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
async function employeeFixture(extra = {}) {
  return repos.Employee.save({ employeeCode: 'I' + crypto.randomBytes(5).toString('hex'), fullName: 'Integrity fixture',
    branchId: branch.id, joinDate: '2020-01-01', basicSalary: 6000, status: 'active', ...extra })
}

test('SET-11 nested chain validation rejects invalid replacements without losing existing steps', async () => {
  const made = await request(admin, 'POST', '/settings/approval-chains', { code: 'I_CHAIN', nameAr: 'Integrity chain', steps: [{ approverRole: 'hr' }] })
  assert.equal(made.status, 201, JSON.stringify(made.body))
  const original = await repos.ApprovalStep.findBy({ chainId: made.body.id })
  for (const steps of [[{ approverRole: 'specific_employee' }], [{ approverRole: 'hr', thresholdField: 'amount' }],
    [{ approverRole: 'hr', thresholdValue: 25 }], [{ approverRole: 'hr', slaDays: -1 }],
    [{ approverRole: 'hr', thresholdField: 'amount', thresholdOp: '>=', thresholdValue: 'bad' }],
    [{ approverRole: 'specific_employee', specificEmployeeId: 9999999 }], [{ approverRole: 'hr', escalateTo: 'unknown' }]]) {
    const result = await request(admin, 'PATCH', `/settings/approval-chains/${made.body.id}/steps`, { steps })
    assert.equal(result.status, 400, JSON.stringify(result.body))
    assert.deepEqual(await repos.ApprovalStep.findBy({ chainId: made.body.id }), original)
  }
  const valid = await request(admin, 'PATCH', `/settings/approval-chains/${made.body.id}/steps`, { steps: [
    { approverRole: 'specific_employee', specificEmployeeId: emp.id },
    { approverRole: 'finance', isParallel: true, thresholdField: 'amount', thresholdOp: '>=', thresholdValue: 100, slaDays: 2 },
  ] })
  assert.equal(valid.status, 200, JSON.stringify(valid.body))
  assert.equal(valid.body.steps.length, 2)
  assert.deepEqual(valid.body.steps.map(s => s.stepOrder), [1,1])
})

test('chain writes cannot escape the actor branch and global duplicate lookup does not match a branch copy', async () => {
  const actor = await repos.User.save({ email: 'chain@test.invalid', displayName: 'Chain operator', passwordHash: 'unused',
    role: 'employee', branchId: branch.id, permissions: JSON.stringify(['approval_chains.manage']) })
  const foreign = await request(actor, 'POST', '/settings/approval-chains', { code: 'I_SCOPE', nameAr: 'Scope chain', branchId: otherBranch.id, steps: [] })
  assert.equal(foreign.status, 403)
  const local = await request(actor, 'POST', '/settings/approval-chains', { code: 'I_SCOPE', nameAr: 'Scope chain', branchId: branch.id, steps: [{ approverRole: 'hr' }] })
  assert.equal(local.status, 201, JSON.stringify(local.body))
  const general = await request(admin, 'POST', '/settings/approval-chains', { code: 'I_SCOPE', nameAr: 'General chain', steps: [] })
  assert.equal(general.status, 201, JSON.stringify(general.body))
  assert.equal((await request(actor, 'PATCH', `/settings/approval-chains/${general.body.id}/steps`, { steps: [] })).status, 403)
})

test('SET-13/14 branch configuration and department tree reject malformed references and cycles', async () => {
  assert.equal((await request(admin, 'PATCH', `/branches/${branch.id}`, { weekendDays: 'Fri Sat' })).status, 400)
  assert.equal((await request(admin, 'PATCH', `/branches/${branch.id}`, { costCenter: 'NOT_REAL' })).status, 400)
  const normalized = await request(admin, 'PATCH', `/branches/${branch.id}`, { weekendDays: 'fri,sat' })
  assert.equal(normalized.status, 200, JSON.stringify(normalized.body))
  assert.equal(normalized.body.weekendDays, 'FRI,SAT')
  const deptRepo = entity('org/entities/department.entity', 'Department')
  const a = await deptRepo.save({ name: 'Integrity A', branchId: branch.id })
  const b = await deptRepo.save({ name: 'Integrity B', branchId: branch.id, parentId: a.id })
  const foreign = await deptRepo.save({ name: 'Integrity foreign', branchId: otherBranch.id })
  assert.equal((await request(admin, 'PATCH', `/departments/${a.id}`, { parentId: b.id })).status, 400)
  assert.equal((await request(admin, 'PATCH', `/departments/${a.id}`, { parentId: foreign.id })).status, 400)
  assert.equal((await request(admin, 'PATCH', `/departments/${a.id}`, { branchId: otherBranch.id })).status, 400)
  const clear = await request(admin, 'PATCH', `/departments/${b.id}`, { parentId: null })
  assert.equal(clear.status, 200, JSON.stringify(clear.body)); assert.equal(clear.body.parentId, null)
})

test('SET-15/18/23 policy and salary ranges validate and obsolete hardcoded roles route is absent', async () => {
  for (const [key, value] of [['attendance.weekend_days','Fri Sat'], ['leave.accrual_mode','fortnightly'], ['attendance.grace_minutes','   ']]) {
    await repos.RequestsConfig.save({ key, value: '0' })
    assert.equal((await request(admin, 'PATCH', '/settings/config', { key, value })).status, 400)
  }
  const grade = await request(admin, 'POST', '/catalogs/grades', { name: 'Integrity grade', minSalary: 1000, maxSalary: 2000 })
  assert.equal(grade.status, 201)
  assert.equal((await request(admin, 'PATCH', `/catalogs/grades/${grade.body.id}`, { minSalary: 3000 })).status, 400)
  assert.equal((await request(admin, 'GET', '/settings/roles')).status, 404)
  await repos.RequestsConfig.update({ key: 'leave.accrual_mode' }, { value: 'monthly' })
})

test('EMP-8 lifecycle statuses cannot be changed through generic patch and status changes audit and revoke sessions', async () => {
  const target = await employeeFixture()
  const user = await repos.User.save({ email: 'lifecycle@test.invalid', displayName: 'Lifecycle', passwordHash: 'unused', role: 'employee',
    branchId: branch.id, employeeId: target.id, permissions: '[]' })
  for (const status of ['terminated','archived','notice_period']) {
    assert.equal((await request(admin, 'PATCH', `/employees/${target.id}`, { status })).status, 400)
  }
  assert.equal((await request(hr, 'PATCH', `/employees/${target.id}`, { branchId: otherBranch.id })).status, 403)
  assert.equal((await request(admin, 'PATCH', `/employees/${target.id}`, { branchId: null })).status, 400)
  const suspend = await request(admin, 'PATCH', `/employees/${target.id}`, { status: 'suspended' })
  assert.equal(suspend.status, 200, JSON.stringify(suspend.body)); assert.equal(suspend.body.isActive, false)
  const history = await entity('requests/entities/employment.entities','EmployeeStatusHistory').findBy({ employeeId: target.id })
  assert.equal(history.length, 1); assert.equal(history[0].oldStatus,'active'); assert.equal(history[0].newStatus,'suspended')
  assert.equal((await repos.User.findOneBy({id:user.id})).isActive,false)
  assert.equal((await request(user,'GET','/attendance/my-today')).status,401)
})

test('EMP-12 clearing contract and relations persists and retained incompatible relation is rejected', async () => {
  const deptRepo = entity('org/entities/department.entity','Department')
  const dept = await deptRepo.save({ name: 'Integrity contract', branchId: branch.id })
  const target = await employeeFixture({ departmentId: dept.id, managerEmployeeId: emp.id, contractStart:'2026-01-01',contractEnd:'2026-12-31' })
  const result = await request(admin, 'PATCH', `/employees/${target.id}`, { contractStart:'2027-01-01',contractEnd:null,departmentId:null,managerEmployeeId:null })
  assert.equal(result.status,200,JSON.stringify(result.body)); assert.equal(result.body.contractEnd,null); assert.equal(result.body.departmentId,null); assert.equal(result.body.managerEmployeeId,null)
  await repos.Employee.update({id:target.id},{ departmentId:dept.id })
  assert.equal((await request(admin, 'PATCH', `/employees/${target.id}`, { branchId:otherBranch.id })).status,400)
})

test('EMP-13 archive and reactivation each record prior state with actor and revoke tokens', async () => {
  const target = await employeeFixture()
  const user = await repos.User.save({ email:'archive@test.invalid', displayName:'Archive',passwordHash:'unused',role:'employee',branchId:branch.id,employeeId:target.id,permissions:'[]' })
  const archived = await request(admin,'POST',`/employees/${target.id}/archive`,{reason:'Integrity archive'})
  assert.equal(archived.status,201,JSON.stringify(archived.body))
  assert.equal((await repos.User.findOneBy({id:user.id})).tokenVersion,1)
  assert.equal((await request(admin,'PATCH',`/employees/${target.id}`,{status:'active'})).status,400)
  assert.equal((await request(admin,'POST',`/employees/${target.id}/reactivate`)).status,201)
  const history = await entity('requests/entities/employment.entities','EmployeeStatusHistory').find({where:{employeeId:target.id},order:{id:'ASC'}})
  assert.deepEqual(history.map(h=>[h.oldStatus,h.newStatus]),[['active','archived'],['archived','active']])
  assert.equal(history[0].changedByUserId,admin.id)
  assert.equal((await repos.User.findOneBy({id:user.id})).tokenVersion,2)
})

test('EMP-4/5 settlement includes independent allowances and complete final month with policy entitlement', async () => {
  const target = await employeeFixture({ joinDate:'2023-01-01',phoneAllowance:300,workNatureAllowance:500,otherAllowance:100 })
  await repos.RequestsConfig.save({key:'leave.annual_entitled',value:'21'})
  await repos.RequestsConfig.update({key:'leave.accrual_mode'},{value:'monthly'})
  await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:'2026',entitled:10,taken:0})
  const service=app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  const lines=await service.buildSettlement({id:0,employeeId:target.id,lastWorkingDay:'2026-09-30',terminationReason:'termination'},true,true)
  const leave=lines.find(l=>l.label.startsWith('بدل رصيد'))
  assert.ok(leave.label.includes('15.75'),JSON.stringify(lines));assert.equal(leave.amount,3622.5)
  const eos=lines.find(l=>l.type==='CREDIT'&&!l.label.startsWith('بدل رصيد'))
  const helper=require('../src/offboarding/eos')
  assert.equal(eos.amount, helper.computeEos(6900,helper.serviceYears(target.joinDate,'2026-09-30'),'termination',await service.eosPolicy()).amount)
  await repos.RequestsConfig.update({key:'leave.accrual_mode'},{value:'daily'})
  const daily=await service.buildSettlement({id:0,employeeId:target.id,lastWorkingDay:'2026-09-30',terminationReason:'termination'},true,true)
  assert.equal(daily.find(l=>l.label.startsWith('بدل رصيد')).amount,Math.round((Math.round(273*21/365*100)/100)*230*100)/100)
  await repos.Employee.update({id:target.id},{annualLeaveEntitled:false})
  const none=await service.buildSettlement({id:0,employeeId:target.id,lastWorkingDay:'2026-09-30',terminationReason:'termination'},true,true)
  assert.equal(none.some(l=>l.label.startsWith('بدل رصيد')),false)
})

test('direct custody writes enforce branch, typed patch, pending reservation and atomic transitions', async () => {
  const operator = await repos.User.save({email:'custody@test.invalid',displayName:'Custody operator',passwordHash:'unused',role:'employee',branchId:branch.id,employeeId:emp.id,permissions:JSON.stringify(['custody.assign'])})
  const a=await request(admin,'POST','/assets',{name:'Integrity laptop',category:'Laptop',value:5000})
  assert.equal(a.status,201)
  assert.equal((await request(operator,'POST','/custody/assign',{assetId:a.body.id,employeeId:otherEmp.id})).status,404)
  const assigned=await request(admin,'POST','/custody/assign',{assetId:a.body.id,employeeId:otherEmp.id})
  assert.equal(assigned.status,201,JSON.stringify(assigned.body))
  assert.equal((await request(admin,'POST',`/assets/${a.body.id}/retire`)).status,400)
  assert.equal((await request(admin,'POST','/custody/assign',{assetId:a.body.id,employeeId:emp.id})).status,400)
  assert.equal((await request(operator,'POST',`/custody/${assigned.body.id}/return`,{})).status,404)
  assert.equal((await request(operator,'POST',`/custody/${assigned.body.id}/write-off`,{})).status,404)
  assert.equal((await request(admin,'PATCH',`/assets/${a.body.id}`,{value:-1})).status,400)
  const patched=await request(admin,'PATCH',`/assets/${a.body.id}`,{name:'Integrity renamed',status:'RETIRED',currentHolderId:emp.id})
  assert.equal(patched.status,200);assert.equal(patched.body.status,'AVAILABLE');assert.equal(patched.body.currentHolderId,null)
  assert.equal((await request(admin,'POST',`/custody/${assigned.body.id}/write-off`,{lost:'false'})).status,400)
  const returned=await request(admin,'POST',`/custody/${assigned.body.id}/return`,{condition:'Checked'})
  assert.equal(returned.status,201);assert.equal(returned.body.status,'RETURNED')
  assert.equal(assigned.body.assignedBy,null,'unlinked user does not write users.id into employees.id field')
  const linked=await request(operator,'POST','/custody/assign',{assetId:a.body.id,employeeId:emp.id})
  assert.equal(linked.status,201,JSON.stringify(linked.body))
  assert.equal(linked.body.assignedBy,emp.id)
  assert.equal(linked.body.assignedByEmployeeId,emp.id)
  assert.equal((await entity('requests/entities/custody.entities','CustodyAssignment').findOneByOrFail({id:linked.body.id})).assignedBy,emp.id)
})

test('device catalogs isolate branches and protect secrets on write responses',async()=>{
  const a=await request(admin,'POST','/catalogs/devices',{name:'Integrity device',serialNumber:'INT_DEVICE',branchId:otherBranch.id,authKey:'1234'})
  assert.equal(a.status,201,JSON.stringify(a.body));assert.equal(a.body.authKey,undefined)
  const list=await request(hr,'GET','/catalogs/devices');assert.equal(list.status,200);assert.equal(list.body.some(d=>d.id===a.body.id),false)
  assert.equal((await request(hr,'PATCH',`/catalogs/devices/${a.body.id}`,{name:'foreign'})).status,404)
  assert.equal((await request(hr,'POST','/catalogs/devices',{name:'foreign',serialNumber:'INT_OTHER',branchId:otherBranch.id})).status,403)
})

test('onboarding persists one checklist under concurrent views and enforces task party and branch',async()=>{
  const target=await employeeFixture({joinDate:day(new Date())})
  const outcomes=await Promise.all([request(admin,'GET','/onboarding'),request(admin,'GET','/onboarding')])
  outcomes.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.body)))
  const tasks=await entity('onboarding/onboarding.entities','OnboardingTask').findBy({employeeId:target.id})
  assert.ok(tasks.length>0);assert.equal(new Set(tasks.map(t=>t.templateItemId)).size,tasks.length)
  assert.equal((await request(outsider,'PATCH',`/onboarding/tasks/${tasks[0].id}`,{status:'DONE'})).status,404)
  assert.equal((await request(employee,'PATCH',`/onboarding/tasks/${tasks[0].id}`,{status:'DONE'})).status,403)
  const done=await request(hr,'PATCH',`/onboarding/tasks/${tasks[0].id}`,{status:'DONE',note:'Verified'})
  assert.equal(done.status,200,JSON.stringify(done.body));assert.equal(done.body.status,'DONE')
  const persisted=await entity('onboarding/onboarding.entities','OnboardingTask').findOneBy({id:tasks[0].id});assert.equal(persisted.doneBy,hr.id)
})

test('file references in forged drafts or unrelated submitted requests never grant download access',async()=>{
  const fileRepo=entity('files/stored-file.entity','StoredFile')
  const file=await fileRepo.save({originalName:'confidential.pdf',storedName:'integrity-missing.pdf',mime:'application/pdf',size:1,
    employeeId:otherEmp.id,uploadedBy:outsider.id,entityType:'request'})
  await repos.RequestType.save({code:'I_FILE_ACCESS',nameAr:'File access',category:'personal_data',destinationHandler:'none',isActive:true})
  const forged=await repos.Request.save({typeCode:'I_FILE_ACCESS',requesterId:emp.id,createdByUserId:employee.id,
    branchId:branch.id,status:'DRAFT',payload:JSON.stringify({attachmentUrl:`file:${file.id}`})})
  assert.equal((await request(employee,'GET',`/files/${file.id}`)).status,403)
  await repos.Request.update({id:forged.id},{status:'SUBMITTED'})
  assert.equal((await request(employee,'GET',`/files/${file.id}`)).status,403)
  const owned=await fileRepo.save({originalName:'owned.pdf',storedName:'integrity-owned-missing.pdf',mime:'application/pdf',size:1,
    employeeId:emp.id,uploadedBy:employee.id,entityType:'request'})
  const valid=await repos.Request.save({typeCode:'I_FILE_ACCESS',requesterId:emp.id,createdByUserId:employee.id,
    branchId:branch.id,status:'SUBMITTED',payload:JSON.stringify({attachmentUrl:`file:${owned.id}`})})
  // Admin has legitimate request visibility and reaches the missing-storage check.
  assert.equal((await request(admin,'GET',`/files/${owned.id}`)).status,404)
  await repos.Request.update({id:valid.id},{status:'DRAFT'})
  assert.equal((await request(admin,'GET',`/files/${owned.id}`)).status,403)
})

test('production bootstrap rejects automatic schema synchronization and published signing secrets',()=>{
  const {validateEnv}=require('../src/auth/jwt-secret')
  assert.throws(()=>validateEnv({NODE_ENV:'production',JWT_SECRET:secret,DB_SYNCHRONIZE:'true'}),/DB_SYNCHRONIZE/)
  assert.throws(()=>validateEnv({NODE_ENV:'production',JWT_SECRET:'change-this-to-a-long-random-secret-in-production',DB_SYNCHRONIZE:'false'}),/JWT_SECRET/)
  assert.equal(validateEnv({NODE_ENV:'production',JWT_SECRET:secret,DB_SYNCHRONIZE:'false'}).DB_SYNCHRONIZE,'false')
})

test('non-admin accounts with no branch have an empty scope instead of all employee records',async()=>{
  const unassigned=await repos.User.save({email:'unassigned@test.invalid',displayName:'Unassigned legacy user',passwordHash:'unused',
    role:'employee',branchId:null,permissions:JSON.stringify(['employees.view','employees.edit','settings.manage'])})
  const list=await request(unassigned,'GET','/employees')
  assert.equal(list.status,200,JSON.stringify(list.body));assert.deepEqual(list.body,[])
  assert.equal((await request(unassigned,'GET',`/employees/${emp.id}`)).status,404)
  assert.equal((await request(unassigned,'PATCH',`/employees/${emp.id}`,{fullName:'Wrong scope'})).status,404)
  assert.deepEqual((await request(unassigned,'GET','/branches')).body,[])
})

test('direct custody return and loss cannot retire or release an asset during a pending transfer',async()=>{
  const aRepo=entity('requests/entities/custody.entities','Asset'),cRepo=entity('requests/entities/custody.entities','CustodyAssignment')
  const a=await aRepo.save({name:'Transfer reserved laptop',category:'Laptop',value:400,status:'ASSIGNED',currentHolderId:emp.id})
  const source=await cRepo.save({assetId:a.id,employeeId:emp.id,status:'ACTIVE'})
  await cRepo.save({assetId:a.id,employeeId:otherEmp.id,status:'PENDING_ACK'})
  assert.equal((await request(admin,'POST',`/custody/${source.id}/return`,{})).status,400)
  assert.equal((await request(admin,'POST',`/custody/${source.id}/write-off`,{})).status,400)
  assert.equal((await aRepo.findOneBy({id:a.id})).status,'ASSIGNED')
  assert.equal((await cRepo.findOneBy({id:source.id})).status,'ACTIVE')
})

test('LEV-7 concurrent direct revocations restore the original leave once',async()=>{
  const target=await employeeFixture()
  await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:'2027',entitled:21,taken:10,openingDays:4,openingTaken:4})
  const leave=await repos.Leave.save({employeeId:target.id,leaveTypeCode:'annual',fromDate:'2027-03-01',toDate:'2027-03-02',days:2,period:'FULL',status:'APPROVED'})
  const responses=await Promise.all([request(admin,'POST',`/leaves/${leave.id}/revoke`),request(admin,'POST',`/leaves/${leave.id}/revoke`)])
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,400],JSON.stringify(responses))
  const balance=await repos.LeaveBalance.findOneBy({employeeId:target.id,balanceType:'annual',period:'2027'})
  assert.equal(Number(balance.taken),8);assert.equal(Number(balance.openingTaken),4)
})

test('LEV-3 concurrent balance deductions serialize and recheck available balance inside transaction',async()=>{
  const target=await employeeFixture()
  await repos.RequestsConfig.update({key:'leave.accrual_mode'},{value:'yearly'})
  await repos.RequestsConfig.update({key:'leave.annual_entitled'},{value:'10'})
  await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:'2027',entitled:10,taken:0})
  const balances=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  const result=await Promise.allSettled([ds.transaction(em=>balances.deduct(em,target.id,'annual',6,'2027-06-01')),
    ds.transaction(em=>balances.deduct(em,target.id,'annual',6,'2027-06-01'))])
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1)
  assert.equal(result.filter(r=>r.status==='rejected').length,1)
  assert.equal(Number((await repos.LeaveBalance.findOneBy({employeeId:target.id,balanceType:'annual',period:'2027'})).taken),6)
})

test('LEV-2 missed annual rollover catches up once and includes December completed accrual',async()=>{
  const target=await employeeFixture()
  const year=new Date().getFullYear(),prior=String(year-1),current=String(year)
  await repos.RequestsConfig.update({key:'leave.accrual_mode'},{value:'monthly'})
  await repos.RequestsConfig.save({key:'leave.carryover_max_days',value:'30'})
  await repos.RequestsConfig.save({key:'leave.carryover_expiry_months',value:'3'})
  await repos.RequestsConfig.save({key:'leave.rollover_through_period',value:String(year-2)})
  await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:prior,entitled:12,taken:0})
  await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:current,entitled:21,taken:2})
  const balances=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  const result=await balances.catchUpRollover()
  assert.equal(result.fromPeriod,prior)
  const after=await repos.LeaveBalance.findOneBy({employeeId:target.id,balanceType:'annual',period:current})
  assert.equal(Number(after.openingDays),12);assert.equal(Number(after.taken),2)
  assert.equal(after.openingExpiry,current+'-03-31')
  assert.equal(await balances.catchUpRollover(),null)
  assert.equal((await repos.RequestsConfig.findOneBy({key:'leave.rollover_through_period'})).value,prior)
})

test('JWT11 token lifetime has validated seconds and rejects invalid or nonpositive durations',()=>{
  const {jwtLifetimeSeconds}=require('../src/auth/jwt-secret')
  assert.equal(jwtLifetimeSeconds('8h'),28800)
  assert.equal(jwtLifetimeSeconds('30m'),1800)
  assert.equal(jwtLifetimeSeconds('3600'),3600)
  for(const input of ['0h','-1','forever','1.5h']) assert.throws(()=>jwtLifetimeSeconds(input),/JWT_EXPIRES_IN/)
})

test('SEC-EMP-4 document employee filter cannot replace the caller branch restriction',async()=>{
  const docs=entity('assets/assets.entities','EmployeeDocument')
  await docs.save({employeeId:otherEmp.id,docType:'identity',number:'PRIVATE-OTHER-BRANCH'})
  const own=await docs.save({employeeId:emp.id,docType:'identity',number:'OWN-BRANCH'})
  const operator=await repos.User.save({email:'docs-scope@test.invalid',displayName:'Documents operator',passwordHash:'unused',
    role:'employee',branchId:branch.id,permissions:JSON.stringify(['documents.manage'])})
  assert.equal((await request(operator,'GET',`/documents?employeeId=${otherEmp.id}`)).status,404)
  assert.equal((await request(operator,'GET','/documents?employeeId=NaN')).status,400)
  const visible=await request(operator,'GET',`/documents?employeeId=${emp.id}`)
  assert.equal(visible.status,200,JSON.stringify(visible.body));assert.ok(visible.body.some(d=>d.id===own.id))
  assert.equal(visible.body.some(d=>d.employeeId===otherEmp.id),false)
})

test('NAM-14 bare employee readers cannot retrieve finance through list detail profile or history',async()=>{
  const target=await employeeFixture({basicSalary:6578.91,iban:'SA0311111111111111111111',bankName:'Sensitive bank',housingAllowance:321,gosiBaseSalary:5678})
  const reader=await repos.User.save({email:'read-only-finance@test.invalid',displayName:'Read-only',passwordHash:'unused',role:'employee',branchId:branch.id,permissions:JSON.stringify(['employees.view'])})
  const payroll=await repos.User.save({email:'read-payroll@test.invalid',displayName:'Payroll',passwordHash:'unused',role:'employee',branchId:branch.id,permissions:JSON.stringify(['employees.view','payroll.view'])})
  const owner=await repos.User.save({email:'own-finance@test.invalid',displayName:'Owner',passwordHash:'unused',role:'employee',branchId:branch.id,employeeId:target.id,permissions:'[]'})
  const hist=entity('requests/entities/employment.entities','EmployeeStatusHistory')
  await hist.save([
    {employeeId:target.id,oldStatus:'iban:SA0322222222222222222222',newStatus:'iban:'+target.iban,reason:'Old and new SA0322222222222222222222 '+target.iban},
    {employeeId:target.id,oldStatus:'salary:6000',newStatus:'salary:6578.91',reason:'Approved raise to 6578.91'},
    {employeeId:target.id,oldStatus:'probation',newStatus:'active',reason:'Passed probation'},
    {employeeId:target.id,oldStatus:'notice_period',newStatus:'terminated',reason:'انتهاء خدمة — تصفية SET-2026-00001 بصافي 19876.54'},
  ])
  await repos.Loan.save({employeeId:target.id,amount:1900,status:'APPROVED'})
  const detail=await request(reader,'GET',`/employees/${target.id}`)
  const list=await request(reader,'GET','/employees')
  const profile=await request(reader,'GET',`/employees/${target.id}/profile`)
  const history=await request(reader,'GET',`/employees/${target.id}/history`)
  for(const response of [detail,list,profile,history])assert.equal(response.status,200,JSON.stringify(response.body))
  for(const row of [detail.body,list.body.find(e=>e.id===target.id),profile.body.employee]){
    for(const key of ['basicSalary','housingAllowance','transportAllowance','phoneAllowance','workNatureAllowance','otherAllowance','iban','bankName','bankBranch','gosiBaseSalary'])assert.equal(row[key],undefined,key)
  }
  for(const rows of [profile.body.history,history.body]){
    assert.equal(rows.length,4)
    assert.equal(rows.some(r=>r.newStatus==='active'),true)
    assert.equal(JSON.stringify(rows).includes('6578.91'),false)
    assert.equal(JSON.stringify(rows).includes('SA03'),false)
    assert.equal(JSON.stringify(rows).includes('19876.54'),false)
    assert.equal(rows.some(r=>r.newStatus==='terminated'&&r.reason==='انتهاء خدمة — تصفية معتمدة'),true)
  }
  assert.deepEqual(profile.body.loans,[])
  for(const permitted of [owner,payroll,hr]){
    const own=await request(permitted,'GET',`/employees/${target.id}/profile`)
    assert.equal(own.status,200,JSON.stringify(own.body))
    assert.equal(Number(own.body.employee.basicSalary),6578.91)
    assert.equal(own.body.employee.iban,target.iban)
    assert.equal(own.body.loans.length,1)
    assert.equal(own.body.history.some(r=>r.newStatus==='salary:6578.91'),true)
    assert.equal(JSON.stringify(own.body.history).includes(target.iban),false,'bank audit remains masked even for finance readers')
    assert.equal(own.body.history.some(r=>r.newStatus==='terminated'&&r.reason.includes('19876.54')),true)
  }
  assert.equal((await request(outsider,'GET',`/employees/${target.id}/profile`)).status,403)
  assert.equal((await repos.Employee.findOneByOrFail({id:target.id})).iban,target.iban,'projection must not rewrite source')
})

test('NAM-14 structured changes mask bank audit at rest, preserve actors and legacy API contracts, and roll back atomically',async()=>{
  const target=await employeeFixture({iban:'SA0311111111111111111111',basicSalary:6000,contractType:'fixed_term',contractStart:'2025-01-01',contractEnd:'2025-12-31'})
  const hist=entity('requests/entities/employment.entities','EmployeeStatusHistory')
  const nextIban='SA0322222222222222222222'
  const changed=await request(hr,'PATCH',`/employees/${target.id}`,{iban:nextIban,basicSalary:6200,workType:'parttime'})
  assert.equal(changed.status,200,JSON.stringify(changed.body))
  const bank=await hist.findOneBy({employeeId:target.id,changeType:'BANK',fieldName:'iban'})
  assert.ok(bank); assert.equal(bank.oldValue,'****1111'); assert.equal(bank.newValue,'****2222')
  assert.equal(bank.changedByUserId,hr.id); assert.equal(bank.oldStatus,null); assert.equal(bank.newStatus,'change')
  assert.equal((await repos.Employee.findOneByOrFail({id:target.id})).iban,nextIban,'employee account stays complete')
  assert.equal((await repos.Employee.findOneByOrFail({id:target.id})).workType,'part_time')
  const salary=await hist.findOneBy({employeeId:target.id,changeType:'SALARY'})
  assert.equal(Number(salary.oldValue),6000); assert.equal(Number(salary.newValue),6200)
  assert.equal(JSON.stringify(await hist.findBy({employeeId:target.id})).includes(nextIban),false)
  const reader=await repos.User.save({email:'structured-audit-reader@test.invalid',displayName:'Reader',passwordHash:'unused',role:'employee',branchId:branch.id,permissions:JSON.stringify(['employees.view'])})
  for(const suffix of ['/history','/profile']){
    const permitted=await request(hr,'GET',`/employees/${target.id}${suffix}`)
    const allowed=suffix==='/history'?permitted.body:permitted.body.history
    assert.equal(allowed.some(r=>r.newStatus==='iban:****2222'),true)
    assert.equal(allowed.some(r=>r.newStatus==='basicSalary:6200'),true)
    const denied=await request(reader,'GET',`/employees/${target.id}${suffix}`)
    const rows=suffix==='/history'?denied.body:denied.body.history
    for(const row of rows.filter(r=>['BANK','SALARY'].includes(r.changeType))){assert.equal(row.oldValue,null);assert.equal(row.newValue,null)}
    assert.equal(JSON.stringify(rows).includes('6200'),false)
  }
  const record=require('../src/employees/employee-change-log').recordEmployeeChange
  const redact=require('../src/employees/employee-change-log').redactAuditText
  assert.equal(redact('Approved '+nextIban+' to employee after review',[nextIban]),'Approved ****2222 to employee after review')
  assert.equal(redact('Account '+nextIban.match(/.{1,4}/g).join(' ')+' approved',[nextIban]),'Account ****2222 approved')
  const beforeCount=await hist.countBy({employeeId:target.id})
  await assert.rejects(ds.transaction(async em=>{
    await record(em,{employeeId:target.id,fieldName:'iban',oldValue:nextIban,newValue:'SA0333333333333333333333',reason:'IBAN '+nextIban,changedByUserId:hr.id})
    throw new Error('forced audit rollback')
  }),/forced audit rollback/)
  assert.equal(await hist.countBy({employeeId:target.id}),beforeCount)
  const direct=await ds.transaction(em=>record(em,{employeeId:target.id,fieldName:'iban',oldValue:nextIban,newValue:null,reason:'IBAN '+nextIban,changedByUserId:hr.id}))
  assert.equal(direct.reason.includes(nextIban),false)
})

test('document attachment ownership links preliminary uploads and blocks forged or cross-employee files atomically',async()=>{
  const files=entity('files/stored-file.entity','StoredFile')
  const docs=entity('assets/assets.entities','EmployeeDocument')
  assert.ok(await entity('assets/assets.entities','DocType').findOneBy({code:'contract',isActive:true}),'base document catalog is registered on application bootstrap')
  const target=await employeeFixture()
  const uploader=await repos.User.save({email:'attach-owner@test.invalid',displayName:'Uploader',passwordHash:'unused',role:'employee',branchId:branch.id,employeeId:emp.id,permissions:JSON.stringify(['employees.create','employees.edit','employees.view','documents.manage'])})
  const makeFile=extra=>files.save({originalName:'synthetic.pdf',storedName:'integrity-test-nonexistent/'+crypto.randomUUID()+'.pdf',mime:'application/pdf',size:12,entityType:'document',uploadedBy:uploader.id,employeeId:emp.id,...extra})
  const pending=await makeFile()
  const made=await request(uploader,'POST','/documents',{employeeId:target.id,docType:'contract',fileRef:`file:${pending.id}`})
  assert.equal(made.status,201,JSON.stringify(made.body))
  assert.equal((await files.findOneByOrFail({id:pending.id})).employeeId,target.id)
  const targetUser=await repos.User.save({email:'attachment-target@test.invalid',displayName:'Target',passwordHash:'unused',role:'employee',branchId:branch.id,employeeId:target.id,permissions:'[]'})
  assert.equal((await request(targetUser,'GET',`/files/${pending.id}`)).status,404,'owner passes authorization and reaches nonexistent synthetic disk file')
  const unknown=await makeFile({uploadedBy:outsider.id,employeeId:null})
  const foreign=await makeFile({employeeId:otherEmp.id})
  const selfLinked=await makeFile()
  await docs.save({employeeId:emp.id,docType:'contract',fileRef:`file:${selfLinked.id}`})
  for(const file of [unknown,foreign,selfLinked]){
    const beforeCount=await docs.count()
    const denied=await request(uploader,'POST','/documents',{employeeId:target.id,docType:'contract',fileRef:`file:${file.id}`})
    assert.equal(denied.status,403,JSON.stringify(denied.body))
    assert.equal(await docs.count(),beforeCount)
    const edited=await request(uploader,'PATCH',`/documents/${made.body.id}`,{fileRef:`file:${file.id}`})
    assert.equal(edited.status,403)
    assert.equal((await docs.findOneByOrFail({id:made.body.id})).fileRef,`file:${pending.id}`)
  }
  const contract=await makeFile({entityType:'contract'})
  const photo=await makeFile({entityType:'employee_photo',mime:'image/png'})
  const attachment=await makeFile()
  const code='ATT'+crypto.randomBytes(4).toString('hex')
  const createdEmployee=await request(uploader,'POST','/employees',{employeeCode:code,fullName:'Attachment lifecycle',branchId:branch.id,basicSalary:5000,joinDate:'2026-01-01',photoFileId:photo.id,contractFileRef:`file:${contract.id}`,documentRefs:[{docType:'contract',fileRef:`file:${attachment.id}`}]})
  assert.equal(createdEmployee.status,201,JSON.stringify(createdEmployee.body))
  for(const file of [contract,photo,attachment])assert.equal((await files.findOneByOrFail({id:file.id})).employeeId,createdEmployee.body.id)
  assert.equal(await docs.count({where:{employeeId:createdEmployee.body.id}}),2)
  const rollbackFile=await makeFile()
  const rollbackCode='BAD'+crypto.randomBytes(4).toString('hex')
  const bad=await request(uploader,'POST','/employees',{employeeCode:rollbackCode,fullName:'Must rollback',branchId:branch.id,basicSalary:5000,joinDate:'2026-01-01',documentRefs:[{docType:'contract',fileRef:`file:${rollbackFile.id}`},{docType:'contract',fileRef:`file:${unknown.id}`}]})
  assert.equal(bad.status,403,JSON.stringify(bad.body))
  assert.equal(await repos.Employee.count({where:{employeeCode:rollbackCode}}),0)
  assert.equal((await files.findOneByOrFail({id:rollbackFile.id})).employeeId,emp.id)
  const edit=await request(uploader,'PATCH',`/employees/${target.id}`,{fullName:'Must not change',documentRefs:[{docType:'contract',fileRef:`file:${unknown.id}`}]})
  assert.equal(edit.status,403)
  assert.equal((await repos.Employee.findOneByOrFail({id:target.id})).fullName,target.fullName)
})

test('NAM-34 holiday creation uses configured country and preserves explicit all-country selection',async()=>{
  const config=await repos.RequestsConfig.findOneBy({key:'system.country'})
  try {
    await repos.RequestsConfig.save({...config,key:'system.country',value:'SA'})
    const configured=await request(admin,'POST','/catalogs/holidays',{name:'Country from config',date:'2035-02-05'})
    assert.equal(configured.status,201,JSON.stringify(configured.body))
    assert.equal(configured.body.country,'SA')
    const all=await request(admin,'POST','/catalogs/holidays',{name:'Explicit all countries',date:'2035-02-06',country:''})
    assert.equal(all.status,201,JSON.stringify(all.body))
    assert.equal(all.body.country,'')
    const explicit=await request(admin,'POST','/catalogs/holidays',{name:'Explicit override',date:'2035-02-07',country:'eg'})
    assert.equal(explicit.status,201,JSON.stringify(explicit.body))
    assert.equal(explicit.body.country,'EG')
    await request(admin,'PATCH',`/catalogs/holidays/${configured.body.id}`,{name:'Country stays unchanged'})
    assert.equal((await entity('assets/assets.entities','PublicHoliday').findOneByOrFail({id:configured.body.id})).country,'SA')
  } finally {
    if(config)await repos.RequestsConfig.save(config)
    else await repos.RequestsConfig.delete({key:'system.country'})
  }
})

test('document catalog bootstrap preserves existing names and disabled states without duplicate codes',async()=>{
  const types=entity('assets/assets.entities','DocType')
  const contract=await types.findOneByOrFail({code:'contract'})
  await types.update({id:contract.id},{nameAr:'Company-specific contract',isActive:false})
  const before=await types.count()
  const service=app.get(require('../src/assets/doc-types-defaults.service').DocTypesDefaultsService)
  await service.onApplicationBootstrap()
  await service.onApplicationBootstrap()
  const after=await types.findOneByOrFail({id:contract.id})
  assert.equal(after.nameAr,'Company-specific contract')
  assert.equal(after.isActive,false)
  assert.equal(await types.count(),before)
})

test('LEV-16 adjustment enforces permission branch current year precision and required audit reason',async()=>{
  const year=String(new Date().getFullYear())
  const target=await employeeFixture()
  const operator=await repos.User.save({email:'leave-adjust@test.invalid',displayName:'Balance operator',passwordHash:'unused',role:'employee',branchId:branch.id,permissions:JSON.stringify(['leave_balances.manage'])})
  const endpoint=`/requests/leave-balances/${target.id}/adjust`
  const valid={balanceType:'annual',period:year,delta:2.5,reason:'Verified opening reconciliation',idempotencyKey:crypto.randomUUID()}
  for(const actor of [employee,hr])assert.equal((await request(actor,'POST',endpoint,valid)).status,403)
  assert.equal((await request(operator,'POST',`/requests/leave-balances/${otherEmp.id}/adjust`,valid)).status,404)
  for(const bad of [{delta:0},{delta:-10000},{delta:1.001},{delta:'2.5'},{delta:null},{reason:'   '},{reason:'x'},{period:String(Number(year)-1)},{period:String(Number(year)+1)},{idempotencyKey:'not-uuid'},{balanceType:'unknown_type'}]){
    assert.equal((await request(operator,'POST',endpoint,{...valid,...bad})).status,400,JSON.stringify(bad))
  }
  const audit=entity('requests/entities/leave.entities','LeaveBalanceAdjustment')
  assert.equal(await audit.count({where:{employeeId:target.id}}),0)
  assert.equal(await repos.LeaveBalance.count({where:{employeeId:target.id}}),0,'rejected first adjustment must not leave a balance row')
  const success=await request(operator,'POST',endpoint,valid)
  assert.equal(success.status,201,JSON.stringify(success.body))
  assert.equal(Number(success.body.balance.adjustmentDays),2.5)
  assert.equal(success.body.adjustment.actorUserId,operator.id)
  assert.equal(success.body.adjustment.reason,valid.reason)
  assert.equal(success.body.replayed,false)
  const history=await request(operator,'GET',`/requests/leave-balances/${target.id}/adjustments?period=${year}`)
  assert.equal(history.status,200);assert.equal(history.body.length,1)
  assert.equal((await request(employee,'GET',`/requests/leave-balances/${target.id}/adjustments`)).status,403)
  assert.equal((await request(operator,'GET',`/requests/leave-balances/${otherEmp.id}/adjustments`)).status,404)
})

test('LEV-16 adjustment layer survives policy recomputation and flows through deduction restoration settlement and rollover',async()=>{
  const year=String(new Date().getFullYear()),today=new Date().toISOString().slice(0,10)
  const keys=['leave.annual_entitled','leave.accrual_mode','leave.carryover_max_days','payroll.monthly_days']
  const old=await Promise.all(keys.map(key=>repos.RequestsConfig.findOneBy({key})))
  try {
    for(const [key,value] of [['leave.annual_entitled','10'],['leave.accrual_mode','yearly'],['leave.carryover_max_days','100'],['payroll.monthly_days','30']])await repos.RequestsConfig.save({key,value})
    const target=await employeeFixture({basicSalary:3000})
    const row=await repos.LeaveBalance.save({employeeId:target.id,balanceType:'annual',period:year,entitled:10,taken:3,openingDays:0,openingTaken:0})
    const leave=await repos.Leave.save({employeeId:target.id,leaveTypeCode:'ANNUAL',fromDate:year+'-01-02',toDate:year+'-01-04',days:3,status:'APPROVED'})
    const endpoint=`/requests/leave-balances/${target.id}/adjust`
    const result=await request(admin,'POST',endpoint,{balanceType:'annual',period:year,delta:2.5,reason:'Prior balance reconciliation',expectedRemaining:7,idempotencyKey:crypto.randomUUID()})
    assert.equal(result.status,201,JSON.stringify(result.body))
    assert.equal(result.body.adjustment.beforeRemaining,7);assert.equal(result.body.adjustment.afterRemaining,9.5)
    const stored=await repos.LeaveBalance.findOneByOrFail({id:row.id})
    assert.equal(Number(stored.entitled),10);assert.equal(Number(stored.taken),3);assert.equal(Number(stored.adjustmentDays),2.5)
    assert.deepEqual({...await repos.Leave.findOneByOrFail({id:leave.id})},{...leave})
    await repos.RequestsConfig.update({key:'leave.annual_entitled'},{value:'20'})
    const balances=app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
    assert.equal((await balances.balanceOf(target.id,'annual',today)).remaining,19.5)
    await ds.transaction(em=>balances.deduct(em,target.id,'annual',1,today))
    assert.equal((await balances.balanceOf(target.id,'annual',today)).remaining,18.5)
    await ds.transaction(em=>balances.restore(em,target.id,'annual',1,year))
    assert.equal((await balances.balanceOf(target.id,'annual',today)).remaining,19.5)
    assert.equal(Number((await repos.LeaveBalance.findOneByOrFail({id:row.id})).adjustmentDays),2.5)
    const service=app.get(require('../src/offboarding/offboarding.service').OffboardingService)
    const lines=await service.buildSettlement({id:0,employeeId:target.id,lastWorkingDay:today,terminationReason:'termination'},true,true)
    assert.equal(lines.find(l=>l.label.startsWith('بدل رصيد')).amount,1950)
    await balances.rollover(year)
    const carried=await repos.LeaveBalance.findOneByOrFail({employeeId:target.id,balanceType:'annual',period:String(Number(year)+1)})
    assert.equal(Number(carried.openingDays),19.5)
    assert.equal(Number(carried.adjustmentDays),0,'adjustment is carried once in opening, never duplicated as another adjustment')
  } finally {
    for(let i=0;i<keys.length;i++)if(old[i])await repos.RequestsConfig.save(old[i]);else await repos.RequestsConfig.delete({key:keys[i]})
  }
})

test('LEV-16 concurrent duplicate submissions execute once while stale or changed commands cannot overwrite balances',async()=>{
  const year=String(new Date().getFullYear())
  const target=await employeeFixture()
  const endpoint=`/requests/leave-balances/${target.id}/adjust`
  const body={balanceType:'sick',period:year,delta:0.5,reason:'Confirmed half-day reconciliation',idempotencyKey:crypto.randomUUID()}
  const both=await Promise.all([request(admin,'POST',endpoint,body),request(admin,'POST',endpoint,body)])
  for(const r of both)assert.equal(r.status,201,JSON.stringify(r.body))
  assert.equal(both[0].body.adjustment.id,both[1].body.adjustment.id)
  assert.deepEqual(both.map(r=>r.body.replayed).sort(),[false,true])
  const audit=entity('requests/entities/leave.entities','LeaveBalanceAdjustment')
  assert.equal(await audit.count({where:{employeeId:target.id}}),1)
  assert.equal(Number((await repos.LeaveBalance.findOneByOrFail({employeeId:target.id,balanceType:'sick',period:year})).adjustmentDays),0.5)
  const retry=await request(admin,'POST',endpoint,{...body,expectedRemaining:0})
  assert.equal(retry.status,201);assert.equal(retry.body.replayed,true)
  assert.equal((await request(admin,'POST',endpoint,{...body,delta:1})).status,409)
  assert.equal((await request(admin,'POST',endpoint,{...body,idempotencyKey:crypto.randomUUID(),expectedRemaining:0})).status,409)
  assert.equal((await request(admin,'POST',endpoint,{...body,idempotencyKey:crypto.randomUUID(),delta:-9999})).status,400)
  assert.equal(await audit.count({where:{employeeId:target.id}}),1)
  const sick=await repos.LeaveBalance.findOneByOrFail({employeeId:target.id,balanceType:'sick',period:year})
  const current=both[0].body.balance.remaining
  const deduction=-Math.round((current-1)*100)/100
  const negatives=await Promise.all([1,2].map(()=>request(admin,'POST',endpoint,{...body,delta:deduction,idempotencyKey:crypto.randomUUID()})))
  assert.deepEqual(negatives.map(r=>r.status).sort(),[201,400])
  const final=await repos.LeaveBalance.findOneByOrFail({id:sick.id})
  assert.equal(Number(final.taken),0)
  assert.equal(await audit.count({where:{employeeId:target.id}}),2)
})

test('LEV-16 SQL migration upgrades a disposable old balance table idempotently without changing consumed days',async()=>{
  const migrationDatabase=database+'_migration'
  assert.match(migrationDatabase,/^hr_integrity_test_[a-f0-9]{16}_migration$/)
  let migrationPool
  await master.request().query(`CREATE DATABASE [${migrationDatabase}]`)
  try {
    migrationPool=await new sql.ConnectionPool({server:env.DB_HOST||'localhost',port:Number(env.DB_PORT||1433),user:env.DB_USERNAME||'sa',password:env.DB_PASSWORD,database:migrationDatabase,options:{encrypt:false,trustServerCertificate:true}}).connect()
    await migrationPool.request().batch('CREATE TABLE dbo.leave_balances (id int IDENTITY(1,1) PRIMARY KEY, employeeId int, entitled decimal(6,2), taken decimal(6,2)); INSERT INTO dbo.leave_balances (employeeId,entitled,taken) VALUES(123,21,4.5);')
    const migration=fs.readFileSync(path.resolve(apiRoot,'../docs/migrations/2026-09-11_leave_balance_adjustments.sql'),'utf8')
    await migrationPool.request().batch(migration)
    await migrationPool.request().batch(migration)
    const records=(await migrationPool.request().query('SELECT * FROM dbo.leave_balances')).recordset
    assert.equal(records.length,1);assert.equal(records[0].taken,4.5);assert.equal(records[0].entitled,21);assert.equal(records[0].adjustmentDays,0)
    assert.equal((await migrationPool.request().query('SELECT COUNT(*) AS count FROM dbo.leave_balance_adjustments')).recordset[0].count,0)
  } finally {
    if(migrationPool)await migrationPool.close()
    await master.request().query(`ALTER DATABASE [${migrationDatabase}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${migrationDatabase}]`)
  }
})

test('LEV-16 database audit failure rolls back the balance and permits a safe retry with the same operation key',async()=>{
  const target=await employeeFixture(),year=String(new Date().getFullYear())
  const row=await repos.LeaveBalance.save({employeeId:target.id,balanceType:'sick',period:year,entitled:180,taken:4,adjustmentDays:1})
  const body={balanceType:'sick',period:year,delta:2,reason:'Synthetic forced audit failure',idempotencyKey:crypto.randomUUID()}
  assert.match(ds.options.database,/^hr_integrity_test_[a-f0-9]{16}$/)
  const audit=entity('requests/entities/leave.entities','LeaveBalanceAdjustment')
  await ds.query("CREATE TRIGGER dbo.test_leave_adjustment_failure ON dbo.leave_balance_adjustments AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS (SELECT 1 FROM inserted WHERE reason = N'Synthetic forced audit failure') THROW 51001, 'Synthetic audit storage failure', 1; END")
  try {
    app.useLogger(false)
    const failed=await request(admin,'POST',`/requests/leave-balances/${target.id}/adjust`,body)
    assert.equal(failed.status,500)
    const unchanged=await repos.LeaveBalance.findOneByOrFail({id:row.id})
    assert.equal(Number(unchanged.adjustmentDays),1);assert.equal(Number(unchanged.taken),4)
    assert.equal(await audit.count({where:{employeeId:target.id}}),0)
  } finally {
    app.useLogger(['error'])
    await ds.query('DROP TRIGGER dbo.test_leave_adjustment_failure')
  }
  const retry=await request(admin,'POST',`/requests/leave-balances/${target.id}/adjust`,body)
  assert.equal(retry.status,201,JSON.stringify(retry.body));assert.equal(retry.body.replayed,false)
  assert.equal(Number((await repos.LeaveBalance.findOneByOrFail({id:row.id})).adjustmentDays),3)
  assert.equal(await audit.count({where:{employeeId:target.id}}),1)
})

test('NAM-22 historical BLOCKED clearance prevents settlement transition and approval even with a stale case phase',async()=>{
  const target=await employeeFixture()
  const kase=await repos.OffboardingCase.save({employeeId:target.id,lastWorkingDay:'2035-09-30',status:'IN_CLEARANCE',terminationReason:'termination'})
  const pending=await repos.ClearanceItem.save({caseId:kase.id,party:'hr',label:'HR verification',status:'PENDING'})
  const blocked=await repos.ClearanceItem.save({caseId:kase.id,party:'finance',label:'Historical unresolved finance',status:'BLOCKED'})
  for(const party of ['manager','it','custody'])await repos.ClearanceItem.save({caseId:kase.id,party,label:party,status:'DONE'})
  const complete=await request(admin,'POST',`/offboarding/items/${pending.id}/complete`,{})
  assert.equal(complete.status,201,JSON.stringify(complete.body))
  assert.equal((await repos.OffboardingCase.findOneByOrFail({id:kase.id})).status,'IN_CLEARANCE')
  assert.equal((await request(admin,'POST',`/offboarding/${kase.id}/approve-settlement`,{})).status,400)
  await repos.OffboardingCase.update({id:kase.id},{status:'IN_SETTLEMENT'})
  const denied=await request(admin,'POST',`/offboarding/${kase.id}/approve-settlement`,{})
  assert.equal(denied.status,400,JSON.stringify(denied.body))
  assert.match(denied.body.message,/إخلاء الطرف/)
  assert.equal((await repos.OffboardingCase.findOneByOrFail({id:kase.id})).settlementApprovedAt,null)
  assert.equal((await repos.ClearanceItem.findOneByOrFail({id:blocked.id})).status,'BLOCKED')
})
