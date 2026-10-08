import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { Between, DataSource, In, type EntityManager } from 'typeorm'
import { AttendanceDay } from '../attendance/attendance.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Request } from '../requests/entities/request.entity'
import { Task } from '../tasks/task.entity'
import { PerformanceGoal } from './goal.entities'
import { goalsReady } from './goal-rules'
import { ReviewAssignment, ReviewCycle, ReviewResponse, ReviewTemplate, type ReviewRelation } from './review.entities'
import { OBJECTION_ACCEPTED, OBJECTION_STATUS_LABELS, objectionDeadline, objectionOf, objectionsOf } from './review-objections'
import {
  REVIEW_BANDS, REVIEW_CALIBRATE_PERMISSION, REVIEW_CALIBRATION_CHANGED, REVIEW_CALIBRATION_SAME, REVIEW_CALIBRATION_STAGE, bandDistribution, cleanCalibratedScore, cleanCalibrationReason, reviewBand,
  REVIEWS_MIGRATION_MISSING, REVIEW_CYCLE_KIND_LABELS, REVIEW_CYCLE_NOT_FOUND, REVIEW_CYCLE_STATUS_LABELS, REVIEW_NOT_FOUND, REVIEW_STATUS_LABELS, REVIEW_SUBMITTED, REVIEW_TEMPLATE_NOT_FOUND,
  REVIEW_TEXT_MAX, cleanAnswers, cleanCycleAudience, cleanCycleDates, cleanCycleKind, cleanRatingMax, cleanReviewName, cleanSections, parseTemplate, reviewScore, reviewsReady,
  type ReviewGoalRef, type ReviewTemplateShape,
} from './review-rules'

export interface TemplateInput { name?: unknown; description?: unknown; ratingMax?: unknown; sections?: unknown; isActive?: unknown }
export interface CycleInput {
  name?: unknown; kind?: unknown; templateId?: unknown; periodStart?: unknown; periodEnd?: unknown; selfDueDate?: unknown; managerDueDate?: unknown; audienceMode?: unknown; audienceIds?: unknown
}
export const REVIEWS_PERMISSION = 'performance.manage'
const ENDED = ['terminated', 'archived']
const day = (value: unknown): string => String(value).slice(0, 10)
const score = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value))
const ids = (json: string | null | undefined): number[] => { try { const value = json ? JSON.parse(json) : []; return Array.isArray(value) ? value.map(Number) : [] } catch { return [] } }
function optionalText(raw: unknown, max: number, label: string): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(`${label} نص`)
  const value = raw.replace(/\r\n?/g, '\n').trim()
  if (value.length > max) throw new BadRequestException(`${label} لا يتجاوز ${max} حرف`)
  return value || null
}

/** الدورة في نطاق فروع الحساب: حساب من غير قيد فروع شايف الكل؛ وحساب الفروع شايف الدورة اللي كل فروعها من فروعه (دورة «كل الشركة» مش له) */
export function reviewCycleInScope(user: JwtPayload, cycle: Pick<ReviewCycle, 'branchIds'>): boolean {
  const scope = branchScopeOf(user)
  if (scope === null) return true
  const branches = cycle.branchIds ? ids(cycle.branchIds) : null
  return !!branches && branches.length > 0 && branches.every((id) => inBranchScope(scope, id))
}

// B3.7: دورات التقييم. النماذج والدورات بصلاحية إدارة الأداء (والدورة بنطاق فروعها)؛ والتقييم نفسه حق من التكليف: الموظف لتقييمه الذاتي، والمدير
// اللي اتثبّت وقت الإطلاق لتقييم مرؤوسه. نموذج الدورة بيتجمّد وقت الإطلاق، ولوحة الأدلة بتتجمّد وقت التسليم.
@Injectable()
export class ReviewsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly resolver: ApproverResolver) {}

  private async assertReady(em: EntityManager) {
    if (!(await reviewsReady(em))) throw new BadRequestException(REVIEWS_MIGRATION_MISSING)
  }
  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, REVIEWS_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة الأداء')
  }
  private assertCalibrator(user: JwtPayload) {
    if (!userHasPerm(user, REVIEW_CALIBRATE_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية معايرة التقييمات')
  }
  private cycleInScope(user: JwtPayload, cycle: ReviewCycle): boolean {
    return reviewCycleInScope(user, cycle)
  }

  // ===== النماذج =====

  private templateView(row: ReviewTemplate) {
    return { id: row.id, name: row.name, description: row.description ?? null, ratingMax: row.ratingMax, sections: JSON.parse(row.sections) as ReviewTemplateShape['sections'],
      isActive: row.isActive === true, createdAt: row.createdAt }
  }

  async listTemplates(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await reviewsReady(em))) return { available: false, message: REVIEWS_MIGRATION_MISSING, templates: [] }
    return { available: true, templates: (await em.getRepository(ReviewTemplate).find({ order: { id: 'DESC' } })).map((row) => this.templateView(row)) }
  }

  async createTemplate(user: JwtPayload, input: TemplateInput) {
    this.assertManager(user)
    const name = cleanReviewName(input.name), description = optionalText(input.description, 1000, 'وصف النموذج'), ratingMax = cleanRatingMax(input.ratingMax ?? 5), sections = cleanSections(input.sections)
    const em = this.ds.manager
    await this.assertReady(em)
    const row = await em.getRepository(ReviewTemplate).save(em.getRepository(ReviewTemplate).create({ name, description, ratingMax, sections: JSON.stringify(sections), isActive: true,
      createdByUserId: user.sub, createdAt: new Date() }))
    return this.templateView(row)
  }

  /** تعديل نموذج بالخانات المبعوتة تحت قفل صفه. الدورات اللي اتطلقت شايلة نسختها المتجمّدة، فالتعديل بيسري على اللي بعدها بس */
  async updateTemplate(user: JwtPayload, id: number, input: TemplateInput) {
    this.assertManager(user)
    const patch: Partial<ReviewTemplate> = {}
    if (input.name !== undefined) patch.name = cleanReviewName(input.name)
    if (input.description !== undefined) patch.description = optionalText(input.description, 1000, 'وصف النموذج')
    if (input.ratingMax !== undefined) patch.ratingMax = cleanRatingMax(input.ratingMax)
    if (input.sections !== undefined) patch.sections = JSON.stringify(cleanSections(input.sections))
    if (input.isActive !== undefined) {
      if (typeof input.isActive !== 'boolean') throw new BadRequestException('حالة النموذج: true أو false')
      patch.isActive = input.isActive
    }
    return this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(ReviewTemplate).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(REVIEW_TEMPLATE_NOT_FOUND)
      if (Object.keys(patch).length) await em.getRepository(ReviewTemplate).update({ id }, patch)
      return this.templateView({ ...row, ...patch } as ReviewTemplate)
    })
  }

  // ===== الدورات =====

  private async cycleViews(em: EntityManager, cycles: ReviewCycle[]) {
    if (!cycles.length) return []
    const templates = new Map((await em.getRepository(ReviewTemplate).find({ where: { id: In([...new Set(cycles.map((row) => row.templateId))]) } })).map((row) => [row.id, row.name]))
    const assignments = await em.getRepository(ReviewAssignment).find({ where: { cycleId: In(cycles.map((row) => row.id)) } })
    return cycles.map((row) => {
      const mine = assignments.filter((assignment) => assignment.cycleId === row.id)
      return {
        id: row.id, name: row.name, kind: row.kind, kindLabel: REVIEW_CYCLE_KIND_LABELS[row.kind] ?? row.kind, templateId: row.templateId, templateName: templates.get(row.templateId) ?? null,
        periodStart: day(row.periodStart), periodEnd: day(row.periodEnd), selfDueDate: day(row.selfDueDate), managerDueDate: day(row.managerDueDate),
        audienceMode: row.audienceMode, audienceIds: ids(row.audienceIds), status: row.status, statusLabel: REVIEW_CYCLE_STATUS_LABELS[row.status] ?? row.status, launchedAt: row.launchedAt ?? null,
        counts: { total: mine.length, self: mine.filter((assignment) => assignment.selfSubmittedAt).length, manager: mine.filter((assignment) => assignment.managerSubmittedAt).length,
          noManager: mine.filter((assignment) => assignment.managerEmployeeId == null).length },
      }
    })
  }

  async listCycles(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await reviewsReady(em))) return { available: false, message: REVIEWS_MIGRATION_MISSING, canCompany: false, cycles: [] }
    const rows = (await em.getRepository(ReviewCycle).find({ order: { id: 'DESC' } })).filter((row) => this.cycleInScope(user, row))
    return { available: true, canCompany: branchScopeOf(user) === null, cycles: await this.cycleViews(em, rows) }
  }

  /** جمهور الدورة والفروع اللي بتغطيها: كل الشركة لحساب من غير قيد فروع بس؛ والفروع أو الأقسام لازم تبقى موجودة وفي نطاق الحساب (بفرع القسم الحالي) */
  private async audienceOf(em: EntityManager, user: JwtPayload, rawMode: unknown, rawIds: unknown) {
    const { audienceMode, ids: chosen } = cleanCycleAudience(rawMode, rawIds)
    const scope = branchScopeOf(user)
    if (audienceMode === 'COMPANY') {
      if (scope !== null) throw new ForbiddenException('دورة لكل الشركة لصاحب الصلاحية من غير قيد فروع — اختار فروعك أو أقسامك')
      return { audienceMode, audienceIds: null, branchIds: null }
    }
    if (audienceMode === 'BRANCHES') {
      const branches = await em.getRepository(Branch).find({ where: { id: In(chosen) } })
      if (branches.length !== chosen.length || chosen.some((id) => !inBranchScope(scope, id))) throw new NotFoundException('الفرع غير موجود')
      return { audienceMode, audienceIds: JSON.stringify(chosen), branchIds: JSON.stringify(chosen) }
    }
    const departments = await em.getRepository(Department).find({ where: { id: In(chosen) } })
    if (departments.length !== chosen.length || departments.some((row) => !inBranchScope(scope, row.branchId))) throw new NotFoundException('القسم غير موجود')
    return { audienceMode, audienceIds: JSON.stringify(chosen), branchIds: JSON.stringify([...new Set(departments.map((row) => row.branchId))].sort((a, b) => a - b)) }
  }

  async createCycle(user: JwtPayload, input: CycleInput) {
    this.assertManager(user)
    const name = cleanReviewName(input.name), kind = cleanCycleKind(input.kind), dates = cleanCycleDates(input)
    const em = this.ds.manager
    await this.assertReady(em)
    const template = Number.isSafeInteger(input.templateId) ? await em.getRepository(ReviewTemplate).findOne({ where: { id: input.templateId as number } }) : null
    if (!template || template.isActive !== true) throw new BadRequestException('اختار نموذج تقييم متاح')
    const audience = await this.audienceOf(em, user, input.audienceMode, input.audienceIds)
    const row = await em.getRepository(ReviewCycle).save(em.getRepository(ReviewCycle).create({ name, kind, templateId: template.id, ...dates, ...audience, status: 'DRAFT', templateSnapshot: null,
      launchedAt: null, launchedByUserId: null, createdByUserId: user.sub, createdAt: new Date(), closedAt: null }))
    return (await this.cycleViews(em, [row]))[0]
  }

  /** الدورة تحت قفل صفها، وفي نطاق الحساب — وإلا غير موجودة */
  private async lockedCycle(em: EntityManager, user: JwtPayload, id: number): Promise<ReviewCycle> {
    await this.assertReady(em)
    const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!cycle || !this.cycleInScope(user, cycle)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
    return cycle
  }

  /**
   * إطلاق الدورة: المشاركين = الموظفين الشغالين في جمهورها دلوقتي (بفرعهم وقسمهم الحالي)، ولكل واحد مديره المباشر من الهيكل (المقيِّم) —
   * بيتحسبوا قبل المعاملة (حل المدير خدمة تانية). جوه المعاملة: قفل صف الدورة، لسه مسودة، ونموذجها متاح؛ التكليفات، ونسخة النموذج المتجمّدة، والحالة.
   */
  async launch(user: JwtPayload, id: number) {
    this.assertManager(user)
    const em0 = this.ds.manager
    await this.assertReady(em0)
    const seen = await em0.getRepository(ReviewCycle).findOne({ where: { id } })
    if (!seen || !this.cycleInScope(user, seen)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
    if (seen.status !== 'DRAFT') throw new BadRequestException('الدورة اتطلقت قبل كده')
    const chosen = ids(seen.audienceIds)
    const where = seen.audienceMode === 'COMPANY' ? {} : seen.audienceMode === 'BRANCHES' ? { branchId: In(chosen) } : { departmentId: In(chosen) }
    const participants = (await em0.getRepository(Employee).find({ where: { isActive: true, ...where }, order: { id: 'ASC' } })).filter((row) => !ENDED.includes(row.status) && row.branchId != null)
    if (!participants.length) throw new BadRequestException('مفيش موظفين شغالين في جمهور الدورة')
    const managers = new Map<number, number | null>()
    for (const employee of participants) {
      const manager = await this.resolver.directManagerOf(employee.id)
      managers.set(employee.id, manager && manager !== employee.id ? manager : null)
    }
    await this.ds.transaction(async (em) => {
      const cycle = await this.lockedCycle(em, user, id)
      if (cycle.status !== 'DRAFT') throw new ConflictException('الدورة اتطلقت قبل كده')
      const template = await em.getRepository(ReviewTemplate).findOne({ where: { id: cycle.templateId } })
      if (!template || template.isActive !== true) throw new BadRequestException('نموذج الدورة مش متاح')
      const now = new Date()
      await em.getRepository(ReviewAssignment).insert(participants.map((employee) => ({ cycleId: cycle.id, employeeId: employee.id, branchId: employee.branchId, managerEmployeeId: managers.get(employee.id) ?? null,
        status: 'OPEN' as const, selfSubmittedAt: null, managerSubmittedAt: null, selfScore: null, managerScore: null, finalScore: null, createdAt: now })))
      await em.getRepository(ReviewCycle).update({ id: cycle.id }, { status: 'ACTIVE', templateSnapshot: JSON.stringify({ ratingMax: template.ratingMax, sections: JSON.parse(template.sections) }),
        launchedAt: now, launchedByUserId: user.sub })
    })
    return (await this.cycleViews(this.ds.manager, [await this.ds.getRepository(ReviewCycle).findOneOrFail({ where: { id } })]))[0]
  }

  /** قفل الدورة: مفيش تسليم بعده */
  async close(user: JwtPayload, id: number) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      const cycle = await this.lockedCycle(em, user, id)
      if (cycle.status !== 'ACTIVE') throw new BadRequestException('الدورة مش شغالة')
      await em.getRepository(ReviewCycle).update({ id: cycle.id }, { status: 'CLOSED', closedAt: new Date() })
    })
    return (await this.cycleViews(this.ds.manager, [await this.ds.getRepository(ReviewCycle).findOneOrFail({ where: { id } })]))[0]
  }

  /**
   * B3.7-ب: اعتماد نتايج الدورة أو إعلانها للموظفين — لإدارة الأداء، تحت قفل صف الدورة: الاعتماد بينقل التكليفات اللي المدير سلّمها («المدير سلّم» ←
   * «معتمد»)، والإعلان بينقل المعتمدة («معتمد» ← «معلن») — للموظفين اللي فرعهم الحالي في نطاق الحساب بس. الدورة لازم تكون اتطلقت.
   */
  async advance(user: JwtPayload, id: number, rawTo: unknown) {
    this.assertManager(user)
    if (rawTo !== 'APPROVED' && rawTo !== 'ANNOUNCED') throw new BadRequestException('الخطوة: APPROVED أو ANNOUNCED')
    const from = rawTo === 'APPROVED' ? 'COMPLETED' : 'APPROVED'
    const moved = await this.ds.transaction(async (em) => {
      const cycle = await this.lockedCycle(em, user, id)
      if (cycle.status === 'DRAFT') throw new BadRequestException('الدورة لسه مسودة')
      const rows = await em.getRepository(ReviewAssignment).find({ where: { cycleId: cycle.id, status: from } })
      const scope = branchScopeOf(user)
      const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In(rows.map((row) => row.employeeId)) } }) : []).map((row) => [row.id, row]))
      const mine = rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null)).map((row) => row.id)
      if (!mine.length) return 0
      // بشرط الحالة: تكليف اتحرك في النص مابيتكتبش فوقه
      const written = await em.getRepository(ReviewAssignment).update({ id: In(mine), status: from }, { status: rawTo })
      // B3.8-أ: لحظة الإعلان لكل تكليف (مهلة الاعتراض منها). «معتمد» مابيتحركش غير من هنا وتحت قفل الدورة، فالمجموعة ثابتة
      if (rawTo === 'ANNOUNCED') {
        const now = new Date()
        await em.getRepository(ReviewResponse).insert(mine.map((assignmentId) => ({ assignmentId, relation: 'PUB' as const, answers: '{}', evidence: null, score: null, comment: null,
          submittedByUserId: user.sub, submittedAt: now })))
      }
      await recordAudit(em, { category: 'SETTINGS', action: rawTo === 'APPROVED' ? 'REVIEW_CYCLE_APPROVED' : 'REVIEW_CYCLE_ANNOUNCED', entityType: 'review_cycle', entityId: cycle.id, actorUserId: user.sub,
        branchId: null, summary: `دورة التقييم «${cycle.name}»: ${rawTo === 'APPROVED' ? 'اعتماد' : 'إعلان'} ${written.affected ?? mine.length} تقييم`, after: { status: rawTo, count: written.affected ?? mine.length } })
      return written.affected ?? mine.length
    })
    return { moved, ...(await this.assignments(user, id)) }
  }

  /**
   * B3.7-ب: إقرار الموظف بنتيجة تقييمه المعلنة (بتعليق اختياري) — صاحب التكليف بس، مرة واحدة، تحت قفل صف التكليف. الإقرار مش موافقة: الاعتراض
   * مساره لوحده (B3.8).
   */
  async acknowledge(user: JwtPayload, assignmentId: number, rawComment: unknown) {
    const comment = optionalText(rawComment, REVIEW_TEXT_MAX, 'تعليق الإقرار')
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const assignment = await em.getRepository(ReviewAssignment).findOne({ where: { id: assignmentId }, lock: { mode: 'pessimistic_write' } })
      if (!assignment || !user.employeeId || assignment.employeeId !== user.employeeId) throw new NotFoundException(REVIEW_NOT_FOUND)
      if (assignment.status === 'ACKNOWLEDGED') throw new ConflictException('الإقرار اتسجّل قبل كده')
      if (assignment.status !== 'ANNOUNCED') throw new BadRequestException('النتيجة لسه ماتعلنتش')
      const now = new Date()
      await em.getRepository(ReviewResponse).insert({ assignmentId: assignment.id, relation: 'ACK', answers: '{}', evidence: null, score: null, comment, submittedByUserId: user.sub, submittedAt: now })
      await em.getRepository(ReviewAssignment).update({ id: assignment.id }, { status: 'ACKNOWLEDGED' })
    })
    return this.form(user, assignmentId)
  }

  /** تكليفات دورة لإدارة الأداء: الموظف ومديره وحالته ودرجاته — للموظفين اللي فرعهم الحالي في نطاق الحساب */
  async assignments(user: JwtPayload, cycleId: number) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: cycleId } })
    if (!cycle || !this.cycleInScope(user, cycle)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
    const rows = await em.getRepository(ReviewAssignment).find({ where: { cycleId }, order: { id: 'ASC' } })
    const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.flatMap((row) => [row.employeeId, row.managerEmployeeId ?? row.employeeId]))]) } }) : []).map((row) => [row.id, row]))
    const scope = branchScopeOf(user)
    return { cycle: (await this.cycleViews(em, [cycle]))[0], assignments: rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null)).map((row) => {
      const manager = row.managerEmployeeId != null ? people.get(row.managerEmployeeId) : undefined
      return { id: row.id, employeeId: row.employeeId, employeeName: people.get(row.employeeId)?.fullName ?? '—',
        // اسم المدير بفرعه الحالي في نطاق القارئ
        managerName: manager && inBranchScope(scope, manager.branchId) ? manager.fullName : null, hasManager: row.managerEmployeeId != null,
        status: row.status, statusLabel: REVIEW_STATUS_LABELS[row.status] ?? row.status, selfSubmitted: !!row.selfSubmittedAt, managerSubmitted: !!row.managerSubmittedAt,
        selfScore: score(row.selfScore), managerScore: score(row.managerScore), finalScore: score(row.finalScore) }
    }) }
  }

  // ===== B3.8-أ: المعايرة =====

  /** تكليف في نطاق اللي بيعاير: دورته في نطاق فروعه، والموظف بفرعه الحالي في نطاقه */
  private async calibratorSees(em: EntityManager, user: JwtPayload, assignment: ReviewAssignment, cycle: ReviewCycle): Promise<boolean> {
    if (!this.cycleInScope(user, cycle)) return false
    const employee = await em.getRepository(Employee).findOne({ where: { id: assignment.employeeId } })
    return !!employee && inBranchScope(branchScopeOf(user), employee.branchId)
  }

  /** الدورات اللي اتطلقت في نطاق الحساب (اختيار دورة المعايرة) */
  async calibrationCycles(user: JwtPayload) {
    this.assertCalibrator(user)
    const em = this.ds.manager
    if (!(await reviewsReady(em))) return { available: false, message: REVIEWS_MIGRATION_MISSING, cycles: [] }
    const rows = (await em.getRepository(ReviewCycle).find({ where: { status: In(['ACTIVE', 'CLOSED']) }, order: { id: 'DESC' } })).filter((row) => this.cycleInScope(user, row))
    return { available: true, bands: REVIEW_BANDS, cycles: rows.map((row) => ({ id: row.id, name: row.name, kindLabel: REVIEW_CYCLE_KIND_LABELS[row.kind] ?? row.kind, status: row.status,
      statusLabel: REVIEW_CYCLE_STATUS_LABELS[row.status] ?? row.status, periodStart: day(row.periodStart), periodEnd: day(row.periodEnd) })) }
  }

  /**
   * جلسة معايرة دورة: التقييمات اللي المدير سلّمها (لموظفين فرعهم الحالي في نطاق الحساب)، بمجموعة اختيارية (قسم أو فرع): درجة المدير والدرجة
   * النهائية وتقديرها، وسجل تعديلات المعايرة، وجدول توزيع التقديرات لكل مدير، والتوزيع الكلي جنب الاسترشادي (تحذير بس).
   */
  async calibration(user: JwtPayload, cycleId: number, filter: { departmentId?: unknown; branchId?: unknown } = {}) {
    this.assertCalibrator(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const group = (raw: unknown, label: string): number | null => {
      if (raw === undefined || raw === null || raw === '') return null
      const value = Number(raw)
      if (!Number.isSafeInteger(value) || value < 1) throw new BadRequestException(`${label} غير صالح`)
      return value
    }
    const departmentId = group(filter.departmentId, 'القسم'), branchId = group(filter.branchId, 'الفرع')
    const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: cycleId } })
    if (!cycle || cycle.status === 'DRAFT' || !this.cycleInScope(user, cycle)) throw new NotFoundException(REVIEW_CYCLE_NOT_FOUND)
    const scope = branchScopeOf(user)
    const all = (await em.getRepository(ReviewAssignment).find({ where: { cycleId }, order: { id: 'ASC' } })).filter((row) => row.status !== 'OPEN')
    const people = new Map((all.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(all.flatMap((row) => [row.employeeId, row.managerEmployeeId ?? row.employeeId]))]) } }) : []).map((row) => [row.id, row]))
    // الموظف بفرعه وقسمه الحاليين
    const visible = all.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null))
    // Codex P3K-B08-02: القسم بفرعه الحالي هو: قسم اتنقل برّه نطاق الحساب مابيتسمّاش (ولا رقمه) حتى لو موظفه لسه في النطاق
    const departments = new Map((visible.length ? await em.getRepository(Department).find({ where: { id: In([...new Set(visible.map((row) => people.get(row.employeeId)?.departmentId ?? 0))]) } }) : [])
      .filter((row) => inBranchScope(scope, row.branchId)).map((row) => [row.id, row.name]))
    const branches = new Map((visible.length ? await em.getRepository(Branch).find({ where: { id: In([...new Set(visible.map((row) => people.get(row.employeeId)?.branchId ?? 0))]) } }) : []).map((row) => [row.id, row.name]))
    // التصفية بقسم مش من أقسام النطاق = ولا صف (القسم المخفي مايتخمّنش برقمه)
    const rows = visible.filter((row) => (departmentId === null || (departments.has(departmentId) && people.get(row.employeeId)?.departmentId === departmentId))
      && (branchId === null || people.get(row.employeeId)?.branchId === branchId))
    const log = rows.length ? await em.getRepository(ReviewResponse).find({ where: { assignmentId: In(rows.map((row) => row.id)), relation: 'CAL' }, order: { id: 'ASC' } }) : []
    const actors = new Map((log.length ? await em.getRepository(User).find({ where: { id: In([...new Set(log.map((row) => row.submittedByUserId))]) } }) : []).map((row) => [row.id, row.displayName]))
    const objections = await objectionsOf(em, [...new Set(rows.map((row) => row.employeeId))])
    // المديرين بترتيب ظهورهم؛ المدير اللي فرعه الحالي برّه النطاق بيتعدّ من غير اسم (ومن غير رقم)
    const managerIds = [...new Set(rows.map((row) => row.managerEmployeeId ?? 0))]
    const managerName = (id: number): string | null => { const manager = people.get(id); return manager && inBranchScope(scope, manager.branchId) ? manager.fullName : null }
    const announced = (row: ReviewAssignment) => row.status === 'ANNOUNCED' || row.status === 'ACKNOWLEDGED'
    return {
      cycle: { id: cycle.id, name: cycle.name, status: cycle.status, statusLabel: REVIEW_CYCLE_STATUS_LABELS[cycle.status] ?? cycle.status },
      bands: REVIEW_BANDS,
      groups: {
        departments: [...departments].map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name, 'ar')),
        branches: [...branches].map(([id, name]) => ({ id, name })).sort((left, right) => left.name.localeCompare(right.name, 'ar')),
      },
      rows: rows.map((row) => {
        const employee = people.get(row.employeeId), final = score(row.finalScore), band = reviewBand(final), objection = objections.get(row.id) ?? null
        return { id: row.id, employeeName: employee?.fullName ?? '—', departmentName: employee?.departmentId != null ? departments.get(employee.departmentId) ?? null : null,
          branchName: employee?.branchId != null ? branches.get(employee.branchId) ?? null : null, manager: managerIds.indexOf(row.managerEmployeeId ?? 0),
          status: row.status, statusLabel: REVIEW_STATUS_LABELS[row.status] ?? row.status, managerScore: score(row.managerScore), finalScore: final,
          band, bandLabel: REVIEW_BANDS.find((entry) => entry.key === band)?.label ?? null,
          adjustments: log.filter((entry) => entry.assignmentId === row.id).map((entry) => {
            const change = JSON.parse(entry.answers) as { before?: string | null; after?: string }
            return { before: score(change.before ?? null), after: score(change.after ?? entry.score), reason: entry.comment ?? '', byName: actors.get(entry.submittedByUserId) ?? null, at: entry.submittedAt }
          }),
          objection: objection ? { requestId: objection.requestId, status: objection.status, statusLabel: OBJECTION_STATUS_LABELS[objection.status] ?? objection.status } : null,
          canCalibrate: row.status === 'COMPLETED' || (announced(row) && !!objection && OBJECTION_ACCEPTED.includes(objection.status)) }
      }),
      managers: managerIds.map((id, index) => {
        const scores = rows.filter((row) => (row.managerEmployeeId ?? 0) === id).map((row) => score(row.finalScore))
        const rated = scores.filter((value): value is number => value !== null)
        return { index, name: id ? managerName(id) : null, hasManager: id !== 0, count: scores.length, average: rated.length ? Math.round((rated.reduce((sum, value) => sum + value, 0) / rated.length) * 100) / 100 : null,
          bands: bandDistribution(scores).map((band) => ({ key: band.key, count: band.count })) }
      }),
      distribution: bandDistribution(rows.map((row) => score(row.finalScore))),
    }
  }

  /**
   * تعديل معايرة على درجة تقييم — بسبب إجباري وبيتسجّل (قبل، بعد، السبب، مين، إمتى) صف رد CAL وسطر تدقيق. قبل الاعتماد («المدير سلّم»)، أو على
   * تقييم معلن اعتراضه اتقبل. الأقفال بنفس ترتيب تقديم الاعتراض: صف الطلب ثم صف التكليف، والحكم كله بيتعاد تحتها.
   */
  async calibrate(user: JwtPayload, assignmentId: number, input: { score?: unknown; reason?: unknown }) {
    this.assertCalibrator(user)
    const next = cleanCalibratedScore(input.score), reason = cleanCalibrationReason(input.reason)
    const em0 = this.ds.manager
    await this.assertReady(em0)
    const seen = await em0.getRepository(ReviewAssignment).findOne({ where: { id: assignmentId } })
    const seenCycle = seen ? await em0.getRepository(ReviewCycle).findOne({ where: { id: seen.cycleId } }) : null
    if (!seen || !seenCycle || !(await this.calibratorSees(em0, user, seen, seenCycle))) throw new NotFoundException(REVIEW_NOT_FOUND)
    const published = seen.status === 'ANNOUNCED' || seen.status === 'ACKNOWLEDGED'
    const objection = published ? await objectionOf(em0, seen) : null
    if (published ? !objection || !OBJECTION_ACCEPTED.includes(objection.status) : seen.status !== 'COMPLETED') throw new BadRequestException(REVIEW_CALIBRATION_STAGE)
    await this.ds.transaction(async (em) => {
      if (objection) {
        const request = await em.getRepository(Request).findOne({ where: { id: objection.requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request || request.requesterId !== seen.employeeId || !OBJECTION_ACCEPTED.includes(request.status)) throw new ConflictException(REVIEW_CALIBRATION_CHANGED)
      }
      const assignment = await em.getRepository(ReviewAssignment).findOne({ where: { id: assignmentId }, lock: { mode: 'pessimistic_write' } })
      if (!assignment || assignment.status !== seen.status) throw new ConflictException(REVIEW_CALIBRATION_CHANGED)
      const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: assignment.cycleId } })
      // الموظف اتنقل برّه نطاق اللي بيعاير في النص = غير موجود
      if (!cycle || !(await this.calibratorSees(em, user, assignment, cycle))) throw new NotFoundException(REVIEW_NOT_FOUND)
      const before = assignment.finalScore === null || assignment.finalScore === undefined ? null : Number(assignment.finalScore).toFixed(2)
      if (before === next) throw new BadRequestException(REVIEW_CALIBRATION_SAME)
      await em.getRepository(ReviewResponse).insert({ assignmentId: assignment.id, relation: 'CAL', answers: JSON.stringify({ before, after: next, objectionRequestId: objection?.requestId ?? null }),
        evidence: null, score: next, comment: reason, submittedByUserId: user.sub, submittedAt: new Date() })
      await em.getRepository(ReviewAssignment).update({ id: assignment.id }, { finalScore: next })
      await recordAudit(em, { category: 'SETTINGS', action: 'REVIEW_CALIBRATED', entityType: 'review_assignment', entityId: assignment.id, actorUserId: user.sub, branchId: assignment.branchId,
        summary: `معايرة تقييم في دورة «${cycle.name}»: ${before ?? '—'} ← ${next} — ${reason}`, before: { finalScore: before }, after: { finalScore: next, reason, objectionRequestId: objection?.requestId ?? null } })
    })
    return this.calibration(user, seen.cycleId)
  }

  // ===== التقييم نفسه (الموظف ومديره) =====

  /** أهداف الموظف في فترة الدورة (سارية أو اتحققت) — بنود قسم الأهداف */
  private async goalsOf(em: EntityManager, employeeId: number, cycle: ReviewCycle): Promise<Array<ReviewGoalRef & { targetValue: string | null; actualValue: string | null; unit: string | null }>> {
    if (!(await goalsReady(em))) return []
    const goals = await em.getRepository(PerformanceGoal).find({ where: { ownerType: 'EMPLOYEE', employeeId, status: In(['ACTIVE', 'DONE']) }, order: { id: 'ASC' } })
    return goals.filter((goal) => goal.kind !== 'PIP' && day(goal.periodStart) <= day(cycle.periodEnd) && day(goal.periodEnd) >= day(cycle.periodStart))
      .map((goal) => ({ id: goal.id, title: goal.title, weight: goal.weight, targetValue: goal.targetValue == null ? null : Number(goal.targetValue).toFixed(2),
        actualValue: goal.actualValue == null ? null : Number(goal.actualValue).toFixed(2), unit: goal.unit ?? null }))
  }

  /** لوحة الأدلة من النظام نفسه لفترة الدورة: الحضور (أيام بكل حالة، وأيام ودقايق التأخير)، والمهام (خلصت، مفتوحة، متأخرة)، والأهداف وتقدّمها */
  private async evidenceOf(em: EntityManager, employeeId: number, cycle: ReviewCycle) {
    const from = day(cycle.periodStart), to = day(cycle.periodEnd)
    const days = await em.getRepository(AttendanceDay).find({ where: { employeeId, date: Between(from, to) }, select: { id: true, status: true, lateMinutes: true } })
    const byStatus: Record<string, number> = {}
    for (const row of days) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    const tasks = await em.getRepository(Task).find({ where: { assigneeEmployeeId: employeeId } })
    const inPeriod = tasks.filter((task) => { const due = task.dueDate ? day(task.dueDate) : null; return due !== null && due >= from && due <= to })
    const today = day(new Date().toISOString())
    return {
      period: { from, to },
      attendance: { days: days.length, byStatus, lateDays: days.filter((row) => (row.lateMinutes ?? 0) > 0).length, lateMinutes: days.reduce((sum, row) => sum + (row.lateMinutes ?? 0), 0) },
      tasks: { total: inPeriod.length, done: inPeriod.filter((task) => task.status === 'DONE').length,
        overdue: inPeriod.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED' && day(task.dueDate) < today).length },
      goals: await this.goalsOf(em, employeeId, cycle),
    }
  }

  private listView(assignment: ReviewAssignment, cycle: ReviewCycle, employeeName: string | null, viewer: 'self' | 'manager') {
    const announced = assignment.status === 'ANNOUNCED' || assignment.status === 'ACKNOWLEDGED'
    return { id: assignment.id, cycleId: cycle.id, cycleName: cycle.name, kindLabel: REVIEW_CYCLE_KIND_LABELS[cycle.kind] ?? cycle.kind, cycleStatus: cycle.status,
      periodStart: day(cycle.periodStart), periodEnd: day(cycle.periodEnd), selfDueDate: day(cycle.selfDueDate), managerDueDate: day(cycle.managerDueDate),
      employeeId: assignment.employeeId, employeeName, status: assignment.status, statusLabel: REVIEW_STATUS_LABELS[assignment.status] ?? assignment.status,
      selfSubmitted: !!assignment.selfSubmittedAt, managerSubmitted: !!assignment.managerSubmittedAt, selfScore: score(assignment.selfScore),
      // تقييم المدير والدرجة النهائية للموظف بعد الإعلان بس
      managerScore: viewer === 'manager' || announced ? score(assignment.managerScore) : null, finalScore: viewer === 'manager' || announced ? score(assignment.finalScore) : null }
  }

  /** «تقييماتي»: تكليفات الموظف في الدورات اللي اتطلقت */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await reviewsReady(em))) return { available: false, reviews: [] }
    if (!user.employeeId) return { available: true, reviews: [] }
    const rows = await em.getRepository(ReviewAssignment).find({ where: { employeeId: user.employeeId }, order: { id: 'DESC' } })
    const cycles = new Map((rows.length ? await em.getRepository(ReviewCycle).find({ where: { id: In(rows.map((row) => row.cycleId)) } }) : []).map((row) => [row.id, row]))
    return { available: true, reviews: rows.filter((row) => cycles.has(row.cycleId)).map((row) => this.listView(row, cycles.get(row.cycleId)!, null, 'self')) }
  }

  /** «تقييم فريقي»: التكليفات اللي الحساب مقيِّمها (المدير المتثبّت وقت الإطلاق) */
  async team(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await reviewsReady(em))) return { available: false, reviews: [] }
    if (!user.employeeId) return { available: true, reviews: [] }
    const rows = await em.getRepository(ReviewAssignment).find({ where: { managerEmployeeId: user.employeeId }, order: { id: 'DESC' } })
    const cycles = new Map((rows.length ? await em.getRepository(ReviewCycle).find({ where: { id: In(rows.map((row) => row.cycleId)) } }) : []).map((row) => [row.id, row]))
    const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In(rows.map((row) => row.employeeId)) } }) : []).map((row) => [row.id, row.fullName]))
    return { available: true, reviews: rows.filter((row) => cycles.has(row.cycleId)).map((row) => this.listView(row, cycles.get(row.cycleId)!, people.get(row.employeeId) ?? null, 'manager')) }
  }

  /** علاقة الحساب بتكليف: صاحبه (ذاتي)، مقيِّمه (مدير)، أو إدارة الأداء في نطاقه — وإلا مالوش حق */
  private async relationTo(em: EntityManager, user: JwtPayload, assignment: ReviewAssignment, cycle: ReviewCycle): Promise<'self' | 'manager' | 'hr' | null> {
    if (user.employeeId && user.employeeId === assignment.employeeId) return 'self'
    if (user.employeeId && user.employeeId === assignment.managerEmployeeId) return 'manager'
    if (userHasPerm(user, REVIEWS_PERMISSION) && this.cycleInScope(user, cycle)) {
      const employee = await em.getRepository(Employee).findOne({ where: { id: assignment.employeeId } })
      if (employee && inBranchScope(branchScopeOf(user), employee.branchId)) return 'hr'
    }
    return null
  }

  /**
   * نموذج تقييم تكليف: نسخة النموذج المتجمّدة، وأهداف الموظف في الفترة، ولوحة الأدلة (الحيّة لحد التسليم، والمتجمّدة بعده)، والردود اللي القارئ له حق
   * يشوفها: الموظف شايف رده، ورد مديره بعد الإعلان بس؛ والمدير شايف رد الموظف بعد ما يتسلّم ورده هو؛ وإدارة الأداء شايفة الاتنين.
   */
  async form(user: JwtPayload, assignmentId: number) {
    const em = this.ds.manager
    await this.assertReady(em)
    const assignment = await em.getRepository(ReviewAssignment).findOne({ where: { id: assignmentId } })
    const cycle = assignment ? await em.getRepository(ReviewCycle).findOne({ where: { id: assignment.cycleId } }) : null
    const relation = assignment && cycle ? await this.relationTo(em, user, assignment, cycle) : null
    const template = parseTemplate(cycle?.templateSnapshot)
    if (!assignment || !cycle || !relation || !template) throw new NotFoundException(REVIEW_NOT_FOUND)
    const employee = await em.getRepository(Employee).findOne({ where: { id: assignment.employeeId } })
    const responses = await em.getRepository(ReviewResponse).find({ where: { assignmentId: assignment.id } })
    const announced = assignment.status === 'ANNOUNCED' || assignment.status === 'ACKNOWLEDGED'
    const shown = (kind: 'SELF' | 'MANAGER') => {
      const row = responses.find((response) => response.relation === kind)
      const allowed = kind === 'SELF' ? true : relation !== 'self' || announced
      return row && allowed ? { answers: JSON.parse(row.answers), score: score(row.score), comment: row.comment ?? null, submittedAt: row.submittedAt, evidence: row.evidence ? JSON.parse(row.evidence) : null } : null
    }
    const mine = relation === 'self' ? shown('SELF') : relation === 'manager' ? shown('MANAGER') : null
    // B3.8-أ: اعتراض الموظف على نتيجته المعلنة (طلب «اعتراض على تقييم أداء» المربوط بالتقييم) ومهلته
    const objection = announced ? await objectionOf(em, assignment) : null
    const objectionUntil = announced ? await objectionDeadline(em, assignment.id) : null
    return {
      ...this.listView(assignment, cycle, employee?.fullName ?? null, relation === 'self' ? 'self' : 'manager'), relation, template,
      goals: await this.goalsOf(em, assignment.employeeId, cycle),
      // اللي سلّم شايف الأدلة زي ما اتجمّدت مع رده؛ واللي لسه بيكتب شايفها حيّة
      evidence: mine?.evidence ?? (await this.evidenceOf(em, assignment.employeeId, cycle)),
      self: shown('SELF'), manager: shown('MANAGER'),
      // B3.7-ب: إقرار الموظف بالنتيجة المعلنة
      acknowledgement: (() => { const row = responses.find((response) => response.relation === 'ACK'); return row ? { comment: row.comment ?? null, at: row.submittedAt } : null })(),
      canAcknowledge: relation === 'self' && assignment.status === 'ANNOUNCED',
      objection: objection ? { requestId: objection.requestId, status: objection.status, statusLabel: OBJECTION_STATUS_LABELS[objection.status] ?? objection.status } : null,
      objectionUntil,
      canObject: relation === 'self' && announced && !objection && (!objectionUntil || Date.now() <= objectionUntil.getTime()),
      canSubmit: cycle.status === 'ACTIVE' && ((relation === 'self' && !assignment.selfSubmittedAt) || (relation === 'manager' && !assignment.managerSubmittedAt)),
    }
  }

  /**
   * تسليم تقييم (ذاتي من الموظف، أو من مديره المقيِّم) — مرة واحدة، تحت قفل صف التكليف: الدورة لسه شغالة، والرد ده ماتسلّمش قبل كده. الإجابات على
   * نموذج الدورة المتجمّد وأهداف الفترة، والدرجة بالأوزان، ولوحة الأدلة بتتجمّد مع الرد. تسليم المدير بيقفل التكليف «المدير سلّم» وبيبقى هو الدرجة النهائية.
   */
  async submit(user: JwtPayload, assignmentId: number, input: { answers?: unknown; comment?: unknown }) {
    if (!user.employeeId) throw new NotFoundException(REVIEW_NOT_FOUND)
    const comment = optionalText(input.comment, REVIEW_TEXT_MAX, 'التعليق العام')
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const assignment = await em.getRepository(ReviewAssignment).findOne({ where: { id: assignmentId }, lock: { mode: 'pessimistic_write' } })
      const relation: ReviewRelation | null = !assignment ? null : assignment.employeeId === user.employeeId ? 'SELF' : assignment.managerEmployeeId === user.employeeId ? 'MANAGER' : null
      // تكليف مش للحساب (لا صاحبه ولا مقيِّمه) زي اللي مش موجود
      if (!assignment || !relation) throw new NotFoundException(REVIEW_NOT_FOUND)
      const cycle = await em.getRepository(ReviewCycle).findOne({ where: { id: assignment.cycleId } })
      const template: ReviewTemplateShape | null = parseTemplate(cycle?.templateSnapshot)
      if (!cycle || !template) throw new NotFoundException(REVIEW_NOT_FOUND)
      if (cycle.status !== 'ACTIVE') throw new BadRequestException('الدورة مش شغالة — مفيش تسليم')
      if (relation === 'SELF' ? assignment.selfSubmittedAt : assignment.managerSubmittedAt) throw new ConflictException(REVIEW_SUBMITTED)
      const evidence = await this.evidenceOf(em, assignment.employeeId, cycle)
      const answers = cleanAnswers(template, input.answers, evidence.goals)
      const total = reviewScore(template, answers, evidence.goals)
      const now = new Date(), text = total === null ? null : total.toFixed(2)
      await em.getRepository(ReviewResponse).insert({ assignmentId: assignment.id, relation, answers: JSON.stringify(answers), evidence: JSON.stringify(evidence), score: text, comment,
        submittedByUserId: user.sub, submittedAt: now })
      await em.getRepository(ReviewAssignment).update({ id: assignment.id }, relation === 'SELF' ? { selfSubmittedAt: now, selfScore: text }
        : { managerSubmittedAt: now, managerScore: text, finalScore: text, status: 'COMPLETED' })
    })
    return this.form(user, assignmentId)
  }
}
