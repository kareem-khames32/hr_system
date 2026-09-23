'use strict'
// Independent review: actual product functions with synthetic repositories only.
// No .env, SQL, HTTP listener, AD or SMTP. Failing tests express required behavior.
// Run: node --test api/test/codex-review-offline.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const net = require('node:net')
net.Socket.prototype.connect = function () { throw new Error('Review forbids network connections') }
net.Server.prototype.listen = function () { throw new Error('Review forbids starting listeners') }
process.env.NODE_ENV = 'test'
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
require('../node_modules/@nestjs/common').Logger.overrideLogger(false)
const { AuthService } = require('../src/auth/auth.service')
const { TwoFactorService, OTP } = require('../src/auth/two-factor.service')
const { MailSendError } = require('../src/auth/mail.service')
const { AttendanceService } = require('../src/attendance/attendance.service')
const { AttendanceController } = require('../src/attendance/attendance.controller')
const { calculateAttendanceFlex } = require('../src/attendance/attendance-flex-calculator')
const { attendanceDeductionDay } = require('../src/payroll/attendance-deductions')
const { roundPayrollMoney } = require('../src/payroll/payroll-money')
const { payrollEmploymentCoverage } = require('../src/payroll/payroll-employment')
const { buildBankSheet } = require('../src/payroll/bank-sheet')
const { buildPayrollDisbursementRows, summarizePayrollDisbursement } = require('../src/payroll/payroll-disbursement')
const { PayrollBankSheetController } = require('../src/payroll/bank-sheet.controller')
const { computeFinancialRow, buildPayrollRegister } = require('../src/reports/financial-report')
const { branchScopeOf, RolesGuard } = require('../src/auth/guards')
const { Reflector } = require('../node_modules/@nestjs/core')

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}
const fakeUser = { id: 1, email: 'review@example.invalid', displayName: 'Synthetic reviewer', role: 'employee',
  branchId: 1, employeeId: 1, isActive: true, permissions: '[]', tokenVersion: 0 }
function authHarness({ configFailure = false, mailFailure = false } = {}) {
  const stats = { sessions: 0, mails: 0, inserts: 0, loginWrites: 0 }
  let deliveredCode, row
  const challenges = {
    async insert(value) { stats.inserts++; row = { id: 1, ...value } },
    async update(where, patch) {
      if (row) {
        if ('consumedAt' in where && row.consumedAt) return { affected: 0 }
        if ('lockedAt' in where && row.lockedAt) return { affected: 0 }
        Object.assign(row, patch)
      }
      return { affected: row ? 1 : 0 }
    },
    async findOne() { return row ? { ...row } : null },
    async delete() { return { affected: 0 } },
  }
  const config = { async findOne() {
    if (configFailure) throw new Error('Synthetic failure reading the 2FA setting')
    return { value: 'true' }
  } }
  const mail = { isConfigured: () => true, async send(message) {
    stats.mails++
    if (mailFailure) throw new MailSendError('Synthetic delivery failure', true)
    deliveredCode = message.text.match(/\d{6}/)[0]
    return { response: 'synthetic accepted', messageId: null }
  } }
  const users = { async update() { stats.loginWrites++ }, createQueryBuilder() {
    const q = { addSelect() { return q }, where() { return q }, async getOne() { return { ...fakeUser } } }; return q
  } }
  const twoFactor = new TwoFactorService(challenges, config, mail)
  const auth = new AuthService(users, { async findOne() { return null } }, { async find() { return [] } },
    { async signAsync() { stats.sessions++; return 'synthetic-session-value' } }, twoFactor,
    { async authenticate() { return { mail: fakeUser.email } } }, { async resolveUser() { return { ...fakeUser } } }, mail)
  return { auth, twoFactor, stats, challenges, get row() { return row }, get code() { return deliveredCode } }
}

test('CR-P01: domain login issues no session before OTP and consumes it once', async () => {
  const h = authHarness()
  const challenge = await h.auth.domainLogin('synthetic', 'synthetic')
  assert.equal(challenge.twoFactor, true)
  assert.equal('accessToken' in challenge, false)
  assert.deepEqual(h.stats, { sessions: 0, mails: 1, inserts: 1, loginWrites: 0 })
  await h.auth.verifyTwoFactor(challenge.challengeToken, h.code)
  assert.equal(h.stats.sessions, 1)
  await assert.rejects(h.auth.verifyTwoFactor(challenge.challengeToken, h.code), e => e.getStatus() === 401)
  assert.equal(h.stats.sessions, 1)
})

test('CR-P02: failing fake mail blocks login with 503 and creates neither session nor challenge', async () => {
  const h = authHarness({ mailFailure: true })
  await assert.rejects(h.auth.domainLogin('synthetic', 'synthetic'), e => e.getStatus() === 503)
  assert.deepEqual(h.stats, { sessions: 0, mails: 1, inserts: 0, loginWrites: 0 })
})

test('CR-B01: a failed 2FA configuration read must not issue a session', async t => {
  const h = authHarness({ configFailure: true })
  await h.auth.domainLogin('synthetic', 'synthetic').catch(() => undefined)
  t.diagnostic(JSON.stringify({ sessions: h.stats.sessions, mails: h.stats.mails, challenges: h.stats.inserts }))
  assert.equal(h.stats.sessions, 0, 'OTP configuration read failure bypassed verification')
})

test('CR-P03: sequential wrong codes exhaust the five-attempt limit', async () => {
  const h = authHarness(), challenge = await h.auth.domainLogin('synthetic', 'synthetic')
  const wrong = h.code === '000000' ? '111111' : '000000'
  for (let i = 0; i < OTP.maxAttempts; i++) await assert.rejects(h.twoFactor.verify(challenge.challengeToken, wrong))
  assert.equal(h.row.attempts, OTP.maxAttempts)
  assert.ok(h.row.lockedAt)
  await assert.rejects(h.twoFactor.verify(challenge.challengeToken, h.code), e => e.code === 'LOCKED')
})

test('CR-B02: concurrent wrong OTP attempts must not overwrite the counter', async t => {
  const h = authHarness(), challenge = await h.auth.domainLogin('synthetic', 'synthetic')
  const wrong = h.code === '000000' ? '111111' : '000000'
  // All reads take their snapshots before any write, a permitted repository interleaving.
  const result = await Promise.allSettled(Array.from({ length: 12 }, () => h.twoFactor.verify(challenge.challengeToken, wrong)))
  const observation = { rejected: result.filter(r => r.status === 'rejected').length, storedAttempts: h.row.attempts, locked: !!h.row.lockedAt }
  try { await h.twoFactor.verify(challenge.challengeToken, h.code); observation.correctCodeStillAccepted = true }
  catch { observation.correctCodeStillAccepted = false }
  t.diagnostic(JSON.stringify(observation))
  assert.ok(observation.locked, '12 rejected guesses left the challenge unlocked')
})

test('CR-B03: resending must invalidate a code already being verified from an old snapshot', async t => {
  const h = authHarness(), challenge = await h.auth.domainLogin('synthetic', 'synthetic')
  const oldCode = h.code
  h.row.lastSentAt = new Date(Date.now() - 61000)
  const readReached = deferred(), releaseRead = deferred()
  const original = h.challenges.findOne
  let first = true
  h.challenges.findOne = async () => {
    const snapshot = await original()
    if (first) { first = false; readReached.resolve(); await releaseRead.promise }
    return snapshot
  }
  const oldVerification = h.twoFactor.verify(challenge.challengeToken, oldCode)
  await readReached.promise
  await h.twoFactor.resend(challenge.challengeToken)
  // Avoid an astronomically small accidental equality in the generated replacement OTP.
  if (h.code === oldCode) { releaseRead.resolve(); await oldVerification.catch(() => undefined); t.skip('Random replacement matched the previous code'); return }
  releaseRead.resolve()
  let oldAccepted = false
  try { await oldVerification; oldAccepted = true } catch {}
  t.diagnostic(JSON.stringify({ oldCodeAcceptedAfterReplacement: oldAccepted }))
  assert.equal(oldAccepted, false)
})

test('CR-N01: foreign and missing attendance records must return the same response', async t => {
  const svc = Object.create(AttendanceService.prototype)
  svc.employees = { async findOne({ where }) { return where.id === 2 ? { id: 2, branchId: 2 } : null } }
  const controller = new AttendanceController(svc, {}, {})
  const user = { sub: 1, role: 'employee', employeeId: 1, branchId: 1, permissions: [] }
  const response = async id => {
    try { await controller.monthly(user, id, '2026-08'); return { status: 200 } }
    catch (e) { return { status: e.getStatus(), message: e.message } }
  }
  const foreign = await response(2), missing = await response(999)
  t.diagnostic(JSON.stringify({ foreign, missing }))
  assert.deepEqual(foreign, missing)
})

function paymentFixture() {
  return {
    runStatus: 'PAID', branchScope: null,
    items: [{ id: 11, employeeId: 1, netPay: 1000, payMethod: 'cash', breakdown: '{}' }],
    employees: [{ id: 1, employeeCode: 'SYN-001', fullName: 'Synthetic', branchId: 1, payMethod: 'transfer',
      bankTransferAmount: null, bankName: 'Synthetic bank', iban: 'SA' + '0'.repeat(22) }],
    members: [{ employeeId: 1, snapshot: { branchId: 1, employeeCode: 'SYN-001', fullName: 'Synthetic' } }],
    marks: [{ itemId: 11, status: 'PAID', amount: 1000, bankAmount: 0, cashAmount: 1000,
      payMethod: 'cash', markedByUserId: 2, markedAt: new Date('2026-09-01'), note: null }],
  }
}

test('CR-N02: bank export for a paid run must agree with its frozen payment records', async t => {
  const fixture = paymentFixture()
  const controller = new PayrollBankSheetController({ async detail() {
    return { id: 1, status: 'PAID', items: fixture.items, members: fixture.members }
  } }, { getRepository() { return { async find() { return fixture.employees } } } })
  const exportView = await controller.bankSheet({ role: 'super_admin', sub: 1 }, 1)
  const paid = summarizePayrollDisbursement(buildPayrollDisbursementRows(fixture).rows).paid
  const financial = computeFinancialRow({ runId: 1, runStatus: 'PAID', employeeId: 1, basicSalary: 1000,
    netPay: 1000, itemPayMethod: 'cash', employeePayMethod: 'transfer', bankTransferAmount: null }, new Map())
  t.diagnostic(JSON.stringify({ marked: { bank: paid.bank, cash: paid.cash },
    bankExport: exportView.totals, financial: { bank: Number(financial.bank) / 100, cash: Number(financial.cash) / 100 } }))
  assert.deepEqual({ bank: exportView.totals.bank, cash: exportView.totals.cash }, { bank: paid.bank, cash: paid.cash })
})

test('CR-P04: bank + cash + settlement equals net, including cent truncation', () => {
  const values = [
    { payMethod: 'cash', netPay: 500.99, bankTransferAmount: null },
    { payMethod: 'transfer', netPay: 1000.01, bankTransferAmount: null },
    { payMethod: 'mixed', netPay: 800.03, bankTransferAmount: 300.02 },
    { payMethod: 'mixed', netPay: 300.09, bankTransferAmount: 5000 },
    { payMethod: 'mixed', netPay: 0, bankTransferAmount: 100 },
    { payMethod: 'transfer', netPay: 700.11, settlementPayout: { caseId: 1, lastWorkingDay: '2026-08-15' } },
  ]
  const rows = values.map((v, i) => ({ ...v, employeeId: i + 1, employeeCode: String(i + 1), fullName: 'Synthetic', bankName: 'Test', iban: 'SA' + '0'.repeat(22) }))
  const sheet = buildBankSheet(rows)
  assert.deepEqual(sheet.totals, { employees: 5, bank: 1600.12, cash: 1001, net: 2601.12 })
  assert.equal(sheet.settlement.total, 700.11)
  assert.equal(Math.round((sheet.totals.net + sheet.settlement.total) * 100), 330123)
})

const flex = { startMinute: 540, endMinute: 1020, flexEnabled: true, flexWindowMinutes: 60,
  requiredWorkMinutes: 480, graceMinutes: 0, shortfallToleranceMinutes: 10 }
test('CR-P05: flex window, full lateness after window, and missing punch', () => {
  const within = calculateAttendanceFlex({ ...flex, checkInMinute: 580, checkOutMinute: 1060 })
  assert.equal(within.lateMinutes, 0); assert.equal(within.shortfallMinutes, 0)
  const outside = calculateAttendanceFlex({ ...flex, checkInMinute: 630, checkOutMinute: 1110 })
  assert.equal(outside.lateMinutes, 90); assert.equal(outside.shortfallMinutes, 0)
  const missing = calculateAttendanceFlex({ ...flex, checkInMinute: null, checkOutMinute: 1020 })
  assert.equal(missing.attendanceReviewRequired, true); assert.equal(missing.shortfallMinutes, null)
})

test('CR-P06: a paid evening permission is deducted once, without duplicate shortfall', () => {
  const calculated = calculateAttendanceFlex({ ...flex, checkInMinute: 540, checkOutMinute: 900,
    permissions: [{ from: 900, to: 1020, deductible: true, deductRatio: 100, coverage: 'evening' }] })
  const money = attendanceDeductionDay({ date: '2026-08-30', lateMinutes: calculated.lateMinutes,
    shortfallMinutes: calculated.shortfallMinutes, deductibleMinutes: calculated.paidPermissionDeductibleMinutes,
    attendanceRuleSnapshot: { ...calculated, flexEnabled: true, shortfallToleranceMinutes: 10 } },
  { schemaVersion: 1, lateEnabled: true, shortfallEnabled: true, shortfallMode: 'MINUTES', shortfallValue: 1,
    overlapPolicy: 'CUMULATIVE', dailyCapDays: 1, dayRate: 480, minuteRate: 1 }, 0)
  assert.equal(money.shortfallAmount, 0); assert.equal(money.permissionAmount, 120); assert.equal(money.totalAmount, 120)
})

test('CR-P07: money truncates rather than rounds and employment coverage uses inclusive dates', () => {
  assert.equal(roundPayrollMoney(14500 / 30 / 8 / 60 * 90 * 1.5), 135.93)
  assert.equal(roundPayrollMoney(-135.9375), -135.93)
  const employee = { joinDate: '2020-01-01', status: 'active', isActive: true }
  const joiner = payrollEmploymentCoverage({ ...employee, salaryEntitlementStart: '2026-09-15' }, [], '2026-08-23', '2026-09-22')
  const leaver = payrollEmploymentCoverage({ ...employee, status: 'notice_period' },
    [{ lastWorkingDay: '2026-09-15', status: 'IN_CLEARANCE' }], '2026-08-23', '2026-09-22')
  assert.equal(joiner.coverDays, 8); assert.equal(leaver.coverDays, 24)
  // Coverage verified here; multiplication is the independent manual expectation, not a full payroll execution.
  assert.equal(14400 / 30 * joiner.coverDays, 3840)
  assert.equal(14400 / 30 * leaver.coverDays, 11520)
})

test('CR-P08: branch scope cannot grant a missing endpoint permission', () => {
  const user = { role: 'employee', branchId: 1, scopeAllBranches: true, permissions: [] }
  assert.equal(branchScopeOf(user), null)
  const context = { getHandler: () => AttendanceController.prototype.daily, getClass: () => AttendanceController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }) }
  assert.equal(new RolesGuard(new Reflector()).canActivate(context), false)
  assert.equal(branchScopeOf({ ...user, scopeAllBranches: 'true' }), 1)
  assert.equal(branchScopeOf({ ...user, scopeAllBranches: false, branchId: null }), -1)
})

test('CR-P09: employee required fields reject omissions and impossible dates', () => {
  const { employeeRequiredIssues } = require('../src/employees/employee-required-fields')
  const employee = { fullName: 'موظف اختبار', birthDate: '1990-01-01', gender: 'male', nationality: 'مصري',
    nationalId: '29001010000000', phone: '+201000000000', fingerprintCode: 'SYN001', joinDate: '2026-09-01',
    branchId: 1, departmentId: 1, jobTitle: 'محاسب', basicSalary: 6000 }
  const check = e => employeeRequiredIssues(e, { mode: 'add', today: '2026-09-23' })
  assert.deepEqual(check(employee), [])
  for (const key of Object.keys(employee)) assert.ok(check({ ...employee, [key]: '' }).some(x => x.key === key), key)
  assert.ok(check({ ...employee, joinDate: '2026-02-30' }).some(x => x.key === 'joinDate'))
  assert.ok(check({ ...employee, joinDate: '2126-01-01' }).some(x => x.key === 'joinDate'))
})

test('CR-P10: named payroll chain advances once and rejects decisions from an old calculation', () => {
  const c = require('../src/payroll/payroll-approval-chain')
  const steps = c.normalizePayrollChainSteps([{ kind: 'USER', userId: 11 }, { kind: 'USER', userId: 12 }])
  const chain = { chainId: 1, scope: 'COMPANY', seriesName: '', revision: 1, steps, hash: c.payrollChainHash(steps) }
  const decision = { snapshotVersion: 1, chainHash: chain.hash, stepOrder: 1, stepCount: 2,
    stepLabel: steps[0].label, approverKind: 'USER', actorUserId: 11, decision: 'APPROVED', voidedAt: null, decidedAt: new Date() }
  const progress = version => c.payrollChainProgress({ run: { status: 'CALCULATED', snapshotVersion: version }, chain, approvals: [decision] })
  assert.equal(progress(1).currentStep.order, 2)
  assert.deepEqual(progress(1).actedUserIds, [11])
  assert.equal(progress(2).currentStep.order, 1)
  assert.equal(c.payrollChainStepMatchesUser(steps[0], { sub: 12, role: 'super_admin' }), false)
  assert.throws(() => c.payrollChainReason('  '))
})

test('CR-P11: reject or return without a reason performs no request transaction', async () => {
  const { RequestsService } = require('../src/requests/requests.service')
  const service = Object.create(RequestsService.prototype)
  let writes = 0
  service.ds = { async transaction() { writes++ } }
  for (const action of ['REJECT', 'RETURN']) {
    await assert.rejects(service.act({ sub: 1 }, 1, { action, comment: '  ' }), e => e.getStatus() === 400)
  }
  assert.equal(writes, 0)
})

test('CR-P12: asset scope hides foreign IDs and blocks cross-branch transfers', () => {
  const a = require('../src/assets/asset-branch')
  const status = value => { try { a.assertAssetWritable(1, value); return null } catch (e) { return e.getResponse() } }
  assert.deepEqual(status({ branchId: 2 }), status(null))
  assert.equal(a.assetWritableBy(1, { branchId: 1 }), true)
  assert.equal(a.assetWritableBy(-1, { branchId: 1 }), false)
  assert.ok(a.custodyTransferProblem(1, { branchId: 1 }, { branchId: 2 }))
  assert.equal(a.custodyTransferProblem(null, { branchId: 1 }, { branchId: 2 }), null)
})

test('CR-P13: leave categories distinguish calendar days and attachment timing', () => {
  const rules = require('../src/requests/leave-type-rules')
  assert.equal(rules.leaveCountsAllDays({ category: 'ANNUAL', isPaid: true, countingMode: 'WORKING_DAYS' }), false)
  for (const category of ['SICK', 'UNPAID']) assert.equal(rules.leaveCountsAllDays({ category, countingMode: 'WORKING_DAYS' }), true)
  const type = { nameAr: 'اختبار', category: 'SICK', attachmentRule: 'REQUIRED', attachmentTiming: 'WITH_REQUEST' }
  assert.throws(() => rules.assertLeaveTypeDaysRules(type, { days: 2 }))
  assert.throws(() => rules.assertLeaveTypeDaysRules(type, { days: 2, attachmentRef: 'written-reference' }))
  assert.doesNotThrow(() => rules.assertLeaveTypeDaysRules(type, { days: 2, attachmentRef: 'file:1' }))
  assert.doesNotThrow(() => rules.assertLeaveTypeDaysRules({ ...type, attachmentTiming: 'AFTER_RETURN' }, { days: 2 }))
  const { LeaveBalancesService } = require('../src/requests/leave-balances.service')
  const service = Object.create(LeaveBalancesService.prototype)
  assert.deepEqual(service.splitByYear({ daysByYear: { 2026: 3, 2027: 4 } }, '2026-12-29', 7), { 2026: 3, 2027: 4 })
})

test('CR-P14: report footer matches independently calculated rows and rejects inverted dates', () => {
  const sources = [
    { employeeId: 1, basicSalary: 6000, allowances: 1800, overtimeAmount: 195, latenessDeduction: 16.25,
      unpaidLeaveDeduction: 780, loanInstallments: 500, netPay: 6698.75, employeePayMethod: 'mixed', bankTransferAmount: 5000 },
    { employeeId: 2, basicSalary: 3000, netPay: 3000, employeePayMethod: 'cash' },
  ].map(s => ({ runId: 1, runStatus: 'APPROVED', employeeCode: String(s.employeeId), itemPayMethod: s.employeePayMethod, ...s }))
  const report = buildPayrollRegister(sources.map(s => computeFinancialRow(s, new Map())), false)
  assert.equal(report.totals.gross, '10995.00')
  assert.equal(report.totals.totalDeductions, '1296.25')
  assert.equal(report.totals.net, '9698.75')
  assert.equal(report.totals.bank, '5000.00'); assert.equal(report.totals.cash, '4698.75')
  const { reportDayRange } = require('../src/attendance/attendance-report-range')
  assert.throws(() => reportDayRange({ from: '2026-09-22', to: '2026-08-23' }))
  assert.throws(() => reportDayRange({ from: '2026-08-23' }))
})

test('CR-PERF01: count real daily-service read calls on synthetic closed payroll days', async t => {
  for (const count of [1, 100, 500, 616]) {
    const svc = Object.create(AttendanceService.prototype), date = '2026-08-10'
    const days = Array.from({ length: count }, (_, i) => ({ id: i + 1, employeeId: i + 1, date, branchId: 1,
      scheduleSource: 'employee', status: 'present', checkIn: '08:00', checkOut: '16:00', shiftStart: '08:00', shiftEnd: '16:00' }))
    const counters = { storedList: 0, employeesList: 0, exemptions: 0, storedDay: 0, closedCheck: 0, punches: 0, corrections: 0 }
    const manager = {
      async query() { counters.closedCheck++; return [{ id: 1 }] },
      getRepository() { const qb = { where() { return qb }, andWhere() { return qb }, orderBy() { return qb },
        addOrderBy() { return qb }, async getMany() { counters.exemptions++; return [] } }; return { createQueryBuilder: () => qb } },
    }
    svc.days = { manager, async find() { counters.storedList++; return days }, async findOne({ where }) {
      counters.storedDay++; return { ...days[where.employeeId - 1] }
    } }
    svc.employees = { async find() { counters.employeesList++; return days.map(d => ({ id: d.employeeId, branchId: 1, isActive: true, joinDate: '2020-01-01' })) } }
    svc.punches = { async find() { counters.punches++; return [] } }
    svc.corrections = { async find() { counters.corrections++; return [] } }
    const start = performance.now(), result = await svc.daily({ role: 'super_admin' }, date)
    const ms = performance.now() - start
    assert.equal(result.length, count)
    assert.equal(counters.exemptions, count); assert.equal(counters.storedDay, count); assert.equal(counters.closedCheck, count)
    const total = Object.values(counters).reduce((a, b) => a + b, 0)
    assert.equal(total, 3 * count + Math.ceil(count / 500) + 3)
    t.diagnostic(JSON.stringify({ syntheticEmployees: count, readCalls: total, counters, inMemoryMs: Math.round(ms * 100) / 100 }))
  }
})
