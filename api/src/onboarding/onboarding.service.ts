import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, MoreThanOrEqual, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, inBranchScope as scopeHasBranch, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee, EmployeeStatus } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  OnboardingParty,
  OnboardingTask,
  OnboardingTaskStatus,
  OnboardingTemplateItem,
} from './onboarding.entities'

// نافذة «الموظف الجديد» بالأيام من تاريخ الالتحاق — من الإعدادات
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
export class OnboardingService implements OnApplicationBootstrap {
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
    private readonly resolver: ApproverResolver
  ) {}

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
          tasks: list.map((t) => this.view(t, isHr || isParty(t.party), names)),
        }
      })
    )
    return {
      windowDays,
      canManageTemplate: userHasPerm(user, 'settings.manage'),
      employees: rows.filter((r): r is NonNullable<typeof r> => r !== null),
    }
  }

  // ===== إتمام/إعادة فتح/تعديل مهمة =====
  // الإتمام وإعادة الفتح والملاحظة: جهة المهمة أو HR. الوصف والجهة والموعد
  // والاستبعاد («غير مطلوبة») وإعادة فتح المستبعدة: HR في فرع الموظف فقط
  async updateTask(user: JwtPayload, id: number, dto: OnboardingTaskPatch) {
    const task = await this.tasks.findOne({ where: { id } })
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
    return this.view(task, isHr || isParty, await this.userNames([task.doneBy]))
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

  // نسخ القالب الفعّال لكل موظف ليس له مهام بعد
  private async materialize(emps: Employee[]) {
    const candidates = emps.filter((e) => !!e.joinDate)
    if (candidates.length === 0) return
    const have = new Set(
      (
        await this.tasks.find({
          where: { employeeId: In(candidates.map((e) => e.id)) },
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
      await this.withLock(emp.id, async () => {
        // فحص ثانٍ داخل القفل — نداء متزامن ربما سبقنا
        if ((await this.tasks.count({ where: { employeeId: emp.id } })) > 0) return
        await this.tasks.insert(
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

  private withLock(employeeId: number, fn: () => Promise<void>): Promise<void> {
    const run = (this.locks.get(employeeId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(fn)
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

  // شكل المهمة للواجهة — canAct: يتمّها أو يعيد فتحها (المستبعدة تعيد فتحها HR)
  private view(t: OnboardingTask, canAct: boolean, names: Map<number, string>) {
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
    }
  }
}
