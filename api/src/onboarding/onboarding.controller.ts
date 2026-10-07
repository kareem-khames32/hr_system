import {
  BadRequestException,
  Body,
  Controller,
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
  IsOptional,
  IsString,
  isISO8601,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateBy,
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import {
  ONBOARDING_PARTIES,
  OnboardingParty,
  OnboardingTaskStatus,
} from './onboarding.entities'
import { OnboardingService } from './onboarding.service'
import { ONBOARDING_CONTRACT_TYPES } from './onboarding-templates'
import { RequireModule } from '../modules-registry/module.guard'

// تاريخ تقويمي صحيح YYYY-MM-DD — الـregex وحده يمرّر 2026-02-31 (مثل المستندات)
const IsYmdDate = (message: string) =>
  ValidateBy(
    {
      name: 'isYmdDate',
      validator: {
        validate: (v: unknown) =>
          typeof v === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(v) &&
          isISO8601(v, { strict: true }),
      },
    },
    { message }
  )

const PARTY_MSG = 'الجهة: hr أو it أو custody أو finance أو manager'
const LABEL_MIN = 'وصف المهمة حرفان على الأقل'
const LABEL_MAX = 'وصف المهمة لا يتجاوز 200 حرف'
const DUE_MSG = 'موعد المهمة غير صالح — الصيغة YYYY-MM-DD'
const OFFSET_MSG = 'إزاحة الموعد عدد أيام صحيح من -60 إلى 365'
const ORDER_MSG = 'الترتيب عدد صحيح من 0 إلى 1000000'

class AddTaskDto {
  @IsString({ message: 'وصف المهمة مطلوب' })
  @MinLength(2, { message: LABEL_MIN })
  @MaxLength(200, { message: LABEL_MAX })
  label: string

  @IsIn(ONBOARDING_PARTIES, { message: PARTY_MSG })
  party: OnboardingParty

  @IsYmdDate(DUE_MSG)
  dueDate: string
}

// كل الحقول اختيارية — و null يُرفض (ValidateIf) بدل ما يعدّي للخدمة
class UpdateTaskDto {
  @ValidateIf((o) => o.status !== undefined)
  @IsIn(['PENDING', 'DONE', 'SKIPPED'], {
    message: 'الحالة: PENDING أو DONE أو SKIPPED',
  })
  status?: OnboardingTaskStatus

  @ValidateIf((o) => o.note !== undefined)
  @IsString({ message: 'الملاحظة نص' })
  @MaxLength(500, { message: 'الملاحظة لا تتجاوز 500 حرف' })
  note?: string

  @ValidateIf((o) => o.label !== undefined)
  @IsString({ message: 'وصف المهمة نص' })
  @MinLength(2, { message: LABEL_MIN })
  @MaxLength(200, { message: LABEL_MAX })
  label?: string

  @ValidateIf((o) => o.party !== undefined)
  @IsIn(ONBOARDING_PARTIES, { message: PARTY_MSG })
  party?: OnboardingParty

  @ValidateIf((o) => o.dueDate !== undefined)
  @IsYmdDate(DUE_MSG)
  dueDate?: string
}

// B3.1-أ: قالب بنطاق. خانة النطاق الفاضية (null أو مش مبعوتة) = أي قيمة؛ و null في التعديل بيمسح الخانة
const TEMPLATE_ID_MSG = 'رقم القالب غير صالح'
const CONTRACT_MSG = 'نوع التعاقد: permanent أو fixed_term أو part_time أو seasonal'
const given = (key: string) => (o: Record<string, unknown>) => o[key] !== undefined && o[key] !== null
const templateIdOf = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === '') return undefined
  if (typeof raw !== 'string' || !/^[1-9]\d{0,8}$/.test(raw)) throw new BadRequestException(TEMPLATE_ID_MSG)
  return Number(raw)
}

class CreateTemplateDto {
  @IsString({ message: 'اسم القالب مطلوب' })
  @MinLength(2, { message: 'اسم القالب حرفان على الأقل' })
  @MaxLength(150, { message: 'اسم القالب لا يتجاوز 150 حرف' })
  name: string

  @ValidateIf(given('branchId'))
  @IsInt({ message: 'الفرع رقم صحيح' })
  @Min(1, { message: 'الفرع رقم صحيح' })
  branchId?: number | null

  @ValidateIf(given('jobTitle'))
  @IsString({ message: 'المسمى نص' })
  @MaxLength(100, { message: 'المسمى لا يتجاوز 100 حرف' })
  jobTitle?: string | null

  @ValidateIf(given('gradeId'))
  @IsInt({ message: 'الدرجة رقم صحيح' })
  @Min(1, { message: 'الدرجة رقم صحيح' })
  gradeId?: number | null

  @ValidateIf(given('contractType'))
  @IsIn(ONBOARDING_CONTRACT_TYPES, { message: CONTRACT_MSG })
  contractType?: string | null
}

class UpdateTemplateDto {
  @ValidateIf((o) => o.name !== undefined)
  @IsString({ message: 'اسم القالب نص' })
  @MinLength(2, { message: 'اسم القالب حرفان على الأقل' })
  @MaxLength(150, { message: 'اسم القالب لا يتجاوز 150 حرف' })
  name?: string

  @ValidateIf(given('branchId'))
  @IsInt({ message: 'الفرع رقم صحيح' })
  @Min(1, { message: 'الفرع رقم صحيح' })
  branchId?: number | null

  @ValidateIf(given('jobTitle'))
  @IsString({ message: 'المسمى نص' })
  @MaxLength(100, { message: 'المسمى لا يتجاوز 100 حرف' })
  jobTitle?: string | null

  @ValidateIf(given('gradeId'))
  @IsInt({ message: 'الدرجة رقم صحيح' })
  @Min(1, { message: 'الدرجة رقم صحيح' })
  gradeId?: number | null

  @ValidateIf(given('contractType'))
  @IsIn(ONBOARDING_CONTRACT_TYPES, { message: CONTRACT_MSG })
  contractType?: string | null

  @ValidateIf((o) => o.isActive !== undefined)
  @IsBoolean({ message: 'التفعيل true أو false' })
  isActive?: boolean
}

class CreateTemplateItemDto {
  // B3.1-أ: بند لقالب بنطاق (من غيره = القالب العام)
  @IsOptional()
  @IsInt({ message: TEMPLATE_ID_MSG })
  @Min(1, { message: TEMPLATE_ID_MSG })
  templateId?: number

  @IsString({ message: 'وصف المهمة مطلوب' })
  @MinLength(2, { message: LABEL_MIN })
  @MaxLength(200, { message: LABEL_MAX })
  label: string

  @IsIn(ONBOARDING_PARTIES, { message: PARTY_MSG })
  party: OnboardingParty

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: OFFSET_MSG })
  @Min(-60, { message: OFFSET_MSG })
  @Max(365, { message: OFFSET_MSG })
  dueOffsetDays?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: ORDER_MSG })
  @Min(0, { message: ORDER_MSG })
  @Max(1000000, { message: ORDER_MSG })
  sortOrder?: number

  @IsOptional()
  @IsBoolean({ message: 'التفعيل true أو false' })
  isActive?: boolean
}

class UpdateTemplateItemDto {
  @ValidateIf((o) => o.label !== undefined)
  @IsString({ message: 'وصف المهمة نص' })
  @MinLength(2, { message: LABEL_MIN })
  @MaxLength(200, { message: LABEL_MAX })
  label?: string

  @ValidateIf((o) => o.party !== undefined)
  @IsIn(ONBOARDING_PARTIES, { message: PARTY_MSG })
  party?: OnboardingParty

  @ValidateIf((o) => o.dueOffsetDays !== undefined)
  @Type(() => Number)
  @IsInt({ message: OFFSET_MSG })
  @Min(-60, { message: OFFSET_MSG })
  @Max(365, { message: OFFSET_MSG })
  dueOffsetDays?: number

  @ValidateIf((o) => o.sortOrder !== undefined)
  @Type(() => Number)
  @IsInt({ message: ORDER_MSG })
  @Min(0, { message: ORDER_MSG })
  @Max(1000000, { message: ORDER_MSG })
  sortOrder?: number

  @ValidateIf((o) => o.isActive !== undefined)
  @IsBoolean({ message: 'التفعيل true أو false' })
  isActive?: boolean
}

// تهيئة الموظفين الجدد: قالب مهام + قائمة محفوظة لكل موظف بجهتها وموعدها
@RequireModule('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}

  // الموظفون الجدد بتاريخ الالتحاق ومهامهم — employees.view يرى نطاق فرعه كاملاً،
  // وجهات التهيئة (HR/IT/العهدة/المالية/المدير المباشر) موظفي مهامها فقط (في الخدمة)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user)
  }

  // قالب المهام — قبل :employeeId عشان الراوتر ما يبلعهاش
  @Perm('settings.manage')
  @Get('template')
  listTemplate(@CurrentUser() user: JwtPayload, @Query('templateId') templateId?: string) {
    return this.service.listTemplate(user, templateIdOf(templateId))
  }

  @Perm('settings.manage')
  @Post('template')
  createTemplateItem(@CurrentUser() user: JwtPayload, @Body() dto: CreateTemplateItemDto) {
    return this.service.createTemplateItem(user, dto)
  }

  @Perm('settings.manage')
  @Patch('template/:id')
  updateTemplateItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateItemDto
  ) {
    return this.service.updateTemplateItem(user, id, dto)
  }

  // B3.1-أ: قوالب بالنطاق (فرع، مسمى، درجة، نوع تعاقد) — القالب العام فوق هو الافتراضي
  @Perm('settings.manage')
  @Get('templates')
  listTemplates(@CurrentUser() user: JwtPayload) {
    return this.service.listTemplates(user)
  }

  @Perm('settings.manage')
  @Post('templates')
  createTemplate(@CurrentUser() user: JwtPayload, @Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(user, dto)
  }

  @Perm('settings.manage')
  @Patch('templates/:id')
  updateTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto
  ) {
    return this.service.updateTemplate(user, id, dto)
  }

  // إتمام/إعادة فتح مهمة (جهتها أو HR)، والوصف والجهة والموعد والاستبعاد لـHR —
  // التفويض داخل الخدمة
  @Patch('tasks/:id')
  updateTask(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto
  ) {
    return this.service.updateTask(user, id, dto)
  }

  // مهمة إضافية لموظف بعينه — HR في فرع الموظف
  @Perm('employees.edit')
  @Post(':employeeId/tasks')
  addTask(
    @CurrentUser() user: JwtPayload,
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: AddTaskDto
  ) {
    return this.service.addTask(user, employeeId, dto)
  }
}
