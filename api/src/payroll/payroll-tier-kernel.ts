import { PayrollDecimal, PayrollDecimalError, PayrollRoundingMode } from './payroll-decimal'
import { compilePayrollFormula, evaluatePayrollFormulaExact, PayrollExactFormulaMap, PayrollFormulaError } from './payroll-formula-engine'
import { PAYROLL_SRS_VARIABLE_CODES, validatePayrollFormulaSymbols } from './payroll-formula-catalog'
import type { PayrollPolicyDefinition } from './payroll-policy-definition'

export type PayrollTierSet = PayrollPolicyDefinition['tierSets'][number]
type Tier = PayrollTierSet['tiers'][number]
export const PAYROLL_TIER_KERNEL_VERSION = 'SRS_TIER_KERNEL_V1_20260913' as const
export const PAYROLL_TIER_KERNEL_LIMITS = Object.freeze({ tiers: 1000, evaluationSteps: 200000 })
export interface PayrollTierExactFraction { numerator: string; denominator: string }
export interface PayrollTierKernelContext {
  dayRate: PayrollDecimal; hourRate: PayrollDecimal; minuteRate: PayrollDecimal
  variables: PayrollExactFormulaMap; components: PayrollExactFormulaMap; parameters: PayrollExactFormulaMap
  typedDeductions?: PayrollExactFormulaMap
  roundingMode: PayrollRoundingMode; divisionByZeroMode: 'ZERO_WITH_WARNING' | 'FAIL_ROW'
  /** ميزانية المنسق المشتركة لكل الأيام، إضافةً إلى حد النواة الفردية. */
  spend?: () => void
}
export interface PayrollTierKernelWarning {
  code: string; message: string; path: string; tierSequence: number | null
  position?: number; reference?: string; expression?: string
}
export interface PayrollTierPortionTrace {
  source: 'TIER' | 'NO_MATCH'; tierSequence: number | null; label: string | null
  fromValue: string; toValue: string | null; method: Tier['method']; inputUnit: PayrollTierSet['inputUnit']
  effectiveInput: string; portionValue: string; portionExact: PayrollTierExactFraction
  amountRaw6: string; amountExact: PayrollTierExactFraction
  formula: string; substitutedExpression: string; inputs: Record<string, string>
  /** المراجع المؤثرة في المبلغ؛ شروط IF تبقى في inputs دون توريث قيمة الفرع منها. */
  valueReferences: string[]
  clampedFromRaw6: string | null; clampedFromExact: PayrollTierExactFraction | null
  skippedReason: 'ZERO_PORTION' | null
}
export interface PayrollTierKernelResult {
  amount: PayrollDecimal; portions: PayrollTierPortionTrace[]; warnings: PayrollTierKernelWarning[]
}
export class PayrollTierKernelError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollTierKernelError' }
}
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
function fail(code: string, message: string, path: string): never { throw new PayrollTierKernelError(code, message, path) }
function field(object: unknown, key: string, path: string): unknown {
  if (!object || typeof object !== 'object' || Array.isArray(object)) fail('TIER_INPUT_INVALID', 'كائن مدخل صالح مطلوب', path)
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  if (!descriptor || !own(descriptor, 'value')) fail('TIER_INPUT_INVALID', 'حقل ذاتي صريح مطلوب؛ الخصائص المحسوبة غير مسموحة', `${path}.${key}`)
  return descriptor.value
}
function exact(value: unknown, spend: () => void, path: string): PayrollDecimal {
  if (!(value instanceof PayrollDecimal)) fail('TIER_INPUT_INVALID', 'القيمة الداخلية يجب أن تكون كسرًا عشريًا دقيقًا', path)
  const numerator = field(value, 'numerator', path), denominator = field(value, 'denominator', path)
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') fail('TIER_INPUT_INVALID', 'بسط الكسر ومقامه غير صالحين', path)
  return new PayrollDecimal(numerator, denominator, spend)
}
function fraction(value: PayrollDecimal): PayrollTierExactFraction { return { numerator: String(value.numerator), denominator: String(value.denominator) } }
function displayExact(value: PayrollDecimal): string {
  try { return value.canonical() } catch (error) {
    if (!(error instanceof PayrollDecimalError) || error.code !== 'INPUT_INVALID') throw error
    return `${value.numerator}/${value.denominator}`
  }
}
function record(value: unknown, path: string): PayrollExactFormulaMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('TIER_INPUT_INVALID', 'قاموس مدخلات صريح مطلوب', path)
  const copy: Record<string, PayrollDecimal | string | number | null> = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !/^[A-Z][A-Z0-9_]{0,39}$/.test(key)) fail('TIER_INPUT_INVALID', 'اسم غير صالح في قاموس المدخلات', path)
    copy[key] = field(value, key, path) as PayrollDecimal | string | number | null
  }
  return copy
}

/** نواة شريحة واحدة أو حصصها؛ تجهيز الأيام والسماح والسقوف والتقريب النهائي مسؤولية المنسق. */
export function evaluatePayrollTierValue(set: PayrollTierSet, input: PayrollDecimal, context: PayrollTierKernelContext): PayrollTierKernelResult {
  let remaining = PAYROLL_TIER_KERNEL_LIMITS.evaluationSteps, currentPath = 'tierSet'
  const parentSpend = context && typeof context === 'object' && own(context, 'spend') ? field(context, 'spend', 'context') : undefined
  if (parentSpend !== undefined && typeof parentSpend !== 'function') fail('TIER_OPTIONS_INVALID', 'ميزانية المنسق الداخلية يجب أن تكون دالة', 'context.spend')
  const spend = () => {
    if (--remaining < 0) fail('TIER_EVALUATION_LIMIT', 'تجاوز حساب طقم الشرائح ميزانية التعقيد المسموح بها', currentPath)
    parentSpend?.()
  }
  try {
    const decimal = (value: unknown, path: string) => {
      if (typeof value !== 'string') fail('TIER_DEFINITION_INVALID', 'قيمة الشريحة يجب أن تكون نصًا عشريًا', path)
      return PayrollDecimal.from(value, spend)
    }
    const zero = new PayrollDecimal(0n, 1n, spend), one = new PayrollDecimal(1n, 1n, spend)
    currentPath = 'input'; const effective = exact(input, spend, currentPath)
    if (effective.compare(zero) < 0) fail('TIER_INPUT_INVALID', 'مدخل الشريحة لا يقبل قيمة سالبة', currentPath)
    currentPath = 'context'
    const dayRate = exact(field(context, 'dayRate', currentPath), spend, 'context.dayRate')
    const hourRate = exact(field(context, 'hourRate', currentPath), spend, 'context.hourRate')
    const minuteRate = exact(field(context, 'minuteRate', currentPath), spend, 'context.minuteRate')
    if ([dayRate, hourRate, minuteRate].some(value => value.compare(zero) < 0)) fail('TIER_RATE_INVALID', 'أسعار الأساس لا تقبل قيمة سالبة', currentPath)
    const roundingMode = field(context, 'roundingMode', currentPath) as PayrollRoundingMode
    const divisionByZeroMode = field(context, 'divisionByZeroMode', currentPath) as PayrollTierKernelContext['divisionByZeroMode']
    if (!['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL'].includes(roundingMode) || !['ZERO_WITH_WARNING', 'FAIL_ROW'].includes(divisionByZeroMode)) fail('TIER_OPTIONS_INVALID', 'قاعدة التقريب أو القسمة غير صالحة', currentPath)
    const variables = record(field(context, 'variables', currentPath), 'context.variables')
    const components = record(field(context, 'components', currentPath), 'context.components')
    const parameters = record(field(context, 'parameters', currentPath), 'context.parameters')
    const typedDeductions = own(context, 'typedDeductions') ? record(field(context, 'typedDeductions', currentPath), 'context.typedDeductions') : {}
    for (const key of Object.keys(variables)) if (!PAYROLL_SRS_VARIABLE_CODES.includes(key)) fail('TIER_INPUT_INVALID', `متغير خارج كتالوج السياسة: ${key}`, `context.variables.${key}`)
    const symbols = { components: Object.keys(components), parameters: Object.keys(parameters), typedDeductions: Object.keys(typedDeductions) }
    try { validatePayrollFormulaSymbols(symbols) } catch (error) {
      fail('TIER_SYMBOLS_INVALID', error instanceof Error ? error.message : 'رموز مدخلات السياسة غير صالحة', 'context')
    }

    currentPath = 'tierSet'
    const code = field(set, 'code', currentPath)
    if (typeof code !== 'string' || !/^[A-Z][A-Z0-9_]{0,39}$/.test(code)) fail('TIER_DEFINITION_INVALID', 'كود طقم الشرائح غير صالح', currentPath)
    currentPath = `tierSets.${code}`
    if (field(set, 'isActive', currentPath) !== true) fail('TIER_INACTIVE', 'لا يمكن حساب طقم شرائح غير مفعّل', currentPath)
    const mode = field(set, 'tierApplicationMode', currentPath)
    const unit = field(set, 'inputUnit', currentPath) as PayrollTierSet['inputUnit']
    const noMatch = field(set, 'noMatchBehavior', currentPath)
    const inputVar = field(set, 'inputVar', currentPath), inputFormula = field(set, 'inputFormula', currentPath)
    if (typeof mode !== 'string' || !['WHOLE', 'MARGINAL'].includes(mode) || typeof unit !== 'string' || !['MINUTES', 'COUNT', 'HOURS', 'DAYS', 'CURRENCY'].includes(unit) || typeof noMatch !== 'string' || !['NO_DEDUCTION', 'FALLBACK_1_1', 'BLOCK'].includes(noMatch)) fail('TIER_DEFINITION_INVALID', 'نوع التطبيق أو الوحدة أو عدم المطابقة غير صالح', currentPath)
    if ((inputVar === null) === (inputFormula === null) || (inputVar !== null && (typeof inputVar !== 'string' || !PAYROLL_SRS_VARIABLE_CODES.includes(inputVar))) || (inputFormula !== null && (typeof inputFormula !== 'string' || !inputFormula.trim() || inputFormula.length > 500))) fail('TIER_DEFINITION_INVALID', 'متغير المدخل أو معادلته مطلوب وحده', currentPath)
    if (['MINUTES', 'COUNT'].includes(unit) && effective.denominator !== 1n) fail('TIER_INPUT_UNIT', 'الدقائق وعدد الوقائع يجب أن يصلا كعدد صحيح بعد التجهيز', 'input')
    if (unit === 'COUNT' && noMatch === 'FALLBACK_1_1') fail('TIER_RATE_UNIT', 'لا يوجد سعر زمني لعدد الوقائع', currentPath)
    const rawTiers = field(set, 'tiers', currentPath)
    if (!Array.isArray(rawTiers) || rawTiers.length > PAYROLL_TIER_KERNEL_LIMITS.tiers) fail('TIER_COLLECTION_LIMIT', 'قائمة الشرائح مطلوبة وبحد أقصى1000شريحة', currentPath)
    const active: Array<{ tier: Tier; from: PayrollDecimal; to: PayrollDecimal | null }> = []
    const sequences = new Set<number>()
    for (let index = 0; index < rawTiers.length; index++) {
      spend()
      const itemDescriptor = Object.getOwnPropertyDescriptor(rawTiers, index)
      if (!itemDescriptor || !own(itemDescriptor, 'value')) fail('TIER_DEFINITION_INVALID', 'قائمة الشرائح لا تقبل فراغًا أو خاصية محسوبة', currentPath)
      const raw: unknown = itemDescriptor.value, path = `${currentPath}.tiers[${index}]`
      const copied = Object.fromEntries(['sequence', 'fromValue', 'toValue', 'method', 'multiplier', 'dayFraction', 'fixedAmount', 'formula', 'label', 'isActive'].map(key => [key, field(raw, key, path)])) as unknown as Tier
      if (!Number.isInteger(copied.sequence) || copied.sequence < 1 || copied.sequence > 2147483647 || sequences.has(copied.sequence)) fail('TIER_DEFINITION_INVALID', 'تسلسل الشريحة يجب أن يكون عددًا موجبًا فريدًا', path)
      sequences.add(copied.sequence)
      const from = decimal(copied.fromValue, path), to = copied.toValue === null ? null : decimal(copied.toValue, path)
      if (from.compare(zero) < 0 || (to !== null && to.compare(from) <= 0)) fail('TIER_BOUNDS_INVALID', 'حدود الشريحة يجب أن تكون موجبة ومتزايدة', path)
      if (['MINUTES', 'COUNT'].includes(unit) && (from.denominator !== 1n || (to && to.denominator !== 1n))) fail('TIER_INPUT_UNIT', 'حدود الدقائق والوقائع أعداد صحيحة', path)
      if (typeof copied.isActive !== 'boolean' || (copied.label !== null && typeof copied.label !== 'string')) fail('TIER_DEFINITION_INVALID', 'تفعيل الشريحة أو تسميتها غير صالح', path)
      const parameter = { NONE: null, MULTIPLIER: 'multiplier', DAY_FRACTION: 'dayFraction', RATE_1_1: null, FIXED_AMOUNT: 'fixedAmount', FORMULA: 'formula' } as const
      if (typeof copied.method !== 'string' || !own(parameter, copied.method)) fail('TIER_METHOD_INVALID', 'طريقة حساب الشريحة غير معروفة', path)
      const required = parameter[copied.method]
      for (const key of ['multiplier', 'dayFraction', 'fixedAmount', 'formula'] as const) {
        if (key !== required && copied[key] !== null) fail('TIER_METHOD_INVALID', 'حقول طريقة أخرى لا يجوز أن تدخل حساب الشريحة', path)
        if (key === required) {
          if (key === 'formula') {
            if (typeof copied[key] !== 'string' || !copied[key]!.trim() || copied[key]!.length > 500) fail('TIER_METHOD_INVALID', 'نص معادلة الشريحة غير صالح', path)
          } else {
            const value = decimal(copied[key], `${path}.${key}`)
            if (value.compare(zero) <= 0 || (key === 'dayFraction' && value.compare(one) > 0)) fail('TIER_METHOD_INVALID', 'معامل الشريحة موجب وكسر اليوم لا يتجاوز1', path)
          }
        }
      }
      if (unit === 'COUNT' && ['MULTIPLIER', 'RATE_1_1'].includes(copied.method)) fail('TIER_RATE_UNIT', 'عدد الوقائع لا يُضرب في سعر زمني', path)
      if (copied.isActive) active.push({ tier: copied, from, to })
    }
    active.sort((left, right) => left.from.compare(right.from))
    if (!active.length || active[active.length - 1].to !== null) fail('TIER_BOUNDS_INVALID', 'طقم مفعّل متصل ذو نهاية مفتوحة مطلوب', currentPath)
    for (let index = 1; index < active.length; index++) if (!active[index - 1].to || active[index - 1].to!.compare(active[index].from) !== 0) fail('TIER_BOUNDS_INVALID', 'فجوة أو تداخل في الشرائح المفعّلة', currentPath)
    const portions: PayrollTierPortionTrace[] = [], warnings: PayrollTierKernelWarning[] = []
    let amount = zero
    // لا تأخير يعني لا خصم، حتى لو بدأت شريحة ثابتة أو معادلة عند الصفر.
    if (effective.isZero()) return { amount, portions, warnings }
    const rate = unit === 'MINUTES' ? minuteRate : unit === 'HOURS' ? hourRate : unit === 'DAYS' ? dayRate : one
    const append = (entry: { tier: Tier; from: PayrollDecimal; to: PayrollDecimal | null } | null, portion: PayrollDecimal) => {
      spend()
      const tier = entry?.tier, sequence = tier?.sequence ?? null
      const path = `${currentPath}.${tier ? `tiers.${sequence}` : 'noMatch'}`
      const method = tier?.method ?? (noMatch === 'FALLBACK_1_1' ? 'RATE_1_1' : 'NONE')
      let value = zero, formula = '0', substitutedExpression = '0', inputs: Record<string, string> = {}, valueReferences: string[] = []
      const skipped = mode === 'MARGINAL' && portion.isZero() && method === 'FORMULA'
      if (!tier) {
        if (noMatch === 'BLOCK') fail('TIER_NO_MATCH', 'المدخل يستخدم نطاقًا بلا شريحة مطابقة؛ المعاينة متوقفة', path)
        warnings.push({ code: 'NO_TIER_MATCH', message: noMatch === 'FALLBACK_1_1' ? 'لا شريحة مطابقة؛ طُبق سعر الوحدة دون مضاعف' : 'لا شريحة مطابقة؛ لم يُطبق خصم', path, tierSequence: null })
      }
      if (method === 'MULTIPLIER' || method === 'RATE_1_1') {
        const multiplier = tier?.multiplier === null || !tier ? one : decimal(tier.multiplier, path)
        value = portion.multiply(multiplier).multiply(rate)
        formula = 'INPUT × MULTIPLIER × UNIT_RATE'
        inputs = { INPUT: displayExact(portion), MULTIPLIER: displayExact(multiplier), UNIT_RATE: displayExact(rate) }
        substitutedExpression = `(${inputs.INPUT}) * (${inputs.MULTIPLIER}) * (${inputs.UNIT_RATE})`
      } else if (method === 'DAY_FRACTION') {
        const dayFraction = decimal(tier!.dayFraction, path)
        value = dayFraction.multiply(dayRate); formula = 'DAY_FRACTION × DAY_RATE'
        inputs = { DAY_FRACTION: displayExact(dayFraction), DAY_RATE: displayExact(dayRate) }
        substitutedExpression = `(${inputs.DAY_FRACTION}) * (${inputs.DAY_RATE})`
      } else if (method === 'FIXED_AMOUNT') {
        value = decimal(tier!.fixedAmount, path); formula = 'FIXED_AMOUNT'
        inputs = { FIXED_AMOUNT: displayExact(value) }; substitutedExpression = inputs.FIXED_AMOUNT
      } else if (method === 'FORMULA') {
        formula = tier!.formula!
        if (skipped) substitutedExpression = formula
        else {
          const compiled = compilePayrollFormula(formula, { variables: [...PAYROLL_SRS_VARIABLE_CODES], ...symbols, kind: 'AMOUNT', roundingMode })
          // المتغير المحلي وحده يتبع الحصة؛ مدخلات المعادلة المركبة لا يُعاد تعريفها ضمنيًا.
          const local = { ...variables, ...(typeof inputVar === 'string' ? { [inputVar]: portion } : {}), DAY_RATE: dayRate, HOUR_RATE: hourRate, MINUTE_RATE: minuteRate }
          const evaluated = evaluatePayrollFormulaExact(compiled, { variables: local, components, parameters, typedDeductions }, { roundingMode, divisionByZeroMode, spend })
          if (typeof evaluated.exactValue === 'boolean') fail('TIER_FORMULA_TYPE', 'معادلة خصم الشريحة يجب أن تعيد قيمة رقمية', path)
          value = exact(evaluated.exactValue, spend, path); inputs = evaluated.inputs; substitutedExpression = evaluated.substitutedExpression
          valueReferences = evaluated.valueReferences
          for (const warning of evaluated.warnings) warnings.push({ ...warning, path, tierSequence: sequence })
        }
      }
      if (method !== 'FORMULA') valueReferences = Object.keys(inputs).sort()
      const negative = value.compare(zero) < 0 ? value : null
      if (negative) {
        value = zero
        warnings.push({ code: 'NEGATIVE_DEDUCTION_CLAMPED', message: 'نتج خصم سالب من الشريحة؛ طُبق صفر وحُفظ الناتج الأصلي', path, tierSequence: sequence })
      }
      amount = amount.add(value)
      portions.push({ source: tier ? 'TIER' : 'NO_MATCH', tierSequence: sequence, label: tier?.label ?? null,
        fromValue: entry ? displayExact(entry.from) : '0', toValue: entry ? (entry.to ? displayExact(entry.to) : null) : displayExact(active[0].from),
        method, inputUnit: unit, effectiveInput: displayExact(effective), portionValue: displayExact(portion), portionExact: fraction(portion),
        amountRaw6: value.format(6, 'HALF_UP'), amountExact: fraction(value), formula, substitutedExpression, inputs, valueReferences,
        clampedFromRaw6: negative?.format(6, 'HALF_UP') ?? null, clampedFromExact: negative ? fraction(negative) : null,
        skippedReason: skipped ? 'ZERO_PORTION' : null })
    }
    if (mode === 'WHOLE') {
      const matched = active.find(entry => effective.compare(entry.from) >= 0 && (entry.to === null || effective.compare(entry.to) < 0))
      append(matched ?? null, effective)
    } else {
      if (active[0].from.compare(zero) > 0) append(null, effective.compare(active[0].from) < 0 ? effective : active[0].from)
      for (const entry of active) {
        if (effective.compare(entry.from) < 0) break
        const upper = entry.to !== null && entry.to.compare(effective) < 0 ? entry.to : effective
        // اختيار المستخدم: الثابت وكسر اليوم كاملان منذ بداية النطاق، حتى عند حصة صفر.
        append(entry, upper.subtract(entry.from))
      }
    }
    return { amount, portions, warnings }
  } catch (error) {
    if (error instanceof PayrollDecimalError || error instanceof PayrollFormulaError) throw new PayrollTierKernelError(error.code, error.message, currentPath)
    throw error
  }
}
