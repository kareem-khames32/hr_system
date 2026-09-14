// قرارات المالك الافتراضية 14 سبتمبر 2026 (D1–D11) كإعدادات مبذورة ومتحقق منها.
// المرجع: PAYROLL_DECISIONS_2026-09-14.md (القسم 2). لا يستورد هذا الملف البذرة ولا الخدمات
// حتى لا تنشأ حلقة استيراد مع api/src/seed/requests-seed.data.ts.

export const PAYROLL_DECISION_KEYS = {
  // D1: الخروج المبكر على وردية ثابتة يُخصم بسعر الدقيقة (نقص الساعات بعد طرح التأخير).
  earlyLeaveDeductionEnabled: 'payroll.early_leave_deduction_enabled',
  // D2: سعر الساعة = سعر اليوم ÷ payroll.daily_hours (لا ساعات الوردية).
  hourlyRateBasis: 'payroll.hourly_rate_basis',
  // D3: سعر اليوم للغياب ونهاية الخدمة = الأجر الشهري للمكونات الستة الثابتة ÷ 30.
  dayRateBasis: 'payroll.day_rate_basis',
  // D10: أقصى عدد أقساط متأخرة تُخصم في مسير واحد إضافة إلى أقساط الشهر الحالي.
  loanCatchUpMaxOverdue: 'payroll.loan_catchup_max_overdue',
  // D11: نافذة الإضافي الافتراضية وسياسة ما خارج النوافذ (SRS LOT-14 مغلق).
  overtimeDefaultWindow: 'overtime.default_window',
  overtimeOutsideWindowPolicy: 'overtime.outside_window_policy',
} as const

export const PAYROLL_DECISION_CONFIG_SEED: Array<{ key: string; value: string }> = [
  { key: PAYROLL_DECISION_KEYS.earlyLeaveDeductionEnabled, value: 'true' },
  { key: PAYROLL_DECISION_KEYS.hourlyRateBasis, value: 'DAILY_HOURS' },
  { key: PAYROLL_DECISION_KEYS.dayRateBasis, value: 'MONTHLY_FIXED_COMPONENTS_30' },
  { key: PAYROLL_DECISION_KEYS.loanCatchUpMaxOverdue, value: '1' },
  { key: PAYROLL_DECISION_KEYS.overtimeDefaultWindow, value: 'AFTER_SHIFT_END' },
  { key: PAYROLL_DECISION_KEYS.overtimeOutsideWindowPolicy, value: 'CLOSED' },
]

// D5: قيم المواصفة المختارة للمفاتيح المبذورة سابقًا في configSeed (للتوثيق والاختبار؛ لا تُكتب فوق قيمة قائمة).
export const PAYROLL_D5_CHOSEN_VALUES: Readonly<Record<string, string>> = {
  'payroll.shortfall_enabled': 'true',
  'payroll.shortfall_mode': 'MINUTES',
  'payroll.shortfall_value': '1',
  'payroll.attendance_overlap_policy': 'NET_OF_LATENESS',
  'payroll.attendance_daily_cap_days': '1',
  'attendance.flex.shortfall_grace_minutes': '10',
}

export const PAYROLL_LOAN_CATCH_UP_LIMIT_MAX = 120

// قيم مغلقة: القيمة الوحيدة المنفذة هي المسموحة؛ لا نقبل خيارًا لا يوجد له حساب فعلي.
const CLOSED_VALUES: Readonly<Record<string, readonly string[]>> = {
  'payroll.monthly_days': ['30'],
  [PAYROLL_DECISION_KEYS.earlyLeaveDeductionEnabled]: ['true', 'false'],
  [PAYROLL_DECISION_KEYS.hourlyRateBasis]: ['DAILY_HOURS'],
  [PAYROLL_DECISION_KEYS.dayRateBasis]: ['MONTHLY_FIXED_COMPONENTS_30'],
  [PAYROLL_DECISION_KEYS.overtimeDefaultWindow]: ['AFTER_SHIFT_END'],
  [PAYROLL_DECISION_KEYS.overtimeOutsideWindowPolicy]: ['CLOSED'],
  'system.currency': ['SAR', 'EGP'],
}

const decimal = (value: string, scale: number) => new RegExp(`^(?:0|[1-9]\\d{0,5})(?:\\.\\d{1,${scale}})?$`).test(value)
const integer = (value: string) => /^(?:0|[1-9]\d{0,5})$/.test(value)

/** تحقق PATCH /settings/config لمفاتيح قرارات الرواتب؛ undefined = صالحة أو المفتاح ليس منها. */
export function payrollDecisionConfigError(key: string, value: unknown): string | undefined {
  const closed = CLOSED_VALUES[key]
  const tracked = closed || ['payroll.daily_hours', 'payroll.cycle_start_day', PAYROLL_DECISION_KEYS.loanCatchUpMaxOverdue,
    'payroll.attendance_daily_cap_days', 'payroll.shortfall_value'].includes(key)
  if (!tracked) return
  if (typeof value !== 'string') return `قيمة «${key}» نص مطلوب`
  if (closed && !closed.includes(value)) {
    if (key === 'payroll.monthly_days') return 'أيام الشهر للمسير ثابتة على 30 يومًا (أساس FIXED_30 وقرار D3)؛ لا تُقبل قيمة أخرى'
    return `قيمة «${key}» يجب أن تكون واحدة من: ${closed.join('، ')}`
  }
  const number = Number(value)
  switch (key) {
    case 'payroll.daily_hours':
      if (!decimal(value, 2) || number <= 0 || number > 24) return 'ساعات العمل اليومية (أساس سعر الساعة D2) رقم أكبر من صفر حتى 24 بمنزلتين عشريتين على الأكثر'
      break
    case 'payroll.cycle_start_day':
      if (!integer(value) || number < 1 || number > 31) return 'يوم بداية دورة المسير عدد صحيح من 1 إلى 31'
      break
    case PAYROLL_DECISION_KEYS.loanCatchUpMaxOverdue:
      if (!integer(value) || number > PAYROLL_LOAN_CATCH_UP_LIMIT_MAX) return `حد لحاق الأقساط المتأخرة (D10) عدد صحيح من 0 إلى ${PAYROLL_LOAN_CATCH_UP_LIMIT_MAX} قسطًا لكل مسير`
      break
    case 'payroll.attendance_daily_cap_days':
      if (!decimal(value, 2) || number > 31) return 'سقف خصم الحضور اليومي بالأيام رقم من 0 إلى 31 بمنزلتين عشريتين على الأكثر'
      break
    case 'payroll.shortfall_value':
      if (!decimal(value, 4) || number > 1000) return 'قيمة خصم نقص الساعات رقم من 0 إلى 1000 بأربع منازل عشرية على الأكثر'
      break
  }
}

/** قراءة حد لحاق الأقساط من نص الإعداد؛ القيمة الفاسدة ترفض ولا تتحول إلى «بلا حد». */
export function parsePayrollLoanCatchUpLimit(value: unknown): number {
  if (typeof value !== 'string') throw new Error('MISSING')
  const error = payrollDecisionConfigError(PAYROLL_DECISION_KEYS.loanCatchUpMaxOverdue, value)
  if (error) throw new Error(error)
  return Number(value)
}
