import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B1.8c (B0.1 16-23، ترحيل 083): تسجيل صرف التصفية المعتمدة — التاريخ والطريقة والمرجع ومين. الاعتماد مش إثبات صرف، وراتب آخر شهر
// خارج كشف البنك على أساس إنه بيتصرف معاها، فده أول أثر للصرف نفسه. تسجيل بس: مفيش مبلغ ولا حالة بتتغير.
// الأعمدة برّه الكيان للقراءة والكتابة (الكود قبل الترحيل)، بتتقرا وتتكتب بـSQL صريح بعد التأكد من وجودها.

export const SETTLEMENT_PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE'] as const
export type SettlementPaymentMethod = typeof SETTLEMENT_PAYMENT_METHODS[number]
export const SETTLEMENT_PAYMENT_METHOD_LABELS: Record<SettlementPaymentMethod, string> = { CASH: 'نقدي', BANK_TRANSFER: 'تحويل بنكي', CHEQUE: 'شيك' }
export const SETTLEMENT_PAYMENT_MIGRATION_MISSING = 'تسجيل صرف التصفية محتاج ترحيل 20261003_083 على قاعدة البيانات'

export interface SettlementPaymentView {
  paidAt: string; method: string; methodLabel: string; reference: string | null; paidByUserId: number | null; paidByName: string | null
}

/** الأعمدة الأربعة موجودة (ترحيل 083 متطبق) */
export async function settlementPaymentReady(em: EntityManager): Promise<boolean> {
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaidAt') IS NOT NULL
    AND COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaidByUserId') IS NOT NULL AND COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaymentMethod') IS NOT NULL
    AND COL_LENGTH(N'dbo.offboarding_cases', N'settlementPaymentReference') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  return Number(row?.ready) === 1
}

/** صرف التصفية المتسجل للملف — قبل الترحيل أو من غير تسجيل: null */
export async function readSettlementPayment(em: EntityManager, caseId: number): Promise<SettlementPaymentView | null> {
  if (!(await settlementPaymentReady(em))) return null
  const [row] = await em.query(`SELECT CONVERT(nvarchar(10), c.[settlementPaidAt], 23) AS [paidAt], c.[settlementPaymentMethod] AS [method],
      c.[settlementPaymentReference] AS [reference], c.[settlementPaidByUserId] AS [paidByUserId], u.[displayName] AS [paidByName]
    FROM [offboarding_cases] c LEFT JOIN [users] u ON u.[id] = c.[settlementPaidByUserId] WHERE c.[id] = @0 AND c.[settlementPaidAt] IS NOT NULL`, [caseId])
  if (!row) return null
  return { paidAt: String(row.paidAt), method: String(row.method), methodLabel: SETTLEMENT_PAYMENT_METHOD_LABELS[row.method as SettlementPaymentMethod] ?? String(row.method),
    reference: row.reference ?? null, paidByUserId: row.paidByUserId == null ? null : Number(row.paidByUserId), paidByName: row.paidByName ?? null }
}

/** المدخلات: التاريخ (من يوم الاعتماد للنهارده)، والطريقة، والمرجع (لحد 100 حرف؛ مطلوب للتحويل والشيك) */
export function readSettlementPaymentInput(input: { date?: unknown; method?: unknown; reference?: unknown }, today: string, approvedOn: string) {
  const date = typeof input.date === 'string' ? input.date.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_DATE', message: 'تاريخ الصرف بصيغة YYYY-MM-DD' })
  }
  if (date > today) throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_DATE', message: 'تاريخ الصرف النهارده أو قبله' })
  if (date < approvedOn) throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_DATE', message: `تاريخ الصرف مايبقاش قبل اعتماد التصفية (${approvedOn})` })
  const method = typeof input.method === 'string' ? input.method.trim() as SettlementPaymentMethod : null
  if (!method || !SETTLEMENT_PAYMENT_METHODS.includes(method)) throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_METHOD', message: 'طريقة الصرف: نقدي أو تحويل بنكي أو شيك' })
  const reference = typeof input.reference === 'string' && input.reference.trim() ? input.reference.trim() : null
  if (reference && reference.length > 100) throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_REFERENCE', message: 'مرجع الصرف لحد 100 حرف' })
  if (!reference && method !== 'CASH') throw new BadRequestException({ code: 'SETTLEMENT_PAYMENT_REFERENCE', message: 'مرجع الصرف (رقم التحويل أو الشيك) مطلوب' })
  return { date, method, reference }
}

/** التسجيل مرة واحدة (الملف مقفول بالقفل المالي للموظف في المعاملة) */
export async function recordSettlementPayment(em: EntityManager, input: { caseId: number; date: string; method: SettlementPaymentMethod; reference: string | null; actorId: number }) {
  if (!(await settlementPaymentReady(em))) throw new ConflictException({ code: 'SETTLEMENT_PAYMENT_MIGRATION_MISSING', message: SETTLEMENT_PAYMENT_MIGRATION_MISSING })
  const updated: Array<{ id: number }> = await em.query(`UPDATE [offboarding_cases] SET [settlementPaidAt]=CONVERT(date, @1, 23), [settlementPaidByUserId]=@2,
      [settlementPaymentMethod]=@3, [settlementPaymentReference]=@4
    OUTPUT INSERTED.[id] WHERE [id]=@0 AND [settlementPaidAt] IS NULL AND [status] IN (N'SETTLED', N'CLOSED')`, [input.caseId, input.date, input.actorId, input.method, input.reference])
  if (updated.length !== 1) throw new ConflictException({ code: 'SETTLEMENT_ALREADY_PAID', message: 'صرف التصفية متسجل قبل كده' })
}
