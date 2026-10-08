import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { HelpdeskService } from './helpdesk.service'

class RateDto {
  @IsOptional() rating?: unknown
  @IsOptional() comment?: unknown
}

// B3.10: مركز خدمات الموارد البشرية — استفسارات الموظف وتقييمه لنفسه، والتقرير بالصلاحية (والنطاق في الخدمة). الاستفسار نفسه بيتقدّم ويتنفّذ من محرك الطلبات.
@RequireModule('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.helpdesk.mine(user)
  }

  @Perm('helpdesk.manage')
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.helpdesk.report(user, { from, to })
  }

  @Post(':id/rate')
  @HttpCode(200)
  rate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RateDto) {
    return this.helpdesk.rate(user, id, dto)
  }
}
