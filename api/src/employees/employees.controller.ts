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
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto'
import { EmployeesService } from './employees.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Perm('employees.view')
  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.employees.findAll(branchScopeOf(user))
  }

  // الموظف يشوف سجله هو — غيره يحتاج employees.view
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض الموظفين')
    }
    return this.employees.findOne(id, branchScopeOf(user))
  }

  @Perm('employees.create')
  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    // مدير الفرع يضيف داخل فرعه فقط
    const scope = branchScopeOf(user)
    if (scope != null) dto.branchId = scope
    return this.employees.create(dto)
  }

  @Perm('employees.edit')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.update(id, dto, branchScopeOf(user))
  }

  // أرشفة بدل حذف — السجل الوظيفي يبقى (بسبب موثّق)
  @Perm('employees.archive')
  @Post(':id/archive')
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Body() body?: { reason?: string }
  ) {
    return this.employees.archive(id, branchScopeOf(user), body?.reason)
  }
}
