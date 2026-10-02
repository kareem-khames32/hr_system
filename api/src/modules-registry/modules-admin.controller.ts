import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common'
import { IsBoolean, IsObject, IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from './module.guard'
import { ModulesService } from './modules.service'

class SetModuleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  // جمهور التفعيل «مين + فين» (نفس شكل جمهور أنواع الطلبات)؛ null = لكل الشركة. الشكل بيتفحص في الخدمة
  @IsOptional()
  @IsObject()
  audience?: Record<string, unknown> | null
}

class SetFeatureDto {
  @IsBoolean()
  enabled: boolean
}

/**
 * شاشة «الإعدادات ← الموديولات» (خطة التنفيذ B0.3): تفعيل وقفل الموديولات والمزايا الفرعية وجمهور التفعيل والباقات.
 * بصلاحية settings.modules (لمدير النظام بس)، والكتابة لحساب على مستوى الشركة: الموديول بيتفتح أو يتقفل لكل الفروع.
 */
@RequireModule('platform')
@Controller('modules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('settings.modules')
export class ModulesAdminController {
  constructor(private readonly modules: ModulesService) {}

  @Get('catalog')
  catalog() {
    return this.modules.catalog()
  }

  // آخر التغييرات: مين فتح أو قفل إيه وإمتى
  @Get('events')
  events() {
    return this.modules.events()
  }

  // الفرق لو الباقة اتطبقت (قبل التطبيق)
  @Get('presets/:preset/diff')
  presetDiff(@Param('preset') preset: string) {
    return this.modules.presetDiff(preset)
  }

  @Post('presets/:preset/apply')
  applyPreset(@CurrentUser() user: JwtPayload, @Param('preset') preset: string) {
    assertCompanyWideWrite(user)
    return this.modules.applyPreset(user, preset)
  }

  @Put('features/:key')
  setFeature(@CurrentUser() user: JwtPayload, @Param('key') key: string, @Body() dto: SetFeatureDto) {
    assertCompanyWideWrite(user)
    return this.modules.setFeature(user, key, dto.enabled)
  }

  // أثر قفل الموديول قبل ما يتقفل: البيانات والطلبات المفتوحة («هيفضلوا يكمّلوا، بس مفيش جديد هيتقدّم»)
  @Get(':key/impact')
  impact(@Param('key') key: string) {
    return this.modules.impact(key)
  }

  @Put(':key')
  setModule(@CurrentUser() user: JwtPayload, @Param('key') key: string, @Body() dto: SetModuleDto) {
    assertCompanyWideWrite(user)
    return this.modules.setModule(user, key, dto)
  }
}
