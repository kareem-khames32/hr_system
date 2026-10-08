import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { CompensationCyclesService } from './compensation-cycles.service'
import { CompensationService } from './compensation.service'

// القيم بتتفحص في الخدمة برسايلها
class CycleDto {
  @IsOptional() name?: unknown
  @IsOptional() effectivePayrollPeriod?: unknown
  @IsOptional() note?: unknown
}
class AmountDto {
  @IsOptional() amount?: unknown
  @IsOptional() note?: unknown
}

// B5.1: «تخطيط الزيادات وسلّم الرواتب» — موديول compensation (مقفول افتراضيًا)
@RequireModule('compensation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compensation')
export class CompensationController {
  constructor(private readonly service: CompensationService, private readonly cycles: CompensationCyclesService) {}

  // (أ) سلّم الرواتب: الدرجات بنطاقها، والموظفين بنسبة المقارنة — أرقام رواتب، فبصلاحية عرض الرواتب
  @Perm('payroll.view')
  @Get('bands')
  bands(@CurrentUser() user: JwtPayload) {
    return this.service.bands(user)
  }

  // (ب) دورات الزيادات — المراجعة بصلاحية الموديول؛ تحريك الدورة لحساب بكل الفروع، والسطور والميزانيات بنطاق الفروع (في الخدمة)
  @Perm('compensation.manage')
  @Get('cycles')
  listCycles(@CurrentUser() user: JwtPayload) {
    return this.cycles.list(user)
  }

  @Perm('compensation.manage')
  @Post('cycles')
  createCycle(@CurrentUser() user: JwtPayload, @Body() dto: CycleDto) {
    return this.cycles.create(user, dto)
  }

  @Perm('compensation.manage')
  @Get('cycles/:id')
  cycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cycles.detail(user, id)
  }

  @Perm('compensation.manage')
  @Post('cycles/:id/steps/:step')
  moveCycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('step') step: string) {
    return this.cycles.move(user, id, step)
  }

  @Perm('compensation.manage')
  @Put('cycles/:id/budgets/:departmentId')
  setBudget(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('departmentId', ParseIntPipe) departmentId: number, @Body() dto: AmountDto) {
    return this.cycles.setBudget(user, id, departmentId, dto.amount ?? null)
  }

  @Perm('compensation.manage')
  @Put('cycles/:id/lines/:employeeId')
  adjustLine(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: AmountDto) {
    return this.cycles.adjustLine(user, id, employeeId, dto)
  }

  // (ج) الاعتماد والرجوع والتطبيق: بصلاحية اعتماد المسير ولحساب بكل الفروع؛ «من حد ماقترحش» و«تعديل الموظفين» للتطبيق في الخدمة
  @Perm('payroll.approve')
  @Post('cycles/:id/approve')
  approveCycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cycles.approve(user, id)
  }

  @Perm('payroll.approve')
  @Post('cycles/:id/unapprove')
  unapproveCycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cycles.unapprove(user, id)
  }

  @Perm('payroll.approve')
  @Post('cycles/:id/apply')
  applyCycle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.cycles.apply(user, id)
  }

  // ورقة المدير: من غير مفتاح صلاحية — «المدير المباشر» موقع في الهيكل بيتحكم عليه في الخدمة (مرؤوسيه المباشرين بس)
  @Get('my-team')
  myTeam(@CurrentUser() user: JwtPayload) {
    return this.cycles.myTeam(user)
  }

  @Put('cycles/:id/my-team/:employeeId')
  propose(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: AmountDto) {
    return this.cycles.propose(user, id, employeeId, dto)
  }
}
