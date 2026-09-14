import { apiFetch } from './api'

export type LiveSourceState = 'AVAILABLE' | 'MISSING' | 'UNSUPPORTED' | 'INVALID'
export interface LiveSourceSection {
  state: LiveSourceState
  data: unknown
  issues: { code: string; message: string; sourceRef?: string }[]
  sourceRefs: string[]
}
export interface PayrollLiveSources {
  readOnly: true; sourceValidation: 'SERVER_READ_PARTIAL'; capturedAt: string; capturedBy: number; contentHash: string
  executionReady: false; approvalEligible: false; persisted: false
  snapshot: {
    employee: { id: number; fullName: string; employeeCode: string }
    period: { startDate: string; endDate: string }
    policy: { versionId: number; revision: number }
    sections: Record<string, LiveSourceSection>
    blockers: { section: string; code: string; message: string }[]
  }
}
export const LIVE_SOURCE_LABELS: Record<string, string> = {
  employment: 'التغطية الوظيفية', compensation: 'الأجر الحالي وتاريخ سريانه', attendance: 'أدلة الحضور اليومية', schedule: 'الدوام والتقويم لكل يوم',
  overtime: 'الإضافي المعتمد', installments: 'أرصدة أقساط السلف', credits: 'المستحقات الإضافية', otherDebits: 'المديونيات الأخرى',
}
export const LIVE_SOURCE_STATE_LABELS: Record<LiveSourceState, string> = {
  AVAILABLE: 'القراءة متاحة', MISSING: 'بيانات ناقصة', UNSUPPORTED: 'يحتاج استكمالًا', INVALID: 'يحتاج تصحيحًا',
}
export const liveSourceRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
export const liveSourceRows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.flatMap(row => { const record = liveSourceRecord(row); return record ? [record] : [] }) : []
export const liveSourceStateLabel = (value: unknown) => typeof value === 'string' && Object.prototype.hasOwnProperty.call(LIVE_SOURCE_STATE_LABELS, value) ? LIVE_SOURCE_STATE_LABELS[value as LiveSourceState] : 'حالة تحتاج مراجعة'
export const liveSourceAmount = (value: unknown) => typeof value === 'string' && /^\d{1,60}(?:\.\d{1,6})?$/.test(value) ? value : 'غير مثبت'
export const liveSourceMinutes = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : 'غير مثبت'
export const liveSourceDayKind = (value: unknown) => value === 'WORKING' ? 'يوم عمل' : value === 'WEEKEND' ? 'راحة أسبوعية' : value === 'HOLIDAY' ? 'عطلة رسمية' : 'غير مثبت'
export const liveSourceProofLabel = (value: unknown) => value === 'UNIQUE_RAW_PUNCH_PAIR_VERIFIED' ? 'بصمتا دخول وخروج مثبتتان' : value === 'EXPLICIT_STORED_ABSENCE_VERIFIED' ? 'غياب مسجل ومثبت' : value === 'DATED_NON_WORKING_DAY' ? 'يوم راحة أو عطلة مثبت بالتقويم' : value === 'OUTSIDE_EMPLOYMENT_COVERAGE' ? 'خارج أيام الخدمة' : 'الدليل غير مثبت'
export const liveSourceDate = (value: unknown, immediate = false) => value === null && immediate ? 'فوري' : typeof value === 'string' && liveSourcePeriodError(value, value) === null ? value : 'غير مثبت'
export const liveSourceMessage = (value: unknown) => typeof value === 'string' && /[\u0600-\u06ff]/.test(value) ? value : 'تحتاج بيانات هذا المصدر إلى مراجعة قبل استخدامها.'
const sourceStatusLabels: Record<string, string> = {
  DETECTED: 'مكتشف', SUBMITTED: 'بانتظار الاعتماد', APPROVED: 'معتمد', PAID: 'مصروف', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
  DUE: 'رصيد قائم', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل إلى قسط لاحق', SETTLED: 'مسدد', PENDING: 'معلق', APPLIED: 'مصروف سابقًا',
  present: 'حاضر', late: 'متأخر', absent: 'غياب مسجل', early_leave: 'انصراف مبكر', leave: 'إجازة', partial_leave: 'إجازة جزئية', holiday: 'عطلة',
  missing_punch: 'بصمة ناقصة', mission: 'مأمورية', remote: 'عمل عن بعد', exempt: 'مستثنى من الحضور',
}
const sourceReasonLabels: Record<string, string> = {
  OT_PAYMENT_LINK_INVALID: 'رابط الصرف لا يطابق حالة الإضافي',
  ALREADY_PAID: 'مصروف بالفعل', CLAIMED_BY_PAYROLL: 'مرتبط بمسير معتمد أو مصروف', CLAIMED_BY_SETTLEMENT: 'مشمول بتصفية معتمدة',
  BACKLOG_WITHOUT_CLOSED_PERIOD: 'إضافي سابق دون فترة مالية مقفلة مثبتة', LEGACY_PRICE_UNAVAILABLE: 'مبلغ الاعتماد التاريخي غير مثبت',
  PENDING_APPROVAL: 'لم يُعتمد بعد', ELIGIBLE_CURRENT_PERIOD: 'متاح ضمن الفترة', ELIGIBLE_RETROACTIVE: 'مصدر رجعي متاح',
  SECTION_UNRESOLVED: 'المصدر يحتاج مراجعة', SOURCE_UNVERIFIED: 'البيانات غير مكتملة التحقق',
  NO_OPEN_BALANCE: 'لا يوجد رصيد قائم', FUTURE_DUE: 'موعد القسط لاحق للفترة', FUTURE_EFFECTIVE_DATE: 'تاريخ السريان لاحق للفترة',
  NON_INSTALLMENT_DEBIT_UNSUPPORTED: 'تحصيل المديونية خارج الأقساط لم يُفعّل',
}
export function liveSourceRowStatus(row: Record<string, unknown>): string {
  const status = row.financialStatus ?? row.status
  return typeof status === 'string' && Object.prototype.hasOwnProperty.call(sourceStatusLabels, status) ? sourceStatusLabels[status] : 'حالة غير مثبتة'
}
export function liveSourceRowReasons(row: Record<string, unknown>): string[] {
  const reasons = Array.isArray(row.exclusionReasons) ? row.exclusionReasons : Array.isArray(row.reasons) ? row.reasons : []
  return [...new Set(reasons.map(reason => {
    if (typeof reason !== 'string') return 'سبب يحتاج مراجعة'
    if (Object.prototype.hasOwnProperty.call(sourceReasonLabels, reason)) return sourceReasonLabels[reason]
    if (reason.startsWith('POSITION_')) return liveSourceRowStatus({ status: reason.slice(9) })
    if (/^CLAIM_(?:ALLOCATION|PAYROLL)_(?:HELD|APPROVED|PAID|POSTED)$/.test(reason)) return 'محجوز أو محصل في مسير'
    if (/^CLAIM_SETTLEMENT_(?:SETTLED|CLOSED)$/.test(reason)) return 'مشمول بتصفية معتمدة'
    return 'سبب يحتاج مراجعة'
  }))]
}
export function liveSourcePeriodError(start: string, end: string): string | null {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  if (!valid(start) || !valid(end) || end < start) return 'حدد بداية ونهاية صحيحتين للفترة.'
  if ((Date.parse(end) - Date.parse(start)) / 86400000 + 1 > 32) return 'اختر فترة واحدة لا تتجاوز 32 يومًا.'
  return null
}
export async function readPayrollLiveSources(policyId: number, versionId: number, expectedRevision: number, employeeId: number, periodStart: string, periodEnd: string, signal?: AbortSignal): Promise<PayrollLiveSources> {
  if ([policyId, versionId, expectedRevision, employeeId].some(value => !Number.isSafeInteger(value) || value < 1 || value > 2147483647)) throw new Error('حدد الموظف والسياسة والنسخة الصحيحة قبل قراءة المصادر.')
  const periodError = liveSourcePeriodError(periodStart, periodEnd)
  if (periodError) throw new Error(periodError)
  const response = await apiFetch<PayrollLiveSources>(`/payroll/policies/${policyId}/versions/${versionId}/sources/read`, {
    method: 'POST', body: JSON.stringify({ expectedRevision, employeeId, periodStart, periodEnd }), signal,
  })
  if (!response || response.readOnly !== true || response.sourceValidation !== 'SERVER_READ_PARTIAL' || response.executionReady !== false || response.approvalEligible !== false || response.persisted !== false ||
    response.snapshot?.employee?.id !== employeeId || response.snapshot?.policy?.versionId !== versionId || response.snapshot.policy.revision !== expectedRevision ||
    typeof response.snapshot.employee.fullName !== 'string' || typeof response.snapshot.employee.employeeCode !== 'string' ||
    typeof response.capturedAt !== 'string' || !Number.isFinite(Date.parse(response.capturedAt)) ||
    response.snapshot?.period?.startDate !== periodStart || response.snapshot.period.endDate !== periodEnd || !liveSourceRecord(response.snapshot.sections) || !Array.isArray(response.snapshot.blockers) ||
    Object.values(response.snapshot.sections).some(section => !liveSourceRecord(section) || typeof section.state !== 'string' || !Array.isArray(section.issues) || !Array.isArray(section.sourceRefs) || !Object.prototype.hasOwnProperty.call(section, 'data') || section.issues.some(issue => !liveSourceRecord(issue) || typeof issue.message !== 'string')) ||
    response.snapshot.blockers.some(blocker => !liveSourceRecord(blocker) || typeof blocker.section !== 'string' || typeof blocker.message !== 'string')) {
    throw new Error('رد قراءة المصادر لا يطابق الموظف والفترة ومراجعة السياسة المختارة؛ أعد تحميل النسخة والمحاولة.')
  }
  return response
}
