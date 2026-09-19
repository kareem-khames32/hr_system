import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { BULK_FIELDS, BULK_UPDATE_MAX_ROWS } from './employee-bulk-update.fields'

// تنزيل القالب: الحقول المختارة، والموظفين اللي هيتملى القالب ببياناتهم الحالية (اختياري)
export class BulkUpdateTemplateDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'اختار حقل واحد على الأقل' })
  @ArrayMaxSize(BULK_FIELDS.length)
  @IsIn(BULK_FIELDS.map(field => field.key), { each: true, message: 'حقل مش معروف في القالب' })
  fields: string[]

  @IsIn(['xlsx', 'csv'], { message: 'صيغة القالب: xlsx أو csv' })
  format: 'xlsx' | 'csv'

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(BULK_UPDATE_MAX_ROWS, { message: `القالب بحد أقصى ${BULK_UPDATE_MAX_ROWS} موظف` })
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  employeeIds?: number[]
}

// المعاينة والتطبيع (multipart مع الملف): خيارات السريان تتبعت نصوص
export class BulkUpdateOptionsDto {
  // «يسري من راتب شهر» العام لتغييرات الراتب (عمود الصف يغلبه)
  @IsOptional() @IsString() @MaxLength(20)
  salaryMonth?: string

  @IsOptional() @IsString() @MaxLength(500)
  salaryReason?: string

  @IsOptional() @IsString() @MaxLength(200)
  salaryEvidence?: string

  // نقل الفرع: تاريخ السريان (النهارده أو قبله) والسبب — نفس شروط تعديل فرع الملف
  @IsOptional() @IsString() @MaxLength(20)
  orgEffectiveFrom?: string

  @IsOptional() @IsString() @MaxLength(500)
  orgReason?: string

  // التطبيق على دفعات: أرقام صفوف الملف المطلوبة «2,3,4» (الفاضي = كل الصفوف الجاهزة)
  @IsOptional() @IsString() @MaxLength(20000)
  rows?: string
}
