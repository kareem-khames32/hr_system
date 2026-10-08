import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Department } from '../org/entities/department.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Task } from '../tasks/task.entity'
import { PerformanceGoal, PerformanceGoalUpdate, type GoalStatus, type GoalUpdateKind } from './goal.entities'
import {
  GOALS_MIGRATION_MISSING, GOAL_CHANGED, GOAL_FORBIDDEN, GOAL_KIND_LABELS, GOAL_PIP, GOAL_NOT_FOUND, GOAL_STATUS_LABELS, cleanGoalKind, cleanGoalOwner, cleanGoalPeriod, cleanGoalReason,
  cleanGoalText, cleanGoalTitle, cleanGoalValue, cleanGoalWeight, goalEmployeeStamp, goalsReady,
} from './goal-rules'

export interface GoalInput {
  ownerType?: unknown; employeeId?: unknown; departmentId?: unknown; parentGoalId?: unknown; kind?: unknown; title?: unknown; description?: unknown; weight?: unknown
  targetValue?: unknown; unit?: unknown; periodStart?: unknown; periodEnd?: unknown; reason?: unknown
}
/** دور القارئ على الهدف: صاحبه، مديره المباشر، الموارد البشرية (بالصلاحية والنطاق)، أو قارئ بس (هدف قسمه أو الشركة) */
export type GoalRole = 'owner' | 'manager' | 'hr' | 'viewer'
export const GOALS_PERMISSION = 'performance.manage'
const ENDED = ['terminated', 'archived']
const amount = (value: unknown): string | null => (value === null || value === undefined ? null : Number(value).toFixed(2))
const day = (value: unknown): string => String(value).slice(0, 10)

// B3.6: أهداف الأداء. حق كل إجراء من الهيكل (صاحب الهدف، مديره المباشر) أو من الصلاحية بنطاق الفروع (الموارد البشرية). الحكم على الدور قبل
// المعاملة (حل المدير خدمة تانية)، وجوه المعاملة صف الهدف بيتقفل وحالته بتتحكم تاني، وصف الموظف بيتقفل ويتقارن باللي اتحكم عليه.
@Injectable()
export class GoalsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly resolver: ApproverResolver) {}

  private async assertReady(em: EntityManager) {
    if (!(await goalsReady(em))) throw new BadRequestException(GOALS_MIGRATION_MISSING)
  }
  private hr(user: JwtPayload, branchId: number | null | undefined): boolean {
    return userHasPerm(user, GOALS_PERMISSION) && branchId != null && inBranchScope(branchScopeOf(user), branchId)
  }

  /** دور القارئ على هدف (بالوضع الحالي لصاحب الهدف)، أو null لو مالوش حق يشوفه */
  private async roleOn(user: JwtPayload, goal: PerformanceGoal): Promise<{ role: GoalRole | null; employee: Employee | null }> {
    const em = this.ds.manager
    if (goal.ownerType === 'EMPLOYEE') {
      const employee = goal.employeeId != null ? await em.getRepository(Employee).findOne({ where: { id: goal.employeeId } }) : null
      if (!employee) return { role: null, employee: null }
      if (user.employeeId && user.employeeId === employee.id) return { role: 'owner', employee }
      if (this.hr(user, employee.branchId)) return { role: 'hr', employee }
      if (user.employeeId && (await this.resolver.directManagerOf(employee.id)) === user.employeeId) return { role: 'manager', employee }
      return { role: null, employee }
    }
    const me = user.employeeId ? await em.getRepository(Employee).findOne({ where: { id: user.employeeId } }) : null
    if (goal.ownerType === 'DEPARTMENT') {
      const department = goal.departmentId != null ? await em.getRepository(Department).findOne({ where: { id: goal.departmentId } }) : null
      if (!department) return { role: null, employee: null }
      if (this.hr(user, department.branchId)) return { role: 'hr', employee: null }
      return { role: me && me.departmentId === department.id && goal.status === 'ACTIVE' ? 'viewer' : null, employee: null }
    }
    // هدف شركة: إدارته لصاحب الصلاحية من غير قيد فروع؛ والساري منه بيتقري لكل الموظفين
    if (userHasPerm(user, GOALS_PERMISSION) && branchScopeOf(user) === null) return { role: 'hr', employee: null }
    return { role: (me || userHasPerm(user, GOALS_PERMISSION)) && goal.status === 'ACTIVE' ? 'viewer' : null, employee: null }
  }

  private can(role: GoalRole, goal: PerformanceGoal) {
    const lead = role === 'manager' || role === 'hr'
    return {
      decide: goal.status === 'PROPOSED' && lead,
      progress: goal.status === 'ACTIVE' && (lead || (role === 'owner' && goal.ownerType === 'EMPLOYEE')),
      change: goal.status === 'ACTIVE' && lead,
      close: (goal.status === 'ACTIVE' && lead) || (goal.status === 'PROPOSED' && (lead || role === 'owner')),
      evidence: goal.status === 'ACTIVE' && goal.ownerType === 'EMPLOYEE' && role !== 'viewer',
    }
  }

  private async views(em: EntityManager, goals: PerformanceGoal[], roleOf: (goal: PerformanceGoal) => GoalRole) {
    if (!goals.length) return []
    const employeeIds = [...new Set(goals.map((goal) => goal.employeeId).filter((id): id is number => id != null))]
    const departmentIds = [...new Set(goals.map((goal) => goal.departmentId).filter((id): id is number => id != null))]
    const parentIds = [...new Set(goals.map((goal) => goal.parentGoalId).filter((id): id is number => id != null))]
    const employees = new Map((employeeIds.length ? await em.getRepository(Employee).find({ where: { id: In(employeeIds) } }) : []).map((row) => [row.id, row]))
    const departments = new Map((departmentIds.length ? await em.getRepository(Department).find({ where: { id: In(departmentIds) } }) : []).map((row) => [row.id, row]))
    // عنوان الهدف الأب لو هدف قسم أو شركة (أهداف الموظفين التانيين مابتتعرضش عناوينها)
    const parents = new Map((parentIds.length ? await em.getRepository(PerformanceGoal).find({ where: { id: In(parentIds) } }) : []).map((row) => [row.id, row]))
    return goals.map((goal) => {
      const role = roleOf(goal), parent = goal.parentGoalId != null ? parents.get(goal.parentGoalId) : undefined
      const target = goal.targetValue != null ? Number(goal.targetValue) : null, actual = goal.actualValue != null ? Number(goal.actualValue) : null
      return {
        id: goal.id, ownerType: goal.ownerType, employeeId: goal.employeeId ?? null, employeeName: goal.employeeId != null ? employees.get(goal.employeeId)?.fullName ?? null : null,
        departmentId: goal.departmentId ?? null, departmentName: goal.departmentId != null ? departments.get(goal.departmentId)?.name ?? null : null,
        parentGoalId: goal.parentGoalId ?? null, parentTitle: parent && parent.ownerType !== 'EMPLOYEE' ? parent.title : null,
        kind: goal.kind, kindLabel: GOAL_KIND_LABELS[goal.kind] ?? goal.kind, title: goal.title, description: goal.description ?? null, weight: goal.weight,
        targetValue: amount(goal.targetValue), unit: goal.unit ?? null, actualValue: amount(goal.actualValue),
        // نسبة الإنجاز لما فيه مستهدف موجب: الفعلي ÷ المستهدف
        progressPercent: target !== null && target > 0 && actual !== null ? Math.max(0, Math.round((actual / target) * 1000) / 10) : null,
        periodStart: day(goal.periodStart), periodEnd: day(goal.periodEnd), status: goal.status, statusLabel: GOAL_STATUS_LABELS[goal.status] ?? goal.status,
        decisionReason: goal.decisionReason ?? null, role, can: this.can(role, goal),
      }
    })
  }

  /** «أهدافي»: أهداف الموظف (بكل حالاتها)، وأهداف قسمه والشركة السارية للقراءة، ومجموع أوزان أهدافه السارية */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await goalsReady(em))) return { available: false, message: GOALS_MIGRATION_MISSING, weightTotal: 0, goals: [], shared: [] }
    const me = user.employeeId ? await em.getRepository(Employee).findOne({ where: { id: user.employeeId } }) : null
    if (!me) return { available: true, weightTotal: 0, goals: [], shared: [] }
    const repo = em.getRepository(PerformanceGoal)
    const own = await repo.find({ where: { ownerType: 'EMPLOYEE', employeeId: me.id }, order: { id: 'DESC' } })
    const shared = [
      ...(me.departmentId != null ? await repo.find({ where: { ownerType: 'DEPARTMENT', departmentId: me.departmentId, status: 'ACTIVE' }, order: { id: 'DESC' } }) : []),
      ...(await repo.find({ where: { ownerType: 'COMPANY', status: 'ACTIVE' }, order: { id: 'DESC' } })),
    ]
    return { available: true, weightTotal: own.filter((goal) => goal.status === 'ACTIVE').reduce((sum, goal) => sum + goal.weight, 0),
      goals: await this.views(em, own, () => 'owner'), shared: await this.views(em, shared, () => 'viewer') }
  }

  /** «فريقي»: أهداف المرؤوسين المباشرين (من الهيكل) */
  async team(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await goalsReady(em))) return { available: false, message: GOALS_MIGRATION_MISSING, manager: false, reports: [], goals: [] }
    const reports = user.employeeId ? (await this.resolver.directReportsOf(user.employeeId)).filter((id) => id !== user.employeeId) : []
    if (!reports.length) return { available: true, manager: false, reports: [], goals: [] }
    const goals = await em.getRepository(PerformanceGoal).find({ where: { ownerType: 'EMPLOYEE', employeeId: In(reports) }, order: { id: 'DESC' } })
    // المرؤوسين الشغالين (لنموذج «هدف لمرؤوس»)
    const people = (await em.getRepository(Employee).find({ where: { id: In(reports) }, order: { fullName: 'ASC' } })).filter((row) => row.isActive !== false && !ENDED.includes(row.status))
    return { available: true, manager: true, reports: people.map((row) => ({ id: row.id, fullName: row.fullName })), goals: await this.views(em, goals, () => 'manager') }
  }

  /** «كل الأهداف» (بالصلاحية): أهداف موظفين وأقسام نطاق فروع الحساب (بالفرع الحالي)، وأهداف الشركة */
  async all(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await goalsReady(em))) return { available: false, message: GOALS_MIGRATION_MISSING, canManageCompany: false, goals: [] }
    const scope = branchScopeOf(user), repo = em.getRepository(PerformanceGoal)
    const within = scope !== null ? { branchId: branchIdIn(scope) } : {}
    const employees = isEmptyBranchScope(scope) ? [] : await em.getRepository(Employee).find({ where: within, select: { id: true } })
    const departments = isEmptyBranchScope(scope) ? [] : await em.getRepository(Department).find({ where: within, select: { id: true } })
    const goals = [
      ...(employees.length ? await repo.find({ where: { ownerType: 'EMPLOYEE', employeeId: In(employees.map((row) => row.id)) } }) : []),
      ...(departments.length ? await repo.find({ where: { ownerType: 'DEPARTMENT', departmentId: In(departments.map((row) => row.id)) } }) : []),
      ...(await repo.find({ where: scope === null ? { ownerType: 'COMPANY' } : { ownerType: 'COMPANY', status: 'ACTIVE' } })),
    ].sort((a, b) => b.id - a.id)
    return { available: true, canManageCompany: scope === null, goals: await this.views(em, goals, (goal) => (goal.ownerType === 'COMPANY' && scope !== null ? 'viewer' : 'hr')) }
  }

  /** هدف وسجله (للي له حق يشوفه، وإلا غير موجود). اسم صاحب السطر لو حسابه في نطاق القارئ أو هو نفسه */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager
    await this.assertReady(em)
    const goal = await em.getRepository(PerformanceGoal).findOne({ where: { id } })
    const { role } = goal ? await this.roleOn(user, goal) : { role: null }
    if (!goal || !role) throw new NotFoundException(GOAL_NOT_FOUND)
    const updates = await em.getRepository(PerformanceGoalUpdate).find({ where: { goalId: goal.id }, order: { id: 'DESC' } })
    const actors = new Map((updates.length ? await em.getRepository(User).find({ where: { id: In([...new Set(updates.map((row) => row.byUserId))]) } }) : []).map((row) => [row.id, row]))
    const scope = branchScopeOf(user)
    return {
      ...(await this.views(em, [goal], () => role))[0],
      updates: updates.map((row) => {
        const actor = actors.get(row.byUserId)
        return { id: row.id, kind: row.kind, actualValue: amount(row.actualValue), note: row.note ?? null, changes: row.changes ? JSON.parse(row.changes) : null, taskId: row.taskId ?? null,
          at: row.createdAt, byName: actor && (actor.id === user.sub || inBranchScope(scope, actor.branchId)) ? actor.displayName : null }
      }),
    }
  }

  private log(em: EntityManager, user: JwtPayload, goalId: number, kind: GoalUpdateKind, extra: Partial<PerformanceGoalUpdate> = {}) {
    return em.getRepository(PerformanceGoalUpdate).insert({ goalId, kind, actualValue: null, note: null, changes: null, taskId: null, byUserId: user.sub, createdAt: new Date(), ...extra })
  }

  /** صف الموظف صاحب الهدف بيتقفل ويتقارن باللي حق صاحب الإجراء اتحكم عليه */
  private async holdEmployee(em: EntityManager, judged: Employee | null) {
    if (!judged) return
    const fresh = await em.getRepository(Employee).findOne({ where: { id: judged.id }, lock: { mode: 'pessimistic_write' } })
    if (goalEmployeeStamp(fresh) !== goalEmployeeStamp(judged)) throw new ConflictException(GOAL_CHANGED)
  }

  /**
   * هدف جديد. لموظف: لنفسه = «مقترح» (مستني مديره)؛ لمرؤوس مباشر أو (بالصلاحية) لموظف في النطاق = «ساري». لقسم أو للشركة: بالصلاحية.
   * الهدف الأب اختياري ولازم يكون هدف قسم أو شركة القارئ شايفه.
   */
  async create(user: JwtPayload, input: GoalInput) {
    const ownerType = cleanGoalOwner(input.ownerType ?? 'EMPLOYEE'), kind = cleanGoalKind(input.kind ?? 'GOAL'), title = cleanGoalTitle(input.title)
    const description = cleanGoalText(input.description, 1000, 'وصف الهدف'), weight = cleanGoalWeight(input.weight ?? 0)
    const targetValue = cleanGoalValue(input.targetValue), unit = cleanGoalText(input.unit, 30, 'الوحدة'), period = cleanGoalPeriod(input.periodStart, input.periodEnd)
    // B3.8-ب: خطة التحسين لموظف بس ومن غير وزن
    if (kind === 'PIP' && (ownerType !== 'EMPLOYEE' || weight !== 0)) throw new BadRequestException(GOAL_PIP)
    const em0 = this.ds.manager
    await this.assertReady(em0)
    let employee: Employee | null = null, department: Department | null = null, status: GoalStatus = 'ACTIVE', branchId: number | null = null
    if (ownerType === 'EMPLOYEE') {
      const employeeId = input.employeeId === undefined || input.employeeId === null ? user.employeeId : Number(input.employeeId)
      employee = employeeId && Number.isSafeInteger(employeeId) ? await em0.getRepository(Employee).findOne({ where: { id: employeeId } }) : null
      const own = !!employee && employee.id === user.employeeId
      const lead = !!employee && !own && (this.hr(user, employee.branchId) || (!!user.employeeId && (await this.resolver.directManagerOf(employee.id)) === user.employeeId))
      // موظف مش في حق القارئ زي اللي مش موجود
      if (!employee || (!own && !lead)) throw new NotFoundException('الموظف غير موجود')
      if (employee.isActive === false || ENDED.includes(employee.status)) throw new BadRequestException('ملف الموظف مش شغال — مفيش أهداف تتعمل له')
      if (kind === 'PIP' && own) throw new BadRequestException(GOAL_PIP)
      status = own ? 'PROPOSED' : 'ACTIVE'; branchId = employee.branchId ?? null
    } else if (ownerType === 'DEPARTMENT') {
      const departmentId = Number(input.departmentId)
      department = Number.isSafeInteger(departmentId) ? await em0.getRepository(Department).findOne({ where: { id: departmentId } }) : null
      if (!department || !this.hr(user, department.branchId)) throw new NotFoundException('القسم غير موجود')
      branchId = department.branchId
    } else if (!userHasPerm(user, GOALS_PERMISSION) || branchScopeOf(user) !== null) {
      throw new ForbiddenException('أهداف الشركة لصاحب صلاحية إدارة الأداء من غير قيد فروع')
    }
    let parentGoalId: number | null = null
    if (input.parentGoalId !== undefined && input.parentGoalId !== null) {
      const parent = Number.isSafeInteger(input.parentGoalId) ? await em0.getRepository(PerformanceGoal).findOne({ where: { id: input.parentGoalId as number } }) : null
      if (!parent || parent.ownerType === 'EMPLOYEE' || parent.status !== 'ACTIVE' || !(await this.roleOn(user, parent)).role) throw new BadRequestException('الهدف الأب لازم يكون هدف قسم أو شركة ساري')
      parentGoalId = parent.id
    }
    const id = await this.ds.transaction(async (em) => {
      await this.holdEmployee(em, employee)
      const now = new Date()
      const row = await em.getRepository(PerformanceGoal).save(em.getRepository(PerformanceGoal).create({
        ownerType, employeeId: employee?.id ?? null, departmentId: department?.id ?? null, branchId, parentGoalId, kind, title, description, weight, targetValue, unit, actualValue: null,
        ...period, status, proposedByUserId: user.sub, decidedByUserId: status === 'ACTIVE' ? user.sub : null, decidedAt: status === 'ACTIVE' ? now : null, decisionReason: null,
        createdAt: now, closedAt: null,
      }))
      await this.log(em, user, row.id, 'STATUS', { changes: JSON.stringify({ after: { status } }) })
      return row.id
    })
    return this.detail(user, id)
  }

  /** إجراء على هدف: الدور قبل المعاملة، وجوّاها قفل صف الهدف وحكم حالته تاني، وقفل صف الموظف ومقارنته */
  private async mutate(user: JwtPayload, id: number, allowed: (role: GoalRole, goal: PerformanceGoal) => boolean,
    work: (em: EntityManager, goal: PerformanceGoal) => Promise<void>) {
    const em0 = this.ds.manager
    await this.assertReady(em0)
    const seen = await em0.getRepository(PerformanceGoal).findOne({ where: { id } })
    const judged = seen ? await this.roleOn(user, seen) : { role: null, employee: null }
    if (!seen || !judged.role) throw new NotFoundException(GOAL_NOT_FOUND)
    if (!allowed(judged.role, seen)) throw new ForbiddenException(GOAL_FORBIDDEN)
    await this.ds.transaction(async (em) => {
      const goal = await em.getRepository(PerformanceGoal).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      // الحالة أو صاحب الهدف اتغيّروا بعد الحكم: الحكم يتعاد من الأول
      if (!goal || goal.status !== seen.status || goal.employeeId !== seen.employeeId || goal.departmentId !== seen.departmentId) throw new ConflictException(GOAL_CHANGED)
      await this.holdEmployee(em, judged.employee)
      await work(em, goal)
    })
    return this.detail(user, id)
  }

  /** اعتماد أو رفض هدف مقترح — لمدير صاحبه المباشر أو للموارد البشرية (مش لصاحبه) */
  decide(user: JwtPayload, id: number, rawDecision: unknown, rawReason: unknown) {
    if (rawDecision !== 'approve' && rawDecision !== 'reject') throw new BadRequestException('القرار: approve أو reject')
    const reason = rawDecision === 'reject' ? cleanGoalReason(rawReason) : cleanGoalText(rawReason, 300, 'السبب')
    const status: GoalStatus = rawDecision === 'approve' ? 'ACTIVE' : 'REJECTED'
    return this.mutate(user, id, (role, goal) => this.can(role, goal).decide, async (em, goal) => {
      await em.getRepository(PerformanceGoal).update({ id: goal.id }, { status, decidedByUserId: user.sub, decidedAt: new Date(), decisionReason: reason })
      await this.log(em, user, goal.id, 'STATUS', { note: reason, changes: JSON.stringify({ before: { status: goal.status }, after: { status } }) })
    })
  }

  /** تحديث التقدّم: الفعلي وتعليق — صاحب الهدف أو مديره أو الموارد البشرية */
  progress(user: JwtPayload, id: number, input: { actualValue?: unknown; note?: unknown }) {
    const actualValue = cleanGoalValue(input.actualValue), note = cleanGoalText(input.note, 1000, 'التعليق')
    if (actualValue === null) throw new BadRequestException('القيمة الفعلية مطلوبة')
    return this.mutate(user, id, (role, goal) => this.can(role, goal).progress, async (em, goal) => {
      await em.getRepository(PerformanceGoal).update({ id: goal.id }, { actualValue })
      await this.log(em, user, goal.id, 'PROGRESS', { actualValue, note })
    })
  }

  /** تعديل في نص الفترة: بسبب إجباري، والخانات المبعوتة بس، وسطر فيه قبل وبعد */
  change(user: JwtPayload, id: number, input: GoalInput) {
    const reason = cleanGoalReason(input.reason)
    return this.mutate(user, id, (role, goal) => this.can(role, goal).change, async (em, goal) => {
      const patch: Partial<PerformanceGoal> = {}
      if (input.title !== undefined) patch.title = cleanGoalTitle(input.title)
      if (input.description !== undefined) patch.description = cleanGoalText(input.description, 1000, 'وصف الهدف')
      if (input.weight !== undefined) patch.weight = cleanGoalWeight(input.weight)
      if (goal.kind === 'PIP' && patch.weight !== undefined && patch.weight !== 0) throw new BadRequestException(GOAL_PIP)
      if (input.targetValue !== undefined) patch.targetValue = cleanGoalValue(input.targetValue)
      if (input.unit !== undefined) patch.unit = cleanGoalText(input.unit, 30, 'الوحدة')
      if (input.periodEnd !== undefined) patch.periodEnd = cleanGoalPeriod(day(goal.periodStart), input.periodEnd).periodEnd
      const current: Record<string, unknown> = { title: goal.title, description: goal.description ?? null, weight: goal.weight, targetValue: amount(goal.targetValue), unit: goal.unit ?? null, periodEnd: day(goal.periodEnd) }
      const changed = Object.keys(patch).filter((key) => (patch as Record<string, unknown>)[key] !== current[key])
      if (!changed.length) throw new BadRequestException('مفيش تعديل في الهدف')
      await em.getRepository(PerformanceGoal).update({ id: goal.id }, Object.fromEntries(changed.map((key) => [key, (patch as Record<string, unknown>)[key]])))
      await this.log(em, user, goal.id, 'CHANGE', { note: reason, changes: JSON.stringify({ before: Object.fromEntries(changed.map((key) => [key, current[key]])),
        after: Object.fromEntries(changed.map((key) => [key, (patch as Record<string, unknown>)[key]])) }) })
    })
  }

  /** قفل الهدف: «اتحقق» أو «ملغي» (والمقترح صاحبه يسحبه) */
  close(user: JwtPayload, id: number, rawStatus: unknown, rawNote: unknown) {
    if (rawStatus !== 'DONE' && rawStatus !== 'CANCELLED') throw new BadRequestException('الحالة: DONE أو CANCELLED')
    const note = cleanGoalText(rawNote, 1000, 'الملاحظة')
    return this.mutate(user, id, (role, goal) => this.can(role, goal).close && !(rawStatus === 'DONE' && goal.status !== 'ACTIVE'), async (em, goal) => {
      await em.getRepository(PerformanceGoal).update({ id: goal.id }, { status: rawStatus, closedAt: new Date() })
      await this.log(em, user, goal.id, 'STATUS', { note, changes: JSON.stringify({ before: { status: goal.status }, after: { status: rawStatus } }) })
    })
  }

  /** مهمة كدليل: مهمة مسؤولها صاحب الهدف، مرة واحدة للهدف */
  evidence(user: JwtPayload, id: number, rawTaskId: unknown) {
    if (!Number.isSafeInteger(rawTaskId) || (rawTaskId as number) < 1) throw new BadRequestException('رقم المهمة غير صالح')
    return this.mutate(user, id, (role, goal) => this.can(role, goal).evidence, async (em, goal) => {
      const task = await em.getRepository(Task).findOne({ where: { id: rawTaskId as number } })
      // مهمة مش على صاحب الهدف زي اللي مش موجودة
      if (!task || task.assigneeEmployeeId == null || task.assigneeEmployeeId !== goal.employeeId) throw new NotFoundException('المهمة غير موجودة')
      if (await em.getRepository(PerformanceGoalUpdate).count({ where: { goalId: goal.id, kind: 'EVIDENCE', taskId: task.id } })) throw new ConflictException('المهمة دي مربوطة بالهدف قبل كده')
      await this.log(em, user, goal.id, 'EVIDENCE', { taskId: task.id, note: task.title })
    })
  }
}
