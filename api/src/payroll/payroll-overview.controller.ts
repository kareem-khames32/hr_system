import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { DEDUCTION_WAIVER_KINDS, DEDUCTION_WAIVER_LEVELS } from './payroll-deduction-waivers'
import { PayrollOverviewService } from './payroll-overview.service'

class OverviewPeriodQuery {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
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
  included(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.included(user, query.period)
  }

  @Perm('payroll.view')
  @Get('unassigned')
  unassigned(@CurrentUser() user: JwtPayload, @Query() query: OverviewPeriodQuery) {
    return this.service.unassigned(user, query.period)
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
