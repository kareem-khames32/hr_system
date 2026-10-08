import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { StatutoryPackService } from './statutory-pack.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class StatutoryRowDto {
  @IsOptional() country?: unknown
  @IsOptional() key?: unknown
  @IsOptional() effectiveFrom?: unknown
  @IsOptional() values?: unknown
  @IsOptional() source?: unknown
  @IsOptional() verified?: unknown
}

// B4.2: «حزمة الدولة» — العرض بصلاحية الإعدادات، والتعديل لمدير النظام بس (في الخدمة)
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/statutory')
export class StatutoryPackController {
  constructor(private readonly pack: StatutoryPackService) {}

  @Perm('settings.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.pack.list(user)
  }

  @Perm('settings.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: StatutoryRowDto) {
    return this.pack.create(user, dto)
  }

  @Perm('settings.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: StatutoryRowDto) {
    return this.pack.update(user, id, dto)
  }
}
