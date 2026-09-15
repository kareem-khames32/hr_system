import { apiFetch } from './api'
import { formatMoney, isMoneyText } from './money'

// C6 / الخطوة 29: نداءات السلف — السقوف والاستثناء والسداد المبكر والرصيد بعد الإنهاء ودفتر الموظف.
export type LoanCapScopeType = 'COMPANY' | 'BRANCH' | 'DEPARTMENT' | 'TEAM' | 'EMPLOYEES'
export type LoanRepaymentMode = 'FULL' | 'SHORTEN_TERM' | 'REDUCE_INSTALLMENT'
export type LoanRepaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER'
// REVERSED: قسط ترحيل أُلغي بعكس صرف مسير (C8) — بلا رصيد، ويُعاد تفعيله إن رُحّل القسط الأصلي من جديد
export type LoanInstallmentStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED' | 'REVERSED'

export interface LoanCapPolicy {
  id: number; policyKey: string; version: number; name: string; scopeType: LoanCapScopeType; scopeIds: number[] | null
  salaryBase: 'BASIC' | 'GROSS' | null; percentOfSalary: string | null; flatCapAmount: string | null
  maxRequestsPerMonth: number | null; maxAmountPerMonth: string | null; maxOutstandingBalance: string | null; maxInstallmentMonths: number | null
  monthDefinition: 'PAYROLL_PERIOD' | 'CALENDAR'; effectiveFrom: string; effectiveTo: string | null; priority: number; isActive: boolean
  supersedesId: number | null; reason: string | null; createdAt: string; deactivatedAt: string | null; deactivationReason: string | null
  currentlyEffective: boolean
}
export interface LoanCapPolicyInput {
  name: string; scopeType: LoanCapScopeType; scopeIds?: number[] | null; salaryBase?: 'BASIC' | 'GROSS' | null; percentOfSalary?: string | null
  flatCapAmount?: string | null; maxRequestsPerMonth?: string | number | null; maxAmountPerMonth?: string | null; maxOutstandingBalance?: string | null
  maxInstallmentMonths?: string | number | null; monthDefinition?: 'PAYROLL_PERIOD' | 'CALENDAR'; effectiveFrom: string; effectiveTo?: string | null
  priority?: string | number | null; reason?: string | null
}
export interface LoanCapEvaluation {
  version: string; asOf: string; amount: string; months: number
  policy: { id: number; policyKey: string; version: number; name: string; scopeType: LoanCapScopeType; monthDefinition: string } | null
  salary: { base: 'BASIC' | 'GROSS' | null; value: string | null; sourceRef: string; note: string | null }
  window: { definition: string; period: string; from: string; to: string; resetsOn: string }
  usage: { requests: number; amount: string; maxRequests: number | null; remainingRequests: number | null }
  outstanding: string
  components: Array<{ code: string; label: string; limit: string; used: string | null; available: string }>
  effectiveCap: string | null; governing: string | null; governingLabel: string | null; maxInstallmentMonths: number | null
  excess: string; violations: Array<{ code: string; message: string }>; allowed: boolean
}
export interface LoanCapApproval {
  step: number; approverUserId: number; at: string; previousAmount: string; amount: string
  decision: 'WITHIN_CAP' | 'REDUCED' | 'OVERRIDE' | 'EXCEPTIONAL'; reason: string | null; policyChanged: boolean | null
}
export interface LoanCapReview {
  requestId: number; status: string; requesterId: number; requestedAmount: string; currentAmount: string; months: number
  exceptional: boolean; exceptionalCategory: string | null; exceptionalReason: string | null; firstInstallmentPeriod: string | null
  submitted: LoanCapEvaluation | null; current: LoanCapEvaluation; policyChanged: boolean | null; approvals: LoanCapApproval[]; canOverride: boolean
}
export interface LoanLedgerInstallment {
  id: number; loanId: number; dueDate: string; originalDueDate: string; amount: string; paidAmount: string; remainingAmount: string
  financialStatus: LoanInstallmentStatus; financialRevision: number; paid: boolean; parentInstallmentId: number | null; paidAt: string | null
}
export interface LoanLedgerRepayment {
  id: number; loanId: number; amount: string; method: LoanRepaymentMethod; mode: LoanRepaymentMode; reference: string; reason: string | null
  requestId: number | null; balanceBefore: string; balanceAfter: string; createdAt: string
}
export interface LoanLedgerEvent { id: number; loanId: number; installmentId: number; action: string; reason: string | null; requestId: number | null; payrollRunId: number | null; createdAt: string }
export interface LoanLedger {
  id: number; requestId: number | null; employeeId: number; amount: string; requestedAmount: string | null; status: string; disbursedAt: string | null
  isExceptional: boolean; exceptionalCategory: string | null; exceptionalReason: string | null; firstInstallmentPeriod: string | null; installmentMonths: number | null
  installments: LoanLedgerInstallment[]; paidCount: number; paidAmount: string; remainingAmount: string
  repayments: LoanLedgerRepayment[]; events: LoanLedgerEvent[]
}
export interface LoanRecovery {
  id: number; employeeId: number; caseId: number; status: 'PENDING_RECOVERY' | 'RECOVERED' | 'WRITTEN_OFF' | 'CANCELLED'
  loanBalance: string; coveredAmount: string; amount: string; recoveredAmount: string; writtenOffAmount: string; openAmount: string
  employeeName: string; employeeCode: string | null; caseStatus: string | null; lastWorkingDay: string | null; settlementDocRef: string | null
  createdAt: string; resolvedAt: string | null
  events: Array<{ id: number; action: string; amount: string | null; balanceAfter: string; reference: string | null; reason: string | null; createdAt: string }>
}
export interface LoanRepaymentResult { eventId: number; repaymentId: number | null; mode: LoanRepaymentMode; amount: string | null; balanceAfter: string | null; replayed: boolean }

export const LOAN_EXCEPTIONAL_CATEGORY_LABELS: Record<string, string> = { MEDICAL: 'حالة طبية', FAMILY: 'ظرف عائلي', EDUCATION: 'التزام دراسي', OTHER: 'أخرى' }
export const LOAN_REPAYMENT_MODE_LABELS: Record<LoanRepaymentMode, string> = { FULL: 'سداد كلي', SHORTEN_TERM: 'تقصير المدة', REDUCE_INSTALLMENT: 'تخفيض القسط' }
export const LOAN_REPAYMENT_METHOD_LABELS: Record<LoanRepaymentMethod, string> = { CASH: 'نقدًا', BANK_TRANSFER: 'تحويل بنكي', OTHER: 'أخرى' }
export const LOAN_SCOPE_LABELS: Record<LoanCapScopeType, string> = { COMPANY: 'الشركة كاملة', BRANCH: 'فروع', DEPARTMENT: 'أقسام', TEAM: 'فرق', EMPLOYEES: 'موظفون محددون' }
export const LOAN_APPROVAL_DECISION_LABELS: Record<LoanCapApproval['decision'], string> = {
  WITHIN_CAP: 'ضمن السقف', REDUCED: 'خُفّض المبلغ', OVERRIDE: 'استثناء موثق فوق السقف', EXCEPTIONAL: 'سلفة استثنائية',
}
export const LOAN_EVENT_LABELS: Record<string, string> = {
  PAYROLL_POSTED: 'خصم من المسير', DEFERRED: 'تأجيل قسط', SETTLED_EARLY: 'سداد مبكر كلي', EARLY_REPAYMENT: 'سداد مبكر جزئي',
  // الخطوة 26: القسط المؤجل بقرار إعفاء مالي عند صرف المسير (الدين باقٍ بقسط جديد للشهر التالي)
  DEFERRED_BY_EXEMPTION: 'تأجيل قسط بقرار إعفاء مالي',
  RESERVED: 'حجز في مسير معتمد', RELEASED: 'تحرير حجز',
  // C8 / الخطوة 31: عكس صرف المسير أعاد القسط مستحقًا بمبلغه المخصوم سابقًا
  REVERSAL: 'عكس خصم المسير — عاد القسط مستحقًا',
}
export const LOAN_INSTALLMENT_STATUS_LABELS: Record<LoanInstallmentStatus, string> = {
  DUE: 'مستحق', PAID: 'مخصوم من المسير', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل بالكامل', SETTLED: 'مسوّى مبكرًا', REVERSED: 'مُلغى بعكس صرف مسير',
}

const json = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) })
export const fetchLoanCapPolicies = () => apiFetch<LoanCapPolicy[]>('/loans/cap-policies')
export const createLoanCapPolicy = (input: LoanCapPolicyInput) => apiFetch<LoanCapPolicy>('/loans/cap-policies', json(input))
export const createLoanCapPolicyVersion = (id: number, input: LoanCapPolicyInput) => apiFetch<LoanCapPolicy>(`/loans/cap-policies/${id}/versions`, json(input))
export const deactivateLoanCapPolicy = (id: number, reason: string) => apiFetch<LoanCapPolicy>(`/loans/cap-policies/${id}/deactivate`, json({ reason }))
export const fetchLoanCapPreview = (query: { amount?: string; months?: number; employeeId?: number }) => {
  const params = new URLSearchParams()
  if (query.amount) params.set('amount', query.amount)
  if (query.months) params.set('months', String(query.months))
  if (query.employeeId) params.set('employeeId', String(query.employeeId))
  return apiFetch<LoanCapEvaluation>(`/loans/cap-preview${params.size ? `?${params}` : ''}`)
}
export const fetchLoanCapReview = (requestId: number) => apiFetch<LoanCapReview>(`/loans/requests/${requestId}/cap-review`)
/** اعتماد طلب سلفة مع قرار السقف: تخفيض المبلغ أو استثناء موثق. الرفض والإرجاع عبر actOnRequest العادي. */
export const approveLoanRequest = (requestId: number, input: { comment?: string; approvedAmount?: string; capOverrideReason?: string }) =>
  apiFetch<{ id: number; status: string }>(`/requests/${requestId}/act`, json({ action: 'APPROVE', ...input }))
export const fetchMyLoans = () => apiFetch<LoanLedger[]>('/loans/mine')
export const fetchLoanLedger = (loanId: number) => apiFetch<LoanLedger>(`/loans/${loanId}/ledger`)
export const recordLoanRepayment = (loanId: number, input: { amount?: string | null; reference: string; method: LoanRepaymentMethod; mode: LoanRepaymentMode; reason?: string }) =>
  apiFetch<LoanRepaymentResult>(`/loans/${loanId}/repayments`, json(input))
export const fetchLoanRecoveries = () => apiFetch<LoanRecovery[]>('/loans/recoveries')
export const collectLoanRecovery = (id: number, input: { amount: string; reference: string; reason?: string }) => apiFetch<LoanRecovery>(`/loans/recoveries/${id}/collect`, json(input))
export const writeOffLoanRecovery = (id: number, reason: string) => apiFetch<LoanRecovery>(`/loans/recoveries/${id}/write-off`, json({ reason }))

// المنسّق الواحد (FE-06، src/lib/money): النص العشري يُقرّب نصيًا بلا Number، والرقم بـroundMoney؛ القاعدة نفسها في المسير والقسيمة.
export function formatLoanMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return Number.isFinite(value) ? formatMoney(value) : '—'
  return isMoneyText(value) ? formatMoney(value) : value
}
export const loanMoneyInputValid = (value: string) => /^\d{1,16}(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0
