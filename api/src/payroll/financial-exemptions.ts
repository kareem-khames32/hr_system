import { BadRequestException } from '@nestjs/common'
import { PayrollDecimal } from './payroll-decimal'
import { roundPayrollMoney } from './payroll-money'

// قواعد الإعفاء المالي النقية (الخطوة 26 — SRS EX-01..08، بلا قاعدة بيانات):
// النطاق (كل الخصومات القابلة / نوع / قيد واحد)، مصير الخصم (إسقاط أو تأجيل)، ما لا يقبل الإعفاء، تداخل الإعفاءات،
// التطبيق على مبالغ الحضور وقيود الدفتر قبل حماية الصافي، وأقساط السلف المؤجلة من خطة الأقساط. المال بمنزلتين نصف لأعلى (D4).
export const FINANCIAL_EXEMPTION_VERSION = 'EX_FINANCIAL_EXEMPTION_V1_20260915' as const

export const EXEMPTION_SCOPE_KINDS = ['ALL_DEDUCTIONS', 'DEDUCTION_TYPE', 'SINGLE_ENTRY'] as const
export type ExemptionScopeKind = typeof EXEMPTION_SCOPE_KINDS[number]
// الأنواع الآلية المحجوزة (EX-02 قاعدة 2) + نوع مصنف من الكتالوج
export const EXEMPTION_TYPE_TARGETS = ['LATENESS', 'SHORTFALL', 'ABSENCE', 'ADVANCE_INSTALLMENT', 'TYPED'] as const
export type ExemptionTypeTarget = typeof EXEMPTION_TYPE_TARGETS[number]
// قيد واحد (EX-02 قاعدة 3): يوم حضور محدد بنوع الواقعة، أو قسط خصم مصنف، أو قسط سلفة
export const EXEMPTION_ENTRY_TARGETS = ['LATENESS_DAY', 'SHORTFALL_DAY', 'ABSENCE_DAY', 'OBLIGATION', 'LOAN_INSTALLMENT'] as const
export type ExemptionEntryTarget = typeof EXEMPTION_ENTRY_TARGETS[number]
export const EXEMPTION_DISPOSITIONS = ['DROP', 'DEFER_ONE_PERIOD'] as const
export type ExemptionDisposition = typeof EXEMPTION_DISPOSITIONS[number]
export const EXEMPTION_STATUSES = ['PENDING_APPROVAL', 'ACTIVE', 'APPLIED', 'REJECTED', 'REVOKED', 'EXPIRED', 'SUPERSEDED'] as const
export type ExemptionStatus = typeof EXEMPTION_STATUSES[number]
// الحالات التي تحجز الهدف (لا يستهدف إعفاءان حيّان القيد نفسه — EX-02 قاعدة 6)
export const EXEMPTION_LIVE_STATUSES: readonly ExemptionStatus[] = ['PENDING_APPROVAL', 'ACTIVE']
export const EXEMPTION_GRANTOR_BASES = ['HR', 'DEPARTMENT_MANAGER', 'FUNCTION_OWNER'] as const
export type ExemptionGrantorBasis = typeof EXEMPTION_GRANTOR_BASES[number]
export type ExemptionComponent = 'LATENESS' | 'SHORTFALL' | 'ABSENCE' | 'TYPED' | 'LOAN'
// التصنيفات المحمية: لا إعفاء عليها أبدًا حتى في «كل الخصومات» (EX-01 قاعدة 5، EX-07)
export const EXEMPTION_PROTECTED_TYPED_CATEGORIES = ['STATUTORY', 'COURT_ORDER']

export const EXEMPTION_LABELS = {
  scopes: { ALL_DEDUCTIONS: 'كل الخصومات القابلة للإعفاء', DEDUCTION_TYPE: 'نوع خصم', SINGLE_ENTRY: 'قيد واحد' } as Record<ExemptionScopeKind, string>,
  typeTargets: { LATENESS: 'كل خصم التأخير', SHORTFALL: 'كل خصم نقص ساعات العمل', ABSENCE: 'كل خصم الغياب', ADVANCE_INSTALLMENT: 'كل أقساط السلف (تأجيل)', TYPED: 'نوع خصم مصنف' } as Record<ExemptionTypeTarget, string>,
  entryTargets: { LATENESS_DAY: 'تأخير يوم', SHORTFALL_DAY: 'نقص ساعات يوم', ABSENCE_DAY: 'غياب يوم', OBLIGATION: 'قسط خصم مصنف', LOAN_INSTALLMENT: 'قسط سلفة (تأجيل)' } as Record<ExemptionEntryTarget, string>,
  components: { LATENESS: 'خصم التأخير', SHORTFALL: 'خصم نقص ساعات العمل', ABSENCE: 'خصم الغياب', TYPED: 'خصم مصنف', LOAN: 'قسط سلفة' } as Record<ExemptionComponent, string>,
  dispositions: { DROP: 'إسقاط نهائي', DEFER_ONE_PERIOD: 'تأجيل للشهر التالي' } as Record<ExemptionDisposition, string>,
  statuses: { PENDING_APPROVAL: 'بانتظار اعتماد الموارد البشرية', ACTIVE: 'نشط — يُطبق عند حساب المسير', APPLIED: 'مطبق في مسير معتمد', REJECTED: 'مرفوض',
    REVOKED: 'ملغى قبل اعتماد المسير', EXPIRED: 'منتهٍ دون تطبيق', SUPERSEDED: 'محتوى في إعفاء أشمل' } as Record<ExemptionStatus, string>,
  bases: { HR: 'الموارد البشرية', DEPARTMENT_MANAGER: 'مدير القسم', FUNCTION_OWNER: 'مدير الجهة المالكة للخصم' } as Record<ExemptionGrantorBasis, string>,
}

const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => {
  throw new BadRequestException({ code, message, ...details })
}
const money = (value: number) => roundPayrollMoney(value).toFixed(2)
const cents = (value: number) => Math.round(roundPayrollMoney(value) * 100)
const fromCents = (value: number) => (value / 100).toFixed(2)

// ===== الإعدادات (EX-03/06/07): حدود واحدة يقرؤها الخادم ويتحقق بها PATCH /settings/config =====
export const EXEMPTION_NUMERIC_SETTINGS: Record<string, { min: number; max: number; fallback: number; label: string }> = {
  'financial_exemptions.reason_min_length': { min: 1, max: 1000, fallback: 20, label: 'أقل طول لسبب الإعفاء المالي' },
  // تبسيط الرواتب (2026-09-15): الحد الأعلى 366 بدل 31 — خصم الغياب بمعامل عقوبة (1.5 أو 2 يوم) قد يتجاوز راتب شهر،
  // فكان «إلغاء خصم» من شاشة المسير يُرفض بطلب مرفق حتى مع أعلى قيمة. الإعداد نفسه وقيمته الافتراضية بلا تغيير.
  'financial_exemptions.attachment_threshold_days': { min: 0, max: 366, fallback: 1, label: 'سقف المبلغ المُعفى بلا مرفق بأيام الراتب (0 = المرفق إلزامي دائمًا)' },
  'financial_exemptions.max_per_employee_year': { min: 0, max: 100, fallback: 4, label: 'أقصى إعفاءات للموظف خلال 12 شهرًا قبل طلب تجاوز موثق (0 = بلا حد)' },
  'financial_exemptions.max_pct_per_grantor': { min: 0, max: 100, fallback: 20, label: 'نسبة المُعفى للمانح من خصومات المسير قبل تحويل الإعفاء لاعتماد (0 = بلا حد)' },
  'financial_exemptions.cooldown_hours': { min: 0, max: 720, fallback: 24, label: 'فترة التهدئة بعد اعتماد الخصم المصنف بالساعات (0 = بلا تهدئة)' },
  'financial_exemptions.repeat_alert_count': { min: 1, max: 99, fallback: 3, label: 'عدد إعفاءات الموظف خلال 6 أشهر لوسم التكرار في التقرير' },
  'financial_exemptions.type_drain_alert_pct': { min: 1, max: 100, fallback: 30, label: 'نسبة تفريغ نوع الخصم بالإعفاء للتنبيه في التقرير' },
}
export const EXEMPTION_ENUM_SETTINGS: Record<string, { values: readonly string[]; fallback: string }> = {
  // مدير القسم يمنح إعفاء خصومات الحضور لقسمه بسقف ويمر باعتماد الموارد البشرية (EX-03)
  'financial_exemptions.department_manager_enabled': { values: ['true', 'false'], fallback: 'true' },
}
export const EXEMPTION_SETTING_KEYS = [...Object.keys(EXEMPTION_NUMERIC_SETTINGS), ...Object.keys(EXEMPTION_ENUM_SETTINGS)]
export const EXEMPTION_CONFIG_SEED: Array<{ key: string; value: string }> = [
  ...Object.entries(EXEMPTION_NUMERIC_SETTINGS).map(([key, rule]) => ({ key, value: String(rule.fallback) })),
  ...Object.entries(EXEMPTION_ENUM_SETTINGS).map(([key, rule]) => ({ key, value: rule.fallback })),
]
export function exemptionNumericSetting(key: string, raw: string | null | undefined): number {
  const rule = EXEMPTION_NUMERIC_SETTINGS[key]
  if (!rule) throw new Error(`إعداد إعفاء غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!/^-?\d+$/.test(text)) return rule.fallback
  return Math.min(rule.max, Math.max(rule.min, Number(text)))
}
export function exemptionEnumSetting(key: string, raw: string | null | undefined): string {
  const rule = EXEMPTION_ENUM_SETTINGS[key]
  if (!rule) throw new Error(`إعداد إعفاء غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  return rule.values.includes(text) ? text : rule.fallback
}
/** تحقق PATCH /settings/config لمفاتيح financial_exemptions.*؛ null = صالح أو مفتاح آخر. */
export function exemptionSettingError(key: string, value: string): string | null {
  const numeric = EXEMPTION_NUMERIC_SETTINGS[key]
  if (numeric) {
    const text = String(value ?? '').trim()
    return /^\d+$/.test(text) && Number(text) >= numeric.min && Number(text) <= numeric.max ? null : `${numeric.label}: عدد صحيح من ${numeric.min} إلى ${numeric.max}`
  }
  const choice = EXEMPTION_ENUM_SETTINGS[key]
  if (choice) return choice.values.includes(String(value ?? '').trim()) ? null : `القيم المسموحة لـ«${key}»: ${choice.values.join('، ')}`
  return null
}

// ===== الهدف والمصير والسبب =====
export interface ExemptionTarget {
  scopeKind: ExemptionScopeKind
  targetKind: ExemptionTypeTarget | ExemptionEntryTarget | null
  deductionTypeId: number | null
  targetRef: string | null
}
export interface ExemptionRule extends ExemptionTarget { id: number; revision: number; disposition: ExemptionDisposition }

const positiveInt = (value: unknown) => {
  const number = typeof value === 'string' && /^\d{1,10}$/.test(value.trim()) ? Number(value) : value
  return Number.isSafeInteger(number) && Number(number) > 0 ? Number(number) : null
}
const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value

/** نطاق الإعفاء وهدفه بصيغة واحدة (EX-02)؛ الحقول الزائدة عن النطاق تُرفض لا تُتجاهل. */
export function normalizeExemptionTarget(input: { scopeKind?: unknown; targetKind?: unknown; deductionTypeId?: unknown; targetRef?: unknown }): ExemptionTarget {
  const scopeKind = input.scopeKind as ExemptionScopeKind
  if (!EXEMPTION_SCOPE_KINDS.includes(scopeKind)) fail('EXEMPTION_TARGET_INVALID', 'نطاق الإعفاء: كل الخصومات القابلة، أو نوع خصم، أو قيد واحد')
  const given = (value: unknown) => value !== undefined && value !== null && value !== ''
  if (scopeKind === 'ALL_DEDUCTIONS') {
    if (given(input.targetKind) || given(input.deductionTypeId) || given(input.targetRef)) fail('EXEMPTION_TARGET_INVALID', 'إعفاء كل الخصومات لا يحدد نوعًا ولا قيدًا')
    return { scopeKind, targetKind: null, deductionTypeId: null, targetRef: null }
  }
  if (scopeKind === 'DEDUCTION_TYPE') {
    const targetKind = input.targetKind as ExemptionTypeTarget
    if (!EXEMPTION_TYPE_TARGETS.includes(targetKind)) fail('EXEMPTION_TARGET_INVALID', 'اختر نوع الخصم: التأخير أو النقص أو الغياب أو أقساط السلف أو نوعًا مصنفًا')
    if (given(input.targetRef)) fail('EXEMPTION_TARGET_INVALID', 'إعفاء نوع الخصم لا يحدد قيدًا بعينه')
    if (targetKind === 'TYPED') {
      const typeId = positiveInt(input.deductionTypeId)
      if (!typeId) fail('EXEMPTION_TARGET_INVALID', 'اختر نوع الخصم المصنف من الكتالوج')
      return { scopeKind, targetKind, deductionTypeId: typeId, targetRef: null }
    }
    if (given(input.deductionTypeId)) fail('EXEMPTION_TARGET_INVALID', 'نوع الخصم الآلي لا يحمل نوعًا من الكتالوج')
    return { scopeKind, targetKind, deductionTypeId: null, targetRef: null }
  }
  const targetKind = input.targetKind as ExemptionEntryTarget
  if (!EXEMPTION_ENTRY_TARGETS.includes(targetKind)) fail('EXEMPTION_TARGET_INVALID', 'اختر القيد: يوم تأخير أو نقص أو غياب، أو قسط خصم مصنف، أو قسط سلفة')
  if (given(input.deductionTypeId)) fail('EXEMPTION_TARGET_INVALID', 'إعفاء القيد الواحد يحدد القيد لا النوع')
  const ref = typeof input.targetRef === 'number' ? String(input.targetRef) : typeof input.targetRef === 'string' ? input.targetRef.trim() : ''
  if (targetKind.endsWith('_DAY')) {
    if (!validDate(ref)) fail('EXEMPTION_TARGET_INVALID', 'تاريخ اليوم المستهدف بصيغة YYYY-MM-DD مطلوب')
    return { scopeKind, targetKind, deductionTypeId: null, targetRef: ref }
  }
  const id = positiveInt(ref)
  if (!id) fail('EXEMPTION_TARGET_INVALID', 'رقم القيد أو القسط المستهدف مطلوب')
  return { scopeKind, targetKind, deductionTypeId: null, targetRef: String(id) }
}

/** البند الذي يمسه الهدف؛ null = كل الخصومات. */
export function exemptionComponentOf(target: Pick<ExemptionTarget, 'scopeKind' | 'targetKind'>): ExemptionComponent | null {
  switch (target.targetKind) {
    case 'LATENESS': case 'LATENESS_DAY': return 'LATENESS'
    case 'SHORTFALL': case 'SHORTFALL_DAY': return 'SHORTFALL'
    case 'ABSENCE': case 'ABSENCE_DAY': return 'ABSENCE'
    case 'ADVANCE_INSTALLMENT': case 'LOAN_INSTALLMENT': return 'LOAN'
    case 'TYPED': case 'OBLIGATION': return 'TYPED'
    default: return null
  }
}
export const isAttendanceComponent = (component: ExemptionComponent | null) => component === 'LATENESS' || component === 'SHORTFALL' || component === 'ABSENCE'

/**
 * مصير الخصم المُعفى (EX-08 قاعدة 1/2، EX-02 قاعدة 4): خصومات الحضور الآلية إسقاط فقط لأنها مشتقة من فترة بعينها،
 * أقساط السلف تُؤجل دائمًا مهما كان الخيار (السلفة دين)، والخصم المصنف إسقاط (افتراضي) أو تأجيل لشهر واحد.
 * في «كل الخصومات» الخيار يخص المصنفة، والحضور يسقط، والأقساط تُؤجل.
 */
export function normalizeExemptionDisposition(target: ExemptionTarget, disposition: unknown): { disposition: ExemptionDisposition; forcedLoanDeferral: boolean } {
  const component = exemptionComponentOf(target)
  const chosen = disposition === undefined || disposition === null || disposition === '' ? null : disposition as ExemptionDisposition
  if (chosen !== null && !EXEMPTION_DISPOSITIONS.includes(chosen)) fail('EXEMPTION_DISPOSITION_INVALID', 'مصير الخصم: إسقاط نهائي أو تأجيل للشهر التالي')
  if (isAttendanceComponent(component)) {
    if (chosen === 'DEFER_ONE_PERIOD') fail('EXEMPTION_ATTENDANCE_NO_DEFER', 'خصومات الحضور لا تقبل التأجيل لأنها مشتقة من فترة المسير نفسها: إما إسقاط وإما لا إعفاء')
    return { disposition: 'DROP', forcedLoanDeferral: false }
  }
  if (component === 'LOAN') return { disposition: 'DEFER_ONE_PERIOD', forcedLoanDeferral: true }
  return { disposition: chosen ?? 'DROP', forcedLoanDeferral: component === null }
}

/** EX-03 قاعدة 4: السبب بطول أدنى وثلاث كلمات مميزة على الأقل (لا تكرار حرف أو كلمة لبلوغ الحد). */
export function exemptionReasonIssue(reason: unknown, minLength: number): { code: string; message: string } | null {
  const text = typeof reason === 'string' ? reason.trim() : ''
  if (text.length < minLength) return { code: 'EXEMPTION_REASON_TOO_SHORT', message: `سبب الإعفاء لا يقل عن ${minLength} حرفًا` }
  if (text.length > 1000) return { code: 'EXEMPTION_REASON_TOO_LONG', message: 'سبب الإعفاء لا يتجاوز 1000 حرف' }
  const words = new Set(text.split(/[\s،,.;:!?؟\-–—()«»"']+/u).map(word => word.replace(/[ً-ْـ]/gu, '')).filter(word => word.length >= 2))
  if (words.size < 3) return { code: 'EXEMPTION_REASON_REPETITIVE', message: 'اكتب سببًا حقيقيًا بثلاث كلمات مختلفة على الأقل؛ تكرار الكلمة أو الحرف لا يُقبل' }
  return null
}

// ===== التداخل (EX-02 قاعدة 5/6) =====
export interface ExemptionOverlapResult {
  containedBy: number | null
  overlapsWith: number | null
  supersedes: number[]
}
/**
 * «كل الخصومات» الحي يحتوي أي إعفاء أضيق فيُرفض الأضيق؛ طلب «كل الخصومات» يُقبل ويُعلّم الأضيق SUPERSEDED.
 * لا يستهدف إعفاءان حيّان القيد نفسه: نوع مقابل نوع مماثل، أو نوع مقابل قيد داخله، أو القيد نفسه مرتين.
 * typeOfObligation يعيد نوع الخصم المصنف لقيد الدفتر (لمقارنة «نوع مصنف» مع «قسط منه»).
 */
export function exemptionOverlap(candidate: ExemptionTarget, existing: Array<ExemptionTarget & { id: number }>, typeOfObligation: (obligationId: number) => number | null): ExemptionOverlapResult {
  const all = existing.find(row => row.scopeKind === 'ALL_DEDUCTIONS')
  if (candidate.scopeKind === 'ALL_DEDUCTIONS') {
    if (all) return { containedBy: all.id, overlapsWith: null, supersedes: [] }
    return { containedBy: null, overlapsWith: null, supersedes: existing.map(row => row.id).sort((a, b) => a - b) }
  }
  if (all) return { containedBy: all.id, overlapsWith: null, supersedes: [] }
  const dayOf: Record<string, string> = { LATENESS: 'LATENESS_DAY', SHORTFALL: 'SHORTFALL_DAY', ABSENCE: 'ABSENCE_DAY', ADVANCE_INSTALLMENT: 'LOAN_INSTALLMENT' }
  const clash = (a: ExemptionTarget, b: ExemptionTarget) => {
    if (a.scopeKind === b.scopeKind && a.targetKind === b.targetKind && a.deductionTypeId === b.deductionTypeId && a.targetRef === b.targetRef) return true
    const [type, entry] = a.scopeKind === 'DEDUCTION_TYPE' && b.scopeKind === 'SINGLE_ENTRY' ? [a, b] : b.scopeKind === 'DEDUCTION_TYPE' && a.scopeKind === 'SINGLE_ENTRY' ? [b, a] : [null, null]
    if (!type || !entry) return false
    if (type.targetKind === 'TYPED') return entry.targetKind === 'OBLIGATION' && typeOfObligation(Number(entry.targetRef)) === type.deductionTypeId
    return dayOf[type.targetKind ?? ''] === entry.targetKind
  }
  const other = existing.find(row => clash(candidate, row))
  return { containedBy: null, overlapsWith: other?.id ?? null, supersedes: [] }
}

// ===== التطبيق عند الحساب (EX-01 قاعدة 2، EX-04) =====
export interface ExemptionLine {
  exemptionId: number
  component: ExemptionComponent
  // تاريخ اليوم أو رقم القيد أو رقم القسط؛ null = البند كله
  ref: string | null
  label: string
  originalAmount: string
  exemptedAmount: string
  afterAmount: string
  disposition: ExemptionDisposition
  note?: string
}
export interface ExemptionProtectedItem { component: 'TYPED' | 'RECOVERY' | 'UNPAID_LEAVE'; ref: string | null; label: string; amount: string; reason: string }
export interface ExemptionDebitInput {
  id: number
  amount: number
  deductionRequestId: number | null
  deductionTypeId?: number | null
  typedCategory?: string | null
  isExemptable?: boolean | null
  typeName?: string | null
  label?: string | null
}
export interface ExemptedObligation { obligationId: number; exemptionId: number; disposition: ExemptionDisposition; amount: string; deductionRequestId: number | null }
export interface ExemptionLoanScope { allExemptionId: number | null; entries: Array<{ installmentId: number; exemptionId: number }> }
export interface ExemptionInstallmentDeferral { installmentId: number; loanId: number; exemptionId: number; dueDate: string; remainingAmount: string; financialRevision: number }

export interface ExemptionApplicationInput<T extends ExemptionDebitInput> {
  rules: ExemptionRule[]
  attendance: {
    // مبلغ كل يوم قبل حماية الصافي كما حسبه المسير (التأخير = الشريحة + دقائق الإذن بخصم)
    days: Array<{ date: string; lateness: number; shortfall: number }>
    absentDates: string[]
    absenceDayAmount: number
    requested: { lateness: number; shortfall: number; absence: number }
  }
  debits: T[]
  unpaidLeave: number
}

const byPrecedence = (rules: ExemptionRule[]) => ({
  all: rules.find(rule => rule.scopeKind === 'ALL_DEDUCTIONS') ?? null,
  type: (kind: ExemptionTypeTarget, typeId: number | null = null) => rules.find(rule => rule.scopeKind === 'DEDUCTION_TYPE' && rule.targetKind === kind && (kind !== 'TYPED' || rule.deductionTypeId === typeId)) ?? null,
  entries: (kind: ExemptionEntryTarget) => rules.filter(rule => rule.scopeKind === 'SINGLE_ENTRY' && rule.targetKind === kind),
})

/**
 * يطبق الإعفاءات النشطة لموظف في مسير على المبالغ المطلوبة قبل حماية الصافي. البند المشمول يُنتج صفرًا (أو ما بقي بعد يوم مُعفى)
 * ومرجع الإعفاء، ويُحفظ المبلغ الذي كان سيُقتطع. المصدر لا يتغير: الأيام تبقى في الحضور والقيود تبقى في الدفتر.
 * الاستقطاع النظامي والحكم القضائي والنوع غير القابل للإعفاء والاستردادات غير المصنفة والإجازة بلا أجر تبقى كما هي وتُذكر للمانح.
 */
export function applyFinancialExemptions<T extends ExemptionDebitInput>(input: ExemptionApplicationInput<T>) {
  const rules = [...input.rules].sort((a, b) => a.id - b.id)
  const find = byPrecedence(rules)
  const lines: ExemptionLine[] = []
  const protectedItems: ExemptionProtectedItem[] = []
  const after = { lateness: roundPayrollMoney(input.attendance.requested.lateness), shortfall: roundPayrollMoney(input.attendance.requested.shortfall), absence: roundPayrollMoney(input.attendance.requested.absence) }

  // خصومات الحضور: النوع أو «الكل» يُصفّر البند؛ اليوم الواحد يُصفّر يومه ويبقى الباقي بتقريب واحد للمجموع
  for (const component of ['LATENESS', 'SHORTFALL', 'ABSENCE'] as const) {
    const key = component.toLowerCase() as 'lateness' | 'shortfall' | 'absence'
    const requested = after[key]
    const whole = find.type(component) ?? find.all
    const label = EXEMPTION_LABELS.components[component]
    if (whole) {
      if (requested > 0) lines.push({ exemptionId: whole.id, component, ref: null, label, originalAmount: money(requested), exemptedAmount: money(requested), afterAmount: '0.00', disposition: 'DROP' })
      after[key] = 0
      continue
    }
    const dayRules = find.entries(`${component}_DAY` as ExemptionEntryTarget)
    if (!dayRules.length) continue
    const exemptDates = new Set(dayRules.map(rule => rule.targetRef!))
    let remaining: number
    const dayAmount = new Map<string, number>()
    if (component === 'ABSENCE') {
      const absent = new Set(input.attendance.absentDates)
      for (const date of exemptDates) dayAmount.set(date, absent.has(date) ? input.attendance.absenceDayAmount : 0)
      remaining = roundPayrollMoney(input.attendance.absentDates.filter(date => !exemptDates.has(date)).length * input.attendance.absenceDayAmount)
    } else {
      const dayKey = key as 'lateness' | 'shortfall'
      for (const day of input.attendance.days) if (exemptDates.has(day.date)) dayAmount.set(day.date, (dayAmount.get(day.date) ?? 0) + Number(day[dayKey] ?? 0))
      remaining = roundPayrollMoney(input.attendance.days.filter(day => !exemptDates.has(day.date)).reduce((sum, day) => sum + Number(day[dayKey] ?? 0), 0))
    }
    const exemptedCents = Math.max(0, cents(requested) - cents(remaining))
    const componentLines: ExemptionLine[] = dayRules.sort((a, b) => a.targetRef!.localeCompare(b.targetRef!)).map(rule => {
      const amount = dayAmount.get(rule.targetRef!) ?? 0
      return { exemptionId: rule.id, component, ref: rule.targetRef, label: `${label} — ${rule.targetRef}`, originalAmount: money(amount), exemptedAmount: money(amount), afterAmount: '0.00',
        disposition: 'DROP', ...(amount > 0 ? {} : { note: 'لا يوجد خصم لهذا اليوم في هذا الحساب' }) }
    })
    // قروش التقريب بين مجموع الأيام ومجموع البند تُسند لآخر يوم مُعفى له مبلغ (المجموع = المطلوب − الباقي بالقروش)
    const assigned = componentLines.reduce((sum, line) => sum + Math.round(Number(line.exemptedAmount) * 100), 0)
    const last = [...componentLines].reverse().find(line => Number(line.originalAmount) > 0)
    if (last && assigned !== exemptedCents) {
      const adjusted = Math.round(Number(last.exemptedAmount) * 100) + exemptedCents - assigned
      last.exemptedAmount = fromCents(Math.max(0, adjusted)); last.originalAmount = last.exemptedAmount
    }
    lines.push(...componentLines)
    after[key] = remaining
  }

  // قيود الدفتر المدينة: المصنفة القابلة للإعفاء فقط؛ النظامي والقضائي وغير القابل والاستردادات غير المصنفة تبقى
  const kept: T[] = []
  const exemptedObligations: ExemptedObligation[] = []
  // الترتيب الأصلي للقيود محفوظ (حماية الصافي ترتبها بنفسها)؛ بلا إعفاء تمر القيود كما هي
  for (const debit of input.debits) {
    const typed = debit.deductionRequestId != null
    const entry = find.entries('OBLIGATION').find(rule => Number(rule.targetRef) === debit.id) ?? null
    const rule = entry ?? (typed ? find.type('TYPED', debit.deductionTypeId ?? null) : null) ?? find.all
    if (!rule) { kept.push(debit); continue }
    const name = debit.typeName ?? debit.label ?? 'قيد دفتر'
    if (!typed) {
      kept.push(debit)
      protectedItems.push({ component: 'RECOVERY', ref: String(debit.id), label: `${name} — قيد #${debit.id}`, amount: money(debit.amount),
        reason: 'استرداد غير مصنف (عهدة أو تسوية أو استرداد مكافأة) لا يقبل الإعفاء المالي؛ يُعالج من مصدره' })
      continue
    }
    if (EXEMPTION_PROTECTED_TYPED_CATEGORIES.includes(debit.typedCategory ?? '') || debit.isExemptable === false) {
      kept.push(debit)
      protectedItems.push({ component: 'TYPED', ref: String(debit.id), label: `${name} — قيد #${debit.id}`, amount: money(debit.amount),
        reason: EXEMPTION_PROTECTED_TYPED_CATEGORIES.includes(debit.typedCategory ?? '') ? 'استقطاع نظامي أو حكم قضائي: غير قابل للإعفاء إطلاقًا' : 'نوع الخصم معرّف غير قابل للإعفاء' })
      continue
    }
    lines.push({ exemptionId: rule.id, component: 'TYPED', ref: String(debit.id), label: `${name} — قيد #${debit.id}`, originalAmount: money(debit.amount), exemptedAmount: money(debit.amount),
      afterAmount: '0.00', disposition: rule.disposition })
    exemptedObligations.push({ obligationId: debit.id, exemptionId: rule.id, disposition: rule.disposition, amount: money(debit.amount), deductionRequestId: debit.deductionRequestId })
  }
  if (find.all && input.unpaidLeave > 0) {
    protectedItems.push({ component: 'UNPAID_LEAVE', ref: null, label: 'إجازة بدون راتب', amount: money(input.unpaidLeave), reason: 'الإجازة بلا أجر عدم استحقاق لا خصم؛ لا يشملها الإعفاء' })
  }
  // أقساط السلف: الإعفاء يؤجلها داخل خطة الأقساط (لا تُخصم ولا تُسقط) — «الكل» ونوع الأقساط يشملان كل مستحق هذا المسير
  const loanScope: ExemptionLoanScope = { allExemptionId: (find.type('ADVANCE_INSTALLMENT') ?? find.all)?.id ?? null,
    entries: find.entries('LOAN_INSTALLMENT').map(rule => ({ installmentId: Number(rule.targetRef), exemptionId: rule.id })).sort((a, b) => a.installmentId - b.installmentId) }
  return { attendance: after, debits: kept, lines, exemptedObligations, protectedItems, loanScope }
}

/** سطور أقساط السلف المؤجلة بقرار الإعفاء من خطة الأقساط (المبلغ الأصلي = المتبقي المستحق، والمصير تأجيل دائمًا). */
export function exemptionLoanLines(deferred: readonly ExemptionInstallmentDeferral[] | undefined): ExemptionLine[] {
  return [...(deferred ?? [])].sort((a, b) => a.installmentId - b.installmentId).map(row => ({ exemptionId: row.exemptionId, component: 'LOAN' as const, ref: String(row.installmentId),
    label: `قسط سلفة #${row.loanId} (استحقاق ${row.dueDate})`, originalAmount: row.remainingAmount, exemptedAmount: row.remainingAmount, afterAmount: '0.00',
    disposition: 'DEFER_ONE_PERIOD' as const, note: 'يُؤجَّل القسط للشهر التالي ولا يُسقط الدين' }))
}

/** تفصيل الإعفاء المحفوظ مع بند المسير: السطور والمجاميع لكل إعفاء ولكل بند، ونسخة القرارات المطبقة للتحقق عند الاعتماد. */
export function summarizeFinancialExemptions(input: { rules: ExemptionRule[]; lines: ExemptionLine[]; exemptedObligations: ExemptedObligation[]; protectedItems: ExemptionProtectedItem[];
  deferredInstallments: readonly ExemptionInstallmentDeferral[]; requested: { lateness: number; shortfall: number; absence: number } }) {
  const sum = (rows: ExemptionLine[]) => fromCents(rows.reduce((total, line) => total + Math.round(Number(line.exemptedAmount) * 100), 0))
  const byComponent: Record<string, { exempted: string; lines: number }> = {}
  for (const component of ['LATENESS', 'SHORTFALL', 'ABSENCE', 'TYPED', 'LOAN'] as const) {
    const rows = input.lines.filter(line => line.component === component)
    if (rows.length) byComponent[component] = { exempted: sum(rows), lines: rows.length }
  }
  return {
    version: FINANCIAL_EXEMPTION_VERSION,
    applied: [...input.rules].sort((a, b) => a.id - b.id).map(rule => ({ id: rule.id, revision: rule.revision })),
    requested: { lateness: money(input.requested.lateness), shortfall: money(input.requested.shortfall), absence: money(input.requested.absence) },
    lines: input.lines,
    exemptedObligations: input.exemptedObligations,
    deferredInstallments: [...input.deferredInstallments],
    protectedItems: input.protectedItems,
    totals: { exempted: sum(input.lines), byComponent,
      byExemption: [...input.rules].sort((a, b) => a.id - b.id).map(rule => ({ exemptionId: rule.id, amount: sum(input.lines.filter(line => line.exemptionId === rule.id)), lines: input.lines.filter(line => line.exemptionId === rule.id).length })) },
  }
}
export type FinancialExemptionBreakdown = ReturnType<typeof summarizeFinancialExemptions>

/**
 * نفس الإعفاء على مجاميع خصومات الحضور في ظل محرك السياسة (SHADOW/POLICY) كي يقيس التكافؤ الحساب لا قرار الإعفاء:
 * النوع أو «الكل» يُصفّر البند، واليوم الواحد يُطرح من أيام الظل بدقتها ثم تقريب واحد للمجموع.
 */
export function exemptPolicyShadowTotals(totals: { lateness: string; shortfall: string; absence: string },
  days: ReadonlyArray<{ date?: unknown; policy?: { lateness?: unknown; shortfall?: unknown; absence?: unknown } | null }> | null | undefined, rules: ExemptionRule[]) {
  if (!rules.length) return totals
  const find = byPrecedence(rules)
  const result = { ...totals }
  for (const component of ['LATENESS', 'SHORTFALL', 'ABSENCE'] as const) {
    const key = component.toLowerCase() as 'lateness' | 'shortfall' | 'absence'
    if (find.type(component) ?? find.all) { result[key] = '0.00'; continue }
    const dates = new Set(find.entries(`${component}_DAY` as ExemptionEntryTarget).map(rule => rule.targetRef))
    if (!dates.size) continue
    let kept = PayrollDecimal.from('0')
    for (const day of days ?? []) {
      const value = day?.policy?.[key]
      if (typeof day?.date !== 'string' || dates.has(day.date) || typeof value !== 'string' || !/^-?\d+(\.\d+)?$/.test(value)) continue
      kept = kept.add(PayrollDecimal.from(value))
    }
    result[key] = kept.format(2, 'DOWN')
  }
  return result
}

/** وصف عربي لهدف الإعفاء للقوائم والقسيمة: «كل الخصومات القابلة»، «كل خصم التأخير»، «نوع خصم مصنف: خصم جودة»، «غياب يوم 2026-06-12»… */
export function exemptionTargetLabel(target: Pick<ExemptionTarget, 'scopeKind' | 'targetKind' | 'deductionTypeId' | 'targetRef'>, typeName?: string | null): string {
  if (target.scopeKind === 'ALL_DEDUCTIONS') return EXEMPTION_LABELS.scopes.ALL_DEDUCTIONS
  if (target.scopeKind === 'DEDUCTION_TYPE') {
    return target.targetKind === 'TYPED' ? `نوع خصم مصنف: ${typeName ?? `#${target.deductionTypeId}`}` : EXEMPTION_LABELS.typeTargets[target.targetKind as ExemptionTypeTarget] ?? String(target.targetKind)
  }
  const label = EXEMPTION_LABELS.entryTargets[target.targetKind as ExemptionEntryTarget] ?? String(target.targetKind)
  return String(target.targetKind).endsWith('_DAY') ? `${label} ${target.targetRef}` : `${label} #${target.targetRef}`
}

/** سقف المبلغ المُعفى بلا مرفق (EX-07): أيام الراتب × سعر اليوم؛ 0 أيام = المرفق إلزامي لأي مبلغ. */
export function exemptionAttachmentThreshold(dayRate: number, days: number): string {
  return money(Math.max(0, days) * Math.max(0, dayRate))
}
export function exemptionNeedsAttachment(amount: string, dayRate: number, days: number, attachmentRef: string | null | undefined): boolean {
  if (attachmentRef && attachmentRef.trim()) return false
  const threshold = Number(exemptionAttachmentThreshold(dayRate, days))
  return Number(amount) > threshold || (days === 0 && Number(amount) > 0)
}
