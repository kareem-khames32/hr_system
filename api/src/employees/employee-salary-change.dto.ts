import { Type } from 'class-transformer'
import { IsDefined, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

export class EmployeeSalaryValuesDto {
  @IsString() @MaxLength(80) basicSalary: string
  @IsString() @MaxLength(80) housingAllowance: string
  @IsString() @MaxLength(80) transportAllowance: string
  @IsString() @MaxLength(80) phoneAllowance: string
  @IsString() @MaxLength(80) workNatureAllowance: string
  @IsString() @MaxLength(80) otherAllowance: string
  // بدل ضغط العمل (ترحيل 071): اختياري — غيابه = قيمته الحالية في الملف (مش صفر)، فالعميل القديم مابيلمسهوش
  @IsOptional() @IsString() @MaxLength(80) workPressureAllowance?: string
  @IsIn(['SAR', 'EGP']) currency: 'SAR' | 'EGP'
}

export class EmployeeSalaryChangeDto {
  @IsInt() @Min(0) @Max(2147483646) expectedRevision: number
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedCurrentSourceHash: string
  // قاعدة المالك: تغيير الراتب يسري من راتب شهر كامل (YYYY-MM)، لا من تاريخ يومي.
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) effectivePayrollPeriod: string
  @IsString() @MinLength(1) @MaxLength(500) reason: string
  @IsString() @MinLength(1) @MaxLength(200) evidenceReference: string
  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) previousEffectivePayrollPeriod?: string
  @IsDefined() @ValidateNested() @Type(() => EmployeeSalaryValuesDto) salary: EmployeeSalaryValuesDto
}
