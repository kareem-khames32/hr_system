import { createHash } from 'crypto'
import { attendanceIntervalMinutes } from './attendance-flex-calculator'

export type OvertimeDayKind = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'
export interface OvertimeEvidencePolicy {
  thresholdMinutes: number
  roundingMinutes: number
  roundingDirection: 'DOWN'
  maxDailyMinutes: number
  maxWeeklyMinutes: number
  maxMonthlyMinutes: number
  backdateDays: number
  maxClosedPeriods: number
  multiplier: number
  earlyOvertime: boolean
  missingPunch: 'BLOCK'
  leaveConflict: 'BLOCK'
}
export interface OvertimeBlocker { code: string; message: string }
export interface OvertimeEvidence {
  schemaVersion: 1
  employeeId: number
  workDate: string
  evidenceMode: 'PUNCH' | 'EXEMPT_APPROVAL'
  exemptionId: number | null
  overtimeEligible: boolean
  schedule: {
    name: string; start: string; end: string
    sourceType: 'SHIFT' | 'WORK_SCHEDULE' | null
    sourceId: number | null; sourceVersionId: number | null; employeeVersionId: number | null
    flexEnabled: boolean; overtimeStartMinute: number | null
  }
  firstIn: string | null
  lastOut: string | null
  checkIn: string | null
  checkOut: string | null
  dayKind: OvertimeDayKind
  window: { open: boolean; governingWindowIds: number[]; reason: string }
  // يوم العمل: الشغل الفعلي (بعد الاستراحة غير المدفوعة ووقت الأذونات) والساعات المطلوبة (بعد نص يوم الإجازة).
  // العطلة: الشغل = مدة البصمتين كلها والمطلوب null. اللقطات القديمة من غير الحقلين.
  workedMinutes?: number | null
  requiredMinutes?: number | null
  rawMinutes: number
  detectedMinutes: number
  policy: OvertimeEvidencePolicy
  flags: string[]
  blockers: OvertimeBlocker[]
  fingerprint: string
}

// شرط الاستحقاق قبل التقريب: لو الزيادة وصلت العتبة بتتحسب كلها (مش اللي بعد العتبة بس)،
// ولو أقل منها = صفر. بعدها التقريب لتحت ثم السقف اليومي ظاهر بعلامة.
export function overtimeMinutes(raw: number, policy: Pick<OvertimeEvidencePolicy, 'thresholdMinutes' | 'roundingMinutes' | 'maxDailyMinutes'>) {
  const rawMinutes = Math.max(0, Math.floor(raw + 1e-8))
  const rounded = raw + 1e-8 < policy.thresholdMinutes ? 0
    : Math.floor(Math.max(0, raw) / policy.roundingMinutes) * policy.roundingMinutes
  const capped = policy.maxDailyMinutes > 0 && rounded > policy.maxDailyMinutes
  return { rawMinutes, detectedMinutes: capped ? policy.maxDailyMinutes : rounded, capped }
}

type MinuteWindow = { from: number; to: number }
export interface WorkedOvertimeInput {
  checkInMinute: number // دقيقة على خط يوم بدء الوردية بكسورها
  checkOutMinute: number
  sessionMinutes?: number // مدة البصمتين من اللحظات الفعلية لو متاحة
  requiredWorkMinutes: number
  shiftStartMinute: number
  shiftEndMinute: number
  unpaidBreakMinutes?: number
  halfLeaveWindows?: MinuteWindow[]
  permissionWindows?: MinuteWindow[]
}

// قاعدة المالك (17 سبتمبر): إضافي يوم العمل = الشغل الفعلي − ساعات اليوم المطلوبة، مش الوقت بعد نهاية الوردية.
// الشغل الفعلي = أول دخول ← آخر خروج، ناقص الاستراحة غير المدفوعة (زي محرك الحضور) وناقص وقت الأذونات
// المعتمدة اللي جوه المدة (وقت الإذن مش شغل). المطلوب = ساعات الوردية ناقص نص يوم الإجازة زي الحضور.
// الشغل بدري بيدخل لأنه جزء من الشغل الفعلي، والتأخير الصبح بيقل من نفس المدة.
export function workedOvertime(input: WorkedOvertimeInput) {
  const session = Math.max(0, input.sessionMinutes ?? input.checkOutMinute - input.checkInMinute)
  const permissionMinutes = attendanceIntervalMinutes(input.checkInMinute, input.checkInMinute + session, input.permissionWindows ?? [])
  const workedMinutes = Math.max(0, session - Math.max(0, input.unpaidBreakMinutes ?? 0) - permissionMinutes)
  const leaveMinutes = attendanceIntervalMinutes(input.shiftStartMinute, input.shiftEndMinute, input.halfLeaveWindows ?? [])
  const requiredMinutes = Math.max(0, Math.max(0, input.requiredWorkMinutes) - leaveMinutes)
  const extra = workedMinutes - requiredMinutes
  return { workedMinutes, requiredMinutes, extraMinutes: Math.max(0, extra),
    // الدقيقة اللي اكتملت فيها ساعات اليوم المطلوبة (على خط اليوم)، أو null لو ماكملتش
    completedAtMinute: extra + 1e-8 >= 0 ? input.checkInMinute + session - Math.max(0, extra) : null }
}

// الفترة المقفولة: الموظف يقدر يقدّم طلب إضافي ليوم بصماته لسه ناقصة أو زيادته أقل من الشرط،
// والحساب الحقيقي بيحصل وقت الاعتماد النهائي بنفس القاعدة.
export const OVERTIME_DEFERRED_SUBMISSION_BLOCKERS = ['NO_PUNCH_EVIDENCE', 'INCOMPLETE_PUNCH', 'BELOW_THRESHOLD', 'FUTURE_DATE']
// وقت الاعتماد: مفيش بصمات خالص أو الزيادة أقل من الشرط = إضافي صفر بيتسجل. البصمة الناقصة واليوم اللي لسه ماجاش بيمنعوا الاعتماد.
export const OVERTIME_ZERO_AT_APPROVAL_BLOCKERS = ['NO_PUNCH_EVIDENCE', 'BELOW_THRESHOLD']
export function overtimeSubmissionBlockers(evidence: Pick<OvertimeEvidence, 'window' | 'evidenceMode' | 'blockers'>, automatic = false) {
  const defer = !automatic && !evidence.window.open && evidence.evidenceMode === 'PUNCH'
  const deferred = defer ? evidence.blockers.filter(b => OVERTIME_DEFERRED_SUBMISSION_BLOCKERS.includes(b.code)) : []
  return { blockers: evidence.blockers.filter(b => !deferred.includes(b)), deferred }
}

export function overtimeEvidenceFingerprint(evidence: Omit<OvertimeEvidence, 'fingerprint'>): string {
  return createHash('sha256').update(JSON.stringify(evidence)).digest('hex')
}

interface PunchFrame {
  clock(date: Date): string
  onLine(time: string, anchor: 'start' | 'end'): string
}
interface PunchWindows { checkinFrom?: string; checkinTo?: string; checkoutFrom?: string; checkoutTo?: string }
const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }

// نفس تصنيف نوافذ الحضور، مع احترام اتجاه التصحيح؛ لا نكتب سجل حضور من المعاينة.
export function selectOvertimePunches(
  date: string, frame: PunchFrame, windows: PunchWindows | null,
  punches: Array<{ punchTime: Date }>, corrections: Array<{ correctedPunch: string }>
) {
  const clocks = [...new Set(punches.map(p => frame.clock(p.punchTime)))].sort()
  const corrIn: string[] = [], corrOut: string[] = []
  let malformedCorrection = false
  for (const correction of corrections) {
    try {
      const value = JSON.parse(correction.correctedPunch ?? '{}')
      for (const [key, target, anchor] of [['in', corrIn, 'start'], ['out', corrOut, 'end']] as const) {
        if (!value[key]) continue
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value[key]))) { malformedCorrection = true; continue }
        target.push(frame.onLine(value[key], anchor))
      }
    } catch { malformedCorrection = true }
  }
  corrIn.sort(); corrOut.sort()
  const inside = (time: string, from?: string, to?: string) => !!from && !!to && minutes(time) >= minutes(from) && minutes(time) <= minutes(to)
  let rawIn: string | null = clocks[0] ?? null, rawOut: string | null = clocks.length > 1 ? clocks[clocks.length - 1] : null
  if (windows?.checkinFrom && windows.checkinTo && windows.checkoutFrom && windows.checkoutTo && clocks.length) {
    const ins = clocks.filter(t => inside(t, windows.checkinFrom, windows.checkinTo))
    const outs = clocks.filter(t => inside(t, windows.checkoutFrom, windows.checkoutTo))
    if (minutes(windows.checkinFrom) < minutes(windows.checkoutFrom)) {
      rawIn = ins[0] ?? clocks.find(t => minutes(t) < minutes(windows.checkoutFrom!)) ?? null
      const after = rawIn ? clocks.filter(t => minutes(t) > minutes(rawIn!)) : clocks
      const candidates = outs.filter(t => after.includes(t))
      const fallback = after.filter(t => !ins.includes(t))
      rawOut = candidates.length ? candidates[candidates.length - 1] : fallback.length ? fallback[fallback.length - 1] : null
    } else {
      rawIn = ins[0] ?? null
      rawOut = outs.length ? outs[outs.length - 1] : null
    }
  }
  const checkIn = corrIn[0] ?? rawIn
  const checkOut = corrOut.length ? corrOut[corrOut.length - 1] : rawOut
  const instant = (time: string | null, anchor: 'start' | 'end', corrected: boolean) => {
    if (time == null) return null
    const matches = corrected ? [] : punches.filter(p => frame.clock(p.punchTime) === time)
    if (matches.length) return matches[anchor === 'start' ? 0 : matches.length - 1].punchTime
    const value = new Date(`${date}T00:00:00`)
    value.setMinutes(minutes(time))
    return value
  }
  return { checkIn, checkOut,
    checkInInstant: instant(checkIn, 'start', corrIn.length > 0),
    checkOutInstant: instant(checkOut, 'end', corrOut.length > 0),
    malformedCorrection, duplicatePunches: clocks.length < punches.length }
}
