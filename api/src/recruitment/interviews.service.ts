import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { MailService } from '../auth/mail.service'
import { Employee } from '../employees/employee.entity'
import { CandidateApplication } from './candidate-application.entity'
import { candidateApplicationsReady } from './candidate-applications'
import { CandidateInterview, InterviewScorecard, type InterviewStatus } from './interview.entities'
import {
  INTERVIEWS_MIGRATION_MISSING, INTERVIEW_CANDIDATE_CLOSED, INTERVIEW_MODE_LABELS, INTERVIEW_NOT_FOUND, INTERVIEW_NOT_OPEN, INTERVIEW_PANEL_MEMBER, RECOMMENDATION_LABELS,
  SCORECARD_CANCELLED, SCORECARD_NOTES_MAX, SCORECARD_SUBMITTED, cleanDuration, cleanInterviewTime, cleanMode, cleanOptionalText, cleanPanel, cleanRating, cleanRecommendation,
  interviewIcs, interviewsReady, localStamp,
} from './interview-rules'

export interface InterviewInput { candidateId?: unknown; scheduledAt?: unknown; durationMinutes?: unknown; mode?: unknown; location?: unknown; notes?: unknown; interviewerEmployeeIds?: unknown }
export interface ScorecardInput { rating?: unknown; recommendation?: unknown; notes?: unknown }

const ENDED = ['terminated', 'archived']
const CLOSED_STAGES = ['hired', 'rejected']
const STATUS_LABELS: Record<InterviewStatus, string> = { SCHEDULED: 'محددة', DONE: 'تمّت', CANCELLED: 'ملغاة' }
export const INTERVIEWS_NEED_EMPLOYEE = 'حسابك مش مربوط بملف موظف'

// B3.4-ب: المقابلات وبطاقات التقييم. مسؤول التوظيف (candidates.manage، بنطاق فرع المرشح) بيحدد المقابلة ومحاوريها وبيشوف البطاقات المسلّمة؛
// والمحاور (الموظف اللي اسمه في المقابلة) بيشوف مقابلاته وبيسلّم بطاقته مرة واحدة، ومابيشوفش بطاقات غيره قبل ما يسلّم.
@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name)

  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly mail: MailService) {}

  private async assertReady(em: EntityManager) {
    if (!(await interviewsReady(em))) throw new BadRequestException(INTERVIEWS_MIGRATION_MISSING)
  }

  private candidateVisible(user: JwtPayload, candidate: Candidate | null | undefined): candidate is Candidate {
    return !!candidate && (candidate.branchId == null || inBranchScope(branchScopeOf(user), candidate.branchId))
  }

  /** بيانات نموذج تحديد مقابلة: المرشحين المفتوحين في نطاق الحساب، والموظفين الشغالين في نطاقه (محاورين) */
  async formData(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const candidates = (await em.getRepository(Candidate).find({ order: { id: 'DESC' } }))
      .filter((row) => this.candidateVisible(user, row) && !CLOSED_STAGES.includes(row.stage))
    const employees = isEmptyBranchScope(scope) ? [] : await em.getRepository(Employee).find({ where: { isActive: true, ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) }, order: { fullName: 'ASC' } })
    return {
      candidates: candidates.map((row) => ({ id: row.id, fullName: row.fullName, positionTitle: row.positionTitle })),
      interviewers: employees.filter((row) => !ENDED.includes(row.status)).map((row) => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode })),
    }
  }

  /** شكل المقابلة: بطاقاتها بأسماء محاوريها (الاسم بفرع الموظف الحالي في نطاق القارئ، وإلا من غير اسم)، ومحتوى البطاقة لمن له حق */
  private async views(em: EntityManager, user: JwtPayload, rows: CandidateInterview[], cardsFor: 'manager' | 'panelist') {
    if (!rows.length) return []
    const scope = branchScopeOf(user)
    const candidates = new Map((await em.getRepository(Candidate).find({ where: { id: In([...new Set(rows.map((row) => row.candidateId))]) } })).map((row) => [row.id, row]))
    const cards = await em.getRepository(InterviewScorecard).find({ where: { interviewId: In(rows.map((row) => row.id)) }, order: { id: 'ASC' } })
    const employees = new Map((cards.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(cards.map((card) => card.interviewerEmployeeId))]) } }) : []).map((row) => [row.id, row]))
    const cvs = new Map<number, number>()
    if (await candidateApplicationsReady(em)) {
      for (const application of await em.getRepository(CandidateApplication).find({ where: { candidateId: In([...candidates.keys()]) } })) {
        if (application.cvFileId != null) cvs.set(application.candidateId, application.cvFileId)
      }
    }
    return rows.map((row) => {
      const candidate = candidates.get(row.candidateId)
      const own = cards.find((card) => card.interviewId === row.id && card.interviewerEmployeeId === user.employeeId)
      // المحاور بيشوف بطاقات غيره بعد ما يسلّم بطاقته بس؛ ومسؤول التوظيف بيشوف المسلّم
      const mayReadOthers = cardsFor === 'manager' || !!own?.submittedAt
      return {
        id: row.id, candidateId: row.candidateId, candidateName: candidate?.fullName ?? '—', positionTitle: candidate?.positionTitle ?? null,
        scheduledAt: localStamp(row.scheduledAt), durationMinutes: row.durationMinutes, mode: row.mode, modeLabel: INTERVIEW_MODE_LABELS[row.mode] ?? row.mode,
        location: row.location ?? null, notes: row.notes ?? null, status: row.status, statusLabel: STATUS_LABELS[row.status] ?? row.status, cvFileId: cvs.get(row.candidateId) ?? null,
        scorecards: cards.filter((card) => card.interviewId === row.id).map((card) => {
          const employee = employees.get(card.interviewerEmployeeId)
          const mine = card.interviewerEmployeeId === user.employeeId
          const named = mine || (!!employee && inBranchScope(scope, employee.branchId))
          const open = !!card.submittedAt && (mine || mayReadOthers)
          return {
            mine, interviewerName: named ? employee?.fullName ?? null : null, submitted: !!card.submittedAt, submittedAt: card.submittedAt ?? null,
            rating: open ? card.rating : null, recommendation: open ? card.recommendation : null,
            recommendationLabel: open && card.recommendation ? RECOMMENDATION_LABELS[card.recommendation] : null, notes: open ? card.notes ?? null : null,
          }
        }),
      }
    })
  }

  /** مقابلات مرشحين نطاق الحساب (الأقرب موعدًا أولًا) */
  async list(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await interviewsReady(em))) return { available: false, message: INTERVIEWS_MIGRATION_MISSING, interviews: [] }
    const rows = await em.getRepository(CandidateInterview).find({ order: { scheduledAt: 'DESC', id: 'DESC' } })
    if (!rows.length) return { available: true, interviews: [] }
    const candidates = new Map((await em.getRepository(Candidate).find({ where: { id: In([...new Set(rows.map((row) => row.candidateId))]) } })).map((row) => [row.id, row]))
    return { available: true, interviews: await this.views(em, user, rows.filter((row) => this.candidateVisible(user, candidates.get(row.candidateId))), 'manager') }
  }

  /**
   * تحديد مقابلة: القيم برسايلها، وتحت قفل صف المرشح: في نطاق الحساب (وإلا غير موجود)، ومش مُعيَّن ولا مرفوض؛ والمحاورين موظفين شغالين في
   * نطاق فروع الحساب. المقابلة وبطاقاتها الفاضية في معاملة واحدة. الدعوة (.ics) بتتبعت بعد ما المعاملة تثبت — وفشل البريد مابيرجّعش المقابلة.
   */
  async schedule(user: JwtPayload, input: InterviewInput) {
    const candidateId = Number(input.candidateId)
    if (!Number.isSafeInteger(candidateId) || candidateId < 1) throw new NotFoundException('المرشح غير موجود')
    const scheduledAt = cleanInterviewTime(input.scheduledAt), durationMinutes = cleanDuration(input.durationMinutes), mode = cleanMode(input.mode)
    const location = cleanOptionalText(input.location, 300, 'مكان المقابلة'), notes = cleanOptionalText(input.notes, 1000, 'ملاحظات المقابلة'), panel = cleanPanel(input.interviewerEmployeeIds)
    const scope = branchScopeOf(user)
    const made = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const candidate = await em.getRepository(Candidate).findOne({ where: { id: candidateId }, lock: { mode: 'pessimistic_write' } })
      if (!this.candidateVisible(user, candidate)) throw new NotFoundException('المرشح غير موجود')
      if (CLOSED_STAGES.includes(candidate.stage)) throw new BadRequestException(INTERVIEW_CANDIDATE_CLOSED)
      const employees = await em.getRepository(Employee).find({ where: { id: In(panel) } })
      if (employees.length !== panel.length || employees.some((row) => row.isActive === false || ENDED.includes(row.status) || row.branchId == null || !inBranchScope(scope, row.branchId))) {
        throw new BadRequestException(INTERVIEW_PANEL_MEMBER)
      }
      const now = new Date()
      const interview = await em.getRepository(CandidateInterview).save(em.getRepository(CandidateInterview).create({
        candidateId: candidate.id, scheduledAt, durationMinutes, mode, location, notes, status: 'SCHEDULED', createdByUserId: user.sub, createdAt: now, closedAt: null,
      }))
      await em.getRepository(InterviewScorecard).insert(panel.map((interviewerEmployeeId) => ({
        interviewId: interview.id, interviewerEmployeeId, rating: null, recommendation: null, notes: null, submittedAt: null, createdAt: now,
      })))
      return { interview, candidate, employees }
    })
    const invited = await this.sendInvites(made.interview, made.candidate, made.employees, false)
    return { ...(await this.views(this.ds.manager, user, [made.interview], 'manager'))[0], invited }
  }

  /** قفل المقابلة: «تمّت» أو «ملغاة» — تحت قفل صفها، ومن «محددة» بس. الإلغاء بيبعت دعوة إلغاء */
  async close(user: JwtPayload, id: number, rawStatus: unknown) {
    if (rawStatus !== 'DONE' && rawStatus !== 'CANCELLED') throw new BadRequestException('الحالة: DONE أو CANCELLED')
    const closed = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const interview = await em.getRepository(CandidateInterview).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const candidate = interview ? await em.getRepository(Candidate).findOne({ where: { id: interview.candidateId } }) : null
      if (!interview || !this.candidateVisible(user, candidate)) throw new NotFoundException(INTERVIEW_NOT_FOUND)
      if (interview.status !== 'SCHEDULED') throw new BadRequestException(INTERVIEW_NOT_OPEN)
      await em.getRepository(CandidateInterview).update({ id: interview.id }, { status: rawStatus, closedAt: new Date() })
      const cards = rawStatus === 'CANCELLED' ? await em.getRepository(InterviewScorecard).find({ where: { interviewId: interview.id } }) : []
      const employees = cards.length ? await em.getRepository(Employee).find({ where: { id: In(cards.map((card) => card.interviewerEmployeeId)) } }) : []
      return { interview: { ...interview, status: rawStatus as InterviewStatus }, candidate, employees }
    })
    if (rawStatus === 'CANCELLED') await this.sendInvites(closed.interview as CandidateInterview, closed.candidate, closed.employees, true)
    const fresh = await this.ds.getRepository(CandidateInterview).findOneOrFail({ where: { id } })
    return (await this.views(this.ds.manager, user, [fresh], 'manager'))[0]
  }

  private invite(interview: CandidateInterview, candidate: Candidate, cancelled: boolean) {
    return interviewIcs({ id: interview.id, scheduledAt: interview.scheduledAt, durationMinutes: interview.durationMinutes,
      summary: `مقابلة: ${candidate.fullName} — ${candidate.positionTitle}`, location: interview.location ?? null,
      description: `نوع المقابلة: ${INTERVIEW_MODE_LABELS[interview.mode] ?? interview.mode}`, cancelled })
  }

  /** الدعوة بالبريد (لو البريد مضبوط): للمحاورين على بريد عملهم، وللمرشح على بريده. بعد ثبوت المعاملة، وأي فشل بيتسجّل ومابيوقفش */
  private async sendInvites(interview: CandidateInterview, candidate: Candidate, employees: Employee[], cancelled: boolean): Promise<number> {
    if (!this.mail.isConfigured()) return 0
    const when = localStamp(interview.scheduledAt).replace('T', ' ')
    const ics = Buffer.from(this.invite(interview, candidate, cancelled), 'utf8')
    const subject = `${cancelled ? 'إلغاء مقابلة' : 'دعوة مقابلة'}: ${candidate.positionTitle} — ${when}`
    const body = (to: 'panel' | 'candidate') => [
      cancelled ? 'المقابلة دي اتلغت.' : to === 'panel' ? `عندك مقابلة مع المرشح ${candidate.fullName}.` : 'اتحدد لك موعد مقابلة.',
      `الوظيفة: ${candidate.positionTitle}`, `الموعد: ${when} (${interview.durationMinutes} دقيقة)`, `النوع: ${INTERVIEW_MODE_LABELS[interview.mode] ?? interview.mode}`,
      ...(interview.location ? [`المكان أو الرابط: ${interview.location}`] : []),
    ].join('\n')
    const recipients: Array<[string, 'panel' | 'candidate']> = [
      ...employees.filter((row) => !!row.email).map((row) => [row.email, 'panel'] as [string, 'panel']),
      ...(candidate.email ? [[candidate.email, 'candidate'] as [string, 'candidate']] : []),
    ]
    let sent = 0
    for (const [to, kind] of recipients) {
      try {
        await this.mail.send({ to, subject, text: body(kind), attachments: [{ filename: 'interview.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=' + (cancelled ? 'CANCEL' : 'PUBLISH') }] })
        sent++
      } catch (error) {
        this.logger.warn(`دعوة المقابلة ${interview.id} ماتبعتتش لمستلم: ${String((error as Error)?.message ?? error).slice(0, 200)}`)
      }
    }
    return sent
  }

  /** بطاقتي في مقابلة (المحاور نفسه)، بقفل صف البطاقة لو مطلوب */
  private async myCard(em: EntityManager, user: JwtPayload, interviewId: number, lock = false) {
    if (!user.employeeId) throw new ForbiddenException(INTERVIEWS_NEED_EMPLOYEE)
    const card = await em.getRepository(InterviewScorecard).findOne({ where: { interviewId, interviewerEmployeeId: user.employeeId }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!card) throw new NotFoundException(INTERVIEW_NOT_FOUND)
    return card
  }

  /** «مقابلاتي»: المقابلات اللي الموظف محاور فيها (غير الملغاة) — من غير صلاحية: بطاقته هي حقه */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await interviewsReady(em))) return { available: !!user.employeeId, interviews: [] }
    const cards = await em.getRepository(InterviewScorecard).find({ where: { interviewerEmployeeId: user.employeeId } })
    if (!cards.length) return { available: true, interviews: [] }
    const rows = (await em.getRepository(CandidateInterview).find({ where: { id: In(cards.map((card) => card.interviewId)) }, order: { scheduledAt: 'DESC', id: 'DESC' } }))
      .filter((row) => row.status !== 'CANCELLED')
    return { available: true, interviews: await this.views(em, user, rows, 'panelist') }
  }

  /** تسليم البطاقة: مرة واحدة، تحت قفل صفها، والمقابلة مش ملغاة */
  async submit(user: JwtPayload, interviewId: number, input: ScorecardInput) {
    const rating = cleanRating(input.rating), recommendation = cleanRecommendation(input.recommendation)
    const notes = cleanOptionalText(input.notes, SCORECARD_NOTES_MAX, 'ملاحظات البطاقة')
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const card = await this.myCard(em, user, interviewId, true)
      const interview = await em.getRepository(CandidateInterview).findOne({ where: { id: interviewId } })
      if (!interview) throw new NotFoundException(INTERVIEW_NOT_FOUND)
      if (interview.status === 'CANCELLED') throw new BadRequestException(SCORECARD_CANCELLED)
      if (card.submittedAt) throw new ConflictException(SCORECARD_SUBMITTED)
      await em.getRepository(InterviewScorecard).update({ id: card.id }, { rating, recommendation, notes, submittedAt: new Date() })
    })
    const interview = await this.ds.getRepository(CandidateInterview).findOneOrFail({ where: { id: interviewId } })
    return (await this.views(this.ds.manager, user, [interview], 'panelist'))[0]
  }

  /** ملف الدعوة (.ics) — لمسؤول التوظيف في نطاق المرشح، أو لمحاور في المقابلة */
  async ics(user: JwtPayload, id: number): Promise<string> {
    const em = this.ds.manager
    await this.assertReady(em)
    const interview = await em.getRepository(CandidateInterview).findOne({ where: { id } })
    const candidate = interview ? await em.getRepository(Candidate).findOne({ where: { id: interview.candidateId } }) : null
    const manager = userHasPerm(user, 'candidates.manage') && this.candidateVisible(user, candidate)
    const panelist = !!interview && !!user.employeeId && (await em.getRepository(InterviewScorecard).count({ where: { interviewId: interview.id, interviewerEmployeeId: user.employeeId } })) > 0
    if (!interview || !candidate || (!manager && !panelist)) throw new NotFoundException(INTERVIEW_NOT_FOUND)
    return this.invite(interview, candidate, interview.status === 'CANCELLED')
  }
}
