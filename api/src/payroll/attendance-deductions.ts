import type { AttendanceRuleSnapshot } from '../attendance/attendance-flex-calculator'
import { roundPayrollMoney as round2 } from './payroll-money'

export interface AttendanceDeductionPolicy {
  schemaVersion: 1
  lateEnabled: boolean
  shortfallEnabled: boolean
  shortfallMode: 'MINUTES' | 'MULTIPLIER' | 'FRACTION'
  shortfallValue: number
  overlapPolicy: 'CUMULATIVE' | 'MAX_OF_BOTH' | 'NET_OF_LATENESS'
  dailyCapDays: number
  dayRate: number
  minuteRate: number
  // D1: خصم الخروج المبكر على الوردية الثابتة (نقصها بعد طرح التأخير) بسعر الدقيقة؛ غياب الحقل في اللقطات القديمة = مفعّل.
  earlyLeaveEnabled?: boolean
}

export interface AttendanceDeductionInput {
  date: string
  lateMinutes: number
  unexcusedLateMinutes?: number | null
  shortfallMinutes?: number | null
  deductibleMinutes?: number | null
  attendanceRuleSnapshot?: AttendanceRuleSnapshot | null
}

const positive = (value: number | null | undefined) => Math.max(0, Number(value ?? 0))

/** السياسة المالية تستهلك مقادير الحضور؛ نقص الساعات لا يدخل شرائح التأخير. */
export function attendanceDeductionDay(
  day: AttendanceDeductionInput, policy: AttendanceDeductionPolicy, tierLatenessAmount: number
) {
  const rawShortfallMinutes = positive(day.shortfallMinutes)
  const unexcusedLateMinutes = positive(day.unexcusedLateMinutes ?? day.lateMinutes)
  const paidPermissionCoveredMinutes = Math.min(rawShortfallMinutes,
    positive(day.attendanceRuleSnapshot?.paidPermissionShortfallCoveredMinutes))
  const shortageAfterPermission = Math.max(0, rawShortfallMinutes - paidPermissionCoveredMinutes)
  const latenessBeforeOverlap = policy.lateEnabled ? positive(tierLatenessAmount) : 0
  // D1: على الوردية الثابتة يمثل النقص بعد طرح التأخير الخروجَ المبكر؛ إطفاؤه لا يمس المرونة (يحكمها shortfallEnabled).
  const shortfallApplies = policy.shortfallEnabled && !(day.attendanceRuleSnapshot?.flexEnabled === false && policy.earlyLeaveEnabled === false)
  // أ4 (قرار المالك 16 سبتمبر): لا ترتيب تداخل بين التأخير والنقص ولا سقف يومي — كل خصم يُحتسب كما جاء.
  // المفاتيح overlapPolicy و dailyCapDays تبقى في لقطة المسير بلا أثر، والحقول أدناه تبقى بصفر حتى لا يتغير شكل اللقطات المخزنة.
  const overlapMinutes = 0
  const shortfallBeforeGrace = shortageAfterPermission
  const shortfallGraceMinutes = positive(day.attendanceRuleSnapshot?.shortfallToleranceMinutes)
  // أ6: السماحية عتبة لا خصم — نقص 11 دقيقة مع سماح 10 يُخصم كاملًا.
  const chargeableShortfallMinutes = shortfallApplies && shortfallBeforeGrace > shortfallGraceMinutes
    ? shortfallBeforeGrace : 0
  const shortfallBeforeOverlap = shortfallApplies && shortageAfterPermission > shortfallGraceMinutes
    ? (policy.shortfallMode === 'FRACTION' ? policy.shortfallValue * policy.dayRate
      : shortageAfterPermission * policy.minuteRate * (policy.shortfallMode === 'MULTIPLIER' ? policy.shortfallValue : 1)) : 0
  const shortfallAmount = chargeableShortfallMinutes > 0
    ? (policy.shortfallMode === 'FRACTION' ? policy.shortfallValue * policy.dayRate
      : chargeableShortfallMinutes * policy.minuteRate * (policy.shortfallMode === 'MULTIPLIER' ? policy.shortfallValue : 1)) : 0
  const latenessAmount = latenessBeforeOverlap
  const latenessBeforeCap = latenessAmount, shortfallBeforeCap = shortfallAmount
  // الإذن المدفوع صراحة مستقل عن تفعيل عقوبة التأخير.
  const permissionAmount = positive(day.deductibleMinutes) * policy.minuteRate
  return { date: day.date, rawShortfallMinutes, unexcusedLateMinutes, paidPermissionCoveredMinutes,
    overlapMinutes, shortfallGraceMinutes, chargeableShortfallMinutes,
    latenessBeforeOverlap, shortfallBeforeOverlap, latenessBeforeCap, shortfallBeforeCap,
    latenessAmount, shortfallAmount, permissionAmount, dailyCapAmount: 0,
    cappedAmount: 0,
    totalAmount: round2(latenessAmount + shortfallAmount + permissionAmount) }
}

/**
 * نسبة عمود التأخير المحفوظ بين «التأخير» و«إذن بخصم» بلا تغيير قرش واحد: المجموع = العمود دائمًا.
 * الإذن أولًا بمبلغه المطلوب (مقصوصًا على العمود) والباقي تأخير — زي «الانصراف المبكر» جوه عمود النقص:
 * البند المحدد باسمه يبقى، والبند العام يمتص ما أسقطته حماية الصافي.
 */
export function splitLatenessPermission(column: number, permissionRequested: number): { lateness: number; permission: number } {
  const columnCents = Math.round(round2(column) * 100)
  const requestedCents = Math.max(0, Math.round(round2(permissionRequested) * 100))
  const sign = columnCents < 0 ? -1 : 1
  const permissionCents = sign * Math.min(Math.abs(columnCents), requestedCents)
  return { lateness: (columnCents - permissionCents) / 100, permission: permissionCents / 100 }
}
