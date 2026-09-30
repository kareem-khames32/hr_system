import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { DataSource, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { orgFilterIsEmpty, orgFilterMatches, parseOrgFilter } from '../org/org-filter-params'
import { bankSheetSources, buildBankSheet } from './bank-sheet'
import { PayrollItemDisbursement } from './payroll-disbursement.entities'
import { payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollService } from './payroll.service'

// كشف البنوك لمسير: مين بيتحوله كام على أي بنك، وكام نقدي. حساب الفرع يشوف موظفي فرعه بس.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollBankSheetController {
  constructor(private readonly payroll: PayrollService, private readonly dataSource: DataSource) {}

  @Perm('payroll.view')
  @Get('runs/:id/bank-sheet')
  async bankSheet(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number,
    // فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد — بمكان الموظف في لقطة المسير (CR21-B02): موظف اتنقل بعد الحساب بيفضل في
    // فرعه وقسمه وقت المسير، فالكشف المفلتر وإجمالياته وتصديره بيطابقوا التقرير المالي بنفس الفلتر
    @Query('branchId') branchId?: string, @Query('departmentIds') departmentIds?: string, @Query('teamId') teamId?: string) {
    const org = parseOrgFilter({ branchId, departmentIds, teamId })
    // detail يتحقق من صلاحية المسير ونطاق فرعه قبل أي بند
    const detail = await this.payroll.detail(user, id)
    const scope = branchScopeOf(user)
    if (org.branchId !== null && !inBranchScope(scope, org.branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف كشف فروعه بس' : 'حساب الفرع يشوف كشف فرعه بس')
    }
    const employeeIds = [...new Set(detail.items.map(item => item.employeeId))]
    const employees = employeeIds.length ? await this.dataSource.getRepository(Employee).find({ where: { id: In(employeeIds) },
      select: ['id', 'employeeCode', 'fullName', 'branchId', 'departmentId', 'teamId', 'payMethod', 'bankTransferAmount', 'bankName', 'iban'] }) : []
    // اللي اتصرف فعلًا: علامات الصرف المثبتة + حالة المسير — الصف المصروف بتقسيمه المسجل لا بملف الموظف الحالي
    const marks = await this.dataSource.getRepository(PayrollItemDisbursement).find({ where: { runId: detail.id } })
    const all = bankSheetSources({ items: detail.items, employees, members: detail.members, branchScope: scope,
      settlementOf: payrollItemSettlementPayout, runStatus: detail.status, marks })
    const sources = orgFilterIsEmpty(org) ? all
      : all.filter(source => orgFilterMatches(source.placement ?? { branchId: null, departmentId: null, teamId: null }, org))
    return { run: { id: detail.id, name: detail.name, period: detail.period, status: detail.status, startDate: detail.startDate, endDate: detail.endDate },
      ...buildBankSheet(sources) }
  }
}
