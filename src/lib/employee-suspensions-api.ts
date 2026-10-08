// الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر) — نداءات الواجهة وقواعدها المشتركة مع الخادم
import { apiFetch } from './api'
import { addDays, inclusiveDays, isValidDate, SUSPENSION_REASON_MAX, SUSPENSION_REASON_MIN, SUSPENSION_STATE_LABELS,
  suspensionEndPlan, suspensionInputIssue, type SuspensionState, type SuspensionStatus } from '../../api/src/employees/employee-suspension-rules'

export { addDays, inclusiveDays, isValidDate, SUSPENSION_REASON_MAX, SUSPENSION_REASON_MIN, SUSPENSION_STATE_LABELS, suspensionEndPlan, suspensionInputIssue }
export type { SuspensionState, SuspensionStatus }

export interface EmployeeSuspension {
  id: number
  employeeId: number
  fromDate: string
  toDate: string
  plannedToDate: string
  reason: string
  status: SuspensionStatus
  state: SuspensionState
  endReason: string | null
  endedAt: string | null
  endedByUserId: number | null
  createdByUserId: number | null
  createdAt: string
  // B4.5 (د): إيقاف احتياطي بأجر — أيامه ماتتخصمش
  paid?: boolean
}

// B4.8 (أ): تصدير بيانات موظف واحد كاملة (طلب اطلاع) — للي معاه «تعديل الموظفين»
export interface ApiEmployeeDataExport {
  exportedAt: string; employeeId: number; employee: Record<string, unknown>
  sections: Array<{ key: string; label: string; count: number; truncated: boolean; rows: unknown[] }>
}
export const fetchEmployeeDataExport = (employeeId: number) => apiFetch<ApiEmployeeDataExport>(`/employees/${employeeId}/data-export`)

export const fetchSuspensionOptions = (employeeId: number) =>
  apiFetch<{ paidAvailable: boolean; paidMaxDays: number | null }>(`/employees/${employeeId}/suspension-options`)

export const fetchEmployeeSuspensions = (employeeId: number) =>
  apiFetch<EmployeeSuspension[]>(`/employees/${employeeId}/suspensions`)

export const suspendEmployee = (employeeId: number, body: { fromDate: string; toDate: string; reason: string; paid?: boolean }) =>
  apiFetch<EmployeeSuspension>(`/employees/${employeeId}/suspensions`, { method: 'POST', body: JSON.stringify(body) })

export const endEmployeeSuspension = (employeeId: number, suspensionId: number, body: { returnDate: string; reason?: string }) =>
  apiFetch<EmployeeSuspension>(`/employees/${employeeId}/suspensions/${suspensionId}/end`, { method: 'POST', body: JSON.stringify(body) })

export const dayCountText = (days: number) => days === 1 ? 'يوم واحد' : days === 2 ? 'يومين' : days <= 10 ? `${days} أيام` : `${days} يوم`

/** «من 2026-09-20 إلى 2026-09-25 (6 أيام)» */
export function suspensionPeriodText(period: Pick<EmployeeSuspension, 'fromDate' | 'toDate' | 'paid'>): string {
  return `من ${period.fromDate} إلى ${period.toDate} (${dayCountText(inclusiveDays(period.fromDate, period.toDate))})${period.paid ? ' — بأجر' : ''}`
}

/** وصف سطر السجل: الحالة + الإنهاء المبكر أو الإلغاء لو حصل */
export function suspensionHistoryNote(period: EmployeeSuspension): string | null {
  if (period.status === 'CANCELLED') return `اتلغى${period.endReason ? ` — ${period.endReason}` : ''}`
  if (period.status === 'ENDED_EARLY') {
    return `اتنهى بدري (كان مقرر لحد ${period.plannedToDate}) — رجع للعمل ${addDays(period.toDate, 1)}${period.endReason ? ` — ${period.endReason}` : ''}`
  }
  return null
}
