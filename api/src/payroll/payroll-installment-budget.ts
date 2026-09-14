import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'

export const PAYROLL_INSTALLMENT_BUDGET_VERSION = 'SRS_INSTALLMENT_BUDGET_V1_20260913' as const

export interface PayrollInstallmentBudgetInput {
  netBeforeLoans: string
  earnedFixedGross: string
  capConsumed: string
  sourceRefs: { netBeforeLoans: string; earnedFixedGross: string; capConsumed: string }
}
export interface PayrollInstallmentBudgetDecimal {
  rawValue6: string
  exact: { numerator: string; denominator: string }
}
export interface PayrollInstallmentBudgetWarning {
  code: 'NET_ALREADY_BELOW_FLOOR' | 'CAP_ALREADY_EXCEEDED'
  message: string
  path: string
}
type DeepReadonly<T> = T extends (infer V)[] ? ReadonlyArray<DeepReadonly<V>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export type PayrollInstallmentBudgetResult = DeepReadonly<{
  engineVersion: typeof PAYROLL_INSTALLMENT_BUDGET_VERSION
  sourceValidation: 'CALLER_UNVERIFIED'
  normalizedInput: PayrollInstallmentBudgetInput
  floorExact: PayrollInstallmentBudgetDecimal
  cashCapacityExact: PayrollInstallmentBudgetDecimal
  capLimitExact: PayrollInstallmentBudgetDecimal | null
  capCapacityExact: PayrollInstallmentBudgetDecimal | null
  availableExact: PayrollInstallmentBudgetDecimal
  availableBudget: string
  unusedFraction: PayrollInstallmentBudgetDecimal
  warnings: PayrollInstallmentBudgetWarning[]
  trace: {
    floorBasis: 'EARNED_FIXED_GROSS'
    capBasis: 'EARNED_FIXED_GROSS'
    basisSourceRef: string
    capConsumedStage: 'CALLER_DECLARED_AFTER_EXEMPTIONS_ATTENDANCE_AND_STATUTORY'
    capConsumedSourceRef: string
    settingsUsed: { minNetGuarantee: string | null; netFloorPct: string | null; maxDeductionPctOfGross: string | null }
    budgetRounding: { mode: 'FLOOR'; scale: 2 }
  }
}>

export class PayrollInstallmentBudgetError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollInstallmentBudgetError' }
}

const moneyKeys = ['netBeforeLoans', 'earnedFixedGross', 'capConsumed'] as const
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
function fail(code: string, message: string, path: string): never { throw new PayrollInstallmentBudgetError(`INSTALLMENT_BUDGET_${code}`, message, path) }
function shape(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('SHAPE_INVALID', 'كائن JSON صريح مطلوب', path)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) fail('SHAPE_INVALID', 'الكائنات ذات النماذج الموروثة المخصصة غير مقبولة', path)
  const copy: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) fail('FIELD_UNKNOWN', 'حقل غير مسموح في حساب المتاح للأقساط', path)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!own(descriptor, 'value') || !descriptor.enumerable) fail('SHAPE_INVALID', 'الخصائص المحسوبة أو غير الظاهرة في JSON غير مقبولة', `${path}.${key}`)
    copy[key] = descriptor.value
  }
  for (const key of keys) if (!own(copy, key)) fail('FIELD_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return copy
}
function source(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length > 200 || !value.trim()) fail('SOURCE_REQUIRED', 'مرجع مصدر غير فارغ بحد أقصى 200 محرف مطلوب', path)
  return value.trim()
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}

/**
 * مساحة تحصيل من لقطة صريحة فقط؛ لا تخصيص أقساط أو كتابة دفتر أو حساب للصافي النهائي.
 * DD-11: الأساس الثابت المستحق بعد التناسب يستبعد الإضافي والمكافآت، ومسار الخصومات السابق
 * يقدمه المستدعي ولا تثبت هذه الدالة مصدره أو ترتيب تطبيقه. AD-12: الحد الأدنى لا ينشئ دخلاً.
 */
export function computePayrollInstallmentBudget(settings: PayrollPolicySettings, input: unknown): PayrollInstallmentBudgetResult {
  let remaining = 20000, currentPath = 'budget'
  const spend = () => { if (--remaining < 0) fail('NUMERIC_LIMIT', 'تجاوز حساب المتاح ميزانية التعقيد العددي', currentPath) }
  try {
    const rawSettings = shape(settings, PAYROLL_POLICY_SETTING_FIELDS, 'settings')
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(rawSettings) } catch (error) {
      fail('SETTINGS_INVALID', error instanceof Error ? error.message : 'إعدادات نسخة السياسة غير صالحة', 'settings')
    }
    const raw = shape(input, [...moneyKeys, 'sourceRefs'], 'budget')
    const rawRefs = shape(raw.sourceRefs, moneyKeys, 'sourceRefs')
    const sourceRefs = {
      netBeforeLoans: source(rawRefs.netBeforeLoans, 'sourceRefs.netBeforeLoans'),
      earnedFixedGross: source(rawRefs.earnedFixedGross, 'sourceRefs.earnedFixedGross'),
      capConsumed: source(rawRefs.capConsumed, 'sourceRefs.capConsumed'),
    }
    const decimal = (value: string | number) => PayrollDecimal.from(value, spend)
    const zero = decimal('0'), hundred = decimal('100')
    const money = (key: typeof moneyKeys[number]) => {
      currentPath = key
      const value = raw[key]
      // صيغ JSON العددية وscientific notation مرفوضة؛ لا تقريب صامت للمنازل الزائدة.
      if (typeof value !== 'string' || value.length > 80 || !/^-?\d+(?:\.\d{1,6})?$/.test(value) || value.replace(/[^0-9]/g, '').length > 60) {
        fail('INPUT_INVALID', 'المبلغ نص عشري صريح بحد 60 رقمًا وست منازل عشرية', key)
      }
      const result = decimal(value)
      if (key !== 'netBeforeLoans' && result.compare(zero) < 0) fail('INPUT_INVALID', 'المبلغ يجب ألا يكون سالبًا', key)
      return result
    }
    const netBeforeLoans = money('netBeforeLoans'), earnedFixedGross = money('earnedFixedGross'), capConsumed = money('capConsumed')
    const normalizedInput: PayrollInstallmentBudgetInput = {
      netBeforeLoans: netBeforeLoans.canonical(), earnedFixedGross: earnedFixedGross.canonical(), capConsumed: capConsumed.canonical(), sourceRefs,
    }
    currentPath = 'settings'
    const minNetGuarantee = policy.minNetGuarantee === null ? null : decimal(policy.minNetGuarantee)
    const netFloorPct = policy.netFloorPct === null ? null : decimal(policy.netFloorPct)
    const maxDeductionPctOfGross = policy.maxDeductionPctOfGross === null ? null : decimal(policy.maxDeductionPctOfGross)
    const maximum = (left: PayrollDecimal, right: PayrollDecimal) => left.compare(right) >= 0 ? left : right
    const minimum = (left: PayrollDecimal, right: PayrollDecimal) => left.compare(right) <= 0 ? left : right
    currentPath = 'floorExact'
    const percentageFloor = netFloorPct === null ? zero : earnedFixedGross.multiply(netFloorPct).divide(hundred)
    const floor = maximum(zero, maximum(minNetGuarantee ?? zero, percentageFloor))
    currentPath = 'cashCapacityExact'
    const cashCapacity = maximum(zero, netBeforeLoans.subtract(floor))
    currentPath = 'capCapacityExact'
    const capLimit = maxDeductionPctOfGross === null ? null : earnedFixedGross.multiply(maxDeductionPctOfGross).divide(hundred)
    const capCapacity = capLimit === null ? null : maximum(zero, capLimit.subtract(capConsumed))
    currentPath = 'availableExact'
    // القيود تتقاطع: لا يجوز أن يتجاوز التحصيل مساحة الصافي أو مساحة سقف الخصومات.
    const available = capCapacity === null ? cashCapacity : minimum(cashCapacity, capCapacity)
    const budget = available.round(2, 'FLOOR')
    const unusedFraction = available.subtract(budget)
    const warnings: PayrollInstallmentBudgetWarning[] = []
    if (netBeforeLoans.compare(floor) < 0) warnings.push({ code: 'NET_ALREADY_BELOW_FLOOR', message: 'الصافي المقدم أقل من الحد الأدنى قبل الأقساط؛ المتاح صفر ولا يُرفع الدخل', path: 'netBeforeLoans' })
    if (capLimit !== null && capConsumed.compare(capLimit) > 0) warnings.push({ code: 'CAP_ALREADY_EXCEEDED', message: 'الخصومات السابقة المصرح بها تجاوزت السقف؛ لا توجد مساحة إضافية للتحصيل', path: 'capConsumed' })
    const display = (value: PayrollDecimal): PayrollInstallmentBudgetDecimal => ({
      rawValue6: value.format(6, 'HALF_UP'), exact: { numerator: value.numerator.toString(), denominator: value.denominator.toString() },
    })
    return freeze({
      engineVersion: PAYROLL_INSTALLMENT_BUDGET_VERSION, sourceValidation: 'CALLER_UNVERIFIED', normalizedInput,
      floorExact: display(floor), cashCapacityExact: display(cashCapacity), capLimitExact: capLimit === null ? null : display(capLimit),
      capCapacityExact: capCapacity === null ? null : display(capCapacity), availableExact: display(available),
      availableBudget: budget.format(2, 'FLOOR'), unusedFraction: display(unusedFraction), warnings,
      trace: {
        floorBasis: 'EARNED_FIXED_GROSS', capBasis: 'EARNED_FIXED_GROSS', basisSourceRef: sourceRefs.earnedFixedGross,
        capConsumedStage: 'CALLER_DECLARED_AFTER_EXEMPTIONS_ATTENDANCE_AND_STATUTORY', capConsumedSourceRef: sourceRefs.capConsumed,
        settingsUsed: { minNetGuarantee: minNetGuarantee?.canonical() ?? null, netFloorPct: netFloorPct?.canonical() ?? null, maxDeductionPctOfGross: maxDeductionPctOfGross?.canonical() ?? null },
        budgetRounding: { mode: 'FLOOR', scale: 2 },
      },
    })
  } catch (error) {
    if (error instanceof PayrollDecimalError) fail(error.code === 'INPUT_INVALID' ? 'INPUT_INVALID' : 'NUMERIC_LIMIT', error.message, currentPath)
    throw error
  }
}
