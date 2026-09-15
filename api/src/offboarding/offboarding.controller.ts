import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { TERMINATION_REASONS, type TerminationReason } from './offboarding.entities'
import { OffboardingService } from './offboarding.service'
// بنود التصفية اليدوية — رسائل تحقق عربية بدل رسائل class-validator الإنجليزية الخام
import { AddLineDto, UpdateLineDto } from './settlement-line.dto'

const YMD = /^\d{4}-\d{2}-\d{2}$/

// EMP-1: فتح ملف إنهاء خدمة من طرف الشركة (فصل/انتهاء عقد/وفاة/تقاعد...)
class CreateCaseDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  @IsIn([...TERMINATION_REASONS], { message: 'سبب الإنهاء غير معروف' })
  reason: TerminationReason

  @Matches(YMD, { message: 'آخر يوم عمل مطلوب بصيغة YYYY-MM-DD' })
  lastWorkingDay: string

  @IsOptional()
  @Matches(YMD, { message: 'تاريخ الإشعار بصيغة YYYY-MM-DD' })
  noticeDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  exitInterviewNotes?: string

  // إيقاف حساب الدخول فوراً (الوفاة توقفه دائماً)
  @IsOptional()
  @IsBoolean()
  revokeAccess?: boolean
}

// معاينة المعالج: المكافأة والتصفية بسبب الإنهاء وآخر يوم عمل (بلا حفظ)
class PreviewQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  @IsIn([...TERMINATION_REASONS], { message: 'سبب الإنهاء غير معروف' })
  reason: TerminationReason

  @Matches(YMD, { message: 'آخر يوم عمل مطلوب بصيغة YYYY-MM-DD' })
  lastWorkingDay: string
}

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

// إنهاء الخدمة: إخلاء الطرف (الجهات تعتمد بنودها) + التصفية
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offboarding')
export class OffboardingController {
  constructor(private readonly service: OffboardingService) {}

  @Perm('offboarding.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  // ملفي النشط (خدمة ذاتية) — قبل :id عشان الراوتر ما يبلعهاش
  @Get('mine')
  mine(@CurrentUser() user: JwtPayload) {
    return this.service.myActiveCase(user)
  }

  // بنود إخلاء عليّ (جهة/مدير مباشر/HR) — قبل :id
  @Get('my-items')
  myItems(@CurrentUser() user: JwtPayload) {
    return this.service.myItems(user)
  }

  // EMP-1: معاينة معالج «إنهاء الخدمة» في ملف الموظف — قبل :id
  @Perm('offboarding.manage')
  @Get('preview')
  preview(@CurrentUser() user: JwtPayload, @Query() q: PreviewQueryDto) {
    return this.service.preview(user, q)
  }

  // EMP-1: إنهاء خدمة من طرف الشركة — فترة إشعار + ملف إخلاء بجهاته الخمس
  @Perm('offboarding.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCaseDto) {
    return this.service.create(user, dto)
  }

  // EMP-3: تشغيل يدوي للإنهاء المستحق (تصفية معتمدة وآخر يوم عمل حلّ) — نفس
  // مهمة 00:30 ولحاق الإقلاع، بنطاق فرع المنفّذ
  @Perm('offboarding.manage')
  @Post('finalize-due')
  finalizeDue(@CurrentUser() user: JwtPayload) {
    return this.service.finalizeDueFor(user)
  }

  // التفاصيل: HR، أصحاب التصفية، الموظف نفسه، مديره المباشر، وجهة إخلاء لها
  // بند في الملف — والفرض داخل الخدمة (403 لغيرهم، خارج فرع الموظف 404،
  // والمبالغ لأصحاب التصفية)
  @Get(':id')
  detail(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.detail(id, user)
  }

  // التراجع عن الاستقالة خلال فترة الإشعار — الموظف نفسه أو HR
  @Post(':id/withdraw')
  withdraw(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.withdraw(user, id)
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
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLineDto
  ) {
    return this.service.addLine(user, id, dto)
  }

  @Perm('settlement.edit')
  @Patch('lines/:lineId')
  updateLine(
    @CurrentUser() user: JwtPayload,
    @Param('lineId', ParseIntPipe) lineId: number,
    @Body() dto: UpdateLineDto
  ) {
    return this.service.updateLine(user, lineId, dto)
  }

  // حذف بند قبل الاعتماد — الآلي يرجع بإعادة التوليد
  @Perm('settlement.edit')
  @Delete('lines/:lineId')
  deleteLine(
    @CurrentUser() user: JwtPayload,
    @Param('lineId', ParseIntPipe) lineId: number
  ) {
    return this.service.deleteLine(user, lineId)
  }

  // إعادة توليد البنود التلقائية من الأرقام الحالية (اليدوي لا يُمس)
  @Perm('settlement.edit')
  @Post(':id/recalc-lines')
  recalcLines(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.service.recalcLines(user, id)
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
