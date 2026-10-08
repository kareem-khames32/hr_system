// B4.6 (ب): «البنوك» — جدول البنوك بأكوادها في الآيبان. العرض بصلاحية الإعدادات، والإضافة والتعديل لحساب بكل الفروع.
import { apiFetch } from './api'

export interface ApiBank {
  id: number; country: 'EG' | 'SA'
  /** كود البنك زي ما بيظهر في الآيبان (السعودي رقمين، المصري 4 أرقام) */
  ibanCode: string
  nameAr: string; nameEn: string | null; swiftCode: string | null; isActive: boolean
}
export interface ApiBanks { available: boolean; canEdit: boolean; banks: ApiBank[] }

const S = '/settings/banks'
export const fetchBanks = () => apiFetch<ApiBanks>(S)
export const createBank = (body: { country: string; ibanCode: string; nameAr: string; nameEn?: string; swiftCode?: string }) =>
  apiFetch<ApiBanks>(S, { method: 'POST', body: JSON.stringify(body) })
export const updateBank = (id: number, body: { nameAr?: string; nameEn?: string; swiftCode?: string; isActive?: boolean }) =>
  apiFetch<ApiBanks>(`${S}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
