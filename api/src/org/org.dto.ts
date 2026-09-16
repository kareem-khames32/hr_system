import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { WEEKEND_DAYS_HINT, WEEKEND_DAYS_RE } from '../attendance/weekend-days'
import { CalendarChangeDto } from '../attendance/attendance-calendar-history'

// ===== الفروع =====
export class CreateBranchDto {
  @IsString({ message: 'اسم الفرع مطلوب' })
  @MinLength(2, { message: 'اسم الفرع قصير جداً' })
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsString({ message: 'كود الفرع مطلوب' })
  @Matches(/^[A-Za-z0-9-]{2,20}$/, {
    message: 'كود الفرع: حروف إنجليزية وأرقام وشرطة فقط',
  })
  code: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsEmail({}, { message: 'بريد الفرع غير صالح' })
  email?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  costCenter?: string

  // تجاوز العطلة الأسبوعية للفرع (مثل FRI) — غير مُرسل = إعداد النظام attendance.weekend_days
  @IsOptional()
  @Matches(WEEKEND_DAYS_RE, { message: `العطلة الأسبوعية للفرع: ${WEEKEND_DAYS_HINT}` })
  weekendDays?: string

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean

  // دولة الفرع — تحدد العطلات الرسمية السارية عليه
  @IsOptional()
  @Matches(/^[A-Za-z]{2,5}$/, { message: 'رمز الدولة حروف إنجليزية (مثل EG أو SA)' })
  country?: string

  // نظام التأمينات الاجتماعية للفرع — غير مُرسل = بدون تأمينات
  @IsOptional()
  @IsIn(['NONE', 'SAUDI', 'EGYPTIAN'], { message: 'نظام التأمينات: بدون أو السعودية أو المصرية' })
  insuranceSystem?: string
}

export class UpdateBranchDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CalendarChangeDto)
  calendarChange?: CalendarChangeDto

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, {
    message: 'كود الفرع: حروف إنجليزية وأرقام وشرطة فقط',
  })
  code?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsEmail({}, { message: 'بريد الفرع غير صالح' })
  email?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(50)
  costCenter?: string | null // null = بلا مركز تكلفة

  // null = مسح التجاوز (يعود الفرع لإعداد النظام attendance.weekend_days)
  @IsOptional()
  @Matches(WEEKEND_DAYS_RE, { message: `العطلة الأسبوعية للفرع: ${WEEKEND_DAYS_HINT}` })
  weekendDays?: string | null

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // null = مسح الدولة (كل العطلات تسري على الفرع)
  @IsOptional()
  @Matches(/^[A-Za-z]{2,5}$/, { message: 'رمز الدولة حروف إنجليزية (مثل EG أو SA)' })
  country?: string | null

  // نظام التأمينات الاجتماعية للفرع (بيأثر على المسير) — يغيّره حساب على مستوى الشركة فقط
  @IsOptional()
  @IsIn(['NONE', 'SAUDI', 'EGYPTIAN'], { message: 'نظام التأمينات: بدون أو السعودية أو المصرية' })
  insuranceSystem?: string
}

// ===== الأقسام =====
export class CreateDepartmentDto {
  @IsString({ message: 'اسم القسم مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @Type(() => Number)
  @IsInt({ message: 'فرع القسم مطلوب' })
  branchId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  // الهيكل التنظيمي — حساب على مستوى الشركة بس
  @IsOptional()
  @IsBoolean()
  isExecutive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  executiveSecretaryEmployeeId?: number | null
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null // null = قسم رئيسي (بلا أب)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // الهيكل التنظيمي: «الإدارة التنفيذية» والسكرتير التنفيذي — حساب على مستوى الشركة بس
  @IsOptional()
  @IsBoolean()
  isExecutive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  executiveSecretaryEmployeeId?: number | null // null = بدون سكرتير
}

// ===== الفرق =====
export class CreateTeamDto {
  @IsString({ message: 'اسم الفريق مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @Type(() => Number)
  @IsInt({ message: 'قسم الفريق مطلوب' })
  departmentId: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaderEmployeeId?: number
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaderEmployeeId?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
