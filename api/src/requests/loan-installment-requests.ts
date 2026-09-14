import { BadRequestException } from '@nestjs/common'

export const LOAN_DEFERRAL_TYPE = 'LOAN_INSTALLMENT_DEFER'
export const LOAN_DEFERRAL_HANDLER = 'loan_installment_defer'
export const LOAN_DEFERRAL_FIELDS = ['loanId', 'installmentId', 'toPeriod', 'reason'] as const
export interface LoanDeferralPayload { loanId: number; installmentId: number; toPeriod: string; reason: string }
export interface LoanDeferralEvidence { loanId: number; installmentId: number; sourceRevision: number; amount: string; toPeriod: string }
export interface StoredLoanDeferralPayload extends LoanDeferralPayload { amount: string; deferralEvidence: LoanDeferralEvidence }
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key)
function bad(message: string): never { throw new BadRequestException(message) }
function object(value: unknown, keys: readonly string[]) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) bad('حمولة تأجيل القسط يجب أن تكون كائنًا صريحًا')
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) bad('حمولة تأجيل القسط لا تقبل بيانات موروثة')
  const result: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) bad('حقل غير مسموح في طلب تأجيل القسط؛ المبلغ ولقطة المصدر يحددهما الخادم')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!own(descriptor, 'value') || !descriptor.enumerable) bad('حمولة تأجيل القسط لا تقبل خصائص محسوبة أو خفية')
    result[key] = descriptor.value
  }
  return result
}
function id(value: unknown) {
  // النماذج العامة ترسل حقول الأرقام كنصوص؛ نقبل النص الصحيح فقط دون أي تصحيح ضمني.
  const parsed = typeof value === 'string' && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1 || parsed > 2147483647) bad('معرف السلفة والقسط ومراجعة المصدر يجب أن تكون أعدادًا صحيحة موجبة')
  return parsed
}
export const assertLoanReferenceId = id
function period(value: unknown) {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) bad('شهر التأجيل مطلوب بصيغة YYYY-MM')
  return value
}
function amount(value: unknown) {
  if (typeof value !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) bad('مبلغ لقطة القسط يجب أن يكون نصًا دقيقًا ضمن DECIMAL(18,2)')
  const [whole, decimals = ''] = value.split('.')
  const cents = BigInt(whole + decimals.padEnd(2, '0'))
  if (cents <= 0n) bad('القسط المطلوب تأجيله يجب أن يكون له رصيد موجب')
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
}

/** فحص العميل مستقل عن بانِي الحقول؛ لا يستطيع حقل مخصص إباحة مبلغ أو موافقة مزوّرة. */
export function assertLoanDeferralClientPayload(value: unknown, requireAll = true): Partial<LoanDeferralPayload> {
  const input = object(value, LOAN_DEFERRAL_FIELDS), result: Partial<LoanDeferralPayload> = {}
  for (const key of LOAN_DEFERRAL_FIELDS) {
    const present = own(input, key) && input[key] !== null && input[key] !== '' && input[key] !== undefined
    if (!present) { if (requireAll) bad(`الحقل ${key} مطلوب لتأجيل القسط`); continue }
    if (key === 'loanId' || key === 'installmentId') result[key] = id(input[key])
    else if (key === 'toPeriod') result.toPeriod = period(input[key])
    else {
      if (typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.length > 500) bad('سبب تأجيل القسط مطلوب من3إلى500محرف')
      result.reason = input.reason.trim()
    }
  }
  return result
}

/** لا تُستخدم لقبول حمولة عميل؛ تقرأ لقطة كتبها التقديم على الخادم فقط. */
export function readStoredLoanDeferralPayload(value: unknown, requireEvidence = false): Partial<StoredLoanDeferralPayload> {
  const stored = object(value, [...LOAN_DEFERRAL_FIELDS, 'amount', 'deferralEvidence'])
  const client = Object.fromEntries(LOAN_DEFERRAL_FIELDS.filter(key => own(stored, key)).map(key => [key, stored[key]]))
  const payload = assertLoanDeferralClientPayload(client, requireEvidence)
  if (!own(stored, 'amount') && !own(stored, 'deferralEvidence')) {
    if (requireEvidence) bad('طلب تأجيل القسط بلا لقطة مصدر؛ أرجعه لإعادة تقديمه')
    return payload
  }
  const evidence = object(stored.deferralEvidence, ['loanId', 'installmentId', 'sourceRevision', 'amount', 'toPeriod'])
  const snapshot: LoanDeferralEvidence = { loanId: id(evidence.loanId), installmentId: id(evidence.installmentId), sourceRevision: id(evidence.sourceRevision), amount: amount(evidence.amount), toPeriod: period(evidence.toPeriod) }
  const thresholdAmount = amount(stored.amount)
  if (payload.loanId !== snapshot.loanId || payload.installmentId !== snapshot.installmentId || payload.toPeriod !== snapshot.toPeriod || thresholdAmount !== snapshot.amount) bad('حمولة تأجيل القسط لا تطابق لقطة المصدر المثبتة عند التقديم')
  return { ...payload, amount: thresholdAmount, deferralEvidence: snapshot }
}

export function stageLoanDeferralPayload(client: LoanDeferralPayload, evidence: LoanDeferralEvidence): StoredLoanDeferralPayload {
  return readStoredLoanDeferralPayload({ ...client, amount: evidence.amount, deferralEvidence: { ...evidence } }, true) as StoredLoanDeferralPayload
}

/** مبلغ التأجيل وشروط المبلغ من SQL نصوص؛ المقارنة بالقروش تمنع إسقاط خطوة اعتماد عند الأرقام الكبيرة. */
export function loanAmountThresholdMet(value: unknown, operator: unknown, threshold: unknown): boolean {
  const units = (candidate: unknown): bigint => {
    if (typeof candidate !== 'string' || !/^-?\d{1,16}(?:\.\d{1,2})?$/.test(candidate)) bad('مبلغ شرط اعتماد السلفة يجب أن يكون نصًا دقيقًا ضمن DECIMAL(18,2)')
    const negative = candidate.startsWith('-'), [whole, fraction = ''] = (negative ? candidate.slice(1) : candidate).split('.')
    return BigInt(whole + fraction.padEnd(2, '0')) * (negative ? -1n : 1n)
  }
  const left = units(value), right = units(threshold)
  switch (operator) {
    case '>=': return left >= right
    case '>': return left > right
    case '<=': return left <= right
    case '<': return left < right
    default: return bad('معامل شرط اعتماد السلفة غير صالح')
  }
}

/** توزيع بالقروش؛ القسط الأخير وحده يمتص الباقي، ولا نعيد تشكيل جدول سلفة موجودة. */
export function loanScheduleAmounts(value: unknown, rawMonths: unknown): { amount: string; amounts: string[]; months: number } {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof text !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(text)) bad('مبلغ السلفة موجب وبدقة منزلتين؛ استخدم نصًا للمبالغ الكبيرة')
  const normalized = amount(text), total = BigInt(normalized.replace('.', ''))
  if (typeof value === 'number' && total > BigInt(Number.MAX_SAFE_INTEGER)) bad('مبلغ السلفة أكبر من دقة الأعداد؛ أرسله كنص عشري يحفظ القروش')
  const months = typeof rawMonths === 'string' && /^[1-9]\d{0,3}$/.test(rawMonths) ? Number(rawMonths) : rawMonths
  if (typeof months !== 'number' || !Number.isInteger(months) || months < 1 || months > 1000) bad('عدد الأقساط يجب أن يكون عددًا صحيحًا من1إلى1000')
  const base = total / BigInt(months)
  if (base < 100n) bad('القسط القياسي لا يقل عن وحدة عملة واحدة؛ قلل عدد الأشهر أو راجع المبلغ')
  const values = Array.from({ length: months }, (_, index) => index === months - 1 ? total - base * BigInt(months - 1) : base)
  return { amount: normalized, months, amounts: values.map(cents => `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`) }
}
