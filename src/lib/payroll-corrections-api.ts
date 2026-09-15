// C8 / الخطوة 31: تصحيح المسير المصروف — عكس الصرف بمسير عكس مربوط، والمسير التكميلي، وتقرير التسويات.
// كل النداءات عبر apiFetch؛ الخادم هو المرجع في الموانع والأرقام. اعتماد مسير العكس وتنفيذه من أزرار المسير المعتادة (approve/pay).
import { apiFetch, ApiError } from './api'

export type PayrollRunType = 'REGULAR' | 'REVERSAL' | 'SUPPLEMENTARY'
export const PAYROLL_RUN_TYPE_LABELS: Record<PayrollRunType, string> = { REGULAR: 'مسير أصلي', REVERSAL: 'مسير عكس صرف', SUPPLEMENTARY: 'مسير تكميلي' }
export const REVERSAL_LINE_STATUS_LABELS: Record<string, string> = { PENDING: 'بانتظار تنفيذ العكس', POSTED: 'نُفّذ العكس', CANCELLED: 'أُلغي العكس' }
export const SUPPLEMENTARY_BASIS_LABELS: Record<string, string> = {
  REVERSED: 'عُكس صرف بنده', EXCLUDED: 'مستبعد من المسير الأصلي', PAID_IN_RUN: 'مصروف في المسير', MEMBER: 'عضو في المسير',
}

export interface PayrollReversalBlocker { code: string; message: string; employeeId: number; details?: Record<string, unknown> }
export interface PayrollReversalLineSummary {
  employeeId: number; itemId: number; netPay: string; fullName: string | null; employeeCode: string | null
  overtimeEntries: number; installments: number; installmentAmount: string; voidedContinuations: number; settledLoansReopened: number
  obligations: number; reinstatedDebits: string; reinstatedCredits: string; preservedExemptionDecisions: number; carriedObligationsKept: number; exemptions: number
  // السلفة المسددة بالمسير تعود لحالتها قبل الصرف (معتمدة أو جاري سدادها)
  reopenedLoanStatuses?: Array<{ loanId: number; status: 'APPROVED' | 'DISBURSED' }>
  // تنبيهات لا تمنع العكس: إعفاء الحضور يُنقل للتكميلي، و«كل الخصومات» يُمنح صراحةً، والإسقاط أو التأجيل المنفذ يبقى
  warnings?: Array<{ code: string; message: string; employeeId: number; exemptionIds?: number[] }>
  blockers: PayrollReversalBlocker[]
}
export interface PayrollReversalPreview {
  runId: number; period: string; employees: number; blocked: boolean; totalNet: string; previewHash: string
  lines: PayrollReversalLineSummary[]; blockers: PayrollReversalBlocker[]
}
export interface PayrollCorrectionLine {
  id: number; reversalRunId: number; originalRunId: number; originalItemId: number; employeeId: number; status: string; statusLabel: string; netPay: string
  amounts: Record<string, string> | null; createdAt: string; postedAt: string | null; postedByUserId: number | null
  effects: { overtime: number; installments: number; obligations: number; reopenedLoans: number; releasedClaims: number; preserved: unknown; detail: unknown } | null
}
export interface PayrollRunCorrectionView {
  runType: PayrollRunType; runTypeLabel: string; correctionReason: string | null
  parentRun: { id: number; name: string | null; period: string; status: string; runType: PayrollRunType } | null
  children: Array<{ id: number; name: string | null; period: string; status: string; runType: PayrollRunType; runTypeLabel: string; totalNet: string; createdAt: string; correctionReason: string | null }>
  lines: PayrollCorrectionLine[]
}
export interface PayrollReconciliationEmployee {
  employeeId: number; fullName: string | null; employeeCode: string | null
  originalNet: string; supplementaryPaidNet: string; supplementaryOpenNet: string; reversedNet: string; pendingReversalNet: string; effectiveNet: string; settlementDifference: string
  entries: Array<{ runId: number; runType: PayrollRunType; status: string; netPay: string; itemId: number | null; lineId: number | null; lineStatus: string | null }>
}
export interface PayrollReconciliation {
  rootRunId: number
  runs: Array<{ id: number; name: string | null; period: string; status: string; runType: PayrollRunType; runTypeLabel: string; parentRunId: number | null; totalNet: string; correctionReason: string | null }>
  employees: PayrollReconciliationEmployee[]
  totals: { employees: number; originalNet: string; supplementaryPaidNet: string; supplementaryOpenNet: string; reversedNet: string; pendingReversalNet: string; effectiveNet: string; settlementDifference: string }
}
export interface PayrollSupplementaryCandidate {
  employeeId: number; fullName: string | null; employeeCode: string | null; basis: string; eligible: boolean; reason: string | null
  draftRuns: Array<{ runId: number; status: string }>
  // إعفاء مالي مطبق في المسير الأصلي لمن عُكس بنده: إعفاء خصومات الحضور يُنقل للتكميلي عند إنشائه (carriedExemptionIds)
  exemptionIds?: number[]; carriedExemptionIds?: number[]; warning?: string | null
}
export interface PayrollCorrectionsView {
  run: { id: number; name: string | null; period: string; status: string; runType: PayrollRunType; runTypeLabel: string }
  root: { id: number; name: string | null; period: string; status: string }
  correction: PayrollRunCorrectionView
  reconciliation: PayrollReconciliation
  reversible: Array<{ itemId: number; employeeId: number; fullName: string | null; employeeCode: string | null; netPay: string; reversal: { lineId: number; reversalRunId: number; status: string } | null }>
  supplementary: { available: boolean; reason: string | null; candidates: PayrollSupplementaryCandidate[] }
  permissions: { canReverse: boolean; canSupplement: boolean }
}
export interface PayrollCorrectionsReport {
  fromPeriod: string; toPeriod: string
  chains: Array<PayrollReconciliation & { root: { id: number; name: string | null; period: string; status: string } }>
  totals: { chains: number; reversedNet: string; pendingReversalNet: string; supplementaryPaidNet: string; supplementaryOpenNet: string; settlementDifference: string }
}
/** ما يُطبع على القسيمة: عكس صرف البند وقسائم التكميلي المربوطة. */
export interface PayslipReversalInfo {
  line: { id: number; status: string; statusLabel: string; netPay: string; postedAt: string | null; reversalRunId: number; reversalRunName: string | null; reversalRunStatus: string | null; reason: string | null } | null
  supplementary: Array<{ runId: number; name: string | null; status: string; itemId: number; netPay: string }>
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const fetchPayrollCorrections = (runId: number) => apiFetch<PayrollCorrectionsView>(`/payroll/runs/${runId}/corrections`)
export const previewPayrollReversal = (runId: number, employeeIds?: number[]) =>
  post<PayrollReversalPreview>(`/payroll/runs/${runId}/reversal-preview`, employeeIds?.length ? { employeeIds } : {})
export const createPayrollReversal = (runId: number, input: { employeeIds?: number[]; reason: string; previewHash: string }) =>
  post<{ id: number; name: string | null }>(`/payroll/runs/${runId}/reversals`, input)
export const createPayrollSupplementary = (runId: number, input: { employeeIds: number[]; name?: string; reason: string }) =>
  post<{ id: number; name: string | null }>(`/payroll/runs/${runId}/supplementary`, input)
export const fetchPayrollCorrectionsReport = (fromPeriod: string, toPeriod: string) =>
  apiFetch<PayrollCorrectionsReport>(`/payroll/corrections/report?fromPeriod=${encodeURIComponent(fromPeriod)}&toPeriod=${encodeURIComponent(toPeriod)}`)

/** موانع العكس المرفوعة من الخادم (409 PAYRUN-REVERSAL-BLOCKED) لعرضها بجوار كل موظف. */
export function payrollReversalBlockers(error: unknown): PayrollReversalBlocker[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details?.blockers)) return []
  return error.details.blockers as PayrollReversalBlocker[]
}
export const reversalCorrectionReasonReady = (reason: string) => {
  const text = reason.trim()
  return text.length >= 20 && text.length <= 1000 && new Set(text.split(/\s+/).filter(Boolean)).size >= 3
}
