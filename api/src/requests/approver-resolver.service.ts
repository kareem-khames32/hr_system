import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Team } from '../org/entities/team.entity'
import { Department } from '../org/entities/department.entity'
import { Branch } from '../org/entities/branch.entity'
import { unitChainUp } from '../org/department-tree'
import type { JwtPayload } from '../auth/auth.service'
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

// الخطوة بعد حل الأدوار عند التقديم — تُخزَّن JSON على الطلب
export interface ResolvedStep {
  stepOrder: number
  role: ApproverRole
  // محدد فقط للأدوار الهيكلية (مدير مباشر/مدير مستقبِل)
  approverEmployeeId: number | null
  slaDays: number | null
  escalateTo: string | null
  dueAt: string | null // ISO — يُحسب من slaDays وقت التقديم
  actedAt: string | null
  action: ApprovalAction | null
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
  async administrationManagerOf(employeeId: number): Promise<AdministrationApproval> {
    const emp = await this.employees.findOne({ where: { id: employeeId }, select: { id: true, departmentId: true } })
    const chain = await this.unitChainOf(emp?.departmentId)
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
          blocked: `الإدارة «${unit.name}» مالهاش مدير — حدّد مدير الإدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد` }
      }
      // مقدّم الطلب هو مدير إدارته: الخطوة لمدير الإدارة اللي فوقها
      if (unit.managerEmployeeId === employeeId) continue
      return { approverId: unit.managerEmployeeId, administrationId: unit.id, blocked: null }
    }
    if (!own) {
      return { approverId: null, administrationId: null,
        blocked: `قسم مقدّم الطلب «${chain[0].name}» مش تحت أي إدارة، فمفيش «مدير الإدارة» — حطّ القسم تحت إدارة من «الإدارات والأقسام» أو عدّل سلسلة الاعتماد` }
    }
    return { approverId: null, administrationId: own.id,
      blocked: `مقدّم الطلب هو نفسه مدير «${own.name}» ومفيش إدارة فوقها ليها مدير غيره — عدّل سلسلة الاعتماد أو حطّ الإدارة تحت «الإدارة التنفيذية»` }
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
    options: { hrUnblock?: boolean; selfRequest?: boolean } = {}
  ): boolean {
    // تدقيق ما قبل التشغيل (موجة ب): الأدوار الوظيفية (hr/مالية/IT/عهدة/رواتب/تنفيذي)
    // وsuper_admin كانت بتطابق بالدور وحده، فصاحب الطلب اللي بيحمل دور الخطوة كان
    // يعتمد طلبه بنفسه والأثر ينزل. الأدوار الهيكلية كانت محميّة وقت الحل، دي بقت
    // محميّة هنا: مين قدّم الطلب أو أنشأه ما يتصرفش في أي خطوة منه.
    if (options.selfRequest === true) return false
    // super_admin يتصرف في أي خطوة — يفكّ أي انسداد
    if (user.role === 'super_admin') return true
    if (options.hrUnblock === true && this.hasHrOverride(user)) return true
    const granted = user.permissions ?? []

    switch (step.role) {
      case 'direct_manager_of_requester':
      case 'manager_of_direct_manager':
      case 'department_manager_of_requester':
      case 'administration_manager_of_requester':
      case 'branch_manager_of_requester':
      case 'receiving_team_manager':
      case 'specific_employee':
        return (
          step.approverEmployeeId !== null &&
          user.employeeId === step.approverEmployeeId
        )
      case 'hr':
        return (
          user.role === 'hr_manager' ||
          granted.includes('approve.hr') ||
          granted.includes('hr') // توافق قديم
        )
      case 'executive':
        return (
          granted.includes('approve.executive') || granted.includes('executive')
        )
      // بالصلاحية فقط — كود الدور مش تفويض: أي دور مخصص ممكن ياخد كود زي
      // 'finance' من شاشة الأدوار (SET-8)
      case 'finance':
        return granted.includes('approve.finance') || granted.includes('finance')
      case 'it':
        return granted.includes('approve.it') || granted.includes('it')
      case 'custody_officer':
        return (
          granted.includes('approve.custody') ||
          granted.includes('custody_officer')
        )
      case 'payroll_officer':
        return granted.includes('approve.payroll')
      default:
        return false
    }
  }
}
