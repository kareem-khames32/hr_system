import { createHash } from 'crypto'
import { Transform } from 'stream'
import type { EntityManager } from 'typeorm'

// B2.2 (ترحيل 085): بصمة sha256 لكل ملف جديد في عمود stored_files.sha256. العمود برّه الكيان للكتابة (الكود بيشتغل قبل الترحيل):
// بيتكتب بـSQL صريح بعد التأكد إنه موجود، وقبل الترحيل الرفع شغال من غير بصمة. القديم من غير بصمة.

export const sha256Hex = (bytes: Buffer | Uint8Array) => createHash('sha256').update(bytes).digest('hex')

export interface StreamDigest { sha256: string; size: number }

/** بصمة ملف وحجمه من تيار قراءته: الملف مابيتحمّلش كله في الذاكرة مهما كان حجمه */
export async function sha256OfStream(stream: AsyncIterable<Buffer>): Promise<StreamDigest> {
  const hash = createHash('sha256')
  let size = 0
  for await (const chunk of stream) { hash.update(chunk); size += chunk.length }
  return { sha256: hash.digest('hex'), size }
}

export const STORED_FILE_CHANGED = 'الملف على التخزين اتغيّر بعد التحقق من بصمته'

/**
 * تيار إرسال ملف اتحقق من بصمته وحجمه قبل الإرسال (B2.7): بيعدّي البايتات زي ما هي وبيحسب بصمتها، وماسك آخر جزء لحد ما البصمة والحجم
 * يطابقوا. ملف اتبدّل بعد التحقق (بين القراءتين) بيوقف بخطأ قبل ما آخر جزء يطلع، واللي طلع قبله أقل من الحجم المتحقق منه دايمًا: مع
 * Content-Length = الحجم ده، محدش بيستلم ردًا كاملًا غير للملف اللي بصمته مطابقة.
 */
export function sha256VerifiedStream(expected: StreamDigest): Transform {
  const hash = createHash('sha256')
  let held: Buffer | null = null, seen = 0
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      // جزء فاضي مابيتمسكش مكان آخر جزء
      if (!chunk.length) { done(); return }
      seen += chunk.length
      // أكبر من الملف المتحقق منه: مش هو، ومن غير ما اللي طلع يوصل للحجم المعلَن
      if (seen > expected.size) { done(new Error(STORED_FILE_CHANGED)); return }
      hash.update(chunk)
      const ready = held
      held = chunk
      done(null, ready ?? undefined)
    },
    flush(done) {
      // بصمة مطابقة = نفس الملف بنفس حجمه
      if (hash.digest('hex') !== expected.sha256) done(new Error(STORED_FILE_CHANGED))
      else done(null, held ?? undefined)
    },
  })
}

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
