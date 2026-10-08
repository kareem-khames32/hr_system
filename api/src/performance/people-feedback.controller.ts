import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { Feedback360Service } from './feedback360.service'
import { OneOnOnesService } from './one-on-ones.service'
import { RecognitionsService } from './recognitions.service'

// القيم بتتفحص في الخدمة برسايلها
class NominationDto {
  @IsOptional() cycleId?: unknown
  @IsOptional() reviewerEmployeeIds?: unknown
}
class DecisionDto {
  @IsOptional() action?: unknown
}
class UpwardDto {
  @IsOptional() cycleId?: unknown
  @IsOptional() subjectEmployeeId?: unknown
}
class FeedbackDto {
  @IsOptional() rating?: unknown
  @IsOptional() strengths?: unknown
  @IsOptional() improvements?: unknown
}
class MeetingDto {
  @IsOptional() employeeId?: unknown
  @IsOptional() meetingDate?: unknown
  @IsOptional() meetingTime?: unknown
  @IsOptional() agenda?: unknown
  @IsOptional() notes?: unknown
  @IsOptional() status?: unknown
}
class MeetingActionDto {
  @IsOptional() title?: unknown
  @IsOptional() assignee?: unknown
  @IsOptional() dueDate?: unknown
}
class RecognitionDto {
  @IsOptional() toEmployeeId?: unknown
  @IsOptional() message?: unknown
}

// B5.10 (أ): تقييم 360 — ميزة فرعية `performance.feedback360` (مقفولة افتراضيًا)
@RequireModule('performance')
@RequireFeature('performance.feedback360')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/feedback360')
export class Feedback360Controller {
  constructor(private readonly service: Feedback360Service) {}

  // الموظف: ترشيحاته والدعوات اللي عليه (الخدمة بتحكم بملف الموظف المربوط بالحساب)
  @Get('my')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post('my/nominations')
  nominate(@CurrentUser() user: JwtPayload, @Body() dto: NominationDto) {
    return this.service.nominate(user, dto)
  }

  @Post('invites/:id/respond')
  respond(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: FeedbackDto) {
    return this.service.respond(user, id, dto)
  }

  // المدير المباشر (موقع في الهيكل) أو صاحب performance.manage في نطاقه — الحكم في الخدمة تحت قفل صف الموظف
  @Get('team')
  team(@CurrentUser() user: JwtPayload) {
    return this.service.team(user)
  }

  @Post('invites/:id/decision')
  decide(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: DecisionDto) {
    return this.service.decide(user, id, dto)
  }

  @Get('results')
  results(@CurrentUser() user: JwtPayload, @Query('cycleId') cycleId?: string, @Query('employeeId') employeeId?: string) {
    return this.service.results(user, { cycleId, employeeId })
  }

  @Perm('performance.manage')
  @Post('upward')
  openUpward(@CurrentUser() user: JwtPayload, @Body() dto: UpwardDto) {
    return this.service.openUpward(user, dto)
  }
}

// B5.10 (ب): اجتماعات 1:1 — ميزة فرعية `performance.one_on_one` (مقفولة افتراضيًا)
@RequireModule('performance')
@RequireFeature('performance.one_on_one')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/one-on-ones')
export class OneOnOnesController {
  constructor(private readonly service: OneOnOnesService) {}

  // اجتماعات صاحب الحساب (طرف فيها)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  // المدير المباشر للموظف دلوقتي — الحكم في الخدمة تحت قفل صف الموظف
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: MeetingDto) {
    return this.service.create(user, dto)
  }

  // طرف من طرفي الاجتماع (الأجندة)، والمدير للباقي — الحكم في الخدمة تحت قفل صف الاجتماع
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MeetingDto) {
    return this.service.update(user, id, dto)
  }

  @Post(':id/actions')
  addAction(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: MeetingActionDto) {
    return this.service.addAction(user, id, dto)
  }
}

// B5.10 (ج): التقدير بين الزملاء — ميزة فرعية `performance.recognition` (مقفولة افتراضيًا)
@RequireModule('performance')
@RequireFeature('performance.recognition')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance/recognitions')
export class RecognitionsController {
  constructor(private readonly service: RecognitionsService) {}

  // قايمة فرع صاحب الحساب، وإرسال كلمة شكر لزميل فيه (الخدمة بتحكم بملف الموظف المربوط بالحساب)
  @Get()
  feed(@CurrentUser() user: JwtPayload) {
    return this.service.feed(user)
  }

  @Post()
  send(@CurrentUser() user: JwtPayload, @Body() dto: RecognitionDto) {
    return this.service.send(user, dto)
  }

  @Perm('performance.manage')
  @Delete(':id')
  hide(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.hide(user, id)
  }
}
