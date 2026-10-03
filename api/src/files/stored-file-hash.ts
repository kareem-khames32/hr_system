import { createHash } from 'crypto'
import type { EntityManager } from 'typeorm'

// B2.2 (ترحيل 085): بصمة sha256 لكل ملف جديد في عمود stored_files.sha256. العمود برّه الكيان للكتابة (الكود بيشتغل قبل الترحيل):
// بيتكتب بـSQL صريح بعد التأكد إنه موجود، وقبل الترحيل الرفع شغال من غير بصمة. القديم من غير بصمة.

export const sha256Hex = (bytes: Buffer | Uint8Array) => createHash('sha256').update(bytes).digest('hex')

/** عمود البصمة موجود (ترحيل 085 متطبق) */
export async function storedFileHashReady(em: EntityManager): Promise<boolean> {
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.stored_files', N'sha256') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  return Number(row?.ready) === 1
}

/** تسجيل البصمة للصف الجديد (من غير الترحيل: مفيش تسجيل). بيرجّع اتسجلت ولا لأ */
export async function recordStoredFileHash(em: EntityManager, fileId: number, sha256: string): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('بصمة الملف لازم تكون sha256 بـ64 خانة')
  if (!(await storedFileHashReady(em))) return false
  await em.query(`UPDATE [stored_files] SET [sha256] = @1 WHERE [id] = @0 AND [sha256] IS NULL`, [fileId, sha256])
  return true
}
