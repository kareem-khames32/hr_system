import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_SRS_VARIABLE_CODES } from './payroll-formula-catalog'
import { compilePayrollFormula, evaluatePayrollFormulaExact, PayrollFormulaError } from './payroll-formula-engine'
import { PayrollPolicyDefinition, PayrollPolicyDefinitionError, validatePayrollPolicyDefinition } from './payroll-policy-definition'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'
import { PayrollComponentTierSourceError, resolvePayrollComponentTierSource } from './payroll-component-tier-source'
import { PayrollComponentLedgerSourceError, preparePayrollLedgerSources, resolvePayrollLedgerComponent } from './payroll-component-ledger-source'

export const PAYROLL_COMPONENT_EXECUTION_VERSION = 'SRS_COMPONENT_EXECUTION_V1_20260913' as const
export const PAYROLL_COMPONENT_SOURCES_VERSION = 'SRS_COMPONENT_SOURCES_V1_20260913' as const
export const PAYROLL_COMPONENT_EXECUTION_LIMITS = Object.freeze({ inputNodes: 50000, nesting: 20, evaluationSteps: 2000000, sourceRefCharacters: 200, fractionCharacters: 1234 })
export interface PayrollComponentFraction { numerator: string; denominator: string }
export type PayrollComponentInputValue = string | PayrollComponentFraction | null
export interface PayrollComponentSourceMetadata { sourceRef: string; alreadyProrated: boolean }
type SalaryKey = typeof MONTHLY_SALARY_COMPONENTS[number]['key']
type InputGroup = 'variables' | 'employeeFields' | 'externalValues'
export interface PayrollComponentExplicitInput {
  variables: Record<string, PayrollComponentInputValue>
  employeeFields: Record<SalaryKey, PayrollComponentInputValue>
  externalValues: Record<string, PayrollComponentInputValue>
  sourceMetadata: Record<InputGroup, Record<string, PayrollComponentSourceMetadata>>
  proration: { calendar30: { value: Exclude<PayrollComponentInputValue, null>; sourceRef: string }; working: { value: PayrollComponentInputValue; sourceRef: string } }
  exemptions: Array<{ code: string; sourceRef: string }>
}
export interface PayrollComponentExecutionWarning { code: string; message: string; path: string; componentCode: string | null; reference?: string; position?: number }
export interface PayrollComponentExecutionDecimal { rawValue6: string; exact: PayrollComponentFraction }
export interface PayrollComponentExecutionLine {
  code: string; componentType: 'EARNING' | 'DEDUCTION' | 'INFO'; sourceUnit: string; resultUnit: string
  status: 'CALCULATED' | 'SKIPPED' | 'DEFERRED'; skippedReason: string | null
  condition: { formula: string; value: boolean; inputs: Record<string, string>; substitutedExpression: string } | null
  sourceRefs: string[]
  steps: Array<{ stage: string; value: PayrollComponentExecutionDecimal; details: Record<string, unknown> }>
  amount: string | null; amountExact: PayrollComponentFraction | null
  warnings: PayrollComponentExecutionWarning[]
}
export class PayrollComponentExecutionError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollComponentExecutionError' }
}
type Component = PayrollPolicyDefinition['components'][number]
interface DerivedValue { value: PayrollDecimal; alreadyProrated: boolean; sourceRefs: Set<string>; ledgerOrigins?: Set<string>; debtVariableOrigins?: Set<string> }
const salaryKeys = MONTHLY_SALARY_COMPONENTS.map(component => component.key)
const inputGroups: InputGroup[] = ['variables', 'employeeFields', 'externalValues']
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
const attendanceVariables = new Set(['LATE_MINUTES', 'SHORT_MINUTES', 'ABSENCE_DAYS', 'LATE_INCIDENTS'])
// الكميات الفعلية تمنع تناسب المصدر المباشر؛ استعمالها في معادلة لا يثبت تناسب مبلغ الأجر.
const earnedMoneyVariables = new Set(['ALLOWANCES_TOTAL', 'OT_AMOUNT', 'BONUS_TOTAL', 'TYPED_DEDUCTIONS_TOTAL', 'ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD'])
const earnedPeriodVariables = new Set([
  'ALLOWANCES_TOTAL', 'LATE_MINUTES', 'LATE_INCIDENTS', 'SHORT_MINUTES', 'ABSENCE_DAYS', 'EXCUSED_ABSENCE_DAYS',
  'UNPAID_LEAVE_DAYS', 'PAID_LEAVE_DAYS', 'PRESENT_DAYS', 'WORKED_MINUTES', 'REQUIRED_MINUTES',
  'OT_HOURS_REGULAR', 'OT_HOURS_RESTDAY', 'OT_HOURS_HOLIDAY', 'OT_HOURS_NIGHT', 'OT_HOURS_TOTAL', 'OT_AMOUNT',
  'BONUS_TOTAL', 'TYPED_DEDUCTIONS_TOTAL', 'ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD',
])
function fail(code: string, message: string, path: string): never { throw new PayrollComponentExecutionError(code, message, path) }
function fields(value: unknown, allowed: readonly string[], required: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('COMPONENT_INPUT_SHAPE', 'كائن مدخلات صريح مطلوب', path)
  const result: Record<string, unknown> = Object.create(null)
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail('COMPONENT_INPUT_UNKNOWN', `حقل غير مسموح: ${key}`, path)
    result[key] = (value as Record<string, unknown>)[key]
  }
  for (const key of required) if (!own(result, key)) fail('COMPONENT_INPUT_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return result
}
const fraction = (value: PayrollDecimal): PayrollComponentFraction => ({ numerator: String(value.numerator), denominator: String(value.denominator) })
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }

/** تنفيذ مبالغ البنود قبل سقف الصافي على لقطة صريحة؛ لا مدخلات حية أو قيود دفتر أو صافي نهائي. */
export function executePayrollComponents(definition: unknown, settings: PayrollPolicySettings, explicitInput: unknown) {
  return execute(definition, settings, explicitInput, undefined, false)
}

/** ربط المصادر التفصيلية داخل الحساب المرتب؛ التحصيل الفعلي يظل مسؤولية مرحلة NET. */
export function executePayrollComponentsWithSources(definition: unknown, settings: PayrollPolicySettings, explicitInput: unknown, explicitSources: unknown) {
  return execute(definition, settings, explicitInput, explicitSources, true)
}

function execute(definition: unknown, settings: PayrollPolicySettings, explicitInput: unknown, explicitSources: unknown, withSources: boolean) {
  let remaining = PAYROLL_COMPONENT_EXECUTION_LIMITS.evaluationSteps, nodes = 0, path = 'input'
  const spend = () => { if (--remaining < 0) fail('COMPONENT_EVALUATION_LIMIT', 'تجاوز تنفيذ البنود ميزانية التعقيد المسموح بها', path) }
  const clone = (value: unknown, where: string, depth = 0): unknown => {
    spend()
    if (++nodes > PAYROLL_COMPONENT_EXECUTION_LIMITS.inputNodes || depth > PAYROLL_COMPONENT_EXECUTION_LIMITS.nesting) fail('COMPONENT_INPUT_LIMIT', 'تجاوز حجم أو تعشيش اللقطة الحد التقني', where)
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value !== 'object') fail('COMPONENT_INPUT_SHAPE', 'اللقطة تقبل قيم JSON فقط', where)
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== (Array.isArray(value) ? Array.prototype : Object.prototype)) fail('COMPONENT_INPUT_SHAPE', 'اللقطة لا تقبل نماذج موروثة مخصصة', where)
    const result: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (Array.isArray(value) && key === 'length') continue
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || (Array.isArray(value) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('COMPONENT_INPUT_SHAPE', 'خاصية غير مسموحة في اللقطة', where)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!own(descriptor, 'value')) fail('COMPONENT_INPUT_SHAPE', 'اللقطة لا تقبل خصائص محسوبة', `${where}.${key}`)
      ;(result as Record<string, unknown>)[key] = clone(descriptor.value, `${where}.${key}`, depth + 1)
    }
    if (Array.isArray(value) && Object.keys(result).length !== value.length) fail('COMPONENT_INPUT_SHAPE', 'القائمة لا تقبل فراغات', where)
    return result
  }
  try {
    const settingsCopy = fields(clone(settings, 'settings'), PAYROLL_POLICY_SETTING_FIELDS, PAYROLL_POLICY_SETTING_FIELDS, 'settings')
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(settingsCopy) } catch { fail('COMPONENT_SETTINGS_INVALID', 'إعدادات نسخة السياسة غير مكتملة أو غير صالحة', 'settings') }
    const checked = validatePayrollPolicyDefinition(clone(definition, 'definition'), policy, { autoOrder: false, typedDeductionCodes: [] })
    const normalized = checked.definition, byCode = new Map(normalized.components.map(component => [component.code, component]))
    const sourceInput = withSources ? fields(clone(explicitSources, 'sources'), ['tiers', 'ledger'], ['tiers', 'ledger'], 'sources') : null
    const tierSources = sourceInput ? fields(sourceInput.tiers, normalized.components.filter(component => component.valueSource === 'TIERED').map(component => component.code), [], 'sources.tiers') : null
    const preparedLedger = sourceInput?.ledger != null ? preparePayrollLedgerSources(normalized, policy, sourceInput.ledger) : null
    const input = fields(clone(explicitInput, 'input'), ['variables', 'employeeFields', 'externalValues', 'sourceMetadata', 'proration', 'exemptions'], ['variables', 'employeeFields', 'externalValues', 'sourceMetadata', 'proration', 'exemptions'], 'input')
    const allowed = { variables: [...PAYROLL_SRS_VARIABLE_CODES], employeeFields: salaryKeys as string[], externalValues: normalized.components.filter(component => component.isActive && component.valueSource === 'EXTERNAL').map(component => component.code) }
    const maps = {} as Record<InputGroup, Record<string, PayrollDecimal | null>>
    const metadata = {} as Record<InputGroup, Record<string, PayrollComponentSourceMetadata>>
    const d = (value: string) => PayrollDecimal.from(value, spend), zero = d('0'), one = d('1'), hundred = d('100')
    const numeric = (value: unknown, where: string, nullable: boolean): PayrollDecimal | null => {
      if (value === null && nullable) return null
      if (typeof value === 'string') return d(value)
      if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('COMPONENT_INPUT_VALUE', 'القيمة نص عشري أو كسر دقيق صريح؛ الأعداد الثنائية غير مقبولة', where)
      const parts = fields(value, ['numerator', 'denominator'], ['numerator', 'denominator'], where)
      if (typeof parts.numerator !== 'string' || !/^-?\d+$/.test(parts.numerator) || typeof parts.denominator !== 'string' || !/^\d+$/.test(parts.denominator) || parts.numerator.length > PAYROLL_COMPONENT_EXECUTION_LIMITS.fractionCharacters + 1 || parts.denominator.length > PAYROLL_COMPONENT_EXECUTION_LIMITS.fractionCharacters) fail('COMPONENT_INPUT_VALUE', 'بسط ومقام الكسر نصان صحيحان بحد تقني معلوم', where)
      const numerator = BigInt(parts.numerator), denominator = BigInt(parts.denominator)
      if (denominator <= 0n) fail('COMPONENT_INPUT_VALUE', 'مقام الكسر يجب أن يكون موجبًا', where)
      return new PayrollDecimal(numerator, denominator, spend)
    }
    const ref = (value: unknown, where: string) => {
      if (typeof value !== 'string' || !value.trim() || value.length > PAYROLL_COMPONENT_EXECUTION_LIMITS.sourceRefCharacters) fail('COMPONENT_SOURCE_REF_REQUIRED', 'مرجع مصدر صريح غير فارغ بحد200محرف مطلوب', where)
      return value.trim()
    }
    const rawMetadata = fields(input.sourceMetadata, inputGroups, inputGroups, 'sourceMetadata')
    for (const group of inputGroups) {
      const values = fields(input[group], allowed[group], group === 'employeeFields' ? salaryKeys : [], group)
      maps[group] = Object.create(null); metadata[group] = Object.create(null)
      const meta = fields(rawMetadata[group], allowed[group], [], `sourceMetadata.${group}`)
      for (const [key, value] of Object.entries(meta)) {
        const source = fields(value, ['sourceRef', 'alreadyProrated'], ['sourceRef', 'alreadyProrated'], `sourceMetadata.${group}.${key}`)
        if (typeof source.alreadyProrated !== 'boolean') fail('COMPONENT_SOURCE_METADATA_INVALID', 'حالة التناسب السابق يجب أن تكون true أو false', `sourceMetadata.${group}.${key}`)
        metadata[group][key] = { sourceRef: ref(source.sourceRef, `sourceMetadata.${group}.${key}.sourceRef`), alreadyProrated: source.alreadyProrated }
      }
      for (const [key, value] of Object.entries(values)) {
        path = `${group}.${key}`; maps[group][key] = numeric(value, path, true)
        if (maps[group][key] !== null && !own(metadata[group], key)) fail('COMPONENT_SOURCE_METADATA_REQUIRED', 'كل قيمة صريحة غير فارغة تحتاج مرجع مصدر وحالة التناسب السابق', path)
      }
    }
    const supplied = (key: string) => maps.variables[key] ?? null
    if (supplied('BASE_DAYS_BASIS') && supplied('BASE_DAYS_BASIS')!.compare(d('30')) !== 0) fail('COMPONENT_CONSTANT_CONFLICT', 'أساس أيام الشهر المقدم يجب أن يساوي30', 'variables.BASE_DAYS_BASIS')
    if (supplied('STANDARD_DAY_HOURS') && supplied('STANDARD_DAY_HOURS')!.compare(d(String(policy.dailyHours))) !== 0) fail('COMPONENT_CONSTANT_CONFLICT', 'ساعات اليوم المقدمة تخالف لقطة السياسة', 'variables.STANDARD_DAY_HOURS')
    for (const key of ['DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE']) if (supplied(key) && supplied(key)!.compare(zero) < 0) fail('COMPONENT_RATE_INVALID', 'سعر الوحدة لا يقبل قيمة سالبة', `variables.${key}`)
    const dayRate = supplied('DAY_RATE'), hourRate = supplied('HOUR_RATE'), minuteRate = supplied('MINUTE_RATE'), dailyHours = d(String(policy.dailyHours))
    if ((dayRate && hourRate && dayRate.compare(hourRate.multiply(dailyHours)) !== 0) ||
      (hourRate && minuteRate && hourRate.compare(minuteRate.multiply(d('60'))) !== 0) ||
      (dayRate && minuteRate && dayRate.compare(minuteRate.multiply(d('60')).multiply(dailyHours)) !== 0)) fail('COMPONENT_RATE_CONFLICT', 'معدلات اليوم والساعة والدقيقة المقدمة غير متسقة', 'variables')
    const attendanceExempt = supplied('IS_ATTENDANCE_EXEMPT')
    if (attendanceExempt && attendanceExempt.compare(zero) !== 0 && attendanceExempt.compare(one) !== 0) fail('COMPONENT_INPUT_VALUE', 'علم الاستثناء من الحضور يقبل0أو1فقط', 'variables.IS_ATTENDANCE_EXEMPT')
    const allAttendanceDisabled = policy.skipAttendance || attendanceExempt?.compare(one) === 0
    const disabledVariables = new Set<string>(allAttendanceDisabled ? attendanceVariables : !policy.lateDeductionEnabled ? ['LATE_MINUTES', 'LATE_INCIDENTS'] : [])
    for (const key of disabledVariables) maps.variables[key] = zero
    const rawProration = fields(input.proration, ['calendar30', 'working'], ['calendar30', 'working'], 'proration')
    const factors = {} as Record<'calendar30' | 'working', { value: PayrollDecimal | null; sourceRef: string }>
    for (const key of ['calendar30', 'working'] as const) {
      const item = fields(rawProration[key], ['value', 'sourceRef'], ['value', 'sourceRef'], `proration.${key}`)
      const value = numeric(item.value, `proration.${key}.value`, key === 'working')
      if (value && (value.compare(zero) < 0 || value.compare(one) > 0)) fail('COMPONENT_PRORATION_INVALID', 'عامل التناسب يجب أن يكون بين0و1', `proration.${key}`)
      factors[key] = { value, sourceRef: ref(item.sourceRef, `proration.${key}.sourceRef`) }
    }
    if (!Array.isArray(input.exemptions) || input.exemptions.length > 200) fail('COMPONENT_EXEMPTION_INVALID', 'قائمة إعفاءات كاملة بحد200قرار مطلوبة', 'exemptions')
    const exemptions = new Map<string, string>()
    for (const item of input.exemptions) {
      const decision = fields(item, ['code', 'sourceRef'], ['code', 'sourceRef'], 'exemptions')
      if (typeof decision.code !== 'string') fail('COMPONENT_EXEMPTION_INVALID', 'كود بند الإعفاء مطلوب', 'exemptions')
      const component = byCode.get(decision.code)
      if (!component || component.componentType !== 'DEDUCTION' || !component.exemptible || exemptions.has(component.code)) fail('COMPONENT_EXEMPTION_INVALID', 'هدف الإعفاء غير معروف أو غير قابل للإعفاء أو مكرر؛ الإعفاء الكامل للخصومات فقط', 'exemptions')
      exemptions.set(component.code, ref(decision.sourceRef, 'exemptions.sourceRef'))
    }
    for (const component of normalized.components) if (component.rollupTo === 'overtimeAmount' && (component.componentType !== 'EARNING' || component.valueSource !== 'SYSTEM_VAR' || component.varCode !== 'OT_AMOUNT')) fail('COMPONENT_APPROVED_OT_PROTECTED', 'تجميع مبلغ الإضافي مقصور على المبلغ المعتمد من مصدره النظامي', `components.${component.code}`)

    const components: PayrollComponentExecutionLine[] = [], warnings: PayrollComponentExecutionWarning[] = []
    const results = new Map<string, DerivedValue>(), approvedOtConsumedRefs = new Set<string>()
    const ledgerDebitConsumers = new Set<string>(), debtVariableConsumers = new Set<string>()
    const parameters: Record<string, PayrollDecimal> = Object.create(null)
    for (const parameter of normalized.parameters) if (parameter.isActive) parameters[parameter.code] = d(parameter.value)
    const catalog = { variables: [...PAYROLL_SRS_VARIABLE_CODES], components: [...byCode.keys()], parameters: Object.keys(parameters), typedDeductions: [] }
    let earnings = zero, deductions = zero, totalScale = policy.roundingScale, approvedOtConsumer: string | null = null
    for (const component of normalized.components) {
      spend(); path = `components.${component.code}`
      const financial = component.componentType !== 'INFO', mode = component.roundingMode ?? policy.roundingMode, scale = component.roundingScale ?? policy.roundingScale
      const line: PayrollComponentExecutionLine = { code: component.code, componentType: component.componentType, sourceUnit: component.unit,
        resultUnit: financial ? 'CURRENCY' : component.unit, status: 'CALCULATED', skippedReason: null, condition: null,
        sourceRefs: [], steps: [], amount: null, amountExact: null, warnings: [] }
      const sources = new Set<string>()
      const ledgerOrigins = new Set<string>(), debtVariableOrigins = new Set<string>()
      let alreadyProrated = false
      const warn = (code: string, message: string, reference?: string, position?: number) => {
        if (line.warnings.some(item => item.code === code && item.reference === reference && item.position === position)) return
        const warning: PayrollComponentExecutionWarning = { code, message, path, componentCode: component.code,
          ...(reference === undefined ? {} : { reference }), ...(position === undefined ? {} : { position }) }
        line.warnings.push(warning); warnings.push(warning)
      }
      const step = (stage: string, value: PayrollDecimal, details: Record<string, unknown> = {}) => {
        spend(); line.steps.push({ stage, value: { rawValue6: value.format(6, 'HALF_UP'), exact: fraction(value) }, details })
      }
      const absorb = (value: DerivedValue, inherit = true) => {
        value.sourceRefs.forEach(item => sources.add(item))
        if (inherit && value.alreadyProrated) alreadyProrated = true
        if (inherit) {
          value.ledgerOrigins?.forEach(code => ledgerOrigins.add(code))
          value.debtVariableOrigins?.forEach(code => debtVariableOrigins.add(code))
        }
        return value.value
      }
      const source = (group: InputGroup, key: string): DerivedValue => {
        if (group === 'variables' && disabledVariables.has(key)) {
          const refs = new Set<string>()
          if (attendanceExempt?.compare(one) === 0 && metadata.variables.IS_ATTENDANCE_EXEMPT) refs.add(metadata.variables.IS_ATTENDANCE_EXEMPT.sourceRef)
          warn('ATTENDANCE_DISABLED', 'صُفّر متغير الحضور وفق لقطة السياسة أو قرار الاستثناء الصريح', key)
          return { value: zero, alreadyProrated: false, sourceRefs: refs }
        }
        const value = maps[group][key]
        if (value === null || value === undefined) {
          warn('MISSING_INPUT', 'المدخل غير متاح؛ استُخدم الصفر مع إبقاء سبب النقص', group === 'variables' ? key : `${group}.${key}`)
          return { value: zero, alreadyProrated: false, sourceRefs: new Set() }
        }
        const meta = metadata[group][key]
        return { value, alreadyProrated: meta.alreadyProrated || (group === 'variables' && earnedMoneyVariables.has(key)), sourceRefs: new Set([meta.sourceRef]),
          debtVariableOrigins: group === 'variables' && ['ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD'].includes(key) ? new Set([key]) : undefined }
      }
      const previous = (code: string): DerivedValue => {
        const value = results.get(code)
        if (!value) fail('COMPONENT_RESULT_UNAVAILABLE', 'مرجع البند معروف لكن نتيجته لم تُنتج قبل هذا البند', `${path}.COMP[${code}]`)
        return value
      }
      const base = (code: string): DerivedValue => code.startsWith('COMP[') ? previous(code.slice(5, -1)) : source('variables', code)
      const formula = (text: string, kind: 'AMOUNT' | 'CONDITION') => {
        const compiled = compilePayrollFormula(text, { ...catalog, kind, roundingMode: mode })
        // الترتيب مُتحقق مرة أخرى؛ لا نمرر مرجع بند لم ينتج إلى سياسة missing=0 الخاصة بالمتغيرات.
        for (const code of compiled.references.components) previous(code)
        const formulaComponents: Record<string, PayrollDecimal> = Object.create(null)
        results.forEach((result, code) => { formulaComponents[code] = result.value })
        const result = evaluatePayrollFormulaExact(compiled, { variables: maps.variables, components: formulaComponents, parameters },
          { roundingMode: mode, divisionByZeroMode: policy.divisionByZeroMode, spend })
        for (const warning of result.warnings) warn(warning.code, warning.message, warning.reference, warning.position)
        const valueReferences = new Set(result.valueReferences)
        for (const reference of Object.keys(result.inputs)) {
          const inherit = kind === 'AMOUNT' && valueReferences.has(reference)
          if (reference.startsWith('COMP[')) absorb(previous(reference.slice(5, -1)), inherit)
          else if (own(maps.variables, reference) || PAYROLL_SRS_VARIABLE_CODES.includes(reference)) absorb(source('variables', reference), inherit)
        }
        return result
      }
      const finish = (value: PayrollDecimal, skipReason: string | null = null) => {
        const rounded = value.round(scale, mode)
        if (withSources && financial && skipReason === null && !rounded.isZero()) {
          if (component.valueSource !== 'LEDGER' && ledgerOrigins.size) fail('COMPONENT_LEDGER_DOUBLE_CONSUMPTION', 'نتيجة الدفتر لا يعاد استهلاكها في بند مالي آخر؛ يسمح بعرضها أو استخدامها في شرط فقط', path)
          if (component.valueSource === 'LEDGER' && component.ledgerDirection === 'DEBIT') ledgerDebitConsumers.add(component.code)
          if (debtVariableOrigins.size) debtVariableConsumers.add(component.code)
          if (ledgerDebitConsumers.size && debtVariableConsumers.size) fail('COMPONENT_LEDGER_DOUBLE_CONSUMPTION', 'استحقاق الدين لا يجمع من متغير مجمل ومصادر الدفتر في الحساب نفسه', path)
        }
        line.status = skipReason === null ? 'CALCULATED' : 'SKIPPED'; line.skippedReason = skipReason
        line.amount = rounded.format(scale, mode); line.amountExact = fraction(rounded)
        line.sourceRefs = [...sources].sort()
        if (withSources) step('SOURCE_PROVENANCE', rounded, { ledgerOrigins: skipReason === null ? [...ledgerOrigins].sort() : [], debtVariableOrigins: skipReason === null ? [...debtVariableOrigins].sort() : [] })
        step('ROUND', rounded, { roundingMode: mode, roundingScale: scale })
        results.set(component.code, { value: rounded, alreadyProrated: skipReason === null && alreadyProrated, sourceRefs: new Set(sources),
          ledgerOrigins: skipReason === null ? new Set(ledgerOrigins) : new Set(), debtVariableOrigins: skipReason === null ? new Set(debtVariableOrigins) : new Set() })
        if (financial) {
          totalScale = Math.max(totalScale, scale)
          if (component.componentType === 'EARNING') earnings = earnings.add(rounded)
          else deductions = deductions.add(rounded)
        }
        components.push(line)
      }
      if (component.valueSource === 'SYS_NET') { line.status = 'DEFERRED'; line.skippedReason = 'NET_FINALIZATION_DEFERRED'; components.push(line); continue }
      if (!component.isActive) { finish(zero, 'INACTIVE'); continue }
      if (component.conditionFormula !== null) {
        const evaluated = formula(component.conditionFormula, 'CONDITION')
        if (typeof evaluated.exactValue !== 'boolean') fail('COMPONENT_CONDITION_INVALID', 'شرط البند يجب أن ينتج قيمة منطقية', path)
        line.condition = { formula: component.conditionFormula, value: evaluated.exactValue, inputs: evaluated.inputs, substitutedExpression: evaluated.substitutedExpression }
        if (!evaluated.exactValue) { finish(zero, 'CONDITION_FALSE'); continue }
      }
      const disabledDeduction = component.componentType === 'DEDUCTION' && (
        (component.valueSource === 'SYSTEM_VAR' && disabledVariables.has(component.varCode!)) ||
        (component.valueSource === 'TIERED' && disabledVariables.has(normalized.tierSets.find(set => set.code === component.tierSetCode)?.inputVar ?? '')) ||
        (component.rollupTo === 'latenessDeduction' && (allAttendanceDisabled || !policy.lateDeductionEnabled)) ||
        (allAttendanceDisabled && ['absenceDeduction', 'shortfallDeduction'].includes(component.rollupTo!)))
      if (disabledDeduction) {
        if (attendanceExempt?.compare(one) === 0 && metadata.variables.IS_ATTENDANCE_EXEMPT) sources.add(metadata.variables.IS_ATTENDANCE_EXEMPT.sourceRef)
        warn('ATTENDANCE_DISABLED', 'خصم الحضور معطل؛ لا تطبق عليه حدود تعيد قيمة موجبة')
        finish(zero, 'ATTENDANCE_DISABLED'); continue
      }
      if (!withSources && (component.valueSource === 'TIERED' || component.valueSource === 'LEDGER')) fail('COMPONENT_SOURCE_UNSUPPORTED', 'مصدر الشرائح أو الدفتر يحتاج مدخلاته التفصيلية الصريحة', path)
      if (!financial && component.unit !== 'CURRENCY' && (component.minAmount !== null || component.maxAmount !== null || component.capPctOfBase !== null)) fail('COMPONENT_INFO_LIMIT_UNSUPPORTED', 'الحدود النقدية لبند معلومات غير نقدي تحتاج عقدًا مستقلًا', path)
      const approvedOt = financial && component.valueSource === 'SYSTEM_VAR' && component.varCode === 'OT_AMOUNT'
      if (financial && component.valueSource === 'SYSTEM_VAR' && component.varCode!.startsWith('OT_HOURS_')) fail('COMPONENT_APPROVED_OT_PROTECTED', 'لا يُعاد تسعير الإضافي المعتمد من الساعات في بند مالي مباشر', path)
      if (approvedOt) {
        if (component.componentType !== 'EARNING' || component.unit !== 'CURRENCY' || (component.multiplier !== null && d(component.multiplier).compare(one) !== 0) || component.prorationMode !== 'NONE' || component.minAmount !== null || component.maxAmount !== null || component.capPctOfBase !== null) fail('COMPONENT_APPROVED_OT_PROTECTED', 'مبلغ الإضافي المعتمد يستهلك كما هو دون معامل أو تناسب أو حدود أو إعفاء', path)
        if (approvedOtConsumer !== null) fail('COMPONENT_APPROVED_OT_DUPLICATE', 'مصدر مبلغ الإضافي لا يُستهلك في بندين ماليين داخل نتيجة واحدة', path)
        const amount = supplied('OT_AMOUNT')
        if (!amount || !metadata.variables.OT_AMOUNT) fail('COMPONENT_APPROVED_OT_SOURCE_REQUIRED', 'مبلغ إضافي معتمد صريح بمرجع مصدر مطلوب', path)
        if (amount.compare(zero) < 0 || amount.multiply(hundred).denominator !== 1n || amount.round(scale, mode).compare(amount) !== 0) fail('COMPONENT_APPROVED_OT_PROTECTED', 'الإضافي المعتمد مبلغ غير سالب بدقة السنت ولا يجوز أن يغيره التقريب', path)
      }
      const directPeriodSource = component.valueSource === 'SYSTEM_VAR' && !disabledVariables.has(component.varCode!) &&
        supplied(component.varCode!) !== null && earnedPeriodVariables.has(component.varCode!)
      let amount: PayrollDecimal
      switch (component.valueSource) {
        case 'TIERED': {
          if (!tierSources || !own(tierSources, component.code)) fail('COMPONENT_TIER_SOURCE_REQUIRED', 'بيانات أيام الشرائح مطلوبة للبند المنفذ', path)
          const componentValues: Record<string, PayrollDecimal> = Object.create(null), componentRefs: Record<string, string[]> = Object.create(null)
          results.forEach((result, code) => { componentValues[code] = result.value; componentRefs[code] = [...result.sourceRefs] })
          const tier = resolvePayrollComponentTierSource(normalized, policy, component.code, tierSources[component.code], {
            variables: maps.variables, components: componentValues, sourceRefs: {
              variables: Object.fromEntries(Object.entries(metadata.variables).map(([code, value]) => [code, [value.sourceRef]])), components: componentRefs,
            }, spend,
          })
          amount = new PayrollDecimal(tier.value.numerator, tier.value.denominator, spend); alreadyProrated = true
          for (const reference of tier.trace.valueReferences) {
            if (reference.startsWith('COMP[')) absorb(previous(reference.slice(5, -1)))
            else if (['ADVANCE_DUE_THIS_PERIOD', 'DEBT_DUE_THIS_PERIOD'].includes(reference)) absorb(source('variables', reference))
          }
          for (const warning of tier.trace.preview.warnings) if (typeof warning.code === 'string' && typeof warning.message === 'string') warn(warning.code, warning.message)
          tier.sourceRefs.forEach(sourceRef => sources.add(sourceRef)); step('TIER_SOURCE', amount, tier.trace)
          break
        }
        case 'LEDGER': {
          if (!preparedLedger) fail('COMPONENT_LEDGER_SOURCE_REQUIRED', 'لقطة مصادر الدفتر مطلوبة صراحة حتى عند عدم وجود استحقاقات', path)
          if (exemptions.has(component.code)) fail('COMPONENT_LEDGER_EXEMPTION_UNSUPPORTED', 'إعفاء بند الدفتر لا يمحو أصل الدين؛ استخدم قرار التأجيل المخصص', path)
          const ledger = resolvePayrollLedgerComponent(preparedLedger, component.code)
          amount = new PayrollDecimal(BigInt(ledger.value.numerator), BigInt(ledger.value.denominator), spend); alreadyProrated = true
          ledgerOrigins.add(component.code); ledger.sourceRefs.forEach(sourceRef => sources.add(sourceRef))
          for (const warning of ledger.warnings) warn(warning.code, warning.message)
          step('LEDGER_SOURCE', amount, { ...ledger.trace, rows: ledger.rows, warnings: ledger.warnings }); break
        }
        case 'FIXED': amount = d(component.amount!); break
        case 'EMPLOYEE_FIELD':
          if (maps.employeeFields[component.fieldPath!] == null && component.missingFieldBehavior === 'SKIP') { finish(zero, 'MISSING_FIELD_SKIP'); continue }
          amount = absorb(source('employeeFields', component.fieldPath!)); break
        case 'SYSTEM_VAR': amount = absorb(source('variables', component.varCode!)).multiply(component.multiplier === null ? one : d(component.multiplier)); break
        case 'PERCENT_OF': amount = absorb(base(component.baseCode!)).multiply(d(component.percent!)).divide(hundred); break
        case 'FORMULA': {
          const result = formula(component.formula!, 'AMOUNT')
          if (typeof result.exactValue === 'boolean') fail('COMPONENT_AMOUNT_INVALID', 'معادلة المبلغ يجب أن تنتج عددًا', path)
          amount = new PayrollDecimal(result.exactValue.numerator, result.exactValue.denominator, spend)
          step('FORMULA', amount, { formula: component.formula, inputs: result.inputs, substitutedExpression: result.substitutedExpression }); break
        }
        case 'EXTERNAL': amount = absorb(source('externalValues', component.code)); break
        default: fail('COMPONENT_SOURCE_UNSUPPORTED', 'مصدر بند غير منفذ في هذه المرحلة', path)
      }
      step('RAW', amount, { valueSource: component.valueSource, unit: component.unit })
      // الصفر في عامل التناسب أو سعر الوحدة لا يمحو أصلًا سالبًا ثم يسمح للحد الأدنى بإحيائه.
      const negativeRaw = financial && amount.compare(zero) < 0, rawAmount = amount
      if (financial && component.unit !== 'CURRENCY') {
        const rateCode = ({ DAYS: 'DAY_RATE', HOURS: 'HOUR_RATE', MINUTES: 'MINUTE_RATE' } as Record<string, string>)[component.unit]
        if (!rateCode || supplied(rateCode) === null) fail('COMPONENT_RATE_REQUIRED', 'تحويل وحدة الزمن إلى مبلغ يحتاج معدلًا دقيقًا صريحًا', path)
        amount = amount.multiply(absorb(source('variables', rateCode), false))
        step('CONVERT_TO_CURRENCY', amount, { sourceUnit: component.unit, rateCode })
      }
      if (component.prorationMode !== 'NONE') {
        if (alreadyProrated || directPeriodSource) fail('COMPONENT_ALREADY_PRORATED', 'المصدر مستحق للفترة أو سبق تناسبه؛ لا يُطبق عامل ثانٍ', path)
        const key = component.prorationMode === 'BY_COVERED_DAYS' ? 'calendar30' : 'working', factor = factors[key]
        if (factor.value === null) fail('COMPONENT_PRORATION_UNAVAILABLE', 'عامل أيام العمل غير متاح ولا يُستبدل بعامل آخر', path)
        amount = amount.multiply(factor.value); sources.add(factor.sourceRef); alreadyProrated = true
        step('PRORATE', amount, { mode: component.prorationMode, factor: fraction(factor.value), sourceRef: factor.sourceRef })
      }
      // معلومات الكميات وحدها لا تورّث تناسب أجر، بينما المبلغ الناتج من كمية فعلية مستحق للفترة.
      if (financial && directPeriodSource) alreadyProrated = true
      if (negativeRaw || (financial && amount.compare(zero) < 0)) {
        warn('NEGATIVE_FINANCIAL_CLAMPED', 'المبلغ المالي السالب أصبح صفرًا نهائيًا قبل الحدود؛ لا ينشئ خصمًا أو إيرادًا عكسيًا')
        step('NEGATIVE_CLAMP', zero, { original: fraction(rawAmount), afterConversionAndProration: fraction(amount) }); finish(zero); continue
      }
      if (component.minAmount !== null) { const min = d(component.minAmount); if (amount.compare(min) < 0) amount = min; step('MINIMUM', amount, { minimum: component.minAmount }) }
      if (component.maxAmount !== null) { const max = d(component.maxAmount); if (amount.compare(max) > 0) amount = max; step('MAXIMUM', amount, { maximum: component.maxAmount }) }
      if (component.capPctOfBase !== null) {
        const capBase = absorb(base(component.capBaseCode!), false)
        if (capBase.compare(zero) < 0) fail('COMPONENT_CAP_BASE_NEGATIVE', 'أساس سقف المبلغ لا يقبل قيمة سالبة', path)
        const cap = capBase.multiply(d(component.capPctOfBase)).divide(hundred)
        if (amount.compare(cap) > 0) amount = cap
        step('PERCENT_CAP', amount, { percent: component.capPctOfBase, baseCode: component.capBaseCode, cap: fraction(cap) })
      }
      if (exemptions.has(component.code)) {
        const sourceRef = exemptions.get(component.code)!
        sources.add(sourceRef); step('FULL_EXEMPTION', zero, { original: fraction(amount), sourceRef }); amount = zero
      }
      if (approvedOt) { approvedOtConsumer = component.code; approvedOtConsumedRefs.add(metadata.variables.OT_AMOUNT.sourceRef) }
      if ((component.valueSource === 'TIERED' || component.valueSource === 'LEDGER') && amount.round(scale, mode).compare(amount) !== 0) fail('COMPONENT_SOURCE_ROUNDING_CONFLICT', 'تقريب البند سيغير مجموع المصدر التفصيلي؛ وحّد دقة التقريب أو حدود البند', path)
      finish(amount)
    }
    const total = (value: PayrollDecimal) => ({ amount: value.format(totalScale, 'DOWN'), amountExact: fraction(value) })
    return freeze({ engineVersion: PAYROLL_COMPONENT_EXECUTION_VERSION, source: 'EXPLICIT_UNVERIFIED' as const, preCapsOnly: true as const,
      ...(withSources ? { sourceExecutionVersion: PAYROLL_COMPONENT_SOURCES_VERSION } : {}),
      components, totalsPreCaps: { earnings: total(earnings), deductions: total(deductions), balanceBeforeCaps: total(earnings.subtract(deductions)) },
      approvedOtConsumedRefs: [...approvedOtConsumedRefs].sort(), deferred: ['NET', 'NET_CAPS', 'LEDGER_CARRY'], warnings })
  } catch (error) {
    if (error instanceof PayrollPolicyDefinitionError) throw new PayrollComponentExecutionError(error.code, error.message, error.path)
    if (error instanceof PayrollComponentTierSourceError || error instanceof PayrollComponentLedgerSourceError) throw new PayrollComponentExecutionError(error.code, error.message, error.path)
    if (error instanceof PayrollFormulaError || error instanceof PayrollDecimalError) throw new PayrollComponentExecutionError(error.code, error.message, path)
    throw error
  }
}
