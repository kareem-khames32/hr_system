import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Put, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsString, MaxLength } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { NOTIFICATION_BODY_MAX, NOTIFICATION_DELIVERY_CHANNELS, NOTIFICATION_MODES, NOTIFICATION_TITLE_MAX } from './notification-events'
import { NotificationsService } from './notifications.service'

// B2.4: تفضيلات المستخدم لإشعاراته، وإدارة القوالب وسجل الإرسال.
// قايمة الإشعارات نفسها (GET /notifications وتعليم المقروء والحذف) في PortalController زي ما هي.

class SetPreferenceDto {
  @IsString() @MaxLength(30) category: string
  // B-ADD.5: + الواتساب (شغال أو مقفول بس)
  @IsIn([...NOTIFICATION_DELIVERY_CHANNELS]) channel: string
  @IsIn([...NOTIFICATION_MODES]) mode: string
}

class SaveTemplateDto {
  @IsString() @MaxLength(NOTIFICATION_TITLE_MAX) title: string
  @IsString() @MaxLength(NOTIFICATION_BODY_MAX) body: string
}

// القوالب وسجل الإرسال للشركة كلها (زي الطابور): صلاحية «إدارة الإعدادات» ولحساب على مستوى الشركة بس
const companyOnly = (user: JwtPayload) => {
  if (branchScopeOf(user) !== null) throw new ForbiddenException('قوالب الإشعارات وسجل الإرسال لحساب على مستوى الشركة')
}

@RequireModule('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  // اختيارات الحساب نفسه (من التوكن) — مفيش رقم مستخدم في الطلب
  @Get('preferences')
  preferences(@CurrentUser() user: JwtPayload) {
    return this.service.preferences(user)
  }

  @Patch('preferences')
  setPreference(@CurrentUser() user: JwtPayload, @Body() dto: SetPreferenceDto) {
    return this.service.setPreference(user, dto)
  }

  // B-ADD.5: language=en بيعرض ويعدّل النص الإنجليزي (من غيره العربي زي ما كان)
  @Get('templates')
  @Perm('settings.manage')
  templates(@CurrentUser() user: JwtPayload, @Query('language') language?: string) {
    companyOnly(user)
    return this.service.templatesAdmin(language)
  }

  @Put('templates/:code/:channel')
  @Perm('settings.manage')
  saveTemplate(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Param('channel') channel: string, @Body() dto: SaveTemplateDto, @Query('language') language?: string) {
    companyOnly(user)
    return this.service.saveTemplate(user, code, channel, { title: dto.title, body: dto.body }, language)
  }

  // رجوع القالب لنصه الافتراضي
  @Delete('templates/:code/:channel')
  @Perm('settings.manage')
  resetTemplate(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Param('channel') channel: string, @Query('language') language?: string) {
    companyOnly(user)
    return this.service.saveTemplate(user, code, channel, null, language)
  }

  // B-ADD.5: بحث في السجل — القناة والحالة والحدث واسم المستلم ومن تاريخ لتاريخ، بصفحات
  @Get('deliveries')
  @Perm('settings.manage')
  deliveries(@CurrentUser() user: JwtPayload, @Query('status') status?: string, @Query('channel') channel?: string, @Query('event') event?: string,
    @Query('recipient') recipient?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('page') page?: string) {
    companyOnly(user)
    return this.service.deliveriesAdmin({ status, channel, event, recipient, from, to, page })
  }
}
