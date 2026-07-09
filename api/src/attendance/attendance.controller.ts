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
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { AttendanceService, PunchDto } from './attendance.service'
import { DeviceSyncService } from './device-sync.service'

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
  constructor(
    private readonly service: AttendanceService,
    private readonly deviceSync: DeviceSyncService
  ) {}

  // استقبال بصمات ZKTeco — بمفتاح جهاز (x-device-key) بدون JWT
  // الجهاز/الوسيط يبعت دفعات: {punches: [{employeeCode, timestamp, deviceSn}]}
  @Post('punches')
  ingest(@Body() dto: IngestDto, @Headers('x-device-key') deviceKey?: string) {
    return this.service.ingest(dto.punches, deviceKey)
  }

  // رفع يدوي من الأدمن/HR بنفس الصيغة (بدون مفتاح جهاز)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('punches/manual')
  ingestManual(@Body() dto: IngestDto, @CurrentUser() user: JwtPayload) {
    return this.service.ingest(dto.punches, undefined, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule')
  upsertSchedule(@Body() dto: UpsertScheduleDto) {
    return this.service.upsertSchedule(dto.entries)
  }

  @UseGuards(JwtAuthGuard)
  @Get('schedule')
  weekSchedule(@Query('week') week: string) {
    return this.service.weekSchedule(week)
  }

  // تجاوز وردية يوم بعينه (حالة خاصة) — أو مسحه بـ clear:true
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule/day')
  setDayOverride(
    @Body()
    dto: {
      employeeId: number
      date: string
      shiftName?: string
      startTime?: string
      endTime?: string
      clear?: boolean
    }
  ) {
    return this.service.setDayOverride(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('schedule/day-overrides')
  weekDayOverrides(@Query('week') week: string) {
    return this.service.weekDayOverrides(week)
  }

  // أيام العمل الفعلية في مدى (خدمة ذاتية) — لتلميح نموذج الإجازة:
  // «سيُخصم X يوم فقط — Y يوم عطلة داخل المدى»
  @UseGuards(JwtAuthGuard)
  @Get('working-days')
  workingDays(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from ?? '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to ?? '')
    ) {
      return { total: 0, working: 0, skipped: [] }
    }
    return this.service.workingDaysBetween(user.branchId ?? 1, from, to)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.view_all')
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
  @Perm('overtime.confirm')
  @Get('overtime/pending')
  pendingOvertime(@CurrentUser() user: JwtPayload) {
    return this.service.pendingOvertime(user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('overtime.confirm')
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
  @Perm('attendance.manage')
  @Post('recompute')
  recompute(@Query('date') date: string) {
    return this.service.recomputeDate(date)
  }

  // ===== مزامنة أجهزة البصمة (سحب بالـ IP) =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.sync')
  @Post('devices/:id/sync')
  syncDevice(@Param('id', ParseIntPipe) id: number) {
    return this.deviceSync.syncDevice(id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.sync')
  @Post('devices/sync-all')
  syncAll() {
    return this.deviceSync.syncAll()
  }
}
