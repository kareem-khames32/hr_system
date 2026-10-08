// B3.10: مركز خدمات الموارد البشرية — استفسارات الموظف بحالة خدمتها وتقييمه، وتقرير الاستفسارات (بالصلاحية). الاستفسار نفسه طلب عادي بيتقدّم من «الطلبات».
import { apiFetch } from './api'

export interface ApiInquiry {
  id: number; typeName: string; subject: string; createdAt: string; serviceStatus: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'CANCELLED'; serviceStatusLabel: string
  dueDate: string | null; rating: number | null; ratingComment: string | null; canRate: boolean
}
export interface HelpdeskSummary {
  total: number; open: number; resolved: number; avgFirstResponseHours: number | null; avgResolutionHours: number | null
  firstResponseBreached: number; resolutionBreached: number; rated: number; satisfaction: number | null
}
export interface ApiHelpdeskReport { from: string; to: string; firstResponseLimitHours: number; totals: HelpdeskSummary; types: Array<HelpdeskSummary & { code: string; name: string }> }

const H = '/helpdesk'
export const fetchMyInquiries = () => apiFetch<{ available: boolean; inquiries: ApiInquiry[] }>(`${H}/mine`)
export const rateInquiry = (id: number, rating: number, comment?: string) =>
  apiFetch<{ available: boolean; inquiries: ApiInquiry[] }>(`${H}/${id}/rate`, { method: 'POST', body: JSON.stringify({ rating, ...(comment ? { comment } : {}) }) })
export const fetchHelpdeskReport = (range?: { from: string; to: string }) => apiFetch<ApiHelpdeskReport>(`${H}/report${range ? `?from=${range.from}&to=${range.to}` : ''}`)
