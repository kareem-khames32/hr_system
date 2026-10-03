import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { ScheduledJobsService } from './scheduled-jobs.service'

// شاشة «المهام المجدولة» (خطة التنفيذ B1.4): قراءة بس، لصاحب «إدارة الإعدادات» على كل الفروع — رسايل الأخطاء ممكن تذكر أي فرع
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireModule('platform')
@Controller('scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly jobs: ScheduledJobsService) {}

  @Get()
  @Perm('settings.manage')
  overview(@CurrentUser() user: JwtPayload) {
    if (branchScopeOf(user) !== null) throw new ForbiddenException('المهام المجدولة لحساب على كل الفروع')
    return this.jobs.overview()
  }
}
