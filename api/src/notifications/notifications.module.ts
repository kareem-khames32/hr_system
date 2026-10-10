import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnnouncementsModule } from '../announcements/announcements.module'
import { AuthModule } from '../auth/auth.module'
import { CommentsModule } from '../comments/comments.module'
import { RequestsModule } from '../requests/requests.module'
import { NotificationChannelsController } from './channels/notification-channels.controller'
import { EmployeeWhatsappNumber, NotificationChannelSetting, NotificationEventRule } from './channels/notification-channels.entities'
import { NotificationChannelsService } from './channels/notification-channels.service'
import { Notification, NotificationDelivery, NotificationPreference, NotificationTemplate } from './notification.entities'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

// B2.4: محرك الإشعارات — أول مستهلك للطابور (QueueModule عام). البريد من MailService الموجود، والمستلمين بقواعد محرك الطلبات نفسها.
// B-ADD.5: قنوات الإشعارات (channels/) — إعداد خادم البريد والواتساب من الشاشة، وقاعدة «الحدث × القناة»، ورقم واتساب الموظف (ترحيل 187).
@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationDelivery, NotificationTemplate, NotificationPreference, NotificationChannelSetting, NotificationEventRule,
    EmployeeWhatsappNumber]), AuthModule, RequestsModule, CommentsModule, AnnouncementsModule],
  controllers: [NotificationsController, NotificationChannelsController],
  providers: [NotificationsService, NotificationChannelsService],
  exports: [NotificationsService, NotificationChannelsService],
})
export class NotificationsModule {}
