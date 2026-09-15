import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator'

// custody_assignments.condition nvarchar(100): ملاحظة النقل تُحفظ فيه، ومعها وصف الشطب وحالة الإرجاع
export const CUSTODY_TEXT_MAX = 100

export class TransferCustodyDto {
  @IsInt({ message: 'اختر الموظف المستلم' })
  toEmployeeId: number

  @IsOptional()
  @IsString({ message: 'ملاحظة النقل نص' })
  @MaxLength(CUSTODY_TEXT_MAX, { message: `ملاحظة النقل بحد أقصى ${CUSTODY_TEXT_MAX} حرف` })
  note?: string
}

export class WriteOffCustodyDto {
  @IsOptional()
  @IsString({ message: 'وصف حالة العهدة نص' })
  @MaxLength(CUSTODY_TEXT_MAX, { message: `وصف حالة العهدة بحد أقصى ${CUSTODY_TEXT_MAX} حرف` })
  condition?: string

  @IsOptional()
  @IsBoolean({ message: 'حقل الفقد نعم أو لا' })
  lost?: boolean
}

export class ReturnCustodyDto {
  @IsOptional()
  @IsString({ message: 'حالة العهدة عند الإرجاع نص' })
  @MaxLength(CUSTODY_TEXT_MAX, { message: `حالة العهدة عند الإرجاع بحد أقصى ${CUSTODY_TEXT_MAX} حرف` })
  condition?: string
}
