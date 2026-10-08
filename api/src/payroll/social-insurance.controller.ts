import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { EgTrainingFundService } from './eg-training-fund'
import { MinimumWageAlertService } from './minimum-wage-alert'
import { SaudizationReportService } from './saudization-report'
import { SocialInsuranceService } from './social-insurance.service'
import { RequireModule } from '../modules-registry/module.guard'

// التأمينات الاجتماعية (السعودية / المصرية): الإعدادات لكل الشركة (تعديلها لحساب على مستوى الشركة)، وتقرير الشهر بفلتر الفرع.
@RequireModule('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('social-insurance')
export class SocialInsuranceController {
  constructor(private readonly service: SocialInsuranceService, private readonly trainingFund: EgTrainingFundService, private readonly minimumWage: MinimumWageAlertService,
    private readonly saudizationReport: SaudizationReportService) {}

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

  // B4.4 (د): صندوق التدريب المصري — تقرير سنوي بتكلفة المنشأة (مش خصم من الموظف)، لحساب بكل الفروع
  @Perm('payroll.view')
  @Get('eg-training-fund')
  egTrainingFund(@CurrentUser() user: JwtPayload, @Query('year') year?: string) {
    return this.trainingFund.report(user, year)
  }

  // B4.5 (هـ): تنبيه الحد الأدنى للأجور — الموظفين النشطين في نطاق الحساب اللي إجماليهم تحت الحد الأدنى لدولة فرعهم (قراءة بس)
  @Perm('payroll.view')
  @Get('minimum-wage-alerts')
  minimumWageAlerts(@CurrentUser() user: JwtPayload) {
    return this.minimumWage.report(user)
  }

  // B4.6 (أ): تقرير نطاقات البسيط — نسبة السعوديين لكل كيان قانوني سعودي (قراءة بس، لحساب بكل الفروع)
  @Perm('payroll.view')
  @Get('saudization')
  saudization(@CurrentUser() user: JwtPayload) {
    return this.saudizationReport.report(user)
  }
}
