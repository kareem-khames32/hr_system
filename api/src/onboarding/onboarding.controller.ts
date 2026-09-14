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

class CreateTemplateItemDto {
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
  listTemplate() {
    return this.service.listTemplate()
  }

  @Perm('settings.manage')
  @Post('template')
  createTemplateItem(@Body() dto: CreateTemplateItemDto) {
    return this.service.createTemplateItem(dto)
  }

  @Perm('settings.manage')
  @Patch('template/:id')
  updateTemplateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateItemDto
  ) {
    return this.service.updateTemplateItem(id, dto)
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
