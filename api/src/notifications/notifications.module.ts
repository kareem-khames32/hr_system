import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnnouncementsModule } from '../announcements/announcements.module'
import { AuthModule } from '../auth/auth.module'
import { CommentsModule } from '../comments/comments.module'
import { RequestsModule } from '../requests/requests.module'
import { Notification, NotificationDelivery, NotificationPreference, NotificationTemplate } from './notification.entities'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

// B2.4: محرك الإشعارات — أول مستهلك للطابور (QueueModule عام). البريد من MailService الموجود، والمستلمين بقواعد محرك الطلبات نفسها.
@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationDelivery, NotificationTemplate, NotificationPreference]), AuthModule, RequestsModule, CommentsModule, AnnouncementsModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
