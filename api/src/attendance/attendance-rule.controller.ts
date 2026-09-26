import { Controller, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, RolesGuard, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { AttendanceRuleSourceType, AttendanceRuleVersion } from './attendance-rule.entities'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance-rules')
export class AttendanceRuleController {
  constructor(@InjectRepository(AttendanceRuleVersion) private readonly versions: Repository<AttendanceRuleVersion>) {}

  @Get(':sourceType/:sourceId/history')
  async history(@Param('sourceType') sourceType: AttendanceRuleSourceType,
    @Param('sourceId', ParseIntPipe) sourceId: number, @CurrentUser() user: JwtPayload) {
    if (!['SHIFT', 'WORK_SCHEDULE', 'EMPLOYEE'].includes(sourceType)) throw new NotFoundException('مصدر الدوام غير موجود')
    if (sourceType === 'EMPLOYEE') {
      if (!userHasPerm(user, 'employees.view') && !userHasPerm(user, 'employees.edit')) throw new ForbiddenException('لا تملك صلاحية عرض تاريخ دوام الموظف')
      const employee = await this.versions.manager.findOneBy(Employee, { id: sourceId })
      if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException('الموظف غير موجود')
    } else if (!userHasPerm(user, 'settings.manage')) throw new ForbiddenException('لا تملك صلاحية عرض تاريخ تعريف الدوام')
    return this.versions.find({ where: { sourceType, sourceId }, order: { version: 'DESC' } })
  }
}
