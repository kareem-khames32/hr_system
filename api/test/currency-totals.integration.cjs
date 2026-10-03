// B1.1: إجمالي لكل عملة — فرع مصري (جنيه) وفرع سعودي (ريال) في نفس الشهر ونفس المسير، على قاعدة SQL مؤقتة معزولة (synchronize).
// كل تقرير بيجمع الفرعين بيرجّع عملة كل صف، و«byCurrency» = نفس الإجماليات لكل عملة لوحدها، ومجموع العملتين = الإجمالي القديم بالظبط (مفيش تحويل).
// وحساب الفرع الواحد بياخد عملة واحدة زي الأول.
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
const database = `hr_currency_totals_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-currency-totals-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
let app, master, ds, base, created = false
const U = {}, B = {}, E = {}, R = {}
const PERIOD = '2026-08'
const repo = name => { assert.equal(ds.options.database, database); return ds.getRepository(name) }
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
    tokenVersion: user.tokenVersion ?? 0, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function get(user, endpoint) {
  const response = await fetch(base + endpoint, { headers: { Authorization: `Bearer ${token(user)}` } })
  const text = await response.text()
  assert.equal(response.status, 200, `${endpoint}: ${text}`)
  return text ? JSON.parse(text) : null
}
const cents = value => Math.round(Number(value) * 100)
const codes = list => (list ?? []).map(group => group.currency)
// مجموع حقل في byCurrency = نفس الحقل في الإجمالي العام بالقرش
const sumsTo = (byCurrency, pick, total, label) =>
  assert.equal(byCurrency.reduce((sum, group) => sum + cents(pick(group.totals)), 0), cents(total), `${label}: مجموع العملات = الإجمالي`)

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_currency_totals_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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

  for (const [key, value] of [['payroll.cycle_start_day', '23'], ['system.currency', 'SAR']]) {
    const row = await repo('RequestsConfig').findOneBy({ key })
    await repo('RequestsConfig').save(row ? { ...row, value } : { key, value })
  }
  B.eg = await repo('Branch').save({ code: 'CUR_EG', name: 'فرع القاهرة', country: 'EG', insuranceSystem: 'EGYPTIAN' })
  B.sa = await repo('Branch').save({ code: 'CUR_SA', name: 'فرع الرياض', country: 'SA', insuranceSystem: 'SAUDI' })
  const cc = await repo('CostCenter').save({ code: 'CUR1', name: 'مركز المشاريع المشترك' })
  const user = (email, role, branchId, permissions) => repo('User').save({ email, displayName: email, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions) })
  U.admin = await user('admin@currency.invalid', 'super_admin', null, ['*'])
  U.cairo = await user('hr-eg@currency.invalid', 'hr_manager', B.eg.id, ['reports.view', 'payroll.view'])
  const employee = (code, fullName, branchId, extra = {}) => repo('Employee').save({ employeeCode: code, fullName, branchId, costCenterId: cc.id,
    joinDate: '2020-01-01', basicSalary: 5000, housingAllowance: 1000, transportAllowance: 0, otherAllowance: 0, status: 'active', isActive: true,
    payMethod: 'transfer', bankName: 'بنك الاختبار', iban: 'SA0000000000000000000001', isGosiRegistered: true, ...extra })
  E.cairo = await employee('CUR001', 'منى المصرية', B.eg.id, { nationality: 'EG', currency: 'EGP' })
  E.riyadh = await employee('CUR002', 'سعد السعودي', B.sa.id, { nationality: 'SA', currency: 'SAR' })
  E.riyadh2 = await employee('CUR003', 'هند السعودية', B.sa.id, { nationality: 'SA', currency: 'SAR', payMethod: 'cash' })

  const snap = emp => ({ version: 1, capturedAt: '2026-08-01T00:00:00.000Z', employeeCode: emp.employeeCode, fullName: emp.fullName,
    branchId: emp.branchId, departmentId: null, teamId: null, costCenterId: cc.id, coverFrom: null, coverTo: null, coverDays: null, prorataFactor: null,
    monthlyDays: 30, basicSalary: 5000, allowances: 1000, gross: 6000, grossEarned: 6000 })
  const breakdown = JSON.stringify({ salaryComponents: [{ code: 'BASIC', earnedAmount: 5000 }, { code: 'HOUSING', earnedAmount: 1000 }] })
  R.mixed = await repo('PayrollRun').save({ status: 'APPROVED', period: PERIOD, scopeType: 'COMPANY', name: 'مسير الفرعين', startDate: '2026-07-23',
    endDate: '2026-08-22', totalNet: 0 })
  await repo('PayrollRunMember').save([E.cairo, E.riyadh, E.riyadh2].map(emp => ({ runId: R.mixed.id, employeeId: emp.id, snapshot: snap(emp) })))
  const item = (emp, money) => repo('PayrollItem').save({ runId: R.mixed.id, employeeId: emp.id, basicSalary: 5000, allowances: 1000, payMethod: emp.payMethod,
    breakdown, ...money })
  // المبالغ أرقام بس: الجنيه والريال مايتجمعوش في أي إجمالي
  await item(E.cairo, { overtimeAmount: 300, overtimeHours: 4, latenessDeduction: 100.25, netPay: 6199.75 })
  await item(E.riyadh, { overtimeAmount: 150.5, overtimeHours: 2, absenceDeduction: 200, netPay: 5950.5 })
  await item(E.riyadh2, { otherDeductions: 50, netPay: 5950 })
  await repo('PayrollRun').update({ id: R.mixed.id }, { totalNet: 18100.25 })

  // سلفة في كل فرع: قسط مستحق جوه الشهر
  for (const [emp, amount] of [[E.cairo, 800], [E.riyadh, 1200]]) {
    const loan = await repo('Loan').save({ employeeId: emp.id, amount, status: 'DISBURSED' })
    await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-08-10', amount, paid: false, paidAmount: '0.00', financialStatus: 'DUE', financialRevision: 1 })
  }
}, { timeout: 120000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_currency_totals_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try { fs.rmSync(uploads, { recursive: true, force: true }) } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Currency totals fixture cleanup failed')
})

test('B1.1: التقارير المالية — كل صف بعملة فرعه، والإجمالي لكل عملة لوحده ومجموعهم = الإجمالي العام', async () => {
  const register = await get(U.admin, `/reports/financial/payroll-register?period=${PERIOD}`)
  assert.deepEqual(Object.fromEntries(register.rows.map(row => [row.employeeId, row.currency])), { [E.cairo.id]: 'EGP', [E.riyadh.id]: 'SAR', [E.riyadh2.id]: 'SAR' })
  assert.deepEqual(codes(register.byCurrency), ['EGP', 'SAR'])
  assert.deepEqual(register.byCurrency.map(group => [group.totals.headcount, group.totals.net]), [[1, '6199.75'], [2, '11900.50']])
  for (const field of ['net', 'gross', 'totalDeductions', 'overtime']) sumsTo(register.byCurrency, totals => totals[field], register.totals[field], `register.${field}`)

  const cost = await get(U.admin, `/reports/financial/payroll-cost?period=${PERIOD}`)
  assert.deepEqual(cost.byBranch.map(group => [group.name, group.currency]).sort(), [['فرع الرياض', 'SAR'], ['فرع القاهرة', 'EGP']])
  assert.deepEqual(codes(cost.byCurrency), ['EGP', 'SAR'])
  sumsTo(cost.byCurrency, totals => totals.net, cost.totals.net, 'cost.net')

  const deductions = await get(U.admin, `/reports/financial/deductions?period=${PERIOD}`)
  assert.deepEqual(codes(deductions.byCurrency), ['EGP', 'SAR'])
  sumsTo(deductions.byCurrency, totals => totals.amount, deductions.totals.amount, 'deductions.amount')
  assert.equal(deductions.employees.find(row => row.employeeId === E.cairo.id).currency, 'EGP')

  const overtime = await get(U.admin, `/reports/financial/overtime?period=${PERIOD}`)
  assert.deepEqual(overtime.byCurrency.map(group => [group.currency, group.totals.amount]), [['EGP', '300.00'], ['SAR', '150.50']])
  sumsTo(overtime.byCurrency, totals => totals.amount, overtime.totals.amount, 'overtime.amount')

  const loans = await get(U.admin, `/reports/financial/loans?period=${PERIOD}`)
  assert.deepEqual(loans.byCurrency.map(group => [group.currency, group.totals.dueAmount]), [['EGP', '800.00'], ['SAR', '1200.00']])
  sumsTo(loans.byCurrency, totals => totals.outstanding, loans.totals.outstanding, 'loans.outstanding')

  const centers = await get(U.admin, `/reports/cost-centers?period=${PERIOD}`)
  const [center] = centers.centers
  assert.equal(center.currency, null, 'مركز على فرعين بعملتين: مفيش عملة واحدة للمركز')
  assert.deepEqual(codes(centers.byCurrency), ['EGP', 'SAR'])
  sumsTo(centers.byCurrency, totals => totals.net, centers.totals.net, 'centers.net')

  // حساب فرع القاهرة: عملة واحدة زي الأول
  const cairo = await get(U.cairo, `/reports/financial/payroll-register?period=${PERIOD}`)
  assert.deepEqual([codes(cairo.byCurrency), cairo.rows.map(row => row.currency), cairo.totals.net], [['EGP'], ['EGP'], '6199.75'])
})

test('B1.1: تقرير المسيرات والصرف وكشف البنوك والتأمينات — صافي المسير وكل إجمالي لكل عملة', async () => {
  const runs = await get(U.admin, '/reports/payroll')
  const run = runs.runs.find(row => row.id === R.mixed.id)
  assert.deepEqual(run.netByCurrency, [{ currency: 'EGP', totalNet: '6199.75' }, { currency: 'SAR', totalNet: '11900.50' }])
  assert.equal(run.netByCurrency.reduce((sum, part) => sum + cents(part.totalNet), 0), cents(run.totalNet))
  assert.deepEqual(runs.byMethod.map(row => [row.payMethod, row.currency, row.count, row.total]).sort(),
    [['cash', 'SAR', 1, '5950.00'], ['transfer', 'EGP', 1, '6199.75'], ['transfer', 'SAR', 1, '5950.50']])
  assert.deepEqual(runs.deductions.map(row => [row.period, row.currency, row.net]), [[PERIOD, 'EGP', '6199.75'], [PERIOD, 'SAR', '11900.50']])

  const view = await get(U.admin, `/payroll/disbursement/runs/${R.mixed.id}`)
  assert.deepEqual(Object.fromEntries(view.rows.map(row => [row.employeeId, row.currency])), { [E.cairo.id]: 'EGP', [E.riyadh.id]: 'SAR', [E.riyadh2.id]: 'SAR' })
  assert.deepEqual(view.byCurrency.map(group => [group.currency, group.totals.payable.total]), [['EGP', 6199.75], ['SAR', 11900.5]])
  assert.equal(view.byCurrency.reduce((sum, group) => sum + cents(group.totals.payable.total), 0), cents(view.totals.payable.total))
  const summary = await get(U.admin, `/payroll/disbursement/summary?period=${PERIOD}`)
  assert.deepEqual([codes(summary.byCurrency), codes(summary.runs.find(row => row.id === R.mixed.id).byCurrency)], [['EGP', 'SAR'], ['EGP', 'SAR']])

  const sheet = await get(U.admin, `/payroll/runs/${R.mixed.id}/bank-sheet`)
  assert.deepEqual(sheet.byCurrency.map(group => [group.currency, group.totals.net, group.totals.bank, group.totals.cash]), [['EGP', 6199.75, 6199.75, 0], ['SAR', 11900.5, 5950.5, 5950]])
  assert.deepEqual(sheet.byCurrency.map(group => group.totals.banks.map(bank => [bank.bankName, bank.total])), [[['بنك الاختبار', 6199.75]], [['بنك الاختبار', 5950.5]]])
  assert.equal(sheet.banks[0].currency, null, 'بنك عليه موظفين بعملتين: إجماليه العام مالوش عملة واحدة')
  assert.equal(sheet.rows.find(row => row.employeeId === E.riyadh.id).currency, 'SAR')

  const gosi = await get(U.admin, `/social-insurance/report?period=${PERIOD}`)
  assert.deepEqual(Object.fromEntries(gosi.rows.map(row => [row.employeeId, row.currency])), { [E.cairo.id]: 'EGP', [E.riyadh.id]: 'SAR', [E.riyadh2.id]: 'SAR' })
  assert.deepEqual(codes(gosi.byCurrency), ['EGP', 'SAR'])
  sumsTo(gosi.byCurrency, totals => totals.total, gosi.totals.total, 'gosi.total')
})

test('B1.1: «مسيرات بانتظار اعتمادي» ومراجعة المعتمد — صافي المسير وإجمالياته لكل عملة', async () => {
  const reviewer = await repo('User').save({ email: 'reviewer@currency.invalid', displayName: 'مراجع الفرعين', passwordHash: 'test-only', role: 'hr_manager',
    branchId: null, permissions: '[]' })
  const put = await fetch(`${base}/payroll/approval-chain/config/company`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(U.admin)}` },
    body: JSON.stringify({ steps: [{ kind: 'USER', userId: reviewer.id, label: 'مراجع' }] }) })
  assert.equal(put.status, 200, await put.text())
  const pending = await repo('PayrollRun').save({ status: 'CALCULATED', period: PERIOD, scopeType: 'COMPANY', name: 'مسير الفرعين للاعتماد', startDate: '2026-07-23',
    endDate: '2026-08-22', totalNet: 2000.75 })
  for (const [emp, netPay] of [[E.cairo, 1000.25], [E.riyadh, 1000.5]]) {
    await repo('PayrollRunMember').save({ runId: pending.id, employeeId: emp.id, snapshot: { version: 1, employeeCode: emp.employeeCode, fullName: emp.fullName, branchId: emp.branchId,
      departmentId: null, teamId: null, costCenterId: null } })
    await repo('PayrollItem').save({ runId: pending.id, employeeId: emp.id, basicSalary: netPay, allowances: 0, payMethod: 'transfer', netPay })
  }
  const waiting = (await get(reviewer, '/payroll/approval-chain/my-pending')).find(row => row.runId === pending.id)
  assert.deepEqual(waiting.netByCurrency, [{ currency: 'EGP', totalNet: 1000.25 }, { currency: 'SAR', totalNet: 1000.5 }])
  const review = await get(reviewer, `/payroll/approval-chain/runs/${pending.id}/review`)
  assert.deepEqual(review.byCurrency.map(group => [group.currency, group.totals.employees, group.totals.net]), [['EGP', 1, 1000.25], ['SAR', 1, 1000.5]])
  assert.equal(review.totals.net, 2000.75, 'الإجمالي القديم زي ما هو للتوافق')
  assert.deepEqual(Object.fromEntries(review.rows.map(row => [row.employeeId, row.currency])), { [E.cairo.id]: 'EGP', [E.riyadh.id]: 'SAR' })
})
