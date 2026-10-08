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
