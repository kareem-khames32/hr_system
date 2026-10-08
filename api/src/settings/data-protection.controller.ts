import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { DataProtectionService } from './data-protection.service'

// القيم بتتفحص في الخدمة برسايلها
class BreachDto {
  @IsOptional() title?: unknown
  @IsOptional() details?: unknown
  @IsOptional() discoveredAt?: unknown
  @IsOptional() affectedCount?: unknown
}
class BreachNoteDto {
  @IsOptional() note?: unknown
}
class RetentionDto {
  @IsOptional() months?: unknown
}

// B4.8 (ب): «حماية البيانات» — سجل حوادث التسريب ومدد الاحتفاظ. بصلاحية الإعدادات، ولحساب بكل الفروع (في الخدمة)
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings/data-protection')
export class DataProtectionController {
  constructor(private readonly service: DataProtectionService) {}

  @Perm('settings.manage')
  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user)
  }

  @Perm('settings.manage')
  @Post('incidents')
  createIncident(@CurrentUser() user: JwtPayload, @Body() dto: BreachDto) {
    return this.service.createIncident(user, dto)
  }

  @Perm('settings.manage')
  @Post('incidents/:id/notify')
  notifyIncident(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BreachNoteDto) {
    return this.service.moveIncident(user, id, 'notify', dto.note)
  }

  @Perm('settings.manage')
  @Post('incidents/:id/close')
  closeIncident(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: BreachNoteDto) {
    return this.service.moveIncident(user, id, 'close', dto.note)
  }

  @Perm('settings.manage')
  @Put('retention/:key')
  setRetention(@CurrentUser() user: JwtPayload, @Param('key') key: string, @Body() dto: RetentionDto) {
    return this.service.setRetention(user, key, dto.months ?? null)
  }
}
