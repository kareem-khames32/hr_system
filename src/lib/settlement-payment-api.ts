// B1.8c: تسجيل صرف التصفية المعتمدة (التاريخ والطريقة والمرجع) — مرة واحدة، بصلاحية «اعتماد التصفية». مسارات نسبية (لا @/).
import { apiFetch } from './api'

export type SettlementPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'

export interface ApiSettlementPayment {
  paidAt: string
  method: SettlementPaymentMethod
  methodLabel: string
  reference: string | null
  paidByUserId: number | null
  paidByName: string | null
}

export const SETTLEMENT_PAYMENT_METHOD_OPTIONS: Array<{ value: SettlementPaymentMethod; label: string }> = [
  { value: 'CASH', label: 'نقدي' },
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'CHEQUE', label: 'شيك' },
]

export const recordSettlementPayment = (caseId: number, d: { date: string; method: SettlementPaymentMethod; reference?: string }) =>
  apiFetch<unknown>(`/offboarding/${caseId}/settlement-payment`, { method: 'POST', body: JSON.stringify(d) })

/** سطر عرض الصرف المتسجل */
export const settlementPaymentSummary = (payment: ApiSettlementPayment): string =>
  `اتصرفت يوم ${payment.paidAt} — ${payment.methodLabel}${payment.reference ? ` (مرجع ${payment.reference})` : ''}` +
  (payment.paidByName ? ` — سجّلها ${payment.paidByName}` : '')
