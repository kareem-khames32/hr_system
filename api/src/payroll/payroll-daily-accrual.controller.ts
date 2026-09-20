import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PayrollDailyAccrualService } from './payroll-daily-accrual.service'
import { PayrollService } from './payroll.service'

// تراكم المسير اليومي في شاشة المسير: «آخر يوم محسوب» وزرار «حدّث الحساب».
// القراءة بصلاحية عرض المسير، والتحديث بصلاحية حسابه — ونطاق الفرع من خدمة المسير نفسها.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/runs')
export class PayrollDailyAccrualController {
  constructor(
    private readonly accrual: PayrollDailyAccrualService,
    private readonly payroll: PayrollService
  ) {}

  private async assertAccess(user: JwtPayload, id: number) {
    await this.payroll.assertRunAccess(user, await this.accrual.loadRun(id))
  }

  @Perm('payroll.view')
  @Get(':id/accrual')
  async status(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    await this.assertAccess(user, id)
    return this.accrual.status(id)
  }

  // «حدّث الحساب»: يحسب الأيام الناقصة والمتسخة دلوقتي بدل ما يستنى الليل
  @Perm('payroll.calculate')
  @Post(':id/accrual/refresh')
  async refresh(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    await this.assertAccess(user, id)
    const totals = await this.accrual.refreshDirty(id)
    return { ...totals, accrual: await this.accrual.status(id) }
  }
}
