import type { EntityManager } from 'typeorm'

/**
 * CRP3G-B02 / CRP3H: حزمة الدور وحالته كنص للمقارنة (دور من غير صف = 'PRESET': حزمته الأساسية في الكود).
 * من غير قفل: القراية اللي الحكم بيتبني عليها. بقفل (جوه معاملة): صف الدور — أو مكانه في فهرس الكود الفريد لو مالوش صف —
 * بيتقفل لآخر المعاملة (UPDLOCK + HOLDLOCK): تعديل الحزمة، أو إنشاء صف للكود ده، يا ثبت قبلنا فنشوفه، يا بيستنى الحفظ.
 * الترتيب في كل الكتّاب: الدور الأول، وبعده صف الحساب.
 */
export async function roleStampOf(source: EntityManager, code: string, lock = false): Promise<string> {
  const rows: Array<{ permissions: string; isActive: boolean | number }> = await source.query(
    `SELECT [permissions], [isActive] FROM [roles]${lock ? ' WITH (UPDLOCK, HOLDLOCK)' : ''} WHERE [code] = @0`, [code])
  return rows.length ? JSON.stringify([rows[0].permissions, rows[0].isActive === true || rows[0].isActive === 1]) : 'PRESET'
}
