import { executePayrollComponentsWithSources, PayrollComponentExecutionError } from './payroll-component-execution'
import { allocatePreparedPayrollLedgerComponent, preparePayrollLedgerSources } from './payroll-component-ledger-source'
import { finalizePayrollNet } from './payroll-net-finalization'
import { PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'
import { validatePayrollPolicyDefinition } from './payroll-policy-definition'
import { PayrollDecimal } from './payroll-decimal'

export const PAYROLL_POLICY_EXECUTION_VERSION = 'SRS_POLICY_EXECUTION_V1_20260913' as const
export const PAYROLL_POLICY_EXECUTION_LIMITS = Object.freeze({ nodes: 60000, nesting: 24 })
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
function fail(code: string, message: string, path: string): never { throw new PayrollComponentExecutionError(code, message, path) }
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }

/** تجميع المراحل على مدخلات صريحة؛ لا حفظ مسير أو حجز موظف أو كتابة دفتر. */
export function executePayrollPolicy(definition: unknown, settings: PayrollPolicySettings, explicitInput: unknown) {
  let nodes = 0
  const clone = (value: unknown, path: string, depth = 0): any => {
    if (++nodes > PAYROLL_POLICY_EXECUTION_LIMITS.nodes || depth > PAYROLL_POLICY_EXECUTION_LIMITS.nesting) fail('POLICY_EXECUTION_INPUT_LIMIT', 'لقطة تنفيذ السياسة تتجاوز الحجم أو التعشيش المسموح', path)
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value !== 'object') fail('POLICY_EXECUTION_INPUT_SHAPE', 'قيم JSON صريحة فقط', path)
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail('POLICY_EXECUTION_INPUT_SHAPE', 'اللقطة لا تقبل نموذجًا موروثًا مخصصًا', path)
    const result: any = array ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('POLICY_EXECUTION_INPUT_SHAPE', 'خاصية غير مسموحة في اللقطة', path)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('POLICY_EXECUTION_INPUT_SHAPE', 'اللقطة لا تقبل خصائص محسوبة أو مخفية', `${path}.${key}`)
      result[key] = clone(descriptor.value, `${path}.${key}`, depth + 1)
    }
    if (array && Object.keys(result).length !== value.length) fail('POLICY_EXECUTION_INPUT_SHAPE', 'القائمة لا تقبل فراغات', path)
    return result
  }
  const input = clone(explicitInput, 'input'), copiedDefinition = clone(definition, 'definition'), copiedSettings = clone(settings, 'settings')
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['components', 'sources', 'net'].includes(key)) || ['components', 'sources', 'net'].some(key => !own(input, key))) fail('POLICY_EXECUTION_INPUT_SHAPE', 'مدخل التنفيذ يتطلب components وsources وnet فقط', 'input')
  // يقوم المنفذ بالتحقق من كل تعريف وإعداد ومدخل قبل استعمالها؛ لا تُستبدل إعدادات العميل بعد الحساب.
  const execution = executePayrollComponentsWithSources(copiedDefinition, copiedSettings, input.components, input.sources)
  const policy = validatePayrollPolicySettings(copiedSettings)
  const normalized = validatePayrollPolicyDefinition(copiedDefinition, policy, { autoOrder: false, typedDeductionCodes: [] }).definition
  const byCode = new Map(normalized.components.map(component => [component.code, component]))
  const tierPeriods = new Set<string>(), tierRevisions = new Set<number>()
  let ledgerUsed = false
  for (const line of execution.components) {
    const provenance = line.steps.find(step => step.stage === 'SOURCE_PROVENANCE')?.details
    if (line.componentType !== 'INFO' && line.amountExact?.numerator !== '0' && Array.isArray(provenance?.debtVariableOrigins) && provenance.debtVariableOrigins.length) fail('POLICY_LEDGER_SOURCE_REQUIRED', 'تحصيل دين مجمل يحتاج صفوف الدفتر لحفظ أصل المتبقي؛ المتغير المجمل وحده لا يكفي للصافي', `components.${line.code}`)
    const tier = line.steps.find(step => step.stage === 'TIER_SOURCE')?.details.normalizedInput as { periodStart: string; periodEnd: string; expectedRevision: number } | undefined
    if (tier) { tierPeriods.add(`${tier.periodStart}/${tier.periodEnd}`); tierRevisions.add(tier.expectedRevision) }
    if (line.steps.some(step => step.stage === 'LEDGER_SOURCE')) ledgerUsed = true
  }
  if (tierPeriods.size > 1 || tierRevisions.size > 1 || (ledgerUsed && [...tierPeriods].some(period => period.split('/')[1].slice(0, 7) !== input.sources.ledger.period))) fail('POLICY_SOURCE_PERIOD_CONFLICT', 'مصادر الشرائح والدفتر المنفذة يجب أن تخص فترة واحدة ومراجعة تعريف واحدة؛ شهر الدفتر يتبع نهاية الفترة', 'input.sources')
  if (!input.net || typeof input.net !== 'object' || Array.isArray(input.net) || !Array.isArray(input.net.classifications)) fail('POLICY_NET_CLASSIFICATIONS_REQUIRED', 'تصنيف الخصومات وترتيب التحصيل الصريح مطلوبان', 'input.net')
  for (const entry of input.net.classifications) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('POLICY_NET_CLASSIFICATION_INVALID', 'تصنيف بند خصم صريح مطلوب', 'input.net.classifications')
    const component = byCode.get(entry.componentCode)
    if (!component || component.componentType !== 'DEDUCTION') fail('POLICY_NET_CLASSIFICATION_INVALID', 'تصنيف الصافي يجب أن يشير إلى بند خصم موجود', 'input.net.classifications')
    if (entry.carryOverEligible !== component.carryOverEligible) fail('POLICY_NET_CARRY_CONFLICT', 'قابلية الترحيل تخالف تعريف البند المحسوب', `components.${component.code}`)
    const loan = component.valueSource === 'LEDGER' && component.ledgerDirection === 'DEBIT'
    if (loan !== (entry.kind === 'LOAN')) fail('POLICY_NET_LOAN_CLASSIFICATION', 'قسط الدفتر يصنف LOAN وحده لحفظ كامل أصل الدين', `components.${component.code}`)
    const line = execution.components.find(item => item.code === component.code)!
    if (['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'].includes(entry.kind) && line.steps.some(step => step.stage === 'FULL_EXEMPTION')) fail('POLICY_NET_PROTECTED_EXEMPTION', 'الإعفاء المالي العام لا يغير خصمًا محميًا أو عدم استحقاق', `components.${component.code}`)
  }
  const prepared = input.sources.ledger === null ? null : preparePayrollLedgerSources(normalized, policy, input.sources.ledger)
  const finalization = finalizePayrollNet(execution, policy, input.net, {
    resolveLoan: ({ componentCode, availableBudget }) => {
      const line = execution.components.find(item => item.code === componentCode)!
      if (line.status === 'SKIPPED') {
        return { collectedAmount: '0.00', carriedAmount: '0.00', details: {
          outcome: 'COMPONENT_SKIPPED_SOURCE_UNTOUCHED', reason: line.skippedReason,
          sourceRefs: prepared?.installments.filter(item => item.componentCode === componentCode).map(item => item.sourceRef) ?? [],
        } }
      }
      if (!prepared) fail('POLICY_NET_LEDGER_REQUIRED', 'مصادر الأقساط مطلوبة لمرحلة التحصيل', `components.${componentCode}`)
      const allocation = allocatePreparedPayrollLedgerComponent(prepared, componentCode, availableBudget)
      return { collectedAmount: allocation.totals.deductedAmount, carriedAmount: allocation.totals.remainingAmount, details: allocation }
    },
  })
  const allocationByCode = new Map(finalization.allocations.map(row => [row.componentCode, row]))
  const components = execution.components.map(line => {
    const allocation = allocationByCode.get(line.code)
    return {
      ...line,
      // calculatedAmount يظل نتيجة COMP الأصلية؛ مبلغ التحصيل لا يعيد تقييم أي معادلة سابقة.
      calculatedAmount: line.amount,
      payableAmount: line.code === 'NET' ? finalization.netPay.amount : allocation ? allocation.collectedAmount : line.amount,
      finalization: allocation ?? null,
      ...(line.code === 'NET' ? { status: finalization.blocked ? 'BLOCKED' : 'CALCULATED', skippedReason: null,
        amount: finalization.netPay.amount, amountExact: finalization.netPay.amountExact,
        sourceRefs: finalization.sourceRefs,
        steps: [{ stage: 'NET_FINALIZATION', value: { rawValue6: new PayrollDecimal(BigInt(finalization.netPay.amountExact.numerator), BigInt(finalization.netPay.amountExact.denominator)).format(6, 'HALF_UP'), exact: finalization.netPay.amountExact },
          details: { collectionOrder: finalization.normalizedInput.collectionOrder, collectionOrderSourceRef: finalization.normalizedInput.collectionOrderSourceRef, blocked: finalization.blocked } }],
      } : {}),
    }
  })
  return freeze({ engineVersion: PAYROLL_POLICY_EXECUTION_VERSION, sourceValidation: 'CALLER_UNVERIFIED' as const, preCapsOnly: false as const,
    approvalEligible: finalization.approvalEligible, execution, finalization, components,
    snapshot: { definition: normalized, settings: policy, input },
    deferred: ['TRUSTED_SOURCE_LOADING', 'POLICY_ASSIGNMENT', 'PAYROLL_PERSISTENCE', 'CARRY_POSTING', 'THREE_PERIOD_PARITY', 'SHADOW_RUN'],
  })
}
