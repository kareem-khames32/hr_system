import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { localYmd } from '../auth/preboarding'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { Employee } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { Branch } from '../org/entities/branch.entity'
import { recordOutboxEvent } from '../queue/outbox'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { recordTaskLog } from '../tasks/task-extras'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import { tasksTableReady } from '../tasks/task-rules'
import {
  PROBATION_CHANGED, PROBATION_DAYS_KEY, PROBATION_NOTICE_DEFAULT, PROBATION_NOTICE_KEY, PROBATION_NOT_ON, daysBetween, effectiveProbationEnd, extensionDate,
  probationReason, probationStamp, probationTaskTitle, terminationTaskTitle, type ProbationDecision,
} from './probation'

export interface ProbationDecisionInput { decision: ProbationDecision; newEndDate?: string; reason?: string }

// B3.1-ج: فترة التجربة — قايمة اللي تحت التجربة (للموارد البشرية بنطاق فروعها، وللمدير المباشر مرؤوسيه)، والقرار، ومهمة المدير قبل النهاية
@Injectable()
export class ProbationService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly resolver: ApproverResolver,
    private readonly modules: ModulesService,
  ) {}

  private async number(key: string, fallback: number): Promise<number> {
    const row = await this.ds.getRepository(RequestsConfig).findOne({ where: { key } })
    const value = Number(String(row?.value ?? '').trim())
    return row && String(row.value ?? '').trim() !== '' && Number.isInteger(value) && value >= 0 ? Math.min(value, 3650) : fallback
  }

  async settings() {
    return { noticeDays: await this.number(PROBATION_NOTICE_KEY, PROBATION_NOTICE_DEFAULT), defaultDays: await this.number(PROBATION_DAYS_KEY, 0) }
  }

  /**
   * اللي تحت التجربة: بصلاحية عرض الموظفين موظفين نطاق فروع الحساب، ولأي حساب مربوط بموظف مرؤوسيه المباشرين في الهيكل (ولو في فرع
   * برّه نطاقه: بالاسم من غير الفرع، زي «فريقي»). الأقرب نهاية أولًا.
   */
  async list(user: JwtPayload) {
    const { noticeDays, defaultDays } = await this.settings()
    const scope = branchScopeOf(user), today = localYmd()
    const reports = user.employeeId ? (await this.resolver.directReportsOf(user.employeeId)).filter((id) => id !== user.employeeId) : []
    const employees = this.ds.getRepository(Employee)
    const rows = new Map<number, Employee>()
    if (userHasPerm(user, 'employees.view') && !isEmptyBranchScope(scope)) {
      for (const emp of await employees.find({ where: { status: 'probation', isActive: true, ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) } })) rows.set(emp.id, emp)
    }
    for (let at = 0; at < reports.length; at += 1000) {
      for (const emp of await employees.find({ where: { id: In(reports.slice(at, at + 1000)), status: 'probation', isActive: true } })) rows.set(emp.id, emp)
    }
    const visible = [...rows.values()]
    const branchIds = [...new Set(visible.filter((emp) => inBranchScope(scope, emp.branchId)).map((emp) => emp.branchId))]
    const branchName = new Map((branchIds.length ? await this.ds.getRepository(Branch).find({ where: { id: In(branchIds) } }) : []).map((branch) => [branch.id, branch.name]))
    const list = visible.map((emp) => {
      const end = effectiveProbationEnd(emp, defaultDays), inScope = inBranchScope(scope, emp.branchId)
      return {
        id: emp.id, employeeCode: emp.employeeCode, fullName: emp.fullName, jobTitle: emp.jobTitle ?? null,
        // فرع برّه نطاق الحساب (مرؤوس مباشر في فرع تاني): من غير رقم الفرع ولا اسمه
        branchId: inScope ? emp.branchId : null, branchName: inScope ? branchName.get(emp.branchId) ?? null : null,
        joinDate: emp.joinDate ? String(emp.joinDate).slice(0, 10) : null,
        probationEndDate: end.date, endFromDefault: end.fromDefault, daysLeft: end.date ? daysBetween(today, end.date) : null,
        canDecide: (inScope && userHasPerm(user, 'employees.edit')) || reports.includes(emp.id),
      }
    }).sort((a, b) => (a.probationEndDate ?? '9999').localeCompare(b.probationEndDate ?? '9999') || a.fullName.localeCompare(b.fullName, 'ar'))
    return { today, noticeDays, defaultDays, canManageSettings: userHasPerm(user, 'settings.manage'), employees: list }
  }

  /**
   * قرار فترة التجربة: المدير المباشر (هيكليًا) أو الموارد البشرية (تعديل الموظفين في فرعه). تثبيت = الحالة «نشط»؛ تمديد = تاريخ نهاية
   * جديد بسبب؛ إنهاء = القرار بيتسجّل ومهمة «فتح ملف إنهاء خدمة» على الموارد البشرية (الملف نفسه بمساره وصلاحيته). القرار في سجل
   * تغييرات الموظف، ومهمة القرار المفتوحة على المدير بتتقفل. حق صاحب القرار بيتحكم قبل المعاملة (حل المدير المباشر خدمة تانية)،
   * وتحت قفل صف الموظف الصف بيتقارن باللي اتحكم عليه والحالة بتتقري من جديد.
   */
  async decide(user: JwtPayload, employeeId: number, dto: ProbationDecisionInput) {
    const scope = branchScopeOf(user)
    const seen = await this.ds.getRepository(Employee).findOne({ where: { id: employeeId } })
    const reports = user.employeeId ? await this.resolver.directReportsOf(user.employeeId) : []
    const manager = !!seen && seen.id !== user.employeeId && reports.includes(seen.id)
    // برّه نطاق الفروع ومش مرؤوس مباشر = غير موجود
    if (!seen || (!inBranchScope(scope, seen.branchId) && !manager)) throw new NotFoundException('الموظف غير موجود')
    const hr = inBranchScope(scope, seen.branchId) && userHasPerm(user, 'employees.edit')
    if (!hr && !manager) throw new ForbiddenException('قرار فترة التجربة للمدير المباشر أو الموارد البشرية')
    const { defaultDays } = await this.settings()
    const today = localYmd()
    const reason = probationReason(dto.reason, dto.decision !== 'CONFIRM')
    return this.ds.transaction(async (em) => {
      const emp = await em.getRepository(Employee).findOne({ where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
      if (!emp || probationStamp(emp) !== probationStamp(seen)) throw new ConflictException(PROBATION_CHANGED)
      if (emp.status !== 'probation' || !emp.isActive) throw new BadRequestException(PROBATION_NOT_ON)
      const currentEnd = effectiveProbationEnd(emp, defaultDays).date
      let status: string = emp.status, endDate = currentEnd
      if (dto.decision === 'CONFIRM') {
        status = 'active'
        await em.update(Employee, { id: emp.id }, { status: 'active' })
        await recordEmployeeChange(em, { employeeId: emp.id, fieldName: 'status', oldValue: 'probation', newValue: 'active',
          reason: `تثبيت بعد فترة التجربة${reason ? `: ${reason}` : ''}`, changedByUserId: user.sub })
      } else if (dto.decision === 'EXTEND') {
        endDate = extensionDate(dto.newEndDate, today, currentEnd)
        await em.update(Employee, { id: emp.id }, { probationEndDate: endDate })
        await recordEmployeeChange(em, { employeeId: emp.id, fieldName: 'probationEndDate', oldValue: emp.probationEndDate ? String(emp.probationEndDate).slice(0, 10) : null,
          newValue: endDate, reason: `تمديد فترة التجربة: ${reason}`, changedByUserId: user.sub })
      } else {
        await recordEmployeeChange(em, { employeeId: emp.id, fieldName: 'probationDecision', oldValue: null, newValue: 'TERMINATE',
          reason: `قرار إنهاء في فترة التجربة: ${reason}`, changedByUserId: user.sub })
      }
      if (await tasksTableReady(em)) {
        await this.closeDecisionTasks(em, user, emp)
        if (dto.decision === 'TERMINATE') await this.openTerminationTask(em, emp, reason ?? '', today)
      }
      return { employeeId: emp.id, decision: dto.decision, status, probationEndDate: endDate }
    })
  }

  /** مهام «قرار فترة التجربة» المفتوحة للموظف (من النظام) بتتقفل «خلصت» لما القرار يتسجّل */
  private async closeDecisionTasks(em: EntityManager, user: JwtPayload, emp: Employee) {
    const tasks = em.getRepository(Task)
    const open = await tasks.find({ where: { createdByUserId: 0, title: probationTaskTitle(emp), status: In([...TASK_OPEN_STATUSES]) }, lock: { mode: 'pessimistic_write' } })
    const now = new Date()
    for (const task of open) {
      await tasks.update({ id: task.id }, { status: 'DONE', statusNote: 'اتسجّل قرار فترة التجربة', closedByUserId: user.sub, closedAt: now, updatedAt: now })
      await recordTaskLog(em, user, task, 'DONE', 'اتقفلت لوحدها: قرار فترة التجربة اتسجّل')
    }
  }

  /** قرار «إنهاء»: مهمة على الموارد البشرية في فرع الموظف تفتح ملف إنهاء الخدمة (لو مفيش واحدة مفتوحة) */
  private async openTerminationTask(em: EntityManager, emp: Employee, reason: string, today: string) {
    const tasks = em.getRepository(Task), title = terminationTaskTitle(emp)
    if (await tasks.findOne({ where: { createdByUserId: 0, title, status: In([...TASK_OPEN_STATUSES]) }, select: { id: true } })) return
    const task = await tasks.save(tasks.create(this.systemTask({ title, description: reason, assigneeEmployeeId: null, assigneeRole: 'hr', branchId: emp.branchId, dueDate: today })))
    await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
  }

  private systemTask(fields: Pick<Task, 'title' | 'description' | 'assigneeEmployeeId' | 'assigneeRole' | 'branchId' | 'dueDate'>) {
    const now = new Date()
    return { ...fields, createdByUserId: 0, priority: 'NORMAL', status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null, statusNote: null,
      closedByUserId: null, closedAt: null, remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now }
  }

  /**
   * المهمة اليومية (onboarding.probation-tasks): لكل موظف تحت التجربة نهايته خلال أيام التنبيه — مهمة «قرار فترة التجربة» على مديره
   * المباشر (ومن غير مدير: على الموارد البشرية في فرعه)، مرة واحدة لكل تاريخ نهاية (تمديد = مهمة جديدة). كل موظف في معاملته وتحت قفل
   * صفه: الحالة والتاريخ بيتقروا بعد القفل. المدير المباشر بيتحل قبل المعاملة.
   */
  async raiseDecisionTasks(today: string = localYmd()): Promise<number> {
    if (!(await this.modules.jobEnabled('onboarding.probation-tasks'))) return 0
    const { noticeDays, defaultDays } = await this.settings()
    if (noticeDays <= 0 || !(await tasksTableReady(this.ds.manager))) return 0
    const due = (emp: Employee) => {
      const end = effectiveProbationEnd(emp, defaultDays).date
      return end && end >= today && daysBetween(today, end) <= noticeDays ? end : null
    }
    let made = 0
    for (const candidate of await this.ds.getRepository(Employee).find({ where: { status: 'probation', isActive: true }, order: { id: 'ASC' } })) {
      const end = due(candidate)
      if (!end) continue
      const resolved = candidate.managerEmployeeId ?? (await this.resolver.directManagerOf(candidate.id))
      const managerId = resolved && resolved !== candidate.id ? resolved : null
      made += await this.ds.transaction(async (em) => {
        const emp = await em.getRepository(Employee).findOne({ where: { id: candidate.id }, lock: { mode: 'pessimistic_write' } })
        if (!emp || emp.status !== 'probation' || !emp.isActive || due(emp) !== end) return 0
        const title = probationTaskTitle(emp)
        const [existing]: unknown[] = await em.query('SELECT TOP (1) [id] FROM [tasks] WHERE [createdByUserId] = 0 AND [title] = @0 AND [dueDate] = @1', [title, end])
        if (existing) return 0
        const tasks = em.getRepository(Task)
        const task = await tasks.save(tasks.create(this.systemTask({ title, description: `نهاية فترة التجربة ${end} — سجّل القرار من «فترات التجربة»: تثبيت أو تمديد أو إنهاء`,
          assigneeEmployeeId: managerId, assigneeRole: managerId ? null : 'hr', branchId: emp.branchId, dueDate: end })))
        await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
        return 1
      })
    }
    return made
  }
}
