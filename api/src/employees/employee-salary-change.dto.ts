import { Type } from 'class-transformer'
import { IsDefined, IsIn, IsInt, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

export class EmployeeSalaryValuesDto {
  @IsString() @MaxLength(80) basicSalary: string
  @IsString() @MaxLength(80) housingAllowance: string
  @IsString() @MaxLength(80) transportAllowance: string
  @IsString() @MaxLength(80) phoneAllowance: string
  @IsString() @MaxLength(80) workNatureAllowance: string
  @IsString() @MaxLength(80) otherAllowance: string
  @IsIn(['SAR', 'EGP']) currency: 'SAR' | 'EGP'
}

export class EmployeeSalaryChangeDto {
  @IsInt() @Min(0) @Max(2147483646) expectedRevision: number
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedCurrentSourceHash: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) effectiveDate: string
  @IsString() @MinLength(1) @MaxLength(500) reason: string
  @IsString() @MinLength(1) @MaxLength(200) evidenceReference: string
  @ValidateIf((_object, value) => value !== undefined)
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) previousEffectiveFrom?: string
  @IsDefined() @ValidateNested() @Type(() => EmployeeSalaryValuesDto) salary: EmployeeSalaryValuesDto
}
