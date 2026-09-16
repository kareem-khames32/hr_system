import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { SocialInsuranceService } from './social-insurance.service'

// التأمينات الاجتماعية (السعودية / المصرية): الإعدادات لكل الشركة (تعديلها لحساب على مستوى الشركة)، وتقرير الشهر بفلتر الفرع.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('social-insurance')
export class SocialInsuranceController {
  constructor(private readonly service: SocialInsuranceService) {}

  @Perm('payroll.view')
  @Get('settings')
  settings(@CurrentUser() user: JwtPayload) {
    return this.service.settings(user)
  }

  @Perm('payroll.policy.manage')
  @Put('settings')
  updateSettings(@CurrentUser() user: JwtPayload, @Body() body: Record<string, unknown>) {
    return this.service.updateSettings(user, body)
  }

  @Perm('payroll.view')
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query('period') period?: string, @Query('branchId') branchId?: string) {
    return this.service.report(user, period, branchId)
  }
}
