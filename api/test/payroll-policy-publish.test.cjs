// الخطوة 15: قواعد محاذاة سريان نسخة السياسة مع دورة المسير ومعاينة الفترات (دوال نقية بلا قاعدة بيانات).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.resolve(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const publish = require('../src/payroll/payroll-policy-publish')

const cycle = (cycleStartDay, extra = {}) => ({ defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay, cycleEndMode: 'DERIVED', cycleEndDay: null, ...extra })
const month = { defaultPeriodType: 'CALENDAR_MONTH', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null }
const semi = { defaultPeriodType: 'SEMI_MONTHLY', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null }
const cycleOf = (cycleStartDay, cycleEndDay) => ({ defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay, cycleEndMode: 'FIXED_DAY', cycleEndDay })
const addMonths = (period, delta) => { const total = Number(period.slice(0, 4)) * 12 + Number(period.slice(5)) - 1 + delta; return `${Math.floor(total / 12)}-${String(total % 12 + 1).padStart(2, '0')}` }

test('Policy cycle 23: payroll month September = 23 August to 22 September and the next periods follow without gaps', () => {
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(cycle(23), '2026-09'), [{ reference: '2026-09', startDate: '2026-08-23', endDate: '2026-09-22' }])
  assert.deepEqual(publish.payrollPolicyPeriods(cycle(23), '2026-09-23', 3), [
    { reference: '2026-10', startDate: '2026-09-23', endDate: '2026-10-22' },
    { reference: '2026-11', startDate: '2026-10-23', endDate: '2026-11-22' },
    { reference: '2026-12', startDate: '2026-11-23', endDate: '2026-12-22' },
  ])
  assert.equal(publish.describePayrollPolicyCycle(cycle(23)), 'من يوم 23 إلى يوم 22 من الشهر التالي')
})

test('Policy cycles 23, 29, 30 and 31 are contiguous over 24 months (same derivation rule as step 14)', () => {
  for (const day of [23, 29, 30, 31]) {
    let previous = null
    for (let index = 0; index < 24; index++) {
      const [period] = publish.payrollPolicyPeriodsForReference(cycle(day), addMonths('2026-01', index))
      assert.ok(period.startDate <= period.endDate, JSON.stringify({ day, period }))
      if (previous) assert.equal(period.startDate, publish.payrollPolicyDayAfter(previous.endDate), JSON.stringify({ day, previous, period }))
      previous = period
    }
  }
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(cycle(31), '2026-02'), [{ reference: '2026-02', startDate: '2026-01-31', endDate: '2026-02-28' }])
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(cycle(31), '2026-03'), [{ reference: '2026-03', startDate: '2026-03-01', endDate: '2026-03-30' }])
})

test('Effective range must start at a cycle start and end at a cycle end, with a suggestion when it does not', () => {
  assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(cycle(23), '2026-09-23', null), { issues: [], warnings: [] })
  assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(cycle(23), '2026-09-23', '2026-12-22').issues, [])
  const misaligned = publish.reviewPayrollPolicyEffectiveRange(cycle(23), '2026-10-01', '2026-12-23')
  assert.deepEqual(misaligned.issues.map(issue => issue.code), ['POLICY_EFFECTIVE_FROM_NOT_CYCLE_START', 'POLICY_EFFECTIVE_TO_NOT_CYCLE_END'])
  assert.equal(misaligned.issues[0].suggestion, '2026-10-23')
  assert.equal(misaligned.issues[1].suggestion, '2027-01-22')
  assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(month, '2026-09-01', '2026-09-30').issues, [])
  assert.equal(publish.reviewPayrollPolicyEffectiveRange(month, '2026-09-02', null).issues[0].suggestion, '2026-10-01')
  assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(semi, '2026-09-16', '2026-09-30').issues, [])
  assert.equal(publish.reviewPayrollPolicyEffectiveRange(semi, '2026-09-10', null).issues[0].suggestion, '2026-09-16')
  assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(cycle(30), '2026-03-01', null).warnings.map(row => row.code), ['POLICY_CYCLE_DAY_CLAMPED'])
  const fixed = cycle(5, { cycleEndMode: 'FIXED_DAY', cycleEndDay: 4 })
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(fixed, '2026-09'), [{ reference: '2026-09', startDate: '2026-08-05', endDate: '2026-09-04' }])
})

// ===== إصلاحات المراجعة: الدورة بيوم نهاية ثابت، وتطابق الفترات مع payroll-period.ts، والإيقاف المشتق، والختم =====
const period = require('../src/payroll/payroll-period')
const settingsModule = require('../src/payroll/payroll-policy-settings')
const fullSettings = extra => ({ defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30',
  monthlyDays: 30, dailyHours: 8, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING',
  maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR', ...extra })

test('Reviewer probes: non-contiguous fixed end days are refused with their real overlaps and gaps (settings, publish review and runtime)', () => {
  const probes = [
    { start: 23, end: 23, kind: 'OVERLAP', first: { from: '2026-01-23', to: '2026-01-23', previousReference: '2026-01', nextReference: '2026-02' } },
    { start: 1, end: 15, kind: 'GAP', first: { from: '2026-01-16', to: '2026-01-31', previousReference: '2026-01', nextReference: '2026-02' } },
    { start: 23, end: 25, kind: 'GAP', first: { from: '2026-01-26', to: '2026-02-22', previousReference: '2026-01', nextReference: '2026-02' } },
  ]
  for (const probe of probes) {
    const cycle = cycleOf(probe.start, probe.end)
    const review = publish.reviewPayrollPolicyEffectiveRange(cycle, '2026-01-01', null)
    assert.deepEqual(review.issues.map(issue => issue.code), ['POLICY_CYCLE_INVALID', 'POLICY_CYCLE_NOT_CONTIGUOUS'], JSON.stringify(probe))
    const continuity = publish.payrollPolicyCycleContinuityIssues(cycle, '2026-01-01', 12)
    assert.ok(continuity.length >= 12, `${probe.start}→${probe.end}: ${continuity.length}`)
    assert.ok(continuity.every(row => row.kind === probe.kind))
    assert.deepEqual(continuity[0], { kind: probe.kind, ...probe.first })
    // الإعدادات نفسها ترفض قبل الحفظ، وقلب الفترات في وقت التشغيل يرفض الدورة بدل اختراع حدود.
    assert.throws(() => settingsModule.validatePayrollPolicySettings(fullSettings(cycle)), error => /cycleEndDay/.test(JSON.stringify(error.getResponse())))
    assert.throws(() => period.payrollPolicyPeriodBounds('2026-02', cycle), error => error.code === 'PAYROLL_CYCLE_INVALID')
  }
  assert.match(period.payrollCycleSettingsIssue(cycleOf(23, 23)), /اليوم 22/)
  assert.equal(period.payrollCycleSettingsIssue(cycleOf(23, null)).includes('22'), true)
})

test('Fixed end = start − 1 (and 31 for start 1) equals the derived cycle and payroll-period.ts for 48 months, including 29/30/31 without a shared day', () => {
  const addMonths48 = index => addMonths('2025-01', index)
  for (const start of [1, 2, 15, 23, 28, 29, 30, 31]) {
    const fixed = cycleOf(start, start === 1 ? 31 : start - 1), derived = cycle(start)
    assert.equal(period.payrollCycleSettingsIssue(fixed), null, `${start}`)
    assert.doesNotThrow(() => settingsModule.validatePayrollPolicySettings(fullSettings(fixed)))
    assert.deepEqual(publish.payrollPolicyCycleContinuityIssues(fixed, '2025-01-01'), [], `${start}`)
    assert.deepEqual(publish.reviewPayrollPolicyEffectiveRange(fixed, publish.payrollPolicyPeriodsForReference(fixed, '2025-02')[0].startDate, null).issues, [])
    for (let index = 0; index < 48; index++) {
      const ref = addMonths48(index)
      const runtime = period.payrollPeriodBounds(ref, start)
      assert.deepEqual(publish.payrollPolicyPeriodsForReference(fixed, ref), [{ reference: ref, ...runtime }], `fixed ${start} ${ref}`)
      assert.deepEqual(publish.payrollPolicyPeriodsForReference(derived, ref), [{ reference: ref, ...runtime }], `derived ${start} ${ref}`)
      assert.deepEqual(period.payrollPolicyPeriodBounds(ref, fixed), runtime)
    }
  }
  // مراجعة المراجع: 30→29 كان يعطي فبراير 28/2 ومارس 28/2 (يوم مشترك)؛ الآن مارس يبدأ 1/3.
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(cycleOf(30, 29), '2026-02'), [{ reference: '2026-02', startDate: '2026-01-30', endDate: '2026-02-28' }])
  assert.deepEqual(publish.payrollPolicyPeriodsForReference(cycleOf(30, 29), '2026-03'), [{ reference: '2026-03', startDate: '2026-03-01', endDate: '2026-03-29' }])
  assert.equal(publish.describePayrollPolicyCycle(cycleOf(1, 31)), 'شهر تقويمي: من أول الشهر إلى آخره')
  assert.equal(period.payrollPolicyPeriodOfDate('2026-03-01', cycleOf(30, 29)), '2026-03')
  assert.equal(period.payrollPolicyPeriodOfDate('2026-02-28', cycleOf(30, 29)), '2026-02')
  // نصف الشهر فترتان متجاورتان؛ واجهة الشهر الواحد ترفضه صراحة.
  assert.deepEqual(publish.payrollPolicyCycleContinuityIssues(semi, '2026-01-01'), [])
  assert.throws(() => period.payrollPolicyPeriodBounds('2026-02', semi), error => error.code === 'PAYROLL_CYCLE_INVALID')
})

test('Default config keeps the fixed end day tied to the start day; the legacy cycle day stays free under the derived end', () => {
  const current = new Map([['payroll.policy.default_period_type', 'CUSTOM_DAY_RANGE'], ['payroll.cycle_start_day', '23'], ['payroll.policy.cycle_end_mode', 'DERIVED'], ['payroll.policy.cycle_end_day', 'null']])
  assert.equal(settingsModule.payrollPolicyCycleConfigError('payroll.cycle_start_day', '25', current), undefined)
  assert.match(settingsModule.payrollPolicyCycleConfigError('payroll.policy.cycle_end_mode', 'FIXED_DAY', current), /cycle_end_mode/)
  const fixed = new Map([...current, ['payroll.policy.cycle_end_mode', 'FIXED_DAY'], ['payroll.policy.cycle_end_day', '22']])
  assert.equal(settingsModule.payrollPolicyCycleConfigError('payroll.policy.cycle_end_day', '22', fixed), undefined)
  assert.match(settingsModule.payrollPolicyCycleConfigError('payroll.cycle_start_day', '25', fixed), /اليوم 24/)
  assert.equal(settingsModule.payrollPolicyCycleConfigError('payroll.monthly_days', '30', fixed), undefined)
})

test('A later published version stops the earlier one on the day before its start without touching its row; content hash is canonical', () => {
  const ends = publish.payrollPolicyEffectiveEnds([
    { id: 1, status: 'ACTIVE', effectiveFrom: '2026-01-23', effectiveTo: null },
    { id: 2, status: 'ACTIVE', effectiveFrom: '2026-10-23', effectiveTo: null },
    { id: 3, status: 'ACTIVE', effectiveFrom: '2026-06-23', effectiveTo: '2026-08-22' },
    { id: 4, status: 'DRAFT', effectiveFrom: '2026-02-23', effectiveTo: null },
    { id: 5, status: 'ACTIVE', effectiveFrom: '2025-01-23', effectiveTo: '2025-06-22' },
  ])
  assert.deepEqual(Object.fromEntries(ends), {
    1: { effectiveUntil: '2026-06-22', supersededByVersionId: 3 }, 2: { effectiveUntil: null, supersededByVersionId: null },
    3: { effectiveUntil: '2026-08-22', supersededByVersionId: null }, 4: { effectiveUntil: null, supersededByVersionId: null },
    5: { effectiveUntil: '2025-06-22', supersededByVersionId: null },
  })
  const hash = publish.payrollPolicyContentHash({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })
  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(hash, publish.payrollPolicyContentHash({ a: { c: null, d: [2, { y: 2, z: 1 }] }, b: 1 }))
  assert.notEqual(hash, publish.payrollPolicyContentHash({ b: 1, a: { d: [{ z: 1, y: 2 }, 2], c: null } }))
})

test('Day helpers cross month and leap-year boundaries', () => {
  assert.equal(publish.payrollPolicyDayBefore('2028-03-01'), '2028-02-29')
  assert.equal(publish.payrollPolicyDayBefore('2027-01-01'), '2026-12-31')
  assert.equal(publish.payrollPolicyDayAfter('2026-02-28'), '2026-03-01')
  assert.equal(publish.payrollPolicyDayAfter('2026-12-31'), '2027-01-01')
})
