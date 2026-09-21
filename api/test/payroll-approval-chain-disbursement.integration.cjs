// قرار المالك (22 سبتمبر) على قاعدة SQL مؤقتة معزولة (synchronize) تُحذف في النهاية — HTTP وSQL فعليان:
// (أ) سلسلة اعتماد المسير: سلسلة الشركة + سلسلة خاصة بمسير دائم، 4 خطوات بأسماء أشخاص من الحساب لظهور القسيمة، الرفض بسبب في نص السلسلة،
//     إعادة الحساب وإعادة الفتح بيصفّروا التقدم، من احتسب مرفوض في كل خطوة، الغريب مرفوض، خطوة بالدور، محدش بيعتمد خطوتين، وبلا سلسلة = السلوك القديم بالحرف.
// (ب) صرف المسير موظف بموظف: علامة واحدة وجماعية بالفلاتر، موظف التصفية لا يُعلَّم، حامل payroll.disburse مرفوض في كل كتابة رواتب أخرى،
//     و«إقفال الصرف» = pay() بآثاره (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط.
// (ج) القسيمة: رقم موجود خارج النطاق = نفس رد الرقم المفقود بالحرف.
// التوكنات موقّعة محليًا بسر عشوائي وبمصفوفات صلاحيات صريحة — لا كلمات مرور ولا أسرار، ولا اتصال بقاعدة الشركة.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_chain_disburse_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-chain-disburse-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const cycle23 = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null }
const PERIOD = '2026-08', FROM = '2026-07-23', TO = '2026-08-22', NEXT = '2026-09'
const SERIES = 'مسير فرع المعادي'
let app, master, ds, base, created = false, employeeNumber = 0, policyVersionId
let branchA, branchB, branchC, branchD, deptA1, deptA2, teamA1
let admin, calc, calcRev, approver, approverB, rev1, rev2, rev3, ceo, fin1, fin2, stranger, disburser, viewerB, chainA, e1User
let e1, e2, e3, eOT, leaver, b1, c1, d1, overtimeEntry, installment
let runA, runNext

function assertDisposable() {
  assert.match(database, /^hr_chain_disburse_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status, note = '') => { assert.equal(response.status, status, `${note} ${JSON.stringify(response.body)}`); return response.body }
const expectCode = (response, status, code) => { assert.deepEqual([response.status, response.body?.code], [status, code], JSON.stringify(response.body)); return response.body }

async function employee(branch, overrides = {}, { exempt = true } = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `CHD${String(n).padStart(3, '0')}`, fullName: `موظف السلسلة ${n}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, currency: 'SAR',
    status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الاختبار', iban: 'SA0000000000000000000001', ...overrides })
  if (exempt) {
    // استثناء حضور طول السنة يعزل الحساب عن الغياب والتأخير
    await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role',
      reason: 'نافذة اختبار سلسلة الاعتماد المعزولة', status: 'APPROVED', createdByUserId: admin.id, approvedByUserId: admin.id,
      approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null, requiresCheckinForPresence: false })
  } else {
    const rows = []
    for (let time = Date.parse(`${FROM}T12:00:00Z`); time <= Date.parse('2026-09-22T12:00:00Z'); time += 86400000) {
      rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10), status: 'present', checkIn: '08:00', checkOut: '16:00',
        shiftName: 'وردية اختبار السلسلة', shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480, lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
    }
    await repo('AttendanceDay').save(rows, { chunk: 100 })
  }
  return emp
}
const account = (label, displayName, role, branchId, permissions, extra = {}) => repo('User').save({ email: `${label}@chain-test.invalid`, displayName,
  passwordHash: 'test-only', role, branchId, permissions: JSON.stringify(permissions), ...extra })
const createDraft = async (user, name, filters, period = PERIOD) =>
  expectStatus(await request(user, 'POST', '/payroll/runs', { name, policyVersionId, period, filters }), 201, 'draft:')
const calculate = async (user, runId) => expectStatus(await request(user, 'POST', `/payroll/runs/${runId}/calculate`, {}), 201, 'calculate:')
const recalculate = async (user, runId, reason) => expectStatus(await request(user, 'POST', `/payroll/runs/${runId}/recalculate`, { reason }), 201, 'recalculate:')
const chainOf = (user, runId) => request(user, 'GET', `/payroll/runs/${runId}/approval-chain`)
const approveStep = (user, runId) => request(user, 'POST', `/payroll/runs/${runId}/approval-chain/approve`)
const rejectStep = (user, runId, reason) => request(user, 'POST', `/payroll/runs/${runId}/approval-chain/reject`, reason === undefined ? {} : { reason })
const pendingOf = async user => expectStatus(await request(user, 'GET', '/payroll/approval-chain/my-pending'), 200).map(row => row.runId)
const runRow = id => repo('PayrollRun').findOneByOrFail({ id })
const named = (user, label) => ({ kind: 'USER', userId: user.id, ...(label ? { label } : {}) })
const stepStates = chain => chain.steps.map(step => step.status)
const eventsOf = async (runId, type) => (await repo('PayrollRunEvent').find({ where: { runId }, order: { id: 'ASC' } })).filter(row => !type || row.eventType === type)

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
  app.get(require('../src/attendance/attendance-scheduler.service').AttendanceScheduler).runCatchUp = async () => undefined
  app.get(require('../src/requests/requests-scheduler.service').RequestsScheduler).catchUp = async () => undefined
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  branchA = await repo('Branch').save({ code: 'CHD_A', name: 'فرع المعادي' })
  branchB = await repo('Branch').save({ code: 'CHD_B', name: 'فرع الجيزة' })
  branchC = await repo('Branch').save({ code: 'CHD_C', name: 'فرع الإدارة' })
  branchD = await repo('Branch').save({ code: 'CHD_D', name: 'فرع المبيعات' })
  deptA1 = await repo('Department').save({ name: 'قسم الحسابات', branchId: branchA.id, isActive: true })
  deptA2 = await repo('Department').save({ name: 'قسم التشغيل', branchId: branchA.id, isActive: true })
  teamA1 = await repo('Team').save({ name: 'فريق الخزينة', departmentId: deptA1.id, isActive: true })
  await repo('Role').save([
    { code: 'finance_manager', nameAr: 'المدير المالي', permissions: '[]', isSystem: false, isActive: true },
    { code: 'employee', nameAr: 'موظف', permissions: '[]', isSystem: true, isActive: true },
    { code: 'retired_role', nameAr: 'دور موقوف', permissions: '[]', isSystem: false, isActive: false },
  ])
  admin = await account('admin', 'كريم — مدير النظام', 'super_admin', null, [])
  // «مسؤول الرواتب»: يحسب ولا يعتمد
  calc = await account('calc', 'منى — مسؤولة الرواتب', 'accountant', branchA.id, ['payroll.view', 'payroll.calculate'])
  calcRev = await account('calc-rev', 'سعيد — يحسب وهو مسمّى في السلسلة', 'accountant', branchC.id, ['payroll.view', 'payroll.calculate'])
  approver = await account('approver', 'عبير — حاملة payroll.approve', 'hr_manager', branchA.id, ['payroll.view', 'payroll.approve', 'payroll.pay', 'payroll.reopen'])
  approverB = await account('approver-b', 'باسم — معتمد الجيزة', 'hr_manager', branchB.id, ['payroll.view', 'payroll.approve', 'payroll.pay', 'payroll.reopen'])
  // المعتمدون بالاسم: بلا أي صلاحية رواتب، وواحد من فرع تاني وواحد بلا فرع — التسمية هي المنحة
  rev1 = await account('rev1', 'هشام — مراجع', 'employee', branchB.id, [])
  rev2 = await account('rev2', 'دينا — مراجع تاني', 'employee', branchA.id, [])
  rev3 = await account('rev3', 'طارق — مراجع تالت', 'employee', branchA.id, [])
  ceo = await account('ceo', 'المدير التنفيذي', 'executive', null, [])
  fin1 = await account('fin1', 'فادي — مالية', 'finance_manager', branchD.id, [])
  fin2 = await account('fin2', 'فريدة — مالية', 'finance_manager', branchD.id, [])
  stranger = await account('stranger', 'غريب بلا علاقة', 'employee', branchA.id, [])
  disburser = await account('disburser', 'صلاح — صرف الرواتب', 'finance_clerk', branchA.id, ['payroll.disburse'])
  viewerB = await account('viewer-b', 'قارئ رواتب الجيزة', 'hr_manager', branchB.id, ['payroll.view'])
  chainA = await account('chain-a', 'مدير سلاسل فرع المعادي', 'hr_manager', branchA.id, ['payroll.view', 'payroll.chain_manage'])
  await repo('User').save({ email: 'gone@chain-test.invalid', displayName: 'حساب موقوف', passwordHash: 'test-only', role: 'employee', branchId: branchA.id, permissions: '[]', isActive: false })

  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
  ])
  // رخصة الشركة الصغيرة مبذورة مقفلة عند الإقلاع
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.approval_self_approval_allowed' })).value, 'false')
  const createdPolicy = expectStatus(await request(admin, 'POST', '/payroll/policies', { name: 'معادلة اختبار السلسلة', effectiveFrom: '2026-05-23', settings: { ...cycle23, dailyHours: 8 } }), 201)
  const [version] = createdPolicy.versions
  policyVersionId = expectStatus(await request(admin, 'POST', `/payroll/policies/${createdPolicy.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر معادلة اختبار سلسلة الاعتماد' }), 200).version.id

  e1 = await employee(branchA, { departmentId: deptA1.id, teamId: teamA1.id, fullName: 'سامي التحويل' })
  e2 = await employee(branchA, { departmentId: deptA1.id, payMethod: 'cash', bankName: null, iban: null, fullName: 'نادر النقدي' })
  e3 = await employee(branchA, { departmentId: deptA2.id, payMethod: 'mixed', bankTransferAmount: 2000, fullName: 'ليلى المختلط' })
  eOT = await employee(branchA, { departmentId: deptA2.id, fullName: 'وليد الإضافي والسلفة' }, { exempt: false })
  leaver = await employee(branchA, { departmentId: deptA2.id, status: 'archived', isActive: false, fullName: 'رامي المنتهية خدمته' })
  await repo('OffboardingCase').save({ employeeId: leaver.id, lastWorkingDay: '2026-08-10', status: 'IN_SETTLEMENT', terminationReason: 'resignation' })
  b1 = await employee(branchB); c1 = await employee(branchC); d1 = await employee(branchD)
  overtimeEntry = await repo('OvertimeEntry').save({ employeeId: eOT.id, date: '2026-08-04', source: 'PRE_REQUESTED', payableHours: 2, rate: 1, status: 'APPROVED' })
  const loan = await repo('Loan').save({ employeeId: eOT.id, amount: 500, status: 'DISBURSED', disbursedAt: new Date('2026-07-01T08:00:00Z') })
  installment = await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-08-01', amount: 500, paid: false })
  e1User = await account('e1', e1.fullName, 'employee', branchA.id, [], { employeeId: e1.id })
}, { timeout: 180000 })

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
  try { assert.match(path.basename(uploads), /^hr-chain-disburse-files-/); fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'chain/disbursement fixture cleanup failed')
})

test('بلا سلسلة = السلوك القديم بالحرف: الاعتماد بخطوة واحدة لحامل payroll.approve غير من احتسب، والصرف للمسير كله مرة واحدة', async () => {
  let run = await calculate(admin, (await createDraft(admin, 'مسير الجيزة', { branchIds: [branchB.id] })).id)
  assert.equal(run.status, 'CALCULATED')
  assert.equal(run.approvalGuard.blocked.code, 'PAYRUN-STATE-003', 'فصل المهام القديم ظاهر لمن احتسب')
  const chain = expectStatus(await chainOf(admin, run.id), 200)
  assert.deepEqual([chain.governed, chain.state, chain.steps.length], [false, 'NONE', 0])
  assert.deepEqual(await pendingOf(approverB), [], 'بلا سلسلة مفيش «بانتظار اعتمادي»')
  // نقاط السلسلة لا تفتح طريقًا جانبيًا للاعتماد
  expectCode(await approveStep(approverB, run.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  expectCode(await approveStep(stranger, run.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  // من احتسب لا يعتمد (كما هو)، وحامل payroll.approve غيره يعتمد بخطوة واحدة
  expectCode(await request(admin, 'POST', `/payroll/runs/${run.id}/approve`), 403, 'PAYRUN-STATE-003')
  expectStatus(await request(viewerB, 'POST', `/payroll/runs/${run.id}/approve`), 403)
  run = expectStatus(await request(approverB, 'POST', `/payroll/runs/${run.id}/approve`), 201)
  assert.deepEqual([run.status, run.approvedBy], ['APPROVED', approverB.id])
  assert.equal(await repo('PayrollRunApproval').count(), 0, 'الاعتماد بخطوة واحدة لا يكتب قرارات سلسلة')
  const [approved] = await eventsOf(run.id, 'APPROVED')
  assert.deepEqual([approved.payload.approvalChain, approved.payload.calculatedBy, approved.payload.smallCompanyException], [null, admin.id, false])
  // الصرف القديم لمسير بلا علامات: كما هو، بلا سبب، والكل مصروف ضمنيًا
  run = expectStatus(await request(approverB, 'POST', `/payroll/runs/${run.id}/pay`, { channel: 'BANK_TRANSFER', reference: 'تحويل الجيزة 1' }), 201)
  assert.equal(run.status, 'PAID')
  const [paid] = await eventsOf(run.id, 'PAID')
  assert.deepEqual([paid.reason, paid.payload.disbursement.mode, paid.payload.disbursement.paidCount, paid.payload.disbursement.unpaidCount], [null, 'RUN_LEVEL', 1, 0])
  assert.equal(await repo('PayrollItemDisbursement').count(), 0)
  const view = expectStatus(await request(approverB, 'GET', `/payroll/disbursement/runs/${run.id}`), 200)
  assert.deepEqual([view.run.mode, view.run.marking, view.rows.map(row => [row.state, row.tickable])], ['RUN_LEVEL', 'CLOSED', [['PAID', false]]])
  assert.deepEqual([view.totals.paid.count, view.totals.paid.total, view.totals.unpaid.count], [1, 6000, 0])
}, { timeout: 240000 })

test('إعداد السلاسل: الصلاحية payroll.chain_manage، سلسلة الشركة لحساب على مستوى الشركة فقط، والتحقق من الخطوات', async () => {
  for (const user of [calc, approver, disburser, stranger]) {
    expectStatus(await request(user, 'GET', '/payroll/approval-chain/config'), 403)
    expectStatus(await request(user, 'PUT', '/payroll/approval-chain/config/company', { steps: [named(ceo)] }), 403)
    expectStatus(await request(user, 'GET', '/payroll/approval-chain/approvers?search=x'), 403)
  }
  const empty = expectStatus(await request(admin, 'GET', '/payroll/approval-chain/config'), 200)
  assert.deepEqual([empty.company.steps, empty.company.revision, empty.overrides, empty.canEditCompany], [[], 0, [], true])
  assert.ok(empty.series.some(row => row.seriesName === 'مسير الجيزة'))
  assert.deepEqual(empty.roles.map(role => role.code), ['finance_manager'], 'الأدوار النشطة بلا دور «موظف»')
  // البحث بالاسم وبكود الموظف وبالإيميل — حسابات نشطة فقط
  const byName = expectStatus(await request(admin, 'GET', `/payroll/approval-chain/approvers?search=${encodeURIComponent('دينا')}`), 200)
  assert.deepEqual(byName.map(row => row.id), [rev2.id])
  const byCode = expectStatus(await request(admin, 'GET', `/payroll/approval-chain/approvers?search=${e1.employeeCode}`), 200)
  assert.deepEqual(byCode.map(row => [row.id, row.employeeCode]), [[e1User.id, e1.employeeCode]])
  assert.deepEqual(expectStatus(await request(admin, 'GET', `/payroll/approval-chain/approvers?search=${encodeURIComponent('حساب موقوف')}`), 200), [])

  const save = steps => request(admin, 'PUT', '/payroll/approval-chain/config/company', { steps })
  expectCode(await save('x'), 400, 'PAYRUN-CHAIN-STEPS')
  expectCode(await save([{ label: 'بلا نوع' }]), 400, 'PAYRUN-CHAIN-STEP-KIND')
  expectCode(await save([named(rev1), named(rev1)]), 400, 'PAYRUN-CHAIN-STEP-DUPLICATE')
  expectCode(await save([{ kind: 'USER', userId: 999999 }]), 400, 'PAYRUN-CHAIN-STEP-USER')
  const gone = await repo('User').findOneByOrFail({ email: 'gone@chain-test.invalid' })
  expectCode(await save([named(gone)]), 400, 'PAYRUN-CHAIN-STEP-USER-INACTIVE')
  expectCode(await save([{ kind: 'ROLE', roleCode: 'employee' }]), 400, 'PAYRUN-CHAIN-STEP-ROLE-OPEN')
  expectCode(await save([{ kind: 'ROLE', roleCode: 'retired_role' }]), 400, 'PAYRUN-CHAIN-STEP-ROLE')
  expectCode(await save([{ kind: 'ROLE', roleCode: 'no_such_role' }]), 400, 'PAYRUN-CHAIN-STEP-ROLE')
  expectCode(await save(Array.from({ length: 11 }, () => ({ kind: 'ROLE', roleCode: 'finance_manager' }))), 400, 'PAYRUN-CHAIN-TOO-LONG')
  assert.equal(await repo('PayrollApprovalChain').count(), 0, 'الرفض لا يحفظ شيئًا')

  // حساب فرع لا يعدّل سلسلة الشركة، ولا سلسلة مسير خارج فرعه
  expectStatus(await request(chainA, 'PUT', '/payroll/approval-chain/config/company', { steps: [named(ceo)] }), 403)
  expectCode(await request(chainA, 'PUT', '/payroll/approval-chain/config/series', { seriesName: 'مسير الجيزة', steps: [named(ceo)] }), 404, 'PAYRUN-CHAIN-SERIES-NOT-FOUND')
  expectCode(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: '   ', steps: [named(ceo)] }), 400, 'PAYRUN-CHAIN-SERIES')

  // سلسلة الشركة: مراجع ثم المدير التنفيذي — وأسماء الخطوات الافتراضية
  const saved = expectStatus(await save([named(rev1), named(ceo)]), 200)
  assert.deepEqual(saved.company.steps.map(step => [step.order, step.kind, step.userId, step.label, step.approverName]),
    [[1, 'USER', rev1.id, 'مراجعة', rev1.displayName], [2, 'USER', ceo.id, 'الاعتماد النهائي', ceo.displayName]])
  assert.equal(saved.company.revision, 1)
  // حفظ بنسخة قديمة مرفوض (تعديلان متزامنان)
  expectCode(await request(admin, 'PUT', '/payroll/approval-chain/config/company', { steps: [named(ceo)], expectedRevision: 0 }), 409, 'PAYRUN-CHAIN-REVISION')
}, { timeout: 120000 })

test('سلسلة 4 خطوات بأسماء أشخاص من الأول للآخر: حساب ← 3 اعتمادات ← الاعتماد النهائي، والقسيمة لا تظهر للموظف إلا بعده', async () => {
  // مسير الفرع الدائم محسوب قبل ما تتعمل له سلسلة خاصة ← ماشي بسلسلة الشركة (خطوتين) فورًا، بلا إعادة حساب
  runA = await calculate(calc, (await createDraft(calc, SERIES, { branchIds: [branchA.id] })).id)
  assert.deepEqual([runA.status, runA.calculatedBy, runA.items.length], ['CALCULATED', calc.id, 5])
  const otItem = runA.items.find(item => item.employeeId === eOT.id)
  assert.ok(Number(otItem.overtimeAmount) > 0 && Number(otItem.loanInstallments) === 500, JSON.stringify(otItem))
  let chain = expectStatus(await chainOf(calc, runA.id), 200)
  assert.deepEqual([chain.governed, chain.source, chain.state, chain.steps.length], [true, 'COMPANY', 'WAITING', 2])

  // السلسلة الخاصة بالمسير الدائم: مسؤول الرواتب يحسب → مراجع → مراجع تاني → مراجع تالت → المدير التنفيذي = الاعتماد النهائي
  const config = expectStatus(await request(chainA, 'PUT', '/payroll/approval-chain/config/series', { seriesName: `  ${SERIES} `,
    steps: [named(rev1, 'مراجع'), named(rev2, 'مراجع تاني'), named(rev3, 'مراجع تالت'), named(ceo, 'المدير التنفيذي')] }), 200)
  assert.deepEqual(config.overrides.map(row => [row.seriesName, row.steps.length]), [[SERIES, 4]])
  assert.equal(config.canEditCompany, false)
  chain = expectStatus(await chainOf(calc, runA.id), 200)
  assert.deepEqual([chain.source, chain.seriesName, chain.state, stepStates(chain), chain.currentStep], ['RUN_SERIES', SERIES, 'WAITING',
    ['CURRENT', 'PENDING', 'PENDING', 'PENDING'], { order: 1, label: 'مراجع', isFinal: false }])
  assert.deepEqual([chain.calculatedBy.name, chain.canAct, chain.mine], [calc.displayName, false, false])

  // الموظف لا يرى قسيمته قبل الاعتماد النهائي
  const e1Item = runA.items.find(item => item.employeeId === e1.id)
  assert.deepEqual(expectStatus(await request(e1User, 'GET', '/payroll/my-payslips'), 200), [])
  expectStatus(await request(e1User, 'GET', `/payroll/items/${e1Item.id}`), 404)

  // «مسيرات بانتظار اعتمادي»: عند صاحب الخطوة الحالية فقط
  const waiting = expectStatus(await request(rev1, 'GET', '/payroll/approval-chain/my-pending'), 200)
  assert.deepEqual(waiting.map(row => [row.runId, row.name, row.stepOrder, row.stepCount, row.stepLabel, row.isFinal, row.employees, row.canAct, row.calculatedBy.name]),
    [[runA.id, SERIES, 1, 4, 'مراجع', false, 5, true, calc.displayName]])
  assert.deepEqual(expectStatus(await request(rev1, 'GET', '/payroll/approval-chain/my-pending/count'), 200), { count: 1 })
  for (const user of [rev2, rev3, ceo, stranger, calc, approver, disburser]) assert.deepEqual(await pendingOf(user), [], user.displayName)

  // التسمية هي المنحة: هشام (فرع تاني، بلا أي صلاحية رواتب) يقرأ المسير المنتظر عنده — ولا شيء غيره
  const review = expectStatus(await request(rev1, 'GET', `/payroll/approval-chain/runs/${runA.id}/review`), 200)
  assert.deepEqual([review.run.name, review.run.status, review.totals.employees, review.totals.net, review.chain.canAct, review.chain.mine],
    [SERIES, 'CALCULATED', 5, Number(runA.totalNet), true, true])
  const otRow = review.rows.find(row => row.employeeId === eOT.id)
  assert.deepEqual([otRow.net, otRow.earnings - otRow.deductions, otRow.deductionLines.some(line => line.amount === 500)], [Number(otItem.netPay), Number(otItem.netPay), true])
  assert.equal(review.rows.find(row => row.employeeId === leaver.id).settlementPayout, true)
  expectStatus(await chainOf(rev1, runA.id), 200)
  for (const route of [`/payroll/runs/${runA.id}`, `/payroll/runs/${runA.id}/lines`, '/payroll/runs', `/payroll/runs/${runA.id}/bank-sheet`, `/payroll/runs/${runA.id}/events`]) {
    expectStatus(await request(rev1, 'GET', route), 403, route)
  }
  // الغريب، ومن لم يأتِ دوره بعد، والمسير غير الموجود: نفس الرد بلا كشف
  for (const user of [stranger, rev2, ceo, disburser]) {
    for (const id of [runA.id, 987654]) {
      expectCode(await request(user, 'GET', `/payroll/approval-chain/runs/${id}/review`), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
      expectCode(await chainOf(user, id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
      expectCode(await approveStep(user, id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
      expectCode(await rejectStep(user, id, 'سبب من غريب'), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
    }
  }
  // صلاحية payroll.approve وحدها لا تتخطى السلسلة، ومن احتسب مرفوض في الخطوة الأولى
  expectCode(await request(approver, 'POST', `/payroll/runs/${runA.id}/approve`), 409, 'PAYRUN-CHAIN-ACTIVE')
  expectCode(await request(admin, 'POST', `/payroll/runs/${runA.id}/approve`), 409, 'PAYRUN-CHAIN-ACTIVE')
  expectCode(await approveStep(calc, runA.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  assert.equal(await repo('PayrollRunApproval').count({ where: { runId: runA.id } }), 0)

  const people = [[rev1, 'مراجع'], [rev2, 'مراجع تاني'], [rev3, 'مراجع تالت']]
  for (const [index, [user]] of people.entries()) {
    const after = expectStatus(await approveStep(user, runA.id), 201, user.displayName)
    assert.deepEqual(after, { runId: runA.id, governed: true, acted: true }, 'بعد قراره مالوش قراءة المسير تاني')
    assert.equal((await runRow(runA.id)).status, 'CALCULATED', 'المسير يفضل محسوب طول ما هو طالع السلسلة')
    assert.deepEqual(expectStatus(await request(e1User, 'GET', '/payroll/my-payslips'), 200), [], 'القسيمة لسه مخفية')
    // نفس الشخص لا يعتمد تاني، ومن احتسب مرفوض في كل خطوة، والدور يروح للي بعده بس
    expectCode(await approveStep(user, runA.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
    expectCode(await approveStep(calc, runA.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
    expectCode(await rejectStep(calc, runA.id, 'مسؤول الرواتب لا يقرر'), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
    const next = [rev2, rev3, ceo][index]
    assert.deepEqual(await pendingOf(next), [runA.id]); assert.deepEqual(await pendingOf(user), [])
    expectCode(await request(approver, 'POST', `/payroll/runs/${runA.id}/approve`), 409, 'PAYRUN-CHAIN-ACTIVE')
  }
  chain = expectStatus(await chainOf(calc, runA.id), 200)
  assert.deepEqual([stepStates(chain), chain.currentStep, chain.steps.slice(0, 3).map(step => step.approvedBy.name)],
    [['APPROVED', 'APPROVED', 'APPROVED', 'CURRENT'], { order: 4, label: 'المدير التنفيذي', isFinal: true }, [rev1.displayName, rev2.displayName, rev3.displayName]])
  const last = expectStatus(await request(ceo, 'GET', '/payroll/approval-chain/my-pending'), 200)
  assert.deepEqual([last[0].isFinal, last[0].stepLabel], [true, 'المدير التنفيذي'])

  // الخطوة الأخيرة = الاعتماد النهائي بكل فحوصه وحجوزاته؛ وبعدها بس القسيمة تظهر
  expectStatus(await approveStep(ceo, runA.id), 201)
  const approvedRun = await runRow(runA.id)
  assert.deepEqual([approvedRun.status, approvedRun.approvedBy, approvedRun.snapshotVersion], ['APPROVED', ceo.id, 1])
  const slips = expectStatus(await request(e1User, 'GET', '/payroll/my-payslips'), 200)
  assert.deepEqual(slips.map(row => [row.item.id, row.run.status]), [[e1Item.id, 'APPROVED']])
  expectStatus(await request(e1User, 'GET', `/payroll/items/${e1Item.id}`), 200)
  const events = await eventsOf(runA.id)
  assert.deepEqual(events.filter(row => row.eventType === 'CHAIN_STEP_APPROVED').map(row => [row.actorUserId, row.payload.stepOrder, row.payload.final]),
    [[rev1.id, 1, false], [rev2.id, 2, false], [rev3.id, 3, false], [ceo.id, 4, true]])
  const approved = events.find(row => row.eventType === 'APPROVED')
  assert.deepEqual([approved.actorUserId, approved.payload.approvalChain.steps, approved.payload.approvalChain.chainScope, approved.payload.calculatedBy], [ceo.id, 4, 'RUN_SERIES', calc.id])
  // حجوزات الاعتماد حصلت مرة واحدة مع الاعتماد النهائي، ولا أثر صرف بعد
  assert.equal(await repo('LoanInstallmentAllocation').count({ where: { payrollRunId: runA.id, status: 'HELD' } }), 1)
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: overtimeEntry.id })).status, 'APPROVED')
  chain = expectStatus(await chainOf(approver, runA.id), 200)
  assert.deepEqual([chain.state, stepStates(chain), chain.currentStep, chain.steps[3].approvedBy.name], ['COMPLETED', ['APPROVED', 'APPROVED', 'APPROVED', 'APPROVED'], null, ceo.displayName])
  assert.deepEqual(await pendingOf(ceo), [])
  expectCode(await approveStep(ceo, runA.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
}, { timeout: 420000 })

test('«إنشاء مسيرات الشهر الجديد» بينقل السلسلة مع المسير؛ الرفض بسبب في نص السلسلة يرجّعه لمسؤول الرواتب، وإعادة الحساب وإعادة الفتح بيصفّروا التقدم', async () => {
  const next = expectStatus(await request(calc, 'POST', '/payroll/runs/create-next-period', { sourcePeriod: PERIOD }), 201)
  const createdNext = next.created.find(row => row.name === SERIES)
  assert.ok(createdNext?.runId, JSON.stringify(next))
  // المسودة الجديدة بنفس الاسم عليها نفس السلسلة الخاصة (4 خطوات) — غير فعّالة لحد ما تتحسب
  let chain = expectStatus(await chainOf(calc, createdNext.runId), 200)
  assert.deepEqual([chain.source, chain.seriesName, chain.state, chain.steps.map(step => step.approverName)],
    ['RUN_SERIES', SERIES, 'INACTIVE', [rev1.displayName, rev2.displayName, rev3.displayName, ceo.displayName]])
  assert.deepEqual(await pendingOf(rev1), [], 'المسودة مش منتظرة حد')
  expectCode(await approveStep(rev1, createdNext.runId), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  runNext = await calculate(calc, createdNext.runId)
  assert.deepEqual([runNext.period, runNext.status, runNext.snapshotVersion], [NEXT, 'CALCULATED', 1])

  expectStatus(await approveStep(rev1, runNext.id), 201)
  // الرفض بلا سبب مرفوض، ومن مش دوره مرفوض
  expectCode(await rejectStep(rev2, runNext.id), 400, 'PAYRUN-CHAIN-REJECT-REASON')
  expectCode(await rejectStep(rev2, runNext.id, 'لا'), 400, 'PAYRUN-CHAIN-REJECT-REASON')
  expectCode(await rejectStep(rev3, runNext.id, 'مش دوري لسه'), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  const reason = 'غياب وليد يوم 5 محسوب غلط؛ راجعوا الحضور'
  expectStatus(await rejectStep(rev2, runNext.id, `  ${reason} `), 201)
  assert.equal((await runRow(runNext.id)).status, 'CALCULATED', 'المسير يرجع لمسؤول الرواتب وهو محسوب')
  chain = expectStatus(await chainOf(calc, runNext.id), 200)
  assert.deepEqual([chain.state, stepStates(chain), chain.currentStep], ['RETURNED', ['PENDING', 'PENDING', 'PENDING', 'PENDING'], null])
  assert.deepEqual([chain.rejection.reason, chain.rejection.by.name, chain.rejection.stepOrder, chain.rejection.stepLabel, chain.lastRejection.current],
    [reason, rev2.displayName, 2, 'مراجع تاني', true])
  // النسخة المرفوضة ميتة: مفيش اعتماد عليها من أي حد، ومفيش «بانتظار اعتمادي»
  for (const user of [rev1, rev2, rev3, ceo]) assert.deepEqual(await pendingOf(user), [])
  expectCode(await approveStep(rev1, runNext.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  expectCode(await approveStep(rev2, runNext.id), 409, 'PAYRUN-CHAIN-RETURNED')
  expectCode(await request(approver, 'POST', `/payroll/runs/${runNext.id}/approve`), 409, 'PAYRUN-CHAIN-ACTIVE')
  const rows = await repo('PayrollRunApproval').find({ where: { runId: runNext.id }, order: { id: 'ASC' } })
  assert.deepEqual(rows.map(row => [row.decision, row.stepOrder, row.voidedAt === null, row.voidReason, row.reason]),
    [['APPROVED', 1, false, 'REJECTED', null], ['REJECTED', 2, true, null, reason]])
  const [rejected] = await eventsOf(runNext.id, 'CHAIN_REJECTED')
  assert.deepEqual([rejected.reason, rejected.actorUserId, rejected.payload.voidedApprovals], [reason, rev2.id, 1])
  // تغيير السلسلة مايمسحش الرفض (نفس نسخة الحساب تفضل مرتجعة)
  expectStatus(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: SERIES,
    steps: [named(rev1, 'مراجع'), named(rev2, 'مراجع تاني'), named(rev3, 'مراجع تالت'), named(ceo, 'المدير التنفيذي'), { kind: 'ROLE', roleCode: 'finance_manager', label: 'مؤقتة' }] }), 200)
  assert.equal(expectStatus(await chainOf(calc, runNext.id), 200).state, 'RETURNED')
  expectStatus(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: SERIES,
    steps: [named(rev1, 'مراجع'), named(rev2, 'مراجع تاني'), named(rev3, 'مراجع تالت'), named(ceo, 'المدير التنفيذي')] }), 200)

  // مسؤول الرواتب يعيد الحساب (نسخة جديدة) ← السلسلة تبدأ من الأول، وسبب الرفض السابق يفضل ظاهر
  runNext = await recalculate(calc, runNext.id, 'تصحيح حضور وليد بعد رفض المراجع')
  assert.equal(runNext.snapshotVersion, 2)
  chain = expectStatus(await chainOf(calc, runNext.id), 200)
  assert.deepEqual([chain.state, stepStates(chain), chain.rejection, chain.lastRejection.reason, chain.lastRejection.current, chain.lastRejection.snapshotVersion],
    ['WAITING', ['CURRENT', 'PENDING', 'PENDING', 'PENDING'], null, reason, false, 1])
  assert.deepEqual(await pendingOf(rev1), [runNext.id])
  // أي إعادة حساب بتصفّر التقدم: اعتماد خطوتين ثم إعادة حساب ← من الأول تاني
  expectStatus(await approveStep(rev1, runNext.id), 201); expectStatus(await approveStep(rev2, runNext.id), 201)
  assert.deepEqual(await pendingOf(rev3), [runNext.id])
  runNext = await recalculate(calc, runNext.id, 'إعادة حساب بعد اعتماد خطوتين')
  chain = expectStatus(await chainOf(calc, runNext.id), 200)
  assert.deepEqual([runNext.snapshotVersion, chain.state, stepStates(chain)], [3, 'WAITING', ['CURRENT', 'PENDING', 'PENDING', 'PENDING']])
  // قرارات النسخ السابقة اتلغت صراحةً بسبب إعادة الحساب (والرفض نفسه محفوظ كتاريخ)
  assert.deepEqual((await repo('PayrollRunApproval').find({ where: { runId: runNext.id }, order: { id: 'ASC' } })).map(row => [row.snapshotVersion, row.decision, row.voidReason]),
    [[1, 'APPROVED', 'REJECTED'], [1, 'REJECTED', 'RECALCULATED'], [2, 'APPROVED', 'RECALCULATED'], [2, 'APPROVED', 'RECALCULATED']])
  assert.deepEqual([await pendingOf(rev1), await pendingOf(rev3)], [[runNext.id], []])

  // السلسلة كاملة على النسخة 3 ثم إعادة فتح المسير المعتمد ← القرارات تتلغى والاعتماد يبدأ من الخطوة الأولى على نفس النسخة
  for (const user of [rev1, rev2, rev3, ceo]) expectStatus(await approveStep(user, runNext.id), 201)
  assert.equal((await runRow(runNext.id)).status, 'APPROVED')
  expectStatus(await request(approver, 'POST', `/payroll/runs/${runNext.id}/reopen`, { reason: 'مراجعة بعد الاعتماد' }), 201)
  chain = expectStatus(await chainOf(calc, runNext.id), 200)
  assert.deepEqual([chain.runStatus, chain.snapshotVersion, chain.state, stepStates(chain)], ['CALCULATED', 3, 'WAITING', ['CURRENT', 'PENDING', 'PENDING', 'PENDING']])
  const [reopened] = await eventsOf(runNext.id, 'REOPENED')
  assert.equal(reopened.payload.voidedChainApprovals, 4)
  assert.deepEqual(expectStatus(await request(e1User, 'GET', '/payroll/my-payslips'), 200).map(row => row.run.period), [PERIOD], 'قسيمة الشهر المعاد فتحه اتخفت تاني')
  // تغيير السلسلة والمسير في نصها ← الاعتماد يبدأ من الأول ويتسجل على المسير
  expectStatus(await approveStep(rev1, runNext.id), 201)
  expectStatus(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: SERIES, steps: [named(rev2, 'مراجع'), named(ceo, 'المدير التنفيذي')] }), 200)
  chain = expectStatus(await chainOf(calc, runNext.id), 200)
  assert.deepEqual([chain.steps.length, stepStates(chain), chain.steps[0].approverName], [2, ['CURRENT', 'PENDING'], rev2.displayName])
  assert.equal((await eventsOf(runNext.id, 'CHAIN_CHANGED')).length, 1)
  assert.deepEqual([await pendingOf(rev1), await pendingOf(rev2)], [[], [runNext.id]])
  // إلغاء المسير المحسوب يلغي قراراته
  expectStatus(await approveStep(rev2, runNext.id), 201)
  expectStatus(await request(admin, 'POST', `/payroll/runs/${runNext.id}/cancel`, { reason: 'إلغاء مسير الاختبار' }), 201)
  assert.equal(await repo('PayrollRunApproval').count({ where: { runId: runNext.id, voidedAt: require('../node_modules/typeorm').IsNull() } }), 0)
  assert.deepEqual(await pendingOf(ceo), [])
}, { timeout: 600000 })

test('من احتسب مسمّى في السلسلة: مرفوض في خطوته (اعتمادًا ورفضًا) والشاشة تقول السلسلة واقفة ليه؛ ورخصة الشركة الصغيرة تحتفظ بمعناها', async () => {
  const name = 'مسير الإدارة'
  const run = await calculate(calcRev, (await createDraft(calcRev, name, { branchIds: [branchC.id] })).id)
  expectStatus(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: name, steps: [named(calcRev, 'مراجعة الحسابات'), named(ceo)] }), 200)
  let chain = expectStatus(await chainOf(calcRev, run.id), 200)
  assert.deepEqual([chain.mine, chain.canAct, chain.blocked.code, !!chain.stuckMessage], [true, false, 'PAYRUN-STATE-003', true])
  const pending = expectStatus(await request(calcRev, 'GET', '/payroll/approval-chain/my-pending'), 200)
  assert.deepEqual(pending.map(row => [row.runId, row.canAct, !!row.blocked]), [[run.id, false, true]])
  expectCode(await approveStep(calcRev, run.id), 403, 'PAYRUN-STATE-003')
  expectCode(await rejectStep(calcRev, run.id, 'أرفض ما احتسبته'), 403, 'PAYRUN-STATE-003')
  assert.equal(await repo('PayrollRunApproval').count({ where: { runId: run.id } }), 0)
  // الرخصة (قرار المالك الموثق) تفك فصل المهام بمعناها القائم، ويتسجل استخدامها
  await repo('RequestsConfig').update({ key: 'payroll.approval_self_approval_allowed' }, { value: 'true' })
  try {
    chain = expectStatus(await chainOf(calcRev, run.id), 200)
    assert.deepEqual([chain.canAct, chain.blocked, chain.stuckMessage], [true, null, null])
    expectStatus(await approveStep(calcRev, run.id), 201)
    const [step] = await eventsOf(run.id, 'CHAIN_STEP_APPROVED')
    assert.deepEqual([step.payload.smallCompanyException, step.payload.selfApprovalSetting], [true, true])
  } finally {
    await repo('RequestsConfig').update({ key: 'payroll.approval_self_approval_allowed' }, { value: 'false' })
  }
  expectStatus(await approveStep(ceo, run.id), 201)
  assert.equal((await runRow(run.id)).status, 'APPROVED')
}, { timeout: 300000 })

test('خطوة بالدور: حامل الدور داخل نطاق فرعه يعتمد، ومحدش بيعتمد خطوتين لنفس نسخة الحساب', async () => {
  const name = 'مسير المبيعات'
  const run = await calculate(admin, (await createDraft(admin, name, { branchIds: [branchD.id] })).id)
  // فادي مسمّى في الخطوة الأولى وبيحمل دور الخطوة التانية كمان
  expectStatus(await request(admin, 'PUT', '/payroll/approval-chain/config/series', { seriesName: name,
    steps: [named(fin1, 'مراجعة مالية'), { kind: 'ROLE', roleCode: 'finance_manager', label: 'اعتماد المالية' }, named(ceo)] }), 200)
  let chain = expectStatus(await chainOf(admin, run.id), 200)
  assert.deepEqual(chain.steps.map(step => [step.kind, step.approverName]), [['USER', fin1.displayName], ['ROLE', 'المدير المالي'], ['USER', ceo.displayName]])
  expectStatus(await approveStep(fin1, run.id), 201)
  // الخطوة التانية بدوره هو كمان: ظاهرة عنده لكن ممنوعة عليه
  const mine = expectStatus(await request(fin1, 'GET', '/payroll/approval-chain/my-pending'), 200)
  assert.deepEqual(mine.map(row => [row.runId, row.canAct]), [[run.id, false]])
  expectCode(await approveStep(fin1, run.id), 403, 'PAYRUN-CHAIN-ALREADY-ACTED')
  expectCode(await rejectStep(fin1, run.id, 'أرفض بعد ما اعتمدت'), 403, 'PAYRUN-CHAIN-ALREADY-ACTED')
  // حامل نفس الدور من فرع تاني خارج نطاق المسير: مرفوض بلا كشف
  const finOther = await account('fin-other', 'مالية فرع تاني', 'finance_manager', branchA.id, [])
  assert.deepEqual(await pendingOf(finOther), [])
  expectCode(await approveStep(finOther, run.id), 403, 'PAYRUN-CHAIN-NOT-YOUR-TURN')
  assert.deepEqual(await pendingOf(fin2), [run.id])
  expectStatus(await approveStep(fin2, run.id), 201)
  expectStatus(await approveStep(ceo, run.id), 201)
  assert.equal((await runRow(run.id)).status, 'APPROVED')
  const rows = await repo('PayrollRunApproval').find({ where: { runId: run.id }, order: { stepOrder: 'ASC' } })
  assert.deepEqual(rows.map(row => [row.stepOrder, row.approverKind, row.approverRoleCode, row.actorUserId]),
    [[1, 'USER', null, fin1.id], [2, 'ROLE', 'finance_manager', fin2.id], [3, 'USER', null, ceo.id]])
}, { timeout: 300000 })

const amountsOf = async runId => JSON.stringify([(await repo('PayrollRun').findOneByOrFail({ id: runId })),
  await repo('PayrollItem').find({ where: { runId }, order: { id: 'ASC' } }), await repo('PayrollRunMember').find({ where: { runId }, order: { id: 'ASC' } })])

test('صرف المسير موظف بموظف: القراءة والفلاتر والعلامة الواحدة والجماعية، وموظف التصفية لا يُعلَّم', async () => {
  const runs = expectStatus(await request(disburser, 'GET', '/payroll/disbursement/runs'), 200)
  assert.deepEqual(runs.map(row => [row.id, row.status, row.markedPaid]), [[runA.id, 'APPROVED', 0]], 'مسيرات فرعه المعتمدة فقط')
  expectStatus(await request(stranger, 'GET', '/payroll/disbursement/runs'), 403)
  expectStatus(await request(rev1, 'GET', `/payroll/disbursement/runs/${runA.id}`), 403)
  // مسير خارج فرعه أو غير موجود: نفس الرد
  const foreign = (await repo('PayrollRun').findOneByOrFail({ name: 'مسير الجيزة' })).id
  const missing = await request(disburser, 'GET', '/payroll/disbursement/runs/987654')
  assert.deepEqual(await request(disburser, 'GET', `/payroll/disbursement/runs/${foreign}`), missing)
  assert.equal(missing.status, 404)

  const before = await amountsOf(runA.id)
  let view = expectStatus(await request(disburser, 'GET', `/payroll/disbursement/runs/${runA.id}`), 200)
  assert.deepEqual([view.run.status, view.run.mode, view.run.marking, view.rows.length], ['APPROVED', 'NOT_STARTED', 'OPEN', 5])
  const row = emp => view.rows.find(item => item.employeeId === emp.id)
  const net = emp => row(emp).netPay
  assert.deepEqual([row(e1).payMethodLabel, row(e1).bankAmount, row(e1).cashAmount, row(e1).state, row(e1).tickable, row(e1).departmentName, row(e1).teamName],
    ['تحويل بنكي', 6000, 0, 'UNPAID', true, 'قسم الحسابات', 'فريق الخزينة'])
  assert.deepEqual([row(e2).payMethodLabel, row(e2).bankAmount, row(e2).cashAmount], ['نقدي', 0, 6000])
  assert.deepEqual([row(e3).payMethodLabel, row(e3).bankAmount, row(e3).cashAmount], ['نقدي + بنك', 2000, 4000])
  assert.deepEqual([row(leaver).state, row(leaver).stateLabel, row(leaver).tickable, row(leaver).settlement.lastWorkingDay], ['SETTLEMENT', 'مصروف مع التصفية', false, '2026-08-10'])
  const payable = 6000 + 6000 + 6000 + net(eOT)
  assert.deepEqual([view.totals.payable.count, view.totals.payable.total, view.totals.unpaid.count, view.totals.unpaid.bank, view.totals.unpaid.cash, view.totals.paid.count,
    view.totals.settlement.count, view.totals.settlement.total], [4, payable, 4, 6000 + 2000 + net(eOT), 10000, 0, 1, net(leaver)])
  // نفس أرقام كشف البنوك بالحرف (مصدر واحد)
  const sheet = expectStatus(await request(approver, 'GET', `/payroll/runs/${runA.id}/bank-sheet`), 200)
  assert.deepEqual([view.totals.payable.bank, view.totals.payable.cash, view.totals.payable.total], [sheet.totals.bank, sheet.totals.cash, sheet.totals.net])
  assert.deepEqual(view.facets.payMethods.map(item => item.id).sort(), ['cash', 'mixed', 'transfer'])
  assert.deepEqual(view.facets.departments.map(item => item.name).sort(), ['قسم التشغيل', 'قسم الحسابات'].sort())

  // الفلاتر: الفرع والقسم والفريق وطريقة الصرف والحالة والبحث بالاسم أو الكود — كلها مع بعض
  const filtered = async query => expectStatus(await request(disburser, 'GET', `/payroll/disbursement/runs/${runA.id}?${new URLSearchParams(query)}`), 200)
  const ids = list => list.rows.map(item => item.employeeId).sort((a, b) => a - b)
  assert.deepEqual(ids(await filtered({ payMethod: 'cash' })), [e2.id])
  assert.deepEqual(ids(await filtered({ departmentId: deptA1.id })), [e1.id, e2.id])
  assert.deepEqual(ids(await filtered({ teamId: teamA1.id })), [e1.id])
  assert.deepEqual(ids(await filtered({ branchId: branchA.id, departmentId: deptA2.id, payMethod: 'transfer' })), [eOT.id])
  assert.deepEqual(ids(await filtered({ branchId: branchB.id })), [])
  assert.deepEqual(ids(await filtered({ search: e3.employeeCode.toLowerCase() })), [e3.id])
  assert.deepEqual(ids(await filtered({ search: 'النقدي' })), [e2.id])
  assert.deepEqual(ids(await filtered({ state: 'SETTLEMENT' })), [leaver.id])
  const cashOnly = await filtered({ payMethod: 'cash' })
  assert.deepEqual([cashOnly.filteredTotals.unpaid.count, cashOnly.filteredTotals.unpaid.cash, cashOnly.totals.unpaid.count, cashOnly.bulk], [1, 6000, 4, { markPaid: 1, markUnpaid: 0 }])
  expectStatus(await request(disburser, 'GET', `/payroll/disbursement/runs/${runA.id}?state=WRONG`), 400)

  // علامة واحدة «تم الصرف» بملاحظة، ثم «لم يتم»، ثم «تم» تاني — بمن علّم ومتى
  const mark = (user, body) => request(user, 'POST', `/payroll/disbursement/runs/${runA.id}/mark`, body)
  view = expectStatus(await mark(disburser, { itemIds: [row(e1).itemId], paid: true, note: ' تحويل رقم 88 ' }), 201)
  assert.deepEqual([view.changed, view.unchanged, row(e1).state, row(e1).note, row(e1).markedBy.name, !!row(e1).markedAt, view.run.mode], [1, 0, 'PAID', 'تحويل رقم 88', disburser.displayName, true, 'PER_EMPLOYEE'])
  assert.deepEqual([view.totals.paid.count, view.totals.paid.total, view.totals.paid.bank, view.totals.unpaid.count], [1, 6000, 6000, 3])
  assert.deepEqual([(await mark(disburser, { itemIds: [row(e1).itemId], paid: true })).body.changed, (await mark(disburser, { itemIds: [row(e1).itemId], paid: true })).body.unchanged], [0, 1], 'إعادة نفس العلامة لا تغيّر شيئًا')
  view = expectStatus(await mark(disburser, { itemIds: [row(e1).itemId], paid: false }), 201)
  assert.deepEqual([row(e1).state, view.totals.paid.count, view.run.mode], ['UNPAID', 0, 'NOT_STARTED'])
  view = expectStatus(await mark(disburser, { itemIds: [row(e1).itemId], paid: true }), 201)
  const marks = await eventsOf(runA.id, 'DISBURSEMENT_MARKED')
  assert.deepEqual(marks.map(event => [event.actorUserId, event.payload.paid, event.payload.count, event.payload.total, event.payload.employeeIds]),
    [[disburser.id, true, 1, 6000, [e1.id]], [disburser.id, false, 1, 6000, [e1.id]], [disburser.id, true, 1, 6000, [e1.id]]])
  // موظف التصفية، وبند من مسير تاني، وقارئ بلا payroll.disburse، وملاحظة أطول من الحد
  expectCode(await mark(disburser, { itemIds: [row(leaver).itemId], paid: true }), 409, 'PAYRUN-DISBURSE-SETTLEMENT')
  const foreignItem = (await repo('PayrollItem').findOneByOrFail({ runId: foreign })).id
  expectCode(await mark(disburser, { itemIds: [foreignItem], paid: true }), 404, 'PAYRUN-DISBURSE-ITEM')
  expectStatus(await mark(approver, { itemIds: [row(e2).itemId], paid: true }), 403)
  expectCode(await mark(disburser, { itemIds: [row(e2).itemId], paid: true, note: 'ط'.repeat(501) }), 400, 'PAYRUN-DISBURSE-NOTE')
  expectStatus(await mark(disburser, { itemIds: [], paid: true }), 400)

  // «علّم المفلتر تم الصرف»: الخادم يطبق الفلاتر بنفسه ويرفض لو الشاشة قديمة
  const bulk = body => request(disburser, 'POST', `/payroll/disbursement/runs/${runA.id}/mark-filtered`, body)
  expectCode(await bulk({ paid: true, expectedCount: 5, filter: { departmentId: deptA1.id } }), 409, 'PAYRUN-DISBURSE-STALE')
  view = expectStatus(await bulk({ paid: true, expectedCount: 1, note: 'خزينة الحسابات', filter: { departmentId: deptA1.id } }), 201)
  assert.deepEqual([view.changed, ids(view), view.rows.map(item => item.state), view.totals.paid.count, view.totals.paid.bank, view.totals.paid.cash, view.bulk],
    [1, [e1.id, e2.id], ['PAID', 'PAID'], 2, 6000, 6000, { markPaid: 0, markUnpaid: 2 }])
  assert.equal(await repo('PayrollItemDisbursement').count({ where: { runId: runA.id, status: 'PAID' } }), 2)
  // ولا مبلغ ولا حالة مسير ولا عضوية اتغيرت من التعليم
  assert.equal(await amountsOf(runA.id), before)
  assert.equal((await repo('OvertimeEntry').findOneByOrFail({ id: overtimeEntry.id })).status, 'APPROVED', 'العلامة بلا أثر مالي')
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid, false)
}, { timeout: 300000 })

test('حامل payroll.disburse وحده مرفوض في كل كتابة رواتب أخرى (وفي قراءة المسير نفسه) ولا يغيّر أي مبلغ أو حالة', async () => {
  const before = await amountsOf(runA.id)
  const e1Item = (await repo('PayrollItem').findOneByOrFail({ runId: runA.id, employeeId: e1.id })).id
  const writes = [
    ['POST', '/payroll/runs', { name: 'مسير من موظف الصرف', policyVersionId, period: PERIOD, filters: { branchIds: [branchA.id] } }],
    ['POST', '/payroll/runs/create-next-period', {}], ['POST', '/payroll/runs/membership-preview', { policyVersionId, period: PERIOD, filters: { branchIds: [branchA.id] } }],
    ['POST', '/payroll/runs/calculate', { branchId: branchA.id, period: PERIOD }], ['POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'COMPANY' }],
    ['PATCH', `/payroll/runs/${runA.id}`, { name: 'اسم جديد' }], ['POST', `/payroll/runs/${runA.id}/calculate`, {}],
    ['POST', `/payroll/runs/${runA.id}/recalculate`, { reason: 'إعادة حساب من موظف الصرف' }], ['POST', `/payroll/runs/${runA.id}/approve`],
    ['POST', `/payroll/runs/${runA.id}/pay`, { channel: 'CASH', reference: 'محضر 1' }], ['POST', `/payroll/runs/${runA.id}/reopen`, { reason: 'إعادة فتح من موظف الصرف' }],
    ['POST', `/payroll/runs/${runA.id}/cancel`, { reason: 'إلغاء من موظف الصرف' }], ['POST', `/payroll/runs/${runA.id}/member-exclusions`, { employeeId: e1.id, reason: 'استبعاد' }],
    ['POST', `/payroll/runs/${runA.id}/members`, { employeeIds: [b1.id], reason: 'ضم موظف' }], ['POST', `/payroll/runs/${runA.id}/members/bulk`, { employeeIds: [b1.id], reason: 'ضم موظف' }],
    ['POST', `/payroll/runs/${runA.id}/parity-explanations`, { explanations: [] }], ['POST', `/payroll/runs/${runA.id}/engine-mode`, { mode: 'LEGACY', reason: 'تحويل' }],
    ['POST', `/payroll/runs/${runA.id}/parity-counting`, { counts: false, reason: 'تجريبي' }], ['POST', `/payroll/runs/${runA.id}/unassigned-ack`, { reportHash: 'a'.repeat(64) }],
    ['POST', `/payroll/runs/${runA.id}/reversals`, { reason: 'عكس من موظف الصرف' }], ['POST', `/payroll/runs/${runA.id}/supplementary`, { reason: 'تكميلي', name: 'تكميلي', employeeIds: [e1.id] }],
    ['PUT', '/payroll/approval-chain/config/company', { steps: [] }], ['PUT', '/payroll/approval-chain/config/series', { seriesName: SERIES, steps: [] }],
    ['POST', `/payroll/runs/${runA.id}/approval-chain/approve`], ['POST', `/payroll/runs/${runA.id}/approval-chain/reject`, { reason: 'رفض من موظف الصرف' }],
    // باقي كتابات وحدة الرواتب (بدلات، قيود دفتر، شيل خصم، تراكم، سجل أجر، معادلات، شرائح، تأمينات): كلها بصلاحيات لا يحملها
    ['POST', '/payroll/allowances/types', { code: 'X', name: 'بدل من موظف الصرف' }], ['POST', '/payroll/allowances/grants', { period: PERIOD, allowanceTypeId: 1, amount: 100, targetLevel: 'company', reason: 'صرف بدل' }],
    ['POST', '/obligations', { employeeId: e1.id, type: 'CREDIT', category: 'bonus', amount: 500, label: 'إضافة من موظف الصرف' }],
    ['POST', '/payroll/overview/waivers', { period: PERIOD, kind: 'LATENESS', targetLevel: 'company', reason: 'شيل خصم' }],
    ['POST', `/payroll/runs/${runA.id}/accrual/refresh`, {}], ['POST', `/payroll/employees/${e1.id}/salary-history/monthly`, { payrollPeriod: PERIOD, basicSalary: 9000 }],
    ['POST', '/payroll/policies', { name: 'معادلة من موظف الصرف', effectiveFrom: '2026-05-23', settings: {} }], ['POST', '/payroll/rules/lateness-tiers', { fromMinutes: 1, toMinutes: 5 }],
    ['PUT', '/social-insurance/settings', { saudiEmployeePct: 0 }],
  ]
  // حزمة الدور الفعلية «مسؤول صرف الرواتب» = payroll.view + payroll.disburse: القراءة مسموحة وكل كتابة مرفوضة برضه
  const disburserRole = await account('disburser-role', 'صرف الرواتب بحزمة الدور', 'payroll_disburser', branchA.id, ['payroll.view', 'payroll.disburse'])
  for (const actor of [disburser, disburserRole]) {
    for (const [method, route, body] of writes) {
      // معاينة العضوية قراءة فقط لكنها بصلاحية الاحتساب؛ الباقي كتابة
      const response = await request(actor, method, route, body)
      assert.ok([403, 404].includes(response.status), `${actor.displayName} ${method} ${route}: ${response.status} ${JSON.stringify(response.body)}`)
      assert.equal(await amountsOf(runA.id), before, `${method} ${route} غيّر المسير`)
    }
  }
  expectStatus(await request(disburserRole, 'GET', `/payroll/runs/${runA.id}`), 200)
  assert.equal(expectStatus(await request(disburserRole, 'GET', `/payroll/disbursement/runs/${runA.id}`), 200).run.marking, 'OPEN')
  for (const route of ['/payroll/runs', `/payroll/runs/${runA.id}`, `/payroll/runs/${runA.id}/lines`, `/payroll/runs/${runA.id}/events`, `/payroll/runs/${runA.id}/bank-sheet`,
    `/payroll/runs/${runA.id}/approval-chain`, '/payroll/approval-chain/config']) {
    expectStatus(await request(disburser, 'GET', route), 403, route)
  }
  expectStatus(await request(disburser, 'GET', `/payroll/items/${e1Item}`), 404)
  assert.equal(await repo('PayrollRun').count({ where: { name: 'مسير من موظف الصرف' } }), 0)
}, { timeout: 300000 })

test('«إقفال الصرف» = pay(): إعادة الفتح مرفوضة بعد أول علامة، وسبب إلزامي لمن لم يُصرف له، وآثار الصرف (قفل الإضافي وترحيل القسط) مرة واحدة بالظبط', async () => {
  const itemOf = async emp => (await repo('PayrollItem').findOneByOrFail({ runId: runA.id, employeeId: emp.id }))
  expectCode(await request(approver, 'POST', `/payroll/runs/${runA.id}/reopen`, { reason: 'إعادة فتح بعد بدء الصرف' }), 409, 'PAYRUN-DISBURSE-STARTED')
  assert.equal((await runRow(runA.id)).status, 'APPROVED')
  const pay = body => request(approver, 'POST', `/payroll/runs/${runA.id}/pay`, body)
  const effects = async () => ({ overtime: (await repo('OvertimeEntry').findOneByOrFail({ id: overtimeEntry.id })).status,
    overtimeRun: (await repo('OvertimeEntry').findOneByOrFail({ id: overtimeEntry.id })).payrollRunId ?? null,
    installmentPaid: (await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid,
    held: await repo('LoanInstallmentAllocation').count({ where: { payrollRunId: runA.id, status: 'HELD' } }),
    posted: await repo('LoanInstallmentAllocation').count({ where: { payrollRunId: runA.id, status: 'POSTED' } }),
    installmentEvents: await repo('LoanInstallmentEvent').count({ where: { payrollRunId: runA.id } }) })
  const beforePay = await effects()
  assert.deepEqual([beforePay.overtime, beforePay.overtimeRun, beforePay.installmentPaid, beforePay.held, beforePay.posted], ['APPROVED', null, false, 1, 0])
  // اتعلّم 2 من 4: الإقفال من غير سبب مرفوض قبل أي أثر
  const refused = expectCode(await pay({ channel: 'MIXED', reference: `${SERIES} ${PERIOD}` }), 400, 'PAYRUN-DISBURSE-UNPAID-REASON')
  assert.deepEqual([refused.unpaidCount, refused.unpaidTotal], [2, 6000 + Number((await itemOf(eOT)).netPay)])
  expectCode(await pay({ channel: 'MIXED', reference: `${SERIES} ${PERIOD}`, unpaidReason: 'لا' }), 400, 'PAYRUN-DISBURSE-UNPAID-REASON')
  assert.deepEqual(await effects(), beforePay)
  assert.equal((await runRow(runA.id)).status, 'APPROVED')

  const reason = 'ليلى ووليد في إجازة؛ رواتبهم تتسلم عند الرجوع'
  const paidRun = expectStatus(await pay({ channel: 'MIXED', reference: `${SERIES} ${PERIOD}`, unpaidReason: reason }), 201)
  assert.deepEqual([paidRun.status, paidRun.paidBy, paidRun.payChannel], ['PAID', approver.id, 'MIXED'])
  const afterPay = await effects()
  assert.deepEqual([afterPay.overtime, afterPay.overtimeRun, afterPay.installmentPaid, afterPay.held, afterPay.posted], ['PAID', runA.id, true, 0, 1])
  const [paidEvent] = await eventsOf(runA.id, 'PAID')
  assert.deepEqual([paidEvent.reason, paidEvent.payload.disbursement.mode, paidEvent.payload.disbursement.paidCount, paidEvent.payload.disbursement.paidTotal,
    paidEvent.payload.disbursement.unpaidCount, paidEvent.payload.disbursement.unpaidEmployeeIds.sort((a, b) => a - b), paidEvent.payload.disbursement.unpaidReason],
    [reason, 'PER_EMPLOYEE', 2, 12000, 2, [e3.id, eOT.id].sort((a, b) => a - b), reason])
  // مرة واحدة بالظبط: الصرف تاني مرفوض والآثار زي ما هي
  expectCode(await pay({ channel: 'MIXED', reference: 'صرف تاني', unpaidReason: reason }), 400, 'PAYRUN-STATE-001')
  assert.deepEqual(await effects(), afterPay)
  assert.equal((await eventsOf(runA.id, 'PAID')).length, 1)

  // بعد الإقفال: اللي لسه ماتصرفلوش يتعلّم «تم الصرف» لما يتصرفله، ومفيش رجوع في أي علامة
  const mark = body => request(disburser, 'POST', `/payroll/disbursement/runs/${runA.id}/mark`, body)
  let view = expectStatus(await request(disburser, 'GET', `/payroll/disbursement/runs/${runA.id}`), 200)
  const row = emp => view.rows.find(item => item.employeeId === emp.id)
  assert.deepEqual([view.run.status, view.run.mode, view.run.marking, view.run.closed.by.name, view.run.closed.channelLabel], ['PAID', 'PER_EMPLOYEE', 'LATE_ONLY', approver.displayName, 'مختلط حسب طريقة صرف كل موظف'])
  assert.deepEqual([row(e1).tickable, row(e3).state, row(e3).tickable, row(e3).note], [false, 'UNPAID', true, `أُقفل الصرف بدونه: ${reason}`])
  expectCode(await mark({ itemIds: [row(e1).itemId], paid: false }), 409, 'PAYRUN-DISBURSE-CLOSED')
  expectCode(await mark({ itemIds: [row(e3).itemId], paid: false }), 409, 'PAYRUN-DISBURSE-CLOSED')
  view = expectStatus(await mark({ itemIds: [row(e3).itemId], paid: true, note: 'استلمت بعد الرجوع' }), 201)
  assert.deepEqual([row(e3).state, row(e3).bankAmount, row(e3).cashAmount, view.totals.paid.count, view.totals.unpaid.count], ['PAID', 2000, 4000, 3, 1])
  assert.deepEqual(await effects(), afterPay, 'العلامة المتأخرة بلا أثر مالي')
  // تقسيم «تم الصرف» مثبت وقت العلامة: تغيير طريقة صرف الموظف بعدها لا يغيّر اللي اتصرف فعلًا
  await repo('Employee').update({ id: e3.id }, { payMethod: 'cash', bankTransferAmount: null })
  view = expectStatus(await request(disburser, 'GET', `/payroll/disbursement/runs/${runA.id}`), 200)
  assert.deepEqual([row(e3).payMethod, row(e3).bankAmount, row(e3).cashAmount], ['mixed', 2000, 4000])

  // ملخص المالك: لمسير، ولكل مسيرات الشهر (تم / لم يتم، بنك / نقدي)
  const eOTNet = Number((await itemOf(eOT)).netPay)
  const one = expectStatus(await request(admin, 'GET', `/payroll/disbursement/summary?runId=${runA.id}`), 200)
  assert.deepEqual([one.runs.length, one.runs[0].mode, one.runs[0].unpaidReason, one.totals.paid.count, one.totals.paid.total, one.totals.paid.bank, one.totals.paid.cash,
    one.totals.unpaid.count, one.totals.unpaid.total, one.totals.unpaid.bank, one.totals.settlement.count],
    [1, 'PER_EMPLOYEE', reason, 3, 18000, 8000, 10000, 1, eOTNet, eOTNet, 1])
  const month = expectStatus(await request(admin, 'GET', `/payroll/disbursement/summary?period=${PERIOD}`), 200)
  assert.deepEqual(month.runs.map(run => [run.name, run.status, run.mode, run.paid.count, run.unpaid.count]).sort(),
    [[SERIES, 'PAID', 'PER_EMPLOYEE', 3, 1], ['مسير الجيزة', 'PAID', 'RUN_LEVEL', 1, 0], ['مسير الإدارة', 'APPROVED', 'NOT_STARTED', 0, 1], ['مسير المبيعات', 'APPROVED', 'NOT_STARTED', 0, 1]].sort())
  assert.deepEqual([month.totals.paid.count, month.totals.paid.total, month.totals.unpaid.count, month.totals.unpaid.total], [4, 24000, 3, eOTNet + 12000])
  // حساب الفرع يشوف مسيرات فرعه بس، ومسير خارج نطاقه = غير موجود
  assert.deepEqual(expectStatus(await request(disburser, 'GET', `/payroll/disbursement/summary?period=${PERIOD}`), 200).runs.map(run => run.name), [SERIES])
  expectStatus(await request(disburser, 'GET', `/payroll/disbursement/summary?runId=${(await repo('PayrollRun').findOneByOrFail({ name: 'مسير الجيزة' })).id}`), 404)
  expectCode(await request(admin, 'GET', '/payroll/disbursement/summary'), 400, 'PAYRUN-DISBURSE-SUMMARY-SCOPE')
  // المسير اللي اتصرف كله مرة واحدة: مفيش علامات تتغير فيه
  const giza = await repo('PayrollRun').findOneByOrFail({ name: 'مسير الجيزة' })
  const gizaItem = await repo('PayrollItem').findOneByOrFail({ runId: giza.id })
  expectCode(await request(admin, 'POST', `/payroll/disbursement/runs/${giza.id}/mark`, { itemIds: [gizaItem.id], paid: true }), 409, 'PAYRUN-DISBURSE-CLOSED')
}, { timeout: 300000 })

test('القسيمة بلا كاشف وجود: رقم بند موجود خارج نطاق السائل = نفس رد الرقم المفقود بالحرف', async () => {
  const foreignItem = await repo('PayrollItem').findOneByOrFail({ runId: runA.id, employeeId: e2.id })
  const gizaItem = await repo('PayrollItem').findOneByOrFail({ runId: (await repo('PayrollRun').findOneByOrFail({ name: 'مسير الجيزة' })).id })
  const missingId = 98765432
  assert.equal(await repo('PayrollItem').count({ where: { id: missingId } }), 0)
  // موظف يطلب قسيمة غيره، وقارئ رواتب فرع تاني، وموظف الصرف، وغريب بلا صلاحيات
  for (const [user, existing] of [[e1User, foreignItem.id], [viewerB, foreignItem.id], [disburser, foreignItem.id], [stranger, foreignItem.id], [calc, gizaItem.id]]) {
    const outOfScope = await request(user, 'GET', `/payroll/items/${existing}`)
    const missing = await request(user, 'GET', `/payroll/items/${missingId}`)
    assert.equal(outOfScope.status, 404, `${user.displayName}: ${JSON.stringify(outOfScope.body)}`)
    assert.deepEqual(outOfScope, missing, `${user.displayName}: الردان متطابقان`)
    assert.deepEqual(outOfScope.body, { message: 'بند المسير غير موجود', error: 'Not Found', statusCode: 404 })
  }
  // ومن له الحق يقرأ عادي
  expectStatus(await request(approver, 'GET', `/payroll/items/${foreignItem.id}`), 200)
  expectStatus(await request(viewerB, 'GET', `/payroll/items/${gizaItem.id}`), 200)
  const own = await repo('PayrollItem').findOneByOrFail({ runId: runA.id, employeeId: e1.id })
  assert.equal(expectStatus(await request(e1User, 'GET', `/payroll/items/${own.id}`), 200).item.employeeId, e1.id)
}, { timeout: 120000 })
