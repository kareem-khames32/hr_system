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

// B3.10-ب: قاعدة المعرفة — الموظف بيدوّر ويقرا المنشور اللي في جمهوره؛ والإدارة بصلاحية مركز الخدمات
export interface ApiArticleSummary { id: number; title: string; typeCode: string | null; typeName: string | null; excerpt: string; hasPolicy: boolean }
export interface ApiArticle { id: number; title: string; body: string; typeCode: string | null; typeName: string | null; policy: { id: number; title: string } | null; updatedAt: string }
export interface ArticleAudience { mode: string; ids?: string[]; where?: { mode: string; ids: number[] } | null }
export interface ApiManagedArticle {
  id: number; title: string; body: string; typeCode: string | null; typeName: string | null; keywords: string | null; audience: ArticleAudience | null
  policyId: number | null; policyTitle: string | null; isPublished: boolean; updatedAt: string
}
export interface ArticleBody { title?: string; body?: string; typeCode?: string | null; keywords?: string | null; audience?: ArticleAudience | null; policyId?: number | null; isPublished?: boolean }
export const searchArticles = (q: string, typeCode: string) => {
  const query = new URLSearchParams()
  if (q) query.set('q', q)
  if (typeCode) query.set('typeCode', typeCode)
  const text = query.toString()
  return apiFetch<{ articles: ApiArticleSummary[]; types: Array<{ code: string; name: string }> }>(`${H}/articles${text ? `?${text}` : ''}`)
}
export const fetchArticle = (id: number) => apiFetch<ApiArticle>(`${H}/articles/${id}`)
export const fetchManagedArticles = () => apiFetch<{ available: boolean; message?: string; articles: ApiManagedArticle[]; types: Array<{ code: string; name: string }> }>(`${H}/articles/manage`)
export const createArticle = (body: ArticleBody) => apiFetch<ApiManagedArticle>(`${H}/articles`, { method: 'POST', body: JSON.stringify(body) })
export const updateArticle = (id: number, body: ArticleBody) => apiFetch<ApiManagedArticle>(`${H}/articles/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
