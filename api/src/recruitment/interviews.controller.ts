import { Body, Controller, Get, Header, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { InterviewsService } from './interviews.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class InterviewDto {
  @IsOptional() candidateId?: unknown
  @IsOptional() scheduledAt?: unknown
  @IsOptional() durationMinutes?: unknown
  @IsOptional() mode?: unknown
  @IsOptional() location?: unknown
  @IsOptional() notes?: unknown
  @IsOptional() interviewerEmployeeIds?: unknown
}
class InterviewStatusDto {
  @IsOptional() status?: unknown
}
class ScorecardDto {
  @IsOptional() rating?: unknown
  @IsOptional() recommendation?: unknown
  @IsOptional() notes?: unknown
}

// B3.4-ب: المقابلات لمسؤول التوظيف — بصلاحية إدارة التوظيف، وبنطاق فرع المرشح في الخدمة
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage')
@Controller('recruitment/interviews')
export class RecruitmentInterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.interviews.list(user)
  }

  // قبل ‎:id (مسار ثابت)
  @Get('form')
  form(@CurrentUser() user: JwtPayload) {
    return this.interviews.formData(user)
  }

  @Post()
  schedule(@CurrentUser() user: JwtPayload, @Body() dto: InterviewDto) {
    return this.interviews.schedule(user, dto)
  }

  @Post(':id/status')
  @HttpCode(200)
  close(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: InterviewStatusDto) {
    return this.interviews.close(user, id, dto.status)
  }
}

// B3.4-ب: «مقابلاتي» للمحاور نفسه (من غير صلاحية): الحق جوه الخدمة — حساب مربوط بموظف اسمه في المقابلة. وملف الدعوة لمسؤول التوظيف أو المحاور
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard)
@Controller('recruitment/my-interviews')
export class MyInterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  mine(@CurrentUser() user: JwtPayload) {
    return this.interviews.mine(user)
  }

  @Post(':id/scorecard')
  @HttpCode(200)
  submit(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: ScorecardDto) {
    return this.interviews.submit(user, id, dto)
  }

  @Get(':id/ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="interview.ics"')
  @Header('Cache-Control', 'private, no-store')
  ics(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.interviews.ics(user, id)
  }
}
