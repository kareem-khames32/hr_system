// «بدل دوام أيام العطلات» على قاعدة SQL مؤقتة معزولة (synchronize) — لا تلمس hr_system:
// ترحيل 055 يطابق الكيان ويُعاد تشغيله بلا أثر، وأمر الموارد البشرية → قيد «بدل» في مسير الفترة بالساعات × سعر الساعة × المضاعف
// من غير أي خصم يوم العطلة، واللي ماجاش أو جه من نفسه مالوش حاجة، وإلغاء الأمر + إعادة الحساب يشيله، والمسير المعتمد ما يتغيرش،
// وطلب «دوام يوم عطلة» المعتمد بيتحسب بنفس الطريقة، وعزل الفرع.
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
const migrate = require('../scripts/db-migrate.cjs')
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
const database = `hr_holiday_work_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-holiday-work-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const FRIDAY = '2026-07-10', SATURDAY = '2026-07-11', THURSDAY = '2026-07-09', PERIOD = '2026-07'
let app, master, ds, base, admin, approver, hrA, hrB, branchA, branchB, deptA, deptA2, created = false, employeeNumber = 0, runNumber = 0
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
const breakdownOf = item => JSON.parse(item.breakdown || '{}')

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  await writeParityReasonsBeforeApproval(request, user, method, endpoint)
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
function expectStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.body))
  return response.body
}
async function employee(department, overrides = {}) {
  const n = ++employeeNumber
  return repo('Employee').save({ employeeCode: `HW${String(n).padStart(3, '0')}`, fingerprintCode: `HW${String(n).padStart(3, '0')}`, fullName: `موظف العطلة ${n}`,
    branchId: branchA.id, departmentId: department.id, joinDate: '2020-01-01', basicSalary: 9000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0,
    workNatureAllowance: 0, otherAllowance: 0, status: 'active', isActive: true, annualLeaveEntitled: false, payMethod: 'transfer', ...overrides })
}
async function punch(emp, date, start, end) {
  const punches = [[date, start], [date, end]].map(([day, clock]) => ({ employeeCode: emp.employeeCode, timestamp: new Date(`${day}T${clock}:00`).toISOString() }))
  expectStatus(await request(hrA, 'POST', '/attendance/punches/manual', { punches, reason: 'بصمات يوم عطلة في قاعدة اختبار معزولة' }), 201)
  return repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date })
}
async function calculate(employeeIds, extra = {}) {
  const run = expectStatus(await request(admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds,
    name: `مسير دوام العطلات ${++runNumber}`, ...extra }), 201)
  return { run, item: id => run.items.find(row => row.employeeId === id) }
}
const holidayObligations = employeeId => repo('EmployeeObligation').find({ where: { employeeId }, order: { id: 'ASC' } })
  .then(rows => rows.filter(row => String(row.sourceRef ?? '').startsWith('holiday_work:')))

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_holiday_work_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME,
    password: env.DB_PASSWORD, database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
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
  await fixtureSetup()
}, { timeout: 120000 })
async function fixtureSetup() {
  branchA = await repo('Branch').save({ code: 'HWA', name: 'فرع العطلة أ', country: 'HWA', weekendDays: 'FRI,SAT' })
  branchB = await repo('Branch').save({ code: 'HWB', name: 'فرع العطلة ب', country: 'HWB', weekendDays: 'FRI,SAT' })
  deptA = await repo('Department').save({ name: 'مخزن أ', code: 'HWDA', branchId: branchA.id })
  deptA2 = await repo('Department').save({ name: 'مبيعات أ', code: 'HWDA2', branchId: branchA.id })
  admin = await repo('User').save({ email: 'admin@holiday-work.invalid', displayName: 'admin', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  approver = await repo('User').save({ email: 'approver@holiday-work.invalid', displayName: 'approver', passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  const hrEmployee = await employee(deptA2, { fullName: 'موارد بشرية أ' })
  hrA = await repo('User').save({ email: 'hr-a@holiday-work.invalid', displayName: 'موارد بشرية أ', passwordHash: 'test-only', role: 'hr_manager',
    branchId: branchA.id, employeeId: hrEmployee.id, permissions: JSON.stringify(['attendance.manage', 'attendance.view_all', 'requests.view_all', 'payroll.view']) })
  hrB = await repo('User').save({ email: 'hr-b@holiday-work.invalid', displayName: 'موارد بشرية ب', passwordHash: 'test-only', role: 'hr_manager',
    branchId: branchB.id, permissions: JSON.stringify(['attendance.manage', 'attendance.view_all', 'requests.view_all']) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'attendance.grace_minutes', value: '0' }, { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  ])
}

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_holiday_work_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Holiday work fixture cleanup failed')
})

test('ترحيل 055 على القاعدة المؤقتة: الجدول بنفس أسماء قيود TypeORM (فرق مخطط صفر)، والإعداد والسلسلة والنوع، وإعادة التشغيل بلا أثر', async () => {
  // القاعدة المؤقتة فقط: نشيل الجدول اللي عمله synchronize ونبنيه من ملف الترحيل نفسه مرتين
  assert.equal(ds.options.database, database)
  await ds.query('DROP TABLE [holiday_work_orders]')
  const file = migrate.discover().find(entry => entry.version === '20260919_055_holiday_work')
  assert.ok(file, 'ملف الترحيل 055 موجود')
  assert.deepEqual(migrate.forbiddenStatements(file.content), [])
  for (let round = 0; round < 2; round++) for (const unit of migrate.executionUnits(file)) await ds.query(unit)
  const { upQueries } = await ds.driver.createSchemaBuilder().log()
  assert.deepEqual(upQueries.map(query => query.query).filter(text => text.includes('holiday_work')), [])
  const type = await repo('RequestType').findOneByOrFail({ code: 'HOLIDAY_WORK' })
  assert.equal(type.destinationHandler, 'holiday_work'); assert.equal(type.category, 'time_attendance')
  assert.deepEqual(JSON.parse(type.requiredFields), ['dates', 'reason'])
  const chain = await repo('ApprovalChain').findOneByOrFail({ id: type.approvalChainId })
  assert.equal(chain.code, 'CH_HOLIDAY_WORK')
  const steps = await repo('ApprovalStep').find({ where: { chainId: chain.id } })
  assert.deepEqual(steps.map(step => [step.stepOrder, step.approverRole]), [[1, 'hr']])
  assert.equal((await repo('RequestsConfig').findOneByOrFail({ key: 'attendance.holiday_work_multiplier' })).value, '1.5')
  assert.equal(await repo('RequestType').countBy({ code: 'HOLIDAY_WORK' }), 1)
  assert.equal(await repo('ApprovalChain').countBy({ code: 'CH_HOLIDAY_WORK' }), 1)
})

test('أمر دوام يوم عطلة: اللي جه ياخد بدل بساعات بصمته في مسير الفترة من غير أي خصم، واللي ماجاش أو جه من نفسه مالوش حاجة، وعزل الفرع', async () => {
  const came = await employee(deptA), absent = await employee(deptA), self = await employee(deptA2)
  const day = await punch(came, FRIDAY, '08:00', '14:30')
  assert.equal(day.status, 'holiday'); assert.equal(Number(day.workMinutes), 390)
  await punch(self, FRIDAY, '09:00', '13:00')
  const order = { name: 'جرد المخزن يوم الجمعة', targetLevel: 'departments', branchId: branchA.id, departmentIds: [deptA.id], dates: [FRIDAY] }

  // عزل الفرع: حساب فرع ب لا يأمر الشركة كلها ولا فرع أ، ويوم العمل العادي مرفوض
  assert.equal((await request(hrB, 'POST', '/attendance/holiday-work', { ...order, targetLevel: 'company' })).status, 403)
  assert.equal((await request(hrB, 'POST', '/attendance/holiday-work', order)).status, 403)
  const working = await request(hrA, 'POST', '/attendance/holiday-work', { ...order, dates: [THURSDAY] })
  assert.equal(working.status, 400, JSON.stringify(working.body)); assert.match(working.body.message, /يوم عمل عادي/)

  const createdOrder = expectStatus(await request(hrA, 'POST', '/attendance/holiday-work', order), 201).order
  assert.equal(createdOrder.multiplier, 1.5, 'المضاعف الافتراضي من الإعداد')
  assert.deepEqual(createdOrder.dates, [FRIDAY])
  // اليوم المغطى بأمر ما بيطلعش إضافي مكتشف (والكشف نفسه شغال: اللي جه من نفسه اتكشفله إضافي بيمشي في دورة اعتماده العادية)
  const active = entries => entries.filter(entry => ['DETECTED', 'SUBMITTED', 'APPROVED'].includes(entry.status))
  assert.equal(active(await repo('OvertimeEntry').find({ where: { employeeId: self.id, date: FRIDAY } })).length, 1, 'الكشف شغال في القاعدة المؤقتة')
  const liveOvertime = await repo('OvertimeEntry').find({ where: { employeeId: came.id, date: FRIDAY } })
  assert.ok(liveOvertime.length >= 1, 'كان فيه إضافي مكتشف قبل الأمر')
  assert.deepEqual(active(liveOvertime), [], 'الأمر لغى الإضافي المكتشف لليوم المغطى')
  const listed = expectStatus(await request(hrA, 'GET', '/attendance/holiday-work'), 200)
  const summary = listed.orders.find(row => row.id === createdOrder.id).summary
  assert.equal(summary.cameEmployees, 1); assert.equal(summary.totalHours, 6.5); assert.equal(summary.totalAmount, 365.62)
  assert.deepEqual(expectStatus(await request(hrB, 'GET', '/attendance/holiday-work'), 200).orders, [], 'فرع ب ما يشوفش أمر فرع أ')
  const detail = expectStatus(await request(hrA, 'GET', `/attendance/holiday-work/${createdOrder.id}`), 200).order
  assert.deepEqual(detail.rows.map(row => [row.employeeId, row.date, row.checkIn, row.checkOut, row.hours, row.amount, row.amountSource]),
    [[came.id, FRIDAY, '08:00', '14:30', 6.5, 365.62, 'ESTIMATE']])

  // المسير: 6.5 ساعة × (9000 ÷ 30 ÷ 8 = 37.5) × 1.5 = 365.625 → 365.62 في «إضافات أخرى» كقيد بدل
  const first = await calculate([came.id, absent.id, self.id])
  const cameItem = first.item(came.id), cameBreakdown = breakdownOf(cameItem)
  assert.equal(Number(cameItem.otherAdditions), 365.62)
  assert.deepEqual(cameBreakdown.holidayWork.lines.map(line => [line.date, line.status, line.hours, line.multiplier, line.amount, line.grantId]),
    [[FRIDAY, 'IN_RUN', 6.5, 1.5, 365.62, createdOrder.id]])
  assert.equal(cameBreakdown.holidayWork.total, 365.62)
  const [obligation] = await holidayObligations(came.id)
  assert.equal(obligation.type, 'CREDIT'); assert.equal(obligation.status, 'PENDING'); assert.equal(Number(obligation.amount), 365.62)
  assert.equal(obligation.targetPeriod, PERIOD); assert.match(obligation.label, /^بدل دوام أيام العطلات — 2026-07-10: 6\.5 ساعة × 1\.5/)
  assert.deepEqual(cameBreakdown.obligationLines.filter(line => line.type === 'CREDIT').map(line => [line.id, line.amount]), [[obligation.id, 365.62]])
  // لا تأخير ولا خروج مبكر ولا غياب ولا أي خصم يوم العطلة — للي جه وللي ماجاش
  for (const emp of [came, absent, self]) {
    const breakdown = breakdownOf(first.item(emp.id))
    assert.ok(!breakdown.absentDates.includes(FRIDAY), 'يوم العطلة مش غياب')
    const friday = breakdown.attendanceDeductions.days.find(row => row.date === FRIDAY)
    assert.ok(!friday || friday.totalAmount === 0, JSON.stringify(friday))
  }
  assert.equal(Number(first.item(absent.id).otherAdditions), 0, 'المستهدف اللي ماجاش مالوش بدل')
  assert.equal(breakdownOf(first.item(absent.id)).holidayWork.lines[0].code, 'NO_PUNCH')
  assert.equal(Number(first.item(self.id).otherAdditions), 0, 'اللي جه من نفسه من غير أمر مالوش بدل')
  assert.equal(breakdownOf(first.item(self.id)).holidayWork, undefined)
  // القسيمة: سطر البدل باسمه في تفصيل الإضافات
  const payslip = expectStatus(await request(admin, 'GET', `/payroll/items/${cameItem.id}`), 200)
  assert.ok(payslip.obligationDetails.some(line => line.type === 'CREDIT' && /بدل دوام أيام العطلات/.test(line.label) && line.amount === '365.62'))
  const afterCalc = expectStatus(await request(hrA, 'GET', `/attendance/holiday-work/${createdOrder.id}`), 200).order
  assert.deepEqual(afterCalc.rows.map(row => [row.amount, row.amountSource, row.payrollState]), [[365.62, 'PAYROLL', 'IN_DRAFT']])

  // إلغاء الأمر يلغي القيد المستحق، وإعادة حساب المسودة تشيل البدل
  expectStatus(await request(hrA, 'POST', `/attendance/holiday-work/${createdOrder.id}/cancel`, { reason: 'الجرد اتأجل' }), 201)
  assert.equal((await repo('EmployeeObligation').findOneByOrFail({ id: obligation.id })).status, 'CANCELLED')
  const recalculated = await calculate(undefined, { runId: first.run.id, employeeIds: [came.id, absent.id, self.id], reason: 'إلغاء أمر دوام الجمعة', name: undefined })
  assert.equal(Number(recalculated.item(came.id).otherAdditions), 0)

  // أمر جديد لنفس اليوم بمضاعف 2 → إعادة الحساب تبنيه، والاعتماد يحجزه، وإلغاء الأمر بعد الاعتماد ما يغيرش المسير المعتمد
  const second = expectStatus(await request(hrA, 'POST', '/attendance/holiday-work', { ...order, name: 'جرد الجمعة (مضاعف 2)', targetLevel: 'employees',
    employeeIds: [came.id], departmentIds: [], multiplier: '2' }), 201).order
  assert.equal(second.multiplier, 2)
  const again = await calculate(undefined, { runId: first.run.id, employeeIds: [came.id, absent.id, self.id], reason: 'أمر دوام جديد', name: undefined })
  assert.equal(Number(again.item(came.id).otherAdditions), 487.5, '6.5 × 37.5 × 2')
  const report = expectStatus(await request(approver, 'GET', `/payroll/runs/${first.run.id}/unassigned`), 200)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${first.run.id}/unassigned-ack`, { reportHash: report.reportHash }), 201)
  expectStatus(await request(approver, 'POST', `/payroll/runs/${first.run.id}/approve`), 201)
  const reserved = (await holidayObligations(came.id)).find(row => row.status === 'PENDING')
  assert.equal(reserved.reservedPayrollRunId, first.run.id)
  expectStatus(await request(hrA, 'POST', `/attendance/holiday-work/${second.id}/cancel`, { reason: 'بعد الاعتماد' }), 201)
  const still = await repo('EmployeeObligation').findOneByOrFail({ id: reserved.id })
  assert.equal(still.status, 'PENDING'); assert.equal(still.reservedPayrollRunId, first.run.id, 'القيد المحجوز لمسير معتمد ما يتلمسش')
  const approvedRun = expectStatus(await request(admin, 'GET', `/payroll/runs/${first.run.id}`), 200)
  assert.equal(approvedRun.status, 'APPROVED')
  assert.equal(Number(approvedRun.items.find(row => row.employeeId === came.id).otherAdditions), 487.5)
})

test('طلب «دوام يوم عطلة»: الموظف يقدّم على يوم اشتغله، وبعد اعتماد الموارد البشرية بيتحسب بدل من بصمته بنفس المعادلة', async () => {
  const emp = await employee(deptA2)
  const owner = await repo('User').save({ email: 'owner@holiday-work.invalid', displayName: emp.fullName, passwordHash: 'test-only', role: 'employee',
    branchId: branchA.id, employeeId: emp.id, permissions: '[]' })
  await punch(emp, SATURDAY, '09:00', '13:00')
  const tomorrow = new Date(Date.now() + 86400000)
  const future = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  const rejected = await request(owner, 'POST', '/requests', { typeCode: 'HOLIDAY_WORK', submit: true, payload: { dates: future, reason: 'يوم لسه ماجاش' } })
  assert.equal(rejected.status, 400, JSON.stringify(rejected.body)); assert.match(rejected.body.message, /لسه ماجاش/)
  const workday = await request(owner, 'POST', '/requests', { typeCode: 'HOLIDAY_WORK', submit: true, payload: { dates: THURSDAY, reason: 'يوم عمل عادي' } })
  assert.equal(workday.status, 400, JSON.stringify(workday.body)); assert.match(workday.body.message, /يوم عمل عادي/)
  const submitted = expectStatus(await request(owner, 'POST', '/requests', { typeCode: 'HOLIDAY_WORK', submit: true,
    payload: { dates: SATURDAY, reason: 'استلام شحنة المخزن يوم السبت' } }), 201)
  const activeOvertime = async () => (await repo('OvertimeEntry').find({ where: { employeeId: emp.id, date: SATURDAY } }))
    .filter(entry => ['DETECTED', 'SUBMITTED', 'APPROVED'].includes(entry.status)).length
  assert.equal(await activeOvertime(), 1, 'قبل الاعتماد: إضافي مكتشف عادي ليوم العطلة')
  const approved = expectStatus(await request(hrA, 'POST', `/requests/${submitted.id}/act`, { action: 'APPROVE', comment: 'الشحنة اتسلمت فعلًا' }), 201)
  assert.equal(approved.status, 'COMPLETED')
  assert.equal(await activeOvertime(), 0, 'بعد الاعتماد: اليوم بيتحسب بدل مش إضافي')
  const grant = await repo('HolidayWorkOrder').findOneByOrFail({ sourceRequestId: submitted.id })
  assert.equal(grant.kind, 'REQUEST'); assert.deepEqual(JSON.parse(grant.targetIds), [emp.id]); assert.deepEqual(JSON.parse(grant.dates), [SATURDAY])
  assert.equal(Number(grant.multiplier), 1.5)
  // 4 ساعات × 37.5 × 1.5 = 225
  const run = await calculate([emp.id])
  const item = run.item(emp.id), breakdown = breakdownOf(item)
  assert.equal(Number(item.otherAdditions), 225)
  assert.deepEqual(breakdown.holidayWork.lines.map(line => [line.date, line.status, line.grantKind, line.hours, line.amount]), [[SATURDAY, 'IN_RUN', 'REQUEST', 4, 225]])
  assert.ok(!breakdown.absentDates.includes(SATURDAY))
  const [obligation] = await holidayObligations(emp.id)
  assert.equal(obligation.sourceRequestId, submitted.id); assert.match(obligation.label, new RegExp(`طلب #${submitted.id}`))
  // الطلب المعتمد ظاهر في الشاشة كنوع «طلب»، وبيتلغي بس (مايتعدلش)
  const requests = expectStatus(await request(hrA, 'GET', '/attendance/holiday-work?kind=REQUEST'), 200).orders
  const row = requests.find(order => order.id === grant.id)
  assert.equal(row.canEdit, false); assert.equal(row.canCancel, true); assert.equal(row.summary.totalAmount, 225)
  assert.equal((await request(hrA, 'PATCH', `/attendance/holiday-work/${grant.id}`, { name: 'تعديل', targetLevel: 'employees', branchId: branchA.id,
    employeeIds: [emp.id], dates: [SATURDAY] })).status, 400)
})
