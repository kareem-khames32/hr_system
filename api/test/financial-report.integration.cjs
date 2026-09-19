// التقارير المالية لشهر رواتب على قاعدة SQL مؤقتة معزولة (synchronize):
// كشف الرواتب/ملخص التكلفة/الخصومات/الإضافي/السلف من /reports/financial/*: المعتمد والمصروف بس (والمحسوب بالاختيار)، الفرع والقسم ومركز التكلفة
// من لقطة المسير، البند المعكوس مش محسوب، تفصيل البدلات والقيود من التفصيل المحفوظ، وحساب الفرع يشوف فرعه بس ومن غير صلاحية الرواتب ممنوع.
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
const database = `hr_financial_report_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-financial-report-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const U = {}, B = {}, D = {}, CC = {}, E = {}, R = {}
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, endpoint) {
  const response = await fetch(base + endpoint, { headers: { Authorization: `Bearer ${token(user)}` } })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectOk = response => { assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body }

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_financial_report_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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

  const config = await repo('RequestsConfig').findOneBy({ key: 'payroll.cycle_start_day' })
  if (config) await repo('RequestsConfig').save({ ...config, value: '23' })
  else await repo('RequestsConfig').save({ key: 'payroll.cycle_start_day', value: '23' })

  B.a = await repo('Branch').save({ code: 'FR_A', name: 'فرع أ' })
  B.b = await repo('Branch').save({ code: 'FR_B', name: 'فرع ب' })
  D.sales = await repo('Department').save({ name: 'المبيعات', branchId: B.a.id })
  D.accounts = await repo('Department').save({ name: 'الحسابات', branchId: B.a.id })
  CC.projects = await repo('CostCenter').save({ code: 'P1', name: 'المشاريع' })
  const user = (email, role, branchId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@fr.invalid', 'super_admin', null, ['*'])
  U.branchA = await user('hr-a@fr.invalid', 'hr_manager', B.a.id, ['reports.view', 'payroll.view'])
  U.noPayroll = await user('rep@fr.invalid', 'hr_manager', B.a.id, ['reports.view'])
  const employee = (code, fullName, branchId, departmentId, costCenterId, extra = {}) => repo('Employee').save({ employeeCode: code, fullName, branchId, departmentId,
    costCenterId, joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 1000, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'transfer', ...extra })
  E.one = await employee('EMP9001', 'أحمد', B.a.id, D.sales.id, CC.projects.id, { payMethod: 'mixed', bankTransferAmount: 4000 })
  // ملفه الحالي في الحسابات، ولقطة المسير في المبيعات ⇒ يتحسب في المبيعات
  E.two = await employee('EMP9002', 'بسمة', B.a.id, D.accounts.id, null, { payMethod: 'cash' })
  E.three = await employee('EMP9003', 'كريم', B.b.id, null, null)
  E.four = await employee('EMP9004', 'دينا', B.a.id, D.sales.id, null)

  const run = (status, period, scopeType, extra = {}) => repo('PayrollRun').save({ status, period, scopeType, startDate: '2026-07-23', endDate: '2026-08-22', ...extra })
  const snap = (emp, branchId, departmentId, costCenterId) => ({ version: 1, capturedAt: '2026-08-01T00:00:00.000Z', employeeCode: emp.employeeCode, fullName: emp.fullName,
    branchId, departmentId, teamId: null, costCenterId, coverFrom: null, coverTo: null, coverDays: null, prorataFactor: null, monthlyDays: 30,
    basicSalary: 5000, allowances: 1000, gross: 6000, grossEarned: 6000 })
  const components = JSON.stringify([{ code: 'BASIC', earnedAmount: 5000 }, { code: 'HOUSING', earnedAmount: 1000 }])
  const item = (runId, emp, money, breakdown = {}) => repo('PayrollItem').save({ runId, employeeId: emp.id, basicSalary: 5000, allowances: 1000, payMethod: 'transfer',
    ...money, breakdown: JSON.stringify({ salaryComponents: JSON.parse(components), ...breakdown }) })

  const obligation = (emp, type, category, amount, label) => repo('EmployeeObligation').save({ employeeId: emp.id, type, category, amount, label, status: 'APPLIED' })
  const meal = await obligation(E.one, 'CREDIT', 'allowance', 300, 'بدل وجبة')
  const fine = await obligation(E.two, 'DEBIT', 'typed_deduction', 120, 'خصم')
  const custody = await obligation(E.two, 'DEBIT', 'custody_shortfall', 80, 'عجز عهدة')
  // بدل دوام أيام العطلات: قيد «بدل» دائن مصدره holiday_work:… ⇒ عموده الخاص مش مع البدلات الإضافية
  const holiday = await repo('EmployeeObligation').save({ employeeId: E.one.id, type: 'CREDIT', category: 'allowance', amount: 150, label: 'بدل دوام أيام العطلات',
    status: 'APPLIED', sourceRef: 'holiday_work:1:2026-08-01' })

  R.approved = await run('APPROVED', '2026-08', 'COMPANY', { name: 'مسير أغسطس' })
  await repo('PayrollRunMember').save([
    { runId: R.approved.id, employeeId: E.one.id, snapshot: snap(E.one, B.a.id, D.sales.id, CC.projects.id) },
    { runId: R.approved.id, employeeId: E.two.id, snapshot: snap(E.two, B.a.id, D.sales.id, null) },
    { runId: R.approved.id, employeeId: E.four.id, snapshot: snap(E.four, B.a.id, D.sales.id, null) },
  ])
  await item(R.approved.id, E.one, { otherAdditions: 450, overtimeAmount: 250.5, overtimeHours: 4.5, latenessDeduction: 100.1, loanInstallments: 500,
    socialInsuranceDeduction: 487.5, netPay: 5612.9 }, {
    obligationLines: [{ id: meal.id, type: 'CREDIT', amount: 300, collected: 300, carried: 0, typed: false },
      { id: holiday.id, type: 'CREDIT', amount: 150, collected: 150, carried: 0, typed: false }], overtimeEntryIds: [1, 2],
    socialInsurance: { applies: true, employeeShare: 487.5, employerShare: 587.5 } })
  await item(R.approved.id, E.two, { otherDeductions: 200, unpaidLeaveDeduction: 400, netPay: 5400 }, {
    obligationLines: [{ id: fine.id, type: 'DEBIT', amount: 120, collected: 120, carried: 0, typed: true }, { id: custody.id, type: 'DEBIT', amount: 80, collected: 80, carried: 0, typed: false }],
    leaveDeductionLines: [{ code: 'UNPAID_LEAVE', amount: 200 }, { code: 'SUSPENSION', amount: 200 }] })
  const reversedItem = await item(R.approved.id, E.four, { netPay: 6000 })
  const reversal = await run('PAID', '2026-08', 'CUSTOM', { runType: 'REVERSAL', parentRunId: R.approved.id })
  await repo('PayrollRunReversalLine').save({ reversalRunId: reversal.id, originalRunId: R.approved.id, originalItemId: reversedItem.id, employeeId: E.four.id,
    status: 'POSTED', netPay: 6000, itemSnapshot: '{}', itemHash: 'x'.repeat(64), createdByUserId: U.admin.id })
  // مسير قديم بلا لقطات: الفرع والقسم من ملف الموظف، وبند بلا تفصيل
  R.legacy = await run('PAID', '2026-08', 'BRANCH', { branchId: B.b.id, scopeIds: JSON.stringify([B.b.id]) })
  await repo('PayrollItem').save({ runId: R.legacy.id, employeeId: E.three.id, basicSalary: 5000, allowances: 1000, otherDeductions: 10.01, netPay: 5989.99, payMethod: 'transfer' })
  R.draft = await run('CALCULATED', '2026-08', 'BRANCH', { branchId: B.a.id, scopeIds: JSON.stringify([B.a.id]), name: 'مسودة' })
  await item(R.draft.id, E.four, { netPay: 1234.56, basicSalary: 234.56, allowances: 1000 })
  const cancelled = await run('CANCELLED', '2026-08', 'CUSTOM')
  await item(cancelled.id, E.one, { netPay: 9999 })
  const otherMonth = await run('APPROVED', '2026-07', 'COMPANY', { startDate: '2026-06-23', endDate: '2026-07-22' })
  await item(otherMonth.id, E.one, { netPay: 7777 })

  // سلفة: قسط اتسدد قبل الشهر، وقسط مستحق جوه الشهر، وقسط بعده
  const loan = await repo('Loan').save({ employeeId: E.one.id, amount: 1500, status: 'DISBURSED' })
  await repo('LoanInstallment').save([
    { loanId: loan.id, dueDate: '2026-07-10', amount: 500, paid: true, paidAmount: '500.00', financialStatus: 'PAID', financialRevision: 1 },
    { loanId: loan.id, dueDate: '2026-08-10', amount: 500, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 },
    { loanId: loan.id, dueDate: '2026-09-10', amount: 500, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 },
  ])
  const otherBranchLoan = await repo('Loan').save({ employeeId: E.three.id, amount: 900, status: 'DISBURSED' })
  await repo('LoanInstallment').save({ loanId: otherBranchLoan.id, dueDate: '2026-08-15', amount: 900, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 })
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_financial_report_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Financial report fixture cleanup failed')
})

test('كشف الرواتب: معتمد/مصروف بس، الشهر بحدوده، البدلات والقيود بتصنيفها، المعكوس والملغى والشهر التاني برا', async () => {
  const report = expectOk(await request(U.admin, '/reports/financial/payroll-register?period=2026-08'))
  assert.deepEqual([report.period, report.startDate, report.endDate], ['2026-08', '2026-07-23', '2026-08-22'])
  assert.deepEqual(report.runs.map(run => run.id).sort(), [R.approved.id, R.legacy.id].sort())
  assert.deepEqual(report.pendingRuns.map(run => [run.id, run.status]), [[R.draft.id, 'CALCULATED']])
  assert.deepEqual(report.rows.map(row => row.employeeCode), ['EMP9001', 'EMP9002', 'EMP9003'])
  const [one, two, three] = report.rows
  assert.equal(one.departmentName, 'المبيعات')
  assert.equal(two.departmentName, 'المبيعات') // من لقطة المسير
  assert.equal(three.branchName, 'فرع ب')
  assert.equal(one.costCenterName, 'المشاريع')
  assert.deepEqual(one.allowanceBuckets, { HOUSING: '1000.00', UNSPLIT: '0.00' })
  assert.deepEqual(three.allowanceBuckets, { HOUSING: '0.00', UNSPLIT: '1000.00' })
  assert.equal(one.additions.allowance, '300.00')
  assert.equal(one.holidayWork, '150.00')
  assert.deepEqual([one.overtime, one.overtimeMinutes, one.gross, one.net], ['250.50', 270, '6700.50', '5612.90'])
  assert.deepEqual([one.deductions.LATENESS, one.deductions.LOANS, one.deductions.SOCIAL_INSURANCE, one.totalDeductions], ['100.10', '500.00', '487.50', '1087.60'])
  assert.deepEqual([one.bank, one.cash, one.employerInsurance], ['4000.00', '1612.90', '587.50'])
  assert.deepEqual([two.deductions.TYPED, two.deductions.OTHER_DEBITS, two.deductions.UNPAID_LEAVE, two.deductions.SUSPENSION], ['120.00', '80.00', '200.00', '200.00'])
  assert.deepEqual([two.bank, two.cash], ['0.00', '5400.00'])
  assert.equal(three.deductions.OTHER_DEBITS, '10.01')
  assert.equal(report.totals.headcount, 3)
  assert.equal(report.totals.net, '17002.89')
  assert.equal(report.totals.gross, '18700.50')
  assert.equal(report.totals.holidayWork, '150.00')
  assert.deepEqual(report.columns.additions.map(column => [column.key, column.total]), [['allowance', '300.00']])
  assert.equal(report.totals.totalDeductions, '1697.61')
  assert.equal(report.totals.employerInsurance, '587.50')

  const withDraft = expectOk(await request(U.admin, '/reports/financial/payroll-register?period=2026-08&includeDraft=true'))
  assert.equal(withDraft.totals.headcount, 4)
  assert.equal(withDraft.pendingRuns.length, 0)
  assert.equal(withDraft.totals.net, '18237.45')

  const sales = expectOk(await request(U.admin, `/reports/financial/payroll-register?period=2026-08&departmentId=${D.sales.id}`))
  assert.deepEqual(sales.rows.map(row => row.employeeCode), ['EMP9001', 'EMP9002'])
  const center = expectOk(await request(U.admin, `/reports/financial/payroll-register?period=2026-08&costCenterId=${CC.projects.id}`))
  assert.deepEqual(center.rows.map(row => row.employeeCode), ['EMP9001'])
  assert.equal((await request(U.admin, '/reports/financial/payroll-register?period=2026-13')).status, 400)
  const july = expectOk(await request(U.admin, '/reports/financial/payroll-register?period=2026-07'))
  assert.equal(july.totals.net, '7777.00')
})

test('ملخص التكلفة والخصومات والإضافي من نفس البنود', async () => {
  const cost = expectOk(await request(U.admin, '/reports/financial/payroll-cost?period=2026-08'))
  assert.deepEqual(cost.byBranch.map(group => [group.name, group.headcount, group.gross, group.net]), [['فرع أ', 2, '12700.50', '11012.90'], ['فرع ب', 1, '6000.00', '5989.99']])
  assert.equal(cost.byBranch[0].employerInsurance, '587.50')
  assert.equal(cost.byBranch[0].totalCost, '13288.00')
  assert.equal(cost.byBranch[0].holidayWork, '150.00')
  assert.equal(cost.byBranch[0].overtime, '250.50')
  assert.deepEqual(cost.byDepartment.map(group => [group.name, group.headcount]), [['المبيعات', 2], ['بدون قسم', 1]])

  const deductions = expectOk(await request(U.admin, '/reports/financial/deductions?period=2026-08'))
  const kind = key => deductions.kinds.find(row => row.key === key)
  assert.deepEqual([kind('TYPED').amount, kind('OTHER_DEBITS').amount, kind('OTHER_DEBITS').employees], ['120.00', '90.01', 2])
  assert.deepEqual(deductions.typedByType, [{ name: 'خصم', amount: '120.00', employees: 1 }])
  assert.deepEqual(deductions.otherByCategory.map(row => [row.name, row.amount]), [['خصومات غير مفصلة', '10.01'], ['عجز عهدة', '80.00']])
  assert.deepEqual(deductions.totals, { amount: '1697.61', employees: 3 })

  const overtime = expectOk(await request(U.admin, '/reports/financial/overtime?period=2026-08'))
  assert.deepEqual(overtime.employees.map(row => [row.employeeCode, row.entries, row.minutes, row.amount, row.holidayWork]), [['EMP9001', 2, 270, '250.50', '150.00']])
  assert.deepEqual(overtime.departments.map(row => [row.name, row.minutes]), [['المبيعات', 270]])
})

test('السلف: الرصيد القائم وقسط الشهر والمخصوم في المسير', async () => {
  const loans = expectOk(await request(U.admin, '/reports/financial/loans?period=2026-08'))
  assert.deepEqual(loans.employees.map(row => row.employeeCode), ['EMP9001', 'EMP9003'])
  const [one] = loans.employees
  assert.deepEqual([one.principal, one.paid, one.outstanding, one.dueCount, one.dueAmount, one.dueRemaining, one.deductedInPayroll],
    ['1500.00', '500.00', '1000.00', 1, '500.00', '500.00', '500.00'])
  assert.equal(loans.totals.outstanding, '1900.00')
  const own = expectOk(await request(U.branchA, '/reports/financial/loans?period=2026-08'))
  assert.deepEqual(own.employees.map(row => row.employeeCode), ['EMP9001'])
})

test('حساب الفرع يشوف فرعه بس، ومن غير صلاحية الرواتب ممنوع', async () => {
  const own = expectOk(await request(U.branchA, '/reports/financial/payroll-register?period=2026-08'))
  assert.equal(own.branchId, B.a.id)
  assert.deepEqual(own.rows.map(row => row.employeeCode), ['EMP9001', 'EMP9002'])
  assert.ok(own.runs.every(run => run.id !== R.legacy.id))
  assert.equal((await request(U.branchA, `/reports/financial/payroll-cost?period=2026-08&branchId=${B.b.id}`)).status, 403)
  for (const report of ['payroll-register', 'payroll-cost', 'deductions', 'loans', 'overtime']) {
    assert.equal((await request(U.noPayroll, `/reports/financial/${report}?period=2026-08`)).status, 403, report)
  }
  // بدون شهر: الخادم يختار شهر الرواتب الجاري ويرجّعه بحدوده
  const current = expectOk(await request(U.admin, '/reports/financial/overtime'))
  assert.match(current.period, /^\d{4}-\d{2}$/)
  assert.ok(current.startDate < current.endDate)
})
