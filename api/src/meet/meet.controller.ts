import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { MeetCallsService } from './meet-calls.service'
import { MeetService } from './meet.service'

// القيم بتتفحص في الخدمة برسايلها
class MeetingDto {
  @IsOptional() title?: unknown
  @IsOptional() startsAt?: unknown
  @IsOptional() lobby?: unknown
  @IsOptional() inviteUserIds?: unknown
  // B-ADD.22: «على مين؟» بالاستهداف الموحد (وقت الإنشاء بس)
  @IsOptional() audience?: unknown
}
class ParticipantDto {
  @IsOptional() userId?: unknown
  @IsOptional() track?: unknown
}

// B-ADD.15: الاجتماعات — أي حساب الموديول مفتوح له يعمل اجتماع ويدخل اللي مدعو له؛ ومين صاحب الاجتماع ومين مدعو بيتحكم في الخدمة بالاجتماع نفسه
// (من غير صلاحية: مفيش إجراء إداري). رقم الاجتماع في المسار هو كوده العشوائي.
@RequireModule('meet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meet')
export class MeetController {
  constructor(private readonly meet: MeetService, private readonly calls: MeetCallsService) {}

  // B-ADD.23: والمكالمات اللي بترن عند الحساب في نفس السؤال الدوري
  @Get('inbox')
  async inbox(@CurrentUser() user: JwtPayload) {
    return { ...(await this.meet.inbox(user)), calls: await this.calls.ringing(user) }
  }

  @Get('directory')
  directory(@CurrentUser() user: JwtPayload) {
    return this.meet.directory(user)
  }

  @Get('rooms')
  list(@CurrentUser() user: JwtPayload) {
    return this.meet.list(user)
  }

  @Post('rooms')
  create(@CurrentUser() user: JwtPayload, @Body() dto: MeetingDto) {
    return this.meet.create(user, dto)
  }

  @Get('rooms/:id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.detail(user, id)
  }

  @Patch('rooms/:id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MeetingDto) {
    return this.meet.update(user, id, dto)
  }

  @Delete('rooms/:id')
  @HttpCode(200)
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.cancel(user, id)
  }

  @Post('rooms/:id/token')
  @HttpCode(200)
  token(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.token(user, id)
  }

  @Post('rooms/:id/knock')
  @HttpCode(200)
  knock(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.knock(user, id)
  }

  @Get('rooms/:id/knock')
  knockState(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.knockState(user, id)
  }

  @Delete('rooms/:id/knock')
  @HttpCode(200)
  cancelKnock(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.cancelKnock(user, id)
  }

  @Post('rooms/:id/admit')
  @HttpCode(200)
  admit(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ParticipantDto) {
    return this.meet.admit(user, id, dto)
  }

  @Post('rooms/:id/deny')
  @HttpCode(200)
  deny(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ParticipantDto) {
    return this.meet.deny(user, id, dto)
  }

  @Post('rooms/:id/decline')
  @HttpCode(200)
  decline(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.decline(user, id)
  }

  @Post('rooms/:id/mute')
  @HttpCode(200)
  mute(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ParticipantDto) {
    return this.meet.mute(user, id, dto)
  }

  @Post('rooms/:id/remove')
  @HttpCode(200)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ParticipantDto) {
    return this.meet.remove(user, id, dto)
  }

  @Post('rooms/:id/end')
  @HttpCode(200)
  end(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.meet.end(user, id)
  }
}
