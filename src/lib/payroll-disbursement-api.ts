// صرف المسير موظف بموظف (قرار المالك 22 سبتمبر): حامل payroll.disburse يعلّم «تم الصرف / لم يتم» على كل موظف في مسير معتمد.
// كل الأرقام والإجماليات (تم / لم يتم، بنك / نقدي) من الخادم بنفس دوال كشف البنوك؛ الشاشة بتعرض وبس.
import { apiFetch } from './api'
import type { PayrollPayChannel } from './payroll-runs-api'

export type PayrollDisbursementState = 'PAID' | 'UNPAID' | 'SETTLEMENT' | 'NO_AMOUNT'
export type PayrollDisbursementMode = 'NOT_STARTED' | 'PER_EMPLOYEE' | 'RUN_LEVEL'
export type PayrollDisbursementMarking = 'OPEN' | 'LATE_ONLY' | 'CLOSED'
export interface PayrollDisbursementBucket { count: number; total: number; bank: number; cash: number }
export interface PayrollDisbursementTotals {
  paid: PayrollDisbursementBucket; unpaid: PayrollDisbursementBucket; payable: PayrollDisbursementBucket
  settlement: { count: number; total: number }; noAmount: number; issues: number
}
export interface PayrollDisbursementRunRef {
  id: number; name: string | null; period: string; startDate: string; endDate: string; status: 'APPROVED' | 'PAID'; runType: string
}
export interface PayrollDisbursementRunOption extends PayrollDisbursementRunRef { totalNet: number; markedPaid: number }
export interface PayrollDisbursementRunView extends PayrollDisbursementRunRef {
  mode: PayrollDisbursementMode; marking: PayrollDisbursementMarking
  closed: { at: string | null; by: { id: number; name: string | null } | null; channel: string | null; channelLabel: string | null; reference: string | null } | null
}
export interface PayrollDisbursementRow {
  itemId: number; employeeId: number; employeeCode: string; fullName: string
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null; teamId: number | null; teamName: string | null
  payMethod: string; payMethodLabel: string; bankName: string | null; iban: string | null
  netPay: number; bankAmount: number; cashAmount: number; issue: string | null
  state: PayrollDisbursementState; stateLabel: string; tickable: boolean
  markedBy: { id: number; name: string | null } | null; markedAt: string | null; note: string | null
  settlement: { caseId: number; lastWorkingDay: string } | null
}
export interface PayrollDisbursementFacet<T extends number | string = number> { id: T; name: string }
export interface PayrollDisbursementView {
  run: PayrollDisbursementRunView
  totals: PayrollDisbursementTotals; filteredTotals: PayrollDisbursementTotals
  counts: { all: number; shown: number }
  bulk: { markPaid: number; markUnpaid: number }
  facets: { branches: PayrollDisbursementFacet[]; departments: PayrollDisbursementFacet[]; teams: PayrollDisbursementFacet[]; payMethods: PayrollDisbursementFacet<string>[] }
  rows: PayrollDisbursementRow[]
}
export interface PayrollDisbursementMarkResult extends PayrollDisbursementView { changed: number; unchanged: number }
export interface PayrollDisbursementFilter {
  branchId: number | null; departmentId: number | null; teamId: number | null; payMethod: string; state: '' | PayrollDisbursementState; search: string
}
export interface PayrollDisbursementSummary {
  period: string | null; runId: number | null
  runs: Array<PayrollDisbursementRunView & PayrollDisbursementTotals & { unpaidReason: string | null }>
  totals: PayrollDisbursementTotals
}

export const emptyDisbursementFilter = (): PayrollDisbursementFilter => ({ branchId: null, departmentId: null, teamId: null, payMethod: '', state: '', search: '' })
export const disbursementFilterCount = (filter: PayrollDisbursementFilter) =>
  [filter.branchId, filter.departmentId, filter.teamId, filter.payMethod, filter.state, filter.search.trim()].filter(Boolean).length

/** الفلاتر المفعّلة فقط — نفس الجسم لنداء القراءة (query) ونداء التعليم الجماعي (filter). */
export function disbursementFilterBody(filter: PayrollDisbursementFilter): Record<string, string | number> {
  const body: Record<string, string | number> = {}
  if (filter.branchId) body.branchId = filter.branchId
  if (filter.departmentId) body.departmentId = filter.departmentId
  if (filter.teamId) body.teamId = filter.teamId
  if (filter.payMethod) body.payMethod = filter.payMethod
  if (filter.state) body.state = filter.state
  if (filter.search.trim()) body.search = filter.search.trim()
  return body
}
const queryOf = (filter: PayrollDisbursementFilter) => {
  const query = new URLSearchParams(Object.entries(disbursementFilterBody(filter)).map(([key, value]) => [key, String(value)])).toString()
  return query ? `?${query}` : ''
}
const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const fetchDisbursementRuns = () => apiFetch<PayrollDisbursementRunOption[]>('/payroll/disbursement/runs')
export const fetchDisbursementView = (runId: number, filter: PayrollDisbursementFilter) =>
  apiFetch<PayrollDisbursementView>(`/payroll/disbursement/runs/${runId}${queryOf(filter)}`)
export const markDisbursement = (runId: number, input: { itemIds: number[]; paid: boolean; note?: string }, filter: PayrollDisbursementFilter) =>
  post<PayrollDisbursementMarkResult>(`/payroll/disbursement/runs/${runId}/mark`, { itemIds: input.itemIds, paid: input.paid,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}), filter: disbursementFilterBody(filter) })
/** «علّم المفلتر»: الخادم بيطبق نفس الفلاتر بنفسه، و expectedCount هو العدد اللي الشاشة عرضته (الخادم يرفض لو اتغير). */
export const markDisbursementFiltered = (runId: number, input: { paid: boolean; note?: string; expectedCount: number }, filter: PayrollDisbursementFilter) =>
  post<PayrollDisbursementMarkResult>(`/payroll/disbursement/runs/${runId}/mark-filtered`, { paid: input.paid, expectedCount: input.expectedCount,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}), filter: disbursementFilterBody(filter) })
export const fetchDisbursementSummary = (scope: { runId: number } | { period: string }) =>
  apiFetch<PayrollDisbursementSummary>(`/payroll/disbursement/summary?${'runId' in scope ? `runId=${scope.runId}` : `period=${encodeURIComponent(scope.period)}`}`)
/** «إقفال الصرف» = صرف المسير القائم نفسه (قفل الإضافي وترحيل الأقساط مرة واحدة)، بسبب مكتوب لمن لم يُصرف له. */
export const closePayrollDisbursement = (runId: number, record: { channel: PayrollPayChannel; reference: string; unpaidReason?: string }) =>
  post<{ id: number; status: string }>(`/payroll/runs/${runId}/pay`, { channel: record.channel, reference: record.reference.trim(),
    ...(record.unpaidReason?.trim() ? { unpaidReason: record.unpaidReason.trim() } : {}) })

export const DISBURSEMENT_STATE_LABELS: Record<PayrollDisbursementState, string> = {
  PAID: 'تم الصرف', UNPAID: 'لم يتم', SETTLEMENT: 'مصروف مع التصفية', NO_AMOUNT: 'لا يوجد مبلغ للصرف',
}
export const DISBURSEMENT_MODE_LABELS: Record<PayrollDisbursementMode, string> = {
  NOT_STARTED: 'لسه ماحدش اتعلّم', PER_EMPLOYEE: 'الصرف موظف بموظف', RUN_LEVEL: 'اتصرف كله مرة واحدة',
}
export const disbursementUnpaidReasonReady = (reason: string) => reason.trim().length >= 3 && reason.trim().length <= 500

export const DISBURSEMENT_CSV_HEADER = ['الرقم الوظيفي', 'الاسم', 'الفرع', 'القسم', 'الفريق', 'طريقة الصرف', 'البنك', 'الآيبان', 'الصافي', 'تحويل بنكي', 'نقدي',
  'حالة الصرف', 'علّمه', 'وقت العلامة', 'ملاحظة']
/** صفوف التصدير كما في الجدول: المبالغ بمنزلتين كما حفظها الخادم، بلا أي حساب في المتصفح. */
export const disbursementCsvRows = (rows: readonly PayrollDisbursementRow[]) => rows.map(row => [row.employeeCode, row.fullName, row.branchName ?? '', row.departmentName ?? '',
  row.teamName ?? '', row.payMethodLabel, row.bankName ?? '', row.iban ?? '', row.netPay.toFixed(2), row.bankAmount.toFixed(2), row.cashAmount.toFixed(2),
  row.stateLabel, row.markedBy?.name ?? '', row.markedAt ? row.markedAt.slice(0, 16).replace('T', ' ') : '', row.note ?? ''])
export const disbursementCsvTotals = (totals: PayrollDisbursementTotals) => [
  ['إجمالي «تم الصرف»', `${totals.paid.count} موظف`, '', '', '', '', '', '', totals.paid.total.toFixed(2), totals.paid.bank.toFixed(2), totals.paid.cash.toFixed(2), '', '', '', ''],
  ['إجمالي «لم يتم»', `${totals.unpaid.count} موظف`, '', '', '', '', '', '', totals.unpaid.total.toFixed(2), totals.unpaid.bank.toFixed(2), totals.unpaid.cash.toFixed(2), '', '', '', ''],
]
