import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import { Allow, ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { PayrollCorrectionsService } from './payroll-corrections.service'

// C8 / الخطوة 31: تصحيح المسير المصروف — العكس والمسير التكميلي وتقرير التسويات.
// السبب يُتحقق منه في الخدمة (رمز عربي PAYRUN-CORRECTION-REASON) لا بنص class-validator.
class PayrollReversalPreviewDto {
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ArrayUnique() @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) employeeIds?: number[]
}

class PayrollReversalCreateDto extends PayrollReversalPreviewDto {
  @IsOptional() @Allow() reason?: unknown
  @IsOptional() @Matches(/^[a-f0-9]{64}$/, { message: 'اعرض معاينة العكس أولًا ثم أكد الإنشاء' }) previewHash?: string
}

class PayrollSupplementaryCreateDto {
  @IsArray() @ArrayMinSize(1, { message: 'اختر موظفًا واحدًا على الأقل للمسير التكميلي' }) @ArrayMaxSize(2000) @ArrayUnique() @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true })
  employeeIds: number[]
  @IsOptional() @IsString() @MaxLength(200) name?: string
  @IsOptional() @Allow() reason?: unknown
}

class PayrollCorrectionsReportQueryDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'بداية الفترة بصيغة YYYY-MM' }) fromPeriod: string
  @Matches(/^\d{4}-\d{2}$/, { message: 'نهاية الفترة بصيغة YYYY-MM' }) toPeriod: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollCorrectionsController {
  constructor(private readonly service: PayrollCorrectionsService) {}

  // سلسلة التصحيح للمسير (الأصلي والعكس والتكميلي) وتقرير تسوياتها، والبنود القابلة للعكس، والمؤهلون للمسير التكميلي — قراءة فقط
  @Perm('payroll.view')
  @Get('runs/:id/corrections')
  view(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.view(user, id)
  }

  @Perm('payroll.reverse')
  @Post('runs/:id/reversal-preview')
  previewReversal(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollReversalPreviewDto) {
    return this.service.previewReversal(user, id, dto)
  }

  // ينشئ مسير عكس محسوبًا مربوطًا بالمسير المصروف؛ اعتماده بمستخدم آخر (payroll.approve) وتنفيذه بقيد صرف (payroll.pay) من شاشة المسير
  @Perm('payroll.reverse')
  @Post('runs/:id/reversals')
  createReversal(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollReversalCreateDto) {
    return this.service.createReversal(user, id, dto)
  }

  @Perm('payroll.calculate')
  @Post('runs/:id/supplementary')
  createSupplementary(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PayrollSupplementaryCreateDto) {
    return this.service.createSupplementary(user, id, dto)
  }

  @Perm('payroll.view')
  @Get('corrections/report')
  report(@CurrentUser() user: JwtPayload, @Query() query: PayrollCorrectionsReportQueryDto) {
    return this.service.report(user, query)
  }
}
