import { Type } from 'class-transformer'
import { BadRequestException, PipeTransform } from '@nestjs/common'
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsObject, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator'

export class PayrollFormulaBodyPipe implements PipeTransform {
  constructor(private readonly maxNodes = 5000) {}
  transform(value: unknown) {
    // المرشح قد يتجاهل مفاتيح JavaScript الخاصة أثناء التحويل؛ نرفضها قبل أن تختفي من المدخل الأصلي.
    const pending: unknown[] = [value]
    let visited = 0
    while (pending.length) {
      if (++visited > this.maxNodes) throw new BadRequestException('حجم مدخلات اختبار المعادلة يتجاوز الحد المسموح')
      const item = pending.pop()
      if (item === null || typeof item !== 'object') continue
      for (const key of Object.keys(item)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new BadRequestException({ code: 'FORMULA_INPUT_UNKNOWN', message: `مفتاح غير مسموح: ${key}`, position: 1 })
        pending.push((item as Record<string, unknown>)[key])
      }
    }
    return value
  }
}

export class PayrollFormulaSymbolsDto {
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) components?: string[]
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) parameters?: string[]
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) typedDeductions?: string[]
}

export class PayrollFormulaInputsDto {
  // المفاتيح ديناميكية؛ يتحقق المختبر من عضويتها في الكتالوج ومن كل قيمة قبل التقييم.
  @ValidateIf((_, value) => value !== undefined) @IsObject() variables?: Record<string, string | number | null>
  @ValidateIf((_, value) => value !== undefined) @IsObject() components?: Record<string, string | number | null>
  @ValidateIf((_, value) => value !== undefined) @IsObject() parameters?: Record<string, string | number | null>
  @ValidateIf((_, value) => value !== undefined) @IsObject() typedDeductions?: Record<string, string | number | null>
}

export class ValidatePayrollFormulaDto {
  @IsString() @MinLength(1) @MaxLength(500) formula: string
  @ValidateIf((_, value) => value !== undefined) @IsIn(['AMOUNT', 'CONDITION']) kind?: 'AMOUNT' | 'CONDITION'
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollFormulaSymbolsDto) symbols?: PayrollFormulaSymbolsDto
}

export class TestPayrollFormulaDto extends ValidatePayrollFormulaDto {
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollFormulaInputsDto) inputs?: PayrollFormulaInputsDto
}

export class PayrollComponentOrderSymbolsDto {
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) parameters?: string[]
  @ValidateIf((_, value) => value !== undefined) @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{0,39}$/, { each: true }) typedDeductions?: string[]
}

export class PayrollComponentOrderItemDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{0,39}$/) code: string
  @IsInt() @Min(1) @Max(6) stage: number
  @IsInt() @Min(1) @Max(2147483647) sequence: number
  @IsBoolean() isActive: boolean
  @ValidateIf((_, value) => value !== undefined) @IsString() @MinLength(1) @MaxLength(500) formula?: string
  @ValidateIf((_, value) => value !== undefined) @IsString() @MinLength(1) @MaxLength(500) conditionFormula?: string
}

export class ValidatePayrollComponentOrderDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => PayrollComponentOrderItemDto) components: PayrollComponentOrderItemDto[]
  @ValidateIf((_, value) => value !== undefined) @IsObject() @ValidateNested() @Type(() => PayrollComponentOrderSymbolsDto) symbols?: PayrollComponentOrderSymbolsDto
  @ValidateIf((_, value) => value !== undefined) @IsBoolean() autoOrder?: boolean
}
