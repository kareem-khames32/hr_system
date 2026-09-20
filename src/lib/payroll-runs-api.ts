// الخطوات 16–18: تعريف المسير كمسودة، ومعاينة العضوية (قراءة فقط)، وتقرير «موظفون بلا مسير» وإقراره.
// كل النداءات عبر apiFetch؛ الخادم هو المرجع في التحقق والأرقام.
import { apiFetch, ApiError, type ApiBranch, type ApiDepartment, type ApiPayrollRun, type ApiTeam } from './api'
import type { PayrollPolicySummary } from './payroll-policies-api'

// includeEmployeeIds = قائمة الإضافة الدائمة: أسماء ضمّها المالك للمسير فوق فلاتره («أضفهم لمسير…» أو نقل من مسير آخر).
// أي تعديل للتعريف لازم يبعتها كما هي، وإلا تسقط عضويتهم الدائمة.
export interface PayrollRunFiltersInput { branchIds: number[]; departmentIds: number[]; teamIds: number[]; employeeIds: number[]; allEmployees?: boolean; includeEmployeeIds?: number[] }
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
  // قرار المالك (20 سبتمبر): الموقوف عضو في المسير وصفّه يقول حالته، وشهر آخر يوم عمل راتبه مصروف مع التصفية
  suspensionNote: string | null
  settlementPayout: { caseId: number; lastWorkingDay: string; status: string; label: string } | null
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
    manualExclusions: number; draftConflictEmployees: number; monthlyGross: number; earnedGross: number
    settlementPayout: number; suspended: number }
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
  id: number; snapshotVersion: number; scopeBranchId: number | null; reportHash: string; rowCount: number; note: string | null
  acknowledgedBy: number; acknowledgedByName: string | null; acknowledgedAt: string
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
export const recalculatePayrollRun = (runId: number, options: { reason: string; allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean
  // الخطوة 19 (B4): تحديث لقطة السياسة صراحةً ببصمة الإعدادات الحالية المعروضة
  refreshPolicySnapshot?: boolean; expectedPolicySnapshotHash?: string }) =>
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
  // أكواد قديمة محفوظة في مسيرات سابقة؛ قرار المالك (20 سبتمبر) ألغى الاستبعاد العام للموقوف والمؤرشف
  SUSPENDED: 'الموظف موقوف', ARCHIVED: 'ملف الموظف مؤرشف',
  EXC_ARCHIVED_NO_LAST_DAY: 'مؤرشف بلا تاريخ آخر يوم عمل — حدده عشان راتبه يتحسب',
  EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة', EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  EXC_MANUAL_EXCLUSION: 'استبعاد يدوي بسبب مكتوب', MANUAL: 'استبعاد يدوي', EXC_MANUAL: 'استبعاد يدوي',
  TRANSFERRED_OUT: 'انتقل خارج نطاق المسير قبل نهاية الفترة', EXC_OUT_OF_SCOPE: 'خارج نطاق المسير في آخر يوم من الفترة',
  EXC_ALREADY_IN_RUN: 'مدرج في مسير آخر معتمد أو مصروف لنفس الفترة', EXC_EMPLOYMENT_DATA_INVALID: 'بيانات الخدمة غير مكتملة — صحّحها ثم أعد الحساب',
  NO_SALARY_DEFINED: 'لا يوجد راتب موثق لشهر المسير — أثبته «يسري من راتب شهر» من سجل الأجر',
  SALARY_DAILY_HISTORY_ONLY: 'سجل الأجر بتواريخ يومية لا تحدد شهر الراتب — حوّله إلى شهور',
  SALARY_PAYROLL_PERIOD_GAP: 'شهر المسير غير موثق في سجل الأجر الشهري', SALARY_PAYROLL_PERIOD_INVALID: 'سجل الأجر الشهري غير صالح لهذا الشهر',
  SALARY_HISTORY_INVALID: 'سجل الأجر لا يطابق بصمته الموثقة', SALARY_HISTORY_SCHEMA_MISSING: 'ترحيل سجل الأجر غير مطبق',
  SALARY_COMPONENT_INVALID: 'أحد مكونات راتب الملف غير صالح',
}

export const emptyRunFilters = (): PayrollRunFiltersInput => ({ branchIds: [], departmentIds: [], teamIds: [], employeeIds: [], includeEmployeeIds: [] })

// أكواد لا يُكتب لها استبعاد: خارج النطاق آخر يوم (الاستبعاد لا ينطبق)، أو مستبعد يدويًا بالفعل.
const NOT_EXCLUDABLE = new Set(['TRANSFERRED_OUT', 'EXC_OUT_OF_SCOPE', 'EXC_MANUAL_EXCLUSION'])
export interface PayrollExclusionCandidate { employeeId: number; label: string; dataProblem: boolean; code: string | null }
/**
 * من يمكن استبعاده بسبب مكتوب من المعاينة: الداخلون، والمستبعدون تلقائيًا داخل النطاق (مشكلة بيانات، بلا راتب، في مسير آخر…).
 * أصحاب مشاكل البيانات أولًا لأنهم يمنعون «احتساب المسودة» حتى يُصححوا أو يُستبعدوا.
 */
export function payrollExclusionCandidates(preview: Pick<PayrollMembershipPreview, 'included' | 'excluded'>, alreadyExcluded: number[] = []): PayrollExclusionCandidate[] {
  const skip = new Set(alreadyExcluded)
  const rows: PayrollExclusionCandidate[] = [
    ...preview.excluded.filter(row => !NOT_EXCLUDABLE.has(row.code ?? '')).map(row => ({ employeeId: row.employeeId, code: row.code, dataProblem: !!row.dataProblem,
      label: `${row.fullName} (${row.employeeCode})${row.dataProblem ? ' — بيانات الخدمة غير مكتملة' : ` — ${MEMBERSHIP_EXCLUSION_LABELS[row.code ?? ''] ?? 'مستبعد'}`}` })),
    ...preview.included.map(row => ({ employeeId: row.employeeId, code: null, dataProblem: false, label: `${row.fullName} (${row.employeeCode})` })),
  ]
  return rows.filter(row => !skip.has(row.employeeId)).sort((a, b) => Number(b.dataProblem) - Number(a.dataProblem))
}

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
/** النسخ المنشورة فقط تصلح لربط مسير؛ الفترة تُشتق من دورتها في الخادم. الاسم وحده، والتواريخ فقط لو للمعادلة أكثر من نسخة منشورة. */
export function publishedPolicyVersions(policies: PayrollPolicySummary[]): PublishedPolicyVersionOption[] {
  return policies.filter(summary => summary.policy.isActive).flatMap(summary => {
    const published = summary.versions.filter(version => version.status === 'ACTIVE')
    return published.map(version => {
      const effectiveUntil = version.effectiveUntil ?? version.effectiveTo ?? null
      return {
        policyId: summary.policy.id, policyName: summary.policy.name, code: summary.policy.code, versionId: version.id, versionNo: version.versionNo,
        effectiveFrom: version.effectiveFrom, effectiveUntil, cycleStartDay: version.cycleStartDay ?? null,
        label: published.length > 1 ? `${summary.policy.name} (من ${version.effectiveFrom}${effectiveUntil ? ` إلى ${effectiveUntil}` : ''})` : summary.policy.name,
      }
    })
  })
}

/** الشهر التالي لشهر مسير بصيغة YYYY-MM. */
export function nextPayrollPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}

// «إنشاء مسيرات الشهر الجديد» (طلب المالك 19 سبتمبر): مسودة لكل مسير عادي غير ملغى في شهر المصدر بنفس الاسم والمعادلة والفلاتر والاستبعادات.
// dryRun = المعاينة (هيتعمل إيه وهيتخطى إيه) بلا حفظ؛ شهر المصدر الافتراضي من الخادم = آخر شهر فيه مسير اتحسب.
export interface PayrollNextPeriodCreated { sourceRunId: number; name: string; runId: number | null; policyName: string; versionNo: number }
export interface PayrollNextPeriodSkipped { sourceRunId: number; name: string | null; code: string; reason: string; existingRunId?: number | null }
export interface PayrollNextPeriodResult {
  dryRun: boolean; sourcePeriod: string; targetPeriod: string; sourcePeriods: string[]
  created: PayrollNextPeriodCreated[]; skipped: PayrollNextPeriodSkipped[]
}
export const createNextPeriodPayrollRuns = (input: { dryRun?: boolean; sourcePeriod?: string } = {}) =>
  send<PayrollNextPeriodResult>('/payroll/runs/create-next-period', 'POST', input)

/**
 * إعادة حساب مسير محسوب بسبب جاهز، وبآخر قيم المعادلات دائمًا: لو تغيّرت المعادلة منذ الحساب تُحدَّث لقطة السياسة ببصمة القيم الحالية.
 * المسير المعتمد أو المصروف لا يُعاد حسابه (الخادم يرفض).
 */
export async function recalculatePayrollRunWithCurrentFormula(runId: number, options: { allowDraftConflicts?: boolean } = {}) {
  const snapshot = await apiFetch<{ canRefresh: boolean; currentHash: string }>(`/payroll/runs/${runId}/policy-snapshot`)
  return recalculatePayrollRun(runId, { reason: 'إعادة حساب', ...options,
    ...(snapshot.canRefresh && snapshot.currentHash ? { refreshPolicySnapshot: true, expectedPolicySnapshotHash: snapshot.currentHash } : {}) })
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

// ===== الخطوتان 22 و23 (B5): سجل المسير، وقيد الصرف، وحل التعارضات، وترتيب التحصيل، وفترة التكافؤ التشغيلية =====
export type PayrollPayChannel = 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'MIXED'
export const PAY_CHANNEL_LABELS: Record<PayrollPayChannel, string> = {
  BANK_TRANSFER: 'تحويل بنكي', CASH: 'نقدًا', CHEQUE: 'شيك', MIXED: 'مختلط حسب طريقة صرف كل موظف',
}
export type PayrollCollectionClass = 'ATTENDANCE' | 'RECOVERY' | 'TYPED' | 'ADMINISTRATIVE' | 'LOAN'
export const COLLECTION_CLASS_LABELS: Record<PayrollCollectionClass, string> = {
  ATTENDANCE: 'خصومات الحضور', RECOVERY: 'الاستردادات والعهد', TYPED: 'الخصومات المصنفة', ADMINISTRATIVE: 'الخصومات الإدارية', LOAN: 'أقساط السلف',
}
export interface PayrollRunActor { id: number; name: string | null; at: string | null }
export type PayrollRunCollectionView =
  | { source: 'POLICY_VERSION' | 'DEFAULT'; versionId: number | null; order: PayrollCollectionClass[] | null; effectiveOrder: PayrollCollectionClass[]
      loanBeforeOthers: boolean; componentOrder: string[] | null; message: string }
  | { source: 'INVALID'; message: string }
export interface PayrollRunScreenFields {
  calculatedBy?: number | null; calculatedAt?: string | null; paidBy?: number | null; payChannel?: string | null; payReference?: string | null
  actors?: { calculated: PayrollRunActor | null; approved: PayrollRunActor | null; paid: PayrollRunActor | null }
  approvalGuard?: { calculatedBy: number | null; selfApprovalAllowed: boolean; blocked: { code: string; message: string } | null } | null
  payRecord?: { paidBy: PayrollRunActor | null; channel: string | null; channelLabel: string | null; reference: string | null } | null
  collection?: PayrollRunCollectionView
}
export interface PayrollRunEventView {
  id: number; runId: number; eventType: string; actorUserId: number; actorName: string | null; reason: string | null; createdAt: string
  payload: Record<string, unknown> | null
}
export interface PayrollParityOperationsRun {
  runId: number; name: string | null; period: string; status: string; engineMode: string | null; approvedAt: string | null; approvedBy: number | null
  approvedByName: string | null; paidAt: string | null; parityReportHash: string | null; parityTotals: Record<string, unknown> | null
  parityExplained: Record<string, unknown> | null; counted: boolean; notCountedReason: string | null
  // الخطوة 23 (تصحيح المراجعة): مسير تجريبي معلّم «لا يُحتسب» بسبب ومن علّمه ومتى
  excluded?: { reason: string; by: number | null; byName: string | null; at: string | null } | null
}
/** شهر رواتب: يُحتسب فقط لو كل مسيراته الحية (غير الملغاة وغير التجريبية) SHADOW معتمدة ومصروفة بتقرير موقّع. */
export interface PayrollParityOperationsPeriod { period: string; counted: boolean; runIds: number[]; blockers: Array<{ runId: number; reason: string }> }
export interface PayrollParityOperations {
  plan: { baselineMonths: number; extensionMonths: number; totalMonths: number; counts: string; signer: string; decision: string; decisionOwner?: string; delegate?: string | null }
  months: number; countedPeriods: string[]; stage: 'BASELINE' | 'EXTENSION' | 'DECISION_DUE'; message: string; runs: PayrollParityOperationsRun[]
  scope?: 'COMPANY' | 'BRANCH'; periods?: PayrollParityOperationsPeriod[]; excludedRuns?: number
}

export const fetchPayrollRunEventsView = (runId: number) => apiFetch<PayrollRunEventView[]>(`/payroll/runs/${runId}/events`)
export const payPayrollRun = (runId: number, record: { channel: PayrollPayChannel; reference: string }) =>
  send<ApiPayrollRun & PayrollRunScreenFields>(`/payroll/runs/${runId}/pay`, 'POST', record)
// ===== قرار المالك (20 سبتمبر): المسير قائمة دائمة — «أضفهم لمسير…» و«نقل لمسير آخر» =====
export interface PayrollRunMemberRef { id: number; name: string | null; period: string; status: string }
export interface PayrollRunMembershipResult {
  runId: number; fromPeriod: string; employeeIds: number[]
  moved: Array<{ from: PayrollRunMemberRef | null; to: PayrollRunMemberRef }>
  recalculated: boolean
  added: number[]; alreadyMember: number[]; removed: number[]
  /** مسيرات الأشهر اللاحقة اللي اتغيّرت قائمتها ومحتاجة إعادة حساب */
  recalculateRuns: PayrollRunMemberRef[]
  /** أشهر معتمدة أو مصروفة ما اتغيّرتش */
  lockedRuns: PayrollRunMemberRef[]
  run: PayrollRunWithSelection
}
export interface PayrollEmployeeRuns {
  employeeId: number; period: string
  current: Array<PayrollRunMemberRef & { listed: boolean; member: boolean }>
  targets: PayrollRunMemberRef[]
}
/** ضم موظفين لمسير (أو نقلهم إليه من مسير آخر بنفس الشهر) — عضوية دائمة من شهر المسير وما بعده. */
export const addPayrollRunMembers = (runId: number, input: { employeeIds: number[]; reason: string; fromRunId?: number; allowDraftConflicts?: boolean }) =>
  send<PayrollRunMembershipResult>(`/payroll/runs/${runId}/members`, 'POST', input)
export const fetchEmployeePayrollRuns = (employeeId: number, period: string) =>
  apiFetch<PayrollEmployeeRuns>(`/payroll/employee-runs?employeeId=${employeeId}&period=${encodeURIComponent(period)}`)

export const excludePayrollRunMember = (runId: number, input: { employeeId: number; reason: string; allowDraftConflicts?: boolean }) =>
  send<PayrollRunWithSelection>(`/payroll/runs/${runId}/member-exclusions`, 'POST', input)
export const fetchPayrollParityHistory = () => apiFetch<PayrollParityOperations>('/payroll/parity-history')
// الخطوة 23 (تصحيح المراجعة): تعليم مسير تجريبي «لا يُحتسب» (counts=false) أو إعادته (counts=true) بسبب مكتوب
export const setPayrollRunParityCounting = (runId: number, input: { counts: boolean; reason: string }) =>
  send<PayrollParityOperations>(`/payroll/runs/${runId}/parity-counting`, 'POST', input)

/** سطر ترتيب التحصيل المطبق على المسير (من نسخة السياسة أو الافتراضي). */
export function collectionOrderText(collection: PayrollRunCollectionView | undefined | null): string | null {
  if (!collection) return null
  if (collection.source === 'INVALID') return collection.message
  const order = collection.effectiveOrder.map(kind => COLLECTION_CLASS_LABELS[kind] ?? kind).join(' ← ')
  return collection.source === 'POLICY_VERSION' ? `ترتيب التحصيل من نسخة السياسة: ${order}` : `ترتيب التحصيل الافتراضي (النسخة بلا ترتيب محفوظ): ${order}`
}
