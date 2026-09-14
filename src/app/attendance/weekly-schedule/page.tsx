'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { downloadCsv } from '@/lib/csv'
import { MainLayout } from '@/components/layout'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Copy,
  Save,
  Search,
  Clock,
  Sun,
  Moon,
  Coffee,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Printer,
  FileSpreadsheet,
  Settings,
  Eye,
  Edit3,
  Layers,
  UserCheck,
  X,
  Star,
} from 'lucide-react'
import {
  fetchCatalog,
  fetchWeekSchedule,
  upsertWeekSchedule,
  clearWeekSchedule,
  fetchEmployees,
  fetchDepartments,
  fetchBranches,
  fetchTeams,
  fetchWeekDayOverrides,
  setDayShiftOverride,
  setDayShiftOverridesBulk,
  fetchWorkingDays,
  fetchScheduleRules,
  type ApiEmployee,
  type ApiDepartment,
  type ApiBranch,
  type ApiTeam,
  type ApiScheduleRule,
  type ApiWorkSchedule,
} from '@/lib/api'

// أنواع البيانات
// صف الوردية كما يرجّعه كتالوج الورديات الحقيقي (/catalogs/shifts)
interface ApiShift {
  id: number
  name: string
  startTime: string
  endTime: string
  graceMinutes?: number | null
  shiftMode?: 'fixed' | 'flexible'
  requiredHours?: number | string | null
  isActive?: boolean
}

// وردية جاهزة للعرض — مشتقّة من صف الكتالوج (لا كتالوج مكتوب في الكود)
interface Shift {
  id: string // مفتاح العرض = معرّف الكتالوج كنص ('off' للراحة)
  shiftId?: number // المعرّف الحقيقي — يُرسل مع الحفظ ليقرأ السيرفر الأوقات حيّة
  name: string
  code: string
  color: string
  bgColor: string
  startTime: string
  endTime: string
  workHours: number
  shiftMode?: 'fixed' | 'flexible'
  graceMinutes?: number | null
}

// تجاوز وردية يوم بعينه — يتقدم على وردية الأسبوع (من السيرفر)
interface DayOverride {
  id: number
  employeeId: number
  date: string // YYYY-MM-DD
  shiftId?: number | null // مرجع الوردية في الكتالوج — به تُقرأ الأوقات الحيّة
  shiftName: string
  startTime: string
  endTime: string
}

// صف الموظف في الجدول — الوردية من السيرفر (وردية واحدة لكل موظف/أسبوع)
interface EmployeeRow {
  id: number
  employeeCode: string
  employeeName: string
  department: string
  avatar: string
  position: string
  // معرّفات النطاق — للتعيين الجماعي حسب فريق/قسم/فرع
  departmentId?: number
  branchId?: number | null
  teamId?: number
}

// ===== كتالوج الورديات — يُجلب من الباك (/catalogs/shifts) لا من ثابت هنا =====
// ألوان العرض تُسنَد بالتناوب حسب ترتيب الوردية في الكتالوج
const SHIFT_PALETTE = [
  { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { color: 'text-green-700', bgColor: 'bg-green-100' },
  { color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
  { color: 'text-violet-700', bgColor: 'bg-violet-100' },
  { color: 'text-sky-700', bgColor: 'bg-sky-100' },
  { color: 'text-teal-700', bgColor: 'bg-teal-100' },
]

// رمز مختصر للوردية من اسمها (الرقم إن وُجد، وإلا أول حرف)
const shiftCode = (name: string): string => {
  const raw = String(name ?? '')
  const digits = raw.match(/\d+/)
  if (digits) return digits[0]
  return raw.trim().charAt(0) || '؟'
}

// ساعات الوردية من وقتيها — تتخطى منتصف الليل للورديات الليلية
const hoursBetween = (start: string, end: string): number => {
  const [sh, sm] = String(start ?? '').split(':').map(Number)
  const [eh, em] = String(end ?? '').split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  let mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

// صف الكتالوج → وردية عرض (الأوقات كما هي من الكتالوج)
const toShift = (row: ApiShift, index: number): Shift => {
  const palette = SHIFT_PALETTE[index % SHIFT_PALETTE.length]
  const startTime = String(row.startTime ?? '').slice(0, 5)
  const endTime = String(row.endTime ?? '').slice(0, 5)
  return {
    id: String(row.id),
    shiftId: row.id,
    name: row.name,
    code: shiftCode(row.name),
    color: palette.color,
    bgColor: palette.bgColor,
    startTime,
    endTime,
    workHours: row.shiftMode === 'flexible' && Number(row.requiredHours) > 0 ? Number(row.requiredHours) : hoursBetween(startTime, endTime),
    shiftMode: row.shiftMode,
    graceMinutes: row.graceMinutes ?? null,
  }
}

// أيقونة الوردية — ليلية (تتجاوز منتصف الليل) / مرنة / مسائية / صباحية
const shiftIcon = (s: Shift) => {
  if (s.startTime && s.endTime && s.endTime < s.startTime) return Moon
  if (s.shiftMode === 'flexible') return Coffee
  if (s.startTime >= '12:00') return Clock
  return Sun
}

// إجازة/راحة — ليست وردية في الكتالوج
const OFF_SHIFT: Shift = {
  id: 'off',
  name: 'إجازة',
  code: 'ج',
  color: 'text-gray-500',
  bgColor: 'bg-gray-100',
  startTime: '',
  endTime: '',
  workHours: 0,
}

// موظف بلا وردية أسبوع محفوظة — لا نعرض وردية لم تُحفَظ فعلاً
const UNSCHEDULED_SHIFT: Shift = {
  id: '',
  name: 'غير مجدوَل',
  code: '—',
  color: 'text-gray-400',
  bgColor: 'bg-gray-50',
  startTime: '',
  endTime: '',
  workHours: 0,
}

// أيام الأسبوع
const weekDays = [
  { key: 'sunday', name: 'الأحد', shortName: 'أحد' },
  { key: 'monday', name: 'الاثنين', shortName: 'اثنين' },
  { key: 'tuesday', name: 'الثلاثاء', shortName: 'ثلاثاء' },
  { key: 'wednesday', name: 'الأربعاء', shortName: 'أربعاء' },
  { key: 'thursday', name: 'الخميس', shortName: 'خميس' },
  { key: 'friday', name: 'الجمعة', shortName: 'جمعة' },
  { key: 'saturday', name: 'السبت', shortName: 'سبت' },
]

// ===== قواعد استثناء أيام العمل (آخر سبت = دوام رسمي...) — لتمييز الأيام الاستثنائية =====
// ترتيب أكواد أيام الأسبوع مطابق لـ Date.getDay() (الأحد = 0)
const WEEKDAY_CODES: ApiScheduleRule['weekday'][] = [
  'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
]
const WEEKDAY_AR: Record<ApiScheduleRule['weekday'], string> = {
  SUN: 'الأحد', MON: 'الاثنين', TUE: 'الثلاثاء', WED: 'الأربعاء',
  THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت',
}
const OCCURRENCE_ORDINAL_AR: Record<Exclude<ApiScheduleRule['occurrence'], 'ALL'>, string> = {
  '1ST': 'الأول', '2ND': 'الثاني', '3RD': 'الثالث', '4TH': 'الرابع', LAST: 'الأخير',
}
const EFFECT_AR: Record<ApiScheduleRule['effect'], string> = {
  WORK: 'تحويل إجازة إلى دوام رسمي',
  OFF: 'تحويل دوام إلى إجازة',
}

// جملة عربية مفهومة من القاعدة، مثل: «السبت الأخير من الشهر — تحويل إجازة إلى دوام رسمي»
const scheduleRuleSentence = (
  rule: Pick<ApiScheduleRule, 'weekday' | 'occurrence' | 'effect'>
): string => {
  const day = WEEKDAY_AR[rule.weekday]
  const when =
    rule.occurrence === 'ALL'
      ? `${day} من كل أسبوع`
      : `${day} ${OCCURRENCE_ORDINAL_AR[rule.occurrence]} من الشهر`
  return `${when} — ${EFFECT_AR[rule.effect]}`
}

// ترتيب ظهور اليوم داخل الشهر (الأول/الثاني...) وهل هو آخر ظهور لنفس اليوم في الشهر
const occurrenceOf = (d: Date): { nth: ApiScheduleRule['occurrence']; isLast: boolean } => {
  const dom = d.getDate()
  const nthNum = Math.floor((dom - 1) / 7) + 1 // 1..5
  const nthMap: ApiScheduleRule['occurrence'][] = ['1ST', '2ND', '3RD', '4TH']
  const nth = nthNum <= 4 ? nthMap[nthNum - 1] : 'LAST'
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const isLast = dom + 7 > daysInMonth
  return { nth, isLast }
}

// هل تنطبق القاعدة على تاريخ بعينه (YYYY-MM-DD)؟
const ruleMatchesDate = (rule: ApiScheduleRule, dateStr: string): boolean => {
  const d = new Date(`${dateStr}T12:00:00`)
  if (rule.weekday !== WEEKDAY_CODES[d.getDay()]) return false
  if (rule.occurrence === 'ALL') return true
  const { nth, isLast } = occurrenceOf(d)
  if (rule.occurrence === 'LAST') return isLast
  return rule.occurrence === nth
}

// ===== مفتاح الأسبوع = تاريخ الأحد بصيغة YYYY-MM-DD (السيرفر يطبّع لأي تاريخ) =====
const weekKeyOf = (d: Date) => {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

const sundayOf = (d: Date) => {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

// تاريخ يوم داخل الأسبوع المعروض بصيغة YYYY-MM-DD
const dateOfDayIndex = (weekStart: Date, dayIndex: number) => {
  const x = new Date(weekStart)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() + dayIndex)
  return x.toISOString().slice(0, 10)
}

// مطابقة وردية السيرفر مع الكتالوج المجلوب (بالمعرّف ثم الاسم ثم المواعيد).
// المطابَقة تعني عرض أوقات الوردية الحيّة من الكتالوج بدل اللقطة المخزّنة.
const matchShiftIn = (
  catalog: Shift[],
  entry: { shiftName: string; startTime: string; endTime: string; shiftId?: number | null }
): Shift => {
  const byId = entry.shiftId
    ? catalog.find((s) => s.shiftId === entry.shiftId)
    : undefined
  if (byId) return byId
  const byName = catalog.find((s) => s.name === entry.shiftName)
  if (byName) return byName
  const byTimes = catalog.find(
    (s) => s.startTime === entry.startTime && s.endTime === entry.endTime
  )
  if (byTimes) return byTimes
  // وردية محفوظة خارج الكتالوج الحالي (معطّلة/محذوفة) — تُعرض باللقطة المخزّنة كما هي
  return {
    id: `legacy-${entry.shiftName}`,
    name: entry.shiftName,
    code: shiftCode(entry.shiftName),
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    startTime: entry.startTime,
    endTime: entry.endTime,
    workHours: hoursBetween(entry.startTime, entry.endTime),
  }
}

export default function WeeklySchedulePage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [departmentsList, setDepartmentsList] = useState<ApiDepartment[]>([])
  const [branchesList, setBranchesList] = useState<ApiBranch[]>([])
  const [teamsList, setTeamsList] = useState<ApiTeam[]>([])
  // كتالوج الورديات الحقيقي — النشِطة فقط، من /catalogs/shifts
  const [shiftCatalog, setShiftCatalog] = useState<Shift[]>([])
  const [shiftsLoading, setShiftsLoading] = useState(true)
  const [shiftsError, setShiftsError] = useState('')
  // وردية الأسبوع لكل موظف — من weekly_schedule_entries في السيرفر
  const [assignments, setAssignments] = useState<Record<number, Shift>>({})
  // تجاوزات الأيام الخاصة — مفتاحها "employeeId|date"
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayOverride>>({})
  // الأيام غير العاملة في الأسبوع المعروض (ويك إند/عطلات بعد تطبيق قواعد الاستثناء)
  // null = لم تُحمَّل أو فشل التحميل → لا تمييز
  const [calendars, setCalendars] = useState<Record<number, { skipped: Set<string>; weekend: Set<string> }>>({})
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarError, setCalendarError] = useState('')
  const [workSchedules, setWorkSchedules] = useState<ApiWorkSchedule[]>([])
  // قواعد استثناء أيام العمل — لمعرفة القاعدة التي حوّلت اليوم (للتلميح)
  const [scheduleRules, setScheduleRules] = useState<ApiScheduleRule[]>([])
  const [overrideModal, setOverrideModal] = useState<{
    empId: number
    empName: string
    date: string
    dayName: string
  } | null>(null)
  const [dirtyIds, setDirtyIds] = useState<number[]>([])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => sundayOf(new Date()))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedCell, setSelectedCell] = useState<{ empId: number; day: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit')

  const currentKey = weekKeyOf(currentWeekStart)
  const visibleWeek = useRef(currentKey)
  visibleWeek.current = currentKey

  // الموظفون والأقسام والفروع والفرق — مرة واحدة (للتعيين الجماعي بالنطاق)
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchDepartments()])
      .then(([emps, deps]) => {
        setEmployees(emps)
        setDepartmentsList(deps)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين'))
    // الفروع والفرق — اختيارية لنطاق التعيين؛ تُتجاهَل بصمت لو فشلت
    fetchBranches().then(setBranchesList).catch(() => setBranchesList([]))
    fetchTeams().then(setTeamsList).catch(() => setTeamsList([]))
    // قواعد الاستثناء — اختيارية للتمييز؛ تُتجاهَل بصمت لو فشلت
    fetchScheduleRules()
      .then(setScheduleRules)
      .catch(() => setScheduleRules([]))
    fetchCatalog<ApiWorkSchedule>('work-schedules')
      .then(setWorkSchedules)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل جداول العمل'))
  }, [])

  // كتالوج الورديات — مصدر الأسماء والأوقات والمعرّفات كلها
  useEffect(() => {
    fetchCatalog<ApiShift>('shifts')
      .then((rows) => {
        const active = (rows ?? []).filter((r) => r.isActive !== false)
        setShiftCatalog(active.map(toShift))
        setShiftsLoading(false)
      })
      .catch((e) => {
        setShiftsError(e instanceof Error ? e.message : 'تعذر تحميل كتالوج الورديات')
        setShiftCatalog([])
        setShiftsLoading(false)
      })
  }, [])

  // جدول الأسبوع المعروض من السيرفر
  const loadWeek = (weekKey: string) => {
    setLoading(true)
    setError('')
    return fetchWeekSchedule(weekKey)
      .then((entries) => {
        if (visibleWeek.current !== weekKey) return
        const map: Record<number, Shift> = {}
        for (const entry of entries) {
          map[entry.employeeId] = matchShiftIn(shiftCatalog, entry)
        }
        setAssignments(map)
        setDirtyIds([])
        setHasChanges(false)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الجدول'))
      .finally(() => { if (visibleWeek.current === weekKey) setLoading(false) })
  }

  // تجاوزات الأيام الخاصة للأسبوع المعروض
  const loadOverrides = (weekKey: string) => {
    return fetchWeekDayOverrides(weekKey)
      .then((list) => {
        if (visibleWeek.current !== weekKey) return
        const map: Record<string, DayOverride> = {}
        for (const o of list) {
          const date = String(o.date).slice(0, 10)
          map[`${o.employeeId}|${date}`] = { ...o, date }
        }
        setDayOverrides(map)
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'تعذر تحميل ورديات الأيام الخاصة')
      )
  }

  // الأيام غير العاملة للأسبوع المعروض — لحساب أيام الدوام/الإجازة الاستثنائية
  useEffect(() => {
    let cancelled = false
    setCalendars({})
    setCalendarError('')
    setCalendarLoading(true)
    const from = dateOfDayIndex(currentWeekStart, 0)
    const to = dateOfDayIndex(currentWeekStart, 6)
    void (async () => {
      const next: Record<number, { skipped: Set<string>; weekend: Set<string> }> = {}
      const failed: string[] = []
      // Limit concurrent calls; each employee uses the same policy engine as attendance.
      for (let i = 0; i < employees.length && !cancelled; i += 8) {
        await Promise.all(employees.slice(i, i + 8).map(async (employee) => {
          try {
            const result = await fetchWorkingDays(from, to, { employeeId: employee.id })
            next[employee.id] = { skipped: new Set(result.skipped), weekend: new Set(result.weekendDays ?? []) }
          } catch (e) { failed.push(`${employee.fullName}: ${e instanceof Error ? e.message : 'تعذر تحميل أيام العمل'}`) }
        }))
      }
      if (cancelled) return
      setCalendars(next)
      setCalendarLoading(false)
      if (failed.length) setCalendarError(`تعذر حساب أيام ${failed.length} موظف. ${failed.slice(0, 3).join('؛ ')}`)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, employees])

  // ننتظر كتالوج الورديات قبل قراءة الأسبوع حتى تُطابَق الورديات
  // بأوقاتها الحيّة لا باللقطة المخزّنة في صف الجدول
  useEffect(() => {
    if (shiftsLoading) return
    loadWeek(currentKey)
    loadOverrides(currentKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, shiftsLoading])

  const depName = (id?: number) =>
    departmentsList.find((d) => d.id === id)?.name ?? '-'

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    employeeName: e.fullName,
    department: depName(e.departmentId),
    avatar: e.fullName.charAt(0),
    position: e.jobTitle ?? '-',
    departmentId: e.departmentId,
    branchId: e.branchId,
    teamId: e.teamId,
  }))

  // وردية الموظف الفعلية لهذا الأسبوع — لا افتراض لوردية غير محفوظة
  const shiftOf = (empId: number): Shift => {
    if (assignments[empId]) return assignments[empId]
    const employee = employees.find((e) => e.id === empId)
    const schedule = workSchedules.find((s) => s.id === employee?.workScheduleId)
      ?? [...workSchedules].sort((a, b) => a.id - b.id).find((s) => s.isDefault && s.isActive)
    return schedule ? {
      ...UNSCHEDULED_SHIFT, id: `work-schedule-${schedule.id}`,
      name: `${schedule.name} (${employee?.workScheduleId === schedule.id ? 'جدول الموظف' : 'الافتراضي'})`,
      startTime: schedule.startTime, endTime: schedule.endTime,
      workHours: hoursBetween(schedule.startTime, schedule.endTime), color: 'text-slate-700', bgColor: 'bg-slate-100',
    } : UNSCHEDULED_SHIFT
  }

  // القاعدة (WORK/OFF) التي تنطبق على تاريخ — للتلميح
  const findRuleForDate = (dateStr: string, effect: ApiScheduleRule['effect'], empId: number) => {
    const branchId = employees.find((e) => e.id === empId)?.branchId
    return [...scheduleRules].sort((a, b) => Number(b.branchId != null) - Number(a.branchId != null) || b.id - a.id)
      .find((r) => r.isActive && r.effect === effect && (r.branchId == null || r.branchId === branchId) && ruleMatchesDate(r, dateStr))
  }

  // نوع الاستثناء ليوم داخل الأسبوع المعروض:
  //  'work' = يوم ويك إند صار دوام رسمي بقاعدة WORK (مثل آخر سبت)
  //  'off'  = يوم عمل عادي صار إجازة بقاعدة OFF
  //  null   = يوم عادي، أو لم تُحمَّل بيانات أيام العمل
  const getException = (dayIndex: number, empId: number): 'work' | 'off' | null => {
    const calendar = calendars[empId]
    if (!calendar) return null
    const dateStr = dateOfDayIndex(currentWeekStart, dayIndex)
    const isWeekend = calendar.weekend.has(WEEKDAY_CODES[dayIndex])
    const inSkipped = calendar.skipped.has(dateStr)
    // ويك إند غير مُدرَج ضمن الأيام غير العاملة ⟺ قاعدة WORK حوّلته لدوام
    if (isWeekend && !inSkipped) return 'work'
    // يوم عمل صار ضمن غير العاملة بقاعدة OFF (نتحقّق من القاعدة حتى لا نخلط بينه وبين العطلات)
    if (!isWeekend && inSkipped && findRuleForDate(dateStr, 'OFF', empId)) return 'off'
    return null
  }

  const workTooltip = (dateStr: string, empId: number): string => {
    const base = 'هذا اليوم دوام رسمي بقاعدة استثنائية — اضبط ورديته'
    const rule = findRuleForDate(dateStr, 'WORK', empId)
    return rule ? `${base} (${rule.name || scheduleRuleSentence(rule)})` : base
  }
  const offTooltip = (dateStr: string, empId: number): string => {
    const base = 'هذا اليوم إجازة بقاعدة استثنائية'
    const rule = findRuleForDate(dateStr, 'OFF', empId)
    return rule ? `${base} (${rule.name || scheduleRuleSentence(rule)})` : base
  }

  // هل يحتوي الأسبوع المعروض على يوم دوام استثنائي؟ (لإظهار البانر)
  const hasExceptionalWork =
    rows.some((r) => weekDays.some((_, i) => getException(i, r.id) === 'work'))

  // حساب تاريخ نهاية الأسبوع
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar-EG-u-ca-gregory', { day: 'numeric', month: 'long' })
  }

  // الانتقال للأسبوع السابق
  const goToPreviousWeek = () => {
    if (hasChanges || saving) { setError('احفظ تغييرات الأسبوع قبل الانتقال'); return }
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeekStart(newDate)
  }

  // الانتقال للأسبوع التالي
  const goToNextWeek = () => {
    if (hasChanges || saving) { setError('احفظ تغييرات الأسبوع قبل الانتقال'); return }
    const newDate = new Date(currentWeekStart)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeekStart(newDate)
  }

  // العودة للأسبوع الحالي
  const goToCurrentWeek = () => {
    if (hasChanges || saving) { setError('احفظ تغييرات الأسبوع قبل الانتقال'); return }
    setCurrentWeekStart(sundayOf(new Date()))
  }

  // تغيير وردية موظف — التعيين للأسبوع كاملاً (نموذج السيرفر: وردية/موظف/أسبوع)
  // shiftKey = معرّف الوردية في الكتالوج المجلوب
  const changeShift = (employeeId: number, shiftKey: string) => {
    const shift = shiftCatalog.find((s) => s.id === shiftKey)
    if (!shift) return
    setAssignments((prev) => ({ ...prev, [employeeId]: shift }))
    setDirtyIds((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]))
    setHasChanges(true)
    setSelectedCell(null)
  }

  // تصفية الموظفين
  const filteredRows = rows.filter((emp) => {
    const matchesSearch =
      emp.employeeName.includes(searchQuery) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment
    return matchesSearch && matchesDepartment
  })

  // الأقسام المتاحة
  const departments = Array.from(new Set(rows.map((emp) => emp.department))).filter(
    (d) => d !== '-'
  )

  // حفظ التغييرات — upsert لكل موظف تغيّرت ورديته ثم إعادة تحميل الأسبوع
  const saveChanges = async () => {
    // shiftId يُرسل مع الاسم والأوقات — به يقرأ السيرفر أوقات الوردية حيّة
    // من الكتالوج بدل تثبيت لقطة قديمة في صف الجدول
    const entries = dirtyIds
      .filter((id) => assignments[id])
      .map((id) => ({
        weekStart: currentKey,
        employeeId: id,
        shiftName: assignments[id].name,
        startTime: assignments[id].startTime,
        endTime: assignments[id].endTime,
        ...(assignments[id].shiftId ? { shiftId: assignments[id].shiftId } : {}),
      }))
    if (entries.length === 0) {
      setHasChanges(false)
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await upsertWeekSchedule(entries)
      await Promise.all([loadWeek(currentKey), loadOverrides(currentKey)])
      // موظفون تخطّاهم السيرفر (خارج نطاق فرعك أو أنت نفسك) — لا نجاح كاذب
      if (res?.skipped?.length) {
        setError(
          `حُفظ الجدول — وتُخطّي ${res.skipped.length} موظف: ${[
            ...new Set(res.skipped.map((s) => s.reason)),
          ].join('، ')}`
        )
      } else setNotice(`حُفظت ورديات ${res.saved.length} موظف`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الجدول')
    } finally {
      setSaving(false)
    }
  }

  // نسخ فعلي من الأسبوع السابق إلى الأسبوع المعروض (يُحفظ عند الضغط على حفظ)
  const copyFromPreviousWeek = async () => {
    const prevDate = new Date(currentWeekStart)
    prevDate.setDate(prevDate.getDate() - 7)
    const prevKey = weekKeyOf(prevDate)
    setError('')
    try {
      const entries = await fetchWeekSchedule(prevKey)
      const map: Record<number, Shift> = {}
      for (const entry of entries) {
        map[entry.employeeId] = matchShiftIn(shiftCatalog, entry)
      }
      setAssignments((previous) => ({ ...previous, ...map }))
      setDirtyIds((previous) => [...new Set([...previous, ...entries.map((e) => e.employeeId)])])
      setHasChanges(entries.length > 0)
      setNotice(entries.length ? `نُسخت ${entries.length} وردية؛ اضغط حفظ الجدول لتطبيقها` : 'لا توجد ورديات محفوظة في الأسبوع السابق')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر نسخ جدول الأسبوع السابق')
    }
    setShowCopyModal(false)
  }

  // تطبيق قالب على موظفين محددين — القالب = وردية من الكتالوج تُعيَّن للأسبوع
  const applyTemplate = (shiftKey: string) => {
    if (!shiftCatalog.some((s) => s.id === shiftKey)) return
    const targetEmployees = selectedEmployees.length > 0 ? selectedEmployees : rows.map((r) => r.id)
    targetEmployees.forEach((id) => changeShift(id, shiftKey))
    setShowTemplates(false)
    setSelectedEmployees([])
    setHasChanges(true)
  }

  // حساب تاريخ كل يوم
  const getDayDate = (dayIndex: number) => {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + dayIndex)
    return date.getDate()
  }

  const cellShift = (empId: number, dayIndex: number): Shift | null => {
    const calendar = calendars[empId]
    if (!calendar) return null
    const date = dateOfDayIndex(currentWeekStart, dayIndex)
    if (calendar.skipped.has(date)) return OFF_SHIFT
    const override = dayOverrides[`${empId}|${date}`]
    return override ? matchShiftIn(shiftCatalog, override) : shiftOf(empId)
  }

  // The totals use the same seven cells shown in the table, including day overrides.
  const calculateTotalHours = (empId: number): number | null => {
    const cells = weekDays.map((_, index) => cellShift(empId, index))
    if (cells.some((cell) => !cell || !cell.id)) return null
    return Math.round(cells.reduce((sum, cell) => sum + (cell?.workHours ?? 0), 0) * 10) / 10
  }

  const countCells = (shiftKey: string) =>
    filteredRows.reduce((sum, row) => sum + weekDays.filter((_, i) => cellShift(row.id, i)?.id === shiftKey).length, 0)
  const offCells = countCells('off')
  const exportSchedule = () => downloadCsv(`weekly-schedule-${currentKey}.csv`,
    ['كود الموظف', 'الموظف', 'القسم', 'التاريخ', 'اليوم', 'الوردية', 'بداية', 'نهاية', 'الساعات', 'مصدر الوردية'],
    filteredRows.flatMap((employee) => weekDays.map((day, index) => {
      const date = dateOfDayIndex(currentWeekStart, index)
      const shift = cellShift(employee.id, index)
      return [employee.employeeCode, employee.employeeName, employee.department, date, day.name,
        shift?.name ?? 'تعذر حساب اليوم', shift?.startTime ?? '', shift?.endTime ?? '', shift?.workHours ?? '',
        shift?.id === 'off' ? 'راحة بحسب التقويم' : dayOverrides[`${employee.id}|${date}`] ? 'تجاوز يوم' : assignments[employee.id] ? 'تعيين أسبوع' : 'جدول العمل']
    })))

  const clearAssignment = async (employeeId: number) => {
    setSaving(true)
    setError('')
    try {
      const result = await clearWeekSchedule(currentKey, employeeId)
      setAssignments((previous) => { const next = { ...previous }; delete next[employeeId]; return next })
      const remaining = dirtyIds.filter((id) => id !== employeeId)
      setDirtyIds(remaining)
      setHasChanges(remaining.length > 0)
      setSelectedCell(null)
      setNotice('أُلغي تعيين الأسبوع؛ يُستخدم جدول عمل الموظف أو الافتراضي. تجاوزات الأيام محفوظة.')
      if (result.failed.length) setError(`أُلغي الإسناد، وتعذرت إعادة حساب الأيام: ${result.failed.join('، ')}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إلغاء إسناد الأسبوع') }
    finally { setSaving(false) }
  }

  // تحديد/إلغاء تحديد موظف
  const toggleEmployeeSelection = (empId: number) => {
    setSelectedEmployees(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    )
  }

  // تحديد الكل
  const selectAllEmployees = () => {
    if (selectedEmployees.length === filteredRows.length) {
      setSelectedEmployees([])
    } else {
      setSelectedEmployees(filteredRows.map(e => e.id))
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الجدول الأسبوعي</h1>
            <p className="text-gray-500 mt-1">إدارة جداول الورديات الأسبوعية للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertCircle size={18} />
                يوجد تغييرات غير محفوظة
              </span>
            )}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('view')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'view' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
                }`}
              >
                <Eye size={16} />
                عرض
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                  viewMode === 'edit' ? 'bg-white shadow text-primary-600' : 'text-gray-500'
                }`}
              >
                <Edit3 size={16} />
                تعديل
              </button>
            </div>
            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className={`btn-primary flex items-center gap-2 ${!hasChanges || saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save size={18} />
              {saving ? 'جارٍ الحفظ...' : 'حفظ الجدول'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {calendarError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{calendarError}</div>}
        {notice && <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">{notice}</div>}
        <p className="text-sm text-gray-500">أيام الراحة والعطلات تُحسب لكل موظف حسب جدول عمله وفرعه. الساعات تشمل تجاوزات الأيام في أيام العمل الفعلية.</p>

        {/* كتالوج ورديات فارغ — لا تعيين ممكن قبل إنشاء وردية واحدة على الأقل */}
        {!shiftsLoading && shiftCatalog.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={18} />
            {shiftsError
              ? `تعذر تحميل الورديات: ${shiftsError}`
              : 'لا توجد ورديات — أنشئها من إعدادات الورديات'}
          </div>
        )}

        {/* Week Navigation */}
        <div className="card">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
              الأسبوع السابق
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={goToCurrentWeek}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
              >
                <RotateCcw size={18} />
                اليوم
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">
                  {formatDate(currentWeekStart)} - {formatDate(weekEnd)}
                </h2>
                <p className="text-sm text-gray-500" dir="ltr">{currentKey}</p>
              </div>
            </div>

            <button
              onClick={goToNextWeek}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              الأسبوع التالي
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن موظف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pr-10 w-64"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="input w-48"
              >
                <option value="all">كل الأقسام</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {selectedEmployees.length > 0 && (
                <span className="px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm">
                  {selectedEmployees.length} موظف محدد
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowTemplates(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Layers size={18} />
                القوالب
              </button>
              <button
                onClick={() => setShowCopyModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <Copy size={18} />
                نسخ من أسبوع
              </button>
              <button
                onClick={() => setShowBulkAssign(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <UserCheck size={18} />
                تعيين جماعي
              </button>
              <div className="h-8 w-px bg-gray-200" />
              <button onClick={() => window.print()} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="طباعة">
                <Printer size={18} className="text-gray-600" />
              </button>
              <button onClick={exportSchedule} disabled={loading || calendarLoading || !!calendarError || hasChanges} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50" title="تصدير CSV">
                <FileSpreadsheet size={18} className="text-gray-600" />
              </button>
              <Link href="/settings/work-days" className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" title="إعدادات جداول العمل">
                <Settings size={18} className="text-gray-600" />
              </Link>
            </div>
          </div>
        </div>

        {/* Shift Legend */}
        <div className="card">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-500 font-medium">دليل الورديات:</span>
            {shiftsLoading ? (
              <span className="text-sm text-gray-400">جارٍ تحميل الورديات...</span>
            ) : shiftCatalog.length === 0 ? (
              <span className="text-sm text-amber-700">
                لا توجد ورديات — أنشئها من إعدادات الورديات
              </span>
            ) : (
              [...shiftCatalog, OFF_SHIFT].map(shift => (
                <div key={shift.id} className="flex items-center gap-2">
                  <div className={`px-2 py-1 ${shift.bgColor} ${shift.color} rounded text-xs font-bold`}>
                    {shift.code}
                  </div>
                  <span className="text-sm text-gray-600">{shift.name}</span>
                  {shift.startTime && shift.endTime && (
                    <span className="text-xs text-gray-400" dir="ltr">
                      {shift.startTime}–{shift.endTime}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Star size={14} className="text-amber-500 fill-amber-400" />
            <span className="text-xs text-gray-500">
              اليوم المميز = وردية خاصة تتقدم على وردية الأسبوع
            </span>
          </div>
        </div>

        {/* بانر الدوام الاستثنائي — يظهر فقط لو الأسبوع يحتوي يوم دوام استثنائي */}
        {hasExceptionalWork && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
            <Star size={18} className="text-amber-500 fill-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              الأيام المميزة بـ«دوام استثنائي» صارت أيام عمل بقاعدة (مثل: آخر سبت في الشهر).
              اضبط ورديتها من زر تجاوز اليوم.
            </p>
          </div>
        )}

        {/* Schedule Table */}
        <div className="card overflow-hidden p-0">
          {loading || shiftsLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  {viewMode === 'edit' && (
                    <th className="p-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.length === filteredRows.length && filteredRows.length > 0}
                        onChange={selectAllEmployees}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="text-right p-4 font-medium text-gray-600 min-w-[200px] sticky right-0 bg-gray-50 z-10">
                    الموظف
                  </th>
                  {weekDays.map((day, index) => (
                    <th key={day.key} className="p-3 font-medium text-center min-w-[90px] text-gray-600">
                      <div className="text-sm">{day.name}</div>
                      <div className="text-xs font-normal mt-1 text-gray-400">{getDayDate(index)}</div>
                    </th>
                  ))}
                  <th className="p-3 font-medium text-gray-600 text-center w-20 bg-gray-50">
                    الساعات
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(employee => (
                  <tr key={employee.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    {viewMode === 'edit' && (
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee.id)}
                          onChange={() => toggleEmployeeSelection(employee.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </td>
                    )}
                    {/* Employee Info */}
                    <td className="p-3 sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-medium">{employee.avatar}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{employee.employeeName}</p>
                          <p className="text-xs text-gray-500 truncate">{employee.position}</p>
                          {viewMode === 'edit' && assignments[employee.id] && (
                            <button disabled={saving} onClick={() => clearAssignment(employee.id)} className="text-xs text-red-600 hover:underline disabled:opacity-50">إلغاء تعيين الأسبوع</button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Schedule Cells */}
                    {weekDays.map((day, dayIndex) => {
                      const dayDate = dateOfDayIndex(currentWeekStart, dayIndex)
                      const exception = getException(dayIndex, employee.id)
                      const isExceptionalWork = exception === 'work' // ويك إند صار دوام رسمي
                      const isExceptionalOff = exception === 'off'   // يوم عمل صار إجازة بقاعدة
                      // يُعامَل كيوم عمل لو كان يوم أسبوع عادي أو ويك إند دوام استثنائي
                      const calendar = calendars[employee.id]
                      const isWorkingDay = !!calendar && !calendar.skipped.has(dayDate)
                      const shift = cellShift(employee.id, dayIndex) ?? { ...UNSCHEDULED_SHIFT, name: calendarLoading ? 'جارٍ الحساب…' : 'تعذر حساب اليوم' }
                      const isSelected = selectedCell?.empId === employee.id && selectedCell?.day === day.key
                      const isLocked = !calendar || saving
                      const isUnassigned = isWorkingDay && !shift.id
                      const override = isWorkingDay
                        ? dayOverrides[`${employee.id}|${dayDate}`]
                        : undefined
                      // أوقات التجاوز الحيّة من الكتالوج (وإلا اللقطة المخزّنة)
                      const overrideShift = override
                        ? matchShiftIn(shiftCatalog, override)
                        : null

                      return (
                        <td
                          key={day.key}
                          className={`p-1.5 text-center ${isExceptionalWork ? 'bg-amber-50/50' : ''}`}
                        >
                          <div className="relative group">
                            <button
                              onClick={() => {
                                if (viewMode === 'edit' && !isLocked) {
                                  setSelectedCell(isSelected ? null : { empId: employee.id, day: day.key })
                                }
                              }}
                              disabled={viewMode === 'view' || isLocked}
                              className={`w-full rounded-lg font-medium text-sm transition-all relative ${
                                override
                                  ? 'py-1 px-1 bg-amber-50 text-amber-800 border-2 border-amber-400'
                                  : `py-2.5 px-1 ${shift.bgColor} ${shift.color}`
                              } ${
                                isExceptionalWork && !override ? 'ring-2 ring-amber-400 ring-inset' : ''
                              } ${
                                viewMode === 'edit' && !isLocked ? 'hover:opacity-80 cursor-pointer' : ''
                              } ${isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''} ${
                                isLocked ? 'opacity-60 cursor-not-allowed' : ''
                              } ${isUnassigned && !override ? 'opacity-50' : ''}`}
                              title={
                                isExceptionalWork
                                  ? workTooltip(dayDate, employee.id)
                                  : isExceptionalOff
                                    ? offTooltip(dayDate, employee.id)
                                    : override
                                      ? 'يوم خاص — وردية تتقدم على وردية الأسبوع'
                                      : !isWorkingDay && calendar
                                        ? 'راحة بحسب تقويم الموظف — تعيين الوردية لا يغير أيام الراحة'
                                      : isUnassigned
                                        ? 'غير مجدوَل — اختر وردية الأسبوع'
                                        : ''
                              }
                            >
                              {override && overrideShift ? (
                                <>
                                  <span className="block truncate text-xs font-bold">
                                    {overrideShift.name}
                                  </span>
                                  {overrideShift.startTime && overrideShift.endTime && (
                                    <span className="block text-[10px] text-amber-600" dir="ltr">
                                      {overrideShift.startTime}–{overrideShift.endTime}
                                    </span>
                                  )}
                                  <span className="inline-block px-1.5 rounded-full bg-amber-400 text-white text-[9px] leading-4">
                                    يوم خاص
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="block truncate">{shift.name}</span>
                                  {shift.startTime && shift.endTime && (
                                    <span className="block text-[10px] opacity-70" dir="ltr">
                                      {shift.startTime}–{shift.endTime}
                                    </span>
                                  )}
                                  {isExceptionalWork && (
                                    <span className="mt-0.5 inline-block px-1.5 rounded-full bg-amber-400 text-white text-[9px] leading-4">
                                      دوام استثنائي
                                    </span>
                                  )}
                                  {isExceptionalOff && (
                                    <span className="mt-0.5 inline-block px-1.5 rounded-full bg-gray-300 text-gray-700 text-[9px] leading-4">
                                      إجازة استثنائية
                                    </span>
                                  )}
                                </>
                              )}
                            </button>

                            {/* زر وردية اليوم الخاص — يظهر عند المرور أو التجاوز، وبارز دائماً ليوم الدوام الاستثنائي */}
                            {viewMode === 'edit' && calendar && (isWorkingDay || dayOverrides[`${employee.id}|${dayDate}`]) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOverrideModal({
                                    empId: employee.id,
                                    empName: employee.employeeName,
                                    date: dayDate,
                                    dayName: day.name,
                                  })
                                }}
                                className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow border z-10 transition-opacity ${
                                  override || isExceptionalWork
                                    ? 'bg-amber-400 text-white border-amber-500 opacity-100'
                                    : 'bg-white text-gray-400 border-gray-200 opacity-0 group-hover:opacity-100 hover:text-amber-500'
                                }`}
                                title={
                                  isExceptionalWork
                                    ? 'اضبط وردية يوم الدوام الاستثنائي'
                                    : 'وردية يوم خاص'
                                }
                              >
                                <Star size={11} />
                              </button>
                            )}

                            {/* Shift Selector Dropdown — التعيين لكل الأسبوع */}
                            {isSelected && viewMode === 'edit' && (
                              <div className="absolute top-full mt-1 right-1/2 translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 z-20 min-w-[160px] py-2">
                                <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
                                  اختر وردية الأسبوع
                                </div>
                                {shiftCatalog.length === 0 && (
                                  <p className="px-3 py-3 text-xs text-amber-700">
                                    لا توجد ورديات — أنشئها من إعدادات الورديات
                                  </p>
                                )}
                                {shiftCatalog.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => changeShift(employee.id, s.id)}
                                    className={`w-full px-3 py-2 text-right hover:bg-gray-50 flex items-center gap-2 ${
                                      s.id === shift.id ? 'bg-primary-50' : ''
                                    }`}
                                  >
                                    <div className={`w-6 h-6 ${s.bgColor} ${s.color} rounded flex items-center justify-center text-xs font-bold`}>
                                      {s.code}
                                    </div>
                                    <span className="text-sm text-gray-700">{s.name}</span>
                                    <span className="text-[10px] text-gray-400" dir="ltr">
                                      {s.startTime}–{s.endTime}
                                    </span>
                                    {s.id === shift.id && (
                                      <CheckCircle size={14} className="text-primary-500 mr-auto" />
                                    )}
                                  </button>
                                ))}
                                {assignments[employee.id] && (
                                  <button disabled={saving} onClick={() => clearAssignment(employee.id)} className="w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50">إلغاء تعيين الأسبوع</button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total Hours — من ساعات الوردية المحفوظة فعلاً */}
                    <td className="p-3 text-center bg-gray-50/50">
                      {calculateTotalHours(employee.id) === null ? (
                        <span className="font-bold text-gray-400">—</span>
                      ) : (
                        <>
                          <span className="font-bold text-gray-800">
                            {calculateTotalHours(employee.id)}
                          </span>
                          <span className="text-gray-400 text-xs block">ساعة</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        {/* Stats — بطاقة لكل وردية في الكتالوج (لا أسماء ثابتة) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {shiftCatalog.map((s) => {
            const Icon = shiftIcon(s)
            return (
              <div key={s.id} className="card flex items-center gap-3 p-4">
                <div className={`w-10 h-10 ${s.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={s.color} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{s.name}</p>
                  <p className="text-xl font-bold text-gray-800">{countCells(s.id)}</p>
                  <p className="text-[10px] text-gray-400" dir="ltr">
                    {s.startTime}–{s.endTime}
                  </p>
                </div>
              </div>
            )
          })}
          <div className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجازات</p>
              <p className="text-xl font-bold text-gray-800">{offCells}</p>
            </div>
          </div>
        </div>

        {/* Templates Modal */}
        {showTemplates && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">قوالب الدوام</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedEmployees.length > 0
                      ? `تُعيَّن وردية الأسبوع لـ${selectedEmployees.length} موظف محدد`
                      : 'تُعيَّن وردية الأسبوع لجميع الموظفين'}
                  </p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* القوالب = ورديات الكتالوج الحقيقية بأوقاتها */}
              <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                {shiftCatalog.length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-3 text-center">
                    لا توجد ورديات — أنشئها من إعدادات الورديات
                  </p>
                )}
                {shiftCatalog.map((s) => {
                  const Icon = shiftIcon(s)
                  return (
                    <button
                      key={s.id}
                      onClick={() => applyTemplate(s.id)}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-right transition-colors flex items-center gap-4"
                    >
                      <div className={`w-12 h-12 ${s.bgColor} rounded-xl flex items-center justify-center shadow-sm flex-shrink-0`}>
                        <Icon size={24} className={s.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">دوام {s.name}</p>
                        <p className="text-sm text-gray-500">
                          <span dir="ltr">{s.startTime}–{s.endTime}</span> · {s.workHours} ساعة/يوم
                          {s.shiftMode === 'flexible' ? ' · وردية مرنة' : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="p-4 border-t border-gray-100">
                <button onClick={() => setShowTemplates(false)} className="w-full btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Copy from Previous Week Modal */}
        {showCopyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">نسخ من أسبوع سابق</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  سيتم نسخ جدول الأسبوع السابق وتطبيقه على الأسبوع الحالي.
                </p>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">من:</p>
                  <p className="font-medium text-gray-800">
                    {formatDate(new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button onClick={copyFromPreviousWeek} className="flex-1 btn-primary">
                  نسخ الجدول
                </button>
                <button onClick={() => setShowCopyModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Assign Modal */}
        {showBulkAssign && (
          <BulkAssignModal
            employees={filteredRows}
            allEmployees={rows}
            departments={departmentsList}
            branches={branchesList}
            teams={teamsList}
            selectedEmployees={selectedEmployees}
            shifts={shiftCatalog}
            weekDays={weekDays}
            onClose={() => setShowBulkAssign(false)}
            onAssign={async (empIds, days, shiftKey) => {
              const shift = shiftCatalog.find((s) => s.id === shiftKey)
              if (days.length > 0 && shift) {
                // أيام محددة → «يوم استثنائي»: الوردية تُطبَّق كتجاوز لتلك
                // التواريخ فقط (مثلاً السبت) لكل موظفي النطاق، دون تغيير الأسبوع
                const dates = days
                  .map((k) => weekDays.findIndex((d) => d.key === k))
                  .filter((i) => i >= 0)
                  .map((i) => dateOfDayIndex(currentWeekStart, i))
                // shiftId مع الاسم والأوقات — مرجع الوردية في الكتالوج
                const payload = {
                  employeeIds: empIds,
                  dates,
                  shiftName: shift.name,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  ...(shift.shiftId ? { shiftId: shift.shiftId } : {}),
                }
                try {
                  const res = await setDayShiftOverridesBulk(payload)
                  await loadOverrides(currentKey)
                  const expected = empIds.length * dates.length
                  // سبب فشل كل موظف/يوم من السيرفر — لا «تخطّى N» بلا تفسير
                  const failed = res.failed ?? []
                  const reasons = failed.slice(0, 10).map((f) => {
                    const r = rows.find((x) => x.id === f.employeeId)
                    return `${r?.employeeName ?? `موظف #${f.employeeId}`} (${f.date}): ${f.error}`
                  })
                  if (failed.length > 10) reasons.push(`و${failed.length - 10} أخرى`)
                  // موظفون استبعدهم السيرفر قبل التطبيق (خارج نطاق فرعك أو أنت نفسك)
                  if (res.skipped) {
                    reasons.push(`${res.skipped} موظف مستبعَد: خارج نطاق فرعك أو أنت نفسك`)
                  }
                  if (res.applied === 0) {
                    // لم يُطبَّق شيء فعلاً — لا نعرض نجاحاً كاذباً
                    setError(
                      reasons.length > 0
                        ? `لم يُطبَّق التجاوز على أي موظف — ${reasons.join('؛ ')}`
                        : 'لم يُطبَّق التجاوز على أي موظف — تحقق من النطاق والوردية'
                    )
                  } else {
                    setError('')
                    setNotice(
                      res.applied < expected
                        ? `تم تطبيق «${shift.name}» على ${res.applied} من ${expected} تعيين — تعذّر ${expected - res.applied}:\n${reasons.map((x) => `• ${x}`).join('\n')}`
                        : `تم تطبيق «${shift.name}» كاستثناء على ${res.employees} موظف في ${res.days} يوم`
                    )
                  }
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'تعذر تطبيق استثناء اليوم')
                }
              } else {
                // بلا أيام → وردية الأسبوع لكل موظفي النطاق (سلوك أساسي)
                empIds.forEach((id) => changeShift(id, shiftKey))
                setHasChanges(true)
                setNotice(`حُددت ورديات ${empIds.length} موظف؛ اضغط حفظ الجدول لتطبيقها`)
              }
              setShowBulkAssign(false)
            }}
          />
        )}

        {/* Day Override Modal — وردية يوم خاص */}
        {overrideModal && (
          <DayOverrideModal
            empId={overrideModal.empId}
            empName={overrideModal.empName}
            date={overrideModal.date}
            dayName={overrideModal.dayName}
            override={dayOverrides[`${overrideModal.empId}|${overrideModal.date}`]}
            shiftOptions={shiftCatalog}
            onClose={() => setOverrideModal(null)}
            onSaved={() => {
              setOverrideModal(null)
              loadOverrides(currentKey)
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}

// Modal وردية اليوم الخاص — تجاوز يوم واحد يتقدم على وردية الأسبوع
function DayOverrideModal({
  empId,
  empName,
  date,
  dayName,
  override,
  shiftOptions,
  onClose,
  onSaved,
}: {
  empId: number
  empName: string
  date: string
  dayName: string
  override?: DayOverride
  shiftOptions: Shift[]
  onClose: () => void
  onSaved: () => void
}) {
  // لو التجاوز الحالي باسم خارج الكتالوج نعرضه كخيار إضافي
  const currentShift = override ? matchShiftIn(shiftOptions, override) : null
  const options =
    currentShift && !shiftOptions.some((s) => s.id === currentShift.id)
      ? [currentShift, ...shiftOptions]
      : shiftOptions
  const [selectedId, setSelectedId] = useState(currentShift?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  const handleSave = async () => {
    const s = options.find((o) => o.id === selectedId)
    if (!s) {
      setModalError('الرجاء اختيار الوردية')
      return
    }
    setSaving(true)
    setModalError('')
    // shiftId مع الاسم والأوقات — مرجع الوردية في الكتالوج
    const payload = {
      employeeId: empId,
      date,
      shiftName: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      ...(s.shiftId ? { shiftId: s.shiftId } : {}),
    }
    try {
      await setDayShiftOverride(payload)
      onSaved()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'تعذر حفظ وردية اليوم')
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    setModalError('')
    try {
      await setDayShiftOverride({ employeeId: empId, date, clear: true })
      onSaved()
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'تعذر إرجاع وردية الأسبوع')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Star size={20} className="text-amber-500 fill-amber-400" />
              وردية يوم خاص — {empName}
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              {dayName} <span dir="ltr">{date}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {modalError && (
            <div className="bg-red-50 text-red-700 rounded-xl p-3 flex items-center gap-2 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {modalError}
            </div>
          )}

          {override && currentShift && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              التجاوز الحالي: <b>{currentShift.name}</b>{' '}
              {currentShift.startTime && currentShift.endTime && (
                <span dir="ltr">
                  {currentShift.startTime}–{currentShift.endTime}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">الوردية</label>
            {options.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-3 text-center">
                لا توجد ورديات — أنشئها من إعدادات الورديات
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {options.map((shift) => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedId(shift.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedId === shift.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-8 h-8 ${shift.bgColor} ${shift.color} rounded-lg flex items-center justify-center text-sm font-bold mx-auto mb-2`}
                  >
                    {shift.code}
                  </div>
                  <p className="text-sm text-gray-700 text-center">{shift.name}</p>
                  <p className="text-xs text-gray-400 text-center" dir="ltr">
                    {shift.startTime}–{shift.endTime}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            الوردية الخاصة تتقدم على وردية الأسبوع لهذا اليوم فقط، ولو فيه بصمات لليوم
            سيُعاد حسابه تلقائياً.
          </p>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !selectedId}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
          {override && (
            <button
              onClick={handleClear}
              disabled={saving}
              className={`flex-1 btn-secondary ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              إرجاع لوردية الأسبوع
            </button>
          )}
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// نطاق التعيين الجماعي
type AssignScope = 'individual' | 'team' | 'department' | 'branch' | 'company'
const SCOPE_LABELS: { key: AssignScope; label: string }[] = [
  { key: 'individual', label: 'موظف محدد' },
  { key: 'team', label: 'فريق' },
  { key: 'department', label: 'قسم' },
  { key: 'branch', label: 'فرع' },
  { key: 'company', label: 'الشركة كلها' },
]

// Modal التعيين الجماعي
function BulkAssignModal({
  employees,
  allEmployees,
  departments,
  branches,
  teams,
  selectedEmployees: initialSelected,
  shifts,
  weekDays,
  onClose,
  onAssign,
}: {
  employees: EmployeeRow[]
  allEmployees: EmployeeRow[]
  departments: ApiDepartment[]
  branches: ApiBranch[]
  teams: ApiTeam[]
  selectedEmployees: number[]
  shifts: Shift[]
  weekDays: { key: string; name: string }[]
  onClose: () => void
  onAssign: (empIds: number[], days: string[], shiftId: string) => Promise<void>
}) {
  const [selectedEmps, setSelectedEmps] = useState<number[]>(initialSelected)
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedShift, setSelectedShift] = useState('')
  // النطاق: فرد (بالتحديد) أو فريق/قسم/فرع (بمعرّف) أو الشركة كلها
  const [scope, setScope] = useState<AssignScope>('individual')
  const [scopeId, setScopeId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggleEmployee = (empId: number) => {
    setSelectedEmps(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    )
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // الموظفون المستهدفون فعلياً حسب النطاق المختار (من كل الموظفين لا المفلترين)
  const targetEmps: number[] =
    scope === 'individual'
      ? selectedEmps
      : scope === 'company'
        ? allEmployees.map((e) => e.id)
        : scopeId === ''
          ? []
          : allEmployees
              .filter((e) =>
                scope === 'team'
                  ? e.teamId === scopeId
                  : scope === 'department'
                    ? e.departmentId === scopeId
                    : e.branchId === scopeId
              )
              .map((e) => e.id)

  // قائمة خيارات القائمة المنسدلة حسب النطاق
  const scopeOptions =
    scope === 'team'
      ? teams.map((t) => ({ id: t.id, name: t.name }))
      : scope === 'department'
        ? departments.map((d) => ({ id: d.id, name: d.name }))
        : scope === 'branch'
          ? branches.map((b) => ({ id: b.id, name: b.name }))
          : []

  const handleAssign = async () => {
    if (busy) return
    if (targetEmps.length === 0 || !selectedShift) {
      setError('اختر النطاق (أو الموظفين) والوردية')
      return
    }
    setBusy(true)
    setError('')
    try { await onAssign(targetEmps, selectedDays, selectedShift) }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تطبيق الوردية') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">تعيين جماعي</h3>
            <p className="text-gray-500 text-sm mt-1">تعيين وردية الأسبوع لمجموعة موظفين</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
          {/* نطاق التعيين — موظف / فريق / قسم / فرع / الشركة كلها */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نطاق التعيين
            </label>
            <div className="flex gap-2 flex-wrap">
              {SCOPE_LABELS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setScope(s.key)
                    setScopeId('')
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    scope === s.key
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* الاختيار حسب النطاق */}
          {scope === 'individual' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الموظفين ({selectedEmps.length} محدد)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                {employees.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">
                    لا موظفين مطابقين للفلتر الحالي
                  </p>
                )}
                {employees.map(emp => (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedEmps.includes(emp.id) ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmps.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{emp.employeeName}</span>
                    <span className="text-xs text-gray-400">{emp.department}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : scope === 'company' ? (
            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary-800">
              سيُطبَّق على <span className="font-bold">كل موظفي الشركة</span> —{' '}
              {targetEmps.length} موظف.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {scope === 'team' ? 'اختر الفريق' : scope === 'department' ? 'اختر القسم' : 'اختر الفرع'}
              </label>
              <select
                className="input w-full"
                value={scopeId === '' ? '' : String(scopeId)}
                onChange={(e) =>
                  setScopeId(e.target.value === '' ? '' : Number(e.target.value))
                }
              >
                <option value="">
                  — {scope === 'team' ? 'الفريق' : scope === 'department' ? 'القسم' : 'الفرع'} —
                </option>
                {scopeOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {scopeOptions.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-1.5">
                  لا توجد عناصر لهذا النطاق
                </p>
              )}
              {scopeId !== '' && (
                <p className="text-xs text-gray-500 mt-1.5">
                  ينطبق على {targetEmps.length} موظف
                </p>
              )}
            </div>
          )}

          {/* اختيار الأيام: محدَّدة = «يوم استثنائي» (السبت مثلاً بدوام مختلف)؛
              فارغة = الوردية تُطبَّق على الأسبوع كله */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              الأيام
            </label>
            <p className="text-xs text-gray-400 mb-3">
              اختر أياماً محددة لتطبيق الوردية كـ«استثناء» لتلك الأيام فقط (مثلاً السبت)،
              أو اترك الكل فارغاً لتطبيقها على الأسبوع كله
            </p>
            <div className="flex gap-2 flex-wrap">
              {weekDays.map(day => (
                <button
                  key={day.key}
                  onClick={() => toggleDay(day.key)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    selectedDays.includes(day.key)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.name}
                </button>
              ))}
            </div>
          </div>

          {/* اختيار الوردية — من كتالوج الورديات بأوقاته الحيّة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">الوردية</label>
            {shifts.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-3 text-center">
                لا توجد ورديات — أنشئها من إعدادات الورديات
              </p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {shifts.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => setSelectedShift(shift.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedShift === shift.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 ${shift.bgColor} ${shift.color} rounded-lg flex items-center justify-center text-sm font-bold mx-auto mb-2`}>
                    {shift.code}
                  </div>
                  <p className="text-sm text-gray-700 text-center">{shift.name}</p>
                  <p className="text-xs text-gray-400 text-center" dir="ltr">
                    {shift.startTime}–{shift.endTime}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleAssign}
            disabled={busy || targetEmps.length === 0 || !selectedShift}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'جارٍ التطبيق…' : `تطبيق (${targetEmps.length} موظف)`}
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
