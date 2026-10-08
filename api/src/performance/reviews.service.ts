import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { Between, DataSource, In, type EntityManager } from 'typeorm'
import { AttendanceDay } from '../attendance/attendance.entities'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Task } from '../tasks/task.entity'
import { PerformanceGoal } from './goal.entities'
import { goalsReady } from './goal-rules'
import { ReviewAssignment, ReviewCycle, ReviewResponse, ReviewTemplate, type ReviewRelation } from './review.entities'
import {
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
  /** الدورة في نطاق فروع الحساب: حساب من غير قيد فروع شايف الكل؛ وحساب الفروع شايف الدورة اللي كل فروعها من فروعه (دورة «كل الشركة» مش له) */
  private cycleInScope(user: JwtPayload, cycle: ReviewCycle): boolean {
    const scope = branchScopeOf(user)
    if (scope === null) return true
    const branches = cycle.branchIds ? ids(cycle.branchIds) : null
    return !!branches && branches.length > 0 && branches.every((id) => inBranchScope(scope, id))
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

  // ===== التقييم نفسه (الموظف ومديره) =====

  /** أهداف الموظف في فترة الدورة (سارية أو اتحققت) — بنود قسم الأهداف */
  private async goalsOf(em: EntityManager, employeeId: number, cycle: ReviewCycle): Promise<Array<ReviewGoalRef & { targetValue: string | null; actualValue: string | null; unit: string | null }>> {
    if (!(await goalsReady(em))) return []
    const goals = await em.getRepository(PerformanceGoal).find({ where: { ownerType: 'EMPLOYEE', employeeId, status: In(['ACTIVE', 'DONE']) }, order: { id: 'ASC' } })
    return goals.filter((goal) => day(goal.periodStart) <= day(cycle.periodEnd) && day(goal.periodEnd) >= day(cycle.periodStart))
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
    const shown = (kind: ReviewRelation) => {
      const row = responses.find((response) => response.relation === kind)
      const allowed = kind === 'SELF' ? true : relation !== 'self' || announced
      return row && allowed ? { answers: JSON.parse(row.answers), score: score(row.score), comment: row.comment ?? null, submittedAt: row.submittedAt, evidence: row.evidence ? JSON.parse(row.evidence) : null } : null
    }
    const mine = relation === 'self' ? shown('SELF') : relation === 'manager' ? shown('MANAGER') : null
    return {
      ...this.listView(assignment, cycle, employee?.fullName ?? null, relation === 'self' ? 'self' : 'manager'), relation, template,
      goals: await this.goalsOf(em, assignment.employeeId, cycle),
      // اللي سلّم شايف الأدلة زي ما اتجمّدت مع رده؛ واللي لسه بيكتب شايفها حيّة
      evidence: mine?.evidence ?? (await this.evidenceOf(em, assignment.employeeId, cycle)),
      self: shown('SELF'), manager: shown('MANAGER'),
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
