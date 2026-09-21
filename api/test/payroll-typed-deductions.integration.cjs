// C2 / الخطوة 25: الخصومات المصنفة من الأول للآخر على قاعدة SQL مؤقتة (hr_payroll_typed_deductions_test_<hex>):
// الكتالوج، نطاق المُنشئ، الاعتماد والتصعيد، الفترة المستهدفة في مسير حقيقي، الحجز عند اعتماد المسير، الاستهلاك والترحيل
// بعد حماية الصافي، الإنشاء الجماعي بمعاينة واستبعاد، وقفل الخصم المباشر.
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
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_typed_deductions_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-typed-deductions-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false, sequence = 0
const org = {}, people = {}, users = {}, types = {}

const REASON = 'تأخر متكرر عن اجتماع التسليم الصباحي للفريق'
const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
function assertDisposable() {
  assert.match(database, /^hr_payroll_typed_deductions_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
function repo(name) { assertDisposable(); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function request(user, method, route, body) {
  await writeParityReasonsBeforeApproval(request, user, method, route)
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status, code) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  if (code) assert.equal(response.body?.code, code, JSON.stringify(response.body))
  return response.body
}
const input = (overrides = {}) => ({ deductionTypeId: types.commitment.id, inputValue: '1', incidentDate, reason: REASON, ...overrides })
async function employee(code, overrides = {}) {
  return repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: org.branchA.id, departmentId: org.departmentA.id, teamId: null,
    managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...overrides })
}
async function exempt(emp) {
  // استثناء حضور معتمد يعزل الاختبار عن خصومات البصمة؛ الخصم المصنف لا يسقط به (قرار المالك)
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'استثناء حضور ثابت لعزل اختبار الخصومات المصنفة', status: 'APPROVED', createdByUserId: users.admin.id, approvedByUserId: users.admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: false, unpaidLeaveDeductibleOverride: true, requiresCheckinForPresence: false })
}
async function calc(period, emps, extra = {}) {
  return expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
    name: `مسير اختبار الخصومات ${++sequence}`, ...extra }), 201)
}
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `item for ${emp.employeeCode}`); return row }
const transition = async (run, action, body, actor = users.admin) => {
  // الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية؛ الإقرار نفسه يجب أن ينجح.
  if (action === 'approve') {
    const report = expectStatus(await request(actor, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
    expectStatus(await request(actor, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  }
  // الخطوة 22 (B5): الصرف يسجل قناته ومرجعه
  const payload = action === 'pay' && body === undefined ? { channel: 'BANK_TRANSFER', reference: `DD-TEST-${run.id}` } : body
  return request(actor, 'POST', `/payroll/runs/${run.id}/${action}`, payload)
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  await app.get(require('../src/settings/config-defaults.service').ConfigDefaultsService).onApplicationBootstrap()
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.policy.default_period_type', value: 'CALENDAR_MONTH' }, { key: 'payroll.policy.min_net_guarantee', value: 'null' },
    { key: 'payroll.policy.net_floor_pct', value: 'null' }, { key: 'payroll.policy.max_deduction_pct_of_gross', value: 'null' },
    { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' },
    // وضع انتقالي صريح للقاعدة المؤقتة: الموظف بلا سجل شهري يُحسب براتب الملف (موسوم غير موثق)
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  // الخطوة 22 (B5): المستخدم نفسه يحتسب ويعتمد في هذه المجموعة — رخصة الشركة الصغيرة الموثقة (فصل المهام مختبر في payroll-run-screen)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
  org.branchA = await repo('Branch').save({ code: 'DD_A', name: 'فرع الخصومات الأول' })
  org.branchB = await repo('Branch').save({ code: 'DD_B', name: 'فرع الخصومات الثاني' })
  org.departmentA = await repo('Department').save({ branchId: org.branchA.id, name: 'قسم العمليات', code: 'DD_DA' })
  org.departmentB = await repo('Department').save({ branchId: org.branchB.id, name: 'قسم المبيعات', code: 'DD_DB' })
  org.teamA = await repo('Team').save({ departmentId: org.departmentA.id, name: 'فريق التسليم', code: 'DD_TA' })
  const user = (label, role, branchId, employeeId, permissions = []) => repo('User').save({ email: `${label}@typed-deductions.invalid`, displayName: label,
    passwordHash: 'test-only', role, branchId, employeeId, permissions: JSON.stringify(permissions) })
  users.admin = await user('admin', 'super_admin', null, null)
  // الهيكل: مدير الفرع ← مدير القسم ← المدير المباشر ← موظفو الفريق (قائد الفريق مستقل تحت مدير القسم)
  people.branchManager = await employee('DD_BM')
  people.departmentManager = await employee('DD_DM', { managerEmployeeId: people.branchManager.id })
  people.teamLeader = await employee('DD_TL', { managerEmployeeId: people.departmentManager.id })
  people.manager = await employee('DD_MG', { managerEmployeeId: people.departmentManager.id })
  people.a1 = await employee('DD_A1', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.a2 = await employee('DD_A2', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.a3 = await employee('DD_A3', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.low = await employee('DD_LOW', { basicSalary: 1000, managerEmployeeId: people.manager.id })
  people.outsider = await employee('DD_OUT', { branchId: org.branchB.id, departmentId: org.departmentB.id })
  await repo('Department').update(org.departmentA.id, { managerEmployeeId: people.departmentManager.id })
  await repo('Department').update(org.departmentB.id, { managerEmployeeId: people.outsider.id })
  await repo('Team').update(org.teamA.id, { leaderEmployeeId: people.teamLeader.id })
  await repo('Branch').update(org.branchA.id, { managerEmployeeId: people.branchManager.id })
  for (const emp of [people.a1, people.a2, people.a3, people.low]) await exempt(emp)
  const hrPermissions = ['deductions.view', 'deductions.approve', 'deductions.manage', 'reports.view', 'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen']
  users.hr = await user('hr-a', 'hr_manager', org.branchA.id, null, hrPermissions)
  users.hrB = await user('hr-b', 'hr_manager', org.branchB.id, null, hrPermissions)
  users.viewer = await user('viewer-a', 'branch_manager', org.branchA.id, null, ['deductions.view'])
  users.manager = await user('manager', 'employee', org.branchA.id, people.manager.id)
  users.teamLeader = await user('team-leader', 'employee', org.branchA.id, people.teamLeader.id)
  users.departmentManager = await user('department-manager', 'employee', org.branchA.id, people.departmentManager.id)
  users.outsider = await user('outsider', 'employee', org.branchB.id, people.outsider.id)
  users.a1 = await user('employee-a1', 'employee', org.branchA.id, people.a1.id)
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
  await app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).catchUpIfBehind()
  // أنواع الخصومات لكل الشركة: بتتضاف وتتعدّل من حساب على مستوى الشركة، وموارد الفرع تشتغل عليها بس
  types.commitment = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'COMMITMENT', nameAr: 'خصم التزام', category: 'DISCIPLINARY',
    calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: '1', escalationStep: 'DEPARTMENT_MANAGER' }), 201)
  types.admin = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'ADMIN_FIXED', nameAr: 'خصم إداري', category: 'ADMINISTRATIVE',
    calcMethod: 'FIXED_AMOUNT', creatorScopes: ['DIRECT_MANAGER', 'HR'], escalationDays: null, installmentAllowed: true, maxInstallments: 3 }), 201)
}, { timeout: 120000 })

after(async t => {
  const errors = []
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
    assert.match(path.basename(uploads), /^hr-payroll-typed-deductions-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Typed deductions fixture cleanup failed')
})

test('DD-01: only deductions.manage writes the catalog; court orders reject exemption; a disabled type leaves existing requests untouched', async () => {
  expectStatus(await request(users.manager, 'POST', '/deductions/types', { code: 'NOPE', nameAr: 'غير مسموح', category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT' }), 403)
  // النوع لكل الشركة: موارد فرع (حتى بصلاحية deductions.manage) تشوفه بس، لا تضيف ولا تعدّل
  expectStatus(await request(users.hr, 'POST', '/deductions/types', { code: 'BRANCH_HR', nameAr: 'من حساب فرع', category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT' }), 403)
  expectStatus(await request(users.hr, 'PATCH', `/deductions/types/${types.commitment.id}`, { isActive: false }), 403)
  assert.equal((await repo('DeductionType').findOneByOrFail({ id: types.commitment.id })).isActive, true)
  expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'COURT', nameAr: 'حكم قضائي', category: 'COURT_ORDER', calcMethod: 'FIXED_AMOUNT', isExemptable: true }), 400, 'DEDUCTION_TYPE_NOT_EXEMPTABLE')
  expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'COMMITMENT', nameAr: 'مكرر', category: 'DISCIPLINARY', calcMethod: 'FIXED_AMOUNT' }), 409, 'DEDUCTION_TYPE_CODE_EXISTS')
  const productivity = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'PRODUCTIVITY', nameAr: 'خصم إنتاجية', category: 'PERFORMANCE', calcMethod: 'PERCENT_OF_BASE', creatorScopes: ['DIRECT_MANAGER'] }), 201)
  const pending = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: productivity.id, inputValue: '2', reason: `${REASON} — إنتاجية` }), employeeId: people.a3.id, targetPeriod: '2026-09' }), 201)
  const disabled = expectStatus(await request(users.admin, 'PATCH', `/deductions/types/${productivity.id}`, { isActive: false }), 200)
  assert.equal(disabled.version, productivity.version, 'activation is not a financial change')
  const creatable = expectStatus(await request(users.manager, 'GET', '/deductions/creatable'), 200)
  // تدقيق الأدوار D9: الكتالوج الكامل (القيم والسقوف وسلاسل الاعتماد) لحامل deductions.manage بس — كان مفتوحًا لأي حساب.
  // المدير العادي (بلا أي صلاحية) يفضل شايف أنواعه وموظفيه من creatable/candidates، وده اللي نموذج الطلب بيستخدمه.
  for (const blocked of [users.manager, users.a1, users.outsider, users.viewer]) expectStatus(await request(blocked, 'GET', '/deductions/types'), 403)
  expectStatus(await request(users.manager, 'GET', '/deductions/types?includeInactive=true'), 403)
  assert.ok(expectStatus(await request(users.hr, 'GET', '/deductions/types'), 200).some(row => row.code === 'COMMITMENT'))
  assert.ok(expectStatus(await request(users.admin, 'GET', '/deductions/types?includeInactive=true'), 200).some(row => row.code === 'PRODUCTIVITY'))
  assert.ok(creatable.types.some(row => row.id === types.commitment.id && row.calcMethod === 'DAYS_OF_SALARY'), 'نموذج الطلب بياخد النوع بقواعده من creatable')
  assert.ok(expectStatus(await request(users.manager, 'GET', `/deductions/candidates?typeId=${types.commitment.id}`), 200).some(row => row.id === people.a1.id))
  assert.deepEqual(expectStatus(await request(users.a1, 'GET', '/deductions/creatable'), 200).types, [], 'موظف بلا مرؤوسين ماياخدش أي نوع')
  assert.ok(!creatable.types.some(row => row.id === productivity.id), 'a disabled type disappears from the creation list')
  assert.deepEqual(creatable.bases, ['DIRECT_MANAGER'])
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: productivity.id, inputValue: '3' }), employeeId: people.a3.id, targetPeriod: '2026-09' }), 400, 'DEDUCTION_TYPE_INACTIVE')
  assert.equal(expectStatus(await request(users.hr, 'GET', `/deductions/${pending.id}`), 200).status, 'IN_APPROVAL')
  const capped = expectStatus(await request(users.admin, 'PATCH', `/deductions/types/${types.commitment.id}`, { maxPctOfGross: '30' }), 200)
  assert.equal(capped.version, types.commitment.version + 1, 'a cap change bumps the type version')
  types.commitment = expectStatus(await request(users.admin, 'PATCH', `/deductions/types/${types.commitment.id}`, { maxPctOfGross: '25' }), 200)
  expectStatus(await request(users.hr, 'POST', `/deductions/${pending.id}/cancel`, { expectedRevision: 0, reason: 'إلغاء طلب اختبار الكتالوج بعد تعطيل النوع' }), 201)
})

test('Acceptance: a commitment deduction by an authorized direct manager for a specific month enters only that month, is reserved at approval and consumed at payment', async () => {
  // الإنشاء بنطاق المدير المباشر للشهر 2026-08: يوم واحد من 9000 = 300.00، خطوة الموارد البشرية فقط (لا تصعيد عند يوم واحد)
  const createdRow = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input(), employeeId: people.a1.id, targetPeriod: '2026-08' }), 201)
  assert.equal(createdRow.status, 'IN_APPROVAL')
  assert.equal(createdRow.creator.basis, 'DIRECT_MANAGER')
  assert.equal(createdRow.estimatedAmount, '300.00')
  assert.equal(createdRow.escalated, false)
  assert.deepEqual(createdRow.steps.map(step => [step.role, step.status]), [['HR', 'PENDING']])
  assert.equal(createdRow.amountTrace.creation.salarySource.endsWith('CURRENT_FILE_UNVERIFIED'), true)
  // النطاق والصلاحية
  expectStatus(await request(users.outsider, 'POST', '/deductions', { ...input(), employeeId: people.a1.id, targetPeriod: '2026-08' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input(), employeeId: people.manager.id, targetPeriod: '2026-08' }), 403, 'DEDUCTION_SELF')
  expectStatus(await request(users.departmentManager, 'POST', '/deductions', { ...input(), employeeId: people.branchManager.id, targetPeriod: '2026-08' }), 403, 'DEDUCTION_SUPERIOR')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ reason: 'سبب قصير' }), employeeId: people.a1.id, targetPeriod: '2026-08' }), 400, 'DEDUCTION_REASON_TOO_SHORT')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: 99999 }), employeeId: people.a1.id, targetPeriod: '2026-08' }), 404, 'DEDUCTION_TYPE_NOT_FOUND')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input(), employeeId: people.a1.id, targetPeriod: '2026-08' }), 409, 'DEDUCTION_DUPLICATE')
  // DD-08: الموظف يرى خصمه بحالته، ولا يرى خصومات غيره ولا يعتمد خصمه
  const mine = expectStatus(await request(users.a1, 'GET', '/deductions/mine'), 200)
  assert.deepEqual(mine.map(row => [row.id, row.status, row.amount, row.issuer.basisLabel]), [[createdRow.id, 'IN_APPROVAL', '300.00', 'المدير المباشر']])
  // تدقيق الأدوار D6: الرد مايفرّقش بين طلب موجود خارج النطاق وطلب غايب — نفس الحالة ونفس الجسم بالحرف
  const missing = await request(users.outsider, 'GET', '/deductions/99999999')
  expectStatus(missing, 404, 'DEDUCTION_NOT_FOUND')
  for (const stranger of [users.outsider, users.hrB, users.a1]) {
    const real = await request(stranger, 'GET', `/deductions/${createdRow.id}`)
    assert.deepEqual([real.status, real.body], [missing.status, missing.body], `${stranger.email}: موجود خارج النطاق = غايب`)
  }
  // ونفس القاعدة في الإجراءات: الغريب بياخد «غير موجود» قبل فحص النسخة (كان 409) وقبل فحص الصفة (كان 403)
  for (const action of ['approve', 'reject', 'withdraw', 'cancel', 'reverse', 'objection-response']) {
    const body = { expectedRevision: 77, reason: 'محاولة من حساب بلا أي صفة على الطلب', text: 'رد من حساب بلا صفة' }
    const stranger = ['cancel', 'reverse'].includes(action) ? users.hrB : users.outsider
    const onReal = await request(stranger, 'POST', `/deductions/${createdRow.id}/${action}`, body)
    const onMissing = await request(stranger, 'POST', `/deductions/99999999/${action}`, body)
    assert.deepEqual([onReal.status, onReal.body], [onMissing.status, onMissing.body], `${action}: موجود خارج النطاق = غايب`)
    assert.deepEqual([onReal.status, onReal.body.code], [404, 'DEDUCTION_NOT_FOUND'], action)
  }
  assert.deepEqual([(await repo('DeductionRequest').findOneByOrFail({ id: createdRow.id })).status, (await repo('DeductionRequest').findOneByOrFail({ id: createdRow.id })).revision], ['IN_APPROVAL', 0])
  assert.equal(expectStatus(await request(users.viewer, 'GET', `/deductions/${createdRow.id}`), 200).capabilities.canApprove, false)
  // DD-06: لا يعتمد المُنشئ، ولا موارد بشرية فرع آخر؛ النسخة القديمة ترفض
  expectStatus(await request(users.manager, 'POST', `/deductions/${createdRow.id}/approve`, { expectedRevision: 0 }), 403, 'DEDUCTION_NOT_CURRENT_APPROVER')
  expectStatus(await request(users.hrB, 'POST', `/deductions/${createdRow.id}/approve`, { expectedRevision: 0 }), 404, 'DEDUCTION_NOT_FOUND')
  // صاحب الخصم نفسه عارف إنه موجود (شايفه في «خصوماتي») فبياخد السبب الصريح مش «غير موجود»
  expectStatus(await request(users.a1, 'POST', `/deductions/${createdRow.id}/approve`, { expectedRevision: 0 }), 403, 'DEDUCTION_NOT_CURRENT_APPROVER')
  expectStatus(await request(users.hr, 'POST', `/deductions/${createdRow.id}/approve`, { expectedRevision: 5 }), 409, 'DEDUCTION_REVISION_CHANGED')
  const approved = expectStatus(await request(users.hr, 'POST', `/deductions/${createdRow.id}/approve`, { expectedRevision: 0, reason: 'موثق بمحضر الاجتماع' }), 201)
  assert.equal(approved.status, 'APPROVED')
  assert.equal(approved.finalAmount, '300.00')
  assert.equal(approved.obligations.length, 1)
  const [obligation] = approved.obligations
  assert.deepEqual([obligation.amount, obligation.status, obligation.targetPeriod, obligation.effectiveDate], ['300.00', 'PENDING', '2026-08', '2026-08-01'])
  assert.deepEqual(approved.events.map(event => event.eventType), ['SUBMITTED', 'STEP_APPROVED', 'APPROVED'])
  // الفترة المستهدفة: مسير يوليو لا يأخذه، ومسير أغسطس يخصمه
  const july = await calc('2026-07', [people.a1])
  assert.equal(Number(itemOf(july, people.a1).otherDeductions), 0)
  assert.deepEqual(JSON.parse(itemOf(july, people.a1).breakdown).obligationIds, [])
  const august = await calc('2026-08', [people.a1])
  const augustItem = itemOf(august, people.a1)
  assert.equal(Number(augustItem.otherDeductions), 300)
  assert.equal(Number(augustItem.netPay), 8700)
  assert.deepEqual(JSON.parse(augustItem.breakdown).obligationIds, [obligation.id])
  assert.deepEqual(JSON.parse(augustItem.breakdown).obligationLines.map(line => [line.id, line.collected, line.carried]), [[obligation.id, 300, 0]])
  // DD-09: الحجز عند اعتماد المسير يمنع الإلغاء، والصرف يستهلك مرة واحدة
  expectStatus(await transition(august, 'approve'), 201)
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: obligation.id })).reservedPayrollRunId, august.id)
  expectStatus(await request(users.hr, 'POST', `/deductions/${createdRow.id}/cancel`, { expectedRevision: approved.revision, reason: 'محاولة إلغاء بعد اعتماد المسير الحاجز' }), 409, 'DEDUCTION_RESERVED')
  expectStatus(await transition(august, 'pay'), 201)
  const consumed = await repo('EmployeeObligation').findOneByOrFail({ id: obligation.id })
  assert.deepEqual([consumed.status, Number(consumed.appliedAmount), consumed.appliedPayrollRunId], ['APPLIED', 300, august.id])
  const after = expectStatus(await request(users.a1, 'GET', '/deductions/mine'), 200)
  assert.equal(after[0].obligations[0].status, 'APPLIED')
  // الشهر المصروف مقفل أمام خصم جديد مستهدف له
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '0.5' }), employeeId: people.a1.id, targetPeriod: '2026-08' }), 400, 'DEDUCTION_PERIOD_CLOSED')
  expectStatus(await request(users.hr, 'POST', `/deductions/${createdRow.id}/cancel`, { expectedRevision: approved.revision, reason: 'محاولة إلغاء خصم مستهلك في مسير مصروف' }), 409, 'DEDUCTION_CONSUMED')
})

test('Acceptance: a bulk team deduction excludes one employee after a preview, and each employee keeps an independent request', async () => {
  const body = { ...input({ inputValue: '0.5', reason: `${REASON} — تعميم الفريق` }), targetPeriod: '2026-09',
    selection: { mode: 'TEAM', ids: [org.teamA.id], excludeEmployeeIds: [people.a3.id] } }
  const preview = expectStatus(await request(users.teamLeader, 'POST', '/deductions/preview', body), 201)
  assert.deepEqual(preview.rows.map(row => [row.employeeId, row.status]), [[people.a1.id, 'READY'], [people.a2.id, 'READY'], [people.a3.id, 'EXCLUDED']])
  assert.deepEqual(preview.rows.filter(row => row.status === 'READY').map(row => [row.amount, row.basis]), [['150.00', 'TEAM_LEADER'], ['150.00', 'TEAM_LEADER']])
  assert.deepEqual([preview.totals.ready, preview.totals.excluded, preview.totals.totalAmount], [2, 1, '300.00'])
  const stale = expectStatus(await request(users.teamLeader, 'POST', '/deductions/bulk', { ...body, previewHash: '0'.repeat(64) }), 409, 'DEDUCTION_PREVIEW_STALE')
  assert.equal(stale.preview.previewHash, preview.previewHash)
  expectStatus(await request(users.teamLeader, 'POST', '/deductions/bulk', { ...body, selection: { ...body.selection, excludeEmployeeIds: [] }, previewHash: preview.previewHash }), 409, 'DEDUCTION_PREVIEW_STALE')
  const result = expectStatus(await request(users.teamLeader, 'POST', '/deductions/bulk', { ...body, previewHash: preview.previewHash }), 201)
  assert.deepEqual(result.created.map(row => [row.employeeId, row.amount]), [[people.a1.id, '150.00'], [people.a2.id, '150.00']])
  assert.deepEqual(result.skipped.map(row => [row.employeeId, row.status]), [[people.a3.id, 'EXCLUDED']])
  const rows = await repo('DeductionRequest').find({ where: { batchId: result.batchId }, order: { id: 'ASC' } })
  assert.deepEqual(rows.map(row => [row.employeeId, row.scopeBasis, row.status]), [[people.a1.id, 'TEAM_LEADER', 'IN_APPROVAL'], [people.a2.id, 'TEAM_LEADER', 'IN_APPROVAL']])
  assert.equal(await repo('DeductionRequest').count({ where: { batchId: result.batchId, employeeId: people.a3.id } }), 0)
  const batch = await repo('DeductionBatch').findOneByOrFail({ id: result.batchId })
  assert.deepEqual([batch.createdCount, batch.skippedCount, batch.selectionMode], [2, 1, 'TEAM'])
  for (const row of rows) assert.deepEqual((await repo('DeductionRequestEvent').find({ where: { requestId: row.id } })).map(event => event.eventType), ['SUBMITTED'])
  // تكرار نفس الدفعة يُكشف لكل موظف، والتأكيد الصريح يتجاوزه
  const again = expectStatus(await request(users.teamLeader, 'POST', '/deductions/preview', body), 201)
  assert.deepEqual(again.rows.map(row => row.status), ['DEDUCTION_DUPLICATE', 'DEDUCTION_DUPLICATE', 'EXCLUDED'])
  const confirmed = expectStatus(await request(users.teamLeader, 'POST', '/deductions/preview', { ...body, confirmNotDuplicate: true }), 201)
  assert.deepEqual(confirmed.rows.map(row => row.status), ['READY', 'READY', 'EXCLUDED'])
  // من خارج النطاق لا يرى أسماء الفريق ولا عددهم (مراجعة S25: لا عدّاد «مخفي» يكشف حجم الوحدة)
  const hidden = expectStatus(await request(users.outsider, 'POST', '/deductions/preview', body), 201)
  assert.deepEqual([hidden.rows.length, hidden.totals.candidates, hidden.totals.ready, 'hiddenOutOfScope' in hidden.totals], [0, 0, 0, false])
  // HR: قائمة بانتظاري تعرض الطلبين؛ الرفض يحتاج سببًا
  const pendingMine = expectStatus(await request(users.hr, 'GET', `/deductions?view=pending_me&batchId=${result.batchId}`), 200)
  assert.deepEqual(pendingMine.map(row => row.employee.id).sort(), [people.a1.id, people.a2.id].sort())
  expectStatus(await request(users.hr, 'POST', `/deductions/${rows[1].id}/reject`, { expectedRevision: 0 }), 400, 'DEDUCTION_REASON_REQUIRED')
  assert.equal(expectStatus(await request(users.hr, 'POST', `/deductions/${rows[1].id}/reject`, { expectedRevision: 0, reason: 'الموظف كان في مهمة رسمية' }), 201).status, 'REJECTED')
  assert.equal(expectStatus(await request(users.teamLeader, 'POST', `/deductions/${rows[0].id}/withdraw`, { expectedRevision: 0 }), 201).status, 'WITHDRAWN')
})

test('DD-03/06: above one day escalates to the department manager before HR; a department manager creator skips his own step', async () => {
  const escalated = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '2', reason: `${REASON} — غياب عن التسليم` }), employeeId: people.a2.id, targetPeriod: '2026-10' }), 201)
  assert.equal(escalated.escalated, true)
  assert.deepEqual(escalated.steps.map(step => [step.role, step.status, step.escalation, step.approverEmployeeId]),
    [['DEPARTMENT_MANAGER', 'PENDING', true, people.departmentManager.id], ['HR', 'PENDING', false, null]])
  expectStatus(await request(users.hr, 'POST', `/deductions/${escalated.id}/approve`, { expectedRevision: 0 }), 403, 'DEDUCTION_NOT_CURRENT_APPROVER')
  const first = expectStatus(await request(users.departmentManager, 'POST', `/deductions/${escalated.id}/approve`, { expectedRevision: 0 }), 201)
  assert.deepEqual([first.status, first.currentStepOrder], ['IN_APPROVAL', 2])
  const adjusted = expectStatus(await request(users.hr, 'POST', `/deductions/${escalated.id}/approve`, { expectedRevision: 1, adjustedAmount: '450', reason: 'تخفيض بعد مراجعة المبررات' }), 201)
  assert.deepEqual([adjusted.status, adjusted.finalAmount, adjusted.steps[1].adjustedFrom, adjusted.steps[1].adjustedTo], ['APPROVED', '450.00', '600.00', '450.00'])
  const byDepartmentManager = expectStatus(await request(users.departmentManager, 'POST', '/deductions', { ...input({ inputValue: '2', reason: `${REASON} — قرار القسم` }), employeeId: people.a3.id, targetPeriod: '2026-10' }), 201)
  assert.deepEqual(byDepartmentManager.steps.map(step => [step.role, step.status, step.note]), [['DEPARTMENT_MANAGER', 'SKIPPED', 'تُخطّي: المعتمِد هو المُنزِّل'], ['HR', 'PENDING', null]])
  assert.equal(byDepartmentManager.creator.basis, 'DEPARTMENT_MANAGER')
  assert.ok(byDepartmentManager.events.some(event => event.eventType === 'STEP_SKIPPED'))
})

test('DD-02/05: caps, value step, installments and incident age are enforced per type; HR may create older incidents with a recorded override', async () => {
  const cap = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: types.admin.id, inputValue: '3000' }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 400, 'DEDUCTION_ABOVE_PCT_OF_GROSS')
  assert.equal(cap.limit, '2250.00')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '0.3' }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 400, 'DEDUCTION_STEP_INVALID')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ installments: 2 }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 400, 'DEDUCTION_INSTALLMENTS_NOT_ALLOWED')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: types.admin.id, inputValue: '900', installments: 4 }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 400, 'DEDUCTION_INSTALLMENTS_ABOVE_MAX')
  const split = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: types.admin.id, inputValue: '1000', installments: 3, reason: `${REASON} — تقسيط إداري` }), employeeId: people.a2.id, targetPeriod: '2026-11' }), 201)
  const splitApproved = expectStatus(await request(users.hr, 'POST', `/deductions/${split.id}/approve`, { expectedRevision: 0 }), 201)
  assert.deepEqual(splitApproved.obligations.map(row => [row.targetPeriod, row.amount, row.effectiveDate]), [['2026-11', '333.33', '2026-11-01'], ['2026-12', '333.33', '2026-12-01'], ['2027-01', '333.34', '2027-01-01']])
  const quick = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'QUICK', nameAr: 'خصم فوري', category: 'ADMINISTRATIVE', calcMethod: 'FIXED_AMOUNT', maxIncidentAgeDays: 1, creatorScopes: ['DIRECT_MANAGER', 'HR'] }), 201)
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: quick.id, inputValue: '100' }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 400, 'DEDUCTION_INCIDENT_TOO_OLD')
  const hrOld = expectStatus(await request(users.hr, 'POST', '/deductions', { ...input({ deductionTypeId: quick.id, inputValue: '100' }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 201)
  assert.deepEqual([hrOld.creator.basis, hrOld.overrides.incidentAgeOverride], ['HR', true])
  expectStatus(await request(users.hrB, 'POST', '/deductions', { ...input({ deductionTypeId: quick.id, inputValue: '100' }), employeeId: people.a1.id, targetPeriod: '2026-11' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  // DD-12: الإلغاء بسبب موثق يلغي الأقساط المعلقة ويبقي الطلب مرئيًا
  expectStatus(await request(users.manager, 'POST', `/deductions/${split.id}/cancel`, { expectedRevision: splitApproved.revision, reason: 'مدير مباشر لا يملك الإلغاء بعد الاعتماد' }), 403)
  expectStatus(await request(users.hr, 'POST', `/deductions/${split.id}/cancel`, { expectedRevision: splitApproved.revision, reason: 'قصير' }), 400, 'DEDUCTION_REASON_TOO_SHORT')
  const cancelled = expectStatus(await request(users.hr, 'POST', `/deductions/${split.id}/cancel`, { expectedRevision: splitApproved.revision, reason: 'ثبت خطأ في قيد المخالفة الإدارية بعد المراجعة' }), 201)
  assert.deepEqual([cancelled.status, ...cancelled.obligations.map(row => row.status)], ['CANCELLED', 'CANCELLED', 'CANCELLED', 'CANCELLED'])
  // وضع الإثبات الشهري (قاعدة المالك): بلا راتب موثق للشهر لا يُحسب الخصم
  await repo('RequestsConfig').save({ key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY' })
  try {
    expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '0.25' }), employeeId: people.a1.id, targetPeriod: '2026-12' }), 400, 'DEDUCTION_NO_SALARY_DEFINED')
  } finally {
    await repo('RequestsConfig').save({ key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' })
  }
})

test('Step 25: direct DEBIT creation is locked, CREDIT stays, and an approved request payload cannot turn a bonus into a debit', async () => {
  expectStatus(await request(users.admin, 'POST', '/obligations', { employeeId: people.a3.id, type: 'DEBIT', amount: 50, label: 'خصم مباشر ممنوع' }), 403, 'OBLIGATION_DIRECT_DEBIT_LOCKED')
  const credit = expectStatus(await request(users.admin, 'POST', '/obligations', { employeeId: people.a3.id, type: 'CREDIT', amount: 50, label: 'إضافة يدوية مسموحة', effectiveDate: '2027-06-01' }), 201)
  await repo('EmployeeObligation').update(credit.id, { status: 'CANCELLED' })
  const destinations = app.get(require('../src/requests/destinations.service').DestinationsService)
  const handler = destinations.handlers?.payroll_bonus
  assert.equal(typeof handler, 'function', 'payroll_bonus handler is registered')
  const requestId = 900000 + sequence++
  await ds.transaction(em => handler(em, { id: requestId, requesterId: people.a3.id, branchId: org.branchA.id }, null,
    { employeeId: people.a3.id, amount: 75, type: 'DEBIT', reason: 'مكافأة اختبار بحمولة نوع مزيف', effectiveDate: '2027-06-01' }))
  const saved = await repo('EmployeeObligation').findOneByOrFail({ sourceRequestId: requestId })
  assert.equal(saved.type, 'CREDIT')
  await repo('EmployeeObligation').update(saved.id, { status: 'CANCELLED' })
})

test('DD-11/DD-09: net protection carries the typed excess at payment, another approved run cannot take a reserved entry, and a negative net blocks approval', async () => {
  // راتب 1000: استرداد عهدة 900 يُحصّل أولًا ثم خصم مصنف 250 يُحصّل منه 100 ويُرحّل 150
  await repo('EmployeeObligation').save({ employeeId: people.low.id, type: 'DEBIT', category: 'custody_shortfall', amount: 900, label: 'قيمة عهدة مفقودة (اختبار)',
    status: 'PENDING', effectiveDate: '2026-10-01', sourceRef: 'asset:test' })
  const typed = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: types.admin.id, inputValue: '250', reason: `${REASON} — عهدة وخصم` }), employeeId: people.low.id, targetPeriod: '2026-10' }), 201)
  const typedApproved = expectStatus(await request(users.hr, 'POST', `/deductions/${typed.id}/approve`, { expectedRevision: 0 }), 201)
  const typedObligationId = typedApproved.obligations[0].id
  const october = await calc('2026-10', [people.low])
  const item = itemOf(october, people.low)
  assert.deepEqual([Number(item.otherDeductions), Number(item.netPay)], [1000, 0])
  const breakdown = JSON.parse(item.breakdown)
  assert.deepEqual(breakdown.obligationLines.filter(line => line.type === 'DEBIT').map(line => [line.id === typedObligationId, line.collected, line.carried]), [[false, 900, 0], [true, 100, 150]])
  assert.equal(breakdown.netProtection.debitCapacity, '1000.00')
  // مسودة نوفمبر محسوبة قبل اعتماد أكتوبر تحمل نفس القيدين؛ اعتماد أكتوبر يحجزهما فيُرفض اعتماد نوفمبر
  const november = await calc('2026-11', [people.low])
  assert.ok(JSON.parse(itemOf(november, people.low).breakdown).obligationIds.includes(typedObligationId))
  expectStatus(await transition(october, 'approve'), 201)
  expectStatus(await transition(november, 'approve'), 409, 'PAYRUN-OBLIGATION-RESERVED')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: november.id })).status, 'CALCULATED')
  // إعادة الفتح تحرر الحجز، والاعتماد مجددًا يحجز من جديد
  expectStatus(await transition(october, 'reopen', { reason: 'مراجعة حماية الصافي قبل الصرف' }), 201)
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: typedObligationId })).reservedPayrollRunId, null)
  expectStatus(await transition(october, 'approve'), 201)
  expectStatus(await transition(october, 'pay'), 201)
  const parent = await repo('EmployeeObligation').findOneByOrFail({ id: typedObligationId })
  assert.deepEqual([parent.status, Number(parent.appliedAmount), parent.appliedPayrollRunId], ['APPLIED', 100, october.id])
  const child = await repo('EmployeeObligation').findOneByOrFail({ carriedFromObligationId: typedObligationId })
  assert.deepEqual([child.status, Number(child.amount), child.targetPeriod, child.effectiveDate, child.deductionRequestId, child.type],
    ['PENDING', 150, '2026-11', '2026-11-01', typed.id, 'DEBIT'])
  const detail = expectStatus(await request(users.hr, 'GET', `/deductions/${typed.id}`), 200)
  assert.deepEqual(detail.obligations.map(row => [row.status, row.amount, row.appliedAmount]), [['APPLIED', '250.00', '100.00'], ['PENDING', '150.00', null]])
  // DD-11: صافٍ سالب محفوظ يمنع الاعتماد
  const december = await calc('2026-12', [people.a3])
  await repo('PayrollItem').update(itemOf(december, people.a3).id, { netPay: -5 })
  expectStatus(await transition(december, 'approve'), 409, 'PAYRUN-NET-NEGATIVE')
})

// ===== إعادة العمل بعد مراجعة S25 =====
const userFor = (label, emp, permissions = []) => repo('User').save({ email: `${label}@typed-deductions.invalid`, displayName: label, passwordHash: 'test-only', role: 'employee',
  branchId: emp.branchId, employeeId: emp.id, permissions: JSON.stringify(permissions) })
const currentRevision = async id => (await repo('DeductionRequest').findOneByOrFail({ id })).revision

test('Review S25 security: an inactive out-of-scope employee and a missing id get the same answer, and previews never name, count or limit by staff outside the creator scope', async () => {
  const inactive = await employee('DD_INACT', { isActive: false, status: 'terminated', managerEmployeeId: people.manager.id })
  const body = selection => ({ ...input({ reason: `${REASON} — فحص النطاق` }), targetPeriod: '2026-12', selection })
  const byIds = expectStatus(await request(users.outsider, 'POST', '/deductions/preview', body({ mode: 'EMPLOYEES', ids: [inactive.id, 99999999] })), 201)
  assert.deepEqual(byIds.rows.map(row => [row.status, row.fullName, row.employeeCode, row.branchName, row.departmentName]),
    [['DEDUCTION_OUT_OF_SCOPE', null, null, null, null], ['DEDUCTION_OUT_OF_SCOPE', null, null, null, null]])
  assert.equal(JSON.stringify(byIds).includes('DD_INACT'), false, 'no employee code of an out-of-scope inactive employee')
  const single = expectStatus(await request(users.outsider, 'POST', '/deductions', { ...input(), employeeId: inactive.id, targetPeriod: '2026-12' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  const missing = expectStatus(await request(users.outsider, 'POST', '/deductions', { ...input(), employeeId: 99999999, targetPeriod: '2026-12' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  assert.deepEqual(single, missing, 'no existence oracle between an inactive employee and a missing id')
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input(), employeeId: inactive.id, targetPeriod: '2026-12' }), 400, 'DEDUCTION_EMPLOYEE_INACTIVE')
  expectStatus(await request(users.admin, 'POST', '/deductions', { ...input(), employeeId: 99999999, targetPeriod: '2026-12' }), 404, 'DEDUCTION_EMPLOYEE_NOT_FOUND')
  // وحدة كاملة من خارج النطاق: لا صفوف ولا عدد ولا «مخفي»
  const branch = expectStatus(await request(users.outsider, 'POST', '/deductions/preview', body({ mode: 'BRANCH', ids: [org.branchA.id] })), 201)
  assert.deepEqual([branch.rows.length, branch.totals.candidates, branch.totals.ready, 'hiddenOutOfScope' in branch.totals], [0, 0, 0, false])
  expectStatus(await request(users.outsider, 'POST', '/deductions/bulk', { ...body({ mode: 'BRANCH', ids: [org.branchA.id] }), previewHash: branch.previewHash }), 400, 'DEDUCTION_BULK_EMPTY')
  // حد الدفعة على من في النطاق فقط؛ رسالته لا تكشف عدد الفرع
  await repo('RequestsConfig').save({ key: 'deductions.bulk_max_employees', value: '1' })
  try {
    expectStatus(await request(users.outsider, 'POST', '/deductions/preview', body({ mode: 'BRANCH', ids: [org.branchA.id] })), 201)
    const limited = expectStatus(await request(users.teamLeader, 'POST', '/deductions/preview', body({ mode: 'TEAM', ids: [org.teamA.id] })), 400, 'DEDUCTION_BULK_LIMIT')
    assert.match(limited.message, /3 موظفًا في نطاقك/)
  } finally {
    await repo('RequestsConfig').save({ key: 'deductions.bulk_max_employees', value: '500' })
  }
})

test('Review S25 escalation: a missing department manager falls back to the branch manager; with nobody structural above, the escalation goes to the executive; SKIP keeps the old skip', async () => {
  const noDepartment = await employee('DD_ND', { departmentId: null, managerEmployeeId: people.manager.id })
  const climbed = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '2', reason: `${REASON} — بلا قسم` }), employeeId: noDepartment.id, targetPeriod: '2026-12' }), 201)
  assert.equal(climbed.escalated, true)
  assert.deepEqual(climbed.steps.map(step => [step.role, step.status, step.escalation, step.approverEmployeeId, step.fallbackFrom]),
    [['BRANCH_MANAGER', 'PENDING', true, people.branchManager.id, 'DEPARTMENT_MANAGER'], ['HR', 'PENDING', false, null, null]])
  assert.ok(climbed.events.some(event => event.eventType === 'STEP_FALLBACK'))
  const orphan = await employee('DD_ORPH', { branchId: org.branchB.id, departmentId: null, managerEmployeeId: null })
  const executive = expectStatus(await request(users.hrB, 'POST', '/deductions', { ...input({ inputValue: '2', reason: `${REASON} — بلا هيكل` }), employeeId: orphan.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual(executive.steps.map(step => [step.role, step.status, step.fallbackFrom]), [['EXECUTIVE', 'PENDING', 'DEPARTMENT_MANAGER'], ['HR', 'PENDING', null]])
  expectStatus(await request(users.hrB, 'POST', `/deductions/${executive.id}/approve`, { expectedRevision: 0 }), 403, 'DEDUCTION_NOT_CURRENT_APPROVER')
  const afterExecutive = expectStatus(await request(users.admin, 'POST', `/deductions/${executive.id}/approve`, { expectedRevision: 0 }), 201)
  assert.deepEqual([afterExecutive.status, afterExecutive.currentStepOrder], ['IN_APPROVAL', 2])
  await repo('RequestsConfig').save({ key: 'deductions.missing_approver_fallback', value: 'SKIP' })
  try {
    const skipped = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '2.5', reason: `${REASON} — بلا قسم بتخطٍ` }), employeeId: noDepartment.id, targetPeriod: '2026-12' }), 201)
    assert.deepEqual(skipped.steps.map(step => [step.role, step.status]), [['DEPARTMENT_MANAGER', 'SKIPPED'], ['HR', 'PENDING']])
    expectStatus(await request(users.hr, 'POST', `/deductions/${skipped.id}/cancel`, { expectedRevision: skipped.revision, reason: 'إلغاء طلب فحص إعداد تخطي المعتمد المفقود' }), 201)
  } finally {
    await repo('RequestsConfig').save({ key: 'deductions.missing_approver_fallback', value: 'NEXT_LEVEL' })
  }
  for (const id of [climbed.id, executive.id]) {
    expectStatus(await request(users.admin, 'POST', `/deductions/${id}/cancel`, { expectedRevision: await currentRevision(id), reason: 'إلغاء طلب فحص بديل المعتمد المفقود' }), 201)
  }
})

test('Review S25 DD-01/03/04: an owned type is closed to structural creators outside the owner unit; its function owner deducts within the functional scope under his own escalation limit', async () => {
  org.departmentQ = await repo('Department').save({ branchId: org.branchA.id, name: 'إدارة الجودة', code: 'DD_DQ' })
  people.qualityManager = await employee('DD_QM', { departmentId: org.departmentQ.id, managerEmployeeId: people.branchManager.id })
  await repo('Department').update(org.departmentQ.id, { managerEmployeeId: people.qualityManager.id })
  users.qualityManager = await userFor('quality-manager', people.qualityManager)
  expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'QUALITY_NO_OWNER', nameAr: 'جودة بلا جهة', category: 'PERFORMANCE', calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['FUNCTION_OWNER', 'HR'] }), 400, 'DEDUCTION_TYPE_INVALID')
  expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'QUALITY_BAD_OWNER', nameAr: 'جودة بجهة مفقودة', category: 'PERFORMANCE', calcMethod: 'DAYS_OF_SALARY', ownerDepartmentId: 99999999 }), 400, 'DEDUCTION_TYPE_OWNER_NOT_FOUND')
  const quality = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'QUALITY_OWNED', nameAr: 'خصم جودة مملوك', category: 'PERFORMANCE', calcMethod: 'DAYS_OF_SALARY',
    ownerDepartmentId: org.departmentQ.id, functionalScope: { teamIds: [org.teamA.id] }, creatorScopes: ['DIRECT_MANAGER', 'FUNCTION_OWNER', 'HR'],
    basisEscalationDays: { FUNCTION_OWNER: '2' }, escalationDays: '1', escalationStep: 'DEPARTMENT_MANAGER' }), 201)
  assert.deepEqual([quality.ownerDepartmentId, quality.functionalScope, quality.basisEscalationDays],
    [org.departmentQ.id, { departmentIds: [], teamIds: [org.teamA.id], employeeIds: [] }, { FUNCTION_OWNER: '2' }])
  // المدير المباشر لأعضاء الفريق خارج الجهة المالكة: لا يرى النوع ولا يُنزله (DD-03 قاعدة 3)
  assert.ok(!expectStatus(await request(users.manager, 'GET', '/deductions/creatable'), 200).types.some(row => row.id === quality.id))
  expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: quality.id }), employeeId: people.a1.id, targetPeriod: '2026-12' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  // مدير الجهة المالكة: نطاقه الوظيفي فريق التسليم فقط (DD-04 قاعدة 2)
  const creatable = expectStatus(await request(users.qualityManager, 'GET', '/deductions/creatable'), 200)
  assert.ok(creatable.types.some(row => row.code === 'QUALITY_OWNED') && creatable.bases.includes('FUNCTION_OWNER'))
  const candidates = expectStatus(await request(users.qualityManager, 'GET', `/deductions/candidates?typeId=${quality.id}`), 200)
  assert.deepEqual(candidates.map(row => row.id).sort((a, b) => a - b), [people.a1.id, people.a2.id, people.a3.id].sort((a, b) => a - b))
  assert.ok(candidates.every(row => row.basisLabels.includes('مدير الجهة المالكة')))
  expectStatus(await request(users.qualityManager, 'POST', '/deductions', { ...input({ deductionTypeId: quality.id }), employeeId: people.low.id, targetPeriod: '2026-12' }), 403, 'DEDUCTION_OUT_OF_SCOPE')
  const withinLimit = expectStatus(await request(users.qualityManager, 'POST', '/deductions', { ...input({ deductionTypeId: quality.id, inputValue: '2', reason: `${REASON} — جودة التسليم` }), employeeId: people.a1.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual([withinLimit.creator.basis, withinLimit.escalated, withinLimit.steps.map(step => step.role), withinLimit.amountTrace.escalationDays],
    ['FUNCTION_OWNER', false, ['HR'], '2'], 'two days do not exceed the function owner limit of two days (the type limit is one)')
  const aboveLimit = expectStatus(await request(users.qualityManager, 'POST', '/deductions', { ...input({ deductionTypeId: quality.id, inputValue: '2.5', reason: `${REASON} — جودة متكررة` }), employeeId: people.a2.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual(aboveLimit.steps.map(step => [step.role, step.approverEmployeeId]), [['DEPARTMENT_MANAGER', people.departmentManager.id], ['HR', null]])
  const widened = expectStatus(await request(users.admin, 'PATCH', `/deductions/types/${quality.id}`, { functionalScope: { teamIds: [org.teamA.id], employeeIds: [people.low.id] } }), 200)
  assert.equal(widened.version, quality.version + 1, 'widening the functional scope is a versioned change')
  const low = expectStatus(await request(users.qualityManager, 'POST', '/deductions', { ...input({ deductionTypeId: quality.id, inputValue: '0.5', reason: `${REASON} — جودة موسعة` }), employeeId: people.low.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual(JSON.parse((await repo('DeductionRequest').findOneByOrFail({ id: low.id })).typeSnapshot).functionalScope.employeeIds, [people.low.id])
  for (const id of [withinLimit.id, aboveLimit.id, low.id]) {
    expectStatus(await request(users.hr, 'POST', `/deductions/${id}/cancel`, { expectedRevision: await currentRevision(id), reason: 'إلغاء طلب فحص الجهة المالكة والنطاق الوظيفي' }), 201)
  }
})

test('Review S25 DD-10/DD-08: day installments split the days and price each at its own month; an employee objection blocks approval until answered and closes after its window', async () => {
  const history = expectStatus(await request(users.admin, 'GET', `/payroll/employees/${people.a2.id}/salary-history`), 200)
  const month = (basicSalary, from, to) => ({ basicSalary, housingAllowance: '0.00', transportAllowance: '0.00', phoneAllowance: '0.00', workNatureAllowance: '0.00',
    otherAllowance: '0.00', currency: 'SAR', effectivePayrollPeriod: from, effectiveToPayrollPeriod: to })
  expectStatus(await request(users.admin, 'POST', `/payroll/employees/${people.a2.id}/salary-history/monthly`, { expectedRevision: history.revision, expectedCurrentSourceHash: history.currentSourceHash,
    reason: 'راتب شهري موثق لاختبار تسعير أقساط الأيام', evidenceReference: `fixture:dd:${people.a2.id}`, periods: [month('9000.00', '2020-01', '2027-01'), month('12000.00', '2027-02', null)] }), 201)
  const split = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'SPLIT_DAYS', nameAr: 'خصم أيام مقسط', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY',
    installmentAllowed: true, maxInstallments: 3, escalationDays: null, creatorScopes: ['DIRECT_MANAGER', 'HR'] }), 201)
  const created = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: split.id, inputValue: '3', installments: 2, reason: `${REASON} — أيام مقسطة` }), employeeId: people.a2.id, targetPeriod: '2027-01' }), 201)
  assert.deepEqual(created.amountTrace.installments.map(part => [part.period, part.units, part.rate, part.amount]),
    [['2027-01', '1.5', '300.000000', '450.00'], ['2027-02', '1.5', '400.000000', '600.00']])
  assert.equal(created.estimatedAmount, '1050.00')
  users.a2 = await userFor('employee-a2', people.a2)
  expectStatus(await request(users.a2, 'POST', `/deductions/${created.id}/objection`, { text: 'قصير' }), 400, 'DEDUCTION_OBJECTION_TOO_SHORT')
  expectStatus(await request(users.a1, 'POST', `/deductions/${created.id}/objection`, { text: 'اعتراض من غير صاحب الخصم عليه' }), 404, 'DEDUCTION_NOT_FOUND')
  const objected = expectStatus(await request(users.a2, 'POST', `/deductions/${created.id}/objection`, { text: 'كنت في مهمة عمل رسمية بتكليف مكتوب' }), 201)
  assert.deepEqual([objected.canObject, objected.objections.length, objected.objections[0].response], [false, 1, null])
  expectStatus(await request(users.a2, 'POST', `/deductions/${created.id}/objection`, { text: 'اعتراض ثانٍ قبل الرد على الأول' }), 409, 'DEDUCTION_OBJECTION_EXISTS')
  const pending = expectStatus(await request(users.hr, 'GET', `/deductions/${created.id}`), 200)
  assert.deepEqual([pending.openObjection, pending.capabilities.canApprove, pending.capabilities.blockedByObjection, pending.capabilities.canRespondObjection], [true, false, true, true])
  expectStatus(await request(users.hr, 'POST', `/deductions/${created.id}/approve`, { expectedRevision: pending.revision }), 409, 'DEDUCTION_OBJECTION_OPEN')
  expectStatus(await request(users.a2, 'POST', `/deductions/${created.id}/objection-response`, { text: 'رد من الموظف نفسه' }), 403, 'DEDUCTION_OBJECTION_RESPONSE_FORBIDDEN')
  const answered = expectStatus(await request(users.hr, 'POST', `/deductions/${created.id}/objection-response`, { text: 'المهمة في يوم آخر حسب نظام المهام' }), 201)
  assert.deepEqual([answered.openObjection, answered.capabilities.canApprove], [false, true])
  const approved = expectStatus(await request(users.hr, 'POST', `/deductions/${created.id}/approve`, { expectedRevision: answered.revision }), 201)
  assert.deepEqual([approved.status, approved.finalAmount, ...approved.obligations.map(row => `${row.targetPeriod}=${row.amount}`)], ['APPROVED', '1050.00', '2027-01=450.00', '2027-02=600.00'])
  assert.match(approved.obligations[1].label, /1\.5 يوم × 400\.00/)
  const mine = expectStatus(await request(users.a2, 'GET', '/deductions/mine'), 200).find(row => row.id === created.id)
  assert.equal(mine.objections[0].response.text, 'المهمة في يوم آخر حسب نظام المهام')
  const older = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ deductionTypeId: split.id, inputValue: '0.5', reason: `${REASON} — خارج مهلة الاعتراض` }), employeeId: people.a2.id, targetPeriod: '2027-01' }), 201)
  assertDisposable()
  await ds.query('UPDATE [deduction_requests] SET [createdAt]=DATEADD(day, -6, SYSUTCDATETIME()) WHERE [id]=@0', [older.id])
  assert.equal(expectStatus(await request(users.a2, 'GET', '/deductions/mine'), 200).find(row => row.id === older.id).canObject, false)
  expectStatus(await request(users.a2, 'POST', `/deductions/${older.id}/objection`, { text: 'اعتراض بعد انتهاء مهلة الخمسة أيام' }), 400, 'DEDUCTION_OBJECTION_WINDOW_CLOSED')
  for (const id of [older.id, created.id]) {
    expectStatus(await request(users.hr, 'POST', `/deductions/${id}/cancel`, { expectedRevision: await currentRevision(id), reason: 'إلغاء طلب فحص تقسيط الأيام والاعتراض' }), 201)
  }
})

test('Review S25 DD-12/DD-11/DD-13 and payslip: the payslip traces each ledger line, reversal after payment, a carry over the limit suspends for an HR decision, pay refuses a negative net, and reports reconcile to zero', async () => {
  // القسيمة (قرار المالك): السطر بنوعه وسببه وطلبه وسعر اليوم المستخدم؛ الموظف يرى قسيمته المصروفة
  const augustRun = await repo('PayrollRun').findOneOrFail({ where: { period: '2026-08', status: 'PAID' } })
  const augustItem = await repo('PayrollItem').findOneByOrFail({ runId: augustRun.id, employeeId: people.a1.id })
  const payslip = expectStatus(await request(users.a1, 'GET', `/payroll/items/${augustItem.id}`), 200)
  assert.equal(payslip.obligationDetails.length, 1)
  const [line] = payslip.obligationDetails
  assert.deepEqual([line.categoryLabel, line.collected, line.carried, line.deduction.typeName, line.deduction.units, line.deduction.rate, line.deduction.formula, line.deduction.reason],
    ['خصم', '300.00', '0.00', 'خصم التزام', '1', '300.00', '1 يوم × 300.00 = 300.00', REASON])
  const octoberRun = await repo('PayrollRun').findOneOrFail({ where: { period: '2026-10', status: 'PAID' } })
  const octoberItem = await repo('PayrollItem').findOneByOrFail({ runId: octoberRun.id, employeeId: people.low.id })
  const octoberLines = expectStatus(await request(users.hr, 'GET', `/payroll/items/${octoberItem.id}`), 200).obligationDetails
  assert.deepEqual(octoberLines.map(row => [row.categoryLabel, row.collected, row.carried, row.deduction?.typeName ?? null]), [['عجز عهدة', '900.00', '0.00', null], ['خصم', '100.00', '150.00', 'خصم إداري']])

  // DD-12: عكس جزئي لخصم مستهلك في مسير مصروف بقيد موجب؛ المسير المصروف لا يتغير
  const typedRow = await repo('DeductionRequest').findOneOrFail({ where: { employeeId: people.low.id, status: 'APPROVED' } })
  const lowDetail = expectStatus(await request(users.hr, 'GET', `/deductions/${typedRow.id}`), 200)
  assert.deepEqual([lowDetail.collectedAmount, lowDetail.reversedAmount, lowDetail.capabilities.canReverse], ['100.00', '0.00', true])
  expectStatus(await request(users.manager, 'POST', `/deductions/${typedRow.id}/reverse`, { expectedRevision: lowDetail.revision, reason: 'مدير مباشر لا يملك عكس الخصم المصروف' }), 403)
  const over = expectStatus(await request(users.hr, 'POST', `/deductions/${typedRow.id}/reverse`, { expectedRevision: lowDetail.revision, reason: 'عكس جزئي أكبر من المستهلك الفعلي للخصم', amount: '150' }), 400, 'DEDUCTION_REVERSAL_ABOVE_APPLIED')
  assert.equal(over.limit, '100.00')
  const reversed = expectStatus(await request(users.hr, 'POST', `/deductions/${typedRow.id}/reverse`, { expectedRevision: lowDetail.revision, reason: 'ثبت أن جزءًا من المخالفة الإدارية لم يقع', amount: '60' }), 201)
  const credit = reversed.obligations.find(row => row.type === 'CREDIT')
  assert.deepEqual([reversed.reversedAmount, credit.category, credit.amount, credit.status], ['60.00', 'deduction_reversal', '60.00', 'PENDING'])
  assert.ok(reversed.events.some(event => event.eventType === 'REVERSED'))
  assert.equal(Number((await repo('PayrollItem').findOneByOrFail({ id: octoberItem.id })).netPay), Number(octoberItem.netPay), 'the paid run is untouched')

  // DD-11 قاعدة 4: الترحيل فوق الحد يعلّق القسط ويحيله لقرار الموارد البشرية
  const carrier = await employee('DD_CARRY', { basicSalary: 1000, managerEmployeeId: people.manager.id })
  await exempt(carrier)
  const big = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'BIG_FIXED', nameAr: 'غرامة إدارية كبيرة', category: 'ADMINISTRATIVE', calcMethod: 'FIXED_AMOUNT',
    maxPctOfGross: null, escalationDays: null, creatorScopes: ['HR'] }), 201)
  const heavy = expectStatus(await request(users.hr, 'POST', '/deductions', { ...input({ deductionTypeId: big.id, inputValue: '2500', reason: `${REASON} — ترحيل متكرر` }), employeeId: carrier.id, targetPeriod: '2027-04' }), 201)
  const heavyApproved = expectStatus(await request(users.admin, 'POST', `/deductions/${heavy.id}/approve`, { expectedRevision: 0 }), 201)
  const payRun = async period => { const run = await calc(period, [carrier]); expectStatus(await transition(run, 'approve'), 201); expectStatus(await transition(run, 'pay'), 201); return run }
  let firstChild, secondChild
  await repo('RequestsConfig').save({ key: 'deductions.max_carry_forward_count', value: '1' })
  try {
    const april = await payRun('2027-04')
    assert.deepEqual([Number(itemOf(april, carrier).otherDeductions), Number(itemOf(april, carrier).netPay)], [1000, 0])
    firstChild = await repo('EmployeeObligation').findOneByOrFail({ carriedFromObligationId: heavyApproved.obligations[0].id })
    assert.deepEqual([firstChild.status, Number(firstChild.amount), firstChild.targetPeriod], ['PENDING', 1500, '2027-05'])
    await payRun('2027-05')
    secondChild = await repo('EmployeeObligation').findOneByOrFail({ carriedFromObligationId: firstChild.id })
    assert.deepEqual([secondChild.status, Number(secondChild.amount)], ['SUSPENDED', 500])
  } finally {
    await repo('RequestsConfig').save({ key: 'deductions.max_carry_forward_count', value: '3' })
  }
  const june = await calc('2027-06', [carrier])
  assert.equal(Number(itemOf(june, carrier).otherDeductions), 0, 'a suspended installment enters no run')
  const carrierDetail = expectStatus(await request(users.hr, 'GET', `/deductions/${heavy.id}`), 200)
  assert.deepEqual([carrierDetail.events.filter(event => ['CARRY_FORWARD', 'CARRY_SUSPENDED'].includes(event.eventType)).map(event => event.eventType), carrierDetail.capabilities.canDecideSuspended],
    [['CARRY_FORWARD', 'CARRY_SUSPENDED'], true])
  expectStatus(await request(users.hr, 'POST', `/deductions/obligations/${firstChild.id}/decision`, { action: 'RESUME', reason: 'استئناف قسط غير معلق يجب أن يُرفض' }), 409, 'DEDUCTION_OBLIGATION_STATE')
  expectStatus(await request(users.manager, 'POST', `/deductions/obligations/${secondChild.id}/decision`, { action: 'RESUME', reason: 'مدير مباشر لا يقرر في القسط المعلق' }), 403)
  const resumed = expectStatus(await request(users.hr, 'POST', `/deductions/obligations/${secondChild.id}/decision`, { action: 'RESUME', targetPeriod: '2027-07', reason: 'تم الاتفاق مع الموظف على السداد في يوليو' }), 201)
  assert.deepEqual(resumed.obligations.filter(row => row.id === secondChild.id).map(row => [row.status, row.targetPeriod]), [['PENDING', '2027-07']])
  const july = await calc('2027-07', [carrier])
  assert.equal(Number(itemOf(july, carrier).otherDeductions), 500)

  // DD-11: الصافي السالب المحفوظ يمنع الصرف أيضًا
  const payCheck = await calc('2027-08', [people.a3])
  expectStatus(await transition(payCheck, 'approve'), 201)
  await repo('PayrollItem').update(itemOf(payCheck, people.a3).id, { netPay: -5 })
  expectStatus(await transition(payCheck, 'pay'), 409, 'PAYRUN-NET-NEGATIVE')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: payCheck.id })).status, 'APPROVED')

  // DD-13: التقارير من الدفتر واللقطات بنطاق المستخدم؛ المطابقة صفر فرق بعد عكس وترحيل وتعليق
  const report = expectStatus(await request(users.hr, 'GET', '/deductions/reports?fromPeriod=2026-07&toPeriod=2027-08'), 200)
  assert.ok(report.reconciliation.length >= 4)
  assert.deepEqual([...new Set(report.reconciliation.map(row => row.difference))], ['0.00'])
  assert.ok(report.reconciliation.some(row => row.runId === octoberRun.id && row.breakdownTyped === '100.00' && row.ledgerTyped === '100.00'))
  assert.ok(report.byType.some(row => row.typeCode === 'ADMIN_FIXED' && row.period === '2026-10' && row.collected === '100.00'))
  assert.ok(report.byType.some(row => row.typeCode === 'ADMIN_FIXED' && row.reversed === '60.00'))
  assert.ok(report.ledger.carried.some(row => row.obligationId === secondChild.id && row.carryDepth === 2))
  assert.ok(report.objections.some(row => row.response === 'المهمة في يوم آخر حسب نظام المهام'))
  assert.ok(report.cycleTime.some(row => row.role === 'HR' && row.acted > 0))
  assert.ok(report.byEmployee.some(row => row.employeeId === people.a1.id && row.last12.count >= 1))
  // تدقيق الأدوار D11: كان بلا أي صلاحية — المدير المباشر (طرف في خصومات فريقه) كان بيسحب مبالغها واعتراضاتها مجمّعة بلا reports.view
  for (const blocked of [users.outsider, users.manager, users.a1, users.viewer]) expectStatus(await request(blocked, 'GET', '/deductions/reports'), 403)
  // حامل البوابة من فرع تاني: التقرير يفتح ومافيهوش حاجة من فرع أ
  const otherBranchReport = expectStatus(await request(users.hrB, 'GET', '/deductions/reports?fromPeriod=2026-07&toPeriod=2027-08'), 200)
  assert.deepEqual([otherBranchReport.byType.length, otherBranchReport.reconciliation.length, otherBranchReport.objections.length, otherBranchReport.byEmployee.length], [0, 0, 0, 0])
})

test('Review S25 settings: deduction keys reject values above their maximum and closed choices outside their list', async () => {
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'deductions.reason_min_length', value: '5000' }), 400)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'deductions.bulk_max_employees', value: '5001' }), 400)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'deductions.sla_breach_action', value: 'NOPE' }), 400)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'deductions.bulk_max_employees', value: '5000' }), 200)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'deductions.bulk_max_employees', value: '500' }), 200)
})

// آخر اختبار: فحص المهلة يمر على كل الطلبات المعلقة في القاعدة المؤقتة
test('Review S25 DD-06 rule 1: a step past its SLA escalates to the next step, HR is never skipped and its breach is logged once; AUTO_REJECT rejects', async () => {
  const service = app.get(require('../src/payroll/typed-deductions.service').TypedDeductionsService)
  // 1.75 يوم (> يوم التصعيد) بقيمة لا تطابق طلبات a3 السابقة خلال نافذة التكرار
  const late = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '1.75', reason: `${REASON} — مهلة الاعتماد` }), employeeId: people.a3.id, targetPeriod: '2027-02' }), 201)
  assert.deepEqual(late.steps.map(step => step.role), ['DEPARTMENT_MANAGER', 'HR'])
  const hours = count => new Date(Date.now() + count * 3600000)
  await service.processSla(hours(47))
  assert.equal(expectStatus(await request(users.hr, 'GET', `/deductions/${late.id}`), 200).currentStepOrder, 1, 'within 48 hours nothing moves')
  assert.ok((await service.processSla(hours(49))).escalated >= 1)
  const escalated = expectStatus(await request(users.hr, 'GET', `/deductions/${late.id}`), 200)
  assert.deepEqual([escalated.currentStepOrder, escalated.steps[0].status], [2, 'SKIPPED'])
  assert.match(escalated.steps[0].note, /صُعِّد آليًا/)
  assert.ok(escalated.events.some(event => event.eventType === 'SLA_ESCALATED'))
  await service.processSla(hours(98))
  await service.processSla(hours(110))
  assert.equal((await repo('DeductionRequestEvent').find({ where: { requestId: late.id, eventType: 'SLA_BREACHED' } })).length, 1, 'the HR step is never skipped; its breach is logged once')
  assert.equal(expectStatus(await request(users.hr, 'GET', `/deductions/${late.id}`), 200).currentStepOrder, 2)
  await repo('RequestsConfig').save({ key: 'deductions.sla_breach_action', value: 'AUTO_REJECT' })
  try {
    const rejected = expectStatus(await request(users.manager, 'POST', '/deductions', { ...input({ inputValue: '0.75', reason: `${REASON} — رفض آلي بالمهلة`, confirmNotDuplicate: true }), employeeId: people.a3.id, targetPeriod: '2027-02' }), 201)
    await service.processSla(hours(49))
    const row = await repo('DeductionRequest').findOneByOrFail({ id: rejected.id })
    assert.deepEqual([row.status, row.decidedByUserId], ['REJECTED', null])
    assert.match(row.decisionReason, /رفض آلي/)
  } finally {
    await repo('RequestsConfig').save({ key: 'deductions.sla_breach_action', value: 'ESCALATE' })
  }
})
