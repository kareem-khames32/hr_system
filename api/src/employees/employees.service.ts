import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Employee } from './employee.entity'
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto'

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Branch)
    private readonly branches: Repository<Branch>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Team)
    private readonly teams: Repository<Team>,
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
  ) {}

  // العزل بالفرع: branchScope = null → الكل (super_admin فقط)
  findAll(branchScope: number | null) {
    if (branchScope == null)
      return this.employees.find({ order: { id: 'ASC' } })
    return this.employees.find({
      where: { branchId: branchScope },
      order: { id: 'ASC' },
    })
  }

  async findOne(id: number, branchScope: number | null) {
    const emp = await this.employees.findOne({ where: { id } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    // منع الوصول عبر الفروع
    if (branchScope != null && emp.branchId !== branchScope) {
      throw new NotFoundException('الموظف غير موجود')
    }
    return emp
  }

  // ===== فحوصات التفرد — كود البصمة/البريد/الرقم القومي =====
  private async assertUnique(data: {
    employeeCode?: string
    email?: string
    nationalId?: string
    excludeId?: number
  }) {
    const notSelf = data.excludeId ? { id: Not(data.excludeId) } : {}
    if (data.employeeCode) {
      const dup = await this.employees.findOne({
        where: { employeeCode: data.employeeCode, ...notSelf },
      })
      if (dup) {
        throw new ConflictException(
          `كود الموظف ${data.employeeCode} مستخدم بالفعل (${dup.fullName}) — الكود هو مفتاح البصمة ولا يتكرر`
        )
      }
    }
    if (data.email) {
      const dup = await this.employees.findOne({
        where: { email: data.email, ...notSelf },
      })
      if (dup) {
        throw new ConflictException(`البريد ${data.email} مسجل لموظف آخر`)
      }
    }
    if (data.nationalId) {
      const dup = await this.employees.findOne({
        where: { nationalId: data.nationalId, ...notSelf },
      })
      if (dup) {
        throw new ConflictException('الرقم القومي مسجل لموظف آخر')
      }
    }
  }

  // ===== فحص العلاقات: الفرع موجود، القسم تابع للفرع، الفريق تابع للقسم =====
  private async assertRelations(data: {
    branchId?: number
    departmentId?: number | null
    teamId?: number | null
    managerEmployeeId?: number | null
  }) {
    let branch: Branch | null = null
    if (data.branchId !== undefined) {
      branch = await this.branches.findOne({ where: { id: data.branchId } })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
    let dept: Department | null = null
    if (data.departmentId) {
      dept = await this.departments.findOne({
        where: { id: data.departmentId },
      })
      if (!dept) throw new BadRequestException('القسم غير موجود')
      if (branch && dept.branchId !== branch.id) {
        throw new BadRequestException(
          `القسم «${dept.name}» لا يتبع الفرع المحدد`
        )
      }
    }
    if (data.teamId) {
      const team = await this.teams.findOne({ where: { id: data.teamId } })
      if (!team) throw new BadRequestException('الفريق غير موجود')
      if (data.departmentId && team.departmentId !== data.departmentId) {
        throw new BadRequestException(
          `الفريق «${team.name}» لا يتبع القسم المحدد`
        )
      }
    }
    if (data.managerEmployeeId) {
      const mgr = await this.employees.findOne({
        where: { id: data.managerEmployeeId },
      })
      if (!mgr) throw new BadRequestException('المدير المباشر غير موجود')
    }
  }

  // نهاية العقد لا تسبق بدايته
  private assertContractDates(dto: {
    contractStart?: string
    contractEnd?: string
  }) {
    if (dto.contractStart && dto.contractEnd && dto.contractEnd < dto.contractStart) {
      throw new BadRequestException('نهاية العقد قبل بدايته')
    }
  }

  async create(dto: CreateEmployeeDto) {
    await this.assertUnique(dto)
    await this.assertRelations(dto)
    this.assertContractDates(dto)
    const emp = await this.employees.save(
      this.employees.create(dto as Partial<Employee>)
    )
    // رصيد السنة الحالية تلقائياً — الاستحقاق من الإعدادات
    await this.ensureCurrentYearBalances(emp.id)
    return emp
  }

  // ينشئ أرصدة السنة الحالية (سنوي/مرضي) إن لم توجد — يُستدعى عند التعيين
  private async ensureCurrentYearBalances(employeeId: number) {
    const period = String(new Date().getFullYear())
    const annualEntitled = Number(
      (await this.config.findOne({ where: { key: 'leave.annual_entitled' } }))
        ?.value ?? '21'
    )
    for (const [balanceType, entitled] of [
      ['annual', annualEntitled],
      ['sick', 180],
    ] as const) {
      const existing = await this.balances.findOne({
        where: { employeeId, balanceType, period },
      })
      if (!existing) {
        await this.balances.save(
          this.balances.create({
            employeeId,
            balanceType,
            entitled,
            taken: 0,
            period,
          })
        )
      }
    }
  }

  async update(id: number, dto: UpdateEmployeeDto, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    await this.assertUnique({ ...dto, excludeId: id })
    this.assertContractDates({
      contractStart: dto.contractStart ?? emp.contractStart,
      contractEnd: dto.contractEnd ?? emp.contractEnd,
    })
    await this.assertRelations({
      branchId: dto.branchId ?? emp.branchId,
      departmentId: dto.departmentId,
      teamId: dto.teamId,
      managerEmployeeId: dto.managerEmployeeId,
    })
    // الموظف لا يكون مدير نفسه
    if (dto.managerEmployeeId === id) {
      throw new BadRequestException('الموظف لا يكون مديراً مباشراً لنفسه')
    }
    Object.assign(emp, dto)
    return this.employees.save(emp)
  }

  // الأرشفة بدل الحذف — التاريخ الوظيفي لا يُمسح (بسبب موثّق)
  async archive(id: number, branchScope: number | null, reason?: string) {
    const emp = await this.findOne(id, branchScope)
    emp.status = 'archived'
    emp.isActive = false
    emp.archivedAt = new Date()
    emp.archiveReason = reason?.trim() || 'أرشفة يدوية'
    return this.employees.save(emp)
  }
}
