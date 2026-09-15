import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ExemptionAttachmentDto, ExemptionDecisionDto, ExemptionInputDto, ExemptionListQueryDto, ExemptionReportQueryDto } from './financial-exemptions.dto'
import { FinancialExemptionsService } from './financial-exemptions.service'

// الخطوة 26 — الإعفاء المالي في مسير (EX-01..08): المنح للموارد البشرية بـfinancial_exemption.grant في فرع الموظف،
// ولمدير القسم (خصومات الحضور لقسمه بسقف) ومدير الجهة المالكة (نوع خصمها) بلا صلاحية نظام وباعتماد الموارد البشرية.
// الفحص الحقيقي للنطاق وفصل المهام والحدود والحالة داخل الخدمة.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/exemptions')
export class FinancialExemptionsController {
  constructor(private readonly service: FinancialExemptionsService) {}

  // المسيرات المحسوبة التي يستطيع المستخدم منح إعفاء فيها
  @Get('grantable-runs')
  grantableRuns(@CurrentUser() user: JwtPayload) {
    return this.service.grantableRuns(user)
  }

  // الموظف يرى إعفاءاته برقمها وحالتها وسببها
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  // EX-06: تقرير حوكمة الإعفاءات
  @Perm('financial_exemption.view')
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query() query: ExemptionReportQueryDto) {
    return this.service.report(user, query)
  }

  @Get('runs/:runId')
  runView(@CurrentUser() user: JwtPayload, @Param('runId', ParseIntPipe) runId: number) {
    return this.service.runView(user, runId)
  }

  @Get('runs/:runId/candidates')
  candidates(@CurrentUser() user: JwtPayload, @Param('runId', ParseIntPipe) runId: number, @Query('employeeId') employeeId?: string) {
    if (employeeId !== undefined && !/^[1-9]\d{0,9}$/.test(employeeId)) throw new BadRequestException({ code: 'EXEMPTION_EMPLOYEE_INVALID', message: 'رقم الموظف غير صالح' })
    return this.service.candidates(user, runId, employeeId === undefined ? undefined : Number(employeeId))
  }

  // المعاينة قراءة فقط: المبلغ المقدر وسطوره والمحمي والحدود والتوجيه للاعتماد وبصمة المعاينة
  @Post('preview')
  preview(@CurrentUser() user: JwtPayload, @Body() dto: ExemptionInputDto) {
    return this.service.preview(user, dto)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: ExemptionInputDto) {
    return this.service.create(user, dto)
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ExemptionListQueryDto) {
    return this.service.list(user, query)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user, id)
  }

  @Perm('financial_exemption.approve')
  @Post(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionDecisionDto) {
    return this.service.approve(user, id, dto)
  }

  @Perm('financial_exemption.approve')
  @Post(':id/reject')
  reject(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionDecisionDto) {
    return this.service.reject(user, id, dto)
  }

  // إلغاء إعفاء حي قبل اعتماد المسير (المانح أو الموارد البشرية)؛ المطبق لا يُلغى
  @Post(':id/revoke')
  revoke(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionDecisionDto) {
    return this.service.revoke(user, id, dto)
  }

  @Post(':id/attachment')
  attach(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ExemptionAttachmentDto) {
    return this.service.attach(user, id, dto)
  }
}
