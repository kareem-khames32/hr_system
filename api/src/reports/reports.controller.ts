import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard } from '../auth/guards'

const MONTH_RE = /^\d{4}-\d{2}$/
const YEAR_RE = /^\d{4}$/

// التقارير المجمعة — استعلامات حقيقية بنطاق الفرع
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private scopeSql(user: JwtPayload, col = 'branchId') {
    const scope = branchScopeOf(user)
    return scope !== null ? `AND ${col} = ${scope}` : ''
  }

  // ===== التعداد: بالفرع والقسم والحالة =====
  @Get('headcount')
  async headcount(@CurrentUser() user: JwtPayload) {
    const s = this.scopeSql(user, 'e.branchId')
    const byBranch = await this.ds.query(
      `SELECT b.name AS branchName, COUNT(e.id) AS total,
              SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) AS active
       FROM employees e JOIN branches b ON b.id = e.branchId
       WHERE 1=1 ${s} GROUP BY b.name`
    )
    const byDepartment = await this.ds.query(
      `SELECT d.name AS departmentName, COUNT(e.id) AS total
       FROM employees e JOIN departments d ON d.id = e.departmentId
       WHERE 1=1 ${s} GROUP BY d.name`
    )
    const byStatus = await this.ds.query(
      `SELECT e.status, COUNT(*) AS total FROM employees e
       WHERE 1=1 ${s} GROUP BY e.status`
    )
    return { byBranch, byDepartment, byStatus }
  }

  // ===== الحضور الشهري لكل موظف =====
  @Get('attendance')
  async attendance(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string
  ) {
    if (!MONTH_RE.test(month ?? '')) {
      throw new BadRequestException('الشهر بصيغة YYYY-MM')
    }
    const s = this.scopeSql(user, 'a.branchId')
    return this.ds.query(
      `SELECT a.employeeId, e.fullName, e.employeeCode,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS presentDays,
              SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS lateDays,
              SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absentDays,
              SUM(CASE WHEN a.status = 'early_leave' THEN 1 ELSE 0 END) AS earlyLeaveDays,
              SUM(a.lateMinutes) AS totalLateMinutes,
              SUM(a.workMinutes) AS totalWorkMinutes
       FROM attendance_days a JOIN employees e ON e.id = a.employeeId
       WHERE a.date LIKE '${month}%' ${s}
       GROUP BY a.employeeId, e.fullName, e.employeeCode
       ORDER BY e.employeeCode`
    )
  }

  // ===== الإجازات: الاستهلاك بالنوع + الأرصدة =====
  @Get('leaves')
  async leaves(@CurrentUser() user: JwtPayload, @Query('year') year: string) {
    if (!YEAR_RE.test(year ?? '')) {
      throw new BadRequestException('السنة بصيغة YYYY')
    }
    const scope = branchScopeOf(user)
    const empFilter =
      scope !== null
        ? `AND l.employeeId IN (SELECT id FROM employees WHERE branchId = ${scope})`
        : ''
    const byType = await this.ds.query(
      `SELECT l.leaveType, COUNT(*) AS requests, SUM(l.days) AS totalDays
       FROM leaves l
       WHERE l.status = 'APPROVED' AND l.fromDate LIKE '${year}%' ${empFilter}
       GROUP BY l.leaveType`
    )
    const balances = await this.ds.query(
      `SELECT lb.employeeId, e.fullName, lb.balanceType, lb.entitled, lb.taken,
              lb.openingDays, lb.openingTaken, lb.openingExpiry
       FROM leave_balances lb JOIN employees e ON e.id = lb.employeeId
       WHERE lb.period = '${year}'
       ${scope !== null ? `AND e.branchId = ${scope}` : ''}
       ORDER BY e.employeeCode, lb.balanceType`
    )
    return { byType, balances }
  }

  // ===== الرواتب: ملخص المسيرات وطرق الصرف =====
  @Get('payroll')
  async payroll(@CurrentUser() user: JwtPayload) {
    const s = this.scopeSql(user, 'r.branchId')
    const runs = await this.ds.query(
      `SELECT r.id, r.period, r.status, r.totalNet, b.name AS branchName,
              (SELECT COUNT(*) FROM payroll_items i WHERE i.runId = r.id) AS employees
       FROM payroll_runs r JOIN branches b ON b.id = r.branchId
       WHERE 1=1 ${s} ORDER BY r.period DESC`
    )
    const byMethod = await this.ds.query(
      `SELECT i.payMethod, COUNT(*) AS count, SUM(i.netPay) AS total
       FROM payroll_items i JOIN payroll_runs r ON r.id = i.runId
       WHERE 1=1 ${s} GROUP BY i.payMethod`
    )
    const deductions = await this.ds.query(
      `SELECT r.period,
              SUM(i.latenessDeduction) AS lateness,
              SUM(i.unpaidLeaveDeduction) AS unpaidLeave,
              SUM(i.loanInstallments) AS loans,
              SUM(i.overtimeAmount) AS overtime
       FROM payroll_items i JOIN payroll_runs r ON r.id = i.runId
       WHERE 1=1 ${s} GROUP BY r.period ORDER BY r.period DESC`
    )
    return { runs, byMethod, deductions }
  }

  // ===== الأوفرتايم الشهري =====
  @Get('overtime')
  async overtime(
    @CurrentUser() user: JwtPayload,
    @Query('month') month: string
  ) {
    if (!MONTH_RE.test(month ?? '')) {
      throw new BadRequestException('الشهر بصيغة YYYY-MM')
    }
    const scope = branchScopeOf(user)
    const empFilter =
      scope !== null
        ? `AND o.employeeId IN (SELECT id FROM employees WHERE branchId = ${scope})`
        : ''
    return this.ds.query(
      `SELECT o.employeeId, e.fullName, o.status,
              COUNT(*) AS entries,
              SUM(o.hoursActual) AS actualHours,
              SUM(o.payableHours) AS payableHours
       FROM overtime_entries o JOIN employees e ON e.id = o.employeeId
       WHERE o.date LIKE '${month}%' ${empFilter}
       GROUP BY o.employeeId, e.fullName, o.status
       ORDER BY e.fullName`
    )
  }

  // ===== حركة الطلبات بالفئة والحالة =====
  @Get('requests')
  async requests(@CurrentUser() user: JwtPayload) {
    const s = this.scopeSql(user, 'r.branchId')
    const byType = await this.ds.query(
      `SELECT t.category, r.status, COUNT(*) AS total
       FROM requests r JOIN request_types t ON t.code = r.typeCode
       WHERE 1=1 ${s} GROUP BY t.category, r.status`
    )
    return { byType }
  }
}
