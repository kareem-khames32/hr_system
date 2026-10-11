// B-ADD.3: كروت لوحة الإدارة — نداء لكل كارت (كل كارت بيتحمّل لوحده) بفلتر اللوحة الموحد واليوم المختار.
// الخادم هو اللي بيفرض الصلاحية والنطاق: الكارت اللي مش مسموح مش راجع في fetchDashboardAccess فمابيتطلبش، والمبلغ ورقم التليفون
// مابيرجعوش أصلًا لمن لا يملك صلاحيتهم (الحقل مش موجود، مش مخفي هنا).
import { apiFetch } from './api'
import { orgFilterQuery, type OrgFilterParams } from './org-filter'

export type DashboardCardKey = 'attendance' | 'absentLate' | 'leaves' | 'workforce' | 'requests' | 'tasks' | 'overtime' | 'payroll' | 'trends'
export type DashboardTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray'
export type AttendanceBucket = 'present' | 'late' | 'absent' | 'leave' | 'mission' | 'pending' | 'rest' | 'other'

export interface DashboardAccess {
  today: string
  cards: Array<{ key: DashboardCardKey; title: string; href: string }>
  money: boolean
  contact: boolean
  documents: boolean
  buckets: Array<{ key: AttendanceBucket; label: string; tone: DashboardTone }>
}

/** فلتر اللوحة: الفلتر الموحد + اليوم المختار */
export interface DashboardFilter { org: OrgFilterParams; date: string }

const withFilter = (path: string, filter: DashboardFilter | { org: OrgFilterParams }, extra: Record<string, string | undefined> = {}) => {
  const query = new URLSearchParams(orgFilterQuery(filter.org))
  if ('date' in filter && filter.date) query.set('date', filter.date)
  for (const [key, value] of Object.entries(extra)) if (value) query.set(key, value)
  const text = query.toString()
  return `/dashboard/cards${path}${text ? `?${text}` : ''}`
}

export const fetchDashboardAccess = () => apiFetch<DashboardAccess>('/dashboard/cards')

// ===== «إدارة ← قسم ← فريق» =====
export interface CardGroupLabel { group: string; name: string; level: string }
export interface CardGroupRow {
  group: string
  kind: 'unit' | 'team' | 'direct' | 'none'
  id: number | null
  name: string
  level: string
  branchName: string | null
  expandable: boolean
  total: number
}

// ===== كارت 1 و2: الحضور =====
export type BucketCounts = Record<AttendanceBucket, number>
export interface AttendanceCard {
  date: string
  today: string
  isToday: boolean
  group: CardGroupLabel | null
  total: number
  counts: BucketCounts
  rows: Array<CardGroupRow & { counts: BucketCounts }>
}
export interface AttendancePerson {
  id: number
  name: string
  code: string | null
  jobTitle: string | null
  unit: string | null
  team: string | null
  shift: string | null
  firstPunch: string | null
  bucket: AttendanceBucket
  status: string
  detail: string | null
  lateMinutes: number
  // موجود بس لمن يملك صلاحية عرض الموظفين
  phone?: string | null
}
export interface AttendanceEmployees { date: string; group: CardGroupLabel | null; bucket: AttendanceBucket; total: number; truncated: boolean; employees: AttendancePerson[] }
export interface AbsentLateCard {
  date: string
  isToday: boolean
  absent: number
  late: number
  contact: boolean
  truncated: boolean
  teams: Array<{ name: string; unit: string | null; absent: AttendancePerson[]; late: AttendancePerson[] }>
}

export const fetchAttendanceCard = (filter: DashboardFilter, group?: string) => apiFetch<AttendanceCard>(withFilter('/attendance', filter, { group }))
export const fetchAttendanceEmployees = (filter: DashboardFilter, bucket: AttendanceBucket, group?: string) =>
  apiFetch<AttendanceEmployees>(withFilter('/attendance/employees', filter, { group, bucket }))
export const fetchAbsentLateCard = (filter: DashboardFilter) => apiFetch<AbsentLateCard>(withFilter('/absent-late', filter))

// ===== كارت 3: الإجازات =====
export interface LeavesCard {
  date: string
  isToday: boolean
  weekEnd: string
  today: { onLeave: number; halfDay: number }
  nextWeek: { employees: number; list: Array<{ id: number; name: string; unit: string | null; team: string | null; type: string; from: string; to: string; halfDay: boolean }> }
  topUnits: Array<{ id: number | null; name: string; days: number; employees: number }>
}
export const fetchLeavesCard = (filter: DashboardFilter) => apiFetch<LeavesCard>(withFilter('/leaves', filter))

// ===== كارت 4: القوى العاملة =====
export interface DatedPerson { id: number; name: string; unit: string | null; team: string | null; date: string; daysLeft: number }
export interface WorkforceCard {
  date: string
  group: CardGroupLabel | null
  headcount: number
  active: number
  onProbation: number
  total: number
  rows: CardGroupRow[]
  period: { period: string; from: string; to: string }
  joiners: { count: number; list: DatedPerson[] }
  leavers: number
  windowDays: number
  probationEnding: { count: number; list: DatedPerson[] }
  contractsEnding: { count: number; expired: number; list: DatedPerson[] }
  passportsEnding: { count: number; list: DatedPerson[] }
  // موجود بس لمن يملك صلاحية إدارة المستندات
  documentsEnding?: { expired: number; count: number; byType: Array<{ type: string; count: number }>; list: Array<DatedPerson & { type: string; expired: boolean }> }
}
export interface WorkforceLevel { group: CardGroupLabel | null; total: number; rows: CardGroupRow[] }
export const fetchWorkforceCard = (filter: { org: OrgFilterParams }) => apiFetch<WorkforceCard>(withFilter('/workforce', filter))
export const fetchWorkforceLevel = (filter: { org: OrgFilterParams }, group: string) => apiFetch<WorkforceLevel>(withFilter('/workforce', filter, { group }))

// ===== كارت 5: الطلبات =====
export interface RequestsCard {
  pending: number
  overdue: number
  approvedNotExecuted: number
  oldestDays: number
  byType: Array<{ code: string; name: string; count: number; overdue: number }>
  byAge: Array<{ key: string; label: string; tone: DashboardTone; count: number }>
}
export const fetchRequestsCard = (filter: { org: OrgFilterParams }) => apiFetch<RequestsCard>(withFilter('/requests', filter))

// ===== كارت 6: المهام =====
export interface TasksCard {
  available: boolean
  open: number
  overdue: number
  people?: number
  assignees: Array<{ employeeId: number | null; role: string | null; name: string; open: number; overdue: number }>
}
export const fetchTasksCard = (filter: { org: OrgFilterParams }) => apiFetch<TasksCard>(withFilter('/tasks', filter))

// ===== كارت 7: الإضافي =====
export interface CurrencyAmount { currency: string; amount: number }
export interface OvertimeCard {
  period: string
  from: string
  to: string
  hours: number
  entries: number
  pendingEntries: number
  // موجود بس لمن يملك صلاحية عرض الرواتب
  amounts?: CurrencyAmount[]
  byUnit: Array<{ id: number | null; name: string; hours: number; entries: number; amounts?: CurrencyAmount[] }>
}
export const fetchOvertimeCard = (filter: { org: OrgFilterParams }) => apiFetch<OvertimeCard>(withFilter('/overtime', filter))

// ===== كارت 8: الرواتب =====
export interface PayrollCard {
  period: string
  from: string
  to: string
  upTo: string
  note: string
  runs: Array<{ id: number; name: string | null; status: string; runType: string; totalNet: number }>
  runsFiltered: boolean
  accrued: {
    available: boolean
    employees: number
    incomplete: number
    byCurrency: Array<{ currency: string; employees: number; earned: number; overtime: number; deductions: number; estimatedNet: number }>
  }
  alerts: Array<{ tone: 'red' | 'yellow'; text: string; count: number }>
}
export const fetchPayrollCard = (filter: { org: OrgFilterParams }) => apiFetch<PayrollCard>(withFilter('/payroll', filter))

// ===== كارت 9: الاتجاهات =====
export interface TrendRates { required: number; attendance: number | null; late: number | null; absence: number | null }
export interface TrendsCard {
  from: string
  to: string
  group: CardGroupLabel | null
  summary: TrendRates & { tone: DashboardTone }
  days: Array<{ date: string } & TrendRates>
  units: Array<{ group: string; name: string; level: string; expandable: boolean; tone: DashboardTone } & TrendRates>
}
export const fetchTrendsCard = (filter: DashboardFilter, group?: string) => apiFetch<TrendsCard>(withFilter('/trends', filter, { group }))

// ===== «اتصل/راسل»: لينكات بتتبني في المتصفح من رقم الملف — الخادم مابيبعتش حاجة =====
/** الرقم بأرقامه بس (ومعاه + لو دولي) — null لرقم فاضي أو أقصر من 6 أرقام */
export function dialNumber(phone: string | null | undefined): string | null {
  const text = String(phone ?? '').trim()
  const digits = text.replace(/[^\d]/g, '')
  if (digits.length < 6) return null
  return text.startsWith('+') ? `+${digits}` : digits
}
export const telLink = (phone: string | null | undefined): string | null => {
  const number = dialNumber(phone)
  return number ? `tel:${number}` : null
}
/** لينك واتساب للرقم الدولي بس (بـ+ أو 00): الرقم المحلي من غير كود دولة مالوش لينك مضمون */
export const whatsappLink = (phone: string | null | undefined): string | null => {
  const number = dialNumber(phone)
  if (!number) return null
  const international = number.startsWith('+') ? number.slice(1) : number.startsWith('00') ? number.slice(2) : null
  return international && international.length >= 8 ? `https://wa.me/${international}` : null
}

export const RUN_STATUS_LABELS: Record<string, { label: string; tone: DashboardTone }> = {
  DRAFT: { label: 'مسودة', tone: 'gray' },
  CALCULATED: { label: 'محسوب — مستني اعتماد', tone: 'yellow' },
  APPROVED: { label: 'معتمد', tone: 'blue' },
  PAID: { label: 'مصروف', tone: 'green' },
  CANCELLED: { label: 'ملغي', tone: 'gray' },
}

// ===== B-ADD.7: اللوحة الإحصائية =====
/** تعيينات مقابل خروج لآخر شهور (أعداد بس) — بنفس صلاحية كارت القوى العاملة */
export interface WorkforceMonthly { from: string; to: string; months: Array<{ month: string; joiners: number; leavers: number }> }
export const fetchWorkforceMonthly = (filter: { org: OrgFilterParams }) => apiFetch<WorkforceMonthly>(withFilter('/workforce/monthly', filter))

/** شريط الموديولات: رقم أو اتنين من كل موديول مفعّل للحساب ومعاه صلاحية شاشته — الخادم بيرجّع المسموح بس */
export interface ModuleTile {
  key: string
  title: string
  href: string
  stats: Array<{ label: string; value: number; tone: DashboardTone; suffix?: string }>
}
export interface ModulesStrip { modules: ModuleTile[] }
export const fetchModulesStrip = (filter: { org: OrgFilterParams }) => apiFetch<ModulesStrip>(withFilter('/modules', filter))
