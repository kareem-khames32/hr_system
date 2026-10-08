import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B6.2 (أ) — ترحيل 182: لغة عرض الواجهة لكل حساب (`users.language`). العمود برّه قراءة وكتابة كيان الحساب (الكود شغال قبل الترحيل:
// قبله كل الحسابات عربي وتغيير اللغة مرفوض برسالة). تفضيل عرض بس: مابيغيّرش صلاحية ولا نطاق ولا إصدار التوكن.

export const UI_LANGUAGES = ['ar', 'en'] as const
export type UiLanguage = (typeof UI_LANGUAGES)[number]
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'ar'
export const LANGUAGE_INVALID = 'اللغة عربي (ar) أو إنجليزي (en)'
export const LANGUAGE_NOT_READY = 'اختيار اللغة محتاج ترحيل قاعدة البيانات 182 — كلّم مدير النظام'
export const isUiLanguage = (value: unknown): value is UiLanguage => (UI_LANGUAGES as readonly unknown[]).includes(value)

let ready = false
export async function userLanguageReady(em: EntityManager): Promise<boolean> {
  if (ready) return true
  const [row]: Array<{ ready: number }> = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.users', N'language') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}

/** لغة الحساب — الفاضي أو قيمة مش معروفة = عربي */
export async function readUserLanguage(em: EntityManager, userId: number): Promise<UiLanguage> {
  if (!(await userLanguageReady(em))) return DEFAULT_UI_LANGUAGE
  const [row]: Array<{ language: string | null }> = await em.query('SELECT [language] FROM dbo.users WHERE [id] = @0', [userId])
  return isUiLanguage(row?.language) ? row.language : DEFAULT_UI_LANGUAGE
}

/** صاحب الحساب بيغيّر لغته: كتابة عمود واحد على صفه بس */
export async function writeUserLanguage(em: EntityManager, userId: number, language: unknown): Promise<UiLanguage> {
  if (!isUiLanguage(language)) throw new BadRequestException(LANGUAGE_INVALID)
  if (!(await userLanguageReady(em))) throw new ConflictException(LANGUAGE_NOT_READY)
  await em.query('UPDATE dbo.users SET [language] = @1 WHERE [id] = @0', [userId, language])
  return language
}
