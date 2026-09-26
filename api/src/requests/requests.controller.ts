import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, Roles, RolesGuard, userHasPerm } from '../auth/guards'
import { EmployeesService } from '../employees/employees.service'
import { LeaveType } from './entities/leave.entities'
import { definitionBranchQuery, definitionBranchWhere } from '../common/definition-branch'
import { LeaveBalancesService } from './leave-balances.service'
import { RequestsService } from './requests.service'
import { leaveTypeView } from '../common/leave-contract'
// ملاحظة النقل تُحفظ في custody_assignments.condition nvarchar(100) — الحد نفسه في الـDTO والخدمة
import { TransferCustodyDto } from '../assets/custody.dto'

class CreateRequestDto {
  @IsString()
  typeCode: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  definitionCode?: string

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>

  @IsOptional()
  submit?: boolean

  // نيابة عن موظف آخر — تتطلب requests.create_on_behalf
  @IsOptional()
  onBehalfEmployeeId?: number
}

class ActDto {
  @IsIn(['APPROVE', 'REJECT', 'RETURN'])
  action: 'APPROVE' | 'REJECT' | 'RETURN'

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string

  @IsOptional()
  @IsInt()
  approvedMinutes?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reductionReason?: string

  // C6 / AD-07: تخفيض مبلغ السلفة عند الاعتماد (نص دقيق يُتحقق منه في الخدمة) أو استثناء موثق لتجاوز السقف
  @IsOptional()
  @IsString()
  @MaxLength(20)
  approvedAmount?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  capOverrideReason?: string
}

class ResubmitDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>
}

// إغلاق طلب معتمد تعذّر تنفيذه بالرفض — السبب إلزامي ويُكتب في سجل التدقيق
class RejectExecutionDto {
  @IsString({ message: 'اكتب سبب الرفض' })
  @MinLength(3, { message: 'اكتب سبب الرفض (3 أحرف على الأقل)' })
  @MaxLength(900)
  comment: string
}

class RejectCustodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  reason: string
}

class AdjustLeaveBalanceDto {
  @Matches(/^[a-z][a-z0-9_]{1,49}$/)
  balanceType: string

  @Matches(/^\d{4}$/)
  period: string

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  delta: number

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason: string

  @IsUUID()
  idempotencyKey: string

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  expectedRemaining?: number
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
    private readonly balances: LeaveBalancesService,
    @InjectRepository(LeaveType)
    private readonly leaveTypes: Repository<LeaveType>,
    private readonly employees: EmployeesService
  ) {}

  // كتالوج الأنواع — مفلتر بجمهور كل نوع للمستخدم الحالي
  @Get('requests/types')
  catalog(@CurrentUser() user: JwtPayload) {
    return this.service.catalog(user)
  }

  // أنواع الإجازة الفعّالة لشاشات التقديم (خدمة ذاتية — أي مستخدم مسجّل).
  // حقول العرض فقط؛ الإدارة الكاملة تبقى على /settings/leave-types (settings.manage)
  // نوع الإجازة الخاص بفرع يظهر لفرعه بس (قرار المالك 16 سبتمبر): حساب الفرع = العام + فرعه،
  // والحساب العام = الكل أو (مع ?branchId=) العام + فرع الموظف اللي بيقدّم له
  @Get(['requests/leave-types', 'leaves/types'])
  async activeLeaveTypes(@CurrentUser() user: JwtPayload, @Query('branchId') branchIdRaw?: string) {
    return (await this.leaveTypes.find({
      where: definitionBranchWhere<LeaveType>(user, { isActive: true }, definitionBranchQuery(branchIdRaw)),
      select: {
        id: true,
        branchId: true,
        code: true,
        nameAr: true,
        isPaid: true,
        balanceType: true,
        requiredAttachment: true,
        maxDays: true,
        oncePerService: true,
        // قواعد الطلب — للتلميح ونص اليوم في شاشات التقديم (السيرفر هو اللي بيفرضها)
        category: true,
        minDaysPerRequest: true,
        noticeDays: true,
        backdateAllowed: true,
        backdateMaxDays: true,
        countingMode: true,
        halfDayAllowed: true,
        fixedDays: true,
        maxTimesPerYear: true,
        attachmentRule: true,
        attachmentAboveDays: true,
        attachmentTiming: true,
        attachmentDeadlineDays: true,
      },
      order: { id: 'ASC' },
    })).map(leaveTypeView)
  }

  // أرصدة كل موظفي النطاق دفعة واحدة لشاشة الأرصدة (LEV-23) — كانت بتنادي
  // leave-balances/:employeeId لكل موظف وتبلع الفشل كأنه «بلا رصيد».
  // branchId اختياري؛ المقيَّد بفرعه مايطلبش فرع تاني. قبل ':id' عشان مايلتقطهوش
  @Perm('leaves.view_all', 'employees.view')
  @Get(['requests/leave-balances', 'leaves/balances'])
  bulkBalances(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchIdRaw?: string
  ) {
    const scope = branchScopeOf(user)
    if (branchIdRaw == null || branchIdRaw === '') {
      return this.balances.bulkBalances(scope)
    }
    const branchId = Number(branchIdRaw)
    if (!Number.isInteger(branchId) || branchId <= 0) {
      throw new BadRequestException('رقم الفرع غير صالح')
    }
    if (!inBranchScope(scope, branchId)) {
      throw new ForbiddenException('الفرع خارج نطاق صلاحيتك')
    }
    return this.balances.bulkBalances(branchId)
  }

  // أرصدة إجازاتي بالطبقات (افتتاحي مُرحّل + استحقاق السنة)
  @Get(['requests/leave-balances/mine', 'leaves/balances/mine'])
  myBalances(@CurrentUser() user: JwtPayload) {
    return user.employeeId ? this.balances.allBalances(user.employeeId) : []
  }

  @Perm('leaves.view_all', 'employees.view')
  @Get(['requests/leave-balances/:employeeId', 'leaves/balances/:employeeId'])
  async employeeBalances(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId', ParseIntPipe) employeeId: number
  ) {
    // نطاق الفرع: موظف خارج فرع المستخدم = 404 (نفس فحص ملف الموظف) — SEC-LEV-1
    await this.employees.findOne(employeeId, branchScopeOf(user))
    return this.balances.allBalances(employeeId)
  }

  // الترحيل السنوي: متبقي السنة → طبقة افتتاحية بصلاحية للسنة الجديدة
  @Perm('leave_balances.manage')
  @Post(['requests/leave-balances/:employeeId/adjust', 'leaves/balances/:employeeId/adjust'])
  adjustBalance(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: AdjustLeaveBalanceDto
  ) {
    return this.balances.adjust(employeeId, dto, user.sub, branchScopeOf(user))
  }

  @Perm('leave_balances.manage')
  @Get(['requests/leave-balances/:employeeId/adjustments', 'leaves/balances/:employeeId/adjustments'])
  async balanceAdjustments(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('period') period?: string
  ) {
    await this.employees.findOne(employeeId, branchScopeOf(user))
    return this.balances.adjustmentHistory(employeeId, period)
  }

  @Perm('leave_balances.manage')
  @Post(['requests/leave-balances/rollover/:fromPeriod', 'leaves/balances/rollover/:fromPeriod'])
  rollover(@CurrentUser() user: JwtPayload, @Param('fromPeriod') fromPeriod: string) {
    // فصل الفروع: HR الفرع لا يرحّل أرصدة فروع أخرى
    return this.balances.rollover(fromPeriod, branchScopeOf(user))
  }

  // «طلباتي»: طلبات صاحب الحساب. شاشة «طلباتي» وحدها تطلب معها ما قدّمه نيابةً
  // عن غيره (includeOnBehalf=1) — الشاشات الشخصية الأخرى تبقى على طلباته هو
  @Get('requests/mine')
  mine(@CurrentUser() user: JwtPayload, @Query('includeOnBehalf') includeOnBehalf?: string) {
    return this.service.mine(user, {
      includeOnBehalf: includeOnBehalf === '1' || includeOnBehalf === 'true',
    })
  }

  // إجازاتي المعتمدة — لمنتقي «إلغاء/تعديل إجازة» (خدمة ذاتية)
  @Get(['requests/my-leaves', 'leaves/mine'])
  myLeaves(@CurrentUser() user: JwtPayload, @Query('employeeId') employeeId?: string) {
    // employeeId: إجازات موظف تاني لطلب إلغاء نيابةً عنه (الصلاحية والنطاق بيتفحصوا في الخدمة)
    const target = employeeId && /^\d+$/.test(employeeId) ? Number(employeeId) : undefined
    return this.service.myApprovedLeaves(user, target)
  }

  // السجل الكامل — كونسول HR (بنطاق الفرع)
  @Perm('requests.view_all')
  @Get('requests/all')
  listAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('typeCode') typeCode?: string
  ) {
    return this.service.listAll(user, { status, typeCode })
  }

  @Get('requests/my-decisions')
  myDecisions(@CurrentUser() user: JwtPayload, @Query('before') before?: string) {
    return this.service.myDecisions(user, before)
  }

  // صندوق الموافقات: المنتظر فعلي حسب دوره
  @Get('requests/inbox')
  inbox(@CurrentUser() user: JwtPayload) {
    return this.service.inbox(user)
  }

  @Get('requests/:id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.detail(user, id)
  }

  @Post('requests')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.service.create(user, dto)
  }

  @Post('requests/:id/submit')
  submit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.submit(user, id)
  }

  @Post('requests/:id/act')
  act(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActDto
  ) {
    return this.service.act(user, id, dto)
  }

  @Post('requests/:id/resubmit')
  resubmit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResubmitDto
  ) {
    return this.service.resubmit(user, id, dto.payload)
  }

  @Post('requests/:id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.cancel(user, id)
  }

  // طلب معتمد تعذّر تنفيذه في وجهته (REQ-2): إعادة التنفيذ أو الإغلاق بالرفض —
  // للإدارة بنطاق فرعها
  @Perm('settings.manage')
  @Post('requests/:id/retry-execution')
  retryExecution(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.retryExecution(user, id)
  }

  @Perm('settings.manage')
  @Post('requests/:id/reject-execution')
  rejectExecution(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectExecutionDto
  ) {
    return this.service.rejectFailedExecution(user, id, dto.comment)
  }

  // تأكيد استلام العهدة (الموظف) → بانتظار اعتماد المدير
  @Post(['requests/custody/:assignmentId/acknowledge', 'custody/:assignmentId/acknowledge'])
  acknowledge(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.acknowledgeCustody(user, assignmentId)
  }

  // الموظف يعلّم «سلّمت العهدة» → مسؤول العهد يؤكد الاستلام والحالة
  @Post(['requests/custody/:assignmentId/reject', 'custody/:assignmentId/reject'])
  rejectCustody(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: RejectCustodyDto
  ) {
    return this.service.rejectCustody(user, assignmentId, dto.reason)
  }

  @Post(['requests/custody/:assignmentId/handover', 'custody/:assignmentId/handover'])
  handover(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.requestCustodyHandover(user, assignmentId)
  }

  // نقل عهدة نشطة لموظف آخر (أمين العهدة) → المستلم يقبل ثم مديره يؤكد
  @Post(['requests/custody/:assignmentId/transfer', 'custody/:assignmentId/transfer'])
  transfer(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: TransferCustodyDto
  ) {
    return this.service.transferCustody(
      user,
      assignmentId,
      dto.toEmployeeId,
      dto.note
    )
  }

  // اعتماد المدير المباشر → العهدة ACTIVE (الملزِم قانونياً)
  @Post(['requests/custody/:assignmentId/manager-confirm', 'custody/:assignmentId/manager-confirm'])
  managerConfirm(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.managerConfirmCustody(user, assignmentId)
  }

  // تشغيل يدوي لمحركي التصعيد والنقل المجدول (للأدمن — والـ cron يشغلهما تلقائياً)
  @Perm('settings.manage')
  @Post('requests/engine/run-escalations')
  runEscalations() {
    return this.service.runEscalations()
  }

  @Perm('settings.manage')
  @Post('requests/engine/run-scheduled-transfers')
  runScheduledTransfers() {
    return this.service.runScheduledTransfers()
  }

  // توجيه الأوفرتايم المكتشف لسلسلته يدوياً (الـ cron يشغّله كل 3 دقائق)
  @Perm('attendance.manage', 'overtime.confirm')
  @Post('requests/engine/reconcile-overtime')
  reconcileOvertime() {
    return this.service.reconcileAutoOvertime()
  }
}
