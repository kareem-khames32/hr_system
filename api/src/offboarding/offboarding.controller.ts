import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { OffboardingService } from './offboarding.service'

class CompleteItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number
}

class AddLineDto {
  @IsString({ message: 'وصف البند مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  label: string

  @IsIn(['CREDIT', 'DEBIT'], { message: 'النوع: CREDIT أو DEBIT' })
  type: 'CREDIT' | 'DEBIT'

  @Type(() => Number)
  @IsNumber({}, { message: 'المبلغ رقم' })
  amount: number
}

class UpdateLineDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  label?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'المبلغ رقم' })
  amount?: number
}

// إنهاء الخدمة: إخلاء الطرف (الجهات تعتمد بنودها) + التصفية
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly service: OffboardingService) {}

  @Perm('offboarding.manage')
  @Get()
  list() {
    return this.service.list()
  }

  // التفاصيل مفتوحة للجهات المشاركة (الفرض الفعلي على الأفعال)
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id)
  }

  // إتمام بند — التفويض بالجهة داخل الخدمة (مدير مباشر/عهدة/IT/مالية/HR)
  @Post('items/:itemId/complete')
  completeItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: CompleteItemDto
  ) {
    return this.service.completeItem(user, itemId, dto)
  }

  // بنود التصفية
  @Perm('settlement.edit')
  @Post(':id/lines')
  addLine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLineDto
  ) {
    return this.service.addLine(id, dto)
  }

  @Perm('settlement.edit')
  @Patch('lines/:lineId')
  updateLine(
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateLineDto
  ) {
    return this.service.updateLine(lineId, dto)
  }

  // اعتماد التصفية — قفل نهائي
  @Perm('settlement.approve')
  @Post(':id/approve-settlement')
  approve(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.approveSettlement(user, id)
  }
}
