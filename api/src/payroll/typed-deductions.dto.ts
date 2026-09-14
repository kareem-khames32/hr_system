import { Transform, Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { DEDUCTION_APPROVAL_ROLES, DEDUCTION_CALC_METHODS, DEDUCTION_CATEGORIES, DEDUCTION_CREATOR_BASES, DEDUCTION_SELECTION_MODES } from './typed-deductions'

const asText = ({ value }: { value: unknown }) => typeof value === 'number' ? String(value) : value

export class DeductionTypeDto {
  @IsOptional() @IsString() @MaxLength(40) code?: string
  @IsOptional() @IsString() @MaxLength(120) nameAr?: string
  @IsOptional() @IsString() @MaxLength(120) nameEn?: string | null
  @IsOptional() @IsIn(DEDUCTION_CATEGORIES) category?: string
  @IsOptional() @IsIn(DEDUCTION_CALC_METHODS) calcMethod?: string
  @IsOptional() @Transform(asText) @IsString() defaultValue?: string | null
  @IsOptional() @Transform(asText) @IsString() valueStep?: string | null
  @IsOptional() @Transform(asText) @IsString() minAmount?: string | null
  @IsOptional() @Transform(asText) @IsString() maxAmount?: string | null
  @IsOptional() @Transform(asText) @IsString() maxPctOfGross?: string | null
  @IsOptional() @IsBoolean() isExemptable?: boolean
  @IsOptional() @IsBoolean() installmentAllowed?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) maxInstallments?: number
  @IsOptional() @IsBoolean() requiresAttachment?: boolean
  @IsOptional() @IsArray() @IsIn(DEDUCTION_CREATOR_BASES, { each: true }) creatorScopes?: string[]
  @IsOptional() @IsArray() @IsIn(DEDUCTION_APPROVAL_ROLES, { each: true }) approvalSteps?: string[]
  @IsOptional() @Transform(asText) @IsString() escalationDays?: string | null
  @IsOptional() @IsString() escalationStep?: string | null
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(3650) maxIncidentAgeDays?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(99) carryForwardPriority?: number
  @IsOptional() @IsBoolean() isActive?: boolean
  // DD-01/03/04: الجهة المالكة والنطاق الوظيفي ومصفوفة التصعيد لكل دور (يُتحقق منها كاملة في normalizeDeductionTypeRules)
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) ownerDepartmentId?: number | null
  @IsOptional() @IsObject() functionalScope?: Record<string, unknown> | null
  @IsOptional() @IsObject() basisEscalationDays?: Record<string, unknown> | null
}

export class DeductionObjectionDto {
  @IsString({ message: 'نص الاعتراض مطلوب' }) @MaxLength(1000) text: string
}

export class DeductionReverseDto {
  @Type(() => Number) @IsInt() @Min(0) expectedRevision: number
  @IsString({ message: 'سبب العكس مطلوب' }) @MaxLength(1000) reason: string
  @IsOptional() @Transform(asText) @IsString() @MaxLength(30) amount?: string
}

export class DeductionObligationDecisionDto {
  @IsIn(['RESUME', 'DROP'], { message: 'القرار: استئناف التحصيل أو إسقاط القسط' }) action: string
  @IsString({ message: 'سبب القرار مطلوب' }) @MaxLength(1000) reason: string
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'الشهر المستهدف بصيغة YYYY-MM' }) targetPeriod?: string
}

export class DeductionReportQueryDto {
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) fromPeriod?: string
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) toPeriod?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) typeId?: number
}

export class DeductionInputDto {
  @Type(() => Number) @IsInt({ message: 'نوع الخصم مطلوب' }) @Min(1) deductionTypeId: number
  @Transform(asText) @IsString({ message: 'قيمة الخصم مطلوبة' }) @MaxLength(30) inputValue: string
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الواقعة بصيغة YYYY-MM-DD' }) incidentDate: string
  @IsString({ message: 'سبب الخصم مطلوب' }) @MaxLength(1000) reason: string
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'الشهر المستهدف بصيغة YYYY-MM' }) targetPeriod: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(24) installments?: number
  @IsOptional() @IsString() @MaxLength(300) attachmentRef?: string
  @IsOptional() @IsBoolean() confirmNotDuplicate?: boolean
}

export class CreateDeductionDto extends DeductionInputDto {
  @Type(() => Number) @IsInt({ message: 'الموظف مطلوب' }) @Min(1) employeeId: number
}

export class DeductionSelectionDto {
  @IsIn(DEDUCTION_SELECTION_MODES, { message: 'طريقة الاختيار: موظفون أو فريق أو قسم أو فرع' }) mode: string
  @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) ids: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) excludeEmployeeIds?: number[]
}

export class DeductionBulkPreviewDto extends DeductionInputDto {
  @ValidateNested() @Type(() => DeductionSelectionDto) selection: DeductionSelectionDto
}

export class DeductionBulkSubmitDto extends DeductionBulkPreviewDto {
  @Matches(/^[a-f0-9]{64}$/, { message: 'أعد المعاينة قبل الإرسال' }) previewHash: string
}

export class DeductionDecisionDto {
  @Type(() => Number) @IsInt() @Min(0) expectedRevision: number
  @IsOptional() @IsString() @MaxLength(1000) reason?: string
  @IsOptional() @Transform(asText) @IsString() @MaxLength(30) adjustedAmount?: string
}

export class DeductionListQueryDto {
  @IsOptional() @IsString() status?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) typeId?: number
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) targetPeriod?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) batchId?: number
  @IsOptional() @IsIn(['all', 'created', 'pending_me']) view?: string
}
