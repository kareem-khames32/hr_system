// B3.2: الوظائف الشاغرة — القايمة والنموذج والإنشاء والتعديل والحالة (الخادم بيحكم: صلاحية إدارة التوظيف ونطاق فروع الحساب)
import { apiFetch } from './api'

export type RecruitmentJobStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED'

export interface ApiRecruitmentJob {
  id: number; code: string; title: string
  branchId: number; branchName: string; departmentId: number | null; departmentName: string | null
  openings: number; reason: string | null
  /** نطاق الراتب المعروض: نص بخانتين أو null (للعرض بس) */
  salaryFrom: string | null; salaryTo: string | null; startDate: string | null
  description: string | null; requirements: string | null
  status: RecruitmentJobStatus; statusLabel: string; internal: boolean; external: boolean
  /** الطلب اللي اتعملت منه الوظيفة (احتياج معتمد)، أو null لو من الشاشة */
  requestId: number | null; publishedAt: string | null; closedAt: string | null; createdAt: string
}
export interface ApiRecruitmentJobsList { available: boolean; message?: string; canManage: boolean; jobs: ApiRecruitmentJob[] }
export interface ApiRecruitmentJobForm {
  branches: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string; branchId: number }>
  jobTitles: Array<{ id: number; title: string }>
}
export interface RecruitmentJobBody {
  title: string; branchId: number; departmentId: number | null; openings: number; reason: string | null
  salaryFrom: string | null; salaryTo: string | null; startDate: string | null
  description: string | null; requirements: string | null; internal: boolean; external: boolean
}

/** الانتقالات المسموحة (نفس حكم الخادم): مسودة ← منشورة/مقفولة، منشورة ↔ موقوفة، والمقفولة نهائية */
export const RECRUITMENT_JOB_NEXT: Record<RecruitmentJobStatus, Array<{ status: RecruitmentJobStatus; label: string }>> = {
  DRAFT: [{ status: 'PUBLISHED', label: 'نشر' }, { status: 'CLOSED', label: 'قفل' }],
  PUBLISHED: [{ status: 'PAUSED', label: 'إيقاف' }, { status: 'CLOSED', label: 'قفل' }],
  PAUSED: [{ status: 'PUBLISHED', label: 'رجوع للنشر' }, { status: 'CLOSED', label: 'قفل' }],
  CLOSED: [],
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const fetchRecruitmentJobs = () => apiFetch<ApiRecruitmentJobsList>('/recruitment/jobs')
export const fetchRecruitmentJobForm = () => apiFetch<ApiRecruitmentJobForm>('/recruitment/jobs/form')
export const createRecruitmentJob = (body: RecruitmentJobBody) => apiFetch<ApiRecruitmentJob>('/recruitment/jobs', json('POST', body))
/** التعديل بالخانات: الفرع والقسم مابيتبعتوش (مابيتغيّروش) */
export const updateRecruitmentJob = (id: number, body: Partial<Omit<RecruitmentJobBody, 'branchId' | 'departmentId'>>) =>
  apiFetch<ApiRecruitmentJob>(`/recruitment/jobs/${id}`, json('PATCH', body))
export const setRecruitmentJobStatus = (id: number, status: RecruitmentJobStatus) =>
  apiFetch<ApiRecruitmentJob>(`/recruitment/jobs/${id}/status`, json('POST', { status }))
