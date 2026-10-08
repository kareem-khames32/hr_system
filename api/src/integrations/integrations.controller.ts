import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { IntegrationKeysService } from './integration-keys.service'
import { WebhooksService } from './webhooks.service'

// القيم بتتفحص في الخدمة برسايلها
class CreateKeyDto {
  @IsOptional() name?: unknown
  @IsOptional() scopes?: unknown
  @IsOptional() branchIds?: unknown
}
class CreateWebhookDto {
  @IsOptional() name?: unknown
  @IsOptional() url?: unknown
  @IsOptional() events?: unknown
  @IsOptional() branchIds?: unknown
}
class WebhookStateDto {
  @IsOptional() isActive?: unknown
}

// B6.3 (أ): إدارة مفاتيح التكامل — بصلاحية `integrations.manage` ولحساب بكل الفروع (الحكم في الخدمة)
@RequireModule('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly keys: IntegrationKeysService, private readonly webhooks: WebhooksService) {}

  @Perm('integrations.manage')
  @Get('keys')
  list(@CurrentUser() user: JwtPayload) {
    return this.keys.list(user)
  }

  // نص المفتاح في رد الإنشاء ده بس
  @Perm('integrations.manage')
  @Post('keys')
  create(@CurrentUser() user: JwtPayload, @Body() body: CreateKeyDto) {
    return this.keys.create(user, body)
  }

  @Perm('integrations.manage')
  @Delete('keys/:id')
  revoke(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.keys.revoke(user, id)
  }

  // ===== B6.3 (ج): نقاط استقبال الأحداث (webhooks) =====
  @Perm('integrations.manage')
  @Get('webhooks')
  listWebhooks(@CurrentUser() user: JwtPayload) {
    return this.webhooks.list(user)
  }

  // سر التوقيع في رد الإنشاء ده بس
  @Perm('integrations.manage')
  @Post('webhooks')
  createWebhook(@CurrentUser() user: JwtPayload, @Body() body: CreateWebhookDto) {
    return this.webhooks.create(user, body)
  }

  @Perm('integrations.manage')
  @Patch('webhooks/:id')
  setWebhookActive(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() body: WebhookStateDto) {
    return this.webhooks.setActive(user, id, body?.isActive)
  }
}
