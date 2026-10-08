import { Body, Controller, Get, Header, Headers, HttpCode, Ip, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { PUBLIC_CAREERS_FEATURE } from './careers'
import { OffersService } from './offers.service'

// القيم كلها بتتفحص في الخدمة برسايلها
class OfferDto {
  @IsOptional() candidateId?: unknown
  @IsOptional() salary?: unknown
  @IsOptional() startDate?: unknown
  @IsOptional() expiresOn?: unknown
  @IsOptional() notes?: unknown
}
class OfferActionDto {
  @IsOptional() action?: unknown
  @IsOptional() reason?: unknown
  @IsOptional() answer?: unknown
  @IsOptional() note?: unknown
}
class OfferAnswerDto {
  @IsOptional() answer?: unknown
  @IsOptional() note?: unknown
}

// B3.5-أ: عروض العمل — لمسؤول التوظيف (candidates.manage) ولمعتمد العروض (candidates.approve_offers)؛ كل إجراء بصلاحيته ونطاق فرع المرشح في الخدمة
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage', 'candidates.approve_offers')
@Controller('recruitment/offers')
export class RecruitmentOffersController {
  constructor(private readonly offers: OffersService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.offers.list(user)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: OfferDto) {
    return this.offers.create(user, dto)
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: OfferDto) {
    return this.offers.update(user, id, dto)
  }

  @Post(':id/act')
  @HttpCode(200)
  act(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: OfferActionDto) {
    return this.offers.act(user, id, dto.action, dto)
  }
}

/**
 * B3.5-أ: لينك رد المرشح على العرض — **من غير دخول عن قصد**: الرمز في اللينك هو الحق (بصمته بس المتخزّنة)، وبنفس ميزة صفحة الوظائف العامة
 * (المقفولة افتراضيًا = 404). الرد مرة واحدة وبدليله، والمحاولات محدودة بالعنوان.
 */
@RequireModule('recruitment')
@RequireFeature(PUBLIC_CAREERS_FEATURE)
@Controller('careers/offers')
export class OfferLinkController {
  constructor(private readonly offers: OffersService) {}

  @Get(':token')
  @Header('Cache-Control', 'no-store')
  view(@Param('token') token: string, @Ip() ip: string) {
    return this.offers.publicView(token, ip)
  }

  @Post(':token')
  @HttpCode(200)
  answer(@Param('token') token: string, @Body() dto: OfferAnswerDto, @Ip() ip: string, @Headers('user-agent') agent?: string) {
    return this.offers.publicAnswer(token, dto, { ip, agent })
  }
}
