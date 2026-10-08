import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { ReviewRewardsService } from './review-rewards.service'

// القيم بتتفحص في الخدمة برسايلها
class SuggestDto {
  @IsOptional() bonusTypeId?: unknown
  @IsOptional() targetPeriod?: unknown
  @IsOptional() values?: unknown
}

// B3.8-ب: مكافآت نتيجة التقييم — إدارة الأداء بتقترح لدورة، والمدير المباشر هو اللي بيقدّم (بموديول المكافآت) أو يصرف النظر
@RequireModule('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/rewards')
export class ReviewRewardsController {
  constructor(private readonly rewards: ReviewRewardsService) {}

  @Perm('performance.manage')
  @Get('cycles/:id')
  cycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rewards.cycleRewards(user, id)
  }

  @Perm('performance.manage')
  @Post('cycles/:id')
  @HttpCode(200)
  suggest(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SuggestDto) {
    return this.rewards.suggest(user, id, dto)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.rewards.mine(user)
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rewards.submit(user, id)
  }

  @Post(':id/dismiss')
  @HttpCode(200)
  dismiss(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.rewards.dismiss(user, id)
  }
}
