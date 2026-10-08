import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { AI_READ_FEATURE } from './ai-rules'
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

  @Perm('audit.view')
  @Get('actions')
  actions(@CurrentUser() user: JwtPayload, @Query() query: Record<string, unknown>) {
    return this.ai.actions(user, query)
  }
}
