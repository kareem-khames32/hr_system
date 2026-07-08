import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Not, Repository } from 'typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'
import {
  CreateBranchDto,
  CreateDepartmentDto,
  CreateTeamDto,
  UpdateBranchDto,
  UpdateDepartmentDto,
  UpdateTeamDto,
} from './org.dto'

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>
  ) {}

  private async assertManagerExists(managerEmployeeId?: number) {
    if (!managerEmployeeId) return
    const mgr = await this.employees.findOne({
      where: { id: managerEmployeeId },
    })
    if (!mgr) throw new BadRequestException('الموظف المدير غير موجود')
  }

  // ===== الفروع =====
  // branchScope = null → كل الفروع (super_admin) — غير كده فرع المستخدم فقط
  findBranches(branchScope: number | null) {
    if (branchScope == null) return this.branches.find({ order: { id: 'ASC' } })
    return this.branches.find({ where: { id: branchScope } })
  }

  async createBranch(dto: CreateBranchDto) {
    const dup = await this.branches.findOne({ where: { code: dto.code } })
    if (dup) {
      throw new ConflictException(`كود الفرع ${dto.code} مستخدم بالفعل`)
    }
    await this.assertManagerExists(dto.managerEmployeeId)
    return this.branches.save(this.branches.create(dto as Partial<Branch>))
  }

  async updateBranch(id: number, dto: UpdateBranchDto) {
    const branch = await this.branches.findOne({ where: { id } })
    if (!branch) throw new NotFoundException('الفرع غير موجود')
    if (dto.code) {
      const dup = await this.branches.findOne({
        where: { code: dto.code, id: Not(id) },
      })
      if (dup) throw new ConflictException(`كود الفرع ${dto.code} مستخدم بالفعل`)
    }
    await this.assertManagerExists(dto.managerEmployeeId)
    Object.assign(branch, dto)
    return this.branches.save(branch)
  }

  // ===== الأقسام =====
  findDepartments(branchScope: number | null) {
    if (branchScope == null)
      return this.departments.find({ order: { id: 'ASC' } })
    return this.departments.find({ where: { branchId: branchScope } })
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const branch = await this.branches.findOne({ where: { id: dto.branchId } })
    if (!branch) throw new BadRequestException('الفرع غير موجود')
    if (dto.parentId) {
      const parent = await this.departments.findOne({
        where: { id: dto.parentId },
      })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
      if (parent.branchId !== dto.branchId) {
        throw new BadRequestException('القسم الأب في فرع مختلف')
      }
    }
    await this.assertManagerExists(dto.managerEmployeeId)
    return this.departments.save(
      this.departments.create(dto as Partial<Department>)
    )
  }

  async updateDepartment(id: number, dto: UpdateDepartmentDto) {
    const dept = await this.departments.findOne({ where: { id } })
    if (!dept) throw new NotFoundException('القسم غير موجود')
    if (dto.branchId) {
      const branch = await this.branches.findOne({
        where: { id: dto.branchId },
      })
      if (!branch) throw new BadRequestException('الفرع غير موجود')
    }
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('القسم لا يكون أباً لنفسه')
      }
      const parent = await this.departments.findOne({
        where: { id: dto.parentId },
      })
      if (!parent) throw new BadRequestException('القسم الأب غير موجود')
    }
    await this.assertManagerExists(dto.managerEmployeeId)
    Object.assign(dept, dto)
    return this.departments.save(dept)
  }

  // ===== الفرق =====
  findTeams(branchScope: number | null) {
    if (branchScope == null)
      return this.teams.find({ relations: { department: true } })
    return this.teams.find({
      relations: { department: true },
      where: { department: { branchId: branchScope } },
    })
  }

  async createTeam(dto: CreateTeamDto) {
    const dept = await this.departments.findOne({
      where: { id: dto.departmentId },
    })
    if (!dept) throw new BadRequestException('القسم غير موجود')
    await this.assertManagerExists(dto.leaderEmployeeId)
    return this.teams.save(this.teams.create(dto as Partial<Team>))
  }

  async updateTeam(id: number, dto: UpdateTeamDto) {
    const team = await this.teams.findOne({ where: { id } })
    if (!team) throw new NotFoundException('الفريق غير موجود')
    if (dto.departmentId) {
      const dept = await this.departments.findOne({
        where: { id: dto.departmentId },
      })
      if (!dept) throw new BadRequestException('القسم غير موجود')
    }
    await this.assertManagerExists(dto.leaderEmployeeId)
    Object.assign(team, dto)
    return this.teams.save(team)
  }
}
