'use strict'
// B4.4 (أ) — معاينة ضريبة كسب العمل لمسير على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_eg_salary_tax_test_<16 hex> — من غير مساس بقاعدة الشركة):
//  EG-01) مسير حقيقي لفرع مصري: راتب 15,000 مؤمَّن عليه كله ← صافي 13,350 ← ضريبة 1,482.50 (مثال C-EG-01)، وموظف الفرع السعودي برّه المعاينة،
//         والمتعيّن في نص الشهر بأيامه، وبند «مش خاضع» بيخرج من الوعاء — **والمعاينة مابتكتبش حاجة**.
//  EG-02) الصلاحية والنطاق: من غير عرض الرواتب 403، وحساب فرع تاني 404 زي أي مسير برّه نطاقه؛ وشرائح مش متسجّلة لتاريخ الفترة = مش متاحة.
// Run (من api/): node --test test/eg-salary-tax.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_eg_salary_tax_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_eg_salary_tax_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-eg-salary-tax-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const rules = require('../src/payroll/eg-salary-tax.service')
const PERIOD = '2026-08'
let app, master, ds, base, created = false, employeeNumber = 0
const org = {}, users = {}, state = {}

function assertDisposable() {
  assert.match(database, NAME); assert.notEqual(database, env.DB_DATABASE)
  if (ds) assert.equal(ds.options.database, database)
}
const repo = name => { assertDisposable(); return ds.getRepository(name) }
const token = user => jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null, employeeId: user.employeeId ?? null,
  tokenVersion: user.tokenVersion ?? 0, scopeAllBranches: user.scopeAllBranches ?? false, permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
async function request(user, method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
const expectStatus = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.body)); return response.body }
async function employee(branch, overrides = {}) {
  const n = ++employeeNumber
  const emp = await repo('Employee').save({ employeeCode: `EGT${String(n).padStart(3, '0')}`, fullName: `موظف الضريبة ${n}`, nationality: 'مصري', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 15000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, gosiBaseSalary: 15000, isGosiRegistered: true,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  // استثناء حضور يعزل الحساب عن الغياب والتأخير
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'نافذة اختبار الضريبة المعزولة', status: 'APPROVED',
    createdByUserId: users.admin.id, approvedByUserId: users.admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false })
  return emp
}
const preview = (user, runId) => request(user, 'GET', `/payroll/runs/${runId}/eg-tax-preview`)
const snapshot = async () => JSON.stringify([
  await ds.query('SELECT [id], [runId], [employeeId], CONVERT(varchar(40), [netPay]) AS [netPay], [breakdown] FROM [payroll_items] ORDER BY [id]'),
  await ds.query('SELECT [id], [status], CONVERT(varchar(40), [totalNet]) AS [totalNet] FROM [payroll_runs] ORDER BY [id]'),
  (await ds.query('SELECT COUNT(*) AS [n] FROM [audit_log]'))[0].n, (await ds.query('SELECT COUNT(*) AS [n] FROM [employee_obligations]'))[0].n,
  await ds.query('SELECT [key], [value] FROM [requests_config] ORDER BY [key]'),
])

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assertDisposable()
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433), user: env.DB_USERNAME, password: env.DB_PASSWORD,
    database: 'master', options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`); created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  // مفيش رسالة بريد حقيقية بتطلع من الاختبار
  const { MailService } = require('../src/auth/mail.service')
  const mail = app.get(MailService)
  mail.isConfigured = () => false
  mail.send = async () => { throw new Error('no mail in tests') }
  assert.notEqual(mail.send, MailService.prototype.send)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  for (const job of app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry).getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assertDisposable()
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`

  org.cairo = await repo('Branch').save({ code: 'EGT_CAI', name: 'فرع القاهرة', country: 'EG', insuranceSystem: 'EGYPTIAN' })
  org.riyadh = await repo('Branch').save({ code: 'EGT_RUH', name: 'فرع الرياض', country: 'SA', insuranceSystem: 'NONE' })
  const user = (label, role, branchId, permissions) => repo('User').save({ email: `${label}@eg-salary-tax.invalid`, displayName: label, passwordHash: 'test-only', role, branchId,
    permissions: JSON.stringify(permissions), isActive: true })
  users.admin = await user('admin', 'super_admin', null, [])
  users.payrollCairo = await user('payroll-cairo', 'hr_manager', org.cairo.id, ['payroll.view'])
  users.payrollRiyadh = await user('payroll-riyadh', 'hr_manager', org.riyadh.id, ['payroll.view'])
  users.noPayroll = await user('no-payroll', 'hr_manager', org.cairo.id, ['employees.view'])
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' }, { key: 'payroll.daily_hours', value: '8' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
}, { timeout: 180000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assertDisposable()
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-eg-salary-tax-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'EG salary tax fixture cleanup failed')
}, { timeout: 60000 })

test('EG-01: مسير حقيقي — راتب 15,000 مؤمَّن عليه ← 1,482.50، والفرع السعودي برّه، والمتعيّن في نص الشهر بأيامه، وبند «مش خاضع» بيخرج من الوعاء — من غير أي كتابة', async () => {
  const full = await employee(org.cairo)
  // أغسطس 31 يوم: التعيين يوم 17 = 15 يوم خدمة من أساس 30
  const half = await employee(org.cairo, { joinDate: `${PERIOD}-17` })
  const housed = await employee(org.cairo, { basicSalary: 12000, housingAllowance: 3000 })
  const saudi = await employee(org.riyadh, { nationality: 'سعودي', gosiBaseSalary: null, isGosiRegistered: false })
  const run = expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period: PERIOD, scopeType: 'CUSTOM', employeeIds: [full.id, half.id, housed.id, saudi.id],
    name: 'مسير اختبار ضريبة كسب العمل' }), 201)
  state.runId = run.id
  const itemOf = emp => run.items.find(row => row.employeeId === emp.id)
  // أساس المثال: تأمينات 11% من 15,000 = 1,650 والصافي 13,350 (المسير نفسه مافيهوش ضريبة)
  assert.deepEqual([Number(itemOf(full).socialInsuranceDeduction), Number(itemOf(full).netPay)], [1650, 13350])

  const before = await snapshot()
  const shown = expectStatus(await preview(users.admin, run.id), 200)
  assert.deepEqual([shown.available, shown.period, shown.basis, shown.table], [true, PERIOD, 'FROM_THIS_PERIOD', { effectiveFrom: '2024-03-01', verified: false, exemption: 20000, yearDays: 360 }])
  const rowOf = emp => shown.rows.find(row => row.employeeId === emp.id)
  assert.deepEqual(shown.rows.map(row => row.employeeId).sort((a, b) => a - b), [full.id, half.id, housed.id], 'موظف الفرع السعودي برّه المعاينة')
  // مثال C-EG-01 بالحرف
  assert.deepEqual(rowOf(full), { itemId: itemOf(full).id, employeeId: full.id, employeeName: full.fullName, employeeCode: full.employeeCode, netIncome: 13350, days: 30, annualized: 160200, taxable: 140200,
    annualTax: 17790, tax: 1482.5, stored: false })
  // المتعيّن يوم 17 (15 يوم من 30): دخله بيتحوّل لسنوي بأيامه، وضريبته بنسبة أيامه
  const halfItem = itemOf(half), halfRow = rowOf(half)
  assert.equal(JSON.parse(halfItem.breakdown).prorataFactor, 0.5)
  assert.deepEqual([halfRow.days, halfRow.netIncome, halfRow.annualized, halfRow.tax], [15, Number(halfItem.netPay), Math.round(Number(halfItem.netPay) * 24 * 100) / 100, Math.round(halfRow.annualTax * 15 / 360 * 100) / 100])
  // السكن خاضع زي الأساسي: نفس دخل المثال ونفس الضريبة
  assert.deepEqual([rowOf(housed).netIncome, rowOf(housed).tax], [13350, 1482.5])
  assert.deepEqual(shown.totals, { netIncome: Math.round((13350 * 2 + halfRow.netIncome) * 100) / 100, tax: Math.round((1482.5 * 2 + halfRow.tax) * 100) / 100 })
  assert.equal(await snapshot(), before, 'المعاينة قراءة بس')

  // بدل السكن اتعلّم «مش خاضع» من شاشة بنود الراتب: بيخرج من وعاء صاحبه بس
  const items = expectStatus(await request(users.admin, 'GET', '/settings/salary-items'), 200).items
  expectStatus(await request(users.admin, 'PATCH', `/settings/salary-items/${items.find(item => item.code === 'HOUSING').id}`, { taxable: false }), 200)
  const exempted = expectStatus(await preview(users.admin, run.id), 200)
  const housedNow = exempted.rows.find(row => row.employeeId === housed.id)
  assert.deepEqual([housedNow.netIncome, exempted.rows.find(row => row.employeeId === full.id).tax], [10350, 1482.5])
  assert.ok(housedNow.tax < 1482.5 && housedNow.tax > 0)
  expectStatus(await request(users.admin, 'PATCH', `/settings/salary-items/${items.find(item => item.code === 'HOUSING').id}`, { taxable: true }), 200)
  // المسير نفسه مااتغيّرش ولا مرة
  const again = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${run.id}`), 200)
  assert.deepEqual(again.items.map(row => Number(row.netPay)).sort((a, b) => a - b), run.items.map(row => Number(row.netPay)).sort((a, b) => a - b))
})

test('EG-02: الصلاحية ونطاق المسير، وموظف فرعه الحالي برّه النطاق، وشرائح مش متسجّلة للفترة', async () => {
  assert.equal((await preview(users.noPayroll, state.runId)).status, 403)
  // مسير فيه موظف فرع تاني: حساب الفرع بحكم قراءة المسير نفسه (زي /lines بالظبط)
  const lines = await request(users.payrollRiyadh, 'GET', `/payroll/runs/${state.runId}/lines`), shown = await preview(users.payrollRiyadh, state.runId)
  assert.equal(shown.status, lines.status, 'نفس حكم قراءة سطور المسير')
  if (shown.status === 200) assert.deepEqual(shown.body.rows, [], 'موظفي فرع برّه نطاقه مابيظهروش')
  const cairo = await preview(users.payrollCairo, state.runId)
  assert.equal(cairo.status, (await request(users.payrollCairo, 'GET', `/payroll/runs/${state.runId}/lines`)).status)
  if (cairo.status === 200) assert.equal(cairo.body.rows.length, 3)
  assert.equal((await preview(users.admin, 999999)).status, 404)
  // موظف اتنقل لفرع برّه نطاق الحساب بعد الحساب: مابيظهرش له
  const moved = (await ds.query('SELECT TOP 1 [employeeId] FROM [payroll_items] WHERE [runId] = @0 ORDER BY [employeeId]', [state.runId]))[0].employeeId
  if (cairo.status === 200) {
    await repo('Employee').update({ id: moved }, { branchId: org.riyadh.id })
    try { assert.equal(expectStatus(await preview(users.payrollCairo, state.runId), 200).rows.some(row => row.employeeId === moved), false) }
    finally { await repo('Employee').update({ id: moved }, { branchId: org.cairo.id }) }
  }
  // صف الشرائح بيبدأ بعد فترة المسير: المعاينة مش متاحة (مفيش حساب بجدول مش ساري)
  await ds.query(`UPDATE [statutory_definitions] SET [effectiveFrom] = '2027-01-01' WHERE [key] = N'eg.salary_tax.brackets'`)
  try {
    const missing = expectStatus(await preview(users.admin, state.runId), 200)
    assert.deepEqual([missing.available, missing.message, missing.rows, missing.totals], [false, rules.EG_TAX_MISSING, [], { netIncome: 0, tax: 0 }])
  } finally { await ds.query(`UPDATE [statutory_definitions] SET [effectiveFrom] = '2024-03-01' WHERE [key] = N'eg.salary_tax.brackets'`) }
})
