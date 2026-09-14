import { BadRequestException, Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import {
  assertReportRange, payrollLoansReport, payrollOvertimeReport, payrollRunsReport, payrollUnassignedReport, payrollVarianceReport,
} from '../payroll/payroll-reports'
import { PayrollService } from '../payroll/payroll.service'
import {
  PayrollLoansReportQuery, PayrollOvertimeReportQuery, PayrollReportFiltersQuery, PayrollUnassignedReportQuery, PayrollVarianceReportQuery,
} from './payroll-reports.dto'

const MONTH_RE = /^\d{4}-\d{2}$/
const YEAR_RE = /^\d{4}$/

// التقارير المجمعة — استعلامات حقيقية بنطاق الفرع
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports')
export class ReportsController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly moduleRef: ModuleRef,
  ) {}

  // التقارير التي تكشف مبالغ أو أرصدة فردية تتطلب صلاحية الرواتب فوق مركز التقارير (RP-00)
  private requirePayrollView(user: JwtPayload) {
    if (!userHasPerm(user, 'payroll.view')) {
      throw new ForbiddenException('تقارير الرواتب التفصيلية تتطلب صلاحية عرض مسيرات الرواتب')
    }
  }

  // فترة التقرير: تاريخان صريحان، أو شهر رواتب بدورة payroll.cycle_start_day من نفس دالة المسير
  private async payrollRange(query: PayrollReportFiltersQuery) {
    if (query.from || query.to) {
      if (!query.from || !query.to) throw new BadRequestException('حدد بداية الفترة ونهايتها معًا')
      assertReportRange(query.from, query.to)
      return { period: null as string | null, from: query.from, to: query.to }
    }
    const payroll = this.moduleRef.get(PayrollService, { strict: false })
    let period = query.period
    if (!period) {
      const today = localDateOf(new Date())
      period = today.slice(0, 7)
      if (today > (await payroll.periodRange(period)).endDate) {
        const [year, month] = period.split('-').map(Number)
        period = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
      }
    }
    const range = await payroll.periodRange(period)
    return { period, from: range.startDate, to: range.endDate }
  }

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
              SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) AS leaveDays,
              SUM(CASE WHEN a.status = 'holiday' THEN 1 ELSE 0 END) AS holidayDays,
              SUM(CASE WHEN a.status = 'partial_leave' THEN 1 ELSE 0 END) AS partialLeaveDays,
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
      `SELECT l.leaveTypeCode, l.leaveTypeCode AS leaveType, COUNT(*) AS requests, SUM(l.days) AS totalDays
       FROM leaves l
       WHERE l.status = 'APPROVED' AND l.fromDate LIKE '${year}%' ${empFilter}
       GROUP BY l.leaveTypeCode`
    )
    const balances = await this.ds.query(
      `SELECT lb.employeeId, e.fullName, lb.balanceType, lb.entitled, lb.taken,
              lb.openingDays, lb.openingTaken, lb.openingExpiry, lb.adjustmentDays
       FROM leave_balances lb JOIN employees e ON e.id = lb.employeeId
       WHERE lb.period = '${year}'
       ${scope !== null ? `AND e.branchId = ${scope}` : ''}
       ORDER BY e.employeeCode, lb.balanceType`
    )
    return { byType, balances }
  }

  // ===== الرواتب: ملخص المسيرات وطرق الصرف =====
  // الخطوة 30: كل المسيرات تظهر حتى بلا فرع (قسم/فريق/مخصّص)؛ نطاق الفرع من لقطة العضو لا من r.branchId وحده.
  // الملغى يظهر في القائمة ولا يدخل مجاميع طرق الصرف والخصومات.
  @Get('payroll')
  async payroll(@CurrentUser() user: JwtPayload) {
    return payrollRunsReport(this.ds.manager, branchScopeOf(user))
  }

  // ===== موظفون بلا مسير في الفترة، مع السبب (PR-07 / RP-12) =====
  @Get('payroll/unassigned')
  async payrollUnassigned(@CurrentUser() user: JwtPayload, @Query() query: PayrollUnassignedReportQuery) {
    this.requirePayrollView(user)
    const range = await this.payrollRange(query)
    const report = await payrollUnassignedReport(this.ds.manager, branchScopeOf(user), { ...query, from: range.from, to: range.to })
    return { period: range.period, ...report }
  }

  // ===== العمل الإضافي بالمبالغ ومصدر كل مبلغ (RP-07) =====
  @Get('payroll/overtime')
  async payrollOvertime(@CurrentUser() user: JwtPayload, @Query() query: PayrollOvertimeReportQuery) {
    this.requirePayrollView(user)
    const range = await this.payrollRange(query)
    const report = await payrollOvertimeReport(this.ds.manager, branchScopeOf(user), { ...query, from: range.from, to: range.to })
    return { period: range.period, ...report }
  }

  // ===== السلف: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتحصيل المتوقع (RP-08) =====
  @Get('payroll/loans')
  async payrollLoans(@CurrentUser() user: JwtPayload, @Query() query: PayrollLoansReportQuery) {
    this.requirePayrollView(user)
    const range = query.period || query.from || query.to ? await this.payrollRange(query) : null
    const report = await payrollLoansReport(this.ds.manager, branchScopeOf(user), {
      ...query, today: localDateOf(new Date()), from: range?.from, to: range?.to,
    })
    return { period: range?.period ?? null, ...report }
  }

  // ===== الفروق بين شهرين لكل موظف مع تفسير البنود (RP-10) =====
  @Get('payroll/variance')
  async payrollVariance(@CurrentUser() user: JwtPayload, @Query() query: PayrollVarianceReportQuery) {
    this.requirePayrollView(user)
    return payrollVarianceReport(this.ds.manager, branchScopeOf(user), query)
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
    // مبلغ لقطة الاعتماد يظهر فقط لمن يملك عرض الرواتب؛ مدير الفرع يرى الساعات بلا مبالغ (RP-07)
    const amount = userHasPerm(user, 'payroll.view')
      ? `, CONVERT(varchar(40), SUM(CASE WHEN o.status IN ('APPROVED', 'PAID') THEN o.amountSnapshot END)) AS approvedAmount`
      : ''
    return this.ds.query(
      `SELECT o.employeeId, e.fullName, o.status,
              COUNT(*) AS entries,
              SUM(o.hoursActual) AS actualHours,
              SUM(o.payableHours) AS payableHours${amount}
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
