import type { EntityManager } from 'typeorm'
import { maskedIban } from './employee-change-log'
import { EmployeePaymentChange } from './employee-payment-change.entity'

// B1.7: كتابة سجل تغييرات الصرف (ترحيل 081) جوه معاملة التغيير نفسها. قبل الترحيل (الجدول مش موجود) مابيكتبش ومابيوقفش الحفظ:
// وجود الجدول بيتقرا قبل الكتابة (مش بنصطاد الخطأ جوه المعاملة).

export const PAYMENT_CHANGE_FIELDS = ['iban', 'bankName', 'bankBranch', 'payMethod', 'bankTransferAmount'] as const
export type PaymentChangeField = typeof PAYMENT_CHANGE_FIELDS[number]
export type PaymentChangeSource = 'PROFILE' | 'EXCEL' | 'REQUEST' | 'CREATE'
export const PAYMENT_CHANGE_FIELD_LABELS: Record<PaymentChangeField, string> = {
  iban: 'الآيبان', bankName: 'البنك', bankBranch: 'فرع البنك', payMethod: 'طريقة الصرف', bankTransferAmount: 'مبلغ التحويل البنكي',
}
export const PAYMENT_CHANGE_SOURCE_LABELS: Record<PaymentChangeSource, string> = {
  PROFILE: 'تعديل الملف', EXCEL: 'ملف Excel', REQUEST: 'طلب تغيير حساب بنكي', CREATE: 'إنشاء الملف',
}

/** القيمة زي ما بتتسجل: الآيبان متخفي (آخر 4)، والمبلغ بمنزلتين، والفاضي null */
export function paymentChangeValue(field: PaymentChangeField, value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null
  if (field === 'iban') return maskedIban(value)
  if (field === 'bankTransferAmount') {
    const number = Number(value)
    return Number.isFinite(number) ? (Math.trunc(number * 100) / 100).toFixed(2) : String(value).slice(0, 200)
  }
  return String(value).trim().slice(0, 200)
}

export async function paymentChangesTableExists(em: EntityManager): Promise<boolean> {
  const [row] = await em.query(`SELECT OBJECT_ID(N'dbo.employee_payment_changes', N'U') AS [id]`)
  return row?.id != null
}

/** صف لكل حقل اتغيّر فعلًا (المقارنة بالقيمة الكاملة، والتسجيل متخفي). before = null للإنشاء. بيرجّع عدد الصفوف */
export async function recordEmployeePaymentChanges(em: EntityManager, input: {
  employeeId: number
  before: Partial<Record<PaymentChangeField, unknown>> | null
  after: Partial<Record<PaymentChangeField, unknown>>
  actorUserId: number | null | undefined
  source: PaymentChangeSource
  requestId?: number | null
  at?: Date
}): Promise<number> {
  const raw = (value: unknown) => value === null || value === undefined || String(value).trim() === '' ? null
    : typeof value === 'number' ? String(Math.round(value * 100)) : String(value).trim()
  const changed = PAYMENT_CHANGE_FIELDS.filter(field => field in input.after && raw(input.before?.[field]) !== raw(input.after[field])
    && !(input.before === null && raw(input.after[field]) === null))
  if (!changed.length || !(await paymentChangesTableExists(em))) return 0
  const at = input.at ?? new Date()
  await em.getRepository(EmployeePaymentChange).insert(changed.map(field => ({
    employeeId: input.employeeId, field,
    oldValue: input.before ? paymentChangeValue(field, input.before[field]) : null,
    newValue: paymentChangeValue(field, input.after[field]),
    changedByUserId: Number.isSafeInteger(input.actorUserId) && Number(input.actorUserId) > 0 ? Number(input.actorUserId) : null,
    changedAt: at, source: input.source, requestId: input.requestId ?? null,
  })))
  return changed.length
}
