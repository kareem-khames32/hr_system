import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, Matches, Min } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { ORG_FILTER_MAX_UNITS } from '../org/org-filter-params'
import { CostCenterReportService } from './cost-center-report.service'

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' ? true : value === false || value === 'false' || value === '0' ? false : value

export class CostCenterReportQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار الشهر بصيغة YYYY-MM' })
  period: string

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفرع غير صالح' }) @Min(1)
  branchId?: number

  // فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد: الإدارة/القسم المختار بأقسامه الفرعية جوه فرعه («3,4,5»)، والفريق
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((part) => Number(part.trim())) : value))
  @IsArray({ message: 'الأقسام المختارة غير صالحة' }) @ArrayMaxSize(ORG_FILTER_MAX_UNITS, { message: 'الأقسام المختارة كتير' })
  @IsInt({ each: true, message: 'الأقسام المختارة غير صالحة' }) @Min(1, { each: true, message: 'الأقسام المختارة غير صالحة' })
  departmentIds?: number[]

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفريق غير صالح' }) @Min(1)
  teamId?: number

  @IsOptional() @Transform(toBoolean) @IsBoolean({ message: 'إظهار المسودات يقبل true أو false فقط' })
  includeDraft?: boolean
}

// تقرير مراكز التكلفة لشهر: مبالغ رواتب فردية، فيحتاج صلاحية عرض الرواتب فوق التقارير. حساب الفرع يشوف فرعه بس.
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports/cost-centers')
export class CostCenterReportController {
  constructor(private readonly service: CostCenterReportService) {}

  @Get()
  async report(@Query() query: CostCenterReportQueryDto, @CurrentUser() user: JwtPayload) {
    if (!userHasPerm(user, 'payroll.view')) throw new ForbiddenException('تقرير مراكز التكلفة محتاج صلاحية عرض الرواتب')
    const scope = branchScopeOf(user)
    if (query.branchId !== undefined && !inBranchScope(scope, query.branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف تقارير فروعه بس' : 'حساب الفرع يشوف تقرير فرعه بس')
    }
    // الفرع المطلوب، أو فرع الحساب لو فرع واحد (زي الأول بالحرف)، وإلا null + نطاق فروعه كله (branchScope)
    const branchId = query.branchId ?? (scope !== null && scope.length === 1 ? scope[0] : null)
    return this.service.report({ period: query.period, branchId, branchScope: scope, includeDraft: query.includeDraft === true,
      departmentIds: query.departmentIds?.length ? [...new Set(query.departmentIds)] : null, teamId: query.teamId ?? null })
  }
}
