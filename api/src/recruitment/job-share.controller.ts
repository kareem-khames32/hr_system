import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { JobShareService } from './job-share.service'

// B-ADD.6: «انشر الوظيفة» وقنوات النشر — بصلاحية إدارة التوظيف (نفس صلاحية شاشة الوظائف)، وبنطاق فروع الحساب في الخدمة. قراءة بس:
// البوست بيتنشر من متصفح مسؤول التوظيف، والخادم مابينشرش حاجة.
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage')
@Controller('recruitment/share')
export class JobShareController {
  constructor(private readonly share: JobShareService) {}

  @Get('channels')
  channels() {
    return this.share.channels()
  }

  @Get('jobs/:id')
  kit(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.share.kit(user, id)
  }
}
