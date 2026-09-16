// تقرير مراكز التكلفة لشهر رواتب — GET /reports/cost-centers (نطاق الفرع من الخادم)
import { apiFetch } from './api'
import { downloadCsv } from './csv'

export interface CostCenterReportEmployee {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null
  runId: number; runName: string | null; runStatus: string
  gross: string; deductions: string; net: string; employerInsurance: string | null
}

export interface CostCenterReportGroup {
  costCenterId: number | null; code: string | null; name: string
  headcount: number; gross: string; deductions: string; net: string; employerInsurance: string | null
  employees: CostCenterReportEmployee[]
}

export interface CostCenterReport {
  period: string; branchId: number | null; includeDraft: boolean; employerInsuranceAvailable: boolean
  centers: CostCenterReportGroup[]
  totals: { headcount: number; gross: string; deductions: string; net: string; employerInsurance: string | null }
}

export function fetchCostCenterReport(params: { period: string; branchId?: string; includeDraft?: boolean }) {
  const query = new URLSearchParams({ period: params.period })
  if (params.branchId) query.set('branchId', params.branchId)
  if (params.includeDraft) query.set('includeDraft', 'true')
  return apiFetch<CostCenterReport>(`/reports/cost-centers?${query.toString()}`)
}

export const RUN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة', CALCULATED: 'محسوب (مسودة)', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى',
}

const dash = (value: string | null) => value ?? '—'

/** CSV: سطر لكل موظف تحت مركزه، وبعده سطر إجمالي المركز، وفي الآخر إجمالي الشهر. */
export function exportCostCenterReportCsv(report: CostCenterReport) {
  const header = ['مركز التكلفة', 'الكود', 'كود الموظف', 'الموظف', 'الفرع', 'المسير', 'حالة المسير', 'الإجمالي', 'الخصومات', 'الصافي', 'حصة صاحب العمل في التأمينات']
  const rows: unknown[][] = []
  for (const center of report.centers) {
    for (const employee of center.employees) {
      rows.push([center.name, center.code ?? '', employee.employeeCode ?? '', employee.fullName ?? '', employee.branchName ?? '',
        employee.runName || `#${employee.runId}`, RUN_STATUS_LABELS[employee.runStatus] ?? employee.runStatus,
        employee.gross, employee.deductions, employee.net, dash(employee.employerInsurance)])
    }
    rows.push([`إجمالي ${center.name}`, center.code ?? '', '', `${center.headcount} موظف`, '', '', '', center.gross, center.deductions, center.net, dash(center.employerInsurance)])
  }
  rows.push(['إجمالي الشهر', '', '', `${report.totals.headcount} موظف`, '', '', '', report.totals.gross, report.totals.deductions, report.totals.net, dash(report.totals.employerInsurance)])
  downloadCsv(`cost-centers-${report.period}.csv`, header, rows)
}
