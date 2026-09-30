// لوحة التقارير بالفلتر الموحد («الفرع ← الإدارة ← القسم ← الفريق» — طلب المالك 30 سبتمبر): التعداد والإجازات والرواتب والطلبات
// أرقام مجمّعة في الخادم، فالفلتر بيتبعت له (org.params) والخادم بيضيّق بيه فوق نطاق الفرع. من غير فلتر = نفس النداءات القديمة بالظبط.
import { apiFetch } from './api'
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
