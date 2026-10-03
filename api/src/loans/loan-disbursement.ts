import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B1.8 (R09، ترحيل 082): تسجيل صرف السلفة — التاريخ (العمود القائم disbursedAt) والطريقة والمرجع ومين. والإعداد «لازم تتصرف الأول»
// (مقفول افتراضيًا) بيعلّم السلف الجديدة بس: أقساطها مابتدخلش المسير لحد ما صرفها يتسجل. السلف القديمة (NULL) زي النهارده، فمفيش تعبئة رجعية.
// الأعمدة برّه الكيان (الكود قبل الترحيل)، بتتقرا وتتكتب بـSQL صريح بعد التأكد من وجودها.

export const LOAN_REQUIRE_DISBURSEMENT_KEY = 'loans.require_disbursement_before_deduction'
export const LOAN_DISBURSEMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHEQUE'] as const
export type LoanDisbursementMethod = typeof LOAN_DISBURSEMENT_METHODS[number]
export const LOAN_DISBURSEMENT_METHOD_LABELS: Record<LoanDisbursementMethod, string> = { CASH: 'نقدي', BANK_TRANSFER: 'تحويل بنكي', CHEQUE: 'شيك' }
export const LOAN_DISBURSEMENT_MIGRATION_MISSING = 'تسجيل صرف السلفة محتاج ترحيل 20261003_082 على قاعدة البيانات؛ الأقساط ماشية زي ما هي لحد ما يتطبق'

/** الأعمدة الأربعة موجودة (ترحيل 082 متطبق) */
export async function loanDisbursementReady(em: EntityManager): Promise<boolean> {
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.loans', N'requiresDisbursement') IS NOT NULL AND COL_LENGTH(N'dbo.loans', N'disbursedByUserId') IS NOT NULL
    AND COL_LENGTH(N'dbo.loans', N'disbursementMethod') IS NOT NULL AND COL_LENGTH(N'dbo.loans', N'disbursementReference') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  return Number(row?.ready) === 1
}

/** السلفة لسه متعملة: لو الإعداد مفتوح والترحيل متطبق، بتتعلّم «لازم تتصرف الأول». المقفول = ولا كتابة (زي النهارده) */
export async function markNewLoanDisbursementRequirement(em: EntityManager, loanId: number): Promise<boolean> {
  const [setting] = await em.query('SELECT [value] FROM [requests_config] WHERE [key]=@0', [LOAN_REQUIRE_DISBURSEMENT_KEY])
  if (setting?.value !== 'true' || !(await loanDisbursementReady(em))) return false
  await em.query('UPDATE [loans] SET [requiresDisbursement]=1 WHERE [id]=@0 AND [disbursedAt] IS NULL', [loanId])
  return true
}

/** سلف الموظف اللي لازم تتصرف الأول وصرفها لسه ماتسجلش — أقساطها مابتدخلش المسير */
export async function undisbursedLoanIds(em: EntityManager, employeeId: number): Promise<Set<number>> {
  if (!(await loanDisbursementReady(em))) return new Set()
  const rows: Array<{ id: number }> = await em.query('SELECT [id] FROM [loans] WHERE [employeeId]=@0 AND [requiresDisbursement]=1 AND [disbursedAt] IS NULL', [employeeId])
  return new Set(rows.map(row => Number(row.id)))
}

/** بيانات الصرف لسلف موظف (للدفتر والشاشة) — قبل الترحيل: فاضية */
export async function loanDisbursementDetails(em: EntityManager, loanIds: number[]) {
  const result = new Map<number, { requiresDisbursement: boolean; disbursedByUserId: number | null; disbursementMethod: string | null; disbursementReference: string | null }>()
  if (!loanIds.length || !(await loanDisbursementReady(em))) return result
  const rows: any[] = await em.query(`SELECT [id],[requiresDisbursement],[disbursedByUserId],[disbursementMethod],[disbursementReference] FROM [loans]
    WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(loanIds)])
  for (const row of rows) result.set(Number(row.id), { requiresDisbursement: row.requiresDisbursement === true || row.requiresDisbursement === 1,
    disbursedByUserId: row.disbursedByUserId == null ? null : Number(row.disbursedByUserId), disbursementMethod: row.disbursementMethod ?? null,
    disbursementReference: row.disbursementReference ?? null })
  return result
}

/** مدخلات تسجيل الصرف: التاريخ (النهارده أو قبله، ومش قبل 2000)، والطريقة، والمرجع (لحد 100 حرف؛ مطلوب للتحويل والشيك) */
export function readLoanDisbursementInput(input: { date?: unknown; method?: unknown; reference?: unknown }, today: string) {
  const date = typeof input.date === 'string' ? input.date.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`)) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_DATE', message: 'تاريخ الصرف بصيغة YYYY-MM-DD' })
  }
  if (date > today) throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_DATE', message: 'تاريخ الصرف النهارده أو قبله' })
  if (date < '2000-01-01') throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_DATE', message: 'تاريخ الصرف غير منطقي' })
  const method = typeof input.method === 'string' ? input.method.trim() as LoanDisbursementMethod : null
  if (!method || !LOAN_DISBURSEMENT_METHODS.includes(method)) throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_METHOD', message: 'طريقة الصرف: نقدي أو تحويل بنكي أو شيك' })
  const reference = typeof input.reference === 'string' && input.reference.trim() ? input.reference.trim() : null
  if (reference && reference.length > 100) throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_REFERENCE', message: 'مرجع الصرف لحد 100 حرف' })
  if (!reference && method !== 'CASH') throw new BadRequestException({ code: 'LOAN_DISBURSEMENT_REFERENCE', message: 'مرجع الصرف (رقم التحويل أو الشيك) مطلوب' })
  return { date, method, reference }
}

/** تسجيل الصرف مرة واحدة (السلفة مقفولة في المعاملة). الحالة «معتمدة» بتبقى «تم الصرف»؛ المسددة بتفضل مسددة */
export async function recordLoanDisbursement(em: EntityManager, input: { loanId: number; date: string; method: LoanDisbursementMethod; reference: string | null; actorId: number }) {
  if (!(await loanDisbursementReady(em))) throw new ConflictException({ code: 'LOAN_DISBURSEMENT_MIGRATION_MISSING', message: LOAN_DISBURSEMENT_MIGRATION_MISSING })
  const updated: Array<{ id: number }> = await em.query(`UPDATE [loans] SET [disbursedAt]=CAST(CONVERT(date, @1, 23) AS datetime), [disbursedByUserId]=@2, [disbursementMethod]=@3,
      [disbursementReference]=@4, [status]=CASE WHEN [status]=N'APPROVED' THEN N'DISBURSED' ELSE [status] END
    OUTPUT INSERTED.[id] WHERE [id]=@0 AND [disbursedAt] IS NULL`, [input.loanId, input.date, input.actorId, input.method, input.reference])
  if (updated.length !== 1) throw new ConflictException({ code: 'LOAN_ALREADY_DISBURSED', message: 'صرف السلفة متسجل قبل كده' })
}
