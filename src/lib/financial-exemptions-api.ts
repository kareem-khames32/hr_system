import { apiFetch, type ApiPayrollItem } from './api'

// الخطوة 26 — الإعفاء المالي في مسير (EX-01..08): منح بمعاينة، اعتماد ورفض وإلغاء، قائمة المسير، القسيمة، إعفاءاتي، وتقرير الحوكمة.
// الخادم هو المرجع في النطاق وفصل المهام والحدود والمبالغ؛ الواجهة تعرض ما يعيده فقط.
export type ExemptionScopeKind = 'ALL_DEDUCTIONS' | 'DEDUCTION_TYPE' | 'SINGLE_ENTRY'
export type ExemptionTypeTarget = 'LATENESS' | 'SHORTFALL' | 'ABSENCE' | 'ADVANCE_INSTALLMENT' | 'TYPED'
export type ExemptionEntryTarget = 'LATENESS_DAY' | 'SHORTFALL_DAY' | 'ABSENCE_DAY' | 'OBLIGATION' | 'LOAN_INSTALLMENT'
export type ExemptionDisposition = 'DROP' | 'DEFER_ONE_PERIOD'
export type ExemptionStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'APPLIED' | 'REJECTED' | 'REVOKED' | 'EXPIRED' | 'SUPERSEDED'
export type ExemptionComponent = 'LATENESS' | 'SHORTFALL' | 'ABSENCE' | 'TYPED' | 'LOAN'

export const EXEMPTION_STATUS_META: Record<ExemptionStatus, { label: string; className: string }> = {
  PENDING_APPROVAL: { label: 'بانتظار اعتماد الموارد البشرية', className: 'bg-warning-100 text-warning-700' },
  ACTIVE: { label: 'نشط — يُطبق عند حساب المسير', className: 'bg-primary-100 text-primary-700' },
  APPLIED: { label: 'مطبق في مسير معتمد', className: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  REVOKED: { label: 'ملغى قبل اعتماد المسير', className: 'bg-gray-100 text-gray-600' },
  EXPIRED: { label: 'منتهٍ دون تطبيق', className: 'bg-gray-100 text-gray-600' },
  SUPERSEDED: { label: 'محتوى في إعفاء أشمل', className: 'bg-gray-100 text-gray-600' },
}
export const EXEMPTION_TYPE_TARGET_LABELS: Record<ExemptionTypeTarget, string> = {
  LATENESS: 'كل خصم التأخير', SHORTFALL: 'كل خصم نقص ساعات العمل', ABSENCE: 'كل خصم الغياب', ADVANCE_INSTALLMENT: 'كل أقساط السلف (تأجيل)', TYPED: 'نوع خصم',
}
export const EXEMPTION_COMPONENT_LABELS: Record<ExemptionComponent, string> = {
  LATENESS: 'خصم التأخير', SHORTFALL: 'خصم نقص ساعات العمل', ABSENCE: 'خصم الغياب', TYPED: 'خصم', LOAN: 'قسط سلفة',
}
export const EXEMPTION_DISPOSITION_LABELS: Record<ExemptionDisposition, string> = { DROP: 'إسقاط نهائي', DEFER_ONE_PERIOD: 'تأجيل للشهر التالي' }

export interface ExemptionLine {
  exemptionId: number; component: ExemptionComponent; ref: string | null; label: string
  originalAmount: string; exemptedAmount: string; afterAmount: string; disposition: ExemptionDisposition; note?: string
}
export interface ExemptionProtectedItem { component: 'TYPED' | 'RECOVERY' | 'UNPAID_LEAVE'; ref: string | null; label: string; amount: string; reason: string }
export interface ExemptionWarning { code: string; message: string; details?: unknown }
export interface ExemptionView {
  id: number; runId: number; runName: string | null; runStatus: string | null; runStatusLabel: string | null; period: string
  employeeId: number; employeeName: string | null; employeeCode: string | null
  scopeKind: ExemptionScopeKind; scopeLabel: string; targetKind: string | null; deductionTypeId: number | null; targetRef: string | null; targetLabel: string
  disposition: ExemptionDisposition; dispositionLabel: string; reason: string; attachmentRef: string | null
  status: ExemptionStatus; statusLabel: string; grantorBasis: string; grantorBasisLabel: string
  grantedByUserId: number; grantedByName: string | null; grantedAt: string; approvedByName: string | null; approvedAt: string | null
  decidedByName: string | null; decidedAt: string | null; decisionReason: string | null
  estimatedAmount: string | null; exemptedAmountSnapshot: string | null; lines: ExemptionLine[]; warnings: ExemptionWarning[]
  overrides: Array<Record<string, unknown>>; supersededById: number | null; revision: number
  canApprove: boolean; canReject: boolean; canRevoke: boolean; canAttach: boolean
  events?: Array<{ id: number; eventType: string; fromStatus: string | null; toStatus: string | null; reason: string | null; actorName: string | null; createdAt: string }>
}
export interface RunExemptionsView {
  run: { id: number; name: string | null; period: string; status: string; statusLabel: string; snapshotVersion: number }
  settings: { reasonMinLength: number; attachmentThresholdDays: number; maxPerEmployeeYear: number; cooldownHours: number; maxPctPerGrantor: number }
  permissions: { canGrant: boolean; canApprove: boolean; canOverride: boolean }
  recalcRequired: boolean; recalcEmployeeIds: number[]; pendingApproval: number
  exemptions: ExemptionView[]
}
export interface ExemptionCandidate { employeeId: number; fullName: string | null; employeeCode: string | null; branchId: number | null; departmentId: number | null; bases: string[]; basisLabels: string[] }
export interface ExemptionEmployeeEntries {
  run: { id: number; name: string | null; period: string; status: string }
  employee: { employeeId: number; fullName: string | null; employeeCode: string | null }
  bases: string[]; basisLabels: string[]; dayRate: string; attachmentThreshold: string; attachmentThresholdDays: number
  requested: { lateness: string; shortfall: string; absence: string }
  attendanceDays: Array<{ date: string; lateness: string; shortfall: string; absence: string }>
  typedObligations: Array<{ obligationId: number; amount: string; deductionTypeId: number | null; typeName: string | null; typedCategory: string | null; targetPeriod: string | null; label: string; exemptable: boolean; protectedReason: string | null }>
  typedTypes: Array<{ deductionTypeId: number; typeName: string | null; exemptable: boolean; amount: string }>
  recoveries: Array<{ obligationId: number; amount: string; label: string; category: string; protectedReason: string }>
  installments: Array<{ installmentId: number; loanId: number; dueDate: string; amount: string }>
  unpaidLeave: string
  exemptions: ExemptionView[]
}
export interface ExemptionInput {
  runId: number; employeeId: number; scopeKind: ExemptionScopeKind; targetKind?: string; deductionTypeId?: number; targetRef?: string
  disposition?: ExemptionDisposition; reason: string; attachmentRef?: string; overrideReason?: string; previewHash?: string
}
export interface ExemptionPreview {
  runId: number; employeeId: number; employeeName: string | null; scopeKind: ExemptionScopeKind; disposition: ExemptionDisposition; dispositionLabel: string
  basis: string; basisLabel: string; status: ExemptionStatus; statusLabel: string; estimatedAmount: string; lines: ExemptionLine[]
  protectedItems: ExemptionProtectedItem[]; warnings: ExemptionWarning[]; overrides: Array<Record<string, unknown>>; supersedes: number[]
  attachmentThreshold: string; dayRate: string; previewHash: string
}
export interface MyExemptionView {
  id: number; runId: number; runName: string | null; period: string; targetLabel: string; dispositionLabel: string; status: ExemptionStatus; statusLabel: string
  reason: string; grantorBasisLabel: string; amount: string | null; amountIsFinal: boolean; grantedAt: string; lines: ExemptionLine[]
}
export interface GrantableRun { id: number; name: string | null; period: string; candidates: number }
export interface PayslipExemption {
  id: number; status: ExemptionStatus; statusLabel: string; scopeKind: ExemptionScopeKind; scopeLabel: string; targetLabel: string
  disposition: ExemptionDisposition; dispositionLabel: string; reason: string; grantorBasis: string; grantorBasisLabel: string
  grantedAt: string; approvedAt: string | null; hasAttachment: boolean; amount: string
}
export interface ExemptionReport {
  period: { from: string; to: string }
  thresholds: { repeatAlertCount: number; maxPctPerGrantor: number; typeDrainAlertPct: number }
  totals: { exemptions: number; applied: number; pending: number; active: number; rejected: number; revoked: number; expired: number; exemptedAmount: string; collectedDeductions: string; exemptedPctOfDeductions: number }
  reconciliation: { snapshots: string; payrollItems: string; difference: string }
  alerts: { grantors: ExemptionReport['byGrantor']; employees: ExemptionReport['byEmployee']; types: ExemptionReport['byType'] }
  byGrantor: Array<{ userId: number; name: string | null; bases: string[]; count: number; applied: number; approvedOrActive: number; rejected: number; revoked: number; amount: string; pctOfScopeDeductions: number; flagged: boolean }>
  byEmployee: Array<{ employeeId: number; fullName: string | null; employeeCode: string | null; last3Months: number; last6Months: number; last12Months: number; amount: string; targets: string[]; flaggedRepeat: boolean }>
  byType: Array<{ key: string; label: string; exempted: string; collected: string; drainRatePct: number; flagged: boolean }>
  byRun: Array<{ runId: number; name: string | null; period: string; status: string; statusLabel: string; exempted: string; bonuses: string; totalNet: string | null }>
  exceptions: {
    aboveThresholdWithoutAttachment: Array<{ id: number; employeeId: number; amount: string | null; threshold: string }>
    reexemptionsAfterRevoke: Array<{ id: number; employeeId: number }>
    rejectedStructuralGrants: Array<{ id: number; employeeId: number; basisLabel: string; decisionReason: string | null }>
    limitOverrides: Array<{ id: number; employeeId: number; overrides: Array<Record<string, unknown>> }>
  }
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const fetchRunExemptions = (runId: number) => apiFetch<RunExemptionsView>(`/payroll/exemptions/runs/${runId}`)
export const fetchExemptionCandidates = (runId: number) => apiFetch<{ run: ExemptionEmployeeEntries['run']; employees: ExemptionCandidate[] }>(`/payroll/exemptions/runs/${runId}/candidates`)
export const fetchExemptionEntries = (runId: number, employeeId: number) => apiFetch<ExemptionEmployeeEntries>(`/payroll/exemptions/runs/${runId}/candidates?employeeId=${employeeId}`)
export const previewExemption = (input: ExemptionInput) => post<ExemptionPreview>('/payroll/exemptions/preview', input)
export const grantExemption = (input: ExemptionInput) => post<ExemptionView>('/payroll/exemptions', input)
export const approveExemption = (id: number, reason: string, expectedRevision?: number) => post<ExemptionView>(`/payroll/exemptions/${id}/approve`, { reason, expectedRevision })
export const rejectExemption = (id: number, reason: string, expectedRevision?: number) => post<ExemptionView>(`/payroll/exemptions/${id}/reject`, { reason, expectedRevision })
export const revokeExemption = (id: number, reason: string, expectedRevision?: number) => post<ExemptionView>(`/payroll/exemptions/${id}/revoke`, { reason, expectedRevision })
export const attachExemption = (id: number, attachmentRef: string) => post<ExemptionView>(`/payroll/exemptions/${id}/attachment`, { attachmentRef })
export const fetchExemptionDetail = (id: number) => apiFetch<ExemptionView>(`/payroll/exemptions/${id}`)
export const fetchExemptions = (query: { status?: ExemptionStatus; period?: string; runId?: number } = {}) => {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)]))
  return apiFetch<ExemptionView[]>(`/payroll/exemptions${params.toString() ? `?${params}` : ''}`)
}
export const fetchMyExemptions = () => apiFetch<MyExemptionView[]>('/payroll/exemptions/mine')
export const fetchGrantableExemptionRuns = () => apiFetch<GrantableRun[]>('/payroll/exemptions/grantable-runs')
export const fetchExemptionReport = (fromPeriod: string, toPeriod: string) =>
  apiFetch<ExemptionReport>(`/payroll/exemptions/report?fromPeriod=${encodeURIComponent(fromPeriod)}&toPeriod=${encodeURIComponent(toPeriod)}`)

export interface SavedFinancialExemptions {
  applied: Array<{ id: number; revision: number }>
  requested: { lateness: string; shortfall: string; absence: string }
  lines: ExemptionLine[]
  protectedItems: ExemptionProtectedItem[]
  totals: { exempted: string; byComponent: Partial<Record<ExemptionComponent, { exempted: string; lines: number }>>; byExemption: Array<{ exemptionId: number; amount: string; lines: number }> }
}
/** تفصيل الإعفاء المحفوظ مع بند المسير (قراءة فقط)؛ null = البند بلا إعفاء أو تفصيل تالف. */
export function savedFinancialExemptions(item: Pick<ApiPayrollItem, 'breakdown'> | null | undefined): SavedFinancialExemptions | null {
  try {
    const value = JSON.parse(item?.breakdown || '{}').financialExemptions
    if (!value || !Array.isArray(value.lines) || !Array.isArray(value.applied) || !value.totals) return null
    return value as SavedFinancialExemptions
  } catch { return null }
}
