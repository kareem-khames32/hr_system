// الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر): من تاريخ إلى تاريخ وبسبب.
// ملف صرف بلا imports — يستورده الخادم والواجهة. الحالة «موقوف» مشتقة من التواريخ (بلا مهمة مجدولة):
// الموظف على رأس العمل ويومه داخل فترة إيقاف غير ملغاة = موقوف، وبعد آخر يوم يرجع لحالته المحفوظة تلقائيًا.
// أيام الإيقاف ليست غيابًا، وتُخصم من الراتب يومًا بيوم مثل الإجازة بدون راتب.

export type SuspensionStatus = 'ACTIVE' | 'ENDED_EARLY' | 'CANCELLED'
export type SuspensionState = 'UPCOMING' | 'CURRENT' | 'FINISHED' | 'CANCELLED'
export interface SuspensionPeriod {
  id?: number
  employeeId?: number
  fromDate: string
  toDate: string
  status: SuspensionStatus | string
}

export const SUSPENSION_REASON_MIN = 3
export const SUSPENSION_REASON_MAX = 500
export const SUSPENSION_MAX_DAYS = 366
export const SUSPENSION_LINE_CODE = 'SUSPENSION'
export const SUSPENSION_LINE_LABEL = 'أيام إيقاف عن العمل'
export const SUSPENSION_STATE_LABELS: Record<SuspensionState, string> = {
  UPCOMING: 'لم يبدأ بعد', CURRENT: 'ساري', FINISHED: 'انتهى', CANCELLED: 'ملغى',
}
// الحالات المحفوظة اللي الإيقاف يغطيها (المنتهية خدمته والمؤرشف يفضلوا بحالتهم)
export const SUSPENDABLE_STATUSES: readonly string[] = ['active', 'probation', 'notice_period']

export const dateOnly = (value: unknown): string => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10)
export const isValidDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${dateOnly(date)}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}
export function inclusiveDays(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${dateOnly(toDate)}T12:00:00Z`) - Date.parse(`${dateOnly(fromDate)}T12:00:00Z`)) / 86400000) + 1
}

export function suspensionCovers(period: SuspensionPeriod, date: string): boolean {
  return period.status !== 'CANCELLED' && dateOnly(period.fromDate) <= date && date <= dateOnly(period.toDate)
}

export function suspensionState(period: SuspensionPeriod, today: string): SuspensionState {
  if (period.status === 'CANCELLED') return 'CANCELLED'
  if (today < dateOnly(period.fromDate)) return 'UPCOMING'
  return today <= dateOnly(period.toDate) ? 'CURRENT' : 'FINISHED'
}

export function currentSuspension<T extends SuspensionPeriod>(periods: readonly T[], today: string): T | null {
  return periods.find(period => suspensionCovers(period, today)) ?? null
}

export function upcomingSuspension<T extends SuspensionPeriod>(periods: readonly T[], today: string): T | null {
  return [...periods].filter(period => suspensionState(period, today) === 'UPCOMING')
    .sort((a, b) => dateOnly(a.fromDate).localeCompare(dateOnly(b.fromDate)))[0] ?? null
}

/** الحالة المعروضة: «suspended» لموظف على رأس العمل يومه داخل فترة إيقاف، وإلا حالته المحفوظة. */
export function displayEmployeeStatus(storedStatus: string, periods: readonly SuspensionPeriod[], today: string): string {
  return SUSPENDABLE_STATUSES.includes(storedStatus) && currentSuspension(periods, today) ? 'suspended' : storedStatus
}

/** مشكلة إدخال الإيقاف أو null. */
export function suspensionInputIssue(input: { fromDate?: unknown; toDate?: unknown; reason?: unknown }): string | null {
  if (!isValidDate(input.fromDate)) return 'تاريخ بداية الإيقاف مطلوب وصحيح'
  if (!isValidDate(input.toDate)) return 'تاريخ نهاية الإيقاف مطلوب وصحيح'
  if (input.toDate < input.fromDate) return 'نهاية الإيقاف لازم تكون في نفس يوم البداية أو بعده'
  if (inclusiveDays(input.fromDate, input.toDate) > SUSPENSION_MAX_DAYS) return `مدة الإيقاف بحد أقصى ${SUSPENSION_MAX_DAYS} يوم`
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (reason.length < SUSPENSION_REASON_MIN) return `سبب الإيقاف مطلوب (${SUSPENSION_REASON_MIN} أحرف على الأقل)`
  if (reason.length > SUSPENSION_REASON_MAX) return `سبب الإيقاف بحد أقصى ${SUSPENSION_REASON_MAX} حرف`
  return null
}

export function overlappingSuspension<T extends SuspensionPeriod>(periods: readonly T[], fromDate: string, toDate: string): T | null {
  return periods.find(period => period.status !== 'CANCELLED' && dateOnly(period.fromDate) <= toDate && fromDate <= dateOnly(period.toDate)) ?? null
}

/**
 * إنهاء الإيقاف بدري: الموظف يرجع للعمل من returnDate.
 * الرجوع في يوم البداية أو قبله = إلغاء (مفيش ولا يوم إيقاف)، وإلا آخر يوم إيقاف = اليوم السابق للرجوع.
 * الإيقاف اللي انتهى (مثلًا اتسجل بأثر رجعي غلط) يتلغى أو تتقدّم نهايته بنفس الطريقة؛ حاجز المسير المعتمد في الخدمة.
 */
export function suspensionEndPlan(period: SuspensionPeriod, returnDate: unknown, today: string):
  { ok: true; status: 'ENDED_EARLY' | 'CANCELLED'; toDate: string } | { ok: false; message: string } {
  if (!isValidDate(returnDate)) return { ok: false, message: 'تاريخ الرجوع للعمل غير صحيح' }
  if (period.status === 'CANCELLED') return { ok: false, message: 'الإيقاف ده ملغى بالفعل' }
  const toDate = dateOnly(period.toDate)
  if (returnDate > toDate) {
    return { ok: false, message: suspensionState(period, today) === 'FINISHED'
      ? `الإيقاف ده انتهى بالفعل في ${toDate} — تقدر تلغيه أو تقدّم تاريخ الرجوع بس`
      : `تاريخ الرجوع بعد نهاية الإيقاف (${toDate}) — الإيقاف بينتهي لوحده في موعده` }
  }
  if (returnDate <= dateOnly(period.fromDate)) return { ok: true, status: 'CANCELLED', toDate }
  return { ok: true, status: 'ENDED_EARLY', toDate: addDays(returnDate, -1) }
}

/** الأيام اللي بيغيّرها الإنهاء أو الإلغاء: من يوم الرجوع (أو بداية الإيقاف لو اتلغى) لحد النهاية القديمة. */
export function suspensionFreedRange(period: SuspensionPeriod, plan: { status: 'ENDED_EARLY' | 'CANCELLED' }, returnDate: string) {
  return { from: plan.status === 'CANCELLED' ? dateOnly(period.fromDate) : returnDate, to: dateOnly(period.toDate) }
}

export interface LeaveLike { fromDate: string; toDate: string }
/** أول إجازة (معتمدة أو طلب قيد المعالجة) تتداخل مع فترة الإيقاف، أو null. */
export function overlappingLeave<T extends LeaveLike>(leaves: readonly T[], fromDate: string, toDate: string): T | null {
  return leaves.find(leave => isValidDate(dateOnly(leave.fromDate)) && isValidDate(dateOnly(leave.toDate))
    && dateOnly(leave.fromDate) <= toDate && fromDate <= dateOnly(leave.toDate)) ?? null
}
export const SUSPENSION_LEAVE_OVERLAP_MESSAGE = (leave: LeaveLike, pending: boolean) =>
  `للموظف ${pending ? 'طلب إجازة قيد المعالجة' : 'إجازة معتمدة'} من ${dateOnly(leave.fromDate)} إلى ${dateOnly(leave.toDate)} بتتداخل مع فترة الإيقاف — الغي الإجازة أو قصّرها الأول`
export const SUSPENSION_CLOSED_PAYROLL_MESSAGE =
  'أيام الإيقاف دي داخل مسير رواتب معتمد أو مصروف للموظف — مينفعش تسجيل الإيقاف أو تعديله أو إلغاؤه على فترة رواتب اتقفلت؛ التصحيح بيكون بتسوية مالية'

/** أيام الإيقاف داخل المدى (مرتبة، بلا تكرار). */
export function suspendedDatesInRange(periods: readonly SuspensionPeriod[], from: string, to: string): string[] {
  const dates = new Set<string>()
  for (const period of periods) {
    if (period.status === 'CANCELLED') continue
    const start = dateOnly(period.fromDate) > from ? dateOnly(period.fromDate) : from
    const end = dateOnly(period.toDate) < to ? dateOnly(period.toDate) : to
    for (let date = start, guard = 0; date <= end && guard <= 400; date = addDays(date, 1), guard++) dates.add(date)
  }
  return [...dates].sort()
}

/**
 * أيام الإيقاف المخصومة في فترة المسير: يوم كامل لكل يوم إيقاف، ناقص ما خُصم له بالفعل كإجازة بدون راتب
 * في نفس اليوم (فلا يُخصم اليوم مرتين).
 */
export function suspensionPayrollDays(
  periods: readonly SuspensionPeriod[], from: string, to: string,
  unpaidLeaves: ReadonlyArray<{ fromDate: string; toDate: string; period?: string | null }> = [],
  leaveDeductible: (date: string) => boolean = () => true,
) {
  const dates = suspendedDatesInRange(periods, from, to)
  let days = 0
  for (const date of dates) {
    let leaveFraction = 0
    if (leaveDeductible(date)) {
      for (const leave of unpaidLeaves) {
        if (dateOnly(leave.fromDate) <= date && date <= dateOnly(leave.toDate)) leaveFraction += (leave.period ?? 'FULL') === 'FULL' ? 1 : 0.5
      }
    }
    days += Math.max(0, 1 - Math.min(1, leaveFraction))
  }
  const ids = periods.filter(period => period.status !== 'CANCELLED' && period.id != null
    && dateOnly(period.fromDate) <= to && from <= dateOnly(period.toDate)).map(period => period.id as number)
  return { days: Math.round(days * 100) / 100, dates, ids }
}

export interface LeaveDeductionLineLike { code: string; label: string; days: number; payPercent: number | null; amount: number }

/**
 * يفصل سطر «إجازة بدون راتب» (اللي بيشمل أيام الإيقاف) لسطرين: الإجازة، و«أيام إيقاف عن العمل»،
 * بالتناسب مع الأيام وبالقروش؛ مجموع السطور = نفس المبلغ.
 */
export function withSuspensionLine<T extends LeaveDeductionLineLike>(lines: readonly T[], suspensionDays: number): Array<T | LeaveDeductionLineLike> {
  const index = lines.findIndex(line => line.code === 'UNPAID_LEAVE')
  if (index < 0 || !(suspensionDays > 0)) return [...lines]
  const line = lines[index]
  const totalDays = Number(line.days) || 0
  const totalCents = Math.round(Number(line.amount) * 100)
  const shareDays = Math.min(suspensionDays, totalDays)
  const suspensionCents = totalDays > 0 ? Math.round(totalCents * shareDays / totalDays) : totalCents
  const leaveDays = Math.round((totalDays - shareDays) * 100) / 100
  const leaveCents = totalCents - suspensionCents
  const split: Array<T | LeaveDeductionLineLike> = []
  if (leaveDays > 0 || leaveCents > 0) split.push({ ...line, days: leaveDays, amount: leaveCents / 100 })
  split.push({ code: SUSPENSION_LINE_CODE, label: SUSPENSION_LINE_LABEL, days: shareDays, payPercent: 0, amount: suspensionCents / 100 })
  return [...lines.slice(0, index), ...split, ...lines.slice(index + 1)]
}
