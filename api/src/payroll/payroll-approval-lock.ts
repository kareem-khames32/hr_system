import { ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B1.6 (R15): اعتماد المسير ممكن ياخد دقايق (500 موظف = 198 ثانية)، والمستخدم ممكن يدوس تاني أو المتصفح يعيد الطلب.
// الاعتماد بياخد قفل خاص بيه جوه معاملته من غير انتظار: طلب اعتماد تاني لنفس المسير وهو شغال بيترفض على طول برسالة واضحة
// (بدل ما يستنى قفل المسير 10 ثواني ويطلع «قيد التحديث»). القفل بيتفك لوحده مع نهاية المعاملة (نجحت أو فشلت).
export const PAYROLL_APPROVAL_RUNNING_MESSAGE = 'اعتماد المسير ده شغال دلوقتي من طلب تاني — استنى لحد ما يخلص وحدّث الشاشة'

export async function claimPayrollApproval(em: EntityManager, runId: number): Promise<void> {
  const rows = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
    SELECT @result AS lockResult;`, [`hr:payroll:approve:${runId}`])
  if (!rows.length || Number(rows[0].lockResult) < 0) {
    throw new ConflictException({ code: 'PAYRUN-APPROVAL-RUNNING', message: PAYROLL_APPROVAL_RUNNING_MESSAGE })
  }
}
