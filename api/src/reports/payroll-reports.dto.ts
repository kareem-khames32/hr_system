import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, Matches, Max, Min } from 'class-validator'
import { UNASSIGNED_REASON_CODES } from '../payroll/payroll-reports'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
// قيمة منطقية صريحة فقط: true/1 أو false/0؛ أي نص آخر (مثل maybe) يبقى كما هو فيرفضه IsBoolean بـ400 بدل قراءته false بصمت
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1' ? true : value === false || value === 'false' || value === '0' ? false : value

// المسيرات المحسوبة اللي لسه ما اتعتمدتش: نفس اسم العلم ونفس رسالته في /reports/financial/* و/reports/cost-centers
export class PayrollRunsReportQuery {
  @IsOptional() @Transform(toBoolean) @IsBoolean({ message: 'إظهار المسيرات اللي لسه ما اتعتمدتش يقبل true أو false بس' })
  includeDraft?: boolean
}

// مرشحات مشتركة لتقارير الرواتب: شهر الرواتب (دورة الإعداد) أو تاريخان صريحان، مع الفرع والقسم والفريق ومركز التكلفة
export class PayrollReportFiltersQuery {
  @IsOptional() @Matches(MONTH, { message: 'شهر الرواتب بصيغة YYYY-MM' })
  period?: string

  @IsOptional() @Matches(DATE, { message: 'تاريخ البداية بصيغة YYYY-MM-DD' })
  from?: string

  @IsOptional() @Matches(DATE, { message: 'تاريخ النهاية بصيغة YYYY-MM-DD' })
  to?: string

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفرع غير صالح' }) @Min(1)
  branchId?: number

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم القسم غير صالح' }) @Min(1)
  departmentId?: number

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم الفريق غير صالح' }) @Min(1)
  teamId?: number

  @IsOptional() @Type(() => Number) @IsInt({ message: 'رقم مركز التكلفة غير صالح' }) @Min(1)
  costCenterId?: number
}

export class PayrollUnassignedReportQuery extends PayrollReportFiltersQuery {
  @IsOptional() @IsIn(UNASSIGNED_REASON_CODES, { message: 'سبب غير معروف لتقرير بلا مسير' })
  reason?: string

  @IsOptional() @Transform(toBoolean) @IsBoolean({ message: 'إظهار الموقوفين يقبل true أو false فقط' })
  includeSuspended?: boolean
}

export class PayrollOvertimeReportQuery extends PayrollReportFiltersQuery {
  @IsOptional() @IsIn(['DETECTED', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED'], { message: 'حالة إضافي غير معروفة' })
  status?: string
}

export class PayrollLoansReportQuery extends PayrollReportFiltersQuery {
  @IsOptional() @IsIn(['open', 'settled', 'all'], { message: 'حالة السلف: open أو settled أو all' })
  status?: 'open' | 'settled' | 'all'
}

export class PayrollVarianceReportQuery extends PayrollRunsReportQuery {
  @IsOptional() @Matches(MONTH, { message: 'شهر الرواتب بصيغة YYYY-MM' })
  period?: string

  @IsOptional() @Matches(MONTH, { message: 'شهر المقارنة بصيغة YYYY-MM' })
  comparePeriod?: string

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'حد الفرق بالمبلغ غير صالح' }) @Min(0)
  minAmount?: number

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'حد الفرق بالنسبة غير صالح' }) @Min(0) @Max(100000)
  minPercent?: number

  @IsOptional() @Transform(toBoolean) @IsBoolean({ message: 'إظهار غير المتغيرين يقبل true أو false فقط' })
  includeUnchanged?: boolean
}
