import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
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
}
