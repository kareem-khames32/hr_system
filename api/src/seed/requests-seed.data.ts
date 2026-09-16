// بذرة محرك الطلبات — مرآة src/data/requestsCatalog.ts في الفرونت
// (القاعدة الذهبية: كل نوع له وجهة = سجل دائم)

import type { ApproverRole } from '../requests/entities/approval-step.entity'
import { PAYROLL_POLICY_DEFAULT_CONFIG_SEED } from '../payroll/payroll-policy-settings'
import { PAYROLL_DECISION_CONFIG_SEED } from '../payroll/payroll-decision-settings'
import { DEDUCTION_CONFIG_SEED } from '../payroll/typed-deductions'
import { BONUS_CONFIG_SEED } from '../payroll/bonuses'
import { EXEMPTION_CONFIG_SEED } from '../payroll/financial-exemptions'
import { COMPANY_PROFILE_NEW_KEYS } from '../settings/company-profile'

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
  { code: 'CHAIN_OVERTIME_MANAGER_DEPT_HR', nameAr: 'الإضافي: المدير → رئيس القسم → الموارد البشرية',
    steps: [M, { role: 'department_manager_of_requester', slaDays: 3, escalateTo: 'hr' }, HR] },
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

// جمهور «خصم» و«مكافأة» الافتراضي حسب المنصب (قرار المالك 16 سبتمبر): مديرو الأقسام وقادة الفرق ومديرو الفروع
// والموارد البشرية والإدارة العليا؛ كل واحد يقدّم لمن تحته فقط. المالك يغيّره من «أنواع الطلبات».
export const MONEY_REQUEST_AUDIENCE = '{"mode":"positions","ids":["DEPARTMENT_MANAGERS","TEAM_LEADERS","BRANCH_MANAGERS","hr_manager","executive"]}'

export interface TypeSeed {
  code: string
  nameAr: string
  category: string
  chain: string | null
  handler: string
  // JSON جمهور النوع (ب4) — من يقدر يقدّمه؛ الفارغ = متاح للجميع
  visibleTo?: string
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
  // نوع موحّد: «طلب إجازة» بقائمة نوع الإجازة — سلسلة واحدة لكل الإجازات.
  // الأثر (خصم رصيد/مدفوعة) يُقرأ من كتالوج أنواع الإجازات (balanceSource/isPaid)
  { code: 'LEAVE', nameAr: 'طلب إجازة', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_deduct_balance', requiredFields: ['leaveType', 'fromDate', 'toDate', 'days'], affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_ANNUAL', nameAr: 'إجازة سنوية', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_deduct_balance', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_SICK', nameAr: 'إجازة مرضية', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_deduct_balance', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_CASUAL', nameAr: 'إجازة عارضة/طارئة', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_deduct_balance', requiredFields: LEAVE_FIELDS, affectsBalance: true, phase: 'P1' },
  { code: 'LEAVE_UNPAID', nameAr: 'إجازة بدون راتب', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P1' },
  { code: 'LEAVE_MATERNITY', nameAr: 'إجازة وضع', category: 'leaves', chain: 'CHAIN_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_PATERNITY', nameAr: 'إجازة أبوة', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_HAJJ', nameAr: 'إجازة حج', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_MARRIAGE', nameAr: 'إجازة زواج', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_BEREAVEMENT', nameAr: 'إجازة وفاة/عدة', category: 'leaves', chain: 'CHAIN_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  { code: 'LEAVE_EXAM', nameAr: 'إجازة امتحانات', category: 'leaves', chain: 'CHAIN_MANAGER_HR', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P3' },
  { code: 'LEAVE_COMPENSATORY', nameAr: 'إجازة تعويضية/بدل', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_no_balance', requiredFields: LEAVE_FIELDS, phase: 'P2' },
  // الاسم «إلغاء» بس: تعديل الإجازة مش متنفذ — للتعديل: إلغاء وتقديم جديد (LEV-7)
  { code: 'LEAVE_MODIFY_CANCEL', nameAr: 'إلغاء إجازة', category: 'leaves', chain: 'CHAIN_MANAGER', handler: 'leave_balance_restore', requiredFields: ['leaveId'], affectsBalance: true, phase: 'P1' },

  // ===== 2) الحضور والوقت =====
  { code: 'PERMISSION', nameAr: 'استئذان', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_log', requiredFields: ['date', 'from', 'to'], phase: 'P1' },
  { code: 'OVERTIME', nameAr: 'عمل إضافي', category: 'time_attendance', chain: 'CHAIN_OVERTIME_MANAGER_DEPT_HR', handler: 'overtime_entries', requiredFields: ['date'], phase: 'P1' },
  { code: 'OVERTIME_AUTO', nameAr: 'عمل إضافي مكتشف (بصمة)', category: 'time_attendance', chain: 'CHAIN_OVERTIME_MANAGER_DEPT_HR', handler: 'overtime_auto', requiredFields: [], phase: 'P2' },
  { code: 'PUNCH_CORRECTION', nameAr: 'تصحيح/طلب بصمة', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_corrections', requiredFields: ['date', 'punchType', 'time', 'reason'], phase: 'P1' },
  { code: 'SHIFT_SWAP', nameAr: 'تبديل وردية', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'shift_schedule', requiredFields: ['date', 'withEmployeeId'], phase: 'P3' },
  { code: 'REMOTE_WORK', nameAr: 'عمل عن بُعد', category: 'time_attendance', chain: 'CHAIN_MANAGER', handler: 'attendance_log', requiredFields: ['fromDate', 'toDate'], phase: 'P2' },
  { code: 'BUSINESS_TRIP', nameAr: 'مأمورية/انتداب', category: 'time_attendance', chain: 'CHAIN_MANAGER_HR', handler: 'attendance_trips', requiredFields: ['fromDate', 'toDate', 'destination'], phase: 'P2' },

  // ===== 3) المالية =====
  { code: 'LOAN', nameAr: 'سلفة', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE_T', handler: 'loans_installments', requiredFields: ['amount', 'months'], phase: 'P1' },
  { code: 'LOAN_INSTALLMENT_DEFER', nameAr: 'تأجيل قسط سلفة', category: 'financial', chain: 'CH_LOAN', handler: 'loan_installment_defer', requiredFields: ['loanId', 'installmentId', 'toPeriod', 'reason'], phase: 'P1' },
  { code: 'SALARY_INCREASE', nameAr: 'زيادة راتب', category: 'financial', chain: 'CHAIN_MANAGER_HR_EXEC_PCT', handler: 'salary_update_history', requiredFields: ['newSalary', 'increase_pct'], phase: 'P2' },
  { code: 'EXPENSE_CLAIM', nameAr: 'صرف مصروفات', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE', handler: 'expense_register', requiredFields: ['amount', 'description'], phase: 'P2' },
  { code: 'BONUS', nameAr: 'مكافأة/حافز', category: 'financial', chain: 'CHAIN_MANAGER_HR', handler: 'payroll_bonus', requiredFields: ['amount', 'reason'], phase: 'P2' },
  { code: 'PER_DIEM', nameAr: 'بدل سفر/انتداب', category: 'financial', chain: 'CHAIN_MANAGER_FINANCE', handler: 'payroll_allowance', requiredFields: ['amount'], phase: 'P3' },
  { code: 'EARLY_LOAN_SETTLEMENT', nameAr: 'سداد سلفة مبكر', category: 'financial', chain: 'CHAIN_FINANCE', handler: 'loans_installments', requiredFields: ['loanId'], phase: 'P3' },
  { code: 'DEDUCTION_OBJECTION', nameAr: 'اعتراض على خصم', category: 'financial', chain: 'CHAIN_HR_FINANCE', handler: 'payroll_adjustment', requiredFields: ['reason'], phase: 'P2' },
  // ب3/ب4 (قرار المالك 16 سبتمبر): «خصم» و«مكافأة» كارتان في المجموعة المالية — بابا دخول لا أكثر:
  // اختيار الكارت يفتح مساحة الخصومات أو المكافآت جاهزة، والإنشاء يبقى فيهما بدفترهما وسلسلتهما
  // (المحرك العام يرفضهما برسالة تدل على الشاشة)، فلا دورة اعتماد خاصة بهما هنا: chain = null.
  // الجمهور يطابق ترحيل 20260916_039 حتى تتطابق القاعدة المبذورة الجديدة مع القاعدة الحية.
  { code: 'PAYROLL_DEDUCTION', nameAr: 'خصم', category: 'financial', chain: null, handler: 'none', phase: 'P1', visibleTo: MONEY_REQUEST_AUDIENCE },
  { code: 'PAYROLL_BONUS', nameAr: 'مكافأة', category: 'financial', chain: null, handler: 'none', phase: 'P1', visibleTo: MONEY_REQUEST_AUDIENCE },

  // ===== 4) الحالة الوظيفية =====
  { code: 'PROMOTION', nameAr: 'ترقية', category: 'employment_status', chain: 'CHAIN_MANAGER_HR_EXEC', handler: 'employee_update_promotions', requiredFields: ['toTitle'], phase: 'P2' },
  { code: 'TEAM_TRANSFER', nameAr: 'نقل بين الفرق', category: 'employment_status', chain: 'CHAIN_TRANSFER', handler: 'transfers_effective_date', requiredFields: ['toTeamId', 'effectiveDate'], phase: 'P2' },
  { code: 'TITLE_CHANGE', nameAr: 'تغيير مسمى', category: 'employment_status', chain: 'CHAIN_MANAGER_HR', handler: 'employee_update', requiredFields: ['toTitle'], phase: 'P3' },
  { code: 'CONTRACT_RENEWAL', nameAr: 'تجديد عقد', category: 'employment_status', chain: 'CHAIN_HR_EXEC', handler: 'contracts_register', phase: 'P2' },
  { code: 'CONTRACT_TYPE_CHANGE', nameAr: 'تغيير نوع العقد', category: 'employment_status', chain: 'CHAIN_MANAGER_HR', handler: 'contracts_register', phase: 'P3' },
  // D12: الأنواع بلا معالج حقيقي «تسجيل فقط» (none) — القرار والوجهة القديمة في RECORD_ONLY_REQUEST_TYPES
  { code: 'SECONDMENT', nameAr: 'إعارة/انتداب لجهة أخرى', category: 'employment_status', chain: 'CHAIN_HR_EXEC', handler: 'none', phase: 'P3' },
  { code: 'RETIREMENT', nameAr: 'تقاعد', category: 'employment_status', chain: 'CHAIN_HR', handler: 'employee_status', phase: 'P3' },
  // الاستقالة: مدير → HR → تنفيذي، والاعتماد يدخل الموظف فترة الإشعار
  { code: 'RESIGNATION', nameAr: 'استقالة', category: 'employment_status', chain: 'CHAIN_MANAGER_HR_EXEC', handler: 'employee_status', requiredFields: ['lastWorkingDate', 'reason'], phase: 'P1' },

  // ===== 5) البيانات الشخصية =====
  { code: 'PERSONAL_DATA_UPDATE', nameAr: 'تحديث بيانات شخصية', category: 'personal_data', chain: 'CHAIN_HR', handler: 'employee_record', phase: 'P1' },
  { code: 'BANK_ACCOUNT_CHANGE', nameAr: 'تغيير الحساب البنكي', category: 'personal_data', chain: 'CHAIN_SECURITY_BANK', handler: 'payroll_bank_secure', requiredFields: ['iban'], securityRoute: true, phase: 'P1' },
  { code: 'DEPENDENTS_UPDATE', nameAr: 'تحديث المعالين', category: 'personal_data', chain: 'CHAIN_HR', handler: 'none', phase: 'P2' },
  { code: 'EMERGENCY_CONTACT', nameAr: 'جهة اتصال الطوارئ', category: 'personal_data', chain: 'CHAIN_AUTO', handler: 'employee_record_auto', requiredFields: ['name', 'phone'], phase: 'P1' },
  { code: 'DOCUMENT_RENEWAL', nameAr: 'رفع/تجديد وثائق', category: 'personal_data', chain: 'CHAIN_HR', handler: 'none', requiredFields: ['documentType'], phase: 'P1' },

  // ===== 6) الخطابات (PDF أوتوماتيك) =====
  { code: 'LETTER_SALARY', nameAr: 'تعريف راتب', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_EMPLOYMENT', nameAr: 'خطاب توظيف', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_EXPERIENCE', nameAr: 'شهادة خبرة', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P1' },
  { code: 'LETTER_NOC', nameAr: 'خطاب عدم ممانعة (NOC)', category: 'letters', chain: 'CHAIN_MANAGER_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },
  { code: 'LETTER_EMBASSY', nameAr: 'خطاب سفارة/تأشيرة', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },
  { code: 'LETTER_BANK_LOAN', nameAr: 'خطاب قرض بنكي', category: 'letters', chain: 'CHAIN_HR', handler: 'letter_pdf_generator', autoGeneratesPdf: true, phase: 'P2' },

  // ===== 7) العهدة والأصول =====
  { code: 'CUSTODY_REQUEST', nameAr: 'طلب عهدة', category: 'custody_assets', chain: 'CHAIN_MANAGER_CUSTODY', handler: 'custody_assignments_ack', phase: 'P1' },
  { code: 'CUSTODY_RETURN', nameAr: 'إرجاع عهدة', category: 'custody_assets', chain: 'CHAIN_CUSTODY', handler: 'custody_return', requiredFields: ['assignmentId'], phase: 'P1' },
  { code: 'CUSTODY_TRANSFER', nameAr: 'نقل عهدة', category: 'custody_assets', chain: 'CHAIN_CUSTODY', handler: 'custody_transfer', requiredFields: ['assignmentId', 'toEmployeeId'], phase: 'P2' },
  { code: 'CUSTODY_LOSS_REPORT', nameAr: 'بلاغ فقد/تلف', category: 'custody_assets', chain: 'CHAIN_MANAGER_CUSTODY', handler: 'custody_finance', requiredFields: ['assignmentId', 'description'], phase: 'P2' },
  { code: 'IT_EQUIPMENT', nameAr: 'طلب أجهزة/برامج IT', category: 'custody_assets', chain: 'CHAIN_MANAGER_IT', handler: 'none', phase: 'P2' },
  { code: 'ACCESS_REQUEST', nameAr: 'طلب صلاحية/وصول', category: 'custody_assets', chain: 'CHAIN_MANAGER_IT', handler: 'none', phase: 'P2' },
  { code: 'FACILITY_CARD', nameAr: 'كارت دخول/موقف', category: 'custody_assets', chain: 'CHAIN_HR', handler: 'none', phase: 'P3' },

  // ===== 8) التدريب والتطوير (D12: تسجيل فقط — لا موديول تدريب ولا صرف آلي) =====
  { code: 'TRAINING_REQUEST', nameAr: 'طلب تدريب/دورة', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'none', requiredFields: ['courseName'], phase: 'P3' },
  { code: 'CERT_REIMBURSEMENT', nameAr: 'استرداد تكلفة شهادة', category: 'training', chain: 'CHAIN_MANAGER_FINANCE', handler: 'none', requiredFields: ['amount'], phase: 'P3' },
  { code: 'CONFERENCE', nameAr: 'حضور مؤتمر', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'none', phase: 'P3' },
  { code: 'EDUCATION_ASSISTANCE', nameAr: 'مساعدة دراسية', category: 'training', chain: 'CHAIN_MANAGER_HR', handler: 'none', phase: 'P3' },

  // ===== 9) علاقات الموظفين (سرّي — يتخطى المدير؛ D12: تسجيل فقط) =====
  { code: 'GRIEVANCE', nameAr: 'تظلم/شكوى', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'none', requiredFields: ['description'], confidential: true, phase: 'P2' },
  { code: 'WHISTLEBLOWING', nameAr: 'بلاغ عن مخالفة', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'none', requiredFields: ['description'], confidential: true, phase: 'P2' },
  { code: 'PENALTY_OBJECTION', nameAr: 'اعتراض على جزاء', category: 'employee_relations', chain: 'CHAIN_HR_EXEC', handler: 'none', requiredFields: ['reason'], confidential: true, phase: 'P2' },
  { code: 'APPRAISAL_OBJECTION', nameAr: 'اعتراض على تقييم أداء', category: 'employee_relations', chain: 'CHAIN_MANAGER_HR', handler: 'none', requiredFields: ['reason'], phase: 'P2' },
  { code: 'SUGGESTION', nameAr: 'اقتراح/ملاحظة', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'none', requiredFields: ['description'], phase: 'P3' },
  { code: 'HR_MEETING', nameAr: 'طلب اجتماع مع HR', category: 'employee_relations', chain: 'CHAIN_HR', handler: 'none', phase: 'P3' },
]

// ===== أنواع الإجازات (قابلة للإعداد) =====
export const leaveTypesSeed = [
  { code: 'ANNUAL', nameAr: 'سنوية', isPaid: true, balanceType: 'annual', maxDays: 21 },
  { code: 'SICK', nameAr: 'مرضية', isPaid: true, balanceType: 'sick', requiredAttachment: 'تقرير طبي', maxDays: 180 },
  { code: 'CASUAL', nameAr: 'عارضة', isPaid: true, balanceType: 'annual', maxDays: 7 },
  { code: 'UNPAID', nameAr: 'بدون راتب', isPaid: false, balanceType: 'none' },
  { code: 'MATERNITY', nameAr: 'وضع', isPaid: true, balanceType: 'none', requiredAttachment: 'تقرير طبي', maxDays: 90 },
  { code: 'PATERNITY', nameAr: 'أبوة', isPaid: true, balanceType: 'none', maxDays: 3 },
  { code: 'HAJJ', nameAr: 'حج', isPaid: true, balanceType: 'none', maxDays: 21, oncePerService: true },
  { code: 'MARRIAGE', nameAr: 'زواج', isPaid: true, balanceType: 'none', requiredAttachment: 'عقد الزواج', maxDays: 5 },
  { code: 'BEREAVEMENT', nameAr: 'وفاة/عدة', isPaid: true, balanceType: 'none', maxDays: 5 },
  { code: 'EXAM', nameAr: 'امتحانات', isPaid: true, balanceType: 'none', requiredAttachment: 'إثبات قيد' },
  { code: 'COMPENSATORY', nameAr: 'تعويضية/بدل', isPaid: true, balanceType: 'none' },
]

// ===== إعدادات المحرك (DDL §9) + الحضور =====
export const configSeed: Array<{ key: string; value: string }> = [
  { key: 'overtime.enabled', value: 'true' },
  { key: 'overtime.biometric_requires_confirmation', value: 'true' },
  { key: 'overtime.detection_threshold_hours', value: '0.5' },
  // OT-03/06: القيم معلنة وقابلة للتعديل؛ صفر السقف يعني أنه غير مفعل، لا حدًا مخفيًا.
  { key: 'overtime.rounding_minutes', value: '15' },
  { key: 'overtime.rounding_direction', value: 'DOWN' },
  { key: 'overtime.request_backdate_days', value: '30' },
  { key: 'overtime.max_closed_periods', value: '1' },
  { key: 'overtime.max_hours_per_day', value: '0' },
  { key: 'overtime.max_hours_per_week', value: '0' },
  { key: 'overtime.max_hours_per_month', value: '0' },
  { key: 'overtime.allow_early_overtime', value: 'false' },
  { key: 'overtime.missing_punch_policy', value: 'BLOCK' },
  { key: 'overtime.leave_conflict_policy', value: 'BLOCK' },
  // مفتاح توافق للتثبيت القديم؛ الاعتمادات الجديدة تستخدم إجمالي الراتب كاملًا دائمًا.
  { key: 'overtime.wage_components', value: 'BASIC,HOUSING,TRANSPORT,PHONE,WORK_NATURE,OTHER' },
  // مُضاعِفات الأوفرتايم بحسب نوع اليوم (تُطبَّق آلياً عند إنشاء القيد)
  { key: 'overtime.multiplier_weekday', value: '1.5' },
  { key: 'overtime.multiplier_weekend', value: '1.5' },
  { key: 'overtime.multiplier_holiday', value: '2' },
  { key: 'attendance.grace_minutes', value: '10' },
  // تُثبت هذه القيم داخل النسخة المؤرخة لتعريف الدوام، فلا تغيّر أياماً سابقة.
  { key: 'attendance.flex.count_early_work_toward_required', value: 'false' },
  { key: 'attendance.flex.prorate_window_on_partial_leave', value: 'false' },
  { key: 'attendance.flex.shortfall_grace_minutes', value: '10' },
  { key: 'attendance.flex.unpaid_break_minutes', value: '0' },
  { key: 'attendance.flex.max_session_minutes', value: '900' },
  { key: 'attendance.flex.window_supersedes_grace', value: 'true' },
  { key: 'attendance.flex.missing_checkout_policy', value: 'MANUAL_ONLY' },
  { key: 'payroll.shortfall_enabled', value: 'true' },
  { key: 'payroll.shortfall_mode', value: 'MINUTES' },
  { key: 'payroll.shortfall_value', value: '1' },
  { key: 'payroll.attendance_overlap_policy', value: 'NET_OF_LATENESS' },
  { key: 'payroll.attendance_daily_cap_days', value: '1' },
  // معامل عقوبة الغياب بلا إذن (يوم × المعامل) — 1.5 أو 2 حسب السياسة
  { key: 'attendance.absence_penalty_days', value: '1' },
  // العطلة الأسبوعية (SUN..SAT مفصولة بفواصل) — تجاوز لكل فرع من شاشة الفروع
  { key: 'attendance.weekend_days', value: 'FRI,SAT' },
  // فاصل المزامنة التلقائية لأجهزة البصمة بالدقائق (0 = متوقفة)
  { key: 'attendance.sync_interval_minutes', value: '0' },
  // لحاق تجسيد الغياب: أقصى عدد أيام تُلحق بعد توقف السيرفر (المهمة الليلية)
  { key: 'attendance.absence_catchup_max_days', value: '31' },
  // مفتاح استقبال بصمات ZKTeco — فارغ = الاستقبال موقوف حتى يُضبط مفتاح عشوائي ≥24 حرفًا من الإعدادات
  // (لا قيمة منشورة في الريبو؛ القيمة القديمة 'zk-device-key-change-me' مرفوضة في الاستقبال والحفظ)
  { key: 'attendance.device_key', value: '' },
  // الإجازات: الترحيل السنوي بالطبقات
  { key: 'leave.annual_entitled', value: '21' },
  // رصيد الإجازة المرضية السنوي (يوم) — كان 180 ثابتاً في الكود
  { key: 'leave.sick_entitled', value: '180' },
  // حدّ الأثر الرجعي لطلب إجازة الموظف (يوم) — الأقدم للموارد البشرية بس
  { key: 'leave.max_backdate_days', value: '30' },
  // monthly | yearly | daily — مقيّد بالقائمة في PATCH /settings/config
  { key: 'leave.accrual_mode', value: 'monthly' },
  { key: 'leave.probation_months', value: '0' },
  { key: 'leave.carryover_max_days', value: '10' },
  { key: 'leave.carryover_expiry_months', value: '3' },
  // تهيئة الموظفين الجدد: يظهر الموظف في شاشة التهيئة حتى N يوم من تاريخ التحاقه
  { key: 'onboarding.window_days', value: '90' },
  // عملة النظام: SAR أو EGP — كل الشاشات تقرأها
  { key: 'system.currency', value: 'SAR' },
  // بيانات الشركة في المستندات المولَّدة من ملف الموظف (خطابات/شهادات/عقد) —
  // فارغ = غير مضبوط فلا تُنشأ الخطابات الرسمية. تُضبط من «الإعدادات ← بيانات الشركة»،
  // والشعار = معرّف ملف مرفوع (entityType=company_logo)
  { key: 'company.name', value: '' },
  { key: 'company.name_en', value: '' },
  { key: 'company.commercial_register', value: '' },
  { key: 'company.address', value: '' },
  { key: 'company.phone', value: '' },
  { key: 'company.logo_file_id', value: '' },
  // ملف الشركة الكامل (ترحيل 051): السجل وانتهاؤه، الضريبي، الموحد، التأمينات، قوى، العنوان الوطني، التواصل، بنك الرواتب
  ...COMPANY_PROFILE_NEW_KEYS.map(key => ({ key, value: '' })),
  // مكافأة نهاية الخدمة (EMP-2) بالشرائح — نظام العمل السعودي م84: الشريحة الأولى
  // eos.months_per_year شهر/سنة لأول eos.tier1_years سنة، وبعدها eos.months_per_year_after
  { key: 'eos.months_per_year', value: '0.5' },
  { key: 'eos.tier1_years', value: '5' },
  { key: 'eos.months_per_year_after', value: '1' },
  // معامل الاستقالة (م85) «سنوات:معامل» — أقل من أول حد لا مكافأة
  { key: 'eos.resignation_factors', value: '2:1/3,5:2/3,10:1' },
  // معامل كل سبب إنهاء (1 = كاملة) — الفصل التأديبي م80 بلا مكافأة؛ الاستقالة بجدولها
  {
    key: 'eos.reason_factors',
    value: 'termination:1,dismissal:0,contract_end:1,retirement:1,death:1,disability:1,force_majeure:1',
  },
  // الرواتب: دورة 23 → 22 ومعاملات الحساب
  { key: 'payroll.cycle_start_day', value: '23' },
  { key: 'payroll.monthly_days', value: '30' },
  { key: 'payroll.daily_hours', value: '8' },
  { key: 'payroll.late_deduction_enabled', value: 'true' },
  // الخطوة 13 وقاعدة المالك: راتب المسير = راتب شهر المسير من السجل الشهري؛ بلا دليل يُستبعد الموظف بسبب ظاهر.
  // MONTHLY_HISTORY_OR_CURRENT_FILE وضع انتقالي صريح يوسم راتب الملف الحالي «غير موثق» في لقطة العضو.
  { key: 'payroll.salary_evidence_mode', value: 'MONTHLY_HISTORY' },
  // قرار نقص المتاح: خصم المتاح وترحيل الباقي، أو تأجيل القسط كاملًا وتمديد الجدول.
  { key: 'loan.insufficient_net_behavior', value: 'PARTIAL_THEN_CARRY' },
  // C6 / AD-07/09: أقل طول لسبب السلفة الاستثنائية واستثناء تجاوز السقف، وأبعد شهر تختاره الموارد البشرية لأول قسط.
  { key: 'loan.exceptional_reason_min_length', value: '10' },
  { key: 'loan.first_installment_max_months_ahead', value: '12' },
  // أيام طلب السلفة من الشهر (من يوم إلى يوم) — الأصل مفتوح طول الشهر
  { key: 'loan.request_from_day', value: '1' },
  { key: 'loan.request_to_day', value: '31' },
  // ب2: مفتاح «اقفل طلب السلفة دلوقتي» — الأصل مفتوح، ويُقفل من «سياسات النظام» بلا تغيير أيام النافذة
  { key: 'loan.request_open', value: 'true' },
  // PL-01: افتراضات تُنسخ إلى السياسة الجديدة فقط؛ لا تعيد تسعير أي مسير قائم.
  ...PAYROLL_POLICY_DEFAULT_CONFIG_SEED,
  // قرارات المالك D1/D2/D3/D10/D11 (14 سبتمبر) — PAYROLL_DECISIONS_2026-09-14.md
  ...PAYROLL_DECISION_CONFIG_SEED,
  // ⑨ / EX-11 وEX-12: الاستثناء يوقف جزاءات الحضور، ولا يُسقط الدين أو الإجازة بلا أجر.
  { key: 'payroll.exempt_overtime_eligible', value: 'false' },
  // أ7 (16 سبتمبر): المستثنى من البصمة بلا خصومات إطلاقًا — الإجازة بلا أجر لا تُخصم له إلا بتفعيل صريح.
  { key: 'payroll.exempt_unpaid_leave_deductible', value: 'false' },
  { key: 'payroll.exemption_reason_min_length', value: '20' },
  // C2 / الخطوة 25 (DD-03/05): الخصومات المصنفة — أقل طول للسبب، نافذة كشف التكرار بالساعات،
  // إنشاء المدير الهيكلي (مباشر/فريق/قسم/فرع) بحسب نطاق النوع، وحد الإنشاء الجماعي في الدفعة.
  // إعادة العمل: + بديل المعتمِد المفقود، مهلة الخطوة وسلوك انتهائها، مهلة الاعتراض ومنعه للاعتماد،
  // أقصى ترحيلات للقسط قبل تعليقه، وحد وسم تكرار الخصومات — الحدود في DEDUCTION_NUMERIC_SETTINGS/ENUM_SETTINGS.
  ...DEDUCTION_CONFIG_SEED,
  // C4 / الخطوة 27 (EX-05): المكافآت — أقل طول للسبب، نافذة كشف التكرار، حد الدفعة الجماعية، اقتراح المدير الهيكلي،
  // وبديل المعتمِد المفقود — الحدود في BONUS_NUMERIC_SETTINGS/ENUM_SETTINGS.
  ...BONUS_CONFIG_SEED,
  // C3 / الخطوة 26 (EX-03/06/07): الإعفاء المالي — أقل طول للسبب، حد المرفق بأيام الراتب، عدد إعفاءات الموظف في 12 شهرًا، نسبة المانح،
  // فترة التهدئة، عتبات تنبيه التقرير، ومنح مدير القسم — الحدود في EXEMPTION_NUMERIC_SETTINGS/ENUM_SETTINGS.
  ...EXEMPTION_CONFIG_SEED,
]
