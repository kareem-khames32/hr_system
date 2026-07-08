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
    private readonly teams: Repository<Team>
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

  async create(dto: CreateEmployeeDto) {
    await this.assertUnique(dto)
    await this.assertRelations(dto)
    return this.employees.save(this.employees.create(dto as Partial<Employee>))
  }

  async update(id: number, dto: UpdateEmployeeDto, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    await this.assertUnique({ ...dto, excludeId: id })
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

  // الأرشفة بدل الحذف — التاريخ الوظيفي لا يُمسح
  async archive(id: number, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    emp.status = 'archived'
    emp.isActive = false
    return this.employees.save(emp)
  }
}
