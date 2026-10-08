import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { EgSalaryTaxService } from './eg-salary-tax.service'

// B4.4 (أ): معاينة ضريبة كسب العمل لمسير — قراءة بس، بصلاحية عرض الرواتب ونطاق المسير (في الخدمة)
@RequireModule('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class EgSalaryTaxController {
  constructor(private readonly tax: EgSalaryTaxService) {}

  @Perm('payroll.view')
  @Get('runs/:id/eg-tax-preview')
  preview(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.tax.previewRun(user, id)
  }
}
