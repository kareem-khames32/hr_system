// سلسلة اعتماد المسير (قرار المالك 22 سبتمبر): إعداد السلاسل، وشريط السلسلة على المسير، و«مسيرات بانتظار اعتمادي».
// كل النداءات عبر apiFetch؛ الخادم هو المرجع في الصلاحية والترتيب والأرقام.
import { apiFetch } from './api'
import type { PayrollLine } from './payroll-lines-api'

export type PayrollChainApproverKind = 'USER' | 'ROLE'
export interface PayrollChainStepView {
  order: number; kind: PayrollChainApproverKind; userId: number | null; roleCode: string | null; label: string; approverName: string
}
export interface PayrollChainView {
  id: number | null; revision: number; updatedAt: string | null; updatedByName: string | null; steps: PayrollChainStepView[]
}
export interface PayrollChainSeries { seriesName: string; latestPeriod: string; latestRunId: number; latestStatus: string }
export interface PayrollChainConfig {
  company: PayrollChainView
  overrides: Array<PayrollChainView & { seriesName: string }>
  series: PayrollChainSeries[]
  roles: Array<{ code: string; nameAr: string }>
  canEditCompany: boolean
}
export interface PayrollApproverOption {
  id: number; displayName: string; email: string; roleCode: string; roleName: string | null
  employeeCode: string | null; jobTitle: string | null; branchName: string | null
}
/** خطوة كما تُحفظ: شخص بعينه برقمه، أو دور بكوده، واسم اختياري للخطوة. */
export interface PayrollChainStepInput { kind: PayrollChainApproverKind; userId?: number | null; roleCode?: string | null; label?: string }

export type PayrollChainState = 'NONE' | 'INACTIVE' | 'WAITING' | 'RETURNED' | 'COMPLETED'
export interface PayrollChainActor { id: number; name: string | null }
export interface PayrollChainRejectionView { stepOrder: number; stepLabel: string; reason: string | null; by: PayrollChainActor | null; at: string | null }
export interface PayrollRunChain {
  runId: number; runName: string | null; period: string; runStatus: string; snapshotVersion: number
  governed: boolean; state: PayrollChainState
  source: 'COMPANY' | 'RUN_SERIES' | null; seriesName: string | null
  calculatedBy: PayrollChainActor | null; selfApprovalAllowed: boolean
  steps: Array<{ order: number; label: string; kind: PayrollChainApproverKind; status: 'APPROVED' | 'CURRENT' | 'PENDING'; approverName: string
    approvedBy: PayrollChainActor | null; approvedAt: string | null }>
  currentStep: { order: number; label: string; isFinal: boolean } | null
  canAct: boolean; mine: boolean; blocked: { code: string; message: string } | null; stuckMessage: string | null
  rejection: PayrollChainRejectionView | null
  lastRejection: (PayrollChainRejectionView & { snapshotVersion: number; current: boolean }) | null
}
/** رد صاحب خطوة بلا صلاحية قراءة المسير بعد قراره: تأكيد بسيط بدل الشريط. */
export type PayrollChainActionResult = PayrollRunChain | { runId: number; governed: true; acted: true }
export const isPayrollRunChain = (value: PayrollChainActionResult): value is PayrollRunChain => 'steps' in value

export interface PayrollPendingApproval {
  runId: number; name: string | null; period: string; startDate: string; endDate: string; runType: string; totalNet: number; employees: number
  calculatedBy: PayrollChainActor | null; calculatedAt: string | null
  stepOrder: number; stepCount: number; stepLabel: string; isFinal: boolean; waitingSince: string | null; canAct: boolean; blocked: string | null
}
export interface PayrollApprovalReviewRow {
  itemId: number; employeeId: number; employeeCode: string; fullName: string
  branchName: string | null; departmentName: string | null; teamName: string | null
  earnings: number; deductions: number; net: number; earningLines: PayrollLine[]; deductionLines: PayrollLine[]; settlementPayout: boolean
}
export interface PayrollApprovalReview {
  run: { id: number; name: string | null; period: string; startDate: string; endDate: string; status: string; runType: string; correctionReason: string | null; calculatedAt: string | null }
  chain: PayrollRunChain
  totals: { employees: number; earnings: number; deductions: number; net: number; negativeNet: number }
  rows: PayrollApprovalReviewRow[]
}

const send = <T>(path: string, method: 'POST' | 'PUT', body?: unknown) =>
  apiFetch<T>(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const fetchPayrollChainConfig = () => apiFetch<PayrollChainConfig>('/payroll/approval-chain/config')
export const searchPayrollApprovers = (search: string) =>
  apiFetch<PayrollApproverOption[]>(`/payroll/approval-chain/approvers?search=${encodeURIComponent(search.trim())}`)
export const savePayrollCompanyChain = (steps: PayrollChainStepInput[], expectedRevision: number) =>
  send<PayrollChainConfig>('/payroll/approval-chain/config/company', 'PUT', { steps, expectedRevision })
/** قائمة خطوات فاضية = شيل السلسلة الخاصة فيرجع المسير لسلسلة الشركة. */
export const savePayrollSeriesChain = (seriesName: string, steps: PayrollChainStepInput[], expectedRevision: number) =>
  send<PayrollChainConfig>('/payroll/approval-chain/config/series', 'PUT', { seriesName, steps, expectedRevision })

export const fetchPayrollRunChain = (runId: number) => apiFetch<PayrollRunChain>(`/payroll/runs/${runId}/approval-chain`)
export const approvePayrollChainStep = (runId: number) => send<PayrollChainActionResult>(`/payroll/runs/${runId}/approval-chain/approve`, 'POST')
export const rejectPayrollChainStep = (runId: number, reason: string) =>
  send<PayrollChainActionResult>(`/payroll/runs/${runId}/approval-chain/reject`, 'POST', { reason })
export const fetchMyPayrollApprovals = () => apiFetch<PayrollPendingApproval[]>('/payroll/approval-chain/my-pending')
export const fetchMyPayrollApprovalsCount = () => apiFetch<{ count: number }>('/payroll/approval-chain/my-pending/count')
export const fetchPayrollApprovalReview = (runId: number) => apiFetch<PayrollApprovalReview>(`/payroll/approval-chain/runs/${runId}/review`)

export const PAYROLL_CHAIN_MAX_STEPS = 10
export const PAYROLL_CHAIN_REJECT_REASON = { min: 3, max: 500 } as const
export const payrollChainRejectReasonReady = (reason: string) =>
  reason.trim().length >= PAYROLL_CHAIN_REJECT_REASON.min && reason.trim().length <= PAYROLL_CHAIN_REJECT_REASON.max

/** جملة حالة السلسلة كما تُقرأ على شاشة المسير. */
export function payrollChainStateText(chain: Pick<PayrollRunChain, 'state' | 'steps' | 'currentStep' | 'rejection'>): string {
  if (chain.state === 'WAITING' && chain.currentStep) {
    const step = chain.steps.find(row => row.order === chain.currentStep!.order)
    return `بانتظار ${step?.approverName ?? 'صاحب الخطوة'} — ${chain.currentStep.label} (${chain.currentStep.order} من ${chain.steps.length})`
  }
  if (chain.state === 'RETURNED') return `مرتجع لمسؤول الرواتب — رفضه ${chain.rejection?.by?.name ?? 'أحد المعتمدين'}؛ يتعاد حسابه فتبدأ السلسلة من الأول`
  if (chain.state === 'COMPLETED') return `اكتملت سلسلة الاعتماد (${chain.steps.length} خطوات)`
  if (chain.state === 'INACTIVE') return 'السلسلة تبدأ بعد حساب المسير'
  return 'بلا سلسلة اعتماد — الاعتماد بخطوة واحدة'
}

/** الخطوات كما تُرسل للحفظ من حالة المحرر (الشخص أو الدور فقط، والاسم لو مكتوب). */
export const payrollChainStepsInput = (steps: ReadonlyArray<Pick<PayrollChainStepView, 'kind' | 'userId' | 'roleCode' | 'label'>>): PayrollChainStepInput[] =>
  steps.map(step => ({ kind: step.kind, ...(step.kind === 'USER' ? { userId: step.userId } : { roleCode: step.roleCode }), ...(step.label.trim() ? { label: step.label.trim() } : {}) }))
