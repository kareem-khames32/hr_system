import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { ReviewsService } from './reviews.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class TemplateDto {
  @IsOptional() name?: unknown
  @IsOptional() description?: unknown
  @IsOptional() ratingMax?: unknown
  @IsOptional() sections?: unknown
  @IsOptional() isActive?: unknown
}
class CycleDto {
  @IsOptional() name?: unknown
  @IsOptional() kind?: unknown
  @IsOptional() templateId?: unknown
  @IsOptional() periodStart?: unknown
  @IsOptional() periodEnd?: unknown
  @IsOptional() selfDueDate?: unknown
  @IsOptional() managerDueDate?: unknown
  @IsOptional() audienceMode?: unknown
  @IsOptional() audienceIds?: unknown
}
class SubmitDto {
  @IsOptional() answers?: unknown
  @IsOptional() comment?: unknown
}

// B3.7: دورات التقييم. النماذج والدورات بصلاحية إدارة الأداء (والدورة بنطاق فروعها في الخدمة)؛ والتقييم نفسه من غير صلاحية: الحق من التكليف
// (الموظف لتقييمه الذاتي، والمدير المقيِّم لمرؤوسه)
@RequireModule('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Perm('performance.manage')
  @Get('templates')
  templates(@CurrentUser() user: JwtPayload) {
    return this.reviews.listTemplates(user)
  }

  @Perm('performance.manage')
  @Post('templates')
  createTemplate(@CurrentUser() user: JwtPayload, @Body() dto: TemplateDto) {
    return this.reviews.createTemplate(user, dto)
  }

  @Perm('performance.manage')
  @Patch('templates/:id')
  updateTemplate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TemplateDto) {
    return this.reviews.updateTemplate(user, id, dto)
  }

  @Perm('performance.manage')
  @Get('cycles')
  cycles(@CurrentUser() user: JwtPayload) {
    return this.reviews.listCycles(user)
  }

  @Perm('performance.manage')
  @Post('cycles')
  createCycle(@CurrentUser() user: JwtPayload, @Body() dto: CycleDto) {
    return this.reviews.createCycle(user, dto)
  }

  @Perm('performance.manage')
  @Post('cycles/:id/launch')
  @HttpCode(200)
  launch(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.reviews.launch(user, id)
  }

  @Perm('performance.manage')
  @Post('cycles/:id/close')
  @HttpCode(200)
  close(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.reviews.close(user, id)
  }

  @Perm('performance.manage')
  @Get('cycles/:id/assignments')
  assignments(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.reviews.assignments(user, id)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.reviews.mine(user)
  }

  @Get('team')
  team(@CurrentUser() user: JwtPayload) {
    return this.reviews.team(user)
  }

  @Get(':id')
  form(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.reviews.form(user, id)
  }

  @Post(':id/submit')
  @HttpCode(200)
  submit(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SubmitDto) {
    return this.reviews.submit(user, id, dto)
  }
}
