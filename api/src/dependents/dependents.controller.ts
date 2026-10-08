import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { DependentsService } from './dependents.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class DependentDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() nameAr?: unknown
  @IsOptional() nameEn?: unknown
  @IsOptional() relation?: unknown
  @IsOptional() birthDate?: unknown
  @IsOptional() nationalId?: unknown
  @IsOptional() gender?: unknown
  @IsOptional() isInsured?: unknown
  @IsOptional() idExpiryDate?: unknown
}
class RemoveDto {
  @IsOptional() reason?: unknown
}

// B3.14: سجل المعالين — القراءة والكتابة لموظف بصلاحية السجل (والنطاق في الخدمة)؛ و«معاليني» للموظف نفسه
@RequireModule('dependents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dependents')
export class DependentsController {
  constructor(private readonly dependents: DependentsService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.dependents.mine(user)
  }

  @Perm('dependents.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('employeeId') employeeId?: string) {
    return this.dependents.list(user, Number(employeeId))
  }

  @Perm('dependents.manage')
  @Post()
  add(@CurrentUser() user: JwtPayload, @Body() dto: DependentDto) {
    return this.dependents.add(user, dto)
  }

  @Perm('dependents.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DependentDto) {
    return this.dependents.update(user, id, dto)
  }

  @Perm('dependents.manage')
  @Post(':id/remove')
  @HttpCode(200)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RemoveDto) {
    return this.dependents.remove(user, id, dto.reason)
  }
}
