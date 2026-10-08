import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { Candidate } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Department } from '../org/entities/department.entity'
import { CandidateApplication } from './candidate-application.entity'
import {
  CANDIDATE_APPLICATIONS_MIGRATION_MISSING, CANDIDATE_JOB_NOT_OPEN, SOURCE_INTERNAL, SOURCE_MANUAL, assertNotDuplicateOnJob, candidateApplicationsReady, cleanNationalId, cleanSource,
} from './candidate-applications'
import { CandidateOffer } from './offer.entity'
import { RecruitmentJob } from './recruitment-job.entity'
import { RECRUITMENT_JOB_STATUS_LABELS, jobCode, recruitmentJobsReady } from './recruitment-rules'

export interface CandidateOnJobInput { jobId: number; fullName: string; email?: string; phone?: string; notes?: string; source?: unknown; nationalId?: unknown }

export const OPENING_NOT_FOUND = 'الوظيفة غير موجودة'
export const OPENINGS_NEED_EMPLOYEE = 'حسابك مش مربوط بملف موظف — التقديم الداخلي للموظفين'
const NOTE_MAX = 1000
const ENDED = ['terminated', 'archived']

// B3.3-أ: المرشح على وظيفة شاغرة — إضافة مسؤول التوظيف، والتقديم الداخلي من البوابة، ومعلومات الوظيفة في قايمة المرشحين.
@Injectable()
export class CandidateApplicationsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await recruitmentJobsReady(em)) || !(await candidateApplicationsReady(em))) throw new BadRequestException(CANDIDATE_APPLICATIONS_MIGRATION_MISSING)
  }

  /**
   * إضافة مرشح على وظيفة (مسؤول التوظيف): الوظيفة في نطاق فروع الحساب وإلا غير موجودة؛ وتحت قفل صفها: حالتها منشورة أو موقوفة،
   * وفحص التكرار. المسمى والفرع من الوظيفة نفسها.
   */
  async createOnJob(user: JwtPayload, input: CandidateOnJobInput): Promise<Candidate> {
    const nationalId = cleanNationalId(input.nationalId), source = cleanSource(input.source, SOURCE_MANUAL)
    return this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const job = await em.getRepository(RecruitmentJob).findOne({ where: { id: input.jobId }, lock: { mode: 'pessimistic_write' } })
      if (!job || !inBranchScope(branchScopeOf(user), job.branchId)) throw new NotFoundException(OPENING_NOT_FOUND)
      if (job.status !== 'PUBLISHED' && job.status !== 'PAUSED') throw new BadRequestException(CANDIDATE_JOB_NOT_OPEN)
      await assertNotDuplicateOnJob(em, job.id, { email: input.email, phone: input.phone, nationalId })
      const candidates = em.getRepository(Candidate)
      const candidate = await candidates.save(candidates.create({
        fullName: input.fullName, email: input.email, phone: input.phone, notes: input.notes, positionTitle: job.title, branchId: job.branchId,
      }))
      await em.getRepository(CandidateApplication).insert({
        candidateId: candidate.id, jobId: job.id, source, nationalId, applicantEmployeeId: null, cvFileId: null, consentAt: null, createdAt: new Date(),
      })
      return candidate
    })
  }

  /** وظيفة كل مرشح ومصدره لقايمة المرشحين (المرشح من غير وظيفة = null). الوظيفة بتتعرض لو لسه في نطاق فروع الحساب */
  async attach<T extends { id: number }>(user: JwtPayload, rows: T[]) {
    const withJobs = await this.attachApplications(user, rows)
    const accepted = await this.acceptedOffers(this.ds.manager, rows.map((row) => row.id))
    // B3.5-ب: العرض المقبول (الراتب وتاريخ البدء) — نموذج التعيين بيتعبّى منه، والموارد البشرية بتراجعه قبل الحفظ
    return withJobs.map((row) => ({ ...row, acceptedOffer: accepted.get(row.id) ?? null }))
  }

  /** آخر عرض مقبول لكل مرشح (قبل ترحيل 109: ولا واحد) */
  private async acceptedOffers(em: EntityManager, candidateIds: number[]): Promise<Map<number, { salary: string; startDate: string | null }>> {
    const [table] = candidateIds.length ? await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.candidate_offers', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`) : [{ ready: 0 }]
    if (Number(table?.ready) !== 1) return new Map()
    const offers = await em.getRepository(CandidateOffer).find({ where: { candidateId: In(candidateIds), status: 'ACCEPTED' }, order: { id: 'ASC' } })
    return new Map(offers.map((offer) => [offer.candidateId, { salary: Number(offer.salary).toFixed(2), startDate: offer.startDate ? String(offer.startDate).slice(0, 10) : null }]))
  }

  /**
   * B3.5-ب: بعد تعيين مرشح على وظيفة شاغرة — تحت قفل صف الوظيفة: لو عدد المُعيَّنين عليها وصل العدد المطلوب والوظيفة لسه مفتوحة، بتتقفل
   * (بسطر تدقيق). باقي المرشحين عليها بيفضلوا في مراحلهم (مسؤول التوظيف بينقلهم).
   */
  async afterHire(user: JwtPayload, candidateId: number): Promise<{ jobClosed: boolean }> {
    return this.ds.transaction(async (em) => {
      if (!(await recruitmentJobsReady(em)) || !(await candidateApplicationsReady(em))) return { jobClosed: false }
      const application = await em.getRepository(CandidateApplication).findOne({ where: { candidateId } })
      const job = application ? await em.getRepository(RecruitmentJob).findOne({ where: { id: application.jobId }, lock: { mode: 'pessimistic_write' } }) : null
      if (!job || job.status === 'CLOSED') return { jobClosed: false }
      const onJob = await em.getRepository(CandidateApplication).find({ where: { jobId: job.id } })
      const hired = await em.getRepository(Candidate).count({ where: { id: In(onJob.map((row) => row.candidateId)), stage: 'hired' } })
      if (hired < job.openings) return { jobClosed: false }
      await em.getRepository(RecruitmentJob).update({ id: job.id }, { status: 'CLOSED', closedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_JOB_STATUS', entityType: 'recruitment_job', entityId: job.id, actorUserId: user.sub, branchId: job.branchId,
        summary: `الوظيفة الشاغرة ${jobCode(job.id)} بقت «${RECRUITMENT_JOB_STATUS_LABELS.CLOSED}» — العدد المطلوب (${job.openings}) اكتمل بالتعيين`,
        before: { status: job.status }, after: { status: 'CLOSED', hired } })
      return { jobClosed: true }
    })
  }

  private async attachApplications<T extends { id: number }>(user: JwtPayload, rows: T[]) {
    const em = this.ds.manager
    const empty = () => rows.map((row) => ({ ...row, application: null as null | { jobId: number; jobCode: string; source: string | null; nationalId: string | null; internal: boolean; cvFileId: number | null; consentAt: Date | null } }))
    if (!rows.length || !(await recruitmentJobsReady(em)) || !(await candidateApplicationsReady(em))) return empty()
    const applications = await em.getRepository(CandidateApplication).find({ where: { candidateId: In(rows.map((row) => row.id)) } })
    if (!applications.length) return empty()
    const scope = branchScopeOf(user)
    const jobs = new Map((await em.getRepository(RecruitmentJob).find({ where: { id: In([...new Set(applications.map((row) => row.jobId))]) } }))
      .filter((job) => inBranchScope(scope, job.branchId)).map((job) => [job.id, job]))
    const byCandidate = new Map(applications.map((row) => [row.candidateId, row]))
    return rows.map((row) => {
      const application = byCandidate.get(row.id)
      return {
        ...row,
        application: application && jobs.has(application.jobId)
          ? { jobId: application.jobId, jobCode: jobCode(application.jobId), source: application.source ?? null, nationalId: application.nationalId ?? null, internal: application.applicantEmployeeId != null,
              // B3.3-ب: ملف السيرة الذاتية (بيتفتح من /files/:id بحكم المرشح) وتاريخ موافقة البيانات
              cvFileId: application.cvFileId ?? null, consentAt: application.consentAt ?? null }
          : null,
      }
    })
  }

  /** عدد المتقدمين لكل وظيفة (لقايمة الوظائف) */
  async countsByJob(em: EntityManager, jobIds: number[]): Promise<Map<number, number>> {
    if (!jobIds.length || !(await candidateApplicationsReady(em))) return new Map()
    const rows: Array<{ jobId: number; n: number }> = await em.getRepository(CandidateApplication).createQueryBuilder('a')
      .select('a.jobId', 'jobId').addSelect('COUNT(*)', 'n').where('a.jobId IN (:...jobIds)', { jobIds }).groupBy('a.jobId').getRawMany()
    return new Map(rows.map((row) => [Number(row.jobId), Number(row.n)]))
  }

  /** الموظف صاحب الحساب لو ملفه شغال (مش منتهي ولا أرشيف)، وإلا null */
  private async applicant(em: EntityManager, user: JwtPayload, lock = false): Promise<Employee | null> {
    if (!user.employeeId) return null
    const employee = await em.getRepository(Employee).findOne({ where: { id: user.employeeId }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    return employee && employee.isActive !== false && !ENDED.includes(employee.status) && employee.branchId != null ? employee : null
  }

  /** وظيفة مفتوحة للتقديم الداخلي لموظف: منشورة، ومكان نشرها «داخلي»، وفي فرعه الحالي */
  private open(job: RecruitmentJob | null, employee: Employee): job is RecruitmentJob {
    return !!job && job.status === 'PUBLISHED' && job.internal === true && job.branchId === employee.branchId
  }

  /** «وظائف داخلية» للموظف: الوظائف المنشورة داخليًا في فرعه الحالي، وهل قدّم على كل واحدة (من غير نطاق الراتب) */
  async openings(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await recruitmentJobsReady(em)) || !(await candidateApplicationsReady(em))) return { available: false, canApply: false, jobs: [] }
    const employee = await this.applicant(em, user)
    if (!employee) return { available: true, canApply: false, jobs: [] }
    const jobs = (await em.getRepository(RecruitmentJob).find({ where: { status: 'PUBLISHED', internal: true, branchId: employee.branchId }, order: { publishedAt: 'DESC', id: 'DESC' } }))
      .filter((job) => this.open(job, employee))
    if (!jobs.length) return { available: true, canApply: true, jobs: [] }
    const mine = new Set((await em.getRepository(CandidateApplication).find({ where: { jobId: In(jobs.map((job) => job.id)), applicantEmployeeId: employee.id } })).map((row) => row.jobId))
    const departmentIds = [...new Set(jobs.map((job) => job.departmentId).filter((id): id is number => id != null))]
    const departments = new Map((departmentIds.length ? await em.getRepository(Department).find({ where: { id: In(departmentIds) } }) : []).map((row) => [row.id, row]))
    return {
      available: true, canApply: true,
      jobs: jobs.map((job) => {
        const department = job.departmentId != null ? departments.get(job.departmentId) : undefined
        return {
          id: job.id, code: jobCode(job.id), title: job.title, departmentName: department && department.branchId === job.branchId ? department.name : null,
          openings: job.openings, description: job.description ?? null, requirements: job.requirements ?? null,
          startDate: job.startDate ? String(job.startDate).slice(0, 10) : null, publishedAt: job.publishedAt ?? null, applied: mine.has(job.id),
        }
      }),
    }
  }

  /**
   * التقديم الداخلي: تحت قفل صف الوظيفة وبعده صف الموظف (الحكم كله بعد القفلين): الوظيفة لسه منشورة داخليًا في فرعه الحالي، وماقدّمش
   * قبل كده ومفيش مرشح بنفس وسائله. المرشح من بيانات ملفه.
   */
  async applyInternal(user: JwtPayload, jobId: number, rawNote: unknown) {
    if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') throw new BadRequestException('الملاحظة نص')
    const note = typeof rawNote === 'string' ? rawNote.trim() : ''
    if (note.length > NOTE_MAX) throw new BadRequestException(`الملاحظة لا تتجاوز ${NOTE_MAX} حرف`)
    if (!user.employeeId) throw new ForbiddenException(OPENINGS_NEED_EMPLOYEE)
    return this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const job = await em.getRepository(RecruitmentJob).findOne({ where: { id: jobId }, lock: { mode: 'pessimistic_write' } })
      const employee = await this.applicant(em, user, true)
      if (!employee) throw new ForbiddenException(OPENINGS_NEED_EMPLOYEE)
      // وظيفة مش منشورة داخليًا أو في فرع تاني زي اللي مش موجودة
      if (!this.open(job, employee)) throw new NotFoundException(OPENING_NOT_FOUND)
      const email = employee.email || employee.personalEmail || undefined, phone = employee.phone || undefined
      await assertNotDuplicateOnJob(em, job.id, { email, phone, applicantEmployeeId: employee.id })
      const candidates = em.getRepository(Candidate)
      const candidate = await candidates.save(candidates.create({
        fullName: employee.fullName, email, phone, notes: note || undefined, positionTitle: job.title, branchId: job.branchId,
      }))
      await em.getRepository(CandidateApplication).insert({
        candidateId: candidate.id, jobId: job.id, source: SOURCE_INTERNAL, nationalId: null, applicantEmployeeId: employee.id, cvFileId: null, consentAt: null, createdAt: new Date(),
      })
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_INTERNAL_APPLICATION', entityType: 'recruitment_job', entityId: job.id, actorUserId: user.sub, branchId: job.branchId,
        summary: `تقديم داخلي على الوظيفة الشاغرة ${jobCode(job.id)} (${job.title})`, after: { candidateId: candidate.id } })
      return { jobId: job.id, applied: true }
    })
  }
}
