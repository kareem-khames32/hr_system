// B3.7: دورات التقييم — النماذج والدورات (لإدارة الأداء)، و«تقييماتي» و«تقييم فريقي» ونموذج التقييم (الخادم بيحكم: صاحب التكليف، مقيِّمه، أو إدارة الأداء)
import { apiFetch } from './api'

export type ReviewSectionKind = 'GOALS' | 'COMPETENCIES' | 'QUESTIONS'
export const REVIEW_SECTION_LABELS: Record<ReviewSectionKind, string> = { GOALS: 'أهداف', COMPETENCIES: 'جدارات', QUESTIONS: 'أسئلة' }
export interface ReviewItem { key: string; label: string; type: 'rating' | 'text'; required: boolean }
export interface ReviewSection { key: string; title: string; kind: ReviewSectionKind; weight: number; items: ReviewItem[] }
export interface ApiReviewTemplate { id: number; name: string; description: string | null; ratingMax: number; sections: ReviewSection[]; isActive: boolean; createdAt: string }
/** اللي بيتبعت في إنشاء نموذج: من غير مفاتيح (الخادم بيحطها) */
export interface TemplateBody {
  name: string; description?: string | null; ratingMax: number
  sections: Array<{ title: string; kind: ReviewSectionKind; weight: number; items?: Array<{ label: string; type: 'rating' | 'text'; required: boolean }> }>
}

export type ReviewCycleKind = 'ANNUAL' | 'SEMI_ANNUAL' | 'PROBATION' | 'PROJECT'
export const REVIEW_CYCLE_KIND_LABELS: Record<ReviewCycleKind, string> = { ANNUAL: 'سنوي', SEMI_ANNUAL: 'نصف سنوي', PROBATION: 'فترة تجربة', PROJECT: 'مشروع' }
// AUDIENCE (B-ADD.1): الجمهور بالاستهداف الموحد في خانة audience؛ الأوضاع التانية للدورات القديمة
export type ReviewAudienceMode = 'COMPANY' | 'BRANCHES' | 'DEPARTMENTS' | 'AUDIENCE'
export type ReviewCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export interface ApiReviewCycle {
  id: number; name: string; kind: ReviewCycleKind; kindLabel: string; templateId: number; templateName: string | null
  periodStart: string; periodEnd: string; selfDueDate: string; managerDueDate: string
  audienceMode: ReviewAudienceMode; audienceIds: number[]; audience?: unknown; status: ReviewCycleStatus; statusLabel: string; launchedAt: string | null
  counts: { total: number; self: number; manager: number; noManager: number }
}
export interface CycleBody {
  /** selfDueDate: والتقييم الذاتي مقفول (B-ADD.18) مابيتبعتش — الخادم بيسجّله بميعاد المدير */
  name: string; kind: ReviewCycleKind; templateId: number; periodStart: string; periodEnd: string; selfDueDate?: string; managerDueDate: string
  audienceMode: ReviewAudienceMode; audienceIds?: number[]; audience?: unknown
}
export type ReviewStatus = 'OPEN' | 'COMPLETED' | 'APPROVED' | 'ANNOUNCED' | 'ACKNOWLEDGED'
export interface ApiCycleAssignment {
  id: number; employeeId: number; employeeName: string; managerName: string | null; hasManager: boolean; status: ReviewStatus; statusLabel: string
  /** B-ADD.10: المقيِّم يتغيّر (الدورة شغالة وتقييمه لسه ماتسلّمش) */
  canChangeEvaluator?: boolean
  selfSubmitted: boolean; managerSubmitted: boolean; selfScore: number | null; managerScore: number | null; finalScore: number | null
}

export interface ApiReviewRow {
  id: number; cycleId: number; cycleName: string; kindLabel: string; cycleStatus: ReviewCycleStatus
  periodStart: string; periodEnd: string; selfDueDate: string; managerDueDate: string
  employeeId: number; employeeName: string | null; status: ReviewStatus; statusLabel: string
  selfSubmitted: boolean; managerSubmitted: boolean; selfScore: number | null
  /** تقييم المدير والدرجة النهائية: للموظف بعد الإعلان بس */
  managerScore: number | null; finalScore: number | null
}
export interface ReviewAnswers { sections: Record<string, Record<string, { rating?: number; text?: string }>>; goals: Record<string, { rating: number; comment?: string }> }
export interface ReviewEvidence {
  period: { from: string; to: string }
  attendance: { days: number; byStatus: Record<string, number>; lateDays: number; lateMinutes: number }
  tasks: { total: number; done: number; overdue: number }
  goals: Array<{ id: number; title: string; weight: number; targetValue: string | null; actualValue: string | null; unit: string | null }>
}
export interface ReviewResponseView { answers: ReviewAnswers; score: number | null; comment: string | null; submittedAt: string; evidence: ReviewEvidence | null }
export interface ApiReviewForm extends ApiReviewRow {
  relation: 'self' | 'manager' | 'hr'
  template: { ratingMax: number; sections: ReviewSection[] }
  goals: ReviewEvidence['goals']
  evidence: ReviewEvidence
  self: ReviewResponseView | null; manager: ReviewResponseView | null
  acknowledgement: { comment: string | null; at: string } | null
  canSubmit: boolean; canAcknowledge: boolean
  /** B-ADD.18: خطوة التقييم الذاتي مفتوحة؟ (مقفولة افتراضيًا: محدش بيقيّم نفسه) */
  selfReview?: boolean
  /** B3.8: اعتراض الموظف على نتيجته المعلنة (طلب في سلسلته) ومهلته */
  objection: ReviewObjection | null; objectionUntil: string | null; canObject: boolean
}
export interface ReviewObjection { requestId: number; status: string; statusLabel: string }

// B3.8: المعايرة
export interface ReviewBand { key: string; label: string; min: number; guide: number }
export interface ApiCalibrationCycle { id: number; name: string; kindLabel: string; status: ReviewCycleStatus; statusLabel: string; periodStart: string; periodEnd: string }
export interface ApiCalibrationRow {
  id: number; employeeName: string; departmentName: string | null; branchName: string | null
  /** ترتيب المدير في جدول التوزيع (مش رقمه) */
  manager: number
  status: ReviewStatus; statusLabel: string; managerScore: number | null; finalScore: number | null; band: string | null; bandLabel: string | null
  adjustments: Array<{ before: number | null; after: number | null; reason: string; byName: string | null; at: string }>
  objection: ReviewObjection | null; canCalibrate: boolean
}
export interface ApiCalibration {
  cycle: { id: number; name: string; status: ReviewCycleStatus; statusLabel: string }
  bands: ReviewBand[]
  groups: { departments: Array<{ id: number; name: string }>; branches: Array<{ id: number; name: string }> }
  rows: ApiCalibrationRow[]
  managers: Array<{ index: number; name: string | null; hasManager: boolean; count: number; average: number | null; bands: Array<{ key: string; count: number }> }>
  distribution: Array<{ key: string; label: string; count: number; percent: number; guide: number; over: boolean }>
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const R = '/performance/reviews'

export const fetchReviewTemplates = () => apiFetch<{ available: boolean; message?: string; templates: ApiReviewTemplate[] }>(`${R}/templates`)
export const createReviewTemplate = (body: TemplateBody) => apiFetch<ApiReviewTemplate>(`${R}/templates`, json('POST', body))
export const updateReviewTemplate = (id: number, body: Partial<TemplateBody> & { isActive?: boolean }) => apiFetch<ApiReviewTemplate>(`${R}/templates/${id}`, json('PATCH', body))
export const fetchReviewCycles = () => apiFetch<{ available: boolean; message?: string; canCompany: boolean; selfReview?: boolean; cycles: ApiReviewCycle[] }>(`${R}/cycles`)
export const createReviewCycle = (body: CycleBody) => apiFetch<ApiReviewCycle>(`${R}/cycles`, json('POST', body))
export const launchReviewCycle = (id: number) => apiFetch<ApiReviewCycle>(`${R}/cycles/${id}/launch`, json('POST', {}))
export const closeReviewCycle = (id: number) => apiFetch<ApiReviewCycle>(`${R}/cycles/${id}/close`, json('POST', {}))
export const advanceReviewCycle = (id: number, to: 'APPROVED' | 'ANNOUNCED') =>
  apiFetch<{ moved: number; cycle: ApiReviewCycle; assignments: ApiCycleAssignment[] }>(`${R}/cycles/${id}/advance`, json('POST', { to }))
export const setReviewEvaluator = (assignmentId: number, evaluatorEmployeeId: number) =>
  apiFetch<{ changed: boolean; evaluatorName: string }>(`${R}/${assignmentId}/evaluator`, json('POST', { evaluatorEmployeeId }))
export const fetchCycleAssignments = (id: number) => apiFetch<{ cycle: ApiReviewCycle; selfReview?: boolean; assignments: ApiCycleAssignment[] }>(`${R}/cycles/${id}/assignments`)
// B-ADD.18: selfReview = خطوة التقييم الذاتي مفتوحة؛ manager = الحساب تحته حد في الهيكل أو له تكليف هو مقيِّمه («تقييم فريقي» بيظهر له بس)
export const fetchMyReviews = () => apiFetch<{ available: boolean; selfReview?: boolean; reviews: ApiReviewRow[] }>(`${R}/mine`)
export const fetchTeamReviews = () => apiFetch<{ available: boolean; manager?: boolean; reviews: ApiReviewRow[] }>(`${R}/team`)
export const fetchReviewForm = (id: number) => apiFetch<ApiReviewForm>(`${R}/${id}`)
export const submitReview = (id: number, answers: ReviewAnswers, comment?: string) => apiFetch<ApiReviewForm>(`${R}/${id}/submit`, json('POST', { answers, ...(comment ? { comment } : {}) }))
export const acknowledgeReview = (id: number, comment?: string) => apiFetch<ApiReviewForm>(`${R}/${id}/acknowledge`, json('POST', comment ? { comment } : {}))
export const fetchCalibrationCycles = () => apiFetch<{ available: boolean; message?: string; cycles: ApiCalibrationCycle[] }>(`${R}/calibration`)
export const fetchCalibration = (cycleId: number, group: { departmentId?: number; branchId?: number } = {}) =>
  apiFetch<ApiCalibration>(`${R}/cycles/${cycleId}/calibration${group.departmentId ? `?departmentId=${group.departmentId}` : group.branchId ? `?branchId=${group.branchId}` : ''}`)
export const calibrateReview = (id: number, score: string, reason: string) => apiFetch<ApiCalibration>(`${R}/${id}/calibrate`, json('POST', { score, reason }))
/** نوع الطلب الموجود «اعتراض على تقييم أداء» — من شاشة التقييم بيتربط بيه (reviewId) */
export const REVIEW_OBJECTION_TYPE = 'APPRAISAL_OBJECTION'

// B3.8: مكافآت نتيجة التقييم — إدارة الأداء بتقترح، والمدير المباشر بيقدّم (بموديول المكافآت)
export type RewardStatus = 'SUGGESTED' | 'CLAIMED' | 'SUBMITTED' | 'DISMISSED'
export interface ApiRewardSuggestion {
  id: number; status: RewardStatus; statusLabel: string; typeName: string; calcMethodLabel: string | null; inputValue: string; targetPeriod: string
  band: string; bandLabel: string; finalScore: number | null; bonusRequestId: number | null; bonusStatus: string | null; bonusStatusLabel: string | null
}
export interface ApiCycleRewards {
  available: boolean; message?: string; cycle?: { id: number; name: string }; bands: ReviewBand[]; canSuggest: boolean
  types: Array<{ id: number; nameAr: string; calcMethod: string; calcMethodLabel: string }>
  rows: Array<{ assignmentId: number; employeeName: string; managerName: string | null; status: ReviewStatus; statusLabel: string; finalScore: number | null; band: string | null; bandLabel: string | null
    suggestion: ApiRewardSuggestion | null }>
}
export interface ApiMyReward extends ApiRewardSuggestion { employeeName: string; cycleName: string; canSubmit: boolean }
const W = '/performance/rewards'
export const fetchCycleRewards = (cycleId: number) => apiFetch<ApiCycleRewards>(`${W}/cycles/${cycleId}`)
export const suggestCycleRewards = (cycleId: number, body: { bonusTypeId: number; targetPeriod: string; values: Record<string, string> }) =>
  apiFetch<ApiCycleRewards & { created: number; skipped: { exists: number; noValue: number; noManager: number } }>(`${W}/cycles/${cycleId}`, json('POST', body))
export const fetchMyRewards = () => apiFetch<{ suggestions: ApiMyReward[] }>(`${W}/mine`)
export const submitReward = (id: number) => apiFetch<{ bonusRequestId: number; suggestions: ApiMyReward[] }>(`${W}/${id}/submit`, json('POST', {}))
export const dismissReward = (id: number) => apiFetch<{ dismissed: boolean }>(`${W}/${id}/dismiss`, json('POST', {}))
