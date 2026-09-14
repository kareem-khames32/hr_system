/** نحسب المدد هنا؛ سياسات الرواتب تتولى المبالغ ومنع ازدواج الخصم والسقوف بصورة مستقلة. */
export type FlexOverrideMode = 'INHERIT' | 'ENABLED' | 'DISABLED'
export type FlexOutcome = 'DISABLED' | 'BEFORE_START' | 'WITHIN_WINDOW' | 'AFTER_WINDOW' | 'MISSING_PUNCH' | 'NO_PUNCH' | 'INVALID_CONFIGURATION' | 'EXEMPT'
export interface AttendanceCoverageWindow {
  from: number
  to: number
  deductible: boolean
  deductRatio: number
  coverage: 'morning' | 'evening' | 'both'
}
export interface AttendanceFlexInput {
  startMinute: number
  endMinute: number
  checkInMinute: number | null // نحتفظ بكسور الدقيقة حتى لا تسقط الثواني عند حد نافذة الحضور.
  checkOutMinute: number | null
  flexEnabled: boolean
  flexWindowMinutes: number | null
  requiredWorkMinutes: number
  graceMinutes: number
  windowSupersedesGrace?: boolean
  countEarlyWorkTowardRequired?: boolean
  prorateFlexWindowOnPartialLeave?: boolean
  shortfallToleranceMinutes?: number
  unpaidBreakMinutes?: number
  maxSessionMinutes?: number
  actualWorkMinutes?: number | null
  actualCountedWorkMinutes?: number | null
  irregularTime?: boolean
  halfLeaveWindows?: Array<{ from: number; to: number }>
  permissions?: AttendanceCoverageWindow[]
}
export interface AttendanceFlexResult {
  flexOutcome: FlexOutcome
  effectiveStartMinute: number
  effectiveEndMinute: number
  windowEndMinute: number | null
  requiredWorkMinutes: number
  effectiveRequiredWorkMinutes: number
  expectedEndMinute: number | null
  rawWorkMinutes: number | null
  countedWorkMinutes: number | null
  rawLateMinutes: number
  unexcusedLateMinutes: number
  lateMinutes: number
  shortfallMinutes: number | null
  earlyArrivalMinutes: number | null
  excusedMinutes: number
  paidPermissionCoveredMinutes: number
  paidPermissionDeductibleMinutes: number
  paidPermissionShortfallCoveredMinutes: number
  attendanceReviewRequired: boolean
  attendanceReviewReason: string | null
}
export interface AttendanceRuleSnapshot extends AttendanceFlexResult {
  schemaVersion: 1
  date: string
  sourceType: 'SHIFT' | 'WORK_SCHEDULE' | null
  sourceId: number | null
  sourceVersionId: number | null
  sourceVersion: number | null
  sourceEffectiveFrom: string | null
  employeeVersionId: number | null
  employeeVersion: number | null
  employeeOverrideMode: FlexOverrideMode
  flexEnabled: boolean
  flexWindowMinutes: number | null
  countEarlyWorkTowardRequired: boolean
  prorateFlexWindowOnPartialLeave: boolean
  shortfallToleranceMinutes: number
  unpaidBreakMinutes: number
  maxSessionMinutes: number
  graceMinutes: number
  windowSupersedesGrace: boolean
  attendanceExempt: boolean
}

const whole = (value: number) => Math.max(0, Math.floor(value + 1e-8))
type Window = { from: number; to: number }
export function attendanceIntervalMinutes(from: number, to: number, windows: Window[]): number {
  if (to <= from) return 0
  const clips = windows.map(w => ({ from: Math.max(from, w.from), to: Math.min(to, w.to) }))
    .filter(w => w.to > w.from).sort((a, b) => a.from - b.from)
  let result = 0, end = from
  for (const w of clips) {
    result += Math.max(0, w.to - Math.max(w.from, end))
    end = Math.max(end, w.to)
  }
  return result
}

// عند تداخل نافذتين معتمدتين تتقدم التغطية المجانية، وتُحسب دقائق التغطية بخصم
// بأعلى نسبة مرة واحدة؛ فلا تُعفى الدقيقة نفسها ثم تُخصم مرة أخرى.
function coverageMinutes(ranges: Window[], windows: AttendanceCoverageWindow[]) {
  const marks = [...new Set([...ranges, ...windows].flatMap(w => [w.from, w.to]))].sort((a, b) => a - b)
  let free = 0, paid = 0, payable = 0
  for (let i = 1; i < marks.length; i++) {
    const from = marks[i - 1], to = marks[i], mid = (from + to) / 2
    if (!ranges.some(w => w.from <= mid && mid < w.to)) continue
    const covering = windows.filter(w => w.from <= mid && mid < w.to)
    if (covering.some(w => !w.deductible)) free += to - from
    else if (covering.length) {
      paid += to - from
      payable += (to - from) * Math.max(...covering.map(w => Math.max(0, Math.min(1, w.deductRatio))))
    }
  }
  return { free, paid, payable }
}

export function calculateAttendanceFlex(input: AttendanceFlexInput): AttendanceFlexResult {
  const { startMinute: start, endMinute: end, checkInMinute: checkIn, checkOutMinute: checkOut } = input
  const leaves = input.halfLeaveWindows ?? []
  const leaveMinutes = attendanceIntervalMinutes(start, end, leaves)
  // الإجازة الصباحية تحرك بداية الدوام والنافذة؛ أما المسائية فتقدم نهاية الدوام.
  let effectiveStart = start, effectiveEnd = end
  for (const w of [...leaves].sort((a, b) => a.from - b.from)) {
    if (w.from <= effectiveStart && w.to > effectiveStart) effectiveStart = Math.min(end, w.to)
  }
  for (const w of [...leaves].sort((a, b) => b.to - a.to)) {
    if (w.to >= effectiveEnd && w.from < effectiveEnd) effectiveEnd = Math.max(effectiveStart, w.from)
  }
  const required = Math.max(0, input.requiredWorkMinutes)
  const requiredAfterLeave = Math.max(0, required - leaveMinutes)
  const validWindow = input.flexWindowMinutes != null && Number.isSafeInteger(input.flexWindowMinutes) && input.flexWindowMinutes > 0 && input.flexWindowMinutes < required
  const windowLength = validWindow ? input.flexWindowMinutes! *
    (input.prorateFlexWindowOnPartialLeave && required > 0 ? requiredAfterLeave / required : 1) : null
  const windowEnd = input.flexEnabled && windowLength != null ? effectiveStart + windowLength : null
  const missing = (checkIn == null) !== (checkOut == null)
  const issues: string[] = []
  if (input.flexEnabled && !validWindow) issues.push('المرونة مفعلة دون مدة نافذة صالحة؛ اضبط تعريف الدوام قبل اعتماد الراتب')
  if (missing) issues.push('بصمة حضور أو انصراف مفقودة؛ نقص الساعات غير محسوم')
  if (input.irregularTime) issues.push('جلسة الحضور تعبر تغير التوقيت؛ راجع المدة الفعلية قبل الاعتماد')
  if (checkIn != null && checkOut != null && checkOut <= checkIn) issues.push('ترتيب بصمتي الحضور والانصراف غير صالح')
  const rawDuration = checkIn != null && checkOut != null
    ? Math.max(0, input.actualWorkMinutes ?? checkOut - checkIn) : null
  if (rawDuration != null && rawDuration > (input.maxSessionMinutes ?? 1440)) issues.push('مدة جلسة الحضور تتجاوز الحد المسموح وتحتاج مراجعة')
  const countedStart = checkIn == null ? null : input.countEarlyWorkTowardRequired ? checkIn : Math.max(checkIn, effectiveStart)
  const counted = countedStart != null && checkOut != null
    ? Math.max(0, (input.actualCountedWorkMinutes ?? checkOut - countedStart) - (input.unpaidBreakMinutes ?? 0)) : null
  const permissions = input.permissions ?? []
  const morning = permissions.filter(w => w.coverage !== 'evening')
  const evening = permissions.filter(w => w.coverage !== 'morning')
  const lateRange = checkIn != null && checkIn > effectiveStart ? [{ from: effectiveStart, to: checkIn }] : []
  const morningCoverage = coverageMinutes(lateRange, morning)
  const earlyRange = checkOut != null && checkOut < effectiveEnd ? [{ from: checkOut, to: effectiveEnd }] : []
  const eveningCoverage = coverageMinutes(earlyRange, evening)
  // إعفاء إذن داخل مدة احتُسبت عملًا يمحو نقصًا حقيقيًا في وقت آخر؛ لذلك نحتسب
  // فقط الغياب المعتمد الذي يقع خارج مدة العمل المحتسبة.
  const freeCredit = morningCoverage.free + eveningCoverage.free
  const effectiveRequired = Math.max(0, requiredAfterLeave - freeCredit)
  const rawLateFloat = checkIn == null ? 0 : Math.max(0, checkIn - effectiveStart)
  const afterWindow = input.flexEnabled && windowEnd != null && checkIn != null && checkIn > windowEnd
  const lateApplicable = !input.flexEnabled || afterWindow
  const rawLate = lateApplicable ? whole(rawLateFloat) : 0
  const unexcusedLate = lateApplicable ? whole(Math.max(0, rawLateFloat - morningCoverage.free - morningCoverage.paid)) : 0
  const rawShortfall = counted == null ? null : whole(Math.max(0, effectiveRequired - counted))
  const shortfall = rawShortfall
  const paidCovered = whole(morningCoverage.paid + eveningCoverage.paid)
  const paidShortfall = shortfall == null ? 0 : Math.min(shortfall, paidCovered)
  let outcome: FlexOutcome = !input.flexEnabled ? 'DISABLED' : !validWindow ? 'INVALID_CONFIGURATION'
    : checkIn == null && checkOut == null ? 'NO_PUNCH' : missing ? 'MISSING_PUNCH'
    : checkIn! < effectiveStart ? 'BEFORE_START' : afterWindow ? 'AFTER_WINDOW' : 'WITHIN_WINDOW'
  // اليوم ناقص البصمات قد يحمل تأخيرًا معلومًا؛ نحتفظ بدقائقه المستقلة،
  // وتُستخدم حالة اليوم لتنبيه المراجعة دون إلغاء هذه الدقائق.
  if (missing && outcome !== 'INVALID_CONFIGURATION') outcome = 'MISSING_PUNCH'
  return {
    flexOutcome: outcome, effectiveStartMinute: effectiveStart, effectiveEndMinute: effectiveEnd,
    windowEndMinute: windowEnd, requiredWorkMinutes: whole(required),
    effectiveRequiredWorkMinutes: whole(effectiveRequired),
    expectedEndMinute: countedStart == null ? null : countedStart + effectiveRequired + (input.unpaidBreakMinutes ?? 0),
    rawWorkMinutes: rawDuration == null ? null : whole(rawDuration),
    countedWorkMinutes: counted == null ? null : whole(counted), rawLateMinutes: rawLate,
    unexcusedLateMinutes: unexcusedLate,
    lateMinutes: unexcusedLate > (input.flexEnabled && (input.windowSupersedesGrace ?? true) ? 0 : input.graceMinutes) ? unexcusedLate : 0,
    shortfallMinutes: shortfall, earlyArrivalMinutes: checkIn == null ? null : whole(Math.max(0, effectiveStart - checkIn)),
    excusedMinutes: whole(leaveMinutes + freeCredit), paidPermissionCoveredMinutes: paidCovered,
    paidPermissionDeductibleMinutes: Math.round(morningCoverage.payable + eveningCoverage.payable),
    paidPermissionShortfallCoveredMinutes: paidShortfall,
    attendanceReviewRequired: issues.length > 0, attendanceReviewReason: issues.length ? issues.join('؛ ') : null,
  }
}
