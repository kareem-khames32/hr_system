import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { Request } from '../requests/entities/request.entity'

// Codex P5A-B01: التنفيذ المالي للمصروفات (تقرير مصروفات، سلفة مأمورية، وأي نوع مخصّص بنفس الوجهة) محتاج مراجعة بشرية للمبلغ.

export const HUMAN_APPROVAL_REQUIRED = 'صرف المصروفات محتاج اعتماد من حد غير صاحب الطلب — سلسلة الاعتماد بتاعة النوع ده من غير معتمدين (تنفيذ فوري)؛ ضيف معتمد في «سلاسل الاعتماد»'

/**
 * مراجعة بشرية للمبلغ قبل أي تنفيذ مالي: قرار اعتماد واحد على الأقل في خطوة حقيقية من السلسلة (مش قرار النظام ولا «تنفيذ فوري» بسلسلة فاضية).
 * بيتنادى جوه معاملة التنفيذ وصف الطلب مقفول: الرفض بيرجّع التقديم أو الاعتماد كله.
 *
 * Codex P5B-B01: القرار لازم يكون **في آخر تقديم** — بعد آخر إرجاع للاستكمال. إعادة التقديم بتغيّر المبلغ والبنود، فاعتماد جولة قبلها (بيفضل
 * في السجل) مايصرفش مبلغ ماراجعوش حد.
 * Codex P5B-N01: المعتمد أي حساب غير حساب صاحب الطلب نفسه (المستفيد) — قرار الموارد البشرية البشري بالنيابة نافذ زي قاعدة المحرك.
 */
export async function assertHumanApproval(em: EntityManager, req: Request): Promise<void> {
  const rows: Array<{ id: number }> = await em.query(
    `SELECT TOP (1) a.[id] FROM dbo.request_approvals a LEFT JOIN dbo.users u ON u.[id] = a.[approverId]
      WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' AND a.[step] > 0 AND a.[approverId] > 0 AND (u.[employeeId] IS NULL OR u.[employeeId] <> @1)
        AND a.[id] > ISNULL((SELECT MAX(b.[id]) FROM dbo.request_approvals b WHERE b.[requestId] = @0 AND b.[action] = N'RETURNED_FOR_INFO'), 0)`, [req.id, req.requesterId ?? 0])
  if (!rows.length) throw new BadRequestException(HUMAN_APPROVAL_REQUIRED)
}
