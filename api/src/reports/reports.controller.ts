import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Query, Req, Res, UseGuards } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { Request, Response } from 'express'
import { recordAudit } from '../audit/audit'
import { localDateOf } from '../attendance/attendance.service'
import { reportDayRange } from '../attendance/attendance-report-range'
import type { JwtPayload } from '../auth/auth.service'
import { andBranchScopeSql, branchScopeOf, branchScopeSql, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import {
  assertReportRange, payrollLoansReport, payrollOvertimeReport, payrollRunsReport, payrollUnassignedReport, payrollVarianceReport,
} from '../payroll/payroll-reports'
import { PayrollService } from '../payroll/payroll.service'
import { orgFilterIsEmpty, orgFilterSql, parseOrgFilter, type OrgFilter, type OrgFilterInput } from '../org/org-filter-params'
import {
  PayrollLoansReportQuery, PayrollOvertimeReportQuery, PayrollReportFiltersQuery, PayrollRunsReportQuery, PayrollUnassignedReportQuery,
  PayrollVarianceReportQuery,
} from './payroll-reports.dto'
import { RequireModule } from '../modules-registry/module.guard'
import { ModulesService } from '../modules-registry/modules.service'
import type { ModuleKey } from '../modules-registry/registry'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PRODUCT_NAME } from '../settings/product-name'
import { absenceOutsideServiceSql } from './metrics'
import { MetricsService } from './metrics.service'
import {
  REPORT_CONTENT_TYPES, REPORT_MODULES, REPORT_PDF_MAX_ROWS, REPORT_PDF_TOO_LARGE, REPORT_XLSX_MAX_ROWS, REPORT_XLSX_TOO_LARGE,
  attendanceTable, headcountTable, isReportExportFormat, isReportKey, leavesTable, metricsTable, overtimeTable, payrollTable, reportTableHtml,
  requestsTable, writeReportWorkbook, type ReportKey, type ReportTable,
} from './report-export'
import { ReportPdfRenderer } from './report-pdf.renderer'

const YEAR_RE = /^\d{4}$/

// التقارير المجمعة — استعلامات حقيقية بنطاق الفرع
@RequireModule('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports')
export class ReportsController {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly moduleRef: ModuleRef,
    private readonly metrics: MetricsService,
    private readonly modules: ModulesService,
    private readonly pdf: ReportPdfRenderer,
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

  // شرط نطاق فروع المستخدم بمعاملات @n (فرع أو أكتر؛ النطاق الفاضي = ولا صف): أرقام الفروع بتتضاف لـparams
  // (مش بتتلزق في نص الاستعلام) والشرط بيرجع «AND …» أو فاضي لنطاق الشركة
  private scopeSql(user: JwtPayload, col: string, params: unknown[]) {
    return andBranchScopeSql(col, branchScopeOf(user), params)
  }

  /**
   * فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد في لوحة التقارير (طلب المالك 30 سبتمبر): الفرع والأقسام (الإدارة/القسم المختار
   * بأقسامه الفرعية جوه فرعه) والفريق — تضييق فوق نطاق الفرع، وفرع برّه النطاق مرفوض بنفس رسالة branchFilterOf.
   */
  private orgFilterOf(user: JwtPayload, raw: OrgFilterInput): OrgFilter {
    const filter = parseOrgFilter(raw)
    const scope = branchScopeOf(user)
    if (filter.branchId !== null && !inBranchScope(scope, filter.branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف تقارير فروعه بس' : 'حساب الفرع يشوف تقرير فرعه بس')
    }
    return filter
  }

  // شروط الفلتر الموحد على جدول موظفين بـalias معيّن كـ«AND …» (معاملات @n بس)
  private orgSql(alias: string, filter: OrgFilter, params: unknown[]) {
    return orgFilterSql({ branch: `${alias}.branchId`, department: `${alias}.departmentId`, team: `${alias}.teamId` }, filter, params)
      .map((clause) => `AND ${clause}`).join(' ')
  }

  /**
   * فرع مطلوب صراحة في مرشح التقرير: رقم صحيح موجب، وحساب الفروع لا يطلب فرع برّه نطاقه
   * (نفس رفض /reports/financial/* و/reports/cost-centers بالحرف). من غير طلب = نطاق المستخدم (null = كل الفروع).
   */
  private branchFilterOf(user: JwtPayload, raw?: string): BranchScope {
    const scope = branchScopeOf(user)
    if (raw === undefined || raw === null || String(raw).trim() === '') return scope
    const branchId = Number(raw)
    if (!Number.isInteger(branchId) || branchId < 1) throw new BadRequestException('رقم الفرع غير صالح')
    if (!inBranchScope(scope, branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف تقارير فروعه بس' : 'حساب الفرع يشوف تقرير فرعه بس')
    }
    return [branchId]
  }

  // ===== التعداد: بالفرع والقسم والحالة =====
  // تدقيق ما قبل التشغيل (موجة ج): كان بيجمّع على عمود employees.status المخزَّن، والإيقاف الحالي
  // مابيتكتبش فيه — بيتحسب من فترات الإيقاف وقت العرض (displayEmployeeStatus). فالموقوف النهارده
  // كان بيتعدّ «على رأس العمل» ومفيش خانة «موقوف» أصلًا. بقى بيقرا الصفوف ويجمّعها بنفس قاعدة
  // شاشة الموظفين، فالتعداد والشاشة بيقولوا نفس الكلام.
  @Get('headcount')
  async headcount(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('departmentIds') departmentIds?: string,
    @Query('teamId') teamId?: string
  ) {
    const org = this.orgFilterOf(user, { branchId, departmentIds, teamId })
    // B2.13: العدد والنشطين بتعريف قاموس المؤشرات — نفس دالة اللوحة والتصدير. إجمالي الفرع والقسم = الموظفين الحاليين، والمؤرشف
    // والمنتهية خدمته ظاهرين في توزيع الحالات.
    const workforce = await this.metrics.workforce(branchScopeOf(user), org)
    return {
      date: workforce.date, summary: { headcount: workforce.headcount, active: workforce.active },
      byBranch: workforce.byBranch, byDepartment: workforce.byDepartment, byStatus: workforce.byStatus,
    }
  }

  // ===== الحضور الشهري لكل موظف =====
  @RequireModule('attendance')
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
    const params: unknown[] = [range.from, range.to]
    const s = andBranchScopeSql('a.branchId', branch, params)
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
         -- فترة الخدمة (نفس employmentWindowOf في شاشة الحضور بالحرف): غياب قبل المباشرة، أو بعد آخر يوم عمل
         -- (ملف إنهاء خدمة غير ملغي بعد التعيين)، أو بعد تاريخ الأرشفة لو مفيش ملف كده — مش غياب
         -- الشرط نفسه في قاموس المؤشرات (absenceOutsideServiceSql): مؤشر «نسبة الغياب» بيحسب به
         AND NOT (a.status = 'absent' AND ${absenceOutsideServiceSql('a', 'e')})
       GROUP BY a.employeeId, e.fullName, e.employeeCode
       ORDER BY e.employeeCode`,
      params
    )
  }

  // ===== الإجازات: الاستهلاك بالنوع + الأرصدة =====
  @RequireModule('leave')
  @Get('leaves')
  async leaves(
    @CurrentUser() user: JwtPayload,
    @Query('year') year: string,
    @Query('branchId') branchId?: string,
    @Query('departmentIds') departmentIds?: string,
    @Query('teamId') teamId?: string
  ) {
    if (!YEAR_RE.test(year ?? '')) {
      throw new BadRequestException('السنة بصيغة YYYY')
    }
    const org = this.orgFilterOf(user, { branchId, departmentIds, teamId })
    const scope = branchScopeOf(user)
    const typeParams: unknown[] = []
    const inScope = branchScopeSql('branchId', scope, typeParams)
    const empFilter = inScope ? `AND l.employeeId IN (SELECT id FROM employees WHERE ${inScope})` : ''
    const orgClauses = orgFilterSql({ branch: 'oe.branchId', department: 'oe.departmentId', team: 'oe.teamId' }, org, typeParams)
    const orgFilter = orgClauses.length ? `AND l.employeeId IN (SELECT oe.id FROM employees oe WHERE ${orgClauses.join(' AND ')})` : ''
    const byType = await this.ds.query(
      `SELECT l.leaveTypeCode, l.leaveTypeCode AS leaveType, COUNT(*) AS requests, SUM(l.days) AS totalDays
       FROM leaves l
       WHERE l.status = 'APPROVED' AND l.fromDate LIKE '${year}%' ${empFilter} ${orgFilter}
       GROUP BY l.leaveTypeCode`,
      typeParams
    )
    const balanceParams: unknown[] = []
    const balanceScope = andBranchScopeSql('e.branchId', scope, balanceParams)
    const balances = await this.ds.query(
      `SELECT lb.employeeId, e.fullName, lb.balanceType, lb.entitled, lb.taken,
              lb.openingDays, lb.openingTaken, lb.openingExpiry, lb.adjustmentDays
       FROM leave_balances lb JOIN employees e ON e.id = lb.employeeId
       WHERE lb.period = '${year}'
       ${balanceScope} ${this.orgSql('e', org, balanceParams)}
       ORDER BY e.employeeCode, lb.balanceType`,
      balanceParams
    )
    return { byType, balances }
  }

  // ===== الرواتب: ملخص المسيرات وطرق الصرف =====
  // الخطوة 30: كل المسيرات تظهر حتى بلا فرع (قسم/فريق/مخصّص)؛ نطاق الفرع من لقطة العضو لا من r.branchId وحده.
  // القائمة تعرض كل المسيرات بحالتها (حتى الملغى والمسودة)، ومجاميع طرق الصرف والخصومات من المعتمد والمصروف
  // وحدهما — إلا بـincludeDraft، نفس علم /reports/financial/* بالحرف، فأرقام الشهر تتطابق بين التقارير.
  // الفلتر الموحد: موظفين المسير بمكانهم في لقطته (الصافي وطرق الصرف والخصومات منهم بس)
  // صافي كل مسير وبنوده (ومع الفلتر على فريق من موظف واحد = راتبه) فلوس: محتاجة صلاحية الرواتب زي باقي تقارير الرواتب
  @RequireModule('payroll')
  @Get('payroll')
  async payroll(
    @CurrentUser() user: JwtPayload,
    @Query() query: PayrollRunsReportQuery,
    @Query('branchId') branchId?: string,
    @Query('departmentIds') departmentIds?: string,
    @Query('teamId') teamId?: string
  ) {
    this.requirePayrollView(user)
    const org = this.orgFilterOf(user, { branchId, departmentIds, teamId })
    return payrollRunsReport(this.ds.manager, branchScopeOf(user), { includeDraft: query.includeDraft === true, org })
  }

  // ===== موظفون بلا مسير في الفترة، مع السبب (PR-07 / RP-12) =====
  @RequireModule('payroll')
  @Get('payroll/unassigned')
  async payrollUnassigned(@CurrentUser() user: JwtPayload, @Query() query: PayrollUnassignedReportQuery) {
    this.requirePayrollView(user)
    const range = await this.payrollRange(query)
    const report = await payrollUnassignedReport(this.ds.manager, branchScopeOf(user), { ...query, from: range.from, to: range.to })
    return { period: range.period, ...report }
  }

  // ===== العمل الإضافي بالمبالغ ومصدر كل مبلغ (RP-07) =====
  @RequireModule('payroll', 'overtime')
  @Get('payroll/overtime')
  async payrollOvertime(@CurrentUser() user: JwtPayload, @Query() query: PayrollOvertimeReportQuery) {
    this.requirePayrollView(user)
    const range = await this.payrollRange(query)
    const report = await payrollOvertimeReport(this.ds.manager, branchScopeOf(user), { ...query, from: range.from, to: range.to })
    return { period: range.period, ...report }
  }

  // ===== السلف: الأصل والمسدد والمتبقي و«قسط س من ص» والتقادم والتحصيل المتوقع (RP-08) =====
  @RequireModule('loans')
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
  @RequireModule('payroll')
  @Get('payroll/variance')
  async payrollVariance(@CurrentUser() user: JwtPayload, @Query() query: PayrollVarianceReportQuery) {
    this.requirePayrollView(user)
    return payrollVarianceReport(this.ds.manager, branchScopeOf(user), query)
  }

  // ===== الأوفرتايم الشهري =====
  @RequireModule('overtime')
  @Get('overtime')
  async overtime(
    @CurrentUser() user: JwtPayload,
    @Query('month') month?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const range = reportDayRange({ month, from, to })
    if (!range) throw new BadRequestException('حدد «من تاريخ» و«إلى تاريخ» أو الشهر بصيغة YYYY-MM')
    const params: unknown[] = [range.from, range.to]
    const inScope = branchScopeSql('branchId', branchScopeOf(user), params)
    const empFilter = inScope ? `AND o.employeeId IN (SELECT id FROM employees WHERE ${inScope})` : ''
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
      params
    )
  }

  // ===== حركة الطلبات بالفئة والحالة =====
  // الفلتر الموحد بمكان صاحب الطلب — والسرّي بفرع الطلب بس: مع اختيار إدارة أو قسم أو فريق مابيتعدّش (العدد مايكشفش مكان صاحبه)
  @Get('requests')
  async requests(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('departmentIds') departmentIds?: string,
    @Query('teamId') teamId?: string
  ) {
    const org = this.orgFilterOf(user, { branchId, departmentIds, teamId })
    const params: unknown[] = []
    const s = this.scopeSql(user, 'r.branchId', params)
    let o = ''
    if (!orgFilterIsEmpty(org)) {
      const confidential = org.departmentIds !== null || org.teamId !== null ? '1 = 0'
        : org.branchId !== null ? `r.branchId = @${params.push(org.branchId) - 1}` : '1 = 1'
      const clauses = orgFilterSql({ branch: 'oe.branchId', department: 'oe.departmentId', team: 'oe.teamId' }, org, params)
      // مكان صاحب الطلب الحالي بيتقري جوه نطاق القارئ بس (CR21-B01): صاحب طلب قديم اتنقل لفرع برّه النطاق مايطابقش أي قسم أو
      // فريق — نفس رد رقم مش موجود — فالعدد مايكشفش تنظيمه الجديد. الإجمالي من غير فلتر زي ما هو (بفرع الطلب).
      const readerScope = branchScopeSql('oe.branchId', branchScopeOf(user), params)
      if (readerScope) clauses.push(readerScope)
      o = `AND ((t.isConfidential = 1 AND ${confidential}) OR (ISNULL(t.isConfidential, 0) = 0
        AND r.requesterId IN (SELECT oe.id FROM employees oe WHERE ${clauses.join(' AND ')})))`
    }
    const byType = await this.ds.query(
      `SELECT t.category, r.status, COUNT(*) AS total
       FROM requests r JOIN request_types t ON t.code = r.typeCode
       WHERE 1=1 ${s} ${o} GROUP BY t.category, r.status`,
      params
    )
    return { byType }
  }

  // ===== مؤشرات القاموس بقيمها (B2.13): شهر الرواتب الجاري أو period، بنفس فلتر الفرع والإدارة والقسم والفريق =====
  @Get('metrics')
  async metricValues(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('branchId') branchId?: string,
    @Query('departmentIds') departmentIds?: string,
    @Query('teamId') teamId?: string
  ) {
    return this.metrics.values(user, this.orgFilterOf(user, { branchId, departmentIds, teamId }), period || undefined)
  }

  // ===== تصدير تقرير من الخادم (B2.13): Excel أو PDF =====
  // الجدول بيتبني من دالة التقرير نفسها (نفس الصلاحية والنطاق والفلاتر)، وموديول التقرير المقفول للقارئ بيرد زي مساره (404)،
  // وكل تصدير سطر في سجل التدقيق (التقرير والصيغة وعدد الصفوف). GET لأنه قراءة.
  @Get('export')
  async export(@CurrentUser() user: JwtPayload, @Query() query: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const report = typeof query.report === 'string' ? query.report : ''
    const format = typeof query.format === 'string' && query.format ? query.format : 'xlsx'
    if (!isReportKey(report)) throw new BadRequestException('التقرير المطلوب غير معروف')
    if (!isReportExportFormat(format)) throw new BadRequestException('صيغة التصدير xlsx أو pdf')
    for (const module of REPORT_MODULES[report]) {
      if (!(await this.modules.allowedFor(module as ModuleKey, user))) throw new NotFoundException(`Cannot GET ${req.originalUrl ?? req.url}`)
    }
    const table = await this.reportTable(report, user, query)
    if (format === 'pdf' && table.rows.length > REPORT_PDF_MAX_ROWS) throw new BadRequestException(REPORT_PDF_TOO_LARGE)
    if (table.rows.length > REPORT_XLSX_MAX_ROWS) throw new BadRequestException(REPORT_XLSX_TOO_LARGE)
    const today = localDateOf(new Date())
    const buffer = format === 'xlsx' ? await writeReportWorkbook(table)
      : Buffer.from(await this.pdf.pdf(reportTableHtml(table, { company: await this.companyName(), printedAt: today, printedBy: user.email }, await this.pdf.font())))
    const fileName = `${table.title}-${today}.${format}`
    await recordAudit(this.ds.manager, { category: 'EXPORT', action: 'REPORT_EXPORT', entityType: 'screen', entityId: '/reports', actorUserId: user.sub,
      branchId: user.branchId ?? null, summary: `تصدير ${fileName} (${table.rows.length} صف)`,
      after: { screen: '/reports', report, format, filename: fileName, rows: table.rows.length } })
    res.setHeader('Content-Type', REPORT_CONTENT_TYPES[format])
    res.setHeader('Content-Disposition', `attachment; filename="report-${report}.${format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(buffer)
  }

  private async companyName(): Promise<string> {
    const row = await this.ds.getRepository(RequestsConfig).findOne({ where: { key: 'company.name' } })
    return row?.value?.trim() || PRODUCT_NAME
  }

  /**
   * الحضور والإضافي صف لكل موظف: الفلتر الموحد بمكان الموظف الحالي جوه نطاق القارئ (نفس تضييق اللوحة لنفس الصفوف).
   * بيتحكم على الفلتر قبل قراءة التقرير، وبيرجّع دالة بتسيب صفوف موظفين الفلتر بس.
   */
  private async employeesInOrg(user: JwtPayload, raw: OrgFilterInput) {
    const org = this.orgFilterOf(user, raw)
    if (orgFilterIsEmpty(org)) return <T>(rows: T[]) => rows
    const params: unknown[] = []
    const found: Array<{ id: number }> = await this.ds.query(
      `SELECT e.id AS id FROM employees e WHERE 1=1 ${this.scopeSql(user, 'e.branchId', params)} ${this.orgSql('e', org, params)}`, params)
    const ids = new Set(found.map(row => Number(row.id)))
    return <T extends { employeeId?: unknown }>(rows: T[]) => rows.filter(row => ids.has(Number(row.employeeId)))
  }

  // جدول التقرير من دالة مساره بالحرف: أي رفض (صلاحية، نطاق، فلتر) بيطلع من نفس المكان
  private async reportTable(report: ReportKey, user: JwtPayload, query: Record<string, unknown>): Promise<ReportTable> {
    const q = (key: string) => (typeof query[key] === 'string' && query[key] !== '' ? String(query[key]) : undefined)
    const orgInput = { branchId: q('branchId'), departmentIds: q('departmentIds'), teamId: q('teamId') }
    const dayRange = () => {
      const range = reportDayRange({ month: q('month'), from: q('from'), to: q('to') })
      if (!range) throw new BadRequestException('حدد «من تاريخ» و«إلى تاريخ» أو الشهر بصيغة YYYY-MM')
      return range
    }
    switch (report) {
      case 'headcount': return headcountTable(await this.headcount(user, q('branchId'), q('departmentIds'), q('teamId')))
      case 'attendance': {
        const range = dayRange(), keep = await this.employeesInOrg(user, orgInput)
        return attendanceTable(keep(await this.attendance(user, q('month'), q('from'), q('to'))), range)
      }
      case 'leaves': {
        const year = q('year') ?? ''
        const report = await this.leaves(user, year, q('branchId'), q('departmentIds'), q('teamId'))
        const names: Array<{ code: string; nameAr: string }> = await this.ds.query(`SELECT code, nameAr FROM leave_types`)
        return leavesTable(report, year, new Map(names.map(row => [String(row.code), String(row.nameAr)])))
      }
      case 'payroll': return payrollTable(await this.payroll(user, {} as PayrollRunsReportQuery, q('branchId'), q('departmentIds'), q('teamId')))
      case 'overtime': {
        const range = dayRange(), keep = await this.employeesInOrg(user, orgInput)
        return overtimeTable(keep(await this.overtime(user, q('month'), q('from'), q('to'))), range)
      }
      case 'requests': return requestsTable(await this.requests(user, q('branchId'), q('departmentIds'), q('teamId')))
      case 'metrics': return metricsTable(await this.metricValues(user, q('period'), q('branchId'), q('departmentIds'), q('teamId')))
    }
  }
}
