import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { MobilePunchService } from './mobile-punch.service'

// القيم بتتفحص في الخدمة برسايلها
class PositionDto {
  @IsOptional() latitude?: unknown
  @IsOptional() longitude?: unknown
  @IsOptional() accuracy?: unknown
}
class SiteDto {
  @IsOptional() name?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() latitude?: unknown
  @IsOptional() longitude?: unknown
  @IsOptional() radiusMeters?: unknown
  @IsOptional() isActive?: unknown
}
class AudienceDto {
  @IsOptional() audience?: unknown
}

// B5.6: بصمة الموبايل — ميزة فرعية `attendance.mobile_punch` (مقفولة افتراضيًا) جوه موديول الحضور
@RequireModule('attendance')
@RequireFeature('attendance.mobile_punch')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/mobile-punch')
export class MobilePunchController {
  constructor(private readonly service: MobilePunchService) {}

  // الموظف لبصمته هو: الخدمة بتحكم بملف الموظف المربوط بالحساب (من غير صلاحية)
  @Get()
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post()
  punch(@CurrentUser() user: JwtPayload, @Body() dto: PositionDto) {
    return this.service.punch(user, dto)
  }

  // المراجعة: محاولات موظفين نطاق الحساب
  @Perm('attendance.view_all')
  @Get('attempts')
  attempts(@CurrentUser() user: JwtPayload) {
    return this.service.attempts(user)
  }

  // B-ADD.9: «مين يبصم من الموبايل» — جمهور واحد للشركة بالاستهداف الموحد
  @Perm('attendance.manage')
  @Get('audience')
  audience(@CurrentUser() user: JwtPayload) {
    return this.service.audience(user)
  }

  @Perm('attendance.manage')
  @Put('audience')
  saveAudience(@CurrentUser() user: JwtPayload, @Body() dto: AudienceDto) {
    return this.service.saveAudience(user, dto)
  }

  // مواقع البصمة بنطاق الفرع
  @Perm('attendance.manage')
  @Get('sites')
  sites(@CurrentUser() user: JwtPayload) {
    return this.service.sites(user)
  }

  @Perm('attendance.manage')
  @Post('sites')
  createSite(@CurrentUser() user: JwtPayload, @Body() dto: SiteDto) {
    return this.service.saveSite(user, dto)
  }

  @Perm('attendance.manage')
  @Patch('sites/:id')
  updateSite(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SiteDto) {
    return this.service.saveSite(user, dto, id)
  }
}
