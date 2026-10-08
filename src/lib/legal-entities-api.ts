// B4.1: الكيانات القانونية — لحساب نطاقه الشركة كلها بصلاحية الإعدادات؛ وتحذير المسيرات اللي بتجمع أكتر من كيان لقارئ الرواتب.
import { apiFetch } from './api'

export type EntityCountry = 'EG' | 'SA'
export const ENTITY_COUNTRY_LABELS: Record<EntityCountry, string> = { EG: 'مصر', SA: 'السعودية' }
export interface ApiLegalEntity {
  id: number; name: string; nameEn: string | null; country: EntityCountry; currency: 'EGP' | 'SAR'; timeZone: string | null; commercialRegister: string | null; taxNumber: string | null
  insuranceNumber: string | null; qiwaNumber: string | null; payrollBankName: string | null; payrollIban: string | null; wpsNumber: string | null; cycleStartDay: number | null; isActive: boolean
  gaps: string[]; branches: Array<{ id: number; name: string }>
}
export interface ApiLegalEntities {
  available: boolean; message?: string; entities: ApiLegalEntity[]; unlinkedBranches: Array<{ id: number; name: string; country: EntityCountry | null }>
}
export interface LegalEntityBody {
  name?: string; nameEn?: string | null; country?: EntityCountry; timeZone?: string | null; commercialRegister?: string | null; taxNumber?: string | null; insuranceNumber?: string | null
  qiwaNumber?: string | null; payrollBankName?: string | null; payrollIban?: string | null; wpsNumber?: string | null; cycleStartDay?: number | null; isActive?: boolean
}
export interface ApiEntityWarning { runId: number; name: string | null; period: string; entities: string[] }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const L = '/settings/legal-entities'
export const fetchLegalEntities = () => apiFetch<ApiLegalEntities>(L)
export const createLegalEntity = (body: LegalEntityBody) => apiFetch<ApiLegalEntity>(L, json('POST', body))
export const updateLegalEntity = (id: number, body: LegalEntityBody) => apiFetch<ApiLegalEntity>(`${L}/${id}`, json('PATCH', body))
export const linkBranchEntity = (branchId: number, legalEntityId: number | null) => apiFetch<ApiLegalEntities>(`${L}/branches/${branchId}`, json('PUT', { legalEntityId }))
export const fetchPayrollEntityWarnings = () => apiFetch<{ warnings: ApiEntityWarning[] }>('/payroll/runs/entity-warnings')
