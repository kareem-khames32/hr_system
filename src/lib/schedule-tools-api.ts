// B5.5: «أدوات الجدولة» — ميزة فرعية shifts.advanced (مقفولة افتراضيًا). الكتابة كلها بتعدّي من الجدول الأسبوعي القايم.
import { apiFetch } from './api'

export interface ApiShiftRotation { id: number; name: string; branchId: number | null; shiftIds: number[]; isActive: boolean }
export interface ApiScheduleTools {
  ready: boolean
  /** حساب نطاقه كل الفروع (يقدر يعمل نمط «لكل الفروع») */
  companyWide: boolean
  rotations: ApiShiftRotation[]
  shifts: Array<{ id: number; name: string; startTime: string; endTime: string }>
  branches: Array<{ id: number; name: string }>
  publications: Array<{ id: number; weekStart: string; branchId: number; employeesCount: number; note: string | null; publishedAt: string; publishedByName: string | null }>
}
export interface ScheduleSkip { employeeId: number; reason: string }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const T = '/attendance/schedule-tools'
export const fetchScheduleTools = () => apiFetch<ApiScheduleTools>(T)
export const createShiftRotation = (body: { name: string; branchId: number | null; shiftIds: number[]; isActive?: boolean }) => apiFetch<{ id: number }>(`${T}/rotations`, json('POST', body))
export const updateShiftRotation = (id: number, body: { name: string; branchId: number | null; shiftIds: number[]; isActive?: boolean }) => apiFetch<{ id: number }>(`${T}/rotations/${id}`, json('PATCH', body))
export const copyScheduleWeek = (body: { fromWeek: string; toWeek: string; branchId: number | null; overwrite: boolean }) =>
  apiFetch<{ source: number; copied: number; alreadyScheduled: number; skipped: ScheduleSkip[] }>(`${T}/copy-week`, json('POST', body))
export const applyShiftRotation = (body: { rotationId: number; employeeIds: number[]; fromWeek: string; weeks: number; startIndex: number }) =>
  apiFetch<{ weeks: number; saved: number; skipped: ScheduleSkip[] }>(`${T}/apply-rotation`, json('POST', body))
export const publishScheduleWeek = (body: { week: string; branchId: number; note?: string; overrideReason?: string }) =>
  apiFetch<{ id: number; employeesCount: number; warnings: number; blocked: number }>(`${T}/publish`, json('POST', body))

// ===== (ب) قواعد فحص الجدول =====
export type RuleKind = 'MIN_REST_HOURS' | 'MAX_DAY_HOURS' | 'MAX_WEEK_HOURS'
export type Severity = 'WARN' | 'BLOCK'
export interface ApiScheduleRule { id: number; kind: RuleKind; limitHours: number; severity: Severity; branchId: number | null; isActive: boolean }
export interface ApiCoverageRule { id: number; shiftId: number; skillId: number; minLevel: string; minCount: number; severity: Severity; isActive: boolean }
export interface ApiScheduleRules {
  ready: boolean; kinds: Array<{ code: RuleKind; label: string }>; severities: Array<{ code: Severity; label: string }>
  rules: ApiScheduleRule[]; coverage: ApiCoverageRule[]; skills: Array<{ id: number; name: string }>
}
export interface ApiScheduleChecks {
  week: string; branchId: number; warnings: number; blocked: number
  violations: Array<{ kind: string; kindLabel: string; severity: Severity; severityLabel: string; employeeId: number | null; employeeName: string | null; shiftId: number | null; shiftName: string | null; detail: string }>
}
export const fetchScheduleRules = () => apiFetch<ApiScheduleRules>(`${T}/rules`)
export const saveScheduleRule = (body: Omit<ApiScheduleRule, 'id'>, id?: number) => apiFetch<{ id: number }>(id ? `${T}/rules/${id}` : `${T}/rules`, json(id ? 'PATCH' : 'POST', body))
export const saveCoverageRule = (body: Omit<ApiCoverageRule, 'id'>, id?: number) => apiFetch<{ id: number }>(id ? `${T}/coverage/${id}` : `${T}/coverage`, json(id ? 'PATCH' : 'POST', body))
export const checkScheduleWeek = (week: string, branchId: number) => apiFetch<ApiScheduleChecks>(`${T}/checks?week=${week}&branchId=${branchId}`)
