// B2.15: صلاحية المستندات — إعدادات انتهاء نوع المستند، وتقرير «هينتهي / منتهي» بالفرع
import { apiFetch } from './api'

export interface DocTypeExpiry {
  id: number; code: string; nameAr: string; isActive: boolean
  /** تاريخ الانتهاء إلزامي لمستندات النوع */
  hasExpiry: boolean
  /** أيام التنبيه قبل الانتهاء، من الأكبر للأصغر (الافتراضي 30) */
  alertDays: number[]
  /** الدور المسؤول عن التجديد (مهمة عليه)، أو null */
  ownerRole: string | null
}
export interface DocTypeExpirySettings { ready: boolean; roles: Array<{ role: string; label: string }>; types: DocTypeExpiry[] }
export const fetchDocTypeExpiry = () => apiFetch<DocTypeExpirySettings>('/documents/expiry-settings')
export const updateDocTypeExpiry = (id: number, body: Partial<{ hasExpiry: boolean; alertDays: string | null; ownerRole: string | null }>) =>
  apiFetch<DocTypeExpiry>(`/documents/expiry-settings/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export interface DocumentExpiryRow {
  id: number; employeeId: number; employeeCode: string; employeeName: string; branchId: number | null; branchName: string | null
  docType: string; typeName: string; expiryDate: string; daysLeft: number; state: 'EXPIRED' | 'EXPIRING'
  ownerRole: string | null; ownerRoleLabel: string | null
  renewalTask: { id: number; status: string } | null
}
export interface DocumentExpiryReport { date: string; days: number; summary: { expired: number; expiring: number }; rows: DocumentExpiryRow[] }
export const fetchDocumentExpiry = (days: number, branchId?: number | null) =>
  apiFetch<DocumentExpiryReport>(`/documents/expiry?days=${days}${branchId ? `&branchId=${branchId}` : ''}`)

/** حالة مهمة التجديد كنص */
export function renewalTaskText(row: Pick<DocumentExpiryRow, 'ownerRoleLabel' | 'renewalTask'>): string {
  if (!row.ownerRoleLabel) return 'من غير مسؤول'
  if (!row.renewalTask) return `${row.ownerRoleLabel} — لسه من غير مهمة`
  return `${row.ownerRoleLabel} — ${['OPEN', 'IN_PROGRESS', 'WAITING'].includes(row.renewalTask.status) ? 'مهمة تجديد مفتوحة' : 'المهمة اتقفلت'}`
}
