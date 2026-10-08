import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { createHash, randomBytes } from 'crypto'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Branch } from '../org/entities/branch.entity'
import { CandidateApplication } from './candidate-application.entity'
import { candidateApplicationsReady } from './candidate-applications'
import { AttemptLimiter, CAREERS_TOO_MANY } from './careers'
import { CandidateOffer, type OfferStatus } from './offer.entity'
import { RecruitmentJob } from './recruitment-job.entity'
import { RECRUITMENT_SALARY_MAX, cleanStartDate, recruitmentJobsReady } from './recruitment-rules'

export interface OfferInput { candidateId?: unknown; salary?: unknown; startDate?: unknown; expiresOn?: unknown; notes?: unknown }

export const OFFERS_MIGRATION_MISSING = 'عروض العمل محتاجة ترحيل 20261009_109 على قاعدة البيانات'
export const OFFER_APPROVE_PERMISSION = 'candidates.approve_offers'
export const OFFER_NOT_FOUND = 'العرض غير موجود'
export const OFFER_SALARY = 'الراتب المعروض: رقم أكبر من صفر بخانتين عشريتين بالكتير'
export const OFFER_START_DATE = 'تاريخ البدء مطلوب — الصيغة YYYY-MM-DD'
export const OFFER_EXPIRY = 'آخر يوم للرد غير صالح — الصيغة YYYY-MM-DD، ومش قبل النهارده'
export const OFFER_CANDIDATE_CLOSED = 'المرشح مُعيَّن أو مرفوض — مفيش عرض يتعمل له'
export const OFFER_ALREADY_OPEN = 'المرشح له عرض مفتوح — اسحبه الأول أو كمّل عليه'
export const OFFER_SELF_APPROVAL = 'اللي عمل العرض مايعتمدوش — الاعتماد لحد تاني'
export const OFFER_APPROVE_FORBIDDEN = 'اعتماد العروض محتاج صلاحية اعتماد عروض العمل'
export const OFFER_MANAGE_FORBIDDEN = 'الإجراء ده لمسؤول التوظيف (صلاحية المرشحين والتعيين)'
export const OFFER_LINK_GONE = 'العرض مش متاح للرد (اتسحب، أو اترد عليه، أو مدته خلصت)'
export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  DRAFT: 'مسودة', PENDING: 'مستني الاعتماد', APPROVED: 'معتمد', SENT: 'اتبعت للمرشح', ACCEPTED: 'مقبول', DECLINED: 'مرفوض من المرشح', WITHDRAWN: 'مسحوب',
}
const OPEN: OfferStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'SENT', 'ACCEPTED']
const CLOSED_STAGES = ['hired', 'rejected']

let ready: boolean | null = null
/** جدول ترحيل 109 موجود؟ الموجود بيتحفظ. الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function offersReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.candidate_offers', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetOffersCache() { ready = null }

const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
/** الراتب المعروض: نص بخانتين، أكبر من صفر */
export function cleanOfferSalary(raw: unknown): string {
  const text = typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text) || Number(text) <= 0 || Number(text) > RECRUITMENT_SALARY_MAX) throw new BadRequestException(OFFER_SALARY)
  return Number(text).toFixed(2)
}
export function cleanOfferStart(raw: unknown): string {
  let value: string | null = null
  try { value = cleanStartDate(raw) } catch { value = null }
  if (!value) throw new BadRequestException(OFFER_START_DATE)
  return value
}
export function cleanOfferExpiry(raw: unknown, now: string = today()): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  let value: string | null = null
  try { value = cleanStartDate(raw) } catch { value = null }
  if (!value || value < now) throw new BadRequestException(OFFER_EXPIRY)
  return value
}
function cleanText(raw: unknown, max: number, label: string): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return value || null
}
export const offerTokenHash = (token: string): string => createHash('sha256').update(token, 'utf8').digest('hex')
const dateText = (value: unknown): string | null => (value ? String(value).slice(0, 10) : null)
const amountText = (value: unknown): string => Number(value).toFixed(2)

// B3.5-أ: عرض العمل — مسؤول التوظيف بيعمله ويبعته للاعتماد، وصاحب صلاحية اعتماد العروض (غير اللي عمله) بيعتمده أو يرجّعه، وبعدها بيتبعت
// للمرشح بلينك برمز (بصمته بس اللي متخزنة) يرد منه، أو مسؤول التوظيف يسجّل الرد. كل انتقال تحت قفل صف العرض.
@Injectable()
export class OffersService {
  // الرد من اللينك من غير دخول: 30 محاولة للعنوان و300 للكل في 10 دقايق
  readonly limiter = new AttemptLimiter(30, 300, 10 * 60 * 1000)

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await offersReady(em))) throw new BadRequestException(OFFERS_MIGRATION_MISSING)
  }
  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, 'candidates.manage')) throw new ForbiddenException(OFFER_MANAGE_FORBIDDEN)
  }
  private visible(user: JwtPayload, candidate: Candidate | null | undefined): candidate is Candidate {
    return !!candidate && (candidate.branchId == null || inBranchScope(branchScopeOf(user), candidate.branchId))
  }

  /** نطاق راتب وظيفة العرض (لو المرشح على وظيفة): للتحذير لما الراتب المعروض برّه النطاق */
  private async ranges(em: EntityManager, offers: CandidateOffer[]) {
    const jobIds = [...new Set(offers.map((row) => row.jobId).filter((id): id is number => id != null))]
    return new Map((jobIds.length && (await recruitmentJobsReady(em)) ? await em.getRepository(RecruitmentJob).find({ where: { id: In(jobIds) } }) : []).map((job) => [job.id, job]))
  }

  private async views(em: EntityManager, user: JwtPayload, offers: CandidateOffer[]) {
    if (!offers.length) return []
    const candidates = new Map((await em.getRepository(Candidate).find({ where: { id: In([...new Set(offers.map((row) => row.candidateId))]) } })).map((row) => [row.id, row]))
    const jobs = await this.ranges(em, offers)
    const canApprove = userHasPerm(user, OFFER_APPROVE_PERMISSION)
    return offers.map((row) => {
      const candidate = candidates.get(row.candidateId), job = row.jobId != null ? jobs.get(row.jobId) : undefined
      const salary = Number(row.salary)
      const outOfRange = !!job && ((job.salaryFrom != null && salary < Number(job.salaryFrom)) || (job.salaryTo != null && salary > Number(job.salaryTo)))
      return {
        id: row.id, candidateId: row.candidateId, candidateName: candidate?.fullName ?? '—', positionTitle: candidate?.positionTitle ?? null,
        salary: amountText(row.salary), startDate: dateText(row.startDate), expiresOn: dateText(row.expiresOn), notes: row.notes ?? null,
        status: row.status, statusLabel: OFFER_STATUS_LABELS[row.status] ?? row.status,
        // نطاق راتب الوظيفة والتحذير لما المعروض برّاه (تحذير بس — القرار للمعتمد)
        rangeFrom: job?.salaryFrom != null ? amountText(job.salaryFrom) : null, rangeTo: job?.salaryTo != null ? amountText(job.salaryTo) : null, outOfRange,
        returnReason: row.returnReason ?? null, approvedAt: row.approvedAt ?? null, sentAt: row.sentAt ?? null,
        respondedAt: row.respondedAt ?? null, respondedVia: row.respondedVia ?? null, respondedNote: row.respondedNote ?? null,
        mine: row.createdByUserId === user.sub,
        // اللي عمل العرض مايعتمدوش (غير مدير النظام)
        canApprove: row.status === 'PENDING' && canApprove && (user.role === 'super_admin' || row.createdByUserId !== user.sub),
      }
    })
  }

  async list(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await offersReady(em))) return { available: false, message: OFFERS_MIGRATION_MISSING, canApprove: false, offers: [] }
    const rows = await em.getRepository(CandidateOffer).find({ order: { id: 'DESC' } })
    const candidates = new Map((rows.length ? await em.getRepository(Candidate).find({ where: { id: In([...new Set(rows.map((row) => row.candidateId))]) } }) : []).map((row) => [row.id, row]))
    return { available: true, canApprove: userHasPerm(user, OFFER_APPROVE_PERMISSION), offers: await this.views(em, user, rows.filter((row) => this.visible(user, candidates.get(row.candidateId)))) }
  }

  /** العرض تحت قفل صفه، ومرشحه في نطاق الحساب — وإلا غير موجود */
  private async locked(em: EntityManager, user: JwtPayload, id: number) {
    await this.assertReady(em)
    const offer = await em.getRepository(CandidateOffer).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    const candidate = offer ? await em.getRepository(Candidate).findOne({ where: { id: offer.candidateId } }) : null
    if (!offer || !this.visible(user, candidate)) throw new NotFoundException(OFFER_NOT_FOUND)
    return { offer, candidate }
  }
  private async one(user: JwtPayload, id: number) {
    return (await this.views(this.ds.manager, user, [await this.ds.getRepository(CandidateOffer).findOneOrFail({ where: { id } })]))[0]
  }

  /** عرض جديد (مسودة): تحت قفل صف المرشح — في النطاق، ومش مُعيَّن ولا مرفوض، ومالوش عرض مفتوح */
  async create(user: JwtPayload, input: OfferInput) {
    this.assertManager(user)
    const candidateId = Number(input.candidateId)
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new NotFoundException('المرشح غير موجود')
    const salary = cleanOfferSalary(input.salary), startDate = cleanOfferStart(input.startDate), expiresOn = cleanOfferExpiry(input.expiresOn), notes = cleanText(input.notes, 1000, 'ملاحظات العرض')
    const id = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const candidate = await em.getRepository(Candidate).findOne({ where: { id: candidateId }, lock: { mode: 'pessimistic_write' } })
      if (!this.visible(user, candidate)) throw new NotFoundException('المرشح غير موجود')
      if (CLOSED_STAGES.includes(candidate.stage)) throw new BadRequestException(OFFER_CANDIDATE_CLOSED)
      if (await em.getRepository(CandidateOffer).count({ where: { candidateId: candidate.id, status: In(OPEN) } })) throw new ConflictException(OFFER_ALREADY_OPEN)
      const application = (await candidateApplicationsReady(em)) ? await em.getRepository(CandidateApplication).findOne({ where: { candidateId: candidate.id } }) : null
      const row = await em.getRepository(CandidateOffer).save(em.getRepository(CandidateOffer).create({
        candidateId: candidate.id, jobId: application?.jobId ?? null, salary, startDate, expiresOn, notes, status: 'DRAFT', createdByUserId: user.sub, createdAt: new Date(),
        approvedByUserId: null, approvedAt: null, returnReason: null, tokenHash: null, sentAt: null, respondedAt: null, respondedVia: null, respondedIp: null, respondedAgent: null, respondedNote: null,
      }))
      return row.id
    })
    return this.one(user, id)
  }

  /** تعديل المسودة بس، بالخانات المبعوتة */
  async update(user: JwtPayload, id: number, input: OfferInput) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      const { offer } = await this.locked(em, user, id)
      if (offer.status !== 'DRAFT') throw new BadRequestException('العرض مش مسودة — مابيتعدّلش (اسحبه واعمل عرض جديد)')
      const patch: Partial<CandidateOffer> = {}
      if (input.salary !== undefined) patch.salary = cleanOfferSalary(input.salary)
      if (input.startDate !== undefined) patch.startDate = cleanOfferStart(input.startDate)
      if (input.expiresOn !== undefined) patch.expiresOn = cleanOfferExpiry(input.expiresOn)
      if (input.notes !== undefined) patch.notes = cleanText(input.notes, 1000, 'ملاحظات العرض')
      if (Object.keys(patch).length) await em.getRepository(CandidateOffer).update({ id: offer.id }, patch)
    })
    return this.one(user, id)
  }

  /**
   * انتقال حالة تحت قفل صف العرض: submit (مسودة ← مستني)، approve (مستني ← معتمد: بصلاحية الاعتماد ولغير اللي عمله)، return (مستني ← مسودة بسبب)،
   * send (معتمد ← اتبعت: بيطلّع لينك الرد مرة واحدة)، withdraw (أي حالة غير نهائية ← مسحوب)، record (اتبعت ← مقبول/مرفوض: مسؤول التوظيف بيسجّل الرد).
   */
  async act(user: JwtPayload, id: number, rawAction: unknown, body: { reason?: unknown; answer?: unknown; note?: unknown } = {}) {
    const action = typeof rawAction === 'string' ? rawAction : ''
    if (!['submit', 'approve', 'return', 'send', 'withdraw', 'record'].includes(action)) throw new BadRequestException('إجراء غير صالح')
    if (action !== 'approve' && action !== 'return') this.assertManager(user)
    let token: string | null = null
    await this.ds.transaction(async (em) => {
      const { offer, candidate } = await this.locked(em, user, id)
      const refuse = (): never => { throw new BadRequestException(`العرض «${OFFER_STATUS_LABELS[offer.status]}» — الإجراء ده مش متاح`) }
      const patch: Partial<CandidateOffer> = {}
      if (action === 'submit') {
        if (offer.status !== 'DRAFT') refuse()
        Object.assign(patch, { status: 'PENDING', returnReason: null })
      } else if (action === 'approve' || action === 'return') {
        if (!userHasPerm(user, OFFER_APPROVE_PERMISSION)) throw new ForbiddenException(OFFER_APPROVE_FORBIDDEN)
        if (offer.status !== 'PENDING') refuse()
        if (action === 'approve') {
          if (user.role !== 'super_admin' && offer.createdByUserId === user.sub) throw new ForbiddenException(OFFER_SELF_APPROVAL)
          Object.assign(patch, { status: 'APPROVED', approvedByUserId: user.sub, approvedAt: new Date() })
        } else {
          const reason = cleanText(body.reason, 300, 'سبب الإرجاع')
          if (!reason || reason.length < 3) throw new BadRequestException('سبب الإرجاع مطلوب (3 حروف على الأقل)')
          Object.assign(patch, { status: 'DRAFT', returnReason: reason })
        }
      } else if (action === 'send') {
        if (offer.status !== 'APPROVED') refuse()
        if (offer.expiresOn && String(offer.expiresOn).slice(0, 10) < today()) throw new BadRequestException(OFFER_EXPIRY)
        token = randomBytes(32).toString('hex')
        Object.assign(patch, { status: 'SENT', tokenHash: offerTokenHash(token), sentAt: new Date() })
      } else if (action === 'withdraw') {
        if (!['DRAFT', 'PENDING', 'APPROVED', 'SENT'].includes(offer.status)) refuse()
        Object.assign(patch, { status: 'WITHDRAWN', tokenHash: null })
      } else {
        if (offer.status !== 'SENT') refuse()
        if (body.answer !== 'ACCEPT' && body.answer !== 'DECLINE') throw new BadRequestException('الرد: ACCEPT أو DECLINE')
        Object.assign(patch, { status: body.answer === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', tokenHash: null, respondedAt: new Date(), respondedVia: 'RECRUITER',
          respondedNote: cleanText(body.note, 500, 'ملاحظة الرد') })
      }
      await em.getRepository(CandidateOffer).update({ id: offer.id }, patch)
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_OFFER_STATUS', entityType: 'candidate_offer', entityId: offer.id, actorUserId: user.sub, branchId: candidate.branchId ?? null,
        summary: `عرض العمل ${offer.id} بقى «${OFFER_STATUS_LABELS[patch.status as OfferStatus]}»`, before: { status: offer.status }, after: { status: patch.status } })
    })
    // رمز اللينك بيطلع مرة واحدة مع الإرسال (المتخزّن بصمته)
    return { ...(await this.one(user, id)), ...(token ? { linkToken: token } : {}) }
  }

  // ===== لينك الرد (من غير دخول) =====

  private async byToken(em: EntityManager, rawToken: unknown, lock = false): Promise<CandidateOffer> {
    const token = typeof rawToken === 'string' && /^[a-f0-9]{64}$/.test(rawToken) ? rawToken : null
    const offer = token && (await offersReady(em))
      ? await em.getRepository(CandidateOffer).findOne({ where: { tokenHash: offerTokenHash(token) }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) }) : null
    if (!offer || offer.status !== 'SENT' || (offer.expiresOn && String(offer.expiresOn).slice(0, 10) < today())) throw new NotFoundException(OFFER_LINK_GONE)
    return offer
  }

  /** اللي المرشح بيشوفه من لينكه: الوظيفة والفرع والراتب وتاريخ البدء وآخر يوم للرد */
  async publicView(rawToken: unknown, clientKey: string) {
    if (!this.limiter.take(clientKey || 'unknown')) throw new HttpException(CAREERS_TOO_MANY, HttpStatus.TOO_MANY_REQUESTS)
    const em = this.ds.manager
    const offer = await this.byToken(em, rawToken)
    const candidate = await em.getRepository(Candidate).findOne({ where: { id: offer.candidateId } })
    const branch = candidate?.branchId != null ? await em.getRepository(Branch).findOne({ where: { id: candidate.branchId } }) : null
    return { candidateName: candidate?.fullName ?? '', positionTitle: candidate?.positionTitle ?? '', branchName: branch?.name ?? null,
      salary: amountText(offer.salary), startDate: dateText(offer.startDate), expiresOn: dateText(offer.expiresOn) }
  }

  /** رد المرشح من لينكه: مرة واحدة، تحت قفل صف العرض، وبدليله (الوقت والعنوان والمتصفح). بعد الرد اللينك مابيشتغلش */
  async publicAnswer(rawToken: unknown, body: { answer?: unknown; note?: unknown }, evidence: { ip: string; agent?: string }) {
    if (!this.limiter.take(evidence.ip || 'unknown')) throw new HttpException(CAREERS_TOO_MANY, HttpStatus.TOO_MANY_REQUESTS)
    if (body.answer !== 'ACCEPT' && body.answer !== 'DECLINE') throw new BadRequestException('الرد: ACCEPT أو DECLINE')
    const note = cleanText(body.note, 500, 'ملاحظة الرد')
    const status: OfferStatus = body.answer === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'
    await this.ds.transaction(async (em) => {
      const offer = await this.byToken(em, rawToken, true)
      const candidate = await em.getRepository(Candidate).findOne({ where: { id: offer.candidateId } })
      await em.getRepository(CandidateOffer).update({ id: offer.id }, { status, tokenHash: null, respondedAt: new Date(), respondedVia: 'LINK',
        respondedIp: String(evidence.ip ?? '').slice(0, 64) || null, respondedAgent: String(evidence.agent ?? '').slice(0, 300) || null, respondedNote: note })
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_OFFER_ANSWERED', entityType: 'candidate_offer', entityId: offer.id, actorUserId: null, branchId: candidate?.branchId ?? null,
        summary: `المرشح ${status === 'ACCEPTED' ? 'قبل' : 'رفض'} عرض العمل ${offer.id} من اللينك`, before: { status: 'SENT' }, after: { status } })
    })
    return { answered: true, status }
  }
}
