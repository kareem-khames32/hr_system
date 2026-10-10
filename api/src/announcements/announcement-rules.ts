import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { AUDIENCE_ORG_WHERE_MODES, AUDIENCE_WHO_MODES } from '../requests/request-audience'
import { audienceBranchIds, audienceExcludeIds, audienceWhereBranchId } from '../org/org-audience'
import type { BranchScope } from '../auth/guards'

// B2.16: قواعد الإعلانات — ملف صرف (غير فحص وجود الجدولين): المدخلات، ومتى الإعلان ساري، وجمهور حساب الفروع.

export const ANNOUNCEMENTS_MIGRATION_MISSING = 'الإعلانات محتاجة ترحيل 20261007_100 على قاعدة البيانات'
export const ANNOUNCEMENT_NOT_FOUND = 'الإعلان غير موجود'
export const ANNOUNCEMENT_TITLE_MAX = 200
export const ANNOUNCEMENT_BODY_MAX = 4000
export const ANNOUNCEMENT_AUDIENCE_MAX = 2000
export const ANNOUNCEMENT_BRANCH_AUDIENCE = 'حساب الفروع بينشر لفروعه بس: اختار «فروع محددة» من فروعك في جمهور الإعلان'
export const ANNOUNCEMENT_NOT_DRAFT = 'الإعلان اتنشر: اسحبه واعمل إعلان جديد بدل ما تعدّله'
// B2.16-ب: المرفق. رد الملف اللي مش للحساب هو نفس رد الملف الغايب في /files/:id
export const ANNOUNCEMENT_FILE_NOT_FOUND = 'الملف غير موجود'
export const ANNOUNCEMENT_ATTACHMENT_INVALID = 'مرفق غير صالح — ارفعه من شاشة الإعلان نفسها'
export const ANNOUNCEMENT_UPLOAD_RULE = 'رفع مرفق إعلان يتطلب صلاحية إدارة الإعلانات'
// B2.16-ب: الميزة الفرعية المقفولة «أعياد الميلاد وسنوات الخدمة»
export const ANNOUNCEMENT_OCCASIONS_FEATURE = 'announcements.occasions'
export const OCCASIONS_WINDOW_DAYS = 7

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
  const value = audience as { mode?: unknown; ids?: unknown; where?: { mode?: unknown; ids?: unknown; branchId?: unknown } | null; conditions?: unknown; exclude?: unknown }
  // شروط الصفات (جنسية، عقد…) مش من جمهور الإعلان: مرفوضة بدل ما تتشال بصمت والإعلان يطلع لجمهور أوسع من المقصود
  if (value.conditions != null) throw new BadRequestException('جمهور الإعلان «مين» و«فين» بس — من غير شروط صفات')
  const mode = String(value.mode ?? 'all')
  if (!(AUDIENCE_WHO_MODES as readonly string[]).includes(mode)) throw new BadRequestException('اختيار «مين» في جمهور الإعلان غير معروف')
  const ids = [...new Set(Array.isArray(value.ids) ? value.ids.map(String).filter(Boolean) : [])].sort()
  const whereMode = String(value.where?.mode ?? 'company')
  // B-ADD.1: ومعاهم «إدارات أو أقسام من فرع» (units) بالاستهداف الموحد
  if (!(AUDIENCE_ORG_WHERE_MODES as readonly string[]).includes(whereMode)) throw new BadRequestException('اختيار «فين» في جمهور الإعلان غير معروف')
  const whereIds = [...new Set(Array.isArray(value.where?.ids) ? (value.where!.ids as unknown[]).map(Number).filter(id => Number.isSafeInteger(id) && id > 0) : [])].sort((a, b) => a - b)
  if (mode !== 'all' && ids.length === 0) throw new BadRequestException('اختار مين الإعلان ليهم، أو خلّيه «الكل»')
  // «فين» من غير اختيار كان هيتقري «كل الشركة»: إعلان فرع كان هيطلع للكل
  if (whereMode !== 'company' && whereIds.length === 0) throw new BadRequestException('اختار الفروع أو الأقسام أو الفرق، أو خلّيه «كل الشركة»')
  // B-ADD.1: فرع الاختيار (للإدارات/الأقسام والفرق) و«الكل ماعدا…» — المفاتيح دي بتتكتب لما تكون موجودة بس، فالنص القديم زي ما هو بالحرف
  const whereBranchId = whereMode === 'company' ? null : audienceWhereBranchId(value.where, whereMode, 'جمهور الإعلان')
  const exclude = audienceExcludeIds(value.exclude, 'جمهور الإعلان')
  if (mode === 'all' && whereMode === 'company' && !exclude.length) return null
  const text = JSON.stringify({ mode, ids, where: whereMode === 'company' ? null : { mode: whereMode, ids: whereIds, ...(whereBranchId !== null ? { branchId: whereBranchId } : {}) },
    ...(exclude.length ? { exclude } : {}) })
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
 * جمهور الإعلان جوه نطاق فروع الحساب؟ حساب كل الفروع (null): أي جمهور. حساب الفروع: «فين» لازم «فروع محددة» وكلها من فروعه،
 * أو (B-ADD.1) إدارات/أقسام/فرق فرع اختيارها متحدد ومن فروعه — كل الشركة أو أقسام وفرق بالشكل القديم (مكانها مش متثبّت بفرع) لأ.
 */
export function announcementAudienceInScope(audience: string | null | undefined, scope: BranchScope): boolean {
  if (scope === null) return true
  const branches = audienceBranchIds(audience)
  return !!branches && branches.every(id => scope.includes(id))
}

/** الإعلان ساري النهارده؟ منشور، ووصل تاريخ نشره، ولسه ماعدّاش تاريخ انتهائه */
export function announcementLive(row: { status: string; publishDate: unknown; expiryDate: unknown }, today: string): boolean {
  const publish = String(row.publishDate ?? '').slice(0, 10), expiry = row.expiryDate ? String(row.expiryDate).slice(0, 10) : null
  return row.status === 'PUBLISHED' && publish <= today && (expiry === null || expiry >= today)
}

/** رقم ملف المرفق في مدخل المسودة: undefined = مااتبعتش (مايتغيّرش)، null = فك المرفق، وإلا رقم صحيح موجب */
export function announcementAttachmentInput(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw new BadRequestException(ANNOUNCEMENT_ATTACHMENT_INVALID)
  return value
}

// ===== المناسبات (announcements.occasions) =====
const leapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
const dayAfter = (day: string, days: number): string => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

/**
 * المرة الجاية اللي يوم وشهر التاريخ ده بييجوا فيها من النهارده (النهارده نفسه محسوب)، وعدد السنين اللي هتكون عدّت وقتها.
 * 29 فبراير في سنة مش كبيسة = 28 فبراير. null لو القيمة مش يوم صحيح أو تاريخ في المستقبل (مالوش ذكرى).
 */
export function nextOccurrence(value: unknown, today: string): { date: string; years: number } | null {
  const text = String(value ?? '').slice(0, 10)
  if (!isAnnouncementDate(text) || text > today) return null
  const [year, month, dayOfMonth] = text.split('-').map(Number)
  const inYear = (target: number) =>
    `${target}-${String(month).padStart(2, '0')}-${String(month === 2 && dayOfMonth === 29 && !leapYear(target) ? 28 : dayOfMonth).padStart(2, '0')}`
  const thisYear = Number(today.slice(0, 4))
  const date = inYear(thisYear) >= today ? inYear(thisYear) : inYear(thisYear + 1)
  return { date, years: Number(date.slice(0, 4)) - year }
}

export interface OccasionEmployee { id: number; fullName: string; birthDate?: unknown; joinDate?: unknown }
export interface Occasion { employeeId: number; fullName: string; date: string; today: boolean }

/**
 * مناسبات النهارده والأيام الجاية: أعياد الميلاد باليوم والشهر بس (تاريخ المناسبة في السنة دي — من غير سنة الميلاد ولا السن)، وذكرى
 * التعيين بعدد سنين الخدمة (سنة كاملة على الأقل). الأقرب أولًا.
 */
export function occasionsOf(rows: readonly OccasionEmployee[], today: string, windowDays: number = OCCASIONS_WINDOW_DAYS) {
  const until = dayAfter(today, windowDays)
  const birthdays: Occasion[] = [], anniversaries: Array<Occasion & { years: number }> = []
  for (const row of rows) {
    const birthday = nextOccurrence(row.birthDate, today)
    if (birthday && birthday.date <= until) birthdays.push({ employeeId: row.id, fullName: row.fullName, date: birthday.date, today: birthday.date === today })
    const joined = nextOccurrence(row.joinDate, today)
    if (joined && joined.date <= until && joined.years >= 1) {
      anniversaries.push({ employeeId: row.id, fullName: row.fullName, date: joined.date, today: joined.date === today, years: joined.years })
    }
  }
  const nearest = <T extends Occasion>(list: T[]): T[] => list.sort((a, b) => a.date.localeCompare(b.date) || a.employeeId - b.employeeId)
  return { date: today, windowDays, birthdays: nearest(birthdays), anniversaries: nearest(anniversaries) }
}
