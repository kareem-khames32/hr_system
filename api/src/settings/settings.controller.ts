import {
  BadRequestException,
  ForbiddenException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { assertCompanyWideWrite, branchScopeOf, CurrentUser, JwtAuthGuard, Perm, RolesGuard, userHasPerm } from '../auth/guards'
import { ApprovalChain } from '../requests/entities/approval-chain.entity'
import { ApprovalStep } from '../requests/entities/approval-step.entity'
import { Branch } from '../org/entities/branch.entity'
import {
  DestinationsService,
  ENGINE_RECORD_HANDLERS,
} from '../requests/destinations.service'
import { LeaveType } from '../requests/entities/leave.entities'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { DEVICE_KEY_MIN_LENGTH, deviceKeyWeakness } from '../attendance/device-key'
import { normalizeWeekendDays, weekendDaysError } from '../attendance/weekend-days'
import { eosConfigError } from '../offboarding/eos'
import { Employee } from '../employees/employee.entity'
import type { JwtPayload } from '../auth/auth.service'
import { captureLegacyAttendanceRuleBaselines, lockAttendanceRuleMutation } from '../attendance/attendance-rule-history'
import { assertCalendarScope, beginCalendarChange, CalendarChangeDto, finishCalendarChange } from '../attendance/attendance-calendar-history'
import { overtimeWageComponents } from '../payroll/overtime-financial'
import { PAYROLL_POLICY_CYCLE_CONFIG_KEYS, PAYROLL_POLICY_NULLABLE_CONFIG_KEYS, payrollPolicyCycleConfigError, validatePayrollPolicyDefaultConfig } from '../payroll/payroll-policy-settings'
import { payrollDecisionConfigError } from '../payroll/payroll-decision-settings'
import { PAYROLL_SELF_APPROVAL_LICENCE_PERMISSION, payrollSelfApprovalLicenceIssue } from '../payroll/payroll-run-approval'
import { DATA_PLACEHOLDER_REJECTED, isDataPlaceholder, withoutDataPlaceholder } from '../common/data-placeholders'
import { deductionSettingError } from '../payroll/typed-deductions'
import { bonusSettingError } from '../payroll/bonuses'
import { exemptionSettingError } from '../payroll/financial-exemptions'
import { companyProfileConfigError } from './company-profile'
import { assertDefinitionBranchUnchanged, assertDefinitionWritable, definitionBranchForCreate, definitionBranchWhere, definitionInBranch } from '../common/definition-branch'
import { AUDIENCE_POSITION_KEYS, AUDIENCE_WHERE_MODES, AUDIENCE_WHO_MODES } from '../requests/request-audience'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'

class UpsertConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CalendarChangeDto)
  calendarChange?: CalendarChangeDto

  @IsString()
  @MaxLength(100)
  key: string

  @IsString()
  @MaxLength(500)
  value: string
}

// ===== شاشة أنواع الإجازات (قرار المالك 16 سبتمبر): إعداد كل نوع حسب فئته =====
const LEAVE_CATEGORIES = ['ANNUAL', 'OCCASION', 'SICK', 'UNPAID'] as const
class LeaveTypeRulesDto {
  @IsOptional() @IsIn(LEAVE_CATEGORIES, { message: 'فئة الإجازة: برصيد سنوي أو بمناسبة أو مرضية أو بدون راتب' })
  category?: string

  @IsOptional() @IsString() @MaxLength(200)
  nameEn?: string | null

  @IsOptional() @IsString() @MaxLength(500)
  description?: string | null

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'عدد أيام السنة رقم' }) @Min(0)
  annualDays?: number | null

  @IsOptional() @IsIn(['YEAR_START', 'HIRE_ANNIVERSARY'], { message: 'تجديد الرصيد: بداية السنة أو تاريخ تعيين الموظف' })
  renewalBasis?: string

  @IsOptional() @IsBoolean()
  carryOverEnabled?: boolean

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'أقصى أيام الترحيل رقم' }) @Min(0)
  carryOverMaxDays?: number | null

  // السنوية للموظف الجديد: الرصيد يبدأ بعد كام شهر من التعيين (0 = من يوم التعيين، فاضي = الإعداد العام)
  @IsOptional() @Type(() => Number) @IsInt({ message: 'شهور بداية الاستحقاق رقم صحيح' }) @Min(0) @Max(60, { message: 'شهور بداية الاستحقاق لحد 60 شهر' })
  entitlementStartMonths?: number | null

  // أول سنة يستحق فيها: بالنسبة والتناسب ولا كاملة
  @IsOptional() @IsBoolean()
  firstYearProrated?: boolean

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'عدد أيام المناسبة رقم' }) @Min(0)
  fixedDays?: number | null

  @IsOptional() @Type(() => Number) @IsInt({ message: 'أقصى مرات في السنة رقم صحيح' }) @Min(1)
  maxTimesPerYear?: number | null

  @IsOptional() @IsArray({ message: 'جدول أجر المرضية قائمة صفوف' })
  sickPayTiers?: Array<{ fromDay: number; toDay: number | null; payPercent: number }> | null

  @IsOptional() @Type(() => Number) @IsNumber({}, { message: 'أقل أيام في الطلب رقم' }) @Min(0)
  minDaysPerRequest?: number | null

  @IsOptional() @Type(() => Number) @IsInt({ message: 'التقديم قبلها بكام يوم رقم صحيح' }) @Min(0)
  noticeDays?: number

  @IsOptional() @IsBoolean()
  backdateAllowed?: boolean

  @IsOptional() @Type(() => Number) @IsInt({ message: 'أقصى أيام للخلف رقم صحيح' }) @Min(0)
  backdateMaxDays?: number | null

  @IsOptional() @IsIn(['ALL_DAYS', 'WORKING_DAYS'], { message: 'حساب الأيام: كل الأيام أو أيام العمل' })
  countingMode?: string

  @IsOptional() @IsBoolean()
  halfDayAllowed?: boolean

  @IsOptional() @IsIn(['NONE', 'OPTIONAL', 'REQUIRED', 'REQUIRED_ABOVE_DAYS'], { message: 'المرفق: لا أو اختياري أو مطلوب أو مطلوب فوق عدد أيام' })
  attachmentRule?: string

  @IsOptional() @Type(() => Number) @IsInt({ message: 'عدد الأيام اللي فوقها المرفق مطلوب رقم صحيح' }) @Min(0)
  attachmentAboveDays?: number | null

  @IsOptional() @IsIn(['WITH_REQUEST', 'AFTER_RETURN'], { message: 'وقت رفع المرفق: مع الطلب أو بعد الرجوع' })
  attachmentTiming?: string

  @IsOptional() @Type(() => Number) @IsInt({ message: 'مهلة رفع المرفق رقم صحيح' }) @Min(1)
  attachmentDeadlineDays?: number
}

class CreateLeaveTypeDto extends LeaveTypeRulesDto {
  @IsString({ message: 'كود نوع الإجازة مطلوب' })
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: 'الكود بالإنجليزي بحروف كبيرة وأرقام وشرطة سفلية، مثل ANNUAL' })
  code: string

  @IsString({ message: 'اسم نوع الإجازة مطلوب' })
  @MinLength(2)
  @MaxLength(200)
  nameAr: string

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'], {
    message: 'مصدر الرصيد: annual أو sick أو none',
  })
  balanceSource?: string

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'])
  balanceType?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  requiredAttachment?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDays?: number

  @IsOptional()
  @IsBoolean()
  oncePerService?: boolean

  // فرع النوع: فاضي = كل الشركة؛ حساب الفرع يضيف لفرعه تلقائيًا
  @IsOptional()
  @IsInt({ message: 'الفرع غير صحيح' })
  branchId?: number | null
}

class UpdateLeaveTypeDto extends LeaveTypeRulesDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'])
  balanceSource?: string

  @IsOptional()
  @IsIn(['annual', 'sick', 'none'])
  balanceType?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  requiredAttachment?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDays?: number

  @IsOptional()
  @IsBoolean()
  oncePerService?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // فرع النوع ثابت بعد الإضافة — يُقبل فقط لو مطابق للحالي
  @IsOptional()
  @IsInt({ message: 'الفرع غير صحيح' })
  branchId?: number | null
}

class UpdateStepDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slaDays?: number

  @IsOptional()
  @IsString()
  @IsIn(['direct_manager_of_requester', 'department_manager_of_requester', 'branch_manager_of_requester', 'receiving_team_manager', 'hr', 'finance', 'custody_officer', 'payroll_officer', 'it', 'executive'])
  @MaxLength(60)
  escalateTo?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thresholdValue?: number
}

// أدوار الموافقة المسموحة — تُحل ديناميكياً وقت التشغيل
const APPROVER_ROLES = [
  'direct_manager_of_requester',
  'department_manager_of_requester',
  'branch_manager_of_requester',
  'receiving_team_manager',
  'hr',
  'finance',
  'custody_officer',
  'payroll_officer',
  'it',
  'executive',
  'specific_employee',
]

class ChainStepDto {
  @IsIn(APPROVER_ROLES, { message: 'دور الموافقة غير صالح' })
  approverRole: string

  // متوازية مع الخطوة السابقة (نفس المستوى — كلهم يعتمدون)
  @IsOptional()
  @IsBoolean()
  isParallel?: boolean

  // إجباري فقط عند اختيار «موظف بعينه»
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  specificEmployeeId?: number

  @IsOptional()
  @IsString()
  @MaxLength(60)
  thresholdField?: string

  @IsOptional()
  @IsIn(['>=', '>', '<', '<='], { message: 'معامل العتبة: >= أو > أو < أو <=' })
  thresholdOp?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  thresholdValue?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  slaDays?: number

  @IsOptional()
  @IsIn(APPROVER_ROLES, { message: 'دور التصعيد غير صالح' })
  escalateTo?: string
}

class ReplaceStepsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChainStepDto)
  steps: ChainStepDto[]
}

class CreateChainDto {
  @IsString({ message: 'كود السلسلة مطلوب' })
  @MinLength(3)
  @MaxLength(50)
  code: string

  @IsString({ message: 'اسم السلسلة مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  nameAr: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  branchId?: number

  // بدون الديكوريتر كان whitelist يحذف الخطوات من الجسم كلياً
  @IsArray({ message: 'الخطوات مطلوبة (مصفوفة، ويمكن أن تكون فارغة للأوتوماتيك)' })
  @ValidateNested({ each: true })
  @Type(() => ChainStepDto)
  steps: ChainStepDto[]
}

class UpdateChainDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // نقل الدورة لفرع (أو null = عامة) — §2.2 تعديل كامل بعد الإنشاء
  // IsOptional يمرّر null (= عامة)؛ غير ذلك رقم صحيح لفرع موجود (يُتحقق في updateChain)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'الفرع غير صالح' })
  branchId?: number | null

  // تنفيذ فوري بلا اعتمادات (لسلسلة فاضية عمداً) — اختيار المالك
  @IsOptional()
  @IsBoolean()
  autoApprove?: boolean
}

// ===== بانِي أنواع الطلبات: نوع من الصفر بحقول مخصوصة وجمهور =====
const FIELD_TYPES = ['text', 'number', 'date', 'select', 'file']
// الجمهور «مين» + «فين» (قرار المالك 16 سبتمبر) — القيم المقبولة من request-audience.ts نفسه
const AUDIENCE_MODES: readonly string[] = AUDIENCE_WHO_MODES
// تسميات الوجهات للبانِي. المقبول فعلياً = «none» + كل handler مسجّل في
// DestinationsService (مفتاح منفّذ بلا تسمية هنا يظهر بكوده ولا يُرفض)
const AVAILABLE_HANDLERS: Array<{ key: string; labelAr: string }> = [
  { key: 'none', labelAr: 'سجل فقط — بلا تنفيذ آلي (الطلب نفسه هو السجل)' },
  { key: 'leave_deduct_balance', labelAr: 'إجازة تُخصم من الرصيد' },
  { key: 'leave_no_balance', labelAr: 'إجازة بلا خصم رصيد' },
  { key: 'overtime_entries', labelAr: 'قيد أوفرتايم' },
  { key: 'attendance_corrections', labelAr: 'تصحيح بصمة' },
  { key: 'holiday_work', labelAr: 'دوام يوم عطلة — ساعات البصمة بدل في المسير' },
  { key: 'loans_installments', labelAr: 'سلفة بجدول أقساط' },
  { key: 'loan_installment_defer', labelAr: 'تأجيل قسط سلفة بعد الاعتماد' },
  { key: 'salary_update_history', labelAr: 'تحديث راتب' },
  { key: 'transfers_effective_date', labelAr: 'نقل بتاريخ سريان' },
  { key: 'employee_update_promotions', labelAr: 'ترقية' },
  { key: 'employee_record', labelAr: 'تحديث بيانات الموظف' },
  { key: 'payroll_bank_secure', labelAr: 'تغيير حساب بنكي (مسار أمني)' },
  { key: 'letter_pdf_generator', labelAr: 'خطاب PDF' },
  { key: 'custody_assignments_ack', labelAr: 'عهدة بتأكيد استلام' },
  { key: 'custody_transfer', labelAr: 'نقل عهدة لموظف آخر' },
  { key: 'overtime_auto', labelAr: 'اعتماد أوفرتايم مكتشف بالبصمة' },
  { key: 'employee_status', labelAr: 'تغيير حالة وظيفية (استقالة/تقاعد)' },
  { key: 'leave_calendar', labelAr: 'إجازة تُخصم من الرصيد (وجهة قديمة)' },
  { key: 'leave_calendar_once', labelAr: 'إجازة لمرة واحدة بلا خصم رصيد (حج)' },
  { key: 'leave_balance_restore', labelAr: 'إلغاء/تعديل إجازة واسترداد الرصيد' },
  { key: 'employee_record_auto', labelAr: 'تحديث بيانات الموظف (تلقائي)' },
  { key: 'custody_return', labelAr: 'إرجاع عهدة' },
  { key: 'custody_finance', labelAr: 'بلاغ فقد/تلف عهدة (مديونية على الموظف)' },
  { key: 'payroll_bonus', labelAr: 'مكافأة (دفتر المديونيات)' },
  { key: 'payroll_allowance', labelAr: 'بدل لمرة واحدة (دفتر المديونيات)' },
  { key: 'expense_register', labelAr: 'صرف مصروفات (دفتر المديونيات)' },
  { key: 'payroll_adjustment', labelAr: 'تسوية مالية (دفتر المديونيات)' },
]

class CustomFieldDto {
  @IsString({ message: 'مفتاح الحقل مطلوب' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{1,40}$/, {
    message: 'مفتاح الحقل: حروف إنجليزية وأرقام و_ (يبدأ بحرف)',
  })
  key: string

  @IsString({ message: 'تسمية الحقل مطلوبة' })
  @MinLength(2)
  @MaxLength(100)
  label: string

  @IsIn(FIELD_TYPES, { message: 'نوع الحقل: text/number/date/select/file' })
  type: string

  @IsOptional()
  @IsBoolean()
  required?: boolean

  @IsOptional()
  @IsArray()
  options?: string[]
}

class CreateRequestTypeDto {
  @IsString({ message: 'اسم النوع مطلوب' })
  @MinLength(3)
  @MaxLength(200)
  nameAr: string

  @IsIn(
    ['leaves', 'time_attendance', 'financial', 'employment_status', 'personal_data', 'letters', 'custody_assets', 'training', 'employee_relations'],
    { message: 'الفئة غير صالحة' }
  )
  category: string

  @IsOptional()
  @Matches(/^[A-Z][A-Z0-9_]{2,40}$/, {
    message: 'الكود: حروف إنجليزية كبيرة وأرقام و_ (اتركه فارغاً للتوليد)',
  })
  code?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredAttachments?: string

  @IsOptional()
  @IsString()
  destinationHandler?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  approvalChainId?: number

  @IsOptional()
  visibleTo?: AudienceDto

  // فرع النوع: فاضي = كل الشركة؛ حساب الفرع يضيف لفرعه تلقائيًا
  @IsOptional()
  @IsInt({ message: 'الفرع غير صحيح' })
  branchId?: number | null
}

type AudienceDto = { mode: string; ids: Array<number | string>; where?: { mode?: string; ids?: Array<number | string> } | null }

class UpdateRequestTypeFullDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nameAr?: string

  @IsOptional()
  isActive?: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  approvalChainId?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[]

  @IsOptional()
  visibleTo?: AudienceDto

  // فرع النوع ثابت بعد الإضافة — يُقبل فقط لو مطابق للحالي
  @IsOptional()
  @IsInt({ message: 'الفرع غير صحيح' })
  branchId?: number | null

  @IsOptional()
  @IsString()
  destinationHandler?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  requiredAttachments?: string
}

// إعدادات النظام — كلها للأدمن/HR
@UseGuards(JwtAuthGuard, RolesGuard)
@Perm('settings.manage')
@Controller('settings')
export class SettingsController {
  constructor(
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    @InjectRepository(LeaveType)
    private readonly leaveTypes: Repository<LeaveType>,
    @InjectRepository(ApprovalChain)
    private readonly chains: Repository<ApprovalChain>,
    @InjectRepository(ApprovalStep)
    private readonly steps: Repository<ApprovalStep>,
    @InjectRepository(RequestType)
    private readonly requestTypes: Repository<RequestType>,
    private readonly destinations: DestinationsService
  ) {}

  // ===== إعدادات المحرك (مفاتيح/قيم) =====
  @Get('config')
  listConfig() {
    return this.config.find({ order: { key: 'ASC' } })
  }

  // بيانات الشركة لرأس المستندات المولَّدة من ملف الموظف (الاسم/السجل/العنوان/
  // الشعار) — قراءة لمن يفتح ملفات الموظفين أو يدير المستندات، والتعديل عبر
  // PATCH config (settings.manage). القيمة الفارغة = غير مضبوط
  @Perm('settings.manage', 'employees.view', 'documents.manage')
  @Get('company')
  async company() {
    const rows = await this.config.find({
      where: {
        key: In([
          'company.name',
          'company.name_en',
          'company.commercial_register',
          'company.address',
          'company.phone',
          'company.logo_file_id',
        ]),
      },
    })
    const v = (k: string) => (rows.find((r) => r.key === k)?.value ?? '').trim()
    const logo = Number(v('company.logo_file_id'))
    return {
      // القيمة المؤقتة (الخطوة 9) = غير مضبوط، لا اسم يُطبع في رأس المستندات
      name: withoutDataPlaceholder(v('company.name')),
      nameEn: v('company.name_en'),
      commercialRegister: v('company.commercial_register'),
      address: v('company.address'),
      phone: v('company.phone'),
      logoFileId: Number.isInteger(logo) && logo > 0 ? logo : null,
    }
  }

  // مفاتيح رقمية حرجة للمحرك — قيمة فارغة/غير رقمية/أقل من الحد الأدنى تُفسد
  // المسير (قسمة على صفر) أو الحساب. نرفضها هنا كشبكة أمان لأي مصدر.
  private static readonly NUMERIC_MIN: Record<string, number> = {
    'leave.annual_entitled': 0,
    'leave.sick_entitled': 0,
    'leave.max_backdate_days': 0,
    'leave.probation_months': 0,
    'leave.carryover_max_days': 0,
    'leave.carryover_expiry_months': 0,
    'attendance.grace_minutes': 0,
    'attendance.flex.shortfall_grace_minutes': 0,
    'attendance.flex.unpaid_break_minutes': 0,
    'attendance.flex.max_session_minutes': 1,
    'payroll.shortfall_value': 0,
    'payroll.attendance_daily_cap_days': 0,
    'attendance.absence_catchup_max_days': 1, // لحاق الغياب — يوم على الأقل
    'onboarding.window_days': 1, // نافذة شاشة التهيئة — يوم على الأقل
    'overtime.detection_threshold_hours': 0,
    'overtime.rounding_minutes': 1,
    'overtime.request_backdate_days': 0,
    'overtime.max_closed_periods': 0,
    'overtime.max_hours_per_day': 0,
    'overtime.max_hours_per_week': 0,
    'overtime.max_hours_per_month': 0,
    'overtime.multiplier_weekday': 0.01,
    'overtime.multiplier_weekend': 0.01,
    'overtime.multiplier_holiday': 0.01,
    'eos.months_per_year': 0,
    'eos.tier1_years': 0,
    'eos.months_per_year_after': 0,
    'payroll.cycle_start_day': 1,
    'payroll.monthly_days': 1, // مقسوم عليه — لا يكون صفراً
    'payroll.daily_hours': 1, // مقسوم عليه — لا يكون صفراً
    'payroll.policy.cycle_end_day': 1,
    'payroll.policy.rounding_scale': 0,
    'payroll.policy.max_deduction_pct_of_gross': 0,
    'payroll.policy.min_net_guarantee': 0,
    'payroll.policy.net_floor_pct': 0,
    'payroll.exemption_reason_min_length': 1,
    'loan.exceptional_reason_min_length': 1,
    'loan.first_installment_max_months_ahead': 0,
    'loan.request_from_day': 1,
    'loan.request_to_day': 1,
    // C2: الخصومات المصنفة
    'deductions.reason_min_length': 1,
    'deductions.duplicate_window_hours': 0,
    'deductions.bulk_max_employees': 1,
  }

  // مفاتيح بقائمة قيم مغلقة: leave.accrual_mode — أي قيمة أخرى كان محرك الأرصدة
  // يعاملها بصمت كـ«سنوي» (الاستحقاق كامل مقدماً)
  private static readonly ALLOWED_VALUES: Record<string, string[]> = {
    'loan.insufficient_net_behavior': ['PARTIAL_THEN_CARRY', 'SKIP_AND_EXTEND'],
    // القرار ب2: «اقفل طلب السلفة الآن» — مفتاح واحد يعلو أيام الطلب من الشهر
    'loan.request_open': ['true', 'false'],
    'deductions.manager_creation_enabled': ['true', 'false'],
    'leave.accrual_mode': ['monthly', 'yearly', 'daily'],
    'payroll.exempt_overtime_eligible': ['true', 'false'],
    'payroll.exempt_unpaid_leave_deductible': ['true', 'false'],
    'attendance.flex.count_early_work_toward_required': ['true', 'false'],
    'attendance.flex.prorate_window_on_partial_leave': ['true', 'false'],
    'attendance.flex.window_supersedes_grace': ['true', 'false'],
    'attendance.flex.missing_checkout_policy': ['MANUAL_ONLY'],
    'payroll.shortfall_enabled': ['true', 'false'],
    'payroll.shortfall_mode': ['MINUTES', 'MULTIPLIER', 'FRACTION'],
    'payroll.attendance_overlap_policy': ['CUMULATIVE', 'MAX_OF_BOTH', 'NET_OF_LATENESS'],
    'payroll.late_deduction_enabled': ['true', 'false'],
    // الخطوة 13: راتب شهر المسير من السجل الشهري؛ الوضع الانتقالي يوسم راتب الملف «غير موثق».
    'payroll.salary_evidence_mode': ['MONTHLY_HISTORY', 'MONTHLY_HISTORY_OR_CURRENT_FILE'],
    'overtime.enabled': ['true', 'false'],
    // OT-05: لا يسمح مفتاح قديم بتجاوز دورة الاعتماد لأي قيد جديد.
    'overtime.biometric_requires_confirmation': ['true'],
    'overtime.rounding_direction': ['DOWN'],
    'overtime.allow_early_overtime': ['true', 'false'],
    'overtime.missing_punch_policy': ['BLOCK'],
    'overtime.leave_conflict_policy': ['BLOCK'],
  }

  @Patch('config')
  async upsertConfig(@Body() dto: UpsertConfigDto, @CurrentUser() user: JwtPayload) {
    assertCompanyWideWrite(user)
    // مفاتيح جديدة غير مسموحة إلا من الكود — نعدّل الموجود فقط
    const row = await this.config.findOne({ where: { key: dto.key } })
    if (!row) throw new NotFoundException(`المفتاح ${dto.key} غير معروف`)
    // الخطوة 22 (B5، تصحيح المراجعة): رخصة الشركة الصغيرة تفك فصل المهام في اعتماد المسير — صلاحية مستقلة يمنحها مدير النظام فقط، لا settings.manage وحدها
    const licenceIssue = payrollSelfApprovalLicenceIssue({ key: dto.key, canManageLicence: userHasPerm(user, PAYROLL_SELF_APPROVAL_LICENCE_PERMISSION) })
    if (licenceIssue) throw new ForbiddenException(licenceIssue)
    // الخطوة 9 (مسار R2): القيمة المؤقتة لا تُحفظ كاسم شركة مؤكد
    if (dto.key.startsWith('company.') && isDataPlaceholder(dto.value)) throw new BadRequestException(DATA_PLACEHOLDER_REJECTED)
    // ملف الشركة: صيغ خفيفة (آيبان SA/EG، بريد، رقم موحد، تاريخ انتهاء السجل...)
    const companyProfileError = companyProfileConfigError(dto.key, dto.value)
    if (companyProfileError) throw new BadRequestException(companyProfileError)
    // PL-01: القيم الافتراضية للنسخ الجديدة تشترك في حدود التحقق مع إعدادات النسخة.
    const policyConfigError = validatePayrollPolicyDefaultConfig(dto.key, dto.value)
    if (policyConfigError) throw new BadRequestException(policyConfigError)
    // الخطوة 15: دورة النسخ الجديدة متصلة؛ يوم النهاية الثابت لا ينفصل عن يوم البداية بتعديل مفتاح واحد.
    if (PAYROLL_POLICY_CYCLE_CONFIG_KEYS.includes(dto.key)) {
      const cycleRows = await this.config.find({ where: { key: In(PAYROLL_POLICY_CYCLE_CONFIG_KEYS) } })
      const cycleError = payrollPolicyCycleConfigError(dto.key, dto.value, new Map(cycleRows.map(item => [item.key, item.value])))
      if (cycleError) throw new BadRequestException(cycleError)
    }
    // الخطوة 12 / D1–D11: أيام الشهر 30 فقط، وحدود الساعة والدورة ولحاق الأقساط والقيم المغلقة للقرارات.
    const decisionConfigError = payrollDecisionConfigError(dto.key, dto.value)
    if (decisionConfigError) throw new BadRequestException(decisionConfigError)
    // C2: مفاتيح deductions.* بحدودها الدنيا والعليا وقيمها المغلقة (نفس ما يقرؤه الخادم)
    const deductionConfigError = deductionSettingError(dto.key, dto.value)
    if (deductionConfigError) throw new BadRequestException(deductionConfigError)
    // C4: مفاتيح bonuses.* بنفس النمط
    const bonusConfigError = bonusSettingError(dto.key, dto.value)
    if (bonusConfigError) throw new BadRequestException(bonusConfigError)
    // C3: مفاتيح financial_exemptions.* بنفس النمط
    const exemptionConfigError = exemptionSettingError(dto.key, dto.value)
    if (exemptionConfigError) throw new BadRequestException(exemptionConfigError)
    // تحقق المفاتيح الرقمية الحرجة: رقم صالح ≥ الحد الأدنى
    const min = SettingsController.NUMERIC_MIN[dto.key]
    const nullablePolicyValue = PAYROLL_POLICY_NULLABLE_CONFIG_KEYS.has(dto.key) && dto.value === 'null'
    if (min !== undefined && !nullablePolicyValue) {
      const n = Number(dto.value)
      if (dto.value.trim() === '' || !Number.isFinite(n) || n < min) {
        throw new BadRequestException(
          `قيمة «${dto.key}» يجب أن تكون رقماً${min > 0 ? ` لا يقل عن ${min}` : ' غير سالب'}`
        )
      }
    }
    // C6: إعدادات السلف أعداد صحيحة بحدود يقرؤها الخادم نفسها
    if (['loan.exceptional_reason_min_length', 'loan.first_installment_max_months_ahead'].includes(dto.key)) {
      const n = Number(dto.value)
      if (!Number.isInteger(n) || n > (dto.key === 'loan.exceptional_reason_min_length' ? 500 : 120)) {
        throw new BadRequestException('إعدادات السلف أعداد صحيحة: طول السبب حتى 500 حرف، وأشهر أول قسط حتى 120')
      }
    }
    if (['loan.request_from_day', 'loan.request_to_day'].includes(dto.key)) {
      const n = Number(dto.value)
      if (!Number.isInteger(n) || n > 31) throw new BadRequestException('أيام طلب السلفة أعداد صحيحة من 1 إلى 31')
    }
    if (['attendance.flex.shortfall_grace_minutes', 'attendance.flex.unpaid_break_minutes',
      'attendance.flex.max_session_minutes'].includes(dto.key)) {
      const n = Number(dto.value)
      if (!Number.isInteger(n) || n > 1440) {
        throw new BadRequestException('دقائق إعدادات الحضور يجب أن تكون عدداً صحيحاً لا يتجاوز 1440')
      }
    }
    if (['overtime.rounding_minutes', 'overtime.request_backdate_days', 'overtime.max_closed_periods'].includes(dto.key) &&
      (!Number.isSafeInteger(Number(dto.value)) || Number(dto.value) > 2147483647)) {
      throw new BadRequestException('أيام وحدود وتقريب الإضافي يجب أن تكون أعدادًا صحيحة صالحة')
    }
    if (dto.key === 'overtime.rounding_minutes' && Number(dto.value) > 1440) throw new BadRequestException('وحدة تقريب الإضافي لا تتجاوز دقائق اليوم')
    if (['overtime.multiplier_weekday', 'overtime.multiplier_weekend', 'overtime.multiplier_holiday'].includes(dto.key)) {
      const n = Number(dto.value)
      if (n > 99.99 || n !== Number(n.toFixed(2))) throw new BadRequestException('مضاعف الإضافي يقبل منزلتين عشريتين وبحد أقصى 99.99')
    }
    const overtimeHourLimits: Record<string, number> = { 'overtime.detection_threshold_hours': 24,
      'overtime.max_hours_per_day': 24, 'overtime.max_hours_per_week': 168, 'overtime.max_hours_per_month': 744 }
    if (overtimeHourLimits[dto.key] != null && (Number(dto.value) > overtimeHourLimits[dto.key] ||
      Math.abs(Number(dto.value) * 60 - Math.round(Number(dto.value) * 60)) > 1e-8)) {
      throw new BadRequestException('ساعات عتبة وسقوف الإضافي يجب أن تمثل دقائق صحيحة ضمن المدة المحددة')
    }
    if (dto.key === 'overtime.wage_components') dto.value = overtimeWageComponents(dto.value).join(',')
    // مفتاح جهاز البصمة: فارغ (يوقف الاستقبال) أو عشوائي قوي — الافتراضي
    // المنشور والقصير يفتحان POST /attendance/punches لأي أحد
    if (dto.key === 'attendance.device_key' && dto.value !== '') {
      const weak = deviceKeyWeakness(dto.value)
      if (weak) {
        throw new BadRequestException(
          `${weak} — استخدم مفتاحاً عشوائياً لا يقل عن ${DEVICE_KEY_MIN_LENGTH} حرفاً`
        )
      }
    }
    // SET-15: العطلة الأسبوعية العامة رموز أيام صحيحة — «Fri Sat» كانت تُحفظ فلا تطابق
    // أي يوم وتصير كل الأيام دواماً بصمت. تُحفظ مطبَّعة (fri, sat ← FRI,SAT)
    if (dto.key === 'attendance.weekend_days') {
      const err = weekendDaysError(dto.value)
      if (err) throw new BadRequestException(err)
      dto.value = normalizeWeekendDays(dto.value)
    }
    // EMP-2: جداول مكافأة نهاية الخدمة «سنوات:معامل» و«سبب:معامل» — التالف كان
    // هيرجع لافتراضي النظام بصمت، فنرفضه برسالة
    const eosErr = eosConfigError(dto.key, dto.value)
    if (eosErr) throw new BadRequestException(eosErr)
    const allowed = SettingsController.ALLOWED_VALUES[dto.key]
    if (allowed && !allowed.includes(dto.value)) {
      throw new BadRequestException(
        `قيمة «${dto.key}» يجب أن تكون واحدة من: ${allowed.join('، ')}`
      )
    }
    if (dto.key === 'attendance.weekend_days') {
      return this.config.manager.transaction(async em => {
        await lockAttendanceRuleMutation(em)
        await assertCalendarScope(user, 'GLOBAL', 0, em, true)
        const current = await em.findOneByOrFail(RequestsConfig, { key: dto.key })
        if (current.value === dto.value && !dto.calendarChange) return current
        const before = await beginCalendarChange(em, 'GLOBAL', 0, dto.calendarChange, user.sub)
        current.value = dto.value
        const saved = await em.save(RequestsConfig, current)
        await finishCalendarChange(em, before, dto.calendarChange, user.sub)
        return saved
      })
    }
    if (dto.calendarChange !== undefined) throw new BadRequestException('بيانات سريان التقويم تخص أيام الراحة العامة فقط')
    if (dto.key.startsWith('attendance.flex.') || dto.key === 'attendance.grace_minutes') {
      return this.config.manager.transaction(async em => {
        await lockAttendanceRuleMutation(em)
        const current = await em.getRepository(RequestsConfig).findOneByOrFail({ key: dto.key })
        if (current.value === dto.value) return current
        await captureLegacyAttendanceRuleBaselines(em, user.sub)
        current.value = dto.value
        return em.getRepository(RequestsConfig).save(current)
      })
    }
    row.value = dto.value
    return this.config.save(row)
  }

  // ===== أنواع الإجازات =====
  // حساب الفرع يرى أنواع الشركة كلها + أنواع فرعه؛ الحساب العام يرى الكل (قرار المالك 16 سبتمبر)
  @Get('leave-types')
  listLeaveTypes(@CurrentUser() user: JwtPayload) {
    return this.leaveTypes.find({ where: definitionBranchWhere<LeaveType>(user), order: { id: 'ASC' } })
  }

  @Post('leave-types')
  async createLeaveType(@Body() dto: CreateLeaveTypeDto, @CurrentUser() user: JwtPayload) {
    const branchId = await definitionBranchForCreate(this.leaveTypes.manager, user, dto.branchId)
    // الشاشة ترسل الفئة دائمًا؛ العملاء القدامى (بلا فئة) تُشتق فئتهم من المدفوعية ومصدر الرصيد كما في ترحيل 042
    if (!dto.category) {
      const balance = dto.balanceType ?? dto.balanceSource ?? 'none'
      dto.category = dto.isPaid === false ? 'UNPAID' : balance === 'sick' ? 'SICK' : balance === 'annual' ? 'ANNUAL' : 'OCCASION'
      if (dto.category === 'SICK' && dto.sickPayTiers === undefined) {
        dto.sickPayTiers = [{ fromDay: 1, toDay: 30, payPercent: 100 }, { fromDay: 31, toDay: 90, payPercent: 75 }, { fromDay: 91, toDay: null, payPercent: 0 }]
      }
    }
    const dup = await this.leaveTypes.findOne({ where: { code: dto.code } })
    if (dup) throw new BadRequestException(`الكود ${dto.code} مستخدم بالفعل`)
    const row = this.leaveTypes.create({ code: dto.code, branchId } as Partial<LeaveType>)
    return this.leaveTypes.save(Object.assign(row, this.leaveTypeInput(dto, row)))
  }

  @Patch('leave-types/:id')
  async updateLeaveType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: JwtPayload
  ) {
    const row = await this.leaveTypes.findOne({ where: { id } })
    if (!row) throw new NotFoundException('نوع الإجازة غير موجود')
    assertDefinitionWritable(user, row)
    assertDefinitionBranchUnchanged(row, dto.branchId)
    Object.assign(row, this.leaveTypeInput(dto, row))
    return this.leaveTypes.save(row)
  }

  // الفئة تحدد المدفوعية ومصدر الرصيد، وقواعد كل تبويب تُفحص على الحالة بعد الحفظ (الموجود + المُرسل)
  private leaveTypeInput(dto: CreateLeaveTypeDto | UpdateLeaveTypeDto, current: LeaveType) {
    if (dto.balanceType !== undefined && dto.balanceSource !== undefined && dto.balanceType !== dto.balanceSource) {
      throw new BadRequestException('balanceType وbalanceSource يشيران إلى قيمتين مختلفتين')
    }
    // الفرع لا يمر من هنا: يتحدد عند الإضافة فقط (definitionBranchForCreate)
    const { balanceSource, sickPayTiers, branchId: _branchId, ...rest } = dto
    const input: Record<string, unknown> = { ...rest }
    if (dto.balanceType !== undefined || balanceSource !== undefined) {
      input.balanceType = dto.balanceType !== undefined ? dto.balanceType : balanceSource
    }
    if (sickPayTiers !== undefined) {
      input.sickPayTiers = sickPayTiers === null ? null : JSON.stringify(this.checkSickPayTiers(sickPayTiers))
    }
    // عميل قديم يغيّر المدفوعية أو مصدر الرصيد بلا فئة: الفئة تتبع القيمة الجديدة (نفس اشتقاق ترحيل 042)
    if (dto.category === undefined && (input.balanceType !== undefined || dto.isPaid !== undefined)) {
      const balance = (input.balanceType ?? current.balanceType ?? 'none') as string
      const paid = dto.isPaid !== undefined ? dto.isPaid : current.isPaid
      input.category = paid === false ? 'UNPAID' : balance === 'sick' ? 'SICK' : balance === 'annual' ? 'ANNUAL' : 'OCCASION'
    }
    const merged = { ...current, ...input } as LeaveType
    const category = merged.category
    if (category === 'ANNUAL') { input.isPaid = true; input.balanceType = merged.balanceType === 'annual' || !merged.balanceType || merged.balanceType === 'none' ? 'annual' : merged.balanceType }
    if (category === 'SICK') { input.isPaid = true; input.balanceType = 'sick' }
    if (category === 'OCCASION') { input.isPaid = true; input.balanceType = 'none' }
    if (category === 'UNPAID') { input.isPaid = false; input.balanceType = 'none' }
    const num = (v: unknown) => v === null || v === undefined || v === '' ? null : Number(v)
    const min = num(merged.minDaysPerRequest), max = num(merged.maxDays)
    if (min !== null && max !== null && max <= min) throw new BadRequestException('أقصى عدد أيام في الطلب لازم يكون أكبر من أقل عدد أيام')
    if (category === 'SICK' && !merged.sickPayTiers && sickPayTiers === undefined) {
      throw new BadRequestException('الإجازة المرضية محتاجة جدول نسبة الأجر')
    }
    if (category === 'OCCASION' && num(merged.fixedDays) !== null && num(merged.fixedDays)! <= 0) {
      throw new BadRequestException('عدد أيام المناسبة لازم يكون أكبر من صفر')
    }
    if (merged.attachmentRule === 'REQUIRED_ABOVE_DAYS' && num(merged.attachmentAboveDays) === null) {
      throw new BadRequestException('حدد عدد الأيام اللي فوقها المرفق يبقى مطلوب')
    }
    if (merged.attachmentRule && merged.attachmentRule !== 'NONE' && !String(merged.requiredAttachment ?? '').trim()) {
      throw new BadRequestException('اكتب اسم المرفق، مثلًا: تقرير طبي')
    }
    if (merged.backdateAllowed === false) input.backdateMaxDays = null
    if (merged.carryOverEnabled === false) input.carryOverMaxDays = null
    // بداية الاستحقاق وأول سنة للسنوية بس
    if (category !== 'ANNUAL') { input.entitlementStartMonths = null; input.firstYearProrated = true }
    return input
  }

  private checkSickPayTiers(rows: Array<{ fromDay: number; toDay: number | null; payPercent: number }>) {
    if (!Array.isArray(rows) || rows.length === 0) throw new BadRequestException('جدول أجر المرضية محتاج صف واحد على الأقل')
    const tiers = rows.map(r => ({ fromDay: Number(r.fromDay), toDay: r.toDay === null || r.toDay === undefined || (r.toDay as unknown) === '' ? null : Number(r.toDay), payPercent: Number(r.payPercent) }))
    tiers.forEach((t, i) => {
      const where = `الصف ${i + 1}`
      if (!Number.isInteger(t.fromDay) || t.fromDay < 1) throw new BadRequestException(`${where}: «من يوم» رقم صحيح من 1`)
      if (t.toDay !== null && (!Number.isInteger(t.toDay) || t.toDay < t.fromDay)) throw new BadRequestException(`${where}: «إلى يوم» لازم يكون بعد «من يوم»`)
      if (!Number.isFinite(t.payPercent) || t.payPercent < 0 || t.payPercent > 100) throw new BadRequestException(`${where}: نسبة الأجر من 0 لـ 100`)
      if (i === 0 && t.fromDay !== 1) throw new BadRequestException('أول صف في جدول أجر المرضية يبدأ من يوم 1')
      if (i > 0) {
        const prev = tiers[i - 1]
        if (prev.toDay === null) throw new BadRequestException(`${where}: الصف اللي قبله مفتوح النهاية، فمفيش صفوف بعده`)
        if (t.fromDay !== prev.toDay + 1) throw new BadRequestException(`${where}: لازم يبدأ من يوم ${prev.toDay + 1} عشان مايبقاش فيه فجوة أو تداخل`)
      }
    })
    return tiers
  }

  // ===== سلاسل الاعتماد (عرض + تعديل SLA/العتبات) =====
  @Perm('approval_chains.manage')
  @Get('approval-chains')
  async listChains(@CurrentUser() user: JwtPayload) {
    const scope = branchScopeOf(user)
    const chains = await this.chains.find({ where: scope === null ? {} : [{ branchId: scope }, { branchId: IsNull() }], order: { id: 'ASC' } })
    const allSteps = await this.steps.find({ order: { stepOrder: 'ASC' } })
    // اسم النوع وفئته من مصدر واحد (مستقل عن فلترة الجمهور) —
    // شاشة السلاسل لا تعتمد على كتالوج الموظف المفلتر
    const types = await this.requestTypes.find()
    const typeByCode = new Map(types.map((t) => [t.code, t]))
    // الدورة الأساسية لنوع = تُحلّ بالـid لكل الفروع — الشاشة تقفل نقلها لفرع
    const primaryIds = new Set(types.map((t) => t.approvalChainId).filter(Boolean))
    // عزل الفروع: سلسلة معمولة لنوع خاص بفرع تاني ماتظهرش لحساب الفرع (ولا اسم النوع)، حتى لو صفها قديم من غير فرع
    const typeHidden = (typeCode: string | null) => {
      const type = typeCode ? typeByCode.get(typeCode) : undefined
      return scope !== null && !!type && !definitionInBranch(type.branchId, scope)
    }
    return chains.filter((c) => !typeHidden(c.requestTypeCode)).map((c) => ({
      ...c,
      isPrimary: primaryIds.has(c.id),
      steps: allSteps.filter((s) => s.chainId === c.id),
      requestTypeName: c.requestTypeCode
        ? typeByCode.get(c.requestTypeCode)?.nameAr ?? null
        : null,
      requestTypeCategory: c.requestTypeCode
        ? typeByCode.get(c.requestTypeCode)?.category ?? null
        : null,
    }))
  }

  @Perm('approval_chains.manage')
  @Patch('approval-steps/:id')
  async updateStep(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: JwtPayload
  ) {
    const step = await this.steps.findOne({ where: { id } })
    if (!step) throw new NotFoundException('الخطوة غير موجودة')
    const merged = { ...step, ...dto }
    const chain = await this.chains.findOneBy({ id: step.chainId })
    this.assertChainScope(user, chain?.branchId ?? null)
    await this.validateChainSteps([merged as ChainStepDto], chain?.branchId ?? null)
    Object.assign(step, dto)
    return this.steps.save(step)
  }

  // ===== بانِي السلاسل: إنشاء سلسلة كاملة بخطواتها =====
  @Perm('approval_chains.manage')
  @Post('approval-chains')
  async createChain(@Body() dto: CreateChainDto, @CurrentUser() user: JwtPayload) {
    this.assertChainScope(user, dto.branchId ?? null)
    if (!Array.isArray(dto.steps)) {
      throw new BadRequestException('الخطوات مطلوبة (مصفوفة، ويمكن أن تكون فارغة للأوتوماتيك)')
    }
    // الكود فريد داخل نفس النطاق (عام أو نفس الفرع) —
    // نفس الكود بفرع مختلف = نسخة فرعية تتقدم على العامة
    const dup = await this.chains.findOne({
      where: { code: dto.code, branchId: dto.branchId ?? IsNull() },
    })
    if (dup) {
      throw new BadRequestException(
        `الكود ${dto.code} مستخدم بالفعل في هذا النطاق`
      )
    }
    await this.validateChainSteps(dto.steps, dto.branchId ?? null)
    if (dto.branchId != null && !await this.chains.manager.findOneBy(Branch, { id: dto.branchId })) {
      throw new BadRequestException('الفرع غير موجود')
    }
    return this.chains.manager.transaction(async (em) => {
      const chain = await em.save(ApprovalChain, em.create(ApprovalChain, {
        code: dto.code, nameAr: dto.nameAr, branchId: dto.branchId,
      }))
      const steps = await this.persistChainSteps(em.getRepository(ApprovalStep), chain.id, dto.steps)
      return { ...chain, steps }
    })
  }

  @Perm('approval_chains.manage')
  @Patch('approval-chains/:id')
  async updateChain(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChainDto,
    @CurrentUser() user: JwtPayload
  ) {
    const chain = await this.chains.findOne({ where: { id } })
    if (!chain) throw new NotFoundException('السلسلة غير موجودة')
    this.assertChainScope(user, chain.branchId ?? null)
    // نقل الدورة لفرع آخر: الكود لازم يفضل فريداً داخل النطاق الجديد
    if (dto.branchId !== undefined && dto.branchId !== chain.branchId) {
      const target = dto.branchId ?? null
      this.assertChainScope(user, target)
      if (target !== null) {
        const branch = await this.chains.manager.findOne(Branch, {
          where: { id: target },
        })
        if (!branch) throw new BadRequestException('الفرع غير موجود')
        // الدورة الأساسية لنوع تُحلّ بالـid لطلبات كل الفروع (resolveChain)
        // فنقلها لفرع شكلي فقط — التخصيص الفعلي = نسخة بنفس الكود للفرع
        const linked = await this.requestTypes.findOne({
          where: { approvalChainId: chain.id },
        })
        if (linked) {
          throw new BadRequestException(
            `هذه الدورة الأساسية لنوع «${linked.nameAr}» وتسري على كل الفروع — ` +
              `لتخصيص فرع أنشئ نسخة بنفس الكود (${chain.code}) لهذا الفرع`
          )
        }
      }
      // IsNull صراحةً: TypeORM يتجاهل null في where فيطابق الكود بأي فرع
      const dup = await this.chains.findOne({
        where: { code: chain.code, branchId: target === null ? IsNull() : target },
      })
      if (dup && dup.id !== chain.id) {
        throw new BadRequestException(
          `الكود ${chain.code} مستخدم بالفعل في هذا النطاق`
        )
      }
      chain.branchId = target as any
    }
    if (dto.nameAr !== undefined) chain.nameAr = dto.nameAr
    if (dto.isActive !== undefined) chain.isActive = dto.isActive
    if (dto.autoApprove !== undefined) chain.autoApprove = dto.autoApprove
    return this.chains.save(chain)
  }

  // استبدال خطوات سلسلة بالكامل — الطلبات الجارية لا تتأثر
  // (خطواتها محلولة ومخزنة على الطلب نفسه وقت التقديم)
  @Perm('approval_chains.manage')
  @Patch('approval-chains/:id/steps')
  async replaceChainSteps(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceStepsDto,
    @CurrentUser() user: JwtPayload
  ) {
    const chain = await this.chains.findOne({ where: { id } })
    if (!chain) throw new NotFoundException('السلسلة غير موجودة')
    this.assertChainScope(user, chain.branchId ?? null)
    await this.validateChainSteps(dto.steps, chain.branchId ?? null)
    return this.steps.manager.transaction(async (em) => {
      const repo = em.getRepository(ApprovalStep)
      await repo.delete({ chainId: id })
      const steps = await this.persistChainSteps(repo, id, dto.steps)
      return { ...chain, steps }
    })
  }

  private assertChainScope(user: JwtPayload, branchId: number | null) {
    const scope = branchScopeOf(user)
    if (scope !== null && branchId !== scope) {
      throw new ForbiddenException('تعديل السلسلة العامة أو فرع آخر متاح لمدير النظام فقط')
    }
  }

  private async validateChainSteps(steps: ChainStepDto[], branchId: number | null) {
    if (!Array.isArray(steps)) throw new BadRequestException('الخطوات مطلوبة')
    for (const step of steps) {
      if (!APPROVER_ROLES.includes(step.approverRole)) throw new BadRequestException('دور الموافقة غير صالح')
      const threshold = [step.thresholdField, step.thresholdOp, step.thresholdValue]
      if (threshold.some(v => v != null) &&
          (!step.thresholdField?.trim() || !['>=', '>', '<', '<='].includes(step.thresholdOp ?? '') ||
           typeof step.thresholdValue !== 'number' || !Number.isFinite(step.thresholdValue))) {
        throw new BadRequestException('الخطوة الشرطية تحتاج: حقل + معامل + قيمة عتبة صالحة')
      }
      if (step.escalateTo === 'specific_employee') {
        throw new BadRequestException('التصعيد إلى موظف محدد يحتاج مساراً يدعم تحديد موظف التصعيد')
      }
      if (step.approverRole === 'specific_employee') {
        if (!step.specificEmployeeId) throw new BadRequestException('خطوة «موظف بعينه» تحتاج تحديد الموظف')
        const emp = await this.chains.manager.findOneBy(Employee, { id: step.specificEmployeeId })
        if (!emp || !emp.isActive || (branchId != null && emp.branchId !== branchId)) {
          throw new BadRequestException('موظف الاعتماد غير موجود أو غير نشط أو خارج فرع السلسلة')
        }
      }
    }
  }

  private async persistChainSteps(repo: Repository<ApprovalStep>, chainId: number, steps: ChainStepDto[]) {
    let order = 0
    const rows = steps.map(step => {
      if (!step.isParallel || order === 0) order++
      return repo.create({ ...step, chainId, stepOrder: order, isParallel: !!step.isParallel,
        approverRole: step.approverRole as ApprovalStep['approverRole'],
        thresholdOp: step.thresholdOp as ApprovalStep['thresholdOp'] })
    })
    return rows.length ? repo.save(rows) : []
  }

  // ===== بانِي الطلبات: عرض + إنشاء من الصفر + تعديل شامل =====
  @Perm('request_types.manage')
  @Get('request-types')
  async listRequestTypes(@CurrentUser() user: JwtPayload) {
    // حساب الفرع يرى أنواع الشركة كلها + أنواع فرعه (قرار المالك 16 سبتمبر)
    const types = await this.requestTypes.find({ where: definitionBranchWhere<RequestType>(user), order: { category: 'ASC', id: 'ASC' } })
    return types.map((t) => this.withDestinationStatus(t))
  }

  // destinationSupported: هل للنوع تنفيذ بعد الاعتماد؟ غير المبني لا يُفعَّل ولا يُقدَّم (REQ-3)
  private withDestinationStatus(t: RequestType) {
    return { ...t, destinationSupported: this.destinations.supports(t),
      // D12: نمط التنفيذ الصريح («تسجيل فقط» / تنفيذ فعلي / غير مبني)
      executionMode: this.destinations.executionModeOf(t), executionLabel: this.destinations.executionLabelOf(t) }
  }

  // الوجهات المتاحة — لقائمة اختيار البانِي
  @Perm('request_types.manage')
  @Get('destination-handlers')
  destinationHandlers() {
    return this.handlerOptions()
  }

  // الوجهات المقبولة = «بدون تنفيذ آلي» + كل handler مسجّل في محرك الوجهات —
  // بالترتيب المسمّى أولاً، وأي مفتاح منفّذ بلا تسمية يظهر بكوده. ووجهات محرك
  // الحضور بـtypeCodes: تُعرض وتُقبل لأنواعها فقط (REQ-3)
  private handlerOptions(): Array<{ key: string; labelAr: string; typeCodes?: string[] }> {
    const supported = new Set(['none', ...this.destinations.handlerKeys()])
    const labeled = AVAILABLE_HANDLERS.filter((h) => supported.has(h.key))
    const extra = [...supported]
      .filter((k) => !AVAILABLE_HANDLERS.some((h) => h.key === k))
      .map((key) => ({ key, labelAr: key }))
    const engine = Object.entries(ENGINE_RECORD_HANDLERS).map(([key, v]) => ({
      key,
      labelAr: v.labelAr,
      typeCodes: v.typeCodes,
    }))
    return [...labeled, ...extra, ...engine]
  }

  private isKnownHandler(key: string, typeCode?: string): boolean {
    if (key === 'none' || this.destinations.handlerKeys().includes(key)) return true
    return !!typeCode && this.destinations.supports({ code: typeCode, destinationHandler: key })
  }

  // الجمهور «مين» + «فين» (قرار المالك 16 سبتمبر). بدون «فين» يتخزن بالشكل القديم نفسه {mode, ids}.
  // نوع خاص بفرع: «فين» لازم يكون جوه الفرع ده (وإلا النوع يختفي عن الكل بصمت).
  private async validateAudience(v: AudienceDto | undefined, typeBranchId: number | null) {
    if (v === undefined) return undefined
    if (!v || typeof v !== 'object' || !v.mode || !AUDIENCE_MODES.includes(v.mode)) {
      throw new BadRequestException('اختار مين يقدر يقدّم الطلب: الكل أو حسب المنصب أو أدوار أو موظفين بعينهم')
    }
    const ids = Array.isArray(v.ids) ? v.ids : []
    if (v.mode !== 'all' && ids.length === 0) {
      throw new BadRequestException('اختار واحد على الأقل في «مين يقدر يقدّم الطلب»')
    }
    const positionKeys: string[] = [...AUDIENCE_POSITION_KEYS, 'hr_manager', 'executive']
    if (v.mode === 'positions' && ids.some((id) => !positionKeys.includes(String(id)))) {
      throw new BadRequestException('منصب غير معروف في «مين يقدر يقدّم الطلب»')
    }
    if ((v.mode === 'employees' || v.mode === 'departments') && ids.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) {
      throw new BadRequestException('اختيار غير صحيح في «مين يقدر يقدّم الطلب»')
    }
    const whereMode = v.where?.mode ?? 'company'
    if (!(AUDIENCE_WHERE_MODES as readonly string[]).includes(whereMode)) {
      throw new BadRequestException('اختار فين: كل الشركة أو فروع محددة أو أقسام محددة أو فرق محددة')
    }
    if (whereMode === 'company') return JSON.stringify({ mode: v.mode, ids })
    const whereIds = [...new Set((Array.isArray(v.where?.ids) ? v.where!.ids : []).map(Number))]
    if (!whereIds.length || whereIds.some((id) => !Number.isInteger(id) || id < 1)) {
      throw new BadRequestException(whereMode === 'branches' ? 'اختار فرع واحد على الأقل' : whereMode === 'teams' ? 'اختار فريق واحد على الأقل' : 'اختار قسم واحد على الأقل')
    }
    const em = this.requestTypes.manager
    if (whereMode === 'teams') {
      // فرع الفريق = فرع قسمه
      const found = await em.getRepository(Team).find({ where: { id: In(whereIds) }, relations: { department: true } })
      if (found.length !== whereIds.length) throw new BadRequestException('فريق من الفرق المختارة غير موجود')
      if (typeBranchId !== null && found.some((t) => t.department?.branchId !== typeBranchId)) {
        throw new BadRequestException('الطلب ده خاص بفرع واحد، فاختار فرق من نفس الفرع')
      }
    } else if (whereMode === 'branches') {
      const found = await em.getRepository(Branch).find({ where: { id: In(whereIds) }, select: { id: true } })
      if (found.length !== whereIds.length) throw new BadRequestException('فرع من الفروع المختارة غير موجود')
      if (typeBranchId !== null && whereIds.some((id) => id !== typeBranchId)) {
        throw new BadRequestException('الطلب ده خاص بفرع واحد، فمينفعش يظهر في فروع تانية')
      }
    } else {
      const found = await em.getRepository(Department).find({ where: { id: In(whereIds) }, select: { id: true, branchId: true } })
      if (found.length !== whereIds.length) throw new BadRequestException('قسم من الأقسام المختارة غير موجود')
      if (typeBranchId !== null && found.some((d) => d.branchId !== typeBranchId)) {
        throw new BadRequestException('الطلب ده خاص بفرع واحد، فاختار أقسام من نفس الفرع')
      }
    }
    return JSON.stringify({ mode: v.mode, ids, where: { mode: whereMode, ids: whereIds } })
  }

  private validateCustomFields(fields?: CustomFieldDto[]) {
    if (fields === undefined) return undefined
    const keys = new Set<string>()
    for (const f of fields) {
      if (keys.has(f.key)) {
        throw new BadRequestException(`مفتاح الحقل مكرر: ${f.key}`)
      }
      keys.add(f.key)
      if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) {
        throw new BadRequestException(`حقل القائمة «${f.label}» يحتاج خيارات`)
      }
    }
    return JSON.stringify(fields)
  }

  // §2.2: نوع طلب جديد من الصفر
  @Perm('request_types.manage')
  @Post('request-types')
  async createRequestType(@Body() dto: CreateRequestTypeDto, @CurrentUser() user: JwtPayload) {
    // الفرع والجمهور يتراجعوا قبل أي حفظ (حتى سلسلة الاعتماد الفاضية)
    const branchId = await definitionBranchForCreate(this.requestTypes.manager, user, dto.branchId)
    const visibleTo = await this.validateAudience(dto.visibleTo, branchId)
    // توليد كود من الاسم إن لم يُحدد
    let code = dto.code
    if (!code) {
      const count = await this.requestTypes.count()
      code = `CUSTOM_${count + 1}`
    }
    const dup = await this.requestTypes.findOne({ where: { code } })
    if (dup) throw new BadRequestException(`الكود ${code} مستخدم بالفعل`)
    const handler = dto.destinationHandler ?? 'none'
    if (!this.isKnownHandler(handler, code)) {
      throw new BadRequestException('الوجهة غير معروفة — اختر من القائمة')
    }
    if (dto.approvalChainId) {
      const chain = await this.chains.findOne({
        where: { id: dto.approvalChainId },
      })
      // سلسلة فرع تاني كأنها مش موجودة لحساب الفرع
      if (!chain || (branchScopeOf(user) !== null && !definitionInBranch(chain.branchId, branchId))) {
        throw new BadRequestException('سلسلة الاعتماد غير موجودة')
      }
      if (!definitionInBranch(chain.branchId, branchId)) {
        throw new BadRequestException('سلسلة الاعتماد دي خاصة بفرع — اختار سلسلة لكل الشركة أو لنفس فرع النوع')
      }
    }
    const customFields = this.validateCustomFields(dto.customFields)
    // الحقول المطلوبة (القديمة) تُشتق من المخصّصة الإجبارية
    const requiredKeys = (dto.customFields ?? [])
      .filter((f) => f.required)
      .map((f) => f.key)

    // كل نوع لازم يكون له سلسلته الخاصة — لو المالك ما ربطش واحدة،
    // نُنشئ سلسلة فاضية مسمّاة باسمه (فاضية = توقف الطلب لحد ما تُضبط)
    let chainId = dto.approvalChainId
    if (!chainId) {
      const chainCode = `CH_${code}`
      // السلسلة بنفس فرع النوع: نوع خاص بفرع = سلسلته خاصة بنفس الفرع (فرعه يعدّلها والفروع التانية ماتشوفهاش).
      // IsNull صراحةً: TypeORM يتجاهل null في where فيطابق الكود بأي فرع
      let chain = await this.chains.findOne({ where: { code: chainCode, branchId: branchId ?? IsNull() } })
      if (!chain) {
        chain = await this.chains.save(
          this.chains.create({
            code: chainCode,
            nameAr: `سلسلة اعتماد ${dto.nameAr}`,
            requestTypeCode: code,
            autoApprove: false,
            branchId: branchId ?? undefined,
          })
        )
      }
      chainId = chain.id
    }

    const created = await this.requestTypes.save(
      this.requestTypes.create({
        code,
        nameAr: dto.nameAr,
        category: dto.category as any,
        customFields,
        requiredFields: requiredKeys.length
          ? JSON.stringify(requiredKeys)
          : undefined,
        requiredAttachments: dto.requiredAttachments,
        destinationHandler: handler,
        approvalChainId: chainId,
        visibleTo,
        branchId,
        phase: 'P1',
      })
    )
    return this.withDestinationStatus(created)
  }

  // تعديل شامل: اسم/تفعيل/سلسلة/حقول/جمهور/وجهة/مرفقات
  @Perm('request_types.manage')
  @Patch('request-types/:id')
  async updateRequestType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestTypeFullDto,
    @CurrentUser() user: JwtPayload
  ) {
    const type = await this.requestTypes.findOne({ where: { id } })
    if (!type) throw new NotFoundException('نوع الطلب غير موجود')
    assertDefinitionWritable(user, type)
    assertDefinitionBranchUnchanged(type, dto.branchId)
    if (dto.approvalChainId !== undefined) {
      // نفس شروط الإضافة: فرع النوع ثابت، فالسلسلة لازم تكون لكل الشركة أو لنفس فرعه.
      // null صراحةً مرفوض: TypeORM يتجاهل null في where فكان هيطابق أي سلسلة
      const chain = dto.approvalChainId == null ? null : await this.chains.findOne({
        where: { id: dto.approvalChainId },
      })
      // سلسلة فرع تاني كأنها مش موجودة لحساب الفرع
      if (!chain || (branchScopeOf(user) !== null && !definitionInBranch(chain.branchId, type.branchId))) {
        throw new BadRequestException('سلسلة الاعتماد غير موجودة')
      }
      if (!definitionInBranch(chain.branchId, type.branchId)) {
        throw new BadRequestException('سلسلة الاعتماد دي خاصة بفرع — اختار سلسلة لكل الشركة أو لنفس فرع النوع')
      }
      type.approvalChainId = chain.id
    }
    // الوجهة الحالية مقبولة كما هي (أنواع مبذورة بوجهات قديمة/لم تُبنَ بعد) —
    // والتغيير لازم يكون لوجهة منفّذة فعلاً في محرك الوجهات
    if (
      dto.destinationHandler !== undefined &&
      dto.destinationHandler !== type.destinationHandler
    ) {
      if (!this.isKnownHandler(dto.destinationHandler, type.code)) {
        throw new BadRequestException('الوجهة غير معروفة — اختر من القائمة')
      }
      type.destinationHandler = dto.destinationHandler
    }
    if (dto.customFields !== undefined) {
      const customFields = this.validateCustomFields(dto.customFields) as string
      // المفاتيح القديمة (أسماء فقط — الأنواع المبذورة) ليست حقولاً مخصّصة فتبقى
      // مطلوبة ما لم يُعرَّف حقل مخصّص بنفس المفتاح؛ وإلا تعديل اسم نوع مبذور من
      // البانِي يمسحها فتختفي حقول التاريخ/الأيام من نموذج التقديم وتُرفض من الحمولة
      const jsonArray = (raw?: string | null): any[] => {
        try {
          const v = JSON.parse(raw || '[]')
          return Array.isArray(v) ? v : []
        } catch {
          return []
        }
      }
      const customKeys = new Set([
        ...jsonArray(type.customFields).map((f) => String(f?.key)),
        ...dto.customFields.map((f) => f.key),
      ])
      const legacyKeys = jsonArray(type.requiredFields)
        .map(String)
        .filter((k) => !customKeys.has(k))
      type.customFields = customFields
      const requiredKeys = [
        ...legacyKeys,
        ...dto.customFields.filter((f) => f.required).map((f) => f.key),
      ]
      type.requiredFields = requiredKeys.length
        ? JSON.stringify(requiredKeys)
        : (null as any)
    }
    if (dto.visibleTo !== undefined) {
      type.visibleTo = (await this.validateAudience(dto.visibleTo, type.branchId ?? null)) as string
    }
    if (dto.nameAr !== undefined) type.nameAr = dto.nameAr
    if (dto.requiredAttachments !== undefined) {
      type.requiredAttachments = dto.requiredAttachments
    }
    if (dto.isActive !== undefined) type.isActive = dto.isActive
    // مايتفعّلش نوع وجهته لسه متبنّتش (REQ-3): كان يُعتمد ويُقفل «مكتمل» بلا أثر.
    // التعطيل وتعديل الباقي مسموحين، والتفعيل بعد اختيار وجهة منفّذة أو «سجل فقط»
    if (dto.isActive === true && !this.destinations.supports(type)) {
      throw new BadRequestException(
        `لا يُفعَّل «${type.nameAr}» — وجهته («${type.destinationHandler}») لم تُبنَ بعد. ` +
          `اختر وجهة منفّذة أو «سجل فقط — بلا تنفيذ آلي» من «تعديل» ثم فعّله`
      )
    }
    return this.withDestinationStatus(await this.requestTypes.save(type))
  }
}
