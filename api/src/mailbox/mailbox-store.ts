import { Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { MAILBOX_MIGRATION_MISSING } from './mailbox-rules'

// B-ADD.16: جداول البريد (ترحيل 192) — موجودة ولا لأ، واسم دخول الموظف في المجال. من غير DI: مسار الدخول والبريد بيستخدموه بنفس الشكل.
//  قبل الترحيل: البريد شغال (صندوق الموظف نفسه)، واسم الدخول = بريد الحساب، ومفيش صناديق مشتركة، وشاشتها بتقول إن الترحيل ناقص.

const logger = new Logger('Mailbox')
let ready: boolean | null = null, warned = false

/** جداول البريد موجودة (ترحيل 192)؟ الموجود بيتحفظ، والناقص بيتفحص مع كل نداء (نفس قاعدة notificationChannelTablesReady) */
export async function mailboxTablesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.mail_accounts', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.mail_shared_mailboxes', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.mail_shared_mailbox_users', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(MAILBOX_MIGRATION_MISSING + ' — البريد شغال بصندوق الموظف نفسه بس لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجداول */
export function resetMailboxTablesCache() { ready = null; warned = false }

/** اسم دخول الحساب في المجال لو اتسجّل قبل كده (null = مااتسجّلش، أو الترحيل لسه) */
export async function readMailLogin(em: EntityManager, userId: number): Promise<string | null> {
  if (!(await mailboxTablesReady(em))) return null
  const [row]: Array<{ login: string }> = await em.query('SELECT [login] FROM [mail_accounts] WHERE [userId] = @0', [userId])
  return row?.login ? String(row.login) : null
}

/** تسجيل اسم الدخول (الاسم بس). بيرجّع false قبل الترحيل. صف الحساب واحد (فهرس فريد): دخولين في نفس اللحظة = واحد بيكتب والتاني بيحدّث */
export async function writeMailLogin(em: EntityManager, userId: number, login: string): Promise<boolean> {
  const clean = String(login ?? '').trim().toLowerCase().slice(0, 200)
  if (!clean || !Number.isSafeInteger(userId) || userId <= 0 || !(await mailboxTablesReady(em))) return false
  const now = new Date()
  const updated: unknown[] = await em.query('UPDATE [mail_accounts] SET [login] = @1, [updatedAt] = @2 OUTPUT INSERTED.[id] WHERE [userId] = @0', [userId, clean, now])
  if (updated.length) return true
  try {
    await em.query('INSERT INTO [mail_accounts] ([userId], [login], [updatedAt]) VALUES (@0, @1, @2)', [userId, clean, now])
  } catch (error) {
    // صف اتكتب في نفس اللحظة من دخول تاني (2601 / 2627): نفس الحساب، فالتحديث كفاية
    const number = Number((error as { number?: number; driverError?: { number?: number } })?.number ?? (error as { driverError?: { number?: number } })?.driverError?.number)
    if (number !== 2601 && number !== 2627) throw error
    await em.query('UPDATE [mail_accounts] SET [login] = @1, [updatedAt] = @2 WHERE [userId] = @0', [userId, clean, now])
  }
  return true
}
