import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { INTERVIEW_MODES, INTERVIEW_RECOMMENDATIONS, type InterviewMode, type InterviewRecommendation } from './interview.entities'

// B3.4-ب: قواعد المقابلات وبطاقات التقييم — فحص وجود ترحيلي 107 و108، وقيم المقابلة والبطاقة، وملف الدعوة (.ics). من غير قاعدة بيانات غير فحص الجداول.

export const INTERVIEWS_MIGRATION_MISSING = 'المقابلات محتاجة ترحيلي 20261008_107 و20261008_108 على قاعدة البيانات'
export const INTERVIEW_NOT_FOUND = 'المقابلة غير موجودة'
export const INTERVIEW_TIME = 'موعد المقابلة غير صالح — الصيغة YYYY-MM-DDTHH:mm، ومش قبل النهارده'
export const INTERVIEW_DURATION = 'مدة المقابلة بالدقايق: من 15 لـ480'
export const INTERVIEW_MODE = 'نوع المقابلة: حضوري أو فيديو أو تليفون'
export const INTERVIEW_PANEL = 'اختار محاورين (من 1 لـ8) من غير تكرار'
export const INTERVIEW_PANEL_MEMBER = 'محاور مش موجود أو مش في نطاق فروعك أو ملفه مش شغال'
export const INTERVIEW_CANDIDATE_CLOSED = 'المرشح مُعيَّن أو مرفوض — مفيش مقابلة تتحدد له'
export const INTERVIEW_NOT_OPEN = 'المقابلة مش «محددة» — اتقفلت أو اتلغت قبل كده'
export const SCORECARD_RATING = 'التقييم من 1 لـ5'
export const SCORECARD_RECOMMENDATION = 'التوصية: مناسب أو محتمل أو غير مناسب'
export const SCORECARD_NOTES_MAX = 2000
export const SCORECARD_SUBMITTED = 'البطاقة اتسلّمت قبل كده — مابتتعدّلش'
export const SCORECARD_CANCELLED = 'المقابلة اتلغت — مفيش بطاقة تتسلّم'
export const INTERVIEW_PANEL_MAX = 8
export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = { ONSITE: 'حضوري', VIDEO: 'فيديو', PHONE: 'تليفون' }
export const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = { YES: 'مناسب', MAYBE: 'محتمل', NO: 'غير مناسب' }

let ready: boolean | null = null
/** جدولي ترحيلي 107 و108 موجودين؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيلين يتطبقوا. */
export async function interviewsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(
    `SELECT CASE WHEN OBJECT_ID(N'dbo.candidate_interviews', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.interview_scorecards', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetInterviewsCache() { ready = null }

const two = (value: number) => String(value).padStart(2, '0')
/** التاريخ بساعة التطبيق كنص YYYY-MM-DDTHH:mm (من غير منطقة زمنية — زي ما اتكتب) */
export const localStamp = (date: Date): string =>
  `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`

/** موعد المقابلة: نص YYYY-MM-DDTHH:mm بساعة التطبيق، تاريخ حقيقي، ومش قبل أول النهارده */
export function cleanInterviewTime(raw: unknown, now: Date = new Date()): Date {
  const match = typeof raw === 'string' ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw.trim()) : null
  if (!match) throw new BadRequestException(INTERVIEW_TIME)
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && date.getHours() === hour && date.getMinutes() === minute
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!real || date.getTime() < today.getTime()) throw new BadRequestException(INTERVIEW_TIME)
  return date
}
export function cleanDuration(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 15 || (raw as number) > 480) throw new BadRequestException(INTERVIEW_DURATION)
  return raw as number
}
export function cleanMode(raw: unknown): InterviewMode {
  if (typeof raw !== 'string' || !(INTERVIEW_MODES as readonly string[]).includes(raw)) throw new BadRequestException(INTERVIEW_MODE)
  return raw as InterviewMode
}
/** نص اختياري (المكان، الملاحظات): سطوره زي ما هي، ولحد طول */
export function cleanOptionalText(raw: unknown, max: number, label: string): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return value || null
}
/** المحاورين: أرقام موظفين صحيحة من غير تكرار */
export function cleanPanel(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > INTERVIEW_PANEL_MAX || raw.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(raw).size !== raw.length) {
    throw new BadRequestException(INTERVIEW_PANEL)
  }
  return [...(raw as number[])].sort((a, b) => a - b)
}
export function cleanRating(raw: unknown): number {
  if (!Number.isSafeInteger(raw) || (raw as number) < 1 || (raw as number) > 5) throw new BadRequestException(SCORECARD_RATING)
  return raw as number
}
export function cleanRecommendation(raw: unknown): InterviewRecommendation {
  if (typeof raw !== 'string' || !(INTERVIEW_RECOMMENDATIONS as readonly string[]).includes(raw)) throw new BadRequestException(SCORECARD_RECOMMENDATION)
  return raw as InterviewRecommendation
}

// ===== ملف الدعوة (.ics) =====
const icsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
const icsStamp = (date: Date) => `${date.getFullYear()}${two(date.getMonth() + 1)}${two(date.getDate())}T${two(date.getHours())}${two(date.getMinutes())}00`
const icsUtc = (date: Date) => `${date.getUTCFullYear()}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}T${two(date.getUTCHours())}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}Z`
/** سطر iCalendar بيتكسر على 75 بايت (RFC 5545): السطر التكميلي بيبدأ بمسافة */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let start = 0, limit = 75
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length)
    // مابنقطعش في نص حرف متعدد البايتات
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--
    parts.push(bytes.subarray(start, end).toString('utf8'))
    start = end; limit = 74
  }
  return parts.join('\r\n ')
}
export interface InterviewInvite { id: number; scheduledAt: Date; durationMinutes: number; summary: string; location: string | null; description: string | null; cancelled?: boolean; stampedAt?: Date }

/**
 * دعوة تقويم بسيطة (VEVENT واحد) بالوقت «العائم» — ساعة التطبيق زي ما اتكتبت، من غير منطقة زمنية: برنامج التقويم بيعرضها بنفس الساعة.
 * UID ثابت للمقابلة (تحديثها أو إلغاؤها بنفس المعرّف).
 */
export function interviewIcs(invite: InterviewInvite): string {
  const end = new Date(invite.scheduledAt.getTime() + invite.durationMinutes * 60_000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HR System//Interviews//AR', 'CALSCALE:GREGORIAN', `METHOD:${invite.cancelled ? 'CANCEL' : 'PUBLISH'}`,
    'BEGIN:VEVENT', `UID:interview-${invite.id}@hr-system`, `DTSTAMP:${icsUtc(invite.stampedAt ?? new Date())}`,
    `DTSTART:${icsStamp(invite.scheduledAt)}`, `DTEND:${icsStamp(end)}`, `SUMMARY:${icsText(invite.summary)}`,
    ...(invite.location ? [`LOCATION:${icsText(invite.location)}`] : []), ...(invite.description ? [`DESCRIPTION:${icsText(invite.description)}`] : []),
    `STATUS:${invite.cancelled ? 'CANCELLED' : 'CONFIRMED'}`, `SEQUENCE:${invite.cancelled ? 1 : 0}`, 'END:VEVENT', 'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
