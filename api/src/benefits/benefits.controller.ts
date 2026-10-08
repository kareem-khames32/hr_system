import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { BenefitsService } from './benefits.service'

// القيم بتتفحص في الخدمة برسايلها
class PolicyDto {
  @IsOptional() name?: unknown
  @IsOptional() insurerName?: unknown
  @IsOptional() policyNumber?: unknown
  @IsOptional() country?: unknown
  @IsOptional() startDate?: unknown
  @IsOptional() endDate?: unknown
  @IsOptional() note?: unknown
  @IsOptional() isActive?: unknown
}
class ClassDto {
  @IsOptional() name?: unknown
  @IsOptional() employeeShareMonthly?: unknown
  @IsOptional() isDefault?: unknown
  @IsOptional() gradeIds?: unknown
  @IsOptional() isActive?: unknown
}

// B5.2: «المزايا والتأمين الطبي» — موديول benefits (مقفول افتراضيًا). بصلاحية الموديول؛ كتابة الوثائق والفئات لحساب بكل الفروع (في الخدمة)
@RequireModule('benefits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('benefits')
export class BenefitsController {
  constructor(private readonly service: BenefitsService) {}

  @Perm('benefits.manage')
  @Get('insurance')
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user)
  }

  @Perm('benefits.manage')
  @Post('insurance/policies')
  createPolicy(@CurrentUser() user: JwtPayload, @Body() dto: PolicyDto) {
    return this.service.createPolicy(user, dto)
  }

  @Perm('benefits.manage')
  @Patch('insurance/policies/:id')
  updatePolicy(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PolicyDto) {
    return this.service.updatePolicy(user, id, dto)
  }

  @Perm('benefits.manage')
  @Post('insurance/policies/:id/classes')
  createClass(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ClassDto) {
    return this.service.createClass(user, id, dto)
  }

  @Perm('benefits.manage')
  @Patch('insurance/classes/:id')
  updateClass(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ClassDto) {
    return this.service.updateClass(user, id, dto)
  }

  // تقرير الأهلية: موظفين نطاق الحساب بوثيقة دولة فرعهم وفئة درجتهم
  @Perm('benefits.manage')
  @Get('insurance/eligibility')
  eligibility(@CurrentUser() user: JwtPayload) {
    return this.service.eligibility(user)
  }
}
