import { Body, Controller, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { AiAssistService } from './ai-assist.service'
import { AI_CV_FEATURE, AI_RANKING_FEATURE, AI_REVIEW_DRAFT_FEATURE } from './ai-rules'

// B6.10: اقتراحات المساعد في التوظيف والأداء — موديول `ai` (مقفول) وكل مسار ورا ميزته المقفولة في موديول بياناته (والخدمة بتراجع الموديول ده).
// ولا مسار هنا بيكتب في ملف مرشح أو تقييم: الرد اقتراح، وقرار صاحبه فيه بيتسجّل.
@RequireModule('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai/assist')
export class AiAssistController {
  constructor(private readonly assist: AiAssistService) {}

  @RequireFeature(AI_CV_FEATURE)
  @Perm('candidates.manage')
  @Post('cv/:candidateId')
  @HttpCode(200)
  cvSummary(@CurrentUser() user: JwtPayload, @Param('candidateId', ParseIntPipe) candidateId: number) {
    return this.assist.cvSummary(user, candidateId)
  }

  @RequireFeature(AI_RANKING_FEATURE)
  @Perm('candidates.manage')
  @Post('ranking/:jobId')
  @HttpCode(200)
  ranking(@CurrentUser() user: JwtPayload, @Param('jobId', ParseIntPipe) jobId: number) {
    return this.assist.ranking(user, jobId)
  }

  // للمدير المقيِّم بس (الخدمة بتحكم بنموذج التقييم نفسه)
  @RequireFeature(AI_REVIEW_DRAFT_FEATURE)
  @Post('review/:assignmentId')
  @HttpCode(200)
  reviewDraft(@CurrentUser() user: JwtPayload, @Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.assist.reviewDraft(user, assignmentId)
  }

  // قرار صاحب الاقتراح: استخدمه (والنص النهائي) أو رفضه — مرة واحدة
  @Post(':id/outcome')
  @HttpCode(200)
  outcome(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: { used?: unknown; finalText?: unknown }) {
    return this.assist.outcome(user, id, body ?? {})
  }
}
