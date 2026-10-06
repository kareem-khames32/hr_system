import { Controller, Get, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard } from '../auth/guards'
import { AllowDuringPolicyGate } from '../policies/policy-gate.decorator'
import { RequireModule } from './module.guard'
import { ModulesService } from './modules.service'

/** الموديولات والمزايا المفعّلة للمستخدم الحالي (بعد جمهور التفعيل) — الواجهة بتبني عليها القايمة وحارس المسارات. */
@RequireModule('platform')
@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(private readonly modules: ModulesService) {}

  // من غير صلاحية: كل مستخدم داخل بيقرا المفعّل له هو بس (أسماء موديولات، مفيش بيانات)
  @AllowDuringPolicyGate()
  @Get('enabled')
  enabled(@CurrentUser() user: JwtPayload) {
    return this.modules.enabledFor(user)
  }
}
