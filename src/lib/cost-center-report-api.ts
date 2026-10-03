// تقرير مراكز التكلفة لشهر رواتب — GET /reports/cost-centers (نطاق الفرع من الخادم)
import { apiFetch } from './api'
import { downloadCsv } from './csv'
import { currencyLabel } from './currency'
import { currencyTotalRows } from './currency-totals'
import { appendOrgFilterParams, type OrgFilterParams } from './org-filter'

export interface CostCenterReportEmployee {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null
  runId: number; runName: string | null; runStatus: string
  gross: string; deductions: string; net: string; employerInsurance: string | null
  // B1.1: عملة فرع الموظف في لقطة المسير
  currency?: string | null
}

export interface CostCenterReportGroup {
  costCenterId: number | null; code: string | null; name: string
  headcount: number; gross: string; deductions: string; net: string; employerInsurance: string | null
  employees: CostCenterReportEmployee[]
  // عملة المركز لو كل موظفينه بعملة واحدة، وإلا null (مركز على فرعين بعملتين)
  currency?: string | null
}

export interface CostCenterReport {
  period: string; branchId: number | null; includeDraft: boolean; employerInsuranceAvailable: boolean
  centers: CostCenterReportGroup[]
  totals: { headcount: number; gross: string; deductions: string; net: string; employerInsurance: string | null }
  // B1.1: نفس الإجمالي لكل عملة لوحدها
  byCurrency?: Array<{ currency: string; totals: CostCenterReport['totals'] }>
}

// org = فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (org.params) — الخادم بيضيّق بيه فوق نطاق الفرع
export function fetchCostCenterReport(params: { period: string; branchId?: string; includeDraft?: boolean; org?: OrgFilterParams }) {
  const query = new URLSearchParams({ period: params.period })
  if (params.branchId) query.set('branchId', params.branchId)
  appendOrgFilterParams(query, params.org)
  if (params.includeDraft) query.set('includeDraft', 'true')
  return apiFetch<CostCenterReport>(`/reports/cost-centers?${query.toString()}`)
}

export const RUN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة', CALCULATED: 'محسوب (مسودة)', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى',
}

const dash = (value: string | null) => value ?? '—'

/** CSV: سطر لكل موظف تحت مركزه، وبعده سطر إجمالي المركز، وفي الآخر إجمالي الشهر. */
export function exportCostCenterReportCsv(report: CostCenterReport) {
  const header = ['مركز التكلفة', 'الكود', 'كود الموظف', 'الموظف', 'الفرع', 'المسير', 'حالة المسير', 'الإجمالي', 'الخصومات', 'الصافي', 'حصة صاحب العمل في التأمينات', 'العملة']
  const rows: unknown[][] = []
  for (const center of report.centers) {
    for (const employee of center.employees) {
      rows.push([center.name, center.code ?? '', employee.employeeCode ?? '', employee.fullName ?? '', employee.branchName ?? '',
        employee.runName || `#${employee.runId}`, RUN_STATUS_LABELS[employee.runStatus] ?? employee.runStatus,
        employee.gross, employee.deductions, employee.net, dash(employee.employerInsurance)])
    }
    rows.push([`إجمالي ${center.name}`, center.code ?? '', '', `${center.headcount} موظف`, '', '', '', center.gross, center.deductions, center.net, dash(center.employerInsurance), center.currency ? currencyLabel(center.currency) : ''])
  }
  // إجمالي الشهر لكل عملة لوحده (والإجمالي العام لو عملة واحدة)
  const perCurrency = currencyTotalRows(report.byCurrency)
  const totals = perCurrency.length ? perCurrency.map((group) => ({ label: `إجمالي الشهر ${group.label}`, currency: group.label, totals: group.totals }))
    : [{ label: 'إجمالي الشهر', currency: currencyLabel(report.byCurrency?.[0]?.currency), totals: report.totals }]
  for (const line of totals) {
    rows.push([line.label, '', '', `${line.totals.headcount} موظف`, '', '', '', line.totals.gross, line.totals.deductions, line.totals.net, dash(line.totals.employerInsurance), line.currency])
  }
  downloadCsv(`cost-centers-${report.period}.csv`, header, rows)
}
