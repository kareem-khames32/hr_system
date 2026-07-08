import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards'
import { AttendanceService, PunchDto } from './attendance.service'

class IngestDto {
  @IsArray()
  @ArrayNotEmpty()
  punches: PunchDto[]
}

class ScheduleEntryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart: string

  @Type(() => Number)
  @IsInt()
  employeeId: number

  @IsString()
  shiftName: string

  @Matches(/^\d{2}:\d{2}$/)
  startTime: string

  @Matches(/^\d{2}:\d{2}$/)
  endTime: string
}

class UpsertScheduleDto {
  @IsArray()
  @ArrayNotEmpty()
  entries: ScheduleEntryDto[]
}

class ConfirmOvertimeDto {
  @IsBoolean()
  approve: boolean
}

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // استقبال بصمات ZKTeco — بمفتاح جهاز (x-device-key) بدون JWT
  // الجهاز/الوسيط يبعت دفعات: {punches: [{employeeCode, timestamp, deviceSn}]}
  @Post('punches')
  ingest(@Body() dto: IngestDto, @Headers('x-device-key') deviceKey?: string) {
    return this.service.ingest(dto.punches, deviceKey)
  }

  // رفع يدوي من الأدمن/HR بنفس الصيغة (بدون مفتاح جهاز)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'hr_manager')
  @Post('punches/manual')
  ingestManual(@Body() dto: IngestDto, @CurrentUser() user: JwtPayload) {
    return this.service.ingest(dto.punches, undefined, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'hr_manager', 'branch_manager')
  @Post('schedule')
  upsertSchedule(@Body() dto: UpsertScheduleDto) {
    return this.service.upsertSchedule(dto.entries)
  }

  @UseGuards(JwtAuthGuard)
  @Get('schedule')
  weekSchedule(@Query('week') week: string) {
    return this.service.weekSchedule(week)
  }

  @UseGuards(JwtAuthGuard)
  @Get('daily')
  daily(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.service.daily(user, date)
  }

  @UseGuards(JwtAuthGuard)
  @Get('monthly')
  monthly(
    @CurrentUser() user: JwtPayload,
    @Query('employeeId', ParseIntPipe) employeeId: number,
    @Query('month') month: string
  ) {
    return this.service.monthly(user, employeeId, month)
  }

  // الأوفرتايم المكتشف من البصمة بانتظار تأكيد المدير
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'hr_manager', 'branch_manager')
  @Get('overtime/pending')
  pendingOvertime(@CurrentUser() user: JwtPayload) {
    return this.service.pendingOvertime(user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'hr_manager', 'branch_manager')
  @Post('overtime/:id/confirm')
  confirmOvertime(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmOvertimeDto
  ) {
    return this.service.confirmOvertime(user, id, dto.approve)
  }

  // إعادة حساب يوم بأثر رجعي (بعد تصحيح بصمة/تعديل جدول)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'hr_manager')
  @Post('recompute')
  recompute(@Query('date') date: string) {
    return this.service.recomputeDate(date)
  }
}
