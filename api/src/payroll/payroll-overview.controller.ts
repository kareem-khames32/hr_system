import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { DEDUCTION_WAIVER_KINDS, DEDUCTION_WAIVER_LEVELS } from './payroll-deduction-waivers'
import { PAYROLL_MEMBERSHIP_VIEWS } from './payroll-overview-filters'
import { PayrollOverviewService } from './payroll-overview.service'

class OverviewPeriodQuery {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
}

/**
 * فلاتر تبويبي «المدرجين بالمسير» و«موظفين ليس لديهم مسير» والجدول الموحد (طلب المالك 20 سبتمبر).
 * كل فلتر اختياري؛ القيم غير الصالحة تسقط في normalizePayrollOverviewFilters بلا رفض الطلب.
 */
class OverviewRosterQuery extends OverviewPeriodQuery {
  @IsOptional() @IsString() @MaxLength(200) search?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) departmentId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamId?: number
  @IsOptional() @IsString() @MaxLength(200) jobTitle?: string
  /** حالات الموظف مفصولة بفاصلة: active,probation,suspended… */
  @IsOptional() @IsString() @MaxLength(200) statuses?: string
  @IsOptional() @IsString() @MaxLength(10) hiredFrom?: string
  @IsOptional() @IsString() @MaxLength(10) hiredTo?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) runId?: number
  @IsOptional() @IsString() @MaxLength(60) reasonCode?: string
  @IsOptional() @IsIn([...PAYROLL_MEMBERSHIP_VIEWS], { message: 'المنظور: الكل أو المدرجين أو بلا مسير' }) membership?: string
}

class CreateDeductionWaiverDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
  @IsIn([...DEDUCTION_WAIVER_KINDS], { message: 'اختار نوع الخصم' }) kind: string
  @IsIn([...DEDUCTION_WAIVER_LEVELS], { message: 'اختار على مين' }) targetLevel: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number | null
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsInt({ each: true }) departmentIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsInt({ each: true }) teamIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(5000) @IsInt({ each: true }) employeeIds?: number[]
  @IsString() @MaxLength(500, { message: 'السبب أطول من 500 حرف' }) reason: string
}

// تبويبات شاشة المسير (المدرجين، بلا مسير، التضارب، الاستقطاعات) و«شيل خصم» — بنطاق الفرع في الخدمة
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/overview')
export class PayrollOverviewController {
  constructor(private readonly service: PayrollOverviewService) {}

  @Perm('payroll.view')
  @Get('included')
  included(@CurrentUser() user: JwtPayload, @Query() query: OverviewRosterQuery) {
    return this.service.included(user, query.period, query)
  }

  @Perm('payroll.view')
  @Get('unassigned')
  unassigned(@CurrentUser() user: JwtPayload, @Query() query: OverviewRosterQuery) {
    return this.service.unassigned(user, query.period, query)
  }

  // الجدول الموحد: كل موظفي الشهر في جدول واحد بعمود «المسير» ومنظور «الكل / المدرجين / بلا مسير»
  @Perm('payroll.view')
  @Get('roster')
  roster(@CurrentUser() user: JwtPayload, @Query() query: OverviewRosterQuery) {
    return this.service.roster(user, query.period, query)
  }

  // وجهات النقل: المسيرات المفتوحة في الشهر بفترتها ومعادلتها (لقائمة نافذة «نقل لمسير…»)
  @Perm('payroll.view')
  @Get('run-targets')
  runTargets(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.runTargets(user, query.period)
  }

  @Perm('payroll.view')
  @Get('conflicts')
  conflicts(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.conflicts(user, query.period)
  }

  @Perm('payroll.view')
  @Get('deductions')
  deductions(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.deductions(user, query.period)
  }

  // كل بنود الاستحقاق والاستقطاع لكل موظف في مسيرات الشهر بأسمائها (تابتي «البدلات» و«الاستقطاعات»)
  @Perm('payroll.view')
  @Get('lines')
  lines(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.itemLines(user, query.period)
  }

  @Perm('payroll.view')
  @Get('waivers')
  waivers(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.listWaivers(user, query.period)
  }

  @Perm('payroll.calculate')
  @Post('waivers')
  createWaiver(@CurrentUser() user: JwtPayload, @Body() dto: CreateDeductionWaiverDto) {
    return this.service.createWaiver(user, dto)
  }

  @Perm('payroll.calculate')
  @Post('waivers/:id/cancel')
  cancelWaiver(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelWaiver(user, id)
  }
}
