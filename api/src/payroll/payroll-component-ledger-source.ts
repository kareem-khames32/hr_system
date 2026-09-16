import { PayrollDecimal } from './payroll-decimal'
import { PayrollPolicyDefinition, PayrollPolicyDefinitionError, validatePayrollPolicyDefinition } from './payroll-policy-definition'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'
import { allocatePayrollInstallments, PayrollInstallmentAllocationError, PayrollInstallmentAllocationItem, PayrollInstallmentAllocationResult, PayrollInstallmentManualDeferral } from './payroll-installment-allocation'

export const PAYROLL_COMPONENT_LEDGER_SOURCE_VERSION = 'SRS_COMPONENT_LEDGER_SOURCE_V1_20260913' as const
export const PAYROLL_COMPONENT_LEDGER_SOURCE_LIMITS = Object.freeze({ rows: 1000, manualDeferrals: 1000, nodes: 50000, nesting: 20 })
type Component = PayrollPolicyDefinition['components'][number]
type DeepReadonly<T> = T extends (infer V)[] ? ReadonlyArray<DeepReadonly<V>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export interface PayrollLedgerInstallmentSource extends Omit<PayrollInstallmentAllocationItem, 'insufficientMode' | 'extensionPeriod'> {
  componentCode: string; category: string; extensionPeriod: string | null
}
export interface PayrollLedgerObligationSource {
  componentCode: string; entryRef: string; category: string; direction: 'CREDIT'; sourceRef: string; sourceRevision: number
  duePeriod: string; remainingAmount: string; priority: number; sequence: number
}
export interface PayrollLedgerExplicitSources {
  period: string; nextPeriod: string; installments: PayrollLedgerInstallmentSource[]
  obligations: PayrollLedgerObligationSource[]; manualDeferrals: PayrollInstallmentManualDeferral[]
}
export type PreparedPayrollLedgerSources = DeepReadonly<{
  version: typeof PAYROLL_COMPONENT_LEDGER_SOURCE_VERSION; sourceValidation: 'CALLER_UNVERIFIED'
  period: string; nextPeriod: string; settings: PayrollPolicySettings; components: Component[]
  installments: Array<PayrollLedgerInstallmentSource & { insufficientMode: 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND' }>
  obligations: PayrollLedgerObligationSource[]; manualDeferrals: PayrollInstallmentManualDeferral[]
}>
export interface PayrollLedgerSourceTraceRow {
  kind: 'INSTALLMENT' | 'OBLIGATION'; identity: string; sourceRef: string; sourceRevision: number
  duePeriod: string; remainingAmount: string; eligible: boolean; priority: number; sequence: number
  manualDeferral: DeepReadonly<PayrollInstallmentManualDeferral> | null
}
export interface PayrollLedgerSourceResolution {
  componentCode: string; direction: 'DEBIT' | 'CREDIT'; value: { numerator: string; denominator: string }; amount: string
  sourceRefs: string[]; rows: PayrollLedgerSourceTraceRow[]
  trace: { sourceValidation: 'CALLER_UNVERIFIED'; period: string; nextPeriod: string; sourceKind: 'INSTALLMENT' | 'OBLIGATION'; insufficientMode: 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND' | null }
  warnings: Array<{ code: string; message: string; path: string }>
}
export class PayrollComponentLedgerSourceError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollComponentLedgerSourceError' }
}
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
const ordinal = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
const modes = Object.freeze({ ALLOW_PARTIAL: 'PARTIAL_THEN_CARRY', BLOCK: 'SKIP_AND_EXTEND' } as const)
function fail(code: string, message: string, path: string): never { throw new PayrollComponentLedgerSourceError(`COMPONENT_LEDGER_${code}`, message, path) }
function freeze<T>(value: T): T { if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }
function fields(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('INPUT_SHAPE', 'كائن JSON صريح مطلوب', path)
  const object = value as Record<string, unknown>
  for (const key of Object.keys(object)) if (!keys.includes(key)) fail('INPUT_UNKNOWN', `حقل غير مسموح: ${key}`, `${path}.${key}`)
  for (const key of keys) if (!own(object, key)) fail('INPUT_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return object
}
function text(value: unknown, max: number, path: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('INPUT_VALUE', `نص غير فارغ بحد${max}محرف مطلوب`, path)
  return value.trim()
}
function integer(value: unknown, min: number, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail('INPUT_VALUE', 'عدد صحيح آمن ضمن المجال مطلوب', path)
  return value
}
function period(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) fail('PERIOD_INVALID', 'الفترة بصيغة YYYY-MM ضمن السنوات1حتى9999', path)
  return value
}
function following(value: string): string {
  if (value === '9999-12') fail('PERIOD_INVALID', 'الشهر التالي يتجاوز مجال السنوات', 'nextPeriod')
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5))
  return month === 12 ? `${String(year + 1).padStart(4, '0')}-01` : `${value.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`
}
function money(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length > 80 || value.replace(/[^0-9]/g, '').length > 60 || !/^\d+(?:\.\d{1,2})?$/.test(value) || value.split('.')[0].replace(/^0+/, '').length > 16) {
    fail('AMOUNT_INVALID', 'المبلغ نص عشري غير سالب ضمنDECIMAL(18,2) دون تقريب ضمني', path)
  }
  return PayrollDecimal.from(value).format(2, 'DOWN')
}
function category(value: unknown, path: string): string {
  const code = text(value, 40, path)
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(code)) fail('CATEGORY_INVALID', 'تصنيف المصدر كود صريح؛ النجمة تخص البند وحده', path)
  return code
}
function componentFor(components: readonly Component[], code: string, path: string): Component {
  const component = components.find(row => row.code === code)
  if (!component || component.valueSource !== 'LEDGER') fail('COMPONENT_UNAVAILABLE', 'المصدر يتطلب كود بند دفتر موجودًا في التعريف', path)
  return component
}
function guardComponent(component: Component, settings: PayrollPolicySettings) {
  const path = `components.${component.code}`
  if (component.unit !== 'CURRENCY' || component.prorationMode !== 'NONE' || component.minAmount !== null || component.maxAmount !== null ||
      component.capPctOfBase !== null || component.capBaseCode !== null || (component.roundingScale ?? settings.roundingScale) < 2) {
    fail('PRINCIPAL_PROTECTED', 'رصيد الدفتر يُقرأ كما هو بلا تناسب أو حدود أو تقريب يغير السنتات', path)
  }
  if (component.ledgerDirection === 'DEBIT') {
    if (component.componentType !== 'DEDUCTION' || component.stage !== 5 || !component.carryOverEligible) fail('COMPONENT_UNSUPPORTED', 'أقساط الخصم تتطلب بنددفترDEBITبالمرحلة5قابلًا لترحيل كامل المتبقي', path)
  } else if (component.ledgerDirection === 'CREDIT') {
    if (component.componentType !== 'EARNING' || ![1, 2].includes(component.stage)) fail('COMPONENT_UNSUPPORTED', 'مستحق الدفترCREDITيتطلب بندإضافة فيمرحلةالاستحقاقات', path)
  } else fail('COMPONENT_UNSUPPORTED', 'اتجاه دفتر غير مدعوم', path)
}
function matchCategory(component: Component, value: string, path: string) {
  if (component.ledgerCategory !== '*' && component.ledgerCategory !== value) fail('CATEGORY_MISMATCH', 'تصنيف المصدر لا يطابق تصنيف البند', path)
}

/** تجهيز صريح فقط؛ لا جمع سعة أو تخصيص تحصيل أو قراءة مالية حية أو إثبات مصدر SQL. */
export function preparePayrollLedgerSources(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: unknown): PreparedPayrollLedgerSources {
  let nodes = 0
  const clone = (value: unknown, path: string, depth = 0): unknown => {
    if (++nodes > PAYROLL_COMPONENT_LEDGER_SOURCE_LIMITS.nodes || depth > PAYROLL_COMPONENT_LEDGER_SOURCE_LIMITS.nesting) fail('INPUT_LIMIT', 'تجاوز حجم أو تعشيش المدخل حد الحماية', path)
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value !== 'object') fail('INPUT_SHAPE', 'قيم JSON صريحة فقط', path)
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail('INPUT_SHAPE', 'النماذج الموروثة المخصصة غير مقبولة', path)
    const result: unknown[] | Record<string, unknown> = array ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || key.length > 100 || ['constructor', 'prototype', '__proto__'].includes(key) ||
          (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('INPUT_SHAPE', 'خاصية غير مسموحة في المدخل', path)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!own(descriptor, 'value') || !descriptor.enumerable) fail('INPUT_SHAPE', 'الخصائص المحسوبة أو غير الظاهرة فيJSON غير مقبولة', `${path}.${key}`)
      ;(result as Record<string, unknown>)[key] = clone(descriptor.value, `${path}.${key}`, depth + 1)
    }
    if (array && Object.keys(result).length !== value.length) fail('INPUT_SHAPE', 'قائمة متصلة بلا فراغات مطلوبة', path)
    return result
  }
  try {
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(fields(clone(settings, 'settings'), PAYROLL_POLICY_SETTING_FIELDS, 'settings')) }
    catch (error) { if (error instanceof PayrollComponentLedgerSourceError) throw error; fail('SETTINGS_INVALID', 'إعدادات نسخة السياسة غير مكتملة أو غير صالحة', 'settings') }
    if (policy.defaultPeriodType === 'SEMI_MONTHLY') fail('PERIOD_UNSUPPORTED', 'مصادر الأقساط الشهرية لا تدعم نصف الشهر في هذه المرحلة', 'settings.defaultPeriodType')
    const checked = validatePayrollPolicyDefinition(clone(definition, 'definition'), policy, { typedDeductionCodes: [], autoOrder: false })
    const components = checked.definition.components.filter(row => row.valueSource === 'LEDGER')
    const raw = fields(clone(input, 'ledger'), ['period', 'nextPeriod', 'installments', 'obligations', 'manualDeferrals'], 'ledger')
    const current = period(raw.period, 'ledger.period'), next = period(raw.nextPeriod, 'ledger.nextPeriod')
    if (next !== following(current)) fail('PERIOD_INVALID', 'nextPeriod يجب أن يكون الشهر التالي مباشرة', 'ledger.nextPeriod')
    for (const key of ['installments', 'obligations', 'manualDeferrals']) if (!Array.isArray(raw[key]) || raw[key].length > 1000) fail('INPUT_LIMIT', 'القائمة مطلوبة بحد1000عنصر', `ledger.${key}`)
    if ((raw.installments as unknown[]).length + (raw.obligations as unknown[]).length > PAYROLL_COMPONENT_LEDGER_SOURCE_LIMITS.rows) fail('INPUT_LIMIT', 'مجموع مصادر الدفتر يتجاوز1000', 'ledger')
    const installments: Array<PayrollLedgerInstallmentSource & { insufficientMode: 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND' }> = []
    const obligations: PayrollLedgerObligationSource[] = [], identities = new Set<string>(), loanComponents = new Map<string, string>(), lastDueByLoan = new Map<string, string>()
    const unique = (kind: string, ref: string, path: string) => { const key = `${kind}:${ref}`; if (identities.has(key)) fail('SOURCE_DUPLICATE', 'المصدر نفسه لا يُسند مرتين داخل الدفتر', path); identities.add(key) }
    const installmentKeys = ['componentCode', 'category', 'installmentRef', 'loanRef', 'sourceRef', 'sourceRevision', 'sequence', 'originalDuePeriod', 'duePeriod', 'remainingAmount', 'priority', 'extensionPeriod']
    for (const [index, value] of (raw.installments as unknown[]).entries()) {
      const path = `ledger.installments.${index}`, row = fields(value, installmentKeys, path)
      const componentCode = text(row.componentCode, 40, `${path}.componentCode`), component = componentFor(components, componentCode, `${path}.componentCode`)
      guardComponent(component, policy)
      if (component.ledgerDirection !== 'DEBIT') fail('DIRECTION_MISMATCH', 'القسط مصدر خصمDEBITفقط', path)
      const categoryCode = category(row.category, `${path}.category`); matchCategory(component, categoryCode, `${path}.category`)
      const installmentRef = text(row.installmentRef, 100, `${path}.installmentRef`), loanRef = text(row.loanRef, 100, `${path}.loanRef`)
      unique('INSTALLMENT', installmentRef, `${path}.installmentRef`)
      if (loanComponents.has(loanRef) && loanComponents.get(loanRef) !== componentCode) fail('LOAN_COMPONENT_CONFLICT', 'كل أقساط السلفة الواحدة تتبع بندًا واحدًا داخل اللقطة', path)
      loanComponents.set(loanRef, componentCode)
      const originalDuePeriod = period(row.originalDuePeriod, `${path}.originalDuePeriod`), duePeriod = period(row.duePeriod, `${path}.duePeriod`)
      if (duePeriod < originalDuePeriod) fail('DUE_ORDER', 'الاستحقاق لا يسبق الاستحقاق الأصلي', path)
      const insufficientMode = modes[component.ledgerPartialPayment!]
      if (!insufficientMode) fail('COMPONENT_UNSUPPORTED', 'خيار السداد الجزئي غير مدعوم', path)
      const extensionPeriod = row.extensionPeriod === null ? null : period(row.extensionPeriod, `${path}.extensionPeriod`)
      if ((insufficientMode === 'SKIP_AND_EXTEND') !== (extensionPeriod !== null)) fail('EXTENSION_INVALID', 'التمديد مطلوب للتخطي فقط؛ الخصم الجزئي يتطلبnull', `${path}.extensionPeriod`)
      installments.push({ componentCode, category: categoryCode, installmentRef, loanRef, sourceRef: text(row.sourceRef, 200, `${path}.sourceRef`),
        sourceRevision: integer(row.sourceRevision, 1, `${path}.sourceRevision`), sequence: integer(row.sequence, 1, `${path}.sequence`), priority: integer(row.priority, 0, `${path}.priority`),
        originalDuePeriod, duePeriod, remainingAmount: money(row.remainingAmount, `${path}.remainingAmount`), extensionPeriod, insufficientMode })
      if (!lastDueByLoan.has(loanRef) || lastDueByLoan.get(loanRef)! < duePeriod) lastDueByLoan.set(loanRef, duePeriod)
    }
    for (const row of installments) if (row.extensionPeriod !== null && (row.extensionPeriod <= current || row.extensionPeriod <= lastDueByLoan.get(row.loanRef)!)) fail('EXTENSION_INVALID', 'التمديد يجب أن يلي كل الاستحقاقات المقدمة للسلفة والفترة الحالية', `ledger.installments.${row.installmentRef}.extensionPeriod`)
    const obligationKeys = ['componentCode', 'entryRef', 'category', 'direction', 'sourceRef', 'sourceRevision', 'duePeriod', 'remainingAmount', 'priority', 'sequence']
    for (const [index, value] of (raw.obligations as unknown[]).entries()) {
      const path = `ledger.obligations.${index}`, row = fields(value, obligationKeys, path)
      if (row.direction === 'DEBIT') fail('OBLIGATION_DEBIT_UNSUPPORTED', 'توزيع المديونياتDEBITيتطلب عقد ترحيل مستقل؛ لا يُفترض أنها أقساط سلف', `${path}.direction`)
      if (row.direction !== 'CREDIT') fail('DIRECTION_MISMATCH', 'مستحق الدفتر في هذه المرحلةCREDITفقط', `${path}.direction`)
      const componentCode = text(row.componentCode, 40, `${path}.componentCode`), component = componentFor(components, componentCode, `${path}.componentCode`)
      guardComponent(component, policy)
      if (component.ledgerDirection !== 'CREDIT') fail('DIRECTION_MISMATCH', 'المستحق يتطلب بندإضافةCREDIT', path)
      const categoryCode = category(row.category, `${path}.category`); matchCategory(component, categoryCode, `${path}.category`)
      const entryRef = text(row.entryRef, 100, `${path}.entryRef`); unique('OBLIGATION', entryRef, `${path}.entryRef`)
      obligations.push({ componentCode, entryRef, category: categoryCode, direction: 'CREDIT', sourceRef: text(row.sourceRef, 200, `${path}.sourceRef`),
        sourceRevision: integer(row.sourceRevision, 1, `${path}.sourceRevision`), duePeriod: period(row.duePeriod, `${path}.duePeriod`), remainingAmount: money(row.remainingAmount, `${path}.remainingAmount`),
        priority: integer(row.priority, 0, `${path}.priority`), sequence: integer(row.sequence, 1, `${path}.sequence`) })
    }
    const manualDeferrals: PayrollInstallmentManualDeferral[] = [], deferredRefs = new Set<string>()
    for (const [index, value] of (raw.manualDeferrals as unknown[]).entries()) {
      const path = `ledger.manualDeferrals.${index}`, row = fields(value, ['installmentRef', 'toPeriod', 'sourceRef', 'reason'], path)
      const installmentRef = text(row.installmentRef, 100, `${path}.installmentRef`), target = installments.find(item => item.installmentRef === installmentRef)
      if (!target || target.remainingAmount === '0.00' || target.duePeriod > current || deferredRefs.has(installmentRef)) fail('DEFERRAL_INVALID', 'التأجيل يتطلب قسطًا مستحقًا مفتوحًا وقرارًا واحدًا', path)
      const toPeriod = period(row.toPeriod, `${path}.toPeriod`), reason = text(row.reason, 500, `${path}.reason`)
      if (toPeriod <= current || reason.length < 3) fail('DEFERRAL_INVALID', 'تاريخ التأجيل لاحق للفترة وسببه لايقل عن3محارف', path)
      manualDeferrals.push({ installmentRef, toPeriod, sourceRef: text(row.sourceRef, 200, `${path}.sourceRef`), reason }); deferredRefs.add(installmentRef)
    }
    installments.sort((a, b) => ordinal(a.componentCode, b.componentCode) || a.priority - b.priority || ordinal(a.originalDuePeriod, b.originalDuePeriod) || a.sequence - b.sequence || ordinal(a.installmentRef, b.installmentRef))
    obligations.sort((a, b) => ordinal(a.componentCode, b.componentCode) || a.priority - b.priority || ordinal(a.duePeriod, b.duePeriod) || a.sequence - b.sequence || ordinal(a.entryRef, b.entryRef))
    manualDeferrals.sort((a, b) => ordinal(a.installmentRef, b.installmentRef))
    return freeze({ version: PAYROLL_COMPONENT_LEDGER_SOURCE_VERSION, sourceValidation: 'CALLER_UNVERIFIED', period: current, nextPeriod: next,
      settings: policy, components: [...components], installments, obligations, manualDeferrals })
  } catch (error) {
    if (error instanceof PayrollPolicyDefinitionError) throw new PayrollComponentLedgerSourceError(error.code, error.message, error.path)
    throw error
  }
}

/** المبلغ الخام المستحق قبلNET؛ القرار اليدوي لا يمحو أصل القسط ولا يُنفذ تحصيلًا هنا. */
export function resolvePayrollLedgerComponent(prepared: PreparedPayrollLedgerSources, componentCode: string): DeepReadonly<PayrollLedgerSourceResolution> {
  const component = componentFor(prepared.components, componentCode, 'componentCode'); guardComponent(component, prepared.settings)
  const debit = component.ledgerDirection === 'DEBIT', rows: PayrollLedgerSourceTraceRow[] = []
  if (debit) for (const row of prepared.installments.filter(item => item.componentCode === componentCode)) rows.push({ kind: 'INSTALLMENT', identity: `INSTALLMENT:${row.installmentRef}`,
    sourceRef: row.sourceRef, sourceRevision: row.sourceRevision, duePeriod: row.duePeriod, remainingAmount: row.remainingAmount,
    eligible: row.duePeriod <= prepared.period && row.remainingAmount !== '0.00', priority: row.priority, sequence: row.sequence,
    manualDeferral: prepared.manualDeferrals.find(item => item.installmentRef === row.installmentRef) ?? null })
  else for (const row of prepared.obligations.filter(item => item.componentCode === componentCode)) rows.push({ kind: 'OBLIGATION', identity: `OBLIGATION:${row.entryRef}`,
    sourceRef: row.sourceRef, sourceRevision: row.sourceRevision, duePeriod: row.duePeriod, remainingAmount: row.remainingAmount,
    eligible: row.duePeriod <= prepared.period && row.remainingAmount !== '0.00', priority: row.priority, sequence: row.sequence, manualDeferral: null })
  const due = rows.filter(row => row.eligible), amount = due.reduce((sum, row) => sum.add(PayrollDecimal.from(row.remainingAmount)), PayrollDecimal.from('0'))
  const sourceRefs = [...new Set(due.flatMap(row => [row.sourceRef, ...(row.manualDeferral ? [row.manualDeferral.sourceRef] : [])]))].sort()
  return freeze({ componentCode, direction: debit ? 'DEBIT' : 'CREDIT', value: { numerator: String(amount.numerator), denominator: String(amount.denominator) },
    amount: amount.format(2, 'DOWN'), sourceRefs, rows, trace: { sourceValidation: 'CALLER_UNVERIFIED', period: prepared.period, nextPeriod: prepared.nextPeriod,
      sourceKind: debit ? 'INSTALLMENT' : 'OBLIGATION', insufficientMode: debit ? modes[component.ledgerPartialPayment!] : null },
    warnings: [{ code: 'COMPONENT_LEDGER_CALLER_UNVERIFIED', message: 'المبالغ والمراجع لقطةصريحة غيرموثقة؛ لا تثبت سدادًا أو اكتمال جدول أو قرارًا معتمدًا', path: `components.${componentCode}` }] })
}

/** يستدعيه المنسق بعدحساب سعةالبند؛ التخصيص مقترح نقي ولا ينشئ أو يعدل أيقسط. */
export function allocatePreparedPayrollLedgerComponent(prepared: PreparedPayrollLedgerSources, componentCode: string, availableBudget: string): PayrollInstallmentAllocationResult {
  const component = componentFor(prepared.components, componentCode, 'componentCode'); guardComponent(component, prepared.settings)
  if (component.ledgerDirection !== 'DEBIT') fail('ALLOCATION_UNSUPPORTED', 'تخصيص السعة يخص أقساطDEBIT؛ مستحقCREDITيقرأ كاملًا', 'componentCode')
  const rows = prepared.installments.filter(item => item.componentCode === componentCode), refs = new Set(rows.map(row => row.installmentRef))
  try {
    return allocatePayrollInstallments({ period: prepared.period, nextPeriod: prepared.nextPeriod, currencyScale: 2, availableBudget,
      installments: rows.map(({ componentCode: _code, category: _category, ...row }) => ({ ...row })),
      manualDeferrals: prepared.manualDeferrals.filter(row => refs.has(row.installmentRef)).map(row => ({ ...row })) })
  } catch (error) {
    if (error instanceof PayrollInstallmentAllocationError) throw new PayrollComponentLedgerSourceError(error.code, error.message, error.path)
    throw error
  }
}
