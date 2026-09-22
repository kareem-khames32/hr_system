'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
import { invalidateCurrency, useCurrency } from '@/lib/currency'
import {
  createLoanCapPolicy, createLoanCapPolicyVersion, fetchLoanCapPolicies, formatLoanMoney,
  type LoanCapPolicy, type LoanCapPolicyInput,
} from '@/lib/loans-api'
import { GraceOverridesNote } from '@/components/GraceOverridesNote'
import { fetchPayrollPolicies, type PayrollPolicySummary } from '@/lib/payroll-policies-api'
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
  perm?: string // صلاحية إضافية لتغيير الحقل فوق settings.manage (الخادم يرفض بدونها)
  readOnly?: boolean // قيمة ثابتة في المحرك: تُعرض للقراءة فقط
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
const CYCLE_KEY = 'payroll.cycle_start_day'
// سماحية التأخير العامة: كان مفيش مدخل ليها في أي شاشة (بتتغير من PATCH /settings/config بس)
// و«أيام العمل والدوام» بتعرضها للقراءة. حفظها بيضيف نسخة مؤرخة لكل تعريف دوام من تاريخ
// التغيير (applyGeneralGraceToAttendanceRules)، فالأيام الأقدم تفضل على نسختها بقيمتها القديمة.
const GRACE_KEY = 'attendance.grace_minutes'
const deviceKeyWeak = (value: string) => !!value.trim() && (value.trim() === 'zk-device-key-change-me' || value.trim().length < 24)
const WEEK_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const WEEK_DAY_NAMES: Record<string, string> = { SUN: 'الأحد', MON: 'الاثنين', TUE: 'الثلاثاء', WED: 'الأربعاء', THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت' }
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
    note: 'سماحية التأخير العامة تُضبط من هنا: التغيير يسري من يوم حفظه وما بعده، والأيام السابقة تبقى بسماحيتها القديمة ولا يُعاد حسابها. الوردية التي لها سماحية خاصة من شاشة «الورديات» تعلو على العامة.',
    fields: [
      // من يوم التغيير وما بعده فقط: الحفظ يضيف نسخة مؤرخة لكل تعريف دوام بتاريخ اليوم،
      // والأيام الأقدم تفضل على نسختها القديمة. سماحية الوردية (graceMinutes) تعلو على العامة.
      { key: GRACE_KEY, label: 'سماحية التأخير العامة', type: 'number', unit: 'دقيقة', min: 0, max: 1440, integer: true, hint: 'تسري من يوم التغيير وما بعده — الأيام السابقة لا يُعاد حسابها ولا تتغير خصوماتها. سماحية الوردية الخاصة تعلو عليها.' },
      { key: 'attendance.weekend_days', label: 'أيام نهاية الأسبوع', type: 'text', hint: 'اختر يوم الإجازة الأسبوعية أو أكثر (لا تُختار كل الأيام). يتجاوزها الفرع من شاشة «الفروع»' },
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
    note: 'تعديل مفاتيح المرونة يُثبت قيمها السابقة في تاريخ تعريف الدوام قبل الحفظ، فلا تتغير أيام سابقة. إذا كان خصم التأخير مقفولًا لا تُطرح دقائقه من النقص.',
    fields: [
      { key: 'payroll.early_leave_deduction_enabled', label: 'خصم الخروج المبكر على الوردية الثابتة', type: 'bool', hint: 'يُخصم بسعر الدقيقة بعد طرح التأخير والسماحية. الوردية المرنة يحكمها «خصم نقص ساعات العمل».' },
      { key: 'payroll.shortfall_enabled', label: 'خصم نقص ساعات العمل', type: 'bool', hint: 'الساعات المطلوبة ناقص ساعات العمل الفعلية بعد السماحية.' },
      { key: 'payroll.shortfall_mode', label: 'طريقة خصم النقص', type: 'select', options: [
        { value: 'MINUTES', label: 'بسعر الدقيقة' },
        { value: 'MULTIPLIER', label: 'بسعر الدقيقة × معامل' },
        { value: 'FRACTION', label: 'كسر يوم ثابت' },
      ] },
      { key: 'payroll.shortfall_value', label: 'قيمة طريقة النقص', type: 'number', min: 0, max: 1000, hint: 'بسعر الدقيقة = 1. في المعامل: المضاعف، وفي كسر اليوم: جزء اليوم (مثل 0.25).' },
      { key: 'attendance.flex.shortfall_grace_minutes', label: 'سماحية نقص الساعات', type: 'number', unit: 'دقيقة', min: 0, max: 1440, integer: true },
      // القرار أ4 (نيابة عن خط الحساب): لا سقف يومي للخصم ولا ترتيب تداخل — كل خصم يُخصم كما هو
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
      { key: 'overtime.default_window', label: 'نافذة الإضافي الافتراضية', type: 'select', options: [{ value: 'AFTER_SHIFT_END', label: 'بعد نهاية الوردية' }], hint: 'الكشف القائم يستمر بعد نهاية الوردية.' },
      { key: 'overtime.outside_window_policy', label: 'العمل خارج نوافذ الإضافي', type: 'select', options: [{ value: 'CLOSED', label: 'لا يُحتسب إضافيًا' }], hint: 'الحضور المبكر قبل الوردية يحكمه إعداد الإضافي المبكر في «أيام العمل والدوام».' },
    ],
  },
  {
    title: 'أقساط السلف وحماية الصافي',
    icon: Wallet,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    note: 'تُحفظ هذه الاختيارات مع حساب المسير. إعادة الحساب تحتفظ بها، إلا عند اختيار تحديث سياسة الأقساط.',
    fields: [
      { key: 'loan.insufficient_net_behavior', label: 'عندما لا يكفي المتاح للقسط', type: 'select', options: [
        { value: 'PARTIAL_THEN_CARRY', label: 'خصم المتاح وترحيل الباقي للشهر التالي' },
        { value: 'SKIP_AND_EXTEND', label: 'تأجيل القسط بالكامل ومد الجدول' },
      ] },
      // أيام طلب السلفة من الشهر؛ لو يوم البداية بعد يوم النهاية تمتد الفترة فوق نهاية الشهر
      { key: 'loan.request_from_day', label: 'طلب السلفة من يوم', type: 'number', unit: 'من الشهر', min: 1, max: 31, integer: true },
      { key: 'loan.request_to_day', label: 'إلى يوم', type: 'number', unit: 'من الشهر', min: 1, max: 31, integer: true, hint: 'لو يوم البداية بعد يوم النهاية (مثل 25 إلى 5) تمتد الفترة لأول الشهر التالي.' },
      // القرار ب2: مفتاح واحد يعلو الأيام — يقفل طلب السلفة الآن ويفتحه فورًا
      { key: 'loan.request_open', label: 'طلب السلفة مفتوح للموظفين', type: 'bool', hint: 'اقفله ليتوقف استقبال طلبات السلفة فورًا مهما كانت الأيام، وافتحه ليعمل بالأيام أعلاه.' },
      { key: 'payroll.policy.min_net_guarantee', label: 'الحد الأدنى للصافي', type: 'number', min: 0, nullable: true, hint: 'اتركه فارغًا إذا لم تحدد حدًا ثابتًا. لا يضيف النظام مبلغًا للراتب إذا كانت الخصومات السابقة تجاوزت الحد.' },
      { key: 'payroll.policy.net_floor_pct', label: 'الحد الأدنى كنسبة من الأجر الثابت المستحق', type: 'number', min: 0, max: 100, nullable: true, unit: '%', hint: 'إذا حددت مبلغًا ثابتًا أيضًا يُستخدم الأكبر منهما. فارغ = لا حد نسبي.' },
      { key: 'payroll.policy.max_deduction_pct_of_gross', label: 'سقف الخصومات من الأجر الثابت المستحق', type: 'number', min: 0, max: 100, nullable: true, unit: '%', hint: 'يحسب النظام ما استهلكته الخصومات السابقة قبل تحديد المتاح للسلف. فارغ = بلا سقف نسبي.' },
      { key: 'payroll.loan_catchup_max_overdue', label: 'أقصى أقساط متأخرة تُخصم في المسير', type: 'number', unit: 'قسط', min: 0, max: 120, integer: true, hint: 'إضافة إلى أقساط الشهر الحالي؛ الأقدم أولًا، والباقي يبقى مستحقًا للمسيرات التالية. صفر = أقساط الشهر الحالي فقط.' },
    ],
  },
  {
    title: 'المسير ونهاية الخدمة',
    icon: Wallet,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    note: 'الفلوس بتتحسب وبتظهر بمنزلتين من غير تقريب: 1234.567 تبقى 1234.56.',
    fields: [
      { key: 'system.currency', label: 'عملة النظام', type: 'select', options: [{ value: 'SAR', label: 'ريال سعودي (ر.س)' }, { value: 'EGP', label: 'جنيه مصري (ج.م)' }] },
      { key: 'system.country', label: 'دولة النظام', type: 'select', hint: 'العطلة الرسمية الجديدة بلا دولة صريحة تأخذ هذا الرمز.', options: [{ value: '', label: 'كل الدول' }, { value: 'SA', label: 'السعودية (SA)' }, { value: 'EG', label: 'مصر (EG)' }] },
      // صمام أمان التراكم اليومي: كان يُقرأ بقيمة احتياطية في الكود بلا مفتاح مبذور، فمكانش ينفع يتغير
      { key: 'payroll.daily_accrual_enabled', label: 'تراكم المسير اليومي', type: 'bool', hint: 'مفعّل: الجار الليلي يحسب أيام المسير المفتوح مقدمًا فالاعتماد يأخذ دقائق. اقفله ليُحسب كل يوم-موظف من الأول عند الاحتساب (نفس النتيجة، وقت أطول).' },
      { key: 'payroll.daily_accrual_hour', label: 'ساعة تشغيل التراكم اليومي', type: 'number', unit: 'الساعة', min: 0, max: 23, integer: true, hint: 'بعد تجسيد الغياب ومزامنة الأجهزة — الافتراضي الساعة 2 فجرًا.' },
      { key: 'eos.months_per_year', label: 'مكافأة نهاية الخدمة', type: 'number', unit: 'شهر/سنة', min: 0 },
      // قرار المالك (16 سبتمبر): فترة المسير «من يوم … إلى يوم …»؛ «إلى» مشتقة (اليوم السابق للبداية) وتُعرض للقراءة. العرض في PayrollPeriodSetting
      { key: CYCLE_KEY, label: 'فترة المسير', type: 'number', min: 1, max: 31, integer: true, hint: 'مسير سبتمبر من 23 = من 23 أغسطس إلى 22 سبتمبر.' },
      // الخطوة 22 / SRS PR-11 (B5): رخصة الشركة الصغيرة لفصل المهام
      { key: 'payroll.approval_self_approval_allowed', label: 'رخصة الشركة الصغيرة: يعتمد المسير من احتسبه', type: 'bool', perm: 'payroll.self_approval_licence', hint: 'الأصل مقفل: من احتسب نسخة المسير لا يعتمدها. فعّلها فقط لو لا يوجد مستخدم ثانٍ يحمل صلاحية الاعتماد. تغييرها يتطلب صلاحية «رخصة الشركة الصغيرة» التي يمنحها مدير النظام فقط (صلاحية الإعدادات وحدها لا تكفي)، وكل اعتماد بها يُسجل في سجل المسير.' },
      { key: 'payroll.salary_evidence_mode', label: 'مصدر راتب شهر المسير', type: 'select', options: [
        { value: 'MONTHLY_HISTORY', label: 'السجل الشهري فقط — بلا راتب موثق للشهر يُستبعد الموظف بسبب ظاهر' },
        { value: 'MONTHLY_HISTORY_OR_CURRENT_FILE', label: 'انتقالي — من لا يملك سجلًا شهريًا يُحسب براتب الملف الحالي ويُوسم «غير موثق»' },
      ] },
      { key: 'payroll.monthly_days', label: 'أيام الشهر للمسير', type: 'number', unit: 'يوم', min: 30, max: 30, readOnly: true, hint: 'ثابتة على 30 يومًا.' },
      { key: 'payroll.daily_hours', label: 'ساعات العمل اليومية', type: 'number', unit: 'ساعة', min: 1, max: 24, hint: 'أساس سعر الساعة والدقيقة.' },
      { key: 'payroll.hourly_rate_basis', label: 'أساس سعر الساعة', type: 'select', options: [{ value: 'DAILY_HOURS', label: 'سعر اليوم ÷ ساعات العمل اليومية' }], readOnly: true },
      { key: 'payroll.day_rate_basis', label: 'أساس سعر اليوم للغياب ونهاية الخدمة', type: 'select', options: [{ value: 'MONTHLY_FIXED_COMPONENTS_30', label: 'الأجر الشهري للمكونات الستة ÷ 30' }], readOnly: true },
      // قرار المالك (16 سبتمبر): لا اختيار تقريب — الفلوس بمنزلتين بالقص (src/lib/money.ts وapi/src/payroll/payroll-money.ts)
    ],
  },
]

// ===== القرار ب1: سقف السلفة في «سياسات النظام» =====
// ثلاثة مدخلات فقط: كام مرة في الشهر، والحد الأقصى (مبلغ ثابت أو نسبة من الراتب) وأساسه.
// النطاق دائمًا «الشركة كاملة» والتواريخ والنسخ والأولوية وسبب التعديل تُملأ تلقائيًا ولا تُعرض،
// والتخزين والمحرك وفحص السقف كما هما (نفس نقاط النهاية والجدول والنسخ المؤرخة).
const todayText = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

function LoanAdvanceCapBlock({ onSaveConfig, pendingConfigCount }: { onSaveConfig: () => Promise<void>; pendingConfigCount: number }) {
  const currency = useCurrency()
  const [policy, setPolicy] = useState<LoanCapPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [times, setTimes] = useState('')
  const [capKind, setCapKind] = useState<'FLAT' | 'PERCENT'>('FLAT')
  const [capValue, setCapValue] = useState('')
  const [salaryBase, setSalaryBase] = useState<'BASIC' | 'GROSS'>('GROSS')
  const canManage = can('loans.policies')

  const load = () => {
    setLoading(true); setError('')
    fetchLoanCapPolicies()
      .then(rows => {
        // سياسة الشركة السارية (أحدث نسخة نشطة بنطاق الشركة) — سياسات الفروع القديمة الموقوفة لا تُعرض ولا تُمس
        const company = rows.filter(row => row.scopeType === 'COMPANY' && row.isActive)
          .sort((a, b) => b.version - a.version || b.id - a.id)[0] ?? null
        setPolicy(company)
        setTimes(company?.maxRequestsPerMonth != null ? String(company.maxRequestsPerMonth) : '')
        const percent = company?.percentOfSalary ? Number(company.percentOfSalary) : null
        setCapKind(percent ? 'PERCENT' : 'FLAT')
        setCapValue(percent ? String(percent) : company?.flatCapAmount ?? '')
        setSalaryBase((company?.salaryBase as 'BASIC' | 'GROSS') ?? 'GROSS')
      })
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل سقف السلفة'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async () => {
    if (!canManage || busy) return
    const value = capValue.trim()
    if (value && !/^\d+(\.\d{1,4})?$/.test(value)) { setError('الحد الأقصى رقم موجب.'); return }
    if (times.trim() && !/^\d{1,4}$/.test(times.trim())) { setError('عدد المرات في الشهر عدد صحيح.'); return }
    if (!value && !times.trim()) { setError('اكتب حدًّا أقصى أو عدد مرات على الأقل.'); return }
    setBusy(true); setError(''); setSaved('')
    const input: LoanCapPolicyInput = {
      name: policy?.name ?? 'سقف السلفة',
      scopeType: 'COMPANY', scopeIds: null,
      percentOfSalary: capKind === 'PERCENT' ? value || null : null,
      salaryBase: capKind === 'PERCENT' && value ? salaryBase : null,
      flatCapAmount: capKind === 'FLAT' ? value || null : null,
      maxRequestsPerMonth: times.trim() || null,
      // المعروض هو الحاكم: سقوف المبالغ المخفية (سقف الشهر والرصيد القائم) تُمسح مع الحفظ،
      // فلا يبقى قيد لا يراه المالك يقضم الحد الذي كتبه. عدد شهور القسط شأن القرض لا السلفة فيبقى.
      maxAmountPerMonth: null,
      maxOutstandingBalance: null,
      maxInstallmentMonths: policy?.maxInstallmentMonths ?? null,
      monthDefinition: policy?.monthDefinition ?? 'PAYROLL_PERIOD',
      effectiveFrom: policy && policy.effectiveFrom > todayText() ? policy.effectiveFrom : todayText(),
      effectiveTo: null, priority: policy?.priority ?? 0,
      reason: 'تعديل سقف السلفة من سياسات النظام',
    }
    try {
      if (policy) await createLoanCapPolicyVersion(policy.id, input)
      else await createLoanCapPolicy(input)
      // زر واحد يحفظ كل ما غُيّر في الشاشة (ومنه مفتاح «طلب السلفة مفتوح») فلا يضيع تغيير
      // لأن المستخدم ضغط الزر الأقرب إليه بدل شريط الحفظ السفلي.
      if (pendingConfigCount > 0) await onSaveConfig()
      setSaved(pendingConfigCount > 0 ? `تم حفظ سقف السلفة و${pendingConfigCount} إعداد` : 'تم حفظ سقف السلفة')
      load()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ سقف السلفة') } finally { setBusy(false) }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3" data-testid="loan-advance-cap">
      <p className="text-sm font-medium text-gray-800">سقف السلفة للموظف</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {saved && <p role="status" className="text-sm text-success-700">{saved}</p>}
      {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-gray-700">كام مرة في الشهر
            <input className="input mt-1 w-32" dir="ltr" inputMode="numeric" disabled={!canManage} value={times}
              placeholder="بلا حد" onChange={e => { setTimes(e.target.value); setSaved('') }} />
          </label>
          <label className="text-sm text-gray-700">الحد الأقصى
            <select className="input mt-1 w-44" disabled={!canManage} value={capKind} onChange={e => { setCapKind(e.target.value as 'FLAT' | 'PERCENT'); setSaved('') }}>
              <option value="FLAT">مبلغ ثابت ({currency})</option>
              <option value="PERCENT">نسبة من الراتب %</option>
            </select>
          </label>
          <label className="text-sm text-gray-700">القيمة
            <input className="input mt-1 w-36" dir="ltr" inputMode="decimal" disabled={!canManage} value={capValue}
              placeholder="بلا حد" onChange={e => { setCapValue(e.target.value); setSaved('') }} />
          </label>
          {capKind === 'PERCENT' && (
            <label className="text-sm text-gray-700">النسبة من
              <select className="input mt-1 w-40" disabled={!canManage} value={salaryBase} onChange={e => { setSalaryBase(e.target.value as 'BASIC' | 'GROSS'); setSaved('') }}>
                <option value="GROSS">إجمالي الراتب</option>
                <option value="BASIC">الراتب الأساسي</option>
              </select>
            </label>
          )}
          {canManage && <button type="button" className="btn-secondary" disabled={busy} onClick={save}>
            {busy ? 'جارٍ الحفظ...' : pendingConfigCount > 0 ? `حفظ سقف السلفة و${pendingConfigCount} إعداد` : 'حفظ سقف السلفة'}</button>}
        </div>
      )}
      <p className="text-xs text-gray-400">
        {policy ? `الساري الآن: ${policy.percentOfSalary ? `${Number(policy.percentOfSalary)}% من ${policy.salaryBase === 'BASIC' ? 'الراتب الأساسي' : 'إجمالي الراتب'}` : policy.flatCapAmount ? `${formatLoanMoney(policy.flatCapAmount)} ${currency}` : 'بلا حد مبلغ'}`
          : 'لا يوجد سقف سلفة الآن — أي مبلغ يمر في الاعتماد.'}
      </p>
    </div>
  )
}

// ===== فترة المسير «من يوم … إلى يوم …» ومعاينة أثر تغييرها =====
// مرآة payrollPeriodBounds في api/src/payroll/payroll-period.ts: نهاية شهر M = (البداية − 1) مقصوصة على آخر M، وبدايته = نهاية M−1 + يوم.
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
type Ymd = { y: number; m: number; d: number }
const monthLastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const shiftMonth = (y: number, m: number, by: number): [number, number] => { const i = y * 12 + (m - 1) + by; return [Math.floor(i / 12), (i % 12) + 1] }
const cycleEndDay = (y: number, m: number, start: number) => start === 1 ? monthLastDay(y, m) : Math.min(start - 1, monthLastDay(y, m))
const utcDay = (date: Ymd) => Date.UTC(date.y, date.m - 1, date.d)
const addDay = (date: Ymd): Ymd => { const next = new Date(utcDay(date) + 86_400_000); return { y: next.getUTCFullYear(), m: next.getUTCMonth() + 1, d: next.getUTCDate() } }
const dayBefore = (date: Ymd): Ymd => { const prev = new Date(utcDay(date) - 86_400_000); return { y: prev.getUTCFullYear(), m: prev.getUTCMonth() + 1, d: prev.getUTCDate() } }
const daysInclusive = (from: Ymd, to: Ymd) => Math.round((utcDay(to) - utcDay(from)) / 86_400_000) + 1
const daysText = (count: number) => count === 1 ? 'يوم واحد' : count === 2 ? 'يومين' : count <= 10 ? `${count} أيام` : `${count} يوم`
const arDate = (date: Ymd) => `${date.d} ${AR_MONTHS[date.m - 1]} ${date.y}`
interface PayrollPeriodView { y: number; m: number; start: Ymd; end: Ymd }
function payrollPeriod(y: number, m: number, start: number): PayrollPeriodView {
  const end = { y, m, d: cycleEndDay(y, m, start) }
  if (start === 1) return { y, m, start: { y, m, d: 1 }, end }
  const [py, pm] = shiftMonth(y, m, -1), previousEnd = cycleEndDay(py, pm, start)
  return { y, m, start: previousEnd === monthLastDay(py, pm) ? { y, m, d: 1 } : { y: py, m: pm, d: previousEnd + 1 }, end }
}
function payrollPeriodOfToday(start: number): PayrollPeriodView {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1
  const [py, pm] = now.getDate() <= cycleEndDay(y, m, start) ? [y, m] : shiftMonth(y, m, 1)
  return payrollPeriod(py, pm, start)
}
const periodLine = (period: PayrollPeriodView) =>
  `مسير ${AR_MONTHS[period.m - 1]} ${period.y}: من ${arDate(period.start)} إلى ${arDate(period.end)} (${daysText(daysInclusive(period.start, period.end))})`
const validCycleDay = (text: string) => /^\d{1,2}$/.test(text.trim()) && Number(text) >= 1 && Number(text) <= 31

// دورة مجموعة المعادلات السارية اليوم (المسير المربوط بها يأخذ فترته منها لا من الإعداد العام)
function policyCycleLabel(summary: PayrollPolicySummary): { name: string; start: number | null; label: string } | null {
  if (!summary.policy.isActive) return null
  const today = todayText()
  const active = summary.versions.filter(version => version.status === 'ACTIVE').sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))
  const version = active.find(row => row.effectiveFrom <= today && (row.effectiveUntil == null || row.effectiveUntil >= today)) ?? active[0]
  if (!version) return null
  if (version.defaultPeriodType === 'SEMI_MONTHLY') return { name: summary.policy.name, start: null, label: 'نصف شهري' }
  const start = version.defaultPeriodType === 'CALENDAR_MONTH' ? 1 : Number(version.cycleStartDay)
  if (!Number.isInteger(start) || start < 1 || start > 31) return null
  return { name: summary.policy.name, start, label: start === 1 ? 'من يوم 1 إلى آخر الشهر' : `من يوم ${start} إلى يوم ${start - 1}` }
}

function PayrollPeriodSetting({ value, original, disabled, onChange }: { value: string; original: string; disabled: boolean; onChange: (value: string) => void }) {
  const [policies, setPolicies] = useState<PayrollPolicySummary[] | null>(null)
  useEffect(() => {
    if (!can('payroll.view')) return
    const controller = new AbortController()
    fetchPayrollPolicies(controller.signal).then(setPolicies).catch(() => setPolicies(null))
    return () => controller.abort()
  }, [])
  const valid = validCycleDay(value), start = Number(value)
  const changed = value.trim() !== original.trim() && valid && validCycleDay(original)
  const current = validCycleDay(original) ? payrollPeriodOfToday(Number(original)) : null
  const cycles = (policies ?? []).map(policyCycleLabel).filter((row): row is NonNullable<typeof row> => row !== null)
  const different = valid ? cycles.filter(row => row.start !== start) : []

  let preview: ReactNode = null
  if (changed && current) {
    // أول فترة بالإعداد الجديد = الشهر التالي لآخر فترة بالإعداد الحالي (الفترة الجارية اليوم)
    const [ny, nm] = shiftMonth(current.y, current.m, 1)
    const first = payrollPeriod(ny, nm, start), second = payrollPeriod(...shiftMonth(ny, nm, 1), start)
    const expectedStart = addDay(current.end), firstDays = daysInclusive(first.start, first.end)
    const usualDays = daysInclusive(payrollPeriod(ny, nm, Number(original)).start, payrollPeriod(ny, nm, Number(original)).end)
    const gap = utcDay(first.start) > utcDay(expectedStart), overlap = utcDay(first.start) < utcDay(expectedStart)
    preview = (
      <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 space-y-1" role="status" data-testid="payroll-period-preview">
        <p className="font-medium">أثر التغيير قبل الحفظ:</p>
        <p>• الفترتين الجايين: {periodLine(first)}، و{periodLine(second)}.</p>
        <p>• المسيرات المعتمدة والمصروفة مش بتتغير؛ تواريخها محفوظة جواها.</p>
        <p>• أول فترة بعد التغيير ({AR_MONTHS[first.m - 1]} {first.y}) طولها {firstDays} يوم{firstDays !== usualDays ? ` بدل ${usualDays} يوم بالإعداد الحالي` : ''}.</p>
        {gap && <p>• آخر فترة حالية بتخلص {arDate(current.end)}، فالأيام من {arDate(expectedStart)} إلى {arDate(dayBefore(first.start))} ({daysText(daysInclusive(expectedStart, dayBefore(first.start)))}) مش داخلة في أي فترة جاية: النظام مش بيطوّل أول فترة لوحده.</p>}
        {overlap && <p>• الأيام من {arDate(first.start)} إلى {arDate(current.end)} ({daysText(daysInclusive(first.start, current.end))}) داخلة في آخر فترة حالية وفي أول فترة جديدة: النظام مش بيقصّر أول فترة لوحده، واعتماد مسير عليها لموظف اتصرف له قبل كده هيتوقف.</p>}
      </div>
    )
  }

  return (
    <div className="w-full space-y-2" data-testid="payroll-period-setting">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <label className="flex items-center gap-2">من يوم
          <input type="number" aria-label="فترة المسير من يوم" className="input w-20" min={1} max={31} step={1} disabled={disabled} value={value} onChange={event => onChange(event.target.value)} />
        </label>
        <label className="flex items-center gap-2">إلى يوم
          <input type="text" aria-label="فترة المسير إلى يوم" className="input w-44 bg-gray-50" readOnly tabIndex={-1}
            value={!valid ? '' : start === 1 ? 'آخر الشهر نفسه' : `${start - 1} من الشهر اللي بعده`} />
        </label>
        <span className="text-xs text-gray-400">«إلى» بتتحسب لوحدها: اليوم اللي قبل البداية.</span>
      </div>
      {valid && start > 28 && <p className="text-xs text-gray-500">في الشهور القصيرة الفترة بتخلص آخر يوم في الشهر، واللي بعدها بتبدأ من اليوم اللي بعده.</p>}
      {current && !changed && <p className="text-xs text-gray-500">الفترة الجارية: {periodLine(current)}.</p>}
      {preview}
      <p className="text-xs text-gray-500">مين بيكسب: المسير المربوط بمجموعة معادلات بياخد تواريخه من دورة المجموعة نفسها. الإعداد ده بيحدد شهر السلف والخصومات والمكافآت والإضافي، ودورة أي مجموعة معادلات جديدة.</p>
      {policies && valid && (different.length
        ? <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">مجموعات معادلات دورتها مختلفة عن الإعداد ده (والمسير بيمشي على دورتها): {different.slice(0, 5).map(row => `«${row.name}» ${row.label}`).join('، ')}{different.length > 5 ? ` و${different.length - 5} غيرهم` : ''}. غيّرها من شاشة «معادلات الرواتب» علشان كله يمشي على نفس الفترة.</p>
        : cycles.length > 0 && <p className="text-xs text-success-700">كل مجموعات المعادلات النشطة ({cycles.length}) على نفس الفترة.</p>)}
    </div>
  )
}

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
          <p className="text-xs text-gray-500">انسخ المفتاح وضعه في إعداد جهاز البصمة أو الوسيط قبل الحفظ.</p>
        </div>
      )
    }
    if (f.type === 'bool') {
      const on = v === 'true'
      // حقل بصلاحية إضافية (رخصة الشركة الصغيرة): معروض للقراءة ومقفل لمن لا يحملها
      const locked = !!f.perm && !can(f.perm)
      return (
        <button
          type="button"
          onClick={() => { if (!locked) setVal(f.key, on ? 'false' : 'true') }}
          disabled={locked}
          title={locked ? 'يتطلب صلاحية مستقلة يمنحها مدير النظام فقط' : undefined}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            on ? 'bg-primary-500' : 'bg-gray-300'
          }${locked ? ' opacity-50 cursor-not-allowed' : ''}`}
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
          disabled={f.readOnly}
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
    if (f.key === CYCLE_KEY) {
      return <PayrollPeriodSetting value={v} original={original[f.key] ?? ''} disabled={saving || !!f.readOnly} onChange={(next) => setVal(f.key, next)} />
    }
    if (f.key === WEEKEND_KEY) {
      // أيام نهاية الأسبوع بأسمائها العربية؛ القيمة المحفوظة تبقى رموز الأيام مطبَّعة كما يقرؤها الخادم
      const chosen = new Set(v.toUpperCase().split(',').map((p) => p.trim()).filter(Boolean))
      const locked = !!f.readOnly || !calendar.context || calendar.context.currentMatchesHistory === false || !calendarScopeWritable('GLOBAL', 0)
      return (
        <div className="flex flex-wrap gap-2" role="group" aria-label={f.label}>
          {WEEK_CODES.map((code) => (
            <label key={code} className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-sm ${chosen.has(code) ? 'border-primary-300 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600'}`}>
              <input type="checkbox" disabled={locked} checked={chosen.has(code)} onChange={() => {
                const next = new Set(chosen)
                if (next.has(code)) next.delete(code); else next.add(code)
                setVal(f.key, WEEK_CODES.filter((day) => next.has(day)).join(','))
              }} />
              {WEEK_DAY_NAMES[code]}
            </label>
          ))}
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 max-w-xs">
        <input
          type={f.type === 'number' ? 'number' : 'text'}
          disabled={!!f.readOnly}
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
            <h1 className="text-2xl font-bold text-gray-800">سياسات النظام</h1>
            <p className="text-gray-500 mt-1">
              إعدادات الإجازات والحضور والعمل الإضافي والمسير
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
                  {g.title === 'الحضور والتأخير' && <GraceOverridesNote globalGrace={values[GRACE_KEY]} />}
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
                  {g.title === 'أقساط السلف وحماية الصافي' && <LoanAdvanceCapBlock onSaveConfig={handleSave} pendingConfigCount={dirtyKeys.length} />}
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
