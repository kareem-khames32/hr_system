import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { normalizeWorkExtension } from '../employees/employee-work-extension'
import { cleanMeetUserId } from './meet-rules'

// B-ADD.23: الاتصال من جوه النظام — مكالمة بين اتنين على نفس خادم الاجتماعات (من غير سنترال ولا SIP ولا أرقام تليفونات).
// القواعد هنا من غير قاعدة: حالة المكالمة من أوقاتها (مفيش مهمة مجدولة: «ماردّش» بتطلع من الوقت)، وقيم الطلب، والرسايل.

/** المكالمة بترن المدة دي من لحظة الاتصال — بعدها «ماردّش» */
export const CALL_RING_MS = 45_000
/** مكالمة محدش قفلها بتتحسب منتهية بعد الرد عليها بالمدة دي */
export const CALL_MAX_MS = 12 * 60 * 60_000
/** بعد الرد بالمدة دي، مكالمة غرفتها فاضية على خادم الاجتماعات = انتهت (الطرفين قفلوا من غير «اقفل») */
export const CALL_CONNECT_GRACE_MS = 30_000
/** «آخر المكالمات»: آخر كام يوم، وكام مكالمة */
export const CALL_LOG_DAYS = 60
export const CALL_LOG_MAX = 100

export const CALL_MIGRATION_MISSING = 'الاتصال محتاج ترحيل 20261012_198 على قاعدة البيانات'
export const CALL_EXTENSION_MIGRATION = 'الاتصال برقم التحويلة محتاج ترحيل 188 (خانة رقم التحويلة) — اتصل بالاسم لحد ما يتطبق'
export const CALL_TARGET = 'اكتب رقم التحويلة أو اختار الشخص بالاسم'
export const CALL_NOBODY = 'مفيش حد بالتحويلة دي'
export const CALL_USER = 'الشخص ده مش موجود'
export const CALL_YOURSELF = 'مينفعش تتصل بنفسك'
export const CALL_BUSY = 'مشغول دلوقتي في مكالمة تانية — جرّب بعد شوية'
export const CALL_SELF_BUSY = 'عندك مكالمة دلوقتي — اقفلها أو رد عليها الأول'
export const CALL_NOT_FOUND = 'المكالمة غير موجودة'
export const CALL_OVER = 'المكالمة دي انتهت'
export const CALL_CALLEE_ONLY = 'الرد للي بيتّصلوا بيه بس'
export const CALL_NOT_ANSWERED = 'المكالمة لسه ماتردّش عليها'

/** بترن ← (رد) شغالة ← اتردّ عليها وانتهت؛ أو فايتة (محدش رد، أو المتصل قفل قبل الرد)؛ أو مرفوضة */
export type CallState = 'ringing' | 'active' | 'answered' | 'missed' | 'rejected'

export interface CallTimes { startedAt: Date; answeredAt: Date | null; endedAt: Date | null; rejected: boolean }

const at = (value: Date) => new Date(value).getTime()

/** الحالة من الأوقات */
export function callStateOf(call: CallTimes, now: number = Date.now(), ringMs: number = CALL_RING_MS): CallState {
  if (call.rejected) return 'rejected'
  if (call.answeredAt) return call.endedAt || now - at(call.answeredAt) > CALL_MAX_MS ? 'answered' : 'active'
  if (call.endedAt) return 'missed'
  return now - at(call.startedAt) <= ringMs ? 'ringing' : 'missed'
}

/** مدة المكالمة بالثواني (اللي اتردّ عليها وانتهت بس) */
export function callDurationSeconds(call: CallTimes): number | null {
  if (!call.answeredAt || !call.endedAt || call.rejected) return null
  return Math.max(0, Math.round((at(call.endedAt) - at(call.answeredAt)) / 1000))
}

/** المطلوب: رقم تحويلة (أرقام بس، والعربي بيتحوّل — نفس قاعدة خانة الموظف) أو حساب بالاسم؛ واحد منهم بالظبط */
export function cleanCallTarget(input: { extension?: unknown; userId?: unknown } | null | undefined): { extension: string } | { userId: number } {
  const hasExtension = input?.extension !== undefined && input.extension !== null && String(input.extension).trim() !== ''
  const hasUser = input?.userId !== undefined && input.userId !== null
  if (hasExtension === hasUser) throw new BadRequestException(CALL_TARGET)
  if (hasUser) return { userId: cleanMeetUserId(input!.userId) }
  return { extension: normalizeWorkExtension(input!.extension) as string }
}

let ready: boolean | null = null
/** جدول ترحيل 198 موجود؟ الموجود بيتحفظ */
export async function callsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.meet_calls', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}

let extensions: boolean | null = null
/** خانة رقم التحويلة (ترحيل 188) موجودة؟ الموجود بيتحفظ */
export async function extensionsReady(em: EntityManager): Promise<boolean> {
  if (extensions === true) return true
  const [row] = await em.query(`SELECT CASE WHEN COL_LENGTH(N'dbo.employees', N'workExtension') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  extensions = Number(row?.ready) === 1
  return extensions
}
/** للاختبارات: نسيان حالة الترحيلين */
export function resetCallsCache() { ready = null; extensions = null }
