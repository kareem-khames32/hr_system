// R1 — انحدارات الخطوة 7 التي توقف الشغل اليومي (SQL Server حقيقي + HTTP).
// Run: node --test --test-concurrency=1 api/test/r1-daily-regressions.integration.cjs
// ينشئ قاعدة مؤقتة عشوائية ويحذفها؛ لا يلمس القاعدة المضبوطة في .env.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_r1_regressions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-r1-regressions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let master, app, ds, base, created = false, sequence = 0
let branch, otherBranch, admin, hr, otherHr
const RECORD_ONLY_CODES = ['ACCESS_REQUEST', 'APPRAISAL_OBJECTION', 'CERT_REIMBURSEMENT', 'CONFERENCE', 'DEPENDENTS_UPDATE', 'DOCUMENT_RENEWAL',
  'EDUCATION_ASSISTANCE', 'FACILITY_CARD', 'GRIEVANCE', 'HR_MEETING', 'IT_EQUIPMENT', 'PENALTY_OBJECTION', 'SECONDMENT', 'SUGGESTION',
  'TRAINING_REQUEST', 'WHISTLEBLOWING']

const entity = (file, name) => { assert.equal(ds.options.database, database); return ds.getRepository(require(`../src/${file}`)[name]) }
const repos = {
  User: () => entity('auth/user.entity', 'User'), Branch: () => entity('org/entities/branch.entity', 'Branch'),
  Employee: () => entity('employees/employee.entity', 'Employee'), Request: () => entity('requests/entities/request.entity', 'Request'),
  RequestType: () => entity('requests/entities/request-type.entity', 'RequestType'), ApprovalChain: () => entity('requests/entities/approval-chain.entity', 'ApprovalChain'),
  ApprovalStep: () => entity('requests/entities/approval-step.entity', 'ApprovalStep'), RequestApproval: () => entity('requests/entities/request-approval.entity', 'RequestApproval'),
  LeaveType: () => entity('requests/entities/leave.entities', 'LeaveType'), LeaveBalance: () => entity('requests/entities/leave.entities', 'LeaveBalance'),
  Transfer: () => entity('requests/entities/employment.entities', 'Transfer'), Custody: () => entity('requests/entities/custody.entities', 'CustodyAssignment'),
  Department: () => entity('org/entities/department.entity', 'Department'), Team: () => entity('org/entities/team.entity', 'Team'),
  Config: () => entity('requests/entities/requests-config.entity', 'RequestsConfig'), Grade: () => entity('assets/assets.entities', 'Grade'),
  OffboardingCase: () => entity('offboarding/offboarding.entities', 'OffboardingCase'), SettlementLine: () => entity('offboarding/offboarding.entities', 'SettlementLine'),
  RuleVersion: () => entity('attendance/attendance-rule.entities', 'AttendanceRuleVersion'),
}
function token(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.body)); return r.body }
async function person(extra = {}, branchId = branch.id) {
  sequence++
  const employee = await repos.Employee().save({ employeeCode: `R1E${sequence}`, fullName: `موظف اختبار ${sequence}`, branchId,
    joinDate: '2020-01-01', basicSalary: 6000, status: 'active', jobTitle: 'محاسب', ...extra })
  const user = await repos.User().save({ email: `r1-employee-${sequence}@test.invalid`, role: 'employee', branchId, employeeId: employee.id,
    displayName: employee.fullName, passwordHash: 'unused', permissions: '[]' })
  return { employee, user }
}
// نوع طلب بسلسلة خطوة واحدة HR (أو اعتماد آلي) — نفس شكل البذر الحقيقي
async function requestType(code, destinationHandler, extra = {}, autoApprove = false) {
  const existing = await repos.RequestType().findOneBy({ code })
  if (existing) return existing
  const chain = await repos.ApprovalChain().save({ code: `CH_${code}`, nameAr: `سلسلة ${code}`, isActive: true, autoApprove })
  if (!autoApprove) await repos.ApprovalStep().save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  return repos.RequestType().save({ code, nameAr: `نوع ${code}`, category: 'employment_status', destinationHandler, approvalChainId: chain.id,
    isActive: true, requiredFields: '[]', ...extra })
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql'); assert.match(database, /^hr_r1_regressions_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME || 'sa',
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', JWT_SECRET: secret, NODE_ENV: 'test', UPLOADS_ROOT: uploads })
  const { NestFactory } = require('../node_modules/@nestjs/core'), { ValidationPipe } = require('../node_modules/@nestjs/common')
  app = await NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  // لا مهام خلفية تتسابق مع الاختبارات (النقل المجدول يُشغَّل يدويًا هنا)
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => {}
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => {}
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  ds = app.get(require('../node_modules/typeorm').DataSource); assert.equal(ds.options.database, database)
  branch = await repos.Branch().save({ name: 'فرع R1', code: 'R1_A', weekendDays: 'FRI,SAT' })
  otherBranch = await repos.Branch().save({ name: 'فرع R1 آخر', code: 'R1_B', weekendDays: 'FRI,SAT' })
  const staff = (email, role, branchId, permissions) => repos.User().save({ email, role, branchId, displayName: email, passwordHash: 'unused',
    permissions: JSON.stringify(permissions) })
  admin = await staff('r1-admin@test.invalid', 'super_admin', null, ['*'])
  const hrPerms = ['approve.hr', 'employees.view', 'employees.edit', 'transfers.view', 'requests.view_all', 'offboarding.manage', 'settlement.edit', 'settlement.approve']
  hr = await staff('r1-hr@test.invalid', 'hr', branch.id, hrPerms)
  otherHr = await staff('r1-hr-other@test.invalid', 'hr', otherBranch.id, hrPerms)
}, { timeout: 90000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (e) { errors.push(e) }
  try {
    if (created && master) {
      assert.match(database, /^hr_r1_regressions_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      t.diagnostic(`Cleanup verified: ${database} removed.`)
    }
  } catch (e) { errors.push(e) }
  try { if (master) await master.close() } catch (e) { errors.push(e) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-r1-regressions-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (e) { errors.push(e) }
  if (errors.length) throw new AggregateError(errors, 'R1 fixture cleanup failed')
})

// ===== S7-leave-cross-year =====
test('S7 leave crossing the year: approval deducts {2026: 3, 2027: 2} using the same date as the approval gate', async () => {
  await repos.LeaveType().save({ code: 'ANNUAL', nameAr: 'سنوية', balanceType: 'annual', isPaid: true })
  await requestType('LEAVE_ANNUAL', 'leave_calendar_balance', { category: 'leaves', affectsBalance: true, requiredFields: '["fromDate","toDate"]' })
  const { employee, user } = await person()
  const balances = app.get(require('../src/requests/leave-balances.service').LeaveBalancesService)
  // آلية الانحدار: نصيب السنة الجاية على 01-01 = متراكم صفر في الاستحقاق الشهري، وعلى تاريخ البوابة كافٍ
  await assert.rejects(ds.transaction(em => balances.deduct(em, employee.id, 'annual', 2, '2027-01-01')), /الرصيد غير كافٍ عند التنفيذ/)
  assert.equal(balances.balanceGateDate('2027', '2026-12-29'), '2027-12-31')
  assert.equal(balances.balanceGateDate('2026', '2026-12-29'), '2026-12-29')
  assert.equal(balances.leaveYearStart('2027', '2026-12-29'), '2027-01-01')

  const made = expectStatus(await request(user, 'POST', '/requests', { typeCode: 'LEAVE', definitionCode: 'LEAVE_ANNUAL', submit: true,
    payload: { leaveTypeCode: 'ANNUAL', fromDate: '2026-12-29', toDate: '2027-01-04' } }), 201)
  assert.equal(made.status, 'UNDER_REVIEW')
  const payload = JSON.parse(made.payload)
  assert.equal(payload.days, 5)
  assert.deepEqual(payload.daysByYear, { 2026: 3, 2027: 2 })
  const approved = expectStatus(await request(hr, 'POST', `/requests/${made.id}/act`, { action: 'APPROVE', comment: 'اعتماد إجازة رأس السنة' }), 201)
  assert.equal(approved.status, 'COMPLETED', JSON.stringify(approved))
  const rows = await repos.LeaveBalance().find({ where: { employeeId: employee.id, balanceType: 'annual' }, order: { period: 'ASC' } })
  assert.deepEqual(Object.fromEntries(rows.map(r => [r.period, Number(r.taken)])), { 2026: 3, 2027: 2 })
})

// ===== S7-transfers-dup =====
async function makeTeam(name, branchId = branch.id) {
  const department = await repos.Department().save({ name: `${name} قسم`, branchId })
  const team = await repos.Team().save({ name, departmentId: department.id })
  return { team, department }
}
test('S7 duplicate scheduled transfers: only the first executes, the duplicate is cancelled with a visible reason sent to HR', async () => {
  await requestType('TEAM_TRANSFER', 'transfers_effective_date', {}, true)
  const { employee, user } = await person()
  const { team } = await makeTeam('فريق النقل الأول')
  const first = expectStatus(await request(admin, 'POST', '/requests', { typeCode: 'TEAM_TRANSFER', submit: true,
    payload: { employeeId: employee.id, toTeamId: team.id, effectiveDate: '2099-12-01' } }), 201)
  assert.equal(first.status, 'IN_EXECUTION')
  // تكرار قديم (مثل #4 و#5 في hr_system): طلب ثانٍ معتمد بنفس البيانات ونقل مجدول ثانٍ
  const duplicateRequest = await repos.Request().save({ typeCode: 'TEAM_TRANSFER', requesterId: employee.id, createdByUserId: admin.id,
    branchId: branch.id, status: 'IN_EXECUTION', payload: first.payload, submittedAt: new Date() })
  await repos.RequestApproval().save({ requestId: duplicateRequest.id, step: 1, approverId: admin.id, action: 'APPROVED', comment: 'S11' })
  const firstTransfer = await repos.Transfer().findOneByOrFail({ requestId: first.id })
  const duplicate = await repos.Transfer().save({ requestId: duplicateRequest.id, employeeId: employee.id, fromTeam: null, toTeam: team.id,
    effectiveDate: '2099-12-01', status: 'SCHEDULED' })
  await repos.Transfer().update({ id: In([firstTransfer.id, duplicate.id]) }, { effectiveDate: '2026-09-01' })

  const service = app.get(require('../src/requests/requests.service').RequestsService)
  const run = await service.runScheduledTransfers()
  assert.equal(run.executed, 1); assert.equal(run.cancelled, 1)
  assert.equal((await repos.Transfer().findOneByOrFail({ id: firstTransfer.id })).status, 'EXECUTED')
  assert.equal((await repos.Request().findOneByOrFail({ id: first.id })).status, 'COMPLETED')
  assert.equal((await repos.Employee().findOneByOrFail({ id: employee.id })).teamId, team.id)
  assert.equal((await repos.Transfer().findOneByOrFail({ id: duplicate.id })).status, 'CANCELLED')
  const cancelledRequest = await repos.Request().findOneByOrFail({ id: duplicateRequest.id })
  assert.equal(cancelledRequest.status, 'CANCELLED'); assert.ok(cancelledRequest.completedAt)
  const audit = await repos.RequestApproval().find({ where: { requestId: duplicateRequest.id, approverId: 0 } })
  assert.equal(audit.length, 1); assert.equal(audit[0].action, 'CANCELLED')
  assert.match(audit[0].comment, new RegExp(`نقل مجدول مكرر.*#${firstTransfer.id}.*الطلب #${first.id}`))

  const again = await service.runScheduledTransfers()
  assert.equal(again.executed, 0); assert.equal(again.cancelled, 0)
  assert.equal(await repos.RequestApproval().countBy({ requestId: duplicateRequest.id, approverId: 0 }), 1)

  const log = expectStatus(await request(hr, 'GET', '/transfers'), 200)
  assert.match(log.find(t => t.id === duplicate.id).statusReason, /مكرر/)
  assert.equal(log.find(t => t.id === firstTransfer.id).statusReason, null)
  const hrAlerts = expectStatus(await request(hr, 'GET', '/notifications'), 200)
  assert.ok(hrAlerts.some(n => n.title === 'ألغى النظام نقلًا مجدولًا مكررًا' && n.body.includes(`#${duplicateRequest.id}`)), JSON.stringify(hrAlerts))
  assert.equal(expectStatus(await request(otherHr, 'GET', '/notifications'), 200).some(n => n.id.startsWith('scheduled-execution-')), false)
  const mine = expectStatus(await request(user, 'GET', '/notifications'), 200)
  assert.ok(mine.some(n => n.title === 'ألغى النظام طلبك' && /مكرر/.test(n.body)), JSON.stringify(mine))
  const detail = expectStatus(await request(admin, 'GET', `/requests/${duplicateRequest.id}`), 200)
  assert.ok(detail.approvals.some(a => a.action === 'CANCELLED' && /مكرر/.test(a.comment)))
})

test('S7 a scheduled transfer that cannot execute records the failure once on the request, alerts HR, then executes when fixed', async () => {
  const { employee } = await person()
  const { team } = await makeTeam('فريق نقل معلق')
  const made = expectStatus(await request(admin, 'POST', '/requests', { typeCode: 'TEAM_TRANSFER', submit: true,
    payload: { employeeId: employee.id, toTeamId: team.id, effectiveDate: '2099-12-01' } }), 201)
  const transfer = await repos.Transfer().findOneByOrFail({ requestId: made.id })
  await repos.Transfer().update({ id: transfer.id }, { effectiveDate: '2026-09-01' })
  const custody = await repos.Custody().save({ employeeId: employee.id, assetId: 99999, status: 'ACTIVE' })
  const service = app.get(require('../src/requests/requests.service').RequestsService)
  assert.equal((await service.runScheduledTransfers()).executed, 0)
  assert.equal((await service.runScheduledTransfers()).executed, 0)
  const failures = await repos.RequestApproval().find({ where: { requestId: made.id, approverId: 0, action: 'EXECUTION_FAILED' } })
  assert.equal(failures.length, 1, 'the same failure reason is recorded only once')
  assert.match(failures[0].comment, /عهدة/); assert.match(failures[0].comment, new RegExp(`#${transfer.id}`))
  assert.equal((await repos.Request().findOneByOrFail({ id: made.id })).status, 'IN_EXECUTION')
  assert.match(expectStatus(await request(hr, 'GET', '/transfers'), 200).find(t => t.id === transfer.id).statusReason, /عهدة/)
  assert.ok(expectStatus(await request(hr, 'GET', '/notifications'), 200).some(n => n.title === 'تعذّر تنفيذ طلب مجدول' && n.body.includes(`#${made.id}`)))
  const detail = expectStatus(await request(admin, 'GET', `/requests/${made.id}`), 200)
  assert.ok(detail.approvals.some(a => a.action === 'EXECUTION_FAILED'))

  await repos.Custody().delete({ id: custody.id })
  assert.equal((await service.runScheduledTransfers()).executed, 1)
  assert.equal((await repos.Request().findOneByOrFail({ id: made.id })).status, 'COMPLETED')
  assert.equal(expectStatus(await request(hr, 'GET', '/notifications'), 200).some(n => n.title === 'تعذّر تنفيذ طلب مجدول' && n.body.includes(`#${made.id}`)), false)
})

// ===== S7-request-types (D12) =====
test('S7 D12 the 16 handler-less request types are decided record-only in code, seed and migration', () => {
  const { RECORD_ONLY_REQUEST_TYPES } = require('../src/requests/destinations.service')
  assert.deepEqual(Object.keys(RECORD_ONLY_REQUEST_TYPES).sort(), [...RECORD_ONLY_CODES].sort())
  for (const [code, decision] of Object.entries(RECORD_ONLY_REQUEST_TYPES)) assert.equal(decision.decision, 'RECORD_ONLY', code)
  for (const code of ['GRIEVANCE', 'WHISTLEBLOWING', 'PENALTY_OBJECTION']) assert.equal(RECORD_ONLY_REQUEST_TYPES[code].confidential, true, code)
  const { typesSeed } = require('../src/seed/requests-seed.data')
  for (const code of RECORD_ONLY_CODES) {
    const seed = typesSeed.find(t => t.code === code)
    assert.equal(seed.handler, 'none', code)
    assert.equal(!!seed.confidential, RECORD_ONLY_REQUEST_TYPES[code].confidential, code)
  }
  const migration = fs.readFileSync(path.join(apiRoot, '../docs/migrations/payroll/20260914_016_r1_record_only_request_types.sql'), 'utf8')
  const pairs = [...migration.matchAll(/\(N'([A-Z_]+)', N'([a-z_]+)'\)/g)].map(m => [m[1], m[2]])
  assert.deepEqual(Object.fromEntries(pairs), Object.fromEntries(Object.entries(RECORD_ONLY_REQUEST_TYPES).map(([c, d]) => [c, d.legacyHandler])))
})

test('S7 D12 legacy handlers show as «تسجيل فقط», the migration normalizes them idempotently, and grievances stay confidential', async () => {
  const grievance = await requestType('GRIEVANCE', 'er_case', { category: 'employee_relations', isConfidential: true, requiredFields: '["description"]' })
  await requestType('CERT_REIMBURSEMENT', 'training_expense', { category: 'training', requiredFields: '["amount"]' })
  const chosen = await requestType('SUGGESTION', 'payroll_bonus', { category: 'employee_relations' })
  const { user, employee } = await person()
  const before = expectStatus(await request(user, 'GET', '/requests/types'), 200)
  for (const code of ['GRIEVANCE', 'CERT_REIMBURSEMENT']) {
    const type = before.find(t => t.code === code)
    assert.ok(type, `${code} must stay visible`); assert.equal(type.destinationSupported, true)
    assert.equal(type.executionMode, 'RECORD_ONLY'); assert.equal(type.executionLabel, 'تسجيل فقط')
  }
  assert.equal(before.find(t => t.code === 'SUGGESTION').executionMode, 'EXECUTES')

  const migration = fs.readFileSync(path.join(apiRoot, '../docs/migrations/payroll/20260914_016_r1_record_only_request_types.sql'), 'utf8')
  const runMigration = async () => { for (const batch of migration.split(/^\s*GO\s*$/m).filter(b => b.trim())) await ds.query(batch) }
  await runMigration()
  const afterFirst = await ds.query('SELECT code, destinationHandler, isConfidential, isActive FROM request_types ORDER BY code')
  await runMigration()
  assert.deepEqual(await ds.query('SELECT code, destinationHandler, isConfidential, isActive FROM request_types ORDER BY code'), afterFirst)
  const byCode = Object.fromEntries(afterFirst.map(r => [r.code, r]))
  assert.equal(byCode.GRIEVANCE.destinationHandler, 'none'); assert.equal(byCode.GRIEVANCE.isConfidential, true); assert.equal(byCode.GRIEVANCE.isActive, true)
  assert.equal(byCode.CERT_REIMBURSEMENT.destinationHandler, 'none')
  assert.equal(byCode.SUGGESTION.destinationHandler, 'payroll_bonus', 'an owner-chosen handler is never overwritten')
  assert.equal(byCode.TEAM_TRANSFER.destinationHandler, 'transfers_effective_date')
  assert.equal((await repos.RequestType().findOneByOrFail({ id: chosen.id })).destinationHandler, 'payroll_bonus')

  const builder = expectStatus(await request(admin, 'GET', '/settings/request-types'), 200)
  assert.equal(builder.find(t => t.code === 'GRIEVANCE').executionLabel, 'تسجيل فقط')

  const made = expectStatus(await request(user, 'POST', '/requests', { typeCode: 'GRIEVANCE', submit: true, payload: { description: 'تظلم سري للاختبار' } }), 201)
  assert.equal(made.status, 'UNDER_REVIEW')
  const done = expectStatus(await request(hr, 'POST', `/requests/${made.id}/act`, { action: 'APPROVE' }), 201)
  assert.equal(done.status, 'COMPLETED'); assert.match(done.destinationRef, /^REQ-\d{4}-0*\d+$/)
  const outsider = await person()
  assert.notEqual((await request(outsider.user, 'GET', `/requests/${made.id}`)).status, 200)
  assert.equal(grievance.isConfidential, true); assert.ok(employee.id)
})

// ===== S7-letter-validation =====
test('S7 letter data is validated at submission (create+submit and draft submit), not at the last approval', async () => {
  await requestType('LETTER_SALARY', 'letter_pdf_generator', { category: 'letters', autoGeneratesPdf: true })
  const { employee, user } = await person({ jobTitle: null })
  const direct = expectStatus(await request(user, 'POST', '/requests', { typeCode: 'LETTER_SALARY', submit: true, payload: { purpose: 'بنك' } }), 400)
  assert.match(direct.message, /اسم الشركة/); assert.match(direct.message, /المسمى الوظيفي/)
  assert.equal(await repos.Request().countBy({ requesterId: employee.id, typeCode: 'LETTER_SALARY' }), 0, 'a rejected direct submission leaves no draft')

  await repos.Config().save({ key: 'company.name', value: 'شركة الاختبار' })
  const draft = expectStatus(await request(user, 'POST', '/requests', { typeCode: 'LETTER_SALARY', submit: false, payload: { purpose: 'بنك' } }), 201)
  const blocked = expectStatus(await request(user, 'POST', `/requests/${draft.id}/submit`), 400)
  assert.match(blocked.message, /المسمى الوظيفي/); assert.doesNotMatch(blocked.message, /اسم الشركة/)
  assert.equal((await repos.Request().findOneByOrFail({ id: draft.id })).status, 'DRAFT')

  await repos.Employee().update({ id: employee.id }, { jobTitle: 'محاسب أول' })
  const submitted = expectStatus(await request(user, 'POST', `/requests/${draft.id}/submit`), 201)
  assert.equal(submitted.status, 'UNDER_REVIEW')
})

// ===== S7-settlement-eos (HRC-07) =====
test('S7 HRC-07 settlement approval rejects an automatic EOS line that differs from computeEos, and passes after regeneration', async () => {
  const { employee } = await person({ joinDate: '2023-01-01', basicSalary: 9000 })
  const kase = await repos.OffboardingCase().save({ employeeId: employee.id, lastWorkingDay: '2035-01-31', status: 'IN_SETTLEMENT', terminationReason: 'termination' })
  const legacy = await repos.SettlementLine().save({ caseId: kase.id, label: 'مكافأة نهاية الخدمة (4.1 سنة × 0.5 شهر)', type: 'CREDIT', amount: 18369.61, isAuto: true })
  const service = app.get(require('../src/offboarding/offboarding.service').OffboardingService)
  const eos = require('../src/offboarding/eos')
  const expected = eos.computeEos(9000, eos.serviceYears('2023-01-01', '2035-01-31'), 'termination', await service.eosPolicy()).amount
  assert.notEqual(expected, 18369.61)

  const denied = expectStatus(await request(hr, 'POST', `/offboarding/${kase.id}/approve-settlement`, {}), 409)
  assert.match(denied.message, /مكافأة نهاية الخدمة/); assert.match(denied.message, /18,369\.61/)
  assert.match(denied.message, new RegExp(expected.toLocaleString('en-US', { minimumFractionDigits: 2 }).replace(/[.,]/g, m => `\\${m}`)))
  const unchanged = await repos.OffboardingCase().findOneByOrFail({ id: kase.id })
  assert.equal(unchanged.status, 'IN_SETTLEMENT'); assert.equal(unchanged.settlementApprovedAt, null)

  expectStatus(await request(hr, 'POST', `/offboarding/${kase.id}/recalc-lines`), 201)
  const auto = (await repos.SettlementLine().findBy({ caseId: kase.id })).filter(l => l.isAuto && l.label.startsWith('مكافأة نهاية الخدمة'))
  assert.equal(auto.length, 1); assert.equal(Number(auto[0].amount), expected); assert.equal(await repos.SettlementLine().countBy({ id: legacy.id }), 0)
  // تعديل يدوي لمبلغ البند الآلي يُرفض أيضًا؛ الفرق المتفق عليه بند تسوية يدوي
  expectStatus(await request(hr, 'PATCH', `/offboarding/lines/${auto[0].id}`, { amount: expected + 100 }), 200)
  assert.equal((await request(hr, 'POST', `/offboarding/${kase.id}/approve-settlement`, {})).status, 409)
  expectStatus(await request(hr, 'PATCH', `/offboarding/lines/${auto[0].id}`, { amount: expected }), 200)
  expectStatus(await request(hr, 'POST', `/offboarding/${kase.id}/lines`, { label: 'تسوية متفق عليها', type: 'CREDIT', amount: 100 }), 201)
  const approved = await request(hr, 'POST', `/offboarding/${kase.id}/approve-settlement`, {})
  assert.ok([200, 201].includes(approved.status), JSON.stringify(approved.body))
  const settled = await repos.OffboardingCase().findOneByOrFail({ id: kase.id })
  assert.equal(settled.status, 'SETTLED'); assert.equal(Number(settled.settlementNet), Math.round((expected + 100) * 100) / 100)
})

test('S7 HRC-07 the EOS comparison helper covers missing, duplicated, renamed and zero-entitlement lines', () => {
  const { assertEosLineMatchesPolicy } = require('../src/offboarding/offboarding.service')
  const line = (amount, extra = {}) => ({ isAuto: true, type: 'CREDIT', label: 'مكافأة نهاية الخدمة — إنهاء من الشركة', amount, ...extra })
  assert.doesNotThrow(() => assertEosLineMatchesPolicy([line(6123.2)], [line(6123.2)]))
  assert.doesNotThrow(() => assertEosLineMatchesPolicy([line(5, { isAuto: false, label: 'تسوية' })], []))
  assert.throws(() => assertEosLineMatchesPolicy([], [line(6123.2)]), /غير موجودة/)
  assert.throws(() => assertEosLineMatchesPolicy([line(3000), line(3123.2)], [line(6123.2)]), /لا تطابق/)
  assert.throws(() => assertEosLineMatchesPolicy([line(6123.2, { label: 'مكافأة مُعدلة الاسم' })], [line(6123.2)]), /غير موجودة/)
  assert.throws(() => assertEosLineMatchesPolicy([line(100)], []), /لا تطابق/)
})

// ===== S7-grade (HRC-08) =====
test('S7 HRC-08 an unknown gradeId is rejected with 400 on create and update; an unchanged inactive grade does not block edits', async () => {
  const grade = await repos.Grade().save({ name: `درجة R1 ${crypto.randomBytes(3).toString('hex')}`, isActive: true })
  const inactive = await repos.Grade().save({ name: `درجة معطلة R1 ${crypto.randomBytes(3).toString('hex')}`, isActive: false })
  const input = code => ({ employeeCode: code, fullName: 'موظف درجة', branchId: branch.id, basicSalary: 6000, currency: 'SAR', joinDate: '2024-01-01' })
  const unknown = expectStatus(await request(admin, 'POST', '/employees', { ...input('R1GRADE0'), gradeId: 999999 }), 400)
  assert.match(unknown.message, /الدرجة الوظيفية غير موجودة/)
  assert.equal(await repos.Employee().countBy({ employeeCode: 'R1GRADE0' }), 0)
  assert.equal((await request(admin, 'POST', '/employees', { ...input('R1GRADE1'), gradeId: inactive.id })).status, 400)
  const createdEmployee = expectStatus(await request(admin, 'POST', '/employees', { ...input('R1GRADE2'), gradeId: grade.id }), 201)
  assert.equal(createdEmployee.gradeId, grade.id)
  const patched = expectStatus(await request(admin, 'PATCH', `/employees/${createdEmployee.id}`, { gradeId: 999999 }), 400)
  assert.match(patched.message, /الدرجة الوظيفية غير موجودة/)
  assert.equal((await repos.Employee().findOneByOrFail({ id: createdEmployee.id })).gradeId, grade.id)
  await repos.Grade().update({ id: grade.id }, { isActive: false })
  expectStatus(await request(admin, 'PATCH', `/employees/${createdEmployee.id}`, { gradeId: grade.id, fullName: 'موظف درجة معدل' }), 200)
  expectStatus(await request(admin, 'PATCH', `/employees/${createdEmployee.id}`, { gradeId: null }), 200)
})

// ===== S7-employees-n1 (HRC-09) =====
test('S7 HRC-09 GET /employees runs a constant number of queries and returns the same attendance rule as the detail endpoint', async t => {
  const { SqlServerQueryRunner } = require('../node_modules/typeorm/driver/sqlserver/SqlServerQueryRunner')
  const original = SqlServerQueryRunner.prototype.query
  let counting = false, queries = 0
  SqlServerQueryRunner.prototype.query = function (...args) { if (counting) queries++; return original.apply(this, args) }
  const measure = async user => {
    queries = 0; counting = true
    try { return { body: expectStatus(await request(user, 'GET', '/employees'), 200), queries } } finally { counting = false }
  }
  try {
    const addEmployees = async count => {
      for (let i = 0; i < count; i++) {
        const { employee } = await person()
        await repos.RuleVersion().save([
          { sourceType: 'EMPLOYEE', sourceId: employee.id, effectiveFrom: '2026-01-01', version: 1, snapshot: { workScheduleId: null, flexOverrideMode: 'INHERIT' }, reason: 'اختبار', legacyBaseline: false },
          { sourceType: 'EMPLOYEE', sourceId: employee.id, effectiveFrom: '2099-01-01', version: 2, snapshot: { workScheduleId: null, flexOverrideMode: 'DISABLED' }, reason: 'مستقبلي', legacyBaseline: false },
        ])
      }
    }
    await addEmployees(3)
    const small = await measure(admin), smallScoped = await measure(hr)
    await addEmployees(25)
    const large = await measure(admin), largeScoped = await measure(hr)
    assert.equal(large.body.length, small.body.length + 25)
    assert.equal(large.queries, small.queries, `queries grew from ${small.queries} to ${large.queries}`)
    assert.equal(largeScoped.queries, smallScoped.queries, `scoped queries grew from ${smallScoped.queries} to ${largeScoped.queries}`)
    t.diagnostic(`GET /employees queries: admin ${small.body.length} employees=${small.queries}, ${large.body.length} employees=${large.queries}; scoped ${smallScoped.body.length}=${smallScoped.queries}, ${largeScoped.body.length}=${largeScoped.queries}`)
    assert.ok(large.queries <= 10, `unexpected query count ${large.queries}`)
    for (const row of large.body.slice(-3)) {
      const detail = expectStatus(await request(admin, 'GET', `/employees/${row.id}`), 200)
      for (const key of ['workScheduleId', 'flexOverrideMode', 'attendanceRuleVersion', 'attendanceRuleEffectiveFrom', 'attendanceRuleLegacy']) {
        assert.deepEqual(row[key], detail[key], `${key} for employee ${row.id}`)
      }
      assert.equal(row.attendanceRuleVersion, 1); assert.equal(row.flexOverrideMode, 'INHERIT')
    }
    assert.ok(largeScoped.body.every(row => row.branchId === branch.id))
  } finally {
    SqlServerQueryRunner.prototype.query = original
  }
})

const { In } = require('../node_modules/typeorm')
