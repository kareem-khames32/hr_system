// AD-11/12: تخصيص نقي على السعة المتاحة بعد السقوف؛ لا يحسب راتبًا أو يثبت سدادًا في الدفتر.
export const PAYROLL_INSTALLMENT_ALLOCATION_VERSION = 'SRS_INSTALLMENT_ALLOCATION_V1_20260913' as const
export const PAYROLL_INSTALLMENT_ALLOCATION_LIMITS = Object.freeze({ installments: 1000, manualDeferrals: 1000, inputNodes: 30000, nesting: 8, textCharacters: 500 })
export type PayrollInstallmentInsufficientMode = 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND'
export interface PayrollInstallmentAllocationItem {
  installmentRef: string; loanRef: string; sourceRef: string; sourceRevision: number; sequence: number
  originalDuePeriod: string; duePeriod: string; remainingAmount: string; priority: number
  insufficientMode: PayrollInstallmentInsufficientMode; extensionPeriod?: string | null
}
export interface PayrollInstallmentManualDeferral { installmentRef: string; toPeriod: string; sourceRef: string; reason: string }
export interface PayrollInstallmentAllocationInput {
  period: string; nextPeriod: string; availableBudget: string; currencyScale: 2
  installments: PayrollInstallmentAllocationItem[]; manualDeferrals: PayrollInstallmentManualDeferral[]
}
export type PayrollInstallmentAllocationOutcome = 'DEDUCTED' | 'PARTIAL' | 'CARRIED_NO_CAPACITY' | 'SKIPPED_AND_EXTENDED' | 'DEFERRED_MANUAL' | 'NOT_DUE' | 'CLOSED'
export interface PayrollInstallmentContinuation {
  amount: string; duePeriod: string; reason: 'PARTIAL_REMAINDER' | 'NO_CAPACITY' | 'INSUFFICIENT_BUDGET' | 'MANUAL_DEFERRAL'; parentInstallmentRef: string
}
export interface PayrollInstallmentAllocationLine extends Omit<PayrollInstallmentAllocationItem, 'remainingAmount' | 'extensionPeriod'> {
  extensionPeriod: string | null; eligible: boolean; budgetBefore: string; budgetAfter: string
  dueAmount: string; deductedAmount: string; remainingAmount: string; outcome: PayrollInstallmentAllocationOutcome
  continuation: PayrollInstallmentContinuation | null; manualDeferral: PayrollInstallmentManualDeferral | null
}
export interface PayrollInstallmentAllocationWarning { code: string; message: string; installmentRef: string | null }
export interface PayrollInstallmentAllocationResult {
  engineVersion: typeof PAYROLL_INSTALLMENT_ALLOCATION_VERSION; sourceValidation: 'CALLER_UNVERIFIED'
  period: string; nextPeriod: string; currencyScale: 2
  budgetInput: string; budgetUsable: string; unusedFraction: string; budgetRemaining: string
  totals: { eligibleDueAmount: string; deductedAmount: string; remainingAmount: string }
  lines: PayrollInstallmentAllocationLine[]; warnings: PayrollInstallmentAllocationWarning[]
}
export class PayrollInstallmentAllocationError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollInstallmentAllocationError' }
}
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
function fail(code: string, message: string, path: string): never { throw new PayrollInstallmentAllocationError(code, message, path) }
const ordinal = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0
const centsText = (value: bigint) => { const text = value.toString().padStart(3, '0'); return `${text.slice(0, -2)}.${text.slice(-2)}` }
const microText = (value: bigint) => {
  const text = value.toString().padStart(7, '0')
  return `${text.slice(0, -6)}.${text.slice(-6)}`.replace(/0+$/, '').replace(/\.$/, '')
}
function freeze<T>(value: T): T { if (value !== null && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }; return value }

/** كل مراجع المصادر والقرارات أدلة مقدمة غير موثقة من الخادم؛ resolver لاحق يثبت اكتمال الجدول وصلاحية القرار. */
export function allocatePayrollInstallments(raw: unknown): PayrollInstallmentAllocationResult {
  let nodes = 0
  const clone = (value: unknown, path: string, depth = 0): unknown => {
    if (++nodes > PAYROLL_INSTALLMENT_ALLOCATION_LIMITS.inputNodes || depth > PAYROLL_INSTALLMENT_ALLOCATION_LIMITS.nesting) fail('INSTALLMENT_INPUT_LIMIT', 'تجاوز حجم أو تعشيش المدخل الحد التقني', path)
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
    if (typeof value === 'string') {
      if (value.length > PAYROLL_INSTALLMENT_ALLOCATION_LIMITS.textCharacters) fail('INSTALLMENT_INPUT_LIMIT', 'النص أطول من الحد التقني المسموح', path)
      return value
    }
    if (typeof value !== 'object') fail('INSTALLMENT_INPUT_SHAPE', 'مدخل JSON صريح مطلوب', path)
    const array = Array.isArray(value), prototype = Object.getPrototypeOf(value)
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail('INSTALLMENT_INPUT_SHAPE', 'النماذج الموروثة المخصصة غير مقبولة', path)
    const copy: unknown[] | Record<string, unknown> = array ? [] : Object.create(null)
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || key.length > 100 || ['__proto__', 'constructor', 'prototype'].includes(key) ||
        (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length))) fail('INSTALLMENT_INPUT_SHAPE', 'خاصية غير مسموحة في المدخل', path)
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!
      if (!own(descriptor, 'value')) fail('INSTALLMENT_INPUT_SHAPE', 'خصائص القراءة المحسوبة غير مقبولة', `${path}.${key}`)
      ;(copy as Record<string, unknown>)[key] = clone(descriptor.value, `${path}.${key}`, depth + 1)
    }
    if (array && Object.keys(copy).length !== value.length) fail('INSTALLMENT_INPUT_SHAPE', 'قائمة متصلة دون فراغات مطلوبة', path)
    return copy
  }
  const shape = (value: unknown, allowed: readonly string[], required: readonly string[], path: string) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('INSTALLMENT_INPUT_SHAPE', 'كائن حقول مطلوب', path)
    const object = value as Record<string, unknown>
    for (const key of Object.keys(object)) if (!allowed.includes(key)) fail('INSTALLMENT_INPUT_UNKNOWN', `حقل غير معروف: ${key}`, `${path}.${key}`)
    for (const key of required) if (!own(object, key)) fail('INSTALLMENT_INPUT_REQUIRED', `الحقل ${key} مطلوب`, `${path}.${key}`)
    return object
  }
  const text = (value: unknown, min: number, max: number, path: string) => {
    if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail('INSTALLMENT_INPUT_VALUE', `النص مطلوب بطول من ${min} إلى ${max}`, path)
    return value.trim()
  }
  const integer = (value: unknown, min: number, path: string) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail('INSTALLMENT_INPUT_VALUE', 'عدد صحيح آمن ضمن المجال المطلوب', path)
    return value
  }
  const period = (value: unknown, path: string) => {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value.slice(0, 4) === '0000') fail('INSTALLMENT_PERIOD_INVALID', 'الفترة بصيغة YYYY-MM من سنة0001إلى9999', path)
    return value
  }
  const following = (value: string, path: string) => {
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5))
    if (value === '9999-12') fail('INSTALLMENT_PERIOD_RANGE', 'الفترة التالية تتجاوز مجال السنوات المدعوم', path)
    return month === 12 ? `${String(year + 1).padStart(4, '0')}-01` : `${value.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`
  }
  const money = (value: unknown, maxScale: 2 | 6, budget: boolean, path: string) => {
    if (typeof value !== 'string' || value.length > 80 || !/^\d+(?:\.\d+)?$/.test(value)) fail('INSTALLMENT_AMOUNT_INVALID', 'المبلغ نص عشري غير سالب دون صيغة علمية', path)
    const [whole, fraction = ''] = value.split('.')
    // أصفار تنسيق السعة مثل60رقمًا صحيحًا يتبعها.00 لا تزيد تعقيد القيمة المالية نفسها.
    const digits = budget ? whole.replace(/^0+/, '').length + fraction.replace(/0+$/, '').length : whole.length + fraction.length
    if (fraction.length > maxScale || digits > 60 || (!budget && whole.replace(/^0+/, '').length > 16)) fail('INSTALLMENT_AMOUNT_PRECISION', budget ? 'السعة حتى60رقمًا و6منازل دون تقريب صامت' : 'القسط ضمنDECIMAL(18,2) دون تقريب صامت', path)
    return BigInt(whole + fraction.padEnd(maxScale, '0'))
  }
  const top = ['period', 'nextPeriod', 'availableBudget', 'currencyScale', 'installments', 'manualDeferrals']
  const input = shape(clone(raw, 'input'), top, top, 'input')
  const currentPeriod = period(input.period, 'period'), nextPeriod = period(input.nextPeriod, 'nextPeriod')
  if (nextPeriod !== following(currentPeriod, 'nextPeriod')) fail('INSTALLMENT_PERIOD_NEXT_INVALID', 'nextPeriod يجب أن يكون الشهر التالي مباشرة', 'nextPeriod')
  if (input.currencyScale !== 2) fail('INSTALLMENT_CURRENCY_SCALE', 'دقة الأقساط الحالية منزلتان عشريتان', 'currencyScale')
  const budgetMicros = money(input.availableBudget, 6, true, 'availableBudget'), initialBudget = budgetMicros / 10000n, unusedMicros = budgetMicros % 10000n
  if (!Array.isArray(input.installments) || input.installments.length > PAYROLL_INSTALLMENT_ALLOCATION_LIMITS.installments) fail('INSTALLMENT_INPUT_LIMIT', 'قائمة الأقساط بحد1000عنصر مطلوبة', 'installments')
  if (!Array.isArray(input.manualDeferrals) || input.manualDeferrals.length > PAYROLL_INSTALLMENT_ALLOCATION_LIMITS.manualDeferrals) fail('INSTALLMENT_INPUT_LIMIT', 'قائمة التأجيل اليدوي بحد1000عنصر مطلوبة', 'manualDeferrals')
  type ParsedItem = Required<Omit<PayrollInstallmentAllocationItem, 'remainingAmount'>> & { remaining: bigint }
  const items: ParsedItem[] = [], references = new Map<string, ParsedItem>(), lastDueByLoan = new Map<string, string>()
  const itemKeys = ['installmentRef', 'loanRef', 'sourceRef', 'sourceRevision', 'sequence', 'originalDuePeriod', 'duePeriod', 'remainingAmount', 'priority', 'insufficientMode', 'extensionPeriod']
  for (const [index, rawItem] of input.installments.entries()) {
    const path = `installments.${index}`, item = shape(rawItem, itemKeys, itemKeys.filter(key => key !== 'extensionPeriod'), path)
    const installmentRef = text(item.installmentRef, 1, 100, `${path}.installmentRef`), loanRef = text(item.loanRef, 1, 100, `${path}.loanRef`)
    if (references.has(installmentRef)) fail('INSTALLMENT_DUPLICATE', 'القسط نفسه لا يدخل اللقطة مرتين', `${path}.installmentRef`)
    const originalDuePeriod = period(item.originalDuePeriod, `${path}.originalDuePeriod`), duePeriod = period(item.duePeriod, `${path}.duePeriod`)
    if (originalDuePeriod > duePeriod) fail('INSTALLMENT_DUE_ORDER', 'الاستحقاق الحالي لا يسبق الاستحقاق الأصلي', path)
    if (item.insufficientMode !== 'PARTIAL_THEN_CARRY' && item.insufficientMode !== 'SKIP_AND_EXTEND') fail('INSTALLMENT_MODE_INVALID', 'سلوك نقص المتاح غير معروف', `${path}.insufficientMode`)
    let extensionPeriod: string | null = null
    if (item.insufficientMode === 'SKIP_AND_EXTEND') extensionPeriod = period(item.extensionPeriod, `${path}.extensionPeriod`)
    else if (own(item, 'extensionPeriod') && item.extensionPeriod !== null) fail('INSTALLMENT_EXTENSION_CONTRADICTION', 'الخصم الجزئي يرحل للشهر التالي؛ extensionPeriod يكونnull أو غائبًا', `${path}.extensionPeriod`)
    const parsed: ParsedItem = { installmentRef, loanRef, sourceRef: text(item.sourceRef, 1, 200, `${path}.sourceRef`),
      sourceRevision: integer(item.sourceRevision, 1, `${path}.sourceRevision`), sequence: integer(item.sequence, 1, `${path}.sequence`),
      originalDuePeriod, duePeriod, remaining: money(item.remainingAmount, 2, false, `${path}.remainingAmount`), priority: integer(item.priority, 0, `${path}.priority`),
      insufficientMode: item.insufficientMode, extensionPeriod }
    items.push(parsed); references.set(installmentRef, parsed)
    if (!lastDueByLoan.has(loanRef) || duePeriod > lastDueByLoan.get(loanRef)!) lastDueByLoan.set(loanRef, duePeriod)
  }
  for (const item of items) if (item.extensionPeriod !== null && (item.extensionPeriod <= currentPeriod || item.extensionPeriod <= lastDueByLoan.get(item.loanRef)!)) fail('INSTALLMENT_EXTENSION_INVALID', 'التمديد يجب أن يأتي بعد الفترة الحالية وكل استحقاقات السلفة المقدمة', `installments.${item.installmentRef}.extensionPeriod`)
  const manual = new Map<string, PayrollInstallmentManualDeferral>(), manualKeys = ['installmentRef', 'toPeriod', 'sourceRef', 'reason']
  for (const [index, rawDecision] of input.manualDeferrals.entries()) {
    const path = `manualDeferrals.${index}`, decision = shape(rawDecision, manualKeys, manualKeys, path)
    const installmentRef = text(decision.installmentRef, 1, 100, `${path}.installmentRef`), item = references.get(installmentRef)
    if (!item || manual.has(installmentRef) || item.remaining === 0n || item.duePeriod > currentPeriod) fail('INSTALLMENT_DEFERRAL_TARGET', 'التأجيل يتطلب قسطًا مفتوحًا مستحقًا معروفًا وقرارًا واحدًا', path)
    const toPeriod = period(decision.toPeriod, `${path}.toPeriod`)
    if (toPeriod <= currentPeriod) fail('INSTALLMENT_DEFERRAL_PERIOD', 'التأجيل اليدوي يجب أن يستهدف فترة لاحقة', `${path}.toPeriod`)
    manual.set(installmentRef, { installmentRef, toPeriod, sourceRef: text(decision.sourceRef, 1, 200, `${path}.sourceRef`), reason: text(decision.reason, 3, 500, `${path}.reason`) })
  }
  items.sort((left, right) => left.priority - right.priority || ordinal(left.originalDuePeriod, right.originalDuePeriod) || left.sequence - right.sequence || ordinal(left.installmentRef, right.installmentRef))
  let budget = initialBudget, totalDue = 0n, totalDeducted = 0n, totalRemaining = 0n
  const lines: PayrollInstallmentAllocationLine[] = [], warnings: PayrollInstallmentAllocationWarning[] = [], lastExtensionByLoan = new Map<string, string>()
  const lastManualByLoan = new Map<string, string>()
  for (const decision of manual.values()) {
    const loanRef = references.get(decision.installmentRef)!.loanRef
    if (!lastManualByLoan.has(loanRef) || decision.toPeriod > lastManualByLoan.get(loanRef)!) lastManualByLoan.set(loanRef, decision.toPeriod)
  }
  if (unusedMicros > 0n) warnings.push({ code: 'INSTALLMENT_BUDGET_FRACTION_UNUSED', message: 'كسر السعة الأقل من سنت بقي غير مستخدم لحماية الحد المتاح', installmentRef: null })
  for (const item of items) {
    const { remaining: amount, ...identifiers } = item, budgetBefore = budget, decision = manual.get(item.installmentRef) ?? null
    const eligible = amount > 0n && item.duePeriod <= currentPeriod
    let deducted = 0n, continuation: PayrollInstallmentContinuation | null = null, outcome: PayrollInstallmentAllocationOutcome
    if (amount === 0n) outcome = 'CLOSED'
    else if (!eligible) outcome = 'NOT_DUE'
    else if (decision) {
      outcome = 'DEFERRED_MANUAL'; continuation = { amount: centsText(amount), duePeriod: decision.toPeriod, reason: 'MANUAL_DEFERRAL', parentInstallmentRef: item.installmentRef }
    } else if (amount <= budget) { outcome = 'DEDUCTED'; deducted = amount }
    else if (item.insufficientMode === 'PARTIAL_THEN_CARRY') {
      deducted = budget; outcome = deducted > 0n ? 'PARTIAL' : 'CARRIED_NO_CAPACITY'
      continuation = { amount: centsText(amount - deducted), duePeriod: nextPeriod, reason: deducted > 0n ? 'PARTIAL_REMAINDER' : 'NO_CAPACITY', parentInstallmentRef: item.installmentRef }
    } else {
      outcome = 'SKIPPED_AND_EXTENDED'
      let target = item.extensionPeriod!
      const manualTail = lastManualByLoan.get(item.loanRef)
      if (manualTail !== undefined) { const minimum = following(manualTail, `installments.${item.installmentRef}.extensionPeriod`); if (minimum > target) target = minimum }
      const previous = lastExtensionByLoan.get(item.loanRef)
      if (previous !== undefined) { const minimum = following(previous, `installments.${item.installmentRef}.extensionPeriod`); if (minimum > target) target = minimum }
      lastExtensionByLoan.set(item.loanRef, target)
      continuation = { amount: centsText(amount), duePeriod: target, reason: 'INSUFFICIENT_BUDGET', parentInstallmentRef: item.installmentRef }
    }
    budget -= deducted
    const remaining = amount - deducted
    if (eligible) { totalDue += amount; totalDeducted += deducted; totalRemaining += remaining }
    if (eligible && remaining > 0n) warnings.push({ code: `INSTALLMENT_${outcome}`, message: outcome === 'DEFERRED_MANUAL' ? 'القسط مؤجل بطلب صريح غير موثق من الخادم' : 'لم يخصم القسط كاملًا؛ الباقي محفوظ في مقترح الاستحقاق اللاحق', installmentRef: item.installmentRef })
    lines.push({ ...identifiers, extensionPeriod: item.extensionPeriod, eligible, budgetBefore: centsText(budgetBefore), budgetAfter: centsText(budget), dueAmount: centsText(amount),
      deductedAmount: centsText(deducted), remainingAmount: centsText(remaining), outcome, continuation, manualDeferral: decision })
  }
  if (budget < 0n || totalDue !== totalDeducted + totalRemaining || initialBudget !== totalDeducted + budget) fail('INSTALLMENT_CONSERVATION', 'فشل تحقق حفظ مبالغ التخصيص', 'result')
  return freeze({ engineVersion: PAYROLL_INSTALLMENT_ALLOCATION_VERSION, sourceValidation: 'CALLER_UNVERIFIED', period: currentPeriod, nextPeriod, currencyScale: 2,
    budgetInput: microText(budgetMicros), budgetUsable: centsText(initialBudget), unusedFraction: microText(unusedMicros), budgetRemaining: centsText(budget),
    totals: { eligibleDueAmount: centsText(totalDue), deductedAmount: centsText(totalDeducted), remainingAmount: centsText(totalRemaining) }, lines, warnings })
}
