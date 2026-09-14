import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDefined, IsInt, IsObject, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

const period = /^\d{4}-(?:0[1-9]|1[0-2])$/
const decimal = /^\d+(?:\.\d{1,6})?$/

export class PayrollInstallmentBudgetSourcesDto {
  @IsString() @MaxLength(200) @Matches(/\S/) netBeforeLoans!: string
  @IsString() @MaxLength(200) @Matches(/\S/) earnedFixedGross!: string
  @IsString() @MaxLength(200) @Matches(/\S/) capConsumed!: string
}

export class PayrollInstallmentBudgetDto {
  @IsString() @MaxLength(80) @Matches(/^-?\d+(?:\.\d{1,6})?$/) netBeforeLoans!: string
  @IsString() @MaxLength(80) @Matches(decimal) earnedFixedGross!: string
  @IsString() @MaxLength(80) @Matches(decimal) capConsumed!: string
  @IsDefined() @IsObject() @ValidateNested() @Type(() => PayrollInstallmentBudgetSourcesDto) sourceRefs!: PayrollInstallmentBudgetSourcesDto
}

export class PayrollInstallmentPreviewRowDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{0,39}$/) componentCode!: string
  @IsString() @MinLength(1) @MaxLength(40) category!: string
  @IsString() @MaxLength(100) @Matches(/\S/) installmentRef!: string
  @IsString() @MaxLength(100) @Matches(/\S/) loanRef!: string
  @IsString() @MaxLength(200) @Matches(/\S/) sourceRef!: string
  @IsInt() @Min(1) @Max(2147483647) sourceRevision!: number
  @IsInt() @Min(1) @Max(2147483647) sequence!: number
  @IsString() @Matches(period) originalDuePeriod!: string
  @IsString() @Matches(period) duePeriod!: string
  @IsString() @MaxLength(19) @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) remainingAmount!: string
  // أولوية التحصيل مصدر صريح؛ لا يعاد تفسير deductionPriority الخاص بتقليص الخصومات.
  @IsInt() @Min(0) @Max(2147483647) priority!: number
  @ValidateIf((_, value) => value !== null) @IsString() @Matches(period) extensionPeriod!: string | null
}

export class PayrollInstallmentManualDeferralDto {
  @IsString() @MaxLength(100) @Matches(/\S/) installmentRef!: string
  @IsString() @Matches(period) toPeriod!: string
  @IsString() @MaxLength(200) @Matches(/\S/) sourceRef!: string
  @IsString() @MinLength(3) @MaxLength(500) reason!: string
}

export class PreviewPayrollInstallmentsDto {
  @IsInt() @Min(1) @Max(2147483647) expectedRevision!: number
  @IsString() @Matches(period) period!: string
  @IsString() @Matches(period) nextPeriod!: string
  @IsDefined() @IsObject() @ValidateNested() @Type(() => PayrollInstallmentBudgetDto) budget!: PayrollInstallmentBudgetDto
  @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => PayrollInstallmentPreviewRowDto) installments!: PayrollInstallmentPreviewRowDto[]
  @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => PayrollInstallmentManualDeferralDto) manualDeferrals!: PayrollInstallmentManualDeferralDto[]
}
