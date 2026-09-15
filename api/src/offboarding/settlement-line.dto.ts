import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class AddLineDto {
  @IsString({ message: 'وصف البند مطلوب' })
  @MinLength(2, { message: 'اسم البند حرفان على الأقل' })
  @MaxLength(200, { message: 'اسم البند بحد أقصى 200 حرف' })
  label: string

  @IsIn(['CREDIT', 'DEBIT'], { message: 'النوع: CREDIT أو DEBIT' })
  type: 'CREDIT' | 'DEBIT'

  @Type(() => Number)
  @IsNumber({}, { message: 'المبلغ رقم' })
  amount: number
}

export class UpdateLineDto {
  @IsOptional()
  @IsString({ message: 'اسم البند نص' })
  @MinLength(2, { message: 'اسم البند حرفان على الأقل' })
  @MaxLength(200, { message: 'اسم البند بحد أقصى 200 حرف' })
  label?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'المبلغ رقم' })
  amount?: number
}
