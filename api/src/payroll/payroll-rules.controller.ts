import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Allow, IsIn, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { LatenessTierMode } from './payroll-rules.entities'
import { PayrollRulesService } from './payroll-rules.service'

// الخطوة 21: الشكل والقيم يُتحقق منهما في الخدمة برسائل عربية (validatePayrollLatenessTiers)
class TierSetDto {
  @Allow() effectivePeriod?: unknown
  @Allow() tiers?: unknown
  @IsOptional() @Allow() reason?: unknown
}
class TierSetReasonDto {
  @Allow() reason?: unknown
}

class TierDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromMinutes: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  toMinutes?: number

  @IsIn(['FRACTION', 'MINUTES'])
  mode: LatenessTierMode

  @IsOptional()
  @IsNumberString()
  value?: number

  @IsOptional()
  @IsString()
  label?: string
}

// معادلات الرواتب: إدارة شرائح التأخير — أدوار الإدارة فقط
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll/rules')
export class PayrollRulesController {
  constructor(private readonly service: PayrollRulesService) {}

  @Perm('payroll.view')
  @Get('lateness-tiers')
  list() {
    return this.service.listTiers()
  }

  // الخطوة 21: الجدول القديم أرشيف للقراءة فقط (410 LATE-TIERS-LEGACY-READONLY)
  @Perm('payroll.calculate')
  @Post('lateness-tiers')
  create(@Body() _dto: TierDto) {
    return this.service.legacyTierWritesClosed()
  }

  @Perm('payroll.calculate')
  @Patch('lateness-tiers/:id')
  update(@Param('id', ParseIntPipe) _id: number) {
    return this.service.legacyTierWritesClosed()
  }

  @Perm('payroll.calculate')
  @Delete('lateness-tiers/:id')
  remove(@Param('id', ParseIntPipe) _id: number) {
    return this.service.legacyTierWritesClosed()
  }

  // ===== الخطوة 21: مجموعات شرائح التأخير المؤرخة =====
  @Perm('payroll.view')
  @Get('lateness-tier-sets')
  listTierSets() {
    return this.service.listTierSets()
  }

  // معاينة بلا حفظ: التطبيع ورفض التداخل والفجوات والبصمة
  @Perm('payroll.view')
  @Post('lateness-tier-sets/preview')
  previewTierSet(@Body() dto: TierSetDto) {
    return this.service.previewTierSet(dto)
  }

  @Perm('payroll.policy.manage')
  @Post('lateness-tier-sets')
  createTierSet(@CurrentUser() user: JwtPayload, @Body() dto: TierSetDto) {
    assertCompanyWideWrite(user)
    return this.service.createTierSet(user, dto)
  }

  @Perm('payroll.policy.manage')
  @Post('lateness-tier-sets/:id/deactivate')
  deactivateTierSet(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: TierSetReasonDto) {
    assertCompanyWideWrite(user)
    return this.service.deactivateTierSet(user, id, dto)
  }
}
