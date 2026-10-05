// B1.14 (الراتب الحي): معاينة الفترة الجارية «لحد امبارح» من التراكم اليومي، و«مستحقي التقديري» للموظف عن نفسه.
// كل النداءات عبر apiFetch؛ الأرقام من الخادم زي ما هي (تقديرية — النهائي من المسير).
import { apiFetch, ApiError } from './api'

export interface PayrollLiveTotals {
  employees: number; earned: number; overtime: number; lateness: number; shortfall: number; absence: number; unpaidLeave: number; suspension: number
  deductions: number; estimatedNet: number
}
export interface PayrollLiveRow extends Omit<PayrollLiveTotals, 'employees'> {
  employeeId: number; employeeCode: string; fullName: string; branchId: number | null; branchName: string | null; departmentName: string | null; currency: string
  days: number; absentDays: number; unpaidLeaveDays: number; suspendedDays: number; lateMinutes: number; shortfallMinutes: number; overtimeMinutes: number
  dirtyDays: number; lastDate: string | null; complete: boolean
}
export interface PayrollLivePreview {
  available: boolean; period: string; startDate: string; endDate: string; upTo: string; estimated: true; note: string
  rows: PayrollLiveRow[]
  byBranch: Array<{ branchId: number | null; branchName: string | null; currency: string; totals: PayrollLiveTotals }>
  byCurrency: Array<{ currency: string; totals: PayrollLiveTotals }>
  counts: { employees: number; complete: number; pending: number }
}
export const fetchPayrollLive = () => apiFetch<PayrollLivePreview>('/payroll/live')
/** طلب واحد بيحسب لحد ~20 ثانية؛ remaining = موظفين لسه ماتحسبلهمش (الشاشة بتكمّل بطلب تاني) */
export const refreshPayrollLive = () =>
  apiFetch<{ employees: number; computed: number; reused: number; disabled: boolean; remaining: number; preview: PayrollLivePreview }>('/payroll/live/refresh', { method: 'POST' })

export interface MyLiveSalaryDay {
  date: string; status: string | null; lateMinutes: number; shortfallMinutes: number; overtimeMinutes: number
  lateness: number; shortfall: number; absence: number; unpaidLeave: number; suspension: number; overtime: number
}
export interface MyLiveSalary {
  available: boolean; period: string; startDate: string; endDate: string; upTo: string; estimated: true; note: string; currency?: string
  summary: { days: number; earned: number; overtime: number; lateness: number; shortfall: number; absence: number; unpaidLeave: number; suspension: number
    deductions: number; estimatedNet: number; complete: boolean } | null
  days: MyLiveSalaryDay[]
  pendingOvertime: number
}
/** «مستحقي التقديري»: null لو الميزة مقفولة (الخادم بيرد 404) أو الحساب مش مربوط بموظف — الشاشة ساعتها ماتعرضش حاجة */
export async function fetchMyLiveSalary(): Promise<MyLiveSalary | null> {
  try {
    return await apiFetch<MyLiveSalary>('/payroll/live/mine')
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null
    throw error
  }
}

/** خصم اليوم كله (تأخير + نقص + غياب + بدون راتب + إيقاف) */
export const myLiveDayDeduction = (day: MyLiveSalaryDay): number =>
  Math.round((day.lateness + day.shortfall + day.absence + day.unpaidLeave + day.suspension) * 100) / 100
