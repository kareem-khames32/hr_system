import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common'
import type { Response } from 'express'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { SavedReportsService, type SavedReportInput } from './saved-reports.service'

// B2.13-ب: التقارير المحفوظة — فلاتر باسم لصاحبها بس (حساب تاني = غير موجود)، وتنزيلها ودورية إرسالها بالبريد.
// القراءة والتنزيل بصلاحية مركز التقارير؛ والحفظ والتعديل والحذف بصلاحية reports.save فوقها (مسار كاتب مايتفتحش بصلاحية عرض).
// الجسم بيتقري خام وبيتحكم عليه في الخدمة (أسماء حقول معدودة، وكل قيمة بتتفحص هناك).
@RequireModule('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports/saved')
export class SavedReportsController {
  constructor(private readonly saved: SavedReportsService) {}

  private input(body: unknown): SavedReportInput {
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    return { name: raw.name, report: raw.report, frequency: raw.frequency, format: raw.format, branchId: raw.branchId,
      departmentIds: raw.departmentIds, teamId: raw.teamId, period: raw.period }
  }

  // صلاحية المسار الكاتب بتبدّل صلاحية الكنترولر في الحارس، فمركز التقارير بيتفحص هنا معاها
  private writer(user: JwtPayload) {
    if (!userHasPerm(user, 'reports.view')) throw new ForbiddenException('حفظ التقارير محتاج صلاحية مركز التقارير')
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.saved.list(user)
  }

  @Perm('reports.save')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    this.writer(user)
    return this.saved.create(user, this.input(body))
  }

  @Perm('reports.save')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    this.writer(user)
    return this.saved.update(user, id, this.input(body))
  }

  @Perm('reports.save')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    this.writer(user)
    return this.saved.remove(user, id)
  }

  // GET لأنه قراءة (زي /reports/export)
  @Get(':id/export')
  async export(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Query('format') format: string | undefined, @Res() res: Response) {
    const file = await this.saved.file(user, id, format)
    res.setHeader('Content-Type', file.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${file.asciiName}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`)
    res.setHeader('Cache-Control', 'no-store')
    res.send(file.buffer)
  }
}
