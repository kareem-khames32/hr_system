import { apiFetch } from './api'
import { formatDeductionMoney, type DeductionApprovalRole, type DeductionStepView } from './deductions-api'

// C4 / الخطوة 27: المكافآت — الاقتراح الفردي والجماعي بمعاينة واستبعاد لموظف أو اختيار أو فريق أو قسم أو فرع،
// دورة الاعتماد (المدير الأعلى عند التصعيد ثم الموارد البشرية)، الفترة المستهدفة، الإلغاء والعكس، والكتالوج
export type BonusCalcMethod = 'FIXED_AMOUNT' | 'DAYS_OF_SALARY' | 'PERCENT_OF_BASE'
export type BonusCreatorBasis = 'DIRECT_MANAGER' | 'TEAM_LEADER' | 'DEPARTMENT_MANAGER' | 'BRANCH_MANAGER' | 'HR'
export type BonusStatus = 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED'
export type BonusSelectionMode = 'EMPLOYEES' | 'TEAM' | 'DEPARTMENT' | 'BRANCH'
export type BonusPayoutState = 'AWAITING_PAYROLL' | 'RESERVED' | 'PAID' | 'CANCELLED'

export const BONUS_METHOD_LABELS: Record<BonusCalcMethod, string> = { FIXED_AMOUNT: 'مبلغ ثابت', DAYS_OF_SALARY: 'أيام من الراتب', PERCENT_OF_BASE: 'نسبة من الأساسي' }
export const BONUS_METHOD_UNIT: Record<BonusCalcMethod, string> = { FIXED_AMOUNT: 'المبلغ', DAYS_OF_SALARY: 'عدد الأيام', PERCENT_OF_BASE: 'النسبة %' }
export const BONUS_ROLE_LABELS: Record<BonusCreatorBasis | DeductionApprovalRole, string> = { DIRECT_MANAGER: 'المدير المباشر', TEAM_LEADER: 'قائد الفريق', DEPARTMENT_MANAGER: 'مدير القسم', BRANCH_MANAGER: 'مدير الفرع', HR: 'الموارد البشرية', EXECUTIVE: 'الإدارة التنفيذية' }
export const BONUS_STATUS_META: Record<BonusStatus, { label: string; className: string }> = {
  IN_APPROVAL: { label: 'قيد الاعتماد', className: 'bg-warning-100 text-warning-700' },
  APPROVED: { label: 'معتمد — بانتظار الصرف', className: 'bg-primary-100 text-primary-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  WITHDRAWN: { label: 'مسحوب', className: 'bg-gray-100 text-gray-600' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
}
// الشارة تتبع القيد: «مصروف» فقط بعد استهلاكه في مسير مصروف
export const bonusBadgeClass = (status: BonusStatus, payout?: BonusPayoutState | null) =>
  payout === 'PAID' ? 'bg-success-100 text-success-700' : BONUS_STATUS_META[status]?.className ?? 'bg-gray-100 text-gray-600'

export interface BonusTypeView {
  id: number; version: number; code: string; nameAr: string; nameEn: string | null
  calcMethod: BonusCalcMethod; calcMethodLabel: string; defaultValue: string | null; valueStep: string | null
  minAmount: string | null; maxAmount: string | null; maxPctOfBase: string | null; isTaxable: boolean; isInsurable: boolean
  creatorScopes: BonusCreatorBasis[]; approvalSteps: DeductionApprovalRole[]; escalationDays: string | null; escalationStep: DeductionApprovalRole | null; isActive: boolean
}
export type BonusTypeInput = Partial<Omit<BonusTypeView, 'id' | 'version' | 'calcMethodLabel'>>

export interface BonusCreatable {
  today: string; currentPeriod: string; cycleStartDay: number; reasonMinLength: number; canExceedCap: boolean
  bases: BonusCreatorBasis[]; basisLabels: string[]; types: BonusTypeView[]
}
export interface BonusCandidate {
  id: number; fullName: string; employeeCode: string; branchId: number; branchName: string | null
  departmentId: number | null; departmentName: string | null; teamId: number | null; teamName: string | null
  departmentPath?: Array<{ id: number; name: string | null }>
  bases: BonusCreatorBasis[]; basisLabels: string[]
}
export interface BonusInput { bonusTypeId: number; inputValue: string; reason: string; targetPeriod: string; attachmentRef?: string; confirmNotDuplicate?: boolean }
export interface BonusSelection { mode: BonusSelectionMode; ids: number[]; excludeEmployeeIds?: number[] }
export interface BonusPreviewRow {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null; teamName: string | null
  status: string; message: string | null; amount: string | null; formula: string | null; dayRate: string | null
  escalated: boolean; escalationThreshold: string | null; capLimit: string | null; capExceeded: boolean
  basis: BonusCreatorBasis | null; basisLabel: string | null; steps: DeductionStepView[]
}
export interface BonusPreview {
  previewHash: string; type: BonusTypeView; targetPeriod: string; currentPeriod: string; selection: BonusSelection
  totals: { candidates: number; ready: number; excluded: number; failed: number; escalated: number; capExceeded: number; totalAmount: string }
  rows: BonusPreviewRow[]
}
export interface BonusBulkResult {
  batchId: number; created: Array<{ employeeId: number; requestId: number; amount: string }>
  skipped: Array<{ employeeId: number; fullName: string | null; status: string; message: string | null }>
  totals: BonusPreview['totals']
}
export interface BonusObligationView {
  id: number; type: 'DEBIT' | 'CREDIT'; category: string; label: string; amount: string; status: string; statusLabel: string
  targetPeriod: string | null; effectiveDate: string | null; reservedPayrollRunId: number | null; appliedPayrollRunId: number | null
  appliedPeriod: string | null; appliedAmount: string | null; reversal: boolean
}
export interface BonusPayoutView { state: BonusPayoutState; label: string; runId: number | null; period: string | null }
export interface BonusView {
  id: number; batchId: number | null; status: BonusStatus; statusLabel: string; revision: number
  employee: { id: number; fullName?: string; employeeCode?: string; branchId?: number; departmentId?: number | null; teamId?: number | null }
  type: { id: number; version: number; code: string | null; nameAr: string | null; isTaxable: boolean | null; isInsurable: boolean | null; calcMethod: BonusCalcMethod; calcMethodLabel: string }
  inputValue: string; estimatedAmount: string; finalAmount: string | null; reason: string; attachmentRef: string | null; targetPeriod: string
  amountTrace?: { creation?: { formula?: string; dayRate?: string; capLimit?: string | null; escalationThreshold?: string | null; salarySource?: string } } | null
  creator: { userId: number; employeeId: number | null; name: string | null; basis: BonusCreatorBasis; basisLabel: string }
  steps: DeductionStepView[]; currentStepOrder: number | null; escalated: boolean; capExceeded: boolean; outOfScope: boolean
  obligations: BonusObligationView[]; payout: BonusPayoutView | null; paidAmount: string; reversedAmount: string
  decisionReason: string | null; decidedAt: string | null; createdAt: string
  capabilities: { canApprove: boolean; canReject: boolean; canAdjust: boolean; canWithdraw: boolean; canCancel: boolean; canReverse: boolean; canExceedCap: boolean }
  events?: Array<{ id: number; eventType: string; actorUserId: number | null; fromStatus: string | null; toStatus: string | null; stepOrder: number | null; reason: string | null; createdAt: string }>
  notice?: string | null
}
export interface MyBonusView {
  id: number; status: BonusStatus; statusLabel: string; payout: BonusPayoutView | null
  type: { nameAr: string | null; calcMethodLabel: string }; inputValue: string; amount: string; amountIsFinal: boolean
  reason: string; targetPeriod: string; paidAmount: string; reversedAmount: string
  issuer: { basisLabel: string; name: string | null }; decisionReason: string | null; createdAt: string; decidedAt: string | null
}

export const formatBonusMoney = formatDeductionMoney

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })

/** فحص الواجهة قبل الإرسال؛ الخادم يعيد الفحص كاملًا (النطاق والسقف والتكرار والفترة). */
export function bonusInputError(input: BonusInput, reasonMinLength: number, type?: BonusTypeView | null): string | null {
  if (!input.bonusTypeId) return 'اختر نوع المكافأة من الكتالوج.'
  if (!/^\d+(\.\d{1,4})?$/.test(input.inputValue.trim()) || Number(input.inputValue) <= 0) return 'اكتب قيمة موجبة للمكافأة.'
  if (type?.calcMethod === 'FIXED_AMOUNT' && !/^\d+(\.\d{1,2})?$/.test(input.inputValue.trim())) return 'المبلغ بمنزلتين عشريتين على الأكثر.'
  if (input.reason.trim().length < reasonMinLength) return `اكتب سبب المكافأة (${reasonMinLength} حرفًا على الأقل).`
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.targetPeriod)) return 'حدد شهر المسير المستهدف.'
  return null
}

export const fetchBonusTypes = (includeInactive = false) => apiFetch<BonusTypeView[]>(`/bonuses/types${includeInactive ? '?includeInactive=true' : ''}`)
export const createBonusType = (input: BonusTypeInput) => post<BonusTypeView>('/bonuses/types', input)
export const updateBonusType = (id: number, input: BonusTypeInput) => apiFetch<BonusTypeView>(`/bonuses/types/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const fetchBonusCreatable = () => apiFetch<BonusCreatable>('/bonuses/creatable')
export const fetchBonusCandidates = (typeId?: number) => apiFetch<BonusCandidate[]>(`/bonuses/candidates${typeId ? `?typeId=${typeId}` : ''}`)
export const previewBonuses = (input: BonusInput, selection: BonusSelection) => post<BonusPreview>('/bonuses/preview', { ...input, selection })
export const submitBonusBatch = (input: BonusInput, selection: BonusSelection, previewHash: string) => post<BonusBulkResult>('/bonuses/bulk', { ...input, selection, previewHash })
export const createBonus = (input: BonusInput & { employeeId: number }) => post<BonusView>('/bonuses', input)
export function fetchBonuses(filters: { status?: string; typeId?: number; targetPeriod?: string; employeeId?: number; batchId?: number; view?: 'all' | 'created' | 'pending_me' } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '' && value !== null) query.set(key, String(value))
  const text = query.toString()
  return apiFetch<BonusView[]>(`/bonuses${text ? `?${text}` : ''}`)
}
export const fetchBonus = (id: number) => apiFetch<BonusView>(`/bonuses/${id}`)
export const fetchMyBonuses = () => apiFetch<MyBonusView[]>('/bonuses/mine')
export const approveBonus = (row: Pick<BonusView, 'id' | 'revision'>, reason?: string, adjustedAmount?: string) =>
  post<BonusView>(`/bonuses/${row.id}/approve`, { expectedRevision: row.revision, ...(reason ? { reason } : {}), ...(adjustedAmount ? { adjustedAmount } : {}) })
export const rejectBonus = (row: Pick<BonusView, 'id' | 'revision'>, reason: string) => post<BonusView>(`/bonuses/${row.id}/reject`, { expectedRevision: row.revision, reason })
export const withdrawBonus = (row: Pick<BonusView, 'id' | 'revision'>, reason?: string) => post<BonusView>(`/bonuses/${row.id}/withdraw`, { expectedRevision: row.revision, ...(reason ? { reason } : {}) })
export const cancelBonus = (row: Pick<BonusView, 'id' | 'revision'>, reason: string) => post<BonusView>(`/bonuses/${row.id}/cancel`, { expectedRevision: row.revision, reason })
export const reverseBonus = (row: Pick<BonusView, 'id' | 'revision'>, reason: string, amount?: string) =>
  post<BonusView>(`/bonuses/${row.id}/reverse`, { expectedRevision: row.revision, reason, ...(amount ? { amount } : {}) })
