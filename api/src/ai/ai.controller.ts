import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { AI_ACTION_FEATURE, AI_READ_FEATURE } from './ai-rules'
import { AiService } from './ai.service'

// B6.6: المساعد — موديول `ai` (مقفول افتراضيًا) وميزة مساعد القراءة (مقفولة). السؤال والحالة للحساب نفسه (الأدوات بهويته)، وسجل الاستخدام بصلاحية سجل التدقيق.
@RequireModule('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @RequireFeature(AI_READ_FEATURE)
  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    return this.ai.status(user)
  }

  @RequireFeature(AI_READ_FEATURE)
  @Post('ask')
  @HttpCode(200)
  ask(@CurrentUser() user: JwtPayload, @Body('question') question: unknown) {
    return this.ai.ask(user, question)
  }

  // ===== B6.7: مساعد التنفيذ — تأكيد أو إلغاء اقتراح اتعاين (لصاحبه بس؛ التنفيذ بنفس دالة مسار الشاشة) =====
  // B6.8: اقتراحاتي المستنية (من أي قناة) — عشان الكتابة تتأكد من البوابة
  @RequireFeature(AI_ACTION_FEATURE)
  @Get('suggestions')
  suggestions(@CurrentUser() user: JwtPayload) {
    return this.ai.pendingSuggestions(user)
  }

  @RequireFeature(AI_ACTION_FEATURE)
  @Post('actions/:id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ai.confirm(user, id)
  }

  @RequireFeature(AI_ACTION_FEATURE)
  @Post('actions/:id/dismiss')
  @HttpCode(200)
  dismiss(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.ai.dismiss(user, id)
  }

  @Perm('audit.view')
  @Get('actions')
  actions(@CurrentUser() user: JwtPayload, @Query() query: Record<string, unknown>) {
    return this.ai.actions(user, query)
  }
}
