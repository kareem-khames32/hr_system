// B1.6 — حراس المسير بلا قاعدة بيانات: شرح الصافي السالب وسببه، ورسالة الرفض، وسطور المرضية لما الحارس يقص،
// والحارس في لقطة السياسة (المقفول مابيغيّرش البصمة)، والقفل الخاص بالاعتماد في المسارين.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const apiRoot = path.resolve(__dirname, '..')
require('../node_modules/ts-node').register({ project: path.join(apiRoot, 'tsconfig.json'), transpileOnly: true })
const { explainPayrollNegativeNet, payrollNegativeNetMessage } = require('../src/payroll/payroll-negative-net')
const { payrollLeaveDeductionLines } = require('../src/payroll/sick-leave-pay')
const snapshot = require('../src/payroll/payroll-policy-snapshot')

const item = overrides => ({ employeeId: 7, basicSalary: 9000, allowances: 0, overtimeAmount: 0, otherAdditions: 0, latenessDeduction: 0, shortfallDeduction: 0,
  absenceDeduction: 0, unpaidLeaveDeduction: 0, otherDeductions: 0, socialInsuranceDeduction: 0, loanInstallments: 0, netPay: 9000, breakdown: '{}', ...overrides })

test('الصافي السالب: السبب الأكبر وكل بند بمبلغه، ومجموع السطور = الصافي', () => {
  assert.equal(explainPayrollNegativeNet(item({ netPay: 0 })), null)
  const unpaid = explainPayrollNegativeNet(item({ unpaidLeaveDeduction: 9300, netPay: -300 }), { fullName: 'سالم', employeeCode: 'E1' })
  assert.deepEqual([unpaid.net, unpaid.cause, unpaid.fullName, unpaid.employeeCode], [-300, 'UNPAID_LEAVE', 'سالم', 'E1'])
  assert.deepEqual(unpaid.lines.map(line => [line.code, line.amount]), [['EARNED', 9000], ['UNPAID_LEAVE', -9300]])
  assert.match(unpaid.hint, /حارس الفترة/)
  // التأمينات: الصافي من غيرها مش سالب
  const insurance = explainPayrollNegativeNet(item({ unpaidLeaveDeduction: 9000, socialInsuranceDeduction: 975, netPay: -975 }))
  assert.equal(insurance.cause, 'SOCIAL_INSURANCE'); assert.match(insurance.hint, /التأمين/)
  // خصومات تانية (مثلًا سلف من غير حماية)
  const deductions = explainPayrollNegativeNet(item({ otherDeductions: 9000, loanInstallments: 500, netPay: -500 }))
  assert.equal(deductions.cause, 'DEDUCTIONS')
  for (const row of [unpaid, insurance, deductions]) {
    assert.equal(row.lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0), Math.round(row.net * 100))
  }
  // بدل ضغط العمل برّه صافي المؤثرات (نفس فحص الاعتماد): صافي موجب بالبدل وسالب من غيره
  const breakdown = JSON.stringify({ workPressureAllowance: { earnedAmount: 500 } })
  const pressure = explainPayrollNegativeNet(item({ allowances: 500, unpaidLeaveDeduction: 9300, netPay: 200, breakdown }))
  assert.deepEqual([pressure.net, pressure.cause, pressure.lines[0].amount], [-300, 'UNPAID_LEAVE', 9000])
})

test('رسالة الرفض: أول 3 بالاسم والصافي، والعدد، والسبب', () => {
  const rows = [1, 2, 3, 4].map(id => explainPayrollNegativeNet(item({ employeeId: id, unpaidLeaveDeduction: 9300, netPay: -300 }), { fullName: `موظف ${id}` }))
  const message = payrollNegativeNetMessage(rows, 'اعتماد')
  assert.match(message, /^صافي 4 موظف سالب: «موظف 1» \(-300\.00\)، «موظف 2» \(-300\.00\)، «موظف 3» \(-300\.00\) و1 كمان\./)
  assert.match(message, /حارس الفترة/); assert.match(message, /الـاعتماد ممنوع/)
  assert.match(payrollNegativeNetMessage(rows.slice(0, 1), 'صرف'), /^صافي 1 موظف سالب: «موظف 1» \(-300\.00\)\./)
})

test('سطور الإجازة لما الحارس يقص: النقص من سطور المرضية من الآخر ومفيش سطر سالب، والزيادة على آخر سطر زي ما كانت', () => {
  const sick = [{ payPercent: 75, label: 'مرضية 75%', days: 5, amount: 375 }, { payPercent: 50, label: 'مرضية 50%', days: 10, amount: 1500 }]
  // من غير قص: زي ما كان (قرش التقريب على آخر سطر)
  const exact = payrollLeaveDeductionLines(3000.01, 1125, 3.75, sick)
  assert.deepEqual(exact.lines.map(line => [line.code, line.amount]), [['UNPAID_LEAVE', 1125], ['SICK_LEAVE_75', 375], ['SICK_LEAVE_50', 1500.01]])
  // الحارس قص المجموع لـ1,500: بدون راتب كامل، والمرضية من الآخر
  const cut = payrollLeaveDeductionLines(1500, 1125, 3.75, sick)
  assert.deepEqual(cut.lines.map(line => [line.code, line.amount]), [['UNPAID_LEAVE', 1125], ['SICK_LEAVE_75', 375], ['SICK_LEAVE_50', 0]])
  assert.equal(cut.sickAmount, 375)
  const deeper = payrollLeaveDeductionLines(1200, 1125, 3.75, sick)
  assert.deepEqual(deeper.lines.map(line => [line.code, line.amount]), [['UNPAID_LEAVE', 1125], ['SICK_LEAVE_75', 75], ['SICK_LEAVE_50', 0]])
  for (const result of [exact, cut, deeper]) assert.ok(result.lines.every(line => line.amount >= 0))
})

test('الحارس في لقطة السياسة: المقفول مالوش أثر في البصمة، والمفعّل فرق ظاهر بالاسم', () => {
  const base = { schemaVersion: 1, capturedAt: '2026-10-03T00:00:00.000Z', capturedBy: 1, period: '2026-09', dayBasis: 'FIXED_30', policy: null,
    values: { monthlyDays: 30, dailyHours: 8 }, sources: { monthlyDays: { kind: 'DEFAULT', key: 'payroll.monthly_days' } },
    latenessTiers: { setId: null, effectivePeriod: null, contentHash: null, source: 'NONE', tiers: [] } }
  const on = { ...base, values: { ...base.values, periodDeductionGuard: true }, sources: { ...base.sources, periodDeductionGuard: { kind: 'CONFIG', key: snapshot.PAYROLL_PERIOD_DEDUCTION_GUARD_KEY } } }
  assert.notEqual(snapshot.payrollRunPolicySnapshotFingerprint(on), snapshot.payrollRunPolicySnapshotFingerprint(base))
  const differences = snapshot.diffPayrollRunPolicySnapshots(base, on).filter(d => d.key === 'values.periodDeductionGuard')
  assert.deepEqual(differences.map(d => [d.label, d.stored, d.current]), [['حارس الفترة (الإجازة بدون راتب ماتعديش راتب الفترة)', 'لا', 'نعم']])
  assert.deepEqual(snapshot.diffPayrollRunPolicySnapshots(base, base).filter(d => d.key === 'values.periodDeductionGuard'), [])
  assert.equal(snapshot.PAYROLL_PERIOD_DEDUCTION_GUARD_KEY, 'payroll.period_deduction_guard.enabled')
})

test('اعتماد واحد شغال للمسير: القفل من غير انتظار في الاعتماد بخطوة واحدة وفي «اعتمد خطوتي» بس', () => {
  const lock = fs.readFileSync(path.join(apiRoot, 'src/payroll/payroll-approval-lock.ts'), 'utf8')
  assert.match(lock, /@LockTimeout = 0/); assert.match(lock, /hr:payroll:approve:\$\{runId\}/); assert.match(lock, /PAYRUN-APPROVAL-RUNNING/)
  const payroll = fs.readFileSync(path.join(apiRoot, 'src/payroll/payroll.service.ts'), 'utf8')
  assert.match(payroll, /async approve\(user: JwtPayload, runId: number\) \{\r?\n\s+return this\.runs\.manager\.transaction\(async em => \{\r?\n(?:\s*\/\/[^\n]*\r?\n)*\s+await claimPayrollApproval\(em, runId\)\r?\n\s+await this\.lockRun\(em, runId\)/)
  const chain = fs.readFileSync(path.join(apiRoot, 'src/payroll/payroll-approval-chain.service.ts'), 'utf8')
  assert.match(chain, /if \(approval\) await claimPayrollApproval\(em, runId\)\r?\n\s+await lockPayrollRunForCorrection\(em, runId\)/)
  // «اعتمد خطوتي» بيبعت true، و«ارفض» لأ
  assert.match(chain, /async approveStep[\s\S]*?\}, true\)\r?\n  \}/)
  assert.doesNotMatch(chain.slice(chain.indexOf('async rejectStep'), chain.indexOf('async myPendingCount')), /, true\)/)
})
