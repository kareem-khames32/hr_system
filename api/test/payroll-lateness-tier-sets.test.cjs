// B4 / الخطوة 21 — الشرائح الحية: تحقق مجموعة الشرائح المؤرخة (رفض التداخل، الفجوات، البصمة)، والمضاعف 61 × 1.5،
// وتحويل المجموعة لطقم محرك السياسة في وضع الظل بنفس النتيجة. بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const tiers = require('../src/payroll/payroll-lateness-tiers')
const shadow = require('../src/payroll/payroll-shadow-attendance')
const { validatePayrollPolicyDefinition } = require('../src/payroll/payroll-policy-definition')
const { evaluatePayrollTierValue } = require('../src/payroll/payroll-tier-kernel')
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')

const response = fn => { try { fn(); return null } catch (error) { return typeof error.getResponse === 'function' ? error.getResponse() : { message: error.message } } }

test('overlapping tiers are rejected on save with both rows and the shared minute named; touching inclusive bounds count as overlap', () => {
  const overlap = response(() => tiers.validatePayrollLatenessTiers([
    { fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.25' }, { fromMinutes: 60, toMinutes: 120, mode: 'MULTIPLIER', value: '1.5' }]))
  assert.equal(overlap.code, 'LATE-TIERS-OVERLAP')
  assert.match(overlap.message, /الشريحة 1 \(1–60\)/); assert.match(overlap.message, /الشريحة 2 \(60–120\)/); assert.match(overlap.message, /الدقيقة 60/)
  assert.deepEqual(overlap.rows, [1, 2])
  // مدى مفتوح قبل شريحة أخرى يتداخل معها أيضًا، مهما كان ترتيب الإدخال
  const open = response(() => tiers.validatePayrollLatenessTiers([{ fromMinutes: 90, toMinutes: null, mode: 'FRACTION', value: '1' }, { fromMinutes: 1, toMinutes: null, mode: 'MINUTES', value: '0' }]))
  assert.equal(open.code, 'LATE-TIERS-OVERLAP')
  assert.equal(response(() => tiers.validatePayrollLatenessTiers([])).code, 'LATE-TIERS-REQUIRED')
  assert.equal(response(() => tiers.validatePayrollLatenessTiers([{ fromMinutes: 10, toMinutes: 5, mode: 'FRACTION', value: '0.25' }])).code, 'LATE-TIERS-BOUNDS-INVALID')
  assert.equal(response(() => tiers.validatePayrollLatenessTiers([{ fromMinutes: 1, toMinutes: 5, mode: 'MULTIPLIER', value: '0' }])).code, 'LATE-TIERS-VALUE-INVALID')
  assert.equal(response(() => tiers.validatePayrollLatenessTiers([{ fromMinutes: 1, toMinutes: 5, mode: 'MULTIPLIER', value: '1.2345' }])).code, 'LATE-TIERS-VALUE-INVALID')
  assert.equal(response(() => tiers.validatePayrollLatenessTiers([{ fromMinutes: 1, toMinutes: 5, mode: 'PERCENT', value: '1' }])).code, 'LATE-TIERS-MODE-INVALID')
  assert.equal(response(() => tiers.payrollLatenessTierPeriod('2026-13')).code, 'LATE-TIERS-PERIOD-INVALID')
})

test('valid set: sorted, normalized to 3 decimals, gaps reported as per-minute, hash stable and content-sensitive', () => {
  const result = tiers.validatePayrollLatenessTiers([{ fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: 1.5, label: '  ساعة  ' },
    { fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.25' }])
  assert.deepEqual(result.tiers, [{ sequence: 1, fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250', label: null },
    { sequence: 2, fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.500', label: 'ساعة' }])
  assert.deepEqual(result.gaps.map(gap => [gap.fromMinutes, gap.toMinutes]), [[121, null]])
  const hash = tiers.payrollLatenessTierSetHash('2026-10', result.tiers)
  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(tiers.payrollLatenessTierSetHash('2026-10', JSON.parse(JSON.stringify(result.tiers))), hash)
  assert.notEqual(tiers.payrollLatenessTierSetHash('2026-11', result.tiers), hash)
  assert.notEqual(tiers.payrollLatenessTierSetHash('2026-10', [result.tiers[0], { ...result.tiers[1], value: '1.250' }]), hash)
})

test('step 21 acceptance (pure): 61 minutes × 1.5 × minute rate with the tier effect trace; legacy fraction and no-match semantics kept', () => {
  const { tiers: set } = tiers.validatePayrollLatenessTiers([{ fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.25' },
    { fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.5' }, { fromMinutes: 200, toMinutes: null, mode: 'NONE', value: '0' }])
  const gross = 9000, dayRate = gross / 30, minuteRate = dayRate / 8 / 60 // 300 / 0.625
  const late61 = tiers.payrollLatenessTierDeduction(61, set, dayRate, minuteRate)
  assert.equal(late61.amount, 61 * 1.5 * 0.625)
  assert.equal(late61.trace.mode, 'MULTIPLIER'); assert.equal(late61.trace.value, '1.500'); assert.equal(late61.trace.sequence, 2)
  assert.deepEqual([late61.trace.fromMinutes, late61.trace.toMinutes, late61.trace.minutes], [61, 120, 61])
  assert.equal(late61.trace.formula, '61 دقيقة × 1.5 × سعر الدقيقة 0.625000')
  assert.equal(tiers.payrollLatenessTierDeduction(60, set, dayRate, minuteRate).amount, 75)
  const gap = tiers.payrollLatenessTierDeduction(150, set, dayRate, minuteRate)
  assert.deepEqual([gap.amount, gap.trace.mode, gap.trace.matched], [150 * 0.625, 'NO_MATCH_PER_MINUTE', false])
  assert.equal(tiers.payrollLatenessTierDeduction(240, set, dayRate, minuteRate).amount, 0)
  assert.deepEqual(tiers.payrollLatenessTierDeduction(0, set, dayRate, minuteRate), { amount: 0, trace: null })
})

test('SHADOW conversion: a multiplier and a no-deduction tier become a valid contiguous policy tier set with the same per-day amount', () => {
  const rules = { monthlyDays: 30, dailyHours: 8, lateEnabled: true, shortfallEnabled: true, shortfallMode: 'MINUTES', shortfallValue: 1, overlapPolicy: 'NET_OF_LATENESS',
    dailyCapDays: 1, earlyLeaveEnabled: true, absencePenalty: 1,
    latenessTiers: [{ fromMinutes: 1, toMinutes: 60, mode: 'FRACTION', value: '0.250' }, { fromMinutes: 61, toMinutes: 120, mode: 'MULTIPLIER', value: '1.500' },
      { fromMinutes: 200, toMinutes: null, mode: 'NONE', value: '0.000' }] }
  const converted = shadow.legacyLatenessTierSet(rules)
  assert.deepEqual(converted.map(tier => [tier.fromValue, tier.toValue, tier.method, tier.multiplier, tier.dayFraction]),
    [['0', '1', 'RATE_1_1', null, null], ['1', '61', 'DAY_FRACTION', null, '0.25'], ['61', '121', 'MULTIPLIER', '1.5', null], ['121', '200', 'RATE_1_1', null, null], ['200', null, 'NONE', null, null]])
  const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 8,
    rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
    carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
  const definition = validatePayrollPolicyDefinition(shadow.legacyEquivalentShadowDefinition(rules, { graceMinutes: 0, windowSupersedesGrace: true, shortfallToleranceMinutes: 0, flexEnabled: false }), settings).definition
  const set = definition.tierSets[0], dayRate = PayrollDecimal.from('300'), hourRate = dayRate.divide(PayrollDecimal.from('8')), minuteRate = hourRate.divide(PayrollDecimal.from('60'))
  const context = { dayRate, hourRate, minuteRate, variables: {}, components: {}, parameters: {}, roundingMode: 'HALF_UP', divisionByZeroMode: 'ZERO_WITH_WARNING' }
  for (const minutes of [30, 61, 120, 150, 250]) {
    const policy = evaluatePayrollTierValue(set, PayrollDecimal.from(String(minutes)), context).amount.format(6, 'HALF_UP')
    const legacy = tiers.payrollLatenessTierDeduction(minutes, tiers.validatePayrollLatenessTiers(rules.latenessTiers).tiers, 300, 0.625).amount.toFixed(6)
    assert.equal(policy, legacy, `${minutes} minutes`)
  }
})
