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
let hrAgent, permissionType, permissionTypeZero, ghost
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
    PermissionType: 'attendance/attendance.entities',
    CustodyAssignment: 'requests/entities/custody.entities' })) repos[name] = ds.getRepository(require('../src/' + file)[name])
  // weekendDays=null = إعداد النظام؛ النص الفارغ يرفضه فحص لقطة التقويم كما يرفضه API الفروع
  // عطلة أسبوعية صريحة: أيام التقويم مقابل أيام العمل تُقاس بلا اعتماد على إعداد عام
  branch = await repos.Branch.save({ name: 'Leave A', code: 'LEAVE_A', weekendDays: 'FRI,SAT' })
  otherBranch = await repos.Branch.save({ name: 'Leave B', code: 'LEAVE_B', weekendDays: null })
  const person = async (name, branchId) => {
    const e = await repos.Employee.save({ employeeCode: name, fullName: name, branchId, joinDate: '2020-01-01', status: 'active' })
    return repos.User.save({ email: name+'@test.invalid', displayName: name, role: 'employee', employeeId: e.id, branchId, passwordHash: 'unused' })
  }
  alice = await person('ALICE', branch.id); bob = await person('BOB', branch.id); outsider = await person('OUTSIDER', otherBranch.id)
  admin = await repos.User.save({ email: 'admin@test.invalid', displayName: 'Admin', role: 'super_admin', permissions: '["*"]', passwordHash: 'unused' })
  hr = await repos.User.save({ email: 'hr@test.invalid', displayName: 'HR', role: 'hr_manager', branchId: branch.id, permissions: '["leaves.view_all","employees.view","leave_balances.manage","requests.view_all"]', passwordHash: 'unused' })
  await repos.LeaveType.save([{ code: 'ANNUAL', nameAr: 'Annual', balanceType: 'annual', isPaid: true },
    { code: 'CASUAL', nameAr: 'Casual', balanceType: 'none', isPaid: true },
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
  // نوع مدفوع بلا خصم رصيد — للمقارنة مع «بدون مرتب» على نفس شكل المدى
  await profile('LEAVE_CASUAL', chainA.id, 'leave_calendar_payroll', bob.employeeId, 'casualReason')
  // موارد بشرية بلا نطاق فرع: تقدّم نيابةً وتتصرف في الخطوات الواقفة
  const hrEmployee = await repos.Employee.save({ employeeCode: 'HRAGENT', fullName: 'HRAGENT', branchId: branch.id, joinDate: '2020-01-01', status: 'active' })
  hrAgent = await repos.User.save({ email: 'hragent@test.invalid', displayName: 'HR Agent', role: 'hr_manager', employeeId: hrEmployee.id, branchId: branch.id,
    permissions: '["requests.create_on_behalf","request_types.manage","requests.view_all","employees.view"]', passwordHash: 'unused' })
  const permissionChain = await repos.ApprovalChain.save({ code: 'PROFILE_PERM', nameAr: 'Permission chain', autoApprove: false })
  await repos.ApprovalStep.save({ chainId: permissionChain.id, stepOrder: 1, approverRole: 'executive' })
  await repos.RequestType.save({ code: 'PERMISSION', nameAr: 'استئذان', category: 'time_attendance', destinationHandler: 'attendance_log',
    approvalChainId: permissionChain.id, requiredFields: '["date","from","to"]', isActive: true })
  permissionType = await repos.PermissionType.save({ nameAr: 'إذن شهري للاختبار', isDeductible: false, monthlyFreeCount: 2, isActive: true })
  // 0 = بلا حدّ على العدد (معناه في محرك الحضور: بلا مرات مجانية) — لا يرفض تقديماً
  permissionTypeZero = await repos.PermissionType.save({ nameAr: 'إذن بلا حدّ عدد', isDeductible: true, monthlyFreeCount: 0, isActive: true })
  // خطوة واقفة فعلاً: معتمد مسمّى غادر (موظف بلا حساب) — مقابل خطوة معتمدها حاضر
  ghost = await repos.Employee.save({ employeeCode: 'GHOST', fullName: 'GHOST', branchId: branch.id, joinDate: '2020-01-01', status: 'active' })
  const stuckChain = await repos.ApprovalChain.save({ code: 'PROFILE_STUCK', nameAr: 'Stuck chain', autoApprove: false })
  await repos.ApprovalStep.save({ chainId: stuckChain.id, stepOrder: 1, approverRole: 'specific_employee', specificEmployeeId: ghost.id })
  const liveChain = await repos.ApprovalChain.save({ code: 'PROFILE_LIVE', nameAr: 'Live chain', autoApprove: false })
  await repos.ApprovalStep.save({ chainId: liveChain.id, stepOrder: 1, approverRole: 'specific_employee', specificEmployeeId: alice.employeeId })
  const note = (code, nameAr, category, chainId, visibleTo) => repos.RequestType.save({ code, nameAr, category, destinationHandler: 'none',
    approvalChainId: chainId, requiredFields: '["reason"]', isActive: true, ...(visibleTo ? { visibleTo: JSON.stringify(visibleTo) } : {}) })
  await note('STUCK_NOTE', 'طلب على معتمد غائب', 'employee_relations', stuckChain.id, { mode: 'employees', ids: [bob.employeeId] })
  await note('LIVE_NOTE', 'طلب على معتمد حاضر', 'employee_relations', liveChain.id, { mode: 'employees', ids: [bob.employeeId] })
  await note('MONEY_NOTE', 'طلب مالي', 'financial', chainB.id, null)
  await note('HR_SELF_NOTE', 'طلب للموارد البشرية نفسها', 'employee_relations', chainB.id, null)
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
  assert.deepEqual(group.leaveProfiles.map(p => p.definitionCode).sort(), ['LEAVE_ANNUAL', 'LEAVE_CASUAL', 'LEAVE_UNPAID'])
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

test('A3 unpaid leave is counted in calendar days while paid leave keeps working days', async () => {
  const unpaid = await request(bob, 'POST', '/requests', { typeCode: 'LEAVE_UNPAID', submit: true,
    payload: { fromDate: '2026-09-17', toDate: '2026-09-20', days: 1, unpaidReason: 'بدون مرتب' } })
  assert.equal(unpaid.status, 201, JSON.stringify(unpaid.body))
  const unpaidPayload = JSON.parse(unpaid.body.payload)
  assert.equal(unpaidPayload.days, 4, 'الخميس → الأحد = 4 أيام تقويم يخصمها المسير')
  assert.deepEqual(unpaidPayload.skippedHolidays, [], 'لا يوم مستبعد في الإجازة بدون مرتب')
  const paid = await request(bob, 'POST', '/requests', { typeCode: 'LEAVE_CASUAL', submit: true,
    payload: { fromDate: '2026-09-24', toDate: '2026-09-27', days: 1, casualReason: 'مدفوعة' } })
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
  const paidPayload = JSON.parse(paid.body.payload)
  assert.equal(paidPayload.days, 2, 'المدفوعة تبقى بأيام العمل فلا يفرط خصم الرصيد')
  assert.equal(paidPayload.skippedHolidays.length, 2)
})

test('C1 a request HR files on behalf is approved and executed at once, with an audit row per step and a tagged row in «طلباتي»', async () => {
  const made = await request(hrAgent, 'POST', '/requests', { typeCode: 'LEAVE_CASUAL', submit: true, onBehalfEmployeeId: bob.employeeId,
    payload: { fromDate: '2026-11-09', toDate: '2026-11-10', days: 2, casualReason: 'نيابة عن الموظف' } })
  assert.equal(made.status, 201, `${JSON.stringify(made.body)} :: ${JSON.stringify({ hrBranch: hrAgent.branchId, hrEmp: hrAgent.employeeId, bobEmp: bob.employeeId, branch: branch.id })}`)
  assert.equal(made.body.status, 'COMPLETED', 'الوجهة تُنفَّذ في نفس معاملة التقديم')
  const leave = await repos.Leave.findOneBy({ requestId: made.body.id })
  assert.equal(leave.fromDate, '2026-11-09')
  const steps = JSON.parse(made.body.resolvedSteps)
  assert.ok(steps.length > 0 && steps.every(step => step.action === 'APPROVED' && step.actedAt))
  const audit = await repos.RequestApproval.find({ where: { requestId: made.body.id } })
  assert.equal(audit.length, steps.length, 'صف تدقيق لكل خطوة محلولة')
  assert.ok(audit.every(row => row.approverId === hrAgent.id && row.action === 'APPROVED' && row.comment))
  // الافتراضي يبقى «طلبات صاحب الحساب» (الشاشات الشخصية كما كانت)، وشاشة «طلباتي» وحدها تطلب صفوف النيابة
  const hrDefault = await request(hrAgent, 'GET', '/requests/mine')
  assert.ok(!hrDefault.body.some(row => row.id === made.body.id), 'صف النيابة لا يظهر في العقد الافتراضي')
  const hrMine = await request(hrAgent, 'GET', '/requests/mine?includeOnBehalf=1')
  const tagged = hrMine.body.find(row => row.id === made.body.id)
  assert.ok(tagged, '«طلباتي» كانت فارغة لمن قدّم بالنيابة')
  assert.equal(tagged.submittedOnBehalf, true)
  assert.equal(tagged.onBehalfOfName, 'BOB')
  const ownerMine = await request(bob, 'GET', '/requests/mine')
  const own = ownerMine.body.find(row => row.id === made.body.id)
  assert.ok(own && !own.submittedOnBehalf, 'صاحب الطلب يراه في طلباته بلا وسم نيابة')
})

test('C1 HR acts on any stuck step, but its inbox only gains the truly stuck one — not every request under review', async () => {
  const stuck = await request(bob, 'POST', '/requests', { typeCode: 'STUCK_NOTE', submit: true, payload: { reason: 'معتمده غادر' } })
  const live = await request(bob, 'POST', '/requests', { typeCode: 'LIVE_NOTE', submit: true, payload: { reason: 'معتمده حاضر' } })
  for (const made of [stuck, live]) {
    assert.equal(made.status, 201, JSON.stringify(made.body))
    assert.equal(made.body.status, 'UNDER_REVIEW')
  }
  assert.equal((await request(alice, 'POST', `/requests/${stuck.body.id}/act`, { action: 'APPROVE' })).status, 403, 'زميل بلا دور لا يتصرف')
  const inbox = await request(hrAgent, 'GET', '/requests/inbox')
  const ids = inbox.body.map(row => row.id)
  assert.ok(ids.includes(stuck.body.id), `الطلب الواقف يظهر في صندوق الموارد البشرية — الصندوق: ${JSON.stringify(ids)}`)
  assert.ok(!ids.includes(live.body.id), 'وطلب معتمده حاضر يبقى في صندوق معتمده وحده — الصندوق ليس «كل ما هو قيد المراجعة»')
  assert.ok((await request(alice, 'GET', '/requests/inbox')).body.some(row => row.id === live.body.id), 'صاحب الخطوة يراه')
  const acted = await request(hrAgent, 'POST', `/requests/${stuck.body.id}/act`, { action: 'APPROVE' })
  assert.equal(acted.status, 201, JSON.stringify(acted.body))
  assert.equal(acted.body.status, 'COMPLETED')
  // ودفع الشغل يبقى ممكناً بالفعل حتى على خطوة معتمدها حاضر (قرار المالك C1)
  assert.equal((await request(hrAgent, 'POST', `/requests/${live.body.id}/act`, { action: 'APPROVE' })).status, 201)
  // فكّ الانسداد حقّ تصرّف لا إذن اطلاع: محتوى النوع السرّي يبقى محجوباً عمّن ليس طرفاً
  const confidential = await request(hr, 'GET', '/requests/all')
  assert.equal(confidential.body.find(row => row.id === legacyB.id).confidentialMasked, true)
})

test('C1 + owner 26-Sep: HR own request keeps its chain; money HR files on behalf is approved at once; a creator without HR authority keeps the cycle and cannot approve his own', async () => {
  // طلب الموارد البشرية لنفسها: لا اعتماد فوري ولا اعتماد ذاتي بمخرج الموارد البشرية
  const own = await request(hrAgent, 'POST', '/requests', { typeCode: 'HR_SELF_NOTE', submit: true, payload: { reason: 'طلب شخصي' } })
  assert.equal(own.status, 201, JSON.stringify(own.body))
  assert.equal(own.body.status, 'UNDER_REVIEW', 'طلب النفس لا يُعتمد فوراً')
  const self = await request(hrAgent, 'POST', `/requests/${own.body.id}/act`, { action: 'APPROVE' })
  assert.equal(self.status, 403, JSON.stringify(self.body))
  assert.ok(!(await request(hrAgent, 'GET', '/requests/inbox')).body.some(row => row.id === own.body.id), 'ولا يظهر في صندوقه')
  assert.equal((await request(admin, 'POST', `/requests/${own.body.id}/act`, { action: 'APPROVE' })).status, 201, 'شخص ثانٍ يعتمده')
  // قرار المالك: المال (وما يغيّر العقد) اللي تقدّمه الموارد البشرية نيابةً بيتعتمد وينفَّذ بنداء التقديم نفسه
  const money = await request(hrAgent, 'POST', '/requests', { typeCode: 'MONEY_NOTE', submit: true, onBehalfEmployeeId: bob.employeeId,
    payload: { reason: 'مبلغ للموظف' } })
  assert.equal(money.status, 201, JSON.stringify(money.body))
  assert.equal(money.body.status, 'COMPLETED', 'الطلب المالي نيابةً يُعتمد فوراً')
  const audit = await repos.RequestApproval.findBy({ requestId: money.body.id })
  assert.equal(audit.length, JSON.parse(money.body.resolvedSteps).length)
  assert.ok(audit.every(row => row.approverId === hrAgent.id && row.action === 'APPROVED' && /اعتماد فوري/.test(row.comment)))
  // منشئ نيابةً بلا سلطة الموارد البشرية (زي مسؤول الرواتب): الطلب في دورته، ولا يعتمده بنفسه
  const desk = await repos.User.save({ email: 'desk@test.invalid', displayName: 'Payroll desk', role: 'employee', branchId: branch.id,
    permissions: '["requests.create_on_behalf","requests.view_all"]', passwordHash: 'unused' })
  const byDesk = await request(desk, 'POST', '/requests', { typeCode: 'MONEY_NOTE', submit: true, onBehalfEmployeeId: bob.employeeId, payload: { reason: 'مبلغ من مسؤول الرواتب' } })
  assert.equal(byDesk.status, 201, JSON.stringify(byDesk.body))
  assert.equal(byDesk.body.status, 'UNDER_REVIEW', 'منشئ بلا سلطة الموارد البشرية: الطلب بدورته')
  assert.equal(await repos.RequestApproval.countBy({ requestId: byDesk.body.id }), 0, 'بلا صفوف اعتماد فوري')
  assert.equal((await request(desk, 'POST', `/requests/${byDesk.body.id}/act`, { action: 'APPROVE' })).status, 403,
    'ومن أنشأه نيابةً لا يعتمده بنفسه — يلزمه شخص ثانٍ')
  assert.equal((await request(admin, 'POST', `/requests/${byDesk.body.id}/act`, { action: 'APPROVE' })).status, 201)
})

test('Owner 26-Sep: a legacy request HR filed on behalf before the decision and still pending is now decided by HR himself', async () => {
  // قبل القرار كان الطلب المالي نيابةً يمشي في دورته ومنشئه ممنوع منه؛ الواقف منه بيتقرر دلوقتي بسلطة الموارد البشرية
  const legacy = await repos.Request.save({ typeCode: 'MONEY_NOTE', requesterId: bob.employeeId, createdByUserId: hrAgent.id, branchId: branch.id,
    status: 'UNDER_REVIEW', currentStep: 1, submittedAt: new Date(), payload: JSON.stringify({ reason: 'طلب مالي قديم نيابةً' }),
    resolvedSteps: JSON.stringify([{ stepOrder: 1, role: 'executive', approverEmployeeId: null, slaDays: null, escalateTo: null, dueAt: null, actedAt: null, action: null }]) })
  const acted = await request(hrAgent, 'POST', `/requests/${legacy.id}/act`, { action: 'APPROVE', comment: 'قرار الموارد البشرية' })
  assert.equal(acted.status, 201, JSON.stringify(acted.body))
  assert.equal(acted.body.status, 'COMPLETED')
  const [decision] = await repos.RequestApproval.findBy({ requestId: legacy.id })
  assert.deepEqual([decision.approverId, decision.action], [hrAgent.id, 'APPROVED'])
})

test('Request details carry the employee card: the approver sees identity and organization, on-behalf rows name the submitter, and a confidential non-party gets none', async () => {
  const department = await ds.getRepository(require('../src/org/entities/department.entity').Department).save({ name: 'قسم الحسابات', branchId: branch.id })
  const team = await ds.getRepository(require('../src/org/entities/team.entity').Team).save({ name: 'فريق التحصيل', departmentId: department.id })
  await repos.Employee.update(bob.employeeId, { departmentId: department.id, teamId: team.id, jobTitle: 'محاسب', managerEmployeeId: alice.employeeId })
  // صاحب الخطوة المسمّى (alice) يفتح طلب bob اللي قدّمه بنفسه: البطاقة كاملة وبلا «قدّمه نيابةً»
  const live = await request(bob, 'POST', '/requests', { typeCode: 'LIVE_NOTE', submit: true, payload: { reason: 'طلب لبطاقة الموظف' } })
  assert.equal(live.status, 201, JSON.stringify(live.body))
  const seen = await request(alice, 'GET', `/requests/${live.body.id}`)
  assert.equal(seen.status, 200, JSON.stringify(seen.body))
  assert.deepEqual(seen.body.requester, { employeeId: bob.employeeId, fullName: 'BOB', employeeCode: 'BOB', jobTitle: 'محاسب', departmentName: 'قسم الحسابات',
    branchName: 'Leave A', teamName: 'فريق التحصيل', directManagerName: 'ALICE' })
  assert.equal(seen.body.submittedBy, null)
  // نيابةً: البطاقة لصاحب الطلب، و«قدّمه نيابةً» باسم حساب المنشئ — لصاحب الطلب وللمنشئ نفسه
  const filed = await request(hrAgent, 'POST', '/requests', { typeCode: 'LIVE_NOTE', submit: true, onBehalfEmployeeId: bob.employeeId, payload: { reason: 'نيابة لبطاقة الموظف' } })
  assert.equal(filed.status, 201, JSON.stringify(filed.body))
  for (const viewer of [hrAgent, bob]) {
    const detail = await request(viewer, 'GET', `/requests/${filed.body.id}`)
    assert.equal(detail.status, 200, JSON.stringify(detail.body))
    assert.equal(detail.body.requester.fullName, 'BOB')
    assert.deepEqual(detail.body.submittedBy, { displayName: 'HR Agent' })
  }
  // السرّي لغير أطرافه (requests.view_all وحدها): لا هوية ولا منشئ
  const secret = await request(hrAgent, 'POST', '/requests', { typeCode: 'LEAVE_UNPAID', submit: true, onBehalfEmployeeId: bob.employeeId,
    payload: { fromDate: '2027-02-15', toDate: '2027-02-16', days: 2, unpaidReason: 'نيابة على نوع سرّي للبطاقة' } })
  assert.equal(secret.status, 201, JSON.stringify(secret.body))
  const masked = await request(hr, 'GET', `/requests/${secret.body.id}`)
  assert.equal(masked.status, 200, JSON.stringify(masked.body))
  assert.deepEqual([masked.body.confidentialMasked, masked.body.requester, masked.body.submittedBy, masked.body.requesterId, masked.body.payload], [true, null, null, null, null])
  // وأطرافه يرونها: المنشئ وصاحب الطلب
  assert.equal((await request(hrAgent, 'GET', `/requests/${secret.body.id}`)).body.requester.fullName, 'BOB')
  assert.equal((await request(bob, 'GET', `/requests/${secret.body.id}`)).body.submittedBy.displayName, 'HR Agent')
  // مراجعة Codex الجولة 4: bob اتنقل للفرع (ب) — حساب الفرع (أ) لسه بيشوف طلبه القديم في فرعه، بس من غير تنظيمه الجديد
  await repos.Employee.update(bob.employeeId, { branchId: otherBranch.id })
  try {
    const moved = await request(hr, 'GET', `/requests/${live.body.id}`)
    assert.equal(moved.status, 200, JSON.stringify(moved.body))
    assert.deepEqual(moved.body.requester, { employeeId: bob.employeeId, fullName: 'BOB', employeeCode: 'BOB', jobTitle: null, departmentName: null,
      branchName: null, teamName: null, directManagerName: null, orgHidden: true })
    // وصندوق الموافقات بتاع المعتمد في الفرع (أ) (alice): الاسم والكود من غير المسمى الحالي (مراجعة Codex الجولة 5)
    const inbox = await request(alice, 'GET', '/requests/inbox')
    assert.equal(inbox.status, 200, JSON.stringify(inbox.body))
    const row = inbox.body.find(item => item.id === live.body.id)
    assert.ok(row, 'الطلب القديم لسه في صندوق معتمده')
    assert.deepEqual([row.requesterName, row.requesterCode, row.requesterJobTitle], ['BOB', 'BOB', undefined])
    // وملفه نفسه مرفوض على نفس الحساب — البطاقة ماكانتش لازم تكشف أكتر منه
    assert.notEqual((await request(hr, 'GET', `/employees/${bob.employeeId}`)).status, 200)
    // صاحب الطلب نفسه ومدير النظام: البطاقة كاملة بالفرع الجديد
    assert.equal((await request(bob, 'GET', `/requests/${live.body.id}`)).body.requester.branchName, 'Leave B')
    const full = (await request(admin, 'GET', `/requests/${live.body.id}`)).body.requester
    assert.deepEqual([full.branchName, full.jobTitle, full.orgHidden], ['Leave B', 'محاسب', undefined])
  } finally {
    await repos.Employee.update(bob.employeeId, { branchId: branch.id })
  }
})

test('«طلباتي» shows the rows filed on behalf to their creator, and a confidential type stays with its parties', async () => {
  const secret = await request(hrAgent, 'POST', '/requests', { typeCode: 'LEAVE_UNPAID', submit: true, onBehalfEmployeeId: bob.employeeId,
    payload: { fromDate: '2026-12-21', toDate: '2026-12-22', days: 2, unpaidReason: 'نيابة على نوع سرّي' } })
  assert.equal(secret.status, 201, JSON.stringify(secret.body))
  const creator = (await request(hrAgent, 'GET', '/requests/mine?includeOnBehalf=1')).body.find(row => row.id === secret.body.id)
  assert.ok(creator && creator.payload, 'منشئ الطلب طرف فيه فيرى حمولته')
  assert.equal(creator.submittedOnBehalf, true)
  assert.ok(!(await request(alice, 'GET', '/requests/mine?includeOnBehalf=1')).body.some(row => row.id === secret.body.id),
    'ومن ليس طرفاً لا يراه في «طلباتي» أصلاً')
  assert.equal((await request(hr, 'GET', '/requests/all')).body.find(row => row.id === secret.body.id).confidentialMasked, true,
    'وصاحب requests.view_all وليس طرفاً يراه محجوباً')
})

test('C3 a permission type with a monthly limit rejects the request that exceeds it, and the next month starts over', async () => {
  const send = (date) => request(alice, 'POST', '/requests', { typeCode: 'PERMISSION', submit: true,
    payload: { date, from: '09:00', to: '10:00', permissionTypeId: permissionType.id } })
  assert.equal((await send('2026-12-01')).status, 201)
  assert.equal((await send('2026-12-02')).status, 201)
  const third = await send('2026-12-03')
  assert.equal(third.status, 400, JSON.stringify(third.body))
  assert.match(third.body.message, /مرة في الشهر/)
  assert.equal((await send('2027-01-05')).status, 201, 'الشهر التالي يبدأ من جديد')
  // 0 = بلا حدّ على العدد: معناه في محرك الحضور «بلا مرات مجانية» فلا يُرفض تقديمه
  const free = (date) => request(alice, 'POST', '/requests', { typeCode: 'PERMISSION', submit: true,
    payload: { date, from: '11:00', to: '12:00', permissionTypeId: permissionTypeZero.id } })
  for (const day of ['2027-03-01', '2027-03-02', '2027-03-03']) {
    assert.equal((await free(day)).status, 201, `النوع بلا حدّ عدد يقبل ${day}`)
  }
})

test('B4 the audience of a request type is enforced at submission even for a catalog manager', async () => {
  const blocked = await request(hrAgent, 'POST', '/requests', { typeCode: 'LEAVE_CASUAL', submit: true,
    payload: { fromDate: '2026-12-07', toDate: '2026-12-08', days: 2, casualReason: 'خارج جمهور النوع' } })
  assert.equal(blocked.status, 403, JSON.stringify(blocked.body))
  const catalog = await request(hrAgent, 'GET', '/requests/types')
  const group = catalog.body.find(type => type.code === 'LEAVE')
  assert.ok(group.leaveProfiles.some(p => p.definitionCode === 'LEAVE_CASUAL'), 'يبقى ظاهراً في بانِي الطلبات')
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
