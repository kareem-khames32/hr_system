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
  // التأخير قبل السماح: الدقائق المعفاة لا تعود كخصم نقص ساعات.
  // D7: الطرح لا يتم إلا إذا كان خصم التأخير مفعّلًا؛ وإلا تبقى دقائق لم تُشتغل بلا أي خصم.
  const overlapMinutes = policy.overlapPolicy === 'NET_OF_LATENESS' && policy.lateEnabled
    ? Math.min(shortageAfterPermission, unexcusedLateMinutes) : 0
  const shortfallBeforeGrace = Math.max(0, shortageAfterPermission - overlapMinutes)
  const shortfallGraceMinutes = positive(day.attendanceRuleSnapshot?.shortfallToleranceMinutes)
  const chargeableShortfallMinutes = shortfallApplies && shortfallBeforeGrace > shortfallGraceMinutes
    ? shortfallBeforeGrace : 0
  const shortfallBeforeOverlap = shortfallApplies && shortageAfterPermission > shortfallGraceMinutes
    ? (policy.shortfallMode === 'FRACTION' ? policy.shortfallValue * policy.dayRate
      : shortageAfterPermission * policy.minuteRate * (policy.shortfallMode === 'MULTIPLIER' ? policy.shortfallValue : 1)) : 0
  let shortfallAmount = chargeableShortfallMinutes > 0
    ? (policy.shortfallMode === 'FRACTION' ? policy.shortfallValue * policy.dayRate
      : chargeableShortfallMinutes * policy.minuteRate * (policy.shortfallMode === 'MULTIPLIER' ? policy.shortfallValue : 1)) : 0
  let latenessAmount = latenessBeforeOverlap
  if (policy.overlapPolicy === 'MAX_OF_BOTH') {
    if (latenessAmount >= shortfallAmount) shortfallAmount = 0
    else latenessAmount = 0
  }
  const latenessBeforeCap = latenessAmount, shortfallBeforeCap = shortfallAmount
  const dailyCapAmount = policy.dailyCapDays * policy.dayRate
  // أولوية السقف لعقوبة التأخير ثم النقص المتبقي؛ نحفظ توزيع المبلغ في اللقطة.
  latenessAmount = Math.min(latenessAmount, dailyCapAmount)
  shortfallAmount = Math.min(shortfallAmount, Math.max(0, dailyCapAmount - latenessAmount))
  // الإذن المدفوع صراحة مستقل عن تفعيل عقوبة التأخير.
  const permissionAmount = positive(day.deductibleMinutes) * policy.minuteRate
  return { date: day.date, rawShortfallMinutes, unexcusedLateMinutes, paidPermissionCoveredMinutes,
    overlapMinutes, shortfallGraceMinutes, chargeableShortfallMinutes,
    latenessBeforeOverlap, shortfallBeforeOverlap, latenessBeforeCap, shortfallBeforeCap,
    latenessAmount, shortfallAmount, permissionAmount, dailyCapAmount,
    cappedAmount: round2(latenessBeforeCap + shortfallBeforeCap - latenessAmount - shortfallAmount),
    totalAmount: round2(latenessAmount + shortfallAmount + permissionAmount) }
}
