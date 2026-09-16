// الخطوة 12: قرارات المالك D1–D11 — تحقق الإعدادات والبذرة وقاعدتي D1 وD7 في خصم الحضور (بلا قاعدة بيانات).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const decisions = require('../src/payroll/payroll-decision-settings')
const { configSeed } = require('../src/seed/requests-seed.data')
const { attendanceDeductionDay } = require('../src/payroll/attendance-deductions')

test('configSeed carries every decision key with the chosen owner value (D1, D2, D3, D5, D10, D11)', () => {
  const seed = new Map(configSeed.map(row => [row.key, row.value]))
  assert.equal(new Set(configSeed.map(row => row.key)).size, configSeed.length, 'configSeed must not repeat a key')
  const expected = {
    'payroll.early_leave_deduction_enabled': 'true', 'payroll.hourly_rate_basis': 'DAILY_HOURS',
    'payroll.day_rate_basis': 'MONTHLY_FIXED_COMPONENTS_30', 'payroll.loan_catchup_max_overdue': '1',
    'overtime.default_window': 'AFTER_SHIFT_END', 'overtime.outside_window_policy': 'CLOSED',
    ...decisions.PAYROLL_D5_CHOSEN_VALUES, 'payroll.monthly_days': '30', 'payroll.daily_hours': '8', 'payroll.cycle_start_day': '23',
    'payroll.policy.rounding_mode': 'DOWN', 'payroll.policy.rounding_scale': '2', 'system.currency': 'SAR',
  }
  for (const [key, value] of Object.entries(expected)) assert.equal(seed.get(key), value, key)
  // كل قيمة مبذورة تمر من تحقق الإعدادات نفسه.
  for (const row of configSeed) assert.equal(decisions.payrollDecisionConfigError(row.key, row.value), undefined, row.key)
})

test('PATCH /settings/config validation: monthly days only 30 and closed or bounded decision values', () => {
  const error = decisions.payrollDecisionConfigError
  for (const value of ['31', '29', '30.00', '0', '', ' 30']) assert.match(error('payroll.monthly_days', value), /30/, value)
  assert.equal(error('payroll.monthly_days', '30'), undefined)
  for (const value of ['-1', '1.5', '121', 'x', '']) assert.ok(error('payroll.loan_catchup_max_overdue', value), value)
  for (const value of ['0', '1', '120']) assert.equal(error('payroll.loan_catchup_max_overdue', value), undefined, value)
  assert.ok(error('overtime.outside_window_policy', 'OPEN'))
  assert.ok(error('overtime.default_window', 'ANY'))
  assert.ok(error('payroll.hourly_rate_basis', 'SHIFT_HOURS'))
  assert.ok(error('payroll.day_rate_basis', 'BASIC_30'))
  assert.ok(error('payroll.early_leave_deduction_enabled', 'maybe'))
  assert.ok(error('system.currency', 'USD'))
  for (const value of ['25', '0', '8.123', '-8']) assert.ok(error('payroll.daily_hours', value), value)
  assert.equal(error('payroll.daily_hours', '7.5'), undefined)
  for (const value of ['0', '32', '2.5']) assert.ok(error('payroll.cycle_start_day', value), value)
  assert.equal(error('payroll.cycle_start_day', '23'), undefined)
  assert.ok(error('payroll.attendance_daily_cap_days', '40'))
  assert.equal(error('payroll.attendance_daily_cap_days', '0.5'), undefined)
  assert.equal(error('leave.annual_entitled', 'anything'), undefined, 'keys outside the decisions are not judged here')
  assert.equal(decisions.parsePayrollLoanCatchUpLimit('1'), 1)
  assert.throws(() => decisions.parsePayrollLoanCatchUpLimit(undefined))
  assert.throws(() => decisions.parsePayrollLoanCatchUpLimit('7.5'))
})

const policy = (overrides = {}) => ({ schemaVersion: 1, lateEnabled: true, shortfallEnabled: true, shortfallMode: 'MINUTES', shortfallValue: 1,
  overlapPolicy: 'NET_OF_LATENESS', dailyCapDays: 1, dayRate: 480, minuteRate: 1, ...overrides })
const snapshot = (flexEnabled, extra = {}) => ({ flexEnabled, shortfallToleranceMinutes: 10, paidPermissionShortfallCoveredMinutes: 0, ...extra })

test('أ4: لا ترتيب تداخل بين التأخير والنقص — كل خصم يُحتسب كما جاء، مهما كانت سياسة التداخل المحفوظة', () => {
  const day = { date: '2026-09-01', lateMinutes: 30, unexcusedLateMinutes: 30, shortfallMinutes: 50, deductibleMinutes: 0, attendanceRuleSnapshot: snapshot(true) }
  const enabled = attendanceDeductionDay(day, policy(), 30)
  assert.equal(enabled.overlapMinutes, 0, 'لا تُطرح دقائق التأخير من النقص')
  assert.equal(enabled.chargeableShortfallMinutes, 50)
  assert.equal(enabled.latenessAmount, 30); assert.equal(enabled.shortfallAmount, 50); assert.equal(enabled.totalAmount, 80)
  // إطفاء خصم التأخير يُسقط عقوبته وحدها؛ الدقائق التي لم تُشتغل تبقى نقص ساعات كاملًا
  const disabled = attendanceDeductionDay(day, policy({ lateEnabled: false }), 30)
  assert.equal(disabled.overlapMinutes, 0); assert.equal(disabled.latenessAmount, 0)
  assert.equal(disabled.chargeableShortfallMinutes, 50); assert.equal(disabled.shortfallAmount, 50); assert.equal(disabled.totalAmount, 50)
  // سياسة التداخل المحفوظة في لقطة المسير لم تعد تغيّر شيئًا
  for (const overlapPolicy of ['CUMULATIVE', 'MAX_OF_BOTH', 'NET_OF_LATENESS']) {
    const row = attendanceDeductionDay(day, policy({ overlapPolicy }), 30)
    assert.equal(row.totalAmount, 80, overlapPolicy)
  }
})

test('أ4: لا سقف يومي لخصم الحضور — التأخير والنقص يتجاوزان قيمة اليوم ولا يُقتطع منهما شيء', () => {
  const day = { date: '2026-09-02', lateMinutes: 240, unexcusedLateMinutes: 240, shortfallMinutes: 480, deductibleMinutes: 0, attendanceRuleSnapshot: snapshot(true) }
  // سعر اليوم 480 والدقيقة 1: عقوبة تأخير 240 + نقص 480 = 720 > يوم كامل
  for (const dailyCapDays of [0.05, 1, 31]) {
    const row = attendanceDeductionDay(day, policy({ dailyCapDays }), 240)
    assert.equal(row.latenessAmount, 240); assert.equal(row.shortfallAmount, 480)
    assert.equal(row.totalAmount, 720, `dailyCapDays=${dailyCapDays}`)
    assert.equal(row.dailyCapAmount, 0); assert.equal(row.cappedAmount, 0)
  }
})

test('D1: early leave on a fixed shift is deducted at the minute rate unless the setting is off; flex shifts keep the shortfall rule', () => {
  const fixed = { date: '2026-09-02', lateMinutes: 0, unexcusedLateMinutes: 0, shortfallMinutes: 45, deductibleMinutes: 0, attendanceRuleSnapshot: snapshot(false) }
  assert.equal(attendanceDeductionDay(fixed, policy(), 0).shortfallAmount, 45)
  assert.equal(attendanceDeductionDay(fixed, policy({ earlyLeaveEnabled: true }), 0).shortfallAmount, 45)
  const off = attendanceDeductionDay(fixed, policy({ earlyLeaveEnabled: false }), 0)
  assert.equal(off.shortfallAmount, 0); assert.equal(off.chargeableShortfallMinutes, 0)
  const flex = { ...fixed, attendanceRuleSnapshot: snapshot(true) }
  assert.equal(attendanceDeductionDay(flex, policy({ earlyLeaveEnabled: false }), 0).shortfallAmount, 45)
  const withinGrace = { ...fixed, shortfallMinutes: 10 }
  assert.equal(attendanceDeductionDay(withinGrace, policy(), 0).shortfallAmount, 0, 'grace still applies before the minute rate')
})
