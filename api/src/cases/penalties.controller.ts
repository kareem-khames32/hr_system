import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { PenaltiesService } from './penalties.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class ViolationDto {
  @IsOptional() category?: unknown
  @IsOptional() name?: unknown
  @IsOptional() steps?: unknown
  @IsOptional() deductionTypeId?: unknown
  @IsOptional() isActive?: unknown
}
class ApplyDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() violationId?: unknown
  @IsOptional() incidentDate?: unknown
  @IsOptional() targetPeriod?: unknown
  @IsOptional() caseId?: unknown
  @IsOptional() note?: unknown
  @IsOptional() expectedFingerprint?: unknown
}
class CancelDto {
  @IsOptional() reason?: unknown
}

// B3.12: لائحة الجزاءات وسجل جزاءات الموظفين — بصلاحية لائحة الجزاءات (والنطاق في الخدمة)؛ و«جزاءاتي» للموظف نفسه
@RequireModule('cases')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly penalties: PenaltiesService) {}

  @Perm('cases.penalties')
  @Get('violations')
  catalog(@CurrentUser() user: JwtPayload) {
    return this.penalties.catalog(user)
  }

  @Perm('cases.penalties')
  @Post('violations')
  @HttpCode(200)
  createViolation(@CurrentUser() user: JwtPayload, @Body() dto: ViolationDto) {
    return this.penalties.createViolation(user, dto)
  }

  @Perm('cases.penalties')
  @Patch('violations/:id')
  updateViolation(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ViolationDto) {
    return this.penalties.updateViolation(user, id, dto)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.penalties.mine(user)
  }

  @Perm('cases.penalties')
  @Get()
  register(@CurrentUser() user: JwtPayload, @Query('employeeId') employeeId?: string) {
    return this.penalties.register(user, { employeeId })
  }

  @Perm('cases.penalties')
  @Post('preview')
  @HttpCode(200)
  preview(@CurrentUser() user: JwtPayload, @Body() dto: ApplyDto) {
    return this.penalties.preview(user, dto)
  }

  @Perm('cases.penalties')
  @Post()
  apply(@CurrentUser() user: JwtPayload, @Body() dto: ApplyDto) {
    return this.penalties.apply(user, dto)
  }

  @Perm('cases.penalties')
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CancelDto) {
    return this.penalties.cancel(user, id, dto.reason)
  }
}
