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
