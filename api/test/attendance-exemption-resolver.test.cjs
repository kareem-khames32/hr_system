'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true })
require('../node_modules/reflect-metadata')
const { exemptionOnDate, exemptionPolicyOnDate } = require('../src/attendance/attendance-exemption-resolver')
function window(extra = {}) {
  return { id: 1, employeeId: 10, status: 'APPROVED', effectiveFrom: '2026-06-16', effectiveTo: null,
    terminatedFrom: null, overtimeEligibleOverride: null, unpaidLeaveDeductibleOverride: null,
    requiresCheckinForPresence: false, ...extra }
}
function status(code) { return error => error?.getStatus?.() === code }

test('EX-13: a partial period evaluates every day and an open end continues beyond month boundaries', () => {
  const windows = [window()]
  const exemptDays = Array.from({ length: 30 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`)
    .filter(date => exemptionOnDate(windows, date))
  assert.equal(exemptDays.length, 15)
  assert.equal(exemptDays[0], '2026-06-16')
  assert.equal(exemptDays.at(-1), '2026-06-30')
  assert.equal(exemptionOnDate(windows, '2027-01-01').id, 1)
})

test('EX-13: effectiveFrom and effectiveTo are inclusive, including a one-day leap-day window', () => {
  const windows = [window({ effectiveFrom: '2028-02-29', effectiveTo: '2028-02-29' })]
  assert.equal(exemptionOnDate(windows, '2028-02-28'), null)
  assert.equal(exemptionOnDate(windows, '2028-02-29').id, 1)
  assert.equal(exemptionOnDate(windows, '2028-03-01'), null)
})

test('EX-13: termination preserves earlier approved days and restores attendance from terminatedFrom itself', () => {
  const windows = [window({ terminatedFrom: '2026-06-20' })]
  assert.equal(exemptionOnDate(windows, '2026-06-19').id, 1)
  assert.equal(exemptionOnDate(windows, '2026-06-20'), null)
  assert.equal(exemptionOnDate(windows, '2026-06-21'), null)
  assert.equal(exemptionOnDate([window({ terminatedFrom: '2026-06-16' })], '2026-06-16'), null)
  assert.equal(windows[0].status, 'APPROVED')
})

test('EX-09: pending, rejected and cancelled decisions never make a day exempt', () => {
  for (const state of ['PENDING', 'REJECTED', 'CANCELLED']) {
    assert.equal(exemptionOnDate([window({ status: state })], '2026-06-17'), null)
  }
})

test('EX-09: overlapping approved windows fail closed, but consecutive windows can meet at a termination boundary', () => {
  assert.throws(() => exemptionOnDate([window(), window({ id: 2, effectiveFrom: '2026-06-20' })], '2026-06-20'), status(409))
  const adjacent = [window({ terminatedFrom: '2026-06-20' }), window({ id: 2, effectiveFrom: '2026-06-20' })]
  assert.equal(exemptionOnDate(adjacent, '2026-06-19').id, 1)
  assert.equal(exemptionOnDate(adjacent, '2026-06-20').id, 2)
  const dayAfterEnd = [window({ effectiveTo: '2026-06-19' }), window({ id: 2, effectiveFrom: '2026-06-20' })]
  assert.equal(exemptionOnDate(dayAfterEnd, '2026-06-20').id, 2)
})

test('أ7: المستثنى من البصمة بلا خصومات إطلاقًا وبلا إضافي بالقيم الافتراضية؛ والتجاوز الفردي قرار صريح', () => {
  // أ7 (16 سبتمبر): الافتراضي صار «لا يُخصم ولا يستحق إضافيًا» — لا خصم إجازة بلا أجر للمستثنى ما لم يُفعَّل الإعداد صراحةً.
  assert.deepEqual(exemptionPolicyOnDate([window()], '2026-06-17'), {
    isExempt: true, exemptionId: 1, overtimeEligible: false, unpaidLeaveDeductible: false,
    requiresCheckinForPresence: false, overtimeSource: 'DEFAULT', unpaidLeaveSource: 'DEFAULT',
  })
  const overridden = exemptionPolicyOnDate([window({ overtimeEligibleOverride: true, unpaidLeaveDeductibleOverride: false,
    requiresCheckinForPresence: true })], '2026-06-17')
  assert.equal(overridden.overtimeEligible, true)
  assert.equal(overridden.unpaidLeaveDeductible, false)
  assert.equal(overridden.requiresCheckinForPresence, true)
  assert.equal(overridden.overtimeSource, 'OVERRIDE')
  assert.equal(overridden.unpaidLeaveSource, 'OVERRIDE')
  const explicitFalse = exemptionPolicyOnDate([window({ overtimeEligibleOverride: false })], '2026-06-17',
    { overtimeEligible: true, unpaidLeaveDeductible: false })
  assert.equal(explicitFalse.overtimeEligible, false)
  assert.equal(explicitFalse.overtimeSource, 'OVERRIDE')
  assert.equal(explicitFalse.unpaidLeaveDeductible, false)
  assert.equal(explicitFalse.unpaidLeaveSource, 'DEFAULT')
})

test('EX-13: exemption defaults do not change ordinary days or rewrite an earlier resolved policy snapshot', () => {
  const defaults = { overtimeEligible: false, unpaidLeaveDeductible: true }
  const saved = exemptionPolicyOnDate([window()], '2026-06-17', defaults)
  defaults.overtimeEligible = true
  defaults.unpaidLeaveDeductible = false
  assert.equal(saved.overtimeEligible, false)
  assert.equal(saved.unpaidLeaveDeductible, true)
  assert.deepEqual(exemptionPolicyOnDate([window()], '2026-06-15', defaults), {
    isExempt: false, exemptionId: null, overtimeEligible: true, unpaidLeaveDeductible: true,
    requiresCheckinForPresence: false, overtimeSource: 'NOT_EXEMPT', unpaidLeaveSource: 'NOT_EXEMPT',
  })
})

test('EX-13: malformed calendar days, reversed windows and invalid default decisions are rejected', () => {
  for (const date of ['2026-02-29', '2026-06-31', '2026-6-01', '2026-06-17T00:00:00Z', 'invalid']) {
    assert.throws(() => exemptionOnDate([], date), status(400))
  }
  assert.throws(() => exemptionOnDate([window({ effectiveTo: '2026-06-15' })], '2026-06-17'), status(409))
  assert.throws(() => exemptionPolicyOnDate([window()], '2026-06-17', { overtimeEligible: 'false', unpaidLeaveDeductible: true }), status(400))
})
