// شاشة استثناء الحضور (خطة المراجعة 24): القائمة بالنطاق، والرفض، وسجل القرار، والتحقق من نموذج الطلب.
// الإنشاء والاعتماد والإلغاء والإنهاء موجودة في api.ts وتُستعمل كما هي.
import { apiFetch, type ApiAttendanceExemption } from './api'

export type ExemptionStatus = ApiAttendanceExemption['status']
export type ExemptionReasonCode = ApiAttendanceExemption['reasonCode']
export type ExemptionState = 'PENDING_HR' | 'PENDING_EXECUTIVE' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'REJECTED' | 'CANCELLED'
export type ExemptionDecisionKind = 'approve' | 'approveExecutive' | 'reject' | 'cancel' | 'terminate'

export interface AttendanceExemptionActions {
  approve: boolean
  approveExecutive: boolean
  reject: boolean
  cancel: boolean
  terminate: boolean
  // سبب منع القرار لهذا المستخدم: أنشأ الطلب، أو اعتمد خطوة الموارد البشرية في استثناء قيادي
  blockedBy: 'CREATOR' | 'HR_APPROVER' | null
}

export interface AttendanceExemptionRow extends ApiAttendanceExemption {
  employee: { id: number; fullName: string; employeeCode: string; branchId: number | null; branchName: string | null } | null
  createdByName: string | null
  approvedByName: string | null
  executiveApprovedByName: string | null
  terminatedByName: string | null
  state: ExemptionState
  actions: AttendanceExemptionActions
}

export interface AttendanceExemptionList {
  rows: AttendanceExemptionRow[]
  today: string
  currentPeriodStart: string
  /** أول تاريخ بداية مسموح لطلب جديد: بداية فترة الرواتب السابقة (مسيرها يُصرف بعد انتهائها). */
  earliestStart?: string
  reasonMinLength: number
  limit: number
  truncated: boolean
}

export interface AttendanceExemptionEventRow {
  id: number
  exemptionId: number
  actorUserId: number
  actorName: string | null
  eventType: string
  reason: string | null
  createdAt: string
}

export const EXEMPTION_REASON_LABELS: Record<ExemptionReasonCode, string> = {
  executive: 'منصب قيادي (يحتاج اعتمادًا تنفيذيًا)',
  field_role: 'عمل ميداني',
  remote: 'عمل عن بُعد',
  contractual: 'نص تعاقدي',
  medical: 'ظرف صحي',
  other: 'سبب آخر',
}

export const EXEMPTION_STATE_LABELS: Record<ExemptionState, { label: string; className: string }> = {
  PENDING_HR: { label: 'بانتظار اعتماد الموارد البشرية', className: 'badge badge-warning' },
  PENDING_EXECUTIVE: { label: 'بانتظار الاعتماد التنفيذي', className: 'badge badge-warning' },
  SCHEDULED: { label: 'معتمد ويبدأ لاحقًا', className: 'badge badge-primary' },
  ACTIVE: { label: 'ساري', className: 'badge badge-success' },
  ENDED: { label: 'منتهٍ', className: 'badge bg-gray-100 text-gray-600' },
  REJECTED: { label: 'مرفوض', className: 'badge badge-danger' },
  CANCELLED: { label: 'ملغى', className: 'badge bg-gray-100 text-gray-600' },
}

export const EXEMPTION_EVENT_LABELS: Record<string, string> = {
  CREATED: 'إنشاء الطلب',
  HR_APPROVED: 'اعتماد الموارد البشرية',
  EXECUTIVE_APPROVED: 'الاعتماد التنفيذي',
  // قرار المالك 26 سبتمبر: ما ينشئه مدير الموارد البشرية لغيره يُعتمد لحظة إنشائه باسمه وبسبب الإنشاء نفسه
  HR_INSTANT_APPROVED: 'اعتماد فوري — أنشأه مدير الموارد البشرية',
  EXECUTIVE_INSTANT_APPROVED: 'اعتماد تنفيذي فوري — أنشأه مدير الموارد البشرية',
  REJECTED: 'رفض الطلب',
  EXECUTIVE_REJECTED: 'رفض في الخطوة التنفيذية',
  CANCELLED: 'إلغاء الطلب',
  TERMINATED: 'إنهاء الاستثناء',
}

// رسالة نجاح الإنشاء بحسب ما رجّعه الخادم: مدير الموارد البشرية (بصلاحية الاعتماد) طلبه يُعتمد فورًا، والقيادي بلا
// صلاحية تنفيذية يفضل بانتظار الاعتماد التنفيذي وحده؛ غيره بانتظار قرار مستخدم آخر
export function exemptionCreatedNotice(created: Pick<ApiAttendanceExemption, 'id' | 'status' | 'approvedByUserId'>): string {
  if (created.status === 'APPROVED') return `أُنشئ الاستثناء #${created.id} واعتُمد فورًا — قرار مدير الموارد البشرية نهائي.`
  if (created.approvedByUserId) return `أُنشئ الاستثناء #${created.id} واعتمدته الموارد البشرية فورًا، وهو بانتظار الاعتماد التنفيذي من مستخدم يحمل صلاحيته.`
  return `أُنشئ طلب الاستثناء #${created.id} وهو بانتظار قرار مستخدم آخر غير منشئه.`
}

export const EXEMPTION_DECISION_LABELS: Record<ExemptionDecisionKind, { title: string; submit: string }> = {
  approve: { title: 'اعتماد طلب الاستثناء', submit: 'اعتماد' },
  approveExecutive: { title: 'الاعتماد التنفيذي للاستثناء', submit: 'اعتماد تنفيذي' },
  reject: { title: 'رفض طلب الاستثناء', submit: 'رفض' },
  cancel: { title: 'إلغاء طلب الاستثناء', submit: 'إلغاء الطلب' },
  terminate: { title: 'إنهاء استثناء معتمد', submit: 'إنهاء' },
}

export const fetchAttendanceExemptionList = (filters: { status?: ExemptionStatus; employeeId?: number; branchId?: number } = {}) => {
  const query = new URLSearchParams()
  if (filters.status) query.set('status', filters.status)
  if (filters.employeeId) query.set('employeeId', String(filters.employeeId))
  if (filters.branchId) query.set('branchId', String(filters.branchId))
  const suffix = query.toString()
  return apiFetch<AttendanceExemptionList>(`/attendance-exemptions${suffix ? `?${suffix}` : ''}`)
}

export const rejectAttendanceExemption = (id: number, reason: string) =>
  apiFetch<ApiAttendanceExemption>(`/attendance-exemptions/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })

export const fetchAttendanceExemptionEvents = (id: number) =>
  apiFetch<AttendanceExemptionEventRow[]>(`/attendance-exemptions/${id}/events`)

// أ7: المستثنى من البصمة بلا خصومات وبلا إضافي — فلا خياري تجاوز في النموذج.
export interface ExemptionCreateForm {
  employeeId: string
  effectiveFrom: string
  effectiveTo: string
  reasonCode: ExemptionReasonCode | ''
  reason: string
  requiresCheckinForPresence: boolean
}

export const emptyExemptionForm = (effectiveFrom = ''): ExemptionCreateForm => ({
  employeeId: '', effectiveFrom, effectiveTo: '', reasonCode: '', reason: '', requiresCheckinForPresence: false,
})

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

export function exemptionReasonError(reason: string, minLength: number): string | null {
  const length = reason.trim().length
  if (length < minLength || length > 500) return `اكتب سببًا موثقًا من ${minLength} إلى 500 حرف.`
  return null
}

export function exemptionCreateFormError(form: ExemptionCreateForm, minLength: number, earliestStart: string): string | null {
  if (!form.employeeId) return 'اختر الموظف.'
  if (!validDate(form.effectiveFrom)) return 'حدد تاريخ بداية صحيحًا.'
  if (earliestStart && form.effectiveFrom < earliestStart) return `لا يبدأ الاستثناء قبل ${earliestStart} (بداية فترة الرواتب السابقة)؛ ما قبلها يُعالج بتسوية مالية.`
  if (form.effectiveTo && !validDate(form.effectiveTo)) return 'تاريخ النهاية غير صحيح.'
  if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) return 'تاريخ النهاية يسبق البداية.'
  if (!form.reasonCode) return 'اختر تصنيف السبب.'
  return exemptionReasonError(form.reason, minLength)
}

export function exemptionCreateBody(form: ExemptionCreateForm) {
  return {
    employeeId: Number(form.employeeId),
    effectiveFrom: form.effectiveFrom,
    effectiveTo: form.effectiveTo || null,
    reasonCode: form.reasonCode as ExemptionReasonCode,
    reason: form.reason.trim(),
    requiresCheckinForPresence: form.requiresCheckinForPresence,
  }
}

export function exemptionErrorMessage(error: unknown, fallback = 'تعذر إتمام العملية. حاول مجددًا.'): string {
  return error instanceof Error && error.message ? error.message : fallback
}
