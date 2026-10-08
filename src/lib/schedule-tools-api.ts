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
export const publishScheduleWeek = (body: { week: string; branchId: number; note?: string }) => apiFetch<{ id: number; employeesCount: number }>(`${T}/publish`, json('POST', body))
