import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { In, type EntityManager } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { CandidateApplication } from './candidate-application.entity'

// B3.3-أ: قواعد تقديم المرشح على وظيفة — فحص وجود ترحيل 105، وتطبيع وسائل التواصل، وفحص التكرار على نفس الوظيفة. دوال بمدير المعاملة بس.

export const CANDIDATE_APPLICATIONS_MIGRATION_MISSING = 'إضافة مرشح على وظيفة شاغرة محتاجة ترحيل 20261008_105 على قاعدة البيانات'
export const CANDIDATE_DUPLICATE = 'فيه مرشح على الوظيفة دي بنفس الموبايل أو البريد أو رقم الهوية'
export const CANDIDATE_ALREADY_APPLIED = 'قدّمت على الوظيفة دي قبل كده'
export const CANDIDATE_JOB_NOT_OPEN = 'الوظيفة مش مفتوحة للمرشحين (لازم تبقى منشورة أو موقوفة)'
export const CANDIDATE_NATIONAL_ID = 'رقم الهوية أو الجواز: من 5 لـ40 حرف أو رقم'
export const CANDIDATE_SOURCE_MAX = 60
export const SOURCE_INTERNAL = 'داخلي'
export const SOURCE_MANUAL = 'يدوي'

let ready: boolean | null = null
/** جدول ترحيل 105 موجود؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function candidateApplicationsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.candidate_applications', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetCandidateApplicationsCache() { ready = null }

/** البريد للمقارنة: من غير مسافات وبحروف صغيرة */
export const normalEmail = (value: unknown): string => (typeof value === 'string' ? value.trim().toLowerCase() : '')
/**
 * الموبايل للمقارنة: الأرقام بس (أي أرقام عربية بتتحوّل)، وآخر 9 أرقام لو الرقم أطول — فمفتاح الدولة والصفر البادئ مابيفرّقوش.
 * أقل من 7 أرقام = مش رقم يتقارن بيه.
 */
export function normalPhone(value: unknown): string {
  if (typeof value !== 'string') return ''
  const digits = value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660)).replace(/\D/g, '')
  if (digits.length < 7) return ''
  return digits.length > 9 ? digits.slice(-9) : digits
}
/** رقم الهوية للمقارنة: من غير مسافات ولا شرطات وبحروف كبيرة */
export const normalNationalId = (value: unknown): string => (typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : '')

/** رقم الهوية المكتوب: اختياري، ولو اتكتب من 5 لـ40 حرف أو رقم */
export function cleanNationalId(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  const value = normalNationalId(raw)
  if (typeof raw !== 'string' || !/^[A-Z0-9]{5,40}$/.test(value)) throw new BadRequestException(CANDIDATE_NATIONAL_ID)
  return value
}

/** المصدر المكتوب: نص قصير، والفاضي = الافتراضي */
export function cleanSource(raw: unknown, fallback: string): string {
  if (raw === undefined || raw === null) return fallback
  if (typeof raw !== 'string') throw new BadRequestException('مصدر المرشح نص')
  const value = raw.replace(/\s+/g, ' ').trim()
  if (value.length > CANDIDATE_SOURCE_MAX) throw new BadRequestException(`مصدر المرشح لا يتجاوز ${CANDIDATE_SOURCE_MAX} حرف`)
  return value || fallback
}

/**
 * B3.3-ب: قراءة ملف سيرة ذاتية (stored_files بتصنيف candidate_cv) — بحكم المرشح نفسه: صلاحية إدارة التوظيف، والمرشح في نطاق فروع
 * الحساب. الملف لازم يكون هو ملف تقديم المرشح ده. برّه النطاق = غير موجود.
 */
export async function assertCandidateCvAccess(em: EntityManager, user: JwtPayload, file: { id: number; entityId?: number | null }): Promise<void> {
  if (!userHasPerm(user, 'candidates.manage')) throw new ForbiddenException('لا تملك صلاحية الاطلاع على هذا الملف')
  const application = (await candidateApplicationsReady(em)) && file.entityId != null
    ? await em.getRepository(CandidateApplication).findOne({ where: { candidateId: file.entityId, cvFileId: file.id } }) : null
  const candidate = application ? await em.getRepository(Candidate).findOne({ where: { id: application.candidateId } }) : null
  if (!candidate || candidate.branchId == null || !inBranchScope(branchScopeOf(user), candidate.branchId)) throw new NotFoundException('الملف غير موجود')
}

export interface ApplicantIdentity { email?: string | null; phone?: string | null; nationalId?: string | null; applicantEmployeeId?: number | null }

/**
 * فحص التكرار على نفس الوظيفة — المتصل ماسك قفل صف الوظيفة (فمفيش تقديمين لنفس الوظيفة بيتفحصوا مع بعض): نفس الموظف المتقدّم،
 * أو نفس الموبايل أو البريد أو رقم الهوية = 409.
 */
export async function assertNotDuplicateOnJob(em: EntityManager, jobId: number, who: ApplicantIdentity): Promise<void> {
  const applications = await em.getRepository(CandidateApplication).find({ where: { jobId } })
  if (!applications.length) return
  if (who.applicantEmployeeId != null && applications.some((row) => row.applicantEmployeeId === who.applicantEmployeeId)) throw new ConflictException(CANDIDATE_ALREADY_APPLIED)
  const email = normalEmail(who.email), phone = normalPhone(who.phone), nationalId = normalNationalId(who.nationalId)
  if (nationalId && applications.some((row) => normalNationalId(row.nationalId) === nationalId)) throw new ConflictException(CANDIDATE_DUPLICATE)
  if (!email && !phone) return
  const candidates = await em.getRepository(Candidate).find({ where: { id: In(applications.map((row) => row.candidateId)) } })
  if (candidates.some((row) => (email && normalEmail(row.email) === email) || (phone && normalPhone(row.phone) === phone))) throw new ConflictException(CANDIDATE_DUPLICATE)
}
