import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { HelpdeskService } from './helpdesk.service'
import { KnowledgeService } from './knowledge.service'

// القيم بتتفحص في الخدمة برسايلها
class ArticleDto {
  @IsOptional() title?: unknown
  @IsOptional() body?: unknown
  @IsOptional() typeCode?: unknown
  @IsOptional() keywords?: unknown
  @IsOptional() audience?: unknown
  @IsOptional() policyId?: unknown
  @IsOptional() isPublished?: unknown
}
class RateDto {
  @IsOptional() rating?: unknown
  @IsOptional() comment?: unknown
}

// B3.10: مركز خدمات الموارد البشرية — استفسارات الموظف وتقييمه لنفسه، والتقرير بالصلاحية (والنطاق في الخدمة). الاستفسار نفسه بيتقدّم ويتنفّذ من محرك الطلبات.
@RequireModule('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskService, private readonly knowledge: KnowledgeService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.helpdesk.mine(user)
  }

  @Perm('helpdesk.manage')
  @Get('report')
  report(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.helpdesk.report(user, { from, to })
  }

  // B3.10-ب: قاعدة المعرفة — القراءة لأي موظف (المنشور اللي في جمهوره)، والإدارة بالصلاحية
  @Get('articles')
  articles(@CurrentUser() user: JwtPayload, @Query('q') q?: string, @Query('typeCode') typeCode?: string) {
    return this.knowledge.search(user, { q, typeCode })
  }

  @Perm('helpdesk.manage')
  @Get('articles/manage')
  manageArticles(@CurrentUser() user: JwtPayload) {
    return this.knowledge.list(user)
  }

  @Perm('helpdesk.manage')
  @Post('articles')
  createArticle(@CurrentUser() user: JwtPayload, @Body() dto: ArticleDto) {
    return this.knowledge.create(user, dto)
  }

  @Perm('helpdesk.manage')
  @Patch('articles/:id')
  updateArticle(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ArticleDto) {
    return this.knowledge.update(user, id, dto)
  }

  @Get('articles/:id')
  article(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.knowledge.read(user, id)
  }

  @Post(':id/rate')
  @HttpCode(200)
  rate(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RateDto) {
    return this.helpdesk.rate(user, id, dto)
  }
}
