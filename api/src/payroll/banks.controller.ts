import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { BanksService } from './banks.service'

// القيم بتتفحص في الخدمة برسايلها
class BankDto {
  @IsOptional() country?: unknown
  @IsOptional() ibanCode?: unknown
  @IsOptional() nameAr?: unknown
  @IsOptional() nameEn?: unknown
  @IsOptional() swiftCode?: unknown
  @IsOptional() isActive?: unknown
}

// B4.6 (ب): «البنوك» — جدول البنوك بأكوادها. العرض والإضافة والتعديل بصلاحية الإعدادات، والكتابة لحساب بكل الفروع (في الخدمة)
@RequireModule('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/banks')
export class BanksController {
  constructor(private readonly banks: BanksService) {}

  @Perm('settings.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.banks.list(user)
  }

  @Perm('settings.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: BankDto) {
    return this.banks.create(user, dto)
  }

  @Perm('settings.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BankDto) {
    return this.banks.update(user, id, dto)
  }
}
