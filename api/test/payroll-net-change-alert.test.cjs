// B1.14 (الراتب الحي): تنبيه «الصافي اتغيّر» قبل الاعتماد — دوال صِرفة من غير قاعدة.
//  NC-01) النسبة من الإعداد: عدد صحيح من 0 لـ1000، وأي قيمة تانية (فاضية، كسر، سالب، نص) = الافتراضي 20.
//  NC-02) الفرق قد النسبة أو أكتر ← تنبيه بالصافيين والنسبة والبنود اللي فرقت بس؛ تحت النسبة أو من غير فرق ← مفيش.
//  NC-03) الصافي السابق صفر أو سالب: أي فرق تنبيه من غير نسبة؛ النسبة 0 = مقفول؛ ومن غير بند سابق أو حالي ← مفيش.
// Run (من api/): node --test test/payroll-net-change-alert.test.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { PAYROLL_NET_CHANGE_ALERT_KEY, PAYROLL_NET_CHANGE_ALERT_DEFAULT, payrollNetChangeAlertPercent, payrollNetChange } = require('../src/payroll/payroll-run-changes')

const item = (netPay, extra = {}) => ({ basicSalary: 9000, allowances: 0, overtimeAmount: 0, otherAdditions: 0, latenessDeduction: 0, shortfallDeduction: 0, absenceDeduction: 0,
  unpaidLeaveDeduction: 0, loanInstallments: 0, otherDeductions: 0, socialInsuranceDeduction: 0, netPay, ...extra })

test('NC-01: النسبة من الإعداد — عدد صحيح من 0 لـ1000، وغيره = الافتراضي 20', () => {
  assert.equal(PAYROLL_NET_CHANGE_ALERT_KEY, 'payroll.approval.net_change_alert_percent')
  assert.equal(PAYROLL_NET_CHANGE_ALERT_DEFAULT, 20)
  for (const [value, expected] of [['20', 20], ['0', 0], ['5', 5], [35, 35], ['1000', 1000], ['', 20], ['  ', 20], [null, 20], [undefined, 20],
    ['12.5', 20], ['-1', 20], ['1001', 20], ['abc', 20], ['1e2', 100]]) {
    assert.equal(payrollNetChangeAlertPercent(value), expected, JSON.stringify(value))
  }
})

test('NC-02: الفرق قد النسبة أو أكتر ← تنبيه بالبنود اللي فرقت بس؛ تحت النسبة أو من غير فرق ← مفيش', () => {
  // زيادة الأساسي 9000 ← 12000: 33.3%
  assert.deepEqual(payrollNetChange(item(9000), item(12000, { basicSalary: 12000 }), 20),
    { previousNet: 9000, currentNet: 12000, percent: 33.3, lines: [{ label: 'الأساسي', previous: 9000, current: 12000 }] })
  // نقص بالغياب والتأخير: البندين اللي فرقوا بس، بترتيب القسيمة
  assert.deepEqual(payrollNetChange(item(9000), item(6300, { absenceDeduction: 2400, latenessDeduction: 300 }), 20),
    { previousNet: 9000, currentNet: 6300, percent: 30, lines: [{ label: 'التأخير', previous: 0, current: 300 }, { label: 'الغياب', previous: 0, current: 2400 }] })
  // قد النسبة بالظبط = تنبيه
  assert.equal(payrollNetChange(item(10000, { basicSalary: 10000 }), item(8000, { basicSalary: 10000, loanInstallments: 2000 }), 20).percent, 20)
  // القرار على النسبة زي ما بتتعرض (مقرّبة لخانة عشرية): 19.99% بتتعرض 20% فبتطلع، و19.94% بتتعرض 19.9% فمابتطلعش
  assert.equal(payrollNetChange(item(10000), item(8001), 20).percent, 20)
  assert.equal(payrollNetChange(item(10000), item(8006), 20), null, '19.9% تحت النسبة')
  // تحت النسبة، ومن غير فرق في الصافي
  assert.equal(payrollNetChange(item(9000), item(9500, { basicSalary: 9500 }), 20), null)
  assert.equal(payrollNetChange(item(9000), item(9000), 20), null)
  // نفس الصافي ببنود مختلفة (زيادة قابلها خصم): الصافي ماتغيرش فمفيش تنبيه
  assert.equal(payrollNetChange(item(9000), item(9000, { otherAdditions: 500, otherDeductions: 500 }), 1), null)
  // نسبة أقل بتطلّعه
  assert.equal(payrollNetChange(item(9000), item(9500, { basicSalary: 9500 }), 5).percent, 5.6)
  // أرقام نصية من القاعدة (decimal) بتتقرا صح، وبالهللة
  assert.deepEqual(payrollNetChange(item('1000.10'), item('1300.13', { overtimeAmount: '300.03' }), 20),
    { previousNet: 1000.1, currentNet: 1300.13, percent: 30, lines: [{ label: 'الإضافي', previous: 0, current: 300.03 }] })
})

test('NC-03: السابق صفر أو سالب = أي فرق تنبيه من غير نسبة؛ النسبة 0 = مقفول؛ ومن غير بند سابق أو حالي ← مفيش', () => {
  assert.deepEqual(payrollNetChange(item(0, { absenceDeduction: 9000 }), item(500, { absenceDeduction: 8500 }), 20),
    { previousNet: 0, currentNet: 500, percent: null, lines: [{ label: 'الغياب', previous: 9000, current: 8500 }] })
  assert.equal(payrollNetChange(item(-150), item(200), 20).percent, null)
  assert.equal(payrollNetChange(item(0), item(0), 20), null)
  // الصافي نزل لصفر: 100%
  assert.equal(payrollNetChange(item(9000), item(0, { absenceDeduction: 9000 }), 20).percent, 100)
  // مقفول
  for (const threshold of [0, -5, NaN]) assert.equal(payrollNetChange(item(9000), item(100), threshold), null, String(threshold))
  // موظف جديد (من غير مسير مقارنة) أو بند ناقص
  assert.equal(payrollNetChange(undefined, item(9000), 20), null)
  assert.equal(payrollNetChange(null, item(9000), 20), null)
  assert.equal(payrollNetChange(item(9000), undefined, 20), null)
})
