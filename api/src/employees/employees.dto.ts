import {
  IsArray,
  IsBoolean,
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
  ValidateIf,
  ValidateNested,
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { EmployeeSalaryChangeDto } from './employee-salary-change.dto'
import { CalendarChangeDto } from '../attendance/attendance-calendar-history'
import { IsNotDataPlaceholder } from '../common/data-placeholders'

// أعمدة NOT NULL في التعديل: الغائب = بلا تغيير، وnull يُرفض برسالة (IsOptional كان
// يمرّره فيسقط الحفظ بخطأ قاعدة بيانات 500). بقية الحقول الاختيارية تقبل null = مسح القيمة
const NotNullIfSent = () => ValidateIf((_o, v) => v !== undefined)

export class RenewEmployeeContractDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية العقد بصيغة YYYY-MM-DD' })
  contractStart: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'نهاية العقد بصيغة YYYY-MM-DD' })
  contractEnd: string

  @IsString()
  @MinLength(3, { message: 'سبب التجديد 3 أحرف على الأقل' })
  @MaxLength(250, { message: 'سبب التجديد لا يتجاوز 250 حرفاً' })
  reason: string

  @IsOptional()
  @Matches(/^file:[1-9]\d*$/, { message: 'ارفع مستند العقد للحصول على مرجع ملف صالح' })
  contractFileRef?: string
}

// ============================================================
// تحقق إنشاء الموظف — القاعدة: البيانات تُرفض في الباك مهما كان الفرونت
// كود الموظف = كود البصمة على ZKTeco → فريد إجبارياً
// ============================================================

export class CreateEmployeeDto {
  // الخطوة 13: أجر التعيين يُوثَّق «يسري من راتب شهر» مع الإنشاء (حقل حمولة لا عمود). الغياب = شهر التعيين
  // أو شهر المسير الجاري أيهما أحدث؛ المقبول من شهر التعيين حتى ذلك الافتراض.
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '«يسري من راتب شهر» بصيغة YYYY-MM' })
  salaryEffectivePayrollPeriod?: string

  // مرجع مستند أجر التعيين (العقد/القرار)؛ الغياب = رقم العقد إن وُجد وإلا «إنشاء ملف الموظف #id»
  @IsOptional()
  @IsString()
  @MaxLength(200)
  salaryEvidenceReference?: string

  @IsString({ message: 'كود الموظف مطلوب' })
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, {
    message: 'كود الموظف: حروف إنجليزية وأرقام و- _ فقط (2-20 خانة)',
  })
  employeeCode: string

  // يُطابَق بكود البصمة القادم من الجهاز (عمود 20 خانة) — الأطول لا يطابق أبداً
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'رقم البصمة لا يتجاوز 20 خانة (طول كود جهاز البصمة)' })
  fingerprintCode?: string

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
  @IsEmail({}, { message: 'البريد الشخصي غير صالح' })
  @MaxLength(160)
  personalEmail?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'رقم الهاتف غير صالح' })
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneAlt?: string

  @IsOptional()
  @Matches(/^\d{10,14}$/, { message: 'الرقم القومي: 10-14 رقماً' })
  nationalId?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  passportNo?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'انتهاء الجواز بصيغة YYYY-MM-DD' })
  passportExpiry?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الميلاد بصيغة YYYY-MM-DD' })
  birthDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthPlace?: string

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
  @MaxLength(60)
  country?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emergencyRelation?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'هاتف الطوارئ غير صالح' })
  emergencyContactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyPhoneAlt?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsNotDataPlaceholder()
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
  costCenterId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workScheduleId?: number

  @NotNullIfSent()
  @IsIn(['INHERIT', 'ENABLED', 'DISABLED'])
  flexOverrideMode?: 'INHERIT' | 'ENABLED' | 'DISABLED'

  @NotNullIfSent()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  attendanceEffectiveFrom?: string

  @NotNullIfSent()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  attendanceChangeReason?: string

  @IsOptional()
  @IsBoolean()
  annualLeaveEntitled?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  photoFileId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
  joinDate?: string

  // ===== بيانات التوظيف =====
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية العمل الفعلي بصيغة YYYY-MM-DD' })
  actualStartDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => value === 'fulltime' ? 'full_time' : value === 'parttime' ? 'part_time' : value)
  @IsIn(['full_time', 'part_time', 'contract', 'consultant', 'intern'], { message: 'نوع التوظيف غير صالح' })
  workType?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'انتهاء فترة التجربة بصيغة YYYY-MM-DD' })
  probationEndDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  recruitmentSource?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workLocation?: string

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
  @IsString()
  @MaxLength(60)
  contractNumber?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contractDurationMonths?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticePeriodDays?: number

  // مرفق العقد (payload فقط، ليس عموداً على الموظف) — يُنشئ مستنداً نوعه «عقد»
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contractFileRef?: string

  @IsOptional()
  @IsIn(['active', 'probation', 'suspended'], {
    message: 'حالة الموظف غير صالحة',
  })
  status?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  salaryCycle?: string

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
  @IsNumber({}, { message: 'بدل الهاتف رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  phoneAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل طبيعة العمل رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  workNatureAllowance?: number

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
  @IsString()
  @MaxLength(120)
  bankBranch?: string

  @IsOptional()
  @Matches(/^[A-Z]{2}[A-Z0-9]{13,32}$/, {
    message: 'IBAN غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)',
  })
  iban?: string

  // ===== التأمينات الاجتماعية (GOSI) =====
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gosiNumber?: string

  @IsOptional()
  @IsBoolean()
  isGosiRegistered?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الراتب الخاضع للتأمينات رقم' })
  @Min(0, { message: 'المبلغ لا يكون سالباً' })
  gosiBaseSalary?: number

  // الرصيد الافتتاحي المُرحّل (لموظف قائم انتقل للنظام) — يُطبَّق على رصيد
  // السنوي عند التعيين كطبقة opening، ليس عموداً على الموظف
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الرصيد الافتتاحي رقم' })
  @Min(0, { message: 'الرصيد الافتتاحي لا يكون سالباً' })
  openingBalanceDays?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'صلاحية الرصيد الافتتاحي بصيغة YYYY-MM-DD',
  })
  openingBalanceExpiry?: string | null

  // مراجع المستندات المرفوعة (payload فقط، ليست أعمدة موظف) — كل عنصر
  // يُنشئ EmployeeDocument نوعه docType بمرجع الملف fileRef
  @IsOptional()
  @IsArray()
  documentRefs?: { docType: string; fileRef: string; number?: string }[]
}

// التعديل: كل الحقول اختيارية بنفس قواعد التحقق
export class UpdateEmployeeDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CalendarChangeDto)
  calendarChange?: CalendarChangeDto

  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested() @Type(() => EmployeeSalaryChangeDto)
  salaryChange?: EmployeeSalaryChangeDto

  @IsOptional()
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, {
    message: 'كود الموظف: حروف إنجليزية وأرقام و- _ فقط (2-20 خانة)',
  })
  employeeCode?: string

  // يُطابَق بكود البصمة القادم من الجهاز (عمود 20 خانة) — الأطول لا يطابق أبداً
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'رقم البصمة لا يتجاوز 20 خانة (طول كود جهاز البصمة)' })
  fingerprintCode?: string

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
  @IsEmail({}, { message: 'البريد الشخصي غير صالح' })
  @MaxLength(160)
  personalEmail?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'رقم الهاتف غير صالح' })
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneAlt?: string

  @IsOptional()
  @Matches(/^\d{10,14}$/, { message: 'الرقم القومي: 10-14 رقماً' })
  nationalId?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  passportNo?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'انتهاء الجواز بصيغة YYYY-MM-DD' })
  passportExpiry?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ الميلاد بصيغة YYYY-MM-DD' })
  birthDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  birthPlace?: string

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
  @MaxLength(60)
  country?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  emergencyContactName?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  emergencyRelation?: string

  @IsOptional()
  @Matches(/^[+\d][\d\s-]{6,20}$/, { message: 'هاتف الطوارئ غير صالح' })
  emergencyContactPhone?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyPhoneAlt?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @IsNotDataPlaceholder()
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
  costCenterId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workScheduleId?: number

  @NotNullIfSent()
  @IsIn(['INHERIT', 'ENABLED', 'DISABLED'])
  flexOverrideMode?: 'INHERIT' | 'ENABLED' | 'DISABLED'

  @NotNullIfSent()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  attendanceEffectiveFrom?: string

  @NotNullIfSent()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  attendanceChangeReason?: string

  @IsOptional()
  @IsBoolean()
  annualLeaveEntitled?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  photoFileId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  managerEmployeeId?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'تاريخ التعيين بصيغة YYYY-MM-DD' })
  joinDate?: string

  // ===== بيانات التوظيف =====
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'بداية العمل الفعلي بصيغة YYYY-MM-DD' })
  actualStartDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Transform(({ value }) => value === 'fulltime' ? 'full_time' : value === 'parttime' ? 'part_time' : value)
  @IsIn(['full_time', 'part_time', 'contract', 'consultant', 'intern'], { message: 'نوع التوظيف غير صالح' })
  workType?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'انتهاء فترة التجربة بصيغة YYYY-MM-DD' })
  probationEndDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(60)
  recruitmentSource?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gradeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(120)
  workLocation?: string

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
  @IsString()
  @MaxLength(60)
  contractNumber?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  contractDurationMonths?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticePeriodDays?: number

  // مرفق العقد (payload فقط، ليس عموداً على الموظف) — يُنشئ مستنداً نوعه «عقد»
  @IsOptional()
  @IsString()
  @MaxLength(500)
  contractFileRef?: string

  @IsOptional()
  @IsIn(['active', 'probation', 'suspended'], {
    message: 'حالة الموظف غير صالحة',
  })
  status?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string

  @IsOptional()
  @IsString()
  @MaxLength(20)
  salaryCycle?: string

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
  @IsNumber({}, { message: 'بدل الهاتف رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  phoneAllowance?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'بدل طبيعة العمل رقم' })
  @Min(0, { message: 'البدل لا يكون سالباً' })
  workNatureAllowance?: number

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
  @IsString()
  @MaxLength(120)
  bankBranch?: string

  @IsOptional()
  @Matches(/^[A-Z]{2}[A-Z0-9]{13,32}$/, {
    message: 'IBAN غير صالح (يبدأ برمز الدولة ثم أرقام/حروف)',
  })
  iban?: string

  // ===== التأمينات الاجتماعية (GOSI) =====
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gosiNumber?: string

  @IsOptional()
  @IsBoolean()
  isGosiRegistered?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الراتب الخاضع للتأمينات رقم' })
  @Min(0, { message: 'المبلغ لا يكون سالباً' })
  gosiBaseSalary?: number

  // الرصيد الافتتاحي المُرحّل — يُطبَّق على رصيد السنوي (تعديل لموظف قائم)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'الرصيد الافتتاحي رقم' })
  @Min(0, { message: 'الرصيد الافتتاحي لا يكون سالباً' })
  openingBalanceDays?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'صلاحية الرصيد الافتتاحي بصيغة YYYY-MM-DD',
  })
  openingBalanceExpiry?: string | null

  // مراجع المستندات المرفوعة (payload فقط، ليست أعمدة موظف) — كل عنصر
  // يُنشئ EmployeeDocument نوعه docType بمرجع الملف fileRef
  @IsOptional()
  @IsArray()
  documentRefs?: { docType: string; fileRef: string; number?: string }[]
}
