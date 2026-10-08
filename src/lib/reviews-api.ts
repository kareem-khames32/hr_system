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
export type ReviewAudienceMode = 'COMPANY' | 'BRANCHES' | 'DEPARTMENTS'
export type ReviewCycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'
export interface ApiReviewCycle {
  id: number; name: string; kind: ReviewCycleKind; kindLabel: string; templateId: number; templateName: string | null
  periodStart: string; periodEnd: string; selfDueDate: string; managerDueDate: string
  audienceMode: ReviewAudienceMode; audienceIds: number[]; status: ReviewCycleStatus; statusLabel: string; launchedAt: string | null
  counts: { total: number; self: number; manager: number; noManager: number }
}
export interface CycleBody {
  name: string; kind: ReviewCycleKind; templateId: number; periodStart: string; periodEnd: string; selfDueDate: string; managerDueDate: string
  audienceMode: ReviewAudienceMode; audienceIds?: number[]
}
export type ReviewStatus = 'OPEN' | 'COMPLETED' | 'APPROVED' | 'ANNOUNCED' | 'ACKNOWLEDGED'
export interface ApiCycleAssignment {
  id: number; employeeId: number; employeeName: string; managerName: string | null; hasManager: boolean; status: ReviewStatus; statusLabel: string
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
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const R = '/performance/reviews'

export const fetchReviewTemplates = () => apiFetch<{ available: boolean; message?: string; templates: ApiReviewTemplate[] }>(`${R}/templates`)
export const createReviewTemplate = (body: TemplateBody) => apiFetch<ApiReviewTemplate>(`${R}/templates`, json('POST', body))
export const updateReviewTemplate = (id: number, body: Partial<TemplateBody> & { isActive?: boolean }) => apiFetch<ApiReviewTemplate>(`${R}/templates/${id}`, json('PATCH', body))
export const fetchReviewCycles = () => apiFetch<{ available: boolean; message?: string; canCompany: boolean; cycles: ApiReviewCycle[] }>(`${R}/cycles`)
export const createReviewCycle = (body: CycleBody) => apiFetch<ApiReviewCycle>(`${R}/cycles`, json('POST', body))
export const launchReviewCycle = (id: number) => apiFetch<ApiReviewCycle>(`${R}/cycles/${id}/launch`, json('POST', {}))
export const closeReviewCycle = (id: number) => apiFetch<ApiReviewCycle>(`${R}/cycles/${id}/close`, json('POST', {}))
export const advanceReviewCycle = (id: number, to: 'APPROVED' | 'ANNOUNCED') =>
  apiFetch<{ moved: number; cycle: ApiReviewCycle; assignments: ApiCycleAssignment[] }>(`${R}/cycles/${id}/advance`, json('POST', { to }))
export const fetchCycleAssignments = (id: number) => apiFetch<{ cycle: ApiReviewCycle; assignments: ApiCycleAssignment[] }>(`${R}/cycles/${id}/assignments`)
export const fetchMyReviews = () => apiFetch<{ available: boolean; reviews: ApiReviewRow[] }>(`${R}/mine`)
export const fetchTeamReviews = () => apiFetch<{ available: boolean; reviews: ApiReviewRow[] }>(`${R}/team`)
export const fetchReviewForm = (id: number) => apiFetch<ApiReviewForm>(`${R}/${id}`)
export const submitReview = (id: number, answers: ReviewAnswers, comment?: string) => apiFetch<ApiReviewForm>(`${R}/${id}/submit`, json('POST', { answers, ...(comment ? { comment } : {}) }))
export const acknowledgeReview = (id: number, comment?: string) => apiFetch<ApiReviewForm>(`${R}/${id}/acknowledge`, json('POST', comment ? { comment } : {}))
