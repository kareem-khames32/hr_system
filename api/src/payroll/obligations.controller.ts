import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common'
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { ObligationType } from '../requests/entities/financial.entities'
import { ObligationsService } from './obligations.service'

class CreateObligationDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  @IsIn(['DEBIT', 'CREDIT'], { message: 'النوع: DEBIT أو CREDIT' })
  type: ObligationType

  @Type(() => Number)
  @IsNumber({}, { message: 'المبلغ رقم' })
  @Min(0.01, { message: 'المبلغ أكبر من صفر' })
  amount: number

  @IsString()
  label: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  effectiveDate?: string
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('obligations')
export class ObligationsController {
  constructor(private readonly service: ObligationsService) {}

  @Perm('payroll.view')
  @Get('employee/:id')
  listForEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.service.listByEmployee(id)
  }

  @Perm('payroll.calculate')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateObligationDto) {
    return this.service.create(user, dto)
  }

  @Perm('payroll.calculate')
  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancel(id)
  }
}
