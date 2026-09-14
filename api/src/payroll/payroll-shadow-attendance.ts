import type { EntityManager } from 'typeorm'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PayrollDecimal } from './payroll-decimal'
import { executePayrollComponentsWithSources, PAYROLL_COMPONENT_EXECUTION_VERSION } from './payroll-component-execution'
import type { PayrollPolicySettings } from './payroll-policy-settings'
import { PAYROLL_LIVE_SOURCE_VERSION, type PayrollLiveSourceSection } from './payroll-live-source-contract'
import { readPayrollLiveSchedule } from './payroll-live-schedule-provider'
import { readPayrollLiveEmployment } from './payroll-live-employment-provider'
import { readPayrollLiveAttendance } from './payroll-live-attendance-provider'

/**
 * D13 / الخطوة 28 — وضع SHADOW لخصومات الحضور داخل المسير الفعلي:
 * المصروف هو الحساب القديم دائمًا؛ محرك السياسة (منفذ البنود + مصدر الشرائح + المعادلات) يُحسب بجانبه
 * من مزودات المصادر الحية (الجدول المؤرخ، الخدمة، البصمات الخام) بسياسة افتراضية تقلّد إعدادات المسير
 * القديم، ثم تقرير تكافؤ لكل موظف ولكل يوم. لا يكتب شيئًا ولا يغير أي مبلغ؛ نتيجته تُحفظ في تفصيل البند.
 * الوردية الليلية تُقرأ بنافذة يوم عملها (20:00 ← 01:00 كلها ليوم البداية) من مزود الحضور نفسه.
 */
export const PAYROLL_SHADOW_ATTENDANCE_VERSION = 'SHADOW_ATTENDANCE_V1_20260914' as const
export type PayrollShadowAttendanceStatus = 'MATCHED' | 'DIFFERENT' | 'PARTIAL' | 'UNAVAILABLE' | 'UNSUPPORTED_POLICY' | 'ERROR'
export type PayrollShadowComponent = 'lateness' | 'shortfall' | 'absence'

export interface PayrollShadowAttendanceRules {
  monthlyDays: number; dailyHours: number; lateEnabled: boolean; shortfallEnabled: boolean
  shortfallMode: string; shortfallValue: number; overlapPolicy: string; dailyCapDays: number
  earlyLeaveEnabled: boolean; absencePenalty: number
  latenessTiers: Array<{ id?: number; fromMinutes: number; toMinutes: number | null; mode: string; value: number | string; isActive?: boolean }>
  currency?: string
}
/** مبالغ المسير القديم المطلوبة قبل حماية الصافي (نفس ما يقارنه SHADOW). */
export interface PayrollShadowAttendanceLegacy {
  days: Array<{ date: string; lateness: number; shortfall: number }>
  absentDates: string[]; absenceDayAmount: number
  totals: { lateness: number; shortfall: number; absence: number }
}
export interface PayrollShadowAttendanceInput {
  employeeId: number; periodStart: string; periodEnd: string; monthlyComponents: number[]
  rules: PayrollShadowAttendanceRules; legacy: PayrollShadowAttendanceLegacy
}
export interface PayrollShadowAttendanceSources { schedule: PayrollLiveSourceSection; employment: PayrollLiveSourceSection; attendance: PayrollLiveSourceSection }

type Row = Record<string, any>
class ShadowPolicyUnsupported extends Error { constructor(readonly code: string, message: string) { super(message) } }
const COMPONENTS: Record<PayrollShadowComponent, string> = { lateness: 'LATENESS_DED', shortfall: 'SHORTFALL_DED', absence: 'ABSENCE_DED' }
const KEYS = Object.keys(COMPONENTS) as PayrollShadowComponent[]
const zero = () => PayrollDecimal.from('0')
const unique = (values: string[]) => [...new Set(values)].sort()
const six = (value: PayrollDecimal) => value.format(6, 'HALF_UP')
const two = (value: PayrollDecimal) => value.format(2, 'HALF_UP')
const fraction = (value: PayrollDecimal) => ({ numerator: String(value.numerator), denominator: String(value.denominator) })
// أرقام إعدادات المسير القديم (JS) تُحوّل إلى نص عشري مضبوط قبل دخول المحرك؛ لا أعداد ثنائية داخل الحساب.
function decimalText(value: number, scale: number, code: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ShadowPolicyUnsupported(code, 'قيمة إعداد غير صالحة لسياسة الظل')
  return PayrollDecimal.from(value.toFixed(scale)).canonical()
}
const legacyMoney = (value: number) => PayrollDecimal.from((Number.isFinite(value) ? value : 0).toFixed(6))
const MICRO = PayrollDecimal.from('0.000001')
const differs = (left: PayrollDecimal, right: PayrollDecimal) => { const delta = left.subtract(right); return (delta.compare(zero()) < 0 ? zero().subtract(delta) : delta).compare(MICRO) > 0 }

/** شرائح التأخير القديمة [من، إلى] شاملة وأول مطابقة تفوز ← طقم WHOLE متصل [من، إلى+1) وبلا مطابقة = بالدقيقة. */
export function legacyLatenessTierSet(rules: PayrollShadowAttendanceRules) {
  const active = rules.latenessTiers.filter(tier => tier.isActive !== false).map(tier => ({ id: tier.id ?? 0, from: Number(tier.fromMinutes),
    to: tier.toMinutes == null ? null : Number(tier.toMinutes), mode: tier.mode, value: Number(tier.value) }))
  if (active.some(tier => !Number.isSafeInteger(tier.from) || tier.from < 0 || (tier.to !== null && !Number.isSafeInteger(tier.to)) || !Number.isFinite(tier.value) || tier.value < 0)) {
    throw new ShadowPolicyUnsupported('SHADOW_LEGACY_TIER_INVALID', 'شريحة تأخير قديمة بحدود أو قيمة غير صالحة')
  }
  active.sort((left, right) => left.from - right.from || left.id - right.id)
  const tiers: Row[] = []
  const push = (from: number, to: number | null, method: string, label: string, extra: Row = {}) => tiers.push({ sequence: (tiers.length + 1) * 10,
    fromValue: String(from), toValue: to === null ? null : String(to), method, multiplier: null, dayFraction: null, fixedAmount: null, formula: null, label, isActive: true, ...extra })
  let cursor: number | null = 0
  for (const tier of active) {
    if (cursor === null) break
    const from: number = Math.max(tier.from, cursor), end = tier.to === null ? null : tier.to + 1
    if (end !== null && end <= from) continue
    if (from > cursor) push(cursor, from, 'RATE_1_1', 'بلا شريحة مطابقة: دقائق التأخير × سعر الدقيقة')
    if (tier.mode === 'FRACTION') {
      if (tier.value === 0) push(from, end, 'NONE', 'شريحة قديمة بقيمة صفر')
      else if (tier.value <= 1) push(from, end, 'DAY_FRACTION', `كسر يوم ${tier.value}`, { dayFraction: decimalText(tier.value, 4, 'SHADOW_LEGACY_TIER_INVALID') })
      else push(from, end, 'FORMULA', `${tier.value} يوم`, { formula: `DAY_RATE * ${decimalText(tier.value, 3, 'SHADOW_LEGACY_TIER_INVALID')}` })
    } else push(from, end, 'RATE_1_1', 'دقائق التأخير الفعلية × سعر الدقيقة')
    cursor = end
  }
  if (cursor !== null) push(cursor, null, 'RATE_1_1', 'بلا شريحة مطابقة: دقائق التأخير × سعر الدقيقة')
  return tiers
}

const component = (code: string, extra: Row): Row => ({ code, nameAr: code, componentType: 'DEDUCTION', stage: 3, sequence: 1, valueSource: 'FORMULA',
  conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: null, fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
  percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
  maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: 'HALF_UP', roundingScale: 6, deductionPriority: 1, carryOverEligible: false,
  rollupTo: null, exemptible: true, showOnPayslip: true, isActive: true, ...extra })

/** سياسة افتراضية تقلّد المسير القديم ليوم واحد (السماح وسماح النقص من لقطة اليوم المثبتة). منازل 6 لكل يوم ثم تقريب واحد للفترة (D4). */
export function legacyEquivalentShadowDefinition(rules: PayrollShadowAttendanceRules, day: { graceMinutes: number; windowSupersedesGrace: boolean; shortfallToleranceMinutes: number; flexEnabled: boolean }) {
  if (rules.monthlyDays !== 30) throw new ShadowPolicyUnsupported('SHADOW_MONTHLY_DAYS_UNSUPPORTED', 'محرك السياسة يعمل على أساس 30 يومًا فقط (D3)')
  if (!['NET_OF_LATENESS', 'CUMULATIVE'].includes(rules.overlapPolicy)) throw new ShadowPolicyUnsupported('SHADOW_OVERLAP_POLICY_UNSUPPORTED', 'سياسة تداخل التأخير والنقص غير مدعومة في سياسة الظل الافتراضية')
  if (!['MINUTES', 'MULTIPLIER', 'FRACTION'].includes(rules.shortfallMode)) throw new ShadowPolicyUnsupported('SHADOW_SHORTFALL_MODE_UNSUPPORTED', 'طريقة خصم النقص غير مدعومة')
  const grace = Number.isSafeInteger(day.graceMinutes) && day.graceMinutes > 0 ? day.graceMinutes : 0
  const shortfallApplies = rules.shortfallEnabled && !(day.flexEnabled === false && rules.earlyLeaveEnabled === false)
  const base = rules.overlapPolicy === 'NET_OF_LATENESS' ? 'MAX(0, SHORT_MINUTES - LATE_MINUTES)' : 'SHORT_MINUTES'
  const chargeable = `IF(${base} > PARAM[SHORT_GRACE], ${base}, 0)`
  const raw = rules.shortfallMode === 'FRACTION' ? `IF(${chargeable} > 0, PARAM[SHORT_VALUE] * DAY_RATE, 0)`
    : rules.shortfallMode === 'MULTIPLIER' ? `${chargeable} * MINUTE_RATE * PARAM[SHORT_VALUE]` : `${chargeable} * MINUTE_RATE`
  // سقف اليوم: التأخير أولًا (سقف الطقم) ثم النقص من المتبقي — نفس ترتيب attendanceDeductionDay
  const capFraction = rules.dailyCapDays < 10 ? decimalText(rules.dailyCapDays, 4, 'SHADOW_DAILY_CAP_INVALID') : null
  return {
    parameters: [
      { code: 'SHORT_GRACE', nameAr: 'سماح نقص ساعات اليوم', value: decimalText(day.shortfallToleranceMinutes, 0, 'SHADOW_SHORTFALL_GRACE_INVALID'), unit: 'MINUTES', isActive: true },
      { code: 'SHORT_VALUE', nameAr: 'قيمة خصم النقص', value: decimalText(rules.shortfallValue, 6, 'SHADOW_SHORTFALL_VALUE_INVALID'), unit: 'SCALAR', isActive: true },
      { code: 'SHORT_APPLIES', nameAr: 'خصم النقص منطبق على اليوم', value: shortfallApplies ? '1' : '0', unit: 'FLAG', isActive: true },
      { code: 'DAILY_CAP', nameAr: 'سقف خصم الحضور اليومي بالأيام', value: decimalText(rules.dailyCapDays, 6, 'SHADOW_DAILY_CAP_INVALID'), unit: 'DAYS', isActive: true },
      { code: 'ABSENCE_PENALTY', nameAr: 'معامل عقوبة الغياب', value: decimalText(rules.absencePenalty, 6, 'SHADOW_ABSENCE_PENALTY_INVALID'), unit: 'SCALAR', isActive: true },
    ],
    tierSets: [{ code: 'LEGACY_LATENESS', nameAr: 'شرائح التأخير الحالية', description: 'مشتقة من شرائح المسير القديم لحساب الظل', inputVar: 'LATE_MINUTES', inputFormula: null,
      inputUnit: 'MINUTES', applicationBasis: 'PER_DAY', tierApplicationMode: 'WHOLE', graceMode: grace > 0 ? 'WAIVE_ALL_OR_NOTHING' : 'NONE', graceMinutes: grace,
      graceMaxUsesPerPeriod: null, allowGraceOnFlexibleShift: grace > 0 && !day.windowSupersedesGrace, allowShiftGraceOverride: false, noMatchBehavior: 'FALLBACK_1_1',
      maxDailyDeductionDayFraction: capFraction, maxPeriodDeductionDayFraction: null, secondsRoundingMode: 'FLOOR', minutesRoundingMode: 'FLOOR', roundingUnitMinutes: 1,
      roundingMode: 'HALF_UP', roundingScale: 6, isActive: true, tiers: legacyLatenessTierSet(rules) }],
    components: [
      component(COMPONENTS.lateness, { nameAr: 'خصم التأخير', sequence: 1, valueSource: 'TIERED', tierSetCode: 'LEGACY_LATENESS', rollupTo: 'latenessDeduction', deductionPriority: 1 }),
      component(COMPONENTS.shortfall, { nameAr: 'خصم نقص ساعات العمل', sequence: 2, deductionPriority: 2, rollupTo: 'shortfallDeduction',
        formula: `IF(PARAM[SHORT_APPLIES] > 0, MIN(${raw}, MAX(0, DAY_RATE * PARAM[DAILY_CAP] - COMP[${COMPONENTS.lateness}])), 0)` }),
      component(COMPONENTS.absence, { nameAr: 'خصم الغياب بلا إذن', sequence: 3, deductionPriority: 3, rollupTo: 'absenceDeduction', formula: 'ABSENCE_DAYS * DAY_RATE * PARAM[ABSENCE_PENALTY]' }),
      component('NET', { nameAr: 'الصافي', componentType: 'INFO', stage: 6, valueSource: 'SYS_NET', roundingMode: null, roundingScale: null, deductionPriority: null, exemptible: false }),
    ],
  }
}

const reasons: Record<string, string> = {
  SOURCE_DAY_UNPROVEN: 'اليوم محسوب في المسير القديم لكن مصدره غير مثبت لمحرك السياسة',
  POLICY_VALUE_DIFFERENCE: 'قيمة محرك السياسة لليوم تختلف عن الحساب القديم',
  LEGACY_DAY_OUTSIDE_SOURCE: 'يوم محسوب في المسير القديم ليس يوم عمل مثبتًا داخل تغطية الخدمة لدى المصدر',
  PERIOD_TOTAL_ROUNDING: 'فرق تقريب في مجموع الفترة رغم تطابق كل الأيام',
}

/** حساب نقي على مخرجات المزودات؛ يرمي عند خطأ برمجي، وتبقى الإعدادات غير المدعومة نتيجة صريحة. */
export function computePayrollShadowAttendance(input: PayrollShadowAttendanceInput, sources: PayrollShadowAttendanceSources) {
  const header = { version: PAYROLL_SHADOW_ATTENDANCE_VERSION, engineMode: 'SHADOW' as const, paidResult: 'LEGACY' as const,
    scope: ['LATENESS', 'SHORTFALL', 'ABSENCE'], engine: { componentExecution: PAYROLL_COMPONENT_EXECUTION_VERSION, liveSource: PAYROLL_LIVE_SOURCE_VERSION,
      policy: 'LEGACY_EQUIVALENT_DEFAULT' }, period: { start: input.periodStart, end: input.periodEnd } }
  const codes = (section: PayrollLiveSourceSection) => unique((section.issues ?? []).map(issue => issue.code))
  const sourceView = { schedule: { state: sources.schedule.state, issueCodes: codes(sources.schedule) },
    employment: { state: sources.employment.state, issueCodes: codes(sources.employment), coverage: (sources.employment.data as Row | null)?.coverage ?? null },
    // لا بصمة محتوى هنا: وقت حساب صفوف الحضور يتجدد مع كل إعادة حساب فيُظهر فرقًا زائفًا في مقارنة البنود؛ الأدلة اليومية محفوظة في days
    attendance: { state: sources.attendance.state, issueCodes: codes(sources.attendance) } }
  const legacyTotals = { lateness: legacyMoney(input.legacy.totals.lateness), shortfall: legacyMoney(input.legacy.totals.shortfall), absence: legacyMoney(input.legacy.totals.absence) }
  const moneyView = (values: Record<PayrollShadowComponent, PayrollDecimal>, format = two) => ({ lateness: format(values.lateness), shortfall: format(values.shortfall),
    absence: format(values.absence), total: format(values.lateness.add(values.shortfall).add(values.absence)) })
  const days: Row[] = Array.isArray((sources.attendance.data as Row | null)?.days) ? (sources.attendance.data as Row).days : []
  if (!days.length) {
    return { ...header, status: 'UNAVAILABLE' as PayrollShadowAttendanceStatus, switchEligible: false, sources: sourceView,
      totals: { policy: null, legacy: moneyView(legacyTotals) }, provenWorkDays: 0, unprovenDays: [], days: [], differences: [],
      message: 'مصادر الحضور غير مثبتة لهذه الفترة؛ لم يُحسب محرك السياسة والمصروف هو الحساب القديم' }
  }
  const cents = input.monthlyComponents.map(value => Math.round(Number(value) * 100))
  if (cents.length !== MONTHLY_SALARY_COMPONENTS.length || cents.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('مكونات راتب شهر المسير غير صالحة لحساب الظل')
  const gross = new PayrollDecimal(BigInt(cents.reduce((sum, value) => sum + value, 0)), 100n), basic = new PayrollDecimal(BigInt(cents[0]), 100n)
  const dayRate = gross.divide(PayrollDecimal.from('30')), hourRate = dayRate.divide(PayrollDecimal.from(String(input.rules.dailyHours))), minuteRate = hourRate.divide(PayrollDecimal.from('60'))
  const settings: PayrollPolicySettings = { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30',
    monthlyDays: 30, dailyHours: input.rules.dailyHours, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING',
    maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: input.rules.lateEnabled,
    currency: (['SAR', 'EGP'].includes(input.rules.currency ?? '') ? input.rules.currency : 'SAR') as PayrollPolicySettings['currency'] }
  const salaryRef = `payroll-run-salary:employee:${input.employeeId}:period:${input.periodEnd.slice(0, 7)}`
  const legacyByDate = new Map(input.legacy.days.map(day => [day.date, day]))
  const legacyAbsent = new Set(input.legacy.absentDates)
  const legacyDay = (date: string): Record<PayrollShadowComponent, PayrollDecimal> => ({ lateness: legacyMoney(legacyByDate.get(date)?.lateness ?? 0),
    shortfall: legacyMoney(legacyByDate.get(date)?.shortfall ?? 0), absence: legacyMoney(legacyAbsent.has(date) ? input.legacy.absenceDayAmount : 0) })
  const hasValue = (values: Record<PayrollShadowComponent, PayrollDecimal>) => KEYS.some(key => !values[key].isZero())
  const policyTotals = { lateness: zero(), shortfall: zero(), absence: zero() }, legacyProven = { lateness: zero(), shortfall: zero(), absence: zero() }
  const rows: Row[] = [], differences: Row[] = [], unproven = new Map<string, string[]>(), seen = new Set<string>()
  let provenWorkDays = 0
  try {
    for (const day of days) {
      const date = day.date as string, proof = day.proof as Row | null, legacy = legacyDay(date)
      seen.add(date)
      if (proof?.excluded || proof?.attendanceNotRequired) {
        if (hasValue(legacy)) for (const key of KEYS) if (!legacy[key].isZero()) differences.push({ date, component: key, legacy: six(legacy[key]), policy: '0.000000', reasonCode: 'LEGACY_DAY_OUTSIDE_SOURCE', reason: reasons.LEGACY_DAY_OUTSIDE_SOURCE })
        continue
      }
      if (day.state !== 'AVAILABLE' || !proof?.tierDay || !proof.attendanceInputs) {
        const dayCodes = unique(((day.issues ?? []) as Row[]).map(issue => String(issue.code)))
        for (const code of dayCodes.length ? dayCodes : ['ATTENDANCE_DAY_UNPROVEN']) unproven.set(code, [...(unproven.get(code) ?? []), date])
        for (const key of KEYS) if (!legacy[key].isZero()) differences.push({ date, component: key, legacy: six(legacy[key]), policy: null, reasonCode: 'SOURCE_DAY_UNPROVEN', reason: reasons.SOURCE_DAY_UNPROVEN, sourceIssueCodes: dayCodes })
        continue
      }
      provenWorkDays++
      const inputs = proof.attendanceInputs as Row, absent = inputs.absent === true
      const definition = legacyEquivalentShadowDefinition(input.rules, { graceMinutes: inputs.graceMinutes, windowSupersedesGrace: inputs.windowSupersedesGrace !== false,
        shortfallToleranceMinutes: Number(inputs.shortfallToleranceMinutes ?? 0), flexEnabled: inputs.flexEnabled === true })
      const dayRef = typeof day.sourceRef === 'string' ? day.sourceRef : `attendance_day:${date}`
      const variables: Row = { BASE_SALARY: basic.format(2, 'HALF_UP'), GROSS_SALARY: gross.format(2, 'HALF_UP'), DAY_RATE: fraction(dayRate), HOUR_RATE: fraction(hourRate),
        MINUTE_RATE: fraction(minuteRate), LATE_MINUTES: String(absent ? 0 : Number(inputs.unexcusedLateMinutes ?? 0)),
        SHORT_MINUTES: String(absent ? 0 : Number(proof.shortfallMinutes ?? 0)), ABSENCE_DAYS: absent ? '1' : '0', IS_ATTENDANCE_EXEMPT: '0' }
      const metadata = Object.fromEntries(Object.keys(variables).map(key => [key, { sourceRef: ['BASE_SALARY', 'GROSS_SALARY', 'DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE'].includes(key) ? salaryRef : dayRef, alreadyProrated: false }]))
      const execution = executePayrollComponentsWithSources(definition, settings, {
        variables, employeeFields: Object.fromEntries(MONTHLY_SALARY_COMPONENTS.map(item => [item.key, null])), externalValues: {},
        sourceMetadata: { variables: metadata, employeeFields: {}, externalValues: {} },
        proration: { calendar30: { value: '1', sourceRef: salaryRef }, working: { value: null, sourceRef: salaryRef } }, exemptions: [],
      }, { tiers: { [COMPONENTS.lateness]: { expectedRevision: 1, periodStart: date, periodEnd: date, basicSalary: basic.format(2, 'HALF_UP'), grossSalary: gross.format(2, 'HALF_UP'),
        days: [{ ...proof.tierDay }], sourceRef: dayRef } }, ledger: null })
      const policy = Object.fromEntries(KEYS.map(key => {
        const line = execution.components.find(item => item.code === COMPONENTS[key])
        return [key, line?.amountExact ? new PayrollDecimal(BigInt(line.amountExact.numerator), BigInt(line.amountExact.denominator)) : zero()]
      })) as Record<PayrollShadowComponent, PayrollDecimal>
      for (const key of KEYS) { policyTotals[key] = policyTotals[key].add(policy[key]); legacyProven[key] = legacyProven[key].add(legacy[key]) }
      const dayDifferences = KEYS.filter(key => differs(policy[key], legacy[key]))
      for (const key of dayDifferences) differences.push({ date, component: key, legacy: six(legacy[key]), policy: six(policy[key]), reasonCode: 'POLICY_VALUE_DIFFERENCE', reason: reasons.POLICY_VALUE_DIFFERENCE })
      const window = proof.workdayWindow as Row | undefined
      if (hasValue(policy) || hasValue(legacy) || window?.overnight || dayDifferences.length) {
        rows.push({ date, sourceRef: day.sourceRef ?? null, basis: proof.basis, overnight: window?.overnight === true, workdayWindow: window ?? null,
          punchIds: Array.isArray(proof.punchIds) ? proof.punchIds : [], firstIn: proof.firstIn ?? null, lastOut: proof.lastOut ?? null,
          inputs: { absent, rawLateSeconds: proof.tierDay.rawLateSeconds, unexcusedLateMinutes: inputs.unexcusedLateMinutes ?? 0, lateMinutes: inputs.lateMinutes ?? 0,
            graceMinutes: inputs.graceMinutes ?? 0, shortfallMinutes: proof.shortfallMinutes ?? 0, shortfallToleranceMinutes: inputs.shortfallToleranceMinutes ?? 0 },
          policy: moneyView(policy, six), legacy: moneyView(legacy, six), matches: dayDifferences.length === 0 })
      }
    }
  } catch (error) {
    if (error instanceof ShadowPolicyUnsupported) {
      return { ...header, status: 'UNSUPPORTED_POLICY' as PayrollShadowAttendanceStatus, switchEligible: false, sources: sourceView,
        totals: { policy: null, legacy: moneyView(legacyTotals) }, provenWorkDays: 0, unprovenDays: [], days: [], differences: [],
        policyIssue: { code: error.code, message: error.message }, message: 'إعدادات المسير الحالية لا تقابلها سياسة ظل افتراضية؛ المصروف هو الحساب القديم' }
    }
    throw error
  }
  for (const date of new Set([...legacyByDate.keys(), ...legacyAbsent])) {
    if (seen.has(date)) continue
    const legacy = legacyDay(date)
    for (const key of KEYS) if (!legacy[key].isZero()) differences.push({ date, component: key, legacy: six(legacy[key]), policy: null, reasonCode: 'LEGACY_DAY_OUTSIDE_SOURCE', reason: reasons.LEGACY_DAY_OUTSIDE_SOURCE })
  }
  const complete = sources.attendance.state === 'AVAILABLE' && unproven.size === 0
  // مجموع الفترة: تقريب واحد لمجموع كسور الأيام (D4) مقابل مجموع المسير القديم المطلوب قبل حماية الصافي
  if (complete && !differences.length) {
    for (const key of KEYS) if (policyTotals[key].format(2, 'HALF_UP') !== legacyTotals[key].format(2, 'HALF_UP')) {
      differences.push({ date: null, component: key, legacy: two(legacyTotals[key]), policy: two(policyTotals[key]), reasonCode: 'PERIOD_TOTAL_ROUNDING', reason: reasons.PERIOD_TOTAL_ROUNDING })
    }
  }
  const status: PayrollShadowAttendanceStatus = !complete ? 'PARTIAL' : differences.length ? 'DIFFERENT' : 'MATCHED'
  return { ...header, status, switchEligible: status === 'MATCHED', sources: sourceView,
    totals: { policy: moneyView(policyTotals), legacy: moneyView(legacyTotals), legacyProvenDays: moneyView(legacyProven) },
    provenWorkDays, unprovenDays: [...unproven.entries()].map(([code, dates]) => ({ code, dates: unique(dates) })).sort((a, b) => a.code < b.code ? -1 : 1),
    days: rows, differences,
    message: status === 'MATCHED' ? 'محرك السياسة طابق الحساب القديم لكل يوم ولمجموع الفترة'
      : status === 'DIFFERENT' ? 'محرك السياسة يختلف عن الحساب القديم؛ لكل فرق سبب مسجل والمصروف هو القديم'
      : 'بعض أيام الفترة غير مثبتة المصدر؛ التكافؤ جزئي على الأيام المثبتة والمصروف هو القديم' }
}
export type PayrollShadowAttendanceResult = ReturnType<typeof computePayrollShadowAttendance> | ReturnType<typeof shadowError>

function shadowError(input: Pick<PayrollShadowAttendanceInput, 'periodStart' | 'periodEnd'>, error: unknown) {
  const body = error && typeof error === 'object' ? (error as Row) : {}
  const response = typeof body.getResponse === 'function' ? body.getResponse() : null
  return { version: PAYROLL_SHADOW_ATTENDANCE_VERSION, engineMode: 'SHADOW' as const, paidResult: 'LEGACY' as const, status: 'ERROR' as PayrollShadowAttendanceStatus,
    switchEligible: false, period: { start: input.periodStart, end: input.periodEnd },
    error: { code: String(response?.code ?? body.code ?? 'SHADOW_ATTENDANCE_FAILED'), message: String(response?.message ?? body.message ?? 'تعذر حساب محرك السياسة بجانب المسير').slice(0, 300) },
    message: 'تعذر حساب محرك السياسة لهذا الموظف؛ المصروف هو الحساب القديم ولم يتأثر' }
}

/**
 * يُستدعى داخل معاملة حساب المسير بعد تجسيد الحضور: قراءات فقط بنطاق الموظف، وأي فشل يُسجل نتيجة ERROR
 * دون إيقاف المسير القديم (الوضع SHADOW لا يملك قرار الصرف).
 */
export async function readPayrollShadowAttendance(em: EntityManager, input: PayrollShadowAttendanceInput) {
  try {
    const schedule = await readPayrollLiveSchedule(em, input.employeeId, input.periodStart, input.periodEnd)
    const employment = await readPayrollLiveEmployment(em, input.employeeId, input.periodStart, input.periodEnd)
    const attendance = await readPayrollLiveAttendance(em, input.employeeId, input.periodStart, input.periodEnd, schedule, employment.employment)
    const currency = (await em.query(`SELECT TOP (1) [value] FROM [requests_config] WHERE [key] = @0`, ['system.currency']))[0]?.value
    return computePayrollShadowAttendance({ ...input, rules: { ...input.rules, currency } }, { schedule, employment: employment.employment, attendance })
  } catch (error) {
    return shadowError(input, error)
  }
}
