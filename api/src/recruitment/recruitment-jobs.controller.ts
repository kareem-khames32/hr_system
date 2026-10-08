import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common'
import { IsBoolean, IsIn, IsInt, IsOptional, Min, ValidateIf } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { RECRUITMENT_JOB_STATUSES, type RecruitmentJobStatus } from './recruitment-job.entity'
import { RecruitmentJobsService } from './recruitment-jobs.service'

const nullable = (_: unknown, value: unknown) => value !== null

// القيم النصية والرقمية (المسمى، العدد، نطاق الراتب، التاريخ، النصوص) بتتفحص في الخدمة برسايلها
class RecruitmentJobDto {
  @IsOptional() title?: unknown
  @IsInt() @Min(1) branchId: number
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) departmentId?: number | null
  @IsOptional() openings?: unknown
  @IsOptional() reason?: unknown
  @IsOptional() salaryFrom?: unknown
  @IsOptional() salaryTo?: unknown
  @IsOptional() startDate?: unknown
  @IsOptional() description?: unknown
  @IsOptional() requirements?: unknown
  @IsOptional() @IsBoolean() internal?: boolean
  @IsOptional() @IsBoolean() external?: boolean
}

class RecruitmentJobPatchDto {
  @IsOptional() title?: unknown
  @IsOptional() @IsInt() @Min(1) branchId?: number
  @IsOptional() @ValidateIf(nullable) @IsInt() @Min(1) departmentId?: number | null
  @IsOptional() openings?: unknown
  @IsOptional() reason?: unknown
  @IsOptional() salaryFrom?: unknown
  @IsOptional() salaryTo?: unknown
  @IsOptional() startDate?: unknown
  @IsOptional() description?: unknown
  @IsOptional() requirements?: unknown
  @IsOptional() @IsBoolean() internal?: boolean
  @IsOptional() @IsBoolean() external?: boolean
}

class RecruitmentJobStatusDto {
  @IsIn([...RECRUITMENT_JOB_STATUSES], { message: 'الحالة: DRAFT أو PUBLISHED أو PAUSED أو CLOSED' })
  status: RecruitmentJobStatus
}

// B3.2-أ: الوظائف الشاغرة — بصلاحية إدارة التوظيف (نفس صلاحية المرشحين)، وبنطاق فروع الحساب في الخدمة
@RequireModule('recruitment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('candidates.manage')
@Controller('recruitment/jobs')
export class RecruitmentJobsController {
  constructor(private readonly jobs: RecruitmentJobsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.jobs.list(user)
  }

  // قبل ‎:id (مسار ثابت)
  @Get('form')
  form(@CurrentUser() user: JwtPayload) {
    return this.jobs.formData(user)
  }

  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.detail(user, id)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: RecruitmentJobDto) {
    return this.jobs.create(user, dto)
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RecruitmentJobPatchDto) {
    return this.jobs.update(user, id, dto)
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number, @Body() dto: RecruitmentJobStatusDto) {
    return this.jobs.setStatus(user, id, dto.status)
  }
}
