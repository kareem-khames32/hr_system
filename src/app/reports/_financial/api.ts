// التقارير المالية لشهر رواتب — GET /reports/financial/* (نطاق الفرع من الخادم، والمبالغ نصوص عشرية بمنزلتين)
import { apiFetch } from '@/lib/api'

export interface FinancialFilters {
  /** شهر الرواتب YYYY-MM؛ فاضي = الخادم يختار الشهر الجاري */
  period: string
  branchId: string
  departmentId: string
  costCenterId: string
  includeDraft: boolean
}

export interface FinancialRunRef {
  id: number; name: string | null; status: string; runType: string | null; startDate: string; endDate: string; items: number; included: boolean
}

export interface FinancialReportHeader {
  period: string; startDate: string; endDate: string; includeDraft: boolean
  branchId: number | null; departmentId: number | null; costCenterId: number | null
  runs: FinancialRunRef[]; pendingRuns: FinancialRunRef[]; employerInsuranceAvailable: boolean
}

export type Money = string
export interface ColumnDef { key: string; label: string; total: Money }

export interface RegisterRow {
  runId: number; runName: string | null; runStatus: string
  employeeId: number; employeeCode: string | null; fullName: string | null
  branchName: string | null; departmentName: string | null; costCenterName: string | null; payMethod: string
  basic: Money; allowances: Money; allowanceBuckets: Record<string, Money>; additions: Record<string, Money>; otherAdditions: Money
  overtime: Money; overtimeMinutes: number; holidayWork: Money; gross: Money
  // settlement = صافي الصف لو راتبه «مصروف مع التصفية» (برّه كشف البنك)، وإلا 0.00 — الصافي = بنك + نقدي + مع التصفية
  deductions: Record<string, Money>; totalDeductions: Money; net: Money; bank: Money; cash: Money; settlement: Money; employerInsurance: Money | null
  lines: Array<{ type: 'CREDIT' | 'DEBIT'; key: string; category: string | null; label: string | null; typeName: string | null; amount: Money }>
}

export interface PayrollRegisterReport extends FinancialReportHeader {
  columns: { allowanceBuckets: ColumnDef[]; additions: ColumnDef[]; deductions: ColumnDef[] }
  rows: RegisterRow[]
  totals: {
    headcount: number; items: number; basic: Money; allowances: Money; allowanceBuckets: Record<string, Money>; additions: Record<string, Money>
    otherAdditions: Money; overtime: Money; overtimeMinutes: number; holidayWork: Money; gross: Money; deductions: Record<string, Money>
    totalDeductions: Money; net: Money; bank: Money; cash: Money; settlement: Money; employerInsurance: Money | null
  }
}

export interface CostGroup {
  id: number | null; name: string; branchNames: string[]; headcount: number
  gross: Money; deductions: Money; net: Money; overtime: Money; holidayWork: Money; employerInsurance: Money | null; totalCost: Money
}
export interface PayrollCostReport extends FinancialReportHeader {
  byBranch: CostGroup[]; byDepartment: CostGroup[]
  totals: Omit<CostGroup, 'id' | 'name' | 'branchNames'>
}

export interface DeductionsReport extends FinancialReportHeader {
  kinds: Array<{ key: string; label: string; amount: Money; employees: number }>
  typedByType: Array<{ name: string; amount: Money; employees: number }>
  otherByCategory: Array<{ name: string; amount: Money; employees: number }>
  employees: Array<{ employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null
    amounts: Record<string, Money>; total: Money }>
  totals: { amount: Money; employees: number }
}

export interface OvertimePayReport extends FinancialReportHeader {
  employees: Array<{ employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null
    entries: number; minutes: number; amount: Money; holidayWork: Money }>
  departments: Array<{ departmentId: number | null; name: string; employees: number; entries: number; minutes: number; amount: Money; holidayWork: Money }>
  totals: { employees: number; entries: number; minutes: number; amount: Money; holidayWork: Money }
}

export interface LoanLine {
  loanId: number; status: string | null; disbursedAt: string | null; principal: Money; paid: Money; outstanding: Money; installments: number
  openInstallments: number; dueCount: number; dueAmount: Money; duePaid: Money; dueRemaining: Money; overdue: Money; nextDueDate: string | null
}
export interface LoansReport extends FinancialReportHeader {
  employees: Array<{ employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null
    loansCount: number; principal: Money; paid: Money; outstanding: Money; dueCount: number; dueAmount: Money; duePaid: Money; dueRemaining: Money
    overdue: Money; deductedInPayroll: Money; loans: LoanLine[] }>
  totals: { employees: number; loans: number; principal: Money; paid: Money; outstanding: Money; dueCount: number; dueAmount: Money; duePaid: Money
    dueRemaining: Money; overdue: Money; deductedInPayroll: Money }
}

function query(filters: FinancialFilters) {
  const params = new URLSearchParams()
  if (filters.period) params.set('period', filters.period)
  if (filters.branchId) params.set('branchId', filters.branchId)
  if (filters.departmentId) params.set('departmentId', filters.departmentId)
  if (filters.costCenterId) params.set('costCenterId', filters.costCenterId)
  if (filters.includeDraft) params.set('includeDraft', 'true')
  const text = params.toString()
  return text ? `?${text}` : ''
}

export const fetchPayrollRegister = (filters: FinancialFilters) => apiFetch<PayrollRegisterReport>(`/reports/financial/payroll-register${query(filters)}`)
export const fetchPayrollCost = (filters: FinancialFilters) => apiFetch<PayrollCostReport>(`/reports/financial/payroll-cost${query(filters)}`)
export const fetchDeductionsReport = (filters: FinancialFilters) => apiFetch<DeductionsReport>(`/reports/financial/deductions${query(filters)}`)
export const fetchLoansReport = (filters: FinancialFilters) => apiFetch<LoansReport>(`/reports/financial/loans${query(filters)}`)
export const fetchOvertimePayReport = (filters: FinancialFilters) => apiFetch<OvertimePayReport>(`/reports/financial/overtime${query(filters)}`)

export const RUN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة', CALCULATED: 'محسوب (لسه ما اتعتمدش)', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى',
}
export const PAY_METHOD_LABELS: Record<string, string> = { cash: 'نقدي', transfer: 'تحويل بنكي', mixed: 'نقدي + بنك', visa: 'بطاقة رواتب' }
export const LOAN_STATUS_LABELS: Record<string, string> = { APPROVED: 'معتمدة', DISBURSED: 'جاري السداد', SETTLED: 'مكتملة' }

/** 270 ← «4:30» ساعة:دقيقة */
export const minutesAsHours = (minutes: number) => {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(minutes)
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`
}

/** عمود فيه قيمة في أي صف (الإجمالي مش صفر) */
export const nonZero = (value: Money | null | undefined) => !!value && !/^-?0+(\.0+)?$/.test(value)
