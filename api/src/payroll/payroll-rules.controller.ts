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
import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { LatenessTierMode } from './payroll-rules.entities'
import { PayrollRulesService } from './payroll-rules.service'

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

  @Perm('payroll.calculate')
  @Post('lateness-tiers')
  create(@Body() dto: TierDto) {
    return this.service.createTier(dto)
  }

  @Perm('payroll.calculate')
  @Patch('lateness-tiers/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<TierDto> & { isActive?: boolean }) {
    return this.service.updateTier(id, dto as any)
  }

  @Perm('payroll.calculate')
  @Delete('lateness-tiers/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTier(id)
  }
}
