import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { SafetyService } from './safety.service'

// القيم بتتفحص في الخدمة برسايلها
class ReportDto {
  @IsOptional() kind?: unknown
  @IsOptional() occurredOn?: unknown
  @IsOptional() location?: unknown
  @IsOptional() description?: unknown
  @IsOptional() injured?: unknown
  @IsOptional() injuredNote?: unknown
}
class ReviewDto {
  @IsOptional() severity?: unknown
  @IsOptional() injuredEmployeeId?: unknown
  @IsOptional() lostDays?: unknown
  @IsOptional() rootCause?: unknown
}
class StatusDto {
  @IsOptional() status?: unknown
}
class ActionDto {
  @IsOptional() title?: unknown
  @IsOptional() assigneeEmployeeId?: unknown
  @IsOptional() dueDate?: unknown
}
class DueDto {
  @IsOptional() dueDate?: unknown
}
class LeaveDto {
  @IsOptional() leaveId?: unknown
}

// B5.7: «السلامة وإصابات العمل» — موديول safety (مقفول افتراضيًا)
@RequireModule('safety')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('safety')
export class SafetyController {
  constructor(private readonly service: SafetyService) {}

  // الموظف لبلاغاته هو: الخدمة بتحكم بملف الموظف المربوط بالحساب (من غير صلاحية)
  @Get('my')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post('my')
  report(@CurrentUser() user: JwtPayload, @Body() dto: ReportDto) {
    return this.service.report(user, dto)
  }

  // سجل الحوادث بنطاق فروع الحساب
  @Perm('safety.manage')
  @Get('incidents')
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  @Perm('safety.manage')
  @Get('incidents/:id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user, id)
  }

  @Perm('safety.manage')
  @Patch('incidents/:id')
  review(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDto) {
    return this.service.review(user, id, dto)
  }

  @Perm('safety.manage')
  @Post('incidents/:id/status')
  setStatus(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: StatusDto) {
    return this.service.setStatus(user, id, dto)
  }

  @Perm('safety.manage')
  @Post('incidents/:id/actions')
  addAction(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ActionDto) {
    return this.service.addAction(user, id, dto)
  }

  @Perm('safety.manage')
  @Post('incidents/:id/authority-task')
  openAuthorityTask(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DueDto) {
    return this.service.openAuthorityTask(user, id, dto)
  }

  @Perm('safety.manage')
  @Put('incidents/:id/leave')
  linkLeave(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: LeaveDto) {
    return this.service.linkLeave(user, id, dto)
  }
}
