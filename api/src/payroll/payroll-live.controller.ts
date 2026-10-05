import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { PayrollLiveService } from './payroll-live.service'

// B1.14 (الراتب الحي): الفترة الجارية «لحد امبارح» من التراكم اليومي الموجود، من غير مسير.
// المعاينة لقارئ الرواتب بنطاق فروعه، والتحديث بصلاحية الحساب، و«مستحقي التقديري» للموظف عن نفسه ورا ميزة فرعية مقفولة افتراضيًا.
@RequireModule('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/live')
export class PayrollLiveController {
  constructor(private readonly service: PayrollLiveService) {}

  @Perm('payroll.view')
  @Get()
  preview(@CurrentUser() user: JwtPayload) {
    return this.service.preview(user)
  }

  // «حدّث الحساب»: الأيام الناقصة والمتسخة لموظفي نطاق الحساب دلوقتي بدل ما تستنى الليل (بميزانية وقت للطلب الواحد، والشاشة بتكمّل)
  @Perm('payroll.calculate')
  @Post('refresh')
  refresh(@CurrentUser() user: JwtPayload) {
    return this.service.refresh(user)
  }

  // الموظف عن نفسه (من غير صلاحية رواتب): الميزة مقفولة = 404 كأن المسار مش موجود
  @RequireFeature('payroll.live_employee_view')
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }
}
