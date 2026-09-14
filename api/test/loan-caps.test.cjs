// C6 / الخطوة 29: سقوف السلف (AD-01..06) وخطة السداد المبكر (AD-14) ورصيد ما بعد الإنهاء (AD-13) — اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { BadRequestException } = require('@nestjs/common')
const caps = require('../src/loans/loan-caps')

const bad = (action, code) => assert.throws(action, error => error instanceof BadRequestException && (!code || error.getResponse().code === code))
const cents = text => BigInt(text.replace('.', ''))
const policy = extra => ({ id: 1, policyKey: 'LCP-a', version: 1, isActive: true, name: 'سياسة الشركة', scopeType: 'COMPANY', scopeIds: null,
  salaryBase: 'BASIC', percentOfSalary: '10.0000', flatCapAmount: '1500.00', maxRequestsPerMonth: null, maxAmountPerMonth: '1000.00',
  maxOutstandingBalance: '3000.00', maxInstallmentMonths: null, monthDefinition: 'PAYROLL_PERIOD', effectiveFrom: '2026-01-01', effectiveTo: null,
  priority: 0, reason: null, ...extra })
const payrollWindow = caps.loanCapWindow('PAYROLL_PERIOD', '2026-09-14', 23)
const evaluate = (amount, extra = {}, input = {}) => caps.computeLoanCap({ asOf: '2026-09-14', amount, months: 3, policy: policy(extra),
  salary: { basic: '8000.00', gross: '10000.00', sourceRef: 'test' }, usage: { requests: 0, amount: '0.00' }, outstanding: '2500.00', window: payrollWindow, ...input })

test('AD-05 SRS example: MIN(800, 1500, 1000, 500) = 500 governed by the outstanding cap; 501 is rejected with the governing cap named, 500 passes', () => {
  const over = evaluate('501.00')
  assert.deepEqual(over.components.map(row => [row.code, row.available]), [['PERCENT', '800.00'], ['FLAT', '1500.00'], ['MONTHLY_AMOUNT', '1000.00'], ['OUTSTANDING', '500.00']])
  assert.equal(over.effectiveCap, '500.00'); assert.equal(over.governing, 'OUTSTANDING'); assert.equal(over.allowed, false)
  assert.equal(over.violations[0].code, 'AMOUNT_OVER_CAP'); assert.match(over.violations[0].message, /سقف المديونية القائمة/)
  assert.equal(over.excess, '1.00')
  const exact = evaluate('500.00')
  assert.equal(exact.allowed, true); assert.deepEqual(exact.violations, []); assert.equal(exact.excess, '0.00')
})

test('AD-02 switching the percent base from BASIC to GROSS changes the cap immediately', () => {
  const only = { flatCapAmount: null, maxAmountPerMonth: null, maxOutstandingBalance: null }
  assert.equal(evaluate('900.00', only).effectiveCap, '800.00')
  assert.equal(evaluate('900.00', only).allowed, false)
  const gross = evaluate('900.00', { ...only, salaryBase: 'GROSS' })
  assert.equal(gross.effectiveCap, '1000.00'); assert.equal(gross.allowed, true); assert.equal(gross.salary.value, '10000.00')
  assert.equal(evaluate('1.00', { ...only, percentOfSalary: '12.5' }).effectiveCap, '1000.00')
})

test('AD-04 monthly count and amount: pending requests consume the counter and the reset date is stated', () => {
  assert.deepEqual(payrollWindow, { definition: 'PAYROLL_PERIOD', period: '2026-09', from: '2026-08-23', to: '2026-09-22', resetsOn: '2026-09-23' })
  const counted = evaluate('100.00', { maxRequestsPerMonth: 2 }, { usage: { requests: 2, amount: '200.00' } })
  assert.equal(counted.allowed, false); assert.equal(counted.usage.remainingRequests, 0)
  assert.equal(counted.violations[0].code, 'MONTHLY_COUNT_REACHED'); assert.match(counted.violations[0].message, /2026-09-23/)
  const amount = evaluate('301.00', { maxOutstandingBalance: null, percentOfSalary: null, salaryBase: null }, { usage: { requests: 1, amount: '700.00' } })
  assert.equal(amount.effectiveCap, '300.00'); assert.equal(amount.governing, 'MONTHLY_AMOUNT'); assert.equal(amount.allowed, false)
  assert.equal(caps.computeLoanCap({ ...{ asOf: '2026-09-14', amount: '300.00', months: 1, policy: policy({ maxOutstandingBalance: null, percentOfSalary: null, salaryBase: null }),
    salary: { basic: '0.00', gross: '0.00', sourceRef: 't' }, usage: { requests: 1, amount: '700.00' }, outstanding: '0.00', window: payrollWindow } }).allowed, true)
})

test('AD-04 month definition: calendar month versus payroll period (cycle 23), including the boundary day', () => {
  assert.deepEqual(caps.loanCapWindow('CALENDAR', '2026-09-14', 23), { definition: 'CALENDAR', period: '2026-09', from: '2026-09-01', to: '2026-09-30', resetsOn: '2026-10-01' })
  assert.deepEqual(caps.loanCapWindow('PAYROLL_PERIOD', '2026-09-23', 23), { definition: 'PAYROLL_PERIOD', period: '2026-10', from: '2026-09-23', to: '2026-10-22', resetsOn: '2026-10-23' })
  assert.deepEqual(caps.loanCapWindow('PAYROLL_PERIOD', '2026-12-31', 1), { definition: 'PAYROLL_PERIOD', period: '2026-12', from: '2026-12-01', to: '2026-12-31', resetsOn: '2027-01-01' })
})

test('AD-06 outstanding equal to the cap blocks any new request; lower outstanding frees headroom', () => {
  const full = evaluate('1.00', {}, { outstanding: '3000.00' })
  assert.equal(full.allowed, false); assert.equal(full.effectiveCap, '0.00'); assert.equal(full.violations[0].code, 'CAP_EXHAUSTED')
  assert.equal(evaluate('1.00', {}, { outstanding: '3100.00' }).effectiveCap, '0.00')
  assert.equal(evaluate('500.00', {}, { outstanding: '2500.00' }).allowed, true)
})

test('AD-01 no policy means no caps; months above the policy maximum are refused', () => {
  const none = caps.computeLoanCap({ asOf: '2026-09-14', amount: '999999.00', months: 100, policy: null, salary: { basic: '1.00', gross: '1.00', sourceRef: 't' },
    usage: { requests: 50, amount: '0.00' }, outstanding: '0.00', window: payrollWindow })
  assert.equal(none.allowed, true); assert.equal(none.effectiveCap, null); assert.equal(none.policy, null)
  const months = evaluate('100.00', { maxInstallmentMonths: 2 })
  assert.equal(months.allowed, false); assert.equal(months.violations.at(-1).code, 'MONTHS_OVER_MAX')
})

test('AD-01/03 policy validation: at least one cap, positive flat cap, percent needs a base, scoped policies need ids', () => {
  const base = { name: 'سياسة الفرع', scopeType: 'COMPANY', effectiveFrom: '2026-09-01' }
  bad(() => caps.normalizeLoanCapPolicyInput(base), 'LOAN_CAP_POLICY_EMPTY')
  bad(() => caps.normalizeLoanCapPolicyInput({ ...base, flatCapAmount: '0' }))
  bad(() => caps.normalizeLoanCapPolicyInput({ ...base, flatCapAmount: '-5' }))
  bad(() => caps.normalizeLoanCapPolicyInput({ ...base, percentOfSalary: '10' }))
  bad(() => caps.normalizeLoanCapPolicyInput({ ...base, scopeType: 'BRANCH', flatCapAmount: '500' }))
  bad(() => caps.normalizeLoanCapPolicyInput({ ...base, flatCapAmount: '500', effectiveTo: '2026-08-31' }))
  const saved = caps.normalizeLoanCapPolicyInput({ ...base, scopeType: 'BRANCH', scopeIds: [3, 1, 3], percentOfSalary: 10, salaryBase: 'GROSS', maxOutstandingBalance: '0', monthDefinition: '' })
  assert.deepEqual([saved.scopeIds, saved.percentOfSalary, saved.maxOutstandingBalance, saved.monthDefinition, saved.priority], [[1, 3], '10.0000', '0.00', 'PAYROLL_PERIOD', 0])
})

test('AD-01 selection: the most specific scope wins, then priority; inactive and out-of-window versions never participate', () => {
  const employee = { id: 7, branchId: 2, departmentId: 5, teamId: 9 }
  const rows = [
    policy({ id: 1, scopeType: 'COMPANY', priority: 99 }),
    policy({ id: 2, scopeType: 'BRANCH', scopeIds: [2] }),
    policy({ id: 3, scopeType: 'BRANCH', scopeIds: [2], priority: 5 }),
    policy({ id: 4, scopeType: 'DEPARTMENT', scopeIds: [5], isActive: false }),
    policy({ id: 5, scopeType: 'TEAM', scopeIds: [9], effectiveFrom: '2026-10-01' }),
    policy({ id: 6, scopeType: 'EMPLOYEES', scopeIds: [8] }),
  ]
  assert.equal(caps.selectLoanCapPolicy(rows, employee, '2026-09-14').id, 3)
  assert.equal(caps.selectLoanCapPolicy(rows, employee, '2026-10-01').id, 5)
  assert.equal(caps.selectLoanCapPolicy(rows, { ...employee, branchId: 4 }, '2026-09-14').id, 1)
  assert.equal(caps.selectLoanCapPolicy(rows.slice(1), { ...employee, branchId: 4 }, '2026-09-14'), null)
})

const sources = [{ id: 2, dueDate: '2026-11-01', remainingAmount: '1666.00' }, { id: 3, dueDate: '2026-12-01', remainingAmount: '1668.00' }]
test('AD-14 SHORTEN_TERM pays from the last installment: 1668 closes one installment; 1334 leaves 334 on the tail', () => {
  const closeTail = caps.planEarlyRepayment(sources, '1668.00', 'SHORTEN_TERM')
  assert.deepEqual(closeTail, { mode: 'SHORTEN_TERM', total: '3334.00', amount: '1668.00', balanceAfter: '1666.00', lines: [{ installmentId: 3, paidAmount: '1668.00', carriedAmount: '0.00' }] })
  assert.deepEqual(caps.planEarlyRepayment(sources, '1334.00', 'SHORTEN_TERM').lines, [{ installmentId: 3, paidAmount: '1334.00', carriedAmount: '334.00' }])
})

test('AD-14 REDUCE_INSTALLMENT keeps the count and equalizes the rest (SRS: 1000 + 1000 after 1334)', () => {
  const plan = caps.planEarlyRepayment(sources, '1334.00', 'REDUCE_INSTALLMENT')
  assert.equal(plan.balanceAfter, '2000.00')
  assert.deepEqual(plan.lines, [{ installmentId: 2, paidAmount: '666.00', carriedAmount: '1000.00' }, { installmentId: 3, paidAmount: '668.00', carriedAmount: '1000.00' }])
  // قسط مرحّل صغير لا يحتمل حصة متساوية → توزيع تناسبي بلا زيادة أي قسط
  const uneven = caps.planEarlyRepayment([{ id: 1, dueDate: '2026-10-01', remainingAmount: '100.00' }, { id: 2, dueDate: '2026-11-01', remainingAmount: '1900.00' }], '400.00', 'REDUCE_INSTALLMENT')
  assert.deepEqual(uneven.lines.map(line => [line.installmentId, line.paidAmount, line.carriedAmount]), [[1, '20.00', '80.00'], [2, '380.00', '1520.00']])
})

test('AD-14 full settlement, overpayment refusal with the exact closing amount, and FULL mode needs the closing amount', () => {
  assert.equal(caps.planEarlyRepayment(sources, null, 'SHORTEN_TERM').mode, 'FULL')
  assert.equal(caps.planEarlyRepayment(sources, '3334.00', 'REDUCE_INSTALLMENT').mode, 'FULL')
  assert.throws(() => caps.planEarlyRepayment(sources, '3334.01', 'SHORTEN_TERM'), error => error.getResponse().code === 'LOAN_REPAYMENT_EXCEEDS_BALANCE' && error.getResponse().closingAmount === '3334.00')
  bad(() => caps.planEarlyRepayment(sources, '100.00', 'FULL'))
  bad(() => caps.planEarlyRepayment([], '1.00', 'SHORTEN_TERM'), 'LOAN_ALREADY_SETTLED')
  bad(() => caps.planEarlyRepayment(sources, '0.00', 'SHORTEN_TERM'))
})

test('AD-14 every partial plan preserves each installment and the paid total to the cent', () => {
  const rows = [{ id: 1, dueDate: '2026-10-01', remainingAmount: '333.33' }, { id: 2, dueDate: '2026-11-01', remainingAmount: '333.33' }, { id: 3, dueDate: '2026-12-01', remainingAmount: '333.34' }]
  for (const mode of ['SHORTEN_TERM', 'REDUCE_INSTALLMENT']) {
    for (let pay = 1n; pay < 100000n; pay += 1237n) {
      const text = `${pay / 100n}.${String(pay % 100n).padStart(2, '0')}`
      let plan
      try { plan = caps.planEarlyRepayment(rows, text, mode) } catch (error) { assert.equal(mode, 'REDUCE_INSTALLMENT'); continue }
      assert.equal(plan.lines.reduce((sum, line) => sum + cents(line.paidAmount), 0n), pay)
      for (const line of plan.lines) {
        const source = rows.find(row => row.id === line.installmentId)
        assert.equal(cents(line.paidAmount) + cents(line.carriedAmount), cents(source.remainingAmount))
        assert.ok(cents(line.paidAmount) > 0n)
      }
    }
  }
})

test('AD-13 SRS example: loan balance 3340 against dues 2100 leaves 1240 PENDING_RECOVERY; other debits consume dues first', () => {
  assert.deepEqual(caps.settlementLoanRecovery({ loanBalance: '3340.00', credits: '2100.00', debits: '3340.00' }), { loanBalance: '3340.00', covered: '2100.00', uncovered: '1240.00' })
  assert.equal(caps.settlementLoanRecovery({ loanBalance: '3340.00', credits: '5000.00', debits: '3340.00' }), null)
  assert.deepEqual(caps.settlementLoanRecovery({ loanBalance: '3340.00', credits: '2100.00', debits: '3840.00' }), { loanBalance: '3340.00', covered: '1600.00', uncovered: '1740.00' })
  assert.deepEqual(caps.settlementLoanRecovery({ loanBalance: '100.00', credits: '0.00', debits: '900.00' }), { loanBalance: '100.00', covered: '0.00', uncovered: '100.00' })
  assert.equal(caps.settlementLoanRecovery({ loanBalance: '0.00', credits: '0.00', debits: '900.00' }), null)
})
