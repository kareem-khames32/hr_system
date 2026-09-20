import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { DataSource, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { buildBankSheet } from './bank-sheet'
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
    const byId = new Map(employees.map(employee => [employee.id, employee]))
    const members = new Map(detail.members.map(member => [member.employeeId, member]))
    const sources = []
    for (const item of detail.items) {
      const employee = byId.get(item.employeeId)
      const snapshot = members.get(item.employeeId)?.snapshot
      const branchId = snapshot ? snapshot.branchId : employee?.branchId ?? null
      if (scope !== null && Number(branchId) !== Number(scope)) continue
      sources.push({ employeeId: item.employeeId, employeeCode: snapshot?.employeeCode ?? employee?.employeeCode ?? '', fullName: snapshot?.fullName ?? employee?.fullName ?? '',
        payMethod: employee?.payMethod ?? item.payMethod, bankTransferAmount: employee?.bankTransferAmount ?? null,
        bankName: employee?.bankName ?? null, iban: employee?.iban ?? null, netPay: item.netPay,
        // قرار المالك (20 سبتمبر): راتب شهر آخر يوم عمل بيتصرف مع التصفية — خارج كشف البنك والمبلغ المستحق.
        settlementPayout: payrollItemSettlementPayout(item.breakdown) })
    }
    return { run: { id: detail.id, name: detail.name, period: detail.period, status: detail.status, startDate: detail.startDate, endDate: detail.endDate },
      ...buildBankSheet(sources) }
  }
}
