import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { MeetCallsService } from './meet-calls.service'

// القيم بتتفحص في الخدمة برسايلها
class CallDto {
  @IsOptional() extension?: unknown
  @IsOptional() userId?: unknown
}

// B-ADD.23: الاتصال من جوه النظام — أي حساب موديول الاجتماعات مفتوح له يتصل بأي حساب نشط برقم تحويلته أو باسمه (تليفون داخلي)، والمكالمة
// نفسها لطرفيها بس (الفحص في الخدمة بالمكالمة نفسها؛ من غير صلاحية: مفيش إجراء إداري). رقم المكالمة في المسار هو كودها العشوائي.
@RequireModule('meet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('meet/calls')
export class MeetCallsController {
  constructor(private readonly calls: MeetCallsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.calls.list(user)
  }

  @Post()
  dial(@CurrentUser() user: JwtPayload, @Body() dto: CallDto) {
    return this.calls.dial(user, dto)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.detail(user, id)
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.accept(user, id)
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.reject(user, id)
  }

  @Post(':id/hangup')
  @HttpCode(200)
  hangup(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.hangup(user, id)
  }

  @Post(':id/token')
  @HttpCode(200)
  token(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.calls.token(user, id)
  }
}
