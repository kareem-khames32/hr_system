'use strict'
// B4.4 (ب) — الخصومات القانونية المصرية في المسير على قاعدة SQL مؤقتة عشوائية بتتمسح في الآخر (hr_payroll_statutory_test_<16 hex>):
//  PS-01) الإعدادين مقفولين (الافتراضي): البند زي ما هو بالحرف — مفيش breakdown.statutory والصافي والسطور زي الأول.
//  PS-02) الإعدادين مفتوحين: راتب 15,000 ← ضريبة 1,482.50 وصندوق الشهداء 7.50 بيتطرحوا من الصافي ويتسجّلوا بلقطة الحساب، وسطرين في القسيمة
//         وجدول المسير، والفرع السعودي زي ما هو، والمسير بيتعتمد، والمعاينة بتعرض المحفوظ.
//  PS-03) التراكمي: الشهر التاني بياخد اللي اتسجّل في الأول، والزيادة بتتسوّى، وإعادة الحساب بنفس الأرقام، وفترة قبل «فترة البداية» من غير ضريبة.
//  PS-04) قارئ الرصيد التراكمي: مسير تكميلي لنفس الفترة مابيعدّش أيامها تاني، والبند اللي اتعكس صرفه والمسير الملغى برّه.
// مفيش مسار في المنتج بيفتح الإعدادين في الدفعة دي (بييجي مع التقارير في الجزء ج) — الاختبار بيكتب مفاتيحهم مباشرة.
// Run (من api/): node --test test/payroll-statutory.integration.cjs
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const sql = require('../node_modules/mssql')
const env = require('../node_modules/dotenv').parse(fs.readFileSync(path.join(apiRoot, '.env')))
const database = `hr_payroll_statutory_test_${crypto.randomBytes(8).toString('hex')}`
const NAME = /^hr_payroll_statutory_test_[a-f0-9]{16}$/
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-statutory-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const run = require('../src/payroll/payroll-statutory-run')
const tax = require('../src/payroll/eg-salary-tax')
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
  const emp = await repo('Employee').save({ employeeCode: `PST${String(n).padStart(3, '0')}`, fullName: `موظف الخصم القانوني ${n}`, nationality: 'مصري', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 15000, housingAllowance: 0, transportAllowance: 0, phoneAllowance: 0, workNatureAllowance: 0, otherAllowance: 0, gosiBaseSalary: 15000, isGosiRegistered: true,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
  await repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: '2026-01-01', effectiveTo: '2027-12-31', reasonCode: 'field_role', reason: 'نافذة اختبار الخصم القانوني المعزولة', status: 'APPROVED',
    createdByUserId: users.admin.id, approvedByUserId: users.admin.id, approvedAt: new Date('2026-01-01T08:00:00Z'), terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false })
  return emp
}
const runFor = async (period, employees, name) => expectStatus(await request(users.admin, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id),
  name: name ?? `مسير الخصم القانوني ${period} ${crypto.randomUUID().slice(0, 8)}` }), 201)
const itemOf = (result, emp) => result.items.find(row => row.employeeId === emp.id)
const statutoryOf = item => JSON.parse(item.breakdown).statutory
const settings = rows => repo('RequestsConfig').save(Object.entries(rows).map(([key, value]) => ({ key, value })))
const approve = async runId => {
  const unassigned = expectStatus(await request(users.approver, 'GET', `/payroll/runs/${runId}/unassigned`), 200)
  expectStatus(await request(users.approver, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: unassigned.reportHash }), 201)
  return expectStatus(await request(users.approver, 'POST', `/payroll/runs/${runId}/approve`), 201)
}

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

  org.cairo = await repo('Branch').save({ code: 'PST_CAI', name: 'فرع القاهرة', country: 'EG', insuranceSystem: 'EGYPTIAN' })
  org.riyadh = await repo('Branch').save({ code: 'PST_RUH', name: 'فرع الرياض', country: 'SA', insuranceSystem: 'NONE' })
  const user = label => repo('User').save({ email: `${label}@payroll-statutory.invalid`, displayName: label, passwordHash: 'test-only', role: 'super_admin', branchId: null, permissions: '["*"]', isActive: true })
  users.admin = await user('admin'); users.approver = await user('approver')
  await settings({ 'payroll.cycle_start_day': '1', 'payroll.monthly_days': '30', 'payroll.daily_hours': '8', 'payroll.exempt_overtime_eligible': 'false',
    'payroll.exempt_unpaid_leave_deductible': 'true', 'payroll.salary_evidence_mode': 'MONTHLY_HISTORY_OR_CURRENT_FILE' })
  state.full = await employee(org.cairo)
  state.raised = await employee(org.cairo)
  state.saudi = await employee(org.riyadh, { nationality: 'سعودي', gosiBaseSalary: null, isGosiRegistered: false })
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
    assert.equal(path.dirname(path.resolve(uploads)), os.tmpdir()); assert.match(path.basename(uploads), /^hr-payroll-statutory-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'payroll statutory fixture cleanup failed')
}, { timeout: 60000 })

test('PS-01: الإعدادين مقفولين (الافتراضي) — البند زي ما هو بالحرف: مفيش خصم قانوني ولا سطر ولا لقطة', async () => {
  assert.equal(await repo('RequestsConfig').count({ where: run.PAYROLL_STATUTORY_KEYS.map(key => ({ key })) }), 0, 'الإعدادات مش متسجّلة = مقفولة')
  assert.equal(await run.readPayrollStatutoryContext(ds.manager, { period: '2026-07', endDate: '2026-07-31' }), null)
  const july = await runFor('2026-07', [state.full, state.saudi])
  const item = itemOf(july, state.full)
  assert.deepEqual([Number(item.socialInsuranceDeduction), Number(item.netPay), 'statutory' in JSON.parse(item.breakdown)], [1650, 13350, false])
  const payslip = expectStatus(await request(users.admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual([payslip.lines.deductions.map(line => line.key), payslip.lines.totals], [['SOCIAL_INSURANCE'], { earnings: 15000, deductions: 1650, net: 13350 }])
  // مفتاح مكتوب «false» أو فترة بداية من غير تفعيل: لسه مقفول
  await settings({ [run.EG_TAX_ENABLED_KEY]: 'false', [run.EG_TAX_START_PERIOD_KEY]: '2026-01', [run.EG_MARTYRS_ENABLED_KEY]: 'no' })
  assert.equal(await run.readPayrollStatutoryContext(ds.manager, { period: '2026-07', endDate: '2026-07-31' }), null)
  // مفعّلة من غير فترة بداية صحيحة، أو الفترة قبل البداية: مفيش ضريبة
  await settings({ [run.EG_TAX_ENABLED_KEY]: 'true', [run.EG_TAX_START_PERIOD_KEY]: 'قريب' })
  assert.equal(await run.readPayrollStatutoryContext(ds.manager, { period: '2026-07', endDate: '2026-07-31' }), null)
  await settings({ [run.EG_TAX_START_PERIOD_KEY]: '2026-08' })
  assert.equal(await run.readPayrollStatutoryContext(ds.manager, { period: '2026-07', endDate: '2026-07-31' }), null)
  const recalculated = expectStatus(await request(users.admin, 'POST', `/payroll/runs/${july.id}/recalculate`, { reason: 'إعادة حساب يوليو والضريبة بدايتها أغسطس' }), 201)
  assert.deepEqual([Number(itemOf(recalculated, state.full).netPay), 'statutory' in JSON.parse(itemOf(recalculated, state.full).breakdown)], [13350, false])
})

test('PS-02: الإعدادين مفتوحين — ضريبة 1,482.50 وصندوق الشهداء 7.50 من الصافي وبلقطتهم، وسطرين في القسيمة وجدول المسير، والسعودي زي ما هو، والاعتماد، والمعاينة بتعرض المحفوظ', async () => {
  await settings({ [run.EG_TAX_ENABLED_KEY]: 'true', [run.EG_TAX_START_PERIOD_KEY]: '2026-08', [run.EG_MARTYRS_ENABLED_KEY]: 'true' })
  const august = await runFor('2026-08', [state.full, state.raised, state.saudi])
  state.august = august.id
  const item = itemOf(august, state.full), stored = statutoryOf(item)
  assert.deepEqual([Number(item.socialInsuranceDeduction), Number(item.netPay)], [1650, 15000 - 1650 - 1482.5 - 7.5])
  assert.deepEqual([stored.total, stored.lines], [1490, [{ code: 'INCOME_TAX', amount: 1482.5 }, { code: 'MARTYRS_FUND', amount: 7.5 }]])
  assert.deepEqual(stored.egTax, { netIncome: 13350, days: 30, ytdNetIncome: 0, ytdDays: 0, ytdTax: 0, annualized: 160200, exemption: 20000, taxable: 140200, annualTax: 17790, cumulativeTax: 1482.5, tax: 1482.5,
    tableEffectiveFrom: '2024-03-01', tableVerified: false, startPeriod: '2026-08' })
  assert.deepEqual(stored.martyrsFund, { base: 15000, pct: 0.05, amount: 7.5, effectiveFrom: '2021-01-01' })
  // الفرع السعودي: ولا خصم ولا لقطة
  const saudi = itemOf(august, state.saudi)
  assert.deepEqual([Number(saudi.netPay), 'statutory' in JSON.parse(saudi.breakdown)], [15000, false])
  // إجمالي المسير = مجموع صوافي بنوده
  assert.equal(Number(august.totalNet), august.items.reduce((sum, row) => sum + Math.round(Number(row.netPay) * 100), 0) / 100)
  assert.equal(Number(august.totalNet), 11860 * 2 + 15000)

  // القسيمة وجدول المسير: سطر لكل خصم قانوني بعد التأمينات، وجوه إجمالي الاستقطاعات، والصافي هو المحفوظ
  const payslip = expectStatus(await request(users.admin, 'GET', `/payroll/items/${item.id}`), 200)
  assert.deepEqual(payslip.lines.deductions.map(line => [line.key, line.name, line.amount]), [['SOCIAL_INSURANCE', 'التأمينات (حصة الموظف)', 1650], ['INCOME_TAX', 'ضريبة كسب العمل', 1482.5], ['MARTYRS_FUND', 'صندوق الشهداء', 7.5]])
  assert.deepEqual(payslip.lines.totals, { earnings: 15000, deductions: 3140, net: 11860 })
  const lines = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${august.id}/lines`), 200)
  assert.deepEqual(lines.columns.deductions.map(column => column.key), ['SOCIAL_INSURANCE', 'INCOME_TAX', 'MARTYRS_FUND'])
  assert.deepEqual(lines.rows.find(row => row.employeeId === state.saudi.id).deductions, [])

  // المعاينة لمسير ضريبته اتسجّلت: المحفوظ
  const preview = expectStatus(await request(users.admin, 'GET', `/payroll/runs/${august.id}/eg-tax-preview`), 200)
  assert.deepEqual([preview.basis, preview.rows.map(row => [row.employeeId, row.tax, row.stored]), preview.totals.tax], ['STORED', [[state.full.id, 1482.5, true], [state.raised.id, 1482.5, true]], 2965])

  // الاعتماد بيعدّي بالخصم القانوني، والبند المعتمد زي ما اتحسب
  await approve(august.id)
  const approved = await repo('PayrollItem').findOneByOrFail({ id: item.id })
  assert.deepEqual([Number(approved.netPay), statutoryOf(approved).total, (await repo('PayrollRun').findOneByOrFail({ id: august.id })).status], [11860, 1490, 'APPROVED'])
})

test('PS-03: التراكمي — الشهر التاني بياخد اللي اتسجّل في الأول، والزيادة بتتسوّى، وإعادة الحساب بنفس الأرقام، وصندوق الشهداء لوحده قبل فترة بداية الضريبة', async () => {
  // زيادة الأساسي لـ20,000 من سبتمبر (أجر التأمين المسجّل 15,000 زي ما هو ← تأمينات 1,650)
  await repo('Employee').update({ id: state.raised.id }, { basicSalary: 20000 })
  const september = await runFor('2026-09', [state.full, state.raised])
  const same = statutoryOf(itemOf(september, state.full)).egTax
  assert.deepEqual([same.ytdNetIncome, same.ytdDays, same.ytdTax, same.cumulativeTax, same.tax], [13350, 30, 1482.5, 2965, 1482.5], 'نفس الدخل: نفس ضريبة الشهر')
  const raised = itemOf(september, state.raised), raisedTax = statutoryOf(raised).egTax
  // صافي الدخل 18,350 ← تراكمي 31,700 في 60 يوم ← سنوي 190,200 ← وعاء 170,200 ← ضريبة سنة 23,790 ← تراكمي 3,965 ← الشهر 2,482.50
  assert.deepEqual([raisedTax.netIncome, raisedTax.ytdNetIncome, raisedTax.ytdDays, raisedTax.ytdTax, raisedTax.annualized, raisedTax.taxable, raisedTax.annualTax, raisedTax.cumulativeTax, raisedTax.tax],
    [18350, 13350, 30, 1482.5, 190200, 170200, 23790, 3965, 2482.5])
  assert.equal(Number(raised.netPay), 20000 - 1650 - 2482.5 - 10)
  // نفس النتيجة بالمحرك مباشرة
  const table = tax.egTaxTableAt(await require('../src/statutory/statutory.service').readStatutoryEntries(ds.manager), '2026-09-30')
  assert.equal(tax.egPeriodTax({ netIncome: 18350, days: 30, ytdNetIncome: 13350, ytdDays: 30, ytdTax: 1482.5 }, table).tax, 2482.5)
  // إعادة حساب سبتمبر: بنده نفسه برّه التراكمي، فالأرقام هي هي
  const recalculated = expectStatus(await request(users.admin, 'POST', `/payroll/runs/${september.id}/recalculate`, { reason: 'إعادة حساب سبتمبر' }), 201)
  assert.deepEqual([statutoryOf(itemOf(recalculated, state.raised)).egTax, Number(itemOf(recalculated, state.raised).netPay)], [raisedTax, Number(raised.netPay)])
  state.september = september.id

  // فترة البداية بقت أكتوبر: مسير سبتمبر لو اتحسب تاني مافيهوش ضريبة — صندوق الشهداء بس (إعداده لوحده)
  await settings({ [run.EG_TAX_START_PERIOD_KEY]: '2026-10' })
  const fundOnly = expectStatus(await request(users.admin, 'POST', `/payroll/runs/${september.id}/recalculate`, { reason: 'إعادة حساب والضريبة بدايتها أكتوبر' }), 201)
  const snapshot = statutoryOf(itemOf(fundOnly, state.full))
  assert.deepEqual([snapshot.total, snapshot.lines, 'egTax' in snapshot, Number(itemOf(fundOnly, state.full).netPay)], [7.5, [{ code: 'MARTYRS_FUND', amount: 7.5 }], false, 13342.5])
  // والمعتمد (أغسطس) مااتغيّرش
  assert.equal(statutoryOf(await repo('PayrollItem').findOneByOrFail({ runId: state.august, employeeId: state.full.id })).total, 1490)
  await settings({ [run.EG_TAX_START_PERIOD_KEY]: '2026-08' })
  expectStatus(await request(users.admin, 'POST', `/payroll/runs/${september.id}/recalculate`, { reason: 'رجوع فترة البداية لأغسطس' }), 201)
})

test('PS-04: قارئ الرصيد التراكمي — من فترة البداية وفي نفس السنة، والمسير نفسه برّه، ونفس الفترة «متعدّة»، والمعكوس صرفه والملغى برّه', async () => {
  const read = (employee, target, start = '2026-08') => run.readEgTaxYearToDate(ds.manager, employee.id, target, start)
  // مسير جديد لأكتوبر: أغسطس وسبتمبر متسجّلين
  assert.deepEqual(await read(state.full, { id: null, period: '2026-10' }), { netIncome: 26700, days: 60, tax: 2965, periodCounted: false })
  // مسير تاني لسبتمبر (تكميلي): الفترة نفسها متعدّة — أيامها ماتتحسبش تاني
  assert.deepEqual(await read(state.full, { id: 999999, period: '2026-09' }), { netIncome: 26700, days: 60, tax: 2965, periodCounted: true })
  // مسير سبتمبر نفسه: بنده برّه
  assert.deepEqual(await read(state.full, { id: state.september, period: '2026-09' }), { netIncome: 13350, days: 30, tax: 1482.5, periodCounted: false })
  // فترة البداية سبتمبر: أغسطس برّه؛ وسنة تانية: ولا حاجة
  assert.deepEqual(await read(state.full, { id: null, period: '2026-10' }, '2026-09'), { netIncome: 13350, days: 30, tax: 1482.5, periodCounted: false })
  assert.deepEqual(await read(state.full, { id: null, period: '2027-01' }), { netIncome: 0, days: 0, tax: 0, periodCounted: false })
  // بند أغسطس اتعكس صرفه (سطر عكس منفّذ): برّه التراكمي؛ والمعلّق لسه جوه
  const item = await repo('PayrollItem').findOneByOrFail({ runId: state.august, employeeId: state.full.id })
  const line = await repo('PayrollRunReversalLine').save({ reversalRunId: 999998, originalRunId: state.august, originalItemId: item.id, employeeId: state.full.id, status: 'PENDING', netPay: item.netPay,
    itemSnapshot: '{}', itemHash: 'x'.repeat(64), effects: null, createdByUserId: users.admin.id })
  assert.equal((await read(state.full, { id: null, period: '2026-10' })).tax, 2965)
  await repo('PayrollRunReversalLine').update({ id: line.id }, { status: 'POSTED' })
  assert.deepEqual(await read(state.full, { id: null, period: '2026-10' }), { netIncome: 13350, days: 30, tax: 1482.5, periodCounted: false })
  await repo('PayrollRunReversalLine').delete({ id: line.id })
  // مسير ملغى: برّه
  await repo('PayrollRun').update({ id: state.september }, { status: 'CANCELLED' })
  try { assert.deepEqual(await read(state.full, { id: null, period: '2026-10' }), { netIncome: 13350, days: 30, tax: 1482.5, periodCounted: false }) }
  finally { await repo('PayrollRun').update({ id: state.september }, { status: 'CALCULATED' }) }
})
