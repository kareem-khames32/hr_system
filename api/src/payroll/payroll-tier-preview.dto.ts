import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsDefined, IsInt, IsObject, IsString, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator'

export class PayrollTierPreviewDayDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string
  @ValidateIf((_object, value) => value !== null) @IsString() @MaxLength(120) sourceRef!: string | null
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) rawLateSeconds!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) excusedLateSeconds!: string
  @IsBoolean() flexibleStartEnabled!: boolean
  @IsBoolean() attendanceExempt!: boolean
  @ValidateIf((_object, value) => value !== null) @IsInt() @Min(0) @Max(1440) shiftGraceMinutes!: number | null
}

export class PayrollTierPreviewInputsDto {
  @IsObject() variables!: Record<string, string | null>
  @IsObject() components!: Record<string, string | null>
}

// القيم تجريبية صريحة؛ لا يجيز معرّف المصدر قراءة موظف أو بصمة من قاعدة البيانات.
export class PayrollTierPreviewDto {
  @IsInt() @Min(1) expectedRevision!: number
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{0,39}$/) tierSetCode!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodEnd!: string
  @IsString() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) basicSalary!: string
  @IsString() @Matches(/^\d{1,16}(?:\.\d{1,2})?$/) grossSalary!: string
  @IsArray() @ArrayMaxSize(366) @ValidateNested({ each: true }) @Type(() => PayrollTierPreviewDayDto) days!: PayrollTierPreviewDayDto[]
  @IsDefined() @ValidateNested() @Type(() => PayrollTierPreviewInputsDto) inputs!: PayrollTierPreviewInputsDto
}
