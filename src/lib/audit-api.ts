// B2.1: سجل التدقيق المركزي — البحث (بصلاحية audit.view) وتسجيل التصدير من الشاشات. مسارات نسبية (لا @/).
import { apiFetch } from './api'

export type AuditCategory = 'LOGIN' | 'PERMISSIONS' | 'SETTINGS' | 'BANK_PAYROLL' | 'EXPORT' | 'PAYROLL'

export const AUDIT_CATEGORY_OPTIONS: Array<{ value: AuditCategory; label: string }> = [
  { value: 'LOGIN', label: 'الدخول' },
  { value: 'PERMISSIONS', label: 'الصلاحيات والنطاق' },
  { value: 'SETTINGS', label: 'الإعدادات والموديولات' },
  { value: 'BANK_PAYROLL', label: 'البيانات البنكية والرواتب' },
  { value: 'EXPORT', label: 'التصدير' },
  { value: 'PAYROLL', label: 'إجراءات المسير' },
]

export interface ApiAuditRow {
  id: string
  at: string
  category: AuditCategory
  categoryLabel: string
  action: string
  entityType: string | null
  entityId: string | null
  actorUserId: number | null
  actorName: string | null
  branchId: number | null
  summary: string | null
  before: unknown
  after: unknown
  ip: string | null
  userAgent: string | null
}

export interface ApiAuditPage {
  retentionMonths: number
  expired: boolean
  page: number
  pageSize: number
  total: number
  rows: ApiAuditRow[]
}

export interface AuditFilters { category?: string; from?: string; to?: string; q?: string; expired?: boolean; page?: number }

export const fetchAuditLog = (filters: AuditFilters) => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '' && value !== false) params.set(key, String(value))
  return apiFetch<ApiAuditPage>(`/audit${params.toString() ? `?${params}` : ''}`)
}

/** التصدير من الشاشة في سجل التدقيق (الشاشة واسم الملف وعدد الصفوف). في المتصفح بس، وفشله مايوقفش التنزيل */
export function recordScreenExport(filename: string, rows: number) {
  if (typeof window === 'undefined') return
  apiFetch('/audit/exports', { method: 'POST', body: JSON.stringify({ screen: window.location.pathname.slice(0, 200), filename: filename.slice(0, 200), rows }) })
    .catch(() => undefined)
}

/** قبل/بعد كنص قصير للجدول */
export const auditValueText = (value: unknown): string =>
  value == null ? '—' : typeof value === 'string' ? value : JSON.stringify(value)
