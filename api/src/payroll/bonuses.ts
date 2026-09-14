import { BadRequestException } from '@nestjs/common'
import { PayrollDecimal } from './payroll-decimal'
import {
  DEDUCTION_APPROVAL_ROLES,
  DEDUCTION_ESCALATION_ROLES,
  DEDUCTION_LABELS,
  DEDUCTION_MISSING_APPROVER_FALLBACKS,
  type DeductionApprovalRole,
  type DeductionSalaryBasis,
} from './typed-deductions'

// C4 / الخطوة 27 — المكافأة الفردية ثم الجماعية (EX-05). قواعد نقية بلا قاعدة بيانات:
// الكتالوج، طرق الحساب، السقف من الأساسي (تجاوزه بصلاحية bonuses.exceed_cap)، حد التصعيد بأيام الراتب،
// والإعدادات. سلسلة الاعتماد وأدوارها وحل المعتمِد الهيكلي نفس الخصومات المصنفة (buildDeductionChain).
// المال بكسور دقيقة ومنزلتين نصف لأعلى (D4)، وسعر اليوم = إجمالي المكونات الست ÷ أيام الشهر (D3).
export const BONUSES_VERSION = 'EX05_BONUSES_V1_20260914' as const

export const BONUS_CALC_METHODS = ['FIXED_AMOUNT', 'DAYS_OF_SALARY', 'PERCENT_OF_BASE'] as const
export type BonusCalcMethod = typeof BONUS_CALC_METHODS[number]
// المُقترِح: المدير الهيكلي على مرؤوسيه، أو الموارد البشرية (bonuses.manage) في نطاق فرعها
export const BONUS_CREATOR_BASES = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'HR'] as const
export type BonusCreatorBasis = typeof BONUS_CREATOR_BASES[number]
export const BONUS_REQUEST_STATUSES = ['IN_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'] as const
export type BonusRequestStatus = typeof BONUS_REQUEST_STATUSES[number]
export const BONUS_SELECTION_MODES = ['EMPLOYEES', 'TEAM', 'DEPARTMENT', 'BRANCH'] as const
export type BonusSelectionMode = typeof BONUS_SELECTION_MODES[number]
// قيد الدفتر: المكافأة المعتمدة CREDIT، وعكسها بعد الصرف DEBIT استرداد (نفس قواعد DD-12)
export const BONUS_OBLIGATION_CATEGORY = 'bonus'
export const BONUS_REVERSAL_OBLIGATION_CATEGORY = 'bonus_reversal'
// حالة الصرف المشتقة من القيد: لا تُكتب «مصروف» إلا بعد استهلاك القيد في مسير مصروف
export type BonusPayoutState = 'AWAITING_PAYROLL' | 'RESERVED' | 'PAID' | 'CANCELLED'

export const BONUS_LABELS = {
  calcMethods: { FIXED_AMOUNT: 'مبلغ ثابت', DAYS_OF_SALARY: 'أيام من الراتب', PERCENT_OF_BASE: 'نسبة من الأساسي' } as Record<BonusCalcMethod, string>,
  roles: DEDUCTION_LABELS.roles,
  statuses: { IN_APPROVAL: 'قيد الاعتماد', APPROVED: 'معتمد — بانتظار الصرف', REJECTED: 'مرفوض', WITHDRAWN: 'مسحوب', CANCELLED: 'ملغى' } as Record<string, string>,
  payout: { AWAITING_PAYROLL: 'معتمد — بانتظار الصرف', RESERVED: 'معتمد — محجوز في مسير معتمد بانتظار الصرف', PAID: 'مصروف', CANCELLED: 'ملغى' } as Record<BonusPayoutState, string>,
  obligationStatuses: { PENDING: 'بانتظار المسير', APPLIED: 'مصروف في مسير', CANCELLED: 'ملغى', SUSPENDED: 'معلق' } as Record<string, string>,
}

const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => {
  throw new BadRequestException({ code, message, ...details })
}
const D = (value: string) => PayrollDecimal.from(value)
const ZERO = D('0'), HUNDRED = D('100')
const money = (value: PayrollDecimal) => value.format(2, 'HALF_UP')

/** نص عشري قانوني من رقم أو نص؛ بلا تقريب صامت للمنازل الزائدة. */
export function bonusDecimal(value: unknown, label: string, options: { scale: number; positive?: boolean; max?: string }): string {
  let text: unknown = value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('BONUS_VALUE_INVALID', `${label}: رقم صالح مطلوب`)
    text = PayrollDecimal.from(value).canonical()
  }
  if (typeof text !== 'string' || !/^\d{1,14}(?:\.\d+)?$/.test(text.trim())) fail('BONUS_VALUE_INVALID', `${label}: رقم عشري غير سالب مطلوب`)
  const trimmed = (text as string).trim()
  if ((trimmed.split('.')[1]?.length ?? 0) > options.scale) fail('BONUS_VALUE_INVALID', `${label}: بحد أقصى ${options.scale} منازل عشرية`)
  const decimal = D(trimmed)
  if (options.positive !== false && decimal.compare(ZERO) <= 0) fail('BONUS_VALUE_INVALID', `${label} يجب أن يكون أكبر من صفر`)
  if (options.max !== undefined && decimal.compare(D(options.max)) > 0) fail('BONUS_VALUE_INVALID', `${label} لا يتجاوز ${options.max}`)
  return decimal.canonical()
}
const optionalDecimal = (value: unknown, label: string, options: { scale: number; positive?: boolean; max?: string }) =>
  value === null || value === undefined || value === '' ? null : bonusDecimal(value, label, options)

// ===== الإعدادات: حدود واحدة يقرؤها الخادم ويتحقق بها PATCH /settings/config =====
export const BONUS_NUMERIC_SETTINGS: Record<string, { min: number; max: number; fallback: number; label: string }> = {
  'bonuses.reason_min_length': { min: 1, max: 1000, fallback: 20, label: 'أقل طول لسبب المكافأة' },
  'bonuses.duplicate_window_hours': { min: 0, max: 8760, fallback: 24, label: 'نافذة كشف تكرار المكافأة بالساعات' },
  'bonuses.bulk_max_employees': { min: 1, max: 5000, fallback: 500, label: 'حد الموظفين في دفعة المكافآت الجماعية' },
}
export const BONUS_ENUM_SETTINGS: Record<string, { values: readonly string[]; fallback: string }> = {
  'bonuses.manager_creation_enabled': { values: ['true', 'false'], fallback: 'true' },
  'bonuses.missing_approver_fallback': { values: DEDUCTION_MISSING_APPROVER_FALLBACKS, fallback: 'NEXT_LEVEL' },
}
export const BONUS_SETTING_KEYS = [...Object.keys(BONUS_NUMERIC_SETTINGS), ...Object.keys(BONUS_ENUM_SETTINGS)]
export const BONUS_CONFIG_SEED: Array<{ key: string; value: string }> = [
  ...Object.entries(BONUS_NUMERIC_SETTINGS).map(([key, rule]) => ({ key, value: String(rule.fallback) })),
  ...Object.entries(BONUS_ENUM_SETTINGS).map(([key, rule]) => ({ key, value: rule.fallback })),
]

export function bonusNumericSetting(key: string, raw: string | null | undefined): number {
  const rule = BONUS_NUMERIC_SETTINGS[key]
  if (!rule) throw new Error(`إعداد مكافآت غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!/^-?\d+$/.test(text)) return rule.fallback
  return Math.min(rule.max, Math.max(rule.min, Number(text)))
}
export function bonusEnumSetting(key: string, raw: string | null | undefined): string {
  const rule = BONUS_ENUM_SETTINGS[key]
  if (!rule) throw new Error(`إعداد مكافآت غير معروف: ${key}`)
  const text = typeof raw === 'string' ? raw.trim() : ''
  return rule.values.includes(text) ? text : rule.fallback
}
/** تحقق PATCH /settings/config لمفاتيح bonuses.*؛ null = صالح أو مفتاح آخر. */
export function bonusSettingError(key: string, value: string): string | null {
  const numeric = BONUS_NUMERIC_SETTINGS[key]
  if (numeric) {
    const text = String(value ?? '').trim()
    return /^\d+$/.test(text) && Number(text) >= numeric.min && Number(text) <= numeric.max ? null : `${numeric.label}: عدد صحيح من ${numeric.min} إلى ${numeric.max}`
  }
  const choice = BONUS_ENUM_SETTINGS[key]
  if (choice) return choice.values.includes(String(value ?? '').trim()) ? null : `القيم المسموحة لـ«${key}»: ${choice.values.join('، ')}`
  return null
}

// ===== الكتالوج =====
export interface BonusTypeRules {
  code: string
  nameAr: string
  nameEn: string | null
  calcMethod: BonusCalcMethod
  defaultValue: string | null
  valueStep: string | null
  minAmount: string | null
  maxAmount: string | null
  // EX-05 قاعدة 2: سقف المكافأة الواحدة كنسبة من الأساسي (افتراضي 100)؛ null = بلا سقف
  maxPctOfBase: string | null
  // الخضوع (يُورَث من النوع) — للعرض والتقارير؛ المسير الحالي لا يحسب ضريبة ولا تأمينًا على المكافأة
  isTaxable: boolean
  isInsurable: boolean
  creatorScopes: BonusCreatorBasis[]
  approvalSteps: DeductionApprovalRole[]
  // EX-05 قاعدة 1: تجاوز «أيام من الراتب» يضيف خطوة المدير الأعلى؛ null = بلا تصعيد
  escalationDays: string | null
  escalationStep: DeductionApprovalRole | null
  isActive: boolean
}
export const BONUS_TYPE_FINANCIAL_FIELDS: ReadonlyArray<keyof BonusTypeRules> = ['calcMethod', 'defaultValue', 'valueStep', 'minAmount', 'maxAmount', 'maxPctOfBase',
  'isTaxable', 'isInsurable', 'creatorScopes', 'approvalSteps', 'escalationDays', 'escalationStep']

function list<T extends string>(value: unknown, allowed: readonly T[], label: string): T[] {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : null
  if (!raw) fail('BONUS_TYPE_INVALID', `${label}: قائمة مطلوبة`)
  const items = (raw as unknown[]).map(item => typeof item === 'string' ? item.trim() : item).filter(item => item !== '')
  if (items.some(item => !allowed.includes(item as T))) fail('BONUS_TYPE_INVALID', `${label}: قيمة غير معروفة`)
  return [...new Set(items as T[])]
}
function bool(value: unknown, fallback: boolean, label: string): boolean {
  if (value === undefined) return fallback
  if (typeof value !== 'boolean') fail('BONUS_TYPE_INVALID', `${label}: نعم/لا مطلوب`)
  return value as boolean
}

/** يطبّع تعريف نوع مكافأة جديد أو تعديل نوع قائم. الكود ثابت بعد الإنشاء، وخطوة الموارد البشرية الأخيرة لا تُحذف. */
export function normalizeBonusTypeRules(input: Record<string, unknown>, existing?: BonusTypeRules): BonusTypeRules {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('BONUS_TYPE_INVALID', 'تعريف نوع المكافأة مطلوب')
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined
  const pick = <K extends keyof BonusTypeRules>(key: K): unknown => has(key) ? input[key] : existing?.[key]
  let code: string
  if (existing) {
    if (has('code') && input.code !== existing.code) fail('BONUS_TYPE_CODE_IMMUTABLE', 'كود نوع المكافأة ثابت بعد إنشائه')
    code = existing.code
  } else {
    if (typeof input.code !== 'string' || !/^[A-Z][A-Z0-9_]{1,39}$/.test(input.code.trim())) fail('BONUS_TYPE_INVALID', 'الكود: حروف إنجليزية كبيرة وأرقام وشرطة سفلية (2-40)')
    code = (input.code as string).trim()
  }
  const nameAr = typeof pick('nameAr') === 'string' ? (pick('nameAr') as string).trim() : ''
  if (nameAr.length < 2 || nameAr.length > 120) fail('BONUS_TYPE_INVALID', 'الاسم العربي للنوع مطلوب (2-120 حرفًا)')
  const nameEnRaw = pick('nameEn')
  if (nameEnRaw != null && (typeof nameEnRaw !== 'string' || nameEnRaw.trim().length > 120)) fail('BONUS_TYPE_INVALID', 'الاسم الإنجليزي بحد أقصى 120 حرفًا')
  const nameEn = typeof nameEnRaw === 'string' && nameEnRaw.trim() ? nameEnRaw.trim() : null
  const calcMethod = pick('calcMethod') as BonusCalcMethod
  if (!BONUS_CALC_METHODS.includes(calcMethod)) fail('BONUS_TYPE_INVALID', 'طريقة حساب المكافأة غير معروفة')
  const defaultValue = optionalDecimal(pick('defaultValue'), 'القيمة الافتراضية', { scale: calcMethod === 'FIXED_AMOUNT' ? 2 : 4 })
  const stepDefault = existing && existing.calcMethod === calcMethod ? existing.valueStep : calcMethod === 'DAYS_OF_SALARY' ? '0.25' : null
  const valueStep = calcMethod === 'DAYS_OF_SALARY' ? (has('valueStep') ? optionalDecimal(input.valueStep, 'خطوة المدخل', { scale: 4, max: '24' }) : stepDefault) : null
  const minAmount = has('minAmount') || existing ? optionalDecimal(pick('minAmount'), 'الحد الأدنى', { scale: 2 }) : '1'
  const maxAmount = optionalDecimal(pick('maxAmount'), 'الحد الأعلى', { scale: 2 })
  const maxPctOfBase = has('maxPctOfBase') || existing ? optionalDecimal(pick('maxPctOfBase'), 'السقف كنسبة من الأساسي', { scale: 4, max: '1000' }) : '100'
  if (minAmount && maxAmount && D(minAmount).compare(D(maxAmount)) > 0) fail('BONUS_TYPE_INVALID', 'الحد الأدنى أكبر من الحد الأعلى')
  const creatorScopes = list(pick('creatorScopes') ?? 'DIRECT_MANAGER,TEAM_LEADER,DEPARTMENT_MANAGER,BRANCH_MANAGER,HR', BONUS_CREATOR_BASES, 'نطاق المُقترِح')
  if (!creatorScopes.length) fail('BONUS_TYPE_INVALID', 'حدد نطاق مُقترِح واحدًا على الأقل')
  const approvalSteps = [...list(pick('approvalSteps') ?? 'HR', DEDUCTION_APPROVAL_ROLES, 'سلسلة الاعتماد').filter(role => role !== 'HR'), 'HR'] as DeductionApprovalRole[]
  const escalationDays = optionalDecimal(has('escalationDays') || existing ? pick('escalationDays') : '1', 'حد التصعيد بالأيام', { scale: 4, max: '365' })
  let escalationStep: DeductionApprovalRole | null = null
  if (escalationDays !== null) {
    escalationStep = (pick('escalationStep') ?? 'DEPARTMENT_MANAGER') as DeductionApprovalRole
    if (!(DEDUCTION_ESCALATION_ROLES as readonly string[]).includes(escalationStep)) fail('BONUS_TYPE_INVALID', 'خطوة التصعيد: مدير القسم أو مدير الفرع أو الإدارة التنفيذية')
  }
  return {
    code, nameAr, nameEn, calcMethod, defaultValue, valueStep, minAmount, maxAmount, maxPctOfBase,
    isTaxable: bool(pick('isTaxable'), true, 'خاضع للضريبة'), isInsurable: bool(pick('isInsurable'), false, 'خاضع للتأمين'),
    creatorScopes, approvalSteps, escalationDays, escalationStep, isActive: bool(pick('isActive'), true, 'مفعل'),
  }
}

export function bonusTypeRulesFromRow(row: Record<string, any>): BonusTypeRules {
  const text = (value: unknown) => value === null || value === undefined ? null : PayrollDecimal.from(typeof value === 'number' ? value : String(value)).canonical()
  return normalizeBonusTypeRules({
    code: row.code, nameAr: row.nameAr, nameEn: row.nameEn ?? null, calcMethod: row.calcMethod, defaultValue: text(row.defaultValue), valueStep: text(row.valueStep),
    minAmount: text(row.minAmount), maxAmount: text(row.maxAmount), maxPctOfBase: text(row.maxPctOfBase), isTaxable: Boolean(row.isTaxable), isInsurable: Boolean(row.isInsurable),
    creatorScopes: row.creatorScopes, approvalSteps: row.approvalSteps, escalationDays: text(row.escalationDays), escalationStep: row.escalationStep ?? null, isActive: Boolean(row.isActive),
  }, { code: row.code } as BonusTypeRules)
}

export function bonusTypeColumns(rules: BonusTypeRules) {
  return { ...rules, creatorScopes: rules.creatorScopes.join(','), approvalSteps: rules.approvalSteps.join(',') }
}

export function bonusTypeFinancialChanged(before: BonusTypeRules, after: BonusTypeRules) {
  return BONUS_TYPE_FINANCIAL_FIELDS.some(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
}

// ===== المبلغ =====
export interface BonusAmountTrace {
  version: typeof BONUSES_VERSION
  calcMethod: BonusCalcMethod
  inputValue: string
  amount: string
  basic: string
  gross: string
  dayRate: string
  capLimit: string | null
  capExceeded: boolean
  escalationThreshold: string | null
  escalated: boolean
  salarySource: string
  formula: string
}

/** EX-05: مبلغ المكافأة براتب الشهر المستهدف مع الحدود الدنيا/العليا، ووسم تجاوز السقف والتصعيد (القرار للمستدعي). */
export function computeBonusAmount(rules: Pick<BonusTypeRules, 'calcMethod' | 'valueStep' | 'minAmount' | 'maxAmount' | 'maxPctOfBase' | 'escalationDays'>,
  inputValue: unknown, salary: DeductionSalaryBasis): BonusAmountTrace {
  const method = rules.calcMethod
  const input = method === 'FIXED_AMOUNT' ? bonusDecimal(inputValue, 'مبلغ المكافأة', { scale: 2, max: '99999999' })
    : method === 'DAYS_OF_SALARY' ? bonusDecimal(inputValue, 'عدد الأيام', { scale: 4, max: '365' })
      : bonusDecimal(inputValue, 'النسبة', { scale: 4, max: '1000' })
  if (rules.valueStep && method === 'DAYS_OF_SALARY' && D(input).divide(D(rules.valueStep)).denominator !== 1n) {
    fail('BONUS_STEP_INVALID', `القيمة ${input} ليست من مضاعفات الخطوة ${rules.valueStep}`, { step: rules.valueStep })
  }
  const basic = D(bonusDecimal(salary.basic, 'الراتب الأساسي', { scale: 2, positive: false }))
  const gross = D(bonusDecimal(salary.gross, 'إجمالي الراتب', { scale: 2, positive: false }))
  const days = D(bonusDecimal(salary.monthlyDays, 'أساس أيام الشهر', { scale: 2 }))
  const dayRate = gross.divide(days)
  if ((method === 'DAYS_OF_SALARY' && gross.isZero()) || (method === 'PERCENT_OF_BASE' && basic.isZero())) {
    fail('BONUS_NO_SALARY', 'لا يوجد راتب مسجل للموظف في الشهر المستهدف لحساب المكافأة')
  }
  const value = D(input)
  const raw = method === 'FIXED_AMOUNT' ? value : method === 'DAYS_OF_SALARY' ? value.multiply(dayRate) : value.multiply(basic).divide(HUNDRED)
  const amount = money(raw)
  if (D(amount).compare(ZERO) <= 0) fail('BONUS_ZERO', 'ناتج المكافأة صفر؛ راجع القيمة المدخلة')
  if (rules.minAmount && D(amount).compare(D(rules.minAmount)) < 0) fail('BONUS_BELOW_MIN', `مبلغ المكافأة ${amount} أقل من الحد الأدنى للنوع ${money(D(rules.minAmount))}`, { limit: money(D(rules.minAmount)), amount })
  if (rules.maxAmount && D(amount).compare(D(rules.maxAmount)) > 0) fail('BONUS_ABOVE_MAX', `مبلغ المكافأة ${amount} يتجاوز الحد الأعلى للنوع ${money(D(rules.maxAmount))}`, { limit: money(D(rules.maxAmount)), amount })
  let capLimit: string | null = null
  if (rules.maxPctOfBase) {
    if (basic.isZero()) fail('BONUS_NO_SALARY', 'لا يوجد راتب أساسي مسجل للموظف لفحص سقف المكافأة')
    capLimit = money(basic.multiply(D(rules.maxPctOfBase)).divide(HUNDRED))
  }
  const escalationThreshold = rules.escalationDays === null || gross.isZero() ? null : money(D(rules.escalationDays).multiply(dayRate))
  const unit = method === 'FIXED_AMOUNT' ? '' : method === 'DAYS_OF_SALARY' ? ` يوم × ${money(dayRate)}` : `% × ${money(basic)}`
  return {
    version: BONUSES_VERSION, calcMethod: method, inputValue: input, amount, basic: money(basic), gross: money(gross), dayRate: dayRate.format(6, 'HALF_UP'),
    capLimit, capExceeded: capLimit !== null && D(amount).compare(D(capLimit)) > 0,
    escalationThreshold, escalated: escalationThreshold !== null && D(amount).compare(D(escalationThreshold)) > 0,
    salarySource: salary.source, formula: method === 'FIXED_AMOUNT' ? `${amount}` : `${input}${unit} = ${amount}`,
  }
}

/** EX-05 قاعدة 2: تجاوز السقف يُرفض إلا لمن يملك bonuses.exceed_cap (أو باستثناء مسجل عند الاقتراح). */
export function assertBonusCap(trace: Pick<BonusAmountTrace, 'capExceeded' | 'capLimit' | 'amount' | 'basic'>, allowed: boolean, prefix = '') {
  if (trace.capExceeded && !allowed) {
    fail('BONUS_ABOVE_CAP', `${prefix}مبلغ المكافأة ${trace.amount} يتجاوز سقف النوع ${trace.capLimit} من الأساسي ${trace.basic}؛ يلزم صلاحية تجاوز سقف المكافأة`,
      { limit: trace.capLimit, amount: trace.amount })
  }
}

/** حالة الصرف من قيد المكافأة الموجب: «مصروف» فقط بعد استهلاكه في مسير مصروف. */
export function bonusPayoutState(obligation: { status: string; reservedPayrollRunId?: number | null } | null | undefined): BonusPayoutState | null {
  if (!obligation) return null
  if (obligation.status === 'APPLIED') return 'PAID'
  if (obligation.status === 'CANCELLED') return 'CANCELLED'
  return obligation.reservedPayrollRunId != null ? 'RESERVED' : 'AWAITING_PAYROLL'
}
