import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { CurrentUser, JwtAuthGuard, Perm, RolesGuard } from '../auth/guards'
import { RequireModule } from '../modules-registry/module.guard'
import { AUDIT_CATEGORIES } from './audit'
import { AuditService } from './audit.service'

class AuditSearchDto {
  @IsOptional() @IsIn(AUDIT_CATEGORIES as unknown as string[], { message: 'فئة سجل التدقيق غير معروفة' }) category?: string
  @IsOptional() @IsString() @MaxLength(60) action?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) actorUserId?: number
  @IsOptional() @IsString() @MaxLength(40) entityType?: string
  @IsOptional() @IsString() @MaxLength(60) entityId?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ بصيغة YYYY-MM-DD' }) from?: string
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'التاريخ بصيغة YYYY-MM-DD' }) to?: string
  @IsOptional() @IsString() @MaxLength(100) q?: string
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true ? true : value === 'false' || value === false ? false : value)
  @IsBoolean({ message: 'expired = true أو false' }) expired?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number
}

class AuditExportDto {
  @IsString() @MaxLength(200) screen: string
  @IsString() @MaxLength(200) filename: string
  @Type(() => Number) @IsInt() @Min(0) rows: number
}

// B2.1: سجل التدقيق المركزي — البحث بصلاحية audit.view وبنطاق الحساب، وتسجيل التصدير من الشاشات
@RequireModule('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Perm('audit.view')
  @Get()
  search(@CurrentUser() user: JwtPayload, @Query() query: AuditSearchDto) {
    return this.audit.search(user, query)
  }

  // أي حساب داخل بيسجّل تصديره هو (الملف بيتعمل في المتصفح من بيانات معاه أصلًا) — مفيش قراءة لأي بيانات
  @Post('exports')
  recordExport(@CurrentUser() user: JwtPayload, @Body() dto: AuditExportDto) {
    return this.audit.recordExport(user, dto)
  }
}
