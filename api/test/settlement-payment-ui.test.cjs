// B1.8c: شاشة صرف التصفية — سطر العرض وربط الشاشة بالمسار. اختبارات نقية بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { SETTLEMENT_PAYMENT_METHOD_OPTIONS, settlementPaymentSummary } = require('../../src/lib/settlement-payment-api')
const { SETTLEMENT_PAYMENT_METHOD_LABELS, SETTLEMENT_PAYMENT_METHODS } = require('../src/offboarding/settlement-payment')

test('SPU-01: سطر الصرف المتسجل بالتاريخ والطريقة والمرجع ومين سجّل، وطرق الشاشة هي طرق الخادم بنفس أسمائها', () => {
  assert.equal(settlementPaymentSummary({ paidAt: '2026-10-03', method: 'BANK_TRANSFER', methodLabel: 'تحويل بنكي', reference: 'TRX-1', paidByUserId: 4, paidByName: 'سارة' }),
    'اتصرفت يوم 2026-10-03 — تحويل بنكي (مرجع TRX-1) — سجّلها سارة')
  assert.equal(settlementPaymentSummary({ paidAt: '2026-10-03', method: 'CASH', methodLabel: 'نقدي', reference: null, paidByUserId: null, paidByName: null }),
    'اتصرفت يوم 2026-10-03 — نقدي')
  assert.deepEqual(SETTLEMENT_PAYMENT_METHOD_OPTIONS.map(option => [option.value, option.label]),
    SETTLEMENT_PAYMENT_METHODS.map(method => [method, SETTLEMENT_PAYMENT_METHOD_LABELS[method]]))
})

test('SPU-02: الشاشة بتعرض القسم بعد الاعتماد ولأصحاب التصفية بس، والمسار بصلاحية «اعتماد التصفية»', () => {
  const root = path.join(__dirname, '..', '..')
  const page = fs.readFileSync(path.join(root, 'src/app/employees/[id]/settlement/page.tsx'), 'utf8')
  assert.match(page, /\{det\.settlementDocRef && seesMoney && \(\s*<SettlementPaymentPanel/)
  assert.match(page, /canRecord=\{can\('settlement\.approve'\)\}/)
  const controller = fs.readFileSync(path.join(__dirname, '..', 'src/offboarding/offboarding.controller.ts'), 'utf8')
  assert.match(controller, /@Perm\('settlement\.approve'\)\s*\n\s*@Post\(':id\/settlement-payment'\)/)
})
