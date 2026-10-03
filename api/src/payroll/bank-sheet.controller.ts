import { Controller, ForbiddenException, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common'
import { DataSource, In } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { orgFilterIsEmpty, orgFilterMatches, parseOrgFilter } from '../org/org-filter-params'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { singleCurrency, totalsByCurrency } from '../org/currency-totals'
import { bankSheetSources, buildBankSheet, NO_BANK_LABEL, type BankSheetRow, type BankSheetSource } from './bank-sheet'
import { PayrollItemDisbursement } from './payroll-disbursement.entities'
import { payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollService } from './payroll.service'
import { RequireModule } from '../modules-registry/module.guard'

// كشف البنوك لمسير: مين بيتحوله كام على أي بنك، وكام نقدي. حساب الفرع يشوف موظفي فرعه بس.
@RequireModule('payroll')
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
    // B1.1: الصف بعملة فرع الموظف في لقطة المسير، والبنك بعملة صفوفه، والإجماليات لكل عملة لوحدها (مسير فيه فرعين بعملتين)
    const currencyOfBranch = await readBranchCurrencyOf(this.dataSource.manager)
    const ofSource = (source: BankSheetSource) => currencyOfBranch(source.placement?.branchId ?? null)
    const ofEmployee = new Map(sources.map(source => [source.employeeId, ofSource(source)]))
    const withCurrency = <T extends Pick<BankSheetRow, 'employeeId'>>(row: T) => ({ ...row, currency: ofEmployee.get(row.employeeId) ?? null })
    const sheet = buildBankSheet(sources)
    // إجمالي كل عملة = نفس الإجمالي + بنوكها وتنبيهاتها ومصروفها مع التصفية (من نفس الدالة على صفوف العملة دي بس)
    const currencyPart = (list: readonly BankSheetSource[]) => {
      const part = buildBankSheet([...list])
      return { ...part.totals, banks: part.banks, issues: { employees: part.issues.employees, bank: part.issues.bank, cash: part.issues.cash },
        settlement: { employees: part.settlement.employees, total: part.settlement.total } }
    }
    return { run: { id: detail.id, name: detail.name, period: detail.period, status: detail.status, startDate: detail.startDate, endDate: detail.endDate },
      ...sheet, rows: sheet.rows.map(withCurrency), issues: { ...sheet.issues, rows: sheet.issues.rows.map(withCurrency) },
      settlement: { ...sheet.settlement, rows: sheet.settlement.rows.map(withCurrency) },
      banks: sheet.banks.map(bank => ({ ...bank, currency: singleCurrency(sheet.rows.filter(row => row.bankAmount > 0 && (row.bankName ?? NO_BANK_LABEL) === bank.bankName)
        .map(row => ofEmployee.get(row.employeeId) ?? '')) })),
      byCurrency: totalsByCurrency(sources, ofSource, currencyPart) }
  }
}
