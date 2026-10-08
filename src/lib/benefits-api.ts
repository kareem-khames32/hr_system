// B5.2: «المزايا والتأمين الطبي» — موديول benefits (مقفول افتراضيًا). تعريف الوثائق والفئات لحساب بكل الفروع.
import { apiFetch } from './api'

export type PolicyState = 'UPCOMING' | 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'DISABLED'
export interface ApiInsuranceClass {
  id: number; name: string
  /** حصة الموظف الشهرية — بيان على الفئة (مفيش خصم من هنا) */
  employeeShareMonthly: number
  isDefault: boolean; isActive: boolean; gradeIds: number[]
}
export interface ApiInsurancePolicy {
  id: number; name: string; insurerName: string; policyNumber: string | null
  /** EG أو SA، أو null = لكل الشركة */
  country: string | null
  startDate: string; endDate: string; isActive: boolean; note: string | null
  state: PolicyState; stateLabel: string
  /** الأيام الباقية على نهاية الوثيقة (سالبة = انتهت) */
  daysLeft: number | null
  classes: ApiInsuranceClass[]
}
export interface ApiInsuranceOverview { ready: boolean; canEdit: boolean; policies: ApiInsurancePolicy[]; grades: Array<{ id: number; name: string }> }
export interface ApiEligibilityRow {
  employeeId: number; fullName: string; employeeCode: string | null; gradeName: string | null
  policyId: number | null; policyName: string | null; classId: number | null; className: string | null
  /** GRADE بدرجته · DEFAULT الفئة الافتراضية · null من غير فئة */
  by: 'GRADE' | 'DEFAULT' | null
}
export interface ApiEligibility { today: string; rows: ApiEligibilityRow[]; withoutPolicy: number; withoutClass: number }
export interface PolicyInput { name: string; insurerName: string; policyNumber?: string; country?: string | null; startDate: string; endDate: string; note?: string }
export interface ClassInput { name: string; employeeShareMonthly: number; isDefault: boolean; gradeIds: number[] }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const I = '/benefits/insurance'
export const fetchInsurance = () => apiFetch<ApiInsuranceOverview>(I)
export const createInsurancePolicy = (body: PolicyInput) => apiFetch<ApiInsuranceOverview>(`${I}/policies`, json('POST', body))
export const updateInsurancePolicy = (id: number, body: Partial<PolicyInput> & { isActive?: boolean }) => apiFetch<ApiInsuranceOverview>(`${I}/policies/${id}`, json('PATCH', body))
export const createInsuranceClass = (policyId: number, body: ClassInput) => apiFetch<ApiInsuranceOverview>(`${I}/policies/${policyId}/classes`, json('POST', body))
export const updateInsuranceClass = (id: number, body: Partial<ClassInput> & { isActive?: boolean }) => apiFetch<ApiInsuranceOverview>(`${I}/classes/${id}`, json('PATCH', body))
export const fetchInsuranceEligibility = () => apiFetch<ApiEligibility>(`${I}/eligibility`)

// ===== (ب) الاشتراكات وطلبات شركة التأمين =====

export type MemberRequestKind = 'ADD' | 'REMOVE'
export type MemberRequestStatus = 'PENDING' | 'SENT' | 'DONE' | 'CANCELLED'
export interface ApiInsuranceMember {
  employeeId: number; employeeName: string; employeeCode: string | null
  /** المعال، أو null = الموظف نفسه */
  dependentId: number | null
  memberName: string; relation: string | null
  enrollment: { id: number; policyName: string | null; className: string | null; cardNumber: string | null; startDate: string } | null
  openRequest: { id: number; kind: MemberRequestKind; kindLabel: string; status: MemberRequestStatus; statusLabel: string } | null
}
export interface ApiInsuranceRequest {
  id: number; kind: MemberRequestKind; kindLabel: string; status: MemberRequestStatus; statusLabel: string
  /** MANUAL من الشاشة · OFFBOARDING مع إنهاء الخدمة · DEPENDENT مع حذف المعال */
  origin: string; originLabel: string
  employeeId: number; employeeName: string; employeeCode: string | null; memberName: string; relation: string | null
  policyName: string | null; className: string | null; reason: string | null; effectiveDate: string | null; cardNumber: string | null
  createdAt: string; sentAt: string | null; closedAt: string | null
}
export interface ApiInsuranceMembers { ready: boolean; members: ApiInsuranceMember[]; requests: ApiInsuranceRequest[] }
export interface ApiInsuranceSheet {
  status: 'PENDING' | 'SENT'; statusLabel: string
  rows: Array<{ requestId: number; kind: MemberRequestKind; kindLabel: string; employeeName: string; employeeCode: string | null; memberName: string; memberNameEn: string | null; relation: string | null
    birthDate: string | null; nationalId: string | null; policyName: string | null; policyNumber: string | null; className: string | null; cardNumber: string | null; reason: string | null }>
}

export const fetchInsuranceMembers = () => apiFetch<ApiInsuranceMembers>(`${I}/members`)
export const fetchInsuranceSheet = (status: 'PENDING' | 'SENT') => apiFetch<ApiInsuranceSheet>(`${I}/sheet?status=${status}`)
export const requestInsuranceAdd = (employeeId: number, dependentId: number | null) => apiFetch<ApiInsuranceMembers>(`${I}/requests`, json('POST', { employeeId, ...(dependentId === null ? {} : { dependentId }) }))
export const requestInsuranceRemove = (enrollmentId: number, reason: string) => apiFetch<ApiInsuranceMembers>(`${I}/enrollments/${enrollmentId}/remove-request`, json('POST', { reason }))
export const sendInsuranceRequest = (id: number) => apiFetch<ApiInsuranceMembers>(`${I}/requests/${id}/send`, json('POST', {}))
export const doneInsuranceRequest = (id: number, effectiveDate: string, cardNumber: string) => apiFetch<ApiInsuranceMembers>(`${I}/requests/${id}/done`, json('POST', { effectiveDate, ...(cardNumber ? { cardNumber } : {}) }))
export const cancelInsuranceRequest = (id: number, reason: string) => apiFetch<ApiInsuranceMembers>(`${I}/requests/${id}/cancel`, json('POST', { reason }))
