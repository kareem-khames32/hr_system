import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Allow, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { HolidayWorkService } from './holiday-work.service'

// الشكل بس هنا؛ التحقق الحقيقي (الفرع والأيام والمضاعف) في الخدمة
class HolidayWorkOrderDto {
  @Allow() name?: unknown
  @Allow() targetLevel?: unknown
  @Allow() branchId?: unknown
  @Allow() departmentIds?: unknown
  @Allow() teamIds?: unknown
  @Allow() employeeIds?: unknown
  @Allow() dates?: unknown
  @Allow() multiplier?: unknown
  @Allow() note?: unknown
}
class HolidayWorkCancelDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string
}
class HolidayWorkSettingsDto {
  @Allow() multiplier?: unknown
}
class HolidayWorkListQuery {
  @IsOptional() @IsIn(['ACTIVE', 'CANCELLED', 'ALL']) status?: string
  @IsOptional() @IsIn(['ORDER', 'REQUEST', 'ALL']) kind?: string
}

// «دوام أيام العطلات» تحت الحضور: أوامر الموارد البشرية + طلبات الموظفين المعتمدة وتفصيلها من البصمات
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/holiday-work')
export class HolidayWorkController {
  constructor(private readonly service: HolidayWorkService) {}

  @Get('settings') @Perm('attendance.manage', 'attendance.view_all')
  settings(@CurrentUser() user: JwtPayload) { return this.service.settings(user) }

  @Patch('settings') @Perm('attendance.manage')
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: HolidayWorkSettingsDto) { return this.service.updateSettings(user, dto.multiplier) }

  @Get() @Perm('attendance.manage', 'attendance.view_all')
  list(@CurrentUser() user: JwtPayload, @Query() query: HolidayWorkListQuery) { return this.service.list(user, query) }

  @Get(':id') @Perm('attendance.manage', 'attendance.view_all')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.detail(user, id) }

  @Post() @Perm('attendance.manage')
  create(@CurrentUser() user: JwtPayload, @Body() dto: HolidayWorkOrderDto) { return this.service.create(user, dto) }

  @Patch(':id') @Perm('attendance.manage')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: HolidayWorkOrderDto) { return this.service.update(user, id, dto) }

  @Post(':id/cancel') @Perm('attendance.manage')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: HolidayWorkCancelDto) { return this.service.cancel(user, id, dto.reason) }
}
