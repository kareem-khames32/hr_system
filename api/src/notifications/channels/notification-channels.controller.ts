import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../../auth/guards'
import { RequireModule } from '../../modules-registry/module.guard'
import { NotificationChannelsService } from './notification-channels.service'

// B-ADD.5: شاشة «الإعدادات ← قنوات الإشعارات». القيم بتتفحص في الخدمة برسايلها.

class MailSettingsDto {
  @IsOptional() enabled?: unknown
  @IsOptional() preset?: unknown
  @IsOptional() host?: unknown
  @IsOptional() port?: unknown
  @IsOptional() encryption?: unknown
  @IsOptional() user?: unknown
  // مابيتبعتش = كلمة السر المحفوظة زي ما هي؛ فاضي = مسحها
  @IsOptional() password?: unknown
  @IsOptional() fromName?: unknown
  @IsOptional() fromAddress?: unknown
}
class MailTestDto {
  @IsOptional() to?: unknown
}
class WhatsappSettingsDto {
  @IsOptional() enabled?: unknown
  @IsOptional() provider?: unknown
  @IsOptional() phoneNumber?: unknown
  @IsOptional() phoneNumberId?: unknown
  @IsOptional() businessAccountId?: unknown
  @IsOptional() apiVersion?: unknown
  @IsOptional() defaultCountryCode?: unknown
  @IsOptional() fallbackToPhone?: unknown
  // مابيتبعتش = التوكن المحفوظ زي ما هو؛ فاضي = مسحه
  @IsOptional() token?: unknown
}
class WhatsappTestDto {
  @IsOptional() to?: unknown
  @IsOptional() eventCode?: unknown
  @IsOptional() language?: unknown
}
class EventRuleDto {
  @IsOptional() inApp?: unknown
  @IsOptional() email?: unknown
  @IsOptional() whatsapp?: unknown
  @IsOptional() mandatory?: unknown
  @IsOptional() whatsappTemplates?: unknown
}
class ContactDto {
  @IsOptional() whatsappNumber?: unknown
}

/**
 * إعداد القنوات (خادم البريد وكلمة سره، وتوكن الواتساب، وأنهي حدث يطلع على أنهي قناة) لمدير النظام بس: المسار عليه «إدارة الإعدادات» زي باقي
 * شاشات الإعدادات، وفوقها الحساب لازم يكون مدير النظام نفسه — صلاحية «إدارة الإعدادات» لوحدها (مدير موارد بشرية مثلًا) ماتكفيش، عشان اللي
 * بيتكتب هنا أسرار وبيغيّر اللي بيطلع برّه النظام لكل الشركة.
 */
const systemAdminOnly = (user: JwtPayload) => {
  if (user.role !== 'super_admin' && !(user.permissions ?? []).includes('*')) throw new ForbiddenException('قنوات الإشعارات لمدير النظام بس')
}

@RequireModule('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notification-channels')
export class NotificationChannelsController {
  constructor(private readonly service: NotificationChannelsService) {}

  @Get()
  @Perm('settings.manage')
  state(@CurrentUser() user: JwtPayload) {
    systemAdminOnly(user)
    return this.service.state()
  }

  @Put('email')
  @Perm('settings.manage')
  saveEmail(@CurrentUser() user: JwtPayload, @Body() dto: MailSettingsDto) {
    systemAdminOnly(user)
    return this.service.saveEmail(user, { ...dto })
  }

  // الرسالة الحقيقية الوحيدة اللي بتطلع من الشاشة: لما المدير يدوس الزرار
  @Post('email/test')
  @Perm('settings.manage')
  testEmail(@CurrentUser() user: JwtPayload, @Body() dto: MailTestDto) {
    systemAdminOnly(user)
    return this.service.testEmail(user, { ...dto })
  }

  @Put('whatsapp')
  @Perm('settings.manage')
  saveWhatsapp(@CurrentUser() user: JwtPayload, @Body() dto: WhatsappSettingsDto) {
    systemAdminOnly(user)
    return this.service.saveWhatsapp(user, { ...dto })
  }

  @Post('whatsapp/test')
  @Perm('settings.manage')
  testWhatsapp(@CurrentUser() user: JwtPayload, @Body() dto: WhatsappTestDto) {
    systemAdminOnly(user)
    return this.service.testWhatsapp(user, { ...dto })
  }

  @Put('events/:code')
  @Perm('settings.manage')
  saveEventRule(@CurrentUser() user: JwtPayload, @Param('code') code: string, @Body() dto: EventRuleDto) {
    systemAdminOnly(user)
    return this.service.saveEventRule(user, code, { ...dto })
  }

  // مين ناقصه رقم أو بريد: بصلاحية عرض الموظفين وبنطاق فروع القارئ (الحكم في الخدمة)
  @Get('missing-contacts')
  @Perm('employees.view')
  missingContacts(@CurrentUser() user: JwtPayload) {
    return this.service.missingContacts(user)
  }

  // رقم واتساب الموظف في ملفه: القراءة بصلاحية عرض الموظفين، والتعديل بصلاحية تعديلهم — والموظف لازم يكون في نطاق فروع الحساب
  @Get('contacts/:employeeId')
  @Perm('employees.view')
  contact(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.service.contact(user, employeeId)
  }

  @Put('contacts/:employeeId')
  @Perm('employees.edit')
  saveContact(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: ContactDto) {
    return this.service.saveContact(user, employeeId, dto.whatsappNumber)
  }
}
