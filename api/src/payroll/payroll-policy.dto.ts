import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'
import type { PayrollScopeType } from './payroll.entities'
import { PAYROLL_POLICY_CURRENCIES, PAYROLL_POLICY_DIVISION_MODES, PAYROLL_POLICY_END_MODES, PAYROLL_POLICY_PERIOD_TYPES, PAYROLL_POLICY_RATE_BASES, PAYROLL_POLICY_ROUNDING_MODES, PayrollPolicySettings } from './payroll-policy-settings'

const SCOPES = ['COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'COST_CENTER', 'CUSTOM']

// جميع الحقول اختيارية للترقيع، ويشترط التحقق الخدمي اكتمال المجموعة للنسخ التاريخية.
export class PayrollPolicySettingsDto implements Partial<PayrollPolicySettings> {
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_PERIOD_TYPES) defaultPeriodType?: PayrollPolicySettings['defaultPeriodType']
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(1) @Max(31) cycleStartDay?: number
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_END_MODES) cycleEndMode?: PayrollPolicySettings['cycleEndMode']
  @IsOptional() @IsInt() @Min(1) @Max(31) cycleEndDay?: number | null
  @ValidateIf((_, value) => value !== undefined) @IsIn(['FIXED_30']) baseDaysBasis?: 'FIXED_30'
  @ValidateIf((_, value) => value !== undefined) @IsNumber() @IsIn([30]) monthlyDays?: number
  @ValidateIf((_, value) => value !== undefined) @IsNumber() @Min(0.01) @Max(24) dailyHours?: number
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_RATE_BASES) rateBase?: PayrollPolicySettings['rateBase']
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_ROUNDING_MODES) roundingMode?: PayrollPolicySettings['roundingMode']
  @ValidateIf((_, value) => value !== undefined) @IsInt() @Min(0) @Max(6) roundingScale?: number
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_DIVISION_MODES) divisionByZeroMode?: PayrollPolicySettings['divisionByZeroMode']
  @IsOptional() @IsNumber() @Min(0) @Max(100) maxDeductionPctOfGross?: number | null
  @IsOptional() @IsNumber() @Min(0) minNetGuarantee?: number | null
  @IsOptional() @IsNumber() @Min(0) @Max(100) netFloorPct?: number | null
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() carryOverExcess?: boolean
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() skipAttendance?: boolean
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() lateDeductionEnabled?: boolean
  @ValidateIf((_, value) => value !== undefined) @IsIn(PAYROLL_POLICY_CURRENCIES) currency?: PayrollPolicySettings['currency']
}

export class PayrollPolicyVersionMetadataDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string | null
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null
}

export class CreatePayrollPolicyDto {
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollPolicySettingsDto) settings?: PayrollPolicySettingsDto
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(40) @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/) code: string
  @IsString() @MinLength(1) @MaxLength(200) name: string
  @IsOptional() @IsString() @MaxLength(8000) description?: string | null
  @IsOptional() @IsInt() @Min(1) branchId?: number | null
  @IsOptional() @IsIn(SCOPES) defaultScopeType?: PayrollScopeType | null
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(1000) @IsInt({ each: true }) @Min(1, { each: true }) defaultScopeIds?: number[] | null
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveTo?: string | null
  @IsOptional() @IsObject() @ValidateNested() @Type(() => PayrollPolicyVersionMetadataDto) metadata?: PayrollPolicyVersionMetadataDto | null
}

export class PayrollPolicyMutationDto {
  @IsInt() @Min(1) expectedRevision: number
  @IsString() @MinLength(1) @MaxLength(500) reason: string
}

export class UpdatePayrollPolicyDto extends PayrollPolicyMutationDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string
  @IsOptional() @IsString() @MaxLength(8000) description?: string | null
  @IsOptional() @IsIn(SCOPES) defaultScopeType?: PayrollScopeType | null
  @IsOptional() @IsArray() @ArrayUnique() @ArrayMaxSize(1000) @IsInt({ each: true }) @Min(1, { each: true }) defaultScopeIds?: number[] | null
}

export class UpdatePayrollPolicyVersionDto extends PayrollPolicyMutationDto {
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollPolicySettingsDto) settings?: PayrollPolicySettingsDto
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom?: string
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveTo?: string | null
  @IsOptional() @IsObject() @ValidateNested() @Type(() => PayrollPolicyVersionMetadataDto) metadata?: PayrollPolicyVersionMetadataDto | null
}

export class ClonePayrollPolicyVersionDto extends PayrollPolicyMutationDto {
  @IsInt() @Min(1) sourceVersionId: number
}
