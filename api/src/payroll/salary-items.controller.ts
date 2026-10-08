import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { SalaryItemsService } from './salary-items.service'

// القيم بتتفحص في الخدمة برسايلها
class SalaryItemDto {
  @IsOptional() sortOrder?: unknown
  @IsOptional() insurable?: unknown
  @IsOptional() taxable?: unknown
}

// B4.3: «بنود الراتب» — العرض والتعديل بصلاحية الإعدادات، والتعديل لحساب بكل الفروع (في الخدمة)
@RequireModule('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/salary-items')
export class SalaryItemsController {
  constructor(private readonly items: SalaryItemsService) {}

  @Perm('settings.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.items.list(user)
  }

  @Perm('settings.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SalaryItemDto) {
    return this.items.update(user, id, dto)
  }
}
