import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsDefined, IsObject, IsString, Matches, MaxLength, ValidateNested } from 'class-validator'

// القيم الشهرية الست مستقلة وصريحة؛ لا null ولا تحويل ضمني من الأعداد الثنائية.
export class PayrollInputSalaryDto {
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) basicSalary!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) housingAllowance!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) transportAllowance!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) phoneAllowance!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) workNatureAllowance!: string
  @IsString() @MaxLength(80) @Matches(/^\d+(?:\.\d+)?$/) otherAllowance!: string
}

export class PayrollInputSalarySegmentDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) from!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) to!: string
  @IsString() @MaxLength(200) @Matches(/\S/) sourceRef!: string
  @IsDefined() @IsObject() @ValidateNested() @Type(() => PayrollInputSalaryDto) salary!: PayrollInputSalaryDto
}

// مراجع المصادر أدلة يقدّمها المستدعي؛ وجودها لا يجيز قراءة موظف أو عقد حي.
export class PayrollInputFactsDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodEnd!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) hireDate!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) coverageStart!: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) coverageEnd!: string
  @IsString() @MaxLength(200) @Matches(/\S/) coverageSourceRef!: string
  // سقف النقل فقط؛ النواة تلزم بعنصر واحد وتعيد سبب رفض تقسيم راتب الشهر.
  @IsArray() @ArrayMaxSize(32) @ValidateNested({ each: true }) @Type(() => PayrollInputSalarySegmentDto) salarySegments!: PayrollInputSalarySegmentDto[]
  @IsArray() @ArrayMaxSize(32) @IsString({ each: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true }) scheduledWorkDates!: string[]
  @IsString() @MaxLength(200) @Matches(/\S/) scheduleSourceRef!: string
}
