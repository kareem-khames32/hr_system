import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Branch } from './entities/branch.entity'
import { Department } from './entities/department.entity'
import { Team } from './entities/team.entity'

@Injectable()
export class OrgService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Department) private readonly departments: Repository<Department>,
    @InjectRepository(Team) private readonly teams: Repository<Team>
  ) {}

  // ===== الفروع =====
  // branchScope = null → كل الفروع (super_admin) — غير كده فرع المستخدم فقط
  findBranches(branchScope: number | null) {
    if (branchScope == null) return this.branches.find({ order: { id: 'ASC' } })
    return this.branches.find({ where: { id: branchScope } })
  }

  async createBranch(data: Partial<Branch>) {
    return this.branches.save(this.branches.create(data))
  }

  async updateBranch(id: number, data: Partial<Branch>) {
    const branch = await this.branches.findOne({ where: { id } })
    if (!branch) throw new NotFoundException('الفرع غير موجود')
    Object.assign(branch, data)
    return this.branches.save(branch)
  }

  // ===== الأقسام =====
  findDepartments(branchScope: number | null) {
    if (branchScope == null)
      return this.departments.find({ order: { id: 'ASC' } })
    return this.departments.find({ where: { branchId: branchScope } })
  }

  async createDepartment(data: Partial<Department>) {
    return this.departments.save(this.departments.create(data))
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

  async createTeam(data: Partial<Team>) {
    return this.teams.save(this.teams.create(data))
  }
}
