import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { orgAudienceJson } from '../org/org-audience'

// B-ADD.15: الاجتماعات — القواعد من غير قاعدة: حالة الاجتماع من أوقاته، وقيم الإنشاء والتعديل، والرسايل.

/** اجتماع بميعاد بيتفتح للدخول قبل ميعاده بالمدة دي */
export const MEET_EARLY_MS = 15 * 60_000
/** اجتماع محدش أنهاه بيتحسب منتهي بعد بدايته بالمدة دي */
export const MEET_EXPIRE_MS = 12 * 60 * 60_000
/** الدعوة «بترن» عند المدعو المدة دي من لحظة بدايتها (بداية الاجتماع، أو إضافته لاجتماع شغال) */
export const MEET_RING_MS = 60_000
/** طلب الدخول بيفضل ظاهر لصاحب الاجتماع طول ما صاحبه لسه مستني (بيسأل كل كام ثانية) — سكت المدة دي = مشي */
export const MEET_KNOCK_FRESH_MS = 20_000
/** الدخول تاني في خلال المدة دي مش صف حضور جديد */
export const MEET_REJOIN_MS = 2 * 60_000
/** أكتر عدد مدعوين لاجتماع واحد — بالاسم، وبالفلاتر (B-ADD.22)، والاتنين مع بعض */
export const MEET_MAX_INVITES = 500
/** «اجتماعاتي»: الجاي، وآخر كام يوم */
export const MEET_LIST_DAYS = 60

export const MEET_MIGRATION_MISSING = 'الاجتماعات محتاجة ترحيل 20261012_191 على قاعدة البيانات'
export const MEET_NOT_CONFIGURED = 'الاجتماعات لسه ماتظبطتش — خادم الاجتماعات محتاج عنوانه ومفاتيحه في إعدادات الخادم'
export const MEET_UNAVAILABLE = 'خادم الاجتماعات مش بيرد دلوقتي — جرّب تاني بعد شوية'
export const MEET_NOT_FOUND = 'الاجتماع غير موجود'
export const MEET_ENDED = 'الاجتماع ده انتهى'
export const MEET_CANCELLED = 'الاجتماع ده اتلغى'
export const MEET_KNOCK_REQUIRED = 'الاجتماع ده بغرفة انتظار — اطلب الدخول وصاحب الاجتماع يوافق'
export const MEET_HOST_ONLY = 'الإجراء ده لصاحب الاجتماع بس'
export const MEET_NOT_IN_ROOM = 'المشارك ده مش في الاجتماع دلوقتي'
export const MEET_NOT_YOURSELF = 'الإجراء ده مايتعملش على نفسك'
export const MEET_TITLE = 'عنوان الاجتماع مطلوب (200 حرف بالكتير)'
export const MEET_START = 'ميعاد الاجتماع لازم يكون جاي وفي خلال سنة'
export const MEET_LOBBY = '«غرفة الانتظار» نعم أو لا'
export const MEET_INVITES = 'قايمة المدعوين غير صحيحة (500 بالكتير)'
export const MEET_USER = 'المشارك غير صحيح'
export const MEET_TRACK = 'الكتم للمايك أو للكاميرا'
// B-ADD.22: الدعوة بالاستهداف الموحد «على مين؟»
export const MEET_AUDIENCE_LABEL = 'جمهور الاجتماع'
export const MEET_AUDIENCE_PERM = 'الدعوة بالفلاتر للي معاه صلاحية شاشة من شاشات تحديد الجمهور — ادعي بالاسم'
export const MEET_AUDIENCE_NOBODY = 'مفيش موظفين في الجمهور ده جوه نطاقك'
export const MEET_AUDIENCE_NO_ACCOUNTS = 'ولا موظف في الجمهور ده له حساب نشط يتدعى'
export const MEET_AUDIENCE_ON_CREATE = 'الدعوة بالفلاتر وقت إنشاء الاجتماع بس — في التعديل ضيف أو شيل بالاسم'
export const meetTooManyInvites = (count: number) => `الاجتماع لـ${MEET_MAX_INVITES} مدعو بالكتير — الاختيار ده ${count}. صغّر الجمهور`

export type MeetStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface MeetingTimes { startsAt: Date | null; createdAt: Date; endedAt: Date | null; cancelledAt: Date | null }

/** بداية الاجتماع: ميعاده، أو لحظة إنشائه لو فوري */
export const meetStartOf = (meeting: Pick<MeetingTimes, 'startsAt' | 'createdAt'>): number => new Date(meeting.startsAt ?? meeting.createdAt).getTime()

/** الحالة من الأوقات: ملغي، منتهي (صاحبه أنهاه أو عدّى 12 ساعة من بدايته)، بميعاد (لسه قدامه أكتر من ربع ساعة)، أو شغال */
export function meetStatusOf(meeting: MeetingTimes, now: number = Date.now()): MeetStatus {
  if (meeting.cancelledAt) return 'cancelled'
  if (meeting.endedAt) return 'ended'
  const start = meetStartOf(meeting)
  if (now - start > MEET_EXPIRE_MS) return 'ended'
  if (start - now > MEET_EARLY_MS) return 'scheduled'
  return 'live'
}

export function cleanMeetTitle(raw: unknown): string {
  const title = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (!title || title.length > 200) throw new BadRequestException(MEET_TITLE)
  return title
}

/** ميعاد البداية: لحظة ISO، أو null / فاضي = فوري، أو undefined = الخانة مااتبعتتش. اللي فات (أكتر من 5 دقايق) أو أبعد من سنة مرفوض */
export function cleanMeetStart(raw: unknown, now: number = Date.now()): Date | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  const at = typeof raw === 'string' && raw.length <= 40 ? new Date(raw).getTime() : NaN
  if (Number.isNaN(at) || at < now - 5 * 60_000 || at > now + 366 * 86_400_000) throw new BadRequestException({ code: 'MEET_INVALID_START', message: MEET_START })
  return new Date(at)
}

export function cleanMeetLobby(raw: unknown): boolean | undefined {
  if (raw === undefined) return undefined
  if (typeof raw !== 'boolean') throw new BadRequestException(MEET_LOBBY)
  return raw
}

/** أرقام الحسابات المدعوة (من غير تكرار)، أو undefined لو الخانة مااتبعتتش */
export function cleanMeetInvites(raw: unknown): number[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw) || raw.length > MEET_MAX_INVITES || !raw.every((id) => Number.isSafeInteger(id) && id > 0)) throw new BadRequestException(MEET_INVITES)
  return [...new Set(raw as number[])]
}

/**
 * B-ADD.22: جمهور الدعوة من منتقي الاستهداف الموحد — undefined لو الخانة مااتبعتتش (الدعوة بالاسم بس)، وإلا نص الجمهور «مين + فين»
 * (null جواه = الشركة كلها: الكائن الفاضي أو { mode: 'all' }). أي شكل تاني (نص، قايمة، أدوار، شروط) مرفوض.
 */
export function cleanMeetAudience(raw: unknown): { text: string | null } | undefined {
  if (raw === undefined || raw === null) return undefined
  return { text: orgAudienceJson(raw, MEET_AUDIENCE_LABEL) }
}

export function cleanMeetUserId(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) <= 0) throw new BadRequestException(MEET_USER)
  return raw as number
}

let ready: boolean | null = null
/** جداول ترحيل 191 موجودة؟ الموجود بيتحفظ */
export async function meetReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.meetings', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.meeting_invites', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.meeting_attendance', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetMeetCache() { ready = null }
