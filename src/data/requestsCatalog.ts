// ============================================================
// موديول الطلبات — الكتالوج الموحّد (Data-Driven)
// القاعدة الذهبية: كل نوع طلب له وجهة (Destination) — سجل دائم
// يُكتب فيه ناتج الطلب بعد الموافقة. مفيش طلب بيموت بعد الاعتماد.
// الأكواد والحالات بالإنجليزي (كود)، والـ labels بالعربي (واجهة).
// عند بناء الـ Backend: هذا الملف = بذرة جدولي request_types و
// approval_chains في SQL Server.
// ============================================================

// ===== 1) State Machine الموحّدة لكل الطلبات =====
export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RETURNED_FOR_INFO'

export const statusLabels: Record<RequestStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مُقدَّم',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'موافَق عليه',
  IN_EXECUTION: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
  RETURNED_FOR_INFO: 'مُرجَع لاستكمال معلومات',
}

export const statusStyles: Record<RequestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-warning-50 text-warning-700',
  APPROVED: 'bg-indigo-100 text-indigo-700',
  IN_EXECUTION: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-success-50 text-success-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
  RETURNED_FOR_INFO: 'bg-orange-50 text-orange-600',
}

// ===== 2) الفئات التسع =====
export type RequestCategory =
  | 'leaves'
  | 'time_attendance'
  | 'financial'
  | 'employment_status'
  | 'personal_data'
  | 'letters'
  | 'custody_assets'
  | 'training'
  | 'employee_relations'

export const categoryLabels: Record<RequestCategory, string> = {
  leaves: 'الإجازات',
  time_attendance: 'الحضور والوقت',
  financial: 'المالية',
  employment_status: 'الحالة الوظيفية',
  personal_data: 'البيانات الشخصية',
  letters: 'الخطابات والشهادات',
  custody_assets: 'العهدة والأصول',
  training: 'التدريب والتطوير',
  employee_relations: 'علاقات الموظفين',
}

// ===== 3) تعريف نوع الطلب (RequestType) =====
export type Submitter = 'E' | 'HR' | 'MANAGER'
export type Phase = 'P1' | 'P2' | 'P3'

export interface RequestTypeDef {
  code: string // بالإنجليزي — للكود والـ API
  nameAr: string // label الواجهة
  category: RequestCategory
  submitter: Submitter[]
  requiredAttachments: string | null
  approvalChain: string // وصف السلسلة (يُحل ديناميكياً بالدور)
  destination: string // الوجهة — السجل الدائم
  destinationHandler: string // كود الـ handler في الباك
  phase: Phase
  byLaw?: boolean // مطلوب بحكم نظام العمل
  securityRoute?: boolean // مسار أمني خاص (تغيير الحساب البنكي)
  confidential?: boolean // سرّي — يتخطى المدير المباشر
  affectsBalance?: boolean
  autoGeneratesPdf?: boolean
}

// ===== 4) الماستر ليست — 9 فئات =====
export const requestsCatalog: RequestTypeDef[] = [
  // ===== الفئة 1: الإجازات (LeaveType قابل للإعداد) =====
  { code: 'LEAVE_ANNUAL', nameAr: 'إجازة سنوية', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'التقويم + خصم الرصيد', destinationHandler: 'leave_calendar_balance', phase: 'P1', affectsBalance: true },
  { code: 'LEAVE_SICK', nameAr: 'إجازة مرضية', category: 'leaves', submitter: ['E'], requiredAttachments: 'تقرير طبي (إجباري)', approvalChain: 'مدير → HR', destination: 'التقويم + الرصيد', destinationHandler: 'leave_calendar_balance', phase: 'P1', byLaw: true, affectsBalance: true },
  { code: 'LEAVE_CASUAL', nameAr: 'إجازة عارضة/طارئة', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P1', affectsBalance: true },
  { code: 'LEAVE_UNPAID', nameAr: 'إجازة بدون راتب', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'التقويم + أثر على الراتب', destinationHandler: 'leave_calendar_payroll', phase: 'P1' },
  { code: 'LEAVE_MATERNITY', nameAr: 'إجازة وضع', category: 'leaves', submitter: ['E'], requiredAttachments: 'تقرير طبي', approvalChain: 'HR', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P2', byLaw: true },
  { code: 'LEAVE_PATERNITY', nameAr: 'إجازة أبوة', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P2', byLaw: true },
  { code: 'LEAVE_HAJJ', nameAr: 'إجازة حج', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'التقويم (مرة في الخدمة)', destinationHandler: 'leave_calendar_once', phase: 'P2', byLaw: true },
  { code: 'LEAVE_MARRIAGE', nameAr: 'إجازة زواج', category: 'leaves', submitter: ['E'], requiredAttachments: 'عقد الزواج', approvalChain: 'مدير → HR', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P2', byLaw: true },
  { code: 'LEAVE_BEREAVEMENT', nameAr: 'إجازة وفاة/عدة', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P2', byLaw: true },
  { code: 'LEAVE_EXAM', nameAr: 'إجازة امتحانات', category: 'leaves', submitter: ['E'], requiredAttachments: 'إثبات قيد', approvalChain: 'مدير → HR', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P3', byLaw: true },
  { code: 'LEAVE_COMPENSATORY', nameAr: 'إجازة تعويضية/بدل', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'التقويم', destinationHandler: 'leave_calendar', phase: 'P2' },
  { code: 'LEAVE_MODIFY_CANCEL', nameAr: 'إلغاء/تعديل إجازة', category: 'leaves', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'يرجّع الرصيد', destinationHandler: 'leave_balance_restore', phase: 'P1', affectsBalance: true },

  // ===== الفئة 2: الحضور والوقت =====
  { code: 'PERMISSION', nameAr: 'استئذان', category: 'time_attendance', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'سجل الحضور', destinationHandler: 'attendance_log', phase: 'P1' },
  { code: 'OVERTIME', nameAr: 'عمل إضافي', category: 'time_attendance', submitter: ['E'], requiredAttachments: 'بصمة (للمسار اللاحق)', approvalChain: 'مدير', destination: 'سجل الأوفرتايم في الرواتب', destinationHandler: 'overtime_entries', phase: 'P1' },
  { code: 'PUNCH_CORRECTION', nameAr: 'تصحيح بصمة', category: 'time_attendance', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'سجل الحضور', destinationHandler: 'attendance_corrections', phase: 'P1' },
  { code: 'SHIFT_SWAP', nameAr: 'تبديل وردية', category: 'time_attendance', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'جدول الشيفتات', destinationHandler: 'shift_schedule', phase: 'P3' },
  { code: 'REMOTE_WORK', nameAr: 'عمل عن بُعد', category: 'time_attendance', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير', destination: 'سجل الحضور', destinationHandler: 'attendance_log', phase: 'P2' },
  { code: 'BUSINESS_TRIP', nameAr: 'مأمورية/انتداب', category: 'time_attendance', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'حضور + سجل مأموريات', destinationHandler: 'attendance_trips', phase: 'P2' },

  // ===== الفئة 3: المالية =====
  { code: 'LOAN', nameAr: 'سلفة', category: 'financial', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → مالية (threshold)', destination: 'سجل السلف + جدول السداد', destinationHandler: 'loans_installments', phase: 'P1' },
  { code: 'SALARY_INCREASE', nameAr: 'زيادة راتب', category: 'financial', submitter: ['E', 'HR'], requiredAttachments: null, approvalChain: 'مدير → HR → (تنفيذي حسب threshold)', destination: 'تحديث الراتب + سجل التغييرات المالية', destinationHandler: 'salary_update_history', phase: 'P2' },
  { code: 'EXPENSE_CLAIM', nameAr: 'صرف مصروفات', category: 'financial', submitter: ['E'], requiredAttachments: 'فواتير', approvalChain: 'مدير → مالية', destination: 'سجل المصروفات', destinationHandler: 'expense_register', phase: 'P2' },
  { code: 'BONUS', nameAr: 'مكافأة/حافز', category: 'financial', submitter: ['HR', 'MANAGER'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'الرواتب', destinationHandler: 'payroll_bonus', phase: 'P2' },
  { code: 'PER_DIEM', nameAr: 'بدل سفر/انتداب', category: 'financial', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → مالية', destination: 'الرواتب', destinationHandler: 'payroll_allowance', phase: 'P3' },
  { code: 'EARLY_LOAN_SETTLEMENT', nameAr: 'سداد سلفة مبكر', category: 'financial', submitter: ['E'], requiredAttachments: null, approvalChain: 'مالية', destination: 'سجل السلف', destinationHandler: 'loans_installments', phase: 'P3' },
  { code: 'DEDUCTION_OBJECTION', nameAr: 'اعتراض على خصم', category: 'financial', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR → مالية', destination: 'تعديل رواتب', destinationHandler: 'payroll_adjustment', phase: 'P2' },

  // ===== الفئة 4: الحالة الوظيفية =====
  { code: 'PROMOTION', nameAr: 'ترقية', category: 'employment_status', submitter: ['E', 'MANAGER'], requiredAttachments: null, approvalChain: 'مدير → HR → (تنفيذي)', destination: 'تحديث الموظف + سجل الترقيات', destinationHandler: 'employee_update_promotions', phase: 'P2' },
  { code: 'TEAM_TRANSFER', nameAr: 'نقل بين الفرق', category: 'employment_status', submitter: ['E', 'MANAGER'], requiredAttachments: null, approvalChain: 'المدير الحالي → المدير المستقبِل → HR', destination: 'تحديث الفريق + لوج النقل (بتاريخ سريان)', destinationHandler: 'transfers_effective_date', phase: 'P2' },
  { code: 'TITLE_CHANGE', nameAr: 'تغيير مسمى', category: 'employment_status', submitter: ['HR'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'تحديث الموظف', destinationHandler: 'employee_update', phase: 'P3' },
  { code: 'CONTRACT_RENEWAL', nameAr: 'تجديد عقد', category: 'employment_status', submitter: ['HR'], requiredAttachments: null, approvalChain: 'HR → تنفيذي', destination: 'سجل العقود', destinationHandler: 'contracts_register', phase: 'P2' },
  { code: 'CONTRACT_TYPE_CHANGE', nameAr: 'تغيير نوع العقد', category: 'employment_status', submitter: ['E', 'HR'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'سجل العقود', destinationHandler: 'contracts_register', phase: 'P3' },
  { code: 'SECONDMENT', nameAr: 'إعارة/انتداب لجهة أخرى', category: 'employment_status', submitter: ['HR'], requiredAttachments: null, approvalChain: 'HR → تنفيذي', destination: 'سجل الإسناد', destinationHandler: 'assignments_register', phase: 'P3' },
  { code: 'RETIREMENT', nameAr: 'تقاعد', category: 'employment_status', submitter: ['E', 'HR'], requiredAttachments: null, approvalChain: 'HR', destination: 'تحديث الحالة', destinationHandler: 'employee_status', phase: 'P3' },

  // ===== الفئة 5: البيانات الشخصية =====
  { code: 'PERSONAL_DATA_UPDATE', nameAr: 'تحديث بيانات شخصية', category: 'personal_data', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR (تحقق)', destination: 'سجل الموظف', destinationHandler: 'employee_record', phase: 'P1' },
  { code: 'BANK_ACCOUNT_CHANGE', nameAr: 'تغيير الحساب البنكي', category: 'personal_data', submitter: ['E'], requiredAttachments: 'خطاب IBAN', approvalChain: 'موافقة أمنية خاصة', destination: 'سجل بنك الرواتب', destinationHandler: 'payroll_bank_secure', phase: 'P1', securityRoute: true },
  { code: 'DEPENDENTS_UPDATE', nameAr: 'تحديث المعالين', category: 'personal_data', submitter: ['E'], requiredAttachments: 'وثائق', approvalChain: 'HR', destination: 'سجل الموظف + البدلات', destinationHandler: 'employee_dependents', phase: 'P2' },
  { code: 'EMERGENCY_CONTACT', nameAr: 'جهة اتصال الطوارئ', category: 'personal_data', submitter: ['E'], requiredAttachments: null, approvalChain: 'أوتوماتيك', destination: 'سجل الموظف', destinationHandler: 'employee_record_auto', phase: 'P1' },
  { code: 'DOCUMENT_RENEWAL', nameAr: 'رفع/تجديد وثائق', category: 'personal_data', submitter: ['E'], requiredAttachments: 'هوية/إقامة/جواز', approvalChain: 'HR تحقق', destination: 'خزنة الوثائق', destinationHandler: 'document_vault', phase: 'P1' },

  // ===== الفئة 6: الخطابات (PDF يتولّد أوتوماتيك) =====
  { code: 'LETTER_SALARY', nameAr: 'تعريف راتب', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P1', autoGeneratesPdf: true },
  { code: 'LETTER_EMPLOYMENT', nameAr: 'خطاب توظيف', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P1', autoGeneratesPdf: true },
  { code: 'LETTER_EXPERIENCE', nameAr: 'شهادة خبرة', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P1', autoGeneratesPdf: true },
  { code: 'LETTER_NOC', nameAr: 'خطاب عدم ممانعة (NOC)', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P2', autoGeneratesPdf: true },
  { code: 'LETTER_EMBASSY', nameAr: 'خطاب سفارة/تأشيرة', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P2', autoGeneratesPdf: true },
  { code: 'LETTER_BANK_LOAN', nameAr: 'خطاب قرض بنكي', category: 'letters', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'PDF يتولّد أوتوماتيك', destinationHandler: 'letter_pdf_generator', phase: 'P2', autoGeneratesPdf: true },

  // ===== الفئة 7: العهدة والأصول =====
  { code: 'CUSTODY_REQUEST', nameAr: 'طلب عهدة', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → أمين العهدة', destination: 'سجل العهد (بتأكيد استلام)', destinationHandler: 'custody_assignments_ack', phase: 'P1' },
  { code: 'CUSTODY_RETURN', nameAr: 'إرجاع عهدة', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'أمين العهدة', destination: 'سجل العهد', destinationHandler: 'custody_assignments', phase: 'P1' },
  { code: 'CUSTODY_TRANSFER', nameAr: 'نقل عهدة', category: 'custody_assets', submitter: ['E', 'HR'], requiredAttachments: null, approvalChain: 'أمين العهدة', destination: 'سجل العهد', destinationHandler: 'custody_assignments', phase: 'P2' },
  { code: 'CUSTODY_LOSS_REPORT', nameAr: 'بلاغ فقد/تلف', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → أمين العهدة', destination: 'سجل العهد + مالية', destinationHandler: 'custody_finance', phase: 'P2' },
  { code: 'IT_EQUIPMENT', nameAr: 'طلب أجهزة/برامج IT', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → IT', destination: 'سجل أصول IT', destinationHandler: 'it_assets', phase: 'P2' },
  { code: 'ACCESS_REQUEST', nameAr: 'طلب صلاحية/وصول', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → IT', destination: 'سجل الصلاحيات', destinationHandler: 'access_register', phase: 'P2' },
  { code: 'FACILITY_CARD', nameAr: 'كارت دخول/موقف', category: 'custody_assets', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR/أدمن', destination: 'سجل المرافق', destinationHandler: 'facilities_register', phase: 'P3' },

  // ===== الفئة 8: التدريب والتطوير =====
  { code: 'TRAINING_REQUEST', nameAr: 'طلب تدريب/دورة', category: 'training', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'سجل التدريب', destinationHandler: 'training_register', phase: 'P3' },
  { code: 'CERT_REIMBURSEMENT', nameAr: 'استرداد تكلفة شهادة', category: 'training', submitter: ['E'], requiredAttachments: 'إيصالات', approvalChain: 'مدير → مالية', destination: 'تدريب + مصروفات', destinationHandler: 'training_expense', phase: 'P3' },
  { code: 'CONFERENCE', nameAr: 'حضور مؤتمر', category: 'training', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'سجل التدريب', destinationHandler: 'training_register', phase: 'P3' },
  { code: 'EDUCATION_ASSISTANCE', nameAr: 'مساعدة دراسية', category: 'training', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'سجل التدريب', destinationHandler: 'training_register', phase: 'P3' },

  // ===== الفئة 9: علاقات الموظفين (توجيه سرّي خاص) =====
  { code: 'GRIEVANCE', nameAr: 'تظلم/شكوى', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR مباشرة (تخطّي المدير)', destination: 'سجل قضية ER', destinationHandler: 'er_case', phase: 'P2', confidential: true },
  { code: 'WHISTLEBLOWING', nameAr: 'بلاغ عن مخالفة', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'Compliance/HR (يدعم المجهولية)', destination: 'قضية ER سرية', destinationHandler: 'er_case_anonymous', phase: 'P2', confidential: true },
  { code: 'PENALTY_OBJECTION', nameAr: 'اعتراض على جزاء', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR → تنفيذي', destination: 'سجل قضية ER', destinationHandler: 'er_case', phase: 'P2', confidential: true },
  { code: 'APPRAISAL_OBJECTION', nameAr: 'اعتراض على تقييم أداء', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'مدير → HR', destination: 'سجل التقييم', destinationHandler: 'appraisal_register', phase: 'P2' },
  { code: 'SUGGESTION', nameAr: 'اقتراح/ملاحظة', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'سجل الاقتراحات', destinationHandler: 'suggestions_register', phase: 'P3' },
  { code: 'HR_MEETING', nameAr: 'طلب اجتماع مع HR', category: 'employee_relations', submitter: ['E'], requiredAttachments: null, approvalChain: 'HR', destination: 'سجل الاجتماعات', destinationHandler: 'meetings_register', phase: 'P3' },
]

export const getTypeByCode = (code: string) =>
  requestsCatalog.find((t) => t.code === code)
