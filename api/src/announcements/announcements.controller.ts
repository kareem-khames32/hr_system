import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { AnnouncementsService, type AnnouncementInput } from './announcements.service'

// B2.16: الإعلانات. الإدارة وتقرير القراءة بصلاحية announcements.manage (وحساب الفروع لإعلانات فروعه بس)؛ واللوحة وتسجيل القراءة
// للموظف لنفسه من غير صلاحية (الفحص في الخدمة: الإعلان ساري وهو في جمهوره). الجسم بيتقري خام وكل قيمة بتتحكم في الخدمة.
@RequireModule('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  private input(body: unknown): AnnouncementInput {
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
    return { title: raw.title, body: raw.body, audience: raw.audience, publishDate: raw.publishDate, expiryDate: raw.expiryDate, pinned: raw.pinned, requiresRead: raw.requiresRead,
      attachmentFileId: raw.attachmentFileId }
  }

  // ===== الموظف =====
  @Get('board')
  board(@CurrentUser() user: JwtPayload) {
    return this.announcements.board(user)
  }

  @Post(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.announcements.markRead(user, id)
  }

  // B2.16-ب: الميزة الفرعية «أعياد الميلاد وسنوات الخدمة» (مقفولة افتراضيًا): مناسبات زمايل فرع الموظف — من غير سنة الميلاد
  @RequireFeature('announcements.occasions')
  @Get('occasions')
  occasions(@CurrentUser() user: JwtPayload) {
    return this.announcements.occasions(user)
  }

  // ===== الإدارة =====
  @Perm('announcements.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.announcements.list(user)
  }

  @Perm('announcements.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    return this.announcements.create(user, this.input(body))
  }

  @Perm('announcements.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.announcements.update(user, id, this.input(body))
  }

  @Perm('announcements.manage')
  @Post(':id/publish')
  publish(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.announcements.publish(user, id)
  }

  @Perm('announcements.manage')
  @Post(':id/withdraw')
  withdraw(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.announcements.withdraw(user, id)
  }

  @Perm('announcements.manage')
  @Get(':id/report')
  report(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.announcements.report(user, id)
  }
}
