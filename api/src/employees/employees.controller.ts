import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import {
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Perm,
  RolesGuard,
  userHasPerm,
} from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { CreateEmployeeDto, RenewEmployeeContractDto, UpdateEmployeeDto } from './employees.dto'
import { EmployeesService } from './employees.service'
import { projectEmployee } from './employee-projection'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Perm('employees.view')
  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return (await this.employees.findAll(branchScopeOf(user))).map(employee => projectEmployee(employee, user))
  }

  // دليل مختصر (id/اسم/كود) للنشطين في النطاق — بلا employees.view، لمنتقيات
  // الشاشات غير الإدارية (نقل العهدة/التقديم نيابة). قبل ':id' حتى لا يلتقطه
  @Get('directory')
  directory(@CurrentUser() user: JwtPayload) {
    return this.employees.directory(branchScopeOf(user))
  }

  // الموظف يشوف سجله هو — غيره يحتاج employees.view
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    }
    return projectEmployee(await this.employees.findOne(id, branchScopeOf(user)), user)
  }

  @Perm('employees.create')
  @Post()
  async create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    // مدير الفرع يضيف داخل فرعه فقط
    const scope = branchScopeOf(user)
    if (scope != null) dto.branchId = scope
    return projectEmployee(await this.employees.create(dto, user.sub), user)
  }

  @Perm('employees.edit')
  @Get(':id/salary-change-context')
  salaryChangeContext(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.salaryChangeContext(id, branchScopeOf(user))
  }

  @Perm('employees.edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.update(id, dto, branchScopeOf(user), user.sub)
  }

  @Perm('employees.edit')
  @Post(':id/contract/renew')
  async renewContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewEmployeeContractDto,
    @CurrentUser() user: JwtPayload
  ) {
    return projectEmployee(await this.employees.renewContract(id, dto, branchScopeOf(user), user.sub), user)
  }

  // أرشفة بدل حذف — السجل الوظيفي يبقى (بسبب موثّق)
  @Perm('employees.archive')
  @Post(':id/archive')
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body?: { reason?: string }
  ) {
    return projectEmployee(await this.employees.archive(id, branchScopeOf(user), body?.reason, user.sub), user)
  }

  // العودة على رأس العمل — للمؤرشف والمنتهي خدمته
  @Perm('employees.archive')
  @Post(':id/reactivate')
  async reactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    return projectEmployee(await this.employees.reactivate(id, branchScopeOf(user), user.sub), user)
  }
}
