import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { MeetCall } from './call.entity'
import { MeetCallsController } from './meet-calls.controller'
import { MeetCallsService } from './meet-calls.service'
import { MeetController } from './meet.controller'
import { Meeting, MeetingAttendance, MeetingInvite } from './meet.entities'
import { MeetService } from './meet.service'

// B-ADD.15: الاجتماعات — صوت وصورة ومشاركة شاشة على خادم LiveKit عند الشركة، من غير أي تسجيل. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  // B-ADD.23: الاتصال من جوه النظام — مكالمة بين اتنين على نفس خادم الاجتماعات (meet-calls)
  imports: [TypeOrmModule.forFeature([Meeting, MeetingInvite, MeetingAttendance, MeetCall, User])],
  controllers: [MeetController, MeetCallsController],
  providers: [MeetService, MeetCallsService],
})
export class MeetModule {}
