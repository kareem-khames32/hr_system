import { createHash } from 'node:crypto'
import { PayrollPeriodError, payrollCycleSettingsIssue, payrollPolicyPeriodRanges, type PayrollCycleSettings } from './payroll-period'
import type { PayrollPolicySettings } from './payroll-policy-settings'

// مراجعة نشر نسخة السياسة (الخطوة 15): محاذاة السريان مع دورة المسير ومعاينة الفترات.
// قاعدة المالك: التغيير يسري على شهر مسير كامل؛ لا تبدأ نسخة ولا تنتهي في منتصف فترة.
// الفترات تُشتق من payroll-period.ts نفسه (الخطوة 14) حتى تطابق الفترات المعروضة والمجمدة عند النشر ما تستخدمه المسيرات.

export interface PayrollPolicyCyclePeriod { reference: string; startDate: string; endDate: string }
export interface PayrollPolicyPublishIssue { code: string; message: string; suggestion?: string; details?: unknown }
export interface PayrollPolicyCycleContinuityIssue { kind: 'GAP' | 'OVERLAP'; previousReference: string; nextReference: string; from: string; to: string }

type CycleSettings = Pick<PayrollPolicySettings, 'defaultPeriodType' | 'cycleStartDay' | 'cycleEndMode' | 'cycleEndDay'>

/** عدد الأشهر التي يُفحص فيها تجاور الفترات قبل النشر (يغطي فبراير كبيسًا وغير كبيس). */
export const PAYROLL_POLICY_CONTINUITY_MONTHS = 48
/** إصدار صيغة بصمة المحتوى المختومة عند النشر. */
export const PAYROLL_POLICY_SEAL_VERSION = 'POLICY_SEAL_V1_20260914'

const lastDay = (year: number, month: number) => [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
const iso = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay(year, month))).padStart(2, '0')}`
const shiftMonth = (year: number, month: number, delta: number): [number, number] => {
  const total = year * 12 + (month - 1) + delta
  return [Math.floor(total / 12), (total % 12) + 1]
}
const parts = (date: string): [number, number, number] => [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))]
const reference = (year: number, month: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`

export function payrollPolicyDayAfter(date: string): string {
  const [year, month, day] = parts(date)
  if (day < lastDay(year, month)) return iso(year, month, day + 1)
  const [ny, nm] = shiftMonth(year, month, 1)
  return iso(ny, nm, 1)
}

export function payrollPolicyDayBefore(date: string): string {
  const [year, month, day] = parts(date)
  if (day > 1) return iso(year, month, day - 1)
  const [py, pm] = shiftMonth(year, month, -1)
  return iso(py, pm, lastDay(py, pm))
}

/**
 * القراءة الحرفية لدورة غير صالحة (قص كل طرف على شهره) — لا تُستخدم لأي مسير؛ غرضها أن تُظهر مراجعة النشر
 * الفجوات والتداخلات الفعلية بتواريخها بدل رفض عام.
 */
function literalPeriods(settings: CycleSettings, ref: string): PayrollPolicyCyclePeriod[] {
  const year = Number(ref.slice(0, 4)), month = Number(ref.slice(5, 7))
  if (settings.defaultPeriodType === 'SEMI_MONTHLY') {
    return [{ reference: ref, startDate: iso(year, month, 1), endDate: iso(year, month, 15) }, { reference: ref, startDate: iso(year, month, 16), endDate: iso(year, month, 31) }]
  }
  if (settings.defaultPeriodType === 'CALENDAR_MONTH') return [{ reference: ref, startDate: iso(year, month, 1), endDate: iso(year, month, 31) }]
  const startDay = settings.cycleStartDay, endDay = settings.cycleEndMode === 'FIXED_DAY' ? settings.cycleEndDay : startDay - 1
  if (!Number.isInteger(startDay) || typeof endDay !== 'number' || !Number.isInteger(endDay) || startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) return []
  const [startYear, startMonth] = endDay <= startDay ? shiftMonth(year, month, -1) : [year, month]
  if (startYear < 1) return []
  return [{ reference: ref, startDate: iso(startYear, startMonth, startDay), endDate: iso(year, month, endDay) }]
}

/** فترات شهر مرجعي واحد (شهر النهاية)؛ نصف الشهر فترتان. الدورة الصالحة تُشتق من payroll-period.ts حرفيًا. */
export function payrollPolicyPeriodsForReference(settings: CycleSettings, ref: string): PayrollPolicyCyclePeriod[] {
  if (payrollCycleSettingsIssue(settings as PayrollCycleSettings)) return literalPeriods(settings, ref)
  try {
    return payrollPolicyPeriodRanges(ref, settings as PayrollCycleSettings).map(range => ({ reference: ref, ...range }))
  } catch (error) {
    // الشهر الأول في التقويم المدعوم لا فترة سابقة له؛ ما عدا ذلك خطأ حقيقي.
    if (error instanceof PayrollPeriodError && error.code === 'PAYROLL_PERIOD_INVALID') return []
    throw error
  }
}

function periodsAround(settings: CycleSettings, date: string, before: number, after: number) {
  const [year, month] = parts(date)
  const rows: PayrollPolicyCyclePeriod[] = []
  for (let delta = -before; delta <= after; delta++) {
    const [y, m] = shiftMonth(year, month, delta)
    if (y < 1 || y > 9999) continue
    rows.push(...payrollPolicyPeriodsForReference(settings, reference(y, m)))
  }
  return rows.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
}

/** أول count فترة تنتهي في تاريخ السريان أو بعده. */
export function payrollPolicyPeriods(settings: CycleSettings, fromDate: string, count: number): PayrollPolicyCyclePeriod[] {
  return periodsAround(settings, fromDate, 1, count + 2).filter(row => row.endDate >= fromDate).slice(0, count)
}

/** فحص تجاور الفترات المتتالية: كل بداية = نهاية الفترة السابقة + يوم، بلا فجوة ولا يوم مشترك. */
export function payrollPolicyCycleContinuityIssues(settings: CycleSettings, fromDate: string, months = PAYROLL_POLICY_CONTINUITY_MONTHS): PayrollPolicyCycleContinuityIssue[] {
  const rows = periodsAround(settings, fromDate, 0, months)
  const issues: PayrollPolicyCycleContinuityIssue[] = []
  for (let index = 1; index < rows.length; index++) {
    const previous = rows[index - 1], next = rows[index], expected = payrollPolicyDayAfter(previous.endDate)
    if (next.startDate > expected) {
      issues.push({ kind: 'GAP', previousReference: previous.reference, nextReference: next.reference, from: expected, to: payrollPolicyDayBefore(next.startDate) })
    } else if (next.startDate < expected) {
      issues.push({ kind: 'OVERLAP', previousReference: previous.reference, nextReference: next.reference, from: next.startDate, to: next.endDate < previous.endDate ? next.endDate : previous.endDate })
    }
  }
  return issues
}

export function describePayrollPolicyCycle(settings: CycleSettings): string {
  if (settings.defaultPeriodType === 'SEMI_MONTHLY') return 'نصف شهري: من 1 إلى 15 ومن 16 إلى آخر الشهر'
  if (settings.defaultPeriodType === 'CALENDAR_MONTH' || (settings.cycleStartDay === 1 && (settings.cycleEndMode === 'DERIVED' || settings.cycleEndDay === 31))) return 'شهر تقويمي: من أول الشهر إلى آخره'
  const endDay = settings.cycleEndMode === 'DERIVED' ? settings.cycleStartDay - 1 : settings.cycleEndDay
  if (endDay == null) return 'حدد يوم نهاية الدورة'
  return endDay <= settings.cycleStartDay
    ? `من يوم ${settings.cycleStartDay} إلى يوم ${endDay} من الشهر التالي`
    : `من يوم ${settings.cycleStartDay} إلى يوم ${endDay} من الشهر نفسه`
}

/** صلاحية الدورة وتجاور فتراتها ثم محاذاة السريان مع حدودها: البداية بداية فترة، والنهاية (إن وُجدت) نهاية فترة. */
export function reviewPayrollPolicyEffectiveRange(settings: CycleSettings, effectiveFrom: string, effectiveTo: string | null) {
  const issues: PayrollPolicyPublishIssue[] = [], warnings: PayrollPolicyPublishIssue[] = []
  const cycleIssue = payrollCycleSettingsIssue(settings as PayrollCycleSettings)
  if (cycleIssue) issues.push({ code: 'POLICY_CYCLE_INVALID', message: cycleIssue })
  const continuity = payrollPolicyCycleContinuityIssues(settings, effectiveFrom)
  if (continuity.length) {
    const first = continuity[0], gaps = continuity.filter(row => row.kind === 'GAP').length
    issues.push({ code: 'POLICY_CYCLE_NOT_CONTIGUOUS',
      message: `فترات هذه الدورة غير متصلة خلال ${PAYROLL_POLICY_CONTINUITY_MONTHS} شهرًا من بداية السريان: ${gaps} فجوة و${continuity.length - gaps} تداخل؛ ` +
        `أولها ${first.kind === 'GAP' ? 'أيام بلا مسير' : 'أيام محسوبة في مسيرين'} من ${first.from} إلى ${first.to} بين فترتي ${first.previousReference} و${first.nextReference}`,
      details: continuity.slice(0, 12) })
  }
  // المحاذاة على دورة مكسورة بلا معنى؛ تُعرض مشكلات الدورة وحدها حتى تُصحح.
  if (issues.length) return { issues, warnings }
  const starts = periodsAround(settings, effectiveFrom, 1, 2)
  if (!starts.some(row => row.startDate === effectiveFrom)) {
    const next = starts.find(row => row.startDate > effectiveFrom)
    issues.push({ code: 'POLICY_EFFECTIVE_FROM_NOT_CYCLE_START',
      message: `بداية السريان ${effectiveFrom} ليست بداية فترة مسير (${describePayrollPolicyCycle(settings)})؛ النسخة تسري على شهر مسير كامل`,
      ...(next ? { suggestion: next.startDate } : {}) })
  }
  if (effectiveTo !== null) {
    const ends = periodsAround(settings, effectiveTo, 1, 1)
    if (!ends.some(row => row.endDate === effectiveTo)) {
      const next = ends.find(row => row.endDate > effectiveTo)
      issues.push({ code: 'POLICY_EFFECTIVE_TO_NOT_CYCLE_END',
        message: `نهاية السريان ${effectiveTo} ليست نهاية فترة مسير؛ اتركها فارغة أو اختر آخر يوم في فترة`,
        ...(next ? { suggestion: next.endDate } : {}) })
    }
  }
  if (settings.defaultPeriodType === 'CUSTOM_DAY_RANGE' && settings.cycleStartDay > 28) {
    warnings.push({ code: 'POLICY_CYCLE_DAY_CLAMPED', message: 'يوم بداية الدورة بعد 28؛ في الأشهر القصيرة تنتهي الفترة في آخر الشهر وتبدأ التالية في اليوم الذي يليه، راجع معاينة الفترات قبل النشر' })
  }
  return { issues, warnings }
}

export interface PayrollPolicyVersionRange { id: number; status: string; effectiveFrom: string; effectiveTo: string | null }
export interface PayrollPolicyEffectiveEnd { effectiveUntil: string | null; supersededByVersionId: number | null }

/**
 * نهاية السريان الفعلية مشتقة ولا تُكتب على النسخة المنشورة: النسخة المنشورة التالية (أقرب بداية أحدث) توقف السابقة
 * في اليوم السابق لبدايتها. بهذا تبقى صفوف النسخ المنشورة مجمدة كما نُشرت ويظل ختم محتواها صحيحًا.
 */
export function payrollPolicyEffectiveEnds(versions: PayrollPolicyVersionRange[]): Map<number, PayrollPolicyEffectiveEnd> {
  const active = versions.filter(row => row.status === 'ACTIVE').sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id)
  const result = new Map<number, PayrollPolicyEffectiveEnd>()
  for (const version of versions) {
    const next = version.status === 'ACTIVE' ? active.find(other => other.effectiveFrom > version.effectiveFrom) : undefined
    if (next && (version.effectiveTo === null || version.effectiveTo >= next.effectiveFrom)) {
      result.set(version.id, { effectiveUntil: payrollPolicyDayBefore(next.effectiveFrom), supersededByVersionId: next.id })
    } else result.set(version.id, { effectiveUntil: version.effectiveTo, supersededByVersionId: null })
  }
  return result
}

/** بصمة SHA-256 لمحتوى نسخة بعد JSON قانوني (مفاتيح مرتبة)؛ نفس صيغة حدث PUBLISHED منذ الخطوة 15. */
export function payrollPolicyContentHash(content: Record<string, unknown>): string {
  const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
  return createHash('sha256').update(JSON.stringify(canonical(JSON.parse(JSON.stringify(content))))).digest('hex')
}
