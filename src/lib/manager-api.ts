// B2.14: لوحة «فريقي» للمدير الهيكلي — قراءة بنطاق فريق صاحب الحساب في الهيكل (الخادم بيحكم بموقعه؛ مفيش مفتاح صلاحية)
import { apiFetch, sessionMark } from './api'

export interface TeamMember {
  id: number; employeeCode: string; fullName: string; jobTitle: string | null; status: string
  branchName: string | null; departmentName: string | null; teamName: string | null
  /** مرؤوس مباشر (مش أبعد في الشجرة) */
  direct: boolean
  /** بيتبعتوا للي معاه حق عرض الرواتب بس، ولموظف جوه نطاق فروعه */
  basicSalary?: string | null
  currency?: string | null
}
export interface TeamAttendanceRow { employeeId: number; fullName: string; status: string; checkIn: string | null; checkOut: string | null; lateMinutes: number }
export interface TeamLeave { employeeId: number; fullName: string; fromDate: string; toDate: string; days: number; period: string }
export interface TeamExpiry { employeeId: number; fullName: string; kind: 'probation' | 'contract' | 'document'; label: string; date: string; daysLeft: number }
export interface TeamOverview {
  manager: true
  date: string
  windowDays: number
  canSeeCompensation: boolean
  team: TeamMember[]
  /** null = موديول الحضور مقفول للحساب */
  attendanceToday: { attended: number; late: number; absent: number; onLeave: number; none: number; rows: TeamAttendanceRow[] } | null
  /** null = موديول الإجازات مقفول للحساب */
  leaves: TeamLeave[] | null
  expiring: TeamExpiry[]
  pendingApprovals: number
  tasks: { open: number; overdue: number }
}

export const fetchTeamOverview = () => apiFetch<TeamOverview | { manager: false }>('/manager/team')

// بند «فريقي» في القايمة: سؤال واحد للجلسة (بمفتاح التوكن) — مش مع كل انتقال
let statusCache: { token: string | null; value: Promise<boolean> } | null = null
export function fetchTeamManager(): Promise<boolean> {
  const token = sessionMark()
  if (!statusCache || statusCache.token !== token) {
    const value = apiFetch<{ manager: boolean }>('/manager/status').then((result) => result.manager === true)
    statusCache = { token, value }
    // نداء فاشل مايتخزّنش: المحاولة الجاية تسأل تاني
    value.catch(() => { if (statusCache?.value === value) statusCache = null })
  }
  return statusCache.value
}

/** حالة حضور اليوم كنص للمدير */
export const TEAM_ATTENDANCE_LABELS: Record<string, string> = {
  present: 'حاضر', late: 'متأخر', early_leave: 'انصرف بدري', absent: 'غايب', leave: 'في إجازة', partial_leave: 'إجازة جزء من اليوم',
  holiday: 'عطلة', missing_punch: 'بصمة ناقصة', mission: 'مأمورية', remote: 'عن بعد', exempt: 'مستثنى من البصمة', none: 'من غير بصمة لسه',
}
export const TEAM_ATTENDANCE_STYLES: Record<string, string> = {
  present: 'bg-success-50 text-success-700', late: 'bg-warning-50 text-warning-700', early_leave: 'bg-warning-50 text-warning-700',
  absent: 'bg-red-100 text-red-700', leave: 'bg-blue-50 text-blue-700', none: 'bg-gray-100 text-gray-600',
}

/** «باقي N يوم» / «النهارده» / «فات من N يوم» */
export function teamDaysLeftText(daysLeft: number): string {
  if (daysLeft === 0) return 'النهارده'
  return daysLeft > 0 ? `باقي ${daysLeft} يوم` : `فات من ${-daysLeft} يوم`
}
