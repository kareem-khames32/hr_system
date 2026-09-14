import { PayrollDecimal, PayrollDecimalError, PayrollRoundingMode } from './payroll-decimal'
import { PAYROLL_SRS_VARIABLE_CODES } from './payroll-formula-catalog'
import { PayrollFormulaError } from './payroll-formula-engine'
import { PayrollPolicyDefinition, PayrollPolicyDefinitionError, validatePayrollPolicyDefinition } from './payroll-policy-definition'
import type { PayrollPolicySettings } from './payroll-policy-settings'
import type { PayrollTierPreviewDto } from './payroll-tier-preview.dto'
import { evaluatePayrollTierValue, PayrollTierKernelError, PayrollTierKernelResult } from './payroll-tier-kernel'

export const PAYROLL_TIER_ENGINE_VERSION = 'SRS_TIERS_V1_20260913' as const
export const PAYROLL_TIER_PREVIEW_LIMITS = Object.freeze({ days: 366, evaluationSteps: 2000000 })
/** سياق داخلي فقط: نتائج البنود والمصادر الدقيقة لا تمر عبر DTO المعاينة العامة. */
export interface PayrollTierPreviewExactContext {
  variables: Readonly<Record<string, PayrollDecimal | null>>
  components: Readonly<Record<string, PayrollDecimal | null>>
  spend?: () => void
}
export class PayrollTierPreviewError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollTierPreviewError' }
}
function fail(code: string, message: string, path: string): never { throw new PayrollTierPreviewError(code, message, path) }
const zero = () => PayrollDecimal.from('0')
const minimum = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) < 0 ? a : b
const positive = (value: PayrollDecimal) => value.compare(zero()) > 0 ? value : zero()
const exact = (value: PayrollDecimal) => ({ numerator: value.numerator.toString(), denominator: value.denominator.toString() })
const managedVariables = new Set(['BASE_SALARY', 'GROSS_SALARY', 'BASE_DAYS_BASIS', 'STANDARD_DAY_HOURS', 'DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE', 'PERIOD_DAYS', 'LATE_MINUTES', 'LATE_INCIDENTS', 'IS_ATTENDANCE_EXEMPT'])
const rootFields = ['expectedRevision', 'tierSetCode', 'periodStart', 'periodEnd', 'basicSalary', 'grossSalary', 'days', 'inputs']
const dayFields = ['date', 'sourceRef', 'rawLateSeconds', 'excusedLateSeconds', 'flexibleStartEnabled', 'attendanceExempt', 'shiftGraceMinutes']

function plainSnapshot(input: unknown): unknown {
  let nodes = 0
  const visit = (value: unknown, path: string, depth: number): unknown => {
    if (++nodes > 30000 || depth > 12) return fail('TIER_PREVIEW_INPUT_LIMIT', 'تجاوزت مدخلات المعاينة الحد التقني المسموح', path)
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value !== 'object') return fail('TIER_PREVIEW_INPUT_INVALID', 'مدخلات المعاينة يجب أن تكون قيم JSON صريحة', path)
    if (Array.isArray(value)) {
      const entries = Object.getOwnPropertyDescriptors(value)
      if (Reflect.ownKeys(entries).some(key => typeof key !== 'string' || (key !== 'length' && !/^(0|[1-9]\d*)$/.test(key)))) return fail('TIER_PREVIEW_INPUT_INVALID', 'قائمة المعاينة تحمل حقولًا غير صالحة', path)
      const result: unknown[] = []
      for (let index = 0; index < value.length; index++) {
        const descriptor = entries[String(index)]
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return fail('TIER_PREVIEW_INPUT_INVALID', 'القائمة لا تقبل فراغات أو خصائص محسوبة', path)
        result.push(visit(descriptor.value, `${path}[${index}]`, depth + 1))
      }
      return result
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return fail('TIER_PREVIEW_INPUT_INVALID', 'المعاينة لا تقبل خصائص موروثة', path)
    const result: Record<string, unknown> = Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) return fail('TIER_PREVIEW_INPUT_INVALID', 'اسم حقل غير مسموح', path)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return fail('TIER_PREVIEW_INPUT_INVALID', 'المعاينة لا تقبل خصائص محسوبة', path)
      result[key] = visit(descriptor.value, `${path}.${key}`, depth + 1)
    }
    return result
  }
  return visit(input, 'input', 0)
}
function fields(value: unknown, names: string[], path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('TIER_PREVIEW_INPUT_INVALID', 'كائن مطلوب للمعاينة', path)
  const keys = Object.keys(value!)
  if (keys.length !== names.length || keys.some(key => !names.includes(key))) fail('TIER_PREVIEW_INPUT_INVALID', 'حقول المعاينة مطلوبة كاملة ولا تقبل حقولًا إضافية', path)
}
function date(value: unknown, path: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return fail('TIER_PREVIEW_DATE_INVALID', 'التاريخ بصيغة YYYY-MM-DD', path)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return fail('TIER_PREVIEW_DATE_INVALID', 'تاريخ المعاينة غير صالح', path)
  return value
}
function decimal(value: unknown, path: string, nonnegative = false) {
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return fail('TIER_PREVIEW_INPUT_INVALID', 'استخدم نصًا عشريًا صالحًا للقيمة', path)
  const parsed = PayrollDecimal.from(value)
  if (nonnegative && parsed.compare(zero()) < 0) return fail('TIER_PREVIEW_INPUT_INVALID', 'القيمة يجب ألا تكون سالبة', path)
  return parsed
}
function inputsMap(value: unknown, allowed: Set<string>, path: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 200) return fail('TIER_PREVIEW_INPUT_INVALID', 'قائمة قيم المعاينة غير صالحة', path)
  const result: Record<string, PayrollDecimal | null> = Object.create(null)
  for (const key of Object.keys(value).sort()) {
    if (!allowed.has(key)) return fail('TIER_PREVIEW_INPUT_UNKNOWN', `المدخل ${key} غير متاح أو يحسبه النظام من اللقطة`, `${path}.${key}`)
    const raw = (value as Record<string, unknown>)[key]
    result[key] = raw === null ? null : decimal(raw, `${path}.${key}`)
  }
  return result
}

// المنسق يعمل على لقطة أيام تجريبية كاملة؛ لا يستعلم عن بصمات ولا يعدّل مسيرًا أو عداد سماح حيًا.
export function evaluatePayrollTierPreview(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: unknown) {
  return run(definition, settings, input)
}

export function evaluatePayrollTierPreviewExact(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: unknown, context: PayrollTierPreviewExactContext) {
  return run(definition, settings, input, context)
}

function run(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: unknown, context?: PayrollTierPreviewExactContext) {
  try { return evaluate(definition, settings, input, context) }
  catch (error) {
    if (error instanceof PayrollTierPreviewError) throw error
    if (error instanceof PayrollTierKernelError) throw new PayrollTierPreviewError(error.code, error.message, error.path)
    if (error instanceof PayrollFormulaError) throw new PayrollTierPreviewError(error.code, error.message, `formula:${error.position}`)
    if (error instanceof PayrollPolicyDefinitionError) throw new PayrollTierPreviewError(error.code, error.message, error.path)
    if (error instanceof PayrollDecimalError) throw new PayrollTierPreviewError(error.code, error.message, 'input')
    throw error
  }
}

function evaluate(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: unknown, context?: PayrollTierPreviewExactContext) {
  let parentSpend: (() => void) | undefined
  const internal = (value: unknown, names: string[], path: string) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('TIER_PREVIEW_INPUT_INVALID', 'السياق الداخلي يحتاج كائنًا صريحًا', path)
    const copied: Record<string, unknown> = Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (typeof key !== 'string' || !names.includes(key) || !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.enumerable) fail('TIER_PREVIEW_INPUT_INVALID', 'خاصية غير صالحة في السياق الداخلي', path)
      copied[key] = descriptor.value
    }
    return copied
  }
  let exactContext: { variables: unknown; components: unknown } | undefined
  if (context !== undefined) {
    const copied = internal(context, ['variables', 'components', 'spend'], 'context')
    if (copied.spend !== undefined && typeof copied.spend !== 'function') fail('TIER_PREVIEW_INPUT_INVALID', 'ميزانية السياق الداخلي يجب أن تكون دالة', 'context.spend')
    parentSpend = copied.spend as (() => void) | undefined
    exactContext = { variables: copied.variables, components: copied.components }
  }
  let remainingSteps = PAYROLL_TIER_PREVIEW_LIMITS.evaluationSteps
  const spend = () => {
    if (--remainingSteps < 0) fail('TIER_PREVIEW_EVALUATION_LIMIT', 'تجاوزت المعاينة ميزانية الحساب التقنية؛ قلل حجم العينة أو تعقيد الشرائح', 'days')
    parentSpend?.()
  }
  const exactMap = (value: unknown, allowed: Set<string>, path: string) => {
    const copied = internal(value, [...allowed], path), result: Record<string, PayrollDecimal | null> = Object.create(null)
    if (Object.keys(copied).length > 200) fail('TIER_PREVIEW_INPUT_INVALID', 'السياق يتجاوز الحد التقني للمدخلات', path)
    for (const [key, item] of Object.entries(copied)) {
      spend()
      if (item === null) { result[key] = null; continue }
      if (!(item instanceof PayrollDecimal)) fail('TIER_PREVIEW_INPUT_INVALID', 'السياق الداخلي يقبل PayrollDecimal أو null فقط', `${path}.${key}`)
      const numerator = Object.getOwnPropertyDescriptor(item, 'numerator'), denominator = Object.getOwnPropertyDescriptor(item, 'denominator')
      if (!numerator || !denominator || !Object.prototype.hasOwnProperty.call(numerator, 'value') || !Object.prototype.hasOwnProperty.call(denominator, 'value') || typeof numerator.value !== 'bigint' || typeof denominator.value !== 'bigint' || denominator.value <= 0n) fail('TIER_PREVIEW_INPUT_INVALID', 'كسر داخلي صريح صالح مطلوب', `${path}.${key}`)
      result[key] = new PayrollDecimal(numerator.value, denominator.value, spend)
    }
    return result
  }
  const checked = validatePayrollPolicyDefinition(definition, settings, { typedDeductionCodes: [] }).definition
  const snapshot = plainSnapshot(input)
  fields(snapshot, rootFields, 'input')
  const dto = snapshot as unknown as PayrollTierPreviewDto
  if (!Number.isSafeInteger(dto.expectedRevision) || dto.expectedRevision < 1 || typeof dto.tierSetCode !== 'string' || !/^[A-Z][A-Z0-9_]{0,39}$/.test(dto.tierSetCode)) fail('TIER_PREVIEW_INPUT_INVALID', 'رقم المراجعة أو كود الطقم غير صالح', 'input')
  const periodStart = date(dto.periodStart, 'periodStart'), periodEnd = date(dto.periodEnd, 'periodEnd')
  const periodDays = (Date.parse(periodEnd) - Date.parse(periodStart)) / 86400000 + 1
  if (periodDays < 1 || periodDays > PAYROLL_TIER_PREVIEW_LIMITS.days) fail('TIER_PREVIEW_DATE_INVALID', 'المعاينة تحتاج فترة مرتبة لا تتجاوز 366 يومًا', 'periodEnd')
  const set = checked.tierSets.find(item => item.code === dto.tierSetCode)
  if (!set || !set.isActive) fail('TIER_PREVIEW_SET_UNAVAILABLE', 'طقم الشرائح غير موجود أو معطل', 'tierSetCode')
  if (set!.inputFormula !== null || !['LATE_MINUTES', 'LATE_INCIDENTS'].includes(set!.inputVar ?? '')) fail('TIER_PREVIEW_SOURCE_UNSUPPORTED', 'هذه المعاينة لأيام التأخير ووقائعه؛ معادلة المدخل والمصادر الأخرى تحتاج محرك مصادر القيم', 'tierSetCode')
  for (const key of ['basicSalary', 'grossSalary'] as const) if (typeof dto[key] !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(dto[key])) fail('TIER_PREVIEW_INPUT_INVALID', 'الراتب الشهري نص عشري ضمن دقة 18 رقمًا ومنزلتين', key)
  const basic = decimal(dto.basicSalary, 'basicSalary', true), gross = decimal(dto.grossSalary, 'grossSalary', true)
  if (gross.compare(basic) < 0) fail('TIER_PREVIEW_INPUT_INVALID', 'إجمالي الراتب الشهري لا يقل عن الأساسي', 'grossSalary')
  const deductionBase = settings.rateBase === 'GROSS' ? gross : basic
  const dayRate = deductionBase.divide(PayrollDecimal.from(String(settings.monthlyDays)))
  const hourRate = dayRate.divide(PayrollDecimal.from(String(settings.dailyHours))), minuteRate = hourRate.divide(PayrollDecimal.from('60'))
  const mode: PayrollRoundingMode = set!.roundingMode ?? settings.roundingMode, scale = set!.roundingScale ?? settings.roundingScale
  fields(dto.inputs, ['variables', 'components'], 'inputs')
  const allowedVariables = new Set(PAYROLL_SRS_VARIABLE_CODES.filter(code => !managedVariables.has(code)))
  let suppliedVariables = inputsMap(dto.inputs.variables, allowedVariables, 'inputs.variables')
  const componentCodes = checked.components.filter(item => item.isActive && item.code !== 'NET').map(item => item.code)
  let suppliedComponents = inputsMap(dto.inputs.components, new Set(componentCodes), 'inputs.components')
  if (exactContext) {
    if (Object.keys(suppliedVariables).length || Object.keys(suppliedComponents).length) fail('TIER_PREVIEW_INPUT_INVALID', 'لا تخلط مدخلات DTO مع السياق الدقيق الداخلي', 'inputs')
    suppliedVariables = exactMap(exactContext.variables, allowedVariables, 'context.variables')
    suppliedComponents = exactMap(exactContext.components, new Set(componentCodes), 'context.components')
  }
  const components = { ...Object.fromEntries(componentCodes.map(code => [code, null])), ...suppliedComponents }
  const parameters = Object.fromEntries(checked.parameters.filter(item => item.isActive).map(item => [item.code, PayrollDecimal.from(item.value)]))
  if (!Array.isArray(dto.days) || dto.days.length > PAYROLL_TIER_PREVIEW_LIMITS.days) fail('TIER_PREVIEW_INPUT_INVALID', 'قائمة أيام المعاينة مطلوبة وبحد تقني 366 يومًا', 'days')
  const dates = new Set<string>()
  for (const [index, day] of dto.days.entries()) {
    fields(day, dayFields, `days[${index}]`)
    const value = date(day.date, `days[${index}].date`)
    if (value < periodStart || value > periodEnd || dates.has(value)) fail('TIER_PREVIEW_DATE_INVALID', 'اليوم مكرر أو خارج الفترة المحددة', `days[${index}].date`)
    dates.add(value)
    if (day.sourceRef !== null && (typeof day.sourceRef !== 'string' || day.sourceRef.length > 120)) fail('TIER_PREVIEW_INPUT_INVALID', 'مرجع المصدر نص بحد 120 حرفًا أو null', `days[${index}].sourceRef`)
    if (typeof day.flexibleStartEnabled !== 'boolean' || typeof day.attendanceExempt !== 'boolean') fail('TIER_PREVIEW_INPUT_INVALID', 'اختيار المرونة والاستثناء يجب أن يكون منطقيًا صريحًا', `days[${index}]`)
    if (day.shiftGraceMinutes !== null && (!Number.isInteger(day.shiftGraceMinutes) || day.shiftGraceMinutes < 0 || day.shiftGraceMinutes > 1440)) fail('TIER_PREVIEW_INPUT_INVALID', 'سماح الوردية دقائق صحيحة من 0 إلى 1440 أو null', `days[${index}].shiftGraceMinutes`)
    for (const key of ['rawLateSeconds', 'excusedLateSeconds'] as const) {
      if (typeof day[key] !== 'string' || !/^\d+(?:\.\d+)?$/.test(day[key])) fail('TIER_PREVIEW_INPUT_INVALID', 'الثواني نص عشري غير سالب', `days[${index}].${key}`)
      decimal(day[key], `days[${index}].${key}`, true)
    }
  }
  let graceUses = 0
  const days = [...dto.days].sort((a, b) => a.date.localeCompare(b.date)).map(day => {
    const raw = decimal(day.rawLateSeconds, 'rawLateSeconds'), excused = decimal(day.excusedLateSeconds, 'excusedLateSeconds')
    // نطرح الثواني المعذورة قبل تقريب المدة، فلا يُستنفد إذن صحيح بتقريب مستقل للطرفين.
    const unexcused = positive(raw.subtract(excused)).divide(PayrollDecimal.from('60')).round(0, set!.secondsRoundingMode === 'NEAREST' ? 'HALF_UP' : set!.secondsRoundingMode)
    const shift = set!.allowShiftGraceOverride && day.shiftGraceMinutes !== null
    const minutes = shift ? day.shiftGraceMinutes! : set!.graceMinutes
    let effective = unexcused, reason: string | null = null, skippedReason: string | null = null
    if (day.attendanceExempt) skippedReason = 'ATTENDANCE_EXEMPT'
    else if (settings.skipAttendance) skippedReason = 'POLICY_SKIP_ATTENDANCE'
    else if (!settings.lateDeductionEnabled) skippedReason = 'LATE_DEDUCTION_DISABLED'
    if (skippedReason) { effective = zero(); reason = skippedReason }
    else if (unexcused.isZero()) reason = 'NO_UNEXCUSED_LATENESS'
    else if (set!.graceMode === 'NONE' || minutes === 0) reason = 'GRACE_DISABLED'
    else if (day.flexibleStartEnabled && !set!.allowGraceOnFlexibleShift) reason = 'FLEXIBLE_SHIFT_GRACE_DISABLED'
    else if (set!.graceMaxUsesPerPeriod !== null && graceUses >= set!.graceMaxUsesPerPeriod) reason = 'GRACE_LIMIT_EXHAUSTED'
    else if (set!.graceMode === 'SUBTRACT') effective = positive(unexcused.subtract(PayrollDecimal.from(String(minutes))))
    else if (unexcused.compare(PayrollDecimal.from(String(minutes))) <= 0) effective = zero()
    else reason = 'OUTSIDE_WAIVE_GRACE'
    const applied = skippedReason ? zero() : unexcused.subtract(effective)
    const consumed = !applied.isZero()
    if (consumed) graceUses++
    const rounded = effective.divide(PayrollDecimal.from(String(set!.roundingUnitMinutes)))
      .round(0, set!.minutesRoundingMode === 'NEAREST' ? 'HALF_UP' : set!.minutesRoundingMode).multiply(PayrollDecimal.from(String(set!.roundingUnitMinutes)))
    return { ...day, unexcusedMinutes: unexcused.canonical(), effectiveMinutes: effective.canonical(), roundedMinutes: rounded.canonical(), skippedReason,
      grace: { mode: set!.graceMode, minutes, source: shift ? 'SHIFT' : 'POLICY', appliedMinutes: applied.canonical(), consumed, used: graceUses,
        remaining: set!.graceMaxUsesPerPeriod === null ? null : Math.max(0, set!.graceMaxUsesPerPeriod - graceUses), reason } }
  })
  const totalMinutes = days.reduce((sum, day) => sum.add(PayrollDecimal.from(day.roundedMinutes)), zero())
  const incidents = days.filter(day => PayrollDecimal.from(day.roundedMinutes).compare(zero()) > 0).length
  const common = { ...suppliedVariables, BASE_SALARY: basic, GROSS_SALARY: gross, BASE_DAYS_BASIS: PayrollDecimal.from(String(settings.monthlyDays)),
    STANDARD_DAY_HOURS: PayrollDecimal.from(String(settings.dailyHours)), PERIOD_DAYS: PayrollDecimal.from(String(periodDays)),
    DAY_RATE: dayRate, HOUR_RATE: hourRate, MINUTE_RATE: minuteRate }
  const dailyCap = set!.maxDailyDeductionDayFraction === null ? null : dayRate.multiply(PayrollDecimal.from(set!.maxDailyDeductionDayFraction))
  const periodCapRaw = set!.maxPeriodDeductionDayFraction === null ? null : dayRate.multiply(PayrollDecimal.from(set!.maxPeriodDeductionDayFraction))
  const periodCap = periodCapRaw?.round(scale, mode) ?? null
  const warnings: Array<Record<string, unknown>> = []
  const line = (value: PayrollDecimal, when: string | null, sourceRef: string | null, skippedReason: string | null, minutes: PayrollDecimal, count: number, exempt: boolean) => {
    const computed: PayrollTierKernelResult = evaluatePayrollTierValue(set!, value, { dayRate, hourRate, minuteRate,
      variables: { ...common, LATE_MINUTES: minutes, LATE_INCIDENTS: PayrollDecimal.from(String(count)), IS_ATTENDANCE_EXEMPT: PayrollDecimal.from(exempt ? '1' : '0') },
      components, parameters, roundingMode: mode, divisionByZeroMode: settings.divisionByZeroMode, spend })
    const daily = set!.applicationBasis === 'PER_DAY' && dailyCap !== null ? minimum(computed.amount, dailyCap) : computed.amount
    const limited = set!.applicationBasis !== 'PER_DAY' && periodCapRaw !== null ? minimum(daily, periodCapRaw) : daily
    const afterDailyCap = daily.round(scale, mode), amount = limited.round(scale, mode)
    const item = { date: when, sourceRef, inputValue: value.canonical(), portions: computed.portions, rawAmount: computed.amount.format(6, 'HALF_UP'),
      rawAmountExact: exact(computed.amount), afterDailyCap: afterDailyCap.format(scale, mode), dailyCapReduction: computed.amount.subtract(daily).format(6, 'HALF_UP'),
      periodCapReduction: afterDailyCap.subtract(amount).format(scale, mode), amount: amount.format(scale, mode),
      skippedReason: skippedReason ?? (value.isZero() ? 'NO_EFFECTIVE_LATENESS' : null), warnings: computed.warnings }
    warnings.push(...computed.warnings.map(warning => ({ ...warning, date: when })))
    return item
  }
  const lines = set!.applicationBasis === 'PER_DAY' ? days.map(day => {
    const minutes = PayrollDecimal.from(day.roundedMinutes)
    return line(minutes, day.date, day.sourceRef, day.skippedReason, minutes, minutes.isZero() ? 0 : 1, day.attendanceExempt)
  }) : [line(set!.applicationBasis === 'OCCURRENCE_COUNT' ? PayrollDecimal.from(String(incidents)) : totalMinutes, null, null,
    settings.skipAttendance ? 'POLICY_SKIP_ATTENDANCE' : !settings.lateDeductionEnabled ? 'LATE_DEDUCTION_DISABLED' : null,
    totalMinutes, incidents, days.length > 0 && days.every(day => day.attendanceExempt))]
  const totalBeforePeriodCap = lines.reduce((sum, item) => sum.add(PayrollDecimal.from(item.afterDailyCap)), zero())
  if (set!.applicationBasis === 'PER_DAY' && periodCap !== null) {
    // ترتيب الأيام ثابت؛ يحتفظ الأقدم بمبلغه وتظهر حصة تقليل السقف على كل سطر لاحق.
    let remaining = periodCap
    for (const item of lines) {
      const before = PayrollDecimal.from(item.amount), allocated = minimum(before, remaining)
      item.amount = allocated.format(scale, mode); item.periodCapReduction = before.subtract(allocated).format(scale, mode)
      remaining = remaining.subtract(allocated)
    }
  }
  const total = lines.reduce((sum, item) => sum.add(PayrollDecimal.from(item.amount)), zero())
  return { tierSetCode: set!.code, applicationBasis: set!.applicationBasis, tierApplicationMode: set!.tierApplicationMode, inputUnit: set!.inputUnit,
    currency: settings.currency, rounding: { mode, scale },
    rates: { deductionBase: deductionBase.canonical(), dayRate: dayRate.format(6, 'HALF_UP'), hourRate: hourRate.format(6, 'HALF_UP'), minuteRate: minuteRate.format(6, 'HALF_UP'),
      dayRateExact: exact(dayRate), hourRateExact: exact(hourRate), minuteRateExact: exact(minuteRate) },
    days, lines, total: total.format(scale, mode), totalBeforePeriodCap: totalBeforePeriodCap.format(scale, mode), periodCap: periodCap?.format(scale, mode) ?? null,
    periodCapReduction: totalBeforePeriodCap.subtract(total).format(scale, mode), graceUses, warnings }
}
