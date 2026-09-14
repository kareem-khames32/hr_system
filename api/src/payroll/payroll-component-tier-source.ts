import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_SRS_VARIABLE_CODES } from './payroll-formula-catalog'
import { PayrollPolicyDefinitionError, validatePayrollPolicyDefinition } from './payroll-policy-definition'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'
import { evaluatePayrollTierPreviewExact, PAYROLL_TIER_ENGINE_VERSION, PayrollTierPreviewError } from './payroll-tier-preview'
import type { PayrollTierPreviewDayDto } from './payroll-tier-preview.dto'

export const PAYROLL_COMPONENT_TIER_SOURCE_VERSION = 'SRS_COMPONENT_TIER_SOURCE_V1_20260913' as const
export const PAYROLL_COMPONENT_TIER_SOURCE_LIMITS = Object.freeze({ inputNodes: 50000, nesting: 20, evaluationSteps: 2000000, sourceRefCharacters: 200 })
export interface PayrollComponentTierSourceInput {
  expectedRevision: number; periodStart: string; periodEnd: string
  basicSalary: string; grossSalary: string; days: PayrollTierPreviewDayDto[]; sourceRef: string
}
export interface PayrollComponentTierSourceContext {
  variables: Readonly<Record<string, PayrollDecimal | null>>
  components: Readonly<Record<string, PayrollDecimal | null>>
  sourceRefs: {
    variables: Readonly<Record<string, readonly string[]>>
    components: Readonly<Record<string, readonly string[]>>
  }
  spend?: () => void
}
export class PayrollComponentTierSourceError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollComponentTierSourceError' }
}
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
function fail(code: string, message: string, path: string): never { throw new PayrollComponentTierSourceError(code, message, path) }
const fraction = (value: PayrollDecimal) => ({ numerator: String(value.numerator), denominator: String(value.denominator) })
const managedVariables = new Set(['BASE_SALARY', 'GROSS_SALARY', 'BASE_DAYS_BASIS', 'STANDARD_DAY_HOURS', 'DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE', 'PERIOD_DAYS', 'LATE_MINUTES', 'LATE_INCIDENTS', 'IS_ATTENDANCE_EXEMPT'])
function object(value: unknown, path: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('COMPONENT_TIER_INPUT_INVALID', 'كائن صريح بلا نموذج موروث مخصص مطلوب', path)
  const result: Record<string, unknown> = Object.create(null)
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || !own(descriptor, 'value') || !descriptor.enumerable) fail('COMPONENT_TIER_INPUT_INVALID', 'خصائص محسوبة أو مخفية أو أسماء حقول غير مسموحة', path)
    result[key] = descriptor.value
  }
  return result
}
function fields(value: unknown, allowed: readonly string[], required: readonly string[], path: string) {
  const result = object(value, path)
  for (const key of Object.keys(result)) if (!allowed.includes(key)) fail('COMPONENT_TIER_INPUT_UNKNOWN', `حقل غير مسموح: ${key}`, `${path}.${key}`)
  for (const key of required) if (!own(result, key)) fail('COMPONENT_TIER_INPUT_REQUIRED', `الحقل ${key} مطلوب`, `${path}.${key}`)
  return result
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

/**
 * مصدر TIERED من لقطة أيام صريحة. لا حضور حي ولا إعفاء مالي أو صافي أو كتابة دفتر.
 * يتجاوز المستدعي البند المعطل/شرطه الخاطئ قبل طلب المصدر؛ الإعفاء المالي يأتي بعده لحفظ الأصل.
 * قيمة المصدر مجموع الأسطر النقدية بعد سقفي الطقم وتقريبها، وليست تقريب مجموع الخام.
 */
export function resolvePayrollComponentTierSource(definition: unknown, settings: PayrollPolicySettings, componentCode: string,
  explicitTierData: unknown, context: PayrollComponentTierSourceContext) {
  let remaining = PAYROLL_COMPONENT_TIER_SOURCE_LIMITS.evaluationSteps, nodes = 0, currentPath = 'input'
  let parentSpend: (() => void) | undefined
  const spend = () => {
    if (--remaining < 0) fail('COMPONENT_TIER_EVALUATION_LIMIT', 'تجاوز مصدر الشرائح ميزانية الحساب التقنية', currentPath)
    parentSpend?.()
  }
  const clone = (value: unknown, path: string, depth = 0): unknown => {
    spend()
    if (++nodes > PAYROLL_COMPONENT_TIER_SOURCE_LIMITS.inputNodes || depth > PAYROLL_COMPONENT_TIER_SOURCE_LIMITS.nesting) fail('COMPONENT_TIER_INPUT_LIMIT', 'حجم أو تعشيش لقطة الشرائح يتجاوز الحد التقني', path)
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (!value || typeof value !== 'object') fail('COMPONENT_TIER_INPUT_INVALID', 'اللقطة تقبل قيم JSON الصريحة فقط', path)
    if (!Array.isArray(value)) return Object.fromEntries(Object.entries(object(value, path)).map(([key, child]) => [key, clone(child, `${path}.${key}`, depth + 1)]))
    if (![Array.prototype, null].includes(Object.getPrototypeOf(value))) fail('COMPONENT_TIER_INPUT_INVALID', 'القائمة لا تقبل نموذجًا موروثًا مخصصًا', path)
    const descriptors = Object.getOwnPropertyDescriptors(value), result: unknown[] = []
    if (value.length > PAYROLL_COMPONENT_TIER_SOURCE_LIMITS.inputNodes || Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || (key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)))) fail('COMPONENT_TIER_INPUT_INVALID', 'قائمة غير صالحة أو تتجاوز الحد التقني', path)
    for (let index = 0; index < value.length; index++) {
      const descriptor = descriptors[String(index)]
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) fail('COMPONENT_TIER_INPUT_INVALID', 'القائمة لا تقبل فراغات أو خصائص محسوبة أو مخفية', `${path}[${index}]`)
      result.push(clone(descriptor.value, `${path}[${index}]`, depth + 1))
    }
    return result
  }
  try {
    const rawContext = fields(context, ['variables', 'components', 'sourceRefs', 'spend'], ['variables', 'components', 'sourceRefs'], 'context')
    if (rawContext.spend !== undefined && typeof rawContext.spend !== 'function') fail('COMPONENT_TIER_INPUT_INVALID', 'ميزانية السياق الداخلي يجب أن تكون دالة', 'context.spend')
    parentSpend = rawContext.spend as (() => void) | undefined
    const settingsCopy = fields(clone(settings, 'settings'), PAYROLL_POLICY_SETTING_FIELDS, PAYROLL_POLICY_SETTING_FIELDS, 'settings')
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(settingsCopy) } catch { fail('COMPONENT_TIER_SETTINGS_INVALID', 'إعدادات نسخة السياسة غير مكتملة أو غير صالحة', 'settings') }
    const checked = validatePayrollPolicyDefinition(clone(definition, 'definition'), policy, { autoOrder: false, typedDeductionCodes: [] }).definition
    const component = checked.components.find(item => item.code === componentCode)
    if (!component || !component.isActive || component.valueSource !== 'TIERED') fail('COMPONENT_TIER_UNAVAILABLE', 'مصدر الشرائح يحتاج بند TIERED نشطًا من التعريف', 'componentCode')
    currentPath = `components.${componentCode}`
    const d = (text: string) => PayrollDecimal.from(text, spend), zero = d('0')
    if (component!.unit !== 'CURRENCY' || component!.multiplier !== null || component!.prorationMode !== 'NONE') fail('COMPONENT_TIER_TRANSFORM_UNSUPPORTED', 'الشرائح تنتج عملة مستحقة للفترة دون تحويل وحدة أو مضاعف أو تناسب ثان', currentPath)
    if (component!.minAmount !== null && d(component!.minAmount).compare(zero) > 0) fail('COMPONENT_TIER_MINIMUM_UNSUPPORTED', 'لا يُرفع مجموع أسطر الشرائح بحد أدنى؛ قد يحيي خصمًا معافى أو يتجاوز سقف الطقم', currentPath)
    const set = checked.tierSets.find(item => item.code === component!.tierSetCode)!
    if (set.inputFormula !== null || !['LATE_MINUTES', 'LATE_INCIDENTS'].includes(set.inputVar ?? '')) fail('COMPONENT_TIER_SOURCE_UNSUPPORTED', 'هذا الربط يدعم أيام التأخير ووقائعه؛ المدخلات الأخرى تحتاج مزود مصدر مستقلًا', currentPath)
    const rawInput = fields(clone(explicitTierData, 'input'), ['expectedRevision', 'periodStart', 'periodEnd', 'basicSalary', 'grossSalary', 'days', 'sourceRef'],
      ['expectedRevision', 'periodStart', 'periodEnd', 'basicSalary', 'grossSalary', 'days', 'sourceRef'], 'input')
    const ref = (value: unknown, path: string) => {
      if (typeof value !== 'string' || !value.trim() || value.length > PAYROLL_COMPONENT_TIER_SOURCE_LIMITS.sourceRefCharacters) fail('COMPONENT_TIER_SOURCE_REF_REQUIRED', 'مرجع مصدر صريح غير فارغ بحد200محرف مطلوب', path)
      return value.trim()
    }
    const sourceRef = ref(rawInput.sourceRef, 'input.sourceRef')
    const priorCodes = checked.components.slice(0, checked.components.indexOf(component!)).map(item => item.code)
    const exactMap = (value: unknown, allowed: readonly string[], path: string) => {
      const copied = fields(value, allowed, [], path), result: Record<string, PayrollDecimal | null> = Object.create(null)
      if (Object.keys(copied).length > 200) fail('COMPONENT_TIER_INPUT_LIMIT', 'قاموس مصدر الشرائح يتجاوز200مدخل', path)
      for (const [key, item] of Object.entries(copied)) {
        spend()
        if (item === null) { result[key] = null; continue }
        if (!(item instanceof PayrollDecimal)) fail('COMPONENT_TIER_INPUT_INVALID', 'السياق الداخلي يقبل PayrollDecimal أو null فقط', `${path}.${key}`)
        const numerator = Object.getOwnPropertyDescriptor(item, 'numerator'), denominator = Object.getOwnPropertyDescriptor(item, 'denominator')
        if (!numerator || !denominator || !own(numerator, 'value') || !own(denominator, 'value') || typeof numerator.value !== 'bigint' || typeof denominator.value !== 'bigint' || denominator.value <= 0n) fail('COMPONENT_TIER_INPUT_INVALID', 'كسر داخلي صالح بخصائص ذاتية صريحة مطلوب', `${path}.${key}`)
        result[key] = new PayrollDecimal(numerator.value, denominator.value, spend)
      }
      return result
    }
    const variables = exactMap(rawContext.variables, PAYROLL_SRS_VARIABLE_CODES, 'context.variables')
    const components = exactMap(rawContext.components, priorCodes, 'context.components')
    const rawRefs = fields(clone(rawContext.sourceRefs, 'context.sourceRefs'), ['variables', 'components'], ['variables', 'components'], 'context.sourceRefs')
    const sourceRefs = { variables: Object.create(null), components: Object.create(null) } as Record<'variables' | 'components', Record<string, string[]>>
    for (const [group, allowed] of [['variables', PAYROLL_SRS_VARIABLE_CODES], ['components', priorCodes]] as const) {
      const values = fields(rawRefs[group], allowed, [], `context.sourceRefs.${group}`)
      for (const [key, list] of Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) {
        if (!Array.isArray(list) || list.length > 200) fail('COMPONENT_TIER_INPUT_INVALID', 'مراجع القيمة قائمة صريحة بحد200مرجع', `context.sourceRefs.${group}.${key}`)
        sourceRefs[group][key] = [...new Set(list.map(item => ref(item, `context.sourceRefs.${group}.${key}`)))].sort()
      }
    }
    // لا تُعاد كتابة BASE/GROSS أو المعدلات في سياق تنفيذ البنود. المنسق يستخدم مصدره الشهري المستقل.
    const preview = evaluatePayrollTierPreviewExact(checked, policy, { expectedRevision: rawInput.expectedRevision, tierSetCode: set.code,
      periodStart: rawInput.periodStart, periodEnd: rawInput.periodEnd, basicSalary: rawInput.basicSalary, grossSalary: rawInput.grossSalary,
      days: rawInput.days, inputs: { variables: {}, components: {} } },
    { variables: Object.fromEntries(Object.entries(variables).filter(([code]) => !managedVariables.has(code))),
      components: Object.fromEntries(Object.entries(components).filter(([code]) => checked.components.find(item => item.code === code)?.isActive)), spend })
    const parseFraction = (value: { numerator: string; denominator: string }) => new PayrollDecimal(BigInt(value.numerator), BigInt(value.denominator), spend)
    const same = (code: string, actual: PayrollDecimal) => {
      if (variables[code] !== undefined && variables[code] !== null && variables[code]!.compare(actual) !== 0) fail('COMPONENT_TIER_CONTEXT_CONFLICT', `قيمة ${code} في سياق البنود تخالف المصدر الصريح المستخدم للشرائح`, `context.variables.${code}`)
    }
    same('DAY_RATE', parseFraction(preview.rates.dayRateExact)); same('HOUR_RATE', parseFraction(preview.rates.hourRateExact)); same('MINUTE_RATE', parseFraction(preview.rates.minuteRateExact))
    same('BASE_DAYS_BASIS', d('30')); same('STANDARD_DAY_HOURS', d(String(policy.dailyHours)))
    same('PERIOD_DAYS', d(String((Date.parse(rawInput.periodEnd as string) - Date.parse(rawInput.periodStart as string)) / 86400000 + 1)))
    const usedReferences = new Set<string>(), valueReferences = new Set<string>()
    const allRefs = new Set([sourceRef])
    for (const day of preview.days) if (day.sourceRef !== null && day.sourceRef.trim()) allRefs.add(day.sourceRef)
    for (const line of preview.lines) for (const portion of line.portions) {
      for (const reference of Object.keys(portion.inputs)) usedReferences.add(reference)
      for (const reference of portion.valueReferences) valueReferences.add(reference)
    }
    for (const reference of [...usedReferences].sort()) {
      const match = /^COMP\[([A-Z][A-Z0-9_]{0,39})\]$/.exec(reference)
      if (match) {
        if (!own(components, match[1]) || components[match[1]] === null) fail('COMPONENT_TIER_RESULT_UNAVAILABLE', `البند ${match[1]} مستخدم داخل شريحة ولم تنتج قيمته قبلها`, `${currentPath}.COMP[${match[1]}]`)
        sourceRefs.components[match[1]]?.forEach(item => allRefs.add(item))
      } else {
        if (reference === 'BASE_SALARY') same(reference, d(rawInput.basicSalary as string))
        if (reference === 'GROSS_SALARY') same(reference, d(rawInput.grossSalary as string))
        if (!['LATE_MINUTES', 'LATE_INCIDENTS', 'IS_ATTENDANCE_EXEMPT'].includes(reference)) sourceRefs.variables[reference]?.forEach(item => allRefs.add(item))
      }
    }
    // Σ المبالغ المقربة بالفعل هو المبلغ المالي؛ لا تُستخدم rawAmount ولا الأسعار المعروضة بست منازل.
    const value = preview.lines.reduce((sum, line) => sum.add(d(line.amount)), zero)
    if (value.compare(d(preview.total)) !== 0) fail('COMPONENT_TIER_TOTAL_MISMATCH', 'مجموع أسطر الشرائح لا يطابق إجمالي المصدر', currentPath)
    const normalizedContext = (map: Record<string, PayrollDecimal | null>) => Object.fromEntries(Object.entries(map).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, amount]) => [key, amount === null ? null : fraction(amount)]))
    const normalizedInput = { expectedRevision: rawInput.expectedRevision, periodStart: rawInput.periodStart, periodEnd: rawInput.periodEnd,
      basicSalary: d(rawInput.basicSalary as string).canonical(), grossSalary: d(rawInput.grossSalary as string).canonical(), sourceRef,
      days: [...(rawInput.days as PayrollTierPreviewDayDto[])].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
        .map(day => ({ date: day.date, sourceRef: day.sourceRef, rawLateSeconds: d(day.rawLateSeconds).canonical(),
          excusedLateSeconds: d(day.excusedLateSeconds).canonical(), flexibleStartEnabled: day.flexibleStartEnabled,
          attendanceExempt: day.attendanceExempt, shiftGraceMinutes: day.shiftGraceMinutes })),
      context: { variables: normalizedContext(variables), components: normalizedContext(components), sourceRefs } }
    return { value, alreadyProrated: true as const, sourceRefs: [...allRefs].sort(), trace: freeze({ engineVersion: PAYROLL_COMPONENT_TIER_SOURCE_VERSION,
      tierEngineVersion: PAYROLL_TIER_ENGINE_VERSION, sourceValidation: 'EXPLICIT_UNVERIFIED' as const, componentCode, tierSetCode: set.code,
      normalizedInput, references: [...usedReferences].sort(), valueReferences: [...valueReferences].sort(), preview }) }
  } catch (error) {
    if (error instanceof PayrollComponentTierSourceError) throw error
    if (error instanceof PayrollTierPreviewError || error instanceof PayrollPolicyDefinitionError) throw new PayrollComponentTierSourceError(error.code, error.message, error.path)
    if (error instanceof PayrollDecimalError) throw new PayrollComponentTierSourceError(error.code, error.message, currentPath)
    throw error
  }
}
