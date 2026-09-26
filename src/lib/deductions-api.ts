import { apiFetch } from './api'
import { formatMoney, isMoneyText } from './money'

// الخصومات المصنفة (الخطوة 25): الكتالوج بالجهة المالكة والنطاق الوظيفي ومصفوفة التصعيد، الإنشاء الفردي والجماعي بمعاينة
// واستبعاد، دورة الاعتماد مع البديل والمهلة والاعتراض، العكس بعد الصرف، قرارات الأقساط المعلقة، والتقارير
export type DeductionCategory = 'DISCIPLINARY' | 'PERFORMANCE' | 'ADMINISTRATIVE' | 'STATUTORY' | 'COURT_ORDER'
export type DeductionCalcMethod = 'FIXED_AMOUNT' | 'DAYS_OF_SALARY' | 'HOURS_OF_SALARY' | 'PERCENT_OF_BASE' | 'PERCENT_OF_GROSS'
export type DeductionCreatorBasis = 'DIRECT_MANAGER' | 'TEAM_LEADER' | 'DEPARTMENT_MANAGER' | 'BRANCH_MANAGER' | 'FUNCTION_OWNER' | 'HR'
export type DeductionApprovalRole = Exclude<DeductionCreatorBasis, 'FUNCTION_OWNER'> | 'EXECUTIVE'
export type DeductionStatus = 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED'
export type DeductionSelectionMode = 'EMPLOYEES' | 'TEAM' | 'DEPARTMENT' | 'BRANCH'
// EXEMPTED / DEFERRED (الخطوة 26): مصير القسط بقرار إعفاء مالي عند صرف المسير
export type DeductionObligationStatus = 'PENDING' | 'APPLIED' | 'CANCELLED' | 'SUSPENDED' | 'EXEMPTED' | 'DEFERRED'

export const DEDUCTION_CATEGORY_LABELS: Record<DeductionCategory, string> = { DISCIPLINARY: 'تأديبي', PERFORMANCE: 'أداء وجودة', ADMINISTRATIVE: 'إداري', STATUTORY: 'نظامي', COURT_ORDER: 'حكم قضائي' }
export const DEDUCTION_METHOD_LABELS: Record<DeductionCalcMethod, string> = { FIXED_AMOUNT: 'مبلغ ثابت', DAYS_OF_SALARY: 'أيام من الراتب', HOURS_OF_SALARY: 'ساعات من الراتب', PERCENT_OF_BASE: 'نسبة من الأساسي', PERCENT_OF_GROSS: 'نسبة من إجمالي الراتب' }
export const DEDUCTION_ROLE_LABELS: Record<DeductionCreatorBasis | DeductionApprovalRole, string> = { DIRECT_MANAGER: 'المدير المباشر', TEAM_LEADER: 'قائد الفريق', DEPARTMENT_MANAGER: 'مدير القسم', BRANCH_MANAGER: 'مدير الفرع', FUNCTION_OWNER: 'مدير الجهة المالكة', HR: 'الموارد البشرية', EXECUTIVE: 'الإدارة التنفيذية' }
export const DEDUCTION_STATUS_META: Record<DeductionStatus, { label: string; className: string }> = {
  IN_APPROVAL: { label: 'قيد الاعتماد', className: 'bg-warning-100 text-warning-700' },
  APPROVED: { label: 'معتمد — بانتظار المسير', className: 'bg-primary-100 text-primary-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'مسحوب', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
}
export const DEDUCTION_OBLIGATION_STATUS_LABELS: Record<DeductionObligationStatus, string> = { PENDING: 'بانتظار المسير', APPLIED: 'مستهلك في مسير مصروف', CANCELLED: 'ملغى', SUSPENDED: 'معلق — بانتظار قرار الموارد البشرية',
  EXEMPTED: 'مُعفى — أُسقط بقرار إعفاء مالي', DEFERRED: 'مؤجَّل بقرار إعفاء — قسط جديد للشهر التالي' }
export const DEDUCTION_METHOD_UNIT: Record<DeductionCalcMethod, string> = { FIXED_AMOUNT: 'المبلغ', DAYS_OF_SALARY: 'عدد الأيام', HOURS_OF_SALARY: 'عدد الساعات', PERCENT_OF_BASE: 'النسبة %', PERCENT_OF_GROSS: 'النسبة %' }

export interface DeductionFunctionalScope { departmentIds: number[]; teamIds: number[]; employeeIds: number[] }
export interface DeductionTypeView {
  id: number; version: number; code: string; nameAr: string; nameEn: string | null
  category: DeductionCategory; categoryLabel: string; calcMethod: DeductionCalcMethod; calcMethodLabel: string
  defaultValue: string | null; valueStep: string | null; minAmount: string | null; maxAmount: string | null; maxPctOfGross: string | null
  isExemptable: boolean; installmentAllowed: boolean; maxInstallments: number; requiresAttachment: boolean
  creatorScopes: DeductionCreatorBasis[]; approvalSteps: DeductionApprovalRole[]; escalationDays: string | null; escalationStep: DeductionApprovalRole | null
  maxIncidentAgeDays: number; carryForwardPriority: number; isActive: boolean
  ownerDepartmentId: number | null; functionalScope: DeductionFunctionalScope | null; basisEscalationDays: Partial<Record<DeductionCreatorBasis, string | null>>
}
export type DeductionTypeInput = Partial<Omit<DeductionTypeView, 'id' | 'version' | 'categoryLabel' | 'calcMethodLabel'>>

export interface DeductionCreatable {
  today: string; currentPeriod: string; cycleStartDay: number; reasonMinLength: number
  bases: DeductionCreatorBasis[]; basisLabels: string[]; types: DeductionTypeView[]
}
export interface DeductionCandidate {
  id: number; fullName: string; employeeCode: string; branchId: number; branchName: string | null
  departmentId: number | null; departmentName: string | null; teamId: number | null; teamName: string | null
  // القسم ثم آباؤه: اختيار «قسم» يشمل فروعه كما يحله الخادم
  departmentPath?: Array<{ id: number; name: string | null }>
  bases: DeductionCreatorBasis[]; basisLabels: string[]
}
export interface DeductionStepView {
  order: number; role: DeductionApprovalRole; roleLabel: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED'; note: string | null; escalation: boolean
  fallbackFrom?: DeductionApprovalRole | null; fallbackFromLabel?: string | null
  approverEmployeeId: number | null; approverName: string | null; actedByUserId?: number | null; actedAt?: string | null; reason?: string | null; adjustedFrom?: string | null; adjustedTo?: string | null
}
export interface DeductionInput {
  deductionTypeId: number; inputValue: string; incidentDate: string; reason: string; targetPeriod: string
  installments?: number; attachmentRef?: string; confirmNotDuplicate?: boolean
}
export interface DeductionSelection { mode: DeductionSelectionMode; ids: number[]; excludeEmployeeIds?: number[] }
export interface DeductionInstallmentPart { period: string; amount: string; units?: string; rate?: string; salarySource?: string; formula?: string }
export interface DeductionPreviewRow {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null; teamName: string | null
  status: string; message: string | null; amount: string | null; formula: string | null; escalated: boolean; escalationThreshold: string | null; pctLimit: string | null
  basis: DeductionCreatorBasis | null; basisLabel: string | null; installments: DeductionInstallmentPart[]; steps: DeductionStepView[]
  overrides: { incidentAgeOverride: boolean; duplicateOf: number | null } | null
}
export interface DeductionPreview {
  previewHash: string; type: DeductionTypeView; targetPeriod: string; currentPeriod: string; selection: DeductionSelection
  totals: { candidates: number; ready: number; excluded: number; failed: number; escalated: number; totalAmount: string }
  rows: DeductionPreviewRow[]
}
export interface DeductionObligationView {
  id: number; type: 'DEBIT' | 'CREDIT'; category: string; label: string; amount: string; status: DeductionObligationStatus; statusLabel: string
  targetPeriod: string | null; effectiveDate: string | null
  reservedPayrollRunId: number | null; appliedPayrollRunId: number | null; appliedAmount: string | null; carriedFromObligationId: number | null
}
export interface DeductionObjectionView { id: number; text: string | null; createdAt: string; byUserId?: number | null; response: { text: string | null; at: string; byUserId?: number | null } | null }
export interface DeductionView {
  id: number; batchId: number | null; status: DeductionStatus; statusLabel: string; revision: number
  employee: { id: number; fullName?: string; employeeCode?: string; branchId?: number; departmentId?: number | null; teamId?: number | null }
  type: { id: number; version: number; code: string | null; nameAr: string | null; category: DeductionCategory | null; categoryLabel: string | null; calcMethod: DeductionCalcMethod; calcMethodLabel: string }
  inputValue: string; estimatedAmount: string; finalAmount: string | null; incidentDate: string; reason: string; attachmentRef: string | null
  amountTrace?: { creation?: { formula?: string }; installments?: DeductionInstallmentPart[]; escalationDays?: string | null } | null
  targetPeriod: string; installments: number
  creator: { userId: number; employeeId: number | null; name: string | null; basis: DeductionCreatorBasis; basisLabel: string }
  steps: DeductionStepView[]; currentStepOrder: number | null; escalated: boolean; outOfScope: boolean
  obligations: DeductionObligationView[]; collectedAmount: string; reversedAmount: string
  objections: DeductionObjectionView[]; openObjection: boolean
  decisionReason: string | null; decidedAt: string | null; createdAt: string
  capabilities: { canApprove: boolean; canReject: boolean; canAdjust: boolean; canWithdraw: boolean; canCancel: boolean
    canRespondObjection: boolean; canReverse: boolean; canDecideSuspended: boolean; blockedByObjection: boolean }
  events?: Array<{ id: number; eventType: string; actorUserId: number | null; fromStatus: string | null; toStatus: string | null; stepOrder: number | null; reason: string | null; createdAt: string }>
  notice?: string | null
}
export interface MyDeductionView {
  id: number; status: DeductionStatus; statusLabel: string; type: { nameAr: string | null; categoryLabel: string | null; calcMethodLabel: string }
  inputValue: string; amount: string; amountIsFinal: boolean; incidentDate: string; reason: string; targetPeriod: string; installments: number
  issuer: { basisLabel: string; name: string | null }
  obligations: Array<{ type: 'DEBIT' | 'CREDIT'; reversal: boolean; targetPeriod: string | null; amount: string; status: string; statusLabel: string
    appliedPayrollRunId: number | null; appliedPeriod: string | null; appliedAmount: string | null }>
  objections: Array<{ id: number; text: string | null; createdAt: string; response: { text: string | null; at: string } | null }>
  canObject: boolean; objectionMinutesLeft: number
  decisionReason: string | null; createdAt: string; decidedAt: string | null
}
export interface DeductionBulkResult {
  // status: «APPROVED» لو المُنشئ مدير موارد بشرية (قراره نهائي فتتعتمد الدفعة فورًا)، وإلا «IN_APPROVAL»
  batchId: number; created: Array<{ employeeId: number; requestId: number; amount: string; status?: string }>
  skipped: Array<{ employeeId: number; fullName: string | null; status: string; message: string | null }>
  totals: DeductionPreview['totals']
}
export interface DeductionLedgerReportRow {
  obligationId: number; requestId: number | null; employeeId: number; fullName: string; employeeCode: string | null; typeName: string | null; amount: string
  targetPeriod: string | null; status: string; statusLabel: string; carriedFromObligationId: number | null; carryDepth: number; reason: string | null
}
export interface DeductionReport {
  generatedAt: string; currentPeriod: string; fromPeriod: string; toPeriod: string; repeatThreshold: number
  byType: Array<{ period: string; typeId: number; typeCode: string | null; typeName: string | null; categoryLabel: string | null; basis: string; basisLabel: string; requests: number; due: string; collected: string; reversed: string }>
  byEmployee: Array<{ employeeId: number; fullName: string; employeeCode: string | null; last3: { count: number; total: string }; last6: { count: number; total: string }; last12: { count: number; total: string }; last90Count: number; repeatFlag: boolean; types: string[] }>
  ledger: { carried: DeductionLedgerReportRow[]; suspended: DeductionLedgerReportRow[]; withoutRun: DeductionLedgerReportRow[] }
  cycleTime: Array<{ role: string; roleLabel: string; acted: number; avgHours: string; maxHours: string }>
  escalation: { total: number; escalated: number; slaEscalations: number; ratePct: string }
  objections: Array<{ requestId: number; employeeId: number; fullName: string; typeName: string | null; requestStatus: string; text: string | null; createdAt: string; response: string | null; respondedAt: string | null }>
  reconciliation: Array<{ runId: number; runName: string | null; period: string; status: string; lines: number; breakdownTyped: string; ledgerTyped: string; difference: string }>
}
// سطر دفتر في القسيمة/المسير بنوعه وسببه وطلبه وسعر اليوم (GET /payroll/items/:id → obligationDetails)
export interface PayrollObligationDetail {
  obligationId: number; type: 'DEBIT' | 'CREDIT' | null; category: string | null; categoryLabel: string; label: string | null
  amount: string | null; collected: string | null; carried: string | null; targetPeriod: string | null; status: string | null; carriedFromObligationId: number | null
  deduction: null | { requestId: number; typeCode: string | null; typeName: string | null; categoryLabel: string | null; calcMethodLabel: string; inputValue: string; reason: string
    incidentDate: string; installmentNo: number | null; installments: number; units: string | null; rate: string | null; formula: string | null; salarySource: string | null; reversal: boolean }
  // C4 / الخطوة 27: قيد المكافأة (أو استردادها) بنوعها وسببها ورقم طلبها
  bonus?: null | { requestId: number; typeName: string | null; calcMethodLabel: string; inputValue: string; reason: string; formula: string | null; reversal: boolean }
}

/** المبلغ النصي بالمنسّق الواحد (FE-06، src/lib/money): منزلتان بالقص بلا تقريب مطابق لـroundPayrollMoney وفواصل آلاف، بلا تحويل ثنائي؛ غير الصالح «—». */
export function formatDeductionMoney(value: string | null | undefined): string {
  return isMoneyText(value) ? formatMoney(value) : '—'
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
const periodValid = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

/** فحص الواجهة قبل الإرسال؛ الخادم يعيد الفحص كاملًا (النطاق والحدود والتكرار). */
export function deductionInputError(input: DeductionInput, reasonMinLength: number, type?: DeductionTypeView | null): string | null {
  if (!input.deductionTypeId) return 'اختر نوع الخصم من الكتالوج.'
  if (!/^\d+(\.\d{1,4})?$/.test(input.inputValue.trim()) || Number(input.inputValue) <= 0) return 'اكتب قيمة موجبة للخصم.'
  if (type?.calcMethod === 'FIXED_AMOUNT' && !/^\d+(\.\d{1,2})?$/.test(input.inputValue.trim())) return 'المبلغ بمنزلتين عشريتين على الأكثر.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.incidentDate)) return 'حدد تاريخ الواقعة.'
  if (input.reason.trim().length < reasonMinLength) return `اكتب سبب الخصم (${reasonMinLength} حرفًا على الأقل).`
  if (!periodValid(input.targetPeriod)) return 'حدد شهر المسير المستهدف.'
  if (type?.requiresAttachment && !input.attachmentRef?.trim()) return 'هذا النوع يتطلب مرجع مستند أو مرفق.'
  return null
}

// ===== وصف مدخل القيمة بلغة النوع (شاشة «الطلبات» ← كارت «خصم») =====
// الوحدة وخطوتها كما ضبطها المسؤول في «أنواع الخصومات»؛ نص عربي واحد لا يحسب مالًا ولا يقرر شيئًا.
const DEDUCTION_STEP_WORDS: Record<string, string> = { '0.25': 'ربع', '0.5': 'نصف', '0.75': 'ثلاثة أرباع' }
/** «0.2500» ← «0.25»؛ الفارغ أو غير الرقمي ← null. */
const canonicalStep = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim()
  if (!/^\d+(\.\d+)?$/.test(text) || Number(text) <= 0) return null
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}
/** تلميح حقل القيمة: «أيام من الراتب — ربع يوم (مضاعفات 0.25)» وأخواته. */
export function deductionValueHint(type: Pick<DeductionTypeView, 'calcMethod' | 'valueStep'> | null | undefined): string {
  if (!type) return ''
  const label = DEDUCTION_METHOD_LABELS[type.calcMethod]
  if (type.calcMethod === 'FIXED_AMOUNT') return `${label} — بمنزلتين عشريتين على الأكثر`
  if (type.calcMethod === 'PERCENT_OF_BASE' || type.calcMethod === 'PERCENT_OF_GROSS') return `${label} — النسبة من 0 إلى 100`
  const step = canonicalStep(type.valueStep)
  if (!step) return label
  const unit = type.calcMethod === 'DAYS_OF_SALARY' ? 'يوم' : 'ساعة'
  const whole = type.calcMethod === 'DAYS_OF_SALARY' ? 'يوم كامل' : 'ساعة كاملة'
  const word = DEDUCTION_STEP_WORDS[step]
  return `${label} — ${word ? `${word} ${unit}` : step === '1' ? whole : `الخطوة ${step} ${unit}`} (مضاعفات ${step})`
}
/** خطوة حقل الإدخال الرقمي؛ الخادم يعيد نفس الفحص (DEDUCTION_STEP_INVALID). */
export const deductionValueStep = (type: Pick<DeductionTypeView, 'calcMethod' | 'valueStep'> | null | undefined): string =>
  !type ? 'any' : type.calcMethod === 'FIXED_AMOUNT' ? '0.01' : canonicalStep(type.valueStep) ?? 'any'
/** القيمة من مضاعفات خطوة النوع؟ null = صالحة أو لا خطوة لهذا النوع. */
export function deductionStepError(type: Pick<DeductionTypeView, 'calcMethod' | 'valueStep'> | null | undefined, inputValue: string): string | null {
  if (!type || (type.calcMethod !== 'DAYS_OF_SALARY' && type.calcMethod !== 'HOURS_OF_SALARY')) return null
  const step = canonicalStep(type.valueStep)
  const text = (inputValue ?? '').trim()
  if (!step || !/^\d+(\.\d{1,4})?$/.test(text)) return null
  // حساب صحيح بأربع منازل (نفس دقة الخادم) بلا كسور ثنائية
  const scaled = (value: string) => { const [whole, fraction = ''] = value.split('.'); return Number(whole) * 10000 + Number(`${fraction}0000`.slice(0, 4)) }
  return scaled(text) % scaled(step) === 0 ? null : `${deductionValueHint(type)} — القيمة ${text} ليست من مضاعفات ${step}.`
}

export const fetchDeductionTypes = (includeInactive = false) => apiFetch<DeductionTypeView[]>(`/deductions/types${includeInactive ? '?includeInactive=true' : ''}`)
export const createDeductionType = (input: DeductionTypeInput) => post<DeductionTypeView>('/deductions/types', input)
export const updateDeductionType = (id: number, input: DeductionTypeInput) => apiFetch<DeductionTypeView>(`/deductions/types/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const fetchDeductionCreatable = () => apiFetch<DeductionCreatable>('/deductions/creatable')
export const fetchDeductionCandidates = (typeId?: number) => apiFetch<DeductionCandidate[]>(`/deductions/candidates${typeId ? `?typeId=${typeId}` : ''}`)
export const previewDeductions = (input: DeductionInput, selection: DeductionSelection) => post<DeductionPreview>('/deductions/preview', { ...input, selection })
export const submitDeductionBatch = (input: DeductionInput, selection: DeductionSelection, previewHash: string) =>
  post<DeductionBulkResult>('/deductions/bulk', { ...input, selection, previewHash })
export const createDeduction = (input: DeductionInput & { employeeId: number }) => post<DeductionView>('/deductions', input)
// from/to = «من تاريخ / إلى تاريخ» على تاريخ الطلب — بيتفلتر على الخادم قبل حد الـ500
export function fetchDeductions(filters: { status?: string; typeId?: number; targetPeriod?: string; employeeId?: number; batchId?: number; view?: 'all' | 'created' | 'pending_me'; from?: string; to?: string } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '' && value !== null) query.set(key, String(value))
  const text = query.toString()
  return apiFetch<DeductionView[]>(`/deductions${text ? `?${text}` : ''}`)
}
export const fetchDeduction = (id: number) => apiFetch<DeductionView>(`/deductions/${id}`)
export const fetchMyDeductions = () => apiFetch<MyDeductionView[]>('/deductions/mine')
export const approveDeduction = (row: Pick<DeductionView, 'id' | 'revision'>, reason?: string, adjustedAmount?: string) =>
  post<DeductionView>(`/deductions/${row.id}/approve`, { expectedRevision: row.revision, ...(reason ? { reason } : {}), ...(adjustedAmount ? { adjustedAmount } : {}) })
export const rejectDeduction = (row: Pick<DeductionView, 'id' | 'revision'>, reason: string) => post<DeductionView>(`/deductions/${row.id}/reject`, { expectedRevision: row.revision, reason })
export const withdrawDeduction = (row: Pick<DeductionView, 'id' | 'revision'>, reason?: string) => post<DeductionView>(`/deductions/${row.id}/withdraw`, { expectedRevision: row.revision, ...(reason ? { reason } : {}) })
export const cancelDeduction = (row: Pick<DeductionView, 'id' | 'revision'>, reason: string) => post<DeductionView>(`/deductions/${row.id}/cancel`, { expectedRevision: row.revision, reason })
// DD-12: عكس المستهلك (كلي بلا مبلغ، أو جزئي)
export const reverseDeduction = (row: Pick<DeductionView, 'id' | 'revision'>, reason: string, amount?: string) =>
  post<DeductionView>(`/deductions/${row.id}/reverse`, { expectedRevision: row.revision, reason, ...(amount ? { amount } : {}) })
// DD-08: اعتراض الموظف والرد عليه
export const objectDeduction = (id: number, text: string) => post<MyDeductionView>(`/deductions/${id}/objection`, { text })
export const respondDeductionObjection = (id: number, text: string) => post<DeductionView>(`/deductions/${id}/objection-response`, { text })
// DD-11 قاعدة 4: قرار القسط المعلق
export const decideSuspendedObligation = (obligationId: number, action: 'RESUME' | 'DROP', reason: string, targetPeriod?: string) =>
  post<DeductionView>(`/deductions/obligations/${obligationId}/decision`, { action, reason, ...(targetPeriod ? { targetPeriod } : {}) })
// DD-13
export function fetchDeductionReports(filters: { fromPeriod?: string; toPeriod?: string; typeId?: number } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') query.set(key, String(value))
  const text = query.toString()
  return apiFetch<DeductionReport>(`/deductions/reports${text ? `?${text}` : ''}`)
}
// سطور الدفتر المفصلة لبند مسير (نفس نقطة القسيمة؛ للعرض المطوي في جدول المسير)
export const fetchPayslipObligations = (itemId: number) =>
  apiFetch<{ obligationDetails?: PayrollObligationDetail[] }>(`/payroll/items/${itemId}`).then(data => data.obligationDetails ?? [])
