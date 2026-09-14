import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsObject, IsString, Matches, ValidateIf, ValidateNested } from 'class-validator'
import { PayrollPolicyDefinitionDto } from './payroll-policy-definition.dto'
import { PayrollPolicyMutationDto, PayrollPolicySettingsDto } from './payroll-policy.dto'
import { PayrollCollectionPolicyDto } from './payroll-collection-policy.dto'

export class ValidatePayrollPolicyDefinitionDto {
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollCollectionPolicyDto) collection?: PayrollCollectionPolicyDto
  @IsObject() @ValidateNested() @Type(() => PayrollPolicyDefinitionDto) definition: PayrollPolicyDefinitionDto
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() autoOrder?: boolean
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollPolicySettingsDto) settings?: PayrollPolicySettingsDto
}

export class ReplacePayrollPolicyDefinitionDto extends PayrollPolicyMutationDto {
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollCollectionPolicyDto) collection?: PayrollCollectionPolicyDto
  @IsObject() @ValidateNested() @Type(() => PayrollPolicyDefinitionDto) definition: PayrollPolicyDefinitionDto
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() autoOrder?: boolean
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollPolicySettingsDto) settings?: PayrollPolicySettingsDto
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(2000) @ArrayUnique() @IsString({ each: true }) @Matches(/^[a-f0-9]{64}$/, { each: true }) acknowledgedWarnings?: string[]
}
