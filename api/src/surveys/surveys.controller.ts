import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { SurveysService } from './surveys.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class SurveyDto {
  @IsOptional() title?: unknown
  @IsOptional() kind?: unknown
  @IsOptional() audience?: unknown
  @IsOptional() isAnonymous?: unknown
  @IsOptional() minGroup?: unknown
  @IsOptional() questions?: unknown
  @IsOptional() closeDate?: unknown
}
class RespondDto {
  @IsOptional() answers?: unknown
}

// B3.13: الاستبيانات — الإدارة والنتايج بصلاحيتها (والنطاق في الخدمة)؛ و«استبياناتي» والرد للموظف المدعو
@RequireModule('surveys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Perm('surveys.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.surveys.list(user)
  }

  @Perm('surveys.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: SurveyDto) {
    return this.surveys.create(user, dto)
  }

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.surveys.mine(user)
  }

  @Perm('surveys.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: SurveyDto) {
    return this.surveys.update(user, id, dto)
  }

  @Perm('surveys.manage')
  @Post(':id/open')
  @HttpCode(200)
  open(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.surveys.open(user, id)
  }

  @Perm('surveys.manage')
  @Post(':id/close')
  @HttpCode(200)
  close(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.surveys.close(user, id)
  }

  @Perm('surveys.manage')
  @Get(':id/results')
  results(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.surveys.results(user, id)
  }

  @Get(':id')
  form(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.surveys.form(user, id)
  }

  @Post(':id/respond')
  @HttpCode(200)
  respond(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RespondDto) {
    return this.surveys.respond(user, id, dto.answers)
  }
}
