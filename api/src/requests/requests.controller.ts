import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, Roles, RolesGuard, userHasPerm } from '../auth/guards'
import { LeaveBalancesService } from './leave-balances.service'
import { RequestsService } from './requests.service'

class CreateRequestDto {
  @IsString()
  typeCode: string

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
}

class ResubmitDto {
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly service: RequestsService,
    private readonly balances: LeaveBalancesService
  ) {}

  // كتالوج الأنواع — مفلتر بجمهور كل نوع للمستخدم الحالي
  @Get('types')
  catalog(@CurrentUser() user: JwtPayload) {
    return this.service.catalog(user)
  }

  // أرصدة إجازاتي بالطبقات (افتتاحي مُرحّل + استحقاق السنة)
  @Get('leave-balances/mine')
  myBalances(@CurrentUser() user: JwtPayload) {
    return user.employeeId ? this.balances.allBalances(user.employeeId) : []
  }

  @Perm('leaves.view_all', 'employees.view')
  @Get('leave-balances/:employeeId')
  employeeBalances(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.balances.allBalances(employeeId)
  }

  // الترحيل السنوي: متبقي السنة → طبقة افتتاحية بصلاحية للسنة الجديدة
  @Perm('leave_balances.manage')
  @Post('leave-balances/rollover/:fromPeriod')
  rollover(@Param('fromPeriod') fromPeriod: string) {
    return this.balances.rollover(fromPeriod)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  // إجازاتي المعتمدة — لمنتقي «إلغاء/تعديل إجازة» (خدمة ذاتية)
  @Get('my-leaves')
  myLeaves(@CurrentUser() user: JwtPayload) {
    return this.service.myApprovedLeaves(user)
  }

  // السجل الكامل — كونسول HR (بنطاق الفرع)
  @Perm('requests.view_all')
  @Get('all')
  listAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('typeCode') typeCode?: string
  ) {
    return this.service.listAll(user, { status, typeCode })
  }

  // صندوق الموافقات: المنتظر فعلي حسب دوره
  @Get('inbox')
  inbox(@CurrentUser() user: JwtPayload) {
    return this.service.inbox(user)
  }

  @Get(':id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.detail(user, id)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRequestDto) {
    return this.service.create(user, dto)
  }

  @Post(':id/submit')
  submit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.submit(user, id)
  }

  @Post(':id/act')
  act(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActDto
  ) {
    return this.service.act(user, id, dto)
  }

  @Post(':id/resubmit')
  resubmit(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResubmitDto
  ) {
    return this.service.resubmit(user, id, dto.payload)
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.cancel(user, id)
  }

  // تأكيد استلام العهدة (الموظف) → بانتظار اعتماد المدير
  @Post('custody/:assignmentId/acknowledge')
  acknowledge(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.acknowledgeCustody(user, assignmentId)
  }

  // الموظف يعلّم «سلّمت العهدة» → مسؤول العهد يؤكد الاستلام والحالة
  @Post('custody/:assignmentId/handover')
  handover(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.requestCustodyHandover(user, assignmentId)
  }

  // اعتماد المدير المباشر → العهدة ACTIVE (الملزِم قانونياً)
  @Post('custody/:assignmentId/manager-confirm')
  managerConfirm(
    @CurrentUser() user: JwtPayload,
    @Param('assignmentId', ParseIntPipe) assignmentId: number
  ) {
    return this.service.managerConfirmCustody(user, assignmentId)
  }

  // تشغيل يدوي لمحركي التصعيد والنقل المجدول (للأدمن — والـ cron يشغلهما تلقائياً)
  @Perm('settings.manage')
  @Post('engine/run-escalations')
  runEscalations() {
    return this.service.runEscalations()
  }

  @Perm('settings.manage')
  @Post('engine/run-scheduled-transfers')
  runScheduledTransfers() {
    return this.service.runScheduledTransfers()
  }
}
