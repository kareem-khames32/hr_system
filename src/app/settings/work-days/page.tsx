'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  fetchConfig,
  updateConfig,
  fetchScheduleRules,
  createScheduleRule,
  updateScheduleRule,
  deleteScheduleRule,
  fetchBranches,
  fetchCatalog,
  createCatalogItem,
  updateCatalogItem,
  deleteWorkSchedule,
  assignWorkSchedule,
  fetchEmployees,
  fetchDepartments,
  can,
  getCurrentUser,
} from '@/lib/api'
import { buildCalendarChange, calendarRuleToggle, calendarScopeWritable, type PayrollCalendarContext, type PayrollCalendarChange } from '@/lib/payroll-calendar-api'
import { CalendarChangeFields, CalendarContextSummary, CalendarMutationDialog, CalendarScopeConfirmation, useCalendarContext } from '@/components/PayrollCalendarChange'
import type {
  ApiScheduleRule,
  ApiBranch,
  ApiWorkSchedule,
  ApiEmployee,
  ApiDepartment,
  ApiAttendanceRuleChange,
} from '@/lib/api'
import { GraceOverridesNote } from '@/components/GraceOverridesNote'
import {
  Calendar,
  Plus,
  Trash2,
  Save,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Sun,
  Moon,
  RotateCcw,
  Info,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Users,
  Briefcase,
  X,
  UserPlus,
  Building2,
  Search,
  User,
} from 'lucide-react'

// مفاتيح إعدادات العمل الإضافي (الأوفرتايم) — config حقيقي يُدار عبر updateConfig
const OVERTIME_ENABLED_KEY = 'overtime.enabled'
const OVERTIME_THRESHOLD_KEY = 'overtime.detection_threshold_hours'
const OVERTIME_EARLY_KEY = 'overtime.allow_early_overtime'
const OVERTIME_NUMBERS = [
  { key: 'overtime.rounding_minutes', label: 'وحدة التقريب للأسفل', unit: 'دقيقة', min: 1, max: 1440, integer: true, hint: 'مثلًا: كل 15 دقيقة؛ 155 دقيقة تصبح 150 دقيقة.' },
  { key: 'overtime.request_backdate_days', label: 'حد تقديم الطلب بأثر رجعي', unit: 'يوم', min: 0, max: 2147483647, integer: true, hint: 'صفر يسمح بيوم التقديم فقط للطلبات السابقة.' },
  { key: 'overtime.max_closed_periods', label: 'أقصى فترات مالية مقفلة', unit: 'فترة', min: 0, max: 2147483647, integer: true, hint: 'صفر يمنع التقديم عن فترة مقفلة. يسري الأشد بين هذا الحد وحد الأيام.' },
  { key: 'overtime.max_hours_per_day', label: 'سقف الإضافي اليومي', unit: 'ساعة', min: 0, max: 24, integer: false, hint: 'صفر = بلا حد. ما يتجاوز السقف يُخفض مع إظهار المدة الأصلية.' },
  { key: 'overtime.max_hours_per_week', label: 'سقف الإضافي الأسبوعي', unit: 'ساعة', min: 0, max: 168, integer: false, hint: 'صفر = بلا حد. تجاوز السقف يمنع الاعتماد.' },
  { key: 'overtime.max_hours_per_month', label: 'سقف الإضافي الشهري', unit: 'ساعة', min: 0, max: 744, integer: false, hint: 'صفر = بلا حد. تجاوز السقف يمنع الاعتماد.' },
] as const
const OVERTIME_EDIT_KEYS = [OVERTIME_ENABLED_KEY, OVERTIME_THRESHOLD_KEY,
  ...OVERTIME_NUMBERS.map(field => field.key), OVERTIME_EARLY_KEY]
const localToday = () => new Date().toLocaleDateString('en-CA')
const flexEndTime = (start: string, minutes: number) => {
  const [hours, mins] = start.split(':').map(Number)
  const total = hours * 60 + mins + minutes
  if (!Number.isFinite(total)) return '—'
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}${total >= 1440 ? ' (+1 يوم)' : ''}`
}

// أيام الأسبوع — code = رمز اليوم في weekendDays بكتالوج جداول العمل
const weekDays = [
  { key: 'sunday', code: 'SUN', name: 'الأحد', shortName: 'ح' },
  { key: 'monday', code: 'MON', name: 'الاثنين', shortName: 'ن' },
  { key: 'tuesday', code: 'TUE', name: 'الثلاثاء', shortName: 'ث' },
  { key: 'wednesday', code: 'WED', name: 'الأربعاء', shortName: 'ر' },
  { key: 'thursday', code: 'THU', name: 'الخميس', shortName: 'خ' },
  { key: 'friday', code: 'FRI', name: 'الجمعة', shortName: 'ج' },
  { key: 'saturday', code: 'SAT', name: 'السبت', shortName: 'س' },
]

// weekendDays ('FRI,SAT') ⇄ رموز أيام الراحة — '' = دوام 7 أيام
const parseWeekend = (weekendDays?: string | null): string[] =>
  String(weekendDays ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
// بترتيب الأسبوع (الأحد أولاً) حتى تبقى القيمة ثابتة كما في البذرة ('FRI,SAT')
const weekendString = (offDays: string[]): string =>
  weekDays
    .filter((d) => offDays.includes(d.code))
    .map((d) => d.code)
    .join(',')

// ===== القواعد الاستثنائية (backend حقيقي عبر /attendance/schedule-rules) =====
// خيارات النماذج (select) بالعربية
const RULE_WEEKDAYS: { value: ApiScheduleRule['weekday']; label: string }[] = [
  { value: 'SUN', label: 'الأحد' },
  { value: 'MON', label: 'الاثنين' },
  { value: 'TUE', label: 'الثلاثاء' },
  { value: 'WED', label: 'الأربعاء' },
  { value: 'THU', label: 'الخميس' },
  { value: 'FRI', label: 'الجمعة' },
  { value: 'SAT', label: 'السبت' },
]
const RULE_OCCURRENCES: { value: ApiScheduleRule['occurrence']; label: string }[] = [
  { value: 'ALL', label: 'كل الأسابيع' },
  { value: '1ST', label: 'الأسبوع الأول' },
  { value: '2ND', label: 'الأسبوع الثاني' },
  { value: '3RD', label: 'الأسبوع الثالث' },
  { value: '4TH', label: 'الأسبوع الرابع' },
  { value: 'LAST', label: 'الأسبوع الأخير في الشهر' },
]
const RULE_EFFECTS: { value: ApiScheduleRule['effect']; label: string; desc: string }[] = [
  { value: 'WORK', label: 'دوام رسمي', desc: 'تحويل إجازة إلى دوام رسمي' },
  { value: 'OFF', label: 'إجازة', desc: 'تحويل دوام إلى إجازة' },
]

const WEEKDAY_AR: Record<ApiScheduleRule['weekday'], string> = {
  SUN: 'الأحد',
  MON: 'الاثنين',
  TUE: 'الثلاثاء',
  WED: 'الأربعاء',
  THU: 'الخميس',
  FRI: 'الجمعة',
  SAT: 'السبت',
}
const OCCURRENCE_ORDINAL_AR: Record<Exclude<ApiScheduleRule['occurrence'], 'ALL'>, string> = {
  '1ST': 'الأول',
  '2ND': 'الثاني',
  '3RD': 'الثالث',
  '4TH': 'الرابع',
  LAST: 'الأخير',
}
const EFFECT_AR: Record<ApiScheduleRule['effect'], string> = {
  WORK: 'تحويل إجازة إلى دوام رسمي',
  OFF: 'تحويل دوام إلى إجازة',
}

// يبني جملة عربية مفهومة من القاعدة، مثل: «السبت الأخير من الشهر — تحويل إجازة إلى دوام رسمي»
function scheduleRuleSentence(rule: Pick<ApiScheduleRule, 'weekday' | 'occurrence' | 'effect'>): string {
  const day = WEEKDAY_AR[rule.weekday]
  const when =
    rule.occurrence === 'ALL'
      ? `${day} من كل أسبوع`
      : `${day} ${OCCURRENCE_ORDINAL_AR[rule.occurrence]} من الشهر`
  return `${when} — ${EFFECT_AR[rule.effect]}`
}

// ألوان الجداول بالفهرس بين الجداول النشطة — لا يخزّن السيرفر لوناً (تمييز بصري
// فقط، بنفس ترتيب منتقي الجدول في نموذج الموظف)، والمعطَّل رمادي
const scheduleColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
]

export default function WorkDaysSettingsPage() {
  // ===== جداول العمل (كتالوج work-schedules الحقيقي + عدد المُسندين من الخادم) =====
  const [schedules, setSchedules] = useState<ApiWorkSchedule[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(true)
  const [schedulesError, setSchedulesError] = useState<string | null>(null)
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [scheduleBusy, setScheduleBusy] = useState(false)
  const [scheduleAction, setScheduleAction] = useState<{ title: string; description: string; run: (change: ApiAttendanceRuleChange) => Promise<void> } | null>(null)
  // مسودة أيام الراحة للجدول المختار — تُحفظ بزر «حفظ» (الحفظ يعيد احتساب أيام موظفيه)
  const [draftOff, setDraftOff] = useState<string[] | null>(null)
  const [daysError, setDaysError] = useState<string | null>(null)
  // الإسناد تعديل لبيانات الموظفين — يلزمه employees.edit فوق صلاحية الشاشة
  const canAssign = can('employees.edit')
  const [config, setConfig] = useState<Array<{ key: string; value: string }>>([])
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)
  // العمل الإضافي (الأوفرتايم) — قيم config قابلة للتعديل + حالة الحفظ
  const [otValues, setOtValues] = useState<Record<string, string>>({})
  const [otSaving, setOtSaving] = useState(false)
  const [otSaved, setOtSaved] = useState(false)
  const [otError, setOtError] = useState<string | null>(null)
  const [canEditOvertime, setCanEditOvertime] = useState(false)

  // ===== القواعد الاستثنائية (backend حقيقي) =====
  const [scheduleRules, setScheduleRules] = useState<ApiScheduleRule[]>([])
  const [calendarRuleAction, setCalendarRuleAction] = useState<{ rule: ApiScheduleRule; remove: boolean } | null>(null)
  const [calendarScopeId, setCalendarScopeId] = useState('')
  const [calendarRefresh, setCalendarRefresh] = useState(0)
  const canEditCalendarRule = (rule: ApiScheduleRule) => can('attendance.manage') && calendarScopeWritable(rule.branchId == null ? 'GLOBAL' : 'BRANCH', rule.branchId ?? 0)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [rulesError, setRulesError] = useState<string | null>(null)
  const [showAddScheduleRule, setShowAddScheduleRule] = useState(false)
  const [ruleBusyId, setRuleBusyId] = useState<number | null>(null)


  // تحميل أولي: القواعد + الفروع
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [rules, brs] = await Promise.all([
          fetchScheduleRules(),
          fetchBranches(),
        ])
        if (!active) return
        setScheduleRules(rules)
        setBranches(brs)
        setRulesError(null)
      } catch (err: any) {
        if (active) setRulesError(err.message)
      } finally {
        if (active) setRulesLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // إعادة تحميل القواعد بعد أي تعديل
  const reloadRules = async () => {
    try {
      const rules = await fetchScheduleRules()
      setScheduleRules(rules)
      setRulesError(null)
    } catch (err: any) {
      setRulesError(err.message)
    }
  }

  // تفعيل/تعطيل قاعدة
  const toggleScheduleRule = async (rule: ApiScheduleRule, calendarChange: PayrollCalendarChange, context: PayrollCalendarContext) => {
    setRuleBusyId(rule.id)
    try {
      await updateScheduleRule(rule.id, { ...calendarRuleToggle(context, rule.id, rule.isActive), calendarChange })
      await reloadRules()
      setCalendarRefresh(value => value + 1)
    } catch (err: any) {
      setRulesError(err.message)
      throw err
    } finally {
      setRuleBusyId(null)
    }
  }

  // حذف قاعدة
  const removeScheduleRule = async (rule: ApiScheduleRule, calendarChange: PayrollCalendarChange) => {
    setRuleBusyId(rule.id)
    try {
      await deleteScheduleRule(rule.id, calendarChange)
      await reloadRules()
      setCalendarRefresh(value => value + 1)
    } catch (err: any) {
      setRulesError(err.message)
      throw err
    } finally {
      setRuleBusyId(null)
    }
  }

  // اسم الفرع (أو «كل الفروع» إن لم يُحدَّد)
  const branchName = (branchId?: number | null) =>
    branchId == null
      ? 'كل الفروع'
      : branches.find((b) => b.id === branchId)?.name ?? `فرع #${branchId}`

  useEffect(() => {
    const loadConfig = async () => {
      setCanEditOvertime(can('settings.manage'))
      try {
        const cfg = await fetchConfig()
        setConfig(cfg)
        // تعبئة قيم الأوفرتايم القابلة للتعديل من الخادم
        const otMap: Record<string, string> = {}
        for (const k of OVERTIME_EDIT_KEYS) {
          otMap[k] = cfg.find((c) => c.key === k)?.value ?? ''
        }
        setOtValues(otMap)
        setConfigError(null)
      } catch (err: any) {
        setConfigError(err.message)
      } finally {
        setConfigLoading(false)
      }
    }
    loadConfig()
  }, [])

  const configValue = (key: string) => config.find((c) => c.key === key)?.value

  // تعديل قيمة أوفرتايم محلياً (يمسح شارة «تم الحفظ»)
  const setOtValue = (key: string, value: string) => {
    setOtSaved(false)
    setOtValues((prev) => ({ ...prev, [key]: value }))
  }

  // حفظ إعدادات الأوفرتايم — نفس نمط updateConfig المعتمد في بقية الإعدادات
  const saveOvertime = async () => {
    if (otSaving || !canEditOvertime) return
    const values = { ...otValues }
    const fields = [{ key: OVERTIME_THRESHOLD_KEY, label: 'عتبة الإضافي', min: 0, max: 24, integer: false }, ...OVERTIME_NUMBERS]
    for (const field of fields) {
      const value = Number(values[field.key])
      if (!values[field.key]?.trim() || !Number.isFinite(value) || value < field.min || value > field.max ||
        (field.integer ? !Number.isSafeInteger(value) : Math.abs(value * 60 - Math.round(value * 60)) > 1e-8)) {
        setOtError(`${field.label}: أدخل ${field.integer ? 'عددًا صحيحًا' : 'عدد ساعات يمثل دقائق صحيحة'} من ${field.min} إلى ${field.max}`)
        return
      }
    }
    if (![OVERTIME_ENABLED_KEY, OVERTIME_EARLY_KEY].every(key => ['true', 'false'].includes(values[key]))) {
      setOtError('حالة فتح الإضافي أو احتساب الحضور المبكر غير محملة بصورة صحيحة'); return
    }
    const changed = OVERTIME_EDIT_KEYS.filter(key => configValue(key) !== values[key])
    let savedCount = 0
    setOtSaving(true)
    setOtSaved(false)
    setOtError(null)
    try {
      // نتحقق من المجموعة قبل الكتابة؛ الواجهة الحالية تحفظ كل مفتاح بنداء مستقل.
      for (const key of changed) {
        await updateConfig(key, values[key])
        savedCount++
        setConfig(previous => previous.some(row => row.key === key)
          ? previous.map(row => row.key === key ? { key, value: values[key] } : row)
          : [...previous, { key, value: values[key] }])
      }
      setOtValues(values)
      setOtSaved(true)
    } catch (err: any) {
      setOtError(`${savedCount ? `حُفظ ${savedCount} من ${changed.length} إعدادات قبل توقف الحفظ. ` : ''}${err.message}`)
    } finally {
      setOtSaving(false)
    }
  }

  const otEnabled = (otValues[OVERTIME_ENABLED_KEY] ?? '') === 'true'
  const overtimeMonthlyDays = Number(configValue('payroll.monthly_days'))
  const overtimeDailyHours = Number(configValue('payroll.daily_hours'))
  const overtimeDivisorsValid = Number.isFinite(overtimeMonthlyDays) && overtimeMonthlyDays > 0 && Number.isFinite(overtimeDailyHours) && overtimeDailyHours > 0
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  // تحميل جداول العمل من الكتالوج — keepId: الجدول المراد إبقاؤه مختاراً (null = الافتراضي)
  const reloadSchedules = async (keepId?: number | null) => {
    try {
      const rows = await fetchCatalog<ApiWorkSchedule>('work-schedules')
      setSchedules(rows)
      setSchedulesError(null)
      setSelectedId((prev) => {
        const want = keepId !== undefined ? keepId : prev
        if (want != null && rows.some((s) => s.id === want)) return want
        return (rows.find((s) => s.isDefault) ?? rows[0])?.id ?? null
      })
    } catch (err: any) {
      setSchedulesError(err.message)
    } finally {
      setSchedulesLoading(false)
    }
  }

  useEffect(() => {
    reloadSchedules()
  }, [])

  const selectedSchedule = schedules.find((s) => s.id === selectedId) ?? null
  const savedOff = parseWeekend(selectedSchedule?.weekendDays)
  const offDays = draftOff ?? savedOff
  const daysDirty = draftOff !== null && weekendString(draftOff) !== weekendString(savedOff)

  // لون الجدول: بترتيبه بين الجداول النشطة (كنموذج الموظف)، والمعطَّل رمادي
  const colorOf = (s: ApiWorkSchedule) => {
    if (!s.isActive) return 'bg-gray-400'
    const idx = schedules.filter((x) => x.isActive).findIndex((x) => x.id === s.id)
    return scheduleColors[Math.max(idx, 0) % scheduleColors.length]
  }

  // اختيار جدول — مع تنبيه لو فيه تعديلات أيام غير محفوظة
  const selectSchedule = (id: number) => {
    if (id === selectedId) return
    if (daysDirty && !confirm('لديك تعديلات غير محفوظة على أيام العمل — تجاهلها؟')) return
    setDraftOff(null)
    setDaysError(null)
    setSelectedId(id)
  }

  // تبديل يوم بين دوام وراحة (مسودة حتى الحفظ)
  const toggleWorkDay = (code: string) => {
    if (!selectedSchedule) return
    const next = offDays.includes(code) ? offDays.filter((c) => c !== code) : [...offDays, code]
    if (next.length >= weekDays.length) {
      setDaysError('جدول العمل يحتاج يوم دوام واحداً على الأقل')
      return
    }
    setDaysError(null)
    setDraftOff(next)
  }

  // يراجع المستخدم التاريخ والسبب قبل حفظ نسخة أيام العمل.
  const saveWorkDays = () => {
    if (!selectedSchedule || draftOff === null) return
    const weekendDays = weekendString(draftOff)
    setScheduleAction({ title: `حفظ أيام جدول «${selectedSchedule.name}»`,
      description: `أيام الراحة: ${weekDays.filter(day => draftOff.includes(day.code)).map(day => day.name).join('، ') || 'لا توجد'}. تُحفظ نسخة مؤرخة وتبقى الأيام السابقة بإعداداتها.`,
      run: async change => {
        await updateCatalogItem('work-schedules', selectedSchedule.id, { weekendDays, ...change })
        setDraftOff(null); setDaysError(null)
        await reloadSchedules(selectedSchedule.id)
        setScheduleNotice(`حُفظت أيام العمل من ${change.effectiveFrom}`)
      } })
  }

  // حذف جدول — الافتراضي لا يُحذف، وموظفوه يُنقلون للجدول الافتراضي في نفس العملية
  const removeSchedule = (schedule: ApiWorkSchedule) => {
    if (schedule.isDefault) return
    const count = schedule.employeeCount ?? 0
    const def = schedules.find((s) => s.isDefault && s.isActive && s.id !== schedule.id)
    if (count > 0 && !def) {
      setSchedulesError(
        'لا يوجد جدول افتراضي نشط يُنقل إليه موظفو الجدول — عيّن جدولاً افتراضياً أولاً'
      )
      return
    }
    setScheduleAction({ title: `تعطيل جدول «${schedule.name}»`,
      description: count > 0 && def ? `سيُنقل ${count} موظف إلى «${def.name}» اعتبارًا من التاريخ المحدد. يبقى الجدول وتاريخه محفوظين.` : 'يتوقف استخدام الجدول من تاريخ السريان، ويبقى سجل نسخه وأيامه السابقة محفوظًا.',
      run: async change => {
        const result = await deleteWorkSchedule(schedule.id, count > 0 ? def?.id : undefined, change)
        setDraftOff(null); setDaysError(null)
        await reloadSchedules(schedule.id)
        setScheduleNotice(`حُفظ تعطيل «${schedule.name}» من ${change.effectiveFrom}${result.moved ? ` ونقل ${result.moved} موظف` : ''}`)
      } })
  }

  // تعيين كافتراضي — الخادم يُسقط العلم عن غيره ويعيد احتساب أيام «الجدول الافتراضي»
  const makeDefault = (schedule: ApiWorkSchedule) => {
    setScheduleAction({ title: `تعيين «${schedule.name}» كافتراضي`,
      description: 'يحدد الدوام لمن ليس لديه جدول خاص أو وردية، اعتبارًا من تاريخ السريان. يُحفظ انتقال الاختيار الافتراضي في تاريخ الجداول.',
      run: async change => {
        await updateCatalogItem('work-schedules', schedule.id, { isDefault: true, ...change })
        await reloadSchedules(schedule.id)
        setScheduleNotice(`حُفظ الجدول الافتراضي من ${change.effectiveFrom}`)
      } })
  }

  // إحصائيات
  const assignedTotal = schedules.reduce((sum, s) => sum + (s.employeeCount ?? 0), 0)
  const activeRulesCount = scheduleRules.filter(r => r.isActive).length
  const workDaysCount = selectedSchedule
    ? weekDays.filter((d) => !offDays.includes(d.code)).length
    : 0

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أيام العمل</h1>
            <p className="text-gray-500 mt-1">إدارة جداول العمل المختلفة وتعيينها للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            {daysDirty && (
              <span className="flex items-center gap-2 text-warning-600 bg-warning-50 px-3 py-2 rounded-lg">
                <AlertCircle size={18} />
                تعديلات أيام العمل لم تُحفظ
              </span>
            )}
            <button
              disabled
              className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
              title="تعديلات أيام العمل لم تُحفظ — الحفظ في مرحلة لاحقة"
            >
              <Save size={18} />
              حفظ الإعدادات
            </button>
          </div>
        </div>

        {/* إحصائيات عامة */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Briefcase size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">جداول العمل</p>
              <p className="text-2xl font-bold text-gray-800">{schedules.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الموظفين</p>
              <p className="text-2xl font-bold text-success-600">{assignedTotal}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام العمل (الجدول المختار)</p>
              <p className="text-2xl font-bold text-warning-600">{workDaysCount} أيام</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Settings size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قواعد استثنائية نشطة (فعّالة)</p>
              <p className="text-2xl font-bold text-purple-600">{activeRulesCount}</p>
            </div>
          </div>
        </div>

        {/* الإعدادات الفعلية من الخادم */}
        {configError && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{configError}</div>
        )}
        {configLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          !configError && (
            <>
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Settings size={20} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">الإعدادات الفعلية من الخادم</h2>
                  <p className="text-sm text-gray-500">قيم حقيقية من إعدادات النظام — تُدار من الخادم</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">بداية دورة الرواتب</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800">
                    يوم {configValue('payroll.cycle_start_day') ?? '—'} من الشهر
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">سماحية التأخير العامة</span>
                  </div>
                  <p className="text-lg font-bold text-gray-800">
                    {configValue('attendance.grace_minutes') ?? '—'} دقيقة
                  </p>
                  {/* العامة ليست الساري على الجميع: سماحية الوردية تغلبها */}
                  <GraceOverridesNote globalGrace={configValue('attendance.grace_minutes')} />
                </div>
              </div>
            </div>

            {/* العمل الإضافي (الأوفرتايم) — تحكّم HR الفعلي عبر config */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Clock size={20} className="text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">
                      العمل الإضافي (الأوفرتايم)
                    </h2>
                    <p className="text-sm text-gray-500">
                      تحكّم الموارد البشرية في فتح/إغلاق احتساب الأوفرتايم وشروطه
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {otSaved && (
                    <span className="flex items-center gap-1 text-sm text-success-600">
                      <CheckCircle size={16} />
                      تم الحفظ
                    </span>
                  )}
                  <button
                    onClick={saveOvertime}
                    disabled={otSaving || !canEditOvertime}
                    className="btn-primary flex items-center gap-2 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save size={16} />
                    {otSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                  </button>
                </div>
              </div>

              {otError && (
                <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
                  {otError}
                </div>
              )}

              <div className="space-y-4">
                {/* المفتاح الرئيسي: فتح/إغلاق احتساب الأوفرتايم */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">الاكتشاف التلقائي خارج الفترات المحددة</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        يُستخدم عندما لا تغطي اليوم نافذة فتح أو إغلاق محددة
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={otSaving || !canEditOvertime}
                      onClick={() =>
                        setOtValue(OVERTIME_ENABLED_KEY, otEnabled ? 'false' : 'true')
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shrink-0 ${
                        otEnabled
                          ? 'bg-success-50 text-success-600 hover:bg-success-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {otEnabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      {otEnabled ? 'مفعّل' : 'مقفول'}
                    </button>
                  </div>
                  {!otEnabled && (
                    <p className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                      <AlertCircle size={14} className="shrink-0" />
                      الاكتشاف التلقائي متوقف خارج الفترات المفتوحة. يظل طلب الموظف متاحًا بأدلة وسبب ودورة اعتماد.
                    </p>
                  )}
                </div>

                {/* الحد الأدنى للاحتساب بالساعات */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block font-medium text-gray-800 mb-2">
                    شرط استحقاق الإضافي (ساعات)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="24"
                    disabled={otSaving || !canEditOvertime}
                    dir="ltr"
                    className="input w-40"
                    value={otValues[OVERTIME_THRESHOLD_KEY] ?? ''}
                    onChange={(e) => setOtValue(OVERTIME_THRESHOLD_KEY, e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    الزيادة عن ساعات العمل المطلوبة لازم توصل العدد ده — ولو وصلت بتتحسب كلها (قبل التقريب). أدخل ساعات تساوي دقائق صحيحة، مثل 0.5 ساعة = 30 دقيقة. شرط وردية الموظف بيغلب لو محدد.
                  </p>
                </div>

                {/* ضوابط التقديم والتقريب والسقوف؛ القيم من إعدادات الخادم */}
                <fieldset disabled={otSaving || !canEditOvertime} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {OVERTIME_NUMBERS.map(field => <div key={field.key} className="p-4 bg-gray-50 rounded-xl">
                    <label htmlFor={field.key} className="block font-medium text-gray-800 mb-2">{field.label} <span className="text-sm text-gray-500">({field.unit})</span></label>
                    <input id={field.key} type="number" dir="ltr" min={field.min} max={field.max}
                      step={field.integer ? 1 : 'any'} value={otValues[field.key] ?? ''}
                      onChange={event => setOtValue(field.key, event.target.value)} className="input w-full disabled:opacity-60" />
                    <p className="text-xs text-gray-500 mt-2">{field.hint}{!field.integer ? ' تُقبل ساعات تمثل عدد دقائق صحيحًا.' : ''}</p>
                  </div>)}
                </fieldset>

                {/* قاعدة المالك (17 سبتمبر): إضافي يوم العمل = الشغل الفعلي − الساعات المطلوبة، فالحضور بدري بيتحسب لوحده؛ مفتاح «الحضور المبكر» اتشال */}
                <p className="p-4 bg-gray-50 rounded-xl text-xs text-gray-600">
                  الإضافي بيتحسب بعد إكمال ساعات العمل المطلوبة لليوم، مش بعد ميعاد نهاية الوردية؛ فالشغل قبل بداية الدوام بيدخل تلقائي ضمن الشغل الفعلي ومحتاجش إعداد منفصل.
                </p>

                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-indigo-900">معادلة أجر الساعة</p>
                  <p className="text-indigo-800">إجمالي الراتب ÷ أيام الشهر ÷ ساعات العمل اليومية المعيارية</p>
                  <p className="text-gray-700">يُؤخذ إجمالي الراتب تلقائيًا من ملف الموظف، شاملًا الأساسي وجميع البدلات، قبل الخصومات.</p>
                  {overtimeDivisorsValid ? <p className="text-gray-700">أيام الشهر: {overtimeMonthlyDays} · ساعات اليوم: {overtimeDailyHours} <span className="text-xs text-gray-500">(من إعدادات الرواتب)</span></p>
                    : <p className="text-amber-800">أيام الشهر أو ساعات اليوم غير محملة؛ راجع إعدادات الرواتب قبل اعتماد الإضافي.</p>}
                  <p className="text-xs text-gray-600">قيمة الإضافي = أجر الساعة × الساعات المعتمدة × معامل نوع اليوم. تُثبت القيمة عند الاعتماد؛ التعديل لا يعيد تسعير المعتمد سابقًا.</p>
                </div>

                {/* دورة الاعتماد إلزامية لكل إضافي جديد */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-800">دورة الاعتماد قبل الصرف</p>
                      <p className="text-xs text-gray-500 mt-0.5">كل إضافي جديد، مكتشف أو مطلوب من الموظف، ينتظر اكتمال خطوات اعتماده.</p>
                    </div>
                    <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success-50 text-success-600 shrink-0">
                      <CheckCircle size={20} /> مطلوبة دائمًا
                    </span>
                  </div>
                </div>

                {/* إرشاد سلسلة الاعتماد */}
                <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-700">
                    لتحديد مَن يعتمد الأوفرتايم المكتشف: افتح «سلاسل الاعتماد» واضبط معتمدي
                    «عمل إضافي مكتشف (بصمة)».
                  </p>
                </div>
              </div>

              {/* فترات فتح وقفل الإضافي اتنقلت لشاشة العمل الإضافي */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <Link
                  href="/attendance/overtime#overtime-periods"
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 hover:bg-amber-100 transition-colors"
                >
                  <span className="flex items-start gap-3">
                    <Calendar size={20} className="text-amber-600 mt-0.5 shrink-0" />
                    <span>
                      <span className="block font-bold text-gray-800">فترات فتح وقفل الإضافي</span>
                      <span className="block text-sm text-gray-600 mt-0.5">
                        اتنقلت لشاشة «العمل الإضافي» — افتح أو اقفل حساب الإضافي لتواريخ معينة (زي رمضان) من هناك
                      </span>
                    </span>
                  </span>
                  <span className="text-sm text-primary-600 shrink-0">افتح الشاشة ←</span>
                </Link>
              </div>
            </div>
            </>
          )
        )}

        {/* أولوية تعريف دوام اليوم ثم اختيار الموظف الفردي. */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">إعدادات فعلية مؤرخة:</p>
            <p className="mt-1 leading-relaxed">
              يُحدد دوام اليوم من التجاوز اليومي ثم الوردية الأسبوعية ثم جدول الموظف ثم الجدول الافتراضي.
              مدة المرونة وساعات العمل من تعريف ذلك الدوام؛ واختيار الموظف يحسم تفعيلها فقط.
              كل تعديل يحفظ تاريخ سريان وسببًا، وتبقى الفترات المالية المقفلة محمية.
            </p>
          </div>
        </div>

        {schedulesLoading && <p>جارٍ تحميل جداول العمل…</p>}
        {schedulesError && <p role="alert" className="p-3 bg-red-50 text-red-700">{schedulesError}</p>}
        {scheduleNotice && <p role="status" className="p-3 bg-green-50 text-green-700">{scheduleNotice}</p>}
        {daysError && <p role="alert" className="p-3 bg-red-50 text-red-700">{daysError}</p>}
        {daysDirty && <button disabled={scheduleBusy} onClick={saveWorkDays} className="btn-primary">{scheduleBusy ? 'جارٍ الحفظ…' : 'حفظ أيام العمل'}</button>}
        <div className="grid grid-cols-12 gap-6">
          {/* قائمة الجداول */}
          <div className="col-span-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">جداول العمل</h2>
                <button
                  onClick={() => setShowAddSchedule(true)}
                  className="btn-primary flex items-center gap-2 text-sm py-2"
                >
                  <Plus size={16} />
                  جدول جديد
                </button>
              </div>

              <div className="space-y-3">
                {schedules.map(schedule => {
                  const color = ({ class: colorOf(schedule) })
                  const isSelected = selectedSchedule?.id === schedule.id

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => selectSchedule(schedule.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${color.class} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Calendar size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800 truncate">{schedule.name}</h3>
                            {schedule.isDefault && (
                              <span className="px-2 py-0.5 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                                افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{schedule.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users size={12} />
                              {schedule.employeeCount} موظف
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* أيام العمل */}
                      <div className="flex gap-1 mt-3">
                        {weekDays.map(day => (
                          <div
                            key={day.key}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              !parseWeekend(schedule.weekendDays).includes(day.code)
                                ? `${color.class} text-white`
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {day.shortName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* تفاصيل الجدول المختار */}
          <div className="col-span-8 space-y-6">
            {selectedSchedule ? (
              <>
                {/* معلومات الجدول */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${colorOf(selectedSchedule)} rounded-xl flex items-center justify-center`}>
                        <Calendar size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-800">{selectedSchedule.name}</h2>
                          {selectedSchedule.isDefault && (
                            <span className="px-2 py-1 bg-primary-100 text-primary-600 rounded-full text-xs font-medium">
                              الجدول الافتراضي
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500">{selectedSchedule.description}</p>
                        {selectedSchedule.attendanceRuleEffectiveFrom && <p className={`text-xs mt-1 ${selectedSchedule.attendanceRuleEffectiveFrom > localToday() ? 'text-amber-700' : 'text-gray-500'}`}>النسخة {selectedSchedule.attendanceRuleVersion} · تسري من {selectedSchedule.attendanceRuleEffectiveFrom}{selectedSchedule.attendanceRuleEffectiveFrom > localToday() ? ' — إعداد مستقبلي' : ''}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={!canAssign || scheduleBusy || !selectedSchedule.isActive}
                        onClick={() => setShowAssignModal(true)}
                        className="btn-primary flex items-center gap-2 text-sm py-2"
                      >
                        <UserPlus size={16} />
                        تعيين للموظفين
                      </button>
                      {!selectedSchedule.isDefault && (
                        <button
                          onClick={() => makeDefault(selectedSchedule)}
                          className="btn-secondary text-sm py-2"
                        >
                          تعيين كافتراضي
                        </button>
                      )}
                      <button
                        onClick={() => setShowEditSchedule(true)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                      >
                        <Edit3 size={18} />
                      </button>
                      {!selectedSchedule.isDefault && (
                        <button
                          onClick={() => removeSchedule(selectedSchedule)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ساعات العمل */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">ساعات العمل</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {selectedSchedule.startTime} - {selectedSchedule.endTime}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">وقت الاستراحة</span>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        تُضبط من سياسة الوردية
                      </p>
                    </div>
                  </div>

                  {/* أيام العمل */}
                  <p className="mb-4 text-sm text-blue-800">
                    {selectedSchedule.flexEnabled ? `مرونة مفعلة: ${selectedSchedule.startTime}–${flexEndTime(selectedSchedule.startTime, selectedSchedule.flexWindowMinutes ?? 0)}` : 'مرونة الحضور معطلة على الجدول'}
                    {selectedSchedule.requiredWorkMinutes != null && ` · العمل المطلوب ${selectedSchedule.requiredWorkMinutes} دقيقة`}
                  </p>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-3">
                      أيام العمل
                      <span className="text-xs text-gray-400 mr-2">
                        (تُطبق بعد الحفظ على حساب الحضور)
                      </span>
                    </h3>
                    <div className="flex items-center justify-center gap-3">
                      {weekDays.map(day => (
                        <button
                          key={day.key}
                          onClick={() => toggleWorkDay(day.code)}
                          className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                            !offDays.includes(day.code)
                              ? `${colorOf(selectedSchedule)} text-white shadow-lg`
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          <span className="text-xl font-bold">{day.shortName}</span>
                          <span className="text-xs">{day.name}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            !offDays.includes(day.code) ? 'bg-white/20' : 'bg-gray-200'
                          }`}>
                            {!offDays.includes(day.code) ? (
                              <CheckCircle size={14} className="text-white" />
                            ) : (
                              <span className="text-gray-400 text-xs">✕</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* القواعد الاستثنائية — backend حقيقي، فعّالة على الحضور */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                        <Settings size={20} className="text-warning-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-800">القواعد الاستثنائية</h2>
                          <span className="px-2 py-0.5 bg-success-100 text-success-700 rounded-full text-xs font-medium">
                            فعّالة
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          قواعد حقيقية تؤثر على احتساب الحضور (مثل: السبت الأخير من الشهر دوام رسمي) — مشتركة لكل الجداول
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddScheduleRule(true)}
                      disabled={!can('attendance.manage')}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus size={18} />
                      إضافة قاعدة
                    </button>
                  </div>

                  {rulesError && (
                    <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-4">
                      {rulesError}
                    </div>
                  )}
                  <div className="space-y-3 mb-4">
                    <label className="label">نطاق التقويم<select className="input mt-1 max-w-sm" value={calendarScopeId} onChange={event => setCalendarScopeId(event.target.value)}><option value="">التقويم العام — كل الفروع</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                    <CalendarScopeConfirmation key={`${calendarScopeId}:${calendarRefresh}`} scope={calendarScopeId ? 'BRANCH' : 'GLOBAL'} sourceId={Number(calendarScopeId) || 0} canConfirm={calendarScopeId ? (can('settings.manage') || can('org.manage')) && calendarScopeWritable('BRANCH', Number(calendarScopeId)) : can('settings.manage') && calendarScopeWritable('GLOBAL', 0)} disabled={!!calendarRuleAction || showAddScheduleRule} onConfirmed={reloadRules} />
                  </div>

                  {rulesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : scheduleRules.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Settings size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>لا توجد قواعد استثنائية</p>
                      <p className="text-sm mt-1">
                        أضف قاعدة مثل: السبت الأخير من الشهر دوام رسمي
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduleRules.map((rule) => {
                        const isWork = rule.effect === 'WORK'
                        const EffectIcon = isWork ? Sun : Moon
                        const busy = ruleBusyId === rule.id
                        return (
                          <div
                            key={rule.id}
                            className={`border-2 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                              rule.isActive
                                ? 'border-gray-200 bg-white'
                                : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`w-10 h-10 ${isWork ? 'bg-green-500' : 'bg-red-500'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                <EffectIcon size={20} className="text-white" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-gray-800">{rule.name}</h3>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    rule.isActive
                                      ? 'bg-success-100 text-success-600'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}>
                                    {rule.isActive ? 'نشطة' : 'معطلة'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{scheduleRuleSentence(rule)}</p>
                                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                                  <Building2 size={12} />
                                  {branchName(rule.branchId)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => setCalendarRuleAction({ rule, remove: false })}
                                disabled={busy || !canEditCalendarRule(rule)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                                  rule.isActive
                                    ? 'bg-success-50 text-success-600 hover:bg-success-100'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                              >
                                {rule.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                {rule.isActive ? 'تعطيل' : 'تفعيل'}
                              </button>
                              <button
                                onClick={() => setCalendarRuleAction({ rule, remove: true })}
                                disabled={busy || !canEditCalendarRule(rule)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                <Trash2 size={18} />
                                إيقاف من تاريخ
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* آلية العمل */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                    <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-blue-700 leading-relaxed">
                      قاعدة «دوام رسمي» تُحوّل يوم راحة مطابق إلى يوم عمل (مثل آخر سبت في الشهر)، وقاعدة «إجازة»
                      تُحوّل يوم دوام إلى راحة. لا يتم تجاوز الإجازات الرسمية أبداً.
                    </p>
                  </div>
                </div>

                {/* ملاحظة */}
                <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                  <Info size={20} className="text-blue-500 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">كيفية تعيين الجدول للموظفين:</p>
                    <p className="mt-1">عند إضافة موظف جديد أو تعديل موظف حالي، يمكنك اختيار جدول العمل المناسب له من قائمة الجداول المتاحة.</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="card flex items-center justify-center h-96 text-gray-500">
                <div className="text-center">
                  <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>اختر جدول عمل من القائمة</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAddSchedule && <ScheduleModal onClose={() => setShowAddSchedule(false)} onSaved={async (id) => { await reloadSchedules(id); setShowAddSchedule(false) }} />}
        {scheduleAction && <AttendanceRuleChangeModal title={scheduleAction.title} description={scheduleAction.description}
          onClose={() => setScheduleAction(null)} onSave={async change => { setScheduleBusy(true); try { await scheduleAction.run(change); setScheduleAction(null) } finally { setScheduleBusy(false) } }} />}
        {showEditSchedule && selectedSchedule && <ScheduleModal schedule={selectedSchedule} onClose={() => setShowEditSchedule(false)} onSaved={async (id) => { setDraftOff(null); await reloadSchedules(id); setShowEditSchedule(false) }} />}

        {/* Modal إضافة قاعدة استثنائية (backend حقيقي) */}
        {calendarRuleAction && <CalendarMutationDialog scope={calendarRuleAction.rule.branchId == null ? 'GLOBAL' : 'BRANCH'} sourceId={calendarRuleAction.rule.branchId ?? 0} title={`${calendarRuleAction.remove ? 'إيقاف' : calendarRuleAction.rule.isActive ? 'تعطيل' : 'تفعيل'} القاعدة «${calendarRuleAction.rule.name}»`} description="يسري القرار من التاريخ المحدد مع بقاء نسخة التقويم السابقة. نطاق القاعدة ثابت؛ النقل إلى فرع آخر يتم بقاعدة جديدة وإيقاف القديمة." onClose={() => setCalendarRuleAction(null)} onSave={(change, context) => calendarRuleAction.remove ? removeScheduleRule(calendarRuleAction.rule, change) : toggleScheduleRule(calendarRuleAction.rule, change, context)} />}
        {showAddScheduleRule && (
          <AddScheduleRuleModal
            branches={branches}
            onClose={() => setShowAddScheduleRule(false)}
            onCreated={async () => { await reloadRules(); setCalendarRefresh(value => value + 1) }}
          />
        )}

        {/* Modal تعيين الجدول للموظفين */}
        {showAssignModal && selectedSchedule && (
          <AssignScheduleModal
            schedule={selectedSchedule}
            onClose={() => setShowAssignModal(false)}
            onAssign={async () => {
              await reloadSchedules(selectedSchedule.id)
              setShowAssignModal(false)
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}

// إنشاء وتعديل الجدول في الكتالوج قبل إغلاق النموذج.
function ScheduleModal({ schedule, onClose, onSaved }: {
  schedule?: ApiWorkSchedule; onClose: () => void; onSaved: (id: number) => Promise<void>
}) {
  const [name, setName] = useState(schedule?.name ?? '')
  const [description, setDescription] = useState(schedule?.description ?? '')
  const [startTime, setStartTime] = useState(schedule?.startTime ?? '08:00')
  const [endTime, setEndTime] = useState(schedule?.endTime ?? '17:00')
  const [off, setOff] = useState(parseWeekend(schedule?.weekendDays ?? 'FRI,SAT'))
  const [isActive, setActive] = useState(schedule?.isActive ?? true)
  const [flexEnabled, setFlexEnabled] = useState(schedule?.flexEnabled ?? false)
  const [flexWindowMinutes, setFlexWindowMinutes] = useState(String(schedule?.flexWindowMinutes ?? ''))
  const [requiredWorkMinutes, setRequiredWorkMinutes] = useState(String(schedule?.requiredWorkMinutes ?? ''))
  const [change, setChange] = useState<ApiAttendanceRuleChange>({ effectiveFrom: schedule?.attendanceRuleEffectiveFrom && schedule.attendanceRuleEffectiveFrom > localToday() ? schedule.attendanceRuleEffectiveFrom : localToday(), changeReason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !startTime || !endTime || startTime === endTime || off.length === 7) {
      setError('أدخل اسماً وساعات صحيحة ويوم دوام واحداً على الأقل'); return
    }
    if (!change.effectiveFrom || !change.changeReason.trim()) { setError('حدد تاريخ السريان وسبب الحفظ'); return }
    if (flexEnabled && (!Number(flexWindowMinutes) || !Number(requiredWorkMinutes) || Number(flexWindowMinutes) >= Number(requiredWorkMinutes))) {
      setError('المرونة تحتاج نافذة موجبة وأقل من دقائق العمل المطلوبة'); return
    }
    setBusy(true); setError('')
    try {
      const payload = { name: name.trim(), description: description.trim(), startTime, endTime, weekendDays: weekendString(off), isActive,
        flexEnabled, flexWindowMinutes: flexWindowMinutes === '' ? null : Number(flexWindowMinutes),
        requiredWorkMinutes: requiredWorkMinutes === '' ? null : Number(requiredWorkMinutes), ...change }
      const row = schedule
        ? await updateCatalogItem<ApiWorkSchedule>('work-schedules', schedule.id, payload)
        : await createCatalogItem<ApiWorkSchedule>('work-schedules', payload)
      await onSaved(row.id)
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر حفظ الجدول') }
    finally { setBusy(false) }
  }
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">{schedule ? 'تعديل جدول العمل' : 'جدول عمل جديد'}</h2>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <label className="block">الاسم<input required maxLength={100} className="input w-full" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="block">الوصف<input className="input w-full" value={description} onChange={e => setDescription(e.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label>بداية الدوام<input required type="time" className="input w-full" value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
        <label>نهاية الدوام<input required type="time" className="input w-full" value={endTime} onChange={e => setEndTime(e.target.value)} /></label>
      </div>
      <p className="text-sm text-gray-500">نهاية الدوام قبل بدايته تعني وردية تمتد لليوم التالي.</p>
      <div className="p-4 rounded-xl bg-blue-50 space-y-3">
        <label className="flex gap-2 font-medium"><input type="checkbox" checked={flexEnabled} onChange={e => setFlexEnabled(e.target.checked)} />تفعيل نافذة الحضور المرنة</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">مدة النافذة (دقيقة)<input type="number" min="1" max="1439" step="1" className="input w-full" value={flexWindowMinutes} onChange={e => setFlexWindowMinutes(e.target.value)} /></label>
          <label className="text-sm">العمل المطلوب (دقيقة)<input type="number" min="1" max="1440" step="1" className="input w-full" value={requiredWorkMinutes} onChange={e => setRequiredWorkMinutes(e.target.value)} /></label>
        </div>
        {flexWindowMinutes && <p className="text-sm">الحضور المسموح: {startTime}–{flexEndTime(startTime, Number(flexWindowMinutes))} · المطلوب {Number(requiredWorkMinutes) / 60 || '—'} ساعات.</p>}
        <p className="text-xs text-blue-800">نقص العمل مستقل عن التأخير. بعد النافذة يُحسب التأخير من بداية الدوام، وإكمال الساعات لا يمنح إضافيًا تلقائيًا.</p>
      </div>
      <fieldset><legend>أيام الدوام</legend><div className="flex gap-2 flex-wrap">{weekDays.map(d => <label key={d.code} className="flex gap-1"><input type="checkbox" checked={!off.includes(d.code)} onChange={() => setOff(prev => prev.includes(d.code) ? prev.filter(c => c !== d.code) : [...prev, d.code])} />{d.name}</label>)}</div></fieldset>
      <label className="flex gap-2" title={schedule?.isDefault ? 'الجدول الافتراضي لا يمكن تعطيله' : undefined}><input type="checkbox" checked={isActive} disabled={schedule?.isDefault} onChange={e => setActive(e.target.checked)} />نشط{schedule?.isDefault && <span className="text-xs text-gray-500">(الجدول الافتراضي لا يمكن تعطيله)</span>}</label>
      <AttendanceRuleChangeFields value={change} onChange={setChange} />
      <div className="flex gap-3"><button type="submit" disabled={busy} className="btn-primary">{busy ? 'جارٍ الحفظ…' : 'حفظ الجدول'}</button><button type="button" disabled={busy} onClick={onClose} className="btn-secondary">إلغاء</button></div>
    </form>
  </div>
}

function AttendanceRuleChangeFields({ value, onChange }: {
  value: ApiAttendanceRuleChange; onChange: (change: ApiAttendanceRuleChange) => void
}) {
  return <div className="space-y-3">
    <label className="block text-sm">تاريخ السريان<input type="date" required className="input w-full" value={value.effectiveFrom} onChange={e => onChange({ ...value, effectiveFrom: e.target.value })} /></label>
    <label className="block text-sm">سبب الحفظ<textarea required maxLength={500} className="input w-full" value={value.changeReason} onChange={e => onChange({ ...value, changeReason: e.target.value })} /></label>
    <p className="text-xs text-gray-500">تُطبق النسخة في تاريخها. تتطلب الفترات المعتمدة أو المصروفة معالجة مستقلة.</p>
  </div>
}

function AttendanceRuleChangeModal({ title, description, onClose, onSave }: {
  title: string; description: string; onClose: () => void; onSave: (change: ApiAttendanceRuleChange) => Promise<void>
}) {
  const [change, setChange] = useState<ApiAttendanceRuleChange>({ effectiveFrom: localToday(), changeReason: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!change.effectiveFrom || !change.changeReason.trim()) { setError('حدد تاريخ السريان والسبب'); return }
    setBusy(true); setError('')
    try { await onSave({ ...change, changeReason: change.changeReason.trim() }) }
    catch (error) { setError(error instanceof Error ? error.message : 'تعذر الحفظ') }
    finally { setBusy(false) }
  }
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-gray-600">{description}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <AttendanceRuleChangeFields value={change} onChange={setChange} />
      <div className="flex gap-3"><button type="submit" disabled={busy} className="btn-primary">{busy ? 'جارٍ الحفظ…' : 'حفظ التغيير'}</button><button type="button" disabled={busy} className="btn-secondary" onClick={onClose}>إلغاء</button></div>
    </form>
  </div>
}

// Modal إضافة قاعدة استثنائية (backend حقيقي عبر createScheduleRule)
function AddScheduleRuleModal({
  branches,
  onClose,
  onCreated,
}: {
  branches: ApiBranch[]
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [name, setName] = useState('')
  const [weekday, setWeekday] = useState<ApiScheduleRule['weekday']>('SAT')
  const [occurrence, setOccurrence] = useState<ApiScheduleRule['occurrence']>('LAST')
  const [effect, setEffect] = useState<ApiScheduleRule['effect']>('WORK')
  const [branchId, setBranchId] = useState<string>(() => calendarScopeWritable('GLOBAL', 0) ? '' : String(getCurrentUser()?.branchId ?? ''))
  const calendar = useCalendarContext(branchId ? 'BRANCH' : 'GLOBAL', Number(branchId) || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // معاينة حيّة للجملة العربية
  const preview = scheduleRuleSentence({ weekday, occurrence, effect })

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('الرجاء إدخال اسم القاعدة')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createScheduleRule({
        name: name.trim(),
        weekday,
        occurrence,
        effect,
        branchId: branchId ? Number(branchId) : undefined,
        calendarChange: buildCalendarChange(calendar.context, calendar.evidence),
      })
      await onCreated()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">إضافة قاعدة استثنائية</h2>
            <p className="text-gray-500 text-sm mt-1">قاعدة فعّالة تؤثر على احتساب الحضور</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>
          )}

          {/* الاسم */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اسم القاعدة *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: آخر سبت دوام رسمي"
              className="input w-full"
            />
          </div>

          {/* اليوم والتكرار */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">اليوم</label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(e.target.value as ApiScheduleRule['weekday'])}
                className="input w-full"
              >
                {RULE_WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">التكرار</label>
              <select
                value={occurrence}
                onChange={(e) => setOccurrence(e.target.value as ApiScheduleRule['occurrence'])}
                className="input w-full"
              >
                {RULE_OCCURRENCES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* التأثير */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">التأثير</label>
            <div className="grid grid-cols-2 gap-3">
              {RULE_EFFECTS.map((ef) => {
                const active = effect === ef.value
                const Icon = ef.value === 'WORK' ? Sun : Moon
                return (
                  <button
                    key={ef.value}
                    type="button"
                    onClick={() => setEffect(ef.value)}
                    className={`p-4 rounded-xl border-2 text-right transition-all ${
                      active ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${ef.value === 'WORK' ? 'bg-green-500' : 'bg-red-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{ef.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{ef.desc}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* الفرع */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الفرع</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input w-full"
            >
              {calendarScopeWritable('GLOBAL', 0) && <option value="">كل الفروع</option>}
              {branches.filter(branch => calendarScopeWritable('BRANCH', branch.id)).map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* معاينة الجملة */}
          <CalendarContextSummary context={calendar.context} loading={calendar.loading} error={calendar.error} />
          <CalendarChangeFields context={calendar.context} value={calendar.evidence} onChange={calendar.setEvidence} disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false} />
          <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
            <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">معاينة القاعدة:</p>
              <p className="mt-1">{preview}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : 'إضافة القاعدة'}
          </button>
          <button onClick={onClose} className="flex-1 btn-secondary">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

// الإسناد إلى الموظفين الفعليين داخل نطاق المستخدم.
function AssignScheduleModal({ schedule, onClose, onAssign }: {
  schedule: ApiWorkSchedule; onClose: () => void; onAssign: () => Promise<void>
}) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [scope, setScope] = useState<'custom' | 'department' | 'all'>('custom')
  const [departmentId, setDepartmentId] = useState('')
  const [ids, setIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [change, setChange] = useState<ApiAttendanceRuleChange>({ effectiveFrom: localToday(), changeReason: '' })
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchDepartments()]).then(([emps, deps]) => {
      setEmployees(emps.filter(e => !['archived', 'terminated'].includes(e.status)))
      setDepartments(deps)
    }).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])
  const save = async () => {
    if (!change.effectiveFrom || !change.changeReason.trim()) { setError('حدد تاريخ سريان الإسناد والسبب'); return }
    if ((scope === 'custom' && !ids.length) || (scope === 'department' && !departmentId)) {
      setError('اختر الموظفين أو القسم المطلوب'); return
    }
    setBusy(true); setError('')
    try {
      await assignWorkSchedule(schedule.id, scope === 'all' ? { all: true } : scope === 'department' ? { departmentId: Number(departmentId) } : { employeeIds: ids }, change)
      await onAssign()
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إسناد الجدول') }
    finally { setBusy(false) }
  }
  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
      <h2 className="text-xl font-bold">تعيين جدول «{schedule.name}»</h2>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {loading ? <p>جارٍ تحميل الموظفين…</p> : <>
        <label className="block">نطاق الإسناد<select className="input w-full" value={scope} onChange={e => setScope(e.target.value as typeof scope)}><option value="custom">موظفون محددون</option><option value="department">قسم</option><option value="all">كل الموظفين النشطين في نطاقك</option></select></label>
        {scope === 'department' && <select aria-label="القسم" className="input w-full" value={departmentId} onChange={e => setDepartmentId(e.target.value)}><option value="">اختر القسم</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
        {scope === 'all' && <p className="text-amber-700">سيتم استبدال الجدول الحالي لكل الموظفين النشطين داخل نطاق صلاحياتك.</p>}
        {scope === 'custom' && <><input aria-label="بحث الموظفين" className="input w-full" placeholder="بحث بالاسم أو الكود" value={search} onChange={e => setSearch(e.target.value)} /><div className="max-h-64 overflow-auto space-y-2">{employees.filter(e => (e.fullName + e.employeeCode).includes(search)).map(e => <label key={e.id} className="flex gap-2 p-2"><input type="checkbox" checked={ids.includes(e.id)} onChange={() => setIds(prev => prev.includes(e.id) ? prev.filter(id => id !== e.id) : [...prev, e.id])} />{e.fullName} — {e.employeeCode}</label>)}</div><p>{ids.length} موظف محدد</p></>}
      </>}
      <AttendanceRuleChangeFields value={change} onChange={setChange} />
      <div className="flex gap-3"><button disabled={loading || busy} onClick={save} className="btn-primary">{busy ? 'جارٍ الإسناد…' : 'تأكيد الإسناد'}</button><button disabled={busy} onClick={onClose} className="btn-secondary">إلغاء</button></div>
    </div>
  </div>
}
