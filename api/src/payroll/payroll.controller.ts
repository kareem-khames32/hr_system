import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsInt, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { PayrollService } from './payroll.service'

class CalculateDto {
  @Type(() => Number)
  @IsInt()
  branchId: number

  @Matches(/^\d{4}-\d{2}$/)
  period: string
}

// المسير محصور بأدوار الإدارة — الدورة الكاملة (محاسب → HR → مالي → تنفيذي) لاحقاً
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Perm('payroll.view')
  @Get('runs')
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  @Perm('payroll.view')
  @Get('runs/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id)
  }

  // إنشاء/إعادة حساب مسير فرع لفترة (23 → 22)
  @Perm('payroll.calculate')
  @Post('runs/calculate')
  calculate(@Body() dto: CalculateDto) {
    return this.service.calculate(dto.branchId, dto.period)
  }

  @Perm('payroll.approve')
  @Post('runs/:id/approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.approve(user, id)
  }

  @Perm('payroll.pay')
  @Post('runs/:id/pay')
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.service.pay(id)
  }

  // تقرير حالة الصرف (كاش/تحويل/فيزا) لسحب تقارير المصروف
  @Perm('payroll.view')
  @Get('runs/:id/pay-methods')
  payMethods(@Param('id', ParseIntPipe) id: number) {
    return this.service.payMethodReport(id)
  }

  // قسيمة راتب — صاحبها يشوفها، وغيره يحتاج payroll.view
  @Get('items/:id')
  async payslip(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    const slip = await this.service.payslip(id)
    if (
      slip.item.employeeId !== user.employeeId &&
      !userHasPerm(user, 'payroll.view')
    ) {
      throw new ForbiddenException('القسيمة ليست لك')
    }
    return slip
  }

  // قسائمي — بورتال الموظف (خدمة ذاتية بلا صلاحيات)
  @Get('my-payslips')
  myPayslips(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return []
    return this.service.payslipsOf(user.employeeId)
  }
}
