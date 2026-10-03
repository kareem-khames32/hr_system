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

// B1.8c: تسجيل صرف التصفية — التحقق الكامل (التاريخ والطريقة والمرجع) في readSettlementPaymentInput
export class SettlementPaymentDto {
  @IsString({ message: 'تاريخ الصرف بصيغة YYYY-MM-DD' })
  date: string

  @IsIn(['CASH', 'BANK_TRANSFER', 'CHEQUE'], { message: 'طريقة الصرف: نقدي أو تحويل بنكي أو شيك' })
  method: 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'

  @IsOptional()
  @IsString({ message: 'مرجع الصرف نص' })
  @MaxLength(100, { message: 'مرجع الصرف لحد 100 حرف' })
  reference?: string
}
