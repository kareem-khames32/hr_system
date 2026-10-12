import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { IsIn, IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { POSITION_STATUSES } from './position.entities'
import { POSITION_HEADCOUNT_MAX } from './position-rules'
import { PositionsService } from './positions.service'

// B2.11: الوظائف المعتمدة. القراءة بـ«عرض الوظائف المعتمدة» (نفس صلاحية الشاشة)، والكتابة بـ«إدارتها» — كله في نطاق فروع الحساب (الفحص في الخدمة).
//  قايمة الاختيار في نموذج التعيين للي معاه «تعيين موظف جديد» كمان.

const nullable = (_: unknown, value: unknown) => value !== null

class PositionDto {
  @IsInt() @Min(1) jobTitleId: number
  @IsInt() @Min(1) branchId: number
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) departmentId?: number | null
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) teamId?: number | null
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) gradeId?: number | null
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) costCenterId?: number | null
  @IsInt() @Min(1) @Max(POSITION_HEADCOUNT_MAX) headcount: number
  @IsOptional() @IsIn([...POSITION_STATUSES]) status?: string
  // الشكل بيتفحص في الخدمة (رقم أو نص رقمي بخانتين عشريتين)
  @IsOptional() budget?: unknown
}

class PositionPatchDto {
  @IsOptional() @IsInt() @Min(1) jobTitleId?: number
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) gradeId?: number | null
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) costCenterId?: number | null
  @IsOptional() @IsInt() @Min(1) @Max(POSITION_HEADCOUNT_MAX) headcount?: number
  @IsOptional() @IsIn([...POSITION_STATUSES]) status?: string
  @IsOptional() budget?: unknown
  // وحدة الوظيفة مابتتغيّرش: لو اتبعتت بقيمة مختلفة الخدمة بترفض برسالتها
  @IsOptional() @IsInt() @Min(1) branchId?: number
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) departmentId?: number | null
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) teamId?: number | null
}

class PositionHolderDto {
  @IsInt() @Min(1) employeeId: number
}

class OpenJobDto {
  @IsOptional() openings?: unknown
}

@RequireModule('positions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  @Perm('positions.view')
  list(@CurrentUser() user: JwtPayload) {
    return this.positions.list(user)
  }

  // B-ADD.12: اقتراحات التوظيف — شواغر معتمدة مالهاش وظيفة مفتوحة في التوظيف
  @Get('hiring-suggestions')
  @Perm('positions.view')
  hiringSuggestions(@CurrentUser() user: JwtPayload) {
    return this.positions.hiringSuggestions(user)
  }

  // قايمة الاختيار في نموذج التعيين: وظائف الفرع النشطة بأرقامها
  @Get('options')
  @Perm('employees.create', 'positions.view')
  options(@CurrentUser() user: JwtPayload, @Query('branchId') branchId?: string) {
    return this.positions.options(user, branchId)
  }

  // بيانات نموذج الوظيفة (فروع النطاق بأقسامها وفرقها، والكتالوجات النشطة)
  @Get('form')
  @Perm('positions.manage')
  formData(@CurrentUser() user: JwtPayload) {
    return this.positions.formData(user)
  }

  @Get('generate')
  @Perm('positions.manage')
  generationPreview(@CurrentUser() user: JwtPayload) {
    return this.positions.generationPreview(user)
  }

  @Post('generate')
  @Perm('positions.manage')
  generate(@CurrentUser() user: JwtPayload) {
    return this.positions.generate(user)
  }

  @Post()
  @Perm('positions.manage')
  create(@CurrentUser() user: JwtPayload, @Body() dto: PositionDto) {
    return this.positions.create(user, dto)
  }

  @Get(':id')
  @Perm('positions.view')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.positions.detail(user, id)
  }

  @Patch(':id')
  @Perm('positions.manage')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PositionPatchDto) {
    return this.positions.update(user, id, dto)
  }

  // B-ADD.12: فتح وظيفة شاغرة في التوظيف من شاغر الوظيفة (صلاحية إدارة التوظيف بتتفحص في الخدمة)
  @Post(':id/open-job')
  @Perm('positions.view')
  openJob(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: OpenJobDto) {
    return this.positions.openJob(user, id, dto.openings)
  }

  @Post(':id/holders')
  @Perm('positions.manage')
  addHolder(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: PositionHolderDto) {
    return this.positions.addHolder(user, id, dto.employeeId)
  }

  @Delete(':id/holders/:employeeId')
  @Perm('positions.manage')
  removeHolder(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.positions.removeHolder(user, id, employeeId)
  }
}
