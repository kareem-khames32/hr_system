import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { OffboardingService } from './offboarding.service'
// بنود التصفية اليدوية — رسائل تحقق عربية بدل رسائل class-validator الإنجليزية الخام
import { AddLineDto, UpdateLineDto } from './settlement-line.dto'
import { CUSTOM_TERMINATION_REASONS_MAX, TERMINATION_REASON_CODE } from './termination-reasons'

const YMD = /^\d{4}-\d{2}-\d{2}$/

// EMP-1: فتح ملف إنهاء خدمة من طرف الشركة (فصل/انتهاء عقد/وفاة/تقاعد...)
class CreateCaseDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف مطلوب' })
  employeeId: number

  // أساسي أو مخصص من الإعدادات — وجوده ومفعّل ولا لأ بيتفحص في الخدمة من القائمة الفعالة
  @IsString({ message: 'سبب الإنهاء غير معروف' })
  @Matches(TERMINATION_REASON_CODE, { message: 'سبب الإنهاء غير معروف' })
  reason: string

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

  @IsString({ message: 'سبب الإنهاء غير معروف' })
  @Matches(TERMINATION_REASON_CODE, { message: 'سبب الإنهاء غير معروف' })
  reason: string

  @Matches(YMD, { message: 'آخر يوم عمل مطلوب بصيغة YYYY-MM-DD' })
  lastWorkingDay: string
}

// سبب مخصص في قائمة الحفظ — الكود للموجود بس (الجديد من غير كود والخادم بيولّده). حدود المسمى (2–60 بعد
// التنضيف) والنسبة وعدم التكرار في الخدمة برسائل بالمسمى
class CustomTerminationReasonDto {
  @IsOptional()
  @IsString({ message: 'كود السبب غير معروف' })
  @MaxLength(30, { message: 'كود السبب غير معروف' })
  code?: string

  @IsString({ message: 'مسمى السبب مطلوب — من 2 لـ 60 حرف' })
  @MaxLength(200, { message: 'مسمى السبب بحد أقصى 60 حرف' })
  label: string

  // نسبة من مكافأة نهاية الخدمة: عشري من 0 لـ 1 أو كسر زي 1/3 (الرقم بيتقبل ويتحول نص)
  @Transform(({ value }) => (typeof value === 'number' ? String(value) : value))
  @IsString({ message: 'نسبة المكافأة مطلوبة — رقم من 0 لـ 1 أو كسر زي 1/3' })
  @MaxLength(20, { message: 'نسبة المكافأة مش صالحة — رقم من 0 لـ 1 أو كسر زي 1/3' })
  eosFactor: string

  @IsOptional()
  @IsBoolean({ message: 'تفعيل السبب true أو false' })
  active?: boolean
}

class SaveTerminationReasonsDto {
  @IsArray({ message: 'ابعت القائمة الكاملة للأسباب المخصصة (reasons)' })
  @ArrayMaxSize(CUSTOM_TERMINATION_REASONS_MAX, {
    message: `أقصى عدد للأسباب المخصصة ${CUSTOM_TERMINATION_REASONS_MAX} سبب`,
  })
  @ValidateNested({ each: true })
  @Type(() => CustomTerminationReasonDto)
  reasons: CustomTerminationReasonDto[]

  // بصمة القائمة من GET وقت فتح الشاشة — لو اتغيرت من حد تاني الحفظ بيترفض 409 (اختيارية لنداء مباشر)
  @IsOptional()
  @IsString({ message: 'بصمة القائمة نص' })
  @MaxLength(64, { message: 'بصمة القائمة غير صالحة' })
  revision?: string
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

  // قرار المالك 27 سبتمبر: أسباب إنهاء الخدمة — الثمانية الأساسية + المخصصة من «سياسات النظام».
  // القراءة لفاتح ملفات الإنهاء (قائمة المعالج) ولشاشة الإعدادات — قبل :id
  @Perm('offboarding.manage', 'settings.manage')
  @Get('termination-reasons')
  terminationReasons(@CurrentUser() user: JwtPayload) {
    return this.service.terminationReasons(user)
  }

  // حفظ القائمة الكاملة للأسباب المخصصة (المسمى والنسبة والتفعيل + الجديد) — لحساب على مستوى الشركة
  @Perm('settings.manage')
  @Put('termination-reasons')
  saveTerminationReasons(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveTerminationReasonsDto
  ) {
    return this.service.saveTerminationReasons(user, dto)
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
