import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Equal, In, IsNull, Or, Repository, type EntityManager } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Team } from '../org/entities/team.entity'
import { Department } from '../org/entities/department.entity'
import { Branch } from '../org/entities/branch.entity'
import { unitChainUp } from '../org/department-tree'
import type { JwtPayload } from '../auth/auth.service'
import { inBranchScope, type BranchScope } from '../auth/guards'
import { ApproverRole } from './entities/approval-step.entity'
import type { ApprovalAction } from './entities/request-approval.entity'

// سلطة الموارد البشرية: دور hr_manager، أو صلاحية approve.hr (والقديمة hr)، أو «*» (ومنها مدير النظام).
// دالة صِرفة عشان موديولات الحضور والرواتب تقرأ نفس التعريف من غير حقن المحلِّل.
// قرار المالك 26 سبتمبر: «مدير الموارد البشرية قراره نهائي» — أي حاجة ينشئها لغيره بتسري فورًا
// (طلب نيابةً، استثناء حضور، خصم، مكافأة، إعفاء مالي)، ومنعه كمنشئ من الاعتماد اتشال. طلبه هو لنفسه
// كموظف يفضل يمشي في سلسلته، واعتماد مسير الرواتب بسلسلته المسمّاة ونطاق الفرع مابيتغيّروش.
export function hasHrOverride(user: Pick<JwtPayload, 'role' | 'permissions'>): boolean {
  const granted = user.permissions ?? []
  return (
    user.role === 'hr_manager' ||
    granted.includes('*') ||
    granted.includes('approve.hr') ||
    granted.includes('hr') // توافق قديم
  )
}

// الأدوار الوظيفية: بتتحل وقت الفعل بصلاحية الحساب ونطاق فروعه، مش بموظف محدد وقت التقديم
export const FUNCTIONAL_APPROVER_ROLES = ['hr', 'finance', 'it', 'custody_officer', 'payroll_officer', 'executive'] as const

// الحساب ده بيحمل الخطوة الوظيفية دي بصلاحياته؟ (من غير مخرج مدير النظام ولا مخرج الموارد البشرية للشغل الواقف) —
// نفس حكم satisfies بالحرف، ومحرر السلاسل بيستخدمه عشان ينبّه لخطوة مالهاش حامل في فرع (B1.11 / D05)
export function holdsFunctionalStep(user: Pick<JwtPayload, 'role' | 'permissions'>, role: string): boolean {
  const granted = user.permissions ?? []
  switch (role) {
    case 'hr':
      return (
        user.role === 'hr_manager' ||
        granted.includes('approve.hr') ||
        granted.includes('hr') // توافق قديم
      )
    case 'executive':
      return granted.includes('approve.executive') || granted.includes('executive')
    // بالصلاحية فقط — كود الدور مش تفويض: أي دور مخصص ممكن ياخد كود زي
    // 'finance' من شاشة الأدوار (SET-8)
    case 'finance':
      return granted.includes('approve.finance') || granted.includes('finance')
    case 'it':
      return granted.includes('approve.it') || granted.includes('it')
    case 'custody_officer':
      return granted.includes('approve.custody') || granted.includes('custody_officer')
    case 'payroll_officer':
      return granted.includes('approve.payroll')
    default:
      return false
  }
}

// خطوة النظام: الإضافي المكتشف اللي اتعتمد تلقائي بفترة «اعتماد تلقائي» (قرار المالك 28 سبتمبر) — خطوة واحدة بتتسجل
// معتمدة بقرار النظام (approverId = 0) في نفس معاملة إنشاء الطلب. مش دور يتضبط في سلاسل الاعتماد (APPROVER_ROLES
// في الإعدادات مابتقبلوش)، ومحدش بيطابقه في satisfies (إلا مدير النظام، والخطوة أصلًا متصرَّف فيها والطلب مكتمل)
export const SYSTEM_APPROVAL_ROLE = 'system' as const

// الخطوة بعد حل الأدوار عند التقديم — تُخزَّن JSON على الطلب
export interface ResolvedStep {
  stepOrder: number
  role: ApproverRole | typeof SYSTEM_APPROVAL_ROLE
  // محدد فقط للأدوار الهيكلية (مدير مباشر/مدير مستقبِل)
  approverEmployeeId: number | null
  slaDays: number | null
  escalateTo: string | null
  dueAt: string | null // ISO — يُحسب من slaDays وقت التقديم
  actedAt: string | null
  action: ApprovalAction | null
  // B2.6-ب: false = الخطوة مش مسموح تتفوّض لبديل معتمدها (من خطوة السلسلة وقت التقديم). من غير الخانة = مسموح، زي كل الخطوات المحفوظة
  // من قبل كده (القيمة الافتراضية للعمود)
  canDelegate?: boolean
}

// حل خطوة «مدير الإدارة»: المعتمد، أو سبب إيقاف التقديم برسالة بتسمّي القسم أو الإدارة
export interface AdministrationApproval {
  approverId: number | null
  // الإدارة اللي الخطوة وقعت على مديرها (أو اللي وقفت عندها)
  administrationId: number | null
  // null = المعتمد اتحدد
  blocked: string | null
}

@Injectable()
export class ApproverResolver {
  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>
  ) {}

  /**
   * نسخة من المحلّل مربوطة بمدير معاملة: كل قراءاتها (الموظف والفريق والقسم والفرع) بنفس اتصال المعاملة — من غير اتصال تاني من المخزن
   * (Codex P5D-B01). نفس نمط `AttendanceService.batchScope`. المنادي اللي جوه معاملة بيستخدمها بدل المحلّل المحقون.
   */
  inManager(em: EntityManager): ApproverResolver {
    return new ApproverResolver(em.getRepository(Employee), em.getRepository(Team), em.getRepository(Department), em.getRepository(Branch))
  }

  // المدير المباشر: managerEmployeeId ← قائد الفريق ← رئيس القسم ← مدير الفرع
  async directManagerOf(employeeId: number): Promise<number | null> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) return null
    if (emp.managerEmployeeId) return emp.managerEmployeeId
    if (emp.teamId) {
      const team = await this.teams.findOne({ where: { id: emp.teamId } })
      if (team?.leaderEmployeeId && team.leaderEmployeeId !== employeeId) {
        return team.leaderEmployeeId
      }
    }
    if (emp.departmentId) {
      const dept = await this.departments.findOne({
        where: { id: emp.departmentId },
      })
      if (dept?.managerEmployeeId && dept.managerEmployeeId !== employeeId) {
        return dept.managerEmployeeId
      }
    }
    const branch = await this.branches.findOne({ where: { id: emp.branchId } })
    if (branch?.managerEmployeeId && branch.managerEmployeeId !== employeeId) {
      return branch.managerEmployeeId
    }
    return null
  }

  // B2.5 («مهام فريقي»): مرؤوسي المدير المباشرين — عكس directManagerOf بنفس ترتيبه بالحرف: المدير المسجّل في الملف، وإلا قائد
  // الفريق، وإلا رئيس القسم، وإلا مدير الفرع. المرشحين من القاعدة، والحكم لكل واحد بنفس التدرّج (اختبار بيقارنه بـdirectManagerOf)
  async directReportsOf(managerEmployeeId: number): Promise<number[]> {
    const [teams, departments, branches] = await Promise.all([
      this.teams.find({ where: { leaderEmployeeId: managerEmployeeId }, select: { id: true } }),
      this.departments.find({ where: { managerEmployeeId }, select: { id: true } }),
      this.branches.find({ where: { managerEmployeeId }, select: { id: true } }),
    ])
    // «من غير مدير مسجّل» عند directManagerOf = فاضي أو صفر (العمود مالوش مفتاح أجنبي)
    const unregistered = () => Or(IsNull(), Equal(0))
    const candidates = await this.employees.find({
      where: [
        { managerEmployeeId },
        ...(teams.length ? [{ managerEmployeeId: unregistered(), teamId: In(teams.map(row => row.id)) }] : []),
        ...(departments.length ? [{ managerEmployeeId: unregistered(), departmentId: In(departments.map(row => row.id)) }] : []),
        ...(branches.length ? [{ managerEmployeeId: unregistered(), branchId: In(branches.map(row => row.id)) }] : []),
      ],
      select: { id: true, managerEmployeeId: true, teamId: true, departmentId: true, branchId: true },
    })
    const idsOf = (values: Array<number | null | undefined>) => [...new Set(values.filter((value): value is number => !!value))]
    const teamIds = idsOf(candidates.map(row => row.teamId)), departmentIds = idsOf(candidates.map(row => row.departmentId)), branchIds = idsOf(candidates.map(row => row.branchId))
    const [teamRows, departmentRows, branchRows] = await Promise.all([
      teamIds.length ? this.teams.find({ where: { id: In(teamIds) }, select: { id: true, leaderEmployeeId: true } }) : [],
      departmentIds.length ? this.departments.find({ where: { id: In(departmentIds) }, select: { id: true, managerEmployeeId: true } }) : [],
      branchIds.length ? this.branches.find({ where: { id: In(branchIds) }, select: { id: true, managerEmployeeId: true } }) : [],
    ])
    const leaderOf = new Map(teamRows.map(row => [row.id, row.leaderEmployeeId ?? null]))
    const headOf = new Map(departmentRows.map(row => [row.id, row.managerEmployeeId ?? null]))
    const branchManagerOf = new Map(branchRows.map(row => [row.id, row.managerEmployeeId ?? null]))
    return candidates.filter(emp => {
      if (emp.id === managerEmployeeId) return false
      if (emp.managerEmployeeId) return emp.managerEmployeeId === managerEmployeeId
      const leader = emp.teamId ? leaderOf.get(emp.teamId) : null
      if (leader && leader !== emp.id) return leader === managerEmployeeId
      const head = emp.departmentId ? headOf.get(emp.departmentId) : null
      if (head && head !== emp.id) return head === managerEmployeeId
      const branchManager = branchManagerOf.get(emp.branchId)
      return !!branchManager && branchManager !== emp.id && branchManager === managerEmployeeId
    }).map(emp => emp.id)
  }

  // «مدير المدير المباشر» (طلب المالك 27 سبتمبر): المدير المباشر لمدير مقدّم الطلب المباشر، بنفس قاعدة
  // «المدير المباشر» فوق. رأس الشركة (مدير الإدارة التنفيذية) من غير مدير مسجّل في ملفه مافوقوش حد،
  // فالخطوة بتقع عليه هو (top) — بدل ما التدرّج يوديها لمدير فرعه اللي تحته في الهيكل.
  // approverId = null: مفيش مدير مباشر، أو مفيش حد فوقه في الهيكل (بيانات ناقصة — التقديم بيقف برسالة)
  async managerOfDirectManagerOf(employeeId: number): Promise<{ directManagerId: number | null; approverId: number | null; top: boolean }> {
    const direct = await this.directManagerOf(employeeId)
    if (!direct) return { directManagerId: null, approverId: null, top: false }
    const manager = await this.employees.findOne({ where: { id: direct } })
    if (manager?.managerEmployeeId && manager.managerEmployeeId !== direct) {
      return { directManagerId: direct, approverId: manager.managerEmployeeId, top: false }
    }
    const executive = await this.departments.findOne({ where: { isExecutive: true } })
    if (executive?.managerEmployeeId === direct) return { directManagerId: direct, approverId: direct, top: true }
    const above = await this.directManagerOf(direct)
    return { directManagerId: direct, approverId: above && above !== direct ? above : null, top: false }
  }

  // الموظف تابع للمدير ده في سلسلة المديرين المسجّلين في الملفات؟ (مراجعة Codex الجولة 10، CR10-N01: دايرة X←Y←Z←X كانت بتعدّي
  // و«مدير المدير» يطلع مرؤوس مقدّم الطلب). بالمدير المسجّل بس، من غير التدرّج اللي ممكن يلف طبيعي (مدير فرع جوه قسم مدير تاني)
  async reportsTo(employeeId: number, managerId: number): Promise<boolean> {
    const seen = new Set<number>()
    for (let current: number | null = employeeId; current !== null && !seen.has(current);) {
      seen.add(current)
      const row = await this.employees.findOne({ where: { id: current }, select: { id: true, managerEmployeeId: true } })
      current = row?.managerEmployeeId ?? null
      if (current === managerId) return true
    }
    return false
  }

  // B2.5 (إضافة المالك 6 أكتوبر): «تحته في الشجرة» لتكليف المهام — من الموظف لفوق بخطوتين مع بعض: مديره المباشر (directManagerOf)،
  // ومديري الوحدات اللي فوق قسمه (قسمه ثم اللي فوقه بـparentId: القسم والإدارة). أي حد يتوصل له كده «فوقه»، من غير قيد فرع (زي الخطوات
  // الهيكلية). الدواير بتقف: كل موظف مرة
  private async managersStepOf(employeeId: number): Promise<number[]> {
    const emp = await this.employees.findOne({ where: { id: employeeId }, select: { id: true, departmentId: true } })
    if (!emp) return []
    const direct = await this.directManagerOf(employeeId)
    const heads = (await this.unitChainOf(emp.departmentId)).map(unit => unit.managerEmployeeId)
    return [...new Set([direct, ...heads].filter((id): id is number => !!id && id !== employeeId))]
  }

  /** الموظف تحت المدير ده في الشجرة (أي عمق)؟ */
  async isUnder(employeeId: number, managerEmployeeId: number): Promise<boolean> {
    if (!employeeId || !managerEmployeeId || employeeId === managerEmployeeId) return false
    const seen = new Set<number>([employeeId])
    for (let level = [employeeId]; level.length;) {
      const next: number[] = []
      for (const id of level) {
        for (const manager of await this.managersStepOf(id)) {
          if (manager === managerEmployeeId) return true
          if (!seen.has(manager)) { seen.add(manager); next.push(manager) }
        }
      }
      level = next
    }
    return false
  }

  /** كل اللي تحت المدير في الشجرة (أي عمق) — نفس قاعدة isUnder بالحرف، محسوبة مرة واحدة على هيكل الشركة (اختبار بيقارنهم) */
  async subordinatesOf(managerEmployeeId: number): Promise<number[]> {
    if (!managerEmployeeId) return []
    const [employees, teams, departments, branches] = await Promise.all([
      this.employees.find({ select: { id: true, managerEmployeeId: true, teamId: true, departmentId: true, branchId: true } }),
      this.teams.find({ select: { id: true, leaderEmployeeId: true } }),
      this.departments.find({ select: { id: true, managerEmployeeId: true, parentId: true } }),
      this.branches.find({ select: { id: true, managerEmployeeId: true } }),
    ])
    const leaderOf = new Map(teams.map(row => [row.id, row.leaderEmployeeId ?? null]))
    const unitOf = new Map(departments.map(row => [row.id, row]))
    const branchManagerOf = new Map(branches.map(row => [row.id, row.managerEmployeeId ?? null]))
    const below = new Map<number, number[]>()
    for (const emp of employees) {
      // المدير المباشر بنفس تدرّج directManagerOf: المسجّل في الملف، وإلا قائد الفريق، وإلا رئيس القسم، وإلا مدير الفرع
      const leader = emp.teamId ? leaderOf.get(emp.teamId) : null
      const head = emp.departmentId ? unitOf.get(emp.departmentId)?.managerEmployeeId : null
      const branchManager = branchManagerOf.get(emp.branchId)
      const direct = emp.managerEmployeeId ? emp.managerEmployeeId
        : leader && leader !== emp.id ? leader
        : head && head !== emp.id ? head
        : branchManager && branchManager !== emp.id ? branchManager : null
      const managers = new Set<number>()
      if (direct && direct !== emp.id) managers.add(direct)
      // مديري الوحدات من قسمه لفوق (نفس unitChainUp: كل وحدة مرة، والوحدة اللي مش موجودة بتوقّف الصعود)
      const seen = new Set<number>()
      for (let unitId: number | null = emp.departmentId ?? null; unitId != null && !seen.has(unitId);) {
        seen.add(unitId)
        const unit = unitOf.get(unitId)
        if (!unit) break
        if (unit.managerEmployeeId && unit.managerEmployeeId !== emp.id) managers.add(unit.managerEmployeeId)
        unitId = unit.parentId ?? null
      }
      for (const manager of managers) {
        const list = below.get(manager)
        if (list) list.push(emp.id); else below.set(manager, [emp.id])
      }
    }
    const found = new Set<number>()
    for (let level = [managerEmployeeId]; level.length;) {
      const next: number[] = []
      for (const id of level) {
        for (const child of below.get(id) ?? []) {
          if (child !== managerEmployeeId && !found.has(child)) { found.add(child); next.push(child) }
        }
      }
      level = next
    }
    return [...found]
  }


  // الوحدات من قسم الموظف لفوق بالترتيب (بادئة بقسمه) — «مدير الإدارة» و«الإدارة» في بطاقة صاحب الطلب (org/department-tree)
  unitChainOf(departmentId: number | null | undefined): Promise<Department[]> {
    return unitChainUp(departmentId, (id) => this.departments.findOne({ where: { id },
      select: { id: true, name: true, parentId: true, unitType: true, managerEmployeeId: true, branchId: true, isExecutive: true } }))
  }

  // «مدير الإدارة» (قرار المالك 27 سبتمبر: الهيكل «الإدارة ← القسم ← الفريق»): صعودًا من قسم مقدّم الطلب الحالي بـparentId، بادئًا
  // بالقسم نفسه، أول وحدة نوعها «إدارة» هي إدارته — والصعود ممكن يوصل الإدارة التنفيذية برابطها لفرع تاني، وده مقصود لأن الهيكل
  // حاطط القسم تحتها. المعتمد مدير الإدارة دي؛ ولو هو مقدّم الطلب نفسه: مدير الإدارة اللي فوقها وهكذا. السرّي مابيتخطّاهاش (زي
  // «مدير القسم»). التقديم بيقف برسالة بتسمّي الوحدة: مفيش قسم، أو مفيش إدارة فوق القسم، أو الإدارة مالهاش مدير، أو المدير الوحيد
  // اللي لقيناه هو مقدّم الطلب
  // viewer = نطاق فروع اللي بيقدّم الطلب (مقدّمه أو منشئه نيابةً) — اسم الوحدة في رسالة الإيقاف بيظهر لو جوه نطاقه بس
  async administrationManagerOf(employeeId: number, viewer?: BranchScope): Promise<AdministrationApproval> {
    const emp = await this.employees.findOne({ where: { id: employeeId }, select: { id: true, departmentId: true, branchId: true } })
    const chain = await this.unitChainOf(emp?.departmentId)
    // اسم الوحدة في رسالة الإيقاف: المسجّل لو الوحدة جوه نطاق اللي بيقدّم الطلب، وإلا الوصف العام — زي بطاقة الطلب (مراجعة Codex
    // الجولتين 12 و13، CR12-B01/CR13-B01: منشئ المسودة ممكن مايبقاش نطاقه فيه فرع الموظف بعد نقله). من غير نطاق (نداء داخلي
    // مالوش قارئ): المسجّل لو في فرع الموظف بس
    const unitName = (unit: Department) =>
      (viewer !== undefined ? inBranchScope(viewer, unit.branchId) : unit.branchId === emp?.branchId) ? unit.name
        : unit.isExecutive ? 'الإدارة التنفيذية' : unit.unitType === 'ADMINISTRATION' ? 'إدارة في فرع تاني' : 'قسم في فرع تاني'
    if (!chain.length) {
      return { approverId: null, administrationId: null,
        blocked: 'مقدّم الطلب مش مسجّل في قسم، فمفيش «مدير الإدارة» — سجّل قسمه في ملفه أو عدّل سلسلة الاعتماد' }
    }
    let own: Department | null = null
    for (const unit of chain) {
      if (unit.unitType !== 'ADMINISTRATION') continue
      own = own ?? unit
      if (!unit.managerEmployeeId) {
        return { approverId: null, administrationId: unit.id,
          blocked: `الإدارة «${unitName(unit)}» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد` }
      }
      // مقدّم الطلب هو مدير إدارته: الخطوة لمدير الإدارة اللي فوقها
      if (unit.managerEmployeeId === employeeId) continue
      return { approverId: unit.managerEmployeeId, administrationId: unit.id, blocked: null }
    }
    if (!own) {
      return { approverId: null, administrationId: null,
        blocked: `قسم مقدّم الطلب «${unitName(chain[0])}» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد` }
    }
    return { approverId: null, administrationId: own.id,
      blocked: `مقدّم الطلب هو نفسه مدير «${unitName(own)}» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»` }
  }

  // مدير قسم الموظف
  async departmentManagerOf(employeeId: number): Promise<number | null> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp?.departmentId) return null
    const dept = await this.departments.findOne({
      where: { id: emp.departmentId },
    })
    return dept?.managerEmployeeId ?? null
  }

  // مدير فرع الموظف
  async branchManagerOf(employeeId: number): Promise<number | null> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) return null
    const branch = await this.branches.findOne({ where: { id: emp.branchId } })
    return branch?.managerEmployeeId ?? null
  }

  // حل الدور لموظف محدد وقت التقديم (للأدوار الهيكلية فقط)
  async resolveApproverEmployee(
    role: ApproverRole,
    requesterId: number,
    payload: Record<string, unknown>,
    specificEmployeeId?: number | null
  ): Promise<number | null> {
    switch (role) {
      case 'direct_manager_of_requester':
        return this.directManagerOf(requesterId)
      case 'manager_of_direct_manager':
        return (await this.managerOfDirectManagerOf(requesterId)).approverId
      case 'department_manager_of_requester':
        return this.departmentManagerOf(requesterId)
      case 'administration_manager_of_requester':
        return (await this.administrationManagerOf(requesterId)).approverId
      case 'branch_manager_of_requester':
        return this.branchManagerOf(requesterId)
      case 'specific_employee':
        return specificEmployeeId ?? null
      case 'receiving_team_manager': {
        const toTeamId = Number(payload['toTeamId'])
        if (!toTeamId) return null
        const team = await this.teams.findOne({ where: { id: toTeamId } })
        return team?.leaderEmployeeId ?? null
      }
      // الأدوار الوظيفية (hr/مالية/IT/عهدة/تنفيذي) تُتحقق وقت الفعل بدور المستخدم
      default:
        return null
    }
  }

  // من يدفع الشغل الواقف: الموارد البشرية (دور hr_manager أو صلاحية approve.hr).
  // قرار المالك C1 — وهو حقّ تصرّف في شغل الآخرين وحده: لا يعتمد به أحد طلب
  // نفسه، ولا يفتح محتوى نوع سرّي، ولا يملأ الصندوق بكل طلبات الشركة. لذلك
  // لا يُفعَّل إلا حين يطلبه النداء صراحة (hrUnblock: true)
  hasHrOverride(user: JwtPayload): boolean {
    return hasHrOverride(user)
  }

  // هل المستخدم الحالي يحق له التصرف في هذه الخطوة؟
  // الدور الأساسي أو صلاحية إضافية ممنوحة من شاشة المستخدمين
  // hrUnblock: true = يُسمح بمخرج الموارد البشرية في هذا النداء (خطوة واقفة،
  // وطلب ليس لصاحب الفعل) — والافتراضي بلا مخرج
  satisfies(
    user: JwtPayload,
    step: ResolvedStep,
    options: { hrUnblock?: boolean; selfRequest?: boolean; actingFor?: ReadonlySet<number> } = {}
  ): boolean {
    // تدقيق ما قبل التشغيل (موجة ب): الأدوار الوظيفية (hr/مالية/IT/عهدة/رواتب/تنفيذي)
    // وsuper_admin كانت بتطابق بالدور وحده، فصاحب الطلب اللي بيحمل دور الخطوة كان
    // يعتمد طلبه بنفسه والأثر ينزل. الأدوار الهيكلية كانت محميّة وقت الحل، دي بقت
    // محميّة هنا: مين قدّم الطلب أو أنشأه ما يتصرفش في أي خطوة منه.
    if (options.selfRequest === true) return false
    // super_admin يتصرف في أي خطوة — يفكّ أي انسداد
    if (user.role === 'super_admin') return true
    if (options.hrUnblock === true && this.hasHrOverride(user)) return true
    return this.holdsStep(user, step, options.actingFor)
  }

  /**
   * الخطوة دي بتاعة الحساب ده فعلًا؟ (المعتمد الهيكلي المسمّى، أو حامل الدور الوظيفي بصلاحيته) — نفس حكم satisfies من غير مخرج مدير
   * النظام ولا مخرج الموارد البشرية للشغل الواقف. B2.4: الإشعار بيروح للي الخطوة بتاعتهم، مش لكل اللي «يقدر يتصرف».
   */
  holdsStep(user: Pick<JwtPayload, 'role' | 'permissions' | 'employeeId'>, step: Pick<ResolvedStep, 'role' | 'approverEmployeeId' | 'canDelegate'>,
    actingFor?: ReadonlySet<number>): boolean {
    switch (step.role) {
      case 'direct_manager_of_requester':
      case 'manager_of_direct_manager':
      case 'department_manager_of_requester':
      case 'administration_manager_of_requester':
      case 'branch_manager_of_requester':
      case 'receiving_team_manager':
      case 'specific_employee':
        // المعتمد المسمّى نفسه، أو بديله في تفويض ساري (actingFor = المفوِّضين اللي الحساب بينوب عنهم في الطلب ده) لو الخطوة مسموح تتفوّض
        return (
          step.approverEmployeeId !== null &&
          (user.employeeId === step.approverEmployeeId || (step.canDelegate !== false && !!actingFor?.has(step.approverEmployeeId)))
        )
      // الأدوار الوظيفية بالصلاحية (holdsFunctionalStep — نفس الحكم اللي محرر السلاسل بينبّه بيه)
      case 'hr':
      case 'executive':
      case 'finance':
      case 'it':
      case 'custody_officer':
      case 'payroll_officer':
        return holdsFunctionalStep(user, step.role)
      default:
        return false
    }
  }
}
