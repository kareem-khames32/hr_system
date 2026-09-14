import { PayrollDecimal } from './payroll-decimal'
import { compilePayrollFormula, PayrollFormulaError } from './payroll-formula-engine'
import { PAYROLL_FORMULA_SYMBOL_PATTERN, PAYROLL_SRS_VARIABLE_CODES, PAYROLL_SRS_VARIABLES, validatePayrollFormulaSymbols } from './payroll-formula-catalog'
import { validatePayrollComponentOrder } from './payroll-component-order'
import { inspectPayrollPolicySettings, PayrollPolicySettings } from './payroll-policy-settings'
import { PAYROLL_DEFINITION_COMPONENT_UNITS, PAYROLL_DEFINITION_LIMITS, PAYROLL_DEFINITION_METHODS, PAYROLL_DEFINITION_PARAMETER_UNITS, PAYROLL_DEFINITION_ROUNDING_MODES, PAYROLL_DEFINITION_SOURCE_TYPES, PAYROLL_DEFINITION_TIER_UNITS, PayrollPolicyComponentDto, PayrollPolicyDefinitionDto, PayrollPolicyParameterDto, PayrollPolicyTierDto, PayrollTierSetDto } from './payroll-policy-definition.dto'
export { PAYROLL_COMPONENT_DECIMAL_FIELDS, PAYROLL_PARAMETER_DECIMAL_FIELDS, PAYROLL_TIER_SET_DECIMAL_FIELDS, PAYROLL_TIER_DECIMAL_FIELDS } from './payroll-policy-definition.dto'

export type PayrollDefinitionJson = string | number | boolean | null | PayrollDefinitionJson[] | { [key: string]: PayrollDefinitionJson }
export interface PayrollDefinitionWarning {
  key: string; code: string; message: string; details: Record<string, PayrollDefinitionJson>
  tierSetCode?: string; tierSequence?: number; componentCode?: string
}
export class PayrollPolicyDefinitionError extends Error {
  constructor(readonly code: string, message: string, readonly path: string, readonly details: Record<string, PayrollDefinitionJson> = {}) { super(message); this.name = 'PayrollPolicyDefinitionError' }
}
type DeepReadonly<T> = T extends (infer V)[] ? ReadonlyArray<DeepReadonly<V>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export type PayrollPolicyDefinition = DeepReadonly<PayrollPolicyDefinitionDto>
export interface PayrollDefinitionOptions { typedDeductionCodes?: string[]; autoOrder?: boolean }
type Rule = (value: unknown, path: string) => unknown
function fail(code: string, message: string, path: string, details: Record<string, PayrollDefinitionJson> = {}): never { throw new PayrollPolicyDefinitionError(code, message, path, details) }
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
const dec = (value: string) => PayrollDecimal.from(value)
const compare = (left: string, right: string) => dec(left).compare(dec(right))
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value))

function object(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('DEFINITION_SHAPE_INVALID', 'تعريف مطلوب على هيئة كائن', path)
  const result: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key)) fail('DEFINITION_FIELD_UNKNOWN', 'حقل غير مسموح في التعريف', path)
    const property = Object.getOwnPropertyDescriptor(value, key)!
    if (!own(property, 'value')) fail('DEFINITION_SHAPE_INVALID', 'التعريف لا يقبل خصائص محسوبة', `${path}.${key}`)
    result[key] = property.value
  }
  return result
}
function shape<T>(input: unknown, path: string, fields: Record<keyof T, Rule>): T {
  const source = object(input, path), keys = Object.keys(fields), output: Record<string, unknown> = {}
  for (const key of Object.keys(source)) if (!keys.includes(key)) fail('DEFINITION_FIELD_UNKNOWN', `حقل غير مسموح: ${key}`, `${path}.${key}`)
  for (const key of keys) {
    if (!own(source, key)) fail('DEFINITION_FIELD_REQUIRED', `الحقل ${key} مطلوب صراحة؛ استخدم null عندما لا ينطبق`, `${path}.${key}`)
    output[key] = fields[key as keyof T](source[key], `${path}.${key}`)
  }
  return output as T
}
const text = (max: number, nonempty = true): Rule => (value, path) => {
  if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim())) fail('DEFINITION_TEXT_INVALID', `نص ${nonempty ? 'غير فارغ ' : ''}بحد أقصى ${max} محرفًا`, path)
  return value.trim()
}
const enumeration = (values: readonly (string | number)[]): Rule => (value, path) => {
  if (!values.some(candidate => candidate === value)) fail('DEFINITION_VALUE_INVALID', `اختر قيمة من: ${values.join(', ')}`, path)
  return value
}
const integer = (min: number, max = 2147483647): Rule => (value, path) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) fail('DEFINITION_INTEGER_INVALID', `عدد صحيح بين ${min} و${max}`, path)
  return value
}
const boolean: Rule = (value, path) => { if (typeof value !== 'boolean') fail('DEFINITION_BOOLEAN_INVALID', 'القيمة يجب أن تكون true أو false صراحة', path); return value }
const nullable = (rule: Rule): Rule => (value, path) => value === null ? null : rule(value, path)
const code: Rule = (value, path) => { if (typeof value !== 'string' || !PAYROLL_FORMULA_SYMBOL_PATTERN.test(value)) fail('DEFINITION_CODE_INVALID', 'الكود يبدأ بحرف كبير ويقبل الحروف الكبيرة والأرقام والشرطة السفلية حتى40محرفًا', path); return value }
const decimal = (precision: number, scale: number, minimum?: string, maximum?: string): Rule => (value, path) => {
  if (typeof value !== 'string') fail('DEFINITION_DECIMAL_STRING_REQUIRED', 'القيمة العشرية يجب أن ترسل كنص JSON لمنع فقد الدقة', path)
  let normalized: string
  try { normalized = dec(value).canonical() } catch { fail('DEFINITION_DECIMAL_INVALID', 'نص عشري غير صالح', path) }
  const [whole, fraction = ''] = normalized.replace(/^-/, '').split('.')
  if (whole.length > precision - scale || fraction.length > scale) fail('DEFINITION_DECIMAL_PRECISION', `القيمة تتجاوز DECIMAL(${precision},${scale}) ولا تُقرب تلقائيًا`, path)
  if ((minimum !== undefined && compare(normalized, minimum) < 0) || (maximum !== undefined && compare(normalized, maximum) > 0)) fail('DEFINITION_DECIMAL_RANGE', 'القيمة خارج النطاق المسموح', path, { minimum: minimum ?? null, maximum: maximum ?? null })
  return normalized
}
const collection = <T>(max: number, fields: Record<keyof T, Rule>): Rule => (value, path) => {
  if (!Array.isArray(value) || value.length > max) fail('DEFINITION_COLLECTION_LIMIT', `القائمة مطلوبة بحد أقصى ${max}`, path)
  return value.map((item, index) => shape<T>(item, `${path}[${index}]`, fields))
}

const componentFields: Record<keyof PayrollPolicyComponentDto, Rule> = {
  code, nameAr: text(200), componentType: enumeration(['EARNING', 'DEDUCTION', 'INFO']), stage: integer(1, 6), sequence: integer(1),
  valueSource: enumeration(PAYROLL_DEFINITION_SOURCE_TYPES), conditionFormula: nullable(text(500)), unit: enumeration(PAYROLL_DEFINITION_COMPONENT_UNITS),
  prorationMode: enumeration(['NONE', 'BY_COVERED_DAYS', 'BY_COVERED_WORKING_DAYS']), amount: nullable(decimal(18, 2)),
  fieldPath: nullable(text(60)), missingFieldBehavior: nullable(enumeration(['ZERO', 'SKIP'])), varCode: nullable(code), multiplier: nullable(decimal(18, 6, '0')),
  percent: nullable(decimal(9, 4, '0')), baseCode: nullable(text(48)), tierSetCode: nullable(code), formula: nullable(text(500)), ledgerCategory: nullable(text(40)),
  ledgerDirection: nullable(enumeration(['DEBIT', 'CREDIT'])), ledgerPartialPayment: nullable(enumeration(['ALLOW_PARTIAL', 'BLOCK'])),
  minAmount: nullable(decimal(18, 2, '0')), maxAmount: nullable(decimal(18, 2, '0')), capPctOfBase: nullable(decimal(9, 4, '0', '100')), capBaseCode: nullable(text(48)),
  roundingMode: nullable(enumeration(PAYROLL_DEFINITION_ROUNDING_MODES)), roundingScale: nullable(integer(0, 6)), deductionPriority: nullable(integer(1)),
  carryOverEligible: boolean, rollupTo: nullable(text(40)), exemptible: boolean, showOnPayslip: boolean, isActive: boolean,
}
const parameterFields: Record<keyof PayrollPolicyParameterDto, Rule> = { code, nameAr: text(200), value: decimal(18, 6), unit: enumeration(PAYROLL_DEFINITION_PARAMETER_UNITS), isActive: boolean }
const tierFields: Record<keyof PayrollPolicyTierDto, Rule> = {
  sequence: integer(1), fromValue: decimal(18, 6, '0'), toValue: nullable(decimal(18, 6, '0')), method: enumeration(PAYROLL_DEFINITION_METHODS),
  multiplier: nullable(decimal(6, 3, '0')), dayFraction: nullable(decimal(5, 4, '0', '1')), fixedAmount: nullable(decimal(18, 2, '0')), formula: nullable(text(500)), label: nullable(text(200, false)), isActive: boolean,
}
const tierSetFields: Record<keyof PayrollTierSetDto, Rule> = {
  code, nameAr: text(200), description: nullable(text(2000, false)), inputVar: nullable(code), inputFormula: nullable(text(500)), inputUnit: enumeration(PAYROLL_DEFINITION_TIER_UNITS),
  applicationBasis: enumeration(['PER_DAY', 'PERIOD_ACCUMULATED', 'OCCURRENCE_COUNT']), tierApplicationMode: enumeration(['WHOLE', 'MARGINAL']),
  graceMode: enumeration(['NONE', 'SUBTRACT', 'WAIVE_ALL_OR_NOTHING']), graceMinutes: integer(0), graceMaxUsesPerPeriod: nullable(integer(1)),
  allowGraceOnFlexibleShift: boolean, allowShiftGraceOverride: boolean, noMatchBehavior: enumeration(['NO_DEDUCTION', 'FALLBACK_1_1', 'BLOCK']),
  maxDailyDeductionDayFraction: nullable(decimal(5, 4, '0')), maxPeriodDeductionDayFraction: nullable(decimal(7, 4, '0')),
  secondsRoundingMode: enumeration(['FLOOR', 'CEIL', 'NEAREST']), minutesRoundingMode: enumeration(['FLOOR', 'CEIL', 'NEAREST']), roundingUnitMinutes: enumeration([1, 5, 10, 15]),
  roundingMode: nullable(enumeration(PAYROLL_DEFINITION_ROUNDING_MODES)), roundingScale: nullable(integer(0, 6)), isActive: boolean,
  tiers: collection(PAYROLL_DEFINITION_LIMITS.tiers, tierFields),
}
const salaryFields = new Set(['basicSalary', 'housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance'])
const financialUnits = new Set(['CURRENCY', 'DAYS', 'HOURS', 'MINUTES'])
const rollups = new Map<string, { unit: string; type: string }>([
  ['basicSalary', { unit: 'CURRENCY', type: 'EARNING' }], ['allowances', { unit: 'CURRENCY', type: 'EARNING' }],
  ['overtimeAmount', { unit: 'CURRENCY', type: 'EARNING' }], ['otherAdditions', { unit: 'CURRENCY', type: 'EARNING' }],
  ['latenessDeduction', { unit: 'CURRENCY', type: 'DEDUCTION' }], ['absenceDeduction', { unit: 'CURRENCY', type: 'DEDUCTION' }],
  ['shortfallDeduction', { unit: 'CURRENCY', type: 'DEDUCTION' }],
  ['unpaidLeaveDeduction', { unit: 'CURRENCY', type: 'DEDUCTION' }], ['loanInstallments', { unit: 'CURRENCY', type: 'DEDUCTION' }], ['otherDeductions', { unit: 'CURRENCY', type: 'DEDUCTION' }],
  ['overtimeHours', { unit: 'HOURS', type: 'INFO' }], ['lateMinutes', { unit: 'MINUTES', type: 'INFO' }], ['absenceDays', { unit: 'DAYS', type: 'INFO' }], ['unpaidLeaveDays', { unit: 'DAYS', type: 'INFO' }],
  ['shortfallMinutes', { unit: 'MINUTES', type: 'INFO' }],
])
const variables = new Map(PAYROLL_SRS_VARIABLES.map(item => [item.code, item]))
const sourceFields: Array<keyof PayrollPolicyComponentDto> = ['amount', 'fieldPath', 'missingFieldBehavior', 'varCode', 'multiplier', 'percent', 'baseCode', 'tierSetCode', 'formula', 'ledgerCategory', 'ledgerDirection', 'ledgerPartialPayment']
const sourceAllowed: Record<PayrollPolicyComponentDto['valueSource'], Array<keyof PayrollPolicyComponentDto>> = {
  FIXED: ['amount'], EMPLOYEE_FIELD: ['fieldPath', 'missingFieldBehavior'], SYSTEM_VAR: ['varCode', 'multiplier'], PERCENT_OF: ['percent', 'baseCode'],
  TIERED: ['tierSetCode'], FORMULA: ['formula'], LEDGER: ['ledgerCategory', 'ledgerDirection', 'ledgerPartialPayment'], EXTERNAL: [], SYS_NET: [],
}
function rounding(row: { roundingMode: string | null; roundingScale: number | null }, path: string) {
  if ((row.roundingMode === null) !== (row.roundingScale === null)) fail('DEFINITION_ROUNDING_PAIR', 'قاعدة التقريب وعدد المنازل يحددان معًا أو يكونانnull معًا', path)
}
function distinct<T>(rows: T[], key: (item: T) => string, path: string) {
  const seen = new Set<string>()
  for (const row of rows) { const value = key(row); if (seen.has(value)) fail('DEFINITION_DUPLICATE', `قيمة مكررة: ${value}`, path); seen.add(value) }
}
function freeze<T>(value: T): DeepReadonly<T> {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }
  return value as DeepReadonly<T>
}

export function validatePayrollPolicyDefinition(input: unknown, frozenSettings: PayrollPolicySettings, options: PayrollDefinitionOptions = {}) {
  if (!frozenSettings || typeof frozenSettings !== 'object') fail('DEFINITION_SETTINGS_REQUIRED', 'تعريف البنود يتطلب إعدادات نسخة مكتملة وصالحة', 'settings')
  const settingsInspection = inspectPayrollPolicySettings(frozenSettings)
  if (settingsInspection.settingsStatus !== 'COMPLETE') fail('DEFINITION_SETTINGS_REQUIRED', 'تعريف البنود يتطلب إعدادات نسخة مكتملة وصالحة', 'settings', { issues: settingsInspection.settingsIssues })
  if (options.autoOrder !== undefined && typeof options.autoOrder !== 'boolean') fail('DEFINITION_OPTIONS_INVALID', 'autoOrder يجب أن يكونtrue أوfalse', 'options.autoOrder')
  const definition = shape<PayrollPolicyDefinitionDto>(input, 'definition', {
    parameters: collection(PAYROLL_DEFINITION_LIMITS.parameters, parameterFields), tierSets: collection(PAYROLL_DEFINITION_LIMITS.tierSets, tierSetFields), components: collection(PAYROLL_DEFINITION_LIMITS.components, componentFields),
  })
  if (definition.tierSets.reduce((total, set) => total + set.tiers.length, 0) > PAYROLL_DEFINITION_LIMITS.tiers) fail('DEFINITION_COLLECTION_LIMIT', 'مجموع الشرائح يتجاوز1000', 'definition.tierSets')
  distinct(definition.tierSets, item => item.code, 'definition.tierSets')
  const symbols = { components: definition.components.map(item => item.code), parameters: definition.parameters.map(item => item.code), typedDeductions: options.typedDeductionCodes ?? [] }
  try {
    validatePayrollFormulaSymbols(symbols)
    validatePayrollFormulaSymbols({ parameters: definition.tierSets.map(item => item.code) })
  } catch (error) { fail('DEFINITION_SYMBOLS_INVALID', error instanceof Error ? error.message : 'رموز التعريف غير صالحة', 'definition') }
  const parameters = new Map(definition.parameters.map(item => [item.code, item])), components = new Map(definition.components.map(item => [item.code, item])), sets = new Map(definition.tierSets.map(item => [item.code, item]))
  const warnings: PayrollDefinitionWarning[] = []
  const warn = (warning: PayrollDefinitionWarning) => { if (!warnings.some(item => item.key === warning.key)) warnings.push(warning) }
  const modeFor = (component?: PayrollPolicyComponentDto, set?: PayrollTierSetDto) => component?.roundingMode ?? set?.roundingMode ?? frozenSettings.roundingMode
  const formulaDependencies = (formula: string, path: string, kind: 'AMOUNT' | 'CONDITION', mode: PayrollPolicySettings['roundingMode']) => {
    let compiled
    try { compiled = compilePayrollFormula(formula, { variables: [...PAYROLL_SRS_VARIABLE_CODES], ...symbols, kind, roundingMode: mode }) }
    catch (error) {
      if (error instanceof PayrollFormulaError) fail(error.code, error.message, path, { position: error.position })
      throw error
    }
    for (const name of compiled.references.parameters) if (!parameters.get(name)?.isActive) fail('DEFINITION_PARAMETER_DISABLED', `المعامل ${name} معطل`, path, { parameterCode: name })
    return compiled.references.components
  }
  const baseDependency = (base: string, path: string): string[] => {
    if (base === 'BASE_SALARY' || base === 'GROSS_SALARY') return []
    const match = /^COMP\[([A-Z][A-Z0-9_]{0,39})\]$/.exec(base)
    if (!match || !components.has(match[1])) fail('DEFINITION_BASE_INVALID', 'القاعدة يجب أن تكونBASE_SALARY أوGROSS_SALARY أوCOMP[CODE] من المجموعة', path)
    if (components.get(match[1])!.unit !== 'CURRENCY') fail('DEFINITION_BASE_UNIT', 'قاعدة النسبة يجب أن تكون بعملة', path)
    return [match[1]]
  }
  for (const parameter of definition.parameters) {
    if (parameter.unit === 'FLAG' && !['0', '1'].includes(parameter.value)) fail('DEFINITION_FLAG_INVALID', 'المعاملFLAG يقبل0 أو1 فقط', `parameters.${parameter.code}.value`)
    if (['COUNT', 'MONTHS'].includes(parameter.unit) && (parameter.value.includes('.') || compare(parameter.value, '0') < 0)) fail('DEFINITION_UNIT_VALUE', 'وحدةالعدد والأشهر تحتاج قيمة صحيحة غير سالبة', `parameters.${parameter.code}.value`)
  }

  const setDependencies = new Map<string, string[]>()
  for (const set of definition.tierSets) {
    const path = `tierSets.${set.code}`
    rounding(set, path)
    if ((set.inputVar === null) === (set.inputFormula === null)) fail('TIER_INPUT_EXCLUSIVE', 'حددinputVar أوinputFormula واحدًا فقط', path)
    const dependencies = new Set<string>()
    if (set.inputVar !== null) {
      const variable = variables.get(set.inputVar)
      if (!variable || variable.unit.toUpperCase() !== set.inputUnit) fail('TIER_INPUT_UNIT', 'متغير مدخل الطقم غير معروف أو وحدته لا تطابقinputUnit', `${path}.inputVar`)
    }
    if (set.inputFormula !== null) for (const dependency of formulaDependencies(set.inputFormula, `${path}.inputFormula`, 'AMOUNT', modeFor(undefined, set))) dependencies.add(dependency)
    if ((set.applicationBasis === 'OCCURRENCE_COUNT') !== (set.inputUnit === 'COUNT')) fail('TIER_BASIS_UNIT', 'OCCURRENCE_COUNT يستخدمCOUNT؛ بقية الأسس لا تستخدم عددالوقائع', path)
    if (set.graceMode === 'NONE' && (set.graceMinutes !== 0 || set.graceMaxUsesPerPeriod !== null || set.allowGraceOnFlexibleShift)) fail('TIER_GRACE_CONTRADICTION', 'NONE لا يقبل دقائقسماح أوعددمرات أوتفعيلسماحللمرونة', path)
    if (set.graceMode !== 'NONE' && set.graceMinutes === 0) fail('TIER_GRACE_CONTRADICTION', 'مدةالسماح يجب أن تكونموجبة عنداختيارنمطسماح', path)
    if (set.inputUnit !== 'MINUTES' && (set.graceMode !== 'NONE' || set.graceMinutes !== 0 || set.graceMaxUsesPerPeriod !== null || set.allowGraceOnFlexibleShift || set.allowShiftGraceOverride || set.roundingUnitMinutes !== 1)) fail('TIER_UNIT_CONFIGURATION', 'السماح وتقريبالدقائق لا يطبقان على وحدة أخرى', path)
    if (set.applicationBasis !== 'PER_DAY' && set.maxDailyDeductionDayFraction !== null) fail('TIER_DAILY_CAP_BASIS', 'السقفاليومي لا ينطبق خارجPER_DAY؛ استخدمnull', path)
    if (set.inputUnit === 'COUNT' && set.noMatchBehavior === 'FALLBACK_1_1') fail('TIER_RATE_UNIT', 'عددالوقائع لا يملك سعرالدقيقة؛ FALLBACK_1_1 غيرصالح', path)
    distinct(set.tiers, tier => String(tier.sequence), `${path}.tiers`)
    for (const tier of set.tiers) {
      const tierPath = `${path}.tiers.${tier.sequence}`
      if (tier.toValue !== null && compare(tier.fromValue, tier.toValue) >= 0) fail('TIER_BOUNDS_INVALID', 'حدالبداية يجب أن يسبق حدالنهاية', tierPath)
      if (['MINUTES', 'COUNT'].includes(set.inputUnit) && (tier.fromValue.includes('.') || tier.toValue?.includes('.'))) fail('TIER_INTEGER_INPUT', 'حدودالدقائق والوقائع أعدادصحيحة دونكسور', tierPath)
      const required = tier.method === 'MULTIPLIER' ? 'multiplier' : tier.method === 'DAY_FRACTION' ? 'dayFraction' : tier.method === 'FIXED_AMOUNT' ? 'fixedAmount' : tier.method === 'FORMULA' ? 'formula' : null
      for (const field of ['multiplier', 'dayFraction', 'fixedAmount', 'formula'] as const) {
        if ((field === required && tier[field] === null) || (field !== required && tier[field] !== null)) fail('TIER_METHOD_FIELDS', `النمط${tier.method} يحتاج حقله فقط معnull لغيرالمنطبق`, tierPath)
      }
      if (required !== null && required !== 'formula' && compare(tier[required]!, '0') <= 0) fail('TIER_METHOD_POSITIVE', 'معامل أوكسر أو مبلغالشريحة يجب أن يكونموجبًا', tierPath)
      if (set.inputUnit === 'COUNT' && ['MULTIPLIER', 'RATE_1_1'].includes(tier.method)) fail('TIER_RATE_UNIT', 'سعرالدقيقة لا يصلحعددالوقائع؛ اخترمبلغًا أوكسريوم أومعادلةواضحة', tierPath)
      if (tier.formula !== null) for (const dependency of formulaDependencies(tier.formula, `${tierPath}.formula`, 'AMOUNT', modeFor(undefined, set))) dependencies.add(dependency)
    }
    setDependencies.set(set.code, [...dependencies])
    const active = set.tiers.filter(tier => tier.isActive).sort((left, right) => compare(left.fromValue, right.fromValue) || left.sequence - right.sequence)
    if (set.isActive || active.length) {
      if (!active.length || active.filter(tier => tier.toValue === null).length !== 1 || active[active.length - 1].toValue !== null) fail('TIER_OPEN_END_REQUIRED', 'الطقم يحتاج شريحةمفعلةأخيرة واحدةمفتوحةالنهاية', path)
      for (let index = 1; index < active.length; index++) {
        const previous = active[index - 1], current = active[index]
        if (previous.toValue === null || compare(previous.toValue, current.fromValue) > 0) fail('TIER_OVERLAP', `تداخل بينالشريحتين${previous.sequence} و${current.sequence}`, path, { previous: previous.sequence, current: current.sequence, from: current.fromValue, to: previous.toValue })
        if (compare(previous.toValue, current.fromValue) < 0) fail('TIER_GAP', `فجوةبينالشريحتين${previous.sequence} و${current.sequence}`, path, { previous: previous.sequence, current: current.sequence, from: previous.toValue, to: current.fromValue })
      }
    }
    const details = (): Record<string, PayrollDefinitionJson> => ({ inputUnit: set.inputUnit, applicationBasis: set.applicationBasis, tierApplicationMode: set.tierApplicationMode,
      inputVar: set.inputVar, inputFormula: set.inputFormula, dailyHours: String(frozenSettings.dailyHours),
      tiers: active.map(({ sequence, fromValue, toValue, method, multiplier, dayFraction, fixedAmount, formula }) => ({ sequence, fromValue, toValue, method, multiplier, dayFraction, fixedAmount, formula })),
      noMatchBehavior: set.noMatchBehavior, graceMode: set.graceMode, graceMinutes: set.graceMinutes, roundingMode: modeFor(undefined, set), roundingScale: set.roundingScale ?? frozenSettings.roundingScale,
      maxDailyDeductionDayFraction: set.maxDailyDeductionDayFraction, maxPeriodDeductionDayFraction: set.maxPeriodDeductionDayFraction })
    if (active.length && compare(active[0].fromValue, '0') > 0) warn({ key: `TIER_BEFORE_FIRST_RANGE:${set.code}`, code: 'TIER_BEFORE_FIRST_RANGE', message: 'المنطقة قبل أول شريحة ليست فجوة؛ يطبق عليها سلوك عدم المطابقة المحدد في الطقم', tierSetCode: set.code, details: { ...details(), from: '0', to: active[0].fromValue } })
    if (set.tierApplicationMode === 'MARGINAL' && active.some(tier => ['DAY_FRACTION', 'FIXED_AMOUNT'].includes(tier.method))) warn({ key: `TIER_MARGINAL_FIXED_METHOD:${set.code}`, code: 'TIER_MARGINAL_FIXED_METHOD', message: 'كسر اليوم والمبلغ المقطوع لا يتوزعان؛ يطبقان كاملين للشريحة التي وصلها المدخل', tierSetCode: set.code, details: details() })
    if (set.applicationBasis === 'PERIOD_ACCUMULATED' && active.some(tier => tier.method === 'DAY_FRACTION')) warn({ key: `TIER_PERIOD_DAY_FRACTION:${set.code}`, code: 'TIER_PERIOD_DAY_FRACTION', message: 'كسر اليوم مع التراكم يطبق مرة على الفترة وقد يخفف الخصم؛ يلزم إقرار هذا الاختيار', tierSetCode: set.code, details: details() })
    // المقارنة هنا برهانلتعريفنسبي بسيط، وليستتشغيلًا علىراتبأوموظف أوتطبيقسقف.
    const normalizedRate = (tier: PayrollPolicyTierDto, point: string): PayrollDecimal | null => {
      if (tier.method === 'NONE') return dec('0')
      if (tier.method === 'DAY_FRACTION') return dec(tier.dayFraction!)
      if (!['MULTIPLIER', 'RATE_1_1'].includes(tier.method) || !['MINUTES', 'HOURS', 'DAYS'].includes(set.inputUnit)) return null
      const divisor = set.inputUnit === 'DAYS' ? dec('1') : set.inputUnit === 'HOURS' ? dec(String(frozenSettings.dailyHours)) : dec(String(frozenSettings.dailyHours)).multiply(dec('60'))
      return dec(point).multiply(dec(tier.multiplier ?? '1')).divide(divisor)
    }
    let unproven = set.inputFormula !== null || active.some(tier => tier.method === 'FORMULA')
    const comparisonTiers = [...active]
    if (active.length && set.noMatchBehavior === 'FALLBACK_1_1' && compare(active[0].fromValue, '0') > 0) {
      comparisonTiers.unshift({ sequence: 0, fromValue: '0', toValue: active[0].fromValue, method: 'RATE_1_1', multiplier: null, dayFraction: null, fixedAmount: null, formula: null, label: 'سلوك عدم المطابقة قبل أول شريحة', isActive: true })
    }
    if (set.tierApplicationMode === 'WHOLE') for (let index = 1; index < comparisonTiers.length; index++) {
      const previous = comparisonTiers[index - 1], current = comparisonTiers[index], discrete = ['MINUTES', 'COUNT'].includes(set.inputUnit)
      const beforePoint = discrete ? dec(current.fromValue).subtract(dec('1')).canonical() : current.fromValue
      let before = normalizedRate(previous, beforePoint), after = normalizedRate(current, current.fromValue)
      if (previous.method === 'FIXED_AMOUNT' && current.method === 'FIXED_AMOUNT') { before = dec(previous.fixedAmount!); after = dec(current.fixedAmount!) }
      if (before === null || after === null) unproven = true
      else if (before.compare(after) > 0) warn({ key: `TIER_MONOTONIC_DECREASE:${set.code}:${previous.sequence}:${current.sequence}`, code: 'TIER_MONOTONIC_DECREASE', message: 'تعريف الخصم يتناقص عند الانتقال إلى الشريحة الأعلى؛ يحتاج إقرارًا موثقًا', tierSetCode: set.code, tierSequence: current.sequence,
        details: { ...details(), previousSequence: previous.sequence, currentSequence: current.sequence, previousInput: beforePoint, currentInput: current.fromValue, before: before.format(6, 'HALF_UP'), after: after.format(6, 'HALF_UP') } })
    }
    if (set.tierApplicationMode === 'MARGINAL' && active.some(tier => ['FIXED_AMOUNT', 'DAY_FRACTION', 'FORMULA'].includes(tier.method))) unproven = true
    if (unproven) warn({ key: `TIER_MONOTONIC_UNPROVEN:${set.code}`, code: 'TIER_MONOTONIC_UNPROVEN', message: 'رتابة هذا الطقم غير مبرهنة تحليليًا؛ يلزم إقرار ومعاينة لاحقة على عينات. حفظ التعريف لا يثبت نتيجة حساب فعلية', tierSetCode: set.code, details: details() })
  }

  const ordered = definition.components.map(component => {
    const path = `components.${component.code}`, dependencies = new Set<string>()
    rounding(component, path)
    if (component.componentType !== 'INFO' && !financialUnits.has(component.unit)) fail('COMPONENT_FINANCIAL_UNIT', 'الاستحقاق والخصم يحتاجانعملةأوأيامًاأوساعاتأودقائق', path)
    if ((component.componentType === 'EARNING' && ![1, 2].includes(component.stage)) || (component.componentType === 'DEDUCTION' && ![3, 4, 5].includes(component.stage))) fail('COMPONENT_STAGE_TYPE', 'نوعالبند لا يطابقمرحلةالتنفيذ', path)
    if (component.componentType === 'DEDUCTION' ? component.deductionPriority === null : component.deductionPriority !== null || component.carryOverEligible) fail('COMPONENT_DEDUCTION_OPTIONS', 'الخصم يتطلبأولويةتقليص؛ بقيةالأنواع لا تقبلأولويةأوترحيلخصم', path)
    for (const field of sourceFields) {
      const allowed = sourceAllowed[component.valueSource].includes(field), optional = component.valueSource === 'SYSTEM_VAR' && field === 'multiplier'
      if ((!allowed && component[field] !== null) || (allowed && !optional && component[field] === null)) fail('COMPONENT_SOURCE_FIELDS', `المصدر${component.valueSource} يتطلبحقولهفقط معnull لغيرالمنطبق`, `${path}.${field}`)
    }
    if (component.amount !== null && component.componentType !== 'INFO' && compare(component.amount, '0') < 0) fail('COMPONENT_NEGATIVE_FIXED', 'المبلغالثابت للاستحقاقوالخصم يجب ألايكونسالبًا؛ تصفيرناتجالمعادلةلاحقًا', `${path}.amount`)
    if (component.fieldPath !== null && (!salaryFields.has(component.fieldPath) || component.unit !== 'CURRENCY')) fail('COMPONENT_FIELD_NOT_ALLOWED', 'مصدرالموظف يقبلحقولالأجرالستةبالعملةفقط', `${path}.fieldPath`)
    if (component.varCode !== null) {
      const variable = variables.get(component.varCode)
      if (!variable || variable.unit.toUpperCase() !== component.unit) fail('COMPONENT_VARIABLE_UNIT', 'متغيرالنظام غيرمعروفأووحدتهلاتطابقالبند', `${path}.varCode`)
    }
    if (component.valueSource === 'PERCENT_OF' && component.unit !== 'CURRENCY') fail('COMPONENT_BASE_UNIT', 'النسبةمنأساسالأجر يجبأنتنتجعملة', path)
    if (component.baseCode !== null) for (const dependency of baseDependency(component.baseCode, `${path}.baseCode`)) dependencies.add(dependency)
    if ((component.capPctOfBase === null) !== (component.capBaseCode === null)) fail('COMPONENT_CAP_PAIR', 'سقفالنسبةوقاعدته يحددانمعًاأويكونانnull معًا', path)
    if (component.capBaseCode !== null) {
      if (component.unit !== 'CURRENCY') fail('COMPONENT_CAP_UNIT', 'سقفالنسبةمنالأجريتطلببندًابالعملة', path)
      for (const dependency of baseDependency(component.capBaseCode, `${path}.capBaseCode`)) dependencies.add(dependency)
    }
    if (component.minAmount !== null && component.maxAmount !== null && compare(component.minAmount, component.maxAmount) > 0) fail('COMPONENT_CAP_ORDER', 'الحدالأدنىيتجاوزالحدالأعلى', path)
    if (component.ledgerCategory !== null && !/^(?:\*|[A-Za-z][A-Za-z0-9_-]{0,39})$/.test(component.ledgerCategory)) fail('COMPONENT_LEDGER_CATEGORY', 'فئةالدفتركودصريحأو*', `${path}.ledgerCategory`)
    if (component.valueSource === 'LEDGER' && (component.unit !== 'CURRENCY' || (component.componentType === 'EARNING' && component.ledgerDirection !== 'CREDIT') || (component.componentType === 'DEDUCTION' && component.ledgerDirection !== 'DEBIT'))) fail('COMPONENT_LEDGER_DIRECTION', 'اتجاهالدفتر يجبأنيطابقنوعالبندوعملته', path)
    if (component.rollupTo !== null) { const target = rollups.get(component.rollupTo); if (!target || target.unit !== component.unit || target.type !== component.componentType) fail('COMPONENT_ROLLUP_INVALID', 'عمودالتجميعغيرمسموحأولايناسبالنوعوالوحدة', `${path}.rollupTo`) }
    if ((component.code === 'NET') !== (component.valueSource === 'SYS_NET')) fail('COMPONENT_SYSTEM_NET', 'SYS_NET مصدرحصريلبندNET', path)
    if (component.code === 'NET' && (component.componentType !== 'INFO' || component.stage !== 6 || !component.isActive || component.unit !== 'CURRENCY' || component.prorationMode !== 'NONE' || component.exemptible || component.carryOverEligible || component.conditionFormula !== null || component.formula !== null || component.minAmount !== null || component.maxAmount !== null || component.capPctOfBase !== null || component.roundingMode !== null || component.rollupTo !== null)) fail('COMPONENT_SYSTEM_NET', 'NET بندنظاميINFO نشطأخيربالمرحلة6، بلاشرطأومعادلةأوقصأوتقريببديلأوإعفاء', path)
    if (component.formula !== null) for (const dependency of formulaDependencies(component.formula, `${path}.formula`, 'AMOUNT', modeFor(component))) dependencies.add(dependency)
    if (component.conditionFormula !== null) for (const dependency of formulaDependencies(component.conditionFormula, `${path}.conditionFormula`, 'CONDITION', modeFor(component))) dependencies.add(dependency)
    if (component.tierSetCode !== null) {
      const set = sets.get(component.tierSetCode)
      if (!set || !set.isActive) fail('COMPONENT_TIER_SET_INVALID', 'طقمشرائحالبندغيرموجودأومعطل', `${path}.tierSetCode`)
      if (component.unit !== 'CURRENCY') fail('COMPONENT_TIER_OUTPUT_UNIT', 'طرقخصمطقم الشرائحتنتجعملة', path)
      for (const dependency of setDependencies.get(set.code)!) dependencies.add(dependency)
      // تجاوزتقريبالبندقديغيرROUNDالثابت فيالطقم؛ نتحققبهأيضًا قبلقبولالربط.
      if (set.inputFormula !== null) for (const dependency of formulaDependencies(set.inputFormula, `${path}.tierInput`, 'AMOUNT', modeFor(component, set))) dependencies.add(dependency)
      for (const tier of set.tiers) if (tier.formula !== null) for (const dependency of formulaDependencies(tier.formula, `${path}.tierFormula.${tier.sequence}`, 'AMOUNT', modeFor(component, set))) dependencies.add(dependency)
    }
    return { code: component.code, stage: component.stage, sequence: component.sequence, isActive: component.isActive, dependencies: [...dependencies] }
  })
  const graph = validatePayrollComponentOrder(ordered, { autoOrder: options.autoOrder ?? false })
  if (!graph.ok) fail('DEFINITION_COMPONENT_ORDER', graph.errors.find(error => error.code === 'DEPENDENCY_CYCLE')?.message ?? graph.errors[0]?.message ?? 'ترتيبالبنودغيرصالح', 'components', { errors: plain(graph.errors) as unknown as PayrollDefinitionJson })
  if (options.autoOrder) {
    const previous = definition.components.map(({ code, stage, sequence }) => ({ code, stage, sequence }))
    for (const proposed of graph.suggestedSequences) components.get(proposed.code)!.sequence = proposed.sequence
    if (graph.warnings.length) warn({ key: 'AUTO_ORDER_APPLIED', code: 'AUTO_ORDER_APPLIED', message: 'أعيد ترتيب التسلسلات وفق اعتماديات حتمية؛ يلزم إقرار تعديل الترتيب', details: { previous, proposed: plain(graph.suggestedSequences) } })
  }
  definition.parameters.sort((left, right) => left.code < right.code ? -1 : left.code > right.code ? 1 : 0)
  definition.tierSets.sort((left, right) => left.code < right.code ? -1 : left.code > right.code ? 1 : 0)
  for (const set of definition.tierSets) set.tiers.sort((left, right) => left.sequence - right.sequence)
  definition.components.sort((left, right) => left.stage - right.stage || left.sequence - right.sequence)
  warnings.sort((left, right) => left.key < right.key ? -1 : left.key > right.key ? 1 : 0)
  return { definition: freeze(definition), warnings: freeze(warnings) }
}
