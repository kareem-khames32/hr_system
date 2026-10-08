import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { JobTitle } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { CandidateApplicationsService } from './candidate-applications.service'
import { RecruitmentJob, type RecruitmentJobStatus } from './recruitment-job.entity'
import {
  RECRUITMENT_JOBS_MIGRATION_MISSING, RECRUITMENT_JOB_CLOSED, RECRUITMENT_JOB_STATUS_LABELS, RECRUITMENT_PUBLISH_NEEDS, RECRUITMENT_REASON_MAX, RECRUITMENT_TEXT_MAX,
  catalogJobTitle, cleanJobText, cleanOpenings, cleanSalaryRange, cleanStartDate, jobCode, jobStatusAllowed, jobStatusRefusal, publishable, recruitmentJobsReady,
} from './recruitment-rules'

export interface RecruitmentJobInput {
  title?: unknown; branchId?: unknown; departmentId?: unknown; openings?: unknown; reason?: unknown; salaryFrom?: unknown; salaryTo?: unknown; startDate?: unknown
  description?: unknown; requirements?: unknown; internal?: unknown; external?: unknown
}

// B3.2-أ: الوظائف الشاغرة — القايمة والإنشاء والتعديل والحالة، بصلاحية إدارة التوظيف وبنطاق فروع الحساب (وظيفة فرع برّه النطاق = غير موجودة)
// الخانة العشرية بتطلع من القاعدة رقم: العرض نص بخانتين (زي ما اتخزّنت)
const amountText = (value: unknown): string | null => (value === null || value === undefined ? null : Number(value).toFixed(2))

@Injectable()
export class RecruitmentJobsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly applications: CandidateApplicationsService) {}

  private async assertReady(em: EntityManager) {
    if (!(await recruitmentJobsReady(em))) throw new BadRequestException(RECRUITMENT_JOBS_MIGRATION_MISSING)
  }

  /** شكل الوظيفة للواجهة. اسم القسم بفرع القسم الحالي: قسم اتنقل من فرع الوظيفة مابيتعرضش اسمه ولا رقمه */
  private async views(em: EntityManager, rows: RecruitmentJob[]) {
    if (!rows.length) return []
    const branchIds = [...new Set(rows.map((row) => row.branchId))]
    const departmentIds = [...new Set(rows.map((row) => row.departmentId).filter((id): id is number => id != null))]
    const branches = new Map((await em.getRepository(Branch).find({ where: { id: In(branchIds) } })).map((branch) => [branch.id, branch.name]))
    const departments = new Map((departmentIds.length ? await em.getRepository(Department).find({ where: { id: In(departmentIds) } }) : []).map((department) => [department.id, department]))
    // B3.3-أ: عدد المتقدمين على كل وظيفة
    const applicants = await this.applications.countsByJob(em, rows.map((row) => row.id))
    return rows.map((row) => {
      const department = row.departmentId != null ? departments.get(row.departmentId) : undefined
      const unit = department && department.branchId === row.branchId ? department : null
      return {
        id: row.id, code: jobCode(row.id), title: row.title, branchId: row.branchId, branchName: branches.get(row.branchId) ?? '—',
        departmentId: unit ? unit.id : null, departmentName: unit ? unit.name : null,
        openings: row.openings, reason: row.reason ?? null, salaryFrom: amountText(row.salaryFrom), salaryTo: amountText(row.salaryTo),
        startDate: row.startDate ? String(row.startDate).slice(0, 10) : null, description: row.description ?? null, requirements: row.requirements ?? null,
        status: row.status, statusLabel: RECRUITMENT_JOB_STATUS_LABELS[row.status] ?? row.status, internal: row.internal === true, external: row.external === true,
        requestId: row.requestId ?? null, publishedAt: row.publishedAt ?? null, closedAt: row.closedAt ?? null, createdAt: row.createdAt,
        applicants: applicants.get(row.id) ?? 0,
      }
    })
  }

  async list(user: JwtPayload) {
    const em = this.ds.manager, canManage = userHasPerm(user, 'candidates.manage')
    if (!(await recruitmentJobsReady(em))) return { available: false, message: RECRUITMENT_JOBS_MIGRATION_MISSING, canManage, jobs: [] }
    const scope = branchScopeOf(user)
    const rows = isEmptyBranchScope(scope) ? [] : await em.getRepository(RecruitmentJob).find({ where: scope !== null ? { branchId: branchIdIn(scope) } : {}, order: { id: 'DESC' } })
    return { available: true, canManage, jobs: await this.views(em, rows) }
  }

  /** بيانات نموذج الوظيفة: فروع نطاق الحساب بأقسامها، والمسميات النشطة — عشان الشاشة تشتغل بصلاحيتها هي */
  async formData(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const branches = await em.getRepository(Branch).find({ where: scope === null ? { isActive: true } : { id: In(scope.length ? scope : [-1]), isActive: true }, order: { name: 'ASC' } })
    const branchIds = branches.map((row) => row.id)
    const departments = branchIds.length ? await em.getRepository(Department).find({ where: { branchId: In(branchIds), isActive: true }, order: { name: 'ASC' } }) : []
    const titles = await em.getRepository(JobTitle).find({ where: { isActive: true }, order: { title: 'ASC' } })
    return {
      branches: branches.map((row) => ({ id: row.id, name: row.name })),
      departments: departments.map((row) => ({ id: row.id, name: row.name, branchId: row.branchId })),
      jobTitles: titles.map((row) => ({ id: row.id, title: row.title })),
    }
  }

  /** الوظيفة في نطاق فروع الحساب، وإلا غير موجودة */
  private async scoped(em: EntityManager, user: JwtPayload, id: number, lock = false): Promise<RecruitmentJob> {
    const row = await em.getRepository(RecruitmentJob).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!row || !inBranchScope(branchScopeOf(user), row.branchId)) throw new NotFoundException('الوظيفة غير موجودة')
    return row
  }

  async detail(user: JwtPayload, id: number) {
    await this.assertReady(this.ds.manager)
    return (await this.views(this.ds.manager, [await this.scoped(this.ds.manager, user, id)]))[0]
  }

  /** وظيفة جديدة من الشاشة (مسودة): المسمى من الكتالوج، والفرع من نطاق الحساب، والقسم (اختياري) تبع الفرع وصفه مقفول لآخر المعاملة */
  async create(user: JwtPayload, input: RecruitmentJobInput) {
    const saved = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const branchId = Number(input.branchId)
      // الفرع برّه نطاق الحساب زي الفرع اللي مش موجود
      const branch = Number.isSafeInteger(branchId) && inBranchScope(branchScopeOf(user), branchId) ? await em.getRepository(Branch).findOne({ where: { id: branchId } }) : null
      if (!branch) throw new NotFoundException('الفرع غير موجود')
      const departmentId = input.departmentId == null ? null : Number(input.departmentId)
      if (departmentId != null) {
        const department = Number.isSafeInteger(departmentId) ? await em.getRepository(Department).findOne({ where: { id: departmentId }, lock: { mode: 'pessimistic_write' } }) : null
        if (!department || department.branchId !== branch.id) throw new BadRequestException('القسم مش تبع الفرع ده')
      }
      const jobs = em.getRepository(RecruitmentJob)
      const row = await jobs.save(jobs.create({
        title: await catalogJobTitle(em, input.title), branchId: branch.id, departmentId, openings: cleanOpenings(input.openings),
        reason: cleanJobText(input.reason, RECRUITMENT_REASON_MAX, 'سبب الاحتياج'), ...cleanSalaryRange(input.salaryFrom, input.salaryTo), startDate: cleanStartDate(input.startDate),
        description: cleanJobText(input.description, RECRUITMENT_TEXT_MAX, 'وصف الوظيفة'), requirements: cleanJobText(input.requirements, RECRUITMENT_TEXT_MAX, 'متطلبات الوظيفة'),
        status: 'DRAFT', internal: input.internal !== false, external: input.external === true, requestId: null, createdByUserId: user.sub, publishedAt: null, closedAt: null,
        createdAt: new Date(),
      }))
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_JOB_CREATED', entityType: 'recruitment_job', entityId: row.id, actorUserId: user.sub, branchId: row.branchId,
        summary: `وظيفة شاغرة جديدة ${jobCode(row.id)} (${row.title}) بعدد ${row.openings}`,
        after: { title: row.title, branchId: row.branchId, departmentId: row.departmentId, openings: row.openings } })
      return row
    })
    return (await this.views(this.ds.manager, [saved]))[0]
  }

  /** تعديل وظيفة مش مقفولة: تحت قفل صفها، وبالخانات المبعوتة بس. الفرع والقسم مابيتغيّروش (وظيفة لوحدة تانية = وظيفة جديدة) */
  async update(user: JwtPayload, id: number, input: RecruitmentJobInput) {
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await this.scoped(em, user, id, true)
      if (row.status === 'CLOSED') throw new BadRequestException(RECRUITMENT_JOB_CLOSED)
      if ((input.branchId !== undefined && Number(input.branchId) !== row.branchId) || (input.departmentId !== undefined && (input.departmentId ?? null) !== (row.departmentId ?? null))) {
        throw new BadRequestException('فرع الوظيفة وقسمها مابيتغيّروش — اقفل الوظيفة واعمل وظيفة جديدة على الوحدة الصح')
      }
      const patch: Partial<RecruitmentJob> = {}
      if (input.title !== undefined) patch.title = await catalogJobTitle(em, input.title)
      if (input.openings !== undefined) patch.openings = cleanOpenings(input.openings)
      if (input.reason !== undefined) patch.reason = cleanJobText(input.reason, RECRUITMENT_REASON_MAX, 'سبب الاحتياج')
      if (input.salaryFrom !== undefined || input.salaryTo !== undefined) {
        Object.assign(patch, cleanSalaryRange(input.salaryFrom !== undefined ? input.salaryFrom : row.salaryFrom, input.salaryTo !== undefined ? input.salaryTo : row.salaryTo))
      }
      if (input.startDate !== undefined) patch.startDate = cleanStartDate(input.startDate)
      if (input.description !== undefined) patch.description = cleanJobText(input.description, RECRUITMENT_TEXT_MAX, 'وصف الوظيفة')
      if (input.requirements !== undefined) patch.requirements = cleanJobText(input.requirements, RECRUITMENT_TEXT_MAX, 'متطلبات الوظيفة')
      if (input.internal !== undefined) patch.internal = input.internal === true
      if (input.external !== undefined) patch.external = input.external === true
      // وظيفة منشورة لازم تفضل صالحة للنشر بعد التعديل
      if (row.status === 'PUBLISHED' && !publishable({ ...row, ...patch })) throw new BadRequestException(RECRUITMENT_PUBLISH_NEEDS)
      if (Object.keys(patch).length) await em.getRepository(RecruitmentJob).update({ id: row.id }, patch)
    })
    return this.detail(user, id)
  }

  /** تغيير الحالة تحت قفل صف الوظيفة: نشر (محتاج وصف ومكان نشر)، إيقاف، رجوع للنشر، قفل (نهائي) */
  async setStatus(user: JwtPayload, id: number, next: RecruitmentJobStatus) {
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await this.scoped(em, user, id, true)
      if (row.status === next) return
      if (!jobStatusAllowed(row.status, next)) throw new BadRequestException(jobStatusRefusal(row.status, next))
      if (next === 'PUBLISHED' && !publishable(row)) throw new BadRequestException(RECRUITMENT_PUBLISH_NEEDS)
      const now = new Date()
      await em.getRepository(RecruitmentJob).update({ id: row.id }, {
        status: next,
        ...(next === 'PUBLISHED' && !row.publishedAt ? { publishedAt: now } : {}),
        ...(next === 'CLOSED' ? { closedAt: now } : {}),
      })
      await recordAudit(em, { category: 'SETTINGS', action: 'RECRUITMENT_JOB_STATUS', entityType: 'recruitment_job', entityId: row.id, actorUserId: user.sub, branchId: row.branchId,
        summary: `الوظيفة الشاغرة ${jobCode(row.id)} بقت «${RECRUITMENT_JOB_STATUS_LABELS[next]}»`, before: { status: row.status }, after: { status: next } })
    })
    return this.detail(user, id)
  }
}
