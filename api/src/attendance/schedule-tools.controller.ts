import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { ScheduleToolsService } from './schedule-tools.service'

// القيم بتتفحص في الخدمة برسايلها
class RotationDto {
  @IsOptional() name?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() shiftIds?: unknown
  @IsOptional() isActive?: unknown
}
class CopyWeekDto {
  @IsOptional() fromWeek?: unknown
  @IsOptional() toWeek?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() overwrite?: unknown
}
class ApplyRotationDto {
  @IsOptional() rotationId?: unknown
  @IsOptional() employeeIds?: unknown
  @IsOptional() fromWeek?: unknown
  @IsOptional() weeks?: unknown
  @IsOptional() startIndex?: unknown
}
class PublishDto {
  @IsOptional() week?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() note?: unknown
  @IsOptional() overrideReason?: unknown
}
class RuleDto {
  @IsOptional() kind?: unknown
  @IsOptional() limitHours?: unknown
  @IsOptional() severity?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() isActive?: unknown
}
class CoverageDto {
  @IsOptional() shiftId?: unknown
  @IsOptional() skillId?: unknown
  @IsOptional() minLevel?: unknown
  @IsOptional() minCount?: unknown
  @IsOptional() severity?: unknown
  @IsOptional() isActive?: unknown
}

// B5.5 (أ): أدوات الجدولة — ميزة فرعية `shifts.advanced` (مقفولة افتراضيًا) جوه موديول الورديات، بصلاحية إدارة الحضور القايمة
@RequireModule('shifts')
@RequireFeature('shifts.advanced')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/schedule-tools')
export class ScheduleToolsController {
  constructor(private readonly service: ScheduleToolsService) {}

  @Perm('attendance.manage')
  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user)
  }

  @Perm('attendance.manage')
  @Post('rotations')
  createRotation(@CurrentUser() user: JwtPayload, @Body() dto: RotationDto) {
    return this.service.saveRotation(user, dto)
  }

  @Perm('attendance.manage')
  @Patch('rotations/:id')
  updateRotation(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RotationDto) {
    return this.service.saveRotation(user, dto, id)
  }

  @Perm('attendance.manage')
  @Post('copy-week')
  copyWeek(@CurrentUser() user: JwtPayload, @Body() dto: CopyWeekDto) {
    return this.service.copyWeek(user, dto)
  }

  @Perm('attendance.manage')
  @Post('apply-rotation')
  applyRotation(@CurrentUser() user: JwtPayload, @Body() dto: ApplyRotationDto) {
    return this.service.applyRotation(user, dto)
  }

  @Perm('attendance.manage')
  @Post('publish')
  publish(@CurrentUser() user: JwtPayload, @Body() dto: PublishDto) {
    return this.service.publish(user, dto)
  }

  // (ب) قواعد فحص الجدول وتغطية الوردية، والفحص بالطلب
  @Perm('attendance.manage')
  @Get('rules')
  rules(@CurrentUser() user: JwtPayload) {
    return this.service.rules(user)
  }

  @Perm('attendance.manage')
  @Post('rules')
  createRule(@CurrentUser() user: JwtPayload, @Body() dto: RuleDto) {
    return this.service.saveRule(user, dto)
  }

  @Perm('attendance.manage')
  @Patch('rules/:id')
  updateRule(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RuleDto) {
    return this.service.saveRule(user, dto, id)
  }

  @Perm('attendance.manage')
  @Post('coverage')
  createCoverage(@CurrentUser() user: JwtPayload, @Body() dto: CoverageDto) {
    return this.service.saveCoverage(user, dto)
  }

  @Perm('attendance.manage')
  @Patch('coverage/:id')
  updateCoverage(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CoverageDto) {
    return this.service.saveCoverage(user, dto, id)
  }

  @Perm('attendance.manage')
  @Get('checks')
  checks(@CurrentUser() user: JwtPayload, @Query('week') week: string, @Query('branchId') branchId: string) {
    return this.service.checks(user, week, branchId)
  }
}
