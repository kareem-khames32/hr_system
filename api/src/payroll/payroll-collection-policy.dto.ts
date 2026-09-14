import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, Equals, IsArray, IsDefined, IsIn, IsString, Matches, ValidateNested } from 'class-validator'
import { PAYROLL_NET_SOURCE_CLASSES, PayrollNetSourceClass } from './payroll-net-finalization'
import { PAYROLL_COLLECTION_POLICY_LIMITS, PAYROLL_COLLECTION_POLICY_VERSION } from './payroll-collection-policy'

export class PayrollCollectionClassificationDto {
  @IsDefined() @IsString() @Matches(/^[A-Z][A-Z0-9_]{0,39}$/) componentCode: string
  @IsDefined() @IsIn(PAYROLL_NET_SOURCE_CLASSES) kind: PayrollNetSourceClass
}

// يفحص المسار raw JSON بالحارس الصارم قبل أن يحذف whitelist أي مفتاح غريب.
export class PayrollCollectionPolicyDto {
  @IsDefined() @Equals(PAYROLL_COLLECTION_POLICY_VERSION) schemaVersion: typeof PAYROLL_COLLECTION_POLICY_VERSION
  @IsDefined() @IsArray() @ArrayMaxSize(PAYROLL_COLLECTION_POLICY_LIMITS.components)
  @ValidateNested({ each: true }) @Type(() => PayrollCollectionClassificationDto) classifications: PayrollCollectionClassificationDto[]
  @IsDefined() @IsArray() @ArrayMaxSize(PAYROLL_COLLECTION_POLICY_LIMITS.components) @ArrayUnique()
  @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) collectionOrder: string[]
}
