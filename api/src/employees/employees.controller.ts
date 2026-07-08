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
import {
  branchScopeOf,
  CurrentUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../auth/guards'
import type { JwtPayload } from '../auth/auth.service'
import { CreateEmployeeDto, UpdateEmployeeDto } from './employees.dto'
import { EmployeesService } from './employees.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.employees.findAll(branchScopeOf(user))
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.findOne(id, branchScopeOf(user))
  }

  @Post()
  @Roles('super_admin', 'hr_manager', 'branch_manager')
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: JwtPayload) {
    // مدير الفرع يضيف داخل فرعه فقط
    const scope = branchScopeOf(user)
    if (scope != null) dto.branchId = scope
    return this.employees.create(dto)
  }

  @Patch(':id')
  @Roles('super_admin', 'hr_manager', 'branch_manager')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.update(id, dto, branchScopeOf(user))
  }

  // أرشفة بدل حذف — السجل الوظيفي يبقى
  @Post(':id/archive')
  @Roles('super_admin', 'hr_manager')
  archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload
  ) {
    return this.employees.archive(id, branchScopeOf(user))
  }
}
