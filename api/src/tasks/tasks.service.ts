import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { Brackets, DataSource, In, Not, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee, type EmployeeStatus } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { OffboardingService } from '../offboarding/offboarding.service'
import { OnboardingService } from '../onboarding/onboarding.service'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { recordOutboxEvent } from '../queue/outbox'
import { ApproverResolver, FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { completeExecution, executionOwnRequest, executionRequestOfTask, executionRequestsOfTasks, EXECUTION_TASK_CANCEL_BLOCKED, EXECUTION_TASK_CLOSE_BLOCKED, EXECUTION_TASK_EDIT_BLOCKED, EXECUTION_TASK_OWN_BLOCKED, EXECUTION_TASK_REOPEN_BLOCKED } from '../requests/execution-tasks'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Task, TASK_OPEN_STATUSES, type TaskPriority, type TaskStatus } from './task.entity'
import {
  isTaskDate, isTaskRole, taskAccess, taskAddDays, taskAwaitsAccount, taskDaysBetween, taskIdChunks, taskLocalDate, taskManagedBy, taskRolesHeldBy, tasksTableReady,
  TASK_NOT_FOUND, TASK_ROLE_LABELS, TASKS_DAYS_MAX, TASKS_ESCALATION_DAYS_DEFAULT, TASKS_ESCALATION_DAYS_KEY, TASKS_MIGRATION_MISSING,
  TASKS_REMINDER_DAYS_DEFAULT, TASKS_REMINDER_DAYS_KEY,
} from './task-rules'

// B2.5: محرك المهام.
//  المهمة العامة (جدول tasks): صاحب «إدارة المهام» يكلّف أي موظف أو دور في نطاقه، والمدير المباشر يكلّف مرؤوسيه من غير صلاحية.
//  «اللي كلّف بيها» (createdByUserId) هو آخر حد كلّف مسؤولها الحالي: اللي يحوّلها بيبقى هو.
//  «مهامي»: المهام العامة اللي عليّ + مهام التهيئة اللي على جهتي + بنود الإخلاء اللي عليّ — التهيئة والإخلاء بيتقروا من خدماتهم
//  بنفس حكمهم، وإقفالهم من شاشاتهم (قاعدة «الموجود أولًا»).
//  التذكير والتصعيد: مهمة مجدولة يومية بتسجّل حدث في الطابور، ومحرك الإشعارات (B2.4) بيبعته.
//  قبل ترحيل 088: «مهامي» بتعرض التهيئة والإخلاء بس، والمهمة العامة مرفوضة برسالة.

const INACTIVE: EmployeeStatus[] = ['terminated', 'archived']
// أقصى صفوف في قايمة واحدة
const LIST_LIMIT = 500
// المهام المقفولة بتفضل ظاهرة في «فريقي» المدة دي
const TEAM_CLOSED_DAYS = 14

export interface TaskInput {
  title?: string
  description?: string | null
  assigneeEmployeeId?: number | null
  assigneeRole?: string | null
  branchId?: number | null
  dueDate?: string | null
  priority?: string
  requiresProof?: boolean
}
export interface TaskStatusInput { status: string; note?: string; proofNote?: string; proofFileId?: number }
export interface TaskListFilter { status?: string; overdue?: string; assigneeEmployeeId?: string; branchId?: string }

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name)

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly resolver: ApproverResolver,
    private readonly onboarding: OnboardingService,
    private readonly offboarding: OffboardingService,
    private readonly modules: ModulesService
  ) {}

  /** جدول المهام موجود (ترحيل 088)؟ */
  ready(em: EntityManager = this.ds.manager): Promise<boolean> {
    return tasksTableReady(em)
  }

  /**
   * حل المدير المباشر على اتصال المعاملة نفسها: المعاملة اللي ماسكة صف المهمة ماتطلبش اتصال تاني من المجمّع (طلبات متزامنة أكتر من
   * حجم المجمّع كانت هتستنى بعض لحد المهلة).
   */
  private resolverOn(em: EntityManager): ApproverResolver {
    return em === this.ds.manager ? this.resolver
      : new ApproverResolver(em.getRepository(Employee), em.getRepository(Team), em.getRepository(Department), em.getRepository(Branch))
  }

  private async days(key: string, fallback: number): Promise<number> {
    const row = await this.ds.getRepository(RequestsConfig).findOne({ where: { key } })
    const value = Number(row?.value)
    return row && Number.isInteger(value) && value >= 0 && value <= TASKS_DAYS_MAX ? value : fallback
  }

  // ===== «مهامي» =====
  /** المهام العامة المفتوحة اللي على الحساب: موظفها، أو حامل دورها في نطاق فرعها */
  private async myOpenTasks(user: JwtPayload): Promise<Task[]> {
    if (!(await this.ready())) return []
    const roles = taskRolesHeldBy(user), scope = branchScopeOf(user)
    const byRole = roles.length > 0 && !isEmptyBranchScope(scope)
    if (!user.employeeId && !byRole) return []
    const rows = await this.ds.getRepository(Task).createQueryBuilder('t')
      .where('t.status IN (:...open)', { open: TASK_OPEN_STATUSES })
      .andWhere(new Brackets(qb => {
        qb.where('1 = 0')
        if (user.employeeId) qb.orWhere('t.assigneeEmployeeId = :me', { me: user.employeeId })
        if (byRole) qb.orWhere(`(t.assigneeRole IN (:...roles)${scope !== null ? ' AND t.branchId IN (:...scope)' : ''})`, { roles, ...(scope !== null ? { scope } : {}) })
      }))
      // لو أكتر من الحد: الأقرب موعدًا الأول (اللي من غير موعد في الآخر)
      .orderBy('CASE WHEN t.dueDate IS NULL THEN 1 ELSE 0 END', 'ASC').addOrderBy('t.dueDate', 'ASC').addOrderBy('t.id', 'ASC')
      .take(LIST_LIMIT).getMany()
    return rows.filter(task => taskAwaitsAccount(user, task))
  }

  /**
   * بنود الإخلاء اللي على الحساب. «بنودي في الإخلاء» (myItems) بتدّي مدير النظام («*») بنود كل الجهات لأنه يقدر يقفل أي بند؛ في
   * «مهامي» هو زي مهام الأدوار وخطوات الاعتماد: مش كل بنود الشركة «عليه» — بنده كمدير مباشر لصاحب الملف بس.
   */
  private async myClearance(user: JwtPayload) {
    const items = await this.offboarding.myItems(user)
    if (user.role !== 'super_admin' && !(user.permissions ?? []).includes('*')) return items
    const own: typeof items = []
    for (const item of items) {
      if (item.party === 'manager' && !!user.employeeId && (await this.resolver.directManagerOf(item.employeeId)) === user.employeeId) own.push(item)
    }
    return own
  }

  /** الصندوق: المهام العامة + مهام التهيئة اللي على جهتي + بنود الإخلاء اللي عليّ. كل مصدر بحكمه، ولو موديوله مقفول مابيظهرش */
  private async inbox(user: JwtPayload) {
    // الموديولين الأول، وبعدها المصادر التلاتة مع بعض: وعد مصدر اتبدأ ماينفعش يفضل من غير مستمع وإحنا مستنيين حاجة تانية
    const [onboardingOn, offboardingOn] = await Promise.all([this.modules.allowedFor('onboarding', user), this.modules.allowedFor('offboarding', user)])
    const [tasks, onboarding, clearance] = await Promise.all([
      this.myOpenTasks(user),
      onboardingOn ? this.onboarding.myOpenTasks(user) : [],
      offboardingOn ? this.myClearance(user) : [],
    ])
    const today = taskLocalDate(new Date())
    const overdue = tasks.filter(task => !!task.dueDate && task.dueDate < today).length + onboarding.filter(task => !!task.dueDate && task.dueDate < today).length
    return { tasks, onboarding, clearance, counts: { open: tasks.length + onboarding.length + clearance.length, overdue } }
  }

  async mine(user: JwtPayload) {
    const inbox = await this.inbox(user)
    return { available: await this.ready(), tasks: await this.views(user, inbox.tasks), onboarding: inbox.onboarding, clearance: inbox.clearance, counts: inbox.counts }
  }

  /** عدّاد القايمة الجانبية */
  async mineCount(user: JwtPayload) {
    return (await this.inbox(user)).counts
  }

  // ===== «فريقي»: مهام مرؤوسي المدير المباشرين =====
  async team(user: JwtPayload) {
    const reports = user.employeeId ? await this.resolver.directReportsOf(user.employeeId) : []
    if (!reports.length || !(await this.ready())) return { manager: reports.length > 0, tasks: [] }
    const since = new Date(Date.now() - TEAM_CLOSED_DAYS * 86_400_000)
    const rows: Task[] = []
    // المرؤوسين بدفعات (حد معاملات SQL)، والأحدث الأول لو المجموع أكتر من الحد
    for (const part of taskIdChunks(reports)) {
      rows.push(...await this.ds.getRepository(Task).createQueryBuilder('t')
        .where('t.assigneeEmployeeId IN (:...part)', { part })
        .andWhere(new Brackets(qb => qb.where('t.status IN (:...open)', { open: TASK_OPEN_STATUSES }).orWhere('t.closedAt >= :since', { since })))
        .orderBy('t.id', 'DESC').take(LIST_LIMIT).getMany())
    }
    rows.sort((a, b) => b.id - a.id)
    return { manager: true, tasks: await this.views(user, rows.slice(0, LIST_LIMIT), reports) }
  }

  // ===== قايمة المهام لصاحب «عرض كل المهام» في نطاقه =====
  async list(user: JwtPayload, filter: TaskListFilter = {}) {
    if (!(await this.ready())) return { available: false, tasks: [] }
    const scope = branchScopeOf(user)
    const status = ['open', 'done', 'cancelled', 'all'].includes(String(filter.status)) ? String(filter.status) : 'open'
    const qb = this.ds.getRepository(Task).createQueryBuilder('t').where('1 = 1')
    if (scope !== null) qb.andWhere('t.branchId IN (:...scope)', { scope: scope.length ? scope : [-1] })
    if (status === 'open') qb.andWhere('t.status IN (:...open)', { open: TASK_OPEN_STATUSES })
    else if (status !== 'all') qb.andWhere('t.status = :status', { status: status === 'done' ? 'DONE' : 'CANCELLED' })
    if (filter.overdue === '1') {
      qb.andWhere('t.status IN (:...overdueOpen)', { overdueOpen: TASK_OPEN_STATUSES }).andWhere('t.dueDate < :today', { today: taskLocalDate(new Date()) })
    }
    if (/^\d{1,9}$/.test(String(filter.assigneeEmployeeId ?? ''))) qb.andWhere('t.assigneeEmployeeId = :assignee', { assignee: Number(filter.assigneeEmployeeId) })
    if (/^\d{1,9}$/.test(String(filter.branchId ?? ''))) qb.andWhere('t.branchId = :branch', { branch: Number(filter.branchId) })
    return { available: true, tasks: await this.views(user, await qb.orderBy('t.id', 'DESC').take(LIST_LIMIT).getMany()) }
  }

  // ===== بيانات نموذج التكليف: مين أقدر أكلّفه =====
  async assignees(user: JwtPayload) {
    const canManage = userHasPerm(user, 'tasks.manage'), scope = branchScopeOf(user)
    const employees = this.ds.getRepository(Employee)
    const select = { id: true, fullName: true, employeeCode: true, jobTitle: true, branchId: true } as const
    const reports = user.employeeId ? await this.resolver.directReportsOf(user.employeeId) : []
    // بالأرقام بدفعات (حد معاملات SQL)
    const byIds = async (ids: number[]) => {
      const found: Employee[] = []
      for (const part of taskIdChunks(ids)) found.push(...await employees.find({ where: { id: In(part), status: Not(In(INACTIVE)) }, select }))
      return found
    }
    const rows = canManage
      ? await employees.find({ where: { status: Not(In(INACTIVE)), ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) }, select })
      : await byIds(reports)
    // مرؤوس مباشر برّه نطاق صاحب الصلاحية (مدير عنده «إدارة المهام» على فرع واحد)
    const inScope = new Set(rows.map(row => row.id))
    const extra = canManage ? await byIds(reports.filter(id => !inScope.has(id))) : []
    const all = [...rows, ...extra].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.id - b.id)
    const branches = await this.ds.getRepository(Branch).find({ where: canManage && scope !== null ? { id: branchIdIn(scope) } : {}, select: { id: true, name: true }, order: { name: 'ASC' } })
    const branchName = new Map(branches.map(branch => [branch.id, branch.name]))
    return {
      available: await this.ready(), canManage, canAssign: canManage || all.length > 0,
      employees: all.map(row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, jobTitle: row.jobTitle ?? null, branchName: branchName.get(row.branchId) ?? null })),
      // مهمة الدور (لكل حاملي الدور في الفرع المختار) لصاحب الصلاحية بس
      roles: canManage ? FUNCTIONAL_APPROVER_ROLES.map(role => ({ key: role, label: TASK_ROLE_LABELS[role] })) : [],
      branches: canManage ? branches.map(branch => ({ id: branch.id, name: branch.name })) : [],
    }
  }

  // ===== التكليف =====
  private cleanTitle(title: unknown): string {
    const value = String(title ?? '').replace(/\s+/g, ' ').trim()
    if (value.length < 2 || value.length > 200) throw new BadRequestException('عنوان المهمة من حرفين لـ200 حرف')
    return value
  }

  private cleanText(value: unknown, max: number): string | null {
    const text = String(value ?? '').trim()
    if (text.length > max) throw new BadRequestException(`النص أطول من ${max} حرف`)
    return text || null
  }

  /** الموعد: يوم حقيقي، والجديد مايبقاش قبل النهارده (موعد فات = تذكير وتصعيد من أول يوم) */
  private cleanDueDate(value: unknown, previous: string | null = null): string | null {
    if (value == null || value === '') return null
    if (!isTaskDate(value)) throw new BadRequestException('موعد المهمة تاريخ بصيغة YYYY-MM-DD')
    if (value !== previous && value < taskLocalDate(new Date())) throw new BadRequestException('موعد المهمة مايبقاش قبل النهارده')
    return value
  }

  /**
   * المسؤول وفرع المهمة. الموظف: «إدارة المهام» وفرعه في نطاقي، أو أنا مديره المباشر (من غير صلاحية ومن غير قيد فرع، زي خطوات
   * الاعتماد الهيكلية). الدور: «إدارة المهام» وفرع من نطاقي. موظف برّه ده = نفس الرد سواء موجود أو لأ.
   */
  private async assignment(user: JwtPayload, input: Pick<TaskInput, 'assigneeEmployeeId' | 'assigneeRole' | 'branchId'>, em: EntityManager = this.ds.manager) {
    const canManage = userHasPerm(user, 'tasks.manage'), scope = branchScopeOf(user)
    const byEmployee = input.assigneeEmployeeId != null, byRole = input.assigneeRole != null && input.assigneeRole !== ''
    if (byEmployee === byRole) throw new BadRequestException('اختار مسؤول واحد للمهمة: موظف أو دور')
    if (byRole) {
      if (!canManage) throw new ForbiddenException('تكليف دور بمهمة لصاحب صلاحية «إدارة المهام» بس')
      if (!isTaskRole(input.assigneeRole)) throw new BadRequestException('الدور غير معروف')
      const branch = input.branchId != null ? await em.getRepository(Branch).findOne({ where: { id: input.branchId } }) : null
      if (!branch || !inBranchScope(scope, branch.id)) throw new BadRequestException('اختار فرع المهمة من فروعك')
      return { assigneeEmployeeId: null, assigneeRole: input.assigneeRole, branchId: branch.id }
    }
    const employee = await em.getRepository(Employee).findOne({ where: { id: Number(input.assigneeEmployeeId) } })
    const inScope = canManage && !!employee && inBranchScope(scope, employee.branchId)
    const mine = !inScope && !!employee && !!user.employeeId && employee.id !== user.employeeId && (await this.resolverOn(em).directManagerOf(employee.id)) === user.employeeId
    if (!inScope && !mine) {
      if (canManage) throw new NotFoundException('الموظف غير موجود')
      throw new ForbiddenException('تكليف المهام للمدير المباشر للموظف أو لصاحب صلاحية «إدارة المهام»')
    }
    if (INACTIVE.includes(employee!.status)) throw new BadRequestException('الموظف مش على رأس العمل')
    return { assigneeEmployeeId: employee!.id, assigneeRole: null, branchId: employee!.branchId }
  }

  async create(user: JwtPayload, input: TaskInput) {
    if (!(await this.ready())) throw new BadRequestException(TASKS_MIGRATION_MISSING)
    const title = this.cleanTitle(input.title)
    const description = this.cleanText(input.description, 2000)
    const dueDate = this.cleanDueDate(input.dueDate)
    const assignment = await this.assignment(user, input)
    const now = new Date()
    const saved = await this.ds.transaction(async em => {
      const repo = em.getRepository(Task)
      const row = await repo.save(repo.create({
        title, description, ...assignment, createdByUserId: user.sub, dueDate, priority: (input.priority ?? 'NORMAL') as TaskPriority, status: 'OPEN',
        requiresProof: input.requiresProof === true, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null,
        remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
      }))
      await this.recordEvent(em, 'TASK_ASSIGNED', row)
      return row
    })
    return (await this.views(user, [saved]))[0]
  }

  // حدث المهمة في نفس معاملة تغييرها — مراجع بس (زي أحداث الطلبات). حدثي التذكير والتأخير بيشيلوا كمان رقم ختم المهمة اللي اتسجّل معاهم
  // (وقت، مش محتوى): محرك الإشعارات بيقارنه بختم المهمة الحالي وقت التوزيع ووقت الإرسال (taskStampCurrent)
  private async recordEvent(em: EntityManager, type: 'TASK_ASSIGNED' | 'TASK_DUE_SOON' | 'TASK_OVERDUE', task: Task, stamp?: Date | null) {
    await recordOutboxEvent(em, { type, entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId, ...(stamp ? { stamp: stamp.getTime() } : {}) } })
  }

  // ===== القراءة والتعديل =====
  /** المهمة للحساب اللي يشوفها — برّه كده «غير موجودة» */
  private async load(user: JwtPayload, id: number, em: EntityManager = this.ds.manager, lock = false) {
    if (!(await this.ready(em))) throw new NotFoundException(TASK_NOT_FOUND)
    const task = await em.getRepository(Task).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!task) throw new NotFoundException(TASK_NOT_FOUND)
    const access = await taskAccess(user, task, employeeId => this.resolverOn(em).directManagerOf(employeeId))
    if (!access.visible) throw new NotFoundException(TASK_NOT_FOUND)
    return { task, access }
  }

  async detail(user: JwtPayload, id: number) {
    return (await this.views(user, [(await this.load(user, id)).task]))[0]
  }

  /** تعديل المهمة المفتوحة: اللي بيديرها (taskManagedBy). تغيير المسؤول = تكليف جديد بنفس شروط التكليف، واللي حوّلها بيبقى هو اللي كلّف بيها */
  async update(user: JwtPayload, id: number, input: TaskInput) {
    const saved = await this.ds.transaction(async em => {
      // B2.6: مهمة تنفيذ طلب معتمد مسؤولها من إعداد نوع الطلب — ماتتعدّلش ولا تتحوّل من هنا: مسؤولها بيقرا الطلب، فتحويلها كان
      // هيدّي «إدارة المهام» حق تختار مين يقراه. (الربط بالطلب ثابت من يوم ما المهمة اتفتحت، فبيتقري قبل قفل صفها)
      const execution = await executionRequestOfTask(em, id)
      const { task, access } = await this.load(user, id, em, true)
      if (!access.manage) throw new ForbiddenException('تعديل المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
      if (execution) throw new BadRequestException(EXECUTION_TASK_EDIT_BLOCKED)
      if (!TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) throw new BadRequestException('المهمة مقفولة — افتحها تاني الأول')
      if (input.title !== undefined) task.title = this.cleanTitle(input.title)
      if (input.description !== undefined) task.description = this.cleanText(input.description, 2000)
      // null في الأولوية والإثبات = الخانة مش مبعوتة (العمودين مايقبلوش فاضي)
      if (input.priority != null) task.priority = input.priority
      if (input.requiresProof != null) task.requiresProof = input.requiresProof === true
      // نفس الموظف اتبعت تاني مش تحويل، حتى لو اتنقل فرع من يوم التكليف: المهمة بتفضل في الفرع اللي اتكلّف فيه
      const roleSent = input.assigneeRole != null && input.assigneeRole !== ''
      const sameEmployee = !roleSent && input.assigneeEmployeeId != null && input.assigneeEmployeeId === task.assigneeEmployeeId
      let reassigned = false
      if (!sameEmployee && (input.assigneeEmployeeId !== undefined || input.assigneeRole !== undefined)) {
        const next = await this.assignment(user, input, em)
        reassigned = next.assigneeEmployeeId !== task.assigneeEmployeeId || next.assigneeRole !== task.assigneeRole || next.branchId !== task.branchId
        // اللي حوّل المهمة بقى هو اللي كلّف بيها: اللي كلّف قبله مايفضلش ليه حق على مسؤول ماختاروش (ممكن يكون برّه حقه أصلًا)
        if (reassigned) Object.assign(task, next, { status: 'OPEN', statusNote: null, createdByUserId: user.sub })
      }
      if (input.dueDate !== undefined) {
        const dueDate = this.cleanDueDate(input.dueDate, task.dueDate)
        if (dueDate !== task.dueDate) { task.dueDate = dueDate; task.remindedAt = null; task.escalatedAt = null }
      }
      if (reassigned) { task.remindedAt = null; task.escalatedAt = null }
      task.updatedAt = new Date()
      await em.getRepository(Task).save(task)
      if (reassigned) await this.recordEvent(em, 'TASK_ASSIGNED', task)
      return task
    })
    return (await this.views(user, [saved]))[0]
  }

  /**
   * تغيير الحالة. المسؤول: «جاري»، «مستنية» بسبب، «خلصت». صاحب الإدارة: «خلصت»، «اتلغت» بسبب، وإعادة فتح المقفولة بسبب.
   * «خلصت» والمهمة مطلوب لها إثبات: نص أو ملف رفعه اللي بيقفل (نوعه task ومش مستعمل في مهمة تانية).
   * إعادة الفتح بتشيل إثبات الإقفال اللي فات (زي مهام التهيئة) — عشان كده سببها إلزامي وبيفضل على المهمة.
   */
  async setStatus(user: JwtPayload, id: number, input: TaskStatusInput) {
    const saved = await this.ds.transaction(async em => {
      // B2.6: مهمة تنفيذ طلب معتمد — صف طلبها بيتقفل قبل صفها (نفس ترتيب الاعتماد ورفض التنفيذ)
      const execution = await executionRequestOfTask(em, id, true)
      const { task, access } = await this.load(user, id, em, true)
      // مهمة تنفيذ طلب بيشتغل عليها اللي هي عليه، أو مدير النظام (فكّ الانسداد) — ومش صاحب الطلب ولا منشئه: نفس قاعدتي الاعتماد
      const own = !!execution && executionOwnRequest(user, execution, this.resolver.hasHrOverride(user))
      const work = execution ? !own && (access.work || user.role === 'super_admin') : access.work
      const open = TASK_OPEN_STATUSES.includes(task.status as TaskStatus)
      const next = input.status as TaskStatus
      const note = this.cleanText(input.note, 500)
      if (next === task.status) throw new BadRequestException('المهمة على الحالة دي فعلًا')
      if (next === 'OPEN') {
        if (open) throw new BadRequestException('المهمة مفتوحة فعلًا')
        if (!access.manage) throw new ForbiddenException('إعادة فتح المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
        // مهمة تنفيذ طلب: بتقفل الطلب معاها (مكتمل، أو مرفوض تنفيذه)، فماتتفتحش تاني
        if (execution) throw new BadRequestException(EXECUTION_TASK_REOPEN_BLOCKED)
        if (!note) throw new BadRequestException('اكتب سبب إعادة فتح المهمة')
        Object.assign(task, { status: 'OPEN', statusNote: note, closedByUserId: null, closedAt: null, proofNote: null, proofFileId: null, remindedAt: null, escalatedAt: null })
      } else {
        if (!open) throw new BadRequestException('المهمة مقفولة')
        if (next === 'CANCELLED') {
          if (!access.manage) throw new ForbiddenException('إلغاء المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
          if (execution) throw new BadRequestException(EXECUTION_TASK_CANCEL_BLOCKED)
          if (!note) throw new BadRequestException('اكتب سبب الإلغاء')
          Object.assign(task, { status: 'CANCELLED', statusNote: note, closedByUserId: user.sub, closedAt: new Date() })
        } else if (next === 'DONE') {
          // مهمة تنفيذ طلب: اللي بيقفلها بيتكتب في سجل الطلب وبيبقى طرف فيه — للي بيشتغل عليها بس، مش لمجرد «إدارة المهام»
          if (!work && (execution || !access.manage)) {
            throw new ForbiddenException(own ? EXECUTION_TASK_OWN_BLOCKED : execution ? EXECUTION_TASK_CLOSE_BLOCKED : 'إقفال المهمة لمسؤولها أو لمنشئها')
          }
          const proofNote = this.cleanText(input.proofNote, 1000)
          const proofFileId = input.proofFileId ?? null
          if (proofFileId !== null) await this.assertProofFile(em, user, proofFileId, task.id)
          if (task.requiresProof && !proofNote && proofFileId === null) throw new BadRequestException('المهمة دي مطلوب لها إثبات: اكتب اللي اتعمل أو ارفع ملف')
          Object.assign(task, { status: 'DONE', statusNote: null, proofNote, proofFileId, closedByUserId: user.sub, closedAt: new Date() })
          // مهمة تنفيذ طلب: الطلب «مكتمل» في نفس المعاملة، وسطر «اتنفّذ» في سجله
          if (execution) await completeExecution(em, execution.requestId, user.sub, proofNote)
        } else {
          // «جاري» و«مستنية»: شغل المسؤول نفسه
          if (!work) throw new ForbiddenException(own ? EXECUTION_TASK_OWN_BLOCKED : 'الحالة دي بيغيّرها مسؤول المهمة')
          if (next === 'WAITING' && !note) throw new BadRequestException('اكتب المهمة مستنية إيه')
          Object.assign(task, { status: next, statusNote: next === 'WAITING' ? note : null })
        }
      }
      task.updatedAt = new Date()
      return em.getRepository(Task).save(task)
    })
    return (await this.views(user, [saved]))[0]
  }

  /**
   * ملف الإثبات: رفعه اللي بيقفل، بنوع task، ومش إثبات مهمة تانية — رقم ملف مخمَّن مايتربطش. صف الملف بيتقفل لحد آخر المعاملة:
   * إقفالين لمهمتين بنفس الملف في نفس اللحظة، التاني بيستنى وبيلاقيه اتربط.
   */
  private async assertProofFile(em: EntityManager, user: JwtPayload, fileId: number, taskId: number) {
    const file = await em.getRepository(StoredFile).findOne({ where: { id: fileId }, lock: { mode: 'pessimistic_write' } })
    if (!file || file.entityType !== 'task' || file.uploadedBy !== user.sub) throw new BadRequestException('ملف الإثبات غير صالح — ارفعه من شاشة المهمة')
    if (await em.getRepository(Task).count({ where: { proofFileId: fileId, id: Not(taskId) } })) throw new BadRequestException('ملف الإثبات مستعمل في مهمة تانية')
  }

  // ===== التذكير والتصعيد (مهمة مجدولة يومية) =====
  /**
   * تذكير المسؤول لما الموعد يقرب (tasks.reminder_days_before)، وتصعيد لمدير المسؤول بعد التأخير (tasks.escalation_days_after؛ صفر =
   * من غير تصعيد). مرة واحدة لكل مهمة وموعد: الختم والحدث في معاملة واحدة تحت قفل صف المهمة.
   */
  async runReminders(today: string = taskLocalDate(new Date())) {
    const result = { reminded: 0, escalated: 0 }
    // الاسم حرفي هنا: حارس المهام المجدولة بيطابقه بسجل الموديولات
    if (!(await this.modules.jobEnabled('tasks.reminders')) || !(await this.ready())) return result
    const reminderDays = await this.days(TASKS_REMINDER_DAYS_KEY, TASKS_REMINDER_DAYS_DEFAULT)
    const escalationDays = await this.days(TASKS_ESCALATION_DAYS_KEY, TASKS_ESCALATION_DAYS_DEFAULT)
    // المرشحين بالتاريخ من القاعدة: اللي موعدها جوه نافذة التذكير ولسه مااتذكّرتش، واللي تأخيرها وصل أيام التصعيد ولسه مااتصعّدتش —
    // مهمة مفتوحة من غير ما حاجة تتعمل لها ماتتفحصش كل يوم. والحكم النهائي تحت قفل صفها
    const due: Array<{ id: number }> = await this.ds.getRepository(Task).createQueryBuilder('t').select('t.id', 'id')
      .where('t.status IN (:...open)', { open: TASK_OPEN_STATUSES })
      .andWhere(new Brackets(qb => {
        qb.where('(t.remindedAt IS NULL AND t.dueDate BETWEEN :from AND :to)', { from: today, to: taskAddDays(today, reminderDays) })
        if (escalationDays > 0) qb.orWhere('(t.escalatedAt IS NULL AND t.dueDate <= :late)', { late: taskAddDays(today, -escalationDays) })
      }))
      .orderBy('t.id', 'ASC').getRawMany()
    for (const { id } of due) {
      try {
        const sent = await this.ds.transaction(async em => {
          const task = await em.getRepository(Task).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
          if (!task?.dueDate || !TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) return null
          const left = taskDaysBetween(today, task.dueDate)
          const remind = !task.remindedAt && left >= 0 && left <= reminderDays
          const escalate = escalationDays > 0 && !task.escalatedAt && -left >= escalationDays
          if (!remind && !escalate) return null
          if (remind) task.remindedAt = new Date()
          if (escalate) task.escalatedAt = new Date()
          await em.getRepository(Task).save(task)
          // الختم زي ما القاعدة بترجّعه: نفس القراءة اللي فحص الإرسال هيقارن بيها بعدين
          const stamped = await em.getRepository(Task).findOneOrFail({ where: { id }, select: { id: true, remindedAt: true, escalatedAt: true } })
          if (remind) await this.recordEvent(em, 'TASK_DUE_SOON', task, stamped.remindedAt)
          if (escalate) await this.recordEvent(em, 'TASK_OVERDUE', task, stamped.escalatedAt)
          return { remind, escalate }
        })
        // العدّ بعد ما المعاملة تثبت
        if (sent?.remind) result.reminded++
        if (sent?.escalate) result.escalated++
      } catch (error) {
        this.logger.error(`تعذر تذكير أو تصعيد المهمة #${id} — باقي المهام مكمّلة`, (error as Error).stack)
      }
    }
    return result
  }

  // ===== شكل المهمة للواجهة =====
  private async views(user: JwtPayload, tasks: Task[], knownReports?: number[]) {
    if (!tasks.length) return []
    const ids = <T>(values: Array<T | null | undefined>) => [...new Set(values.filter((value): value is T => value != null))]
    const employeeIds = ids(tasks.map(task => task.assigneeEmployeeId)), userIds = ids(tasks.flatMap(task => [task.createdByUserId, task.closedByUserId]))
    // «اللي كلّف بيها» بيديرها طول ما هو المدير المباشر لمسؤولها (نفس حكم taskAccess): مرؤوسيه مرة واحدة للقايمة كلها
    // B2.6: مهام تنفيذ الطلبات (رقم المهمة ← طلبها)
    const requestOf = await executionRequestsOfTasks(this.ds.manager, tasks.map(task => task.id))
    const hrOverride = this.resolver.hasHrOverride(user)
    const mayManageAsManager = !!user.employeeId && tasks.some(task => task.createdByUserId === user.sub && task.assigneeEmployeeId != null)
    const reports = new Set(mayManageAsManager ? knownReports ?? await this.resolver.directReportsOf(user.employeeId!) : [])
    const [employees, users, branches] = await Promise.all([
      employeeIds.length ? this.ds.getRepository(Employee).find({ where: { id: In(employeeIds) }, select: { id: true, fullName: true, employeeCode: true } }) : [],
      userIds.length ? this.ds.getRepository(User).find({ where: { id: In(userIds) }, select: { id: true, displayName: true } }) : [],
      this.ds.getRepository(Branch).find({ where: { id: In(ids(tasks.map(task => task.branchId))) }, select: { id: true, name: true } }),
    ])
    const employeeOf = new Map(employees.map(row => [row.id, row])), userName = new Map(users.map(row => [row.id, row.displayName ?? null]))
    const branchName = new Map(branches.map(row => [row.id, row.name]))
    const today = taskLocalDate(new Date())
    const rank = (task: Task) => (TASK_OPEN_STATUSES.includes(task.status as TaskStatus) ? 0 : 1)
    // المفتوح الأول، وجوّاه الأقرب موعدًا (اللي من غير موعد في الآخر)
    return [...tasks].sort((a, b) => rank(a) - rank(b) || (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || a.id - b.id).map(task => {
      const open = rank(task) === 0, employee = task.assigneeEmployeeId != null ? employeeOf.get(task.assigneeEmployeeId) : undefined
      const mine = taskAwaitsAccount(user, task)
      const canManage = taskManagedBy(user, task, task.assigneeEmployeeId != null && task.assigneeEmployeeId !== user.employeeId && reports.has(task.assigneeEmployeeId))
      // B2.6: مهمة تنفيذ طلب (link) مابتتدارش من هنا، وبيشتغل عليها اللي هي عليه أو مدير النظام — مش صاحب الطلب ولا منشئه. وتفاصيلها
      // (رقم الطلب، والإثبات، وسبب التعليق أو الإلغاء، ومين قفلها) تبع الطلب، فللي يقدر يفتحه بس: اللي بيشتغل عليها وهي مفتوحة، واللي
      // قفلها. الباقي (عرض كل المهام، إدارة المهام) بيشوفوا إنها موجودة وحالتها وموعدها
      const link = requestOf.get(task.id), unblocks = !!link && user.role === 'super_admin'
      const works = link ? !executionOwnRequest(user, link, hrOverride) && (mine || unblocks) : mine
      const party = !link || (open ? mine || unblocks : task.closedByUserId === user.sub)
      return {
        id: task.id, title: task.title, description: task.description ?? null,
        assigneeEmployeeId: task.assigneeEmployeeId ?? null, assigneeName: employee?.fullName ?? null, assigneeCode: employee?.employeeCode ?? null,
        assigneeRole: task.assigneeRole ?? null, assigneeRoleLabel: task.assigneeRole ? TASK_ROLE_LABELS[task.assigneeRole as keyof typeof TASK_ROLE_LABELS] ?? task.assigneeRole : null,
        branchId: task.branchId, branchName: branchName.get(task.branchId) ?? null,
        createdByUserId: task.createdByUserId, createdByName: userName.get(task.createdByUserId) ?? null, createdAt: task.createdAt,
        dueDate: task.dueDate ?? null, overdue: open && !!task.dueDate && task.dueDate < today,
        priority: task.priority, status: task.status, requiresProof: task.requiresProof === true,
        proofNote: party ? task.proofNote ?? null : null, proofFileId: party ? task.proofFileId ?? null : null, statusNote: party ? task.statusNote ?? null : null,
        closedAt: task.closedAt ?? null, closedByName: party && task.closedByUserId ? userName.get(task.closedByUserId) ?? null : null,
        // اللي الحساب يقدر يعمله: شغل المسؤول (جاري، مستنية، خلصت) وإدارة صاحب الصلاحية أو اللي كلّف بيها (تعديل، تحويل، إلغاء، إعادة فتح)
        canWork: open && works, canManage: canManage && !link,
        execution: !!link, requestId: link && party ? link.requestId : null,
      }
    })
  }
}
