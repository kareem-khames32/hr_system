import { apiFetch, type ApiAttendanceDay, type ApiOvertimeEntry, type ApiPunch } from './api'
import { dayRangeQuery, type DayRange } from './payroll-month-range'

// استعلامات الحضور والإضافي باليوم (?from=&to=) — كل الشاشات بتبعت الفترة؛ الـAPI لسه بيقبل ?month= للتوافق بس

export const fetchAttendanceSheetRange = (employeeId: number, range: DayRange) =>
  apiFetch<{ employeeId: number; month: string; from: string; to: string; days: ApiAttendanceDay[]; summary: Record<string, number> }>(
    `/attendance/monthly?employeeId=${employeeId}&${dayRangeQuery(range)}`)

export const fetchOvertimeLogRange = (range: DayRange) =>
  apiFetch<{ month: string; from: string; to: string; requiresConfirmation: boolean; entries: ApiOvertimeEntry[] }>(
    `/attendance/overtime?${dayRangeQuery(range)}`)

export const fetchPunchesRange = (source: 'MANUAL' | 'DEVICE', range: DayRange) =>
  apiFetch<ApiPunch[]>(`/attendance/punches?source=${source}&${dayRangeQuery(range)}`)

export const fetchAttendanceReportRange = (range: DayRange) => apiFetch<any[]>(`/reports/attendance?${dayRangeQuery(range)}`)
export const fetchOvertimeReportRange = (range: DayRange) => apiFetch<any[]>(`/reports/overtime?${dayRangeQuery(range)}`)
