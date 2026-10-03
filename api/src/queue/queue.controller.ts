import { Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { QueueService } from './queue.service'

// B2.3: متابعة الطابور — نفس صلاحية «المهام المجدولة» (settings.manage)، ولحساب على مستوى الشركة بس (الطابور واحد للشركة كلها)
const companyOnly = (user: JwtPayload) => {
  if (branchScopeOf(user) !== null) throw new ForbiddenException('متابعة الطابور لحساب على مستوى الشركة')
}

@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get()
  @Perm('settings.manage')
  overview(@CurrentUser() user: JwtPayload) {
    companyOnly(user)
    return this.queue.overview()
  }

  @Post('jobs/:id/retry')
  @Perm('settings.manage')
  retry(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    companyOnly(user)
    return this.queue.retryDead(id)
  }
}
