// B4.3: «بنود الراتب» — وصف كل بند في القسيمة (نوعه، خاضع للتأمين والضريبة، التناسب، الترتيب). العرض بصلاحية الإعدادات، والتعديل لحساب بكل الفروع.
import { apiFetch } from './api'

export interface ApiSalaryItem {
  id: number; code: string; nameAr: string; nameEn: string; kind: 'EARNING' | 'DEDUCTION'
  insurable: boolean; taxable: boolean; proration: 'SERVICE_DAYS' | 'NONE'; sortOrder: number
  /** بند قانوني (تأمينات، ضريبة، صناديق) */
  statutory: boolean
  /** false = لسه مش بيتحسب في المسير */
  computed: boolean
}
export interface ApiSalaryItems { available: boolean; canEdit: boolean; items: ApiSalaryItem[] }

const S = '/settings/salary-items'
export const fetchSalaryItems = () => apiFetch<ApiSalaryItems>(S)
export const updateSalaryItem = (id: number, body: { sortOrder?: number; insurable?: boolean; taxable?: boolean }) =>
  apiFetch<ApiSalaryItems>(`${S}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
