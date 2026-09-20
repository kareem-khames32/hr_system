// قرار المالك (20 سبتمبر): راتب آخر شهر مصدره الوحيد بند المسير؛ صفّه داخل إجمالي المسير وبرّه كشف البنك والمستحق للصرف.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
const {
  assertSettlementSalaryMatchesRun, payrollItemSettlementPayout, payrollSettlementCase,
  SETTLEMENT_RUN_ROW_LABEL, settlementSalaryLineLabel,
} = require('../src/payroll/payroll-settlement-salary')
const { buildBankSheet } = require('../src/payroll/bank-sheet')

const period = ['2026-06-23', '2026-07-22']

test('OWNER-3 شهر آخر يوم عمل هو المسير اللي راتبه بيتصرف مع التصفية — وقبله أو بعده لأ', () => {
  const cases = [{ id: 4, status: 'SETTLED', lastWorkingDay: '2026-07-10' }]
  assert.deepEqual(payrollSettlementCase(cases, ...period), { caseId: 4, lastWorkingDay: '2026-07-10', status: 'SETTLED' })
  assert.equal(payrollSettlementCase([{ id: 4, status: 'SETTLED', lastWorkingDay: '2026-06-01' }], ...period), null)
  assert.equal(payrollSettlementCase([{ id: 4, status: 'SETTLED', lastWorkingDay: '2026-08-01' }], ...period), null)
  assert.equal(payrollSettlementCase([{ id: 4, status: 'CANCELLED', lastWorkingDay: '2026-07-10' }], ...period), null)
})

test('OWNER-3 علامة «مصروف مع التصفية» تُقرأ من تفصيل البند المحفوظ بلا إعادة حساب', () => {
  const breakdown = JSON.stringify({ settlementPayout: { caseId: 4, lastWorkingDay: '2026-07-10', label: SETTLEMENT_RUN_ROW_LABEL } })
  assert.deepEqual(payrollItemSettlementPayout(breakdown), { caseId: 4, lastWorkingDay: '2026-07-10', label: SETTLEMENT_RUN_ROW_LABEL })
  assert.equal(payrollItemSettlementPayout('{}'), null)
  assert.equal(payrollItemSettlementPayout('not json'), null)
  assert.equal(payrollItemSettlementPayout(JSON.stringify({ settlementPayout: { caseId: 4, lastWorkingDay: 'x' } })), null)
})

test('OWNER-3 اعتماد التصفية يرفض أي فرق عن بند المسير — مصدر واحد لا يتجزأ', () => {
  const line = amount => ({ isAuto: true, type: 'CREDIT', label: settlementSalaryLineLabel('2026-07', 9), amount })
  assert.doesNotThrow(() => assertSettlementSalaryMatchesRun([line(4321.5)], [line(4321.5)]))
  assert.doesNotThrow(() => assertSettlementSalaryMatchesRun([], []))
  assert.throws(() => assertSettlementSalaryMatchesRun([line(4000)], [line(4321.5)]), /لا يطابق بند المسير/)
  assert.throws(() => assertSettlementSalaryMatchesRun([], [line(4321.5)]), /غير موجود/)
  // بند يدوي بنفس المبلغ لا يُعتبر بند المسير
  assert.throws(() => assertSettlementSalaryMatchesRun([{ ...line(4321.5), isAuto: false }], [line(4321.5)]), /غير موجود/)
})

test('OWNER-3 كشف البنك يستبعد صف التصفية من المبلغ المستحق ويذكره منفصلًا', () => {
  const base = { payMethod: 'transfer', bankTransferAmount: null, bankName: 'بنك الاختبار', iban: 'SA00' }
  const sheet = buildBankSheet([
    { ...base, employeeId: 1, employeeCode: 'A1', fullName: 'موظف عادي', netPay: 5000 },
    { ...base, employeeId: 2, employeeCode: 'A2', fullName: 'موظف تصفية', netPay: 3000,
      settlementPayout: { caseId: 4, lastWorkingDay: '2026-07-10', label: SETTLEMENT_RUN_ROW_LABEL } },
  ])
  assert.equal(sheet.rows.length, 1)
  assert.equal(sheet.rows[0].employeeId, 1)
  assert.deepEqual([sheet.totals.employees, sheet.totals.bank, sheet.totals.net], [1, 5000, 5000])
  assert.deepEqual([sheet.settlement.employees, sheet.settlement.total], [1, 3000])
  assert.equal(sheet.settlement.rows[0].lastWorkingDay, '2026-07-10')
  assert.equal(sheet.banks.reduce((sum, bank) => sum + bank.total, 0), 5000)
})
