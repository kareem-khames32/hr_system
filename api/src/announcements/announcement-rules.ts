import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { AUDIENCE_WHERE_MODES, AUDIENCE_WHO_MODES, parseRequestAudience } from '../requests/request-audience'
import type { BranchScope } from '../auth/guards'

// B2.16: قواعد الإعلانات — ملف صرف (غير فحص وجود الجدولين): المدخلات، ومتى الإعلان ساري، وجمهور حساب الفروع.

export const ANNOUNCEMENTS_MIGRATION_MISSING = 'الإعلانات محتاجة ترحيل 20261007_100 على قاعدة البيانات'
export const ANNOUNCEMENT_NOT_FOUND = 'الإعلان غير موجود'
export const ANNOUNCEMENT_TITLE_MAX = 200
export const ANNOUNCEMENT_BODY_MAX = 4000
export const ANNOUNCEMENT_AUDIENCE_MAX = 2000
export const ANNOUNCEMENT_BRANCH_AUDIENCE = 'حساب الفروع بينشر لفروعه بس: اختار «فروع محددة» من فروعك في جمهور الإعلان'
export const ANNOUNCEMENT_NOT_DRAFT = 'الإعلان اتنشر: اسحبه واعمل إعلان جديد بدل ما تعدّله'

let ready: boolean | null = null
/** جدولي ترحيل 100 موجودين؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function announcementsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.announcements', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.announcement_reads', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الجدولين */
export function resetAnnouncementsCache() { ready = null }

export const isAnnouncementDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

export function announcementTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (title.length < 2 || title.length > ANNOUNCEMENT_TITLE_MAX) throw new BadRequestException(`عنوان الإعلان من حرفين لـ${ANNOUNCEMENT_TITLE_MAX} حرف`)
  return title
}

export function announcementBody(value: unknown): string {
  const body = typeof value === 'string' ? value.trim() : ''
  if (body.length < 1 || body.length > ANNOUNCEMENT_BODY_MAX) throw new BadRequestException(`نص الإعلان مطلوب، و${ANNOUNCEMENT_BODY_MAX} حرف بالكتير`)
  return body
}

/** تاريخ النشر (الافتراضي النهارده) والانتهاء (اختياري، مش قبل النشر) */
export function announcementDates(publishDate: unknown, expiryDate: unknown, today: string): { publishDate: string; expiryDate: string | null } {
  const publish = publishDate === undefined || publishDate === null || publishDate === '' ? today : publishDate
  if (!isAnnouncementDate(publish)) throw new BadRequestException('تاريخ نشر الإعلان غير صالح — الصيغة YYYY-MM-DD')
  const expiry = expiryDate === undefined || expiryDate === null || expiryDate === '' ? null : expiryDate
  if (expiry !== null && (!isAnnouncementDate(expiry) || expiry < publish)) throw new BadRequestException('تاريخ انتهاء الإعلان لازم يكون تاريخ صحيح مش قبل تاريخ النشر')
  return { publishDate: publish, expiryDate: expiry as string | null }
}

/**
 * جمهور الإعلان للنص المحفوظ (نفس صيغة جمهور أنواع الطلبات): «مين» و«فين» من الأوضاع المعروفة، والاختيارات مرتّبة ومن غير تكرار.
 * null = كل الشركة.
 */
export function announcementAudienceJson(audience: unknown): string | null {
  if (audience === null || audience === undefined) return null
  if (typeof audience !== 'object' || Array.isArray(audience)) throw new BadRequestException('جمهور الإعلان بصيغة غير صحيحة')
  const value = audience as { mode?: unknown; ids?: unknown; where?: { mode?: unknown; ids?: unknown } | null; conditions?: unknown }
  // شروط الصفات (جنسية، عقد…) مش من جمهور الإعلان: مرفوضة بدل ما تتشال بصمت والإعلان يطلع لجمهور أوسع من المقصود
  if (value.conditions != null) throw new BadRequestException('جمهور الإعلان «مين» و«فين» بس — من غير شروط صفات')
  const mode = String(value.mode ?? 'all')
  if (!(AUDIENCE_WHO_MODES as readonly string[]).includes(mode)) throw new BadRequestException('اختيار «مين» في جمهور الإعلان غير معروف')
  const ids = [...new Set(Array.isArray(value.ids) ? value.ids.map(String).filter(Boolean) : [])].sort()
  const whereMode = String(value.where?.mode ?? 'company')
  if (!(AUDIENCE_WHERE_MODES as readonly string[]).includes(whereMode)) throw new BadRequestException('اختيار «فين» في جمهور الإعلان غير معروف')
  const whereIds = [...new Set(Array.isArray(value.where?.ids) ? (value.where!.ids as unknown[]).map(Number).filter(id => Number.isSafeInteger(id) && id > 0) : [])].sort((a, b) => a - b)
  if (mode !== 'all' && ids.length === 0) throw new BadRequestException('اختار مين الإعلان ليهم، أو خلّيه «الكل»')
  // «فين» من غير اختيار كان هيتقري «كل الشركة»: إعلان فرع كان هيطلع للكل
  if (whereMode !== 'company' && whereIds.length === 0) throw new BadRequestException('اختار الفروع أو الأقسام أو الفرق، أو خلّيه «كل الشركة»')
  if (mode === 'all' && whereMode === 'company') return null
  const text = JSON.stringify({ mode, ids, where: whereMode === 'company' ? null : { mode: whereMode, ids: whereIds } })
  if (text.length > ANNOUNCEMENT_AUDIENCE_MAX) throw new BadRequestException('جمهور الإعلان أكبر من الحد')
  return text
}

/**
 * النص المحفوظ هو نفسه اللي كاتب الإعلانات بيكتبه؟ مقيّم الجمهور بيفتح على النص التالف (وضع مش معروف أو قايمة فاضية = الكل) — ده قرار
 * أنواع الطلبات؛ والإعلان محتوى، فنص اتغيّر برّه الكاتب = الإعلان مش لحد.
 */
export function announcementAudienceIntact(audience: string | null | undefined): boolean {
  if (audience === null || audience === undefined) return true
  try {
    return announcementAudienceJson(JSON.parse(audience)) === audience
  } catch {
    return false
  }
}

/**
 * جمهور الإعلان جوه نطاق فروع الحساب؟ حساب كل الفروع (null): أي جمهور. حساب الفروع: «فين» لازم «فروع محددة» وكلها من فروعه —
 * كل الشركة أو أقسام وفرق (مكانها مش متثبّت بفرع في الجمهور) لأ.
 */
export function announcementAudienceInScope(audience: string | null | undefined, scope: BranchScope): boolean {
  if (scope === null) return true
  const where = parseRequestAudience(audience)?.where
  if (!where || where.mode !== 'branches' || !Array.isArray(where.ids) || where.ids.length === 0) return false
  return where.ids.every(id => scope.includes(Number(id)))
}

/** الإعلان ساري النهارده؟ منشور، ووصل تاريخ نشره، ولسه ماعدّاش تاريخ انتهائه */
export function announcementLive(row: { status: string; publishDate: unknown; expiryDate: unknown }, today: string): boolean {
  const publish = String(row.publishDate ?? '').slice(0, 10), expiry = row.expiryDate ? String(row.expiryDate).slice(0, 10) : null
  return row.status === 'PUBLISHED' && publish <= today && (expiry === null || expiry >= today)
}
