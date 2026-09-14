import { Transform, Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { DEDUCTION_APPROVAL_ROLES } from './typed-deductions'
import { BONUS_CALC_METHODS, BONUS_CREATOR_BASES, BONUS_SELECTION_MODES } from './bonuses'

// C4 / الخطوة 27: المدخلات تُفحص شكلًا هنا، والقواعد كاملة (النطاق والسقف والتكرار والفترة) في الخدمة
const asText = ({ value }: { value: unknown }) => typeof value === 'number' ? String(value) : value

export class BonusTypeDto {
  @IsOptional() @IsString() @MaxLength(40) code?: string
  @IsOptional() @IsString() @MaxLength(120) nameAr?: string
  @IsOptional() @IsString() @MaxLength(120) nameEn?: string | null
  @IsOptional() @IsIn(BONUS_CALC_METHODS) calcMethod?: string
  @IsOptional() @Transform(asText) @IsString() defaultValue?: string | null
  @IsOptional() @Transform(asText) @IsString() valueStep?: string | null
  @IsOptional() @Transform(asText) @IsString() minAmount?: string | null
  @IsOptional() @Transform(asText) @IsString() maxAmount?: string | null
  @IsOptional() @Transform(asText) @IsString() maxPctOfBase?: string | null
  @IsOptional() @IsBoolean() isTaxable?: boolean
  @IsOptional() @IsBoolean() isInsurable?: boolean
  @IsOptional() @IsArray() @IsIn(BONUS_CREATOR_BASES, { each: true }) creatorScopes?: string[]
  @IsOptional() @IsArray() @IsIn(DEDUCTION_APPROVAL_ROLES, { each: true }) approvalSteps?: string[]
  @IsOptional() @Transform(asText) @IsString() escalationDays?: string | null
  @IsOptional() @IsString() escalationStep?: string | null
  @IsOptional() @IsBoolean() isActive?: boolean
}

export class BonusInputDto {
  @Type(() => Number) @IsInt({ message: 'نوع المكافأة مطلوب' }) @Min(1) bonusTypeId: number
  @Transform(asText) @IsString({ message: 'قيمة المكافأة مطلوبة' }) @MaxLength(30) inputValue: string
  @IsString({ message: 'سبب المكافأة مطلوب' }) @MaxLength(1000) reason: string
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'الشهر المستهدف بصيغة YYYY-MM' }) targetPeriod: string
  @IsOptional() @IsString() @MaxLength(300) attachmentRef?: string
  @IsOptional() @IsBoolean() confirmNotDuplicate?: boolean
}

export class CreateBonusDto extends BonusInputDto {
  @Type(() => Number) @IsInt({ message: 'الموظف المستفيد مطلوب' }) @Min(1) employeeId: number
}

export class BonusSelectionDto {
  @IsIn(BONUS_SELECTION_MODES, { message: 'طريقة الاختيار: موظفون أو فريق أو قسم أو فرع' }) mode: string
  @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) ids: number[]
  @IsOptional() @IsArray() @ArrayMaxSize(1000) @Type(() => Number) @IsInt({ each: true }) @Min(1, { each: true }) excludeEmployeeIds?: number[]
}

export class BonusBulkPreviewDto extends BonusInputDto {
  @ValidateNested() @Type(() => BonusSelectionDto) selection: BonusSelectionDto
}

export class BonusBulkSubmitDto extends BonusBulkPreviewDto {
  @Matches(/^[a-f0-9]{64}$/, { message: 'أعد المعاينة قبل الإرسال' }) previewHash: string
}

export class BonusDecisionDto {
  @Type(() => Number) @IsInt() @Min(0) expectedRevision: number
  @IsOptional() @IsString() @MaxLength(1000) reason?: string
  @IsOptional() @Transform(asText) @IsString() @MaxLength(30) adjustedAmount?: string
}

export class BonusReverseDto {
  @Type(() => Number) @IsInt() @Min(0) expectedRevision: number
  @IsString({ message: 'سبب العكس مطلوب' }) @MaxLength(1000) reason: string
  @IsOptional() @Transform(asText) @IsString() @MaxLength(30) amount?: string
}

export class BonusListQueryDto {
  @IsOptional() @IsString() status?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) typeId?: number
  @IsOptional() @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) targetPeriod?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) employeeId?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(2147483647) batchId?: number
  @IsOptional() @IsIn(['all', 'created', 'pending_me']) view?: string
}
