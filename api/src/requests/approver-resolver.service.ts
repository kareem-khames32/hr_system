import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Team } from '../org/entities/team.entity'
import { Department } from '../org/entities/department.entity'
import { Branch } from '../org/entities/branch.entity'
import type { JwtPayload } from '../auth/auth.service'
import { ApproverRole } from './entities/approval-step.entity'
import type { ApprovalAction } from './entities/request-approval.entity'

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
      case 'department_manager_of_requester':
        return this.departmentManagerOf(requesterId)
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

  // هل المستخدم الحالي يحق له التصرف في هذه الخطوة؟
  // الدور الأساسي أو صلاحية إضافية ممنوحة من شاشة المستخدمين
  satisfies(user: JwtPayload, step: ResolvedStep): boolean {
    // super_admin يتصرف في أي خطوة — يفكّ أي انسداد
    if (user.role === 'super_admin') return true
    const granted = user.permissions ?? []

    switch (step.role) {
      case 'direct_manager_of_requester':
      case 'department_manager_of_requester':
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
