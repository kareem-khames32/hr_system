import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { GoalsService } from './goals.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class GoalDto {
  @IsOptional() ownerType?: unknown
  @IsOptional() employeeId?: unknown
  @IsOptional() departmentId?: unknown
  @IsOptional() parentGoalId?: unknown
  @IsOptional() kind?: unknown
  @IsOptional() title?: unknown
  @IsOptional() description?: unknown
  @IsOptional() weight?: unknown
  @IsOptional() targetValue?: unknown
  @IsOptional() unit?: unknown
  @IsOptional() periodStart?: unknown
  @IsOptional() periodEnd?: unknown
  @IsOptional() reason?: unknown
}
class GoalDecisionDto {
  @IsOptional() decision?: unknown
  @IsOptional() reason?: unknown
}
class GoalProgressDto {
  @IsOptional() actualValue?: unknown
  @IsOptional() note?: unknown
}
class GoalStatusDto {
  @IsOptional() status?: unknown
  @IsOptional() note?: unknown
}
class GoalEvidenceDto {
  @IsOptional() taskId?: unknown
}

// B3.6: أهداف الأداء. من غير صلاحية على المسارات (غير «كل الأهداف»): الحق جوه الخدمة — صاحب الهدف، مديره المباشر من الهيكل، أو الموارد البشرية
// بصلاحية إدارة الأداء ونطاق الفروع
@RequireModule('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.goals.mine(user)
  }

  @Get('team')
  team(@CurrentUser() user: JwtPayload) {
    return this.goals.team(user)
  }

  @Perm('performance.manage')
  @Get('all')
  all(@CurrentUser() user: JwtPayload) {
    return this.goals.all(user)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.goals.detail(user, id)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: GoalDto) {
    return this.goals.create(user, dto)
  }

  @Post(':id/decision')
  @HttpCode(200)
  decide(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: GoalDecisionDto) {
    return this.goals.decide(user, id, dto.decision, dto.reason)
  }

  @Post(':id/progress')
  @HttpCode(200)
  progress(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: GoalProgressDto) {
    return this.goals.progress(user, id, dto)
  }

  @Patch(':id')
  change(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: GoalDto) {
    return this.goals.change(user, id, dto)
  }

  @Post(':id/status')
  @HttpCode(200)
  close(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: GoalStatusDto) {
    return this.goals.close(user, id, dto.status, dto.note)
  }

  @Post(':id/evidence')
  @HttpCode(200)
  evidence(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: GoalEvidenceDto) {
    return this.goals.evidence(user, id, dto.taskId)
  }
}
