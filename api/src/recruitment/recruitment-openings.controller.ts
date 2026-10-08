import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { CandidateApplicationsService } from './candidate-applications.service'

// الملاحظة بتتفحص في الخدمة برسالتها
class InternalApplicationDto {
  @IsOptional() note?: unknown
}

// B3.3-أ: «وظائف داخلية» — للموظف نفسه (من غير صلاحية): الحق جوه الخدمة (حساب مربوط بملف شغال، ووظيفة منشورة داخليًا في فرعه الحالي)
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard)
@Controller('recruitment/openings')
export class RecruitmentOpeningsController {
  constructor(private readonly applications: CandidateApplicationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.applications.openings(user)
  }

  @Post(':id/apply')
  @HttpCode(200)
  apply(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: InternalApplicationDto) {
    return this.applications.applyInternal(user, id, dto.note)
  }
}
