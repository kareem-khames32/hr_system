import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ALLOWANCE_MAX_EMPLOYEES, ALLOWANCE_TARGET_LEVELS } from './allowances-grants'
import { PayrollRecurringAllowancesService } from './recurring-allowances.service'

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/
// شهر اختياري: YYYY-MM أو فاضي
const OPTIONAL_PERIOD = /^(\d{4}-(0[1-9]|1[0-2]))?$/

class RecurringAllowancePeriodQuery {
  @Matches(PERIOD, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
}

class CreateRecurringAllowanceDto {
  @Type(() => Number) @IsInt({ message: 'اختار نوع البدل' }) @Min(1, { message: 'اختار نوع البدل' }) allowanceTypeId: number
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value)) @IsString({ message: 'اكتب مبلغ البدل' }) @MaxLength(20) amount: string
  @IsIn([...ALLOWANCE_TARGET_LEVELS], { message: 'اختار على مين' }) targetLevel: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number | null
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) departmentIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) teamIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) employeeIds?: number[]
  @Matches(PERIOD, { message: 'اختار شهر البداية بصيغة YYYY-MM' }) fromPeriod: string
  @IsOptional() @IsString() @Matches(OPTIONAL_PERIOD, { message: 'شهر النهاية بصيغة YYYY-MM أو سيبه فاضي' }) untilPeriod?: string | null
  @IsString() @MaxLength(500, { message: 'السبب أطول من 500 حرف' }) reason: string
}

class StopRecurringAllowanceDto {
  @IsString() @MaxLength(500, { message: 'السبب أطول من 500 حرف' }) reason: string
  @IsOptional() @IsString() @Matches(OPTIONAL_PERIOD, { message: 'شهر الإيقاف بصيغة YYYY-MM أو سيبه فاضي' }) fromPeriod?: string | null
}

// «البدل الثابت الشهري» في «تابة البدلات» — نفس صلاحيات التابة: العرض بـpayroll.view، والإسناد والإيقاف بـpayroll.calculate،
// والنطاق (فرع الموظف) في الخدمة
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/allowances/recurring')
export class PayrollRecurringAllowancesController {
  constructor(private readonly service: PayrollRecurringAllowancesService) {}

  @Perm('payroll.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: RecurringAllowancePeriodQuery) {
    return this.service.list(user, query.period)
  }

  @Perm('payroll.calculate')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecurringAllowanceDto) {
    return this.service.create(user, dto)
  }

  @Perm('payroll.calculate')
  @Post(':id/stop')
  stop(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: StopRecurringAllowanceDto) {
    return this.service.stop(user, id, dto)
  }
}
