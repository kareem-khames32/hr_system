// SPEC 4-D / EX-09..EX-14: dated attendance exemption and its financial boundaries.
// Real SQL + Nest HTTP. Approved windows are seeded only in this disposable fixture database.
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
const database = `hr_payroll_exempt_test_${crypto.randomBytes(8).toString('hex')}`
const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-payroll-exempt-files-'))
const secret = crypto.randomBytes(48).toString('hex')
const jwt = new (require('../node_modules/@nestjs/jwt').JwtService)({ secret })
const period = '2026-06', startDate = '2026-06-01', endDate = '2026-06-30'
let app, master, ds, base, admin, approver, branch, created = false, employeeNumber = 0
const repo = name => ds.getRepository(name)
function token(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, branchId: user.branchId ?? null,
    employeeId: user.employeeId ?? null, tokenVersion: user.tokenVersion ?? 0,
    permissions: user.role === 'super_admin' ? ['*'] : JSON.parse(user.permissions || '[]') })
}
async function request(user, method, endpoint, body) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json',
    ...(user ? { Authorization: `Bearer ${token(user)}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : null }
}
async function employee(overrides = {}) {
  return repo('Employee').save({ employeeCode: `EXM${String(++employeeNumber).padStart(3, '0')}`,
    fullName: `موظف اختبار الاستثناء ${employeeNumber}`, branchId: branch.id, joinDate: '2020-01-01',
    basicSalary: 12000, housingAllowance: 3000, transportAllowance: 0, otherAllowance: 0,
    status: 'active', isActive: true, payMethod: 'transfer', ...overrides })
}
async function exemption(emp, overrides = {}) {
  return repo('AttendanceExemption').save({ employeeId: emp.id, effectiveFrom: startDate, effectiveTo: endDate,
    reasonCode: 'field_role', reason: 'عمل ميداني — نافذة اختبار معزولة', status: 'APPROVED',
    createdByUserId: admin.id, approvedByUserId: approver.id, approvedAt: new Date('2026-05-01T08:00:00Z'),
    terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false, ...overrides })
}
async function day(emp, date, overrides = {}) {
  return repo('AttendanceDay').save({ employeeId: emp.id, branchId: emp.branchId, date,
    status: 'present', checkIn: '08:00', checkOut: '16:00', shiftName: 'وردية اختبار الاستثناء',
    shiftStart: '08:00', shiftEnd: '16:00', scheduleSource: 'override', lateMinutes: 0,
    earlyLeaveMinutes: 0, deductibleMinutes: 0, workMinutes: 480, ...overrides })
}
async function presentDays(emp, from = startDate, to = endDate, omitted = []) {
  for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10)
    if (!omitted.includes(date)) await day(emp, date)
  }
}
async function staleAbsence(emp, date) {
  return day(emp, date, { status: 'absent', checkIn: null, checkOut: null, workMinutes: 0 })
}
async function calculate(employees, extra = {}) {
  const result = await request(admin, 'POST', '/payroll/runs/calculate-defined', {
    period, scopeType: 'CUSTOM', employeeIds: employees.map(emp => emp.id), name: `اختبار الاستثناء ${crypto.randomUUID().slice(0, 8)}`, ...extra,
  })
  assert.equal(result.status, 201, JSON.stringify(result.body))
  return result.body
}
function item(run, emp) {
  const found = run.items.find(row => row.employeeId === emp.id)
  assert.ok(found, emp.employeeCode)
  return found
}
function assertNoAttendanceDeductions(row) {
  for (const field of ['absenceDays', 'absenceDeduction', 'lateMinutes', 'latenessDeduction']) assert.equal(Number(row[field]), 0, field)
  const breakdown = JSON.parse(row.breakdown)
  assert.deepEqual(breakdown.absentDates, [])
  assert.deepEqual(breakdown.attendanceDayIds, [])
}
function assertExemptionSnapshot(run, emp, window, exemptDays, isAttendanceExempt) {
  const breakdown = JSON.parse(item(run, emp).breakdown)
  const snapshot = run.members.find(row => row.employeeId === emp.id).snapshot
  for (const target of [breakdown, snapshot]) {
    assert.equal(target.exemptDays, exemptDays)
    assert.equal(target.isAttendanceExempt, isAttendanceExempt)
    assert.ok(Array.isArray(target.attendanceExemptions))
    if (window) {
      const saved = target.attendanceExemptions.find(row => row.id === window.id)
      assert.ok(saved, 'The exemption decision must be frozen in payroll detail and member snapshot')
      assert.equal(saved.effectiveFrom, window.effectiveFrom)
      assert.equal(saved.effectiveTo, window.effectiveTo ?? null)
      assert.equal(saved.terminatedFrom, window.terminatedFrom ?? null)
      assert.equal(saved.reasonCode, window.reasonCode)
      assert.equal(typeof saved.overtimeEligible, 'boolean')
      assert.equal(typeof saved.unpaidLeaveDeductible, 'boolean')
      assert.ok(typeof saved.overtimeSource === 'string' && saved.overtimeSource.length > 0)
      assert.ok(typeof saved.unpaidLeaveSource === 'string' && saved.unpaidLeaveSource.length > 0)
    } else assert.deepEqual(target.attendanceExemptions, [])
  }
  return breakdown.attendanceExemptions.find(row => row.id === window?.id)
}
async function obligation(emp, amount) {
  return repo('EmployeeObligation').save({ employeeId: emp.id, type: 'DEBIT', category: 'quality', label: 'خصم جودة موثق — اختبار',
    amount, status: 'PENDING', effectiveDate: '2026-06-01', createdByUserId: admin.id })
}
async function unpaidLeave(emp) {
  return repo('Leave').save({ employeeId: emp.id, leaveTypeCode: 'UNPAID', fromDate: '2026-06-08', toDate: '2026-06-11',
    days: 4, period: 'FULL', isUnpaid: true, status: 'APPROVED' })
}
async function overtime(emp, { source = 'PRE_REQUESTED', hours = 6, requestStatus = 'APPROVED', noRequest = false, date = '2026-06-09' } = {}) {
  const sourceRequest = noRequest ? null : await repo('Request').save({ typeCode: source === 'BIOMETRIC_DETECTED' ? 'OVERTIME_AUTO' : 'OVERTIME',
    requesterId: emp.id, branchId: emp.branchId, createdByUserId: admin.id, status: requestStatus,
    payload: JSON.stringify({ date, hours }), submittedAt: new Date('2026-05-31T08:00:00Z') })
  return repo('OvertimeEntry').save({ employeeId: emp.id, requestId: sourceRequest?.id ?? null, date, source,
    hoursRequested: hours, hoursActual: hours, payableHours: hours, rate: 1.5, status: 'APPROVED', payrollRunId: null })
}
async function approveAndPay(run) {
  const approved = await request(approver, 'POST', `/payroll/runs/${run.id}/approve`)
  assert.equal(approved.status, 201, JSON.stringify(approved.body))
  const paid = await request(admin, 'POST', `/payroll/runs/${run.id}/pay`)
  assert.equal(paid.status, 201, JSON.stringify(paid.body))
}

before(async () => {
  assert.equal(env.DB_TYPE || 'mssql', 'mssql')
  assert.match(database, /^hr_payroll_exempt_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
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
  branch = await repo('Branch').save({ code: 'EXEMPT_TEST', name: 'فرع اختبار الاستثناء من الحضور' })
  const user = email => repo('User').save({ email, displayName: email, passwordHash: 'test-only', role: 'super_admin', permissions: '["*"]' })
  admin = await user('admin@payroll-exempt.invalid'); approver = await user('approver@payroll-exempt.invalid')
  await repo('RequestsConfig').save([
    { key: 'payroll.cycle_start_day', value: '1' }, { key: 'payroll.monthly_days', value: '30' },
    { key: 'payroll.daily_hours', value: '8' }, { key: 'payroll.late_deduction_enabled', value: 'true' },
    { key: 'attendance.absence_penalty_days', value: '1' }, { key: 'attendance.weekend_days', value: 'FRI,SAT' },
    { key: 'payroll.exempt_overtime_eligible', value: 'false' }, { key: 'payroll.exempt_unpaid_leave_deductible', value: 'true' },
    // أمثلة الاستثناء ثابتة في يونيو؛ مهلة الاختبار المعزول لا تغيّر سياسة النظام الفعلية.
    { key: 'overtime.request_backdate_days', value: String(Math.max(30, Math.ceil((Date.now() - Date.parse(startDate)) / 86400000) + 2)) },
  ])
}, { timeout: 60000 })
after(async t => {
  const errors = []
  try { if (app) await app.close() } catch (error) { errors.push(error) }
  try {
    if (created && master) {
      assert.match(database, /^hr_payroll_exempt_test_[a-f0-9]{16}$/); assert.notEqual(database, env.DB_DATABASE)
      await master.request().query(`ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]`)
      const found = await master.request().input('database', sql.NVarChar, database).query('SELECT name FROM sys.databases WHERE name = @database')
      assert.equal(found.recordset.length, 0)
      t.diagnostic(`Cleanup verified: ${database} is absent from sys.databases.`)
    }
  } catch (error) { errors.push(error) }
  try { if (master) await master.close() } catch (error) { errors.push(error) }
  try {
    assert.equal(path.dirname(path.resolve(uploads)), path.resolve(os.tmpdir())); assert.match(path.basename(uploads), /^hr-payroll-exempt-files-/)
    fs.rmSync(uploads, { recursive: true, force: true }); assert.equal(fs.existsSync(uploads), false)
    t.diagnostic('Cleanup verified: temporary uploads directory removed.')
  } catch (error) { errors.push(error) }
  if (errors.length) throw new AggregateError(errors, 'Attendance exemption fixture cleanup failed')
})

test('EX-10: full-month exemption defeats stale absence/95-minute lateness and new absence generation but retains a 500 quality debit', async t => {
  const emp = await employee()
  const window = await exemption(emp)
  for (const date of ['2026-06-03', '2026-06-04', '2026-06-08']) await staleAbsence(emp, date)
  await day(emp, '2026-06-09', { status: 'late', lateMinutes: 95, earlyLeaveMinutes: 80, deductibleMinutes: 25 })
  await repo('AttendancePunch').save([
    { employeeId: emp.id, employeeCode: emp.employeeCode, punchTime: new Date('2026-06-09T10:00:00'), source: 'DEVICE', deviceSn: 'EXEMPT_FIXTURE' },
    { employeeId: emp.id, employeeCode: emp.employeeCode, punchTime: new Date('2026-06-09T19:00:00'), source: 'DEVICE', deviceSn: 'EXEMPT_FIXTURE' },
  ])
  const punches = await repo('AttendancePunch').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } })
  await obligation(emp, 500)
  const strictTier = await repo('LatenessTier').save({ fromMinutes: 1, toMinutes: null, mode: 'FRACTION', value: 3, isActive: true })
  let run
  try { run = await calculate([emp]) } finally { await repo('LatenessTier').delete(strictTier.id) }
  const result = item(run, emp)
  assertNoAttendanceDeductions(result)
  assert.equal(Number(result.otherDeductions), 500)
  assert.equal(Number(result.netPay), 14500)
  const decision = assertExemptionSnapshot(run, emp, window, 30, true)
  assert.equal(decision.overtimeEligible, false)
  assert.equal(decision.unpaidLeaveDeductible, true)
  const rows = await repo('AttendanceDay').find({ where: { employeeId: emp.id } })
  for (const date of ['2026-06-03', '2026-06-04', '2026-06-08', '2026-06-10']) {
    assert.equal(rows.find(row => row.date === date)?.status, 'exempt', `${date}: stale/new attendance must be marked exempt`)
  }
  assert.deepEqual(await repo('AttendancePunch').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } }), punches)
  t.diagnostic('Manual: 12000 + 3000 − 500 quality = 14500; three stale absences and 95 late minutes generate no attendance deduction.')
})

test('EX-12: four approved unpaid days still deduct 2000 from an exempt employee', async () => {
  const emp = await employee(), window = await exemption(emp), leave = await unpaidLeave(emp)
  const run = await calculate([emp]), result = item(run, emp)
  assertNoAttendanceDeductions(result)
  assert.equal(Number(result.unpaidLeaveDays), 4)
  assert.equal(Number(result.unpaidLeaveDeduction), 2000)
  assert.equal(Number(result.netPay), 13000)
  assert.ok(JSON.parse(result.breakdown).unpaidLeaveIds.includes(leave.id))
  assertExemptionSnapshot(run, emp, window, 30, true)
  assert.equal((await repo('Leave').findOneByOrFail({ id: leave.id })).status, 'APPROVED')
})

test('EX-10: a 2000 loan installment and 400 documented quality debit remain payable and consumed normally', async () => {
  const emp = await employee({ basicSalary: 15000, housingAllowance: 4000 })
  await exemption(emp)
  const loan = await repo('Loan').save({ employeeId: emp.id, amount: 2000, status: 'DISBURSED' })
  const installment = await repo('LoanInstallment').save({ loanId: loan.id, dueDate: '2026-06-01', amount: 2000, paid: false })
  const quality = await obligation(emp, 400)
  const run = await calculate([emp]), result = item(run, emp)
  assertNoAttendanceDeductions(result)
  assert.equal(Number(result.loanInstallments), 2000)
  assert.equal(Number(result.otherDeductions), 400)
  assert.equal(Number(result.netPay), 16600)
  await approveAndPay(run)
  assert.equal((await repo('LoanInstallment').findOneByOrFail({ id: installment.id })).paid, true)
  const consumed = await repo('EmployeeObligation').findOneByOrFail({ id: quality.id })
  assert.equal(consumed.status, 'APPLIED')
  assert.equal(consumed.appliedPayrollRunId, run.id)
})

test('EX-13: June 16–30 exempts 15 days; only June 8 absence and June 3 forty-minute lateness are deducted', async () => {
  const emp = await employee({ basicSalary: 9000, housingAllowance: 0 })
  const window = await exemption(emp, { effectiveFrom: '2026-06-16' })
  await presentDays(emp, startDate, '2026-06-15', ['2026-06-03', '2026-06-08'])
  await day(emp, '2026-06-03', { status: 'late', lateMinutes: 40 })
  await staleAbsence(emp, '2026-06-08')
  const outsideDeductions = [await staleAbsence(emp, '2026-06-20'), await staleAbsence(emp, '2026-06-27')]
  const run = await calculate([emp]), result = item(run, emp), breakdown = JSON.parse(result.breakdown)
  assert.equal(Number(result.absenceDays), 1)
  assert.equal(Number(result.absenceDeduction), 300)
  assert.equal(Number(result.lateMinutes), 40)
  assert.equal(Number(result.latenessDeduction), 25)
  assert.equal(Number(result.netPay), 8675)
  assert.deepEqual(breakdown.absentDates, ['2026-06-08'])
  assert.ok(outsideDeductions.every(row => !breakdown.attendanceDayIds.includes(row.id)))
  assertExemptionSnapshot(run, emp, window, 15, false)
})

test('EX-13: exemption boundaries are inclusive for a single day and for a last working day at period end', async () => {
  const single = await employee({ basicSalary: 9000, housingAllowance: 0 })
  const singleWindow = await exemption(single, { effectiveFrom: '2026-06-08', effectiveTo: '2026-06-08' })
  await presentDays(single, startDate, endDate, ['2026-06-08', '2026-06-09'])
  await staleAbsence(single, '2026-06-08'); await staleAbsence(single, '2026-06-09')
  const ended = await employee({ basicSalary: 9000, housingAllowance: 0, isActive: false, status: 'terminated' })
  await repo('OffboardingCase').save({ employeeId: ended.id, lastWorkingDay: endDate, status: 'CLOSED', terminationReason: 'contract_end' })
  const endWindow = await exemption(ended, { effectiveFrom: endDate, effectiveTo: endDate })
  await presentDays(ended, startDate, '2026-06-29'); await staleAbsence(ended, endDate)
  const run = await calculate([single, ended])
  assert.equal(Number(item(run, single).absenceDays), 1)
  assert.deepEqual(JSON.parse(item(run, single).breakdown).absentDates, ['2026-06-09'])
  assert.equal(Number(item(run, single).netPay), 8700)
  assertExemptionSnapshot(run, single, singleWindow, 1, false)
  assertNoAttendanceDeductions(item(run, ended))
  assert.equal(Number(item(run, ended).netPay), 9000)
  assertExemptionSnapshot(run, ended, endWindow, 1, false)
})

test('EX-13: terminating a window from June 16 restores attendance deductions on June 16 itself', async () => {
  const emp = await employee(), window = await exemption(emp, { terminatedFrom: '2026-06-16' })
  await presentDays(emp, '2026-06-16', endDate, ['2026-06-16'])
  await staleAbsence(emp, '2026-06-16')
  const run = await calculate([emp]), result = item(run, emp)
  assert.equal(Number(result.absenceDays), 1)
  assert.equal(Number(result.absenceDeduction), 500)
  assert.equal(Number(result.netPay), 14500)
  assertExemptionSnapshot(run, emp, window, 15, false)
})

test('EX-09: a pending exemption has no financial effect before approval', async () => {
  const emp = await employee()
  await exemption(emp, { status: 'PENDING', approvedByUserId: null, approvedAt: null })
  await presentDays(emp, startDate, endDate, ['2026-06-08']); await staleAbsence(emp, '2026-06-08')
  const run = await calculate([emp]), result = item(run, emp)
  assert.equal(Number(result.absenceDays), 1)
  assert.equal(Number(result.absenceDeduction), 500)
  assert.equal(Number(result.netPay), 14500)
  assertExemptionSnapshot(run, emp, null, 0, false)
})

test('EX-13 / PR-10: a new exempt hire still receives only 13/30 of 19000 in a 31-day cycle', async () => {
  const oldConfig = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.cycle_start_day' })
  try {
    await repo('RequestsConfig').save({ key: oldConfig.key, value: '23' })
    const emp = await employee({ basicSalary: 15000, housingAllowance: 4000, joinDate: '2026-08-10' })
    const window = await exemption(emp, { effectiveFrom: '2026-08-01', effectiveTo: null })
    const run = await calculate([emp], { period: '2026-08' }), result = item(run, emp)
    assert.equal(run.startDate, '2026-07-23'); assert.equal(run.endDate, '2026-08-22')
    assert.equal(Number(result.netPay), 8233.33)
    assertNoAttendanceDeductions(result)
    const breakdown = JSON.parse(result.breakdown)
    assert.equal(breakdown.coverDays, 13); assert.equal(breakdown.monthlyDays, 30)
    assert.equal(breakdown.grossEarned, 8233.33)
    assertExemptionSnapshot(run, emp, window, 13, true)
    const attendance = await repo('AttendanceDay').find({ where: { employeeId: emp.id } })
    assert.ok(attendance.every(row => row.date >= '2026-08-10' && row.date <= '2026-08-22'))
  } finally { await repo('RequestsConfig').save(oldConfig) }
})

test('EX-11: default-ineligible overtime is excluded from source claims and is neither deleted nor consumed at payroll payment', async () => {
  const emp = await employee(), window = await exemption(emp)
  const requested = await overtime(emp)
  const biometric = await overtime(emp, { source: 'BIOMETRIC_DETECTED', hours: 3, date: '2026-06-10' })
  const original = await repo('OvertimeEntry').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } })
  const run = await calculate([emp]), result = item(run, emp), breakdown = JSON.parse(result.breakdown)
  assert.equal(Number(result.overtimeHours), 0)
  assert.equal(Number(result.overtimeAmount), 0)
  assert.equal(Number(result.netPay), 15000)
  assert.deepEqual(breakdown.overtimeEntryIds, [])
  assert.deepEqual([...breakdown.excludedOvertimeEntryIds].sort((a, b) => a - b), [requested.id, biometric.id])
  assert.equal(assertExemptionSnapshot(run, emp, window, 30, true).overtimeEligible, false)
  const oldDefault = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.exempt_overtime_eligible' })
  try {
    await repo('RequestsConfig').save({ key: oldDefault.key, value: 'true' })
    const frozen = await request(admin, 'GET', `/payroll/runs/${run.id}`)
    assert.equal(frozen.status, 200)
    assert.deepEqual(frozen.body.members, run.members)
    assert.deepEqual(frozen.body.items, run.items)
    await approveAndPay(run)
    assert.deepEqual(await repo('OvertimeEntry').find({ where: { employeeId: emp.id }, order: { id: 'ASC' } }), original)
  } finally { await repo('RequestsConfig').save(oldDefault) }
})

test('EX-11: individual eligibility pays only a genuine approved PRE_REQUESTED entry, never biometric or missing/rejected requests', async () => {
  const emp = await employee(), window = await exemption(emp, { overtimeEligibleOverride: true })
  const valid = await overtime(emp)
  const biometric = await overtime(emp, { source: 'BIOMETRIC_DETECTED', hours: 6, date: '2026-06-10' })
  const orphan = await overtime(emp, { noRequest: true, hours: 10, date: '2026-06-11' })
  const rejected = await overtime(emp, { requestStatus: 'REJECTED', hours: 4, date: '2026-06-15' })
  const run = await calculate([emp]), result = item(run, emp), breakdown = JSON.parse(result.breakdown)
  assert.equal(Number(result.overtimeHours), 6)
  assert.equal(Number(result.overtimeAmount), 562.5)
  assert.equal(Number(result.netPay), 15562.5)
  assert.deepEqual(breakdown.overtimeEntryIds, [valid.id])
  assert.deepEqual([...breakdown.excludedOvertimeEntryIds].sort((a, b) => a - b), [biometric.id, orphan.id, rejected.id])
  assert.equal(assertExemptionSnapshot(run, emp, window, 30, true).overtimeEligible, true)
  await approveAndPay(run)
  const consumed = await repo('OvertimeEntry').findOneByOrFail({ id: valid.id })
  assert.equal(consumed.status, 'PAID'); assert.equal(consumed.payrollRunId, run.id)
  for (const row of [biometric, orphan, rejected]) {
    const unchanged = await repo('OvertimeEntry').findOneByOrFail({ id: row.id })
    assert.equal(unchanged.status, 'APPROVED'); assert.equal(unchanged.payrollRunId, null)
  }
})

test('EX-12: an explicit unpaid-leave override preserves four approved leave days without deducting them', async () => {
  const emp = await employee(), window = await exemption(emp, { unpaidLeaveDeductibleOverride: false }), leave = await unpaidLeave(emp)
  const run = await calculate([emp]), result = item(run, emp)
  assertNoAttendanceDeductions(result)
  assert.equal(Number(result.unpaidLeaveDeduction), 0)
  assert.equal(Number(result.netPay), 15000)
  assert.equal(assertExemptionSnapshot(run, emp, window, 30, true).unpaidLeaveDeductible, false)
  const saved = await repo('Leave').findOneByOrFail({ id: leave.id })
  assert.equal(Number(saved.days), 4); assert.equal(saved.status, 'APPROVED')
})

test('EX-11 / EX-12: null overrides inherit company defaults while explicit false/true override them', async () => {
  const oldOt = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.exempt_overtime_eligible' })
  const oldUnpaid = await repo('RequestsConfig').findOneByOrFail({ key: 'payroll.exempt_unpaid_leave_deductible' })
  try {
    await repo('RequestsConfig').save([{ key: oldOt.key, value: 'true' }, { key: oldUnpaid.key, value: 'false' }])
    const inherited = await employee(), inheritedWindow = await exemption(inherited)
    const explicit = await employee(), explicitWindow = await exemption(explicit, { overtimeEligibleOverride: false, unpaidLeaveDeductibleOverride: true })
    await overtime(inherited); await overtime(explicit)
    await unpaidLeave(inherited); await unpaidLeave(explicit)
    const run = await calculate([inherited, explicit])
    assert.equal(Number(item(run, inherited).overtimeAmount), 562.5)
    assert.equal(Number(item(run, inherited).unpaidLeaveDeduction), 0)
    assert.equal(Number(item(run, inherited).netPay), 15562.5)
    assert.equal(Number(item(run, explicit).overtimeAmount), 0)
    assert.equal(Number(item(run, explicit).unpaidLeaveDeduction), 2000)
    assert.equal(Number(item(run, explicit).netPay), 13000)
    const inheritedDecision = assertExemptionSnapshot(run, inherited, inheritedWindow, 30, true)
    const explicitDecision = assertExemptionSnapshot(run, explicit, explicitWindow, 30, true)
    assert.equal(inheritedDecision.overtimeEligible, true); assert.equal(inheritedDecision.unpaidLeaveDeductible, false)
    assert.equal(explicitDecision.overtimeEligible, false); assert.equal(explicitDecision.unpaidLeaveDeductible, true)
  } finally { await repo('RequestsConfig').save([oldOt, oldUnpaid]) }
})

test('EX-14: dashboard stats, weekly trend and departments exclude a stale absent exemption from attendance ratios without rewriting it', async () => {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const localBranch = await repo('Branch').save({ code: 'EXEMPT_DASH', name: 'فرع مؤشرات المستثنين — اختبار معزول' })
  const department = await repo('Department').save({ branchId: localBranch.id, code: 'EXEMPT_DASH_DEPT', name: 'قسم اختبار نسبة الحضور' })
  const manager = await repo('User').save({ email: 'dashboard@payroll-exempt.invalid', displayName: 'مراجع مؤشرات الاختبار',
    passwordHash: 'test-only', role: 'hr_manager', branchId: localBranch.id,
    permissions: JSON.stringify(['dashboard.view_all', 'requests.view_all']) })
  for (let index = 0; index < 9; index++) {
    const present = await employee({ branchId: localBranch.id, departmentId: department.id, basicSalary: 0, housingAllowance: 0 })
    await day(present, today)
  }
  const exempt = await employee({ branchId: localBranch.id, departmentId: department.id, basicSalary: 0, housingAllowance: 0 })
  await exemption(exempt, { effectiveFrom: today, effectiveTo: today })
  const oldAbsent = await staleAbsence(exempt, today)
  // An unrelated branch's absent employee must not enter the scoped denominator.
  const outsider = await employee({ basicSalary: 0, housingAllowance: 0 })
  await staleAbsence(outsider, today)
  const before = await repo('AttendanceDay').find({ where: { branchId: localBranch.id }, order: { id: 'ASC' } })
  assert.equal(before.length, 10)
  assert.equal(before.find(row => row.id === oldAbsent.id).status, 'absent')

  const stats = await request(manager, 'GET', '/dashboard/stats')
  assert.equal(stats.status, 200, JSON.stringify(stats.body))
  assert.equal(stats.body.employees.total, 10)
  assert.equal(stats.body.attendanceToday.attended, 9)
  assert.equal(stats.body.attendanceToday.absent, 0)

  const trend = await request(manager, 'GET', '/dashboard/attendance-trend?period=week')
  assert.equal(trend.status, 200, JSON.stringify(trend.body))
  assert.equal(trend.body.period, 'week')
  assert.equal(trend.body.days.length, 7)
  const currentDay = trend.body.days.find(row => row.date === today)
  assert.ok(currentDay)
  assert.equal(currentDay.attended, 9)
  assert.equal(currentDay.absent, 0)

  const departments = await request(manager, 'GET', '/dashboard/departments')
  assert.equal(departments.status, 200, JSON.stringify(departments.body))
  assert.equal(departments.body.date, today)
  assert.equal(departments.body.departments.length, 1)
  const row = departments.body.departments.find(row => row.id === department.id)
  assert.ok(row)
  assert.equal(row.employees, 10)
  assert.equal(row.exempt, 1)
  assert.equal(row.attended, 9)
  assert.equal(row.absent, 0)
  assert.equal(row.attended / (row.employees - row.exempt), 1)
  assert.equal(row.attended / (row.attended + row.absent), 1)
  assert.deepEqual(await repo('AttendanceDay').find({ where: { branchId: localBranch.id }, order: { id: 'ASC' } }), before,
    'Dashboard reads must apply the exemption window without modifying source attendance')
})

async function overtimeRequestFixture(emp) {
  let chain = await repo('ApprovalChain').findOneBy({ code: 'EXEMPT_OVERTIME_HTTP' })
  if (!chain) {
    chain = await repo('ApprovalChain').save({ code: 'EXEMPT_OVERTIME_HTTP', nameAr: 'اعتماد إضافي المستثنى — اختبار',
      requestTypeCode: 'OVERTIME', isActive: true, autoApprove: false })
    await repo('ApprovalStep').save([
      { chainId: chain.id, stepOrder: 1, approverRole: 'executive' },
      { chainId: chain.id, stepOrder: 2, approverRole: 'hr' },
    ])
  }
  const existing = await repo('RequestType').findOneBy({ code: 'OVERTIME' })
  await repo('RequestType').save({ ...existing, code: 'OVERTIME', nameAr: 'عمل إضافي', category: 'time_attendance',
    destinationHandler: 'overtime_entries', approvalChainId: chain.id, isActive: true,
    requiredFields: JSON.stringify(['date', 'hours']) })
  return repo('User').save({ email: `request-${emp.id}@payroll-exempt.invalid`, displayName: emp.fullName,
    passwordHash: 'test-only', role: 'employee', branchId: emp.branchId, employeeId: emp.id, permissions: '[]' })
}
const submitOvertime = (owner, date = '2026-06-09') => request(owner, 'POST', '/requests', {
  typeCode: 'OVERTIME', payload: { date, hours: 6 }, submit: true,
})
const actOvertime = (actor, id) => request(actor, 'POST', `/requests/${id}/act`, {
  action: 'APPROVE', comment: 'موافقة اختبار على ست ساعات صريحة',
})

test('EX-11 request: direct OVERTIME submission by an ineligible exempt employee is rejected without a request or overtime orphan', async () => {
  const emp = await employee(), window = await exemption(emp)
  const owner = await overtimeRequestFixture(emp)
  const before = {}
  for (const name of ['Request', 'OvertimeEntry', 'RequestApproval']) before[name] = await repo(name).count()
  const result = await submitOvertime(owner)
  assert.equal(result.status, 400, JSON.stringify(result.body))
  assert.match(String(result.body.message), /مستثنى/)
  assert.ok(String(result.body.message).includes(`#${window.id}`), 'Rejection must identify the exemption decision')
  for (const [name, count] of Object.entries(before)) assert.equal(await repo(name).count(), count, `Rejected submission leaked ${name}`)
})

test('EX-11 request: approved explicit overtime executes without punches and a changed eligibility decision blocks final approval atomically', async () => {
  const eligible = await employee()
  await exemption(eligible, { overtimeEligibleOverride: true })
  const owner = await overtimeRequestFixture(eligible)
  const submitted = await submitOvertime(owner)
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body))
  assert.equal(submitted.body.status, 'UNDER_REVIEW')
  assert.equal(submitted.body.currentStep, 1)
  const submittedEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: submitted.body.id })
  assert.equal(submittedEntry.status, 'SUBMITTED')
  assert.equal(submittedEntry.payableHours, null)
  assert.equal(submittedEntry.amountSnapshot, null)
  assert.equal(submittedEntry.calculationSnapshot.submission.requestedMinutes, 360)
  assert.equal(submittedEntry.calculationSnapshot.approval, undefined)
  const submittedClaim = await repo('OvertimeDayClaim').findOneByOrFail({ entryId: submittedEntry.id })
  assert.equal(submittedClaim.releasedAt, null)
  const firstApproval = await actOvertime(admin, submitted.body.id)
  assert.equal(firstApproval.status, 201, JSON.stringify(firstApproval.body))
  assert.equal(firstApproval.body.status, 'UNDER_REVIEW')
  assert.equal(firstApproval.body.currentStep, 2)
  const completed = await actOvertime(approver, submitted.body.id)
  assert.equal(completed.status, 201, JSON.stringify(completed.body))
  assert.equal(completed.body.status, 'COMPLETED')
  assert.match(completed.body.destinationRef, /^OT-/)
  const entries = await repo('OvertimeEntry').find({ where: { requestId: submitted.body.id } })
  assert.equal(entries.length, 1)
  assert.equal(entries[0].id, submittedEntry.id)
  assert.equal(entries[0].employeeId, eligible.id)
  assert.equal(entries[0].source, 'PRE_REQUESTED')
  assert.equal(entries[0].status, 'APPROVED')
  assert.equal(Number(entries[0].hoursRequested), 6)
  assert.equal(Number(entries[0].payableHours), 6)
  assert.equal(entries[0].approvedMinutes, 360)
  assert.equal(Number(entries[0].amountSnapshot), 562.5)
  assert.deepEqual(await repo('OvertimeDayClaim').findOneByOrFail({ entryId: submittedEntry.id }), submittedClaim)
  assert.equal(entries[0].hoursActual, null)
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: eligible.id } }), 0)
  assert.equal(await repo('RequestApproval').count({ where: { requestId: submitted.body.id, action: 'APPROVED' } }), 2)

  const changed = await employee(), window = await exemption(changed, { overtimeEligibleOverride: true })
  const changedOwner = await overtimeRequestFixture(changed)
  const pending = await submitOvertime(changedOwner, '2026-06-15')
  assert.equal(pending.status, 201, JSON.stringify(pending.body))
  const approvedFirstStep = await actOvertime(admin, pending.body.id)
  assert.equal(approvedFirstStep.status, 201, JSON.stringify(approvedFirstStep.body))
  assert.equal(approvedFirstStep.body.currentStep, 2)
  await repo('AttendanceExemption').update(window.id, { overtimeEligibleOverride: false })
  const oldRequest = await repo('Request').findOneByOrFail({ id: pending.body.id })
  const oldApprovals = await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } })
  const oldEntry = await repo('OvertimeEntry').findOneByOrFail({ requestId: pending.body.id })
  const oldClaim = await repo('OvertimeDayClaim').findOneByOrFail({ entryId: oldEntry.id })
  const oldEvents = await repo('OvertimeEntryEvent').find({ where: { entryId: oldEntry.id }, order: { id: 'ASC' } })
  assert.equal(oldApprovals.length, 1)
  const rejected = await actOvertime(approver, pending.body.id)
  assert.equal(rejected.status, 409, JSON.stringify(rejected.body))
  assert.equal(rejected.body.code, 'OVERTIME_EVIDENCE_CHANGED')
  assert.ok(rejected.body.blockers.some(blocker => blocker.code === 'EXEMPT_NOT_ELIGIBLE'))
  assert.deepEqual(await repo('Request').findOneByOrFail({ id: pending.body.id }), oldRequest,
    'Failed final execution must keep the request at the same pending approval step')
  assert.deepEqual(await repo('RequestApproval').find({ where: { requestId: pending.body.id }, order: { id: 'ASC' } }), oldApprovals,
    'Failed final execution must not leave a successful approval audit')
  assert.equal(oldEntry.status, 'SUBMITTED')
  assert.equal(oldEntry.amountSnapshot, null)
  assert.deepEqual(await repo('OvertimeEntry').findOneByOrFail({ id: oldEntry.id }), oldEntry)
  assert.deepEqual(await repo('OvertimeDayClaim').findOneByOrFail({ entryId: oldEntry.id }), oldClaim)
  assert.deepEqual(await repo('OvertimeEntryEvent').find({ where: { entryId: oldEntry.id }, order: { id: 'ASC' } }), oldEvents)
  assert.equal(await repo('AttendancePunch').count({ where: { employeeId: changed.id } }), 0)
})
