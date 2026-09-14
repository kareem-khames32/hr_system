// الخطوات 16–18: تعريف المسير كمسودة، ومعاينة العضوية (قراءة فقط)، وتقرير «موظفون بلا مسير» وإقراره.
// كل النداءات عبر apiFetch؛ الخادم هو المرجع في التحقق والأرقام.
import { apiFetch, ApiError, type ApiBranch, type ApiDepartment, type ApiPayrollRun, type ApiTeam } from './api'
import type { PayrollPolicySummary } from './payroll-policies-api'

export interface PayrollRunFiltersInput { branchIds: number[]; departmentIds: number[]; teamIds: number[]; employeeIds: number[]; allEmployees?: boolean }
export interface PayrollRunExclusionInput { employeeId: number; reason: string }
export interface PayrollRunDefinitionInput {
  name?: string; policyVersionId: number; period: string
  filters: PayrollRunFiltersInput; exclusions: PayrollRunExclusionInput[]
  confirmEmptyScope?: boolean; emptyScopeReason?: string
}
export type PayrollRunSelectionMode = 'COMPANY' | 'FILTERS' | 'LIST' | 'FILTERED_LIST'
export interface PayrollRunSelection {
  mode: PayrollRunSelectionMode; source: 'DEFINITION' | 'LEGACY_SCOPE'
  filters: PayrollRunFiltersInput & { costCenterIds: number[]; includeSubDepartments: boolean; allEmployees: boolean }
  exclusions: Array<{ employeeId: number; reason: string; byUserId: number | null; at: string | null }>
  emptyScope: { reason: string; byUserId: number; at: string } | null
}
export interface PayrollRunPolicyRef {
  policyId: number; code: string; name: string; versionId: number; versionNo: number; status: string
  cycleStartDay: number | null; defaultPeriodType: string | null
}
export interface PayrollRunConflictRef {
  otherRunId: number | null; name: string | null; status: string; startDate: string; endDate: string; overlapDays: number; kind: string; blocking: boolean
}
interface PreviewCommon {
  employeeId: number; employeeCode: string; fullName: string; jobTitle: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  teamId: number | null; teamName: string | null; orgDate: string; orgIssues: Array<{ code: string; message: string }>
  inclusionSource: 'SCOPE' | 'MANUAL_INCLUDE'
}
export interface PayrollPreviewIncluded extends PreviewCommon {
  hireDate: string; leaveDate: string | null; coverFrom: string; coverTo: string; coverDays: number; partial: boolean
  prorataFactor: number; monthlyDays: number; dayBasis: string; monthlyGross: number; earnedGross: number
  salarySource: { kind: 'MONTHLY_HISTORY' | 'CURRENT_FILE_UNVERIFIED'; referencePeriod: string; effectivePayrollPeriod: string | null; currency: string | null; warning: string | null }
  draftConflicts: PayrollRunConflictRef[]
}
export interface PayrollPreviewExcluded extends PreviewCommon {
  code: string | null; label: string | null; message: string | null; manualReason: string | null
  dataProblem: { code: string; message: string } | null; coverDays: number | null
  otherRun: PayrollRunConflictRef | null
  transferredOut: { lastInScopeDate: string; branchName: string | null; departmentName: string | null; teamName: string | null } | null
}
export interface PayrollMembershipPreview {
  readOnly: true; previewHash: string
  run: { id: number | null; name: string | null; period: string; startDate: string; endDate: string; policy: PayrollRunPolicyRef | null }
  basis: { monthlyDays: number; dayBasis: string }
  selection: PayrollRunSelection
  emptyScopeRequiresConfirmation: boolean
  totals: { candidates: number; included: number; excluded: number; partial: number; dataProblems: number; alreadyInRun: number; transferredOut: number
    manualExclusions: number; draftConflictEmployees: number; monthlyGross: number; earnedGross: number }
  included: PayrollPreviewIncluded[]; excluded: PayrollPreviewExcluded[]
  unusedExclusions: Array<{ employeeId: number; reason: string }>
  nameTaken?: boolean
}
export type PayrollUnassignedReason = 'DATA_PROBLEM' | 'SUSPENDED' | 'EXCLUDED_IN_RUN' | 'DRAFT_NOT_CALCULATED' | 'ADDED_AFTER_SNAPSHOT' | 'CANCELLED_RUN_ONLY' | 'OUT_OF_ALL_RUNS'
export interface PayrollUnassignedRow {
  employeeId: number; employeeCode: string; fullName: string; employmentStatus: string
  branchId: number | null; departmentId: number | null; teamId: number | null
  hireDate: string | null; leaveDate: string | null; coverFrom: string | null; coverTo: string | null; coverDays: number | null
  reasonCode: PayrollUnassignedReason; reasonText: string
  runs: Array<{ runId: number | null; name: string | null; status: string; period: string; startDate: string; endDate: string; exclusionReason: string | null }>
}
export interface PayrollUnassignedAck {
  id: number; snapshotVersion: number; scopeBranchId: number | null; reportHash: string; rowCount: number; note: string | null; acknowledgedBy: number; acknowledgedAt: string
}
export interface PayrollUnassignedReport {
  period: string; startDate: string; endDate: string; scopeBranchId: number | null; reportHash: string
  totals: { employed: number; assigned: number; unassigned: number; byReason: Partial<Record<PayrollUnassignedReason, number>> }
  rows: PayrollUnassignedRow[]
}
export interface PayrollRunUnassignedReport extends PayrollUnassignedReport {
  runId: number; runStatus: string; snapshotVersion: number
  acknowledgement: { required: boolean; current: PayrollUnassignedAck | null; latest: PayrollUnassignedAck | null; stale: boolean; canAcknowledge: boolean }
}
export type PayrollRunWithSelection = ApiPayrollRun & { selection?: PayrollRunSelection; policyVersion?: PayrollRunPolicyRef | null; policyVersionId?: number | null }

const send = <T>(path: string, method: 'POST' | 'PATCH', body: unknown) => apiFetch<T>(path, { method, body: JSON.stringify(body) })
export const previewPayrollRunDefinition = (input: PayrollRunDefinitionInput & { runId?: number }) =>
  send<PayrollMembershipPreview>('/payroll/runs/membership-preview', 'POST', input)
export const createPayrollRunDraft = (input: PayrollRunDefinitionInput & { name: string }) => send<PayrollRunWithSelection>('/payroll/runs', 'POST', input)
export const updatePayrollRunDraft = (runId: number, input: Partial<PayrollRunDefinitionInput>) => send<PayrollRunWithSelection>(`/payroll/runs/${runId}`, 'PATCH', input)
export const fetchPayrollRunMembershipPreview = (runId: number) => apiFetch<PayrollMembershipPreview>(`/payroll/runs/${runId}/membership-preview`)
export const calculatePayrollRunDraft = (runId: number, options: { allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean } = {}) =>
  send<PayrollRunWithSelection>(`/payroll/runs/${runId}/calculate`, 'POST', options)
export const recalculatePayrollRun = (runId: number, options: { reason: string; allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean }) =>
  send<PayrollRunWithSelection>(`/payroll/runs/${runId}/recalculate`, 'POST', options)
export const fetchPayrollRunUnassigned = (runId: number) => apiFetch<PayrollRunUnassignedReport>(`/payroll/runs/${runId}/unassigned`)
export const acknowledgePayrollRunUnassigned = (runId: number, reportHash: string, note?: string) =>
  send<PayrollRunUnassignedReport>(`/payroll/runs/${runId}/unassigned-ack`, 'POST', { reportHash, ...(note?.trim() ? { note: note.trim() } : {}) })

export const SELECTION_MODE_LABELS: Record<PayrollRunSelectionMode, string> = {
  COMPANY: 'الشركة كلها', FILTERS: 'فلاتر تنظيمية (تتحدث بمكان الموظف آخر يوم في الفترة)', LIST: 'قائمة ثابتة', FILTERED_LIST: 'قائمة داخل فلاتر تنظيمية',
}
export const UNASSIGNED_REASON_LABELS: Record<PayrollUnassignedReason, string> = {
  DATA_PROBLEM: 'بيانات الخدمة تمنع حسابه', SUSPENDED: 'موقوف بلا أجر', EXCLUDED_IN_RUN: 'مستبعد من مسير', DRAFT_NOT_CALCULATED: 'داخل مسودة لم تُحتسب',
  ADDED_AFTER_SNAPSHOT: 'دخل نطاق مسير بعد آخر حساب له', CANCELLED_RUN_ONLY: 'عضو في مسير ملغى فقط', OUT_OF_ALL_RUNS: 'خارج نطاق كل المسيرات',
}
// أكواد الاستبعاد المحفوظة على العضوية بنص عربي (مرآة PAYROLL_EXCLUSION_LABELS في الخادم).
export const MEMBERSHIP_EXCLUSION_LABELS: Record<string, string> = {
  SUSPENDED: 'الموظف موقوف', ARCHIVED: 'ملف الموظف مؤرشف',
  EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة', EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  EXC_MANUAL_EXCLUSION: 'استبعاد يدوي بسبب مكتوب', MANUAL: 'استبعاد يدوي', EXC_MANUAL: 'استبعاد يدوي',
  TRANSFERRED_OUT: 'انتقل خارج نطاق المسير قبل نهاية الفترة', EXC_OUT_OF_SCOPE: 'خارج نطاق المسير في آخر يوم من الفترة',
  EXC_ALREADY_IN_RUN: 'مدرج في مسير آخر معتمد أو مصروف لنفس الفترة', EXC_EMPLOYMENT_DATA_INVALID: 'بيانات الخدمة غير مكتملة أو متعارضة — صححها أو استبعده بسبب',
  NO_SALARY_DEFINED: 'لا يوجد راتب موثق لشهر المسير — أثبته «يسري من راتب شهر» من سجل الأجر',
  SALARY_DAILY_HISTORY_ONLY: 'سجل الأجر بتواريخ يومية لا تحدد شهر الراتب — حوّله إلى شهور',
  SALARY_PAYROLL_PERIOD_GAP: 'شهر المسير غير موثق في سجل الأجر الشهري', SALARY_PAYROLL_PERIOD_INVALID: 'سجل الأجر الشهري غير صالح لهذا الشهر',
  SALARY_HISTORY_INVALID: 'سجل الأجر لا يطابق بصمته الموثقة', SALARY_HISTORY_SCHEMA_MISSING: 'ترحيل سجل الأجر غير مطبق',
  SALARY_COMPONENT_INVALID: 'أحد مكونات راتب الملف غير صالح',
}

export const emptyRunFilters = (): PayrollRunFiltersInput => ({ branchIds: [], departmentIds: [], teamIds: [], employeeIds: [] })

/** الفلاتر المترابطة: الأقسام داخل الفروع المختارة (وفروعها)، والفرق داخل الأقسام المختارة أو فروعها. */
export function linkedFilterOptions(branches: ApiBranch[], departments: ApiDepartment[], teams: ApiTeam[], filters: PayrollRunFiltersInput) {
  const selectedDepartments = new Set(filters.departmentIds)
  for (let grew = true; grew;) {
    grew = false
    for (const row of departments) if (row.parentId != null && selectedDepartments.has(row.parentId) && !selectedDepartments.has(row.id)) { selectedDepartments.add(row.id); grew = true }
  }
  const departmentOptions = departments.filter(row => !filters.branchIds.length || filters.branchIds.includes(row.branchId))
  const branchOf = new Map(departments.map(row => [row.id, row.branchId]))
  const teamOptions = teams.filter(team => (!filters.departmentIds.length || selectedDepartments.has(team.departmentId)) &&
    (!filters.branchIds.length || filters.branchIds.includes(branchOf.get(team.departmentId) ?? -1)))
  return { branches, departments: departmentOptions, teams: teamOptions }
}

/** عند تغيير فرع أو قسم تُحذف الاختيارات التابعة التي لم تعد ضمن السلسلة. */
export function pruneLinkedFilters(branches: ApiBranch[], departments: ApiDepartment[], teams: ApiTeam[], filters: PayrollRunFiltersInput): PayrollRunFiltersInput {
  const withDepartments = { ...filters, departmentIds: filters.departmentIds.filter(id => linkedFilterOptions(branches, departments, teams, { ...filters, departmentIds: [] }).departments.some(row => row.id === id)) }
  const allowedTeams = linkedFilterOptions(branches, departments, teams, withDepartments).teams
  return { ...withDepartments, teamIds: withDepartments.teamIds.filter(id => allowedTeams.some(team => team.id === id)) }
}

export interface PublishedPolicyVersionOption {
  policyId: number; policyName: string; code: string; versionId: number; versionNo: number
  effectiveFrom: string; effectiveUntil: string | null; cycleStartDay: number | null; label: string
}
/** النسخ المنشورة فقط تصلح لربط مسير؛ الفترة تُشتق من دورتها في الخادم. */
export function publishedPolicyVersions(policies: PayrollPolicySummary[]): PublishedPolicyVersionOption[] {
  return policies.filter(summary => summary.policy.isActive).flatMap(summary => summary.versions.filter(version => version.status === 'ACTIVE').map(version => ({
    policyId: summary.policy.id, policyName: summary.policy.name, code: summary.policy.code, versionId: version.id, versionNo: version.versionNo,
    effectiveFrom: version.effectiveFrom, effectiveUntil: version.effectiveUntil ?? version.effectiveTo ?? null, cycleStartDay: version.cycleStartDay ?? null,
    label: `${summary.policy.name} — نسخة ${version.versionNo} (من ${version.effectiveFrom}${version.effectiveUntil ? ` إلى ${version.effectiveUntil}` : ''})`,
  })))
}

export function payrollRunErrorMessage(error: unknown, fallback = 'تعذر تنفيذ العملية على المسير'): string {
  if (error instanceof ApiError) {
    const code = typeof error.details?.code === 'string' ? error.details.code : ''
    if (code === 'PAYRUN-SCOPE-EMPTY') return `${error.message} (فعّل «تأكيد نطاق فارغ» واكتب السبب إن كان مقصودًا)`
    return error.message
  }
  return error instanceof Error ? error.message : fallback
}
export const payrollRunErrorCode = (error: unknown) => error instanceof ApiError && typeof error.details?.code === 'string' ? error.details.code : null
