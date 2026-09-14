import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_NET_SOURCE_CLASSES, PayrollNetFinalizationInput, PayrollNetFraction, PayrollNetSourceClass } from './payroll-net-finalization'

export const PAYROLL_COLLECTION_POLICY_VERSION = 'SRS_COLLECTION_V1_20260913' as const
export const PAYROLL_COLLECTION_POLICY_LIMITS = Object.freeze({ components: 200, parameters: 200, tierSets: 50, tiers: 1000, nodes: 100000, nesting: 12, keysPerObject: 64, textCharacters: 20000, sourceRefCharacters: 200, fractionCharacters: 1234 })
export interface PayrollCollectionClassification { componentCode: string; kind: PayrollNetSourceClass }
export interface PayrollCollectionPolicy { schemaVersion: typeof PAYROLL_COLLECTION_POLICY_VERSION; classifications: PayrollCollectionClassification[]; collectionOrder: string[] }
export interface PayrollCollectionPolicyIssue { code: string; message: string; path: string }
export interface PayrollCollectionPolicyInspection { state: 'MISSING' | 'INVALID' | 'COMPLETE'; collection: PayrollCollectionPolicy | null; issues: PayrollCollectionPolicyIssue[] }
export interface PayrollCollectionNetEvidence { earnedFixedGross: string | PayrollNetFraction; sourceRef: string; policySourceRef: string }
export class PayrollCollectionPolicyError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollCollectionPolicyError' }
}

const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
const symbol = /^[A-Z][A-Z0-9_]{0,39}$/
const protectedClasses = new Set<PayrollNetSourceClass>(['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'])
const componentFields = ['code', 'nameAr', 'componentType', 'stage', 'sequence', 'valueSource', 'conditionFormula', 'unit', 'prorationMode', 'amount', 'fieldPath', 'missingFieldBehavior', 'varCode', 'multiplier', 'percent', 'baseCode', 'tierSetCode', 'formula', 'ledgerCategory', 'ledgerDirection', 'ledgerPartialPayment', 'minAmount', 'maxAmount', 'capPctOfBase', 'capBaseCode', 'roundingMode', 'roundingScale', 'deductionPriority', 'carryOverEligible', 'rollupTo', 'exemptible', 'showOnPayslip', 'isActive']
const parameterFields = ['code', 'nameAr', 'value', 'unit', 'isActive']
const tierFields = ['sequence', 'fromValue', 'toValue', 'method', 'multiplier', 'dayFraction', 'fixedAmount', 'formula', 'label', 'isActive']
const tierSetFields = ['code', 'nameAr', 'description', 'inputVar', 'inputFormula', 'inputUnit', 'applicationBasis', 'tierApplicationMode', 'graceMode', 'graceMinutes', 'graceMaxUsesPerPeriod', 'allowGraceOnFlexibleShift', 'allowShiftGraceOverride', 'noMatchBehavior', 'maxDailyDeductionDayFraction', 'maxPeriodDeductionDayFraction', 'secondsRoundingMode', 'minutesRoundingMode', 'roundingUnitMinutes', 'roundingMode', 'roundingScale', 'isActive', 'tiers']
function fail(code: string, message: string, path: string): never { throw new PayrollCollectionPolicyError(`COLLECTION_${code}`, message, path) }
function freeze<T>(value: T): T { if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }
function safeClone(value: unknown, path: string): unknown {
  let nodes = 0
  function clone(input: unknown, where: string, depth: number): unknown {
    if (++nodes > PAYROLL_COLLECTION_POLICY_LIMITS.nodes || depth > PAYROLL_COLLECTION_POLICY_LIMITS.nesting) fail('INPUT_LIMIT', 'تجاوز حجم أو تعشيش سياسة التحصيل الحد التقني', where)
    if (typeof input === 'string') { if (input.length > PAYROLL_COLLECTION_POLICY_LIMITS.textCharacters) fail('INPUT_LIMIT', 'النص يتجاوز الحد التقني', where); return input }
    if (input === null || typeof input === 'boolean' || (typeof input === 'number' && Number.isFinite(input))) return input
    if (typeof input !== 'object') fail('SHAPE_INVALID', 'قيم JSON صريحة فقط مطلوبة', where)
    const array = Array.isArray(input), prototype = Object.getPrototypeOf(input)
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail('SHAPE_INVALID', 'النماذج الموروثة المخصصة غير مقبولة', where)
    if (!array && Reflect.ownKeys(input).length > PAYROLL_COLLECTION_POLICY_LIMITS.keysPerObject) fail('INPUT_LIMIT', 'الكائن يتجاوز حد عدد المفاتيح', where)
    const result: unknown[] | Record<string, unknown> = array ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(input)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key) || key.length > 100 || (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= input.length))) fail('SHAPE_INVALID', 'خاصية غير مسموحة في JSON', where)
      const descriptor = Object.getOwnPropertyDescriptor(input, key)!
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('SHAPE_INVALID', 'الخصائص المحسوبة أو المخفية غير مقبولة', `${where}.${key}`)
      ;(result as Record<string, unknown>)[key] = clone(descriptor.value, `${where}.${key}`, depth + 1)
    }
    if (array && Object.keys(result).length !== input.length) fail('SHAPE_INVALID', 'قائمة ذات فراغات غير مقبولة', where)
    return result
  }
  return clone(value, path, 0)
}
function shape(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('SHAPE_INVALID', 'كائن JSON صريح مطلوب', path)
  const result = value as Record<string, unknown>
  for (const key of Object.keys(result)) if (!keys.includes(key)) fail('FIELD_UNKNOWN', `حقل غير مسموح: ${key}`, `${path}.${key}`)
  for (const key of keys) if (!own(result, key)) fail('FIELD_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return result
}
function array(value: unknown, max: number, path: string): unknown[] { if (!Array.isArray(value) || value.length > max) fail('LIST_INVALID', `قائمة بحد أقصى ${max} مطلوبة`, path); return value }
function code(value: unknown, path: string): string { if (typeof value !== 'string' || !symbol.test(value)) fail('CODE_INVALID', 'رمز بند بحروف كبيرة وبحد أقصى 40 محرفًا مطلوب', path); return value }
interface CollectionComponent { code: string; componentType: string; valueSource: string; ledgerDirection: 'DEBIT' | 'CREDIT' | null; carryOverEligible: boolean; isActive: boolean }

// التعريف المالي يأتي بعد تحققه المختص؛ هنا نثبت بنيته وحقول علاقة التحصيل دون تشغيل معادلاته.
function readDefinition(definition: unknown): CollectionComponent[] {
  const value = shape(definition, ['components', 'parameters', 'tierSets'], 'definition')
  const components = array(value.components, PAYROLL_COLLECTION_POLICY_LIMITS.components, 'definition.components').map((raw, index) => {
    const path = `definition.components[${index}]`, item = shape(raw, componentFields, path)
    const componentCode = code(item.code, `${path}.code`)
    if (!['EARNING', 'DEDUCTION', 'INFO'].includes(item.componentType as string) || !['FIXED', 'EMPLOYEE_FIELD', 'SYSTEM_VAR', 'PERCENT_OF', 'TIERED', 'FORMULA', 'LEDGER', 'EXTERNAL', 'SYS_NET'].includes(item.valueSource as string) || typeof item.carryOverEligible !== 'boolean' || typeof item.isActive !== 'boolean' || ![null, 'DEBIT', 'CREDIT'].includes(item.ledgerDirection as string | null)) fail('DEFINITION_INVALID', 'حقول تعريف البند المرتبطة بالتحصيل غير صالحة', path)
    if (item.valueSource === 'LEDGER' ? item.ledgerDirection === null : item.ledgerDirection !== null) fail('DEFINITION_INVALID', 'اتجاه الدفتر يجب أن يطابق مصدر البند', path)
    if (item.valueSource === 'LEDGER' && ((item.ledgerDirection === 'DEBIT' && item.componentType !== 'DEDUCTION') || (item.ledgerDirection === 'CREDIT' && item.componentType !== 'EARNING'))) fail('DEFINITION_INVALID', 'اتجاه الدفتر لا يطابق نوع البند المالي', path)
    return { code: componentCode, componentType: item.componentType as string, valueSource: item.valueSource as string, ledgerDirection: item.ledgerDirection as 'DEBIT' | 'CREDIT' | null, carryOverEligible: item.carryOverEligible, isActive: item.isActive }
  })
  if (new Set(components.map(item => item.code)).size !== components.length) fail('DEFINITION_INVALID', 'رموز البنود مكررة في التعريف', 'definition.components')
  array(value.parameters, PAYROLL_COLLECTION_POLICY_LIMITS.parameters, 'definition.parameters').forEach((item, index) => shape(item, parameterFields, `definition.parameters[${index}]`))
  let tiers = 0
  array(value.tierSets, PAYROLL_COLLECTION_POLICY_LIMITS.tierSets, 'definition.tierSets').forEach((item, index) => {
    const path = `definition.tierSets[${index}]`, set = shape(item, tierSetFields, path)
    const rows = array(set.tiers, PAYROLL_COLLECTION_POLICY_LIMITS.tiers, `${path}.tiers`); tiers += rows.length
    if (tiers > PAYROLL_COLLECTION_POLICY_LIMITS.tiers) fail('INPUT_LIMIT', 'إجمالي الشرائح يتجاوز حد التعريف', 'definition.tierSets')
    rows.forEach((row, i) => shape(row, tierFields, `${path}.tiers[${i}]`))
  })
  return components
}
function validate(definition: unknown, input: unknown): { policy: PayrollCollectionPolicy; components: CollectionComponent[] } {
  const components = readDefinition(definition), deductions = components.filter(component => component.componentType === 'DEDUCTION')
  const raw = shape(input, ['schemaVersion', 'classifications', 'collectionOrder'], 'collection')
  if (raw.schemaVersion !== PAYROLL_COLLECTION_POLICY_VERSION) fail('VERSION_INVALID', 'إصدار عقد التحصيل غير مدعوم', 'collection.schemaVersion')
  const byCode = new Map(deductions.map(component => [component.code, component]))
  const classes = new Map<string, PayrollNetSourceClass>()
  for (const [index, item] of array(raw.classifications, PAYROLL_COLLECTION_POLICY_LIMITS.components, 'collection.classifications').entries()) {
    const path = `collection.classifications[${index}]`, classification = shape(item, ['componentCode', 'kind'], path)
    const componentCode = code(classification.componentCode, `${path}.componentCode`), kind = classification.kind as PayrollNetSourceClass
    if (!PAYROLL_NET_SOURCE_CLASSES.includes(kind)) fail('CLASSIFICATION_INVALID', 'تصنيف خصم مغلق صالح مطلوب', `${path}.kind`)
    const component = byCode.get(componentCode)
    if (!component || classes.has(componentCode)) fail('CLASSIFICATION_INVALID', 'كل تصنيف يجب أن يخص بند خصم معروفًا مرة واحدة', path)
    const ledgerDebit = component.valueSource === 'LEDGER' && component.ledgerDirection === 'DEBIT'
    if (ledgerDebit !== (kind === 'LOAN')) fail('LOAN_SOURCE_MISMATCH', 'كل بند دفتر مدين يصنف قرضًا، والقرض يستلزم مصدر دفتر مدين', path)
    if ((protectedClasses.has(kind) || kind === 'ATTENDANCE') && component.carryOverEligible) fail('CARRY_INVALID', 'التصنيف المحمي والحضور لا يسمحان بترحيل الزيادة', path)
    if (kind === 'LOAN' && !component.carryOverEligible) fail('CARRY_INVALID', 'تعريف القرض يجب أن يحفظ أصل الدين المتبقي بالترحيل', path)
    classes.set(componentCode, kind)
  }
  if (classes.size !== deductions.length) fail('CLASSIFICATION_INCOMPLETE', 'يلزم تصنيف كل بند خصم، بما فيه البنود غير المفعلة', 'collection.classifications')
  const collectionOrder = array(raw.collectionOrder, PAYROLL_COLLECTION_POLICY_LIMITS.components, 'collection.collectionOrder').map((value, index) => code(value, `collection.collectionOrder[${index}]`))
  const reducibles = [...classes].filter(([, kind]) => !protectedClasses.has(kind))
  if (new Set(collectionOrder).size !== collectionOrder.length || collectionOrder.length !== reducibles.length || collectionOrder.some(componentCode => !classes.has(componentCode) || protectedClasses.has(classes.get(componentCode)!))) fail('ORDER_INVALID', 'ترتيب المالك يجب أن يشمل كل خصم قابل للتخفيض مرة واحدة فقط', 'collection.collectionOrder')
  return { policy: { schemaVersion: PAYROLL_COLLECTION_POLICY_VERSION, classifications: deductions.map(component => ({ componentCode: component.code, kind: classes.get(component.code)! })), collectionOrder }, components }
}

/** لا ترتيب افتراضي؛ يعاد ترتيب التصنيفات بحسب التعريف فقط، مع حفظ ترتيب التحصيل الذي اختاره المالك. */
export function validatePayrollCollectionPolicy(definition: unknown, input: unknown): PayrollCollectionPolicy {
  return freeze(validate(safeClone(definition, 'definition'), safeClone(input, 'collection')).policy)
}

/** null أو غياب القيمة تاريخ مفقود؛ فساد القيم الموجودة لا يرجع إلى سياسة افتراضية. */
export function inspectPayrollCollectionPolicy(definition: unknown, raw: unknown): PayrollCollectionPolicyInspection {
  if (raw === null || raw === undefined) return freeze({ state: 'MISSING', collection: null, issues: [] })
  try { return freeze({ state: 'COMPLETE', collection: validatePayrollCollectionPolicy(definition, raw), issues: [] }) }
  catch (error) {
    if (error instanceof PayrollCollectionPolicyError) return freeze({ state: 'INVALID', collection: null, issues: [{ code: error.code, message: error.message, path: error.path }] })
    throw error
  }
}

/** مرجع النسخة يولده الخادم؛ لا يستقبل هذا البناء تصنيفًا أو أهلية ترحيل من حمولة المعاينة. */
export function buildPayrollCollectionNetInput(definition: unknown, collection: unknown, evidence: PayrollCollectionNetEvidence): PayrollNetFinalizationInput {
  const { policy, components } = validate(safeClone(definition, 'definition'), safeClone(collection, 'collection'))
  const source = shape(safeClone(evidence, 'evidence'), ['earnedFixedGross', 'sourceRef', 'policySourceRef'], 'evidence')
  const sourceRef = (value: unknown, path: string): string => {
    if (typeof value !== 'string' || !value.trim() || value.length > PAYROLL_COLLECTION_POLICY_LIMITS.sourceRefCharacters) fail('SOURCE_REQUIRED', 'مرجع مصدر غير فارغ بحد أقصى 200 محرف مطلوب', path)
    return value.trim()
  }
  const basisRef = sourceRef(source.sourceRef, 'evidence.sourceRef'), policyRef = sourceRef(source.policySourceRef, 'evidence.policySourceRef')
  let earnedFixedGross: PayrollDecimal
  try {
    if (typeof source.earnedFixedGross === 'string') {
      const value = source.earnedFixedGross
      if (!/^\d+(?:\.\d+)?$/.test(value) || value.length > 80) fail('AMOUNT_INVALID', 'الأساس المالي نص عشري غير سالب أو كسر دقيق', 'evidence.earnedFixedGross')
      const normalized = value.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
      earnedFixedGross = PayrollDecimal.from(normalized)
    } else {
      const value = shape(source.earnedFixedGross, ['numerator', 'denominator'], 'evidence.earnedFixedGross')
      if (typeof value.numerator !== 'string' || typeof value.denominator !== 'string' || !/^\d+$/.test(value.numerator) || !/^[1-9]\d*$/.test(value.denominator) || value.numerator.length > PAYROLL_COLLECTION_POLICY_LIMITS.fractionCharacters || value.denominator.length > PAYROLL_COLLECTION_POLICY_LIMITS.fractionCharacters) fail('AMOUNT_INVALID', 'كسر غير سالب ذو مقام موجب مطلوب', 'evidence.earnedFixedGross')
      earnedFixedGross = new PayrollDecimal(BigInt(value.numerator), BigInt(value.denominator))
    }
  } catch (error) {
    if (error instanceof PayrollDecimalError) fail('AMOUNT_INVALID', error.message, 'evidence.earnedFixedGross')
    throw error
  }
  const byCode = new Map(components.map(component => [component.code, component]))
  return freeze({ earnedFixedGross: { numerator: String(earnedFixedGross.numerator), denominator: String(earnedFixedGross.denominator) }, sourceRef: basisRef,
    classifications: policy.classifications.map(classification => ({ ...classification, sourceRef: policyRef, carryOverEligible: byCode.get(classification.componentCode)!.carryOverEligible })),
    collectionOrder: [...policy.collectionOrder], collectionOrderSourceRef: policyRef })
}
