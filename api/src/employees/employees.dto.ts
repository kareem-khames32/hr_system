import {
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator'
import { Type } from 'class-transformer'

// ============================================================
// تحقق إنشاء الموظف — القاعدة: البيانات تُرفض في الباك مهما كان الفرونت
// كود الموظف = كود البصمة على ZKTeco → فريد إجبارياً
// ============================================================

export class CreateEmployeeDto {
  @IsString({ message: 'كود الموظف مطلوب' })
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, {
    message: 'كود الموظف: حروف إنجليزية وأرقام و- _ فقط (2-20 خانة)',
  })
  employeeCode: string

  @IsString({ message: 'الاسم الكامل مطلوب' })
  @MinLength(3, { message: 'الاسم الكامل 3 أحرف على الأقل' })
  @MaxLength(200)
  fullName: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullNameEn?: string

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @MaxLength(200)
  email?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'رقم الهاتف غير صالح' })
  phone?: string

  @IsOptional()
  @Matches(/^\d{10,14}$/, { message: 'الرقم القومي: 10-14 رقماً' })
  nationalId?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الميلاد بصيغة YYYY-MM-DD' })
  birthDate?: string

  @IsOptional()
  @IsIn(['male', 'female'], { message: 'النوع: male أو female' })
  gender?: string

  @IsOptional()
  @IsIn(['single', 'married', 'divorced', 'widowed'], {
    message: 'الحالة الاجتماعية غير صالحة',
  })
  maritalStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'هاتف الطوارئ غير صالح' })
  emergencyContactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string

  @Type(() => Number)
  @IsInt({ message: 'الفرع مطلوب' })
  branchId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
  joinDate?: string

  @IsOptional()
  @IsIn(['permanent', 'fixed_term', 'part_time', 'seasonal'], {
    message: 'نوع العقد: permanent/fixed_term/part_time/seasonal',
  })
  contractType?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية العقد بصيغة YYYY-MM-DD' })
  contractStart?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'نهاية العقد بصيغة YYYY-MM-DD' })
  contractEnd?: string

  @IsOptional()
  @IsIn(['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'], {
    message: 'حالة الموظف غير صالحة',
  })
  status?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الراتب الأساسي رقم' })
  @Min(0, { message: 'الراتب لا يكون سالباً' })
  basicSalary?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل السكن رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  housingAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل الانتقال رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  transportAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'البدلات الأخرى رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  otherAllowance?: number

  @IsOptional()
  @IsIn(['transfer', 'cash', 'visa'], { message: 'طريقة الصرف: transfer/cash/visa' })
  payMethod?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string

  @IsOptional()
  @Matches(/^[A-Z]{2}[A-Z0-9]{13,32}$/, {
    message: 'IBAN غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)',
  })
  iban?: string
}

// التعديل: كل الحقول اختيارية بنفس قواعد التحقق
export class UpdateEmployeeDto {
  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, {
    message: 'كود الموظف: حروف إنجليزية وأرقام و- _ فقط (2-20 خانة)',
  })
  employeeCode?: string

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'الاسم الكامل 3 أحرف على الأقل' })
  @MaxLength(200)
  fullName?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullNameEn?: string

  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  @MaxLength(200)
  email?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'رقم الهاتف غير صالح' })
  phone?: string

  @IsOptional()
  @Matches(/^\d{10,14}$/, { message: 'الرقم القومي: 10-14 رقماً' })
  nationalId?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الميلاد بصيغة YYYY-MM-DD' })
  birthDate?: string

  @IsOptional()
  @IsIn(['male', 'female'], { message: 'النوع: male أو female' })
  gender?: string

  @IsOptional()
  @IsIn(['single', 'married', 'divorced', 'widowed'], {
    message: 'الحالة الاجتماعية غير صالحة',
  })
  maritalStatus?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'هاتف الطوارئ غير صالح' })
  emergencyContactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teamId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
  joinDate?: string

  @IsOptional()
  @IsIn(['permanent', 'fixed_term', 'part_time', 'seasonal'], {
    message: 'نوع العقد: permanent/fixed_term/part_time/seasonal',
  })
  contractType?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية العقد بصيغة YYYY-MM-DD' })
  contractStart?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'نهاية العقد بصيغة YYYY-MM-DD' })
  contractEnd?: string

  @IsOptional()
  @IsIn(['active', 'probation', 'notice_period', 'suspended', 'terminated', 'archived'], {
    message: 'حالة الموظف غير صالحة',
  })
  status?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الراتب الأساسي رقم' })
  @Min(0, { message: 'الراتب لا يكون سالباً' })
  basicSalary?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل السكن رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  housingAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل الانتقال رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  transportAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'البدلات الأخرى رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  otherAllowance?: number

  @IsOptional()
  @IsIn(['transfer', 'cash', 'visa'], { message: 'طريقة الصرف: transfer/cash/visa' })
  payMethod?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string

  @IsOptional()
  @Matches(/^[A-Z]{2}[A-Z0-9]{13,32}$/, {
    message: 'IBAN غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)',
  })
  iban?: string

  @IsOptional()
  isActive?: boolean
}
