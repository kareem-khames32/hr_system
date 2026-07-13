import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { ForbiddenException } from '@nestjs/common'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { EmployeesService } from '../employees/employees.service'
import { Team } from '../org/entities/team.entity'
import { CustodyAssignment, Asset } from '../requests/entities/custody.entities'
import {
  EmployeeStatusHistory,
  Transfer,
} from '../requests/entities/employment.entities'
import { Leave, LeaveBalance } from '../requests/entities/leave.entities'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { EmployeeDocument } from './assets.entities'

// لوج النقل + التاريخ الوظيفي + الملف المجمّع للموظف + السلف
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class EmployeeExtrasController {
  constructor(
    private readonly employeesService: EmployeesService,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(Transfer) private readonly transfers: Repository<Transfer>,
    @InjectRepository(EmployeeStatusHistory)
    private readonly history: Repository<EmployeeStatusHistory>,
    @InjectRepository(CustodyAssignment)
    private readonly custody: Repository<CustodyAssignment>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(Leave) private readonly leaves: Repository<Leave>,
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    private readonly leaveBalances: LeaveBalancesService,
    @InjectRepository(EmployeeDocument)
    private readonly docs: Repository<EmployeeDocument>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>
  ) {}

  // ===== لوج النقل بين الفرق (بتاريخ السريان) =====
  @Perm('transfers.view')
  @Get('transfers')
  async listTransfers(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const allTeams = await this.teams.find()
    const teamById = new Map(allTeams.map((t) => [t.id, t.name]))
    const rows = await this.transfers.find({
      where: scope !== null ? { employeeId: In(emps.map((e) => e.id)) } : {},
      order: { effectiveDate: 'DESC' },
    })
    return rows.map((t) => ({
      ...t,
      employeeName: empById.get(t.employeeId)?.fullName ?? `#${t.employeeId}`,
      fromTeamName: teamById.get(t.fromTeam) ?? `#${t.fromTeam}`,
      toTeamName: teamById.get(t.toTeam) ?? `#${t.toTeam}`,
    }))
  }

  // ===== السلف وأقساطها =====
  @Perm('payroll.view')
  @Get('loans')
  async listLoans(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const emps = await this.employees.find({
      where: scope !== null ? { branchId: scope } : {},
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const rows = await this.loans.find({
      where: scope !== null ? { employeeId: In(emps.map((e) => e.id)) } : {},
      order: { id: 'DESC' },
    })
    const result = []
    for (const loan of rows) {
      const inst = await this.installments.find({
        where: { loanId: loan.id },
        order: { dueDate: 'ASC' },
      })
      const paid = inst.filter((i) => i.paid)
      result.push({
        ...loan,
        employeeName: empById.get(loan.employeeId)?.fullName ?? `#${loan.employeeId}`,
        installments: inst,
        paidCount: paid.length,
        paidAmount: paid.reduce((s, i) => s + Number(i.amount), 0),
        remainingAmount:
          Number(loan.amount) - paid.reduce((s, i) => s + Number(i.amount), 0),
      })
    }
    return result
  }

  // ===== الملف المجمّع — كل تبويبات شاشة الموظف بنداء واحد =====
  @Get('employees/:id/profile')
  async profile(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض ملفات الموظفين')
    }
    const employee = await this.employeesService.findOne(id, branchScopeOf(user))
    const [empLeaves, viewBalances, empHistory, empDocs, empLoans] =
      await Promise.all([
        this.leaves.find({ where: { employeeId: id }, order: { fromDate: 'DESC' } }),
        // الأرصدة بالاستحقاق الشهري المتراكم (لا الخام) — نفس ما يراه الموظف
        this.leaveBalances.allBalances(id),
        this.history.find({ where: { employeeId: id }, order: { changedAt: 'DESC' } }),
        this.docs.find({ where: { employeeId: id }, order: { id: 'DESC' } }),
        this.loans.find({ where: { employeeId: id }, order: { id: 'DESC' } }),
      ])
    // نُبقي شكل الأرصدة كما يتوقعه الفرونت (خام) لكن بقيَم متراكمة صحيحة
    const empBalances = viewBalances.map((b: any) => ({
      balanceType: b.balanceType,
      period: b.period,
      entitled: b.entitled, // المتراكم حتى اليوم (لا السنة الكاملة)
      taken: b.totalTaken ?? b.taken ?? 0,
      openingDays: b.opening?.days ?? 0,
      openingTaken: b.opening?.taken ?? 0,
      openingExpiry: b.opening?.expiry ?? null,
    }))
    const custodyRows = await this.custody.find({
      where: { employeeId: id },
      order: { assignedAt: 'DESC' },
    })
    const assetIds = [...new Set(custodyRows.map((c) => c.assetId))]
    const assetRows = assetIds.length
      ? await this.assets.find({ where: { id: In(assetIds) } })
      : []
    const assetById = new Map(assetRows.map((a) => [a.id, a]))
    return {
      employee,
      leaves: empLeaves,
      balances: empBalances,
      history: empHistory,
      documents: empDocs,
      loans: empLoans,
      custody: custodyRows.map((c) => ({
        ...c,
        assetName: assetById.get(c.assetId)?.name ?? `#${c.assetId}`,
        assetCategory: assetById.get(c.assetId)?.category ?? '',
      })),
    }
  }

  // ===== التاريخ الوظيفي وحده =====
  @Get('employees/:id/history')
  async employeeHistory(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    if (user.employeeId !== id && !userHasPerm(user, 'employees.view')) {
      throw new ForbiddenException('لا تملك صلاحية عرض ملفات الموظفين')
    }
    await this.employeesService.findOne(id, branchScopeOf(user))
    return this.history.find({
      where: { employeeId: id },
      order: { changedAt: 'DESC' },
    })
  }
}
