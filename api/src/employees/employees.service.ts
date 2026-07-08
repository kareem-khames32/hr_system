import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Employee } from './employee.entity'

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>
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

  async create(data: Partial<Employee>) {
    if (data.employeeCode) {
      const exists = await this.employees.findOne({
        where: { employeeCode: data.employeeCode },
      })
      if (exists)
        throw new ConflictException('كود الموظف مستخدم من قبل — الكود هو مفتاح البصمة')
    }
    return this.employees.save(this.employees.create(data))
  }

  async update(id: number, data: Partial<Employee>, branchScope: number | null) {
    const emp = await this.findOne(id, branchScope)
    Object.assign(emp, data)
    return this.employees.save(emp)
  }
}
