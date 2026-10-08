import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsOptional } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { RequireFeature, RequireModule } from '../modules-registry/module.guard'
import { SwapConsentsService } from './swap-consents.service'

// القيم بتتفحص في الخدمة برسايلها
class ConsentDto {
  @IsOptional() accept?: unknown
  @IsOptional() note?: unknown
}

// B5.5 (ج): موافقة الطرف التاني على تبديل الوردية — ميزة فرعية `shifts.swap_consent` (مقفولة افتراضيًا). خدمة ذاتية: الخدمة بتحكم بملف الموظف المربوط بالحساب
@RequireModule('shifts')
@RequireFeature('shifts.swap_consent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance/swap-consents')
export class SwapConsentsController {
  constructor(private readonly service: SwapConsentsService) {}

  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.mine(user)
  }

  @Post(':requestId')
  decide(@CurrentUser() user: JwtPayload, @Param('requestId', ParseIntPipe) requestId: number, @Body() dto: ConsentDto) {
    return this.service.decide(user, requestId, dto)
  }
}
