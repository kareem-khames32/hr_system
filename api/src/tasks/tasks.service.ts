import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { Brackets, DataSource, In, Not, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee, type EmployeeStatus } from '../employees/employee.entity'
import { documentAckTaskLinked, documentOfAckTask, documentsOfAckTasks, DOCUMENT_ACK_TASK_BLOCKED } from '../hr-documents/document-acknowledgements'
import { StoredFile } from '../files/stored-file.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { OffboardingService } from '../offboarding/offboarding.service'
import { OnboardingService } from '../onboarding/onboarding.service'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { audienceMembersNow, AUDIENCE_PREVIEW_NAMES } from '../org/audience-preview'
import { assertAudienceTargets, orgAudienceJson } from '../org/org-audience'
import { recordOutboxEvent } from '../queue/outbox'
import { isCurrentEmployee } from '../reports/metrics'
import { ApproverResolver, FUNCTIONAL_APPROVER_ROLES } from '../requests/approver-resolver.service'
import { completeExecution, executionOwnRequest, executionRequestOfTask, executionRequestsOfTasks, executionTaskLinked, EXECUTION_TASK_CANCEL_BLOCKED, EXECUTION_TASK_CLOSE_BLOCKED, EXECUTION_TASK_EDIT_BLOCKED, EXECUTION_TASK_OWN_BLOCKED, EXECUTION_TASK_REOPEN_BLOCKED } from '../requests/execution-tasks'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Task, TASK_OPEN_STATUSES, type TaskPriority, type TaskStatus } from './task.entity'
import {
  notPersonalTask, NO_TASK_EXTRAS, recordTaskLog, taskExtrasOf, taskExtrasOfOne, taskExtrasReady, taskLogOf, writeTaskExtras, TASK_ASSIGNEE_CANNOT_MANAGE, TASK_OUTSIDE_TEAM, TASK_RATING_CLOSED,
  TASK_RATING_FEATURE, TASK_RULES_MIGRATION_MISSING, type TaskExtras, type TaskLogEvent,
} from './task-extras'
import {
  assertAudienceInsideTree, isTaskDate, isTaskRole, taskAccess, taskAddDays, taskAwaitsAccount, taskCompliance, taskComplianceLabel, taskDaysBetween, taskIdChunks, taskLocalDate, taskManagedBy, taskRolesHeldBy, tasksTableReady,
  TASK_NOT_FOUND, TASK_ROLE_LABELS, TASKS_DAYS_MAX, TASKS_ESCALATION_DAYS_DEFAULT, TASKS_ESCALATION_DAYS_KEY, TASKS_MIGRATION_MISSING,
  TASKS_REMINDER_DAYS_DEFAULT, TASKS_REMINDER_DAYS_KEY,
  TASK_OFF_DUTY_STATUSES, TASK_STILL_OPENING,
  TASK_COMMENTS_LINKED, TASK_SELF_RATING, type TaskGroupTree,
} from './task-rules'

// B2.5: محرك المهام.
//  المهمة العامة (جدول tasks): صاحب «إدارة المهام» يكلّف أي موظف أو دور في نطاقه، والمدير المباشر يكلّف مرؤوسيه من غير صلاحية.
//  «اللي كلّف بيها» (createdByUserId) هو آخر حد كلّف مسؤولها الحالي: اللي يحوّلها بيبقى هو.
//  «مهامي»: المهام العامة اللي عليّ + مهام التهيئة اللي على جهتي + بنود الإخلاء اللي عليّ — التهيئة والإخلاء بيتقروا من خدماتهم
//  بنفس حكمهم، وإقفالهم من شاشاتهم (قاعدة «الموجود أولًا»).
//  التذكير والتصعيد: مهمة مجدولة يومية بتسجّل حدث في الطابور، ومحرك الإشعارات (B2.4) بيبعته.
//  قبل ترحيل 088: «مهامي» بتعرض التهيئة والإخلاء بس، والمهمة العامة مرفوضة برسالة.
//  إضافة المالك (6 أكتوبر، ترحيل 096): الموظف يكلّف نفسه (مهمة شخصية يشوفها هو ومديره المباشر بس)؛ والمدير يكلّف أي حد تحته في الشجرة؛
//  و«تكليف أي موظف» لأي حد في النطاق؛ والمسؤول له تعليق «مش بتاعتي» وطلب تمديد الميعاد بس؛ ورجوع المهمة للتعديل بعدّاد؛ وتقييم اختياري
//  (tasks.rating)؛ وكل تغيير سطر في سجل المهمة (GET /tasks/:id/log)؛ وتقرير الالتزام. حالة القواعد في جدول task_extras والسجل في جدول
//  task_log (tasks/task-extras.ts).
//  قبل ترحيل 096: المهام زي ما هي (والتكليف في الشجرة وبـ«تكليف أي موظف» شغال: مش محتاج الجدولين)، والمهمة الشخصية والتمديد والتقييم
//  وعدّاد الرجوع مقفولين برسالتهم، والتقرير والسجل مش متاحين.

const INACTIVE: EmployeeStatus[] = TASK_OFF_DUTY_STATUSES
// أقصى صفوف في قايمة واحدة
const LIST_LIMIT = 500
// المهام المقفولة بتفضل ظاهرة في «فريقي» المدة دي
const TEAM_CLOSED_DAYS = 14
// تقرير الالتزام: الفترة الافتراضية وأقصى فترة (أيام)، وأقصى مهام بتتعدّ
const REPORT_DEFAULT_DAYS = 90, REPORT_MAX_DAYS = 366, REPORT_TASKS_MAX = 5000
// B-ADD.1: المهمة الجماعية
export const TASK_GROUP_MAX = 300
// B-ADD.18: وللمدير على اللي تحته في الهيكل بس
export const TASK_GROUP_RULE = 'المهمة الجماعية للي تحته موظفين في الهيكل (على اللي تحته بس)، أو لصاحب صلاحية «إدارة المهام» أو «تكليف أي موظف» في نطاق فروعه'
export const TASK_GROUP_NOBODY_UNDER = 'مفيش حد من اللي تحتك في الاختيار ده'

export interface TaskInput {
  title?: string
  description?: string | null
  assigneeEmployeeId?: number | null
  assigneeRole?: string | null
  branchId?: number | null
  dueDate?: string | null
  priority?: string
  requiresProof?: boolean
  /** علامة «تحتاج تقييم» (الميزة الفرعية tasks.rating) */
  needsRating?: boolean
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

  // ===== «فريقي»: مهام مرؤوسي المدير المباشرين، واللي الحساب كلّف بيه ولسه بيديره =====
  async team(user: JwtPayload) {
    const [reports, under] = user.employeeId
      ? await Promise.all([this.resolver.directReportsOf(user.employeeId), this.resolver.subordinatesOf(user.employeeId)]) : [[], []]
    // التبويب للي عنده حد يكلّفه: مرؤوسين (مباشرين أو أبعد في الشجرة)، أو «تكليف أي موظف»
    const manager = reports.length > 0 || under.length > 0 || userHasPerm(user, 'tasks.assign_any')
    if (!manager || !(await this.ready())) return { manager, tasks: [] }
    const since = new Date(Date.now() - TEAM_CLOSED_DAYS * 86_400_000)
    const recent = new Brackets(qb => qb.where('t.status IN (:...open)', { open: TASK_OPEN_STATUSES }).orWhere('t.closedAt >= :since', { since }))
    const rows: Task[] = []
    // المرؤوسين المباشرين بدفعات (حد معاملات SQL)، والأحدث الأول لو المجموع أكتر من الحد: المدير المباشر بيشوف كل مهامهم
    for (const part of taskIdChunks(reports)) {
      rows.push(...await this.ds.getRepository(Task).createQueryBuilder('t')
        .where('t.assigneeEmployeeId IN (:...part)', { part }).andWhere(recent)
        .orderBy('t.id', 'DESC').take(LIST_LIMIT).getMany())
    }
    // واللي الحساب كلّف بيه حد مش من المباشرين (أبعد في الشجرة، أو في نطاقه بـ«تكليف أي موظف»): بحق الإدارة دلوقتي
    const direct = new Set(reports), underSet = new Set(under)
    const assigned = await this.ds.getRepository(Task).createQueryBuilder('t')
      .where('t.createdByUserId = :me', { me: user.sub }).andWhere('t.assigneeEmployeeId IS NOT NULL').andWhere(recent)
      .orderBy('t.id', 'DESC').take(LIST_LIMIT).getMany()
    const extras = await taskExtrasOf(this.ds.manager, assigned.map(task => task.id))
    rows.push(...assigned.filter(task => !direct.has(task.assigneeEmployeeId!) && task.assigneeEmployeeId !== user.employeeId
      && taskManagedBy(user, { ...task, isPersonal: extras.get(task.id)?.isPersonal ?? false }, underSet.has(task.assigneeEmployeeId!))))
    rows.sort((a, b) => b.id - a.id)
    return { manager: true, tasks: await this.views(user, rows.slice(0, LIST_LIMIT), under) }
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
    // المهمة الشخصية لصاحبها ومديره المباشر بس: مش في قايمة صاحب الصلاحية
    if (await taskExtrasReady(this.ds.manager)) qb.andWhere(notPersonalTask('t'))
    return { available: true, tasks: await this.views(user, await qb.orderBy('t.id', 'DESC').take(LIST_LIMIT).getMany()) }
  }

  // ===== بيانات نموذج التكليف: مين أقدر أكلّفه =====
  async assignees(user: JwtPayload) {
    const canManage = userHasPerm(user, 'tasks.manage'), byScope = canManage || userHasPerm(user, 'tasks.assign_any'), scope = branchScopeOf(user)
    const employees = this.ds.getRepository(Employee)
    const select = { id: true, fullName: true, employeeCode: true, jobTitle: true, branchId: true } as const
    const rulesReady = await taskExtrasReady(this.ds.manager)
    // اللي تحتي في الشجرة (أي عمق)
    const under = user.employeeId ? await this.resolver.subordinatesOf(user.employeeId) : []
    // بالأرقام بدفعات (حد معاملات SQL)
    const byIds = async (ids: number[]) => {
      const found: Employee[] = []
      for (const part of taskIdChunks(ids)) found.push(...await employees.find({ where: { id: In(part), status: Not(In(INACTIVE)) }, select }))
      return found
    }
    const scoped = byScope
    const rows = scoped
      ? await employees.find({ where: { status: Not(In(INACTIVE)), ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) }, select })
      : await byIds(under)
    // حد تحتي برّه نطاق صلاحيتي (مدير عنده «إدارة المهام» على فرع واحد)، ونفسي (المهمة الشخصية، بعد ترحيل 096)
    const listed = new Set(rows.map(row => row.id))
    const self = rulesReady && !!user.employeeId
    const extra = await byIds([...(scoped ? under : []), ...(self ? [user.employeeId!] : [])].filter(id => !listed.has(id)))
    const all = [...rows, ...extra].sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.id - b.id)
    const branches = await this.ds.getRepository(Branch).find({ where: canManage && scope !== null ? { id: branchIdIn(scope) } : {}, select: { id: true, name: true }, order: { name: 'ASC' } })
    const branchName = new Map(branches.map(branch => [branch.id, branch.name]))
    // B-ADD.18 (كلمة المالك 12 أكتوبر): التكليف لغيري للي تحته حد بس (أو لصاحب الصلاحيتين القايمتين في نطاقه). اللي مالوش حد تحته
    // بيفضل له مهمته الشخصية بس، من غير زرار تكليف ولا قايمة موظفين
    const others = scoped || all.some(row => row.id !== user.employeeId)
    return {
      available: await this.ready(), canManage, canAssign: scoped || all.length > 0, canAssignOthers: others,
      // B-ADD.1: المهمة الجماعية (بالاستهداف الموحد) لصاحب صلاحية بنطاق. B-ADD.18: وللمدير على اللي تحته في الهيكل بس (groupWithin = tree:
      // المنتقي بياخد شجرته من GET /tasks/group-context مش شجرة نطاق الفروع)
      canAssignGroup: scoped || (others && (await this.groupTree(user, this.ds.manager, under)).employeeIds.size > 0), groupWithin: scoped ? 'scope' as const : 'tree' as const,
      employees: all.map(row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, jobTitle: row.jobTitle ?? null, branchName: branchName.get(row.branchId) ?? null,
        // نفسي: مهمة شخصية (تذكير) بيشوفها صاحبها ومديره المباشر بس
        self: self && row.id === user.employeeId })),
      // مهمة الدور (لكل حاملي الدور في الفرع المختار) لصاحب «إدارة المهام» بس
      roles: canManage ? FUNCTIONAL_APPROVER_ROLES.map(role => ({ key: role, label: TASK_ROLE_LABELS[role] })) : [],
      branches: canManage ? branches.map(branch => ({ id: branch.id, name: branch.name })) : [],
      rulesAvailable: rulesReady, ratingEnabled: rulesReady && await this.modules.isFeatureEnabled(TASK_RATING_FEATURE),
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
   * المسؤول وفرع المهمة (قواعد المالك 6 أكتوبر):
   *  - الموظف نفسه (بعد ترحيل 096): مهمة شخصية، من غير صلاحية.
   *  - «إدارة المهام» أو «تكليف أي موظف»: أي موظف فرعه في نطاق الحساب.
   *  - المدير: أي حد تحته في الشجرة، من غير صلاحية ومن غير قيد فرع (زي خطوات الاعتماد الهيكلية).
   *  - الدور: «إدارة المهام» وفرع من نطاق الحساب.
   * برّه ده: 403 برسالة بتوجّه للطلب؛ ولصاحب صلاحية بنطاق: نفس رد الموظف اللي مش موجود (مايعرفش موجود ولا لأ).
   */
  private async assignment(user: JwtPayload, input: Pick<TaskInput, 'assigneeEmployeeId' | 'assigneeRole' | 'branchId'>, em: EntityManager = this.ds.manager,
    knownUnder?: ReadonlySet<number>) {
    const canManage = userHasPerm(user, 'tasks.manage'), byScope = canManage || userHasPerm(user, 'tasks.assign_any'), scope = branchScopeOf(user)
    const byEmployee = input.assigneeEmployeeId != null, byRole = input.assigneeRole != null && input.assigneeRole !== ''
    if (byEmployee === byRole) throw new BadRequestException('اختار مسؤول واحد للمهمة: موظف أو دور')
    if (byRole) {
      if (!canManage) throw new ForbiddenException('تكليف دور بمهمة لصاحب صلاحية «إدارة المهام» بس')
      if (!isTaskRole(input.assigneeRole)) throw new BadRequestException('الدور غير معروف')
      const branch = input.branchId != null ? await em.getRepository(Branch).findOne({ where: { id: input.branchId } }) : null
      if (!branch || !inBranchScope(scope, branch.id)) throw new BadRequestException('اختار فرع المهمة من فروعك')
      return { assigneeEmployeeId: null, assigneeRole: input.assigneeRole, branchId: branch.id, personal: false }
    }
    const employee = await em.getRepository(Employee).findOne({ where: { id: Number(input.assigneeEmployeeId) } })
    // لنفسي = مهمة شخصية (العلامة في جدول ترحيل 096؛ قبل الترحيل التكليف القديم زي ما هو)
    const personal = !!employee && !!user.employeeId && employee.id === user.employeeId && await taskExtrasReady(em)
    const inScope = !personal && byScope && !!employee && inBranchScope(scope, employee.branchId)
    // knownUnder (B-ADD.18، المهمة الجماعية للمدير): «اللي تحتي» محسوبة مرة واحدة على اتصال المعاملة نفسها بنفس قاعدة isUnder بالحرف
    const under = !personal && !inScope && !!employee && !!user.employeeId && employee.id !== user.employeeId
      && (knownUnder ? knownUnder.has(employee.id) : await this.resolverOn(em).isUnder(employee.id, user.employeeId))
    if (!personal && !inScope && !under) {
      // نفسي قبل ترحيل 096: المهمة الشخصية لسه مقفولة
      if (!!employee && employee.id === user.employeeId) throw new BadRequestException(TASK_RULES_MIGRATION_MISSING)
      if (byScope) throw new NotFoundException('الموظف غير موجود')
      throw new ForbiddenException(TASK_OUTSIDE_TEAM)
    }
    if (INACTIVE.includes(employee!.status)) throw new BadRequestException('الموظف مش على رأس العمل')
    return { assigneeEmployeeId: employee!.id, assigneeRole: null, branchId: employee!.branchId, personal }
  }

  /**
   * حالة ميزة التقييم. بتتقري **قبل** معاملات المهام مش جواها: القراءة من مخزن الخدمة (كاشها بيفضى كل كام ثانية) محتاجة اتصال تاني،
   * والمعاملة ماسكة اتصالها — عشر معاملات مع كاش فاضي كانوا بيستنوا اتصال حداشر مش موجود (Codex CRP2Y-B02).
   */
  private ratingOn(): Promise<boolean> {
    return this.modules.isFeatureEnabled(TASK_RATING_FEATURE)
  }

  /** علامة «تحتاج تقييم»: الميزة الفرعية مفتوحة (ratingOn: مقروءة قبل المعاملة)، والمهمة على موظف غير اللي بيكلّف (مش شخصية ولا مهمة دور) */
  private async ratingFlag(value: unknown, assignment: { assigneeEmployeeId: number | null; personal: boolean }, ratingOn: boolean, em: EntityManager = this.ds.manager): Promise<boolean> {
    if (value !== true) return false
    if (!ratingOn) throw new BadRequestException(TASK_RATING_CLOSED)
    if (!(await taskExtrasReady(em))) throw new BadRequestException(TASK_RULES_MIGRATION_MISSING)
    if (assignment.assigneeEmployeeId == null || assignment.personal) throw new BadRequestException('علامة «تحتاج تقييم» لمهمة على موظف غير اللي بيكلّف بيها')
    return true
  }

  async create(user: JwtPayload, input: TaskInput) {
    if (!(await this.ready())) throw new BadRequestException(TASKS_MIGRATION_MISSING)
    const title = this.cleanTitle(input.title)
    const description = this.cleanText(input.description, 2000)
    const dueDate = this.cleanDueDate(input.dueDate)
    const { personal, ...assignment } = await this.assignment(user, input)
    const needsRating = await this.ratingFlag(input.needsRating, { ...assignment, personal }, input.needsRating === true && await this.ratingOn())
    const now = new Date()
    const saved = await this.ds.transaction(async em => {
      const repo = em.getRepository(Task)
      const row = await repo.save(repo.create({
        title, description, ...assignment, createdByUserId: user.sub, dueDate, priority: (input.priority ?? 'NORMAL') as TaskPriority, status: 'OPEN',
        requiresProof: input.requiresProof === true, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null,
        remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
      }))
      if (personal || needsRating) await writeTaskExtras(em, row.id, { isPersonal: personal, needsRating })
      // المهمة الشخصية تذكير صاحبها: من غير «مهمة جديدة عليك»
      if (!personal) await this.recordEvent(em, 'TASK_ASSIGNED', row)
      await recordTaskLog(em, user, row, 'ASSIGNED', personal ? 'سجّل مهمة شخصية' : 'كلّف بالمهمة')
      return row
    })
    return (await this.views(user, [saved]))[0]
  }

  // ===== B-ADD.1: المهمة الجماعية — نفس المهمة لكل موظف في جمهور بالاستهداف الموحد =====
  /**
   * لصاحب «إدارة المهام» أو «تكليف أي موظف» جوه نطاق فروعه — وB-ADD.18: للمدير على اللي تحته في الهيكل بس: الجمهور (الشركة ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم، ومعاه
   * «الكل ماعدا…») بيتفك لموظفينه الحاليين دلوقتي، وكل واحد بياخد مهمته هو (مهمة عادية بكل قواعدها: إشعار، سجل، إثبات، تقييم) بحكم
   * التكليف الفردي نفسه (assignment). اللي بيكلّف مش من المكلَّفين (مهمته لنفسه شخصية ومن شاشتها)، واللي مش على رأس العمل بيتخطّى
   * وبيرجع في «اتخطّوا». كله في معاملة واحدة: يا الكل يا ولا مهمة.
   */
  async createForGroup(user: JwtPayload, input: TaskInput & { audience?: unknown }) {
    if (!(await this.ready())) throw new BadRequestException(TASKS_MIGRATION_MISSING)
    // B-ADD.18 (كلمة المالك 12 أكتوبر: «أسند مهمة بس لفريقي… لا أكتر ولا أقل»): من غير الصلاحيتين القايمتين المهمة الجماعية للمدير على
    // اللي تحته في الهيكل بس — نفس الجمهور، متحكوم عليه جوه شجرته (groupTree) بدل نطاق الفروع
    const byScope = userHasPerm(user, 'tasks.manage') || userHasPerm(user, 'tasks.assign_any')
    const title = this.cleanTitle(input.title)
    const description = this.cleanText(input.description, 2000)
    const dueDate = this.cleanDueDate(input.dueDate)
    const audience = orgAudienceJson(input.audience, 'جمهور المهمة')
    const ratingOn = input.needsRating === true && await this.ratingOn()
    const now = new Date()
    const nobody = byScope ? 'مفيش موظفين في الجمهور ده جوه نطاقك' : TASK_GROUP_NOBODY_UNDER
    return this.ds.transaction(async em => {
      // الشجرة على اتصال المعاملة. اختيار برّه الشجرة (وحدة أو فريق أو موظف بالاسم، موجود أو لأ) بنفس الرفض — قبل أي فحص وجود
      const inTree = async () => {
        const tree = await this.groupTree(user, em)
        if (!tree.employeeIds.size) throw new ForbiddenException(TASK_GROUP_RULE)
        assertAudienceInsideTree(audience, tree)
        return tree
      }
      let tree: TaskGroupTree | null = byScope ? null : await inTree()
      // حكم «جوه شجرتي» على قراءة جديدة للشجرة (أو الكل لصاحب الصلاحية)
      const insideTreeNow = async () => {
        if (!byScope) tree = await inTree()
        return (member: { id: number }) => !tree || tree.employeeIds.has(member.id)
      }
      await assertAudienceTargets(em, audience, 'جمهور المهمة')
      const seen = (await audienceMembersNow(em, audience, branchScopeOf(user))).filter(member => member.id !== user.employeeId).filter(await insideTreeNow())
      if (!seen.length) throw new BadRequestException(nobody)
      if (seen.length > TASK_GROUP_MAX) throw new BadRequestException(`المهمة الجماعية لـ${TASK_GROUP_MAX} موظف بالكتير — قسّم الجمهور`)
      // Codex P7A-B03: صفوف الموظفين بتتقفل (بترتيب أرقامهم) قبل أي حكم بيتكتب عليه: نقل موظف لفرع تاني أو تغيير حالته بيستنى لحد ما
      // المعاملة تخلص. وبعد القفل الجمهور بيتحكم تاني (مكان الموظف ونطاق الحساب)، وحكم التكليف (assignment) بيقرا الصف المقفول.
      const lockIds = seen.map(member => member.id).sort((a, b) => a - b)
      await em.query(`SELECT [id] FROM [employees] WITH (UPDLOCK, ROWLOCK) WHERE [id] IN (${lockIds.map((_, index) => `@${index}`).join(', ')}) ORDER BY [id]`, lockIds)
      const locked = new Set(lockIds)
      const members = (await audienceMembersNow(em, audience, branchScopeOf(user))).filter(member => locked.has(member.id))
        // B-ADD.18: وشجرة المدير بتتقري تاني بعد القفل (موظف اتنقل من تحته وإحنا مستنيين القفل مابقاش من الجمهور)
        .filter(await insideTreeNow())
      if (!members.length) throw new BadRequestException(nobody)
      const repo = em.getRepository(Task)
      const created: Task[] = [], skipped: Array<{ employeeId: number; fullName: string; reason: string }> = []
      for (const member of members) {
        let assignment: Awaited<ReturnType<TasksService['assignment']>>
        try { assignment = await this.assignment(user, { assigneeEmployeeId: member.id }, em, tree?.under) } catch (error) {
          if (!(error instanceof BadRequestException) && !(error instanceof NotFoundException) && !(error instanceof ForbiddenException)) throw error
          skipped.push({ employeeId: member.id, fullName: member.fullName, reason: [].concat((error.getResponse() as { message?: unknown })?.message as never ?? error.message).join('، ') })
          continue
        }
        const { personal, ...target } = assignment
        const needsRating = await this.ratingFlag(input.needsRating, { ...target, personal }, ratingOn, em)
        const row = await repo.save(repo.create({
          title, description, ...target, createdByUserId: user.sub, dueDate, priority: (input.priority ?? 'NORMAL') as TaskPriority, status: 'OPEN',
          requiresProof: input.requiresProof === true, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null,
          remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now,
        }))
        if (needsRating) await writeTaskExtras(em, row.id, { isPersonal: false, needsRating })
        await this.recordEvent(em, 'TASK_ASSIGNED', row)
        await recordTaskLog(em, user, row, 'ASSIGNED', 'كلّف بالمهمة (مهمة جماعية)')
        created.push(row)
      }
      if (!created.length) throw new BadRequestException('ولا موظف في الجمهور ده ينفع يتكلّف دلوقتي')
      return { created: created.length, taskIds: created.map(row => row.id), skipped }
    })
  }

  // ===== B-ADD.18: شجرة المدير للمهمة الجماعية — «اللي تحتي» ووحداتهم وفرقهم =====
  /**
   * اللي تحت الحساب في الهيكل دلوقتي (subordinatesOf — نفس قاعدة التكليف الفردي بالحرف)، الحاليين منهم بس وجوه نطاق فروع الحساب؛ والوحدات
   * والفرق اللي هو أو حد تحته بيديرها أو بيقودها (unitsUnder). فرع أو وحدة أو فريق برّه نطاق فروع الحساب مابيرجعش (لا اسمه ولا رقمه):
   * مرؤوس في فرع برّه النطاق بيتكلّف بالتكليف الفردي زي الأول. containers = أقسام فرق بيقودها من غير ما يدير القسم نفسه: بتتعرض للمنتقي
   * عشان فريقه يظهر تحتها، ومش من اختياراته (listed = false).
   */
  private async groupTree(user: JwtPayload, em: EntityManager = this.ds.manager, knownUnder?: number[]): Promise<TaskGroupTree & { employees: Employee[]; units: Department[]; containers: Department[]; teams: Team[] }> {
    const none = { under: new Set<number>(), employeeIds: new Set<number>(), unitIds: new Set<number>(), teamIds: new Set<number>(), branchIds: new Set<number>(),
      employees: [], units: [], containers: [], teams: [] }
    const scope = branchScopeOf(user)
    if (!user.employeeId || isEmptyBranchScope(scope)) return none
    const resolver = this.resolverOn(em)
    const under = knownUnder ?? await resolver.subordinatesOf(user.employeeId)
    if (!under.length) return none
    const found: Employee[] = []
    for (const part of taskIdChunks(under)) {
      found.push(...await em.getRepository(Employee).find({ where: { id: In(part), isActive: true, ...(scope !== null ? { branchId: branchIdIn(scope) } : {}) },
        select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, teamId: true, status: true, isActive: true } }))
    }
    const employees = found.filter(row => isCurrentEmployee(row) && row.branchId != null && row.id !== user.employeeId)
    if (!employees.length) return none
    const branchIds = new Set(employees.map(row => row.branchId))
    const owned = await resolver.unitsUnder(user.employeeId, under)
    const select = { id: true, name: true, branchId: true, parentId: true, unitType: true, isExecutive: true } as const
    const departments = em.getRepository(Department)
    const units = owned.unitIds.length ? (await departments.find({ where: { id: In(owned.unitIds), isActive: true }, select, order: { id: 'ASC' } })).filter(row => branchIds.has(row.branchId)) : []
    const unitIds = new Set(units.map(row => row.id))
    const led = owned.teamIds.length ? await em.getRepository(Team).find({ where: { id: In(owned.teamIds), isActive: true }, select: { id: true, name: true, departmentId: true }, order: { id: 'ASC' } }) : []
    const outside = [...new Set(led.map(row => row.departmentId).filter(id => !unitIds.has(id)))]
    const containers = outside.length ? (await departments.find({ where: { id: In(outside), isActive: true }, select, order: { id: 'ASC' } })).filter(row => branchIds.has(row.branchId)) : []
    const shown = new Set([...unitIds, ...containers.map(row => row.id)])
    const teams = led.filter(row => shown.has(row.departmentId))
    return { under: new Set(under), employeeIds: new Set(employees.map(row => row.id)), unitIds, teamIds: new Set(teams.map(row => row.id)), branchIds, employees, units, containers, teams }
  }

  /** B-ADD.18: شجرة المنتقي «على مين؟» للمدير — بنفس شكل GET /org/audience-context، بس اللي تحته في الهيكل بدل نطاق الفروع */
  async groupContext(user: JwtPayload) {
    const tree = await this.groupTree(user)
    if (!tree.employeeIds.size) throw new ForbiddenException(TASK_GROUP_RULE)
    const branches = await this.ds.getRepository(Branch).find({ where: { id: In([...tree.branchIds]) }, select: { id: true, name: true }, order: { id: 'ASC' } })
    const branchOf = new Map([...tree.units, ...tree.containers].map(row => [row.id, row.branchId]))
    const teamIds = tree.teamIds
    return {
      branches: branches.map(row => ({ id: row.id, name: row.name })),
      // الأب اللي برّه الشجرة مابيرجعش رقمه
      units: [...tree.units.map(row => ({ row, listed: true })), ...tree.containers.map(row => ({ row, listed: false }))].map(({ row, listed }) => ({
        id: row.id, name: row.name, branchId: row.branchId, parentId: listed && row.parentId != null && tree.unitIds.has(row.parentId) ? row.parentId : null,
        unitType: row.unitType, isExecutive: row.isExecutive === true, listed })),
      teams: tree.teams.map(row => ({ id: row.id, name: row.name, departmentId: row.departmentId, branchId: branchOf.get(row.departmentId)! })),
      employees: [...tree.employees].sort((a, b) => a.id - b.id).map(row => ({
        id: row.id, branchId: row.branchId, departmentId: row.departmentId != null && branchOf.has(row.departmentId) ? row.departmentId : null,
        teamId: row.teamId != null && teamIds.has(row.teamId) ? row.teamId : null, fullName: row.fullName, employeeCode: row.employeeCode ?? null })),
    }
  }

  /** B-ADD.18: معاينة جمهور المهمة الجماعية للمدير قبل الحفظ — نفس حكم الحفظ: الجمهور جوه شجرته، ومن غيره هو */
  async groupPreview(user: JwtPayload, rawAudience: unknown) {
    const tree = await this.groupTree(user)
    if (!tree.employeeIds.size) throw new ForbiddenException(TASK_GROUP_RULE)
    const audience = orgAudienceJson(rawAudience, 'جمهور المهمة')
    assertAudienceInsideTree(audience, tree)
    await assertAudienceTargets(this.ds.manager, audience, 'جمهور المهمة')
    const members = (await audienceMembersNow(this.ds.manager, audience, branchScopeOf(user))).filter(member => tree.employeeIds.has(member.id))
    // الأسماء بس: وحدة مرؤوس مش من وحدات الشجرة مابيرجعش رقمها
    return { count: members.length, truncated: members.length > AUDIENCE_PREVIEW_NAMES,
      employees: members.slice(0, AUDIENCE_PREVIEW_NAMES).map(row => ({ id: row.id, employeeCode: row.employeeCode, fullName: row.fullName, branchId: row.branchId, departmentId: null, teamId: null })) }
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
    // حالة قواعد الإسناد (ترحيل 096) على اتصال المعاملة نفسها: «شخصية» جزء من حكم مين يشوف
    const extras = await taskExtrasOfOne(em, id)
    const access = await taskAccess(user, { ...task, isPersonal: extras.isPersonal }, this.resolverOn(em))
    if (!access.visible) throw new NotFoundException(TASK_NOT_FOUND)
    return { task, access, extras }
  }

  /**
   * بعد قفل صف المهمة: ربط (بطلب تنفيذ أو بمستند إقرار) ماكانش ظاهر قبل القفل وظهر دلوقتي؟ الربط بيتكتب في معاملة فتح المهمة بعد صفها،
   * فنداء قرا الربط قبل ما المعاملة دي تتثبت واستنى على صف المهمة كان هيكمّل عليها كمهمة عادية. المنادي بيرفض «حاول تاني».
   */
  private async linkedWhileWaiting(em: EntityManager, id: number, execution: boolean) {
    return (!execution && await executionTaskLinked(em, id)) || await documentAckTaskLinked(em, id)
  }

  async detail(user: JwtPayload, id: number) {
    return (await this.views(user, [(await this.load(user, id)).task]))[0]
  }

  /** سجل المهمة (إضافة المالك): سطر لكل تغيير عليها، للي يشوفها — برّه كده «غير موجودة». مهمة تنفيذ طلب ومهمة إقرار مستند من غير سطور */
  async log(user: JwtPayload, id: number) {
    const { task } = await this.load(user, id)
    return taskLogOf(this.ds.manager, user, task.id)
  }

  /**
   * B2.8: المهمة اللي ليها حوار تعليقات للحساب ده — أي مهمة عادية يشوفها (برّه كده «غير موجودة»). مهمة تنفيذ طلب ومهمة إقرار مستند
   * مالهمش حوار: تفاصيلهم تبع الطلب أو المستند، وشايفهم ناس مايشوفوش الطلب نفسه.
   */
  async commentable(user: JwtPayload, id: number, em: EntityManager = this.ds.manager, lock = false): Promise<Task> {
    // كتابة التعليق بتنادي جوه معاملتها (em) وصف المهمة مقفول (lock): تحويل المهمة في نفس اللحظة يا إما قبل التعليق يا إما بعده.
    // المهمة المربوطة مابتتقفلش من هنا (زي خطافي المهام): الربط بيتقري الأول، وبعد القفل بيتقري تاني من غير انتظار
    const linked = !!(await executionRequestOfTask(em, id)) || !!(await documentOfAckTask(em, id))
    const { task } = await this.load(user, id, em, lock && !linked)
    if (linked) throw new BadRequestException(TASK_COMMENTS_LINKED)
    if (lock && await this.linkedWhileWaiting(em, id, false)) throw new ConflictException(TASK_STILL_OPENING)
    return task
  }

  /**
   * تعديل المهمة المفتوحة: اللي بيديرها (taskManagedBy). تغيير المسؤول = تكليف جديد بنفس شروط التكليف، واللي حوّلها بيبقى هو اللي كلّف بيها.
   * المسؤول نفسه مايعدّلش ولا يحوّل (له تعليق «مش بتاعتي» وطلب تمديد الميعاد). كل تغيير بسطر في سجل المهمة.
   */
  async update(user: JwtPayload, id: number, input: TaskInput) {
    const ratingOn = input.needsRating === true && await this.ratingOn()
    const saved = await this.ds.transaction(async em => {
      // B2.6: مهمة تنفيذ طلب معتمد مسؤولها من إعداد نوع الطلب — ماتتعدّلش ولا تتحوّل من هنا: مسؤولها بيقرا الطلب، فتحويلها كان
      // هيدّي «إدارة المهام» حق تختار مين يقراه. (الربط بالطلب ثابت من يوم ما المهمة اتفتحت، فبيتقري قبل قفل صفها)
      const execution = await executionRequestOfTask(em, id)
      // B2.7-ب: مهمة إقرار مستند مابتتغيّرش من هنا خالص، فصفها مابيتقفلش: الإقرار والإلغاء بيقفلوا المستند والموظف وبعدهم المهمة، ونداء
      // ماسك صف المهمة وبيقرا واحد منهم كان بيتعارض معاهم
      const acknowledgement = await documentOfAckTask(em, id)
      const { task, access, extras } = await this.load(user, id, em, !acknowledgement)
      if (!access.manage) throw new ForbiddenException(access.work ? TASK_ASSIGNEE_CANNOT_MANAGE : 'تعديل المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
      if (execution) throw new BadRequestException(EXECUTION_TASK_EDIT_BLOCKED)
      // B2.7-ب: مهمة إقرار مستند مسؤولها وموعدها من المستند نفسه
      if (acknowledgement) throw new BadRequestException(DOCUMENT_ACK_TASK_BLOCKED)
      if (await this.linkedWhileWaiting(em, id, !!execution)) throw new ConflictException(TASK_STILL_OPENING)
      if (!TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) throw new BadRequestException('المهمة مقفولة — افتحها تاني الأول')
      const rulesReady = await taskExtrasReady(em)
      const before = { title: task.title, description: task.description, priority: task.priority, requiresProof: task.requiresProof, dueDate: task.dueDate }
      if (input.title !== undefined) task.title = this.cleanTitle(input.title)
      if (input.description !== undefined) task.description = this.cleanText(input.description, 2000)
      // null في الأولوية والإثبات = الخانة مش مبعوتة (العمودين مايقبلوش فاضي)
      if (input.priority != null) task.priority = input.priority
      if (input.requiresProof != null) task.requiresProof = input.requiresProof === true
      // نفس الموظف اتبعت تاني مش تحويل، حتى لو اتنقل فرع من يوم التكليف: المهمة بتفضل في الفرع اللي اتكلّف فيه
      const roleSent = input.assigneeRole != null && input.assigneeRole !== ''
      const sameEmployee = !roleSent && input.assigneeEmployeeId != null && input.assigneeEmployeeId === task.assigneeEmployeeId
      let reassigned = false, personal = extras.isPersonal
      if (!sameEmployee && (input.assigneeEmployeeId !== undefined || input.assigneeRole !== undefined)) {
        const { personal: nextPersonal, ...next } = await this.assignment(user, input, em)
        reassigned = next.assigneeEmployeeId !== task.assigneeEmployeeId || next.assigneeRole !== task.assigneeRole || next.branchId !== task.branchId
        // اللي حوّل المهمة بقى هو اللي كلّف بيها: اللي كلّف قبله مايفضلش ليه حق على مسؤول ماختاروش (ممكن يكون برّه حقه أصلًا)
        if (reassigned) { Object.assign(task, next, { status: 'OPEN', statusNote: null, createdByUserId: user.sub }); personal = nextPersonal }
      }
      // علامة «تحتاج تقييم»: للمهمة على موظف غير اللي كلّف (بتتشال لو المهمة بقت شخصية أو على دور)
      let needsRating = extras.needsRating && !personal && task.assigneeEmployeeId != null
      if (input.needsRating != null) needsRating = await this.ratingFlag(input.needsRating, { assigneeEmployeeId: task.assigneeEmployeeId, personal }, ratingOn, em)
      let dueChanged = false
      if (input.dueDate !== undefined) {
        const dueDate = this.cleanDueDate(input.dueDate, task.dueDate)
        if (dueDate !== task.dueDate) { task.dueDate = dueDate; task.remindedAt = null; task.escalatedAt = null; dueChanged = true }
      }
      if (reassigned) { task.remindedAt = null; task.escalatedAt = null }
      task.updatedAt = new Date()
      await em.getRepository(Task).save(task)
      if (rulesReady) {
        // تحويل: المهمة بتبدأ مع مسؤولها الجديد من غير رجوع ولا طلب تمديد من اللي قبله. وتغيير الموعد بيشيل طلب تمديد على الموعد القديم
        const patch: Partial<TaskExtras> = {}
        if (reassigned) Object.assign(patch, { isPersonal: personal, returnCount: 0 })
        if ((reassigned || dueChanged) && extras.extensionDueDate) Object.assign(patch, { extensionDueDate: null, extensionReason: null })
        if (needsRating !== extras.needsRating) patch.needsRating = needsRating
        await writeTaskExtras(em, task.id, patch)
      }
      if (reassigned) {
        if (!personal) await this.recordEvent(em, 'TASK_ASSIGNED', task)
        await recordTaskLog(em, user, task, 'REASSIGNED', personal ? 'خلّاها مهمة شخصية عليه' : 'حوّل المهمة لمسؤول جديد')
      }
      if (dueChanged) await recordTaskLog(em, user, task, 'DUE_CHANGED', `غيّر الموعد من ${before.dueDate ?? 'من غير موعد'} لـ${task.dueDate ?? 'من غير موعد'}`)
      const edited = [task.title !== before.title && 'العنوان', task.description !== before.description && 'الوصف', task.priority !== before.priority && 'الأولوية',
        task.requiresProof !== before.requiresProof && 'طلب الإثبات', needsRating !== extras.needsRating && 'علامة التقييم'].filter((label): label is string => !!label)
      if (edited.length) await recordTaskLog(em, user, task, 'EDITED', `عدّل ${edited.join(' و')}`)
      return task
    })
    return (await this.views(user, [saved]))[0]
  }

  /**
   * تغيير الحالة. المسؤول: «جاري»، «مستنية» بسبب، «خلصت». صاحب الإدارة: «خلصت»، «اتلغت» بسبب، وإعادة فتح المقفولة بسبب.
   * «خلصت» والمهمة مطلوب لها إثبات: نص أو ملف رفعه اللي بيقفل (نوعه task ومش مستعمل في مهمة تانية).
   * إعادة الفتح بتشيل إثبات الإقفال اللي فات (زي مهام التهيئة) — عشان كده سببها إلزامي وبيفضل على المهمة.
   * إضافة المالك: إعادة فتح مهمة «خلصت» = «رجّعها للتعديل» (اللي بيديرها رفض الإنجاز): بترجع «جاري» وعدّاد الرجوع بيزيد؛ والملغية
   * بترجع «مفتوحة» زي الأول. والمهمة اللي اتقيّمت اتقبل إنجازها فماتترجعش (والميزة مفتوحة). وكل تغيير بسطر في سجل المهمة.
   */
  async setStatus(user: JwtPayload, id: number, input: TaskStatusInput) {
    const ratingOn = await this.ratingOn()
    const saved = await this.ds.transaction(async em => {
      // B2.6: مهمة تنفيذ طلب معتمد — صف طلبها بيتقفل قبل صفها (نفس ترتيب الاعتماد ورفض التنفيذ)
      const execution = await executionRequestOfTask(em, id, true)
      // B2.7-ب: مهمة إقرار مستند صفها مابيتقفلش من هنا (زي التعديل فوق)
      const acknowledgement = await documentOfAckTask(em, id)
      const { task, access, extras } = await this.load(user, id, em, !acknowledgement)
      // B2.7-ب: مهمة إقرار مستند بتتقفل مع إقرار الموظف، وبتتلغي مع إلغاء الطلب من المستند — مفيش تغيير حالة من هنا (ولا إعادة فتح)
      if (acknowledgement) throw new BadRequestException(DOCUMENT_ACK_TASK_BLOCKED)
      if (await this.linkedWhileWaiting(em, id, !!execution)) throw new ConflictException(TASK_STILL_OPENING)
      // مهمة تنفيذ طلب بيشتغل عليها اللي هي عليه، أو مدير النظام (فكّ الانسداد) — ومش صاحب الطلب ولا منشئه: نفس قاعدتي الاعتماد
      const own = !!execution && executionOwnRequest(user, execution, this.resolver.hasHrOverride(user))
      const work = execution ? !own && (access.work || user.role === 'super_admin') : access.work
      const open = TASK_OPEN_STATUSES.includes(task.status as TaskStatus)
      const next = input.status as TaskStatus
      const note = this.cleanText(input.note, 500)
      const rulesReady = await taskExtrasReady(em)
      // سطر سجل المهمة، وتعليق بإشارة للتغيير اللي له مستلم (مهمة تنفيذ الطلب سجلها سجل طلبها)
      const log = (event: TaskLogEvent, body: string, notify: Array<'ASSIGNEE' | 'CREATOR'> = []) => execution ? Promise.resolve() : recordTaskLog(em, user, task, event, body, notify)
      if (next === task.status) throw new BadRequestException('المهمة على الحالة دي فعلًا')
      if (next === 'OPEN') {
        if (open) throw new BadRequestException('المهمة مفتوحة فعلًا')
        if (!access.manage) throw new ForbiddenException('إعادة فتح المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
        // مهمة تنفيذ طلب: بتقفل الطلب معاها (مكتمل، أو مرفوض تنفيذه)، فماتتفتحش تاني
        if (execution) throw new BadRequestException(EXECUTION_TASK_REOPEN_BLOCKED)
        if (!note) throw new BadRequestException(task.status === 'DONE' ? 'اكتب سبب رجوع المهمة للتعديل' : 'اكتب سبب إعادة فتح المهمة')
        // المقيّمة اتقبل إنجازها فماتترجعش — طول ما ميزة التقييم مفتوحة. والميزة مقفولة: التقييم لا ظاهر ولا ساري، فالرجوع شغال زي أي مهمة
        // وبيشيل التقييم المخزّن (الإنجاز اللي اتقيّم اترفض؛ ولو الميزة اتفتحت تاني المهمة تتقيّم من جديد)
        const rated = extras.rating != null
        if (rated && ratingOn) throw new BadRequestException('المهمة اتقبلت واتقيّمت — ماتترجعش للتعديل')
        // «خلصت» ← «جاري» بعدّاد (بعد ترحيل 096)؛ الملغية (وقبل الترحيل) ← «مفتوحة»
        const returned = task.status === 'DONE' && rulesReady
        Object.assign(task, { status: returned ? 'IN_PROGRESS' : 'OPEN', statusNote: note, closedByUserId: null, closedAt: null, proofNote: null, proofFileId: null, remindedAt: null, escalatedAt: null })
        if (returned) await writeTaskExtras(em, task.id, { returnCount: extras.returnCount + 1, ...(rated ? { rating: null, ratingNote: null } : {}) })
        // الرجوع للتعديل بيبلّغ المسؤول (تعليق بالسبب وإشارة ليه)؛ وإعادة فتح الملغية سطر في السجل من غير إشعار
        await log(returned ? 'RETURNED' : 'REOPENED', `${returned ? 'رجّع المهمة للتعديل' : 'فتح المهمة تاني'}: ${note}`, returned ? ['ASSIGNEE'] : [])
      } else {
        if (!open) throw new BadRequestException('المهمة مقفولة')
        if (next === 'CANCELLED') {
          if (!access.manage) throw new ForbiddenException('إلغاء المهمة لمنشئها أو لصاحب صلاحية «إدارة المهام»')
          if (execution) throw new BadRequestException(EXECUTION_TASK_CANCEL_BLOCKED)
          if (!note) throw new BadRequestException('اكتب سبب الإلغاء')
          Object.assign(task, { status: 'CANCELLED', statusNote: note, closedByUserId: user.sub, closedAt: new Date() })
          await log('CANCELLED', `لغى المهمة: ${note}`)
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
          // الالتزام بالميعاد بيتسجّل مع الإقفال من غير ما حد يعمل حاجة. والمعلّمة «تحتاج تقييم» (والميزة مفتوحة): إشعار للي كلّف بيها
          const compliance = taskComplianceLabel(taskCompliance(task))
          const awaitsRating = extras.needsRating && ratingOn
          await log('DONE', `قفل المهمة${compliance ? ` — ${compliance}` : ''}`, awaitsRating ? ['CREATOR'] : [])
        } else {
          // «جاري» و«مستنية»: شغل المسؤول نفسه
          if (!work) throw new ForbiddenException(own ? EXECUTION_TASK_OWN_BLOCKED : 'الحالة دي بيغيّرها مسؤول المهمة')
          if (next === 'WAITING' && !note) throw new BadRequestException('اكتب المهمة مستنية إيه')
          Object.assign(task, { status: next, statusNote: next === 'WAITING' ? note : null })
          await log(next === 'WAITING' ? 'WAITING' : 'STARTED', next === 'WAITING' ? `علّق المهمة «مستنية»: ${note}` : 'بدأ المهمة')
        }
        // طلب تمديد معلّق على مهمة اتقفلت أو اتلغت مالوش معنى
        if (rulesReady && extras.extensionDueDate && !TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) await writeTaskExtras(em, task.id, { extensionDueDate: null, extensionReason: null })
      }
      task.updatedAt = new Date()
      return em.getRepository(Task).save(task)
    })
    return (await this.views(user, [saved]))[0]
  }

  // ===== B2.5 (إضافة المالك): طلب تمديد الميعاد، وتقييم المهمة، وتقرير الالتزام =====
  /** المهمة العادية (مش تنفيذ طلب ولا إقرار مستند) تحت قفل صفها، بحق الحساب وحالة قواعد الإسناد (ترحيل 096) — نفس ترتيب أقفال التعديل */
  private async plainLocked(em: EntityManager, user: JwtPayload, id: number) {
    const execution = await executionRequestOfTask(em, id)
    const acknowledgement = await documentOfAckTask(em, id)
    const loaded = await this.load(user, id, em, !acknowledgement)
    if (execution) throw new BadRequestException(EXECUTION_TASK_EDIT_BLOCKED)
    if (acknowledgement) throw new BadRequestException(DOCUMENT_ACK_TASK_BLOCKED)
    if (await this.linkedWhileWaiting(em, id, false)) throw new ConflictException(TASK_STILL_OPENING)
    if (!(await taskExtrasReady(em))) throw new BadRequestException(TASK_RULES_MIGRATION_MISSING)
    return loaded
  }

  /**
   * المسؤول بيطلب تمديد الميعاد بسبب: طلب واحد معلّق على المهمة، واللي بيديرها يوافق (الموعد بيتغيّر) أو يرفض. المسؤول مايغيّرش الموعد
   * بنفسه. المهمة الشخصية موعدها بإيد صاحبها.
   */
  async requestExtension(user: JwtPayload, id: number, input: { dueDate?: unknown; reason?: unknown }) {
    const saved = await this.ds.transaction(async em => {
      const { task, access, extras } = await this.plainLocked(em, user, id)
      if (!access.work) throw new ForbiddenException('طلب تمديد الميعاد لمسؤول المهمة')
      if (extras.isPersonal) throw new BadRequestException('المهمة الشخصية موعدها بيتعدّل من صاحبها')
      if (!TASK_OPEN_STATUSES.includes(task.status as TaskStatus)) throw new BadRequestException('المهمة مقفولة')
      if (!task.dueDate) throw new BadRequestException('المهمة من غير موعد — مفيش ميعاد يتمدّد')
      if (extras.extensionDueDate) throw new ConflictException('فيه طلب تمديد مستني الرد')
      const dueDate = input.dueDate
      if (!isTaskDate(dueDate)) throw new BadRequestException('الموعد المطلوب تاريخ بصيغة YYYY-MM-DD')
      if (dueDate <= task.dueDate || dueDate < taskLocalDate(new Date())) throw new BadRequestException('الموعد المطلوب لازم يبقى بعد موعد المهمة الحالي ومش قبل النهارده')
      const reason = this.cleanText(input.reason, 500)
      if (!reason || reason.length < 3) throw new BadRequestException('اكتب سبب طلب التمديد')
      await writeTaskExtras(em, task.id, { extensionDueDate: dueDate, extensionReason: reason })
      await recordTaskLog(em, user, task, 'EXTENSION_REQUESTED', `طلب تمديد الميعاد من ${task.dueDate} لـ${dueDate}: ${reason}`, ['CREATOR'])
      task.updatedAt = new Date()
      return em.getRepository(Task).save(task)
    })
    return (await this.views(user, [saved]))[0]
  }

  /** رد اللي بيدير المهمة على طلب التمديد: الموافقة بتغيّر الموعد (وبتصفّر ختم التذكير والتصعيد زي أي تغيير موعد)، والرفض بيشيل الطلب */
  async decideExtension(user: JwtPayload, id: number, input: { approve?: unknown; note?: unknown }) {
    const saved = await this.ds.transaction(async em => {
      const { task, access, extras } = await this.plainLocked(em, user, id)
      if (!access.manage) throw new ForbiddenException('الرد على طلب التمديد للي كلّف بالمهمة أو لصاحب صلاحية «إدارة المهام»')
      if (!extras.extensionDueDate) throw new BadRequestException('مفيش طلب تمديد مستني الرد')
      const note = this.cleanText(input.note, 500)
      if (input.approve === true) {
        if (extras.extensionDueDate < taskLocalDate(new Date())) throw new BadRequestException('الموعد المطلوب فات — ارفض الطلب وعدّل موعد المهمة')
        Object.assign(task, { dueDate: extras.extensionDueDate, remindedAt: null, escalatedAt: null })
        await recordTaskLog(em, user, task, 'EXTENSION_APPROVED', `وافق على تمديد الميعاد لـ${extras.extensionDueDate}${note ? `: ${note}` : ''}`, ['ASSIGNEE'])
      } else {
        await recordTaskLog(em, user, task, 'EXTENSION_REJECTED', `رفض تمديد الميعاد لـ${extras.extensionDueDate}${note ? `: ${note}` : ''}`, ['ASSIGNEE'])
      }
      await writeTaskExtras(em, task.id, { extensionDueDate: null, extensionReason: null })
      task.updatedAt = new Date()
      return em.getRepository(Task).save(task)
    })
    return (await this.views(user, [saved]))[0]
  }

  /**
   * تقييم مهمة معلّمة «تحتاج تقييم» بعد ما تخلص (الميزة الفرعية tasks.rating): اللي كلّف بيها، بحقه دلوقتي، مرة واحدة، من 1 لـ5 وتعليق
   * اختياري. التقييم = قبول الإنجاز: المهمة المقيّمة ماتترجعش للتعديل.
   */
  async rate(user: JwtPayload, id: number, input: { rating?: unknown; note?: unknown }) {
    if (!(await this.ratingOn())) throw new BadRequestException(TASK_RATING_CLOSED)
    const saved = await this.ds.transaction(async em => {
      const { task, access, extras } = await this.plainLocked(em, user, id)
      if (task.createdByUserId !== user.sub || !access.manage || extras.isPersonal) throw new ForbiddenException('تقييم المهمة للي كلّف بيها')
      // B-ADD.18 (كلمة المالك 12 أكتوبر: «مفيش موظف بيقيّم نفسه»): اللي كلّف بيها والمهمة على موظف حسابه هو (حسابه اتربط بموظف المسؤول
      // بعد التكليف، أو صاحب صلاحية كلّف نفسه قبل ترحيل 096) مابيقيّمهاش
      if (task.assigneeEmployeeId != null && !!user.employeeId && task.assigneeEmployeeId === user.employeeId) throw new ForbiddenException(TASK_SELF_RATING)
      if (task.status !== 'DONE') throw new BadRequestException('التقييم بعد ما المهمة تخلص')
      if (!extras.needsRating) throw new BadRequestException('المهمة دي مش معلّمة «تحتاج تقييم»')
      if (extras.rating != null) throw new ConflictException('المهمة اتقيّمت قبل كده')
      const rating = input.rating
      if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('التقييم رقم من 1 لـ5')
      await writeTaskExtras(em, task.id, { rating, ratingNote: this.cleanText(input.note, 500) })
      // السطر من غير الرقم: الرقم في خانة التقييم (بتختفي لو الميزة اتقفلت)، والحوار بيفضل. والمسؤول بيتبلّغ: الموظف بيشوف تقييمه في كارت مهمته
      await recordTaskLog(em, user, task, 'RATED', 'قيّم المهمة', ['ASSIGNEE'])
      task.updatedAt = new Date()
      return em.getRepository(Task).save(task)
    })
    return (await this.views(user, [saved]))[0]
  }

  /**
   * تقرير الالتزام: لكل موظف في الفترة (بتاريخ الإقفال) — اللي خلص، وفي الميعاد، والمتأخر، ومن غير موعد، ومرات الرجوع، ومتوسط التقييم لو
   * الميزة مفتوحة. على المهام اللي الحساب يشوفها: «عرض كل المهام» = مهام فروع نطاقه؛ وغيره = مهام مرؤوسيه المباشرين واللي كلّف بيه ولسه
   * بيديره. وصف الموظف بيتسمّى للي فوقه في الهيكل، أو للي فرع الموظف دلوقتي في نطاقه (صاحب صلاحية بنطاق مايتسمّالوش موظف اتنقل برّه
   * نطاقه). المهمة الشخصية ومهمة الدور برّه التقرير.
   */
  async report(user: JwtPayload, filter: { from?: string; to?: string } = {}) {
    const today = taskLocalDate(new Date())
    const to = isTaskDate(filter.to) ? filter.to : today
    const from = isTaskDate(filter.from) ? filter.from : taskAddDays(to, -REPORT_DEFAULT_DAYS)
    if (from > to || taskDaysBetween(from, to) > REPORT_MAX_DAYS) throw new BadRequestException(`فترة التقرير من تاريخ لتاريخ بعده، وبحد أقصى ${REPORT_MAX_DAYS} يوم`)
    const ratingEnabled = await this.modules.isFeatureEnabled(TASK_RATING_FEATURE)
    const empty = { available: false, ratingEnabled, from, to, truncated: false, rows: [] }
    if (!(await this.ready()) || !(await taskExtrasReady(this.ds.manager))) return empty
    const viewAll = userHasPerm(user, 'tasks.view_all'), scope = branchScopeOf(user)
    const [reports, under] = !viewAll && user.employeeId
      ? await Promise.all([this.resolver.directReportsOf(user.employeeId), this.resolver.subordinatesOf(user.employeeId)]) : [[], []]
    const closedFrom = new Date(`${from}T00:00:00`), closedBefore = new Date(`${taskAddDays(to, 1)}T00:00:00`)
    const base = () => this.ds.getRepository(Task).createQueryBuilder('t').where(`t.status = 'DONE'`).andWhere('t.assigneeEmployeeId IS NOT NULL')
      .andWhere('t.closedAt >= :closedFrom AND t.closedAt < :closedBefore', { closedFrom, closedBefore }).andWhere(notPersonalTask('t'))
      .orderBy('t.id', 'DESC').take(REPORT_TASKS_MAX + 1)
    const tasks = new Map<number, Task>()
    if (viewAll) {
      const qb = base()
      if (scope !== null) qb.andWhere('t.branchId IN (:...scope)', { scope: scope.length ? scope : [-1] })
      for (const task of await qb.getMany()) tasks.set(task.id, task)
    } else {
      for (const part of taskIdChunks(reports)) for (const task of await base().andWhere('t.assigneeEmployeeId IN (:...part)', { part }).getMany()) tasks.set(task.id, task)
      // اللي كلّفت بيه أنا ولسه بديره (أبعد من المباشرين، أو في نطاقي بـ«تكليف أي موظف»)
      const underSet = new Set(under), direct = new Set(reports)
      for (const task of await base().andWhere('t.createdByUserId = :me', { me: user.sub }).getMany()) {
        if (!direct.has(task.assigneeEmployeeId!) && task.assigneeEmployeeId !== user.employeeId
          && taskManagedBy(user, { ...task, isPersonal: false }, underSet.has(task.assigneeEmployeeId!))) tasks.set(task.id, task)
      }
    }
    const rows = [...tasks.values()].sort((a, b) => b.id - a.id)
    const truncated = rows.length > REPORT_TASKS_MAX
    const counted = rows.slice(0, REPORT_TASKS_MAX)
    const extras = await taskExtrasOf(this.ds.manager, counted.map(task => task.id))
    const employeeIds = [...new Set(counted.map(task => task.assigneeEmployeeId!))]
    const employees: Employee[] = []
    for (const part of taskIdChunks(employeeIds)) {
      employees.push(...await this.ds.getRepository(Employee).find({ where: { id: In(part) }, select: { id: true, fullName: true, employeeCode: true, branchId: true } }))
    }
    // صف الموظف بيتسمّى للي فوقه في الهيكل (مرؤوس مباشر أو تحته في الشجرة)، أو للي فرع الموظف دلوقتي في نطاقه: صاحب صلاحية بنطاق
    // («عرض كل المهام»، أو «تكليف أي موظف» على اللي كلّف بيه) مايتسمّالوش موظف اتنقل برّه نطاقه
    const structural = new Set([...reports, ...under])
    const shown = new Map(employees.filter(row => structural.has(row.id) || inBranchScope(scope, row.branchId)).map(row => [row.id, row]))
    const branches = shown.size
      ? await this.ds.getRepository(Branch).find({ where: { id: In([...new Set([...shown.values()].map(row => row.branchId))]) }, select: { id: true, name: true } }) : []
    const branchName = new Map(branches.map(row => [row.id, row.name]))
    const byEmployee = new Map<number, { done: number; onTime: number; late: number; noDueDate: number; returns: number; rated: number; ratingSum: number }>()
    for (const task of counted) {
      if (!shown.has(task.assigneeEmployeeId!)) continue
      const row = byEmployee.get(task.assigneeEmployeeId!) ?? { done: 0, onTime: 0, late: 0, noDueDate: 0, returns: 0, rated: 0, ratingSum: 0 }
      const extra = extras.get(task.id) ?? NO_TASK_EXTRAS, compliance = taskCompliance(task)
      row.done++
      if (!compliance) row.noDueDate++; else if (compliance.onTime) row.onTime++; else row.late++
      row.returns += extra.returnCount
      if (ratingEnabled && extra.rating != null) { row.rated++; row.ratingSum += extra.rating }
      byEmployee.set(task.assigneeEmployeeId!, row)
    }
    return {
      available: true, ratingEnabled, from, to, truncated,
      rows: [...byEmployee.entries()].map(([employeeId, row]) => {
        const employee = shown.get(employeeId)!
        return {
          employeeId, fullName: employee.fullName, employeeCode: employee.employeeCode, branchName: branchName.get(employee.branchId) ?? null,
          done: row.done, onTime: row.onTime, late: row.late, noDueDate: row.noDueDate, returns: row.returns,
          rated: ratingEnabled ? row.rated : null, ratingAverage: ratingEnabled && row.rated ? Math.round((row.ratingSum / row.rated) * 10) / 10 : null,
        }
      }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.employeeId - b.employeeId),
    }
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
          // المهمة الشخصية تذكير صاحبها بس: تأخيرها بيتختم (ماتتفحصش كل يوم) من غير تبليغ لحد
          const personal = escalate && (await taskExtrasOfOne(em, id)).isPersonal
          // الختم زي ما القاعدة بترجّعه: نفس القراءة اللي فحص الإرسال هيقارن بيها بعدين
          const stamped = await em.getRepository(Task).findOneOrFail({ where: { id }, select: { id: true, remindedAt: true, escalatedAt: true } })
          if (remind) await this.recordEvent(em, 'TASK_DUE_SOON', task, stamped.remindedAt)
          if (escalate && !personal) await this.recordEvent(em, 'TASK_OVERDUE', task, stamped.escalatedAt)
          return { remind, escalate: escalate && !personal }
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
  private async views(user: JwtPayload, tasks: Task[], knownSubordinates?: number[]) {
    if (!tasks.length) return []
    // B2.5 (إضافة المالك): حالة قواعد الإسناد (فاضية قبل ترحيل 096)، وميزة التقييم
    const extrasReady = await taskExtrasReady(this.ds.manager)
    const extrasOf = await taskExtrasOf(this.ds.manager, tasks.map(task => task.id))
    const ratingEnabled = extrasReady && await this.modules.isFeatureEnabled(TASK_RATING_FEATURE)
    const ids = <T>(values: Array<T | null | undefined>) => [...new Set(values.filter((value): value is T => value != null))]
    const employeeIds = ids(tasks.map(task => task.assigneeEmployeeId)), userIds = ids(tasks.flatMap(task => [task.createdByUserId, task.closedByUserId]))
    // «اللي كلّف بيها» بيديرها طول ما مسؤولها تحته في الشجرة (نفس حكم taskAccess): اللي تحته مرة واحدة للقايمة كلها
    // B2.6: مهام تنفيذ الطلبات (رقم المهمة ← طلبها)
    const requestOf = await executionRequestsOfTasks(this.ds.manager, tasks.map(task => task.id))
    // B2.7-ب: مهام إقرار المستندات (رقم المهمة ← مستندها)
    const documentOf = await documentsOfAckTasks(this.ds.manager, tasks.map(task => task.id))
    const hrOverride = this.resolver.hasHrOverride(user)
    const mayManageAsManager = !!user.employeeId && tasks.some(task => task.createdByUserId === user.sub && task.assigneeEmployeeId != null)
    const subordinates = new Set(mayManageAsManager ? knownSubordinates ?? await this.resolver.subordinatesOf(user.employeeId!) : [])
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
      const mine = taskAwaitsAccount(user, task), extra: TaskExtras = extrasOf.get(task.id) ?? NO_TASK_EXTRAS
      const canManage = taskManagedBy(user, { ...task, isPersonal: extra.isPersonal },
        task.assigneeEmployeeId != null && task.assigneeEmployeeId !== user.employeeId && subordinates.has(task.assigneeEmployeeId))
      // B2.6: مهمة تنفيذ طلب (link) مابتتدارش من هنا، وبيشتغل عليها اللي هي عليه أو مدير النظام — مش صاحب الطلب ولا منشئه. وتفاصيلها
      // (رقم الطلب، والإثبات، وسبب التعليق أو الإلغاء، ومين قفلها) تبع الطلب، فللي يقدر يفتحه بس: اللي بيشتغل عليها وهي مفتوحة، واللي
      // قفلها. الباقي (عرض كل المهام، إدارة المهام) بيشوفوا إنها موجودة وحالتها وموعدها
      const link = requestOf.get(task.id), unblocks = !!link && user.role === 'super_admin'
      const works = link ? !executionOwnRequest(user, link, hrOverride) && (mine || unblocks) : mine
      const party = !link || (open ? mine || unblocks : task.closedByUserId === user.sub)
      const view = {
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
        // B2.5 (إضافة المالك): الشخصية، والالتزام بالميعاد (محسوب من الإقفال والموعد)، ومرات الرجوع، وطلب التمديد المعلّق، والتقييم
        // (خاناته للي الميزة مفتوحة عنده بس)، واللي الحساب يقدر يعمله منهم
        rulesAvailable: extrasReady, personal: extra.isPersonal, returnCount: extra.returnCount,
        compliance: taskCompliance(task), complianceLabel: taskComplianceLabel(taskCompliance(task)),
        extension: extra.extensionDueDate ? { dueDate: extra.extensionDueDate, reason: extra.extensionReason } : null,
        canRequestExtension: extrasReady && open && works && !link && !extra.isPersonal && !!task.dueDate && !extra.extensionDueDate,
        canDecideExtension: canManage && !link && !!extra.extensionDueDate,
        canNotMine: extrasReady && open && works && !link && !extra.isPersonal && task.createdByUserId !== user.sub,
        ratingEnabled, needsRating: ratingEnabled && extra.needsRating, rating: ratingEnabled ? extra.rating : null, ratingNote: ratingEnabled ? extra.ratingNote : null,
        // B-ADD.18: مش للي المهمة عليه هو نفسه
        canRate: ratingEnabled && !link && task.status === 'DONE' && extra.needsRating && extra.rating == null && task.createdByUserId === user.sub && canManage
          && !(task.assigneeEmployeeId != null && task.assigneeEmployeeId === user.employeeId),
      }
      // B2.7-ب: مهمة إقرار مستند — من غير أزرار (بتتقفل مع الإقرار، وبتتلغي مع إلغاء الطلب)، ورقم المستند لصاحبها بس (يفتحه من «مستنداتي»)
      const document = documentOf.get(task.id)
      return document ? { ...view, canWork: false, canManage: false, canRequestExtension: false, canDecideExtension: false, canNotMine: false, canRate: false,
        documentAck: true, documentAckId: mine ? document.documentId : null }
        : { ...view, documentAck: false, documentAckId: null }
    })
  }
}
