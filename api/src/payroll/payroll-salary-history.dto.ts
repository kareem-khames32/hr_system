import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

export class PayrollSalaryHistorySegmentDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveFrom: string
  @ValidateIf((_object, value) => value !== null) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveTo: string | null
  @IsIn(['SAR', 'EGP']) currency: 'SAR' | 'EGP'
  @IsString() @MaxLength(80) basicSalary: string
  @IsString() @MaxLength(80) housingAllowance: string
  @IsString() @MaxLength(80) transportAllowance: string
  @IsString() @MaxLength(80) phoneAllowance: string
  @IsString() @MaxLength(80) workNatureAllowance: string
  @IsString() @MaxLength(80) otherAllowance: string
  // بدل ضغط العمل (ترحيل 071): اختياري في الفترة — غيابه = صفر
  @IsOptional() @IsString() @MaxLength(80) workPressureAllowance?: string
}

export class ReplacePayrollSalaryHistoryDto {
  @IsInt() @Min(0) @Max(2147483646) expectedRevision: number
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedCurrentSourceHash: string
  @IsString() @MinLength(1) @MaxLength(500) reason: string
  @IsString() @MinLength(1) @MaxLength(200) evidenceReference: string
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(120) @ValidateNested({ each: true }) @Type(() => PayrollSalaryHistorySegmentDto)
  segments: PayrollSalaryHistorySegmentDto[]
}

export class PayrollMonthlySalaryPeriodDto {
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) effectivePayrollPeriod: string
  @ValidateIf((_object, value) => value !== null) @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) effectiveToPayrollPeriod: string | null
  @IsIn(['SAR', 'EGP']) currency: 'SAR' | 'EGP'
  @IsString() @MaxLength(80) basicSalary: string
  @IsString() @MaxLength(80) housingAllowance: string
  @IsString() @MaxLength(80) transportAllowance: string
  @IsString() @MaxLength(80) phoneAllowance: string
  @IsString() @MaxLength(80) workNatureAllowance: string
  @IsString() @MaxLength(80) otherAllowance: string
  // بدل ضغط العمل (ترحيل 071): اختياري في الفترة — غيابه = صفر
  @IsOptional() @IsString() @MaxLength(80) workPressureAllowance?: string
}

export class ReplacePayrollMonthlySalaryHistoryDto {
  @IsInt() @Min(0) @Max(2147483646) expectedRevision: number
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedCurrentSourceHash: string
  @IsString() @MinLength(1) @MaxLength(500) reason: string
  @IsString() @MinLength(1) @MaxLength(200) evidenceReference: string
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(120) @ValidateNested({ each: true }) @Type(() => PayrollMonthlySalaryPeriodDto)
  periods: PayrollMonthlySalaryPeriodDto[]
}
