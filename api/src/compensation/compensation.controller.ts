import { Controller, Get, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { CompensationService } from './compensation.service'

// B5.1: «تخطيط الزيادات وسلّم الرواتب» — موديول compensation (مقفول افتراضيًا)
@RequireModule('compensation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('compensation')
export class CompensationController {
  constructor(private readonly service: CompensationService) {}

  // (أ) سلّم الرواتب: الدرجات بنطاقها، والموظفين بنسبة المقارنة — أرقام رواتب، فبصلاحية عرض الرواتب
  @Perm('payroll.view')
  @Get('bands')
  bands(@CurrentUser() user: JwtPayload) {
    return this.service.bands(user)
  }
}
