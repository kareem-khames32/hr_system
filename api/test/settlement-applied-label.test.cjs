// متابعة B1.8b بعد دمج خط التسريبات: القيد اللي اتسوّى في التصفية (APPLIED من غير مسير) بيتقال عليه كده في شاشات الخصم والمكافأة.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { appliedBySettlement, SETTLEMENT_APPLIED_LABEL } = require('../src/offboarding/settlement-obligations')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')

test('SAL-01: APPLIED من غير مسير = اتسوّى في التصفية؛ أي حالة تانية أو مستهلك في مسير لأ', () => {
  assert.equal(SETTLEMENT_APPLIED_LABEL, 'اتسوّى في تصفية نهاية الخدمة')
  assert.equal(appliedBySettlement({ status: 'APPLIED', appliedPayrollRunId: null }), true)
  assert.equal(appliedBySettlement({ status: 'APPLIED' }), true)
  assert.equal(appliedBySettlement({ status: 'APPLIED', appliedPayrollRunId: 7 }), false)
  for (const status of ['PENDING', 'CANCELLED', 'SUSPENDED', 'EXEMPTED', 'DEFERRED']) assert.equal(appliedBySettlement({ status, appliedPayrollRunId: null }), false, status)
  assert.equal(appliedBySettlement(null), false)
})

test('SAL-02: شاشات المكافأة والخصم بتحكم من القيد المخزن نفسه (مش من رقم المسير بعد الحجب)', () => {
  const bonuses = read('src/payroll/bonuses.service.ts')
  assert.match(bonuses, /const settled = state === 'PAID' && appliedBySettlement\(credit\)/)
  assert.match(bonuses, /label: settled \? SETTLEMENT_APPLIED_LABEL : BONUS_LABELS\.payout\[state\]/)
  const deductions = read('src/payroll/typed-deductions.service.ts')
  assert.equal(deductions.split('appliedBySettlement(item) ? SETTLEMENT_APPLIED_LABEL').length - 1, 2)
})
