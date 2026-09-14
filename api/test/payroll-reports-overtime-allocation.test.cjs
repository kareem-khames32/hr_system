// الخطوة 30 / RP-07: توزيع قيمة بند مسير قديم يجمع عدة سجلات إضافي على سجلاته بالقروش الصحيحة.
// بلا خادم ولا SQL: دوال نقية من payroll-reports.ts.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { allocateOvertimeItemCents, overtimeWeightUnits, reportCents, reportMoney, OVERTIME_AMOUNT_SOURCE_LABELS } = require('../src/payroll/payroll-reports')

const sum = map => [...map.values()].reduce((total, value) => total + value, 0n)
const money = map => Object.fromEntries([...map.entries()].map(([id, cents]) => [id, reportMoney(cents)]))

test('weight units are exact integers of hours x multiplier and reject missing or negative inputs', () => {
  assert.equal(overtimeWeightUnits(2.83, 1.5), 283n * 150n)
  assert.equal(overtimeWeightUnits('1.62', '1.50'), 162n * 150n)
  assert.equal(overtimeWeightUnits(0, 1.5), 0n)
  for (const [hours, rate] of [[null, 1.5], [undefined, 1.5], [2, null], [-1, 1.5], [2, -1], ['x', 1.5]]) assert.equal(overtimeWeightUnits(hours, rate), null)
})

test('real hr_system item 1185: 1430.63 over entries 5-13 is split by weighted hours and sums back exactly', () => {
  const hours = { 5: 2.83, 6: 1.62, 7: 1.15, 8: 2.03, 9: 2.58, 10: 1.2, 11: 0.65, 12: 1.18, 13: 2.02 }
  const weights = Object.entries(hours).map(([id, value]) => ({ id: Number(id), units: overtimeWeightUnits(value, 1.5) }))
  const shares = allocateOvertimeItemCents(reportCents('1430.63'), weights)
  assert.ok(shares)
  assert.equal(sum(shares), 143063n, 'مجموع القروش = قيمة البند بالضبط')
  // الأرضيات تجمع 1430.59؛ القروش الأربعة الباقية لأكبر البواقي: السجلات 11 ثم 9 ثم 13 ثم 6
  assert.deepEqual(money(shares), { 5: '265.31', 6: '151.88', 7: '107.81', 8: '190.31', 9: '241.88', 10: '112.50', 11: '60.94', 12: '110.62', 13: '189.38' })
  for (const value of shares.values()) assert.ok(value > 0n, 'لا صفر مخترع لسجل له ساعات')
})

test('largest remainder breaks ties by entry id and never loses or invents a cent', () => {
  const shares = allocateOvertimeItemCents(11250n, [{ id: 7, units: 300n * 150n }, { id: 3, units: 100n * 150n }])
  assert.deepEqual(money(shares), { 7: '84.37', 3: '28.13' }, 'الباقيان متساويان ⇒ القرش للرقم الأصغر')
  const thirds = allocateOvertimeItemCents(100n, [{ id: 1, units: 1n }, { id: 2, units: 1n }, { id: 3, units: 1n }])
  assert.deepEqual(money(thirds), { 1: '0.34', 2: '0.33', 3: '0.33' })
  const big = allocateOvertimeItemCents(900719925474099301n, [{ id: 1, units: 1n }, { id: 2, units: 2n }])
  assert.equal(sum(big), 900719925474099301n, 'BigInt بلا فقد دقة في المبالغ الكبيرة')
})

test('allocation refuses to guess: missing hours, zero weights with money, or negative amounts give null, not zero', () => {
  assert.equal(allocateOvertimeItemCents(6000n, [{ id: 1, units: 15000n }, { id: 2, units: null }]), null)
  assert.equal(allocateOvertimeItemCents(6000n, [{ id: 1, units: 0n }, { id: 2, units: 0n }]), null)
  assert.equal(allocateOvertimeItemCents(-100n, [{ id: 1, units: 1n }]), null)
  assert.equal(allocateOvertimeItemCents(100n, []), null)
  assert.deepEqual(money(allocateOvertimeItemCents(0n, [{ id: 1, units: 0n }, { id: 2, units: 0n }])), { 1: '0.00', 2: '0.00' }, 'بند صفري بساعات صفرية ⇒ صفر حقيقي')
  assert.equal(OVERTIME_AMOUNT_SOURCE_LABELS.PAYROLL_ITEM_ALLOCATED, 'موزّع من بند المسير بنسبة الساعات')
})
