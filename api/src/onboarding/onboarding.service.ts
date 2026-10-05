import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope as scopeHasBranch, isEmptyBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { HIRING_DOCS_TASK_KEY, hiringDocsTaskBlockedMessage, hiringDocsTaskRow, requiredHiringDocTypes, syncHiringDocsTasks,
  type HiringDocsStatus } from '../assets/hiring-documents'
import { Employee, EmployeeStatus } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { Branch } from '../org/entities/branch.entity'
import { QueueService } from '../queue/queue.service'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  OnboardingParty,
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingTemplateItem,
} from './onboarding.entities'

// نافذة «الموظف الجديد» بالأيام من تاريخ الالتحاق — من الإعدادات
// B2.5: مهمة الطابور اللي بتعمل مهام الموظف وقت تعيينه (مستهلك حدث EMPLOYEE_HIRED)
export const ONBOARDING_HIRED_JOB = 'onboarding.materialize'
const WINDOW_KEY = 'onboarding.window_days'
const WINDOW_DEFAULT = 90

// صلاحية كل جهة — نفس خريطة جهات إخلاء الطرف، والمدير المباشر هيكلياً
const PARTY_PERMS: Record<OnboardingParty, string[]> = {
  hr: ['approve.hr'],
  it: ['approve.it'],
  custody: ['custody.assign', 'approve.custody'],
  finance: ['approve.finance'],
  manager: [],
}

// القالب الافتراضي (كان ثابتاً في الشاشة) — الموعد بإزاحة من تاريخ الالتحاق بدل
// «كله يوم المباشرة» اللي كان بيخلّي كل مهمة متأخرة من تاني يوم
const DEFAULT_TEMPLATE: Array<{
  label: string
  party: OnboardingParty
  dueOffsetDays: number
}> = [
  { label: 'استلام المستندات الأصلية والتحقق منها', party: 'hr', dueOffsetDays: 0 },
  { label: 'توقيع العقد وسياسات الشركة', party: 'hr', dueOffsetDays: 0 },
  { label: 'إنشاء البريد الإلكتروني وحسابات الأنظمة', party: 'it', dueOffsetDays: 0 },
  { label: 'تسليم العهدة (لابتوب + بطاقة دخول)', party: 'custody', dueOffsetDays: 1 },
  { label: 'إضافة بصمة الموظف على جهاز الفرع', party: 'hr', dueOffsetDays: 1 },
  { label: 'جولة تعريفية وتقديم للفريق', party: 'manager', dueOffsetDays: 2 },
  { label: 'فتح ملف الراتب والحساب البنكي', party: 'finance', dueOffsetDays: 7 },
  { label: 'التدريب التعريفي الإلزامي', party: 'hr', dueOffsetDays: 14 },
]

// تاريخ محلي YYYY-MM-DD — ممنوع toISOString على «الآن» (قاعدة التوقيت المحلي)
const localDateOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// YYYY-MM-DD بعد (أو قبل) n يوم — بالتقويم المحلي
const addDays = (ymd: string, n: number): string => {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  return localDateOf(new Date(y, m - 1, d + n))
}

// الجهات بالصلاحية مقفولة على فرع الموظف — نطاق null (مدير النظام) = كل الفروع، وحساب الفروع = الفروع دي بس
const inBranchScope = (user: JwtPayload, branchId?: number | null) => scopeHasBranch(branchScopeOf(user), branchId)

// أرقام بدفعات تحت حد معاملات SQL Server (2100)
const idChunks = (ids: number[], size = 1000): number[][] =>
  Array.from({ length: Math.ceil(ids.length / size) }, (_, index) => ids.slice(index * size, (index + 1) * size))

export interface OnboardingTaskInput {
  label: string
  party: OnboardingParty
  dueDate: string
}

export interface OnboardingTaskPatch {
  status?: OnboardingTaskStatus
  note?: string
  label?: string
  party?: OnboardingParty
  dueDate?: string
}

export interface OnboardingTemplateInput {
  label?: string
  party?: OnboardingParty
  dueOffsetDays?: number
  sortOrder?: number
  isActive?: boolean
}

@Injectable()
export class OnboardingService implements OnApplicationBootstrap, OnModuleInit {
  private readonly logger = new Logger(OnboardingService.name)
  // قفل داخل العملية لكل موظف: نداءان متزامنان لا ينسخان القالب له مرتين
  private readonly locks = new Map<number, Promise<void>>()

  constructor(
    @InjectRepository(OnboardingTemplateItem)
    private readonly template: Repository<OnboardingTemplateItem>,
    @InjectRepository(OnboardingTask)
    private readonly tasks: Repository<OnboardingTask>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Branch)
    private readonly branches: Repository<Branch>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly resolver: ApproverResolver,
    private readonly queue: QueueService,
    private readonly modules: ModulesService
  ) {}

  // B2.5: مهام الموظف الجديد بتتعمل وقت التعيين (حدث «تم التعيين» من الطابور) مش مع أول فتح للشاشة — عشان تظهر في «مهامي»
  // لأصحابها من أول يوم. فتح الشاشة لسه بينسخ للي اتعيّنوا قبل كده (نفس الدالة، وآمنة للتكرار)
  onModuleInit() {
    this.queue.registerHandler(ONBOARDING_HIRED_JOB, async (payload) => {
      await this.materializeHired(Number((payload as { event?: { payload?: { employeeId?: unknown } } } | null)?.event?.payload?.employeeId))
    })
    this.queue.subscribe('EMPLOYEE_HIRED', ONBOARDING_HIRED_JOB)
  }

  /**
   * مهام تهيئة موظف لسه متعيّن: نسخ القالب ومهمة المسوغات — نفس اللي فتح الشاشة بيعمله، وبنفس نافذة «الموظف الجديد» بتاعتها
   * (تاريخ التحاقه جوه النافذة أو لسه جاي). ملف اتضاف بتاريخ التحاق قديم (موظف قايم بيتسجّل) أو من غير تاريخ مش «موظف جديد»:
   * الشاشة مابتعملوش مهام، ولا التعيين. الموديول مقفول = مفيش مهام
   */
  async materializeHired(employeeId: number) {
    if (!Number.isSafeInteger(employeeId) || !(await this.modules.isEnabled('onboarding'))) return
    const emp = await this.employees.findOne({ where: { id: employeeId, status: Not(In<EmployeeStatus>(['terminated', 'archived'])) } })
    if (!emp?.joinDate || String(emp.joinDate).slice(0, 10) < addDays(localDateOf(new Date()), -(await this.windowDays()))) return
    await this.materialize([emp])
    if ((await requiredHiringDocTypes(this.tasks.manager)).length) await this.ensureHiringDocsTasks([emp])
  }

  // القالب الافتراضي عند أول إقلاع (الجدول فاضي) — يُعدَّل بعدها من الشاشة
  async onApplicationBootstrap() {
    try {
      if ((await this.template.count()) > 0) return
      await this.template.insert(
        DEFAULT_TEMPLATE.map((t, i) => ({ ...t, sortOrder: (i + 1) * 10, isActive: true }))
      )
      this.logger.log(`أُضيف قالب التهيئة الافتراضي (${DEFAULT_TEMPLATE.length} مهام)`)
    } catch (e) {
      // لا يمنع الإقلاع — القالب يُضاف من الشاشة
      this.logger.warn(`تعذر إضافة قالب التهيئة الافتراضي: ${(e as Error).message}`)
    }
  }

  // ===== القائمة =====
  // الموظفون الجدد بتاريخ الالتحاق (خلال النافذة أو ينتظر التحاقهم) + من لسه عنده
  // مهام مفتوحة بعد النافذة، في نطاق فرعك. employees.view يرى النطاق كاملاً،
  // وغيره يرى الموظفين اللي عليه فيهم مهمة كجهة (HR/IT/العهدة/المالية/المدير المباشر)
  async list(user: JwtPayload) {
    const windowDays = await this.windowDays()
    const from = addDays(localDateOf(new Date()), -windowDays)
    const scope = branchScopeOf(user)
    const base = {
      ...(scope !== null ? { branchId: branchIdIn(scope) } : {}),
      status: Not(In<EmployeeStatus>(['terminated', 'archived'])),
    }
    const recent = await this.employees.find({
      where: { ...base, joinDate: MoreThanOrEqual(from) },
    })
    const recentIds = new Set(recent.map((e) => e.id))
    const openIds = [
      ...new Set(
        (
          await this.tasks.find({
            where: { status: 'PENDING' },
            select: { employeeId: true },
          })
        )
          .map((t) => t.employeeId)
          .filter((id) => !recentIds.has(id))
      ),
    ]
    const lingering = openIds.length
      ? await this.employees.find({ where: { ...base, id: In(openIds) } })
      : []
    const emps = [...recent, ...lingering].sort((a, b) =>
      String(b.joinDate ?? '').localeCompare(String(a.joinDate ?? ''))
    )

    // أول ظهور للموظف = نسخ القالب الفعّال له (مرة واحدة — بعدها قائمته مستقلة)
    await this.materialize(recent)
    // «استلام مسوغات التعيين» (ترحيل 075): مهمة نظام لكل موظف في القائمة طول ما فيه نوع مستند مطلوب للتعيين —
    // بتتعمل مع باقي المهام وللموجودين في القائمة من قبل، وحالتها بتتحسب من المستندات مع كل قراءة
    const required = await requiredHiringDocTypes(this.tasks.manager)
    if (required.length) await this.ensureHiringDocsTasks(emps)
    const hiring = await syncHiringDocsTasks(this.tasks.manager, emps.map((e) => e.id), required)

    const empIds = emps.map((e) => e.id)
    const tasks = empIds.length
      ? await this.tasks.find({
          where: { employeeId: In(empIds) },
          order: { sortOrder: 'ASC', id: 'ASC' },
        })
      : []
    const byEmp = new Map<number, OnboardingTask[]>()
    for (const t of tasks) {
      const arr = byEmp.get(t.employeeId) ?? []
      arr.push(t)
      byEmp.set(t.employeeId, arr)
    }
    const names = await this.userNames(tasks.map((t) => t.doneBy))
    const branchIds = [...new Set(emps.map((e) => e.branchId))]
    const branchName = new Map(
      (branchIds.length
        ? await this.branches.find({ where: { id: In(branchIds) } })
        : []
      ).map((b) => [b.id, b.name])
    )
    const seesAll = userHasPerm(user, 'employees.view')

    const rows = await Promise.all(
      emps.map(async (emp) => {
        const list = byEmp.get(emp.id) ?? []
        const isHr = this.isHrOf(user, emp)
        // المدير المباشر يُحسب فقط لو له مهمة «المدير المباشر» والمستخدم مش HR
        const isManager =
          !isHr && list.some((t) => t.party === 'manager')
            ? await this.isManagerOf(user, emp)
            : false
        const isParty = this.partyOf(user, emp, isManager)
        if (!seesAll && !isHr && !list.some((t) => isParty(t.party))) return null
        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          jobTitle: emp.jobTitle ?? null,
          branchId: emp.branchId,
          branchName: branchName.get(emp.branchId) ?? '—',
          status: emp.status,
          joinDate: emp.joinDate ?? null,
          // HR: إضافة مهمة وتعديل الوصف والجهة والموعد والاستبعاد
          canManage: isHr,
          tasks: list.map((t) => this.view(t, isHr || isParty(t.party), names, hiring.get(emp.id))),
        }
      })
    )
    return {
      windowDays,
      canManageTemplate: userHasPerm(user, 'settings.manage'),
      employees: rows.filter((r): r is NonNullable<typeof r> => r !== null),
    }
  }

  // ===== B2.5: مهام التهيئة المفتوحة اللي على جهة الحساب («مهامي») =====
  // نفس حكم «الجهة» بتاع القايمة (partyOf): صلاحية الجهة في فرع الموظف، أو المدير المباشر هيكليًا — من غير المخرجين اللي بيقفلوا أي
  // مهمة من شاشة التهيئة ومش كل مهام الشركة «عليهم»: صلاحية الموارد البشرية العامة (employees.edit)، ومدير النظام («*»)، زي ما
  // خطوات الاعتماد الوظيفية ومهام الأدوار ماشيين. الإقفال من شاشة التهيئة
  async myOpenTasks(user: JwtPayload) {
    const scope = branchScopeOf(user)
    const granted = user.permissions ?? []
    // العدّاد بيتنادى مع كل صفحة: القراءة على قد الجهات اللي الحساب بيحملها بصلاحيته في نطاق فروعه، ومرؤوسيه المباشرين (لمهام
    // «المدير المباشر»، بنفس حل المدير المباشر ومن غير قيد فرع). حساب من غير الاتنين مابيقراش ولا مهمة
    const parties = (Object.keys(PARTY_PERMS) as OnboardingParty[]).filter((party) => PARTY_PERMS[party].some((p) => granted.includes(p)))
    const reports = user.employeeId ? await this.resolver.directReportsOf(user.employeeId) : []
    const open = () => this.tasks.createQueryBuilder('t').innerJoin(Employee, 'e', 'e.id = t.employeeId')
      .where('t.status = :pending', { pending: 'PENDING' }).andWhere('e.status NOT IN (:...inactive)', { inactive: ['terminated', 'archived'] })
    const pending: OnboardingTask[] = []
    if (parties.length && !isEmptyBranchScope(scope)) {
      const byParty = open().andWhere('t.party IN (:...parties)', { parties })
      if (scope !== null) byParty.andWhere('e.branchId IN (:...scope)', { scope })
      pending.push(...await byParty.getMany())
    }
    for (const part of idChunks(reports)) {
      pending.push(...await open().andWhere('t.party = :manager', { manager: 'manager' }).andWhere('t.employeeId IN (:...part)', { part }).getMany())
    }
    if (pending.length === 0) return []
    pending.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || a.id - b.id)
    const emps: Employee[] = []
    for (const part of idChunks([...new Set(pending.map((t) => t.employeeId))])) emps.push(...await this.employees.find({ where: { id: In(part) } }))
    const empById = new Map(emps.map((e) => [e.id, e]))
    const mine: Array<{ task: OnboardingTask; emp: Employee }> = []
    for (const task of pending) {
      const emp = empById.get(task.employeeId)
      if (emp) mine.push({ task, emp })
    }
    // «استلام مسوغات التعيين» حالتها من المستندات: بتتحسب دلوقتي زي القايمة، واللي اكتملت مابتظهرش
    const hiringEmps = [...new Set(mine.filter((row) => row.task.systemKey === HIRING_DOCS_TASK_KEY).map((row) => row.emp.id))]
    const stillOpen = new Set<number>()
    if (hiringEmps.length) {
      await syncHiringDocsTasks(this.tasks.manager, hiringEmps)
      for (const part of idChunks(hiringEmps)) {
        const rows = await this.tasks.find({ where: { employeeId: In(part), systemKey: HIRING_DOCS_TASK_KEY, status: 'PENDING' }, select: { id: true } })
        for (const row of rows) stillOpen.add(row.id)
      }
    }
    return mine
      .filter(({ task }) => task.systemKey !== HIRING_DOCS_TASK_KEY || stillOpen.has(task.id))
      .map(({ task, emp }) => ({
        taskId: task.id,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCode: emp.employeeCode,
        label: task.label,
        party: task.party,
        dueDate: task.dueDate,
      }))
  }

  // ===== إتمام/إعادة فتح/تعديل مهمة =====
  // الإتمام وإعادة الفتح والملاحظة: جهة المهمة أو HR. الوصف والجهة والموعد
  // والاستبعاد («غير مطلوبة») وإعادة فتح المستبعدة: HR في فرع الموظف فقط
  async updateTask(user: JwtPayload, id: number, dto: OnboardingTaskPatch) {
    let task = await this.tasks.findOne({ where: { id } })
    if (!task) throw new NotFoundException('المهمة غير موجودة')
    const emp = await this.employees.findOne({ where: { id: task.employeeId } })
    if (!emp) throw new NotFoundException('المهمة غير موجودة')
    const isHr = this.isHrOf(user, emp)
    const isManager =
      !isHr && task.party === 'manager' ? await this.isManagerOf(user, emp) : false
    const isParty = this.partyOf(user, emp, isManager)(task.party)
    if (!isHr && !isParty) {
      // خارج نطاق الفرع = غير موجودة (نفس عزل ملف الموظف)
      if (!inBranchScope(user, emp.branchId)) {
        throw new NotFoundException('المهمة غير موجودة')
      }
      throw new ForbiddenException(
        'المهمة ليست على جهتك — تتمّها جهتها أو الموارد البشرية'
      )
    }
    const adminChange =
      dto.label !== undefined ||
      dto.party !== undefined ||
      dto.dueDate !== undefined ||
      dto.status === 'SKIPPED' ||
      task.status === 'SKIPPED'
    if (adminChange && !isHr) {
      throw new ForbiddenException(
        'تعديل الوصف والجهة والموعد واستبعاد المهمة للموارد البشرية فقط'
      )
    }
    // «استلام مسوغات التعيين»: حالتها من المستندات — ماتتقفلش (تمّت/غير مطلوبة) والناقص موجود، وبتكتمل لوحدها لما يترفع
    let hiring: HiringDocsStatus | undefined
    if (task.systemKey === HIRING_DOCS_TASK_KEY) {
      if (dto.label !== undefined || dto.party !== undefined) {
        throw new BadRequestException('وصف مهمة «استلام مسوغات التعيين» وجهتها ثابتين — دي مهمة النظام وبتكتمل لوحدها لما المستندات المطلوبة تترفع')
      }
      hiring = (await syncHiringDocsTasks(this.tasks.manager, [task.employeeId])).get(task.employeeId)
      task = (await this.tasks.findOne({ where: { id } })) ?? task
      if (dto.status !== undefined && dto.status !== task.status) {
        const missing = hiring?.missing ?? []
        throw new BadRequestException(missing.length ? hiringDocsTaskBlockedMessage(missing)
          : 'مسوغات التعيين كاملة، فالمهمة بتفضل مكتملة — لو فيه مستند غلط عدّله من «مستندات الموظفين»')
      }
      // حالة المهمة دي من المستندات بس (CR20-N01): الملاحظة والموعد بيتكتبوا لوحدهم من غير ما نعيد حفظ الكيان كله —
      // وإلا حالة قديمة اتقرت قبل حذف مستند بالتزامن ترجع «تمّت». وبعد الكتابة بنعيد حسابها من المستندات دلوقتي
      const patch: Partial<Pick<OnboardingTask, 'note' | 'dueDate'>> = {}
      if (dto.dueDate !== undefined) patch.dueDate = dto.dueDate
      if (dto.note !== undefined) patch.note = dto.note.trim()
      // حفظ جزئي ({ id, ...الخانات دي بس }): TypeORM بيكتب الأعمدة المبعوتة بس، فالحالة المحفوظة ماتتلمسش
      if (Object.keys(patch).length) await this.tasks.save({ id, ...patch })
      hiring = (await syncHiringDocsTasks(this.tasks.manager, [task.employeeId])).get(task.employeeId)
      const saved = (await this.tasks.findOne({ where: { id } })) ?? task
      return this.view(saved, isHr || isParty, await this.userNames([saved.doneBy]), hiring)
    }
    if (dto.label !== undefined) task.label = this.cleanLabel(dto.label)
    if (dto.party !== undefined) task.party = dto.party
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate
    if (dto.note !== undefined) task.note = dto.note.trim()
    if (dto.status !== undefined && dto.status !== task.status) {
      task.status = dto.status
      const reopened = dto.status === 'PENDING'
      task.doneBy = reopened ? null : user.sub
      task.doneAt = reopened ? null : new Date()
    }
    await this.tasks.save(task)
    return this.view(task, isHr || isParty, await this.userNames([task.doneBy]), hiring)
  }

  // ===== مهمة إضافية لموظف بعينه — HR في فرع الموظف =====
  async addTask(user: JwtPayload, employeeId: number, dto: OnboardingTaskInput) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp || !inBranchScope(user, emp.branchId)) {
      throw new NotFoundException('الموظف غير موجود')
    }
    if (!this.isHrOf(user, emp)) {
      throw new ForbiddenException('إضافة مهام التهيئة للموارد البشرية فقط')
    }
    const [last] = await this.tasks.find({
      where: { employeeId },
      order: { sortOrder: 'DESC' },
      take: 1,
    })
    const saved = await this.tasks.save(
      this.tasks.create({
        employeeId,
        templateItemId: null,
        label: this.cleanLabel(dto.label),
        party: dto.party,
        dueDate: dto.dueDate,
        sortOrder: (last?.sortOrder ?? 0) + 10,
        status: 'PENDING',
      })
    )
    return this.view(saved, true, new Map())
  }

  // ===== القالب (settings.manage) =====
  listTemplate() {
    return this.template.find({ order: { sortOrder: 'ASC', id: 'ASC' } })
  }

  async createTemplateItem(
    dto: OnboardingTemplateInput & { label: string; party: OnboardingParty }
  ) {
    const [last] = await this.template.find({ order: { sortOrder: 'DESC' }, take: 1 })
    return this.template.save(
      this.template.create({
        label: this.cleanLabel(dto.label),
        party: dto.party,
        dueOffsetDays: dto.dueOffsetDays ?? 0,
        sortOrder: dto.sortOrder ?? (last?.sortOrder ?? 0) + 10,
        isActive: dto.isActive ?? true,
      })
    )
  }

  // التعديل يسري على من تُنسخ قائمته بعد كده — القوائم القائمة لا تتغير
  async updateTemplateItem(id: number, dto: OnboardingTemplateInput) {
    const row = await this.template.findOne({ where: { id } })
    if (!row) throw new NotFoundException('بند القالب غير موجود')
    if (dto.label !== undefined) row.label = this.cleanLabel(dto.label)
    if (dto.party !== undefined) row.party = dto.party
    if (dto.dueOffsetDays !== undefined) row.dueOffsetDays = dto.dueOffsetDays
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder
    if (dto.isActive !== undefined) row.isActive = dto.isActive
    return this.template.save(row)
  }

  // ===== مساعدات =====
  private async windowDays(): Promise<number> {
    const row = await this.config.findOne({ where: { key: WINDOW_KEY } })
    const n = Math.floor(Number(row?.value))
    return Number.isFinite(n) && n >= 1 ? Math.min(n, 3650) : WINDOW_DEFAULT
  }

  // نسخ القالب الفعّال لكل موظف ليس له مهام بعد (مهمة النظام مش من القالب — وجودها لوحده مايمنعش النسخ)
  private async materialize(emps: Employee[]) {
    const candidates = emps.filter((e) => !!e.joinDate)
    if (candidates.length === 0) return
    const have = new Set(
      (
        await this.tasks.find({
          where: { employeeId: In(candidates.map((e) => e.id)), systemKey: IsNull() },
          select: { employeeId: true },
        })
      ).map((t) => t.employeeId)
    )
    const missing = candidates.filter((e) => !have.has(e.id))
    if (missing.length === 0) return
    const items = await this.template.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    })
    if (items.length === 0) return
    for (const emp of missing) {
      await this.withLock(emp.id, async (tasks) => {
        // فحص ثانٍ داخل القفل — نداء متزامن ربما سبقنا
        if ((await tasks.count({ where: { employeeId: emp.id, systemKey: IsNull() } })) > 0) return
        await tasks.insert(
          items.map((it) => ({
            employeeId: emp.id,
            templateItemId: it.id,
            label: it.label,
            party: it.party,
            dueDate: addDays(emp.joinDate, it.dueOffsetDays),
            sortOrder: it.sortOrder,
            status: 'PENDING' as OnboardingTaskStatus,
          }))
        )
      })
    }
  }

  // مهمة «استلام مسوغات التعيين» لكل موظف في القائمة مالوش واحدة — مرة واحدة لكل موظف (نفس قفل نسخ القالب)
  private async ensureHiringDocsTasks(emps: Employee[]) {
    if (emps.length === 0) return
    const have = new Set(
      (
        await this.tasks.find({
          where: { employeeId: In(emps.map((e) => e.id)), systemKey: HIRING_DOCS_TASK_KEY },
          select: { employeeId: true },
        })
      ).map((t) => t.employeeId)
    )
    const today = localDateOf(new Date())
    for (const emp of emps.filter((e) => !have.has(e.id))) {
      await this.withLock(emp.id, async (tasks) => {
        if ((await tasks.count({ where: { employeeId: emp.id, systemKey: HIRING_DOCS_TASK_KEY } })) > 0) return
        await tasks.insert(hiringDocsTaskRow(emp, today))
      })
    }
  }

  // القفل اللي جوه العملية زي ما كان (نداءات نفس الخادم بتقف ورا بعض من غير ما كل واحد يمسك اتصال قاعدة وهو مستني)، وجوّاه قفل
  // قاعدة لكل موظف (B2.5، قرار B0.1): النسخ بقى بيحصل من الطابور ومن الشاشة، وممكن من نسختين من الخادم، فنداءين متزامنين ماينسخوش
  // القالب له مرتين. الفحص والكتابة جوه نفس المعاملة اللي ماسكة قفل القاعدة
  private withLock(employeeId: number, fn: (tasks: Repository<OnboardingTask>) => Promise<void>): Promise<void> {
    const run = (this.locks.get(employeeId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => this.tasks.manager.transaction(async (em) => {
        if (em.connection.options.type === 'mssql') {
          const rows = await em.query(
            `DECLARE @result int;
             EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 15000;
             SELECT @result AS lockResult;`,
            [`hr:onboarding:${employeeId}`]
          )
          if (!rows.length || Number(rows[0].lockResult) < 0) throw new Error(`تعذر قفل مهام تهيئة الموظف #${employeeId}`)
        }
        await fn(em.getRepository(OnboardingTask))
      }))
    this.locks.set(employeeId, run)
    return run.finally(() => {
      if (this.locks.get(employeeId) === run) this.locks.delete(employeeId)
    })
  }

  // HR بصلاحية تعديل الموظفين في فرع الموظف: تضيف وتعدّل وتستبعد وتتمّ أي مهمة
  private isHrOf(user: JwtPayload, emp: Employee) {
    return inBranchScope(user, emp.branchId) && userHasPerm(user, 'employees.edit')
  }

  // المدير المباشر هيكلياً (بلا قيد فرع) — managerEmployeeId المحمّل أولاً ثم سلسلة الحل
  private async isManagerOf(user: JwtPayload, emp: Employee) {
    if (!user.employeeId || user.employeeId === emp.id) return false
    if (emp.managerEmployeeId) return emp.managerEmployeeId === user.employeeId
    return (await this.resolver.directManagerOf(emp.id)) === user.employeeId
  }

  // هل المستخدم جهة المهمة؟ الجهات بصلاحياتها في فرع الموظف، والمدير المباشر هيكلياً
  private partyOf(user: JwtPayload, emp: Employee, isManager: boolean) {
    const inScope = inBranchScope(user, emp.branchId)
    return (party: string) =>
      party === 'manager'
        ? isManager
        : inScope &&
          (PARTY_PERMS[party as OnboardingParty] ?? []).some((p) => userHasPerm(user, p))
  }

  private cleanLabel(label: string) {
    const v = label.trim()
    if (v.length < 2) throw new BadRequestException('وصف المهمة حرفان على الأقل')
    return v
  }

  private async userNames(ids: Array<number | null | undefined>) {
    const uniq = [...new Set(ids.filter((x): x is number => !!x))]
    if (uniq.length === 0) return new Map<number, string>()
    const rows = await this.users.find({
      where: { id: In(uniq) },
      select: { id: true, displayName: true },
    })
    return new Map(rows.map((u) => [u.id, u.displayName]))
  }

  // شكل المهمة للواجهة — canAct: يتمّها أو يعيد فتحها (المستبعدة تعيد فتحها HR).
  // مهمة النظام «استلام مسوغات التعيين» معاها التقدّم (3/5) وأسماء الناقص
  private view(t: OnboardingTask, canAct: boolean, names: Map<number, string>, hiring?: HiringDocsStatus) {
    return {
      id: t.id,
      employeeId: t.employeeId,
      templateItemId: t.templateItemId ?? null,
      label: t.label,
      party: t.party,
      dueDate: t.dueDate,
      sortOrder: t.sortOrder,
      status: t.status,
      note: t.note ?? null,
      doneAt: t.doneAt ?? null,
      doneByUserId: t.doneBy ?? null,
      doneByName: t.doneBy ? names.get(t.doneBy) ?? null : null,
      canAct: canAct && t.status !== 'SKIPPED',
      systemKey: t.systemKey ?? null,
      ...(t.systemKey === HIRING_DOCS_TASK_KEY ? { hiringDocs: {
        requiredCount: hiring?.required.length ?? 0,
        presentCount: hiring?.present.length ?? 0,
        missing: hiring?.missing ?? [],
      } } : {}),
    }
  }
}
