// قرار المالك (20 سبتمبر): الموقوف يفضل في المسير ويتخصم أيام إيقافه بس، والمؤرشف بتاريخ آخر يوم عمل
// يظهر في مسير شهره بأجر أيامه وبعده يختفي، وراتب آخر شهر مصدره الوحيد بند المسير ويتصرف مع التصفية.
// كل الكتابات في قاعدة بيانات مؤقتة باسم عشوائي تُحذف في النهاية — لا مساس ببيانات الشركة.
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
const database = `hr_payroll_settle_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-settle-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07', startDate = '2026-06-23', endDate = '2026-07-22'
const nextPeriod = '2026-08'
let app, master, ds, base, admin, branchA, policyVersionId
let created = false, employeeNumber = 0, runNumber = 0
const repo = name => ds.getRepository(name)
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
  employeeId: user.employeeId ?? null, tokenVersion: 0, permissions: ['*'] })
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function employee(overrides = {}) {
  const emp = await repo('Employee').save({ employeeCode: `SET${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف اختبار التصفية ${employeeNumber}`, branchId: branchA.id, joinDate: '2020-01-01',
    basicSalary: 6000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', bankName: 'بنك الاختبار', iban: 'SA0000000000000000000000', ...overrides })
  // حضور ثابت: مفيش غياب ولا تأخير يشوّش على المطلوب اختباره
  const rows = []
  for (let time = Date.parse(`${startDate}T12:00:00Z`); time <= Date.parse(`${endDate}T12:00:00Z`); time += 86400000) {
    rows.push({ employeeId: emp.id, branchId: emp.branchId, date: new Date(time).toISOString().slice(0, 10),
      status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار التصفية',
      shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', workMinutes: 480,
      lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0 })
  }
  await repo('AttendanceDay').save(rows)
  return emp
}
const definition = (employees, extra = {}) => ({ period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
  name: `مسير اختبار التصفية ${++runNumber}`, ...extra })
async function calculate(employees, extra = {}) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', definition(employees, extra))
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
async function detail(runId) {
  const response = await request(admin, 'GET', `/payroll/runs/${runId}`)
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body
}
// المعاينة تأخذ نسخة سياسة منشورة والفلاتر (قراءة فقط)
async function preview(employees, extra = {}) {
  const response = await request(admin, 'POST', '/payroll/runs/membership-preview',
    { period, policyVersionId, name: `معاينة اختبار ${++runNumber}`,
      filters: { employeeIds: employees.map(emp => emp.id) }, ...extra })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  return response.body
}
// الاعتماد يتطلب إقرار تقرير «موظفون بلا مسير» وأسباب فروق التكافؤ (مغطاة في مجموعاتها)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function approveRun(run) {
  const report = await request(admin, 'GET', `/payroll/runs/${run.id}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(admin, 'POST', `/payroll/runs/${run.id}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
  await writeParityReasonsBeforeApproval(request, admin, 'POST', `/payroll/runs/${run.id}/approve`)
  return request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
}
const itemOf = (run, emp) => run.items.find(item => item.employeeId === emp.id)
const memberOf = (run, emp) => run.members.find(row => row.employeeId === emp.id)
const breakdownOf = item => JSON.parse(item.breakdown || '{}')

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_settle_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
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
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branchA = await repo('Branch').save({ code: 'SET_B1', name: 'فرع اختبار التصفية' })
  admin = await repo('User').save({ email: 'admin@payroll-settle.invalid', displayName: 'admin',
    passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: JSON.stringify([]) })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  ])
  // نسخة سياسة منشورة بدورة 23 — المعاينة تطلبها صراحةً
  const policy = await request(admin, 'POST', '/payroll/policies', { name: 'سياسة اختبار التصفية', effectiveFrom: startDate,
    settings: { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null } })
  assert.equal(policy.status, 201, JSON.stringify(policy.body))
  const version = policy.body.versions[0]
  const published = await request(admin, 'POST', `/payroll/policies/${policy.body.policy.id}/versions/${version.id}/publish`,
    { expectedRevision: version.revision, reason: 'نشر سياسة اختبار التصفية' })
  assert.equal(published.status, 200, JSON.stringify(published.body))
  policyVersionId = published.body.version.id
  // نفس المستخدم يحتسب ويعتمد — رخصة الشركة الصغيرة الموثقة (فصل المهام مختبر في مجموعته)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_settle_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const remaining = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(remaining.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) } finally { try { if (master) await master.close() } catch (error) { errors.push(error) } }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw errors[0]
}, { timeout: 120000 })

test('(أ) الموقوف عضو في المسير: أجر أيامه برّه الإيقاف، وأيام الإيقاف بس هي المخصومة', async () => {
  const emp = await employee({ status: 'suspended', isActive: false })
  await repo('EmployeeSuspension').save({ employeeId: emp.id, fromDate: '2026-07-01', toDate: '2026-07-05',
    plannedToDate: '2026-07-05', reason: 'تحقيق إداري اختباري', status: 'ACTIVE' })
  const run = await detail((await calculate([emp])).id)
  const item = itemOf(run, emp)
  assert.ok(item, 'الموقوف لازم يكون له بند في المسير')
  assert.equal(memberOf(run, emp).membershipStatus, 'INCLUDED')
  assert.equal(memberOf(run, emp).exclusionReason, null)
  const breakdown = breakdownOf(item)
  assert.equal(breakdown.coverDays, 30, 'تغطيته الشهر كامل؛ الإيقاف مش إنهاء خدمة')
  assert.equal(breakdown.suspension.days, 5)
  // 6000 ÷ 30 = 200 لليوم × 5 أيام إيقاف
  assert.equal(Number(item.unpaidLeaveDeduction), 1000)
  assert.equal(Number(item.basicSalary), 6000, 'أجر الشهر كامل قبل خصم أيام الإيقاف')
  assert.equal(Number(item.netPay), 5000)
  const suspensionLine = breakdown.leaveDeductionLines.find(line => line.code === 'SUSPENSION')
  assert.deepEqual([suspensionLine.days, suspensionLine.amount], [5, 1000])
  // حالة الإيقاف تظهر على صف الموظف في جدول المسير وفي المعاينة
  assert.equal(memberOf(run, emp).snapshot.suspensionNote, 'موقوف من 2026-07-01 إلى 2026-07-05 — رجع نشط من 2026-07-06')
  const view = await preview([emp])
  assert.equal(view.included[0].suspensionNote, 'موقوف من 2026-07-01 إلى 2026-07-05 — رجع نشط من 2026-07-06')
  assert.equal(view.totals.suspended, 1)
}, { timeout: 180000 })

test('(ب) المؤرشف بآخر يوم عمل موثق يظهر في شهره فقط، وبلا تاريخ يُستبعد بسبب واضح', async () => {
  const leaver = await employee({ status: 'archived', isActive: false })
  await repo('OffboardingCase').save({ employeeId: leaver.id, lastWorkingDay: '2026-07-10',
    status: 'IN_SETTLEMENT', terminationReason: 'resignation' })
  const run = await detail((await calculate([leaver])).id)
  const item = itemOf(run, leaver)
  assert.ok(item, 'المؤرشف بتاريخ آخر يوم عمل لازم يظهر في مسير شهره')
  const breakdown = breakdownOf(item)
  assert.deepEqual([breakdown.coverFrom, breakdown.coverTo, breakdown.coverDays], ['2026-06-23', '2026-07-10', 18])
  assert.equal(Number(item.basicSalary), 3600, '6000 × 18 ÷ 30')

  // الشهر التالي: ما يظهرش خالص
  const nextView = await preview([leaver], { period: nextPeriod })
  assert.equal(nextView.included.length, 0)
  assert.equal(nextView.excluded[0].code, 'EXC_TERMINATED_BEFORE_PERIOD')

  // مؤرشف بلا تاريخ آخر يوم عمل (المرحّلون من النظام القديم): مستبعد بسبب مفهوم
  const undocumented = await employee({ status: 'archived', isActive: false })
  const view = await preview([undocumented])
  assert.equal(view.excluded[0].code, 'EXC_ARCHIVED_NO_LAST_DAY')
  assert.equal(view.excluded[0].message, 'مؤرشف بلا تاريخ آخر يوم عمل — حدده عشان راتبه يتحسب')
}, { timeout: 180000 })

test('(ج) التصفية = المسير بالظبط، والمسير بيستبعده من المستحق للصرف وكشف البنك', async () => {
  const stayer = await employee()
  const leaver = await employee({ status: 'archived', isActive: false })
  const kase = await repo('OffboardingCase').save({ employeeId: leaver.id, lastWorkingDay: '2026-07-10',
    status: 'IN_SETTLEMENT', terminationReason: 'resignation' })
  const run = await detail((await calculate([stayer, leaver])).id)
  const leaverItem = itemOf(run, leaver), stayerItem = itemOf(run, stayer)
  const payout = breakdownOf(leaverItem).settlementPayout
  assert.deepEqual([payout.caseId, payout.lastWorkingDay, payout.label],
    [kase.id, '2026-07-10', 'تصفية — مصروف مع التصفية'])
  assert.equal(memberOf(run, leaver).snapshot.settlementPayout.caseId, kase.id)
  assert.equal(memberOf(run, stayer).snapshot.settlementPayout, null)

  // إجمالي المسير بيضم صف التصفية (تكلفة الشهر كاملة)
  assert.equal(Number(run.totalNet), Math.round((Number(leaverItem.netPay) + Number(stayerItem.netPay)) * 100) / 100)

  // المستحق للصرف وكشف البنك من غيره
  const payMethods = await request(admin, 'GET', `/payroll/runs/${run.id}/pay-methods`)
  assert.equal(payMethods.status, 200, JSON.stringify(payMethods.body))
  // تقرير طرق الصرف بيقسم البنك والنقدي بنفس أرقام كشف البنوك (تحويل كامل ⇒ كله بنك)
  assert.deepEqual(payMethods.body.transfer,
    { label: 'تحويل بنكي', count: 1, total: Number(stayerItem.netPay), bank: Number(stayerItem.netPay), cash: 0 })
  const sheet = await request(admin, 'GET', `/payroll/runs/${run.id}/bank-sheet`)
  assert.equal(sheet.status, 200, JSON.stringify(sheet.body))
  assert.deepEqual(sheet.body.rows.map(row => row.employeeId), [stayer.id])
  assert.equal(sheet.body.totals.net, Number(stayerItem.netPay))
  assert.deepEqual([sheet.body.settlement.employees, sheet.body.settlement.total], [1, Number(leaverItem.netPay)])

  // بند الراتب في التصفية = نفس رقم المسير بالظبط
  const recalc = await request(admin, 'POST', `/offboarding/${kase.id}/recalc-lines`)
  assert.equal(recalc.status, 201, JSON.stringify(recalc.body))
  const salaryLines = recalc.body.lines.filter(line => line.isAuto && line.label.startsWith('راتب آخر شهر'))
  assert.equal(salaryLines.length, 1, JSON.stringify(recalc.body.lines))
  assert.equal(Number(salaryLines[0].amount), Number(leaverItem.netPay))
  assert.equal(salaryLines[0].type, 'CREDIT')
  assert.equal(salaryLines[0].label, `راتب آخر شهر ${run.period} (مسير #${run.id}) — مصروف مع التصفية`)

  // اعتماد التصفية يرفض أي فرق: نغيّر البند يدويًا فيتمسك قبل القفل
  await repo('SettlementLine').update({ id: salaryLines[0].id }, { amount: Number(leaverItem.netPay) + 1 })
  const rejected = await request(admin, 'POST', `/offboarding/${kase.id}/approve-settlement`)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.match(rejected.body.message, /لا يطابق بند المسير/)
  await repo('SettlementLine').update({ id: salaryLines[0].id }, { amount: Number(leaverItem.netPay) })
  const approved = await request(admin, 'POST', `/offboarding/${kase.id}/approve-settlement`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))

  // وبعد قفل التصفية: أي فرق في المسير يوقف اعتماده قبل ما فلوس تتحرك (ولا صرف مرتين ولا راتب ضايع)
  await repo('SettlementLine').update({ id: salaryLines[0].id }, { amount: Number(leaverItem.netPay) + 5 })
  const blocked = await approveRun(run)
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body))
  assert.match(blocked.body.message, /لا يطابق راتب آخر شهر في تصفيته المعتمدة/)
  await repo('SettlementLine').update({ id: salaryLines[0].id }, { amount: Number(leaverItem.netPay) })
  const ok = await approveRun(run)
  assert.equal(ok.status, 201, JSON.stringify(ok.body))
}, { timeout: 240000 })
