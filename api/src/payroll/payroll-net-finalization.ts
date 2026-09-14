import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_COMPONENT_EXECUTION_VERSION, PAYROLL_COMPONENT_SOURCES_VERSION } from './payroll-component-execution'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'

export const PAYROLL_NET_FINALIZATION_VERSION = 'SRS_NET_FINALIZATION_V1_20260913' as const
export const PAYROLL_NET_FINALIZATION_LIMITS = Object.freeze({ components: 200, inputNodes: 100000, nesting: 24, textCharacters: 20000, evaluationSteps: 1000000, fractionCharacters: 1234 })
export const PAYROLL_NET_SOURCE_CLASSES = Object.freeze(['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT', 'ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN', 'OTHER'] as const)
export type PayrollNetSourceClass = typeof PAYROLL_NET_SOURCE_CLASSES[number]
export interface PayrollNetFraction { numerator: string; denominator: string }
export interface PayrollNetMoney { amount: string; amountExact: PayrollNetFraction }
export interface PayrollNetClassification { componentCode: string; kind: PayrollNetSourceClass; sourceRef: string; carryOverEligible: boolean }
export interface PayrollNetFinalizationInput {
  earnedFixedGross: string | PayrollNetFraction
  sourceRef: string
  classifications: PayrollNetClassification[]
  collectionOrder: string[]
  collectionOrderSourceRef: string
}
export interface PayrollNetLoanRequest { componentCode: string; dueAmount: string; availableBudget: string; sourceRefs: readonly string[] }
export interface PayrollNetLoanResolution { collectedAmount: string; carriedAmount: string; details: unknown }
export type PayrollNetLoanResolver = (input: Readonly<PayrollNetLoanRequest>) => unknown
export interface PayrollNetFinalizationWarning { code: string; message: string; path: string; componentCode: string | null }
export interface PayrollNetAllocation {
  componentCode: string; classification: PayrollNetSourceClass; sourceRefs: string[]
  requestedAmount: string; collectedAmount: string; carriedAmount: string; droppedAmount: string; unallocatedAmount: string
  outcome: 'PROTECTED' | 'COLLECTED' | 'REDUCED' | 'SKIPPED' | 'BLOCKED'
  budgetBefore: string | null; budgetAfter: string | null; loanDetails: unknown
}
export class PayrollNetFinalizationError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollNetFinalizationError' }
}
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
const protectedClasses = new Set<PayrollNetSourceClass>(['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'])
const identifier = /^[A-Z][A-Z0-9_]{0,49}$/
function fail(code: string, message: string, path: string): never { throw new PayrollNetFinalizationError(`NET_${code}`, message, path) }
function fields(value: unknown, allowed: readonly string[], required: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('SHAPE_INVALID', 'كائن JSON صريح مطلوب', path)
  const result = value as Record<string, unknown>
  for (const key of Object.keys(result)) if (!allowed.includes(key)) fail('FIELD_UNKNOWN', `حقل غير مسموح: ${key}`, `${path}.${key}`)
  for (const key of required) if (!own(result, key)) fail('FIELD_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return result
}
function freeze<T>(value: T): T { if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }
const fraction = (value: PayrollDecimal): PayrollNetFraction => ({ numerator: String(value.numerator), denominator: String(value.denominator) })

/**
 * تحصيل مرحلة NET من مبالغ البنود المقربة مسبقًا ومن ترتيب صريح يملكه المستخدم.
 * مصدر الأساس والتصنيفات غير موثق هنا؛ الربط الخادمي يطابقها مع النسخة والدفتر.
 * لا تُكتب أقساط أو ذمم، ولا يُعاد حساب COMP بعد تخفيض خصم على مستوى المسير.
 */
export function finalizePayrollNet(execution: unknown, settings: PayrollPolicySettings, explicitInput: unknown, options?: { resolveLoan?: PayrollNetLoanResolver }) {
  let operations = PAYROLL_NET_FINALIZATION_LIMITS.evaluationSteps, nodes = 0, path = 'input'
  const spend = () => { if (--operations < 0) fail('EVALUATION_LIMIT', 'تجاوز حساب الصافي ميزانية التعقيد المسموح بها', path) }
  const clone = (value: unknown, where: string, depth = 0): unknown => {
    spend()
    if (++nodes > PAYROLL_NET_FINALIZATION_LIMITS.inputNodes || depth > PAYROLL_NET_FINALIZATION_LIMITS.nesting) fail('INPUT_LIMIT', 'تجاوز حجم أو تعشيش المدخلات الحد التقني', where)
    if (typeof value === 'string') { if (value.length > PAYROLL_NET_FINALIZATION_LIMITS.textCharacters) fail('INPUT_LIMIT', 'تجاوز النص الحد التقني', where); return value }
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value !== 'object') fail('SHAPE_INVALID', 'قيم JSON صريحة فقط مطلوبة', where)
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail('SHAPE_INVALID', 'النماذج الموروثة المخصصة غير مقبولة', where)
    const result: Record<string, unknown> | unknown[] = array ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('SHAPE_INVALID', 'خاصية غير مسموحة في المدخلات', where)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('SHAPE_INVALID', 'الخصائص المحسوبة أو غير الظاهرة غير مقبولة', `${where}.${key}`)
      ;(result as Record<string, unknown>)[key] = clone(descriptor.value, `${where}.${key}`, depth + 1)
    }
    if (array && Object.keys(result).length !== value.length) fail('SHAPE_INVALID', 'القوائم ذات الفراغات غير مقبولة', where)
    return result
  }
  try {
    let resolveLoan: PayrollNetLoanResolver | undefined
    if (options !== undefined) {
      if (!options || typeof options !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(options))) fail('OPTIONS_INVALID', 'خيارات الربط الداخلية غير صالحة', 'options')
      for (const key of Reflect.ownKeys(options)) {
        if (key !== 'resolveLoan') fail('OPTIONS_INVALID', 'خيار ربط داخلي غير معروف', 'options')
        const descriptor = Object.getOwnPropertyDescriptor(options, key)!
        if (!own(descriptor, 'value') || !descriptor.enumerable || typeof descriptor.value !== 'function') fail('OPTIONS_INVALID', 'محلل أقساط متزامن صريح مطلوب', 'options.resolveLoan')
        resolveLoan = descriptor.value
      }
    }
    const d = (value: string) => PayrollDecimal.from(value, spend), zero = d('0'), hundred = d('100')
    const decimal = (value: unknown, where: string, nonnegative = true, scale?: number): PayrollDecimal => {
      path = where
      if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value) || value.length > 80 || (scale !== undefined && (value.split('.')[1]?.length ?? 0) > scale)) fail('MONEY_INVALID', 'نص عشري بالدقة المسموحة مطلوب', where)
      // الأصفار التنسيقية لا تقلل مجال مبلغ صحيح سبق أن قبله المحرك.
      const normalized = value.replace(/^(-?)0+(?=\d)/, '$1').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
      const result = d(normalized)
      if (nonnegative && result.compare(zero) < 0) fail('MONEY_INVALID', 'المبلغ لا يقبل قيمة سالبة', where)
      return result
    }
    const exact = (value: unknown, where: string, nonnegative = true): PayrollDecimal => {
      if (typeof value === 'string') return decimal(value, where, nonnegative)
      const part = fields(value, ['numerator', 'denominator'], ['numerator', 'denominator'], where)
      if (typeof part.numerator !== 'string' || typeof part.denominator !== 'string' || !/^-?\d+$/.test(part.numerator) || !/^[1-9]\d*$/.test(part.denominator) || part.numerator.length > PAYROLL_NET_FINALIZATION_LIMITS.fractionCharacters || part.denominator.length > PAYROLL_NET_FINALIZATION_LIMITS.fractionCharacters) fail('FRACTION_INVALID', 'كسر صحيح ذو مقام موجب مطلوب', where)
      path = where
      const result = new PayrollDecimal(BigInt(part.numerator), BigInt(part.denominator), spend)
      if (nonnegative && result.compare(zero) < 0) fail('MONEY_INVALID', 'المبلغ لا يقبل قيمة سالبة', where)
      return result
    }
    const source = (value: unknown, where: string): string => {
      if (typeof value !== 'string' || !value.trim() || value.length > 200) fail('SOURCE_REQUIRED', 'مرجع مصدر غير فارغ بحد أقصى 200 محرف مطلوب', where)
      return value.trim()
    }
    const code = (value: unknown, where: string): string => { if (typeof value !== 'string' || !identifier.test(value)) fail('CODE_INVALID', 'رمز بند مغلق صالح مطلوب', where); return value }
    const array = (value: unknown, where: string, max: number = PAYROLL_NET_FINALIZATION_LIMITS.components): unknown[] => { if (!Array.isArray(value) || value.length > max) fail('LIST_INVALID', 'قائمة ضمن الحد التقني مطلوبة', where); return value }
    const settingsCopy = fields(clone(settings, 'settings'), PAYROLL_POLICY_SETTING_FIELDS, PAYROLL_POLICY_SETTING_FIELDS, 'settings')
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(settingsCopy) } catch { fail('SETTINGS_INVALID', 'إعدادات السياسة غير مكتملة أو غير صالحة', 'settings') }
    const inputKeys = ['earnedFixedGross', 'sourceRef', 'classifications', 'collectionOrder', 'collectionOrderSourceRef']
    const input = fields(clone(explicitInput, 'input'), inputKeys, inputKeys, 'input')
    const earnedFixedGross = exact(input.earnedFixedGross, 'input.earnedFixedGross'), basisSource = source(input.sourceRef, 'input.sourceRef')
    const orderSource = source(input.collectionOrderSourceRef, 'input.collectionOrderSourceRef')
    const executionKeys = ['engineVersion', 'source', 'preCapsOnly', 'sourceExecutionVersion', 'components', 'totalsPreCaps', 'approvedOtConsumedRefs', 'deferred', 'warnings']
    const snapshot = fields(clone(execution, 'execution'), executionKeys, executionKeys.filter(key => key !== 'sourceExecutionVersion'), 'execution')
    if (snapshot.engineVersion !== PAYROLL_COMPONENT_EXECUTION_VERSION || snapshot.source !== 'EXPLICIT_UNVERIFIED' || snapshot.preCapsOnly !== true || (own(snapshot, 'sourceExecutionVersion') && snapshot.sourceExecutionVersion !== PAYROLL_COMPONENT_SOURCES_VERSION)) fail('EXECUTION_INVALID', 'لقطة مبالغ البنود قبل السقوف مطلوبة', 'execution')
    array(snapshot.warnings, 'execution.warnings', 10000)
    const approvedOtRefs = array(snapshot.approvedOtConsumedRefs, 'execution.approvedOtConsumedRefs').map((value, index) => source(value, `execution.approvedOtConsumedRefs[${index}]`))
    if (new Set(approvedOtRefs).size !== approvedOtRefs.length) fail('EXECUTION_INVALID', 'مرجع إضافي معتمد مكرر', 'execution.approvedOtConsumedRefs')
    const deferred = snapshot.deferred
    if (!Array.isArray(deferred) || deferred.length !== 3 || ['NET', 'NET_CAPS', 'LEDGER_CARRY'].some((value, index) => deferred[index] !== value)) fail('EXECUTION_INVALID', 'عقد المراحل المؤجلة غير صالح', 'execution.deferred')
    let scale = 2, earnings = zero, requestedDeductions = zero
    const lines = new Map<string, { amount: PayrollDecimal; type: string; status: string; sourceRefs: string[]; steps: Record<string, unknown>[] }>()
    const lineKeys = ['code', 'componentType', 'sourceUnit', 'resultUnit', 'status', 'skippedReason', 'condition', 'sourceRefs', 'steps', 'amount', 'amountExact', 'warnings']
    let netFound = false
    for (const [index, raw] of array(snapshot.components, 'execution.components').entries()) {
      const where = `execution.components[${index}]`, row = fields(raw, lineKeys, lineKeys, where), componentCode = code(row.code, `${where}.code`)
      if (lines.has(componentCode)) fail('EXECUTION_INVALID', 'رمز بند مكرر', where)
      if (!['EARNING', 'DEDUCTION', 'INFO'].includes(row.componentType as string) || !['CALCULATED', 'SKIPPED', 'DEFERRED'].includes(row.status as string)) fail('EXECUTION_INVALID', 'نوع أو حالة بند غير صالحة', where)
      const refs = array(row.sourceRefs, `${where}.sourceRefs`, 10000).map((value, i) => source(value, `${where}.sourceRefs[${i}]`))
      const steps = array(row.steps, `${where}.steps`, 10000).map((step, i) => fields(step, ['stage', 'value', 'details'], ['stage', 'value', 'details'], `${where}.steps[${i}]`))
      array(row.warnings, `${where}.warnings`, 10000)
      const financial = row.componentType !== 'INFO'
      if (financial && row.resultUnit !== 'CURRENCY') fail('EXECUTION_INVALID', 'المبلغ المالي يجب أن يكون بالعملة', where)
      if (row.status === 'DEFERRED') {
        if (componentCode !== 'NET' || row.componentType !== 'INFO' || row.amount !== null || row.amountExact !== null || index !== (snapshot.components as unknown[]).length - 1) fail('EXECUTION_INVALID', 'NET وحده مؤجل وفي آخر البنود', where)
        netFound = true
        lines.set(componentCode, { amount: zero, type: 'INFO', status: 'DEFERRED', sourceRefs: refs, steps }); continue
      }
      if (componentCode === 'NET') fail('EXECUTION_INVALID', 'لا تقبل مرحلة الصافي قيمة NET محسوبة سلفًا', where)
      const amount = decimal(row.amount, `${where}.amount`, financial, 6), amountExact = exact(row.amountExact, `${where}.amountExact`, financial)
      if (amount.compare(amountExact) !== 0 || (row.status === 'SKIPPED' && !amount.isZero())) fail('EXECUTION_INVALID', 'مبلغ البند لا يطابق كسره أو حالته', where)
      if (financial) scale = Math.max(scale, (row.amount as string).split('.')[1]?.length ?? 0)
      if (row.componentType === 'EARNING') earnings = earnings.add(amount)
      if (row.componentType === 'DEDUCTION') requestedDeductions = requestedDeductions.add(amount)
      lines.set(componentCode, { amount, type: row.componentType as string, status: row.status as string, sourceRefs: refs, steps })
    }
    if (!netFound) fail('EXECUTION_INVALID', 'بند NET المؤجل مطلوب', 'execution.components')
    const totals = fields(snapshot.totalsPreCaps, ['earnings', 'deductions', 'balanceBeforeCaps'], ['earnings', 'deductions', 'balanceBeforeCaps'], 'execution.totalsPreCaps')
    for (const [key, expected] of [['earnings', earnings], ['deductions', requestedDeductions], ['balanceBeforeCaps', earnings.subtract(requestedDeductions)]] as const) {
      const where = `execution.totalsPreCaps.${key}`, total = fields(totals[key], ['amount', 'amountExact'], ['amount', 'amountExact'], where)
      if (decimal(total.amount, `${where}.amount`, false, 6).compare(expected) !== 0 || exact(total.amountExact, `${where}.amountExact`, false).compare(expected) !== 0) fail('EXECUTION_TOTAL_MISMATCH', 'مجموع اللقطة لا يطابق مبالغ البنود', where)
    }
    const classifications: PayrollNetClassification[] = [], classified = new Map<string, PayrollNetClassification>()
    for (const [index, raw] of array(input.classifications, 'input.classifications').entries()) {
      const where = `input.classifications[${index}]`, row = fields(raw, ['componentCode', 'kind', 'sourceRef', 'carryOverEligible'], ['componentCode', 'kind', 'sourceRef', 'carryOverEligible'], where)
      const componentCode = code(row.componentCode, `${where}.componentCode`), kind = row.kind as PayrollNetSourceClass
      if (lines.get(componentCode)?.type !== 'DEDUCTION' || classified.has(componentCode)) fail('CLASSIFICATION_INVALID', 'كل تصنيف يخص بند خصم معروفًا مرة واحدة', where)
      if (!PAYROLL_NET_SOURCE_CLASSES.includes(kind) || typeof row.carryOverEligible !== 'boolean') fail('CLASSIFICATION_INVALID', 'تصنيف مغلق وحالة ترحيل صريحة مطلوبان', where)
      if ((protectedClasses.has(kind) || kind === 'ATTENDANCE') && row.carryOverEligible) fail('CLASSIFICATION_INVALID', 'هذا التصنيف لا يسمح بترحيل الزيادة', where)
      if (kind === 'LOAN' && !row.carryOverEligible) fail('CLASSIFICATION_INVALID', 'أصل الدين لا يسقط عند نقص المتاح', where)
      if (protectedClasses.has(kind) && lines.get(componentCode)!.steps.some(step => step.stage === 'FULL_EXEMPTION')) fail('PROTECTED_EXEMPTION', 'الاستقطاع المحمي أو عدم الاستحقاق لا يقبل إعفاء خصم', where)
      const classification = { componentCode, kind, sourceRef: source(row.sourceRef, `${where}.sourceRef`), carryOverEligible: row.carryOverEligible }
      classified.set(componentCode, classification); classifications.push(classification)
    }
    const deductions = [...lines].filter(([, line]) => line.type === 'DEDUCTION')
    if (classifications.length !== deductions.length) fail('CLASSIFICATION_INCOMPLETE', 'تصنيف صريح لكل بند خصم مطلوب، حتى الصفر أو المتجاوز', 'input.classifications')
    const collectionOrder = array(input.collectionOrder, 'input.collectionOrder').map((value, index) => code(value, `input.collectionOrder[${index}]`))
    const reducibles = classifications.filter(row => !protectedClasses.has(row.kind))
    if (new Set(collectionOrder).size !== collectionOrder.length || collectionOrder.length !== reducibles.length || collectionOrder.some(value => !classified.has(value) || protectedClasses.has(classified.get(value)!.kind))) fail('ORDER_INVALID', 'الترتيب الصريح يجب أن يشمل كل خصم قابل للتخفيض مرة واحدة', 'input.collectionOrder')
    const money = (value: PayrollDecimal): PayrollNetMoney => ({ amount: value.format(scale, 'HALF_UP'), amountExact: fraction(value) })
    const displayExact = (value: PayrollDecimal) => ({ rawValue6: value.format(6, 'HALF_UP'), exact: fraction(value) })
    const max = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) >= 0 ? a : b
    const min = (a: PayrollDecimal, b: PayrollDecimal) => a.compare(b) <= 0 ? a : b
    const warnings: PayrollNetFinalizationWarning[] = []
    const warn = (warningCode: string, message: string, componentCode: string | null = null) => warnings.push({ code: warningCode, message, path: componentCode ? `allocations.${componentCode}` : 'limits', componentCode })
    const floor = max(policy.minNetGuarantee === null ? zero : d(String(policy.minNetGuarantee)), policy.netFloorPct === null ? zero : earnedFixedGross.multiply(d(String(policy.netFloorPct))).divide(hundred))
    const cap = policy.maxDeductionPctOfGross === null ? null : earnedFixedGross.multiply(d(String(policy.maxDeductionPctOfGross))).divide(hundred)
    let unpaid = zero, statutory = zero
    for (const classification of classifications) {
      const amount = lines.get(classification.componentCode)!.amount
      if (classification.kind === 'UNPAID_NON_ENTITLEMENT') unpaid = unpaid.add(amount)
      else if (protectedClasses.has(classification.kind)) statutory = statutory.add(amount)
    }
    const protectedCollected = unpaid.add(statutory), protectedBalance = earnings.subtract(protectedCollected), blocked = protectedBalance.compare(zero) < 0
    const cashCapacity = max(zero, protectedBalance.subtract(floor)), capCapacity = cap === null ? null : max(zero, cap.subtract(statutory))
    const availableExact = capCapacity === null ? cashCapacity : min(cashCapacity, capCapacity), initialAvailable = availableExact.round(scale, 'FLOOR')
    let budget = initialAvailable, collectedTotal = protectedCollected, carriedTotal = zero, droppedTotal = zero, unallocatedTotal = zero
    if (blocked) warn('PROTECTED_EXCEEDS_EARNINGS', 'الاستقطاعات المحمية تتجاوز الإيرادات؛ الصافي السالب معروض بدقة والاعتماد محظور')
    if (protectedBalance.compare(floor) < 0) warn('FLOOR_UNATTAINABLE', 'الرصيد بعد الاستقطاعات المحمية أقل من الأرضية؛ لا ينشئ النظام إيرادًا تعويضيًا')
    if (cap !== null && statutory.compare(cap) > 0) warn('PROTECTED_EXCEEDS_CAP', 'الاستقطاع القانوني المحمي يتجاوز السقف؛ لا يُخفض ويمتنع التحصيل الاختياري')
    const allocations: PayrollNetAllocation[] = []
    const addAllocation = (classification: PayrollNetClassification, collected: PayrollDecimal, carried: PayrollDecimal, dropped: PayrollDecimal, unallocated: PayrollDecimal, outcome: PayrollNetAllocation['outcome'], before: PayrollDecimal | null, after: PayrollDecimal | null, loanDetails: unknown = null) => {
      const line = lines.get(classification.componentCode)!
      if (collected.add(carried).add(dropped).add(unallocated).compare(line.amount) !== 0) fail('CONSERVATION_FAILED', 'تعذر حفظ كامل مبلغ الخصم بين التحصيل والترحيل والإسقاط والتعليق', classification.componentCode)
      allocations.push({ componentCode: classification.componentCode, classification: classification.kind, sourceRefs: [...new Set([...line.sourceRefs, classification.sourceRef])].sort(), requestedAmount: money(line.amount).amount,
        collectedAmount: money(collected).amount, carriedAmount: money(carried).amount, droppedAmount: money(dropped).amount, unallocatedAmount: money(unallocated).amount, outcome,
        budgetBefore: before === null ? null : money(before).amount, budgetAfter: after === null ? null : money(after).amount, loanDetails })
    }
    for (const classification of classifications.filter(row => protectedClasses.has(row.kind))) addAllocation(classification, lines.get(classification.componentCode)!.amount, zero, zero, zero, 'PROTECTED', null, null)
    for (const componentCode of collectionOrder) {
      path = `allocations.${componentCode}`; spend()
      const classification = classified.get(componentCode)!, line = lines.get(componentCode)!, due = line.amount, before = budget
      if (blocked) { unallocatedTotal = unallocatedTotal.add(due); addAllocation(classification, zero, zero, zero, due, 'BLOCKED', before, budget); continue }
      let collected = zero, carried = zero, dropped = zero, loanDetails: unknown = null
      if (classification.kind === 'LOAN') {
        if (due.round(2, 'FLOOR').compare(due) !== 0) fail('LOAN_PRECISION_INVALID', 'استحقاق الأقساط يجب أن يكون دقيقًا على منزلتي العملة', path)
        if (!resolveLoan && !due.isZero()) fail('LOAN_RESOLVER_REQUIRED', 'تحصيل دين فعلي يحتاج محلل أقساط داخليًا؛ لا يجوز إسقاط الدين', path)
        if (resolveLoan) {
          let resolution: unknown
          try { resolution = resolveLoan(freeze({ componentCode, dueAmount: due.format(2, 'HALF_UP'), availableBudget: money(budget).amount, sourceRefs: [...new Set([...line.sourceRefs, classification.sourceRef])].sort() })) }
          catch { fail('LOAN_RESOLUTION_FAILED', 'تعذر حل تخصيص الأقساط من اللقطة الداخلية', path) }
          const answer = fields(clone(resolution, `${path}.loanResolution`), ['collectedAmount', 'carriedAmount', 'details'], ['collectedAmount', 'carriedAmount', 'details'], `${path}.loanResolution`)
          collected = decimal(answer.collectedAmount, `${path}.collectedAmount`, true, 2); carried = decimal(answer.carriedAmount, `${path}.carriedAmount`, true, 2)
          if (collected.add(carried).compare(due) !== 0 || collected.compare(budget) > 0) fail('LOAN_CONSERVATION_FAILED', 'تخصيص الأقساط يتجاوز المتاح أو لا يحفظ أصل الاستحقاق', path)
          loanDetails = answer.details
        }
      } else {
        collected = min(due, budget)
        const excess = due.subtract(collected)
        if (policy.carryOverExcess && classification.carryOverEligible) carried = excess
        else dropped = excess
      }
      budget = budget.subtract(collected); collectedTotal = collectedTotal.add(collected); carriedTotal = carriedTotal.add(carried); droppedTotal = droppedTotal.add(dropped)
      if (!carried.isZero()) warn('DEDUCTION_CARRIED', 'الجزء غير المحصل يُقترح ترحيله دون إنشاء قيد دفتر في هذه المرحلة', componentCode)
      if (!dropped.isZero()) warn('DEDUCTION_DROPPED', classification.kind === 'ATTENDANCE' ? 'زيادة خصم الحضور تسقط ولا تُرحل إلى شهر تالٍ' : 'الزيادة لا تستوفي سياسة الترحيل وتسقط', componentCode)
      const outcome = due.isZero() ? 'SKIPPED' : collected.compare(due) === 0 ? 'COLLECTED' : 'REDUCED'
      addAllocation(classification, collected, carried, dropped, zero, outcome, before, budget, loanDetails)
    }
    if (collectedTotal.add(carriedTotal).add(droppedTotal).add(unallocatedTotal).compare(requestedDeductions) !== 0) fail('CONSERVATION_FAILED', 'مجموع الخصومات غير محفوظ', 'totals')
    const netPay = earnings.subtract(collectedTotal)
    const normalizedInput: PayrollNetFinalizationInput = { earnedFixedGross: fraction(earnedFixedGross), sourceRef: basisSource, classifications, collectionOrder, collectionOrderSourceRef: orderSource }
    return freeze({ engineVersion: PAYROLL_NET_FINALIZATION_VERSION, sourceValidation: 'CALLER_UNVERIFIED' as const, approvalEligible: !blocked, blocked, scale, normalizedInput,
      netPay: money(netPay), totals: { earnings: money(earnings), requestedDeductions: money(requestedDeductions), collectedDeductions: money(collectedTotal), carriedDeductions: money(carriedTotal), droppedDeductions: money(droppedTotal), unallocatedDeductions: money(unallocatedTotal), balanceBeforeCaps: money(earnings.subtract(requestedDeductions)) },
      limits: { earnedFixedGross: displayExact(earnedFixedGross), floor: displayExact(floor), cap: cap === null ? null : displayExact(cap), protectedCollected: money(protectedCollected), unpaidExcludedFromCap: money(unpaid), statutoryCapConsumed: money(statutory), cashCapacity: displayExact(cashCapacity), capCapacity: capCapacity === null ? null : displayExact(capCapacity), initialAvailable: money(initialAvailable), unusedFraction: displayExact(availableExact.subtract(initialAvailable)), remainingAvailable: money(budget) },
      allocations, sourceRefs: [...new Set([basisSource, orderSource, ...classifications.map(row => row.sourceRef), ...[...lines.values()].flatMap(line => line.sourceRefs), ...approvedOtRefs])].sort(), approvedOtConsumedRefs: approvedOtRefs, warnings,
      settingsUsed: { maxDeductionPctOfGross: policy.maxDeductionPctOfGross, minNetGuarantee: policy.minNetGuarantee, netFloorPct: policy.netFloorPct, carryOverExcess: policy.carryOverExcess, currency: policy.currency },
      trace: { collectionOrderSourceRef: orderSource, capBasis: 'CALLER_SUPPLIED_EARNED_FIXED_GROSS' as const, floorBasis: 'CALLER_SUPPLIED_EARNED_FIXED_GROSS' as const, budgetRounding: { mode: 'FLOOR' as const, scale }, loanResolution: 'INTERNAL_SYNCHRONOUS_UNPOSTED' as const, claimsCreated: false as const } })
  } catch (error) {
    if (error instanceof PayrollDecimalError) throw new PayrollNetFinalizationError(`NET_${error.code}`, error.message, path)
    throw error
  }
}
