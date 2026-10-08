import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { TimesheetsService } from './timesheets.service'

// القيم بتتفحص في الخدمة برسايلها
class ProjectDto {
  @IsOptional() clientName?: unknown
  @IsOptional() name?: unknown
  @IsOptional() branchId?: unknown
  @IsOptional() isActive?: unknown
  @IsOptional() tasks?: unknown
}
class EntryDto {
  @IsOptional() workDate?: unknown
  @IsOptional() projectId?: unknown
  @IsOptional() taskId?: unknown
  @IsOptional() minutes?: unknown
  @IsOptional() note?: unknown
}
class WeekDto {
  @IsOptional() weekStart?: unknown
}
class DecisionDto {
  @IsOptional() action?: unknown
  @IsOptional() note?: unknown
}

// B5.8: «ساعات المشاريع» — موديول timesheets (مقفول افتراضيًا)
@RequireModule('timesheets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timesheets')
export class TimesheetsController {
  constructor(private readonly service: TimesheetsService) {}

  // الموظف لساعاته هو: الخدمة بتحكم بملف الموظف المربوط بالحساب (من غير صلاحية)
  @Get('my')
  mine(@CurrentUser() user: JwtPayload, @Query('week') week?: string) {
    return this.service.mine(user, { week })
  }

  @Put('my/entries')
  saveEntry(@CurrentUser() user: JwtPayload, @Body() dto: EntryDto) {
    return this.service.saveEntry(user, dto)
  }

  @Post('my/submit')
  submit(@CurrentUser() user: JwtPayload, @Body() dto: WeekDto) {
    return this.service.submit(user, dto)
  }

  @Post('my/recall')
  recall(@CurrentUser() user: JwtPayload, @Body() dto: WeekDto) {
    return this.service.recall(user, dto)
  }

  // أسابيع مرؤوسي المدير المباشرين واعتمادها — «المدير المباشر» موقع في الهيكل؛ وكمان لصاحب timesheets.manage في نطاقه (الحكم في الخدمة تحت قفل صف الموظف)
  @Get('team')
  team(@CurrentUser() user: JwtPayload) {
    return this.service.team(user)
  }

  @Post('weeks/:id/decision')
  decide(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DecisionDto) {
    return this.service.decide(user, id, dto)
  }

  // المشاريع والتقرير بصلاحية الموديول
  @Perm('timesheets.manage')
  @Get('projects')
  projects(@CurrentUser() user: JwtPayload) {
    return this.service.projects(user)
  }

  @Perm('timesheets.manage')
  @Post('projects')
  createProject(@CurrentUser() user: JwtPayload, @Body() dto: ProjectDto) {
    return this.service.saveProject(user, null, dto)
  }

  @Perm('timesheets.manage')
  @Patch('projects/:id')
  updateProject(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ProjectDto) {
    return this.service.saveProject(user, id, dto)
  }

  @Perm('timesheets.manage')
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.report(user, { from, to })
  }
}
