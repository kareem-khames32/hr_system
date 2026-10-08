import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B3.10: مركز خدمات الموارد البشرية على محرك الطلبات — فئة «استفسارات» بأنواعها، وحالة الخدمة من مهمة تنفيذ الطلب، ومهلة أول رد (إعداد)،
// وتقييم الموظف بعد الإقفال.

export const HELPDESK_PERMISSION = 'helpdesk.manage'
export const HELPDESK_CATEGORY = 'inquiries'
/** أنواع الاستفسارات المزروعة (المالك يزوّد غيرها من بانِي الطلبات على نفس الفئة) */
export const HELPDESK_TYPE_CODES = ['INQUIRY_PAYROLL', 'INQUIRY_LEAVES', 'INQUIRY_DATA', 'INQUIRY_GENERAL'] as const
export const HELPDESK_MIGRATION_MISSING = 'تقييم الاستفسارات محتاج ترحيل 20261009_122 على قاعدة البيانات'
export const HELPDESK_NOT_FOUND = 'الاستفسار غير موجود'
export const HELPDESK_RATING = 'التقييم من 1 لـ5'
export const HELPDESK_RATING_STAGE = 'التقييم بعد إقفال الاستفسار'
export const HELPDESK_RATED = 'الاستفسار ده اتقيّم قبل كده'
export const HELPDESK_RANGE = 'الفترة: من يوم ليوم صالحين (النهاية مش قبل البداية، و366 يوم بالكتير)'
/** مهلة أول رد بالساعات (إعداد في requests_config)؛ الغايب أو الغلط = 24 */
export const HELPDESK_FIRST_RESPONSE_KEY = 'helpdesk.first_response_hours'
export const HELPDESK_FIRST_RESPONSE_DEFAULT = 24
/** حالة الخدمة للموظف: من حالة مهمة تنفيذ الطلب */
export const HELPDESK_SERVICE_LABELS: Record<string, string> = { OPEN: 'مفتوح', IN_PROGRESS: 'جاري', WAITING: 'مستني ردّك', DONE: 'اتحل', CANCELLED: 'اتلغى' }

let ready: boolean | null = null
/** جدول ترحيل 122 موجود؟ الموجود بيتحفظ */
export async function helpdeskReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.request_service_ratings', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetHelpdeskCache() { ready = null }

export function cleanHelpdeskRating(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) throw new BadRequestException(HELPDESK_RATING)
  return raw
}

export function cleanHelpdeskComment(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException('التعليق نص')
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > 500) throw new BadRequestException('التعليق لا يتجاوز 500 حرف')
  return value || null
}

export function firstResponseHours(raw: string | null | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 && value <= 720 ? value : HELPDESK_FIRST_RESPONSE_DEFAULT
}

const realDay = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : raw
}
/** فترة التقرير: الغايب = آخر 90 يوم لحد النهارده */
export function cleanHelpdeskRange(rawFrom: unknown, rawTo: unknown, today: string): { from: string; to: string } {
  if ((rawFrom === undefined || rawFrom === '') && (rawTo === undefined || rawTo === '')) {
    return { from: new Date(Date.parse(`${today}T00:00:00Z`) - 89 * 86400000).toISOString().slice(0, 10), to: today }
  }
  const from = realDay(rawFrom), to = realDay(rawTo)
  if (!from || !to || to < from || (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 > 366) throw new BadRequestException(HELPDESK_RANGE)
  return { from, to }
}

/** متوسط بكسر عشري واحد؛ الفاضي = null */
export const average = (values: number[]): number | null => (values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null)
