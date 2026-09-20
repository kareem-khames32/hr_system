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
  Allow,
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

  // الخطوة 19: تحديث لقطة السياسة صراحةً ببصمة الإعدادات الحالية
  @IsOptional() @IsBoolean() refreshPolicySnapshot?: boolean
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) expectedPolicySnapshotHash?: string
}

class CalculateDefinedDto {
  @IsOptional() @IsBoolean() refreshPolicySnapshot?: boolean
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) expectedPolicySnapshotHash?: string

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
  // قائمة الإضافة الدائمة: أسماء مضمومة للمسير فوق فلاتره — تُعاد كما هي عند تعديل التعريف حتى لا تسقط العضوية
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) includeEmployeeIds?: number[]
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
  // السبب يُتحقق في الخدمة (PAYRUN-REASON-001 برسالة عربية)، لا بنص class-validator الإنجليزي.
  @IsOptional() @Allow() reason?: unknown
  // الخطوة 19: «تحديث لقطة السياسة» صريح ومعه بصمة الإعدادات الحالية التي عُرضت فروقها
  @IsOptional() @IsBoolean() refreshPolicySnapshot?: boolean
  @IsOptional() @Matches(/^[a-f0-9]{64}$/, { message: 'اعرض فروق لقطة السياسة أولًا ثم أعد المحاولة' }) expectedPolicySnapshotHash?: string
}

// ===== الخطوة 20 / D13: وضع محرك الحساب وأسباب فروق التكافؤ =====
class PayrollParityExplanationDto {
  // فرق واحد: موظف + بند؛ أو مجموعة: رمز سبب النظام وحده (كل فرق أو قيمة غائبة بنفس الرمز في تقرير النسخة الحالية) — الخدمة ترفض الخلط
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number
  @IsOptional() @IsString() @MaxLength(30) component?: string
  @IsOptional() @Matches(/^[A-Z][A-Z0-9_]{2,79}$/, { message: 'رمز سبب النظام غير صالح' }) reasonCode?: string
  @Allow() reason?: unknown
}
class PayrollParityExplanationsDto {
  @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => PayrollParityExplanationDto) explanations: PayrollParityExplanationDto[]
}
class PayrollEngineModeDto {
  @IsIn(['LEGACY', 'SHADOW', 'POLICY']) mode: 'LEGACY' | 'SHADOW' | 'POLICY'
  @Allow() reason?: unknown
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => PayrollParityExplanationDto) explanations?: PayrollParityExplanationDto[]
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

// ===== الخطوة 22 (B5): قيد الصرف واستبعاد موظف لحل تعارض =====
// القناة والمرجع يُتحقق منهما في الخدمة بعد الصلاحية والحالة (PAYRUN-STATE قبل أي رسالة حقول)، برسائل عربية.
class PayrollPayDto {
  @IsOptional() @Allow() channel?: unknown
  @IsOptional() @Allow() reference?: unknown
}

class PayrollMemberExclusionDto {
  @Type(() => Number) @IsInt() @Min(1) employeeId: number
  @Allow() reason?: unknown
  @IsOptional() @IsBoolean() allowDraftConflicts?: boolean
}

// قرار المالك (20 سبتمبر): «أضفهم لمسير…» و«نقل لمسير آخر» — عضوية دائمة من شهر المسير وما بعده.
// السبب يُتحقق في الخدمة برمز عربي (PAYRUN-MEMBERSHIP-REASON) لا بنص class-validator.
class PayrollRunMembersDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(500) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) employeeIds: number[]
  @Allow() reason?: unknown
  // المسير الذي يخرج منه الموظف (النقل)؛ بدونه = إضافة من «موظفين ليس لديهم مسير»
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) fromRunId?: number
  @IsOptional() @IsBoolean() allowDraftConflicts?: boolean
}

class PayrollEmployeeRunsQueryDto {
  @Type(() => Number) @IsInt() @Min(1) employeeId: number
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
}

// الخطوة 23 (B5، تصحيح المراجعة): مسير تجريبي لا يُحتسب في فترة التكافؤ — القرار والسبب (يُتحقق من السبب في الخدمة برمز عربي)
class PayrollParityCountingDto {
  @IsBoolean() counts: boolean
  @Allow() reason?: unknown
}

// «إنشاء مسيرات الشهر الجديد»: شهر المصدر اختياري (الافتراضي آخر شهر فيه مسير اتحسب)
class PayrollNextPeriodDto {
  @IsOptional() @IsBoolean() dryRun?: boolean
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) sourcePeriod?: string
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

  // طلب المالك 19 سبتمبر: بنود الاستحقاقات والاستقطاعات لكل موظف بأسمائها (قراءة فقط، مجموعها = أعمدة البند المحفوظة)
  @Perm('payroll.view')
  @Get('runs/:id/lines')
  lines(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.runLines(user, id)
  }

  // «إنشاء مسيرات الشهر الجديد»: مسودة لكل مسير عادي في شهر المصدر بنفس تعريفه (dryRun = المعاينة بلا حفظ)
  @Perm('payroll.calculate')
  @Post('runs/create-next-period')
  createNextPeriod(@CurrentUser() user: JwtPayload, @Body() dto: PayrollNextPeriodDto) {
    return this.service.createNextPeriodRuns(user, dto)
  }

  // المسار القديم: إنشاء/إعادة حساب مسير فرع لفترة في نداء واحد — مغلق على قاعدة الشركة (410 PAYRUN-LEGACY-ENDPOINT)،
  // ويبقى لقواعد الاختبار المؤقتة فقط؛ «مسير جديد» = POST runs ثم runs/:id/calculate أو runs/:id/recalculate.
  @Perm('payroll.calculate')
  @Post('runs/calculate')
  calculate(@CurrentUser() user: JwtPayload, @Body() dto: CalculateDto) {
    this.service.assertLegacyCalculateEndpoint()
    return this.service.calculate(user, dto.branchId, dto.period, dto)
  }

  // المسار القديم: مسير بنطاق (شركة/فرع/قسم/فريق/مركز تكلفة/مخصّص) بلا مسودة ولا نسخة سياسة — مغلق على قاعدة الشركة كذلك.
  @Perm('payroll.calculate')
  @Post('runs/calculate-defined')
  calculateDefined(@CurrentUser() user: JwtPayload, @Body() dto: CalculateDefinedDto) {
    this.service.assertLegacyCalculateEndpoint()
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

  // الخطوة 19: لقطة السياسة المحفوظة على المسير مقابل الإعدادات الحالية وفروقهما (قراءة فقط)
  @Perm('payroll.view')
  @Get('runs/:id/policy-snapshot')
  policySnapshot(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.policySnapshotView(user, id)
  }

  // الخطوة 20 / D13: أسباب مكتوبة لفروق التكافؤ ثم تحويل وضع المحرك — حامل payroll.approve
  @Perm('payroll.approve')
  @Post('runs/:id/parity-explanations')
  explainParity(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollParityExplanationsDto) {
    return this.service.explainParityDifferences(user, id, dto.explanations)
  }

  @Perm('payroll.approve')
  @Post('runs/:id/engine-mode')
  engineMode(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollEngineModeDto) {
    return this.service.setEngineMode(user, id, dto)
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

  // الخطوة 22 (B5): الصرف يسجل من صرف وقناة الصرف ومرجعه؛ صرف مسير غير معتمد ← PAYRUN-STATE-001
  @Perm('payroll.pay')
  @Post('runs/:id/pay')
  pay(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollPayDto) {
    return this.service.pay(user, id, dto)
  }

  // الخطوة 22 (B5): حل تعارض من الشاشة — استبعاد الموظف من هذا المسير بسبب (المسودة: في تعريفها؛ المحسوب: بإعادة حساب)
  @Perm('payroll.calculate')
  @Post('runs/:id/member-exclusions')
  excludeMember(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollMemberExclusionDto) {
    return this.service.excludeRunMember(user, id, dto)
  }

  // قرار المالك (20 سبتمبر): ضم موظفين لمسير (أو نقلهم إليه من مسير آخر) عضوية دائمة من شهر المسير وما بعده
  @Perm('payroll.calculate')
  @Post('runs/:id/members')
  addMembers(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollRunMembersDto) {
    return this.service.changeRunMembership(user, id, dto)
  }

  // مسير الموظف في شهر والمسيرات المفتوحة التي يمكن نقله إليها (لملف الموظف ولنافذة النقل) — قراءة فقط
  @Perm('payroll.view')
  @Get('employee-runs')
  employeeRuns(@CurrentUser() user: JwtPayload, @Query() query: PayrollEmployeeRunsQueryDto) {
    return this.service.employeeRunMembership(user, query.employeeId, query.period)
  }

  // الخطوة 23 (B5): فترة التكافؤ التشغيلية (خمسة أشهر) من المسيرات المعتمدة والمصروفة — قراءة فقط
  @Perm('payroll.view')
  @Get('parity-history')
  parityHistory(@CurrentUser() user: JwtPayload) {
    return this.service.parityHistory(user)
  }

  // الخطوة 23 (تصحيح المراجعة): تعليم مسير تجريبي «لا يُحتسب» في فترة التكافؤ أو إعادته — حامل الاعتماد بنطاق الفرع، بسبب وحدث
  @Perm('payroll.approve')
  @Post('runs/:id/parity-counting')
  parityCounting(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollParityCountingDto) {
    return this.service.setParityCounting(user, id, dto)
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
