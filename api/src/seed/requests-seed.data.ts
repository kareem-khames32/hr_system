// بذرة محرك الطلبات — مرآة src/data/requestsCatalog.ts في الفرونت
// (القاعدة الذهبية: كل نوع له وجهة = سجل دائم)

import type { ApproverRole } from '../requests/entities/approval-step.entity'

// ===== سلاسل الاعتماد الافتراضية (العامة — branchId NULL) =====
// أي فرع يقدر يعمل نسخة خاصة بنفس الكود لاحقاً وتتقدم على العامة

export interface StepSeed {
  role: ApproverRole
  thresholdField?: string
  thresholdOp?: '>=' | '>' | '<' | '<='
  thresholdValue?: number
  slaDays?: number
  escalateTo?: string
}

export interface ChainSeed {
  code: string
  nameAr: string
  steps: StepSeed[]
}

const M: StepSeed = {
  role: 'direct_manager_of_requester',
  slaDays: 3,
  escalateTo: 'hr',
}
const HR: StepSeed = { role: 'hr', slaDays: 3, escalateTo: 'executive' }
const FIN: StepSeed = { role: 'finance', slaDays: 3, escalateTo: 'executive' }
const EXEC: StepSeed = { role: 'executive', slaDays: 5 }

export const chainsSeed: ChainSeed[] = [
  { code: 'CHAIN_MANAGER', nameAr: 'المدير المباشر', steps: [M] },
  { code: 'CHAIN_MANAGER_HR', nameAr: 'مدير → HR', steps: [M, HR] },
  { code: 'CHAIN_HR', nameAr: 'HR', steps: [HR] },
  { code: 'CHAIN_FINANCE', nameAr: 'المالية', steps: [FIN] },
  { code: 'CHAIN_HR_FINANCE', nameAr: 'HR → مالية', steps: [HR, FIN] },
  {
    code: 'CHAIN_MANAGER_FINANCE',
    nameAr: 'مدير → مالية',
    steps: [M, FIN],
  },
  {
    // السلفة: خطوة المالية تتفعل فقط عند تجاوز العتبة (config: 5000)
    code: 'CHAIN_MANAGER_FINANCE_T',
    nameAr: 'مدير → مالية (فوق العتبة)',
    steps: [
      M,
      {
        ...FIN,
        thresholdField: 'amount',
        thresholdOp: '>=',
        thresholdValue: 5000,
      },
    ],
  },
  {
    // زيادة الراتب: التنفيذي يدخل فقط لو الزيادة ≥ 10%
    code: 'CHAIN_MANAGER_HR_EXEC_PCT',
    nameAr: 'مدير → HR → تنفيذي (زيادة ≥ 10%)',
    steps: [
      M,
      HR,
      {
        ...EXEC,
        thresholdField: 'increase_pct',
        thresholdOp: '>=',
        thresholdValue: 10,
      },
    ],
  },
  {
    code: 'CHAIN_MANAGER_HR_EXEC',
    nameAr: 'مدير → HR → تنفيذي',
    steps: [M, HR, EXEC],
  },
  { code: 'CHAIN_HR_EXEC', nameAr: 'HR → تنفيذي', steps: [HR, EXEC] },
  {
    // النقل: المدير الحالي → مدير الفريق المستقبِل → HR
    code: 'CHAIN_TRANSFER',
    nameAr: 'المدير الحالي → المستقبِل → HR',
    steps: [
      M,
      { role: 'receiving_team_manager', slaDays: 3, escalateTo: 'hr' },
      HR,
    ],
  },
  {
    // المسار الأمني: تغيير الحساب البنكي
    code: 'CHAIN_SECURITY_BANK',
    nameAr: 'موافقة أمنية (HR + مالية)',
    steps: [
      { ...HR, slaDays: 2 },
      { ...FIN, slaDays: 2 },
    ],
  },
  { code: 'CHAIN_AUTO', nameAr: 'أوتوماتيك — بلا موافقات', steps: [] },
  {
    code: 'CHAIN_MANAGER_CUSTODY',
    nameAr: 'مدير → أمين العهدة',
    steps: [M, { role: 'custody_officer', slaDays: 3, escalateTo: 'hr' }],
  },
  {
    code: 'CHAIN_CUSTODY',
    nameAr: 'أمين العهدة',
    steps: [{ role: 'custody_officer', slaDays: 3, escalateTo: 'hr' }],
  },
  {
    code: 'CHAIN_MANAGER_IT',
    nameAr: 'مدير → IT',
    steps: [M, { role: 'it', slaDays: 3, escalateTo: 'hr' }],
  },
]

// ===== أنواع الطلبات (55) — chain بالكود، والحقول المطلوبة للتقديم =====

export interface TypeSeed {
  code: string
  nameAr: string
  category: string
  chain: string | null
  handler: string
  requiredFields?: string[]
  affectsBalance?: boolean
  securityRoute?: boolean
  confidential?: boolean
  autoGeneratesPdf?: boolean
  phase?: 'P1' | 'P2' | 'P3'
}

const LEAVE_FIELDS = ['fromDate', 'toDate', 'days']

export const typesSeed: TypeSeed[] = [
  // ===== 1) الإجازات =====
  { code: 'LEAVE_ANNUAL', nameAr: 'إجازة سنوية', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_balance', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_SICK', nameAr: 'إجازة مرضية', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_balance', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_CASUAL', nameAr: 'إجازة عارضة/طارئة', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_calendar', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_UNPAID', nameAr: 'إجازة بدون راتب', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P1' },
  { code: 'LEAVE_MATERNITY', nameAr: 'إجازة وضع', category: 'leaves', chain: 'CHAIN_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_PATERNITY', nameAr: 'إجازة أبوة', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_HAJJ', nameAr: 'إجازة حج', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_once', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_MARRIAGE', nameAr: 'إجازة زواج', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_BEREAVEMENT', nameAr: 'إجازة وفاة/عدة', category: 'leaves', chain: 'CHAIN_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_EXAM', nameAr: 'إجازة امتحانات', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P3' },
  { code: 'LEAVE_COMPENSATORY', nameAr: 'إجازة تعويضية/بدل', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_calendar_payroll', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_MODIFY_CANCEL', nameAr: 'إلغاء/تعديل إجازة', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_balance_restore', requiredFields: ['leaveId'], affectsBalance: true, phase: 'P1' },

  // ===== 2) الحضور والوقت =====
  { code: 'PERMISSION', nameAr: 'استئذان', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_log', requiredFields: ['date', 'from', 'to'], phase: 'P1' },
  { code: 'OVERTIME', nameAr: 'عمل إضافي', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'overtime_entries', requiredFields: ['date', 'hours'], phase: 'P1' },
  { code: 'PUNCH_CORRECTION', nameAr: 'تصحيح بصمة', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_corrections', requiredFields: ['date', 'reason'], phase: 'P1' },
  { code: 'SHIFT_SWAP', nameAr: 'تبديل وردية', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'shift_schedule', requiredFields: ['date', 'withEmployeeId'], phase: 'P3' },
  { code: 'REMOTE_WORK', nameAr: 'عمل عن بُعد', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_log', requiredFields: ['fromDate', 'toDate'], phase: 'P2' },
  { code: 'BUSINESS_TRIP', nameAr: 'مأمورية/انتداب', category: 'time_attendance', chain: 'CHAIN_MANAGER_HR', handler: 'attendance_trips', requiredFields: ['fromDate', 'toDate', 'destination'], phase: 'P2' },

  // ===== 3) المالية =====
  { code: 'LOAN', nameAr: 'سلفة', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE_T', handler: 'loans_installments', requiredFields: ['amount', 'months'], phase: 'P1' },
  { code: 'SALARY_INCREASE', nameAr: 'زيادة راتب', category: 'financial', chain: 'CHAIN_MANAGER_HR_EXEC_PCT', handler: 'salary_update_history', requiredFields: ['newSalary', 'increase_pct'], phase: 'P2' },
  { code: 'EXPENSE_CLAIM', nameAr: 'صرف مصروفات', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE', handler: 'expense_register', requiredFields: ['amount', 'description'], phase: 'P2' },
  { code: 'BONUS', nameAr: 'مكافأة/حافز', category: 'financial', chain: 'CHAIN_MANAGER_HR', handler: 'payroll_bonus', requiredFields: ['amount', 'reason'], phase: 'P2' },
  { code: 'PER_DIEM', nameAr: 'بدل سفر/انتداب', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE', handler: 'payroll_allowance', requiredFields: ['amount'], phase: 'P3' },
  { code: 'EARLY_LOAN_SETTLEMENT', nameAr: 'سداد سلفة مبكر', category: 'financial', chain: 'CHAIN_FINANCE', handler: 'loans_installments', requiredFields: ['loanId'], phase: 'P3' },
  { code: 'DEDUCTION_OBJECTION', nameAr: 'اعتراض على خصم', category: 'financial', chain: 'CHAIN_HR_FINANCE', handler: 'payroll_adjustment', requiredFields: ['reason'], phase: 'P2' },

  // ===== 4) الحالة الوظيفية =====
  { code: 'PROMOTION', nameAr: 'ترقية', category: 'employment_status', chain: 'CHAIN_MANAGER_HR_EXEC', handler: 'employee_update_promotions', requiredFields: ['toTitle'], phase: 'P2' },
  { code: 'TEAM_TRANSFER', nameAr: 'نقل بين الفرق', category: 'employment_status', chain: 'CHAIN_TRANSFER', handler: 'transfers_effective_date', requiredFields: ['toTeamId', 'effectiveDate'], phase: 'P2' },
  { code: 'TITLE_CHANGE', nameAr: 'تغيير مسمى', category: 'employment_status', chain: 'CHAIN_MANAGER_HR', handler: 'employee_update', requiredFields: ['toTitle'], phase: 'P3' },
  { code: 'CONTRACT_RENEWAL', nameAr: 'تجديد عقد', category: 'employment_status', chain: 'CHAIN_HR_EXEC', handler: 'contracts_register', phase: 'P2' },
  { code: 'CONTRACT_TYPE_CHANGE', nameAr: 'تغيير نوع العقد', category: 'employment_status', chain: 'CHAIN_MANAGER_HR', handler: 'contracts_register', phase: 'P3' },
  { code: 'SECONDMENT', nameAr: 'إعارة/انتداب لجهة أخرى', category: 'employment_status', chain: 'CHAIN_HR_EXEC', handler: 'assignments_register', phase: 'P3' },
  { code: 'RETIREMENT', nameAr: 'تقاعد', category: 'employment_status', chain: 'CHAIN_HR', handler: 'employee_status', phase: 'P3' },

  // ===== 5) البيانات الشخصية =====
  { code: 'PERSONAL_DATA_UPDATE', nameAr: 'تحديث بيانات شخصية', category: 'personal_data', chain: 'CHAIN_HR', handler: 'employee_record', phase: 'P1' },
  { code: 'BANK_ACCOUNT_CHANGE', nameAr: 'تغيير الحساب البنكي', category: 'personal_data', chain: 'CHAIN_SECURITY_BANK', handler: 'payroll_bank_secure', requiredFields: ['iban'], securityRoute: true, phase: 'P1' },
  { code: 'DEPENDENTS_UPDATE', nameAr: 'تحديث المعالين', category: 'personal_data', chain: 'CHAIN_HR', handler: 'employee_dependents', phase: 'P2' },
  { code: 'EMERGENCY_CONTACT', nameAr: 'جهة اتصال الطوارئ', category: 'personal_data', chain: 'CHAIN_AUTO', handler: 'employee_record_auto', requiredFields: ['name', 'phone'], phase: 'P1' },
  { code: 'DOCUMENT_RENEWAL', nameAr: 'رفع/تجديد وثائق', category: 'personal_data', chain: 'CHAIN_HR', handler: 'document_vault', requiredFields: ['documentType'], phase: 'P1' },

  // ===== 6) الخطابات (PDF أوتوماتيك) =====
  { code: 'LETTER_SALARY', nameAr: 'تعريف راتب', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_EMPLOYMENT', nameAr: 'خطاب توظيف', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_EXPERIENCE', nameAr: 'شهادة خبرة', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_NOC', nameAr: 'خطاب عدم ممانعة (NOC)', category: 'letters', chain: 'CHAIN_MANAGER_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },
  { code: 'LETTER_EMBASSY', nameAr: 'خطاب سفارة/تأشيرة', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },
  { code: 'LETTER_BANK_LOAN', nameAr: 'خطاب قرض بنكي', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },

  // ===== 7) العهدة والأصول =====
  { code: 'CUSTODY_REQUEST', nameAr: 'طلب عهدة', category: 'custody_assets', chain: 'CHAIN_MANAGER_CUSTODY', handler: 'custody_assignments_ack', phase: 'P1' },
  { code: 'CUSTODY_RETURN', nameAr: 'إرجاع عهدة', category: 'custody_assets', chain: 'CHAIN_CUSTODY', handler: 'custody_assignments', requiredFields: ['assignmentId'], phase: 'P1' },
  { code: 'CUSTODY_TRANSFER', nameAr: 'نقل عهدة', category: 'custody_assets', chain: 'CHAIN_CUSTODY', handler: 'custody_assignments', requiredFields: ['assignmentId', 'toEmployeeId'], phase: 'P2' },
  { code: 'CUSTODY_LOSS_REPORT', nameAr: 'بلاغ فقد/تلف', category: 'custody_assets', chain: 'CHAIN_MANAGER_CUSTODY', handler: 'custody_finance', requiredFields: ['assignmentId', 'description'], phase: 'P2' },
  { code: 'IT_EQUIPMENT', nameAr: 'طلب أجهزة/برامج IT', category: 'custody_assets', chain: 'CHAIN_MANAGER_IT', handler: 'it_assets', phase: 'P2' },
  { code: 'ACCESS_REQUEST', nameAr: 'طلب صلاحية/وصول', category: 'custody_assets', chain: 'CHAIN_MANAGER_IT', handler: 'access_register', phase: 'P2' },
  { code: 'FACILITY_CARD', nameAr: 'كارت دخول/موقف', category: 'custody_assets', chain: 'CHAIN_HR', handler: 'facilities_register', phase: 'P3' },

  // ===== 8) التدريب والتطوير =====
  { code: 'TRAINING_REQUEST', nameAr: 'طلب تدريب/دورة', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'training_register', requiredFields: ['courseName'], phase: 'P3' },
  { code: 'CERT_REIMBURSEMENT', nameAr: 'استرداد تكلفة شهادة', category: 'training', chain: 'CHAIN_MANAGER_FINANCE', handler: 'training_expense', requiredFields: ['amount'], phase: 'P3' },
  { code: 'CONFERENCE', nameAr: 'حضور مؤتمر', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'training_register', phase: 'P3' },
  { code: 'EDUCATION_ASSISTANCE', nameAr: 'مساعدة دراسية', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'training_register', phase: 'P3' },

  // ===== 9) علاقات الموظفين (سرّي — يتخطى المدير) =====
  { code: 'GRIEVANCE', nameAr: 'تظلم/شكوى', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'er_case', requiredFields: ['description'], confidential: true, phase: 'P2' },
  { code: 'WHISTLEBLOWING', nameAr: 'بلاغ عن مخالفة', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'er_case_anonymous', requiredFields: ['description'], confidential: true, phase: 'P2' },
  { code: 'PENALTY_OBJECTION', nameAr: 'اعتراض على جزاء', category: 'employee_relations', chain: 'CHAIN_HR_EXEC', handler: 'er_case', requiredFields: ['reason'], confidential: true, phase: 'P2' },
  { code: 'APPRAISAL_OBJECTION', nameAr: 'اعتراض على تقييم أداء', category: 'employee_relations', chain: 'CHAIN_MANAGER_HR', handler: 'appraisal_register', requiredFields: ['reason'], phase: 'P2' },
  { code: 'SUGGESTION', nameAr: 'اقتراح/ملاحظة', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'suggestions_register', requiredFields: ['description'], phase: 'P3' },
  { code: 'HR_MEETING', nameAr: 'طلب اجتماع مع HR', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'meetings_register', phase: 'P3' },
]

// ===== أنواع الإجازات (قابلة للإعداد) =====
export const leaveTypesSeed = [
  { code: 'ANNUAL', nameAr: 'سنوية', isPaid: true, balanceSource: 'annual', maxDays: 21 },
  { code: 'SICK', nameAr: 'مرضية', isPaid: true, balanceSource: 'sick', requiredAttachment: 'تقرير طبي', maxDays: 180 },
  { code: 'CASUAL', nameAr: 'عارضة', isPaid: true, balanceSource: 'annual', maxDays: 7 },
  { code: 'UNPAID', nameAr: 'بدون راتب', isPaid: false, balanceSource: 'none' },
  { code: 'MATERNITY', nameAr: 'وضع', isPaid: true, balanceSource: 'none', requiredAttachment: 'تقرير طبي', maxDays: 90 },
  { code: 'PATERNITY', nameAr: 'أبوة', isPaid: true, balanceSource: 'none', maxDays: 3 },
  { code: 'HAJJ', nameAr: 'حج', isPaid: true, balanceSource: 'none', maxDays: 21, oncePerService: true },
  { code: 'MARRIAGE', nameAr: 'زواج', isPaid: true, balanceSource: 'none', requiredAttachment: 'عقد الزواج', maxDays: 5 },
  { code: 'BEREAVEMENT', nameAr: 'وفاة/عدة', isPaid: true, balanceSource: 'none', maxDays: 5 },
  { code: 'EXAM', nameAr: 'امتحانات', isPaid: true, balanceSource: 'none', requiredAttachment: 'إثبات قيد' },
  { code: 'COMPENSATORY', nameAr: 'تعويضية/بدل', isPaid: true, balanceSource: 'none' },
]

// ===== إعدادات المحرك (DDL §9) + الحضور =====
export const configSeed: Array<{ key: string; value: string }> = [
  { key: 'overtime.biometric_requires_confirmation', value: 'true' },
  { key: 'overtime.detection_threshold_hours', value: '0.5' },
  { key: 'loan.finance_approval_threshold', value: '5000' },
  { key: 'salary_increase.executive_threshold_pct', value: '10' },
  { key: 'transfer.execution_mode', value: 'effective_date' },
  { key: 'attendance.grace_minutes', value: '10' },
  // مفتاح استقبال بصمات ZKTeco — غيّره في الإنتاج
  { key: 'attendance.device_key', value: 'zk-device-key-change-me' },
  // الإجازات: الترحيل السنوي بالطبقات
  { key: 'leave.annual_entitled', value: '21' },
  { key: 'leave.carryover_max_days', value: '10' },
  { key: 'leave.carryover_expiry_months', value: '3' },
  // الرواتب: دورة 23 → 22 ومعاملات الحساب
  { key: 'payroll.cycle_start_day', value: '23' },
  { key: 'payroll.monthly_days', value: '30' },
  { key: 'payroll.daily_hours', value: '8' },
  { key: 'payroll.late_deduction_enabled', value: 'true' },
]
