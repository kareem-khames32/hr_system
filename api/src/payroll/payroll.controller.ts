import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
  IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'
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
