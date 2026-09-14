import { createHash } from 'crypto'

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
  rawMinutes: number
  detectedMinutes: number
  policy: OvertimeEvidencePolicy
  flags: string[]
  blockers: OvertimeBlocker[]
  fingerprint: string
}

// العتبة قبل التقريب، والسقف اليومي ظاهر بعلامة بدل إخفاء الفرق بين الخام والمحتسب.
export function overtimeMinutes(raw: number, policy: OvertimeEvidencePolicy) {
  const rawMinutes = Math.max(0, Math.floor(raw + 1e-8))
  const rounded = raw < policy.thresholdMinutes ? 0
    : Math.floor(Math.max(0, raw) / policy.roundingMinutes) * policy.roundingMinutes
  const capped = policy.maxDailyMinutes > 0 && rounded > policy.maxDailyMinutes
  return { rawMinutes, detectedMinutes: capped ? policy.maxDailyMinutes : rounded, capped }
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
