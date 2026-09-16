import { apiFetch } from './api'

// تبويبات شاشة المسير: المدرجين بالمسير، موظفين ليس لديهم مسير، التضارب، الاستقطاعات و«شيل خصم»

export type DeductionKind =
  | 'LATENESS' | 'EARLY_LEAVE' | 'SHORTFALL' | 'ABSENCE' | 'UNPAID_LEAVE' | 'SUSPENSION' | 'SICK_LEAVE'
  | 'LOAN' | 'TYPED_DEDUCTION' | 'SOCIAL_INSURANCE' | 'OTHER'

export const DEDUCTION_KINDS: DeductionKind[] = ['LATENESS', 'EARLY_LEAVE', 'SHORTFALL', 'ABSENCE', 'UNPAID_LEAVE', 'SUSPENSION', 'SICK_LEAVE',
  'LOAN', 'TYPED_DEDUCTION', 'SOCIAL_INSURANCE', 'OTHER']

export const DEDUCTION_KIND_LABELS: Record<DeductionKind, string> = {
  LATENESS: 'التأخير',
  EARLY_LEAVE: 'الخروج المبكر',
  SHORTFALL: 'نقص الساعات',
  ABSENCE: 'الغياب',
  UNPAID_LEAVE: 'إجازة بدون راتب',
  SUSPENSION: 'أيام الإيقاف',
  SICK_LEAVE: 'خصم الإجازة المرضية',
  LOAN: 'أقساط السلف',
  TYPED_DEDUCTION: 'الخصومات المسجلة',
  SOCIAL_INSURANCE: 'التأمينات (حصة الموظف)',
  OTHER: 'خصومات أخرى',
}

export interface OverviewIncludedRow {
  employeeId: number; employeeCode: string; fullName: string
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  runId: number; runName: string | null; runStatus: string; startDate: string; endDate: string
}
export interface OverviewIncluded { period: string; runs: number; employees: number; rows: OverviewIncludedRow[] }

export interface OverviewUnassignedRow {
  employeeId: number; employeeCode: string; fullName: string; hireDate: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  reasonCode: string; reasonText: string
}
export interface OverviewUnassigned {
  period: string; startDate: string; endDate: string
  openRuns: Array<{ id: number; name: string | null; status: string }>
  rows: OverviewUnassignedRow[]
}

export interface OverviewConflictRow {
  employeeId: number; employeeCode: string; fullName: string; branchName: string | null; departmentName: string | null
  runId: number; runName: string | null; runStatus: string | null
  otherRunId: number; otherName: string | null; otherStatus: string; otherStartDate: string; otherEndDate: string
  overlapDays: number; kind: 'EXACT' | 'OVERLAP' | 'SAME_MONTH'; blocking: boolean
}
export interface OverviewConflicts { period: string; rows: OverviewConflictRow[] }

export interface OverviewDeductionRow {
  employeeId: number; employeeCode: string; fullName: string; branchName: string | null; departmentName: string | null
  runId: number; runName: string | null; runStatus: string; kind: DeductionKind; kindLabel: string; amount: number
}
export interface OverviewDeductions {
  period: string
  runs: Array<{ id: number; name: string | null; status: string }>
  totals: Partial<Record<DeductionKind, number>>
  rows: OverviewDeductionRow[]
}

export interface DeductionWaiverRow {
  id: number; period: string; kind: DeductionKind; kindLabel: string; targetLevel: string; branchId: number | null
  targetIds: number[]; targetText: string; reason: string; createdAt: string; createdByName: string | null; canCancel: boolean
}
export interface DeductionWaiverInput {
  period: string; kind: DeductionKind; targetLevel: string; branchId: number | null
  departmentIds: number[]; teamIds: number[]; employeeIds: number[]; reason: string
}
export interface DeductionWaiverCreated {
  id: number
  recalculateRuns: Array<{ id: number; name: string | null; status: string }>
  lockedRuns: Array<{ id: number; name: string | null; status: string }>
}

const q = (period: string) => `?period=${encodeURIComponent(period)}`

export const fetchPayrollIncluded = (period: string) => apiFetch<OverviewIncluded>(`/payroll/overview/included${q(period)}`)
export const fetchPayrollWithoutRun = (period: string) => apiFetch<OverviewUnassigned>(`/payroll/overview/unassigned${q(period)}`)
export const fetchPayrollConflicts = (period: string) => apiFetch<OverviewConflicts>(`/payroll/overview/conflicts${q(period)}`)
export const fetchPayrollDeductions = (period: string) => apiFetch<OverviewDeductions>(`/payroll/overview/deductions${q(period)}`)
export const fetchDeductionWaivers = (period: string) => apiFetch<DeductionWaiverRow[]>(`/payroll/overview/waivers${q(period)}`)
export const createDeductionWaiver = (input: DeductionWaiverInput) =>
  apiFetch<DeductionWaiverCreated>('/payroll/overview/waivers', { method: 'POST', body: JSON.stringify(input) })
export const cancelDeductionWaiver = (id: number) =>
  apiFetch<{ id: number; status: string }>(`/payroll/overview/waivers/${id}/cancel`, { method: 'POST' })
