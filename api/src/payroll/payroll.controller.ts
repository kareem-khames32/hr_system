import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsInt, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../auth/guards'
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
@Roles('super_admin', 'hr_manager')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('runs')
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  @Get('runs/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id)
  }

  // إنشاء/إعادة حساب مسير فرع لفترة (23 → 22)
  @Post('runs/calculate')
  calculate(@Body() dto: CalculateDto) {
    return this.service.calculate(dto.branchId, dto.period)
  }

  @Post('runs/:id/approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.approve(user, id)
  }

  @Post('runs/:id/pay')
  pay(@Param('id', ParseIntPipe) id: number) {
    return this.service.pay(id)
  }

  // تقرير حالة الصرف (كاش/تحويل/فيزا) لسحب تقارير المصروف
  @Get('runs/:id/pay-methods')
  payMethods(@Param('id', ParseIntPipe) id: number) {
    return this.service.payMethodReport(id)
  }

  // قسيمة راتب موظف — بند مسير كامل ببياناته
  @Get('items/:id')
  payslip(@Param('id', ParseIntPipe) id: number) {
    return this.service.payslip(id)
  }
}
