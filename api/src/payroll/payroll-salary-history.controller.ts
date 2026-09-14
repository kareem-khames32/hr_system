import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards, ValidationPipe } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PayrollFormulaBodyPipe } from './payroll-formula.dto'
import { ReplacePayrollMonthlySalaryHistoryDto, ReplacePayrollSalaryHistoryDto } from './payroll-salary-history.dto'
import { PayrollSalaryHistoryService } from './payroll-salary-history.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/employees/:employeeId/salary-history')
export class PayrollSalaryHistoryController {
  constructor(private readonly service: PayrollSalaryHistoryService) {}
  @Perm('payroll.view') @Get()
  detail(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number) { return this.service.detail(user, employeeId) }
  @Perm('payroll.approve') @Post()
  replace(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body(new PayrollFormulaBodyPipe(5000), new ValidationPipe({ expectedType: ReplacePayrollSalaryHistoryDto, transform: true, whitelist: true, forbidNonWhitelisted: true })) body: unknown) {
    return this.service.replace(user, employeeId, body as ReplacePayrollSalaryHistoryDto)
  }
  @Perm('payroll.approve') @Post('monthly')
  replaceMonthly(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body(new PayrollFormulaBodyPipe(5000), new ValidationPipe({ expectedType: ReplacePayrollMonthlySalaryHistoryDto, transform: true, whitelist: true, forbidNonWhitelisted: true })) body: unknown) {
    return this.service.replaceMonthly(user, employeeId, body as ReplacePayrollMonthlySalaryHistoryDto)
  }
}
