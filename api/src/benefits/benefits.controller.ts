import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { BenefitsMembersService } from './benefits-members.service'
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

class MemberRequestDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() dependentId?: unknown
}
class RequestStepDto {
  @IsOptional() effectiveDate?: unknown
  @IsOptional() cardNumber?: unknown
  @IsOptional() reason?: unknown
}

// B5.2: «المزايا والتأمين الطبي» — موديول benefits (مقفول افتراضيًا). بصلاحية الموديول؛ كتابة الوثائق والفئات لحساب بكل الفروع (في الخدمة)
@RequireModule('benefits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('benefits')
export class BenefitsController {
  constructor(private readonly service: BenefitsService, private readonly members: BenefitsMembersService) {}

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

  // (ب) الاشتراكات وطلبات شركة التأمين — بنطاق فروع الحساب (فرع الموظف الحالي؛ في الخدمة)
  @Perm('benefits.manage')
  @Get('insurance/members')
  listMembers(@CurrentUser() user: JwtPayload) {
    return this.members.members(user)
  }

  @Perm('benefits.manage')
  @Get('insurance/sheet')
  sheet(@CurrentUser() user: JwtPayload, @Query('status') status?: string) {
    return this.members.sheet(user, status)
  }

  @Perm('benefits.manage')
  @Post('insurance/requests')
  requestAdd(@CurrentUser() user: JwtPayload, @Body() dto: MemberRequestDto) {
    return this.members.requestAdd(user, dto)
  }

  @Perm('benefits.manage')
  @Post('insurance/enrollments/:id/remove-request')
  requestRemove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RequestStepDto) {
    return this.members.requestRemove(user, id, dto.reason)
  }

  @Perm('benefits.manage')
  @Post('insurance/requests/:id/send')
  sendRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.members.step(user, id, 'send', {})
  }

  @Perm('benefits.manage')
  @Post('insurance/requests/:id/done')
  doneRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RequestStepDto) {
    return this.members.step(user, id, 'done', dto)
  }

  @Perm('benefits.manage')
  @Post('insurance/requests/:id/cancel')
  cancelRequest(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RequestStepDto) {
    return this.members.step(user, id, 'cancel', dto)
  }

  // تقرير الأهلية: موظفين نطاق الحساب بوثيقة دولة فرعهم وفئة درجتهم
  @Perm('benefits.manage')
  @Get('insurance/eligibility')
  eligibility(@CurrentUser() user: JwtPayload) {
    return this.service.eligibility(user)
  }
}
