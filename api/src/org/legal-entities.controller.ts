import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { LegalEntitiesService } from './legal-entities.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class LegalEntityDto {
  @IsOptional() name?: unknown
  @IsOptional() nameEn?: unknown
  @IsOptional() country?: unknown
  @IsOptional() timeZone?: unknown
  @IsOptional() commercialRegister?: unknown
  @IsOptional() taxNumber?: unknown
  @IsOptional() insuranceNumber?: unknown
  @IsOptional() qiwaNumber?: unknown
  @IsOptional() payrollBankName?: unknown
  @IsOptional() payrollIban?: unknown
  @IsOptional() wpsNumber?: unknown
  @IsOptional() cycleStartDay?: unknown
  @IsOptional() isActive?: unknown
}
class BranchLinkDto {
  @IsOptional() legalEntityId?: unknown
}
class HijriDisplayDto {
  @IsOptional() enabled?: unknown
}

// B4.1: الكيانات القانونية — بصلاحية الإعدادات، ولحساب نطاقه الشركة كلها (في الخدمة)
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/legal-entities')
export class LegalEntitiesController {
  constructor(private readonly entities: LegalEntitiesService) {}

  @Perm('settings.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.entities.list(user)
  }

  @Perm('settings.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: LegalEntityDto) {
    return this.entities.create(user, dto)
  }

  @Perm('settings.manage')
  @Put('branches/:branchId')
  linkBranch(@CurrentUser() user: JwtPayload, @Param('branchId', ParseIntPipe) branchId: number, @Body() dto: BranchLinkDto) {
    return this.entities.linkBranch(user, branchId, dto.legalEntityId ?? null)
  }

  // B4.6 (ج): إعدادات العرض للحساب نفسه (هل يشوف الهجري جنب الميلادي) — لأي حساب مسجّل دخوله
  @Get('display')
  display(@CurrentUser() user: JwtPayload) {
    return this.entities.display(user)
  }

  @Perm('settings.manage')
  @Put(':id/hijri-display')
  hijriDisplay(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: HijriDisplayDto) {
    return this.entities.setHijriDisplay(user, id, dto.enabled)
  }

  @Perm('settings.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LegalEntityDto) {
    return this.entities.update(user, id, dto)
  }
}
