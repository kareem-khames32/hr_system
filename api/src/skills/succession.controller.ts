import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { SuccessionService } from './succession.service'

// القيم بتتفحص في الخدمة برسايلها
class CriticalDto {
  @IsOptional() critical?: unknown
  @IsOptional() reason?: unknown
}
class PotentialDto {
  @IsOptional() potential?: unknown
  @IsOptional() note?: unknown
}
class NominationDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() readiness?: unknown
  @IsOptional() note?: unknown
  @IsOptional() rank?: unknown
}

// B5.4 (ب): الإحلال — بيانات سرّية: كل المسارات بصلاحية `succession.manage`، ومفيش مسار للموظف نفسه
@RequireModule('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('skills/succession')
export class SuccessionController {
  constructor(private readonly service: SuccessionService) {}

  @Perm('succession.manage')
  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user)
  }

  @Perm('succession.manage')
  @Put('positions/:positionId')
  setCritical(@CurrentUser() user: JwtPayload, @Param('positionId', ParseIntPipe) positionId: number, @Body() dto: CriticalDto) {
    return this.service.setCritical(user, positionId, dto)
  }

  @Perm('succession.manage')
  @Post('positions/:positionId/nominations')
  nominate(@CurrentUser() user: JwtPayload, @Param('positionId', ParseIntPipe) positionId: number, @Body() dto: NominationDto) {
    return this.service.nominate(user, positionId, dto)
  }

  @Perm('succession.manage')
  @Patch('nominations/:id')
  updateNomination(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: NominationDto) {
    return this.service.updateNomination(user, id, dto)
  }

  @Perm('succession.manage')
  @Delete('nominations/:id')
  removeNomination(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeNomination(user, id)
  }

  // (ج) شبكة 9-box — ميزة فرعية مقفولة افتراضيًا: الأداء من آخر تقييم معلن، والإمكانات تقدير بيتسجّل هنا
  @RequireFeature('skills.nine_box')
  @Perm('succession.manage')
  @Get('nine-box')
  nineBox(@CurrentUser() user: JwtPayload) {
    return this.service.nineBox(user)
  }

  @RequireFeature('skills.nine_box')
  @Perm('succession.manage')
  @Put('nine-box/:employeeId')
  setPotential(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: PotentialDto) {
    return this.service.setPotential(user, employeeId, dto)
  }
}
