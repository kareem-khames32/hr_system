import { Type } from 'class-transformer'
import { IsInt, IsObject, Min, ValidateNested } from 'class-validator'
import { PayrollPolicyMutationDto } from './payroll-policy.dto'
import { PayrollCollectionPolicyDto } from './payroll-collection-policy.dto'

export class UpdatePayrollCollectionPolicyDto extends PayrollPolicyMutationDto {
  @IsObject() @ValidateNested() @Type(() => PayrollCollectionPolicyDto) collection: PayrollCollectionPolicyDto
}

/** المدخلات التفصيلية يتحقق منها المحرك الصارم بعد تثبيت نسخة السياسة الخادمية. */
export class PreviewPayrollPolicyExecutionDto {
  @IsInt() @Min(1) expectedRevision: number
  @IsObject() components: Record<string, unknown>
  @IsObject() sources: Record<string, unknown>
  @IsObject() basis: { earnedFixedGross: unknown; sourceRef: unknown }
}
