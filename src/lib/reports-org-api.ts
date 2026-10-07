// لوحة التقارير بالفلتر الموحد («الفرع ← الإدارة ← القسم ← الفريق» — طلب المالك 30 سبتمبر): التعداد والإجازات والرواتب والطلبات
// أرقام مجمّعة في الخادم، فالفلتر بيتبعت له (org.params) والخادم بيضيّق بيه فوق نطاق الفرع. من غير فلتر = نفس النداءات القديمة بالظبط.
import { apiFetch, downloadApiFile, type ApiBankSheet } from './api'
import { orgFilterQuery, type OrgFilterParams } from './org-filter'

const withOrg = (path: string, params: OrgFilterParams, base?: URLSearchParams) => {
  const query = new URLSearchParams(base)
  for (const [key, value] of new URLSearchParams(orgFilterQuery(params))) query.set(key, value)
  const text = query.toString()
  return `${path}${text ? `?${text}` : ''}`
}

export const fetchHeadcountReportFor = (params: OrgFilterParams) => apiFetch<any>(withOrg('/reports/headcount', params))
export const fetchLeavesReportFor = (year: string, params: OrgFilterParams) =>
  apiFetch<any>(withOrg('/reports/leaves', params, new URLSearchParams({ year })))
export const fetchPayrollReportFor = (params: OrgFilterParams) => apiFetch<any>(withOrg('/reports/payroll', params))
export const fetchRequestsReportFor = (params: OrgFilterParams) => apiFetch<any>(withOrg('/reports/requests', params))

// B2.13: مؤشرات القاموس بقيمها (شهر الرواتب الجاري) بنفس فلتر اللوحة — التعريف المكتوب جاي من الخادم مع الرقم
export interface ReportMetric {
  key: string; label: string; unit: 'count' | 'percent' | 'hours' | 'money'; definition: string; period: boolean
  value: number | null
  byCurrency?: Array<{ currency: string; value: string; employees: number }>
}
export interface ReportMetrics { period: string; from: string; to: string; date: string; metrics: ReportMetric[] }
export const fetchReportMetricsFor = (params: OrgFilterParams) => apiFetch<ReportMetrics>(withOrg('/reports/metrics', params))

/** قيمة المؤشر بوحدته؛ «—» لما مفيش رقم يتقال (مقام صفر أو مفيش مسيرات). currencyName = اسم العملة المعروض. */
export function reportMetricText(metric: ReportMetric, currencyName: (code: string) => string = (code) => code): string {
  if (metric.unit === 'money') {
    return metric.byCurrency?.length
      ? metric.byCurrency.map((group) => `${Number(group.value).toLocaleString('en-US')} ${currencyName(group.currency)}`.trim()).join(' + ')
      : '—'
  }
  if (metric.value === null) return '—'
  return metric.unit === 'percent' ? `${metric.value}%` : Number(metric.value).toLocaleString('en-US')
}

// B2.13: تصدير تقرير من الخادم (Excel أو PDF) بنفس فلتر اللوحة: الخادم بيبنيه من دالة التقرير نفسها (صلاحية ونطاق) وبيسجّله في التدقيق
export type ReportExportFormat = 'xlsx' | 'pdf'
export const exportReportFor = (report: string, format: ReportExportFormat, params: OrgFilterParams, extra: Record<string, string> = {}) =>
  downloadApiFile(withOrg('/reports/export', params, new URLSearchParams({ report, format, ...extra })), `report-${report}.${format}`, 'تعذّر تصدير التقرير')

// كشف البنوك بالفلتر الموحد: الخادم بيفلتر بمكان الموظف في لقطة المسير (CR21-B02) وبيحسب الإجماليات من الصفوف المفلترة
export const fetchBankSheetFor = (runId: number, params: OrgFilterParams) =>
  apiFetch<ApiBankSheet>(withOrg(`/payroll/runs/${runId}/bank-sheet`, params))

// B2.13-ب: التقارير المحفوظة — فلاتر باسم لصاحبها بس، وتنزيلها ودورية إرسالها بالبريد
export type SavedReportFrequency = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type SavedReportPeriod = 'current' | 'previous'
export const SAVED_REPORT_PERIOD_LABELS: Record<SavedReportPeriod, string> = { current: 'شهر الرواتب الجاري', previous: 'شهر الرواتب السابق' }
/** التقارير اللي ليها فترة (الباقي لحظي أو بالسنة الجارية) */
export const SAVED_REPORT_PERIOD_REPORTS: readonly string[] = ['attendance', 'overtime', 'metrics']
export interface SavedReportItem {
  id: number; name: string; report: string; reportTitle: string; period: SavedReportPeriod | null; filtered: boolean
  frequency: SavedReportFrequency; format: ReportExportFormat; lastSentOn: string | null; lastError: string | null
}
export interface SavedReportsList {
  ready: boolean; migrationMessage: string | null; mailReady: boolean; max: number; sendHour: number
  /** معاه صلاحية حفظ التقارير وجدولتها (reports.save)؟ غير كده قراءة وتنزيل بس */
  canSave: boolean
  frequencies: Record<SavedReportFrequency, string>; items: SavedReportItem[]
}
export const fetchSavedReports = () => apiFetch<SavedReportsList>('/reports/saved')
export const createSavedReport = (
  body: { name: string; report: string; period: SavedReportPeriod; frequency: SavedReportFrequency; format: ReportExportFormat }, params: OrgFilterParams
) => apiFetch<SavedReportItem>('/reports/saved', { method: 'POST', body: JSON.stringify({ ...body, ...Object.fromEntries(new URLSearchParams(orgFilterQuery(params))) }) })
export const updateSavedReport = (id: number, body: Partial<{ name: string; frequency: SavedReportFrequency; format: ReportExportFormat }>) =>
  apiFetch<SavedReportItem>(`/reports/saved/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteSavedReport = (id: number) => apiFetch<{ ok: boolean }>(`/reports/saved/${id}`, { method: 'DELETE' })
export const exportSavedReport = (id: number, format: ReportExportFormat) =>
  downloadApiFile(`/reports/saved/${id}/export?format=${format}`, `saved-report.${format}`, 'تعذّر تنزيل التقرير المحفوظ')
