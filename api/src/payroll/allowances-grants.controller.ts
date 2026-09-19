import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ALLOWANCE_MAX_EMPLOYEES, ALLOWANCE_TARGET_LEVELS } from './allowances-grants'
import { PayrollAllowancesService } from './allowances-grants.service'

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

class AllowancePeriodQuery {
  @Matches(PERIOD, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
}

class CreateAllowanceTypeDto {
  @IsString() @MaxLength(120, { message: 'اسم البدل أطول من 120 حرف' }) name: string
  @IsOptional() @IsString() @MaxLength(40, { message: 'الكود أطول من 40 حرف' }) code?: string | null
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number | null
}

class UpdateAllowanceTypeDto {
  @IsOptional() @IsString() @MaxLength(120, { message: 'اسم البدل أطول من 120 حرف' }) name?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

class CreateAllowanceGrantDto {
  @Matches(PERIOD, { message: 'اختار الشهر بصيغة YYYY-MM' }) period: string
  @Type(() => Number) @IsInt({ message: 'اختار نوع البدل' }) @Min(1, { message: 'اختار نوع البدل' }) allowanceTypeId: number
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value)) @IsString({ message: 'اكتب مبلغ البدل' }) @MaxLength(20) amount: string
  @IsIn([...ALLOWANCE_TARGET_LEVELS], { message: 'اختار على مين' }) targetLevel: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) branchId?: number | null
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) departmentIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) teamIds?: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(ALLOWANCE_MAX_EMPLOYEES) @IsInt({ each: true }) employeeIds?: number[]
  @IsString() @MaxLength(500, { message: 'السبب أطول من 500 حرف' }) reason: string
}

// «تابة البدلات» في شاشة المسير — العرض بـpayroll.view، والإضافة والإلغاء بـpayroll.calculate، والنطاق (الفرع) في الخدمة
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/allowances')
export class PayrollAllowancesController {
  constructor(private readonly service: PayrollAllowancesService) {}

  @Perm('payroll.view')
  @Get('types')
  types(@CurrentUser() user: JwtPayload) {
    return this.service.listTypes(user)
  }

  @Perm('payroll.calculate')
  @Post('types')
  createType(@CurrentUser() user: JwtPayload, @Body() dto: CreateAllowanceTypeDto) {
    return this.service.createType(user, dto)
  }

  @Perm('payroll.calculate')
  @Patch('types/:id')
  updateType(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAllowanceTypeDto) {
    return this.service.updateType(user, id, dto)
  }

  @Perm('payroll.view')
  @Get('grants')
  grants(@CurrentUser() user: JwtPayload, @Query() query: AllowancePeriodQuery) {
    return this.service.listGrants(user, query.period)
  }

  @Perm('payroll.calculate')
  @Post('grants')
  createGrant(@CurrentUser() user: JwtPayload, @Body() dto: CreateAllowanceGrantDto) {
    return this.service.createGrant(user, dto)
  }

  @Perm('payroll.calculate')
  @Post('grants/:id/cancel')
  cancelGrant(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelGrant(user, id)
  }

  @Perm('payroll.calculate')
  @Post('lines/:id/cancel')
  cancelLine(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelLine(user, id)
  }
}
