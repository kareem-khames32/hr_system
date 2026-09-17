import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { AttendanceService, PunchDto } from './attendance.service'
import { DeviceSyncService } from './device-sync.service'

// عنصر البصمة داخل الدفعة — يُتحقق منه عنصراً عنصراً: عنصر بلا وقت كان يرمي
// TypeError (500) ويُسقط الدفعة كلها، وكود أطول من العمود (20) يفشل في القاعدة.
// كود الجهاز الرقمي (ZKTeco userId) يُقبل ويُحوَّل نصاً
class PunchItemDto implements PunchDto {
  @Transform(({ value }) =>
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : value
  )
  @IsString({ message: 'كود الموظف (employeeCode) مطلوب في كل بصمة' })
  @IsNotEmpty({ message: 'كود الموظف (employeeCode) مطلوب في كل بصمة' })
  @MaxLength(20, { message: 'كود الموظف في البصمة لا يتجاوز 20 خانة' })
  employeeCode: string

  @IsString({ message: 'وقت البصمة (timestamp) مطلوب في كل بصمة' })
  @MaxLength(40, { message: 'وقت البصمة (timestamp) غير صالح' })
  timestamp: string

  @IsOptional()
  @IsString({ message: 'رقم الجهاز (deviceSn) نص' })
  @MaxLength(50, { message: 'رقم الجهاز (deviceSn) لا يتجاوز 50 خانة' })
  deviceSn?: string
}

class IngestDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PunchItemDto)
  punches: PunchItemDto[]
}

// الإدخال اليدوي: نفس دفعة البصمات + سبب الإدخال (يُحفظ على كل بصمة مع مُدخِلها)
class ManualIngestDto extends IngestDto {
  @IsOptional()
  @IsString({ message: 'سبب الإدخال اليدوي نص' })
  @MaxLength(500, { message: 'سبب الإدخال اليدوي لا يتجاوز 500 حرف' })
  reason?: string
}

// سطر الجدول الأسبوعي — يُتحقق منه سطراً سطراً (ValidateNested أدناه): بدونه لم تكن
// هذه القواعد تعمل، وسطر بلا employeeId كان يصير NaN في الاستعلام (500 بدل 400)
class ScheduleEntryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية الأسبوع (weekStart) بصيغة YYYY-MM-DD' })
  weekStart: string

  @Type(() => Number)
  @IsInt({ message: 'الموظف (employeeId) مطلوب في كل سطر — رقم صحيح' })
  @Min(1, { message: 'الموظف (employeeId) مطلوب في كل سطر — رقم صحيح' })
  employeeId: number

  // مرجع الوردية في الكتالوج — تُرسله شاشة الجدولة (whitelist يحذف غير المُعلَن)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'مرجع الوردية (shiftId) رقم صحيح' })
  @Min(1, { message: 'مرجع الوردية (shiftId) رقم صحيح' })
  shiftId?: number

  // الاسم والأوقات لقطة احتياطية — تلزم فقط بلا shiftId (عميل قديم يُربط بالاسم)؛
  // مع shiftId تُملأ من الكتالوج في الخدمة
  @ValidateIf((o: ScheduleEntryDto) => !o.shiftId)
  @IsString({ message: 'اسم الوردية (shiftName) مطلوب' })
  @IsNotEmpty({ message: 'اسم الوردية (shiftName) مطلوب' })
  @MaxLength(100, { message: 'اسم الوردية لا يتجاوز 100 حرف' })
  shiftName: string

  @ValidateIf((o: ScheduleEntryDto) => !o.shiftId)
  @Matches(/^\d{2}:\d{2}$/, { message: 'بداية الوردية (startTime) بصيغة HH:mm' })
  startTime: string

  @ValidateIf((o: ScheduleEntryDto) => !o.shiftId)
  @Matches(/^\d{2}:\d{2}$/, { message: 'نهاية الوردية (endTime) بصيغة HH:mm' })
  endTime: string
}

class UpsertScheduleDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  entries: ScheduleEntryDto[]
}

// تجاوز وردية يوم — كان جسماً بنوع مضمَّن بلا تحقق: employeeId الناقص كان يُسقط
// شرطه في TypeORM فيُفحص نطاق موظف آخر ويُكتب فوق تجاوز موظف في فرع آخر.
// الأوقات تُفحص بدقة في الخدمة (ولا تلزم مع clear)
class DayOverrideDto {
  @Type(() => Number)
  @IsInt({ message: 'الموظف (employeeId) مطلوب — رقم صحيح' })
  @Min(1, { message: 'الموظف (employeeId) مطلوب — رقم صحيح' })
  employeeId: number

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ غير صالح — الصيغة YYYY-MM-DD' })
  date: string

  // مرجع الوردية في الكتالوج — به يتم الربط (الاسم والأوقات لقطة تُملأ منه)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'مرجع الوردية (shiftId) رقم صحيح' })
  @Min(1, { message: 'مرجع الوردية (shiftId) رقم صحيح' })
  shiftId?: number

  @IsOptional()
  @IsString({ message: 'اسم الوردية (shiftName) نص' })
  @MaxLength(100, { message: 'اسم الوردية لا يتجاوز 100 حرف' })
  shiftName?: string

  @IsOptional()
  @IsString({ message: 'بداية الوردية (startTime) بصيغة HH:mm' })
  startTime?: string

  @IsOptional()
  @IsString({ message: 'نهاية الوردية (endTime) بصيغة HH:mm' })
  endTime?: string

  @IsOptional()
  @IsBoolean({ message: 'clear قيمة منطقية (true/false)' })
  clear?: boolean
}

// تجاوز وردية يوم لمجموعة موظفين — كان جسماً بنوع مضمَّن بلا تحقق، وshiftId يُتجاهل
// فيُربط التجاوز بالاسم. التواريخ تُفحص تقويمياً والأوقات بدقة في الخدمة
class DayOverridesBulkDto {
  @IsArray({ message: 'الموظفون (employeeIds) قائمة أرقام' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'الموظفون (employeeIds) أرقام صحيحة' })
  employeeIds: number[]

  @IsArray({ message: 'الأيام (dates) قائمة تواريخ بصيغة YYYY-MM-DD' })
  @IsString({ each: true, message: 'الأيام (dates) بصيغة YYYY-MM-DD' })
  dates: string[]

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'مرجع الوردية (shiftId) رقم صحيح' })
  @Min(1, { message: 'مرجع الوردية (shiftId) رقم صحيح' })
  shiftId?: number

  @IsOptional()
  @IsString({ message: 'اسم الوردية (shiftName) نص' })
  @MaxLength(100, { message: 'اسم الوردية لا يتجاوز 100 حرف' })
  shiftName?: string

  @IsOptional()
  @IsString({ message: 'بداية الوردية (startTime) بصيغة HH:mm' })
  startTime?: string

  @IsOptional()
  @IsString({ message: 'نهاية الوردية (endTime) بصيغة HH:mm' })
  endTime?: string

  @IsOptional()
  @IsBoolean({ message: 'clear قيمة منطقية (true/false)' })
  clear?: boolean
}

// إسناد وردية لمدة (شهر أو أي مدى) لمجموعة موظفين مرة واحدة — التحقق التقويمي
// وسريان الوردية في كل يوم ونطاق الفرع في الخدمة
class ScheduleRangeDto {
  // موظفين بالاسم و/أو فرق (teamIds) — الخدمة بتجيب أعضاء الفرق؛ لازم واحد منهم على الأقل
  @IsOptional()
  @IsArray({ message: 'الموظفون (employeeIds) قائمة أرقام' })
  @ArrayMaxSize(500, { message: 'الدفعة الواحدة لا تزيد عن 500 موظف' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'الموظفون (employeeIds) أرقام صحيحة' })
  @Min(1, { each: true, message: 'الموظفون (employeeIds) أرقام صحيحة' })
  employeeIds?: number[]

  @IsOptional()
  @IsArray({ message: 'الفرق (teamIds) قائمة أرقام' })
  @ArrayMaxSize(100, { message: 'الدفعة الواحدة لا تزيد عن 100 فريق' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'الفرق (teamIds) أرقام صحيحة' })
  @Min(1, { each: true, message: 'الفرق (teamIds) أرقام صحيحة' })
  teamIds?: number[]

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'من تاريخ (from) بصيغة YYYY-MM-DD' })
  from: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'إلى تاريخ (to) بصيغة YYYY-MM-DD' })
  to: string

  // أيام الأسبوع (0 = الأحد … 6 = السبت) — فاضية = كل أيام المدة
  @IsOptional()
  @IsArray({ message: 'أيام الأسبوع (weekdays) قائمة أرقام' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'أيام الأسبوع أرقام من 0 إلى 6' })
  @Min(0, { each: true, message: 'أيام الأسبوع أرقام من 0 إلى 6' })
  @Max(6, { each: true, message: 'أيام الأسبوع أرقام من 0 إلى 6' })
  weekdays?: number[]

  @Type(() => Number)
  @IsInt({ message: 'الوردية (shiftId) مطلوبة — رقم صحيح' })
  @Min(1, { message: 'الوردية (shiftId) مطلوبة — رقم صحيح' })
  shiftId: number

  // true = الأيام الخاصة المسجلة جوه المدة تفضل زي ما هي
  @IsOptional()
  @IsBoolean({ message: 'keepDayOverrides قيمة منطقية (true/false)' })
  keepDayOverrides?: boolean
}

// فترة فتح/قفل الإضافي — كان جسمًا بنوع مضمَّن بلا تحقق
class OvertimePeriodDto {
  @IsString({ message: 'اسم الفترة مطلوب' })
  @IsNotEmpty({ message: 'اسم الفترة مطلوب' })
  @MaxLength(200, { message: 'اسم الفترة لا يتجاوز 200 حرف' })
  name: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'من تاريخ بصيغة YYYY-MM-DD' })
  fromDate: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'إلى تاريخ بصيغة YYYY-MM-DD' })
  toDate: string

  @IsIn(['OPEN', 'CLOSED'], { message: 'الأثر: OPEN أو CLOSED' })
  effect: 'OPEN' | 'CLOSED'

  // فاضي/null = كل الفروع
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'الفرع (branchId) رقم صحيح' })
  @Min(1, { message: 'الفرع (branchId) رقم صحيح' })
  branchId?: number | null
}

class ConfirmOvertimeDto {
  @IsBoolean()
  approve: boolean

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}

class OvertimePreviewDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestId?: number
}

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly service: AttendanceService,
    private readonly deviceSync: DeviceSyncService
  ) {}

  // استقبال بصمات ZKTeco — بمفتاح جهاز (x-device-key) بدون JWT
  // الجهاز/الوسيط يبعت دفعات: {punches: [{employeeCode, timestamp, deviceSn}]}
  @Post('punches')
  ingest(@Body() dto: IngestDto, @Headers('x-device-key') deviceKey?: string) {
    return this.service.ingest(dto.punches, deviceKey)
  }

  // رفع يدوي من الأدمن/HR بنفس الصيغة (بدون مفتاح جهاز)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('punches/manual')
  ingestManual(@Body() dto: ManualIngestDto, @CurrentUser() user: JwtPayload) {
    return this.service.ingest(dto.punches, undefined, user, { reason: dto.reason })
  }

  // بصمات بلا موظف مطابق مجمّعة بالكود — لوحة «أكواد غير مربوطة» في شاشة الأجهزة
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.sync', 'attendance.manage')
  @Get('punches/unmatched')
  unmatchedPunches(@CurrentUser() user: JwtPayload) {
    return this.deviceSync.unmatchedPunches(user)
  }

  // سجل البصمات بمصدرها لشهر (?source=MANUAL&month=YYYY-MM) — شاشة الإدخال اليدوي:
  // من أدخلها ولماذا وحالة يومها، بنطاق الفرع
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage', 'attendance.view_all')
  @Get('punches')
  listPunches(
    @CurrentUser() user: JwtPayload,
    @Query('source') source?: string,
    @Query('month') month?: string
  ) {
    return this.service.listPunches(user, { source, month })
  }

  // حذف بصمة يدوية + إعادة حساب يومها (بصمة الجهاز لا تُحذف)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Delete('punches/:id')
  deleteManualPunch(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.service.deleteManualPunch(user, id)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule')
  upsertSchedule(@Body() dto: UpsertScheduleDto, @CurrentUser() user: JwtPayload) {
    return this.service.upsertSchedule(dto.entries, user)
  }

  // قراءة الجدول: لمن يرى حضور النطاق فقط، ومقصورة على موظفي فرعه
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.view_all')
  @Get('schedule')
  weekSchedule(@Query('week') week: string, @CurrentUser() user: JwtPayload) {
    return this.service.weekSchedule(week, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Delete('schedule/:weekStart/:employeeId')
  clearWeekSchedule(@Param('weekStart') week: string, @Param('employeeId', ParseIntPipe) employeeId: number, @CurrentUser() user: JwtPayload) {
    return this.service.clearWeekSchedule(week, employeeId, user)
  }

  // تجاوز وردية يوم بعينه (حالة خاصة) — أو مسحه بـ clear:true
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule/day')
  setDayOverride(@Body() dto: DayOverrideDto, @CurrentUser() user: JwtPayload) {
    return this.service.setDayOverride(dto, user)
  }

  // تجاوز وردية يوم لمجموعة موظفين دفعة واحدة (نطاق: شركة/فرع/قسم)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule/day/bulk')
  setDayOverridesBulk(@Body() dto: DayOverridesBulkDto, @CurrentUser() user: JwtPayload) {
    return this.service.setDayOverridesBulk(dto, user)
  }

  // إسناد وردية لمدة (من تاريخ لتاريخ، واختياريًا أيام أسبوع بعينها) لمجموعة موظفين
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule/range')
  assignScheduleRange(@Body() dto: ScheduleRangeDto, @CurrentUser() user: JwtPayload) {
    return this.service.assignScheduleRange(dto, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.view_all')
  @Get('schedule/day-overrides')
  weekDayOverrides(@Query('week') week: string, @CurrentUser() user: JwtPayload) {
    return this.service.weekDayOverrides(week, user)
  }

  // ===== قواعد استثناء أيام العمل (آخر سبت = دوام رسمي...) =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('settings.manage', 'org.manage', 'employees.edit', 'attendance.manage')
  @Get('calendar-context')
  calendarContext(@Query('scope') scope: 'GLOBAL' | 'BRANCH' | 'EMPLOYEE', @Query('sourceId') sourceId: string, @CurrentUser() user: JwtPayload) {
    return this.service.calendarContext(user, scope, Number(sourceId))
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('settings.manage', 'org.manage', 'employees.edit')
  @Post('calendar-context/confirm')
  confirmCalendarContext(@Body() body: { scope: 'GLOBAL' | 'BRANCH' | 'EMPLOYEE'; sourceId: number; calendarChange: unknown }, @CurrentUser() user: JwtPayload) {
    return this.service.confirmCalendarContext(user, body.scope, body.sourceId, body.calendarChange)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Get('schedule-rules')
  listScheduleRules(@CurrentUser() user: JwtPayload) {
    return this.service.listScheduleRules(user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('schedule-rules')
  createScheduleRule(
    @Body()
    dto: {
      name: string
      weekday: string
      occurrence: string
      effect: string
      branchId?: number | null
      calendarChange?: unknown
    },
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.createScheduleRule(dto, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Patch('schedule-rules/:id')
  updateScheduleRule(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, any>,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.updateScheduleRule(id, dto, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Delete('schedule-rules/:id')
  deleteScheduleRule(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload, @Body() body: { calendarChange?: unknown } = {}) {
    return this.service.deleteScheduleRule(id, user, body.calendarChange)
  }

  // ===== فترات فتح/قفل الأوفرتايم بالتواريخ =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Get('overtime-periods')
  listOvertimePeriods(@CurrentUser() user: JwtPayload) {
    return this.service.listOvertimePeriods(user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('overtime-periods')
  createOvertimePeriod(@Body() dto: OvertimePeriodDto, @CurrentUser() user: JwtPayload) {
    return this.service.createOvertimePeriod(dto, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Patch('overtime-periods/:id')
  updateOvertimePeriod(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Record<string, any>,
    @CurrentUser() user: JwtPayload
  ) {
    return this.service.updateOvertimePeriod(id, dto, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Delete('overtime-periods/:id')
  deleteOvertimePeriod(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.service.deleteOvertimePeriod(id, user)
  }

  // أيام العمل الفعلية في مدى (خدمة ذاتية) — لتلميح نموذج الإجازة:
  // «سيُخصم X يوم فقط — Y يوم عطلة داخل المدى»
  @UseGuards(JwtAuthGuard)
  @Get('working-days')
  workingDays(
    @CurrentUser() user: JwtPayload,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('self') self?: string,
    @Query('employeeId') employeeId?: string
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(from ?? '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to ?? '')
    ) {
      return { total: 0, working: 0, skipped: [] }
    }
    // self=1 (نماذج الإجازة): حساب الموظف نفسه كما يُخصم عند التقديم (فرعه +
    // ويك إند جدول عمله) — وإلا يختلف المعروض عن المخصوم لمن له جدول بعطلة مختلفة.
    // الافتراضي بفرع المستخدم كما كان: الجدول الأسبوعي يبني عليه تمييز أيام الاستثناء
    if (employeeId !== undefined) return this.service.employeeWorkingDays(user, Number(employeeId), from, to)
    return (self === '1' || self === 'true') && user.employeeId
      ? this.service.workingDaysForEmployee(user.employeeId, from, to)
      // حساب بلا فرع (مدير النظام) بياخد أول فرع فعّال بدل فرع رقم 1 اللي ممكن يكون مش موجود
      : this.service.workingDaysForBranchOrDefault(user.branchId ?? null, from, to)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.view_all')
  @Get('daily')
  daily(@CurrentUser() user: JwtPayload, @Query('date') date: string) {
    return this.service.daily(user, date)
  }

  @UseGuards(JwtAuthGuard)
  @Get('monthly')
  monthly(
    @CurrentUser() user: JwtPayload,
    @Query('employeeId', ParseIntPipe) employeeId: number,
    @Query('month') month: string
  ) {
    return this.service.monthly(user, employeeId, month)
  }

  // يومي (لوحة الموظف — خدمة ذاتية): وردية اليوم وبصمته وحالته لصاحب الحساب فقط —
  // بلا معامل موظف فلا يُقرأ به يوم غيره. null = حساب غير مرتبط بملف موظف
  @UseGuards(JwtAuthGuard)
  @Get('my-today')
  myToday(@CurrentUser() user: JwtPayload) {
    return user.employeeId ? this.service.myToday(user.employeeId) : null
  }

  // الأوفرتايم المكتشف من البصمة بانتظار تأكيد المدير
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('overtime.confirm')
  @Get('overtime/pending')
  pendingOvertime(@CurrentUser() user: JwtPayload) {
    return this.service.pendingOvertime(user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('overtime/preview')
  overtimePreview(@CurrentUser() user: JwtPayload, @Query() dto: OvertimePreviewDto) {
    return this.service.overtimePreview(user, dto.date, dto.employeeId, dto.requestId)
  }

  // سجل الأوفرتايم لشهر (?month=YYYY-MM) بكل الحالات وحالة الطلب المرتبط + الإعداد
  // الحيّ «المكتشف يتطلب تأكيداً» — لمن يرى حضور النطاق (التأكيد لصاحب الصلاحية فقط)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('overtime.confirm', 'attendance.view_all')
  @Get('overtime')
  overtimeLog(@CurrentUser() user: JwtPayload, @Query('month') month?: string) {
    return this.service.overtimeLog(user, month)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('overtime.confirm')
  @Post('overtime/:id/confirm')
  confirmOvertime(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmOvertimeDto
  ) {
    return this.service.confirmOvertime(user, id, dto.approve, dto.reason)
  }

  // إعادة حساب يوم بأثر رجعي (بعد تصحيح بصمة/تعديل جدول) — بنطاق فرع المستخدم
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.manage')
  @Post('recompute')
  recompute(@Query('date') date: string, @CurrentUser() user: JwtPayload) {
    return this.service.recomputeDate(date, user)
  }

  // ===== مزامنة أجهزة البصمة (سحب بالـ IP) =====
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.sync')
  @Post('devices/:id/sync')
  syncDevice(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.deviceSync.syncDevice(id, user)
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Perm('attendance.sync')
  @Post('devices/sync-all')
  syncAll(@CurrentUser() user: JwtPayload) {
    return this.deviceSync.syncAll(user)
  }
}
