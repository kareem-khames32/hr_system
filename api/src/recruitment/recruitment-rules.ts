import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { JobTitle } from '../assets/assets.entities'
import type { RecruitmentJobStatus } from './recruitment-job.entity'

// B3.2-أ: قواعد الوظيفة الشاغرة — فحص وجود ترحيل 104، وقيم الوظيفة (المسمى من الكتالوج، العدد، نطاق الراتب، التواريخ والنصوص)، وانتقالات الحالة.

export const RECRUITMENT_JOBS_MIGRATION_MISSING = 'الوظائف الشاغرة محتاجة ترحيل 20261008_104 على قاعدة البيانات'
export const RECRUITMENT_OPENINGS_MAX = 1000
export const RECRUITMENT_TEXT_MAX = 4000
export const RECRUITMENT_REASON_MAX = 500
export const RECRUITMENT_SALARY_MAX = 999_999_999.99
export const RECRUITMENT_TITLE_MISSING = 'المسمى الوظيفي ده مش في كتالوج المسميات — اطلب من الموارد البشرية تضيفه الأول'
export const RECRUITMENT_OPENINGS = `العدد المطلوب رقم صحيح من 1 لـ${RECRUITMENT_OPENINGS_MAX}`
export const RECRUITMENT_SALARY = 'نطاق الراتب: رقمين مش سالبين بخانتين عشريتين بالكتير، و«إلى» مش أقل من «من»'
export const RECRUITMENT_START_DATE = 'تاريخ البدء غير صالح — الصيغة YYYY-MM-DD'
export const RECRUITMENT_JOB_CLOSED = 'الوظيفة مقفولة: مابتتعدّلش ولا بتتفتح تاني — اعمل وظيفة جديدة'
export const RECRUITMENT_PUBLISH_NEEDS = 'النشر محتاج وصف للوظيفة (10 حروف على الأقل) ومكان نشر واحد على الأقل (داخلي أو خارجي)'
export const RECRUITMENT_JOB_STATUS_LABELS: Record<RecruitmentJobStatus, string> = { DRAFT: 'مسودة', PUBLISHED: 'منشورة', PAUSED: 'موقوفة', CLOSED: 'مقفولة' }

let ready: boolean | null = null
/** جدول ترحيل 104 موجود؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function recruitmentJobsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.recruitment_jobs', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetRecruitmentJobsCache() { ready = null }

export const jobCode = (id: number): string => `J-${String(id).padStart(4, '0')}`
export const normalJobTitle = (value: unknown): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

/** المسمى لازم من كتالوج المسميات (النشط) — بيرجّع نصه زي ما هو في الكتالوج */
export async function catalogJobTitle(em: EntityManager, raw: unknown): Promise<string> {
  const title = normalJobTitle(raw)
  const found = title ? (await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { id: 'ASC' } })).find((row) => normalJobTitle(row.title) === title) : undefined
  if (!found) throw new BadRequestException(RECRUITMENT_TITLE_MISSING)
  return normalJobTitle(found.title)
}

/** العدد المطلوب: رقم صحيح (أو نص أرقام) من 1 للحد */
export function cleanOpenings(raw: unknown): number {
  const value = typeof raw === 'string' && /^\d{1,4}$/.test(raw.trim()) ? Number(raw.trim()) : raw
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > RECRUITMENT_OPENINGS_MAX) throw new BadRequestException(RECRUITMENT_OPENINGS)
  return Number(value)
}

const AMOUNT = /^\d{1,9}(\.\d{1,2})?$/
const amountOf = (raw: unknown): string | null | undefined => {
  if (raw === null || raw === undefined || raw === '') return null
  const text = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  return AMOUNT.test(text) && Number(text) <= RECRUITMENT_SALARY_MAX ? Number(text).toFixed(2) : undefined
}
/** نطاق الراتب (اختياري): نصين بخانتين عشريتين، و«إلى» مش أقل من «من». للعرض والمقارنة بس. */
export function cleanSalaryRange(from: unknown, to: unknown): { salaryFrom: string | null; salaryTo: string | null } {
  const salaryFrom = amountOf(from), salaryTo = amountOf(to)
  if (salaryFrom === undefined || salaryTo === undefined || (salaryFrom !== null && salaryTo !== null && Number(salaryTo) < Number(salaryFrom))) {
    throw new BadRequestException(RECRUITMENT_SALARY)
  }
  return { salaryFrom, salaryTo }
}

/** تاريخ تقويمي حقيقي YYYY-MM-DD أو فاضي */
export function cleanStartDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  const text = typeof raw === 'string' ? raw.trim() : ''
  const time = /^\d{4}-\d{2}-\d{2}$/.test(text) ? Date.parse(`${text}T00:00:00Z`) : NaN
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== text) throw new BadRequestException(RECRUITMENT_START_DATE)
  return text
}

/** نص اختياري (السبب، الوصف، المتطلبات): بسطوره، من غير مسافات أطراف، وبحد أقصى */
export function cleanJobText(raw: unknown, max: number, label: string): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (text.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return text || null
}

/** الانتقالات: مسودة ← منشورة، منشورة ↔ موقوفة، وأي حالة غير المقفولة ← مقفولة (نهائية) */
const NEXT: Record<RecruitmentJobStatus, readonly RecruitmentJobStatus[]> = {
  DRAFT: ['PUBLISHED', 'CLOSED'], PUBLISHED: ['PAUSED', 'CLOSED'], PAUSED: ['PUBLISHED', 'CLOSED'], CLOSED: [],
}
export const jobStatusAllowed = (from: RecruitmentJobStatus, to: RecruitmentJobStatus): boolean => NEXT[from]?.includes(to) === true
export const jobStatusRefusal = (from: RecruitmentJobStatus, to: RecruitmentJobStatus): string =>
  from === 'CLOSED' ? RECRUITMENT_JOB_CLOSED : `الوظيفة ${RECRUITMENT_JOB_STATUS_LABELS[from]}: ماتتحوّلش لـ«${RECRUITMENT_JOB_STATUS_LABELS[to] ?? to}»`
/** النشر محتاج وصف ومكان نشر واحد على الأقل */
export const publishable = (job: { description?: string | null; internal?: boolean; external?: boolean }): boolean =>
  (job.description ?? '').trim().length >= 10 && (job.internal === true || job.external === true)
