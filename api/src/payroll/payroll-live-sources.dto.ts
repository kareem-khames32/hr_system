import { IsInt, IsString, Matches, Max, Min } from 'class-validator'

export class ReadPayrollLiveSourcesDto {
  @IsInt() @Min(1) @Max(2147483647) expectedRevision: number
  @IsInt() @Min(1) @Max(2147483647) employeeId: number
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodStart: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) periodEnd: string
}
