import { Type } from 'class-transformer'
import { IsDefined, IsInt, Min, ValidateNested } from 'class-validator'
import { PayrollInputFactsDto } from './payroll-input-facts.dto'

export class PreviewPayrollInputFactsDto {
  @IsInt() @Min(1) expectedRevision!: number
  @IsDefined() @ValidateNested() @Type(() => PayrollInputFactsDto) facts!: PayrollInputFactsDto
}
