import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import {
  TRAINING_COURSE_KINDS, TRAINING_ENROLLMENT_STATUSES, TRAINING_SESSION_STATUSES, type TrainingCourseKind, type TrainingEnrollmentStatus, type TrainingSessionStatus,
} from './training.entities'

// B3.9: قواعد التدريب — فحص وجود ترحيلات 117–119، وقيم الدورة والجلسة، وانتقالات حالة التسجيل، وتاريخ انتهاء الشهادة.

export const TRAINING_PERMISSION = 'training.manage'
export const TRAINING_MIGRATION_MISSING = 'التدريب محتاج ترحيلات 20261009_117 لـ20261009_119 على قاعدة البيانات'
export const TRAINING_COURSE_NOT_FOUND = 'الدورة غير موجودة'
export const TRAINING_SESSION_NOT_FOUND = 'الجلسة غير موجودة'
export const TRAINING_ENROLLMENT_NOT_FOUND = 'التسجيل غير موجود'
export const TRAINING_NAME = 'اسم الدورة مطلوب (من 3 لـ200 حرف)'
export const TRAINING_KIND = 'نوع الدورة: داخلي أو خارجي أو أونلاين'
export const TRAINING_URL = 'رابط الدورة يبدأ بـhttp:// أو https:// ولا يتجاوز 500 حرف — ومطلوب للدورة الأونلاين'
export const TRAINING_DURATION = 'مدة الدورة بالساعات: من 0.5 لـ9999 (بكسرين عشريين بالكتير)'
export const TRAINING_VALID_MONTHS = 'صلاحية الشهادة بالشهور: من 1 لـ120، أو فاضية (من غير انتهاء) — وللدورة اللي بتطلّع شهادة بس'
export const TRAINING_DATES = 'تاريخ الجلسة: من يوم ليوم صالحين (النهاية مش قبل البداية)'
export const TRAINING_CAPACITY = 'سعة الجلسة: من 1 لـ10000، أو فاضية (من غير حد)'
export const TRAINING_COST = 'تكلفة المقعد: رقم من 0 (بكسرين عشريين بالكتير)، أو فاضية'
export const TRAINING_SESSION_STATUS = 'حالة الجلسة: مجدولة أو اتعملت أو اتلغت'
export const TRAINING_SESSION_CLOSED = 'الجلسة اتلغت — مفيش تسجيل ولا تعديل عليها'
export const TRAINING_FULL = 'الجلسة مافيهاش أماكن كفاية'
export const TRAINING_MARK = 'حالة التسجيل: حضر أو أكمل أو غاب أو اتلغى'
export const TRAINING_MARK_FINAL = 'التسجيل ده اتقفل (أكمل أو اتلغى) — مابيتغيّرش'
export const TRAINING_RATING = 'التقييم من 1 لـ5'
export const TRAINING_RATING_STAGE = 'تقييم التدريب بعد الحضور أو الإكمال، ومرة واحدة'
export const TRAINING_CERT_CODE = 'TRAINING_CERT'
export const TRAINING_CERT_NAME = 'شهادة تدريب'
export const TRAINING_KIND_LABELS: Record<TrainingCourseKind, string> = { INTERNAL: 'داخلي', EXTERNAL: 'خارجي', ONLINE: 'أونلاين' }
export const TRAINING_SESSION_STATUS_LABELS: Record<TrainingSessionStatus, string> = { PLANNED: 'مجدولة', DONE: 'اتعملت', CANCELLED: 'اتلغت' }
export const TRAINING_ENROLLMENT_STATUS_LABELS: Record<TrainingEnrollmentStatus, string> = { ENROLLED: 'مسجّل', ATTENDED: 'حضر', COMPLETED: 'أكمل', ABSENT: 'غاب', CANCELLED: 'اتلغى' }
/** التسجيل اللي حاجز مكان في الجلسة */
export const TRAINING_SEAT_STATUSES: TrainingEnrollmentStatus[] = ['ENROLLED', 'ATTENDED', 'COMPLETED']

let ready: boolean | null = null
/** جداول ترحيلات 117–119 موجودة؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيلات تتطبق. */
export async function trainingReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.training_courses', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.training_sessions', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.training_enrollments', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetTrainingCache() { ready = null }

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')

export function cleanTrainingName(raw: unknown): string {
  const value = line(raw)
  if (value.length < 3 || value.length > 200) throw new BadRequestException(TRAINING_NAME)
  return value
}

export function cleanTrainingKind(raw: unknown): TrainingCourseKind {
  if (typeof raw !== 'string' || !(TRAINING_COURSE_KINDS as readonly string[]).includes(raw)) throw new BadRequestException(TRAINING_KIND)
  return raw as TrainingCourseKind
}

/** نص اختياري بحد أقصى؛ الفاضي = null */
export function cleanTrainingText(raw: unknown, max: number, label: string): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return value || null
}

export function cleanTrainingUrl(raw: unknown, kind: TrainingCourseKind): string | null {
  const value = raw === undefined || raw === null ? '' : typeof raw === 'string' ? raw.trim() : null
  if (value === null || value.length > 500 || (value && !/^https?:\/\/[^\s]+$/i.test(value)) || (!value && kind === 'ONLINE')) throw new BadRequestException(TRAINING_URL)
  return value || null
}

const decimal = (raw: unknown, max: number, message: string, min = 0): string | null => {
  if (raw === undefined || raw === null || raw === '') return null
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,12}(\.\d{1,2})?$/.test(raw.trim()) ? Number(raw.trim()) : NaN
  if (!Number.isFinite(value) || value < min || value > max || Math.abs(Math.round(value * 100) - value * 100) > 1e-6) throw new BadRequestException(message)
  return value.toFixed(2)
}
export const cleanTrainingDuration = (raw: unknown): string | null => decimal(raw, 9999, TRAINING_DURATION, 0.5)
export const cleanTrainingCost = (raw: unknown): string | null => decimal(raw, 999_999_999_999.99, TRAINING_COST)

const whole = (raw: unknown, min: number, max: number, message: string): number | null => {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) throw new BadRequestException(message)
  return raw
}
export function cleanValidMonths(raw: unknown, givesCertificate: boolean): number | null {
  const value = whole(raw, 1, 120, TRAINING_VALID_MONTHS)
  if (value !== null && !givesCertificate) throw new BadRequestException(TRAINING_VALID_MONTHS)
  return value
}
export const cleanTrainingCapacity = (raw: unknown): number | null => whole(raw, 1, 10000, TRAINING_CAPACITY)

const realDay = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : raw
}
export function cleanTrainingDates(rawStart: unknown, rawEnd: unknown): { startDate: string; endDate: string } {
  const startDate = realDay(rawStart), endDate = realDay(rawEnd)
  if (!startDate || !endDate || endDate < startDate) throw new BadRequestException(TRAINING_DATES)
  return { startDate, endDate }
}

export function cleanSessionStatus(raw: unknown): TrainingSessionStatus {
  if (typeof raw !== 'string' || !(TRAINING_SESSION_STATUSES as readonly string[]).includes(raw)) throw new BadRequestException(TRAINING_SESSION_STATUS)
  return raw as TrainingSessionStatus
}

/** الحالة الجديدة لتسجيل: من «مسجّل» أو «حضر» لـ«حضر» أو «أكمل» أو «غاب» أو «اتلغى» */
export function cleanEnrollmentMark(raw: unknown): Exclude<TrainingEnrollmentStatus, 'ENROLLED'> {
  if (typeof raw !== 'string' || raw === 'ENROLLED' || !(TRAINING_ENROLLMENT_STATUSES as readonly string[]).includes(raw)) throw new BadRequestException(TRAINING_MARK)
  return raw as Exclude<TrainingEnrollmentStatus, 'ENROLLED'>
}
export const enrollmentOpen = (status: TrainingEnrollmentStatus): boolean => status === 'ENROLLED' || status === 'ATTENDED' || status === 'ABSENT'

export function cleanTrainingRating(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) throw new BadRequestException(TRAINING_RATING)
  return raw
}

/** تاريخ انتهاء الشهادة: تاريخ الإصدار + شهور الصلاحية (آخر يوم في الشهر لو اليوم مش موجود)؛ من غير صلاحية = null */
export function certificateExpiry(issueDate: string, validMonths: number | null): string | null {
  if (!validMonths) return null
  const [year, month, dayOfMonth] = issueDate.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1 + validMonths, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(dayOfMonth, last))).toISOString().slice(0, 10)
}
