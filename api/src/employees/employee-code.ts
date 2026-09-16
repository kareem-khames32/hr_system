import { ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// كود الموظف يولّده النظام عند الإضافة (قرار المالك): EMP-0001، EMP-0002… بنفس شكل النظام القديم عشان الأكواد المنقولة تكمل —
// الرقم التالي = أكبر EMP-#### موجود + 1. لا يُدخل ولا يُعدّل من أحد. رقم البصمة وحده مفتاح ربط البصمات.
export const EMPLOYEE_CODE_PREFIX = 'EMP-'

export function formatEmployeeCode(number: number): string {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('رقم كود الموظف غير صالح')
  return `${EMPLOYEE_CODE_PREFIX}${String(number).padStart(4, '0')}`
}

/** أكبر رقم في أكواد EMP بشرطة أو من غيرها متبوعة بأرقام فقط (EMP-0042 = 42، EMP0042 = 42)؛ غير ذلك يتجاهل. */
export function nextEmployeeCodeFrom(codes: Array<string | null | undefined>): string {
  let max = 0
  for (const code of codes) {
    const match = /^EMP-?(\d{1,15})$/.exec((code ?? '').trim())
    if (match) max = Math.max(max, Number(match[1]))
  }
  return formatEmployeeCode(max + 1)
}

/**
 * يولّد الكود التالي داخل معاملة الإضافة: قفل تطبيق حصري على التسلسل يمنع موظفَين متزامنين من نفس الرقم،
 * والقفل ينفك مع نهاية المعاملة (بعد حفظ الموظف).
 */
export async function generateEmployeeCode(em: EntityManager): Promise<string> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('توليد كود الموظف يحتاج معاملة')
  const locked = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = N'hr:employee-code-sequence', @LockMode = 'Exclusive',
      @LockOwner = 'Transaction', @LockTimeout = 10000;
    SELECT @result AS lockResult;`)
  if (!locked.length || Number(locked[0].lockResult) < 0) throw new ConflictException('توجد إضافة موظف جارية؛ حاول مجددًا')
  const rows: Array<{ maxNumber: string | number | null }> = await em.query(`SELECT MAX(TRY_CAST(REPLACE(SUBSTRING([employeeCode], 4, 20), '-', '') AS bigint)) AS [maxNumber]
    FROM [employees] WITH (UPDLOCK, HOLDLOCK)
    WHERE ([employeeCode] LIKE 'EMP[0-9]%' OR [employeeCode] LIKE 'EMP-[0-9]%')
      AND REPLACE(SUBSTRING([employeeCode], 4, 20), '-', '') NOT LIKE '%[^0-9]%'`)
  const max = Number(rows[0]?.maxNumber ?? 0)
  return formatEmployeeCode((Number.isSafeInteger(max) && max > 0 ? max : 0) + 1)
}
