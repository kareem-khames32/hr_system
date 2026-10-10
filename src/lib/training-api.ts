// B3.9: التدريب — الكتالوج والجلسات والتسجيل والشهادات (لإدارة التدريب)، و«دوراتي» وتقييم التدريب للموظف (الخادم بيحكم).
import { apiFetch } from './api'

export type TrainingCourseKind = 'INTERNAL' | 'EXTERNAL' | 'ONLINE'
export const TRAINING_KIND_LABELS: Record<TrainingCourseKind, string> = { INTERNAL: 'داخلي', EXTERNAL: 'خارجي', ONLINE: 'أونلاين' }
export interface ApiTrainingCourse {
  id: number; name: string; kind: TrainingCourseKind; kindLabel: string; url: string | null; durationHours: number | null; provider: string | null; description: string | null
  givesCertificate: boolean; certificateValidMonths: number | null; isActive: boolean
}
export interface CourseBody {
  name: string; kind: TrainingCourseKind; url?: string | null; durationHours?: number | null; provider?: string | null; description?: string | null
  givesCertificate: boolean; certificateValidMonths?: number | null
}
export type TrainingSessionStatus = 'PLANNED' | 'DONE' | 'CANCELLED'
export interface ApiTrainingSession {
  id: number; courseId: number; courseName: string; kindLabel: string | null; givesCertificate: boolean; branchId: number | null; branchName: string | null
  startDate: string; endDate: string; location: string | null; trainer: string | null; capacity: number | null; costPerSeat: string | null
  status: TrainingSessionStatus; statusLabel: string; counts: { seats: number; attended: number; completed: number }
}
export interface SessionBody { courseId: number; branchId?: number | null; startDate: string; endDate: string; location?: string | null; trainer?: string | null; capacity?: number | null; costPerSeat?: string | null }
export type TrainingEnrollmentStatus = 'ENROLLED' | 'ATTENDED' | 'COMPLETED' | 'ABSENT' | 'CANCELLED'
export interface ApiTrainingEnrollment {
  id: number; employeeId: number; employeeName: string | null; status: TrainingEnrollmentStatus; statusLabel: string; result: string | null
  rating: number | null; ratingComment: string | null; fromRequest: boolean; completedAt: string | null
  certificate: { issueDate: string | null; expiryDate: string | null } | null
}
export interface ApiSessionDetail { session: ApiTrainingSession; hidden: number; enrollments: ApiTrainingEnrollment[] }
export interface ApiMyTraining extends ApiTrainingEnrollment {
  courseName: string; kindLabel: string | null; url: string | null; durationHours: number | null; provider: string | null; startDate: string; endDate: string
  location: string | null; trainer: string | null; sessionStatus: TrainingSessionStatus; sessionStatusLabel: string; canRate: boolean
}
export interface ApiTrainingCertificate { enrollmentId: number; employeeName: string; courseName: string; issueDate: string | null; expiryDate: string | null; expired: boolean }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const T = '/training'

export const fetchTrainingCourses = () => apiFetch<{ available: boolean; message?: string; courses: ApiTrainingCourse[] }>(`${T}/courses`)
export const createTrainingCourse = (body: CourseBody) => apiFetch<ApiTrainingCourse>(`${T}/courses`, json('POST', body))
export const updateTrainingCourse = (id: number, body: Partial<CourseBody> & { isActive?: boolean }) => apiFetch<ApiTrainingCourse>(`${T}/courses/${id}`, json('PATCH', body))
export const fetchTrainingSessions = () => apiFetch<{ available: boolean; message?: string; canCompany: boolean; sessions: ApiTrainingSession[] }>(`${T}/sessions`)
export const createTrainingSession = (body: SessionBody) => apiFetch<ApiTrainingSession>(`${T}/sessions`, json('POST', body))
export const fetchTrainingSession = (id: number) => apiFetch<ApiSessionDetail>(`${T}/sessions/${id}`)
export const updateTrainingSession = (id: number, body: Partial<SessionBody> & { status?: TrainingSessionStatus }) => apiFetch<ApiSessionDetail>(`${T}/sessions/${id}`, json('PATCH', body))
// B-ADD.1: تسجيل مجموعة بالاستهداف الموحد (الخادم بيفكّها لموظفينها الحاليين جوه نطاق الحساب)
export const enrollAudienceInTraining = (id: number, audience: unknown) =>
  apiFetch<ApiSessionDetail & { enrolled: number; already: number }>(`${T}/sessions/${id}/enroll`, json('POST', { audience }))
export const enrollInTraining = (id: number, employeeIds: number[]) => apiFetch<ApiSessionDetail & { enrolled: number; already: number }>(`${T}/sessions/${id}/enroll`, json('POST', { employeeIds }))
export const markTrainingEnrollment = (id: number, status: Exclude<TrainingEnrollmentStatus, 'ENROLLED'>, result?: string) =>
  apiFetch<ApiSessionDetail>(`${T}/enrollments/${id}/mark`, json('POST', { status, ...(result ? { result } : {}) }))
export const fetchTrainingCertificates = () => apiFetch<{ available: boolean; message?: string; certificates: ApiTrainingCertificate[] }>(`${T}/certificates`)
export const fetchMyTraining = () => apiFetch<{ available: boolean; enrollments: ApiMyTraining[] }>(`${T}/mine`)
export const rateTraining = (id: number, rating: number, comment?: string) => apiFetch<{ available: boolean; enrollments: ApiMyTraining[] }>(`${T}/enrollments/${id}/rate`, json('POST', { rating, ...(comment ? { comment } : {}) }))

// B3.9-ج: ميزانية تدريب الأقسام وتقرير التكلفة مقابلها، والتدريب الإلزامي والناقص منه
export interface ApiTrainingBudget {
  available: boolean; message?: string; year: number
  rows: Array<{ departmentId: number; departmentName: string; branchName: string | null; hasBudget: boolean; budget: string; spent: string; remaining: string; seats: number; over: boolean }>
  totals: { budget: string; spent: string; remaining: string; seats: number }
}
export interface ApiTrainingMissing { employeeName: string; departmentName: string | null; courseName: string; enrolled: boolean }
export interface ApiTrainingRequirements {
  available: boolean; message?: string; canCompany: boolean
  requirements: Array<{ id: number; courseId: number; courseName: string; jobTitle: string | null; departmentId: number | null; departmentName: string | null; canRemove: boolean }>
  missing: ApiTrainingMissing[]
}
export const fetchTrainingBudget = (year: number) => apiFetch<ApiTrainingBudget>(`${T}/budget?year=${year}`)
export const setTrainingBudget = (year: number, departmentId: number, budget: string) => apiFetch<ApiTrainingBudget>(`${T}/budget`, json('PUT', { year, departmentId, budget }))
export const fetchTrainingRequirements = () => apiFetch<ApiTrainingRequirements>(`${T}/requirements`)
export const addTrainingRequirement = (body: { courseId: number; jobTitle?: string; departmentId?: number }) => apiFetch<ApiTrainingRequirements>(`${T}/requirements`, json('POST', body))
export const removeTrainingRequirement = (id: number) => apiFetch<ApiTrainingRequirements>(`${T}/requirements/${id}`, { method: 'DELETE' })
export const fetchTeamTrainingMissing = () => apiFetch<{ missing: ApiTrainingMissing[] }>(`${T}/mandatory/team`)
