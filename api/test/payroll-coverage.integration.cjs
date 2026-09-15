// PR-03 / PR-10: real SQL and HTTP coverage for employment overlap and pro-rata.
// Every fixture lives in a new, randomly named database; no source/review rows are changed.
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
const database = `hr_payroll_coverage_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-coverage-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-07'
const startDate = '2026-06-23'
const endDate = '2026-07-22'
let app, master, ds, base, admin, branch, created = false, employeeNumber = 0
const repo = name => ds.getRepository(name)
const amount = value => Number(value)

function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
// الخطوة 20 (B4): قبل اعتماد مسير يُكتب سبب لكل رمز في تقرير التكافؤ (هذه المجموعة لا تختبر التكافؤ نفسه)
const { writeParityReasonsBeforeApproval } = require('./fixtures/payroll-parity-reasons.cjs')
async function request(user, method, url, body) {
  await writeParityReasonsBeforeApproval(request, user, method, url)
  const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function employee(overrides = {}) {
  return repo('Employee').save({ employeeCode: `COV${String(++employeeNumber).padStart(3, '0')}`,
    fullName: 'موظف اختبار تغطية الراتب', branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 12000, housingAllowance: 0, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
async function offboarding(emp, lastWorkingDay, status = 'CLOSED') {
  return repo('OffboardingCase').save({ employeeId: emp.id, lastWorkingDay, status, terminationReason: 'resignation' })
}
function dates(from, to) {
  const result = []
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    result.push(new Date(time).toISOString().slice(0, 10))
  }
  return result
}
async function attendance(emp, from, to, absentDates = []) {
  // Stable, computed attendance within the service window. An omitted workday is
  // genuinely materialized by AttendanceService, rather than mocking its answer.
  const rows = dates(from, to).filter(date => !absentDates.includes(date)).map(date => ({
    employeeId: emp.id, branchId: emp.branchId, date, status: 'present',
    checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار', shiftStart: '08:00', shiftEnd: '16:00',
    scheduleSource: 'override', lateMinutes: 0, deductibleMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 480,
  }))
  if (rows.length) await repo('AttendanceDay').save(rows)
  for (const date of absentDates) {
    await repo('ScheduleDayOverride').save({ employeeId: emp.id, date, shiftName: 'وردية اختبار', startTime: '08:00', endTime: '16:00' })
  }
}
// الخطوة 16 (B3): اسم المسير فريد داخل الشهر لغير الملغى؛ كل مسير جديد في الاختبار يأخذ رقمًا تسلسليًا.
let coverageRunNumber = 0
async function calculate(employees, extra = {}, expectedRange = { startDate, endDate }) {
  const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id), name: `اختبار التغطية — قاعدة مؤقتة ${++coverageRunNumber}`, ...extra,
  })
  assert.equal(response.status, 201, JSON.stringify(response.body))
  assert.equal(response.body.startDate, expectedRange.startDate)
  assert.equal(response.body.endDate, expectedRange.endDate)
  const persisted = await request(admin, 'GET', `/payroll/runs/${response.body.id}`)
  assert.equal(persisted.status, 200)
  assert.deepEqual(persisted.body, response.body, 'HTTP read must return the persisted calculation')
  return response.body
}
function itemFor(run, emp) {
  const item = run.items.find(row => row.employeeId === emp.id)
  assert.ok(item, `Employee ${emp.employeeCode} must have a payroll item`)
  return item
}
function deductionsAreZero(item) {
  for (const key of ['absenceDays', 'absenceDeduction', 'lateMinutes', 'latenessDeduction', 'unpaidLeaveDays', 'unpaidLeaveDeduction']) {
    assert.equal(amount(item[key]), 0, key)
  }
}
function coverageIs(item, expected) {
  const detail = JSON.parse(item.breakdown)
  for (const [key, value] of Object.entries(expected)) assert.equal(detail[key], value, `breakdown.${key}`)
}

// الخطوة 18 (B3): الاعتماد يتطلب إقرارًا بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية بنطاق المعتمد.
async function acknowledgeUnassigned(user, runId) {
  const report = await request(user, 'GET', `/payroll/runs/${runId}/unassigned`)
  assert.equal(report.status, 200, JSON.stringify(report.body))
  const ack = await request(user, 'POST', `/payroll/runs/${runId}/unassigned-ack`, { reportHash: report.body.reportHash })
  assert.equal(ack.status, 201, JSON.stringify(ack.body))
}
before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_coverage_test_[a-f0-9]{16}$/)
  assert.notEqual(database, env.DB_DATABASE)
  master = await new sql.ConnectionPool({ server: env.DB_HOST || 'localhost', port: Number(env.DB_PORT || 1433),
    user: env.DB_USERNAME, password: env.DB_PASSWORD, database: 'master',
    options: { encrypt: false, trustServerCertificate: true }, connectionTimeout: 5000 }).connect()
  await master.request().query(`CREATE DATABASE [${database}]`)
  created = true
  Object.assign(process.env, env, { DB_DATABASE: database, DB_SYNCHRONIZE: 'true', NODE_ENV: 'test', JWT_SECRET: secret, UPLOADS_ROOT: uploads })
  app = await require('../node_modules/@nestjs/core').NestFactory.create(require('../src/app.module').AppModule, { logger: ['error'], abortOnError: false })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new (require('../node_modules/@nestjs/common').ValidationPipe)({ whitelist: true, transform: true }))
  await app.listen(0, '127.0.0.1')
  // Timers are unrelated to these HTTP calculations and must not mutate a fixture mid-assertion.
  const scheduler = app.get(require('../node_modules/@nestjs/schedule').SchedulerRegistry)
  for (const job of scheduler.getCronJobs().values()) job.stop()
  ds = app.get(require('../node_modules/typeorm').DataSource)
  assert.equal(ds.options.database, database)
  base = `http://127.0.0.1:${app.getHttpServer().address().port}/api`
  branch = await repo('Branch').save({ name: 'Payroll coverage test', code: 'COVERAGE' })
  admin = await repo('User').save({ email: 'admin@payroll-coverage.invalid', displayName: 'Payroll fixture',
    passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '23' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    // هذه المجموعة تختبر التغطية والتناسب على راتب الملف؛ اختيار راتب الشهر من السجل مغطى في payroll-run-salary-period.integration.cjs.
    { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY_OR_CURRENT_FILE' },
  ])
  // الخطوة 22 (B5): المستخدم نفسه يحتسب ويعتمد في هذه المجموعة — رخصة الشركة الصغيرة الموثقة (فصل المهام مختبر في payroll-run-screen)
  await require('./fixtures/payroll-small-company-approval.cjs').allowSmallCompanyApproval(repo)
}, { timeout: 60000 })

after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_coverage_test_[a-f0-9]{16}$/)
      assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0, 'Temporary fixture database must actually be removed')
      t.diagnostic(`Cleanup verified: ${database} no longer exists in sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir()))
    assert.match(path.basename(uploads), /^hr-payroll-coverage-files-/)
    fs.rmSync(uploads, { recursive: true, force: true })
    assert.equal(fs.existsSync(uploads), false, 'Temporary uploads must actually be removed')
    t.diagnostic('Cleanup verified: the temporary uploads directory was removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Payroll fixture cleanup failed')
})

test('PR-03: an inactive employee whose CLOSED last working day is the period end keeps the full salary', async () => {
  assert.equal((await request(null, 'POST', '/payroll/runs/calculate-defined', { period, scopeType: 'COMPANY' })).status, 401)
  const emp = await employee({ isActive: false, status: 'terminated' })
  await offboarding(emp, endDate)
  await attendance(emp, startDate, endDate)
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 12000)
  assert.equal(amount(run.totalNet), 12000)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: startDate, coverTo: endDate, coverDays: 30, gross: 12000, grossEarned: 12000, prorataFactor: 1, dayRate: 400 })
  assert.equal(await repo('PayrollRunMember').count({ where: { runId: run.id, employeeId: emp.id } }), 1)
})

test('PR-10 / SPEC E-103: 18 covered days earn 7200; the 1000 installment stays whole and leaves 6200', async t => {
  const emp = await employee({ isActive: false, status: 'terminated' })
  await offboarding(emp, '2026-07-10')
  await attendance(emp, startDate, '2026-07-10')
  const initial = await calculate([emp])
  const initialItem = itemFor(initial, emp)
  assert.equal(amount(initialItem.netPay), 7200)
  deductionsAreZero(initialItem)
  const loan = await repo('Loan').save({ employeeId: emp.id, amount: 3000, status: 'DISBURSED' })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, amount: 1000, dueDate: '2026-07-01', paid: false })
  const run = await calculate([emp], { runId: initial.id, reason: 'إضافة القسط المستحق ومراجعة الصافي' })
  const item = itemFor(run, emp)
  assert.equal(amount(item.loanInstallments), 1000)
  assert.equal(amount(item.netPay), 6200)
  assert.equal(amount(run.totalNet), 6200)
  coverageIs(item, { coverFrom: startDate, coverTo: '2026-07-10', coverDays: 18, gross: 12000, grossEarned: 7200, prorataFactor: 0.6, dayRate: 400 })
  assert.deepEqual(JSON.parse(item.breakdown).installmentIds, [installment.id])
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid, false, 'Calculation must not mark an installment paid')
  t.diagnostic('Manual: 12000 × 18 / 30 = 7200; 7200 − 1000 = 6200.')
})

test('PR-10 / SPEC E-102: joining July 1 earns 5133.33 from a 7000 monthly gross without absence', async t => {
  const emp = await employee({ joinDate: '2026-07-01', basicSalary: 6000, housingAllowance: 800, transportAllowance: 200 })
  await attendance(emp, '2026-07-01', endDate)
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 5133.33)
  assert.equal(amount(run.totalNet), 5133.33)
  deductionsAreZero(item)
  assert.equal(JSON.parse(item.breakdown).dayRate, 233.33)
  coverageIs(item, { coverFrom: '2026-07-01', coverTo: endDate, coverDays: 22, gross: 7000, grossEarned: 5133.33 })
  assert.ok(Math.abs(JSON.parse(item.breakdown).prorataFactor - 22 / 30) <= 0.000001)
  t.diagnostic('Manual: (6000 + 800 + 200) × 22 / 30 = 5133.33; daily deduction basis remains 7000 / 30.')
})

test('PR-10 / SPEC E-102: one real absent workday deducts 233.33 from prorated pay and leaves 4900', async t => {
  const emp = await employee({ joinDate: '2026-07-01', basicSalary: 6000, housingAllowance: 800, transportAllowance: 200 })
  await attendance(emp, '2026-07-01', endDate, ['2026-07-05'])
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  assert.equal(amount(item.absenceDays), 1)
  assert.equal(amount(item.absenceDeduction), 233.33)
  assert.equal(amount(item.netPay), 4900)
  assert.equal(amount(run.totalNet), 4900)
  const day = await repo('AttendanceDay').findOneByOrFail({ employeeId: emp.id, date: '2026-07-05' })
  assert.equal(day.status, 'absent')
  assert.deepEqual(JSON.parse(item.breakdown).absentDates, ['2026-07-05'])
  t.diagnostic('Manual: 5133.33 − ROUND(7000 / 30, 2) = 4900.00; do not derive day rate from the prorated gross.')
})

test('PR-03 / PR-10: an employee who left before the period and one joining after it have no payable line', async () => {
  const ended = await employee({ isActive: false, status: 'terminated' })
  await offboarding(ended, '2026-06-22')
  const future = await employee({ joinDate: '2026-07-23' })
  const current = await employee()
  await attendance(current, startDate, endDate)
  const run = await calculate([ended, future, current])
  assert.deepEqual(run.items.map(row => row.employeeId), [current.id])
  assert.equal(amount(run.totalNet), 12000)
  // PR-05: الاستبعاد موثق في العضوية؛ لا بند صرف ولا أثر حضور له.
  assert.equal(await repo('PayrollRunMember').count({ where: { runId: run.id, employeeId: ended.id, membershipStatus: 'EXCLUDED', exclusionReason: 'EXC_TERMINATED_BEFORE_PERIOD' } }), 1)
  assert.equal(await repo('PayrollRunMember').count({ where: { runId: run.id, employeeId: future.id, membershipStatus: 'EXCLUDED', exclusionReason: 'EXC_JOINS_AFTER_PERIOD' } }), 1)
  assert.equal(await repo('AttendanceDay').count({ where: { employeeId: ended.id } }), 0)
  assert.equal(await repo('AttendanceDay').count({ where: { employeeId: future.id } }), 0)
})

test('PR-03 / PR-10: a cancelled offboarding case does not terminate coverage or reduce salary', async () => {
  const emp = await employee({ basicSalary: 9000 })
  await offboarding(emp, '2026-07-10', 'CANCELLED')
  await attendance(emp, startDate, endDate)
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 9000)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: startDate, coverTo: endDate, coverDays: 30, gross: 9000, grossEarned: 9000, prorataFactor: 1 })
})

test('PR-10: existing lateness/absence before hiring or after the last working day cannot deduct or generate more days', async () => {
  const emp = await employee({ joinDate: '2026-07-01', basicSalary: 9000, isActive: false, status: 'terminated' })
  await offboarding(emp, '2026-07-10')
  await attendance(emp, '2026-07-01', '2026-07-10')
  const outside = await repo('AttendanceDay').save([
    { employeeId: emp.id, branchId: emp.branchId, date: '2026-06-30', status: 'late', lateMinutes: 120, deductibleMinutes: 30 },
    { employeeId: emp.id, branchId: emp.branchId, date: '2026-07-11', status: 'absent', lateMinutes: 0, deductibleMinutes: 0 },
    { employeeId: emp.id, branchId: emp.branchId, date: '2026-07-12', status: 'late', lateMinutes: 60, deductibleMinutes: 60 },
  ].map(row => ({ ...row, shiftName: 'سجل سابق للاختبار', shiftStart: '08:00', shiftEnd: '16:00' })))
  const before = await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } })
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 3000)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: '2026-07-01', coverTo: '2026-07-10', coverDays: 10, gross: 9000, grossEarned: 3000 })
  assert.deepEqual(await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } }), before)
  const breakdown = JSON.parse(item.breakdown)
  assert.deepEqual(breakdown.absentDates, [])
  assert.ok(outside.every(row => !breakdown.attendanceDayIds.includes(row.id)))
})

test('PR-10: the first and last days of the cycle each count as one covered day', async () => {
  const lastDayJoiner = await employee({ joinDate: endDate })
  await attendance(lastDayJoiner, endDate, endDate)
  const firstDayLeaver = await employee({ isActive: false, status: 'terminated' })
  await offboarding(firstDayLeaver, startDate)
  await attendance(firstDayLeaver, startDate, startDate)
  const run = await calculate([lastDayJoiner, firstDayLeaver])
  assert.equal(amount(itemFor(run, lastDayJoiner).netPay), 400)
  assert.equal(amount(itemFor(run, firstDayLeaver).netPay), 400)
  coverageIs(itemFor(run, lastDayJoiner), { coverFrom: endDate, coverTo: endDate, coverDays: 1, grossEarned: 400 })
  coverageIs(itemFor(run, firstDayLeaver), { coverFrom: startDate, coverTo: startDate, coverDays: 1, grossEarned: 400 })
  assert.equal(amount(run.totalNet), 800)
})

test('PR-09 / PR-10: 18 covered days in a 31-day cycle earn 3600 from 6000 on the selected 30-day basis', async t => {
  const emp = await employee({ joinDate: '2026-08-05', basicSalary: 6000 })
  await attendance(emp, '2026-08-05', '2026-08-22')
  const run = await calculate([emp], { period: '2026-08' }, { startDate: '2026-07-23', endDate: '2026-08-22' })
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 3600)
  assert.equal(amount(run.totalNet), 3600)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: '2026-08-05', coverTo: '2026-08-22', coverDays: 18,
    gross: 6000, grossEarned: 3600, prorataFactor: 0.6, dayRate: 200 })
  t.diagnostic('Owner decision: monthly basis = 30. Manual: 6000 × 18 / 30 = 3600, even though the cycle spans 31 days.')
})

test('PR-10: full coverage of a 31-day cycle pays exactly 6000, with factor one and no extra day', async () => {
  const emp = await employee({ basicSalary: 6000 })
  await attendance(emp, '2026-07-23', '2026-08-22')
  const run = await calculate([emp], { period: '2026-08' }, { startDate: '2026-07-23', endDate: '2026-08-22' })
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 6000)
  assert.equal(amount(run.totalNet), 6000)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: '2026-07-23', coverTo: '2026-08-22', coverDays: 31,
    gross: 6000, grossEarned: 6000, prorataFactor: 1, dayRate: 200 })
})

test('PR-10: full coverage of a 28-day cycle pays exactly 6000 without deducting two calendar days', async () => {
  const emp = await employee({ basicSalary: 6000 })
  await attendance(emp, '2026-02-23', '2026-03-22')
  const run = await calculate([emp], { period: '2026-03' }, { startDate: '2026-02-23', endDate: '2026-03-22' })
  const item = itemFor(run, emp)
  assert.equal(amount(item.netPay), 6000)
  assert.equal(amount(run.totalNet), 6000)
  deductionsAreZero(item)
  coverageIs(item, { coverFrom: '2026-02-23', coverTo: '2026-03-22', coverDays: 28,
    gross: 6000, grossEarned: 6000, prorataFactor: 1, dayRate: 200 })
})

test('PR-08 / الخطوة 14: cycle start 1 uses its calendar month; 29/30/31 start the day after the previous period ends (no shared day)', async t => {
  const previous = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.cycle_start_day' })
  // These dates are explicit acceptance examples, not dates generated with the implementation's helper.
  // الاختبار القديم كان يؤكد تداخل فبراير ومارس (مارس يبدأ 28/2 وفبراير ينتهي 28/2)؛ الصحيح: مارس = نهاية فبراير + يوم.
  const cases = [
    { cycle: 1, period: '2026-03', startDate: '2026-03-01', endDate: '2026-03-31' },
    { cycle: 29, period: '2026-03', startDate: '2026-03-01', endDate: '2026-03-28' },
    { cycle: 30, period: '2026-03', startDate: '2026-03-01', endDate: '2026-03-29' },
    { cycle: 31, period: '2026-03', startDate: '2026-03-01', endDate: '2026-03-30' },
    { cycle: 29, period: '2026-02', startDate: '2026-01-29', endDate: '2026-02-28' },
    { cycle: 30, period: '2026-02', startDate: '2026-01-30', endDate: '2026-02-28' },
    { cycle: 31, period: '2026-02', startDate: '2026-01-31', endDate: '2026-02-28' },
    { cycle: 29, period: '2024-03', startDate: '2024-02-29', endDate: '2024-03-28' },
    { cycle: 30, period: '2024-03', startDate: '2024-03-01', endDate: '2024-03-29' },
    { cycle: 31, period: '2024-03', startDate: '2024-03-01', endDate: '2024-03-30' },
    { cycle: 31, period: '2026-05', startDate: '2026-05-01', endDate: '2026-05-30' },
    { cycle: 31, period: '2026-01', startDate: '2025-12-31', endDate: '2026-01-30' },
  ]
  try {
    for (const example of cases) {
      await repo('RequestsConfig').save({ key: previous.key, value: String(example.cycle) })
      const emp = await employee({ basicSalary: 6000 })
      await attendance(emp, example.startDate, example.endDate)
      const run = await calculate([emp], { period: example.period }, example)
      const item = itemFor(run, emp)
      assert.equal(amount(item.netPay), 6000, JSON.stringify(example))
      coverageIs(item, { coverFrom: example.startDate, coverTo: example.endDate,
        coverDays: dates(example.startDate, example.endDate).length, prorataFactor: 1 })
    }
  } finally {
    await repo('RequestsConfig').save(previous)
  }
  t.diagnostic('12 explicit cycle-boundary cases checked through POST calculation and persisted GET detail.')
})

test('PR-11: a SQL save failure preserves the previous run/items/members and leaves no partial new run', async () => {
  const first = await employee()
  const second = await employee()
  await attendance(first, startDate, endDate)
  await attendance(second, startDate, endDate)
  const initial = await calculate([first, second])
  const previousMembers = await repo('PayrollRunMember').find({ where: { runId: initial.id }, order: { id: 'ASC' } })
  const counts = {}
  for (const name of ['PayrollRun', 'PayrollItem', 'PayrollRunMember']) counts[name] = await repo(name).count()
  // Both new amounts differ so this also exercises implementations that update
  // existing rows. The second item fails after the first item has reached SQL.
  await repo('Employee').update(first.id, { basicSalary: 13000 })
  await repo('Employee').update(second.id, { basicSalary: 14000 })
  assert.equal(ds.options.database, database)
  assert.ok(Number.isSafeInteger(second.id))
  // Fail the selected employee's new amount at the SQL constraint boundary,
  // without replacing or mocking the repository's save implementation.
  await ds.query(`ALTER TABLE [dbo].[payroll_items] WITH CHECK
    ADD CONSTRAINT [CK_payroll_fixture_reject_item]
    CHECK (employeeId <> ${second.id} OR basicSalary <> 14000)`)
  try {
    const recalculated = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period, scopeType: 'CUSTOM', employeeIds: [first.id, second.id], runId: initial.id,
      reason: 'اختبار بقاء المسير السابق عند فشل الحفظ الثاني',
    })
    assert.equal(recalculated.status, 500, 'The real SQL constraint must reject the second item in recalculation')
    const persisted = await request(admin, 'GET', `/payroll/runs/${initial.id}`)
    assert.equal(persisted.status, 200)
    assert.deepEqual(persisted.body, initial, 'A failed calculation must not remove or replace the previous items, amounts or breakdown')
    assert.deepEqual(await repo('PayrollRunMember').find({ where: { runId: initial.id }, order: { id: 'ASC' } }), previousMembers)
    for (const [name, count] of Object.entries(counts)) assert.equal(await repo(name).count(), count, name)

    const created = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period, scopeType: 'CUSTOM', employeeIds: [first.id, second.id], name: 'يجب ألا يبقى هذا المسير بعد فشل SQL',
      allowDraftConflicts: true,
    })
    assert.equal(created.status, 500, 'The real SQL constraint must also reject creation')
    for (const [name, count] of Object.entries(counts)) assert.equal(await repo(name).count(), count, `Failed creation leaked ${name}`)
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${initial.id}`)).body, initial)
  } finally {
    assert.equal(ds.options.database, database)
    await ds.query('ALTER TABLE [dbo].[payroll_items] DROP CONSTRAINT [CK_payroll_fixture_reject_item]')
  }
})

test('PR-01 / PR-02: branch payroll permissions cannot calculate, read, approve, recalculate or pay another branch', async () => {
  const foreignBranch = await repo('Branch').save({ name: 'Other payroll branch fixture', code: 'COV_OTHER' })
  const manager = await repo('User').save({ email: 'branch@payroll-coverage.invalid', displayName: 'Branch payroll fixture',
    passwordHash: 'test-only', role: 'hr_manager', branchId: branch.id,
    permissions: JSON.stringify(['payroll.view', 'payroll.calculate', 'payroll.approve', 'payroll.pay']) })
  const ownEmployee = await employee()
  const foreignEmployee = await employee({ branchId: foreignBranch.id })
  await attendance(ownEmployee, startDate, endDate)
  await attendance(foreignEmployee, startDate, endDate)
  const loan = await repo('Loan').save({ employeeId: foreignEmployee.id, amount: 700, status: 'DISBURSED' })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, amount: 700, dueDate: '2026-07-01', paid: false })

  // A valid request within the user's branch must work; blanket rejection would
  // otherwise hide a broken authorization implementation.
  const ownRun = await request(manager, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: [ownEmployee.id], name: 'المسير المسموح داخل الفرع',
  })
  assert.equal(ownRun.status, 201, JSON.stringify(ownRun.body))
  assert.deepEqual(ownRun.body.items.map(row => row.employeeId), [ownEmployee.id])
  const foreignRun = await calculate([foreignEmployee], {
    scopeType: 'BRANCH', branchId: foreignBranch.id, scopeIds: [foreignBranch.id], employeeIds: undefined,
  })
  async function snapshot() {
    const counts = {}
    for (const name of ['PayrollRun', 'PayrollItem', 'PayrollRunMember', 'AttendanceDay']) counts[name] = await repo(name).count()
    return { counts,
      run: await repo('PayrollRun').findOneByOrFail({ id: foreignRun.id }),
      items: await repo('PayrollItem').find({ where: { runId: foreignRun.id }, order: { id: 'ASC' } }),
      members: await repo('PayrollRunMember').find({ where: { runId: foreignRun.id }, order: { id: 'ASC' } }),
      attendance: await repo('AttendanceDay').find({ where: { employeeId: foreignEmployee.id }, order: { date: 'ASC' } }),
      installment: await repo('LoanInstallment').findOneByOrFail({ id: installment.id }),
    }
  }
  const before = await snapshot()
  const attempts = [
    ['POST', '/payroll/runs/calculate-defined', { period, scopeType: 'CUSTOM', employeeIds: [ownEmployee.id, foreignEmployee.id] }],
    ['POST', '/payroll/runs/calculate-defined', { period, scopeType: 'COMPANY' }],
    ['POST', '/payroll/runs/calculate', { period, branchId: foreignBranch.id }],
    ['GET', `/payroll/runs/${foreignRun.id}`],
    ['GET', `/payroll/items/${itemFor(foreignRun, foreignEmployee).id}`],
    ['POST', `/payroll/runs/${foreignRun.id}/approve`],
    ['POST', '/payroll/runs/calculate-defined', { period, scopeType: 'BRANCH', runId: foreignRun.id,
      branchId: foreignBranch.id, scopeIds: [foreignBranch.id] }],
  ]
  for (const [method, endpoint, body] of attempts) {
    const response = await request(manager, method, endpoint, body)
    assert.ok([403, 404].includes(response.status), `${method} ${endpoint}: ${response.status} ${JSON.stringify(response.body)}`)
    assert.deepEqual(await snapshot(), before, `Rejected ${method} ${endpoint} changed data`)
  }

  // Exercise pay in its valid business state, so a status check cannot pass for
  // branch authorization. This approval is by the unrestricted test admin.
  await acknowledgeUnassigned(admin, foreignRun.id)
  const approved = await request(admin, 'POST', `/payroll/runs/${foreignRun.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const beforePay = await snapshot()
  assert.equal(beforePay.run.status, 'APPROVED')
  const foreignSlip = await request(manager, 'GET', `/payroll/items/${itemFor(foreignRun, foreignEmployee).id}`)
  assert.ok([403, 404].includes(foreignSlip.status), `Approved foreign payslip: ${foreignSlip.status} ${JSON.stringify(foreignSlip.body)}`)
  assert.deepEqual(await snapshot(), beforePay, 'Rejected access to an approved payslip changed data')
  const paid = await request(manager, 'POST', `/payroll/runs/${foreignRun.id}/pay`)
  assert.ok([403, 404].includes(paid.status), `Foreign pay: ${paid.status} ${JSON.stringify(paid.body)}`)
  assert.deepEqual(await snapshot(), beforePay, 'Rejected payment changed payroll or consumed the foreign installment')
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid, false)
})

test('PR-08: recalculation keeps the stored period dates after the company cycle setting changes', async () => {
  const emp = await employee({ joinDate: '2026-07-01', basicSalary: 6000 })
  await attendance(emp, '2026-07-01', endDate)
  const initial = await calculate([emp])
  assert.equal(amount(itemFor(initial, emp).netPay), 4400)
  const oldConfig = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.cycle_start_day' })
  const oldAttendance = await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } })
  try {
    await repo('RequestsConfig').save({ key: oldConfig.key, value: '30' })
    const recalculated = await calculate([emp], { runId: initial.id, reason: 'التحقق من ثبات تواريخ المسير بعد تغيير إعداد الدورة' })
    const item = itemFor(recalculated, emp)
    assert.equal(recalculated.id, initial.id)
    assert.equal(recalculated.startDate, '2026-06-23')
    assert.equal(recalculated.endDate, '2026-07-22')
    assert.equal(amount(item.netPay), 4400)
    coverageIs(item, { coverFrom: '2026-07-01', coverTo: '2026-07-22', coverDays: 22, grossEarned: 4400 })
    assert.deepEqual(await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } }), oldAttendance)
  } finally {
    await repo('RequestsConfig').save(oldConfig)
  }
})

test('PR-08 / PR-11: recalculation cannot change the stored period or scope type and preserves the old snapshot', async () => {
  const emp = await employee()
  await attendance(emp, startDate, endDate)
  const initial = await calculate([emp])
  const previousMembers = await repo('PayrollRunMember').find({ where: { runId: initial.id }, order: { id: 'ASC' } })
  const previousAttendance = await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } })
  const counts = {}
  for (const name of ['PayrollRun', 'PayrollItem', 'PayrollRunMember', 'AttendanceDay']) counts[name] = await repo(name).count()
  for (const changed of [
    { period: '2026-08' },
    { scopeType: 'BRANCH', branchId: branch.id, scopeIds: [branch.id] },
  ]) {
    const response = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
      period, scopeType: 'CUSTOM', employeeIds: [emp.id], runId: initial.id, ...changed,
    })
    assert.ok([400, 409].includes(response.status), `Changed definition ${JSON.stringify(changed)}: ${response.status} ${JSON.stringify(response.body)}`)
    assert.deepEqual((await request(admin, 'GET', `/payroll/runs/${initial.id}`)).body, initial)
    assert.deepEqual(await repo('PayrollRunMember').find({ where: { runId: initial.id }, order: { id: 'ASC' } }), previousMembers)
    assert.deepEqual(await repo('AttendanceDay').find({ where: { employeeId: emp.id }, order: { date: 'ASC' } }), previousAttendance)
    for (const [name, count] of Object.entries(counts)) assert.equal(await repo(name).count(), count, name)
  }
})

test('PR-11: an employee cannot read their calculated draft payslip but can read the same item after approval', async () => {
  const emp = await employee({ basicSalary: 6000 })
  await attendance(emp, startDate, endDate)
  const owner = await repo('User').save({ email: 'owner@payroll-coverage.invalid', displayName: 'Payslip owner fixture',
    passwordHash: 'test-only', role: 'employee', branchId: branch.id, employeeId: emp.id, permissions: '[]' })
  const run = await calculate([emp])
  const item = itemFor(run, emp)
  const draft = await request(owner, 'GET', `/payroll/items/${item.id}`)
  assert.ok([403, 404].includes(draft.status), `Draft payslip: ${draft.status} ${JSON.stringify(draft.body)}`)
  const beforeList = await request(owner, 'GET', '/payroll/my-payslips')
  assert.equal(beforeList.status, 200)
  assert.ok(!beforeList.body.some(row => row.item.id === item.id), 'A calculated draft must not leak through the employee list')
  assert.equal((await repo('PayrollRun').findOneByOrFail({ id: run.id })).status, 'CALCULATED')

  await acknowledgeUnassigned(admin, run.id)
  const approved = await request(admin, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const published = await request(owner, 'GET', `/payroll/items/${item.id}`)
  assert.equal(published.status, 200, JSON.stringify(published.body))
  assert.equal(published.body.item.id, item.id)
  assert.equal(published.body.item.employeeId, emp.id)
  assert.equal(amount(published.body.item.netPay), 6000)
  assert.equal(published.body.run.status, 'APPROVED')
  const afterList = await request(owner, 'GET', '/payroll/my-payslips')
  assert.equal(afterList.status, 200)
  assert.ok(afterList.body.some(row => row.item.id === item.id && row.run.status === 'APPROVED'))
})

test('PR-10: half-cent proration rounds upward and the adjusted components equal the earned gross', async t => {
  const single = await employee({ joinDate: '2026-07-20', basicSalary: 30.15 })
  const split = await employee({ joinDate: '2026-07-20', basicSalary: 10.15, housingAllowance: 10.15, transportAllowance: 10.15 })
  await attendance(single, '2026-07-20', endDate)
  await attendance(split, '2026-07-20', endDate)
  const run = await calculate([single, split])
  const singleItem = itemFor(run, single)
  assert.equal(amount(singleItem.netPay), 3.02, '30.15 × 3 / 30 = 3.015 must round to 3.02')
  assert.equal(amount(singleItem.basicSalary), 3.02)
  deductionsAreZero(singleItem)
  coverageIs(singleItem, { coverFrom: '2026-07-20', coverTo: endDate, coverDays: 3, grossEarned: 3.02, prorataFactor: 0.1 })

  const splitItem = itemFor(run, split)
  assert.equal(amount(splitItem.netPay), 3.05, '30.45 × 3 / 30 = 3.045 must round to 3.05')
  assert.equal(Math.round(amount(splitItem.basicSalary) * 100) + Math.round(amount(splitItem.allowances) * 100), 305,
    'Rounded basic salary and allowances must reconcile to 305 cents after the one-cent adjustment')
  deductionsAreZero(splitItem)
  coverageIs(splitItem, { coverFrom: '2026-07-20', coverTo: endDate, coverDays: 3, grossEarned: 3.05, prorataFactor: 0.1 })
  const splitBreakdown = JSON.parse(splitItem.breakdown)
  assert.equal(splitBreakdown.earnedComponents.reduce((cents, component) => cents + Math.round(component * 100), 0), 305)
  assert.equal(amount(run.totalNet), 6.07)
  t.diagnostic('Manual half-cent cases: 30.15 × 3/30 = 3.02; (10.15 + 10.15 + 10.15) × 3/30 = 3.05; component cents and run total reconcile.')
})
