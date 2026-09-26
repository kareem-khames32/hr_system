import { BadRequestException, Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { reportDayRange } from '../attendance/attendance-report-range'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { readOpenSuspensions } from '../employees/employee-suspensions'
import { displayEmployeeStatus } from '../employees/employee-suspension-rules'
import {
  assertReportRange, payrollLoansReport, payrollOvertimeReport, payrollRunsReport, payrollUnassignedReport, payrollVarianceReport,
} from '../payroll/payroll-reports'
import { PayrollService } from '../payroll/payroll.service'
import {
  PayrollLoansReportQuery, PayrollOvertimeReportQuery, PayrollReportFiltersQuery, PayrollRunsReportQuery, PayrollUnassignedReportQuery,
  PayrollVarianceReportQuery,
} from './payroll-reports.dto'

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

  /**
   * فرع مطلوب صراحة في مرشح التقرير: رقم صحيح موجب، وحساب الفرع لا يطلب غير فرعه
   * (نفس رفض /reports/financial/* و/reports/cost-centers بالحرف). null = كل الفروع في نطاق المستخدم.
   */
  private branchFilterOf(user: JwtPayload, raw?: string): number | null {
    const scope = branchScopeOf(user)
    if (raw === undefined || raw === null || String(raw).trim() === '') return scope
    const branchId = Number(raw)
    if (!Number.isInteger(branchId) || branchId < 1) throw new BadRequestException('رقم الفرع غير صالح')
    if (scope !== null && branchId !== scope) throw new ForbiddenException('حساب الفرع يشوف تقرير فرعه بس')
    return branchId
  }

  // ===== التعداد: بالفرع والقسم والحالة =====
  // تدقيق ما قبل التشغيل (موجة ج): كان بيجمّع على عمود employees.status المخزَّن، والإيقاف الحالي
  // مابيتكتبش فيه — بيتحسب من فترات الإيقاف وقت العرض (displayEmployeeStatus). فالموقوف النهارده
  // كان بيتعدّ «على رأس العمل» ومفيش خانة «موقوف» أصلًا. بقى بيقرا الصفوف ويجمّعها بنفس قاعدة
  // شاشة الموظفين، فالتعداد والشاشة بيقولوا نفس الكلام.
  @Get('headcount')
  async headcount(@CurrentUser() user: JwtPayload) {
    const s = this.scopeSql(user, 'e.branchId')
    const rows: Array<{ id: number; status: string; branchName: string | null; departmentName: string | null }> =
      await this.ds.query(
        `SELECT e.id AS id, e.status AS status, b.name AS branchName, d.name AS departmentName
         FROM employees e JOIN branches b ON b.id = e.branchId
         LEFT JOIN departments d ON d.id = e.departmentId
         WHERE 1=1 ${s}`
      )
    const today = localDateOf(new Date())
    const suspensions = await readOpenSuspensions(this.ds.manager, today)
    const statusOf = (row: { id: number; status: string }) =>
      displayEmployeeStatus(row.status, suspensions.get(row.id) ?? [], today)
    const bump = (map: Map<string, { total: number; active: number }>, key: string, isActive: boolean) => {
      const cell = map.get(key) ?? { total: 0, active: 0 }
      cell.total += 1
      if (isActive) cell.active += 1
      map.set(key, cell)
    }
    const branches = new Map<string, { total: number; active: number }>()
    const departments = new Map<string, { total: number; active: number }>()
    const statuses = new Map<string, number>()
    for (const row of rows) {
      const status = statusOf(row)
      if (row.branchName) bump(branches, row.branchName, status === 'active')
      if (row.departmentName) bump(departments, row.departmentName, status === 'active')
      statuses.set(status, (statuses.get(status) ?? 0) + 1)
    }
    return {
      byBranch: [...branches.entries()].map(([branchName, cell]) => ({ branchName, total: cell.total, active: cell.active })),
      byDepartment: [...departments.entries()].map(([departmentName, cell]) => ({ departmentName, total: cell.total })),
      byStatus: [...statuses.entries()].map(([status, total]) => ({ status, total })),
    }
  }

  // ===== الحضور الشهري لكل موظف =====
  @Get('attendance')
  async attendance(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string
  ) {
    // «من تاريخ / إلى تاريخ» باليوم (شهر الرواتب 23 → 22 مثلًا)، أو الشهر للتوافق
    const range = reportDayRange({ month, from, to })
    if (!range) throw new BadRequestException('حدد «من تاريخ» و«إلى تاريخ» أو الشهر بصيغة YYYY-MM')
    // فلتر الفرع يُطبَّق فعلًا (كان يُقبل ويُتجاهل بصمت)، وحساب الفرع ممنوع من فرع غيره
    const branch = this.branchFilterOf(user, branchId)
    const s = branch !== null ? `AND a.branchId = ${branch}` : ''
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
       WHERE a.date BETWEEN @0 AND @1 ${s}
         -- فترة الخدمة: غياب بعد آخر يوم عمل (ملف إنهاء خدمة غير ملغي بعد التعيين) مش غياب
         AND NOT (a.status = 'absent' AND EXISTS (
           SELECT 1 FROM offboarding_cases oc
            WHERE oc.employeeId = a.employeeId AND oc.status <> 'CANCELLED'
              AND oc.lastWorkingDay < a.date
              AND oc.lastWorkingDay >= COALESCE(e.actualStartDate, e.joinDate, '1900-01-01')))
       GROUP BY a.employeeId, e.fullName, e.employeeCode
       ORDER BY e.employeeCode`,
      [range.from, range.to]
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
  // القائمة تعرض كل المسيرات بحالتها (حتى الملغى والمسودة)، ومجاميع طرق الصرف والخصومات من المعتمد والمصروف
  // وحدهما — إلا بـincludeDraft، نفس علم /reports/financial/* بالحرف، فأرقام الشهر تتطابق بين التقارير.
  @Get('payroll')
  async payroll(@CurrentUser() user: JwtPayload, @Query() query: PayrollRunsReportQuery) {
    return payrollRunsReport(this.ds.manager, branchScopeOf(user), { includeDraft: query.includeDraft === true })
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
  // المعتمد والمصروف وحدهما، إلا بـincludeDraft — فإجمالي الشهر هنا = إجمالي كشف الرواتب المالي لنفس الشهر
  @Get('payroll/variance')
  async payrollVariance(@CurrentUser() user: JwtPayload, @Query() query: PayrollVarianceReportQuery) {
    this.requirePayrollView(user)
    return payrollVarianceReport(this.ds.manager, branchScopeOf(user), query)
  }

  // ===== الأوفرتايم الشهري =====
  @Get('overtime')
  async overtime(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const range = reportDayRange({ month, from, to })
    if (!range) throw new BadRequestException('حدد «من تاريخ» و«إلى تاريخ» أو الشهر بصيغة YYYY-MM')
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
       WHERE o.date BETWEEN @0 AND @1 ${empFilter}
       GROUP BY o.employeeId, e.fullName, o.status
       ORDER BY e.fullName`,
      [range.from, range.to]
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
