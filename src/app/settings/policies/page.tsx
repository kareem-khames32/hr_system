'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Info,
  Save,
  Calendar,
  Clock,
  Timer,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { can, fetchConfig, updateConfig } from '@/lib/api'
import { invalidateCurrency } from '@/lib/currency'
import { GraceOverridesNote } from '@/components/GraceOverridesNote'
import { buildCalendarChange, calendarScopeWritable, type PayrollCalendarChange } from '@/lib/payroll-calendar-api'
import { CalendarChangeFields, CalendarContextSummary, CalendarScopeConfirmation, useCalendarContext } from '@/components/PayrollCalendarChange'

// حقل سياسة — يعرض ويعدّل مفتاح إعداد فعلياً على الخادم
type FieldType = 'number' | 'text' | 'bool' | 'select' | 'secret'
interface PolicyField {
  key: string
  label: string
  type: FieldType
  hint?: string
  unit?: string
  min?: number // الحد الأدنى للحقول الرقمية (المقسوم عليه ≥ 1)
  max?: number
  integer?: boolean
  nullable?: boolean
  options?: { value: string; label: string }[]
  wide?: boolean // حقل نصي عريض بأكواد لاتينية (جداول «مفتاح:قيمة»)
}
interface PolicyGroup {
  title: string
  icon: typeof Calendar
  iconBg: string
  iconColor: string
  note?: string // ملاحظة تُعرض تحت العنوان (مثلاً: يُضبط من شاشة أخرى)
  fields: PolicyField[]
}

// العطلة الأسبوعية: رموز SUN..SAT مفصولة بفاصلة (مرآة تحقق الخادم — SET-15). تُطبَّع
// قبل الحفظ (حروف كبيرة بترتيب الأسبوع)، وكل أيام الأسبوع مرفوضة. null = قيمة غير صالحة
const WEEKEND_KEY = 'attendance.weekend_days'
const DEVICE_KEY = 'attendance.device_key'
const deviceKeyWeak = (value: string) => !!value.trim() && (value.trim() === 'zk-device-key-change-me' || value.trim().length < 24)
const WEEK_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const normalizeWeekend = (v: string): string | null => {
  const parts = v.toUpperCase().split(',').map((p) => p.trim())
  if (!parts.every((p) => WEEK_CODES.includes(p))) return null
  const days = new Set(parts)
  if (days.size === WEEK_CODES.length) return null
  return WEEK_CODES.filter((d) => days.has(d)).join(',')
}

// المجموعات ومفاتيحها — كلها مفاتيح موجودة في إعدادات المحرك (requests_config)
const GROUPS: PolicyGroup[] = [
  {
    title: 'الإجازات',
    icon: Calendar,
    iconBg: 'bg-primary-50',
    iconColor: 'text-primary-500',
    fields: [
      { key: 'leave.annual_entitled', label: 'الإجازة السنوية', type: 'number', unit: 'يوم/سنة', hint: 'الاستحقاق الأساسي — نظام العمل السعودي 21 يوم. التعديل يسري على أرصدة السنة الجارية' },
      { key: 'leave.sick_entitled', label: 'الإجازة المرضية', type: 'number', unit: 'يوم/سنة', hint: 'إجمالي أيام الإجازة المرضية في السنة — التعديل يسري على أرصدة السنة الجارية' },
      { key: 'leave.max_backdate_days', label: 'أقصى أثر رجعي لطلب الإجازة', type: 'number', unit: 'يوم', hint: 'الإجازة الأقدم من كده بتتسجل عن طريق الموارد البشرية بس' },
      {
        key: 'leave.accrual_mode', label: 'طريقة الاستحقاق', type: 'select',
        options: [
          { value: 'monthly', label: 'شهري (يتراكم كل شهر)' },
          { value: 'yearly', label: 'سنوي (دفعة واحدة)' },
          { value: 'daily', label: 'يومي (تراكمي)' },
        ],
      },
      { key: 'leave.probation_months', label: 'فترة التجربة قبل بدء الاستحقاق', type: 'number', unit: 'شهر' },
      { key: 'leave.carryover_max_days', label: 'الحد الأقصى للترحيل', type: 'number', unit: 'يوم' },
      { key: 'leave.carryover_expiry_months', label: 'صلاحية الرصيد المُرحّل', type: 'number', unit: 'شهر' },
    ],
  },
  {
    title: 'الحضور والتأخير',
    icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    note: 'سماحية التأخير تُضبط لكل وردية على حدة من شاشة «الورديات».',
    fields: [
      { key: 'attendance.weekend_days', label: 'أيام نهاية الأسبوع', type: 'text', hint: 'رموز الأيام مفصولة بفاصلة — SUN,MON,TUE,WED,THU,FRI,SAT. يتجاوزها الفرع من شاشة «الفروع»' },
      { key: 'attendance.absence_catchup_max_days', label: 'حد استدراك تسجيل الغياب', type: 'number', unit: 'يوم', min: 1, max: 366, integer: true, hint: 'أقصى عدد أيام تُراجع بعد توقف الخادم، من 1 إلى 366 يوماً.' },
      { key: DEVICE_KEY, label: 'مفتاح استقبال البصمات', type: 'secret', hint: 'يُستخدم في إعداد الجهاز أو الوسيط. اتركه فارغاً لإيقاف استقبال البصمات.' },
      { key: 'payroll.late_deduction_enabled', label: 'خصم التأخير من الراتب', type: 'bool' },
    ],
  },
  {
    // قرارات المالك D1 وD5 وD7 (14 سبتمبر): القيم المبذورة هي افتراضات المواصفة، وتعديلها يسري على الحساب اللاحق.
    title: 'نقص ساعات العمل والمرونة',
    icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    note: 'تعديل مفاتيح المرونة يُثبت قيمها السابقة في تاريخ تعريف الدوام قبل الحفظ، فلا تتغير أيام سابقة. إذا كان خصم التأخير مقفولًا لا تُطرح دقائقه من النقص (D7).',
    fields: [
      { key: 'payroll.early_leave_deduction_enabled', label: 'خصم الخروج المبكر على الوردية الثابتة', type: 'bool', hint: 'D1: يُخصم بسعر الدقيقة بعد طرح التأخير والسماحية. الوردية المرنة يحكمها «خصم نقص ساعات العمل».' },
      { key: 'payroll.shortfall_enabled', label: 'خصم نقص ساعات العمل', type: 'bool', hint: 'D5: الساعات المطلوبة ناقص ساعات العمل الفعلية بعد السماحية.' },
      { key: 'payroll.shortfall_mode', label: 'طريقة خصم النقص', type: 'select', options: [
        { value: 'MINUTES', label: 'بسعر الدقيقة' },
        { value: 'MULTIPLIER', label: 'بسعر الدقيقة × معامل' },
        { value: 'FRACTION', label: 'كسر يوم ثابت' },
      ] },
      { key: 'payroll.shortfall_value', label: 'قيمة طريقة النقص', type: 'number', min: 0, max: 1000, hint: 'بسعر الدقيقة = 1. في المعامل: المضاعف، وفي كسر اليوم: جزء اليوم (مثل 0.25).' },
      { key: 'attendance.flex.shortfall_grace_minutes', label: 'سماحية نقص الساعات', type: 'number', unit: 'دقيقة', min: 0, max: 1440, integer: true },
      { key: 'payroll.attendance_overlap_policy', label: 'التداخل بين التأخير والنقص', type: 'select', options: [
        { value: 'NET_OF_LATENESS', label: 'يُطرح التأخير من النقص (بلا ازدواج)' },
        { value: 'MAX_OF_BOTH', label: 'الأكبر منهما فقط' },
        { value: 'CUMULATIVE', label: 'الاثنان معًا' },
      ] },
      { key: 'payroll.attendance_daily_cap_days', label: 'سقف خصم الحضور اليومي', type: 'number', unit: 'يوم', min: 0, max: 31, hint: 'D5: يوم واحد. التأخير أولًا ثم النقص المتبقي داخل السقف.' },
      { key: 'attendance.flex.window_supersedes_grace', label: 'نافذة المرونة تغني عن سماحية التأخير', type: 'bool' },
      { key: 'attendance.flex.count_early_work_toward_required', label: 'احتساب الحضور قبل بداية الدوام من الساعات المطلوبة', type: 'bool' },
      { key: 'attendance.flex.prorate_window_on_partial_leave', label: 'تناسب نافذة المرونة مع الإجازة الجزئية', type: 'bool' },
      { key: 'attendance.flex.unpaid_break_minutes', label: 'استراحة غير مدفوعة', type: 'number', unit: 'دقيقة', min: 0, max: 1440, integer: true },
      { key: 'attendance.flex.max_session_minutes', label: 'أقصى مدة جلسة حضور', type: 'number', unit: 'دقيقة', min: 1, max: 1440, integer: true },
      { key: 'attendance.flex.missing_checkout_policy', label: 'عند نسيان بصمة الانصراف', type: 'select', options: [{ value: 'MANUAL_ONLY', label: 'تصحيح يدوي فقط' }] },
    ],
  },
  {
    title: 'العمل الإضافي (الأوفرتايم)',
    icon: Timer,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
    note: 'الإضافي يحتاج اكتمال دورة الاعتماد دائمًا. إعدادات الاحتساب والسقوف تُدار من «أيام العمل والدوام»، وعتبة الوردية من «الورديات».',
    fields: [
      { key: 'overtime.default_window', label: 'نافذة الإضافي الافتراضية', type: 'select', options: [{ value: 'AFTER_SHIFT_END', label: 'بعد نهاية الوردية' }], hint: 'D11: الكشف القائم يستمر بعد نهاية الوردية.' },
      { key: 'overtime.outside_window_policy', label: 'العمل خارج نوافذ الإضافي', type: 'select', options: [{ value: 'CLOSED', label: 'لا يُحتسب إضافيًا (SRS LOT-14)' }], hint: 'D11: الحضور المبكر قبل الوردية يحكمه إعداد الإضافي المبكر في «أيام العمل والدوام».' },
    ],
  },
  {
    title: 'أقساط السلف وحماية الصافي',
    icon: Wallet,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    note: 'تُحفظ هذه الاختيارات مع حساب المسير. إعادة الحساب تحتفظ بها، إلا عند اختيار تحديث سياسة الأقساط. يمكن طلب تأجيل قسط بعينه من شاشة السلف حتى لو الراتب يكفي.',
    fields: [
      { key: 'loan.insufficient_net_behavior', label: 'عندما لا يكفي المتاح للقسط', type: 'select', options: [
        { value: 'PARTIAL_THEN_CARRY', label: 'خصم المتاح وترحيل الباقي للشهر التالي' },
        { value: 'SKIP_AND_EXTEND', label: 'تأجيل القسط بالكامل ومد الجدول' },
      ] },
      { key: 'payroll.policy.min_net_guarantee', label: 'الحد الأدنى للصافي', type: 'number', min: 0, nullable: true, hint: 'اتركه فارغًا إذا لم تحدد حدًا ثابتًا. لا يضيف النظام مبلغًا للراتب إذا كانت الخصومات السابقة تجاوزت الحد.' },
      { key: 'payroll.policy.net_floor_pct', label: 'الحد الأدنى كنسبة من الأجر الثابت المستحق', type: 'number', min: 0, max: 100, nullable: true, unit: '%', hint: 'إذا حددت مبلغًا ثابتًا أيضًا يُستخدم الأكبر منهما. فارغ = لا حد نسبي.' },
      { key: 'payroll.policy.max_deduction_pct_of_gross', label: 'سقف الخصومات من الأجر الثابت المستحق', type: 'number', min: 0, max: 100, nullable: true, unit: '%', hint: 'يحسب النظام ما استهلكته الخصومات السابقة قبل تحديد المتاح للسلف. فارغ = بلا سقف نسبي.' },
      { key: 'payroll.loan_catchup_max_overdue', label: 'أقصى أقساط متأخرة تُخصم في المسير', type: 'number', unit: 'قسط', min: 0, max: 120, integer: true, hint: 'D10: إضافة إلى أقساط الشهر الحالي؛ الأقدم أولًا، والباقي يبقى مستحقًا للمسيرات التالية. صفر = أقساط الشهر الحالي فقط.' },
    ],
  },
  {
    title: 'المسير ونهاية الخدمة',
    icon: Wallet,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    fields: [
      { key: 'system.currency', label: 'عملة النظام', type: 'select', options: [{ value: 'SAR', label: 'ريال سعودي (ر.س)' }, { value: 'EGP', label: 'جنيه مصري (ج.م)' }] },
      { key: 'eos.months_per_year', label: 'مكافأة نهاية الخدمة', type: 'number', unit: 'شهر/سنة', min: 0 },
      { key: 'payroll.cycle_start_day', label: 'يوم بداية دورة المسير', type: 'number', unit: 'من الشهر', min: 1, max: 31, integer: true, hint: 'مسير سبتمبر بدورة 23 = من 23 أغسطس إلى 22 سبتمبر.' },
      { key: 'payroll.salary_evidence_mode', label: 'مصدر راتب شهر المسير', type: 'select', options: [
        { value: 'MONTHLY_HISTORY', label: 'السجل الشهري فقط — بلا راتب موثق للشهر يُستبعد الموظف بسبب ظاهر' },
        { value: 'MONTHLY_HISTORY_OR_CURRENT_FILE', label: 'انتقالي — من لا يملك سجلًا شهريًا يُحسب براتب الملف الحالي ويُوسم «غير موثق»' },
      ] },
      { key: 'payroll.monthly_days', label: 'أيام الشهر للمسير', type: 'number', unit: 'يوم', min: 30, max: 30, hint: 'D3: ثابتة على 30 يومًا.' },
      { key: 'payroll.daily_hours', label: 'ساعات العمل اليومية', type: 'number', unit: 'ساعة', min: 1, max: 24, hint: 'D2: أساس سعر الساعة والدقيقة.' },
      { key: 'payroll.hourly_rate_basis', label: 'أساس سعر الساعة', type: 'select', options: [{ value: 'DAILY_HOURS', label: 'سعر اليوم ÷ ساعات العمل اليومية' }], hint: 'D2' },
      { key: 'payroll.day_rate_basis', label: 'أساس سعر اليوم للغياب ونهاية الخدمة', type: 'select', options: [{ value: 'MONTHLY_FIXED_COMPONENTS_30', label: 'الأجر الشهري للمكونات الستة ÷ 30' }], hint: 'D3' },
      { key: 'payroll.policy.rounding_mode', label: 'تقريب مبالغ الرواتب', type: 'select', options: [
        { value: 'HALF_UP', label: 'نصف لأعلى' }, { value: 'HALF_EVEN', label: 'نصف للزوجي' }, { value: 'FLOOR', label: 'لأسفل' }, { value: 'CEIL', label: 'لأعلى' },
      ], hint: 'D4: نصف لأعلى بمنزلتين. يُنسخ إلى نسخ السياسات الجديدة.' },
      { key: 'payroll.policy.rounding_scale', label: 'منازل التقريب', type: 'number', min: 0, max: 6, integer: true },
    ],
  },
]

export default function PoliciesPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeviceKey, setShowDeviceKey] = useState(false)
  const calendar = useCalendarContext('GLOBAL', 0)
  const [calendarRefresh, setCalendarRefresh] = useState(0)
  useEffect(() => {
    if (!calendar.context || loading) return
    const value = calendar.context.current.weekendDays
    setValues(previous => ({ ...previous, [WEEKEND_KEY]: typeof value === 'string' ? value : '' }))
    setOriginal(previous => ({ ...previous, [WEEKEND_KEY]: typeof value === 'string' ? value : '' }))
  }, [calendar.context, loading])

  const load = async () => {
    try {
      const rows = await fetchConfig()
      const map: Record<string, string> = {}
      rows.forEach((r) => (map[r.key] = r.value))
      setValues(map)
      setOriginal(map)
      setKnown(new Set(rows.map((r) => r.key)))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل السياسات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (can('settings.manage')) load()
  }, [])

  const setVal = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSuccess('')
  }

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== original[k])
  const fieldByKey = new Map(
    GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f])
  )

  const handleSave = async () => {
    if (!can('settings.manage') || saving) return
    if (dirtyKeys.length === 0) return
    // تحقق الحقول الرقمية قبل الحفظ — قيمة فارغة/غير رقمية/أقل من الحد تُفسد
    // المحرك (المسير قسمة على صفر). نمنع الحفظ الجزئي بالتحقق أولاً
    for (const key of dirtyKeys) {
      const f = fieldByKey.get(key)
      if (f?.type === 'number') {
        if (f.nullable && (!values[key].trim() || values[key] === 'null')) continue
        const n = Number(values[key])
        const min = f.min ?? 0
        if (!values[key].trim() || !Number.isFinite(n) || n < min || (f.max != null && n > f.max) || (f.integer && !Number.isInteger(n))) {
          setError(
            `«${f.label}» يجب أن يكون رقماً${f.integer ? ' صحيحاً' : ''}${min > 0 ? ` لا يقل عن ${min}` : ' غير سالب'}${f.max != null ? ` ولا يزيد عن ${f.max}` : ''}`
          )
          setSuccess('')
          return
        }
      }
      if (key === DEVICE_KEY && deviceKeyWeak(values[key] ?? '')) {
        setError('مفتاح استقبال البصمات يجب ألا يقل عن 24 حرفاً وألا يطابق المفتاح الافتراضي، أو يُترك فارغاً لإيقاف الاستقبال.')
        setSuccess('')
        return
      }
      if (key === WEEKEND_KEY && !normalizeWeekend(values[key] ?? '')) {
        setError('«أيام نهاية الأسبوع» رموز أيام مفصولة بفاصلة مثل FRI,SAT — ولا تكون كل أيام الأسبوع')
        setSuccess('')
        return
      }
    }
    let calendarChange: PayrollCalendarChange | undefined
    if (dirtyKeys.includes(WEEKEND_KEY)) {
      if (!calendarScopeWritable('GLOBAL', 0)) { setError('تعديل التقويم العام يتطلب نطاقًا شاملًا.'); return }
      try { calendarChange = buildCalendarChange(calendar.context, calendar.evidence) }
      catch (cause) { setError((cause as Error).message); return }
    }
    setSaving(true)
    setError('')
    setSuccess('')
    // العطلة الأسبوعية تُحفظ مطبَّعة (fri, sat ← FRI,SAT) وتُعرض كما خُزّنت
    const toSave = { ...values }
    for (const key of dirtyKeys) if (fieldByKey.get(key)?.nullable && !toSave[key].trim()) toSave[key] = 'null'
    if (dirtyKeys.includes(WEEKEND_KEY)) {
      toSave[WEEKEND_KEY] = normalizeWeekend(values[WEEKEND_KEY] ?? '') ?? ''
    }
    try {
      for (const key of dirtyKeys) {
        await updateConfig(key, String(toSave[key]), key === WEEKEND_KEY ? calendarChange : undefined)
        setOriginal(previous => ({ ...previous, [key]: String(toSave[key]) }))
        if (key === 'system.currency') invalidateCurrency()
      }
      setValues(toSave)
      setOriginal(toSave)
      if (calendarChange) { calendar.reload(); setCalendarRefresh(value => value + 1) }
      setSuccess(`تم حفظ ${dirtyKeys.length} سياسة`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ السياسات')
    } finally {
      setSaving(false)
    }
  }

  const renderField = (f: PolicyField) => {
    const v = values[f.key] ?? ''
    if (f.type === 'secret') {
      return (
        <div className="w-full max-w-lg space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input aria-label={f.label} type={showDeviceKey ? 'text' : 'password'} className="input flex-1 min-w-48 font-mono" dir="ltr" autoComplete="new-password" value={v} onChange={(e) => setVal(f.key, e.target.value)} />
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowDeviceKey((shown) => !shown)}>{showDeviceKey ? 'إخفاء' : 'إظهار'}</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => {
              setVal(f.key, Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, '0')).join(''))
              setShowDeviceKey(true)
            }}>توليد مفتاح</button>
          </div>
          {deviceKeyWeak(v) && <p className="text-xs text-red-600">القيمة ضعيفة ولا يمكن حفظها. وجود مفتاح محفوظ ضعيف يوقف استقبال البصمات حتى تغييره.</p>}
          <p className="text-xs text-gray-500">انسخ المفتاح لإعداد الجهاز أو الوسيط قبل الحفظ. يُرسل في ترويسة x-device-key.</p>
        </div>
      )
    }
    if (f.type === 'bool') {
      const on = v === 'true'
      return (
        <button
          type="button"
          onClick={() => setVal(f.key, on ? 'false' : 'true')}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            on ? 'bg-primary-500' : 'bg-gray-300'
          }`}
          aria-pressed={on}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
              on ? 'right-0.5' : 'right-6'
            }`}
          />
        </button>
      )
    }
    if (f.type === 'select') {
      return (
        <select
          aria-label={f.label}
          className="input w-full max-w-xs"
          value={v}
          onChange={(e) => setVal(f.key, e.target.value)}
        >
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <input
          type={f.type === 'number' ? 'number' : 'text'}
          disabled={f.key === WEEKEND_KEY && (!calendar.context || calendar.context.currentMatchesHistory === false || !calendarScopeWritable('GLOBAL', 0))}
          min={f.type === 'number' ? (f.min ?? 0) : undefined}
          className="input w-full"
          aria-label={f.label}
          max={f.type === 'number' ? f.max : undefined}
          step={f.integer ? 1 : 'any'}
          value={f.nullable && v === 'null' ? '' : v}
          onChange={(e) => setVal(f.key, e.target.value)}
        />
        {f.unit && <span className="text-xs text-gray-400 whitespace-nowrap">{f.unit}</span>}
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">السياسات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سياسات الموارد البشرية</h1>
            <p className="text-gray-500 mt-1">
              القيم الفعلية لمحرك النظام — الإجازات والحضور والعمل الإضافي والمسير
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Info */}
        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
          <Info size={20} className="text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">إعدادات النظام العامة؛ تعديل أيام الراحة له تاريخ تطبيق مستقل</p>
            <p className="mt-1">
              الاستحقاق يُطبَّق على الأرصدة الجديدة، وسماحية التأخير والأوفرتايم على الحساب اللاحق.
              الرصيد الافتتاحي وأنواع الإجازة الخاصة تُدار لكل موظف/نوع على حدة.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {GROUPS.map((g) => {
              const fields = g.fields.filter((f) => known.has(f.key))
              if (fields.length === 0) return null
              const GroupIcon = g.icon
              return (
                <div key={g.title} className="card">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-11 h-11 ${g.iconBg} rounded-2xl flex items-center justify-center`}>
                      <GroupIcon size={22} className={g.iconColor} />
                    </div>
                    <h2 className="font-bold text-gray-800">{g.title}</h2>
                  </div>
                  {g.note && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                      {g.note}
                    </p>
                  )}
                  {g.title === 'الحضور والتأخير' && <GraceOverridesNote globalGrace={values['attendance.grace_minutes']} />}
                  {g.title === 'الحضور والتأخير' && <div className="space-y-3 mb-4">
                    <CalendarScopeConfirmation key={calendarRefresh} scope="GLOBAL" sourceId={0} canConfirm={can('settings.manage') && calendarScopeWritable('GLOBAL', 0)} disabled={saving || dirtyKeys.includes(WEEKEND_KEY)} onConfirmed={calendar.reload} />
                    {dirtyKeys.includes(WEEKEND_KEY) && <><CalendarContextSummary context={calendar.context} loading={calendar.loading} error={calendar.error} /><CalendarChangeFields context={calendar.context} value={calendar.evidence} onChange={calendar.setEvidence} disabled={saving} /></>}
                  </div>}
                  <div className="divide-y divide-gray-100">
                    {fields.map((f) => (
                      <div
                        key={f.key}
                        className="py-3 flex items-center justify-between gap-4 flex-wrap"
                      >
                        <div className="min-w-[200px]">
                          <p className="text-sm font-medium text-gray-800">{f.label}</p>
                          {f.hint && <p className="text-xs text-gray-400 mt-0.5">{f.hint}</p>}
                        </div>
                        {renderField(f)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* شريط الحفظ السفلي — يظهر عند وجود تغييرات */}
      {!loading && (dirtyKeys.length > 0 || success) && (
        <div className="fixed bottom-0 inset-x-0 md:pr-64 z-30">
          <div className="bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-between">
            {success ? (
              <span className="text-sm text-success-700 flex items-center gap-2">
                <CheckCircle2 size={18} />
                {success}
              </span>
            ) : (
              <span className="text-sm text-gray-500">
                {dirtyKeys.length} سياسة معدّلة بانتظار الحفظ
              </span>
            )}
            <div className="flex items-center gap-2">
              {dirtyKeys.length > 0 && (
                <button
                  onClick={() => {
                    setValues({ ...original })
                    setSuccess('')
                  }}
                  className="btn-secondary"
                  disabled={saving}
                >
                  تراجع
                </button>
              )}
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={saving || dirtyKeys.length === 0}
              >
                <Save size={18} />
                {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
