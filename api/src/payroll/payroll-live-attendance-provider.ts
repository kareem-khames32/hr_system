import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { calculateAttendanceFlex } from '../attendance/attendance-flex-calculator'
import { PAYROLL_LIVE_SOURCE_ROW_LIMIT, payrollLiveSourcePeriod, type PayrollLiveSourceIssue, type PayrollLiveSourceSection, type PayrollLiveSourceState } from './payroll-live-source-contract'
import type { PayrollTierPreviewDayDto } from './payroll-tier-preview.dto'
import { readPayrollLiveSchedule } from './payroll-live-schedule-provider'

type Row = Record<string, any>
export interface PayrollAttendanceEvidenceRows { days: Row[]; punches: Row[]; leaves: Row[]; corrections: Row[]; requests: Row[]; exemptions: Row[] }
/** يوما الجوار خارج الفترة (دليل جدول مؤرخ ليوم واحد): لحدود الوردية الليلية فقط، لا يدخلان المجاميع. */
export interface PayrollAttendanceNeighborDays { before?: Row | null; after?: Row | null }
// تاريخ محلي ±n يوم، ولحظة محلية = منتصف ليل التاريخ + دقائق (ما فوق 1440 = الغد) — نفس حساب محرك الحضور
const calendarDate = (d: string, n: number) => { const v = new Date(`${d}T12:00:00`); v.setDate(v.getDate() + n); return `${v.getFullYear().toString().padStart(4, '0')}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}` }
const atMinute = (d: string, m: number) => { const v = new Date(`${d}T00:00:00`); v.setMinutes(m); return v }
const id = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 2147483647
const dateValid = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !v.startsWith('0000-') && Number.isFinite(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v
const clockValid = (v: unknown): v is string => typeof v === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v)
const integer = (v: unknown, max = 2147483647): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
const instant = (v: unknown): v is Date => v instanceof Date && Number.isFinite(v.getTime())
const localDate = (v: Date) => `${v.getFullYear().toString().padStart(4, '0')}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
const clock = (v: Date) => `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
const minute = (v: string) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3, 5))
const unique = (v: string[]) => [...new Set(v)].sort()
const plain = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype
const rank = { AVAILABLE: 0, MISSING: 1, UNSUPPORTED: 2, INVALID: 3 }
function freeze<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v) }; return v }
function json(raw: unknown): Row | null {
  if (typeof raw !== 'string' || raw.length > 40000) return null
  try {
    let nodes = 0
    const valid = (v: unknown, depth = 0): boolean => {
      if (++nodes > 5000 || depth > 12) return false
      if (v === null || typeof v === 'string' || typeof v === 'boolean') return true
      if (typeof v === 'number') return Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v))
      return Array.isArray(v) ? v.every(x => valid(x, depth + 1)) : plain(v) && Object.entries(v).every(([k, x]) => !['__proto__', 'prototype', 'constructor'].includes(k) && valid(x, depth + 1))
    }
    const parsed = JSON.parse(raw)
    return plain(parsed) && valid(parsed) ? parsed : null
  } catch { return null }
}

/** إثبات الصف الموجود فقط: لا إنشاء غياب، ولا تحويل دقيقة مقربة إلى ثوانٍ خام. */
export function verifyPayrollAttendanceEvidence(employeeId: number, periodStart: string, periodEnd: string,
  schedule: PayrollLiveSourceSection, employment: PayrollLiveSourceSection, evidence: PayrollAttendanceEvidenceRows, now = new Date(),
  neighbors: PayrollAttendanceNeighborDays = {}): PayrollLiveSourceSection {
  if (!id(employeeId)) throw new BadRequestException({ code: 'LIVE_SOURCE_EMPLOYEE_INVALID', message: 'معرف موظف صحيح موجب مطلوب' })
  const period = payrollLiveSourcePeriod(periodStart, periodEnd), issues: PayrollLiveSourceIssue[] = [], refs: string[] = []
  const data: Row = { basis: 'VERIFIED_STORED_ATTENDANCE', periodStart, periodEnd, coverage: null, days: [], tierDays: null,
    totals: null, exemptionEvidence: [], readOnly: true, rawSecondsBasis: 'UNIQUE_MATCHING_RAW_PUNCH_TIMESTAMPS', timeBasis: 'SERVER_LOCAL_CALENDAR' }
  let state: PayrollLiveSourceState = 'AVAILABLE'
  const report = (next: PayrollLiveSourceState, code: string, message: string, sourceRef?: string) => {
    issues.push({ code, message, ...(sourceRef ? { sourceRef } : {}) }); if (rank[next] > rank[state]) state = next
  }
  const result = () => freeze({ state, data, issues, sourceRefs: unique(refs) })
  const coverage = (employment.data as Row)?.coverage
  try {
    const checked = payrollLiveSourcePeriod(coverage?.from, coverage?.to)
    if (employment.state !== 'AVAILABLE' || coverage.days !== checked.periodDays || coverage.from < periodStart || coverage.to > periodEnd) throw new Error()
    data.coverage = { from: coverage.from, to: coverage.to, days: coverage.days }
  } catch { report('UNSUPPORTED', 'ATTENDANCE_EMPLOYMENT_COVERAGE_UNPROVEN', 'تغطية خدمة الموظف غير مثبتة؛ لا تحول الأيام خارج الخدمة إلى حضور أو غياب'); return result() }
  if (!instant(now)) throw new Error('وقت قراءة الحضور غير صالح')
  const groups = Object.values(evidence)
  if (groups.some(v => !Array.isArray(v))) throw new Error('نتيجة قراءة أدلة الحضور غير صالحة')
  if (groups.some(v => v.length > PAYROLL_LIVE_SOURCE_ROW_LIMIT) || groups.reduce((sum, rows) => sum + rows.length, 0) > PAYROLL_LIVE_SOURCE_ROW_LIMIT) {
    report('UNSUPPORTED', 'ATTENDANCE_SOURCE_LIMIT', 'تجاوزت أدلة الحضور حد 5000 صف؛ القراءة المقطوعة لا تثبت اكتمال الفترة'); return result()
  }
  const byTable = [['attendance_days', evidence.days], ['attendance_punches', evidence.punches], ['leaves', evidence.leaves],
    ['attendance_corrections', evidence.corrections], ['requests', evidence.requests], ['attendance_exemptions', evidence.exemptions]] as const
  for (const [table, rows] of byTable) {
    const seen = new Set<number>()
    for (const row of rows) {
      if (!plain(row) || !id(row.id) || seen.has(row.id) || (table === 'requests' ? row.requesterId : row.employeeId) !== employeeId) {
        report('INVALID', 'ATTENDANCE_EVIDENCE_SCOPE_INVALID', 'مرجع حضور مكرر أو لا يخص الموظف؛ حجبت تفاصيله', table); return result()
      }
      seen.add(row.id)
    }
  }
  const jsonCharacters = [...evidence.days.map(r => r.attendanceRuleSnapshotRaw), ...evidence.requests.map(r => r.payloadRaw),
    ...evidence.corrections.flatMap(r => [r.correctedPunch, r.requestPayloadRaw])].reduce((sum, raw) => sum + (typeof raw === 'string' ? raw.length : 0), 0)
  if (jsonCharacters > 500000) { report('UNSUPPORTED', 'ATTENDANCE_EVIDENCE_JSON_LIMIT', 'حجم لقطات الحضور يتجاوز حد القراءة الآمنة؛ الأدلة غير مكتملة'); return result() }
  const scheduleData = schedule.data as Row
  const scheduleDays: Row[] = Array.isArray(scheduleData?.days) ? scheduleData.days : []
  if (scheduleData?.periodStart !== periodStart || scheduleData?.periodEnd !== periodEnd || scheduleDays.length !== period.periodDays ||
    scheduleDays.some(d => !dateValid(d.date) || d.date < periodStart || d.date > periodEnd) || new Set(scheduleDays.map(d => d.date)).size !== scheduleDays.length) {
    report('INVALID', 'ATTENDANCE_CALENDAR_RANGE_INVALID', 'دليل التقويم لا يغطي كل تاريخ من الفترة المطلوبة مرة واحدة'); return result()
  }
  const inService = (d: string) => d >= coverage.from && d <= coverage.to
  const affectedDates = new Set<string>(), dayIds = new Map<string, Row>()
  for (const row of evidence.days) {
    if (!dateValid(row.date) || row.date < periodStart || row.date > periodEnd || dayIds.has(row.date)) {
      report('INVALID', 'ATTENDANCE_DAY_DATE_INVALID', 'صف حضور مكرر التاريخ أو خارج الفترة'); return result()
    }
    dayIds.set(row.date, row)
  }
  // الطلبات المركبة تبقى أدلة مراجعة؛ كتالوج الأذونات الحالي لا يثبت نسب الماضي.
  const excuses: Array<{ from: string; to: string; sourceRef: string; code: string }> = []
  for (const row of evidence.requests) {
    const payload = json(row.payloadRaw)
    if (!payload || !['PERMISSION', 'BUSINESS_TRIP', 'REMOTE_WORK'].includes(row.typeCode) || !['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(row.status)) {
      report('INVALID', 'ATTENDANCE_REQUEST_EVIDENCE_INVALID', 'دليل طلب الحضور المعتمد تالف؛ لا يمكن تحديد الأيام المتأثرة', `requests:${row.id}`); return result()
    }
    const from = payload.fromDate ?? payload.date, to = payload.toDate ?? from
    if (!dateValid(from) || !dateValid(to) || to < from) { report('INVALID', 'ATTENDANCE_REQUEST_RANGE_INVALID', 'فترة طلب حضور معتمد غير صالحة', `requests:${row.id}`); return result() }
    excuses.push({ from, to, sourceRef: `requests:${row.id}`, code: row.typeCode === 'PERMISSION' ? 'ATTENDANCE_PERMISSION_HISTORY_UNPROVEN' : 'ATTENDANCE_DAY_EXCUSE_UNPROVEN' })
  }
  for (const row of evidence.leaves) {
    if (!dateValid(row.fromDate) || !dateValid(row.toDate) || row.toDate < row.fromDate || row.status !== 'APPROVED' || typeof row.isUnpaid !== 'boolean' || !['FULL', 'MORNING', 'EVENING'].includes(row.period)) {
      report('INVALID', 'ATTENDANCE_LEAVE_EVIDENCE_INVALID', 'سجل الإجازة المعتمدة غير صالح', `leaves:${row.id}`); return result()
    }
    excuses.push({ from: row.fromDate, to: row.toDate, sourceRef: `leaves:${row.id}`, code: row.period === 'FULL' ? 'ATTENDANCE_LEAVE_PROOF_UNSUPPORTED' : 'ATTENDANCE_PARTIAL_LEAVE_PROOF_UNSUPPORTED' })
  }
  // تصحيح اليوم السابق للفترة يُقرأ دليلًا على حد ليلته فقط (هل صُحّح دخوله؟) ولا يصبح قرارًا داخل الفترة.
  const beforeDate = calendarDate(periodStart, -1), afterDate = calendarDate(periodEnd, 1)
  for (const row of evidence.corrections) {
    if (row.date === beforeDate) continue
    if (!dateValid(row.date) || row.date < periodStart || row.date > periodEnd) { report('INVALID', 'ATTENDANCE_CORRECTION_DATE_INVALID', 'تاريخ تصحيح الحضور غير صالح'); return result() }
    const value = json(row.correctedPunch), request = json(row.requestPayloadRaw)
    const matches = value && Object.keys(value).every(k => ['in', 'out'].includes(k)) && (value.in != null || value.out != null) &&
      ['in', 'out'].every(k => value[k] == null || clockValid(value[k])) && id(row.requestId) && row.requestEmployeeId === employeeId && row.requestStatus === 'COMPLETED' && request?.date === row.date
    excuses.push({ from: row.date, to: row.date, sourceRef: `attendance_corrections:${row.id}`, code: matches ? 'ATTENDANCE_CORRECTION_INPUT_PROOF_UNSUPPORTED' : 'ATTENDANCE_CORRECTION_APPROVAL_UNPROVEN' })
  }
  for (const row of evidence.exemptions) {
    if (!dateValid(row.effectiveFrom) || (row.effectiveTo != null && (!dateValid(row.effectiveTo) || row.effectiveTo < row.effectiveFrom)) ||
      (row.terminatedFrom != null && !dateValid(row.terminatedFrom)) || row.status !== 'APPROVED' ||
      ['unpaidLeaveDeductibleOverride', 'overtimeEligibleOverride'].some(k => row[k] != null && typeof row[k] !== 'boolean')) {
      report('INVALID', 'ATTENDANCE_EXEMPTION_EVIDENCE_INVALID', 'فترة الاستثناء المعتمدة غير صالحة', `attendance_exemptions:${row.id}`); return result()
    }
    const sourceRef = `attendance_exemptions:${row.id}`
    data.exemptionEvidence.push({ id: row.id, effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo, terminatedFrom: row.terminatedFrom,
      approvedByUserId: id(row.approvedByUserId) ? row.approvedByUserId : null, approvalRecorded: instant(row.approvedAt),
      unpaidLeaveDeductibleOverride: row.unpaidLeaveDeductibleOverride, overtimeEligibleOverride: row.overtimeEligibleOverride, sourceRef })
    for (const day of scheduleDays) if (day.date >= row.effectiveFrom && (row.effectiveTo == null || day.date <= row.effectiveTo) && (row.terminatedFrom == null || day.date < row.terminatedFrom)) {
      if (affectedDates.has(day.date)) report('INVALID', 'ATTENDANCE_EXEMPTION_OVERLAP', 'يوجد أكثر من استثناء معتمد في اليوم نفسه', sourceRef)
      affectedDates.add(day.date); excuses.push({ from: day.date, to: day.date, sourceRef, code: 'ATTENDANCE_EXEMPTION_PROOF_UNSUPPORTED' })
    }
  }
  const punches = evidence.punches.map(row => {
    if (!instant(row.punchTime) || !instant(row.receivedAt) || row.receivedAt > now || row.punchTime > now || !['DEVICE', 'MANUAL'].includes(row.source) ||
      (row.source === 'MANUAL' && (!id(row.createdByUserId) || typeof row.reason !== 'string' || !row.reason.trim()))) {
      report('INVALID', 'ATTENDANCE_PUNCH_EVIDENCE_INVALID', 'البصمة الخام أو مصدرها أو وقت استقبالها غير صالح', `attendance_punches:${row.id}`)
    }
    return row
  })
  if ((state as PayrollLiveSourceState) === 'INVALID') return result()
  // ===== الوردية الليلية تُنسب كلها ليوم بدايتها (قاعدة المالك: 20:00 ← 01:00 ليوم 12 لا 13) =====
  // نفس حدود محرك الحضور (workdayFrame/nightClaimUntil): ليلة اليوم تمتد لصباح الغد حتى منتصف الفجوة
  // بين نهايتها وبداية وردية الغد (بلا وردية غدًا = بداية الليلة نفسها)، وصباح اليوم يتبع ليلة الأمس حتى
  // حدها. الجار خارج الفترة من دليل جدول مؤرخ؛ غيابه = «بلا وردية» كالمحرك، وأي اختلاف عن اختيار
  // المحرك يظهر عدم تطابق بصمات فيُحجب اليوم ولا يُفسَّر خطأً.
  const planByDate = new Map<string, Row>(scheduleDays.map(d => [d.date as string, d]))
  // توقيت الجار لا يُستخدم إلا مثبتًا (تقويم مؤرخ + يوم غير عامل أو دوام بنسخة مؤرخة)؛ غير المثبت = «بلا وردية»
  // كالمحرك، فلا يحرك توقيتٌ غير مثبت حد النافذة. أي اختلاف فعلي يظهر عدم تطابق بصمات فيُحجب اليوم.
  const neighborProven = (d: Row) => d.calendarState === 'AVAILABLE' && (d.scheduled === false || (d.scheduled === true && d.timingState === 'AVAILABLE'))
  const neighborEvidence: Row = { before: 'NOT_READ', after: 'NOT_READ' }
  for (const [side, date] of [['before', beforeDate], ['after', afterDate]] as const) {
    const plan = neighbors[side]
    if (!plain(plan) || plan.date !== date) continue
    if (neighborProven(plan)) { planByDate.set(date, plan); neighborEvidence[side] = 'PROVEN' }
    else neighborEvidence[side] = 'UNPROVEN_TREATED_AS_NO_SHIFT'
  }
  const timingOf = (d: string) => {
    const t = planByDate.get(d)?.timing
    return plain(t) && clockValid(t.startTime) && clockValid(t.endTime) && t.startTime !== t.endTime ? { start: minute(t.startTime), end: minute(t.endTime) } : null
  }
  const punchMs = punches.map(p => (p.punchTime as Date).getTime())
  const claims = new Map<string, Date | null>()
  const claimUntil = (d: string): Date | null => {
    if (claims.has(d)) return claims.get(d)!
    const t = timingOf(d)
    let cut: Date | null = null
    if (t && t.end < t.start) {
      const endLine = t.end + 1440, eveningFrom = atMinute(d, Math.floor((t.end + t.start) / 2)).getTime(), eveningTo = atMinute(d, 1440).getTime() - 1000
      // يوم عطلة/إجازة كاملة لم يُبصم مساؤه ولا صُحّح دخوله لا يمتد لصباح الغد (كالمحرك)
      const worked = punchMs.some(ms => ms >= eveningFrom && ms <= eveningTo) ||
        evidence.corrections.some(c => c.date === d && !!json(c.correctedPunch)?.in) ||
        (planByDate.get(d)?.scheduled !== false && !evidence.leaves.some(l => l.fromDate <= d && d <= l.toDate && l.period === 'FULL'))
      if (worked) {
        const next = timingOf(calendarDate(d, 1)), nextStart = 1440 + (next ? next.start : t.start)
        cut = atMinute(d, nextStart > endLine ? Math.floor((endLine + nextStart) / 2) : endLine)
      }
    }
    claims.set(d, cut)
    return cut
  }
  // نافذة بصمات يوم العمل [from, to] ولحظة إقفاله (لا يُثبت قبلها غياب ولا يُعد اليوم منتهيًا)
  const workdayOf = (d: string) => {
    const midnight = atMinute(d, 0), previous = claimUntil(calendarDate(d, -1)), own = claimUntil(d), t = timingOf(d)
    const closedAt = own ?? atMinute(d, 1440)
    return { from: previous && previous > midnight ? previous : midnight, to: new Date(closedAt.getTime() - 1000), closedAt, overnight: !!t && t.end < t.start }
  }
  const tierDays: PayrollTierPreviewDayDto[] = []
  const totals = { absentDays: 0, workedDays: 0, shortfallMinutes: 0, paidPermissionDeductibleMinutes: 0 }
  for (const scheduled of scheduleDays) {
    const date = scheduled.date as string, stored = dayIds.get(date), dayIssues: PayrollLiveSourceIssue[] = [], dayRefs: string[] = [...(scheduled.sourceRefs ?? [])]
    let dayState: PayrollLiveSourceState = 'AVAILABLE'
    const sourceRef = stored ? `attendance_days:${stored.id}` : null
    if (sourceRef) dayRefs.push(sourceRef)
    const day: Row = { date, state: dayState, status: stored?.status ?? null, sourceRef, sourceRefs: dayRefs, proof: null, issues: dayIssues }
    data.days.push(day)
    const fail = (next: PayrollLiveSourceState, code: string, message: string, ref = sourceRef) => {
      const detail = { code, message, ...(ref ? { sourceRef: ref } : {}) }; dayIssues.push(detail); report(next, code, `${date}: ${message}`, ref ?? undefined)
      if (rank[next] > rank[dayState]) dayState = next
    }
    const end = () => { day.state = dayState; day.sourceRefs = unique(dayRefs); refs.push(...dayRefs) }
    if (!inService(date)) { day.proof = { basis: 'OUTSIDE_EMPLOYMENT_COVERAGE', excluded: true }; end(); continue }
    if (scheduled.calendarState !== 'AVAILABLE' || typeof scheduled.scheduled !== 'boolean' || !['WORKING', 'WEEKEND', 'HOLIDAY'].includes(scheduled.dayKind) ||
      (scheduled.branchId != null && !id(scheduled.branchId))) fail('UNSUPPORTED', 'ATTENDANCE_CALENDAR_UNPROVEN', 'اليوم لا يملك تقويمًا مؤرخًا مكتملًا')
    if (stored && (stored.branchId ?? null) !== (scheduled.branchId ?? null)) fail('UNSUPPORTED', 'ATTENDANCE_BRANCH_HISTORY_MISMATCH', 'فرع صف الحضور لا يطابق التنظيم المؤرخ في هذا اليوم')
    for (const excuse of excuses.filter(x => x.from <= date && date <= x.to)) {
      dayRefs.push(excuse.sourceRef); fail('UNSUPPORTED', excuse.code, 'اليوم يتضمن قرار حضور يحتاج إثبات مدخلاته التاريخية قبل التنفيذ', excuse.sourceRef)
    }
    // البصمة لنافذة يوم العمل لا لليوم التقويمي: انصراف 00:50 يكمل ليلة الأمس ولا يدخل هذا اليوم
    const workday = workdayOf(date)
    const raw = punches.filter(p => p.punchTime >= workday.from && p.punchTime <= workday.to).sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime() || a.id - b.id)
    dayRefs.push(...raw.map(p => `attendance_punches:${p.id}`))
    if (dayState !== 'AVAILABLE') { end(); continue }
    if (!scheduled.scheduled) {
      if (scheduled.dayKind === 'WORKING') fail('INVALID', 'ATTENDANCE_CALENDAR_CLASSIFICATION_INVALID', 'تصنيف اليوم العامل يتعارض مع عدم جدولة العمل')
      else if (raw.length || (stored && (stored.status !== 'holiday' || stored.lateMinutes !== 0 || stored.deductibleMinutes !== 0 || stored.workMinutes !== 0))) fail('UNSUPPORTED', 'ATTENDANCE_NON_WORKING_EVIDENCE_REVIEW', 'اليوم غير العامل يتضمن بصمة أو صفًا يحتاج تسوية مستقلة')
      else day.proof = { basis: 'DATED_NON_WORKING_DAY', attendanceNotRequired: true }
      end(); continue
    }
    if (scheduled.dayKind !== 'WORKING' || scheduled.timingState !== 'AVAILABLE') fail('UNSUPPORTED', 'ATTENDANCE_TIMING_UNPROVEN', 'تعريف دوام اليوم العامل غير مثبت')
    if (!stored) { fail('MISSING', 'ATTENDANCE_STORED_DAY_MISSING', 'لا يوجد صف حضور محفوظ؛ عدم وجود الصف لا يعني الغياب'); end(); continue }
    // الليلية لا تنتهي عند منتصف الليل: إقفال اليوم عند حد نافذته صباح الغد. غيابها يكفيه حساب بعد نهاية
    // ورديتها (مهمة الغياب 01:00 لليلة 20:00 ← 01:00) لأن خلو النافذة كلها من البصمات يُعاد التحقق منه هنا عند القراءة.
    const nightEnd = workday.overnight && clockValid(scheduled.timing?.startTime) && clockValid(scheduled.timing?.endTime)
      ? atMinute(date, minute(scheduled.timing.endTime) + 1440) : null
    if (!instant(stored.computedAt) || stored.computedAt > now || now < workday.closedAt ||
      (stored.status === 'absent' && stored.computedAt < (nightEnd ?? workday.closedAt))) fail('UNSUPPORTED', 'ATTENDANCE_DAY_NOT_CLOSED', 'اليوم لم ينتهِ أو لا يوجد إثبات غياب محفوظ بعد انتهائه')
    if (stored.attendanceReviewRequired !== false || stored.leaveConflict !== false || stored.unscheduled !== false || stored.punchAnomalies != null ||
      (stored.attendanceReviewReason != null && stored.attendanceReviewReason !== '')) fail('UNSUPPORTED', 'ATTENDANCE_DAY_REVIEW_REQUIRED', 'صف الحضور أو بصماته يحتاج مراجعة')
    const snapshot = json(stored.attendanceRuleSnapshotRaw), rules: Row[] = Array.isArray(scheduleData.ruleEvidence) ? scheduleData.ruleEvidence : []
    const source = rules.find(r => r.versionId === scheduled.sourceRule?.versionId), employeeRule = rules.find(r => r.versionId === scheduled.employeeRule?.versionId)
    const settings = source?.snapshot?.state === 'AVAILABLE' ? source.snapshot.value : null, policy = settings?.flexPolicy, timing = scheduled.timing
    if (!snapshot || snapshot.schemaVersion !== 1 || snapshot.date !== date || snapshot.attendanceExempt !== false || source?.state !== 'AVAILABLE' || employeeRule?.state !== 'AVAILABLE' ||
      snapshot.sourceVersionId !== source.versionId || snapshot.sourceType !== source.sourceType || snapshot.sourceId !== source.sourceId || snapshot.sourceVersion !== source.version || snapshot.sourceEffectiveFrom !== source.effectiveFrom ||
      snapshot.employeeVersionId !== employeeRule.versionId || snapshot.employeeVersion !== employeeRule.version || snapshot.employeeOverrideMode !== employeeRule.snapshot.value?.flexOverrideMode) fail('UNSUPPORTED', 'ATTENDANCE_RULE_SNAPSHOT_UNPROVEN', 'لقطة الحضور لا تطابق نسخ إعداد الموظف والدوام المؤرخة')
    if (!timing || !clockValid(timing.startTime) || !clockValid(timing.endTime) || timing.startTime === timing.endTime) fail('UNSUPPORTED', 'ATTENDANCE_TIMING_PROOF_INVALID', 'أوقات دوام اليوم غير صالحة لإثبات البصمات')
    const grace = settings?.graceMinutes ?? settings?.generalGraceMinutes
    if (!plain(policy) || !['countEarlyWorkTowardRequired', 'prorateWindowOnPartialLeave', 'windowSupersedesGrace'].every(k => typeof policy[k] === 'boolean') ||
      !['unpaidBreakMinutes', 'shortfallGraceMinutes'].every(k => integer(policy[k], 1440)) || !integer(policy?.maxSessionMinutes, 1440) || policy.maxSessionMinutes === 0 || !integer(grace, 1440)) fail('UNSUPPORTED', 'ATTENDANCE_POLICY_SNAPSHOT_UNPROVEN', 'تفاصيل المرونة والسماح غير مكتملة في نسخة الدوام')
    if (dayState !== 'AVAILABLE') { end(); continue }
    const expectedSettings: Row = { flexEnabled: timing.flexEnabled, flexWindowMinutes: timing.flexWindowMinutes,
      countEarlyWorkTowardRequired: policy.countEarlyWorkTowardRequired, prorateFlexWindowOnPartialLeave: policy.prorateWindowOnPartialLeave,
      windowSupersedesGrace: policy.windowSupersedesGrace, unpaidBreakMinutes: policy.unpaidBreakMinutes,
      maxSessionMinutes: policy.maxSessionMinutes, shortfallToleranceMinutes: policy.shortfallGraceMinutes, graceMinutes: grace }
    if (Object.entries(expectedSettings).some(([k, v]) => snapshot![k] !== v) || stored.shiftStart !== timing.startTime || stored.shiftEnd !== timing.endTime || stored.graceUsed !== grace ||
      stored.shiftId !== (source!.sourceType === 'SHIFT' ? source!.sourceId : null) || (stored.scheduleSource !== ({ OVERRIDE: 'override', WEEK: 'week', EMPLOYEE: 'employee', DEFAULT: 'default' } as Row)[scheduled.assignment?.kind])) fail('UNSUPPORTED', 'ATTENDANCE_STORED_RULE_VALUES_MISMATCH', 'القيم المحفوظة للحضور تختلف عن نسخة دوام اليوم')
    const absent = stored.status === 'absent'
    if (absent ? (raw.length !== 0 || stored.checkIn != null || stored.checkOut != null) : (raw.length !== 2 || !clockValid(stored.checkIn) || !clockValid(stored.checkOut))) fail('UNSUPPORTED', 'ATTENDANCE_UNIQUE_PUNCH_PROOF_MISSING', 'لا يوجد تطابق وحيد مكتمل للبصمات الخام مع صف الحضور')
    if (!absent && !['present', 'late', 'early_leave'].includes(stored.status)) fail('UNSUPPORTED', 'ATTENDANCE_STATUS_PROOF_UNSUPPORTED', 'حالة اليوم تحتاج دليلًا إضافيًا قبل التنفيذ')
    if (raw.some(p => p.receivedAt > stored.computedAt || p.punchTime > stored.computedAt)) fail('UNSUPPORTED', 'ATTENDANCE_NEWER_PUNCH_EVIDENCE', 'وصلت بصمة بعد حساب اليوم؛ الصف المحفوظ لا يثبت المدخلات الحالية')
    if (dayState !== 'AVAILABLE') { end(); continue }
    const first = absent ? null : raw[0].punchTime as Date, last = absent ? null : raw[1].punchTime as Date
    if (first && last && (clock(first) !== stored.checkIn || clock(last) !== stored.checkOut || last <= first || first.getTimezoneOffset() !== last.getTimezoneOffset())) {
      fail('UNSUPPORTED', 'ATTENDANCE_PUNCH_TIME_MISMATCH', 'زمن البصمة الخام أو ترتيبها لا يطابق الصف المحفوظ'); end(); continue
    }
    // خط يوم العمل كما في المحرك: صباح الغد يتجاوز 24:00 (00:50 → 1490)؛ الدقيقة الصحيحة أولًا ثم الكسور ليتطابق الحساب العشري
    const line = (v: Date) => (localDate(v) > date ? 1440 : 0) + v.getHours() * 60 + v.getMinutes()
    const precise = (v: Date) => line(v) + v.getSeconds() / 60 + v.getMilliseconds() / 60000
    const start = minute(timing.startTime), finish = minute(timing.endTime) + (workday.overnight ? 1440 : 0)
    const computed = calculateAttendanceFlex({ startMinute: start, endMinute: finish, checkInMinute: first ? precise(first) : null, checkOutMinute: last ? precise(last) : null,
      flexEnabled: timing.flexEnabled, flexWindowMinutes: timing.flexWindowMinutes, requiredWorkMinutes: timing.requiredWorkMinutes,
      graceMinutes: grace, ...policy, prorateFlexWindowOnPartialLeave: policy.prorateWindowOnPartialLeave, shortfallToleranceMinutes: policy.shortfallGraceMinutes,
      actualWorkMinutes: first && last ? (last.getTime() - first.getTime()) / 60000 : null })
    // الحساب النقي هنا مقارنة بأثر محفوظ؛ لا يستبدل أي قيمة مخالفة ولا يحفظ يومًا جديدًا.
    if (computed.attendanceReviewRequired || Object.entries(computed).some(([k, v]) => snapshot![k] !== v)) fail('UNSUPPORTED', 'ATTENDANCE_STORED_RESULT_MISMATCH', 'نتيجة اليوم المحفوظة لا تطابق البصمتين والقواعد المثبتة')
    const columnResult: Row = { lateMinutes: computed.lateMinutes, excusedMinutes: computed.excusedMinutes, deductibleMinutes: computed.paidPermissionDeductibleMinutes,
      workMinutes: computed.rawWorkMinutes ?? 0, rawLateMinutes: computed.rawLateMinutes, unexcusedLateMinutes: computed.unexcusedLateMinutes,
      shortfallMinutes: computed.shortfallMinutes, countedWorkMinutes: computed.countedWorkMinutes, earlyArrivalMinutes: computed.earlyArrivalMinutes, flexOutcome: computed.flexOutcome }
    const early = !timing.flexEnabled && last ? Math.max(0, finish - line(last)) : 0
    const expectedEarly = early > grace ? early : 0
    const expectedStatus = absent ? 'absent' : computed.lateMinutes > 0 ? 'late' : expectedEarly > 0 ? 'early_leave' : 'present'
    if (Object.entries(columnResult).some(([k, v]) => stored[k] !== v) || stored.earlyLeaveMinutes !== expectedEarly || stored.status !== expectedStatus) fail('UNSUPPORTED', 'ATTENDANCE_STORED_COLUMNS_MISMATCH', 'أعمدة الحضور لا تطابق لقطة الحساب المحفوظة')
    if (dayState !== 'AVAILABLE') { end(); continue }
    // داخل المرونة لا يوجد تأخير قابل للشرائح؛ بعد حدها تؤخذ الثواني من بداية الدوام.
    const lateApplies = !timing.flexEnabled || computed.flexOutcome === 'AFTER_WINDOW'
    const rawMs = first && lateApplies ? Math.max(0, (line(first) - start) * 60000 + first.getSeconds() * 1000 + first.getMilliseconds()) : 0
    const rawLateSeconds = String(rawMs / 1000)
    const tierDay: PayrollTierPreviewDayDto = { date, sourceRef, rawLateSeconds, excusedLateSeconds: '0', flexibleStartEnabled: timing.flexEnabled,
      attendanceExempt: false, shiftGraceMinutes: settings.graceMinutes != null ? grace : null }
    tierDays.push(tierDay)
    totals.absentDays += absent ? 1 : 0; totals.workedDays += absent ? 0 : 1; totals.shortfallMinutes += computed.shortfallMinutes ?? 0
    day.proof = { basis: absent ? 'EXPLICIT_STORED_ABSENCE_VERIFIED' : 'UNIQUE_RAW_PUNCH_PAIR_VERIFIED', computedAt: stored.computedAt.toISOString(),
      firstIn: first?.toISOString() ?? null, lastOut: last?.toISOString() ?? null, punchIds: raw.map(p => p.id), tierDay,
      workdayWindow: { from: workday.from.toISOString(), to: workday.to.toISOString(), overnight: workday.overnight,
        neighborEvidence: date === periodStart || date === periodEnd ? { before: date === periodStart ? neighborEvidence.before : 'IN_PERIOD', after: date === periodEnd ? neighborEvidence.after : 'IN_PERIOD' } : null },
      shortfallMinutes: computed.shortfallMinutes, countedWorkMinutes: computed.countedWorkMinutes,
      // مدخلات اليوم المثبتة لحساب SHADOW (دقائق التأخير غير المعذور قبل السماح، والسماح، وسماح النقص، والمرونة)
      attendanceInputs: { absent, unexcusedLateMinutes: computed.unexcusedLateMinutes, lateMinutes: computed.lateMinutes, graceMinutes: grace,
        windowSupersedesGrace: policy.windowSupersedesGrace, shortfallToleranceMinutes: policy.shortfallGraceMinutes, flexEnabled: timing.flexEnabled } }
    end()
  }
  if (state === 'AVAILABLE') { data.tierDays = tierDays; data.totals = totals }
  return result()
}

/** الاستدعاء داخل لقطة SERIALIZABLE؛ جميع الاستعلامات قراءة محدودة وبنطاق الموظف. */
export async function readPayrollLiveAttendance(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string,
  schedule: PayrollLiveSourceSection, employment: PayrollLiveSourceSection): Promise<PayrollLiveSourceSection> {
  if (!id(employeeId)) throw new BadRequestException({ code: 'LIVE_SOURCE_EMPLOYEE_INVALID', message: 'معرف موظف صحيح موجب مطلوب' })
  payrollLiveSourcePeriod(periodStart, periodEnd)
  if (!em.queryRunner?.isTransactionActive) throw new Error('قراءة دليل الحضور تتطلب معاملة نشطة')
  const bound = (d: string, offset: number) => new Date(Math.max(Date.parse('1753-01-01T00:00:00Z'), Math.min(Date.parse('9999-12-31T23:59:59.997Z'), Date.parse(d + 'T00:00:00Z') + offset * 86400000)))
  // @5 = اليوم السابق للفترة: إجازته وتصحيحه يحسمان امتداد ليلته إلى أول يوم (دليل حد فقط)
  const beforeDate = calendarDate(periodStart, -1), afterDate = calendarDate(periodEnd, 1)
  const params = [employeeId, periodStart, periodEnd, bound(periodStart, -2), bound(periodEnd, 3), beforeDate]
  try {
    const days = await em.query(`SELECT TOP (5001) [id], [employeeId], [branchId], CONVERT(varchar(10),[date],23) AS [date],
      [status],[checkIn],[checkOut],[shiftStart],[shiftEnd],[shiftId],[scheduleSource],[unscheduled],[lateMinutes],[earlyLeaveMinutes],
      [excusedMinutes],[deductibleMinutes],[workMinutes],[rawLateMinutes],[unexcusedLateMinutes],[shortfallMinutes],[countedWorkMinutes],
      [earlyArrivalMinutes],[flexOutcome],[attendanceReviewRequired],[attendanceReviewReason],[leaveConflict],[punchAnomalies],[graceUsed],
      [attendanceRuleSnapshot] AS [attendanceRuleSnapshotRaw],[computedAt] FROM [attendance_days]
      WHERE [employeeId]=@0 AND [date]>=@1 AND [date]<=@2 ORDER BY [date],[id]`, params)
    const punches = await em.query(`SELECT TOP (5001) [id],[employeeId],[punchTime],[receivedAt],[source],[createdByUserId],[reason]
      FROM [attendance_punches] WHERE [employeeId]=@0 AND [punchTime]>=@3 AND [punchTime]<=@4 ORDER BY [punchTime],[id]`, params)
    const leaves = await em.query(`SELECT TOP (5001) [id],[employeeId],[requestId],CONVERT(varchar(10),[fromDate],23) AS [fromDate],
      CONVERT(varchar(10),[toDate],23) AS [toDate],[period],[isUnpaid],[status] FROM [leaves]
      WHERE [employeeId]=@0 AND [status]='APPROVED' AND [fromDate]<=@2 AND [toDate]>=@5 ORDER BY [id]`, params)
    const corrections = await em.query(`SELECT TOP (5001) c.[id],c.[employeeId],c.[requestId],CONVERT(varchar(10),c.[date],23) AS [date],c.[correctedPunch],
      r.[requesterId] AS [requestEmployeeId],r.[status] AS [requestStatus],r.[payload] AS [requestPayloadRaw]
      FROM [attendance_corrections] c LEFT JOIN [requests] r ON r.[id]=c.[requestId]
      WHERE c.[employeeId]=@0 AND c.[date]>=@5 AND c.[date]<=@2 ORDER BY c.[id]`, params)
    const requests = await em.query(`SELECT TOP (5001) [id],[requesterId],[typeCode],[status],[payload] AS [payloadRaw] FROM [requests]
      WHERE [requesterId]=@0 AND [typeCode] IN ('PERMISSION','BUSINESS_TRIP','REMOTE_WORK') AND [status] IN ('APPROVED','IN_EXECUTION','COMPLETED') ORDER BY [id]`, params)
    const exemptions = await em.query(`SELECT TOP (5001) [id],[employeeId],CONVERT(varchar(10),[effectiveFrom],23) AS [effectiveFrom],
      CONVERT(varchar(10),[effectiveTo],23) AS [effectiveTo],CONVERT(varchar(10),[terminatedFrom],23) AS [terminatedFrom],[status],
      [approvedByUserId],[approvedAt],[unpaidLeaveDeductibleOverride],[overtimeEligibleOverride] FROM [attendance_exemptions]
      WHERE [employeeId]=@0 AND [status]='APPROVED' AND [effectiveFrom]<=@2 AND ([effectiveTo] IS NULL OR [effectiveTo]>=@1) ORDER BY [id]`, params)
    // حد الوردية الليلية عند طرفي الفترة: جدول مؤرخ ليوم الجار عند الحاجة فقط — بصمة في أول يوم
    // (قد تكمل ليلة الأمس) أو آخر يوم ليلي (وردية الغد تحدد نهاية نافذته). قراءة فقط وبنفس المعاملة.
    const planOf = (section: PayrollLiveSourceSection, date: string): Row | null => {
      const list = (section.data as Row | null)?.days
      const found = Array.isArray(list) ? list.find((d: Row) => d?.date === date) : null
      return plain(found) ? found : null
    }
    const neighbors: PayrollAttendanceNeighborDays = {}
    if (Array.isArray(punches) && punches.some((p: Row) => instant(p.punchTime) && localDate(p.punchTime) === periodStart)) {
      neighbors.before = planOf(await readPayrollLiveSchedule(em, employeeId, beforeDate, beforeDate), beforeDate)
    }
    const lastTiming = planOf(schedule, periodEnd)?.timing
    if (plain(lastTiming) && clockValid(lastTiming.startTime) && clockValid(lastTiming.endTime) && lastTiming.endTime < lastTiming.startTime) {
      neighbors.after = planOf(await readPayrollLiveSchedule(em, employeeId, afterDate, afterDate), afterDate)
    }
    return verifyPayrollAttendanceEvidence(employeeId, periodStart, periodEnd, schedule, employment, { days, punches, leaves, corrections, requests, exemptions }, new Date(), neighbors)
  } catch (error: any) {
    if (![207, 208].includes(error?.number ?? error?.driverError?.number ?? error?.originalError?.info?.number)) throw error
    return { state: 'MISSING', data: null, sourceRefs: [], issues: [{ code: 'ATTENDANCE_EVIDENCE_SCHEMA_MISSING', message: 'جداول إثبات الحضور غير مكتملة؛ لم تستخدم دقائق قديمة بدل الثواني الخام' }] }
  }
}
