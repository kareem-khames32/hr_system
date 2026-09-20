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

// ===== فلاتر تبويبي «المدرجين بالمسير» و«موظفين ليس لديهم مسير» والجدول الموحد (طلب المالك 20 سبتمبر) =====
// الفلترة كلها في الخادم بنطاق الفرع؛ الحالة هنا بتتحول لاستعلام واحد، وعدّاد الفلاتر و«مسح الفلاتر» من نفس المصدر.
export type PayrollMembershipView = 'all' | 'assigned' | 'unassigned'
export const PAYROLL_MEMBERSHIP_VIEW_LABELS: Record<PayrollMembershipView, string> = {
  all: 'الكل', assigned: 'المدرجين في مسير', unassigned: 'بلا مسير',
}
export type PayrollEmploymentStatus = 'active' | 'probation' | 'notice_period' | 'suspended' | 'terminated' | 'archived'
export const PAYROLL_EMPLOYMENT_STATUS_OPTIONS: Array<[PayrollEmploymentStatus, string]> = [
  ['active', 'نشط'], ['probation', 'تحت التجربة'], ['suspended', 'موقوف'], ['terminated', 'منتهي الخدمة'], ['archived', 'مؤرشف'],
  ['notice_period', 'فترة إشعار'],
]
export const PAYROLL_EMPLOYMENT_STATUS_LABELS: Record<string, string> = Object.fromEntries(PAYROLL_EMPLOYMENT_STATUS_OPTIONS)

export interface PayrollOverviewFilterState {
  search: string
  branchId: number | null
  departmentId: number | null
  teamId: number | null
  jobTitle: string
  statuses: PayrollEmploymentStatus[]
  /** مدى تاريخ التعيين؛ null = «كل التواريخ» */
  hiredFrom: string | null
  hiredTo: string | null
  /** تبويب المدرجين: في أنهي مسير */
  runId: number | null
  /** تبويب بلا مسير: سبب الاستبعاد */
  reasonCode: string
  membership: PayrollMembershipView
}

export const emptyPayrollOverviewFilters = (): PayrollOverviewFilterState => ({
  search: '', branchId: null, departmentId: null, teamId: null, jobTitle: '', statuses: [],
  hiredFrom: null, hiredTo: null, runId: null, reasonCode: '', membership: 'all',
})

/** عدد الفلاتر المفعّلة (المنظور «الكل / المدرجين / بلا مسير» مش فلتر — له مفتاحه الخاص). */
export function payrollOverviewFilterCount(filters: PayrollOverviewFilterState): number {
  return [
    filters.search.trim() !== '', filters.branchId !== null, filters.departmentId !== null, filters.teamId !== null,
    filters.jobTitle.trim() !== '', filters.statuses.length > 0, filters.hiredFrom !== null || filters.hiredTo !== null,
    filters.runId !== null, filters.reasonCode !== '',
  ].filter(Boolean).length
}

/** استعلام واحد لكل التبويبات؛ القيم الفاضية ما بتتبعتش. */
export function payrollOverviewQuery(period: string, filters?: PayrollOverviewFilterState): string {
  const params = new URLSearchParams({ period })
  const f = filters
  if (!f) return `?${params.toString()}`
  if (f.search.trim()) params.set('search', f.search.trim())
  if (f.branchId !== null) params.set('branchId', String(f.branchId))
  if (f.departmentId !== null) params.set('departmentId', String(f.departmentId))
  if (f.teamId !== null) params.set('teamId', String(f.teamId))
  if (f.jobTitle.trim()) params.set('jobTitle', f.jobTitle.trim())
  if (f.statuses.length) params.set('statuses', f.statuses.join(','))
  if (f.hiredFrom) params.set('hiredFrom', f.hiredFrom)
  if (f.hiredTo) params.set('hiredTo', f.hiredTo)
  if (f.runId !== null) params.set('runId', String(f.runId))
  if (f.reasonCode) params.set('reasonCode', f.reasonCode)
  if (f.membership !== 'all') params.set('membership', f.membership)
  return `?${params.toString()}`
}

export interface OverviewRunOption { id: number; name: string | null; status: string }

export interface OverviewIncludedRow {
  employeeId: number; employeeCode: string; fullName: string; jobTitle: string | null; employmentStatus: string | null; hireDate: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  teamId: number | null; teamName: string | null
  runId: number; runName: string | null; runStatus: string; startDate: string; endDate: string
}
export interface OverviewIncluded {
  period: string; runs: number; employees: number; total: number; rows: OverviewIncludedRow[]
  runOptions: OverviewRunOption[]; jobTitleOptions: string[]
}

export interface OverviewUnassignedRow {
  employeeId: number; employeeCode: string; fullName: string; hireDate: string | null; jobTitle: string | null; employmentStatus: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  teamId: number | null; teamName: string | null
  reasonCode: string; reasonText: string
}
export interface OverviewUnassigned {
  period: string; startDate: string; endDate: string; total: number
  openRuns: OverviewRunOption[]
  rows: OverviewUnassignedRow[]
  reasonOptions: string[]; jobTitleOptions: string[]
}

/** صف الجدول الموحد: الموظف ومكانه، ومسيره أو «بلا مسير» وسببه. */
export interface OverviewRosterRow {
  employeeId: number; employeeCode: string; fullName: string; jobTitle: string | null; employmentStatus: string | null; hireDate: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  teamId: number | null; teamName: string | null
  runId: number | null; runName: string | null; runStatus: string | null; runCount: number
  reasonCode: string | null; reasonText: string | null
}
export interface OverviewRoster {
  period: string; startDate: string; endDate: string; total: number
  counts: { all: number; assigned: number; unassigned: number }
  rows: OverviewRosterRow[]
  openRuns: OverviewRunOption[]; runOptions: OverviewRunOption[]; reasonOptions: string[]; jobTitleOptions: string[]
}

/** وجهة النقل: المسير المفتوح بفترته ومعادلته. */
export interface OverviewRunTarget {
  id: number; name: string | null; status: string; period: string; startDate: string; endDate: string
  policyName: string | null; versionNo: number | null
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

export const fetchPayrollIncluded = (period: string, filters?: PayrollOverviewFilterState) =>
  apiFetch<OverviewIncluded>(`/payroll/overview/included${payrollOverviewQuery(period, filters)}`)
export const fetchPayrollWithoutRun = (period: string, filters?: PayrollOverviewFilterState) =>
  apiFetch<OverviewUnassigned>(`/payroll/overview/unassigned${payrollOverviewQuery(period, filters)}`)
/** الجدول الموحد: كل موظفي الشهر بعمود «المسير» (الكل / المدرجين في مسير / بلا مسير). */
export const fetchPayrollRoster = (period: string, filters?: PayrollOverviewFilterState) =>
  apiFetch<OverviewRoster>(`/payroll/overview/roster${payrollOverviewQuery(period, filters)}`)
export const fetchPayrollRunTargets = (period: string) =>
  apiFetch<{ period: string; targets: OverviewRunTarget[] }>(`/payroll/overview/run-targets${q(period)}`)
export const fetchPayrollConflicts = (period: string) => apiFetch<OverviewConflicts>(`/payroll/overview/conflicts${q(period)}`)
export const fetchPayrollDeductions = (period: string) => apiFetch<OverviewDeductions>(`/payroll/overview/deductions${q(period)}`)
export const fetchDeductionWaivers = (period: string) => apiFetch<DeductionWaiverRow[]>(`/payroll/overview/waivers${q(period)}`)
export const createDeductionWaiver = (input: DeductionWaiverInput) =>
  apiFetch<DeductionWaiverCreated>('/payroll/overview/waivers', { method: 'POST', body: JSON.stringify(input) })
export const cancelDeductionWaiver = (id: number) =>
  apiFetch<{ id: number; status: string }>(`/payroll/overview/waivers/${id}/cancel`, { method: 'POST' })
