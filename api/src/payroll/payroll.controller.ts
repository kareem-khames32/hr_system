import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  MaxLength,
  ArrayUnique,
  ArrayMaxSize,
  IsBoolean,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PayrollScopeType } from './payroll.entities'
import { PayrollService } from './payroll.service'

class CalculateDto {
  @IsOptional()
  @IsBoolean()
  refreshInstallmentPolicy?: boolean

  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId: number

  @Matches(/^\d{4}-\d{2}$/)
  period: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string

  @IsOptional()
  @IsBoolean()
  allowDraftConflicts?: boolean
}

class CalculateDefinedDto {
  @IsOptional()
  @IsBoolean()
  refreshInstallmentPolicy?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  runId?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @Matches(/^\d{4}-\d{2}$/)
  period: string

  @IsIn(['COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'COST_CENTER', 'CUSTOM'])
  scopeType: PayrollScopeType

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  scopeIds?: number[]

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  employeeIds?: number[]

  @IsOptional()
  @IsInt()
  @Min(1)
  branchId?: number

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string

  @IsOptional()
  @IsBoolean()
  allowDraftConflicts?: boolean

  // الخطوة 16: نطاق بلا موظفين يُقبل بتأكيد صريح وسبب فقط
  @IsOptional()
  @IsBoolean()
  confirmEmptyScope?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(500)
  emptyScopeReason?: string
}

// ===== الخطوة 16: تعريف المسير (فلاتر مترابطة + قائمة + استبعادات بسبب إجباري) =====
class PayrollRunFiltersDto {
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) branchIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) departmentIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) teamIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) employeeIds?: number[]
  @IsOptional() @IsBoolean() allEmployees?: boolean
}

class PayrollRunExclusionDto {
  @Type(() => Number) @IsInt() @Min(1) employeeId: number
  @IsString() @MaxLength(500) reason: string
}

class PayrollRunDefinitionFieldsDto {
  @IsOptional() @ValidateNested() @Type(() => PayrollRunFiltersDto) filters?: PayrollRunFiltersDto
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => PayrollRunExclusionDto) exclusions?: PayrollRunExclusionDto[]
  @IsOptional() @IsBoolean() confirmEmptyScope?: boolean
  @IsOptional() @IsString() @MaxLength(500) emptyScopeReason?: string
}

class PayrollRunDraftDto extends PayrollRunDefinitionFieldsDto {
  @IsString() @MaxLength(200) name: string
  @Type(() => Number) @IsInt() @Min(1) policyVersionId: number
  @Matches(/^\d{4}-\d{2}$/) period: string
}

class PayrollRunDraftUpdateDto extends PayrollRunDefinitionFieldsDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) policyVersionId?: number
  @IsOptional() @Matches(/^\d{4}-\d{2}$/) period?: string
}

class PayrollRunPreviewDto extends PayrollRunDefinitionFieldsDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string
  @Type(() => Number) @IsInt() @Min(1) policyVersionId: number
  @Matches(/^\d{4}-\d{2}$/) period: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) runId?: number
}

class PayrollRunCalculateDraftDto {
  @IsOptional() @IsBoolean() allowDraftConflicts?: boolean
  @IsOptional() @IsBoolean() refreshInstallmentPolicy?: boolean
}

class PayrollRunRecalculateDto extends PayrollRunCalculateDraftDto {
  @IsString() @MaxLength(500) reason: string
}

// ===== الخطوة 18: تقرير «موظفون بلا مسير» وإقراره =====
class PayrollUnassignedAckDto {
  @Matches(/^[a-f0-9]{64}$/, { message: 'أعد تحميل تقرير «موظفون بلا مسير» قبل الإقرار' }) reportHash: string
  @IsOptional() @IsString() @MaxLength(500) note?: string
}

class PayrollUnassignedQueryDto {
  @Matches(/^\d{4}-\d{2}$/) period: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) departmentId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamId?: number
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() includeSuspended?: boolean
}

class PayrollReasonDto {
  @IsString()
  @MaxLength(500)
  reason: string
}

// المسير محصور بأدوار الإدارة — الدورة الكاملة (محاسب → HR → مالي → تنفيذي) لاحقاً
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Perm('payroll.view')
  @Get('runs')
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  @Perm('payroll.view')
  @Get('runs/:id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user, id)
  }

  // إنشاء/إعادة حساب مسير فرع لفترة (23 → 22)
  @Perm('payroll.calculate')
  @Post('runs/calculate')
  calculate(@CurrentUser() user: JwtPayload, @Body() dto: CalculateDto) {
    return this.service.calculate(user, dto.branchId, dto.period, dto)
  }

  // مسير قابل للتعريف: اسم + فترة + نطاق (شركة/فرع/قسم/فريق/مركز تكلفة/مخصّص)
  @Perm('payroll.calculate')
  @Post('runs/calculate-defined')
  calculateDefined(@CurrentUser() user: JwtPayload, @Body() dto: CalculateDefinedDto) {
    return this.service.calculateDefined(user, dto)
  }

  // الخطوة 16: «مسير جديد» = مسودة تعريف (اسم + نسخة سياسة منشورة + فترة من دورتها + فلاتر + استبعادات)
  @Perm('payroll.calculate')
  @Post('runs')
  createDraft(@CurrentUser() user: JwtPayload, @Body() dto: PayrollRunDraftDto) {
    return this.service.createRunDraft(user, dto)
  }

  // الخطوة 17: معاينة عضوية تعريف لم يُحفظ — قراءة فقط
  @Perm('payroll.calculate')
  @Post('runs/membership-preview')
  previewDefinition(@CurrentUser() user: JwtPayload, @Body() dto: PayrollRunPreviewDto) {
    return this.service.previewRunDefinition(user, dto)
  }

  @Perm('payroll.calculate')
  @Patch('runs/:id')
  updateDraft(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollRunDraftUpdateDto) {
    return this.service.updateRunDraft(user, id, dto)
  }

  // الخطوة 17: معاينة عضوية التعريف المحفوظ — قراءة فقط
  @Perm('payroll.calculate')
  @Get('runs/:id/membership-preview')
  previewStored(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.previewStoredRun(user, id)
  }

  // «احتساب المسودة» منفصل عن «إعادة حساب مسير»
  @Perm('payroll.calculate')
  @Post('runs/:id/calculate')
  calculateDraft(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollRunCalculateDraftDto) {
    return this.service.calculateRunDraft(user, id, dto)
  }

  @Perm('payroll.calculate')
  @Post('runs/:id/recalculate')
  recalculate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollRunRecalculateDto) {
    return this.service.recalculateRun(user, id, dto)
  }

  // الخطوة 18: «موظفون بلا مسير» لفترة المسير، مع حالة الإقرار
  @Perm('payroll.view')
  @Get('runs/:id/unassigned')
  runUnassigned(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.runUnassignedReport(user, id)
  }

  // الإقرار يتطلب payroll.calculate أو payroll.approve (يُتحقق في الخدمة)
  @Perm('payroll.view')
  @Post('runs/:id/unassigned-ack')
  acknowledgeUnassigned(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollUnassignedAckDto) {
    return this.service.acknowledgeUnassigned(user, id, dto)
  }

  @Perm('payroll.view')
  @Get('unassigned-report')
  unassignedReport(@CurrentUser() user: JwtPayload, @Query() query: PayrollUnassignedQueryDto) {
    return this.service.unassignedReport(user, query)
  }

  @Perm('payroll.approve')
  @Post('runs/:id/approve')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.approve(user, id)
  }

  @Perm('payroll.pay')
  @Post('runs/:id/pay')
  pay(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.pay(user, id)
  }

  @Perm('payroll.reopen')
  @Post('runs/:id/reopen')
  reopen(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollReasonDto) {
    return this.service.reopen(user, id, dto.reason)
  }

  @Perm('payroll.cancel')
  @Post('runs/:id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollReasonDto) {
    return this.service.cancel(user, id, dto.reason)
  }

  @Perm('payroll.view')
  @Get('runs/:id/events')
  events(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.events(user, id)
  }

  // تقرير حالة الصرف (كاش/تحويل/فيزا) لسحب تقارير المصروف
  @Perm('payroll.view')
  @Get('runs/:id/pay-methods')
  payMethods(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.payMethodReport(user, id)
  }

  // قسيمة راتب — صاحبها يشوفها، وغيره يحتاج payroll.view
  @Get('items/:id')
  async payslip(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.payslip(user, id)
  }

  // قسائمي — بورتال الموظف (خدمة ذاتية بلا صلاحيات)
  @Get('my-payslips')
  myPayslips(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return []
    return this.service.payslipsOf(user.employeeId)
  }
}
