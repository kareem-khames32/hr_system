// C4 / الخطوة 27: المكافأة الفردية ثم الجماعية من الأول للآخر على قاعدة SQL مؤقتة (hr_payroll_bonuses_test_<hex>):
// المستفيد المختار لا مقدم الطلب، لا مكافأة للنفس ولا لمن يعلو، المدير يقترح لمرؤوسيه، الفترة المستهدفة في مسير حقيقي،
// «معتمد — بانتظار الصرف» حتى الصرف، التصعيد والسقف، والقبول: مكافأة وخصم جماعيان لفريق مع استبعاد موظف.
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
const database = `hr_payroll_bonuses_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-bonuses-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, ds, master, base, created = false, sequence = 0
const org = {}, people = {}, users = {}, types = {}

const REASON = 'أداء متميز في تسليم مشروع الربع الثالث للعميل'
const DREASON = 'تأخر متكرر عن اجتماع التسليم الصباحي للفريق'
const incidentDate = new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-CA')
function assertDisposable() {
  assert.match(database, /^hr_payroll_bonuses_test_[a-f0-9]{16}$/)
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
const bonus = (overrides = {}) => ({ bonusTypeId: types.spot.id, inputValue: '250', reason: REASON, ...overrides })
async function employee(code, overrides = {}) {
  return repo('Employee').save({ employeeCode: code, fullName: `موظف ${code}`, branchId: org.branchA.id, departmentId: org.departmentA.id, teamId: null,
    managerEmployeeId: null, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, payMethod: 'cash', ...overrides })
}
async function exempt(emp) {
  // استثناء حضور معتمد يعزل الاختبار عن خصومات البصمة؛ المكافأة والخصم المصنف لا يتأثران به
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
    reason: 'استثناء حضور ثابت لعزل اختبار المكافآت', status: 'APPROVED', createdByUserId: users.admin.id, approvedByUserId: users.admin.id,
    approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: false, unpaidLeaveDeductibleOverride: true, requiresCheckinForPresence: false })
}
async function calc(period, emps) {
  return expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: emps.map(emp => emp.id),
    name: `مسير اختبار المكافآت ${++sequence}` }), 201)
}
const itemOf = (run, emp) => { const row = run.items.find(item => item.employeeId === emp.id); assert.ok(row, `item for ${emp.employeeCode}`); return row }
// الخطوة 22 (B5): الصرف يسجل قناته ومرجعه
const transition = (run, action, body, actor = users.admin) => request(actor, 'POST', `/payroll/runs/${run.id}/${action}`,
  action === 'pay' && body === undefined ? { channel: 'BANK_TRANSFER', reference: `BN-TEST-${run.id}` } : body)
// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية
async function approveRun(run, actor = users.admin) {
  const report = expectStatus(await request(actor, 'GET', `/payroll/runs/${run.id}/unassigned`), 200)
  expectStatus(await request(actor, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  return expectStatus(await transition(run, 'approve', undefined, actor), 201)
}
const revisionOf = async id => (await repo('BonusRequest').findOneByOrFail({ id })).revision

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
  org.branchA = await repo('Branch').save({ code: 'BN_A', name: 'فرع المكافآت الأول' })
  org.branchB = await repo('Branch').save({ code: 'BN_B', name: 'فرع المكافآت الثاني' })
  org.departmentA = await repo('Department').save({ branchId: org.branchA.id, name: 'قسم العمليات', code: 'BN_DA' })
  org.departmentB = await repo('Department').save({ branchId: org.branchB.id, name: 'قسم المبيعات', code: 'BN_DB' })
  org.teamA = await repo('Team').save({ departmentId: org.departmentA.id, name: 'فريق التسليم', code: 'BN_TA' })
  const user = (label, role, branchId, employeeId, permissions = []) => repo('User').save({ email: `${label}@payroll-bonuses.invalid`, displayName: label,
    passwordHash: 'test-only', role, branchId, employeeId, permissions: JSON.stringify(permissions) })
  users.admin = await user('admin', 'super_admin', null, null)
  // الهيكل: مدير الفرع ← مدير القسم ← المدير المباشر ← موظفو الفريق وموظف منفرد (قائد الفريق مستقل تحت مدير القسم)
  people.branchManager = await employee('BN_BM')
  people.departmentManager = await employee('BN_DM', { managerEmployeeId: people.branchManager.id })
  people.teamLeader = await employee('BN_TL', { managerEmployeeId: people.departmentManager.id })
  people.manager = await employee('BN_MG', { managerEmployeeId: people.departmentManager.id })
  people.a1 = await employee('BN_A1', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.a2 = await employee('BN_A2', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.a3 = await employee('BN_A3', { teamId: org.teamA.id, managerEmployeeId: people.manager.id })
  people.solo = await employee('BN_SOLO', { managerEmployeeId: people.manager.id })
  people.outsider = await employee('BN_OUT', { branchId: org.branchB.id, departmentId: org.departmentB.id })
  await repo('Department').update(org.departmentA.id, { managerEmployeeId: people.departmentManager.id })
  await repo('Department').update(org.departmentB.id, { managerEmployeeId: people.outsider.id })
  await repo('Team').update(org.teamA.id, { leaderEmployeeId: people.teamLeader.id })
  await repo('Branch').update(org.branchA.id, { managerEmployeeId: people.branchManager.id })
  for (const emp of [people.a1, people.a2, people.a3, people.solo]) await exempt(emp)
  const hrPermissions = ['bonuses.view', 'bonuses.approve', 'bonuses.manage', 'deductions.view', 'deductions.approve', 'deductions.manage',
    'payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay', 'payroll.reopen']
  users.hr = await user('hr-a', 'hr_manager', org.branchA.id, null, hrPermissions)
  users.hrB = await user('hr-b', 'hr_manager', org.branchB.id, null, hrPermissions)
  users.manager = await user('manager', 'employee', org.branchA.id, people.manager.id)
  users.teamLeader = await user('team-leader', 'employee', org.branchA.id, people.teamLeader.id)
  users.departmentManager = await user('department-manager', 'employee', org.branchA.id, people.departmentManager.id)
  users.outsider = await user('outsider', 'employee', org.branchB.id, people.outsider.id)
  users.a1 = await user('employee-a1', 'employee', org.branchA.id, people.a1.id)
  users.a3 = await user('employee-a3', 'employee', org.branchA.id, people.a3.id)
  users.solo = await user('employee-solo', 'employee', org.branchA.id, people.solo.id)
  // مُقترِح بأساس «الموارد البشرية» (bonuses.manage) وتجاوز السقف، من غير سلطة الموارد البشرية: اقتراحه يمشي في سلسلته.
  // قرار المالك 26 سبتمبر: اقتراح صاحب السلطة (hr_manager / مدير النظام) بيتعتمد لحظتها
  users.bonusDesk = await user('bonus-desk', 'employee', org.branchA.id, null, ['bonuses.view', 'bonuses.manage', 'bonuses.exceed_cap'])
  await app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp()
  await app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).catchUpIfBehind()
  // أنواع المكافآت والخصومات لكل الشركة: بتتضاف من حساب على مستوى الشركة، وموارد الفرع تشتغل عليها بس
  types.spot = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'SPOT', nameAr: 'مكافأة فورية', calcMethod: 'FIXED_AMOUNT' }), 201)
  types.performance = expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'PERFORMANCE', nameAr: 'مكافأة أداء', calcMethod: 'DAYS_OF_SALARY', defaultValue: '1' }), 201)
  types.commitment = expectStatus(await request(users.admin, 'POST', '/deductions/types', { code: 'COMMITMENT', nameAr: 'خصم التزام', category: 'DISCIPLINARY',
    calcMethod: 'DAYS_OF_SALARY', creatorScopes: ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: '1', escalationStep: 'DEPARTMENT_MANAGER' }), 201)
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
    assert.match(path.basename(uploads), /^hr-payroll-bonuses-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Bonuses fixture cleanup failed')
})

test('EX-05 catalog: only bonuses.manage writes types, defaults are the SRS defaults, a cap change bumps the version, and the manager sees only his subordinates', async () => {
  expectStatus(await request(users.manager, 'POST', '/bonuses/types', { code: 'NOPE', nameAr: 'غير مسموح', calcMethod: 'FIXED_AMOUNT' }), 403)
  // النوع لكل الشركة: موارد فرع (حتى بصلاحية bonuses.manage) تشوفه بس، لا تضيف ولا تعدّل
  expectStatus(await request(users.hr, 'POST', '/bonuses/types', { code: 'BRANCH_HR', nameAr: 'من حساب فرع', calcMethod: 'FIXED_AMOUNT' }), 403)
  expectStatus(await request(users.hr, 'PATCH', `/bonuses/types/${types.spot.id}`, { nameAr: 'تعديل من حساب فرع' }), 403)
  assert.equal((await repo('BonusType').findOneByOrFail({ id: types.spot.id })).nameAr, 'مكافأة فورية')
  expectStatus(await request(users.admin, 'POST', '/bonuses/types', { code: 'SPOT', nameAr: 'مكرر', calcMethod: 'FIXED_AMOUNT' }), 409, 'BONUS_TYPE_CODE_EXISTS')
  assert.deepEqual([types.spot.maxPctOfBase, types.spot.escalationDays, types.spot.escalationStep, types.spot.approvalSteps, types.spot.minAmount],
    ['100', '1', 'DEPARTMENT_MANAGER', ['HR'], '1'])
  const renamed = expectStatus(await request(users.admin, 'PATCH', `/bonuses/types/${types.spot.id}`, { nameAr: 'مكافأة فورية للإنجاز' }), 200)
  assert.equal(renamed.version, types.spot.version, 'a label change keeps the version')
  const capped = expectStatus(await request(users.admin, 'PATCH', `/bonuses/types/${types.spot.id}`, { maxPctOfBase: '90' }), 200)
  assert.equal(capped.version, types.spot.version + 1)
  types.spot = expectStatus(await request(users.admin, 'PATCH', `/bonuses/types/${types.spot.id}`, { maxPctOfBase: '100', nameAr: 'مكافأة فورية' }), 200)
  const creatable = expectStatus(await request(users.manager, 'GET', '/bonuses/creatable'), 200)
  assert.deepEqual([creatable.bases, creatable.canExceedCap, creatable.types.map(row => row.code).sort()], [['DIRECT_MANAGER'], false, ['PERFORMANCE', 'SPOT']])
  assert.deepEqual(expectStatus(await request(users.solo, 'GET', '/bonuses/creatable'), 200).types, [], 'an employee without subordinates proposes nothing')
  // تدقيق الأدوار D9: الكتالوج الكامل (القيم والسقوف وسلاسل الاعتماد) لحامل bonuses.manage بس — كان مفتوحًا لأي حساب.
  // المدير العادي (بلا أي صلاحية) يفضل شايف أنواعه وموظفيه من creatable/candidates، وده اللي نموذج طلب المكافأة بيستخدمه.
  for (const blocked of [users.manager, users.solo, users.outsider]) expectStatus(await request(blocked, 'GET', '/bonuses/types'), 403)
  expectStatus(await request(users.manager, 'GET', '/bonuses/types?includeInactive=true'), 403)
  assert.ok(expectStatus(await request(users.hr, 'GET', '/bonuses/types'), 200).some(row => row.code === 'SPOT'))
  assert.ok(creatable.types.some(row => row.id === types.spot.id && row.calcMethod === 'FIXED_AMOUNT'), 'نموذج الطلب بياخد النوع بقواعده من creatable')
  const candidates = expectStatus(await request(users.manager, 'GET', `/bonuses/candidates?typeId=${types.spot.id}`), 200)
  assert.deepEqual(candidates.map(row => row.id).sort((a, b) => a - b), [people.a1.id, people.a2.id, people.a3.id, people.solo.id].sort((a, b) => a - b))
})

test('Step 27 individual (review ⑧): a manager proposes for his subordinate — the entry is recorded for the chosen employee, not the proposer; no self-bonus; target period; «معتمد — بانتظار الصرف» until the run is paid', async () => {
  const proposed = expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus(), employeeId: people.solo.id, targetPeriod: '2026-08' }), 201)
  assert.deepEqual([proposed.status, proposed.statusLabel, proposed.creator.basis, proposed.estimatedAmount, proposed.escalated, proposed.employee.id],
    ['IN_APPROVAL', 'قيد الاعتماد', 'DIRECT_MANAGER', '250.00', false, people.solo.id])
  assert.deepEqual(proposed.steps.map(step => [step.role, step.status]), [['HR', 'PENDING']])
  // يظهر للموظف من لحظة الاقتراح؛ والمُقترِح نفسه لا مكافأة له
  const mine = expectStatus(await request(users.solo, 'GET', '/bonuses/mine'), 200)
  assert.deepEqual(mine.map(row => [row.id, row.status, row.statusLabel, row.amount, row.issuer.basisLabel]), [[proposed.id, 'IN_APPROVAL', 'قيد الاعتماد', '250.00', 'المدير المباشر']])
  assert.deepEqual(expectStatus(await request(users.manager, 'GET', '/bonuses/mine'), 200), [])
  // لا مكافأة للنفس، ولا لمن يعلو، ولا خارج النطاق، ولا من موظف بلا مرؤوسين
  expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus(), employeeId: people.manager.id, targetPeriod: '2026-08' }), 403, 'BONUS_SELF')
  expectStatus(await request(users.departmentManager, 'POST', '/bonuses', { ...bonus(), employeeId: people.branchManager.id, targetPeriod: '2026-08' }), 403, 'BONUS_SUPERIOR')
  expectStatus(await request(users.outsider, 'POST', '/bonuses', { ...bonus(), employeeId: people.solo.id, targetPeriod: '2026-08' }), 403, 'BONUS_OUT_OF_SCOPE')
  expectStatus(await request(users.solo, 'POST', '/bonuses', { ...bonus(), employeeId: people.a1.id, targetPeriod: '2026-08' }), 403, 'BONUS_OUT_OF_SCOPE')
  expectStatus(await request(users.solo, 'POST', '/bonuses', { ...bonus(), employeeId: people.solo.id, targetPeriod: '2026-08' }), 403, 'BONUS_SELF')
  expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus({ reason: 'سبب قصير' }), employeeId: people.solo.id, targetPeriod: '2026-08' }), 400, 'BONUS_REASON_TOO_SHORT')
  expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus(), employeeId: people.solo.id, targetPeriod: '2026-08' }), 409, 'BONUS_DUPLICATE')
  // الاعتماد: لا المُقترِح ولا المستفيد ولا موارد بشرية فرع آخر؛ النسخة القديمة ترفض
  expectStatus(await request(users.manager, 'POST', `/bonuses/${proposed.id}/approve`, { expectedRevision: 0 }), 403, 'BONUS_NOT_CURRENT_APPROVER')
  expectStatus(await request(users.solo, 'POST', `/bonuses/${proposed.id}/approve`, { expectedRevision: 0 }), 403, 'BONUS_NOT_CURRENT_APPROVER')
  // تدقيق الأدوار D6 (نفس قاعدة الخصومات): اللي مالوش صفة على الطلب بياخد نفس رد الطلب الغايب بالحرف — في العرض وفي كل إجراء
  expectStatus(await request(users.hrB, 'POST', `/bonuses/${proposed.id}/approve`, { expectedRevision: 0 }), 404, 'BONUS_NOT_FOUND')
  const missing = await request(users.outsider, 'GET', '/bonuses/99999999')
  expectStatus(missing, 404, 'BONUS_NOT_FOUND')
  for (const stranger of [users.outsider, users.hrB, users.solo]) {
    const real = await request(stranger, 'GET', `/bonuses/${proposed.id}`)
    assert.deepEqual([real.status, real.body], [missing.status, missing.body], `${stranger.email}: موجود خارج النطاق = غايب`)
  }
  for (const action of ['approve', 'reject', 'withdraw', 'cancel', 'reverse']) {
    const body = { expectedRevision: 77, reason: 'محاولة من حساب بلا أي صفة على الطلب' }
    const stranger = ['cancel', 'reverse'].includes(action) ? users.hrB : users.outsider
    const onReal = await request(stranger, 'POST', `/bonuses/${proposed.id}/${action}`, body)
    const onMissing = await request(stranger, 'POST', `/bonuses/99999999/${action}`, body)
    assert.deepEqual([onReal.status, onReal.body], [onMissing.status, onMissing.body], `${action}: موجود خارج النطاق = غايب`)
    assert.deepEqual([onReal.status, onReal.body.code], [404, 'BONUS_NOT_FOUND'], action)
  }
  assert.deepEqual([(await repo('BonusRequest').findOneByOrFail({ id: proposed.id })).status, (await repo('BonusRequest').findOneByOrFail({ id: proposed.id })).revision], ['IN_APPROVAL', 0])
  expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/approve`, { expectedRevision: 3 }), 409, 'BONUS_REVISION_CHANGED')
  const approved = expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/approve`, { expectedRevision: 0, reason: 'موثق بتقرير العميل' }), 201)
  assert.deepEqual([approved.status, approved.statusLabel, approved.finalAmount, approved.payout.state], ['APPROVED', 'معتمد — بانتظار الصرف', '250.00', 'AWAITING_PAYROLL'])
  const [credit] = approved.obligations
  assert.deepEqual([credit.type, credit.category, credit.amount, credit.status, credit.targetPeriod, credit.effectiveDate], ['CREDIT', 'bonus', '250.00', 'PENDING', '2026-08', '2026-08-01'])
  const ledgerRow = await repo('EmployeeObligation').findOneByOrFail({ id: credit.id })
  assert.equal(ledgerRow.employeeId, people.solo.id, 'the ledger entry belongs to the chosen employee, not to the proposer')
  assert.notEqual(ledgerRow.employeeId, people.manager.id)
  assert.equal(ledgerRow.bonusRequestId, proposed.id)
  assert.deepEqual(approved.events.map(event => event.eventType), ['SUBMITTED', 'STEP_APPROVED', 'APPROVED'])
  // الفترة المستهدفة: مسير يوليو لا يأخذها، ومسير أغسطس يضيفها
  const july = await calc('2026-07', [people.solo])
  assert.equal(Number(itemOf(july, people.solo).otherAdditions), 0)
  assert.deepEqual(JSON.parse(itemOf(july, people.solo).breakdown).obligationIds, [])
  const august = await calc('2026-08', [people.solo])
  const augustItem = itemOf(august, people.solo)
  assert.deepEqual([Number(augustItem.otherAdditions), Number(augustItem.netPay)], [250, 9250])
  // الحجز عند اعتماد المسير: «محجوز» ولا إلغاء؛ الصرف يستهلك مرة واحدة ثم «مصروف»
  await approveRun(august)
  const reserved =expectStatus(await request(users.hr, 'GET', `/bonuses/${proposed.id}`), 200)
  assert.deepEqual([reserved.payout.state, reserved.capabilities.canCancel], ['RESERVED', false])
  assert.match(reserved.statusLabel, /محجوز/)
  expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/cancel`, { expectedRevision: reserved.revision, reason: 'محاولة إلغاء بعد اعتماد المسير الحاجز' }), 409, 'BONUS_RESERVED')
  expectStatus(await transition(august, 'pay'), 201)
  const paidMine = expectStatus(await request(users.solo, 'GET', '/bonuses/mine'), 200)
  assert.deepEqual([paidMine[0].statusLabel, paidMine[0].payout.state, paidMine[0].paidAmount], ['مصروف في مسير 2026-08', 'PAID', '250.00'])
  expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/cancel`, { expectedRevision: reserved.revision, reason: 'محاولة إلغاء مكافأة مصروفة في مسير' }), 409, 'BONUS_CONSUMED')
  expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus({ inputValue: '100' }), employeeId: people.solo.id, targetPeriod: '2026-08' }), 400, 'BONUS_PERIOD_CLOSED')
  // القسيمة: سطر المكافأة بنوعها وسببها ورقم طلبها
  const payslip = expectStatus(await request(users.solo, 'GET', `/payroll/items/${augustItem.id}`), 200)
  const line = payslip.obligationDetails.find(row => row.obligationId === credit.id)
  assert.deepEqual([line.type, line.categoryLabel, line.collected, line.bonus.requestId, line.bonus.typeName, line.bonus.reason], ['CREDIT', 'مكافأة', '250.00', proposed.id, 'مكافأة فورية', REASON])
  // العكس بعد الصرف (DD-12): قيد استرداد في مسير لاحق؛ المسير المصروف لا يتغير
  const paidDetail = expectStatus(await request(users.hr, 'GET', `/bonuses/${proposed.id}`), 200)
  assert.equal(paidDetail.capabilities.canReverse, true)
  expectStatus(await request(users.manager, 'POST', `/bonuses/${proposed.id}/reverse`, { expectedRevision: paidDetail.revision, reason: 'مدير مباشر لا يملك عكس المكافأة المصروفة' }), 403)
  const over = expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/reverse`, { expectedRevision: paidDetail.revision, reason: 'عكس أكبر من المصروف الفعلي للمكافأة', amount: '300' }), 400, 'BONUS_REVERSAL_ABOVE_PAID')
  assert.equal(over.limit, '250.00')
  const reversed = expectStatus(await request(users.hr, 'POST', `/bonuses/${proposed.id}/reverse`, { expectedRevision: paidDetail.revision, reason: 'ثبت أن جزءًا من الإنجاز محسوب لفريق آخر', amount: '100' }), 201)
  const reversal = reversed.obligations.find(row => row.reversal)
  assert.deepEqual([reversed.reversedAmount, reversal.type, reversal.category, reversal.amount, reversal.status], ['100.00', 'DEBIT', 'bonus_reversal', '100.00', 'PENDING'])
  assert.equal(Number((await repo('PayrollItem').findOneByOrFail({ id: augustItem.id })).netPay), 9250, 'the paid run is untouched')
})

test('EX-05 rules 1 and 2: above one day of salary escalates to the higher manager before HR; 9,500 on base 9,000 needs bonuses.exceed_cap; HR adjusts within limits', async () => {
  const escalated = expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus({ bonusTypeId: types.performance.id, inputValue: '2' }), employeeId: people.a2.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual([escalated.estimatedAmount, escalated.escalated], ['600.00', true])
  assert.deepEqual(escalated.steps.map(step => [step.role, step.status, step.escalation, step.approverEmployeeId]),
    [['DEPARTMENT_MANAGER', 'PENDING', true, people.departmentManager.id], ['HR', 'PENDING', false, null]])
  expectStatus(await request(users.hr, 'POST', `/bonuses/${escalated.id}/approve`, { expectedRevision: 0 }), 403, 'BONUS_NOT_CURRENT_APPROVER')
  const first = expectStatus(await request(users.departmentManager, 'POST', `/bonuses/${escalated.id}/approve`, { expectedRevision: 0 }), 201)
  assert.deepEqual([first.status, first.currentStepOrder], ['IN_APPROVAL', 2])
  expectStatus(await request(users.hr, 'POST', `/bonuses/${escalated.id}/approve`, { expectedRevision: 1, adjustedAmount: '500' }), 400, 'BONUS_ADJUST_REASON_REQUIRED')
  const adjusted = expectStatus(await request(users.hr, 'POST', `/bonuses/${escalated.id}/approve`, { expectedRevision: 1, adjustedAmount: '500', reason: 'تخفيض بعد مراجعة لجنة المكافآت' }), 201)
  assert.deepEqual([adjusted.status, adjusted.finalAmount, adjusted.steps[1].adjustedFrom, adjusted.steps[1].adjustedTo, adjusted.obligations[0].amount],
    ['APPROVED', '500.00', '600.00', '500.00', '500.00'])
  // مدير القسم مُقترِحًا: خطوة التصعيد التي هو معتمدها تُتخطى بسبب مسجل
  const byDepartment = expectStatus(await request(users.departmentManager, 'POST', '/bonuses', { ...bonus({ bonusTypeId: types.performance.id, inputValue: '2' }), employeeId: people.a3.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual(byDepartment.steps.map(step => [step.role, step.status, step.note]), [['DEPARTMENT_MANAGER', 'SKIPPED', 'تُخطّي: المعتمِد هو المُنزِّل'], ['HR', 'PENDING', null]])
  assert.equal(byDepartment.creator.basis, 'DEPARTMENT_MANAGER')
  // السقف 100% من الأساسي
  const over = expectStatus(await request(users.manager, 'POST', '/bonuses', { ...bonus({ inputValue: '9500' }), employeeId: people.a3.id, targetPeriod: '2026-12' }), 400, 'BONUS_ABOVE_CAP')
  assert.equal(over.limit, '9000.00')
  expectStatus(await request(users.hr, 'POST', '/bonuses', { ...bonus({ inputValue: '9500' }), employeeId: people.a3.id, targetPeriod: '2026-12' }), 400, 'BONUS_ABOVE_CAP')
  const capped = expectStatus(await request(users.bonusDesk, 'POST', '/bonuses', { ...bonus({ inputValue: '9500' }), employeeId: people.a3.id, targetPeriod: '2026-12' }), 201)
  assert.deepEqual([capped.capExceeded, capped.creator.basis, capped.overrides.capOverride, capped.steps.map(step => step.role)], [true, 'HR', true, ['DEPARTMENT_MANAGER', 'HR']])
  assert.equal(capped.status, 'IN_APPROVAL', 'a proposer without HR authority keeps the chain')
  expectStatus(await request(users.bonusDesk, 'POST', `/bonuses/${capped.id}/approve`, { expectedRevision: 0 }), 403, 'BONUS_NOT_CURRENT_APPROVER')
  expectStatus(await request(users.departmentManager, 'POST', `/bonuses/${capped.id}/approve`, { expectedRevision: 0 }), 201)
  const cappedApproved = expectStatus(await request(users.hr, 'POST', `/bonuses/${capped.id}/approve`, { expectedRevision: 1 }), 201)
  assert.equal(cappedApproved.status, 'APPROVED', 'the cap override recorded at proposal carries through approval')
  // الإلغاء بسبب موثق قبل الصرف يلغي القيد
  expectStatus(await request(users.manager, 'POST', `/bonuses/${capped.id}/cancel`, { expectedRevision: cappedApproved.revision, reason: 'مدير مباشر لا يملك إلغاء المكافأة' }), 403)
  expectStatus(await request(users.hr, 'POST', `/bonuses/${capped.id}/cancel`, { expectedRevision: cappedApproved.revision, reason: 'قصير' }), 400, 'BONUS_REASON_TOO_SHORT')
  const cancelled = expectStatus(await request(users.hr, 'POST', `/bonuses/${capped.id}/cancel`, { expectedRevision: cappedApproved.revision, reason: 'تبين أن المكافأة الاستثنائية تحتاج قرار لجنة' }), 201)
  assert.deepEqual([cancelled.status, cancelled.obligations[0].status], ['CANCELLED', 'CANCELLED'])
  assert.equal(expectStatus(await request(users.departmentManager, 'POST', `/bonuses/${byDepartment.id}/withdraw`, { expectedRevision: 0 }), 201).status, 'WITHDRAWN')
  // الموظف يرى المرفوض/الملغى بحالته بلا ملاحظات المعتمدين الداخلية
  const a3Mine = expectStatus(await request(users.a3, 'GET', '/bonuses/mine'), 200)
  assert.deepEqual(a3Mine.map(row => row.status).sort(), ['CANCELLED', 'WITHDRAWN'])
})

test('Owner 26-Sep: a bonus HR proposes is approved at once through every step of its captured chain — the same ledger entry, events and final state as a full manual approval; a bulk one too', async () => {
  // موظف مخصص للاختبار (اختبار القبول بعده يعدّ مكافآت a1 وa2 بالحرف)
  const target = await employee('BN_HRF', { managerEmployeeId: people.manager.id })
  const instant = expectStatus(await request(users.hr, 'POST', '/bonuses', { ...bonus({ bonusTypeId: types.performance.id, inputValue: '2', reason: `${REASON} — قرار الموارد البشرية` }),
    employeeId: target.id, targetPeriod: '2027-01' }), 201)
  const note = 'اعتماد فوري — مدير الموارد البشرية'
  assert.deepEqual([instant.status, instant.statusLabel, instant.finalAmount, instant.escalated, instant.creator.basis, instant.decidedByUserId],
    ['APPROVED', 'معتمد — بانتظار الصرف', '600.00', true, 'HR', users.hr.id])
  assert.deepEqual(instant.steps.map(step => [step.role, step.status, step.actedByUserId, step.reason]),
    [['DEPARTMENT_MANAGER', 'APPROVED', users.hr.id, note], ['HR', 'APPROVED', users.hr.id, note]])
  assert.deepEqual(instant.events.map(event => event.eventType), ['SUBMITTED', 'STEP_APPROVED', 'STEP_APPROVED', 'APPROVED'])
  assert.ok(instant.events.filter(event => event.eventType !== 'SUBMITTED').every(event => event.actorUserId === users.hr.id && event.payload.instant === true))
  assert.deepEqual(instant.amountTrace.approvals.map(row => [row.stepOrder, row.amount]), [[1, '600.00'], [2, '600.00']])
  assert.equal(instant.revision, 2, 'one revision per approved step, as after two manual approvals')
  const [credit] = instant.obligations
  assert.deepEqual([credit.type, credit.category, credit.amount, credit.status, credit.targetPeriod, credit.effectiveDate], ['CREDIT', 'bonus', '600.00', 'PENDING', '2027-01', '2027-01-01'])
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: credit.id })).employeeId, target.id)
  expectStatus(await request(users.departmentManager, 'POST', `/bonuses/${instant.id}/approve`, { expectedRevision: 2 }), 409, 'BONUS_STATE')
  // الدفعة من الموارد البشرية: كل طلب منشأ معتمد لحظتها بقيده
  const body = { ...bonus({ inputValue: '150', reason: `${REASON} — دفعة الموارد البشرية` }), targetPeriod: '2027-01', selection: { mode: 'EMPLOYEES', ids: [target.id], excludeEmployeeIds: [] } }
  const preview = expectStatus(await request(users.hr, 'POST', '/bonuses/preview', body), 201)
  const batch = expectStatus(await request(users.hr, 'POST', '/bonuses/bulk', { ...body, previewHash: preview.previewHash }), 201)
  assert.deepEqual(batch.created.map(row => [row.employeeId, row.status]), [[target.id, 'APPROVED']])
  const bulkRow = expectStatus(await request(users.hr, 'GET', `/bonuses/${batch.created[0].requestId}`), 200)
  assert.deepEqual([bulkRow.status, bulkRow.obligations.map(row => row.amount)], ['APPROVED', ['150.00']])
  for (const id of [instant.id, bulkRow.id]) {
    expectStatus(await request(users.hr, 'POST', `/bonuses/${id}/cancel`, { expectedRevision: await revisionOf(id), reason: 'إلغاء طلب فحص الاعتماد الفوري للمكافأة' }), 201)
  }
})

test('Owner 26-Sep: HR decides a legacy pending bonus it proposed before the decision; the beneficiary never approves his own', async () => {
  // مكافأة اقترحتها الموارد البشرية قبل القرار ووقفت في سلسلتها: تُدرج مباشرة، ثم تعتمدها الموارد البشرية بنفسها الآن
  const legacy = await repo('BonusRequest').save({ batchId: null, employeeId: people.solo.id, bonusTypeId: types.spot.id, typeVersion: types.spot.version,
    typeSnapshot: JSON.stringify({ id: types.spot.id, version: types.spot.version, ...types.spot }), calcMethod: 'FIXED_AMOUNT', inputValue: '120', estimatedAmount: 120,
    finalAmount: null, amountTrace: '{}', reason: `${REASON} — مكافأة قديمة`, attachmentRef: null, targetPeriod: '2027-02', status: 'IN_APPROVAL',
    creatorUserId: users.hr.id, creatorEmployeeId: null, scopeBasis: 'HR', scopeSnapshot: '{}', escalated: false, capExceeded: false, outOfScope: false,
    steps: JSON.stringify([{ order: 1, role: 'HR', approverEmployeeId: null, status: 'PENDING', note: null, escalation: false, actedByUserId: null, actedAt: null, reason: null, adjustedFrom: null, adjustedTo: null }]),
    overrides: '{}', obligationId: null, decisionReason: null, decidedByUserId: null, decidedAt: null, revision: 0, updatedAt: null })
  expectStatus(await request(users.solo, 'POST', `/bonuses/${legacy.id}/approve`, { expectedRevision: 0 }), 403, 'BONUS_NOT_CURRENT_APPROVER')
  const decided = expectStatus(await request(users.hr, 'POST', `/bonuses/${legacy.id}/approve`, { expectedRevision: 0, reason: 'قرار الموارد البشرية' }), 201)
  assert.deepEqual([decided.status, decided.decidedByUserId, decided.obligations[0].amount], ['APPROVED', users.hr.id, '120.00'])
  expectStatus(await request(users.hr, 'POST', `/bonuses/${legacy.id}/cancel`, { expectedRevision: decided.revision, reason: 'إلغاء طلب فحص المكافأة القديمة الواقفة' }), 201)
})

test('Acceptance (step 27): a bulk bonus and a bulk deduction for a team with one employee excluded — preview, stale hash, independent requests, and a paid run where the excluded employee has neither', async () => {
  const selection = { mode: 'TEAM', ids: [org.teamA.id], excludeEmployeeIds: [people.a3.id] }
  const bonusBody = { ...bonus({ inputValue: '200', reason: `${REASON} — تعميم الفريق` }), targetPeriod: '2026-10', selection }
  const preview = expectStatus(await request(users.teamLeader, 'POST', '/bonuses/preview', bonusBody), 201)
  assert.deepEqual(preview.rows.map(row => [row.employeeId, row.status]), [[people.a1.id, 'READY'], [people.a2.id, 'READY'], [people.a3.id, 'EXCLUDED']])
  assert.deepEqual(preview.rows.filter(row => row.status === 'READY').map(row => [row.amount, row.basis]), [['200.00', 'TEAM_LEADER'], ['200.00', 'TEAM_LEADER']])
  assert.deepEqual([preview.totals.ready, preview.totals.excluded, preview.totals.totalAmount], [2, 1, '400.00'])
  const stale = expectStatus(await request(users.teamLeader, 'POST', '/bonuses/bulk', { ...bonusBody, previewHash: '0'.repeat(64) }), 409, 'BONUS_PREVIEW_STALE')
  assert.equal(stale.preview.previewHash, preview.previewHash)
  expectStatus(await request(users.teamLeader, 'POST', '/bonuses/bulk', { ...bonusBody, selection: { ...selection, excludeEmployeeIds: [] }, previewHash: preview.previewHash }), 409, 'BONUS_PREVIEW_STALE')
  const bonusBatch = expectStatus(await request(users.teamLeader, 'POST', '/bonuses/bulk', { ...bonusBody, previewHash: preview.previewHash }), 201)
  assert.deepEqual(bonusBatch.created.map(row => [row.employeeId, row.amount]), [[people.a1.id, '200.00'], [people.a2.id, '200.00']])
  assert.deepEqual(bonusBatch.skipped.map(row => [row.employeeId, row.status]), [[people.a3.id, 'EXCLUDED']])
  const bonusRows = await repo('BonusRequest').find({ where: { batchId: bonusBatch.batchId }, order: { id: 'ASC' } })
  assert.deepEqual(bonusRows.map(row => [row.employeeId, row.scopeBasis, row.status]), [[people.a1.id, 'TEAM_LEADER', 'IN_APPROVAL'], [people.a2.id, 'TEAM_LEADER', 'IN_APPROVAL']])
  const storedBatch = await repo('BonusBatch').findOneByOrFail({ id: bonusBatch.batchId })
  assert.deepEqual([storedBatch.createdCount, storedBatch.skippedCount, storedBatch.selectionMode], [2, 1, 'TEAM'])

  const deductionBody = { deductionTypeId: types.commitment.id, inputValue: '0.5', incidentDate, reason: DREASON, targetPeriod: '2026-10', selection }
  const deductionPreview = expectStatus(await request(users.teamLeader, 'POST', '/deductions/preview', deductionBody), 201)
  assert.deepEqual(deductionPreview.rows.map(row => [row.employeeId, row.status, row.amount]), [[people.a1.id, 'READY', '150.00'], [people.a2.id, 'READY', '150.00'], [people.a3.id, 'EXCLUDED', null]])
  const deductionBatch = expectStatus(await request(users.teamLeader, 'POST', '/deductions/bulk', { ...deductionBody, previewHash: deductionPreview.previewHash }), 201)
  assert.deepEqual(deductionBatch.created.map(row => row.employeeId), [people.a1.id, people.a2.id])
  assert.deepEqual(deductionBatch.skipped.map(row => [row.employeeId, row.status]), [[people.a3.id, 'EXCLUDED']])

  // الموارد البشرية: كل طلب مستقل بقراره
  const pendingBonuses = expectStatus(await request(users.hr, 'GET', `/bonuses?view=pending_me&batchId=${bonusBatch.batchId}`), 200)
  assert.deepEqual(pendingBonuses.map(row => row.employee.id).sort((a, b) => a - b), [people.a1.id, people.a2.id].sort((a, b) => a - b))
  for (const row of pendingBonuses) assert.equal(expectStatus(await request(users.hr, 'POST', `/bonuses/${row.id}/approve`, { expectedRevision: row.revision }), 201).status, 'APPROVED')
  const pendingDeductions = expectStatus(await request(users.hr, 'GET', `/deductions?view=pending_me&batchId=${deductionBatch.batchId}`), 200)
  assert.equal(pendingDeductions.length, 2)
  for (const row of pendingDeductions) assert.equal(expectStatus(await request(users.hr, 'POST', `/deductions/${row.id}/approve`, { expectedRevision: row.revision }), 201).status, 'APPROVED')

  // مسير أكتوبر الحقيقي: a1 وa2 مكافأة 200 وخصم 150، والمستبعد a3 لا مكافأة ولا خصم
  const october = await calc('2026-10', [people.a1, people.a2, people.a3])
  for (const emp of [people.a1, people.a2]) {
    const item = itemOf(october, emp)
    assert.deepEqual([Number(item.otherAdditions), Number(item.otherDeductions), Number(item.netPay)], [200, 150, 9050], emp.employeeCode)
  }
  const excludedItem = itemOf(october, people.a3)
  assert.deepEqual([Number(excludedItem.otherAdditions), Number(excludedItem.otherDeductions), Number(excludedItem.netPay)], [0, 0, 9000])
  assert.deepEqual(JSON.parse(excludedItem.breakdown).obligationIds, [])
  assert.equal(await repo('BonusRequest').count({ where: { batchId: bonusBatch.batchId, employeeId: people.a3.id } }), 0)
  assert.equal(await repo('DeductionRequest').count({ where: { batchId: deductionBatch.batchId, employeeId: people.a3.id } }), 0)
  // مكافأة a2 المعتمدة لشهر ديسمبر لا تدخل أكتوبر
  assert.ok(!JSON.parse(itemOf(october, people.a2).breakdown).obligationLines.some(row => row.amount === 500))
  await approveRun(october)
  expectStatus(await transition(october, 'pay'), 201)
  const a1Mine = expectStatus(await request(users.a1, 'GET', '/bonuses/mine'), 200)
  assert.deepEqual(a1Mine.map(row => [row.statusLabel, row.amount]), [['مصروف في مسير 2026-10', '200.00']])
  assert.deepEqual((await request(users.a3, 'GET', '/bonuses/mine')).body.filter(row => row.targetPeriod === '2026-10'), [])
})

test('Scope, settings and closed legacy routes: previews never reveal staff outside scope, bonuses.* keys validate, direct bonus credits and legacy BONUS requests are refused', async () => {
  const body = sel => ({ ...bonus({ reason: `${REASON} — فحص النطاق` }), targetPeriod: '2026-11', selection: sel })
  const hidden = expectStatus(await request(users.outsider, 'POST', '/bonuses/preview', body({ mode: 'BRANCH', ids: [org.branchA.id] })), 201)
  assert.deepEqual([hidden.rows.length, hidden.totals.candidates, hidden.totals.ready], [0, 0, 0])
  expectStatus(await request(users.outsider, 'POST', '/bonuses/bulk', { ...body({ mode: 'BRANCH', ids: [org.branchA.id] }), previewHash: hidden.previewHash }), 400, 'BONUS_BULK_EMPTY')
  const byIds = expectStatus(await request(users.outsider, 'POST', '/bonuses/preview', body({ mode: 'EMPLOYEES', ids: [people.a1.id, 99999999] })), 201)
  assert.deepEqual(byIds.rows.map(row => [row.status, row.fullName, row.employeeCode]), [['BONUS_OUT_OF_SCOPE', null, null], ['BONUS_OUT_OF_SCOPE', null, null]])
  await repo('RequestsConfig').save({ key: 'bonuses.bulk_max_employees', value: '1' })
  try {
    expectStatus(await request(users.teamLeader, 'POST', '/bonuses/preview', body({ mode: 'TEAM', ids: [org.teamA.id] })), 400, 'BONUS_BULK_LIMIT')
  } finally {
    await repo('RequestsConfig').save({ key: 'bonuses.bulk_max_employees', value: '500' })
  }
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'bonuses.reason_min_length', value: '5000' }), 400)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'bonuses.missing_approver_fallback', value: 'NOPE' }), 400)
  expectStatus(await request(users.admin, 'PATCH', '/settings/config', { key: 'bonuses.bulk_max_employees', value: '500' }), 200)
  // قيد مكافأة مباشر في الدفتر مقفل
  expectStatus(await request(users.admin, 'POST', '/obligations', { employeeId: people.solo.id, type: 'CREDIT', category: 'bonus', amount: 50, label: 'مكافأة مباشرة ممنوعة' }), 403, 'OBLIGATION_DIRECT_BONUS_LOCKED')
  // طلب BONUS عبر محرك الطلبات مقفل (كان يُقيد لمقدم الطلب ويسمح بمكافأة للنفس)
  const chain = await repo('ApprovalChain').save({ code: 'CH_BONUS_TEST', nameAr: 'سلسلة المكافأة القديمة', isActive: true, autoApprove: false })
  await repo('ApprovalStep').save({ chainId: chain.id, stepOrder: 1, approverRole: 'hr' })
  await repo('RequestType').save({ code: 'BONUS', nameAr: 'مكافأة/حافز', category: 'financial', destinationHandler: 'payroll_bonus', approvalChainId: chain.id, isActive: true, requiredFields: '[]' })
  expectStatus(await request(users.solo, 'POST', '/requests', { typeCode: 'BONUS', submit: true, payload: { amount: 500, reason: 'مكافأة ذاتية عبر المحرك القديم' } }), 400, 'BONUS_MODULE_REQUIRED')
  // اعتماد طلب قديم معلق: القيد للمستفيد المختار وبفترة، لا لمقدم الطلب
  const handler = app.get(require('../src/requests/destinations.service').DestinationsService).handlers.payroll_bonus
  const requestId = 900000 + sequence++
  await ds.transaction(em => handler(em, { id: requestId, requesterId: people.manager.id, branchId: org.branchA.id }, null, { employeeId: people.solo.id, amount: 75, reason: 'طلب قديم معلق' }))
  const legacy = await repo('EmployeeObligation').findOneByOrFail({ sourceRequestId: requestId })
  assert.deepEqual([legacy.employeeId, legacy.type, legacy.category, /^\d{4}-\d{2}$/.test(legacy.targetPeriod), !!legacy.effectiveDate], [people.solo.id, 'CREDIT', 'bonus', true, true])
  await repo('EmployeeObligation').update(legacy.id, { status: 'CANCELLED' })
})
