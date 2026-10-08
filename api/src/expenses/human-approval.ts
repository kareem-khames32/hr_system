import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { Request } from '../requests/entities/request.entity'

// Codex P5A-B01: التنفيذ المالي للمصروفات (تقرير مصروفات، سلفة مأمورية، وأي نوع مخصّص بنفس الوجهة) محتاج مراجعة بشرية للمبلغ.

export const HUMAN_APPROVAL_REQUIRED = 'صرف المصروفات محتاج اعتماد من حد غير صاحب الطلب — سلسلة الاعتماد بتاعة النوع ده من غير معتمدين (تنفيذ فوري)؛ ضيف معتمد في «سلاسل الاعتماد»'

/**
 * مراجعة بشرية للمبلغ قبل أي تنفيذ مالي: قرار اعتماد واحد على الأقل في خطوة حقيقية من السلسلة (مش قرار النظام ولا «تنفيذ فوري» بسلسلة فاضية)
 * ومن حساب غير اللي قدّم الطلب. بيتنادى جوه معاملة التنفيذ وصف الطلب مقفول: الرفض بيرجّع التقديم أو الاعتماد كله.
 */
export async function assertHumanApproval(em: EntityManager, req: Request): Promise<void> {
  const rows: Array<{ id: number }> = await em.query(
    `SELECT TOP (1) a.[id] FROM dbo.request_approvals a WHERE a.[requestId] = @0 AND a.[action] = N'APPROVED' AND a.[step] > 0 AND a.[approverId] > 0 AND a.[approverId] <> @1`, [req.id, req.createdByUserId ?? 0])
  if (!rows.length) throw new BadRequestException(HUMAN_APPROVAL_REQUIRED)
}
