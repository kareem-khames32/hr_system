import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { ExpenseReportsService } from './expense-reports.service'

// القيم بتتفحص في الخدمة برسايلها
class ReportDto {
  @IsOptional() title?: unknown
  @IsOptional() tripFrom?: unknown
  @IsOptional() tripTo?: unknown
}
class LineDto {
  @IsOptional() categoryId?: unknown
  @IsOptional() expenseDate?: unknown
  @IsOptional() amount?: unknown
  @IsOptional() note?: unknown
  @IsOptional() receiptFileId?: unknown
}
class AdvanceLinkDto {
  @IsOptional() advanceId?: unknown
}
class AdvanceStepDto {
  @IsOptional() note?: unknown
}
class PerDiemDto {
  @IsOptional() destination?: unknown
  @IsOptional() days?: unknown
  @IsOptional() expenseDate?: unknown
  @IsOptional() note?: unknown
}
class RateDto {
  @IsOptional() categoryId?: unknown
  @IsOptional() gradeId?: unknown
  @IsOptional() destination?: unknown
  @IsOptional() dailyAmount?: unknown
  @IsOptional() isActive?: unknown
}
class CategoryDto {
  @IsOptional() gradeLimits?: unknown
  @IsOptional() name?: unknown
  @IsOptional() limitPerLine?: unknown
  @IsOptional() limitMode?: unknown
  @IsOptional() receiptRequired?: unknown
  @IsOptional() isActive?: unknown
}

// B5.3 (أ): تقارير المصروفات — ميزة فرعية `expenses.reports` (مقفولة افتراضيًا) جوه موديول المصروفات القائم
@RequireModule('expenses')
@RequireFeature('expenses.reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service: ExpenseReportsService) {}

  // الموظف لتقاريره هو: الخدمة بتحكم بملف الموظف المربوط بالحساب (من غير صلاحية)
  @Get('my')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post('my/reports')
  createReport(@CurrentUser() user: JwtPayload, @Body() dto: ReportDto) {
    return this.service.createReport(user, dto)
  }

  @Patch('my/reports/:id')
  updateReport(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ReportDto) {
    return this.service.updateReport(user, id, dto)
  }

  @Delete('my/reports/:id')
  removeReport(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeReport(user, id)
  }

  @Post('my/reports/:id/lines')
  addLine(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LineDto) {
    return this.service.saveLine(user, id, dto)
  }

  @Patch('my/reports/:id/lines/:lineId')
  updateLine(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number, @Body() dto: LineDto) {
    return this.service.saveLine(user, id, dto, lineId)
  }

  @Delete('my/reports/:id/lines/:lineId')
  removeLine(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('lineId', ParseIntPipe) lineId: number) {
    return this.service.removeLine(user, id, lineId)
  }

  // (ج) بند بدل يومي: الوجهة وعدد الأيام من الموظف، والمبلغ من الخادم
  @Post('my/reports/:id/per-diem')
  addPerDiem(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PerDiemDto) {
    return this.service.savePerDiem(user, id, dto)
  }

  // (ب) ربط سلفة مأمورية مصروفة بالتقرير أو فكّها — الخدمة بتحكم بصاحب التقرير والسلفة
  @Put('my/reports/:id/advance')
  attachAdvance(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: AdvanceLinkDto) {
    return this.service.attachAdvance(user, id, dto)
  }

  // (ب) المالية: تسجيل صرف سلفة موظف في نطاق الحساب، أو قفلها «اترجّعت نقدًا»
  @Perm('expenses.manage')
  @Post('advances/:id/steps/:step')
  advanceStep(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('step') step: string, @Body() dto: AdvanceStepDto) {
    return this.service.advanceStep(user, id, step, dto)
  }

  // الإدارة: الفئات (الكتابة لحساب بكل الفروع) وتقارير موظفين النطاق
  @Perm('expenses.manage')
  @Get('overview')
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user)
  }

  @Perm('expenses.manage')
  @Post('categories')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: CategoryDto) {
    return this.service.createCategory(user, dto)
  }

  // (ج) أسعار البدل اليومي بالدرجة والوجهة — تعريف لحساب بكل الفروع
  @Perm('expenses.manage')
  @Post('rates')
  createRate(@CurrentUser() user: JwtPayload, @Body() dto: RateDto) {
    return this.service.saveRate(user, dto)
  }

  @Perm('expenses.manage')
  @Patch('rates/:id')
  updateRate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RateDto) {
    return this.service.saveRate(user, dto, id)
  }

  @Perm('expenses.manage')
  @Patch('categories/:id')
  updateCategory(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) {
    return this.service.updateCategory(user, id, dto)
  }
}
