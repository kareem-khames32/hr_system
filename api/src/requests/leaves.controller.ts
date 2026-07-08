import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Leave } from './entities/leave.entities'

// سجل الإجازات (الوجهة الدائمة) — قراءة بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('leaves.view_all')
@Controller('leaves')
export class LeavesController {
  constructor(
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>
  ) {}

  @Get()
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string // YYYY-MM اختياري
  ) {
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const byId = new Map(emps.map((e) => [e.id, e]))
    let rows = await this.leaves.find({
      where:
        scope !== null ? { employeeId: In(emps.map((e) => e.id)) } : {},
      order: { fromDate: 'DESC' },
      take: 500,
    })
    if (month) rows = rows.filter((l) => l.fromDate.startsWith(month))
    // إثراء بأسماء الموظفين للعرض المباشر
    return rows.map((l) => ({
      ...l,
      employeeName: byId.get(l.employeeId)?.fullName ?? `#${l.employeeId}`,
      employeeCode: byId.get(l.employeeId)?.employeeCode ?? '',
    }))
  }
}
