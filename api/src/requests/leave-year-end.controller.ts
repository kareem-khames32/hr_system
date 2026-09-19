import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { LeaveYearEndService } from './leave-year-end.service'

class CloseLeaveYearDto {
  // فاضي = الشركة كلها (مدير النظام)؛ حساب الفرع على فرعه بس
  @IsOptional()
  @IsInt({ message: 'الفرع غير صحيح' })
  branchId?: number | null
}

class SettleLeaveBalanceDto {
  @IsIn(['PAID', 'ZEROED'], { message: 'التسوية: صرف بدل أو تصفير بس' })
  mode: 'PAID' | 'ZEROED'

  @IsString({ message: 'سبب التسوية مطلوب' })
  @MinLength(3, { message: 'سبب التسوية 3 حروف على الأقل' })
  @MaxLength(500)
  reason: string

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'شهر المسير بصيغة YYYY-MM' })
  payrollPeriod?: string | null

  // الأيام اللي ظاهرة في الشاشة — لو الرصيد اتغير في النص = تعارض
  @IsOptional()
  @IsNumber({}, { message: 'عدد الأيام رقم' })
  expectedDays?: number

  @IsUUID('all', { message: 'مفتاح العملية غير صالح' })
  idempotencyKey: string
}

// إقفال سنة الإجازات: المعاينة لمن يشوف الأرصدة، والتسوية والإقفال لإدارة الأرصدة
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leaves/year-end')
export class LeaveYearEndController {
  constructor(private readonly service: LeaveYearEndService) {}

  @Perm('leave_balances.manage', 'leaves.view_all')
  @Get(':year')
  preview(@CurrentUser() user: JwtPayload, @Param('year') year: string, @Query('branchId') branchId?: string) {
    return this.service.preview(user, year, branchId)
  }

  // السجل فيه مبالغ البدل — لإدارة الأرصدة بس
  @Perm('leave_balances.manage')
  @Get(':year/settlements')
  history(
    @CurrentUser() user: JwtPayload,
    @Param('year') year: string,
    @Query('employeeId') employeeId?: string,
    @Query('branchId') branchId?: string
  ) {
    return this.service.history(user, year, employeeId, branchId)
  }

  @Perm('leave_balances.manage')
  @Post(':year/close')
  close(@CurrentUser() user: JwtPayload, @Param('year') year: string, @Body() dto: CloseLeaveYearDto) {
    return this.service.close(user, year, dto?.branchId ?? undefined)
  }

  @Perm('leave_balances.manage')
  @Post(':year/settle/:employeeId')
  settle(
    @CurrentUser() user: JwtPayload,
    @Param('year') year: string,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: SettleLeaveBalanceDto
  ) {
    return this.service.settle(user, year, employeeId, dto)
  }
}
