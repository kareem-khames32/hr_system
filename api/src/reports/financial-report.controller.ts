import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, Matches, Min } from 'class-validator'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, CurrentUser, inBranchScope, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { FinancialReportService, type FinancialReportQuery } from './financial-report.service'

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' ? true : value === false || value === 'false' || value === '0' ? false : value

export class FinancialReportQueryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'اختار شهر الرواتب بصيغة YYYY-MM' })
  period?: string

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفرع غير صالح' }) @Min(1)
  branchId?: number

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم القسم غير صالح' }) @Min(1)
  departmentId?: number

  // الفريق: نفس مرشح /reports/payroll/* عشان الفلتر ما يبقاش مقبولًا ومتجاهلًا بصمت
  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفريق غير صالح' }) @Min(1)
  teamId?: number

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم مركز التكلفة غير صالح' }) @Min(1)
  costCenterId?: number

  @IsOptional() @Transform(toBoolean) @IsBoolean({ message: 'إظهار المسيرات اللي لسه ما اتعتمدتش يقبل true أو false بس' })
  includeDraft?: boolean
}

// التقارير المالية لشهر رواتب: مبالغ رواتب فردية، فمحتاجة صلاحية عرض الرواتب فوق التقارير. حساب الفرع يشوف فرعه بس.
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('reports.view')
@Controller('reports/financial')
export class FinancialReportController {
  constructor(private readonly service: FinancialReportService) {}

  private scoped(query: FinancialReportQueryDto, user: JwtPayload): FinancialReportQuery {
    if (!userHasPerm(user, 'payroll.view')) throw new ForbiddenException('التقارير المالية محتاجة صلاحية عرض الرواتب')
    const scope = branchScopeOf(user)
    if (query.branchId !== undefined && !inBranchScope(scope, query.branchId)) {
      throw new ForbiddenException(scope !== null && scope.length > 1 ? 'حساب الفروع يشوف تقارير فروعه بس' : 'حساب الفرع يشوف تقارير فرعه بس')
    }
    // الفرع المطلوب، أو فرع الحساب لو فرع واحد (زي الأول بالحرف)، وإلا null + نطاق فروعه كله (branchScope)
    return { period: query.period, branchId: query.branchId ?? (scope !== null && scope.length === 1 ? scope[0] : null), branchScope: scope,
      departmentId: query.departmentId ?? null, teamId: query.teamId ?? null, costCenterId: query.costCenterId ?? null, includeDraft: query.includeDraft === true }
  }

  // ١) كشف الرواتب: سطر لكل موظف في كل مسير بالبدلات والإضافي والخصومات بأنواعها والصافي وطريقة الصرف
  @Get('payroll-register')
  payrollRegister(@Query() query: FinancialReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.payrollRegister(this.scoped(query, user))
  }

  // ٢) ملخص تكلفة الرواتب بالفرع وبالقسم
  @Get('payroll-cost')
  payrollCost(@Query() query: FinancialReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.payrollCost(this.scoped(query, user))
  }

  // ٣) الخصومات بالنوع وبالموظف
  @Get('deductions')
  deductions(@Query() query: FinancialReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.deductions(this.scoped(query, user))
  }

  // ٤) السلف: الأرصدة القائمة وأقساط الشهر
  @Get('loans')
  loans(@Query() query: FinancialReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.loans(this.scoped(query, user))
  }

  // ٥) الإضافي المعتمد اللي دخل مسيرات الشهر بالموظف والقسم
  @Get('overtime')
  overtime(@Query() query: FinancialReportQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.overtime(this.scoped(query, user))
  }
}
