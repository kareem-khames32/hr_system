import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { ReportBuilderService } from './report-builder.service'

// B5.9: بانِي التقارير — ميزة فرعية `reports.builder` (مقفولة افتراضيًا) جوه موديول التقارير. القاموس وتشغيل تقرير محفوظ أو متشارك بصلاحية مركز التقارير
// (مسارات GET بس: صلاحية «عرض» مابتفتحش مسار كاتب)؛ وتشغيل تعريف من البانِي والحفظ والتعديل والحذف بصلاحية reports.save فوقها. الجسم بيتقري خام وبيتحكم عليه في الخدمة على قاموس المصادر (مفاتيح معدودة، وكل قيمة بتتفحص هناك).
@RequireModule('reports')
@RequireFeature('reports.builder')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports/builder')
export class ReportBuilderController {
  constructor(private readonly builder: ReportBuilderService) {}

  // صلاحية المسار الكاتب بتبدّل صلاحية الكنترولر في الحارس، فمركز التقارير بيتفحص هنا معاها
  private writer(user: JwtPayload) {
    if (!userHasPerm(user, 'reports.view')) throw new ForbiddenException('حفظ التقارير محتاج صلاحية مركز التقارير')
  }

  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.builder.overview(user)
  }

  @Get('saved/:id/run')
  runSaved(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.builder.runSaved(user, id)
  }

  // تعريف من البانِي في جسم الطلب (قيم الفلاتر ماتتحطش في العنوان): لصاحب صلاحية بناء التقارير
  @Perm('reports.save')
  @Post('run')
  run(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    this.writer(user)
    return this.builder.run(user, body)
  }

  @Perm('reports.save')
  @Post('saved')
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    this.writer(user)
    return this.builder.save(user, null, body)
  }

  @Perm('reports.save')
  @Patch('saved/:id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    this.writer(user)
    return this.builder.save(user, id, body)
  }

  @Perm('reports.save')
  @Delete('saved/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    this.writer(user)
    return this.builder.remove(user, id)
  }
}
