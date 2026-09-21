import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { DataSource, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { bankSheetSources, buildBankSheet } from './bank-sheet'
import { payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollService } from './payroll.service'

// كشف البنوك لمسير: مين بيتحوله كام على أي بنك، وكام نقدي. حساب الفرع يشوف موظفي فرعه بس.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollBankSheetController {
  constructor(private readonly payroll: PayrollService, private readonly dataSource: DataSource) {}

  @Perm('payroll.view')
  @Get('runs/:id/bank-sheet')
  async bankSheet(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    // detail يتحقق من صلاحية المسير ونطاق فرعه قبل أي بند
    const detail = await this.payroll.detail(user, id)
    const scope = branchScopeOf(user)
    const employeeIds = [...new Set(detail.items.map(item => item.employeeId))]
    const employees = employeeIds.length ? await this.dataSource.getRepository(Employee).find({ where: { id: In(employeeIds) },
      select: ['id', 'employeeCode', 'fullName', 'branchId', 'payMethod', 'bankTransferAmount', 'bankName', 'iban'] }) : []
    const sources = bankSheetSources({ items: detail.items, employees, members: detail.members, branchScope: scope,
      settlementOf: payrollItemSettlementPayout })
    return { run: { id: detail.id, name: detail.name, period: detail.period, status: detail.status, startDate: detail.startDate, endDate: detail.endDate },
      ...buildBankSheet(sources) }
  }
}
