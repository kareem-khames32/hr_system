import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Announcement, AnnouncementRead } from './announcement.entities'
import { AnnouncementsController } from './announcements.controller'
import { AnnouncementsService } from './announcements.service'

// B2.16: الإعلانات (موديول اختياري مقفول افتراضيًا)
@Module({
  imports: [TypeOrmModule.forFeature([Announcement, AnnouncementRead])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
