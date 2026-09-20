/**
 * طلب المالك (20 سبتمبر): فلاتر موحدة لتبويبي «المدرجين بالمسير» و«موظفين ليس لديهم مسير» ولجدول الشهر الموحد.
 * الفلترة في الخادم (نطاق الفرع مفروض قبلها)، والدوال هنا صافية بلا SQL عشان تتحقق وحدها.
 *
 * ملاحظة SQL Server 2019: لا نستعمل أي دالة حديثة هنا أصلًا — المطابقة في الذاكرة على صفوف محمّلة.
 */

/** حالات الموظف المعتمدة في النظام (نفس EmployeeStatus) بنصها العربي للشاشة. */
export const PAYROLL_EMPLOYMENT_STATUSES = ['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'] as const
export type PayrollEmploymentStatus = typeof PAYROLL_EMPLOYMENT_STATUSES[number]
export const PAYROLL_EMPLOYMENT_STATUS_LABELS: Record<PayrollEmploymentStatus, string> = {
  active: 'نشط', probation: 'تحت التجربة', notice_period: 'فترة إشعار', suspended: 'موقوف', terminated: 'منتهي الخدمة', archived: 'مؤرشف',
}
export const isPayrollEmploymentStatus = (value: unknown): value is PayrollEmploymentStatus =>
  typeof value === 'string' && (PAYROLL_EMPLOYMENT_STATUSES as readonly string[]).includes(value)

/** «الكل / المدرجين في مسير / بلا مسير» في الجدول الموحد. */
export const PAYROLL_MEMBERSHIP_VIEWS = ['all', 'assigned', 'unassigned'] as const
export type PayrollMembershipView = typeof PAYROLL_MEMBERSHIP_VIEWS[number]

export interface PayrollOverviewFilterInput {
  search?: unknown
  branchId?: unknown
  departmentId?: unknown
  teamId?: unknown
  jobTitle?: unknown
  statuses?: unknown
  hiredFrom?: unknown
  hiredTo?: unknown
  runId?: unknown
  reasonCode?: unknown
  membership?: unknown
}

export interface PayrollOverviewFilters {
  search: string
  branchId: number | null
  departmentId: number | null
  teamId: number | null
  jobTitle: string
  statuses: PayrollEmploymentStatus[]
  hiredFrom: string | null
  hiredTo: string | null
  runId: number | null
  reasonCode: string
  membership: PayrollMembershipView
}

/** الصف كما تبنيه الخدمة قبل الفلترة (بيانات الموظف ومكانه ومسيره). */
export interface PayrollOverviewFilterRow {
  fullName?: string | null
  employeeCode?: string | null
  branchId?: number | null
  departmentId?: number | null
  teamId?: number | null
  jobTitle?: string | null
  employmentStatus?: string | null
  hireDate?: string | null
  runId?: number | null
  reasonCode?: string | null
}

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : ''
const id = (value: unknown): number | null => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
const day = (value: unknown): string | null => {
  const raw = text(value).slice(0, 10)
  return DAY.test(raw) ? raw : null
}
const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(item => list(item))
  const raw = text(value)
  return raw ? raw.split(',').map(item => item.trim()).filter(Boolean) : []
}

/** قراءة الفلاتر من الاستعلام: كل قيمة غير صالحة تسقط بلا خطأ (الفلتر اختياري ولا يمنع العرض). */
export function normalizePayrollOverviewFilters(input: PayrollOverviewFilterInput | null | undefined): PayrollOverviewFilters {
  const raw = input ?? {}
  const membership = text(raw.membership) as PayrollMembershipView
  const statuses = [...new Set(list(raw.statuses).filter(isPayrollEmploymentStatus))].sort()
  const from = day(raw.hiredFrom), to = day(raw.hiredTo)
  return {
    search: text(raw.search).slice(0, 200),
    branchId: id(raw.branchId),
    departmentId: id(raw.departmentId),
    teamId: id(raw.teamId),
    jobTitle: text(raw.jobTitle).slice(0, 200),
    statuses,
    // من/إلى مقلوبين يتصححوا بدل ما الجدول يرجع فاضي بلا سبب مفهوم
    hiredFrom: from && to && from > to ? to : from,
    hiredTo: from && to && from > to ? from : to,
    runId: id(raw.runId),
    reasonCode: text(raw.reasonCode).slice(0, 60),
    membership: (PAYROLL_MEMBERSHIP_VIEWS as readonly string[]).includes(membership) ? membership : 'all',
  }
}

export const emptyPayrollOverviewFilters = (): PayrollOverviewFilters => normalizePayrollOverviewFilters(null)

const fold = (value: string) => value.toLowerCase()

/** بحث بالاسم أو الكود: جزء من أي منهما، بلا حساسية لحالة الحروف. */
export function payrollOverviewSearchMatches(row: PayrollOverviewFilterRow, search: string): boolean {
  const query = fold(search.trim())
  if (!query) return true
  return fold(row.fullName ?? '').includes(query) || fold(row.employeeCode ?? '').includes(query)
}

export function matchesPayrollOverviewFilter(row: PayrollOverviewFilterRow, filters: PayrollOverviewFilters): boolean {
  if (!payrollOverviewSearchMatches(row, filters.search)) return false
  if (filters.branchId !== null && (row.branchId ?? null) !== filters.branchId) return false
  if (filters.departmentId !== null && (row.departmentId ?? null) !== filters.departmentId) return false
  if (filters.teamId !== null && (row.teamId ?? null) !== filters.teamId) return false
  if (filters.jobTitle && fold(row.jobTitle ?? '') !== fold(filters.jobTitle)) return false
  if (filters.statuses.length && !filters.statuses.includes((row.employmentStatus ?? '') as PayrollEmploymentStatus)) return false
  if (filters.hiredFrom || filters.hiredTo) {
    const hired = day(row.hireDate)
    if (!hired) return false
    if (filters.hiredFrom && hired < filters.hiredFrom) return false
    if (filters.hiredTo && hired > filters.hiredTo) return false
  }
  if (filters.runId !== null && (row.runId ?? null) !== filters.runId) return false
  if (filters.reasonCode && (row.reasonCode ?? '') !== filters.reasonCode) return false
  if (filters.membership === 'assigned' && (row.runId ?? null) === null) return false
  if (filters.membership === 'unassigned' && (row.runId ?? null) !== null) return false
  return true
}

/** عدد الفلاتر المفعّلة (للشارة على الشاشة) — «الكل» في المنظور مش فلتر. */
export function payrollOverviewActiveFilterCount(filters: PayrollOverviewFilters): number {
  return [
    filters.search !== '', filters.branchId !== null, filters.departmentId !== null, filters.teamId !== null,
    filters.jobTitle !== '', filters.statuses.length > 0, filters.hiredFrom !== null || filters.hiredTo !== null,
    filters.runId !== null, filters.reasonCode !== '',
  ].filter(Boolean).length
}

/** الفلترة تحتاج الموقوفين في التقرير لما المالك يسأل عنهم بالاسم. */
export const payrollOverviewNeedsSuspended = (filters: PayrollOverviewFilters): boolean => filters.statuses.includes('suspended')
