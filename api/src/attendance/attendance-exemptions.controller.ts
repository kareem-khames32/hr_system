import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { AttendanceExemptionsService } from './attendance-exemptions.service'
import type { AttendanceExemptionReasonCode } from './attendance-exemption.entities'

class CreateAttendanceExemptionDto {
  @Type(() => Number) @IsInt() @Min(1) employeeId: number
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveTo?: string | null
  @IsIn(['executive', 'field_role', 'remote', 'contractual', 'medical', 'other']) reasonCode: AttendanceExemptionReasonCode
  @IsString() @MaxLength(500) reason: string
  @IsOptional() @IsBoolean() overtimeEligibleOverride?: boolean | null
  @IsOptional() @IsBoolean() unpaidLeaveDeductibleOverride?: boolean | null
  @IsOptional() @IsBoolean() requiresCheckinForPresence?: boolean
}
class ExemptionReasonDto {
  @IsString() @MaxLength(500) reason: string
}
class TerminateAttendanceExemptionDto extends ExemptionReasonDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance-exemptions')
export class AttendanceExemptionsController {
  constructor(private readonly service: AttendanceExemptionsService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) { return this.service.mine(user) }

  @Get('employee/:employeeId') @Perm('attendance_exemption.view')
  list(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.service.list(user, employeeId)
  }

  @Post() @Perm('attendance_exemption.manage')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAttendanceExemptionDto) { return this.service.create(user, dto) }

  @Post(':id/approve') @Perm('attendance_exemption.approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionReasonDto) {
    return this.service.approve(user, id, dto.reason, false)
  }

  @Post(':id/approve-executive') @Perm('attendance_exemption.approve_executive')
  approveExecutive(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionReasonDto) {
    return this.service.approve(user, id, dto.reason, true)
  }

  @Post(':id/cancel') @Perm('attendance_exemption.manage')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionReasonDto) {
    return this.service.cancel(user, id, dto.reason)
  }

  @Post(':id/terminate') @Perm('attendance_exemption.approve')
  terminate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TerminateAttendanceExemptionDto) {
    return this.service.terminate(user, id, dto.effectiveFrom, dto.reason)
  }

  @Get(':id/events') @Perm('attendance_exemption.view')
  events(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) { return this.service.events(user, id) }
}
