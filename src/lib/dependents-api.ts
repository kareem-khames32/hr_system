// B3.14: سجل المعالين — «معاليني» للموظف، والقراءة والتعديل المباشر لصاحب الصلاحية (الخادم بيحكم النطاق).
import { apiFetch } from './api'

export type DependentRelation = 'SPOUSE' | 'SON' | 'DAUGHTER' | 'FATHER' | 'MOTHER' | 'OTHER'
export const DEPENDENT_RELATION_LABELS: Record<DependentRelation, string> = { SPOUSE: 'زوج/زوجة', SON: 'ابن', DAUGHTER: 'ابنة', FATHER: 'أب', MOTHER: 'أم', OTHER: 'أخرى' }
export type DependentGender = 'MALE' | 'FEMALE'
export const DEPENDENT_GENDER_LABELS: Record<DependentGender, string> = { MALE: 'ذكر', FEMALE: 'أنثى' }
export interface ApiDependent {
  id: number; employeeId: number; nameAr: string; nameEn: string | null; relation: DependentRelation; relationLabel: string; birthDate: string | null; nationalId: string | null
  gender: DependentGender | null; genderLabel: string | null; isInsured: boolean; documentId: number | null; idExpiryDate: string | null; status: 'ACTIVE' | 'REMOVED'
}
export interface DependentBody {
  nameAr?: string; nameEn?: string | null; relation?: DependentRelation; birthDate?: string | null; nationalId?: string | null; gender?: DependentGender | null; isInsured?: boolean; idExpiryDate?: string
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const D = '/dependents'
export const fetchMyDependents = () => apiFetch<{ available: boolean; dependents: ApiDependent[] }>(`${D}/mine`)
export const fetchEmployeeDependents = (employeeId: number) => apiFetch<{ available: boolean; message?: string; dependents: ApiDependent[] }>(`${D}?employeeId=${employeeId}`)
export const addDependent = (employeeId: number, body: DependentBody) => apiFetch<ApiDependent>(D, json('POST', { employeeId, ...body }))
export const updateDependent = (id: number, body: DependentBody) => apiFetch<ApiDependent>(`${D}/${id}`, json('PATCH', body))
export const removeDependent = (id: number, reason: string) => apiFetch<{ removed: boolean }>(`${D}/${id}/remove`, json('POST', { reason }))
