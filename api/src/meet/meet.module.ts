import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { MeetController } from './meet.controller'
import { Meeting, MeetingAttendance, MeetingInvite } from './meet.entities'
import { MeetService } from './meet.service'

// B-ADD.15: الاجتماعات — صوت وصورة ومشاركة شاشة على خادم LiveKit عند الشركة، من غير أي تسجيل. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([Meeting, MeetingInvite, MeetingAttendance, User])],
  controllers: [MeetController],
  providers: [MeetService],
})
export class MeetModule {}
