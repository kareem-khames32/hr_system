import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { PROBATION_DECISIONS, PROBATION_REASON_MAX, type ProbationDecision } from './probation'
import { ProbationService } from './probation.service'

class ProbationDecisionDto {
  @IsIn(PROBATION_DECISIONS, { message: 'القرار: CONFIRM (تثبيت) أو EXTEND (تمديد) أو TERMINATE (إنهاء)' })
  decision: ProbationDecision

  @IsOptional()
  @IsString({ message: 'تاريخ نهاية التجربة الجديد نص بالصيغة YYYY-MM-DD' })
  @MaxLength(10, { message: 'تاريخ نهاية التجربة الجديد غير صالح — الصيغة YYYY-MM-DD' })
  newEndDate?: string

  @IsOptional()
  @IsString({ message: 'سبب القرار نص' })
  @MaxLength(PROBATION_REASON_MAX, { message: `سبب القرار لا يتجاوز ${PROBATION_REASON_MAX} حرف` })
  reason?: string
}

// B3.1-ج: فترات التجربة — القايمة والقرار. من غير صلاحية على المسار: الحق جوه الخدمة (عرض الموظفين بنطاق الفروع، أو المدير المباشر
// لمرؤوسيه؛ والقرار للمدير المباشر أو الموارد البشرية في فرع الموظف)
@RequireModule('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('probation')
export class ProbationController {
  constructor(private readonly probation: ProbationService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.probation.list(user)
  }

  @Post(':employeeId/decision')
  @HttpCode(200)
  decide(@CurrentUser() user: JwtPayload, @Param('employeeId', ParseIntPipe) employeeId: number, @Body() dto: ProbationDecisionDto) {
    return this.probation.decide(user, employeeId, dto)
  }
}
