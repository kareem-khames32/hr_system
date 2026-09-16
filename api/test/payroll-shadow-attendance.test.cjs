// S28 / D13 — محرك السياسة في وضع SHADOW لخصومات الحضور: مخرجات مزود الحضور (بما فيها الوردية الليلية)
// تمر بمنفذ البنود الحقيقي بسياسة تقلّد المسير القديم، ثم تكافؤ يومي مع attendanceDeductionDay الحقيقية. بلا قاعدة بيانات.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
require('../node_modules/ts-node').register({ project: path.join(__dirname, '..', 'tsconfig.json'), transpileOnly: true })
const { verifyPayrollAttendanceEvidence: verify } = require('../src/payroll/payroll-live-attendance-provider')
const { calculateAttendanceFlex } = require('../src/attendance/attendance-flex-calculator')
const { attendanceDeductionDay } = require('../src/payroll/attendance-deductions')
const { roundPayrollMoney } = require('../src/payroll/payroll-money')
const { PayrollDecimal } = require('../src/payroll/payroll-decimal')
const { validatePayrollPolicyDefinition } = require('../src/payroll/payroll-policy-definition')
const { evaluatePayrollTierValue } = require('../src/payroll/payroll-tier-kernel')
const shadow = require('../src/payroll/payroll-shadow-attendance')

const D12 = '2026-06-12', D13 = '2026-06-13'
const policy = { countEarlyWorkTowardRequired: false, prorateWindowOnPartialLeave: false, windowSupersedesGrace: true,
  unpaidBreakMinutes: 0, shortfallGraceMinutes: 10, maxSessionMinutes: 900, missingCheckoutPolicy: 'MANUAL_ONLY' }
const nightTiming = { startTime: '20:00', endTime: '01:00', requiredWorkMinutes: 300, flexEnabled: false, flexWindowMinutes: 60 }
const nightSource = { sourceRef: 'attendance_rule_versions:21', sourceType: 'SHIFT', sourceId: 9, versionId: 21, version: 1,
  effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { ...nightTiming, graceMinutes: 5, flexPolicy: policy } } }
const nightEmployee = { sourceRef: 'attendance_rule_versions:12', sourceType: 'EMPLOYEE', sourceId: 3, versionId: 12, version: 1,
  effectiveFrom: '2026-01-01', legacyBaseline: false, state: 'AVAILABLE', snapshot: { state: 'AVAILABLE', value: { workScheduleId: null, flexOverrideMode: 'INHERIT' } } }
const nightPlan = day => ({ date: day, timingState: 'AVAILABLE', calendarState: 'AVAILABLE', scheduled: true, dayKind: 'WORKING', branchId: 2,
  sourceRefs: ['attendance_rule_versions:21', 'attendance_rule_versions:12'], sourceRule: nightSource, employeeRule: nightEmployee, timing: nightTiming, assignment: { kind: 'OVERRIDE' } })
const hhmm = v => `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
const punch = (id, stamp) => ({ id, employeeId: 3, punchTime: new Date(stamp), receivedAt: new Date(new Date(stamp).getTime() + 1000), source: 'DEVICE', createdByUserId: null, reason: null })
function nightRow(id, day, first, last, inMinute, outMinute, computedAt = '2026-06-14T12:00:00') {
  const values = calculateAttendanceFlex({ startMinute: 1200, endMinute: 1500, checkInMinute: inMinute, checkOutMinute: outMinute,
    flexEnabled: false, flexWindowMinutes: 60, requiredWorkMinutes: 300, graceMinutes: 5, ...policy, prorateFlexWindowOnPartialLeave: false,
    shortfallToleranceMinutes: 10, actualWorkMinutes: first && last ? (last - first) / 60000 : null })
  const snapshot = { schemaVersion: 1, date: day, ...values, sourceType: 'SHIFT', sourceId: 9, sourceVersionId: 21, sourceVersion: 1, sourceEffectiveFrom: '2026-01-01',
    employeeVersionId: 12, employeeVersion: 1, employeeOverrideMode: 'INHERIT', flexEnabled: false, flexWindowMinutes: 60, countEarlyWorkTowardRequired: false,
    prorateFlexWindowOnPartialLeave: false, windowSupersedesGrace: true, unpaidBreakMinutes: 0, maxSessionMinutes: 900, shortfallToleranceMinutes: 10,
    graceMinutes: 5, graceSource: 'SHIFT_OVERRIDE', attendanceExempt: false }
  const early = last ? Math.max(0, 1500 - outMinute) : 0, earlyLeaveMinutes = early > 5 ? early : 0
  return { id, employeeId: 3, branchId: 2, date: day, status: !first ? 'absent' : values.lateMinutes > 0 ? 'late' : earlyLeaveMinutes > 0 ? 'early_leave' : 'present',
    checkIn: first ? hhmm(first) : null, checkOut: last ? hhmm(last) : null, shiftStart: '20:00', shiftEnd: '01:00', shiftId: 9, scheduleSource: 'override', unscheduled: false,
    lateMinutes: values.lateMinutes, earlyLeaveMinutes, excusedMinutes: values.excusedMinutes, deductibleMinutes: values.paidPermissionDeductibleMinutes,
    workMinutes: values.rawWorkMinutes ?? 0, rawLateMinutes: values.rawLateMinutes, unexcusedLateMinutes: values.unexcusedLateMinutes, shortfallMinutes: values.shortfallMinutes,
    countedWorkMinutes: values.countedWorkMinutes, earlyArrivalMinutes: values.earlyArrivalMinutes, flexOutcome: values.flexOutcome, attendanceReviewRequired: false,
    attendanceReviewReason: null, leaveConflict: false, punchAnomalies: null, graceUsed: 5, attendanceRuleSnapshotRaw: JSON.stringify(snapshot), computedAt: new Date(computedAt) }
}
/** ليلة 12: دخول 20:10 وانصراف 00:30 صباح 13 (تأخير 10، نقص 40)؛ ليلة 13 كاملة 20:00 ← 01:00. */
function night({ absent12 = false, now = new Date('2026-06-15T12:00:00'), employmentState = 'AVAILABLE', computedAt } = {}) {
  const punches = [punch(101, `${D12}T20:10:00`), punch(102, `${D13}T00:30:00`), punch(103, `${D13}T20:00:00`), punch(104, '2026-06-14T01:00:00')]
  const n12 = absent12 ? nightRow(61, D12, null, null, null, null, computedAt) : nightRow(61, D12, punches[0].punchTime, punches[1].punchTime, 1210, 1470, computedAt)
  const n13 = nightRow(62, D13, punches[2].punchTime, punches[3].punchTime, 1200, 1500, computedAt)
  const schedule = { state: 'AVAILABLE', issues: [], sourceRefs: [], data: { periodStart: D12, periodEnd: D13, historicalCalendarComplete: true,
    days: [nightPlan(D12), nightPlan(D13)], ruleEvidence: [nightSource, nightEmployee] } }
  const employment = { state: employmentState, issues: employmentState === 'AVAILABLE' ? [] : [{ code: 'EMPLOYMENT_REHIRE_UNSUPPORTED', message: 'x' }], sourceRefs: ['employees:3'],
    data: employmentState === 'AVAILABLE' ? { coverage: { from: D12, to: D13, days: 2 } } : { coverage: null } }
  const rows = [n12, n13]
  const attendance = verify(3, D12, D13, schedule, employment, { days: rows, punches: (absent12 ? punches.slice(2) : punches).filter(p => p.punchTime <= now), leaves: [], corrections: [], requests: [], exemptions: [] }, now)
  return { rows, sources: { schedule, employment, attendance } }
}
const rules = (extra = {}) => ({ monthlyDays: 30, dailyHours: 8, lateEnabled: true, shortfallEnabled: true, shortfallMode: 'MINUTES', shortfallValue: 1,
  overlapPolicy: 'NET_OF_LATENESS', dailyCapDays: 1, earlyLeaveEnabled: true, absencePenalty: 1, latenessTiers: [], ...extra })
const monthly = [9000, 0, 0, 0, 0, 0]
/** المسير القديم كما في calculateDefined: attendanceDeductionDay + latenessForDay + معامل الغياب، قبل حماية الصافي. */
function legacy(rows, r, components = monthly) {
  const gross = components.reduce((a, b) => a + b, 0), dayRate = gross / r.monthlyDays, minuteRate = dayRate / r.dailyHours / 60
  const deductionPolicy = { schemaVersion: 1, lateEnabled: r.lateEnabled, shortfallEnabled: r.shortfallEnabled, shortfallMode: r.shortfallMode, shortfallValue: r.shortfallValue,
    overlapPolicy: r.overlapPolicy, dailyCapDays: r.dailyCapDays, dayRate, minuteRate, earlyLeaveEnabled: r.earlyLeaveEnabled }
  const tiers = [...r.latenessTiers].sort((a, b) => a.fromMinutes - b.fromMinutes)
  const tierFor = lateMin => {
    if (lateMin <= 0) return 0
    const tier = tiers.find(t => lateMin >= Number(t.fromMinutes) && (t.toMinutes == null || lateMin <= Number(t.toMinutes)))
    return !tier ? lateMin * minuteRate : tier.mode === 'FRACTION' ? Number(tier.value) * dayRate : lateMin * minuteRate
  }
  const days = rows.map(row => attendanceDeductionDay({ ...row, attendanceRuleSnapshot: JSON.parse(row.attendanceRuleSnapshotRaw) }, deductionPolicy, tierFor(row.lateMinutes)))
  const absent = rows.filter(row => row.status === 'absent')
  return { days: days.map(d => ({ date: d.date, lateness: d.latenessAmount + d.permissionAmount, shortfall: d.shortfallAmount })),
    absentDates: absent.map(row => row.date), absenceDayAmount: dayRate * r.absencePenalty,
    totals: { lateness: roundPayrollMoney(days.reduce((s, d) => s + d.latenessAmount + d.permissionAmount, 0)),
      shortfall: roundPayrollMoney(days.reduce((s, d) => s + d.shortfallAmount, 0)), absence: roundPayrollMoney(absent.length * dayRate * r.absencePenalty) } }
}
const compute = (fixture, r = rules(), legacyInput = legacy(fixture.rows, r)) =>
  shadow.computePayrollShadowAttendance({ employeeId: 3, periodStart: D12, periodEnd: D13, monthlyComponents: monthly, rules: r, legacy: legacyInput }, fixture.sources)

test('SHADOW: ليلة 12 (20:10 ← 00:30) تُحسب بمحرك السياسة ليوم البداية وتطابق المسير القديم يومًا ومجموعًا', () => {
  const fixture = night()
  assert.equal(fixture.sources.attendance.state, 'AVAILABLE', JSON.stringify(fixture.sources.attendance.issues))
  const result = compute(fixture)
  assert.equal(result.engineMode, 'SHADOW'); assert.equal(result.paidResult, 'LEGACY')
  assert.equal(result.engine.componentExecution, 'SRS_COMPONENT_EXECUTION_V1_20260913')
  assert.equal(result.status, 'MATCHED', JSON.stringify(result.differences)); assert.equal(result.switchEligible, true)
  assert.equal(result.provenWorkDays, 2)
  const [d12, d13] = result.days
  assert.equal(d12.date, D12); assert.equal(d12.overnight, true); assert.deepEqual(d12.punchIds, [101, 102])
  assert.equal(new Date(d12.lastOut).getTime(), new Date(`${D13}T00:30:00`).getTime(), 'انصراف صباح 13 داخل يوم 12')
  assert.equal(d12.inputs.rawLateSeconds, '600'); assert.equal(d12.inputs.shortfallMinutes, 40)
  // 9000/30 = 300 لليوم؛ 0.625 للدقيقة: تأخير 10 = 6.25؛ أ4: النقص 40 كاملًا (بلا طرح تداخل) > سماح 10 = 25.00
  assert.deepEqual(d12.policy, { lateness: '6.250000', shortfall: '25.000000', absence: '0.000000', total: '31.250000' })
  assert.deepEqual(d12.legacy, d12.policy); assert.equal(d12.matches, true)
  assert.equal(d13.date, D13); assert.equal(d13.overnight, true); assert.deepEqual(d13.punchIds, [103, 104])
  assert.deepEqual(d13.policy, { lateness: '0.000000', shortfall: '0.000000', absence: '0.000000', total: '0.000000' }, 'يوم 13 لا يرث شيئًا من ليلة 12')
  assert.deepEqual(result.totals.policy, { lateness: '6.25', shortfall: '25.00', absence: '0.00', total: '31.25' })
  assert.deepEqual(result.totals.legacy, result.totals.policy)
  assert.deepEqual(result.sources.attendance, { state: 'AVAILABLE', issueCodes: [] })
  assert.doesNotMatch(JSON.stringify(result), /computedAt/, 'نتيجة الظل ثابتة بين إعادات الحساب المتطابقة')
  assert.doesNotThrow(() => JSON.stringify(result))
})

test('SHADOW: السياسة الافتراضية تعريف صالح لمحرك السياسة، وشرائح التأخير القديمة تطابق نواة الشرائح لكل دقيقة 1..120', () => {
  const settings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30', monthlyDays: 30,
    dailyHours: 8, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null,
    minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR' }
  // شرائح متداخلة وبفجوات وقيمة > يوم: أول مطابقة تفوز، والفجوة بالدقيقة
  const r = rules({ latenessTiers: [{ id: 1, fromMinutes: 1, toMinutes: 15, mode: 'FRACTION', value: '0.250' }, { id: 2, fromMinutes: 10, toMinutes: 30, mode: 'FRACTION', value: '0.500' },
    { id: 3, fromMinutes: 45, toMinutes: 60, mode: 'FRACTION', value: '1.500' }, { id: 4, fromMinutes: 90, toMinutes: null, mode: 'MINUTES', value: '0' }] })
  const definition = validatePayrollPolicyDefinition(shadow.legacyEquivalentShadowDefinition(r, { graceMinutes: 0, windowSupersedesGrace: true, shortfallToleranceMinutes: 0, flexEnabled: false }), settings).definition
  assert.deepEqual(definition.tierSets[0].tiers.map(t => [t.fromValue, t.toValue, t.method]), [['0', '1', 'RATE_1_1'], ['1', '16', 'DAY_FRACTION'], ['16', '31', 'DAY_FRACTION'],
    ['31', '45', 'RATE_1_1'], ['45', '61', 'FORMULA'], ['61', '90', 'RATE_1_1'], ['90', null, 'RATE_1_1']])
  const dayRate = PayrollDecimal.from('9000').divide(PayrollDecimal.from('30')), hourRate = dayRate.divide(PayrollDecimal.from('8')), minuteRate = hourRate.divide(PayrollDecimal.from('60'))
  const tiers = [...r.latenessTiers].sort((a, b) => a.fromMinutes - b.fromMinutes)
  for (let minutes = 1; minutes <= 120; minutes++) {
    const tier = tiers.find(t => minutes >= t.fromMinutes && (t.toMinutes == null || minutes <= t.toMinutes))
    const expected = !tier ? minutes * 0.625 : tier.mode === 'FRACTION' ? Number(tier.value) * 300 : minutes * 0.625
    const actual = evaluatePayrollTierValue(definition.tierSets[0], PayrollDecimal.from(String(minutes)), { dayRate, hourRate, minuteRate,
      variables: {}, components: {}, parameters: {}, roundingMode: 'HALF_UP', divisionByZeroMode: 'ZERO_WITH_WARNING' }).amount
    assert.equal(actual.format(6, 'HALF_UP'), expected.toFixed(6), `${minutes} دقيقة`)
  }
})

test('SHADOW: شرائح كسر اليوم تطابق المسير القديم، وأ4 أسقطت السقف اليومي فيُخصم كسر اليوم كاملًا', () => {
  for (const latenessTiers of [[{ fromMinutes: 1, toMinutes: null, mode: 'FRACTION', value: '0.250' }], [{ fromMinutes: 1, toMinutes: null, mode: 'FRACTION', value: '1.500' }]]) {
    const r = rules({ latenessTiers }), result = compute(night(), r)
    assert.equal(result.status, 'MATCHED', JSON.stringify(result.differences))
    // أ4: لا سقف يوم واحد — 1.5 يوم تأخير تُخصم 450 كاملة، والنقص يبقى 25 مستقلًا عنها
    const expected = latenessTiers[0].value === '0.250' ? { lateness: '75.000000', shortfall: '25.000000' } : { lateness: '450.000000', shortfall: '25.000000' }
    assert.equal(result.days[0].policy.lateness, expected.lateness); assert.equal(result.days[0].policy.shortfall, expected.shortfall)
  }
  for (const extra of [{ shortfallMode: 'MULTIPLIER', shortfallValue: 1.5 }, { shortfallMode: 'FRACTION', shortfallValue: 0.5 }, { overlapPolicy: 'CUMULATIVE' },
    { lateEnabled: false }, { shortfallEnabled: false }, { earlyLeaveEnabled: false }, { dailyCapDays: 0.05 }]) {
    const result = compute(night(), rules(extra))
    assert.equal(result.status, 'MATCHED', `${JSON.stringify(extra)} ${JSON.stringify(result.differences)}`)
  }
})

test('SHADOW: غياب ليلة 12 بمعامل 1.5 يُحسب ليوم 12 وحده ويطابق', () => {
  const fixture = night({ absent12: true }), r = rules({ absencePenalty: 1.5 })
  assert.equal(fixture.sources.attendance.state, 'AVAILABLE', JSON.stringify(fixture.sources.attendance.issues))
  const result = compute(fixture, r)
  assert.equal(result.status, 'MATCHED', JSON.stringify(result.differences))
  assert.equal(result.days[0].inputs.absent, true); assert.equal(result.days[0].policy.absence, '450.000000')
  assert.equal(result.days[1].policy.total, '0.000000'); assert.equal(result.totals.policy.absence, '450.00')
})

test('SHADOW: أي فرق يومي يُسجل بسببه ولا يصبح المسير مؤهلًا للتحويل', () => {
  const fixture = night(), r = rules(), old = legacy(fixture.rows, r)
  old.days[0].lateness = 7; old.totals.lateness = 7
  const result = compute(fixture, r, old)
  assert.equal(result.status, 'DIFFERENT'); assert.equal(result.switchEligible, false)
  assert.deepEqual(result.differences.map(d => [d.date, d.component, d.legacy, d.policy, d.reasonCode]), [[D12, 'lateness', '7.000000', '6.250000', 'POLICY_VALUE_DIFFERENCE']])
  assert.ok(result.differences.every(d => d.reason && /[؀-ۿ]/.test(d.reason)))
})

test('SHADOW: ليلة لم تُقفل بعد تجعل التكافؤ جزئيًا بأكواد الأيام، ومصدر الخدمة غير المثبت لا يُحسب', () => {
  // صباح 13 بعد إقفال ليلة 12 (10:30) وقبل ليلة 13: بصماتها لم تحدث بعد
  const open = night({ now: new Date(`${D13}T12:00:00`), computedAt: `${D13}T11:00:00` })
  const partial = compute(open)
  assert.equal(partial.status, 'PARTIAL'); assert.equal(partial.switchEligible, false)
  assert.ok(partial.unprovenDays.some(u => u.code === 'ATTENDANCE_DAY_NOT_CLOSED' && u.dates.includes(D13)))
  assert.equal(partial.days.find(d => d.date === D12)?.policy.lateness, '6.250000', 'ليلة 12 المقفلة تبقى محسوبة ليوم البداية')
  const unavailable = compute(night({ employmentState: 'UNSUPPORTED' }))
  assert.equal(unavailable.status, 'UNAVAILABLE'); assert.equal(unavailable.totals.policy, null)
  // أ4 أسقطت ترتيب التداخل، فلم تعد سياسته تمنع الظل؛ الإعداد غير المدعوم الباقي هو طريقة خصم النقص
  const unsupported = compute(night(), rules({ shortfallMode: 'UNKNOWN_MODE' }))
  assert.equal(unsupported.status, 'UNSUPPORTED_POLICY'); assert.equal(unsupported.policyIssue.code, 'SHADOW_SHORTFALL_MODE_UNSUPPORTED')
})

test('SHADOW: فشل قراءة المصادر يُسجل ERROR ولا يرمي، فلا يوقف المسير القديم', async () => {
  const em = { queryRunner: { isTransactionActive: true }, query: async () => { throw new Error('connection lost') } }
  const result = await shadow.readPayrollShadowAttendance(em, { employeeId: 3, periodStart: D12, periodEnd: D13, monthlyComponents: monthly, rules: rules(), legacy: legacy(night().rows, rules()) })
  assert.equal(result.status, 'ERROR'); assert.equal(result.paidResult, 'LEGACY'); assert.equal(result.error.message, 'connection lost')
})

test('SHADOW: زمن الحساب اليومي مقبول لمسير كامل', t => {
  const fixture = night(), started = process.hrtime.bigint()
  for (let i = 0; i < 20; i++) compute(fixture)
  const perDayMs = Number(process.hrtime.bigint() - started) / 1e6 / 40
  t.diagnostic(`متوسط زمن حساب يوم عمل واحد بمحرك السياسة: ${perDayMs.toFixed(2)} ms`)
  assert.ok(perDayMs < 50, `${perDayMs} ms`)
})
