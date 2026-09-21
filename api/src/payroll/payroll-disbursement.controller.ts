import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { Allow, ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PAYROLL_DISBURSE_BULK_MAX, PAYROLL_DISBURSE_PERMISSION, type PayrollDisbursementState } from './payroll-disbursement'
import { PayrollDisbursementService } from './payroll-disbursement.service'

const STATES: PayrollDisbursementState[] = ['PAID', 'UNPAID', 'SETTLEMENT', 'NO_AMOUNT']

class PayrollDisbursementFilterDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) departmentId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) teamId?: number
  @IsOptional() @IsString() @MaxLength(20) payMethod?: string
  @IsOptional() @IsIn(STATES) state?: PayrollDisbursementState
  @IsOptional() @IsString() @MaxLength(100) search?: string
}

// الملاحظة يُتحقق منها في الخدمة برسالة عربية
class PayrollDisbursementMarkDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(PAYROLL_DISBURSE_BULK_MAX) @ArrayUnique() @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) itemIds: number[]
  @IsBoolean() paid: boolean
  @IsOptional() @Allow() note?: unknown
  // فلاتر الشاشة الحالية: الرد بيرجع بنفس العرض المفلتر
  @IsOptional() @ValidateNested() @Type(() => PayrollDisbursementFilterDto) filter?: PayrollDisbursementFilterDto
}

class PayrollDisbursementMarkFilteredDto {
  @IsBoolean() paid: boolean
  @IsOptional() @Allow() note?: unknown
  @Type(() => Number) @IsInt() @Min(1) expectedCount: number
  @IsOptional() @ValidateNested() @Type(() => PayrollDisbursementFilterDto) filter?: PayrollDisbursementFilterDto
}

class PayrollDisbursementSummaryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' }) period?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) runId?: number
}

// صرف الرواتب موظف بموظف. القراءة لحامل payroll.disburse أو payroll.view، والتعليم لحامل payroll.disburse وحده.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/disbursement')
export class PayrollDisbursementController {
  constructor(private readonly service: PayrollDisbursementService) {}

  @Perm(PAYROLL_DISBURSE_PERMISSION, 'payroll.view')
  @Get('runs')
  runs(@CurrentUser() user: JwtPayload) {
    return this.service.runs(user)
  }

  // ملخص الصرف للمالك: ?runId= لمسير أو ?period=YYYY-MM لكل مسيرات الشهر
  @Perm(PAYROLL_DISBURSE_PERMISSION, 'payroll.view')
  @Get('summary')
  summary(@CurrentUser() user: JwtPayload, @Query() query: PayrollDisbursementSummaryDto) {
    return this.service.summary(user, query)
  }

  @Perm(PAYROLL_DISBURSE_PERMISSION, 'payroll.view')
  @Get('runs/:id')
  view(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Query() filter: PayrollDisbursementFilterDto) {
    return this.service.view(user, id, filter)
  }

  @Perm(PAYROLL_DISBURSE_PERMISSION)
  @Post('runs/:id/mark')
  mark(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollDisbursementMarkDto) {
    return this.service.mark(user, id, dto, dto.filter ?? {})
  }

  @Perm(PAYROLL_DISBURSE_PERMISSION)
  @Post('runs/:id/mark-filtered')
  markFiltered(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollDisbursementMarkFilteredDto) {
    return this.service.markFiltered(user, id, dto, dto.filter ?? {})
  }
}
